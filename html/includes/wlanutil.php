<?php
declare(strict_types=1);

include_once('functions.php');
initialize_variables();
include_once('authenticate.php');
include_once('utilbase.php');

class WLANUTIL extends UTILBASE
{
    protected function getRoutes(): array
    {
        return [
            'Control' => ['post'],
        ];
    }

    private function getWlanInterfaces(): array
    {
        $output = [];
        $dq = '"';
        $cmd = "hwinfo --network --short | gawk '{ if (\$2 == {$dq}WLAN{$dq}) print \$1; }'";
        exec($cmd, $output, $retval);
        if ($retval !== 0) {
            return [];
        }

        return array_values(array_filter(array_map('trim', $output), static function ($value) {
            return $value !== '';
        }));
    }

    private function isValidWlanInterface(string $interface): bool
    {
        return in_array($interface, $this->getWlanInterfaces(), true);
    }

    public function postControl(): void
    {
        $input = json_decode((string) file_get_contents('php://input'), true);
        if (!is_array($input)) {
            $this->send400('Invalid request payload.');
        }

        $interface = trim((string) ($input['interface'] ?? ''));
        $action = strtolower(trim((string) ($input['action'] ?? '')));

        if ($interface === '' || !$this->isValidWlanInterface($interface)) {
            $this->send400('Invalid wireless interface.');
        }

        if (!in_array($action, ['start', 'stop'], true)) {
            $this->send400('Invalid action.');
        }

        $status = get_interface_status("ifconfig " . escapeshellarg($interface));
        if ($action === 'start') {
            if (is_interface_up($status)) {
                $this->sendResponse([
                    'ok' => true,
                    'message' => "Interface {$interface} is already up.",
                ]);
            }

            exec("sudo ifconfig " . escapeshellarg($interface) . " up 2>&1", $output, $code);
            $updated = get_interface_status("ifconfig " . escapeshellarg($interface));
            if (!is_interface_up($updated)) {
                $message = empty($output) ? "Unable to start interface {$interface}." : implode("\n", $output);
                $this->sendResponse([
                    'ok' => false,
                    'message' => $message,
                ]);
            }

            $message = is_interface_running($updated)
                ? "Interface {$interface} started."
                : "Interface {$interface} started but nothing is connected to it.";

            $this->sendResponse([
                'ok' => true,
                'message' => $message,
            ]);
        }

        if (!is_interface_up($status)) {
            $this->sendResponse([
                'ok' => true,
                'message' => "Interface {$interface} is already down.",
            ]);
        }

        exec("sudo ifconfig " . escapeshellarg($interface) . " down 2>&1", $output, $code);
        $updated = get_interface_status("ifconfig " . escapeshellarg($interface));
        if (is_interface_up($updated)) {
            $message = empty($output) ? "Unable to stop interface {$interface}." : implode("\n", $output);
            $this->sendResponse([
                'ok' => false,
                'message' => $message,
            ]);
        }

        $this->sendResponse([
            'ok' => true,
            'message' => "Interface {$interface} stopped.",
        ]);
    }
}

(new WLANUTIL())->run();
