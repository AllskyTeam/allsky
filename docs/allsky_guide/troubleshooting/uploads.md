Uploading a file means copying it to a different computer. Allsky supports several ways to upload files including ```ftp```, ```scp```, and others.

### Testing an upload

After you've configured settings such as Server Name and Protocol for a remote Website or remote server, run one of the commands below, depending on whether you are testing uploads to a remote Allsky Website or a remote server:

```
testUpload.sh --website
     OR
testUpload.sh --server
```

This attempts to upload a file to the server, and if it fails, it often tells you how to fix it.

If that doesn't help, look at the sections below for additional information.

### Incorrect WebUI connection settings

A common mistake is having incorrect values for the Server Name and associated URL settings in the WebUI.

  - A Server Name looks like myserver.com and is the address FTP and other file transfer programs use to connect to the server.
    It is NOT a URL so generally shouldn't have "http", "https", or "/" in its value.

  - A Website URL or Server URL look like http://mywebsite.com/allsky/ and is the address web browsers use to connect to the server.
    It MUST begin with "http://" or "https://".

See Mapping server locations to URLs   for tips on what values to use for these settings, especially if you get messages like "Not found" or "404".

### Incorrect WebUI settings

The Server Name, User Name, and other connection settings in the WebUI for the remote Website or remote server must be correct. If YOU can't log in to the server, Allsky won't be able to either.

The directory structure for a remote Website must match the Allsky standard; changing locations and/or names of files and directories will cause uploads to fail. For a remote server you can use use any directory structure you want; Allsky only writes to the Image Directory location.

### Certificate-related errors

There are three main certificate-related error messages you'll see.

  - Host key verification failed   OR
    
    The authenticity of host 'xxxxx' can't be established
    
    These errors typically occur when using the sftp PROTOCOL. On the Pi, ssh to your remote server: ssh -p 22 username@host (replacing "username" and "host" with the appropriate values). The host will display a message and prompt for "yes" or "no". Enter "yes". This only needs to be done once for a given host.
    
    The remote server now knows about the Pi.

  - Certificate verification: certificate common name doesn't match requested host name "xyz.com"
    
    There are two ways to fix this:
    
      - Create a file called ~/.lftprc and add set ssl:check-hostname false to it:

          ``echo "set ssl:check-hostname" > ~/.lftprc``

      - Set the FTP Commands setting to set ssl:check-hostname false. If you expect to execute lftp manually the first method is better, otherwise use the second method so all your configuration changes are in one place.

  - Certificate verification: Not trusted
    
    Add ```set ssl:verify-certificate no`` to FTP Commands or the ~/.lftprc file as above.

If your Pi's IP address changed, or the IP address remained but the machine using the addressed changed, you probably need to remove the previous key from your ~/.ssh/known_hosts file. If the file has only one entry, simply remove it. If the file has multiple entries, make a backup of the file, then delete one entry at a time until you find the "bad" one.

### Missing directories on the remote Website or server

Review the [Allsky Website installation instructions](../website.md) or the [Remote server installation instructions](../server.md)  to determine how to create the necessary directories.