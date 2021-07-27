//
// RPiHQ_raspistill.h
//
// 2021-07-27  initial state
//
// https://www.raspberrypi.org/documentation/raspbian/applications/camera.md

#ifndef RPIHQ_RASPISTILL_H
#define RPIHQ_RASPISTILL_H

struct raspistillSetting {
 int analoggain = 1;            // Sets the analog gain value directly on the sensor
 int shutter = 1*1000*10000;    // Sets the shutter open time to the specified value (in microseconds).
 int brightness = 50;           // Sets the brightness of the image. 50 is the default. 0 is black, 100 is white.
};

#endif
