<?php

declare(strict_types=1);

include_once('functions.php');
initialize_variables();
include_once('authenticate.php');
include_once('utilbase.php');

/**
 * I2CUTIL
 *
 * Small utility API for I²C management:
 *  - Build: generate/refresh the I²C device database (Python helper)
 *  - Devices: scan the I²C bus and return results
 *  - Data: read the merged I²C config JSON (no subprocess)
 *  - DeviceManager: launch the external device manager helper
 */
class I2CUTIL extends UTILBASE
{
    /** Declare the public endpoints and allowed verbs */
    protected function getRoutes(): array
    {
        return [
            'Build'         => ['get'],
            'Data'          => ['get'],
            'DeviceManager' => ['get'],
            'Devices'       => ['get'],
        ];
    }

    /** Nothing to initialize here; paths come from constants */
    function __construct() {}

    /**
     * GET /?request=Build
     * Run the Python script that (re)builds the I²C database.
     */
    public function getBuild(): void
    {
        // Build an argv list instead of a shell string
        $argv = [
            '/usr/bin/python3',
            ALLSKY_SCRIPTS . '/i2cdatabase.py',
            '--allskyhome',
            ALLSKY_HOME
        ];

        $result = $this->runProcess($argv);
        if ($result['error']) {
            $this->send500('Failed to build I2C database: ' . trim($result['message']));
        }
        $this->sendResponse(trim($result['message']));
    }

    /**
     * GET /?request=Devices
     * Scan the I²C bus and return raw output from the helper.
     */
    public function getDevices(): void
    {
        // Execute with sudo via argv to avoid shell interpolation
        $argv = [
            '/usr/bin/sudo',
            ALLSKY_SCRIPTS . '/i2cbus.py'
        ];

        $result = $this->runProcess($argv);
        if ($result['error']) {
            $this->send500('I2C bus scan failed: ' . trim($result['message']));
        }
        $this->sendResponse(trim($result['message']));
    }

    /**
     * GET /?request=Data
     * Return the current i2c.json contents; no subprocess required.
     */
    public function getData(): void
    {
        $filename = ALLSKY_CONFIG . '/i2c.json';
        $data = @file_get_contents($filename) ?: '{}';
        $this->sendResponse($data);
    }

    /**
     * GET /?request=DeviceManager
     * Launch the external device manager shell helper.
     */
    public function getDeviceManager(): void
    {
        // Pass flags as separate argv items for safety
        $argv = [
            '/usr/bin/sudo',
            ALLSKY_SCRIPTS . '/run_devicemanager.sh',
            '--allsky_home',
            ALLSKY_HOME
        ];

        $result = $this->runProcess($argv);
        if ($result['error']) {
            $this->send500('Device manager launch failed: ' . trim($result['message']));
        }
        $this->sendResponse(trim($result['message']));
    }
}

$i2cUtil = new I2CUTIL();
$i2cUtil->run();