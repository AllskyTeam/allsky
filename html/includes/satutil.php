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
 *  - Download configured CelesTrak GP group TLEs
 *  - Re-download any files older than 2 days
 *  - On any downloads, rebuild satellites.json cache by reading all *.tle files in folder
 *    ignoring numeric filenames like 25544.tle
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

    // Change these if you want another location
    private string $dataDir;
    private string $tleDir;
    private string $satcatFile;
    private string $cacheFile;

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
        $this->cacheFile  = $this->dataDir . '/satellites.json';

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
            // Requirement: check update-needed on every Satellites request
            $this->updateIfNeeded();

            $json = @file_get_contents($this->cacheFile);
            if ($json === false || trim($json) === '') {
                // If cache missing/corrupt, rebuild now and return it
                $this->rebuildCache();
                $json = @file_get_contents($this->cacheFile) ?: '[]';
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
            $result = $this->updateIfNeeded();
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

    /**
     * Update satcat + group TLEs if any file is stale; rebuild cache if changed or cache missing.
     * @return array{changed:bool, log:string[]}
     */
    private function updateIfNeeded(): array
    {
        $changed = false;
        $log = [];

        // satcat
        if ($this->fileIsStale($this->satcatFile)) {
            $this->downloadToFile('https://celestrak.org/pub/satcat.txt', $this->satcatFile);
            $changed = true;
            $log[] = 'Downloaded satcat.txt';
        } else {
            $log[] = 'satcat.txt fresh';
        }

        // group TLEs
        foreach ($this->tleGroups as $group) {
            $group = trim((string)$group);
            if ($group === '') continue;

            $dest = $this->tleDir . '/' . $group . '.tle';
            if ($this->fileIsStale($dest)) {
                $url = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=' . rawurlencode($group) . '&FORMAT=tle';
                $this->downloadToFile($url, $dest);
                $changed = true;
                $log[] = "Downloaded {$group}.tle";
            } else {
                $log[] = "{$group}.tle fresh";
            }
        }

        // rebuild cache when anything changed or missing
        if ($changed || !file_exists($this->cacheFile)) {
            $this->rebuildCache();
            $log[] = 'Rebuilt satellites cache';
        } else {
            $log[] = 'Cache fresh';
        }

        return ['changed' => $changed, 'log' => $log];
    }

    /**
     * Download a URL to a local file using cURL, writing atomically via .tmp.
     */
    private function downloadToFile(string $url, string $destPath): void
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

        if (!rename($tmp, $destPath)) {
            @unlink($tmp);
            throw new RuntimeException('Failed to move temp file into place: ' . $destPath);
        }
    }

    /**
     * Rebuild cached JSON:
     * - Parse satcat.txt legacy (fixed width) into meta by NORAD
     * - Read every *.tle file in TLE folder EXCEPT numeric filenames like 25544.tle
     * - Parse TLEs and merge group memberships + satcat meta
     * - Write satellites.json
     */
    private function rebuildCache(): void
    {
        if (!file_exists($this->satcatFile)) {
            $this->downloadToFile('https://celestrak.org/pub/satcat.txt', $this->satcatFile);
        }

        $satcatMeta = $this->parseSatcatLegacy($this->satcatFile); // [norad => meta]

        $files = glob($this->tleDir . '/*.tle') ?: [];
        $sats = []; // [norad => record]

        foreach ($files as $file) {
            $base = basename($file);

            // Ignore numeric filenames like 25544.tle
            if (preg_match('/^\d+\.tle$/', $base)) {
                continue;
            }

            $group = preg_replace('/\.tle$/', '', $base);
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
            return (int)$a['norad_id'] <=> (int)$b['norad_id'];
        });

        $json = json_encode($out, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        if ($json === false) {
            throw new RuntimeException('json_encode failed rebuilding cache');
        }

        $tmp = $this->cacheFile . '.tmp';
        if (file_put_contents($tmp, $json) === false) {
            throw new RuntimeException('Failed writing temp cache: ' . $tmp);
        }
        if (!rename($tmp, $this->cacheFile)) {
            @unlink($tmp);
            throw new RuntimeException('Failed moving cache into place: ' . $this->cacheFile);
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
        $norad = trim(substr($line1, 2, 5));
        if ($norad === '' || !ctype_digit($norad)) return null;
        return $norad;
    }
}

$satUtil = new SATUTIL();
$satUtil->run();