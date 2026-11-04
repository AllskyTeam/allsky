<?php

// The "Privacy" page: what, if anything, the user shares with the Allsky Team
// and the Allsky Map, what is sent, and a button to delete it from the server.
// index.php shows this page before any other page until the user answered
// the current version (ALLSKY_PRIVACY_VERSION) of the questions.
// The same settings are in the "Privacy & Sharing" tab of the "Allsky Settings" page.

// Run a script as the Allsky user, the same way the "Allsky Settings" page runs makeChanges.sh.
function privacyCommand($script, $args)
{
	return "sudo --user=" . ALLSKY_OWNER . " " . ALLSKY_SCRIPTS . "/$script $args";
}

// Save the choices the user made on this page.
// Returns true if they were saved.
function savePrivacyChoices()
{
	global $settings_array, $status;

	$mapSharing = getVariableOrDefault($_POST, 'mapsharing', "");
	$shareUsage = getVariableOrDefault($_POST, 'shareusagedata', "");
	$email = trim(getVariableOrDefault($_POST, 'contactemail', ""));
	$hide = (getVariableOrDefault($_POST, 'hideexactlocation', "") === "on");

	$ok = true;
	if (! in_array($mapSharing, ["none", "team", "map"], true)) {
		$status->addMessage("Please choose what to do with your <b>Allsky Map</b> data.", 'danger');
		$ok = false;
	}
	if ($shareUsage !== "true" && $shareUsage !== "false") {
		$status->addMessage("Please choose whether to share <b>Usage Data</b>.", 'danger');
		$ok = false;
	}
	if ($email !== "" && filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
		$e = htmlspecialchars($email);
		$status->addMessage("'$e' is not a valid <b>Contact Email</b>.", 'danger');
		$ok = false;
	}
	if (! $ok) return false;

	// name => [label, new value, type]
	$new = [
		"mapsharing" => ["Map Sharing", $mapSharing, "text"],
		"hideexactlocation" => ["Hide Exact Location", $hide, "boolean"],
		"shareusagedata" => ["Share Usage Data", $shareUsage === "true", "boolean"],
		"contactemail" => ["Contact Email", $email, "text"],
	];

	// Changes for makeChanges.sh: name, label, old value, new value.
	$changes = "";
	foreach ($new as $name => [$label, $value, $type]) {
		$old = getVariableOrDefault($settings_array, $name, ($type === "boolean") ? false : "");
		if ($type === "boolean") {
			$old = toBool($old);
			$s_old = $old ? "true" : "false";
			$s_new = $value ? "true" : "false";
		} else {
			$s_old = (string) $old;
			$s_new = $value;
		}
		$settings_array[$name] = $value;
		if ($s_old !== $s_new) {
			$changes .= " " . escapeshellarg($name) . " " . escapeshellarg($label);
			$changes .= " " . escapeshellarg($s_old) . " " . escapeshellarg($s_new);
		}
	}
	$settings_array['privacyversion'] = ALLSKY_PRIVACY_VERSION;

	$mode = JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION;
	$msg = updateFile(getSettingsFile(), json_encode($settings_array, $mode), "settings", true);
	if ($msg !== "") {
		$status->addMessage("Unable to save your choices: $msg", 'danger');
		return false;
	}

	// makeChanges.sh makes the same changes in every camera's settings file,
	// remembers when the user agreed, and sends or deletes the data.
	if ($changes !== "") {
		$cmd = privacyCommand("makeChanges.sh", "--from WebUI $changes");
		runCommand($cmd, "", "success", false);
	}
	$settings_array = readSettingsFile();
	return true;
}

function DisplayPrivacy()
{
	global $settings_array, $status, $ME;
	global $pageHeaderTitle, $pageIcon, $pageHelp;

	$returnPage = getVariableOrDefault($_REQUEST, 'return_page', "");
	if (! preg_match('/^[a-z_A-Z]*$/', $returnPage) || $returnPage === "privacy") {
		$returnPage = "";
	}
	$saved = false;

	if (isset($_POST['save_privacy']) || isset($_POST['delete_data'])) {
		if (! CSRFValidate()) {
			$status->addMessage('Unable to save - session timeout.', 'danger');
		} else if (isset($_POST['save_privacy'])) {
			$saved = savePrivacyChoices();
			if ($saved) {
				$status->addMessage("Your choices were saved.", 'success');
			}
		} else {
			$cmd = privacyCommand("postToMap.sh", "--delete-all --from WebUI");
			if (runCommand($cmd, "", "success", false)) {
				$status->addMessage("Your data were deleted from the Allsky server.", 'success');
			}
			$settings_array = readSettingsFile();
		}
	}

	$asking = (! $saved &&
		intval(getVariableOrDefault($settings_array, 'privacyversion', 0)) < ALLSKY_PRIVACY_VERSION);
	$mapSharing = getVariableOrDefault($settings_array, 'mapsharing', "none");
	$hide = toBool(getVariableOrDefault($settings_array, 'hideexactlocation', false));
	$shareUsage = toBool(getVariableOrDefault($settings_array, 'shareusagedata', false));
	$email = getVariableOrDefault($settings_array, 'contactemail', "");
	$sharing = ($mapSharing !== "none" || $shareUsage || $email !== "");
	$docs = "/docs/allsky_guide/settings/privacy.html";

	// On the first visit nothing is pre-selected, so "yes" isn't the easier answer.
	$checked = function($current, $value) use ($asking) {
		return (! $asking && $current === $value) ? "checked" : "";
	};
?>
<div class="panel panel-allsky allow-select">
	<div class="panel-heading clearfix">
		<span><i class="<?php echo $pageIcon ?>"></i> <?php echo $pageHeaderTitle ?></span>
		<?php if (!empty($pageHelp)) { doHelpLink(htmlspecialchars($pageHelp, ENT_QUOTES)); } ?>
	</div>
	<div class="panel-body">
		<div id="messages"><?php $status->showMessages(); ?></div>
<?php if ($saved && $returnPage !== "") { ?>
		<p><a class="btn btn-primary" href="index.php?page=<?php echo $returnPage ?>">Continue</a></p>
<?php } ?>
<?php if ($asking) { ?>
		<p><b>Before you continue, please tell us what, if anything, you want to share.</b></p>
<?php } ?>
		<p>Nothing is sent unless you choose it, and you can change your choices at any time on this page
		or in the <b>Privacy &amp; Sharing</b> tab of the <a href="index.php?page=configuration">Allsky Settings</a> page.
		The data go to the Allsky Team, the core developers of Allsky.
		<a external="true" href="<?php echo $docs ?>">Privacy &amp; Sharing</a> describes exactly what is sent and why.</p>

		<form method="POST" action="<?php echo "$ME?page=privacy" ?>">
			<?php CSRFToken(); ?>
			<input type="hidden" name="return_page" value="<?php echo $returnPage ?>">

			<h4>Allsky Map</h4>
			<p>The <a href="https://www.thomasjacquin.com/allsky-map/" target="_blank" rel="noopener">Allsky Map</a>
			shows cameras that run Allsky.
			Your camera's location, the camera and computer models, and the information in the
			<b>Privacy &amp; Sharing</b> tab of the Allsky Settings page are sent.
			Sending your Map data, even without showing it, helps the Allsky Team decide where to spend development time.</p>
			<div class="radio"><label><input type="radio" name="mapsharing" value="none" <?php echo $checked($mapSharing, "none") ?>>
				Don't send</label></div>
			<div class="radio"><label><input type="radio" name="mapsharing" value="team" <?php echo $checked($mapSharing, "team") ?>>
				Send to the Allsky Team only - your camera doesn't appear on the map</label></div>
			<div class="radio"><label><input type="radio" name="mapsharing" value="map" <?php echo $checked($mapSharing, "map") ?>>
				Send and show on the Map</label></div>
			<div class="checkbox"><label><input type="checkbox" name="hideexactlocation" <?php echo $hide ? "checked" : "" ?>>
				Hide my exact location: send the latitude and longitude rounded to the nearest 0.02 degrees
				(at most about 1.3 km or 0.8 miles off)</label></div>

			<h4>Usage Data</h4>
			<p>The Pi OS, the Pi model, the camera, how many cameras are connected, the enabled modules,
			and how often Allsky was started, the camera was changed, and the WebUI was used.
			No location, no images, and no settings.
			It helps the Allsky Team know what to test and improve.</p>
			<div class="radio"><label><input type="radio" name="shareusagedata" value="true" <?php echo $checked($shareUsage, true) ?>>
				Share Usage Data</label></div>
			<div class="radio"><label><input type="radio" name="shareusagedata" value="false" <?php echo $checked($shareUsage, false) ?>>
				Don't share Usage Data</label></div>

			<h4>Contact Email</h4>
			<p>Optional.  The Allsky Team only uses it to contact you, for example about a problem with
			the data your Pi sends or a security issue in Allsky.  It isn't shown or shared.</p>
			<input type="email" class="form-control" style="max-width: 30em;" name="contactemail"
				value="<?php echo htmlspecialchars($email) ?>" placeholder="Leave empty to not share an email address">

			<p style="margin-top: 1.5em;">
				<button type="submit" class="btn btn-primary" name="save_privacy">Save my choices</button>
			</p>
		</form>

<?php if (! $asking) { ?>
		<h4>What your Pi sends</h4>
<?php
		if ($sharing) {
			$result = null;
			exec(privacyCommand("postToMap.sh", "--show") . " 2>&1", $result, $return_val);
			$output = htmlspecialchars(implode("\n", $result ?? []));
			echo "<details><summary>Show the data sent at the end of night</summary>";
			echo "<pre class='allow-select'>$output</pre></details>";
		} else {
			echo "<p>Nothing.</p>";
		}
?>

		<h4>Delete my data</h4>
		<p>Choosing <b>Don't send</b> for the Allsky Map stops sending the Map data and removes your camera
		from the map.  Not sharing Usage Data or clearing the email address deletes them from the server.
		This button deletes everything the Allsky server has from this Pi, including the Map data,
		and turns all the choices above off.</p>
		<form method="POST" action="<?php echo "$ME?page=privacy" ?>"
			onsubmit="return confirm('Delete all data of this Pi from the Allsky server?');">
			<?php CSRFToken(); ?>
			<button type="submit" class="btn btn-danger" name="delete_data">Delete my data from the Allsky server</button>
		</form>
<?php } ?>
	</div>
</div>
<?php
}
?>
