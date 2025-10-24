<?php

declare(strict_types=1);

include_once('functions.php');
initialize_variables();
include_once('authenticate.php');

/**
 * ADMINUTIL
 *
 * Password/username change endpoints with JSON responses.
 * Security highlights:
 * - Requires valid CSRF token for state-changing POSTs.
 * - Verifies current password before allowing updates.
 * - Uses allow-listed routing and JSON-only responses.
 * - Invokes external password policy checker without a shell.
 * - Writes secrets (caller must ensure permissions).
 */
class ADMINUTIL
{
	/** @var string|null Parsed "request" action name (e.g., "validate") */
	private $request;

	/** @var string Lowercased HTTP method (e.g., "post") */
	private $method;

	/** @var bool Whether client prefers JSON (Accept header); informational only */
	private $jsonResponse = false;

	/** @var string Current admin username from env file */
	private $adminUser;

	/** @var string Current admin password hash from env file */
	private $adminPassword;

	/**
	 * Allow-list of routes:
	 * method => [ request => handlerMethod ]
	 * Only these combinations will be dispatched.
	 */
	private const ROUTES = [
		'post' => [
			'validate'       => 'postValidate',
			'passwordformat' => 'postPasswordFormat',
		],
		'get' => [
			// No GET routes are exposed for this controller
		],
	];

	/**
	 * Bootstrap session and load credentials from the env JSON.
	 * Note: caller should ensure ALLSKY_ENV is non-world-readable.
	 */
	public function __construct()
	{
		if (session_status() !== PHP_SESSION_ACTIVE) {
			session_start();
		}

		$privateVars = get_decoded_json_file(ALLSKY_ENV, true, '');
		$this->adminUser     = (string)($privateVars['WEBUI_USERNAME'] ?? '');
		$this->adminPassword = (string)($privateVars['WEBUI_PASSWORD'] ?? '');
	}

	/**
	 * Entry point: soft-gate on XHR, parse request, dispatch.
	 */
	public function run(): void
	{
		$this->checkXHRRequest();   // UX barrier only; not a security control
		$this->sanitizeRequest();   // Normalize request + method
		$this->runRequest();        // Route to handler
	}

	/**
	 * Treat non-XHR access as 404 to reduce casual probing.
	 * Do not rely on this for security; CSRF + auth checks apply elsewhere.
	 */
	private function checkXHRRequest(): void
	{
		$xrw = $_SERVER['HTTP_X_REQUESTED_WITH'] ?? '';
		if (!$xrw || strtolower($xrw) !== 'xmlhttprequest') {
			$this->send404();
		}
	}

	/**
	 * Normalize and record request name, method, and Accept header.
	 */
	private function sanitizeRequest(): void
	{
		$this->request = isset($_GET['request']) ? strtolower(trim((string)$_GET['request'])) : null;
		$this->method  = strtolower((string)($_SERVER['REQUEST_METHOD'] ?? 'get'));

		$accepts = (string)($_SERVER['HTTP_ACCEPT'] ?? '');
		if (stripos($accepts, 'application/json') !== false) {
			$this->jsonResponse = true;
		}
	}

	/* ======================= Unified JSON responders ======================= */

	/**
	 * Emit a JSON response and terminate execution.
	 *
	 * @param mixed $data
	 * @param int $status HTTP status code
	 */
	private function json($data, int $status = 200): void
	{
		http_response_code($status);
		header('Content-Type: application/json; charset=utf-8');
		header('X-Content-Type-Options: nosniff');
		// Sensitive responses should not be cached by intermediaries:
		header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

		echo json_encode($data, JSON_UNESCAPED_SLASHES);
		exit;
	}

	/** 400 helper */
	private function send400(string $message = "Bad Request"): void
	{
		$this->json(['error' => true,  'message' => $message], 400);
	}

	/** 401 helper */
	private function send401(string $message = "Unauthorized"): void
	{
		$this->json(['error' => true,  'message' => $message], 401);
	}

	/** 404 helper */
	private function send404(string $message = "Not Found"): void
	{
		$this->json(['error' => true,  'message' => $message], 404);
	}

	/** 500 helper */
	private function send500(string $message = "Server Error"): void
	{
		$this->json(['error' => true,  'message' => $message], 500);
	}

	/** 200 helper */
	private function sendOK($payload = 'ok'): void
	{
		$this->json(['error' => false, 'message' => $payload], 200);
	}

	/* ======================= Dispatcher (allow-list) ======================= */

	/**
	 * Look up the handler for the method+request combination and invoke it.
	 * Unknown or disallowed routes return 404.
	 */
	private function runRequest(): void
	{
		$req = $this->request ?? '';
		$method = $this->method;

		$handler = self::ROUTES[$method][$req] ?? null;
		if (!$handler || !method_exists($this, $handler)) {
			$this->send404();
		}
		$this->$handler();
	}

	/* ========== Secure process execution (argv, no shell expansion) ========== */

	/**
	 * Execute a command via proc_open with argv array (no shell).
	 * Captures stdout/stderr with short read timeouts to avoid hangs.
	 *
	 * @param array<int,string> $argv
	 * @return array{error:bool,message:string}
	 */
	private function runProcess(array $argv): array
	{
		$descriptors = [
			1 => ['pipe', 'w'], // stdout
			2 => ['pipe', 'w'], // stderr
		];

		// Provide an empty env by default; call-site can pass a safe allow-list if needed.
		$env = [];
		$cwd = null;

		$proc = @proc_open($argv, $descriptors, $pipes, $cwd, $env);
		if (!is_resource($proc)) {
			return ['error' => true, 'message' => 'Unable to start process'];
		}

		// Non-blocking-ish reads with short timeouts
		stream_set_timeout($pipes[1], 5);
		stream_set_timeout($pipes[2], 5);

		$stdout = stream_get_contents($pipes[1]);
		$stderr = stream_get_contents($pipes[2]);

		fclose($pipes[1]);
		fclose($pipes[2]);

		$code = proc_close($proc);

		if ($code !== 0) {
			return ['error' => true, 'message' => ($stdout !== '' ? $stdout : $stderr)];
		}
		return ['error' => false, 'message' => (string)$stdout];
	}

	/**
	 * Call validatePassword.sh with secure/no-secure mode.
	 * NOTE: The password is currently passed as argv (visible to local users
	 * via process listings). Consider switching to stdin or a 0600 temp file.
	 *
	 * @param bool $useOnline true for strict checks; false adds --nosecure
	 * @param string $password plaintext password to validate
	 * @return array{error:bool,message:string}
	 */
	private function validatePassword(bool $useOnline, string $password): array
	{
		$argv = [ALLSKY_UTILITIES . '/validatePassword.sh'];
		if (!$useOnline) {
			$argv[] = '--nosecure';
		}
		$argv[] = '--password';
		$argv[] = $password; // argv avoids shell metacharacter injection, but leaks in process list

		return $this->runProcess($argv);
	}

	/* ============================== Routes ============================== */

	/**
	 * POST /?request=passwordformat
	 * Returns the password policy/format text based on the "useonline" flag.
	 * Requires a valid CSRF token.
	 */
	public function postPasswordFormat(): void
	{
		if (!CSRFValidate()) {
			$this->send401();
		}

		$useonline = (bool) filter_input(INPUT_POST, 'useonline', FILTER_VALIDATE_BOOLEAN);

		$argv = [ALLSKY_UTILITIES . '/validatePassword.sh', '--getformat'];
		if (!$useonline) {
			$argv[] = '--nosecure';
		}

		$result = $this->runProcess($argv);
		if ($result['error']) {
			$this->send400('Unable to get password format');
		} else {
			$this->sendOK($result['message']);
		}
	}

	/**
	 * POST /?request=validate
	 * Validates CSRF, checks old password, validates new password using external
	 * policy script, then updates username/hash in the env file. Ends by logging
	 * out the current session.
	 */
	public function postValidate(): void
	{
		if (!CSRFValidate()) {
			$this->send401();
		}

		// Read raw inputs (avoid lossy sanitizers for secrets)
		$new_username   = trim((string) filter_input(INPUT_POST, 'username', FILTER_UNSAFE_RAW));
		$old            = (string) filter_input(INPUT_POST, 'oldpass', FILTER_UNSAFE_RAW);
		$new1           = (string) filter_input(INPUT_POST, 'newpass', FILTER_UNSAFE_RAW);
		$new2           = (string) filter_input(INPUT_POST, 'newpassagain', FILTER_UNSAFE_RAW);
		$useWebUILogin  = (bool) filter_input(INPUT_POST, 'as-enable-webui-login', FILTER_VALIDATE_BOOLEAN);
		$useonline      = (bool) filter_input(INPUT_POST, 'as-use-online', FILTER_VALIDATE_BOOLEAN);

		if ($new_username === '') {
			$this->send400('You must enter the username.');
		}
		// Basic username allow-list — adjust to your policy as needed
		if (!preg_match('/^[A-Za-z0-9_.-]{1,64}$/', $new_username)) {
			$this->send400('Username contains invalid characters.');
		}

		if ($old === '' || $new1 === '' || $new2 === '') {
			$this->send400('You must enter the old (current) password, and the new password twice.');
		}

		// Verify current password hash
		if (!password_verify($old, $this->adminPassword)) {
			$this->send400('The old password is incorrect.');
		}

		// Confirm new password entries match
		if ($new1 !== $new2) {
			$this->send400('New passwords do not match.');
		}

		// External password policy validation (secure vs no-secure)
		$result = $this->validatePassword($useonline, $new1);
		if ($result['error']) {
			$this->send400($result['message']);
		}

		// Update env secrets (call-site must ensure secure perms on ALLSKY_ENV)
		$privateVars = get_decoded_json_file(ALLSKY_ENV, true, "");
		$privateVars['WEBUI_USERNAME'] = $new_username;

		// Password hashing: BCRYPT is fine; consider PASSWORD_DEFAULT for forward-compat.
		$privateVars['WEBUI_PASSWORD'] = password_hash($new1, PASSWORD_BCRYPT);

		$encoded = json_encode($privateVars, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
		if ($encoded === false) {
			$this->send500('Failed to encode secrets.');
		}

		if (file_put_contents(ALLSKY_ENV, $encoded, LOCK_EX) === false) {
			$this->send500('Failed to write temp secrets file.');
		}

		// Optionally toggle "uselogin" in settings when enabled
		if ($useWebUILogin) {
			$content = readSettingsFile();
			if (($content['uselogin'] ?? null) !== $useWebUILogin) {
				$content['uselogin'] = $useWebUILogin;
				$settings_file = getSettingsFile();
				$mode = JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION;
				$payload = json_encode($content, $mode);
				$msg = updateFile($settings_file, $payload, "settings", false);
			}
		}

		// Invalidate current session after credential change
		$_SESSION['auth'] = false;
		$_SESSION['user'] = '';
		if (function_exists('session_regenerate_id')) {
			@session_regenerate_id(true);
		}

		$this->sendOK("$new_username password updated. You have been logged out; log in with the new credentials.");
	}
}

$supportUtil = new ADMINUTIL();
$supportUtil->run();
