---
name: Bug report
about: If you have a QUESTION enter a Discussion item using the link above.  Do NOT enter an Issue.
title: "[BUG]"
---


<!-- =========================================================== -->

# Is this a QUESTION or FEATURE REQUEST?

If so, please add a Discussion item by clicking on the Discussions link above;  do NOT create an Issue. 



<!-- =========================================================== -->
&nbsp; 
## Look in the Wiki before submitting this Issue
The Wiki has lots of information including troubleshooting tips for the vast majority of known issues.


<!-- ========================================================================  --> &nbsp; 
<!-- ============= ***** Delete this line and everything above it before submitting this Issue ***** =============== -->



<!-- ==================== Section 1 ==================== -->
### Environment

* Camera:  ZWO  or  RPi - include the model
* OS: Buster or Bullseye
* Allsky version:
     * The newest software includes a file called  ~/allsky/version
     * If it does not exist, run:       grep Software /var/log/allsky.log
* Pi model and amount of memory (512 MB, 1, 2, 4, or 8 GB)


<!-- ==================== Section 2 ==================== -->
<!-- ***** Leave the next line but delete the remaining lines in Section 2 after you've entered your information. ***** -->
### Bug Description

* Include a clear and concise description of what the bug is.
* Can it be reproduced?  If so, how?
* Did anything change?  Any settings?  Most issues occur after a change was made.
* Please include the exact messages or a screenshot.
* If this is a configuration-related issue (or you are not sure), attach these files, appending ".txt" to their names first:
  * Allsky problems:
    * ~/allsky/config/config.sh
    * ~/allsky/config/settings.json
    * ~/allsky/config/ftp-settings.sh (only for upload-related problems)
  * Allsky Website problems:
    * ~/allsky/html/allsky/configuration.json (local Website)
    * ~/allsky/config/remote_configuration.json (remote Website)


If you have program output or multi-line messages to include,
add it like this so it formats correctly (note the lines with tildas):

~~~
output/message line 1
output/message line 2
~~~


<!-- ==================== Section 3 ==================== -->
<!-- ***** Leave the next line but delete the remaining lines in Section 3 after you've attached any files. ***** -->
### Log / configuration files

Follow the instructions for Reporting Issues in the Wiki, then ATTACH a copy of the file(s) above.
Do NOT copy/paste them into this Issue.
