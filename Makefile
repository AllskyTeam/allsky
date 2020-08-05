platform = $(shell uname -m)

USB=$(shell pkg-config --cflags libusb-1.0) $(shell pkg-config --libs libusb-1.0)
DEFS = -D_LIN -D_DEBUG 

ifeq ($(platform), armv6l)
OPENCV = $(shell pkg-config --cflags opencv) $(shell pkg-config --libs opencv)
CC = arm-linux-gnueabihf-g++
AR= arm-linux-gnueabihf-ar
CFLAGS += -march=armv6
CFLAGS += -lrt
ZWOSDK = -Llib/armv6 -I./include
endif

ifeq ($(platform), armv7l)
OPENCV = $(shell pkg-config --cflags opencv) $(shell pkg-config --libs opencv)
CC = arm-linux-gnueabihf-g++
AR= arm-linux-gnueabihf-ar
CFLAGS += -march=armv7 -mthumb
ZWOSDK = -Llib/armv7 -I./include
endif

#Ubuntu has opencv4, not opencv2
ifeq ($(platform), x86_64)
OPENCV = $(shell pkg-config --cflags opencv4) $(shell pkg-config --libs opencv4)
CC = g++
AR= ar
#At least on Ubuntu 20 x86_64 the c++ (.hpp) headers don't define all the constsants I need
DEFS += -DOPENCV_C_HEADERS
ZWOSDK = -Llib/x64 -I./include
endif

ifeq ($(platform), i386) # FIXME: is this correct?
OPENCV = $(shell pkg-config --cflags opencv4) $(shell pkg-config --libs opencv4)
CC = g++
AR= ar
DEFS += -DOPENCV_C_HEADERS
ZWOSDK = -Llib/x86 -I./include
endif

CFLAGS = -Wall -Wno-psabi -g $(DEFS) $(COMMON) $(ZWOSDK) -lpthread  -DGLIBC_20

all:capture startrails keogram sunwait-remove-precompiled sunwait

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

startrails:startrails.cpp
	$(CC)  startrails.cpp -o startrails $(CFLAGS) $(OPENCV)

keogram:keogram.cpp
	$(CC)  keogram.cpp -o keogram $(CFLAGS) $(OPENCV)

clean:
	rm -f capture startrails keogram
