This page describes how to prepare a remote server to accept uploads of the current Allsky image as well as startrails, keograms, and timelapse videos.

!!! danger "Warning"
    This page is for setting up a remote server, which typically does not run an Allsky Website. If you want to set up a remote Website, click [here](website.md).


#### Why use a remote server?

Since this server does NOT run the Allsky Website software you may wonder why have a remote server. Let's say you have a web page for an observatory that has a description of your equipment as well as some astrophotographs you've taken. If you also want to include the current allsky image as well as last night's timelapse, you'd simply set up your observatory web server to accept pictures from Allsky, then update Allsky to upload the pictures.

#### Preparing the remote server

The exact commands you use will depend on your server and/or hosting solution, but at a high level the steps are:

- Create the following directories on the server, making sure their names are lowercase and spelled exactly as below:  
  - ==allsky==  
  - ==allsky/videos==  
  - ==allsky/videos/thumbnails==  
  - ==allsky/startrails==  
  - ==allsky/startrails/thumbnails==  
  - ==allsky/keograms==  
  - ==allsky/keograms/thumbnails== 


- Go to the Remote Server Settings section of the WebUI's Allsky Settings page and fill in the settings. See the Allsky [Settings](settings/allsky.md)   page for a description of the settings.


After enabling the Use Remote Server setting a test file will be uploaded to the server to ensure it works. If there are any problems, visit the Troubleshooting -> Uploads page for details on how to fix the problem.