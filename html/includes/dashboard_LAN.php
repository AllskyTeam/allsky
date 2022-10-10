<?php

/**
*
*
*/
function DisplayDashboard_LAN($interface) {
	// Unlike with WLAN where when it's UP it's also RUNNING,
	// with the LAN, the port can be up but nothing connected, i.e., not "RUNNING".

	$status = new StatusMessages();

	$interface_output = get_interface_status("ifconfig $interface");

	// $interface_output is sent and the other variables are returned.
	parse_ifconfig($interface_output, $strHWAddress, $strIPAddress, $strNetMask, $strRxPackets, $strTxPackets, $strRxBytes, $strTxBytes);

	// $interface and $interface_output are sent, $status is returned.
	$interface_up = handle_interface_POST_and_status($interface, $interface_output, $status);
?>

<div class="row">
<div class="col-lg-12">
	<div class="panel panel-primary">
		<div class="panel-heading"><i class="fa fa-network-wired fa-fw"></i> LAN Dashboard</div>
		<div class="panel-body">
			<p><?php $status->showMessages(); ?></p>
			<div class="row">
				<div class="panel panel-default">
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
				<form action="?page=<?php echo $interface ?>_info" method="POST">
<?php
					if ( ! $interface_up ) {
						echo "<input type='submit' class='btn btn-success' value='Start $interface' name='turn_up' />";
					} else {
						echo "<input type='submit' class='btn btn-warning' value='Stop $interface' name='turn_down' />";
					}
?>
					<input type="button" class="btn btn-outline btn-primary" value="Refresh" onclick="document.location.reload(true)" />
				</form>
				</div>
			</div>

		</div><!-- /.panel-body -->
		<div class="panel-footer">Information provided by ifconfig</div>
	</div><!-- /.panel-primary -->
</div><!-- /.col-lg-12 -->
</div><!-- /.row -->
<?php 
}
?>
