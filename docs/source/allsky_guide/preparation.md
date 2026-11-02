# Preparation

Before you run the Allsky installer, get the Raspberry Pi working as an ordinary computer. You should be able to log in, reach the network, and confirm that the Pi can see the camera. It is much easier to sort out a bad cable, a missing driver, or a Wi-Fi password while everything is on a desk than after the camera is mounted outside. Leave the enclosure open until you have taken a test image.

Start with the parts that have to work together. The Pi needs enough memory for the camera and any timelapses or other processing you plan to do. The camera needs a suitable lens and a connection the Pi can use. The enclosure needs room for the camera, cables, power supply, and cooling, especially with a Pi 5. Think about storage at this stage too: Allsky keeps more than the latest picture. Images, videos, keograms, and startrails will all take up space over time. The [Pi](hardware/pi.md), [camera](hardware/camera.md), and [lens](hardware/lens.md) guides help with those choices.

Next, choose the operating system image. Allsky supports Raspberry Pi OS Trixie and Bookworm; the table below shows the older releases that are no longer supported. For a new installation on a Pi 4 or Pi 5, Trixie 64-bit Lite is a good starting point. Lite has no desktop, but you can still open Allsky's WebUI from another computer. If you want to use a monitor and graphical tools on the Pi while setting up the camera, choose Desktop. There is more detail on the 32-bit and 64-bit choices below.

You will need to write that image to a microSD card or, on a Pi 5 with the right adapter, an NVMe SSD. Raspberry Pi Imager can set the username, network details, and remote access before the Pi boots for the first time. Take a moment over those settings if you are using Lite: a Pi without a monitor is hard to reach if you have forgotten to enable SSH or entered the wrong Wi-Fi details. Writing a new image erases the selected drive, so make sure you have chosen the right one.

Once the Pi boots, update its packages, connect the camera, and check that the operating system detects it. Some cameras need vendor software or firmware before Allsky can use them. If this is an existing Allsky system, [back up its configuration and images](backup_restore/overview.md) before replacing the operating system. A fresh OS image does not keep the files on the old card or SSD.

When the Pi, network, and camera are ready, continue with [Installing Allsky](allsky.md). The sections below cover the OS and hardware choices and show how to write the image. There is also a link to the Pi 5 NVMe setup guide if you want to boot from an SSD.

## Supported Raspberry Pi operating systems { data-toc-label="Supported OS" }

!!! danger "PHP2Shell: update your Pi and website server"

    The PHP2Shell vulnerabilities ([CVE-2026-109618](https://security-tracker.debian.org/tracker/CVE-2026-109618) and [CVE-2026-109619](https://security-tracker.debian.org/tracker/CVE-2026-109619)) can allow remote code execution on systems running vulnerable PHP packages. Allsky's WebUI and Website use PHP. If you run Trixie or Bookworm, install the available security updates and reboot. If you run Bullseye or an older release, move to a supported OS; Debian no longer provides Bullseye security updates. Check and update any separate server hosting your Allsky Website too. See the [Allsky PHP security discussion](https://github.com/AllskyTeam/allsky/discussions/5457) for the steps and package versions to check.

Allsky supports Raspberry Pi OS **Trixie** and **Bookworm**. For a new installation, use the **64-bit Lite version of Trixie**.

| Raspberry Pi OS release | First released | Debian LTS security updates end | Allsky support |
| --- | --- | --- | --- |
| [Trixie](https://www.raspberrypi.com/news/trixie-the-new-version-of-raspberry-pi-os/) | 2 Oct 2025 | 30 Jun 2030 | Supported; recommended for new installations |
| [Bookworm](https://www.raspberrypi.com/news/bookworm-the-new-version-of-raspberry-pi-os/) | 11 Oct 2023 | 30 Jun 2028 | Supported |
| [Bullseye](https://www.raspberrypi.com/news/raspberry-pi-os-debian-bullseye/) | 8 Nov 2021 | 31 Aug 2026 | Not supported |
| [Buster](https://www.raspberrypi.com/news/buster-the-new-version-of-raspbian/) | 25 Jun 2019 | 30 Jun 2024 | Not supported |
| [Stretch](https://www.raspberrypi.com/news/raspbian-stretch/) | 17 Aug 2017 | 1 Jul 2022 | Not supported |
| [Jessie](https://www.raspberrypi.com/news/raspbian-jessie-is-here/) | 29 Sep 2015 | 30 Jun 2020 | Not supported |
| [Wheezy](https://www.raspberrypi.com/news/raspbian-based-sd-card-image-released/) | 18 Jul 2012 | 31 May 2018 | Not supported |

The release dates are for the Raspberry Pi OS images (called Raspbian for older releases). The update end dates are for the [underlying Debian release's LTS security updates](https://www.debian.org/releases/), which can differ from Raspberry Pi OS updates. Debian LTS dates do not determine which releases Allsky supports, and LTS covers a limited set of packages.

### Choosing an image: 64-bit or 32-bit, Lite or Desktop { data-toc-label="Which OS Type" }

- **64-bit:** Choose this for a new installation on a Pi 4 or Pi 5. It lets applications use more memory, which helps with large images and timelapses. It also runs on the Pi 3B+ and Pi Zero 2. On those low-memory models, 32-bit Lite can save RAM; choose it if memory use is the priority or a required camera driver or other dependency needs 32-bit.
- **Lite:** Choose this for a dedicated Allsky Pi that you will manage remotely. It uses fewer resources because it has no graphical desktop. You can still use the Allsky WebUI from a browser on another device.
- **Desktop:** Choose this if you want to use the Pi with a monitor, run graphical tools locally, or use a local preview while setting up and focusing the camera. It uses more memory and storage than Lite.

For most new Allsky setups, start with **Trixie 64-bit Lite**. See the [Raspberry Pi OS documentation](https://www.raspberrypi.com/documentation/computers/os.html) for the editions and architecture options.

### Writing Raspberry Pi OS to a microSD card { data-toc-label="OS Imager" }

1. [Download Raspberry Pi Imager](https://www.raspberrypi.com/software/) on a Windows, macOS, or Linux computer, and connect the microSD card using a card reader. If this card has an existing Allsky installation, back up anything you need first: writing the image erases the card.
2. In Imager, select your Pi model and the Raspberry Pi OS image you chose above. For most new setups, select **Trixie 64-bit Lite**.
3. Select the microSD card as the storage device. Check the device and its capacity carefully so you do not erase another drive.
4. Set a username and password, hostname, and time zone in Imager's customisation options. Add Wi-Fi details if you will use Wi-Fi. For a Lite installation managed remotely, enable SSH before writing the card.
5. Write the image and let Imager verify it. Eject the card, insert it into the Pi, connect the network if needed, and power it on. Then follow [Installing Allsky](allsky.md).

For screenshots and further setup options, see Raspberry Pi's [Imager instructions](https://www.raspberrypi.com/documentation/computers/getting-started.html#install-using-imager).

If you have a Pi 5 and want to boot from an SSD instead of a microSD card, see [Booting a Pi 5 from an NVMe SSD](hardware/pi.md#booting-a-pi-5-from-an-nvme-ssd).

Other operating systems, including Ubuntu, are not supported. If you are preparing a new Pi, see 
  
  - [Choosing a Pi Model](hardware/pi.md)
  - [Choosing a Camera](hardware/camera.md)
  - [Choosing a Lens](hardware/lens.md) before you [install Allsky](allsky.md)

## Supported Hardware { data-toc-label="Supported Hardware" }

| Pi model | Supported | Recommended | Notes |
|---|---|---|---|
| Pi 5, 16 GB | Yes | No | Allsky doesnt really need the 16Gb of ram this provides |
| Pi 5, 8 GB | Yes | Best choice | Fastest and most future-proof option, but produces more heat |
| Pi 4, 8 GB | Yes | Yes | Strong balance of price, memory, and performance |
| Pi 4, 4 GB | Yes | Yes | Strong balance of price, memory, and performance |
| Pi 4, 2 GB | Yes | Acceptable | Good budget-conscious option |
| Pi 4, 1 GB | Yes | No | Works, but memory limits are much more noticeable |
| Pi 3B+ | Yes | Only if you already have one | Usable, but slower for timelapses and other processing |
| Pi Zero 2 | Limited | No | Only consider if cost matters more than performance and headroom |
| Pi Zero | No | No | Not recommended for Allsky |
| Pi clones | Generally no | No | Compatibility is limited and unreliable |
