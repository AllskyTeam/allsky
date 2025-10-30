<?php
include_once('functions.php');
initialize_variables();
include_once('authenticate.php');

class UIUTIL
{
    private string $request = '';
    private string $method = '';
    private bool $jsonResponse = false;
    private bool $returnValues = false;
    private string $allskyHome;

    public function __construct()
    {
        $this->allskyHome = ALLSKY_HOME;
    }

    // Entry point for all incoming requests
    public function run(): void
    {
        $this->checkXHRRequest();
        $this->sanitizeRequest();
        $this->runRequest();
    }

    // Ensures the request originated from an XMLHttpRequest or fetch
    private function checkXHRRequest(): void
    {
        $xhr = $_SERVER['HTTP_X_REQUESTED_WITH'] ?? '';
        if (strcasecmp($xhr, 'xmlhttprequest') !== 0) {
            $this->send404();
        }
    }

    // Cleans input parameters and sets response mode
    private function sanitizeRequest(): void
    {
        $req = $_GET['request'] ?? '';
        $req = preg_replace('/[^a-zA-Z0-9_]/', '', $req);
        $this->request = $req;

        $this->method = strtolower($_SERVER['REQUEST_METHOD'] ?? 'get');

        $accepts = $_SERVER['HTTP_ACCEPT'] ?? '';
        if (stripos($accepts, 'application/json') !== false) {
            $this->jsonResponse = true;
        }
    }

    // Sends a 404 response and stops execution
    private function send404(): void
    {
        http_response_code(404);
        exit('404 Not Found');
    }

    // Sends a 500 response with an optional message
    private function send500(string $msg = 'Internal Server Error'): void
    {
        http_response_code(500);
        header('Content-Type: text/plain; charset=utf-8');
        echo htmlspecialchars($msg, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        exit;
    }

    // Sends a sanitized response to the client
    private function sendResponse($response = 'ok', bool $isJson = false): void
    {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        $host = $_SERVER['HTTP_HOST'] ?? '';
        $allow_origin = '';

        if ($origin && stripos($origin, $host) !== false) {
            $allow_origin = $origin;
        } else {
            $allow_origin = 'null';
        }

        header('Vary: Origin');
        header("Access-Control-Allow-Origin: $allow_origin");
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, X-Requested-With, Authorization, X-CSRF-Token');
        header('Access-Control-Allow-Credentials: true');
        header('Cache-Control: no-store, no-cache, must-revalidate');

        if ($isJson) {
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode($response, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        } else {
            header('Content-Type: text/html; charset=UTF-8');
            // Output raw HTML so .html() inserts real elements
            echo (string)$response;
        }
        exit;
    }

    // Validates and dispatches a request to an allowed method
    private function runRequest(): void
    {
        $action = $this->method . ucfirst($this->request);

        $allowedMethods = [
            'getAllskyStatus',
            'getCPULoad',
            'getCPUTemp',
            'getMemoryUsed',
            'getThrottleStatus',
            'getUptime',
            'postMultiple'
        ];

        if (!in_array($action, $allowedMethods, true) || !method_exists($this, $action)) {
            $this->send404();
        }

        if (in_array($this->method, ['post', 'put', 'delete', 'patch'], true)) {
            if (!function_exists('CSRFValidate') || !CSRFValidate()) {
                $this->send500('Invalid or missing CSRF token.');
            }
        }

        try {
            $this->$action();
        } catch (Throwable $e) {
            error_log("UIUTIL Error: " . $e->getMessage());
            $this->send500();
        }
    }

    // Creates a styled progress bar element with safe output
    private function displayProgress($x, $data, $min, $current, $max, $danger, $warning, $status_override): string
    {
        $myStatus = $status_override ?: (
            $current >= $danger ? 'danger' :
            ($current >= $warning ? 'warning' : 'success')
        );

        $current = max($min, min($current, $max));
        $width = (($current - $min) / ($max - $min)) * 100;
        $dataEsc = htmlspecialchars((string)$data, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');

        return sprintf(
            "<div class='progress-bar progress-bar-not-animated progress-bar-%s' ".
            "role='progressbar' title='current: %s, min: %s, max: %s' ".
            "aria-valuenow='%s' aria-valuemin='%s' aria-valuemax='%s' ".
            "style='width: %.2f%%;'><span class='nowrap'>%s</span></div>",
            htmlspecialchars($myStatus, ENT_QUOTES, 'UTF-8'),
            $current, $min, $max, $current, $min, $max, $width, $dataEsc
        );
    }

    // Returns the overall system status
    public function getAllskyStatus(): void
    {
        $result = output_allsky_status();
        $this->sendResponse($result, $this->jsonResponse);
    }

    // Returns CPU load percentage with a visual bar
    public function getCPULoad(): void
    {
        $cpuLoad = (float)getCPULoad(1);
        $bar = $this->displayProgress('', "$cpuLoad%", 0, $cpuLoad, 100, 90, 75, '');
        $this->sendResponse($bar);
    }

    // Returns CPU temperature with formatted output
    public function getCPUTemp(): void
    {
        $data = getCPUTemp();
        $temp = (float)$data['temperature'];
        $bar = $this->displayProgress('', htmlspecialchars($data['display_temperature'], ENT_QUOTES), 0, $temp, 100, 70, 60, $data['temperature_status']);
        $this->sendResponse($bar);
    }

    // Returns system memory usage percentage
    public function getMemoryUsed(): void
    {
        $used = (float)getMemoryUsed();
        $bar = $this->displayProgress('', "$used%", 0, $used, 100, 90, 75, '');
        $this->sendResponse($bar);
    }

    // Returns hardware throttle information
    public function getThrottleStatus(): void
    {
        $data = getThrottleStatus();
        $bar = $this->displayProgress('', htmlspecialchars($data['throttle'], ENT_QUOTES), 0, 100, 100, -1, -1, $data['throttle_status']);
        $this->sendResponse($bar);
    }

    // Returns system uptime string
    public function getUptime(): void
    {
        $uptime = htmlspecialchars(getUptime(), ENT_QUOTES);
        $this->sendResponse($uptime);
    }

    // Handles multiple batched JSON data requests
    public function postMultiple(): void
    {
        $input = file_get_contents('php://input');
        if (strlen($input) > 1000000) {
            $this->send500('Request too large.');
        }

        try {
            $data = json_decode($input, true, 10, JSON_THROW_ON_ERROR);
        } catch (Throwable $e) {
            $this->send500('Invalid JSON payload.');
        }

        if (!is_array($data)) {
            $this->send500('Invalid request format.');
        }

        $this->returnValues = true;
        $result = [];

        foreach ($data as $key => $value) {
            if (!isset($value['data'])) continue;
            $methodName = 'get' . preg_replace('/[^a-zA-Z0-9_]/', '', $value['data']);

            if (method_exists($this, $methodName)) {
                try {
                    $result[$value['data']] = call_user_func([$this, $methodName]);
                } catch (Throwable $e) {
                    $result[$value['data']] = 'Error: ' . $e->getMessage();
                }
            } else {
                $result[$value['data']] = 'Invalid method.';
            }
        }

        $this->sendResponse($result, true);
    }
}

// Handles CORS preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Entry point for request processing
$uiUtil = new UIUTIL();
$uiUtil->run();