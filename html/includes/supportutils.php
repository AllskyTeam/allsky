<?php
include_once('functions.php');
initialize_variables();
include_once('authenticate.php');
include_once('utilbase.php');

/**
 * SUPPORTUTIL
 *
 * Provides backend endpoints for managing “support bundles” —
 * diagnostic archives created by the system for debugging or submitting
 * issues to GitHub.  These endpoints are used by the Support tab in the UI.
 *
 * Key routes:
 *   GET  GenerateLog        → runs support.sh to generate a new log bundle
 *   GET  SupportFilesList   → lists existing support bundles
 *   POST DownloadLog        → streams a selected bundle to the browser
 *   POST ChangeGithubId     → renames a bundle with a different repo/ID
 *   POST DeleteLog          → deletes a bundle from disk
 *
 * Security and safety:
 *  - All filesystem access is confined to ALLSKY_SUPPORT_DIR.
 *  - Filenames are sanitized to block directory traversal.
 *  - All responses are JSON unless a file is being downloaded.
 *  - Errors are surfaced to the UI but detailed logs go to error_log().
 */
class SUPPORTUTIL extends UTILBASE {

    /** Map of endpoints to allowed HTTP verbs */
    protected function getRoutes(): array
    {
        return [
            'ChangeGithubId'   => ['post'],
            'DeleteLog'        => ['post'],
            'DownloadLog'      => ['post'],
            'GenerateLog'      => ['get'],
            'SupportFilesList' => ['get'],
        ];
    }

    /** Path to the support directory where log bundles live */
    private string $issueDir;

    /**
     * Constructor: validates that the support directory exists and is readable.
     * If not, fail early rather than handling errors deeper in the call chain.
     */
    public function __construct()
    {
        $this->issueDir = ALLSKY_SUPPORT_DIR;
        if (!is_dir($this->issueDir) || !is_readable($this->issueDir)) {
            $this->send404("Support directory is unavailable.");
        }
    }

    /**
     * Convert a byte count into a human-readable string, e.g. "2.5 MB".
     */
    private function humanReadableFileSize(int $bytes, int $decimals = 2): string
    {
        $sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        $factor = (int) floor((strlen((string) $bytes) - 1) / 3);
        $factor = max(0, min($factor, count($sizes) - 1));
        $fmt = $factor === 0 ? '%d' : "%.{$decimals}f";
        return sprintf($fmt, $bytes / (1024 ** $factor)) . ' ' . $sizes[$factor];
    }

    /**
     * Given a filename, return the full path inside the support directory
     * after sanitizing and verifying it doesn’t escape via "../" traversal.
     * Returns null if invalid.
     */
    private function safePathFromBasename(string $name): ?string
    {
        $name = basename($name);
        if ($name === '' || $name === '.' || $name === '..') return null;

        $full = $this->issueDir . DIRECTORY_SEPARATOR . $name;
        $realBase = realpath($this->issueDir);
        $realFull = realpath($full);

        if ($realBase === false || $realFull === false) return null;

        // Verify the resolved path is still under the base directory
        if (strpos($realFull, $realBase . DIRECTORY_SEPARATOR) !== 0 && $realFull !== $realBase) return null;

        return $realFull;
    }

    /**
     * Parse a support bundle filename into its logical parts.
     * Example: support-allsky-issue-1234-20251102103000.zip
     * Returns an associative array or null if the filename is invalid.
     */
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

        // Split timestamp and extension
        $dot = strrpos($tsExt, '.');
        if ($dot === false) {
            error_log("Missing extension in support file: {$filename}");
            return null;
        }

        $timestamp = substr($tsExt, 0, $dot);
        $ext = substr($tsExt, $dot + 1);

        // Validate naming patterns
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

    /**
     * POST /?request=DownloadLog
     * Streams a selected support bundle to the browser as a download.
     * The request is expected to include logId (basename of the file).
     */
    public function postDownloadLog(): void
    {
        $logId = $_POST['logId'] ?? '';
        $path = $this->safePathFromBasename($logId);
        if ($path === null || !is_readable($path)) {
            $this->send500("File not found or not readable.");
        }

        $fname = basename($path);

        // Send headers for binary download
        header('Content-Description: File Transfer');
        header('Content-Type: application/octet-stream');
        header('Content-Disposition: attachment; filename="' . rawurlencode($fname) . '"');
        header('Content-Transfer-Encoding: binary');
        header('Expires: 0');
        header('Cache-Control: private, must-revalidate');
        header('Pragma: public');
        header('Content-Length: ' . (string) filesize($path));

        // Stream file directly to client
        $ok = @readfile($path);
        if ($ok === false) {
            $this->send500("Unable to read file.");
        }
        exit;
    }

    /**
     * POST /?request=ChangeGithubId
     * Renames a support bundle to reference a new GitHub repo and/or issue ID.
     */
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

        // Validate new repo/ID naming
        if (!preg_match('/^[a-zA-Z0-9_-]+$/', $repo)) {
            $this->send500("Invalid repository name.");
        }
        if (!preg_match('/^(none|\d+)$/', $newId)) {
            $this->send500("Invalid ID.");
        }

        // Construct a new filename safely
        $newType = 'discussion';
        $timestamp = $fileParts['timestamp'];
        $ext = $fileParts['ext'];
        $newBase = "support-{$repo}-{$newType}-{$newId}-{$timestamp}.{$ext}";
        $newPath = $this->safePathFromBasename($newBase);
        if ($newPath === null) {
            $this->send500("Invalid destination name.");
        }

        // Attempt to rename the file; log internal errors if it fails
        if (@rename($path, $newPath) === false) {
            $msg = error_get_last()['message'] ?? 'rename failed';
            error_log("rename failed: {$msg}");
            $this->send500("Rename failed.");
        }

        $this->sendResponse(['ok' => true]);
    }

    /**
     * POST /?request=DeleteLog
     * Permanently deletes a support bundle from disk.
     */
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

    /**
     * GET /?request=SupportFilesList
     * Returns metadata for all valid support bundles in the directory.
     * Each entry includes filename, repo, issue ID, date, size, etc.
     */
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

            // Parse timestamp into a readable date
            $dt = DateTime::createFromFormat('YmdHis', $parts['timestamp']);
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
                'actions'   => '', // populated on the frontend
            ];
        }

        $this->sendResponse($data);
    }

    /**
     * GET /?request=GenerateLog
     * Executes support.sh to produce a new diagnostic bundle, capturing
     * stdout and stderr via runProcess(). Returns the output or error message.
     */
    public function getGenerateLog(): void
    {
        $script = ALLSKY_HOME . '/support.sh';

        // Ensure the generator script exists and is executable
        if (!is_file($script) || !is_executable($script)) {
            $this->send500('Support script unavailable.');
        }

        // Safe argv array (avoids shell injection)
        $argv = ['/bin/bash', $script, '--auto'];

        // Minimal environment for the script to run under
        $env = [
            'ALLSKY_HOME' => ALLSKY_HOME,
            'SUDO_OK'     => 'true',
        ];

        // Run the process through UTILBASE helper
        $result = $this->runProcess($argv);

        if ($result['error']) {
            error_log("support.sh failed: " . trim($result['message']));
            $this->send500('Support generation failed.');
        }

        $this->sendResponse([
            'ok' => true,
            'output' => trim($result['message']),
        ]);
    }
}

// Create and execute the utility
$supportUtil = new SUPPORTUTIL();
$supportUtil->run();