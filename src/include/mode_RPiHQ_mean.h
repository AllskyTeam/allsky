//
// mode_RPiHQ_mean.h
//
// 2021-06-06  initial state
//

#pragma once

struct modeMeanSetting {
	bool mode_mean			= false;	// Activate mode mean.  User can change this.
	bool init				= true;		// Set some settings before first calculation.
										// This is set to "false" after calculation.
	double ExposureLevelMin	= - 1;		// Set during first calculation.
	double ExposureLevelMax	= 1; 		// Set during first calculation.
	double mean_value		= 0.3;		// mean value for well exposed images
	double mean_threshold	= 0.01;		// threshold value
	double shuttersteps		= 6.0;		// shuttersteps
	int historySize			= 3;		// Use this many last images for mean target calculation
	int quickstart			= 10;		// Shorten delay between captures for this many images
										// to help get us to a good exposure quicker.
	int ExposureLevel		= 1;		// current ExposureLevel 
	double mean_p0			= 5.0;		// ExposureChange (Steps) = p0 + p1 * diff + (p2*diff)^2
	double mean_p1			= 20.0;
	double mean_p2			= 45.0;
	//int maskHorizon		= 0;
	//int longplay			= 0;		// make delay between captures 
	//int brightnessControl	= 0;
};


float RPiHQcalcMean(cv::Mat, int, double, raspistillSetting &, modeMeanSetting &);
double get_focus_metric(cv::Mat);
