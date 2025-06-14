<?php

// These values are updated during installation.
define('HOME',    '/home/pi');
define('ALLSKY_HOME',    '/home/pi/allsky');
define('ALLSKY_CONFIG',  '/home/pi/allsky/config');
define('ALLSKY_SCRIPTS', '/home/pi/allsky/scripts');
define('ALLSKY_UTILITIES', '/home/pi/allsky/scripts/utilities');
define('ALLSKY_TMP', '/home/pi/allsky/tmp');
define('ALLSKY_IMAGES',  '/home/pi/allsky/images');
define('ALLSKY_MESSAGES',  '/home/pi/allsky/config/messages.txt');
define('ALLSKY_CHECK_LOG',  '/home/pi/allsky/config/logs/checkAllsky.html');
define('PRIOR_ALLSKY_DIR',  '/home/pi/allsky-OLD');
define('ALLSKY_OLD_REMINDER',  '/home/pi/allsky/config/logs/allsky-OLD_reminder.txt');
define('ALLSKY_POST_INSTALL_ACTIONS',  '/home/pi/allsky/config/logs/post-installation_actions.txt');
define('ALLSKY_ABORTS_DIR',  '/home/pi/allsky/tmp/aborts');
define('ALLSKY_WEBUI',  '/home/pi/allsky/html');
define('ALLSKY_WEBSITE',  '/home/pi/allsky/html/allsky');
define('ALLSKY_WEBSITE_LOCAL_CONFIG_NAME',  'configuration.json');
define('ALLSKY_WEBSITE_REMOTE_CONFIG_NAME',  'remote_configuration.json');
define('ALLSKY_WEBSITE_LOCAL_CONFIG',  '/home/pi/allsky/html/allsky/configuration.json');
define('ALLSKY_WEBSITE_REMOTE_CONFIG',  '/home/pi/allsky/config/remote_configuration.json');
define('ALLSKY_OVERLAY',  '/home/pi/allsky/config/overlay');
define('ALLSKY_ENV',  '/home/pi/allsky/env.json');
define('MY_OVERLAY_TEMPLATES',  '/home/pi/allsky/config/overlay/myTemplates');
define('ALLSKY_MODULES',  '/home/pi/allsky/config/modules');
define('ALLSKY_MODULE_LOCATION',  '/opt/allsky');
define('ALLSKY_OWNER', 'pi');
define('ALLSKY_GROUP', 'pi');
define('WEBSERVER_OWNER', 'www-data');
define('WEBSERVER_GROUP', 'www-data');
define('ALLSKY_REPO',  '/home/pi/allsky/config_repo');
define('ALLSKY_VERSION',  'v2025.xx.xx');
define('ALLSKY_STATUS',   '/home/pi/allsky/config/status.json');
define('ALLSKY_STATUS_NEEDS_REVIEW',   'Allsky settings need to be reviewed');
define('ALLSKY_STATUS_NEEDS_CONFIGURATION',   'Allsky settings need configuring');
define('RASPI_CONFIG',   '/home/pi/allsky/config');
define('RASPI_ADMIN_DETAILS', '/home/pi/allsky/config/raspap.auth');
define('CONFIG_UPDATE_STRING', 'XX_NEED_TO_UPDATE_XX');
define('ALLSKY_MYFILES_DIR', '/home/pi/allsky/config/myFiles');

// Split the placeholder so it doesn't get replaced.
if (ALLSKY_HOME == "XX_ALLSKY_HOME" . "_XX") {
	// This file hasn't been updated yet after installation.
	// This would only happen if they updated this file and not the whole Allsky release,
	// which is hard since we only come out with releases.
	echo "<div class='errorMsgBig errorMsgBox'>";
	echo "Please run the following from the 'allsky' directory before using the WebUI:";
	echo "<br><br>";
	echo "<code>   ./install.sh --fix</code>";
	echo "</div>";
	exit(1);
}
?>
