This page lists various issues you may have with the Allsky Website and how to solve them.

## WARNING: Sunset ...
**WARNING: sunset is XX days old. Check Allsky log file if 'postData.sh' has been running...**

If you have a local or remote Allsky Website, at the end of every night Allsky calls postData.sh to upload a file called data.json to the Website(s). This file contains the sunset time and other information needed by the Website.

If you are seeing the message above when you go to the Allsky Website, run:

```allsky-config  check_post_data```

It will run the postData.sh command and if there is a problem it will suggest a fix.

## ERROR: sunset not defined ...
**ERROR: 'sunset' not defined in 'data.json' ...**
Follow the instructions in the error message. If this message continues to appear, follow the instructions on the WebUI's Getting Support page and upload the support log it creates to a new GitHub Discussion  .

## Change filename issues
**After changing the Filename in the WebUI you no longer see images on the Website**

If you changed the Filename setting or its extension (for example, from image.jpg to myimage.jpg or from image.jpg to image.png) in the WebUI, this change should automatically be sent to your Website(s). If that didn't happen, you must manually update the fileName value in the configuration.json file (local and/or remote) via the WebUI's Editor page. If that solved your problem, please follow these instructions to report a problem.

## Cannot access website
**Can't access the Allsky Website from a browser**

If nothing appears when you go to a local or remote Allsky Website it's usually a settings issue. If the Website is on your Pi, look in /var/log/lighttpd/error.log for clues to the problem. If the Website is remote, ask your hosting provider if you can have access to the web server's log file.
In both cases, you can also look at the configuration.json file in the WebUI's Editor page to see if the editor's colors are off. If so, that indicates a syntax error in the file that needs to be fixed.

If you are using the Pi's hostname in the URL, for example http://allsky/allsky, then try using the Pi's IP address, for example http://192.168.0.21/allsky.

!!! info  "Info"

    Remember that to access an Allsky Website on your Pi you need to enter http://allsky/allsky; entering http://allsky takes you to the WebUI.

## Missing Archived thumbnails
**Archived video files have no thumbnail**

If you click on the  (Archived Timelapses) icon on the left side of the Website and one or more videos say "No Thumbnail", see below.

On your Pi

This shouldn't happen on the Pi - it should automatically create the thumbnails when you go to the archived timelapses directory. Look in /var/log/lighttpd/error.log for clues to the problem.

On a remote server

For security reasons, many hosting solutions disable the commands needed to create video thumbnails.

To overcome this problem enable the Upload Thumbnail setting(s) for the Daily and/or Mini Timelapse.

!!! info  "Info"

    Making this change will only create thumbnails for all future videos. To create the currently missing thumbnails, do the following for each missing thumbnail, replacing YYYYMMDD with the date in ~/allsky/images
    
    ```generateForDay.sh --thumbnail-only --upload --timelapse YYYYMMDD```
    
    This will upload the thumbnail for the specified date.