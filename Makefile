platform = armv7

#INCLIB = /usr/local/include
#LDLIB = /usr/local/lib
OPENCV = $(shell pkg-config --cflags opencv) $(shell pkg-config --libs opencv)
USB =  -I libusb/ -L libusb/  
LIBSPATH = -L../lib/$(platform) -I../include
DEFS = -D_LIN -D_DEBUG 

CFLAGS = -Wall -g  -I $(INCLIB) -L $(LDLIB) $(DEFS) $(COMMON) $(LIBSPATH)  -lpthread  $(USB) -DGLIBC_20

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

all:capture startrails keogram

capture:capture.cpp
	$(CC)  capture.cpp -o capture $(CFLAGS) $(OPENCV) -lASICamera2	

startrails:startrails.cpp
	$(CC)  startrails.cpp -o startrails $(CFLAGS) $(OPENCV)

keogram:keogram.cpp
	$(CC)  keogram.cpp -o keogram $(CFLAGS) $(OPENCV)

clean:
	rm -f capture startrails keogram
#pkg-config libusb-1.0 --cflags --libs
#pkg-config opencv --cflags --libs

