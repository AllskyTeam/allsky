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
double meanHistory [historySize]; // = {0.0,0.0,0.0,0.0,0.0};
int     expHistory [historySize]; // = {0,0,0,0,0};

int MeanCnt = 0;
double dMean = 1.0; // Mean(n-1)-Mean(n)
int dExp = 1.0; //Exp(n-1)-Exp(n)
int lastExposureChange = 0;
int dExposureChange = 0;

bool createMaskHorizon = true;
bool fastforward = false;

int calcExposureLevel(int exposure_us, double gain, modeMeanSetting &currentModeMeanSetting)
{
	return log(gain  * exposure_us/(double)US_IN_SEC) / log (2.0) * pow(currentModeMeanSetting.shuttersteps,2.0);
}

double calcExposureTimeEff (int exposureLevel, modeMeanSetting &currentModeMeanSetting)
{
	return pow(2.0, double(exposureLevel)/pow(currentModeMeanSetting.shuttersteps,2.0));
}

// set limits.  aeg == Auto Exposure / Gain
void aeg_Init(bool autoExposure, int exposure_us, bool autoGain, double gain, raspistillSetting &currentRaspistillSetting, modeMeanSetting &currentModeMeanSetting)
{
	// Init some values first
	if (currentModeMeanSetting.init) {
		currentModeMeanSetting.init = false;

		currentRaspistillSetting.shutter_us = exposure_us;

		// only for the output
		if (historySize < currentModeMeanSetting.historySize) {
			fprintf(stderr, "*** ERROR: historySize (%d) < currentModeMeanSetting.historySize (%d)\n", historySize, currentModeMeanSetting.historySize);
			// TODO
			return;
		}
		for (int i=0; i < currentModeMeanSetting.historySize; i++) {
			meanHistory[i] = currentModeMeanSetting.meanValue;
			expHistory[i] = calcExposureLevel(currentRaspistillSetting.shutter_us, 1.0, currentModeMeanSetting) - 1;
		}
		// first exposure with currentRaspistillSetting.shutter_us, so we have to calculate the startpoint for ExposureLevel 
		currentModeMeanSetting.exposureLevel = calcExposureLevel(currentRaspistillSetting.shutter_us, 1.0, currentModeMeanSetting) -1;
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
		currentModeMeanSetting.exposureLevelMax = calcExposureLevel(exposure_us, gain, currentModeMeanSetting) + 1;
		currentModeMeanSetting.exposureLevelMin = calcExposureLevel(1,           1.0,  currentModeMeanSetting) - 1;
	}
	else if (currentModeMeanSetting.meanAuto == MEAN_AUTO_GAIN_ONLY) {
		currentModeMeanSetting.exposureLevelMax = calcExposureLevel(exposure_us, gain, currentModeMeanSetting) + 1;
		currentModeMeanSetting.exposureLevelMin = calcExposureLevel(exposure_us, 1.0,  currentModeMeanSetting) - 1;
	}
	else if (currentModeMeanSetting.meanAuto == MEAN_AUTO_EXPOSURE_ONLY) {
		currentModeMeanSetting.exposureLevelMax = calcExposureLevel(exposure_us, gain, currentModeMeanSetting) + 1;
		currentModeMeanSetting.exposureLevelMin = calcExposureLevel(1,           gain, currentModeMeanSetting) - 1;
	}
	else if (currentModeMeanSetting.meanAuto == MEAN_AUTO_OFF) {
		currentModeMeanSetting.exposureLevelMax = calcExposureLevel(exposure_us, gain, currentModeMeanSetting) + 1;
		currentModeMeanSetting.exposureLevelMin = calcExposureLevel(exposure_us, gain, currentModeMeanSetting) - 1;
	}

	Log(3, "  > Valid ExposureLevels: %'1.8f to %'1.8f\n", currentModeMeanSetting.exposureLevelMin, currentModeMeanSetting.exposureLevelMax);
	double min =  calcExposureTimeEff(currentModeMeanSetting.exposureLevelMin, currentModeMeanSetting);
	double max =  calcExposureTimeEff(currentModeMeanSetting.exposureLevelMax, currentModeMeanSetting);
	Log(3, "  > Valid Exposure: %s to", length_in_units((long)round(min*US_IN_SEC), true));
	Log(3, " %s\n",  length_in_units((long)round(max*US_IN_SEC), true));
}

// Calculate new raspistillSettings (exposure, gain)
// Algorithm not perfect, but better than no exposure control at all
float aegCalcMean(cv::Mat image, int exposure_us, double gain, raspistillSetting &currentRaspistillSetting, modeMeanSetting &currentModeMeanSetting)
{
	//Hauptvariablen
	double mean;
	double mean_diff;
	double this_mean;

	// get old exposureTime
	double exposureTime_s = (double) currentRaspistillSetting.shutter_us/(double)US_IN_SEC;

	//Then define your mask image
	//cv::Mat mask = cv::Mat::zeros(image.size(), image.type());
	cv::Mat mask = cv::Mat::zeros(image.size(), CV_8U);

	//Define your destination image
	cv::Mat dstImage = cv::Mat::zeros(image.size(), CV_8U);

	//I assume you want to draw the circle at the center of your image, with a radius of mask.rows/3
	cv::circle(mask, cv::Point(mask.cols/2, mask.rows/2), mask.rows/3, cv::Scalar(255, 255, 255), -1, 8, 0);

	//Now you can copy your source image to destination image with masking
	image.copyTo(dstImage, mask);

if (0)
{
	std::vector<int> compression_params;
	compression_params.push_back(cv::IMWRITE_PNG_COMPRESSION);
	compression_params.push_back(9);
	compression_params.push_back(cv::IMWRITE_JPEG_QUALITY);
	compression_params.push_back(95);

	// Don't need to save file
	bool result = cv::imwrite("mask.jpg", dstImage, compression_params);
	if (! result) fprintf(stderr, "*** ERROR: Unable to write to 'mask.jpg'\n");
}

	cv::Scalar mean_scalar = cv::mean(image, mask);
	switch (image.channels())
	{
		default: // mono case
			Log(3, "  > mean_scalar.val[0] %d\n", mean_scalar.val[0]);
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
		 
	Log(3, "  > exposure: %.3f sec, mean: %1.3f, meanValue: %1.3f, diff: %'1.3f\n", exposureTime_s, mean, currentModeMeanSetting.meanValue, (currentModeMeanSetting.meanValue - mean));
	this_mean = mean;	// return current image's mean

	// avg of mean history 
	Log(3, "  > MeanCnt: %d, historySize: %d\n", MeanCnt, currentModeMeanSetting.historySize);

	meanHistory[MeanCnt % currentModeMeanSetting.historySize] = mean;
	int values = 0;
	mean=0.0;
	for (int i=1; i <= currentModeMeanSetting.historySize; i++) {
		int idx =  (MeanCnt + i) % currentModeMeanSetting.historySize;
		Log(3, "  > i=%d: meanHistory[%d]=%1.3f expHistory[%d]=%d\n", i, idx, meanHistory[idx], idx, expHistory[idx]);
		mean += meanHistory[idx] * (double) i;
		values += i;
	} 

	int idx = (MeanCnt + currentModeMeanSetting.historySize) % currentModeMeanSetting.historySize;
	int idxN1 = (MeanCnt + currentModeMeanSetting.historySize-1) % currentModeMeanSetting.historySize;

	dMean = meanHistory[idx] - meanHistory[idxN1];
	dExp = expHistory[idx] - expHistory[idxN1];
	
	// forcast (m_forcast = m_neu + diff = m_neu + m_neu - m_alt = 2*m_neu - m_alt)
	double mean_forecast = 2.0 * meanHistory[idx] - meanHistory[idxN1];
	mean_forecast = std::min((double) std::max((double) mean_forecast, 0.0), 1.0);
	// gleiche Wertigkeit wie aktueller Wert
	mean += mean_forecast * currentModeMeanSetting.historySize;
	values += currentModeMeanSetting.historySize;
	mean = mean / (double) values;
	mean_diff = abs(mean - currentModeMeanSetting.meanValue);
	Log(3, "  > mean_forecast: %1.3f, values: %d, mean_diff: %'1.3f\n", mean_forecast, values, mean_diff);

	int ExposureChange = currentModeMeanSetting.shuttersteps / 2;
		
	// fast forward
	if ((fastforward) || (mean_diff > (currentModeMeanSetting.mean_threshold * 2.0))) {
		ExposureChange = std::max(1.0, currentModeMeanSetting.mean_p0 + currentModeMeanSetting.mean_p1 * mean_diff + pow (currentModeMeanSetting.mean_p2 * mean_diff,2.0));
	}
	// slow forward
	else if (mean_diff > (currentModeMeanSetting.mean_threshold)) {
		ExposureChange = std::max(1.0, currentModeMeanSetting.mean_p0 + currentModeMeanSetting.mean_p1 * mean_diff);
	}

	ExposureChange = std::min(50, ExposureChange);

	dExposureChange = ExposureChange-lastExposureChange;
	lastExposureChange = ExposureChange;

	Log(3, "  > ExposureChange: %d (%d)\n", ExposureChange, dExposureChange);

	if (mean < (currentModeMeanSetting.meanValue - (currentModeMeanSetting.mean_threshold))) {
		if ((currentRaspistillSetting.analoggain <= gain) || (currentRaspistillSetting.shutter_us <= exposure_us)) {  // obere Grenze durch Gain und shutter
			currentModeMeanSetting.exposureLevel += ExposureChange;
		}
	}
	if (mean > (currentModeMeanSetting.meanValue + currentModeMeanSetting.mean_threshold))  {
		if (exposureTime_s <= 1 / (double)US_IN_SEC) { // untere Grenze durch shuttertime
			Log(3, "  > exposureTime_s <= 1 microsecond can't go any lower!\n");
		}
		else {
			currentModeMeanSetting.exposureLevel -= ExposureChange;
		}
	}

	// check limits of exposurelevel 
	currentModeMeanSetting.exposureLevel = std::min(std::max((int)currentModeMeanSetting.exposureLevel, (int)currentModeMeanSetting.exposureLevelMin), (int)currentModeMeanSetting.exposureLevelMax);
  double exposureTimeEff_s = calcExposureTimeEff(currentModeMeanSetting.exposureLevel, currentModeMeanSetting);

	// fastforward ?
	if ((currentModeMeanSetting.exposureLevel == (int)currentModeMeanSetting.exposureLevelMax) || (currentModeMeanSetting.exposureLevel == (int)currentModeMeanSetting.exposureLevelMin)) {
		fastforward = true;
		Log(4, "  > FF aktiviert\n");
	}
	if ((abs(meanHistory[idx] - currentModeMeanSetting.meanValue) < currentModeMeanSetting.mean_threshold) &&
		(abs(meanHistory[idxN1] - currentModeMeanSetting.meanValue) < currentModeMeanSetting.mean_threshold)) {
		fastforward = false;
		Log(4, "  > FF deaktiviert\n");
	}
		
	//#############################################################################################################
	// calculate gain und exposuretime
	if (currentModeMeanSetting.meanAuto == MEAN_AUTO) {
		double newGain = std::min(gain, std::max(1.0, exposureTimeEff_s / (exposure_us/(double)US_IN_SEC))); 
		currentRaspistillSetting.analoggain = newGain;
		exposureTime_s = std::min((double)exposure_us/(double)US_IN_SEC, std::max(1 / (double)US_IN_SEC, exposureTimeEff_s / currentRaspistillSetting.analoggain));
	}
	else if (currentModeMeanSetting.meanAuto == MEAN_AUTO_GAIN_ONLY) {
		exposureTime_s = (double)exposure_us/(double)US_IN_SEC;
		currentRaspistillSetting.analoggain = std::min(gain,std::max(1.0,exposureTimeEff_s / (exposure_us/(double)US_IN_SEC)));
	}
	else if (currentModeMeanSetting.meanAuto == MEAN_AUTO_EXPOSURE_ONLY) {
		currentRaspistillSetting.analoggain = gain;
		exposureTime_s = std::min((double)exposure_us/(double)US_IN_SEC,std::max(0.000001, exposureTimeEff_s / gain));
	}
	else {
		exposureTime_s = (double)exposure_us/(double)US_IN_SEC;
		currentRaspistillSetting.analoggain = gain;
	}

	//#############################################################################################################
	// prepare for the next measurement
	if (currentModeMeanSetting.quickstart > 0) {
// xxxx  TODO: If already at the max exposure and we want to increase, then set quickstart to 0.
// xxxx OR, if at a good exposure, set quickstart to 0.
		currentModeMeanSetting.quickstart--;
	}
	// Exposure gilt fuer die naechste Messung
	MeanCnt++;
	expHistory[MeanCnt % currentModeMeanSetting.historySize] = currentModeMeanSetting.exposureLevel;

	currentRaspistillSetting.shutter_us = exposureTime_s * (double)US_IN_SEC;
	Log(3, "  > Mean: %'1.3f, diff: %'1.3f, Exposure level:%'d (%d), Exposure time:%s, analoggain:%1.2f\n", mean, mean_diff, currentModeMeanSetting.exposureLevel, currentModeMeanSetting.exposureLevel-expHistory[idx], length_in_units((long)(exposureTime_s * US_IN_SEC), true), currentRaspistillSetting.analoggain);

	return(this_mean);
}
