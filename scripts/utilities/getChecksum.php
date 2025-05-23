#!/usr/bin/php

<?php

// Determine the checksum for the files listed on stdin.

$num_lines = 0;
while (($file = fgets(STDIN)) !== false) {
	$num_lines++;

	$file = str_replace("\n", "", $file);		// zap the newline

	if (! file_exists($file)) {
		echo "WARNING: file '$file' does not exist.\n";
		continue;
	}

	$c = crc32($file);
	echo "$c\t$file\n";
}

if ($num_lines === 0) {
	echo "ERROR: No file names specified!\n";
}

?>
