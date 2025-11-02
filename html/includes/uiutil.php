<?php
include_once('functions.php');
initialize_variables();
include_once('authenticate.php');
include_once('utilbase.php');

/**
 * UIUTIL
 *
 * Small UI-facing endpoint collection for the dashboard.
 * Renders HTML fragments (progress bars, text) rather than JSON by default.
 *
 * Exposed routes:
 *   GET  AllskyStatus   -> overall system status (preformatted string/HTML)
 *   GET  CPULoad        -> CPU load as a bootstrap progress bar
 *   GET  CPUTemp        -> CPU temperature as a progress bar with status color
 *   GET  MemoryUsed     -> Memory usage as a progress bar
 *   GET  ThrottleStatus -> Raspberry Pi throttle state as a colored bar
 *   GET  Uptime         -> Human readable uptime string
 *   POST Multiple       -> Batch several GETs in one JSON request
 *
 * Notes:
 * - This class flips $jsonResponse to false so `sendHTTPResponse()` returns
 *   text/HTML snippets (good for dropping into the DOM).
 * - All user-visible text is escaped; numbers are clamped where appropriate.
 * - The heavy lifting (load/temp/mem/throttle/uptime) comes from helpers
 *   in functions.php.
 */
class UIUTIL extends UTILBASE {

    private bool $returnValues = false;
    
    /** Declare which routes exist and which HTTP verbs are allowed */
    protected function getRoutes(): array
    {
        return [
            'AllskyStatus'   => ['get'],
            'CPULoad'        => ['get'],
            'CPUTemp'        => ['get'],
            'MemoryUsed'     => ['get'],
            'Multiple'       => ['post'],
            'ThrottleStatus' => ['get'],
            'Uptime'         => ['get'],
        ];
    }

    /** Serve HTML/text by default (not JSON) for all responses in this class */
    public function __construct()
    {
        $this->jsonResponse = false;
    }

    /**
     * Build a bootstrap progress bar with safe output.
     *
     * @param mixed       $x                (unused placeholder maintained for compatibility)
     * @param string      $data             Label shown inside the bar
     * @param float|int   $min              Lower bound for clamping
     * @param float|int   $current          Current numeric value
     * @param float|int   $max              Upper bound for clamping
     * @param float|int   $danger           Threshold for red (>=)
     * @param float|int   $warning          Threshold for yellow (>=)
     * @param string      $status_override  Force bar state ('success'|'warning'|'danger'|…)
     *
     * @return string HTML <div> for a progress-bar-* element
     */
    private function displayProgress($x, $data, $min, $current, $max, $danger, $warning, $status_override): string
    {
        // Choose a state: explicit override wins; otherwise decide from thresholds
        $myStatus = $status_override ?: (
            $current >= $danger ? 'danger' :
            ($current >= $warning ? 'warning' : 'success')
        );

        // Keep values sane and compute width
        $current = max($min, min($current, $max));
        $width = (($current - $min) / ($max - $min)) * 100;

        // Return a single progress bar segment with accessible attributes
        return sprintf(
            "<div class='progress-bar progress-bar-not-animated progress-bar-%s' ".
            "role='progressbar' title='current: %s, min: %s, max: %s' ".
            "aria-valuenow='%s' aria-valuemin='%s' aria-valuemax='%s' ".
            "style='width: %.2f%%;'><span class='nowrap'>%s</span></div>",
            htmlspecialchars($myStatus, ENT_QUOTES, 'UTF-8'),
            $current, $min, $max, $current, $min, $max, $width, $data
        );
    }

    /** Overall system status string/HTML as produced by helper code */
    public function getAllskyStatus(): void
    {
        $result = output_allsky_status();
        $this->sendHTTPResponse($result);
    }

    /** CPU load as a percentage progress bar (green→yellow→red) */
    public function getCPULoad()
    {
        $cpuLoad = (float)getCPULoad(1);
        $bar = $this->displayProgress('', "$cpuLoad%", 0, $cpuLoad, 100, 90, 75, '');

        if ($this->returnValues) {
            return $bar;
        }

        $this->sendHTTPResponse($bar);
    }

    /** CPU temperature as a formatted progress bar with status color */
    public function getCPUTemp()
    {
        $data = getCPUTemp(); // ['temperature' => float, 'display_temperature' => '...', 'temperature_status' => 'success|warning|danger']
        $temp = (float)$data['temperature'];
        $bar = $this->displayProgress(
            '',
            $data['display_temperature'],
            0,
            $temp,
            100,
            70,
            60,
            $data['temperature_status']
        );

        if ($this->returnValues) {
            return $bar;
        }

        $this->sendHTTPResponse($bar);
    }

    /** Memory usage as a percentage progress bar */
    public function getMemoryUsed()
    {
        $used = (float)getMemoryUsed();
        $bar = $this->displayProgress('', "$used%", 0, $used, 100, 90, 75, '');

        if ($this->returnValues) {
            return $bar;
        }

        $this->sendHTTPResponse($bar);
    }

    /** Raspberry Pi throttle status as a colored single-segment bar */
    public function getThrottleStatus()
    {
        $data = getThrottleStatus(); // e.g. ['throttle' => '...','throttle_status' => 'success|warning|danger']
        $bar = $this->displayProgress(
            '',
            htmlspecialchars($data['throttle'], ENT_QUOTES),
            0,
            100,
            100,
            -1,
            -1,
            $data['throttle_status']
        );

        if ($this->returnValues) {
            return $bar;
        }

        $this->sendHTTPResponse($bar);
    }

    /** Human-readable uptime string (escaped) */
    public function getUptime()
    {
        $uptime = htmlspecialchars(getUptime(), ENT_QUOTES);

        if ($this->returnValues) {
            return $uptime;
        }

        $this->sendHTTPResponse($uptime);
    }

    /**
     * Batch endpoint: accept a JSON array describing which getters to run,
     * call each one, and return a JSON object of results.
     *
     * Input format (example):
     * [
     *   {"data":"CPULoad"},
     *   {"data":"CPUTemp"},
     *   {"data":"Uptime"}
     * ]
     *
     * Response:
     * {
     *   "CPULoad": "<div class='progress-bar …'>…</div>",
     *   "CPUTemp": "<div class='progress-bar …'>…</div>",
     *   "Uptime":  "1 day 02:33:10"
     * }
     *
     * Security/robustness:
     * - Hard size limit (1 MB) on the JSON body
     * - Only methods whitelisted in getRoutes() and actually implemented are called
     * - Method names derived from user input are sanitized to [a-zA-Z0-9_]
     * - Errors in an individual call return an error string for that key; the batch continues
     */
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

            // Build a safe method name like "getCPULoad"
            $methodName = 'get' . preg_replace('/[^a-zA-Z0-9_]/', '', $value['data']);

            if (method_exists($this, $methodName)) {
                try {
                    // Call the method and capture its return value (if any).
                    // Most getters here directly send output; returned values are included when present.
                    $result[$value['data']] = call_user_func([$this, $methodName]);
                } catch (Throwable $e) {
                    $result[$value['data']] = 'Error: ' . $e->getMessage();
                }
            } else {
                $result[$value['data']] = 'Invalid method.';
            }
        }

        // For the batch endpoint we do respond with JSON
        $this->sendResponse($result);
    }
}

// Script entrypoint
$uiUtil = new UIUTIL();
$uiUtil->run();