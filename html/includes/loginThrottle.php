<?php
class LoginThrottle
{
    private string $file;
    private int $window;
    private int $maxAttempts;
    private int $lockDuration;

    public function __construct(
        ?string $file = null,
        int $window = 600,        // 10 minutes lookback
        int $maxAttempts = 3,     // failures before lock
        int $lockDuration = 300   // 5 minute lock
    ) {
        $tmpDir = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR);
        $this->file = $file ?: $tmpDir . DIRECTORY_SEPARATOR . 'allsky_login_throttle.json';
        $this->window = $window;
        $this->maxAttempts = $maxAttempts;
        $this->lockDuration = $lockDuration;
    }

    /** Read the state; atomic writers mean locking on reads isn't required. */
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

    /** Atomic write: temp file + rename. */
    private function save(array $data): void
    {
        $dir = dirname($this->file);
        if (!is_dir($dir)) @mkdir($dir, 0770, true);

        $json = json_encode($data, JSON_UNESCAPED_SLASHES);
        if ($json === false) return;

        $tmp = @tempnam($dir, 'throttle_');
        if ($tmp === false) {
            @file_put_contents($this->file, $json, LOCK_EX);
            return;
        }

        $fp = @fopen($tmp, 'wb');
        if ($fp === false) {
            @unlink($tmp);
            @file_put_contents($this->file, $json, LOCK_EX);
            return;
        }

        $ok = @fwrite($fp, $json);
        @fflush($fp);
        if (function_exists('fsync')) { @fsync($fp); }
        @fclose($fp);

        if ($ok === false || !@rename($tmp, $this->file)) {
            @unlink($tmp);
            @file_put_contents($this->file, $json, LOCK_EX);
            return;
        }
        @chmod($this->file, 0660);
    }

    /** IP-based key (hashed). */
    private function key(): string
    {
        $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
        return hash('sha256', $ip);
    }

    /**
     * Check if attempts are allowed. If currently locked, extend the lock by lockDuration
     * from now and return false. $retryAfter is set to remaining seconds.
     */
    public function check(int &$retryAfter = 0): bool
    {
        $data = $this->load();
        $key  = $this->key();
        if (!isset($data[$key])) return true;

        $now   = time();
        $entry = $data[$key];

        // Clean old failures (even if locked, keep the record tidy)
        if (!empty($entry['fails'])) {
            $entry['fails'] = array_values(array_filter(
                $entry['fails'],
                fn($t) => $now - (int)$t <= $this->window
            ));
        } else {
            $entry['fails'] = [];
        }

        // If locked, EXTEND the lock to now + lockDuration
        if (!empty($entry['lock_until']) && $now < (int)$entry['lock_until']) {
            $entry['lock_until'] = $now + $this->lockDuration;
            $data[$key] = $entry;
            $this->save($data);

            $retryAfter = $entry['lock_until'] - $now;
            return false;
        }

        // Not locked
        $data[$key] = $entry;
        $this->save($data);
        return true;
    }

    /** Record a failed attempt; start lock if threshold reached. */
    public function fail(): void
    {
        $data = $this->load();
        $key  = $this->key();
        $now  = time();

        $entry = $data[$key] ?? ['fails' => [], 'lock_until' => null];

        // If already locked, keep extending lock on failure too (defense-in-depth)
        if (!empty($entry['lock_until']) && $now < (int)$entry['lock_until']) {
            $entry['lock_until'] = $now + $this->lockDuration;
            $data[$key] = $entry;
            $this->save($data);
            return;
        }

        // Track fresh failure
        $entry['fails'] = array_values(array_filter(
            $entry['fails'],
            fn($t) => $now - (int)$t <= $this->window
        ));
        $entry['fails'][] = $now;

        if (count($entry['fails']) >= $this->maxAttempts) {
            $entry['lock_until'] = $now + $this->lockDuration;
            $entry['fails'] = []; // reset counter once locked
        }

        $data[$key] = $entry;
        $this->save($data);
    }

    /** Reset state (on successful login). */
    public function reset(): void
    {
        $data = $this->load();
        $key  = $this->key();
        if (isset($data[$key])) {
            unset($data[$key]);
            $this->save($data);
        }
    }
}