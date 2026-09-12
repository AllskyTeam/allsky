Please install opencv2 at first, for example under Linux x86 OS, run:
make platform=x86
Below options is supported:
x86(Linux 32-bit)
x64(Linux 64-bit)
armv5
armv6
armv7
armv8
mac32
mac64
mac(32-bit and 64-bit)

If libASICamera2.so or (.dylib) can't be found at run time, resolve by delow two ways:
1.Add a .conf file that contains the path of the library to /etc/ld.so.conf.d/, run ldconfig.
2.Add compile option -Wl,-rpath=<library path>
