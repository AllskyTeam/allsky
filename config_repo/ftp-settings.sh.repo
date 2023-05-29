#!/bin/bash

# X*X*X*X*X*X*X*X*X*X*X*X*X*X*X*X*X*X*X*X*X*X*X*X*X*X*X*X*X*X*X*X*X*X*X*XX*X*X*X*X*X*X

# For details on these settings, click on the "Allsky Documentation" link in the WebUI,
# then click on the "Settings -> Allsky" link,
# then, in the "Editor WebUI Page" section, open the "ftp-settings.sh" sub-section.

# X*X*X*X*X*X*X*X*X*X*X*X*X*X*X*X*X*X*X*X*X*X*X*X*X*X*X*X*X*X*X*X*X*X*X*XX*X*X*X*X*X*X



	# How will files be uploaded?
PROTOCOL=""

	# The directory where the current image should be copied to.
IMAGE_DIR=""
WEB_IMAGE_DIR=""

	# The directory where the timelapse video should be uploaded to.
VIDEOS_DIR=""
VIDEOS_DESTINATION_NAME=""
WEB_VIDEOS_DIR=""

	# The directory where the keogram image should be copied to.
KEOGRAM_DIR=""
KEOGRAM_DESTINATION_NAME=""
WEB_KEOGRAM_DIR=""

	# The directory where the startrails image should be copied to.
STARTRAILS_DIR=""
STARTRAILS_DESTINATION_NAME=""
WEB_STARTRAILS_DIR=""


############### ftp, ftps, sftp, and scp PROTOCOLS only:
	# Name of the remote server.
REMOTE_HOST=""

	# Optionally enter the port required by your server.
REMOTE_PORT=""


############### ftp, ftps, and sftp PROTOCOLS only.  REMOTE_USER is also used by the scp PROTOCOL:
	# The username of the login on the remote server.
REMOTE_USER=""

	# The password of the login on your FTP server.  Does not apply to PROTOCOL=scp.
REMOTE_PASSWORD=""

	# If you need special commands executed when connecting to the FTP server enter them here.
LFTP_COMMANDS=""


############### scp PROTOCOL only:
	# The path to the SSH key.
SSH_KEY_FILE=""


############### S3 PROTOCOL only:
	# AWS CLI directory where the AWS CLI tools are installed.
AWS_CLI_DIR="/home/pi/.local/bin"

	# Name of S3 Bucket where the files will be uploaded.
S3_BUCKET="allskybucket"

	# S3 Access Control List (ACL).
S3_ACL="private"


############### GCS PROTOCOL only:
	# Name of the GCS bucket where the files are uploaded.
GCS_BUCKET="allskybucket"

	# GCS Access Control List (ACL).
GCS_ACL="private"


#### DO NOT CHANGE THE NEXT LINE
FTP_SH_VERSION=1
