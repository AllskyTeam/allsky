<?php
declare(strict_types=1);

include_once(__DIR__ . '/functions.php');
initialize_variables();
include_once(__DIR__ . '/authenticate.php');
include_once(__DIR__ . '/utilbase.php');
include_once(__DIR__ . '/helper.php');

/**
 * AJAX endpoint for WebUI helper tools.
 *
 * This class is the server-side counterpart to HelperPageRenderer and
 * helpers_tool.js:
 *
 *  - HelperPageRenderer builds the page from config/helpers.json.
 *  - helpers_tool.js submits the form via AJAX.
 *  - HELPERSUTIL validates the requested helper, builds the allsky-config
 *    command argv, runs it, and returns JSON for the browser to display.
 *
 * Responses from successful routes have this shape:
 *
 * {
 *   "ok": true|false,
 *   "output": "raw command output",
 *   "imagesHtml": "optional rendered media grid",
 *   "command": "shell-quoted command string for debugging"
 * }
 *
 * Helper behavior goes through the config-driven HelperRun route.  The helper
 * definitions in config/helpers.json describe both the command to run and the
 * submitted form values that become command arguments.
 */
class HELPERSUTIL extends UTILBASE
{
	/**
	 * Declare every callable AJAX route.
	 *
	 * UTILBASE rejects anything not listed here, so adding a public method is not
	 * enough to expose it.  Unsafe verbs are also covered by UTILBASE's CSRF
	 * validation before dispatch.
	 *
	 * @return array<string,array<int,string>> Route names mapped to allowed HTTP verbs.
	 */
	protected function getRoutes(): array
	{
		return [
			'HelperRun' => ['get', 'post'],
			'HelperCommand' => ['get', 'post'],
			'HelperCommandRun' => ['post'],
			'ImagePickerList' => ['get'],
		];
	}

	/**
	 * Run a config-driven helper via GET.
	 *
	 * This is primarily used by helpers that auto-run and do not need form input,
	 * such as Check Allsky.
	 *
	 * The selected helper is still validated by runConfiguredHelper(), including
	 * checking that the helper configuration allows the GET method.
	 */
	public function getHelperRun(): void
	{
		$this->runConfiguredHelper();
	}

	/**
	 * Run a config-driven helper via POST.
	 *
	 * Form-based helpers use this route.  UTILBASE validates the CSRF token before
	 * this method is invoked.
	 *
	 * All submitted form values are converted into command arguments by
	 * runConfiguredHelper() according to the helper's config/helpers.json block.
	 */
	public function postHelperRun(): void
	{
		$this->runConfiguredHelper();
	}

	/**
	 * Run the optional extra command configured for a helper button.
	 *
	 * The browser only identifies the helper.  The command itself always comes
	 * from config/helpers.json so callers cannot submit arbitrary commands.
	 */
	public function postHelperCommandRun(): void
	{
		$helperId = HelperPageRenderer::resolveHelperId((string) ($_POST['helper'] ?? $_GET['helper'] ?? ''));
		$helper = HelperPageRenderer::getHelperConfig($helperId);
		if ($helper === null) {
			$this->send404('Unknown helper.');
		}

		$buttons = $helper['commandButton'] ?? null;
		if (!is_array($buttons)) {
			$this->send404('Helper command is not configured.');
		}

		if (isset($buttons['command'])) {
			$buttons = [$buttons];
		}

		$buttonIndex = filter_input(INPUT_POST, 'command_button_index', FILTER_VALIDATE_INT);
		if ($buttonIndex === false || $buttonIndex === null || $buttonIndex < 0 || !isset($buttons[$buttonIndex]) || !is_array($buttons[$buttonIndex])) {
			$this->send400('Invalid helper command button.');
		}

		$button = $buttons[$buttonIndex];
		$command = $button['command'] ?? null;
		if (!is_array($command) || count($command) === 0) {
			$this->send500('Helper command is not configured.');
		}

		$commandArgs = [];
		foreach ($command as $arg) {
			if (!is_string($arg) || $arg === '') {
				$this->send500('Helper command contains an invalid argument.');
			}
			$commandArgs[] = $arg;
		}

		$this->sendCommandResponse($this->buildAllskyConfigCommand($commandArgs));
	}

	/**
	 * Return the command that a GET helper would run without executing it.
	 *
	 * This powers the Settings tab's "Show Command" button for helpers that use
	 * GET.  It shares the same command-building path as HelperRun so the preview
	 * stays in lockstep with the real execution path.
	 */
	public function getHelperCommand(): void
	{
		$this->sendCommandPreview();
	}

	/**
	 * Return the command that a POST helper would run without executing it.
	 *
	 * Form-based helpers submit their current field values here when the user
	 * wants to inspect the command before running it.  UTILBASE applies the same
	 * CSRF checks as it does for HelperRun.
	 */
	public function postHelperCommand(): void
	{
		$this->sendCommandPreview();
	}

	/**
	 * Return one directory level from ALLSKY_IMAGES for the image picker.
	 *
	 * The picker is deliberately lazy-loaded because image directories can be
	 * large.  The client passes a relative directory in "path"; this method
	 * resolves it under ALLSKY_IMAGES and returns child directories plus image
	 * files only.
	 *
	 * The response is JSON with separate `directories` and `files` arrays so the
	 * browser can render a tree and image preview without walking the entire
	 * images directory at once.
	 */
	public function getImagePickerList(): void
	{
		$relativePath = trim((string) filter_input(INPUT_GET, 'path', FILTER_UNSAFE_RAW));
		if (preg_match('/[\x00-\x1F\x7F]/', $relativePath) === 1) {
			$this->send400('Invalid path.');
		}

		$basePath = realpath(ALLSKY_IMAGES);
		if ($basePath === false || !is_dir($basePath)) {
			$this->send500('Allsky images directory is not available.');
		}

		$directory = $this->resolveImagePickerDirectory($basePath, $relativePath);
		if ($directory === null) {
			$this->send400('Invalid path.');
		}

		$this->sendResponse([
			'ok' => true,
			'path' => $relativePath,
			'directories' => $this->listImagePickerDirectories($basePath, $directory),
			'files' => $this->listImagePickerFiles($basePath, $directory),
		]);
	}


	/**
	 * Prefix an allsky-config argv list with sudo/user/script entries.
	 *
	 * Commands are passed to proc_open() as an argv array rather than a shell
	 * string, which avoids shell interpolation and keeps form values from becoming
	 * executable shell fragments.
	 *
	 * @param array<int,string> $args Arguments to pass to the allsky-config command.
	 *
	 * @return array<int,string> Complete argv array ready for proc_open().
	 */
	private function buildAllskyConfigCommand(array $args): array
	{
		return array_merge(
			['/usr/bin/sudo', '--user=' . ALLSKY_OWNER, ALLSKY_SCRIPTS . '/allsky-config'],
			$args
		);
	}

	/**
	 * Resolve an image-picker directory and ensure it stays under ALLSKY_IMAGES.
	 *
	 * The browser only sends relative paths.  realpath() is used to collapse
	 * symlinks and traversal segments before the path is checked against the
	 * allowed base.
	 *
	 * @param string $basePath Canonical ALLSKY_IMAGES directory.
	 * @param string $relativePath Relative directory requested by the client.
	 *
	 * @return string|null Canonical directory path, or null when invalid.
	 */
	private function resolveImagePickerDirectory(string $basePath, string $relativePath): ?string
	{
		$relativePath = trim($relativePath, "/\\");
		$candidate = $relativePath === '' ? $basePath : $basePath . DIRECTORY_SEPARATOR . $relativePath;
		$realPath = realpath($candidate);
		if ($realPath === false || !is_dir($realPath)) {
			return null;
		}

		if (!$this->isPathInside($basePath, $realPath)) {
			return null;
		}

		return $realPath;
	}

	/**
	 * List immediate child directories for the image picker.
	 *
	 * Hidden dot directories are excluded by readDirectory().  Returned paths are
	 * relative to ALLSKY_IMAGES because those are the paths the browser sends
	 * back when expanding a node.
	 *
	 * @param string $basePath Canonical ALLSKY_IMAGES directory.
	 * @param string $directory Canonical directory to scan.
	 *
	 * @return array<int,array{name:string,path:string}> Sorted directory rows.
	 */
	private function listImagePickerDirectories(string $basePath, string $directory): array
	{
		$items = [];
		foreach ($this->readDirectory($directory) as $entry) {
			$path = $directory . DIRECTORY_SEPARATOR . $entry;
			if (!is_dir($path)) {
				continue;
			}

			$items[] = [
				'name' => $entry,
				'path' => $this->relativeImagePath($basePath, $path),
			];
		}

		usort($items, fn($a, $b) => strnatcasecmp($a['name'], $b['name']));
		return $items;
	}

	/**
	 * List supported image files in a directory for the image picker.
	 *
	 * Each returned item includes both filesystem details and a web URL so the
	 * browser can display a preview and submit the selected absolute path.
	 *
	 * @param string $basePath Canonical ALLSKY_IMAGES directory.
	 * @param string $directory Canonical directory to scan.
	 *
	 * @return array<int,array{name:string,path:string,fullPath:string,url:string,size:int|float,modified:int|float}> Sorted file rows.
	 */
	private function listImagePickerFiles(string $basePath, string $directory): array
	{
		$items = [];
		foreach ($this->readDirectory($directory) as $entry) {
			$path = $directory . DIRECTORY_SEPARATOR . $entry;
			if (!is_file($path) || !$this->isImagePickerFile($entry)) {
				continue;
			}

			$relativePath = $this->relativeImagePath($basePath, $path);
			$items[] = [
				'name' => $entry,
				'path' => $relativePath,
				'fullPath' => $path,
				'url' => $this->imagePickerUrl($relativePath),
				'size' => filesize($path) ?: 0,
				'modified' => filemtime($path) ?: 0,
			];
		}

		usort($items, fn($a, $b) => strnatcasecmp($a['name'], $b['name']));
		return $items;
	}

	/**
	 * Read visible entries from a directory.
	 *
	 * The helper hides `.`/`..` and dot-prefixed entries because the image picker
	 * should expose only normal user-facing folders and images.  Read failures
	 * are treated as empty directories.
	 *
	 * @param string $directory Directory to scan.
	 *
	 * @return array<int,string> Visible entry names.
	 */
	private function readDirectory(string $directory): array
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
	 * Check whether a filename has an image extension supported by the picker.
	 *
	 * @param string $name Filename or path segment to inspect.
	 *
	 * @return bool True when the extension is a supported image type.
	 */
	private function isImagePickerFile(string $name): bool
	{
		return preg_match('/\.(jpg|jpeg|png|gif|webp|bmp)$/i', $name) === 1;
	}

	/**
	 * Determine whether a filesystem path is inside a base directory.
	 *
	 * Paths are normalized with trailing separators before the prefix check so a
	 * sibling directory with a similar name is not considered inside the base.
	 *
	 * @param string $basePath Canonical base directory.
	 * @param string $path Canonical candidate path.
	 *
	 * @return bool True when the candidate is inside the base directory.
	 */
	private function isPathInside(string $basePath, string $path): bool
	{
		$basePath = rtrim($basePath, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR;
		$path = rtrim($path, DIRECTORY_SEPARATOR) . (is_dir($path) ? DIRECTORY_SEPARATOR : '');

		return strpos($path, $basePath) === 0;
	}

	/**
	 * Convert an absolute image path into a path relative to ALLSKY_IMAGES.
	 *
	 * The caller is responsible for validating containment before calling this
	 * helper.
	 *
	 * @param string $basePath Canonical ALLSKY_IMAGES directory.
	 * @param string $path Canonical file or directory path under the base.
	 *
	 * @return string Slash-separated relative path.
	 */
	private function relativeImagePath(string $basePath, string $path): string
	{
		return ltrim(str_replace('\\', '/', substr($path, strlen(rtrim($basePath, DIRECTORY_SEPARATOR)))), '/');
	}

	/**
	 * Convert a relative image path into the WebUI `/images/...` URL.
	 *
	 * Each path segment is raw-url-encoded independently so spaces and other
	 * filename characters remain valid in generated preview URLs.
	 *
	 * @param string $relativePath Path relative to ALLSKY_IMAGES.
	 *
	 * @return string Browser URL for the image.
	 */
	private function imagePickerUrl(string $relativePath): string
	{
		$parts = array_map('rawurlencode', explode('/', $relativePath));
		return '/images/' . implode('/', $parts);
	}

	/**
	 * Build and execute a helper command from config/helpers.json.
	 *
	 * The helper config contributes:
	 *
	 *  - method: GET or POST expected for this helper,
	 *  - command: base allsky-config arguments,
	 *  - fields[*].args: mapping of submitted form values to command flags.
	 *
	 * Supported field arg options:
	 *
	 *  - flag: command-line flag such as --input,
	 *  - boolean: include the flag only when the checkbox is true,
	 *  - spaceToUnderscore: collapse whitespace in multi-value fields to "_".
	 *
	 * This method sends the final command response directly as JSON and exits.
	 */
	private function runConfiguredHelper(): void
	{
		$this->sendCommandResponse($this->buildConfiguredHelperCommand());
	}

	/**
	 * Send a dry-run response containing the configured helper command.
	 *
	 * The command is not executed.  The response is intentionally small because
	 * the browser only needs the shell-readable command string for the modal.
	 */
	private function sendCommandPreview(): void
	{
		$this->sendResponse([
			'ok' => true,
			'command' => $this->formatDebugCommand($this->buildConfiguredHelperCommand()),
		]);
	}

	/**
	 * Build the configured helper command from the current request.
	 *
	 * @return array<int,string> Complete argv list ready for execution.
	 */
	private function buildConfiguredHelperCommand(): array
	{
		$helperId = HelperPageRenderer::resolveHelperId((string) ($_GET['helper'] ?? $_POST['helper'] ?? ''));
		$helper = HelperPageRenderer::getHelperConfig($helperId);
		if ($helper === null) {
			$this->send404('Unknown helper.');
		}

		$configuredMethod = strtolower((string) ($helper['method'] ?? 'post'));
		if ($configuredMethod !== $this->method) {
			$this->send404('Helper method is not callable.');
		}

		$argv = $helper['command'] ?? null;
		if (!is_array($argv) || count($argv) === 0) {
			$this->send500('Helper command is not configured.');
		}

		$commandArgs = [];
		foreach ($argv as $arg) {
			if (!is_string($arg) || $arg === '') {
				$this->send500('Helper command contains an invalid argument.');
			}
			$commandArgs[] = $arg;
		}

		foreach (($helper['fields'] ?? []) as $field) {
			if (!is_array($field)) {
				continue;
			}

			$name = (string) ($field['name'] ?? '');
			if ($name === '') {
				continue;
			}

			$args = $field['args'] ?? [];
			if (!is_array($args) || count($args) === 0) {
				continue;
			}

			$value = trim((string) filter_input(INPUT_POST, $name, FILTER_UNSAFE_RAW));
			foreach ($args as $argConfig) {
				if (!is_array($argConfig)) {
					continue;
				}

				$flag = (string) ($argConfig['flag'] ?? '');
				if ($flag === '' || preg_match('/^--[A-Za-z0-9][A-Za-z0-9-]*$/', $flag) !== 1) {
					$this->send500('Helper field contains an invalid argument flag.');
				}

				if (!empty($argConfig['boolean'])) {
					if (filter_input(INPUT_POST, $name, FILTER_VALIDATE_BOOLEAN)) {
						$commandArgs[] = $flag;
					}
					continue;
				}

				if ($value === '') {
					continue;
				}

				$this->assertNoControlChars($value, $name);
				if (!empty($argConfig['spaceToUnderscore'])) {
					$value = preg_replace('/\s+/', '_', $value) ?? $value;
				}

				$commandArgs[] = $flag;
				$commandArgs[] = $value;
			}
		}

		return $this->buildAllskyConfigCommand($commandArgs);
	}

	/**
	 * Reject values containing ASCII control characters.
	 *
	 * Form values may still contain spaces, slashes, dots, and other normal path
	 * or numeric-list characters, but not newlines, NULs, or similar control
	 * bytes that make logs and command arguments ambiguous.
	 *
	 * @param string $value Submitted value to validate.
	 * @param string $label Human-readable field label used in the error message.
	 */
	private function assertNoControlChars(string $value, string $label): void
	{
		if (preg_match('/[\x00-\x1F\x7F]/', $value) === 1) {
			$this->send400($label . ' contains invalid characters.');
		}
	}

	/**
	 * Run a command and send the normalized JSON response.
	 *
	 * The raw command output is always returned.  If that output contains a
	 * show_images.php link, imagesHtml also contains the rendered media grid so
	 * the browser can display generated images/videos without navigating away.
	 *
	 * @param array<int,string> $argv Complete command argv to execute.
	 */
	private function sendCommandResponse(array $argv): void
	{
		$result = $this->runCommand($argv);
		$output = trim($result['message']);
		$imagesHtml = $this->renderImagesHtmlFromOutput($output);

		$this->sendResponse([
			'ok' => ! $result['error'],
			'output' => $this->removeResultLinkText($output),
			'imagesHtml' => $imagesHtml,
			'command' => $this->formatDebugCommand($argv),
		]);
	}

	/**
	 * Format an argv command as a shell-readable debug string.
	 *
	 * Helpers are executed with proc_open() using an argv array, not through a
	 * shell.  The debug display still needs to look like a command a human could
	 * paste into a terminal, so every argument is shell-quoted.
	 *
	 * @param array<int,string> $argv Complete command argv.
	 *
	 * @return string Shell-quoted command line for display only.
	 */
	private function formatDebugCommand(array $argv): string
	{
		if (($argv[0] ?? '') === '/usr/bin/sudo') {
			array_shift($argv);
			if (isset($argv[0]) && str_starts_with($argv[0], '--user=')) {
				array_shift($argv);
			}
		}

		return implode(' ', array_map('escapeshellarg', $argv));
	}

	/**
	 * Remove the legacy result-link sentence from command output.
	 *
	 * The helper scripts still print "Click here to see the results." with a
	 * show_images.php link.  The WebUI now renders that target in the Images tab,
	 * so keeping the sentence in the Output tab is redundant.  The raw output is
	 * still used before this cleanup so the media grid can be derived normally.
	 *
	 * @param string $output Raw helper command output.
	 *
	 * @return string Output text suitable for display in the Output tab.
	 */
	private function removeResultLinkText(string $output): string
	{
		$output = preg_replace(
			'/\bClick\s+<a\b[^>]*href=[\'"][^\'"]*show_images\.php[^\'"]*[\'"][^>]*>\s*here\s*<\/a>\s+to\s+see\s+the\s+results\.?/i',
			'',
			$output
		);

		if ($output === null) {
			return '';
		}

		return trim(preg_replace("/[ \t]+\n/", "\n", $output) ?? $output);
	}

	/**
	 * Convert a show_images.php link in command output to the WebUI media grid.
	 *
	 * Helper scripts commonly print a link to generated files.  The browser UI
	 * wants the actual thumbnail/gallery HTML instead, so this method extracts
	 * the link parameters and delegates to renderListFileTypeContent().
	 *
	 * @param string $output Raw helper command output.
	 *
	 * @return string Rendered media grid HTML, or an empty string if none can be derived.
	 */
	private function renderImagesHtmlFromOutput(string $output): string
	{
		$showImagesUrl = $this->extractShowImagesUrl($output);
		if ($showImagesUrl === null) {
			return '';
		}

		$parts = parse_url(html_entity_decode($showImagesUrl, ENT_QUOTES | ENT_HTML5));
		if (!is_array($parts) || empty($parts['query'])) {
			return '';
		}

		parse_str($parts['query'], $params);

		$day = trim((string) ($params['day'] ?? ''));
		$pre = trim((string) ($params['pre'] ?? ''));
		$formalImageTypeName = trim((string) ($params['type'] ?? 'Files'));
		$fileType = trim((string) ($params['filetype'] ?? 'picture'));

		if ($day === '' || $pre === '' || !in_array($fileType, ['picture', 'video'], true)) {
			return '';
		}

		return renderListFileTypeContent(
			'',
			'X' . $pre,
			$formalImageTypeName,
			$fileType,
			true,
			$day,
			['useThumbnails' => true]
		);
	}

	/**
	 * Find a show_images.php URL in helper output.
	 *
	 * Supports both HTML anchor output and plain URL output because helper scripts
	 * have historically emitted both forms.
	 *
	 * @param string $output Raw helper command output.
	 *
	 * @return string|null First show_images.php URL found, or null when absent.
	 */
	private function extractShowImagesUrl(string $output): ?string
	{
		if (preg_match('/href=[\'"]([^\'"]*show_images\.php[^\'"]*)[\'"]/', $output, $matches) === 1) {
			return $matches[1];
		}

		if (preg_match('/\/helpers\/show_images\.php\?[^"\'\s<]+/', $output, $matches) === 1) {
			return $matches[0];
		}

		return null;
	}

	/**
	 * Execute an argv command and collect stdout/stderr.
	 *
	 * proc_open() is intentionally called with an argv array.  stderr is appended
	 * to stdout in the returned message so the UI can show the full command result
	 * in one place.
	 *
	 * @param array<int,string> $argv Complete command argv to execute.
	 *
	 * @return array{error:bool,message:string} Process result and combined output.
	 */
	private function runCommand(array $argv): array
	{
		$descriptors = [
			1 => ['pipe', 'w'],
			2 => ['pipe', 'w'],
		];

		$proc = @proc_open($argv, $descriptors, $pipes, null, []);
		if (!is_resource($proc)) {
			return ['error' => true, 'message' => 'Unable to start process.'];
		}

		stream_set_timeout($pipes[1], 5);
		stream_set_timeout($pipes[2], 5);

		$stdout = stream_get_contents($pipes[1]);
		$stderr = stream_get_contents($pipes[2]);

		fclose($pipes[1]);
		fclose($pipes[2]);

		$code = proc_close($proc);
		$message = trim($stdout);
		$errorOutput = trim($stderr);

		if ($errorOutput !== '') {
			$message = $message === '' ? $errorOutput : $message . PHP_EOL . $errorOutput;
		}

		return [
			'error' => $code !== 0,
			'message' => $message,
		];
	}
}

(new HELPERSUTIL())->run();
