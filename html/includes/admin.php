<?php

if (basename(__FILE__) === basename($_SERVER['SCRIPT_FILENAME'])) {
	include_once('functions.php');
	redirect("/index.php");
}

global $useLogin;
global $pageHeaderTitle, $pageIcon;

$privateVars   = get_decoded_json_file(ALLSKY_ENV, true, "");
$adminUser     = (string)$privateVars["WEBUI_USERNAME"];
?>

<style>
	.as-admin-error {
		font-size: 2rem;
	}
</style>

<div class="container">
	<div class="col-md-6 col-md-offset-2 panel-style">
		<div class="panel panel-allsky">
			<div class="panel-heading"><i class="<?php echo $pageIcon ?>"></i> <?php echo $pageHeaderTitle ?></div>
			<div class="panel-body">
				<div class="row">
					<div class="col-md-12">
						<div class="alert alert-success" role="alert">
							If you intend to allow access to this Pi from the Internet
							please select the checkbox below.
							This will enusre that a more secure password is used for the WebUI.
						</div>
					</div>
				</div>
				<form role="form" action="includes/adminutils.php?request=Validate" method="POST" id="as-admin-user-password">
					<?php CSRFToken() ?>
					<div class="form-group">
						<div class="checkbox">
							<div class="row">
								<div class="col-md-7">Enable WebUI login</div>
								<div class="col-md-5">
									<div class='switch-field boxShadow as-enable-webui-login-wrapper'>
										<input id='switch_no_as-enable-webui-login' class='form-control' type='radio' name='as-enable-webui-login' value='false' <?php echo ($useLogin == false) ? 'checked' : '' ?>>
										<label style='margin-bottom: 0px;' for='switch_no_as-enable-webui-login'>No</label>
										<input id='switch_yes_as-enable-webui-login' class='form-control' type='radio' name='as-enable-webui-login' value='true' <?php echo ($useLogin == true) ? 'checked' : '' ?>>
										<label style='margin-bottom: 0px;' for='switch_yes_as-enable-webui-login'>Yes</label>
									</div>
								</div>
							</div>
						</div>
					</div>
					<div id="as-admin-user-password-fields-container">
						<div id="as-admin-user-password-fields">
							<div class="form-group">
								<div class="checkbox">
									<div class="row">
										<div class="col-md-7">Will this Pi will have remote access from the internet?</div>
										<div class="col-md-5">
											<div class='switch-field boxShadow as-use-online-wrapper'>
												<input id='switch_no_as-use-online' class='form-control' type='radio' name='as-use-online' value='false' checked>
												<label style='margin-bottom: 0px;' for='switch_no_as-use-online'>No</label>
												<input id='switch_yes_as-use-online' class='form-control' type='radio' name='as-use-online' value='true'>
												<label style='margin-bottom: 0px;' for='switch_yes_as-use-online'>Yes</label>
											</div>
										</div>
									</div>
								</div>
							</div>
							<div class="form-group">
								<label for="username">Username</label>
								<input type="text" name="username" id="username" class="form-control" required="required" value="<?php echo $adminUser; ?>">
							</div>
							<div class="form-group">
								<label for="oldpass">Old Password</label>
								<input type="password" name="oldpass" id="oldpass" class="form-control" required="required">
							</div>
							<div class="form-group">
								<label for="newpass">New Password</label>
								<input type="password" name="newpass" id="newpass" class="form-control" required="required">
								<div class="alert alert-info mt-3" role="alert" id="as-admin-password-format">Loading Password Format</div>
							</div>
							<div class="form-group">
								<label for="newpassagain">Confirm Password</label>
								<input type="password" name="newpassagain" id="newpassagain" class="form-control" required="required">
							</div>
							<div class="form-group">
								<button type="submit" class="btn btn-primary btn-block"><i class="fa-regular fa-paper-plane"></i> Update Username/Password</button>
							</div>
						</div>
						<div id="as-admin-user-password-fields-overlay"></div>
					</div>
				</form>
			</div>
		</div>
	</div>

	<script>
		$(document).ready(function() {
			let adminManager = new ALLSKYADMIN()
		});
	</script>

	<script src="/js/allsky-admin/allsky-admin.js?c=<?php echo ALLSKY_VERSION; ?>"></script>
	<script src="/js/jquery-loading-overlay/dist/loadingoverlay.min.js?c=<?php echo ALLSKY_VERSION; ?>"></script>
	<script src="/js/bootbox/bootbox.all.js?c=<?php echo ALLSKY_VERSION; ?>"></script>
	<script src="/js/bootbox/bootbox.locales.min.js?c=<?php echo ALLSKY_VERSION; ?>"></script>