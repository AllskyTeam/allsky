<?php

function DisplayEditor()
{
	$status = new StatusMessages();
	$showFullList = false;	// show the full list of what's in ALLSKY_SCRIPTS, or just user-editable files?
	$config_dir = basename(ALLSKY_CONFIG);
?>

	<script type="text/javascript">

		$(document).ready(function () {
			var editor = null;
			$.get("current/<?php echo $config_dir ?>/config.sh?_ts=" + new Date().getTime(), function (data) {
				editor = CodeMirror(document.querySelector("#editorContainer"), {
					value: data,
					mode: "shell",
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
							if (data == "") {
								returnMsg = "No response from save_file.php";
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
										ok = true;
										returnMsg += line.substr(2);
									} else if (returnStatus === "E\t") {
										ok = false;
										returnMsg += line.substr(2);
									} else {
										// Assume it's a debug statement.
										console.log(line);
									}
								}
							}
							var c = ok ? "success" : "danger";
							var messages = document.getElementById("editor-messages");
							if (messages === null) {
								ok = false;
								returnMsg = "No response from save_file.php";
							}
							var m = '<div class="alert alert-' + c + '">' + returnMsg;
							m += '<button type="button" class="close" data-dismiss="alert" aria-hidden="true">x</button>';
							m += '</div>';
							messages.innerHTML += m;
						},
						error: function(XMLHttpRequest, textStatus, errorThrown) {
							alert("Unable to save '" + fileName + ": " + errorThrown);
						}
					});
				}
				else{
					//alert("File not saved!");
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
				// It would be easy to support other files types.  Would need "type.js" file to do the formatting.
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

	<div class="row">
		<div class="col-lg-12">
			<div class="panel panel-primary">
				<div class="panel-heading"><i class="fa fa-code fa-fw"></i> Editor</div>
				<!-- /.panel-heading -->
				<div class="panel-body">
					<p id="editor-messages"><?php $status->showMessages(); ?></p>
					<div id="editorContainer"></div>
					<div style="margin-top: 15px;">
				 <?php
						$scripts = null;
						if(isset($showFullList) && $showFullList == "true") {
							$scripts = array_filter(array_diff(scandir(ALLSKY_SCRIPTS), array('.', '..')), function($item) {
								// Anything OTHER than a directory is valid.
								return !is_dir(ALLSKY_SCRIPTS . "/" . $item);
							});
						} else if (file_exists(ALLSKY_SCRIPTS . "/endOfNight_additionalSteps.sh")) {
							$scripts[0] = "endOfNight_additionalSteps.sh";
						}
				?>
						<select class="form-control" id="script_path" title="Pick a file"
							style="display: inline-block; width: auto; margin-right: 15px; margin-bottom: 5px"
						>
							<option value="current/<?php echo $config_dir ?>/config.sh">config.sh</option>
							<option value="current/<?php echo $config_dir ?>/ftp-settings.sh">ftp-settings.sh</option>

				<?php
							if ($scripts != null) {
								foreach ($scripts as $script) {
									echo "<option value='current/" . basename(ALLSKY_SCRIPTS) . "/$script'>$script</option>";
								}
							}
							if (file_exists(ALLSKY_WEBSITE_LOCAL_CONFIG)) {
								// The website is installed on this Pi.
								// The physical path is ALLSKY_WEBSITE; virtual path is "website".
								$N = ALLSKY_WEBSITE_LOCAL_CONFIG_NAME;
								echo "<option value='website/$N'>$N (local Allsky Website)</option>";
							}

							if (file_exists(ALLSKY_WEBSITE_REMOTE_CONFIG)) {
								// The website is remote, but a copy of the config file is on the Pi.
								$N = ALLSKY_WEBSITE_REMOTE_CONFIG_NAME;
								echo "<option value='{REMOTE}current/$config_dir/$N'>$N (remote Allsky Website)</option>";
							}
			   ?>
						</select>
						<button type="submit" class="btn btn-success" style="margin-bottom:5px" id="save_file"/>
							<i class="fa fa-save"></i> Save Changes</button>
					</div>
				</div>
			</div>
		</div>
	</div>

<?php
}
?>
