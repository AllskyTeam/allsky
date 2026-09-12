<?php
declare(strict_types=1);

include_once('includes/utilbase.php');

/**
 * Execute WebUI message actions.
 *
 * This endpoint keeps the existing /execute.php?ID=... interface used by
 * message links, but executes only known argv commands via UTILBASE::runProcess().
 */
class EXECUTEUTIL extends UTILBASE
{
	private bool $useText = false;
	private string $eS = '<p class="errorMsgBig">';
	private string $eE = '</p>';
	private string $wS = '<p style="font-size: 115%; background-color: #fcf8e3">';
	private string $wE = '</p>';
	private string $sep = '<br>';

	public function run(): void
	{
		[$rawId, $id, $args] = $this->readCommandRequest();

		$this->startOutput($id);

		if ($id === null) {
			$this->writeError("No 'id' specified!");
			$this->finishOutput(1);
		}

		switch ($id) {
			case 'AM_RM_PRIOR':		// Remove prior version of Allsky.
				$this->rmObject(ALLSKY_PRIOR_DIR, "Prior Allsky directory '" . ALLSKY_PRIOR_DIR . "' removed.");
				$this->rmObject(ALLSKY_OLD_REMINDER);
				$this->rmMsg($rawId ?? $id);
				break;

			case 'AM_RM_CHECK':		// Remove log from checkAllsky.sh.
				$this->rmObject(ALLSKY_CHECK_LOG, 'Changes recorded.');
				$this->rmMsg($rawId ?? $id);
				break;

			case 'AM_RM_POST':		// Remove log of post-installation actions.
				if ($this->rmObject(ALLSKY_POST_INSTALL_ACTIONS, 'Deleted list of actions to perform.')) {
					$this->rmMsg($rawId ?? $id);
				}
				break;

			case 'AM_RM_ABORTS':	// Remove the specified "have been aborted" file.
				$removedAbortCounter = $this->rmAbortCounter($args);
				if ($removedAbortCounter === null) {
					$this->finishOutput(1);
				}
				if ($removedAbortCounter) {
					$this->rmMsg($rawId ?? $id);
				}
				break;

			case 'AM_NOT_SUPPORTED':		// Not supported camera.
				$argv = $this->buildNotSupportedCommand($id, $args);
				if ($argv === null) {
					$this->finishOutput(1);
				}
				$this->executeArgv($argv);
				$this->rmMsg($rawId ?? $id);
				break;

			case 'AM_ALLSKY_CONFIG':
			case 'allsky-config':
				$argv = $this->buildAllskyConfigCommand($id, $args);
				if ($argv === null) {
					$this->finishOutput(1);
				}
				$this->executeArgv($argv);
				break;

			default:
				$this->writeError("ERROR: Unknown command ID: '" . $this->displayValue($id) . "'.");
				break;
		}

		$this->finishOutput();
	}

	/**
	 * @return array{0:?string,1:?string,2:array<int,string>}
	 */
	private function readCommandRequest(): array
	{
		$rawId = getVariableOrDefault($_REQUEST, 'ID', null);
		if ($rawId === null) {
			$rawId = getVariableOrDefault($_REQUEST, 'id', null);
			if ($rawId !== null) {
				$this->useText = true;
			}
		}

		if ($rawId === null) {
			return [null, null, []];
		}

		$rawId = (string)$rawId;
		$parts = preg_split('/\s+/', trim($rawId), -1, PREG_SPLIT_NO_EMPTY);
		if ($parts === false || $parts === []) {
			return [$rawId, '', []];
		}

		$id = array_shift($parts);

		return [$rawId, $id, $parts];
	}

	private function startOutput(?string $id): void
	{
		if ($this->useText) {
			$this->eS = '';
			$this->eE = "\n";
			$this->wS = '';
			$this->wE = "\n";
			$this->sep = "\n";
			return;
		}

		$title = htmlspecialchars((string)$id, ENT_QUOTES, 'UTF-8');
		echo <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="utf-8">
	<meta http-equiv="X-UA-Compatible" content="IE=edge">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
	<meta http-equiv="Pragma" content="no-cache" />
	<meta http-equiv="Expires" content="0" />
	<link rel="stylesheet" type="text/css" href="allsky/font-awesome/css/all.min.css">
	<link href="css/allsky.css" rel="stylesheet">
	<link rel="shortcut icon" type="image/png" href="/favicon.ico">
	<title>Execute {$title}</title>
</head>
<body>
HTML;
	}

	private function finishOutput(int $exitCode = 0): void
	{
		if (!$this->useText) {
			echo "\n</body>\n</html>\n";
		}
		exit($exitCode);
	}

	private function writeError(string $message): void
	{
		echo "{$this->eS}{$message}{$this->eE}";
	}

	private function buildNotSupportedCommand(string $id, array $args): ?array
	{
		if ($args === []) {
			$this->writeError("ERROR: Argument not given to command ID: '{$this->displayValue($id)}'.");
			return null;
		}

		if (count($args) !== 1) {
			$this->writeError("ERROR: Invalid argument count for command ID: '{$this->displayValue($id)}'.");
			return null;
		}

		$cameraType = strtolower($args[0]);
		if (!in_array($cameraType, ['--rpi', '--zwo'], true)) {
			$this->writeError("ERROR: Invalid camera type: '" . $this->displayValue($args[0]) . "'.");
			return null;
		}

		return $this->sudoOwnerArgv([
			ALLSKY_SCRIPTS . '/allsky-config',
			'show_supported_cameras',
			'--html',
			$cameraType,
		]);
	}

	private function buildAllskyConfigCommand(string $id, array $args): ?array
	{
		if ($args === []) {
			$this->writeError("ERROR: Argument not given to command ID: '{$this->displayValue($id)}'.");
			return null;
		}

		$command = strtolower(array_shift($args));
		foreach ($args as $arg) {
			if (str_contains($arg, "\0")) {
				$this->writeError("ERROR: invalid option for allsky-config {$this->displayValue($command)}.");
				return null;
			}
		}

		return $this->sudoOwnerArgv(array_merge(
			[ALLSKY_SCRIPTS . '/allsky-config', $command],
			$args
		));
	}

	private function rmMsg(string $id): void
	{
		$this->executeArgv($this->sudoOwnerArgv([
			ALLSKY_SCRIPTS . '/addMessage.sh',
			'--id',
			$id,
			'--delete',
		]));
	}

	private function rmAbortCounter(array $args): ?bool
	{
		if ($args === []) {
			$this->writeError("ERROR: Argument not given to command ID: 'AM_RM_ABORTS'.");
			return null;
		}

		if (count($args) !== 1) {
			$this->writeError('ERROR: Invalid argument count for command ID: AM_RM_ABORTS.');
			return null;
		}

		$file = $args[0];
		if (!in_array($file, $this->allowedAbortCounterFiles(), true)) {
			$this->writeError("ERROR: Invalid abort counter file: '" . $this->displayValue($file) . "'.");
			return null;
		}

		$target = rtrim(ALLSKY_ABORTS_DIR, '/') . '/' . $file;

		return $this->rmObject($target, 'File removed.');
	}

	/**
	 * @return array<int,string>
	 */
	private function allowedAbortCounterFiles(): array
	{
		$files = ['uploads.txt', 'timelapse.txt', 'saveImage.txt'];
		foreach (['ALLSKY_ABORTEDUPLOADS', 'ALLSKY_ABORTEDTIMELAPSE', 'ALLSKY_ABORTEDSAVEIMAGE'] as $constant) {
			if (defined($constant)) {
				$files[] = (string)constant($constant);
			}
		}

		return array_values(array_unique($files));
	}

	private function rmObject(string $item, ?string $successMsg = null): bool
	{
		if (!is_file($item) && !is_dir($item)) {
			echo "{$this->wS}[{$this->displayValue($item)}] not found so cannot remove; you can safely close this window.{$this->wE}";
			return false;
		}

		$ret = $this->executeArgv(
			$this->sudoOwnerArgv(['/bin/rm', '-fr', '--', $item]),
			true
		);

		if ($ret === '') {
			$msg = $successMsg ?? "Removed '{$this->displayValue($item)}'";
			$msg .= $this->useText ? "\n\n" : '<br><br>';
			$msg .= 'Return to the WebUI and refresh the window.';
		} else {
			$msg = "{$this->eS}Unable to remove '{$this->displayValue($item)}': {$ret}{$this->eE}";
		}

		if ($this->useText) {
			echo $msg;
		} else {
			echo "<span style='font-size: 200%'>{$msg}</span>";
		}

		return true;
	}

	/**
	 * Execute a known argv command. On error, return the error message.
	 */
	private function executeArgv(array $argv, bool $outputToConsole = false): string
	{
		$result = $this->runProcess($argv);
		$output = (string)($result['message'] ?? '');
		$code = (int)($result['code'] ?? (($result['error'] ?? false) ? 1 : 0));

		if ($output !== '' && !$this->useText) {
			$output = str_replace(["\r\n", "\r", "\n"], $this->sep, $output);
		}

		$displayCommand = $this->formatCommand($argv);
		if (!$this->useText && $outputToConsole) {
			echo "<script>console.log(";
			echo json_encode("[{$displayCommand}] returned {$code}, result={$output}", JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
			echo ");</script>\n";
		}

		return $this->checkRet($displayCommand, $code, $output) === 0 ? '' : $output;
	}

	private function checkRet(string $cmd, int $returnCode, string $returnString): int
	{
		if ($returnCode === ALLSKY_EXIT_ERROR_STOP) {
			echo "{$this->eS}ERROR while executing:{$this->sep}{$this->displayValue($cmd)}; return code: {$returnCode}{$this->eE}.";
		} elseif ($returnCode === ALLSKY_EXIT_PARTIAL_OK) {
			$returnCode = 0;
		}

		if ($returnString !== '') {
			if ($this->useText) {
				echo $returnString;
			} else {
				echo "<pre style='font-size: 115%'>";
				echo $returnString;
				echo '</pre>';
			}
		}

		return $returnCode;
	}

	private function sudoOwnerArgv(array $argv): array
	{
		return array_merge(
			['/usr/bin/sudo', '-n', '--user=' . ALLSKY_OWNER],
			$argv
		);
	}

	private function formatCommand(array $argv): string
	{
		return implode(' ', array_map('escapeshellarg', $argv));
	}

	private function displayValue(string $value): string
	{
		return $this->useText ? $value : htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
	}
}

(new EXECUTEUTIL())->run();
