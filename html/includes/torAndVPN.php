<?php

/**
*
*
*/
function DisplayOpenVPNConfig() {
	$ok = true;
	exec( 'cat '. RASPI_OPENVPN_CLIENT_CONFIG, $returnClient, $ret );
	if ($ret !== 0) {
		echo "<p>Unable to read " . RASPI_OPENVPN_CLIENT_CONFIG . "</p>";
		$ok = false;
	}
	exec( 'cat '. RASPI_OPENVPN_SERVER_CONFIG, $returnServer, $ret );
	if ($ret !== 0) {
		echo "<p>Unable to read " . RASPI_OPENVPN_SERVER_CONFIG . "</p>";
		$ok = false;
	}
	if (! $ok) return false;

	exec( 'pidof openvpn | wc -l', $openvpnstatus);

	if( $openvpnstatus[0] == 0 ) {
		$myStatus = '<div class="alert alert-warning alert-dismissable">OpenVPN is not running';
	} else {
		$myStatus = '<div class="alert alert-success alert-dismissable">OpenVPN is running';
	}
	$myStatus .= '<button type="button" class="close" data-dismiss="alert" aria-hidden="true">x</button></div>';

	// parse client settings
	foreach( $returnClient as $a ) {
		if( $a[0] != "#" ) {
			$arrLine = explode( " ",$a) ;
			$arrClientConfig[$arrLine[0]]=$arrLine[1];
		}
	}

	// parse server settings
	foreach( $returnServer as $a ) {
		if( $a[0] != "#" ) {
			$arrLine = explode( " ",$a) ;
			$arrServerConfig[$arrLine[0]]=$arrLine[1];
		}
	}
	?>

	<div class="row">
	<div class="col-lg-12">
	<div class="panel panel-primary">
		<div class="panel-heading"><i class="fa fa-lock fa-fw"></i> Configure OpenVPN</div>
		<!-- /.panel-heading -->
		<div class="panel-body">
			<!-- Nav tabs -->
			<ul class="nav nav-tabs">
				<li class="active"><a href="#openvpnclient" data-toggle="tab">Client settings</a></li>
				<li><a href="#openvpnserver" data-toggle="tab">Server settings</a></li>
			</ul>
			<form role="form" action="?page=save_hostapd_conf" method="POST">
			<!-- Tab panes -->
		   	<div class="tab-content">
		   		<p><?php echo $myStatus; ?></p>
				<div class="tab-pane fade in active" id="openvpnclient">
				<h4>Client settings</h4>
					<div class="row">
						<div class="form-group col-md-4">
							<label>Select OpenVPN configuration file (.ovpn)</label>
							<input type="file" name="openvpn-config">
						</div>
					</div>
					<div class="row">
						<div class="form-group col-md-4">
							<label for="code">Client Log</label>
							<input type="text" class="form-control" id="disabledInput"
								name="log-append" type="text"
								placeholder="<?php echo $arrClientConfig['log-append']; ?>" disabled />
						</div>
					</div>
				</div>
				<div class="tab-pane fade" id="openvpnserver">
					<h4>Server settings</h4>
					<div class="row">
						<div class="form-group col-md-4">
						<label for="code">Port</label>
						<input type="text" class="form-control"
							name="openvpn_port" value="<?php echo $arrServerConfig['port'] ?>" />
						</div>
					</div>
					<div class="row">
						<div class="form-group col-md-4">
						<label for="code">Protocol</label>
						<input type="text" class="form-control"
							name="openvpn_proto" value="<?php echo $arrServerConfig['proto'] ?>" />
						</div>
					</div>
					<div class="row">
						<div class="form-group col-md-4">
						<label for="code">Root CA certificate</label>
						<input type="text" class="form-control"
							name="openvpn_rootca" placeholder="<?php echo $arrServerConfig['ca']; ?>" disabled />
						</div>
					</div>
					<div class="row">
						<div class="form-group col-md-4">
						<label for="code">Server certificate</label>
						<input type="text" class="form-control"
							name="openvpn_cert" placeholder="<?php echo $arrServerConfig['cert']; ?>" disabled />
						</div>
					</div>
					<div class="row">
						<div class="form-group col-md-4">
						<label for="code">Diffie Hellman parameters</label>
						<input type="text" class="form-control"
							name="openvpn_dh" placeholder="<?php echo $arrServerConfig['dh']; ?>" disabled />
						</div>
					</div>
					<div class="row">
						<div class="form-group col-md-4">
						<label for="code">KeepAlive</label>
						<input type="text" class="form-control"
							name="openvpn_keepalive" value="<?php echo $arrServerConfig['keepalive']; ?>" />
						</div>
					</div>
					<div class="row">
						<div class="form-group col-md-4">
						<label for="code">Server log</label>
						<input type="text" class="form-control"
							name="openvpn_status" placeholder="<?php echo $arrServerConfig['status']; ?>" disabled />
						</div>
					</div>
				</div><!-- /tab-pane fade -->
		   	</div><!-- /tab-content -->
			<input type="submit" class="btn btn-outline btn-primary"
				name="SaveOpenVPNSettings" value="Save settings" />
			<?php
			if($hostapdstatus[0] == 0) {
				echo '<input type="submit" class="btn btn-outline btn-success" name="StartOpenVPN" value="Start OpenVPN" />';
			} else {
				echo '<input type="submit" class="btn btn-outline btn-warning" name="StopOpenVPN" value="Stop OpenVPN" />';
			}
			?>
			</form>
		</div><!-- /.panel-body -->
	</div><!-- /.panel-primary -->
	<div class="panel-footer"> Information provided by openvpn</div>
	</div><!-- /.col-lg-12 -->
	</div><!-- /.row -->
<?php
}

/**
*
*
*/
function DisplayTorProxyConfig(){

	$ok = true;
	exec( 'cat '. RASPI_TORPROXY_CONFIG, $return, $ret );
	if ($ret !== 0) {
		echo "<p>Unable to read " . RASPI_TORPROXY_CONFIG . "</p>";
		$ok = false;
	}
	if (! $ok) return false;

	exec( 'pidof tor | wc -l', $torproxystatus);

	if( $torproxystatus[0] == 0 ) {
		$myStatus = '<div class="alert alert-warning alert-dismissable">TOR is not running';
	} else {
		$myStatus = '<div class="alert alert-success alert-dismissable">TOR is running';
	}
	$myStatus .= '<button type="button" class="close" data-dismiss="alert" aria-hidden="true">x</button></div>';

	foreach( $return as $a ) {
		if( $a[0] != "#" ) {
			$arrLine = explode( " ",$a) ;
			$arrConfig[$arrLine[0]]=$arrLine[1];
		}
	}

	?>
	<div class="row">
	<div class="col-lg-12">
	<div class="panel panel-primary">
		<div class="panel-heading"><i class="fa fa-eye-slash fa-fw"></i> Configure TOR proxy</div>
		<!-- /.panel-heading -->
		<div class="panel-body">
			<!-- Nav tabs -->
			<ul class="nav nav-tabs">
				<li class="active"><a href="#basic" data-toggle="tab">Basic</a></li>
				<li><a href="#relay" data-toggle="tab">Relay</a></li>
			</ul>

			<form role="form" action="?page=save_hostapd_conf" method="POST">
			<!-- Tab panes -->
		   	<div class="tab-content">
		   		<p><?php echo $myStatus; ?></p>

				<div class="tab-pane fade in active" id="basic">
					<h4>Basic settings</h4>
					<div class="row">
						<div class="form-group col-md-4">
							<label for="code">VirtualAddrNetwork</label>
							<input type="text" class="form-control"
								name="virtualaddrnetwork"
								value="<?php echo $arrConfig['VirtualAddrNetwork']; ?>" />
						</div>
					</div>
					<div class="row">
						<div class="form-group col-md-4">
							<label for="code">AutomapHostsSuffixes</label>
							<input type="text" class="form-control"
								name="automaphostssuffixes"
								value="<?php echo $arrConfig['AutomapHostsSuffixes']; ?>" />
						</div>
					</div>
					<div class="row">
						<div class="form-group col-md-4">
							<label for="code">AutomapHostsOnResolve</label>
							<input type="text" class="form-control"
								name="automaphostsonresolve"
								value="<?php echo $arrConfig['AutomapHostsOnResolve']; ?>" />
						</div>
					</div>
					<div class="row">
						<div class="form-group col-md-4">
							<label for="code">TransListenAddress</label>
							<input type="text" class="form-control"
								name="translistenaddress"
								value="<?php echo $arrConfig['TransListenAddress']; ?>" />
						</div>
					</div>
					<div class="row">
						<div class="form-group col-md-4">
							<label for="code">DNSPort</label>
							<input type="text" class="form-control"
								name="dnsport"
								value="<?php echo $arrConfig['DNSPort']; ?>" />
						</div>
					</div>
					<div class="row">
						<div class="form-group col-md-4">
							<label for="code">DNSListenAddress</label>
							<input type="text" class="form-control"
								name="dnslistenaddress"
								value="<?php echo $arrConfig['DNSListenAddress']; ?>" />
						</div>
					</div>
				</div>
				<div class="tab-pane fade" id="relay">
					<h4>Relay settings</h4>
					<div class="row">
						<div class="form-group col-md-4">
							<label for="code">ORPort</label>
							<input type="text" class="form-control"
								name="orport"
								value="<?php echo $arrConfig['ORPort']; ?>" />
						</div>
					</div>
					<div class="row">
						<div class="form-group col-md-4">
							<label for="code">ORListenAddress</label>
							<input type="text" class="form-control"
								name="orlistenaddress"
								value="<?php echo $arrConfig['ORListenAddress']; ?>" />
						</div>
					</div>
					<div class="row">
						<div class="form-group col-md-4">
							<label for="code">Nickname</label>
							<input type="text" class="form-control"
								name="nickname"
								value="<?php echo $arrConfig['Nickname']; ?>" />
						</div>
					</div>
					<div class="row">
						<div class="form-group col-md-4">
							<label for="code">Address</label>
							<input type="text" class="form-control"
								name="address"
								value="<?php echo $arrConfig['Address']; ?>" />
						</div>
					</div>
					<div class="row">
						<div class="form-group col-md-4">
							<label for="code">RelayBandwidthRate</label>
							<input type="text" class="form-control"
								name="relaybandwidthrate"
								value="<?php echo $arrConfig['RelayBandwidthRate']; ?>" />
						</div>
					</div>
					<div class="row">
						<div class="form-group col-md-4">
							<label for="code">RelayBandwidthBurst</label>
							<input type="text" class="form-control"
								name="relaybandwidthburst"
								value="<?php echo $arrConfig['RelayBandwidthBurst']; ?>" />
						</div>
					</div>
				</div>

				<input type="submit" class="btn btn-outline btn-primary"
					name="SaveTORProxySettings" value="Save settings" />
				<?php
				if( $torproxystatus[0] == 0 ) {
					echo '<input type="submit" class="btn btn-success" name="StartTOR" value="Start TOR" />';
				} else {
					echo '<input type="submit" class="btn btn-warning" name="StopTOR" value="Stop TOR" />';
				};
				?>
			</div><!-- /.tab-content -->
			</form>
		</div><!-- /.panel-body -->
		<div class="panel-footer"> Information provided by tor</div>
	</div><!-- /.panel-primary -->
	</div><!-- /.col-lg-12 -->
	</div><!-- /.row -->
<?php
}

/**
*
*
*/
function SaveTORAndVPNConfig(){
	if( isset($_POST['SaveOpenVPNSettings']) ) {
		// TODO

	} elseif( isset($_POST['SaveTORProxySettings']) ) {
		// TODO

	} elseif( isset($_POST['StartOpenVPN']) ) {
		echo "Attempting to start openvpn";
		exec( 'sudo /etc/init.d/openvpn start', $return );
		foreach( $return as $line ) {
			echo "$line<br />";
		}

	} elseif( isset($_POST['StopOpenVPN']) ) {
		echo "Attempting to stop openvpn";
		exec( 'sudo /etc/init.d/openvpn stop', $return );
		foreach( $return as $line ) {
			echo "$line<br />";
		}

	} elseif( isset($_POST['StartTOR']) ) {
		echo "Attempting to start TOR";
		exec( 'sudo /etc/init.d/tor start', $return );
		foreach( $return as $line ) {
			echo "$line<br />";
		}

	} elseif( isset($_POST['StopTOR']) ) {
		echo "Attempting to stop TOR";
		exec( 'sudo /etc/init.d/tor stop', $return );
		foreach( $return as $line ) {
			echo "$line<br />";
		}
	}
}

?>
