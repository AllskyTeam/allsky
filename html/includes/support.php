<?php
$DiscussionURL = ALLSKY_GITHUB_ROOT . "/" . ALLSKY_GITHUB_ALLSKY_REPO . "/discussions";
$V = ALLSKY_VERSION;

if (! is_dir(ALLSKY_SUPPORT_DIR)) {
	$cmd = "{ sudo mkdir " .  ALLSKY_SUPPORT_DIR . " &&";
	$cmd .= " sudo chown " . ALLSKY_OWNER . ":" . WEBSERVER_GROUP . " " . ALLSKY_SUPPORT_DIR . " &&";
	$cmd .= " sudo chmod 775 " . ALLSKY_SUPPORT_DIR . "; } 2>&1";
	echo "<script>console.log(`Excuting: $cmd`);</script>";
	$x = exec($cmd, $result, $ret_value);
	if ($x === false || $ret_value !== 0) {
		echo "<p class='errorMsg'>Failed running $cmd: " . implode("<br>", $result) . ".</p>";
	}
}

  global $pageHeaderTitle, $pageIcon, $pageHelp;
	
?>

<style>
	.panel-heading h3 {
		margin-top: 0;
	}
	.panel-body {
		padding-bottom: 0px;
	}
	.alert {
		padding: 8px !important;
		margin-bottom: 15px !important;
		border: 1px solid transparent !important;
		border-radius: 4px !important;
	}
	
	#as-support-files th {
		font-size: 1.3em;
	}

	#as-support-files td {
		padding-bottom: 10px;
		font-size: 1.2em;		
	}

	table tbody tr:first-child {
		color: green;
	}

	.mr-10 {
		margin-right: 10px;
	}

	.dark .markdown-body pre {
		color: white !important;
		background: #222222 !important;
	}

	.fileName {
		padding: 0 .2em !important;
		margin: 0 !important;
		font-size: 90% !important;
		color: inherit !important;
		border-radius: 6px !important;
		background-color: #fffbdf !important;
		border: 1px solid rgba(212,167,44,0.4) !important;
	}

	.dark .fileName {
		padding: 0 .2em !important;
		margin: 0 !important;
		font-size: 90% !important;
		color: inherit !important;
		border-radius: 6px !important;
		background-color: rgba(187,128,9,0.1) !important;
		border: 1px solid rgba(187,128,9,0.4) !important;
	}	
</style>

<div id="githubIdModal" class="modal fade" tabindex="-1" role="dialog">
  <div class="modal-dialog">
    <div class="modal-content">
      
      <div class="modal-header">
        <h4 class="modal-title">Link Github Discussion or Issue</h4>
        <button type="button" class="close" data-dismiss="modal">&times;</button>
      </div>

      <div class="modal-body">
        <form id="githubIdModalForm">
          <div class="form-group">
            <label>Select the repository your Discussion or Issue is in:</label><br>
            <label class="radio-inline">
              <input type="radio" name="choice" value="AS" checked> Allsky
            </label>
            <label class="radio-inline">
              <input type="radio" name="choice" value="ASM"> Allsky Modules
            </label>
          </div>
          
          <div class="form-group">
            <label for="numberInput">Github ID:</label>
            <input type="number" class="form-control" id="githubIdModalId" name="githubIdModalId" required>
          </div>
		  <div class="alert alert-info" role="alert">This can be found at the end of the GitHub url.
		  	If the url is '<?php echo $DiscussionURL ?>/123' then the ID is 123.
		  </div>
        </form>
      </div>

      <div class="modal-footer">
        <button id="githubIdModalOK" class="btn btn-primary">OK</button>
        <button class="btn btn-default" data-dismiss="modal">Cancel</button>
      </div>

    </div>
  </div>
</div>

<div class="panel panel-allsky">
	<div class="panel-heading clearfix">
        <span><i class="<?php echo $pageIcon ?>"></i> <?php echo $pageHeaderTitle ?></span>
		<?php if (!empty($pageHelp)) { doHelpLink($pageHelp); } ?>
    </div>
	<div class="panel-body as-support-loading">
		<div class="panel panel-default">
			<div class="panel-heading">
				<h3>Support Logs <small>&nbsp; &nbsp; previously generated log files</small>
					<div class="pull-right">
						<button type="button" class="btn btn-danger" id="as-support-generate">Generate</button>
					</div>
				</h3>
			</div>
			<div class="panel-body">
				<table id="as-support-files" class="display" style="width:100%">
					<thead>
						<tr>
							<th>Filename</th>
							<th>Sort</th>
							<th>Date/Time Created</th>
							<th>Problem</th>
							<th>Size</th>
							<th>Actions</th>
						</tr>
					</thead>
				</table>
			</div>
		</div>

	</div>
</div>

<script>
	$(document).ready(function() {
		let supportManager = new ALLSKYSUPPORT()
	});

	let ALLSKY_GITHUB_ROOT = '<?php echo ALLSKY_GITHUB_ROOT; ?>';
	let ALLSKY_REPO_URL = '<?php echo ALLSKY_GITHUB_ROOT . "/" . ALLSKY_GITHUB_ALLSKY_REPO; ?>';
	let ALLSKY_MODULES_REPO_URL = '<?php echo ALLSKY_GITHUB_ROOT . "/" . ALLSKY_GITHUB_ALLSKY_MODULES_REPO; ?>';
</script>

<?php

    echo addAsset([
			'/js/allsky-support/allsky-support.js',
			'/js/datatables/datatables.min.css',
			'/js/datatables/datatables.js',
			'/js/jquery-loading-overlay/dist/loadingoverlay.min.js',
			'/js/bootbox/bootbox.all.js',
			'/js/bootbox/bootbox.locales.min.js',
			'css/allsky.css'
		]);

?>
