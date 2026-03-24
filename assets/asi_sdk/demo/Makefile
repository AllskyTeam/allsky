ver = debug
platform = x86

CC = g++
#INCLIB = /usr/local/include
#LDLIB = /usr/local/lib
OPENCV = -lopencv_core -lopencv_highgui -lopencv_imgproc#$(shell pkg-config --cflags opencv) $(shell pkg-config --libs opencv) -I/usr/include/opencv2
#USB =  -I../libusb/include  -L../libusb/$(platform) -lusb-1.0  



LIBSPATH = -L../lib/$(platform) -I../include



ifeq ($(ver), debug)
DEFS = -D_LIN -D_DEBUG 
CFLAGS = -g  -I $(INCLIB) -L $(LDLIB) $(DEFS) $(COMMON) $(LIBSPATH)  -lpthread  -DGLIBC_20
else
DEFS = -D_LIN 
CFLAGS =  -O3 -I $(INCLIB) -L $(LDLIB) $(DEFS) $(COMMON) $(LIBSPATH)  -lpthread  -DGLIBC_20
endif

ifeq ($(platform), mac32)
CC = g++
CFLAGS += -D_MAC -m32
OPENCV = -lopencv_calib3d -lopencv_contrib -lopencv_core -lopencv_features2d -lopencv_flann -lopencv_highgui -lopencv_imgproc -lopencv_legacy -lopencv_ml -lopencv_objdetect -lopencv_photo -lopencv_stitching -lopencv_ts -lopencv_video -lopencv_videostab -I/usr/local/include/opencv
endif

ifeq ($(platform), mac64)
CC = g++
CFLAGS += -D_MAC -m64
OPENCV = -lopencv_calib3d -lopencv_contrib -lopencv_core -lopencv_features2d -lopencv_flann -lopencv_highgui -lopencv_imgproc -lopencv_legacy -lopencv_ml -lopencv_objdetect -lopencv_photo -lopencv_stitching -lopencv_ts -lopencv_video -lopencv_videostab -I/usr/local/include/opencv
endif

ifeq ($(platform), mac)
CC = g++
CFLAGS += -D_MAC -arch i386 -arch x86_64
OPENCV = -lopencv_calib3d -lopencv_contrib -lopencv_core -lopencv_features2d -lopencv_flann -lopencv_highgui -lopencv_imgproc -lopencv_legacy -lopencv_ml -lopencv_objdetect -lopencv_photo -lopencv_stitching -lopencv_ts -lopencv_video -lopencv_videostab -I/usr/local/include/opencv
endif

ifeq ($(platform), x86)
CFLAGS += -m32
CFLAGS += -lrt
endif


ifeq ($(platform), x64)
CFLAGS += -m64
CFLAGS += -lrt
endif

ifeq ($(platform), armv5)
CC = arm-none-linux-gnueabi-g++
AR= arm-nonelinux-gnueabi-ar
CFLAGS += -march=armv5
CFLAGS += -lrt
endif


ifeq ($(platform), armv6)
CC = arm-bcm2708hardfp-linux-gnueabi-g++
AR= arm-bcm2708hardfp-linux-gnueabi-ar
CFLAGS += -march=armv6
CFLAGS += -lrt
endif

ifeq ($(platform), armv7)
CC = arm-linux-gnueabihf-g++
AR= arm-linux-gnueabihf-ar
CFLAGS += -march=armv7 -mcpu=cortex-m3 -mthumb
endif

ifeq ($(platform), armv8)
DEFS += -D_LIN -D_ARM
CC = aarch64-linux-gnu-g++
AR= aarch64-linux-gnu-ar
endif

#ifeq ($(platform), armhf)
#CC = arm-linux-gnueabihf-g++
#AR= arm-linux-gnueabihf-ar
#CFLAGS += -march=armv5
#LDLIB += -lrt
#endif


all: test_gui2_snap test_gui2_video main_SDK2_video_mac
test_gui2_snap:main_SDK2_snap.cpp
	$(CC)  main_SDK2_snap.cpp -o test_gui2_snap $(CFLAGS) $(OPENCV) -lASICamera2
	cp test_gui2_snap bin/$(platform)/

test_gui2_video:main_SDK2_video.cpp
	$(CC)  main_SDK2_video.cpp -o test_gui2_video $(CFLAGS) $(OPENCV) -lASICamera2
	cp test_gui2_video bin/$(platform)/

main_SDK2_video_mac:main_SDK2_video_mac.cpp
	$(CC)  main_SDK2_video_mac.cpp -o main_SDK2_video_mac $(CFLAGS) -lASICamera2
	cp main_SDK2_video_mac bin/$(platform)/

clean:
	rm -f test_gui2_snap test_gui2_video main_SDK2_video_mac
#pkg-config libusb-1.0 --cflags --libs
#pkg-config opencv --cflags --libs

