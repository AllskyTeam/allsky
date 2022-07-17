#pragma once

#define DEFAULT_MEAN_P0			 5.0
#define DEFAULT_MEAN_P1			20.0
#define DEFAULT_MEAN_P2			45.0
#define DEFAULT_MEAN_THRESHOLD	 0.1	// mean brightness must be within this percent to be "ok"

typedef enum {
	// defined exposure and gain is used
	MEAN_AUTO_OFF = 0,

	// changes exposure between 1 us and defined exposure, and gain between 1 and defined gain
	MEAN_AUTO,

	// changes exposure between 1 us and defined exposure, and defined gain is used
	MEAN_AUTO_EXPOSURE_ONLY,

	// changes gain between 1 and defined gain, and defined exposure is used
	MEAN_AUTO_GAIN_ONLY
} MEAN_AUTO_MODE;

struct modeMeanSetting {
	bool modeMean = false;					// Activate mode mean.  User can change this.
	MEAN_AUTO_MODE meanAuto = MEAN_AUTO_OFF; // Different modes are available - see MEAN_AUTO_MODE.
	bool init = true;						// Set some settings before first calculation.
											// This is set to "false" after calculation.
	double exposureLevelMin	= NOT_SET;		// Set during initialization.
	double exposureLevelMax	= NOT_SET;		// Set during initialization.
	double minGain = NOT_SET;				// Set during initialization.
	double maxGain = NOT_SET;				// Set during initialization.
	int maxExposure_us = NOT_SET;			// Set during initialization.
	int minExposure_us = NOT_SET;			// Set during initialization.
	double meanValue = NOT_SET;				// Default mean value for well exposed images.
	double nightMean = DEFAULT_NIGHTMEAN;	// Default mean value for nighttime images.  User can change.
	double dayMean = DEFAULT_DAYMEAN;		// Default mean value for daytime images.  User can change.
	double mean_threshold = DEFAULT_MEAN_THRESHOLD;	// threshold value.
	double const shuttersteps = 6.0;		// shuttersteps
	int const historySize = 3;				// Number of last images for mean target calculation.
	int quickstart = 10;					// Shorten delay between captures for this many images.
											// to help get us to a good exposure quicker.
	int exposureLevel = NOT_SET;			// current ExposureLevel.
	double mean_p0 = DEFAULT_MEAN_P0;		// ExposureChange (Steps) = p0 + p1 * diff + (p2*diff)^2
	double mean_p1 = DEFAULT_MEAN_P1;
	double mean_p2 = DEFAULT_MEAN_P2;
};

bool aegInit(config, int, double, raspistillSetting &, modeMeanSetting &);
float aegCalcMean(cv::Mat);
void aegGetNextExposureSettings(double, int, double, raspistillSetting &, modeMeanSetting &)
