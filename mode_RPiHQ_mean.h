//
// mode_RPiHQ_mean.h
//
// 2021-06-06  initial state
//


#ifndef MEAN_H
#define MEAN_H

#include "RPiHQ_raspistill.h"

//user defined mode "mean"
bool mode_mean    = false;
double mean_value    = 0.3;
double mean_threshold = 0.05;
double mean_shuttersteps = 6.0;
double mean_fastforward = 4.0;
int mean_longplay = 0;
int mean_brightnessControl = 0;
int mean_historySize = 3;
double mean_Kp = 1.0;
int mean_maskHorizon = 0;
int mean_info = 0;

void RPiHQcalcMean(const char* fileName, int asiExposure, double asiGain, double mean_value, double mean_threshold, double mean_shuttersteps, double mean_fastforward, int mean_brightnessControl,  int asiBrightness, int mean_historySize, double Kp, raspistillSetting &currentRaspistillSetting);
void RPiHQmask(const char* fileName);

#endif
