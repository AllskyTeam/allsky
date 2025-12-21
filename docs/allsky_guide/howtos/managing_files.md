This page describes how to copy files to and from the Pi.

### Small text files
If the file you want to copy is a text file and it fits on one screen you can simply highlight the text and copy to the clipboard, then paste it into a file on your PC or Mac.

## Other files
For all other files you can mount the Pi's ```/home/pi``` directory (or the user you installed Allsky as) onto your PC or Mac using the SAMBA service.

The first step is to install SAMBA on the Pi:

```
allsky-config  samba
```

Follow the prompts.

When installation is done you should see something like this on a PC in Windows File Explorer, where ALLSKY is the name of the Pi:

![](/assets/howtos_images/Pi_network_drive.png){ width="50%" }


To mount this directory on a PC:

- Right-click the "pi_home" icon and select Map network drive....

    You'll see something like:

![](/assets/howtos_images/Map_network_drive.png){ width="50%" }


- Pick any drive letter you want.

- Check the Connect using different credentials box.

- Click the Finish button. You'll then see a dialog box like this:

![](/assets/howtos_images/EnterNetworkCredentials.png){ width="50%" }


- For the User name, enter WORKGROUP\pi (replacing pi with the login you installed Allsky as).

- Use the SAMBA password you entered during installation.

- Check the Remember my credentials box so you don't have to manually log in every time.

- Click OK.

SAMBA only needs to be installed once unless you reimage your SD card.