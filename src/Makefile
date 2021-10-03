platform = $(shell uname -m)
prefix = 

sysconfdir = ${prefix}/etc
exec_prefix = /usr
bindir = ${exec_prefix}/bin
libexecdir = ${exec_prefix}/libexec/allsky
sharedir = ${exec_prefix}/share/allsky

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

ROOTCHECK=$(shell id -u)
ifneq ($(ROOTCHECK),0)
  ifeq ($(PKGBUILD),1)
    ROOTCHECK=0
  endif
endif

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
ifneq ($(ROOTCHECK), 0)
	@echo This must be ran with root permissions.
	@echo Please run \'sudo make install\'
else
	@echo `date +%F\ %R:%S` Copying binaries...
	@if [ $(PKGBUILD) -eq 1 ]; then \
	  [ ! -e $(DESTDIR)$(bindir) ] && mkdir -p $(DESTDIR)$(bindir); \
    install capture $(DESTDIR)$(bindir); \
	  install keogram $(DESTDIR)$(bindir); \
	  install startrails $(DESTDIR)$(bindir); \
	else \
	  install -o $(SUDO_USER) -g $(SUDO_USER) capture ../; \
	  install -o $(SUDO_USER) -g $(SUDO_USER) keogram ../; \
	  install -o $(SUDO_USER) -g $(SUDO_USER) startrails ../; \
	fi
	@install sunwait $(DESTDIR)$(bindir)
endif # sudo / root check

clean:
	rm -f capture capture_RPiHQ startrails keogram *.o

endif # Correct directory structure check