<?php
if (basename(__FILE__) === basename($_SERVER['SCRIPT_FILENAME'])) {
    include_once('functions.php');
    redirect("/index.php");
}

/**
 * Persistent "remember me" authentication for the WebUI.
 *
 * The browser receives a single HttpOnly cookie named {@see RememberMe::COOKIE}
 * whose value is `selector:token`.  The selector is a public lookup key.  The
 * token is a secret value that is never stored directly; only its SHA-256 hash is
 * written to the token store.
 *
 * Token store entries are held in `remember_tokens.json` under
 * `ALLSKY_MYFILES_DIR`.  A normal active entry contains:
 *
 * - `selector`: random 24-character hexadecimal lookup key.
 * - `token_hash`: SHA-256 hash of the random token.
 * - `username`: WebUI username the token is authorised for.
 * - `created`: Unix timestamp for auditing and troubleshooting.
 * - `expires`: Unix timestamp when the token should stop being accepted.
 *
 * On successful cookie login the token is rotated: the old token is marked as
 * consumed for a short grace period and a fresh token is issued.  That preserves
 * single-use token behaviour while allowing parallel browser requests that were
 * sent with the old cookie to complete without clearing the newly issued cookie.
 *
 * All token-store mutations should run under {@see RememberMe::withTokenLock()}
 * so reads and writes are serialised across concurrent PHP requests.
 */
class RememberMe
{
    /** @var string Name of the persistent remember-me browser cookie. */
    private const COOKIE = 'allsky_remember';

    /** @var int Token lifetime in seconds. */
    private const TTL = 2592000; // 30 days

    /** @var int Time in seconds that a just-consumed token remains acceptable. */
    private const ROTATION_GRACE = 120; // seconds

    /**
     * Return the JSON token-store path.
     *
     * The store lives in `ALLSKY_MYFILES_DIR` so it survives WebUI sessions and
     * normal page reloads without being exposed as a web asset.
     *
     * @return string Absolute path to the remember-token JSON file.
     */
    private static function storeFile(): string
    {
        return rtrim((string)ALLSKY_MYFILES_DIR, '/\\') . '/remember_tokens.json';
    }

    /**
     * Return the lock-file path used to serialise token-store access.
     *
     * @return string Absolute path to the lock file.
     */
    private static function lockFile(): string
    {
        return self::storeFile() . '.lock';
    }

    /**
     * Run a token-store operation while holding an exclusive process lock.
     *
     * The remember-token store is a small JSON file, so updates must be treated
     * as a read-modify-write transaction.  Without this lock, two unauthorised
     * requests arriving together after a PHP session expires can both read the
     * same token state and overwrite each other's rotation results.
     *
     * If the lock file cannot be opened or locked, the callback still runs so a
     * filesystem issue does not make normal login impossible.  In that fallback
     * case the operation is best-effort and no serialisation is guaranteed.
     *
     * @param callable $callback Operation to run while the lock is held.
     * @return mixed Whatever the callback returns.
     */
    private static function withTokenLock(callable $callback)
    {
        $file = self::lockFile();
        $dir = dirname($file);
        if (!is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }

        $handle = @fopen($file, 'c');
        if ($handle === false) {
            return $callback();
        }

        if (defined('ALLSKY_WEBSERVER_GROUP')) {
            @chgrp($file, ALLSKY_WEBSERVER_GROUP);
        }
        @chmod($file, 0660);

        if (!@flock($handle, LOCK_EX)) {
            @fclose($handle);
            return $callback();
        }

        try {
            return $callback();
        } finally {
            @flock($handle, LOCK_UN);
            @fclose($handle);
        }
    }

    /**
     * Build the common options used for remember-me cookies.
     *
     * The cookie is scoped to the full site, is HttpOnly, and uses SameSite=Lax
     * so normal top-level navigation works without exposing the token to
     * cross-site subrequests.  The Secure flag is set only when the current
     * request is HTTPS, matching how the WebUI is being reached.
     *
     * @param int $expires Unix timestamp for the cookie expiry time.
     * @return array<string, bool|int|string> Options accepted by setcookie().
     */
    private static function cookieOptions(int $expires): array
    {
        $secureCookie = (
            isset($_SERVER['HTTPS']) &&
            $_SERVER['HTTPS'] !== '' &&
            $_SERVER['HTTPS'] !== 'off'
        );

        return [
            'expires' => $expires,
            'path' => '/',
            'secure' => $secureCookie,
            'httponly' => true,
            'samesite' => 'Lax',
        ];
    }

    /**
     * Read the remember-token store.
     *
     * Missing, empty, unreadable, or invalid JSON stores are treated as empty.
     * Callers that mutate the result should do so under {@see withTokenLock()}.
     *
     * @return array<int, array<string, mixed>> Token entries from the store.
     */
    private static function readTokens(): array
    {
        $file = self::storeFile();
        if (!is_file($file)) {
            return [];
        }

        $raw = @file_get_contents($file);
        if ($raw === false || trim($raw) === '') {
            return [];
        }

        $decoded = json_decode($raw, true);
        return is_array($decoded) ? $decoded : [];
    }

    /**
     * Write the remember-token store.
     *
     * The array is reindexed before it is serialised so removed entries do not
     * leave sparse JSON object keys.  A direct locked write is attempted first;
     * if permissions prevent that, the WebUI's existing updateFile() helper is
     * used as a fallback.
     *
     * @param array<int, array<string, mixed>> $tokens Token entries to persist.
     * @return bool True when the store was written, otherwise false.
     */
    private static function writeTokens(array $tokens): bool
    {
        $file = self::storeFile();
        $encoded = json_encode(array_values($tokens), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        if ($encoded === false) {
            return false;
        }

        $ok = @file_put_contents($file, $encoded, LOCK_EX);
        if ($ok === false) {
            $msg = updateFile($file, $encoded, 'remember tokens', false, true);
            if ($msg !== '') {
                return false;
            }
        }

        @chmod($file, 0600);
        return true;
    }

    /**
     * Remove expired entries and, optionally, all entries for one username.
     *
     * Active entries expire by their `expires` value.  Consumed entries expire by
     * `grace_expires`, because their ordinary expiry is shortened when they are
     * kept only to allow concurrent requests to finish.
     *
     * Passing a username is used for revocation: every non-expired token for that
     * user is deliberately omitted from the returned list.
     *
     * @param array<int, mixed> $tokens Raw entries read from the store.
     * @param string|null $username Username whose tokens should be removed.
     * @return array<int, array<string, mixed>> Pruned token entries.
     */
    private static function pruneTokens(array $tokens, ?string $username = null): array
    {
        $now = time();
        $kept = [];

        foreach ($tokens as $entry) {
            if (!is_array($entry)) {
                continue;
            }
            $expires = (int)($entry['expires'] ?? 0);
            $graceExpires = (int)($entry['grace_expires'] ?? 0);
            $isConsumed = !empty($entry['consumed']);
            if ($isConsumed && $graceExpires <= $now) {
                continue;
            }
            if (!$isConsumed && $expires <= $now) {
                continue;
            }
            if ($username !== null && (string)($entry['username'] ?? '') === $username) {
                continue;
            }
            $kept[] = $entry;
        }

        return $kept;
    }

    /**
     * Create a new remember-token entry and its matching cookie value.
     *
     * The raw token is returned only as part of the cookie value.  The persisted
     * entry contains the selector and token hash, never the token itself.
     *
     * @param string $username WebUI username the token should authorise.
     * @return array{cookie:string, expires:int, entry:array<string, mixed>} New
     *         cookie metadata and token-store entry.
     */
    private static function createTokenEntry(string $username): array
    {
        $selector = bin2hex(random_bytes(12));
        $token = bin2hex(random_bytes(32));
        $expires = time() + self::TTL;

        return [
            'cookie' => $selector . ':' . $token,
            'expires' => $expires,
            'entry' => [
                'selector' => $selector,
                'token_hash' => hash('sha256', $token),
                'username' => $username,
                'created' => time(),
                'expires' => $expires,
            ],
        ];
    }

    /**
     * Set the remember-me cookie and clear legacy plaintext remember cookies.
     *
     * Older implementations used separate username/password cookies.  This
     * method expires those names whenever a modern selector/token cookie is set
     * so stale browser state cannot be reused.
     *
     * @param string $cookie `selector:token` value to store in the browser.
     * @param int $expires Unix timestamp for the cookie expiry time.
     */
    private static function setRememberCookie(string $cookie, int $expires): void
    {
        setcookie(self::COOKIE, $cookie, self::cookieOptions($expires));
        setcookie('allsky_remember_username', '', self::cookieOptions(time() - 3600));
        setcookie('allsky_remember_password', '', self::cookieOptions(time() - 3600));
    }

    /**
     * Expire all remember-me cookies known to the WebUI.
     *
     * This only affects the response sent to the current browser.  It does not
     * remove token-store entries; use {@see revokeAll()} when server-side tokens
     * must be invalidated as well.
     */
    public static function clearCookie(): void
    {
        $expired = time() - 3600;
        setcookie(self::COOKIE, '', self::cookieOptions($expired));
        setcookie('allsky_remember_username', '', self::cookieOptions($expired));
        setcookie('allsky_remember_password', '', self::cookieOptions($expired));
    }

    /**
     * Issue a new remember-me token for a successful form login.
     *
     * The token store is pruned before the new entry is appended.  If the store
     * cannot be written, no browser cookie is set, preventing the browser from
     * keeping a token the server cannot later validate.
     *
     * @param string $username Authenticated WebUI username.
     */
    public static function issueToken(string $username): void
    {
        self::withTokenLock(function () use ($username): void {
            $issued = self::createTokenEntry($username);
            $tokens = self::pruneTokens(self::readTokens());
            $tokens[] = $issued['entry'];

            if (self::writeTokens($tokens)) {
                self::setRememberCookie($issued['cookie'], $issued['expires']);
            }
        });
    }

    /**
     * Authenticate the current request from the remember-me cookie.
     *
     * The caller supplies the currently configured WebUI username.  That value is
     * trusted server-side state; the browser cookie is never allowed to select a
     * username.  A valid cookie must:
     *
     * - Contain a correctly formatted `selector:token` value.
     * - Match a non-expired token-store entry.
     * - Belong to the supplied username.
     * - Match the stored token hash using a constant-time comparison.
     *
     * On first successful use, the token is rotated and the old entry is retained
     * only as consumed grace state.  Reusing that old cookie during the grace
     * window succeeds without issuing another token; this protects normal browser
     * parallelism after the PHP session has expired.  Reuse after the grace
     * window fails.
     *
     * Malformed cookies, username mismatches, and token-hash mismatches clear the
     * browser cookie.  A missing selector does not clear the cookie, because it
     * can be caused by a stale parallel request after another request has already
     * rotated the token.
     *
     * @param string $currentUsername Current configured WebUI username.
     * @return bool True when the cookie authorises this request.
     */
    public static function loginFromCookie(string $currentUsername): bool
    {
        $cookie = (string)($_COOKIE[self::COOKIE] ?? '');
        if ($cookie === '' || strlen($cookie) > 256 || strpos($cookie, ':') === false) {
            return false;
        }

        [$selector, $token] = explode(':', $cookie, 2);
        if (!preg_match('/^[a-f0-9]{24}$/', $selector) || !preg_match('/^[a-f0-9]{64}$/', $token)) {
            self::clearCookie();
            return false;
        }

        return (bool)self::withTokenLock(function () use ($currentUsername, $selector, $token): bool {
            $tokens = self::pruneTokens(self::readTokens());
            $matched = null;
            $matchedIndex = null;

            foreach ($tokens as $index => $entry) {
                if ((string)($entry['selector'] ?? '') === $selector) {
                    $matched = $entry;
                    $matchedIndex = $index;
                    break;
                }
            }

            if ($matched === null) {
                // A missing selector may be a parallel request using a just-rotated cookie.
                self::writeTokens($tokens);
                return false;
            }

            $remaining = $tokens;
            array_splice($remaining, (int)$matchedIndex, 1);

            if ((string)($matched['username'] ?? '') !== $currentUsername) {
                self::writeTokens($remaining);
                self::clearCookie();
                return false;
            }

            $expected = (string)($matched['token_hash'] ?? '');
            if (!hash_equals($expected, hash('sha256', $token))) {
                self::writeTokens($remaining);
                self::clearCookie();
                return false;
            }

            if (!empty($matched['consumed'])) {
                // Let concurrent requests finish after the first one rotates the token.
                if ((int)($matched['grace_expires'] ?? 0) > time()) {
                    self::writeTokens($tokens);
                    return true;
                }

                self::writeTokens($remaining);
                return false;
            }

            $now = time();
            $graceExpires = min((int)($matched['expires'] ?? 0), $now + self::ROTATION_GRACE);
            if ($graceExpires > $now) {
                $matched['consumed'] = true;
                $matched['grace_expires'] = $graceExpires;
                $matched['expires'] = $graceExpires;
                $remaining[] = $matched;
            }

            $issued = self::createTokenEntry($currentUsername);
            $remaining[] = $issued['entry'];

            if (self::writeTokens($remaining)) {
                self::setRememberCookie($issued['cookie'], $issued['expires']);
            }
            return true;
        });
    }

    /**
     * Revoke remember-me tokens and clear the current browser cookie.
     *
     * Passing a username removes only that user's non-expired entries.  Passing
     * null removes every remember-me token in the store.  In both cases the
     * browser cookie in the current response is expired.
     *
     * @param string|null $username Username to revoke, or null to revoke all.
     */
    public static function revokeAll(?string $username = null): void
    {
        self::withTokenLock(function () use ($username): void {
            $tokens = self::readTokens();
            if ($username === null) {
                $tokens = [];
            } else {
                $tokens = self::pruneTokens($tokens, $username);
            }

            self::writeTokens($tokens);
        });
        self::clearCookie();
    }
}
