<?php

if (basename(__FILE__) === basename($_SERVER['SCRIPT_FILENAME'])) {
    include_once('functions.php');
    redirect("/index.php");
}

function DisplayEditor()
{
	global $useLocalWebsite, $useRemoteWebsite;
	global $hasLocalWebsite, $hasRemoteWebsite;
	global $pageHeaderTitle, $pageIcon, $pageHelp;

	$myStatus = new StatusMessages();
	$mode = JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES|JSON_NUMERIC_CHECK|JSON_PRESERVE_ZERO_FRACTION;

	$content = "";			// content of the default file to display on error
	$onFile = null;			// the is the file that's displayed by default

	// Don't allow users to edit - they should use the Allsky Settings page.
	$useEnv = false;			// Allow editing of the ALLSKY_ENV file?

	$localN = basename(getLocalWebsiteConfigFile());
	$localN_withComment = "$localN (local Allsky Website)";
	$fullLocalN = "website/$localN";
	$localOK = "true";

	$remoteN = basename(getRemoteWebsiteConfigFile());
	$remoteN_withComment = "$remoteN (remote Allsky Website)";
	$fullRemoteN = "config/$remoteN";
	$remoteOK = "true";

	if ($useEnv) {
		$envN = basename(ALLSKY_ENV);
		$envN_withComment = $envN;		// not needed, but use for consistency with other files.
		$fullEnvN = "current/$envN";
	} else {
		$fullEnvN = "";
	}
	$envOK = "true";

	$logN = "monitorable_logs.json";
	$monitoredLogs = ALLSKY_MYFILES_DIR . "/" . $logN;
	$logN_withComment = $logN;
	$fullLogN = "config/" . ALLSKY_MYFILES_NAME . "/$logN";
	$logOK = "true";

	// See what files there are to edit.
	$numFiles = 0;

	if ($hasLocalWebsite) {
	   	$numFiles++;

	   	if (! $useLocalWebsite) {
		   	$msg =  "The <span class='WebUISetting'>Use Local Website</span> setting is not enabled.";
		   	$msg .= "<br>Your changes won't take effect until you enable it.</span>";
		   	$myStatus->addMessage($msg, 'warning');
	   	}

		# Check for corruption in the file.
		$returnedMsg = "";
		$localContent = get_decoded_json_file(getLocalWebsiteConfigFile(), true, "", $returnedMsg);
		if ($localContent === null) {
			$localContent = file_get_contents(getLocalWebsiteConfigFile());
			$localOK = "false";
		} else {
			$localContent = json_encode($localContent, $mode);
		}
		$content = $localContent;
		$onFile = "local";
	} else {
		$msg =  "<div class='dropdown'><code>$localN_withComment</code>";
		$msg .= " will appear in the list below if you enable";
		$msg .= " <span class='WebUISetting'>Use Local Website</span>.</div>";
		$myStatus->addMessage($msg, 'info');
		$localN = null;
	}

	if ($hasRemoteWebsite) {
		$numFiles++;

	   	if (! $useRemoteWebsite) {
		   	$msg = "The <span class='WebUISetting'>Use Remote Website</span> setting is not enabled.";
		   	$msg .= " Your changes won't take effect until you enable it.</span>";
		   	$myStatus->addMessage($msg, 'warning');
	   	}

		$returnedMsg = "";
		$remoteContent = get_decoded_json_file(getRemoteWebsiteConfigFile(), true, "", $returnedMsg);
		if ($remoteContent === null) {
			$remoteOK = "false";
			$remoteContent = file_get_contents(getRemoteWebsiteConfigFile());
		} else {
			$remoteContent = json_encode($remoteContent, $mode);
		}

		if ($onFile === null) {
			$onFile = "remote";
			$content = $remoteContent;
		}
	} else {
		$remoteN = null;
	}

	if ($useEnv) {
		if (! file_exists(ALLSKY_ENV)) {
			$msg =  "<div class='dropdown'><code>$envN_withComment</code>";
			$msg .= " will appear in the list below when you save";
			$msg .= " any private data in the WebUI.";
			$myStatus->addMessage($msg, 'info');
			$envN = null;

		} else {
			$numFiles++;
			$returnedMsg = "";
			$envContent = get_decoded_json_file(ALLSKY_ENV, true, "", $returnedMsg);
			if ($envContent === null) {
				$envOK = "false";
				$envContent = file_get_contents(ALLSKY_ENV);
			} else {
				$envContent = json_encode($envContent, $mode);
			}

			if ($onFile === null) {
				$onFile = "env";
				$content = $envContent;
			}
		}
	} else {
		$envN = null;
	}

	if (file_exists($monitoredLogs)) {
					$ok = true;
					if (filesize($monitoredLogs) === 0) {
									# Add placeholder text because code below complains if the file is empty.
									$f = fopen($monitoredLogs, 'w');
									if (! $f || ! fwrite($f, "{\n}\n")) {
													$ok = false;
									} else {
													fclose($f);
									}
					}
					if ($ok === true) {
									$numFiles++;
									$returnedMsg = "";
									$logContent = get_decoded_json_file($monitoredLogs, true, "", $returnedMsg);
									if ($logContent === null) {
													$logOK = "false";
													$logContent = file_get_contents($monitoredLogs);
									} else {
													$logContent = json_encode($logContent, $mode);
									}

									if ($onFile === null) {
													$onFile = "log";
													$content = $logContent;
									}
					} else {
									$logN = null;
					}
	} else {
					$logN = null;
	}	

	if ($numFiles > 0) {
		if ($onFile === null) {
			if ($hasLocalWebsite) {
				$onFile = "local";
				$content = $localContent;
			} else if ($hasLocalWebsite) {
				$onFile = "remote";
				$content = $remoteContent;
			} else if ($useEnv) {
				$onFile = "env";
				$content = $envContent;
			}
		}
		?>
		<script type="text/javascript">
			window.allskyEditorConfig = <?php
				echo json_encode(
					[
						'localOK' => $localOK === "true",
						'remoteOK' => $remoteOK === "true",
						'envOK' => $envOK === "true",
						'logOK' => $logOK === "true",
						'fullEnvName' => $fullEnvN,
						'needToUpdate' => ALLSKY_NEED_TO_UPDATE,
						'initialContent' => $content
					],
					JSON_HEX_TAG|JSON_HEX_APOS|JSON_HEX_QUOT|JSON_HEX_AMP|JSON_UNESCAPED_SLASHES
				);
			?>;
		</script>
	<?php } ?>

	<div class="row">
		<div class="col-lg-12">
			<div class="panel panel-allsky">
				<div class="panel-heading clearfix">
                    <span><i class="<?php echo $pageIcon ?>"></i> <?php echo $pageHeaderTitle ?></span>
					<?php if (!empty($pageHelp)) { doHelpLink($pageHelp); } ?>
                </div>
				<div class="panel-body">
					<p id="editor-messages"><?php $myStatus->showMessages(); ?></p>
					<p id="need-to-update"></p> <p id="file-corruption"></p>
					<div id="editorContainer"></div>
					<div class="editorBottomSection">
						<?php
						if ($numFiles === 0) {
							?>
								<div id="as-editor-overlay" class="as-overlay big">
									<div class="center-full">
										<div class="center-paragraph">
											<h1>There are no files to edit</h1>
											<p>No configuration files could be found to edit.</p>
										</div>
									</div>
								</div> 
							<?php

						} else {
							?>
							<select class="form-control editorForm" id="script_path" title="Pick a file">
								<?php
								if ($localN !== null) {
									// The website is installed on this Pi.
									// The physical path is ALLSKY_WEBSITE; virtual path is "website".
									echo "<option value='$fullLocalN'>";
									echo $localN_withComment;
									echo "</option>\n";
								}

								if ($remoteN !== null) {
									// A copy of the remote website's config file is on the Pi.
									echo "<option value='{REMOTE}$fullRemoteN'>";
									echo $remoteN_withComment;
									echo "</option>\n";
								}

								if ($envN !== null) {
									echo "<option value='$fullEnvN'>";
									echo "$envN_withComment";
									echo "</option>\n";
								}

								if ($logN !== null) {
									echo "<option value='$fullLogN'>";
									echo "$logN_withComment";
									echo "</option>\n";
								}
								?>
							</select>
							<button type="submit" class="btn btn-primary editorSaveChanges" id="save_file">
								<i class="fa fa-save"></i> Save Changes</button>
							<?php
						}
						?>
					</div>
				</div>
			</div>
		</div>
	</div>
	<?php
}
?>
