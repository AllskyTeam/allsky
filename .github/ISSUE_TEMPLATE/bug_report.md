---
name: Bug report
about: If you have a QUESTION enter a Discussion item using the link above.  Do NOT enter an Issue.
title: "[BUG]"
---
***

# Is this a QUESTION or FEATURE REQUEST?

If so, please add a **Discussion** item by clicking on the [Discussions](https://github.com/thomasjacquin/allsky/discussions) link above;  do NOT create an Issue. 
&nbsp; 

&nbsp; 

***
## Look in the Wiki before submitting an Issue
The Wiki has lots of information including troubleshooting tips for the vast majority of known issues.
&nbsp;

&nbsp;

***
<!-- ==================   Delete this line and everything above it ================== -->
### Environment:

* Camera: ZWO (including model) or RPi
* OS: Buster or Bullseye
* Allsky version
  * The newest software includes a file called `~/allsky/version`.
  * If it does not exist, run `grep Software /var/log/allsky.log`.
* Pi model and amount of memory (512 MB, 1, 2, 4, or 8 GB)


***
### Describe the bug

* Include a clear and concise description of what the bug is.
* Can it be reproduced?  If so, how?
* Did anything change?  Any settings?  Most issues occur after _some_ change was made.
* Please include **exact** messages, or better yet, include a screenshot.

* If this is a configuration-related issue (or you are not sure), attach these files, appending ".txt" to their names first:
  * Allsky or WebUI:
    * `~/allsky/config/config.sh`
    * `/etc/raspap/settings_ZWO.json` or `/etc/raspap/settings_RPiHQ.json`, depending on the camera type you have.
    * `~/allsky/config/ftp-settings.sh` (upload-related problems)
  * Allsky Website:
    * `/var/www/html/allsky/config.js` (Allsky Website problems)

If you have program output or multi-line messages to include,
add it like this so it formats correctly:
~~~
	~~~
	output/message line 1
	output/message line 2
	~~~
~~~


***
### Log / configuration files

Follow the instructions for [Reporting Issues](https://github.com/thomasjacquin/allsky/wiki/Reporting-Issues),
then **attach a copy** of the file(s) above.
Do **NOT** copy/paste them into this Issue.
