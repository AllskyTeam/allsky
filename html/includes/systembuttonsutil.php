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
            'RunCommand' => ['post'],
            'RunButton' => ['post'],
            'SaveEntries' => ['post'],
            'UpdateWebUiDataFile' => ['post'],
            'ValidateCommand' => ['post'],
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

    private function isWithinConfigDirectory(string $path): bool
    {
        $myFilesDir = rtrim((string)ALLSKY_MYFILES_DIR, '/');
        return $path === $myFilesDir || strpos($path, $myFilesDir . '/') === 0;
    }

    private function getMyFilesDirDisplay(): string
    {
        $realPath = realpath((string)ALLSKY_MYFILES_DIR);
        return $realPath !== false ? $realPath : (string)ALLSKY_MYFILES_DIR;
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
            if (!$this->isWithinConfigDirectory($realPath)) {
                $this->send400('System Page Additions files must be stored in ' . $this->getMyFilesDirDisplay() . '.');
            }
            return $realPath;
        }

        $directory = realpath(dirname($path));
        if ($directory === false) {
            $this->send400('The selected directory does not exist.');
        }

        $normalizedPath = rtrim($directory, '/') . '/' . basename($path);
        if (!$this->isWithinConfigDirectory($normalizedPath)) {
            $this->send400('System Page Additions files must be stored in ' . $this->getMyFilesDirDisplay() . '.');
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
            '%s "%s" is not writable by the WebUI user. System Page Additions files must be stored in %s.',
            ucfirst($targetType),
            $path,
            $this->getMyFilesDirDisplay()
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
                'output' => sprintf('The script "%s" does not say which programme should run it.', $path),
                'code' => 126,
                'suggestions' => [
                    'Ask the script author to add a valid first line, such as #!/usr/bin/env python3 for a Python script.',
                    'After the script is corrected, select it again and try the button once more.',
                ],
            ];
        }

        $interpreterToken = $this->extractCommandToken($interpreterCommand);
        if ($interpreterToken === '') {
            return [
                'ok' => false,
                'output' => sprintf('The first line of "%s" is not in a format Allsky can recognise: %s', $path, $firstLine),
                'code' => 126,
                'suggestions' => [
                    'Ask the script author to check the first line of the file.',
                    'The first line should point to the programme that runs the script, for example #!/usr/bin/env python3.',
                ],
            ];
        }

        if ($interpreterToken === '/usr/bin/env') {
            $envParts = preg_split('/\s+/', $interpreterCommand);
            $targetInterpreter = $envParts[1] ?? '';
            if ($targetInterpreter === '') {
                return [
                    'ok' => false,
                    'output' => sprintf('The script "%s" does not say which programme should run it.', $path),
                    'code' => 126,
                    'suggestions' => [
                        'Ask the script author to update the first line of the script.',
                        'For example, a Python script normally starts with #!/usr/bin/env python3.',
                    ],
                ];
            }

            $resolvedInterpreter = trim((string)@shell_exec('command -v ' . escapeshellarg($targetInterpreter) . ' 2>/dev/null'));
            if ($resolvedInterpreter === '') {
                return [
                    'ok' => false,
                    'output' => sprintf('The script "%s" needs "%s", but that programme is not installed on this Pi.', $path, $targetInterpreter),
                    'code' => 127,
                    'suggestions' => [
                        'Install the required programme, or ask the script author to change the script so it uses one that is already installed.',
                        'After that has been fixed, try the button again.',
                    ],
                ];
            }

            return null;
        }

        if ($interpreterToken[0] === '/' && !file_exists($interpreterToken)) {
            return [
                'ok' => false,
                'output' => sprintf('The script "%s" needs "%s", but Allsky cannot find it on this Pi.', $path, $interpreterToken),
                'code' => 127,
                'suggestions' => [
                    'Install the missing programme, or ask the script author to update the first line of the script.',
                    'The script was not run because it cannot start without that programme.',
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
                'No script has been selected for this button.',
                ['Choose a script from ' . $this->getMyFilesDirDisplay() . ' and save the button again.'],
                127
            );
        }

        if (preg_match('/\s/', $command) === 1) {
            return $this->buildCommandCheckFailure(
                sprintf('The button is trying to run more than one thing: "%s".', $command),
                [
                    'Edit the button and choose one script file only.',
                    'The script must be stored inside ' . $this->getMyFilesDirDisplay() . '.',
                ],
                126
            );
        }

        if (preg_match('/[;&|<>`$()]/', $command) === 1) {
            return $this->buildCommandCheckFailure(
                sprintf('The button command "%s" contains characters Allsky does not allow in a button action.', $command),
                [
                    'Edit the button and select a single script file instead of typing a command.',
                    'If the script needs to do several things, put those steps inside the script itself.',
                ],
                126
            );
        }

        return null;
    }

    private function resolveCommandScriptPath(string $path): array
    {
        $myFilesDir = realpath((string)ALLSKY_MYFILES_DIR);
        if ($myFilesDir === false || !is_dir($myFilesDir)) {
            return $this->buildCommandCheckFailure(
                sprintf('The configured scripts directory "%s" is not a valid directory.', $this->getMyFilesDirDisplay()),
                ['Check the path in variables.json and make sure that folder exists.'],
                126
            );
        }

        if ($path === '' || $path[0] !== '/') {
            return $this->buildCommandCheckFailure(
                sprintf('The selected script "%s" is not a full file path.', $path),
                ['Choose the script again from ' . $myFilesDir . ' so Allsky can save the full path.'],
                126
            );
        }

        $realPath = realpath($path);
        if ($realPath === false) {
            return $this->buildCommandCheckFailure(
                sprintf('Allsky cannot find the selected script: "%s".', $path),
                [
                    'The script may have been deleted, renamed, or moved.',
                    'Put the script in ' . $myFilesDir . ' and select it again.',
                ],
                127
            );
        }

        if (!$this->isWithinDirectory($realPath, $myFilesDir)) {
            return $this->buildCommandCheckFailure(
                sprintf('The selected script "%s" is outside the allowed scripts folder.', $path),
                ['Move the script to ' . $myFilesDir . ' and select it from there.'],
                126
            );
        }

        return ['ok' => true, 'path' => $realPath];
    }

    private function isWithinDirectory(string $path, string $directory): bool
    {
        $directory = rtrim($directory, '/');
        return $path === $directory || strpos($path, $directory . '/') === 0;
    }

    private function checkCommandPath(string $path): ?array
    {
        $scriptPathCheck = $this->resolveCommandScriptPath($path);
        if (!($scriptPathCheck['ok'] ?? false)) {
            return $scriptPathCheck;
        }
        $path = (string)$scriptPathCheck['path'];

        if (!file_exists($path)) {
            return $this->buildCommandCheckFailure(
                sprintf('Allsky cannot find the selected script: "%s".', $path),
                [
                    'The script may have been deleted, renamed, or moved.',
                    'Put the script in ' . $this->getMyFilesDirDisplay() . ' and select it again.',
                ],
                127
            );
        }

        if (!is_file($path)) {
            return $this->buildCommandCheckFailure(
                sprintf('The selected path "%s" is a folder, not a script file.', $path),
                [
                    'Edit the button and select a script file inside that folder.',
                ]
            );
        }

        if (!is_readable($path)) {
            return $this->buildCommandCheckFailure(
                sprintf('The selected script "%s" exists, but Allsky cannot read it.', $path),
                [
                    'Check the file permissions for the script.',
                    'Allsky needs permission to read the script before it can run it.',
                ]
            );
        }

        if (!is_executable($path)) {
            return $this->buildCommandCheckFailure(
                sprintf('The selected script "%s" exists, but it is not marked as executable.', $path),
                [
                    'Mark the script as executable, then try the button again.',
                    'If you are not sure how to do this, ask whoever supplied the script to check its permissions.',
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
                    sprintf('The selected script "%s" is executable, but Allsky cannot open one of the folders that contains it.', $path),
                    [
                        'Check the folder permissions for: ' . $currentPath,
                        'Allsky needs permission to open every folder in the script path.',
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
                'output' => 'No script has been selected, or the saved script path could not be read.',
                'suggestions' => ['Choose the script again from ' . $this->getMyFilesDirDisplay() . ' and save the button.'],
            ];
        }

        $pathCheck = $this->checkCommandPath($token);
        if ($pathCheck !== null) {
            return $pathCheck;
        }

        $resolvedToken = realpath($token);
        if ($resolvedToken === false) {
            return [
                'ok' => false,
                'code' => 127,
                'output' => sprintf('Allsky cannot find the selected script: "%s".', $token),
                'suggestions' => ['Move the script to ' . $this->getMyFilesDirDisplay() . ' and select it from there.'],
            ];
        }

        $shebangCheck = $this->inspectShebang($resolvedToken);
        if ($shebangCheck !== null) {
            return $shebangCheck;
        }

        $output = [];
        $returnCode = 0;
        @exec($this->shellQuote($resolvedToken) . ' 2>&1', $output, $returnCode);
        $message = trim(implode("\n", $output));

        return [
            'ok' => ($returnCode === 0 || (defined('ALLSKY_EXIT_PARTIAL_OK') && $returnCode === ALLSKY_EXIT_PARTIAL_OK)),
            'code' => $returnCode,
            'output' => $message,
            'suggestions' => [],
        ];
    }

    private function validateButtonCommandForSave(string $command): array
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
                'output' => 'No script has been selected, or the saved script path could not be read.',
                'suggestions' => ['Choose the script again from ' . $this->getMyFilesDirDisplay() . ' and save the button.'],
            ];
        }

        $pathCheck = $this->checkCommandPath($token);
        if ($pathCheck !== null) {
            return $pathCheck;
        }

        $resolvedToken = realpath($token);
        if ($resolvedToken === false) {
            return [
                'ok' => false,
                'code' => 127,
                'output' => sprintf('Allsky cannot find the selected script: "%s".', $token),
                'suggestions' => ['Move the script to ' . $this->getMyFilesDirDisplay() . ' and select it from there.'],
            ];
        }

        $shebangCheck = $this->inspectShebang($resolvedToken);
        if ($shebangCheck !== null) {
            return $shebangCheck;
        }

        return [
            'ok' => true,
            'code' => 0,
            'output' => '',
            'suggestions' => [],
            'command' => $resolvedToken,
        ];
    }

    private function buildButtonFailureSuggestions(string $command, string $output): array
    {
        $suggestions = [];
        $lowerOutput = strtolower($output);

        if (strpos($lowerOutput, 'not found') !== false) {
            $token = $this->extractCommandToken($command);
            if ($token !== '') {
                $suggestions[] = 'Make sure the selected script still exists at this location: ' . $token;
            }
            $suggestions[] = 'If the script was moved, select it again from ' . $this->getMyFilesDirDisplay() . '.';
        }

        if (strpos($lowerOutput, 'permission denied') !== false) {
            $token = $this->extractCommandToken($command);
            if ($token !== '') {
                $suggestions[] = 'The selected script exists, but Allsky is not allowed to run it. Check that it is marked as executable and that Allsky can access the folder it is stored in.';
            }
        }

        if (strpos($lowerOutput, 'sudo') !== false) {
            $suggestions[] = 'This action appears to need administrator permission. Allsky cannot ask for a password from this popup, so the script must be written so it can run without an interactive password prompt.';
        }

        if (count($suggestions) === 0) {
            $suggestions[] = 'Confirm the script is inside ' . $this->getMyFilesDirDisplay() . ' and has not been renamed or deleted.';
            $suggestions[] = 'Check that the script is marked as executable and that any files it needs are also available to Allsky.';
        }

        return $suggestions;
    }

    private function buildReadableFailureMessage(string $command, string $output, array $suggestions): string
    {
        $messageParts = [
            'Allsky could not run this action.',
            'For safety, buttons can only run executable scripts that are stored inside ' . $this->getMyFilesDirDisplay() . '. The selected script was not run.',
            'Selected script: ' . $command,
        ];

        if (count($suggestions) > 0) {
            $messageParts[] = "What to check next:\n- " . implode("\n- ", $suggestions);
        }

        return implode("\n\n", $messageParts);
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
            $commandToken = $this->extractCommandToken($command);
            $commandPathCheck = $this->resolveCommandScriptPath($commandToken);
            if (!($commandPathCheck['ok'] ?? false)) {
                return null;
            }
            $command = (string)$commandPathCheck['path'];
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
        $settingsFile = ALLSKY_SETTINGS_FILE;
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
            $suggestions = $result['suggestions'] ?? [];
            if (count($suggestions) === 0) {
                $suggestions = $this->buildButtonFailureSuggestions($command, $output);
            }
            $messageParts[] = $this->buildReadableFailureMessage($command, $output, $suggestions);
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
            $suggestions = $result['suggestions'] ?? [];
            if (count($suggestions) === 0) {
                $suggestions = $this->buildButtonFailureSuggestions($command, $output);
            }
            $messageParts[] = $this->buildReadableFailureMessage($command, $output, $suggestions);
        }

        $this->sendResponse([
            'ok' => $result['ok'],
            'title' => $label !== '' ? $label : 'Test Command',
            'message' => implode("\n\n", $messageParts),
            'code' => $result['code'],
        ]);
    }

    public function postValidateCommand(): void
    {
        $raw = file_get_contents('php://input');
        $data = json_decode($raw ?: '{}', true);
        if (!is_array($data)) {
            $this->send400('Invalid request payload.');
        }

        $command = trim((string)($data['command'] ?? ''));
        if ($command === '') {
            $this->send400('Enter a script before saving this button.');
        }

        $result = $this->validateButtonCommandForSave($command);
        if ($result['ok']) {
            $this->sendResponse([
                'ok' => true,
                'command' => $result['command'] ?? $command,
                'message' => 'Script validated.',
            ]);
        }

        $output = trim((string)$result['output']);
        $suggestions = $result['suggestions'] ?? [];
        if (count($suggestions) === 0) {
            $suggestions = $this->buildButtonFailureSuggestions($command, $output);
        }

        $this->sendResponse([
            'ok' => false,
            'message' => $this->buildReadableFailureMessage($command, $output, $suggestions),
        ]);
    }
}

(new SYSTEMBUTTONSUTIL())->run();
