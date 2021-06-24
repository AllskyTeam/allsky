//
// mode_RPiHQ_mean.h
//
// 2021-06-06  initial state
//

#ifndef MEAN_H
#define MEAN_H

void RPiHQcalcMean(const char* fileName, int asiExposure, double asiGain, double mean_value, double mean_threshold, double mean_shuttersteps, double& ExposureTime, int& Reinforcement);

#endif
