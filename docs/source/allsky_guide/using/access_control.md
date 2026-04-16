# Access Control

The Allsky WebUI is both a viewer and an administration interface. It does not just show images. It can also change camera settings, adjust modules, edit overlays, control uploads, and affect how the whole system behaves. Because of that, access control matters.

In simple terms, the key question is this: **who can reach your WebUI, and what could they do if they got in?**

For some installations, requiring a login is essential. For others, especially isolated local systems, a lighter setup may be acceptable. This page explains when login protection makes sense, when it may be reasonable not to use it, and what settings are available.

## What login protects { data-toc-label="What login protects" }

When WebUI login is enabled, it protects the administration side of Allsky.

That includes access to things like:

- Allsky settings,
- module management,
- overlays and editors,
- system tools,
- image and capture controls,
- and other pages that can change system behaviour.

If someone can access the WebUI without restriction, they are not just looking at your sky. They may be able to change how your system works.

!!! warning "Important distinction"
    The **WebUI** is the management interface.
    An **Allsky Website** or the `public.php` page is for viewing output.
    If you want people to see your images without giving them administrative access, use a viewing page, not an open WebUI.

## When you should require login { data-toc-label="When require login" }

In most real deployments, login should stay enabled.

You should require login if:

- the Pi is reachable from the Internet,
- the Pi is on a network you do not fully trust,
- more than one person can reach the WebUI,
- the system is installed somewhere shared, public, or semi-public,
- or you simply want a sensible default level of protection.

If your Allsky system can be accessed from outside your home network, disabling login is a bad idea.

!!! danger "Internet-accessible systems"
    If your Pi is accessible from the Internet, do **not** disable WebUI login.
    Also change the default credentials immediately if they are still in use.

## When it may be reasonable not to require login { data-toc-label="When may reasonable" }

There are cases where disabling login can be acceptable, but they are narrower than many people expect.

It may be reasonable if:

- the WebUI is only reachable on a private local network,
- access is limited to devices and people you trust,
- the system is used in a controlled home or observatory environment,
- and convenience matters more than account-style protection.

For example, a Pi that is only reachable inside your home LAN and is never exposed outside that network may not need a login if you are the only person using it.

Even then, it is worth thinking carefully. Home networks are often less isolated than people assume, and "local only" setups have a habit of becoming remotely reachable later.

!!! tip "Practical advice"
    If you are unsure, leave login enabled.
    It is easier to keep protection in place than to recover from an exposed WebUI later.

## A useful compromise { data-toc-label="A useful compromise" }

Many users want two different things at the same time:

- easy access for themselves,
- and a public way to share the sky with others.

The right solution is usually:

1. Keep WebUI login enabled.
2. Use an Allsky Website or `public.php` for viewing.

That gives you a public-facing image page without exposing the management interface.

Use `public.php` when you want to share the current image without exposing the WebUI. It is intended for viewing, not administration.

## Access control settings and related options { data-toc-label="Access control settings" }

There are only a few main pieces to understand, but they work together.

### Require WebUI Login { data-toc-label="Require WebUI Login" }

This is the main access-control setting in **Allsky Settings** under **WebUI Configuration**.

- Setting: **Require WebUI Login**
- Default: **Yes**

When enabled, users must sign in to the WebUI before they can use the protected interface.

When disabled, the WebUI is open to anyone who can reach it over the network.

The existing settings documentation is explicit here: if your Pi is accessible on the Internet, do not disable this setting.

### WebUI username and password { data-toc-label="WebUI username password" }

The WebUI uses a username and password for sign-in.

On a default installation, the initial credentials are:

- Username: `admin`
- Password: `secret`

Those defaults are suitable only for first-time local setup. They should be changed immediately on any system that will continue to be used.

The WebUI credentials are stored in `env.json`.

!!! warning "Do not keep the defaults"
    If the default username and password are still active, change them as soon as possible.
    A login screen is only useful if the credentials are not widely known.

### Change Password { data-toc-label="Change Password" }

The guide already references a **Change Password** link for updating the WebUI credentials. That is the normal way to move away from the default `admin` / `secret` login after installation.

If you enable login, changing the password should be part of the initial setup, not something left for later.

### Remember me { data-toc-label="Remember me" }

The login page includes a **Remember me** checkbox.

This does not change who is allowed into the WebUI. It only changes how long your browser session stays signed in.

Use it when:

- the browser is on a trusted personal device,
- the system is in a controlled environment,
- and you do not want to sign in repeatedly.

Avoid using it on shared devices or browsers other people can access.

## Choosing the right setup { data-toc-label="Choosing the right setup" }

These patterns work well in practice:

=== "Best for most users"

    - Leave **Require WebUI Login** enabled.
    - Change the default username and password.
    - Use an Allsky Website or `public.php` for public viewing.

=== "Local-only convenience setup"

    - Consider disabling login only if the WebUI is strictly private and local.
    - Revisit that decision if network access changes later.
    - Do not assume "inside my network" automatically means "safe enough".

=== "Internet-facing setup"

    - Keep login enabled.
    - Change the default credentials immediately.
    - Prefer not to expose the WebUI directly unless you understand the security implications.
    - Use a viewing page for public access instead of exposing the admin interface.

## Common mistakes { data-toc-label="Common mistakes" }

- Disabling login because you want to share images with other people.
- Leaving the default `admin` / `secret` credentials in place.
- Assuming a private LAN can never become reachable from outside.
- Treating the WebUI and the public image pages as if they were the same thing.
- Using a remembered login on a shared browser or shared machine.

## Recommended baseline { data-toc-label="Recommended baseline" }

For most users, the sensible default is:

1. Keep **Require WebUI Login** enabled.
2. Change the default credentials immediately.
3. Use an Allsky Website or `public.php` for anyone who only needs to view images.

That gives you a good balance of convenience, safety, and clarity about who should be able to do what.
