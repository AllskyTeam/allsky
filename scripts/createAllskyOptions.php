#!/usr/bin/php
<?php

require_once __DIR__ . '/functions.php';

/**
 * Build the options document and settings file for one camera.
 *
 * The source configuration file is a tree of named sections. Each section may
 * have a label, warning, settings keyed by setting name, and further sections.
 * A setting has a type and may supply a default, bounds, choices, display rule, source file,
 * and presentation metadata. The builder retains that tree and its order.
 *
 * Camera controls in cc.json provide the values behind `_min`, `_max`,
 * `_default`, and their day/night variants. Camera-level choice lists provide
 * `bin_values`, `type_values`, and `rotation_values`. Missing controls remain in
 * the options document with display=false so the settings page can still see
 * their definitions, but they are omitted from newly created settings files.
 *
 * The source configuration file and generated document share the same shape:
 * `sections` is a map keyed by stable identifiers. A section may contain a
 * `label`, a `warning`, a `settings` map keyed by saved setting name, and another `sections`
 * map. The builder resolves placeholders in setting definitions but keeps the
 * tree and its presentation metadata. The separate settings.json file is a
 * flat map of setting name to saved value; it has no section or display data.
 *
 * @phpstan-type CameraControl array{argumentName?: string, MinValue?: int|float|string|null, MaxValue?: int|float|string|null, DefaultValue?: int|float|string|bool|null}
 * @phpstan-type CameraChoice array{value: int|string, label: string}
 * @phpstan-type CameraCapabilities array{cameraType: string, cameraModel: string, cameraNumber: int|string, sensor?: string, controls?: list<CameraControl>, supportedBins?: list<CameraChoice>, supportedImageFormats?: list<CameraChoice>, supportedRotations?: list<CameraChoice>}
 * @phpstan-type SettingDefinition array{type: string, label?: string, description?: string, display?: bool|string, default?: mixed, minimum?: int|float|string, maximum?: int|float|string, options?: list<array<string, mixed>|string>, source?: string, metadata?: array<string, mixed>, step?: int|float|string, unit?: string, settingsonly?: bool, carryforward?: bool, usage?: string, action?: string, ...<string, mixed>}
 * @phpstan-type OptionSection array{label?: string, warning?: string, settings?: array<string, SettingDefinition>, sections?: array<string, OptionSection>, ...<string, mixed>}
 * @phpstan-type OptionsDocument array{sections: array<string, OptionSection>}
 */
final class AllskyOptionsBuilder
{
    /** @var CameraCapabilities Decoded cc.json for the selected camera. */
    private array $camera;
    /** @var array<string, CameraControl> Controls indexed by argumentName. */
    private array $controls = [];
    private string $connectedCamerasFile;
    private int $debug;
    /** @var array<string, true> Names already encountered in the current build. */
    private array $seen = [];
    /** @var list<string> Messages deferred until the matching field trace is printed. */
    private array $pendingMessages = [];

    /**
     * Index camera controls once so field resolution does not scan cc.json for
     * every setting. The camera number may be a string or integer in cc.json.
     *
     * `cameraType`, `cameraModel`, and `cameraNumber` identify the camera and
     * are required by the CLI. `sensor` distinguishes Raspberry Pi variants.
     * Each `controls` entry names a capture argument and supplies its bounds
     * and default. The three supported-choice lists use value/label pairs for
     * the bin, image format, and rotation selectors respectively.
     *
     * @param CameraCapabilities $camera Capabilities supplied by the capture program.
     * @param string|null $connectedCamerasFile Tab-separated camera inventory;
     *        null selects the installation's standard file.
     * @param int $debug Zero for normal output, one for file actions, two for
     *        the field-by-field trace used by the release script.
     */
    public function __construct(array $camera, ?string $connectedCamerasFile = null, int $debug = 0)
    {
        $this->camera = $camera;
        foreach ($camera['controls'] ?? [] as $control) {
            if (isset($control['argumentName'])) {
                $this->controls[$control['argumentName']] = $control;
            }
        }
        $this->connectedCamerasFile = $connectedCamerasFile
            ?? dirname(__DIR__) . '/config/connected_cameras.txt';
        $this->debug = $debug;
    }

    /**
     * Resolve the source configuration against this camera without flattening sections.
     *
     * Each section is keyed by a stable identifier and may contain `label`,
     * `warning`, `settings`, and nested `sections`. Settings are keyed by their
     * saved name. Each definition must have a `type`; optional keys include
     * `display`, `default`, `minimum`, `maximum`, `options`, `source`, and
     * `metadata`. The output keeps the same tree, resolves camera placeholders,
     * and adds inferred `step` and `unit` values where appropriate.
     *
     * `default`, `minimum`, and `maximum` may contain camera placeholders.
     * `options` may mix fixed choices with a camera choice token. `source`
     * identifies a setting stored outside settings.json; `settingsonly` marks a
     * setting used by the internal settings tools. Other keys, including
     * `carryforward` and `metadata`, pass through unchanged.
     *
     * @param OptionsDocument $sourceConfig Decoded options.json.repo document.
     * @return OptionsDocument Resolved document, ready for options.json.
     * @throws RuntimeException If the tree or a setting definition is invalid.
     */
    public function build(array $sourceConfig): array
    {
        if (!isset($sourceConfig['sections'])) {
            throw new RuntimeException('Repository must contain a sections object.');
        }
        if (!is_array($sourceConfig['sections'])) {
            throw new RuntimeException('Repository sections must be an object.');
        }
        $this->seen = [];
        $this->pendingMessages = [];
        return ['sections' => $this->enrichSections($sourceConfig['sections'])];
    }

    /**
     * Walk a section map in source file order, resolving its settings in place.
     * The depth and path are used only for the legacy debug trace; neither is
     * written into the options document.
     *
     * @param array<string, OptionSection> $sections Named source configuration sections.
     * @param int $depth Zero for a top-level category.
     * @param string $path Dot-separated parent section identifiers.
     * @return array<string, OptionSection> Resolved sections in the same order.
     */
    private function enrichSections(array $sections, int $depth = 0, string $path = ''): array
    {
        $result = [];
        foreach ($sections as $key => $section) {
            if (!is_array($section)) {
                throw new RuntimeException("Invalid repository section '$key'.");
            }
            $sectionPath = $path === '' ? (string)$key : "$path.$key";
            $label = $section['label'] ?? $key;
            $headingType = $depth === 0 ? 'header-tab' : ($depth === 1 ? 'header' : 'header-sub');
            $this->logHeading("section:$sectionPath", $label, $headingType);
            $built = [];
            foreach ($section as $field => $value) {
                if ($field === 'sections') {
                    if (!is_array($value)) throw new RuntimeException("Invalid subsections in '$key'.");
                    $built[$field] = $this->enrichSections($value, $depth + 1, $sectionPath);
                } elseif ($field === 'settings') {
                    if (!is_array($value)) throw new RuntimeException("Invalid settings in '$key'.");
                    if ($depth === 0) {
                        $this->logHeading("section:$sectionPath:fields", $label, 'header');
                    }
                    if (!empty($section['warning'])) {
                        $warning = htmlspecialchars((string)$section['warning'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
                        $warningHtml = "<div class='panel panel-danger' style='margin-bottom: 0'><div class='panel-heading'>$warning</div></div>";
                        $this->logHeading("section:$sectionPath:warning", $warningHtml, 'header-sub');
                    }
                    $built[$field] = [];
                    foreach ($value as $name => $definition) {
                        $built[$field][$name] = $this->enrichSetting($name, $definition);
                    }
                } else {
                    $built[$field] = $value;
                }
            }
            $result[$key] = $built;
        }
        return $result;
    }

    /**
     * Log a section heading without adding a synthetic field to the document.
     *
     * @param mixed $label Section label; warning headings contain escaped HTML.
     */
    private function logHeading(string $name, $label, string $type): void
    {
        $heading = ['name' => $name, 'label' => $label, 'type' => $type];
        $this->logField($heading, $heading);
    }

    /**
     * Resolve one setting and add the step and unit hints used by the WebUI.
     *
     * The setting name comes from the key in `settings`, not from a `name`
     * property. Duplicate names are rejected across the whole source file.
     * Metadata is kept last to retain the generated file's established order.
     *
     * @param string|int $name Key from a section's settings map.
     * @param SettingDefinition $definition Definition with at least `type`.
     * @return SettingDefinition Definition without a redundant `name` field.
     */
    private function enrichSetting($name, $definition): array
    {
        if (!is_string($name) || $name === '' || !is_array($definition)
            || isset($definition['name']) || isset($this->seen[$name])) {
            throw new RuntimeException("Invalid repository setting '$name'.");
        }
        $this->seen[$name] = true;
        $raw = ['name' => $name] + $definition;
        $option = $this->resolveCameraOption($raw);
        $this->logField($raw, $option);
        unset($option['name']);

        if (!isset($option['step'])) {
            $step = self::numericStep($option);
            if ($step !== null) $option['step'] = $step;
        }
        if (isset($option['step']) && !isset($option['unit'])) {
            $unit = self::numericUnit($name);
            if ($unit !== null) $option['unit'] = $unit;
        }
        if (array_key_exists('metadata', $option)) {
            $metadata = $option['metadata'];
            unset($option['metadata']);
            $option['metadata'] = $metadata;
        }
        return $option;
    }

    /**
     * Reproduce the release generator's field trace and flush queued messages.
     *
     * Warnings from choice resolution are queued so they appear at the point
     * where the former flat generator printed its `options` field.
     *
     * @param SettingDefinition&array{name: string} $raw Source definition with its key attached.
     * @param SettingDefinition&array{name: string} $resolved Camera-specific definition.
     */
    private function logField(array $raw, array $resolved): void
    {
        if ($this->debug < 2) {
            $this->flushMessages();
            return;
        }
        $name = $raw['name'];
        echo "Processing setting [$name]: ";
        if (($raw['display'] ?? null) === false
            || (($raw['display'] ?? null) === '_display' && ($resolved['display'] ?? true) === false)) {
            if (($raw['display'] ?? null) === false) {
                echo "    'display' field is false; skipping\n";
            } else {
                echo "\n$name: <<<<< NOT SUPPORTED >>>>>\n";
            }
            $this->flushMessages();
            return;
        }
        echo "\n";
        $fields = str_starts_with((string)($raw['type'] ?? ''), 'header')
            ? ['label', 'type']
            : (($raw['settingsonly'] ?? false) === true
                ? ['label', 'label_prefix', 'default', 'type']
                : ['minimum', 'maximum', 'default', 'description', 'label', 'label_prefix',
                    'type', 'usage', 'carryforward', 'options', 'source', 'action']);
        foreach ($fields as $field) {
            if ($field === 'options') {
                $this->flushMessages();
                continue;
            }
            if (!array_key_exists($field, $raw)) continue;
            if ($field === 'default' && ($raw['type'] ?? '') === 'boolean') continue;
            $value = in_array($name, ['camera', 'camerainfo'], true) && $field === 'default'
                ? ($resolved[$field] ?? $raw[$field]) : $raw[$field];
            if (!is_string($value) || is_numeric($value)) continue;
            $shown = strlen($value) > 50 ? substr($value, 0, 50) . '...' : $value;
            echo "    $field: $shown";
            if (isset($resolved[$field]) && $resolved[$field] !== $value
                && preg_match('/^(?:_|day_|night_)(?:min|max|default)$/', $value)) {
                echo ", RESET v='{$resolved[$field]}'";
            }
            echo "\n";
        }
        $this->flushMessages();
    }

    /** Emit queued choice and camera inventory messages in insertion order. */
    private function flushMessages(): void
    {
        foreach ($this->pendingMessages as $message) echo $message;
        $this->pendingMessages = [];
    }

    /**
     * Infer a spinner increment without discarding precision in camera bounds.
     *
     * @param array{type?: string, minimum?: mixed, maximum?: mixed, default?: mixed} $option
     */
    private static function numericStep(array $option): ?string
    {
        $type = $option['type'] ?? '';
        if ($type === 'integer') {
            return '1';
        }
        if ($type !== 'float' && $type !== 'percent') {
            return null;
        }

        $precision = 1;
        if (isset($option['minimum'], $option['maximum'])
            && is_numeric($option['minimum']) && is_numeric($option['maximum'])
            && (float)$option['maximum'] - (float)$option['minimum'] <= 1) {
            $precision = 2;
        }
        foreach (['minimum', 'maximum', 'default'] as $key) {
            if (!isset($option[$key]) || !is_numeric($option[$key])) {
                continue;
            }
            if (preg_match('/\.([0-9]+)/', (string)$option[$key], $matches)) {
                $precision = max($precision, strlen(rtrim($matches[1], '0')));
            }
        }
        return '0.' . str_repeat('0', $precision - 1) . '1';
    }

    /** Return a display unit only for setting names with an unambiguous meaning. */
    private static function numericUnit(string $name): ?string
    {
        if (preg_match('/(?:exposure|delay)$/', $name) || $name === 'fieldhelpdelay') {
            return 'ms';
        }
        if ($name === 'angle') {
            return '°';
        }
        if (preg_match('/^(?:thumbnailsize|imageresize|imagecrop|timelapse(?:width|height)|minitimelapse(?:width|height)|keogramfontsize|keogramlinethickness)/', $name)) {
            return 'px';
        }
        if (preg_match('/bitrate$/', $name)) return 'kbit/s';
        if (preg_match('/fps$/', $name)) return 'fps';
        if (preg_match('/^daystokeep/', $name)) return 'days';
        if (preg_match('/skipframes$/', $name)) return 'frames';
        if (preg_match('/(?:numimages|frequency|uploadfrequency)$/', $name)) return 'images';
        return null;
    }

    /**
     * Replace camera placeholders and expand camera-specific choice lists.
     *
     * Generic placeholders such as `_min` use the control name without a
     * `day` or `night` prefix. Day/night placeholders use the full setting
     * name. If a required capability is absent, the setting remains in the
     * document with `display=false` and the unresolved bound is removed.
     *
     * @param SettingDefinition&array{name: string} $option Source definition with its key attached.
     * @return SettingDefinition&array{name: string} Resolved definition, still including `name`.
     */
    private function resolveCameraOption(array $option): array
    {
        $name = $option['name'];
        $generic = preg_replace('/^(day|night)/', '', $name);
        if (($option['display'] ?? null) === '_display') {
            $option['display'] = isset($this->controls[$generic]);
        }

        foreach (['minimum' => 'MinValue', 'maximum' => 'MaxValue', 'default' => 'DefaultValue'] as $field => $cameraField) {
            $value = $option[$field] ?? null;
            if (!is_string($value) || !preg_match('/^(?:_|day_|night_)(?:min|max|default)$/', $value)) continue;
            $controlName = str_starts_with($value, '_') ? $generic : $name;
            if (array_key_exists($cameraField, $this->controls[$controlName] ?? [])) {
                $option[$field] = $this->controls[$controlName][$cameraField];
            } else {
                unset($option[$field]);
                $option['display'] = false;
            }
        }

        if ($name === 'camera' || $name === 'camerainfo') {
            $type = $this->camera['cameraType'] ?? '';
            $model = $this->camera['cameraModel'] ?? '';
            $option['default'] = $name === 'camera'
                ? trim("$type $model")
                : $this->cameraInfo($type, $this->camera['cameraNumber'] ?? 0, $model,
                    $type === 'RPi' ? ($this->camera['sensor'] ?? '') : '');
        }

        if (isset($option['options']) && is_array($option['options'])) {
            $resolved = [];
            foreach ($option['options'] as $choice) {
                if (!is_string($choice) || !str_ends_with($choice, '_values')) {
                    $resolved[] = $choice;
                    continue;
                }
                $choices = $this->cameraChoices($choice);
                if ($choices === null) {
                    $option['display'] = false;
                    continue;
                }
                array_push($resolved, ...$choices);
            }
            $option['options'] = $resolved;
        }
        return $option;
    }

    /**
     * Return choices for a camera list token such as `bin_values`.
     *
     * Missing lists return null, which makes the setting unavailable. Invalid
     * entries are omitted and reported using the release script's wording.
     *
     * @return list<array<string, mixed>>|null Null when the camera has no such list.
     */
    private function cameraChoices(string $placeholder): ?array
    {
        $field = [
            'bin_values' => 'supportedBins',
            'type_values' => 'supportedImageFormats',
            'rotation_values' => 'supportedRotations',
        ][$placeholder] ?? null;
        if ($placeholder === 'camerainfo_values') return $this->cameraInfoChoices();
        if ($field === null) throw new RuntimeException("Unknown options placeholder '$placeholder'.");
        $name = substr($placeholder, 0, -7);
        $choices = $this->camera[$field] ?? null;
        if ($choices === null) {
            $this->pendingMessages[] = "ERROR: Could not find '$field' for field '$name'.\n";
            return null;
        }
        if (!is_array($choices)) return null;
        $valid = [];
        foreach ($choices as $choice) {
            if (!is_array($choice)) {
                $this->pendingMessages[] = "ERROR: Field '$name': '$field' not an array, is '$choice'.";
                continue;
            }
            $valid[] = $choice;
        }
        return $valid;
    }

    /**
     * Build the camera selector from connected_cameras.txt.
     *
     * Each inventory row is tab separated: marker, type, number, sensor,
     * module length, and model. The current camera is inserted if the inventory
     * omits it, followed by the Refresh choice.
     *
     * @return list<array{value: string, label: string}>
     */
    private function cameraInfoChoices(): array
    {
        $choices = [];
        $lines = @file($this->connectedCamerasFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if ($lines === false) {
            $this->pendingMessages[] = "WARNING: Unable to read '{$this->connectedCamerasFile}'; only the current camera is listed.\n";
            $lines = [];
        }
        foreach ($lines as $line) {
            $parts = explode("\t", $line);
            if (count($parts) < 6 || $parts[0] !== 'camera') continue;
            [$type, $number, $sensor, , $model] = array_slice($parts, 1, 5);
            $sensor = $type === 'RPi' ? $sensor : '';
            $choices[] = [
                'value' => $this->cameraInfo($type, $number, $model, $sensor),
                'label' => trim("$type  $model" . ($sensor !== '' ? "  [$sensor]" : '')),
            ];
        }
        $type = $this->camera['cameraType'] ?? '';
        $model = $this->camera['cameraModel'] ?? '';
        $sensor = $type === 'RPi' ? ($this->camera['sensor'] ?? '') : '';
        $current = $this->cameraInfo($type, $this->camera['cameraNumber'] ?? 0, $model, $sensor);
        if (!in_array($current, array_column($choices, 'value'), true)) {
            array_unshift($choices, [
                'value' => $current,
                'label' => trim("$type  $model" . ($sensor !== '' ? "  [$sensor]" : '')) . '  (not connected)',
            ]);
        }
        $choices[] = ['value' => 'Refresh', 'label' => 'Refresh'];
        return $choices;
    }

    /** Format the camera identifier stored by the `camerainfo` setting. */
    private function cameraInfo(string $type, string|int $number, string $model, string $sensor): string
    {
        return "$type;$number;$model" . ($sensor !== '' ? ";$sensor" : '');
    }

    /**
     * Collect settings stored in settings.json, in section order.
     *
     * Settings with `display=false` or a separate `source` file are excluded.
     * When a prior settings file is supplied, its values take precedence over
     * defaults for matching names. The result is a flat name-to-value map.
     *
     * @param array<string, OptionSection> $sections Resolved options sections.
     * @param array<string, mixed>|null $previous Values from the prior settings file.
     * @param array<string, mixed> $settings Collected values, updated in place.
     */
    private static function appendSettings(array $sections, $previous, array &$settings): void
    {
        foreach ($sections as $section) {
            foreach ($section['settings'] ?? [] as $name => $option) {
                if (!empty($option['source']) || ($option['display'] ?? true) === false) continue;
                $value = $previous !== null ? ($previous[$name] ?? null) : ($option['default'] ?? '');
                if (($option['type'] ?? '') === 'boolean') $value = $value == 'true';
                $settings[$name] = $value;
            }
            self::appendSettings($section['sections'] ?? [], $previous, $settings);
        }
    }

    /**
     * Create or reuse camera settings, then link the generic settings path to them.
     *
     * A camera-specific file is reused unless `force` is set. If it exists and
     * regeneration is forced, values from the current generic settings file
     * take precedence over defaults. A new camera file starts from defaults.
     * Fields stored in separate source files and unavailable camera controls
     * are omitted. No end marker is added to new settings files.
     *
     * @param string $settingsFile Generic settings path, normally settings.json.
     * @param OptionsDocument $options Document returned by build().
     * @param bool $force Regenerate an existing camera-specific file.
     * @throws RuntimeException With the release script's exit code on a file error.
     */
    public function updateCameraSettings(string $settingsFile, array $options, bool $force): void
    {
        $parts = explode('.', basename($settingsFile));
        if (count($parts) !== 2) throw new RuntimeException("invalid name: '$settingsFile'", 7);

        $cameraType = (string)$this->camera['cameraType'];
        $cameraModel = str_replace(' ', '_', (string)$this->camera['cameraModel']);
        $specificName = "{$parts[0]}_{$cameraType}_{$cameraModel}.{$parts[1]}";
        $specificFile = dirname($settingsFile) . '/' . $specificName;
        $specificExists = file_exists($specificFile);
        $previous = null;
        if ($this->debug > 0) {
            if ($this->debug > 1) echo "\n";
            echo 'Camera-specific settings file exists (' . ($specificExists ? 'yes' : 'no') . "): $specificFile.\n";
        }

        if (file_exists($settingsFile)) {
            if ($specificExists) {
                $previous = get_decoded_json_file($settingsFile, true,
                    "ERROR: Unable to process prior settings file '$settingsFile'.");
            }
            if ($this->debug > 0) echo "Removing $settingsFile.\n";
            if (!unlink($settingsFile)) throw new RuntimeException("Unable to delete $settingsFile.", 8);
        }

        if ($force || !$specificExists) {
            $settings = [];
            self::appendSettings($options['sections'], $previous, $settings);
            $json = json_encode($settings, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES
                | JSON_NUMERIC_CHECK | JSON_PRESERVE_ZERO_FRACTION | JSON_THROW_ON_ERROR);
            if ($this->debug > 0) echo "Creating camera-specific settings file: $specificFile.\n";
            $error = updateFile($specificFile, $json, $specificName, true);
            if ($error !== '') throw new RuntimeException("Unable to create $specificFile.", 9);
        } elseif ($this->debug > 0) {
            echo "Using existing $specificFile.\n";
        }

        if ($this->debug > 0) echo "Linking $specificFile to $settingsFile.\n";
        if (!link($specificFile, $settingsFile)) {
            throw new RuntimeException("Unable to link $specificFile to $settingsFile.", 10);
        }
    }

    /**
     * Write the hierarchical options document at the caller's chosen path.
     *
     * The existing updateFile() helper preserves the WebUI permissions fallback.
     * Its error message is converted to the release script's exit code 6.
     *
     * @param string $path Destination supplied by --options-file.
     * @param OptionsDocument $contents Document returned by build().
     * @throws RuntimeException If the file cannot be encoded or written.
     */
    public function writeGeneratedOptions(string $path, array $contents): void
    {
        $json = json_encode($contents, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES
            | JSON_UNESCAPED_UNICODE | JSON_PRESERVE_ZERO_FRACTION | JSON_THROW_ON_ERROR) . "\n";
        $error = updateFile($path, $json, basename($path), true);
        if ($error !== '') throw new RuntimeException("Unable to create $path.", 6);
    }
}

/**
 * CLI entry point. Shell callers consume stdout and the exit status, so keep
 * diagnostic wording and exit codes aligned with the release generator.
 * The options path comes from --options-file; settings creation is optional.
 */
if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) {
    try {
        $args = getopt('', ['cc-file:', 'repo-file:', 'options-file:', 'settings-file:',
            'connected-cameras-file:', 'force', 'debug', 'debug2', 'help']);
        $debug = 0;
        foreach ($args as $name => $value) {
            if ($debug > 1) echo "   Argument $name $value\n";
            if ($name === 'debug') $debug++;
            elseif ($name === 'debug2') $debug = 2;
        }
        if (isset($args['help']) || !isset($args['cc-file'], $args['options-file'])) {
            echo "\nUsage: " . basename($argv[0])
                . " [--debug] [--debug2] [--help] [--settings-file file] --cc-file file --options-file file\n";
            exit(1);
        }
        $root = dirname(__DIR__);
        $cameraFile = $args['cc-file'];
        $optionsFile = $args['options-file'];
        $repoFile = $args['repo-file'] ?? "$root/config_repo/" . basename($optionsFile) . '.repo';
        if (!file_exists($cameraFile)) {
            echo "ERROR: Camera capabilities file $cameraFile does not exist!\n";
            echo "Run 'install.sh --update' to create it.\n";
            exit(2);
        }
        if (!file_exists($repoFile)) {
            echo "ERROR: Template options file $repoFile does not exist!\n";
            exit(3);
        }
        $camera = get_decoded_json_file($cameraFile, true,
            "ERROR: Unable to process cc file '$cameraFile'.");
        if ($camera === null) exit(4);
        $validCamera = true;
        foreach (['cameraType', 'cameraModel', 'cameraNumber'] as $required) {
            if (!isset($camera[$required]) || $camera[$required] === '') {
                echo "ERROR: $required empty in cc_array!\n";
                $validCamera = false;
            }
        }
        if (!$validCamera) exit(5);
        if ($debug > 0) echo "cameraType={$camera['cameraType']}, cameraModel={$camera['cameraModel']}\n";
        $sourceConfig = get_decoded_json_file($repoFile, true,
            "ERROR: Unable to process template options file '$repoFile'.");
        if ($sourceConfig === null) exit(5);
        $builder = new AllskyOptionsBuilder($camera, $args['connected-cameras-file'] ?? null, $debug);
        $options = $builder->build($sourceConfig);
        $builder->writeGeneratedOptions($optionsFile, $options);
        if (!empty($args['settings-file'])) {
            $builder->updateCameraSettings($args['settings-file'], $options, isset($args['force']));
        }
    } catch (Throwable $error) {
        echo "ERROR: {$error->getMessage()}\n";
        exit($error->getCode() ?: 5);
    }
}
