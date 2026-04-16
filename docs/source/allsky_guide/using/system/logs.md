# Logs

The **Logs** tab is where the WebUI shifts from summary information to raw evidence. When something is not behaving as expected, the status page can tell you that there is a problem, but the logs are often where you discover what actually happened. This page gives you a browser-based way to inspect the key log files that have been made available to the WebUI, without having to open a terminal on the Pi first.

![](/assets/using_images/system_logs_main.png){ width="100%" }

/// caption
Placeholder: Logs tab main view
///

At the top of the page is the log selector. This lets you choose which monitored log file you want to view. On a default system that will usually include the main Allsky log, the Allsky periodic log, and the Lighttpd error log, though the exact list depends on the log configuration available to the installation. That matters because the useful log is not always the same one. If the capture process is failing, the Allsky log is usually the right place to start. If a scheduled or periodic task is the problem, the periodic log may be more revealing. If the WebUI or web-serving layer is involved, the Lighttpd error log may tell the more useful story.

The large log viewer below the selector is designed to be readable for ongoing troubleshooting rather than just for static inspection. The output area is tall enough to make scanning easier, and log levels such as warnings and errors are visually highlighted so they stand out from routine informational lines. That does not replace careful reading, but it does make the page more usable when you are searching for the part of the log that actually matters.

One of the most useful controls on this page is the **Follow** switch. When follow mode is enabled, the viewer behaves more like a live tail. As new content is written to the selected log, the page updates so you can watch the file change in near real time. This is particularly helpful when you are actively reproducing a problem, testing a configuration change, or restarting a service and wanting to see the resulting messages as they appear. It turns the page from a passive log viewer into a practical diagnostic tool.

![](/assets/using_images/system_logs_follow.png){ width="100%" }

/// caption
Placeholder: Logs tab with Follow enabled
///

The page also shows metadata and warnings when needed. If the current view has been truncated, reset, or otherwise adjusted to keep the browser display manageable, the warning area explains that. This is an important detail because log files can grow quickly, and a WebUI log viewer has to balance completeness against performance. If you are looking at a very busy log, you may be seeing the most recent portion rather than the entire file. That is usually exactly what you want during troubleshooting, but it is worth understanding so you do not assume the page is meant to function as a full historical archive.

In practical use, the **Logs** tab works best when approached with a specific question. If you open it and simply scroll without knowing what you are looking for, it can feel noisy. If, on the other hand, you come to it asking “What happened when Allsky started?”, “Why did this upload fail?”, or “Did the web server report an error at the same time?”, it becomes much more effective. The status pages tell you that something is wrong. The logs often tell you what wrong actually means.

For deeper investigation, especially over a long period or across very large files, a terminal-based view may still be more appropriate. Even so, the WebUI logs page is often the fastest way to get from symptom to evidence, particularly when you are already working in the browser and want to confirm a suspicion before reaching for command-line tools.
