arch = $(shell dpkg --print-architecture)
platform = $(shell uname -m)

bindir = /usr/bin

PDIR = $(shell dirname "$$PWD")
MYDIR = $(shell basename "$$PWD")
ALLSKYBIN = ../bin

.DEFAULT_GOAL := all

ROOTCHECK=$(shell id -u)

PKGPATH=$(shell which pkg-config)
ifneq ($(PKGPATH),)
  USB = $(shell pkg-config --exists libusb-1.0 && pkg-config --cflags --libs libusb-1.0)
  OPENCV = $(shell pkg-config --exists opencv && pkg-config --cflags --libs opencv || (pkg-config --exists opencv4 && pkg-config --cflags --libs opencv4))
endif

DEFS = -D_LIN -D_DEBUG -DGLIBC_20
CFLAGS = -Werror -Wall -Wno-psabi -Wno-unused-result -g -O2 -lpthread -pthread

# Starting with the Feb 2023 Bullseye release, both 32- and 64-bit return
# $(platform) of "aarch64" on 64-bit hardware so we need to check $(arch),
# which returns "armhf" on 32-bit OS and "armhf" on 64-bit OS.
# Ditto i386 arch vs x86_64 platform.

ifeq ($(platform), armv6l)
  CC = arm-linux-gnueabihf-g++
  AR= arm-linux-gnueabihf-ar
  CFLAGS += -march=armv6
  CFLAGS += -lrt
  ZWOSDK = -Llib/armv6 -I./include
else ifeq ($(arch), i386)
  CC = g++
  AR= ar
  ZWOSDK = -Llib/x86 -I./include
else ifeq ($(platform), x86_64)
  CC = g++
  AR= ar
  ZWOSDK = -Llib/x64 -I./include
else ifeq ($(arch), arm64)
	# Ubuntu 20.04 added by Jos Wennmacker.
  CC = g++
  AR= ar
  ZWOSDK = -Llib/armv8 -I./include
else ifeq ($(arch), armhf)
  CC = arm-linux-gnueabihf-g++
  AR= arm-linux-gnueabihf-ar
  ZWOSDK = -Llib/armv7 -I./include
else		# $(platform) = armv7l or $(arch) = armhf
  CC = arm-linux-gnueabihf-g++
  AR= arm-linux-gnueabihf-ar
  CFLAGS += -march=armv7 -mthumb
  ZWOSDK = -Llib/armv7 -I./include
endif


ifeq (,$(CC))
  $(warning Could not identify the proper compiler for your platform.)
  $(error Unknown platform $(platform))
endif

CFLAGS += $(DEFS) $(ZWOSDK)

all: check_deps capture_ZWO capture_RPi startrails keogram sunwait uhubctl
.PHONY : all

check_deps:
ifeq (,$(USB))
	  $(error Did not find USB Libraries, try 'sudo make deps')
endif
ifeq (,$(OPENCV))
	  $(error Did not find any OpenCV Libraries, try 'sudo make deps')
endif
.PHONY : check_deps

sunwait:
	@echo `date +%F\ %R:%S` Building sunwait...
	@git submodule init
	@git submodule update	
	@$(MAKE) -C sunwait-src
	@cp sunwait-src/sunwait .
	@echo `date +%F\ %R:%S` Done.

# This is only needed for GitHub to compile.  install.sh will fail on GitHub.
include/allsky_common.h: include/allsky_common.h.repo
	@echo creating fake $@ ...
	@../install.sh --function update_allsky_common >/dev/null 2>&1 || sed -e 's/XX.*XX/1/' include/allsky_common.h.repo > $@

allsky_common.o: allsky_common.cpp include/allsky_common.h
	@echo Building $@ ...
	@$(CC) -c  allsky_common.cpp -o $@ $(CFLAGS) $(OPENCV)

mode_mean.o: mode_mean.cpp include/mode_mean.h include/allsky_common.h
	@echo Building $@ ...
	@$(CC) -c  mode_mean.cpp -o $@ $(CFLAGS) $(OPENCV)

capture_RPi.o: capture_RPi.cpp ASI_functions.cpp include/mode_mean.h include/allsky_common.h
	@echo Building $@ ...
	@$(CC) -c  capture_RPi.cpp -o $@ $(CFLAGS) $(OPENCV)

capture_ZWO.o: capture_ZWO.cpp ASI_functions.cpp include/allsky_common.h
	@echo Building $@ ...
	@$(CC) -c capture_ZWO.cpp -o $@ $(CFLAGS) $(OPENCV)

capture_ZWO: capture_ZWO.o allsky_common.o
	@echo `date +%F\ %R:%S` Building $@ program...
	@$(CC) -o $@ $(CFLAGS)  capture_ZWO.o allsky_common.o $(OPENCV) -lASICamera2 $(USB)
	@echo `date +%F\ %R:%S` Done.

capture_RPi: capture_RPi.o allsky_common.o mode_mean.o
	@echo `date +%F\ %R:%S` Building $@ program...
	@$(CC) -o $@ $(CFLAGS) capture_RPi.o allsky_common.o $(OPENCV) mode_mean.o
	@echo `date +%F\ %R:%S` Done.

keogram: keogram.cpp
	@echo `date +%F\ %R:%S` Building $@ program...
	@$(CC) $@.cpp -o $@ $(CFLAGS) $(OPENCV)
	@echo `date +%F\ %R:%S` Done.

startrails: startrails.cpp
	@echo `date +%F\ %R:%S` Building $@ program...
	@$(CC) $@.cpp -o $@ $(CFLAGS) $(OPENCV)
	@echo `date +%F\ %R:%S` Done.

uhubctl: uhubctl.c
	@echo `date +%F\ %R:%S` Building $@ program...
# This comes from the uhubctl Makefile:
	@cc -g -O0 -Wall -Wextra -std=c99 -pedantic -DPROGRAM_VERSION=\"2.5.0\" -I/usr/include/libusb-1.0 $@.c -o $@ -Wl,-zrelro,-znow -lusb-1.0
	@echo `date +%F\ %R:%S` Done.

ifneq ($(ROOTCHECK), 0)
deps install uninstall:
	@echo "This must be run with root permissions."
	@echo "Please run 'sudo make $@'."
else
deps:
	@echo "`date +%F\ %R:%S` Installing build dependencies..."
	@apt -y install libopencv-dev libusb-dev libusb-1.0-0-dev

install:
	@echo "`date +%F\ %R:%S` Copying binaries..."
	@if [ ! -e $(ALLSKYBIN) ]; then mkdir -p $(ALLSKYBIN); chown ${SUDO_USER}:${SUDO_USER} ${ALLSKYBIN}; fi
	@install -o $(SUDO_USER) -g $(SUDO_USER) capture_ZWO $(ALLSKYBIN)/
	@install -o $(SUDO_USER) -g $(SUDO_USER) capture_RPi $(ALLSKYBIN)/
	@install -o $(SUDO_USER) -g $(SUDO_USER) keogram $(ALLSKYBIN)/
	@install -o $(SUDO_USER) -g $(SUDO_USER) startrails $(ALLSKYBIN)/
	@install -o $(SUDO_USER) -g $(SUDO_USER) uhubctl $(ALLSKYBIN)/
	@install sunwait $(bindir)

uninstall:
	@echo "`date +%F\ %R:%S` Removing binaries..."
	@rm -f $(ALLSKYBIN)/capture_ZWO
	@rm -f $(ALLSKYBIN)/capture_RPi
	@rm -f $(ALLSKYBIN)/keogram
	@rm -f $(ALLSKYBIN)/startrails
	@rm -f $(ALLSKYBIN)/uhubctl

endif # sudo / root check
.PHONY : deps install uninstall

clean:
	rm -f capture_ZWO capture_RPi startrails keogram sunwait uhubctl *.o *.a
.PHONY : clean

%:
	@echo "`date +%F\ %R:%S` nothing to do for $@"
