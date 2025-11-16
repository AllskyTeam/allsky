<?php
declare(strict_types=1);

include_once('functions.php');
initialize_variables();
include_once('authenticate.php');
include_once('utilbase.php');

/**
 * OVERLAYUTIL
 *
 * API for managing overlay templates, assets, and related app settings used by the WebUI designer.
 * It serves overlay JSON, lists/creates/deletes user overlays, and handles image/font uploads.
 *
 * Design notes
 * - Routing is allow-listed via getRoutes(), and UTILBASE handles verb gating + CSRF for unsafe methods.
 * - Any user-provided filenames are sanitized; paths are built via helpers to avoid traversal.
 * - JSON responses are used where practical; some endpoints return HTML/text when that’s what the UI expects.
 * - Shell/Python helpers are executed via tiny wrappers that capture stdout/stderr and validate inputs.
 */
class OVERLAYUTIL extends UTILBASE {
    protected function getRoutes(): array
    {
        return [
            'AppConfig'        => ['get', 'post'],
            'AutoExposure'     => ['get', 'post'],
            'Base64Image'      => ['post'],
            'Config'           => ['get', 'post'],
            'Configs'          => ['get'],
            'Data'             => ['get', 'post'],
            'Font'             => ['delete'],
            'FontNames'        => ['get'],
            'Fonts'            => ['get', 'post'],
            'Formats'          => ['get'],
            'Image'            => ['delete'],
            'ImageDetails'     => ['get'],
            'Images'           => ['get', 'post'],
            'LoadOverlay'      => ['get'],
            'NewOverlay'       => ['post'],
            'Overlay'          => ['delete'],
            'OverlayData'      => ['get'],
            'OverlayList'      => ['get'],
            'Overlays'         => ['get'],
            'PythonDate'       => ['post'],
            'Sample'           => ['post'],
            'SaveSettings'     => ['post'],
            'Status'           => ['get'],
            'ImageName'        => ['get'],
            'Suggest'          => ['get'],
            'ValidateFilename' => ['get'],
        ];
    }

    // Common paths and config locations used throughout this class
    private string $overlayPath;
    private string $overlayConfigPath;
    private string $allskyOverlays;
    private string $allskyTmp;
    private string $allskyStatus;
    private string $allsky_scripts;
    private string $allsky_home;

    // Camera capability flags loaded from cc.json (used to hide irrelevant fields)
    private array $cc = [];

    // Field visibility rules keyed by token; hide when capability doesn't match
    private array $excludeVariables = [
        '${TEMPERATURE_C}' => ['ccfield' => 'hasSensorTemperature', 'value' => false],
        '${TEMPERATURE_F}' => ['ccfield' => 'hasSensorTemperature', 'value' => false],
    ];

    public function __construct()
    {
        // Cache base paths to keep the body code readable
        $this->overlayPath       = rtrim(ALLSKY_OVERLAY, '/');
        $this->overlayConfigPath = $this->overlayPath . '/config';
        $this->allskyOverlays    = rtrim(ALLSKY_MY_OVERLAY_TEMPLATES, '/') . '/';
        $this->allskyTmp         = rtrim(ALLSKY_TMP, '/');
        $this->allskyStatus      = ALLSKY_STATUS;
        $this->allsky_scripts    = rtrim(ALLSKY_SCRIPTS, '/');
        $this->allsky_home       = rtrim(ALLSKY_HOME, '/');

        // Load optional capability metadata; absence should not break the UI
        $ccFile = rtrim(ALLSKY_CONFIG, '/') . '/cc.json';
        if (is_file($ccFile) && is_readable($ccFile)) {
            $raw = file_get_contents($ccFile);
            $parsed = json_decode($raw ?: '[]', true);
            $this->cc = is_array($parsed) ? $parsed : [];
        }
    }

    /* ========================== Filesystem helpers ========================== */

    /**
     * Sanitize a filename and validate extension when a list is provided.
     * If no list is given, names with or without extensions are accepted.
     */
    private function safeFileName(string $name, array $allowedExt = []): string
    {
        $name = trim($name);
        $name = str_replace(["\0", '/', '\\'], '', $name);
        // Intentionally skip basename() to preserve names starting with dots if needed

        if (!empty($allowedExt)) {
            $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
            if ($ext === '' || !in_array($ext, $allowedExt, true)) {
                $this->sendHTTPResponse('Unsupported file type.', 400);
            }
        }

        return $name;
    }

    // Join a directory and filename with a single slash
    private function joinPath(string $dir, string $file): string
    {
        return rtrim($dir, '/') . '/' . ltrim($file, '/');
    }

    /* =============================== Imaging =============================== */

    /**
     * Create a square thumbnail (90×90 by default) while keeping aspect ratio.
     * PNGs retain transparency; other formats get a flat background color.
     * Returns false on any failure; callers decide how to surface errors.
     */
    private function createThumbnail(string $sourceImagePath, string $destImagePath, int $thumbWidth = 90, int $thumbHeight = 90, $background = false): bool
    {
        if (!is_file($sourceImagePath) || !is_readable($sourceImagePath)) return false;

        [$ow, $oh, $otype] = getimagesize($sourceImagePath);
        if ($ow <= 0 || $oh <= 0) return false;

        // Scale to fit inside a square and center the result
        if ($ow > $oh) {
            $nw = $thumbWidth;
            $nh = (int) floor($oh * $nw / $ow);
        } else {
            $nh = $thumbHeight;
            $nw = (int) floor($ow * $nh / $oh);
        }
        $dx = (int) floor(($thumbWidth  - $nw) / 2);
        $dy = (int) floor(($thumbHeight - $nh) / 2);

        // Pick loaders/savers based on image type
        switch ($otype) {
            case IMAGETYPE_GIF:  $save = 'imagegif';  $load = 'imagecreatefromgif';  break;
            case IMAGETYPE_JPEG: $save = 'imagejpeg'; $load = 'imagecreatefromjpeg'; break;
            case IMAGETYPE_PNG:  $save = 'imagepng';  $load = 'imagecreatefrompng';  break;
            default: return false;
        }

        $src = @$load($sourceImagePath);
        if (!$src) return false;

        $dst = imagecreatetruecolor($thumbWidth, $thumbHeight);

        // Preserve alpha for PNGs; others get a solid fill
        if ($otype === IMAGETYPE_PNG) {
            imagealphablending($dst, false);
            imagesavealpha($dst, true);
            $transparent = imagecolorallocatealpha($dst, 0, 0, 0, 127);
            imagefill($dst, 0, 0, $transparent);
        } else {
            $bg = is_array($background) ? $background : [0, 0, 0];
            [$r, $g, $b] = $bg;
            $color = imagecolorallocate($dst, (int)$r, (int)$g, (int)$b);
            imagefill($dst, 0, 0, $color);
        }

        imagecopyresampled($dst, $src, $dx, $dy, 0, 0, $nw, $nh, $ow, $oh);

        @mkdir(dirname($destImagePath), 0775, true);

        $ok = $save($dst, $destImagePath);
        imagedestroy($src);
        imagedestroy($dst);

        return $ok && is_file($destImagePath);
    }

    /* ============================ Config endpoints =========================== */

    // Return overlay.json if present, otherwise a minimal empty object
    public function getConfig(): void
    {
        $file = $this->overlayConfigPath . '/overlay.json';
        if (is_file($file) && is_readable($file)) {
            $this->sendResponse(file_get_contents($file) ?: '{}');
        }
        $this->sendResponse('{}');
    }

    /**
     * Save an overlay JSON (core or user space).
     * Pretty-prints to keep diffs readable in version control.
     */
    public function postConfig(): void
    {
        $overlayName = $_POST['overlay']['name'] ?? '';
        $overlayType = $_POST['overlay']['type'] ?? '';
        if ($overlayName === '' || ($overlayType !== 'user' && $overlayType !== 'core')) {
            $this->sendHTTPResponse('Invalid overlay metadata.', 400);
        }

        $targetName = $this->safeFileName($overlayName, ['json']);
        $fileName = ($overlayType === 'user')
            ? $this->joinPath($this->allskyOverlays, $targetName)
            : $this->joinPath($this->overlayConfigPath, $targetName);

        $raw = $_POST['config'] ?? '';
        $decoded = json_decode($raw, true);
        if ($decoded === null) {
            $this->sendHTTPResponse('Invalid JSON.', 422);
        }

        $pretty = json_encode($decoded, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        $msg = updateFile($fileName, $pretty, $fileName, false, true);
        if ($msg !== '') $this->sendHTTPResponse($msg, 500);

        $this->sendResponse(['ok' => true]);
    }

    /**
     * Read per-app designer settings. Ensure a sane set of defaults when the file isn’t present.
     */
    public function getAppConfig($returnResult = false)
    {
        $file = $this->overlayConfigPath . '/oe-config.json';
        $configStr = (is_file($file) && is_readable($file)) ? (file_get_contents($file) ?: '') : '';

        if ($configStr === '') {
            $configStr = json_encode([
                "gridVisible"        => true,
                "gridSize"           => 10,
                "gridOpacity"        => 30,
                "snapBackground"     => true,
                "addlistpagesize"    => 20,
                "addfieldopacity"    => 15,
                "selectfieldopacity" => 30,
                "mousewheelzoom"     => false,
                "backgroundopacity"  => 40,
            ], JSON_UNESCAPED_SLASHES);
        }

        $config = json_decode($configStr, false) ?: (object)[];
        if (!isset($config->overlayErrors))     $config->overlayErrors = true;
        if (!isset($config->overlayErrorsText)) $config->overlayErrorsText = 'Error found; see the WebUI';

        if (!$returnResult) {
            $this->sendResponse(json_encode($config, JSON_UNESCAPED_SLASHES));
        } else {
            return $config;
        }
    }

    // Save app-level designer settings with pretty printing
    public function postAppConfig(): void
    {
        $file = $this->overlayConfigPath . '/oe-config.json';
        $raw  = $_POST['settings'] ?? '';
        $decoded = json_decode($raw, true);
        if ($decoded === null) $this->sendHTTPResponse('Invalid JSON.', 422);

        $pretty = json_encode($decoded, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        $msg = updateFile($file, $pretty, $file, false, true);
        if ($msg !== '') $this->sendHTTPResponse($msg, 500);

        $this->sendResponse(['ok' => true]);
    }

    /* ============================== Field data ============================== */

    /**
     * Visibility filter for fields based on camera capability flags.
     * Returns false when a field should not be shown for the current device.
     */
    private function includeField(string $field): bool
    {
        if (isset($this->excludeVariables[$field])) {
            $rule = $this->excludeVariables[$field];
            $key  = $rule['ccfield'];
            if (isset($this->cc[$key]) && $this->cc[$key] == $rule['value']) {
                return false;
            }
        }
        return true;
    }

    /**
     * Combine system fields.json and userfields.json into one consumable list for the UI.
     * Stable numeric IDs are assigned for the front-end table.
     */
    public function getData($returnResult = false)
    {
        $systemPath = $this->overlayConfigPath . '/fields.json';
        $userPath   = $this->overlayConfigPath . '/userfields.json';

        $systemData = (is_file($systemPath) && is_readable($systemPath)) ? json_decode(file_get_contents($systemPath) ?: '{}') : (object)['data' => []];
        $userData   = (is_file($userPath)   && is_readable($userPath))   ? json_decode(file_get_contents($userPath)   ?: '{}') : (object)['data' => []];

        $vars = $this->getVariableList(true, true, true);
        $userData = json_decode($vars);

        $counter = 1;
        $merged  = [];

        foreach (($systemData->data ?? []) as $f) {
            if (!isset($f->name)) continue;
            if ($this->includeField($f->name)) {
                $merged[] = [
                    "id"          => $counter++,
                    "name"        => (string)($f->name ?? ''),
                    "description" => (string)($f->description ?? ''),
                    "format"      => (string)($f->format ?? ''),
                    "sample"      => (string)($f->sample ?? ''),
                    "type"        => (string)($f->type ?? ''),
                    "source"      => (string)($f->source ?? ''),
                ];
            }
        }

        foreach (($userData ?? []) as $f) {
            if (!isset($f->name)) continue;
            $merged[] = [
                "id"          => $counter++,
                "name"        => (string)($f->name ?? ''),
                "description" => (string)($f->description ?? ''),
                "format"      => (string)($f->format ?? ''),
                "sample"      => (string)($f->sample ?? ''),
                "type"        => (string)($f->type ?? ''),
                "source"      => (string)($f->source ?? ''),
            ];
        }

        $payload = ["data" => $merged];

        if (!$returnResult) {
            $this->sendResponse(json_encode($payload, JSON_UNESCAPED_SLASHES));
        } else {
            return $payload;
        }
    }

    /**
     * Save user-defined fields back to userfields.json.
     * Only entries with source="User" are persisted; UI reindexes IDs.
     */
    public function postData(): void
    {
        $target = $this->overlayConfigPath . '/userfields.json';
        $raw    = $_POST['data'] ?? '';
        $obj    = json_decode($raw);
        if (!$obj || !isset($obj->data) || !is_array($obj->data)) {
            $this->sendHTTPResponse('Invalid fields payload.', 422);
        }

        $user = [];
        foreach ($obj->data as $f) {
            if (($f->source ?? '') === 'User') {
                $user[] = [
                    "id"          => 0,
                    "name"        => (string)($f->name ?? ''),
                    "description" => (string)($f->description ?? ''),
                    "format"      => (string)($f->format ?? ''),
                    "sample"      => (string)($f->sample ?? ''),
                    "type"        => (string)($f->type ?? ''),
                    "source"      => "User",
                ];
            }
        }

        $pretty = json_encode(["data" => $user], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        $msg = updateFile($target, $pretty, $target, false, true);
        if ($msg !== '') $this->sendHTTPResponse($msg, 500);

        $this->sendResponse(['ok' => true]);
    }

    /* ========================= Overlay runtime data ========================= */

    /**
     * Parse overlaydebug.txt into a simple array for the UI. Tolerant of odd lines/encodings.
     */
    public function getOverlayData($returnResult = false)
    {
        $result = ['data' => []];
        $file   = $this->allskyTmp . '/overlaydebug.txt';

        if (is_file($file) && is_readable($file)) {
            $lines = file($file);
            if ($lines !== false) {
                $i = 0;
                foreach ($lines as $line) {
                    $parts = explode(' ', $line, 2);
                    if (count($parts) > 1) {
                        $name  = trim($parts[0]);
                        $value = trim($parts[1]);

                        // Normalize to UTF-8; ignore bad sequences
                        $value = iconv("UTF-8", "ISO-8859-1//IGNORE", $value);
                        $value = iconv("ISO-8859-1", "UTF-8", $value);

                        if (strpos($name, 'AS_') === 0) {
                            $result['data'][] = (object)[
                                'id'    => $i++,
                                'name'  => $name,
                                'value' => $value,
                            ];
                        }
                    }
                }
            }
        }

        if (!$returnResult) {
            $this->sendResponse(json_encode($result, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT));
        } else {
            return $result;
        }
    }

    /* ========================= Auto-exposure mask ========================== */

    // Return the raw autoexposure.json string (the UI expects a JSON string)
    public function getAutoExposure(): void
    {
        $file = $this->overlayConfigPath . "/autoexposure.json";
        $data = (is_file($file) && is_readable($file)) ? (file_get_contents($file) ?: '{}') : '{}';
        $this->sendResponse($data);
    }

    /**
     * Save auto-exposure settings and regenerate a helper PNG preview.
     * Dimensions are clamped to at least 1px to avoid GD warnings.
     */
    public function postAutoExposure(): void
    {
        $raw = $_POST['data'] ?? '';
        $cfg = json_decode($raw);
        if ($cfg === null) $this->sendHTTPResponse(422, "'data' must be valid JSON.");

        // Persist for the UI first
        $dst = $this->overlayConfigPath . "/autoexposure.json";
        $msg = updateFile($dst, json_encode($cfg, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), $dst, false, true);
        if ($msg !== '') $this->sendHTTPResponse($msg, 500);

        // Bake mask image for the preview
        $w = max(1, (int)($cfg->stagewidth  ?? 0));
        $h = max(1, (int)($cfg->stageheight ?? 0));
        $x = (int)($cfg->x    ?? (int)floor($w/2));
        $y = (int)($cfg->y    ?? (int)floor($h/2));
        $xr= max(1, (int)($cfg->xrad ?? (int)floor($w/4)));
        $yr= max(1, (int)($cfg->yrad ?? (int)floor($h/4)));

        $img   = imagecreatetruecolor($w, $h);
        $black = imagecolorallocate($img, 0, 0, 0);
        $white = imagecolorallocate($img, 255, 255, 255);
        imagefill($img, 0, 0, $black);
        imagefilledellipse($img, $x, $y, $xr * 2, $yr * 2, $white);
        imagepng($img, $this->joinPath($this->overlayPath, 'autoexposure.png'));
        imagedestroy($img);

        $this->sendResponse(['ok' => true]);
    }

    /* ====================== Font helpers (fc-scan parsing) ===================== */

    /**
     * Call fc-scan on a font file and parse key/value lines into a simple map.
     * Failures return a compact error object rather than throwing.
     */
    private function scanFont(string $fontPath): array
    {
        // Run fc-scan safely with runProcess (no shell interpretation)
        $res = $this->runProcess(['fc-scan', $fontPath]);

        if (!empty($res['error'])) {
            return ['error' => 'fc-scan failed: ' . trim((string)$res['message'])];
        }

        $parsed = [];
        $output = trim((string)$res['message']);

        foreach (preg_split('/\R/', $output) as $line) {
            if (preg_match('/^\s*([a-zA-Z0-9_]+):\s+(.+)$/', trim($line), $m)) {
                $key = $m[1];
                $raw = $m[2];

                if (preg_match('/"([^"]+)"/', $raw, $vm)) {
                    $parsed[$key] = $vm[1];
                } else {
                    $parsed[$key] = $raw;
                }
            }
        }

        return $parsed;
    }

    // Compact list of built-in and user font names/paths for dropdowns
    public function getFontNames(): void
    {
        $count  = 1;
        $rows   = [];
        $base   = '/system_fonts/';
        $builtin = [
            'Arial'           => 'Arial.ttf',
            'Arial Black'     => 'Arial_Black.ttf',
            'Times New Roman' => 'Times_New_Roman.ttf',
            'Courier New'     => 'cour.ttf',
            'Verdana'         => 'Verdana.ttf',
            'Trebuchet MS'    => 'trebuc.ttf',
            'Impact'          => 'Impact.ttf',
            'Georgia'         => 'Georgia.ttf',
            'Comic Sans MS'   => 'comic.ttf',
        ];

        foreach ($builtin as $name => $file) {
            $rows[] = (object)[ 'id' => $count++, 'name' => $name, 'path' => $base . $file ];
        }

        $dir = $this->overlayPath . '/fonts/';
        if (is_dir($dir)) {
            foreach (scandir($dir) ?: [] as $font) {
                if ($font === '.' || $font === '..') continue;
                $rows[] = (object)[
                    'id'   => $count++,
                    'name' => pathinfo($font, PATHINFO_FILENAME),
                    'path' => '/fonts/' . $this->safeFileName($font, ['ttf','otf']),
                ];
            }
        }

        $this->sendResponse(json_encode(['data' => $rows], JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT));
    }

    // Richer listing that includes family/style by calling fc-scan
    public function getFonts(): void
    {
        $count  = 1;
        $rows   = [];

        $systemBase = $this->overlayPath . '/system_fonts/';
        $systemMap = [
            'Arial'           => 'Arial.ttf',
            'Arial Black'     => 'Arial_Black.ttf',
            'Times New Roman' => 'Times_New_Roman.ttf',
            'Courier New'     => 'cour.ttf',
            'Verdana'         => 'Verdana.ttf',
            'Trebuchet MS'    => 'trebuc.ttf',
            'Impact'          => 'Impact.ttf',
            'Georgia'         => 'Georgia.ttf',
            'Comic Sans MS'   => 'comic.ttf',
        ];

        foreach ($systemMap as $name => $file) {
            $abs  = $systemBase . $file;
            $info = $this->scanFont($abs);
            $rows[] = (object)[
                'id'     => $count++,
                'name'   => $name,
                'family' => $info['family'] ?? $name,
                'style'  => $info['style']  ?? 'Regular',
                'type'   => 'system',
                'path'   => $abs,
            ];
        }

        $dir = $this->overlayPath . '/fonts/';
        if (is_dir($dir)) {
            foreach (scandir($dir) ?: [] as $font) {
                if ($font === '.' || $font === '..') continue;
                $abs = $dir . $font;
                if (!is_file($abs)) continue;

                $info = $this->scanFont($abs);
                $rows[] = (object)[
                    'id'     => $count++,
                    'name'   => pathinfo($font, PATHINFO_FILENAME),
                    'family' => $info['family'] ?? pathinfo($font, PATHINFO_FILENAME),
                    'style'  => $info['style']  ?? 'Regular',
                    'type'   => 'user',
                    'path'   => '/fonts/' . $this->safeFileName($font, ['ttf','otf']),
                ];
            }
        }

        $this->sendResponse(json_encode(['data' => $rows], JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT));
    }

    /**
     * Install fonts from a dafont.com URL or an uploaded zip.
     * We only extract valid TTF/OTF files with expected magic bytes.
     */
    public function postFonts(): void
    {
        $saveFolder = $this->overlayPath . '/fonts/';
        @mkdir($saveFolder, 0775, true);

        $downloadPath = '';
        $maxZipSize   = 20 * 1024 * 1024;

        if (!empty($_POST['fontURL'])) {
            // Restrict sources to dafont.com to lower the risk profile
            $fontURL = trim((string)$_POST['fontURL']);
            $host    = parse_url($fontURL, PHP_URL_HOST) ?: '';
            if (strcasecmp($host, 'www.dafont.com') !== 0 && strcasecmp($host, 'dl.dafont.com') !== 0) {
                $this->sendHTTPResponse('Only dafont.com is allowed.', 404);
            }

            $ctx = stream_context_create([
                'http' => ['timeout' => 10, 'follow_location' => 1],
                'ssl'  => ['verify_peer' => true, 'verify_peer_name' => true],
            ]);

            // dafont page → dl URL mapping
            $fontName = str_replace("https://www.dafont.com/", "", $fontURL);
            $fontName = str_replace(".font", "", $fontName);
            $fileName = str_replace("-", "_", $fontName);
            $downloadURL = "https://dl.dafont.com/dl/?f=" . $fileName;

            $data = @file_get_contents($downloadURL, false, $ctx);
            if ($data === false) $this->sendHTTPResponse("Failed to download '$fontURL'.", 422);
            if (strlen($data) > $maxZipSize) $this->sendHTTPResponse('Zip too large.', 413);

            $downloadPath = sys_get_temp_dir() . '/font_' . bin2hex(random_bytes(6)) . '.zip';
            $msg = updateFile($downloadPath, $data, $downloadPath, false, true);
            if ($msg !== '') $this->sendHTTPResponse($msg, 422);
        } elseif (isset($_FILES['oe-fontupload-file']) && is_uploaded_file($_FILES['oe-fontupload-file']['tmp_name'])) {
            if ((int)($_FILES['oe-fontupload-file']['size'] ?? 0) > $maxZipSize) {
                $this->sendHTTPResponse('Zip too large.', 413);
            }
            $downloadPath = $_FILES['oe-fontupload-file']['tmp_name'];
        } else {
            $this->sendHTTPResponse('No font source provided.', 400);
        }

        $zip = new ZipArchive();
        if ($zip->open($downloadPath) !== true) {
            $this->sendHTTPResponse('Invalid zip.', 422);
        }

        $result = [];
        $validExt   = ['ttf', 'otf'];
        $validMagic = ['00010000', '4F54544F']; // TrueType/OTTO signatures

        for ($i = 0; $i < $zip->numFiles; $i++) {
            $stat = $zip->statIndex($i);
            $name = $stat['name'] ?? '';
            if ($name === '' || stripos($name, '__MACOSX') !== false) continue;

            // Avoid zip-slip: drop paths and keep only the last component
            $base = $this->safeFileName($name);
            $ext  = strtolower(pathinfo($base, PATHINFO_EXTENSION));
            if (!in_array($ext, $validExt, true)) continue;

            $stream = $zip->getStream($name);
            if (!$stream) continue;

            $contents = stream_get_contents($stream);
            fclose($stream);
            if ($contents === false || $contents === '') continue;

            // Quick signature check to filter junk
            $magic = strtoupper(bin2hex(substr($contents, 0, 4)));
            if (!in_array($magic, $validMagic, true)) continue;

            $dest = $this->joinPath($saveFolder, $base);
            $err  = updateFile($dest, $contents, $dest, false, true);
            if ($err !== '') $this->sendHTTPResponse($err, 507);

            $result[] = [
                'key'  => pathinfo($base, PATHINFO_FILENAME),
                'path' => str_replace($this->overlayPath, '', $dest),
            ];
        }
        $zip->close();

        if (empty($result)) $this->sendHTTPResponse('No valid fonts found.', 417);
        $this->sendResponse(json_encode($result, JSON_UNESCAPED_SLASHES));
    }

    // Delete a user-provided font; built-ins are not removed here
    public function deleteFont(): void
    {
        $fontName = $this->safeFileName($_GET['fontName'] ?? '', ['ttf','otf']);
        if ($fontName === '') $this->sendHTTPResponse('Missing fontName.', 400);

        $path = $this->joinPath($this->overlayPath . '/fonts', $fontName);
        if (is_file($path) && is_writable($path)) {
            @unlink($path);
            $this->sendResponse(['ok' => true]);
        } else {
            $this->sendHTTPResponse('Font not found.', 404);
        }
    }

    /* ================================ Images ================================ */

    // Provide the current image path expected by the UI (returned as a JSON string)
    public function getImageDetails(): void
    {
        $fileName = $this->getSetting('filename');
        $imagePath = 'current/' . $this->safeFileName((string)$fileName, ['png','jpg','jpeg','gif','webp']);
        $this->sendResponse(json_encode($imagePath, JSON_UNESCAPED_SLASHES));
    }

    /**
     * Accept a small base64 image and save it to /images, plus a 90×90 thumbnail.
     * Only jpg/jpeg/png are allowed here.
     */
    public function postBase64Image(): void
    {
        $dataUrl  = (string)($_POST['image'] ?? '');
        $nameRaw  = (string)($_POST['filename'] ?? '');
        if ($dataUrl === '' || $nameRaw === '') {
            $this->sendHTTPResponse('Missing image or filename.', 400);
        }

        if (!preg_match('/^data:image\/(\w+);base64,/', $dataUrl, $m)) {
            $this->sendHTTPResponse('Unsupported image type.', 415);
        }
        $type = strtolower($m[1]);
        if (!in_array($type, ['jpg','jpeg','png'], true)) {
            $this->sendHTTPResponse('Unsupported image type.', 415);
        }

        $raw = base64_decode(substr($dataUrl, strpos($dataUrl, ',') + 1), true);
        if ($raw === false) $this->sendHTTPResponse('Base64 decoding failed.', 422);

        $imgDir   = $this->overlayPath . '/images/';
        $thumbDir = $this->overlayPath . '/imagethumbnails/';
        @mkdir($imgDir, 0775, true);
        @mkdir($thumbDir, 0775, true);

        $base   = $this->safeFileName($nameRaw) . '.' . $type;
        $target = $this->joinPath($imgDir, $base);

        $msg = updateFile($target, $raw, $target, false, true);
        if ($msg !== '') $this->sendHTTPResponse($msg, 500);

        $this->createThumbnail($target, $this->joinPath($thumbDir, $base), 90, 90);

        $this->sendResponse(['ok' => true, 'filename' => $base]);
    }

    /**
     * Standard multipart upload path for larger images.
     * After moving the upload, create a matching thumbnail.
     */
    public function postImages(): void
    {
        $imgDir   = $this->overlayPath . '/images/';
        $thumbDir = $this->overlayPath . '/imagethumbnails/';
        @mkdir($imgDir, 0775, true);
        @mkdir($thumbDir, 0775, true);

        if (!isset($_FILES['file']) || !is_uploaded_file($_FILES['file']['tmp_name'])) {
            $this->sendHTTPResponse('No file uploaded.', 400);
        }

        $safeName = $this->safeFileName($_FILES['file']['name'], ['png','jpg','jpeg']);
        $target   = $this->joinPath($imgDir, $safeName);
        $moved    = move_uploaded_file($_FILES['file']['tmp_name'], $target);

        if ($moved) {
            $this->createThumbnail($target, $this->joinPath($thumbDir, $safeName), 90, 90);
            $this->sendResponse(['ok' => true]);
        } else {
            $err = (int)($_FILES['file']['error'] ?? 0);
            if ($err === UPLOAD_ERR_INI_SIZE || $err === UPLOAD_ERR_FORM_SIZE) {
                $this->sendHTTPResponse('File too large.', 400);
            }
            $this->sendHTTPResponse('Upload failed.', 500);
        }
    }

    // Enumerate available thumbnails for the image picker
    public function getImages(): void
    {
        $valid = ['png','jpg','jpeg'];
        $dir   = $this->overlayPath . '/imagethumbnails';
        $out   = [];

        if (is_dir($dir)) {
            foreach (scandir($dir) ?: [] as $f) {
                if ($f === '.' || $f === '..') continue;
                $ext = strtolower(pathinfo($f, PATHINFO_EXTENSION));
                if (in_array($ext, $valid, true)) {
                    $out[] = [
                        'filename'     => $f,
                        'thumbnailurl' => '/overlay/imagethumbnails/' . rawurlencode($f),
                    ];
                }
            }
        }
        $this->sendResponse(json_encode($out, JSON_UNESCAPED_SLASHES));
    }

    // Delete an image and its thumbnail; 404 if neither is present
    public function deleteImage(): void
    {
        $name = $this->safeFileName(strtolower((string)($_GET['imageName'] ?? '')), ['png','jpg','jpeg']);
        if ($name === '') $this->sendHTTPResponse('Missing imageName.', 400);

        $img   = $this->joinPath($this->overlayPath . '/images/', $name);
        $thumb = $this->joinPath($this->overlayPath . '/imagethumbnails/', $name);

        $ok = true;
        if (is_file($img))   $ok = $ok && @unlink($img);
        if (is_file($thumb)) $ok = $ok && @unlink($thumb);

        if ($ok) $this->sendResponse(['ok' => true]);
        $this->sendHTTPResponse('Image not found.', 404);
    }

    /* ================================ Formats =============================== */

    /**
     * Return formats.json with attribute keys expanded from format_attributes.json.
     * Supports "dpN" shorthand (e.g., dp2) which maps to the "dp" attribute with value N.
     */
    public function getFormats(): void
    {
        $formatsPath = $this->overlayConfigPath . '/formats.json';
        $attrsPath   = $this->overlayConfigPath . '/format_attributes.json';

        $formats    = (is_file($formatsPath) && is_readable($formatsPath)) ? json_decode(file_get_contents($formatsPath) ?: '[]', true) : [];
        $attributes = (is_file($attrsPath)   && is_readable($attrsPath))   ? json_decode(file_get_contents($attrsPath)   ?: '[]', true) : [];

        if (!isset($formats['data']) || !is_array($formats['data'])) {
            $this->sendResponse(json_encode(['data' => []], JSON_UNESCAPED_SLASHES));
        }

        foreach ($formats['data'] as &$fmt) {
            if (isset($fmt['attribute']) && is_array($fmt['attribute'])) {
                $expanded = [];
                foreach ($fmt['attribute'] as $key) {
                    if (isset($attributes[$key])) {
                        $expanded[$key] = $attributes[$key];
                    } elseif (strpos($key, 'dp') === 0) {
                        $n = (int)substr($key, 2);
                        if (isset($attributes['dp'])) {
                            $expanded['dp'] = $attributes['dp'];
                            $expanded['dp']['value'] = $n;
                        }
                    }
                }
                $fmt['attribute'] = $expanded;
            }
        }
        unset($fmt);

        usort($formats['data'], function($a, $b) {
            $aIsLegacy = isset($a['legacy']);
            $bIsLegacy = isset($b['legacy']);
            if ($aIsLegacy === $bIsLegacy) return 0;
            return $aIsLegacy ? 1 : -1;
        });

        $this->sendResponse(json_encode($formats, JSON_UNESCAPED_SLASHES));
    }

    /* ======================= Overlay selection & loading ====================== */

    /**
     * Bundle everything the designer needs: current overlay config, fields,
     * live overlay data, and app-config.
     */
    public function getConfigs(): void
    {
        $result = [];

        $tod   = getenv('DAY_OR_NIGHT') ?: 'night';
        $fname = ($tod === 'day') ? $this->getSetting('daytimeoverlay') : $this->getSetting('nighttimeoverlay');

        // Prefer core overlay; fall back to user overlay folder
        $overlay = null;
        $core    = $this->joinPath($this->overlayConfigPath, $this->safeFileName((string)$fname, ['json']));
        if (is_file($core)) {
            $overlay = file_get_contents($core);
        } else {
            $user = $this->joinPath($this->allskyOverlays, $this->safeFileName((string)$fname, ['json']));
            if (is_file($user)) $overlay = file_get_contents($user);
        }

        $template = json_decode($overlay ?: '{}');
        $this->fixMetaData($template);
        $result['config']      = $template;
        $result['data']        = $this->getData(true);
        $result['overlaydata'] = $this->getOverlayData(true);
        $result['appconfig']   = $this->getAppConfig(true);

        $this->sendResponse(json_encode($result, JSON_UNESCAPED_SLASHES));
    }

    /**
     * Load a specific overlay JSON by name from core or user directories.
     * If $return is true, return the raw JSON; otherwise send it to the client.
     */
    public function getLoadOverlay($overlayName = null, $return = false)
    {
        $name = $overlayName ?? ($_GET['overlay'] ?? '');
        if ($name === '') {
            if (!$return) $this->sendHTTPResponse('Missing overlay.', 400);
            return null;
        }

        $safe = $this->safeFileName((string)$name, ['json']);
        $paths = [
            $this->joinPath($this->overlayConfigPath, $safe),
            $this->joinPath($this->allskyOverlays, $safe),
        ];

        $raw = null;
        foreach ($paths as $p) {
            if (is_file($p) && is_readable($p)) { $raw = file_get_contents($p); break; }
        }

        if (!$return) {
            if ($raw === null) $this->sendHTTPResponse('Overlay not found.', 404);
            $this->sendResponse($raw ?? '{}');
        } else {
            return $raw;
        }
    }

    /**
     * Read a value from the global settings array prepared by initialize_variables().
     * Optionally swap spaces with a given character for filename-ish values.
     */
    private function getSetting(string $name, string $swapSpaces = '')
    {
        /** @var array $settings_array */
        global $settings_array;
        $val = getVariableOrDefault($settings_array, $name, 'overlay.json');
        if ($swapSpaces !== '') $val = str_replace(' ', $swapSpaces, (string)$val);
        return $val;
    }

    /**
     * Build a catalog of core and user overlays along with current day/night selections
     * and some camera metadata to avoid extra roundtrips from the UI.
     */
    public function getOverlays(): void
    {
        $data = [
            'coreoverlays' => [],
            'useroverlays' => [],
            'config'       => [
                'daytime'   => $this->getSetting('daytimeoverlay'),
                'nighttime' => $this->getSetting('nighttimeoverlay'),
            ],
            'brands'       => ['RPi', 'ZWO', 'Arducam'],
            'brand'        => $this->getSetting('cameratype'),
            'model'        => $this->getSetting('cameramodel'),
            'sensorWidth'  => $this->cc['sensorWidth']  ?? null,
            'sensorHeight' => $this->cc['sensorHeight'] ?? null,
        ];

        $tod = function_exists('getTOD') ? getTOD() : 'night';
        $data['current'] = ($tod === 'day') ? $data['config']['daytime'] : $data['config']['nighttime'];

        // Core overlays
        foreach (scandir($this->overlayConfigPath) ?: [] as $entry) {
            if ($entry === '.' || $entry === '..' || strpos($entry, 'overlay') !== 0) continue;
            $path = $this->joinPath($this->overlayConfigPath, $entry);
            if (!is_file($path)) continue;

            $obj = json_decode(file_get_contents($path) ?: '{}') ?: (object)[];
            $this->fixMetaData($obj);

            if (!isset($obj->metadata)) {
                $name = 'Unknown';
                if ($entry === 'overlay.json')     $name = 'Default Overlay';
                if ($entry === 'overlay-RPi.json') $name = 'Default RPi Overlay';
                if ($entry === 'overlay-ZWO.json') $name = 'Default ZWO Overlay';
                $obj->metadata = (object)['name' => $name];
            }
            $data['coreoverlays'][$entry] = $obj;
        }

        // User overlays
        if (is_dir($this->allskyOverlays)) {
            foreach (scandir($this->allskyOverlays) ?: [] as $entry) {
                if ($entry === '.' || $entry === '..' || strpos($entry, 'overlay') !== 0) continue;
                $path = $this->joinPath($this->allskyOverlays, $entry);
                if (!is_file($path)) continue;

                $obj = json_decode(file_get_contents($path) ?: '{}') ?: (object)[];
                $this->fixMetaData($obj);
                $data['useroverlays'][$entry] = $obj;
            }
        }

        // Attach settings blob so the UI doesn’t need another request
        $settingsFile = rtrim(ALLSKY_CONFIG, '/') . '/settings.json';
        $data['settings'] = (is_file($settingsFile) && is_readable($settingsFile))
            ? json_decode(file_get_contents($settingsFile) ?: '{}')
            : (object)[];

        $this->sendResponse(json_encode($data, JSON_UNESCAPED_SLASHES));
    }

    // Validate whether a proposed user overlay filename already exists
    public function getValidateFilename(): void
    {
        $name = $this->safeFileName((string)($_GET['filename'] ?? ''), []);
        if ($name === '') $this->sendHTTPResponse('Missing filename.', 400);
        $path = $this->joinPath($this->allskyOverlays, $name);
        $this->sendResponse(json_encode(['error' => is_file($path)], JSON_UNESCAPED_SLASHES));
    }

    /**
     * Suggest the next overlay number by scanning user overlay filenames
     * that follow the "overlayN-..." pattern.
     */
    public function getSuggest(): void
    {
        $dir = $this->allskyOverlays;
        $max = 0;

        if (is_dir($dir)) {
            foreach (scandir($dir) ?: [] as $entry) {
                if ($entry === '.' || $entry === '..') continue;
                $parts = explode('-', $entry);
                if (!empty($parts) && strpos($parts[0], 'overlay') === 0) {
                    $n = (int) substr($parts[0], 7);
                    if ($n > $max) $max = $n;
                }
            }
        }
        $this->sendResponse($max + 1);
    }

    /**
     * Create a new overlay file, optionally by copying an existing one.
     * Ensures required top-level keys exist so the designer can open it safely.
     */
    public function postNewOverlay(): void
    {
        @mkdir($this->allskyOverlays, 0775, true);

        $copy = (string)($_POST['data']['copy'] ?? 'none');
        if ($copy !== 'none') {
            $raw = $this->getLoadOverlay($copy, true);
            $overlay = json_decode($raw ?: '{}') ?: (object)[];
        } else {
            $overlay = (object)[];
            $this->fixMetaData($overlay);
        }

        $overlay->metadata = $_POST['fields'] ?? (object)[];
        if (!isset($overlay->fields))   $overlay->fields = [];
        if (!isset($overlay->images))   $overlay->images = [];
        if (!isset($overlay->fonts))    $overlay->fonts  = ['moon_phases' => ['fontPath' => 'fonts/moon_phases.ttf']];
        if (!isset($overlay->settings)) {
            $overlay->settings = [
                'defaultdatafileexpiry' => '550',
                'defaultincludeplanets' => false,
                'defaultincludesun'     => false,
                'defaultincludemoon'    => false,
                'defaultimagetopacity'  => 0.63,
                'defaultimagerotation'  => 0,
                'defaulttextrotation'   => 0,
                'defaultfontopacity'    => 1,
                'defaultfontcolour'     => 'white',
                'defaultfont'           => 'Arial',
                'defaultfontsize'       => 52,
                'defaultimagescale'     => 1,
                'defaultnoradids'       => '',
            ];
        }

        $fileOnly = $this->safeFileName((string)($_POST['data']['filename'] ?? ''), []);
        if ($fileOnly === '') $this->sendHTTPResponse('Missing filename.', 400);

        $dest = $this->joinPath($this->allskyOverlays, $fileOnly);
        $pretty = json_encode($overlay, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        $msg = updateFile($dest, $pretty, $dest, false, true);
        if ($msg !== '') $this->sendHTTPResponse($msg, 500);
        @chmod($dest, 0775);

        $this->sendResponse(['ok' => true]);
    }

    // Remove a user overlay; missing file is treated as success to keep UX simple
    public function deleteOverlay(): void
    {
        $name = $this->safeFileName((string)($_GET['filename'] ?? ''), ['json']);
        if ($name === '') $this->sendHTTPResponse('Missing filename.', 400);

        $path = $this->joinPath($this->allskyOverlays, $name);
        if (is_file($path) && is_writable($path)) {
            @unlink($path);
        }
        $this->sendResponse(['ok' => true]);
    }

    /**
     * Save day/night overlay selections back into settings.json.
     * Filenames are validated and the file is rewritten in pretty format.
     */
    public function postSaveSettings(): void
    {
        $day   = (string)($_POST['daytime']   ?? '');
        $night = (string)($_POST['nighttime'] ?? '');
        if ($day === '' || $night === '') $this->sendHTTPResponse('Missing settings.', 400);

        $file = getSettingsFile();
        if (!is_file($file) || !is_readable($file)) $this->sendHTTPResponse('Settings not readable.', 500);

        $raw  = file_get_contents($file) ?: '{}';
        $cfg  = json_decode($raw, true) ?: [];
        $cfg['daytimeoverlay']   = $this->safeFileName($day, ['json']);
        $cfg['nighttimeoverlay'] = $this->safeFileName($night, ['json']);

        $mode = JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_NUMERIC_CHECK | JSON_PRESERVE_ZERO_FRACTION;
        $pretty = json_encode($cfg, $mode);

        $msg = updateFile($file, $pretty, $file, false, true);
        if ($msg !== '') $this->sendHTTPResponse($msg, 500);
        $this->sendResponse(['ok' => true]);
    }

    /**
     * Ensure overlay JSON objects have the keys the UI expects,
     * providing minimal defaults for older or partial files.
     */
    private function fixMetaData(&$overlay): void
    {
        if ($overlay === null) $overlay = (object)[];
        if (!isset($overlay->metadata))              $overlay->metadata = (object)[];
        if (!isset($overlay->metadata->name))        $overlay->metadata->name        = '???';
        if (!isset($overlay->metadata->camerabrand)) $overlay->metadata->camerabrand = '???';
        if (!isset($overlay->metadata->cameramodel)) $overlay->metadata->cameramodel = '???';
        if (!isset($overlay->metadata->tod))         $overlay->metadata->tod         = 'both';
    }

    /**
     * Flatten core and user overlays into a table-friendly list.
     * Useful for admin UIs that don’t need nested structures.
     */
    public function getOverlayList(): void
    {
        $rows = [];

        // Core overlays
        foreach (scandir($this->overlayConfigPath) ?: [] as $entry) {
            if ($entry === '.' || $entry === '..' || strpos($entry, 'overlay') !== 0) continue;
            $path = $this->joinPath($this->overlayConfigPath, $entry);
            if (!is_file($path)) continue;

            $obj = json_decode(file_get_contents($path) ?: '{}') ?: (object)[];
            $this->fixMetaData($obj);

            $rows[] = [
                'type'     => 'Allsky',
                'name'     => $obj->metadata->name,
                'brand'    => $obj->metadata->camerabrand,
                'model'    => $obj->metadata->cameramodel,
                'tod'      => $obj->metadata->tod,
                'filename' => $entry,
            ];
        }

        // User overlays
        if (is_dir($this->allskyOverlays)) {
            foreach (scandir($this->allskyOverlays) ?: [] as $entry) {
                if ($entry === '.' || $entry === '..' || strpos($entry, 'overlay') !== 0) continue;
                $path = $this->joinPath($this->allskyOverlays, $entry);
                if (!is_file($path)) continue;

                $obj = json_decode(file_get_contents($path) ?: '{}') ?: (object)[];
                $this->fixMetaData($obj);

                $rows[] = [
                    'type'     => 'User',
                    'name'     => $obj->metadata->name,
                    'brand'    => $obj->metadata->camerabrand,
                    'model'    => $obj->metadata->cameramodel,
                    'tod'      => $obj->metadata->tod,
                    'filename' => $entry,
                ];
            }
        }

        $this->sendResponse(json_encode(['data' => $rows], JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT));
    }

    // Lightweight status probe; translates the producer’s status file into {running, status}
    public function getStatus(): void
    {
        $out = ['running' => true, 'status' => 'Unknown'];

        if (is_file($this->allskyStatus) && is_readable($this->allskyStatus)) {
            $raw = file_get_contents($this->allskyStatus) ?: '';
            if (function_exists('mb_convert_encoding')) {
                $raw = mb_convert_encoding($raw, 'UTF-8', 'UTF-8, ISO-8859-1, ASCII');
            }

            $st = json_decode($raw, true);
            if (is_array($st) && isset($st['status'])) {
                $status = (string)$st['status'];
                $status = str_replace("\0", '', $status);
                if (function_exists('mb_convert_encoding')) {
                    $status = mb_convert_encoding($status, 'UTF-8', 'UTF-8, ISO-8859-1, ASCII');
                } else {
                    $status = @iconv('UTF-8', 'UTF-8//IGNORE', $status) ?: $status;
                }

                $out['status']  = $status;
                $out['running'] = (strtolower($status) === 'running');
            }
        }

        $this->sendResponse($out);
    }

    public function getImageName(): void
    {
        global $image_name;

        $this->sendResponse($image_name);
    }

    /**
     * Return a formatted current time string using Python’s strftime.
     * The format string is whitelisted to a safe subset of characters.
     */
    public function postPythonDate(): void
    {
        $fmt = (string)($_POST['format'] ?? '');
        if ($fmt === '') $this->sendHTTPResponse('Missing format.', 400);

        if (!preg_match('/^[%A-Za-z0-9_\-\s:.,\/]+$/', $fmt)) {
            $this->sendHTTPResponse('Invalid format.', 400);
        }

        // Use runProcess with argv so we avoid the shell entirely
        $res = $this->runProcess([
            'python3',
            '-c',
            'from datetime import datetime; import sys; print(datetime.now().strftime(sys.argv[1]))',
            $fmt
        ]);

        if (!empty($res['error'])) $this->sendHTTPResponse('Python error.', 500);
        $this->sendResponse(trim((string)$res['message']));
    }

    /**
     * Ask the test_overlay.sh script to render a preview with a posted overlay JSON.
     * The JSON is written to a temp file atomically; arguments are passed without a shell.
     */
    public function postSample(): void
    {
        $overlay = (string)($_POST['overlay'] ?? '');
        if ($overlay === '') $this->sendHTTPResponse('Missing overlay.', 400);

        $tmp = $this->allskyTmp . '/test_overlay.json';
        $msg = updateFile($tmp, $overlay, $tmp, false, true);
        if ($msg !== '') $this->sendHTTPResponse($msg, 500);

        // Build argv array; prefer --flag=value to avoid ambiguity without a shell
        $script = $this->allsky_scripts . '/test_overlay.sh';
        $argv = [
            'sudo',
            $script,
            '--allsky_home'    , $this->allsky_home,
            '--allsky_scripts' , $this->allsky_scripts,
            '--allsky_tmp'     , $this->allskyTmp,
            '--overlay'        , $tmp,
        ];

        $res = $this->runProcess($argv);

        if (!empty($res['error'])) $this->sendHTTPResponse((string)$res['message'], 500);
        $this->sendResponse((string)$res['message']);
    }
}

$overlayUtil = new OVERLAYUTIL();
$overlayUtil->run();