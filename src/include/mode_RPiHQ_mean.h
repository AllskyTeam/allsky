//
// mode_RPiHQ_mean.h
//
// 2022-01-14  MEAN_AUTO_MODE, depending in autoGain and autoExposure different modes are in use  
//             new optional start parameter -mean-value-day
//
// 2021-06-06  initial state
//

#pragma once

typedef enum {
	MEAN_AUTO_OFF = 0, // defined exposure and gain is used 
	MEAN_AUTO, // changes exposure between 1us and defined exposure, and gain between 1 and defined gain
	MEAN_AUTO_EXPOSURE_ONLY, // changes exposure between 1us and defined exposure, and defined gain is used   
	MEAN_AUTO_GAIN_ONLY // changes gain between 1 and defined gain, and defined exposureis used
} MEAN_AUTO_MODE;

struct modeMeanSetting {
	bool mode_mean = false;	// Activate mode mean.  User can change this.
	MEAN_AUTO_MODE mean_auto = MEAN_AUTO_OFF; // different modes are available
	bool init = true;		// Set some settings before first calculation.
											// This is set to "false" after calculation.
	double ExposureLevelMin	= - 1;		// Set during first calculation.
	double ExposureLevelMax	= 1; 		// Set during first calculation.
	double mean_value		= 0.3;		// mean value for well exposed images
	double nightMean	= 0.3;		// mean value for well exposed images (night)
	double dayMean	= -1.0;		// mean value for well exposed images (day)
	double mean_threshold	= 0.01;		// threshold value
	double shuttersteps		= 6.0;		// shuttersteps
	int historySize			= 3;		// Use this many last images for mean target calculation
	int quickstart			= 10;		// Shorten delay between captures for this many images
										// to help get us to a good exposure quicker.
	int ExposureLevel		= 1;		// current ExposureLevel 
	double mean_p0			= 5.0;		// ExposureChange (Steps) = p0 + p1 * diff + (p2*diff)^2
	double mean_p1			= 20.0;
	double mean_p2			= 45.0;
};

void RPiHQInit(bool autoExposure, int exposure_us, bool autoGain, double gain, raspistillSetting &currentRaspistillSetting, modeMeanSetting &currentModeMeanSetting);
float RPiHQcalcMean(cv::Mat, int, double, raspistillSetting &, modeMeanSetting &);
double get_focus_metric(cv::Mat);
