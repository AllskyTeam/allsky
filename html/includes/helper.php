<?php
declare(strict_types=1);

/**
 * Renders the WebUI helper tools from config/helpers.json.
 *
 * Helper tools all follow the same basic flow:
 *  - render a panel with optional explanatory content,
 *  - render an optional input form,
 *  - send an AJAX request to helperutils.php,
 *  - display either direct command output or the tabbed image/output view.
 *
 * The renderer owns the page-building side of that process.  The execution side
 * lives in HELPERSUTIL, but both use this class to read the same helper
 * configuration so new helper tools can be added by editing JSON rather than
 * creating another bespoke PHP page.
 *
 * Expected helper config shape, abbreviated:
 *
 * {
 *   "title": "Menu label",
 *   "pageTitle": "Panel heading",
 *   "icon": "fa ...",
 *   "action": "HelperRun",
 *   "method": "POST",
 *   "autoRun": false,
 *   "outputFormat": "text|html",
 *   "showResultsTabs": true,
 *   "contentHtml": ["<p>...</p>"],
 *   "fields": [
 *     {
 *       "name": "input_directory",
	 *       "label": "Use images from",
	 *       "type": "text|checkbox",
	 *       "type": {"name": "number", "min": 1, "step": 1},
	 *       "type": {"name": "numberseries", "numberType": "float", "step": 0.03, "count": 8},
	 *       "type": {"name": "imagepicker", "topLevelFoldersOnly": true},
	 *       "type": {"name": "directorybrowser", "baseFolder": "{ALLSKY_IMAGES}", "maxDepth": 1},
 *       "default": "literal value or dynamic default descriptor",
 *       "helpHtml": "Shown below the input",
 *       "args": [{"flag": "--input"}]
 *     }
 *   ],
 *   "submit": {"name": "startrails", "label": "Create Startrails"},
 *   "commandButton": [{
 *     "label": "Get Startrails Info",
 *     "helpText": "Show previous startrails brightness data.",
 *     "modalTitle": "Startrails Info",
 *     "command": ["get_startrails_info"],
 *     "outputFormat": "text"
 *   }]
 * }
 */
class HelperPageRenderer
{
	/** Helper ID after alias resolution, for example "startrails_settings". */
	private string $helperId;

	/** The config block for the selected helper, or null if the helper is unknown. */
	private ?array $helper;

	/** Runtime replacement values for placeholders used in configured HTML. */
	private array $context;

	/** Cached decoded config/helpers.json for the current request. */
	private static ?array $config = null;

	/**
	 * @param string|null $helperId Helper ID from index.php compatibility routes.
	 *                              If omitted, $_GET['helper'] is used.
	 */
	public function __construct(?string $helperId = null)
	{
		$this->helperId = self::resolveHelperId($helperId ?? ($_GET['helper'] ?? ''));
		$this->helper = self::getHelperConfig($this->helperId);
		$this->context = [
			'{timelapseWhen}' => $this->timelapseInputDirectoryInfo()['when'],
		];
	}

	/**
	 * Return every configured helper, keyed by helper ID.
	 *
	 * Used by index.php to build the Helper Tools menu from the same JSON file
	 * that drives page rendering.
	 */
	public static function configuredHelpers(): array
	{
		return self::loadConfig()['helpers'];
	}

	/**
	 * Return a single helper config block.
	 */
	public static function getHelperConfig(string $helperId): ?array
	{
		$helper = self::configuredHelpers()[$helperId] ?? null;

		return is_array($helper) ? $helper : null;
	}

	/**
	 * Resolve legacy page names or aliases to canonical helper IDs.
	 */
	public static function resolveHelperId(?string $helperId): string
	{
		$helperId = trim((string) $helperId);
		$aliases = self::aliases();

		return $aliases[$helperId] ?? $helperId;
	}

	/**
	 * Write the helper page HTML.
	 */
	public function render(): void
	{
		if ($this->helper === null) {
			echo $this->renderUnknownHelper();
			return;
		}

		$this->updatePageGlobals();
		echo $this->renderPanel();
	}

	/**
	 * Keep the existing WebUI globals in sync with the selected helper.
	 *
	 * index.php owns these globals and uses them for page chrome.  This renderer
	 * updates them so a generic page=helper route still gets the helper-specific
	 * panel title and icon.
	 */
	private function updatePageGlobals(): void
	{
		global $pageHeaderTitle, $pageIcon;

		// "headerTitle" is the old key.  Keep it as a fallback for existing configs.
		$pageHeaderTitle = (string) ($this->helper['pageTitle'] ?? $this->helper['headerTitle'] ?? $this->helper['title'] ?? $pageHeaderTitle);
		$pageIcon = (string) ($this->helper['icon'] ?? $pageIcon);
	}

	/**
	 * Render the outer Allsky panel.
	 */
	private function renderPanel(): string
	{
		global $pageHeaderTitle, $pageIcon;

		return ''
			. "<div class='panel panel-allsky'>"
			. "<div class='panel-heading'><i class='" . $this->e($pageIcon) . "'></i> " . $this->e($pageHeaderTitle) . "</div>"
			. "<div class='panel-body'>"
			. $this->renderNotices()
			. $this->renderContent()
			. "<br>"
			. $this->renderToolPage()
			. $this->renderAssets()
			. "</div>"
			. "</div>";
	}

	/**
	 * Render the wrapper consumed by helpers_tool.js.
	 *
	 * The data-* attributes are intentionally config-driven.  The JavaScript only
	 * needs to know where to send the request, whether to auto-run, how to display
	 * output, and which helper ID to include in the AJAX request.
	 */
	private function renderToolPage(): string
	{
		$attrs = [
			'class' => 'js-helper-tool-page',
			'data-endpoint' => 'includes/helperutils.php',
			'data-request' => $this->getAction(),
			'data-helper' => $this->helperId,
			'data-method' => $this->getString('method', 'POST'),
			'data-auto-run' => !empty($this->helper['autoRun']) ? 'true' : 'false',
			'data-output-format' => $this->getString('outputFormat', 'text'),
			'data-running-message' => $this->getMessage('running', 'Running helper...'),
			'data-working-message' => $this->getMessage('working', 'Working...'),
			'data-running-button-label' => $this->getMessage('runningButton', 'Running...'),
			'data-run-command-request' => $this->hasCommandButton() ? 'HelperCommandRun' : '',
		];

		return ''
			. '<div ' . $this->attrs($attrs) . '>'
			. ($this->useTabbedToolPage() ? $this->renderTabbedToolPage() : $this->renderForm() . $this->renderResultContainers())
			. $this->renderCommandModal()
			. '</div>';
	}

	/**
	 * Render helpers with Settings, Images, and Output as sibling tabs.
	 */
	private function renderTabbedToolPage(): string
	{
		$id = $this->e($this->helperId);

		return ''
			. "<ul class='nav nav-tabs helper-results-tabs js-helper-results-tabs' id='{$id}-tabs' role='tablist'>"
			. "<li role='presentation' class='active js-helper-settings-tab-item' id='{$id}-settings-tab-item'>"
			. "<a href='#{$id}-settings-pane' class='js-helper-settings-tab' id='{$id}-settings-tab' aria-controls='{$id}-settings-pane' role='tab' data-toggle='tab'>Settings</a>"
			. '</li>'
			. "<li role='presentation' class='js-helper-results-tab-item' id='{$id}-results-tab-item'>"
			. "<a href='#{$id}-results-pane' class='js-helper-results-tab' id='{$id}-results-tab' aria-controls='{$id}-results-pane' role='tab' data-toggle='tab'>Results</a>"
			. '</li>'
			. "<li role='presentation' class='js-helper-images-tab-item' id='{$id}-images-tab-item'>"
			. "<a href='#{$id}-images-pane' class='js-helper-images-tab' id='{$id}-images-tab' aria-controls='{$id}-images-pane' role='tab' data-toggle='tab'><span class='js-helper-images-tab-label'>Images</span></a>"
			. '</li>'
			. "<li role='presentation' class='js-helper-output-tab-item' id='{$id}-output-tab-item'>"
			. "<a href='#{$id}-output-pane' class='js-helper-output-tab' id='{$id}-output-tab' aria-controls='{$id}-output-pane' role='tab' data-toggle='tab'><span class='js-helper-output-tab-label'>Output</span></a>"
			. '</li>'
			. '</ul>'
			. "<div class='tab-content helper-results-content js-helper-results-content' id='{$id}-tab-content'>"
			. "<div role='tabpanel' class='tab-pane active' id='{$id}-settings-pane'>" . $this->renderForm() . '</div>'
			. "<div role='tabpanel' class='tab-pane' id='{$id}-results-pane'><pre class='helper-output js-helper-results-output' id='{$id}-results-output'></pre></div>"
			. "<div role='tabpanel' class='tab-pane' id='{$id}-images-pane'><div class='js-helper-images' id='{$id}-images-container'></div></div>"
			. "<div role='tabpanel' class='tab-pane' id='{$id}-output-pane'><pre class='helper-output js-helper-output' id='{$id}-output'></pre></div>"
			. '</div>';
	}

	/**
	 * Render the helper form.
	 *
	 * Even auto-run helpers with no visible fields still need a form: the shared
	 * JavaScript serializes it and uses it as the common submit/autoload trigger.
	 */
	private function renderForm(): string
	{
		$formClass = $this->useTabbedToolPage() ? 'form-horizontal' : '';
		$formId = $this->helperId . '-form';

		// CSRFToken() echoes markup, so capture it instead of mixing echo with strings.
		ob_start();
		CSRFToken();
		$csrf = ob_get_clean();

		return ''
			. '<form ' . $this->attrs([
				'role' => 'form',
				'id' => $formId,
				'class' => trim($formClass . ' js-helper-form'),
			]) . '>'
			. $csrf
			. "<input type='hidden' name='helper' value='" . $this->e($this->helperId) . "'>"
			. $this->renderFields()
			. $this->renderFooter()
			. $this->renderSubmit()
			. '</form>';
	}

	/**
	 * Render every configured field in order.
	 */
	private function renderFields(): string
	{
		$html = '';
		$fields = $this->helper['fields'] ?? [];

		if (count($fields) === 0 && $this->useTabbedToolPage()) {
			return ''
				. "<div class='helper-no-settings'>"
				. "<div class='helper-no-settings-title'>No Settings</div>"
				. "<div class='helper-no-settings-text'>This helper does not require any settings before it is run.</div>"
				. '</div>';
		}

		foreach ($fields as $field) {
			if (is_array($field)) {
				$html .= $this->renderField($field);
			}
		}

		return $html;
	}

	/**
	 * Render one configured field.
	 *
	 * Supported types are text, number, checkbox, and imagepicker.  Unknown types
	 * intentionally fall back to text to keep the JSON tolerant of small mistakes.
	 */
	private function renderField(array $field): string
	{
		$name = (string) ($field['name'] ?? '');
		if ($name === '') {
			return '';
		}

		$type = (string) ($field['type'] ?? 'text');
		$label = $field['labelHtml'] ?? $this->e((string) ($field['label'] ?? $name));
		$help = $this->replace((string) ($field['helpHtml'] ?? ''));

		return ''
			. "<div class='form-group' id='" . $this->e($name) . "-wrapper'>"
			. "<label for='" . $this->e($name) . "' class='control-label col-xs-3'>{$label}</label>"
			. "<div class='col-xs-8'>"
			. $this->renderFieldInput($field)
			. ($help !== '' ? "<p class='help-block'>{$help}</p>" : '')
			. '</div>'
			. '</div>';
	}

	private function renderFieldInput(array $field): string
	{
		$type = $this->fieldTypeName($field);
		if ($type === 'checkbox') {
			return $this->renderCheckbox($field);
		}
		if ($type === 'imagepicker') {
			return $this->renderImagePicker($field);
		}
		if ($type === 'directorybrowser') {
			return $this->renderDirectoryBrowser($field);
		}
		if ($type === 'numberseries') {
			return $this->renderNumberSeries($field);
		}

		return $this->renderTextInput($field);
	}

	private function fieldTypeName(array $field): string
	{
		$type = $field['type'] ?? 'text';
		if (is_array($type)) {
			return (string) ($type['name'] ?? 'text');
		}

		return (string) $type;
	}

	private function fieldTypeOption(array $field, string $name, $default = null)
	{
		$type = $field['type'] ?? null;
		if (is_array($type) && array_key_exists($name, $type)) {
			return $type[$name];
		}

		return $field[$name] ?? $default;
	}

	/**
	 * Render a switch-style checkbox field.
	 */
	private function renderCheckbox(array $field): string
	{
		$name = (string) $field['name'];
		$value = $this->defaultValue($field);
		$checked = filter_var($value, FILTER_VALIDATE_BOOLEAN) ? ' checked' : '';

		return ''
			. "<div class='input-group'>"
			. "<label class='el-switch el-switch-sm el-switch-green'>"
			. "<input type='checkbox' class='form-control col-xs-8' id='" . $this->e($name) . "' name='" . $this->e($name) . "' value='true'{$checked} />"
			. "<span class='el-switch-style'></span>"
			. '</label>'
			. '</div>';
	}

	/**
	 * Render an image picker field.
	 *
	 * The visible input still carries the field name, so form submission works
	 * exactly like a text field.  The plugin is responsible for opening the file
	 * browser and writing the selected absolute image path into the input.
	 */
	private function renderImagePicker(array $field): string
	{
		$name = (string) $field['name'];
		$value = (string) $this->defaultValue($field);
		$inputClass = (string) ($field['inputClass'] ?? 'col-xs-8');
		$pickerAttrs = [
			'class' => 'input-group ' . $inputClass . ' js-allsky-image-picker',
		];

		if (!empty($this->fieldTypeOption($field, 'topLevelFoldersOnly'))) {
			$pickerAttrs['data-top-level-folders-only'] = 'true';
		}
		if (!empty($this->fieldTypeOption($field, 'excludeTestFolders'))) {
			$pickerAttrs['data-exclude-test-folders'] = 'true';
		}
		if (!empty($this->fieldTypeOption($field, 'showDefaultImage'))) {
			$pickerAttrs['data-show-default-image'] = 'true';
			foreach ($this->defaultImageAttributes($value) as $attr => $attrValue) {
				$pickerAttrs[$attr] = $attrValue;
			}
		}

		return ''
			. '<div ' . $this->attrs($pickerAttrs) . '>'
			. '<input ' . $this->attrs([
				'type' => 'text',
				'class' => 'form-control js-allsky-image-picker-input',
				'name' => $name,
				'id' => $name,
				'value' => $value,
				'readonly' => 'readonly',
			]) . '/>'
			. "<span class='input-group-btn'>"
			. "<button type='button' class='btn btn-default js-allsky-image-picker-button'><i class='fa fa-folder-open'></i> Browse</button>"
			. '</span>'
			. '</div>';
	}

	/**
	 * Render a directory browser field.
	 *
	 * The browser writes the selected absolute directory path into the readonly
	 * input, so helper form submission remains the same as a normal text input.
	 */
	private function renderDirectoryBrowser(array $field): string
	{
		$name = (string) $field['name'];
		$value = (string) $this->defaultValue($field);
		$inputClass = (string) ($field['inputClass'] ?? 'col-xs-8');
		$baseFolder = $this->replace((string) $this->fieldTypeOption($field, 'baseFolder', '{ALLSKY_IMAGES}'));
		$browserAttrs = [
			'class' => 'input-group ' . $inputClass . ' js-allsky-directory-browser',
			'data-base-folder' => $baseFolder,
		];
		$maxDepth = $this->fieldTypeOption($field, 'maxDepth');
		if ($maxDepth !== null) {
			$browserAttrs['data-max-depth'] = (string) max(0, (int) $maxDepth);
		}

		return ''
			. '<div ' . $this->attrs($browserAttrs) . '>'
			. '<input ' . $this->attrs([
				'type' => 'text',
				'class' => 'form-control js-allsky-directory-browser-input',
				'name' => $name,
				'id' => $name,
				'value' => $value,
				'readonly' => 'readonly',
			]) . '/>'
			. "<span class='input-group-btn'>"
			. "<button type='button' class='btn btn-default js-allsky-directory-browser-button'><i class='fa fa-folder-open'></i> Browse</button>"
			. '</span>'
			. '</div>';
	}

	/**
	 * Render a text input enhanced by the number-series jQuery plugin.
	 */
	private function renderNumberSeries(array $field): string
	{
		$name = (string) $field['name'];
		$value = (string) $this->defaultValue($field);
		$inputClass = (string) ($field['inputClass'] ?? 'col-xs-8');
		$seriesAttrs = [
			'class' => 'input-group ' . $inputClass . ' js-allsky-number-series',
		];

		foreach (['numberType', 'min', 'max', 'step', 'count', 'decimals', 'separator'] as $option) {
			$valueOption = $this->fieldTypeOption($field, $option);
			if ($valueOption !== null) {
				$seriesAttrs['data-' . strtolower(preg_replace('/([a-z])([A-Z])/', '$1-$2', $option))] = (string) $valueOption;
			}
		}

		return ''
			. '<div ' . $this->attrs($seriesAttrs) . '>'
			. '<input ' . $this->attrs([
				'type' => 'text',
				'class' => 'form-control js-allsky-number-series-input',
				'name' => $name,
				'id' => $name,
				'value' => $value,
			]) . '/>'
			. "<span class='input-group-btn'>"
			. "<button type='button' class='btn btn-default js-allsky-number-series-button'><i class='fa fa-list-ol'></i> Series</button>"
			. '</span>'
			. '</div>';
	}

	/**
	 * Build data attributes for a configured image picker default.
	 */
	private function defaultImageAttributes(string $path): array
	{
		if ($path === '' || !is_file($path)) {
			return [];
		}

		$url = $this->imageUrlFromPath($path);
		if ($url === '') {
			return [];
		}

		return [
			'data-default-image-name' => basename($path),
			'data-default-image-path' => $path,
			'data-default-image-url' => $url,
			'data-default-image-size' => (string) (filesize($path) ?: 0),
			'data-default-image-modified' => (string) (filemtime($path) ?: 0),
		];
	}

	/**
	 * Convert an image path under ALLSKY_IMAGES into the matching WebUI URL.
	 */
	private function imageUrlFromPath(string $path): string
	{
		$basePath = realpath(ALLSKY_IMAGES);
		$realPath = realpath($path);
		if ($basePath === false || $realPath === false) {
			return '';
		}

		$basePath = rtrim(str_replace('\\', '/', $basePath), '/') . '/';
		$realPath = str_replace('\\', '/', $realPath);
		if (strpos($realPath, $basePath) !== 0) {
			return '';
		}

		$relativePath = ltrim(substr($realPath, strlen($basePath)), '/');
		$parts = array_map('rawurlencode', explode('/', $relativePath));
		return '/images/' . implode('/', $parts);
	}

	/**
	 * Render a text-like input field.
	 */
	private function renderTextInput(array $field): string
	{
		$name = (string) $field['name'];
		$type = $this->fieldTypeName($field) === 'number' ? 'number' : 'text';
		$value = (string) $this->defaultValue($field);
		$inputClass = (string) ($field['inputClass'] ?? 'col-xs-8');
		$attrs = [
			'type' => $type,
			'class' => 'form-control',
			'name' => $name,
			'id' => $name,
			'value' => $value,
		];

		$min = $this->fieldTypeOption($field, 'min');
		if ($min !== null) {
			$attrs['min'] = (string) $min;
		}
		$step = $this->fieldTypeOption($field, 'step');
		if ($step !== null) {
			$attrs['step'] = (string) $step;
		}

		return ''
			. "<div class='input-group " . $this->e($inputClass) . "'>"
			. '<input ' . $this->attrs($attrs) . '/>'
			. '</div>';
	}

	/**
	 * Render optional configured HTML that appears below fields and above submit.
	 */
	private function renderFooter(): string
	{
		if (empty($this->helper['footerHtml'])) {
			return '';
		}

		return $this->replace((string) $this->helper['footerHtml']);
	}

	/**
	 * Render the submit buttons for manually-run helpers.
	 *
	 * Helpers may omit submit config when their only command is a simple status
	 * check.  If the helper is not auto-running, still provide default Run and
	 * Show Command buttons so users can inspect and execute the command.
	 */
	private function renderSubmit(): string
	{
		$submit = $this->helper['submit'] ?? null;
		if (!is_array($submit) && $this->isAutoRun()) {
			return '';
		}

		$submit = is_array($submit) ? $submit : [];
		$name = (string) ($submit['name'] ?? 'helper');
		$label = (string) ($submit['label'] ?? 'Run');
		$warning = (string) ($submit['warningHtml'] ?? '');

		return ''
			. '<br><div class="helper-submit-row">'
			. '<span class="helper-submit-primary"><input ' . $this->attrs([
				'type' => 'submit',
				'class' => 'btn btn-primary js-helper-run',
				'name' => $name,
				'value' => $label,
			]) . ' />'
			. $this->renderCommandButton()
			. ($warning !== '' ? '&nbsp; &nbsp; &nbsp;' . $warning : '')
			. '</span>'
			. '<button type="button" class="btn btn-default helper-show-command-button js-helper-show-command">'
			. '<i class="fa fa-terminal"></i> Show Command'
			. '</button>'
			. '</div>';
	}

	/**
	 * Render the optional configured run-command button.
	 */
	private function renderCommandButton(): string
	{
		if (!$this->hasCommandButton()) {
			return '';
		}

		$html = '';
		foreach ($this->commandButtons() as $index => $button) {
			$label = (string) ($button['label'] ?? 'Run Command');
			$helpText = (string) ($button['helpText'] ?? '');
			$attrs = [
				'type' => 'button',
				'class' => 'btn btn-default js-helper-run-command',
				'data-command-button-index' => (string) $index,
				'data-modal-title' => (string) ($button['modalTitle'] ?? 'Command Output'),
				'data-working-message' => (string) ($button['workingMessage'] ?? 'Running command...'),
				'data-running-button-label' => (string) ($button['runningButtonLabel'] ?? 'Running...'),
				'data-output-format' => (string) ($button['outputFormat'] ?? 'text'),
			];

			if ($helpText !== '') {
				$attrs['data-toggle'] = 'popover';
				$attrs['data-trigger'] = 'hover focus';
				$attrs['data-placement'] = 'top';
				$attrs['data-container'] = 'body';
				$attrs['data-content'] = $helpText;
				$attrs['title'] = $label;
			}

			$html .= '&nbsp; <button ' . $this->attrs($attrs) . '>' . $this->e($label) . '</button>';
		}

		return $html;
	}

	/**
	 * Render the output targets used by helpers_tool.js.
	 *
	 * useTabbedToolPage()=true is handled by renderTabbedToolPage().
	 * showResultsTabs=false gives simple helpers a plain output region.
	 */
	private function renderResultContainers(): string
	{
		if (!$this->useTabbedToolPage()) {
			return "<div class='helper-images-hidden js-helper-images'></div><div class='js-helper-output'></div>";
		}

		return '';
	}

	/**
	 * Render the modal used by the optional configured run-command button.
	 */
	private function renderCommandModal(): string
	{
		if (!$this->hasCommandButton()) {
			return '';
		}

		$id = $this->e($this->helperId);

		return ''
			. "<div class='modal fade js-helper-run-command-modal' id='{$id}-run-command-modal' tabindex='-1' role='dialog' aria-labelledby='{$id}-run-command-modal-title'>"
			. "<div class='modal-dialog modal-lg' role='document'>"
			. "<div class='modal-content'>"
			. "<div class='modal-header'>"
			. "<button type='button' class='close' data-dismiss='modal' aria-label='Close'><span aria-hidden='true'>&times;</span></button>"
			. "<h4 class='modal-title js-helper-run-command-modal-title' id='{$id}-run-command-modal-title'>Command Output</h4>"
			. '</div>'
			. "<div class='modal-body'>"
			. "<pre class='helper-output js-helper-run-command-output' style='font-size: 0.9em; max-height: 65vh; overflow: auto;'></pre>"
			. '</div>'
			. "<div class='modal-footer'><button type='button' class='btn btn-default' data-dismiss='modal'>Close</button></div>"
			. '</div>'
			. '</div>'
			. '</div>';
	}

	/**
	 * Render the configured introductory HTML blocks.
	 */
	private function renderContent(): string
	{
		$html = '';
		foreach (($this->helper['contentHtml'] ?? []) as $content) {
			$html .= $this->replace((string) $content);
		}

		return $html;
	}

	/**
	 * Render conditional notices.
	 *
	 * At present only the stretch warning is supported.  It is kept here rather
	 * than in JSON because it depends on current Allsky settings and the current
	 * image filename.
	 */
	private function renderNotices(): string
	{
		global $settings_array;

		$html = '';
		foreach (($this->helper['notices'] ?? []) as $notice) {
			if (!is_array($notice) || ($notice['type'] ?? '') !== 'stretchWarning' || !$this->stretchingEnabled()) {
				continue;
			}

			$filename = $this->e((string) getVariableOrDefault($settings_array, 'filename', ''));
			$html .= "<div class='markdown-body'>";
			$html .= "<blockquote class='helper-notice-blockquote'>";
			$html .= 'You appear to already be stretching images.';
			$html .= '<br>Those settings will NOT be used while running these tests.';
			$html .= "<br><strong>Do NOT use the current '{$filename}' image since it's already stretched</strong>";
			$html .= '</blockquote>';
			$html .= '</div><br>';
		}

		return $html;
	}

	/**
	 * Include scripts and styles required by helper output rendering.
	 *
	 * lightGallery is only used when command output points to generated media,
	 * but loading it on all helper pages keeps this renderer simple and mirrors
	 * the old helper page behavior.
	 */
	private function renderAssets(): string
	{
		return ''
			. '<link type="text/css" rel="stylesheet" href="/js/lightgallery/css/lightgallery-bundle.min.css" />'
			. '<link type="text/css" rel="stylesheet" href="/js/lightgallery/css/lg-transitions.css" />'
			. '<script src="/js/lightgallery/lightgallery.min.js"></script>'
			. '<script src="/js/lightgallery/plugins/zoom/lg-zoom.min.js"></script>'
			. '<script src="/js/lightgallery/plugins/thumbnail/lg-thumbnail.min.js"></script>'
			. '<script src="/js/lightgallery/plugins/video/lg-video.min.js"></script>'
			. '<link type="text/css" rel="stylesheet" href="/js/jquery-allskyimagepicker/jquery-allskyimagepicker.css?c=' . $this->e(ALLSKY_VERSION) . '" />'
			. '<script src="/js/jquery-allskyimagepicker/jquery-allskyimagepicker.js?c=' . $this->e(ALLSKY_VERSION) . '"></script>'
			. '<script src="/js/jquery-allskydirectorybrowser/jquery-allskydirectorybrowser.js?c=' . $this->e(ALLSKY_VERSION) . '"></script>'
			. '<script src="/js/jquery-allskynumberseries/jquery-allskynumberseries.js?c=' . $this->e(ALLSKY_VERSION) . '"></script>'
			. '<script src="/js/jquery-loading-overlay/dist/loadingoverlay.min.js?c=' . $this->e(ALLSKY_VERSION) . '"></script>'
			. '<script src="/js/helpers_tool.js?c=' . $this->e(ALLSKY_VERSION) . '"></script>';
	}

	/**
	 * Render a clear error panel if the requested helper ID is not configured.
	 */
	private function renderUnknownHelper(): string
	{
		return ''
			. "<div class='panel panel-allsky'>"
			. "<div class='panel-heading'>Helper Tool</div>"
			. "<div class='panel-body'>"
			. "<p class='errorMsgBig'>Unknown helper: " . $this->e($this->helperId) . '</p>'
			. '</div>'
			. '</div>';
	}

	/**
	 * Whether the full Images/Output result tab UI should be rendered.
	 */
	private function showResultsTabs(): bool
	{
		// "results" is the old key.  Keep it as a fallback for existing configs.
		return !empty($this->helper['showResultsTabs'] ?? $this->helper['results'] ?? false);
	}

	/**
	 * Whether the helper should render the Settings/Images/Output tab shell.
	 *
	 * Manual helpers always use the tabbed shell so their controls live in the
	 * Settings tab and command output appears in the Output tab.  Auto-run helpers
	 * keep the explicit showResultsTabs setting so status pages can remain compact.
	 */
	private function useTabbedToolPage(): bool
	{
		return $this->showResultsTabs() || !$this->isAutoRun();
	}

	/**
	 * Whether this helper should run immediately when the page loads.
	 */
	private function isAutoRun(): bool
	{
		return !empty($this->helper['autoRun']);
	}

	/**
	 * Fetch a top-level string from the helper config.
	 */
	private function getString(string $key, string $default): string
	{
		return (string) ($this->helper[$key] ?? $default);
	}

	/**
	 * Fetch one string from the helper "messages" block.
	 */
	private function getMessage(string $key, string $default): string
	{
		$messages = $this->helper['messages'] ?? [];
		return is_array($messages) ? (string) ($messages[$key] ?? $default) : $default;
	}

	/**
	 * Whether this helper has an extra configured command button.
	 */
	private function hasCommandButton(): bool
	{
		return count($this->commandButtons()) > 0;
	}

	/**
	 * Return configured command buttons.
	 */
	private function commandButtons(): array
	{
		$buttons = $this->helper['commandButton'] ?? [];
		if (!is_array($buttons)) {
			return [];
		}

		if (isset($buttons['command'])) {
			$buttons = [$buttons];
		}

		return array_values(array_filter($buttons, function ($button) {
			return is_array($button) && !empty($button['command']) && is_array($button['command']);
		}));
	}

	/**
	 * Return the AJAX action sent as ?request=... to helperutils.php.
	 */
	private function getAction(): string
	{
		// "endpointRequest" is the old key.  Keep it as a fallback for existing configs.
		return (string) ($this->helper['action'] ?? $this->helper['endpointRequest'] ?? 'HelperRun');
	}

	/**
	 * Replace placeholders in configured HTML.
	 */
	private function replace(string $value): string
	{
		return $this->replacePlaceholders($value);
	}

	/**
	 * Convert an associative array to escaped HTML attributes.
	 */
	private function attrs(array $attrs): string
	{
		$html = [];
		foreach ($attrs as $name => $value) {
			$html[] = $this->e((string) $name) . "='" . $this->e((string) $value) . "'";
		}

		return implode(' ', $html);
	}

	/**
	 * Escape text for HTML content or attribute values.
	 */
	private function e(string $value): string
	{
		return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
	}

	/**
	 * Load and cache config/helpers.json.
	 *
	 * A missing or invalid file is treated as an empty helper set so the WebUI
	 * can still render instead of failing fatally.
	 */
	private static function loadConfig(): array
	{
		if (self::$config !== null) {
			return self::$config;
		}

		$configFile = rtrim(ALLSKY_CONFIG, '/') . '/helpers.json';
		if (!is_file($configFile)) {
			return self::$config = ['helpers' => []];
		}

		$json = file_get_contents($configFile);
		if ($json === false) {
			return self::$config = ['helpers' => []];
		}

		$config = json_decode($json, true);
		if (!is_array($config)) {
			return self::$config = ['helpers' => []];
		}

		if (!isset($config['helpers']) || !is_array($config['helpers'])) {
			$config['helpers'] = [];
		}

		return self::$config = $config;
	}

	/**
	 * Legacy page-name aliases.
	 *
	 * The current aliases are identity mappings, but keeping this method makes it
	 * explicit where old URLs should be translated if helper IDs are renamed.
	 */
	private static function aliases(): array
	{
		return [
			'check_allsky' => 'check_allsky',
			'startrails_settings' => 'startrails_settings',
			'stretch_settings' => 'stretch_settings',
			'timelapse_settings' => 'timelapse_settings',
		];
	}

	/**
	 * Replace config placeholders with runtime values.
	 */
	private function replacePlaceholders(string $value): string
	{
		$replacements = array_merge([
			'{ALLSKY_IMAGES}' => ALLSKY_IMAGES,
			'{ALLSKY_CURRENT_DIR}' => ALLSKY_CURRENT_DIR,
		], $this->context);

		return strtr($value, $replacements);
	}

	/**
	 * Resolve a field's configured default value.
	 *
	 * Defaults can be literal strings/numbers/booleans or dynamic descriptors:
	 *  - {"type": "setting", "name": "...", "fallback": "..."}
	 *  - {"type": "firstNonEmpty", "values": [...]}
	 *  - {"type": "path", "parts": [...]}
	 *  - {"type": "latestImage", "root": "{ALLSKY_IMAGES}"}
	 *  - {"type": "previousDay"}
	 *  - {"type": "sequence", "start": ..., "step": 0.03, "count": 8}
	 *  - {"type": "timelapseInputDirectory"}
	 */
	private function defaultValue(array $field)
	{
		return $this->resolveDefault($field['default'] ?? '');
	}

	/**
	 * Resolve one literal or dynamic default descriptor.
	 *
	 * This method is recursive so dynamic defaults can be composed.  For example,
	 * a sequence can start at the value of an Allsky setting.
	 */
	private function resolveDefault($default)
	{
		if (!is_array($default)) {
			return $default;
		}

		switch ((string) ($default['type'] ?? '')) {
			case 'setting':
				global $settings_array;
				return getVariableOrDefault($settings_array, (string) ($default['name'] ?? ''), $default['fallback'] ?? '');

			case 'firstNonEmpty':
				return $this->defaultFirstNonEmpty($default);

			case 'path':
				return $this->defaultPath($default);

			case 'latestImage':
				return $this->latestImage($default);

			case 'previousDay':
			case 'yesterdayDay':
				// Allsky's "previous day" helper default follows the capture-day
				// convention used by the old pages: now minus twelve hours.
				$datetime = new DateTime('now');
				$datetime->modify('-12 hours');
				return $datetime->format('Ymd');

			case 'sequence':
				return $this->defaultSequence($default);

			case 'timelapseInputDirectory':
				return $this->timelapseInputDirectoryInfo()['input_directory'];
		}

		return '';
	}

	/**
	 * Return the first configured default value that resolves to a non-empty
	 * string.  If requireFile=true is set on this descriptor, the resolved value
	 * must also point to a real file.
	 */
	private function defaultFirstNonEmpty(array $default): string
	{
		foreach (($default['values'] ?? []) as $candidate) {
			$value = trim((string) $this->resolveDefault($candidate));
			if ($value === '') {
				continue;
			}
			if (!empty($default['requireFile']) && !is_file($value)) {
				continue;
			}

			return $value;
		}

		return (string) ($default['fallback'] ?? '');
	}

	/**
	 * Join configured path parts after resolving any nested dynamic defaults.
	 *
	 * This is used by image picker defaults to combine a directory constant with
	 * a filename from the Allsky settings file.
	 */
	private function defaultPath(array $default): string
	{
		$parts = [];
		foreach (($default['parts'] ?? []) as $part) {
			$value = trim($this->replace((string) $this->resolveDefault($part)), '/');
			if ($value !== '') {
				$parts[] = $value;
			}
		}

		if (empty($parts)) {
			return '';
		}

		$path = implode('/', $parts);
		if (!empty($default['absolute'])) {
			$path = '/' . ltrim($path, '/');
		}
		if (!empty($default['requireFile']) && !is_file($path)) {
			return '';
		}

		return $path;
	}

	/**
	 * Find the most recently modified image under the configured root directory.
	 */
	private function latestImage(array $default): string
	{
		$root = rtrim($this->replace((string) ($default['root'] ?? ALLSKY_IMAGES)), '/');
		if ($root === '' || !is_dir($root)) {
			return '';
		}

		$recursive = !empty($default['recursive']);
		$excludePrefixes = $default['excludeFolderPrefixes'] ?? [];
		$extensions = $default['extensions'] ?? ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
		$latestPath = '';
		$latestTime = 0;

		$this->findLatestImage($root, $recursive, $excludePrefixes, $extensions, $latestPath, $latestTime);

		return $latestPath;
	}

	/**
	 * Walk a directory looking for the newest supported image file.
	 */
	private function findLatestImage(
		string $directory,
		bool $recursive,
		array $excludePrefixes,
		array $extensions,
		string &$latestPath,
		int &$latestTime
	): void {
		$entries = scandir($directory);
		if ($entries === false) {
			return;
		}

		foreach ($entries as $entry) {
			if ($entry === '.' || $entry === '..') {
				continue;
			}

			$path = $directory . '/' . $entry;
			if (is_dir($path)) {
				if ($recursive && !$this->isExcludedFolder($entry, $excludePrefixes)) {
					$this->findLatestImage($path, true, $excludePrefixes, $extensions, $latestPath, $latestTime);
				}
				continue;
			}

			if (!is_file($path) || !$this->hasImageExtension($path, $extensions)) {
				continue;
			}

			$modified = filemtime($path);
			if ($modified !== false && $modified > $latestTime) {
				$latestTime = $modified;
				$latestPath = $path;
			}
		}
	}

	/**
	 * Whether a folder should be skipped by a latestImage default.
	 */
	private function isExcludedFolder(string $folder, array $prefixes): bool
	{
		foreach ($prefixes as $prefix) {
			$prefix = (string) $prefix;
			if ($prefix !== '' && strpos($folder, $prefix) === 0) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Check if a path has one of the configured image extensions.
	 */
	private function hasImageExtension(string $path, array $extensions): bool
	{
		$extension = strtolower((string) pathinfo($path, PATHINFO_EXTENSION));
		foreach ($extensions as $allowed) {
			if ($extension === strtolower((string) $allowed)) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Build a simple numeric sequence from JSON.
	 *
	 * Example:
	 * {"type": "sequence", "start": {"type": "setting", ...}, "step": 0.03,
	 *  "count": 8, "separator": "  "}
	 */
	private function defaultSequence(array $default): string
	{
		$start = (float) $this->resolveDefault($default['start'] ?? 0);
		$step = (float) ($default['step'] ?? 1);
		$count = max(0, (int) ($default['count'] ?? 0));
		$separator = (string) ($default['separator'] ?? ' ');
		$values = [];

		for ($i = 0; $i < $count; $i++) {
			$values[] = $this->formatDefaultNumber($start + ($step * $i));
		}

		return implode($separator, $values);
	}

	/**
	 * Format generated numeric defaults without floating point noise.
	 */
	private function formatDefaultNumber(float $value): string
	{
		$formatted = sprintf('%.10F', round($value, 10));
		return rtrim(rtrim($formatted, '0'), '.');
	}

	/**
	 * Compute the default timelapse input directory and help-text suffix.
	 */
	private function timelapseInputDirectoryInfo(): array
	{
		$datetime = new DateTime('now');
		$datetime->modify('-12 hours');
		$inputDirectory = $datetime->format('Ymd');
		$when = 'yesterday';

		if (!is_dir(ALLSKY_IMAGES . '/' . $inputDirectory)) {
			$matches = glob(ALLSKY_IMAGES . '/20*', GLOB_ONLYDIR);
			if (is_array($matches) && count($matches) > 0) {
				sort($matches, SORT_STRING);
				$inputDirectory = (string) end($matches);
				$when = 'the most recent day with images';
			} else {
				$inputDirectory = '';
				$when = '';
			}
		}

		return [
			'input_directory' => $inputDirectory,
			'when' => $when !== '' ? '<br>The default is ' . $this->e($when) . '.' : '',
		];
	}

	/**
	 * Whether the current Allsky settings already stretch saved images.
	 */
	private function stretchingEnabled(): bool
	{
		global $settings_array;

		return ((float) getVariableOrDefault($settings_array, 'imagestretchamountdaytime', 0) > 0)
			|| ((float) getVariableOrDefault($settings_array, 'imagestretchamountnighttime', 0) > 0);
	}
}

/**
 * Compatibility entry point used by index.php.
 */
function DisplayHelper(?string $helperId = null): void
{
	(new HelperPageRenderer($helperId))->render();
}
