<?php
declare(strict_types=1);

include_once('functions.php');
initialize_variables();
include_once('authenticate.php');
include_once('utilbase.php');

class CONFIGBACKUPUTIL extends UTILBASE
{
    private string $allskyHome;
    private string $allskyConfig;
    private ?string $cachedAllskyOwner = null;

    public function __construct()
    {
        $this->allskyHome = rtrim(ALLSKY_HOME, '/\\');
        $this->allskyConfig = rtrim(ALLSKY_CONFIG, '/\\');
    }

    protected function getRoutes(): array
    {
        return [
            'Status' => ['get'],
            'Create' => ['post'],
            'RestoreInfo' => ['post'],
            'Restore' => ['post'],
            'Delete' => ['post'],
            'Download' => ['get'],
            'Upload' => ['post'],
        ];
    }

    private function getBackupDir(): string
    {
        return rtrim(dirname($this->allskyHome), '/\\') . '/allskybackups';
    }

    private function getBackupMetadataFile(): string
    {
        return $this->allskyConfig . '/backup.json';
    }

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

    private function cameraToken(string $value): string
    {
        $token = str_replace(' ', '_', trim($value));
        $token = preg_replace('/[^A-Za-z0-9._-]/', '_', $token);
        if ($token === null || $token === '') {
            return 'unknown';
        }
        return $token;
    }

    private function getResolvedSettingsFile(): string
    {
        $cameraInfo = $this->getCurrentCameraInfo();
        $type = $this->cameraToken((string)$cameraInfo['cameratype']);
        $model = $this->cameraToken((string)$cameraInfo['cameramodel']);
        return 'config/settings_' . $type . '_' . $model . '.json';
    }

    private function getResolvedCcFile(): string
    {
        $cameraInfo = $this->getCurrentCameraInfo();
        $type = $this->cameraToken((string)$cameraInfo['cameratype']);
        $model = $this->cameraToken((string)$cameraInfo['cameramodel']);
        return 'config/cc_' . $type . '_' . $model . '.json';
    }

    private function getBackupTargets(): array
    {
        return [
            '/config/settings.json',
            '/config/cc.json',
            '/config/overlay/mytemplates/*',
            '/config/overlay/images/*',
            '/config/overlay/imagethumbnails/*',
            '/config/overlay/fonts/*',
            '/config/overlay/config/*',
            '/config/modules/*',
            './env.json',
        ];
    }

    private function getArchiveTargets(): array
    {
        $targets = [];
        foreach ($this->getBackupTargets() as $target) {
            $clean = trim($target);
            if ($clean === '') {
                continue;
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
            if ($clean !== '') {
                $targets[] = $clean;
            }
        }
        return array_values(array_unique($targets));
    }

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

    private function getBackupPathByName(string $selected): string
    {
        $backupName = basename(trim($selected));
        if ($backupName === '') {
            return '';
        }

        $backupPath = $this->getBackupDir() . '/' . $backupName;
        if (!is_file($backupPath) || !is_readable($backupPath)) {
            return '';
        }

        return $backupPath;
    }

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

    private function writeBackupMetadata(array $extra = []): bool
    {
        $existing = $this->readBackupMetadata();

        $metadata = [
            'backupDirectory' => $this->getBackupDir(),
            'backupTargets' => $this->getBackupTargets(),
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

        return true;
    }

    private function extractArchiveFile(string $backupPath, string $archivePath): string
    {
        if (!is_file($backupPath) || !is_readable($backupPath)) {
            return '';
        }

        $cmd = 'tar -xOf ' . escapeshellarg($backupPath) . ' ' . escapeshellarg($archivePath) . ' 2>/dev/null';
        $output = [];
        $ret = 0;
        exec($cmd, $output, $ret);
        if ($ret !== 0) {
            return '';
        }

        return implode("\n", $output);
    }

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

        return [
            'mode' => sprintf('%04o', ($perms & 07777)),
            'owner' => $owner,
            'group' => $group,
            'ownerId' => (int)$ownerId,
            'groupId' => (int)$groupId,
        ];
    }

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

    private function applyPermissionsMetadata(array $permissions): array
    {
        $errors = [];
        $allskyOwner = $this->getConfiguredAllskyOwner();
        foreach ($permissions as $relativePath => $info) {
            $relativePath = ltrim((string)$relativePath, '/');
            if ($relativePath === '' || preg_match('/(^|\/)\.\.(\/|$)/', $relativePath)) {
                continue;
            }

            $fullPath = $this->allskyHome . '/' . $relativePath;
            if (!file_exists($fullPath) && !is_link($fullPath)) {
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
                $cmd = 'sudo -n /bin/chown ' . escapeshellarg($owner . ':' . $group) . ' ' . escapeshellarg($fullPath) . ' 2>&1';
                $out = [];
                $ret = 0;
                exec($cmd, $out, $ret);
                if ($ret !== 0) {
                    $errors[] = 'chown ' . $relativePath . ': ' . trim(implode("\n", $out));
                }
            }

            $mode = trim((string)($info['mode'] ?? ''));
            if (preg_match('/^[0-7]{3,4}$/', $mode)) {
                $cmd = 'sudo -n /bin/chmod ' . escapeshellarg($mode) . ' ' . escapeshellarg($fullPath) . ' 2>&1';
                $out = [];
                $ret = 0;
                exec($cmd, $out, $ret);
                if ($ret !== 0) {
                    $errors[] = 'chmod ' . $relativePath . ': ' . trim(implode("\n", $out));
                }
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

    private function getSettingsFilesFromArchive(string $backupPath): array
    {
        if (!is_file($backupPath) || !is_readable($backupPath)) {
            return [];
        }

        $cmd = 'tar -tzf ' . escapeshellarg($backupPath) . ' 2>/dev/null';
        $output = [];
        $ret = 0;
        exec($cmd, $output, $ret);
        if ($ret !== 0) {
            return [];
        }

        $settingsFiles = [];
        foreach ($output as $entry) {
            $entry = trim((string)$entry);
            if ($entry === 'config/settings.json' || preg_match('/^config\\/settings_.+\\.json$/', $entry)) {
                $settingsFiles[] = $entry;
            }
        }

        return array_values(array_unique($settingsFiles));
    }

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

    private function getCcFilesFromArchive(string $backupPath): array
    {
        if (!is_file($backupPath) || !is_readable($backupPath)) {
            return [];
        }

        $cmd = 'tar -tzf ' . escapeshellarg($backupPath) . ' 2>/dev/null';
        $output = [];
        $ret = 0;
        exec($cmd, $output, $ret);
        if ($ret !== 0) {
            return [];
        }

        $ccFiles = [];
        foreach ($output as $entry) {
            $entry = trim((string)$entry);
            if ($entry === 'config/cc.json' || preg_match('/^config\\/cc_.+\\.json$/', $entry)) {
                $ccFiles[] = $entry;
            }
        }

        return array_values(array_unique($ccFiles));
    }

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

    private function getArchiveMetadata(string $backupPath, array $backupFileInfo = []): array
    {
        $raw = $this->extractArchiveFile($backupPath, 'metadata.json');
        $decoded = [];
        if ($raw !== '') {
            $tmp = json_decode($raw, true);
            if (is_array($tmp)) {
                $decoded = $tmp;
            }
        }

        $version = trim((string)($decoded['version'] ?? ''));
        if ($version === '') {
            $version = trim($this->getBackupVersionFromArchive($backupPath));
        }
        if ($version === '') {
            $version = 'unknown';
        }

        $cameraType = trim((string)($decoded['cameratype'] ?? ''));
        $cameraModel = trim((string)($decoded['cameramodel'] ?? ''));
        if ($cameraType === '' || $cameraModel === '') {
            $cameraInfo = $this->getBackupCameraFromArchive($backupPath);
            if ($cameraType === '') $cameraType = $cameraInfo['cameratype'];
            if ($cameraModel === '') $cameraModel = $cameraInfo['cameramodel'];
        }
        if ($cameraType === '') $cameraType = 'unknown';
        if ($cameraModel === '') $cameraModel = 'unknown';

        $created = trim((string)($decoded['created'] ?? ''));
        if ($created === '') {
            $ts = (int)($backupFileInfo['createdTs'] ?? 0);
            $created = ($ts > 0) ? date(DATE_TIME_FORMAT, $ts) : '';
        }

        return [
            'version' => $version,
            'cameratype' => $cameraType,
            'cameramodel' => $cameraModel,
            'created' => $created,
            'settingsfile' => $this->getSettingsFileFromArchive($backupPath),
            'ccfile' => $this->getCcFileFromArchive($backupPath),
            'permissions' => (isset($decoded['permissions']) && is_array($decoded['permissions'])) ? $decoded['permissions'] : [],
        ];
    }

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

    private function validateBackupArchive(string $archivePath): array
    {
        if (!is_file($archivePath) || !is_readable($archivePath)) {
            return ['ok' => false, 'message' => 'Uploaded file is not readable.'];
        }

        $cmd = 'tar -tzf ' . escapeshellarg($archivePath) . ' 2>&1';
        $output = [];
        $ret = 0;
        exec($cmd, $output, $ret);
        if ($ret !== 0) {
            return ['ok' => false, 'message' => 'Uploaded file is not a valid tar.gz backup.'];
        }

        $entries = array_map('trim', $output);
        $required = ['env.json', 'metadata.json'];
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

        $metadata = $this->getArchiveMetadata($archivePath, []);
        if ($metadata['version'] === 'unknown' || $metadata['cameratype'] === 'unknown' || $metadata['cameramodel'] === 'unknown') {
            return ['ok' => false, 'message' => 'Uploaded backup metadata is invalid (missing version/camera information).'];
        }

        return ['ok' => true];
    }

    private function createBackupArchive(): array
    {
        $backupDirResult = $this->ensureBackupDir();
        if (empty($backupDirResult['ok'])) {
            return ['ok' => false, 'message' => (string)($backupDirResult['message'] ?? 'Unable to create backup folder.')];
        }

        $targets = [];
        foreach ($this->getArchiveTargets() as $target) {
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

        $backupName = 'allsky-config-backup-' . date('Ymd-His') . '.tar.gz';
        $backupPath = $this->getBackupDir() . '/' . $backupName;

        $cameraInfo = $this->getCurrentCameraInfo();
        $archiveMetadata = [
            'backupFile' => $backupName,
            'created' => date(DATE_TIME_FORMAT),
            'version' => $this->getCurrentVersion(),
            'cameratype' => $cameraInfo['cameratype'],
            'cameramodel' => $cameraInfo['cameramodel'],
            'settingsfile' => $this->getResolvedSettingsFile(),
            'ccfile' => $this->getResolvedCcFile(),
            'permissions' => $this->buildPermissionsMetadata($targets),
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

        $cmd = 'tar -czf ' . escapeshellarg($backupPath) . ' -C ' . escapeshellarg($this->allskyHome);
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

        $size = (int) (@filesize($backupPath) ?: 0);
        $metadataExtra = [];

        if (!$this->writeBackupMetadata($metadataExtra)) {
            return [
                'ok' => true,
                'file' => $backupName,
                'sizeBytes' => $size,
                'version' => $archiveMetadata['version'],
                'warning' => "Backup succeeded, but metadata file '" . $this->getBackupMetadataFile() . "' could not be updated.",
            ];
        }

        return [
            'ok' => true,
            'file' => $backupName,
            'sizeBytes' => $size,
            'version' => $archiveMetadata['version'],
        ];
    }

    private function restoreBackupArchive(string $selected): array
    {
        $backupPath = $this->getBackupPathByName($selected);
        if ($backupPath === '') {
            return ['ok' => false, 'message' => 'Selected backup does not exist.'];
        }

        $backupName = basename($backupPath);
        $currentCamera = $this->getCurrentCameraInfo();
        $backupMeta = $this->getArchiveMetadata($backupPath, []);

        if ($backupMeta['cameratype'] === 'unknown' || $backupMeta['cameramodel'] === 'unknown') {
            return ['ok' => false, 'message' => "Backup '$backupName' does not contain valid camera type/model information; restore is blocked."];
        }

        if ($backupMeta['cameratype'] !== $currentCamera['cameratype'] || $backupMeta['cameramodel'] !== $currentCamera['cameramodel']) {
            return [
                'ok' => false,
                'message' => "Backup camera mismatch. Current camera is '{$currentCamera['cameratype']} {$currentCamera['cameramodel']}', backup camera is '{$backupMeta['cameratype']} {$backupMeta['cameramodel']}'. Restore blocked.",
            ];
        }

        $requiredModules = $this->getRequiredModulesFromArchive($backupPath);
        $missingModules = $this->findMissingModuleFiles($requiredModules);
        if (!empty($missingModules)) {
            return [
                'ok' => false,
                'message' => 'Restore blocked. Missing required module files: ' . implode(', ', $missingModules),
            ];
        }

        $cmd = 'tar -xzf ' . escapeshellarg($backupPath) .
            ' -C ' . escapeshellarg($this->allskyHome) .
            ' --no-same-owner --no-same-permissions --overwrite -m' .
            ' --exclude=' . escapeshellarg('metadata.json') .
            ' 2>&1';

        $output = [];
        $ret = 0;
        exec($cmd, $output, $ret);

        $permissionWarnings = '';
        if ($ret !== 0) {
            if ($this->isIgnorableTarPermissionError($output)) {
                $permissionWarnings = 'Restore completed with permission warnings while applying file modes/timestamps.';
            } else {
                $details = trim(implode("\n", $output));
                $message = 'Restore failed.';
                if ($details !== '') {
                    $message .= ' ' . $details;
                }
                return ['ok' => false, 'message' => $message];
            }
        }

        $settingsFile = trim((string)($backupMeta['settingsfile'] ?? ''));
        if ($settingsFile === '') {
            $settingsFile = $this->getSettingsFileFromArchive($backupPath);
        }
        if ($settingsFile === '') {
            return ['ok' => false, 'message' => "Backup '$backupName' does not contain a settings file; restore is blocked."];
        }

        $settingsPath = $this->allskyHome . '/' . ltrim($settingsFile, '/');
        $settingsLink = $this->allskyHome . '/config/settings.json';
        if (!is_file($settingsPath)) {
            return ['ok' => false, 'message' => "Restored settings file '$settingsFile' is missing; restore is incomplete."];
        }
        @unlink($settingsLink);
        if (!@link($settingsPath, $settingsLink)) {
            return ['ok' => false, 'message' => "Unable to create hard link 'config/settings.json' to '$settingsFile'."];
        }

        $ccFile = trim((string)($backupMeta['ccfile'] ?? ''));
        if ($ccFile === '') {
            $ccFile = $this->getCcFileFromArchive($backupPath);
        }
        if ($ccFile === '') {
            return ['ok' => false, 'message' => "Backup '$backupName' does not contain a cc file; restore is blocked."];
        }

        $ccPath = $this->allskyHome . '/' . ltrim($ccFile, '/');
        $ccLink = $this->allskyHome . '/config/cc.json';
        if (!is_file($ccPath)) {
            return ['ok' => false, 'message' => "Restored cc file '$ccFile' is missing; restore is incomplete."];
        }
        @unlink($ccLink);
        if (!@link($ccPath, $ccLink)) {
            return ['ok' => false, 'message' => "Unable to create hard link 'config/cc.json' to '$ccFile'."];
        }

        $metadataExtra = [
            'lastRestore' => [
                'file' => $backupName,
                'restored' => date(DATE_TIME_FORMAT),
                'versionAfterRestore' => $this->getCurrentVersion(),
            ],
        ];

        $permResult = ['ok' => true];
        if (isset($backupMeta['permissions']) && is_array($backupMeta['permissions']) && !empty($backupMeta['permissions'])) {
            $permResult = $this->applyPermissionsMetadata($backupMeta['permissions']);
            if (empty($permResult['ok'])) {
                return ['ok' => false, 'message' => (string)($permResult['message'] ?? 'Failed to restore file ownership/permissions.')];
            }
        }

        $warning = '';
        if ($permissionWarnings !== '') {
            $warning = $permissionWarnings;
        }
        if (!$this->writeBackupMetadata($metadataExtra)) {
            if ($warning !== '') {
                $warning .= ' ';
            }
            $warning .= 'Backup restored, but backup metadata could not be updated.';
        }

        return [
            'ok' => true,
            'file' => $backupName,
            'warning' => $warning,
        ];
    }

    private function isIgnorableTarPermissionError(array $output): bool
    {
        $lines = array_values(array_filter(array_map(static fn($l) => trim((string)$l), $output), static fn($l) => $l !== ''));
        if (empty($lines)) {
            return false;
        }

        foreach ($lines as $line) {
            if (
                strpos($line, 'Cannot change mode') === false &&
                strpos($line, 'Cannot utime') === false &&
                strpos($line, 'Exiting with failure status due to previous errors') === false
            ) {
                return false;
            }
        }

        return true;
    }

    private function getRestoreInfo(string $selected): array
    {
        $backupPath = $this->getBackupPathByName($selected);
        if ($backupPath === '') {
            return ['ok' => false, 'message' => 'Selected backup does not exist.'];
        }

        $backupName = basename($backupPath);
        $backupMeta = $this->getArchiveMetadata($backupPath, []);
        $currentCamera = $this->getCurrentCameraInfo();

        $requiredModules = $this->getRequiredModulesFromArchive($backupPath);
        sort($requiredModules, SORT_NATURAL | SORT_FLAG_CASE);
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

        $modulesAvailable = empty($missingModules);
        $checks[] = [
            'name' => 'All required modules available',
            'passed' => $modulesAvailable,
            'detail' => $modulesAvailable
                ? (count($requiredModules) . ' required modules found locally')
                : ('Missing: ' . implode(', ', $missingModules)),
        ];
        if (!empty($missingModules)) {
            $canRestore = false;
            $errors[] = 'Missing required module files: ' . implode(', ', $missingModules);
        }

        return [
            'ok' => true,
            'backup' => [
                'file' => $backupName,
                'created' => $backupMeta['created'] ?? '',
                'version' => $backupMeta['version'] ?? 'unknown',
                'cameratype' => $backupMeta['cameratype'] ?? 'unknown',
                'cameramodel' => $backupMeta['cameramodel'] ?? 'unknown',
                'settingsfile' => $backupMeta['settingsfile'] ?? '',
                'ccfile' => $backupMeta['ccfile'] ?? '',
            ],
            'currentCamera' => $currentCamera,
            'requiredModules' => $requiredModules,
            'coreModules' => $coreModules,
            'userModules' => $userModules,
            'missingModules' => $missingModules,
            'restoreChecks' => $checks,
            'canRestore' => $canRestore,
            'errors' => $errors,
        ];
    }

    private function deleteBackupArchive(string $selected): array
    {
        $backupPath = $this->getBackupPathByName($selected);
        if ($backupPath === '') {
            return ['ok' => false, 'message' => 'Selected backup does not exist.'];
        }

        $backupName = basename($backupPath);
        if (!@unlink($backupPath)) {
            return ['ok' => false, 'message' => "Failed to delete backup '$backupName'."];
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
            $safeName = 'allsky-config-backup-upload-' . date('Ymd-His') . '.tar.gz';
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
            $safeName = $base . '-' . date('Ymd-His') . '.tar.gz';
            $targetPath = $this->getBackupDir() . '/' . $safeName;
        }

        if (!@move_uploaded_file($tmpPath, $targetPath)) {
            return ['ok' => false, 'message' => 'Failed to store uploaded backup file.'];
        }

        @chmod($targetPath, 0664);

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

    private function getStatusData(): array
    {
        $backups = [];
        foreach ($this->getBackupList() as $backup) {
            $meta = $this->getArchiveMetadata($backup['path'], $backup);
            $backups[] = [
                'name' => $backup['name'],
                'sizeBytes' => (int)$backup['sizeBytes'],
                'createdTs' => (int)$backup['createdTs'],
                'created' => $meta['created'],
                'version' => $meta['version'],
                'cameratype' => $meta['cameratype'],
                'cameramodel' => $meta['cameramodel'],
            ];
        }

        return [
            'currentVersion' => $this->getCurrentVersion(),
            'backupDirectory' => $this->getBackupDir(),
            'metadataFile' => $this->getBackupMetadataFile(),
            'backupTargets' => $this->getBackupTargets(),
            'backups' => $backups,
            'metadata' => $this->readBackupMetadata(),
        ];
    }

    public function getStatus(): void
    {
        if (!$this->ensureBackupMetadataFile()) {
            $this->sendHTTPResponse('Unable to create or update backup metadata file.', 500);
        }

        $this->sendResponse($this->getStatusData());
    }

    public function postCreate(): void
    {
        $result = $this->createBackupArchive();
        if (empty($result['ok'])) {
            $this->sendHTTPResponse((string)($result['message'] ?? 'Backup failed.'), 500);
        }

        $message = 'Backup created: ' . ($result['file'] ?? 'unknown') . '.';
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

        $this->sendResponse($response);
    }

    public function postRestoreInfo(): void
    {
        $selected = (string)($_POST['file'] ?? '');
        $result = $this->getRestoreInfo($selected);
        if (empty($result['ok'])) {
            $this->sendHTTPResponse((string)($result['message'] ?? 'Unable to load restore details.'), 500);
        }
        $this->sendResponse($result);
    }

    public function postRestore(): void
    {
        $selected = (string)($_POST['file'] ?? '');
        $result = $this->restoreBackupArchive($selected);

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

        $this->sendResponse($response);
    }

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
            'status' => $this->getStatusData(),
        ];

        if (!empty($result['warning'])) {
            $response['warning'] = (string)$result['warning'];
        }

        $this->sendResponse($response);
    }

    public function getDownload(): void
    {
        $selected = (string)($_GET['file'] ?? '');
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

$entry = PHP_SAPI === 'cli'
    ? realpath($_SERVER['argv'][0] ?? '')
    : realpath($_SERVER['SCRIPT_FILENAME'] ?? '');

if ($entry === __FILE__) {
    (new CONFIGBACKUPUTIL())->run();
}
