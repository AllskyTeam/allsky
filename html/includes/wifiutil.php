<?php
declare(strict_types=1);

include_once('functions.php');
initialize_variables();
include_once('authenticate.php');
include_once('utilbase.php');

class WIFIUTIL extends UTILBASE
{
    private const NMCLI = '/usr/bin/nmcli';
    private const IW = '/usr/sbin/iw';
    private const IWGETID = '/usr/sbin/iwgetid';
    private const RFKILL = '/usr/sbin/rfkill';
    private const SUDO = '/usr/bin/sudo';

    protected function getRoutes(): array
    {
        return [
            'Interfaces' => ['get'],
            'Scan' => ['get'],
            'Connect' => ['post'],
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

        stream_set_timeout($pipes[1], 10);
        stream_set_timeout($pipes[2], 10);

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

    private function getWifiInterfaces(): array
    {
        $interfaces = [];

        $result = $this->runCommand([self::IW, 'dev']);
        if ($result['ok']) {
            foreach (preg_split('/\r?\n/', $result['stdout']) as $line) {
                if (preg_match('/^\s*Interface\s+(\S+)/', $line, $matches)) {
                    $interfaces[] = trim($matches[1]);
                }
            }
        }

        $nmcli = $this->runCommand([self::NMCLI, '-t', '-f', 'DEVICE,TYPE,STATE', 'device', 'status']);
        if ($nmcli['ok']) {
            foreach (preg_split('/\r?\n/', $nmcli['stdout']) as $line) {
                if ($line === '') {
                    continue;
                }

                $parts = explode(':', $line);
                if (($parts[1] ?? '') === 'wifi' && trim((string) ($parts[0] ?? '')) !== '') {
                    $interfaces[] = trim($parts[0]);
                }
            }
        }

        $interfaces = array_values(array_unique(array_filter($interfaces)));
        sort($interfaces);

        return $interfaces;
    }

    private function getWifiInterface(): string
    {
        $interfaces = $this->getWifiInterfaces();
        return $interfaces[0] ?? 'wlan0';
    }

    private function getRequestedInterface(?string $requested = null): string
    {
        $interface = trim((string) ($requested ?? ''));
        if ($interface === '') {
            return $this->getWifiInterface();
        }

        if (in_array($interface, $this->getWifiInterfaces(), true)) {
            return $interface;
        }

        $this->send400('Invalid Wi-Fi interface.');
    }

    private function getBandLabel(int $frequency): string
    {
        if ($frequency >= 5925) {
            return '6 GHz';
        }
        if ($frequency >= 4900) {
            return '5 GHz';
        }
        if ($frequency >= 2400) {
            return '2.4 GHz';
        }

        return '-';
    }

    private function getChannelFromFrequency(int $frequency): ?int
    {
        if ($frequency >= 2412 && $frequency <= 2484) {
            if ($frequency === 2484) {
                return 14;
            }
            return (int) round(($frequency - 2407) / 5);
        }

        if ($frequency >= 5000 && $frequency <= 7115) {
            return (int) round(($frequency - 5000) / 5);
        }

        return null;
    }

    private function normalizeSecurity(string $security, bool $privacy = false): string
    {
        $security = trim($security);
        if ($security === '') {
            return $privacy ? 'WEP / Secured' : 'Open';
        }

        return str_replace('  ', ' ', $security);
    }

    private function parseNmcliScan(string $stdout): array
    {
        $networks = [];
        $blocks = preg_split("/\n\s*\n/", trim($stdout));

        foreach ($blocks as $block) {
            if (trim($block) === '') {
                continue;
            }

            $item = [];
            foreach (preg_split('/\r?\n/', $block) as $line) {
                $pos = strpos($line, ':');
                if ($pos === false) {
                    continue;
                }

                $key = substr($line, 0, $pos);
                $value = substr($line, $pos + 1);
                $item[$key] = $value;
            }

            $ssid = trim((string) ($item['SSID'] ?? ''));
            if ($ssid === '') {
                continue;
            }

            $frequency = (int) preg_replace('/[^0-9]/', '', (string) ($item['FREQ'] ?? '0'));
            $channel = trim((string) ($item['CHAN'] ?? ''));
            if ($channel === '' && $frequency > 0) {
                $channelNumber = $this->getChannelFromFrequency($frequency);
                $channel = $channelNumber !== null ? (string) $channelNumber : '-';
            }

            $networks[] = [
                'ssid' => $ssid,
                'bssid' => trim((string) ($item['BSSID'] ?? '')),
                'signal' => (int) ($item['SIGNAL'] ?? 0),
                'security' => $this->normalizeSecurity((string) ($item['SECURITY'] ?? '')),
                'channel' => $channel === '' ? '-' : $channel,
                'band' => $this->getBandLabel($frequency),
                'frequency' => $frequency,
                'inUse' => trim((string) ($item['IN-USE'] ?? '')) === '*',
            ];
        }

        return $networks;
    }

    private function parseIwScan(string $stdout): array
    {
        $networks = [];
        $blocks = preg_split('/\n(?=BSS\s)/', trim($stdout));

        foreach ($blocks as $block) {
            $ssid = '';
            $bssid = '';
            $signal = 0;
            $frequency = 0;
            $security = '';
            $privacy = false;

            if (preg_match('/^BSS\s+([0-9a-f:]+)/im', $block, $matches)) {
                $bssid = trim($matches[1]);
            }
            if (preg_match('/^\s*SSID:\s*(.*)$/m', $block, $matches)) {
                $ssid = trim($matches[1]);
            }
            if (preg_match('/^\s*freq:\s*(\d+)/im', $block, $matches)) {
                $frequency = (int) $matches[1];
            }
            if (preg_match('/^\s*signal:\s*(-?[0-9.]+)/im', $block, $matches)) {
                $dbm = (float) $matches[1];
                $signal = (int) max(0, min(100, round(2 * ($dbm + 100))));
            }
            if (preg_match('/^\s*capability:.*Privacy/im', $block)) {
                $privacy = true;
            }

            $securityParts = [];
            if (preg_match('/^\s*RSN:/im', $block)) {
                $securityParts[] = 'WPA2/WPA3';
            }
            if (preg_match('/^\s*WPA:/im', $block)) {
                $securityParts[] = 'WPA';
            }

            $security = implode(', ', array_unique($securityParts));
            if ($ssid === '') {
                continue;
            }
            if (strpos($ssid, '\\x00') !== false) {
                continue;
            }
            if (preg_match('/[\x00-\x1F\x7F]/', $ssid)) {
                continue;
            }
            if (preg_match('/^(supported rates|extended supported rates|bss load|capability|rsn|wpa)\s*:/i', $ssid)) {
                continue;
            }

            $channelNumber = $this->getChannelFromFrequency($frequency);
            $networks[] = [
                'ssid' => $ssid,
                'bssid' => $bssid,
                'signal' => $signal,
                'security' => $this->normalizeSecurity($security, $privacy),
                'channel' => $channelNumber !== null ? (string) $channelNumber : '-',
                'band' => $this->getBandLabel($frequency),
                'frequency' => $frequency,
                'inUse' => false,
            ];
        }

        return $networks;
    }

    private function getCurrentLink(string $interface): array
    {
        $ssid = '';
        $bssid = '';

        $iwgetid = $this->runCommand([self::IWGETID, $interface, '--raw']);
        if ($iwgetid['ok']) {
            $ssid = trim($iwgetid['stdout']);
        }

        $link = $this->runCommand([self::IW, 'dev', $interface, 'link']);
        if ($link['ok'] && preg_match('/Connected to ([0-9a-f:]+)/i', $link['stdout'], $matches)) {
            $bssid = strtolower($matches[1]);
        }

        return [
            'ssid' => $ssid,
            'bssid' => $bssid,
        ];
    }

    private function deduplicateNetworks(array $networks, array $currentLink): array
    {
        $byKey = [];
        foreach ($networks as $network) {
            $network['bssid'] = strtolower((string) $network['bssid']);
            $network['ssid'] = (string) $network['ssid'];

            if (
                !$network['inUse'] &&
                (
                    ($currentLink['bssid'] !== '' && $network['bssid'] === strtolower($currentLink['bssid'])) ||
                    ($currentLink['ssid'] !== '' && $network['ssid'] === $currentLink['ssid'])
                )
            ) {
                $network['inUse'] = true;
            }

            $key = $network['ssid'] . '|' . $network['channel'] . '|' . $network['band'];
            if (!isset($byKey[$key]) || (int) $network['signal'] > (int) $byKey[$key]['signal']) {
                $byKey[$key] = $network;
            }
        }

        $networks = array_values($byKey);
        usort($networks, static function (array $a, array $b): int {
            if ((bool) $a['inUse'] !== (bool) $b['inUse']) {
                return $a['inUse'] ? -1 : 1;
            }
            if ((int) $a['signal'] !== (int) $b['signal']) {
                return (int) $b['signal'] <=> (int) $a['signal'];
            }
            return strcasecmp((string) $a['ssid'], (string) $b['ssid']);
        });

        return $networks;
    }

    private function isSudoPasswordRequired(array $result): bool
    {
        $message = strtolower(trim((string) ($result['stderr'] ?: $result['stdout'])));
        return strpos($message, 'a password is required') !== false;
    }

    private function isNoSsidFound(array $result): bool
    {
        $message = strtolower(trim((string) ($result['stderr'] ?: $result['stdout'])));
        return strpos($message, 'no network with ssid') !== false;
    }

    private function cleanWifiErrorMessage(string $message): string
    {
        $message = trim($message);
        $message = preg_replace('/^command failed:\s*/i', '', $message);
        $message = preg_replace('/^error:\s*/i', '', $message);
        return trim((string) $message);
    }

    private function getRfkillWifiStatus(): array
    {
        $result = $this->runCommand([self::RFKILL, 'list']);
        if (!$result['ok']) {
            return [
                'available' => false,
                'blocked' => false,
                'soft' => false,
                'hard' => false,
                'message' => '',
            ];
        }

        $blocks = preg_split('/\n(?=\d+:\s)/', trim($result['stdout']));
        $hasWireless = false;
        $softBlocked = false;
        $hardBlocked = false;

        foreach ($blocks as $block) {
            $isWireless = false;

            if (preg_match('/^\d+:\s+.+:\s+Wireless LAN$/im', $block)) {
                $isWireless = true;
            } elseif (preg_match('/^\s*Type:\s*wlan$/im', $block)) {
                $isWireless = true;
            } elseif (preg_match('/^\s*Type:\s*wireless$/im', $block)) {
                $isWireless = true;
            }

            if (!$isWireless) {
                continue;
            }

            $hasWireless = true;
            if (preg_match('/soft blocked:\s*yes/im', $block)) {
                $softBlocked = true;
            }
            if (preg_match('/hard blocked:\s*yes/im', $block)) {
                $hardBlocked = true;
            }
        }

        if (!$hasWireless) {
            return [
                'available' => true,
                'blocked' => false,
                'soft' => false,
                'hard' => false,
                'message' => '',
            ];
        }

        $message = '';
        if ($softBlocked || $hardBlocked) {
            $parts = [];
            if ($softBlocked) {
                $parts[] = 'soft-blocked';
            }
            if ($hardBlocked) {
                $parts[] = 'hard-blocked';
            }

            $message = 'The Wi-Fi adapter appears to be disabled by rfkill (' . implode(' and ', $parts) . '). ';
            if ($softBlocked) {
                $message .= 'Try enabling it with `sudo rfkill unblock wifi`. ';
            }
            if ($hardBlocked) {
                $message .= 'Check for a hardware Wi-Fi switch, BIOS setting, or device-level radio disable. ';
            }
        }

        return [
            'available' => true,
            'blocked' => ($softBlocked || $hardBlocked),
            'soft' => $softBlocked,
            'hard' => $hardBlocked,
            'message' => trim($message),
        ];
    }

    private function rescanForNetwork(string $interface, string $ssid): void
    {
        $argv = [
            self::SUDO, '-n',
            self::NMCLI,
            'device', 'wifi', 'rescan',
            'ifname', $interface,
        ];

        if ($ssid !== '') {
            $argv[] = 'ssid';
            $argv[] = $ssid;
        }

        $this->runCommand($argv);
    }

    private function runNmcliWithSudo(array $argv): array
    {
        $sudoArgv = array_merge([self::SUDO, '-n'], $argv);
        $result = $this->runCommand($sudoArgv);
        if (!$result['ok'] && !$this->isSudoPasswordRequired($result)) {
            $plainResult = $this->runCommand($argv);
            if ($plainResult['ok']) {
                return $plainResult;
            }
            if (trim((string) ($plainResult['stderr'] ?: $plainResult['stdout'])) !== '') {
                return $plainResult;
            }
        }

        return $result;
    }

    private function buildFallbackConnectionName(string $ssid, string $interface): string
    {
        $slug = preg_replace('/[^A-Za-z0-9._-]+/', '-', $ssid);
        $slug = trim((string) $slug, '-');
        if ($slug === '') {
            $slug = 'wifi';
        }

        return 'allsky-' . $interface . '-' . substr($slug, 0, 40);
    }

    private function connectUsingProfile(string $interface, string $ssid, string $password, bool $isOpen): array
    {
        $connectionName = $this->buildFallbackConnectionName($ssid, $interface);

        $this->runNmcliWithSudo([
            self::NMCLI,
            'connection', 'delete',
            'id', $connectionName,
        ]);

        $addResult = $this->runNmcliWithSudo([
            self::NMCLI,
            'connection', 'add',
            'type', 'wifi',
            'ifname', $interface,
            'con-name', $connectionName,
            'ssid', $ssid,
        ]);

        if (!$addResult['ok']) {
            return $addResult;
        }

        $modifyArgs = [
            self::NMCLI,
            'connection', 'modify',
            $connectionName,
            'connection.autoconnect', 'yes',
            '802-11-wireless.hidden', 'yes',
        ];

        if ($isOpen) {
            $modifyArgs[] = '802-11-wireless-security.key-mgmt';
            $modifyArgs[] = 'none';
        } else {
            array_push($modifyArgs, 'wifi-sec.key-mgmt', 'wpa-psk', 'wifi-sec.psk', $password);
        }

        $modifyResult = $this->runNmcliWithSudo($modifyArgs);
        if (!$modifyResult['ok']) {
            return $modifyResult;
        }

        return $this->runNmcliWithSudo([
            self::NMCLI,
            '--wait', '20',
            'connection', 'up',
            'id', $connectionName,
        ]);
    }

    private function isNetworkVisible(string $interface, string $ssid, string $bssid): bool
    {
        $result = $this->runCommand([
            self::SUDO, '-n',
            self::NMCLI,
            '--colors', 'no',
            '--mode', 'multiline',
            '--fields', 'SSID,BSSID',
            'device', 'wifi', 'list',
            'ifname', $interface,
            '--rescan', 'no',
        ]);

        if (!$result['ok']) {
            return true;
        }

        $currentSsid = '';
        $currentBssid = '';
        foreach (preg_split('/\r?\n/', $result['stdout']) as $line) {
            if (preg_match('/^SSID:\s*(.*)$/', $line, $matches)) {
                $currentSsid = trim($matches[1]);
                continue;
            }

            if (preg_match('/^BSSID:\s*(.*)$/', $line, $matches)) {
                $currentBssid = strtolower(trim($matches[1]));
                $ssidMatches = ($ssid !== '' && $currentSsid === $ssid);
                $bssidMatches = ($bssid !== '' && $currentBssid === strtolower($bssid));
                if ($ssidMatches || $bssidMatches) {
                    return true;
                }

                $currentSsid = '';
                $currentBssid = '';
            }
        }

        return false;
    }

    private function scanNetworks(string $interface): array
    {
        $bestNetworks = [];

        $iwSudo = $this->runCommand([self::SUDO, '-n', self::IW, 'dev', $interface, 'scan', 'ap-force']);
        if ($iwSudo['ok']) {
            $networks = $this->parseIwScan($iwSudo['stdout']);
            if (count($networks) > count($bestNetworks)) {
                $bestNetworks = $networks;
            }
        }

        $iw = $this->runCommand([self::IW, 'dev', $interface, 'scan', 'ap-force']);
        if ($iw['ok']) {
            $networks = $this->parseIwScan($iw['stdout']);
            if (count($networks) > count($bestNetworks)) {
                $bestNetworks = $networks;
            }
        }

        $nmcli = $this->runCommand([
            self::NMCLI,
            '--colors', 'no',
            '--mode', 'multiline',
            '--fields', 'IN-USE,SSID,SIGNAL,SECURITY,CHAN,FREQ,BSSID',
            'device', 'wifi', 'list',
            'ifname', $interface,
            '--rescan', 'yes',
        ]);

        if ($nmcli['ok']) {
            $networks = $this->parseNmcliScan($nmcli['stdout']);
            if (count($networks) > count($bestNetworks)) {
                $bestNetworks = $networks;
            }
        }

        if (count($bestNetworks) > 0) {
            return $bestNetworks;
        }

        if ($this->isSudoPasswordRequired($iwSudo)) {
            $this->send500('Wi-Fi scanning needs either passwordless sudo for the web server user or permission to read scan results from NetworkManager.');
        }

        $rfkillStatus = $this->getRfkillWifiStatus();
        if ($rfkillStatus['blocked']) {
            $message = $rfkillStatus['message'];
            $detail = $this->cleanWifiErrorMessage((string) ($iwSudo['stderr'] ?: $iwSudo['stdout']));
            if ($detail === '') {
                $detail = $this->cleanWifiErrorMessage((string) ($iw['stderr'] ?: $iw['stdout']));
            }
            if ($detail === '') {
                $detail = $this->cleanWifiErrorMessage((string) ($nmcli['stderr'] ?: $nmcli['stdout']));
            }
            if ($detail !== '') {
                $message .= ' Scan detail: ' . $detail;
            }

            $this->send500(trim($message));
        }

        $message = $this->cleanWifiErrorMessage((string) ($iwSudo['stderr'] ?: $iwSudo['stdout']));
        if ($message === '') {
            $message = $this->cleanWifiErrorMessage((string) ($iw['stderr'] ?: $iw['stdout']));
        }
        if ($message === '') {
            $message = $this->cleanWifiErrorMessage((string) ($nmcli['stderr'] ?: $nmcli['stdout']));
        }
        if ($message === '') {
            $message = 'Unable to scan for Wi-Fi networks.';
        }

        $this->send500($message);
    }

    public function getInterfaces(): void
    {
        $this->sendResponse([
            'ok' => true,
            'interfaces' => $this->getWifiInterfaces(),
        ]);
    }

    public function getScan(): void
    {
        $interface = $this->getRequestedInterface($_GET['interface'] ?? null);
        $currentLink = $this->getCurrentLink($interface);
        $networks = $this->deduplicateNetworks($this->scanNetworks($interface), $currentLink);

        $current = [
            'ssid' => $currentLink['ssid'] !== '' ? $currentLink['ssid'] : 'Not connected',
            'security' => '-',
            'channel' => '-',
            'band' => '-',
        ];

        foreach ($networks as $network) {
            if (!$network['inUse']) {
                continue;
            }

            $current = [
                'ssid' => $network['ssid'],
                'security' => $network['security'],
                'channel' => $network['channel'],
                'band' => $network['band'],
            ];
            break;
        }

        $this->sendResponse([
            'ok' => true,
            'interface' => $interface,
            'current' => $current,
            'networks' => $networks,
        ]);
    }

    public function postConnect(): void
    {
        $input = json_decode((string) file_get_contents('php://input'), true);
        if (!is_array($input)) {
            $this->send400('Invalid request payload.');
        }

        $ssid = trim((string) ($input['ssid'] ?? ''));
        $bssid = trim((string) ($input['bssid'] ?? ''));
        $password = (string) ($input['password'] ?? '');
        $security = trim((string) ($input['security'] ?? ''));
        $interface = $this->getRequestedInterface((string) ($input['interface'] ?? ''));

        if ($ssid === '' && $bssid === '') {
            $this->send400('No Wi-Fi network was selected.');
        }

        $isOpen = strcasecmp($security, 'Open') === 0;
        if (!$isOpen && trim($password) === '') {
            $this->send400('A password is required for this Wi-Fi network.');
        }

        $this->rescanForNetwork($interface, $ssid);
        if (!$this->isNetworkVisible($interface, $ssid, $bssid)) {
            $this->sendResponse([
                'ok' => false,
                'message' => 'The selected Wi-Fi network is no longer visible on this adapter. Refresh the list and try again.',
            ]);
        }

        $target = $ssid !== '' ? $ssid : $bssid;
        $argv = [
            self::NMCLI,
            '--wait', '20',
            'device', 'wifi', 'connect', $target,
            'ifname', $interface,
        ];

        if ($ssid !== '' && $bssid !== '') {
            $argv[] = 'bssid';
            $argv[] = $bssid;
        }

        if (!$isOpen) {
            $argv[] = 'password';
            $argv[] = $password;
        }

        $result = $this->runNmcliWithSudo($argv);
        if (!$result['ok'] && $this->isNoSsidFound($result)) {
            $retryArgv = [
                self::NMCLI,
                '--wait', '20',
                'device', 'wifi', 'connect', $ssid !== '' ? $ssid : $target,
                'ifname', $interface,
            ];

            if (!$isOpen) {
                $retryArgv[] = 'password';
                $retryArgv[] = $password;
            }

            $this->rescanForNetwork($interface, $ssid);
            $result = $this->runNmcliWithSudo($retryArgv);
            if (!$result['ok'] && $ssid !== '') {
                $result = $this->connectUsingProfile($interface, $ssid, $password, $isOpen);
            }
        }

        if (!$result['ok']) {
            if ($this->isSudoPasswordRequired($result)) {
                $this->sendResponse([
                    'ok' => false,
                    'message' => 'Connecting to Wi-Fi requires passwordless sudo for the web server user, or permission to manage NetworkManager connections.',
                ]);
            }

            $plainResult = $this->runCommand($argv);
            if ($plainResult['ok']) {
                $result = $plainResult;
            } elseif (trim((string) ($plainResult['stderr'] ?: $plainResult['stdout'])) !== '') {
                $result = $plainResult;
            }
        }

        if (!$result['ok']) {
            $message = trim((string) ($result['stderr'] !== '' ? $result['stderr'] : $result['stdout']));
            if ($message === '') {
                $message = 'Unable to connect to the selected Wi-Fi network.';
            }

            $this->sendResponse([
                'ok' => false,
                'message' => $message,
            ]);
        }

        $message = trim((string) $result['stdout']);
        if ($message === '') {
            $message = 'Connected to ' . ($ssid !== '' ? $ssid : $target) . ' using ' . $interface . '.';
        }

        $this->sendResponse([
            'ok' => true,
            'message' => $message,
        ]);
    }
}

(new WIFIUTIL())->run();
