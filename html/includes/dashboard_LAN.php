<?php

if (basename(__FILE__) === basename($_SERVER['SCRIPT_FILENAME'])) {
    include_once('functions.php');
    redirect("/index.php");
}

function DisplayDashboard_LAN()
{
	global $pageHeaderTitle, $pageIcon;
?>
	<div class="panel panel-allsky">
		<div class="panel-heading"><i class="<?php echo $pageIcon ?>"></i> <?php echo $pageHeaderTitle ?></div>
<?php
	$num_interfaces = 0;

	$dq = '"';		// double quote
	$cmd = "hwinfo --network --short | gawk '{ if ($2 == {$dq}Ethernet{$dq}) print $1; }' ";
	if (exec($cmd, $output, $retval) === false || $retval !== 0) {
		echo "<div class='errorMsgBig'>Unable to get list of network devices</div>";
		return;
	}

	foreach($output as $interface) {
		if ($interface === "") continue;
		$num_interfaces++;
		if ($num_interfaces > 1) {
			echo "<hr class='panel-primary'>";
		}
		process_LAN_data($interface);
	}
	if ($num_interfaces > 1) echo "<hr class='panel-primary'>";
?>
		<div class="panel-footer">Information provided by ifconfig</div>
	</div><!-- /.panel-primary -->
<?php
}

function process_LAN_data($interface)
{
	global $page;
	$myStatus = new StatusMessages();

	// Unlike with WLAN where when it's UP it's also RUNNING,
	// with the LAN, the port can be up but nothing connected, i.e., not "RUNNING".

	$interface_output = get_interface_status("ifconfig $interface");

	// $interface_output is sent and the other variables are returned.
	parse_ifconfig($interface_output, $strHWAddress, $strIPAddress, $strNetMask, $strRxPackets, $strTxPackets, $strRxBytes, $strTxBytes);

	// $interface and $interface_output are sent, $myStatus is returned.
	$interface_up = handle_interface_POST_and_status($interface, $interface_output, $myStatus);
?>

		<div class="panel-body">
			<?php if ($myStatus->isMessage()) echo "<p>" . $myStatus->showMessages() . "</p>"; ?>
			<div class="row">
				<div class="panel panel-success">
					<div class="panel-body">
						<h4>Interface Information</h4>
						<div class="info-item">Interface Name</div> <?php echo $interface ?></br>
						<div class="info-item">IP Address</div>     <?php echo $strIPAddress ?></br>
						<div class="info-item">Subnet Mask</div>    <?php echo $strNetMask ?></br>
						<div class="info-item">Mac Address</div>    <?php echo $strHWAddress ?></br></br>

						<h4>Interface Statistics</h4>
						<div class="info-item">Received Packets</div>    <?php echo $strRxPackets ?></br>
						<div class="info-item">Received Bytes</div>      <?php echo $strRxBytes ?></br></br>
						<div class="info-item">Transferred Packets</div> <?php echo $strTxPackets ?></br>
						<div class="info-item">Transferred Bytes</div>   <?php echo $strTxBytes ?></br>
					</div><!-- /.panel-body -->
				</div><!-- /.panel-default -->
			</div><!-- /.row -->

			<div class="col-lg-12">
				<div class="row">
				<form action="?page=<?php echo $page ?>" method="POST">
<?php
					echo "<input type='submit'";
					if ( ! $interface_up ) {
						echo " class='btn btn-success' value='Start $interface' name='turn_up' />";
					} else {
						echo " class='btn btn-warning' value='Stop $interface' name='turn_down' />";
					}
?>
					<input type="button" class="btn btn-primary" value="Refresh" onclick="document.location.reload(true)" />
				</form>
				</div>
			</div>

		</div><!-- /.panel-body -->
<?php 
}
?>
