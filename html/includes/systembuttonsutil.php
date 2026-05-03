<?php
declare(strict_types=1);

include_once('utilbase.php');

class SYSTEMBUTTONSUTIL extends UTILBASE
{
    protected function getRoutes(): array
    {
        return [
            'Entries' => ['get'],
            'BrowseFiles' => ['get'],
            'BrowseCommandFiles' => ['get'],
            'RunCommand' => ['post'],
            'RunButton' => ['post'],
            'SaveEntries' => ['post'],
            'UpdateWebUiDataFile' => ['post'],
        ];
    }

    private function getConfiguredFiles(): array
    {
        global $settings_array;

        $raw = trim((string)getVariableOrDefault($settings_array, 'webuidatafiles', ''));
        if ($raw === '') {
            return [];
        }

        $files = array_values(array_filter(array_map('trim', explode(':', $raw)), static function ($file) {
            return $file !== '';
        }));

        return array_values(array_unique($files));
    }

    private function getSettingsFile(): string
    {
        return rtrim(ALLSKY_CONFIG, '/') . '/settings.json';
    }

    private function isWithinConfigDirectory(string $path): bool
    {
        return $path === ALLSKY_MYFILES_DIR || strpos($path, ALLSKY_MYFILES_DIR . '/') === 0;
    }

    private function sanitizeField(string $value): string
    {
        $value = str_replace(["\r", "\n", "\t"], ' ', $value);
        return trim($value);
    }

    private function normalizePath(string $path): string
    {
        $path = trim($path);
        if ($path === '') {
            return '';
        }

        if ($path[0] !== '/') {
            $this->send400('Enter an absolute file path.');
        }

        $realPath = realpath($path);
        if ($realPath !== false) {
            return $realPath;
        }

        $directory = realpath(dirname($path));
        if ($directory === false) {
            $this->send400('The selected directory does not exist.');
        }

        $normalizedPath = rtrim($directory, '/') . '/' . basename($path);
        if (!$this->isWithinConfigDirectory($normalizedPath)) {
            $this->send400('System Page Additions files must be stored in ~/allsky/config/myFiles.');
        }

        return $normalizedPath;
    }

    private function normalizeDirectory(string $path): string
    {
        $path = trim($path);
        if ($path === '') {
            $path = ALLSKY_MYFILES_DIR;
        }

        if ($path[0] !== '/') {
            $this->send400('Enter an absolute directory path.');
        }

        $realPath = realpath($path);
        if ($realPath === false || !is_dir($realPath)) {
            $this->send400('The selected directory does not exist.');
        }

        if (!is_readable($realPath)) {
            $this->send403('The selected directory is not readable.');
        }

        if (!$this->isWithinConfigDirectory($realPath)) {
            $this->send403('You can only browse files in ~/allsky/config/myFiles.');
        }

        return $realPath;
    }

    private function normalizeCommandDirectory(string $path): string
    {
        $path = trim($path);
        if ($path === '') {
            $path = '/home/pi';
        }

        if ($path[0] !== '/') {
            $this->send400('Enter an absolute directory path.');
        }

        $realPath = realpath($path);
        if ($realPath === false || !is_dir($realPath)) {
            $this->send400('The selected directory does not exist.');
        }

        if (!is_readable($realPath)) {
            $this->send403('The selected directory is not readable.');
        }

        return $realPath;
    }

    private function parseEntryLine(string $line): ?array
    {
        $line = trim($line);
        if ($line === '') {
            return null;
        }

        $parts = preg_split('/\t+|\s{2,}/', $line);

        if (!is_array($parts) || count($parts) === 0) {
            return null;
        }

        $type = $parts[0];
        if ($type === 'data' && count($parts) >= 4) {
            return [
                'type' => 'data',
                'timeout' => $parts[1],
                'label' => $parts[2],
                'data' => implode(' ', array_slice($parts, 3)),
            ];
        }

        if ($type === 'progress' && count($parts) >= 9) {
            return [
                'type' => 'progress',
                'timeout' => $parts[1],
                'label' => $parts[2],
                'data' => $parts[3],
                'min' => $parts[4],
                'current' => $parts[5],
                'max' => $parts[6],
                'danger' => $parts[7],
                'warning' => $parts[8],
            ];
        }

        if ($type === 'button' && count($parts) >= 6) {
            return [
                'type' => 'button',
                'message' => $parts[1],
                'command' => $parts[2],
                'color' => $parts[3],
                'icon' => $parts[4],
                'label' => implode(' ', array_slice($parts, 5)),
            ];
        }

        return null;
    }

    private function isEntryLikeLine(string $line): bool
    {
        return preg_match('/^(data|progress|button)(\t|\s|$)/i', trim($line)) === 1;
    }

    private function buildWritableError(string $path, string $targetType): string
    {
        return sprintf(
            '%s "%s" is not writable by the WebUI user. System Page Additions files must be stored in the ~/allsky/config/myFiles folder.',
            ucfirst($targetType),
            $path
        );
    }

    private function readEntriesFile(string $path): array
    {
        $entries = [];
        $nonEntryLines = [];

        if (!file_exists($path)) {
            return [
                'path' => $path,
                'exists' => false,
                'writable' => is_writable(dirname($path)),
                'entries' => [],
                'nonEntryLines' => [],
            ];
        }

        $lines = file($path, FILE_IGNORE_NEW_LINES);
        if (!is_array($lines)) {
            $this->send500('Unable to read System page additions file.');
        }

        foreach ($lines as $line) {
            $parsed = $this->parseEntryLine($line);
            if ($parsed !== null) {
                $entries[] = $parsed;
            } elseif (!$this->isEntryLikeLine((string)$line)) {
                $nonEntryLines[] = rtrim((string)$line, "\r\n");
            }
        }

        return [
            'path' => $path,
            'exists' => true,
            'writable' => is_writable($path),
            'entries' => $entries,
            'nonEntryLines' => $nonEntryLines,
        ];
    }

    private function getButtonEntry(string $path, int $buttonIndex): ?array
    {
        $fileData = $this->readEntriesFile($path);
        $entries = $fileData['entries'] ?? [];
        $currentIndex = -1;

        foreach ($entries as $entry) {
            if (!is_array($entry) || ($entry['type'] ?? '') !== 'button') {
                continue;
            }
            $currentIndex++;
            if ($currentIndex === $buttonIndex) {
                return $entry;
            }
        }

        return null;
    }

    private function extractCommandToken(string $command): string
    {
        if (preg_match('/^\s*(?:"([^"]+)"|\'([^\']+)\'|(\S+))(?:\s|$)/', $command, $matches) !== 1) {
            return '';
        }

        return (string)($matches[1] !== '' ? $matches[1] : ($matches[2] !== '' ? $matches[2] : ($matches[3] ?? '')));
    }

    private function inspectShebang(string $path): ?array
    {
        $handle = @fopen($path, 'r');
        if ($handle === false) {
            return null;
        }

        $firstLine = fgets($handle);
        fclose($handle);

        if (!is_string($firstLine)) {
            return null;
        }

        $firstLine = trim($firstLine);
        if (strpos($firstLine, '#!') !== 0) {
            return null;
        }

        $interpreterCommand = trim(substr($firstLine, 2));
        if ($interpreterCommand === '') {
            return [
                'ok' => false,
                'output' => sprintf('The script "%s" has an empty shebang line.', $path),
                'code' => 126,
                'suggestions' => [
                    $this->buildCommandHelpLine('Show the first line of the script so you can see its shebang:', 'head -n 1 ' . $this->shellQuote($path)),
                    'Add a valid interpreter path to the shebang, for example #!/usr/bin/env python3.',
                ],
            ];
        }

        $interpreterToken = $this->extractCommandToken($interpreterCommand);
        if ($interpreterToken === '') {
            return [
                'ok' => false,
                'output' => sprintf('The script "%s" has a shebang that could not be parsed: %s', $path, $firstLine),
                'code' => 126,
                'suggestions' => [
                    $this->buildCommandHelpLine('Show the first line of the script so you can inspect its shebang:', 'head -n 1 ' . $this->shellQuote($path)),
                    'Check the shebang line and make sure it points to a valid interpreter.',
                ],
            ];
        }

        if ($interpreterToken === '/usr/bin/env') {
            $envParts = preg_split('/\s+/', $interpreterCommand);
            $targetInterpreter = $envParts[1] ?? '';
            if ($targetInterpreter === '') {
                return [
                    'ok' => false,
                    'output' => sprintf('The script "%s" uses /usr/bin/env but does not specify an interpreter.', $path),
                    'code' => 126,
                    'suggestions' => [
                        $this->buildCommandHelpLine('Show the first line of the script so you can inspect its shebang:', 'head -n 1 ' . $this->shellQuote($path)),
                        'Use a shebang such as #!/usr/bin/env python3.',
                    ],
                ];
            }

            $resolvedInterpreter = trim((string)@shell_exec('command -v ' . escapeshellarg($targetInterpreter) . ' 2>/dev/null'));
            if ($resolvedInterpreter === '') {
                return [
                    'ok' => false,
                    'output' => sprintf('The script "%s" references "%s" in its shebang, but that interpreter is not installed.', $path, $targetInterpreter),
                    'code' => 127,
                    'suggestions' => [
                        $this->buildCommandHelpLine('Check whether that interpreter is installed on this system:', 'command -v ' . $this->shellQuote($targetInterpreter)),
                        'Install the required interpreter or update the shebang to point to one that exists on this system.',
                    ],
                ];
            }

            return null;
        }

        if ($interpreterToken[0] === '/' && !file_exists($interpreterToken)) {
            return [
                'ok' => false,
                'output' => sprintf('The script "%s" references missing interpreter "%s" in its shebang.', $path, $interpreterToken),
                'code' => 127,
                'suggestions' => [
                    $this->buildCommandHelpLine('Show the first line of the script so you can inspect its shebang:', 'head -n 1 ' . $this->shellQuote($path)),
                    $this->buildCommandHelpLine('Check whether the interpreter file exists:', 'ls -l ' . $this->shellQuote($interpreterToken)),
                    'Fix the shebang to point to an installed interpreter, or install the missing interpreter.',
                ],
            ];
        }

        return null;
    }

    private function getWebUiUserName(): string
    {
        $user = @posix_getpwuid((int)@posix_geteuid());
        if (is_array($user) && isset($user['name']) && $user['name'] !== '') {
            return (string)$user['name'];
        }

        return 'the WebUI user';
    }

    private function shellQuote(string $value): string
    {
        return escapeshellarg($value);
    }

    private function buildCommandHelpLine(string $text, ?string $command = null): string
    {
        if ($command === null || $command === '') {
            return $text;
        }

        return $text . "\n" . $command;
    }

    private function buildCommandCheckFailure(string $message, array $suggestions, int $code = 126): array
    {
        return [
            'ok' => false,
            'code' => $code,
            'output' => $message,
            'suggestions' => $suggestions,
        ];
    }

    private function validateSingleButtonCommand(string $command): ?array
    {
        $command = trim($command);
        if ($command === '') {
            return $this->buildCommandCheckFailure(
                'The button command is empty.',
                ['Enter a single command or script name, for example ls or my_script.py.'],
                127
            );
        }

        if (preg_match('/\s/', $command) === 1) {
            return $this->buildCommandCheckFailure(
                sprintf('The button command "%s" is not allowed because it includes arguments or multiple parts.', $command),
                [
                    'Button commands must be a single command only.',
                    'Allowed examples: ls, fred.py, fred.sh, fred.php.',
                    'Not allowed: ls /root, cat /etc/passwd, python3 script.py.',
                ],
                126
            );
        }

        if (preg_match('/[;&|<>`$()]/', $command) === 1) {
            return $this->buildCommandCheckFailure(
                sprintf('The button command "%s" is not allowed because it contains shell control characters.', $command),
                [
                    'Button commands must be a single executable name or script path only.',
                    'Remove shell operators such as ; | & < > ` $ ( ).',
                ],
                126
            );
        }

        return null;
    }

    private function checkCommandPath(string $path): ?array
    {
        $webUiUser = $this->getWebUiUserName();

        if (!file_exists($path)) {
            return $this->buildCommandCheckFailure(
                sprintf('The script or command "%s" does not exist.', $path),
                [
                    $this->buildCommandHelpLine('Check whether the file is really present at that exact path:', 'ls -l ' . $this->shellQuote($path)),
                    'Move the script to the expected location or update the command to point to the right file.',
                ],
                127
            );
        }

        if (!is_file($path)) {
            return $this->buildCommandCheckFailure(
                sprintf('The command path "%s" exists but is not a file.', $path),
                [
                    $this->buildCommandHelpLine('Check what exists at that path right now:', 'ls -ld ' . $this->shellQuote($path)),
                    'Point the command to an executable file or script.',
                ]
            );
        }

        if (!is_readable($path)) {
            return $this->buildCommandCheckFailure(
                sprintf('The script "%s" exists but %s cannot read it.', $path, $webUiUser),
                [
                    $this->buildCommandHelpLine('Show the file access details. The permission string should allow the WebUI user to read the file, for example -rw-r--r-- or better:', 'ls -l ' . $this->shellQuote($path)),
                    $this->buildCommandHelpLine('If the file is not readable, give it read access:', 'sudo chmod a+r ' . $this->shellQuote($path)),
                ]
            );
        }

        if (!is_executable($path)) {
            return $this->buildCommandCheckFailure(
                sprintf('The script "%s" exists but is not marked as executable.', $path),
                [
                    $this->buildCommandHelpLine('Show the file access details. Look for an x in the permission string, for example -rwxr-xr-x. If there is no x, the script cannot be run directly:', 'ls -l ' . $this->shellQuote($path)),
                    $this->buildCommandHelpLine('If there is no execute bit, mark the script as executable:', 'sudo chmod +x ' . $this->shellQuote($path)),
                ]
            );
        }

        $currentPath = dirname($path);
        while ($currentPath !== '' && $currentPath !== '/' && $currentPath !== '.') {
            if (!is_dir($currentPath)) {
                break;
            }

            if (!is_executable($currentPath)) {
                return $this->buildCommandCheckFailure(
                    sprintf('The script "%s" is executable, but %s cannot traverse directory "%s".', $path, $webUiUser, $currentPath),
                    [
                        $this->buildCommandHelpLine('Show the directory access details. Directories must have an x in the permission string, for example drwxr-xr-x, or the WebUI cannot enter them:', 'ls -ld ' . $this->shellQuote($currentPath)),
                        $this->buildCommandHelpLine('If the directory is missing execute access, allow the WebUI to enter it:', 'sudo chmod a+rx ' . $this->shellQuote($currentPath)),
                    ]
                );
            }

            $parent = dirname($currentPath);
            if ($parent === $currentPath) {
                break;
            }
            $currentPath = $parent;
        }

        return null;
    }

    private function runButtonCommand(string $command): array
    {
        $formatCheck = $this->validateSingleButtonCommand($command);
        if ($formatCheck !== null) {
            return $formatCheck;
        }

        $token = $this->extractCommandToken($command);
        if ($token === '') {
            return [
                'ok' => false,
                'code' => 127,
                'output' => 'The command is empty or could not be parsed.',
                'suggestions' => ['Enter a full command or script path before testing it.'],
            ];
        }

        if (strpos($token, '/') !== false) {
            $pathCheck = $this->checkCommandPath($token);
            if ($pathCheck !== null) {
                return $pathCheck;
            }

            $shebangCheck = $this->inspectShebang($token);
            if ($shebangCheck !== null) {
                return $shebangCheck;
            }
        }

        $output = [];
        $returnCode = 0;
        @exec($command . ' 2>&1', $output, $returnCode);
        $message = trim(implode("\n", $output));

        return [
            'ok' => ($returnCode === 0 || (defined('ALLSKY_EXIT_PARTIAL_OK') && $returnCode === ALLSKY_EXIT_PARTIAL_OK)),
            'code' => $returnCode,
            'output' => $message,
            'suggestions' => [],
        ];
    }

    private function buildButtonFailureSuggestions(string $command, string $output): array
    {
        $suggestions = [];
        $lowerOutput = strtolower($output);

        if (strpos($lowerOutput, 'not found') !== false) {
            $token = $this->extractCommandToken($command);
            if ($token !== '') {
                $suggestions[] = $this->buildCommandHelpLine('Check that the file named in the command really exists:', 'ls -l ' . $this->shellQuote($token));
            }
            $suggestions[] = 'If this is a script, confirm the interpreter path in the shebang is valid.';
        }

        if (strpos($lowerOutput, 'permission denied') !== false) {
            $token = $this->extractCommandToken($command);
            if ($token !== '') {
                $suggestions[] = $this->buildCommandHelpLine('Show the file access details. Look for an x in the permission string, for example -rwxr-xr-x. If there is no x, the command cannot be run directly:', 'ls -l ' . $this->shellQuote($token));
            }
            $suggestions[] = 'Check that the web server can access every parent directory in the command path.';
        }

        if (strpos($lowerOutput, 'sudo') !== false) {
            $suggestions[] = 'If the command needs sudo, confirm the web server user is allowed to run it non-interactively.';
        }

        if (count($suggestions) === 0) {
            $suggestions[] = $this->buildCommandHelpLine('Try running the exact command manually from a shell:', $command);
            $suggestions[] = 'Check the command path, permissions, and any files the command needs to write.';
        }

        return $suggestions;
    }

    private function sanitizeEntry(array $entry): ?string
    {
        $type = strtolower($this->sanitizeField((string)($entry['type'] ?? '')));

        if ($type === 'data') {
            $timeout = $this->sanitizeField((string)($entry['timeout'] ?? '0'));
            $label = $this->sanitizeField((string)($entry['label'] ?? ''));
            $data = $this->sanitizeField((string)($entry['data'] ?? ''));
            if ($label === '' || $data === '') {
                return null;
            }
            if ($timeout === '') {
                $timeout = '0';
            }
            return implode("\t", ['data', $timeout, $label, $data]);
        }

        if ($type === 'progress') {
            $timeout = $this->sanitizeField((string)($entry['timeout'] ?? '0'));
            $label = $this->sanitizeField((string)($entry['label'] ?? ''));
            $data = $this->sanitizeField((string)($entry['data'] ?? ''));
            $min = $this->sanitizeField((string)($entry['min'] ?? '0'));
            $current = $this->sanitizeField((string)($entry['current'] ?? '0'));
            $max = $this->sanitizeField((string)($entry['max'] ?? '100'));
            $danger = $this->sanitizeField((string)($entry['danger'] ?? '0'));
            $warning = $this->sanitizeField((string)($entry['warning'] ?? '0'));
            if ($label === '' || $data === '') {
                return null;
            }
            if ($timeout === '') {
                $timeout = '0';
            }
            return implode("\t", ['progress', $timeout, $label, $data, $min, $current, $max, $danger, $warning]);
        }

        if ($type === 'button') {
            $message = $this->sanitizeField((string)($entry['message'] ?? '-'));
            $command = $this->sanitizeField((string)($entry['command'] ?? ''));
            $color = strtolower($this->sanitizeField((string)($entry['color'] ?? 'blue')));
            $icon = $this->sanitizeField((string)($entry['icon'] ?? '-'));
            $label = $this->sanitizeField((string)($entry['label'] ?? ''));
            $allowedColors = ['red', 'green', 'blue', 'yellow', 'cyan', 'white', 'black'];
            if ($command === '' || $label === '') {
                return null;
            }
            if ($this->validateSingleButtonCommand($command) !== null) {
                return null;
            }
            if (!in_array($color, $allowedColors, true)) {
                $color = 'blue';
            }
            if ($message === '') {
                $message = '-';
            }
            if ($icon === '') {
                $icon = '-';
            }
            return implode("\t", ['button', $message, $command, $color, $icon, $label]);
        }

        return null;
    }

    public function getEntries(): void
    {
        $result = [];
        $configuredFiles = $this->getConfiguredFiles();
        foreach ($configuredFiles as $file) {
            $result[] = $this->readEntriesFile($this->normalizePath($file));
        }

        $requestedPath = trim((string)($_GET['path'] ?? ''));
        $requestedFile = null;
        if ($requestedPath !== '') {
            $requestedFile = $this->readEntriesFile($this->normalizePath($requestedPath));
        }

        $this->sendResponse([
            'files' => $result,
            'configuredFiles' => $configuredFiles,
            'file' => $requestedFile,
            'configDir' => ALLSKY_MYFILES_DIR,
        ]);
    }

    public function getBrowseFiles(): void
    {
        $path = $this->normalizeDirectory((string)($_GET['path'] ?? ALLSKY_MYFILES_DIR));
        $entries = [];

        $parent = dirname($path);
        if ($parent !== $path && $this->isWithinConfigDirectory($parent)) {
            $entries[] = [
                'name' => '..',
                'path' => $parent,
                'type' => 'directory',
            ];
        }

        $items = @scandir($path);
        if (!is_array($items)) {
            $this->send500('Unable to browse the selected directory.');
        }

        $directories = [];
        $files = [];
        foreach ($items as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }
            if (strpos($item, '.') === 0) {
                continue;
            }

            $itemPath = $path . '/' . $item;
            $realPath = realpath($itemPath);
            if ($realPath === false) {
                continue;
            }

            if (is_dir($realPath)) {
                $directories[] = [
                    'name' => $item,
                    'path' => $realPath,
                    'type' => 'directory',
                ];
            } elseif (is_file($realPath) && strcasecmp(pathinfo($item, PATHINFO_EXTENSION), 'txt') === 0) {
                $files[] = [
                    'name' => $item,
                    'path' => $realPath,
                    'type' => 'file',
                ];
            }
        }

        usort($directories, static function ($a, $b) {
            return strcasecmp($a['name'], $b['name']);
        });
        usort($files, static function ($a, $b) {
            return strcasecmp($a['name'], $b['name']);
        });

        $this->sendResponse([
            'path' => $path,
            'entries' => array_merge($entries, $directories, $files),
            'configDir' => ALLSKY_MYFILES_DIR,
        ]);
    }

    public function getBrowseCommandFiles(): void
    {
        $path = $this->normalizeCommandDirectory((string)($_GET['path'] ?? '/home/pi'));
        $entries = [];

        $parent = dirname($path);
        if ($parent !== $path) {
            $entries[] = [
                'name' => '..',
                'path' => $parent,
                'type' => 'directory',
            ];
        }

        $items = @scandir($path);
        if (!is_array($items)) {
            $this->send500('Unable to browse the selected directory.');
        }

        $directories = [];
        $files = [];
        foreach ($items as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }
            if (strpos($item, '.') === 0) {
                continue;
            }

            $itemPath = $path . '/' . $item;
            $realPath = realpath($itemPath);
            if ($realPath === false) {
                continue;
            }

            if (is_dir($realPath)) {
                $directories[] = [
                    'name' => $item,
                    'path' => $realPath,
                    'type' => 'directory',
                ];
            } elseif (is_file($realPath)) {
                $files[] = [
                    'name' => $item,
                    'path' => $realPath,
                    'type' => 'file',
                ];
            }
        }

        usort($directories, static function ($a, $b) {
            return strcasecmp($a['name'], $b['name']);
        });
        usort($files, static function ($a, $b) {
            return strcasecmp($a['name'], $b['name']);
        });

        $this->sendResponse([
            'path' => $path,
            'entries' => array_merge($entries, $directories, $files),
        ]);
    }

    public function postSaveEntries(): void
    {
        $raw = file_get_contents('php://input');
        $data = json_decode($raw ?: '{}', true);
        if (!is_array($data)) {
            $this->send400('Invalid request payload.');
        }

        $path = trim((string)($data['path'] ?? ''));
        $entries = $data['entries'] ?? null;
        if ($path === '' || !is_array($entries)) {
            $this->send400('Missing file path or entry data.');
        }

        $path = $this->normalizePath($path);

        $fileData = $this->readEntriesFile($path);
        $nonEntryLines = $fileData['nonEntryLines'] ?? [];
        $serializedEntries = [];

        foreach ($entries as $entry) {
            if (!is_array($entry)) {
                continue;
            }
            $line = $this->sanitizeEntry($entry);
            if ($line !== null) {
                $serializedEntries[] = $line;
            }
        }

        $lines = $nonEntryLines;
        if (count($lines) > 0 && trim((string)end($lines)) !== '') {
            $lines[] = '';
        }
        $lines = array_merge($lines, $serializedEntries);
        $content = implode(PHP_EOL, $lines);
        if ($content !== '') {
            $content .= PHP_EOL;
        }

        $directory = dirname($path);
        if (!is_dir($directory) || !is_writable($directory)) {
            $this->send500($this->buildWritableError($directory, 'directory'));
        }
        if (file_exists($path) && !is_writable($path)) {
            $this->send500($this->buildWritableError($path, 'file'));
        }

        $ok = @file_put_contents($path, $content, LOCK_EX);
        if ($ok === false) {
            $this->send500('Unable to save the System page additions file.');
        }

        $this->sendResponse([
            'ok' => true,
            'file' => $this->readEntriesFile($path),
        ]);
    }

    public function postUpdateWebUiDataFile(): void
    {
        $raw = file_get_contents('php://input');
        $data = json_decode($raw ?: '{}', true);
        if (!is_array($data)) {
            $this->send400('Invalid request payload.');
        }

        $path = trim((string)($data['path'] ?? ''));
        if ($path === '') {
            $this->send400('Missing file path.');
        }

        $path = $this->normalizePath($path);
        $settingsFile = $this->getSettingsFile();
        if (!file_exists($settingsFile) || !is_readable($settingsFile)) {
            $this->send500('Unable to read settings.json.');
        }
        if (!is_writable($settingsFile)) {
            $this->send500('Unable to update settings.json.');
        }

        $settings = readSettingsFile();
        if (!is_array($settings)) {
            $this->send500('Unable to load current settings.');
        }

        $settings['webuidatafiles'] = $path;
        $content = json_encode($settings, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        if ($content === false) {
            $this->send500('Unable to encode updated settings.');
        }
        $content .= PHP_EOL;

        $ok = @file_put_contents($settingsFile, $content, LOCK_EX);
        if ($ok === false) {
            $this->send500('Unable to save updated settings.');
        }

        $this->sendResponse([
            'ok' => true,
            'path' => $path,
            'message' => 'webuidatafiles updated.',
        ]);
    }

    public function postRunButton(): void
    {
        $raw = file_get_contents('php://input');
        $data = json_decode($raw ?: '{}', true);
        if (!is_array($data)) {
            $this->send400('Invalid request payload.');
        }

        $path = trim((string)($data['path'] ?? ''));
        $buttonIndex = (int)($data['buttonIndex'] ?? -1);
        if ($path === '' || $buttonIndex < 0) {
            $this->send400('Missing button file path or index.');
        }

        $path = $this->normalizePath($path);
        $button = $this->getButtonEntry($path, $buttonIndex);
        if ($button === null) {
            $this->send404('Unable to find the selected button.');
        }

        $command = trim((string)($button['command'] ?? ''));
        if ($command === '') {
            $this->send400('The selected button does not have a command.');
        }

        $result = $this->runButtonCommand($command);
        $successMessage = trim((string)($button['message'] ?? ''));
        $output = trim((string)$result['output']);
        $messageParts = [];

        if ($result['ok']) {
            if ($successMessage !== '' && $successMessage !== '-') {
                $messageParts[] = $successMessage;
            }
            if ($output !== '') {
                $messageParts[] = $output;
            }
            if (count($messageParts) === 0) {
                $messageParts[] = 'Command completed successfully.';
            }
        } else {
            if ($output !== '') {
                $messageParts[] = $output;
            }
            $messageParts[] = 'Command: ' . $command;
            $messageParts[] = 'Exit code: ' . (string)$result['code'];
            if ($output === '') {
                $messageParts[] = 'The command failed and did not produce any output.';
            }
        $suggestions = $result['suggestions'] ?? [];
        if (count($suggestions) === 0) {
            $suggestions = $this->buildButtonFailureSuggestions($command, $output);
        }
        if (count($suggestions) > 0) {
            $messageParts[] = "Suggested checks:\n- " . implode("\n- ", $suggestions);
        }
        }

        $this->sendResponse([
            'ok' => $result['ok'],
            'title' => trim((string)($button['label'] ?? 'Button Action')),
            'message' => implode("\n\n", $messageParts),
            'code' => $result['code'],
        ]);
    }

    public function postRunCommand(): void
    {
        $raw = file_get_contents('php://input');
        $data = json_decode($raw ?: '{}', true);
        if (!is_array($data)) {
            $this->send400('Invalid request payload.');
        }

        $command = trim((string)($data['command'] ?? ''));
        $label = trim((string)($data['label'] ?? 'Test Command'));
        if ($command === '') {
            $this->send400('Enter a command to test.');
        }

        $result = $this->runButtonCommand($command);
        $output = trim((string)$result['output']);
        $messageParts = [];

        if ($result['ok']) {
            if ($output !== '') {
                $messageParts[] = $output;
            } else {
                $messageParts[] = 'Command completed successfully.';
            }
        } else {
            if ($output !== '') {
                $messageParts[] = $output;
            }
            $messageParts[] = 'Command: ' . $command;
            $messageParts[] = 'Exit code: ' . (string)$result['code'];
            if ($output === '') {
                $messageParts[] = 'The command failed and did not produce any output.';
            }
            $suggestions = $result['suggestions'] ?? [];
            if (count($suggestions) === 0) {
                $suggestions = $this->buildButtonFailureSuggestions($command, $output);
            }
            if (count($suggestions) > 0) {
                $messageParts[] = "Suggested checks:\n- " . implode("\n- ", $suggestions);
            }
        }

        $this->sendResponse([
            'ok' => $result['ok'],
            'title' => $label !== '' ? $label : 'Test Command',
            'message' => implode("\n\n", $messageParts),
            'code' => $result['code'],
        ]);
    }
}

(new SYSTEMBUTTONSUTIL())->run();
