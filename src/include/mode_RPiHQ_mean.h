//
// mode_RPiHQ_mean.h
//
// 2021-06-06  initial state
//


#ifndef MEAN_H
#define MEAN_H

struct modeMeanSetting {
    bool mode_mean = false;   // activate mode mean
    bool init = true;   // set some settin before first calculation
	double ExposureLevelMax = 1; 
	double ExposureLevelMin = - 1;
    double mean_value    = 0.3;     // mean value for well exposed images
    double mean_threshold = 0.001;   // threshold value
    double shuttersteps = 6.0;      // shuttersteps
    int historySize = 3;            // use the last images for mean calculation
    int debugLevel = 0;             // show some debug infos
    int quickstart = 10;            // Sets the quickstart. Deactivate delay between captures for quickstart times.
    int ExposureLevel = 1;          // current ExposureLevel 
    double mean_p0    = 5.0;        // ExposureChange (Steps) = p0 + p1 * diff + (p2*diff)^2
    double mean_p1    = 20.0;
    double mean_p2    = 45.0;
    //int maskHorizon = 0;            //
    //int longplay = 0;               // make delay between captures 
    //int brightnessControl = 0;      //
};


void RPiHQcalcMean(const char* fileName, int asiExposure, double asiGain, raspistillSetting &currentRaspistillSetting, modeMeanSetting &currentModeMeanSetting);
//void RPiHQmask(const char* fileName);

#endif
