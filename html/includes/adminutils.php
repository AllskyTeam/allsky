<?php

declare(strict_types=1);
include_once('functions.php');
initialize_variables();
include_once('authenticate.php');
include_once('utilbase.php');

/**
 * Class ADMINUTIL
 *
 * Provides endpoints for managing the web admin account — specifically,
 * changing the username and password for the WebUI.
 *
 * The class extends UTILBASE and relies on its routing, CSRF validation,
 * and JSON response helpers. It’s designed to be called by AJAX requests
 * from the admin interface (e.g. the password-change modal).
 *
 * Key behaviour:
 *  - Exposes two POST routes:
 *      • PasswordFormat → returns the current password policy text
 *      • Validate → performs a full username/password update
 *  - Validates CSRF tokens for all POSTs
 *  - Checks the old password before applying a new one
 *  - Runs an external password-policy script (validatePassword.sh)
 *  - Hashes and saves credentials back to the env JSON file
 *  - Optionally toggles login enforcement in the global settings
 *  - Logs out the current user once credentials change
 *
 * The class only returns JSON responses — no HTML is generated here.
 * It should be considered part of the admin API surface rather than
 * general site code.
 */
class ADMINUTIL extends UTILBASE
{
    // Define which API routes this utility responds to and which HTTP methods are allowed
    protected function getRoutes(): array
    {
        return [
            'PasswordFormat' => ['post'],
            'Validate' => ['post'],
        ];
    }

    // Store the current admin credentials loaded from the environment file
    private $adminUser;
    private $adminPassword;

    // Load session and read current credentials from the private environment file
    public function __construct()
    {
        if (session_status() !== PHP_SESSION_ACTIVE) {
            session_start();
        }

        $privateVars = get_decoded_json_file(ALLSKY_ENV, true, '');
        $this->adminUser     = (string)($privateVars['WEBUI_USERNAME'] ?? '');
        $this->adminPassword = (string)($privateVars['WEBUI_PASSWORD'] ?? '');
    }

    // Run the external password validation script with or without strict checks
    private function validatePassword(bool $useOnline, string $password): array
    {
        $argv = [ALLSKY_UTILITIES . '/validatePassword.sh'];
        if (!$useOnline) {
            $argv[] = '--nosecure';
        }
        $argv[] = '--password';
        $argv[] = $password;

        return $this->runProcess($argv);
    }

    // Create a consistent JSON response structure for success or error messages
    private function createResponse(string $message, bool $error = false): array
    {
        return [
            'error' => $error,
            'message' => $message,
        ];
    }

    // Handle POST requests for retrieving the password format or policy description
    public function postPasswordFormat(): void
    {
        if (!CSRFValidate()) {
            $this->send401();
        }

        $useonline = (bool) filter_input(INPUT_POST, 'useonline', FILTER_VALIDATE_BOOLEAN);

        $argv = [ALLSKY_UTILITIES . '/validatePassword.sh', '--getformat'];
        if (!$useonline) {
            $argv[] = '--nosecure';
        }

        $result = $this->runProcess($argv);
        if ($result['error']) {
            $this->send400('Unable to get password format');
        } else {
            $this->sendResponse($this->createResponse($result['message']));
        }
    }

    // Handle POST requests to change the username and password
    public function postValidate(): void
    {
        if (!CSRFValidate()) {
            $this->send401();
        }

        // Collect input values without filtering out special characters
        $new_username   = trim((string) filter_input(INPUT_POST, 'username', FILTER_UNSAFE_RAW));
        $old            = (string) filter_input(INPUT_POST, 'oldpass', FILTER_UNSAFE_RAW);
        $new1           = (string) filter_input(INPUT_POST, 'newpass', FILTER_UNSAFE_RAW);
        $new2           = (string) filter_input(INPUT_POST, 'newpassagain', FILTER_UNSAFE_RAW);
        $useWebUILogin  = (bool) filter_input(INPUT_POST, 'as-enable-webui-login', FILTER_VALIDATE_BOOLEAN);
        $useonline      = (bool) filter_input(INPUT_POST, 'as-use-online', FILTER_VALIDATE_BOOLEAN);

        // Basic username validation
        if ($new_username === '') {
            $this->send400('You must enter the username.');
        }
        if (!preg_match('/^[A-Za-z0-9_.-]{1,64}$/', $new_username)) {
            $this->send400('Username contains invalid characters.');
        }

        // Ensure all password fields are filled
        if ($old === '' || $new1 === '' || $new2 === '') {
            $this->send400('You must enter the old (current) password, and the new password twice.');
        }

        // Check that the existing password is correct
        if (!password_verify($old, $this->adminPassword)) {
            $this->send400('The old password is incorrect.');
        }

        // Confirm that both new password entries match
        if ($new1 !== $new2) {
            $this->send400('New passwords do not match.');
        }

        // Validate the new password using the external password policy script
        $result = $this->validatePassword($useonline, $new1);
        if ($result['error']) {
            $this->send400($result['message']);
        }

        // Load current secrets and update username and password hash
        $privateVars = get_decoded_json_file(ALLSKY_ENV, true, "");
        $privateVars['WEBUI_USERNAME'] = $new_username;
        $privateVars['WEBUI_PASSWORD'] = password_hash($new1, PASSWORD_BCRYPT);

        $encoded = json_encode($privateVars, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        if ($encoded === false) {
            $this->send500('Failed to encode secrets.');
        }

        if (file_put_contents(ALLSKY_ENV, $encoded, LOCK_EX) === false) {
            $this->send500('Failed to write temp secrets file.');
        }

        // Update the "uselogin" flag in the settings file if required
        if ($useWebUILogin) {
            $content = readSettingsFile();
            if (($content['uselogin'] ?? null) !== $useWebUILogin) {
                $content['uselogin'] = $useWebUILogin;
                $settings_file = getSettingsFile();
                $mode = JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION;
                $payload = json_encode($content, $mode);
                $msg = updateFile($settings_file, $payload, "settings", false);
            }
        }

        // Clear the session so the user must log in again with the new credentials
        $_SESSION['auth'] = false;
        $_SESSION['user'] = '';
        if (function_exists('session_regenerate_id')) {
            @session_regenerate_id(true);
        }

        $this->sendResponse(
            $this->createResponse(
                "$new_username password updated. You have been logged out; log in with the new credentials."
            )
        );
    }
}

$supportUtil = new ADMINUTIL();
$supportUtil->run();