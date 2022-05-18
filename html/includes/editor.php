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
				var response = confirm("Do you want to save your changes?");
				if(response)
				{
					$.ajax({
						type: "POST",
						url: "includes/save_file.php",
						data: {content:content, path:path},
						dataType: 'text',
						cache: false,
						success: function(data){
							if (data != "")
								alert(data);
							// else alert("File saved!");
						},
						error: function(XMLHttpRequest, textStatus, errorThrown) {
							alert("Unable to save '" + path + ": " + errorThrown);
						}
					});
				}
				else{
					//alert("File not saved!");
				}
			});

			$("#script_path").change(function(e) {
				editor.getDoc().setValue("");	// Keeps new file from reading old one first.
				var ext = e.currentTarget.value.substring(e.currentTarget.value.lastIndexOf(".") + 1);
				if (ext == "js") {
					editor.setOption("mode", "javascript");
				} else if (ext == "json") {
					editor.setOption("mode", "json");
				} else {
					editor.setOption("mode", "shell");
				}
				// It would be easy to support other files types.  Would need "type.js" file to do the formatting.
				$.get(e.currentTarget.value + "?_ts=" + new Date().getTime(), function (data) {
					editor.getDoc().setValue(data);
				}).fail(function(x) {
					if (x.status == 200) {	// json files can fail but actually work
						editor.getDoc().setValue(x.responseText);
					} else {
						alert('Requested file [' + e.currentTarget.value + '] not found or an unsupported language.');
					}
				})
			});
		});

	</script>

	<div class="row">
		<div class="col-lg-12">
			<div class="panel panel-primary">
				<div class="panel-heading"><i class="fa fa-code fa-fw"></i> Script Editor</div>
				<!-- /.panel-heading -->
				<div class="panel-body">
					<p><?php $status->showMessages(); ?></p>
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
						<select class="form-control" id="script_path"
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
							if (is_dir(ALLSKY_WEBSITE)) {
								// The website is installed on this Pi.
								// The physical path is ALLSKY_WEBSITE; the virtual pathe is "website".
								if (file_exists(ALLSKY_WEBSITE . "/configuration.json"))
									echo "<option value='website/configuration.json'>Allsky Website configuration.json</option>";
								// TODO: when the new version of the website is deployed, remove these files:
								if (file_exists(ALLSKY_WEBSITE . "/config.js"))
									echo "<option value='website/config.js'>Allsky Website config.js</option>";
								if (file_exists(ALLSKY_WEBSITE . "/virtualsky.json"))
									echo "<option value='website/virtualsky.json'>Allsky Website virtualsky.json</option>";
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
