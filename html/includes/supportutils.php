<?php
include_once('functions.php');
initialize_variables();
include_once('authenticate.php');

class SUPPORTUTIL
{
    private string $request = '';
    private string $method = '';
    private bool $jsonResponse = true;
    private string $issueDir;

    public function __construct()
    {
        $this->issueDir = ALLSKY_SUPPORT_DIR;
        if (!is_dir($this->issueDir) || !is_readable($this->issueDir)) {
            $this->send404("Support directory is unavailable.");
        }
    }

    // Entry point: verify XHR, normalize inputs, then dispatch
    public function run(): void
    {
        $this->ensureXHR();
        $this->normalizeInputs();
        $this->dispatch();
    }

    // Require XMLHttpRequest/fetch (blocks direct navigation)
    private function ensureXHR(): void
    {
        $hdr = $_SERVER['HTTP_X_REQUESTED_WITH'] ?? '';
        if (strcasecmp($hdr, 'xmlhttprequest') !== 0) {
            $this->send404("AJAX required.");
        }
    }

    // Sanitize the "request" selector and method name
    private function normalizeInputs(): void
    {
        $req = $_GET['request'] ?? '';
        $this->request = preg_replace('/[^a-zA-Z0-9_]/', '', $req) ?: '';
        $this->method  = strtolower($_SERVER['REQUEST_METHOD'] ?? 'get');
        $accepts = $_SERVER['HTTP_ACCEPT'] ?? '';
        $this->jsonResponse = (stripos($accepts, 'application/json') !== false);
    }

    // Consistent 404 JSON response
    private function send404(string $msg = "Not found"): void
    {
        http_response_code(404);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['error' => $msg, 'code' => 404], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Consistent 500 JSON response, with safe message
    private function send500(string $msg = "Internal error"): void
    {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['error' => $msg, 'code' => 500], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        exit;
    }

    // JSON payload writer
    private function sendResponse($payload = ['ok' => true]): void
    {
        http_response_code(200);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Restrict dispatch to a whitelist and enforce CSRF on state-changing verbs
    private function dispatch(): void
    {
        $action = $this->method . ucfirst($this->request);

        $allowed = [
            'getSupportFilesList',
            'getGenerateLog',
            'postDownloadLog',
            'postDeleteLog',
            'postChangeGithubId',
        ];

        if (!in_array($action, $allowed, true) || !method_exists($this, $action)) {
            $this->send404($this->request . " is not callable.");
        }

        if (in_array($this->method, ['post', 'put', 'patch', 'delete'], true)) {
            if (!function_exists('CSRFValidate') || !CSRFValidate()) {
                $this->send500('Invalid CSRF token.');
            }
        }

        try {
            $this->$action();
        } catch (Throwable $e) {
            error_log("SUPPORTUTIL error in {$action}: " . $e->getMessage());
            $this->send500();
        }
    }

    // Convert bytes to a readable size string
    private function humanReadableFileSize(int $bytes, int $decimals = 2): string
    {
        $sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        $factor = (int) floor((strlen((string) $bytes) - 1) / 3);
        $factor = max(0, min($factor, count($sizes) - 1));
        $fmt = $factor === 0 ? '%d' : "%.{$decimals}f";
        return sprintf($fmt, $bytes / (1024 ** $factor)) . ' ' . $sizes[$factor];
    }

    // Resolve a basename within the support directory and block traversal
    private function safePathFromBasename(string $name): ?string
    {
        $name = basename($name);
        if ($name === '' || $name === '.' || $name === '..') return null;

        $full = $this->issueDir . DIRECTORY_SEPARATOR . $name;
        $realBase = realpath($this->issueDir);
        $realFull = realpath($full);

        if ($realBase === false || $realFull === false) return null;
        if (strpos($realFull, $realBase . DIRECTORY_SEPARATOR) !== 0 && $realFull !== $realBase) return null;

        return $realFull;
    }

    // Parse support file name into components, or null if invalid
    private function parseFilename(string $filename): ?array
    {
        $parts = explode('-', $filename);
        if (count($parts) !== 5) {
            error_log("Invalid support file name: {$filename}");
            return null;
        }

        [$p0, $repo, $type, $id, $tsExt] = $parts;
        if ($p0 !== 'support') {
            error_log("Invalid prefix in support file: {$filename}");
            return null;
        }

        $dot = strrpos($tsExt, '.');
        if ($dot === false) {
            error_log("Missing extension in support file: {$filename}");
            return null;
        }

        $timestamp = substr($tsExt, 0, $dot);
        $ext = substr($tsExt, $dot + 1);

        if (!preg_match('/^\d{14}$/', $timestamp)) {
            error_log("Invalid timestamp in support file: {$filename}");
            return null;
        }
        if (!preg_match('/^[a-zA-Z0-9_-]+$/', $repo)) return null;
        if (!preg_match('/^(type|discussion|issue)$/', $type)) return null;
        if (!preg_match('/^(none|\d+)$/', $id)) return null;
        if (!preg_match('/^[a-zA-Z0-9]+$/', $ext)) return null;

        return [
            'repo'      => $repo,
            'type'      => $type,
            'id'        => $id,
            'timestamp' => $timestamp,
            'ext'       => $ext,
        ];
    }

    // POST: stream a support bundle to the client
    public function postDownloadLog(): void
    {
        $logId = $_POST['logId'] ?? '';
        $path = $this->safePathFromBasename($logId);
        if ($path === null || !is_readable($path)) {
            $this->send500("File not found or not readable.");
        }

        $fname = basename($path);
        header('Content-Description: File Transfer');
        header('Content-Type: application/octet-stream');
        header('Content-Disposition: attachment; filename="' . rawurlencode($fname) . '"');
        header('Content-Transfer-Encoding: binary');
        header('Expires: 0');
        header('Cache-Control: private, must-revalidate');
        header('Pragma: public');
        header('Content-Length: ' . (string) filesize($path));

        $ok = @readfile($path);
        if ($ok === false) {
            $this->send500("Unable to read file.");
        }
        exit;
    }

    // POST: rename a support bundle to point to a different repo/ID
    public function postChangeGithubId(): void
    {
        $logId = $_POST['logId'] ?? '';
        $repo  = $_POST['repo']  ?? '';
        $newId = $_POST['newId'] ?? '';

        $path = $this->safePathFromBasename($logId);
        if ($path === null || !is_writable($path)) {
            $this->send500("Source file not found or not writable.");
        }

        $fileParts = $this->parseFilename(basename($path));
        if ($fileParts === null) {
            $this->send500("Invalid file name.");
        }

        if (!preg_match('/^[a-zA-Z0-9_-]+$/', $repo)) {
            $this->send500("Invalid repository name.");
        }
        if (!preg_match('/^(none|\d+)$/', $newId)) {
            $this->send500("Invalid ID.");
        }

        $newType = 'discussion';
        $timestamp = $fileParts['timestamp'];
        $ext = $fileParts['ext'];
        $newBase = "support-{$repo}-{$newType}-{$newId}-{$timestamp}.{$ext}";
        $newPath = $this->safePathFromBasename($newBase);
        if ($newPath === null) {
            $this->send500("Invalid destination name.");
        }

        if (@rename($path, $newPath) === false) {
            $msg = error_get_last()['message'] ?? 'rename failed';
            error_log("rename failed: {$msg}");
            $this->send500("Rename failed.");
        }

        $this->sendResponse(['ok' => true]);
    }

    // POST: delete a support bundle
    public function postDeleteLog(): void
    {
        $logId = $_POST['logId'] ?? '';
        $path = $this->safePathFromBasename($logId);
        if ($path === null || !is_writable($path)) {
            $this->send500("File not found or not writable.");
        }

        if (@unlink($path)) {
            $this->sendResponse(['ok' => true]);
        } else {
            $this->send500("Delete failed.");
        }
    }

    // GET: list support bundles with metadata
    public function getSupportFilesList(): void
    {
        $data = [];

        if (!is_dir($this->issueDir)) {
            $this->send500("Support directory missing.");
        }

        $files = @scandir($this->issueDir);
        if ($files === false) {
            $this->send500("Unable to list support directory.");
        }

        foreach ($files as $file) {
            if ($file === '.' || $file === '..') continue;

            $parts = $this->parseFilename($file);
            if ($parts === null) continue;

            $dateStr = $parts['timestamp']; // YYYYMMDDHHMMSS
            $dt = DateTime::createFromFormat('YmdHis', $dateStr);
            if (!$dt) continue;

            $full = $this->issueDir . DIRECTORY_SEPARATOR . $file;
            if (!is_file($full)) continue;

            $sizeBytes = (int) @filesize($full);
            $hrSize = $this->humanReadableFileSize(max(0, $sizeBytes));

            $data[] = [
                'filename'  => $file,
                'repo'      => $parts['repo'],
                'type'      => $parts['type'],
                'ID'        => $parts['id'],
                'sortfield' => $dt->format('YmdHis'),
                'date'      => $dt->format('l d F Y, H:i'),
                'size'      => $hrSize,
                'actions'   => '',
            ];
        }

        $this->sendResponse($data);
    }

    // GET: launch support log generator securely and report result
    public function getGenerateLog(): void
    {
        $script = ALLSKY_HOME . '/support.sh';
        if (!is_file($script) || !is_executable($script)) {
            $this->send500("Support script unavailable.");
        }

        $cmd = ['/bin/bash', $script, '--auto'];
        $descriptors = [
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ];

        $env = [
            'ALLSKY_HOME' => ALLSKY_HOME,
            'SUDO_OK'     => 'true',
        ];

        $proc = proc_open($cmd, $descriptors, $pipes, null, $env);
        if (!is_resource($proc)) {
            $this->send500("Unable to start support script.");
        }

        $stdout = stream_get_contents($pipes[1]);
        $stderr = stream_get_contents($pipes[2]);
        foreach ($pipes as $p) { if (is_resource($p)) fclose($p); }

        $status = proc_close($proc);
        if ($status === 0) {
            $this->sendResponse(['ok' => true, 'output' => trim($stdout)]);
        } else {
            error_log("support.sh failed: code={$status}, stderr=" . trim($stderr));
            $this->send500("Support generation failed.");
        }
    }
}

$supportUtil = new SUPPORTUTIL();
$supportUtil->run();