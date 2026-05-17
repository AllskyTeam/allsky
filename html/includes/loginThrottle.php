<?php
/**
 * LoginThrottle records failed WebUI login attempts and decides when a client
 * should be asked to wait before trying again.
 *
 * The throttle deliberately uses more than one bucket. A session bucket stops a
 * browser from rotating usernames indefinitely, a username bucket slows
 * distributed attempts against a single account, username/IP and username/subnet
 * buckets catch repeated failures from nearby sources, and a broader IP bucket
 * catches password spraying without making one shared address too easy to deny.
 *
 * State is stored as JSON in ALLSKY_MYFILES_DIR when that constant is
 * available. The file is small, local, and intentionally simple so login still
 * works on systems that do not have a database service.
 */
class LoginThrottle
{
    private string $file;
    private int $window;
    private int $maxAttempts;
    private int $lockDuration;
    private int $maxLockDuration;

    /**
     * @param string|null $file            Optional state file, mainly for tests.
     * @param int         $window          Seconds to keep failed attempts.
     * @param int         $maxAttempts     Failures allowed in the strictest bucket.
     * @param int         $lockDuration    First lock duration in seconds.
     * @param int         $maxLockDuration Longest exponential lock in seconds.
     */
    public function __construct(
        ?string $file = null,
        int $window = 600,        // 10 minutes lookback
        int $maxAttempts = 3,     // failures before lock
        int $lockDuration = 300,  // 5 minute first lock
        int $maxLockDuration = 3600
    ) {
        $stateDir = defined('ALLSKY_MYFILES_DIR')
            ? rtrim((string)ALLSKY_MYFILES_DIR, DIRECTORY_SEPARATOR)
            : rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR);
        $this->file = $file ?: $stateDir . DIRECTORY_SEPARATOR . 'allsky_login_throttle.json';
        $this->window = $window;
        $this->maxAttempts = $maxAttempts;
        $this->lockDuration = $lockDuration;
        $this->maxLockDuration = $maxLockDuration;
    }

    /**
     * Ensure the throttle directory exists and is private to the web process.
     *
     * Custom file paths may point at directories owned by tests or packaging, so
     * permissions are tightened only for the dedicated login-throttle directory
     * or for a directory this method has just created.
     */
    private function ensureStorageDir(): void
    {
        $dir = dirname($this->file);
        $created = false;
        if (!is_dir($dir)) {
            $created = @mkdir($dir, 0700, true);
        }
        if ($created || basename($dir) === 'login-throttle') {
            @chmod($dir, 0700);
        }
    }

    /**
     * Read the JSON state file.
     *
     * A corrupt or empty state file is treated as no state. That is preferable
     * to failing closed and locking out the only administrator on a small device.
     * Callers that mutate the returned array must hold the lock from
     * withLockedData().
     */
    private function load(): array
    {
        if (!is_file($this->file)) return [];
        $json = @file_get_contents($this->file);
        if ($json === false || $json === '') return [];
        try {
            $data = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
        } catch (\Throwable $e) {
            return [];
        }
        return is_array($data) ? $data : [];
    }

    /**
     * Write state with a temporary file and rename.
     *
     * The permissions are deliberately restrictive because the state reveals
     * login timing and hashed bucket identifiers. The JSON does not contain
     * clear-text usernames or addresses, but it still should not be world
     * readable.
     */
    private function save(array $data): void
    {
        $this->ensureStorageDir();
        $dir = dirname($this->file);

        $json = json_encode($data, JSON_UNESCAPED_SLASHES);
        if ($json === false) return;

        $tmp = @tempnam($dir, 'throttle_');
        if ($tmp === false) {
            @file_put_contents($this->file, $json, LOCK_EX);
            @chmod($this->file, 0600);
            return;
        }
        @chmod($tmp, 0600);

        $fp = @fopen($tmp, 'wb');
        if ($fp === false) {
            @unlink($tmp);
            @file_put_contents($this->file, $json, LOCK_EX);
            @chmod($this->file, 0600);
            return;
        }

        $ok = @fwrite($fp, $json);
        @fflush($fp);
        if (function_exists('fsync')) { @fsync($fp); }
        @fclose($fp);

        if ($ok === false || !@rename($tmp, $this->file)) {
            @unlink($tmp);
            @file_put_contents($this->file, $json, LOCK_EX);
            @chmod($this->file, 0600);
            return;
        }
        @chmod($this->file, 0600);
    }

    /**
     * Run a read-modify-write operation while holding an exclusive file lock.
     *
     * The throttle can be hit by concurrent POST requests. Without this lock,
     * one request could overwrite another request's failed-attempt counter.
     *
     * The callback receives the decoded state by reference and must return true
     * when the state should be written back to disk.
     */
    private function withLockedData(callable $callback): void
    {
        $this->ensureStorageDir();
        $lock = @fopen($this->file . '.lock', 'c');
        if ($lock === false) return;

        @chmod($this->file . '.lock', 0600);
        if (!@flock($lock, LOCK_EX)) {
            @fclose($lock);
            return;
        }

        $data = $this->load();
        $changed = $callback($data);
        if ($changed === true) {
            $this->save($data);
        }

        @flock($lock, LOCK_UN);
        @fclose($lock);
    }

    /**
     * Keep username keys stable and bounded.
     *
     * Authentication is still performed against the original submitted value.
     * This normalised value is only used to choose throttle buckets.
     */
    private function normaliseUsername(?string $username): string
    {
        $username = trim((string)$username);
        $username = substr($username, 0, 128);
        return strtolower($username);
    }

    /**
     * Return the direct client address seen by PHP.
     *
     * Do not trust forwarded headers here. Unless the web server has already
     * validated and rewritten REMOTE_ADDR, forwarded headers allow a client to
     * choose its own throttle key.
     */
    private function clientIp(): string
    {
        $ip = (string)($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
        return filter_var($ip, FILTER_VALIDATE_IP) ? $ip : '0.0.0.0';
    }

    /**
     * Collapse an address to the subnet used by the username/subnet bucket.
     *
     * IPv4 uses /24 and IPv6 uses /64. These are coarse enough to slow common
     * distributed attempts, but not so coarse that an entire provider is likely
     * to be blocked because of one client.
     */
    private function clientSubnet(string $ip): string
    {
        $packed = @inet_pton($ip);
        if ($packed === false) return $ip;

        $bytes = array_values(unpack('C*', $packed));
        if (count($bytes) === 4) {
            return "{$bytes[0]}.{$bytes[1]}.{$bytes[2]}.0/24";
        }

        if (count($bytes) === 16) {
            $prefix = array_slice($bytes, 0, 8);
            return implode(':', array_map(
                fn($i) => sprintf('%02x%02x', $prefix[$i], $prefix[$i + 1]),
                range(0, 7, 2)
            )) . '::/64';
        }

        return $ip;
    }

    /**
     * Build a storage key without writing raw usernames or IP addresses to disk.
     */
    private function hashKey(string $scope, string $value): string
    {
        return $scope . ':' . hash('sha256', $value);
    }

    /**
     * Return a stable key for the current PHP session, when one exists.
     *
     * This is not treated as a security boundary. It is only a low-cost way to
     * stop the normal login form from being used for endless username rotation.
     * Attackers can create new sessions, so the username and address buckets are
     * still required.
     */
    private function sessionKey(): ?string
    {
        $sessionId = session_id();
        if ($sessionId === '') {
            return null;
        }

        return $this->hashKey('session', $sessionId);
    }

    /**
     * Return the buckets that should be checked or updated for this attempt.
     *
     * The array value is the threshold for that bucket. The session and
     * username/IP buckets are intentionally strict. The username, subnet, and
     * plain IP buckets are looser so a single noisy address, shared NAT, or
     * typo-prone user does not immediately deny service to everyone else.
     */
    private function buckets(?string $username): array
    {
        $user = $this->normaliseUsername($username);
        $ip = $this->clientIp();
        $subnet = $this->clientSubnet($ip);

        $buckets = [
            $this->hashKey('ip', $ip) => $this->maxAttempts * 6,
        ];

        $sessionKey = $this->sessionKey();
        if ($sessionKey !== null) {
            $buckets[$sessionKey] = $this->maxAttempts;
        }

        if ($user !== '') {
            $buckets[$this->hashKey('user', $user)] = $this->maxAttempts * 4;
            $buckets[$this->hashKey('user_net', $user . '|' . $subnet)] = $this->maxAttempts * 2;
            $buckets[$this->hashKey('user_ip', $user . '|' . $ip)] = $this->maxAttempts;
        }

        return $buckets;
    }

    /**
     * Remove expired failures and make sure older state has all expected fields.
     */
    private function freshEntry(array $entry, int $now): array
    {
        $entry['fails'] = array_values(array_filter(
            $entry['fails'] ?? [],
            fn($t) => $now - (int)$t <= $this->window
        ));
        $entry['lock_until'] = isset($entry['lock_until']) ? (int)$entry['lock_until'] : 0;
        $entry['lock_count'] = isset($entry['lock_count']) ? max(0, (int)$entry['lock_count']) : 0;
        if ($entry['lock_until'] <= $now && empty($entry['fails'])) {
            $entry['lock_until'] = 0;
        }
        return $entry;
    }

    /**
     * Calculate the next lock duration using exponential back-off.
     */
    private function nextLockSeconds(int $lockCount): int
    {
        $exponent = min($lockCount, 6);
        return min($this->maxLockDuration, $this->lockDuration * (2 ** $exponent));
    }

    /**
     * Check whether another login attempt is currently allowed.
     *
     * This method is intentionally read-only. Looking at the login page or
     * retrying while already locked must not extend the lock, otherwise an
     * attacker could keep a shared IP address locked indefinitely.
     *
     * @param int         $retryAfter Set to the longest remaining lock in seconds.
     * @param string|null $username   Submitted username, when known.
     */
    public function check(int &$retryAfter = 0, ?string $username = null): bool
    {
        $data = $this->load();
        $now = time();
        $retryAfter = 0;

        foreach (array_keys($this->buckets($username)) as $key) {
            if (!isset($data[$key]) || !is_array($data[$key])) {
                continue;
            }

            $entry = $this->freshEntry($data[$key], $now);
            if ($entry['lock_until'] > $now) {
                $retryAfter = max($retryAfter, $entry['lock_until'] - $now);
            }
        }

        return $retryAfter === 0;
    }

    /**
     * Record a failed login attempt.
     *
     * Only failures create or extend throttle state. If a bucket is already
     * locked, the existing lock is left alone so the lock expires at a predictable
     * time.
     */
    public function fail(?string $username = null): void
    {
        $this->withLockedData(function (array &$data) use ($username): bool {
            $now = time();
            foreach ($this->buckets($username) as $key => $maxAttempts) {
                $entry = $this->freshEntry(
                    is_array($data[$key] ?? null) ? $data[$key] : ['fails' => [], 'lock_until' => 0, 'lock_count' => 0],
                    $now
                );

                if ($entry['lock_until'] > $now) {
                    $data[$key] = $entry;
                    continue;
                }

                $entry['fails'][] = $now;

                if (count($entry['fails']) >= $maxAttempts) {
                    $entry['lock_until'] = $now + $this->nextLockSeconds($entry['lock_count']);
                    $entry['lock_count']++;
                    $entry['fails'] = [];
                }

                $data[$key] = $entry;
            }
            return true;
        });
    }

    /**
     * Clear successful user's throttle state.
     *
     * Username-specific buckets are cleared so a real user can recover after a
     * successful login. The broad IP bucket is deliberately kept when a username
     * is known, since it may contain failures for other accounts from the same
     * address.
     */
    public function reset(?string $username = null): void
    {
        $this->withLockedData(function (array &$data) use ($username): bool {
            $user = $this->normaliseUsername($username);
            $changed = false;
            foreach (array_keys($this->buckets($username)) as $key) {
                if ($user !== '' && substr($key, 0, 3) === 'ip:') {
                    continue;
                }
                if (isset($data[$key])) {
                    unset($data[$key]);
                    $changed = true;
                }
            }
            return $changed;
        });
    }
}
