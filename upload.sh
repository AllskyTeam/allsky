echo "Resizing\n";
convert "$1-full.jpg" -resize 962x720 -gravity East -chop 2x0 "$1.jpg";
mkdir -p current;
cp "$1-full.jpg" "current/$1-$(date +'%Y%m%d%H%M%S').jpg";
echo "Uploading\n";
lftp sftp://user:password@host:/path/to/website -e "put $1.jpg; bye"
