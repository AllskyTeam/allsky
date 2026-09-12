<?php
declare(strict_types=1);

include_once('functions.php');
initialize_variables();
include_once('authenticate.php');
include_once('utilbase.php');

/**
 * Handles the WebUI module manager endpoints.
 *
 * The installer works with the Allsky module repository, presents available
 * modules to the browser, installs first-party module files, applies declared
 * dependencies, and keeps enough installer metadata to verify or roll back an
 * installation.  Module code is treated as executable input, so install paths
 * are guarded by a manifest check before any package manager or post-install
 * helper is allowed to run.
 *
 * @package Allsky
 */
class MODULEINSTALLERUTIL extends UTILBASE
{
    /**
     * The per-module manifest file that must be present before installation.
     *
     * @var string
     */
    private const MODULE_MANIFEST_FILE = 'manifest.json';

    /** @var string Root directory of the local Allsky installation. */
    private string $allskyHome;

    /** @var string config/modules directory containing the configured post-processing flows. */
    private string $allskyModulesDir;

    /** @var string scripts/modules directory containing built-in Python module code. */
    private string $coreModulesDir;

    /** @var string Legacy user module directory. */
    private string $userModulesDir;

    /** @var string Root of the user-managed Allsky files. */
    private string $myFilesDir;

    /** @var string Destination directory for installed module Python files. */
    private string $myModulesDir;

    /** @var string Destination root for installed module data, charts, and logs. */
    private string $moduleDataDir;

    /** @var string Remote Allsky module repository URL. */
    private string $repoUrl;

    /** @var string Default module repository branch. */
    private string $defaultBranch;

    /** @var bool True when the developer module repository setting is active. */
    private bool $developerModuleRepoEnabled;

    /** @var string Optional developer module repository branch setting. */
    private string $developerModuleRepoBranch;

    /** @var string Temporary checkout path for the module repository. */
    private string $repoPath;

    /** @var string Filesystem owner used for installed module files. */
    private string $owner;

    /** @var string Allsky group used for Python environment ownership. */
    private string $allskyGroup;

    /** @var string Web server group used for WebUI-managed files. */
    private string $webGroup;

    /** @var string Python interpreter inside the Allsky virtual environment. */
    private string $venvPython;

    /**
     * Registers the WebUI endpoints exposed by this utility.
     *
     * @return array<string, array<int, string>>
     */
    protected function getRoutes(): array
    {
        return [
            'Modules' => ['get'],
            'VerifyInstalled' => ['get'],
            'Action' => ['post'],
        ];
    }

    /**
     * Captures the Allsky filesystem layout and the module repository location
     * from the global configuration.
     */
    public function __construct()
    {
        $this->allskyHome = ALLSKY_HOME;
        $this->allskyModulesDir = ALLSKY_MODULES;
        $this->coreModulesDir = ALLSKY_SCRIPTS . '/modules';
        $this->userModulesDir = ALLSKY_MODULE_LOCATION . '/modules';
        $this->myFilesDir = ALLSKY_MYFILES_DIR;
        $this->myModulesDir = ALLSKY_MYFILES_DIR . '/modules';
        $this->moduleDataDir = ALLSKY_MYFILES_DIR . '/modules/moduledata';
        $this->repoUrl = rtrim((string)ALLSKY_GITHUB_ROOT, '/') . '/' . trim((string)ALLSKY_GITHUB_ALLSKY_MODULES_REPO, '/');
        $this->defaultBranch = (string)ALLSKY_GITHUB_MAIN_BRANCH;
        $this->developerModuleRepoEnabled = false;
        $this->developerModuleRepoBranch = '';

        $developerMode = $this->toBool($this->getSetting('developermode', '', 'false'));
        $developerModuleRepo = trim((string)$this->getSetting('developermodulerepo', '', ''));
        if ($developerMode && $developerModuleRepo !== '') {
            $this->developerModuleRepoEnabled = true;
            $this->repoUrl = $this->normaliseRepositoryUrl($developerModuleRepo);
            $this->developerModuleRepoBranch = trim((string)$this->getSetting('developermodulerepobranch', '', ''));
            $this->defaultBranch = $this->developerModuleRepoBranch;
        }

        $this->repoPath = rtrim(sys_get_temp_dir(), '/') . '/allsky-modules';
        $this->owner = defined('ALLSKY_OWNER') ? (string)ALLSKY_OWNER : get_current_user();
        $this->allskyGroup = defined('ALLSKY_GROUP') ? (string)ALLSKY_GROUP : $this->owner;
        $this->webGroup = defined('ALLSKY_WEBSERVER_GROUP') ? (string)ALLSKY_WEBSERVER_GROUP : 'www-data';
        $this->venvPython = $this->allskyHome . '/venv/bin/python3';
    }

    /**
     * Read a value from the global settings array prepared by initialize_variables().
     * Optionally swap spaces with a given character for filename-ish values.
     */
    private function getSetting(string $name, string $swapSpaces = '', $default = 'overlay.json')
    {
        /** @var array $settings_array */
        global $settings_array;
        $val = getVariableOrDefault($settings_array, $name, $default);
        if ($swapSpaces !== '') $val = str_replace(' ', $swapSpaces, (string)$val);
        return $val;
    }

    /**
     * Turns the developer module repository setting into a git clone URL.
     *
     * @param string $repo Repository setting value.
     *
     * @return string Repository URL.
     */
    private function normaliseRepositoryUrl(string $repo): string
    {
        $repo = trim($repo);
        if ($repo === '') {
            return $repo;
        }

        if (preg_match('#^(?:https?://|ssh://|git://|git@)#i', $repo) === 1) {
            return rtrim($repo, '/');
        }

        if (str_starts_with($repo, 'github.com/')) {
            return 'https://' . trim($repo, '/');
        }

        if (str_contains($repo, '/')) {
            $root = parse_url((string)ALLSKY_GITHUB_ROOT);
            if (is_array($root) && isset($root['scheme'], $root['host'])) {
                return $root['scheme'] . '://' . $root['host'] . '/' . trim($repo, '/');
            }
        }

        return rtrim((string)ALLSKY_GITHUB_ROOT, '/') . '/' . trim($repo, '/');
    }

    /**
     * Returns developer-mode information for the browser.
     *
     * @param string $branch Selected repository branch.
     *
     * @return array<string, mixed>
     */
    private function getDeveloperModeResponse(string $branch): array
    {
        return [
            'enabled' => $this->developerModuleRepoEnabled,
            'repo' => $this->repoUrl,
            'branch' => $branch,
            'configuredBranch' => $this->developerModuleRepoBranch,
        ];
    }
        
    /**
     * Returns the list of source modules and built-in core modules for the
     * module manager.  The repository is refreshed first, then the requested or
     * configured branch is checked out so the browser sees the same module
     * catalogue that install actions will use.
     *
     * @return void
     */
    public function getModules(): void
    {
        try {
            $requestedBranch = trim((string)($_GET['branch'] ?? ''));
            $refresh = filter_var($_GET['refresh'] ?? false, FILTER_VALIDATE_BOOLEAN);

            $this->ensureRepo($refresh);
            $branches = $this->getRemoteBranches();
            $branch = $this->resolveRepositoryBranch($requestedBranch, $branches);
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
                'developerMode' => $this->getDeveloperModeResponse($branch),
                'modules' => $modules,
                'coreModules' => $coreModules,
                'currentVersion' => $this->getCurrentVersion(),
            ]);
        } catch (Throwable $e) {
            $this->send500($e->getMessage());
        }
    }

    /**
     * Verifies all installed user modules against their saved installer data and
     * declared dependencies, returning a plain-text report to the browser.
     *
     * @return void
     */
    public function getVerifyInstalled(): void
    {
        try {
            $requestedBranch = trim((string)($_GET['branch'] ?? ''));

            $this->ensureRepo(false);
            $branch = $this->resolveRepositoryBranch($requestedBranch, $this->getRemoteBranches());
            $this->checkoutBranch($branch);

            $this->sendResponse([
                'message' => $this->verifyInstalledModulesReport(),
            ]);
        } catch (Throwable $e) {
            $this->send500($e->getMessage());
        }
    }

    /**
     * Dispatches a module manager POST action after validating the requested
     * module name, action, and repository branch.
     *
     * @return void
     */
    public function postAction(): void
    {
        try {
            $moduleName = trim((string)($_POST['module'] ?? ''));
            $action = trim((string)($_POST['action'] ?? ''));
            $requestedBranch = trim((string)($_POST['branch'] ?? ''));

            if (!preg_match('/^allsky_[A-Za-z0-9_]+$/', $moduleName)) {
                $this->send400('Invalid module name.');
            }

            $allowedActions = ['install', 'update', 'reinstall', 'uninstall', 'migrate', 'status', 'verify'];
            if (!in_array($action, $allowedActions, true)) {
                $this->send400('Invalid action.');
            }

            $this->ensureRepo(false);
            $branch = $this->resolveRepositoryBranch($requestedBranch, $this->getRemoteBranches());
            $this->checkoutBranch($branch);
            $modulePath = $this->repoPath . '/' . $moduleName;

            if ($action === 'status' && !is_dir($modulePath)) {
                $coreModules = $this->getCoreModuleFiles();
                if (isset($coreModules[$moduleName])) {
                    $this->sendResponse([
                        'message' => $this->getCoreModuleStatusText($moduleName, $coreModules[$moduleName]),
                        'module' => $moduleName,
                        'action' => $action,
                    ]);
                    return;
                }
            }

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

    /**
     * Builds the browser-facing record for a module in the module repository.
     * The record combines source metadata with any installed copy so the UI can
     * show version, status, deprecation, and migration information.
     *
     * @param string $moduleName Module directory and Python file base name.
     * @param string $modulePath Absolute path to the source module directory.
     *
     * @return array<string, mixed>
     */
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
            'changelog' => $sourceMeta['changelog'] ?? $installedMeta['changelog'] ?? null,
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

    /**
     * Finds module directories in the checked-out module repository.
     *
     * @return array<string, string> Map of module name to source directory.
     */
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

    /**
     * Finds core modules that are shipped with the local Allsky installation in
     * scripts/modules.  These are shown in the manager for visibility, but are
     * not installed from the separate module repository.
     *
     * @return array<string, string> Map of module name to Python source file.
     */
    private function getCoreModuleFiles(): array
    {
        $modules = [];
        $corePath = $this->coreModulesDir;
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

    /**
     * Builds the browser-facing record for a built-in core module.
     *
     * @param string $moduleName Module name without the .py suffix.
     * @param string $moduleFile Absolute path to the core module file.
     *
     * @return array<string, mixed>
     */
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
            'changelog' => $meta['changelog'] ?? null,
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

    /**
     * Locates the installed copy of a module, checking user module locations
     * before falling back to built-in modules in scripts/modules.
     *
     * @param string $moduleName Module name without the .py suffix.
     *
     * @return array<string, mixed>|null
     */
    private function findInstalledModule(string $moduleName): ?array
    {
        $paths = [
            $this->myModulesDir,
            $this->userModulesDir,
            $this->coreModulesDir,
        ];

        foreach ($paths as $path) {
            $file = $path . '/' . $moduleName . '.py';
            if (is_file($file)) {
                return $this->readModuleInfo($moduleName, $file, $path, 'installed');
            }
        }

        return null;
    }

    /**
     * Reads a module file and returns its metadata plus basic validity checks.
     *
     * @param string $moduleName Module name without the .py suffix.
     * @param string $filePath Absolute path to the Python module file.
     * @param string $basePath Directory that owns the module file.
     * @param string $type Human-readable source type for the UI.
     *
     * @return array<string, mixed>
     */
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

    /**
     * Extracts the JSON metadata block from a module file.
     *
     * @param string $filePath Absolute path to the Python module file.
     *
     * @return array<string, mixed>|null
     */
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

    /**
     * Extracts a named metadata variable from Python source without executing
     * the module.  The parser is deliberately simple and expects the metadata
     * block to be a top-level JSON-style dictionary.
     *
     * @param string $filePath Absolute path to the Python module file.
     * @param string $metaVariableName Metadata variable name to search for.
     *
     * @return string|null Raw metadata text, or null when it cannot be found.
     */
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

    /**
     * Checks that a module exposes either the legacy wrapper function or the
     * newer class-based run method expected by the processing pipeline.
     *
     * @param string $moduleName Module name without the .py suffix.
     * @param string $filePath Absolute path to the Python module file.
     *
     * @return bool True when the module exposes a recognised entry point.
     */
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

    /**
     * Ensures the temporary module repository exists, matches the configured
     * source repository, and has current remote branch refs.
     *
     * @param bool $reCheckout True to discard and clone a fresh repository.
     *
     * @return void
     *
     * @throws RuntimeException When the checkout cannot be prepared safely.
     */
    private function ensureRepo(bool $reCheckout): void
    {
        $this->assertRepoOwnership();

        if (is_dir($this->repoPath . '/.git') && !$reCheckout && $this->repositoryOriginMatches()) {
            $this->runGitCommand(['reset', '--hard'], null, $this->repoPath);
            $this->runGitCommand(['clean', '-fdx'], null, $this->repoPath);
            $this->runGitCommand(['fetch', '--prune', 'origin'], null, $this->repoPath);
            return;
        }

        if (file_exists($this->repoPath)) {
            $this->removePath($this->repoPath);
        }

        $parent = dirname($this->repoPath);
        if (!is_dir($parent) && !mkdir($parent, 0775, true) && !is_dir($parent)) {
            throw new RuntimeException('Unable to create temporary module repository folder.');
        }

        $this->runGitCommand(['clone', $this->repoUrl, $this->repoPath], null, $parent);
    }

    /**
     * Checks whether an existing checkout points at the configured repository.
     *
     * @return bool True when origin matches the active repository URL.
     */
    private function repositoryOriginMatches(): bool
    {
        try {
            $origin = $this->runGitCommand(['config', '--get', 'remote.origin.url'], null, $this->repoPath);
        } catch (Throwable $e) {
            return false;
        }

        return $this->normaliseGitRemoteUrl($origin) === $this->normaliseGitRemoteUrl($this->repoUrl);
    }

    /**
     * Normalises git remote URLs for simple equality checks.
     *
     * @param string $url Remote URL.
     *
     * @return string Normalised remote URL.
     */
    private function normaliseGitRemoteUrl(string $url): string
    {
        $url = rtrim(trim($url), '/');
        if (str_ends_with($url, '.git')) {
            $url = substr($url, 0, -4);
        }

        return $url;
    }

    /**
     * Refuses to reuse a temporary repository owned by another user.  Git can
     * treat that as unsafe, and removing it automatically would be too
     * surprising from the WebUI.
     *
     * @return void
     *
     * @throws RuntimeException When the existing checkout is owned by another user.
     */
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

    /**
     * Selects the preferred module branch before validating it against the
     * repository's available branches.
     *
     * @return string Preferred module repository branch.
     */
    private function getPreferredBranch(): string
    {
        if ($this->developerModuleRepoEnabled) {
            return $this->developerModuleRepoBranch;
        }

        $version = $this->getCurrentVersion();
        if ($version !== '') {
            return $version;
        }

        return $this->defaultBranch;
    }

    /**
     * Resolves the repository branch to use for this request.
     *
     * Developer mode uses the configured developer branch when present; when it
     * is blank, it falls back to the first branch available in the checkout.
     *
     * @param string $requestedBranch Branch selected by the browser, if any.
     * @param array<int, string> $branches Available remote branches.
     *
     * @return string Branch to check out.
     *
     * @throws RuntimeException When no branch can be resolved.
     */
    private function resolveRepositoryBranch(string $requestedBranch, array $branches): string
    {
        $requestedBranch = trim($requestedBranch);
        if ($requestedBranch !== '' && in_array($requestedBranch, $branches, true)) {
            return $requestedBranch;
        }

        $preferredBranch = trim($this->getPreferredBranch());
        if ($preferredBranch !== '') {
            if ($this->developerModuleRepoEnabled || in_array($preferredBranch, $branches, true)) {
                return $preferredBranch;
            }
        }

        $defaultBranch = trim($this->defaultBranch);
        if ($defaultBranch !== '' && in_array($defaultBranch, $branches, true)) {
            return $defaultBranch;
        }

        if ($branches !== []) {
            return $branches[0];
        }

        if ($requestedBranch !== '') {
            return $requestedBranch;
        }

        if ($preferredBranch !== '') {
            return $preferredBranch;
        }

        if ($defaultBranch !== '') {
            return $defaultBranch;
        }

        throw new RuntimeException('No branches were found in the module repository.');
    }

    /**
     * Reads the installed Allsky version from the local version file.
     *
     * @return string Installed version, or an empty string when unknown.
     */
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

    /**
     * Lists remote branches available in the checked-out module repository.
     *
     * @return array<int, string>
     *
     * @throws RuntimeException When git cannot list remote branches.
     */
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

    /**
     * Resets the temporary repository and checks out the requested branch.
     *
     * @param string $branch Branch to check out.
     *
     * @return void
     *
     * @throws RuntimeException When git cannot check out or pull the branch.
     */
    private function checkoutBranch(string $branch): void
    {
        $this->runGitCommand(['reset', '--hard'], null, $this->repoPath);
        $this->runGitCommand(['clean', '-fdx'], null, $this->repoPath);
        $this->runGitCommand(['checkout', $branch], null, $this->repoPath);
        $this->runGitCommand(['pull', 'origin', $branch], null, $this->repoPath);
    }

    /**
     * Installs, updates, reinstalls, or migrates a source module.
     *
     * The manifest is verified before any files are copied, dependencies are
     * installed, or post-install code is run.  A rollback snapshot is kept for
     * existing installs so a failed update does not leave a partial module in
     * place.
     *
     * @param string $moduleName Module name without the .py suffix.
     * @param string $modulePath Absolute path to the source module directory.
     * @param bool $force True when the module should be reinstalled.
     *
     * @return string User-facing install log.
     *
     * @throws RuntimeException When validation, installation, migration, or rollback fails.
     */
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

        $manifestData = $this->verifyModuleManifest($moduleName, $modulePath);
        $paths = $this->buildModulePaths($moduleName, $modulePath);
        $log = ['Verified module manifest'];
        $this->applyOwnership($this->myModulesDir);
        $this->applyOwnership($this->moduleDataDir);
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
            $this->writeManifestInfo($modulePath, $paths['installer']);
            $log[] = 'Installer metadata updated';

            $this->installDatabaseConfig($sourceMeta, $modulePath, $log);
            $this->installPackagesFile($modulePath . '/packages.txt', $paths['logfiles'] . '/dependencies.log', $log);
            $this->installRequirementsFile($modulePath . '/requirements.txt', $paths['logfiles'] . '/dependencies.log', $log, $force);
            $this->runPostInstall($installerData, $modulePath, $paths['data'], $manifestData, $log);
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

    /**
     * Removes a user-installed module and the module data managed by the
     * installer.  It deliberately does not remove shared apt or Python packages.
     *
     * @param string $moduleName Module name without the .py suffix.
     *
     * @return string User-facing uninstall result.
     */
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

    /**
     * Migrates flow metadata for a module after its code metadata changes.
     * Existing user values are preserved where possible, new settings are added,
     * and secret values are moved into the Allsky environment file.
     *
     * @param string $moduleName Module name without the .py suffix.
     * @param string $modulePath Absolute path to the source module directory.
     * @param bool $throwOnMissingInstalled Whether a missing installed module is fatal.
     *
     * @return string Migration summary, or an empty string when nothing changed.
     *
     * @throws RuntimeException When migration is requested for a missing module.
     */
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

    /**
     * Builds a status report for a repository-backed module.
     *
     * @param string $moduleName Module name without the .py suffix.
     * @param string $modulePath Absolute path to the source module directory.
     *
     * @return string Plain-text status report.
     */
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

    /**
     * Builds a status report for a built-in core module.
     *
     * @param string $moduleName Module name without the .py suffix.
     * @param string $moduleFile Absolute path to the core module file.
     *
     * @return string Plain-text status report.
     */
    private function getCoreModuleStatusText(string $moduleName, string $moduleFile): string
    {
        $record = $this->buildCoreModuleRecord($moduleName, $moduleFile);
        $lines = [];
        $lines[] = 'Module: ' . $record['displayName'] . " ({$record['module']})";
        $lines[] = 'Type: Allsky core module';
        $lines[] = 'Installed: yes';
        $lines[] = 'Installed version: ' . ($record['installedVersion'] ?? 'Built-in');
        $lines[] = 'Available version: ' . ($record['sourceVersion'] ?? 'Built-in');
        $lines[] = 'Update available: no';
        $lines[] = 'Deprecated: ' . ($record['deprecated'] ? 'yes' : 'no');
        if ($record['replacedBy'] !== '') {
            $lines[] = 'Replaced by: ' . $record['replacedBy'];
        }
        if ($record['docs'] !== '') {
            $lines[] = 'Documentation: ' . $record['docs'];
        }
        if ($record['sourceErrors'] !== []) {
            $lines[] = 'Source errors: ' . implode('; ', $record['sourceErrors']);
        }

        return implode("\n", $lines);
    }

    /**
     * Builds an overall verification report for all user-installed modules.
     *
     * @return string Plain-text verification report.
     */
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

    /**
     * Lists installed user module names from the managed module directories.
     *
     * @return array<int, string>
     */
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

    /**
     * Verifies a single installed module and reports missing dependencies.
     *
     * @param string $moduleName Module name without the .py suffix.
     *
     * @return string Plain-text verification report for the module.
     */
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

    /**
     * Reads saved installer metadata, falling back to source dependency files
     * for older installs that pre-date installer metadata storage.
     *
     * @param string $installedInstallerDir Installed installer metadata directory.
     * @param string $sourcePath Source module directory used as the legacy fallback.
     *
     * @return array<string, mixed>
     */
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

    /**
     * Checks whether declared apt packages appear to be installed.
     *
     * @param array<int, string> $packages Declared apt package specs.
     *
     * @return array<int, string> Human-readable dependency status lines.
     */
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

    /**
     * Checks whether declared Python packages appear in the Allsky virtual
     * environment.
     *
     * @param array<int, string> $packages Declared Python package specs.
     *
     * @return array<int, string> Human-readable dependency status lines.
     */
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

    /**
     * Reduces an apt dependency spec to the package name used by dpkg-query.
     *
     * @param string $packageSpec Apt package spec from module metadata.
     *
     * @return string Package name, or an empty string for an empty spec.
     */
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

    /**
     * Reduces a Python dependency spec to the package name used by pip show.
     *
     * @param string $packageSpec Python package spec from module metadata.
     *
     * @return string Package name, or an empty string for an empty spec.
     */
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

    /**
     * Builds the managed destination paths used when installing a module.
     *
     * @param string $moduleName Module name without the .py suffix.
     * @param string $modulePath Absolute path to the source module directory.
     *
     * @return array<string, string>
     */
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

    /**
     * Copies an optional module subdirectory and records the action in the log.
     *
     * @param string $source Source directory to copy if it exists.
     * @param string $destination Managed destination directory.
     * @param array<int, string> $log Install log lines.
     * @param string $label Human-readable label for the copied content.
     *
     * @return void
     */
    private function copyDirectoryIfExists(string $source, string $destination, array &$log, string $label): void
    {
        if (!is_dir($source)) {
            return;
        }

        $this->copyDirectory($source, $destination);
        $log[] = "Copied {$label}";
    }

    /**
     * Copies recognised readme files into the installed module information
     * directory.
     *
     * @param string $modulePath Source module directory.
     * @param string $destination Managed destination directory.
     * @param array<int, string> $log Install log lines.
     *
     * @return void
     */
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

    /**
     * Saves installer metadata for audit and later verification.
     *
     * If a module has no installer.json file, dependency metadata is built from
     * packages.txt and requirements.txt so older module layouts still have a
     * stored install record.
     *
     * @param string $modulePath Source module directory.
     * @param string $destination Managed installer metadata directory.
     *
     * @return array<string, mixed> Installer metadata used for this install.
     */
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

    /**
     * Copies the verified module manifest into the installed metadata directory.
     *
     * @param string $modulePath Source module directory.
     * @param string $destination Managed installer metadata directory.
     *
     * @return void
     */
    private function writeManifestInfo(string $modulePath, string $destination): void
    {
        $this->copyFile(
            $modulePath . '/' . self::MODULE_MANIFEST_FILE,
            $destination . '/' . self::MODULE_MANIFEST_FILE
        );
    }

    /**
     * Verifies the security manifest for a source module before installation.
     *
     * The manifest must name the module, use sha256 hashes, cover required
     * installer inputs, and account for every regular file in the module
     * directory.  This is the trust boundary before dependency installation or
     * post-install execution.
     *
     * @param string $moduleName Module name without the .py suffix.
     * @param string $modulePath Source module directory.
     *
     * @return array<string, mixed> Normalised manifest data.
     *
     * @throws RuntimeException When the manifest is missing, invalid, or does not match the files.
     */
    private function verifyModuleManifest(string $moduleName, string $modulePath): array
    {
        $manifestPath = $modulePath . '/' . self::MODULE_MANIFEST_FILE;
        if (!is_file($manifestPath) || !is_readable($manifestPath) || is_link($manifestPath)) {
            throw new RuntimeException(
                "Module {$moduleName} cannot be installed because it does not contain the required Allsky security manifest. " .
                'Please contact the Allsky team.'
            );
        }

        $decoded = json_decode((string)file_get_contents($manifestPath), true);
        if (!is_array($decoded)) {
            throw new RuntimeException(
                "Module {$moduleName} cannot be installed because its Allsky security manifest is invalid. " .
                'Please contact the Allsky team.'
            );
        }

        if (($decoded['module'] ?? '') !== $moduleName) {
            throw new RuntimeException(
                "Module {$moduleName} cannot be installed because its Allsky security manifest does not match the module. " .
                'Please contact the Allsky team.'
            );
        }

        if (($decoded['hash_algorithm'] ?? '') !== 'sha256') {
            throw new RuntimeException(
                "Module {$moduleName} cannot be installed because its Allsky security manifest uses an unsupported format. " .
                'Please contact the Allsky team.'
            );
        }

        $files = $decoded['files'] ?? null;
        if (!is_array($files) || $files === []) {
            throw new RuntimeException(
                "Module {$moduleName} cannot be installed because its Allsky security manifest is incomplete. " .
                'Please contact the Allsky team.'
            );
        }

        $verifiedFiles = [];
        foreach ($files as $relativePath => $entry) {
            $relativePath = (string)$relativePath;
            $filePath = $this->manifestFilePath($modulePath, $relativePath);
            $fileData = $this->normaliseManifestFileEntry($entry, $relativePath);
            $this->assertManifestFileMatches($filePath, $fileData, $relativePath, true);
            $verifiedFiles[$relativePath] = $fileData;
        }

        $this->assertRequiredManifestFiles($moduleName, $modulePath, $verifiedFiles);
        $this->assertNoUnexpectedModuleFiles($modulePath, $verifiedFiles);

        $decoded['files'] = $verifiedFiles;
        return $decoded;
    }

    /**
     * Normalises one manifest file entry into the shape used by verification.
     *
     * @param mixed $entry Manifest entry for one file.
     * @param string $relativePath Manifest-relative path being normalised.
     *
     * @return array{sha256: string, size: int|null, mode: string|null}
     *
     * @throws RuntimeException When the entry is malformed.
     */
    private function normaliseManifestFileEntry($entry, string $relativePath): array
    {
        $fileData = [
            'sha256' => '',
            'size' => null,
            'mode' => null,
        ];

        if (is_string($entry)) {
            $fileData['sha256'] = $entry;
        } elseif (is_array($entry)) {
            $fileData['sha256'] = (string)($entry['sha256'] ?? '');

            if (array_key_exists('size', $entry)) {
                if (!is_int($entry['size']) && !(is_string($entry['size']) && ctype_digit($entry['size']))) {
                    throw new RuntimeException("Manifest file {$relativePath} has an invalid size");
                }
                $fileData['size'] = (int)$entry['size'];
                if ($fileData['size'] < 0) {
                    throw new RuntimeException("Manifest file {$relativePath} has an invalid size");
                }
            }

            if (array_key_exists('mode', $entry)) {
                $fileData['mode'] = $this->normaliseManifestMode((string)$entry['mode'], $relativePath);
            }
        } else {
            throw new RuntimeException("Manifest file {$relativePath} has an invalid entry");
        }

        if (str_starts_with($fileData['sha256'], 'sha256:')) {
            $fileData['sha256'] = substr($fileData['sha256'], 7);
        }
        $fileData['sha256'] = strtolower(trim($fileData['sha256']));

        if (!preg_match('/^[a-f0-9]{64}$/', $fileData['sha256'])) {
            throw new RuntimeException("Manifest file {$relativePath} has an invalid sha256");
        }

        return $fileData;
    }

    /**
     * Normalises a manifest file mode to the three octal digits compared
     * against fileperms().
     *
     * @param string $mode Mode from the manifest.
     * @param string $relativePath Manifest-relative path, used in error text.
     *
     * @return string Three-digit octal mode.
     *
     * @throws RuntimeException When the mode is not octal.
     */
    private function normaliseManifestMode(string $mode, string $relativePath): string
    {
        $mode = trim($mode);
        if (!preg_match('/^[0-7]{3,4}$/', $mode)) {
            throw new RuntimeException("Manifest file {$relativePath} has an invalid mode");
        }

        return substr(str_pad($mode, 3, '0', STR_PAD_LEFT), -3);
    }

    /**
     * Resolves a manifest path and proves it stays inside the module directory.
     *
     * @param string $modulePath Source module directory.
     * @param string $relativePath Manifest-relative file path.
     *
     * @return string Absolute path to the source file.
     *
     * @throws RuntimeException When the path is unsafe or escapes the module.
     */
    private function manifestFilePath(string $modulePath, string $relativePath): string
    {
        $this->assertSafeManifestPath($relativePath);

        $moduleRoot = realpath($modulePath);
        if ($moduleRoot === false) {
            throw new RuntimeException("Unable to verify module path {$modulePath}");
        }

        $filePath = realpath($moduleRoot . '/' . $relativePath);
        if ($filePath === false || !str_starts_with($filePath, $moduleRoot . DIRECTORY_SEPARATOR)) {
            throw new RuntimeException("Manifest file {$relativePath} escapes the module directory");
        }

        return $filePath;
    }

    /**
     * Rejects manifest paths that could escape the module or behave
     * differently on another platform.
     *
     * @param string $relativePath Manifest-relative file path.
     *
     * @return void
     *
     * @throws RuntimeException When the path is unsafe.
     */
    private function assertSafeManifestPath(string $relativePath): void
    {
        if ($relativePath === '' || str_starts_with($relativePath, '/') || str_contains($relativePath, "\0") || str_contains($relativePath, '\\')) {
            throw new RuntimeException("Unsafe manifest path {$relativePath}");
        }

        foreach (explode('/', $relativePath) as $segment) {
            if ($segment === '' || $segment === '.' || $segment === '..') {
                throw new RuntimeException("Unsafe manifest path {$relativePath}");
            }
        }
    }

    /**
     * Checks a file against its manifest hash, size, and optionally mode.
     *
     * @param string $filePath Absolute file path to check.
     * @param array{sha256: string, size: int|null, mode: string|null} $fileData Normalised manifest entry.
     * @param string $relativePath Manifest-relative path, used in error text.
     * @param bool $checkMode Whether to compare the manifest file mode.
     *
     * @return void
     *
     * @throws RuntimeException When the file does not match the manifest.
     */
    private function assertManifestFileMatches(string $filePath, array $fileData, string $relativePath, bool $checkMode): void
    {
        if (!is_file($filePath) || !is_readable($filePath) || is_link($filePath)) {
            throw new RuntimeException("Manifest file {$relativePath} is not a readable regular file");
        }

        $actualHash = hash_file('sha256', $filePath);
        if ($actualHash === false || !hash_equals($fileData['sha256'], strtolower($actualHash))) {
            throw new RuntimeException("Manifest hash mismatch for {$relativePath}");
        }

        if ($fileData['size'] !== null) {
            $actualSize = filesize($filePath);
            if ($actualSize === false || (int)$actualSize !== $fileData['size']) {
                throw new RuntimeException("Manifest size mismatch for {$relativePath}");
            }
        }

        if ($checkMode && $fileData['mode'] !== null) {
            $actualMode = fileperms($filePath);
            if ($actualMode === false || substr(sprintf('%o', $actualMode), -3) !== $fileData['mode']) {
                throw new RuntimeException("Manifest mode mismatch for {$relativePath}");
            }
        }
    }

    /**
     * Ensures the manifest covers the files that directly influence install
     * behaviour.
     *
     * @param string $moduleName Module name without the .py suffix.
     * @param string $modulePath Source module directory.
     * @param array<string, array{sha256: string, size: int|null, mode: string|null}> $verifiedFiles Verified manifest entries.
     *
     * @return void
     *
     * @throws RuntimeException When a required file is missing from the manifest.
     */
    private function assertRequiredManifestFiles(string $moduleName, string $modulePath, array $verifiedFiles): void
    {
        $requiredFiles = [$moduleName . '.py'];

        foreach (['installer.json', 'packages.txt', 'requirements.txt'] as $fileName) {
            if (is_file($modulePath . '/' . $fileName)) {
                $requiredFiles[] = $fileName;
            }
        }

        foreach ($requiredFiles as $fileName) {
            if (!isset($verifiedFiles[$fileName])) {
                throw new RuntimeException("Module manifest is missing required file {$fileName}");
            }
        }
    }

    /**
     * Ensures every regular file in the module directory is listed in the
     * verified manifest and rejects symlinks outright.
     *
     * @param string $modulePath Source module directory.
     * @param array<string, array{sha256: string, size: int|null, mode: string|null}> $verifiedFiles Verified manifest entries.
     *
     * @return void
     *
     * @throws RuntimeException When a file is not covered by the manifest.
     */
    private function assertNoUnexpectedModuleFiles(string $modulePath, array $verifiedFiles): void
    {
        $moduleRoot = realpath($modulePath);
        if ($moduleRoot === false) {
            throw new RuntimeException("Unable to verify module path {$modulePath}");
        }

        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($moduleRoot, FilesystemIterator::SKIP_DOTS),
            RecursiveIteratorIterator::SELF_FIRST
        );

        foreach ($iterator as $item) {
            $path = $item->getPathname();
            $relativePath = str_replace(DIRECTORY_SEPARATOR, '/', substr($path, strlen($moduleRoot) + 1));

            if ($item->isLink()) {
                throw new RuntimeException("Module contains unsupported symlink {$relativePath}");
            }

            if (!$item->isFile()) {
                continue;
            }

            if ($relativePath === self::MODULE_MANIFEST_FILE) {
                continue;
            }

            if (!isset($verifiedFiles[$relativePath])) {
                throw new RuntimeException("Module contains file missing from manifest: {$relativePath}");
            }
        }
    }

    /**
     * Captures the currently installed module state before an update starts.
     *
     * @param string $moduleName Module name without the .py suffix.
     * @param array<string, string> $paths Managed install paths for the module.
     * @param array<string, mixed>|null $installedInfo Existing installed module information.
     *
     * @return array<string, mixed> Rollback snapshot descriptor.
     *
     * @throws RuntimeException When the snapshot directory cannot be created.
     */
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

    /**
     * Restores the pre-install state after a failed install or update.
     *
     * @param string $moduleName Module name without the .py suffix.
     * @param array<string, string> $paths Managed install paths for the module.
     * @param array<string, mixed> $snapshot Rollback snapshot descriptor.
     *
     * @return void
     */
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

    /**
     * Removes a temporary rollback snapshot once it is no longer needed.
     *
     * @param array<string, mixed> $snapshot Rollback snapshot descriptor.
     *
     * @return void
     */
    private function cleanupInstallRollbackSnapshot(array $snapshot): void
    {
        $root = (string)($snapshot['root'] ?? '');
        if ($root !== '') {
            $this->removePath($root);
        }
    }

    /**
     * Copies an existing file or directory into a rollback snapshot.
     *
     * @param string $source Existing path to snapshot.
     * @param string $destination Snapshot destination path.
     *
     * @return void
     *
     * @throws RuntimeException When a snapshot file cannot be written.
     */
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

    /**
     * Restores a previously snapshotted file or directory.
     *
     * @param string $source Snapshot source path.
     * @param string $destination Managed destination path.
     *
     * @return void
     */
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

    /**
     * Restores a file from in-memory contents, falling back to sudo when normal
     * write permissions are not enough.
     *
     * @param string $filePath Destination file path.
     * @param string $contents Contents to restore.
     *
     * @return void
     *
     * @throws RuntimeException When the file cannot be restored.
     */
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

    /**
     * Installs a module-provided database table configuration into the user's
     * Allsky database configuration.
     *
     * @param array<string, mixed> $sourceMeta Source module metadata.
     * @param string $modulePath Source module directory.
     * @param array<int, string> $log Install log lines.
     *
     * @return void
     */
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

    /**
     * Installs apt dependencies declared by a verified module packages file.
     *
     * @param string $filePath Path to packages.txt.
     * @param string $logFile Dependency install log file.
     * @param array<int, string> $log Install log lines.
     *
     * @return void
     *
     * @throws RuntimeException When a package spec is invalid or apt fails.
     */
    private function installPackagesFile(string $filePath, string $logFile, array &$log): void
    {
        $packages = $this->readDependencyLines($filePath);
        if ($packages === []) {
            return;
        }

        $this->ensureDirectory(dirname($logFile));
        foreach ($packages as $package) {
            $this->validateAptPackageSpec($package);
            file_put_contents($logFile, "\n--- Installing {$package} ---\n", FILE_APPEND);
            $result = $this->runProcessWithOptions(['/usr/bin/sudo', 'apt-get', 'install', '-y', '--', $package]);
            file_put_contents($logFile, $result['message'] . "\n", FILE_APPEND);
            if ($result['error']) {
                throw new RuntimeException("Failed to install apt package {$package}: " . trim($result['message']));
            }
        }

        $log[] = 'Installed apt dependencies';
    }

    /**
     * Validates an apt package spec without relying on a global dependency
     * allowlist.  Module dependencies can vary, but command options and shell
     * fragments are not accepted as package names.
     *
     * @param string $package Apt package spec from packages.txt.
     *
     * @return void
     *
     * @throws RuntimeException When the spec is not an apt package name.
     */
    private function validateAptPackageSpec(string $package): void
    {
        if (!preg_match('/^[a-z0-9][a-z0-9+.-]*(?::[a-z0-9][a-z0-9-]*)?(?:=[A-Za-z0-9.+:~:-]+)?$/', $package)) {
            throw new RuntimeException("Invalid apt package spec {$package}");
        }
    }

    /**
     * Installs Python dependencies declared by a verified module requirements
     * file into the Allsky virtual environment.
     *
     * @param string $filePath Path to requirements.txt.
     * @param string $logFile Dependency install log file.
     * @param array<int, string> $log Install log lines.
     * @param bool $forceReinstall Whether packages should be force-reinstalled.
     *
     * @return void
     *
     * @throws RuntimeException When a package spec is invalid or pip fails.
     */
    private function installRequirementsFile(string $filePath, string $logFile, array &$log, bool $forceReinstall = false): void
    {
        $packages = $this->readDependencyLines($filePath);
        if ($packages === []) {
            return;
        }

        $this->ensurePythonEnvironmentWritable();
        $this->ensureDirectory(dirname($logFile));
        try {
            foreach ($packages as $package) {
                $this->validatePythonPackageSpec($package);
                if ($forceReinstall) {
                    file_put_contents($logFile, "\n--- Ensuring dependencies for {$package} ---\n", FILE_APPEND);
                    $result = $this->runProcessWithOptions(
                        [$this->venvPython, '-m', 'pip', 'install', '--no-cache-dir', '--', $package],
                        $this->allskyHome
                    );
                    file_put_contents($logFile, $result['message'] . "\n", FILE_APPEND);
                    if ($result['error']) {
                        throw new RuntimeException("Failed to install Python dependency {$package}: " . trim($result['message']));
                    }
                }

                $dependencyAction = $forceReinstall ? 'Reinstalling' : 'Installing';
                file_put_contents($logFile, "\n--- {$dependencyAction} {$package} ---\n", FILE_APPEND);
                $pipArgs = [$this->venvPython, '-m', 'pip', 'install', '--no-cache-dir'];
                if ($forceReinstall) {
                    $pipArgs[] = '--force-reinstall';
                    $pipArgs[] = '--no-deps';
                }
                $pipArgs[] = '--';
                $pipArgs[] = $package;
                $result = $this->runProcessWithOptions($pipArgs, $this->allskyHome);
                file_put_contents($logFile, $result['message'] . "\n", FILE_APPEND);
                if ($result['error']) {
                    throw new RuntimeException("Failed to install Python dependency {$package}: " . trim($result['message']));
                }
            }
        } finally {
            $this->applyPythonPackageOwnership();
        }

        $log[] = $forceReinstall ? 'Reinstalled Python dependencies' : 'Installed Python dependencies';
    }

    /**
     * Validates a Python package spec while rejecting pip options, URLs, VCS
     * references, and local paths.
     *
     * @param string $package Python package spec from requirements.txt.
     *
     * @return void
     *
     * @throws RuntimeException When the spec is not a package requirement.
     */
    private function validatePythonPackageSpec(string $package): void
    {
        if ($package === '' || preg_match('/[\r\n\0]/', $package)) {
            throw new RuntimeException('Invalid Python dependency spec');
        }

        if (preg_match('/^\s*-/', $package) || preg_match('/\s-{1,2}[A-Za-z]/', $package)) {
            throw new RuntimeException("Python dependency {$package} must not contain pip options");
        }

        if (str_contains($package, '://') || str_contains($package, '@') || str_contains($package, '/') || str_contains($package, '\\')) {
            throw new RuntimeException("Python dependency {$package} must be a package spec, not a URL or path");
        }
    }

    /**
     * Makes the Allsky virtual environment writable by the WebUI before pip
     * changes are attempted.
     *
     * @return void
     */
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

    /**
     * Restores ownership and group write permissions on the Allsky virtual
     * environment after pip changes.
     *
     * @return void
     *
     * @throws RuntimeException When ownership or permission repair fails.
     */
    private function applyPythonPackageOwnership(): void
    {
        $venvPath = $this->allskyHome . '/venv';
        if (!file_exists($venvPath)) {
            return;
        }

        $result = $this->runProcessWithOptions(['/usr/bin/sudo', '/bin/chown', '-R', $this->owner . ':' . $this->allskyGroup, $venvPath]);
        if ($result['error']) {
            throw new RuntimeException("Failed to set Python package ownership to {$this->owner}:{$this->allskyGroup}: " . trim($result['message']));
        }

        $result = $this->runProcessWithOptions(['/usr/bin/sudo', '/bin/chmod', '-R', 'g+rwX', $venvPath]);
        if ($result['error']) {
            throw new RuntimeException("Failed to set Python package group permissions: " . trim($result['message']));
        }
    }

    /**
     * Runs a module post-install helper after resolving it to a manifest-covered
     * file and rechecking the installed helper hash.
     *
     * @param array<string, mixed> $installerData Installer metadata for the module.
     * @param string $modulePath Source module directory.
     * @param string $installDataDir Installed module data directory.
     * @param array<string, mixed> $manifestData Verified manifest data.
     * @param array<int, string> $log Install log lines.
     *
     * @return void
     *
     * @throws RuntimeException When the helper path is unsafe or execution fails.
     */
    private function runPostInstall(array $installerData, string $modulePath, string $installDataDir, array $manifestData, array &$log): void
    {
        $postInstall = $installerData['post-install']['run'] ?? '';
        if (!is_string($postInstall) || trim($postInstall) === '') {
            return;
        }

        [$postInstall, $manifestPath] = $this->resolvePostInstallPath(
            trim($postInstall),
            $modulePath,
            $installDataDir,
            $manifestData
        );

        $this->assertManifestFileMatches($postInstall, $manifestData['files'][$manifestPath], $manifestPath, false);

        $result = str_ends_with($postInstall, '.py')
            ? $this->runProcessWithOptions([$this->venvPython, $postInstall], dirname($postInstall))
            : $this->runProcessWithOptions([$postInstall], dirname($postInstall));

        if ($result['error']) {
            throw new RuntimeException('Post-install step failed: ' . trim($result['message']));
        }

        $log[] = 'Ran post-install action';
    }

    /**
     * Resolves a post-install path into the executable file and matching
     * manifest path.
     *
     * The only accepted forms are a relative source-module path or a path below
     * {install_data_dir}.  Command arguments are rejected here so the installer
     * does not become a shell-like execution surface.
     *
     * @param string $postInstall Raw post-install value from installer metadata.
     * @param string $modulePath Source module directory.
     * @param string $installDataDir Installed module data directory.
     * @param array<string, mixed> $manifestData Verified manifest data.
     *
     * @return array{0: string, 1: string} Executable path and manifest-relative path.
     *
     * @throws RuntimeException When the path is unsafe or not covered by the manifest.
     */
    private function resolvePostInstallPath(string $postInstall, string $modulePath, string $installDataDir, array $manifestData): array
    {
        if (preg_match('/\s/', $postInstall)) {
            throw new RuntimeException('Post-install path must not contain whitespace or command arguments');
        }

        $placeholder = '{install_data_dir}';
        $moduleName = (string)($manifestData['module'] ?? '');
        if ($moduleName === '') {
            throw new RuntimeException('Post-install manifest has no module name');
        }

        if (str_starts_with($postInstall, $placeholder)) {
            if (!str_starts_with($postInstall, $placeholder . '/')) {
                throw new RuntimeException('Post-install {install_data_dir} path must reference a file below the install data directory');
            }

            $dataRelativePath = substr($postInstall, strlen($placeholder) + 1);
            $this->assertSafeManifestPath($dataRelativePath);
            $manifestPath = $moduleName . '/' . $dataRelativePath;
            $executionPath = rtrim($installDataDir, '/') . '/' . $dataRelativePath;
        } else {
            if (str_contains($postInstall, $placeholder)) {
                throw new RuntimeException('Post-install {install_data_dir} placeholder must be at the start of the path');
            }
            if (str_starts_with($postInstall, '/')) {
                throw new RuntimeException('Post-install path must be relative to the module or use {install_data_dir}');
            }

            $manifestPath = $postInstall;
            while (str_starts_with($manifestPath, './')) {
                $manifestPath = substr($manifestPath, 2);
            }
            $this->assertSafeManifestPath($manifestPath);
            $executionPath = rtrim($modulePath, '/') . '/' . $manifestPath;
        }

        if (!isset($manifestData['files'][$manifestPath])) {
            throw new RuntimeException("Post-install file {$manifestPath} is not covered by the module manifest");
        }

        return [$executionPath, $manifestPath];
    }

    /**
     * Removes an older copy of a module when the managed install location has
     * changed.
     *
     * @param string $moduleName Module name without the .py suffix.
     * @param array<string, mixed>|null $installedInfo Existing installed module information.
     * @param string $newModulePath New managed module directory.
     * @param array<int, string> $log Install log lines.
     *
     * @return void
     */
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

    /**
     * Finds flows whose stored argument details differ from installed module
     * metadata and may need migration.
     *
     * @param string $moduleName Module name without the .py suffix.
     * @param array<string, mixed> $installedMeta Installed module metadata.
     *
     * @return array<int, string> Flow filenames that need migration.
     */
    private function getDifferingFlows(string $moduleName, array $installedMeta): array
    {
        $flows = [];
        $moduleKey = $this->nameForFlow($moduleName);
        $codeArgumentDetails = is_array($installedMeta['argumentdetails'] ?? null) ? $installedMeta['argumentdetails'] : [];

        foreach ($this->getFlowsWithModule($moduleName) as $flowFile => $flowData) {
            $flowArgumentDetails = $flowData[$moduleKey]['metadata']['argumentdetails'] ?? [];
            if ($this->normaliseArgDetails($flowArgumentDetails) !== $this->normaliseArgDetails($codeArgumentDetails)) {
                $flows[] = $flowFile;
            }
        }

        return $flows;
    }

    /**
     * Loads post-processing flow files from config/modules that contain the
     * requested module.
     *
     * @param string $moduleName Module name; the allsky_ prefix is stripped for flow keys.
     *
     * @return array<string, array<string, mixed>> Flow filename mapped to decoded flow data.
     */
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

    /**
     * Normalises argument detail metadata so equivalent forms compare cleanly.
     *
     * @param array<string, mixed> $argDetails Argument details from metadata or flow JSON.
     *
     * @return array<string, mixed>
     */
    private function normaliseArgDetails(array $argDetails): array
    {
        $normalised = [];

        foreach ($argDetails as $key => $details) {
            if (!is_array($details)) {
                $normalised[$key] = $details;
                continue;
            }
            $normalised[$key] = [];
            foreach ($details as $detailKey => $value) {
                if ($detailKey === 'required' || $detailKey === 'secret') {
                    $normalised[$key][$detailKey] = $this->toBool($value);
                    continue;
                }
                if ($detailKey === 'type' && is_array($value)) {
                    $typeData = [];
                    foreach ($value as $typeKey => $typeValue) {
                        $typeData[$typeKey] = is_string($typeValue) && str_contains($typeValue, ',')
                            ? array_map('trim', explode(',', $typeValue))
                            : $typeValue;
                    }
                    $normalised[$key][$detailKey] = $typeData;
                    continue;
                }
                $normalised[$key][$detailKey] = $value;
            }
        }

        return $normalised;
    }

    /**
     * Determines whether a source module version should replace the installed
     * version.
     *
     * @param string|null $installedVersion Version from the installed module metadata.
     * @param string|null $sourceVersion Version from the source module metadata.
     * @param bool $installed Whether the module is already installed.
     *
     * @return bool True when an update should be offered.
     */
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

    /**
     * Reads non-empty, non-comment dependency lines from a dependency file.
     *
     * @param string $filePath Path to packages.txt or requirements.txt.
     *
     * @return array<int, string>
     */
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

    /**
     * Recursively copies a directory into a managed destination.
     *
     * @param string $source Source directory.
     * @param string $destination Destination directory.
     *
     * @return void
     */
    private function copyDirectory(string $source, string $destination): void
    {
        if (is_dir($destination)) {
            $this->removePath($destination);
        }
        $this->ensureDirectory(dirname($destination));
        $this->createDirectory($destination);

        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($source, FilesystemIterator::SKIP_DOTS),
            RecursiveIteratorIterator::SELF_FIRST
        );

        foreach ($iterator as $item) {
            $target = $destination . '/' . $iterator->getSubPathName();
            if ($item->isDir()) {
                $this->createDirectory($target);
            } else {
                $this->copyFile($item->getPathname(), $target);
            }
        }
    }

    /**
     * Copies a readable source file into a managed destination.
     *
     * @param string $source Source file path.
     * @param string $destination Destination file path.
     *
     * @return void
     *
     * @throws RuntimeException When the source file cannot be read.
     */
    private function copyFile(string $source, string $destination): void
    {
        if (!is_file($source) || !is_readable($source)) {
            throw new RuntimeException("Unable to read source file {$source}");
        }

        $this->ensureDirectory(dirname($destination));
        $this->writeFileFromSource($source, $destination);
    }

    /**
     * Writes a source file to a destination, using sudo as a fallback for
     * WebUI-managed paths that need permission repair.
     *
     * @param string $source Source file path.
     * @param string $destination Destination file path.
     *
     * @return void
     *
     * @throws RuntimeException When the file cannot be copied.
     */
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

    /**
     * Ensures a directory exists and is writable by the WebUI user.
     *
     * @param string $path Directory path to prepare.
     *
     * @return void
     *
     * @throws RuntimeException When the directory cannot be made writable.
     */
    private function ensureDirectory(string $path): void
    {
        if ($path === '') {
            return;
        }

        $this->createDirectory($path);

        if (!is_writable($path)) {
            $this->repairDirectoryPermissions($path);
        }

        if (!is_writable($path)) {
            throw new RuntimeException("Directory {$path} is not writable by the WebUI user");
        }
    }

    /**
     * Creates a directory, using sudo as a fallback for managed paths that the
     * WebUI cannot create directly.
     *
     * @param string $path Directory path to create.
     *
     * @return void
     *
     * @throws RuntimeException When the directory cannot be created.
     */
    private function createDirectory(string $path): void
    {
        if ($path === '') {
            return;
        }

        clearstatcache(true, $path);
        if (is_dir($path)) {
            return;
        }

        if ((file_exists($path) || is_link($path)) && !is_dir($path)) {
            $this->removePath($path);
            clearstatcache(true, $path);
        }

        @mkdir($path, 0775, true);
        clearstatcache(true, $path);
        if (is_dir($path)) {
            return;
        }

        $result = $this->runProcessWithOptions(['/usr/bin/sudo', 'mkdir', '-p', '-m', '0775', $path]);
        clearstatcache(true, $path);
        if (is_dir($path)) {
            return;
        }

        throw new RuntimeException(
            "Unable to create directory {$path}" .
            (trim($result['message'] ?? '') !== '' ? ': ' . trim($result['message']) : '')
        );
    }

    /**
     * Repairs ownership and permissions for a directory expected to be
     * WebUI-writable.
     *
     * @param string $path Directory path to repair.
     *
     * @return void
     */
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

    /**
     * Removes a file, symlink, or directory tree.
     *
     * @param string $path Path to remove.
     *
     * @return void
     */
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

    /**
     * Applies WebUI ownership and group write permissions to an installed path.
     *
     * @param string $path Path whose ownership should be repaired.
     *
     * @return void
     */
    private function applyOwnership(string $path): void
    {
        if (!file_exists($path)) {
            return;
        }
        $this->runProcessWithOptions(['/usr/bin/sudo', 'chown', '-R', $this->owner . ':' . $this->webGroup, $path]);
        $this->runProcessWithOptions(['/usr/bin/sudo', 'chmod', '-R', 'g+rwX', $path]);
    }

    /**
     * Loads the Allsky environment file used for module secrets.
     *
     * @return array<string, mixed>
     */
    private function loadSecretsFile(): array
    {
        if (!is_file(ALLSKY_ENV)) {
            return [];
        }
        $decoded = json_decode((string)file_get_contents(ALLSKY_ENV), true);
        return is_array($decoded) ? $decoded : [];
    }

    /**
     * Saves JSON in a stable, readable format, using sudo as a fallback when the
     * WebUI cannot write the destination directly.
     *
     * @param string $filePath Destination JSON file.
     * @param array<string, mixed> $data Data to serialise.
     *
     * @return void
     *
     * @throws RuntimeException When JSON cannot be encoded or written.
     */
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

    /**
     * Converts an Allsky module filename-style name to the key used in flow JSON.
     *
     * @param string $moduleName Module name with or without the allsky_ prefix.
     *
     * @return string Flow key.
     */
    private function nameForFlow(string $moduleName): string
    {
        return preg_replace('/^allsky_/', '', $moduleName) ?? $moduleName;
    }

    /**
     * Interprets common metadata truthy values as booleans.
     *
     * @param mixed $value Metadata value to interpret.
     *
     * @return bool
     */
    private function toBool($value): bool
    {
        if (is_bool($value)) {
            return $value;
        }
        return in_array(strtolower(trim((string)$value)), ['true', '1', 'yes', 'y', 'on'], true);
    }

    /**
     * Formats a metadata value for a migration summary.
     *
     * @param mixed $value Value to format.
     *
     * @return string
     */
    private function stringifyValue($value): string
    {
        if (is_scalar($value) || $value === null) {
            return (string)$value;
        }
        $encoded = json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        return $encoded === false ? '[complex]' : $encoded;
    }

    /**
     * Runs a git command and returns its combined output.
     *
     * @param array<int, string> $args Git arguments without the git executable.
     * @param string|null $cwd Working directory for the command.
     * @param string|null $fallbackCwd Working directory used when $cwd is not a directory.
     *
     * @return string Combined stdout and stderr.
     *
     * @throws RuntimeException When git exits with an error.
     */
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

    /**
     * Runs a process using an argv array so arguments are not interpreted by a
     * shell.
     *
     * @param array<int, string> $argv Command and arguments.
     * @param string|null $cwd Working directory for the process.
     *
     * @return array{error: bool, message: string}
     */
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
