<?php
declare(strict_types=1);

include_once('functions.php');
initialize_variables();
include_once('authenticate.php');

/**
 * UTILBASE
 *
 * Minimal HTTP utility base class that turns a `?request=Foo` + HTTP verb
 * into a method call like `getFoo()`, `postFoo()`, etc., with:
 *  - Allow-listed routing via getRoutes()
 *  - Optional XHR-only enforcement (for AJAX APIs)
 *  - Central CSRF validation for unsafe verbs
 *  - Consistent JSON/plain responses and error helpers
 *  - Small proc runner (runProcess) for calling external tools safely
 *
 * Usage:
 *   class MYUTIL extends UTILBASE {
 *     protected function getRoutes(): array {
 *       return ['SaveThing' => ['post'], 'ListThings' => ['get']];
 *     }
 *     public function getListThings(): void { ... }
 *     public function postSaveThing(): void { ... }
 *   }
 *   (new MYUTIL())->run();
 *
 * Notes:
 *  - Only routes returned by getRoutes() are callable.
 *  - For POST/PUT/PATCH/DELETE, CSRFValidate() must exist and pass.
 *  - If the request's Accept header includes application/json (or is empty),
 *    responses default to JSON; otherwise plain text is sent.
 */
class UTILBASE
{
    /** The requested operation name from `?request=...` (e.g. "SaveThing") */
    protected string $request = '';

    /** Lowercased HTTP method ("get", "post", ...) */
    protected string $method  = 'get';

    /** Whether responses should default to JSON (derived from Accept header) */
    protected bool   $jsonResponse = true;

    /** If true, only accept XMLHttpRequest (AJAX) calls */
    protected bool   $requireAjax  = true;

    /**
     * Entry point called by the concrete script.
     * 1) Parse/validate method, request, and Accept header
     * 2) Optionally require XHR
     * 3) Dispatch to the matching handler
     */
    public function run(): void
    {
        $this->sanitiseRequest();
        if ($this->requireAjax) {
            $this->checkXHRRequest();
        }
        $this->dispatch();
    }

    /**
     * Allow-list of route names => allowed verbs.
     * Child classes override this to declare what they expose.
     * Example: return ['SaveThing' => ['post'], 'ListThings' => ['get']];
     */
    protected function getRoutes(): array { return []; }

    /**
     * Reject non-AJAX callers when $requireAjax is true.
     * Prevents random direct hits and enforces your API surface.
     */
    protected function checkXHRRequest(): void
    {
        $hdr = $_SERVER['HTTP_X_REQUESTED_WITH'] ?? '';
        if ($hdr === '' || strcasecmp($hdr, 'xmlhttprequest') !== 0) {
            $this->sendHTTPResponse('Not found', 404);
        }
    }

    /**
     * Validate and normalize the incoming request:
     *  - Lowercase method
     *  - Ensure `request` matches a safe identifier (A–Z, 0–9, _)
     *  - Decide JSON vs text responses from the Accept header
     */
    protected function sanitiseRequest(): void
    {
        $this->method = strtolower($_SERVER['REQUEST_METHOD'] ?? 'GET');

        $raw = $_GET['request'] ?? '';
        if (!preg_match('/^[A-Za-z][A-Za-z0-9_]*$/', $raw)) {
            $this->sendHTTPResponse('Invalid request.', 400);
        }
        $this->request = $raw;

        // If the client accepts JSON (or didn't say), send JSON; else send text
        $accepts = $_SERVER['HTTP_ACCEPT'] ?? '';
        $this->jsonResponse =
            (stripos($accepts, 'application/json') !== false) ||
            $accepts === '' ||
            $accepts === '*/*';
    }

    /**
     * Build the handler name and invoke it:
     *   GET  + request=Foo -> getFoo()
     *   POST + request=Foo -> postFoo()
     * Ensures the (Verb, Route) pair is declared in getRoutes(),
     * enforces CSRF on unsafe verbs, and wraps execution in a try/catch.
     */
    protected function dispatch(): void
    {
        $action = $this->method . ucfirst($this->request);

        // Protect against weird/malformed method names
        if (!preg_match('/^(get|post|put|patch|delete)([A-Z][A-Za-z0-9_]*)$/', $action, $m)) {
            $this->sendHTTPResponse('Invalid action.', 400);
        }
        $verb = $m[1];
        $base = $m[2];

        // Route allow-list: only explicitly declared endpoints are callable
        $routes = $this->getRoutes();
        $allowedVerbs = $routes[$base] ?? null;
        if (!$allowedVerbs || !in_array($verb, $allowedVerbs, true)) {
            $this->sendHTTPResponse($this->request . ' is not callable.', 404);
        }

        $methodName = $verb . $base;
        if (!method_exists($this, $methodName)) {
            $this->sendHTTPResponse($this->request . ' is not callable.', 404);
        }

        // Central CSRF check for state-changing requests
        if (in_array($this->method, ['post', 'put', 'delete', 'patch'], true)) {
            if (!function_exists('CSRFValidate') || !CSRFValidate()) {
                // 500 rather than 401/403: treat as server misconfiguration if validator missing/failed
                $this->sendHTTPResponse('Invalid or missing CSRF token.', 500);
            }
        }

        try {
            $this->$methodName();
        } catch (\Throwable $e) {
            // Keep the payload generic but log server-side details
            error_log(static::class . " error in {$methodName}: " . $e->getMessage());
            $this->sendHTTPResponse('Internal error.', 500);
        }
    }

    /** Convenience helpers to send a specific HTTP error with consistent body */
    protected function send400(string $message = ''): void
    {
        $this->sendHTTPResponse($message, 400);
    }
    protected function send401(string $message = ''): void
    {
        $this->sendHTTPResponse($message, 401);
    }
    protected function send403(string $message = ''): void
    {
        $this->sendHTTPResponse($message, 403);
    }
    protected function send404(string $message = ''): void
    {
        $this->sendHTTPResponse($message, 404);
    }
    protected function send500(string $message = ''): void
    {
        $this->sendHTTPResponse($message, 500);
    }

    /**
     * Low-level response sender used by error helpers.
     * Decides JSON vs text based on $jsonResponse and writes the message.
     * Always calls exit to prevent fallthrough.
     */
    protected function sendHTTPResponse(string $message = '', int $httpCode = 200): void
    {
        http_response_code($httpCode);

        if ($this->jsonResponse) {
            header('Content-Type: application/json; charset=utf-8');
            if ($message !== '') {
                echo json_encode(
                    ['error' => true, 'message' => $message],
                    JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE
                );
            }
        } else {
            if ($message !== '') {
                header('Content-Type: text/plain; charset=utf-8');
                echo $message;
            }
        }
        exit;
    }

    /**
     * Success response helper.
     * - Forces JSON content-type.
     * - Allows passing a string that is already JSON (zero-copy fast path).
     * - Encodes arrays/objects safely; on encoding failure, returns an error JSON.
     */
    protected function sendResponse($payload = 'ok', int $httpCode = 200): void
    {
        http_response_code($httpCode);
        header('Content-Type: application/json; charset=utf-8');

        // For non-200, we stop early: callers should have used sendHTTPResponse()
        if ($httpCode !== 200) exit;

        // If a string was passed and it looks like valid JSON, echo as-is
        if (is_string($payload)) {
            json_decode($payload);
            if (json_last_error() === JSON_ERROR_NONE) {
                echo $payload;
                exit;
            }
        }

        // Otherwise encode the payload
        $json = json_encode(
            $payload,
            JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE
        );
        if ($json === false) {
            echo json_encode(['error' => true, 'message' => 'Encoding failed'], JSON_UNESCAPED_SLASHES);
            exit;
        }
        echo $json;
        exit;
    }

    /**
     * Small wrapper around proc_open to execute external utilities safely.
     * - Accepts an argv array (no shell expansion; avoids injection).
     * - Captures stdout/stderr with short timeouts.
     * - Returns ['error'=>bool, 'message'=>string] where message is stdout on success,
     *   or stdout/stderr on failure.
     *
     * Caveats:
     *  - Environment is cleared by default; pass through only what you need.
     *  - If a child expects stdin, this helper would need extending.
     */
    protected function runProcess(array $argv): array
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

        // Short read timeouts so we don't hang forever on misbehaving tools
        stream_set_timeout($pipes[1], 5);
        stream_set_timeout($pipes[2], 5);

        $stdout = stream_get_contents($pipes[1]);
        $stderr = stream_get_contents($pipes[2]);

        fclose($pipes[1]);
        fclose($pipes[2]);

        $code = proc_close($proc);

        if ($code !== 0) {
            // Prefer stdout if a tool prints errors there; otherwise stderr
            return ['error' => true, 'message' => ($stdout !== '' ? $stdout : $stderr)];
        }
        return ['error' => false, 'message' => (string)$stdout];
    }

    protected function startsWith ($string, $startString) {
        $len = strlen($startString);
        return (substr($string, 0, $len) === $startString);
    }

    protected function endsWith($string, $endString) {
        $len = strlen($endString);
        if ($len == 0) {
            return true;
        }
        return (substr($string, -$len) === $endString);
    }

    protected function changeOwner($filename) {
        $user = get_current_user();
        exec("sudo chown " . $user . " " . $filename);
    }

    protected function getVariableList($return=false, $empty=false, $indexed=false)
    {
        $showEmpty = trim((string)filter_input(INPUT_GET, 'showempty', FILTER_UNSAFE_RAW));
        if ($showEmpty === '') {
            $showEmpty = 'no';
        }
        $module = trim((string)filter_input(INPUT_GET, 'module', FILTER_UNSAFE_RAW));

        // Build argv for runProcess (no shell)
        $argv = [
            '/usr/bin/python3',
            ALLSKY_HOME . '/scripts/modules/allskyvariables/allskyvariables.py',
            '--print',
        ];

        // Include --empty unless explicitly "no"
        if (strcasecmp($showEmpty, 'no') !== 0 || $empty) {
            $argv[] = '--empty';
        }

        if ($indexed) {
            $argv[] = '--indexed';
        }

        if ($module !== '') {
            $argv[] = '--module';
            $argv[] = $module;
        }

        $argv[] = '--allskyhome';
        $argv[] = ALLSKY_HOME;

        // Execute
        $result = $this->runProcess($argv);
        if ($result['error']) {
            $this->send500('Variable list retrieval failed: ' . trim($result['message']));
        }

        $stdout = trim($result['message']);        
        if ($return) {
            return $stdout;
        } else {
            $firstLine = strtok($stdout, "\r\n");
            $this->sendResponse($firstLine !== false ? $firstLine : $stdout);
        }
    }

}