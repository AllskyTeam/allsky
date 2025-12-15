If you see a Killed or a RETCODE=137 message in /var/log/allsky.log, there's a good chance you need to increase the amount of swap space you Pi has. It's easy to do:

```
systemctl stop allsky
allsky-config  recheck_swap
systemctl start allsky
```

!!! warning  "Warning"

    The swap file cannot be in use when increasing it, so make sure you don't try to increase it when a timelapse or another memory-intensive command is being run.

If you are still having problems, try increasing swap size to 2048 MB or even 4096 MB.

A more detailed description of how to manually increase swap space, including adding multiple swap files, is [here](https://itsfoss.com/create-swap-file-linux/){ target="_blank" rel="noopener" }  .