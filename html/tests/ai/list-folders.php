<?php
$baseDir = '/home/pi/allsky/images';
$folders = [];

if (is_dir($baseDir)) {
    $scan = scandir($baseDir);
    foreach ($scan as $folder) {
        if ($folder === '.' || $folder === '..') continue;
        $fullPath = $baseDir . '/' . $folder;
        if (is_dir($fullPath) && preg_match('/^\d{8}$/', $folder)) {
            $folders[] = $folder;
        }
    }
}

rsort($folders); // newest first
header('Content-Type: application/json');
echo json_encode($folders);