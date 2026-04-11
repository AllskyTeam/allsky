This page describes how to install a new Allsky Website or upgrade an existing Website.

An Allsky Website running on your Pi is called a **local Website** because it is local to your Pi.  
An Allsky Website running on anywhere else is called a **remote Website**.

### Local Website
The code for a local Website is already on your Pi so getting it to work is easy:

#### New Allsky installations or upgrades with no prior local Website
The new local Website needs to be **enabled** and **configured** before it can be used. If you go to the Website prior to that you'll get an error message telling you what to do.

- **Enable** the Website by going to the ```Allsky Settings``` page in the WebUI and enabling the Use ^^Local Website^^ setting in the **Websites and Remote Server Settings** section. This will create a default configuration file you'll use in the next step.
- **Configure** the Website in the ```Editor page``` in the WebUI by selecting ```configuration.json (local Allsky Website)```. from the drop-down. You will see one or more ==XX_NEED_TO_UPDATE_XX== entries that need changing. Set the remaining entries to your liking.

See the [Website Settings](settings/website.md)  page for a description of the settings.

#### Allsky Upgrades with an existing local Website
The Allsky upgrade will use your prior local Website configuration and automatically enable the new Website. Any existing images and videos from the prior Website will be moved to to the new Website. You are done unless the prior Website was version **v2022.03.01+** or earlier, in which case you need to:

- Manually copy your prior settings from ==/var/www/html/allsky/config.js== to ==configuration.json== by going to the ```Editor``` page in the WebUI and selecting ```configuration.json (local Allsky Website)```. Note that there are more settings in the new configuration file, but it should be straightforward to map settings from the old file to the new file.
- After configuring the local Website, check in ==/var/www/html/allsky== for any files you may have manually added and store them in ==~/allsky/html/allsky/myFiles==.
- Save ==config.js== somewhere in case you need it later.
- Remove the old Website:  
  ```rm -fr /var/www/html/allsky```

### Remote Website
Most people have their Pi on a home network where it's not accessible from the Internet, so they install the Allsky Website on a different machine that is accessible on the Internet.

Prior to installing a remote Website, make sure Allsky is working on your Pi. If you will also have a local Website, get it working to your liking before enabling the remote Website so you don't have to update settings in both places.

Do the following:

- On the remote server:
    - Create an allsky directory to hold the Website. Keep track of where on your server you created the directory - you will need that information later when you tell Allsky where to upload the images.
- On the Pi:
    - Go to the Websites and Remote Server Settings section in the WebUI's Allsky Settings page. Update the settings in the Remote Website subsection. Do NOT enable Use Remote Website yet, but update the other settings so Allsky knows how to upload a file to the Website. The Website will be automatically enabled in the next step.
    - Run cd ~/allsky; ./remoteWebsiteInstall.sh to upload the Website code and create a default remote configuration file.
        - The installation will try to upload a file to the server; If that fails it should tell you why. If not, see the Troubleshooting uploads page on how to debug the problem.
        - If you previously enabled the local Allsky Website, the remote configuration file will be identical to the local one with the exception of the imageName setting which will be configured for the remote Website.
        - If you want the remote configuration to differ from the local one (for example, to add a background image to the remote Website), edit the remote configuration file - see the next step.
    - Configure the remote Website:
        - In the WebUI, click on the Editor link.
        - In the drop-down at the bottom of the page, select remote_configuration.json (remote Allsky Website).
        - See the Settings -> Allsky Website   page for details on the settings.
        - A copy of the remote Website configuration file will be uploaded to the server.

        !!! danger "Warning"
            Whenever you update the remote Website's configuration you must do so via WebUI following the steps above. Do NOT edit the configuration file directly on the remote server.

- Your remote server is now ready.
- Give your family and friends the URL to your Allsky Website so they can enjoy your images!

### Remote Website Requirements

The remote server needs to support the following:  
- PHP version 7 or newer.  
- The ```imagecreatefromjpeg``` function in PHP to create thumbnails of the startrails and keogram files. If that function does not exist (which is rare), you'll see a thumbnail that says "No thumbnail". Everything else will still work.  
 - Optionally, the ffmpeg command and exec function in PHP to create thumbnails of the timelapse videos.

!!! warning "Warning"
    Most hosting solutions don't support those commands for security reasons. In that case, make sure Upload Timelapse Thumbnail is enabled (and Upload Mini-Timelapse Thumbnail if you are creating mini timelapses). Failure to set those variables will result in "No thumbnail" messages when viewing videos. Everything else will still work.

### Post installation
Change Allsky Website Settings as desired so the Website looks and behaves like you want. Changes to both local Websites and remote Websites are done via the WebUI.

!!! warning "Warning"
    If you have both a local and a remote Website, they each have their own configuration file which is accessible via the WebUI's Editor page. They are NOT automatically kept in sync so if you change something, for example, the lens, you'll need to change it in both files.