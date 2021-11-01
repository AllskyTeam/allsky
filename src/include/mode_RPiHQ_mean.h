//
// mode_RPiHQ_mean.h
//
// 2021-06-06  initial state
//


#ifndef MEAN_H
#define MEAN_H

struct modeMeanSetting {
    bool mode_mean       = false;   // activate mode mean
    double mean_value    = 0.3;     // mean value for well exposed images
    double mean_threshold = 0.02;   // threshold value
    double shuttersteps = 6.0;      // shuttersteps
    double fastforward = 4.0;       // magic number for fastforward  [0...10]
    int historySize = 3;            // use the last images for mean calculation
    int info = 0;                   // show some debug infos
    int quickstart = 10;            // Sets the quickstart. Deactivate delay between captures for quickstart times.
    // some other values
    int ExposureLevel = 1;  // current ExposureLevel 

    //int maskHorizon = 0;            //
    //int longplay = 0;               // make delay between captures 
    //int brightnessControl = 0;      //
};

//user defined mode "mean"
/*bool mode_mean    = false;
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
*/

void RPiHQcalcMean(const char* fileName, int asiExposure, double asiGain, raspistillSetting &currentRaspistillSetting, modeMeanSetting &currentModeMeanSetting);
//void RPiHQmask(const char* fileName);

#endif
