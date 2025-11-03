<?php

if (basename(__FILE__) === basename($_SERVER['SCRIPT_FILENAME'])) {
    include_once('functions.php');
    redirect("/index.php");
}

function DisplayEditor()
{
	global $useLocalWebsite, $useRemoteWebsite;
	global $hasLocalWebsite, $hasRemoteWebsite;
	global $pageHeaderTitle, $pageIcon;

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
		   	$msg .= "<br>Your changes won't take effect until you enable it.</span>";
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
			<?php
				echo "let localOK = $localOK;";
				echo "let remoteOK = $remoteOK;";
				echo "let envOK = $envOK;";
			?>
			let ALLSKY_NEED_TO_UPDATE = "<?php echo ALLSKY_NEED_TO_UPDATE ?>"
			$(document).ready(function () {
				let clearTimer = null;
				let currentMarks = [];
				var editor = null;

				function getFileType() {
// TODO: There's a probably a better way to determine which file this is.
					var path = $("#script_path").val();
					if (path.substr(0, 8) === "{REMOTE}")
						return("remote");
					if (path == "<?php echo $fullEnvN ?>")
						return("env");
					return("local");
				}

				let corruptionMsg = "";
				corruptionMsg += "Scroll down in the window below until you see a";
				corruptionMsg += " <div class='CodeMirror-lint-marker CodeMirror-lint-marker-error'></div>";
				corruptionMsg += " on the left side of the window.";
				function checkCorruption() {
					var ok = true;
					var fileType = getFileType();
					if (fileType == "remote") {
						ok = remoteOK;
					} else if (fileType == "local") {
						ok = localOK;
					} else if (fileType == "env") {
						ok = envOK;
					} else {
						ok = false;
					}

					if (ok) {
						document.getElementById("file-corruption").innerHTML = '';
					} else {
						let m = "This file appears corrupted.<br>";
						m += corruptionMsg;
						let msg = '<div class="alert alert-danger" style="font-size: 125%">' + m + '</div>';
						document.getElementById("file-corruption").innerHTML = msg;
					}
				}

				function highlightText(searchTerm) {
					currentMarks.forEach(mark => mark.clear());
					currentMarks = [];

					if (!searchTerm) return;

					let num = 0;
					const cursor = editor.getSearchCursor(searchTerm, null, { caseFold: true });
					while (cursor.findNext()) {
						const mark = editor.markText(cursor.from(), cursor.to(), {
							className: "highlight",
						});
						num++;
						currentMarks.push(mark);
					}
					if (num == 0) {
						document.getElementById("need-to-update").innerHTML = '';
					} else {
						let m = "NOTE: You must update all <span class='cm-string highlight'>" + ALLSKY_NEED_TO_UPDATE + "</span>";
						m += " values below before the Website will work.";
						let msg = '<div class="alert alert-warning" style="font-size: 125%">' + m + '</div>';
						document.getElementById("need-to-update").innerHTML = msg;
					}
				}

				function validateJSON(jsonString) {
					try {
						JSON.parse(jsonString);
						return { valid: true, error: null };
					} catch (e) {
						const match = e.message.match(/at position (\d+)/);
						const position = match ? parseInt(match[1], 10) : null;
						return { valid: false, error: e.message, position: position };
					}
				}

				function startTimer(secs) {
					clearTimer = setInterval(() => {
						clearInterval(clearTimer);
						clearTimer = null;
						document.getElementById("editor-messages").innerHTML = '';
					}, secs);
				}

				function doEditor(data) {
					editor = CodeMirror(document.querySelector("#editorContainer"), {
						value: data,
						theme: "monokai",
						lineNumbers: true,
						mode: "application/json",
						gutters: ["CodeMirror-lint-markers"],
						lint: true
					});
				}

				// Display the initial window.
				let c = '<?php echo urlencode($content); ?>';
				// .json files return "data" as json array, and we need a regular string.
				// Get around this by stringify'ing "data".
				if (typeof c != 'string') {
					c = JSON.stringify(c, null, "\t");
				}
				c = decodeURIComponent(c.replaceAll("+", " "));
				doEditor(c);
				editor.on("change", (instance, changeObj) => {
// TODO: This is executed TWICE each time a file changes.  Why?
					highlightText(ALLSKY_NEED_TO_UPDATE);
					checkCorruption();
				});
				highlightText(ALLSKY_NEED_TO_UPDATE);
				checkCorruption();

				$("#save_file").click(function () {
					if (clearTimer !== null) {
						clearInterval(clearTimer);
						clearTimer = null;
					}
					var content = editor.doc.getValue(); //textarea text
					let jsonStatus = validateJSON(content);
					if (jsonStatus.valid) {
						var isRemote = false;
						var path = $("#script_path").val();
						var fileType = getFileType();
						if (fileType == "remote") {
							fileName = path.substr(8);	// Skip "{REMOTE}"
							remoteOK = true;
							isRemote = true;
						} else if (fileType == "local") {
							localOK = true;
							fileName = path;
						} else if (fileType == "env") {
							envOK = true;
							fileName = path;
						}

						$(".panel-body").LoadingOverlay('show', {
							background: "rgba(0, 0, 0, 0.5)"
						});
						$.ajax({
							type: "POST",
							url: "includes/save_file.php",
							data: { content: content, path: fileName, isRemote: isRemote },
							dataType: 'text',
							cache: false,
							success: function (data) {
								// "data" is a string with a return code (ERROR or SUCCESS),
								// then a tab, then a message.
								var returnMsg = "";
								var ok = true;
								var c = "success";		// CSS class
								if (data == "") {
									returnMsg = "No response from save_file.php";
									c = "danger";
									ok = false;
								} else {
									returnArray = data.split("\n");

									// Check every line in the output.
									// output any lines not beginnning with "S " or "E ",
									// they are probably debug lines.
									for (var i = 0; i < returnArray.length; i++) {
										var line = returnArray[i];
										returnStatus = line.substr(0, 2);
										if (returnStatus === "S\t") {		// Success
											returnMsg += line.substr(2);
										} else if (returnStatus === "W\t") {
											c = "warning";
											returnMsg += line.substr(2);
										} else if (returnStatus === "E\t") {
											ok = false;
											c = "danger";
											returnMsg += line.substr(2);
										} else {
											// Assume it's a debug statement.  Display whole line.
											c = "info";
											console.log(line);
										}
									}
								}
								if (ok) {
									checkCorruption();
								}

								var messages = document.getElementById("editor-messages");
								if (messages === null) {
									ok = false;
									c = "danger";
									returnMsg = "No response from save_file.php";
								}
								var m = '<div class="alert alert-' + c + '">' + returnMsg + '</div>';
								messages.innerHTML = m;
								$(".panel-body").LoadingOverlay('hide');
								if (c !== "danger") {
									startTimer(10000);
								}
							},
							error: function (XMLHttpRequest, textStatus, errorThrown) {
								$(".panel-body").LoadingOverlay('hide');
								alert("Unable to save '" + fileName + ": " + errorThrown);
								startTimer(15000);
							}
						});
					} else {
						let message = "<span class='errorMsgBig'>Error:</span>";
						message += "<br><h3>Unable to save as the file is invalid.</h3>";
						message += "<br><h4>" + jsonStatus.error + "</h4>";
						bootbox.alert({
							message: message,
							buttons: {
								ok: {
									label: 'OK',
									className: 'btn-danger'
								}
							}
						});
					}
				});

				$("#script_path").change(function (e) {
					var fileName = e.currentTarget.value;
					if (fileName.substr(0, 8) === "{REMOTE}")
						fileName = fileName.substr(8);

					try {
						// Keeps new file from reading old one first.
						editor.getDoc().setValue("");
					} catch (ee) {
						console.log("Got error reading " + fileName);
						return;
					}

					var ext = fileName.substring(fileName.lastIndexOf(".") + 1);
					if (ext == "js") {
						editor.setOption("mode", "javascript");
					} else if (ext == "json") {
						editor.setOption("mode", "json");
					} else {
						editor.setOption("mode", "shell");
					}
					// It would be easy to support other files types.
					// Would need "type.js" file to do the formatting.
					$.get(fileName + "?_ts=" + new Date().getTime(), function (data) {
						data = JSON.stringify(data, null, "\t");
						editor.getDoc().setValue(data);
						highlightText(ALLSKY_NEED_TO_UPDATE);
					}).fail(function (x) {
						if (x.status == 200) {	// json files can fail but actually work
							editor.getDoc().setValue(x.responseText);
						} else {
							alert('Requested file [' + fileName + '] not found or an unsupported language.');
						}
					})
				});
			});

		</script>
	<?php } ?>

	<div class="row">
		<div class="col-lg-12">
			<div class="panel panel-allsky">
				<div class="panel-heading"><i class="<?php echo $pageIcon ?>"></i> <?php echo $pageHeaderTitle ?></div>
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
