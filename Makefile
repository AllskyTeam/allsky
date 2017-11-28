platform = armv7

#INCLIB = /usr/local/include
#LDLIB = /usr/local/lib
OPENCV = $(shell pkg-config --cflags opencv) $(shell pkg-config --libs opencv)
USB =  -I libusb/ -L libusb/  
LIBSPATH = -L../lib/$(platform) -I../include
DEFS = -D_LIN -D_DEBUG 

CFLAGS = -g  -I $(INCLIB) -L $(LDLIB) $(DEFS) $(COMMON) $(LIBSPATH)  -lpthread  $(USB) -DGLIBC_20

ifeq ($(platform), armv6)
CC = arm-linux-gnueabihf-g++
AR= arm-linux-gnueabihf-ar
CFLAGS += -march=armv6
CFLAGS += -lrt
endif

ifeq ($(platform), armv7)
CC = arm-linux-gnueabihf-g++
AR= arm-linux-gnueabihf-ar
CFLAGS += -march=armv7 -mthumb
endif

all:capture

capture:capture.cpp
	$(CC)  capture.cpp -o capture $(CFLAGS) $(OPENCV) -lASICamera2	

clean:
	rm -f capture
#pkg-config libusb-1.0 --cflags --libs
#pkg-config opencv --cflags --libs

