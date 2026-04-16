!!! warning  "Info"

    If you have a remote Allsky Website or a remote Server, the Server Name, URL, and Image Directory settings in the WebUI can be very confusing.

    **Read this page carefully.**

    It may take 5 or 10 minutes, but it's important that you understand what you are doing and why so that you can fix any future problems quickly.


At a high level, a website is a collection of files sitting in a directory on some computer's disk drive. If a company called Classic Cars has a website at ```https://classiccars.com```, the directory on its computer that contains that website might be called cars. It may have sub-directories containing related files like wheels and seats.

If you want to get information on red wheels you enter ```https://classiccars.com/wheels/red.pdf``` into your browser, and software called the "web server" on the ```classiccars.com``` computer starts in the cars directory, then goes to the wheels directory, then gets the red.pdf file and sends it to your browser. The web server mapped the ```https://classiccars.com/wheels/red.pdf``` URL to the cars/wheels/red.info file on the server.

Likewise, when you go to the Allsky WebUI, for example via ```http://allsky```, your Pi's web server looks in ```~/allsky/html``` since that's what the Allsky developers specified as the root of the WebUI.

We now know there are TWO paths to a file in a website:

1. a URL used in a browser
2. a file path name used when logged into the server

As a user, you only care about the first path. If you work for Classic Cars and need to update the red.pdf file, you only care about the second path.

Allsky needs to know about BOTH paths to files on your remote Website. Sometimes mapping a URL to file location on a server is easy, and other times it's more difficult.

**Easy case: server directory structure matches URL**

!!! warning  "Info"

    If you are having a problem with your remote Website settings, this case probably doesn't apply to you unless you know almost nothing about computers. Read it anyhow because it will give you a better understanding of the problem.

You want to create a remote Allsky Website so you purchase a plan with a hosting provider for a website with a URL of https://mysite.com. The provider gives you a login on their server and tells you the:

- Server Name
- User Name
- Password

so you enter those into the WebUI. The provider also tells you that whatever you upload to the server will be visible via the URL using the same name. You use an FTP program like FileZilla   to log into the server and create a directory called allsky for the remote Website. (Visit the Allsky Website Installation   for the rest of the steps for creating a remote Website).

In the WebUI you set the Remote Website's Website URL to ```https://mysite.com/allsky``` and Image Directory to /allsky (or allsky, depending on your service provider).

**More difficult case: directory structure does NOT match URL**

You have the same website URL as above, but when you log into the server you see a directory called public_html. The hosting provider tells you that you need to put file into that directory in order to see them via the ```https://mysite.com``` URL.

In this case the web server is mapping the ```https://mysite.com``` URL to the /public_html directory on the server. You need to create a /public_html/allsky directory on the server and install the Allsky Website there. The URL to the Allsky Website is still ```https://mysite.com/allsky``` but in the WebUI you'd set the Remote Server's Image Directory to ```/public_html/allsky`` (or ```public_html/allsky``` depending on your service provider).

Mapping URLs to server directories like this is fairly common on remote servers that are shared by many people.

**Hardest case: you are totally lost**

If the hosting provider didn't tell you where to put your files on their server, you'll need to figure it out. When you log into the server you see a directory called users and inside it is a directory called your_login_name. Inside that directory is a public_html directory.

You first try creating the allsky directory in users but it gives you an "Access Denied" message.

You then try creating the allsky directory in users/your_login_name and it works, so in the WebUI you set the remote Website's Image Directory to users/your_login_name/allsky. After installing the remote Allsky Website   you go to ```https://mysite.com/allsky``` in your browser but get a "404 - Not Found" message.
Frustrated, you create an allsky directory in the ```users/your_login_name/public_html``` directory on the server. It's late so you go to bed.

The next day you go to ```https://mysite.com/allsky``` and see your Website, but notice the startrails, keogram, and timelapse files aren't there.

To help determine what's happening you run the following on your Pi:

```
allsky-config  compare_paths  --website
```

This command tries to determine both paths to the allsky directory - the location on the server where the ```https://mysite.com/allsky``` points to, and the location of the directory on the server when you log into it.

It returns:

```
UPLOAD directory = /users
WEB    directory = C:\www\users\your_login_name\public_html\allsky
A list of files on the UPLOAD site is in '/home/pi/allsky/tmp/comparePaths.sh-WEBSITE/upload-ls.txt'.
A list of files on the WEB server is in '/home/pi/allsky/tmp/comparePaths.sh-WEBSITE/web-ls.txt'.
```

The ```UPLOAD``` directory is what you see when you log into the server. The WEB directory is where the allsky directory is on the server when you log into it, i.e., it's the directory on the server that the ```https://mysite.com/allsky``` URL maps to.

You notice that both directories have users in them so you (correctly) determine the /users UPLOAD directory is the same as the C:\www\users directory on the server. That means the files that are being displayed in a browser are in ```users/your_login_name/public_html/allsky``` on the server.
Allsky uploads files to the location specified in the Image Directory setting, which is still users/your_login_name/allsky. You look at that directory on the server and see the startrails, keogram, and timelapse files.

You fix the problem by changing Image Directory to ```users/your_login_name/public_html/allsky``` and deleting the users/your_login_name/allsky directory on the server since it's not used. You then run generateForDay.sh --upload on the Pi to have Allsky upload the startrails, keogram, and timelapse files from last night to the correct place.