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
	bool init				= true;			// Set some settings before first calculation.
											// This is set to "false" after calculation.
	int exposureLevelMin	= NOT_SET;		// Set during initialization.
	int exposureLevelMax	= NOT_SET;		// Set during initialization.
	int exposureLevel		= NOT_SET;		// current ExposureLevel.
	double minGain			= NOT_SET;		// Set during initialization.
	double maxGain			= NOT_SET;		// Set during initialization.
	long maxExposure_us		= NOT_SET;		// Set during initialization.
	long minExposure_us		= NOT_SET;		// Set during initialization.
	double meanValue		= NOT_SET;		// Default mean value for well exposed images.

	// Default mean value for daytime and nighttime images.  User can change.
	double dayMean			= DEFAULT_DAYMEAN;
	double nightMean		= DEFAULT_NIGHTMEAN;
	double mean_threshold	= DEFAULT_MEAN_THRESHOLD;	// threshold value.  User can change.

	double const shuttersteps = 6.0;		// shuttersteps
	int const historySize	= 3;			// Number of last images for mean target calculation.
	double mean_p0 = DEFAULT_MEAN_P0;		// ExposureChange (Steps) = p0 + p1 * diff + (p2*diff)^2
	double mean_p1 = DEFAULT_MEAN_P1;
	double mean_p2 = DEFAULT_MEAN_P2;
};

bool aegInit(config, raspistillSetting &, modeMeanSetting &);
float aegCalcMean(cv::Mat);
void aegGetNextExposureSettings(config *, raspistillSetting &, modeMeanSetting &);
