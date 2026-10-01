Applicable platform:
ubuntu:x86, x64
armv6: raspberry pi
armv5: armv5 Soft-Float
mac os: mac
armv7: raspberry pi2
armv8: arm 64bit

$ sudo install asi.rules /lib/udev/rules.d
or
$ sudo install asi.rules /etc/udev/rules.d
and reconnect camera, then the camera can be opened without root
and run 'cat /sys/module/usbcore/parameters/usbfs_memory_mb' to make sure the result is 200

The version of libusb compiled with is 1.0.19
