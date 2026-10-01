<?php
declare(strict_types=1);

include_once('functions.php');
initialize_variables();
include_once('authenticate.php');
include_once('utilbase.php');

class LANUTIL extends UTILBASE
{
    protected function getRoutes(): array
    {
        return [
            'Control' => ['post'],
            'GetConfig' => ['get'],
            'SetConfig' => ['post'],
        ];
    }

    private function runCommand(array $argv): array
    {
        $descriptors = [
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ];

        $proc = @proc_open($argv, $descriptors, $pipes, null, []);
        if (!is_resource($proc)) {
            return ['ok' => false, 'code' => 1, 'stdout' => '', 'stderr' => 'Unable to start process'];
        }

        $stdout = (string) stream_get_contents($pipes[1]);
        $stderr = (string) stream_get_contents($pipes[2]);
        fclose($pipes[1]);
        fclose($pipes[2]);
        $code = proc_close($proc);

        return [
            'ok' => $code === 0,
            'code' => $code,
            'stdout' => trim($stdout),
            'stderr' => trim($stderr),
        ];
    }

    private function runNmcli(array $args): array
    {
        $result = $this->runCommand(array_merge(['/usr/bin/sudo', '-n', '/usr/bin/nmcli'], $args));
        if ($result['ok']) {
            return $result;
        }

        $plain = $this->runCommand(array_merge(['/usr/bin/nmcli'], $args));
        if ($plain['ok'] || trim((string) ($plain['stderr'] ?: $plain['stdout'])) !== '') {
            return $plain;
        }

        return $result;
    }

    private function getLanInterfaces(): array
    {
        $output = [];
        $dq = '"';
        $cmd = "hwinfo --network --short | gawk '{ if (\$2 == {$dq}Ethernet{$dq}) print \$1; }'";
        exec($cmd, $output, $retval);
        if ($retval !== 0) {
            return [];
        }

        return array_values(array_filter(array_map('trim', $output), static function ($value) {
            return $value !== '';
        }));
    }

    private function isValidLanInterface(string $interface): bool
    {
        return in_array($interface, $this->getLanInterfaces(), true);
    }

    private function prefixToNetmask(int $prefix): string
    {
        if ($prefix < 0 || $prefix > 32) {
            return '';
        }

        $mask = $prefix === 0 ? 0 : ((~0 << (32 - $prefix)) & 0xFFFFFFFF);
        return long2ip($mask);
    }

    private function netmaskToPrefix(string $netmask): int
    {
        $long = ip2long($netmask);
        if ($long === false) {
            return -1;
        }

        $binary = sprintf('%032b', $long);
        if (!preg_match('/^1*0*$/', $binary)) {
            return -1;
        }

        return substr_count($binary, '1');
    }

    private function getConnectionName(string $interface): string
    {
        $result = $this->runNmcli(['-t', '-f', 'GENERAL.CONNECTION', 'device', 'show', $interface]);
        if ($result['ok']) {
            foreach (preg_split('/\r?\n/', $result['stdout']) as $line) {
                if (strpos($line, 'GENERAL.CONNECTION:') === 0) {
                    $name = trim(substr($line, strlen('GENERAL.CONNECTION:')));
                    if ($name !== '' && $name !== '--') {
                        return $name;
                    }
                }
            }
        }

        $fallback = $this->runNmcli(['-t', '-f', 'NAME,DEVICE', 'connection', 'show']);
        if ($fallback['ok']) {
            foreach (preg_split('/\r?\n/', $fallback['stdout']) as $line) {
                if ($line === '') {
                    continue;
                }
                $parts = explode(':', $line, 2);
                if (($parts[1] ?? '') === $interface && trim((string) ($parts[0] ?? '')) !== '') {
                    return trim($parts[0]);
                }
            }
        }

        return '';
    }

    private function getInterfaceConfig(string $interface): array
    {
        $connectionName = $this->getConnectionName($interface);
        $config = [
            'connectionName' => $connectionName,
            'mode' => 'dhcp',
            'address' => '',
            'netmask' => '',
            'gateway' => '',
            'dns' => '',
        ];

        if ($connectionName === '') {
            return $config;
        }

        $result = $this->runNmcli([
            '-t',
            '-f',
            'ipv4.method,ipv4.addresses,ipv4.gateway,ipv4.dns',
            'connection',
            'show',
            $connectionName
        ]);

        if (!$result['ok']) {
            return $config;
        }

        foreach (preg_split('/\r?\n/', $result['stdout']) as $line) {
            if ($line === '') {
                continue;
            }
            [$key, $value] = array_pad(explode(':', $line, 2), 2, '');
            $value = trim($value);
            if ($key === 'ipv4.method') {
                $config['mode'] = ($value === 'manual') ? 'manual' : 'dhcp';
            } elseif ($key === 'ipv4.addresses' && $value !== '') {
                $first = trim(explode(',', $value)[0]);
                if (preg_match('/^([^\\/]+)\/(\d+)$/', $first, $matches)) {
                    $config['address'] = trim($matches[1]);
                    $config['netmask'] = $this->prefixToNetmask((int) $matches[2]);
                }
            } elseif ($key === 'ipv4.gateway') {
                $config['gateway'] = $value;
            } elseif ($key === 'ipv4.dns') {
                $config['dns'] = str_replace(';', ', ', rtrim($value, ';'));
            }
        }

        return $config;
    }

    public function postControl(): void
    {
        $input = json_decode((string) file_get_contents('php://input'), true);
        if (!is_array($input)) {
            $this->send400('Invalid request payload.');
        }

        $interface = trim((string) ($input['interface'] ?? ''));
        $action = strtolower(trim((string) ($input['action'] ?? '')));

        if ($interface === '' || !$this->isValidLanInterface($interface)) {
            $this->send400('Invalid network interface.');
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

    public function getGetConfig(): void
    {
        $interface = trim((string) ($_GET['interface'] ?? ''));
        if ($interface === '' || !$this->isValidLanInterface($interface)) {
            $this->send400('Invalid network interface.');
        }

        $config = $this->getInterfaceConfig($interface);
        $this->sendResponse([
            'ok' => true,
            'interface' => $interface,
            'config' => $config,
        ]);
    }

    public function postSetConfig(): void
    {
        $input = json_decode((string) file_get_contents('php://input'), true);
        if (!is_array($input)) {
            $this->send400('Invalid request payload.');
        }

        $interface = trim((string) ($input['interface'] ?? ''));
        $mode = strtolower(trim((string) ($input['mode'] ?? 'dhcp')));
        $address = trim((string) ($input['address'] ?? ''));
        $netmask = trim((string) ($input['netmask'] ?? ''));
        $gateway = trim((string) ($input['gateway'] ?? ''));
        $dns = trim((string) ($input['dns'] ?? ''));

        if ($interface === '' || !$this->isValidLanInterface($interface)) {
            $this->send400('Invalid network interface.');
        }

        if (!in_array($mode, ['dhcp', 'manual'], true)) {
            $this->send400('Invalid configuration mode.');
        }

        if ($mode === 'manual') {
            if (!filter_var($address, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
                $this->send400('A valid IPv4 address is required for manual configuration.');
            }

            $prefix = $this->netmaskToPrefix($netmask);
            if ($prefix < 0) {
                $this->send400('A valid netmask is required for manual configuration.');
            }

            if ($gateway !== '' && !filter_var($gateway, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
                $this->send400('Gateway must be a valid IPv4 address.');
            }

            if ($dns !== '') {
                $dnsEntries = preg_split('/[\s,;]+/', $dns);
                foreach ($dnsEntries as $dnsEntry) {
                    if ($dnsEntry === '') {
                        continue;
                    }
                    if (!filter_var($dnsEntry, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
                        $this->send400('DNS servers must be valid IPv4 addresses separated by commas.');
                    }
                }
            }
        } else {
            $prefix = 24;
        }

        $connectionName = $this->getConnectionName($interface);
        if ($connectionName === '') {
            $connectionName = 'allsky-lan-' . $interface;
            $addResult = $this->runNmcli([
                'connection', 'add',
                'type', 'ethernet',
                'ifname', $interface,
                'con-name', $connectionName
            ]);
            if (!$addResult['ok']) {
                $message = trim((string) ($addResult['stderr'] ?: $addResult['stdout']));
                if ($message === '') {
                    $message = "Unable to create a NetworkManager profile for {$interface}.";
                }
                $this->sendResponse(['ok' => false, 'message' => $message]);
            }
        }

        $modifyArgs = ['connection', 'modify', $connectionName, 'connection.autoconnect', 'yes'];
        if ($mode === 'dhcp') {
            array_push(
                $modifyArgs,
                'ipv4.method', 'auto',
                'ipv4.addresses', '',
                'ipv4.gateway', '',
                'ipv4.dns', '',
                'ipv4.ignore-auto-dns', 'no'
            );
        } else {
            array_push(
                $modifyArgs,
                'ipv4.method', 'manual',
                'ipv4.addresses', $address . '/' . $prefix,
                'ipv4.gateway', $gateway,
                'ipv4.dns', preg_replace('/[\s;]+/', ',', $dns),
                'ipv4.ignore-auto-dns', ($dns !== '' ? 'yes' : 'no')
            );
        }

        $modifyResult = $this->runNmcli($modifyArgs);
        if (!$modifyResult['ok']) {
            $message = trim((string) ($modifyResult['stderr'] ?: $modifyResult['stdout']));
            if ($message === '') {
                $message = "Unable to update the configuration for {$interface}.";
            }
            $this->sendResponse(['ok' => false, 'message' => $message]);
        }

        $upResult = $this->runNmcli(['connection', 'up', 'id', $connectionName, 'ifname', $interface]);
        if (!$upResult['ok']) {
            $message = trim((string) ($upResult['stderr'] ?: $upResult['stdout']));
            if ($message === '') {
                $message = "The configuration was saved, but {$interface} could not be reactivated.";
            }
            $this->sendResponse(['ok' => false, 'message' => $message]);
        }

        $message = $mode === 'dhcp'
            ? "DHCP has been enabled for {$interface}."
            : "Manual network settings have been applied to {$interface}.";

        $this->sendResponse([
            'ok' => true,
            'message' => $message,
        ]);
    }
}

(new LANUTIL())->run();
