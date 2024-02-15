<?php

function DisplayEditor()
{
	global $useLocalWebsite, $useRemoteWebsite;
	global $hasLocalWebsite, $hasRemoteWebsite;
	$myStatus = new StatusMessages();

	$fullN = null;			// this is the file that's displayed by default
	$localN = basename(getLocalWebsiteConfigFile());
	$fullLocalN = "website/$localN";
	$remoteN = basename(getRemoteWebsiteConfigFile());
	$fullRemoteN = "config/$remoteN";

	// See what files there are to edit.
	$numFiles = 0;
	if ($hasLocalWebsite) {
		$fullN = $fullLocalN;
		$numFiles++;
		if (! $useLocalWebsite) {
			$msg = "<span class='WebUISetting'>Use Local Website</span> is not enabled.";
			$msg .= "<br>Your changes won't take effect until you enable that setting.</span>";
			$myStatus->addMessage($msg, 'warning');
		}
	} else {
		$localN = null;
	}

	if ($hasRemoteWebsite) {
		if ($fullN === null) $fullN = $fullRemoteN;
		$numFiles++;
		if (! $useRemoteWebsite) {
			$msg = "<span class='WebUISetting'>Use Remote Website</span> is not enabled.";
			$msg .= "<br>Your changes won't take effect until you enable that setting.</span>";
			$myStatus->addMessage($msg, 'warning');
		}
	} else {
		$remoteN = null;
	}

	if ($numFiles > 0) {
		if ($fullN === null) {
			if ($hasLocalWebsite)
				$fullN = $fullLocalN;
			else
				$fullN = $fullRemoteN;
		}
?>
		<script type="text/javascript">
		$(document).ready(function () {

			var editor = null;
			$.get("<?php echo $fullN; ?>", function (data) {

				// .json files return "data" as json array, and we need a regular string.
				// Get around this by stringify'ing "data".
				if (typeof data != 'string') {
					data = JSON.stringify(data, null, "\t");
				}

				editor = CodeMirror(document.querySelector("#editorContainer"), {
					value: data,
					mode: "json",
					theme: "monokai"
				});
			});

			$("#save_file").click(function () {
				editor.display.input.blur();
				var content = editor.doc.getValue(); //textarea text
				var path = $("#script_path").val(); //path of the file to save
				var isRemote = path.substr(0,8) === "{REMOTE}";
				if (isRemote)
					fileName = path.substr(8);
				else
					fileName = path;
				var response = confirm("Do you want to save your changes?");
				if(response)
				{
					$.ajax({
						type: "POST",
						url: "includes/save_file.php",
						data: {content:content, path:fileName, isRemote:isRemote},
						dataType: 'text',
						cache: false,
						success: function(data){
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
								for (var i=0; i < returnArray.length; i++) {
									var line = returnArray[i];
									returnStatus = line.substr(0,2);
									if (returnStatus === "S\t") {
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
							var messages = document.getElementById("editor-messages");
							if (messages === null) {
								ok = false;
								c = "danger";
								returnMsg = "No response from save_file.php";
							}
							var m = '<div class="alert alert-' + c + '">' + returnMsg + '</div>';
							messages.innerHTML += m;
						},
						error: function(XMLHttpRequest, textStatus, errorThrown) {
							alert("Unable to save '" + fileName + ": " + errorThrown);
						}
					});
				}
			});

			$("#script_path").change(function(e) {
				editor.getDoc().setValue("");	// Keeps new file from reading old one first.
				var fileName = e.currentTarget.value;
				if (fileName.substr(0,8) === "{REMOTE}")
					fileName = fileName.substr(8);
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
					editor.getDoc().setValue(data);
				}).fail(function(x) {
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
			<div class="panel panel-primary">
				<div class="panel-heading"><i class="fa fa-code fa-fw"></i> Editor</div>
				<div class="panel-body">
					<p id="editor-messages"><?php $myStatus->showMessages(); ?></p>
					<div id="editorContainer"></div>
					<div class="editorBottomSection">
				<?php
					if ($numFiles === 0) {
						echo "<div class='errorMsgBig'>No files to edit</div>";
					} else {
				?>
						<select class="form-control editorForm" id="script_path" title="Pick a file">
				<?php
							if ($localN !== null) {
								// The website is installed on this Pi.
								// The physical path is ALLSKY_WEBSITE; virtual path is "website".
								echo "<option value='$fullLocalN'>";
								echo "$localN (local Allsky Website)";
								echo "</option>";
							}

							if ($remoteN !== null) {
								// A copy of the remote website's config file is on the Pi.
								echo "<option value='{REMOTE}$fullRemoteN'>";
								echo "$remoteN (remote Allsky Website)";
								echo "</option>";
							}
				?>
						</select>
						<button type="submit" class="btn btn-primary editorSaveChanges" id="save_file"/>
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
