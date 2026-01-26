<?php
declare(strict_types=1);

/**
 * MESSAGEUTIL
 *
 * Purpose
 * -------
 * Provides a small JSON API for the Allsky Web UI "System Messages" dialog.
 *
 * Endpoints (via UTILBASE routing)
 * -------------------------------
 *  - GET ?request=List
 *      Reads ALLSKY_MESSAGES (messages.txt) and returns JSON in DataTables-friendly format:
 *          { "data": [ { id, cmd_txt, level, date, count, message, url }, ... ] }
 *
 *      Notes:
 *      - If the messages file does not exist, returns an empty list (NOT an error).
 *      - The file is tab-delimited.
 *      - Columns are in a fixed order:
 *            id, cmd_txt, level, date, count, message, url
 *        Columns may be missing from the *end* of the line; missing values are treated as ''.
 *      - Empty fields in the middle are preserved (e.g. leading tabs for empty id/cmd_txt).
 *      - ID is NEVER generated here. If the ID field is empty in the file, it stays empty.
 *      - "message" may contain HTML (e.g. <br>, <code>...) and is returned as-is.
 *
 *  - GET ?request=Reset
 *      Deletes the ALLSKY_MESSAGES file using:
 *          sudo rm -f {ALLSKY_MESSAGES}
 *
 *      Notes:
 *      - The file may not exist; Reset should still succeed if removal returns success.
 *      - Uses UTILBASE::sendResponse() for JSON output.
 *
 * Dependencies
 * ------------
 *  - functions.php / initialize_variables(): provides ALLSKY_CONFIG and/or ALLSKY_MESSAGES constants/vars.
 *  - authenticate.php: auth guard for API access (existing project behaviour).
 *  - utilbase.php: routing + sendResponse() utility.
 */

include_once('functions.php');
initialize_variables();        // defines environment variables / constants like ALLSKY_CONFIG / ALLSKY_MESSAGES
include_once('authenticate.php');
include_once('utilbase.php');

class MESSAGEUTIL extends UTILBASE
{
    /**
     * Declares the request routes supported by this utility.
     *
     * UTILBASE uses this mapping to:
     * - match ?request=List or ?request=Reset
     * - map to corresponding public method getList()/getReset()
     * - enforce allowed HTTP methods
     *
     * @return array<string, array{0:string}> Map of request name to allowed HTTP verbs
     */
    protected function getRoutes(): array
    {
        return [
            'List'  => ['get'],
            'Reset' => ['get'],
        ];
    }

    /**
     * Entry point for:
     *   GET includes/messageutil.php?request=List
     *
     * Reads the messages file (if present) and returns a JSON response:
     *   { "data": [ ... ] }
     *
     * Behaviour:
     * - Missing/unreadable file => returns empty array (no error).
     *
     * @return void
     */
    public function getList(): void
    {
        $this->sendResponse($this->buildMessageListPayload());
    }

    /**
     * Entry point for:
     *   GET includes/messageutil.php?request=Reset
     *
     * Deletes the messages file using sudo.
     *
     * Behaviour:
     * - If the file does not exist, rm -f will still succeed.
     * - Returns:
     *     { "success": true }
     *   or:
     *     { "success": false, "error": "..." }
     *
     * @return void
     */
    public function getReset(): void
    {
        if (!defined('ALLSKY_MESSAGES')) {
            $this->sendResponse(['success' => false, 'error' => 'ALLSKY_MESSAGES is not defined']);
            return;
        }

        // As requested: use a sudo rm -f command line.
        // We still escapeshellarg() the path to be safe with spaces/special chars.
        $cmd = "sudo rm -f " . escapeshellarg(ALLSKY_MESSAGES);
        exec($cmd, $output, $code);

        if ($code === 0) {
            $this->sendResponse(['success' => true]);
        } else {
            $this->sendResponse(['success' => false, 'error' => 'Failed to delete messages file']);
        }
    }

    /* ============================================================
     * Internal helpers (private)
     * ============================================================ */

    /**
     * Builds the API payload for the List endpoint.
     *
     * Expected output format for DataTables:
     *   [ "data" => [ row, row, ... ] ]
     *
     * File handling:
     * - If ALLSKY_MESSAGES is defined, use it.
     * - Otherwise fall back to ALLSKY_CONFIG/messages.txt (if your system uses that layout).
     * - Missing/unreadable file returns empty list (no error).
     *
     * @return array{data: array<int, array<string, mixed>>}
     */
    private function buildMessageListPayload(): array
    {
        // Prefer an explicit ALLSKY_MESSAGES constant if available.
        $file = defined('ALLSKY_MESSAGES')
            ? ALLSKY_MESSAGES
            : rtrim((string)ALLSKY_CONFIG, "/\\") . '/messages.txt';

        // Missing/unreadable file is not an error; UI should show "No messages"
        if (!is_file($file) || !is_readable($file)) {
            return ['data' => []];
        }

        // Read as lines without newline characters
        $lines = file($file, FILE_IGNORE_NEW_LINES);
        if ($lines === false) {
            return ['data' => []];
        }

        $data = [];
        foreach ($lines as $line) {
            $line = rtrim((string)$line, "\r\n");
            if ($line === '') {
                continue; // skip empty lines
            }

            $row = $this->parseMessageLine($line);
            if ($row !== null) {
                $data[] = $row;
            }
        }

        return ['data' => $data];
    }

    /**
     * Parses a single tab-delimited message line.
     *
     * Format rules (per your requirements):
     * - Columns are always in the same order:
     *     id, cmd_txt, level, date, count, message, url
     * - Columns may be missing only from the end:
     *     e.g. if "url" is missing, that's fine; treat as ''.
     * - Empty columns in the middle are allowed and should be preserved:
     *     e.g. leading tabs => empty id/cmd_txt but still level/date/count/message exist.
     * - DO NOT auto-generate id. If ID field is empty, keep it empty.
     *
     * Return value:
     * - A normalized associative array used by the JS DataTable
     * - Or null if the line is effectively empty
     *
     * @param string $line A raw message line (tab-delimited)
     * @return array<string, mixed>|null
     */
    private function parseMessageLine(string $line): ?array
    {
        // explode() preserves empty fields between tabs, which we need
        $parts = explode("\t", $line);

        // If the entire line is empty/whitespace, skip it
        $allEmpty = true;
        foreach ($parts as $p) {
            if (trim((string)$p) !== '') {
                $allEmpty = false;
                break;
            }
        }
        if ($allEmpty) {
            return null;
        }

        // Fill from left to right; missing trailing columns become ''
        $parts = array_pad($parts, 7, '');

        // If any extra columns appear for any reason, ignore them
        if (count($parts) > 7) {
            $parts = array_slice($parts, 0, 7);
        }

        // Map into fixed columns
        $id      = trim((string)$parts[0]);   // IMPORTANT: may legitimately be ''
        $cmdTxt  = trim((string)$parts[1]);
        $level   = trim((string)$parts[2]);
        $date    = trim((string)$parts[3]);
        $countS  = trim((string)$parts[4]);
        $message = (string)$parts[5];         // keep HTML intact
        $url     = trim((string)$parts[6]);

        // Convert count to int (non-numeric becomes 0)
        $count = ($countS !== '' && is_numeric($countS)) ? (int)$countS : 0;

        return [
            'id'      => $id,
            'cmd_txt' => $cmdTxt,
            'level'   => $level,
            'date'    => $date,
            'count'   => $count,
            'message' => $message,
            'url'     => $url,
        ];
    }
}

// Only run if this file is the entry point (not when included)
$entry = PHP_SAPI === 'cli'
    ? realpath($_SERVER['argv'][0] ?? '')
    : realpath($_SERVER['SCRIPT_FILENAME'] ?? '');

if ($entry === __FILE__) {
    $messageUtil = new MESSAGEUTIL();
    $messageUtil->run();
}