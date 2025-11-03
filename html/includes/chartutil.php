<?php
declare(strict_types=1);

include_once('functions.php');
initialize_variables();		// sets some variables
include_once('authenticate.php');
include_once('utilbase.php');
include_once('moduleutil.php');

class CHARTUTIL extends UTILBASE
{
    protected function getRoutes(): array
    {
        return [
            'ModuleGraphData' => ['post'],
            'GraphData' => ['post'],
            'AvailableGraphs' => ['get'],
            'SaveCharts' => ['post', 'get'],
            'LoadCustomChart' => ['get'],
            'DeleteCustomChart' => ['post'],
            'SaveCustomChart' => ['post'],
            'VariableSeriesData' => ['post'],
            'AvailableVariables' => ['get']
        ];
    }

    private $moduleUtil;
    private $allskyModules;
    private $userModules;
    private $allskyMyFiles;
    private $myFilesBase;
    private $myFilesData;    
    private $myFiles;
    private $allsky_config;

    public function __construct() {
        $this->allskyModules = ALLSKY_SCRIPTS . '/modules';
        $this->userModules = ALLSKY_MODULE_LOCATION . '/modules';
		$this->allskyMyFiles = ALLSKY_MYFILES_DIR;   
        $this->myFiles = ALLSKY_MYFILES_DIR . '/modules';
		$this->allskyMyFiles = ALLSKY_MYFILES_DIR;        
		$this->myFilesBase = ALLSKY_MYFILES_DIR;
		$this->myFilesData = ALLSKY_MYFILES_DIR . '/modules/moduledata'; 
        $this->allsky_config = ALLSKY_CONFIG;

        $this->moduleUtil = new MODULEUTIL();
    }

    /**
     * Start Chart Code
     */

    /**
     * Database helper: create PDO connection
     *
     * This function reads the database configuration (from getDatabaseConfig()),
     * determines the database type (MySQL or SQLite), and returns an initialized
     * PDO connection ready for queries.
     *
     * @return PDO|bool  Returns a PDO object on success, or false if the SQLite file is missing.
     * @throws RuntimeException If the database type is unsupported.
     */
    private function makePdo(): PDO|bool
    {
        // Retrieve connection details from a helper that loads secure config (e.g. from variables.json or .env)
        $secretData = getDatabaseConfig();

        // --- MySQL connection ---
        if ($secretData['databasetype'] === 'mysql') {
            // Build DSN string for MySQL, including host, port, and database name
            $dsn = sprintf(
                'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
                $secretData['databasehost'],
                (int)($secretData['databaseport'] ?? 3306), // default port 3306
                $secretData['databasedatabase']
            );

            // Create and return a PDO instance with strict error mode and associative fetch mode
            return new PDO($dsn, $secretData['databaseuser'], $secretData['databasepassword'], [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,       // Throw exceptions on SQL errors
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,  // Return rows as associative arrays
            ]);
        }

        // --- SQLite connection ---
        if ($secretData['databasetype'] === 'sqlite') {
            // Ensure the SQLite database file exists before attempting connection
            if (file_exists(ALLSKY_DATABASES)) {
                $dsn = 'sqlite:' . ALLSKY_DATABASES;

                // Create and configure a new PDO instance for SQLite
                $pdo = new PDO($dsn, null, null, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,       // Throw exceptions on errors
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,  // Fetch as associative arrays
                ]);

                // Optional: enable Write-Ahead Logging (WAL) mode for better concurrency
                // $pdo->exec('PRAGMA journal_mode = WAL;');

                return $pdo;
            } else {
                // SQLite database file not found — return false instead of throwing
                return false;
            }
        }

        // If neither MySQL nor SQLite is specified, throw an exception
        throw new RuntimeException('Unsupported datasource type');
    }

    /**
     * Convert a database timestamp (integer or string) into a JavaScript-compatible
     * millisecond epoch value.
     *
     * This helper ensures that timestamps stored in the database — which may be in
     * integer (UNIX seconds) or string (date/time) format — are consistently
     * converted to JavaScript’s expected format (milliseconds since the UNIX epoch).
     *
     * @param int|string $dbTs  The database timestamp.
     *                          - If numeric (e.g., 1739912345), it is assumed to be a UNIX timestamp in seconds.
     *                          - If a string (e.g., "2025-10-19 22:10:00"), it will be parsed using strtotime().
     *
     * @return int  The timestamp converted to milliseconds (e.g., 1739912345000),
     *              or 0 if conversion fails (invalid date).
     */
    private function toMsTimestamp($dbTs): int
    {
        // JavaScript timestamps use milliseconds since epoch, not seconds
        $unit = 1000;

        // If the input is numeric (already a UNIX timestamp in seconds)
        // multiply by 1000 to convert seconds → milliseconds
        if (is_numeric($dbTs)) {
            return (int)$dbTs * $unit;
        }

        // If the input is a string, try converting it to a UNIX timestamp using strtotime()
        $t = strtotime((string)$dbTs);

        // If successful, multiply by 1000 to get milliseconds; otherwise, return 0 for invalid date
        return $t !== false ? $t * $unit : 0;
    }

    /**
     * Fetch a complete time series of values for one or more variables from the specified database table.
     *
     * This method queries the given table for all rows within a timestamp range (if provided),
     * and extracts the requested variables as numeric series suitable for charting.
     *
     * Each returned variable contains an array of timestamped points in the format:
     *     [
     *       'VAR_NAME' => [
     *           ['x' => <ms epoch>, 'y' => <numeric value>],
     *           ...
     *       ],
     *       ...
     *     ]
     *
     * If a variable is defined in the `$tooltips` list, a "custom" field may also be included
     * in each point, containing an optional thumbnail URL for chart tooltips.
     *
     * @param PDO    $pdo        Active PDO connection (MySQL or SQLite)
     * @param string $table      Name of the database table to query
     * @param array  $variables  List of variable column names to fetch (e.g. ['AS_TEMP','AS_HUMIDITY'])
     * @param array  $tooltips   List of variables that should include tooltip image paths
     * @param int    $from       Start timestamp (UNIX seconds) — if false, full history is returned
     * @param int    $to         End timestamp (UNIX seconds)
     *
     * @return array  Associative array of variable → [ [x,y,custom?], ... ] pairs
     *
     * @throws PDOException       On SQL errors (except for missing tables, which return empty array)
     */
    private function fetchSeriesData(PDO $pdo, string $table, array $variables, array $tooltips, int $from, int $to): array
    {
        // If no variables were requested, there is nothing to fetch
        if (!$variables) return [];

        // The column containing timestamps or row identifiers
        $tsCol = 'id';

        try {
            // Build optional WHERE clause for timestamp range filtering
            $extra = "";
            if ($from !== false and $to !== false) {
                $extra = "WHERE timestamp BETWEEN {$from} AND {$to}";
            }

            // Prepare and execute query
            $sql = "SELECT * FROM {$table} {$extra} ORDER BY {$tsCol}";
            $stmt = $pdo->prepare($sql);
            $stmt->execute();

        } catch (PDOException $e) {
            // Gracefully handle missing table errors (e.g., first-run case)
            if ($this->isMissingTable($e, $pdo)) {
                error_log("Missing table '{$table}' on driver " . $pdo->getAttribute(PDO::ATTR_DRIVER_NAME));
                return [];
            }
            // Re-throw all other PDO exceptions
            throw $e;
        }

        $out = [];

        // Iterate over all rows in the result set
        while ($row = $stmt->fetch()) {
            // For each requested variable column
            foreach ($variables as $variable) {
                if (isset($row[$variable])) {

                    // Apply special unit adjustment for exposure time (convert µs → ms)
                    if ($variable == "AS_EXPOSURE_US") {
                        $value = $row[$variable] / 1000;
                    } else {
                        // Format numeric values to 2 decimal places (ensures float consistency)
                        $value = number_format($row[$variable], 2) + 0;
                    }

                    // Convert database timestamp (usually 'id') to JavaScript millisecond epoch
                    $timeStamp = $this->toMsTimestamp($row['id']);

                    // If the variable has tooltip support, optionally attach an image thumbnail
                    if (isset($tooltips[$variable])) {
                        $tooltip = '';

                        // Attempt to build thumbnail path if image info is available in the row
                        if (isset($row['AS_CAMERAIMAGE']) && isset($row['AS_DATE_NAME'])) {
                            $i = $row['AS_CAMERAIMAGE'];
                            $d = $row['AS_DATE_NAME'];
                            $thumb = "/$d/thumbnails/$i";

                            // If a local image file exists, build a public /images URL
                            if (file_exists(ALLSKY_IMAGES . $thumb)) {
                                $tooltip = "/images/$thumb";
                            }
                        }

                        // Append data point with tooltip reference
                        $out[$variable][] = [
                            'x' => $timeStamp,
                            'y' => $value,
                            'custom' => $tooltip
                        ];
                    } else {
                        // Append standard data point (no tooltip)
                        $out[$variable][] = [
                            'x' => $timeStamp,
                            'y' => $value
                        ];
                    }
                }
            }
        }

        // Return full dataset: one array per variable
        return $out;
    }

    /**
     * Fetch the most recent (latest) record for a given set of variables from a database table.
     *
     * This method queries the specified table for the latest row (based on descending order of the
     * timestamp column, usually `id`), and extracts the most recent values for each requested variable.
     *
     * Each variable is returned in the format:
     *     [
     *       'VAR_NAME' => [
     *           'ts_ms' => <timestamp in milliseconds>,
     *           'value' => <numeric or string value>
     *       ],
     *       ...
     *     ]
     *
     * The method gracefully handles missing tables by returning an empty array instead of throwing,
     * allowing front-end dashboards to remain functional even if a module table hasn’t yet been created.
     *
     * @param PDO    $pdo        Active PDO connection (MySQL or SQLite)
     * @param string $table      Name of the database table to query (e.g. 'allsky_temp')
     * @param array  $variables  List of variable column names to retrieve (e.g. ['AS_TEMP','AS_HUMIDITY'])
     *
     * @return array  Associative array where each variable name maps to ['ts_ms' => int, 'value' => float|string]
     *
     * @throws PDOException       On SQL errors (other than missing tables)
     */
    private function fetchLatestValues(PDO $pdo, string $table, array $variables): array
    {
        // If no variables were requested, return an empty array early
        if (!$variables) return [];

        // The column used for ordering (typically the timestamp or primary key)
        $tsCol = 'id';

        // Enforce strict error mode on PDO to ensure exceptions are thrown on SQL errors
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

        try {
            // Build SQL query to get the most recent row (latest timestamp)
            $sql = "SELECT * FROM {$table} ORDER BY {$tsCol} DESC LIMIT 1";
            $stmt = $pdo->prepare($sql);
            $stmt->execute();

        } catch (PDOException $e) {
            // If the table doesn’t exist yet, log the issue but don’t interrupt execution
            if ($this->isMissingTable($e, $pdo)) {
                error_log("Missing table '{$table}' on driver " . $pdo->getAttribute(PDO::ATTR_DRIVER_NAME));
                return [];
            }
            // Re-throw all other SQL errors
            throw $e;
        }

        $out = [];

        // Fetch the single most recent row (or null if none exists)
        $row = $stmt->fetch();

        // Iterate through each requested variable to extract and format its value
        foreach ($variables as $variable) {
            $value = 0;

            if (isset($row[$variable])) {
                $value = $row[$variable];

                // Format numeric values to two decimal places for consistency
                if (is_numeric($value)) {
                    $value = number_format($value, 2) + 0; // Ensure numeric type, not string
                }
            }

            // Convert the timestamp column to JavaScript milliseconds
            $out[$variable] = [
                'ts_ms' => $this->toMsTimestamp($row[$tsCol]),
                'value' => $value
            ];
        }

        // Return all variable values from the latest row, indexed by variable name
        return $out;
    }

    /**
     * Determine whether a PDOException corresponds to a "table not found" error,
     * compatible with both MySQL/MariaDB and SQLite database drivers.
     *
     * This helper is used to safely detect when a query fails because the target table
     * does not exist — a common case during first-run or after database resets.
     *
     * Different database engines report missing-table errors using different SQLSTATE
     * codes or message formats, so this function normalizes detection across drivers.
     *
     * @param PDOException $e    The caught PDOException from a failed SQL query.
     * @param PDO          $pdo  The PDO connection that raised the exception (used to identify driver type).
     *
     * @return bool  True if the exception represents a "table not found" condition, false otherwise.
     *
     */
    private function isMissingTable(PDOException $e, PDO $pdo): bool
    {
        // Identify the database driver in use (e.g., mysql, sqlite)
        $driver = strtolower((string) $pdo->getAttribute(PDO::ATTR_DRIVER_NAME));

        // Extract error code and message text for analysis
        $code = (string) $e->getCode();
        $msg  = strtolower($e->getMessage());

        switch ($driver) {
            case 'mysql':  // Applies to both MySQL and MariaDB under PDO
                // MySQL and MariaDB use SQLSTATE '42S02' for "Base table or view not found"
                // Example message: "SQLSTATE[42S02]: Base table or view not found: 1146 Table 'foo.bar' doesn't exist"
                return $code === '42S02' || strpos($msg, 'base table or view not found') !== false;

            case 'sqlite':
            case 'sqlite2':
            case 'sqlite3':
                // SQLite typically reports missing tables with SQLSTATE 'HY000'
                // Example message: "SQLSTATE[HY000]: General error: 1 no such table: my_table"
                return strpos($msg, 'no such table') !== false;

            default:
                // Fallback for any other unknown drivers
                // Check for generic error phrases that indicate missing tables
                return strpos($msg, 'no such table') !== false
                    || strpos($msg, 'table does not exist') !== false;
        }
    }

    /**
     * Determine whether a given table exists in the connected database.
     *
     * This method performs a database-specific check for table existence,
     * compatible with MySQL, MariaDB, and SQLite (and includes a SQL-standard fallback).
     *
     * It safely executes lightweight metadata queries, returning `true` if the
     * table exists and `false` otherwise — without throwing exceptions.
     *
     * @param PDO    $pdo        Active PDO connection to the target database.
     * @param string $tableName  Name of the table to check for existence.
     *
     * @return bool  True if the table exists, false if it does not exist or on error.
     *
     */
    private function tableExists(PDO $pdo, string $tableName): bool
    {
        try {
            // Detect the database driver currently in use (mysql, sqlite, etc.)
            $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
            $exists = false;

            switch ($driver) {
                case 'sqlite':
                    // === SQLite ===
                    // SQLite keeps a catalog of database objects in the sqlite_master table.
                    // We can check for the existence of a table by querying that system table.
                    $stmt = $pdo->prepare("
                        SELECT name
                        FROM sqlite_master
                        WHERE type = 'table'
                          AND name = :table
                    ");
                    $stmt->execute([':table' => $tableName]);
                    // fetchColumn() returns false if no rows → cast to bool for true/false
                    $exists = (bool)$stmt->fetchColumn();
                    break;

                case 'mysql':
                case 'mariadb':
                    // === MySQL / MariaDB ===
                    // SHOW TABLES LIKE works with pattern matching; returns one row if found
                    $stmt = $pdo->prepare("SHOW TABLES LIKE :table");
                    $stmt->execute([':table' => $tableName]);
                    $exists = (bool)$stmt->fetchColumn();
                    break;

                default:
                    // === Fallback for other SQL engines ===
                    // Query the INFORMATION_SCHEMA metadata tables, used by most SQL databases
                    $stmt = $pdo->prepare("
                        SELECT 1
                        FROM information_schema.tables
                        WHERE table_name = :table
                        LIMIT 1
                    ");
                    $stmt->execute([':table' => $tableName]);
                    $exists = (bool)$stmt->fetchColumn();
            }

            // Return true if at least one row was found, false otherwise
            return $exists;

        } catch (Exception $e) {
            // Catch-all safeguard: any PDO or query failure is logged and treated as "table not found"
            error_log("tableExists() error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Handle AJAX request to locate the "main" chart configuration JSON for a specific module.
     *
     * This method searches for the requested module's chart definition across multiple
     * known chart directories. When it finds a JSON file with `"main": true`, it immediately
     * returns the file’s path and name as a JSON response.
     *
     * ---
     * **Search logic:**
     * 1. Look under `$this->myFilesBase . '/charts'`
     * 2. Then under `$this->allsky_config . '/modules/charts'`
     * 3. Finally under `$this->myFilesData . '/charts'`
     *
     * Each of these directories may contain subdirectories named after modules.
     * The function looks for the one matching the requested module name (`$_POST['module']`),
     * scans its JSON files, and selects the one where `"main": true`.
     *
     * ---
     * **Response format (if found):**
     * ```json
     * {
     *   "path": "/full/path/to/module",
     *   "filename": "chart.json"
     * }
     * ```
     *
     * **Response format (if not found):**
     * ```json
     * {}
     * ```
     *
     * ---
     * **Notes:**
     * - This function is typically triggered via an AJAX POST call.
     * - It sends a JSON response via `$this->sendResponse()` and does not return a value.
     * - It silently skips unreadable or invalid JSON files.
     * - Uses `DirectoryIterator` and `glob()` to efficiently traverse directories.
     * - Declares no explicit return type (should ideally be `void`).
     */
    protected function postModuleGraphData()
    {
        // List of potential chart directories to search (in priority order)
        $chartDirs = [];
        $requestedModule = trim((string)filter_input(INPUT_POST, 'module', FILTER_UNSAFE_RAW));
        $chartDirs[] = $this->myFilesBase . '/charts';
        $chartDirs[] = $this->allsky_config . '/modules/charts';
        $chartDirs[] = $this->myFilesData . '/charts';

        // Iterate over all chart directories
        foreach ($chartDirs as $chartDir) {
            if (is_dir($chartDir)) {
                // Iterate through each subdirectory inside the chart directory
                $dir = new DirectoryIterator($chartDir);
                foreach ($dir as $entry) {
                    // Skip "." and ".." and ignore non-directory entries
                    if ($entry->isDot() || !$entry->isDir()) {
                        continue;
                    }

                    $module     = $entry->getFilename();   // e.g., "allsky_temp"
                    $modulePath = $entry->getPathname();   // Full path to that module directory

                    // Check only the directory that matches the requested module
                    if ($module == $requestedModule) {
                        // Scan all JSON files in this module directory
                        foreach (glob($modulePath . '/*.json') as $jsonFile) {
                            // Read file contents; suppress warnings if unreadable
                            $raw = @file_get_contents($jsonFile);
                            if ($raw === false) {
                                continue;
                            }

                            // Decode JSON content into an associative array
                            $data = json_decode($raw, true);
                            if (!is_array($data)) {
                                continue; // Skip invalid JSON
                            }

                            // If this JSON marks itself as the "main" chart, respond and exit
                            if (isset($data['main']) && $data['main'] == true) {
                                $this->sendResponse(json_encode([
                                    'path'     => $modulePath,
                                    'filename' => basename($jsonFile)
                                ]));
                            }
                        }
                    }
                }
            }
        }

        // If no matching chart was found, respond with an empty JSON object
        $this->sendResponse(json_encode([]));
    }

    /**
     * Read a chart config (inline or from file), fetch data from DB, and respond with a JSON chart model.
     *
     * Request body (JSON):
     * - EITHER: { "filename": "<absolute/path/to/config.json>", "range": { "from": <ts>, "to": <ts> } }
     * - OR:     { "chartConfig": { ... full config ... },         "range": { "from": <ts>, "to": <ts> } }
     *
     * Range notes:
     * - "from"/"to" may be in seconds or milliseconds since epoch.
     *   The function normalizes values > 2e12 down to seconds (÷1000),
     *   and also normalizes values > 2e9 down to seconds (÷1000) as a second safeguard.
     * - If "to" is missing/<=0 → uses current time.
     * - If "from" is missing/<=0 → defaults to 24 hours before "to".
     * - If "from" > "to" → swapped.
     *
     * Chart types:
     * - Gauge / Yes-No ("gauge","guage","yesno"): fetches only the latest values for each variable (single-point arrays).
     * - Others (e.g. "line"): fetches full time series for each variable in the requested range.
     *
     * Output:
     * - Responds via $this->sendResponse(<json>) with the chart config enriched with "data" arrays.
     * - Each series entry will have "data" populated and the original "variable" key removed.
     *
     * Side effects:
     * - Sends cache-control headers and JSON content-type headers.
     * - Opens a PDO connection via $this->makePdo().
     *
     *
     * @throws InvalidArgumentException on bad JSON body or missing/invalid config.
     * @throws RuntimeException on unreadable config file or invalid file JSON.
     * @throws PDOException bubble-up from downstream DB calls (except where handled).
     */
    public function postGraphData(): void
    {
        // --- Response headers: JSON body, disable caching ---
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
        header('Pragma: no-cache');

        // Open DB connection (MySQL/SQLite). Returns PDO or false (for missing SQLite file).
        $pdo = $this->makePdo();

        // --- Parse JSON request body ---
        $raw = file_get_contents('php://input') ?: '';
        $req = json_decode($raw, true);
        if (!is_array($req)) {
            throw new InvalidArgumentException('Invalid JSON body: ' . json_last_error_msg());
        }

        // --- Load chart config ---
        // Either "chartConfig" (inline object) OR "filename" (path to JSON config file)
        if (isset($req['chartConfig']) && is_array($req['chartConfig'])) {
            $config = $req['chartConfig'];
        } elseif (!empty($req['filename']) && is_string($req['filename'])) {
            $configPath = $req['filename'];
            if (!is_file($configPath) || !is_readable($configPath)) {
                throw new RuntimeException("Config file not found or unreadable: {$configPath}");
            }
            $fileRaw = file_get_contents($configPath);
            $config  = json_decode($fileRaw, true);
            if (!is_array($config)) {
                throw new RuntimeException("Invalid JSON in {$configPath}: " . json_last_error_msg());
            }
        } else {
            throw new InvalidArgumentException('Provide either "filename" or "chartConfig" in the request body.');
        }

        // --- Validate "series" array presence ---
        $series = $config['series'] ?? null;
        if (!is_array($series) || !count($series)) {
            throw new InvalidArgumentException('Config must include non-empty "series".');
        }

        // --- Determine chart type → gauge/yesno uses latest-only, others use full series ---
        $type = strtolower(trim((string)($config['type'] ?? 'line')));
        $isGaugeOrYesNo = in_array($type, ['gauge', 'guage', 'yesno'], true);

        // --- Parse and normalize time range (seconds vs milliseconds) ---
        $from = null; $to = null;
        if (isset($req['range']) && is_array($req['range'])) {
            $from = $req['range']['from'] ?? null;
            $to   = $req['range']['to']   ?? null;
        }
        $from = is_numeric($from) ? (int)$from : 0;
        $to   = is_numeric($to)   ? (int)$to   : 0;

        // Normalize millisecond epochs down to seconds (guard both >2e12 and >2e9)
        if ($from > 2000000000000) $from = (int)floor($from / 1000);
        if ($to   > 2000000000000) $to   = (int)floor($to   / 1000);
        if ($from > 2000000000)    $from = (int)floor($from / 1000);
        if ($to   > 2000000000)    $to   = (int)floor($to   / 1000);

        // Fill defaults and enforce ordering
        $now = time();
        if ($to <= 0)   $to   = $now;
        if ($from <= 0) $from = $to - 24 * 3600;  // default to last 24h
        if ($from > $to) { $tmp = $from; $from = $to; $to = $tmp; }

        // --- Utility to parse "variable" spec with optional '|thumb' flag ---
        // e.g. "AS_TEMP|true" → ['var' => 'AS_TEMP', 'thumb' => true]
        $parseVar = function (string $raw): array {
            $thumb = false;
            $var = $raw;
            if (strpos($raw, '|') !== false) {
                [$base, $flag] = array_pad(explode('|', $raw, 2), 2, null);
                $var = (string)$base;
                if ($flag !== null) {
                    $f = strtolower(trim($flag));
                    $thumb = in_array($f, ['1','true','yes','y','on'], true);
                }
            }
            return ['var' => $var, 'thumb' => $thumb];
        };

        // Default table may be defined at top level; series may override per-entry.
        $defaultTable = (string)($config['table'] ?? '');

        // Buckets keyed by table → { vars:[], thumbs:{var=>bool}, seriesMap:{seriesIndex=>var} }
        $byTable = [];
        // Optional per-series metadata (not used further here but can be handy for debugging)
        $seriesIdxMeta = [];

        // --- Partition series by table, collect requested variables, and track tooltip (thumb) wants ---
        foreach ($series as $idx => $def) {
            if (!is_array($def) || !isset($def['variable'])) continue;

            $rawVar = (string)$def['variable'];
            $tbl = isset($def['table']) && $def['table'] !== '' ? (string)$def['table'] : $defaultTable;

            if ($tbl === '') {
                throw new InvalidArgumentException("Series index {$idx} has no table and no default table is set.");
            }

            $pv  = $parseVar($rawVar);
            $var = $pv['var'];
            $thumb = $pv['thumb'];

            if (!isset($byTable[$tbl])) {
                $byTable[$tbl] = ['vars' => [], 'thumbs' => [], 'seriesMap' => []];
            }
            if (!in_array($var, $byTable[$tbl]['vars'], true)) {
                $byTable[$tbl]['vars'][] = $var;
            }
            // If any series requests thumb for this var, remember true
            $byTable[$tbl]['thumbs'][$var] = ($byTable[$tbl]['thumbs'][$var] ?? false) || $thumb;
            // Map series index → var (so we can fill back later)
            $byTable[$tbl]['seriesMap'][$idx] = $var;

            $seriesIdxMeta[$idx] = ['var' => $var, 'table' => $tbl];
        }

        // --- Fetch data ---
        if ($pdo !== false) {

            if ($isGaugeOrYesNo) {
                // Latest-only path: fetch the most recent values per var, per table
                foreach ($byTable as $table => $bucket) {
                    $vars = $bucket['vars'];
                    if (!$vars) continue;

                    $latestByVar = $this->fetchLatestValues($pdo, $table, $vars);

                    // Fill results back into the original series (remove "variable", set single-point "data")
                    foreach ($bucket['seriesMap'] as $idx => $var) {
                        unset($config['series'][$idx]['variable']);

                        $latest = $latestByVar[$var] ?? null;
                        $num = null;
                        if (is_array($latest) && array_key_exists('value', $latest)) {
                            $num = $latest['value'];
                        } elseif (is_numeric($latest)) {
                            // Defensive: if fetchLatestValues() shape changes or driver returns raw
                            $num = $latest + 0;
                        }
                        $config['series'][$idx]['data'] = ($num !== null) ? [ $num ] : [];
                    }
                }

            } else {
                // Full time-series path: fetch ranges per table, then populate series
                foreach ($byTable as $table => $bucket) {
                    $vars = $bucket['vars'];
                    if (!$vars) continue;

                    // thumb flags per var (used to decide whether to attempt tooltip thumbnail lookup)
                    $tooltips = $bucket['thumbs'];

                    // Fetch time series for the grouped variables within the range
                    $dataByVar = $this->fetchSeriesData($pdo, $table, $vars, $tooltips, (int)$from, (int)$to);

                    // Fill results back into the original series (remove "variable", set "data")
                    foreach ($bucket['seriesMap'] as $idx => $var) {
                        unset($config['series'][$idx]['variable']);
                        $config['series'][$idx]['data'] = $dataByVar[$var] ?? [];
                    }
                }
            }

        } else {
            // No DB connection available → return empty datasets for all series
            foreach (array_keys($series) as $idx) {
                unset($config['series'][$idx]['variable']);
                $config['series'][$idx]['data'] = [];
            }
        }

        // --- Emit final JSON payload (with series data inlined) ---
        $json = json_encode($config, JSON_UNESCAPED_SLASHES);
        $this->sendResponse($json);
    }

    /**
     * Parse a chart configuration JSON file and append its metadata to the chart list.
     *
     * This helper reads a single chart JSON file, validates it, and (if valid) appends
     * a standardized entry to the `$chartList` array under the chart’s `"group"` name.
     *
     * Each valid chart entry contributes an associative array with the following keys:
     * ```php
     * [
     *   'module'   => string,   // Module folder name the chart belongs to
     *   'filename' => string,   // Full path to the JSON file
     *   'icon'     => ?string,  // Optional icon name or path
     *   'title'    => string,   // Chart display title
     *   'enabled'  => bool,     // Whether the chart should be shown (usually true)
     *   'custom'   => bool      // True if the chart came from a user-defined/custom directory
     * ]
     * ```
     *
     * ---
     * **Behavior Summary**
     * - Safely reads and parses the JSON file (skips unreadable or invalid JSON).
     * - Requires `"group"` in the JSON to determine grouping category.
     * - Optionally extracts `"table"`, `"icon"`, and `"title"` fields.
     * - Default title falls back to the JSON filename (without extension).
     * - Currently always marks charts as `"enabled"`, but the commented logic
     *   shows intent to check database table existence for dynamic enablement.
     *
     * ---
     * **Example Input File (JSON)**
     * ```json
     * {
     *   "group": "Environment",
     *   "table": "allsky_temp",
     *   "icon": "fa-thermometer-half",
     *   "title": "Temperature Overview"
     * }
     * ```
     *
     * **Resulting Output**
     * ```php
     * $chartList['Environment'][] = [
     *     'module'   => 'allsky_temp',
     *     'filename' => '/.../charts/allsky_temp/temp_chart.json',
     *     'icon'     => 'fa-thermometer-half',
     *     'title'    => 'Temperature Overview',
     *     'enabled'  => true,
     *     'custom'   => false
     * ];
     * ```
     *
     * @param PDO    $pdo        Active PDO connection (used to check table existence if enabled)
     * @param array  $chartList  Accumulated chart list, grouped by chart "group"
     * @param string $jsonFile   Full path to the chart JSON file
     * @param string $module     Module folder the chart originates from
     * @param bool   $custom     True if this chart was found in a custom (user) directory
     *
     * @return array Updated $chartList with new chart metadata (if valid)
     */
    private function buildChartListFromFile(PDO $pdo, array $chartList, string $jsonFile, string $module, bool $custom = false): array 
    {
        // Safely read the JSON file contents; suppress warnings and skip on failure.
        $raw = @file_get_contents($jsonFile);

        if ($raw !== false) {
            // Decode JSON as associative array; skip if invalid or empty.
            $data = json_decode($raw, true);
            if (is_array($data)) {

                // The "group" key determines which section this chart belongs to.
                $group = $data['group'] ?? null;
                if ($group) {
                    // Optional chart metadata
                    $table = $data['table'] ?? null;
                    $icon  = $data['icon']  ?? null;

                    // Whether chart is enabled (placeholder logic, always true for now)
                    $enabled = true;

                    // Uncomment to enable runtime table existence checking:
                    /*
                    if ($table !== null) {
                        if ($this->tableExists($pdo, $table)) {
                            $enabled = true;
                        } else {
                            $enabled = false;
                        }
                    }
                    */

                    // Prefer 'title' in JSON, fallback to filename (without .json extension)
                    $title = $data['title'] ?? basename($jsonFile, '.json');

                    // Append chart metadata entry under its "group"
                    $chartList[$group][] = [
                        'module'   => $module,                                 // Module folder name
                        'filename' => $jsonFile,                               // Full file path
                        'icon'     => $icon !== null ? (string)$icon : null,   // Optional icon name
                        'title'    => (string)$title,                          // Display title
                        'enabled'  => $enabled,                                // Always true (for now)
                        'custom'   => $custom                                  // Custom flag (user charts)
                    ];
                }
            }
        }

        // Return the updated chart list (possibly unchanged if invalid file)
        return $chartList;
    }

    /**
     * Recursively scan a base charts directory and build a grouped chart list.
     *
     * This function traverses a given base directory to discover chart configuration
     * files (`*.json`) stored either directly under the directory (for custom charts)
     * or inside subdirectories representing individual modules.
     *
     * Each valid JSON file is parsed and normalized into a consistent metadata structure
     * using `buildChartListFromFile()`. The resulting chart entries are grouped by their
     * `"group"` field from the JSON definition.
     *
     * ---
     * **Behavior Summary**
     * - If `$custom` is `true`, charts are assumed to reside directly under `$baseDir`
     *   (no module subfolders). All such files are tagged with module `"Custom"`.
     * - If `$custom` is `false`, charts are expected to be located inside subfolders
     *   (each subfolder representing a module name, e.g. `allsky_temp`).
     * - For every `.json` chart file found, this method calls
     *   `buildChartListFromFile()` to parse and append normalized entries.
     *
     * ---
     * **Example Directory Layout**
     * ```
     * /charts/
     * ├── allsky_temp/
     * │   ├── temp_chart.json
     * │   └── humidity_chart.json
     * ├── allsky_meteor/
     * │   └── streak_count.json
     * └── custom/
     *     └── night_summary.json
     * ```
     *
     * ---
     * **Output Structure**
     * ```php
     * [
     *   "Environment" => [
     *     [ "module" => "allsky_temp", "filename" => ".../temp_chart.json", ... ],
     *     [ "module" => "allsky_temp", "filename" => ".../humidity_chart.json", ... ]
     *   ],
     *   "Meteors" => [
     *     [ "module" => "allsky_meteor", "filename" => ".../streak_count.json", ... ]
     *   ]
     * ]
     * ```
     *
     * @param PDO    $pdo        Active PDO connection (passed to downstream checks).
     * @param array  $chartList  Current grouped chart list (accumulated across directories).
     * @param string $baseDir    Path to the root charts directory being scanned.
     * @param bool   $custom     True if scanning a user-defined/custom charts directory.
     *
     * @return array Updated `$chartList` grouped by chart "group" name.
     */
    private function buildChartList(PDO $pdo, array $chartList, string $baseDir, bool $custom = false): array
    {
        // If base directory doesn't exist, skip and return the unmodified list.
        if (!is_dir($baseDir)) {
            return $chartList;
        }

        if ($custom) {
            // === CUSTOM CHART MODE ===
            // Custom charts are stored directly as JSON files (no module subfolders).
            $module = 'Custom';

            // Find all JSON chart definitions in the base directory.
            foreach (glob($baseDir . '/*.json') as $jsonFile) {
                // Parse and append each file to the chart list under "Custom" module.
                $chartList = $this->buildChartListFromFile($pdo, $chartList, $jsonFile, $module, $custom);
            }

        } else {
            // === MODULE CHART MODE ===
            // Iterate through subdirectories (each representing a module).
            $dir = new DirectoryIterator($baseDir);

            foreach ($dir as $entry) {
                // Skip "." and ".." and ignore non-directory entries.
                if ($entry->isDot() || !$entry->isDir()) {
                    continue;
                }

                // Derive module name and absolute path.
                $module     = $entry->getFilename();  // e.g. "allsky_temp"
                $modulePath = $entry->getPathname();  // e.g. "/.../charts/allsky_temp"

                // Search for JSON files directly within the module folder.
                foreach (glob($modulePath . '/*.json') as $jsonFile) {
                    // Process each JSON file and append to the chart list.
                    $chartList = $this->buildChartListFromFile($pdo, $chartList, $jsonFile, $module, $custom);
                }
            }
        }

        // Return the updated grouped chart list.
        return $chartList;
    }

    /**
     * Build and return a grouped list of all available chart definitions (core + user + custom).
     *
     * This method scans multiple chart directories — including system-provided and
     * user-defined locations — to gather all valid chart JSON definitions.
     *
     * It merges charts from the following sources:
     * 1. **Core modules:**    `$this->allsky_config . '/modules/charts'`
     * 2. **User modules:**    `$this->myFilesData . '/charts'`
     * 3. **Custom charts:**   `$this->myFilesBase . '/charts'` (marked as `custom=true`)
     *
     * For each directory, it calls `buildChartList()` to recursively discover and normalize
     * chart metadata grouped by their `"group"` field (as defined in each JSON file).
     *
     * The resulting structure is then serialized as JSON and returned to the frontend.
     *
     * ---
     * **Output Example (JSON):**
     * ```json
     * {
     *   "Environment": [
     *     { "module": "allsky_temp", "title": "Temperature", "filename": ".../temp_chart.json", "enabled": true, "custom": false },
     *     { "module": "allsky_temp", "title": "Humidity", "filename": ".../humidity_chart.json", "enabled": true, "custom": false }
     *   ],
     *   "System": [
     *     { "module": "allsky_hardware", "title": "CPU Temp", "filename": ".../hardware_chart.json", "enabled": true, "custom": false }
     *   ],
     *   "Custom": [
     *     { "module": "Custom", "title": "Night Summary", "filename": ".../night_summary.json", "enabled": true, "custom": true }
     *   ]
     * }
     * ```
     *
     * ---
     * **Notes:**
     * - Relies on a valid PDO connection from `$this->makePdo()`.
     * - If no database connection is available (`false` returned), the chart list will remain empty.
     * - The grouped `$chartList` is sorted alphabetically by group name before being sent.
     * - Sends the JSON response immediately using `$this->sendResponse()`.
     *
     * @return void  Outputs JSON response directly and does not return a value.
     */
    public function getAvailableGraphs()
    {
        // Initialize an empty chart list, grouped by "group" field later on
        $chartList = [];

        // Define chart source directories
        $coreModules  = $this->allsky_config . '/modules/charts';  // Core system charts
        $userModules  = $this->myFilesData   . '/charts';          // User-specific module charts
        $customCharts = $this->myFilesBase   . '/charts';          // Custom/freeform charts (flat structure)

        // Attempt to create a PDO connection for potential DB-dependent checks
        $pdo = $this->makePdo();

        if ($pdo !== false) {
            // Scan and append charts from each source location

            // 1. Core module charts (e.g., allsky_temp, allsky_meteor)
            $chartList = $this->buildChartList($pdo, $chartList, $coreModules);

            // 2. User module charts (user-overridden or additional modules)
            $chartList = $this->buildChartList($pdo, $chartList, $userModules);

            // 3. Custom charts (directly under /charts, flagged as custom=true)
            $chartList = $this->buildChartList($pdo, $chartList, $customCharts, true);

            // Sort groups alphabetically for consistent UI display
            asort($chartList);
        }

        // Output grouped chart metadata as a JSON response
        $this->sendResponse(json_encode($chartList));
    }

    /**
     * Handle POST request to save the current chart layout/state configuration.
     *
     * This endpoint accepts a JSON payload via HTTP POST (from `php://input`)
     * containing the user’s chart layout, positions, or other dashboard state data.
     *
     * The payload is parsed and written to a `state.json` file under the user’s
     * `$this->allskyMyFiles` directory. If parsing or saving fails, the method
     * returns a 500 HTTP error response.
     *
     * ---
     * **Expected Request:**
     * - Content-Type: application/json
     * - Body: a valid JSON object representing chart state, for example:
     * ```json
     * {
     *   "charts": [
     *     { "id": "chart1", "x": 0, "y": 0, "width": 400, "height": 300 },
     *     { "id": "chart2", "x": 400, "y": 0, "width": 400, "height": 300 }
     *   ],
     *   "lastModified": 1739912345
     * }
     * ```
     *
     * ---
     * **Behavior Summary:**
     * 1. Reads raw POST body from `php://input`.
     * 2. Decodes the JSON payload into a PHP array.
     * 3. On decode failure → sends HTTP 500 via `$this->send500()`.
     * 4. Saves the formatted JSON to `<allskyMyFiles>/state.json`.
     * 5. On file write failure → sends HTTP 500 with an error message.
     * 6. On success → sends an empty 200 OK response.
     *
     * ---
     * **Response Codes:**
     * - `200 OK` — Chart state successfully saved.
     * - `500 Internal Server Error` — JSON decode or file write failed.
     *
     * @return void  Sends an HTTP response directly; does not return data.
     */
    public function postSaveCharts() 
    {
        // Read raw POST body from input stream
        $jsonData = file_get_contents("php://input");

        // Decode the JSON payload into an associative array
        $data = json_decode($jsonData, true);

        // If JSON decoding failed, send a 500 error response
        if (json_last_error() !== JSON_ERROR_NONE) {
            $this->send500();
        }

        // Target file path for storing chart state
        $stateFile = $this->allskyMyFiles . '/state.json';

        // Attempt to save the JSON data to disk with pretty formatting
        $result = file_put_contents(
            $stateFile,
            json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)
        );

        // If saving failed, send a 500 error response with message
        if ($result === false) {
            $this->send500('Failed to save JSON');
        }

        // On success, send an empty OK response
        $this->sendResponse('');
    }

    /**
     * Handle GET request to retrieve the saved chart layout or dashboard state.
     *
     * This endpoint reads the previously saved chart configuration file
     * (`state.json`) from the user's `$this->allskyMyFiles` directory and
     * returns it as a validated JSON response.
     *
     * ---
     * **Behavior Summary:**
     * 1. Attempts to read `<allskyMyFiles>/state.json`.
     * 2. If the file is missing or unreadable, returns an empty array (`[]`).
     * 3. Decodes the JSON to validate it.
     * 4. If the file contains invalid JSON, returns HTTP 500.
     * 5. Re-encodes the validated JSON to ensure proper formatting before sending.
     *
     * ---
     * **Response Examples:**
     * ```json
     * [
     *   { "id": "chart1", "x": 0, "y": 0, "width": 400, "height": 300 },
     *   { "id": "chart2", "x": 400, "y": 0, "width": 400, "height": 300 }
     * ]
     * ```
     *
     * If the file does not exist:
     * ```json
     * []
     * ```
     *
     * ---
     * **Error Handling:**
     * - Sends HTTP 500 (`send500('Invalid JSON')`) if `state.json` is corrupt or contains invalid JSON.
     *
     * @return void  Outputs JSON directly via `sendResponse()` and does not return a value.
     */
    public function getSaveCharts()
    {
        // Path to the saved chart layout file
        $stateFile = $this->allskyMyFiles . '/state.json';

        // Attempt to read the file contents; suppress warnings if missing/unreadable
        $jsonString = @file_get_contents($stateFile);

        // If the file is missing or unreadable, default to an empty JSON array
        if ($jsonString === false) {
            $jsonString = "[]";
        }

        // Decode JSON for validation and consistency
        $data = json_decode($jsonString, true);

        // If the file contained invalid JSON, return a 500 error
        if (json_last_error() !== JSON_ERROR_NONE) {
            $this->send500('Invalid JSON');
        }

        // Re-encode to ensure valid and properly formatted JSON output
        $this->sendResponse(json_encode($data));
    }

    /* Chart builder code */


    /**
     * Handle POST request to load a specific custom chart configuration file.
     *
     * This endpoint expects a JSON body containing the absolute or relative
     * path to a chart configuration file. It reads and parses that JSON file,
     * and returns its decoded contents wrapped in a response object.
     *
     * ---
     * **Expected Request Body:**
     * ```json
     * { "name": "/path/to/custom/chart.json" }
     * ```
     *
     * ---
     * **Response Examples:**
     *
     * Successful load:
     * ```json
     * {
     *   "ok": true,
     *   "config": {
     *     "title": "Custom Temperature Chart",
     *     "table": "allsky_temp",
     *     "series": [ ... ]
     *   }
     * }
     * ```
     *
     * Error responses:
     * ```json
     * { "ok": false, "error": "Invalid JSON payload." }
     * { "ok": false, "error": "Missing chart name." }
     * { "ok": false, "error": "Chart not found." }
     * { "ok": false, "error": "Server error: <details>" }
     * ```
     *
     * ---
     * **Behavior Summary:**
     * 1. Reads POST body (`php://input`) and attempts to decode it as JSON.
     * 2. Validates that a `"name"` field is provided and non-empty.
     * 3. Checks that the referenced chart file exists.
     * 4. Reads and decodes the chart JSON configuration file.
     * 5. Returns the decoded chart configuration under `"config"`.
     * 6. If any step fails, returns `"ok": false` with an `"error"` message.
     *
     * ---
     * **Error Handling:**
     * - Gracefully returns a structured JSON error object for:
     *   - Invalid input JSON.
     *   - Missing `"name"` field.
     *   - File not found.
     *   - File read/parse errors.
     * - Catches any unhandled exceptions (`Throwable`) and reports a generic `"Server error"` message.
     *
     * @return void  Sends a JSON response directly; does not return a value.
     */
    public function postLoadCustomChart()
    {
        // Default response structure
        $result = ['ok' => false];

        try {
            // Read raw request body
            $raw = file_get_contents('php://input');

            // Attempt to decode the JSON payload
            $data = json_decode($raw, true);
            if (!is_array($data)) {
                $result['error'] = 'Invalid JSON payload.';
                return $this->sendResponse(json_encode($result));
            }

            // Extract and validate the "name" field (chart file path)
            $name = isset($data['name']) ? trim($data['name']) : '';
            if ($name === '') {
                $result['error'] = 'Missing chart name.';
                return $this->sendResponse(json_encode($result));
            }

            // Check if the requested file actually exists
            if (!file_exists($name)) {
                $result['error'] = 'Chart not found.';
                return $this->sendResponse(json_encode($result));
            }

            // Read the contents of the chart JSON file
            $fileRaw = file_get_contents($name);

            // Decode the JSON chart configuration
            $config = json_decode($fileRaw, true);

            // Attach the decoded chart config to the result
            $result['config'] = $config;
            $result['ok'] = true;

            // Return the successful response
            return $this->sendResponse(json_encode($result));

        } catch (\Throwable $e) {
            // Catch all unexpected errors (I/O, JSON decode, etc.)
            $result['error'] = 'Server error: ' . $e->getMessage();
            return $this->sendResponse(json_encode($result));
        }
    }

    /**
     * Handle POST request to delete a custom chart configuration file.
     *
     * This endpoint accepts a JSON payload specifying a chart configuration file path
     * and deletes it from the filesystem, provided the path is within a permitted
     * charts directory (core, user, or custom).
     *
     * ---
     * **Expected Request Body:**
     * ```json
     * { "name": "/path/to/custom/chart.json" }
     * ```
     *
     * ---
     * **Response Examples:**
     *
     * Successful deletion:
     * ```json
     * { "ok": true, "name": "/path/to/custom/chart.json" }
     * ```
     *
     * Error responses:
     * ```json
     * { "ok": false, "error": "Invalid JSON payload." }
     * { "ok": false, "error": "Missing chart name." }
     * { "ok": false, "error": "Unauthorized path." }
     * { "ok": false, "error": "Chart not found." }
     * { "ok": false, "error": "Failed to delete chart file." }
     * { "ok": false, "error": "Server error: <details>" }
     * ```
     *
     * ---
     * **Security Measures:**
     * - Prevents directory traversal by validating the resolved (`realpath`) location.
     * - Only files inside the following directories may be deleted:
     *   - `$this->myFilesBase . '/charts'`
     *   - `$this->myFilesData . '/charts'`
     *   - `$this->allsky_config . '/modules/charts'`
     *
     * Any file outside these directories is rejected as `"Unauthorized path."`
     *
     * ---
     * **Behavior Summary:**
     * 1. Reads POST body (`php://input`) and decodes JSON.
     * 2. Validates `"name"` parameter.
     * 3. Resolves the file path and ensures it lies within allowed chart directories.
     * 4. Checks for file existence.
     * 5. Attempts to delete the file using `unlink()`.
     * 6. Returns JSON response indicating success or failure.
     *
     * @return void  Sends a JSON response directly via `sendResponse()`; no return value.
     */
    public function postDeleteCustomChart()
    {
        $result = ['ok' => false];

        try {
            // Read raw POST input
            $raw = file_get_contents('php://input');

            // Decode JSON payload
            $data = json_decode($raw, true);
            if (!is_array($data)) {
                $result['error'] = 'Invalid JSON payload.';
                return $this->sendResponse(json_encode($result));
            }

            // Extract and validate "name"
            $name = isset($data['name']) ? trim($data['name']) : '';
            if ($name === '') {
                $result['error'] = 'Missing chart name.';
                return $this->sendResponse(json_encode($result));
            }

            // Resolve absolute, canonical path to eliminate ../ or symlinks
            $realPath = realpath($name);
            if ($realPath === false) {
                $result['error'] = 'Chart not found.';
                return $this->sendResponse(json_encode($result));
            }

            // Define allowed base directories for deletion
            $allowedDirs = [
                realpath($this->myFilesBase . '/charts'),
                realpath($this->myFilesData . '/charts'),
                realpath($this->allsky_config . '/modules/charts')
            ];

            // Check if file is within any allowed directory
            $isAllowed = false;
            foreach ($allowedDirs as $dir) {
                if ($dir !== false && str_starts_with($realPath, $dir)) {
                    $isAllowed = true;
                    break;
                }
            }

            // Reject unauthorized or unsafe paths
            if (!$isAllowed) {
                $result['error'] = 'Unauthorized path.';
                return $this->sendResponse(json_encode($result));
            }

            // Ensure the file actually exists
            if (!file_exists($realPath)) {
                $result['error'] = 'Chart not found.';
                return $this->sendResponse(json_encode($result));
            }

            // Attempt to delete the chart file
            if (!@unlink($realPath)) {
                $result['error'] = 'Failed to delete chart file.';
                return $this->sendResponse(json_encode($result));
            }

            // Success response
            $result['ok'] = true;
            $result['name'] = $realPath;
            return $this->sendResponse(json_encode($result));

        } catch (\Throwable $e) {
            // Handle unexpected exceptions safely
            $result['error'] = 'Server error: ' . $e->getMessage();
            return $this->sendResponse(json_encode($result));
        }
    }

    /**
     * Handle POST request to save a custom chart configuration to disk.
     *
     * This endpoint allows users to create or update their own chart definitions
     * by sending a JSON payload containing a chart title, optional group, and chart
     * configuration data. The chart configuration is written as a `.json` file
     * under the user's custom charts directory (`$this->myFilesBase/charts`).
     *
     * ---
     * **Expected Request Body:**
     * ```json
     * {
     *   "title": "Temperature Overview",
     *   "group": "Environment",
     *   "config": {
     *     "title": "Temperature Overview",
     *     "table": "allsky_temp",
     *     "series": [
     *       { "variable": "AS_TEMP", "color": "#ff0000" }
     *     ]
     *   }
     * }
     * ```
     *
     * ---
     * **Successful Response:**
     * ```json
     * {
     *   "ok": true,
     *   "file": "temperature_overview.json",
     *   "path": "/var/www/allsky/myfiles/charts/temperature_overview.json",
     *   "message": "Chart 'Temperature Overview' saved successfully."
     * }
     * ```
     *
     * **Error Response:**
     * ```json
     * {
     *   "ok": false,
     *   "error": "Chart title is required."
     * }
     * ```
     *
     * ---
     * **Behavior Summary:**
     * 1. Reads the raw POST body (`php://input`) and decodes it from JSON.
     * 2. Validates that:
     *    - The input is valid JSON.
     *    - A `"title"` is provided.
     *    - A `"config"` object exists and is an array.
     * 3. Sanitizes the title to form a safe filename (`a-z0-9_-` only).
     * 4. Ensures the `charts` directory exists, creating it if needed.
     * 5. Writes the JSON configuration to `<myFilesBase>/charts/{title}.json`.
     * 6. Returns a JSON response with success or error details.
     *
     * ---
     * **File Naming Rules:**
     * - Non-alphanumeric characters in the chart title are replaced with underscores (`_`).
     * - All letters are converted to lowercase.
     * - Example: `"Temperature Overview"` → `temperature_overview.json`
     *
     * ---
     * **Exceptions & Error Handling:**
     * - Throws `RuntimeException` for I/O or encoding issues.
     * - Throws `InvalidArgumentException` for missing/invalid fields.
     * - All exceptions are caught, and a JSON error response is returned with `ok=false`.
     *
     * @return void  Sends a JSON response directly via `$this->sendResponse()`.
     */
    public function postSaveCustomChart(): void
    {
        try {
            // === Step 1: Read raw JSON input ===
            $raw = file_get_contents('php://input');
            if (!$raw) {
                throw new RuntimeException('No input received.');
            }

            // === Step 2: Decode JSON payload ===
            $input = json_decode($raw, true);
            if (!is_array($input)) {
                throw new RuntimeException('Invalid JSON input: ' . json_last_error_msg());
            }

            // === Step 3: Extract and validate required fields ===
            $title  = trim($input['title'] ?? '');
            $group  = trim($input['group'] ?? 'Custom'); // Currently unused, reserved for grouping
            $config = $input['config'] ?? null;

            if ($title === '') {
                throw new InvalidArgumentException('Chart title is required.');
            }
            if (!is_array($config)) {
                throw new InvalidArgumentException('Chart configuration is missing or invalid.');
            }

            // === Step 4: Sanitize title to create a safe filename ===
            $safeTitle = preg_replace('/[^A-Za-z0-9_\-]/', '_', strtolower($title));
            $fileName  = $safeTitle . '.json';

            // === Step 5: Ensure target save directory exists ===
            $saveDir = rtrim($this->myFilesBase, '/') . '/charts';
            if (!is_dir($saveDir)) {
                if (!mkdir($saveDir, 0775, true) && !is_dir($saveDir)) {
                    throw new RuntimeException("Failed to create directory: {$saveDir}");
                }
            }

            // === Step 6: Write chart configuration to file ===
            $savePath = "{$saveDir}/{$fileName}";
            $encoded  = json_encode($config, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

            if (file_put_contents($savePath, $encoded) === false) {
                throw new RuntimeException("Failed to write chart file: {$fileName}");
            }

            // === Step 7: Respond with success ===
            $result = [
                'ok'      => true,
                'file'    => $fileName,
                'path'    => $savePath,
                'message' => "Chart '{$title}' saved successfully."
            ];

            $this->sendResponse(json_encode($result));

        } catch (Throwable $e) {
            // === Step 8: Error handling ===
            $result = [
                'ok'    => false,
                'error' => $e->getMessage(),
            ];
            $this->sendResponse(json_encode($result));
        }
    }

    /**
     * Handle POST request to fetch series data for variables, supporting cartesian, gauge, and yes/no charts.
     *
     * **Accepted chart types**
     * - Cartesian:  line, spline, area, column, bar, column3d, area3d  → returns time-series arrays.
     * - Gauge:      gauge                                              → returns latest single value.
     * - Binary:     yesno                                              → returns latest single value.
     *
     * **Request body (JSON)**
     * ```json
     * {
     *   "type": "line" | "gauge" | "yesno",
     *   "xField": "id",                 // optional, informational
     *   "xIsDatetime": true,            // optional, informational (client-side use)
     *   "range": { "from": 1710000000, "to": 1710010000 }, // epoch seconds; optional for cartesian
     *   "yLeft":  [ {"variable":"AS_TEMP|true","table":"allsky_temp"} , "AS_HUMIDITY:allsky_temp" ],
     *   "yRight": [ {"variable":"AS_DEW","table":"allsky_temp"} ],
     *   "valueField": {"variable":"AS_TEMP","table":"allsky_temp"}      // required for gauge/yesno
     * }
     * ```
     * Notes:
     * - Variables may be specified as objects `{variable, table}` **or** as strings `"VAR:TABLE"`.
     * - A variable may include a thumbnail flag suffix `"|true"` to request tooltip thumbnails.
     * - For cartesian charts, if `range` is omitted, a default window (last 6h) is used.
     * - For gauge/yesno, only the latest value is fetched.
     *
     * **Response (cartesian)**
     * ```json
     * {
     *   "ok": true,
     *   "type": "line",
     *   "xField": "id",
     *   "series": [
     *     { "id":"AS_TEMP", "name":"AS_TEMP", "data":[{"x":1710000010000,"y":12.3}, ...] },
     *     { "id":"AS_HUMIDITY", "name":"AS_HUMIDITY", "data":[{"x":1710000010000,"y":75.2}, ...] }
     *   ]
     * }
     * ```
     *
     * **Response (gauge/yesno)**
     * ```json
     * { "ok":true, "type":"gauge", "valueField":"AS_TEMP", "table":"allsky_temp", "value": { "ts_ms":..., "value":... } }
     * ```
     *
     * Error responses use: `{ "ok": false, "error": "message" }`.
     *
     * @return void Sends JSON via `$this->sendResponse(...)`; on some early validation failures returns array.
     */
    public function postVariableSeriesData() 
    {
        // ----- 1) Read and decode request -----

        // Read raw JSON body; if empty (e.g., ad-hoc GET test), fall back to $_GET encoded as JSON.
        $raw = file_get_contents('php://input');
        if ($raw === false || $raw === '') {
            $raw = json_encode($_GET, JSON_UNESCAPED_SLASHES);
        }

        $req = json_decode($raw, true);
        if (!is_array($req)) {
            // Early return using consistent error shape (not sent via sendResponse here by design).
            return ['ok' => false, 'error' => 'Invalid JSON body'];
        }

        // Basic request fields
        $type        = isset($req['type']) ? strtolower(trim((string)$req['type'])) : '';
        $xField      = isset($req['xField']) ? trim((string)$req['xField']) : null;  // informational
        $xIsDatetime = !empty($req['xIsDatetime']);                                   // informational
        $rangeFrom   = isset($req['range']['from']) ? (int)$req['range']['from'] : null;
        $rangeTo     = isset($req['range']['to'])   ? (int)$req['range']['to']   : null;

        // Supported chart categories
        $cartesianTypes = ['line','spline','area','column','bar','column3d','area3d'];
        $isCartesian = in_array($type, $cartesianTypes, true);
        $isGauge     = ($type === 'gauge');
        $isYesNo     = ($type === 'yesno');

        if (!$isCartesian && !$isGauge && !$isYesNo) {
            return ['ok' => false, 'error' => "Unsupported chart type '{$type}'"];
        }

        // ----- 2) Helpers to normalize entries -----
        // Accept {variable, table[, thumbnail]} or "VAR:TABLE". Supports "|true" thumbnail suffix on variable.
        $normalizeVarEntry = function ($entry): ?array {
            $var = ''; $table = ''; $thumb = false;

            if (is_array($entry)) {
                $var   = isset($entry['variable']) ? (string)$entry['variable'] : '';
                $table = isset($entry['table'])    ? (string)$entry['table']    : '';
                if (isset($entry['thumbnail']))    $thumb = (bool)$entry['thumbnail'];
            } elseif (is_string($entry)) {
                $parts = explode(':', $entry, 2);
                $var   = trim($parts[0] ?? '');
                $table = trim($parts[1] ?? '');
            } else {
                return null;
            }
            if ($var === '') return null;

            // Detect and strip "|flag" suffix; set thumbnail flag if truthy.
            if (strpos($var, '|') !== false) {
                [$base, $flag] = array_pad(explode('|', $var, 2), 2, null);
                $var = $base;
                if ($flag !== null) {
                    $flagLc = strtolower(trim($flag));
                    $thumb = $thumb || in_array($flagLc, ['1','true','yes','y','on'], true);
                }
            }

            return ['variable' => $var, 'table' => $table, 'thumbnail' => $thumb];
        };

        $normalizeVarArray = function ($arr) use ($normalizeVarEntry): array {
            $out = [];
            if (!is_array($arr)) return $out;
            foreach ($arr as $i) {
                $n = $normalizeVarEntry($i);
                if ($n) $out[] = $n;
            }
            return $out;
        };

        // ----- 3) Branch by chart type and build queries -----
        try {
            $pdo = $this->makePdo();
        } catch (Throwable $e) {
            return ['ok' => false, 'error' => 'DB connection failed: '.$e->getMessage()];
        }

        // If cartesian and no range specified → default to last 6 hours
        if ($isCartesian) {
            if ($rangeFrom === null || $rangeTo === null) {
                $rangeTo   = $rangeTo   ?? time();
                $rangeFrom = $rangeFrom ?? ($rangeTo - 6 * 3600);
            }
        }

        // Gauge/YesNo: must provide a single valueField with {variable, table}
        if ($isGauge || $isYesNo) {
            $vf = $normalizeVarEntry($req['valueField'] ?? null);
            if (!$vf || $vf['variable'] === '') {
                return ['ok' => false, 'error' => "For {$type} charts, valueField {variable, table} is required."];
            }
            $table = $vf['table'] ?? '';
            if ($table === '') {
                return ['ok' => false, 'error' => 'Missing table for valueField'];
            }

            try {
                // Expected shape from fetchLatestValues: ['VAR' => ['ts_ms'=>..., 'value'=>...]]
                $latestMap = $this->fetchLatestValues($pdo, $table, [$vf['variable']]);
            } catch (Throwable $e) {
                return ['ok' => false, 'error' => 'fetchLatestValues failed: '.$e->getMessage()];
            }

            $value = $latestMap[$vf['variable']] ?? null;

            $result =  [
                'ok'         => true,
                'type'       => $type,
                'valueField' => $vf['variable'],
                'table'      => $table,
                'value'      => $value
            ];

            // For gauge/yesno we send the response immediately and return.
            $this->sendResponse(json_encode($result));
        }

        // ----- Cartesian series path -----

        // Normalize left/right axis selections; at least one required.
        $left  = $normalizeVarArray($req['yLeft']  ?? []);
        $right = $normalizeVarArray($req['yRight'] ?? []);
        if (!$left && !$right) {
            return ['ok' => false, 'error' => 'For cartesian charts, provide at least one variable in yLeft or yRight.'];
        }

        // ----- 4) Group by table and call fetchSeriesData() per table -----
        // Build a per-table request:
        //   $byTable[table] = [
        //     'vars'   => ['VAR1','VAR2',...],
        //     'thumbs' => ['VAR1'=>true, 'VAR2'=>false, ...]
        //   ]
        $byTable = [];

        $addToBuckets = function (array $items) use (&$byTable) {
            foreach ($items as $item) {
                $tbl = (string)($item['table'] ?? '');
                $var = (string)$item['variable'];
                $thu = (bool)($item['thumbnail'] ?? false);
                if ($tbl === '' || $var === '') continue;

                if (!isset($byTable[$tbl])) {
                    $byTable[$tbl] = ['vars' => [], 'thumbs' => []];
                }
                if (!in_array($var, $byTable[$tbl]['vars'], true)) {
                    $byTable[$tbl]['vars'][] = $var;
                }
                // Accumulate thumbnail flag per variable.
                $byTable[$tbl]['thumbs'][$var] = ($byTable[$tbl]['thumbs'][$var] ?? false) || $thu;
            }
        };

        $addToBuckets($left);
        $addToBuckets($right);

        // Call fetchSeriesData() for each table, then normalize to outgoing shape.
        $seriesOut = []; // array of { id, name, data }
        foreach ($byTable as $table => $pack) {
            $vars = $pack['vars'];
            if (!$vars) continue;

            $tooltips = $pack['thumbs']; // ['VAR'=>bool] expected by fetchSeriesData()

            try {
                // Expected return (by your earlier implementation):
                // ['VAR' => [ ['x'=>ms,'y'=>val,'custom'?], ... ], ...]
                $tableResult = $this->fetchSeriesData($pdo, $table, $vars, $tooltips, (int)$rangeFrom, (int)$rangeTo);
            } catch (Throwable $e) {
                return ['ok' => false, 'error' => "fetchSeriesData failed for table '{$table}': ".$e->getMessage()];
            }

            // Normalize to a consistent series list for the client
            if (isset($tableResult[0]) && is_array($tableResult[0]) && array_key_exists('data', $tableResult[0])) {
                // Already a list of series objects {id?, name?, data?}
                foreach ($tableResult as $s) {
                    if (!isset($s['id']) && isset($s['variable'])) $s['id'] = $s['variable'];
                    if (!isset($s['name'])) $s['name'] = $s['id'] ?? '';
                    if (!isset($s['data'])) $s['data'] = [];
                    $seriesOut[] = [
                        'id'   => (string)($s['id'] ?? ''),
                        'name' => (string)($s['name'] ?? ''),
                        'data' => (array)($s['data'] ?? [])
                    ];
                }
            } elseif (is_array($tableResult)) {
                // Associative map style: ['VAR' => [points...]]
                foreach ($vars as $v) {
                    $pts = $tableResult[$v] ?? [];
                    $seriesOut[] = [
                        'id'   => $v,
                        'name' => $v,
                        'data' => is_array($pts) ? array_values($pts) : []
                    ];
                }
            }
        }

        // Final payload; client decides axis (left/right) mapping based on its selections.
        $result =  [
            'ok'     => true,
            'type'   => $type,
            'xField' => $xField,
            'series' => $seriesOut
        ];

        $this->sendResponse(json_encode($result));
    }

    /**
     * Convert a mixed input value into a strict boolean (`true` or `false`).
     *
     * This utility normalizes different common truthy/falsy representations
     * into a proper PHP boolean, making it safe to handle user input, JSON values,
     * environment variables, or database strings where truthy values may vary.
     *
     * ---
     * **Conversion Rules:**
     *
     * | Input Type | Truthy Examples | Falsy Examples | Notes |
     * |-------------|----------------|----------------|-------|
     * | `bool`      | `true`         | `false`        | Returned as-is |
     * | `int`       | `1`, `42`, etc.| `0`            | Any non-zero integer is `true` |
     * | `string`    | `"1"`, `"true"`, `"yes"`, `"y"`, `"on"` | anything else (`"0"`, `"no"`, `"false"`, empty, etc.) | Case-insensitive |
     * | Other types | —              | —              | Always `false` |
     *
     * ---
     * **Examples:**
     * ```php
     * $this->to_bool(true);       // true
     * $this->to_bool(1);          // true
     * $this->to_bool("yes");      // true
     * $this->to_bool("No");       // false
     * $this->to_bool(0);          // false
     * $this->to_bool(null);       // false
     * ```
     *
     * @param mixed $v  Input value of any type (bool, int, string, etc.)
     * @return bool     Returns `true` if the input is recognized as truthy, otherwise `false`.
     */
    private function to_bool($v): bool
    {
        // Already a boolean → return directly.
        if (is_bool($v)) return $v;

        // Integer → treat 0 as false, any non-zero as true.
        if (is_int($v))  return $v !== 0;

        // String → check for common truthy keywords, case-insensitive.
        if (is_string($v)) {
            return in_array(strtolower(trim($v)), ['1', 'true', 'yes', 'y', 'on'], true);
        }

        // All other types (null, float, array, object, etc.) → false by default.
        return false;
    }

    /**
     * Recursively convert an object (or nested objects) into an associative array.
     *
     * This helper is used to normalize mixed data structures where PHP objects may be
     * returned from `json_decode()`, API responses, or other dynamic sources that can
     * contain nested objects.  
     *  
     * It ensures that the final output is always composed entirely of arrays, 
     * recursively traversing all levels of the structure.
     *
     * ---
     * **Behavior Summary:**
     * 1. If the input `$v` is an **object**, it converts it into an associative array
     *    using `get_object_vars()`.
     * 2. If the input `$v` is an **array**, it recursively applies itself to each element
     *    (allowing deep object-to-array conversion).
     * 3. All other data types (`string`, `int`, `float`, `bool`, `null`, etc.)
     *    are returned **unchanged**.
     *
     * ---
     * **Examples:**
     * ```php
     * $obj = (object)[
     *   'name' => 'Allsky',
     *   'meta' => (object)[
     *       'version' => '1.0',
     *       'enabled' => true
     *   ]
     * ];
     *
     * $arr = $this->to_array($obj);
     *
     * // Result:
     * // [
     * //   'name' => 'Allsky',
     * //   'meta' => [
     * //       'version' => '1.0',
     * //       'enabled' => true
     * //   ]
     * // ]
     * ```
     *
     * ---
     * **Use Cases:**
     * - Ensuring uniform array-based data for JSON encoding.
     * - Converting decoded JSON objects to arrays (`json_decode($json, false)` case).
     * - Simplifying handling of complex or mixed-type data structures.
     *
     * @param mixed $v  Any variable (object, array, or scalar)
     * @return mixed    Returns a recursively converted array if applicable,
     *                  otherwise returns the input value unchanged.
     */
    private function to_array($v)
    {
        // If value is an object → convert to associative array.
        if (is_object($v)) {
            $v = get_object_vars($v);
        }

        // If value is an array → recursively convert its elements.
        if (is_array($v)) {
            foreach ($v as $k => $vv) {
                $v[$k] = $this->to_array($vv);
            }
        }

        // Return the converted structure (or unchanged scalar).
        return $v;
    }

    /**
     * Build and return a grouped list of all available database variables
     * from every installed Allsky module (core, user, and custom).
     *
     * This method scans all module definitions, extracts their metadata,
     * and returns a JSON structure describing which variables are available
     * for charting or analytics, grouped by their logical module group name.
     *
     * ---
     * **Behavior Summary:**
     * 1. Loads module metadata from three locations:
     *    - `$this->allskyModules` → core system modules.
     *    - `$this->userModules`   → user-installed modules.
     *    - `$this->myFiles`       → locally stored custom modules.
     *
     * 2. Merges all modules into a unified list.
     *
     * 3. For each module:
     *    - Reads `metadata.extradata.database` to determine:
     *        - Database table name (`table`)
     *        - Whether all variables should be included (`include_all`)
     *    - Reads `metadata.extradata.values` to find defined variables.
     *    - Includes variables if:
     *        - `include_all` is true, **or**
     *        - The variable’s own `database.include` flag is true.
     *
     * 4. Produces an associative array structured as:
     *
     * ```json
     * {
     *   "Environment": {
     *     "AS_TEMP": {
     *       "description": "Temperature from Allsky",
     *       "table": "allsky_temp"
     *     },
     *     "AS_HUMIDITY": {
     *       "description": "Humidity from Allsky",
     *       "table": "allsky_temp"
     *     }
     *   },
     *   "Meteor Detection": {
     *     "AS_METEORCOUNT": {
     *       "description": "Number of meteors detected",
     *       "table": "allsky_meteors"
     *     }
     *   }
     * }
     * ```
     *
     * 5. Sends this structure as a JSON response to the client.
     *
     * ---
     * **Use Cases:**
     * - Chart Designer variable selection dropdowns.
     * - API responses for available telemetry variables.
     * - Dynamic UI builders referencing live module metadata.
     *
     * ---
     * **Dependencies:**
     * - `readModuleData()` — Reads and parses module metadata JSON files.
     * - `to_array()` — Converts nested objects to arrays.
     * - `to_bool()` — Safely converts truthy strings/ints to booleans.
     * - `sendResponse()` — Outputs JSON to the client.
     *
     * ---
     * **Example Output:**
     * ```json
     * {
     *   "ADSB": { "AS_COUNT": { "table": "allsky_adsb", "description": "Total Aircraft" } },
     *   "Environment": {
     *     "AS_TEMP": { "description": "Temperature", "table": "allsky_temp" },
     *     "AS_DEW":  { "description": "Dewpoint",    "table": "allsky_temp" }
     *   }
     * }
     * ```
     *
     * @return void  Sends a JSON-encoded associative array of available variables grouped by module.
     */
    public function getAvailableVariables() 
    {
        // --- Step 1: Load modules from all known sources ---
        $coreModules = $this->moduleUtil->readModuleData($this->allskyModules, "system", null);
        $userModules = $this->moduleUtil->readModuleData($this->userModules, "user", null);
        $myModules   = $this->moduleUtil->readModuleData($this->myFiles, "user", null);

        // Merge into one flat array of modules
        $allModules = array_merge($coreModules, $userModules, $myModules);

        $result = [];

        // --- Step 2: Iterate over all modules ---
        foreach ($allModules as $moduleFile => $mod) {
            // Safely normalize nested metadata structures
            $meta   = $this->to_array($mod['metadata'] ?? []);
            $extra  = $this->to_array($meta['extradata'] ?? []);
            $dbConf = $this->to_array($extra['database'] ?? []);
            $values = $this->to_array($extra['values'] ?? []);

            // Skip if the module lacks metadata or value definitions
            if (empty($meta) || empty($dbConf) || empty($values)) {
                continue;
            }

            // Extract key configuration details
            $groupName  = $meta['module'] ?? null;                          // Internal module key
            $includeAll = $this->to_bool($dbConf['include_all'] ?? false);  // Global include flag
            $tableName  = $dbConf['table'] ?? null;                         // Database table name

            if (!$groupName || !$tableName) continue;

            // --- Step 3: Process all defined variables for this module ---
            foreach ($values as $varKey => $vmetaRaw) {
                $vmeta = $this->to_array($vmetaRaw);

                // Determine inclusion rule
                $include = $includeAll || $this->to_bool($vmeta['database']['include'] ?? false);
                if (!$include) continue;

                // Only include variables of type int, float, number or bool
                // TODO: Validate the above list
                if (in_array($vmeta['type'] ?? null, ['int', 'float', 'number', 'temperature', 'bool'], true)) {
                    // Extract description and display group
                    $desc          = $vmeta['description'] ?? '';
                    $groupDisplay  = $meta['group'] ?? 'Unknown';

                    // --- Step 4: Add entry to grouped result ---
                    $result[$groupDisplay][$varKey] = [
                        'description' => $desc,
                        'table'       => $tableName
                    ];
                }
            }
        }

        // --- Step 5: Return the aggregated result as JSON ---
        $this->sendResponse(json_encode($result));
    }
    /* End Chart Builder Code */

    /**
     * End Chart Code
     */
}

$chartUtil = new CHARTUTIL();
$chartUtil->run();