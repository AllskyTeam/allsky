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

#include "include/raspistill.h"
#include "include/mode_mean.h"

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

long calcExposureTimeEff_us(int exposureLevel, modeMeanSetting &currentModeMeanSetting)
{
	return (long)(pow(2.0, double(exposureLevel)/pow(currentModeMeanSetting.shuttersteps,2.0)) * US_IN_SEC);
}

// set limits.  aeg == Auto Exposure / Gain
bool aegInit(config cg, int minExposure_us, double minGain,
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

		// XXXXXX    Does this need to be done every transition between day and night,
		// or just once when Allsky starts?
		// first exposure with currentRaspistillSetting.shutter_us, so we have to calculate the startpoint for ExposureLevel
		initialExposureLevel = calcExposureLevel(cg.currentExposure_us, cg.currentGain, currentModeMeanSetting) - 1;
		currentModeMeanSetting.exposureLevel = initialExposureLevel;
		currentRaspistillSetting.shutter_us = cg.currentExposure_us;

		for (int i=0; i < currentModeMeanSetting.historySize; i++) {
			// Pretend like all prior images had the target mean and initial exposure level.
			meanHistory[i] = currentModeMeanSetting.meanValue;
			exposureLevelHistory[i] = initialExposureLevel;
		}
	}

	// check and set meanAuto
	if (cg.currentAutoGain && cg.currentAutoExposure)
		currentModeMeanSetting.meanAuto = MEAN_AUTO;
	else if (cg.currentAutoGain)
		currentModeMeanSetting.meanAuto = MEAN_AUTO_GAIN_ONLY;
	else if (cg.currentAutoExposure)
		currentModeMeanSetting.meanAuto = MEAN_AUTO_EXPOSURE_ONLY;
	else
		currentModeMeanSetting.meanAuto = MEAN_AUTO_OFF;

	// calculate min and max exposurelevels
	if (currentModeMeanSetting.meanAuto == MEAN_AUTO) {
		currentModeMeanSetting.exposureLevelMax = calcExposureLevel(cg.currentMaxAutoExposure_us, cg.currentMaxAutoGain, currentModeMeanSetting) + 1;
		currentModeMeanSetting.exposureLevelMin = calcExposureLevel(minExposure_us, minGain, currentModeMeanSetting) - 1;
	}
	else if (currentModeMeanSetting.meanAuto == MEAN_AUTO_GAIN_ONLY) {
		currentModeMeanSetting.exposureLevelMax = calcExposureLevel(cg.currentMaxAutoExposure_us, cg.currentMaxAutoGain, currentModeMeanSetting) + 1;
		currentModeMeanSetting.exposureLevelMin = calcExposureLevel(cg.currentMaxAutoExposure_us, minGain, currentModeMeanSetting) - 1;
	}
	else if (currentModeMeanSetting.meanAuto == MEAN_AUTO_EXPOSURE_ONLY) {
		currentModeMeanSetting.exposureLevelMax = calcExposureLevel(cg.currentMaxAutoExposure_us, cg.currentMaxAutoGain, currentModeMeanSetting) + 1;
		currentModeMeanSetting.exposureLevelMin = calcExposureLevel(minExposure_us, cg.currentMaxAutoGain, currentModeMeanSetting) - 1;
	}
	else if (currentModeMeanSetting.meanAuto == MEAN_AUTO_OFF) {
		// xxxx Do we need to set these?  Are they even used in MEAN_AUTO_OFF mode?
		currentModeMeanSetting.exposureLevelMax = calcExposureLevel(cg.currentMaxAutoExposure_us, cg.currentMaxAutoGain, currentModeMeanSetting) + 1;
		currentModeMeanSetting.exposureLevelMin = calcExposureLevel(cg.currentMaxAutoExposure_us, cg.currentMaxAutoGain, currentModeMeanSetting) - 1;
	}
	currentModeMeanSetting.minExposure_us = minExposure_us;
	currentModeMeanSetting.maxExposure_us = cg.currentMaxAutoExposure_us;
	currentModeMeanSetting.minGain = minGain;
	currentModeMeanSetting.maxGain = cg.currentMaxAutoGain;

	Log(4, "  > Valid exposureLevels: %'d to %'d starting at %d\n",
		currentModeMeanSetting.exposureLevelMin, currentModeMeanSetting.exposureLevelMax, initialExposureLevel);

	return true;
}


// Calculate mean of current image.
float aegCalcMean(cv::Mat image)
{
	float mean;

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

	return(mean);	// return this image's mean
}


// Calculate the new exposure and gain values.
void aegGetNextExposureSettings(config * cg,
		raspistillSetting & currentRaspistillSetting,
		modeMeanSetting & currentModeMeanSetting)
{
	double mean_diff;
	double max_;			// calculate std::max() by itself to make the code easier to read.
	// save prior exposure time.
	long lastExposureTime_us = currentRaspistillSetting.shutter_us;
	long newExposureTime_us = lastExposureTime_us;

	static int values = 0;
	// "values" will always be the same value for every image so only calculate once.
	// If historySize is 3:
	// i=1 (0+1==1), i=2 (2+1==3), i=3 (3+3==6).  6 += 3 == 9
	if (values == 0) {
		for (int i=1; i <= currentModeMeanSetting.historySize; i++)
			values += i;
		values += currentModeMeanSetting.historySize;
	}

	Log(3, "  > Got:    shutter_us: %s, gain: %1.3f, mean: %1.3f, target mean: %1.3f, diff (target - mean): %'1.3f\n",
		length_in_units(currentRaspistillSetting.shutter_us, true), cg->lastGain, cg->lastMean,
		currentModeMeanSetting.meanValue, (currentModeMeanSetting.meanValue - cg->lastMean));

	meanHistory[MeanCnt % currentModeMeanSetting.historySize] = cg->lastMean;

	int idx = (MeanCnt + currentModeMeanSetting.historySize) % currentModeMeanSetting.historySize;
	int idxN1 = (MeanCnt + currentModeMeanSetting.historySize-1) % currentModeMeanSetting.historySize;

	dMean = meanHistory[idx] - meanHistory[idxN1];
	dExp = exposureLevelHistory[idx] - exposureLevelHistory[idxN1];

	// mean_forcast = m_new + diff = m_new + (m_new - m_previous) = (2 * m_new) - m_previous
	// If the previous mean was more than twice as large as the current one, mean_forecast will be negative.
	double mean_forecast = (2.0 * meanHistory[idx]) - meanHistory[idxN1];	// "2.0 *" gives more weight to the most recent mean
	max_ = std::max(mean_forecast, 0.0);	// forces minimum of 0
	mean_forecast = std::min(max_, currentModeMeanSetting.minGain);
	// gleiche Wertigkeit wie aktueller Wert

	// next mean is avg of mean history
	double newMean = 0.0;
	for (int i=1; i <= currentModeMeanSetting.historySize; i++) {
		int ii =  (MeanCnt + i) % currentModeMeanSetting.historySize;
		newMean += meanHistory[ii] * (double) i;		// This gives more weight to means later in the history array.
		Log(4, "  > index: %d, meanHistory[]=%1.3f exposureLevelHistory[]=%d, newNean=%1.3f\n", ii, meanHistory[ii], exposureLevelHistory[ii], newMean);
	}
	newMean += mean_forecast * currentModeMeanSetting.historySize;
	newMean /= (double) values;
	mean_diff = abs(newMean - currentModeMeanSetting.meanValue);
	Log(3, "  > New mean target: %1.3f, mean_forecast: %1.3f, mean_diff (newMean - target mean): %'1.3f, idx=%d, idxN1=%d\n",
		newMean, mean_forecast, mean_diff, idx, idxN1);

	int ExposureChange;

	// fast forward
	if (fastforward || mean_diff > (currentModeMeanSetting.mean_threshold * 2.0)) {
		// We are fairly far off from desired mean so make a big change next time.
		ExposureChange = std::max(1.0, currentModeMeanSetting.mean_p0 + (currentModeMeanSetting.mean_p1 * mean_diff) + pow(currentModeMeanSetting.mean_p2 * mean_diff, 2.0));
		Log(3, "  > fast forward ExposureChange now %d (mean_diff=%1.3f > 2*threshold=%1.3f)\n", ExposureChange, mean_diff, currentModeMeanSetting.mean_threshold*2.0);
	}
	// slow forward
	else if (mean_diff > currentModeMeanSetting.mean_threshold) {
		// We are fairly close to desired mean so make a small change next time.
		ExposureChange = std::max(1.0, currentModeMeanSetting.mean_p0 + currentModeMeanSetting.mean_p1 * mean_diff);
		Log(3, "  > slow forward ExposureChange now %d (mean_diff=%1.3f, threshold=%1.3f)\n", ExposureChange, mean_diff, currentModeMeanSetting.mean_threshold);
	}
	else {
		// We are within the threshold
		ExposureChange = currentModeMeanSetting.shuttersteps / 2;
	}

	int const maxChange = 50;
	ExposureChange = std::min(maxChange, ExposureChange);			// limit how big of a change we make each time
	dExposureChange = ExposureChange - lastExposureChange;
	lastExposureChange = ExposureChange;

	Log(4, "  > ExposureChange clipped to %d (diff from last change: %d)\n", ExposureChange, dExposureChange);

	// If the last image's mean was good, no changes are needed to the next one.
// TODO: make mean_threshold a percent instead of an actual value.  This will allow us to use 0 to 100 for what user enters as mean.

	if (cg->lastMean < (currentModeMeanSetting.meanValue - currentModeMeanSetting.mean_threshold)) {
		// mean too low
		if ((currentRaspistillSetting.analoggain < currentModeMeanSetting.maxGain)
		 || (currentRaspistillSetting.shutter_us < currentModeMeanSetting.maxExposure_us)) {
			// Under upper limit of gain and/or shutter time
			cg->goodLastExposure = false;
			currentModeMeanSetting.exposureLevel += ExposureChange;
			Log(4, "  >> exposureLevel increased by %d to %d\n", ExposureChange, currentModeMeanSetting.exposureLevel);
		}
		else {
			Log(3, "  >> Already at max gain (%1.3f) and max exposure (%s) - can't go any higher!\n",
				currentModeMeanSetting.maxGain, length_in_units(currentModeMeanSetting.maxExposure_us, true));
		}
	}
	else if (cg->lastMean > (currentModeMeanSetting.meanValue + currentModeMeanSetting.mean_threshold))  {
		// mean too high
/// Eric added minGain
		if ((currentRaspistillSetting.analoggain > currentModeMeanSetting.minGain)
		 || (lastExposureTime_us > currentModeMeanSetting.minExposure_us)) {
			// Above lower limit of gain and/or shutter time
			cg->goodLastExposure = false;
			currentModeMeanSetting.exposureLevel -= ExposureChange;
			Log(4, "  > exposureLevel decreased by %d to %d\n", ExposureChange, currentModeMeanSetting.exposureLevel);
		}
		else {
			Log(3, "  >> Already at min gain (%1.3f) and min exposure (%'d us) - can't go any lower!\n",
				currentModeMeanSetting.minGain, length_in_units(currentModeMeanSetting.minExposure_us, true));
		}
	}
	else {
		Log(3, "  > ++++++++++ Prior image mean good - no changes needed, mean=%1.3f, target mean=%1.3f threshold=%1.3f\n",
			cg->lastMean, currentModeMeanSetting.meanValue, currentModeMeanSetting.mean_threshold);
		cg->goodLastExposure = true;
		if (currentModeMeanSetting.quickstart > 0)
		{
			currentModeMeanSetting.quickstart = 0;		// Got a good exposure - turn quickstart off if on
			Log(4, "  >> Disabling quickstart\n");
		}
	}

	// Make sure exposureLevel is within min - max range.
	max_ = std::max(currentModeMeanSetting.exposureLevel, currentModeMeanSetting.exposureLevelMin);
	currentModeMeanSetting.exposureLevel = std::min((int)max_, currentModeMeanSetting.exposureLevelMax);
	long exposureTimeEff_us = calcExposureTimeEff_us(currentModeMeanSetting.exposureLevel, currentModeMeanSetting);

	// fastforward ?
	if ((currentModeMeanSetting.exposureLevel == currentModeMeanSetting.exposureLevelMax) || (currentModeMeanSetting.exposureLevel == currentModeMeanSetting.exposureLevelMin)) {
		fastforward = true;
		Log(4, "  > FF activated\n");
	}
	if (fastforward &&
		(abs(meanHistory[idx] - currentModeMeanSetting.meanValue) < currentModeMeanSetting.mean_threshold) &&
		(abs(meanHistory[idxN1] - currentModeMeanSetting.meanValue) < currentModeMeanSetting.mean_threshold)) {
		fastforward = false;
		Log(4, "  > FF deactivated\n");
	}

	//########################################################################
	// calculate new gain
	if (! cg->goodLastExposure)
	{
		if (currentModeMeanSetting.meanAuto == MEAN_AUTO || currentModeMeanSetting.meanAuto == MEAN_AUTO_GAIN_ONLY) {

// xxxxxxx ??? "cg->lastExposure_us" or cg->maxExposure_us or lastExposureTime_us ?
// Eric had cg->lastExposure_us and cg->lastGain; Andreas suggested trying cg->currentExposure_us and cg->currentGain.
// It didn't make any difference - gain still increased to max before exposure increased.
// Last and current exposure and gain are the same when we enter this function.

			max_ = std::max(currentModeMeanSetting.minGain, (double)exposureTimeEff_us  / (double)cg->currentExposure_us);
// xxxx  was: double newGain = std::min(cg->currentGain, max_);
			double newGain = std::min(currentModeMeanSetting.maxGain, max_);
			if (newGain > currentModeMeanSetting.maxGain) {
				currentRaspistillSetting.analoggain = currentModeMeanSetting.maxGain;
				Log(3, "  >> Setting new analoggain to %1.3f (max value) (newGain was %1.3f)\n", currentRaspistillSetting.analoggain, newGain);
			}
			else if (newGain < currentModeMeanSetting.minGain) {
				currentRaspistillSetting.analoggain = currentModeMeanSetting.minGain;
				Log(3, "  >> Setting new analoggain to %1.3f (min value) (newGain was %1.3f)\n", currentRaspistillSetting.analoggain, newGain);
			}
			else if (currentRaspistillSetting.analoggain != newGain) {
				currentRaspistillSetting.analoggain = newGain;
				// Will be logged at end
			}
			else {
				char const *isWhat = ((newGain == currentModeMeanSetting.minGain) || (newGain == currentModeMeanSetting.maxGain)) ? "possible" : "needed";
				Log(3, "  >> No change to analoggain is %s (is %1.3f) +++\n", isWhat, newGain);
			}
		}
		else if (currentRaspistillSetting.analoggain != cg->currentGain) {
			// it should already be at "cg->currentGain", but just in case, set it anyhow
			currentRaspistillSetting.analoggain = cg->currentGain;
			Log(3, "  >> setting new gain to currentGain: %1.3f\n", cg->currentGain);
		}
 
		// calculate new exposure time based on the (possibly) new gain
		if (currentModeMeanSetting.meanAuto == MEAN_AUTO || currentModeMeanSetting.meanAuto == MEAN_AUTO_EXPOSURE_ONLY) {
			max_ = std::max(currentModeMeanSetting.minExposure_us, (long)((double)exposureTimeEff_us / currentRaspistillSetting.analoggain));
Log(3, "  > XXXX 1 max_ = %s us,", length_in_units(max_, true));
Log(3, " exposureTimeEff_s=%s\n", length_in_units(exposureTimeEff_us, true));
			long eNEW_us = std::min(currentModeMeanSetting.maxExposure_us, (long)max_);
			long diff_us = abs(lastExposureTime_us - eNEW_us);
			if (diff_us == 0) {
				Log(3, "  >> No change to exposure time needed +++\n");
			}
			else {
				Log(3, "  >> Setting new newExposureTime_us to %s ", length_in_units(eNEW_us, true));
				Log(3, "(was %s: ", length_in_units(lastExposureTime_us, true));
				Log(3, "diff %s)\n", length_in_units(eNEW_us - lastExposureTime_us, true));
				newExposureTime_us = eNEW_us;
			}
		}
		else { // MEAN_AUTO_GAIN_ONLY || MEAN_AUTO_OFF
			newExposureTime_us = cg->currentExposure_us;		// leave exposure alone
			Log(3, "setting newExposureTime_us to cg->currentExposure_us = %s\n", length_in_units(newExposureTime_us, true));
		}
	}

	//#############################################################################################################
	// prepare for the next measurement
	if (currentModeMeanSetting.quickstart > 0) {
		currentModeMeanSetting.quickstart--;
	}
	// Exposure gilt fuer die naechste Messung
	MeanCnt++;
	exposureLevelHistory[MeanCnt % currentModeMeanSetting.historySize] = currentModeMeanSetting.exposureLevel;

	currentRaspistillSetting.shutter_us = newExposureTime_us;

	if (! cg->goodLastExposure) {
		// If the last exposure was good, we're not changing anything so don't log anything.
		Log(3, "  > Next image:  exposure time: %s, gain: %1.3f\n",
			length_in_units(currentRaspistillSetting.shutter_us, true), currentRaspistillSetting.analoggain);
		Log(3, "                 mean: %'1.3f (diff from target: %'1.3f), Exposure level: %'d (minus %d: %d)\n",
			newMean, mean_diff,
			currentModeMeanSetting.exposureLevel,
			exposureLevelHistory[idx], currentModeMeanSetting.exposureLevel - exposureLevelHistory[idx]);
	}
}
