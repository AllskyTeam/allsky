# Set to true to upload to your website
UPLOAD_IMG=false
UPLOAD_VIDEO=false

# FTP settings
USER='user'
PASSWORD='password'
HOST='example.com'
IMGDIR='/allsky'
MP4DIR='/allsky/videos'

# settings.json contains the camera settings such as exposure and gain
CAMERA_SETTINGS='settings.json'

# We get the filename from settings.json
FULL_FILENAME=$(jq -r '.filename' $CAMERA_SETTINGS)
EXTENSION="${FULL_FILENAME##*.}"
FILENAME="${FULL_FILENAME%.*}"

