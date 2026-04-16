## Local Website

You can easily limit the number of days of images stored on your local Website via the Days To Keep on Pi Website setting in the WebUI with the number of days' data you want to keep. Older files will be removed every morning.

## Remote Website

Because remote web sites vary, the instructions below are generic and it's assumed you know how to perform the steps.

1. Connect to the remote Website server.
2. For each of the startrails, keograms, and videos directories do the following:
  - Enter the directory.
  - Search for all *.jpg, *.png, or *.mp4 files older than your threshold, for example, older than one month.
  - Remove them. Do NOT remove the index.php files!
  - Enter the thumbnails sub-directory and delete files older than your threshold.