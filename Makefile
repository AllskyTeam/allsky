platform = $(shell uname -m)

USB=$(shell pkg-config --cflags libusb-1.0) $(shell pkg-config --libs libusb-1.0)
DEFS = -D_LIN -D_DEBUG -DGLIBC_20
CFLAGS = -Wall -Wno-psabi -g -O2 -lpthread

ifeq ($(platform), armv6l)
OPENCV = $(shell pkg-config --cflags opencv) $(shell pkg-config --libs opencv)
CC = arm-linux-gnueabihf-g++
AR= arm-linux-gnueabihf-ar
CFLAGS += -march=armv6
CFLAGS += -lrt
ZWOSDK = -Llib/armv6 -I./include
endif

ifeq ($(platform), armv7l)
# Some distributions may need to use opencv4 and -DOPENCV_C_HEADERS as is done for x86_64
OPENCV = $(shell pkg-config --cflags opencv4) $(shell pkg-config --libs opencv4)
DEFS += -DOPENCV_C_HEADERS
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

CFLAGS += $(DEFS) $(ZWOSDK)

all:capture capture_RPiHQ startrails keogram multi_out sunwait-remove-precompiled sunwait

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

multi_out:multi_out.cpp
	$(CC)  multi_out.cpp -o multi_out $(CFLAGS) $(OPENCV)

clean:
	rm -f capture capture_RPiHQ startrails keogram
