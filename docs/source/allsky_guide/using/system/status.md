# System Status

The **System** tab is the operational overview page for the Allsky WebUI. It is where you go when you want a quick, practical picture of the machine running Allsky rather than a deep dive into one specific subsystem. The page brings together the status of the Pi itself, the state of the Allsky service, a set of live resource indicators, and the main control buttons you are most likely to need when managing the system day to day.

![](/assets/using_images/system_status_overview.png){ width="100%" }

/// caption
Placeholder: System tab overview
///

At the top of the page is a compact action bar. This is where you can start or stop Allsky itself, reboot the Pi, shut the Pi down cleanly, or open the editor for any custom additions that have been configured for the System page. These controls are deliberately close to the main status display, which means the page works well both as a passive dashboard and as the place you use when you need to intervene. If Allsky has stopped, you can restart it here. If the system needs to be shut down before maintenance, you can do that here as well. Because these are operational controls, it is worth using them with care, especially on a remote installation where a shutdown or reboot may temporarily remove your access.

The first pair of summary panels gives you a high-level description of the host and of the Allsky installation. On the host side, the page shows the Pi hostname, the IP addresses currently assigned, the Raspberry Pi model, and the Pi uptime. On the Allsky side, it shows the installed Allsky version, whether the local website is enabled, whether the remote website is enabled, and the Allsky uptime. That separation is helpful because it reminds you that the computer and the capture software are related, but not the same thing. The Pi can be running perfectly while Allsky has stopped, and Allsky can be running while some other part of the host is under stress. Seeing both contexts together makes that distinction easier to spot.

Below the summary cards is the part of the page many people will use most often: the live health indicators. These progress bars and status rows make it easy to judge the overall condition of the system at a glance. The throttle indicator is particularly important on Raspberry Pi hardware because it can reveal undervoltage or thermal throttling conditions that would otherwise show up only as vague instability. Memory usage, CPU load, CPU temperature, disk usage, and temporary storage usage each tell a slightly different story. A high CPU load might simply mean the system is busy for a moment, while steadily rising disk usage points to a storage problem that will not resolve by itself. The temperature display is equally useful because overheating is one of the more common causes of unexplained poor behaviour on enclosed or outdoor installations.

![](/assets/using_images/system_status_resources.png){ width="100%" }

/// caption
Placeholder: System tab resource and health indicators
///

One useful detail about the storage rows is that they do not only tell you the percentage used. They also show the total size of the filesystem and how much free space remains. That makes the display much more actionable. A percentage by itself can look alarming or harmless without context, but the combination of percentage and remaining space helps you decide whether the system is genuinely close to a limit or simply sitting where you expect it to be.

The page can also include custom additions defined by the system configuration. These may appear as extra progress bars, extra information rows, or custom action buttons. That flexibility allows the System tab to serve not only the built-in Allsky metrics, but also any local checks or controls you want to expose through the WebUI. On one installation that might mean a custom temperature or power reading. On another it might mean a shortcut to an auxiliary maintenance script. The important point is that the page is designed to be extendable, so what you see there may be slightly richer than the default layout described in the documentation.

In practice, the **System** tab is the best place to start whenever you are asking a broad question such as “Is the machine healthy?”, “Is Allsky actually running?”, or “Is the Pi under obvious pressure?” It will not answer every diagnostic question in detail, but it is usually the quickest route to understanding whether the system is fundamentally fine or whether you need to move on to one of the more specialised tabs such as **Watchdogs**, **Logs**, or **Backups**.
