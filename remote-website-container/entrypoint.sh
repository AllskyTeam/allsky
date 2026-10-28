#!/bin/sh

# Set default values
export PASV_ADDRESS=${PASV_ADDRESS:-$(curl -s https://api.ipify.org)}
export PASV_MIN_PORT=${PASV_MIN_PORT:-40000}
export PASV_MAX_PORT=${PASV_MAX_PORT:-40010}

# Generate configuration from template
envsubst < /etc/vsftpd/vsftpd.conf.template > /etc/vsftpd/vsftpd.conf

# Set FTP password (for Docker testing)
if [ -n "$FTP_PASSWORD" ]; then
    echo "allsky:$FTP_PASSWORD" | chpasswd
    echo "Using provided FTP password"
else
    echo "allsky:$(openssl rand -base64 12)" | chpasswd
fi

# Ensure default index.html exists if not provided by user
if [ ! -f /var/www/html/index.html ]; then
    cat <<EOF > /var/www/html/index.html
<html>
    <head>
        <title>Allsky Remote Website is Available!</title>
    </head>
    <body>
        <h1>Success! The Allsky Remote Website is Available!</h1>
        <h2>Proceed with Remote Website Installation Script.</h2>
    </body>
</html>
EOF
fi

# Start services
exec supervisord -c /etc/supervisord.conf