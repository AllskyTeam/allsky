# Watchdogs

The **Watchdogs** tab is the place to look when you want to understand the state of the service-level watchdog processes that help supervise the Allsky system. Unlike the main **System** tab, which is focused on broad health and resource status, this page is narrower and more operational. It is concerned with whether specific monitored services are present, whether they appear to be running correctly, what process ID they currently have, and what actions are available for them.

![](/assets/using_images/system_watchdogs.png){ width="100%" }

/// caption
Placeholder: Watchdogs tab
///

The table is intentionally simple. Each row corresponds to a service, and the columns show the service name, its current status, its PID, and a set of actions. That simplicity is useful because watchdog information is most valuable when it is immediately understandable. If something is meant to be running and is not, you do not want to hunt through a complicated interface to work that out. You want to see, as quickly as possible, whether the service is active, whether it has a current process ID, and whether there is an obvious recovery action available.

What makes this page different from a generic process listing is that it presents only the parts of the system that Allsky considers relevant to watchdog supervision. In other words, it is not trying to be a replacement for `ps`, `top`, or `systemctl status`. It is a focused view into the service components that matter to the WebUI’s own operational model. That makes it a good page for confirming that expected background pieces are alive without needing to leave the browser and inspect the Pi manually.

The PID column is more useful than it may first appear. A PID confirms that there really is a current process attached to that service status, and it can also help when you are correlating information across tools. If you later inspect logs or run command-line diagnostics, the PID shown here gives you a concrete anchor point. It is also a quick way to notice when a service is restarting frequently, because the PID may change between checks even though the service remains nominally active.

The action controls exist so that the page is not only descriptive but also practical. If a service is stopped, stuck, or behaving in a way that suggests it needs intervention, the actions column is the natural place to try that recovery. Exactly which actions are available depends on the service and on how the page is configured, but the intent is straightforward: this tab should let you move from noticing a watchdog problem to responding to it without having to switch context unnecessarily.

Used properly, the **Watchdogs** tab sits between the broad overview of the **System** page and the lower-level detail of the **Logs** page. If the System page tells you that Allsky or the host is not behaving normally, Watchdogs can help narrow the question to “Which supervised service looks wrong?” Once you have that answer, the Logs page is usually where you go next to understand why.
