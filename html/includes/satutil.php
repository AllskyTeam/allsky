<?php

declare(strict_types=1);

include_once('functions.php');
initialize_variables();
include_once('authenticate.php');
include_once('utilbase.php');

/**
 * SATUTIL
 *
 * Utility API for Satellite/TLE data:
 *  - Satellites: ALWAYS checks for stale downloads first, updates if needed, then returns cached JSON for the plugin
 *  - Update: optional endpoint (manual trigger / debugging)
 *
 * Requirements implemented:
 *  - Download sat catalog from https://celestrak.org/pub/satcat.txt
 *  - Download configured group TLEs from Retlector by default with CelesTrak fallback
 *  - Re-download any files older than 2 days
 *  - On any downloads, rebuild satellites cache from the selected source's *.tle files
 *  - Provide an AJAX method that returns the JSON to the plugin
 */
class SATUTIL extends UTILBASE
{
    /** Declare the public endpoints and allowed verbs */
    protected function getRoutes(): array
    {
        return [
            'Satellites' => ['get'],
            'Update'     => ['get'],
        ];
    }

    // ---------- Config ----------
    private const MAX_AGE_DAYS = 2;
    private const DEFAULT_TLE_SOURCE = 'retlector';

    // Change these if you want another location
    private string $dataDir;
    private string $tleDir;
    private string $satcatFile;

    /** @var string[] */
    private array $tleGroups = [
        'stations',
        'visual',
        'active',
        'weather',
        'gps-ops',
        'amateur',
        'last-30-days',
        'visual'
    ];

    function __construct()
    {
        $base = ALLSKY_CONFIG . '/overlay/config/tmp/overlay';
        $this->dataDir    = $base;
        $this->tleDir     = $this->dataDir . '/tle';
        $this->satcatFile = $this->dataDir . '/satcat.txt';

        $this->ensureDirs();
    }

    /**
     * GET /?request=Satellites
     * ALWAYS checks if downloads are needed (stale > 2 days) and refreshes if required,
     * then returns the cached JSON used by your jQuery plugin.
     */
    public function getSatellites(): void
    {
        try {
            $source = $this->getRequestedTleSource();
            $cacheFile = $this->getCacheFile($source);

            // Requirement: check update-needed on every Satellites request
            $this->updateIfNeeded($source, $cacheFile);

            $json = @file_get_contents($cacheFile);
            if ($json === false || trim($json) === '') {
                // If cache missing/corrupt, rebuild now and return it
                $this->rebuildCache($source, $cacheFile);
                $json = @file_get_contents($cacheFile) ?: '[]';
            }

            $this->sendResponse($json);
        } catch (Throwable $e) {
            $this->send500('Failed to return satellites: ' . $e->getMessage());
        }
    }

    /**
     * GET /?request=Update
     * Optional manual trigger (useful for debugging).
     * Returns JSON log.
     */
    public function getUpdate(): void
    {
        try {
            $source = $this->getRequestedTleSource();
            $result = $this->updateIfNeeded($source, $this->getCacheFile($source));
            $this->sendResponse(json_encode($result, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
        } catch (Throwable $e) {
            $this->send500('SAT update failed: ' . $e->getMessage());
        }
    }

    // ---------------- Internal helpers ----------------

    private function ensureDirs(): void
    {
        if (!is_dir($this->dataDir) && !mkdir($this->dataDir, 0775, true)) {
            throw new RuntimeException('Failed to create data dir: ' . $this->dataDir);
        }
        if (!is_dir($this->tleDir) && !mkdir($this->tleDir, 0775, true)) {
            throw new RuntimeException('Failed to create TLE dir: ' . $this->tleDir);
        }
    }

    private function maxAgeSeconds(): int
    {
        return self::MAX_AGE_DAYS * 86400;
    }

    private function fileIsStale(string $path): bool
    {
        if (!file_exists($path)) return true;
        $age = time() - (int)filemtime($path);
        return $age > $this->maxAgeSeconds();
    }

    private function getRequestedTleSource(): string
    {
        $source = trim((string)($_GET['source'] ?? $_GET['tleSource'] ?? self::DEFAULT_TLE_SOURCE));
        $source = strtolower($source);

        if (in_array($source, ['retlector', 'celestrak'], true)) {
            return $source;
        }

        return self::DEFAULT_TLE_SOURCE;
    }

    private function getTleSourceOrder(string $source): array
    {
        if ($source === 'celestrak') {
            return ['celestrak', 'retlector'];
        }

        return ['retlector', 'celestrak'];
    }

    private function getCacheFile(string $source): string
    {
        return $this->dataDir . '/satellites_' . $source . '.json';
    }

    private function getTleFile(string $source, string $group): string
    {
        return $this->tleDir . '/' . $source . '_' . $this->safeFilePart($group) . '.tle';
    }

    private function safeFilePart(string $value): string
    {
        $safe = preg_replace('/[^A-Za-z0-9_-]/', '_', $value);
        return $safe !== null && $safe !== '' ? $safe : 'unknown';
    }

    private function getTleGroupUrl(string $source, string $group): string
    {
        if ($source === 'retlector') {
            return 'https://retlector.eu/' . rawurlencode($group) . '/tle';
        }

        if ($source === 'celestrak') {
            return 'https://celestrak.org/NORAD/elements/gp.php?GROUP=' . rawurlencode($group) . '&FORMAT=TLE';
        }

        throw new RuntimeException('Unknown TLE source: ' . $source);
    }

    /**
     * Update satcat + group TLEs if any file is stale; rebuild cache if changed or cache missing.
     * @return array{changed:bool, log:string[]}
     */
    private function updateIfNeeded(string $source, string $cacheFile): array
    {
        $changed = false;
        $log = [];

        // satcat
        if ($this->fileIsStale($this->satcatFile)) {
            try {
                $this->downloadToFile('https://celestrak.org/pub/satcat.txt', $this->satcatFile);
                $changed = true;
                $log[] = 'Downloaded satcat.txt';
            } catch (Throwable $e) {
                if (file_exists($this->satcatFile)) {
                    $log[] = 'Using stale satcat.txt: ' . $e->getMessage();
                } else {
                    $log[] = 'satcat.txt unavailable: ' . $e->getMessage();
                }
            }
        } else {
            $log[] = 'satcat.txt fresh';
        }

        // group TLEs
        foreach (array_unique($this->tleGroups) as $group) {
            $group = trim((string)$group);
            if ($group === '') continue;

            $dest = $this->getTleFile($source, $group);
            if ($this->fileIsStale($dest)) {
                try {
                    $actualSource = $this->downloadTleGroupToFile($source, $group, $dest);
                    $changed = true;
                    $log[] = "Downloaded {$group}.tle from {$actualSource}";
                } catch (Throwable $e) {
                    if (file_exists($dest)) {
                        $log[] = "Using stale {$group}.tle: " . $e->getMessage();
                    } else {
                        $log[] = "Skipped {$group}.tle: " . $e->getMessage();
                    }
                }
            } else {
                $log[] = "{$group}.tle fresh";
            }
        }

        // rebuild cache when anything changed or missing
        if ($changed || !file_exists($cacheFile)) {
            $this->rebuildCache($source, $cacheFile);
            $log[] = 'Rebuilt satellites cache';
        } else {
            $log[] = 'Cache fresh';
        }

        return ['changed' => $changed, 'log' => $log];
    }

    /**
     * Download a URL to a local file using cURL, writing atomically via .tmp.
     */
    private function downloadToFile(string $url, string $destPath, ?callable $validator = null): void
    {
        $tmp = $destPath . '.tmp';

        $ch = curl_init($url);
        if ($ch === false) throw new RuntimeException('curl_init failed');

        $fp = fopen($tmp, 'wb');
        if ($fp === false) {
            curl_close($ch);
            throw new RuntimeException('Failed to open temp file: ' . $tmp);
        }

        curl_setopt_array($ch, [
            CURLOPT_FILE => $fp,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_CONNECTTIMEOUT => 15,
            CURLOPT_TIMEOUT => 60,
            CURLOPT_FAILONERROR => false,
            CURLOPT_USERAGENT => 'SATUTIL/1.0',
        ]);

        $ok = curl_exec($ch);
        $err = curl_error($ch);
        $http = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);

        fclose($fp);
        curl_close($ch);

        if ($ok === false || $http < 200 || $http >= 300) {
            @unlink($tmp);
            throw new RuntimeException("Download failed ({$http}) {$url} {$err}");
        }

        if (filesize($tmp) < 50) {
            @unlink($tmp);
            throw new RuntimeException("Downloaded file too small: {$url}");
        }

        if ($validator !== null) {
            $text = @file_get_contents($tmp);
            if ($text === false || $validator($text) !== true) {
                @unlink($tmp);
                throw new RuntimeException("Downloaded file did not pass validation: {$url}");
            }
        }

        if (!rename($tmp, $destPath)) {
            @unlink($tmp);
            throw new RuntimeException('Failed to move temp file into place: ' . $destPath);
        }
    }

    private function downloadTleGroupToFile(string $preferredSource, string $group, string $destPath): string
    {
        $errors = [];

        foreach ($this->getTleSourceOrder($preferredSource) as $source) {
            $url = $this->getTleGroupUrl($source, $group);

            try {
                $this->downloadToFile($url, $destPath, function (string $text): bool {
                    return count($this->parseTleText($text)) > 0;
                });

                return $source;
            } catch (Throwable $e) {
                $errors[] = $source . ': ' . $e->getMessage();
            }
        }

        throw new RuntimeException('All TLE sources failed for ' . $group . ': ' . implode('; ', $errors));
    }

    /**
     * Rebuild cached JSON:
     * - Parse satcat.txt legacy (fixed width) into meta by NORAD
     * - Read every *.tle file in TLE folder EXCEPT numeric filenames like 25544.tle
     * - Parse TLEs and merge group memberships + satcat meta
     * - Write satellites.json
     */
    private function rebuildCache(string $source, string $cacheFile): void
    {
        if (!file_exists($this->satcatFile)) {
            try {
                $this->downloadToFile('https://celestrak.org/pub/satcat.txt', $this->satcatFile);
            } catch (Throwable $e) {
                // TLE names are enough for the selector; satcat only enriches optional columns.
            }
        }

        $satcatMeta = file_exists($this->satcatFile) ? $this->parseSatcatLegacy($this->satcatFile) : []; // [norad => meta]

        $files = glob($this->tleDir . '/' . $source . '_*.tle') ?: [];
        $sats = []; // [norad => record]

        foreach ($files as $file) {
            $base = basename($file);

            $prefix = $source . '_';
            if (substr($base, 0, strlen($prefix)) !== $prefix) {
                continue;
            }

            $group = preg_replace('/\.tle$/', '', substr($base, strlen($prefix)));
            $tleSats = $this->parseTleFile($file);

            foreach ($tleSats as $norad => $tleInfo) {
                if (!isset($sats[$norad])) {
                    $meta = $satcatMeta[$norad] ?? [];

                    $name = $tleInfo['name'] !== '' ? $tleInfo['name'] : ($meta['name'] ?? '(Unknown satellite)');
                    $country = $meta['country'] ?? '';
                    $launch = $meta['launch_date'] ?? '';
                    $objType = $meta['object_type'] ?? '';

                    $sats[$norad] = [
                        'norad_id' => (string)$norad,
                        'name' => $name,
                        'country' => $country,
                        'launch_date' => $launch,
                        'object_type' => $objType,
                        'groups' => [],
                    ];
                }

                if (!in_array($group, $sats[$norad]['groups'], true)) {
                    $sats[$norad]['groups'][] = $group;
                }
            }
        }

        $out = array_values($sats);
        usort($out, function ($a, $b) {
            return strnatcasecmp((string)$a['norad_id'], (string)$b['norad_id']);
        });

        $json = json_encode($out, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        if ($json === false) {
            throw new RuntimeException('json_encode failed rebuilding cache');
        }

        $tmp = $cacheFile . '.tmp';
        if (file_put_contents($tmp, $json) === false) {
            throw new RuntimeException('Failed writing temp cache: ' . $tmp);
        }
        if (!rename($tmp, $cacheFile)) {
            @unlink($tmp);
            throw new RuntimeException('Failed moving cache into place: ' . $cacheFile);
        }
    }

    /**
     * Parse satcat.txt legacy (fixed width).
     * Returns: [norad => ['name'=>..., 'country'=>..., 'launch_date'=>..., 'object_type'=>...]]
     */
    private function parseSatcatLegacy(string $path): array
    {
        $fh = fopen($path, 'rb');
        if ($fh === false) {
            throw new RuntimeException('Failed to open satcat: ' . $path);
        }

        $out = [];
        while (($line = fgets($fh)) !== false) {
            $line = rtrim($line, "\r\n");
            if ($line === '' || strlen($line) < 90) continue;

            // NORAD catalog number: columns 14-18 (1-based) => substr(13,5)
            $norad = trim(substr($line, 13, 5));
            if ($norad === '' || !ctype_digit($norad)) continue;

            // Name: columns 24-47 => substr(23,24)
            $name = trim(substr($line, 23, 24));

            // Country: columns 50-54 => substr(49,5)
            $country = trim(substr($line, 49, 5));

            // Launch date: columns 57-66 => substr(56,10)
            $launch = trim(substr($line, 56, 10));

            // Basic inference for object type (optional)
            $objType = '';
            $upper = strtoupper($name);
            if ($name !== '') {
                if (strpos($upper, ' DEB') !== false) $objType = 'DEB';
                else if (strpos($upper, ' R/B') !== false) $objType = 'R/B';
                else $objType = 'PAY';
            }

            $out[$norad] = [
                'name' => $name,
                'country' => $country,
                'launch_date' => $launch,
                'object_type' => $objType,
            ];
        }

        fclose($fh);
        return $out;
    }

    /**
     * Parse a TLE file:
     * - Supports 3-line sets: name + line1 + line2
     * - Supports 2-line sets: line1 + line2
     * Returns: [norad => ['name'=>..., 'line1'=>..., 'line2'=>...]]
     */
    private function parseTleFile(string $path): array
    {
        $text = file_get_contents($path);
        if ($text === false) {
            throw new RuntimeException('Failed to read TLE file: ' . $path);
        }

        return $this->parseTleText($text);
    }

    private function parseTleText(string $text): array
    {
        $lines = preg_split('/\r\n|\n|\r/', trim($text));
        $lines = array_values(array_filter($lines, fn($l) => trim((string)$l) !== ''));

        $out = [];
        $i = 0;

        while ($i < count($lines)) {
            $l0 = $lines[$i];

            // 2-line TLE without name line
            if (preg_match('/^1\s+/', $l0)) {
                $line1 = $l0;
                $line2 = $lines[$i + 1] ?? '';
                $i += 2;

                $norad = $this->noradFromLine1($line1);
                if ($norad !== null && $line2 !== '' && preg_match('/^2\s+/', $line2)) {
                    $out[$norad] = [
                        'name' => '',
                        'line1' => $line1,
                        'line2' => $line2,
                    ];
                }
                continue;
            }

            // 3-line TLE
            $name  = trim($l0);
            $line1 = $lines[$i + 1] ?? '';
            $line2 = $lines[$i + 2] ?? '';
            $i += 3;

            if (!preg_match('/^1\s+/', $line1) || !preg_match('/^2\s+/', $line2)) {
                // resync gently
                $i = max(0, $i - 2);
                $i++;
                continue;
            }

            $norad = $this->noradFromLine1($line1);
            if ($norad !== null) {
                $out[$norad] = [
                    'name' => $name,
                    'line1' => $line1,
                    'line2' => $line2,
                ];
            }
        }

        return $out;
    }

    private function noradFromLine1(string $line1): ?string
    {
        // TLE line1 satellite number is columns 3-7 (1-based) => substr(2,5)
        if (strlen($line1) < 7) return null;
        $norad = strtoupper(trim(substr($line1, 2, 5)));
        if ($norad === '' || !preg_match('/^[A-Z0-9]+$/', $norad)) return null;
        return $norad;
    }
}

$satUtil = new SATUTIL();
$satUtil->run();
