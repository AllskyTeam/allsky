<?php
include_once('functions.php');
include_once('loginThrottle.php');
include_once('rememberMe.php');

$csrf_token = useLogin();
$page = getVariableOrDefault($_REQUEST, 'page', "live_view");

$throttle = new LoginThrottle();

if ($useLogin) {
    if (!is_logged_in()) {
        $privateVars = get_decoded_json_file(ALLSKY_ENV, true, "");
        $adminUser = (string)($privateVars["WEBUI_USERNAME"] ?? "");

        if ($adminUser !== "" && RememberMe::loginFromCookie($adminUser)) {
            session_regenerate_id(true);
            $_SESSION['auth'] = true;
            $_SESSION['user'] = $adminUser;
        }
    }

    if (!is_logged_in()) {
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $user = trim((string)($_POST['username'] ?? ''));
            $retryAfter = 0;
            if (!$throttle->check($retryAfter, $user)) {
                $mins = max(1, ceil($retryAfter / 60));
                redirect("/index.php?page=login", "Too many failed attempts. Try again in about {$mins} minute(s).");
            }

            if (!CSRFValidate()) {
                $throttle->fail($user);
                redirect("/index.php?page=login", "Invalid username or password.", true);
            }

            $privateVars   = $privateVars ?? get_decoded_json_file(ALLSKY_ENV, true, "");
            $pass          = (string)($_POST['password'] ?? '');
            $adminUser     = (string)($privateVars["WEBUI_USERNAME"] ?? "");
            $adminPassword = (string)($privateVars["WEBUI_PASSWORD"] ?? "");

            $okUser = hash_equals($adminUser, $user);
            $okPass = password_verify($pass, $adminPassword);

            if (strlen($user) > 128 || strlen($pass) > 4096) {
                $throttle->fail($user);
                redirect("/index.php?page=login", "Invalid username or password.", true);
            }

            if ($okUser && $okPass) {
                $rememberLogin = isset($_POST['remember_login']) && $_POST['remember_login'] === '1';
                if ($rememberLogin) {
                    RememberMe::issueToken($adminUser);
                } else {
                    RememberMe::revokeAll($adminUser);
                }

                $throttle->reset($adminUser);
                session_regenerate_id(true);
                $_SESSION['auth'] = true;
                $_SESSION['user'] = $adminUser;
                unset($_SESSION['csrf_token']);
                redirect("/index.php?page=live_view");
            } else {
                $throttle->fail($user);
                redirect("/index.php?page=login", "Invalid username or password.", true);
            }
        }

        if ($page !== "login") {
            redirect("/index.php?page=login", null, true);
        }
    }
} else {
    if ($page == "login") {
        redirect("/index.php", null, true);
    }
}
?>
