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

// Forward definitions
char *getRetCode(ASI_ERROR_CODE);
void closeUp(int);
bool checkMaxErrors(int *, int);

//-------------------------------------------------------------------------------------------------------
//-------------------------------------------------------------------------------------------------------


// These are global so they can be used by other routines.
// Variables for command-line settings are first and are "long" so we can use validateLong().

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
int numTotalErrors				= 0;				// Total number of errors, fyi
int numConsecutiveErrors		= 0;				// Number of consecutive errors
bool gotSignal					= false;			// Did we get a signal?
int iNumOfCtrl					= NOT_SET;			// Number of camera control capabilities
pthread_t threadDisplay			= 0;
pthread_t hthdSave				= 0;
int numExposures				= 0;				// how many valid pictures have we taken so far?
int currentBpp					= NOT_SET;			// bytes per pixel: 1, 2, or 3
bool capturingVideo				= false;			// are we capturing video?

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
			Log(-1, "*** %s: WARNING: ASIGetControlCaps() for control %d failed: %s, camNum=%d, iNumOfCtrl=%d, control=%d\n",
				CG.ME, i, getRetCode(ret), camNum, iNumOfCtrl, (int) control);
			return(ret);
		}

		if (ControlCaps.ControlType == control)
		{
			if (ControlCaps.IsWritable)
			{
				if (value > ControlCaps.MaxValue)
				{
					Log(-1, "*** %s: WARNING: Value of %ld greater than max value allowed (%ld) for control '%s' (#%d).\n",
						CG.ME, value, ControlCaps.MaxValue, ControlCaps.Name, ControlCaps.ControlType);
					value = ControlCaps.MaxValue;
				} else if (value < ControlCaps.MinValue)
				{
					Log(1, "*** %s: WARNING: Value of %ld less than min value allowed (%ld) for control '%s' (#%d).\n",
						CG.ME, value, ControlCaps.MinValue, ControlCaps.Name, ControlCaps.ControlType);
					value = ControlCaps.MinValue;
				}
			 	if (makeAuto == ASI_TRUE && ControlCaps.IsAutoSupported == ASI_FALSE)
				{
					Log(-1, "*** %s: WARNING: control '%s' (#%d) doesn't support auto mode.\n",
						CG.ME, ControlCaps.Name, ControlCaps.ControlType);
					makeAuto = ASI_FALSE;
				}
				ret = ASISetControlValue(camNum, control, value, makeAuto);
				if (ret != ASI_SUCCESS)
				{
					Log(-1, "*** %s: WARNING: ASISetControlValue() for control %d, value=%ld, camNum=%d, makeAuto=%d failed: %s\n",
						CG.ME, control, value, camNum, makeAuto, getRetCode(ret));
					return(ret);
				}
			} else {
				Log(0, "*** %s: ERROR: ControlCap: '%s' (#%d) not writable; not setting to %ld.\n",
						CG.ME, ControlCaps.Name, ControlCaps.ControlType, value);
				ret = ASI_ERROR_INVALID_MODE;	// this seemed like the closest error
			}
			return ret;
		}
	}
	Log(-2, "NOTICE: Camera does not support ControlCap # %d; not setting to %ld.\n", control, value);
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
		cv::waitKey(500);
	}
	cv::destroyWindow("Preview");
	Log(4, "Display thread over\n");
	return (void *)0;
}

// Save the image.
void saveImage()
{
		// I don't know how to cast "st" to 0, so call now() and ignore it.
		auto st = std::chrono::high_resolution_clock::now();
		auto et = st;

		bool result = false;
		if (pRgb.data)
		{
			bSavingImg = true;

			Log(4, "  > Saving %s image '%s'\n",
				CG.takeDarkFrames ? "dark" : dayOrNight.c_str(), CG.finalFileName);

			char cmd[1100+strlen(CG.allskyHome)];

			if (CG.focusMode)
			{
				snprintf(cmd, sizeof(cmd), "%s/saveImage.sh %s '%s' --focus-mode %ld %d", CG.allskyScripts,
					dayOrNight.c_str(), CG.fullFilename, CG.lastFocusMetric, numExposures);
				// In focusMode, wait for processing to complete since we
				// don't otherwise delay between images.
			}
			else
			{
				snprintf(cmd, sizeof(cmd), "%s/saveImage.sh %s '%s'", CG.allskyScripts,
					dayOrNight.c_str(), CG.fullFilename);
				add_variables_to_command(CG, cmd, exposureStartDateTime);
				strcat(cmd, " &");
			}

			try
			{
				st = std::chrono::high_resolution_clock::now();
				result = imwrite(CG.fullFilename, pRgb, compressionParameters);
				et = std::chrono::high_resolution_clock::now();
			}
			catch (const cv::Exception& ex)
			{
				Log(0, "*** %s: ERROR: Exception saving image: %s\n", CG.ME, ex.what());
			}

			if (result)
			{
				system(cmd);

				static int totalSaves = 0;
				static double totalTime_ms = 0;

				totalSaves++;
				long long diff_us = std::chrono::duration_cast<std::chrono::microseconds>(et - st).count();
				double diff_ms = diff_us / US_IN_MS;
				totalTime_ms += diff_ms;

				Log(4, "  > Image took %'.1f ms to save (average %'.1f ms).\n",
					diff_ms, totalTime_ms / totalSaves);
			}
			else
			{
				Log(0, "*** %s: ERROR: Unable to save image '%s'.\n", CG.ME, CG.fullFilename);
			}

			bSavingImg = false;

		} else {
			// This can happen if the program is closed before the first picture.
			Log(0, "----- SaveImgThd(): pRgb.data is null\n");
		}
}

// Save an image using a separate thread so it's done in parallel.
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

		saveImage();

		pthread_mutex_unlock(&mtxSaveImg);
	}

	return (void *)0;
}


// As of July 2021, ZWO's SDK (version 1.9) has a bug where autoexposure daylight shots'
// exposures jump all over the place. One is way too dark and the next way too light, etc.
// As a workaround, our histogram code replaces ZWO's code auto-exposure mechanism.
// We look at the mean brightness of an X by X rectangle in image, and adjust exposure based on that.

// FIXME prevent this from misbehaving when unreasonable settings are given,
// eg. box size 0x0, box size WxW, box crosses image edge, ... basically
// anything that would read/write out-of-bounds

double computeHistogram(unsigned char *imageBuffer, config cg, bool useHistogramBox)
{
	unsigned char *buf = imageBuffer;
	const int histogramEntries = 256;
	int histogram[histogramEntries];
	long widthInBytes;

	// Clear the histogram array.
	for (int i = 0; i < histogramEntries; i++) {
		histogram[i] = 0;
	}

	// Different image types have a different number of bytes per pixel.
	widthInBytes = (int)cg.width * currentBpp;
//x printf(">>>>>>>>>>>> 0 cg.width=%ld, cg.height=%ld, widthInBytes=%ld\n", cg.width, cg.height, widthInBytes);
	int roiX1, roiX2, roiY1, roiY2;		// X values are in bytes
	if (useHistogramBox)
	{
		roiX1 = (widthInBytes * cg.HB.histogramBoxPercentFromLeft) - (cg.HB.currentHistogramBoxSizeX * currentBpp / 2);
		roiX2 = roiX1 + (currentBpp * cg.HB.currentHistogramBoxSizeX);
		roiY1 = ((int)cg.height * cg.HB.histogramBoxPercentFromTop) - (cg.HB.currentHistogramBoxSizeY / 2);
		roiY2 = roiY1 + cg.HB.currentHistogramBoxSizeY;

		// Start off and end on a logical pixel boundries.
		roiX1 = (roiX1 / currentBpp) * currentBpp;
		roiX2 = (roiX2 / currentBpp) * currentBpp;
	} else {
		roiX1 = 0;
		roiX2 = widthInBytes;
		roiY1 = 0;
		roiY2 = cg.height;
	}
//x printf(">>>>>>>>>>>> 1 roiX1=%d, roiY1=%d, roiX2=%d, roiY2=%d\n", roiX1, roiY1, roiX2, roiY2);

	// For RGB24, data for each pixel is stored in 3 consecutive bytes: blue, green, red.
	// For all image types, each row in the image contains one row of pixels.
	// currentBpp doesn't apply to rows, just columns.

// this debugging code is to prove to myself that we're not overwriting buf[].
int numOver = 0;
int totalBytes = cg.width * cg.height;
	switch (cg.imageType) {
	case IMG_RGB24:
	case IMG_RAW8:
	case IMG_Y8:
		for (int y = roiY1; y < roiY2; y++) {
			for (int x = roiX1; x < roiX2; x += currentBpp) {
				int i = (widthInBytes * y) + x;
				int avg = buf[i];
				if (cg.imageType == IMG_RGB24) {
					// For RGB24 this averages the blue, green, and red pixels.
					// avg already contains the first color from above, so just add the other 2:
					avg += buf[i+1] + buf[i+2];
					avg /= currentBpp;
				}
				histogram[avg]++;
			}
		}
		break;
	case IMG_RAW16:
totalBytes *= 2;
		for (int y = roiY1; y < roiY2; y++) {
			for (int x = roiX1; x < roiX2; x+=currentBpp) {
				int i = (widthInBytes * y) + x;
				int pixelValue;
				// Use the least significant byte.
				// This assumes the image data is laid out in big endian format.
if (i >= totalBytes-1) numOver++;
				pixelValue = buf[i+1];
				if (pixelValue < histogramEntries)
				{
					histogram[pixelValue]++;
				}
			}
		}
if (numOver) printf(">>>>>> ERROR: OVERFLOW: numOver=%d, totalBytes=%'d\n", numOver, totalBytes);
		break;
	case ASI_IMG_END:
		break;
	}

	// Now calculate the mean.
	int a = 0, b = 0;
	for (int i = 0; i < histogramEntries; i++) {
		a += (i+1) * histogram[i];
		b += histogram[i];
	}

	if (b == 0)
	{
		// This is one heck of a dark picture!
		return(0);
	}

	// Need to normalize from 0.0 to 1.0.
	return ((a/b - 1) / (double)histogramEntries);
}

// This is based on code from PHD2.
// Camera has internal frame buffers we need to clear.
// The camera and/or driver will buffer frames and return the oldest one which
// could be very old. Read out all the buffered frames so the frame we get is current.
ASI_ERROR_CODE flushBufferedImages(config *cg, unsigned char *buf, long size)
{
	enum { NUM_IMAGE_BUFFERS = 2 };
	ASI_ERROR_CODE status;

	status = setControl(cg->cameraNumber, ASI_EXPOSURE, cg->cameraMinExposure_us, ASI_FALSE);
	if (status != ASI_SUCCESS)
	{
		Log(0, "*** %s: ERROR: flushBufferedImages() setControl() returned %s\n", cg->ME, getRetCode(status));
		return(status);
	}

	for (int i = 0; i < NUM_IMAGE_BUFFERS; i++)
	{
		status = ASIGetVideoData(cg->cameraNumber, buf, size, 500 + (2 * cg->cameraMinExposure_us));
		if (status == ASI_SUCCESS)
		{
			Log(3, "  > [Cleared buffer frame]: %s\n", getRetCode(status));
		}
		else if (status == ASI_ERROR_TIMEOUT)
		{
			// No more frames left in buffer.
			return(status);
		}
		else
		{
			Log(1, "%s: WARNING: flushBufferedImages() got %s\n", cg->ME, getRetCode(status));
		}
	}

	return(status);
}


// In version 0.8 we introduced a different way to take exposures. Instead of turning video mode on at
// the beginning of the program and off at the end (which kept the camera running all the time, heating it up),
// version 0.8 turned video mode on, then took a picture, then turned it off. This helps cool the camera,
// but some users (seems hit or miss) get ASI_ERROR_TIMEOUTs when taking exposures with the new method.
// So, we added the ability for them to use the 0.7 video-always-on method, or the 0.8 "new exposure" method.
// In the 2024 version we added "snapshot" mode to overcome the ASI_ERROR_TIMEOUTs.

// Next exposure suggested by the camera.
long suggestedNextExposure_us = 0;

// "auto" flag returned by ASIGetControlValue(), when we don't care what it is.
ASI_BOOL bAuto = ASI_FALSE;

ASI_BOOL wasAutoExposure = ASI_FALSE;
long bufferSize = NOT_SET;

ASI_ERROR_CODE takeOneExposure(config *cg, unsigned char *imageBuffer)
{
	if (imageBuffer == NULL) {
		return (ASI_ERROR_CODE) -1;
	}

	ASI_ERROR_CODE status, ret;
	int exitCode;

	// ZWO recommends timeout_ms = (exposure*2) + 500 ms
	// After some discussion, we're doing +5000ms to account for delays induced by
	// USB contention, such as that caused by heavy USB disk IO
	long timeout_ms = ((cg->currentExposure_us * 2) / US_IN_MS) + 5000;

	// Sanity check.
	if (cg->HB.useHistogram && cg->currentAutoExposure)
		Log(0, "  > %s: ERROR: HB.useHistogram AND currentAutoExposure are both set\n", cg->ME);

	if (cg->ZWOexposureType != ZWOsnap)
		flushBufferedImages(cg, imageBuffer, bufferSize);

	setControl(cg->cameraNumber, ASI_EXPOSURE, cg->currentExposure_us, cg->currentAutoExposure ? ASI_TRUE : ASI_FALSE);

	if (cg->ZWOexposureType == ZWOvideoOff && ! capturingVideo)
	{
		status = ASIStartVideoCapture(cg->cameraNumber);
		if (status != ASI_SUCCESS) {
			Log(0, "  > %s: ERROR: ASIStartVideoCapture() failed: %s.\n", cg->ME, getRetCode(status));
			if (! checkMaxErrors(&exitCode, cg->maxErrors))
				closeUp(exitCode);

			return(status);
		}
		capturingVideo = true;
	}

	// Make sure the actual time to take the picture is "close" to the requested time.
	auto tStart = std::chrono::high_resolution_clock::now();

	if (cg->ZWOexposureType == ZWOsnap)
	{
		status = ASIStartExposure(cg->cameraNumber, ASI_FALSE);
		if (status != ASI_SUCCESS)
		{
			Log(0, "  > %s: ERROR: ASIStartExposure() failed: %s.\n", cg->ME, getRetCode(status));
			if (! checkMaxErrors(&exitCode, cg->maxErrors))
				closeUp(exitCode);

			return(status);
		}

		// Do an initial sleep of the exposure time + 500 ms for overhead,
		// then go into a check_status / sleep loop where
		// we sleep for 5% of the exposure time.
		// The total sleep time will be longer than exposure time due to overhead starting the exposure.
		long initial_sleep_us = cg->currentExposure_us + 500 * US_IN_MS;
		long sleep_us = std::max(cg->currentExposure_us * 0.05, 1.0);
		Log(4, "      > Doing initial usleep(%'ld) for exposure time %'ld.\n", initial_sleep_us, cg->currentExposure_us);
		usleep(initial_sleep_us);

		// We should be fairly close to the end of the exposure so now go
		// into a loop until the exposure is done.
		ASI_EXPOSURE_STATUS s = ASI_EXP_WORKING;
		int num_sleeps = 0;
		while (s == ASI_EXP_WORKING)
		{
			status = ASIGetExpStatus(cg->cameraNumber, &s);
			if (status != ASI_SUCCESS)
			{
				Log(0, "  > %s: ERROR: ASIGetExpStatus() failed after %d sleeps: %s.\n",
					cg->ME, num_sleeps, getRetCode(status));
				if (! checkMaxErrors(&exitCode, cg->maxErrors))
					closeUp(exitCode);

				return(status);
			}
			usleep(sleep_us);
			num_sleeps++;
		}
		Log(4, "      > Did usleep(%'ld) %d times in loop for total usleep() of %'ldus\n",
			sleep_us, num_sleeps, initial_sleep_us + (sleep_us * num_sleeps));

		// Exposure done, if it worked get the image
		if (s != ASI_EXP_SUCCESS)
		{
			// This error DOES happen sometimes.
			// Unfortunately "s" is either success or failure - not much help.
			Log(1, "    > ERROR: Exposure failed after %d sleeps, s=%d.\n", num_sleeps, s);
			if (! checkMaxErrors(&exitCode, cg->maxErrors))
				closeUp(exitCode);

			return(ASI_ERROR_END);
		}

		status = ASIGetDataAfterExp(cg->cameraNumber,  imageBuffer, bufferSize);
		if (status != ASI_SUCCESS)
		{
			// For whatever reason this does fail sometimes, so to avoid having
			// every failure appear in the WebUI message center, log with level 1.
			Log(1, "  > ERROR: ASIGetDataAfterExp() failed after %d sleeps: %s.\n",
				num_sleeps, getRetCode(status));
			if (! checkMaxErrors(&exitCode, cg->maxErrors))
				closeUp(exitCode);

			return(status);
		}

	} else {	// some video mode
		status = ASIGetVideoData(cg->cameraNumber, imageBuffer, bufferSize, timeout_ms);
		if (status != ASI_SUCCESS)
		{
			Log(0, "  > %s: ERROR: Failed getting image: %s.\n",
				cg->ME, getRetCode(status));
	
			// Check if we reached the maximum number of consective errors
			if (! checkMaxErrors(&exitCode, cg->maxErrors))
				closeUp(exitCode);
			return(status);
		}
		if (cg->ZWOexposureType == ZWOvideoOff)
		{
			ret = ASIStopVideoCapture(cg->cameraNumber);
			if (ret != ASI_SUCCESS)
			{
				Log(1, "  > WARNING: ASIStopVideoCapture() failed: %s\n", getRetCode(ret));
				// continue
			}
			capturingVideo = false;
		}
	}

	// We successfully got the image so reset the global error counter;
	numConsecutiveErrors = 0;

	// The timeToTakeImage_us should never be less than what was requested.
	// and shouldn't be less then the time taken plus overhead of setting up the shot.

	auto tElapsed = std::chrono::high_resolution_clock::now() - tStart;
	long timeToTakeImage_us = std::chrono::duration_cast<std::chrono::microseconds>(tElapsed).count();
	long diff_us = timeToTakeImage_us - cg->currentExposure_us;
	long threshold_us = 0;

	bool tooShort = false;
	if (diff_us < 0)
	{
		// This "should" never happen but actually does sometimes.
		tooShort = true;
	}
	else if (cg->currentExposure_us > (5 * US_IN_SEC))
	{
		// There is too much variance in the overhead of taking pictures to
		// accurately determine the actual time to take an image at short exposures,
		// so only check for long ones.
		// Testing shows there's about this much us overhead (at least for video mode),
		// so subtract it to get our best estimate of the "actual" time.
		const int OVERHEAD_us = (int) (340 * US_IN_MS);

		// Don't subtract if it would have made timeToTakeImage_us negative.
		if (timeToTakeImage_us > OVERHEAD_us)
			diff_us -= OVERHEAD_us;

		float t;
		// These seem like good numbers.
		// snapshot mode seems more consistent so use a lower threshold.
		if (cg->ZWOexposureType == ZWOsnap)
			t = 0.2;
		else
			t = 0.5;
		threshold_us = cg->currentExposure_us * t;
		if (abs(diff_us) > threshold_us)
			tooShort = true;
	}

	if (tooShort)
	{
		Log(1, "   *** WARNING: Time to take exposure (%s) ",
			length_in_units(timeToTakeImage_us, true));
		Log(1, "differs from requested exposure time (%s) by %s, threshold=%s\n",
			length_in_units(cg->currentExposure_us, true),
			length_in_units(diff_us, true),
			length_in_units(threshold_us, true));
	}
	else
	{
		Log(4, "      > Time to take exposure=%'ld us, diff_us=%'ld", timeToTakeImage_us, diff_us);
		if (threshold_us > 0)
			Log(4, ", threshold_us=%'ld", threshold_us);
		Log(4, "\n");
	}

	// Get some metadata on the image.

	long l;
	ret = ASIGetControlValue(cg->cameraNumber, ASI_GAIN, &l, &bAuto);
	if (ret != ASI_SUCCESS)
	{
		Log(1, "  > %s: WARNING: ASIGetControlValue(ASI_GAIN) failed: %s\n", cg->ME, getRetCode(ret));
	}
	else
	{
		cg->lastGain = (double) l;
	}

	char tempBuf[500] = { 0 };
	char *tb = tempBuf;

	cg->lastMean = computeHistogram(imageBuffer, *cg, cg->takeDarkFrames ? false : true);
	sprintf(tb, " @ mean %.3f, %sgain %ld",
		cg->lastMean, cg->currentAutoGain ? "(auto) " : "", (long) cg->lastGain);
	cg->lastExposure_us = cg->currentExposure_us;

	// Per ZWO, when in manual-exposure mode, the returned exposure length
	// should always be equal to the requested length;
	// they said, "there's no need to call ASIGetControlValue()".
	// When in auto-exposure mode the returned exposure length is what the driver thinks the
	// next exposure should be, and will eventually converge on the correct exposure.

	Log(1, "  > GOT IMAGE%s.\n", tb);

	ret = ASIGetControlValue(cg->cameraNumber, ASI_EXPOSURE, &suggestedNextExposure_us, &wasAutoExposure);
	if (ret != ASI_SUCCESS)
	{
		Log(1, "  > WARNING: ASIGetControlValue(ASI_EXPOSURE) failed: %s\n",
			cg->ME, getRetCode(ret));
	}
	else if (cg->ZWOexposureType != ZWOsnap)
	{
		const char *m;
		if (cg->HB.useHistogram) {
			m = " Ignoring suggested next exposure of %s.";
		} else {
			m = "  Suggested next exposure: %s.";
		}
		Log(3, "  >>> ");
		Log(3, m, length_in_units(suggestedNextExposure_us, true));
	}

	long temp;
	ret = ASIGetControlValue(cg->cameraNumber, ASI_TEMPERATURE, &temp, &bAuto);
	if (ret != ASI_SUCCESS)
	{
		Log(1, "  > %s: WARNING: ASIGetControlValue(ASI_TEMPERATURE) failed: %s\n",
			cg->ME, getRetCode(ret));
	}
	else
	{
		cg->lastSensorTemp = (double)temp / cg->divideTemperatureBy;
	}

	if (cg->isColorCamera)
	{
		ret = ASIGetControlValue(cg->cameraNumber, ASI_WB_R, &l, &bAuto);
		if (ret != ASI_SUCCESS)
		{
			Log(1, "  > %s: WARNING: ASIGetControlValue(ASI_WB_R) failed: %s\n",
				cg->ME, getRetCode(ret));
		}
		else
		{
			cg->lastWBR = (double) l;
		}

		ret = ASIGetControlValue(cg->cameraNumber, ASI_WB_B, &l, &bAuto);
		if (ret != ASI_SUCCESS)
		{
			Log(1, "  > %s: WARNING: ASIGetControlValue(ASI_WB_B) failed: %s\n",
				cg->ME, getRetCode(ret));
		}
		else
		{
			cg->lastWBB = (double) l;
		}
	}

	if (cg->asiAutoBandwidth)
	{
		ret = ASIGetControlValue(cg->cameraNumber, ASI_BANDWIDTHOVERLOAD, &cg->lastAsiBandwidth, &wasAutoExposure);
		if (ret != ASI_SUCCESS)
		{
			Log(1, "  > %s: WARNING: ASIGetControlValue(ASI_BANDWIDTHOVERLOAD) failed: %s\n", cg->ME, getRetCode(ret));
		}
	}

	return ASI_SUCCESS;
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
	// The transition period is in seconds, the max exposures and delays are in milliseconds,
	// so convert to seconds to compare to transition period.
	float totalTimeInSec;
	totalTimeInSec = ((float) cg.currentMaxAutoExposure_us / US_IN_SEC) +
		((float) cg.currentDelay_ms / MS_IN_SEC);
/* xxxx remove after we know new gain algorithm works
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
*/

	gainTransitionImages = ceil(cg.gainTransitionTime / totalTimeInSec);
	Log(4, " gainTransitionImages=%d, gainTransitionTime=%d, totalTimeInSec=%f\n",
		gainTransitionImages, cg.gainTransitionTime, totalTimeInSec);
	if (gainTransitionImages == 0)
	{
		Log(-1, "*** INFORMATION: Not adjusting gain - your 'Gain Transition Time' (%d seconds) is less than the time to take one image plus its delay (%.1f seconds).\n", cg.gainTransitionTime, totalTimeInSec);
		return(false);
	}

	totalAdjustGain = cg.nightGain - cg.dayGain;
	perImageAdjustGain = ceil((float) totalAdjustGain / gainTransitionImages);	// spread evenly
	if (perImageAdjustGain == 0)
		perImageAdjustGain = totalAdjustGain;
	else
	{
		// Since we can't adust gain by fractions,
		// see if there's any "left over" after gainTransitionImages.
		// For example, if totalAdjustGain is 7 and we're adjusting by 3 each of 2 times,
		// we need an extra transition to get the remaining 1 ((7 - (3 * 2)) == 1).
		if (gainTransitionImages * perImageAdjustGain < totalAdjustGain)
			gainTransitionImages++;		// this one will get the remaining amount
	}
	Log(4, " totalAdjustGain=%d, gainTransitionImages=%d, perImageAdjustGain=%d\n",
		totalAdjustGain, gainTransitionImages, perImageAdjustGain);

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
		Log(4, "  No more gain changes needed.\n");
		currentAdjustGain = false;
		return(0);
	}

	numGainChanges++;
	int amt;	// amount to adjust gain on next picture
	if (dayOrNight == "DAY")
	{
		// When DAY begins the last image was at nightGain but the first day
		// image (ignoring transition) is dayGain so we want to go down
		// from nightGain to dayGain.
		// Increase the first image's gain by perImageAdjustGain - totalAdjustGain (which
		// will be a big positive number), then increase the next image less,
		// and so on until we get to dayGain.

		// This assumes night gain is > day gain.
//x Log(4, ">> DAY: amt=%d, perImageAdjustGain=%d, numGainChanges=%d\n", amt, perImageAdjustGain, numGainChanges);
		amt = totalAdjustGain - (perImageAdjustGain * numGainChanges);
		if (amt < 0)
		{
			amt = 0;
			totalAdjustGain = 0;	// we're done making changes
		}
	}
	else	// NIGHT
	{
		// When NIGHT begins the last image was at dayGain but the first night
		// image (ignoring transition) is nightGain so we want to go up
		// from dayGain to nightGain.
		// Decrease the first image's gain by perImageAdjustGain - totalAdjustGain (which
		// will be a big negative number), then decrease the next image less,
		// and so on until we get to nightGain.
		amt = (perImageAdjustGain * numGainChanges) - totalAdjustGain;
		if (amt > 0)
		{
			amt = 0;
			totalAdjustGain = 0;	// we're done making changes
		}
	}

	Log(4, "Adjusting %s gain on next image by %d to %d (currentGain=%d); will be gain change # %d of %d.\n",
		dayOrNight.c_str(), amt, amt+(int)cg.currentGain,
		(int) cg.currentGain, numGainChanges, gainTransitionImages);

	return(amt);
}

// Check if the maximum number of consecutive errors has been reached
bool checkMaxErrors(int *e, int maxErrors)
{
	// Once takeOneExposure() fails with a timeout, it seems to always fail,
	// even with extremely large timeout values, so apparently ASI_ERROR_TIMEOUT doesn't
	// necessarily mean it's timing out. Exit forcing us to be restarted.
	numTotalErrors++;
	Log(1, "  > Total errors=%'d\n", numTotalErrors);
	numConsecutiveErrors++; sleep(2);
	if (numConsecutiveErrors >= maxErrors)
	{
		*e = EXIT_RESET_USB;		// exit code. Need to reset USB bus
		Log(0, "*** %s: ERROR: Maximum number of consecutive errors of %d reached; capture program exiting.\n",
			CG.ME, maxErrors);
		return(false);	// gets us out of inner and outer loop
	}
	return(true);
}

//-------------------------------------------------------------------------------------------------------
//-------------------------------------------------------------------------------------------------------

int main(int argc, char *argv[])
{
	CG.ME = basename(argv[0]);
	
	CG.allskyHome = getenv("ALLSKY_HOME");
	if (CG.allskyHome == NULL)
	{
		Log(0, "*** %s: ERROR: ALLSKY_HOME not set!\n", CG.ME);
		exit(EXIT_ERROR_STOP);
	}

	if (! getCommandLineArguments(&CG, argc, argv, false))
	{
		// getCommandLineArguments outputs an error message.
		exit(EXIT_ERROR_STOP);
	}

	pthread_mutex_init(&mtxSaveImg, 0);
	pthread_cond_init(&condStartSave, 0);

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
	// but the chances of someone wanting different versions are hopefully small.

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

	//---------------------------------------------------------------------------------------------
	//---------------------------------------------------------------------------------------------
	setlinebuf(stdout);		// Line buffer output so entries appear in the log immediately.

	CG.ct = ctZWO;

	processConnectedCameras();	// exits on error.  Sets CG.cameraNumber.

	asiRetCode = ASIOpenCamera(CG.cameraNumber);
	if (asiRetCode != ASI_SUCCESS)
	{
		Log(0, "*** %s: ERROR: opening camera, check that you have root permissions! (%s)\n",
			CG.ME, getRetCode(asiRetCode));
		closeUp(EXIT_NO_CAMERA);
	}

	ASI_CAMERA_INFO ASICameraInfo;
	asiRetCode = ASIGetCameraProperty(&ASICameraInfo, CG.cameraNumber);
	if (asiRetCode != ASI_SUCCESS)
	{
		Log(0, "*** %s: ERROR: ASIGetCamerProperty() returned: %s\n", CG.ME, getRetCode(asiRetCode));
		exit(EXIT_ERROR_STOP);
	}
	asiRetCode = ASIGetNumOfControls(CG.cameraNumber, &iNumOfCtrl);
	if (asiRetCode != ASI_SUCCESS)
	{
		Log(0, "*** %s: ERROR: ASIGetNumOfControls() returned: %s\n", CG.ME, getRetCode(asiRetCode));
		exit(EXIT_ERROR_STOP);
	}
	CG.ASIversion = ASIGetSDKVersion();

	// Set defaults that depend on the camera type.
	if (! setDefaults(&CG, ASICameraInfo))
		closeUp(EXIT_ERROR_STOP);

	if (CG.configFile[0] != '\0' && ! getConfigFileArguments(&CG))
	{
		// getConfigFileArguments() outputs error messages
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

	if (CG.saveCC)
	{
		saveCameraInfo(ASICameraInfo, CG.CC_saveFile, iMaxWidth, iMaxHeight, pixelSize, bayer[ASICameraInfo.BayerPattern]);
		closeUp(EXIT_OK);
	}

	outputCameraInfo(ASICameraInfo, CG, iMaxWidth, iMaxHeight, pixelSize, bayer[ASICameraInfo.BayerPattern]);
	// checkExposureValues() must come after outputCameraInfo().
	(void) checkExposureValues(&CG);

	// The histogram box needs to fit on the image.
	// If we're binning we'll decrease the size of the box accordingly.
	bool ok = true;
	if (CG.HB.sArgs[0] != '\0')
	{
		if (sscanf(CG.HB.sArgs, "%d %d %f %f", &CG.HB.histogramBoxSizeX, &CG.HB.histogramBoxSizeY,
			&CG.HB.histogramBoxPercentFromLeft, &CG.HB.histogramBoxPercentFromTop) != 4)
		{
			Log(0, "*** %s: ERROR: Not enough histogram box parameters; should be 4: '%s'\n", CG.ME, CG.HB.sArgs);
			ok = false;
		} else {
			if (CG.HB.histogramBoxSizeX < 1 || CG.HB.histogramBoxSizeY < 1)
			{
				Log(0, "*** %s: ERROR: Histogram box size must be > 0; you entered X=%d, Y=%d\n",
					CG.ME, CG.HB.histogramBoxSizeX, CG.HB.histogramBoxSizeY);
				ok = false;
			}
			if (CG.HB.histogramBoxPercentFromLeft < 0.0 || CG.HB.histogramBoxPercentFromTop < 0.0)
			{
				Log(0, "*** %s: ERROR: Histogram box percents must be > 0; you entered X=%.0f%%, Y=%.0f%%\n",
					CG.ME, (CG.HB.histogramBoxPercentFromLeft*100.0), (CG.HB.histogramBoxPercentFromTop*100.0));
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
					Log(0, "*** %s: ERROR: Histogram box location must fit on image; upper left of box is %dx%d, lower right %dx%d%s\n",
						CG.ME, CG.HB.leftOfBox, CG.HB.topOfBox, CG.HB.rightOfBox, CG.HB.bottomOfBox);
					ok = false;
				}	// else everything is hunky dory
			}
		}
	} else {
		Log(0, "*** %s: ERROR: No values specified for histogram box.\n", CG.ME);
		ok = false;
	}

	if (! ok)
	{
		closeUp(EXIT_ERROR_STOP);	// force the user to fix it
	}

	asiRetCode = ASIInitCamera(CG.cameraNumber);
	if (asiRetCode != ASI_SUCCESS)
	{
		Log(0, "*** %s: ERROR: Unable to initialise camera: %s\n", CG.ME, getRetCode(asiRetCode));
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
		Log(0, "*** %s: ERROR: Unknown Image Type: %d\n", CG.ME, CG.imageType);
		closeUp(EXIT_ERROR_STOP);
	}

	//-------------------------------------------------------------------------------------------------------
	//-------------------------------------------------------------------------------------------------------

	displaySettings(CG);

	// These configurations apply to both day and night.
	// Other calls to setControl() are done after we know if we're in daytime or nighttime.
	if (CG.asiBandwidth != NOT_CHANGED)
		setControl(CG.cameraNumber, ASI_BANDWIDTHOVERLOAD, CG.asiBandwidth, CG.asiAutoBandwidth ? ASI_TRUE : ASI_FALSE);
	if (CG.flip != NOT_CHANGED)
		setControl(CG.cameraNumber, ASI_FLIP, CG.flip, ASI_FALSE);

	if (! bSaveRun && pthread_create(&hthdSave, 0, SaveImgThd, 0) == 0)
	{
		bSaveRun = true;
	}

	// Initialization
	// Have we displayed "not taking picture during day/night" message, if applicable?
	bool displayedNoDaytimeMsg		= false;
	bool displayedNoNighttimeMsg	= false;
	int gainChange					= 0;		// how much to change gain up or down

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

	if (CG.ZWOexposureType == ZWOvideo && ! capturingVideo)
	{
		// Start video capture; we'll stop when exiting.
		asiRetCode = ASIStartVideoCapture(CG.cameraNumber);
		if (asiRetCode != ASI_SUCCESS)
		{
			Log(0, "*** %s: ERROR: Unable to start video capture: %s\n", CG.ME, getRetCode(asiRetCode));
			closeUp(EXIT_ERROR_STOP);
		}
		capturingVideo = true;
	}

	if (CG.focusMode)
	{
		// Make things as efficient as possible.
		CG.debugLevel = 1;
		CG.daytimeCapture = true;		CG.daytimeSave = false;
		CG.nighttimeCapture = true;		CG.nighttimeSave = false;
		CG.determineFocus = true;
		CG.dayDelay_ms = 0;
		CG.nightDelay_ms = 0;
		CG.consistentDelays = false;
	}

	// Start taking pictures

	while (bMain)
	{
		// Find out if it is currently DAY or NIGHT
		dayOrNight = calculateDayOrNight(CG.latitude, CG.longitude, CG.angle);
		std::string lastDayOrNight = dayOrNight;

		if (CG.takeDarkFrames)
		{
			// We're doing dark frames so turn off autoexposure and autogain, and use
			// nightime gain, delay, max exposure, and bin to mimic a nightime shot.
			CG.currentSkipFrames = 0;
			CG.currentAutoExposure = false;
			CG.nightAutoExposure = false;
			CG.currentAutoGain = false;
			CG.currentGain = CG.nightGain;

			// not needed since we're not using auto gain, but set to be consistent
			CG.currentMaxAutoGain = CG.nightMaxAutoGain;

			gainChange = 0;
			CG.currentDelay_ms = CG.nightDelay_ms;
			CG.currentMaxAutoExposure_us = CG.currentExposure_us = CG.nightMaxAutoExposure_us;
			CG.currentBin = CG.nightBin;
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
			CG.myModeMeanSetting.currentMean_threshold = NOT_SET;
			CG.myModeMeanSetting.modeMean = false;
			CG.HB.useHistogram = false;

			Log(1, "Taking dark frames...\n");

			(void) displayNotificationImage("--expires 0 DarkFrames &");
		}

		else if (dayOrNight == "DAY")
		{
			if (justTransitioned == true)
			{
				// Just transitioned from night to day, so execute end of night script
				Log(1, "Processing end of night data\n");
				snprintf(bufTemp, sizeof(bufTemp)-1, "%s/endOfNight.sh &", CG.allskyScripts);
				system(bufTemp);
				justTransitioned = false;
				displayedNoDaytimeMsg = false;
			}

			if (! CG.daytimeCapture)
			{
				// true == for daytime
				displayedNoDaytimeMsg = day_night_timeSleep(displayedNoDaytimeMsg, CG, true);

				// No need to do any of the code below so go back to the main loop.
				continue;
			}

			Log(1, "==========\n=== Starting daytime %s ===\n==========\n",
				CG.focusMode ? "focus mode" : "capture");

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
				Log(3, "Using the last night exposure (%s),", length_in_units(CG.currentExposure_us, true));
				CG.currentExposure_us = (CG.currentExposure_us * oldGain) / newGain;
				Log(3," old (%'2f) and new (%'2f) Gain to calculate new exposure of %s\n",
					oldGain, newGain, length_in_units(CG.currentExposure_us, true));
			}

			CG.currentMaxAutoExposure_us = CG.dayMaxAutoExposure_us;
			Log(3, "currentMaxAutoExposure_us set to daytime value of %s.\n",
				length_in_units(CG.currentMaxAutoExposure_us, true));
			if (CG.currentExposure_us > CG.currentMaxAutoExposure_us) {
				Log(3, "Decreasing currentExposure_us from %s to %s\n",
					length_in_units(CG.currentExposure_us, true),
					length_in_units(CG.currentMaxAutoExposure_us, true));
				CG.currentExposure_us = CG.currentMaxAutoExposure_us;
			}

			// Don't use camera auto-exposure since we mimic it ourselves.
			CG.HB.useHistogram = CG.dayAutoExposure;
			// With the histogram method we NEVER use ZWO auto exposure - either the user said
			// not to, or we turn it off ourselves.
			CG.currentAutoExposure = false;
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
			CG.currentAutoGain = CG.dayAutoGain;
			currentAdjustGain = resetGainTransitionVariables(CG);
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
			CG.myModeMeanSetting.currentMean = CG.myModeMeanSetting.dayMean;
			CG.myModeMeanSetting.currentMean_threshold = CG.myModeMeanSetting.dayMean_threshold;
			if (CG.isCooledCamera)
			{
				CG.currentEnableCooler = CG.dayEnableCooler;
				CG.currentTargetTemp = CG.dayTargetTemp;
			}
		}

		else	// NIGHT
		{
			if (justTransitioned == true)
			{
				// Just transitioned from day to night, so execute end of day script
				Log(1, "Processing end of day data\n");
				snprintf(bufTemp, sizeof(bufTemp)-1, "%s/endOfDay.sh &", CG.allskyScripts);
				system(bufTemp);
				justTransitioned = false;
			}

			if (! CG.nighttimeCapture)
			{
				// false == for nighttime
				displayedNoNighttimeMsg = day_night_timeSleep(displayedNoNighttimeMsg, CG, false);

				// No need to do any of the code below so go back to the main loop.
				continue;
			}

			Log(1, "==========\n=== Starting nighttime %s ===\n==========\n",
				CG.focusMode ? "focus mode" : "capture");

			// We only skip initial frames if we are starting in nighttime and using auto-exposure.
			if (numExposures == 0 && CG.nightAutoExposure)
				CG.currentSkipFrames = CG.nightSkipFrames;

			// Setup the night time capture parameters
			if (numExposures == 0 || ! CG.nightAutoExposure)
			{
				CG.currentExposure_us = CG.nightExposure_us;
			}

			// Don't use camera auto-exposure since we mimic it ourselves.
			CG.HB.useHistogram = CG.nightAutoExposure;
			CG.currentAutoExposure = false;
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
			CG.currentAutoGain = CG.nightAutoGain;
			currentAdjustGain = resetGainTransitionVariables(CG);
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
			CG.myModeMeanSetting.currentMean = CG.myModeMeanSetting.nightMean;
			CG.myModeMeanSetting.currentMean_threshold = CG.myModeMeanSetting.nightMean_threshold;
			if (CG.isCooledCamera)
			{
				CG.currentEnableCooler = CG.nightEnableCooler;
				CG.currentTargetTemp = CG.nightTargetTemp;
			}
		}
		// ========== Done with dark frams / day / night settings

		if (CG.focusMode && numExposures == 1)
		{
			// Once we know the correct exposure, manual exposure and gain are faster.
			if (CG.HB.useHistogram)
			{
				// On ZWO, "useHistogram" means we're using auto-exposure.
				Log(1, "Turning off auto-exposure due to focus mode\n");
				CG.HB.useHistogram = false;
			}
			if (CG.currentAutoGain)
			{
				Log(1, "Turning off auto-gain due to focus mode\n");
				CG.currentAutoGain = false;
			}
		}

		CG.myModeMeanSetting.minMean = CG.myModeMeanSetting.currentMean - CG.myModeMeanSetting.currentMean_threshold;
		CG.myModeMeanSetting.maxMean = CG.myModeMeanSetting.currentMean + CG.myModeMeanSetting.currentMean_threshold;

		if (! CG.takeDarkFrames)
		{
			// We don't adjust exposure for dark frames.
			Log(3, "minMean=%.3f, maxMean=%.3f\n", CG.myModeMeanSetting.minMean, CG.myModeMeanSetting.maxMean);
		}


		if (CG.myModeMeanSetting.currentMean > 0.0)
		{
			CG.myModeMeanSetting.modeMean = true;
/* TODO: FUTURE
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

			if (! CG.currentAutoAWB && ! CG.takeDarkFrames)
			{
				// We only read the actual values if in auto white balance; since we're not,
				// set the "last" values to the user-specified numbers.
				CG.lastWBR = CG.currentWBR;
				CG.lastWBB = CG.currentWBB;
			}
			else
			{
				CG.lastWBR = NOT_SET;
				CG.lastWBB = NOT_SET;
			}
		}

		if (CG.isCooledCamera)
		{
			setControl(CG.cameraNumber, ASI_COOLER_ON, CG.currentEnableCooler ? ASI_TRUE : ASI_FALSE, ASI_FALSE);
			setControl(CG.cameraNumber, ASI_TARGET_TEMP, CG.currentTargetTemp, ASI_FALSE);
		}

		setControl(CG.cameraNumber, ASI_GAIN, (long)CG.currentGain + gainChange, CG.currentAutoGain ? ASI_TRUE : ASI_FALSE);
		if (CG.currentAutoGain)
			setControl(CG.cameraNumber, ASI_AUTO_MAX_GAIN, CG.currentMaxAutoGain, ASI_FALSE);

		if (CG.currentAutoExposure)
		{
			setControl(CG.cameraNumber, ASI_AUTO_MAX_EXP, CG.currentMaxAutoExposure_us / US_IN_MS, ASI_FALSE);
		}

		if (numExposures == 0 || CG.dayBin != CG.nightBin)
		{
			// Adjusting variables for chosen binning.
			// Only need to do at the beginning and if bin changes.
			CG.height						= originalHeight / CG.currentBin;
			CG.width						= originalWidth / CG.currentBin;
			CG.HB.currentHistogramBoxSizeX	= CG.HB.histogramBoxSizeX / CG.currentBin;
			CG.HB.currentHistogramBoxSizeY	= CG.HB.histogramBoxSizeY / CG.currentBin;

			bufferSize = (long) (CG.width * CG.height * currentBpp);

			if (numExposures > 0)
			{
				// If not the first time, free the prior pRgb.
				pRgb.release();
			}

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
					Log(0, "*** %s: ERROR: your camera does not support bin %dx%d.\n", CG.ME, CG.currentBin, CG.currentBin);
					closeUp(EXIT_ERROR_STOP);
				}
				else
				{
					Log(0, "*** %s: ERROR: ASISetROIFormat(%d, %dx%d, %d, %d) failed (%s)\n",
						CG.ME, CG.cameraNumber, CG.width, CG.height, CG.currentBin,
						CG.imageType, getRetCode(asiRetCode));
					closeUp(EXIT_ERROR_STOP);
				}
			}
		}

		// Here and below, indent sub-messages with "  > " so it's clear they go with the un-indented line.
		// This simply makes it easier to see things in the log file.

		int attempts = 0;

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
			Log(1, "STARTING EXPOSURE at: %s   @ %s\n",
				exposureStart, length_in_units(CG.currentExposure_us, true));

//x printf(">>>>>>>>>>>> pRgb columns=%d, rows=%d, channels=%d, depth=%d, elemSize=%ld\n", pRgb.cols, pRgb.rows, pRgb.channels(), pRgb.depth(), pRgb.elemSize());
			asiRetCode = takeOneExposure(&CG, pRgb.data);
			if (asiRetCode == ASI_SUCCESS)
			{
				numConsecutiveErrors = 0;
				numExposures++;
				bool hitMinOrMax = false;

				CG.lastFocusMetric = CG.determineFocus ? (int)round(get_focus_metric(pRgb)) : -1;

				if (numExposures == 0 && CG.preview)
				{
					// Start the preview thread at the last possible moment.
					bDisplay = true;
					pthread_create(&threadDisplay, NULL, Display, (void *)&pRgb);
				}

				if (CG.HB.useHistogram)
				{
					// Make sure the mean is acceptable.

					attempts = 0;

					double minAcceptableMean = CG.myModeMeanSetting.minMean;
					double maxAcceptableMean = CG.myModeMeanSetting.maxMean;
					long tempMinExposure_us = CG.cameraMinExposure_us;
					long tempMaxExposure_us = CG.cameraMaxExposure_us;
					long newExposure_us = 0;

					// Keep track of whether or not we're bouncing around, for example,
					// one exposure is less than the min and the second is greater than the max.
					// When that happens we don't want to set the min to the second exposure
					// or else we'll never get low enough.
					// Negative is below lower limit, positive is above upper limit.
					double priorMean = NOT_SET;		// The mean for the image before the last one.
					double priorMeanDiff = 0.0;
					double lastMeanDiff = 0.0;	// like priorMeanDiff but for next exposure
					int numPingPongs = 0;

					if (CG.lastMean < minAcceptableMean)
					{
						priorMeanDiff = CG.lastMean - minAcceptableMean;
					}
					else if (CG.lastMean > maxAcceptableMean)
					{
						priorMeanDiff = CG.lastMean - maxAcceptableMean;
					}

					// Keep trying until we get an acceptable mean or are unable to continue.
					while ((CG.lastMean < minAcceptableMean || CG.lastMean > maxAcceptableMean) &&
						    ++attempts <= maxHistogramAttempts)
					{
						double acceptableMean;
						double multiplier = 1.10;
						char const *acceptableType;
						if (CG.lastMean < minAcceptableMean) {
							acceptableMean = minAcceptableMean;
// acceptableMean = 0.270
							acceptableType = "min";
						} else {
							acceptableMean = maxAcceptableMean;
							acceptableType = "max";
							multiplier = 1.0 / multiplier;
						}

						// If lastMean/acceptableMean is 9/90, it's 1/10th of the way there,
						// so multiple exposure by 90/9 (10).
						// ZWO cameras don't appear to be linear so increase the multiplier amount some.
						double multiply;
						if (CG.lastMean == 0.0) {
							// means are less than 1 so force "multiply" to be > 1.
							multiply = (1 + acceptableMean) * multiplier;
// multiple = 0.270 * 1.1    0.297
						} else {
							multiply = (acceptableMean / CG.lastMean) * multiplier;
/// multiply = (0.478 / 0.473) * 1.1     (1.0105708) * 1.1          1.112
						}
// TODO FIX: xxxxxxxxxxxxxxxxxx
						long exposureDiff_us = (CG.lastExposure_us * multiply) - CG.lastExposure_us;
// exposureDiff_us = (100,000 * 0.297) - 100,000      (29,700) - 100,000      -70,300
						long exposureDiffBeforeAgression_us = exposureDiff_us;
// exposureDiffBeforeAgression_us = -70,300

						// Adjust by aggression setting.
						if (CG.aggression != 100 && exposureDiff_us != 0)
						{
							exposureDiff_us *= (float)CG.aggression / 100;
// exposureDiff_us = -70,300 * (85/100)     -70,300 * .85     -59,755
						}

						newExposure_us = CG.lastExposure_us + exposureDiff_us;
// newExposure_us = 100,000 + -59,755       40,245
						// Assume max auto exposure is <= max camera exposure.
						if (newExposure_us > CG.currentMaxAutoExposure_us) {
							hitMinOrMax = true;
							Log(3, "  > === Calculated newExposure_us (%'ld) > CG.currentMaxAutoExposure_us (%'ld); setting to max\n",
								newExposure_us, CG.currentMaxAutoExposure_us);
							newExposure_us = CG.currentMaxAutoExposure_us;
						} else {
							Log(3, "    > Next exposure change: %'ld us (%'ld pre agression) to %'ld (* %.3f) [CG.lastExposure_us=%'ld, %sAcceptableMean=%.3f, CG.lastMean=%.3f]\n",
								exposureDiff_us, exposureDiffBeforeAgression_us,
								newExposure_us, multiply, CG.lastExposure_us,
								acceptableType, acceptableMean, CG.lastMean);
// -59.755, -70,300
// 40,245, 0.297, 100,000,
// min, 0.270, 0
// Next exposure change: -59,755 us (-70,300 pre agression) to 40,245 (* 0.297) [CG.lastExposure_us=100,000, minAcceptableMean=0.270, CG.lastMean=0.000]

/// > GOT IMAGE @ mean 0.473, gain 0.
/// > Next exposure change: 207 us (244 pre agression) to 2,379 (* 1.112) [CG.lastExposure_us=2,172, minAcceptableMean=0.478, CG.lastMean=0.473]
/// >> Retry 1 @ 2,379 us, min=2,172 us, max=2,000,000,000 us
/// > GOT IMAGE @ mean 0.516, gain 0.
/// > Good image: mean 0.516 within range of 0.478 to 0.526 +++++++++
						}

						if (priorMeanDiff > 0.0 && lastMeanDiff < 0.0)
						{ 
							++numPingPongs;
							Log(2, "    > xxx lastMean was %.3f and went from %.3f above max of %.3f to %.3f below min of %.3f, is now at %.3f;\n",
								priorMean, priorMeanDiff, maxAcceptableMean, -lastMeanDiff,
									minAcceptableMean, CG.lastMean);
						} 
						else
						{
							if (priorMeanDiff < 0.0 && lastMeanDiff > 0.0)
							{
								++numPingPongs;
								Log(2, "    > xxx lastMean was %.3f and went from %.3f below min of %.3f to %.3f above max of %.3f, is now at %.3f;\n",
									priorMean, -priorMeanDiff, minAcceptableMean, lastMeanDiff,
									maxAcceptableMean, CG.lastMean);
							}
							else
							{
								numPingPongs = 0;
							} 

							if (CG.lastMean < minAcceptableMean)
							{
								tempMinExposure_us = CG.currentExposure_us;
// TODO: ???? set tempMaxExposure_us to ???
							} 
							else if (CG.lastMean > maxAcceptableMean)
							{
								tempMaxExposure_us = CG.currentExposure_us;
							} 
						} 

						if (numPingPongs >= 3)
						{
Log(3, "     > xxx newExposure_us=%s, CG.lastExposure_us=%s, CG.currentExposure_us=%s,",
	length_in_units(newExposure_us, true),
	length_in_units(CG.lastExposure_us, true),
	length_in_units(CG.currentExposure_us, true));
							newExposure_us = (newExposure_us + CG.lastExposure_us) / 2;
Log(3, " new newExposure_us=%s\n", length_in_units(newExposure_us, true));
							Log(3, " > Ping-Ponged %d times, setting exposure to mid-point of %s\n", numPingPongs, length_in_units(newExposure_us, true));

// XXXX testing
							// To try and help, add (or subtract) the numPingPongs percent to the exposure.
							// For example, if newExposure_us == 200 and numPingPongs == 4, add 4% (8 us = 4% * 200).
							long us = (long) (newExposure_us * ((double)numPingPongs / 100.0));
							Log(3, "================ Adding %'ld us\n", us);
							newExposure_us += us;
							if (tempMaxExposure_us < newExposure_us)
								tempMaxExposure_us = newExposure_us;
						}

						// Make sure newExposure_us is between min and max.
// XXXX testing
long saved_newExposure_us = newExposure_us;
						newExposure_us = std::max(tempMinExposure_us, newExposure_us);
						newExposure_us = std::min(tempMaxExposure_us, newExposure_us);
						if (saved_newExposure_us != newExposure_us)
						{
							Log(3, "    > xxx newExposure_us changed from %s to %s due to tempMin/tempMax",
								length_in_units(saved_newExposure_us, true), length_in_units(newExposure_us, true));
							Log(3, " (%s/%s)\n",
								length_in_units(tempMinExposure_us, true), length_in_units(tempMaxExposure_us, true));
						}

						if (newExposure_us == CG.currentExposure_us)
						{
							break;		// message about this is output below
						}

						CG.currentExposure_us = newExposure_us;
						if (CG.currentExposure_us > CG.cameraMaxExposure_us)
						{
							hitMinOrMax = true;
							break;		// message about this is output below
						}

						Log(2, "    >> Retry %i @ %'ld us, min=%'ld us, max=%'ld us\n",
							attempts, newExposure_us, tempMinExposure_us, tempMaxExposure_us);

						priorMean = CG.lastMean;
						priorMeanDiff = lastMeanDiff;

						asiRetCode = takeOneExposure(&CG, pRgb.data);
						if (asiRetCode == ASI_SUCCESS)
						{
							if (CG.lastMean < minAcceptableMean)
								lastMeanDiff = CG.lastMean - minAcceptableMean;
							else if (CG.lastMean > maxAcceptableMean)
								lastMeanDiff = CG.lastMean - maxAcceptableMean;
							else
								lastMeanDiff = 0.0;

							continue;
						}
						else
						{
							break;
						}
					} // end of "Retry" loop

					if (asiRetCode != ASI_SUCCESS)
					{
						// Sleep half the normal time.
						long s = (CG.currentDelay_ms / 2 * US_IN_MS) * 0.5;
						Log(2,"  > Sleeping %s us from failed exposure\n",
							length_in_units(s, false));
						usleep(s);
						// Don't save the file or do anything below.
						continue;
					}

					if (CG.lastMean >= minAcceptableMean && CG.lastMean <= maxAcceptableMean)
					{
						// +++ at end makes it easier to see in log file
						Log(2, "  > Good image: mean %.3f within range of %.3f to %.3f +++++++++\n",
							CG.lastMean, minAcceptableMean, maxAcceptableMean);
					}
					else if (attempts > maxHistogramAttempts)
					{
						 Log(2, "  > max attempts reached - using exposure of %s with mean %.3f\n",
							length_in_units(CG.currentExposure_us, true), CG.lastMean);
					}
					else if (attempts >= 1)
					{
						if (CG.currentExposure_us < CG.cameraMinExposure_us)
						{
							hitMinOrMax = true;
							Log(2, "  > Stopped trying: new exposure of %s would be under camera min of %s\n",
								length_in_units(CG.currentExposure_us, false),
								length_in_units(CG.cameraMinExposure_us, false));

							long diff = (long)((float)CG.currentExposure_us * (1/(float)percentChange));
							CG.currentExposure_us += diff;
							Log(3, "  > Increasing next exposure by %d%% (%'ld us) to %'ld\n",
								percentChange, diff, CG.currentExposure_us);
						}
						else if (CG.currentExposure_us > CG.cameraMaxExposure_us)
						{
							hitMinOrMax = true;
							Log(2, "  > Stopped trying: new exposure of %s would be over camera max of %s\n",
								length_in_units(CG.currentExposure_us, false),
								length_in_units(CG.cameraMaxExposure_us, false));

							long diff = (long)((float)CG.currentExposure_us * (1/(float)percentChange));
							CG.currentExposure_us -= diff;
							Log(3, "  > Decreasing next exposure by %d%% (%'ld us) to %'ld\n",
								percentChange, diff, CG.currentExposure_us);
						}
						else if (CG.currentExposure_us == CG.cameraMinExposure_us)
						{
							Log(2, "  > Stopped trying: hit camera min exposure limit of %s\n",
								length_in_units(CG.cameraMinExposure_us, false));

							// If currentExposure_us causes too low of a mean, increase exposure
							// so on the next loop we'll adjust it.
							if (CG.lastMean < minAcceptableMean)
								CG.currentExposure_us++;
						}
						else if (CG.currentExposure_us == CG.currentMaxAutoExposure_us)
						{
							Log(2, "  > Stopped trying: hit max autoexposure limit of %s\n",
								length_in_units(CG.currentMaxAutoExposure_us, false));
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
							Log(2, "  > Stopped trying, using exposure of %s with mean %.3f, min=%.3f, max=%.3f\n",
								length_in_units(CG.currentExposure_us, false),
								CG.lastMean, minAcceptableMean, maxAcceptableMean);
						}
						 
					}
					else if (CG.currentExposure_us == CG.cameraMinExposure_us)
					{
						Log(3, "  > Did not make any additional attempts - at min exposure limit of %s, mean %.3f\n",
							length_in_units(CG.cameraMinExposure_us, false), CG.lastMean);
					}
					else if (CG.currentExposure_us == CG.cameraMaxExposure_us)
					{
						Log(3, "  > Did not make any additional attempts - at max exposure limit of %s, mean %.3f\n",
							length_in_units(CG.cameraMaxExposure_us, false), CG.lastMean);
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
								Log(3, "  > Next exposure full change is %s, after agression: %s from %s ",
									length_in_units(diff_us, true),
									length_in_units(exposureDiff_us, true),
									length_in_units(CG.currentExposure_us, true));
								CG.currentExposure_us += exposureDiff_us;
								Log(3, "to %s\n", length_in_units(CG.currentExposure_us, true));
							}
						}
						else
						{
							CG.currentExposure_us = suggestedNextExposure_us;
						}
					}
					else
					{
						// Using manual exposure so don't change exposure.
					}
				}

				if (CG.currentSkipFrames > 0)
				{
					// If we're already at a good exposure, or the last exposure reached the max or min time,
					// don't skip any more frames.
					if ((CG.lastMean >= CG.myModeMeanSetting.minMean && CG.lastMean <= CG.myModeMeanSetting.maxMean)
						|| hitMinOrMax)
					{
						CG.currentSkipFrames = 0;
					} else {
						CG.currentSkipFrames--;
						Log(2, "  >>>> Skipping this frame.  %d left to skip\n", CG.currentSkipFrames);
						// Do not save this frame or sleep after it.
						// We just started taking images so no need to check if DAY or NIGHT changed
						continue;
					}
				}

				if (meanIsOK(&CG, exposureStartDateTime)) {		// meanIsOK() outputs any error message

					if (! CG.takeDarkFrames)
					{
						if (currentAdjustGain)
						{
							// Determine if we need to change the gain on the next image.
							// This must come AFTER the "showGain" above.
							gainChange = determineGainChange(CG);
							setControl(CG.cameraNumber, ASI_GAIN, CG.currentGain + gainChange, CG.currentAutoGain ? ASI_TRUE : ASI_FALSE);
						}
					}

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

						if (CG.focusMode) {
							saveImage();
						} else {
							// In non-focusMode we save the image in the background since processing
							// the image can take a long time.
							pthread_mutex_lock(&mtxSaveImg);
							pthread_cond_signal(&condStartSave);
							pthread_mutex_unlock(&mtxSaveImg);
						}
					}
					else
					{
						// Hopefully the user can use the time it took to save a file to disk
						// to help determine why they are getting this warning.
						// Perhaps their disk is very slow or their delay is too short.
						Log(-1, "  > WARNING: currently saving an image; cannot save new one at %s.\n", exposureStart);

						// TODO: wait for the prior image to finish saving.
					}
				}
			}

			std::string s;
			if (CG.currentAutoExposure)
			{
				s = "auto";
			}
			else if (CG.HB.useHistogram)
			{
				s = "histogram";
			} else {
				s = "manual";
			}
			// Delay applied before next exposure
			delayBetweenImages(CG, CG.lastExposure_us, s);

			dayOrNight = calculateDayOrNight(CG.latitude, CG.longitude, CG.angle);
		}

		if (lastDayOrNight != dayOrNight)
			justTransitioned = true;
	}

	closeUp(EXIT_OK);
}

