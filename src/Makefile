platform = $(shell uname -m)
prefix = /

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
ifneq ($(shell id -u), 0)
	$(error Please run \'sudo make install\')
else
	@echo `date +%F\ %R:%S` Starting install...
	@chmod 755 ../allsky.sh ../scripts/*.sh
	@echo `date +%F\ %R:%S` Setting up udev rules...
	@install -D -m 0644 ../config_repo/asi.rules /etc/udev/rules.d/
	@udevadm control -R
	@echo `date +%F\ %R:%S` Setting allsky to auto start...
ifneq ($(wildcard /etc/xdg/lxsession/LXDE-pi/autostart),)
	@sed -i '/allsky.sh/d' /etc/xdg/lxsession/LXDE-pi/autostart
endif
	@sed -i "s|User=pi|User=$(SUDO_USER)|g" ../config_repo/allsky.service
	@sed -i "s|/home/pi/allsky|$(PDIR)|g" ../config_repo/allsky.service
	@install -m 0644 ../config_repo/allsky.service /etc/systemd/system/
ifneq ($(wildcard /lib/systemd/system/allsky.service),)
	@rm -f /lib/systemd/system/allsky.service
endif
	@systemctl daemon-reload
	@systemctl enable allsky
	@echo `date +%F\ %R:%S` Setting up logging...
	@install -D -m 0644 ../config_repo/allsky.logrotate /etc/logrotate.d/allsky
	@install -D -m 0644 ../config_repo/allsky.rsyslog /etc/rsyslog.d/allsky.conf
	@echo `date +%F\ %R:%S` Setting up home environment variable...
	@echo "export ALLSKY_HOME=$(PDIR)" > /etc/profile.d/allsky.sh
ifeq ($(wildcard ../settings_ZWO.json),)
	@echo `date +%F\ %R:%S` Copying default settings_ZWO.json
	@install -m 0644 -o $(SUDO_USER) -g $(SUDO_USER) ../config_repo/settings_ZWO.json.repo ../settings_ZWO.json
endif
ifeq ($(wildcard ../settings_RPiHQ.json),)
	@echo `date +%F\ %R:%S` Copying default settings_RPiHQ.json
	@install -m 0644 -o $(SUDO_USER) -g $(SUDO_USER) ../config_repo/settings_RPiHQ.json.repo settings_RPiHQ.json
endif
ifeq ($(wildcard ../config.sh),)
	@echo `date +%F\ %R:%S` Copying default config.sh
	@install -m 0644 -o $(SUDO_USER) -g $(SUDO_USER) ../config_repo/config.sh.repo ../config.sh
endif
ifeq ($(wildcard ../variables.sh),)
	@echo `date +%F\ %R:%S` Copying default config.sh
	@install -m 0644 -o $(SUDO_USER) -g $(SUDO_USER) ../config_repo/variables.sh.repo ../variables.sh
endif
ifeq ($(wildcard ../scripts/ftp-settings.sh),)
	@echo `date +%F\ %R:%S` Copying default ftp-settings.sh
	@install -m 0644 -o $(SUDO_USER) -g $(SUDO_USER) ../scripts/ftp-settings.sh.repo ../scripts/ftp-settings.sh
endif
	@echo `date +%F\ %R:%S` Copying binaries...
	@install -o $(SUDO_USER) -g $(SUDO_USER) capture ../
	@install -o $(SUDO_USER) -g $(SUDO_USER) keogram ../
	@install -o $(SUDO_USER) -g $(SUDO_USER) startrails ../
	@install sunwait /usr/local/bin/

	@echo `date +%F\ %R:%S` Setting directory permissions...
	@chown $(SUDO_USER):$(SUDO_USER) ./
	@echo ""
	@echo ""
	@echo `date +%F\ %R:%S` It is recommended to reboot now, please issue \'sudo reboot\'
	@echo ""
	@echo ""
endif # sudo / root check

clean:
	rm -f capture capture_RPiHQ startrails keogram

endif # Correct directory structure check
