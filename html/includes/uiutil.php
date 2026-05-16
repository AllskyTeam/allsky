<?php
include_once('functions.php');
initialize_variables();
include_once('authenticate.php');
include_once('utilbase.php');

/**
 * UIUTIL
 *
 * Small UI-facing endpoint collection for the dashboard.
 * Renders HTML fragments (progress bars, text) rather than JSON by default.
 *
 * Exposed routes:
 *   GET  AllskyStatus          -> overall system status (preformatted string/HTML)
 *   POST AllskyControl         -> start, stop, or restart the Allsky service
 *   GET  CPULoad               -> CPU load as a bootstrap progress bar
 *   GET  CPUTemp               -> CPU temperature as a progress bar with status colour
 *   GET  DayNightStatus        -> current capture mode and transition times
 *   GET  DirectoryBrowserList  -> one directory level for helper directory browsers
 *   GET  EditorFiles           -> list WebUI editor files by key
 *   GET  EditorFile            -> read a WebUI editor file by key
 *   POST EditorFile            -> save a WebUI editor file by key
 *   GET  ListFileTypeContent   -> reusable image/video listing fragment
 *   GET  MemoryUsed            -> memory usage as a progress bar
 *   GET  ThrottleStatus        -> Raspberry Pi throttle state as a coloured bar
 *   GET  Uptime                -> human-readable uptime string
 *   POST Multiple              -> batch several GETs in one JSON request
 *
 * Notes:
 * - This class flips $jsonResponse to false so `sendHTTPResponse()` returns
 *   text/HTML snippets (good for dropping into the DOM).
 * - All user-visible text is escaped; numbers are clamped where appropriate.
 * - The heavy lifting (load/temp/mem/throttle/uptime) comes from helpers
 *   in functions.php.
 */
class UIUTIL extends UTILBASE {

    private bool $returnValues = false;
    
    /**
     * Return the route allow-list used by UTILBASE.
     *
     * Each key is a request name accepted in the `request` query parameter and
     * each value is the list of HTTP verbs that may call that route.  Keeping
     * the allow-list here prevents unrelated public methods from becoming web
     * endpoints by accident.
     *
     * @return array<string,array<int,string>> Request names mapped to allowed verbs.
     */
    protected function getRoutes(): array
    {
	        return [
	            'AllskyStatus'   => ['get'],
	            'AllskyControl'  => ['post'],
	            'CPULoad'        => ['get'],
	            'CPUTemp'        => ['get'],
	            'DayNightStatus' => ['get'],
	            'BrowseCommandFiles' => ['get'],
	            'DirectoryBrowserList' => ['get'],
	            'EditorFile'     => ['get', 'post'],
	            'EditorFiles'    => ['get'],
	            'ListFileTypeContent' => ['get'],
	            'MemoryUsed'     => ['get'],
	            'Multiple'       => ['post'],
	            'ThrottleStatus' => ['get'],
	            'Uptime'         => ['get'],
        ];
    }

    /**
     * Configure the endpoint to return plain HTML/text fragments by default.
     *
     * Most UIUTIL routes are polled by dashboard widgets that insert the
     * response directly into the DOM.  JSON routes call sendResponse()
     * explicitly when they need structured output.
     */
	    public function __construct()
	    {
	        $this->jsonResponse = false;
	    }

	    /**
	     * Get the WebUI editor file registry path.
	     *
	     * This is the site-specific JSON file that lists the configuration files
	     * the editor is allowed to show.
	     *
	     * @return string Absolute path to config/editor_files.json.
	     */
	    public static function getEditorFilesConfigPath(): string
	    {
	        return rtrim((string)ALLSKY_CONFIG, '/\\') . '/editor_files.json';
	    }

	    /**
	     * Read and prepare the WebUI editor file registry.
	     *
	     * The live file is config/editor_files.json. If that is missing or empty,
	     * the repo default editor_files.json.repo is used instead. Each entry is
	     * normalised so the rest of the editor can work with resolved paths,
	     * permissions, include rules, messages, and schema details.
	     *
	     * @param bool $includeUnavailable Include entries that are missing, invalid,
	     *                                 unreadable, or hidden by includeWhen so
	     *                                 the page can report why they are not
	     *                                 available.
	     *
	     * @return array<string,array<string,mixed>> Normalised file entries keyed
	     *                                          by editor file key, sorted by
	     *                                          their configured order.
	     *
	     * @throws RuntimeException If neither registry file can be read, or if the
	     *                          registry JSON is invalid.
	     */
	    public static function readEditorFilesConfig(bool $includeUnavailable = false): array
	    {
	        $configFile = self::getEditorFilesConfigPath();
	        $raw = @file_get_contents($configFile);
	        if (($raw === false || trim($raw) === '') && defined('ALLSKY_REPO')) {
	            $repoConfigFile = rtrim((string)ALLSKY_REPO, '/\\') . '/editor_files.json.repo';
	            $raw = @file_get_contents($repoConfigFile);
	        }
	        if ($raw === false || trim($raw) === '') {
	            throw new RuntimeException("Unable to read editor file list.");
	        }

	        $config = json_decode($raw, true);
	        if (!is_array($config)) {
	            throw new RuntimeException("Invalid editor file list: " . json_last_error_msg());
	        }

	        $files = [];
	        foreach ($config as $key => $definition) {
	            if (!is_array($definition)) {
	                continue;
	            }

	            $file = self::normaliseEditorFileDefinition((string)$key, $definition);
	            if ($includeUnavailable || ($file['ok'] && self::isEditorFileIncluded($file))) {
	                $files[$file['key']] = $file;
	            }
	        }

	        uasort($files, static function ($a, $b) {
	            return ((int)$a['order']) <=> ((int)$b['order']);
	        });

	        return $files;
	    }

	    /**
	     * Read one editor file and build the payload sent to the browser.
	     *
	     * JSON files are decoded to check they are valid and, when possible,
	     * returned in a stable pretty-printed form for the Advanced editor. The
	     * schema is chosen from the file content first, then from the registry and
	     * schema index. It is only used to build the form UI; it is not a save rule.
	     *
	     * @param string $key Editor file key from the registry.
	     *
	     * @return array<string,mixed> File details, current content, JSON status,
	     *                             and the resolved schema, if there is one.
	     *
	     * @throws RuntimeException If the key is unknown, hidden, invalid, or the
	     *                          resolved file cannot be read.
	     */
	    public static function readEditorFileByKey(string $key): array
	    {
	        $file = self::resolveEditorFileDefinition($key);
	        if (!$file['readable']) {
	            throw new RuntimeException("The selected file is not readable.");
	        }

	        $contents = @file_get_contents($file['path']);
	        if ($contents === false) {
	            throw new RuntimeException("Unable to read the selected file.");
	        }

	        $displayContents = $contents;
	        $validJson = true;
	        $decoded = null;
	        if ($file['validateJson']) {
	            $decoded = json_decode($contents, true);
	            $validJson = json_last_error() === JSON_ERROR_NONE;
	            if ($validJson) {
	                $encoded = json_encode($decoded, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_NUMERIC_CHECK | JSON_PRESERVE_ZERO_FRACTION);
	                if ($encoded !== false) {
	                    $displayContents = $encoded;
	                }
	            }
	        }

	        if ($validJson && is_array($decoded)) {
	            $contentSchemaToUse = self::getEditorSchemaToUseFromContent($decoded);
	            if ($contentSchemaToUse !== '') {
	                $contentSchema = self::findEditorSchemaFile($file['fileName'], $contentSchemaToUse);
	                if ($contentSchema['hasSchema'] || $contentSchema['schemaError'] !== '' || !$file['hasSchema']) {
	                    $file['schemaToUse'] = $contentSchemaToUse;
	                    $file['schemaPath'] = $contentSchema['schemaPath'];
	                    $file['schemaFileName'] = $contentSchema['schemaFileName'];
	                    $file['hasSchema'] = $contentSchema['hasSchema'];
	                    $file['schemaError'] = $contentSchema['schemaError'];
	                }
	            }
	        }
	        $schema = self::readEditorSchemaForFile($file);

	        return [
	            'ok' => true,
	            'key' => $file['key'],
	            'label' => $file['label'],
	            'fileName' => $file['fileName'],
	            'validateJson' => $file['validateJson'],
	            'hasSchema' => $schema['hasSchema'],
	            'schemaFileName' => $schema['schemaFileName'],
	            'schema' => $schema['schema'],
	            'schemaError' => $schema['schemaError'],
	            'content' => $displayContents,
	            'validJson' => $validJson,
	        ];
	    }

	    /**
	     * Save new contents for one editor file.
	     *
	     * The file is looked up in the registry and checked before it is written.
	     * Entries with validateJson enabled must contain valid JSON, but schema
	     * rules are still only for building the form. Remote website files are
	     * uploaded after the local save succeeds.
	     *
	     * @param string $key Editor file key from the registry.
	     * @param string $contents Raw file contents submitted by the browser.
	     *
	     * @return array<string,mixed> Save result used by the editor modal.
	     *
	     * @throws RuntimeException If the key is unknown, unavailable, not writable,
	     *                          contains invalid JSON, or cannot be written.
	     */
	    public static function saveEditorFileByKey(string $key, string $contents): array
	    {
	        $file = self::resolveEditorFileDefinition($key);
	        if (!$file['writable']) {
	            throw new RuntimeException("The selected file is not writable by the web server.");
	        }

	        if ($file['validateJson']) {
	            json_decode($contents, true);
	            if (json_last_error() !== JSON_ERROR_NONE) {
	                throw new RuntimeException("The selected file was not saved because the content is invalid JSON: " . json_last_error_msg());
	            }
	        }

	        $written = @file_put_contents($file['path'], $contents, LOCK_EX);
	        if ($written === false) {
	            $error = error_get_last();
	            $message = is_array($error) && isset($error['message']) ? $error['message'] : 'unknown error';
	            throw new RuntimeException("Unable to save the selected file: " . $message);
	        }

	        if ($file['remote']) {
	            return self::sendEditorFileToRemoteWebsite($file['path']);
	        }

	        return [
	            'ok' => true,
	            'warning' => false,
	            'message' => htmlspecialchars($file['fileName'], ENT_QUOTES, 'UTF-8') . ' saved',
	        ];
	    }

	    /**
	     * Decide whether an editor file should be available on this installation.
	     *
	     * If the registry entry has an includeWhen rule, it is checked against the
	     * current globals, settings, constants, and file entry fields.
	     *
	     * @param array<string,mixed> $file Normalised editor file entry.
	     *
	     * @return bool True when there is no includeWhen rule, or when it matches.
	     */
	    public static function isEditorFileIncluded(array $file): bool
	    {
	        return self::editorConditionMatches($file['includeWhen'] ?? null, $file);
	    }

	    /**
	     * Get the configured status messages for an editor file.
	     *
	     * Registry entries can define messages for contexts such as available,
	     * excluded, and unavailable. Each message can also have its own condition.
	     * Placeholders are expanded and escaped before the message is displayed.
	     *
	     * @param array<string,mixed> $file Normalised editor file entry.
	     * @param string $context Message group to read from the entry.
	     *
	     * @return array<int,array{message:string,severity:string}> Messages ready
	     *                                                        for display.
	     */
	    public static function getEditorFileMessages(array $file, string $context): array
	    {
	        $messages = [];
	        $groups = $file['messages'] ?? [];
	        if (!is_array($groups)) {
	            return $messages;
	        }

	        $definitions = $groups[$context] ?? [];
	        if (!is_array($definitions)) {
	            return $messages;
	        }

	        foreach ($definitions as $definition) {
	            if (!is_array($definition)) {
	                continue;
	            }

	            if (!self::editorConditionMatches($definition['when'] ?? null, $file)) {
	                continue;
	            }

	            $message = self::expandEditorMessage((string)($definition['message'] ?? ''), $file);
	            if ($message === '') {
	                continue;
	            }

	            $severity = (string)($definition['severity'] ?? 'info');
	            if (!in_array($severity, ['success', 'info', 'warning', 'danger', 'message', 'error'], true)) {
	                $severity = 'info';
	            }

	            $messages[] = [
	                'message' => $message,
	                'severity' => $severity,
	            ];
	        }

	        return $messages;
	    }

	    /**
	     * Handle GET request=EditorFiles.
	     *
	     * Returns the files the editor can currently load. Server paths and write
	     * permissions are deliberately left out of the browser response.
	     *
	     * @return void
	     */
	    public function getEditorFiles(): void
	    {
	        self::sendEditorNoStoreHeaders();
	        try {
	            $files = [];
	            foreach (self::readEditorFilesConfig(false) as $file) {
	                $files[] = [
	                    'key' => $file['key'],
	                    'label' => $file['label'],
	                    'fileName' => $file['fileName'],
	                    'validateJson' => $file['validateJson'],
	                    'hasSchema' => $file['hasSchema'],
	                    'schemaFileName' => $file['schemaFileName'],
	                    'schemaError' => $file['schemaError'],
	                ];
	            }

	            $this->sendResponse([
	                'ok' => true,
	                'files' => $files,
	            ]);
	        } catch (RuntimeException $e) {
	            $this->send500($e->getMessage());
	        }
	    }

	    /**
	     * Handle GET request=EditorFile.
	     *
	     * Reads the selected registry file and returns its content plus schema
	     * details for the editor UI. Bad keys and unavailable files are returned
	     * as client errors.
	     *
	     * @return void
	     */
	    public function getEditorFile(): void
	    {
	        self::sendEditorNoStoreHeaders();
	        $key = (string)($_GET['key'] ?? '');
	        try {
	            $this->sendResponse(self::readEditorFileByKey($key));
	        } catch (RuntimeException $e) {
	            $this->send400($e->getMessage());
	        }
	    }

	    /**
	     * Handle POST request=EditorFile.
	     *
	     * Accepts either form fields or a JSON body containing key and content,
	     * then saves the matching registry file. The response uses no-store
	     * headers so the browser does not reuse an old save result.
	     *
	     * @return void
	     */
	    public function postEditorFile(): void
	    {
	        self::sendEditorNoStoreHeaders();
	        $key = $_POST['key'] ?? null;
	        $contents = $_POST['content'] ?? null;

	        if ($key === null || $contents === null) {
	            $input = file_get_contents('php://input');
	            $data = json_decode($input ?: '{}', true);
	            if (is_array($data)) {
	                $key = $data['key'] ?? $key;
	                $contents = $data['content'] ?? $contents;
	            }
	        }

	        if (!is_string($key) || !is_string($contents)) {
	            $this->send400('Invalid editor save request.');
	        }

	        try {
	            $this->sendResponse(self::saveEditorFileByKey($key, $contents));
	        } catch (RuntimeException $e) {
	            $this->send400($e->getMessage());
	        }
	    }

	    /**
	     * Send no-store headers for editor data.
	     *
	     * Editor responses contain live configuration data and save results, so
	     * they should not be stored by the browser or by intermediate caches.
	     *
	     * @return void
	     */
	    private static function sendEditorNoStoreHeaders(): void
	    {
	        header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
	        header('Pragma: no-cache');
	        header('Expires: 0');
	    }

	    /**
	     * Resolve an editor key to a file that can be used.
	     *
	     * The entry must exist in the registry, pass the path checks, be readable,
	     * and match any includeWhen rule before it can be read or saved.
	     *
	     * @param string $key Editor file key from the registry.
	     *
	     * @return array<string,mixed> Normalised file entry.
	     *
	     * @throws RuntimeException If the key is unknown, invalid, or currently
	     *                          unavailable.
	     */
	    private static function resolveEditorFileDefinition(string $key): array
	    {
	        $key = trim($key);
	        $files = self::readEditorFilesConfig(true);
	        if (!isset($files[$key])) {
	            throw new RuntimeException("Unknown editor file key.");
	        }

	        $file = $files[$key];
	        if (!$file['ok']) {
	            throw new RuntimeException($file['error']);
	        }
	        if (!self::isEditorFileIncluded($file)) {
	            throw new RuntimeException("The selected file is not available.");
	        }

	        return $file;
	    }

	    /**
	     * Turn one registry entry into the editor's internal file entry.
	     *
	     * This expands configured constants, checks the public key, keeps editor
	     * files inside ALLSKY_HOME, rejects symlinks and path traversal, and works
	     * out the schema details. Invalid entries are returned with ok=false and
	     * an error message, so the page can explain why the file is unavailable.
	     *
	     * @param string $key Registry key used by the browser to select the file.
	     * @param array<string,mixed> $definition Raw registry entry.
	     *
	     * @return array<string,mixed> Normalised entry with path, permission,
	     *                             inclusion, schema, and error fields.
	     */
	    private static function normaliseEditorFileDefinition(string $key, array $definition): array
	    {
	        $order = filter_var($definition['order'] ?? 1000, FILTER_VALIDATE_INT);
	        if ($order === false) {
	            $order = 1000;
	        }

	        $file = [
	            'key' => $key,
	            'label' => '',
	            'fileName' => '',
	            'path' => '',
	            'remote' => filter_var($definition['remote'] ?? false, FILTER_VALIDATE_BOOLEAN),
	            'validateJson' => !array_key_exists('validateJson', $definition)
	                || filter_var($definition['validateJson'], FILTER_VALIDATE_BOOLEAN),
	            'order' => $order,
	            'schemaPath' => '',
	            'schemaFileName' => '',
	            'schemaToUse' => '',
	            'hasSchema' => false,
	            'schemaError' => '',
	            'exists' => false,
	            'readable' => false,
	            'writable' => false,
	            'ok' => false,
	            'error' => '',
	            'includeWhen' => is_array($definition['includeWhen'] ?? null) ? $definition['includeWhen'] : null,
	            'messages' => is_array($definition['messages'] ?? null) ? $definition['messages'] : [],
	        ];

	        if (!preg_match('/^[A-Za-z0-9_-]+$/', $key)) {
	            $file['error'] = 'Invalid editor file key.';
	            return $file;
	        }

	        $rawPath = (string)($definition['path'] ?? $definition['filename'] ?? '');
	        $path = self::expandEditorFileString($rawPath);
	        $label = self::expandEditorFileString((string)($definition['label'] ?? ''));
	        if ($label === '') {
	            $label = basename($path);
	        }

	        $file['label'] = $label;
	        $file['fileName'] = basename($path);
	        $file['path'] = $path;
	        $file['schemaToUse'] = self::expandEditorFileString((string)(
	            $definition['schemaToUse']
	                ?? $definition['schematouse']
	                ?? $definition['schema_to_use']
	                ?? ''
	        ));

	        if ($path === '' || $path[0] !== '/') {
	            $file['error'] = 'Editor file paths must be absolute.';
	            return $file;
	        }

	        if (preg_match('/[\x00-\x1F\x7F]/', $path) === 1 || strpos($path, '..') !== false) {
	            $file['error'] = 'Invalid editor file path.';
	            return $file;
	        }

	        if (self::pathContainsSymlink($path)) {
	            $file['error'] = 'Editor files cannot be symlinks or inside symlinked directories.';
	            return $file;
	        }

	        $realPath = realpath($path);
	        if ($realPath === false || !is_file($realPath)) {
	            $file['error'] = 'The configured editor file does not exist.';
	            return $file;
	        }

	        $home = realpath((string)ALLSKY_HOME);
	        if ($home === false || !self::isPathWithinDirectory($realPath, $home)) {
	            $file['error'] = 'The configured editor file is outside the Allsky directory.';
	            return $file;
	        }

	        $file['path'] = $realPath;
	        $file['fileName'] = basename($realPath);
	        $file['exists'] = true;
	        $file['readable'] = is_readable($realPath);
	        $file['writable'] = is_writable($realPath);
	        $file['ok'] = $file['readable'];
	        $schema = self::findEditorSchemaFile($file['fileName'], $file['schemaToUse']);
	        $file['schemaPath'] = $schema['schemaPath'];
	        $file['schemaFileName'] = $schema['schemaFileName'];
	        $file['hasSchema'] = $schema['hasSchema'];
	        $file['schemaError'] = $schema['schemaError'];

	        if (!$file['readable']) {
	            $file['error'] = 'The configured editor file is not readable.';
	        }

	        return $file;
	    }

	    /**
	     * Read an optional schema selector from decoded file content.
	     *
	     * Supported keys are schemaToUse, schematouse, schema_to_use, and schema.
	     * The value is treated as a schema name or index key, not as a filesystem
	     * path.
	     *
	     * @param mixed $decoded Decoded JSON value from the editor file.
	     *
	     * @return string Requested schema selector, or an empty string if the file
	     *                does not request one.
	     */
	    private static function getEditorSchemaToUseFromContent($decoded): string
	    {
	        if (!is_array($decoded)) {
	            return '';
	        }

	        foreach (['schemaToUse', 'schematouse', 'schema_to_use', 'schema'] as $key) {
	            if (!array_key_exists($key, $decoded) || !is_string($decoded[$key])) {
	                continue;
	            }

	            $schemaToUse = trim($decoded[$key]);
	            if ($schemaToUse !== '') {
	                return $schemaToUse;
	            }
	        }

	        return '';
	    }

	    /**
	     * Find the schema file used to build the Simple editor.
	     *
	     * Schemas live under config/schema. The lookup checks config/schema/index.json
	     * using either the requested schema name or the edited file name. If an
	     * explicit schema was requested and there is no index mapping, the requested
	     * value is tried directly, with .json added when no extension was given.
	     *
	     * @param string $fileName Name of the edited file.
	     * @param string $schemaToUse Optional schema selector from the registry or
	     *                            file content.
	     *
	     * @return array{schemaPath:string,schemaFileName:string,hasSchema:bool,schemaError:string}
	     *         Resolved schema details. A missing schema is hasSchema=false with
	     *         no error unless a configured mapping points at a bad file.
	     */
	    private static function findEditorSchemaFile(string $fileName, string $schemaToUse = ''): array
	    {
	        $result = [
	            'schemaPath' => '',
	            'schemaFileName' => '',
	            'hasSchema' => false,
	            'schemaError' => '',
	        ];

	        $baseName = pathinfo($fileName, PATHINFO_FILENAME);
	        if ($baseName === '') {
	            return $result;
	        }

	        $configDir = realpath((string)ALLSKY_CONFIG);
	        if ($configDir === false || !is_dir($configDir)) {
	            $result['schemaError'] = 'Unable to locate the configuration directory.';
	            return $result;
	        }

	        $schemaDir = realpath($configDir . DIRECTORY_SEPARATOR . 'schema');
	        if ($schemaDir === false || !is_dir($schemaDir)) {
	            return $result;
	        }

	        $schemaIndex = [];
	        $indexPath = $schemaDir . DIRECTORY_SEPARATOR . 'index.json';
	        if (is_file($indexPath)) {
	            $rawIndex = @file_get_contents($indexPath);
	            if ($rawIndex === false) {
	                $result['schemaError'] = 'Unable to read the editor schema index.';
	                return $result;
	            }
	            if (trim($rawIndex) !== '') {
	                $schemaIndex = json_decode($rawIndex, true);
	                if (json_last_error() !== JSON_ERROR_NONE || !is_array($schemaIndex)) {
	                    $result['schemaError'] = 'Invalid editor schema index: ' . json_last_error_msg();
	                    return $result;
	                }
	            }
	        }

	        $schemaToUse = trim($schemaToUse);
	        $schemaKey = $schemaToUse !== '' ? $schemaToUse : $fileName;
	        $schemaIndexKeys = [$schemaKey];
	        if (pathinfo($schemaKey, PATHINFO_EXTENSION) === '') {
	            $schemaIndexKeys[] = $schemaKey . '.json';
	        }
	        $schemaIndexKeys = array_values(array_unique($schemaIndexKeys));

	        $mappedSchemaName = null;
	        foreach ($schemaIndexKeys as $schemaIndexKey) {
	            if (array_key_exists($schemaIndexKey, $schemaIndex)) {
	                $mappedSchemaName = $schemaIndex[$schemaIndexKey];
	                $schemaKey = $schemaIndexKey;
	                break;
	            }
	        }

	        if ($mappedSchemaName === null) {
	            if ($schemaToUse === '') {
	                return $result;
	            }

	            $directSchemaNames = [$schemaToUse];
	            if (pathinfo($schemaToUse, PATHINFO_EXTENSION) === '') {
	                $directSchemaNames[] = $schemaToUse . '.json';
	            }
	            $directSchemaNames = array_values(array_unique($directSchemaNames));
	            foreach ($directSchemaNames as $directSchemaName) {
	                $directSchema = self::resolveEditorSchemaFile(
	                    $schemaDir,
	                    $directSchemaName,
	                    'reference for ' . $schemaToUse,
	                    false
	                );
	                if ($directSchema['hasSchema'] || $directSchema['schemaError'] !== '') {
	                    return $directSchema;
	                }
	            }

	            return $result;
	        }

	        if (!is_string($mappedSchemaName)) {
	            $result['schemaError'] = 'Invalid editor schema mapping for ' . $schemaKey . '.';
	            return $result;
	        }

	        return self::resolveEditorSchemaFile(
	            $schemaDir,
	            $mappedSchemaName,
	            'mapping for ' . $schemaKey,
	            true
	        );
	    }

	    /**
	     * Resolve and check one schema file reference.
	     *
	     * The schema name must stay under the schema directory. Control characters,
	     * path traversal, missing mapped files, and files outside config/schema are
	     * rejected with a schemaError value.
	     *
	     * @param string $schemaDir Absolute config/schema directory.
	     * @param string $schemaName Schema file name or relative schema path.
	     * @param string $description Plain-English context for error messages.
	     * @param bool $missingIsError Whether a missing schema should set
	     *                             schemaError.
	     *
	     * @return array{schemaPath:string,schemaFileName:string,hasSchema:bool,schemaError:string}
	     *         Resolved schema details.
	     */
	    private static function resolveEditorSchemaFile(string $schemaDir, string $schemaName, string $description, bool $missingIsError): array
	    {
	        $result = [
	            'schemaPath' => '',
	            'schemaFileName' => '',
	            'hasSchema' => false,
	            'schemaError' => '',
	        ];

	        $schemaName = trim($schemaName);
	        if ($schemaName === '' || preg_match('/[\x00-\x1F\x7F]/', $schemaName) === 1 || strpos($schemaName, '..') !== false) {
	            $result['schemaError'] = 'Invalid editor schema ' . $description . '.';
	            return $result;
	        }

	        $candidate = $schemaDir . DIRECTORY_SEPARATOR . $schemaName;
	        $realPath = realpath($candidate);
	        if ($realPath === false || !is_file($realPath)) {
	            if ($missingIsError) {
	                $result['schemaError'] = 'The mapped editor schema file was not found.';
	            }
	            return $result;
	        }

	        if (!self::isPathWithinDirectory($realPath, $schemaDir)) {
	            $result['schemaError'] = 'The editor schema file is outside the schema directory.';
	            return $result;
	        }

	        $result['schemaPath'] = $realPath;
	        $result['schemaFileName'] = basename($realPath);
	        $result['hasSchema'] = is_readable($realPath);
	        if (!$result['hasSchema']) {
	            $result['schemaError'] = 'The editor schema file is not readable.';
	        }
	        return $result;
	    }

	    /**
	     * Read and decode the schema selected for an editor file.
	     *
	     * Missing schemas are fine; the browser will fall back to the raw JSON
	     * editor. Invalid or unreadable schemas return an error message but do not
	     * stop the edited file itself from loading.
	     *
	     * @param array<string,mixed> $file Normalised editor file entry.
	     *
	     * @return array{hasSchema:bool,schemaFileName:string,schema:mixed,schemaError:string}
	     *         Decoded schema and its status.
	     */
	    private static function readEditorSchemaForFile(array $file): array
	    {
	        $schemaPath = (string)($file['schemaPath'] ?? '');
	        $schemaFileName = (string)($file['schemaFileName'] ?? '');
	        $result = [
	            'hasSchema' => false,
	            'schemaFileName' => $schemaFileName,
	            'schema' => null,
	            'schemaError' => (string)($file['schemaError'] ?? ''),
	        ];

	        if ($schemaPath === '' || !is_readable($schemaPath)) {
	            return $result;
	        }

	        $raw = @file_get_contents($schemaPath);
	        if ($raw === false || trim($raw) === '') {
	            $result['schemaError'] = 'Unable to read the editor schema file.';
	            return $result;
	        }

	        $schema = json_decode($raw, true);
	        if (json_last_error() !== JSON_ERROR_NONE || !is_array($schema)) {
	            $result['schemaError'] = 'Invalid editor schema file: ' . json_last_error_msg();
	            return $result;
	        }

	        $result['hasSchema'] = true;
	        $result['schema'] = $schema;
	        $result['schemaError'] = '';
	        return $result;
	    }

	    /**
	     * Expand supported Allsky constants in editor registry strings.
	     *
	     * Placeholders use the ${CONSTANT_NAME} form. Unknown constants are left
	     * unchanged so configuration mistakes stay visible.
	     *
	     * @param string $value Registry value containing optional placeholders.
	     *
	     * @return string Value with known constants replaced.
	     */
	    private static function expandEditorFileString(string $value): string
	    {
	        return preg_replace_callback('/\$\{([A-Z0-9_]+)\}/', static function ($matches) {
	            return defined($matches[1]) ? (string)constant($matches[1]) : $matches[0];
	        }, $value);
	    }

	    /**
	     * Expand placeholders in a configured editor status message.
	     *
	     * Constants are expanded first. File placeholders such as ${label},
	     * ${fileName}, and ${error} are then HTML-escaped because the returned
	     * message is shown in the WebUI status area.
	     *
	     * @param string $value Raw configured message text.
	     * @param array<string,mixed> $file Normalised editor file entry.
	     *
	     * @return string Safe HTML message fragment.
	     */
	    private static function expandEditorMessage(string $value, array $file): string
	    {
	        $value = self::expandEditorFileString($value);
	        $replacements = [];
	        foreach (['key', 'label', 'fileName', 'path', 'error'] as $field) {
	            $replacements['${' . $field . '}'] = htmlspecialchars((string)($file[$field] ?? ''), ENT_QUOTES, 'UTF-8');
	        }

	        return strtr($value, $replacements);
	    }

	    /**
	     * Check an editor registry condition.
	     *
	     * Conditions support all, any, and not groups. Leaf conditions can read
	     * approved globals, settings, constants, or fields on the current file
	     * entry, then compare using equals, notEquals, in, truthy, or a normal
	     * truthiness check.
	     *
	     * @param mixed $condition Condition definition from the registry.
	     * @param array<string,mixed> $file Normalised editor file entry.
	     *
	     * @return bool True when the condition matches the current environment.
	     */
	    private static function editorConditionMatches($condition, array $file): bool
	    {
	        if ($condition === null || $condition === '' || $condition === []) {
	            return true;
	        }
	        if (!is_array($condition)) {
	            return false;
	        }

	        if (isset($condition['all']) && is_array($condition['all'])) {
	            foreach ($condition['all'] as $child) {
	                if (!self::editorConditionMatches($child, $file)) {
	                    return false;
	                }
	            }
	            return true;
	        }

	        if (isset($condition['any']) && is_array($condition['any'])) {
	            foreach ($condition['any'] as $child) {
	                if (self::editorConditionMatches($child, $file)) {
	                    return true;
	                }
	            }
	            return false;
	        }

	        if (isset($condition['not'])) {
	            return !self::editorConditionMatches($condition['not'], $file);
	        }

	        $actual = null;
	        $hasActual = false;

	        if (isset($condition['global'])) {
	            [$hasActual, $actual] = self::getEditorConditionGlobalValue((string)$condition['global']);
	        } else if (isset($condition['setting'])) {
	            global $settings_array;
	            $name = (string)$condition['setting'];
	            $hasActual = is_array($settings_array) && array_key_exists($name, $settings_array);
	            $actual = $hasActual ? $settings_array[$name] : null;
	        } else if (isset($condition['file'])) {
	            $name = (string)$condition['file'];
	            $hasActual = array_key_exists($name, $file);
	            $actual = $hasActual ? $file[$name] : null;
	        } else if (isset($condition['constant'])) {
	            $name = (string)$condition['constant'];
	            $hasActual = defined($name);
	            $actual = $hasActual ? constant($name) : null;
	        }

	        if (!$hasActual) {
	            return false;
	        }

	        if (array_key_exists('equals', $condition)) {
	            return self::editorConditionValuesEqual($actual, $condition['equals']);
	        }
	        if (array_key_exists('notEquals', $condition)) {
	            return !self::editorConditionValuesEqual($actual, $condition['notEquals']);
	        }
	        if (array_key_exists('in', $condition) && is_array($condition['in'])) {
	            foreach ($condition['in'] as $expected) {
	                if (self::editorConditionValuesEqual($actual, $expected)) {
	                    return true;
	                }
	            }
	            return false;
	        }
	        if (array_key_exists('truthy', $condition)) {
	            return self::editorConditionValuesEqual($actual, (bool)$condition['truthy']);
	        }

	        return (bool)$actual;
	    }

	    /**
	     * Read one approved global for an editor condition.
	     *
	     * Registry conditions can only see a small list of website state globals.
	     * That keeps the config useful without exposing arbitrary global variables.
	     *
	     * @param string $name Requested global name.
	     *
	     * @return array{0:bool,1:mixed} Pair of "was found" flag and value.
	     */
	    private static function getEditorConditionGlobalValue(string $name): array
	    {
	        $allowed = ['hasLocalWebsite', 'hasRemoteWebsite', 'useLocalWebsite', 'useRemoteWebsite'];
	        if (!in_array($name, $allowed, true)) {
	            return [false, null];
	        }

	        global $$name;
	        return [isset($$name), $$name ?? null];
	    }

	    /**
	     * Compare two condition values in the way the registry expects.
	     *
	     * Boolean checks accept Allsky string booleans through toBool(). Numeric
	     * expected values use numeric comparison. Everything else is compared as a
	     * string.
	     *
	     * @param mixed $actual Current value from a condition source.
	     * @param mixed $expected Expected value from the registry condition.
	     *
	     * @return bool True when the values match.
	     */
	    private static function editorConditionValuesEqual($actual, $expected): bool
	    {
	        if (is_bool($expected)) {
	            if (is_string($actual)) {
	                return toBool($actual) === $expected;
	            }
	            return (bool)$actual === $expected;
	        }

	        if (is_int($expected)) {
	            return (int)$actual === $expected;
	        }

	        if (is_float($expected)) {
	            return (float)$actual === $expected;
	        }

	        return (string)$actual === (string)$expected;
	    }

	    /**
	     * Check whether a path sits inside a directory.
	     *
	     * Both values should already be absolute, resolved paths. A trailing
	     * separator is added before comparison so /tmp/foo does not match
	     * /tmp/foobar.
	     *
	     * @param string $path Absolute path to check.
	     * @param string $directory Absolute directory that must contain the path.
	     *
	     * @return bool True when the path is inside the directory.
	     */
	    private static function isPathWithinDirectory(string $path, string $directory): bool
	    {
	        $path = rtrim($path, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR;
	        $directory = rtrim($directory, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR;
	        return strpos($path, $directory) === 0;
	    }

	    /**
	     * Check whether a configured path uses a symlink.
	     *
	     * The editor does not follow symlinked files or directories. The later
	     * realpath check proves the final target is safe, but this catches a path
	     * that used a symlink to get there.
	     *
	     * @param string $path Absolute path from the editor registry.
	     *
	     * @return bool True when any segment is a symlink or an unsafe relative
	     *              segment is present.
	     */
	    private static function pathContainsSymlink(string $path): bool
	    {
	        $parts = explode('/', trim(str_replace('\\', '/', $path), '/'));
	        $current = '';
	        foreach ($parts as $part) {
	            if ($part === '' || $part === '.' || $part === '..') {
	                return true;
	            }
	            $current .= '/' . $part;
	            if (@is_link($current)) {
	                return true;
	            }
	        }

	        return false;
	    }

	    /**
	     * Upload a saved remote editor file to the configured remote website.
	     *
	     * The local save has already worked by the time this runs. If the remote
	     * website is disabled or incomplete, the editor gets a warning rather than
	     * a failed save. The upload command is built with escaped arguments, and
	     * command output is only shown when the upload itself fails.
	     *
	     * @param string $file Absolute path to the saved local file.
	     *
	     * @return array<string,mixed> Save/upload result for the editor modal.
	     */
	    private static function sendEditorFileToRemoteWebsite(string $file): array
	    {
	        global $settings_array, $useRemoteWebsite;

	        $fileName = basename($file);
	        if (!$useRemoteWebsite) {
	            return [
	                'ok' => true,
	                'warning' => true,
	                'message' => htmlspecialchars($fileName, ENT_QUOTES, 'UTF-8') . " saved but NOT sent to remote Website since it's not enabled.",
	            ];
	        }

	        $envFile = ALLSKY_ENV;
	        $envRaw = @file_get_contents($envFile);
	        $env = is_string($envRaw) ? json_decode($envRaw, true) : null;
	        if (!is_array($env)) {
	            return [
	                'ok' => true,
	                'warning' => true,
	                'message' => '<strong>' . htmlspecialchars($fileName, ENT_QUOTES, 'UTF-8') . '</strong> saved but NOT sent to remote Website; unable to read env.json.',
	            ];
	        }

	        $remoteHost = getVariableOrDefault($env, 'REMOTEWEBSITE_HOST', null);
	        if ($remoteHost === null) {
	            return [
	                'ok' => true,
	                'warning' => true,
	                'message' => '<strong>' . htmlspecialchars($fileName, ENT_QUOTES, 'UTF-8') . "</strong> saved but NOT sent to remote Website since there isn't one defined.",
	            ];
	        }

	        $remoteName = str_replace('remote_', '', $fileName);
	        $imageDir = getVariableOrDefault($settings_array, 'remotewebsiteimagedir', '');
	        $cmd = 'sudo -u ' . escapeshellarg(ALLSKY_OWNER)
	            . ' ' . escapeshellarg(ALLSKY_SCRIPTS . '/upload.sh')
	            . ' --silent --remote-web'
	            . ' ' . escapeshellarg($file)
	            . ' ' . escapeshellarg($imageDir)
	            . ' ' . escapeshellarg($remoteName)
	            . ' ' . escapeshellarg('remote_file');

	        $output = [];
	        $returnValue = 0;
	        exec($cmd . ' 2>&1', $output, $returnValue);
	        if ($returnValue === 0) {
	            return [
	                'ok' => true,
	                'warning' => false,
	                'message' => '<strong>' . htmlspecialchars($fileName, ENT_QUOTES, 'UTF-8') . '</strong> saved and sent to remote Website as ' . htmlspecialchars($remoteName, ENT_QUOTES, 'UTF-8') . '.',
	            ];
	        }

	        return [
	            'ok' => false,
	            'warning' => false,
	            'message' => '<strong>' . htmlspecialchars($fileName, ENT_QUOTES, 'UTF-8') . '</strong> saved but unable to send to <strong>' . htmlspecialchars((string)$remoteHost, ENT_QUOTES, 'UTF-8') . '</strong><pre>' . htmlspecialchars(implode("\n", $output), ENT_QUOTES, 'UTF-8') . '</pre>',
	        ];
	    }

	    /**
	     * Read a value from the global settings array prepared by initialize_variables().
	     *
	     * Some callers use this for filenames, so spaces can be swapped out when
	     * needed. The fallback value is the existing UI default.
	     *
	     * @param string $name Setting key to read from the Allsky settings array.
	     * @param string $swapSpaces Replacement for spaces; leave empty to keep them.
	     *
	     * @return mixed Configured value, or the historical fallback used by this UI.
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
	     * Check whether a resolved path is at or below a resolved directory.
	     *
	     * This is used by the command file browser to keep navigation inside the
	     * configured root directory.
	     *
	     * @param string $path Resolved path to check.
	     * @param string $directory Resolved directory that must contain the path.
	     *
	     * @return bool True when the path is the directory itself or inside it.
	     */
	    private function isWithinDirectory(string $path, string $directory): bool
	    {
	        return $path === $directory || strpos($path, rtrim($directory, '/') . '/') === 0;
	    }

	    /**
	     * Resolve and check the command browser root directory.
	     *
	     * Blank roots fall back to ALLSKY_MYFILES_DIR, or /home/pi if that constant
	     * is not available. When myFilesOnly is true, the root must stay inside the
	     * configured Allsky myFiles directory.
	     *
	     * @param string $path Requested root directory.
	     * @param bool $myFilesOnly Whether to restrict the root to ALLSKY_MYFILES_DIR.
	     *
	     * @return string Resolved root path without a trailing slash.
	     */
	    private function normaliseBrowserRoot(string $path, bool $myFilesOnly = false): string
	    {
	        $path = trim($path);
	        if ($path === '') {
	            $path = defined('ALLSKY_MYFILES_DIR') ? ALLSKY_MYFILES_DIR : '/home/pi';
	        }

        if ($path[0] !== '/') {
            $this->send400('Enter an absolute root directory path.');
        }

        $realPath = realpath($path);
        if ($realPath === false || !is_dir($realPath)) {
            $this->send400('The root directory does not exist.');
        }

        if (!is_readable($realPath)) {
            $this->send403('The root directory is not readable.');
        }

        if ($myFilesOnly) {
            $myFilesRoot = realpath((string)ALLSKY_MYFILES_DIR);
            if ($myFilesRoot === false || !$this->isWithinDirectory($realPath, $myFilesRoot)) {
                $displayPath = $myFilesRoot !== false ? $myFilesRoot : (string)ALLSKY_MYFILES_DIR;
                $this->send403('Scripts can only be selected from ' . $displayPath . '.');
            }
        }

	        return rtrim($realPath, '/');
	    }

	    /**
	     * Resolve and check the directory currently shown by the command browser.
	     *
	     * The selected directory must exist, be readable, and remain inside the
	     * already-checked root path.
	     *
	     * @param string $path Requested directory path. Blank means the root path.
	     * @param string $rootPath Resolved command browser root directory.
	     *
	     * @return string Resolved directory path.
	     */
	    private function normaliseBrowserDirectory(string $path, string $rootPath): string
	    {
	        $path = trim($path);
	        if ($path === '') {
	            $path = $rootPath;
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

        if (!$this->isWithinDirectory($realPath, $rootPath)) {
            $this->send403('You cannot browse above the configured root directory.');
        }

	        return $realPath;
	    }

	    /**
	     * Get the user account used when checking whether scripts are executable.
	     *
	     * ALLSKY_OWNER is preferred. If it is not set, the current PHP process user
	     * is used as a fallback.
	     *
	     * @return string User name to check, or an empty string when it cannot be found.
	     */
	    private function getExecutableCheckOwner(): string
	    {
	        $owner = defined('ALLSKY_OWNER') ? trim((string)ALLSKY_OWNER) : '';
	        if ($owner !== '') {
	            return $owner;
        }

        $user = @posix_getpwuid((int)@posix_geteuid());
	        return is_array($user) && !empty($user['name']) ? (string)$user['name'] : '';
	    }

	    /**
	     * Look up a local user's UID and group IDs.
	     *
	     * Supplementary groups are read from /etc/group so the executable check
	     * matches the permissions the Allsky owner has on disk.
	     *
	     * @param string $userName Local user name.
	     *
	     * @return array{uid:int,gids:array<int,int>}|null User identity, or null if
	     *                                                 it cannot be resolved.
	     */
	    private function getUserIdentity(string $userName): ?array
	    {
	        if ($userName === '' || !function_exists('posix_getpwnam')) {
	            return null;
	        }

        $user = @posix_getpwnam($userName);
        if (!is_array($user) || !isset($user['uid'], $user['gid'])) {
            return null;
        }

        $groupIds = [(int)$user['gid']];
        $groupLines = @file('/etc/group', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if (is_array($groupLines)) {
            foreach ($groupLines as $line) {
                $parts = explode(':', (string)$line);
                if (count($parts) < 4) {
                    continue;
                }

                $members = array_map('trim', explode(',', $parts[3]));
                if (in_array($userName, $members, true)) {
                    $groupIds[] = (int)$parts[2];
                }
            }
        }

        return [
            'uid' => (int)$user['uid'],
            'gids' => array_values(array_unique($groupIds)),
	        ];
	    }

	    /**
	     * Check one Unix permission bit set for a specific user identity.
	     *
	     * The caller passes the owner, group, and other bits that matter for the
	     * check. The method then chooses the correct bit based on the file owner
	     * and group membership.
	     *
	     * @param string $path File or directory to inspect.
	     * @param array{uid:int,gids:array<int,int>} $identity User identity.
	     * @param int $ownerBit Permission bit to use when the user owns the path.
	     * @param int $groupBit Permission bit to use when the group matches.
	     * @param int $otherBit Permission bit to use otherwise.
	     *
	     * @return bool True when the selected permission bit is set.
	     */
	    private function userHasModeBit(string $path, array $identity, int $ownerBit, int $groupBit, int $otherBit): bool
	    {
	        $stat = @stat($path);
	        if (!is_array($stat) || !isset($stat['mode'], $stat['uid'], $stat['gid'])) {
            return false;
        }

        $mode = (int)$stat['mode'];
        if ((int)$stat['uid'] === $identity['uid']) {
            return ($mode & $ownerBit) !== 0;
        }

        if (in_array((int)$stat['gid'], $identity['gids'], true)) {
            return ($mode & $groupBit) !== 0;
        }

	        return ($mode & $otherBit) !== 0;
	    }

	    /**
	     * Check whether a file can be executed by the Allsky owner.
	     *
	     * The file itself needs an execute bit for that user, and every parent
	     * directory also needs to be searchable by that user.
	     *
	     * @param string $path File path to check.
	     *
	     * @return bool True when the Allsky owner can execute the file.
	     */
	    private function isExecutableByAllskyOwner(string $path): bool
	    {
	        if (!is_file($path)) {
	            return false;
        }

        $identity = $this->getUserIdentity($this->getExecutableCheckOwner());
        if ($identity === null) {
            return false;
        }

        if (!$this->userHasModeBit($path, $identity, 0100, 0010, 0001)) {
            return false;
        }

        $currentPath = dirname($path);
        while ($currentPath !== '' && $currentPath !== '/' && $currentPath !== '.') {
            if (!$this->userHasModeBit($currentPath, $identity, 0100, 0010, 0001)) {
                return false;
            }

            $parent = dirname($currentPath);
            if ($parent === $currentPath) {
                break;
            }
            $currentPath = $parent;
        }

	        return true;
	    }

	    /**
	     * Check whether any execute bit is set on a file.
	     *
	     * This is reported separately from the Allsky-owner check so the UI can
	     * tell the difference between "not executable at all" and "executable, but
	     * not by the account Allsky will use".
	     *
	     * @param string $path File path to inspect.
	     *
	     * @return bool True when owner, group, or other execute permission is set.
	     */
	    private function hasAnyExecuteBit(string $path): bool
	    {
	        $stat = @stat($path);
	        if (!is_array($stat) || !isset($stat['mode'])) {
            return false;
        }

	        return (((int)$stat['mode']) & 0111) !== 0;
	    }

	    /**
	     * Handle GET request=BrowseCommandFiles.
	     *
	     * Returns one directory level for the command picker. The browser cannot
	     * escape the configured root, hidden files are skipped, and each file entry
	     * includes the executable status needed by the UI.
	     *
	     * @return void
	     */
	    public function getBrowseCommandFiles(): void
	    {
	        $myFilesOnly = filter_var($_GET['myFilesOnly'] ?? false, FILTER_VALIDATE_BOOLEAN);
	        $rootPath = $this->normaliseBrowserRoot((string)($_GET['root'] ?? ''), $myFilesOnly);
	        $requestedPath = (string)($_GET['path'] ?? '');
	        if ($myFilesOnly && trim($requestedPath) !== '') {
	            $requestedRealPath = realpath($requestedPath);
	            if ($requestedRealPath === false || !$this->isWithinDirectory($requestedRealPath, $rootPath)) {
	                $requestedPath = '';
	            }
	        }
	        $path = $this->normaliseBrowserDirectory($requestedPath, $rootPath);
        $entries = [];

        $parent = dirname($path);
        if ($parent !== $path && $this->isWithinDirectory($parent, $rootPath)) {
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
            if ($item === '.' || $item === '..' || strpos($item, '.') === 0) {
                continue;
            }

            $realPath = realpath($path . '/' . $item);
            if ($realPath === false || !$this->isWithinDirectory($realPath, $rootPath)) {
                continue;
            }

            if (is_dir($realPath)) {
                $directories[] = [
                    'name' => $item,
                    'path' => $realPath,
                    'type' => 'directory',
                ];
            } elseif (is_file($realPath)) {
                $executableByOwner = $this->isExecutableByAllskyOwner($realPath);
                $files[] = [
                    'name' => $item,
                    'path' => $realPath,
                    'type' => 'file',
                    'executable' => $executableByOwner,
                    'executableByOwner' => $executableByOwner,
                    'executableAny' => $this->hasAnyExecuteBit($realPath),
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
            'root' => $rootPath,
            'executableOwner' => $this->getExecutableCheckOwner(),
            'entries' => array_merge($entries, $directories, $files),
        ]);
    }

    /**
     * Return a short remote Website version suffix for the header status block.
     *
     * The local WebUI can manage a separately installed remote Website.  When
     * that Website reports a different Allsky version, this method returns a
     * pre-escaped suffix such as `&nbsp; (version 2026.xx.xx)`.  Matching
     * versions and missing/unreadable config files intentionally return an empty
     * string so the status display remains compact.
     *
     * @return string HTML-safe version suffix, or an empty string when no suffix is needed.
     */
    private function getRemoteWebsiteVersionText(): string
    {
        $configFile = getRemoteWebsiteConfigFile();
        if (!file_exists($configFile)) {
            return '';
        }

        $retMsg = '';
        $config = get_decoded_json_file($configFile, true, '', $retMsg);
        if (!is_array($config)) {
            return '';
        }

        $remoteWebsiteVersion = getVariableOrDefault($config, 'AllskyVersion', null);
        if ($remoteWebsiteVersion === null) {
            return '';
        }
        if ($remoteWebsiteVersion == ALLSKY_VERSION) {
            return '';
        }

        return '&nbsp; (version ' . htmlspecialchars((string)$remoteWebsiteVersion, ENT_QUOTES, 'UTF-8') . ')';
    }
        
    /**
     * Build a bootstrap progress bar with safe output.
     *
     * @param mixed       $x                (unused placeholder maintained for compatibility)
     * @param string      $data             Label shown inside the bar
     * @param float|int   $min              Lower bound for clamping
     * @param float|int   $current          Current numeric value
     * @param float|int   $max              Upper bound for clamping
     * @param float|int   $danger           Threshold for red (>=)
     * @param float|int   $warning          Threshold for yellow (>=)
     * @param string      $status_override  Force bar state ('success'|'warning'|'danger'|...)
     *
     * @return string HTML <div> for a progress-bar-* element
     */
    private function displayProgress($x, $data, $min, $current, $max, $danger, $warning, $status_override): string
    {
        // Choose a state: explicit override wins; otherwise decide from thresholds
        $myStatus = $status_override ?: (
            $current >= $danger ? 'danger' :
            ($current >= $warning ? 'warning' : 'success')
        );

        // Keep values sane and compute width
        $current = max($min, min($current, $max));
        $width = (($current - $min) / ($max - $min)) * 100;

        // Return a single progress bar segment with accessible attributes
        return sprintf(
            "<div class='progress-bar progress-bar-not-animated progress-bar-%s' ".
            "role='progressbar' title='current: %s, min: %s, max: %s' ".
            "aria-valuenow='%s' aria-valuemin='%s' aria-valuemax='%s' ".
            "style='width: %.2f%%;'><span class='nowrap'>%s</span></div>",
            htmlspecialchars($myStatus, ENT_QUOTES, 'UTF-8'),
            $current, $min, $max, $current, $min, $max, $width, $data
        );
    }

    /**
     * Render the overall Allsky system status header fragment.
     *
     * This combines the status HTML produced by functions.php with local and
     * remote Website badges.  The response is sent directly as an HTML fragment
     * because callers insert it into the page.
     */
    public function getAllskyStatus(): void
    {
        global $useLocalWebsite, $useRemoteWebsite, $remoteWebsiteURL;

        $localWebsiteBadgeClass = $useLocalWebsite ? 'label-success' : 'label-default';
        $localWebsiteBadgeText = $useLocalWebsite ? 'Enabled' : 'Disabled';
        $remoteWebsiteBadgeClass = $useRemoteWebsite ? 'label-success' : 'label-default';
        $remoteWebsiteBadgeText = $useRemoteWebsite ? 'Enabled' : 'Disabled';
        $remoteWebsiteVersion = $this->getRemoteWebsiteVersionText();
		// Make sure the "external" icons line up.
		if ($remoteWebsiteVersion !== "") $remoteWebsiteVersion = " $remoteWebsiteVersion";
        $localWebsiteLink = $useLocalWebsite
            ? "<a external='true' target='_blank' rel='noopener noreferrer' href='allsky/index.php'>View</a>"
            : "";
        $remoteWebsiteLink = $useRemoteWebsite
            ? "<a external='true' target='_blank' rel='noopener noreferrer' href='{$remoteWebsiteURL}'>View{$remoteWebsiteVersion}</a>"
            : "";
        $websiteHtml = "<div class='header-status-row'><span class='header-status-row-label'>Local:</span><span class='header-status-row-value'><span class='label {$localWebsiteBadgeClass}'>{$localWebsiteBadgeText}</span> {$localWebsiteLink}</span></div><div class='header-status-row'><span class='header-status-row-label'>Remote:</span><span class='header-status-row-value'><span class='label {$remoteWebsiteBadgeClass}'>{$remoteWebsiteBadgeText}</span> {$remoteWebsiteLink}</span></div>";

        $result = output_allsky_status("", $websiteHtml);
        $this->sendHTTPResponse($result);
    }

    /**
     * Request a start, stop, or restart of the Allsky systemd service.
     *
     * The request body must be JSON with an `action` value of `start`, `stop`,
     * or `restart`.  The command is executed without a shell via runProcess().
     * On success or failure, the method sends a JSON response and exits.
     */
    public function postAllskyControl(): void
    {
        $input = file_get_contents('php://input');
        $data = json_decode($input ?: '{}', true);
        if (!is_array($data)) {
            $this->send500('Invalid request payload.');
        }

        $action = strtolower(trim((string)($data['action'] ?? '')));
        if (!in_array($action, ['start', 'stop', 'restart'], true)) {
            $this->send400('Invalid action.');
        }

        $result = $this->runProcess(['sudo', '-n', '/bin/systemctl', $action, 'allsky']);
        if ($result['error']) {
            $message = trim((string)$result['message']);
            if ($message === '') {
                $message = 'Unable to ' . $action . ' Allsky service.';
            }
            $this->sendResponse([
                'ok' => false,
                'action' => $action,
                'message' => $message,
            ]);
        }

        if ($action === 'stop') {
            update_allsky_status(ALLSKY_STATUS_NOT_RUNNING);
        }

        $this->sendResponse([
            'ok' => true,
            'action' => $action,
            'message' => 'Allsky ' . $action . ' requested.',
        ]);
    }

    /**
     * Return current CPU load as a Bootstrap progress-bar fragment.
     *
     * When called by postMultiple(), the fragment is returned to the caller.
     * When called directly as a route, it is sent immediately as plain HTML.
     *
     * @return string|null HTML progress bar when batching; otherwise no return.
     */
    public function getCPULoad()
    {
        $cpuLoad = (float)getCPULoad(1);
        $bar = $this->displayProgress('', "$cpuLoad%", 0, $cpuLoad, 100, 90, 75, '');

        if ($this->returnValues) {
            return $bar;
        }

        $this->sendHTTPResponse($bar);
    }

    /**
     * Return CPU temperature as a Bootstrap progress-bar fragment.
     *
     * Temperature status colours are supplied by getCPUTemp() in functions.php,
     * so this method only formats the final HTML and handles direct-vs-batch
     * response behaviour.
     *
     * @return string|null HTML progress bar when batching; otherwise no return.
     */
    public function getCPUTemp()
    {
        $data = getCPUTemp(); // ['temperature' => float, 'display_temperature' => '...', 'temperature_status' => 'success|warning|danger']
        $temp = (float)$data['temperature'];
        $bar = $this->displayProgress(
            '',
            $data['display_temperature'],
            0,
            $temp,
            100,
            70,
            60,
            $data['temperature_status']
        );

        if ($this->returnValues) {
            return $bar;
        }

        $this->sendHTTPResponse($bar);
    }

    /**
     * Return memory usage as a Bootstrap progress-bar fragment.
     *
     * The bar uses the same threshold colours as CPU load and can be either
     * returned to the Multiple batch endpoint or sent directly to the browser.
     *
     * @return string|null HTML progress bar when batching; otherwise no return.
     */
    public function getMemoryUsed()
    {
        $used = (float)getMemoryUsed();
        $bar = $this->displayProgress('', "$used%", 0, $used, 100, 90, 75, '');

        if ($this->returnValues) {
            return $bar;
        }

        $this->sendHTTPResponse($bar);
    }

    /**
     * Return Raspberry Pi throttle status as a coloured progress-bar fragment.
     *
     * The status text and severity come from functions.php.  The displayed text
     * is escaped before being placed in the HTML fragment.
     *
     * @return string|null HTML progress bar when batching; otherwise no return.
     */
    public function getThrottleStatus()
    {
        $data = getThrottleStatus(); // e.g. ['throttle' => '...','throttle_status' => 'success|warning|danger']
        $bar = $this->displayProgress(
            '',
            htmlspecialchars($data['throttle'], ENT_QUOTES),
            0,
            100,
            100,
            -1,
            -1,
            $data['throttle_status']
        );

        if ($this->returnValues) {
            return $bar;
        }

        $this->sendHTTPResponse($bar);
    }

    /**
     * Return the system uptime as escaped text.
     *
     * This method mirrors the other small dashboard getters: it returns the text
     * when called by the Multiple endpoint and sends it directly when called as
     * an individual route.
     *
     * @return string|null Escaped uptime when batching; otherwise no return.
     */
    public function getUptime()
    {
        $uptime = htmlspecialchars(getUptime(), ENT_QUOTES);

        if ($this->returnValues) {
            return $uptime;
        }

        $this->sendHTTPResponse($uptime);
    }

    /**
     * Render capture mode and upcoming day/night transition information.
     *
     * The current day/night state is combined with capture and save settings to
     * choose a success, warning, or danger label.  The returned HTML includes a
     * dropdown with the day's transition times for use in the header.
     *
     * @return string|null HTML card when batching; otherwise no return.
     */
    public function getDayNightStatus()
    {
        $status = getDayNightStatus();
        $state = $status['state'];
        $display = htmlspecialchars($status['display'], ENT_QUOTES);

        $labelClass = 'label-default';
        if ($state === 'day' || $state === 'night') {
            $captureSetting = $state === 'day' ? 'takedaytimeimages' : 'takenighttimeimages';
            $saveSetting = $state === 'day' ? 'savedaytimeimages' : 'savenighttimeimages';

            $isCapturing = toBool((string)$this->getSetting($captureSetting));
            $isSaving = toBool((string)$this->getSetting($saveSetting));

            if ($isCapturing && $isSaving) {
                $labelClass = 'label-success';
            } else if ($isCapturing && !$isSaving) {
                $labelClass = 'label-warning';
            } else {
                $labelClass = 'label-danger';
            }
        }

        $labelText = ucfirst($state);
        if ($state === 'unknown') {
            $labelText = 'Unknown';
        }

        $nextStateText = htmlspecialchars(ucfirst($status['nextState'] ?? 'unknown'), ENT_QUOTES);
        $transitionDuration = htmlspecialchars($status['transitionDuration'] ?? '--', ENT_QUOTES);
        $nextTransitionTime = htmlspecialchars($status['nextTransitionTime'] ?? '--:--', ENT_QUOTES);
        $dawn = htmlspecialchars($status['dawn'] ?? '--:--', ENT_QUOTES);
        $sunrise = htmlspecialchars($status['sunrise'] ?? '--:--', ENT_QUOTES);
        $midday = htmlspecialchars($status['midday'] ?? '--:--', ENT_QUOTES);
        $sunset = htmlspecialchars($status['sunset'] ?? '--:--', ENT_QUOTES);
        $dusk = htmlspecialchars($status['dusk'] ?? '--:--', ENT_QUOTES);

        $html = sprintf(
            "<div class='header-daynight-card dropdown'><div class='header-status-heading'><span class='header-status-title'>Capture Mode</span><button type='button' class='btn btn-default btn-xs header-daynight-toggle' data-toggle='dropdown' aria-expanded='false'><i class='fa-solid fa-chevron-down'></i></button></div><div class='header-status-row'><span class='header-status-row-label'>Mode:</span><span class='header-status-row-value'><span class='label %s'>%s</span></span></div><div class='header-status-row'><span class='header-status-row-label'>Transition in:</span><span class='header-status-row-value'>%s</span></div><ul class='dropdown-menu dropdown-menu-right header-daynight-menu'><li class='dropdown-header'>Transition Times</li><li><div class='header-daynight-menu-body'><div class='header-daynight-menu-row'><span>Dawn</span><strong>%s</strong></div><div class='header-daynight-menu-row'><span>Sunrise</span><strong>%s</strong></div><div class='header-daynight-menu-row'><span>Midday</span><strong>%s</strong></div><div class='header-daynight-menu-row'><span>Sunset</span><strong>%s</strong></div><div class='header-daynight-menu-row'><span>Dusk</span><strong>%s</strong></div><div class='header-daynight-menu-divider'></div><div class='header-daynight-menu-row'><span>Next Transition</span><strong>%s</strong></div></div></li></ul></div>",
            $labelClass,
            htmlspecialchars($labelText, ENT_QUOTES),
            $transitionDuration,
            $dawn,
            $sunrise,
            $midday,
            $sunset,
            $dusk,
            $nextTransitionTime
        );

        if ($this->returnValues) {
            return $html;
        }

        $this->sendHTTPResponse($html);
    }

    /**
     * Render the reusable image/video listing fragment.
     *
     * Query parameters mirror renderListFileTypeContent(): directory, filename
     * prefix, display name, media type, day, and thumbnail/list options.  This
     * endpoint exists so pages can lazy-load or refresh media grids without
     * duplicating the rendering logic in JavaScript.
     */
    public function getListFileTypeContent(): void
    {
        $dir = (string)($_GET['dir'] ?? '');
        $imageFileName = (string)($_GET['imageFileName'] ?? '');
        $formalImageTypeName = (string)($_GET['formalImageTypeName'] ?? 'Files');
        $type = (string)($_GET['type'] ?? '');
        $chosenDay = (string)($_GET['day'] ?? '');
        $listNames = in_array(strtolower((string)($_GET['listNames'] ?? '0')), ['1', 'true', 'yes'], true);
        $useThumbnails = in_array(strtolower((string)($_GET['useThumbnails'] ?? '1')), ['1', 'true', 'yes'], true);

        if (!in_array($type, ['picture', 'video'], true)) {
            $this->send400('Invalid file type.');
        }

        $html = renderListFileTypeContent($dir, $imageFileName, $formalImageTypeName, $type, $listNames, $chosenDay, [
            'useThumbnails' => $useThumbnails,
        ]);
        $this->sendHTTPResponse($html);
    }

    /**
     * Return one level of child directories for the helper directory browser.
     *
     * The browser passes a configured base folder, a relative path under that
     * base, the currently selected directory, and an optional maximum navigation
     * depth.  This method validates that all resolved paths remain under the
     * allowed images tree before returning JSON.
     */
    public function getDirectoryBrowserList(): void
    {
        $baseFolder = trim((string)($_GET['baseFolder'] ?? ''));
        $relativePath = trim((string)($_GET['path'] ?? ''));
        $currentDirectory = trim((string)($_GET['currentDirectory'] ?? ''));
        $maxDepth = $this->directoryBrowserMaxDepth($_GET['maxDepth'] ?? null);

        if ($baseFolder === '') {
            $this->send400('Base folder is required.');
        }
        if (preg_match('/[\x00-\x1F\x7F]/', $baseFolder . $relativePath . $currentDirectory) === 1) {
            $this->send400('Invalid path.');
        }

        $basePath = $this->resolveDirectoryBrowserBase($baseFolder);
        if ($basePath === null) {
            $this->send400('Invalid base folder.');
        }

        $directory = $this->resolveDirectoryBrowserPath($basePath, $relativePath);
        if ($directory === null) {
            $this->send400('Invalid path.');
        }

        $currentPath = $this->resolveDirectoryBrowserCurrentPath($basePath, $currentDirectory, $maxDepth);

        $this->sendResponse([
            'ok' => true,
            'path' => $this->relativeDirectoryBrowserPath($basePath, $directory),
            'fullPath' => $directory,
            'currentPath' => $currentPath,
            'maxDepth' => $maxDepth,
            'directories' => $this->listDirectoryBrowserDirectories($basePath, $directory, $maxDepth),
        ]);
    }

    /**
     * Resolve and validate the directory browser base folder.
     *
     * The special base value `images` maps to ALLSKY_IMAGES.  Absolute paths are
     * accepted only if they resolve inside ALLSKY_IMAGES, which prevents the UI
     * from being used to browse arbitrary server directories.
     *
     * @param string $baseFolder Configured base folder or the special value `images`.
     *
     * @return string|null Canonical base path, or null when invalid/unavailable.
     */
    private function resolveDirectoryBrowserBase(string $baseFolder): ?string
    {
        $allowedBase = realpath(ALLSKY_IMAGES);
        if ($allowedBase === false || !is_dir($allowedBase)) {
            return null;
        }

        $baseFolder = $baseFolder === 'images' ? ALLSKY_IMAGES : $baseFolder;
        $basePath = realpath($baseFolder);
        if ($basePath === false || !is_dir($basePath)) {
            return null;
        }

        if (!$this->isDirectoryBrowserPathInside($allowedBase, $basePath)) {
            return null;
        }

        return $basePath;
    }

    /**
     * Resolve a browser path under an already validated base path.
     *
     * The client sends paths relative to the base folder.  The resolved directory
     * must exist and remain inside the base after symlinks and `..` segments are
     * resolved by realpath().
     *
     * @param string $basePath Canonical base path returned by resolveDirectoryBrowserBase().
     * @param string $relativePath Relative child path requested by the browser.
     *
     * @return string|null Canonical directory path, or null when invalid.
     */
    private function resolveDirectoryBrowserPath(string $basePath, string $relativePath): ?string
    {
        $relativePath = trim($relativePath, "/\\");
        $candidate = $relativePath === '' ? $basePath : $basePath . DIRECTORY_SEPARATOR . $relativePath;
        $realPath = realpath($candidate);
        if ($realPath === false || !is_dir($realPath)) {
            return null;
        }

        if (!$this->isDirectoryBrowserPathInside($basePath, $realPath)) {
            return null;
        }

        return $realPath;
    }

    /**
     * Normalize the current input value into a relative directory-browser path.
     *
     * Current values may be absolute paths or relative paths.  Values outside
     * the base directory, non-directories, or values deeper than maxDepth are
     * ignored so the client does not preselect an invalid item.
     *
     * @param string $basePath Canonical browser base path.
     * @param string $currentDirectory Current form input value from the browser.
     * @param int|null $maxDepth Optional maximum selectable depth below the base.
     *
     * @return string Relative current path, or an empty string when no valid current path exists.
     */
    private function resolveDirectoryBrowserCurrentPath(string $basePath, string $currentDirectory, ?int $maxDepth): string
    {
        if ($currentDirectory === '') {
            return '';
        }

        $realPath = realpath($currentDirectory);
        if ($realPath === false) {
            $realPath = realpath($basePath . DIRECTORY_SEPARATOR . trim($currentDirectory, "/\\"));
        }

        if ($realPath === false || !is_dir($realPath) || !$this->isDirectoryBrowserPathInside($basePath, $realPath)) {
            return '';
        }

        $relativePath = $this->relativeDirectoryBrowserPath($basePath, $realPath);
        if ($maxDepth !== null && $this->directoryBrowserDepth($relativePath) > $maxDepth) {
            return '';
        }

        return $relativePath === '' ? '' : $relativePath;
    }

    /**
     * List immediate child directories for the directory browser.
     *
     * Hidden dot directories are skipped by readDirectoryBrowserDirectory().
     * Symlinked entries are resolved and only included if they still point under
     * the configured base.  When the requested directory is already at maxDepth,
     * no children are returned.
     *
     * @param string $basePath Canonical browser base path.
     * @param string $directory Canonical directory whose children should be listed.
     * @param int|null $maxDepth Optional maximum navigation depth.
     *
     * @return array<int,array{name:string,path:string,fullPath:string}> Sorted directory rows.
     */
    private function listDirectoryBrowserDirectories(string $basePath, string $directory, ?int $maxDepth): array
    {
        if ($maxDepth !== null && $this->directoryBrowserDepth($this->relativeDirectoryBrowserPath($basePath, $directory)) >= $maxDepth) {
            return [];
        }

        $items = [];
        foreach ($this->readDirectoryBrowserDirectory($directory) as $entry) {
            $path = $directory . DIRECTORY_SEPARATOR . $entry;
            $realPath = realpath($path);
            if ($realPath === false || !is_dir($realPath) || !$this->isDirectoryBrowserPathInside($basePath, $realPath)) {
                continue;
            }

            $items[] = [
                'name' => $entry,
                'path' => $this->relativeDirectoryBrowserPath($basePath, $realPath),
                'fullPath' => $realPath,
            ];
        }

        usort($items, fn($a, $b) => strnatcasecmp($a['name'], $b['name']));
        return $items;
    }

    /**
     * Parse the optional maxDepth query parameter.
     *
     * Empty, missing, or invalid values mean "unlimited".  Valid integers are
     * clamped to zero or greater.
     *
     * @param mixed $value Raw query parameter value.
     *
     * @return int|null Parsed maximum depth, or null for unlimited.
     */
    private function directoryBrowserMaxDepth($value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }

        $depth = filter_var($value, FILTER_VALIDATE_INT);
        if ($depth === false) {
            return null;
        }

        return max(0, $depth);
    }

    /**
     * Read visible entries from a directory.
     *
     * This is a thin wrapper around scandir() that hides `.`/`..` and dotfiles,
     * and returns an empty list if the directory cannot be read.
     *
     * @param string $directory Directory to scan.
     *
     * @return array<int,string> Visible entry names.
     */
    private function readDirectoryBrowserDirectory(string $directory): array
    {
        $entries = scandir($directory);
        if (!is_array($entries)) {
            return [];
        }

        return array_values(array_filter($entries, function ($entry) {
            return $entry !== '.' && $entry !== '..' && strpos($entry, '.') !== 0;
        }));
    }

    /**
     * Determine whether a path resolves inside a base directory.
     *
     * Both paths are normalised with trailing directory separators before the
     * prefix check, so sibling directories with similar names are not accepted.
     *
     * @param string $basePath Canonical base directory.
     * @param string $path Canonical candidate directory.
     *
     * @return bool True when the candidate is inside the base directory.
     */
    private function isDirectoryBrowserPathInside(string $basePath, string $path): bool
    {
        $basePath = rtrim($basePath, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR;
        $path = rtrim($path, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR;

        return strpos($path, $basePath) === 0;
    }

    /**
     * Convert an absolute image directory path into a slash-separated relative path.
     *
     * The caller is responsible for validating that the path is inside the base
     * before calling this helper.
     *
     * @param string $basePath Canonical base directory.
     * @param string $path Canonical path under the base.
     *
     * @return string Relative path suitable for browser requests.
     */
    private function relativeDirectoryBrowserPath(string $basePath, string $path): string
    {
        return ltrim(str_replace('\\', '/', substr($path, strlen(rtrim($basePath, DIRECTORY_SEPARATOR)))), '/');
    }

    /**
     * Count how many directory levels a relative path is below the browser base.
     *
     * The base itself has depth 0, a direct child has depth 1, and so on.
     *
     * @param string $relativePath Slash-separated path relative to the browser base.
     *
     * @return int Relative depth below the base directory.
     */
    private function directoryBrowserDepth(string $relativePath): int
    {
        $relativePath = trim($relativePath, '/');
        if ($relativePath === '') {
            return 0;
        }

        return substr_count($relativePath, '/') + 1;
    }

    /**
     * Batch endpoint: accept a JSON array describing which getters to run,
     * call each one, and return a JSON object of results.
     *
     * Input format (example):
     * [
     *   {"data":"CPULoad"},
     *   {"data":"CPUTemp"},
     *   {"data":"Uptime"}
     * ]
     *
     * Response:
     * {
     *   "CPULoad": "<div class='progress-bar ...'>...</div>",
     *   "CPUTemp": "<div class='progress-bar ...'>...</div>",
     *   "Uptime":  "1 day 02:33:10"
     * }
     *
     * Security/robustness:
     * - Hard size limit (1 MB) on the JSON body
     * - Only methods whitelisted in getRoutes() and actually implemented are called
     * - Method names derived from user input are sanitized to [a-zA-Z0-9_]
     * - Errors in an individual call return an error string for that key; the batch continues
     *
     * The method sends the JSON response directly and exits.
     */
    public function postMultiple(): void
    {
        $input = file_get_contents('php://input');
        if (strlen($input) > 1000000) {
            $this->send500('Request too large.');
        }

        try {
            $data = json_decode($input, true, 10, JSON_THROW_ON_ERROR);
        } catch (Throwable $e) {
            $this->send500('Invalid JSON payload.');
        }

        if (!is_array($data)) {
            $this->send500('Invalid request format.');
        }

        $this->returnValues = true;

        $result = [];

        foreach ($data as $key => $value) {
            if (!isset($value['data'])) continue;

            // Build a safe method name like "getCPULoad"
            $methodName = 'get' . preg_replace('/[^a-zA-Z0-9_]/', '', $value['data']);

            if (method_exists($this, $methodName)) {
                try {
                    // Call the method and capture its return value (if any).
                    // Most getters here directly send output; returned values are included when present.
                    $result[$value['data']] = call_user_func([$this, $methodName]);
                } catch (Throwable $e) {
                    $result[$value['data']] = 'Error: ' . $e->getMessage();
                }
            } else {
                $result[$value['data']] = 'Invalid method.';
            }
        }

        // For the batch endpoint we do respond with JSON
        $this->sendResponse($result);
    }
}

// Script entrypoint
if (basename(__FILE__) === basename($_SERVER['SCRIPT_FILENAME'])) {
    $uiUtil = new UIUTIL();
    $uiUtil->run();
}
