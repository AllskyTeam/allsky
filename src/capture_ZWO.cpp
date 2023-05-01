#include <opencv2/core.hpp>
#include <opencv2/imgproc.hpp>
#include <opencv2/highgui.hpp>
#include "include/ASICamera2.h"
#include <math.h>
#include <unistd.h>
#include <string.h>
#include <errno.h>
#include <string>
#include <tr1/memory>
#include <stdlib.h>
#include <signal.h>
#include <fstream>
#include <stdarg.h>
#include <chrono>

#include "include/allsky_common.h"

// CG holds all configuration variables.
// There are only a few cases where it's not passed to a function.
// When it's passed, functions call it "cg", so use upper case for global version.
config CG;

#define CAMERA_TYPE			"ZWO"
#define IS_ZWO
#include "ASI_functions.cpp"

#define USE_HISTOGRAM		// use the histogram code as a workaround to ZWO's bug

#ifdef USE_HISTOGRAM
// Got these by trial and error. They are more-or-less half the max of 255, plus or minus some.
#define MINMEAN					122
#define MAXMEAN					134
#endif

// Forward definitions
char *getRetCode(ASI_ERROR_CODE);
void closeUp(int);
bool checkMaxErrors(int *, int);

//-------------------------------------------------------------------------------------------------------
//-------------------------------------------------------------------------------------------------------


// These are global so they can be used by other routines.
// Variables for command-line settings are first and are "long" so we can use validateLong().

// In version 0.8 we introduced a different way to take exposures. Instead of turning video mode on at
// the beginning of the program and off at the end (which kept the camera running all the time, heating it up),
// version 0.8 turned video mode on, then took a picture, then turned it off. This helps cool the camera,
// but some users (seems hit or miss) get ASI_ERROR_TIMEOUTs when taking exposures with the new method.
// So, we added the ability for them to use the 0.7 video-always-on method, or the 0.8 "new exposure" method.
timeval exposureStartDateTime;									// date/time an image started

cv::Mat pRgb;
std::vector<int> compressionParameters;
bool bMain						= true;
bool bDisplay					= false;
std::string dayOrNight;
bool bSaveRun					= false;
bool bSavingImg					= false;
pthread_mutex_t mtxSaveImg;
pthread_cond_t condStartSave;
ASI_CONTROL_CAPS ControlCaps;
int numErrors					= 0;				// Number of errors in a row.
int maxErrors					= 5;				// Max number of errors in a row before we exit
bool gotSignal					= false;			// did we get a SIGINT (from keyboard), or SIGTERM/SIGHUP (from service)?
int iNumOfCtrl					= NOT_SET;			// Number of camera control capabilities
pthread_t threadDisplay			= 0;
pthread_t hthdSave				= 0;
int numExposures				= 0;				// how many valid pictures have we taken so far?
int currentBpp					= NOT_SET;			// bytes per pixel: 8, 16, or 24

// Make sure we don't try to update a non-updateable control, and check for errors.
ASI_ERROR_CODE setControl(int camNum, ASI_CONTROL_TYPE control, long value, ASI_BOOL makeAuto)
{
	ASI_ERROR_CODE ret = ASI_SUCCESS;
	// The array of controls might contain 3 items, control IDs 1, 5, and 9.
	// The 2nd argument to ASIGetControlCaps() is the INDEX into the controll array,
	// NOT the control ID (e.g., 1, 5, or 9).
	// Hence if we're looking for control ID 5 we can't do
	// ASIGetControlCaps(camNum, 5, &ControlCaps) since there are only 3 elements in the array.
	for (int i = 0; i < iNumOfCtrl && i <= control; i++)	// controls are sorted 1 to n
	{
		ret = ASIGetControlCaps(camNum, i, &ControlCaps);
		if (ret != ASI_SUCCESS)
		{
			Log(-1, "WARNING: ASIGetControlCaps() for control %d failed: %s, camNum=%d, iNumOfCtrl=%d, control=%d\n", i, getRetCode(ret), camNum, iNumOfCtrl, (int) control);
			return(ret);
		}

		if (ControlCaps.ControlType == control)
		{
			if (ControlCaps.IsWritable)
			{
				if (value > ControlCaps.MaxValue)
				{
					Log(1, "WARNING: Value of %ld greater than max value allowed (%ld) for control '%s' (#%d).\n", value, ControlCaps.MaxValue, ControlCaps.Name, ControlCaps.ControlType);
					value = ControlCaps.MaxValue;
				} else if (value < ControlCaps.MinValue)
				{
					Log(1, "WARNING: Value of %ld less than min value allowed (%ld) for control '%s' (#%d).\n", value, ControlCaps.MinValue, ControlCaps.Name, ControlCaps.ControlType);
					value = ControlCaps.MinValue;
				}
			 	if (makeAuto == ASI_TRUE && ControlCaps.IsAutoSupported == ASI_FALSE)
				{
					Log(1, "WARNING: control '%s' (#%d) doesn't support auto mode.\n", ControlCaps.Name, ControlCaps.ControlType);
					makeAuto = ASI_FALSE;
				}
				ret = ASISetControlValue(camNum, control, value, makeAuto);
				if (ret != ASI_SUCCESS)
				{
					Log(-1, "WARNING: ASISetControlCaps() for control %d, value=%ld failed: %s\n", control, value, getRetCode(ret));
					return(ret);
				}
			} else {
				Log(0, "ERROR: ControlCap: '%s' (#%d) not writable; not setting to %ld.\n", ControlCaps.Name, ControlCaps.ControlType, value);
				ret = ASI_ERROR_INVALID_MODE;	// this seemed like the closest error
			}
			return ret;
		}
	}
	Log(2, "NOTICE: Camera does not support ControlCap # %d; not setting to %ld.\n", control, value);
	return ASI_ERROR_INVALID_CONTROL_TYPE;
}

//-------------------------------------------------------------------------------------------------------
//-------------------------------------------------------------------------------------------------------

void *Display(void *params)
{
	cv::Mat *pImg = (cv::Mat *)params;
	int w = pImg->cols;
	int h = pImg->rows;
	cv::namedWindow("Preview", cv::WINDOW_AUTOSIZE);
	cv::Mat Img2 = *pImg, *pImg2 = &Img2;

	while (bDisplay)
	{
		// default preview size usually fills whole screen, so shrink.
		cv::resize(*pImg, *pImg2, cv::Size((int)w/2, (int)h/2));
		cv::imshow("Preview", *pImg2);
		cv::waitKey(500);	// TODO: wait for exposure time instead of hard-coding value
	}
	cv::destroyWindow("Preview");
	Log(4, "Display thread over\n");
	return (void *)0;
}

void *SaveImgThd(void *para)
{
	while (bSaveRun)
	{
		pthread_mutex_lock(&mtxSaveImg);
		pthread_cond_wait(&condStartSave, &mtxSaveImg);

		if (gotSignal)
		{
			// we got a signal to exit, so don't save the (probably incomplete) image
			pthread_mutex_unlock(&mtxSaveImg);
			break;
		}

		bSavingImg = true;

		// I don't know how to cast "st" to 0, so call now() and ignore it.
		auto st = std::chrono::high_resolution_clock::now();
		auto et = st;

		bool result = false;
		if (pRgb.data)
		{
			char cmd[1100+strlen(CG.allskyHome)];
			Log(1, "  > Saving %s image '%s'\n", CG.takeDarkFrames ? "dark" : dayOrNight.c_str(), CG.finalFileName);
			snprintf(cmd, sizeof(cmd), "%s/scripts/saveImage.sh %s '%s'", CG.allskyHome, dayOrNight.c_str(), CG.fullFilename);
			add_variables_to_command(CG, cmd, exposureStartDateTime);
			strcat(cmd, " &");

			st = std::chrono::high_resolution_clock::now();
			try
			{
				result = imwrite(CG.fullFilename, pRgb, compressionParameters);
			}
			catch (const cv::Exception& ex)
			{
				Log(0, "*** ERROR: Exception saving image: %s\n", ex.what());
			}
			et = std::chrono::high_resolution_clock::now();

			if (result)
				system(cmd);
			else
				Log(0, "*** ERROR: Unable to save image '%s'.\n", CG.fullFilename);

		} else {
			// This can happen if the program is closed before the first picture.
			Log(0, "----- SaveImgThd(): pRgb.data is null\n");
		}
		bSavingImg = false;

		if (result)
		{
			static int totalSaves = 0;
			static double totalTime_ms = 0;
			totalSaves++;
// FIX: should be / ?
			long long diff_us = std::chrono::duration_cast<std::chrono::microseconds>(et - st).count();
			double diff_ms = diff_us / US_IN_MS;
			totalTime_ms += diff_ms;
			char const *x;
			if (diff_ms > 1 * MS_IN_SEC)
				x = "  > *****\n";	// indicate when it takes a REALLY long time to save
			else
				x = "";
			Log(3, "%s  > Image took %'.1f ms to save (average %'.1f ms).\n%s", x, diff_ms, totalTime_ms / totalSaves, x);
		}

		pthread_mutex_unlock(&mtxSaveImg);
	}

	return (void *)0;
}

long roundTo(long n, int roundTo)
{
	long a = (n / roundTo) * roundTo;	// Smaller multiple
	long b = a + roundTo;				// Larger multiple
	return (n - a > b - n)? b : a;		// Return of closest of two
}

#ifdef USE_HISTOGRAM
// As of July 2021, ZWO's SDK (version 1.9) has a bug where autoexposure daylight shots'
// exposures jump all over the place. One is way too dark and the next way too light, etc.
// As a workaround, our histogram code replaces ZWO's code auto-exposure mechanism.
// We look at the mean brightness of an X by X rectangle in image, and adjust exposure based on that.

// FIXME prevent this from misbehaving when unreasonable settings are given,
// eg. box size 0x0, box size WxW, box crosses image edge, ... basically
// anything that would read/write out-of-bounds

int computeHistogram(unsigned char *imageBuffer, config cg, int *histogram)
{
	int h, i;
	unsigned char *buf = imageBuffer;

	// Clear the histogram array.
	for (h = 0; h < 256; h++) {
		histogram[h] = 0;
	}

	// Different image types have a different number of bytes per pixel.
	cg.width *= currentBpp;
	int roiX1 = (cg.width * cg.HB.histogramBoxPercentFromLeft) - (cg.HB.currentHistogramBoxSizeX * currentBpp / 2);
	int roiX2 = roiX1 + (currentBpp * cg.HB.currentHistogramBoxSizeX);
	int roiY1 = (cg.height * cg.HB.histogramBoxPercentFromTop) - (cg.HB.currentHistogramBoxSizeY / 2);
	int roiY2 = roiY1 + cg.HB.currentHistogramBoxSizeY;

	// Start off and end on a logical pixel boundries.
	roiX1 = (roiX1 / currentBpp) * currentBpp;
	roiX2 = (roiX2 / currentBpp) * currentBpp;

	// For RGB24, data for each pixel is stored in 3 consecutive bytes: blue, green, red.
	// For all image types, each row in the image contains one row of pixels.
	// currentBpp doesn't apply to rows, just columns.
	switch (cg.imageType) {
	case IMG_RGB24:
	case IMG_RAW8:
	case IMG_Y8:
		for (int y = roiY1; y < roiY2; y++) {
			for (int x = roiX1; x < roiX2; x+=currentBpp) {
				i = (cg.width * y) + x;
				int total = 0;
				for (int z = 0; z < currentBpp; z++)
				{
					// For RGB24 this averages the blue, green, and red pixels.
					total += buf[i+z];
				}
				int avg = total / currentBpp;
				histogram[avg]++;
			}
		}
		break;
	case IMG_RAW16:
		for (int y = roiY1; y < roiY2; y++) {
			for (int x = roiX1; x < roiX2; x+=currentBpp) {
				i = (cg.width * y) + x;
				int pixelValue;
				// This assumes the image data is laid out in big endian format.
				// We are going to grab the most significant byte
				// and use that for the histogram value ignoring the
				// least significant byte so we can use the 256 value histogram array.
				// If it's acutally little endian then add a +1 to the array subscript for buf[i].
				pixelValue = buf[i];
				histogram[pixelValue]++;
			}
		}
		break;
	case ASI_IMG_END:
		break;
	}

	// Now calculate the mean.
	int meanBin = 0;
	int a = 0, b = 0;
	for (int h = 0; h < 256; h++) {
		a += (h+1) * histogram[h];
		b += histogram[h];
	}

	if (b == 0)
	{
		// This is one heck of a dark picture!
		return(0);
	}

	meanBin = a/b - 1;
	return meanBin;
}
#endif

// This is based on code from PHD2.
// Camera has 2 internal frame buffers we need to clear.
// The camera and/or driver will buffer frames and return the oldest one which
// could be very old. Read out all the buffered frames so the frame we get is current.
void flushBufferedImages(int cameraId, void *buf, size_t size)
{
	enum { NUM_IMAGE_BUFFERS = 2 };

	int numCleared;
	for (numCleared = 0; numCleared < NUM_IMAGE_BUFFERS; numCleared++)
	{
		ASI_ERROR_CODE status = ASIGetVideoData(cameraId, (unsigned char *) buf, size, 1);
/*xxxxx
		if (status != ASI_SUCCESS)
			break; // no more buffered frames
*/
		if (status != ASI_ERROR_TIMEOUT)	// Most are ASI_ERROR_TIMEOUT, so don't show them
			Log(3, "  > [Cleared buffer frame]: %s\n", getRetCode(status));
	}
}


// Next exposure suggested by the camera.
long suggestedNextExposure_us = 0;

// "auto" flag returned by ASIGetControlValue(), when we don't care what it is.
ASI_BOOL bAuto = ASI_FALSE;

ASI_BOOL wasAutoExposure = ASI_FALSE;
long bufferSize = NOT_SET;

ASI_ERROR_CODE takeOneExposure(config *cg, unsigned char *imageBuffer, int *histogram)
{
	if (imageBuffer == NULL) {
		return (ASI_ERROR_CODE) -1;
	}

	ASI_ERROR_CODE status;
	// ZWO recommends timeout = (exposure*2) + 500 ms
	// After some discussion, we're doing +5000ms to account for delays induced by
	// USB contention, such as that caused by heavy USB disk IO
	long timeout = ((cg->currentExposure_us * 2) / US_IN_MS) + 5000;	// timeout is in ms

	// This debug message isn't typcally needed since we already displayed a message about
	// starting a new exposure, and below we display the result when the exposure is done.
	Log(4, "    > %s to %s\n",
		wasAutoExposure == ASI_TRUE ? "Camera set auto-exposure" : "Exposure set",
		length_in_units(cg->currentExposure_us, true));

	setControl(cg->cameraNumber, ASI_EXPOSURE, cg->currentExposure_us, cg->currentAutoExposure ? ASI_TRUE :ASI_FALSE);

	flushBufferedImages(cg->cameraNumber, imageBuffer, bufferSize);

	if (cg->videoOffBetweenImages)
	{
		status = ASIStartVideoCapture(cg->cameraNumber);
	} else {
		status = ASI_SUCCESS;
	}

	if (status == ASI_SUCCESS) {
		// Make sure the actual time to take the picture is "close" to the requested time.
		auto tStart = std::chrono::high_resolution_clock::now();

		status = ASIGetVideoData(cg->cameraNumber, imageBuffer, bufferSize, timeout);
		if (cg->videoOffBetweenImages)
			(void) ASIStopVideoCapture(cg->cameraNumber);

		if (status != ASI_SUCCESS)
		{
			int exitCode;
			Log(0, "  > ERROR: Failed getting image: %s\n", getRetCode(status));

			// Check if we reached the maximum number of consective errors
			if (! checkMaxErrors(&exitCode, maxErrors))
			{
				closeUp(exitCode);
			}
		}
		else
		{
			// The timeToTakeImage_us should never be less than what was requested.
			// and shouldn't be less then the time taked plus overhead of setting up the shot.

			auto tElapsed = std::chrono::high_resolution_clock::now() - tStart;
			long timeToTakeImage_us = std::chrono::duration_cast<std::chrono::microseconds>(tElapsed).count();
			long diff_us = timeToTakeImage_us - cg->currentExposure_us;
			long threshold_us = 0;

			bool tooShort = false;
			if (diff_us < 0)
			{
				tooShort = true;			// WAY too short
			}
			else if (cg->currentExposure_us > (5 * US_IN_SEC))
			{
				// There is too much variance in the overhead of taking pictures to
				// accurately determine the actual time to take an image at short exposures,
				// so only check for long ones.
				// Testing shows there's about this much us overhead,
				// so subtract it to get our best estimate of the "actual" time.
				const int OVERHEAD = 340000;

				// Don't subtract if it would have made timeToTakeImage_us negative.
				if (timeToTakeImage_us > OVERHEAD)
					diff_us -= OVERHEAD;

				threshold_us = cg->currentExposure_us * 0.5;	// 50% seems like a good number
				if (abs(diff_us) > threshold_us)
					tooShort = true;
			}
			if (tooShort)
			{
				Log(1, "*** WARNING: Time to take exposure (%s) ",
					length_in_units(timeToTakeImage_us, true));
				Log(1, "differs from requested exposure time (%s) ",
					length_in_units(cg->currentExposure_us, true));
				Log(1, "by %s, ", length_in_units(diff_us, true));
				Log(1, "threshold=%'ld\n", length_in_units(threshold_us, true));
			}
			else
			{
				Log(4, "    > timeToTakeImage_us=%'ld us, diff_us=%'ld, threshold_us=%'ld\n", timeToTakeImage_us, diff_us, threshold_us);
			}

			numErrors = 0;
			long l;
			ASIGetControlValue(cg->cameraNumber, ASI_GAIN, &l, &bAuto);
			cg->lastGain = (double) l;

			debug_text[0] = '\0';

#ifdef USE_HISTOGRAM
			if (histogram != NULL)
			{
				cg->lastMean = (double)computeHistogram(imageBuffer, *cg, histogram);

				sprintf(debug_text, " @ mean %d", (int) cg->lastMean);
				if (cg->currentAutoGain && ! cg->takeDarkFrames)
				{
					char *p = debug_text + strlen(debug_text);
					sprintf(p, ", auto gain %ld", (long) cg->lastGain);
				}
			}
#endif
			cg->lastExposure_us = cg->currentExposure_us;
			// Per ZWO, when in manual-exposure mode, the returned exposure length should always
			// be equal to the requested length; in fact, "there's no need to call ASIGetControlValue()".
			// When in auto-exposure mode, the returned exposure length is what the driver thinks the
			// next exposure should be, and will eventually converge on the correct exposure.
			ASIGetControlValue(cg->cameraNumber, ASI_EXPOSURE, &suggestedNextExposure_us, &wasAutoExposure);
			Log(2, "  > Got image%s.", debug_text);
			if (cg->currentAutoExposure) Log(3, "  Suggested next exposure: %s", length_in_units(suggestedNextExposure_us, true));
			Log(2, "\n");

			long temp;
			ASIGetControlValue(cg->cameraNumber, ASI_TEMPERATURE, &temp, &bAuto);
			cg->lastSensorTemp = (long) ((double)temp / cg->divideTemperatureBy);
			if (cg->isColorCamera)
			{
				ASIGetControlValue(cg->cameraNumber, ASI_WB_R, &l, &bAuto);
				cg->lastWBR = (double) l;
				ASIGetControlValue(cg->cameraNumber, ASI_WB_B, &l, &bAuto);
				cg->lastWBB = (double) l;
			}

			if (cg->asiAutoBandwidth)
				ASIGetControlValue(cg->cameraNumber, ASI_BANDWIDTHOVERLOAD, &cg->lastAsiBandwidth, &wasAutoExposure);
		}
	}
	else {
		Log(0, "  > ERROR: Not fetching exposure data because status is %s\n", getRetCode(status));
	}

	return status;
}

bool adjustGain = false;	// Should we adjust the gain? Set by user on command line.
bool currentAdjustGain = false;	// Adjusting it right now?
int totalAdjustGain = 0;	// The total amount to adjust gain.
int perImageAdjustGain = 0;	// Amount of gain to adjust each image
int gainTransitionImages = 0;
int numGainChanges = 0;		// This is reset at every day/night and night/day transition.

// Reset the gain transition variables for the first transition image.
// This is called when the program first starts and at the beginning of every day/night transition.
// "dayOrNight" is the new value, e.g., if we just transitioned from day to night, it's "NIGHT".
bool resetGainTransitionVariables(config cg)
{
	if (adjustGain == false)
	{
		// determineGainChange() will never be called so no need to set any variables.
		return(false);
	}

	if (numExposures == 0)
	{
		// we don't adjust when the program first starts since there's nothing to transition from
		return(false);
	}

	// Determine the amount to adjust gain per image.
	// Do this once per day/night or night/day transition (i.e., numGainChanges == 0).
	// First determine how long an exposure and delay is, in seconds.
	// The user specifies the transition period in seconds,
	// but day exposure is in microseconds, night max is in milliseconds,
	// and delays are in milliseconds, so convert to seconds.
	float totalTimeInSec;
	if (dayOrNight == "DAY")
	{
		totalTimeInSec = (cg.dayExposure_us / US_IN_SEC) + (cg.dayDelay_ms / MS_IN_SEC);
	}
	else	// NIGHT
	{
		// At nightime if the exposure is less than the max, we wait until max has expired,
		// so use it instead of the exposure time.
		totalTimeInSec = (cg.nightMaxAutoExposure_us / US_IN_SEC) + (cg.nightDelay_ms / MS_IN_SEC);
	}

	gainTransitionImages = ceil(cg.gainTransitionTime / totalTimeInSec);
	if (gainTransitionImages == 0)
	{
		Log(-1, "*** INFORMATION: Not adjusting gain - your 'gaintransitiontime' (%d seconds) is less than the time to take one image plus its delay (%.1f seconds).\n", cg.gainTransitionTime, totalTimeInSec);
		return(false);
	}

	totalAdjustGain = cg.nightGain - cg.dayGain;
	perImageAdjustGain = ceil(totalAdjustGain / gainTransitionImages);	// spread evenly
	if (perImageAdjustGain == 0)
		perImageAdjustGain = totalAdjustGain;
	else
	{
		// Since we can't adust gain by fractions, see if there's any "left over" after gainTransitionImages.
		// For example, if totalAdjustGain is 7 and we're adjusting by 3 each of 2 times,
		// we need an extra transition to get the remaining 1 ((7 - (3 * 2)) == 1).
		if (gainTransitionImages * perImageAdjustGain < totalAdjustGain)
			gainTransitionImages++;		// this one will get the remaining amount
	}
	Log(4, " totalAdjustGain=%d, gainTransitionImages=%d\n", totalAdjustGain, gainTransitionImages);

	return(true);
}

// Determine the change in gain needed for smooth transitions between night and day.
// Gain during the day is usually 0 and at night is usually > 0.
// If auto-exposure is on for both, the first several night frames may be too bright at night
// because of the sudden (often large) increase in gain, or too dark at the night-to-day
// transition.
// Try to mitigate that by changing the gain over several images at each transition.

int determineGainChange(config cg)
{
	if (numGainChanges > gainTransitionImages || totalAdjustGain == 0)
	{
		// no more changes needed in this transition
		Log(4, "  xxxx No more gain changes needed.\n");
		currentAdjustGain = false;
		return(0);
	}

	numGainChanges++;
	int amt;	// amount to adjust gain on next picture
	if (dayOrNight == "DAY")
	{
		// During DAY, want to start out adding the full gain adjustment minus the increment on the first image,
		// then DECREASE by totalAdjustGain each exposure.
		// This assumes night gain is > day gain.
		amt = totalAdjustGain - (perImageAdjustGain * numGainChanges);
Log(4, ">> DAY: amt=%d, totalAdjustGain=%d, perImageAdjustGain=%d, numGainChanges=%d\n", amt, totalAdjustGain, perImageAdjustGain, numGainChanges);
		if (amt < 0)
		{
			amt = 0;
			totalAdjustGain = 0;	// we're done making changes
		}
	}
	else	// NIGHT
	{
		// During NIGHT, want to start out (nightGain-perImageAdjustGain),
		// then DECREASE by perImageAdjustGain each time, until we get to "nightGain".
		// This last image was at dayGain and we wen't to increase each image.
		amt = (perImageAdjustGain * numGainChanges) - totalAdjustGain;
		if (amt > 0)
		{
			amt = 0;
			totalAdjustGain = 0;	// we're done making changes
		}
	}

	Log(4, "Adjusting %s gain by %d on next picture to %d (currentGain=%2f); will be gain change # %d of %d.\n",
		dayOrNight.c_str(), amt, amt+(int)cg.currentGain, cg.currentGain, numGainChanges, gainTransitionImages);
	return(amt);
}

// Check if the maximum number of consecutive errors has been reached
bool checkMaxErrors(int *e, int maxErrors)
{
	// Once takeOneExposure() fails with a timeout, it seems to always fail,
	// even with extremely large timeout values, so apparently ASI_ERROR_TIMEOUT doesn't
	// necessarily mean it's timing out. Exit which will cause us to be restarted.
	numErrors++; sleep(2);
	if (numErrors >= maxErrors)
	{
		*e = EXIT_RESET_USB;		// exit code. Need to reset USB bus
		Log(0, "*** ERROR: Maximum number of consecutive errors of %d reached; capture program exited.\n", maxErrors);
		return(false);	// gets us out of inner and outer loop
	}
	return(true);
}

//-------------------------------------------------------------------------------------------------------
//-------------------------------------------------------------------------------------------------------

int main(int argc, char *argv[])
{
	CG.ME = argv[0];
	
	static char *a = getenv("ALLSKY_HOME");		// This must come before anything else
	if (a == NULL)
	{
		Log(0, "%s: ERROR: ALLSKY_HOME not set!\n", CG.ME);
		exit(EXIT_ERROR_STOP);
	}
	else
	{
		CG.allskyHome = a;
	}

	pthread_mutex_init(&mtxSaveImg, 0);
	pthread_cond_init(&condStartSave, 0);

	char bufTime[128]			= { 0 };
	char bufTemp[1024]			= { 0 };
	char const *bayer[]			= { "RG", "BG", "GR", "GB" };
	bool justTransitioned		= false;
	ASI_ERROR_CODE asiRetCode;				// used for return code from ASI functions.

	// Some settings have both day and night versions, some have only one version that applies to both,
	// and some have either a day OR night version but not both.
	// For settings with both versions we keep a "current" variable (e.g., "currentBin") that's either the day
	// or night version so the code doesn't always have to check if it's day or night.
	// The settings have either "day" or "night" in the name.
	// In theory, almost every setting could have both day and night versions (e.g., width & height),
	// but the chances of someone wanting different versions.

#ifdef USE_HISTOGRAM
	int maxHistogramAttempts	= 15;	// max number of times we'll try for a better histogram mean

	// If we just transitioned from night to day, it's possible currentExposure_us will
	// be MUCH greater than the daytime max (and will possibly be at the nighttime's max exposure).
	// So, decrease currentExposure_us by a certain amount of the difference between the two so
	// it takes several frames to reach the daytime max (which is now in currentMaxAutoExposure_us).

	// If we don't do this, we'll be stuck in a loop taking an exposure
	// that's over the max forever.

	// Note that it's likely getting lighter outside with every exposure
	// so the mean will eventually get into the valid range.
	const int percentChange		= 10.0;	// percent of ORIGINAL difference
#endif

	//-------------------------------------------------------------------------------------------------------
	//-------------------------------------------------------------------------------------------------------
	setlinebuf(stdout);					// Line buffer output so entries appear in the log immediately.

	CG.ct = ctZWO;
	if (! getCommandLineArguments(&CG, argc, argv))
	{
		// getCommandLineArguents outputs an error message.
		exit(EXIT_ERROR_STOP);
	}

	if (! CG.saveCC && ! CG.help)
	{
		displayHeader(CG);
	}

	doLocale(&CG);

	if (CG.help)
	{
		displayHelp(CG);
		closeUp(EXIT_OK);
	}

	processConnectedCameras();	// exits on error

	ASI_CAMERA_INFO ASICameraInfo;
	asiRetCode = ASIOpenCamera(CG.cameraNumber);
	if (asiRetCode != ASI_SUCCESS)
	{
		Log(0, "*** ERROR opening camera, check that you have root permissions! (%s)\n", getRetCode(asiRetCode));
		closeUp(EXIT_NO_CAMERA);
	}

	asiRetCode = ASIGetCameraProperty(&ASICameraInfo, CG.cameraNumber);
	if (asiRetCode != ASI_SUCCESS)
	{
		Log(0, "ERROR: ASIGetCamerProperty() returned: %s\n", getRetCode(asiRetCode));
		exit(EXIT_ERROR_STOP);
	}
	asiRetCode = ASIGetNumOfControls(CG.cameraNumber, &iNumOfCtrl);
	if (asiRetCode != ASI_SUCCESS)
	{
		Log(0, "ERROR: ASIGetNumOfControls() returned: %s\n", getRetCode(asiRetCode));
		exit(EXIT_ERROR_STOP);
	}
	CG.ASIversion = ASIGetSDKVersion();


	// Set defaults that depend on the camera type.
	if (! setDefaults(&CG, ASICameraInfo))
		closeUp(EXIT_ERROR_STOP);

	// Do argument error checking if we're not going to exit soon.
	if (! CG.saveCC && ! validateSettings(&CG, ASICameraInfo))
		closeUp(EXIT_ERROR_STOP);

	if (! checkForValidExtension(&CG)) {
		// checkForValidExtension() displayed the error message.
		closeUp(EXIT_ERROR_STOP);
	}


	int iMaxWidth, iMaxHeight;
	double pixelSize;
	iMaxWidth  = ASICameraInfo.MaxWidth;
	iMaxHeight = ASICameraInfo.MaxHeight;
	pixelSize  = ASICameraInfo.PixelSize;
	if (CG.width == 0 || CG.height == 0)
	{
		CG.width  = iMaxWidth;
		CG.height = iMaxHeight;
	}
	else
	{
		validateLong(&CG.width, 0, iMaxWidth, "Width", true);
		validateLong(&CG.height, 0, iMaxHeight, "Height", true);
	}

	long originalWidth  = CG.width;
	long originalHeight = CG.height;
	// Limit these to a reasonable value based on the size of the sensor.
	validateLong(&CG.overlay.iTextLineHeight, 0, (long)(iMaxHeight / 2), "Line Height", true);
	validateLong(&CG.overlay.iTextX, 0, (long)iMaxWidth - 10, "Text X", true);
	validateLong(&CG.overlay.iTextY, 0, (long)iMaxHeight - 10, "Text Y", true);
	validateFloat(&CG.overlay.fontsize, 0.1, iMaxHeight / 2, "Font Size", true);
	validateLong(&CG.overlay.linewidth, 0, (long)(iMaxWidth / 2), "Font Weight", true);

	if (CG.saveCC)
	{
		saveCameraInfo(ASICameraInfo, CG.CC_saveFile, iMaxWidth, iMaxHeight, pixelSize, bayer[ASICameraInfo.BayerPattern]);
		closeUp(EXIT_OK);
	}

	outputCameraInfo(ASICameraInfo, CG, iMaxWidth, iMaxHeight, pixelSize, bayer[ASICameraInfo.BayerPattern]);
	// checkExposureValues() must come after outputCameraInfo().
	(void) checkExposureValues(&CG);

#ifdef USE_HISTOGRAM
	// The histogram box needs to fit on the image.
	// If we're binning we'll decrease the size of the box accordingly.
	bool ok = true;
	if (CG.HB.sArgs[0] != '\0')
	{
		if (sscanf(CG.HB.sArgs, "%d %d %f %f", &CG.HB.histogramBoxSizeX, &CG.HB.histogramBoxSizeY, &CG.HB.histogramBoxPercentFromLeft, &CG.HB.histogramBoxPercentFromTop) != 4)
		{
			Log(0, "%s*** ERROR: Not enough histogram box parameters should be 4: '%s'%s\n", c(KRED), CG.HB.sArgs, c(KNRM));
			ok = false;
		} else {
			if (CG.HB.histogramBoxSizeX < 1 || CG.HB.histogramBoxSizeY < 1)
			{
				Log(0, "%s*** ERROR: Histogram box size must be > 0; you entered X=%d, Y=%d%s\n",
					c(KRED), CG.HB.histogramBoxSizeX, CG.HB.histogramBoxSizeY, c(KNRM));
				ok = false;
			}
			if (CG.HB.histogramBoxPercentFromLeft < 0.0 || CG.HB.histogramBoxPercentFromTop < 0.0)
			{
				Log(0, "%s*** ERROR: Histogram box percents must be > 0; you entered X=%.0f%%, Y=%.0f%%%s\n",
					c(KRED), (CG.HB.histogramBoxPercentFromLeft*100.0), (CG.HB.histogramBoxPercentFromTop*100.0), c(KNRM));
				ok = false;
			}
			else
			{
				// scale user-input 0-100 to 0.0-1.0
				CG.HB.histogramBoxPercentFromLeft /= 100;
				CG.HB.histogramBoxPercentFromTop /= 100;

				// Now check if the box fits the image.
				CG.HB.centerX = CG.width * CG.HB.histogramBoxPercentFromLeft;
				CG.HB.centerY = CG.height * CG.HB.histogramBoxPercentFromTop;
				CG.HB.leftOfBox = CG.HB.centerX - (CG.HB.histogramBoxSizeX / 2);
				CG.HB.rightOfBox = CG.HB.centerX + (CG.HB.histogramBoxSizeX / 2);
				CG.HB.topOfBox = CG.HB.centerY - (CG.HB.histogramBoxSizeY / 2);
				CG.HB.bottomOfBox = CG.HB.centerY + (CG.HB.histogramBoxSizeY / 2);
	
				if (CG.HB.leftOfBox < 0 || CG.HB.rightOfBox  >= CG.width ||
				    CG.HB.topOfBox  < 0 || CG.HB.bottomOfBox >= CG.height)
				{
					Log(0, "%s*** ERROR: Histogram box location must fit on image; upper left of box is %dx%d, lower right %dx%d%s\n", c(KRED), CG.HB.leftOfBox, CG.HB.topOfBox, CG.HB.rightOfBox, CG.HB.bottomOfBox, c(KNRM));
					ok = false;
				}	// else everything is hunky dory
			}
		}
	} else {
		Log(0, "%s*** ERROR: No values specified for histogram box%s\n", c(KRED), c(KNRM));
		ok = false;
	}

	if (! ok)
	{
		closeUp(EXIT_ERROR_STOP);	// force the user to fix it
	}
#endif

	asiRetCode = ASIInitCamera(CG.cameraNumber);
	if (asiRetCode != ASI_SUCCESS)
	{
		Log(0, "*** ERROR: Unable to initialise camera: %s\n", getRetCode(asiRetCode));
		closeUp(EXIT_ERROR_STOP);	// Can't do anything so might as well exit.
	}

	// Handle "auto" imageType.
	if (CG.imageType == AUTO_IMAGE_TYPE)
	{
		// If it's a color camera, create color pictures.
		// If it's a mono camera use RAW16 if the image file is a .png, otherwise use RAW8.
		// There is no good way to handle Y8 automatically so it has to be set manually.
		if (CG.isColorCamera)
			CG.imageType = IMG_RGB24;
		else if (strcmp(CG.imageExt, "png") == 0)
			CG.imageType = IMG_RAW16;
		else // jpg
			CG.imageType = IMG_RAW8;
	}

	if (CG.imageType == IMG_RAW16)
	{
		CG.sType = "RAW16";
		currentBpp = 2;
		CG.currentBitDepth = 16;
	}
	else if (CG.imageType == IMG_RGB24)
	{
		CG.sType = "RGB24";
		currentBpp = 3;
		CG.currentBitDepth = 8;
	}
	else if (CG.imageType == IMG_RAW8)
	{
		// Color cameras should use Y8 instead of RAW8. Y8 is the mono mode for color cameras.
		if (CG.isColorCamera)
		{
			CG.imageType = IMG_Y8;
			CG.sType = "Y8 (not RAW8 for color cameras)";
		}
		else
		{
			CG.sType = "RAW8";
		}
		currentBpp = 1;
		CG.currentBitDepth = 8;
	}
	else if (CG.imageType == IMG_Y8)
	{
		CG.sType = "Y8";
		currentBpp = 1;
		CG.currentBitDepth = 8;
	}
	else
	{
		Log(0, "*** ERROR: Unknown Image Type: %d\n", CG.imageType);
		closeUp(EXIT_ERROR_STOP);
	}

	//-------------------------------------------------------------------------------------------------------
	//-------------------------------------------------------------------------------------------------------

	displaySettings(CG);

	// These configurations apply to both day and night.
	// Other calls to setControl() are done after we know if we're in daytime or nighttime.
	if (CG.asiBandwidth != NOT_CHANGED)
		setControl(CG.cameraNumber, ASI_BANDWIDTHOVERLOAD, CG.asiBandwidth, CG.asiAutoBandwidth ? ASI_TRUE : ASI_FALSE);
	if (CG.gamma != NOT_CHANGED)
		setControl(CG.cameraNumber, ASI_GAMMA, CG.gamma, ASI_FALSE);
	if (CG.offset != NOT_CHANGED)
		setControl(CG.cameraNumber, ASI_OFFSET, CG.offset, ASI_FALSE);
	if (CG.flip != NOT_CHANGED)
		setControl(CG.cameraNumber, ASI_FLIP, CG.flip, ASI_FALSE);

	if (! bSaveRun && pthread_create(&hthdSave, 0, SaveImgThd, 0) == 0)
	{
		bSaveRun = true;
	}

	// Initialization
	int originalITextX		= CG.overlay.iTextX;
	int originalITextY		= CG.overlay.iTextY;
	int originalFontsize	= CG.overlay.fontsize;
	int originalLinewidth	= CG.overlay.linewidth;
	// Have we displayed "not taking picture during day" message, if applicable?
	bool displayedNoDaytimeMsg	= false;
	int gainChange				= 0;		// how much to change gain up or down

	// Display one-time messages.

	// If autogain is on, our adjustments to gain will get overwritten by the camera
	// so don't transition.
	// gainTransitionTime of 0 means don't adjust gain.
	// No need to adjust gain if day and night gain are the same.
	if (CG.dayAutoGain || CG.nightAutoGain || CG.gainTransitionTime == 0 || CG.dayGain == CG.nightGain || CG.takeDarkFrames)
	{
		adjustGain = false;
		Log(4, "Will NOT adjust gain at transitions\n");
	}
	else
	{
		adjustGain = true;
		Log(4, "Will adjust gain at transitions\n");
	}

	if (CG.overlay.ImgExtraText[0] != '\0' && CG.overlay.extraFileAge > 0) {
		Log(4, "Extra Text File Age Disabled So Displaying Anyway\n");
	}

	// Start taking pictures

	if (! CG.videoOffBetweenImages)
	{
		asiRetCode = ASIStartVideoCapture(CG.cameraNumber);
		if (asiRetCode != ASI_SUCCESS)
		{
			Log(0, "*** ERROR: Unable to start video capture: %s\n", getRetCode(asiRetCode));
			closeUp(EXIT_ERROR_STOP);
		}
	}

	while (bMain)
	{
		// Find out if it is currently DAY or NIGHT
		dayOrNight = calculateDayOrNight(CG.latitude, CG.longitude, CG.angle);
		std::string lastDayOrNight = dayOrNight;

		if (! CG.takeDarkFrames)
			currentAdjustGain = resetGainTransitionVariables(CG);

		if (CG.takeDarkFrames)
		{
			// We're doing dark frames so turn off autoexposure and autogain, and use
			// nightime gain, delay, max exposure, bin, and brightness to mimic a nightime shot.
			CG.currentSkipFrames = 0;
			CG.currentAutoExposure = false;
			CG.nightAutoExposure = false;
			CG.currentAutoGain = false;
			CG.currentGain = CG.nightGain;
			CG.currentMaxAutoGain = CG.nightMaxAutoGain;	// not needed since we're not using auto gain, but set to be consistent
			gainChange = 0;
			CG.currentDelay_ms = CG.nightDelay_ms;
			CG.currentMaxAutoExposure_us = CG.currentExposure_us = CG.nightMaxAutoExposure_us;
			CG.currentBin = CG.nightBin;
			CG.currentBrightness = CG.nightBrightness;
			if (CG.isColorCamera)
			{
				CG.currentAutoAWB = false;
				CG.currentWBR = CG.nightWBR;
				CG.currentWBB = CG.nightWBB;
			}
			if (CG.isCooledCamera)
			{
				CG.currentEnableCooler = CG.nightEnableCooler;
				CG.currentTargetTemp = CG.nightTargetTemp;
			}
			CG.myModeMeanSetting.currentMean = NOT_SET;
			CG.myModeMeanSetting.modeMean = false;
			CG.HB.useHistogram = false;

			Log(1, "Taking dark frames...\n");

			if (CG.notificationImages) {
				(void) displayNotificationImage("--expires 0 DarkFrames &");
			}
		}

		else if (dayOrNight == "DAY")
		{
			if (justTransitioned == true)
			{
				// Just transitioned from night to day, so execute end of night script
				Log(1, "Processing end of night data\n");
				snprintf(bufTemp, sizeof(bufTemp)-1, "%s/scripts/endOfNight.sh &", CG.allskyHome);
				system(bufTemp);
				justTransitioned = false;
				displayedNoDaytimeMsg = false;
			}

			if (! CG.daytimeCapture)
			{
				displayedNoDaytimeMsg = daytimeSleep(displayedNoDaytimeMsg, CG);

				// No need to do any of the code below so go back to the main loop.
				continue;
			}

			else
			{
				Log(1, "==========\n=== Starting daytime capture ===\n==========\n");

				// We only skip initial frames if we are starting in daytime and using auto-exposure.
				if (numExposures == 0 && CG.dayAutoExposure)
					CG.currentSkipFrames = CG.daySkipFrames;

				// If we went from Night to Day, then currentExposure_us will be the last night
				// exposure so leave it if we're using auto-exposure so there's a seamless change from
				// Night to Day, i.e., if the exposure was fine a minute ago it will likely be fine now.
				// On the other hand, if this program just started or we're using manual exposures,
				// use what the user specified.
				if (numExposures == 0 || ! CG.dayAutoExposure)
				{
					CG.currentExposure_us = CG.dayExposure_us;
				}
				else
				{
					// If gain changes, we have to change the exposure time to get an equally
					// exposed image.
					// ZWO gain has unit 0.1dB, so we have to convert the gain values to a factor first
					//		newExp =  (oldExp * oldGain) / newGain
					// e.g.		20s = (10s    * 2.0)     / (1.0) 

					// current values here are last night's values
					double oldGain = pow(10, CG.currentGain / 10.0 / 20.0);
					double newGain = pow(10, CG.dayGain / 10.0 / 20.0);
					Log(4, "Using the last night exposure (%s),", length_in_units(CG.currentExposure_us, true));
					CG.currentExposure_us = (CG.currentExposure_us * oldGain) / newGain;
					Log(4," old (%'2f) and new (%'2f) Gain to calculate new exposure of %s\n", oldGain, newGain, length_in_units(CG.currentExposure_us, true));
				}

				CG.currentMaxAutoExposure_us = CG.dayMaxAutoExposure_us;
				Log(4, "currentMaxAutoExposure_us set to daytime value of %s.\n", length_in_units(CG.currentMaxAutoExposure_us, true));
				if (CG.currentExposure_us > CG.currentMaxAutoExposure_us) {
					Log(3, "Decreasing currentExposure_us from %s", length_in_units(CG.currentExposure_us, true));
					Log(3, "to %s\n", length_in_units(CG.currentMaxAutoExposure_us, true));
					CG.currentExposure_us = CG.currentMaxAutoExposure_us;
				}
#ifdef USE_HISTOGRAM
				// Don't use camera auto-exposure since we mimic it ourselves.
				if (CG.dayAutoExposure)
				{
					CG.HB.useHistogram = true;
					Log(4, "Turning off ZWO auto-exposure to use Allsky auto-exposure.\n");
				}
				else
				{
					CG.HB.useHistogram = false;
				}
				// With the histogram method we NEVER use ZWO auto exposure - either the user said
				// not to, or we turn it off ourselves.
				CG.currentAutoExposure = false;
#else
				CG.currentAutoExposure = CG.dayAutoExposure;
				CG.HB.useHistogram = false;
#endif
				CG.currentBrightness = CG.dayBrightness;
				if (CG.isColorCamera)
				{
					CG.currentAutoAWB = CG.dayAutoAWB;
					CG.currentWBR = CG.dayWBR;
					CG.currentWBB = CG.dayWBB;
				}
				CG.currentDelay_ms = CG.dayDelay_ms;
				CG.currentBin = CG.dayBin;
				CG.currentGain = CG.dayGain;	// must come before determineGainChange() below
				CG.currentMaxAutoGain = CG.dayMaxAutoGain;
				if (currentAdjustGain)
				{
					// we did some nightime images so adjust gain
					numGainChanges = 0;
					gainChange = determineGainChange(CG);
				}
				else
				{
					gainChange = 0;
				}
				CG.currentAutoGain = CG.dayAutoGain;
				CG.myModeMeanSetting.currentMean = CG.myModeMeanSetting.dayMean;
				if (CG.isCooledCamera)
				{
					CG.currentEnableCooler = CG.dayEnableCooler;
					CG.currentTargetTemp = CG.dayTargetTemp;
				}
			}
		}

		else	// NIGHT
		{
			if (justTransitioned == true)
			{
				// Just transitioned from day to night, so execute end of day script
				Log(1, "Processing end of day data\n");
				snprintf(bufTemp, sizeof(bufTemp)-1, "%s/scripts/endOfDay.sh &", CG.allskyHome);
				system(bufTemp);
				justTransitioned = false;
			}

			Log(1, "==========\n=== Starting nighttime capture ===\n==========\n");

			// We only skip initial frames if we are starting in nighttime and using auto-exposure.
			if (numExposures == 0 && CG.nightAutoExposure)
				CG.currentSkipFrames = CG.nightSkipFrames;

			// Setup the night time capture parameters
			if (numExposures == 0 || ! CG.nightAutoExposure)
			{
				CG.currentExposure_us = CG.nightExposure_us;
			}

			CG.currentAutoExposure = CG.nightAutoExposure;
			CG.currentBrightness = CG.nightBrightness;
			if (CG.isColorCamera)
			{
				CG.currentAutoAWB = CG.nightAutoAWB;
				CG.currentWBR = CG.nightWBR;
				CG.currentWBB = CG.nightWBB;
			}
			CG.currentDelay_ms = CG.nightDelay_ms;
			CG.currentBin = CG.nightBin;
			CG.currentMaxAutoExposure_us = CG.nightMaxAutoExposure_us;
			CG.currentGain = CG.nightGain;	// must come before determineGainChange() below
			CG.currentMaxAutoGain = CG.nightMaxAutoGain;
			if (currentAdjustGain)
			{
				// we did some daytime images so adjust gain
				numGainChanges = 0;
				gainChange = determineGainChange(CG);
			}
			else
			{
				gainChange = 0;
			}
			CG.currentAutoGain = CG.nightAutoGain;
			CG.myModeMeanSetting.currentMean = CG.myModeMeanSetting.nightMean;
			if (CG.isCooledCamera)
			{
				CG.currentEnableCooler = CG.nightEnableCooler;
				CG.currentTargetTemp = CG.nightTargetTemp;
			}
			CG.HB.useHistogram = false;		// only used during day
		}
		// ========== Done with dark frams / day / night settings


		if (CG.myModeMeanSetting.currentMean > 0.0)
		{
			CG.myModeMeanSetting.modeMean = true;
/* TODO: FUTURE
			myModeMeanSetting.meanValue = CG.myModeMeanSetting.currentMean;
			if (! aegInit(cg, minExposure_us, CG.cameraMinGain, myRaspistillSetting, myModeMeanSetting))
			{
				closeUp(EXIT_ERROR_STOP);
			}
*/
		}
		else
		{
			CG.myModeMeanSetting.modeMean = false;
		}

		if (CG.isColorCamera)
		{
			setControl(CG.cameraNumber, ASI_WB_R, CG.currentWBR, CG.currentAutoAWB ? ASI_TRUE : ASI_FALSE);
			setControl(CG.cameraNumber, ASI_WB_B, CG.currentWBB, CG.currentAutoAWB ? ASI_TRUE : ASI_FALSE);
		}
		else if (! CG.currentAutoAWB && ! CG.takeDarkFrames)
		{
			// We only read the actual values if in auto white balance; since we're not, get them now.
			CG.lastWBR = CG.currentWBR;
			CG.lastWBB = CG.currentWBB;
		}
		if (CG.isCooledCamera)
		{
			asiRetCode = setControl(CG.cameraNumber, ASI_COOLER_ON, CG.currentEnableCooler ? ASI_TRUE : ASI_FALSE, ASI_FALSE);
			if (asiRetCode != ASI_SUCCESS)
			{
				Log(1, "%s", c(KYEL));
				Log(1, " WARNING: Could not change cooler state: %s; continuing.\n", getRetCode(asiRetCode));
				Log(1, "%s", c(KNRM));
			}
			asiRetCode = setControl(CG.cameraNumber, ASI_TARGET_TEMP, CG.currentTargetTemp, ASI_FALSE);
			if (asiRetCode != ASI_SUCCESS)
			{
				Log(1, "%s", c(KYEL));
				Log(1, " WARNING: Could not set cooler temperature: %s; continuing.\n", getRetCode(asiRetCode));
				Log(1, "%s", c(KNRM));
			}
		}

		setControl(CG.cameraNumber, ASI_GAIN, (long)CG.currentGain + gainChange, CG.currentAutoGain ? ASI_TRUE : ASI_FALSE);
		if (CG.currentAutoGain)
			setControl(CG.cameraNumber, ASI_AUTO_MAX_GAIN, CG.currentMaxAutoGain, ASI_FALSE);

		if (CG.currentAutoExposure)
		{
			setControl(CG.cameraNumber, ASI_AUTO_MAX_EXP, CG.currentMaxAutoExposure_us / US_IN_MS, ASI_FALSE);
			setControl(CG.cameraNumber, ASI_AUTO_TARGET_BRIGHTNESS, CG.currentBrightness, ASI_FALSE);
		}

#ifndef USE_HISTOGRAM
		setControl(CG.cameraNumber, ASI_EXPOSURE, CG.currentExposure_us, CG.currentAutoExposure ? ASI_TRUE : ASI_FALSE);
		// If not using histogram algorithm, ASI_EXPOSURE is set in takeOneExposure()
#endif

		if (numExposures == 0 || CG.dayBin != CG.nightBin)
		{
			// Adjusting variables for chosen binning.
			// Only need to do at the beginning and if bin changes.
			CG.height						= originalHeight / CG.currentBin;
			CG.width						= originalWidth / CG.currentBin;
			CG.overlay.iTextX				= originalITextX / CG.currentBin;
			CG.overlay.iTextY				= originalITextY / CG.currentBin;
			CG.overlay.fontsize				= originalFontsize / CG.currentBin;
			CG.overlay.linewidth			= originalLinewidth / CG.currentBin;
			CG.HB.currentHistogramBoxSizeX	= CG.HB.histogramBoxSizeX / CG.currentBin;
			CG.HB.currentHistogramBoxSizeY	= CG.HB.histogramBoxSizeY / CG.currentBin;

			bufferSize = CG.width * CG.height * currentBpp;

// TODO: if not the first time, should we free the old pRgb?
			if (CG.imageType == IMG_RAW16)
			{
				pRgb.create(cv::Size(CG.width, CG.height), CV_16UC1);
			}
			else if (CG.imageType == IMG_RGB24)
			{
				pRgb.create(cv::Size(CG.width, CG.height), CV_8UC3);
			}
			else // RAW8 and Y8
			{
				pRgb.create(cv::Size(CG.width, CG.height), CV_8UC1);
			}

// TODO: ASISetStartPos(CG.cameraNumber, from_left_xxx, from_top_xxx);	By default it's at the center.
// TODO: width % 8 must be 0. height % 2 must be 0.
// TODO: ASI120's (width*height) % 1024 must be 0
			asiRetCode = ASISetROIFormat(CG.cameraNumber, CG.width, CG.height, CG.currentBin, (ASI_IMG_TYPE)CG.imageType);
			if (asiRetCode != ASI_SUCCESS)
			{
				if (asiRetCode == ASI_ERROR_INVALID_SIZE)
				{
					Log(0, "*** ERROR: your camera does not support bin %dx%d.\n", CG.currentBin, CG.currentBin);
					closeUp(EXIT_ERROR_STOP);
				}
				else
				{
					Log(0, "*** ERROR: ASISetROIFormat(%d, %dx%d, %d, %d) failed (%s)\n", CG.cameraNumber, CG.width, CG.height, CG.currentBin, CG.imageType, getRetCode(asiRetCode));
					closeUp(EXIT_ERROR_STOP);
				}
			}
		}

		// Here and below, indent sub-messages with "  > " so it's clear they go with the un-indented line.
		// This simply makes it easier to see things in the log file.

#ifdef USE_HISTOGRAM
		int attempts = 0;
		int histogram[256];
#else
		int *histogram = NULL;
#endif

		// Wait for switch day time -> night time or night time -> day time
		while (bMain && lastDayOrNight == dayOrNight)
		{
			// date/time is added to many log entries to make it easier to associate them
			// with an image (which has the date/time in the filename).
			exposureStartDateTime = getTimeval();
			char exposureStart[128];
			snprintf(exposureStart, sizeof(exposureStart), "%s", formatTime(exposureStartDateTime, "%F %T"));
			// Unfortunately our histogram method only does exposure, not gain, so we
			// can't say what gain we are going to use.
			Log(2, "-----\n");
			Log(1, "STARTING EXPOSURE at: %s   @ %s\n", exposureStart, length_in_units(CG.currentExposure_us, true));

			// Get start time for overlay. Make sure it has the same time as exposureStart.
			if (CG.overlay.showTime)
			{
				sprintf(bufTime, "%s", formatTime(exposureStartDateTime, CG.timeFormat));
			}

			asiRetCode = takeOneExposure(&CG, pRgb.data, histogram);
			if (asiRetCode == ASI_SUCCESS)
			{
				numErrors = 0;
				numExposures++;

				CG.lastFocusMetric = CG.overlay.showFocus ? (int)round(get_focus_metric(pRgb)) : -1;

				if (numExposures == 0 && CG.preview)
				{
					// Start the preview thread at the last possible moment.
					bDisplay = true;
					pthread_create(&threadDisplay, NULL, Display, (void *)&pRgb);
				}

#ifdef USE_HISTOGRAM
				// We don't use this at night since the ZWO bug is only when it's light outside.
				if (CG.HB.useHistogram)
				{
					attempts = 0;

					int minAcceptableMean = MINMEAN;
					int maxAcceptableMean = MAXMEAN;
//xxx					int roundToMe = 5; // round exposures to this many microseconds

					long newExposure_us = 0;

					// histMinExposure_us is the min exposure used in the histogram calculation.
// xxx TODO: dump histMinExposure_us? Set tempMinExposure_us = cameraMinExposure_us ? ...
					long histMinExposure_us = CG.cameraMinExposure_us;
					long tempMinExposure_us = histMinExposure_us;
					long tempMaxExposure_us = CG.cameraMaxExposure_us;

					if (CG.currentBrightness != CG.defaultBrightness)
					{
						// Adjust brightness based on Brightness.
						// The default value has no adjustment.
						// The only way we can do this easily is via adjusting the exposure.
						// We could apply a stretch to the image, but that's more difficult.
						// Sure would be nice to see how ZWO handles this variable.
						// We asked but got a useless reply.
						// Values below the default make the image darker; above make it brighter.
						float exposureAdjustment = 1.0;

						// Adjustments of DEFAULT_BRIGHTNESS up or down make the image this much darker/lighter.
						// Don't want the max brightness to give pure white.
						//xxx May have to play with this number, but it seems to work ok.
						// 100 * this number is the percent to change.
						const float adjustmentAmountPerMultiple = 0.12;

						// The amount doesn't change after being set, so only display once.
						static bool showedMessage = false;
						if (! showedMessage)
						{
							float numMultiples;

							// Determine the adjustment amount - only done once.
							// See how many multiples we're different.
							// If currentBrightness < default then numMultiples will be negative,
							// which is ok - it just means the multiplier will be less than 1.

							numMultiples = (float)(CG.currentBrightness - CG.defaultBrightness) / CG.defaultBrightness;
							exposureAdjustment = 1 + (numMultiples * adjustmentAmountPerMultiple);
							Log(4, "  > >>> Adjusting exposure x %.2f (%.1f%%) for brightness\n", exposureAdjustment, (exposureAdjustment - 1) * 100);
							showedMessage = true;
						}

						// Now adjust the variables
// xxxxxxxxx TODO: don't adjust histMinExposure_us; just histogram numbers.
						histMinExposure_us *= exposureAdjustment;
						minAcceptableMean *= exposureAdjustment;
						maxAcceptableMean *= exposureAdjustment;
					}

					// Keep track of whether or not we're bouncing around, for example,
					// one exposure is less than the min and the second is greater than the max.
					// When that happens we don't want to set the min to the second exposure
					// or else we'll never get low enough.
					// Negative is below lower limit, positive is above upper limit.
					// Adjust the min or maxAcceptableMean depending on the aggression.
					int priorMean = CG.lastMean;
					int priorMeanDiff = 0;
					int adjustment = 0;

					int lastMeanDiff = 0;	// like priorMeanDiff but for next exposure

					if (CG.lastMean < minAcceptableMean)
					{
						priorMeanDiff = CG.lastMean - minAcceptableMean;
						// If we're skipping frames we want to get to a good exposure as fast as
						// possible so don't set an adjustment.
/*
						if (CG.aggression != 100 && CG.currentSkipFrames <= 0)
						{
// TODO: why are we adjusting the AcceptableMean?
							adjustment = priorMeanDiff * (1 - ((float)CG.aggression/100));
							if (adjustment < 1)
								minAcceptableMean += adjustment;
						}
*/
					}
					else if (CG.lastMean > maxAcceptableMean)
					{
// TODO: why not adjust here if needed?
						priorMeanDiff = CG.lastMean - maxAcceptableMean;
					}
					if (adjustment != 0)
					{
						Log(4, "  > !!! Adjusting %sAcceptableMean by %d to %d\n",
							adjustment < 0 ? "min" : "max",
							adjustment,
							adjustment < 0 ? minAcceptableMean : maxAcceptableMean);
					}

					int numPingPongs = 0;
//x					long lastExposure_us = CG.currentExposure_us;
					while ((CG.lastMean < minAcceptableMean || CG.lastMean > maxAcceptableMean) &&
						    ++attempts <= maxHistogramAttempts && CG.currentExposure_us <= CG.cameraMaxExposure_us)
					{
						int acceptable;
						float multiplier = 1.10;
						char const *acceptableType;
						if (CG.lastMean < minAcceptableMean) {
							acceptable = minAcceptableMean;
							acceptableType = "min";
						} else {
							acceptable = maxAcceptableMean;
							acceptableType = "max";
							multiplier = 1 / multiplier;
						}

						// if lastMean/acceptable is 9/90, it's 1/10th of the way there, so multiple exposure by 90/9 (10).
						// ZWO cameras don't appear to be linear so increase the multiplier amount some.
						float multiply;
						if (CG.lastMean == 0) {
							// TODO: is this correct?
							multiply = ((double)acceptable) * multiplier;
						} else {
							multiply = ((double)acceptable / CG.lastMean) * multiplier;
						}
// Log(4, "multiply=%f, acceptable=%d, lastMean=%f, multiplier=%f\n", multiply, acceptable, CG.lastMean, multiplier);
						long exposureDiff_us = (CG.lastExposure_us * multiply) - CG.lastExposure_us;

						// Adjust by aggression setting.
						if (CG.aggression != 100 && CG.currentSkipFrames <= 0)
						{
							if (exposureDiff_us != 0)
							{
								Log(4, "  > Next exposure change going from %s, ", length_in_units(exposureDiff_us, true));
								exposureDiff_us *= (float)CG.aggression / 100;
								Log(4, "before aggression to %s after.\n", length_in_units(exposureDiff_us, true));
							}
						}
						newExposure_us = CG.lastExposure_us + exposureDiff_us;
						if (newExposure_us > CG.currentMaxAutoExposure_us) {
							Log(4, "  > === Calculated newExposure_us (%'ld) > currentMaxAutoExposure_us (%'ld); setting to max\n", newExposure_us, CG.currentMaxAutoExposure_us);
							newExposure_us = CG.currentMaxAutoExposure_us;
						} else {
							Log(4, "    > Next exposure changing by %'ld us to %'ld (multiply by %.3f) [CG.lastExposure_us=%'ld, %sAcceptable=%d, lastMean=%d]\n",
								exposureDiff_us, newExposure_us, multiply, CG.lastExposure_us, acceptableType, acceptable, (int)CG.lastMean);
						}

						if (priorMeanDiff > 0 && lastMeanDiff < 0)
						{ 
							++numPingPongs;
							Log(2, " >xxx lastMean was %d and went from %d above max of %d to %d below min",
								priorMean, priorMeanDiff, maxAcceptableMean, -lastMeanDiff);
							Log(2, "  of %d, is now at %d; should NOT set temp min to currentExposure_us of %'ld\n",
								minAcceptableMean, (int)CG.lastMean, CG.currentExposure_us);
						} 
						else
						{
							if (priorMeanDiff < 0 && lastMeanDiff > 0)
							{
								++numPingPongs;
								Log(2, " >xxx mean was %d and went from %d below min of %d to %d above max",
									priorMean, -priorMeanDiff, minAcceptableMean, lastMeanDiff);
								Log(2, " of %d, is now at %d; OK to set temp max to currentExposure_us of %'ld\n",
									maxAcceptableMean, (int)CG.lastMean, CG.currentExposure_us);
							}
							else
							{
								numPingPongs = 0;
							} 

							if (CG.lastMean < minAcceptableMean)
							{
								tempMinExposure_us = CG.currentExposure_us;
							} 
							else if (CG.lastMean > maxAcceptableMean)
							{
								tempMaxExposure_us = CG.currentExposure_us;
							} 
						} 

						if (numPingPongs >= 3)
						{
printf(" > xxx newExposure_us=%s\n", length_in_units(newExposure_us, true));
printf("       CG.lastExposure_us=%s\n", length_in_units(CG.lastExposure_us, true));
							newExposure_us = (newExposure_us + CG.lastExposure_us) / 2;
long n = newExposure_us;
printf("       new newExposure_us=%s\n", length_in_units(n, true));
							Log(3, " > Ping-Ponged %d times, setting exposure to mid-point of %s\n", numPingPongs, length_in_units(newExposure_us, true));
						}

//xxx						newExposure_us = roundTo(newExposure_us, roundToMe);
						// Make sure newExposure_us is between min and max.
						newExposure_us = std::max(tempMinExposure_us, newExposure_us);
						newExposure_us = std::min(tempMaxExposure_us, newExposure_us);

						if (newExposure_us == CG.currentExposure_us)
						{
							break;
						}

						CG.currentExposure_us = newExposure_us;
						if (CG.currentExposure_us > CG.cameraMaxExposure_us)
						{
							break;
						}

						Log(2, "  >> Retry %i @ %'ld us, min=%'ld us, max=%'ld us: lastMean (%d)\n",
							attempts, newExposure_us, tempMinExposure_us, tempMaxExposure_us, (int)CG.lastMean);

						priorMean = CG.lastMean;
						priorMeanDiff = lastMeanDiff;

						asiRetCode = takeOneExposure(&CG, pRgb.data, histogram);
						if (asiRetCode == ASI_SUCCESS)
						{
//x							lastExposure_us = CG.lastExposure_us;

							if (CG.lastMean < minAcceptableMean)
								lastMeanDiff = CG.lastMean - minAcceptableMean;
							else if (CG.lastMean > maxAcceptableMean)
								lastMeanDiff = CG.lastMean - maxAcceptableMean;
							else
								lastMeanDiff = 0;

							continue;
						}
						else
						{
							break;
						}
					} // end of "Retry" loop

					if (asiRetCode != ASI_SUCCESS)
					{
						Log(2,"  > Sleeping %s from failed exposure\n", length_in_units(CG.currentDelay_ms * US_IN_MS, false));
						usleep(CG.currentDelay_ms * US_IN_MS);
						// Don't save the file or do anything below.
						continue;
					}

					if (CG.lastMean >= minAcceptableMean && CG.lastMean <= maxAcceptableMean)
					{
						// +++ at end makes it easier to see in log file
						Log(2, "  > Good image: mean within range of %d to %d ++++++++++, mean %d\n", minAcceptableMean, maxAcceptableMean, (int)CG.lastMean);
					}
					else if (attempts > maxHistogramAttempts)
					{
						 Log(2, "  > max attempts reached - using exposure of %s with mean %d\n", length_in_units(CG.currentExposure_us, true), (int)CG.lastMean);
					}
					else if (attempts >= 1)
					{
						if (CG.currentExposure_us < CG.cameraMinExposure_us)
						{
							 // If we call length_in_units() twice in same command line they both return the last value.
							Log(2, "  > Stopped trying: new exposure of %s ", length_in_units(CG.currentExposure_us, false));
							Log(2, "would be over min of %s\n", length_in_units(CG.cameraMinExposure_us, false));

							long diff = (long)((float)CG.currentExposure_us * (1/(float)percentChange));
							CG.currentExposure_us += diff;
							Log(3, "  > Increasing next exposure by %d%% (%'ld us) to %'ld\n", percentChange, diff, CG.currentExposure_us);
						}
						else if (CG.currentExposure_us > CG.cameraMaxExposure_us)
						{
							Log(2, "  > Stopped trying: new exposure of %s ", length_in_units(CG.currentExposure_us, false));
							Log(2, "would be over max of %s\n", length_in_units(CG.cameraMaxExposure_us, false));

							long diff = (long)((float)CG.currentExposure_us * (1/(float)percentChange));
							CG.currentExposure_us -= diff;
							Log(3, "  > Decreasing next exposure by %d%% (%'ld us) to %'ld\n", percentChange, diff, CG.currentExposure_us);
						}
						else if (CG.currentExposure_us == CG.cameraMinExposure_us)
						{
							Log(2, "  > Stopped trying: hit min exposure limit of %s, mean %d\n", length_in_units(CG.cameraMinExposure_us, false), (int)CG.lastMean);
							// If currentExposure_us causes too low of a mean, increase exposure
							// so on the next loop we'll adjust it.
							if (CG.lastMean < minAcceptableMean)
								CG.currentExposure_us++;
						}
						else if (CG.currentExposure_us == CG.currentMaxAutoExposure_us)
						{
							Log(2, "  > Stopped trying: hit max exposure limit of %s, mean %d\n", length_in_units(CG.currentMaxAutoExposure_us, false), (int)CG.lastMean);
							// If currentExposure_us causes too high of a mean, decrease exposure
							// so on the next loop we'll adjust it.
							if (CG.lastMean > maxAcceptableMean)
								CG.currentExposure_us--;
						}
						else if (newExposure_us == CG.currentExposure_us)
						{
							Log(2, "  > Stopped trying: newExposure_us == currentExposure_us == %s\n",
								length_in_units(CG.currentExposure_us, false));
						}
						else
						{
							Log(2, "  > Stopped trying, using exposure of %s with mean %d, min=%d, max=%d\n",
								length_in_units(CG.currentExposure_us, false), (int)CG.lastMean, minAcceptableMean, maxAcceptableMean);
						}
						 
					}
					else if (CG.currentExposure_us == CG.cameraMinExposure_us)
					{
						Log(3, "  > Did not make any additional attempts - at min exposure limit of %s, mean %d\n",
							length_in_units(CG.cameraMinExposure_us, false), (int)CG.lastMean);
					}
					else if (CG.currentExposure_us == CG.cameraMaxExposure_us)
					{
						Log(3, "  > Did not make any additional attempts - at max exposure limit of %s, mean %d\n",
							length_in_units(CG.cameraMaxExposure_us, false), (int)CG.lastMean);
					}

				} else {
					// Didn't use histogram method.
					// If we used auto-exposure, set the next exposure to what the camera driver
					// thinks the next exposure should be.
					// But temper it by the aggression value so we don't bounce up and down.
					if (CG.currentAutoExposure)
					{
						// If we're skipping frames we want to get to a good exposure as fast as
						// possible so don't set an adjustment.
						if (CG.aggression != 100 && CG.currentSkipFrames <= 0)
						{
							long exposureDiff_us, diff_us;
							diff_us = suggestedNextExposure_us - CG.currentExposure_us;
							exposureDiff_us = diff_us * (float)CG.aggression / 100;
							if (exposureDiff_us != 0)
							{
								Log(4, "  > Next exposure full change is %s, ", length_in_units(diff_us, true));
								Log(4, "after aggression: %s ", length_in_units(exposureDiff_us, true));
								Log(4, "from %s ", length_in_units(CG.currentExposure_us, true));
								CG.currentExposure_us += exposureDiff_us;
								Log(4, "to %s\n", length_in_units(CG.currentExposure_us, true));
							}
						}
						else
						{
							CG.currentExposure_us = suggestedNextExposure_us;
						}
					}
					else
					{
						// Didn't use auto-exposure - don't change exposure
					}
				}
#endif
				if (CG.currentSkipFrames > 0)
				{
#ifdef USE_HISTOGRAM
					// If we're already at a good exposure, or the last exposure was longer
					// than the max, don't skip any more frames.
// xxx TODO: should we have a separate variable to define "too long" instead of currentMaxAutoExposure_us?
					if ((CG.lastMean >= MINMEAN && CG.lastMean <= MAXMEAN) || CG.lastExposure_us > CG.currentMaxAutoExposure_us)
					{
						CG.currentSkipFrames = 0;
					}
					else
#endif
					{
						CG.currentSkipFrames--;
						Log(2, "  >>>> Skipping this frame.  %d left to skip\n", CG.currentSkipFrames);
						// Do not save this frame or sleep after it.
						// We just started taking images so no need to check if DAY or NIGHT changed
						continue;
					}
				}

				// If takeDarkFrames is off, add overlay text to the image
				if (! CG.takeDarkFrames)
				{
					if (CG.overlay.overlayMethod == OVERLAY_METHOD_LEGACY)
					{
						(void) doOverlay(pRgb, CG, bufTime, gainChange);

#ifdef USE_HISTOGRAM
						if (CG.overlay.showHistogramBox)
						{
							// Draw a rectangle where the histogram box is.
							// Put a black and white line one next to each other so they
							// can be seen in light and dark images.
							int lt = cv::LINE_AA, thickness = 2;
							int X1 = (CG.width * CG.HB.histogramBoxPercentFromLeft) - (CG.HB.histogramBoxSizeX / 2);
							int X2 = X1 + CG.HB.histogramBoxSizeX;
							int Y1 = (CG.height * CG.HB.histogramBoxPercentFromTop) - (CG.HB.histogramBoxSizeY / 2);
							int Y2 = Y1 + CG.HB.histogramBoxSizeY;
							cv::Scalar outerLine, innerLine;
							outerLine = cv::Scalar(0,0,0);
							innerLine = cv::Scalar(255,255,255);
							cv::rectangle(pRgb, cv::Point(X1, Y1), cv::Point(X2, Y2), outerLine, thickness, lt, 0);
							cv::rectangle(pRgb, cv::Point(X1+thickness, Y1+thickness), cv::Point(X2-thickness, Y2-thickness), innerLine, thickness, lt, 0);
						}
#endif
					}
					if (currentAdjustGain)
					{
						// Determine if we need to change the gain on the next image.
						// This must come AFTER the "showGain" above.
						gainChange = determineGainChange(CG);
						setControl(CG.cameraNumber, ASI_GAIN, CG.currentGain + gainChange, CG.currentAutoGain ? ASI_TRUE : ASI_FALSE);
					}
				}

#ifndef USE_HISTOGRAM
				if (CG.currentAutoExposure)
				{
					// Retrieve the current Exposure for smooth transition to night time
					// as long as auto-exposure is enabled during night time
					CG.currentExposure_us = CG.lastExposure_us;
				}
#endif

				// Save the image
				if (! bSavingImg)
				{
					// For dark frames we already know the finalFilename.
					if (! CG.takeDarkFrames)
					{
						// Create the name of the file that goes in the images/<date> directory.
						snprintf(CG.finalFileName, sizeof(CG.finalFileName), "%s-%s.%s",
							CG.fileNameOnly, formatTime(exposureStartDateTime, "%Y%m%d%H%M%S"), CG.imageExt);
						snprintf(CG.fullFilename, sizeof(CG.fullFilename), "%s/%s", CG.saveDir, CG.finalFileName);
					}

					pthread_mutex_lock(&mtxSaveImg);
					pthread_cond_signal(&condStartSave);
					pthread_mutex_unlock(&mtxSaveImg);
				}
				else
				{
					// Hopefully the user can use the time it took to save a file to disk
					// to help determine why they are getting this warning.
					// Perhaps their disk is very slow or their delay is too short.
					Log(1, "  > WARNING: currently saving an image; can't save new one at %s.\n", exposureStart);

					// TODO: wait for the prior image to finish saving.
				}

#ifndef USE_HISTOGRAM

				if (CG.currentAutoExposure && dayOrNight == "DAY")
				{
					CG.currentExposure_us = CG.lastExposure_us;
				}
#endif
				std::string s;
				if (CG.currentAutoExposure)
				{
					s = "auto";
				}
				else
				{
					s = "manual";
#ifdef USE_HISTOGRAM
					if (CG.HB.useHistogram)
						s = "histogram";
#endif
				}
				// Delay applied before next exposure
				delayBetweenImages(CG, CG.lastExposure_us, s);

				dayOrNight = calculateDayOrNight(CG.latitude, CG.longitude, CG.angle);
			}
		}

		if (lastDayOrNight != dayOrNight)
			justTransitioned = true;
	}

	closeUp(EXIT_OK);
}
