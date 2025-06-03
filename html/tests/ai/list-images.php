<?php
$folder = preg_replace('/[^0-9]/', '', $_GET['folder']); // sanitize YYYYMMDD
$baseDir = "/home/pi/allsky/images/$folder";

if (!is_dir($baseDir)) {
    http_response_code(400);
    echo json_encode([]);
    exit;
}

$images = array_values(array_filter(scandir($baseDir), function($file) use ($baseDir) {
    return preg_match('/\\.(jpg|jpeg|png|gif)$/i', $file) && is_file("$baseDir/$file");
}));

header('Content-Type: application/json');
echo json_encode($images);