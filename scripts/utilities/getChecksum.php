#!/usr/bin/php

<?php
// Determine the checksum for the files listed on stdin.
while (($file = fgets(STDIN))) {
	$c = crc32($file);
	echo "$c\t$file";
}
?>
