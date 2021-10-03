platform = $(shell uname -m)
prefix = /

sysconfdir = ${prefix}/etc
exec_prefix = /usr
bindir = ${exec_prefix}/bin
libexecdir = ${exec_prefix}/libexec/allsky
libdir = ${prefix}/lib

PDIR = $(shell dirname "$$PWD")
MYDIR = $(shell basename "$$PWD")
NLU = $(shell basename "$(PDIR)")
RIGHTPATH = 1

ifneq (src,$(MYDIR))
  RIGHTPATH = 0
endif
ifneq (allsky,$(NLU))
  RIGHTPATH = 0
endif

ifneq (1,$(RIGHTPATH))
  @echo Unexpected directory structure.
  @echo This should be in allsky/src directory.
else

.DEFAULT_GOAL := all

deps:
ifneq ($(shell id -u), 0)
	@echo This must be ran with root permissions.
	@echo Please run \'sudo make deps\'
else
	@echo `date +%F\ %R:%S` Installing build dependencies...
	@apt update && apt -y install libopencv-dev libusb-dev libusb-1.0-0-dev ffmpeg gawk lftp jq imagemagick
endif

USB=$(shell pkg-config --cflags --libs libusb-1.0)
ifeq (,$(USB))
  $(error Did not find USB Libraries, try 'make deps')
endif

DEFS = -D_LIN -D_DEBUG -DGLIBC_20
CFLAGS = -Wall -Wno-psabi -g -O2 -lpthread
OPENCV = $(shell pkg-config --exists opencv && pkg-config --cflags --libs opencv || (pkg-config --exists opencv4 && pkg-config --cflags --libs opencv4))

ifeq (,$(OPENCV))
  $(error Did not find any OpenCV Libraries, try 'make deps')
endif

ifeq ($(platform), armv6l)
  CC = arm-linux-gnueabihf-g++
  AR= arm-linux-gnueabihf-ar
  CFLAGS += -march=armv6
  CFLAGS += -lrt
  ZWOSDK = -Llib/armv6 -I./include
endif

ifeq ($(platform), armv7l)
  CC = arm-linux-gnueabihf-g++
  AR= arm-linux-gnueabihf-ar
  CFLAGS += -march=armv7 -mthumb
  ZWOSDK = -Llib/armv7 -I./include
endif

#Ubuntu 20.04 added by Jos Wennmacker
ifeq ($(platform), aarch64)
  CC = g++
  AR= ar
  ZWOSDK = -Llib/armv8 -I./include
endif

ifeq ($(platform), x86_64)
  CC = g++
  AR= ar
  ZWOSDK = -Llib/x64 -I./include
endif

ifeq ($(platform), i386)
  CC = g++
  AR= ar
  ZWOSDK = -Llib/x86 -I./include
endif

ifeq (,$(CC))
  $(warning Could not identify the proper compiler for your platform.)
  $(error Unknown platform $(platform))
endif

CFLAGS += $(DEFS) $(ZWOSDK)

all:capture capture_RPiHQ startrails keogram sunwait

sunwait:
	@echo `date +%F\ %R:%S` Initializing sunwait submodule...
	@git submodule init
	@git submodule update
	@echo `date +%F\ %R:%S` Building sunwait...
	@$(MAKE) -C sunwait-src
	@cp sunwait-src/sunwait .
	@echo `date +%F\ %R:%S` Build of sunwait complete.

capture:capture.cpp
	@echo `date +%F\ %R:%S` Building capture program...
	@$(CC)  capture.cpp -o capture $(CFLAGS) $(OPENCV) -lASICamera2 $(USB)
	@echo `date +%F\ %R:%S` Build of capture complete.

capture_RPiHQ:capture_RPiHQ.cpp
	@echo `date +%F\ %R:%S` Building capture_RPiHQ program...
	@$(CC)  capture_RPiHQ.cpp -o capture_RPiHQ $(CFLAGS) $(OPENCV)
	@echo `date +%F\ %R:%S` Build of capture_RPiHQ complete.

startrails:startrails.cpp
	@echo `date +%F\ %R:%S` Building startrails program...
	@$(CC)  startrails.cpp -o startrails $(CFLAGS) $(OPENCV)
	@echo `date +%F\ %R:%S` Build of startrails complete.

keogram:keogram.cpp
	@echo `date +%F\ %R:%S` Building keogram program...
	@$(CC)  keogram.cpp -o keogram $(CFLAGS) $(OPENCV)
	@echo `date +%F\ %R:%S` Build of keogram complete.

install:
	@echo `date +%F\ %R:%S` Copying binaries...
	@install -o $(SUDO_USER) -g $(SUDO_USER) capture $(bindir)
	@install -o $(SUDO_USER) -g $(SUDO_USER) keogram $(bindir)
	@install -o $(SUDO_USER) -g $(SUDO_USER) startrails $(bindir)
	@install sunwait $(bindir)
endif # sudo / root check

pkg-setup:
ifeq ($(shell id -u), 0)
	$(error Please do NOT run as root: Use \'make pkg-setup\')
else
	@echo `date +%F\ %R:%S` Starting pkg-setup...
ifeq ($(wildcard ../BASE),)
	@mkdir ../BASE
	@mkdir -p ../BASE/etc/allsky/scripts
	@mkdir -p ../BASE/etc/udev/rules.d
	@mkdir -p ../BASE/usr/bin
	@mkdir -p ../BASE/lib/systemd/system
endif
	@echo `date +%F\ %R:%S` Copying scripts...
	@install ../allsky.sh ../BASE/usr/bin/
	@install ../scripts/*.sh ../BASE/etc/allsky/scripts/
	@echo `date +%F\ %R:%S` Copying udev rules...
	@install -D -m 0644 ../config_repo/asi.rules ../BASE/etc/udev/rules.d/
	@echo `date +%F\ %R:%S` Copying allsky systemd unit file...
	@install -m 0644 ../config_repo/allsky.service ../BASE/lib/systemd/system/
	@sed -i "s|User=pi|User=allsky|g" ../BASE/lib/systemd/system/allsky.service
	@sed -i "s|/home/pi/allsky|/usr/bin|g" ../BASE/lib/systemd/system/allsky.service
	@echo `date +%F\ %R:%S` Copying logging config...
	@install -D -m 0644 ../config_repo/allsky.logrotate ../BASE/etc/logrotate.d/allsky
	@install -D -m 0644 ../config_repo/allsky.rsyslog ../BASE/etc/rsyslog.d/allsky.conf
	@echo `date +%F\ %R:%S` Setting up home environment variable...
	@echo "export ALLSKY_HOME=/etc/allsky" > ../BASE/etc/profile.d/allsky.sh
	@echo `date +%F\ %R:%S` Copying default settings_ZWO.json
	@install -m 0644 ../config_repo/settings_ZWO.json.repo ../BASE/etc/allsky/settings_ZWO.json
	@echo `date +%F\ %R:%S` Copying default settings_RPiHQ.json
	@install -m 0644 ../config_repo/settings_RPiHQ.json.repo ../BASE/etc/allsky/settings_RPiHQ.json
	@echo `date +%F\ %R:%S` Copying default config.sh
	@install -m 0644 ../config_repo/config.sh.repo ../BASE/etc/allsky/config.sh
	@echo `date +%F\ %R:%S` Copying default variables.sh
	@install -m 0644 ../config_repo/variables.sh.repo ../BASE/etc/allsky/variables.sh
	@echo `date +%F\ %R:%S` Copying default ftp-settings.sh
	@install -m 0644 ../scripts/ftp-settings.sh.repo ../BASE/etc/allsky/scripts/ftp-settings.sh
	@echo `date +%F\ %R:%S` Copying binaries...
	@install capture ../BASE/usr/bin/
	@install keogram ../BASE/usr/bin/
	@install startrails ../BASE/usr/bin/
	@install sunwait ../BASE/usr/bin/

	@echo `date +%F\ %R:%S` Setting directory permissions...
	@chown $(SUDO_USER):$(SUDO_USER) ./
	@echo ""
	@echo ""
	@echo `date +%F\ %R:%S` It is recommended to reboot now, please issue \'sudo reboot\'
	@echo ""
	@echo ""


clean:
	rm -f capture capture_RPiHQ startrails keogram

endif # Correct directory structure check