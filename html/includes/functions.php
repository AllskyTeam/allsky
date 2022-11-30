<?php

/**
 *
 * This code is executed outside of a function and is needed by index.php and public.php.
 * It's centralized in this file to make it easier to maintain.
 *
*/

// Sets all the define() variables.
$defs = 'allskyDefines.inc';
if ((include $defs) == false) {
	echo "<div style='font-size: 200%;'>";
	echo "<p style='color: red'>";
	echo "The installation of the WebUI is incomplete.<br>";
	echo "File '$defs' not found.<br>";
	echo "Please run the following from the 'allsky' directory:";
	echo "</p>";
	echo "<code>   ./install.sh --function create_webui_defines</code>";
	echo "</div>";
	exit;
}

$status = null;		// Global pointer to status messages
$image_name=null; $delay=null; $daydelay=null; $nightdelay=null; $darkframe=null; $useLogin=null;
$temptype = null;
function initialize_variables() {
	global $image_name, $delay, $daydelay, $nightdelay, $darkframe, $useLogin, $temptype;

	// The Camera Type should be set during the installation, so this "should" never fail...
	$cam_type = getCameraType();
	if ($cam_type == '') {
		echo "<div style='color: red; font-size: 200%;'>";
		echo "'Camera Type' not defined in the WebUI.  Please update it.";
		echo "</div>";
		exit;
	}

	$settings_file = getSettingsFile();
	if (! file_exists($settings_file)) {
		echo "<div style='color: red; font-size: 200%;'>";
		echo "ERROR: Unable to find camera settings file for camera of type '$cam_type'.";
		echo "<br>File '$settings_file' missing!";
		echo "</div>";
		exit;
	}

	$settings_str = file_get_contents($settings_file, true);
	$settings_array = json_decode($settings_str, true);
	// $img_dir is an alias in the web server's config that points to where the current image is.
	// It's the same as ${ALLSKY_TMP} which is the physical path name on the server.
	$img_dir = get_variable(ALLSKY_CONFIG . '/config.sh', 'IMG_DIR=', 'current/tmp');
	$image_name = $img_dir . "/" . $settings_array['filename'];
	$darkframe = $settings_array['takeDarkFrames'];
	$useLogin = getVariableOrDefault($settings_array, 'useLogin', true);
	$temptype = getVariableOrDefault($settings_array, 'temptype', "C");


	////////////////// Determine delay between refreshes of the image.
	$consistentDelays = $settings_array["consistentDelays"] == 1 ? true : false;
	$daydelay = $settings_array["daydelay"] +
		($consistentDelays ? $settings_array["daymaxautoexposure"] : $settings_array["dayexposure"]);
	$nightdelay = $settings_array["nightdelay"] +
		($consistentDelays ? $settings_array["nightmaxautoexposure"] : $settings_array["nightexposure"]);

	$showDelay = getVariableOrDefault($settings_array, 'showDelay', true);
	if ($showDelay) {
		// Determine if it's day or night so we know which delay to use.
		$angle = $settings_array['angle'];
		$lat = $settings_array['latitude'];
		$lon = $settings_array['longitude'];
		exec("sunwait poll exit set angle $angle $lat $lon", $return, $retval);
		if ($retval == 2) {
			$delay = $daydelay;
		} else if ($retval == 3) {
			$delay = $nightdelay;
		} else {
			echo "<p class='errorMsg'>ERROR: 'sunwait' returned exit code $retval so we don't know if it's day or night.</p>";
			$delay = ($daydelay + $nightdelay) / 2;		// Use the average delay
		}

		// Convert to seconds for display.
		$daydelay /= 1000;
		$nightdelay /= 1000;
	} else {
		// Not showing delay so just use average
		$delay = ($daydelay + $nightdelay) / 2;		// Use the average delay
		$daydelay = -1;		// signifies it's not being used
	}
	// Lessen the delay between a new picture and when we check.
	$delay /= 4;
}

/**
*
* We need to make sure we're only trying to display and delete image directories, not ones like /etc.
* In this case "valid" means it's an image directory.
* We allow "test*" in case the user created a directory for testing.
* Example directory: 20210710.  They should start with "2" for the 2000's.
*
*/
function is_valid_directory($directory_name) {
	return preg_match('/^(2\d{7}|test\w*)$/', basename($directory_name));
}

/**
*
* Add CSRF Token to form
*
*/
function CSRFToken() {
	global $useLogin;
	if (! $useLogin) return;
?>
<input type="hidden" name="csrf_token" value="<?php echo $_SESSION['csrf_token']; ?>" />
<?php
}

/**
*
* Validate CSRF Token
*
*/
function CSRFValidate() {
  global $useLogin;
  if (! $useLogin) return true;
  if (isset($_POST['csrf_token']) && hash_equals($_POST['csrf_token'], $_SESSION['csrf_token']) ) {
    return true;
  } else {
    error_log('CSRF violation');
    return false;
  }
}

/**
* Test whether array is associative
*/
function isAssoc($arr) {
  return array_keys($arr) !== range(0, count($arr) - 1);
}

/**
*
* Display a selector field for a form. Arguments are:
*   $name:     Field name
*   $options:  Array of options
*   $selected: Selected option (optional)
*       If $options is an associative array this should be the key
*
*/
function SelectorOptions($name, $options, $selected = null) {
  echo "<select class=\"form-control\" name=\"$name\">";
  foreach ( $options as $opt => $label) {
    $select = '';
    $key = isAssoc($options) ? $opt : $label;
    if( $key == $selected ) {
      $select = " selected";
    }
    echo "<option value=\"$key\"$select>$label</options>";
  }
  echo "</select>";
}

/**
*
* @param string $input
* @param string $string
* @param int $offset
* @param string $separator
* @return $string
*/
function GetDistString( $input,$string,$offset,$separator ) {
	$string = substr( $input,strpos( $input,$string )+$offset,strpos( substr( $input,strpos( $input,$string )+$offset ), $separator ) );
	return $string;
}

/**
*
* @param array $arrConfig
* @return $config
*/
function ParseConfig( $arrConfig ) {
	$config = array();
	foreach( $arrConfig as $line ) {
		$line = trim($line);
		if( $line != "" && $line[0] != "#" ) {
			$arrLine = explode( "=",$line );
			$config[$arrLine[0]] = ( count($arrLine) > 1 ? $arrLine[1] : true );
		}
	}
	return $config;
}

/**
*
* @param string $freq
* @return $channel
*/
function ConvertToChannel( $freq ) {
  $channel = ($freq - 2407)/5;	// check for 2.4 GHz
  if ($channel > 0 && $channel <= 14) {
    return $channel . " / 2.4GHz";
  } else {	// check for 5 GHz
    $channel = ($freq - 5030)/5;
    if ($channel >= 7 && $channel <= 165) {
      // There are also some channels in the 4915 - 4980 range...
      return $channel . " / 5GHz";
    } else {
      return 'Invalid&nbsp;Channel, Hz=' . $freq;
    }
  }
}

/**
* Converts WPA security string to readable format
* @param string $security
* @return string
*/
function ConvertToSecurity( $security ) {
  $options = array();
  preg_match_all('/\[([^\]]+)\]/s', $security, $matches);
  foreach($matches[1] as $match) {
    if (preg_match('/^(WPA\d?)/', $match, $protocol_match)) {
      $protocol = $protocol_match[1];
      $matchArr = explode('-', $match);
      if (count($matchArr) > 2) {
        $options[] = $protocol . ' ('. $matchArr[2] .')';
      } else {
        $options[] = $protocol;
      }
    }
  }

  if (count($options) === 0) {
    // This could also be WEP but wpa_supplicant doesn't have a way to determine
    // this.
    // And you shouldn't be using WEP these days anyway.
    return 'Open';
  } else {
    return implode('<br />', $options);
  }
}

/**
*
*
*/
function DisplayOpenVPNConfig() {

	exec( 'cat '. RASPI_OPENVPN_CLIENT_CONFIG, $returnClient );
	exec( 'cat '. RASPI_OPENVPN_SERVER_CONFIG, $returnServer );
	exec( 'pidof openvpn | wc -l', $openvpnstatus);

	if( $openvpnstatus[0] == 0 ) {
		$status = '<div class="alert alert-warning alert-dismissable">OpenVPN is not running
					<button type="button" class="close" data-dismiss="alert" aria-hidden="true">x</button></div>';
	} else {
		$status = '<div class="alert alert-success alert-dismissable">OpenVPN is running
					<button type="button" class="close" data-dismiss="alert" aria-hidden="true">x</button></div>';
	}

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
			<div class="panel-heading"><i class="fa fa-lock fa-fw"></i> Configure OpenVPN 
            </div>
        <!-- /.panel-heading -->
        <div class="panel-body">
        	<!-- Nav tabs -->
            <ul class="nav nav-tabs">
                <li class="active"><a href="#openvpnclient" data-toggle="tab">Client settings</a>
                </li>
                <li><a href="#openvpnserver" data-toggle="tab">Server settings</a>
                </li>
            </ul>
            <!-- Tab panes -->
           	<div class="tab-content">
           		<p><?php echo $status; ?></p>
            	<div class="tab-pane fade in active" id="openvpnclient">
            		
            		<h4>Client settings</h4>
					<form role="form" action="?page=save_hostapd_conf" method="POST">

					<div class="row">
						<div class="form-group col-md-4">
	                        <label>Select OpenVPN configuration file (.ovpn)</label>
	                        <input type="file" name="openvpn-config">
	                    </div>
					</div>
					<div class="row">
						<div class="form-group col-md-4">
							<label for="code">Client Log</label>
							<input type="text" class="form-control" id="disabledInput" name="log-append" type="text" placeholder="<?php echo $arrClientConfig['log-append']; ?>" disabled />
						</div>
					</div>
				</div>
				<div class="tab-pane fade" id="openvpnserver">
            		<h4>Server settings</h4>
            		<div class="row">
						<div class="form-group col-md-4">
            			<label for="code">Port</label> 
            			<input type="text" class="form-control" name="openvpn_port" value="<?php echo $arrServerConfig['port'] ?>" />
						</div>
					</div>
					<div class="row">
						<div class="form-group col-md-4">
						<label for="code">Protocol</label>
						<input type="text" class="form-control" name="openvpn_proto" value="<?php echo $arrServerConfig['proto'] ?>" />
						</div>
					</div>
					<div class="row">
						<div class="form-group col-md-4">
						<label for="code">Root CA certificate</label>
						<input type="text" class="form-control" name="openvpn_rootca" placeholder="<?php echo $arrServerConfig['ca']; ?>" disabled />
						</div>
					</div>
					<div class="row">
						<div class="form-group col-md-4">
						<label for="code">Server certificate</label>
						<input type="text" class="form-control" name="openvpn_cert" placeholder="<?php echo $arrServerConfig['cert']; ?>" disabled />
						</div>
					</div>
					<div class="row">
						<div class="form-group col-md-4">
						<label for="code">Diffie Hellman parameters</label>
						<input type="text" class="form-control" name="openvpn_dh" placeholder="<?php echo $arrServerConfig['dh']; ?>" disabled />
						</div>
					</div>
					<div class="row">
						<div class="form-group col-md-4">
						<label for="code">KeepAlive</label>
						<input type="text" class="form-control" name="openvpn_keepalive" value="<?php echo $arrServerConfig['keepalive']; ?>" />
						</div>
					</div>
					<div class="row">
						<div class="form-group col-md-4">
						<label for="code">Server log</label>
						<input type="text" class="form-control" name="openvpn_status" placeholder="<?php echo $arrServerConfig['status']; ?>" disabled />
						</div>
					</div>
            	</div>
				<input type="submit" class="btn btn-outline btn-primary" name="SaveOpenVPNSettings" value="Save settings" />
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

	exec( 'cat '. RASPI_TORPROXY_CONFIG, $return );
	exec( 'pidof tor | wc -l', $torproxystatus);

	if( $torproxystatus[0] == 0 ) {
		$status = '<div class="alert alert-warning alert-dismissable">TOR is not running
					<button type="button" class="close" data-dismiss="alert" aria-hidden="true">x</button></div>';
	} else {
		$status = '<div class="alert alert-success alert-dismissable">TOR is running
					<button type="button" class="close" data-dismiss="alert" aria-hidden="true">x</button></div>';
	}

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
			<div class="panel-heading"><i class="fa fa-eye-slash fa-fw"></i> Configure TOR proxy
            </div>
        <!-- /.panel-heading -->
        <div class="panel-body">
        	<!-- Nav tabs -->
            <ul class="nav nav-tabs">
                <li class="active"><a href="#basic" data-toggle="tab">Basic</a>
                </li>
                <li><a href="#relay" data-toggle="tab">Relay</a>
                </li>
            </ul>

            <!-- Tab panes -->
           	<div class="tab-content">
           		<p><?php echo $status; ?></p>

            	<div class="tab-pane fade in active" id="basic">
            		<h4>Basic settings</h4>
					<form role="form" action="?page=save_hostapd_conf" method="POST">
					<div class="row">
						<div class="form-group col-md-4">
							<label for="code">VirtualAddrNetwork</label>
							<input type="text" class="form-control" name="virtualaddrnetwork" value="<?php echo $arrConfig['VirtualAddrNetwork']; ?>" />
						</div>
					</div>
					<div class="row">
						<div class="form-group col-md-4">
							<label for="code">AutomapHostsSuffixes</label>
							<input type="text" class="form-control" name="automaphostssuffixes" value="<?php echo $arrConfig['AutomapHostsSuffixes']; ?>" />
						</div>
					</div>
					<div class="row">
						<div class="form-group col-md-4">
							<label for="code">AutomapHostsOnResolve</label>
							<input type="text" class="form-control" name="automaphostsonresolve" value="<?php echo $arrConfig['AutomapHostsOnResolve']; ?>" />
						</div>
					</div>	
					<div class="row">
						<div class="form-group col-md-4">
							<label for="code">TransListenAddress</label>
							<input type="text" class="form-control" name="translistenaddress" value="<?php echo $arrConfig['TransListenAddress']; ?>" />
						</div>
					</div>	
					<div class="row">
						<div class="form-group col-md-4">
							<label for="code">DNSPort</label>
							<input type="text" class="form-control" name="dnsport" value="<?php echo $arrConfig['DNSPort']; ?>" />
						</div>
					</div>
					<div class="row">
						<div class="form-group col-md-4">
							<label for="code">DNSListenAddress</label>
							<input type="text" class="form-control" name="dnslistenaddress" value="<?php echo $arrConfig['DNSListenAddress']; ?>" />
						</div>
					</div>
				</div>
				<div class="tab-pane fade" id="relay">
            		<h4>Relay settings</h4>
            		<div class="row">
						<div class="form-group col-md-4">
							<label for="code">ORPort</label>
							<input type="text" class="form-control" name="orport" value="<?php echo $arrConfig['ORPort']; ?>" />
						</div>
					</div>
					<div class="row">
						<div class="form-group col-md-4">
							<label for="code">ORListenAddress</label>
							<input type="text" class="form-control" name="orlistenaddress" value="<?php echo $arrConfig['ORListenAddress']; ?>" />
						</div>
					</div>
					<div class="row">
						<div class="form-group col-md-4">
							<label for="code">Nickname</label>
							<input type="text" class="form-control" name="nickname" value="<?php echo $arrConfig['Nickname']; ?>" />
						</div>
					</div>
					<div class="row">
						<div class="form-group col-md-4">
							<label for="code">Address</label>
							<input type="text" class="form-control" name="address" value="<?php echo $arrConfig['Address']; ?>" />
						</div>
					</div>
					<div class="row">
						<div class="form-group col-md-4">
							<label for="code">RelayBandwidthRate</label>
							<input type="text" class="form-control" name="relaybandwidthrate" value="<?php echo $arrConfig['RelayBandwidthRate']; ?>" />
						</div>
					</div>
					<div class="row">
						<div class="form-group col-md-4">
							<label for="code">RelayBandwidthBurst</label>
							<input type="text" class="form-control" name="relaybandwidthburst" value="<?php echo $arrConfig['RelayBandwidthBurst']; ?>" />
						</div>
					</div>
            	</div>
		
				<input type="submit" class="btn btn-outline btn-primary" name="SaveTORProxySettings" value="Save settings" />
				<?php 
				if( $torproxystatus[0] == 0 ) {
					echo '<input type="submit" class="btn btn-success" name="StartTOR" value="Start TOR" />';
				} else {
					echo '<input type="submit" class="btn btn-warning" name="StopTOR" value="Stop TOR" />';
				};
				?>
				</form>
			</div><!-- /.tab-content -->
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
      echo $line."<br />";
    }
  } elseif( isset($_POST['StopOpenVPN']) ) {
    echo "Attempting to stop openvpn";
    exec( 'sudo /etc/init.d/openvpn stop', $return );
    foreach( $return as $line ) {
      echo $line."<br />";
    }
  } elseif( isset($_POST['StartTOR']) ) {
    echo "Attempting to start TOR";
    exec( 'sudo /etc/init.d/tor start', $return );
    foreach( $return as $line ) {
      echo $line."<br />";
    }
  } elseif( isset($_POST['StopTOR']) ) {
    echo "Attempting to stop TOR";
    exec( 'sudo /etc/init.d/tor stop', $return );
    foreach( $return as $line ) {
      echo $line."<br />";
    }
  }
}

/**
*
* Functions to get the status output of an interface determine if it's up or down and
* to parse "ifconfig" output and return results.
*/
function get_interface_status($cmd) {
	exec($cmd, $return );
	return(preg_replace('/\s\s+/', ' ', implode(" ", $return)));
}

function is_interface_up($status) {
	return(strpos($status, "UP") !== false ? true : false);
}

function is_interface_running($status) {
	return(strpos($status, "RUNNING") !== false ? true : false);
}

function parse_ifconfig($input, &$strHWAddress, &$strIPAddress, &$strNetMask, &$strRxPackets, &$strTxPackets, &$strRxBytes, &$strTxBytes) {
	preg_match( '/ether ([0-9a-f:]+)/i', $input, $result );
	$strHWAddress = $result[1];
	preg_match( '/inet ([0-9.]+)/i', $input, $result );
	$strIPAddress = getVariableOrDefault($result, 1, "[not set]");

	preg_match( '/netmask ([0-9.]+)/i', $input, $result );
	$strNetMask = getVariableOrDefault($result, 1, "[not set]");

	preg_match( '/RX packets (\d+)/', $input, $result );
	$strRxPackets = getVariableOrDefault($result, 1, "[not set]");

	preg_match( '/TX packets (\d+)/', $input, $result );
	$strTxPackets = getVariableOrDefault($result, 1, "[not set]");

	preg_match_all( '/bytes (\d+ \(\d+.\d+ [K|M|G]iB\))/i', $input, $result );
	if (isset($result[1][0])) {
		$strRxBytes = $result[1][0];
		$strTxBytes = $result[1][1];
	} else {
		$strRxBytes = 0;
		$strTxBytes = 0;
	}
}

function handle_interface_POST_and_status($interface, $input, &$status) {
	$interface_up = false;
	if( isset($_POST['turn_down']) ) {
		// We should only get here if the interface is up,
		// but just in case, check if it's already down.
		// If the interface is down it's also not running.
		$s = get_interface_status("ifconfig $interface");
		if (! is_interface_up($s)) {
			$status->addMessage('Interface was already down', 'warning');
		} else {
			exec( "sudo ifconfig $interface down 2>&1", $output );	// stop
			// Check that it actually stopped
			$s = get_interface_status("ifconfig $interface");
			if (! is_interface_up($s)) {
				$status->addMessage('Interface stopped', 'success');
			} else {
				if ($output == "")
					$output = "Unknown reason";
				else
					$output = implode(" ", $output);
				$status->addMessage("Unable to stop interface<br>$output" , 'danger');
				$interface_up = true;
			}
		}

	} elseif( isset($_POST['turn_up']) ) {
		// We should only get here if the interface is down,
		// but just in case, check if it's already up.
		if (is_interface_up(get_interface_status("ifconfig $interface"))) {
			$status->addMessage('Interface was already up', 'warning');
			$interface_up = true;
		} else {
			exec( "sudo ifconfig $interface up 2>&1", $output );	// start
			// Check that it actually started
			$s = get_interface_status("ifconfig $interface");
			if (! is_interface_up($s)) {
				$status->addMessage('Unable to start interface', 'danger');
			} else {
				if (is_interface_running($s))
					$status->addMessage('Interface started', 'success');
				else
					$status->addMessage('Interface started but nothing connected to it', 'warning');
				$interface_up = true;
			}
		}

	} elseif (is_interface_up($input)) {
		// The interface can be up but nothing connected to it (i.e., not RUNNING).
		if (is_interface_running($input))
			$status->addMessage('Interface is up', 'success');
		else
			$status->addMessage('Interface is up but nothing connected to it', 'warning');
		$interface_up = true;

	} else {
		$status->addMessage('Interface is down', 'danger');
	}

	return($interface_up);
}

/**
*
* Get a variable from a file and return its value; if not there, return the default.
* NOTE: The variable's value is anything after the equal sign, so there shouldn't be a comment on the line.
* NOTE: There may be something before $searchfor, e.g., "export X=1", where "X" is $searchfor.
*/
function get_variable($file, $searchfor, $default)
{
	// get the file contents
	$contents = file_get_contents($file);
	if ("$contents" == "") return($default);	// file not found or not readable

	// escape special characters in the query
	$pattern = preg_quote($searchfor, '/');
	// finalise the regular expression, matching the whole line
	$pattern = "/^.*$pattern.*\$/m";

	// search, and store all matching occurences in $matches
	$num_matches = preg_match_all($pattern, $contents, $matches);
	if ($num_matches) {
		$double_quote = '"';

		// Format: [stuff]$searchfor=$value   or   [stuff]$searchfor="$value"
		// Need to delete  [stuff]$searchfor=  and optional double quotes
		// If more than 1 match, get the last match that matches $searchfor EXACTLY.
		if ($num_matches === 1) {
			$match = $matches[0][$num_matches - 1];	// get the last one
		} else {
			for ($i=$num_matches-1; $i>=0; $i--) {
				$match = $matches[0][$i];
				if ($match === $searchfor) {
					break;
				}
			}
		}
		$match = explode( '=', $match)[1];	// get everything after equal sign
		$match = str_replace($double_quote, "", $match);
		return($match);
	} else {
   		return($default);
	}
}

/**
* 
* List a type of file - either "All" (case sensitive) for all days, or only for the specified day.
*/
function ListFileType($dir, $imageFileName, $formalImageTypeName, $type) {	// if $dir is not null, it ends in "/"
	$num = 0;	// Let the user know when there are no images for the specified day
	// "/images" is an alias in the web server for ALLSKY_IMAGES
	$images_dir = "/images";
	$chosen_day = $_GET['day'];
	echo "<h2>$formalImageTypeName - $chosen_day</h2>\n";
	echo "<div class='row'>\n";
	if ($chosen_day === 'All'){
		if ($handle = opendir(ALLSKY_IMAGES)) {
		    while (false !== ($day = readdir($handle))) {
				if (is_valid_directory($day)) {
					$days[] = $day;
					$num += 1;
				}
		    }
		    closedir($handle);
		}

		if ($num == 0) {
			// This could indicate an error, or the user just installed allsky
			echo "<span class='alert-warning'>There are no image directories.</span>";
		} else {
			rsort($days);
			$num = 0;
			foreach ($days as $day) {
				$imageTypes = array();
				foreach (glob(ALLSKY_IMAGES . "/$day/$dir$imageFileName-$day.*") as $imageType) {
					$imageTypes[] = $imageType;
					$num += 1;
					echo "<br>&nbsp;"; // to separate images
					foreach ($imageTypes as $imageType) {
						$imageType_name = basename($imageType);
						$fullFilename = "$images_dir/$day/$dir$imageType_name";
						if ($type == "picture") {
							echo "<a href='$fullFilename'>";
							echo "<div style='float: left; width: 100%; margin-bottom: 2px;'>";
							echo "<label>$day</label>";
							echo "<img src='$fullFilename' style='margin-left: 10px; max-width: 50%; max-height:100px'/>";
							echo "</div></a>\n";
						} else {	// is video
							// xxxx TODO: Show a thumbnail since loading all the videos is bandwidth intensive.
							echo "<a href='$fullFilename'>";
							echo "<div style='float: left; width: 100%; margin-bottom: 2px;'>";
							echo "<label style='vertical-align: middle'>$day &nbsp; &nbsp;</label>";
							echo "<video width='85%' height='85%' controls style='vertical-align: middle'>";
							echo "<source src='$fullFilename' type='video/mp4'>";
							echo "Your browser does not support the video tag.";
							echo "</video>";
							echo "</div></a>\n";
						}
			  		}
				}
			}
			if ($num == 0) {
				echo "<span class='alert-warning'>There are no $formalImageTypeName.</span>";
			}
		}
	} else {
		foreach (glob(ALLSKY_IMAGES . "/$chosen_day/$dir$imageFileName-$chosen_day.*") as $imageType) {
			$imageTypes[] = $imageType;
			$num += 1;
		}
		if ($num == 0) {
			echo "<span class='alert-warning'>There are no $formalImageTypeName for this day.</span>";
		} else {
			foreach ($imageTypes as $imageType) {
				$imageType_name = basename($imageType);
				$fullFilename = "$images_dir/$chosen_day/$dir$imageType_name";
				if ($type == "picture") {
				    echo "<a href='$fullFilename'>
					<div style='float: left'>
					<img src='$fullFilename' style='max-width: 100%;max-height:400px'/>
					</div></a>\n";
				} else {	//video
				    echo "<a href='$fullFilename'>";
				    echo "<div style='float: left; width: 100%'>
					<video width='85%' height='85%' controls>
						<source src='$fullFilename' type='video/mp4'>
						Your browser does not support the video tag.
					</video>
					</div></a>\n";
				}
			}
		}
	}
        echo "</div>";
}

/* Run a command and display the appropriate status message */
function runCommand($cmd, $message, $messageColor)
{
	global $status;

	exec("$cmd 2>&1", $result, $return_val);
	if ($return_val !== 0) {
		// Display a failure message, plus the caller's message, if any.
		$msg = "'$cmd' failed";
		if ($result != null) $msg .= ": " . implode("<br>", $result);
		$status->addMessage($msg, "danger", true);
		return false;
	}

	// Display the caller's "on success" message, if any.
	if ($message !== "")
		$status->addMessage($message, $messageColor, true);

	// Display any output from the command.
	if ($result != null) $status->addMessage(implode("<br>", $result), "message", true);

	return true;
}

// Update a file.
// Files should be writable by the web server, but if they aren't, use a temporary file.
// Return any error message.
function updateFile($file, $contents, $fileName) {
	if (@file_put_contents($file, $contents) == false) {
		$e = error_get_last()['message'];
		$err = "Failed to save settings: $e";
		echo "<script>console.log('Unable to update $file 1st time: $e');</script>\n";

		// Assumed it failed due to lack of permissions,
		// usually because the file isn't grouped to the web server group.
		// Set the permissions and try again.

		// shell_exec() doesn't return anything unless there is an error.
		$err = str_replace("\n", "", shell_exec("x=\$(sudo chgrp " . WEBSERVER_GROUP . " '$file' 2>&1 && sudo chmod g+w '$file') || echo \${x}"));
		if ($err != "") {
			return "Unable to update settings: $err";
		}

		if (@file_put_contents($file, $contents) == false) {
			$e = error_get_last()['message'];
			$err = "Failed to save settings: $e";
			echo "<script>console.log('Unable to update file for 2nd time: $e');</script>\n";
			$x = str_replace("\n", "", shell_exec("ls -l '$file'"));
			echo "<script>console.log('ls -l returned: $x');</script>\n";

			// Save a temporary copy of the file in a place the webserver can write to,
			// then use sudo to "cp" the file to the final place.
			// Use "cp" instead of "mv" because the destination file may be a hard link
			// and we need to keep the link.
			$tempFile = "/tmp/$fileName-temp.txt";

			if (@file_put_contents($tempFile, $contents) == false) {
				$err = "Failed to create temporary file: " . error_get_last()['message'];
				return $err;
			}

			$err = str_replace("\n", "", shell_exec("x=\$(sudo cp '$tempFile' '$file' 2>&1) || echo 'Unable to copy [$tempFile] to [$file]': \${x}"));
			echo "<script>console.log('cp returned: [$err]');</script>\n";
			return $err;
		}
	}
	return "";
}

function getCameraType() {
	return get_variable(ALLSKY_CONFIG . '/config.sh', 'CAMERA_TYPE=', '');
}

// Return the settings file for the specified camera.
function getSettingsFile() {
	return ALLSKY_CONFIG . "/settings.json";
}

// Return the options file for the specified camera.
function getOptionsFile() {
	return ALLSKY_CONFIG . "/options.json";
}

// Check if the specified variable is in the specified array.
// If so, return it; if not, return default value;
// This is used to make the code easier to read.
function getVariableOrDefault($a, $v, $d) {
	if (isset($a[$v])) {
		$value = $a[$v];
		if (gettype($value) === "boolean" && $value == "") return 0;
		return $value;
	} else if (gettype($d) === "boolean" && $d == "") {
		return 0;;
	}

	return($d);
}

?>
