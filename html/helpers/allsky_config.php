<?php

function runAllskyConfig($cmd, $args="")
{
	global $pageHeaderTitle, $pageIcon;
?>

	<div class="panel panel-allsky">
		<div class="panel-heading"><i class="<?php echo $pageIcon ?>"></i> <?php echo $pageHeaderTitle ?></div>
		<div class="panel-body">
<?php
			$cmd = ALLSKY_SCRIPTS .  "/allsky-config $cmd";
			exec("$cmd $args 2>&1", $result, $return_val);
			echo "<script>console.log(`[$cmd] returned $return_val`)</script>";
			echo implode("\n", $result);
?>
	</div>


<?php 
}
?>
