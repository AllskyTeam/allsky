<?php
declare(strict_types=1);

/**
 * Allsky configuration backup and restore controller.
 *
 * This file handles backup archive creation, upload validation, restore preview
 * data, and restore execution for the WebUI.
 */

include_once('functions.php');
initialize_variables();
include_once('authenticate.php');
include_once('utilbase.php');

/**
 * Handles WebUI backup and restore requests for Allsky configuration and image archives.
 */
class CONFIGBACKUPUTIL extends UTILBASE
{
    /**
     * Routes that are allowed to return non-AJAX responses.
     *
     * @var array<int, string>
     */
    protected array $nonAjaxRequests = ['Download'];

    /**
     * Absolute path to the Allsky installation root.
     */
    private string $allskyHome;

    /**
     * Absolute path to the Allsky configuration directory.
     */
    private string $allskyConfig;

    /**
     * Cached owner name resolved from Allsky variables.
     */
    private ?string $cachedAllskyOwner = null;

    /**
     * Cached system-local timezone used for backup filenames and metadata.
     */
    private ?DateTimeZone $localTimezone = null;

    /**
     * Initialises path values used by backup and restore operations.
     */
    public function __construct()
    {
        $this->allskyHome = rtrim(ALLSKY_HOME, '/\\');
        $this->allskyConfig = rtrim(ALLSKY_CONFIG, '/\\');
    }

    /**
     * Defines the WebUI routes handled by this utility.
     *
     * @return array<string, array<int, string>>
     */
    protected function getRoutes(): array
    {
        return [
            'Status' => ['get'],
            'Create' => ['post'],
            'RestoreInfo' => ['post'],
            'Restore' => ['post'],
            'Delete' => ['post'],
            'Download' => ['get', 'post'],
            'Upload' => ['post'],
        ];
    }

    /**
     * Gets the directory where backup archives are stored.
     */
    private function getBackupDir(): string
    {
        return rtrim(dirname($this->allskyHome), '/\\') . '/allskybackups';
    }

    /**
     * Gets the metadata file that tracks local backup configuration.
     */
    private function getBackupMetadataFile(): string
    {
        return $this->allskyConfig . '/backup.json';
    }

    /**
     * Gets the system-local timezone rather than PHP's default timezone.
     */
    private function getLocalTimezone(): DateTimeZone
    {
        if ($this->localTimezone instanceof DateTimeZone) {
            return $this->localTimezone;
        }

        $candidates = [];
        $timezoneName = trim((string)@file_get_contents('/etc/timezone'));
        if ($timezoneName !== '') {
            $candidates[] = $timezoneName;
        }

        $localtimeTarget = @readlink('/etc/localtime');
        if (is_string($localtimeTarget)) {
            $zoneinfoPrefix = '/usr/share/zoneinfo/';
            if (str_starts_with($localtimeTarget, $zoneinfoPrefix)) {
                $candidates[] = substr($localtimeTarget, strlen($zoneinfoPrefix));
            }
        }

        $envTimezone = trim((string)getenv('TZ'));
        if ($envTimezone !== '') {
            $candidates[] = $envTimezone;
        }

        $phpTimezone = trim(date_default_timezone_get());
        if ($phpTimezone !== '') {
            $candidates[] = $phpTimezone;
        }
        $candidates[] = 'UTC';

        foreach (array_values(array_unique($candidates)) as $candidate) {
            try {
                $this->localTimezone = new DateTimeZone($candidate);
                return $this->localTimezone;
            } catch (Throwable $e) {
                continue;
            }
        }

        $this->localTimezone = new DateTimeZone('UTC');
        return $this->localTimezone;
    }

    /**
     * Formats a timestamp using the system-local timezone.
     */
    private function formatLocalDate(string $format, ?int $timestamp = null): string
    {
        $timezone = $this->getLocalTimezone();
        if ($timestamp === null) {
            return (new DateTimeImmutable('now', $timezone))->format($format);
        }

        return (new DateTimeImmutable('@' . $timestamp))->setTimezone($timezone)->format($format);
    }

    /**
     * Gets the core archive targets used when no custom metadata exists.
     *
     * @return array<int, string>
     */
    private function getDefaultBackupTargets(): array
    {
        return [
            "/config/settings.json",
            "/config/cc.json",
            "/config/overlay/mytemplates/*",
            "/config/overlay/images/*",
            "/config/overlay/imagethumbnails/*",
            "/config/overlay/fonts/*",
            "/config/overlay/config/*",
            "/config/modules/*",
            "/config/myFiles/allsky_server_initial_password.txt",
            "/config/myFiles/db_data.json",
            "/config/myFiles/monitorable_logs.json",
            "/config/myFiles/state.json",
            "./env.json"
        ];
    }

    /**
     * Gets optional archive sections available on a default installation.
     *
     * @return array<string, array{description: string, shortdescription: string, path: string|array<int, string>}>
     */
    private function getDefaultOptionalTargets(): array
    {
        return [
            'modules' => [
                'description' => 'Include the modules directory which contains the installed modules. This can be a large directory but will allow you to restore your modules if needed.',
                'shortdescription' => 'User Modules',
                'path' => 'config/myFiles/modules/*',
            ],
            'databases' => [
                'description' => 'Include the databases directory which contains the allsky.db file. This can be a large directory but will allow you to restore your database if needed.',
                'shortdescription' => 'Allsky Databases',
                'path' => [
                    'config/myFiles/allsky.db',
                    'config/myFiles/db_data.json',
                    'config/myFiles/secrets.json',
                ],
            ],
        ];
    }

    /**
     * Normalises configured optional backup target definitions.
     *
     * @param mixed $rawOptionalTargets Raw optional target configuration from metadata.
     * @return array<string, array{description: string, shortdescription: string, path: string|array<int, string>}>
     */
    private function normaliseOptionalTargets($rawOptionalTargets): array
    {
        if (!is_array($rawOptionalTargets)) {
            return [];
        }

        $normalised = [];
        foreach ($rawOptionalTargets as $key => $entry) {
            $name = trim((string)$key);
            if ($name === '') {
                continue;
            }

            $description = '';
            $shortDescription = '';
            $paths = [];
            if (is_array($entry)) {
                $description = trim((string)($entry['description'] ?? ''));
                $shortDescription = trim((string)($entry['shortdescription'] ?? ''));
                $rawPaths = $entry['path'] ?? [];
                if (is_string($rawPaths)) {
                    $rawPaths = [$rawPaths];
                }
                if (is_array($rawPaths)) {
                    foreach ($rawPaths as $path) {
                        $path = trim((string)$path);
                        if ($path !== '') {
                            $paths[] = $path;
                        }
                    }
                }
            }

            if (empty($paths)) {
                continue;
            }

            $pathValue = (count($paths) === 1) ? $paths[0] : array_values(array_unique($paths));
            $normalised[$name] = [
                'description' => $description,
                'shortdescription' => $shortDescription,
                'path' => $pathValue,
            ];
        }

        return $normalised;
    }

    /**
     * Pulls optional section keys recorded in backup metadata.
     *
     * @param array<string, mixed> $backupMeta Metadata read from a backup archive.
     * @return array<int, string> Unique optional target keys.
     */
    private function getIncludedOptionalTargetKeysFromMetadata(array $backupMeta): array
    {
        if (!isset($backupMeta['includedOptionalTargets']) || !is_array($backupMeta['includedOptionalTargets'])) {
            return [];
        }

        $keys = [];
        foreach ($backupMeta['includedOptionalTargets'] as $key) {
            $key = trim((string)$key);
            if ($key !== '') {
                $keys[] = $key;
            }
        }

        $keys = array_values(array_unique($keys));
        sort($keys, SORT_STRING);
        return $keys;
    }

    /**
     * Builds the restore section list shown to the WebUI.
     *
     * @param array<int, string> $includedOptionalKeys Optional target keys present in the backup.
     * @param string $backupType Backup type, usually `config` or `images`.
     * @return array<int, array{key: string, description: string, shortdescription: string, required: bool}>
     */
    private function getIncludedSections(array $includedOptionalKeys, string $backupType = 'config'): array
    {
        $backupType = strtolower(trim($backupType));
        if ($backupType === 'images') {
            return [
                [
                    'key' => 'images',
                    'description' => 'Images Folder',
                    'shortdescription' => 'Images Folder',
                    'required' => true,
                ],
            ];
        }

        $sections = [
            [
                'key' => 'core',
                'description' => 'Core Files',
                'shortdescription' => 'Core Files',
                'required' => true,
            ],
        ];

        $optional = $this->getOptionalTargets();
        foreach ($includedOptionalKeys as $key) {
            if (!isset($optional[$key])) {
                $sections[] = [
                    'key' => $key,
                    'description' => $key,
                    'shortdescription' => $key,
                    'required' => false,
                ];
                continue;
            }

            $description = trim((string)($optional[$key]['description'] ?? ''));
            $shortDescription = trim((string)($optional[$key]['shortdescription'] ?? ''));
            if ($shortDescription === '') {
                $shortDescription = ($description !== '') ? $description : $key;
            }
            if ($description === '') {
                $description = $shortDescription;
            }

            $sections[] = [
                'key' => $key,
                'description' => $description,
                'shortdescription' => $shortDescription,
                'required' => false,
            ];
        }

        return $sections;
    }

    /**
     * Gets the archive root used for image backups.
     */
    private function getImagesArchiveTarget(): string
    {
        return 'images';
    }

    /**
     * Lists image day folders available under the Allsky images directory.
     *
     * @return array<int, string>
     */
    private function getImagesFolderList(): array
    {
        $base = $this->allskyHome . '/' . $this->getImagesArchiveTarget();
        if (!is_dir($base) || !is_readable($base)) {
            return [];
        }

        $folders = [];
        $entries = @scandir($base);
        if ($entries === false) {
            return [];
        }
        foreach ($entries as $entry) {
            $entry = trim((string)$entry);
            if ($entry === '' || $entry === '.' || $entry === '..') {
                continue;
            }
            $full = $base . '/' . $entry;
            if (is_dir($full)) {
                $folders[] = $entry;
            }
        }

        sort($folders, SORT_NATURAL | SORT_FLAG_CASE);
        return $folders;
    }

    /**
     * Calculates the total size of readable files in a directory tree.
     *
     * Python cache directories are skipped because they are not useful backup
     * content and can make size estimates noisy.
     *
     * @param string $path Directory to measure.
     */
    private function getDirectorySizeBytes(string $path): int
    {
        if ($path === '' || !is_dir($path) || !is_readable($path)) {
            return 0;
        }

        $bytes = 0;
        try {
            $iter = new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator($path, FilesystemIterator::SKIP_DOTS),
                RecursiveIteratorIterator::SELF_FIRST
            );
            foreach ($iter as $item) {
                if ($item->isFile()) {
                    $normalisedPath = str_replace('\\', '/', (string)$item->getPathname());
                    if (strpos($normalisedPath, '/__pycache__/') !== false) {
                        continue;
                    }
                    $size = $item->getSize();
                    if ($size !== false) {
                        $bytes += (int)$size;
                    }
                }
            }
        } catch (Throwable $e) {
            return 0;
        }

        return (int)max(0, $bytes);
    }

    /**
     * Calculates the size of a file or directory inside the Allsky tree.
     *
     * @param string $relativePath Path relative to the Allsky installation root.
     */
    private function getPathSizeBytes(string $relativePath): int
    {
        $path = ltrim(trim($relativePath), '/');
        if ($path === '' || preg_match('/(^|\/)\.\.(\/|$)/', $path)) {
            return 0;
        }

        $fullPath = $this->allskyHome . '/' . $path;
        if (is_file($fullPath)) {
            $size = @filesize($fullPath);
            return ($size === false) ? 0 : (int)$size;
        }
        if (is_dir($fullPath)) {
            return $this->getDirectorySizeBytes($fullPath);
        }
        return 0;
    }

    /**
     * Estimates compressed archive size for planning and display.
     *
     * @param int $rawBytes Uncompressed byte count.
     */
    private function estimateCompressedSizeBytes(int $rawBytes): int
    {
        if ($rawBytes <= 0) {
            return 0;
        }

        // Images are usually already compressed, so estimate only modest reduction.
        return (int)max(0, round($rawBytes * 0.92));
    }

    /**
     * Starts or stops the Allsky service with sudo.
     *
     * @param string $action Service action, `start` or `stop`.
     * @return array{ok: bool, message?: string}
     */
    private function controlAllskyService(string $action): array
    {
        $action = strtolower(trim($action));
        if ($action !== 'stop' && $action !== 'start') {
            return ['ok' => false, 'message' => 'Invalid service action requested.'];
        }

        $cmd = 'sudo -n systemctl ' . escapeshellarg($action) . ' allsky 2>&1';
        $output = [];
        $ret = 0;
        exec($cmd, $output, $ret);
        if ($ret !== 0) {
            $details = trim(implode("\n", $output));
            $message = 'Unable to ' . $action . ' allsky service.';
            if ($details !== '') {
                $message .= ' ' . $details;
            }
            return ['ok' => false, 'message' => $message];
        }

        return ['ok' => true];
    }

    /**
     * Checks whether an optional section needs Allsky stopped for consistency.
     *
     * @param string $targetKey Optional target key from backup metadata.
     */
    private function optionalTargetRequiresAllskyStop(string $targetKey): bool
    {
        $key = trim($targetKey);
        if ($key === '') {
            return false;
        }

        $optional = $this->getOptionalTargets();
        if (!isset($optional[$key]) || !is_array($optional[$key])) {
            return false;
        }

        $paths = $optional[$key]['path'] ?? [];
        if (is_string($paths)) {
            $paths = [$paths];
        }
        if (!is_array($paths)) {
            return false;
        }

        foreach ($paths as $path) {
            $normalised = $this->normaliseArchiveTarget((string)$path);
            if ($normalised === 'config/myFiles/allsky.db') {
                return true;
            }
        }

        return false;
    }

    /**
     * Checks whether any selected optional section requires the service to stop.
     *
     * @param array<int, string> $selectedOptionalTargetKeys Optional target keys selected by the user.
     */
    private function selectedOptionalTargetsRequireAllskyStop(array $selectedOptionalTargetKeys): bool
    {
        foreach ($selectedOptionalTargetKeys as $key) {
            if ($this->optionalTargetRequiresAllskyStop((string)$key)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Builds size statistics for image folders available for backup.
     *
     * @return array<string, mixed>
     */
    private function getImagesFolderStats(): array
    {
        $folders = $this->getImagesFolderList();
        $base = $this->allskyHome . '/' . $this->getImagesArchiveTarget();

        $stats = [];
        $totalSize = 0;
        $totalEstimated = 0;
        foreach ($folders as $folder) {
            $folderName = trim((string)$folder);
            if ($folderName === '') {
                continue;
            }
            $fullPath = $base . '/' . $folderName;
            $sizeBytes = $this->getDirectorySizeBytes($fullPath);
            $estimatedBytes = $this->estimateCompressedSizeBytes($sizeBytes);
            $stats[] = [
                'name' => $folderName,
                'sizeBytes' => $sizeBytes,
                'estimatedCompressedBytes' => $estimatedBytes,
            ];
            $totalSize += (int)$sizeBytes;
            $totalEstimated += (int)$estimatedBytes;
        }

        return [
            'folders' => $stats,
            'totalSizeBytes' => (int)max(0, $totalSize),
            'totalEstimatedCompressedBytes' => (int)max(0, $totalEstimated),
        ];
    }

    /**
     * Builds size statistics for core and optional configuration sections.
     *
     * @return array<string, mixed>
     */
    private function getConfigSectionStats(): array
    {
        $coreTargets = $this->getArchiveTargets([]);
        $coreSize = 0;
        foreach ($coreTargets as $target) {
            $coreSize += $this->getPathSizeBytes((string)$target);
        }
        $coreSize = max(0, (int)$coreSize);

        $optionalStats = [];
        $optionalTargets = $this->getOptionalTargets();
        foreach ($optionalTargets as $key => $_def) {
            $targets = $this->getArchiveTargetsForSectionKey((string)$key, 'config', []);
            $size = 0;
            foreach ($targets as $target) {
                $size += $this->getPathSizeBytes((string)$target);
            }
            $size = max(0, (int)$size);
            $optionalStats[(string)$key] = [
                'sizeBytes' => $size,
                'estimatedCompressedBytes' => $this->estimateCompressedSizeBytes($size),
            ];
        }

        return [
            'core' => [
                'sizeBytes' => $coreSize,
                'estimatedCompressedBytes' => $this->estimateCompressedSizeBytes($coreSize),
            ],
            'optional' => $optionalStats,
        ];
    }

    /**
     * Lists safe archive member paths after full tar metadata inspection.
     *
     * @param string $backupPath Path to a tar.gz backup archive.
     * @return array<int, string> Normalised archive member paths.
     */
    private function listArchiveEntries(string $backupPath): array
    {
        $inspection = $this->inspectArchiveMembers($backupPath);
        if (empty($inspection['ok']) || !isset($inspection['entries']) || !is_array($inspection['entries'])) {
            return [];
        }

        $entries = [];
        foreach ($inspection['entries'] as $entry) {
            if (!is_array($entry)) {
                continue;
            }
            $path = trim((string)($entry['path'] ?? ''));
            if ($path !== '') {
                $entries[] = $path;
            }
        }
        return $entries;
    }

    /**
     * Returns the preferred tar executable for archive operations.
     *
     * @return string Absolute tar path when available, otherwise the PATH lookup name.
     */
    private function getTarBinary(): string
    {
        return is_executable('/bin/tar') ? '/bin/tar' : 'tar';
    }

    /**
     * Normalises a tar member path for internal comparison.
     *
     * @param string $path Raw archive member path.
     * @return string Trimmed path without a trailing slash.
     */
    private function normaliseArchiveMemberPath(string $path): string
    {
        return rtrim(trim($path), '/');
    }

    /**
     * Returns the path-safety error for an archive member, if any.
     *
     * @param string $path Raw archive member path from tar metadata.
     * @return string Empty when safe; otherwise a user-facing rejection reason.
     */
    private function getArchiveMemberPathError(string $path): string
    {
        $path = trim($path);
        if ($path === '') {
            return 'empty archive member paths are not allowed';
        }
        if (preg_match('/[\x00-\x1F\x7F]/', $path)) {
            return 'control characters are not allowed in archive member paths';
        }
        if (strpos($path, '\\') !== false) {
            return 'backslash path separators are not allowed';
        }
        if (str_starts_with($path, '/')) {
            return 'absolute paths are not allowed';
        }
        if (preg_match('/^[A-Za-z]:\//', $path)) {
            return 'absolute paths are not allowed';
        }

        $normalised = $this->normaliseArchiveMemberPath($path);
        if ($normalised === '' || $normalised === '.') {
            return 'root archive members are not allowed';
        }

        foreach (explode('/', $normalised) as $segment) {
            if ($segment === '' || $segment === '.' || $segment === '..') {
                return "'.' and '..' path segments are not allowed";
            }
        }

        return '';
    }

    /**
     * Returns the type-safety error for an archive member, if any.
     *
     * Only regular files and directories are permitted. Directories are allowed
     * for metadata/listing checks but are never copied into place during restore.
     *
     * @param string $type First character from tar verbose permissions output.
     * @return string Empty when safe; otherwise a user-facing rejection reason.
     */
    private function getArchiveMemberTypeError(string $type): string
    {
        if ($type === '-' || $type === 'd') {
            return '';
        }
        if ($type === 'l') {
            return 'symbolic links are not allowed';
        }
        if ($type === 'h') {
            return 'hard links are not allowed';
        }
        if ($type === 'c' || $type === 'b') {
            return 'device files are not allowed';
        }
        if ($type === 'p') {
            return 'FIFO entries are not allowed';
        }

        return 'unsupported archive member type';
    }

    /**
     * Parses a single tar -tv output line into member metadata.
     *
     * @param string $line One non-warning line from tar verbose output.
     * @return array<string, string>|null Parsed member metadata, or null for unparseable lines.
     */
    private function parseTarVerboseMember(string $line): ?array
    {
        $line = trim($line);
        if ($line === '' || preg_match('/^(?:\/\S+\/)?tar: /', $line)) {
            return null;
        }

        $type = substr($line, 0, 1);
        $parts = preg_split('/\s+/', $line, 6);
        if (!is_array($parts) || count($parts) < 6) {
            return null;
        }

        $path = trim((string)$parts[5]);
        if ($type === 'l') {
            $path = preg_replace('/\s+->\s+.*$/', '', $path) ?? $path;
        } else if ($type === 'h') {
            $path = preg_replace('/\s+link to\s+.*$/', '', $path) ?? $path;
        }

        $path = trim($path);
        return [
            'type' => $type,
            'path' => $this->normaliseArchiveMemberPath($path),
            'rawPath' => $path,
            'listing' => $line,
        ];
    }

    /**
     * Inspects archive members and rejects unsafe paths or member types.
     *
     * @param string $archivePath Path to a tar.gz backup archive.
     * @return array<string, mixed>
     */
    private function inspectArchiveMembers(string $archivePath): array
    {
        if (!is_file($archivePath) || !is_readable($archivePath)) {
            return ['ok' => false, 'message' => 'Backup file is not readable.'];
        }

        $cmd = $this->getTarBinary() . ' -tvzf ' . escapeshellarg($archivePath) . ' 2>&1';
        $output = [];
        $ret = 0;
        exec($cmd, $output, $ret);
        if ($ret !== 0) {
            return ['ok' => false, 'message' => 'Backup file is not a valid tar.gz archive.'];
        }

        $entries = [];
        foreach ($output as $line) {
            $line = trim((string)$line);
            if ($line === '' || preg_match('/^(?:\/\S+\/)?tar: /', $line)) {
                continue;
            }

            $entry = $this->parseTarVerboseMember($line);
            if ($entry === null) {
                return ['ok' => false, 'message' => 'Backup archive member metadata could not be inspected.'];
            }

            $typeError = $this->getArchiveMemberTypeError((string)$entry['type']);
            if ($typeError !== '') {
                $label = (string)($entry['path'] !== '' ? $entry['path'] : $entry['rawPath']);
                return ['ok' => false, 'message' => "Backup archive contains unsafe member '$label': $typeError."];
            }

            $pathError = $this->getArchiveMemberPathError((string)$entry['rawPath']);
            if ($pathError !== '') {
                $label = (string)($entry['rawPath'] !== '' ? $entry['rawPath'] : $entry['path']);
                return ['ok' => false, 'message' => "Backup archive contains unsafe member '$label': $pathError."];
            }

            $entries[] = $entry;
        }

        if (empty($entries)) {
            return ['ok' => false, 'message' => 'Backup archive does not contain any inspectable members.'];
        }

        return ['ok' => true, 'entries' => $entries];
    }

    /**
     * Checks whether a backup includes user module files.
     *
     * @param string $backupPath Path to a tar.gz backup archive.
     * @param array<string, mixed> $backupMeta Metadata read from that backup.
     */
    private function backupContainsModulesFiles(string $backupPath, array $backupMeta): bool
    {
        $includedOptional = $this->getIncludedOptionalTargetKeysFromMetadata($backupMeta);
        if (in_array('modules', $includedOptional, true)) {
            return true;
        }

        foreach ($this->listArchiveEntries($backupPath) as $entry) {
            if (strpos($entry, 'config/myFiles/modules/') === 0) {
                return true;
            }
        }
        return false;
    }

    /**
     * Lists top-level Python module files carried in a backup archive.
     *
     * @param string $backupPath Path to a tar.gz backup archive.
     * @return array<int, string> Module filenames.
     */
    private function getModulesFromBackupArchive(string $backupPath): array
    {
        $modules = [];
        foreach ($this->listArchiveEntries($backupPath) as $entry) {
            if (strpos($entry, 'config/myFiles/modules/') !== 0) {
                continue;
            }

            $relative = substr($entry, strlen('config/myFiles/modules/'));
            if ($relative === false || $relative === '') {
                continue;
            }
            if (strpos($relative, '/') !== false) {
                continue; // Only list top-level module files.
            }

            $name = basename($relative);
            if ($name === '' || !preg_match('/\.py$/i', $name)) {
                continue;
            }
            $modules[$name] = true;
        }

        $list = array_keys($modules);
        sort($list, SORT_NATURAL | SORT_FLAG_CASE);
        return $list;
    }

    /**
     * Lists locally installed user module files.
     *
     * @return array<int, string> Module filenames.
     */
    private function getModulesFromLocalUserModules(): array
    {
        $dir = $this->allskyHome . '/config/myFiles/modules';
        if (!is_dir($dir) || !is_readable($dir)) {
            return [];
        }

        $modules = [];
        $entries = @scandir($dir);
        if ($entries === false) {
            return [];
        }
        foreach ($entries as $entry) {
            $name = trim((string)$entry);
            if ($name === '' || $name === '.' || $name === '..') {
                continue;
            }
            if (!preg_match('/\.py$/i', $name)) {
                continue;
            }
            $full = $dir . '/' . $name;
            if (is_file($full)) {
                $modules[$name] = true;
            }
        }

        $list = array_keys($modules);
        sort($list, SORT_NATURAL | SORT_FLAG_CASE);
        return $list;
    }

    /**
     * Resolves the configured Allsky owner account.
     */
    private function getConfiguredAllskyOwner(): string
    {
        if ($this->cachedAllskyOwner !== null) {
            return $this->cachedAllskyOwner;
        }

        $owner = '';
        $variablesFile = $this->allskyHome . '/variables.json';
        if (is_file($variablesFile) && is_readable($variablesFile)) {
            $raw = @file_get_contents($variablesFile);
            if ($raw !== false && trim($raw) !== '') {
                $decoded = json_decode($raw, true);
                if (is_array($decoded) && isset($decoded['ALLSKY_OWNER'])) {
                    $owner = trim((string)$decoded['ALLSKY_OWNER']);
                }
            }
        }

        if ($owner === '' && defined('ALLSKY_OWNER')) {
            $owner = trim((string)ALLSKY_OWNER);
        }

        $this->cachedAllskyOwner = $owner;
        return $this->cachedAllskyOwner;
    }

    /**
     * Reads the currently installed Allsky version.
     */
    private function getCurrentVersion(): string
    {
        $versionFile = $this->allskyHome . '/version';
        if (!is_file($versionFile) || !is_readable($versionFile)) {
            return 'unknown';
        }

        $lines = @file($versionFile, FILE_IGNORE_NEW_LINES);
        if ($lines === false || !isset($lines[0])) {
            return 'unknown';
        }

        $version = trim((string)$lines[0]);
        return ($version === '') ? 'unknown' : $version;
    }

    /**
     * Reads current camera type and model from settings.
     *
     * @return array{cameratype: string, cameramodel: string}
     */
    private function getCurrentCameraInfo(): array
    {
        $settingsFile = $this->allskyConfig . '/settings.json';
        if (!is_file($settingsFile) || !is_readable($settingsFile)) {
            return ['cameratype' => 'unknown', 'cameramodel' => 'unknown'];
        }

        $raw = @file_get_contents($settingsFile);
        if ($raw === false || trim($raw) === '') {
            return ['cameratype' => 'unknown', 'cameramodel' => 'unknown'];
        }

        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            return ['cameratype' => 'unknown', 'cameramodel' => 'unknown'];
        }

        $type = trim((string)($decoded['cameratype'] ?? ''));
        $model = trim((string)($decoded['cameramodel'] ?? ''));

        return [
            'cameratype' => ($type === '') ? 'unknown' : $type,
            'cameramodel' => ($model === '') ? 'unknown' : $model,
        ];
    }

    /**
     * Converts a camera value into a filename-safe token.
     *
     * @param string $value Camera type or model value.
     */
    private function cameraToken(string $value): string
    {
        $token = str_replace(' ', '_', trim($value));
        $token = preg_replace('/[^A-Za-z0-9._-]/', '_', $token);
        if ($token === null || $token === '') {
            return 'unknown';
        }
        return $token;
    }

    /**
     * Gets the camera-specific settings file used in backups.
     */
    private function getResolvedSettingsFile(): string
    {
        $cameraInfo = $this->getCurrentCameraInfo();
        $type = $this->cameraToken((string)$cameraInfo['cameratype']);
        $model = $this->cameraToken((string)$cameraInfo['cameramodel']);
        return 'config/settings_' . $type . '_' . $model . '.json';
    }

    /**
     * Gets the camera-specific cc file used in backups.
     */
    private function getResolvedCcFile(): string
    {
        $cameraInfo = $this->getCurrentCameraInfo();
        $type = $this->cameraToken((string)$cameraInfo['cameratype']);
        $model = $this->cameraToken((string)$cameraInfo['cameramodel']);
        return 'config/cc_' . $type . '_' . $model . '.json';
    }

    /**
     * Gets configured core backup targets, falling back to defaults.
     *
     * @return array<int, string>
     */
    private function getBackupTargets(): array
    {
        $metadata = $this->readBackupMetadata();
        if (isset($metadata['backupTargets']) && is_array($metadata['backupTargets'])) {
            $targets = [];
            foreach ($metadata['backupTargets'] as $target) {
                $target = trim((string)$target);
                if ($target !== '') {
                    $targets[] = $target;
                }
            }
            if (!empty($targets)) {
                return array_values(array_unique($targets));
            }
        }
        return $this->getDefaultBackupTargets();
    }

    /**
     * Gets configured optional backup targets, falling back to defaults.
     *
     * @return array<string, array{description: string, shortdescription: string, path: string|array<int, string>}>
     */
    private function getOptionalTargets(): array
    {
        $metadata = $this->readBackupMetadata();
        if (isset($metadata['optionalTargets'])) {
            $normalised = $this->normaliseOptionalTargets($metadata['optionalTargets']);
            if (!empty($normalised)) {
                return $normalised;
            }
        }
        return $this->getDefaultOptionalTargets();
    }

    /**
     * Normalises a configured backup target into the archive path used for tar.
     *
     * Camera-specific settings and cc files are resolved from their stable
     * `config/settings.json` and `config/cc.json` aliases.
     *
     * @param string $target Configured target path.
     * @return string Archive target path, or an empty string when unusable.
     */
    private function normaliseArchiveTarget(string $target): string
    {
        $clean = trim($target);
        if ($clean === '') {
            return '';
        }
        if (str_starts_with($clean, './')) {
            $clean = substr($clean, 2);
        }
        if (str_ends_with($clean, '/*')) {
            $clean = substr($clean, 0, -2);
        }
        if (str_starts_with($clean, '/')) {
            $clean = substr($clean, 1);
        }
        if ($clean === 'config/settings.json') {
            $clean = $this->getResolvedSettingsFile();
        } else if ($clean === 'config/cc.json') {
            $clean = $this->getResolvedCcFile();
        }
        return trim($clean);
    }

    /**
     * Builds archive target paths for core plus selected optional sections.
     *
     * @param array<int, string> $selectedOptionalTargetKeys Optional section keys chosen for backup.
     * @return array<int, string> Archive target paths.
     */
    private function getArchiveTargets(array $selectedOptionalTargetKeys = []): array
    {
        $targets = [];
        foreach ($this->getBackupTargets() as $target) {
            $clean = $this->normaliseArchiveTarget((string)$target);
            if ($clean !== '') {
                $targets[] = $clean;
            }
        }

        $optionalDefinitions = $this->getOptionalTargets();
        foreach ($selectedOptionalTargetKeys as $key) {
            $name = trim((string)$key);
            if ($name === '' || !isset($optionalDefinitions[$name])) {
                continue;
            }
            $paths = $optionalDefinitions[$name]['path'] ?? [];
            if (is_string($paths)) {
                $paths = [$paths];
            }
            if (!is_array($paths)) {
                continue;
            }
            foreach ($paths as $path) {
                $clean = $this->normaliseArchiveTarget((string)$path);
                if ($clean !== '') {
                    $targets[] = $clean;
                }
            }
        }

        $targets = array_values(array_unique($targets));
        sort($targets, SORT_STRING);
        return $targets;
    }

    /**
     * Resolves archive targets belonging to one restore section.
     *
     * @param string $sectionKey Restore section key.
     * @param string $backupType Backup type, usually `config` or `images`.
     * @param array<string, mixed> $backupMeta Metadata read from the selected backup.
     * @return array<int, string> Archive target paths.
     */
    private function getArchiveTargetsForSectionKey(string $sectionKey, string $backupType = 'config', array $backupMeta = []): array
    {
        $targets = [];
        $key = trim($sectionKey);
        if ($key === '') {
            return $targets;
        }

        $backupType = strtolower(trim($backupType));
        if ($backupType === 'images') {
            if ($key === 'images') {
                $imageTargets = $backupMeta['imageTargets'] ?? [];
                if (is_array($imageTargets) && !empty($imageTargets)) {
                    foreach ($imageTargets as $target) {
                        $clean = $this->normaliseArchiveTarget((string)$target);
                        if ($clean !== '') {
                            $targets[] = $clean;
                        }
                    }
                } else {
                    $img = $this->getImagesArchiveTarget();
                    if ($img !== '') {
                        $targets[] = $img;
                    }
                }
            }
            return $targets;
        }

        if ($key === 'core') {
            foreach ($this->getBackupTargets() as $target) {
                $clean = $this->normaliseArchiveTarget((string)$target);
                if ($clean !== '') {
                    $targets[] = $clean;
                }
            }
        } else {
            $optionalDefinitions = $this->getOptionalTargets();
            if (!isset($optionalDefinitions[$key])) {
                return [];
            }

            $paths = $optionalDefinitions[$key]['path'] ?? [];
            if (is_string($paths)) {
                $paths = [$paths];
            }
            if (!is_array($paths)) {
                return [];
            }
            foreach ($paths as $path) {
                $clean = $this->normaliseArchiveTarget((string)$path);
                if ($clean !== '') {
                    $targets[] = $clean;
                }
            }
        }

        $targets = array_values(array_unique($targets));
        sort($targets, SORT_STRING);
        return $targets;
    }

    /**
     * Resolves requested restore sections against sections present in a backup.
     *
     * @param array<string, mixed> $backupMeta Metadata read from the selected backup.
     * @param array<int, string> $selectedSections Section keys requested by the user.
     * @return array<int, string> Section keys that may be restored.
     */
    private function resolveSelectedSectionKeys(array $backupMeta, array $selectedSections): array
    {
        $includedSections = $backupMeta['includedSections'] ?? $this->getIncludedSections($this->getIncludedOptionalTargetKeysFromMetadata($backupMeta));
        $allowed = [];
        if (is_array($includedSections)) {
            foreach ($includedSections as $section) {
                if (!is_array($section)) {
                    continue;
                }
                $key = trim((string)($section['key'] ?? ''));
                if ($key !== '') {
                    $allowed[$key] = true;
                }
            }
        }

        if (empty($allowed)) {
            $allowed['core'] = true;
        }

        $resolved = [];
        foreach ($selectedSections as $sectionKey) {
            $key = trim((string)$sectionKey);
            if ($key !== '' && isset($allowed[$key])) {
                $resolved[$key] = true;
            }
        }

        if (empty($resolved)) {
            $resolved = $allowed;
        }

        $keys = array_keys($resolved);
        sort($keys, SORT_STRING);
        return $keys;
    }

    /**
     * Infers restore sections from an advanced file selection.
     *
     * @param array<string, mixed> $backupMeta Metadata read from the selected backup.
     * @param string $backupType Backup type, usually `config` or `images`.
     * @param array<int, string> $selectedTargets Archive paths requested by the user.
     * @param array<int, string> $fallbackSelectedSections Section keys to use when inference is not possible.
     * @return array<int, string> Section keys represented by the selected targets.
     */
    private function resolveSelectedSectionKeysForTargets(array $backupMeta, string $backupType, array $selectedTargets, array $fallbackSelectedSections = []): array
    {
        $targets = [];
        foreach ($selectedTargets as $target) {
            $clean = ltrim(trim((string)$target), '/');
            if ($clean !== '') {
                $targets[$clean] = true;
            }
        }
        $targets = array_keys($targets);
        if (empty($targets)) {
            return $this->resolveSelectedSectionKeys($backupMeta, $fallbackSelectedSections);
        }

        $includedSections = $backupMeta['includedSections'] ?? $this->getIncludedSections($this->getIncludedOptionalTargetKeysFromMetadata($backupMeta));
        $allowedKeys = [];
        if (is_array($includedSections)) {
            foreach ($includedSections as $section) {
                if (!is_array($section)) {
                    continue;
                }
                $key = trim((string)($section['key'] ?? ''));
                if ($key !== '') {
                    $allowedKeys[$key] = true;
                }
            }
        }
        if (empty($allowedKeys)) {
            $allowedKeys['core'] = true;
        }

        $resolved = [];
        foreach (array_keys($allowedKeys) as $sectionKey) {
            $sectionTargets = $this->getArchiveTargetsForSectionKey((string)$sectionKey, $backupType, $backupMeta);
            if (empty($sectionTargets)) {
                continue;
            }
            foreach ($targets as $targetPath) {
                foreach ($sectionTargets as $sectionTarget) {
                    $base = ltrim(trim((string)$sectionTarget), '/');
                    if ($base === '') {
                        continue;
                    }
                    if (
                        $targetPath === $base ||
                        strpos($targetPath, $base . '/') === 0 ||
                        strpos($base, $targetPath . '/') === 0
                    ) {
                        $resolved[$sectionKey] = true;
                        break 2;
                    }
                }
            }
        }

        if (empty($resolved)) {
            return $this->resolveSelectedSectionKeys($backupMeta, $fallbackSelectedSections);
        }

        $keys = array_keys($resolved);
        sort($keys, SORT_STRING);
        return $keys;
    }

    /**
     * Keeps only restore targets that are present in the inspected archive list.
     *
     * @param array<int, string> $targets Requested target paths.
     * @param array<int, string> $archiveEntries Safe archive member paths.
     * @return array<int, string> Requested targets that match archive content.
     */
    private function filterTargetsByArchiveEntries(array $targets, array $archiveEntries): array
    {
        if (empty($targets) || empty($archiveEntries)) {
            return [];
        }

        $filtered = [];
        foreach ($targets as $target) {
            $target = trim((string)$target);
            if ($target === '') {
                continue;
            }
            foreach ($archiveEntries as $entry) {
                if ($entry === $target || strpos($entry, $target . '/') === 0) {
                    $filtered[$target] = true;
                    break;
                }
            }
        }

        $result = array_keys($filtered);
        sort($result, SORT_STRING);
        return $result;
    }

    /**
     * Keeps permission metadata for restored targets only.
     *
     * @param array<string, array<string, mixed>> $permissions Permission metadata from backup metadata.
     * @param array<int, string> $targets Restore target paths.
     * @return array<string, array<string, mixed>> Permission metadata to apply after restore.
     */
    private function filterPermissionsForTargets(array $permissions, array $targets): array
    {
        if (empty($permissions) || empty($targets)) {
            return [];
        }

        $filtered = [];
        foreach ($permissions as $relativePath => $info) {
            $path = ltrim((string)$relativePath, '/');
            if ($path === '') {
                continue;
            }
            foreach ($targets as $target) {
                $target = ltrim((string)$target, '/');
                if ($target === '') {
                    continue;
                }
                if ($path === $target || strpos($path, $target . '/') === 0) {
                    $filtered[$path] = $info;
                    break;
                }
            }
        }

        ksort($filtered, SORT_STRING);
        return $filtered;
    }

    /**
     * Reduces inspected archive metadata to regular files under restore targets.
     *
     * @param array<int, array<string, string>> $archiveMembers Inspected archive members.
     * @param array<int, string> $targets Archive paths selected by restore sections or advanced file selection.
     * @return array<int, array<string, string>> Regular file members allowed for restore.
     */
    private function filterRegularArchiveMembersForTargets(array $archiveMembers, array $targets): array
    {
        if (empty($archiveMembers) || empty($targets)) {
            return [];
        }

        $normalisedTargets = [];
        foreach ($targets as $target) {
            $target = $this->normaliseArchiveMemberPath(ltrim(trim((string)$target), '/'));
            if ($target !== '' && $this->getArchiveMemberPathError($target) === '') {
                $normalisedTargets[$target] = true;
            }
        }
        if (empty($normalisedTargets)) {
            return [];
        }

        $filtered = [];
        foreach ($archiveMembers as $member) {
            if (!is_array($member) || (string)($member['type'] ?? '') !== '-') {
                continue;
            }

            $path = $this->normaliseArchiveMemberPath((string)($member['path'] ?? ''));
            if ($path === '' || $path === 'metadata.json') {
                continue;
            }

            foreach (array_keys($normalisedTargets) as $target) {
                if ($path === $target || strpos($path, $target . '/') === 0) {
                    $filtered[$path] = $member;
                    break;
                }
            }
        }

        ksort($filtered, SORT_STRING);
        return array_values($filtered);
    }

    /**
     * Creates a private temporary directory for non-root restore extraction.
     *
     * @return string Temporary directory path, or an empty string on failure.
     */
    private function createRestoreTempDir(): string
    {
        $base = rtrim(sys_get_temp_dir(), '/\\');
        $tmpDir = $base . '/allsky-restore-' . uniqid('', true);
        if (!@mkdir($tmpDir, 0700, true)) {
            return '';
        }

        return $tmpDir;
    }

    /**
     * Deletes a temporary directory tree created during restore.
     *
     * @param string $path Directory path to delete.
     */
    private function deleteDirectoryTree(string $path): void
    {
        if ($path === '' || !is_dir($path)) {
            return;
        }

        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($path, FilesystemIterator::SKIP_DOTS),
            RecursiveIteratorIterator::CHILD_FIRST
        );
        foreach ($iterator as $item) {
            $itemPath = (string)$item->getPathname();
            if ($item->isDir() && !$item->isLink()) {
                @rmdir($itemPath);
            } else {
                @unlink($itemPath);
            }
        }
        @rmdir($path);
    }

    /**
     * Extracts validated archive members into a staging directory as the WebUI user.
     *
     * @param string $backupPath Path to the tar.gz backup archive.
     * @param string $destinationDir Existing writable staging directory.
     * @param array<int, array<string, string>> $archiveMembers Regular file members selected for restore.
     * @return array{ok: bool, message?: string}
     */
    private function extractArchiveMembersToDirectory(string $backupPath, string $destinationDir, array $archiveMembers): array
    {
        if (empty($archiveMembers)) {
            return ['ok' => false, 'message' => 'No regular files were selected for extraction.'];
        }
        if (!is_dir($destinationDir) || !is_writable($destinationDir)) {
            return ['ok' => false, 'message' => 'Restore staging directory is not writable.'];
        }

        $rawPaths = [];
        foreach ($archiveMembers as $member) {
            if (!is_array($member)) {
                continue;
            }
            $rawPath = trim((string)($member['rawPath'] ?? ''));
            if ($rawPath !== '') {
                $rawPaths[$rawPath] = true;
            }
        }
        $rawPaths = array_keys($rawPaths);
        sort($rawPaths, SORT_STRING);
        if (empty($rawPaths)) {
            return ['ok' => false, 'message' => 'No regular files were selected for extraction.'];
        }

        $listFile = tempnam(sys_get_temp_dir(), 'allsky-restore-list-');
        if ($listFile === false) {
            return ['ok' => false, 'message' => 'Unable to create restore extraction allow-list.'];
        }

        $listContent = implode("\n", $rawPaths) . "\n";
        if (@file_put_contents($listFile, $listContent) === false) {
            @unlink($listFile);
            return ['ok' => false, 'message' => 'Unable to write restore extraction allow-list.'];
        }

        $tarBinary = $this->getTarBinary();
        $cmd = $tarBinary . ' -xzf ' . escapeshellarg($backupPath) .
            ' -C ' . escapeshellarg($destinationDir) .
            ' --no-same-owner --no-same-permissions --overwrite -m' .
            ' --verbatim-files-from -T ' . escapeshellarg($listFile) .
            ' 2>&1';

        $output = [];
        $ret = 0;
        exec($cmd, $output, $ret);
        @unlink($listFile);
        if ($ret === 0) {
            return ['ok' => true];
        }

        $details = trim(implode("\n", $output));
        $message = 'Restore staging extraction failed.';
        if ($details !== '') {
            $message .= ' ' . $details;
        }
        return ['ok' => false, 'message' => $message];
    }

    /**
     * Copies staged, verified regular files into the Allsky tree with sudo.
     *
     * Each staged file is rechecked before copying so symlinks or paths escaping
     * the staging directory cannot be copied into place.
     *
     * @param string $stagingDir Temporary staging directory containing extracted files.
     * @param array<int, array<string, string>> $archiveMembers Regular file members selected for restore.
     * @return array{ok: bool, message?: string, files?: array<int, string>}
     */
    private function copyStagedRegularFiles(string $stagingDir, array $archiveMembers): array
    {
        if (empty($archiveMembers)) {
            return ['ok' => false, 'message' => 'No regular files were selected for restore.'];
        }

        $stagingRoot = realpath($stagingDir);
        if ($stagingRoot === false || !is_dir($stagingRoot)) {
            return ['ok' => false, 'message' => 'Restore staging directory is unavailable.'];
        }

        $relativePaths = [];
        foreach ($archiveMembers as $member) {
            if (!is_array($member)) {
                continue;
            }
            $path = $this->normaliseArchiveMemberPath((string)($member['path'] ?? ''));
            if ($path === '') {
                continue;
            }
            $pathError = $this->getArchiveMemberPathError($path);
            if ($pathError !== '') {
                return ['ok' => false, 'message' => "Restore staged file '$path' is unsafe: $pathError."];
            }

            $source = $stagingRoot . '/' . $path;
            if (is_link($source) || !is_file($source)) {
                return ['ok' => false, 'message' => "Restore staged file '$path' is not a regular file."];
            }
            $realSource = realpath($source);
            if ($realSource === false || strpos($realSource, $stagingRoot . '/') !== 0) {
                return ['ok' => false, 'message' => "Restore staged file '$path' resolves outside the staging directory."];
            }

            $destination = $this->allskyHome . '/' . $path;
            if (is_dir($destination) && !is_link($destination)) {
                return ['ok' => false, 'message' => "Restore cannot replace directory '$path' with a file."];
            }

            $relativePaths[$path] = true;
        }

        $relativePaths = array_keys($relativePaths);
        sort($relativePaths, SORT_STRING);
        if (empty($relativePaths)) {
            return ['ok' => false, 'message' => 'No regular files were selected for restore.'];
        }

        $copyBinary = is_executable('/bin/cp') ? '/bin/cp' : 'cp';
        foreach (array_chunk($relativePaths, 120) as $chunk) {
            $cmd = 'cd ' . escapeshellarg($stagingRoot) .
                ' && sudo -n ' . $copyBinary . ' -f --remove-destination --parents --';
            foreach ($chunk as $path) {
                $cmd .= ' ' . escapeshellarg((string)$path);
            }
            $cmd .= ' ' . escapeshellarg($this->allskyHome) . ' 2>&1';

            $output = [];
            $ret = 0;
            exec($cmd, $output, $ret);
            if ($ret !== 0) {
                $details = trim(implode("\n", $output));
                $message = 'Restore failed while copying validated files into place.';
                if (
                    stripos($details, 'a password is required') !== false ||
                    stripos($details, 'terminal is required') !== false
                ) {
                    $message .= ' Configure sudoers with NOPASSWD for file copy during restore.';
                }
                if ($details !== '') {
                    $message .= ' ' . $details;
                }
                return ['ok' => false, 'message' => $message];
            }
        }

        return ['ok' => true, 'files' => $relativePaths];
    }

    /**
     * Creates a restored camera-aware hard link using the privileged copy path.
     *
     * Restored files are copied into place via sudo before ownership metadata is
     * reapplied. On systems with protected hard links enabled, the WebUI user may
     * not be allowed to link those files directly, so use `cp -l` through the
     * same sudo permission already required for restore file copy.
     *
     * @return array{ok: bool, message?: string}
     */
    private function createRestoredHardLink(string $sourcePath, string $linkPath, string $linkLabel, string $sourceLabel): array
    {
        if (!is_file($sourcePath)) {
            return ['ok' => false, 'message' => "Restored file '$sourceLabel' is missing; restore is incomplete."];
        }

        $homeReal = realpath($this->allskyHome);
        $sourceReal = realpath($sourcePath);
        $linkDirReal = realpath(dirname($linkPath));
        if ($homeReal === false || $sourceReal === false || $linkDirReal === false) {
            return ['ok' => false, 'message' => "Unable to validate hard link target '$linkLabel'."];
        }
        if (strpos($sourceReal, $homeReal . '/') !== 0 || strpos($linkDirReal . '/', $homeReal . '/') !== 0) {
            return ['ok' => false, 'message' => "Hard link target '$linkLabel' resolves outside the Allsky directory."];
        }

        if (!is_link($linkPath) && is_file($linkPath)) {
            $sourceStat = @stat($sourcePath);
            $linkStat = @stat($linkPath);
            if (
                is_array($sourceStat) &&
                is_array($linkStat) &&
                (int)$sourceStat['dev'] === (int)$linkStat['dev'] &&
                (int)$sourceStat['ino'] === (int)$linkStat['ino']
            ) {
                return ['ok' => true];
            }
        }

        $copyBinary = is_executable('/bin/cp') ? '/bin/cp' : 'cp';
        $cmd = 'sudo -n ' . $copyBinary .
            ' -flT --remove-destination -- ' .
            escapeshellarg($sourcePath) . ' ' .
            escapeshellarg($linkPath) . ' 2>&1';

        $output = [];
        $ret = 0;
        exec($cmd, $output, $ret);
        if ($ret !== 0) {
            $details = trim(implode("\n", $output));
            $message = "Unable to create hard link '$linkLabel' to '$sourceLabel'.";
            if (
                stripos($details, 'a password is required') !== false ||
                stripos($details, 'terminal is required') !== false
            ) {
                $message .= ' Configure sudoers with NOPASSWD for /bin/cp during restore hard-link creation.';
            }
            if ($details !== '') {
                $message .= ' ' . $details;
            }
            return ['ok' => false, 'message' => $message];
        }

        clearstatcache(true, $sourcePath);
        clearstatcache(true, $linkPath);
        $sourceStat = @stat($sourcePath);
        $linkStat = @stat($linkPath);
        if (
            !is_array($sourceStat) ||
            !is_array($linkStat) ||
            (int)$sourceStat['dev'] !== (int)$linkStat['dev'] ||
            (int)$sourceStat['ino'] !== (int)$linkStat['ino']
        ) {
            return ['ok' => false, 'message' => "Unable to verify hard link '$linkLabel' to '$sourceLabel'."];
        }

        return ['ok' => true];
    }

    /**
     * Ensures the local backup directory exists and is writable by the WebUI.
     *
     * @return array{ok: bool, message?: string}
     */
    private function ensureBackupDir(): array
    {
        $backupDir = $this->getBackupDir();
        if (is_dir($backupDir) && is_writable($backupDir)) {
            return ['ok' => true];
        }

        $homeOwner = basename(dirname($this->allskyHome));
        if ($homeOwner === '' || $homeOwner === '.' || $homeOwner === '/') {
            $homeOwner = 'pi';
        }

        $commands = [
            'sudo -n mkdir -p ' . escapeshellarg($backupDir),
            'sudo -n chown ' . escapeshellarg($homeOwner . ':www-data') . ' ' . escapeshellarg($backupDir),
            'sudo -n chmod 2775 ' . escapeshellarg($backupDir),
        ];

        $allOutput = [];
        foreach ($commands as $cmd) {
            $output = [];
            $ret = 0;
            exec($cmd . ' 2>&1', $output, $ret);
            if ($ret !== 0) {
                $allOutput = array_merge($allOutput, $output);
                $details = trim(implode("\n", $allOutput));
                $message = "Unable to create backup folder '$backupDir'.";
                if (stripos($details, 'a password is required') !== false || stripos($details, 'terminal is required') !== false) {
                    $message .= " Configure sudoers with NOPASSWD for mkdir/chown/chmod on '$backupDir'.";
                }
                if ($details !== '') {
                    $message .= ' ' . $details;
                }
                return ['ok' => false, 'message' => $message];
            }
            $allOutput = array_merge($allOutput, $output);
        }

        if (!is_dir($backupDir) || !is_writable($backupDir)) {
            return ['ok' => false, 'message' => "Unable to create backup folder '$backupDir'."];
        }

        return ['ok' => true];
    }

    /**
     * Lists locally available backup archives and their display metadata.
     *
     * @return array<int, array<string, mixed>>
     */
    private function getBackupList(): array
    {
        $backupDir = $this->getBackupDir();
        $backups = [];

        if (!is_dir($backupDir)) {
            return $backups;
        }

        $files = glob($backupDir . '/*.tar.gz');
        if ($files === false) {
            return $backups;
        }

        rsort($files, SORT_STRING);
        foreach ($files as $file) {
            $size = @filesize($file);
            $created = @filemtime($file);
            $backups[] = [
                'name' => basename($file),
                'path' => $file,
                'sizeBytes' => ($size === false) ? 0 : (int)$size,
                'createdTs' => ($created === false) ? 0 : (int)$created,
            ];
        }

        return $backups;
    }

    /**
     * Resolves a user-supplied backup filename to a readable local path.
     *
     * @param string $selected Filename from the WebUI request.
     */
    private function getBackupPathByName(string $selected): string
    {
        $backupName = trim($selected);
        $backupName = html_entity_decode($backupName, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $backupName = rawurldecode($backupName);
        $backupName = basename($backupName);
        if ($backupName === '') {
            return '';
        }

        $backupPath = $this->getBackupDir() . '/' . $backupName;
        if (!is_file($backupPath) || !is_readable($backupPath)) {
            foreach ($this->getBackupList() as $backup) {
                $name = (string)($backup['name'] ?? '');
                if ($name === $backupName && is_file((string)$backup['path']) && is_readable((string)$backup['path'])) {
                    return (string)$backup['path'];
                }
            }
            return '';
        }

        return $backupPath;
    }

    /**
     * Gets the JSON sidecar path associated with a backup archive.
     *
     * @param string $backupPath Backup archive path.
     */
    private function getBackupSidecarPath(string $backupPath): string
    {
        $path = trim($backupPath);
        if ($path === '') {
            return '';
        }
        if (preg_match('/\.tar\.gz$/i', $path)) {
            return preg_replace('/\.tar\.gz$/i', '.json', $path) ?: ($path . '.json');
        }
        return $path . '.json';
    }

    /**
     * Reads cached metadata stored next to a backup archive.
     *
     * @param string $backupPath Backup archive path.
     * @return array<string, mixed>
     */
    private function readBackupSidecarMetadata(string $backupPath): array
    {
        $sidecar = $this->getBackupSidecarPath($backupPath);
        if ($sidecar === '' || !is_file($sidecar) || !is_readable($sidecar)) {
            return [];
        }

        $raw = @file_get_contents($sidecar);
        if ($raw === false || trim($raw) === '') {
            return [];
        }

        $decoded = json_decode($raw, true);
        return is_array($decoded) ? $decoded : [];
    }

    /**
     * Writes cached metadata next to a backup archive.
     *
     * @param string $backupPath Backup archive path.
     * @param array<string, mixed> $metadata Metadata to cache.
     */
    private function writeBackupSidecarMetadata(string $backupPath, array $metadata): bool
    {
        $sidecar = $this->getBackupSidecarPath($backupPath);
        if ($sidecar === '') {
            return false;
        }

        $encoded = json_encode($metadata, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        if ($encoded === false) {
            return false;
        }

        $ok = @file_put_contents($sidecar, $encoded);
        if ($ok === false) {
            return false;
        }
        @chmod($sidecar, 0664);
        return true;
    }

    /**
     * Reads the WebUI backup configuration metadata file.
     *
     * @return array<string, mixed>
     */
    private function readBackupMetadata(): array
    {
        $metadataFile = $this->getBackupMetadataFile();
        if (!is_file($metadataFile) || !is_readable($metadataFile)) {
            return [];
        }

        $raw = @file_get_contents($metadataFile);
        if ($raw === false || trim($raw) === '') {
            return [];
        }

        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            return [];
        }

        return $decoded;
    }

    /**
     * Writes the WebUI backup configuration metadata file.
     *
     * @param array<string, mixed> $extra Extra metadata values to merge into the file.
     */
    private function writeBackupMetadata(array $extra = []): bool
    {
        $existing = $this->readBackupMetadata();

        $metadata = [
            'backupDirectory' => $this->getBackupDir(),
            'backupTargets' => $this->getBackupTargets(),
            'optionalTargets' => $this->getOptionalTargets(),
        ];

        if (isset($existing['lastRestore'])) {
            $metadata['lastRestore'] = $existing['lastRestore'];
        }

        foreach ($extra as $k => $v) {
            $metadata[$k] = $v;
        }

        $encoded = json_encode($metadata, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        if ($encoded === false) {
            return false;
        }

        $ok = @file_put_contents($this->getBackupMetadataFile(), $encoded);
        if ($ok === false) {
            return false;
        }

        @chmod($this->getBackupMetadataFile(), 0664);
        return true;
    }

    /**
     * Writes a human-readable log for a completed restore.
     *
     * @param array<string, mixed> $details Restore summary and warning details.
     * @return array{ok: bool, message?: string, path?: string}
     */
    private function writeRestoreLog(array $details): array
    {
        $logsDir = $this->allskyConfig . '/logs';
        if (!is_dir($logsDir)) {
            if (!@mkdir($logsDir, 0775, true)) {
                return ['ok' => false, 'message' => "Unable to create restore log directory '$logsDir'."];
            }
        }

        if (!is_writable($logsDir)) {
            return ['ok' => false, 'message' => "Restore log directory '$logsDir' is not writable."];
        }

        $fileName = 'backup-restore-' . $this->formatLocalDate('Ymd-His') . '.log';
        $path = $logsDir . '/' . $fileName;

        $lines = [];
        $lines[] = 'Allsky Restore Log';
        $lines[] = '==================';
        $lines[] = 'Timestamp: ' . $this->formatLocalDate(DATE_TIME_FORMAT);
        $lines[] = 'Backup File: ' . (string)($details['backupFile'] ?? 'unknown');
        $lines[] = 'Backup Type: ' . (string)($details['backupType'] ?? 'unknown');
        $lines[] = 'Backup Version (from): ' . (string)($details['backupVersionFrom'] ?? 'unknown');
        $lines[] = 'Allsky Version (restored to): ' . (string)($details['restoreVersionTo'] ?? 'unknown');
        $lines[] = 'Mode: ' . (string)($details['mode'] ?? 'normal');
        $lines[] = 'Status: SUCCESS';

        if ((string)($details['backupType'] ?? '') === 'config') {
            $lines[] = 'Camera (from): ' . (string)($details['cameraFrom'] ?? 'unknown');
            $lines[] = 'Camera (to): ' . (string)($details['cameraTo'] ?? 'unknown');
        }

        $sections = (isset($details['selectedSections']) && is_array($details['selectedSections'])) ? $details['selectedSections'] : [];
        $sectionLabels = [];
        foreach ($sections as $sectionKey) {
            $key = trim((string)$sectionKey);
            if ($key === '') {
                continue;
            }
            $sectionLabels[] = $this->getRestoreSectionLabel($key);
        }
        $lines[] = 'Selected Sections: ' . (!empty($sectionLabels) ? implode(', ', $sectionLabels) : '(none)');

        $folders = (isset($details['selectedImageFolders']) && is_array($details['selectedImageFolders'])) ? $details['selectedImageFolders'] : [];
        $lines[] = 'Selected Image Folders: ' . (!empty($folders) ? implode(', ', $folders) : '(none)');

        $selectedFiles = (isset($details['selectedFiles']) && is_array($details['selectedFiles'])) ? $details['selectedFiles'] : [];
        $lines[] = 'Selected Files (Advanced): ' . (!empty($selectedFiles) ? (string)count($selectedFiles) : '0');

        $targets = (isset($details['targetsRestored']) && is_array($details['targetsRestored'])) ? $details['targetsRestored'] : [];
        $lines[] = 'Restore Targets Applied: ' . (!empty($targets) ? (string)count($targets) : '0');

        $warning = trim((string)($details['warning'] ?? ''));
        if ($warning !== '') {
            $lines[] = 'Warning: ' . $warning;
        }

        $steps = (isset($details['steps']) && is_array($details['steps'])) ? $details['steps'] : [];
        if (!empty($steps)) {
            $lines[] = '';
            $lines[] = 'Steps:';
            foreach ($steps as $step) {
                $lines[] = '- ' . (string)$step;
            }
        }

        $lines[] = '';
        $lines[] = 'Files Restored:';
        if (!empty($targets)) {
            foreach ($targets as $target) {
                $lines[] = '- ' . (string)$target;
            }
        } else {
            $lines[] = '- (none)';
        }

        $content = implode("\n", $lines) . "\n";
        if (@file_put_contents($path, $content) === false) {
            return ['ok' => false, 'message' => "Unable to write restore log '$path'."];
        }
        @chmod($path, 0664);

        return ['ok' => true, 'path' => $path];
    }

    /**
     * Gets the display label for a restore section key.
     *
     * @param string $sectionKey Restore section key.
     */
    private function getRestoreSectionLabel(string $sectionKey): string
    {
        $key = trim($sectionKey);
        if ($key === '') {
            return '';
        }
        if ($key === 'core') {
            return 'Core Files';
        }
        if ($key === 'images') {
            return 'Images Folder';
        }
        $optional = $this->getOptionalTargets();
        if (isset($optional[$key]) && is_array($optional[$key])) {
            $short = trim((string)($optional[$key]['shortdescription'] ?? ''));
            if ($short !== '') {
                return $short;
            }
            $desc = trim((string)($optional[$key]['description'] ?? ''));
            if ($desc !== '') {
                return $desc;
            }
        }
        return ucfirst($key);
    }

    /**
     * Ensures backup metadata exists and matches the current target definitions.
     */
    private function ensureBackupMetadataFile(): bool
    {
        $metadataFile = $this->getBackupMetadataFile();
        if (!is_file($metadataFile) || !is_readable($metadataFile)) {
            return $this->writeBackupMetadata();
        }

        $raw = @file_get_contents($metadataFile);
        if ($raw === false || trim($raw) === '') {
            return $this->writeBackupMetadata();
        }

        $decoded = json_decode($raw, true);
        if (!is_array($decoded) || !isset($decoded['backupTargets']) || !is_array($decoded['backupTargets'])) {
            return $this->writeBackupMetadata();
        }
        if (isset($decoded['backups'])) {
            return $this->writeBackupMetadata();
        }
        $currentTargets = $this->getBackupTargets();
        $storedTargets = array_values($decoded['backupTargets']);
        if ($storedTargets !== $currentTargets) {
            return $this->writeBackupMetadata();
        }

        if (!isset($decoded['optionalTargets'])) {
            return $this->writeBackupMetadata();
        }
        $storedOptional = $this->normaliseOptionalTargets($decoded['optionalTargets']);
        $currentOptional = $this->getOptionalTargets();
        if (json_encode($storedOptional) !== json_encode($currentOptional)) {
            return $this->writeBackupMetadata();
        }

        return true;
    }

    /**
     * Extracts one safe file from an archive to a string.
     *
     * @param string $backupPath Path to a tar.gz backup archive.
     * @param string $archivePath Archive member path to read.
     */
    private function extractArchiveFile(string $backupPath, string $archivePath): string
    {
        if (!is_file($backupPath) || !is_readable($backupPath)) {
            return '';
        }

        $archivePath = $this->normaliseArchiveMemberPath($archivePath);
        if ($archivePath === '' || $this->getArchiveMemberPathError($archivePath) !== '') {
            return '';
        }

        $cmd = $this->getTarBinary() . ' -xOf ' . escapeshellarg($backupPath) . ' -- ' . escapeshellarg($archivePath) . ' 2>/dev/null';
        $output = [];
        $ret = 0;
        exec($cmd, $output, $ret);
        if ($ret !== 0) {
            return '';
        }

        return implode("\n", $output);
    }

    /**
     * Captures owner, group, mode, and type metadata for a local path.
     *
     * @param string $relativePath Path relative to the Allsky installation root.
     * @return array{mode: string, owner: string, group: string, ownerId: int, groupId: int, type: string}|null
     */
    private function getPermissionInfoForPath(string $relativePath): ?array
    {
        $relativePath = ltrim($relativePath, '/');
        if ($relativePath === '' || preg_match('/(^|\/)\.\.(\/|$)/', $relativePath)) {
            return null;
        }

        $fullPath = $this->allskyHome . '/' . $relativePath;
        if (!file_exists($fullPath) && !is_link($fullPath)) {
            return null;
        }

        $perms = @fileperms($fullPath);
        $ownerId = @fileowner($fullPath);
        $groupId = @filegroup($fullPath);
        if ($perms === false || $ownerId === false || $groupId === false) {
            return null;
        }

        $owner = (string)$ownerId;
        $group = (string)$groupId;
        if (function_exists('posix_getpwuid')) {
            $pw = @posix_getpwuid((int)$ownerId);
            if (is_array($pw) && isset($pw['name']) && trim((string)$pw['name']) !== '') {
                $owner = (string)$pw['name'];
            }
        }
        if (function_exists('posix_getgrgid')) {
            $gr = @posix_getgrgid((int)$groupId);
            if (is_array($gr) && isset($gr['name']) && trim((string)$gr['name']) !== '') {
                $group = (string)$gr['name'];
            }
        }

        $allskyOwner = $this->getConfiguredAllskyOwner();
        if ($allskyOwner !== '' && $owner === $allskyOwner) {
            $owner = 'ALLSKY_OWNER';
        }

        $type = 'file';
        if (is_link($fullPath)) {
            $type = 'link';
        } else if (is_dir($fullPath)) {
            $type = 'dir';
        }

        return [
            'mode' => sprintf('%04o', ($perms & 07777)),
            'owner' => $owner,
            'group' => $group,
            'ownerId' => (int)$ownerId,
            'groupId' => (int)$groupId,
            'type' => $type,
        ];
    }

    /**
     * Builds a flat file list for backup metadata from archive targets.
     *
     * @param array<int, string> $targets Archive target paths.
     * @return array<int, string> Relative file paths included by those targets.
     */
    private function buildBackupFileListFromTargets(array $targets): array
    {
        $files = [];
        $basePrefixLen = strlen($this->allskyHome) + 1;

        foreach ($targets as $target) {
            $target = ltrim((string)$target, '/');
            if ($target === '' || preg_match('/(^|\/)\.\.(\/|$)/', $target)) {
                continue;
            }
            $fullTarget = $this->allskyHome . '/' . $target;
            if (!file_exists($fullTarget) && !is_link($fullTarget)) {
                continue;
            }

            if (is_file($fullTarget) || is_link($fullTarget)) {
                if (strpos(str_replace('\\', '/', $target), '/__pycache__/') !== false || preg_match('/(^|\/)__pycache__(\/|$)/', $target)) {
                    continue;
                }
                $files[$target] = true;
                continue;
            }

            if (is_dir($fullTarget)) {
                $iterator = new RecursiveIteratorIterator(
                    new RecursiveDirectoryIterator($fullTarget, FilesystemIterator::SKIP_DOTS),
                    RecursiveIteratorIterator::SELF_FIRST
                );
                foreach ($iterator as $item) {
                    if (!$item->isFile() && !$item->isLink()) {
                        continue;
                    }
                    $fullPath = (string)$item->getPathname();
                    if (strpos($fullPath, $this->allskyHome . '/') !== 0) {
                        continue;
                    }
                    $relativePath = substr($fullPath, $basePrefixLen);
                    if ($relativePath === false || $relativePath === '') {
                        continue;
                    }
                    $normalisedRelativePath = str_replace('\\', '/', $relativePath);
                    if (strpos($normalisedRelativePath, '/__pycache__/') !== false || preg_match('/(^|\/)__pycache__(\/|$)/', $normalisedRelativePath)) {
                        continue;
                    }
                    $files[$relativePath] = true;
                }
            }
        }

        $list = array_keys($files);
        sort($list, SORT_STRING);
        return $list;
    }

    /**
     * Builds file ownership and mode metadata for archive targets.
     *
     * @param array<int, string> $targets Archive target paths.
     * @return array<string, array<string, mixed>>
     */
    private function buildPermissionsMetadata(array $targets): array
    {
        $permissions = [];
        $basePrefixLen = strlen($this->allskyHome) + 1;

        foreach ($targets as $target) {
            $target = ltrim((string)$target, '/');
            if ($target === '' || preg_match('/(^|\/)\.\.(\/|$)/', $target)) {
                continue;
            }

            $fullTarget = $this->allskyHome . '/' . $target;
            if (!file_exists($fullTarget) && !is_link($fullTarget)) {
                continue;
            }

            $info = $this->getPermissionInfoForPath($target);
            if ($info !== null) {
                $permissions[$target] = $info;
            }

            if (is_dir($fullTarget)) {
                $iterator = new RecursiveIteratorIterator(
                    new RecursiveDirectoryIterator($fullTarget, FilesystemIterator::SKIP_DOTS),
                    RecursiveIteratorIterator::SELF_FIRST
                );
                foreach ($iterator as $item) {
                    $fullPath = (string)$item->getPathname();
                    if (strpos($fullPath, $this->allskyHome . '/') !== 0) {
                        continue;
                    }
                    $relativePath = substr($fullPath, $basePrefixLen);
                    if ($relativePath === false || $relativePath === '') {
                        continue;
                    }
                    $entryInfo = $this->getPermissionInfoForPath($relativePath);
                    if ($entryInfo !== null) {
                        $permissions[$relativePath] = $entryInfo;
                    }
                }
            }
        }

        ksort($permissions, SORT_STRING);
        return $permissions;
    }

    /**
     * Applies restored ownership and mode metadata to copied files.
     *
     * Symlinks are deliberately skipped so permission changes cannot follow a
     * link out of the restored tree.
     *
     * @param array<string, array<string, mixed>> $permissions Permission metadata selected for restored targets.
     * @return array{ok: bool, message?: string}
     */
    private function applyPermissionsMetadata(array $permissions): array
    {
        $errors = [];
        $allskyOwner = $this->getConfiguredAllskyOwner();
        $chownGroups = [];
        $chmodGroups = [];
        $pathLabels = [];

        foreach ($permissions as $relativePath => $info) {
            $relativePath = ltrim((string)$relativePath, '/');
            if ($relativePath === '' || preg_match('/(^|\/)\.\.(\/|$)/', $relativePath)) {
                continue;
            }

            $fullPath = $this->allskyHome . '/' . $relativePath;
            if (!file_exists($fullPath) && !is_link($fullPath)) {
                continue;
            }
            if (is_link($fullPath)) {
                continue;
            }

            $owner = trim((string)($info['owner'] ?? ''));
            if ($owner === 'ALLSKY_OWNER') {
                if ($allskyOwner === '') {
                    $errors[] = 'chown ' . $relativePath . ': ALLSKY_OWNER token could not be resolved from variables.json';
                    continue;
                }
                $owner = $allskyOwner;
            }
            $group = trim((string)($info['group'] ?? ''));
            if ($owner === '' && isset($info['ownerId'])) {
                $owner = (string)((int)$info['ownerId']);
            }
            if ($group === '' && isset($info['groupId'])) {
                $group = (string)((int)$info['groupId']);
            }
            if ($owner !== '' && $group !== '') {
                $ownerGroup = $owner . ':' . $group;
                if (!isset($chownGroups[$ownerGroup])) {
                    $chownGroups[$ownerGroup] = [];
                }
                $chownGroups[$ownerGroup][] = $fullPath;
            }

            $mode = trim((string)($info['mode'] ?? ''));
            if (preg_match('/^[0-7]{3,4}$/', $mode)) {
                if (!isset($chmodGroups[$mode])) {
                    $chmodGroups[$mode] = [];
                }
                $chmodGroups[$mode][] = $fullPath;
            }
            $pathLabels[$fullPath] = $relativePath;
        }

        $runBatch = function (string $bin, string $arg, array $paths, string $type) use (&$errors, $pathLabels): ?array {
            if (empty($paths)) {
                return null;
            }
            $chunks = array_chunk($paths, 120);
            foreach ($chunks as $chunk) {
                $cmd = 'sudo -n ' . $bin . ' ' . escapeshellarg($arg);
                foreach ($chunk as $path) {
                    $cmd .= ' ' . escapeshellarg($path);
                }
                $cmd .= ' 2>&1';
                $out = [];
                $ret = 0;
                exec($cmd, $out, $ret);
                if ($ret === 0) {
                    continue;
                }

                $details = trim(implode("\n", $out));
                if (stripos($details, 'a password is required') !== false || stripos($details, 'terminal is required') !== false) {
                    return ['ok' => false, 'message' => 'Failed to restore file ownership/permissions: sudo requires NOPASSWD for chown/chmod.'];
                }

                // If a batch fails, retry each path individually to report precise failures.
                foreach ($chunk as $path) {
                    $singleCmd = 'sudo -n ' . $bin . ' ' . escapeshellarg($arg) . ' ' . escapeshellarg($path) . ' 2>&1';
                    $singleOut = [];
                    $singleRet = 0;
                    exec($singleCmd, $singleOut, $singleRet);
                    if ($singleRet !== 0) {
                        $label = $pathLabels[$path] ?? $path;
                        $errors[] = $type . ' ' . $label . ': ' . trim(implode("\n", $singleOut));
                    }
                }
            }

            return null;
        };

        foreach ($chownGroups as $ownerGroup => $paths) {
            $fatal = $runBatch('/bin/chown', $ownerGroup, $paths, 'chown');
            if (is_array($fatal) && empty($fatal['ok'])) {
                return $fatal;
            }
        }
        foreach ($chmodGroups as $mode => $paths) {
            $fatal = $runBatch('/bin/chmod', $mode, $paths, 'chmod');
            if (is_array($fatal) && empty($fatal['ok'])) {
                return $fatal;
            }
        }

        if (!empty($errors)) {
            return [
                'ok' => false,
                'message' => 'Failed to restore file ownership/permissions: ' . implode(' | ', $errors),
            ];
        }

        return ['ok' => true];
    }

    /**
     * Reads the version file from a backup archive.
     *
     * @param string $backupPath Path to a tar.gz backup archive.
     */
    private function getBackupVersionFromArchive(string $backupPath): string
    {
        $raw = $this->extractArchiveFile($backupPath, 'version');
        if ($raw === '') {
            return '';
        }

        $lines = preg_split('/\r\n|\r|\n/', $raw);
        $line = trim((string)($lines[0] ?? ''));
        return $line;
    }

    /**
     * Reads camera type and model from the settings file inside a backup.
     *
     * @param string $backupPath Path to a tar.gz backup archive.
     * @return array{cameratype: string, cameramodel: string}
     */
    private function getBackupCameraFromArchive(string $backupPath): array
    {
        $settingsFile = $this->getSettingsFileFromArchive($backupPath);
        if ($settingsFile === '') {
            return ['cameratype' => 'unknown', 'cameramodel' => 'unknown'];
        }

        $raw = $this->extractArchiveFile($backupPath, $settingsFile);
        if ($raw === '') {
            return ['cameratype' => 'unknown', 'cameramodel' => 'unknown'];
        }

        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            return ['cameratype' => 'unknown', 'cameramodel' => 'unknown'];
        }

        $type = trim((string)($decoded['cameratype'] ?? ''));
        $model = trim((string)($decoded['cameramodel'] ?? ''));
        return [
            'cameratype' => ($type === '') ? 'unknown' : $type,
            'cameramodel' => ($model === '') ? 'unknown' : $model,
        ];
    }

    /**
     * Lists settings files found in a backup archive.
     *
     * @param string $backupPath Path to a tar.gz backup archive.
     * @return array<int, string>
     */
    private function getSettingsFilesFromArchive(string $backupPath): array
    {
        $settingsFiles = [];
        foreach ($this->listArchiveEntries($backupPath) as $entry) {
            $entry = trim((string)$entry);
            if ($entry === 'config/settings.json' || preg_match('/^config\\/settings_.+\\.json$/', $entry)) {
                $settingsFiles[] = $entry;
            }
        }

        return array_values(array_unique($settingsFiles));
    }

    /**
     * Chooses the settings file to use from backup metadata or archive content.
     *
     * @param string $backupPath Path to a tar.gz backup archive.
     */
    private function getSettingsFileFromArchive(string $backupPath): string
    {
        $rawMeta = $this->extractArchiveFile($backupPath, 'metadata.json');
        if ($rawMeta !== '') {
            $decoded = json_decode($rawMeta, true);
            if (is_array($decoded)) {
                $settingsFile = trim((string)($decoded['settingsfile'] ?? ''));
                if ($settingsFile !== '') {
                    return $settingsFile;
                }
            }
        }

        $settingsFiles = $this->getSettingsFilesFromArchive($backupPath);
        foreach ($settingsFiles as $file) {
            if ($file !== 'config/settings.json') {
                return $file;
            }
        }
        foreach ($settingsFiles as $file) {
            if ($file === 'config/settings.json') {
                return $file;
            }
        }

        return '';
    }

    /**
     * Lists cc files found in a backup archive.
     *
     * @param string $backupPath Path to a tar.gz backup archive.
     * @return array<int, string>
     */
    private function getCcFilesFromArchive(string $backupPath): array
    {
        $ccFiles = [];
        foreach ($this->listArchiveEntries($backupPath) as $entry) {
            $entry = trim((string)$entry);
            if ($entry === 'config/cc.json' || preg_match('/^config\\/cc_.+\\.json$/', $entry)) {
                $ccFiles[] = $entry;
            }
        }

        return array_values(array_unique($ccFiles));
    }

    /**
     * Chooses the cc file to use from backup metadata or archive content.
     *
     * @param string $backupPath Path to a tar.gz backup archive.
     */
    private function getCcFileFromArchive(string $backupPath): string
    {
        $rawMeta = $this->extractArchiveFile($backupPath, 'metadata.json');
        if ($rawMeta !== '') {
            $decoded = json_decode($rawMeta, true);
            if (is_array($decoded)) {
                $ccFile = trim((string)($decoded['ccfile'] ?? ''));
                if ($ccFile !== '') {
                    return $ccFile;
                }
            }
        }

        $ccFiles = $this->getCcFilesFromArchive($backupPath);
        foreach ($ccFiles as $file) {
            if ($file !== 'config/cc.json') {
                return $file;
            }
        }
        foreach ($ccFiles as $file) {
            if ($file === 'config/cc.json') {
                return $file;
            }
        }

        return '';
    }

    /**
     * Reads and completes backup metadata from sidecar files and archive content.
     *
     * @param string $backupPath Path to a tar.gz backup archive.
     * @param array<string, mixed> $backupFileInfo File details from the backup list.
     * @param bool $writeSidecar Whether archive metadata should be cached next to the archive.
     * @return array<string, mixed>
     */
    private function getArchiveMetadata(string $backupPath, array $backupFileInfo = [], bool $writeSidecar = true): array
    {
        $sidecarPath = $this->getBackupSidecarPath($backupPath);
        $hasSidecar = ($sidecarPath !== '' && is_file($sidecarPath) && is_readable($sidecarPath));
        $decoded = [];
        $metadataSource = 'unknown';

        if ($hasSidecar) {
            $decoded = $this->readBackupSidecarMetadata($backupPath);
            $metadataSource = 'sidecar';
        } else {
            $raw = $this->extractArchiveFile($backupPath, 'metadata.json');
            if ($raw !== '') {
                $tmp = json_decode($raw, true);
                if (is_array($tmp)) {
                    $decoded = $tmp;
                    $metadataSource = 'archive';
                    if ($writeSidecar) {
                        $this->writeBackupSidecarMetadata($backupPath, $decoded);
                    }
                }
            }
        }

        $backupType = strtolower(trim((string)($decoded['backupType'] ?? 'config')));
        if ($backupType !== 'images') {
            $backupType = 'config';
        }

        $version = trim((string)($decoded['version'] ?? ''));
        if ($version === '' && !$hasSidecar) {
            $version = trim($this->getBackupVersionFromArchive($backupPath));
        }
        if ($version === '') {
            $version = 'unknown';
        }

        $cameraType = trim((string)($decoded['cameratype'] ?? ''));
        $cameraModel = trim((string)($decoded['cameramodel'] ?? ''));
        if ($backupType === 'images') {
            if ($cameraType === '') {
                $cameraType = 'n/a';
            }
            if ($cameraModel === '') {
                $cameraModel = 'n/a';
            }
        } else {
            if (($cameraType === '' || $cameraModel === '') && !$hasSidecar) {
                $cameraInfo = $this->getBackupCameraFromArchive($backupPath);
                if ($cameraType === '') {
                    $cameraType = $cameraInfo['cameratype'];
                }
                if ($cameraModel === '') {
                    $cameraModel = $cameraInfo['cameramodel'];
                }
            }
            if ($cameraType === '') {
                $cameraType = 'unknown';
            }
            if ($cameraModel === '') {
                $cameraModel = 'unknown';
            }
        }

        $created = trim((string)($decoded['created'] ?? ''));
        if ($created === '') {
            $ts = (int)($backupFileInfo['createdTs'] ?? 0);
            $created = ($ts > 0) ? $this->formatLocalDate(DATE_TIME_FORMAT, $ts) : '';
        }

        $includedOptionalTargets = (isset($decoded['includedOptionalTargets']) && is_array($decoded['includedOptionalTargets']))
            ? array_values(array_unique(array_map(static fn($v) => trim((string)$v), $decoded['includedOptionalTargets']))
            ) : [];
        $includedOptionalTargets = array_values(array_filter($includedOptionalTargets, static fn($v) => $v !== ''));
        sort($includedOptionalTargets, SORT_STRING);
        $includedSections = $this->getIncludedSections($includedOptionalTargets, $backupType);

        $imageFolders = [];
        if (isset($decoded['imageFolders']) && is_array($decoded['imageFolders'])) {
            foreach ($decoded['imageFolders'] as $folder) {
                $folder = trim((string)$folder);
                if ($folder !== '') {
                    $imageFolders[] = $folder;
                }
            }
        }
        $imageFolders = array_values(array_unique($imageFolders));
        sort($imageFolders, SORT_NATURAL | SORT_FLAG_CASE);

        $imageTargets = [];
        if (isset($decoded['imageTargets']) && is_array($decoded['imageTargets'])) {
            foreach ($decoded['imageTargets'] as $target) {
                $target = $this->normaliseArchiveTarget((string)$target);
                if ($target !== '') {
                    $imageTargets[] = $target;
                }
            }
        }
        $imageTargets = array_values(array_unique($imageTargets));
        sort($imageTargets, SORT_STRING);

        $settingsFile = '';
        $ccFile = '';
        if ($backupType !== 'images') {
            $settingsFile = trim((string)($decoded['settingsfile'] ?? ''));
            if ($settingsFile === '' && !$hasSidecar) {
                $settingsFile = $this->getSettingsFileFromArchive($backupPath);
            }
            $ccFile = trim((string)($decoded['ccfile'] ?? ''));
            if ($ccFile === '' && !$hasSidecar) {
                $ccFile = $this->getCcFileFromArchive($backupPath);
            }
        }

        $requiredModules = [];
        if (isset($decoded['requiredModules']) && is_array($decoded['requiredModules'])) {
            foreach ($decoded['requiredModules'] as $module) {
                $name = basename(trim((string)$module));
                if ($name !== '') {
                    $requiredModules[] = $name;
                }
            }
        }
        $requiredModules = array_values(array_unique($requiredModules));
        sort($requiredModules, SORT_NATURAL | SORT_FLAG_CASE);

        $backupModules = [];
        if (isset($decoded['backupModules']) && is_array($decoded['backupModules'])) {
            foreach ($decoded['backupModules'] as $module) {
                $name = basename(trim((string)$module));
                if ($name !== '') {
                    $backupModules[] = $name;
                }
            }
        }
        $backupModules = array_values(array_unique($backupModules));
        sort($backupModules, SORT_NATURAL | SORT_FLAG_CASE);

        $backupHasModules = null;
        if (array_key_exists('backupHasModules', $decoded)) {
            $backupHasModules = !empty($decoded['backupHasModules']);
        }

        $backupFiles = [];
        if (isset($decoded['files']) && is_array($decoded['files'])) {
            foreach ($decoded['files'] as $filePath) {
                $filePath = ltrim(trim((string)$filePath), '/');
                if ($filePath === '' || preg_match('/(^|\/)\.\.(\/|$)/', $filePath)) {
                    continue;
                }
                $backupFiles[] = $filePath;
            }
        }
        if (empty($backupFiles) && isset($decoded['permissions']) && is_array($decoded['permissions'])) {
            foreach ($decoded['permissions'] as $path => $info) {
                $path = ltrim(trim((string)$path), '/');
                if ($path === '' || preg_match('/(^|\/)\.\.(\/|$)/', $path)) {
                    continue;
                }
                $type = is_array($info) ? trim((string)($info['type'] ?? '')) : '';
                if ($type === 'dir') {
                    continue;
                }
                $backupFiles[] = $path;
            }
        }
        $backupFiles = array_values(array_unique($backupFiles));
        sort($backupFiles, SORT_STRING);

        $metadata = [
            'version' => $version,
            'backupType' => $backupType,
            'cameratype' => $cameraType,
            'cameramodel' => $cameraModel,
            'created' => $created,
            'settingsfile' => $settingsFile,
            'ccfile' => $ccFile,
            'permissions' => (isset($decoded['permissions']) && is_array($decoded['permissions'])) ? $decoded['permissions'] : [],
            'includedOptionalTargets' => $includedOptionalTargets,
            'includedSections' => $includedSections,
            'imageBackupAll' => !empty($decoded['imageBackupAll']),
            'imageFolders' => $imageFolders,
            'imageTargets' => $imageTargets,
            'requiredModules' => $requiredModules,
            'backupModules' => $backupModules,
            'backupHasModules' => $backupHasModules,
            'files' => $backupFiles,
            '_metadataSource' => $metadataSource,
        ];

        // If no sidecar exists, persist derived metadata so subsequent loads don't need archive scans.
        if ($writeSidecar && !$hasSidecar) {
            $sidecarMeta = $metadata;
            unset($sidecarMeta['_metadataSource']);
            $this->writeBackupSidecarMetadata($backupPath, $sidecarMeta);
        }

        return $metadata;
    }

    /**
     * Reads module dependencies from module configuration files in a backup.
     *
     * @param string $backupPath Path to a tar.gz backup archive.
     * @return array<int, string> Required module filenames.
     */
    private function getRequiredModulesFromArchive(string $backupPath): array
    {
        $configFiles = [
            'config/modules/postprocessing_day.json',
            'config/modules/postprocessing_night.json',
            'config/modules/postprocessing_periodic.json',
        ];

        $required = [];
        foreach ($configFiles as $configFile) {
            $raw = $this->extractArchiveFile($backupPath, $configFile);
            if ($raw === '') {
                continue;
            }

            $decoded = json_decode($raw, true);
            if (!is_array($decoded)) {
                continue;
            }

            foreach ($decoded as $entry) {
                if (!is_array($entry)) {
                    continue;
                }
                $module = trim((string)($entry['module'] ?? ''));
                if ($module !== '') {
                    $required[basename($module)] = true;
                }
            }
        }

        return array_keys($required);
    }

    /**
     * Reads module dependencies from the current local configuration.
     *
     * @return array<int, string> Required module filenames.
     */
    private function getRequiredModulesFromLocalConfig(): array
    {
        $configFiles = [
            $this->allskyHome . '/config/modules/postprocessing_day.json',
            $this->allskyHome . '/config/modules/postprocessing_night.json',
            $this->allskyHome . '/config/modules/postprocessing_periodic.json',
        ];

        $required = [];
        foreach ($configFiles as $configFile) {
            if (!is_file($configFile) || !is_readable($configFile)) {
                continue;
            }

            $raw = @file_get_contents($configFile);
            if ($raw === false || trim($raw) === '') {
                continue;
            }

            $decoded = json_decode($raw, true);
            if (!is_array($decoded)) {
                continue;
            }

            foreach ($decoded as $entry) {
                if (!is_array($entry)) {
                    continue;
                }
                $module = trim((string)($entry['module'] ?? ''));
                if ($module !== '') {
                    $required[basename($module)] = true;
                }
            }
        }

        $list = array_keys($required);
        sort($list, SORT_NATURAL | SORT_FLAG_CASE);
        return $list;
    }

    /**
     * Finds required modules that are not available locally.
     *
     * @param array<int, string> $modules Module filenames to check.
     * @return array<int, string> Missing module filenames.
     */
    private function findMissingModuleFiles(array $modules): array
    {
        $coreDir = $this->allskyHome . '/scripts/modules';
        $userDir = $this->allskyHome . '/config/myFiles/modules';
        $missing = [];

        foreach ($modules as $module) {
            $name = basename(trim((string)$module));
            if ($name === '') {
                continue;
            }

            $corePath = $coreDir . '/' . $name;
            $userPath = $userDir . '/' . $name;
            if (!is_file($corePath) && !is_file($userPath)) {
                $missing[] = $name;
            }
        }

        $missing = array_values(array_unique($missing));
        sort($missing, SORT_NATURAL | SORT_FLAG_CASE);
        return $missing;
    }

    /**
     * Splits required modules into core, user, and missing groups.
     *
     * @param array<int, string> $modules Module filenames to classify.
     * @return array<string, array<int, string>>
     */
    private function classifyRequiredModules(array $modules): array
    {
        $coreDir = $this->allskyHome . '/scripts/modules';
        $userDir = $this->allskyHome . '/config/myFiles/modules';
        $coreModules = [];
        $userModules = [];
        $missingModules = [];

        foreach ($modules as $module) {
            $name = basename(trim((string)$module));
            if ($name === '') {
                continue;
            }

            $corePath = $coreDir . '/' . $name;
            $userPath = $userDir . '/' . $name;
            if (is_file($corePath)) {
                $coreModules[] = $name;
            } else if (is_file($userPath)) {
                $userModules[] = $name;
            } else {
                $missingModules[] = $name;
            }
        }

        $coreModules = array_values(array_unique($coreModules));
        $userModules = array_values(array_unique($userModules));
        $missingModules = array_values(array_unique($missingModules));
        sort($coreModules, SORT_NATURAL | SORT_FLAG_CASE);
        sort($userModules, SORT_NATURAL | SORT_FLAG_CASE);
        sort($missingModules, SORT_NATURAL | SORT_FLAG_CASE);

        return [
            'coreModules' => $coreModules,
            'userModules' => $userModules,
            'missingModules' => $missingModules,
        ];
    }

    /**
     * Validates an uploaded backup archive before it is accepted by the WebUI.
     *
     * The archive must pass member safety inspection and contain the required
     * Allsky metadata and type-specific restore files.
     *
     * @param string $archivePath Path to the uploaded tar.gz archive.
     * @return array{ok: bool, message?: string}
     */
    private function validateBackupArchive(string $archivePath): array
    {
        if (!is_file($archivePath) || !is_readable($archivePath)) {
            return ['ok' => false, 'message' => 'Uploaded file is not readable.'];
        }

        $inspection = $this->inspectArchiveMembers($archivePath);
        if (empty($inspection['ok'])) {
            return [
                'ok' => false,
                'message' => (string)($inspection['message'] ?? 'Uploaded file is not a valid tar.gz backup.'),
            ];
        }

        $entries = [];
        foreach (($inspection['entries'] ?? []) as $entry) {
            if (is_array($entry)) {
                $path = trim((string)($entry['path'] ?? ''));
                if ($path !== '') {
                    $entries[] = $path;
                }
            }
        }

        if (!in_array('metadata.json', $entries, true)) {
            return ['ok' => false, 'message' => "Uploaded file is not a valid Allsky backup (missing 'metadata.json')."];
        }

        $metadata = $this->getArchiveMetadata($archivePath, [], false);
        $backupType = $metadata['backupType'] ?? 'config';
        if ($backupType === 'images') {
            $hasImages = false;
            foreach ($entries as $entry) {
                if ($entry === 'images' || strpos($entry, 'images/') === 0) {
                    $hasImages = true;
                    break;
                }
            }
            if (!$hasImages) {
                return ['ok' => false, 'message' => 'Uploaded file is not a valid images backup (missing images folder).'];
            }
            return ['ok' => true];
        }

        $required = ['env.json'];
        foreach ($required as $requiredFile) {
            if (!in_array($requiredFile, $entries, true)) {
                return ['ok' => false, 'message' => "Uploaded file is not a valid Allsky config backup (missing '$requiredFile')."];
            }
        }

        $settingsFiles = $this->getSettingsFilesFromArchive($archivePath);
        if (empty($settingsFiles)) {
            return ['ok' => false, 'message' => 'Uploaded file is not a valid Allsky config backup (missing settings file).'];
        }
        $ccFiles = $this->getCcFilesFromArchive($archivePath);
        if (empty($ccFiles)) {
            return ['ok' => false, 'message' => 'Uploaded file is not a valid Allsky config backup (missing cc file).'];
        }

        if ($metadata['version'] === 'unknown' || $metadata['cameratype'] === 'unknown' || $metadata['cameramodel'] === 'unknown') {
            return ['ok' => false, 'message' => 'Uploaded backup metadata is invalid (missing version/camera information).'];
        }

        return ['ok' => true];
    }

    /**
     * Creates a configuration backup archive.
     *
     * @param array<int, string> $selectedOptionalTargetKeys Optional sections selected for inclusion.
     * @return array<string, mixed>
     */
    private function createConfigBackupArchive(array $selectedOptionalTargetKeys = []): array
    {
        @set_time_limit(0);
        @ini_set('max_execution_time', '0');

        $backupDirResult = $this->ensureBackupDir();
        if (empty($backupDirResult['ok'])) {
            return ['ok' => false, 'message' => (string)($backupDirResult['message'] ?? 'Unable to create backup folder.')];
        }

        $optionalDefinitions = $this->getOptionalTargets();
        $validOptionalKeys = [];
        foreach ($selectedOptionalTargetKeys as $key) {
            $key = trim((string)$key);
            if ($key !== '' && isset($optionalDefinitions[$key])) {
                $validOptionalKeys[] = $key;
            }
        }
        $validOptionalKeys = array_values(array_unique($validOptionalKeys));
        sort($validOptionalKeys, SORT_STRING);
        $requiresAllskyStop = $this->selectedOptionalTargetsRequireAllskyStop($validOptionalKeys);

        $targets = [];
        foreach ($this->getArchiveTargets($validOptionalKeys) as $target) {
            $source = $this->allskyHome . '/' . $target;
            if (file_exists($source)) {
                $targets[] = $target;
            }
        }

        if (empty($targets)) {
            return ['ok' => false, 'message' => 'No backup files or folders were found to archive.'];
        }
        $resolvedSettingsFile = $this->getResolvedSettingsFile();
        if (!in_array($resolvedSettingsFile, $targets, true)) {
            return ['ok' => false, 'message' => "Required settings file '$resolvedSettingsFile' was not found; backup aborted."];
        }
        $resolvedCcFile = $this->getResolvedCcFile();
        if (!in_array($resolvedCcFile, $targets, true)) {
            return ['ok' => false, 'message' => "Required cc file '$resolvedCcFile' was not found; backup aborted."];
        }

        $backupName = 'allsky-config-backup-' . $this->formatLocalDate('Ymd-His') . '.tar.gz';
        $backupPath = $this->getBackupDir() . '/' . $backupName;

        $cameraInfo = $this->getCurrentCameraInfo();
        $modulesSectionIncluded = in_array('modules', $validOptionalKeys, true);
        $requiredModules = $this->getRequiredModulesFromLocalConfig();
        $backupModules = $modulesSectionIncluded ? $this->getModulesFromLocalUserModules() : [];
        $archiveMetadata = [
            'backupFile' => $backupName,
            'backupType' => 'config',
            'created' => $this->formatLocalDate(DATE_TIME_FORMAT),
            'version' => $this->getCurrentVersion(),
            'cameratype' => $cameraInfo['cameratype'],
            'cameramodel' => $cameraInfo['cameramodel'],
            'settingsfile' => $this->getResolvedSettingsFile(),
            'ccfile' => $this->getResolvedCcFile(),
            'permissions' => $this->buildPermissionsMetadata($targets),
            'files' => $this->buildBackupFileListFromTargets($targets),
            'includedOptionalTargets' => $validOptionalKeys,
            'includedSections' => $this->getIncludedSections($validOptionalKeys, 'config'),
            'requiredModules' => $requiredModules,
            'backupModules' => $backupModules,
            'backupHasModules' => $modulesSectionIncluded,
            'format' => 1,
        ];

        $tmpDir = sys_get_temp_dir() . '/allsky-backup-' . uniqid('', true);
        $metaFile = $tmpDir . '/metadata.json';
        if (!@mkdir($tmpDir, 0775, true)) {
            return ['ok' => false, 'message' => 'Unable to prepare backup metadata file.'];
        }

        $metaJson = json_encode($archiveMetadata, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        if ($metaJson === false || @file_put_contents($metaFile, $metaJson) === false) {
            @unlink($metaFile);
            @rmdir($tmpDir);
            return ['ok' => false, 'message' => 'Unable to write backup metadata.'];
        }

        $steps = [];
        $allskyStopped = false;
        $restartWarning = '';
        if ($requiresAllskyStop) {
            $steps[] = 'Stopping Allsky service';
            $stopResult = $this->controlAllskyService('stop');
            if (empty($stopResult['ok'])) {
                @unlink($metaFile);
                @rmdir($tmpDir);
                return ['ok' => false, 'message' => (string)($stopResult['message'] ?? 'Unable to stop allsky service before backup.')];
            }
            $allskyStopped = true;
        }

        $steps[] = 'Creating backup archive';
        $cmd = 'tar -czf ' . escapeshellarg($backupPath) .
            ' --exclude=' . escapeshellarg('__pycache__') .
            ' --exclude=' . escapeshellarg('*/__pycache__') .
            ' --exclude=' . escapeshellarg('*/__pycache__/*') .
            ' -C ' . escapeshellarg($this->allskyHome);
        foreach ($targets as $target) {
            $cmd .= ' ' . escapeshellarg($target);
        }
        $cmd .= ' -C ' . escapeshellarg($tmpDir) . ' metadata.json 2>&1';

        $output = [];
        $ret = 0;
        exec($cmd, $output, $ret);

        if ($allskyStopped) {
            $steps[] = 'Starting Allsky service';
            $startResult = $this->controlAllskyService('start');
            if (empty($startResult['ok'])) {
                $restartWarning = (string)($startResult['message'] ?? 'Unable to restart allsky service after backup.');
            }
        }

        @unlink($metaFile);
        @rmdir($tmpDir);

        if ($ret !== 0 || !file_exists($backupPath)) {
            $details = trim(implode("\n", $output));
            $message = 'Backup failed.';
            if ($details !== '') {
                $message .= ' ' . $details;
            }
            if ($restartWarning !== '') {
                $message .= ' ' . $restartWarning;
            }
            return ['ok' => false, 'message' => $message];
        }

        $this->writeBackupSidecarMetadata($backupPath, $archiveMetadata);

        $size = (int) (@filesize($backupPath) ?: 0);
        $metadataExtra = [];

        if (!$this->writeBackupMetadata($metadataExtra)) {
            return [
                'ok' => true,
                'file' => $backupName,
                'sizeBytes' => $size,
                'version' => $archiveMetadata['version'],
                'warning' => trim(
                    ($restartWarning !== '' ? ($restartWarning . ' ') : '') .
                    "Backup succeeded, but metadata file '" . $this->getBackupMetadataFile() . "' could not be updated."
                ),
                'steps' => $steps,
            ];
        }

        $warning = $restartWarning;
        return [
            'ok' => true,
            'file' => $backupName,
            'sizeBytes' => $size,
            'version' => $archiveMetadata['version'],
            'includedOptionalTargets' => $validOptionalKeys,
            'includedSections' => $archiveMetadata['includedSections'],
            'backupType' => 'config',
            'warning' => $warning,
            'steps' => $steps,
        ];
    }

    /**
     * Creates an image backup archive.
     *
     * @param bool $backupAllImages Whether every image folder should be included.
     * @param array<int, string> $selectedImageFolders Image folders selected when not backing up everything.
     * @return array<string, mixed>
     */
    private function createImagesBackupArchive(bool $backupAllImages = true, array $selectedImageFolders = []): array
    {
        @set_time_limit(0);
        @ini_set('max_execution_time', '0');

        $backupDirResult = $this->ensureBackupDir();
        if (empty($backupDirResult['ok'])) {
            return ['ok' => false, 'message' => (string)($backupDirResult['message'] ?? 'Unable to create backup folder.')];
        }

        $imagesRoot = $this->getImagesArchiveTarget();
        $source = $this->allskyHome . '/' . $imagesRoot;
        if (!is_dir($source)) {
            return ['ok' => false, 'message' => "Images folder '$imagesRoot' was not found; backup aborted."];
        }

        $targets = [];
        $imageFolders = [];
        if ($backupAllImages) {
            $targets[] = $imagesRoot;
            $imageFolders = $this->getImagesFolderList();
        } else {
            foreach ($selectedImageFolders as $folder) {
                $name = trim((string)$folder);
                if ($name === '' || preg_match('/(^|\/)\.\.(\/|$)/', $name)) {
                    continue;
                }
                $target = $imagesRoot . '/' . $name;
                $full = $this->allskyHome . '/' . $target;
                if (is_dir($full)) {
                    $targets[] = $target;
                    $imageFolders[] = $name;
                }
            }
            $targets = array_values(array_unique($targets));
            sort($targets, SORT_STRING);
            $imageFolders = array_values(array_unique($imageFolders));
            sort($imageFolders, SORT_NATURAL | SORT_FLAG_CASE);
            if (empty($targets)) {
                return ['ok' => false, 'message' => 'No image folders selected to backup.'];
            }
        }

        $backupName = 'allsky-images-backup-' . $this->formatLocalDate('Ymd-His') . '.tar.gz';
        $backupPath = $this->getBackupDir() . '/' . $backupName;

        $archiveMetadata = [
            'backupFile' => $backupName,
            'backupType' => 'images',
            'created' => $this->formatLocalDate(DATE_TIME_FORMAT),
            'version' => $this->getCurrentVersion(),
            'permissions' => $this->buildPermissionsMetadata($targets),
            'files' => $this->buildBackupFileListFromTargets($targets),
            'includedOptionalTargets' => [],
            'includedSections' => $this->getIncludedSections([], 'images'),
            'imageBackupAll' => $backupAllImages,
            'imageFolders' => $imageFolders,
            'imageTargets' => $targets,
            'format' => 1,
        ];

        $tmpDir = sys_get_temp_dir() . '/allsky-images-backup-' . uniqid('', true);
        $metaFile = $tmpDir . '/metadata.json';
        if (!@mkdir($tmpDir, 0775, true)) {
            return ['ok' => false, 'message' => 'Unable to prepare backup metadata file.'];
        }
        $metaJson = json_encode($archiveMetadata, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        if ($metaJson === false || @file_put_contents($metaFile, $metaJson) === false) {
            @unlink($metaFile);
            @rmdir($tmpDir);
            return ['ok' => false, 'message' => 'Unable to write backup metadata.'];
        }

        $cmd = 'tar -czf ' . escapeshellarg($backupPath) .
            ' --exclude=' . escapeshellarg('__pycache__') .
            ' --exclude=' . escapeshellarg('*/__pycache__') .
            ' --exclude=' . escapeshellarg('*/__pycache__/*') .
            ' -C ' . escapeshellarg($this->allskyHome);
        foreach ($targets as $target) {
            $cmd .= ' ' . escapeshellarg($target);
        }
        $cmd .= ' -C ' . escapeshellarg($tmpDir) . ' metadata.json 2>&1';
        $output = [];
        $ret = 0;
        exec($cmd, $output, $ret);

        @unlink($metaFile);
        @rmdir($tmpDir);

        if ($ret !== 0 || !file_exists($backupPath)) {
            $details = trim(implode("\n", $output));
            $message = 'Backup failed.';
            if ($details !== '') {
                $message .= ' ' . $details;
            }
            return ['ok' => false, 'message' => $message];
        }

        $this->writeBackupSidecarMetadata($backupPath, $archiveMetadata);

        $size = (int) (@filesize($backupPath) ?: 0);
        if (!$this->writeBackupMetadata([])) {
            return [
                'ok' => true,
                'file' => $backupName,
                'sizeBytes' => $size,
                'version' => $archiveMetadata['version'],
                'backupType' => 'images',
                'warning' => "Backup succeeded, but metadata file '" . $this->getBackupMetadataFile() . "' could not be updated.",
            ];
        }

        return [
            'ok' => true,
            'file' => $backupName,
            'sizeBytes' => $size,
            'version' => $archiveMetadata['version'],
            'includedOptionalTargets' => [],
            'includedSections' => $archiveMetadata['includedSections'],
            'backupType' => 'images',
        ];
    }

    /**
     * Restores selected backup sections or files from a validated archive.
     *
     * Restore performs full archive member inspection, extracts only allow-listed
     * regular files into a temporary staging directory as a non-root user, then
     * copies the staged files into place.
     *
     * @param string $selected Backup filename selected in the WebUI.
     * @param array<int, string> $selectedSections Section keys selected for restore.
     * @param array<int, string> $selectedImageFolders Image folder names selected for image restores.
     * @param array<int, string> $selectedFiles Advanced restore file paths.
     * @return array<string, mixed>
     */
    private function restoreBackupArchive(string $selected, array $selectedSections = [], array $selectedImageFolders = [], array $selectedFiles = []): array
    {
        @set_time_limit(0);
        @ini_set('max_execution_time', '0');
        $steps = ['Validating backup and restore options'];
        $backupPath = $this->getBackupPathByName($selected);
        if ($backupPath === '') {
            return ['ok' => false, 'message' => 'Selected backup does not exist.'];
        }

        $backupName = basename($backupPath);
        $archiveInspection = $this->inspectArchiveMembers($backupPath);
        if (empty($archiveInspection['ok'])) {
            return [
                'ok' => false,
                'message' => (string)($archiveInspection['message'] ?? "Backup '$backupName' is not a valid tar.gz archive."),
            ];
        }
        $archiveMembers = (isset($archiveInspection['entries']) && is_array($archiveInspection['entries']))
            ? $archiveInspection['entries']
            : [];
        $archiveEntries = [];
        foreach ($archiveMembers as $entry) {
            if (is_array($entry)) {
                $path = trim((string)($entry['path'] ?? ''));
                if ($path !== '') {
                    $archiveEntries[] = $path;
                }
            }
        }
        $archiveEntries = array_values(array_unique($archiveEntries));
        sort($archiveEntries, SORT_STRING);

        $backupMeta = $this->getArchiveMetadata($backupPath, []);
        $backupType = (string)($backupMeta['backupType'] ?? 'config');
        $selectedSectionKeys = $this->resolveSelectedSectionKeys($backupMeta, $selectedSections);
        if (empty($selectedSectionKeys)) {
            return ['ok' => false, 'message' => 'No restore sections selected.'];
        }

        $normalisedSelectedImageFolders = [];
        foreach ($selectedImageFolders as $folder) {
            $name = trim((string)$folder);
            if ($name === '' || preg_match('/(^|\/)\.\.(\/|$)/', $name) || strpos($name, '/') !== false) {
                continue;
            }
            $normalisedSelectedImageFolders[$name] = true;
        }
        $normalisedSelectedImageFolders = array_keys($normalisedSelectedImageFolders);
        sort($normalisedSelectedImageFolders, SORT_NATURAL | SORT_FLAG_CASE);

        $normalisedSelectedFiles = [];
        foreach ($selectedFiles as $filePath) {
            $path = ltrim(trim((string)$filePath), '/');
            if ($path === '' || preg_match('/(^|\/)\.\.(\/|$)/', $path)) {
                continue;
            }
            $normalisedSelectedFiles[$path] = true;
        }
        $normalisedSelectedFiles = array_keys($normalisedSelectedFiles);
        sort($normalisedSelectedFiles, SORT_STRING);

        $targetsToExtract = [];
        foreach ($selectedSectionKeys as $sectionKey) {
            foreach ($this->getArchiveTargetsForSectionKey($sectionKey, $backupType, $backupMeta) as $target) {
                $targetsToExtract[$target] = true;
            }
        }
        $targetsToExtract = array_values(array_unique(array_keys($targetsToExtract)));
        sort($targetsToExtract, SORT_STRING);

        if (!empty($normalisedSelectedFiles)) {
            $allowedFiles = (isset($backupMeta['files']) && is_array($backupMeta['files'])) ? $backupMeta['files'] : [];
            $allowedSet = [];
            foreach ($allowedFiles as $allowedFile) {
                $allowedPath = ltrim(trim((string)$allowedFile), '/');
                if ($allowedPath !== '') {
                    $allowedSet[$allowedPath] = true;
                }
            }

            if (!empty($allowedSet)) {
                $validFiles = [];
                foreach ($normalisedSelectedFiles as $path) {
                    if (isset($allowedSet[$path])) {
                        $validFiles[] = $path;
                    }
                }
                $normalisedSelectedFiles = $validFiles;
            } else {
                $normalisedSelectedFiles = $this->filterTargetsByArchiveEntries($normalisedSelectedFiles, $archiveEntries);
            }

            if (empty($normalisedSelectedFiles)) {
                return ['ok' => false, 'message' => 'None of the selected files were found in this backup.'];
            }
            $selectedSectionKeys = $this->resolveSelectedSectionKeysForTargets($backupMeta, $backupType, $normalisedSelectedFiles, $selectedSections);
            $targetsToExtract = $normalisedSelectedFiles;
        }

        $coreSelected = in_array('core', $selectedSectionKeys, true);
        $modulesSelected = in_array('modules', $selectedSectionKeys, true);
        $imagesSelected = in_array('images', $selectedSectionKeys, true);

        if ($backupType === 'images' && $imagesSelected && !empty($normalisedSelectedImageFolders)) {
            $folderTargets = [];
            foreach ($normalisedSelectedImageFolders as $folder) {
                $folderTargets[] = $this->getImagesArchiveTarget() . '/' . $folder;
            }
            // For images restores we rely on metadata targets first for speed.
            // Fall back to archive listing only if metadata is incomplete.
            if (!empty($targetsToExtract)) {
                $valid = [];
                foreach ($folderTargets as $target) {
                    foreach ($targetsToExtract as $allowed) {
                        if ($target === $allowed || strpos($target, $allowed . '/') === 0 || strpos($allowed, $target . '/') === 0) {
                            $valid[$target] = true;
                            break;
                        }
                    }
                }
                $folderTargets = array_keys($valid);
            } else {
                $folderTargets = $this->filterTargetsByArchiveEntries($folderTargets, $archiveEntries);
            }
            if (empty($folderTargets)) {
                return ['ok' => false, 'message' => 'None of the selected image folders were found in this backup.'];
            }
            $targetsToExtract = $folderTargets;
        }

        if (empty($targetsToExtract) || $backupType !== 'images') {
            $targetsToExtract = $this->filterTargetsByArchiveEntries($targetsToExtract, $archiveEntries);
        }

        if (empty($targetsToExtract)) {
            return ['ok' => false, 'message' => 'Selected restore sections do not contain any files in this backup.'];
        }

        if ($backupType === 'config' && $coreSelected) {
            $currentCamera = $this->getCurrentCameraInfo();
            if ($backupMeta['cameratype'] === 'unknown' || $backupMeta['cameramodel'] === 'unknown') {
                return ['ok' => false, 'message' => "Backup '$backupName' does not contain valid camera type/model information; restore is blocked."];
            }

            if ($backupMeta['cameratype'] !== $currentCamera['cameratype'] || $backupMeta['cameramodel'] !== $currentCamera['cameramodel']) {
                return [
                    'ok' => false,
                    'message' => "Backup camera mismatch. Current camera is '{$currentCamera['cameratype']} {$currentCamera['cameramodel']}', backup camera is '{$backupMeta['cameratype']} {$backupMeta['cameramodel']}'. Restore blocked.",
                ];
            }
        }

        if ($backupType === 'config') {
            $backupHasModules = $this->backupContainsModulesFiles($backupPath, $backupMeta);
            $mustRunModuleCheck = (!$backupHasModules) || (!$modulesSelected);
            if ($mustRunModuleCheck) {
                $requiredModules = $this->getRequiredModulesFromArchive($backupPath);
                $missingModules = $this->findMissingModuleFiles($requiredModules);
                if (!empty($missingModules)) {
                    return [
                        'ok' => false,
                        'message' => 'Restore blocked. Missing required module files: ' . implode(', ', $missingModules),
                    ];
                }
            }
        } else if ($backupType === 'images' && !$imagesSelected) {
            return ['ok' => false, 'message' => 'No image restore section selected.'];
        }

        $regularMembersToRestore = $this->filterRegularArchiveMembersForTargets($archiveMembers, $targetsToExtract);
        if (empty($regularMembersToRestore)) {
            return ['ok' => false, 'message' => 'Selected restore sections do not contain any regular files in this backup.'];
        }

        $allskyStopped = false;
        $restartWarning = '';
        $restoreTmpDir = '';
        $ensureAllskyStarted = function () use (&$allskyStopped, &$steps, &$restartWarning): void {
            if (!$allskyStopped) {
                return;
            }
            $steps[] = 'Starting Allsky service';
            $startResult = $this->controlAllskyService('start');
            if (empty($startResult['ok'])) {
                $restartWarning = (string)($startResult['message'] ?? 'Unable to restart allsky service after restore.');
            }
            $allskyStopped = false;
        };
        $failRestore = function (string $message) use (&$ensureAllskyStarted, &$restartWarning, &$restoreTmpDir): array {
            if ($restoreTmpDir !== '') {
                $this->deleteDirectoryTree($restoreTmpDir);
                $restoreTmpDir = '';
            }
            $ensureAllskyStarted();
            if ($restartWarning !== '') {
                $message .= ' ' . $restartWarning;
            }
            return ['ok' => false, 'message' => $message];
        };

        $restoreTmpDir = $this->createRestoreTempDir();
        if ($restoreTmpDir === '') {
            return $failRestore('Unable to create restore staging directory.');
        }

        $steps[] = 'Extracting selected files to staging area';
        $extractResult = $this->extractArchiveMembersToDirectory($backupPath, $restoreTmpDir, $regularMembersToRestore);
        if (empty($extractResult['ok'])) {
            return $failRestore((string)($extractResult['message'] ?? 'Restore staging extraction failed.'));
        }

        if ($backupType === 'config') {
            $steps[] = 'Stopping Allsky service';
            $stopResult = $this->controlAllskyService('stop');
            if (empty($stopResult['ok'])) {
                return $failRestore((string)($stopResult['message'] ?? 'Unable to stop allsky service before restore.'));
            }
            $allskyStopped = true;
        }

        $permissionWarnings = '';
        $steps[] = 'Copying validated files into place';
        $copyResult = $this->copyStagedRegularFiles($restoreTmpDir, $regularMembersToRestore);
        $this->deleteDirectoryTree($restoreTmpDir);
        $restoreTmpDir = '';
        if (empty($copyResult['ok'])) {
            return $failRestore((string)($copyResult['message'] ?? 'Restore failed while copying validated files into place.'));
        }

        if ($backupType === 'config' && $coreSelected) {
            $settingsFile = trim((string)($backupMeta['settingsfile'] ?? ''));
            if ($settingsFile === '') {
                $settingsFile = $this->getSettingsFileFromArchive($backupPath);
            }
            if ($settingsFile === '') {
                return $failRestore("Backup '$backupName' does not contain a settings file; restore is blocked.");
            }

            $settingsPath = $this->allskyHome . '/' . ltrim($settingsFile, '/');
            $settingsLink = $this->allskyHome . '/config/settings.json';
            $settingsLinkResult = $this->createRestoredHardLink(
                $settingsPath,
                $settingsLink,
                'config/settings.json',
                $settingsFile
            );
            if (empty($settingsLinkResult['ok'])) {
                return $failRestore((string)($settingsLinkResult['message'] ?? "Unable to create hard link 'config/settings.json' to '$settingsFile'."));
            }

            $ccFile = trim((string)($backupMeta['ccfile'] ?? ''));
            if ($ccFile === '') {
                $ccFile = $this->getCcFileFromArchive($backupPath);
            }
            if ($ccFile === '') {
                return $failRestore("Backup '$backupName' does not contain a cc file; restore is blocked.");
            }

            $ccPath = $this->allskyHome . '/' . ltrim($ccFile, '/');
            $ccLink = $this->allskyHome . '/config/cc.json';
            $ccLinkResult = $this->createRestoredHardLink(
                $ccPath,
                $ccLink,
                'config/cc.json',
                $ccFile
            );
            if (empty($ccLinkResult['ok'])) {
                return $failRestore((string)($ccLinkResult['message'] ?? "Unable to create hard link 'config/cc.json' to '$ccFile'."));
            }
        }

        $metadataExtra = [
            'lastRestore' => [
                'file' => $backupName,
                'restored' => $this->formatLocalDate(DATE_TIME_FORMAT),
                'versionAfterRestore' => $this->getCurrentVersion(),
            ],
        ];

        $permResult = ['ok' => true];
        if (isset($backupMeta['permissions']) && is_array($backupMeta['permissions']) && !empty($backupMeta['permissions'])) {
            $steps[] = 'Applying file ownership and permissions';
            $permissionsToApply = $this->filterPermissionsForTargets($backupMeta['permissions'], $targetsToExtract);
            $permResult = $this->applyPermissionsMetadata($permissionsToApply);
            if (empty($permResult['ok'])) {
                return $failRestore((string)($permResult['message'] ?? 'Failed to restore file ownership/permissions.'));
            }
        }

        $ensureAllskyStarted();

        $warning = '';
        if ($permissionWarnings !== '') {
            $warning = $permissionWarnings;
        }
        if ($restartWarning !== '') {
            if ($warning !== '') {
                $warning .= ' ';
            }
            $warning .= $restartWarning;
        }
        if (!$this->writeBackupMetadata($metadataExtra)) {
            if ($warning !== '') {
                $warning .= ' ';
            }
            $warning .= 'Backup restored, but backup metadata could not be updated.';
        }
        $steps[] = 'Finalising restore';

        $restoreMode = empty($normalisedSelectedFiles) ? 'normal' : 'advanced';
        $restoredToVersion = $this->getCurrentVersion();
        $cameraToInfo = $this->getCurrentCameraInfo();
        $cameraFrom = trim((string)($backupMeta['cameratype'] ?? 'unknown')) . ' / ' . trim((string)($backupMeta['cameramodel'] ?? 'unknown'));
        $cameraTo = trim((string)($cameraToInfo['cameratype'] ?? 'unknown')) . ' / ' . trim((string)($cameraToInfo['cameramodel'] ?? 'unknown'));

        $logResult = $this->writeRestoreLog([
            'backupFile' => $backupName,
            'backupType' => $backupType,
            'backupVersionFrom' => (string)($backupMeta['version'] ?? 'unknown'),
            'restoreVersionTo' => $restoredToVersion,
            'cameraFrom' => $cameraFrom,
            'cameraTo' => $cameraTo,
            'mode' => $restoreMode,
            'selectedSections' => $selectedSectionKeys,
            'selectedImageFolders' => $normalisedSelectedImageFolders,
            'selectedFiles' => $normalisedSelectedFiles,
            'targetsRestored' => $targetsToExtract,
            'warning' => $warning,
            'steps' => $steps,
        ]);
        if (empty($logResult['ok'])) {
            if ($warning !== '') {
                $warning .= ' ';
            }
            $warning .= (string)($logResult['message'] ?? 'Restore completed, but restore log could not be written.');
        }

        return [
            'ok' => true,
            'file' => $backupName,
            'warning' => $warning,
            'steps' => $steps,
            'backupType' => $backupType,
            'mode' => $restoreMode,
            'backupVersionFrom' => (string)($backupMeta['version'] ?? 'unknown'),
            'restoreVersionTo' => $restoredToVersion,
            'cameraFrom' => $cameraFrom,
            'cameraTo' => $cameraTo,
            'selectedSections' => $selectedSectionKeys,
            'selectedImageFolders' => $normalisedSelectedImageFolders,
            'selectedFiles' => $normalisedSelectedFiles,
            'targetsRestored' => $targetsToExtract,
            'logPath' => (string)($logResult['path'] ?? ''),
        ];
    }

    /**
     * Builds restore preview data and pre-flight checks for a backup archive.
     *
     * @param string $selected Backup filename selected in the WebUI.
     * @return array<string, mixed>
     */
    private function getRestoreInfo(string $selected): array
    {
        $backupPath = $this->getBackupPathByName($selected);
        if ($backupPath === '') {
            return ['ok' => false, 'message' => 'Selected backup does not exist.'];
        }

        $backupName = basename($backupPath);
        $archiveInspection = $this->inspectArchiveMembers($backupPath);
        if (empty($archiveInspection['ok'])) {
            return [
                'ok' => false,
                'message' => (string)($archiveInspection['message'] ?? "Backup '$backupName' is not a valid tar.gz archive."),
            ];
        }

        $backupMeta = $this->getArchiveMetadata($backupPath, []);
        $backupType = (string)($backupMeta['backupType'] ?? 'config');
        $currentCamera = $this->getCurrentCameraInfo();

        $includedSections = (isset($backupMeta['includedSections']) && is_array($backupMeta['includedSections']))
            ? $backupMeta['includedSections']
            : $this->getIncludedSections($this->getIncludedOptionalTargetKeysFromMetadata($backupMeta), $backupType);
        $defaultSelectedSections = [];
        foreach ($includedSections as $section) {
            if (!is_array($section)) {
                continue;
            }
            $key = trim((string)($section['key'] ?? ''));
            if ($key !== '') {
                $defaultSelectedSections[$key] = true;
            }
        }
        $defaultSelectedSections = array_keys($defaultSelectedSections);
        sort($defaultSelectedSections, SORT_STRING);

        if ($backupType === 'images') {
            $hasImages = false;
            $imageTargets = (isset($backupMeta['imageTargets']) && is_array($backupMeta['imageTargets'])) ? $backupMeta['imageTargets'] : [];
            $imageFolders = (isset($backupMeta['imageFolders']) && is_array($backupMeta['imageFolders'])) ? $backupMeta['imageFolders'] : [];
            if (!empty($imageTargets) || !empty($imageFolders) || !empty($backupMeta['imageBackupAll'])) {
                $hasImages = true;
            } else if (($backupMeta['_metadataSource'] ?? '') !== 'sidecar') {
                // Fallback for older backups with incomplete metadata.
                foreach ($this->listArchiveEntries($backupPath) as $entry) {
                    if ($entry === 'images' || strpos($entry, 'images/') === 0) {
                        $hasImages = true;
                        break;
                    }
                }
            }
            return [
                'ok' => true,
                'backup' => [
                    'file' => $backupName,
                    'backupType' => 'images',
                    'created' => $backupMeta['created'] ?? '',
                    'version' => $backupMeta['version'] ?? 'unknown',
                    'cameratype' => 'n/a',
                    'cameramodel' => 'n/a',
                    'settingsfile' => '',
                    'ccfile' => '',
                    'includedOptionalTargets' => [],
                    'includedSections' => $includedSections,
                    'imageBackupAll' => !empty($backupMeta['imageBackupAll']),
                    'imageFolders' => $imageFolders,
                ],
                'currentCamera' => $currentCamera,
                'requiredModules' => [],
                'coreModules' => [],
                'userModules' => [],
                'missingModules' => [],
                'backupHasModules' => false,
                'backupModules' => [],
                'backupFiles' => (isset($backupMeta['files']) && is_array($backupMeta['files'])) ? $backupMeta['files'] : [],
                'sections' => [
                    'included' => $includedSections,
                    'defaultSelected' => $defaultSelectedSections,
                ],
                'restoreChecks' => [
                    [
                        'name' => 'Images folder present in backup',
                        'passed' => $hasImages,
                        'detail' => $hasImages ? 'Image files detected in archive.' : 'No image files were found in this backup.',
                    ],
                ],
                'canRestore' => $hasImages,
                'errors' => $hasImages ? [] : ['No image files were found in this backup.'],
            ];
        }

        $requiredModules = (isset($backupMeta['requiredModules']) && is_array($backupMeta['requiredModules']))
            ? $backupMeta['requiredModules']
            : [];
        if (empty($requiredModules) && ($backupMeta['_metadataSource'] ?? '') !== 'sidecar') {
            $requiredModules = $this->getRequiredModulesFromArchive($backupPath);
        }
        $requiredModules = array_values(array_unique(array_map(static fn($m) => basename(trim((string)$m)), $requiredModules)));
        $requiredModules = array_values(array_filter($requiredModules, static fn($m) => $m !== ''));
        sort($requiredModules, SORT_NATURAL | SORT_FLAG_CASE);

        $backupModules = (isset($backupMeta['backupModules']) && is_array($backupMeta['backupModules']))
            ? $backupMeta['backupModules']
            : [];
        $backupModules = array_values(array_unique(array_map(static fn($m) => basename(trim((string)$m)), $backupModules)));
        $backupModules = array_values(array_filter($backupModules, static fn($m) => $m !== ''));
        sort($backupModules, SORT_NATURAL | SORT_FLAG_CASE);
        $hasBackupHasModulesMeta = array_key_exists('backupHasModules', $backupMeta) && $backupMeta['backupHasModules'] !== null;
        if (empty($backupModules) && !$hasBackupHasModulesMeta && ($backupMeta['_metadataSource'] ?? '') !== 'sidecar') {
            $backupModules = $this->getModulesFromBackupArchive($backupPath);
        }

        if ($hasBackupHasModulesMeta) {
            $backupHasModules = !empty($backupMeta['backupHasModules']);
        } else if (($backupMeta['_metadataSource'] ?? '') !== 'sidecar') {
            $backupHasModules = !empty($backupModules) || $this->backupContainsModulesFiles($backupPath, $backupMeta);
        } else {
            $backupHasModules = !empty($backupModules);
        }
        $classified = $this->classifyRequiredModules($requiredModules);
        $coreModules = $classified['coreModules'];
        $userModules = $classified['userModules'];
        $missingModules = $classified['missingModules'];

        $canRestore = true;
        $errors = [];
        $checks = [];

        $hasCameraInfo = !($backupMeta['cameratype'] === 'unknown' || $backupMeta['cameramodel'] === 'unknown');
        $checks[] = [
            'name' => 'Backup camera metadata present',
            'passed' => $hasCameraInfo,
            'detail' => $hasCameraInfo
                ? ('Backup camera: ' . $backupMeta['cameratype'] . ' / ' . $backupMeta['cameramodel'])
                : 'Backup is missing valid camera type/model metadata.',
        ];

        if (!$hasCameraInfo) {
            $canRestore = false;
            $errors[] = "Backup '$backupName' does not contain valid camera type/model information.";
        }

        $cameraMatches = (
            $backupMeta['cameratype'] !== $currentCamera['cameratype'] ||
            $backupMeta['cameramodel'] !== $currentCamera['cameramodel']
        ) ? false : true;
        $checks[] = [
            'name' => 'Backup camera matches current camera',
            'passed' => $cameraMatches,
            'detail' => 'Current: ' . $currentCamera['cameratype'] . ' / ' . $currentCamera['cameramodel'],
        ];

        if ($hasCameraInfo && !$cameraMatches) {
            $canRestore = false;
            $errors[] = "Backup camera mismatch. Current camera is '{$currentCamera['cameratype']} {$currentCamera['cameramodel']}', backup camera is '{$backupMeta['cameratype']} {$backupMeta['cameramodel']}'.";
        }

        $hasSettingsFile = trim((string)($backupMeta['settingsfile'] ?? '')) !== '';
        $checks[] = [
            'name' => 'Camera settings file detected',
            'passed' => $hasSettingsFile,
            'detail' => $hasSettingsFile ? (string)$backupMeta['settingsfile'] : 'Missing settings file in backup.',
        ];
        if (!$hasSettingsFile) {
            $canRestore = false;
            $errors[] = 'Backup is missing settings file information.';
        }

        $hasCcFile = trim((string)($backupMeta['ccfile'] ?? '')) !== '';
        $checks[] = [
            'name' => 'CC file detected',
            'passed' => $hasCcFile,
            'detail' => $hasCcFile ? (string)$backupMeta['ccfile'] : 'Missing cc file in backup.',
        ];
        if (!$hasCcFile) {
            $canRestore = false;
            $errors[] = 'Backup is missing cc file information.';
        }

        $modulesAvailable = $backupHasModules ? true : empty($missingModules);
        $checks[] = [
            'name' => $backupHasModules ? 'Module files included in backup' : 'All required modules available',
            'passed' => $modulesAvailable,
            'detail' => $backupHasModules
                ? (count($backupModules) . ' module files included in backup archive')
                : ($modulesAvailable
                    ? (count($requiredModules) . ' required modules found locally')
                    : ('Missing: ' . implode(', ', $missingModules))),
        ];
        if (!$backupHasModules && !empty($missingModules)) {
            $canRestore = false;
            $errors[] = 'Missing required module files: ' . implode(', ', $missingModules);
        }

        return [
            'ok' => true,
            'backup' => [
                'file' => $backupName,
                'backupType' => $backupType,
                'created' => $backupMeta['created'] ?? '',
                'version' => $backupMeta['version'] ?? 'unknown',
                'cameratype' => $backupMeta['cameratype'] ?? 'unknown',
                'cameramodel' => $backupMeta['cameramodel'] ?? 'unknown',
                'settingsfile' => $backupMeta['settingsfile'] ?? '',
                'ccfile' => $backupMeta['ccfile'] ?? '',
                'includedOptionalTargets' => (isset($backupMeta['includedOptionalTargets']) && is_array($backupMeta['includedOptionalTargets']))
                    ? $backupMeta['includedOptionalTargets']
                    : [],
                'includedSections' => (isset($backupMeta['includedSections']) && is_array($backupMeta['includedSections']))
                    ? $backupMeta['includedSections']
                    : $this->getIncludedSections($this->getIncludedOptionalTargetKeysFromMetadata($backupMeta), $backupType),
                'imageBackupAll' => !empty($backupMeta['imageBackupAll']),
                'imageFolders' => (isset($backupMeta['imageFolders']) && is_array($backupMeta['imageFolders'])) ? $backupMeta['imageFolders'] : [],
            ],
            'currentCamera' => $currentCamera,
            'requiredModules' => $requiredModules,
            'coreModules' => $coreModules,
            'userModules' => $userModules,
            'missingModules' => $missingModules,
            'backupHasModules' => $backupHasModules,
            'backupModules' => $backupModules,
            'backupFiles' => (isset($backupMeta['files']) && is_array($backupMeta['files'])) ? $backupMeta['files'] : [],
            'sections' => [
                'included' => $includedSections,
                'defaultSelected' => $defaultSelectedSections,
            ],
            'restoreChecks' => $checks,
            'canRestore' => $canRestore,
            'errors' => $errors,
        ];
    }

    /**
     * Deletes a local backup archive and any metadata sidecar.
     *
     * @param string $selected Backup filename selected in the WebUI.
     * @return array{ok: bool, message?: string, file?: string, warning?: string}
     */
    private function deleteBackupArchive(string $selected): array
    {
        $backupPath = $this->getBackupPathByName($selected);
        if ($backupPath === '') {
            return ['ok' => false, 'message' => 'Selected backup does not exist.'];
        }

        $backupName = basename($backupPath);
        if (!@unlink($backupPath)) {
            $cmd = 'sudo -n rm -f ' . escapeshellarg($backupPath) . ' 2>&1';
            $output = [];
            $ret = 0;
            exec($cmd, $output, $ret);
            if ($ret !== 0 || file_exists($backupPath)) {
                $details = trim(implode("\n", $output));
                $message = "Failed to delete backup '$backupName'.";
                if ($details !== '') {
                    $message .= ' ' . $details;
                }
                return ['ok' => false, 'message' => $message];
            }
        }

        $sidecar = $this->getBackupSidecarPath($backupPath);
        if ($sidecar !== '' && is_file($sidecar)) {
            @unlink($sidecar);
        }

        $warning = '';
        if (!$this->writeBackupMetadata()) {
            $warning = 'Backup deleted, but backup metadata could not be updated.';
        }

        return [
            'ok' => true,
            'file' => $backupName,
            'warning' => $warning,
        ];
    }

    /**
     * Accepts, validates, and stores an uploaded backup archive.
     *
     * @return array<string, mixed>
     */
    private function uploadBackupArchive(): array
    {
        $backupDirResult = $this->ensureBackupDir();
        if (empty($backupDirResult['ok'])) {
            return ['ok' => false, 'message' => (string)($backupDirResult['message'] ?? 'Unable to create backup folder.')];
        }

        if (!isset($_FILES['backupFile']) || !is_array($_FILES['backupFile'])) {
            return ['ok' => false, 'message' => 'No upload file received.'];
        }

        $upload = $_FILES['backupFile'];
        $err = (int)($upload['error'] ?? UPLOAD_ERR_NO_FILE);
        if ($err !== UPLOAD_ERR_OK) {
            return ['ok' => false, 'message' => 'Upload failed.'];
        }

        $tmpPath = (string)($upload['tmp_name'] ?? '');
        if ($tmpPath === '' || !is_uploaded_file($tmpPath)) {
            return ['ok' => false, 'message' => 'Uploaded file is invalid.'];
        }

        $originalName = basename((string)($upload['name'] ?? ''));
        if ($originalName === '' || !preg_match('/\.tar\.gz$/i', $originalName)) {
            return ['ok' => false, 'message' => 'Uploaded file must be a .tar.gz backup archive.'];
        }

        $validation = $this->validateBackupArchive($tmpPath);
        if (empty($validation['ok'])) {
            return ['ok' => false, 'message' => (string)($validation['message'] ?? 'Uploaded file is not a valid backup.')];
        }

        $safeName = preg_replace('/[^A-Za-z0-9._-]/', '_', $originalName);
        if ($safeName === null || $safeName === '') {
            $safeName = 'allsky-config-backup-upload-' . $this->formatLocalDate('Ymd-His') . '.tar.gz';
        }
        if (!preg_match('/\.tar\.gz$/i', $safeName)) {
            $safeName .= '.tar.gz';
        }

        $targetPath = $this->getBackupDir() . '/' . $safeName;
        if (file_exists($targetPath)) {
            $base = preg_replace('/\.tar\.gz$/i', '', $safeName);
            if ($base === null || $base === '') {
                $base = 'allsky-config-backup-upload';
            }
            $safeName = $base . '-' . $this->formatLocalDate('Ymd-His') . '.tar.gz';
            $targetPath = $this->getBackupDir() . '/' . $safeName;
        }

        if (!@move_uploaded_file($tmpPath, $targetPath)) {
            return ['ok' => false, 'message' => 'Failed to store uploaded backup file.'];
        }

        @chmod($targetPath, 0664);

        $meta = $this->getArchiveMetadata($targetPath, [], false);
        if (!empty($meta)) {
            $sidecarMeta = [
                'backupType' => $meta['backupType'] ?? 'config',
                'version' => $meta['version'] ?? 'unknown',
                'cameratype' => $meta['cameratype'] ?? 'unknown',
                'cameramodel' => $meta['cameramodel'] ?? 'unknown',
                'created' => $meta['created'] ?? '',
                'settingsfile' => $meta['settingsfile'] ?? '',
                'ccfile' => $meta['ccfile'] ?? '',
                'permissions' => $meta['permissions'] ?? [],
                'includedOptionalTargets' => $meta['includedOptionalTargets'] ?? [],
                'includedSections' => $meta['includedSections'] ?? [],
                'imageBackupAll' => $meta['imageBackupAll'] ?? false,
                'imageFolders' => $meta['imageFolders'] ?? [],
                'imageTargets' => $meta['imageTargets'] ?? [],
                'requiredModules' => $meta['requiredModules'] ?? [],
                'backupModules' => $meta['backupModules'] ?? [],
                'backupHasModules' => $meta['backupHasModules'] ?? null,
                'files' => $meta['files'] ?? [],
            ];
            $this->writeBackupSidecarMetadata($targetPath, $sidecarMeta);
        }

        $warning = '';
        if (!$this->writeBackupMetadata()) {
            $warning = "Upload succeeded, but metadata file '" . $this->getBackupMetadataFile() . "' could not be updated.";
        }

        return [
            'ok' => true,
            'file' => $safeName,
            'warning' => $warning,
        ];
    }

    /**
     * Builds the status payload used by backup and restore screens.
     *
     * @return array<string, mixed>
     */
    private function getStatusData(): array
    {
        $imagesStats = $this->getImagesFolderStats();
        $configSectionStats = $this->getConfigSectionStats();
        $backups = [];
        foreach ($this->getBackupList() as $backup) {
            $meta = $this->getArchiveMetadata($backup['path'], $backup);
            $backups[] = [
                'name' => $backup['name'],
                'sizeBytes' => (int)$backup['sizeBytes'],
                'createdTs' => (int)$backup['createdTs'],
                'created' => $meta['created'],
                'version' => $meta['version'],
                'backupType' => $meta['backupType'] ?? 'config',
                'cameratype' => $meta['cameratype'],
                'cameramodel' => $meta['cameramodel'],
            ];
        }

        return [
            'currentVersion' => $this->getCurrentVersion(),
            'backupDirectory' => $this->getBackupDir(),
            'metadataFile' => $this->getBackupMetadataFile(),
            'backupTargets' => $this->getBackupTargets(),
            'optionalTargets' => $this->getOptionalTargets(),
            'configSectionStats' => $configSectionStats,
            'imagesFolders' => $this->getImagesFolderList(),
            'imagesFolderStats' => $imagesStats['folders'],
            'imagesTotalSizeBytes' => $imagesStats['totalSizeBytes'],
            'imagesTotalEstimatedCompressedBytes' => $imagesStats['totalEstimatedCompressedBytes'],
            'backups' => $backups,
            'metadata' => $this->readBackupMetadata(),
        ];
    }

    /**
     * Handles a status request from the WebUI.
     */
    public function getStatus(): void
    {
        if (!$this->ensureBackupMetadataFile()) {
            $this->sendHTTPResponse('Unable to create or update backup metadata file.', 500);
        }

        $this->sendResponse($this->getStatusData());
    }

    /**
     * Handles a request to create a configuration or image backup.
     */
    public function postCreate(): void
    {
        $backupType = strtolower(trim((string)($_POST['backupType'] ?? 'config')));
        if ($backupType !== 'images') {
            $backupType = 'config';
        }

        $backupAllImages = true;
        if (isset($_POST['backupAllImages'])) {
            $rawAll = strtolower(trim((string)$_POST['backupAllImages']));
            $backupAllImages = in_array($rawAll, ['1', 'true', 'yes', 'on'], true);
        }
        $selectedImageFolders = [];
        if (isset($_POST['imageFolders'])) {
            $rawFolders = $_POST['imageFolders'];
            if (is_array($rawFolders)) {
                $selectedImageFolders = $rawFolders;
            } else {
                $decodedFolders = json_decode((string)$rawFolders, true);
                if (is_array($decodedFolders)) {
                    $selectedImageFolders = $decodedFolders;
                } else {
                    $selectedImageFolders = array_map('trim', explode(',', (string)$rawFolders));
                }
            }
        }

        $selectedOptionalTargetKeys = [];
        if (isset($_POST['optionalTargets'])) {
            $raw = $_POST['optionalTargets'];
            if (is_array($raw)) {
                $selectedOptionalTargetKeys = $raw;
            } else {
                $decoded = json_decode((string)$raw, true);
                if (is_array($decoded)) {
                    $selectedOptionalTargetKeys = $decoded;
                } else {
                    $parts = explode(',', (string)$raw);
                    $selectedOptionalTargetKeys = array_map('trim', $parts);
                }
            }
        }

        if ($backupType === 'images') {
            $result = $this->createImagesBackupArchive($backupAllImages, $selectedImageFolders);
        } else {
            $result = $this->createConfigBackupArchive($selectedOptionalTargetKeys);
        }
        if (empty($result['ok'])) {
            $this->sendHTTPResponse((string)($result['message'] ?? 'Backup failed.'), 500);
        }

        $label = ($backupType === 'images') ? 'Images backup created: ' : 'Backup created: ';
        $message = $label . ($result['file'] ?? 'unknown') . '.';
        if (!empty($result['version'])) {
            $message .= ' Version ' . $result['version'] . '.';
        }

        $response = [
            'ok' => true,
            'message' => $message,
            'status' => $this->getStatusData(),
        ];

        if (!empty($result['warning'])) {
            $response['warning'] = (string)$result['warning'];
        }
        if (isset($result['includedOptionalTargets'])) {
            $response['includedOptionalTargets'] = $result['includedOptionalTargets'];
        }
        if (isset($result['steps']) && is_array($result['steps'])) {
            $response['steps'] = $result['steps'];
        }

        $this->sendResponse($response);
    }

    /**
     * Handles a request for restore preview and compatibility checks.
     */
    public function postRestoreInfo(): void
    {
        $selected = (string)($_POST['file'] ?? '');
        $result = $this->getRestoreInfo($selected);
        if (empty($result['ok'])) {
            $this->sendHTTPResponse((string)($result['message'] ?? 'Unable to load restore details.'), 500);
        }
        $this->sendResponse($result);
    }

    /**
     * Handles a request to restore selected backup sections or files.
     */
    public function postRestore(): void
    {
        $selected = (string)($_POST['file'] ?? '');
        $selectedSections = [];
        $selectedImageFolders = [];
        $selectedFiles = [];
        if (isset($_POST['selectedSections'])) {
            $raw = $_POST['selectedSections'];
            if (is_array($raw)) {
                $selectedSections = $raw;
            } else {
                $decoded = json_decode((string)$raw, true);
                if (is_array($decoded)) {
                    $selectedSections = $decoded;
                } else {
                    $selectedSections = array_map('trim', explode(',', (string)$raw));
                }
            }
        }
        if (isset($_POST['selectedImageFolders'])) {
            $raw = $_POST['selectedImageFolders'];
            if (is_array($raw)) {
                $selectedImageFolders = $raw;
            } else {
                $decoded = json_decode((string)$raw, true);
                if (is_array($decoded)) {
                    $selectedImageFolders = $decoded;
                } else {
                    $selectedImageFolders = array_map('trim', explode(',', (string)$raw));
                }
            }
        }
        if (isset($_POST['selectedFiles'])) {
            $raw = $_POST['selectedFiles'];
            if (is_array($raw)) {
                $selectedFiles = $raw;
            } else {
                $decoded = json_decode((string)$raw, true);
                if (is_array($decoded)) {
                    $selectedFiles = $decoded;
                } else {
                    $selectedFiles = array_map('trim', explode(',', (string)$raw));
                }
            }
        }
        $result = $this->restoreBackupArchive($selected, $selectedSections, $selectedImageFolders, $selectedFiles);

        if (empty($result['ok'])) {
            $this->sendHTTPResponse((string)($result['message'] ?? 'Restore failed.'), 500);
        }

        $response = [
            'ok' => true,
            'message' => 'Backup restored from ' . ($result['file'] ?? 'selected file') . '.',
            'status' => $this->getStatusData(),
        ];

        if (!empty($result['warning'])) {
            $response['warning'] = (string)$result['warning'];
        }
        if (isset($result['steps']) && is_array($result['steps'])) {
            $response['steps'] = $result['steps'];
        }
        $response['restoreSummary'] = [
            'file' => (string)($result['file'] ?? $selected),
            'backupType' => (string)($result['backupType'] ?? 'config'),
            'mode' => (string)($result['mode'] ?? 'normal'),
            'backupVersionFrom' => (string)($result['backupVersionFrom'] ?? 'unknown'),
            'restoreVersionTo' => (string)($result['restoreVersionTo'] ?? 'unknown'),
            'cameraFrom' => (string)($result['cameraFrom'] ?? ''),
            'cameraTo' => (string)($result['cameraTo'] ?? ''),
            'selectedSections' => (isset($result['selectedSections']) && is_array($result['selectedSections'])) ? $result['selectedSections'] : [],
            'selectedImageFolders' => (isset($result['selectedImageFolders']) && is_array($result['selectedImageFolders'])) ? $result['selectedImageFolders'] : [],
            'selectedFiles' => (isset($result['selectedFiles']) && is_array($result['selectedFiles'])) ? $result['selectedFiles'] : [],
            'targetsRestored' => (isset($result['targetsRestored']) && is_array($result['targetsRestored'])) ? $result['targetsRestored'] : [],
            'logPath' => (string)($result['logPath'] ?? ''),
            'warning' => (string)($result['warning'] ?? ''),
        ];

        $this->sendResponse($response);
    }

    /**
     * Handles a request to delete a stored backup.
     */
    public function postDelete(): void
    {
        $selected = (string)($_POST['file'] ?? '');
        $result = $this->deleteBackupArchive($selected);

        if (empty($result['ok'])) {
            $this->sendHTTPResponse((string)($result['message'] ?? 'Delete failed.'), 500);
        }

        $response = [
            'ok' => true,
            'message' => 'Backup deleted: ' . ($result['file'] ?? 'selected file') . '.',
        ];

        if (!empty($result['warning'])) {
            $response['warning'] = (string)$result['warning'];
        }

        $this->sendResponse($response);
    }

    /**
     * Streams a backup selected with query parameters.
     */
    public function getDownload(): void
    {
        $selected = (string)($_GET['file'] ?? '');
        $this->streamBackupDownload($selected);
    }

    /**
     * Streams a backup selected with posted form data.
     */
    public function postDownload(): void
    {
        $selected = (string)($_POST['file'] ?? '');
        $this->streamBackupDownload($selected);
    }

    /**
     * Sends a backup archive as a file download and exits.
     *
     * @param string $selected Backup filename selected in the WebUI.
     */
    private function streamBackupDownload(string $selected): void
    {
        $backupPath = $this->getBackupPathByName($selected);
        if ($backupPath === '') {
            $this->sendHTTPResponse('Selected backup does not exist.', 404);
        }

        $backupName = basename($backupPath);
        $size = @filesize($backupPath);
        if ($size === false) $size = 0;

        header('Content-Description: File Transfer');
        header('Content-Type: application/gzip');
        header('Content-Disposition: attachment; filename="' . $backupName . '"');
        header('Content-Transfer-Encoding: binary');
        header('Content-Length: ' . (string)$size);
        header('Cache-Control: no-store, no-cache, must-revalidate');
        header('Pragma: no-cache');
        readfile($backupPath);
        exit;
    }

    /**
     * Handles a request to upload and store a backup archive.
     */
    public function postUpload(): void
    {
        $result = $this->uploadBackupArchive();
        if (empty($result['ok'])) {
            $this->sendHTTPResponse((string)($result['message'] ?? 'Upload failed.'), 500);
        }

        $response = [
            'ok' => true,
            'message' => 'Backup uploaded: ' . ($result['file'] ?? 'uploaded file') . '.',
            'status' => $this->getStatusData(),
        ];

        if (!empty($result['warning'])) {
            $response['warning'] = (string)$result['warning'];
        }

        $this->sendResponse($response);
    }
}

/**
 * Path to the current script, used to run the controller only when invoked directly.
 *
 * @var string|false $entry
 */
$entry = PHP_SAPI === 'cli'
    ? realpath($_SERVER['argv'][0] ?? '')
    : realpath($_SERVER['SCRIPT_FILENAME'] ?? '');

if ($entry === __FILE__) {
    (new CONFIGBACKUPUTIL())->run();
}
