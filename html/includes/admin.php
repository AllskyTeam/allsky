<?php

function DisplayAuthConfig($username, $password) {
	global $page;
	$myStatus = new StatusMessages();

	if (isset($_POST['UpdateAdminPassword'])) {
		// Update the password
		if (CSRFValidate()) {
			$new_username=trim($_POST['username']);
			$old = $_POST['oldpass'];
			$new1 = $_POST['newpass'];
			$new2 = $_POST['newpassagain'];
			if ($new_username == "") {
				$myStatus->addMessage('You must enter the username.', 'danger');
			}
			if ($old == "" || $new1 == "" || $new2 == "") {
				$myStatus->addMessage('You must enter the old (current) password, and the new password twice.', 'danger');
			} else if (password_verify($old, $password)) {
				if ($new1 != $new2) {
					$myStatus->addMessage('New passwords do not match.', 'danger');
				} else if ($new_username == '') {
					$myStatus->addMessage('Username must not be empty.', 'danger');
				} else {
					$contents = $new_username.PHP_EOL;
					$contents .= password_hash($new1, PASSWORD_BCRYPT).PHP_EOL;
					$ret = updateFile(RASPI_ADMIN_DETAILS, $contents, "admin password file", true);
					if ($ret === "") {
						$username = $new_username;
						$myStatus->addMessage("$new_username password updated.", 'success');
					} else {
						$myStatus->addMessage($ret, 'danger');
					}
				}
			} else {
				$myStatus->addMessage('Old password does not match.', 'danger');
			}
		} else {
			error_log('CSRF violation');
		}
	}
?>

<div class="row">
	<div class="col-lg-12">
		<div class="panel panel-primary">
			<div class="panel-heading"><i class="fa fa-lock fa-fw"></i> Change Admin Username and/or Password</div>
			<div class="panel-body">
				<?php if ($myStatus->isMessage()) $myStatus->showMessages(); ?>

				<form role="form" action="?page=<?php echo $page ?>" method="POST">
					<?php CSRFToken() ?>
					<div class="row">
						<div class="form-group col-md-4">
							<label for="username">Username</label>
							<input type="text" class="form-control" name="username" value="<?php echo $username; ?>"/>
						</div>
					</div>
					<div class="row">
						<div class="form-group col-md-4">
							<label for="password">Old password</label>
							<input type="password" class="form-control" name="oldpass"/>
						</div>
					</div>
					<div class="row">
						<div class="form-group col-md-4">
							<label for="password">New password</label>
							<input type="password" class="form-control" name="newpass"/>
						</div>
					</div>
					<div class="row">
						<div class="form-group col-md-4">
							<label for="password">Repeat new password</label>
							<input type="password" class="form-control" name="newpassagain"/>
						</div>
					</div>
					<input type="submit" class="btn btn-primary" name="UpdateAdminPassword" value="Save settings" />
				</form>
			</div><!-- /.panel-body -->
		</div><!-- /.panel panel-primary -->
	</div><!-- /.col-lg-12 -->
</div><!-- /.row -->

<?php 
}
?>
