The **Support** page in the WebUI exists for one job: helping you collect the information needed to report an Allsky problem properly. It is not just a generic status page, and it is not primarily a place to browse logs by hand. Instead, it guides you through creating a support bundle that the Allsky Team can use when troubleshooting something that is not working as expected.

That distinction matters. If you simply have a question about how something works, want advice on settings, or would like to request a new feature, the page points you toward GitHub Discussions instead of immediately treating the situation like a bug report. The Support page is really about structured problem reporting. Its purpose is to help you move from “something is wrong” to “here is a clean, useful diagnostic package that gives the developers a fair chance of understanding it”.

![](/assets/using_support/support_main_page.png){ width="100%" }

/// caption
Placeholder: Support page overview
///

At the top of the page you will see a block of guidance explaining when to use GitHub Discussions and when to use the support log workflow. This is deliberate. A lot of support effort is lost when problems are reported in the wrong place or with too little information. The page tries to reduce that friction by making the distinction clear:

- If you have a question, use a GitHub Q&A discussion.
- If you want to request a feature, use a feature request discussion.
- If you want to discuss something that is not actually a fault, start an ordinary discussion.
- Only use the support-log process when there is a real Allsky problem, meaning something is failing, behaving incorrectly, or producing unexpected results.

The page also makes an important point that is worth repeating: the Allsky Team does not actively monitor Facebook for support. If you want useful troubleshooting help, GitHub is the correct place to go.

Once you are using the page for its intended purpose, the main workflow is very simple. You click **Generate**, confirm that you agree to collect the diagnostic data, wait while Allsky builds the support bundle, then download that file and attach it to your GitHub discussion or issue. After that, you can optionally link the local support bundle to the GitHub discussion number so the entry in the Support page remains meaningful later.

What makes this page especially useful is that it collects this information in a repeatable and organised way. Instead of asking users to manually gather a handful of logs, guess which configuration files are important, and remember what to redact, the Support page automates the collection process and presents the result as a single downloadable archive.

## What the generated support log contains { data-toc-label="What It Contains" }

Before a log is generated, the page shows a confirmation message explaining what will be collected. The wording may change over time, but the general idea is stable: Allsky gathers technical information that helps diagnose the system while avoiding obvious personal data wherever practical.

The generated support bundle includes items such as:

- Basic system information.
- Filesystem, memory, and network information.
- Installed system and Python packages.
- Allsky logs and web server logs.
- Connected camera details.
- I2C bus details.
- Running processes.
- Allsky configuration files, with sensitive information obfuscated where needed.

The page explicitly notes that IPv4, IPv6, and MAC information is obfuscated, and that personal information is not intentionally collected. That does not mean you should stop thinking critically about what you upload, but it does mean the process is designed with privacy in mind rather than simply dumping raw diagnostics into a zip file.

![](/assets/using_support/support_generate_dialog.png){ width="100%" }

/// caption
Placeholder: Generate support log confirmation dialog
///

This is one of the main reasons the Support page is preferable to assembling files manually. A good support request needs consistency. If every user attaches a different mixture of files, troubleshooting becomes slower and more error-prone. By generating a standard support bundle, Allsky improves the quality of incoming reports for both the user and the developer.

## Generating a support log { data-toc-label="Generating Logs" }

The lower section of the page contains the **Support Logs** panel. This is where existing bundles are listed and where new ones are created. The most important control here is the **Generate** button in the top-right corner of that panel.

When you click **Generate**, Allsky does not immediately start gathering information. First it shows a confirmation dialog explaining what will be collected. This gives you one last chance to cancel if you clicked the button by mistake or if you are not ready to generate the bundle yet. If you continue, the page shows a loading overlay while the backend runs the support script and creates a new archive in Allsky’s support directory.

Once generation finishes, the table refreshes and the new support log appears in the list. You can generate multiple logs over time, and the newest one will naturally sort to the top because the table is ordered by creation time. This is useful if you are testing a problem repeatedly, changing settings between attempts, or creating an updated bundle after a developer has asked for fresh information.

One subtle but useful detail is that the page treats support logs as a history, not as a one-shot action. That means you can build a new bundle after making a change, compare it with an earlier one if needed, and keep a record of what you sent during different stages of troubleshooting.

![](/assets/using_support/support_logs_table.png){ width="100%" }

/// caption
Placeholder: Support Logs table with multiple generated bundles
///

## Understanding the Support Logs list { data-toc-label="Support Logs List" }

Every generated support bundle appears in the table on the Support page. The table includes:

- The filename of the support bundle.
- The date and time it was created.
- The linked GitHub problem number, if one has been recorded.
- The file size.
- Action buttons for download, GitHub linking, and deletion.

The underlying filenames follow a structured pattern so that Allsky can track the relationship between the local archive and the related GitHub discussion or issue. You do not normally need to edit these filenames by hand, and in fact you should not. The page provides the GitHub button specifically so that the file can be renamed safely and consistently when you want to associate it with a GitHub discussion or issue number.

If the table already contains entries, that does not necessarily mean something is wrong or cluttered. It may simply reflect previous troubleshooting sessions. Some users like to keep older support bundles for reference until a problem is resolved. Others prefer to delete old ones once the report has been submitted. The page supports either approach.

## Downloading a support log { data-toc-label="Downloading Logs" }

The download action is the one you will use most often after generating a bundle. Clicking the download button retrieves the selected archive from the Pi and saves it through your browser in the usual way. This is the file you attach to your GitHub discussion or issue.

In practical terms, the workflow usually looks like this:

1. Generate a new support log after reproducing the problem.
2. Download the newest archive.
3. Open or prepare your GitHub discussion or issue.
4. Attach the downloaded file there.
5. Submit the discussion or issue.

It is usually best to generate the support log fairly close to the time the problem occurred, especially if the issue is reflected in logs or recent state. Waiting too long may still work, but it increases the chance that useful diagnostic context is no longer current.

![](/assets/using_support/support_download_action.png){ width="100%" }

/// caption
Placeholder: Download action for a support bundle
///

## Linking a support log to a GitHub discussion or issue { data-toc-label="Linking to GitHub" }

After you create a GitHub discussion or issue and attach the support log, you can return to the Support page and use the GitHub button for that log entry to record the related GitHub ID.

When you click the GitHub button for a support log, a dialog opens and asks for two things:

- Which repository the discussion or issue belongs to.
- The GitHub ID number.

At present the repository choices are **Allsky** and **Allsky Modules**. The dialog also explains where the ID comes from: it is the number at the end of the GitHub URL. For example, if the discussion URL ends in `/123`, the ID is `123`.

This does not upload anything to GitHub by itself. It simply updates the local support bundle metadata, which the page stores by renaming the support file in a controlled way. Once that is done, the **Problem** column in the table can show a meaningful link instead of a blank or unassigned entry. That becomes helpful later when you return to the page and want to remember which local archive was attached to which GitHub conversation.

In other words, this feature is not about troubleshooting the Pi directly. It is about keeping the support process organised.

![](/assets/using_support/support_github_link_dialog.png){ width="100%" }

/// caption
Placeholder: Link GitHub Discussion or Issue dialog
///

## Deleting old support logs { data-toc-label="Deleting Logs" }

Each entry also has a delete button. This removes the selected support bundle from the Pi after a confirmation prompt. Deleting a bundle does not affect the GitHub discussion or issue it may have been attached to; it only removes the local copy from Allsky’s support storage.

There are several reasonable times to delete a support log:

- The problem has already been resolved and you no longer need the archive locally.
- You generated a test bundle by mistake.
- You created multiple bundles while experimenting and only want to keep the final one.
- You are simply keeping the system tidy.

There is no requirement to delete older logs immediately. Keeping them for a while can be useful, especially if the troubleshooting process continues over several rounds. But if you are done with them, the delete action gives you a straightforward way to clean up.

## Typical support workflow { data-toc-label="Workflow" }

Although the page explains the broad steps on screen, it helps to think of the process as a clean sequence.

If you have found a genuine Allsky problem, a sensible workflow is:

1. Reproduce the problem, if possible.
2. Open the **Support** page in the WebUI.
3. Click **Generate** and confirm the data collection message.
4. Wait for the new support bundle to appear in the list.
5. Download that bundle.
6. Create a GitHub discussion or issue for the problem if you have not already done so.
7. Attach the support bundle to that GitHub post.
8. Submit the post.
9. Return to the Support page and use the GitHub button to record the discussion or issue number against the local bundle.

That final step is easy to skip, but it is worth doing. A few weeks later, you may not remember which archive went with which report, and neither will anyone else who has access to the system. Linking them properly keeps the history readable.

## If the automatic process does not work { data-toc-label="Manual Method" }

The Support page is the preferred way to report a problem when your WebUI is working normally. However, there will be times when that is not possible. You may find that the WebUI is not available, the support bundle cannot be generated automatically, or the system is in a state where the normal page workflow is simply not practical.

If that happens, switch to the manual reporting method described in the troubleshooting guide. The important thing is not whether the log was created from the page or from the command line. The important thing is that you still gather the support information, attach it to your GitHub report, and describe the problem clearly.

In practice, the manual route is the right choice when:

- The WebUI is unavailable.
- The Support page cannot complete the log generation process.
- Allsky did not install correctly enough for the normal workflow to be usable.
- You are troubleshooting a problem severe enough that using the WebUI is difficult or unreliable.

When that happens, follow the manual reporting steps in the troubleshooting documentation, generate the support log directly, and then attach it to your GitHub discussion in the same way you would if the Support page had produced it for you.

If you can reproduce the problem without too much difficulty, the manual process should be:

1. Prepare Allsky to capture the most useful troubleshooting information by running:

   ```sh
   allsky-config prepare_logs
   ```

2. If that command tells you it changed the Debug Level, make a note of the previous value so you can restore it later.
3. Wait until the problem happens again.
4. Create a support log manually by running:

   ```sh
   cd ~/allsky
   ./support.sh
   ```

5. This creates a support log file in `~/allsky/html/support`.
6. Create a new GitHub discussion for the problem and attach the generated support log file.
7. If you saw error messages on screen, attach screenshots of them or copy and paste the text into the GitHub discussion inside a fenced block so the formatting is preserved, for example:

   ```text
   ~~~
   ERROR: error message line 1
     error message line 2
   ~~~
   ```

8. If there are any other files that will help explain the problem, attach those as files as well rather than pasting their contents into the discussion.

One practical point is worth keeping in mind: GitHub only accepts certain attachment types. If you need to attach a file with an unsupported extension, rename it by appending `.txt` to the end of the filename before uploading it. For example, `settings.json` can be renamed to `settings.json.txt`.
