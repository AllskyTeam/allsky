#include <opencv2/core.hpp>
#include <opencv2/imgproc.hpp>
#include <opencv2/highgui.hpp>
#include "include/ASICamera2.h"
#include <sys/time.h>
#include <sys/stat.h>
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

#include "include/allsky_common.h"

config cg;					// holds all configuration variables

#define CAMERA_TYPE			"ZWO"
#define IS_ZWO
#include "ASI_functions.cpp"

#define USE_HISTOGRAM		// use the histogram code as a workaround to ZWO's bug

// Define's specific to this camera type.  Others that apply to all camera types are in allsky_common.h
#define DEFAULT_BRIGHTNESS		100

#ifdef USE_HISTOGRAM
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
long actualWBR					= NOT_SET;						// actual values per camera
long actualWBB					= NOT_SET;
long actualTemp					= NOT_SET;
long actualGain					= NOT_SET;
timeval exposureStartDateTime;									// date/time an image started
char allskyHome[100]			= { 0 };

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
long lastExposure_us			= 0;				// last exposure taken
int currentBpp					= NOT_SET;			// bytes per pixel: 8, 16, or 24
int currentBitDepth				= NOT_SET;			// 8 or 16
int focusMetric					= NOT_SET;
int mean						= NOT_SET;			// histogram mean

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
			Log(-1, "WARNING: ASIGetControlCaps() for control %d failed: %s\n", i, getRetCode(ret));
			return(ret);
		}

		if (ControlCaps.ControlType == control)
		{
			if (ControlCaps.IsWritable)
			{
				if (value > ControlCaps.MaxValue)
				{
					printf("WARNING: Value of %ld greater than max value allowed (%ld) for control '%s' (#%d).\n", value, ControlCaps.MaxValue, ControlCaps.Name, ControlCaps.ControlType);
					value = ControlCaps.MaxValue;
				} else if (value < ControlCaps.MinValue)
				{
					printf("WARNING: Value of %ld less than min value allowed (%ld) for control '%s' (#%d).\n", value, ControlCaps.MinValue, ControlCaps.Name, ControlCaps.ControlType);
					value = ControlCaps.MinValue;
				}
			 	if (makeAuto == ASI_TRUE && ControlCaps.IsAutoSupported == ASI_FALSE)
				{
					printf("WARNING: control '%s' (#%d) doesn't support auto mode.\n", ControlCaps.Name, ControlCaps.ControlType);
					makeAuto = ASI_FALSE;
				}
				ret = ASISetControlValue(camNum, control, value, makeAuto);
				if (ret != ASI_SUCCESS)
				{
					Log(-1, "WARNING: ASISetControlCaps() for control %d, value=%ld failed: %s\n", control, value, getRetCode(ret));
					return(ret);
				}
			} else {
				printf("ERROR: ControlCap: '%s' (#%d) not writable; not setting to %ld.\n", ControlCaps.Name, ControlCaps.ControlType, value);
				ret = ASI_ERROR_INVALID_MODE;	// this seemed like the closest error
			}
			return ret;
		}
	}
	Log(3, "NOTICE: Camera does not support ControlCap # %d; not setting to %ld.\n", control, value);
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
	printf("Display thread over\n");
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

		int64 st, et;

		bool result = false;
		if (pRgb.data)
		{
			char cmd[1100+sizeof(allskyHome)];
			Log(1, "  > Saving %s image '%s'\n", cg.takingDarkFrames ? "dark" : dayOrNight.c_str(), cg.finalFileName);
			snprintf(cmd, sizeof(cmd), "%sscripts/saveImage.sh %s '%s'", allskyHome, dayOrNight.c_str(), cg.fullFilename);
			add_variables_to_command(cmd, exposureStartDateTime,
				lastExposure_us, cg.currentBrightness, mean,
				cg.currentAutoExposure, cg.currentAutoGain,
				cg.currentAutoAWB, actualWBR, actualWBB,
				actualTemp, actualGain, cg.currentBin, getFlip(cg.flip), currentBitDepth, focusMetric);
			strcat(cmd, " &");

			st = cv::getTickCount();
			try
			{
				result = imwrite(cg.fullFilename, pRgb, compressionParameters);
			}
			catch (const cv::Exception& ex)
			{
				printf("*** ERROR: Exception saving image: %s\n", ex.what());
			}
			et = cv::getTickCount();

			if (result)
				system(cmd);
			else
				printf("*** ERROR: Unable to save image '%s'.\n", cg.fullFilename);

		} else {
			// This can happen if the program is closed before the first picture.
			Log(2, "----- SaveImgThd(): pRgb.data is null\n");
		}
		bSavingImg = false;

		if (result)
		{
			static int totalSaves = 0;
			static double totalTime_ms = 0;
			totalSaves++;
			double diff = time_diff_us(st, et) * US_IN_MS;	// we want ms
			totalTime_ms += diff;
			char const *x;
			if (diff > 1 * MS_IN_SEC)
				x = "  > *****\n";	// indicate when it takes a REALLY long time to save
			else
				x = "";
			Log(4, "%s  > Image took %'.1f ms to save (average %'.1f ms).\n%s", x, diff, totalTime_ms / totalSaves, x);
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

int computeHistogram(unsigned char *imageBuffer, long width, long height, ASI_IMG_TYPE imageType, int *histogram)
{
	int h, i;
	unsigned char *buf = imageBuffer;

	// Clear the histogram array.
	for (h = 0; h < 256; h++) {
		histogram[h] = 0;
	}

	// Different image types have a different number of bytes per pixel.
	width *= currentBpp;
	int roiX1 = (width * cg.HB.histogramBoxPercentFromLeft) - (cg.HB.currentHistogramBoxSizeX * currentBpp / 2);
	int roiX2 = roiX1 + (currentBpp * cg.HB.currentHistogramBoxSizeX);
	int roiY1 = (height * cg.HB.histogramBoxPercentFromTop) - (cg.HB.currentHistogramBoxSizeY / 2);
	int roiY2 = roiY1 + cg.HB.currentHistogramBoxSizeY;

	// Start off and end on a logical pixel boundries.
	roiX1 = (roiX1 / currentBpp) * currentBpp;
	roiX2 = (roiX2 / currentBpp) * currentBpp;

	// For RGB24, data for each pixel is stored in 3 consecutive bytes: blue, green, red.
	// For all image types, each row in the image contains one row of pixels.
	// currentBpp doesn't apply to rows, just columns.
	switch (imageType) {
	case IMG_RGB24:
	case IMG_RAW8:
	case IMG_Y8:
		for (int y = roiY1; y < roiY2; y++) {
			for (int x = roiX1; x < roiX2; x+=currentBpp) {
				i = (width * y) + x;
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
				i = (width * y) + x;
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
		if (status != ASI_SUCCESS)
			break; // no more buffered frames
		Log(3, "  > [Cleared buffer frame]\n");
	}
}


long reportedExposure_us = 0;	// exposure reported by the camera, either actual exposure or suggested next one
ASI_BOOL bAuto = ASI_FALSE;		// "auto" flag returned by ASIGetControlValue, when we don't care what it is

ASI_BOOL wasAutoExposure = ASI_FALSE;
long bufferSize = NOT_SET;

ASI_ERROR_CODE takeOneExposure(
		config cg,
		unsigned char *imageBuffer,		// where to put image
		int *histogram,
		int *mean)
{
	if (imageBuffer == NULL) {
		return (ASI_ERROR_CODE) -1;
	}

	ASI_ERROR_CODE status;
	// ZWO recommends timeout = (exposure*2) + 500 ms
	// After some discussion, we're doing +5000ms to account for delays induced by
	// USB contention, such as that caused by heavy USB disk IO
	long timeout = ((cg.currentExposure_us * 2) / US_IN_MS) + 5000;	// timeout is in ms

	if (cg.currentAutoExposure && cg.currentExposure_us > cg.currentMaxAutoExposure_us)
	{
		// If we call length_in_units() twice in same command line they both return the last value.
		char x[100];
		snprintf(x, sizeof(x), "%s", length_in_units(cg.currentExposure_us, true));
		Log(0, "*** WARNING: cg.currentExposure_us requested [%s] > currentMaxAutoExposure_us [%s]\n", x, length_in_units(cg.currentMaxAutoExposure_us, true));
		cg.currentExposure_us = cg.currentMaxAutoExposure_us;
	}

	// This debug message isn't typcally needed since we already displayed a message about
	// starting a new exposure, and below we display the result when the exposure is done.
	Log(4, "  > %s to %s\n",
		wasAutoExposure == ASI_TRUE ? "Camera set auto-exposure" : "Exposure set",
		length_in_units(cg.currentExposure_us, true));

	setControl(cg.cameraNumber, ASI_EXPOSURE, cg.currentExposure_us, cg.currentAutoExposure ? ASI_TRUE :ASI_FALSE);

	flushBufferedImages(cg.cameraNumber, imageBuffer, bufferSize);

	if (cg.videoOffBetweenImages)
	{
		status = ASIStartVideoCapture(cg.cameraNumber);
	} else {
		status = ASI_SUCCESS;
	}

	if (status == ASI_SUCCESS) {
		// Make sure the actual time to take the picture is "close" to the requested time.
		timeval tStart;
		if (cg.currentExposure_us > (5 * US_IN_SEC)) tStart = getTimeval();

		status = ASIGetVideoData(cg.cameraNumber, imageBuffer, bufferSize, timeout);
		if (cg.videoOffBetweenImages)
			(void) ASIStopVideoCapture(cg.cameraNumber);

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
			// There is too much variance in the overhead of taking a picture to accurately
			// determine the time to take an image at short exposures, so only check for longer ones.
			long timeToTakeImage_us = timeval_diff_us(tStart, getTimeval());
			if (timeToTakeImage_us < cg.currentExposure_us && cg.currentExposure_us > (5 * US_IN_SEC))
			{
				// Testing shows there's about this much us overhead, so subtract it to get actual time.
				const int OVERHEAD = 450000;
				if (timeToTakeImage_us > OVERHEAD)	// don't subtract if it makes timeToTakeImage_us negative
					timeToTakeImage_us -= OVERHEAD;
				long diff_us = timeToTakeImage_us - cg.currentExposure_us;
				long threshold_us = cg.currentExposure_us * 0.5;		// 50% seems like a good number
				if (abs(diff_us) > threshold_us)
				{
					Log(1, "*** WARNING: time to take image (%s) ", length_in_units(timeToTakeImage_us, true));
					Log(1, "differs from requested exposure time (%s) ", length_in_units(cg.currentExposure_us, true));
					Log(1, "by %s, ", length_in_units(diff_us, true));
					Log(1, "threshold=%'ld\n", length_in_units(threshold_us, true));
				}
			}

			numErrors = 0;
			ASIGetControlValue(cg.cameraNumber, ASI_GAIN, &actualGain, &bAuto);
			debug_text[0] = '\0';
#ifdef USE_HISTOGRAM
			if (histogram != NULL && mean != NULL)
			{
				*mean = computeHistogram(imageBuffer, cg.width, cg.height, (ASI_IMG_TYPE) cg.imageType, histogram);
				sprintf(debug_text, " @ mean %d", *mean);
				if (cg.currentAutoGain && ! cg.takingDarkFrames)
				{
					char *p = debug_text + strlen(debug_text);
					sprintf(p, ", auto gain %ld", actualGain);
				}
			}
#endif
			lastExposure_us = cg.currentExposure_us;
			// Per ZWO, when in manual-exposure mode, the returned exposure length should always
			// be equal to the requested length; in fact, "there's no need to call ASIGetControlValue()".
			// When in auto-exposure mode, the returned exposure length is what the driver thinks the
			// next exposure should be, and will eventually converge on the correct exposure.
			ASIGetControlValue(cg.cameraNumber, ASI_EXPOSURE, &reportedExposure_us, &wasAutoExposure);
			Log(3, "  > Got image%s.  Returned exposure: %s\n", debug_text, length_in_units(reportedExposure_us, true));

			// If this was a manual exposure, make sure it took the correct exposure.
			// Per ZWO, this should never happen.
			if (wasAutoExposure == ASI_FALSE && cg.currentExposure_us != reportedExposure_us)
			{
				Log(0, "  > WARNING: not correct exposure (requested: %'ld us, reported: %'ld us, diff: %'ld)\n", cg.currentExposure_us, reportedExposure_us, reportedExposure_us - cg.currentExposure_us);
			}
			ASIGetControlValue(cg.cameraNumber, ASI_TEMPERATURE, &actualTemp, &bAuto);
			if (cg.isColorCamera)
			{
				ASIGetControlValue(cg.cameraNumber, ASI_WB_R, &actualWBR, &bAuto);
				ASIGetControlValue(cg.cameraNumber, ASI_WB_B, &actualWBB, &bAuto);
			}
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
bool resetGainTransitionVariables(int dayGain, int nightGain)
{
	// Many of the "xxx" messages below will go away once we're sure gain transition works.
	Log(5, "xxx resetGainTransitionVariables(%d, %d) called at %s\n", dayGain, nightGain, dayOrNight.c_str());

	if (adjustGain == false)
	{
		// determineGainChange() will never be called so no need to set any variables.
		Log(5, "xxx will not adjust gain - adjustGain == false\n");
		return(false);
	}

	if (numExposures == 0)
	{
		// we don't adjust when the program first starts since there's nothing to transition from
		Log(5, "xxx will not adjust gain right now - numExposures == 0\n");
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
		Log(5, "xxx totalTimeInSec=%.1fs, dayExposure_us=%'ldus , daydelay_ms=%'dms\n", totalTimeInSec, cg.dayExposure_us, cg.dayDelay_ms);
	}
	else	// NIGHT
	{
		// At nightime if the exposure is less than the max, we wait until max has expired,
		// so use it instead of the exposure time.
		totalTimeInSec = (cg.nightMaxAutoExposure_us / US_IN_SEC) + (cg.nightDelay_ms / MS_IN_SEC);
		Log(5, "xxx totalTimeInSec=%.1fs, nightMaxAutoExposure_us=%'ldus, nightDelay_ms=%'dms\n", totalTimeInSec, cg.nightMaxAutoExposure_us, cg.nightDelay_ms);
	}

	gainTransitionImages = ceil(cg.gainTransitionTime / totalTimeInSec);
	if (gainTransitionImages == 0)
	{
		Log(-1, "*** INFORMATION: Not adjusting gain - your 'gaintransitiontime' (%d seconds) is less than the time to take one image plus its delay (%.1f seconds).\n", cg.gainTransitionTime, totalTimeInSec);
		return(false);
	}

	totalAdjustGain = nightGain - dayGain;
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

	Log(5, "xxx gainTransitionImages=%d, gainTransitionTime=%ds, perImageAdjustGain=%d, totalAdjustGain=%d\n",
		gainTransitionImages, cg.gainTransitionTime, perImageAdjustGain, totalAdjustGain);

	return(true);
}

// Determine the change in gain needed for smooth transitions between night and day.
// Gain during the day is usually 0 and at night is usually > 0.
// If auto-exposure is on for both, the first several night frames may be too bright at night
// because of the sudden (often large) increase in gain, or too dark at the night-to-day
// transition.
// Try to mitigate that by changing the gain over several images at each transition.

int determineGainChange(int dayGain, int nightGain)
{
	if (numGainChanges > gainTransitionImages || totalAdjustGain == 0)
	{
		// no more changes needed in this transition
		Log(5, "  xxxx No more gain changes needed.\n");
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

	Log(4, "  xxxx Adjusting %s gain by %d on next picture to %d; will be gain change # %d of %d.\n",
		dayOrNight.c_str(), amt, amt+cg.currentGain, numGainChanges, gainTransitionImages);
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
		Log(0, "*** ERROR: Maximum number of consecutive errors of %d reached; exiting...\n", maxErrors);
		return(false);	// gets us out of inner and outer loop
	}
	return(true);
}

//-------------------------------------------------------------------------------------------------------
//-------------------------------------------------------------------------------------------------------

int main(int argc, char *argv[])
{
	char * a = getenv("ALLSKY_HOME");
	if (a != NULL)
		snprintf(allskyHome, sizeof(allskyHome)-1, "%s/", a);

	setDefaults(&cg, ctZWO);

	cg.tty = isatty(fileno(stdout)) ? true : false;
	signal(SIGINT, IntHandle);
	signal(SIGTERM, IntHandle);	// The service sends SIGTERM to end this program.
	signal(SIGHUP, sig);		// xxxxxxxxxx TODO: Re-read settings (we currently just restart).

	pthread_mutex_init(&mtxSaveImg, 0);
	pthread_cond_init(&condStartSave, 0);

	char bufTime[128]			= { 0 };
	char bufTemp[1024]			= { 0 };
	char const *bayer[]			= { "RG", "BG", "GR", "GB" };
	bool endOfNight				= false;
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

	if (! getCommandLineArguments(&cg, argc, argv))
	{
		// getCommandLineArguents outputs an error message.
		exit(EXIT_ERROR_STOP);
	}
	cg.ASIversion = ASIGetSDKVersion();

	if (! cg.saveCC && ! cg.help)
	{
		displayHeader(cg);
	}

	if (setlocale(LC_NUMERIC, cg.locale) == NULL)
		Log(-1, "*** WARNING: Could not set locale to %s ***\n", cg.locale);

	if (cg.help)
	{
		displayHelp(cg);
		closeUp(EXIT_OK);
	}

	// Do argument error checking if we're not going to exit soon.
	// Some checks are done lower in the code, after we processed some values.
const int minGain = 0;
	if (! cg.saveCC)
	{
		// xxxx TODO: NO_MAX_VALUE will be replaced by acutal camera-specific values

		// If an exposure value, which was entered on the command-line in MS, is out of range,
		// we want to specify the valid range in MS, not US which we use internally.
		validateFloat(&cg.temp_dayExposure_ms,
			cg.cameraMinExposure_us/US_IN_MS,
			(cg.dayAutoExposure ? cg.dayMaxAutoExposure_us : cg.cameraMaxExposure_us) / US_IN_MS,
			"Daytime Exposure vs. camera limits", true);
		if (cg.dayAutoExposure)
		{
			validateFloat(&cg.temp_dayMaxAutoExposure_ms,
				cg.cameraMinExposure_us/US_IN_MS,
				cg.cameraMaxExposure_us,
				"Daytime Max Auto-Exposure", true);
		}
		validateFloat(&cg.temp_nightExposure_ms,
			cg.cameraMinExposure_us/US_IN_MS,
			(cg.nightAutoExposure ? cg.nightMaxAutoExposure_us : cg.cameraMaxExposure_us) / US_IN_MS,
			"Nighttime Exposure vs. camera limits", true);
		if (cg.nightAutoExposure)
		{
			validateFloat(&cg.temp_nightMaxAutoExposure_ms,
				cg.cameraMinExposure_us/US_IN_MS,
				cg.cameraMaxExposure_us/US_IN_MS,
				"Nighttime Max Auto-Exposure", true);
		}

		// The user entered these in MS on the command line, but we need US, so convert.
		cg.dayExposure_us = cg.temp_dayExposure_ms * US_IN_MS;
		cg.dayMaxAutoExposure_us = cg.temp_dayMaxAutoExposure_ms * US_IN_MS;
		cg.nightExposure_us = cg.temp_nightExposure_ms * US_IN_MS;
		cg.nightMaxAutoExposure_us = cg.temp_nightMaxAutoExposure_ms * US_IN_MS;

		validateLong(&cg.dayBrightness, 0, 100, "Daytime Brightness", true);
		validateLong(&cg.dayDelay_ms, 10, NO_MAX_VALUE, "Daytime Delay", false);
		validateFloat(&cg.dayMaxAutoGain, minGain, NO_MAX_VALUE, "Daytime Max Auto-Gain", true);
		validateFloat(&cg.dayGain, minGain, cg.dayAutoGain ? cg.dayMaxAutoGain : NO_MAX_VALUE, "Daytime Gain", true);
		validateLong(&cg.dayBin, 1, NO_MAX_VALUE, "Daytime Binning", false);
		validateFloat(&cg.dayWBR, 0, NO_MAX_VALUE, "Daytime Red Balance", true);
		validateFloat(&cg.dayWBB, 0, NO_MAX_VALUE, "Daytime Blue Balance", true);
		validateLong(&cg.daySkipFrames, 0, 50, "Daytime Skip Frames", true);

		validateLong(&cg.nightBrightness, 0, 100, "Nighttime Brightness", true);
		validateLong(&cg.nightDelay_ms, 10, NO_MAX_VALUE, "Nighttime Delay", false);
		validateFloat(&cg.nightMaxAutoGain, minGain, NO_MAX_VALUE, "Nighttime Max Auto-Gain", true);
		validateFloat(&cg.nightGain, minGain, cg.nightAutoGain ? cg.nightMaxAutoGain : NO_MAX_VALUE, "Nighttime Gain", true);
		validateLong(&cg.nightBin, 1, NO_MAX_VALUE, "Nighttime Binning", false);
		validateFloat(&cg.nightWBR, 0, NO_MAX_VALUE, "Nighttime Red Balance", true);
		validateFloat(&cg.nightWBB, 0, NO_MAX_VALUE, "Nighttime Blue Balance", true);
		validateLong(&cg.nightSkipFrames, 0, 50, "Nighttime Skip Frames", true);

		validateLong(&cg.gamma, 0, NO_MAX_VALUE, "Gamma", true);
		validateLong(&cg.offset, 0, NO_MAX_VALUE, "Offset", true);
		validateLong(&cg.aggression, 1, 100, "Aggression", true);
		validateLong(&cg.dayTargetTemp, -50, NO_MAX_VALUE, "Target Sensor Temperature", true);
		validateLong(&cg.nightTargetTemp, -50, NO_MAX_VALUE, "Target Sensor Temperature", true);
		validateLong(&cg.gainTransitionTime, 0, NO_MAX_VALUE, "Gain Transition Time", true);
		// user specifies minutes but we want seconds.
		cg.gainTransitionTime *= 60;
		if (cg.imageType != AUTO_IMAGE_TYPE)
			validateLong(&cg.imageType, 0, ASI_IMG_END, "Image Type", false);
		validateLong(&cg.asiBandwidth, cg.minAsiBandwidth, cg.maxAsiBandwidth, "USB Bandwidth", true);
		validateLong(&cg.flip, 0, 3, "Flip", false);
		validateLong(&cg.debugLevel, 0, 5, "Debug Level", true);

		validateLong(&cg.overlay.extraFileAge, 0, NO_MAX_VALUE, "Max Age Of Extra", true);
		validateLong(&cg.overlay.fontnumber, 0, 8-1, "Font Name", true);
		validateLong(&cg.overlay.linenumber, 0, sizeof(cg.overlay.linetype)-1, "Font Smoothness", true);

		if (cg.overlay.fc != NULL && sscanf(cg.overlay.fc, "%d %d %d",
				&cg.overlay.fontcolor[0], &cg.overlay.fontcolor[1], &cg.overlay.fontcolor[2]) != 3)
			Log(-1, "%s*** WARNING: Not enough font color parameters: '%s'%s\n", c(KRED), cg.overlay.fc, c(KNRM));
		if (cg.overlay.sfc != NULL && sscanf(cg.overlay.sfc, "%d %d %d",
				&cg.overlay.smallFontcolor[0], &cg.overlay.smallFontcolor[1], &cg.overlay.smallFontcolor[2]) != 3)
			Log(-1, "%s*** WARNING: Not enough small font color parameters: '%s'%s\n", c(KRED), cg.overlay.sfc, c(KNRM));
	}
	char const *ext = checkForValidExtension(cg.fileName, cg.imageType);
	if (ext == NULL)
	{
		// checkForValidExtension() displayed the error message.
		closeUp(EXIT_ERROR_STOP);
	}

// TODO: make common
	if (strcasecmp(ext, "jpg") == 0 || strcasecmp(ext, "jpeg") == 0)
	{
		cg.imageExt = "jpg";
		compressionParameters.push_back(cv::IMWRITE_JPEG_QUALITY);
		// want dark frames to be at highest quality
		if (cg.takingDarkFrames)
		{
			cg.quality = 100;
		}
		else if (cg.quality == NOT_SET)
		{
			cg.quality = cg.qualityJPG;
		}
		else
		{
			validateLong(&cg.quality, 0, 100, "JPG Quality", true);
		}
	}
	else if (strcasecmp(ext, "png") == 0)
	{
		cg.imageExt = "png";
		compressionParameters.push_back(cv::IMWRITE_PNG_COMPRESSION);
		// png is lossless so "quality" is really just the amount of compression.
		if (cg.takingDarkFrames)
		{
			cg.quality = 9;
		}
		else if (cg.quality == NOT_SET)
		{
			cg.quality = cg.qualityPNG;
		}
		else
		{
			validateLong(&cg.quality, 0, 9, "PNG Quality/Compression", true);
		}
	}
	compressionParameters.push_back(cg.quality);

// TODO: make common.
	// Get just the name of the file, without any directories or the extension.
	if (cg.takingDarkFrames)
	{
		// To avoid overwriting the optional notification image with the dark image,
		// during dark frames we use a different file name.
		static char darkFilename[20];
		sprintf(darkFilename, "dark.%s", cg.imageExt);
		cg.fileName = darkFilename;
		strncat(cg.finalFileName, cg.fileName, sizeof(cg.finalFileName)-1);
	}
	else
	{
		char const *slash = strrchr(cg.fileName, '/');
		if (slash == NULL)
			strncat(cg.fileNameOnly, cg.fileName, sizeof(cg.fileNameOnly)-1);
		else
			strncat(cg.fileNameOnly, slash + 1, sizeof(cg.fileNameOnly)-1);
		char *dot = strrchr(cg.fileNameOnly, '.');	// we know there's an extension
		*dot = '\0';
	}

	processConnectedCameras();	// exits on error

	ASI_CAMERA_INFO ASICameraInfo;
	ASIGetCameraProperty(&ASICameraInfo, cg.cameraNumber);
	cg.isColorCamera = ASICameraInfo.IsColorCam == ASI_TRUE ? true : false;
	cg.isCooledCamera = ASICameraInfo.IsCoolerCam == ASI_TRUE ? true : false;

	asiRetCode = ASIOpenCamera(cg.cameraNumber);
	if (asiRetCode != ASI_SUCCESS)
	{
		printf("*** ERROR opening camera, check that you have root permissions! (%s)\n", getRetCode(asiRetCode));
		closeUp(EXIT_NO_CAMERA);				// Can't do anything so might as well exit.
	}

	int iMaxWidth, iMaxHeight;
	double pixelSize;
	iMaxWidth  = ASICameraInfo.MaxWidth;
	iMaxHeight = ASICameraInfo.MaxHeight;
	pixelSize  = ASICameraInfo.PixelSize;
	if (cg.width == 0 || cg.height == 0)
	{
		cg.width  = iMaxWidth;
		cg.height = iMaxHeight;
	}
	else
	{
		validateLong(&cg.width, 0, iMaxWidth, "Width", true);
		validateLong(&cg.height, 0, iMaxHeight, "Height", true);
	}

	long originalWidth  = cg.width;
	long originalHeight = cg.height;
	// Limit these to a reasonable value based on the size of the sensor.
	validateLong(&cg.overlay.iTextLineHeight, 0, (long)(iMaxHeight / 2), "Line Height", true);
	validateLong(&cg.overlay.iTextX, 0, (long)iMaxWidth - 10, "Text X", true);
	validateLong(&cg.overlay.iTextY, 0, (long)iMaxHeight - 10, "Text Y", true);
	validateFloat(&cg.overlay.fontsize, 0.1, iMaxHeight / 2, "Font Size", true);
	validateLong(&cg.overlay.linewidth, 0, (long)(iMaxWidth / 2), "Font Weight", true);

	ASIGetNumOfControls(cg.cameraNumber, &iNumOfCtrl);

	if (cg.saveCC)
	{
		saveCameraInfo(ASICameraInfo, cg.CC_saveDir, iMaxWidth, iMaxHeight, pixelSize, bayer[ASICameraInfo.BayerPattern]);
		closeUp(EXIT_OK);
	}

	outputCameraInfo(ASICameraInfo, iMaxWidth, iMaxHeight, pixelSize, bayer[ASICameraInfo.BayerPattern]);
	// checkExposureValues() must come after outputCameraInfo().
	(void) checkExposureValues(&cg);

#ifdef USE_HISTOGRAM
	// The histogram box needs to fit on the image.
	// If we're binning we'll decrease the size of the box accordingly.
	bool ok = true;
	if (cg.HB.sArgs != NULL)
	{
		if (sscanf(cg.HB.sArgs, "%d %d %f %f", &cg.HB.histogramBoxSizeX, &cg.HB.histogramBoxSizeY, &cg.HB.histogramBoxPercentFromLeft, &cg.HB.histogramBoxPercentFromTop) != 4)
		{
			Log(-1, "%s*** ERROR: Not enough histogram box parameters: '%s'%s\n", c(KRED), cg.HB.sArgs, c(KNRM));
			ok = false;
		} else {
			// scale user-input 0-100 to 0.0-1.0
			cg.HB.histogramBoxPercentFromLeft /= 100;
			cg.HB.histogramBoxPercentFromTop /= 100;
		}
	}
	else
	{
		if (cg.HB.histogramBoxSizeX < 1 || cg.HB.histogramBoxSizeY < 1)
		{
			Log(-1, "%s*** ERROR: Histogram box size must be > 0; you entered X=%d, Y=%d%s\n",
				c(KRED), cg.HB.histogramBoxSizeX, cg.HB.histogramBoxSizeY, c(KNRM));
			ok = false;
		}
		if (isnan(cg.HB.histogramBoxPercentFromLeft) || isnan(cg.HB.histogramBoxPercentFromTop) || 
			cg.HB.histogramBoxPercentFromLeft < 0.0 || cg.HB.histogramBoxPercentFromTop < 0.0)
		{
			Log(-1, "%s*** ERROR: Bad values for histogram percents; you entered X=%.0f%%, Y=%.0f%%%s\n",
				c(KRED), (cg.HB.histogramBoxPercentFromLeft*100.0), (cg.HB.histogramBoxPercentFromTop*100.0), c(KNRM));
			ok = false;
		}
		else
		{
			cg.HB.centerX = cg.width * cg.HB.histogramBoxPercentFromLeft;
			cg.HB.centerY = cg.height * cg.HB.histogramBoxPercentFromTop;
			cg.HB.leftOfBox = cg.HB.centerX - (cg.HB.histogramBoxSizeX / 2);
			cg.HB.rightOfBox = cg.HB.centerX + (cg.HB.histogramBoxSizeX / 2);
			cg.HB.topOfBox = cg.HB.centerY - (cg.HB.histogramBoxSizeY / 2);
			cg.HB.bottomOfBox = cg.HB.centerY + (cg.HB.histogramBoxSizeY / 2);
	
			if (cg.HB.leftOfBox < 0 || cg.HB.rightOfBox >= cg.width || cg.HB.topOfBox < 0 || cg.HB.bottomOfBox >= cg.height)
			{
				Log(-1, "%s*** ERROR: Histogram box location must fit on image; upper left of box is %dx%d, lower right %dx%d%s\n", c(KRED), cg.HB.leftOfBox, cg.HB.topOfBox, cg.HB.rightOfBox, cg.HB.bottomOfBox, c(KNRM));
				ok = false;
			}
		}
	}

	if (! ok)
		closeUp(EXIT_ERROR_STOP);	// force the user to fix it
#endif

	asiRetCode = ASIInitCamera(cg.cameraNumber);
	if (asiRetCode != ASI_SUCCESS)
	{
		printf("*** ERROR: Unable to initialise camera: %s\n", getRetCode(asiRetCode));
		closeUp(EXIT_ERROR_STOP);	// Can't do anything so might as well exit.
	}

	// Handle "auto" imageType.
	if (cg.imageType == AUTO_IMAGE_TYPE)
	{
		// If it's a color camera, create color pictures.
		// If it's a mono camera use RAW16 if the image file is a .png, otherwise use RAW8.
		// There is no good way to handle Y8 automatically so it has to be set manually.
		if (cg.isColorCamera)
			cg.imageType = IMG_RGB24;
		else if (strcmp(cg.imageExt, "png") == 0)
			cg.imageType = IMG_RAW16;
		else // jpg
			cg.imageType = IMG_RAW8;
	}

	if (cg.imageType == IMG_RAW16)
	{
		cg.sType = "RAW16";
		currentBpp = 2;
		currentBitDepth = 16;
	}
	else if (cg.imageType == IMG_RGB24)
	{
		cg.sType = "RGB24";
		currentBpp = 3;
		currentBitDepth = 8;
	}
	else if (cg.imageType == IMG_RAW8)
	{
		// Color cameras should use Y8 instead of RAW8. Y8 is the mono mode for color cameras.
		if (cg.isColorCamera)
		{
			cg.imageType = IMG_Y8;
			cg.sType = "Y8 (not RAW8 for color cameras)";
		}
		else
		{
			cg.sType = "RAW8";
		}
		currentBpp = 1;
		currentBitDepth = 8;
	}
	else if (cg.imageType == IMG_Y8)
	{
		cg.sType = "Y8";
		currentBpp = 1;
		currentBitDepth = 8;
	}
	else
	{
		Log(0, "*** ERROR: Unknown Image Type: %d\n", cg.imageType);
		closeUp(EXIT_ERROR_STOP);
	}

	//-------------------------------------------------------------------------------------------------------
	//-------------------------------------------------------------------------------------------------------

	displaySettings(cg);

	// These configurations apply to both day and night.
	// Other calls to setControl() are done after we know if we're in daytime or nighttime.
	setControl(cg.cameraNumber, ASI_BANDWIDTHOVERLOAD, cg.asiBandwidth, cg.asiAutoBandwidth ? ASI_TRUE : ASI_FALSE);
	setControl(cg.cameraNumber, ASI_GAMMA, cg.gamma, ASI_FALSE);
	setControl(cg.cameraNumber, ASI_OFFSET, cg.offset, ASI_FALSE);
	setControl(cg.cameraNumber, ASI_FLIP, cg.flip, ASI_FALSE);

	if (! bSaveRun && pthread_create(&hthdSave, 0, SaveImgThd, 0) == 0)
	{
		bSaveRun = true;
	}

	// Initialization
	int originalITextX		= cg.overlay.iTextX;
	int originalITextY		= cg.overlay.iTextY;
	int originalFontsize	= cg.overlay.fontsize;
	int originalLinewidth	= cg.overlay.linewidth;
	// Have we displayed "not taking picture during day" message, if applicable?
	bool displayedNoDaytimeMsg	= false;
	int gainChange				= 0;		// how much to change gain up or down

	// Display one-time messages.

	// If autogain is on, our adjustments to gain will get overwritten by the camera
	// so don't transition.
	// gainTransitionTime of 0 means don't adjust gain.
	// No need to adjust gain if day and night gain are the same.
	if (cg.dayAutoGain || cg.nightAutoGain || cg.gainTransitionTime == 0 || cg.dayGain == cg.nightGain || cg.takingDarkFrames)
	{
		adjustGain = false;
		Log(3, "Will NOT adjust gain at transitions\n");
	}
	else
	{
		adjustGain = true;
		Log(3, "Will adjust gain at transitions\n");
	}

	if (cg.overlay.ImgExtraText[0] != '\0' && cg.overlay.extraFileAge > 0) {
		Log(3, "Extra Text File Age Disabled So Displaying Anyway\n");
	}

	if (cg.tty)
		printf("*** Press Ctrl+C to stop ***\n\n");

	// Start taking pictures

	if (! cg.videoOffBetweenImages)
	{
		asiRetCode = ASIStartVideoCapture(cg.cameraNumber);
		if (asiRetCode != ASI_SUCCESS)
		{
			Log(0, "*** ERROR: Unable to start video capture: %s\n", getRetCode(asiRetCode));
			closeUp(EXIT_ERROR_STOP);
		}
	}

	while (bMain)
	{
		// Find out if it is currently DAY or NIGHT
		dayOrNight = calculateDayOrNight(cg.latitude, cg.longitude, cg.angle);
		std::string lastDayOrNight = dayOrNight;

		if (! cg.takingDarkFrames)
			currentAdjustGain = resetGainTransitionVariables(cg.dayGain, cg.nightGain);

		if (cg.takingDarkFrames)
		{
			// We're doing dark frames so turn off autoexposure and autogain, and use
			// nightime gain, delay, max exposure, bin, and brightness to mimic a nightime shot.
			cg.currentSkipFrames = 0;
			cg.currentAutoExposure = false;
			cg.nightAutoExposure = false;
			cg.currentAutoGain = false;
			cg.currentGain = cg.nightGain;
			cg.currentMaxAutoGain = cg.nightMaxAutoGain;	// not needed since we're not using auto gain, but set to be consistent
			gainChange = 0;
			cg.currentDelay_ms = cg.nightDelay_ms;
			cg.currentMaxAutoExposure_us = cg.currentExposure_us = cg.nightMaxAutoExposure_us;
			cg.currentBin = cg.nightBin;
			cg.currentBrightness = cg.nightBrightness;
			if (cg.isColorCamera)
			{
				cg.currentAutoAWB = false;
				cg.currentWBR = cg.nightWBR;
				cg.currentWBB = cg.nightWBB;
			}
			if (cg.isCooledCamera)
			{
				cg.currentEnableCooler = cg.nightEnableCooler;
				cg.currentTargetTemp = cg.nightTargetTemp;
			}
			cg.myModeMeanSetting.currentMean = NOT_SET;
			cg.myModeMeanSetting.modeMean = false;

			Log(0, "Taking dark frames...\n");

			if (cg.notificationImages) {
				snprintf(bufTemp, sizeof(bufTemp)-1, "%sscripts/copy_notification_image.sh --expires 0 DarkFrames &", allskyHome);
				system(bufTemp);
			}
		}

		else if (dayOrNight == "DAY")
		{
			if (endOfNight == true)		// Execute end of night script
			{
				Log(0, "Processing end of night data\n");
				snprintf(bufTemp, sizeof(bufTemp)-1, "%sscripts/endOfNight.sh &", allskyHome);
				system(bufTemp);
				endOfNight = false;
				displayedNoDaytimeMsg = false;
			}

			if (! cg.daytimeCapture)
			{
				displayedNoDaytimeMsg = daytimeSleep(displayedNoDaytimeMsg, cg);

				// No need to do any of the code below so go back to the main loop.
				continue;
			}

			else
			{
				Log(0, "==========\n=== Starting daytime capture ===\n==========\n");

				// We only skip initial frames if we are starting in daytime and using auto-exposure.
				if (numExposures == 0 && cg.dayAutoExposure)
					cg.currentSkipFrames = cg.daySkipFrames;

				// If we went from Night to Day, then currentExposure_us will be the last night
				// exposure so leave it if we're using auto-exposure so there's a seamless change from
				// Night to Day, i.e., if the exposure was fine a minute ago it will likely be fine now.
				// On the other hand, if this program just started or we're using manual exposures,
				// use what the user specified.
				if (numExposures == 0 || ! cg.dayAutoExposure)
				{
					cg.currentExposure_us = cg.dayExposure_us;
				}
				else
				{
					// If gain changes, we have to change the exposure time to get an equally
					// exposed image.
					// ZWO gain has unit 0.1dB, so we have to convert the gain values to a factor first
					//		newExp =  (oldExp * oldGain) / newGain
					// e.g.		20s = (10s    * 2.0)     / (1.0) 

					// current values here are last night's values
					double oldGain = pow(10, cg.currentGain / 10.0 / 20.0);
					double newGain = pow(10, cg.dayGain / 10.0 / 20.0);
					Log(2, "Using the last night exposure (%s),", length_in_units(cg.currentExposure_us, true));
					cg.currentExposure_us = (cg.currentExposure_us * oldGain) / newGain;
					Log(2," old (%'f) and new (%'f) Gain to calculate new exposure of %s\n", oldGain, newGain, length_in_units(cg.currentExposure_us, true));
				}

				cg.currentMaxAutoExposure_us = cg.dayMaxAutoExposure_us;
#ifdef USE_HISTOGRAM
				// Don't use camera auto-exposure since we mimic it ourselves.
				if (cg.dayAutoExposure)
				{
					Log(2, "Turning off ZWO auto-exposure to use Allsky auto-exposure.\n");
				}
				// With the histogram method we NEVER use ZWO auto exposure - either the user said
				// not to, or we turn it off ourselves.
				cg.currentAutoExposure = false;
#else
				cg.currentAutoExposure = cg.dayAutoExposure;
#endif
				cg.currentBrightness = cg.dayBrightness;
				if (cg.isColorCamera)
				{
					cg.currentAutoAWB = cg.dayAutoAWB;
					cg.currentWBR = cg.dayWBR;
					cg.currentWBB = cg.dayWBB;
				}
				cg.currentDelay_ms = cg.dayDelay_ms;
				cg.currentBin = cg.dayBin;
				cg.currentGain = cg.dayGain;	// must come before determineGainChange() below
				cg.currentMaxAutoGain = cg.dayMaxAutoGain;
				if (currentAdjustGain)
				{
					// we did some nightime images so adjust gain
					numGainChanges = 0;
					gainChange = determineGainChange(cg.dayGain, cg.nightGain);
				}
				else
				{
					gainChange = 0;
				}
				cg.currentAutoGain = cg.dayAutoGain;
				cg.myModeMeanSetting.currentMean = cg.myModeMeanSetting.dayMean;
				if (cg.isCooledCamera)
				{
					cg.currentEnableCooler = cg.dayEnableCooler;
					cg.currentTargetTemp = cg.dayTargetTemp;
				}

			}
		}

		else	// NIGHT
		{
			Log(0, "==========\n=== Starting nighttime capture ===\n==========\n");

			// We only skip initial frames if we are starting in nighttime and using auto-exposure.
			if (numExposures == 0 && cg.nightAutoExposure)
				cg.currentSkipFrames = cg.nightSkipFrames;

			// Setup the night time capture parameters
			if (numExposures == 0 || ! cg.nightAutoExposure)
			{
				cg.currentExposure_us = cg.nightExposure_us;
			}

			cg.currentAutoExposure = cg.nightAutoExposure;
			cg.currentBrightness = cg.nightBrightness;
			if (cg.isColorCamera)
			{
				cg.currentAutoAWB = cg.nightAutoAWB;
				cg.currentWBR = cg.nightWBR;
				cg.currentWBB = cg.nightWBB;
			}
			cg.currentDelay_ms = cg.nightDelay_ms;
			cg.currentBin = cg.nightBin;
			cg.currentMaxAutoExposure_us = cg.nightMaxAutoExposure_us;
			cg.currentGain = cg.nightGain;	// must come before determineGainChange() below
			cg.currentMaxAutoGain = cg.nightMaxAutoGain;
			if (currentAdjustGain)
			{
				// we did some daytime images so adjust gain
				numGainChanges = 0;
				gainChange = determineGainChange(cg.dayGain, cg.nightGain);
			}
			else
			{
				gainChange = 0;
			}
			cg.currentAutoGain = cg.nightAutoGain;
			cg.myModeMeanSetting.currentMean = cg.myModeMeanSetting.nightMean;
			if (cg.isCooledCamera)
			{
				cg.currentEnableCooler = cg.nightEnableCooler;
				cg.currentTargetTemp = cg.nightTargetTemp;
			}
		}
		// ========== Done with dark fram / day / night settings


		if (cg.myModeMeanSetting.currentMean > 0.0)
		{
			cg.myModeMeanSetting.modeMean = true;
/* FUTURE
			myModeMeanSetting.meanValue = cg.myModeMeanSetting.currentMean;
			if (! aegInit(cg, minExposure_us, minGain, myRaspistillSetting, myModeMeanSetting))
			{
				closeUp(EXIT_ERROR_STOP);
			}
*/
		}
		else
		{
			cg.myModeMeanSetting.modeMean = false;
		}

		if (cg.isColorCamera)
		{
			setControl(cg.cameraNumber, ASI_WB_R, cg.currentWBR, cg.currentAutoAWB ? ASI_TRUE : ASI_FALSE);
			setControl(cg.cameraNumber, ASI_WB_B, cg.currentWBB, cg.currentAutoAWB ? ASI_TRUE : ASI_FALSE);
		}
		else if (! cg.currentAutoAWB && ! cg.takingDarkFrames)
		{
			// We only read the actual values if in auto white balance; since we're not, get them now.
			actualWBR = cg.currentWBR;
			actualWBB = cg.currentWBB;
		}
		if (cg.isCooledCamera)
		{
			asiRetCode = setControl(cg.cameraNumber, ASI_COOLER_ON, cg.currentEnableCooler ? ASI_TRUE : ASI_FALSE, ASI_FALSE);
			if (asiRetCode != ASI_SUCCESS)
			{
				printf("%s", c(KRED));
				printf(" WARNING: Could not change cooler state: %s; continuing.\n", getRetCode(asiRetCode));
				printf("%s", c(KNRM));
			}
			asiRetCode = setControl(cg.cameraNumber, ASI_TARGET_TEMP, cg.currentTargetTemp, ASI_FALSE);
			if (asiRetCode != ASI_SUCCESS)
			{
				printf("%s", c(KRED));
				printf(" WARNING: Could not set cooler temperature: %s; continuing.\n", getRetCode(asiRetCode));
				printf("%s", c(KNRM));
			}
		}

		setControl(cg.cameraNumber, ASI_GAIN, cg.currentGain + gainChange, cg.currentAutoGain ? ASI_TRUE : ASI_FALSE);
		if (cg.currentAutoGain)
			setControl(cg.cameraNumber, ASI_AUTO_MAX_GAIN, cg.currentMaxAutoGain, ASI_FALSE);

		// never go over the camera's max auto exposure. ASI_AUTO_MAX_EXP is in ms so convert
		cg.currentMaxAutoExposure_us = std::min(cg.currentMaxAutoExposure_us, cg.cameraMaxAutoExposure_us);
		if (cg.currentAutoExposure)
		{
			setControl(cg.cameraNumber, ASI_AUTO_MAX_EXP, cg.currentMaxAutoExposure_us / US_IN_MS, ASI_FALSE);
			setControl(cg.cameraNumber, ASI_AUTO_TARGET_BRIGHTNESS, cg.currentBrightness, ASI_FALSE);
		}

#ifndef USE_HISTOGRAM
		setControl(cg.cameraNumber, ASI_EXPOSURE, cg.currentExposure_us, cg.currentAutoExposure ? ASI_TRUE : ASI_FALSE);
		// If not using histogram algorithm, ASI_EXPOSURE is set in takeOneExposure()
#endif

		if (numExposures == 0 || cg.dayBin != cg.nightBin)
		{
			// Adjusting variables for chosen binning.
			// Only need to do at the beginning and if bin changes.
			cg.height						= originalHeight / cg.currentBin;
			cg.width						= originalWidth / cg.currentBin;
			cg.overlay.iTextX				= originalITextX / cg.currentBin;
			cg.overlay.iTextY				= originalITextY / cg.currentBin;
			cg.overlay.fontsize				= originalFontsize / cg.currentBin;
			cg.overlay.linewidth			= originalLinewidth / cg.currentBin;
			cg.HB.currentHistogramBoxSizeX	= cg.HB.histogramBoxSizeX / cg.currentBin;
			cg.HB.currentHistogramBoxSizeY	= cg.HB.histogramBoxSizeY / cg.currentBin;

			bufferSize = cg.width * cg.height * currentBpp;

// TODO: if not the first time, should we free the old pRgb?
			if (cg.imageType == IMG_RAW16)
			{
				pRgb.create(cv::Size(cg.width, cg.height), CV_16UC1);
			}
			else if (cg.imageType == IMG_RGB24)
			{
				pRgb.create(cv::Size(cg.width, cg.height), CV_8UC3);
			}
			else // RAW8 and Y8
			{
				pRgb.create(cv::Size(cg.width, cg.height), CV_8UC1);
			}

// TODO: ASISetStartPos(cg.cameraNumber, from_left_xxx, from_top_xxx);	By default it's at the center.
// TODO: width % 8 must be 0. height % 2 must be 0.
// TODO: ASI120's (width*height) % 1024 must be 0
			asiRetCode = ASISetROIFormat(cg.cameraNumber, cg.width, cg.height, cg.currentBin, (ASI_IMG_TYPE)cg.imageType);
			if (asiRetCode != ASI_SUCCESS)
			{
				if (asiRetCode == ASI_ERROR_INVALID_SIZE)
				{
					Log(0, "*** ERROR: your camera does not support bin %dx%d.\n", cg.currentBin, cg.currentBin);
					closeUp(EXIT_ERROR_STOP);
				}
				else
				{
					Log(0, "ASISetROIFormat(%d, %dx%d, %d, %d) = %s\n", cg.cameraNumber, cg.width, cg.height, cg.currentBin, cg.imageType, getRetCode(asiRetCode));
					closeUp(EXIT_ERROR_STOP);
				}
			}
		}

		// Here and below, indent sub-messages with "  > " so it's clear they go with the un-indented line.
		// This simply makes it easier to see things in the log file.

#ifdef USE_HISTOGRAM
		mean = 0;
		int attempts = 0;
		int histogram[256];
#endif

		// Wait for switch day time -> night time or night time -> day time
		while (bMain && lastDayOrNight == dayOrNight)
		{
			// date/time is added to many log entries to make it easier to associate them
			// with an image (which has the date/time in the filename).
			exposureStartDateTime = getTimeval();
			char exposureStart[128];
			snprintf(exposureStart, sizeof(exposureStart), "%s", formatTime(exposureStartDateTime, "%F %T"));
			Log(0, "STARTING EXPOSURE at: %s   @ %s\n", exposureStart, length_in_units(cg.currentExposure_us, true));

			// Get start time for overlay. Make sure it has the same time as exposureStart.
			if (cg.overlay.showTime)
			{
				sprintf(bufTime, "%s", formatTime(exposureStartDateTime, cg.timeFormat));
			}

			asiRetCode = takeOneExposure(cg, pRgb.data, histogram, &mean);
			if (asiRetCode == ASI_SUCCESS)
			{
				numErrors = 0;
				numExposures++;

				focusMetric = cg.overlay.showFocus ? (int)round(get_focus_metric(pRgb)) : -1;

				if (numExposures == 0 && cg.preview)
				{
					// Start the preview thread at the last possible moment.
					bDisplay = true;
					pthread_create(&threadDisplay, NULL, Display, (void *)&pRgb);
				}

#ifdef USE_HISTOGRAM
				bool usedHistogram = false;	// did we use the histogram method?

				// We don't use this at night since the ZWO bug is only when it's light outside.
				if (dayOrNight == "DAY" && cg.dayAutoExposure && ! cg.takingDarkFrames)
				{
					usedHistogram = true;	// we are using the histogram code on this exposure
					attempts = 0;

					// Got these by trial and error. They are more-or-less half the max of 255.
					int minAcceptableMean = MINMEAN;
					int maxAcceptableMean = MAXMEAN;
					int roundToMe = 5; // round exposures to this many microseconds

					long newExposure_us = 0;

					// cameraMinExposure_us is a camera property.
					// histMinExposure_us is the min exposure used in the histogram calculation.
// xxxxxxxxx dump histMinExposure_us? Set tempMinExposure_us = cameraMinExposure_us ? ...
					long histMinExposure_us = cg.cameraMinExposure_us ? cg.cameraMinExposure_us : 100;
					long tempMinExposure_us = histMinExposure_us;
					long tempMaxExposure_us = cg.currentMaxAutoExposure_us;

					if (cg.dayBrightness != DEFAULT_BRIGHTNESS)
					{
						// Adjust brightness based on dayBrightness.
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
							// If dayBrightnes < DEFAULT_BRIGHTNESS then numMultiples will be negative,
							// which is ok - it just means the multiplier will be less than 1.
							numMultiples = (float)(cg.dayBrightness - DEFAULT_BRIGHTNESS) / DEFAULT_BRIGHTNESS;
							exposureAdjustment = 1 + (numMultiples * adjustmentAmountPerMultiple);
							Log(3, "  > >>> Adjusting exposure x %.2f (%.1f%%) for daybrightness\n", exposureAdjustment, (exposureAdjustment - 1) * 100);
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
					int priorMean = mean;
					int priorMeanDiff = 0;
					int adjustment = 0;

					int lastMeanDiff = 0;	// like priorMeanDiff but for next exposure

					if (mean < minAcceptableMean)
					{
						priorMeanDiff = mean - minAcceptableMean;
						// If we're skipping frames we want to get to a good exposure as fast as
						// possible so don't set an adjustment.
						if (cg.aggression != 100 && cg.currentSkipFrames <= 0)
						{
							adjustment = priorMeanDiff * (1 - ((float)cg.aggression/100));
							if (adjustment < 1)
								minAcceptableMean += adjustment;
						}
					}
					else if (mean > maxAcceptableMean)
					{
						priorMeanDiff = mean - maxAcceptableMean;
					}
					if (adjustment != 0)
					{
						Log(3, "  > !!! Adjusting %sAcceptableMean by %d to %d\n",
							adjustment < 0 ? "min" : "max",
							adjustment,
							adjustment < 0 ? minAcceptableMean : maxAcceptableMean);
					}

					while ((mean < minAcceptableMean || mean > maxAcceptableMean) && ++attempts <= maxHistogramAttempts && cg.currentExposure_us <= cg.currentMaxAutoExposure_us)
					{
						int acceptable;
						float multiplier = 1.10;
						char const *acceptableType;
						if (mean < minAcceptableMean) {
							acceptable = minAcceptableMean;
							acceptableType = "min";
						} else {
							acceptable = maxAcceptableMean;
							acceptableType = "max";
							multiplier = 1 / multiplier;
						}
						if (cg.currentExposure_us != lastExposure_us)
							printf("xxxxxxxxxxx currentExposure_us %'ld != lastExposure_us %'ld\n", cg.currentExposure_us, lastExposure_us);
						// if mean/acceptable is 9/90, it's 1/10th of the way there, so multiple exposure by 90/9 (10).
						// ZWO cameras don't appear to be linear so increase the multiplier amount some.
						float multiply = ((double)acceptable / mean) * multiplier;
						newExposure_us= lastExposure_us * multiply;
						printf("=== next exposure=%'ld (multiply by %.3f) [lastExposure_us=%'ld, %sAcceptable=%d, mean=%d]\n", newExposure_us, multiply, lastExposure_us, acceptableType, acceptable, mean);

						if (priorMeanDiff > 0 && lastMeanDiff < 0)
						{ 
printf(" >xxx mean was %d and went from %d above max of %d to %d below min of %d, is now at %d; should NOT set temp min to currentExposure_us of %'ld\n",
							priorMean, priorMeanDiff, maxAcceptableMean,
							-lastMeanDiff, minAcceptableMean, mean, cg.currentExposure_us);
						} 
						else
						{
							if (priorMeanDiff < 0 && lastMeanDiff > 0)
							{
							// OK to set upper limit since we know it's too high.
printf(" >xxx mean was %d and went from %d below min of %d to %d above max of %d, is now at %d; OK to set temp max to currentExposure_us of %'ld\n",
								priorMean, -priorMeanDiff, minAcceptableMean,
								lastMeanDiff, maxAcceptableMean, mean, cg.currentExposure_us);
							}

							if (mean < minAcceptableMean)
							{
								tempMinExposure_us = cg.currentExposure_us;
							} 
							else if (mean > maxAcceptableMean)
							{
								tempMaxExposure_us = cg.currentExposure_us;
							} 
						} 

						newExposure_us = roundTo(newExposure_us, roundToMe);
						newExposure_us = std::max(tempMinExposure_us, newExposure_us);
						newExposure_us = std::min(tempMaxExposure_us, newExposure_us);
						newExposure_us = std::min(cg.currentMaxAutoExposure_us, newExposure_us);

						if (newExposure_us == cg.currentExposure_us)
						{
							break;
						}

						cg.currentExposure_us = newExposure_us;
						if (cg.currentExposure_us > cg.currentMaxAutoExposure_us)
						{
							break;
						}

						Log(3, "  >> Retry %i @ %'ld us, min=%'ld us, max=%'ld us: mean (%d)\n", attempts, newExposure_us, tempMinExposure_us, tempMaxExposure_us, mean);

						priorMean = mean;
						priorMeanDiff = lastMeanDiff;

						asiRetCode = takeOneExposure(cg, pRgb.data, histogram, &mean);
						if (asiRetCode == ASI_SUCCESS)
						{

							if (mean < minAcceptableMean)
								lastMeanDiff = mean - minAcceptableMean;
							else if (mean > maxAcceptableMean)
								lastMeanDiff = mean - maxAcceptableMean;
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
						Log(2,"  > Sleeping %s from failed exposure\n", length_in_units(cg.currentDelay_ms * US_IN_MS, false));
						usleep(cg.currentDelay_ms * US_IN_MS);
						// Don't save the file or do anything below.
						continue;
					}

					if (mean >= minAcceptableMean && mean <= maxAcceptableMean)
					{
						// +++ at end makes it easier to see in log file
						Log(3, "  > Good image: mean within range of %d to %d ++++++++++, mean %d\n", minAcceptableMean, maxAcceptableMean, mean);
					}
					else if (attempts > maxHistogramAttempts)
					{
						 Log(3, "  > max attempts reached - using exposure of %s us with mean %d\n", length_in_units(cg.currentExposure_us, true), mean);
					}
					else if (attempts >= 1)
					{
						if (cg.currentExposure_us > cg.currentMaxAutoExposure_us)
						{
							 // If we call length_in_units() twice in same command line they both return the last value.
							Log(3, "  > Stopped trying: new exposure of %s ", length_in_units(cg.currentExposure_us, false));
							Log(3, "would be over max of %s\n", length_in_units(cg.currentMaxAutoExposure_us, false));

							long diff = (long)((float)cg.currentExposure_us * (1/(float)percentChange));
							cg.currentExposure_us -= diff;
							Log(3, "  > Decreasing next exposure by %d%% (%'ld us) to %'ld\n", percentChange, diff, cg.currentExposure_us);
						}
						else if (cg.currentExposure_us == cg.currentMaxAutoExposure_us)
						{
							Log(3, "  > Stopped trying: hit max exposure limit of %s, mean %d\n", length_in_units(cg.currentMaxAutoExposure_us, false), mean);
							// If currentExposure_us causes too high of a mean, decrease exposure
							// so on the next loop we'll adjust it.
							if (mean > maxAcceptableMean)
								cg.currentExposure_us--;
						}
						else if (newExposure_us == cg.currentExposure_us)
						{
							Log(3, "  > Stopped trying: newExposure_us == currentExposure_us == %s\n", length_in_units(cg.currentExposure_us, false));
						}
						else
						{
							Log(3, "  > Stopped trying, using exposure of %s us with mean %d, min=%d, max=%d\n", length_in_units(cg.currentExposure_us, false), mean, minAcceptableMean, maxAcceptableMean);
						}
						 
					}
					else if (cg.currentExposure_us == cg.currentMaxAutoExposure_us)
					{
						Log(3, "  > Did not make any additional attempts - at max exposure limit of %s, mean %d\n", length_in_units(cg.currentMaxAutoExposure_us, false), mean);
					}
					// xxxx TODO: this was "actualExposure_us = ..."	reportedExposure_us = currentExposure_us;

				} else {
					// Didn't use histogram method.
					// If we used auto-exposure, set the next exposure to the last reported
					// exposure, which is what the camera driver thinks the next exposure should be.
					// But temper it by the aggression value so we don't bounce up and down.
					if (cg.currentAutoExposure)
					{
						// If we're skipping frames we want to get to a good exposure as fast as
						// possible so don't set an adjustment.
						if (cg.aggression != 100 && cg.currentSkipFrames <= 0)
						{
							long exposureDiff_us, diff_us;
							diff_us = reportedExposure_us - cg.currentExposure_us;
							exposureDiff_us = diff_us * (float)cg.aggression / 100;
							if (exposureDiff_us != 0)
							{
								Log(4, "  > Next exposure full change is %s, ", length_in_units(diff_us, true));
								Log(4, "after aggression: %s ", length_in_units(exposureDiff_us, true));
								Log(4, "from %s ", length_in_units(cg.currentExposure_us, true));
								cg.currentExposure_us += exposureDiff_us;
								Log(4, "to %s\n", length_in_units(cg.currentExposure_us, true));
							}
						}
						else
						{
							cg.currentExposure_us = reportedExposure_us;
						}
					}
					else
					{
						// Didn't use auto-exposure - don't change exposure
					}
				}
#endif
				if (cg.currentSkipFrames > 0)
				{
#ifdef USE_HISTOGRAM
					// If we're already at a good exposure, or the last exposure was longer
					// than the max, don't skip any more frames.
// xxx TODO: should we have a separate variable to define "too long" instead of currentMaxAutoExposure_us?
					if ((mean >= MINMEAN && mean <= MAXMEAN) || lastExposure_us > cg.currentMaxAutoExposure_us)
					{
						cg.currentSkipFrames = 0;
					}
					else
#endif
					{
						Log(2, "  >>>> Skipping this frame\n");
						cg.currentSkipFrames--;
						// Do not save this frame or sleep after it.
						// We just started taking images so no need to check if DAY or NIGHT changed
						continue;
					}
				}

				// If takingDarkFrames is off, add overlay text to the image
				if (! cg.takingDarkFrames)
				{
					if (! externalOverlay)
					{
						(void) doOverlay(pRgb, cg, bufTime,
							lastExposure_us, actualTemp, actualGain, gainChange, mean, focusMetric);

#ifdef USE_HISTOGRAM
						if (cg.overlay.showHistogramBox && usedHistogram)
						{
							// Draw a rectangle where the histogram box is.
							// Put a black and white line one next to each other so they
							// can be seen in light and dark images.
							int lt = cv::LINE_AA, thickness = 2;
							int X1 = (cg.width * cg.HB.histogramBoxPercentFromLeft) - (cg.HB.histogramBoxSizeX / 2);
							int X2 = X1 + cg.HB.histogramBoxSizeX;
							int Y1 = (cg.height * cg.HB.histogramBoxPercentFromTop) - (cg.HB.histogramBoxSizeY / 2);
							int Y2 = Y1 + cg.HB.histogramBoxSizeY;
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
						gainChange = determineGainChange(cg.dayGain, cg.nightGain);
						setControl(cg.cameraNumber, ASI_GAIN, cg.currentGain + gainChange, cg.currentAutoGain ? ASI_TRUE : ASI_FALSE);
					}
				}

#ifndef USE_HISTOGRAM
				if (cg.currentAutoExposure)
				{
					// Retrieve the current Exposure for smooth transition to night time
					// as long as auto-exposure is enabled during night time
					cg.currentExposure_us = lastExposure_us;
				}
#endif

				// Save the image
				if (! bSavingImg)
				{
					if (! cg.takingDarkFrames)
					{
						// Create the name of the file that goes in the images/<date> directory.
						snprintf(cg.finalFileName, sizeof(cg.finalFileName), "%s-%s.%s",
							cg.fileNameOnly, formatTime(exposureStartDateTime, "%Y%m%d%H%M%S"), cg.imageExt);
					}
					snprintf(cg.fullFilename, sizeof(cg.fullFilename), "%s/%s", cg.saveDir, cg.finalFileName);

					pthread_mutex_lock(&mtxSaveImg);
					pthread_cond_signal(&condStartSave);
					pthread_mutex_unlock(&mtxSaveImg);
				}
				else
				{
					// Hopefully the user can use the time it took to save a file to disk
					// to help determine why they are getting this warning.
					// Perhaps their disk is very slow or their delay is too short.
					Log(0, "  > WARNING: currently saving an image; can't save new one at %s.\n", exposureStart);

					// TODO: wait for the prior image to finish saving.
				}

#ifndef USE_HISTOGRAM

				if (cg.currentAutoExposure && dayOrNight == "DAY")
				{
					cg.currentExposure_us = lastExposure_us;
				}
#endif
				std::string s;
				if (cg.currentAutoExposure)
				{
					s = "auto";
				}
				else
				{
					s = "manual";
#ifdef USE_HISTOGRAM
					if (usedHistogram)
						s = "histogram";
#endif
				}
				// Delay applied before next exposure
				delayBetweenImages(cg, lastExposure_us, s);

				dayOrNight = calculateDayOrNight(cg.latitude, cg.longitude, cg.angle);
			}
		}
		if (lastDayOrNight == "NIGHT")
		{
			endOfNight = true;
		}
	}

	closeUp(EXIT_OK);
}
