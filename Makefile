CC = arm-linux-gnueabihf-g++
#INCLIB = /usr/local/include
#LDLIB = /usr/local/lib
OPENCV = $(shell pkg-config --cflags opencv) $(shell pkg-config --libs opencv)
USB =  -I libusb/ -L libusb/  
LIBSPATH = -L lib/ -I include/
DEFS = -D_LIN -D_DEBUG 
CFLAGS = -g  -I $(INCLIB) -L $(LDLIB) $(DEFS) $(COMMON) $(LIBSPATH)  -lpthread  $(USB) -DGLIBC_20 -march=armv7 -mthumb
AR= arm-linux-gnueabihf-ar 

all:capture

capture:capture.cpp
	$(CC)  capture.cpp -o capture $(CFLAGS) $(OPENCV) -lASICamera2	

clean:
	rm -f capture
#pkg-config libusb-1.0 --cflags --libs
#pkg-config opencv --cflags --libs

