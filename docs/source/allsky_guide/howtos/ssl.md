SSL (Secure Socket Layers) allows you to use secure https URLs on your Pi for your WebUI and/or Allsky Website, instead of the less secure http. This is desirable (really, mandatory) when accessing the Pi from the Internet. If your Pi is only available on a local network, SSL isn't needed.

## Requirements

1. Allsky must be working on your Pi prior to installing SSL.
2. You must already have an Internet domain name for your Pi. The instructions below use www.myallsky.com but replace that with your domain name.
3. We assume that you used the default Pi user to install Allsky in /home/pi, so adapt the path to your needs.
4. You must forward the ports 80 and 443 to your Raspberry Pi private IP address on your router.

!!! danger  "Warning"

    Installing SSL requires that your Pi be accessible via the Internet and can be a huge security risk if not done correctly.

    ***Do not attempt unless you know what you are doing***. The Allsky developers are not responsible for any loss or damages.

    There are additional steps you should take to secure your Pi that aren't described in these instructions.

    If you aren't familiar with the following you're probably not qualified to install SSL:

      - installing a firewall and a VLAN
      - obtaining an Internet domain name

There are many ways to implement SSL; the instructions below use the popular and free [Let's Encrypt SSL](https://letsencrypt.org){ target="_blank" rel="noopener" .external } .

## Software installation

Install the following software on your Pi (you can copy/paste these lines into a terminal window):

```
sudo apt update
sudo apt install software-properties-common certbot
mkdir -p ~/allsky/config/ssl/www.myallsky.com
chmod -R 775 ~/allsky/config/ssl
```

If you are not using the default user name of pi, run whoami to determine your user name, then replace all occurances of pi in the commands below with your user name.

In your favorite text editor create a file called /etc/lighttpd/conf-enabled/97-certbot.conf. For example with the nano text editor:

```
sudo nano /etc/lighttpd/conf-enabled/97-certbot.conf
```

Add these lines to the file:

```
$HTTP["url"] =~ "^/.well-known/" {
    alias.url += ( "/.well-known/" => "/home/pi/allsky/config/ssl/www.myallsky.com/.well-known/" )
}
```

Save the file with Ctrl+x.

Restart the lighttpd web service to use the new configuration:

```
sudo systemctl restart lighttpd.service
```

## Certificates generation

The cerbot command will prompt for registration and create the SSL certificate and private key. Replace x@y.com with your email:

```
sudo certbot certonly --webroot -w allsky/config/ssl/www.myallsky.com \
    -d www.myallsky.com -m x@y.com --agree-tos
```

Combine the certificate and private key into one file:

```
sudo cat /etc/letsencrypt/live/www.myallsky.com/cert.pem \
    /etc/letsencrypt/live/www.myallsky.com/privkey.pem | \
    sudo tee /etc/letsencrypt/live/www.myallsky.com/fullchain.pem
```

Web server configuration

Configure lighttpd to use SSL and redirect any "http" requests on your Pi to "https" requests.
Create a file called ```/etc/lighttpd/conf-enabled/98-www.myallsky.com>.conf```:

```
sudo nano /etc/lighttpd/conf-enabled/98-www.myallsky.com.conf
```

Add these lines to the file:

```
server.modules += ( "mod_openssl" )

$SERVER["socket"] == ":443" {
        ssl.engine = "enable"
        ssl.pemfile = "/home/pi/fullchain.pem"
        ssl.ca-file = "/home/pi/chain.pem"
        ssl.privkey = "/home/pi/privkey.pem"
        server.name = "www.myallsky.com"

        # Uncomment the next line if you want the web server to log access requests.
        # accesslog.filename = "/var/log/lighttpd/www.myallsky.com_access.log"
}

$HTTP["scheme"] == "http" {
        $HTTP["host"] == "www.myallsky.com" {
                url.redirect = ("" => "https://${url.authority}${url.path}${qsa}")
                url.redirect-code = 308
        }
}
```

```
cd
sudo cp /etc/letsencrypt/live/www.myallsky.com/{privkey.pem,fullchain.pem,chain.pem} .
sudo chown pi:pi privkey.pem fullchain.pem chain.pem
sudo chmod 644 privkey.pem fullchain.pem chain.pem
sudo systemctl restart lighttpd.service
```

## Testing

Try to access your Pi via both http://www.myallsky.com> and https://www.myallsky.com>. You should see the WebUI in both cases.

## Renewal process

Let's Encrypt certificates are only valid for 90 days. You need to configure the Pi to renew your certificates before they expire (or do it manually).

First, renew your certificate, replacing x@y.com with your email:

```
sudo certbot certonly --webroot -w allsky/config/ssl/www.myallsky.com \
    -d www.myallsky.com -m x@y.com --agree-tos
```

You should see output similar to below:

```
Saving debug log to /var/log/letsencrypt/letsencrypt.log
Plugins selected: Authenticator webroot, Installer None
Cert not yet due for renewal

You have an existing certificate that has exactly the same domains or certificate name you requested and isn't close to expiry.
(ref: /etc/letsencrypt/renewal/www.myallsky.com.conf)

What would you like to do?
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
1: Keep the existing certificate for now
2: Renew & replace the certificate (may be subject to CA rate limits)
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
Select the appropriate number [1-2] then [enter] (press 'c' to cancel):
```

Select option 2. You will then see:

```
Renewing an existing certificate for www.myallsky.com
Performing the following challenges:
http-01 challenge for allsky02.my-cosi.info
Using the webroot path /home/pi/allsky/config/ssl/www.myallsky.com.info for all unmatched domains.
Waiting for verification...
Cleaning up challenges

IMPORTANT NOTES:
 - Congratulations! Your certificate and chain have been saved at:
   /etc/letsencrypt/live/www.myallsky.com/fullchain.pem
   Your key file has been saved at:
   /etc/letsencrypt/live/www.myallsky.com/privkey.pem
   Your certificate will expire on 2024-09-07. To obtain a new or
   tweaked version of this certificate in the future, simply run
   certbot again. To non-interactively renew *all* of your
   certificates, run "certbot renew"
 - If you like Certbot, please consider supporting our work by:

   Donating to ISRG / Let's Encrypt:   https://letsencrypt.org/donate
   Donating to EFF:                    https://eff.org/donate-le
```

Now combine the certificate and private key created above into one file:

```
sudo cat /etc/letsencrypt/live/www.myallsky.com/cert.pem \
    /etc/letsencrypt/live/www.myallsky.com/privkey.pem | \
    sudo tee /etc/letsencrypt/live/www.myallsky.com/fullchain.pem
```

Now copy the files to your home directory and restart the web server to use the new configuration certs files:

```
cd
sudo cp /etc/letsencrypt/live/www.myallsky.com/{privkey.pem,fullchain.pem,chain.pem} .
sudo chown pi:pi privkey.pem fullchain.pem chain.pem
sudo chmod 644 privkey.pem fullchain.pem chain.pem
sudo systemctl restart lighttpd.service
```

!!! info  "Info"

    You can renew your Let's Encrypt certificates at most 30 days before they expire - two weeks prior to expiration is a good goal.
    You will also receive an email from letsencrypt before your certificates expire.

## Notes

- Your SSL-related files are stored in ~/allsky/config/ssl and will be preserved across Allsky upgrades.

- When you are done installing and testing SSL, make a copy of the following items and store on something other than your Pi in case your Pi crashes:

  - ```/etc/letsencrypt``` directory
  - ```~/allsky/config/ssl``` directory
  - ```/etc/lighttpd/conf-available/97-certbot.conf```
  - ```/etc/lighttpd/conf-available/98-www.myallsky.com.conf```
  - ```/home/pi/fullchain.pem```
  - ```/home/pi/chain.pem```
  - ```/home/pi/privkey.pem```