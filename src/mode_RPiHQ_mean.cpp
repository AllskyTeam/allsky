#include <opencv2/core/core.hpp>
#include <opencv2/imgproc/imgproc.hpp>
#include <opencv2/highgui/highgui.hpp>
#include <unistd.h>
#include <string.h>
#include <errno.h>
#include <string>
#include <iomanip>
#include <cstring>
#include <sstream>
#include <iostream>
#include <cstdio>
#include <tr1/memory>
#include <stdlib.h>
#include <signal.h>
#include <fstream>
#include <algorithm>

#include "include/allsky_common.h"

#include "include/RPiHQ_raspistill.h"
#include "include/mode_RPiHQ_mean.h"

// These only need to be as large as modeMeanSetting.historySize.
const int historySize = 5;
double meanHistory [historySize];
int exposureLevelHistory [historySize];

int MeanCnt				= 0;		// how many means have we calculated?
double dMean			= 1.0;		// Mean(n-1)-Mean(n): prior mean minus current mean
int dExp				= 1.0;		// Exp(n-1)-Exp(n):   prior exposure minus current exposure
int lastExposureChange	= 0;
int dExposureChange		= 0;
bool fastforward		= false;


int calcExposureLevel(int exposure_us, double gain, modeMeanSetting &currentModeMeanSetting)
{
	return log(gain  * exposure_us/(double)US_IN_SEC) / log (2.0) * pow(currentModeMeanSetting.shuttersteps,2.0);
}

double calcExposureTimeEff (int exposureLevel, modeMeanSetting &currentModeMeanSetting)
{
	return pow(2.0, double(exposureLevel)/pow(currentModeMeanSetting.shuttersteps,2.0));
}

// set limits.  aeg == Auto Exposure / Gain
bool aegInit(bool autoExposure, int minExposure_us, int maxExposure_us, int initialExposure_us,
		bool autoGain, double minGain, double maxGain, double initialGain,
		raspistillSetting &currentRaspistillSetting, modeMeanSetting &currentModeMeanSetting)
{
	// Init some values first
	static int initialExposureLevel = 0;
	if (currentModeMeanSetting.init) {
		currentModeMeanSetting.init = false;

		if (historySize < currentModeMeanSetting.historySize) {
			fprintf(stderr, "*** INTERNAL ERROR: historySize (%d) < currentModeMeanSetting.historySize (%d)\n", historySize, currentModeMeanSetting.historySize);
			return false;
		}

// XXXXXX    TODO:  Does this need to be done every change between day and night?
		// first exposure with currentRaspistillSetting.shutter_us, so we have to calculate the startpoint for ExposureLevel
		initialExposureLevel = calcExposureLevel(initialExposure_us, initialGain, currentModeMeanSetting) - 1;
		currentModeMeanSetting.exposureLevel = initialExposureLevel;
		currentRaspistillSetting.shutter_us = initialExposure_us;

		for (int i=0; i < currentModeMeanSetting.historySize; i++) {
			// Pretend like all prior images had the target mean and initial exposure level.
			meanHistory[i] = currentModeMeanSetting.meanValue;
			exposureLevelHistory[i] = initialExposureLevel;
		}
	}

	// check and set meanAuto
	if (autoGain && autoExposure)
		currentModeMeanSetting.meanAuto = MEAN_AUTO;
	else if (autoGain)
		currentModeMeanSetting.meanAuto = MEAN_AUTO_GAIN_ONLY;
	else if (autoExposure)
		currentModeMeanSetting.meanAuto = MEAN_AUTO_EXPOSURE_ONLY;
	else
		currentModeMeanSetting.meanAuto = MEAN_AUTO_OFF;

	// calculate min and max exposurelevels
	if (currentModeMeanSetting.meanAuto == MEAN_AUTO) {
		currentModeMeanSetting.exposureLevelMax = calcExposureLevel(maxExposure_us, maxGain, currentModeMeanSetting) + 1;
		currentModeMeanSetting.exposureLevelMin = calcExposureLevel(minExposure_us, minGain, currentModeMeanSetting) - 1;
	}
	else if (currentModeMeanSetting.meanAuto == MEAN_AUTO_GAIN_ONLY) {
		currentModeMeanSetting.exposureLevelMax = calcExposureLevel(maxExposure_us, maxGain, currentModeMeanSetting) + 1;
		currentModeMeanSetting.exposureLevelMin = calcExposureLevel(maxExposure_us, minGain, currentModeMeanSetting) - 1;
	}
	else if (currentModeMeanSetting.meanAuto == MEAN_AUTO_EXPOSURE_ONLY) {
		currentModeMeanSetting.exposureLevelMax = calcExposureLevel(maxExposure_us, maxGain, currentModeMeanSetting) + 1;
		currentModeMeanSetting.exposureLevelMin = calcExposureLevel(minExposure_us, maxGain, currentModeMeanSetting) - 1;
	}
	else if (currentModeMeanSetting.meanAuto == MEAN_AUTO_OFF) {
		currentModeMeanSetting.exposureLevelMax = calcExposureLevel(maxExposure_us, maxGain, currentModeMeanSetting) + 1;
		currentModeMeanSetting.exposureLevelMin = calcExposureLevel(maxExposure_us, maxGain, currentModeMeanSetting) - 1;
	}
	currentModeMeanSetting.minExposure_us = minExposure_us;
	currentModeMeanSetting.maxExposure_us = maxExposure_us;
	currentModeMeanSetting.minGain = minGain;
	currentModeMeanSetting.maxGain = maxGain;

	Log(3, "  > Valid exposureLevels: %'1.3f to %'1.3f\n", currentModeMeanSetting.exposureLevelMin, currentModeMeanSetting.exposureLevelMax);
	Log(3, "  > Starting:   exposure: %s, gain: %1.3f, exposure level: %d\n", length_in_units(initialExposure_us, true), initialGain, initialExposureLevel);

	return true;
}


// Calculate mean of current image and then new exposure and gain values.
// Algorithm not perfect, but better than no exposure control at all
float aegCalcMean(cv::Mat image, int exposure_us, double gain,
		raspistillSetting &currentRaspistillSetting,
		modeMeanSetting &currentModeMeanSetting)
{
	//Hauptvariablen
	double mean;
	double mean_diff;
	double this_mean;		// mean of current image
	double max_;			// calculate std::max() by itself to make the code easier to read.

	// get old exposureTime_s in seconds
	double exposureTime_s = (double) currentRaspistillSetting.shutter_us/(double)US_IN_SEC;

	// Only create the destination image and mask the first time we're called.
	static cv::Mat mask;
	static bool maskCreated = false;
	if (! maskCreated)
	{
		maskCreated = true;

// TODO: Allow user to specify a mask file
		// Create a circular mask at the center of the image with a radius of 1/3 the height of the image.
		cv::Mat mask = cv::Mat::zeros(image.size(), CV_8U);		// should CV_8U be image.type() ?
		cv::circle(mask, cv::Point(mask.cols/2, mask.rows/2), mask.rows/3, cv::Scalar(255, 255, 255), -1, 8, 0);

		// Copy the source image to destination image with masking.
		cv::Mat dstImage = cv::Mat::zeros(image.size(), CV_8U);
		image.copyTo(dstImage, mask);

#ifdef xxxxxxxx_for_testing
	bool result;
	std::vector<int> compressionParameters;
	compressionParameters.push_back(cv::IMWRITE_JPEG_QUALITY);
	compressionParameters.push_back(95);
	char const *dstImageName = "dstImage.jpg";
	result = cv::imwrite(dstImageName, dstImage, compressionParameters);
	if (! result) fprintf(stderr, "*** ERROR: Unable to write to '%s'\n", dstImageName);
	char const *maskName = "mask.jpg";
	result = cv::imwrite(maskName, mask, compressionParameters);
	if (! result) fprintf(stderr, "*** ERROR: Unable to write to '%s'\n", maskName);
#endif

	}

	cv::Scalar mean_scalar = cv::mean(image, mask);
	switch (image.channels())
	{
		default: // mono case
			mean = mean_scalar.val[0];
			break;
		case 3: // for color use average of the channels
		case 4:
			mean = (mean_scalar[0] + mean_scalar[1] + mean_scalar[2]) / 3.0;
			break;
	}
	// Scale to 0-1 range
	switch (image.depth())
	{
		case CV_8U:
			mean /= 255.0;
			break;
		case CV_16U:
			mean /= 65535.0;
			break;
	}
	this_mean = mean;	// save this image's mean so we can return it

	static int values = 0;
	// "values" will always be the same value for every image so only calculate once.
	// If historySize is 3:
	// i=1 (0+1==1), i=2 (2+1==3), i=3 (3+3==6).  6 += 3 == 9
	if (values == 0) {
		for (int i=1; i <= currentModeMeanSetting.historySize; i++)
			values += i;
		values += currentModeMeanSetting.historySize;
	}

	Log(3, "  > Just got:    shutter_us: %s, mean: %1.3f, target mean: %1.3f, diff (target - mean): %'1.3f, MeanCnt: %d, values: %d\n",
		length_in_units(currentRaspistillSetting.shutter_us, true), this_mean,
		currentModeMeanSetting.meanValue, (currentModeMeanSetting.meanValue - this_mean), MeanCnt, values);

	meanHistory[MeanCnt % currentModeMeanSetting.historySize] = this_mean;

	int idx = (MeanCnt + currentModeMeanSetting.historySize) % currentModeMeanSetting.historySize;
	int idxN1 = (MeanCnt + currentModeMeanSetting.historySize-1) % currentModeMeanSetting.historySize;

	dMean = meanHistory[idx] - meanHistory[idxN1];
	dExp = exposureLevelHistory[idx] - exposureLevelHistory[idxN1];

	// mean_forcast = m_new + diff = m_new + (m_new - m_previous) = (2 * m_new) - m_previous
	// If the previous mean was more than twice as large as the current one, mean_forecast will be negative.
	double mean_forecast = (2.0 * meanHistory[idx]) - meanHistory[idxN1];	// "2.0 *" gives more weight to the current mean
	max_ = std::max(mean_forecast, 0.0);
	mean_forecast = std::min(max_, currentModeMeanSetting.minGain);
	// gleiche Wertigkeit wie aktueller Wert

	// avg of mean history
	mean = 0.0;
	for (int i=1; i <= currentModeMeanSetting.historySize; i++) {
		int ii =  (MeanCnt + i) % currentModeMeanSetting.historySize;
		mean += meanHistory[ii] * (double) i;		// This gives more weight to means later in the history array.
		Log(5, "  > index: %d, meanHistory[]=%1.3f exposureLevelHistory[]=%d, new mean=%1.3f\n", ii, meanHistory[ii], exposureLevelHistory[ii], mean);
	}
	mean += mean_forecast * currentModeMeanSetting.historySize;
	mean /= (double) values;
	mean_diff = abs(mean - currentModeMeanSetting.meanValue);
	Log(3, "  > New mean: %1.3f, mean_forecast: %1.3f, mean_diff (new mean - target mean): %'1.3f, idx=%d, idxN1=%d\n", mean, mean_forecast, mean_diff, idx, idxN1);

	int ExposureChange;

	// fast forward
	if (fastforward || mean_diff > (currentModeMeanSetting.mean_threshold * 2.0)) {
		// We are fairly far off from desired mean.
		ExposureChange = std::max(1.0, currentModeMeanSetting.mean_p0 + (currentModeMeanSetting.mean_p1 * mean_diff) + pow(currentModeMeanSetting.mean_p2 * mean_diff, 2.0));
		Log(4, "  > fast forward ExposureChange now %d (mean_diff=%1.3f > 2*threshold=%1.3f)\n", ExposureChange, mean_diff, currentModeMeanSetting.mean_threshold*2.0);
	}
	// slow forward
	else if (mean_diff > currentModeMeanSetting.mean_threshold) {
		// We are fairly close to desired mean.
		ExposureChange = std::max(1.0, currentModeMeanSetting.mean_p0 + currentModeMeanSetting.mean_p1 * mean_diff);
		Log(4, "  > slow forward ExposureChange now %d (mean_diff=%1.3f, threshold=%1.3f)\n", ExposureChange, mean_diff, currentModeMeanSetting.mean_threshold);
	}
	else {
		ExposureChange = currentModeMeanSetting.shuttersteps / 2;
	}

int const maxChange = 75;		// xxxxx for testing: s/50/75/
	ExposureChange = std::min(maxChange, ExposureChange);			// limit how big of a change we make each time
	dExposureChange = ExposureChange - lastExposureChange;
	lastExposureChange = ExposureChange;

	Log(3, "  > ExposureChange clipped to %d (diff from last change: %d)\n", ExposureChange, dExposureChange);

	bool changeNeeded = false;		// is a change to exposureLevel needed?
// TODO: make mean_threshold a percent instead of an actual value.  This will allow us to use 0 to 100 for what user enters as mean.

// ??????? shouldn't the following check with "mean" use "this_mean" instead?
double meanCheck = this_mean;
	if (meanCheck < (currentModeMeanSetting.meanValue - currentModeMeanSetting.mean_threshold)) {
		// mean too low
		//xxxxx if ((currentRaspistillSetting.analoggain <= gain) || (currentRaspistillSetting.shutter_us <= exposure_us)) {  // obere Grenze durch Gain und shutter
		if ((currentRaspistillSetting.analoggain < currentModeMeanSetting.maxGain) || (currentRaspistillSetting.shutter_us < currentModeMeanSetting.maxExposure_us)) {  // obere Grenze durch Gain und shutter
			changeNeeded = true;
			currentModeMeanSetting.exposureLevel += ExposureChange;
			Log(4, "  >> exposureLevel increased by %d to %d\n", ExposureChange, currentModeMeanSetting.exposureLevel);
		}
		else {
			Log(3, "  >> Already at max gain (%1.3f) and/or max exposure (%s) - can't go any higher!\n", currentModeMeanSetting.maxGain, length_in_units(currentModeMeanSetting.maxExposure_us, true));
		}
	}
	else if (meanCheck > (currentModeMeanSetting.meanValue + currentModeMeanSetting.mean_threshold))  {
		// mean too high
/// xxxxxxx how about minGain?
		if (exposureTime_s > currentModeMeanSetting.minExposure_us / (double)US_IN_SEC) { // untere Grenze durch shuttertime
			changeNeeded = true;
			currentModeMeanSetting.exposureLevel -= ExposureChange;
			Log(4, "  > exposureLevel decreased by %d to %d\n", ExposureChange, currentModeMeanSetting.exposureLevel);
		}
		else {
			Log(3, "  >> Already at min exposure (%'d us) - can't go any lower!\n", currentModeMeanSetting.minExposure_us);
		}
	}
	else {
		Log(4, "  >> Image mean good - no changes needed, mean=%1.3f, target mean=%1.3f threshold=%1.3f +++++++++\n", meanCheck, currentModeMeanSetting.meanValue, currentModeMeanSetting.mean_threshold);
		if (currentModeMeanSetting.quickstart > 0)
			currentModeMeanSetting.quickstart = 0;		// Got a good exposure - turn quickstart off if on
	}

	// Make sure exposureLevel is within min - max range.
	max_ = std::max(currentModeMeanSetting.exposureLevel, (int)currentModeMeanSetting.exposureLevelMin);
	currentModeMeanSetting.exposureLevel = std::min((int)max_, (int)currentModeMeanSetting.exposureLevelMax);
	double exposureTimeEff_s = calcExposureTimeEff(currentModeMeanSetting.exposureLevel, currentModeMeanSetting);

	// fastforward ?
	if ((currentModeMeanSetting.exposureLevel == (int)currentModeMeanSetting.exposureLevelMax) || (currentModeMeanSetting.exposureLevel == (int)currentModeMeanSetting.exposureLevelMin)) {
		fastforward = true;
		Log(4, "  > FF activated\n");
	}
	if (fastforward &&
		(abs(meanHistory[idx] - currentModeMeanSetting.meanValue) < currentModeMeanSetting.mean_threshold) &&
		(abs(meanHistory[idxN1] - currentModeMeanSetting.meanValue) < currentModeMeanSetting.mean_threshold)) {
printf(">>>>>>>>> fastforward=%s\n", fastforward ? "true" : "false");
		fastforward = false;
		Log(4, "  > FF deactivated\n");
	}

	//#############################################################################################################
	// calculate new gain
if (changeNeeded) { // xxxxx===============

// xxxx TODO:  when INCREASING the mean, the gain goes to the max before the exposure increases.
// It should increase exposure, then gain, then exposure, ...

	if (currentModeMeanSetting.meanAuto == MEAN_AUTO || currentModeMeanSetting.meanAuto == MEAN_AUTO_GAIN_ONLY) {
// xxxxxxx ??? "exposure_us" or maxExposure_us or exposureTime_s ?
		max_ = std::max(currentModeMeanSetting.minGain, exposureTimeEff_s / (exposure_us/(double)US_IN_SEC));
		// xxxx  double newGain = std::min(gain, max_);
		double newGain = std::min(currentModeMeanSetting.maxGain, max_);
		if (newGain > currentModeMeanSetting.maxGain) {
			currentRaspistillSetting.analoggain = currentModeMeanSetting.maxGain;
			Log(4, "  >> Setting new analoggain to %1.3f (max value) (newGain was %1.3f)\n", currentRaspistillSetting.analoggain, newGain);
		}
		else if (newGain < currentModeMeanSetting.minGain) {
			currentRaspistillSetting.analoggain = currentModeMeanSetting.minGain;
			Log(4, "  >> Setting new analoggain to %1.3f (min value) (newGain was %1.3f)\n", currentRaspistillSetting.analoggain, newGain);
		}
		else if (currentRaspistillSetting.analoggain != newGain) {
			currentRaspistillSetting.analoggain = newGain;
			Log(4, "  >> Setting new analoggain to %1.3f\n", newGain);
		}
		else {
			char const *isWhat = ((newGain == currentModeMeanSetting.minGain) || (newGain == currentModeMeanSetting.maxGain)) ? "possible" : "needed";
			Log(4, "  >> No change to analoggain is %s (is %1.3f) +++\n", isWhat, newGain);
		}
	}
	else if (currentRaspistillSetting.analoggain != gain) {		// it should already be at "gain", but just in case, set it anyhow
		currentRaspistillSetting.analoggain = gain;
		Log(4, "  >> setting new gain to %1.3f\n", gain);
	}
 
	// calculate new exposure time based on the (possibly) new gain
	if (currentModeMeanSetting.meanAuto == MEAN_AUTO || currentModeMeanSetting.meanAuto == MEAN_AUTO_EXPOSURE_ONLY) {
		// XXX max_ = std::max((double)currentModeMeanSetting.maxExposure_us / (double)US_IN_SEC, exposureTimeEff_s / currentRaspistillSetting.analoggain);
		max_ = std::max((double)currentModeMeanSetting.minExposure_us / (double)US_IN_SEC, exposureTimeEff_s / currentRaspistillSetting.analoggain);
		double eOLD_s = exposureTime_s * US_IN_SEC;
		//xxxxxx exposureTime_s = std::min((double)exposure_us / (double)US_IN_SEC, max_);
		double eNEW_s = std::min((double)currentModeMeanSetting.maxExposure_us / (double)US_IN_SEC, max_);
		if (exposureTime_s == eNEW_s) {
			Log(4, "  >> No change to exposure time needed +++\n");
		}
		else {
			Log(4, "  >> Setting new exposureTime_s to %s ", length_in_units((long)(eNEW_s * US_IN_SEC), true));
			Log(4, "(was %s: ", length_in_units(eOLD_s, true));
			Log(4, "diff %s)\n", length_in_units((eNEW_s-exposureTime_s) * US_IN_SEC, true));
			exposureTime_s = eNEW_s;
		}
	}
	else if (0 && currentModeMeanSetting.meanAuto == MEAN_AUTO_EXPOSURE_ONLY) {		// xxxxx don't use
		//xxxxxx max_ = std::max(currentModeMeanSetting.minExposure_us / (double)US_IN_SEC, exposureTimeEff_s / gain);
		max_ = std::max((double)currentModeMeanSetting.minExposure_us / (double)US_IN_SEC, exposureTimeEff_s / currentRaspistillSetting.analoggain);
		//xxxxxx exposureTime_s = std::min((double)exposure_us/(double)US_IN_SEC, max_);
		exposureTime_s = std::min((double)currentModeMeanSetting.maxExposure_us / (double)US_IN_SEC, max_);
	}
	else { // MEAN_AUTO_GAIN_ONLY || MEAN_AUTO_OFF
		// exposureTime_s = (double)exposure_us/(double)US_IN_SEC;		// leave exposure alone
	}
} // xxxxx===============

	//#############################################################################################################
	// prepare for the next measurement
	if (currentModeMeanSetting.quickstart > 0) {
		currentModeMeanSetting.quickstart--;
	}
	// Exposure gilt fuer die naechste Messung
	MeanCnt++;
	exposureLevelHistory[MeanCnt % currentModeMeanSetting.historySize] = currentModeMeanSetting.exposureLevel;

	currentRaspistillSetting.shutter_us = exposureTime_s * (double)US_IN_SEC;
	Log(3, "  > Next image:  mean: %'1.3f (diff from target: %'1.3f), Exposure level: %'d (minus %d: %d), Exposure time: %s, gain: %1.2f\n",
		mean, mean_diff,
		currentModeMeanSetting.exposureLevel,
		exposureLevelHistory[idx], currentModeMeanSetting.exposureLevel - exposureLevelHistory[idx],
		length_in_units(currentRaspistillSetting.shutter_us, true), currentRaspistillSetting.analoggain);

	return(this_mean);
}
