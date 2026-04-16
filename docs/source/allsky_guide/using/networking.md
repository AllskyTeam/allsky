### Overview { data-toc-label="Overview" }

The networking area of the WebUI brings together three closely related pages: **Configure WiFi**, **LAN Dashboard**, and **WLAN Dashboard**. Taken together, these pages answer two different kinds of question. The first is, “How do I get this Pi connected to the network I want to use?” The second is, “Now that it is connected, what is the current state of that connection?” The Wi-Fi configuration page is mostly about making or changing a connection, while the LAN and WLAN dashboard pages are more about inspecting the interfaces you already have.

### Configure WiFi { data-toc-label="Configure WiFi" }

For most people, the page they will interact with most directly is **Configure WiFi**. This page is designed to make wireless setup less awkward than editing network files by hand, especially on headless or appliance-style Allsky systems where the camera may be installed in a location that is inconvenient to work on physically. Instead of manually scanning, remembering the exact SSID, and writing credentials somewhere else, the page shows the wireless adapters it can find, scans for nearby networks, displays what each adapter can currently see, and lets you start a connection directly from the WebUI.

![](/assets/using_images/networking_configurewifi_main.png){ width="100%" }

/// caption
Placeholder: Configure WiFi main page
///

One useful design detail is that **Configure WiFi** is organised by adapter. If your system has more than one wireless interface, each one gets its own tab. That matters because not every setup is limited to a single built-in Wi-Fi device. Some users add USB wireless adapters, and others may have one interface used for infrastructure mode while another is used for testing or recovery. By separating the adapters into tabs, the page makes it clear which physical or logical interface you are working with.

Within each adapter tab, the page first gives you a small status summary. It shows the network you are currently connected to, the security type, and the current channel and band. That summary is useful because it immediately tells you whether the adapter is already associated with something, and if so, what. This is especially helpful when you are diagnosing a situation where the Pi is connected, but perhaps not to the network you expected.

Below that summary is the list of available wireless networks. This list is not static. It is built by scanning what the selected adapter can currently see. In other words, it reflects the radio environment around that interface at that moment. If the Pi is moved, the antenna changes, the access point becomes weaker, or a network disappears temporarily, the scan results may change too. The refresh button is therefore important. It is not just a cosmetic reload; it is how you tell the page to perform a fresh look at the local wireless environment for that adapter.

!!! warning "Wireless scans are not always complete on the first try"

    It is worth remembering that a Wi-Fi scan is only a snapshot of what the adapter can see at that moment, and that snapshot is not always complete. A network may be slow to appear, may only be visible intermittently, or may be missed entirely on an initial scan if the signal is weak, the adapter is still settling, or there is simply a lot of wireless activity in the area.

    For that reason, if you expect to see a network and it is not listed, do not assume immediately that the access point is down or that Allsky has a problem. In many cases the right next step is simply to press the refresh button and scan again. It is not unusual for a second or third scan to reveal networks that were absent from the first one.

    This is especially true when the Pi is a long way from the router, when antennas are obstructed, when the network is on the edge of reception, or when you are working in an environment with many overlapping wireless networks. Re-scanning gives the adapter another chance to detect what is really present.

The list itself is designed to expose the information you usually need when deciding how to connect. It shows whether a network is already in use, the SSID, the channel, the band, the signal strength, and the security mode. Those details matter more than they may first appear to. Two networks may have the same name, but different bands or very different signal levels. A weak 2.4 GHz network and a strong 5 GHz network may both be visible, but one may be a better fit depending on distance, walls, and how stable you need the connection to be. The page does not make the decision for you, but it does surface the information you need to make a sensible choice.

When you choose to connect to a network, the page opens a connection dialog rather than immediately trying to switch. That dialog shows the adapter, the SSID, the security mode, and the channel and band, so you can confirm that you selected the right thing. If the network is secured, the dialog asks for the password. This extra step is worth having because it reduces the chances of connecting to the wrong SSID or entering credentials without realising the selected network was not the one you intended.

![](/assets/using_images/networking_configurewifi_connect.png){ width="100%" }

/// caption
Placeholder: Configure WiFi connection dialog
///

The page also deals with one of the more frustrating but common wireless problems: a blocked radio. If Wi-Fi is soft-blocked or hard-blocked, the page tells you that clearly before you waste time wondering why no networks are appearing. A soft block usually means the radio has been disabled in software and can often be reversed with `sudo rfkill unblock wifi`. A hard block usually means the wireless device has been disabled at a lower level, such as by hardware, firmware, or BIOS settings. That distinction matters because the remedies are different, and the page makes that visible up front.

Another helpful behaviour is that **Configure WiFi** will tell you if it cannot find any Wi-Fi adapters at all. That sounds simple, but it is a very different problem from “the adapter exists but no networks were found” or “the adapter exists but the radio is blocked.” By separating those cases, the page makes troubleshooting much faster. No adapter means you should think about hardware detection, drivers, or the physical device. An empty scan result means the adapter is alive, but there may be no reachable networks or the signal may simply be too weak.

In day-to-day use, the Wi-Fi page is best thought of as an operational tool rather than a long-term monitor. You visit it when you need to connect, reconnect, check what networks are visible, or confirm that the adapter is seeing what it should. Once the interface is connected and you want more detailed information, the **WLAN Dashboard** becomes the more useful page.

### WLAN Dashboard { data-toc-label="WLAN Dashboard" }

The **WLAN Dashboard** is about the current state of wireless networking rather than choosing a network. Like the configuration page, it is organised per wireless interface, but what it shows is much broader. It reports items such as SSID, BSSID, bitrate, transmit power, signal level, link quality, frequency, derived band and channel information, IPv4 and IPv6 addressing, gateway, DNS servers, MTU, and regulatory domain. It is the page you use when wireless is technically connected but not behaving well, or when you simply want to understand exactly what the radio is doing.

![](/assets/using_images/networking_wlan_dashboard.png){ width="100%" }

/// caption
Placeholder: WLAN dashboard
///

That distinction between **Configure WiFi** and **WLAN Dashboard** is important. The Wi-Fi configuration page is user-facing and task-oriented: find a network, connect to it, and refresh the scan when needed. The WLAN dashboard is diagnostic and descriptive: it tells you what the wireless interface is currently associated with and how healthy that connection appears to be. If your signal is poor, if you are on an unexpected band, if your bitrate is lower than expected, or if you want to verify gateway and DNS information, the dashboard is usually the better place to look.

### LAN Dashboard { data-toc-label="LAN Dashboard" }

The **LAN Dashboard** performs the same general role for wired networking. It is organised per Ethernet interface and focuses on link state, speed, duplex, auto-negotiation, IPv4 and IPv6 addressing, packet counts, byte counts, packet errors, packet drops, gateway, DNS, and MTU. If the Pi is connected by cable, this is the page that tells you whether the interface is merely present or actually negotiated and carrying traffic.

![](/assets/using_images/networking_lan_dashboard.png){ width="100%" }

/// caption
Placeholder: LAN dashboard
///

The wired dashboard is especially helpful when a cable appears to be connected but networking still does not behave correctly. Link state will tell you whether the Ethernet connection is actually up. Speed and duplex reveal whether the negotiated link is what you expected. Packet errors and drops can suggest cabling or switch issues. Gateway and DNS values tell you whether the broader network configuration makes sense once the link itself is working.

### How The Pages Fit Together { data-toc-label="How Pages Fit Together" }

Between them, the LAN and WLAN dashboard pages give you a detailed view of your current interfaces, while **Configure WiFi** gives you a practical way to choose and connect to wireless networks. That is why it makes sense to see them as one documentation topic even though they are three separate pages. In real use, they support each other. You might use **Configure WiFi** to join a new network, then open the **WLAN Dashboard** to confirm that the adapter connected on the expected band with a sensible signal level, and then use the **LAN Dashboard** to verify that a backup wired connection is also available or to compare the two interfaces.

For most users, the simplest way to think about these pages is this: use **Configure WiFi** when you want to make something happen, and use the **LAN** or **WLAN** dashboards when you want to understand what is already happening.
