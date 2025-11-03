<?php
if (basename(__FILE__) === basename($_SERVER['SCRIPT_FILENAME'])) {
    include_once('functions.php');
    redirect("/index.php");
}

function DisplayLoginPage()
{
    global $csrf_token; // YUK

    $alert = "";
    if (isset($_SESSION["flash"]) && $_SESSION["flash"] !== "") {
        $message = $_SESSION["flash"];
        $_SESSION["flash"] = "";
        $alert = '<div class="alert alert-danger" role="alert">' . htmlspecialchars($message) . '</div>';
    } else {
        $throttle = new LoginThrottle();
        $retryAfter = 0;
        if (!$throttle->check($retryAfter)) {
            $mins = max(1, ceil($retryAfter / 60));
            $alert = '<div class="alert alert-danger" role="alert">' . "Too many failed attempts. Try again in about {$mins} minute(s)." . '</div>';
        }
    }

    $version = "";
    $versionFile = ALLSKY_HOME . '/version';
    if (file_exists($versionFile)) {
        $contents = file_get_contents($versionFile);
        $version = strtok($contents, "\n");
        $version = "Version " . htmlspecialchars($version);
    }
?>
    <!DOCTYPE html>
    <html lang="en">
        <head>
            <meta charset="utf-8">
            <title>Allsky Login</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <link rel="icon" type="image/png" href="/favicon-96x96.png" sizes="96x96" />
            <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
            <link rel="shortcut icon" href="/favicon.ico" />
            <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
            <link rel="manifest" href="/site.webmanifest" />            
            <link href="documentation/bower_components/bootstrap/dist/css/bootstrap.min.css" rel="stylesheet">
		    <link rel="stylesheet" href="allsky/font-awesome/css/all.min.css" type="text/css">            
            <link rel="stylesheet" href="/css/login.css">
        </head>
        <body>
            <canvas id="bgCanvas"></canvas>
            <canvas id="tailCanvas"></canvas>
            <canvas id="planeCanvas"></canvas>
            <canvas id="fxCanvas"></canvas>
            <div class="login-panel noselect">
                <div class="login-avatar" aria-hidden="true"><img src="documentation/img/logo.png" alt="Allsky Logo" class="login-logo noselect"></div>
                <div class="panel panel-default">
                    <div class="panel-body text-center">
                        <?= $alert ?>
                        <form method="POST" role="form" style="margin-top:15px;">
                            <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($csrf_token) ?>">
                            <div class="form-group text-left">
                                <label for="inputUsername">User Name</label>
                                <input type="text" class="form-control" name="username" id="username" placeholder="Enter user name" required>
                            </div>
                            <div class="form-group text-left mt-5">
                                <label for="inputPassword">Password</label>
                                <input type="password" class="form-control" name="password" id="password" placeholder="Password" required>
                            </div>
                            <button type="submit" class="btn btn-primary btn-block mt-6">Login</button>
                            <small class="flex-right mt-3"><?= $version ?></small>
                        </form>
                    </div>
                </div>
            </div>
            <script src="documentation/bower_components/jquery/dist/jquery.min.js"></script>
            <script src="/js/login.js"></script>
        </body>
    </html>
<?php
}
