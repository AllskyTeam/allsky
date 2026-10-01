<?php
include_once('functions.php');
initialize_variables();
include_once('authenticate.php');

$src = isset($_GET['src']) ? (string) $_GET['src'] : '';
$type = isset($_GET['type']) ? (string) $_GET['type'] : 'video/mp4';

$parsedSrcPath = parse_url($src, PHP_URL_PATH);
$isAllowed = false;
if (is_string($parsedSrcPath) && $parsedSrcPath !== '') {
	$hasScheme = parse_url($src, PHP_URL_SCHEME) !== null;
	$hasHost = parse_url($src, PHP_URL_HOST) !== null;
	$hasTraversal = strpos($parsedSrcPath, '..') !== false;
	$isRootRelative = strncmp($parsedSrcPath, '/', 1) === 0;
	$extension = strtolower((string) pathinfo($parsedSrcPath, PATHINFO_EXTENSION));
	$allowedExtensions = ['mp4', 'webm', 'ogg', 'ogv'];

	if (! $hasScheme && ! $hasHost && ! $hasTraversal && $isRootRelative && in_array($extension, $allowedExtensions, true)) {
		$isAllowed = true;
	}
}

if (! $isAllowed) {
	http_response_code(400);
	?><!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title>Invalid Video</title>
</head>
<body style="margin:0;background:#000;color:#fff;font-family:Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;">
	<div>Invalid video source.</div>
</body>
</html>
<?php
	exit;
}

$safeSrc = htmlspecialchars($src, ENT_QUOTES, 'UTF-8');
$safeType = htmlspecialchars($type, ENT_QUOTES, 'UTF-8');
?><!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title>Video Player</title>
	<style>
		html, body {
			margin: 0;
			width: 100%;
			height: 100%;
			background: #000;
			overflow: hidden;
		}
		body {
			display: flex;
			align-items: center;
			justify-content: center;
		}
		video {
			width: 100%;
			height: 100%;
			max-width: 100%;
			max-height: 100%;
			background: #000;
		}
	</style>
</head>
<body>
	<video controls playsinline preload="metadata" autoplay>
		<source src="<?php echo $safeSrc; ?>" type="<?php echo $safeType; ?>">
		Your browser does not support the video tag.
	</video>
</body>
</html>
