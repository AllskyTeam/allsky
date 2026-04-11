Regardless of what you want to ask or report, first look at the existing GitHub [Discussions](https://github.com/AllskyTeam/allsky-modules/discussions){ target="_blank" rel="noopener" } and [Issues](https://github.com/AllskyTeam/allsky-modules/issues){ target="_blank" rel="noopener" }.

If someone else has reported it, add to their post; do not create a new one.

A problem is something that isn't working correctly and likely is caused by the Allsky Software.
Misconfigured settings and other user errors are not problems since the Allsky Software won't need to change.

A bug is something that isn't working correctly and you are pretty sure it's caused by the Allsky Software.

## Reporting Problems

### The Automated Method

!!! info  "Info"

    This is the preferred method to report problems and should be used if your WebUI is working.

Follow the instructions on the WebUI's [Getting Support](/?page=support){ target="_blank" rel="noopener" }  page.

### The Manual Method

!!! danger  "Warning"

    Only use this method if you are unable to use the automated method above, for example, if Allsky didn't install or the WebUI isn't working

If you can easily reproduce the problem, even if it means waiting until tomorrow for it to occur again, do the following:

  - Run the following command to make sure Allsky will produce the necessary information to help the Allsky Team troubleshoot your problem:  
    ```allsky-config   prepare_logs```. 

    If the command changed the Debug Level you are told what its prior value was so you can restore it when troubleshooting is over.

  - Wait until the problem occurs, then follow the steps below.


Either way:

  - Run the following to create a support log file in ~/allsky/html/support:

    ```cd ~/allsky; ./support.sh```

  - Create a new Problem [Discussions](https://github.com/AllskyTeam/allsky-modules/discussions){ target="_blank" rel="noopener" } in GitHub and attach the support log file to it.

  - Attach screenshots of any error messages or copy/paste their text and surround them with three tildas in the Discussion, for example:
    ```
    ~~~
    ERROR: error message line 1
      error message line 2, ...
    ~~~
    ```

    This makes the message format properly.

  - If there are any other files you think would be helpful, attach those as well (do not copy/paste their text).


!!! danger  "GitHub File Type"

    GitHub only accepts certain file types. See [this URL](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/attaching-files){ target="_blank" rel="noopener" } for a list of supported types. If your file has an unsupported extension, append a .txt to its name, e.g., settings.json.txt.

## Reporting Other Things

If you have a new item and it's:

  - a QUESTION, create a GitHub [Q&A Discussion](https://github.com/AllskyTeam/allsky/discussions/new?category=q-a){ target="_blank" rel="noopener" } 
  - a request for a NEW FEATURE, create a GitHub [Feature Request](https://github.com/AllskyTeam/allsky/discussions/new/choose){ target="_blank" rel="noopener" } 
  - anything else that's not a problem or bug, create a GitHub [Discussion](https://github.com/AllskyTeam/allsky/discussions/new/choose){ target="_blank" rel="noopener" } 
