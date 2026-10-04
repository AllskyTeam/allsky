## Username and password issues { data-toc-label="Username password issues" }

**Forgot the username or password?** Set new ones on the Pi with:

```
~/allsky/scripts/utilities/setWebuiPassword.sh
```

The username and the encrypted password are stored in `~/allsky/config/env.json`. Since v2026.10.01, deleting `~/allsky/config/raspap.auth` no longer resets them.

**"Too many failed attempts"**: to protect the WebUI, wrong logins lock it for a while. After 3 wrong logins within 10 minutes, that username can't log in from that address for 5 minutes; more failures lock the local network, and after 12 the username everywhere. Each further lock doubles, up to 1 hour. During a lock even the correct password is refused, so wait for the time shown on the login page before trying again. For a short lock, logging in from another device or through a tunnel may still work.

To end a lock right away, delete the file that records the failed logins, on the Pi:

```
sudo rm -f ~/allsky/config/myFiles/allsky_login_throttle.json
```

If you never changed the username or password, do you get a dialog box asking for them when you go to the WebUI? If not, see below.

## Can't access the WebUI from a browser
For example, you aren't prompted for username and password. This is usually a settings issue. Look in `/var/log/lighttpd/error.log` for clues to the problem.

If you are using the Pi's hostname in the URL, for example `http://allsky`, then try using the Pi's IP address, for example `http://192.168.0.21`.
