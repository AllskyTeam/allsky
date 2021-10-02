platform = $(shell uname -m)

USB=$(shell pkg-config --cflags --libs libusb-1.0)
ifeq (,$(USB))
  $(warning Did not find USB Libraries, you may need to install libusb-1.0-0-dev.)
  $(error Missing dependencies)
endif

DEFS = -D_LIN -D_DEBUG -DGLIBC_20
CFLAGS = -Wall -Wno-psabi -g -O2 -lpthread
OPENCV = $(shell pkg-config --exists opencv && pkg-config --cflags --libs opencv || (pkg-config --exists opencv4 && pkg-config --cflags --libs opencv4))

ifeq (,$(OPENCV))
  $(warning Did not find any OpenCV Libraries, you may need to install libopencv-dev.)
  $(error Missing dependencies)
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

ifeq ($(platform), i386) # FIXME: is this correct?
  CC = g++
  AR= ar
  ZWOSDK = -Llib/x86 -I./include
endif

ifeq (,$(CC))
  $(warning Could not identify the proper compiler for your platform.)
  $(error Unknown platform $(platform))
endif

CFLAGS += $(DEFS) $(ZWOSDK)

all:capture capture_RPiHQ startrails keogram sunwait-remove-precompiled sunwait

sunwait-remove-precompiled:
ifneq ("arm", $(findstring $(platform), "arm"))
	@rm -f sunwait
endif

sunwait:
	git submodule init
	git submodule update
	$(MAKE) -C sunwait-src
	cp sunwait-src/sunwait .

capture:capture.cpp
	$(CC)  capture.cpp -o capture $(CFLAGS) $(OPENCV) -lASICamera2 $(USB)

capture_RPiHQ:capture_RPiHQ.cpp
	$(CC)  capture_RPiHQ.cpp -o capture_RPiHQ $(CFLAGS) $(OPENCV)

startrails:startrails.cpp
	$(CC)  startrails.cpp -o startrails $(CFLAGS) $(OPENCV)

keogram:keogram.cpp
	$(CC)  keogram.cpp -o keogram $(CFLAGS) $(OPENCV)

clean:
	rm -f capture capture_RPiHQ startrails keogram
