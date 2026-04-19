---
tags:
  - Home
  - Documentation
---

# Introduction

Allsky transforms a camera into a tireless, intelligent observer of the night sky: an automated system that watches, records, and analyses everything that happens above you.

Using a high-sensitivity camera, powerful Raspberry Pi-based software, and modular extensions, Allsky captures meteors, satellites, aurora, and passing cloud, 24 hours a day. Each frame is processed in real time to reveal events invisible to the naked eye, and every night becomes its own story told through data, images, and motion.

But Allsky is more than just a camera. It is an ecosystem. The web-based interface lets you monitor your system live, review captured events, design custom overlays, visualize sensor data, and automate your setup with a flexible module system. From temperature and dew heater control to star detection and meteor analytics, every feature works together in a single, polished dashboard.

Built by enthusiasts for enthusiasts, Allsky is open, extensible, and endlessly curious: a fusion of astrophotography, automation, and discovery.

!!! info "What this guide assumes"
    This guide assumes you want to understand how Allsky is meant to be used, not just how to get through a single setup screen.

    You do not need to read every page in order, but it helps to know which parts of the guide are for installation, which parts are for day-to-day use, and which parts are for deeper configuration or problem solving.

## What Allsky includes {data-toc-label="What Allsky Includes"}

In practical use, an Allsky installation usually involves several connected parts:

- the **Allsky software** that captures and processes images on the Pi,
- the **WebUI** used to configure and operate the system,
- optional **modules** that extend processing or add extra features,
- optional **overlays** that add information to images,
- optional local or remote **Website** components for viewing and sharing output,
- and supporting tools such as backups, logs, and troubleshooting utilities.

Those parts work together. The camera captures images, Allsky processes them, the WebUI exposes the results and settings, and the optional Website side makes the output easier to share with other people.

## What this documentation covers {data-toc-label="Docs Coverage"}

This guide is organized around how people actually use Allsky after installation.

You will find material covering:

- installation and first-time setup,
- hardware choices and compatibility,
- the WebUI and its main pages,
- settings and how they affect behaviour,
- overlays and modules,
- Websites and remote servers,
- backup, restore, and operational safety,
- troubleshooting and support,
- and general reference material such as the glossary and FAQ.

Some pages are conceptual and explain how a feature works. Others are procedural and walk through a task step by step. Others are there mainly for reference when something has gone wrong and you need a specific answer quickly.

## How to approach the guide {data-toc-label="Using This Guide"}

If you are new to Allsky, the easiest mistake is trying to absorb everything at once.

A better approach is to learn it in layers:

1. Understand what Allsky is meant to do.
2. Get the system installed and capturing images.
3. Become comfortable with the WebUI.
4. Learn the parts that matter for your setup, such as overlays, modules, uploads, or remote Websites.
5. Keep the troubleshooting, backup, and glossary pages nearby for later reference.

Most users do not need the whole guide on day one. What they need is a clear path into the parts that matter first.

## Good starting points {data-toc-label="Starting Points"}

=== "I am just getting started"

    Start with:

    - [Installing Allsky](allsky.md)
    - the hardware pages under `hardware`
    - [FAQ](faq.md)
    - [Glossary](glossary.md)

    That will give you the basic vocabulary, installation flow, and answers to the most common early questions.

=== "I already have Allsky installed"

    Start with:

    - pages under `using`
    - pages under `settings`
    - pages under `overlays`
    - pages under `backup_restore`

    This is the best route if your system is already running and you now want to understand how to use it well.

=== "I am trying to fix a problem"

    Start with:

    - pages under `troubleshooting`
    - [FAQ](faq.md)
    - [Glossary](glossary.md)

    If the issue is operational rather than purely technical, the backup and restore pages are also worth reading before you start making recovery changes.

## The WebUI and the Website are not the same thing {data-toc-label="WebUI vs Website"}

One distinction matters early because it affects how many other pages in the guide make sense: the **WebUI** is not the same as an **Allsky Website**.

The **WebUI** is the administration and monitoring interface. It is where you change settings, inspect the system, view status, manage modules and overlays, and work with the running installation.

An **Allsky Website**, by contrast, is intended for viewing and sharing output. It presents the current image and other generated results such as timelapses, keograms, and startrails. It can run on the same Pi or on a remote server.

That distinction shows up throughout the guide. If a page is about operating the system, it usually belongs to the WebUI side. If it is about presenting results to viewers, it usually belongs to the Website side.

## What matters most in regular use {data-toc-label="Regular Use"}

Once Allsky is installed and stable, most day-to-day use tends to revolve around a few recurring tasks:

- checking that capture is working,
- adjusting settings when conditions or hardware change,
- reviewing images and generated outputs,
- managing storage and uploads,
- adding or refining overlays and modules,
- and dealing with occasional troubleshooting when something stops behaving normally.

That is why this guide gives so much attention to the WebUI, the capture workflow, output review, and operational pages such as backup and restore. Those are the areas people return to repeatedly.

## A practical mindset for using Allsky {data-toc-label="Practical Mindset"}

Allsky works best when it is treated like a small operating system for your sky camera rather than just a camera app.

That means:

- making changes deliberately,
- understanding whether a setting affects daytime, nighttime, or both,
- keeping an eye on logs and system health,
- taking backups before significant changes,
- and using the viewing interfaces appropriately for administration versus public sharing.

You do not need to become an expert in every part of the system. But the more clearly you understand which part of Allsky is responsible for which job, the easier the whole installation becomes to use.

## Read next {data-toc-label="Read Next"}

- [Installing Allsky](allsky_guide/allsky.md)
- [Glossary](allsky_guide/glossary.md)
- [FAQ](allsky_guide/faq.md)

## Development Team { data-toc-label="Development Team" }

!!! info "Allsky Developers"
    The Allsky Camera software was originally created by Thomas Jacquin, a developer and astrophotography  enthusiast based in Canada.

    Thomas released the first version of Allsky around 2018, designed to run on a Raspberry Pi with a ZWO ASI or Raspberry Pi HQ camera to capture images of the entire sky — automatically creating timelapses, and keograms.

    Since then, the project has grown into a large open-source community effort on GitHub under the Allsky Team￼ organisation, with contributions from many developers and users:

    Thomas continues to be recognised as the founder and original author, while the Allsky Team now maintains and evolves the software collaboratively.

    The current maintainers are  
    - Eric Claeys - @EricClaeys  
    - Alex Greenland - @Alex-developer 

## Contributing { data-toc-label="Contributing" }
If you would like to contribute code to Allsky then please see the [Contributing Guide](developer_guide/contributing.md)

Thanks - the Allsky Team
