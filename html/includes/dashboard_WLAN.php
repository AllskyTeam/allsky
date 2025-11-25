<?php

if (basename(__FILE__) === basename($_SERVER['SCRIPT_FILENAME'])) {
    include_once('functions.php');
    redirect("/index.php");
}

function DisplayDashboard_WLAN()
{
	global $pageHeaderTitle, $pageIcon;
?>
	<div class="panel panel-allsky">
		<div class="panel-heading"><i class="<?php echo $pageIcon ?>"></i> <?php echo $pageHeaderTitle ?></div>
<?php
	$num_interfaces = 0;

	$dq = '"';		// double quote
	$cmd = "hwinfo --network --short | gawk '{ if ($2 == {$dq}WLAN{$dq}) print $1; }' ";
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
		process_WLAN_data($interface);
	}
	if ($num_interfaces > 1) echo "<hr class='panel-primary'>";
?>
	</div><!-- /.panel panel-primary -->
<?php
}

function process_WLAN_data($interface)
{
	global $page;
	$myStatus = new StatusMessages();

	$interface_output = get_interface_status("ifconfig $interface; iwconfig $interface");

	$notSetMsg = "[not set]";

	// $interface_output is sent and the other variables are returned.
	parse_ifconfig($interface_output, $strHWAddress, $strIPAddress, $strNetMask, $strRxPackets, $strTxPackets, $strRxBytes, $strTxBytes);

	// parse the iwconfig data:
	preg_match( '/ESSID:\"([-a-zA-Z0-9\s]+)\"/i', $interface_output, $result );
	$strSSID = getVariableOrDefault($result, 1, $notSetMsg);
	$strSSID = str_replace('"','', $strSSID);

	preg_match( '/Access Point: ([0-9a-f:]+)/i', $interface_output, $result );
	$strBSSID = getVariableOrDefault($result, 1, $notSetMsg);

	preg_match( '/Bit Rate=([0-9\.]+ Mb\/s)/i', $interface_output, $result );
	$strBitrate = getVariableOrDefault($result, 1, $notSetMsg);

	preg_match( '/Tx-Power=([0-9]+ dBm)/i', $interface_output, $result );
	$strTxPower = getVariableOrDefault($result, 1, $notSetMsg);

	// for example:   Link Quality=63/70.  Show absolute number (63) and percent (90%)
	preg_match( '/Link Quality=([0-9]+)\/([0-9]+)/i', $interface_output, $result );
	$strLinkQualityAbsolute = getVariableOrDefault($result, 1, $notSetMsg);
	$strLinkQualityMax = getVariableOrDefault($result, 2, $strLinkQualityAbsolute);
	if ($strLinkQualityAbsolute !== $notSetMsg && $strLinkQualityMax !== $notSetMsg) {
		$strLinkQualityPercent = number_format(($strLinkQualityAbsolute / $strLinkQualityMax) * 100, 0);
		if ($strLinkQualityPercent >= 75)
			$strLinkQuality_status = "success";
		else if ($strLinkQualityPercent >= 50)
			$strLinkQuality_status = "warning";
		else
			$strLinkQuality_status = "danger";
	} else {
		$strLinkQualityPercent = $strLinkQualityAbsolute;
		$strLinkQuality_status = "info";
	}

	preg_match( '/Signal level=(-?[0-9]+ dBm)/i', $interface_output, $result );
	$strSignalLevel = getVariableOrDefault($result, 1, $notSetMsg);

	preg_match('/Frequency:(\d+.\d+ GHz)/i', $interface_output, $result);
	$strFrequency = getVariableOrDefault($result, 1, $notSetMsg);

	// $interface and $interface_output are sent, $myStatus is returned.
	$interface_up = handle_interface_POST_and_status($interface, $interface_output, $myStatus);
?>
				<div class="panel-body">
					<?php if ($myStatus->isMessage()) echo "<p>" . $myStatus->showMessages() . "</p>"; ?>
					<div class="row">
						<div class="panel panel-default">
							<div class="panel-body">
								<h4><?php echo $interface ?> Interface Information</h4>
								<div class="info-item">IP Address</div>     <?php echo $strIPAddress ?><br>
								<div class="info-item">Subnet Mask</div>    <?php echo $strNetMask ?><br>
								<div class="info-item">Mac Address</div>    <?php echo $strHWAddress ?><br><br>

								<h4>Interface Statistics</h4>
								<div class="info-item">Received Packets</div>    <?php echo $strRxPackets ?><br>
								<div class="info-item">Received Bytes</div>      <?php echo $strRxBytes ?><br><br>
								<div class="info-item">Transferred Packets</div> <?php echo $strTxPackets ?><br>
								<div class="info-item">Transferred Bytes</div>   <?php echo $strTxBytes ?><br>
							</div><!-- /.panel-body -->
						</div><!-- /.panel panel-default -->

						<div class="panel panel-default">
							<div class="panel-body wireless">
								<h4>Wireless Information</h4>
								<div class="info-item">Connected To</div>   <?php echo $strSSID ?><br>
								<div class="info-item">AP Mac Address</div> <?php echo $strBSSID ?><br>
								<div class="info-item">Bitrate</div>        <?php echo $strBitrate ?><br>
								<div class="info-item">Signal Level</div>   <?php echo $strSignalLevel ?><br>
								<div class="info-item">Transmit Power</div> <?php echo $strTxPower ?><br>
								<div class="info-item">Frequency</div>      <?php echo $strFrequency ?><br>
								<div class="info-item">Link Quality</div>
<?php
						if ($strLinkQualityPercent == $notSetMsg) echo "$notSetMsg <br>";
						else {
?>
								<div class="progress">
									<div class="progress-bar progress-bar-<?php echo $strLinkQuality_status ?>"
										role="progressbar"
										aria-valuenow="<?php echo $strLinkQualityPercent ?>"
										aria-valuemin="0" aria-valuemax="100"
										style="width: <?php echo $strLinkQualityPercent ?>%;">
										<?php echo "$strLinkQualityPercent% &nbsp; &nbsp; ";
								  			echo "($strLinkQualityAbsolute / $strLinkQualityMax)\n";
										?>
									</div>
								</div>
<?php						} ?>
							</div><!-- /.panel-body wireless -->
						</div><!-- /.panel panel-default -->
					</div><!-- /.row -->

					<div class="col-lg-12">
						<div class="row">
						<form action="?page=<?php echo $page ?>" method="POST">
<?php
							echo "<input type='submit'";
							if ( !$interface_up ) {
								echo " class='btn btn-success' value='Start $interface' name='turn_up' />";
							} else {
								echo " class='btn btn-warning' value='Stop $interface' name='turn_down' />";
							}
							echo "\n";
?>
							<input type="button" class="btn btn-primary" value="Refresh" onclick="document.location.reload(true)" />
						</form>
						</div>
					</div>
				</div><!-- /.panel-body -->
<?php
}
?>
