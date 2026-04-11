<?php
declare(strict_types=1);

include_once('functions.php');
initialize_variables();
include_once('authenticate.php');
include_once('utilbase.php');

class MODULEINSTALLERUTIL extends UTILBASE
{
    private string $allskyHome;
    private string $allskyModulesDir;
    private string $userModulesDir;
    private string $myFilesDir;
    private string $myModulesDir;
    private string $moduleDataDir;
    private string $repoUrl;
    private string $defaultBranch;
    private string $repoPath;
    private string $owner;
    private string $webGroup;
    private string $venvPython;

    protected function getRoutes(): array
    {
        return [
            'Modules' => ['get'],
            'VerifyInstalled' => ['get'],
            'Action' => ['post'],
        ];
    }

    public function __construct()
    {
        $this->allskyHome = ALLSKY_HOME;
        $this->allskyModulesDir = ALLSKY_MODULES;
        $this->userModulesDir = ALLSKY_MODULE_LOCATION . '/modules';
        $this->myFilesDir = ALLSKY_MYFILES_DIR;
        $this->myModulesDir = ALLSKY_MYFILES_DIR . '/modules';
        $this->moduleDataDir = ALLSKY_MYFILES_DIR . '/modules/moduledata';
        $this->repoUrl = rtrim((string)ALLSKY_GITHUB_ROOT, '/') . '/' . trim((string)ALLSKY_GITHUB_ALLSKY_MODULES_REPO, '/');
        $this->defaultBranch = (string)ALLSKY_GITHUB_MAIN_BRANCH;
        $this->repoPath = rtrim(sys_get_temp_dir(), '/') . '/allsky-modules';
        $this->owner = defined('ALLSKY_OWNER') ? (string)ALLSKY_OWNER : get_current_user();
        $this->webGroup = defined('ALLSKY_WEBSERVER_GROUP') ? (string)ALLSKY_WEBSERVER_GROUP : 'www-data';
        $this->venvPython = $this->allskyHome . '/venv/bin/python3';
    }

    public function getModules(): void
    {
        try {
            $requestedBranch = trim((string)($_GET['branch'] ?? ''));
            $branch = $requestedBranch !== '' ? $requestedBranch : $this->getPreferredBranch();
            $refresh = filter_var($_GET['refresh'] ?? false, FILTER_VALIDATE_BOOLEAN);

            $this->ensureRepo($branch, $refresh);
            $branches = $this->getRemoteBranches();
            if (!in_array($branch, $branches, true)) {
                $preferredBranch = $this->getPreferredBranch();
                $branch = in_array($preferredBranch, $branches, true) ? $preferredBranch : $this->defaultBranch;
            }
            $this->checkoutBranch($branch);

            $modules = [];
            foreach ($this->getSourceModuleDirectories() as $moduleName => $modulePath) {
                $modules[] = $this->buildModuleRecord($moduleName, $modulePath);
            }
            $coreModules = [];
            foreach ($this->getCoreModuleFiles() as $moduleName => $moduleFile) {
                $coreModules[] = $this->buildCoreModuleRecord($moduleName, $moduleFile);
            }

            usort($modules, static function (array $a, array $b): int {
                return strcasecmp($a['displayName'], $b['displayName']);
            });
            usort($coreModules, static function (array $a, array $b): int {
                return strcasecmp($a['displayName'], $b['displayName']);
            });

            $this->sendResponse([
                'branch' => $branch,
                'branches' => $branches,
                'repo' => $this->repoUrl,
                'modules' => $modules,
                'coreModules' => $coreModules,
                'currentVersion' => $this->getCurrentVersion(),
            ]);
        } catch (Throwable $e) {
            $this->send500($e->getMessage());
        }
    }

    public function getVerifyInstalled(): void
    {
        try {
            $requestedBranch = trim((string)($_GET['branch'] ?? ''));
            $branch = $requestedBranch !== '' ? $requestedBranch : $this->getPreferredBranch();

            $this->ensureRepo($branch, false);
            $this->checkoutBranch($branch);

            $this->sendResponse([
                'message' => $this->verifyInstalledModulesReport(),
            ]);
        } catch (Throwable $e) {
            $this->send500($e->getMessage());
        }
    }

    public function postAction(): void
    {
        try {
            $moduleName = trim((string)($_POST['module'] ?? ''));
            $action = trim((string)($_POST['action'] ?? ''));
            $requestedBranch = trim((string)($_POST['branch'] ?? ''));
            $branch = $requestedBranch !== '' ? $requestedBranch : $this->defaultBranch;

            if (!preg_match('/^allsky_[A-Za-z0-9_]+$/', $moduleName)) {
                $this->send400('Invalid module name.');
            }

            $allowedActions = ['install', 'update', 'reinstall', 'uninstall', 'migrate', 'status', 'verify'];
            if (!in_array($action, $allowedActions, true)) {
                $this->send400('Invalid action.');
            }

            $this->ensureRepo($branch, false);
            $this->checkoutBranch($branch);
            $modulePath = $this->repoPath . '/' . $moduleName;

            if ($action !== 'uninstall' && !is_dir($modulePath)) {
                $this->send404('Module not found in the repository.');
            }

            $message = '';
            switch ($action) {
                case 'install':
                case 'update':
                case 'reinstall':
                    $message = $this->installOrUpdateModule($moduleName, $modulePath, $action === 'reinstall');
                    break;
                case 'uninstall':
                    $message = $this->uninstallModule($moduleName);
                    break;
                case 'migrate':
                    $message = $this->migrateModule($moduleName, $modulePath);
                    break;
                case 'status':
                    $message = $this->getModuleStatusText($moduleName, $modulePath);
                    break;
                case 'verify':
                    $message = $this->verifyInstalledModuleText($moduleName);
                    break;
            }

            $this->sendResponse([
                'message' => $message,
                'module' => $moduleName,
                'action' => $action,
            ]);
        } catch (Throwable $e) {
            $this->send500($e->getMessage());
        }
    }

    private function buildModuleRecord(string $moduleName, string $modulePath): array
    {
        $installedInfo = $this->findInstalledModule($moduleName);
        $sourceInfo = $this->readModuleInfo($moduleName, $modulePath . '/' . $moduleName . '.py', $modulePath, 'source');

        $installed = $installedInfo !== null;
        $installedMeta = $installedInfo['meta_data'] ?? [];
        $sourceMeta = $sourceInfo['meta_data'] ?? [];

        $displayName = (string)($sourceMeta['name'] ?? $installedMeta['name'] ?? $moduleName);
        $description = (string)($sourceMeta['description'] ?? $installedMeta['description'] ?? $moduleName);
        $group = (string)($sourceMeta['group'] ?? $installedMeta['group'] ?? 'Ungrouped');
        $docsLink = (string)($sourceMeta['docs'] ?? $installedMeta['docs'] ?? $sourceMeta['helplink'] ?? $installedMeta['helplink'] ?? '');
        $installedVersion = $installedMeta['version'] ?? null;
        $sourceVersion = $sourceMeta['version'] ?? null;
        $deprecated = $this->toBool($sourceMeta['deprecation']['deprecated'] ?? $installedMeta['deprecation']['deprecated'] ?? false);
        $replacedBy = (string)($sourceMeta['deprecation']['replacedby'] ?? $installedMeta['deprecation']['replacedby'] ?? '');
        $migrationFlows = $installed ? $this->getDifferingFlows($moduleName, $installedMeta) : [];

        return [
            'module' => $moduleName,
            'displayName' => $displayName,
            'description' => $description,
            'group' => $group,
            'docs' => $docsLink,
            'installed' => $installed,
            'installedPath' => $installedInfo['path'] ?? '',
            'installedVersion' => $installedVersion,
            'sourceVersion' => $sourceVersion,
            'updateAvailable' => $this->isUpdateAvailable($installedVersion, $sourceVersion, $installed),
            'deprecated' => $deprecated,
            'replacedBy' => $replacedBy,
            'migrationRequired' => count($migrationFlows) > 0,
            'differingFlows' => $migrationFlows,
            'valid' => ($sourceInfo['valid'] ?? false) || ($installedInfo['valid'] ?? false),
            'sourceErrors' => $sourceInfo['errors'] ?? [],
            'installedErrors' => $installedInfo['errors'] ?? [],
        ];
    }

    private function getSourceModuleDirectories(): array
    {
        $modules = [];
        if (!is_dir($this->repoPath)) {
            return $modules;
        }

        foreach (scandir($this->repoPath) ?: [] as $entry) {
            if ($entry === '.' || $entry === '..') {
                continue;
            }
            if (!str_starts_with($entry, 'allsky_')) {
                continue;
            }
            $path = $this->repoPath . '/' . $entry;
            if (is_dir($path)) {
                $modules[$entry] = $path;
            }
        }

        ksort($modules, SORT_NATURAL | SORT_FLAG_CASE);
        return $modules;
    }

    private function getCoreModuleFiles(): array
    {
        $modules = [];
        $corePath = ALLSKY_SCRIPTS . '/modules';
        if (!is_dir($corePath)) {
            return $modules;
        }

        foreach (scandir($corePath) ?: [] as $entry) {
            if ($entry === '.' || $entry === '..' || $entry === 'allsky_shared.py' || $entry === 'allsky_base.py') {
                continue;
            }
            if (!str_starts_with($entry, 'allsky_') || !str_ends_with($entry, '.py')) {
                continue;
            }

            $moduleName = substr($entry, 0, -3);
            $path = $corePath . '/' . $entry;
            if (is_file($path)) {
                $modules[$moduleName] = $path;
            }
        }

        ksort($modules, SORT_NATURAL | SORT_FLAG_CASE);
        return $modules;
    }

    private function buildCoreModuleRecord(string $moduleName, string $moduleFile): array
    {
        $moduleInfo = $this->readModuleInfo($moduleName, $moduleFile, dirname($moduleFile), 'core');
        $meta = $moduleInfo['meta_data'] ?? [];
        $docsLink = (string)($meta['docs'] ?? $meta['helplink'] ?? '');
        $version = $meta['version'] ?? null;

        return [
            'module' => $moduleName,
            'displayName' => (string)($meta['name'] ?? $moduleName),
            'description' => (string)($meta['description'] ?? $moduleName),
            'group' => (string)($meta['group'] ?? 'Allsky Core'),
            'docs' => $docsLink,
            'installed' => true,
            'installedPath' => dirname($moduleFile),
            'installedVersion' => $version,
            'sourceVersion' => $version,
            'updateAvailable' => false,
            'deprecated' => $this->toBool($meta['deprecation']['deprecated'] ?? false),
            'replacedBy' => (string)($meta['deprecation']['replacedby'] ?? ''),
            'migrationRequired' => false,
            'differingFlows' => [],
            'valid' => $moduleInfo['valid'] ?? false,
            'sourceErrors' => $moduleInfo['errors'] ?? [],
            'installedErrors' => [],
            'core' => true,
        ];
    }

    private function findInstalledModule(string $moduleName): ?array
    {
        $paths = [
            $this->myModulesDir,
            $this->userModulesDir,
            ALLSKY_SCRIPTS . '/modules',
        ];

        foreach ($paths as $path) {
            $file = $path . '/' . $moduleName . '.py';
            if (is_file($file)) {
                return $this->readModuleInfo($moduleName, $file, $path, 'installed');
            }
        }

        return null;
    }

    private function readModuleInfo(string $moduleName, string $filePath, string $basePath, string $type): array
    {
        $errors = [];
        $metaData = $this->getMetaDataFromFile($filePath);
        if ($metaData === null) {
            $errors[] = 'No valid meta data found';
        }

        if (!$this->moduleFunctionExists($moduleName, $filePath)) {
            $errors[] = 'Module has no callable function. This module will NOT work';
        }

        return [
            'type' => $type,
            'path' => $basePath,
            'full_path' => $filePath,
            'meta_data' => $metaData ?? [],
            'valid' => count($errors) === 0,
            'errors' => $errors,
        ];
    }

    private function getMetaDataFromFile(string $filePath): ?array
    {
        $metaData = $this->getMetaDataFromFileByName($filePath, 'meta_data');
        if ($metaData === null) {
            $metaData = $this->getMetaDataFromFileByName($filePath, 'metaData');
        }
        if ($metaData === null) {
            return null;
        }

        $decoded = json_decode($metaData, true);
        return is_array($decoded) ? $decoded : null;
    }

    private function getMetaDataFromFileByName(string $filePath, string $metaVariableName): ?string
    {
        if (!is_file($filePath) || !is_readable($filePath)) {
            return null;
        }

        $lines = file($filePath, FILE_IGNORE_NEW_LINES);
        if ($lines === false) {
            return null;
        }

        $found = false;
        $level = 0;
        $metaData = '';

        foreach ($lines as $line) {
            $trimmedRight = rtrim($line);
            $trimmedLeft = ltrim($line);

            if ($trimmedRight !== '' && str_ends_with($trimmedRight, '{')) {
                $level++;
            }
            if ($trimmedLeft !== '' && str_starts_with($trimmedLeft, '}')) {
                $level--;
            }
            if ($trimmedLeft !== '' && str_starts_with($trimmedLeft, $metaVariableName)) {
                $found = true;
                $line = str_replace([$metaVariableName, '=', ' '], '', $line);
            }
            if ($found) {
                $metaData .= $line . "\n";
            }
            if (trim($line) === '}' && $found && $level === 0) {
                break;
            }
        }

        return $found ? $metaData : null;
    }

    private function moduleFunctionExists(string $moduleName, string $filePath): bool
    {
        if (!is_file($filePath) || !is_readable($filePath)) {
            return false;
        }

        $contents = file_get_contents($filePath);
        if ($contents === false) {
            return false;
        }

        $functionName = preg_replace('/^allsky_/', '', $moduleName);
        $returnTypePattern = '(?:\s*->\s*[^:]+)?';
        $wrapperPattern = '/def\s+' . preg_quote((string)$functionName, '/') . '\s*\(\s*params\s*,\s*event\s*\)' . $returnTypePattern . '\s*:/m';
        $classRunPattern = '/class\s+[A-Za-z_][A-Za-z0-9_]*\s*\(\s*ALLSKYMODULEBASE\s*\)\s*:[\s\S]*?def\s+run\s*\(\s*self\b[^)]*\)' . $returnTypePattern . '\s*:/m';

        return preg_match($wrapperPattern, $contents) === 1 || preg_match($classRunPattern, $contents) === 1;
    }

    private function ensureRepo(string $branch, bool $reCheckout): void
    {
        $this->assertRepoOwnership();

        if (is_dir($this->repoPath . '/.git') && !$reCheckout) {
            $this->runGitCommand(['reset', '--hard'], null, $this->repoPath);
            $this->runGitCommand(['clean', '-fdx'], null, $this->repoPath);
            $this->runGitCommand(['fetch', '--prune', 'origin'], null, $this->repoPath);
            $this->runGitCommand(['checkout', $branch], null, $this->repoPath);
            $this->runGitCommand(['pull', 'origin', $branch], null, $this->repoPath);
            return;
        }

        if (file_exists($this->repoPath)) {
            $this->removePath($this->repoPath);
        }

        $parent = dirname($this->repoPath);
        if (!is_dir($parent) && !mkdir($parent, 0775, true) && !is_dir($parent)) {
            throw new RuntimeException('Unable to create temporary module repository folder.');
        }

        $this->runGitCommand(['clone', '--branch', $branch, $this->repoUrl, $this->repoPath], null, $parent);
    }

    private function assertRepoOwnership(): void
    {
        if (!file_exists($this->repoPath)) {
            return;
        }

        $repoOwnerId = @fileowner($this->repoPath);
        $currentUserId = function_exists('posix_geteuid') ? @posix_geteuid() : @getmyuid();

        if ($repoOwnerId === false || $currentUserId === false || $repoOwnerId === $currentUserId) {
            return;
        }

        $repoOwner = (string)$repoOwnerId;
        $currentUser = (string)$currentUserId;

        if (function_exists('posix_getpwuid')) {
            $repoOwnerInfo = @posix_getpwuid($repoOwnerId);
            $currentUserInfo = @posix_getpwuid($currentUserId);
            if (is_array($repoOwnerInfo) && isset($repoOwnerInfo['name'])) {
                $repoOwner = (string)$repoOwnerInfo['name'];
            }
            if (is_array($currentUserInfo) && isset($currentUserInfo['name'])) {
                $currentUser = (string)$currentUserInfo['name'];
            }
        }

        throw new RuntimeException(
            "Temporary module repository {$this->repoPath} is owned by {$repoOwner}, " .
            "but the WebUI is running as {$currentUser}. Please manually remove {$this->repoPath} and try again."
        );
    }

    private function getPreferredBranch(): string
    {
        $version = $this->getCurrentVersion();
        if ($version !== '') {
            return $version;
        }

        return $this->defaultBranch;
    }

    private function getCurrentVersion(): string
    {
        $candidates = [
            $this->allskyHome . '/version.txt',
            $this->allskyHome . '/version',
        ];

        foreach ($candidates as $file) {
            if (!is_file($file) || !is_readable($file)) {
                continue;
            }

            $lines = file($file, FILE_IGNORE_NEW_LINES);
            if ($lines === false || !isset($lines[0])) {
                continue;
            }

            $version = trim((string)$lines[0]);
            if ($version !== '') {
                return $version;
            }
        }

        return '';
    }

    private function getRemoteBranches(): array
    {
        $result = $this->runGitCommand(['for-each-ref', '--format=%(refname:short)', 'refs/remotes/origin'], null, $this->repoPath);
        $branches = [];

        foreach (preg_split('/\R/', trim($result)) as $line) {
            $line = trim($line);
            if ($line === '' || $line === 'origin/HEAD') {
                continue;
            }
            $branches[] = preg_replace('#^origin/#', '', $line);
        }

        $branches = array_values(array_unique($branches));
        sort($branches, SORT_NATURAL | SORT_FLAG_CASE);
        return $branches;
    }

    private function checkoutBranch(string $branch): void
    {
        $this->runGitCommand(['reset', '--hard'], null, $this->repoPath);
        $this->runGitCommand(['clean', '-fdx'], null, $this->repoPath);
        $this->runGitCommand(['checkout', $branch], null, $this->repoPath);
        $this->runGitCommand(['pull', 'origin', $branch], null, $this->repoPath);
    }

    private function installOrUpdateModule(string $moduleName, string $modulePath, bool $force): string
    {
        $installedInfo = $this->findInstalledModule($moduleName);
        $sourceInfo = $this->readModuleInfo($moduleName, $modulePath . '/' . $moduleName . '.py', $modulePath, 'source');

        if (!$sourceInfo['valid']) {
            throw new RuntimeException('Module source is invalid: ' . implode('; ', $sourceInfo['errors']));
        }

        $installedMeta = $installedInfo['meta_data'] ?? [];
        $sourceMeta = $sourceInfo['meta_data'] ?? [];
        $migrationRequired = count($this->getDifferingFlows($moduleName, $installedMeta)) > 0;
        $installRequired = $installedInfo === null || $force;
        $updateRequired = !$installRequired && $this->isUpdateAvailable($installedMeta['version'] ?? null, $sourceMeta['version'] ?? null, true);

        if (!$installRequired && !$updateRequired && !$migrationRequired) {
            return "Module {$moduleName} is already up to date.";
        }

        $paths = $this->buildModulePaths($moduleName, $modulePath);
        $log = [];
        $rollback = $this->createInstallRollbackSnapshot($moduleName, $paths, $installedInfo);

        try {
            $this->ensureDirectory($paths['module']);
            $this->copyFile($modulePath . '/' . $moduleName . '.py', $paths['module'] . '/' . $moduleName . '.py');
            $log[] = "Copied module code to {$paths['module']}";

            $this->copyDirectoryIfExists($modulePath . '/blocks', $paths['blocks'], $log, 'blocks');
            $this->copyDirectoryIfExists($modulePath . '/charts', $paths['charts'], $log, 'charts');
            $this->copyDirectoryIfExists($modulePath . '/' . $moduleName, $paths['data'], $log, 'data');
            $this->copyInfoFiles($modulePath, $paths['info'], $log);
            $installerData = $this->writeInstallerInfo($modulePath, $paths['installer']);
            $log[] = 'Installer metadata updated';

            $this->installDatabaseConfig($sourceMeta, $modulePath, $log);
            $this->installPackagesFile($modulePath . '/packages.txt', $paths['logfiles'] . '/dependencies.log', $log);
            $this->installRequirementsFile($modulePath . '/requirements.txt', $paths['logfiles'] . '/dependencies.log', $log);
            $this->runPostInstall($installerData, $modulePath, $paths['data'], $log);
            $this->cleanupLegacyModule($moduleName, $installedInfo, $paths['module'], $log);

            $migrationLog = $this->migrateModule($moduleName, $modulePath, false);
            if ($migrationLog !== '') {
                $log[] = trim($migrationLog);
            }

            $this->applyOwnership($this->myModulesDir);
            $this->applyOwnership($this->moduleDataDir);

            $this->cleanupInstallRollbackSnapshot($rollback);
            return implode("\n", $log);
        } catch (Throwable $e) {
            $this->rollbackFailedInstall($moduleName, $paths, $rollback);
            throw new RuntimeException(
                $e->getMessage() . "\nInstaller rollback completed; the module was not left partially installed."
            );
        }
    }

    private function uninstallModule(string $moduleName): string
    {
        $installedInfo = $this->findInstalledModule($moduleName);
        if ($installedInfo === null) {
            return "Module {$moduleName} is not installed.";
        }

        $paths = $this->buildModulePaths($moduleName, $this->repoPath . '/' . $moduleName);
        $moduleFile = $installedInfo['path'] . '/' . $moduleName . '.py';

        $this->removePath($moduleFile);
        $this->removePath($paths['blocks']);
        $this->removePath($paths['data']);
        $this->removePath($paths['info']);
        $this->removePath($paths['charts']);
        $this->removePath($paths['installer']);
        $this->removePath($paths['logfiles']);

        $this->applyOwnership($this->myFilesDir);

        return "Module {$moduleName} was uninstalled.";
    }

    private function migrateModule(string $moduleName, string $modulePath, bool $throwOnMissingInstalled = true): string
    {
        $installedInfo = $this->findInstalledModule($moduleName);
        if ($installedInfo === null) {
            if ($throwOnMissingInstalled) {
                throw new RuntimeException("Module {$moduleName} is not installed.");
            }
            return '';
        }

        $installedMeta = $installedInfo['meta_data'] ?? [];
        $flows = $this->getFlowsWithModule($moduleName);
        if ($flows === []) {
            return '';
        }

        $moduleKey = $this->nameForFlow($moduleName);
        $secrets = $this->loadSecretsFile();
        $secretsChanged = false;
        $deprecated = [];
        $additional = [];

        foreach ($flows as $flowFile => $flowData) {
            $oldFlowData = $flowData[$moduleKey]['metadata'] ?? [];
            $newFlowData = $installedMeta;

            $oldArguments = is_array($oldFlowData['arguments'] ?? null) ? $oldFlowData['arguments'] : [];
            $oldArgumentDetails = is_array($oldFlowData['argumentdetails'] ?? null) ? $oldFlowData['argumentdetails'] : [];
            $newArguments = is_array($newFlowData['arguments'] ?? null) ? $newFlowData['arguments'] : [];
            $newArgumentDetails = is_array($newFlowData['argumentdetails'] ?? null) ? $newFlowData['argumentdetails'] : [];

            if ($oldArguments === [] && $newArguments === [] && ($oldArgumentDetails !== [] || $newArgumentDetails !== [])) {
                continue;
            }

            foreach ($oldArguments as $setting => $value) {
                if (array_key_exists($setting, $newArguments)) {
                    $newArguments[$setting] = $value;
                } else {
                    $deprecated[] = "Deprecated {$setting}={$this->stringifyValue($value)}";
                }
            }

            foreach ($newArguments as $setting => $value) {
                if (!array_key_exists($setting, $oldArguments)) {
                    $additional[] = "Added {$setting}={$this->stringifyValue($value)}";
                }
            }

            foreach ($newArgumentDetails as $setting => $detail) {
                if ($this->toBool($detail['secret'] ?? false)) {
                    $secretKey = strtoupper($moduleName) . '_' . strtoupper((string)$setting);
                    if (!array_key_exists($secretKey, $secrets)) {
                        $secrets[$secretKey] = $newArguments[$setting] ?? '';
                        $newArguments[$setting] = '';
                        $secretsChanged = true;
                    } else {
                        $newArguments[$setting] = '';
                    }
                }
            }

            $newFlowData['arguments'] = $newArguments;
            $newFlowData['argumentdetails'] = $newArgumentDetails;
            $flowData[$moduleKey]['metadata'] = $newFlowData;
            $this->savePrettyJson($this->allskyModulesDir . '/' . $flowFile, $flowData);
        }

        if ($secretsChanged) {
            $this->savePrettyJson(ALLSKY_ENV, $secrets);
        }

        $summary = ["Migrated flows for {$moduleName}."];
        if ($deprecated !== []) {
            $summary[] = implode("\n", $deprecated);
        }
        if ($additional !== []) {
            $summary[] = implode("\n", $additional);
        }

        return implode("\n", $summary);
    }

    private function getModuleStatusText(string $moduleName, string $modulePath): string
    {
        $record = $this->buildModuleRecord($moduleName, $modulePath);
        $lines = [];
        $lines[] = 'Module: ' . $record['displayName'] . " ({$record['module']})";
        $lines[] = 'Installed: ' . ($record['installed'] ? 'yes' : 'no');
        $lines[] = 'Installed version: ' . ($record['installedVersion'] ?? 'none');
        $lines[] = 'Available version: ' . ($record['sourceVersion'] ?? 'none');
        $lines[] = 'Update available: ' . ($record['updateAvailable'] ? 'yes' : 'no');
        $lines[] = 'Deprecated: ' . ($record['deprecated'] ? 'yes' : 'no');
        if ($record['replacedBy'] !== '') {
            $lines[] = 'Replaced by: ' . $record['replacedBy'];
        }
        $lines[] = 'Migration required: ' . ($record['migrationRequired'] ? 'yes' : 'no');
        if ($record['differingFlows'] !== []) {
            $lines[] = 'Flows: ' . implode(', ', $record['differingFlows']);
        }
        if ($record['sourceErrors'] !== []) {
            $lines[] = 'Source errors: ' . implode('; ', $record['sourceErrors']);
        }
        if ($record['installedErrors'] !== []) {
            $lines[] = 'Installed errors: ' . implode('; ', $record['installedErrors']);
        }

        return implode("\n", $lines);
    }

    private function verifyInstalledModulesReport(): string
    {
        $installedModules = $this->getInstalledModuleNames();
        if ($installedModules === []) {
            return 'No installed modules were found.';
        }

        $lines = [];
        $overallOk = true;

        foreach ($installedModules as $moduleName) {
            $moduleReport = $this->verifyInstalledModuleText($moduleName);
            $lines[] = $moduleReport;
            $overallOk = $overallOk && !str_contains($moduleReport, 'Result: FAILED');
        }

        array_unshift($lines, 'Installed module verification: ' . ($overallOk ? 'OK' : 'FAILED'));
        return implode("\n\n", $lines);
    }

    private function getInstalledModuleNames(): array
    {
        $modules = [];
        $paths = [$this->myModulesDir, $this->userModulesDir];

        foreach ($paths as $path) {
            if (!is_dir($path)) {
                continue;
            }

            foreach (glob($path . '/allsky_*.py') ?: [] as $file) {
                $modules[] = basename($file, '.py');
            }
        }

        $modules = array_values(array_unique($modules));
        sort($modules, SORT_NATURAL | SORT_FLAG_CASE);
        return $modules;
    }

    private function verifyInstalledModuleText(string $moduleName): string
    {
        $installedInfo = $this->findInstalledModule($moduleName);
        if ($installedInfo === null) {
            return "Module: {$moduleName}\nResult: FAILED\nERROR: Module is not installed.";
        }

        $sourcePath = $this->repoPath . '/' . $moduleName;
        $paths = $this->buildModulePaths($moduleName, $sourcePath);
        $installerData = $this->readInstalledInstallerInfo($paths['installer'], $sourcePath);
        $moduleLines = [];
        $moduleOk = true;

        $moduleLines[] = "Module: {$moduleName}";
        $moduleLines[] = 'Installed path: ' . (string)($installedInfo['path'] ?? '');
        $moduleLines[] = 'Code valid: ' . (($installedInfo['valid'] ?? false) ? 'yes' : 'no');
        if (!($installedInfo['valid'] ?? false)) {
            $moduleOk = false;
            foreach (($installedInfo['errors'] ?? []) as $error) {
                $moduleLines[] = 'ERROR: ' . $error;
            }
        }

        foreach ($this->verifyAptDependencies($installerData['packages'] ?? []) as $line) {
            if (str_starts_with($line, 'MISSING:')) {
                $moduleOk = false;
            }
            $moduleLines[] = $line;
        }

        foreach ($this->verifyPythonDependencies($installerData['requirements'] ?? []) as $line) {
            if (str_starts_with($line, 'MISSING:')) {
                $moduleOk = false;
            }
            $moduleLines[] = $line;
        }

        $moduleLines[] = 'Result: ' . ($moduleOk ? 'OK' : 'FAILED');
        return implode("\n", $moduleLines);
    }

    private function readInstalledInstallerInfo(string $installedInstallerDir, string $sourcePath): array
    {
        $installerFile = $installedInstallerDir . '/installer.json';
        if (is_file($installerFile)) {
            $decoded = json_decode((string)file_get_contents($installerFile), true);
            if (is_array($decoded)) {
                return $decoded;
            }
        }

        return [
            'requirements' => $this->readDependencyLines($sourcePath . '/requirements.txt'),
            'packages' => $this->readDependencyLines($sourcePath . '/packages.txt'),
        ];
    }

    private function verifyAptDependencies(array $packages): array
    {
        $lines = [];
        foreach ($packages as $packageSpec) {
            $packageName = $this->normaliseAptPackageName((string)$packageSpec);
            if ($packageName === '') {
                continue;
            }

            $result = $this->runProcessWithOptions(['/usr/bin/dpkg-query', '-W', '-f=${Status}', $packageName]);
            if (!$result['error'] && str_contains($result['message'], 'install ok installed')) {
                $lines[] = "APT: {$packageName} OK";
            } else {
                $lines[] = "MISSING: APT package {$packageName}";
            }
        }

        if ($lines === []) {
            $lines[] = 'APT: no declared dependencies';
        }

        return $lines;
    }

    private function verifyPythonDependencies(array $packages): array
    {
        $lines = [];
        foreach ($packages as $packageSpec) {
            $packageName = $this->normalisePythonPackageName((string)$packageSpec);
            if ($packageName === '') {
                continue;
            }

            $result = $this->runProcessWithOptions([$this->venvPython, '-m', 'pip', 'show', $packageName], $this->allskyHome);
            if (!$result['error']) {
                $lines[] = "PIP: {$packageName} OK";
            } else {
                $lines[] = "MISSING: Python package {$packageName}";
            }
        }

        if ($lines === []) {
            $lines[] = 'PIP: no declared dependencies';
        }

        return $lines;
    }

    private function normaliseAptPackageName(string $packageSpec): string
    {
        $package = trim($packageSpec);
        if ($package === '') {
            return '';
        }

        $package = preg_split('/\s+/', $package)[0] ?? $package;
        $package = explode('=', $package, 2)[0];
        return trim($package);
    }

    private function normalisePythonPackageName(string $packageSpec): string
    {
        $package = trim($packageSpec);
        if ($package === '') {
            return '';
        }

        $package = preg_split('/\s*;\s*/', $package, 2)[0] ?? $package;
        $package = preg_split('/\s*(===|==|~=|!=|<=|>=|<|>)\s*/', $package, 2)[0] ?? $package;
        $package = preg_split('/\s*\[/', $package, 2)[0] ?? $package;
        return trim($package);
    }

    private function buildModulePaths(string $moduleName, string $modulePath): array
    {
        return [
            'module' => $this->myModulesDir,
            'blocks' => $this->moduleDataDir . '/blocks/' . $moduleName,
            'data' => $this->moduleDataDir . '/data/' . $moduleName,
            'info' => $this->moduleDataDir . '/info/' . $moduleName,
            'charts' => $this->moduleDataDir . '/charts/' . $moduleName,
            'installer' => $this->moduleDataDir . '/installer/' . $moduleName,
            'logfiles' => $this->moduleDataDir . '/logfiles/' . $moduleName,
            'dbconfig' => $modulePath . '/db/db_data.json',
        ];
    }

    private function copyDirectoryIfExists(string $source, string $destination, array &$log, string $label): void
    {
        if (!is_dir($source)) {
            return;
        }

        $this->copyDirectory($source, $destination);
        $log[] = "Copied {$label}";
    }

    private function copyInfoFiles(string $modulePath, string $destination, array &$log): void
    {
        $infoFiles = ['readme.txt', 'README.txt', 'README.md'];
        $copied = false;

        foreach ($infoFiles as $fileName) {
            $source = $modulePath . '/' . $fileName;
            if (is_file($source)) {
                $this->ensureDirectory($destination);
                $this->copyFile($source, $destination . '/' . $fileName);
                $copied = true;
            }
        }

        if ($copied) {
            $log[] = 'Copied module info';
        }
    }

    private function writeInstallerInfo(string $modulePath, string $destination): array
    {
        $installerFile = $modulePath . '/installer.json';
        $installerData = [];

        if (is_file($installerFile)) {
            $decoded = json_decode((string)file_get_contents($installerFile), true);
            $installerData = is_array($decoded) ? $decoded : [];
        }

        if ($installerData === []) {
            $installerData = [
                'requirements' => $this->readDependencyLines($modulePath . '/requirements.txt'),
                'packages' => $this->readDependencyLines($modulePath . '/packages.txt'),
                'post-install' => ['run' => ''],
            ];
        }

        $this->ensureDirectory($destination);
        $this->savePrettyJson($destination . '/installer.json', $installerData);
        return $installerData;
    }

    private function createInstallRollbackSnapshot(string $moduleName, array $paths, ?array $installedInfo): array
    {
        $snapshotRoot = rtrim(sys_get_temp_dir(), '/') . '/allsky-module-rollback-' . $moduleName . '-' . uniqid('', true);
        if (!mkdir($snapshotRoot, 0700, true) && !is_dir($snapshotRoot)) {
            throw new RuntimeException('Unable to create installer rollback snapshot.');
        }

        $snapshot = [
            'root' => $snapshotRoot,
            'had_existing_install' => $installedInfo !== null && rtrim((string)($installedInfo['path'] ?? ''), '/') === rtrim($paths['module'], '/'),
            'db_config_file' => $this->myFilesDir . '/db_data.json',
            'db_config_contents' => null,
        ];

        $dbConfigFile = $snapshot['db_config_file'];
        if (is_file($dbConfigFile)) {
            $contents = file_get_contents($dbConfigFile);
            $snapshot['db_config_contents'] = $contents === false ? null : $contents;
        }

        if (!$snapshot['had_existing_install']) {
            return $snapshot;
        }

        $this->snapshotPath($paths['module'] . '/' . $moduleName . '.py', $snapshotRoot . '/module.py');
        $this->snapshotPath($paths['blocks'], $snapshotRoot . '/blocks');
        $this->snapshotPath($paths['data'], $snapshotRoot . '/data');
        $this->snapshotPath($paths['info'], $snapshotRoot . '/info');
        $this->snapshotPath($paths['charts'], $snapshotRoot . '/charts');
        $this->snapshotPath($paths['installer'], $snapshotRoot . '/installer');
        $this->snapshotPath($paths['logfiles'], $snapshotRoot . '/logfiles');

        return $snapshot;
    }

    private function rollbackFailedInstall(string $moduleName, array $paths, array $snapshot): void
    {
        $this->removePath($paths['module'] . '/' . $moduleName . '.py');
        $this->removePath($paths['blocks']);
        $this->removePath($paths['data']);
        $this->removePath($paths['info']);
        $this->removePath($paths['charts']);
        $this->removePath($paths['installer']);
        $this->removePath($paths['logfiles']);

        if (!empty($snapshot['had_existing_install'])) {
            $this->restoreSnapshotPath($snapshot['root'] . '/module.py', $paths['module'] . '/' . $moduleName . '.py');
            $this->restoreSnapshotPath($snapshot['root'] . '/blocks', $paths['blocks']);
            $this->restoreSnapshotPath($snapshot['root'] . '/data', $paths['data']);
            $this->restoreSnapshotPath($snapshot['root'] . '/info', $paths['info']);
            $this->restoreSnapshotPath($snapshot['root'] . '/charts', $paths['charts']);
            $this->restoreSnapshotPath($snapshot['root'] . '/installer', $paths['installer']);
            $this->restoreSnapshotPath($snapshot['root'] . '/logfiles', $paths['logfiles']);
        }

        $dbConfigFile = (string)($snapshot['db_config_file'] ?? '');
        if ($dbConfigFile !== '') {
            if (array_key_exists('db_config_contents', $snapshot) && $snapshot['db_config_contents'] !== null) {
                $this->restoreFileContents($dbConfigFile, (string)$snapshot['db_config_contents']);
            } else {
                $this->removePath($dbConfigFile);
            }
        }

        $this->applyOwnership($this->myModulesDir);
        $this->applyOwnership($this->moduleDataDir);
        $this->applyOwnership($this->myFilesDir);
        $this->cleanupInstallRollbackSnapshot($snapshot);
    }

    private function cleanupInstallRollbackSnapshot(array $snapshot): void
    {
        $root = (string)($snapshot['root'] ?? '');
        if ($root !== '') {
            $this->removePath($root);
        }
    }

    private function snapshotPath(string $source, string $destination): void
    {
        if (is_file($source)) {
            $parent = dirname($destination);
            if (!is_dir($parent) && !mkdir($parent, 0700, true) && !is_dir($parent)) {
                throw new RuntimeException("Unable to create snapshot directory {$parent}");
            }
            if (!copy($source, $destination)) {
                throw new RuntimeException("Unable to snapshot {$source}");
            }
            return;
        }

        if (is_dir($source)) {
            $this->copyDirectory($source, $destination);
        }
    }

    private function restoreSnapshotPath(string $source, string $destination): void
    {
        if (is_file($source)) {
            $this->copyFile($source, $destination);
            return;
        }

        if (is_dir($source)) {
            $this->copyDirectory($source, $destination);
        }
    }

    private function restoreFileContents(string $filePath, string $contents): void
    {
        $this->ensureDirectory(dirname($filePath));

        if (@file_put_contents($filePath, $contents) !== false) {
            return;
        }

        $tempFile = tempnam(sys_get_temp_dir(), 'allsky-restore-');
        if ($tempFile === false) {
            throw new RuntimeException("Unable to restore {$filePath}");
        }

        try {
            if (file_put_contents($tempFile, $contents) === false) {
                throw new RuntimeException("Unable to restore {$filePath}");
            }

            $result = $this->runProcessWithOptions(['/usr/bin/sudo', 'cp', $tempFile, $filePath]);
            if ($result['error']) {
                throw new RuntimeException(
                    "Unable to restore {$filePath}" .
                    (trim($result['message']) !== '' ? ': ' . trim($result['message']) : '')
                );
            }

            $this->runProcessWithOptions(['/usr/bin/sudo', 'chown', $this->owner . ':' . $this->webGroup, $filePath]);
            $this->runProcessWithOptions(['/usr/bin/sudo', 'chmod', '0664', $filePath]);
        } finally {
            @unlink($tempFile);
        }
    }

    private function installDatabaseConfig(array $sourceMeta, string $modulePath, array &$log): void
    {
        $dbConfigPath = $modulePath . '/db/db_data.json';
        if (!is_file($dbConfigPath)) {
            return;
        }

        $table = $sourceMeta['extradata']['database']['table'] ?? null;
        if (!is_string($table) || $table === '') {
            return;
        }

        $moduleConfig = json_decode((string)file_get_contents($dbConfigPath), true);
        if (!is_array($moduleConfig) || !isset($moduleConfig[$table])) {
            return;
        }

        $userDbConfigFile = $this->myFilesDir . '/db_data.json';
        $userConfig = [];
        if (is_file($userDbConfigFile)) {
            $decoded = json_decode((string)file_get_contents($userDbConfigFile), true);
            if (is_array($decoded)) {
                $userConfig = $decoded;
            }
        }
        $userConfig[$table] = $moduleConfig[$table];
        $this->savePrettyJson($userDbConfigFile, $userConfig);
        $log[] = "Updated database config for table {$table}";
    }

    private function installPackagesFile(string $filePath, string $logFile, array &$log): void
    {
        $packages = $this->readDependencyLines($filePath);
        if ($packages === []) {
            return;
        }

        $this->ensureDirectory(dirname($logFile));
        foreach ($packages as $package) {
            file_put_contents($logFile, "\n--- Installing {$package} ---\n", FILE_APPEND);
            $result = $this->runProcessWithOptions(['/usr/bin/sudo', 'apt-get', 'install', '-y', $package]);
            file_put_contents($logFile, $result['message'] . "\n", FILE_APPEND);
            if ($result['error']) {
                throw new RuntimeException("Failed to install apt package {$package}: " . trim($result['message']));
            }
        }

        $log[] = 'Installed apt dependencies';
    }

    private function installRequirementsFile(string $filePath, string $logFile, array &$log): void
    {
        $packages = $this->readDependencyLines($filePath);
        if ($packages === []) {
            return;
        }

        $this->ensurePythonEnvironmentWritable();
        $this->ensureDirectory(dirname($logFile));
        foreach ($packages as $package) {
            file_put_contents($logFile, "\n--- Installing {$package} ---\n", FILE_APPEND);
            $result = $this->runProcessWithOptions(
                [$this->venvPython, '-m', 'pip', 'install', '--no-cache-dir', $package],
                $this->allskyHome
            );
            file_put_contents($logFile, $result['message'] . "\n", FILE_APPEND);
            if ($result['error']) {
                throw new RuntimeException("Failed to install Python dependency {$package}: " . trim($result['message']));
            }
        }

        $log[] = 'Installed Python dependencies';
    }

    private function ensurePythonEnvironmentWritable(): void
    {
        foreach ([$this->allskyHome . '/venv', dirname($this->venvPython)] as $path) {
            if (!file_exists($path)) {
                continue;
            }

            $this->runProcessWithOptions(['/usr/bin/sudo', '/bin/chown', '-R', $this->owner . ':' . $this->webGroup, $path]);
            $this->runProcessWithOptions(['/usr/bin/sudo', '/bin/chmod', '-R', 'g+w', $path]);
        }
    }

    private function runPostInstall(array $installerData, string $modulePath, string $installDataDir, array &$log): void
    {
        $postInstall = $installerData['post-install']['run'] ?? '';
        if (!is_string($postInstall) || trim($postInstall) === '') {
            return;
        }

        $postInstall = str_replace('{install_data_dir}', $installDataDir, $postInstall);
        if (!str_starts_with($postInstall, '/')) {
            $postInstall = rtrim($modulePath, '/') . '/' . ltrim($postInstall, './');
        }

        $result = str_ends_with($postInstall, '.py')
            ? $this->runProcessWithOptions([$this->venvPython, $postInstall], dirname($postInstall))
            : $this->runProcessWithOptions([$postInstall], dirname($postInstall));

        if ($result['error']) {
            throw new RuntimeException('Post-install step failed: ' . trim($result['message']));
        }

        $log[] = 'Ran post-install action';
    }

    private function cleanupLegacyModule(string $moduleName, ?array $installedInfo, string $newModulePath, array &$log): void
    {
        if ($installedInfo === null) {
            return;
        }

        $currentPath = rtrim((string)$installedInfo['path'], '/');
        if ($currentPath === rtrim($newModulePath, '/')) {
            return;
        }

        $this->removePath($currentPath . '/' . $moduleName . '.py');
        $this->removePath($currentPath . '/dependencies/' . $moduleName);
        $this->removePath($currentPath . '/info/' . $moduleName);
        $log[] = 'Removed legacy module copy';
    }

    private function getDifferingFlows(string $moduleName, array $installedMeta): array
    {
        $flows = [];
        $moduleKey = $this->nameForFlow($moduleName);
        $codeArgumentDetails = is_array($installedMeta['argumentdetails'] ?? null) ? $installedMeta['argumentdetails'] : [];

        foreach ($this->getFlowsWithModule($moduleName) as $flowFile => $flowData) {
            $flowArgumentDetails = $flowData[$moduleKey]['metadata']['argumentdetails'] ?? [];
            if ($this->normalizeArgDetails($flowArgumentDetails) !== $this->normalizeArgDetails($codeArgumentDetails)) {
                $flows[] = $flowFile;
            }
        }

        return $flows;
    }

    private function getFlowsWithModule(string $moduleName): array
    {
        $moduleKey = $this->nameForFlow($moduleName);
        $found = [];

        foreach (glob($this->allskyModulesDir . '/postprocessing_*.json') ?: [] as $file) {
            if (str_ends_with($file, '-debug.json')) {
                continue;
            }
            $decoded = json_decode((string)file_get_contents($file), true);
            if (is_array($decoded) && array_key_exists($moduleKey, $decoded)) {
                $found[basename($file)] = $decoded;
            }
        }

        return $found;
    }

    private function normalizeArgDetails(array $argDetails): array
    {
        $normalized = [];

        foreach ($argDetails as $key => $details) {
            if (!is_array($details)) {
                $normalized[$key] = $details;
                continue;
            }
            $normalized[$key] = [];
            foreach ($details as $detailKey => $value) {
                if ($detailKey === 'required' || $detailKey === 'secret') {
                    $normalized[$key][$detailKey] = $this->toBool($value);
                    continue;
                }
                if ($detailKey === 'type' && is_array($value)) {
                    $typeData = [];
                    foreach ($value as $typeKey => $typeValue) {
                        $typeData[$typeKey] = is_string($typeValue) && str_contains($typeValue, ',')
                            ? array_map('trim', explode(',', $typeValue))
                            : $typeValue;
                    }
                    $normalized[$key][$detailKey] = $typeData;
                    continue;
                }
                $normalized[$key][$detailKey] = $value;
            }
        }

        return $normalized;
    }

    private function isUpdateAvailable(?string $installedVersion, ?string $sourceVersion, bool $installed): bool
    {
        if (!$installed) {
            return false;
        }
        if ($installedVersion !== null && $sourceVersion !== null) {
            return version_compare(ltrim($installedVersion, 'vV'), ltrim($sourceVersion, 'vV'), '<');
        }
        return $installedVersion === null;
    }

    private function readDependencyLines(string $filePath): array
    {
        if (!is_file($filePath) || !is_readable($filePath)) {
            return [];
        }

        $packages = [];
        foreach (file($filePath, FILE_IGNORE_NEW_LINES) ?: [] as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#')) {
                continue;
            }
            $packages[] = $line;
        }

        return $packages;
    }

    private function copyDirectory(string $source, string $destination): void
    {
        if (is_dir($destination)) {
            $this->removePath($destination);
        }
        $this->ensureDirectory(dirname($destination));
        if (!mkdir($destination, 0775, true) && !is_dir($destination)) {
            throw new RuntimeException("Unable to create directory {$destination}");
        }

        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($source, FilesystemIterator::SKIP_DOTS),
            RecursiveIteratorIterator::SELF_FIRST
        );

        foreach ($iterator as $item) {
            $target = $destination . '/' . $iterator->getSubPathName();
            if ($item->isDir()) {
                if (!is_dir($target) && !mkdir($target, 0775, true) && !is_dir($target)) {
                    throw new RuntimeException("Unable to create directory {$target}");
                }
            } else {
                $this->copyFile($item->getPathname(), $target);
            }
        }
    }

    private function copyFile(string $source, string $destination): void
    {
        if (!is_file($source) || !is_readable($source)) {
            throw new RuntimeException("Unable to read source file {$source}");
        }

        $this->ensureDirectory(dirname($destination));
        $this->writeFileFromSource($source, $destination);
    }

    private function writeFileFromSource(string $source, string $destination): void
    {
        if (@copy($source, $destination)) {
            @chmod($destination, 0664);
            return;
        }

        $result = $this->runProcessWithOptions(['/usr/bin/sudo', 'cp', $source, $destination]);
        if ($result['error']) {
            throw new RuntimeException("Unable to copy {$source} to {$destination}");
        }

        $this->runProcessWithOptions(['/usr/bin/sudo', 'chown', $this->owner . ':' . $this->webGroup, $destination]);
        $this->runProcessWithOptions(['/usr/bin/sudo', 'chmod', '0664', $destination]);
    }

    private function ensureDirectory(string $path): void
    {
        if ($path === '') {
            return;
        }

        if (!is_dir($path)) {
            if (!@mkdir($path, 0775, true) && !is_dir($path)) {
                $result = $this->runProcessWithOptions(['/usr/bin/sudo', 'mkdir', '-p', '-m', '0775', $path]);
                if ($result['error'] && !is_dir($path)) {
                    throw new RuntimeException(
                        "Unable to create directory {$path}" .
                        (trim($result['message']) !== '' ? ': ' . trim($result['message']) : '')
                    );
                }
            }
        }

        if (!is_writable($path)) {
            $this->repairDirectoryPermissions($path);
        }

        if (!is_writable($path)) {
            throw new RuntimeException("Directory {$path} is not writable by the WebUI user");
        }
    }

    private function repairDirectoryPermissions(string $path): void
    {
        $commands = [
            ['/usr/bin/sudo', 'chown', $this->owner . ':' . $this->webGroup, $path],
            ['/usr/bin/sudo', 'chmod', '0775', $path],
        ];

        foreach ($commands as $command) {
            $this->runProcessWithOptions($command);
        }
    }

    private function removePath(string $path): void
    {
        if (!file_exists($path) && !is_link($path)) {
            return;
        }

        if (is_file($path) || is_link($path)) {
            @unlink($path);
            return;
        }

        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($path, FilesystemIterator::SKIP_DOTS),
            RecursiveIteratorIterator::CHILD_FIRST
        );

        foreach ($iterator as $item) {
            if ($item->isDir()) {
                @rmdir($item->getPathname());
            } else {
                @unlink($item->getPathname());
            }
        }

        @rmdir($path);
    }

    private function applyOwnership(string $path): void
    {
        if (!file_exists($path)) {
            return;
        }
        $this->runProcessWithOptions(['/usr/bin/sudo', 'chown', '-R', $this->owner . ':' . $this->webGroup, $path]);
    }

    private function loadSecretsFile(): array
    {
        if (!is_file(ALLSKY_ENV)) {
            return [];
        }
        $decoded = json_decode((string)file_get_contents(ALLSKY_ENV), true);
        return is_array($decoded) ? $decoded : [];
    }

    private function savePrettyJson(string $filePath, array $data): void
    {
        $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        if ($json === false) {
            throw new RuntimeException("Unable to encode JSON for {$filePath}");
        }
        $json .= "\n";

        $this->ensureDirectory(dirname($filePath));

        if (@file_put_contents($filePath, $json) !== false) {
            return;
        }

        $tempFile = tempnam(sys_get_temp_dir(), 'allsky-json-');
        if ($tempFile === false) {
            throw new RuntimeException("Unable to write {$filePath}");
        }

        try {
            if (file_put_contents($tempFile, $json) === false) {
                throw new RuntimeException("Unable to write temporary file for {$filePath}");
            }

            $result = $this->runProcessWithOptions(['/usr/bin/sudo', 'cp', $tempFile, $filePath]);
            if ($result['error']) {
                throw new RuntimeException(
                    "Unable to write {$filePath}" .
                    (trim($result['message']) !== '' ? ': ' . trim($result['message']) : '')
                );
            }

            $this->runProcessWithOptions(['/usr/bin/sudo', 'chown', $this->owner . ':' . $this->webGroup, $filePath]);
            $this->runProcessWithOptions(['/usr/bin/sudo', 'chmod', '0664', $filePath]);
        } finally {
            @unlink($tempFile);
        }
    }

    private function nameForFlow(string $moduleName): string
    {
        return preg_replace('/^allsky_/', '', $moduleName) ?? $moduleName;
    }

    private function toBool($value): bool
    {
        if (is_bool($value)) {
            return $value;
        }
        return in_array(strtolower(trim((string)$value)), ['true', '1', 'yes', 'y', 'on'], true);
    }

    private function stringifyValue($value): string
    {
        if (is_scalar($value) || $value === null) {
            return (string)$value;
        }
        $encoded = json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        return $encoded === false ? '[complex]' : $encoded;
    }

    private function runGitCommand(array $args, ?string $cwd = null, ?string $fallbackCwd = null): string
    {
        $argv = array_merge(
            ['/usr/bin/git', '-c', 'safe.directory=' . $this->repoPath],
            $args
        );
        $result = $this->runProcessWithOptions($argv, $cwd ?? $fallbackCwd);
        if ($result['error']) {
            throw new RuntimeException(trim($result['message']) !== '' ? trim($result['message']) : 'Git command failed.');
        }
        return $result['message'];
    }

    private function runProcessWithOptions(array $argv, ?string $cwd = null): array
    {
        $descriptors = [
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ];

        $proc = @proc_open($argv, $descriptors, $pipes, $cwd, []);
        if (!is_resource($proc)) {
            return ['error' => true, 'message' => 'Unable to start process'];
        }

        stream_set_timeout($pipes[1], 30);
        stream_set_timeout($pipes[2], 30);

        $stdout = stream_get_contents($pipes[1]);
        $stderr = stream_get_contents($pipes[2]);

        fclose($pipes[1]);
        fclose($pipes[2]);

        $exitCode = proc_close($proc);
        $message = trim(((string)$stdout) . ((string)$stderr));

        return [
            'error' => $exitCode !== 0,
            'message' => $message,
        ];
    }
}

$entry = PHP_SAPI === 'cli'
    ? realpath($_SERVER['argv'][0] ?? '')
    : realpath($_SERVER['SCRIPT_FILENAME'] ?? '');

if ($entry === __FILE__) {
    (new MODULEINSTALLERUTIL())->run();
}
