<?php
if (basename(__FILE__) === basename($_SERVER['SCRIPT_FILENAME'])) {
    include_once(__DIR__ . '/../functions.php');
    redirect('/index.php');
}

// Compatibility shim: config backup helpers now live in /includes/configbackuputil.php.
include_once(__DIR__ . '/../configbackuputil.php');
