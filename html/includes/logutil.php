<?php
declare(strict_types=1);

include_once('functions.php');
initialize_variables();
include_once('authenticate.php');
include_once('utilbase.php');

class LOGUTIL extends UTILBASE
{
    protected function getRoutes(): array
    {
        return [
            'LogList' => ['get'],
            'LogTail' => ['get'],
        ];
    }

    private array $logs = [];
    private string $configFile;
    private ?string $defaultLogId = null;

    public function __construct()
    {
        $configBase = defined('ALLSKY_CONFIG') ? ALLSKY_CONFIG : (defined('ALLSKY_HOME') ? (ALLSKY_HOME . '/config') : '/home/pi/allsky/config');
        $this->configFile = $configBase . '/monitorable_logs.json';

        $defaults = [
            'logs' => [
                [
                    'id' => 'lighttpd',
                    'description' => 'Lighttpd Error Log',
                    'location' => '/var/log/lighttpd/error.log',
                    'default' => false,
                ],
                [
                    'id' => 'allsky',
                    'description' => 'Allsky Log',
                    'location' => '/var/log/allsky.log',
                    'default' => true,
                ],
                [
                    'id' => 'allskyperiodic',
                    'description' => 'Allsky Periodic Log',
                    'location' => '/var/log/allskyperiodic.log',
                    'default' => false,
                ],
            ],
        ];

        $this->logs = $this->loadLogsFromConfig($defaults);
    }

    private function loadLogsFromConfig(array $fallback): array
    {
        $fallbackLogs = $this->parseLogs($fallback);
        if ($fallbackLogs['logs']) {
            $this->defaultLogId = $fallbackLogs['default'];
        }

        if (!is_file($this->configFile) || !is_readable($this->configFile)) {
            return $fallbackLogs['logs'];
        }

        $raw = @file_get_contents($this->configFile);
        if ($raw === false || trim($raw) === '') {
            return $fallbackLogs['logs'];
        }

        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            return $fallbackLogs['logs'];
        }

        $parsed = $this->parseLogs($decoded);
        if ($parsed['logs']) {
            $this->defaultLogId = $parsed['default'] ?? $this->defaultLogId;
            return $parsed['logs'];
        }

        return $fallbackLogs['logs'];
    }

    private function parseLogs(array $payload): array
    {
        $items = $payload['logs'] ?? null;
        if (!is_array($items)) {
            return ['logs' => [], 'default' => null];
        }

        $logs = [];
        $defaultId = null;
        foreach ($items as $item) {
            if (!is_array($item)) continue;
            $id = isset($item['id']) ? trim((string)$item['id']) : '';
            $label = isset($item['description']) ? trim((string)$item['description']) : '';
            $path = isset($item['location']) ? trim((string)$item['location']) : '';
            $isDefault = isset($item['default']) ? (bool)$item['default'] : false;

            if ($id === '' || $label === '' || $path === '') continue;
            if (!preg_match('/^[A-Za-z][A-Za-z0-9_-]*$/', $id)) continue;
            if ($path[0] !== '/') continue;

            $logs[$id] = [
                'label' => $label,
                'path' => $path,
            ];

            if ($isDefault && $defaultId === null) {
                $defaultId = $id;
            }
        }

        return ['logs' => $logs, 'default' => $defaultId];
    }

    public function getLogList(): void
    {
        $list = [];
        foreach ($this->logs as $id => $info) {
            $list[] = [
                'id' => $id,
                'label' => $info['label'],
                'default' => ($this->defaultLogId !== null && $id === $this->defaultLogId),
            ];
        }
        $this->sendResponse($list);
    }

    public function getLogTail(): void
    {
        $logId = (string)($_GET['logId'] ?? '');
        if (!array_key_exists($logId, $this->logs)) {
            $this->send400('Invalid log ID.');
        }

        $path = $this->logs[$logId]['path'];
        if (!is_file($path) || !is_readable($path)) {
            $this->send404('Log file not found or not readable.');
        }

        $offsetRaw = $_GET['offset'] ?? '';
        $offset = null;
        if ($offsetRaw !== '' && is_numeric($offsetRaw)) {
            $offset = (int)$offsetRaw;
            if ($offset < 0) $offset = 0;
        }

        $maxBytes = (int)($_GET['maxBytes'] ?? 65536);
        if ($maxBytes < 1024) $maxBytes = 1024;
        if ($maxBytes > 262144) $maxBytes = 262144;

        $size = @filesize($path);
        if ($size === false) {
            $this->send500('Unable to read log file size.');
        }

        $reset = false;
        $truncated = false;

        if ($offset === null) {
            $start = max(0, $size - $maxBytes);
            if ($size > $maxBytes) $truncated = true;
        } else {
            if ($offset > $size) {
                $reset = true;
                $offset = 0;
            }
            if (($size - $offset) > $maxBytes) {
                $start = max(0, $size - $maxBytes);
                $truncated = true;
                $reset = true;
            } else {
                $start = $offset;
            }
        }

        $text = '';
        $fh = @fopen($path, 'rb');
        if ($fh === false) {
            $this->send500('Unable to open log file.');
        }
        if ($start > 0) {
            @fseek($fh, $start);
        }
        $text = stream_get_contents($fh);
        fclose($fh);
        if ($text === false) $text = '';

        $this->sendResponse([
            'logId' => $logId,
            'size' => $size,
            'start' => $start,
            'nextOffset' => $size,
            'reset' => $reset,
            'truncated' => $truncated,
            'text' => $text,
        ]);
    }
}

(new LOGUTIL())->run();
