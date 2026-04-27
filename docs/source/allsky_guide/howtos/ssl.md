SSL, more accurately TLS, allows your Pi to serve the WebUI and local Allsky Website over `https://` instead of plain `http://`. If you are exposing your Pi to the Internet, this is not optional. You should not make the WebUI or website reachable from the public Internet without HTTPS.

If your Pi is only ever accessed on your local network, you may decide not to use HTTPS. In that case this page does not apply.

This guide shows one practical way to enable HTTPS on an Allsky Pi using **Let's Encrypt**, **Certbot**, and the existing **lighttpd** web server.

## Before you start { data-toc-label="Before You Start" }

Before you try to add HTTPS, make sure all of the following are true:

1. Allsky is already working normally on the Pi.
2. You have a real Internet domain name that points to your home or remote network. In the examples below, `www.myallsky.com` is used as a placeholder.
3. Your router forwards **port 80** to the Pi so Let's Encrypt can validate the domain.
4. Your router forwards **port 443** to the Pi if you want people on the Internet to use HTTPS after setup is complete.
5. You understand that exposing a Pi to the Internet carries security risk and that HTTPS is only one part of securing the system.

!!! danger "Warning"

    Do not expose your Pi to the Internet unless you understand the security implications.

    HTTPS helps protect traffic, but it does not make the Pi safe by itself. You should still think about account security, updates, firewalling, network design, and what services are reachable from outside your network.

The instructions below assume Allsky is installed in `/home/pi/allsky`. If you installed it under a different user, replace `/home/pi` with your own home directory.

## Install the required software { data-toc-label="Install Software" }

Install Certbot on the Pi:

```sh
sudo apt update
sudo apt install certbot
```

Create a webroot directory that Certbot can use for the HTTP validation challenge:

```sh
mkdir -p /home/pi/allsky/config/ssl/www.myallsky.com/.well-known/acme-challenge
chmod -R 775 /home/pi/allsky/config/ssl
```

If you did not install Allsky as `pi`, adjust the path first.

## Allow the ACME challenge through lighttpd { data-toc-label="ACME Challenge" }

Let's Encrypt needs to fetch a temporary file from your server during certificate validation. To make that work, create a small lighttpd configuration snippet that maps `/.well-known/` requests to the directory you just created.

Create `/etc/lighttpd/conf-enabled/97-certbot.conf`:

```sh
sudo nano /etc/lighttpd/conf-enabled/97-certbot.conf
```

Add this:

```lighttpd
$HTTP["url"] =~ "^/.well-known/" {
    alias.url += (
        "/.well-known/" => "/home/pi/allsky/config/ssl/www.myallsky.com/.well-known/"
    )
}
```

Save the file, then restart lighttpd:

```sh
sudo systemctl restart lighttpd
```

At this point, lighttpd is ready to serve the temporary validation files Certbot will create.

## Request the certificate { data-toc-label="Request Certificate" }

Now request a certificate using the webroot method.

Replace:

- `www.myallsky.com` with your real domain name
- `x@y.com` with your email address

Then run:

```sh
sudo certbot certonly --webroot \
    -w /home/pi/allsky/config/ssl/www.myallsky.com \
    -d www.myallsky.com \
    -m x@y.com \
    --agree-tos
```

If everything is set up correctly, Certbot will place the certificate files under:

```text
/etc/letsencrypt/live/www.myallsky.com/
```

The important files are:

- `fullchain.pem`
- `privkey.pem`

You do **not** need to manually rebuild `fullchain.pem`, and you do **not** need to copy these files into your home directory just to use them with lighttpd.

## Configure lighttpd for HTTPS { data-toc-label="Configure lighttpd" }

Create a lighttpd configuration file for your HTTPS listener:

```sh
sudo nano /etc/lighttpd/conf-enabled/98-www.myallsky.com.conf
```

Add this:

```lighttpd
server.modules += ( "mod_openssl" )

$SERVER["socket"] == ":443" {
    ssl.engine  = "enable"
    ssl.pemfile = "/etc/letsencrypt/live/www.myallsky.com/fullchain.pem"
    ssl.privkey = "/etc/letsencrypt/live/www.myallsky.com/privkey.pem"
    server.name = "www.myallsky.com"

    # Uncomment if you want a dedicated access log for HTTPS requests.
    # accesslog.filename = "/var/log/lighttpd/www.myallsky.com_access.log"
}

$HTTP["scheme"] == "http" {
    $HTTP["host"] == "www.myallsky.com" {
        url.redirect = ("" => "https://${url.authority}${url.path}${qsa}")
        url.redirect-code = 308
    }
}
```

Then restart lighttpd:

```sh
sudo systemctl restart lighttpd
```

If lighttpd fails to restart, check the configuration carefully for typos and review:

```sh
sudo journalctl -u lighttpd -n 50 --no-pager
```

## Test the result { data-toc-label="Testing" }

Try both of these URLs in a browser:

- `http://www.myallsky.com`
- `https://www.myallsky.com`

The HTTP URL should redirect to HTTPS, and the HTTPS URL should load the WebUI or local website without a certificate warning.

If you do get a browser warning, the usual causes are:

- the domain name does not point to the Pi you configured
- the router is not forwarding the required ports correctly
- the certificate was issued for a different host name
- lighttpd is not actually using the certificate you requested

## Set up automatic renewal { data-toc-label="Auto Renewal" }

Let's Encrypt certificates expire after 90 days, so renewal needs to be automatic.

On most systems, Certbot already installs a systemd timer or cron job for regular renewal checks. What you still need is a way to make lighttpd reload the renewed certificate after Certbot updates it.

Create a deploy hook script:

```sh
sudo nano /etc/letsencrypt/renewal-hooks/deploy/reload-lighttpd.sh
```

Add this:

```sh
#!/bin/sh
systemctl reload lighttpd
```

Make it executable:

```sh
sudo chmod 755 /etc/letsencrypt/renewal-hooks/deploy/reload-lighttpd.sh
```

Now test the renewal process without waiting for the real certificate to expire:

```sh
sudo certbot renew --dry-run
```

If the dry run succeeds, your automatic renewal path is working.

## Manual renewal check { data-toc-label="Manual Check" }

You normally should not need to renew certificates by hand, but it is useful to know the command:

```sh
sudo certbot renew
```

That command attempts renewal only when a certificate is close enough to expiry. It does not force a new certificate every time.

If you just want to confirm that renewal is configured correctly, `--dry-run` is the better test:

```sh
sudo certbot renew --dry-run
```

## Files worth backing up { data-toc-label="Backups" }

Once HTTPS is working, it is sensible to back up the key SSL-related files somewhere other than the Pi.

The most useful items are:

- `/etc/letsencrypt/`
- `/home/pi/allsky/config/ssl/`
- `/etc/lighttpd/conf-enabled/97-certbot.conf`
- `/etc/lighttpd/conf-enabled/98-www.myallsky.com.conf`

If you installed Allsky as a different user, adjust the `/home/pi/...` path accordingly.

## A few practical notes { data-toc-label="Notes" }

- The directory under `~/allsky/config/ssl` is mainly there to support the ACME webroot challenge and will survive Allsky upgrades.
- The certificate files actually used by lighttpd live under `/etc/letsencrypt/live/...`.
- If you later change domain name, you should request a new certificate for the new host name rather than trying to reuse the old one.
- If your Pi is only for local access, adding Internet-facing HTTPS may create more risk than benefit. Only do this when you really need remote access and understand how you are exposing the device.
