#!/bin/bash

# This script is (more than a bit of) a hack to reduce sdcard writes by using
# tmpfs overlaid upon the allsky directory. It does not appear possible to do
# this purely with /etc/fstab because overlayfs requires two state directories
# (upper and work) which can't be prepopulated upon creation of the underlying
# tmpfs.
#
# In this case, the approach is to put the real allsky source code "off to the
# side" while the runtime goes into a disposable tempfs. It's not necessary to
# do so if allsky has been fully configured and will not need reconfiguration,
# but having a non-overlaid source tree allows for persistent changes without
# having to remount the overlayfs
# 
# This assumes that an entire storage device will be used exclusively for
# image storage by allsky.

#CONFIGURED=yes

if [ "x$CONFIGURED" != "xyes" ] ; then
	echo "Please edit this script to configure it for your system."
	echo "Once this is done, uncomment 'CONFIGURED=yes'"
	exit 1
fi

# The actual allsky source tree
ALLSKY=${ALLSKY:-/home/allsky-src}

# The running directory, will be overlaid by a tmpfs to grab the writes
ALLSKY_RUN=${ALLSKY_RUN:-/home/allsky}

# set these to the user running allsky. Pi, dietpi, root, yourself - doesn't
# really matter as long as the user will have permission to write to the image
# directory
ALLSKY_USER=${ALLSKY_USER:-allsky}
ALLSKY_GROUP=${ALLSKY_GROUP:-allsky}

# Configure image storage.
IMAGE_DIR=${ALLSKY_RUN}/images
# Comment out "IMAGE_DEV" if you aren't storing images on a separate device
IMAGE_DEV=${IMAGE_DEV:-/dev/sda1}

# 8M should be big enough for anything. 4MB is plenty for 1280x960 monochrome.
# Turn this down to save memory once you understand your usage patterns.
TMPSIZE=8m

# stick this in /run (another tmpfs) since it's transient
TMPFS=/run/overlayfs/allsky

# make the tempfs for storing the current captures
mkdir -p ${TMPFS}
grep -q "^tmpfs.*${TMPFS}" /proc/mounts || mount -t tmpfs -o rw,nosuid,nodev,noexec,relatime,size=${TMPSIZE},mode=0775 tmpfs ${TMPFS}

#start overlay
mkdir -p ${TMPFS}/work ${TMPFS}/upper
grep -q "^overlay.*${ALLSKY_RUN}" /proc/mounts || mount -t overlay -o rw,lowerdir=${ALLSKY},upperdir=${TMPFS}/upper,workdir=${TMPFS}/work overlay ${ALLSKY_RUN}

# Mount the image directory and make it owned and writable by the user running allsky.
if [ -n "$IMAGE_DEV" ] ; then
	grep -q "^${IMAGE_DEV}.*${IMAGE_DIR}" /proc/mounts || mount -o rw,nosuid,nodev,noexec,relatime ${IMAGE_DEV} ${IMAGE_DIR}
fi
chown "${ALLSKY_USER}:${ALLSKY_USER}" ${IMAGE_DIR} ${IMAGE_DIR}/* 
chmod u+rwX,go-w ${IMAGE_DIR} ${IMAGE_DIR}/* 
echo Done
