## Username and password issues

If you previously changed the username or password they are stored in encrypted format in a file. Deleting the file will restore the default values:

```sudo rm -f ~/allsky/config/raspap.auth```

If you never changed the username or password, do you get a dialog box asking for them when you go to the WebUI? If not, see below.

## Can't access the WebUI from a browser
For example, you aren't prompted for username and password. This is usually a settings issue. Look in /var/log/lighttpd/error.log for clues to the problem.

If you are using the Pi's hostname in the URL, for example http://allsky, then try using the Pi's IP address, for example http://192.168.0.21.