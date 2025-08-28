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
bool aegInit(config cg,
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
		// first exposure with currentRaspistillSetting.shutter_us,
		// so we have to calculate the startpoint for ExposureLevel
		initialExposureLevel = calcExposureLevel(cg.currentExposure_us, cg.currentGain, currentModeMeanSetting) - 1;
		currentModeMeanSetting.exposureLevel = initialExposureLevel;
		currentRaspistillSetting.shutter_us = cg.currentExposure_us;

		for (int i=0; i < currentModeMeanSetting.historySize; i++) {
			// Pretend like all prior images had the target mean and initial exposure level.
			meanHistory[i] = cg.myModeMeanSetting.currentMean;
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
		// Ranges from minimum possible to maximum possible for both exposure and gain.
		currentModeMeanSetting.exposureLevelMax = calcExposureLevel(cg.currentMaxAutoExposure_us, cg.currentMaxAutoGain, currentModeMeanSetting) + 1;
		currentModeMeanSetting.exposureLevelMin = calcExposureLevel(cg.cameraMinExposure_us,      cg.cameraMinGain, currentModeMeanSetting) - 1;
	}
	else if (currentModeMeanSetting.meanAuto == MEAN_AUTO_GAIN_ONLY) {
		// Exposure never changes from current value but gain ranges from max to min possible.
		currentModeMeanSetting.exposureLevelMax = calcExposureLevel(cg.currentExposure_us, cg.currentMaxAutoGain, currentModeMeanSetting) + 1;
		currentModeMeanSetting.exposureLevelMin = calcExposureLevel(cg.currentExposure_us, cg.cameraMinGain, currentModeMeanSetting) - 1;
	}
	else if (currentModeMeanSetting.meanAuto == MEAN_AUTO_EXPOSURE_ONLY) {
		// Gain ever changes from current value but exposure ranges from max to min possible.
		currentModeMeanSetting.exposureLevelMax = calcExposureLevel(cg.currentMaxAutoExposure_us, cg.currentGain, currentModeMeanSetting) + 1;
		currentModeMeanSetting.exposureLevelMin = calcExposureLevel(cg.cameraMinExposure_us,      cg.currentGain, currentModeMeanSetting) - 1;
	}
	else if (currentModeMeanSetting.meanAuto == MEAN_AUTO_OFF) {
		// Exposure and gain never change from current values.
		currentModeMeanSetting.exposureLevelMax = calcExposureLevel(cg.currentExposure_us, cg.currentGain, currentModeMeanSetting) + 1;
		currentModeMeanSetting.exposureLevelMin = calcExposureLevel(cg.currentExposure_us, cg.currentGain, currentModeMeanSetting) - 1;
	}
	currentModeMeanSetting.minExposure_us = cg.cameraMinExposure_us;
	currentModeMeanSetting.maxExposure_us = cg.currentMaxAutoExposure_us;
	currentModeMeanSetting.minGain = cg.cameraMinGain;
	currentModeMeanSetting.maxGain = cg.currentMaxAutoGain;

	Log(4, "  > Valid exposureLevels: %'d to %'d starting at %d\n",
		currentModeMeanSetting.exposureLevelMin, currentModeMeanSetting.exposureLevelMax, initialExposureLevel);

	return true;
}


// Calculate mean of current image.
float aegCalcMean(cv::Mat image, bool useMask)
{
	float mean;

	// Only create the destination image and mask the first time we're called.
	static cv::Mat mask;
	static bool maskCreated = false;

	if (image.cols != mask.cols || image.rows != mask.rows)
	{
		// If the image size changed we need a new mask or else we get a cv::exception.
		maskCreated = false;
		if (mask.rows > 0)
		{
			mask.release();
		}
	}

	if (useMask && ! maskCreated)
	{
		maskCreated = true;

		Log(4, ">=>= Creating new mask @ cols=%d, rows=%d\n", image.cols, image.rows);

// TODO: Allow user to specify a mask file

		// Create a white circular mask at the center of the image with
		// a radius of 1/3 the height of the image (diameter == 2/3 height).

		const cv::Scalar white = cv::Scalar(255, 255, 255);

		// mask needs to be mono or else it give a cv::exception
		mask = cv::Mat::zeros(image.size(), CV_8U);
		cv::Point center = cv::Point(mask.cols/2, mask.rows/2);
		int radius = mask.rows / 3;
		cv::circle(mask, center, radius, white, cv::FILLED, cv::LINE_AA, 0);

//x #define xxxxxxxx_for_testing
#ifdef xxxxxxxx_for_testing		// save masks
		std::vector<int> compressionParameters;
		compressionParameters.push_back(cv::IMWRITE_JPEG_QUALITY);
		compressionParameters.push_back(95);
		compressionParameters.push_back(cv::IMWRITE_PNG_COMPRESSION);
		compressionParameters.push_back(9);

		char const *maskName = "tmp/mask.png";
		if (! cv::imwrite(maskName, mask, compressionParameters))
			Log(-1, "*** ERROR: Unable to write to '%s'\n", maskName);

		if (0) {		// Not sure what good this image does.
			// Copy the source image to destination image with masking.
			cv::Mat dstImage = cv::Mat::zeros(image.size(), CV_8U);
			image.copyTo(dstImage, mask);

			char const *dstImageName = "tmp/dstImage.jpg";
			if (! cv::imwrite(dstImageName, dstImage, compressionParameters))
				Log(-1, "*** ERROR: Unable to write to '%s'\n", dstImageName);
		}
#endif
	}

	cv::Scalar mean_scalar;
	if (useMask) {
		mean_scalar = cv::mean(image, mask);
	} else {
		mean_scalar = cv::mean(image, cv::noArray());
	}

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

	if (mean < 0) mean = 0;
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

	Log(1, "  > GOT IMAGE:    shutter_us: %s, gain: %1.3f, mean: %1.3f, target mean: %1.3f, diff (target - mean): %'1.3f\n",
		length_in_units(currentRaspistillSetting.shutter_us, true), cg->lastGain, cg->lastMean,
		cg->myModeMeanSetting.currentMean, (cg->myModeMeanSetting.currentMean - cg->lastMean));

	meanHistory[MeanCnt % currentModeMeanSetting.historySize] = cg->lastMean;

	int idx = (MeanCnt + currentModeMeanSetting.historySize) % currentModeMeanSetting.historySize;
	int idxN1 = (MeanCnt + currentModeMeanSetting.historySize-1) % currentModeMeanSetting.historySize;

	dMean = meanHistory[idx] - meanHistory[idxN1];
	dExp = exposureLevelHistory[idx] - exposureLevelHistory[idxN1];

	// mean_forcast = m_new + diff = m_new + (m_new - m_previous) = (2 * m_new) - m_previous
	// If the previous mean was more than twice as large as the current one, mean_forecast will be negative.
	// "2.0 *" gives more weight to the most recent mean
	double mean_forecast = (2.0 * meanHistory[idx]) - meanHistory[idxN1];
	max_ = std::max(mean_forecast, 0.0);	// force minimum of 0
	mean_forecast = std::min(max_, currentModeMeanSetting.minGain);

	// next mean is avg of mean history
	double newMean = 0.0;
	for (int i=1; i <= currentModeMeanSetting.historySize; i++) {
		int ii =  (MeanCnt + i) % currentModeMeanSetting.historySize;

		// This gives more weight to more recent mean values.
		newMean += meanHistory[ii] * (double) i;

		Log(4, "  > index: %d, meanHistory[]=%1.3f exposureLevelHistory[]=%d, newNean=%1.3f\n",
			ii, meanHistory[ii], exposureLevelHistory[ii], newMean);
	}

	// same value as current value
	newMean += mean_forecast * currentModeMeanSetting.historySize;
	newMean /= (double) values;
	mean_diff = abs(newMean - cg->myModeMeanSetting.currentMean);
	Log(3, "  > New mean target: %1.3f, mean_forecast: %1.3f, mean_diff (newMean - target mean): %'1.3f, idx=%d, idxN1=%d\n",
		newMean, mean_forecast, mean_diff, idx, idxN1);

	int ExposureChange;

	double const multiplier1 = 1.75;			// xxxx was 2.0
	double const multiplier2 = 1.25;
	double meanDiff = abs(cg->lastMean - cg->myModeMeanSetting.currentMean);	// xxx was = mean_diff

	// fast forward
	if (fastforward || meanDiff > (cg->myModeMeanSetting.currentMean_threshold * multiplier1)) {
		// We are fairly far off from desired mean so make a big change next time.
		ExposureChange = std::max(1.0, cg->myModeMeanSetting.mean_p0 + (cg->myModeMeanSetting.mean_p1 * mean_diff) + pow(cg->myModeMeanSetting.mean_p2 * mean_diff, 2.0));
		Log(3, "  > fast forward ExposureChange now %d (meanDiff=%1.3f > %.2f*threshold=%1.3f)\n",
			ExposureChange, meanDiff, multiplier1, cg->myModeMeanSetting.currentMean_threshold * multiplier1);
	}
	else if (meanDiff > (cg->myModeMeanSetting.currentMean_threshold * multiplier2)) {
		// We are somewhat far off from desired mean so make a big change next time.
		ExposureChange = std::max(1.0, cg->myModeMeanSetting.mean_p0 + (cg->myModeMeanSetting.mean_p1 * mean_diff) + (pow(cg->myModeMeanSetting.mean_p2 * mean_diff, 2.0) / 2.0));
		Log(3, "  > medium forward ExposureChange now %d (meanDiff=%1.3f > %.2f*threshold=%1.3f)\n",
			ExposureChange, meanDiff, multiplier2, cg->myModeMeanSetting.currentMean_threshold * multiplier2);
	}
	// slow forward
	else if (meanDiff > cg->myModeMeanSetting.currentMean_threshold) {
		// We are fairly close to desired mean so make a small change next time.
		ExposureChange = std::max(1.0, cg->myModeMeanSetting.mean_p0 + cg->myModeMeanSetting.mean_p1 * mean_diff);
		Log(3, "  > slow forward ExposureChange now %d (meanDiff=%1.3f, %.2f*threshold=%1.3f)\n",
			ExposureChange, meanDiff, multiplier2, cg->myModeMeanSetting.currentMean_threshold * multiplier2);
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
// TODO: make currentMean_threshold a percent instead of an actual value.  This will allow us to use 0 to 100 for what user enters as mean.

	if (cg->lastMean < (cg->myModeMeanSetting.currentMean - cg->myModeMeanSetting.currentMean_threshold)) {
		// mean too low
		if ((currentRaspistillSetting.analoggain < currentModeMeanSetting.maxGain)
		 || (currentRaspistillSetting.shutter_us < currentModeMeanSetting.maxExposure_us)) {
			// Under upper limit of gain and/or shutter time
			cg->goodLastExposure = false;
			currentModeMeanSetting.exposureLevel += ExposureChange;
			Log(4, "  >> exposureLevel increased by %d to %d\n", ExposureChange, currentModeMeanSetting.exposureLevel);
		}
		else {
			Log(3, "    >>> Already at max gain (%1.3f) and max exposure (%s) - cannot go any higher!\n",
				currentModeMeanSetting.maxGain, length_in_units(currentModeMeanSetting.maxExposure_us, true));
		}
	}
	else if (cg->lastMean > (cg->myModeMeanSetting.currentMean + cg->myModeMeanSetting.currentMean_threshold))  {
		// mean too high
		if ((currentRaspistillSetting.analoggain > currentModeMeanSetting.minGain)
		 || (lastExposureTime_us > currentModeMeanSetting.minExposure_us)) {
			// Above lower limit of gain and/or shutter time
			cg->goodLastExposure = false;
			currentModeMeanSetting.exposureLevel -= ExposureChange;
			Log(4, "  > exposureLevel decreased by %d to %d\n", ExposureChange, currentModeMeanSetting.exposureLevel);
		}
		else {
			Log(3, "    >>> Already at min gain (%1.3f) and min exposure (%s) - cannot go any lower!\n",
				currentModeMeanSetting.minGain, length_in_units(currentModeMeanSetting.minExposure_us, true));
		}
	}
	else {
		Log(3, "  > ++++++++++ Prior image mean good - no changes needed, mean=%1.3f, target mean=%1.3f threshold=%1.3f\n",
			cg->lastMean, cg->myModeMeanSetting.currentMean, cg->myModeMeanSetting.currentMean_threshold);
		cg->goodLastExposure = true;
	}

	// Make sure exposureLevel is within min - max range.
	max_ = std::max(currentModeMeanSetting.exposureLevel, currentModeMeanSetting.exposureLevelMin);
	currentModeMeanSetting.exposureLevel = std::min((int)max_, currentModeMeanSetting.exposureLevelMax);
	long exposureTimeEff_us = calcExposureTimeEff_us(currentModeMeanSetting.exposureLevel, currentModeMeanSetting);

	// fastforward ?
	if ((currentModeMeanSetting.exposureLevel == currentModeMeanSetting.exposureLevelMax)
	 || (currentModeMeanSetting.exposureLevel == currentModeMeanSetting.exposureLevelMin)) {
		fastforward = true;
		Log(4, "  > FF activated\n");
	}
	if (fastforward &&
		(abs(meanHistory[idx] - cg->myModeMeanSetting.currentMean) < cg->myModeMeanSetting.currentMean_threshold) &&
		(abs(meanHistory[idxN1] - cg->myModeMeanSetting.currentMean) < cg->myModeMeanSetting.currentMean_threshold)) {
		fastforward = false;
		Log(4, "  > FF deactivated\n");
	}

	//########################################################################
	// calculate new gain and exposure time
	if (! cg->goodLastExposure)
	{
		// This algorithm increases the exposure to its max, then starts increasing the gain.
		// This is done to maximize the time taking picture for the many people that use Allsky to
		// track meteors, and don't want to miss "the big one".
		// This also helps to minimize gain since it adds noise.

		// Notes from Andreas, the creator of the algorithm:

		// first priority: minimum gain (because of image noise)
		// second priority: choose gain and exposure so the image is well exposed (mean value)
 
		// Values for the calculation are only adjusted at the day/night change in aegInit().
		// Formulas calculated in this order:
		// Gain min = cameraMinGain (below this is not possible).  1 in examples below
		// Gain max = currentMaxAutoGain (user value).  14 in examples below.
		// Exposure min = cameraMinExposure_us.  1 in examples below
		// Exposure max = currentMaxAutoExposure_us (user value).  60 seconds in examples below.
		// There is no way (or need as far as we know) to allow the user to specify the min values.

		// 1. Set new gain so maximum exposure time is possible:
		// Formula:   effective_exposure_time / currentMaxAutoExposure_us
		// Example 1 daylight: gain: 1us / 60s = 1.6E-8; limited to the minimum gain = 1
		// Example 2 twilight: gain: 1s / 60s = 0.016; limited to the minimum gain = 1
		// Example 3 night: gain: 120s / 60s = 2
		// Example 4 dark night: gain: 600s / 60s = 10
		// Example 5 very dark night: gain: 1200s / 60s = 20; limited to the maximum gain = 14
 
		// 2. Calculate new exposure time with the calculated gain from above:
 		// Formula:   effective_exposure_time / gain
		// Example 1 daylight: exposure time: 1us / 1 = 1us  
		// Example 2 twilight: exposure time: 1s / 1 = 1s  
		// Example 3 night: Exposure time: 120s/ 2 = 60s
		// Example 4 dark night: Exposure time: 600s/ 10 = 60s
		// Example 5 very dark night: exposure time: 1200s / 14 = 85.7s; limited to maximum exposure time = 60s  


		if (currentModeMeanSetting.meanAuto == MEAN_AUTO) {
			max_ = std::max((double)cg->cameraMinGain, (double)exposureTimeEff_us  / (double)cg->currentMaxAutoExposure_us);
			Log(4, " >>>>>>> exposureTimeEff_us=%'ld, max_=%.3f\n", exposureTimeEff_us, max_);

			currentRaspistillSetting.analoggain = std::min(cg->currentMaxAutoGain, max_);

			max_ = std::max((double)cg->cameraMinExposure_us, (double)exposureTimeEff_us / currentRaspistillSetting.analoggain);
			newExposureTime_us = std::min((double)cg->currentMaxAutoExposure_us, max_);
			Log(4, " >>>>>>> new analoggain=%1.3f, second max_=%.3f, newExposureTime_us=%s\n",
				currentRaspistillSetting.analoggain, max_, length_in_units(newExposureTime_us, true));
		}

		else if (currentModeMeanSetting.meanAuto == MEAN_AUTO_GAIN_ONLY) {
			max_ = std::max((double)cg->cameraMinGain, (double)exposureTimeEff_us / (double)cg->currentExposure_us);
			currentRaspistillSetting.analoggain = std::min(cg->currentMaxAutoGain, max_);
			newExposureTime_us = cg->currentExposure_us;
		}

		else if (currentModeMeanSetting.meanAuto == MEAN_AUTO_EXPOSURE_ONLY) {
			currentRaspistillSetting.analoggain = cg->currentGain;
			max_ = std::max((double)cg->cameraMinExposure_us, (double)exposureTimeEff_us / cg->currentGain);
			newExposureTime_us = std::min((double)cg->currentMaxAutoExposure_us, max_);
		}

		else {	// MEAN_AUTO_OFF
			currentRaspistillSetting.analoggain = cg->currentGain;
			newExposureTime_us = cg->currentExposure_us;
		}
	}

	//########################################################################
	// prepare for the next measurement
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
