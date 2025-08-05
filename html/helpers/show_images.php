<?php

// Web page to display images in a directory.

include_once('../includes/functions.php');
// initialize_variables();		// sets some variables

?>
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="utf-8">
	<meta http-equiv="X-UA-Compatible" content="IE=edge">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<meta name="description" content="WebUI 'helper' page to display images">
	<title><?php echo "Display Images"; ?></title>

	<link href="../documentation/css/custom.css" rel="stylesheet">
	<link href="../documentation/css/documentation.css" rel="stylesheet">
	<link rel="shortcut icon" type="image/ico" href="../favicon.ico">
</head>
<body>

<?php
$day = getVariableOrDefault($_REQUEST, 'day', "");
$pre = getVariableOrDefault($_REQUEST, 'pre', "");
$type = getVariableOrDefault($_REQUEST, 'type', "");

// true == list the file names
ListFileType("", "X${pre}", $type, "picture", true); 
?>

</body>
</html>
