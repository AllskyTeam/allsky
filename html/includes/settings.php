<?php
/**
 * Settings page for the separate "settings" route. The legacy
 * allskySettings.php serves the "configuration" route.
 *
 * options.json defines the fields. PHP handles schema and submissions; Twig
 * templates under html/templates/settings render the page.
 */

if (basename(__FILE__) === basename($_SERVER['SCRIPT_FILENAME'] ?? '')) {
    include_once __DIR__ . '/functions.php';
    redirect('/index.php');
}

/**
 * Reads the options document and exposes settings in display order.
 */
final class SettingsSchema
{
    /** @var array<int, array<string, mixed>> Settings in document order. */
    private $options;
    /** @var array<string, array<string, mixed>> Settings indexed by name. */
    private $byName = [];
    /** @var array<int, array<string, mixed>> Categories and sections for navigation. */
    private $navigation = [];

    /**
     * Build the setting index and navigation from the options document.
     *
     * @param array<string, mixed> $document Decoded options document.
     * @throws RuntimeException If a category, section or setting is invalid.
     */
    public function __construct(array $document)
    {
        if (!isset($document['sections']) || !is_array($document['sections'])) {
            throw new RuntimeException('The new options file must contain a sections object.');
        }
        $this->options = [];
        foreach ($document['sections'] as $categoryKey => $category) {
            if (!is_array($category)) {
                throw new RuntimeException("Invalid settings category '$categoryKey'.");
            }
            $group = ['label' => $category['label'] ?? $categoryKey, 'sections' => []];
            $rows = [];
            if (!empty($category['warning'])) {
                $rows[] = ['kind' => 'warning', 'label' => (string)$category['warning']];
            }
            $this->addSettings($category['settings'] ?? [], $rows);
            if ($rows) {
                $group['sections'][] = ['label' => $group['label'], 'rows' => $rows, 'errors' => 0];
            }
            foreach ($category['sections'] ?? [] as $sectionKey => $section) {
                if (!is_array($section)) {
                    throw new RuntimeException("Invalid settings section '$sectionKey'.");
                }
                $rows = [];
                if (strpos((string)($section['label'] ?? ''), '<') !== false) {
                    $rows[] = ['kind' => 'heading', 'option' => [
                        'type' => 'header-sub', 'label' => $section['label'],
                    ]];
                }
                $this->addSection($section, $rows);
                if ($rows) {
                    $group['sections'][] = [
                        'label' => $section['label'] ?? $sectionKey,
                        'rows' => $rows,
                        'errors' => 0,
                    ];
                }
            }
            if ($group['sections']) {
                $this->navigation[] = $group;
            }
        }
    }

    /**
     * Return all settings in document order.
     *
     * @return array<int, array<string, mixed>>
     */
    public function all(): array
    {
        return $this->options;
    }

    /**
     * Return the categories and sections used by the page.
     *
     * @return array<int, array<string, mixed>>
     */
    public function navigation(): array
    {
        return $this->navigation;
    }

    /**
     * Find a setting by its name.
     *
     * @return array<string, mixed>|null
     */
    public function find(string $name): ?array
    {
        return $this->byName[$name] ?? null;
    }

    /**
     * Report whether an option should be ignored.
     *
     * The new schema includes every option, so this currently returns false.
     *
     * @param array<string, mixed> $option
     */
    public function isIgnored(array $option): bool
    {
        return false;
    }

    /**
     * Check whether a setting describes a heading.
     *
     * @param array<string, mixed> $option
     */
    public function isHeading(array $option): bool
    {
        return strpos($option['type'] ?? '', 'header') === 0;
    }

    /**
     * Index settings and append their field rows.
     *
     * @param array<string, mixed> $settings
     * @param array<int, array<string, mixed>> $rows Rows to append to.
     * @throws RuntimeException If a setting is invalid or repeated.
     */
    private function addSettings(array $settings, array &$rows): void
    {
        foreach ($settings as $name => $metadata) {
            if (!is_array($metadata) || isset($this->byName[$name])) {
                throw new RuntimeException("Invalid or repeated setting '$name'.");
            }
            $option = ['name' => $name] + $metadata;
            $this->options[] = $option;
            $this->byName[$name] = $option;
            $rows[] = ['kind' => 'field', 'option' => $option];
        }
    }

    /**
     * Append a section and its nested subsections in order.
     *
     * @param array<string, mixed> $section
     * @param array<int, array<string, mixed>> $rows Rows to append to.
     * @throws RuntimeException If a subsection is invalid.
     */
    private function addSection(array $section, array &$rows): void
    {
        $this->addSettings($section['settings'] ?? [], $rows);
        foreach ($section['sections'] ?? [] as $key => $child) {
            if (!is_array($child)) {
                throw new RuntimeException("Invalid settings subsection '$key'.");
            }
            $rows[] = ['kind' => 'heading', 'option' => [
                'type' => 'header-sub', 'label' => $child['label'] ?? $key,
            ]];
            $this->addSection($child, $rows);
        }
    }

    /**
     * Check whether a setting belongs on this page.
     *
     * @param array<string, mixed> $option
     */
    public function isVisible(array $option): bool
    {
        return !$this->isIgnored($option) && self::bool($option['display'] ?? true)
            && !self::bool($option['settingsonly'] ?? false);
    }

    /**
     * Check whether the user may submit a value for this setting.
     *
     * @param array<string, mixed> $option
     */
    public function isEditable(array $option): bool
    {
        return !$this->isHeading($option) && $this->isVisible($option)
            && !self::bool($option['readonly'] ?? false);
    }

    /**
     * Map an option type to its form control type.
     *
     * @param array<string, mixed> $option
     */
    public function control(array $option): string
    {
        $type = $option['type'] ?? 'text';
        return strpos($type, 'select_') === 0 ? 'select' : $type;
    }

    /**
     * Map a control type to the type used for validation and storage.
     *
     * @param array<string, mixed> $option
     */
    public function logicalType(array $option): string
    {
        $type = $option['type'] ?? 'text';
        if (in_array($type, ['starttime', 'endtime'], true)) {
            return 'time';
        }
        if (in_array($type, ['latitude', 'longitude'], true)) {
            return 'text';
        }
        if (strpos($type, 'text') !== false || $type === 'password'
            || in_array($type, ['vcodec', 'pixfmt', 'timeformat', 'systemadditions'], true)) {
            return 'text';
        }
        if (strpos($type, 'integer') !== false || $type === 'daystokeep') {
            return 'integer';
        }
        if ($type === 'float' || $type === 'percent' || $type === 'sunangle') {
            return 'float';
        }
        return $type;
    }

    /**
     * Convert a value to the type stored in the settings file.
     *
     * @param array<string, mixed> $option
     * @param mixed $value
     * @return bool|int|float|string
     */
    public function normalize(array $option, $value)
    {
        $type = $this->logicalType($option);
        if ($value === '' || $value === null) {
            return '';
        }
        if ($type === 'boolean') {
            return self::bool($value);
        }
        if ($type === 'integer') {
            return (int)$value;
        }
        if ($type === 'float') {
            return (float)$value;
        }
        return (string)$value;
    }

    /**
     * Return a field error, or null when the submitted value is valid.
     *
     * @param array<string, mixed> $option
     * @param mixed $value
     */
    public function validate(array $option, $value): ?string
    {
        if (is_array($value)) {
            return 'Enter one value.';
        }
        if (($option['type'] ?? '') === 'timeformat'
            && (!is_string($value) || trim($value) === '' || strlen($value) > 200
                || preg_match('/[\x00-\x1f\x7f]/', $value))) {
            return 'Enter a date and time format of up to 200 characters.';
        }
        if ($value === '' || $value === null) {
            return self::bool($option['optional'] ?? false) || array_key_exists('default', $option)
                ? null : 'This field cannot be empty.';
        }
        $type = $this->logicalType($option);
        if ($type === 'time' && !preg_match('/^(?:(?:[01][0-9]|2[0-3]):[0-5][0-9]|sunrise|sunset|daytime_start|daytime_end|nighttime_start|nighttime_end)$/', (string)$value)) {
            return 'Enter a time in HH:MM format or a listed sun event.';
        }
        if ($type === 'integer' && !preg_match('/^[+-]?[0-9]+$/', (string)$value)) {
            return 'Enter a whole number.';
        }
        if ($type === 'float' && !is_numeric($value)) {
            return 'Enter a number.';
        }
        if ($this->control($option) === 'sunangle' && is_numeric($value)
            && ((float)$value < -90 || (float)$value > 90)) {
            return 'Enter a sun angle between -90 and 90 degrees.';
        }
        if ($type === 'boolean' && !is_bool($value)
            && !in_array((string)$value, ['true', 'false', '1', '0'], true)) {
            return 'Select Yes or No.';
        }
        if ($this->control($option) === 'select') {
            $allowed = array_map(static function ($choice) { return (string)$choice['value']; }, $option['options'] ?? []);
            if (!in_array((string)$value, $allowed, true)) {
                return 'Select a listed value.';
            }
        }
        if ($type === 'color' && !preg_match('/^#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?$/', (string)$value)) {
            return 'Enter a three or six digit hex colour.';
        }
        if (($type === 'integer' || $type === 'float') && is_numeric($value)) {
            if (isset($option['minimum']) && is_numeric($option['minimum']) && $value < $option['minimum']) {
                return 'Minimum: ' . $option['minimum'] . '.';
            }
            if (isset($option['maximum']) && is_numeric($option['maximum']) && $value > $option['maximum']) {
                return 'Maximum: ' . $option['maximum'] . '.';
            }
        }
        return null;
    }

    /**
     * Interpret the boolean values used in options and form data.
     *
     * @param mixed $value
     */
    public static function bool($value): bool
    {
        return $value === true || $value === 1 || $value === '1' || $value === 'true';
    }
}

/**
 * Evaluates the settings that control whether another setting is available.
 */
final class SettingsDependencies
{
    /** @var SettingsSchema */
    private $schema;
    /** @var SettingsStore */
    private $store;
    /** @var array<string, mixed> Submitted values used before saved values. */
    private $posted;

    /**
     * Use submitted values when checking dependencies, then fall back to saved values.
     *
     * @param array<string, mixed> $posted
     */
    public function __construct(SettingsSchema $schema, SettingsStore $store, array $posted = [])
    {
        $this->schema = $schema;
        $this->store = $store;
        $this->posted = $posted;
    }

    /**
     * Read the effective value of a controlling setting.
     *
     * @param array<string, mixed> $option
     * @return mixed
     */
    private function value(array $option)
    {
        $name = $option['name'];
        if (array_key_exists($name, $this->posted)) return $this->posted[$name];
        try {
            $value = $this->store->value($option);
            if (($value === null || $value === '') && !SettingsSchema::bool($option['optional'] ?? false)
                && array_key_exists('default', $option)) return $option['default'];
            return $value;
        } catch (RuntimeException $error) {
            return $option['default'] ?? null;
        }
    }

    /**
     * Interpret a controlling value as enabled or disabled.
     *
     * @param mixed $value
     */
    private static function truthy($value): bool
    {
        if (is_bool($value)) return $value;
        if (is_numeric($value)) return (float)$value != 0.0;
        if (!is_scalar($value)) return false;
        return !in_array(strtolower(trim((string)$value)), ['', 'false', 'no', 'off'], true);
    }

    /**
     * List the settings referenced by an option’s dependency rules.
     *
     * @param array<string, mixed> $option
     * @return array<int, string>
     */
    public static function references(array $option): array
    {
        $names = [];
        $depends = $option['metadata']['depends'] ?? [];
        foreach (['booldependson', 'booldependsoff'] as $key) {
            if (empty($depends[$key])) continue;
            foreach (preg_split('/\s+(?:AND|OR)\s+/i', trim((string)$depends[$key])) as $name) {
                if ($name !== '' && $name !== $option['name']) $names[] = $name;
            }
        }
        if (!empty($depends['valuedependson'])) {
            $parts = explode('=', (string)$depends['valuedependson'], 2);
            if (count($parts) === 2 && $parts[0] !== $option['name']) $names[] = $parts[0];
        }
        return array_values(array_unique($names));
    }

    /**
     * Check whether a named controlling setting is enabled.
     */
    private function truthySetting(string $name): bool
    {
        $option = $this->schema->find($name);
        return $option !== null && self::truthy($this->value($option));
    }

    /**
     * Check the global switch for dependency handling.
     */
    private function usesDependencies(): bool
    {
        return $this->truthySetting('settingsdependencies');
    }

    /**
     * Evaluate OR groups of AND conditions in a boolean dependency.
     *
     * References to the setting itself are skipped to avoid a circular check.
     */
    private function expressionAllows(string $expression, string $self, bool $wantOn): bool
    {
        if (trim($expression) === '') return true;
        $hasGroup = false;
        foreach (preg_split('/\s+OR\s+/i', trim($expression)) as $group) {
            $names = array_values(array_filter(preg_split('/\s+AND\s+/i', trim($group)),
                static function ($name) use ($self) { return $name !== '' && $name !== $self; }));
            if (!$names) continue;
            $hasGroup = true;
            $matches = true;
            foreach ($names as $name) {
                if ($this->truthySetting($name) !== $wantOn) {
                    $matches = false;
                    break;
                }
            }
            if ($matches) return true;
        }
        return !$hasGroup;
    }

    /**
     * Match a value against the wildcard syntax used by value dependencies.
     *
     * Asterisks match any text, pipes separate alternatives and square
     * brackets retain their character-class meaning.
     */
    private static function patternMatches(string $pattern, string $value): bool
    {
        $regex = '';
        for ($i = 0, $length = strlen($pattern); $i < $length; $i++) {
            $character = $pattern[$i];
            if ($character === '*') $regex .= '.*';
            elseif ($character === '|') $regex .= '|';
            elseif ($character === '[' && ($end = strpos($pattern, ']', $i + 1)) !== false) {
                $regex .= substr($pattern, $i, $end - $i + 1);
                $i = $end;
            } else $regex .= preg_quote($character, '/');
        }
        return preg_match('/^(?:' . $regex . ')$/i', $value) === 1;
    }

    /**
     * Check the enabled and disabled boolean dependency rules.
     *
     * @param array<string, mixed> $option
     */
    public function boolAllows(array $option): bool
    {
        if (!$this->usesDependencies()) return true;
        $name = $option['name'];
        $depends = $option['metadata']['depends'] ?? [];
        if (!$this->expressionAllows((string)($depends['booldependson'] ?? ''), $name, true)
            || !$this->expressionAllows((string)($depends['booldependsoff'] ?? ''), $name, false)) return false;
        return true;
    }

    /**
     * Check the value dependency rule for a setting.
     *
     * @param array<string, mixed> $option
     */
    public function valueAllows(array $option): bool
    {
        if (!$this->usesDependencies()) return true;
        $name = $option['name'];
        $rule = (string)($option['metadata']['depends']['valuedependson'] ?? '');
        if ($rule !== '') {
            $parts = explode('=', $rule, 2);
            if (count($parts) !== 2 || $parts[0] === $name) return false;
            $controller = $this->schema->find($parts[0]);
            if ($controller === null) return false;
            $value = $this->value($controller);
            if (!is_scalar($value) || !self::patternMatches($parts[1], (string)$value)) return false;
        }
        return true;
    }

    /**
     * Check all dependency rules for a setting.
     *
     * @param array<string, mixed> $option
     */
    public function allows(array $option): bool
    {
        return $this->boolAllows($option) && $this->valueAllows($option);
    }

    /**
     * Return controlling values needed by the browser.
     *
     * @return array<string, array{value: string}>
     */
    public function clientData(): array
    {
        $data = [];
        foreach ($this->schema->all() as $option) {
            foreach (self::references($option) as $name) {
                if (isset($data[$name])) continue;
                $controller = $this->schema->find($name);
                if ($controller === null) continue;
                $value = $this->value($controller);
                $data[$name] = ['value' => is_scalar($value) ? (string)$value : ''];
            }
        }
        return $data;
    }
}

/**
 * Reads and writes the main settings file and any external source files.
 */
final class SettingsStore
{
    /** @var string Path to the main settings file. */
    private $settingsFile;
    /** @var array<string, mixed> Current main settings. */
    private $settings;
    /** @var array<string, array<string, mixed>> Loaded source files. */
    private $sources = [];
    /** @var bool Whether the main settings need writing. */
    private $dirtySettings = false;
    /** @var array<string, bool> Source files that need writing. */
    private $dirtySources = [];

    /**
     * Keep the main settings in memory until changes are saved.
     *
     * @param array<string, mixed> $settings
     */
    public function __construct(string $file, array $settings)
    {
        $this->settingsFile = $file;
        $this->settings = $settings;
    }

    /**
     * Return the current main settings.
     *
     * @return array<string, mixed>
     */
    public function settings(): array
    {
        return $this->settings;
    }

    /**
     * Replace the in-memory settings after an external script changes them.
     *
     * @param array<string, mixed> $settings
     */
    public function replaceSettings(array $settings): void
    {
        $this->settings = $settings;
    }

    /**
     * Read a setting from its main or external source file.
     *
     * @param array<string, mixed> $option
     * @return mixed
     * @throws RuntimeException If an external source cannot be read.
     */
    public function value(array $option)
    {
        $name = $option['name'];
        if (empty($option['source'])) return $this->settings[$name] ?? null;
        $file = $this->sourcePath($option['source']);
        return $this->source($file)[$name] ?? null;
    }

    /**
     * Stage a setting in its main or external source file.
     *
     * @param array<string, mixed> $option
     * @param mixed $value
     * @throws RuntimeException If an external source cannot be read.
     */
    public function set(array $option, $value): void
    {
        $name = $option['name'];
        if (empty($option['source'])) {
            $this->settings[$name] = $value;
            $this->dirtySettings = true;
        } else {
            $file = $this->sourcePath($option['source']);
            $this->source($file);
            $this->sources[$file][$name] = $value;
            $this->dirtySources[$file] = true;
        }
    }

    /**
     * Record when the camera was last configured.
     *
     * @param string $timestampKey Name of the last-changed setting.
     */
    public function markConfigured(string $timestampKey): void
    {
        $this->settings[$timestampKey] = date(DATE_TIME_FORMAT);
        $this->dirtySettings = true;
    }

    /**
     * Stage the defaults for settings that define one.
     *
     * @param array<int, array<string, mixed>> $options
     */
    public function reset(array $options, SettingsSchema $schema): void
    {
        $this->dirtySettings = true;
        foreach ($options as $option) {
            if ($schema->isIgnored($option)) continue;
            if (!array_key_exists('default', $option)) continue;
            $this->set($option, $schema->normalize($option, $option['default']));
        }
    }

    /**
     * Write each changed settings file and report any failure.
     *
     * @param object $status Status message collector.
     */
    public function save($status): bool
    {
        $mode = JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION;
        if ($this->dirtySettings) {
            $error = updateFile($this->settingsFile, json_encode($this->settings, $mode), 'settings', true);
            if ($error !== '') {
                $status->addMessage("Failed to update settings: $error", 'danger');
                return false;
            }
        }
        foreach (array_keys($this->dirtySources) as $file) {
            $error = updateFile($file, json_encode($this->sources[$file], $mode), 'source_settings', true);
            if ($error !== '') {
                $status->addMessage("Failed to update '$file': $error", 'danger');
                return false;
            }
        }
        return true;
    }

    /**
     * Load and cache an external JSON settings file.
     *
     * @return array<string, mixed>
     * @throws RuntimeException If the file cannot be decoded.
     */
    private function source(string $file): array
    {
        if (!array_key_exists($file, $this->sources)) {
            $message = "Unable to read source file '$file'.";
            $data = get_decoded_json_file($file, true, $message);
            if (!is_array($data)) throw new RuntimeException($message);
            $this->sources[$file] = $data;
        }
        return $this->sources[$file];
    }

    /**
     * Expand supported Allsky variables in a source path.
     */
    private function sourcePath(string $path): string
    {
        $variables = [
            '${HOME}' => defined('HOME') ? HOME : '',
            '${ALLSKY_HOME}' => defined('ALLSKY_HOME') ? ALLSKY_HOME : '',
            '${ALLSKY_ENV}' => defined('ALLSKY_ENV') ? ALLSKY_ENV : '',
        ];
        return strtr($path, $variables);
    }
}

/**
 * Validates a form submission and applies its settings and service actions.
 */
final class SettingsSubmission
{
    /** @var SettingsSchema */
    private $schema;
    /** @var SettingsStore */
    private $store;
    /** @var object Status message collector. */
    private $status;
    /** @var array<string, string> Validation errors indexed by setting name. */
    public $errors = [];
    /** @var array<string, mixed> Submitted values retained for redisplay. */
    public $posted = [];
    /** @var bool Whether camera changes require further configuration. */
    public $needsConfiguration = false;
    /** @var bool Whether the page should poll service status more often. */
    public $fastStatus = false;
    /** @var bool Whether the submission finished successfully. */
    public $completed = false;

    /**
     * Connect submission handling to the schema, store and status messages.
     *
     * @param object $status Status message collector.
     */
    public function __construct(SettingsSchema $schema, SettingsStore $store, $status)
    {
        $this->schema = $schema;
        $this->store = $store;
        $this->status = $status;
    }

    /**
     * Validate a save or reset request, persist changes and run follow-up actions.
     *
     * Camera selection is handed to makeChanges.sh, while other values are
     * staged in the settings store. Validation errors stop the whole save.
     *
     * @param array<string, mixed> $post Submitted form data.
     * @param string $lastChangedName Name of the configuration timestamp.
     * @param bool $useLocalWebsite Whether a local website is configured.
     * @param bool $useRemoteWebsite Whether a remote website is configured.
     */
    public function handle(array $post, string $lastChangedName,
                           bool $useLocalWebsite, bool $useRemoteWebsite): void
    {
        if (!$post) return;
        if (!isset($post['save_settings']) && !isset($post['reset_settings'])) return;
        if (isset($post['save_settings'])) $this->posted = $post;
        if (!CSRFValidate()) {
            $this->status->addMessage('Unable to save settings - session timeout.', 'danger');
            return;
        }
        if (isset($post['reset_settings'])) {
            $this->store->reset($this->schema->all(), $this->schema);
            if ($this->store->save($this->status)) {
                $this->status->addMessage('Settings reset to default', 'info');
                $this->store->replaceSettings(readSettingsFile());
                $this->completed = true;
            }
            return;
        }

        $changes = [];
        $dependencies = new SettingsDependencies($this->schema, $this->store, $post);
        foreach ($post as $name => $value) {
            if (in_array($name, ['csrf_token', 'save_settings', 'reset_settings', 'restart',
                'page', '_ts', 'fromConfiguration', 'settings_active_category',
                'settings_active_section', 'settings_mobile_detail'], true)) continue;
            $option = $this->schema->find($name);
            if ($option !== null && $this->schema->isIgnored($option)) continue;
            if ($option === null || !$this->schema->isEditable($option)) {
                $this->errors[$name] = 'Unknown or read-only setting.';
                continue;
            }
            if (!$dependencies->allows($option)) continue;
            $error = $this->schema->validate($option, $value);
            if ($error !== null) {
                $this->errors[$name] = $error;
                continue;
            }
            $old = $this->schema->normalize($option, $this->store->value($option));
            $new = $this->schema->normalize($option, $value);
            if ($new !== $old) {
                $changes[$name] = ['option' => $option, 'old' => $old, 'new' => $new];
            }
        }
        if ($this->errors) {
            $this->status->addMessage('Settings NOT saved due to invalid fields.', 'danger');
            return;
        }
        if (!$this->validateCameraChanges($changes)) return;
        $fromConfiguration = SettingsSchema::bool($post['fromConfiguration'] ?? false);
        if (!$changes && !$fromConfiguration) {
            $this->status->addMessage("<div class='noChanges'>No settings changed. Nothing updated.</div>", 'message', true);
            $this->completed = true;
            return;
        }

        $restart = false;
        $stop = false;
        $twilight = false;
        $camera = false;
        $shellChanges = [];
        foreach ($changes as $name => $change) {
            $option = $change['option'];
            $new = $change['new'];
            if ($name === 'cameratype' && $new === 'Refresh') $new = $change['old'];
            $cameraField = in_array($name, ['cameratype', 'cameramodel', 'cameranumber'], true);
            // makeChanges.sh owns camera selection and its settings file.
            if (!$cameraField) $this->store->set($option, $new);
            $action = $option['action'] ?? 'none';
            $restart = $restart || $action === 'restart' || $action === 'reload';
            $stop = $stop || $action === 'stop';
            $camera = $camera || $cameraField;
            $twilight = $twilight || in_array($name, ['latitude', 'longitude', 'angle',
                'takedaytimeimages', 'takenighttimeimages'], true);
            if (SettingsSchema::bool($option['checkchanges'] ?? false)) {
                $shellChanges[] = [$name, $option['label'] ?? $name, $change['old'], $new];
            }
        }
        if ($fromConfiguration || $this->hasSettingsChange($changes)) {
            $this->store->markConfigured($lastChangedName);
            $restart = $restart || $fromConfiguration;
        }
        if (!$this->store->save($this->status)) return;
        $changeCount = count($changes);
        $this->status->addMessage($changeCount . ' setting' . ($changeCount === 1 ? '' : 's') . ' changed.', 'info');
        $this->needsConfiguration = false;
        if ($fromConfiguration) update_allsky_status(ALLSKY_STATUS_NOT_RUNNING);

        if ($shellChanges) {
            $args = [];
            foreach ($shellChanges as $change) {
                foreach ($change as $part) {
                    $args[] = escapeshellarg(is_bool($part) ? ($part ? 'true' : 'false') : (string)$part);
                }
            }
            $cameraOnly = isset($changes['cameratype']) ? ' --cameraTypeOnly' : '';
            $cmd = 'sudo --user=' . escapeshellarg(ALLSKY_OWNER) . ' '
                . escapeshellarg(ALLSKY_SCRIPTS . '/makeChanges.sh')
                . ' --from WebUI' . $cameraOnly . ' ' . implode(' ', $args);
            $return = null;
            if (!runCommand($cmd, '', 'success', false, '', $return)
                || $return === ALLSKY_EXIT_PARTIAL_OK) return;
            $this->store->replaceSettings(readSettingsFile());
            if (!isset($this->store->settings()[$lastChangedName])) {
                $stop = true;
                $restart = false;
                $this->needsConfiguration = true;
            }
        }
        $this->runServiceAction($restart, $stop, !empty($post['restart']));
        if (($twilight || $camera || $fromConfiguration) && ($useLocalWebsite || $useRemoteWebsite)) {
            $this->uploadWebsite($twilight, $camera, $fromConfiguration);
        }
        $this->completed = true;
    }

    /**
     * Check whether a change affects the main settings file.
     *
     * @param array<string, array<string, mixed>> $changes
     */
    private function hasSettingsChange(array $changes): bool
    {
        foreach ($changes as $name => $change) {
            if (in_array($name, ['cameratype', 'cameramodel', 'cameranumber'], true)) continue;
            if (empty($change['option']['source'])) return true;
        }
        return false;
    }

    /**
     * Require camera changes to be saved separately.
     *
     * @param array<string, array<string, mixed>> $changes
     */
    private function validateCameraChanges(array $changes): bool
    {
        $cameraNames = ['cameratype', 'cameramodel', 'cameranumber'];
        $camera = array_intersect(array_keys($changes), $cameraNames);
        $others = array_diff(array_keys($changes), $cameraNames);
        if ($camera && $others) {
            $this->status->addMessage('Camera changes must be saved separately from other settings.', 'danger');
            return false;
        }
        if (isset($changes['cameratype']) && $changes['cameratype']['new'] === 'Refresh' && count($camera) > 1) {
            $this->status->addMessage('Camera Type Refresh must be saved by itself.', 'danger');
            return false;
        }
        return true;
    }

    /**
     * Restart or stop Allsky when the changed settings require it.
     *
     * @param bool $restart Whether a changed setting requires a restart.
     * @param bool $stop Whether a changed setting requires a stop.
     * @param bool $restartChecked Whether the user requested an immediate restart.
     */
    private function runServiceAction(bool $restart, bool $stop, bool $restartChecked): void
    {
        if ($restart && $restartChecked) {
            $this->fastStatus = true;
            if (!runCommand('sudo /bin/systemctl reload-or-restart allsky.service', 'Allsky restarted.', 'success')) {
                $this->status->addMessage('Unable to restart Allsky.', 'warning');
            }
        } elseif ($stop) {
            $this->fastStatus = true;
            if (!runCommand('sudo /bin/systemctl stop allsky.service', 'Allsky stopped waiting for a manual restart.', 'success')) {
                $this->status->addMessage('Unable to stop Allsky.', 'warning');
            }
        } elseif ($restart) {
            $this->status->addMessage('Allsky needs to be restarted for your changes to take effect.', 'warning');
        }
    }

    /**
     * Send updated settings to the website and run configuration checks.
     *
     * @param bool $twilight Whether twilight data needs updating.
     * @param bool $camera Whether camera files need uploading.
     * @param bool $fromConfiguration Whether to run the initial configuration check.
     */
    private function uploadWebsite(bool $twilight, bool $camera, bool $fromConfiguration): void
    {
        $script = 'sudo --user=' . escapeshellarg(ALLSKY_OWNER) . ' '
            . escapeshellarg(ALLSKY_SCRIPTS . '/postData.sh') . ' --from WebUI';
        if (!$twilight) $script .= ' --settingsOnly';
        if ($camera) $script .= ' --allFiles';
        runCommand($script, '', 'success', false);
        if (!$fromConfiguration) return;
        $cmd = 'sudo --user=' . escapeshellarg(ALLSKY_OWNER) . ' '
            . escapeshellarg(ALLSKY_SCRIPTS . '/checkAllsky.sh') . ' --fromWebUI';
        $result = [];
        exec($cmd . ' 2>&1', $result);
        if (count($result) > 1) {
            $html = implode('<br>', $result);
            updateFile(ALLSKY_CHECK_LOG, $html, 'checkAllsky', true);
            $this->status->addMessage('Suggested changes to your settings:<br>' . $html, 'warning');
        }
    }
}

/**
 * Prepares settings data and renders the editable or read-only Twig page.
 */
final class SettingsView
{
    /** @var SettingsSchema */
    private $schema;
    /** @var SettingsStore */
    private $store;
    /** @var SettingsSubmission */
    private $submission;
    /** @var object Status message collector. */
    private $status;
    /** @var bool Whether controls must be read-only. */
    private $readonly;
    /** @var array<int, array<string, mixed>> Groups with values and validation messages. */
    private $preparedGroups = [];
    /** @var bool Whether the settings need review. */
    private $needsConfiguration;
    /** @var bool Whether the user requested review mode. */
    private $reviewRequested;
    /** @var SettingsDependencies */
    private $dependencies;

    /**
     * Set up the page using the current settings and submission state.
     *
     * @param object $status Status message collector.
     */
    public function __construct(SettingsSchema $schema, SettingsStore $store,
                                SettingsSubmission $submission, $status,
                                bool $readonly, bool $needsConfiguration, bool $reviewRequested = false)
    {
        $this->schema = $schema;
        $this->store = $store;
        $this->submission = $submission;
        $this->status = $status;
        $this->readonly = $readonly;
        $this->needsConfiguration = $needsConfiguration;
        $this->reviewRequested = $reviewRequested;
        $this->dependencies = new SettingsDependencies($schema, $store, $submission->posted);
    }

    /**
     * Escape text before adding it to an HTML status message.
     *
     * @param mixed $value
     */
    private static function escape($value): string
    {
        return htmlspecialchars((string)$value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }

    /**
     * Expand a three-digit colour or provide a safe picker fallback.
     *
     * @param mixed $value
     */
    private static function colourPickerValue($value): string
    {
        $value = (string)$value;
        if (preg_match('/^#[0-9a-fA-F]{6}$/', $value)) return $value;
        if (preg_match('/^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/', $value, $digits)) {
            return '#' . $digits[1] . $digits[1] . $digits[2] . $digits[2] . $digits[3] . $digits[3];
        }
        return '#000000';
    }

    /**
     * Choose the Twig template for a form control.
     */
    private function controlTemplate(string $type): string
    {
        $templates = [
            'select' => 'controls/select.html.twig',
            'boolean' => 'controls/boolean.html.twig',
            'vcodec' => 'controls/ffmpeg-picker.html.twig',
            'pixfmt' => 'controls/ffmpeg-picker.html.twig',
            'time' => 'controls/time-picker.html.twig',
            'starttime' => 'controls/time-picker.html.twig',
            'endtime' => 'controls/time-picker.html.twig',
            'latitude' => 'controls/position-picker.html.twig',
            'longitude' => 'controls/position-picker.html.twig',
            'color' => 'controls/colour-picker.html.twig',
            'sunangle' => 'controls/sunangle-picker.html.twig',
            'daystokeep' => 'controls/daystokeep-picker.html.twig',
            'timeformat' => 'controls/timeformat-picker.html.twig',
            'systemadditions' => 'controls/systemadditions-picker.html.twig',
            'locale' => 'controls/locale-picker.html.twig',
        ];

        return $templates[$type] ?? 'controls/input.html.twig';
    }

    /**
     * Use a submitted, saved or default value for a display preference.
     *
     * @param string $name Name of the display preference.
     * @param mixed $fallback
     * @return mixed
     */
    private function displayOptionValue(string $name, $fallback)
    {
        if (isset($this->submission->posted[$name])) {
            return $this->submission->posted[$name];
        }

        $option = $this->schema->find($name);
        if ($option === null) {
            return $fallback;
        }

        $value = $this->store->value($option);
        return $value === null ? ($option['default'] ?? $fallback) : $value;
    }

    /**
     * Attach values and validation messages to visible rows.
     */
    private function prepare(): void
    {
        $missing = [];
        $defaulted = [];
        $this->preparedGroups = $this->schema->navigation();
        foreach ($this->preparedGroups as &$group) {
            foreach ($group['sections'] as &$section) {
                $preparedRows = [];
                foreach ($section['rows'] as $row) {
                    if ($row['kind'] !== 'field') {
                        $preparedRows[] = $row;
                        continue;
                    }
                    $option = $row['option'];
                    if (!$this->schema->isVisible($option) || ($this->readonly && !empty($option['source']))) continue;
                    $name = $option['name'];
                    try {
                        $value = $this->store->value($option);
                    } catch (RuntimeException $error) {
                        $this->status->addMessage(self::escape($error->getMessage()), 'danger');
                        continue;
                    }
                    $savedValue = $value;
                    if (array_key_exists($name, $this->submission->posted) && !$this->readonly) {
                        $value = $this->submission->posted[$name];
                    } elseif ($name === 'settingslevel' && ($value === null || $value === '')) {
                        // Existing installations have no saved preference yet.
                        $value = $option['default'] ?? 'advanced';
                        $savedValue = $value;
                    }
                    $dependencyEnabled = $this->dependencies->allows($option);
                    $error = $dependencyEnabled
                        ? ($this->submission->errors[$name] ?? $this->schema->validate($option, $value)) : null;
                    $warning = '';
                    if ($dependencyEnabled && ($value === null || $value === '')
                        && !SettingsSchema::bool($option['optional'] ?? false)) {
                        if (array_key_exists('default', $option)) {
                            $value = $option['default'];
                            $warning = 'This field was empty but set to the default.';
                            $defaulted[] = $option['label'] ?? $name;
                            $error = null;
                        } else {
                            $missing[] = $option['label'] ?? $name;
                        }
                    }
                    if ($error !== null) $warning = $error;
                    $preparedRows[] = [
                        'kind' => 'field', 'option' => $option, 'value' => $value,
                        'saved_value' => $savedValue, 'warning' => $warning, 'error' => $error,
                    ];
                    if ($error !== null) $section['errors']++;
                }
                $section['rows'] = $preparedRows;
            }
            unset($section);
        }
        unset($group);
        if ($missing) {
            $this->status->addMessage('Required settings are missing: ' .
                self::escape(implode(', ', $missing)), 'danger');
        }
        if ($defaulted) {
            $this->needsConfiguration = true;
            $this->status->addMessage('Required settings are using defaults: ' .
                self::escape(implode(', ', $defaulted)), 'warning');
        }
    }

    /**
     * Render the settings page with navigation, messages and controls.
     *
     * @param string $page Page identifier used by the template.
     * @param string $action Form action URL.
     * @param string $title Page heading.
     * @param string $icon Page icon.
     * @param string $help Help-page link, if available.
     * @param string $saveLabel Text for the save button.
     */
    public function render(string $page, string $action, string $title, string $icon,
                           string $help, string $saveLabel): void
    {
        $this->prepare();
        $settings = $this->store->settings();
        $groups = $this->viewGroups();
        $reviewMode = $this->needsConfiguration || $this->readonly;
        $helpLink = '';
        if ($help !== '') {
            ob_start();
            doHelpLink(self::escape($help));
            $helpLink = ob_get_clean();
        }
        ob_start();
        $this->status->showMessages();
        $messages = ob_get_clean();
        $csrfToken = '';
        if (!$this->readonly) {
            ob_start();
            CSRFToken();
            $csrfToken = ob_get_clean();
        }
        $pickerValue = $this->displayOptionValue('settingspopupbuttons', true);
        $groupsValue = $this->displayOptionValue('settingsgroups', true);
        $showAllValue = $this->displayOptionValue('settingsshowallbydefault', false);
        $settingsLevel = $this->displayOptionValue('settingslevel', 'advanced');
        if (!in_array($settingsLevel, ['beginner', 'intermediate', 'advanced'], true)) {
            $settingsLevel = 'advanced';
        }
        if ($reviewMode) $settingsLevel = 'advanced';
        $restoreCategory = $_GET['settings_category'] ?? '';
        $restoreSection = $_GET['settings_section'] ?? '';
        if (!is_string($restoreCategory) || !preg_match('/^settings-top-tab-\d+$/', $restoreCategory)) $restoreCategory = '';
        if (!is_string($restoreSection) || !preg_match('/^settings-sub-tab-\d+-\d+$/', $restoreSection)) $restoreSection = '';
        require_once __DIR__ . '/../../vendor/autoload.php';
        $twig = new \Twig\Environment(
            new \Twig\Loader\FilesystemLoader(__DIR__ . '/../templates/settings'),
            ['autoescape' => 'html', 'cache' => false]
        );
        echo $twig->render($this->readonly ? 'page-readonly.html.twig' : 'page-editable.html.twig', [
            'page' => $page,
            'action' => $action . '?_ts=' . time() . ($this->reviewRequested ? '&review=1' : ''),
            'title' => $title,
            'icon' => $icon,
            'camera_type' => $settings['cameratype'] ?? '',
            'camera_model' => $settings['cameramodel'] ?? '',
            'save_label' => $saveLabel,
            'readonly' => $this->readonly,
            'needs_configuration' => $this->needsConfiguration,
            'help_link' => $helpLink,
            'messages' => $messages,
            'csrf_token' => $csrfToken,
            'groups' => $groups,
            'review_mode' => $reviewMode,
            'start_all_mode' => !$reviewMode && ($this->reviewRequested || SettingsSchema::bool($showAllValue)),
            'restore_category' => $restoreCategory,
            'restore_section' => $restoreSection,
            'restore_detail' => ($_GET['settings_detail'] ?? null) === '1',
            'show_view_toggle' => !$this->readonly && !$this->needsConfiguration,
            'open_error_on_mobile' => !empty($this->submission->errors),
            'dependency_data' => $this->dependencies->clientData(),
            'camera_timezone' => getAllskyChartTimezone(),
            'popup_buttons_enabled' => SettingsSchema::bool($pickerValue),
            'groups_enabled' => SettingsSchema::bool($groupsValue),
            'settings_level' => $settingsLevel,
            'status_interval' => $this->submission->fastStatus ? 2 : 20,
            'css_asset' => addAsset(['/css/vc-toggle-switch.css', '/css/settings.css']),
            'js_asset' => addAsset(['/js/leaflet/leaflet.css', '/js/leaflet/leaflet.js',
                '/js/jquery-position/jquery-position.js', '/js/jquery-ffmpeg-picker/jquery-ffmpeg-picker.js', '/js/jquery-time-picker/jquery-time-picker.js',
                '/js/jquery-locale-picker/jquery-locale-picker.js',
                '/js/jquery-sunangle-picker/solar.js', '/js/jquery-sunangle-picker/jquery-sunangle-picker.js',
                '/js/jquery-daystokeep-picker/estimate.js',
                '/js/jquery-daystokeep-picker/jquery-daystokeep-picker.js',
                '/js/jquery-timeformat-picker/jquery-timeformat-picker.js',
                '/js/jquery-filebrowser/jquery-filebrowser.js',
                '/js/jquery-systempagebuttons/jquery-systempagebuttons.js',
                '/js/settings-page.js']),
        ]);
    }

    /**
     * Return the prepared groups before adding template data.
     *
     * @return array<int, array<string, mixed>>
     */
    private function groups(): array
    {
        return $this->preparedGroups;
    }

    /**
     * Add active tabs, error counts and template rows to each group.
     *
     * @return array<int, array<string, mixed>>
     */
    private function viewGroups(): array
    {
        $groups = $this->groups();
        $activeGroup = 0;
        $hasErrorGroup = false;
        foreach ($groups as $groupIndex => &$group) {
            $group['index'] = $groupIndex;
            $group['single'] = count($group['sections']) === 1;
            $group['template'] = $group['single'] ? 'groups/single.html.twig' : 'groups/multiple.html.twig';
            if ($group['single']) {
                $sectionLabel = (string)$group['sections'][0]['label'];
                $group['single_heading'] = $sectionLabel !== '' && $sectionLabel === strip_tags($sectionLabel)
                    ? $sectionLabel : $group['label'];
            }
            $group['errors'] = array_sum(array_column($group['sections'], 'errors'));
            if ($group['errors'] && !$hasErrorGroup) {
                $activeGroup = $groupIndex;
                $hasErrorGroup = true;
            }
            $activeSection = 0;
            foreach ($group['sections'] as $sectionIndex => $section) {
                if ($section['errors']) {
                    $activeSection = $sectionIndex;
                    break;
                }
            }
            foreach ($group['sections'] as $sectionIndex => &$section) {
                $section['index'] = $sectionIndex;
                $section['active'] = $sectionIndex === $activeSection;
                $viewRows = array_map([$this, 'viewRow'], $section['rows']);
                foreach ($viewRows as $order => &$viewRow) $viewRow['order'] = $order;
                unset($viewRow);
                $section['rows'] = $this->groupRows($viewRows);
            }
            unset($section);
        }
        unset($group);
        foreach ($groups as $groupIndex => &$group) {
            $group['active'] = $groupIndex === $activeGroup;
        }
        unset($group);
        return $groups;
    }

    /**
     * Collect adjacent fields that share a named layout group.
     *
     * @param array<int, array<string, mixed>> $rows
     * @return array<int, array<string, mixed>>
     */
    private function groupRows(array $rows): array
    {
        $result = [];
        $positions = [];
        $namedGroups = [];
        foreach ($rows as $row) {
            if (($row['template'] ?? '') !== 'rows/field.html.twig') {
                $result[] = $row;
                $positions = [];
                $namedGroups = [];
                continue;
            }
            $name = $row['layout']['group'];
            if ($name === '') {
                $result[] = $row;
                continue;
            }
            if (!isset($positions[$name])) {
                $positions[$name] = count($result);
                $result[] = [
                    'template' => 'rows/group.html.twig',
                    'group_id' => $positions[$name],
                    'order' => $row['order'],
                    'label' => $row['layout']['group_name'] !== ''
                        ? $row['layout']['group_name'] : ucwords(str_replace(['_', '-'], ' ', $name)),
                    'fields' => [],
                    'hidden' => true,
                ];
            }
            $position = $positions[$name];
            $row['group_id'] = $position;
            if ($row['layout']['group_name'] !== '' && !isset($namedGroups[$name])) {
                $result[$position]['label'] = $row['layout']['group_name'];
                $namedGroups[$name] = true;
            }
            $result[$position]['fields'][] = $row;
            if (!$row['dependency']['hidden_by_value']) $result[$position]['hidden'] = false;
        }
        return $result;
    }

    /**
     * Convert a prepared row into data for its Twig template.
     *
     * Validation, dependency and layout values stay together so controls and
     * row templates can use the same state without duplicating calculations.
     *
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    private function viewRow(array $row): array
    {
        if ($row['kind'] === 'warning') {
            return ['template' => 'rows/warning.html.twig', 'label' => $row['label']];
        }
        if ($row['kind'] === 'field') {
            $option = $row['option'];
            $name = (string)$option['name'];
            $type = $this->schema->control($option);
            $value = $row['value'];
            $choices = [];
            if ($type === 'select') {
                foreach ($option['options'] ?? [] as $choice) {
                    $choices[] = [
                        'value' => $choice['value'] ?? '',
                        'label' => $choice['label'] ?? '',
                        'selected' => (string)$value === (string)($choice['value'] ?? ''),
                    ];
                }
            }
            $description = (string)($option['description'] ?? '');
            $helpContent = ($description !== '' ? '<div class="settings-help-description">' . $description . '</div>' : '')
                . $this->helpFactsHtml($option);
            $logicalType = $this->schema->logicalType($option);
            $inputType = isset($option['step']) && in_array($logicalType, ['integer', 'float'], true)
                ? 'number' : ($type === 'password' ? 'password' : 'text');
            $hasHint = isset($option['unit']) && $option['unit'] !== '';
            $baseDisabled = $this->readonly || !$this->schema->isEditable($option);
            $describedBy = [];
            if ($inputType === 'number' && $hasHint) {
                $describedBy[] = 'setting-hint-' . $name;
            }
            if ($row['warning'] !== '') {
                $describedBy[] = 'setting-feedback-' . $name;
            }

            return [
                'kind' => 'field',
                'template' => 'rows/field.html.twig',
                'control_template' => $this->controlTemplate($type),
                'name' => $name,
                'level' => in_array($option['metadata']['level'] ?? '', ['beginner', 'intermediate', 'advanced'], true)
                    ? $option['metadata']['level'] : 'advanced',
                'label' => $option['label'] ?? $name,
                'help_content' => $helpContent,
                'control' => $type,
                'action' => (string)($option['action'] ?? 'none'),
                'related_field' => in_array($type, ['time', 'starttime', 'endtime'], true)
                    ? ($option['endfield'] ?? $option['startfield'] ?? '') : '',
                'time_position' => isset($option['startfield']) ? 'end' : 'start',
                'latitude_id' => $type === 'latitude' ? $name
                    : ($type === 'sunangle' ? 'latitude' : ($option['latitudefield'] ?? '')),
                'longitude_id' => $type === 'longitude' ? $name
                    : ($type === 'sunangle' ? 'longitude' : ($option['longitudefield'] ?? '')),
                'value' => is_scalar($value) || $value === null ? $value : '',
                'colour_picker_value' => $type === 'color' ? self::colourPickerValue($value) : '',
                'saved_value' => is_bool($row['saved_value']) ? ($row['saved_value'] ? 'true' : 'false')
                    : (is_scalar($row['saved_value']) ? (string)$row['saved_value'] : ''),
                'yes' => SettingsSchema::bool($value),
                'choices' => $choices,
                'search_text' => trim(preg_replace('/\s+/', ' ', strip_tags(preg_replace('/<[^>]*>/', ' ',
                    html_entity_decode($description, ENT_QUOTES | ENT_HTML5, 'UTF-8'))))),
                'validation' => [
                    'type' => $logicalType,
                    'required' => !SettingsSchema::bool($option['optional'] ?? false)
                        && !array_key_exists('default', $option),
                    'minimum' => isset($option['minimum']) && is_numeric($option['minimum'])
                        ? $option['minimum'] : ($type === 'sunangle' ? -90 : null),
                    'maximum' => isset($option['maximum']) && is_numeric($option['maximum'])
                        ? $option['maximum'] : ($type === 'sunangle' ? 90 : null),
                    'warning' => $row['warning'],
                    'error' => $row['error'],
                    'described_by' => implode(' ', $describedBy),
                ],
                'dependency' => [
                    'base_disabled' => $baseDisabled,
                    'disabled' => $baseDisabled || !$this->dependencies->allows($option),
                    'hidden_by_value' => !$this->dependencies->valueAllows($option),
                    'bool_on' => (string)($option['metadata']['depends']['booldependson'] ?? ''),
                    'bool_off' => (string)($option['metadata']['depends']['booldependsoff'] ?? ''),
                    'value_on' => (string)($option['metadata']['depends']['valuedependson'] ?? ''),
                    'readonly' => SettingsSchema::bool($option['readonly'] ?? false),
                ],
                'layout' => [
                    'input_type' => $inputType,
                    'input_class' => $type === 'widetext' ? 'settingInputWidetext'
                        : 'settingInput settingInputTextNumber'
                            . (in_array($logicalType, ['integer', 'float'], true) ? ' settingInputNumber' : ''),
                    'step' => $option['step'] ?? null,
                    'unit' => $option['unit'] ?? null,
                    'has_hint' => $hasHint,
                    'row_class' => $row['warning'] !== ''
                        ? ($row['error'] !== null ? 'alert-danger' : 'alert-warning') : '',
                    'single_row' => SettingsSchema::bool($option['metadata']['layout']['singlerow'] ?? false),
                    'new_line' => SettingsSchema::bool($option['metadata']['layout']['newline'] ?? false),
                    'group' => trim((string)($option['metadata']['layout']['group'] ?? '')),
                    'group_name' => trim((string)($option['metadata']['layout']['groupname'] ?? '')),
                ],
            ];
        }
        if (($row['option']['type'] ?? '') === 'header-sub') {
            $label = (string)($row['option']['label'] ?? '');
            return $label !== strip_tags($label)
                ? ['template' => 'rows/warning.html.twig', 'label' => trim(strip_tags($label), " \t\n\r\0\x0B*")]
                : ['template' => 'rows/subheading.html.twig', 'label' => $label];
        }
        if (($row['option']['type'] ?? '') === 'header-column') {
            return ['template' => 'rows/columns.html.twig', 'columns' => explode(',', $row['option']['label'] ?? '')];
        }
        return ['template' => 'rows/empty.html.twig'];
    }

    /**
     * Build the concise facts shown beneath a setting's description.
     *
     * Values from the options file are escaped because this markup is passed
     * through the help button's HTML attribute before the popover displays it.
     *
     * @param array<string, mixed> $option Setting definition.
     * @return string HTML containing the default, limits and service action.
     */
    private function helpFactsHtml(array $option): string
    {
        $default = $option['default'] ?? null;
        if (is_bool($default)) $default = $default ? 'Yes' : 'No';
        if ($this->schema->control($option) === 'select') {
            foreach ($option['options'] ?? [] as $choice) {
                if ((string)($choice['value'] ?? '') === (string)$default) {
                    $default = $choice['label'] ?? $default;
                    break;
                }
            }
        }
        $facts = [['Default', $default === null || $default === '' ? 'None' : (string)$default]];
        if (isset($option['minimum'])) $facts[] = ['Minimum', (string)$option['minimum']];
        if (isset($option['maximum'])) {
            $facts[] = ['Maximum', $option['maximum'] === 'none' ? 'None' : (string)$option['maximum']];
        }
        $html = '<div class="settings-help-facts">';
        foreach ($facts as [$label, $value]) {
            $html .= '<div><span class="settings-help-facts-label">' . self::escape($label)
                . '</span><strong class="settings-help-facts-value">' . self::escape($value) . '</strong></div>';
        }
        $html .= '</div>';
        $action = $option['action'] ?? '';
        if (in_array($action, ['reload', 'restart'], true)) {
            $html .= '<p class="settings-help-action">Restart required after a change</p>';
        } elseif ($action === 'stop') {
            $html .= '<p class="settings-help-action settings-help-action-stop">Allsky will stop after a change</p>';
        }
        return $html;
    }
}
/**
 * Handle the settings route using the WebUI globals, then render its page.
 *
 * The post/redirect/get flow keeps messages and invalid values in the session.
 */
function DisplayAllskyConfig(): void
{
    global $formReadonly, $settings_array, $useLocalWebsite, $useRemoteWebsite;
    global $lastChangedName, $lastChanged, $page, $ME, $status;
    global $saveChangesLabel, $pageHeaderTitle, $pageIcon, $pageHelp;

    $optionsFile = getOptionsFile();
    $message = "ERROR: Unable to process options file '$optionsFile'.";
    $options = get_decoded_json_file($optionsFile, true, $message);
    if (!is_array($options)) return;
    if ($settings_array === null) $settings_array = readSettingsFile();

    $schema = new SettingsSchema($options);
    $store = new SettingsStore(getSettingsFile(), $settings_array);
    $submission = new SettingsSubmission($schema, $store, $status);
    $readonly = $formReadonly === 'readonly' || $formReadonly === true;
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'GET' && isset($_SESSION['settings_post_flash'])) {
        $flash = $_SESSION['settings_post_flash'];
        unset($_SESSION['settings_post_flash']);
        foreach ($flash['messages'] ?? [] as $message) $status->messages[] = $message;
        $submission->posted = $flash['posted'] ?? [];
        $submission->errors = $flash['errors'] ?? [];
        $submission->needsConfiguration = !empty($flash['needs_configuration']);
        $submission->fastStatus = !empty($flash['fast_status']);
    }
    if (!$readonly) {
        $previousMessageCount = count($status->get());
        try {
            $submission->handle($_POST, $lastChangedName,
                (bool)$useLocalWebsite, (bool)$useRemoteWebsite);
        } catch (RuntimeException $error) {
            $status->addMessage(htmlspecialchars($error->getMessage(), ENT_QUOTES, 'UTF-8'), 'danger');
        }
        if (isset($_POST['save_settings']) || isset($_POST['reset_settings'])) {
            $_SESSION['settings_post_flash'] = [
                'messages' => array_slice($status->get(), $previousMessageCount),
                'posted' => $submission->completed ? [] : $submission->posted,
                'errors' => $submission->errors,
                'needs_configuration' => $submission->needsConfiguration,
                'fast_status' => $submission->fastStatus,
            ];
            $query = ['page' => $page];
            if (($_GET['review'] ?? null) === '1') $query['review'] = '1';
            $category = $_POST['settings_active_category'] ?? '';
            $section = $_POST['settings_active_section'] ?? '';
            if (is_string($category) && preg_match('/^settings-top-tab-\d+$/', $category)) {
                $query['settings_category'] = $category;
            }
            if (is_string($section) && preg_match('/^settings-sub-tab-\d+-\d+$/', $section)) {
                $query['settings_section'] = $section;
            }
            if (($_POST['settings_mobile_detail'] ?? null) === '1') $query['settings_detail'] = '1';
            header('Location: ' . ($_SERVER['PHP_SELF'] ?? '/index.php') . '?' . http_build_query($query), true, 303);
            exit;
        }
    }
    $settings_array = $store->settings();
    $lastChanged = $settings_array[$lastChangedName] ?? '';
    $needsConfiguration = ($lastChanged === '' || $submission->needsConfiguration);
    $reviewRequested = ($_GET['review'] ?? null) === '1';
    check_if_configured($page, 'settings');
    $view = new SettingsView($schema, $store, $submission, $status, $readonly,
        $needsConfiguration, $reviewRequested);
    $view->render($page, $ME, $pageHeaderTitle, $pageIcon, $pageHelp ?? '', $saveChangesLabel);
}
