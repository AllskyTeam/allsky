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

#define CAMERA_BRAND			"ZWO"
#define IS_ZWO
#include "ASI_functions.cpp"

#define USE_HISTOGRAM		// use the histogram code as a workaround to ZWO's bug

// Define's specific to this camera type.  Others that apply to all camera types are in allsky_common.h
#define DEFAULT_FONTSIZE		7
#define DEFAULT_DAYWBR			65
#define DEFAULT_DAYWBB			85
#define DEFAULT_NIGHTWBR		DEFAULT_DAYWBR
#define DEFAULT_NIGHTWBB		DEFAULT_DAYWBB
#define DEFAULT_DAYGAIN			1
#define DEFAULT_DAYAUTOGAIN		false		// TODO: will change when implementing modeMean
#define DEFAULT_DAYMAXGAIN		200
#define DEFAULT_NIGHTGAIN		150
#define DEFAULT_NIGHTAUTOGAIN	false		// TODO: will change when implementing modeMean
#define DEFAULT_NIGHTMAXGAIN	200
#define DEFAULT_GAMMA			50					// not supported by all cameras
#define DEFAULT_BRIGHTNESS		100
#define DEFAULT_OFFSET			0
#define DEFAULT_ASIBANDWIDTH	40
#define MIN_ASIBANDWIDTH		40
#define MAX_ASIBANDWIDTH		100
#define DEFAULT_GAIN_TRANSITION_TIME 5				// user specifies minutes
#define DEFAULT_NEWEXPOSURE		true

#ifdef USE_HISTOGRAM
#define DEFAULT_BOX_SIZEX		500					// Must be a multiple of 2
#define DEFAULT_BOX_SIZEY		500					// Must be a multiple of 2
#define DEFAULT_BOX_FROM_LEFT	0.5
#define DEFAULT_BOX_FROM_TOP	0.5
#define DEFAULT_AGGRESSION		75
#define DEFAULT_PERCENTCHANGE	10.0				// percent of ORIGINAL difference
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
// but some users (seems hit or miss) get ASI_ERROR_TIMEOUTs when taking exposures.
// So, we added the ability for them to use the 0.7 video-always-on method, or the 0.8 "new exposure" method.
bool useNewExposureAlgorithm	= DEFAULT_NEWEXPOSURE;
long flip						= DEFAULT_FLIP;
bool tty						= false;			// are we on a tty?
bool notificationImages			= DEFAULT_NOTIFICATIONIMAGES;
char const *saveDir				= DEFAULT_SAVEDIR;
char const *fileName			= DEFAULT_FILENAME;
char const *timeFormat			= DEFAULT_TIMEFORMAT;
long dayExposure_us				= DEFAULT_DAYEXPOSURE;
long dayMaxAutoexposure_ms		= DEFAULT_DAYMAXAUTOEXPOSURE_MS;
bool dayAutoExposure			= DEFAULT_DAYAUTOEXPOSURE;	// is it on or off for daylight?
long dayDelay_ms				= DEFAULT_DAYDELAY;	// Delay in milliseconds.
long nightDelay_ms				= DEFAULT_NIGHTDELAY;	// Delay in milliseconds.
long nightMaxAutoexposure_ms	= DEFAULT_NIGHTMAXAUTOEXPOSURE_MS;
long gainTransitionTime			= DEFAULT_GAIN_TRANSITION_TIME;
bool dayAutoAWB					= DEFAULT_DAYAUTOAWB;	// is Auto White Balance on or off?
long dayWBR						= DEFAULT_DAYWBR;		// red component
long dayWBB						= DEFAULT_DAYWBB;		// blue component
bool nightAutoAWB				= DEFAULT_NIGHTAUTOAWB;
long nightWBR					= DEFAULT_NIGHTWBR;
long nightWBB					= DEFAULT_NIGHTWBB;
bool currentAutoAWB				= false;
long currentWBR					= NOT_SET;
long currentWBB					= NOT_SET;

long actualWBR					= NOT_SET;		// actual values per camera
long actualWBB					= NOT_SET;
long actualTemp					= NOT_SET;
long actualGain					= NOT_SET;

#ifdef USE_HISTOGRAM
int currentHistogramBoxSizeX =	NOT_SET;
int currentHistogramBoxSizeY =	NOT_SET;
// % from left/top side that the center of the box is. 0.5 == the center of the image's X/Y axis
float histogramBoxPercentFromLeft = DEFAULT_BOX_FROM_LEFT;
float histogramBoxPercentFromTop = DEFAULT_BOX_FROM_TOP;
#endif	// USE_HISTOGRAM

ASI_CAMERA_INFO ASICameraInfo;
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
int CamNum						= 0;				// 1st camera - we don't support multiple cams
pthread_t threadDisplay			= 0;
pthread_t hthdSave				= 0;
int numExposures				= 0;				// how many valid pictures have we taken so far?
long currentGain				= NOT_SET;
long cameraMinExposure_us		= NOT_SET;			// camera's minimum exposure - camera dependent
long cameraMaxExposure_us		= NOT_SET;			// camera's maximum exposure - camera dependent
long cameraMaxAutoexposure_us	= NOT_SET;			// camera's max auto-exposure
long lastExposure_us			= 0;				// last exposure taken
bool takingDarkFrames			= false;
long currentExposure_us			= NOT_SET;
int currentBpp					= NOT_SET;			// bytes per pixel: 8, 16, or 24
int currentBitDepth				= NOT_SET;			// 8 or 16
int currentBin					= NOT_SET;
long currentBrightness			= NOT_SET;
long currentMaxAutoexposure_us	= NOT_SET;
bool currentAutoExposure		= false;			// is auto-exposure currently on or off?
bool currentAutoGain			= false;			// is auto-gain currently on or off?
char finalFileName[200];							// final name of the file that's written to disk, with no directories
char fullFilename[1000];							// full name of file written to disk
int focusMetric					= NOT_SET;
int mean						= NOT_SET;			// histogram mean
bool quietExit					= false;			// Hide meesage on exit?

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
			char cmd[1100];
			Log(1, "  > Saving %s image '%s'\n", takingDarkFrames ? "dark" : dayOrNight.c_str(), finalFileName);
			snprintf(cmd, sizeof(cmd), "scripts/saveImage.sh %s '%s'", dayOrNight.c_str(), fullFilename);
			float gainDB = pow(10, (float)actualGain / 10.0 / 20.0);
			add_variables_to_command(cmd, lastExposure_us, currentBrightness, mean,
				currentAutoExposure, currentAutoGain, currentAutoAWB, (float)actualWBR, (float)actualWBB,
				actualTemp, gainDB, actualGain,
				currentBin, getFlip(flip), currentBitDepth, focusMetric);
			strcat(cmd, " &");

			st = cv::getTickCount();
			try
			{
				result = imwrite(fullFilename, pRgb, compressionParameters);
			}
			catch (const cv::Exception& ex)
			{
				printf("*** ERROR: Exception saving image: %s\n", ex.what());
			}
			et = cv::getTickCount();

			if (result)
				system(cmd);
			else
				printf("*** ERROR: Unable to save image '%s'.\n", fullFilename);

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
	int roiX1 = (width * histogramBoxPercentFromLeft) - (currentHistogramBoxSizeX * currentBpp / 2);
	int roiX2 = roiX1 + (currentBpp * currentHistogramBoxSizeX);
	int roiY1 = (height * histogramBoxPercentFromTop) - (currentHistogramBoxSizeY / 2);
	int roiY2 = roiY1 + currentHistogramBoxSizeY;

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
static void flushBufferedImages(int cameraId, void *buf, size_t size)
{
	enum { NUM_IMAGE_BUFFERS = 2 };

	int numCleared;
	for (numCleared = 0; numCleared < NUM_IMAGE_BUFFERS; numCleared++)
	{
		ASI_ERROR_CODE status = ASIGetVideoData(cameraId, (unsigned char *) buf, size, 0);
		if (status != ASI_SUCCESS)
			break; // no more buffered frames
long us;
ASI_BOOL b;
ASIGetControlValue(cameraId, ASI_EXPOSURE, &us, &b);
Log(3, "  > [Cleared buffer frame, next exposure: %'ld, auto=%s]\n", us, b==ASI_TRUE ? "yes" : "no");
	}

// xxxxxxxxxx For now, display message above for each one rather than a summary.
return;
	if (numCleared > 0)
	{
		Log(3, "  > [Cleared %d buffer frame%s]\n", numCleared, numCleared > 1 ? "s" : "");
	}
}


long reportedExposure_us = 0;	// exposure reported by the camera, either actual exposure or suggested next one
ASI_BOOL bAuto = ASI_FALSE;		// "auto" flag returned by ASIGetControlValue, when we don't care what it is

ASI_BOOL wasAutoExposure = ASI_FALSE;
long bufferSize = NOT_SET;
bool setAutoExposure = false;

ASI_ERROR_CODE takeOneExposure(
		int cameraId,
		long exposureTime_us,
		unsigned char *imageBuffer, long width, long height,	// where to put image and its size
		ASI_IMG_TYPE imageType,
		int *histogram,
		int *mean
)
{
	if (imageBuffer == NULL) {
		return (ASI_ERROR_CODE) -1;
	}

	ASI_ERROR_CODE status;
	// ZWO recommends timeout = (exposure*2) + 500 ms
	// After some discussion, we're doing +5000ms to account for delays induced by
	// USB contention, such as that caused by heavy USB disk IO
	long timeout = ((exposureTime_us * 2) / US_IN_MS) + 5000;	// timeout is in ms

	if (currentAutoExposure && exposureTime_us > currentMaxAutoexposure_us)
	{
		// If we call length_in_units() twice in same command line they both return the last value.
		char x[100];
		snprintf(x, sizeof(x), "%s", length_in_units(exposureTime_us, true));
		Log(0, "*** WARNING: exposureTime_us requested [%s] > currentMaxAutoexposure_us [%s]\n", x, length_in_units(currentMaxAutoexposure_us, true));
		exposureTime_us = currentMaxAutoexposure_us;
	}

	// This debug message isn't typcally needed since we already displayed a message about
	// starting a new exposure, and below we display the result when the exposure is done.
	Log(4, "  > %s to %s\n",
		wasAutoExposure == ASI_TRUE ? "Camera set auto-exposure" : "Exposure set",
		length_in_units(exposureTime_us, true));

// XXXXXXXXXXXXXXXXXX testing.  If in auto exposure, only set exposure time once per day/night.
// xxxxxxxxxxx June 13, 2022: At night, it doesn't work to only set the exposure once - I assume
// the camera isn't on long enough to get a good auto exposure time.
if (1 || ! setAutoExposure || ! currentAutoExposure) {
	setAutoExposure = true;
	setControl(cameraId, ASI_EXPOSURE, exposureTime_us, currentAutoExposure ? ASI_TRUE :ASI_FALSE);
}

	flushBufferedImages(cameraId, imageBuffer, bufferSize);

	if (useNewExposureAlgorithm)
	{
		status = ASIStartVideoCapture(cameraId);
	} else {
		status = ASI_SUCCESS;
	}

	if (status == ASI_SUCCESS) {
		// Make sure the actual time to take the picture is "close" to the requested time.
		timeval tStart;
		if (exposureTime_us > (5 * US_IN_SEC)) tStart = getTimeval();

		status = ASIGetVideoData(cameraId, imageBuffer, bufferSize, timeout);
		if (useNewExposureAlgorithm)
			(void) ASIStopVideoCapture(cameraId);

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
			if (timeToTakeImage_us < exposureTime_us && exposureTime_us > (5 * US_IN_SEC))
			{
				// Testing shows there's about this much us overhead, so subtract it to get actual time.
				const int OVERHEAD = 450000;
				if (timeToTakeImage_us > OVERHEAD)	// don't subtract if it makes timeToTakeImage_us negative
					timeToTakeImage_us -= OVERHEAD;
				long diff_us = timeToTakeImage_us - exposureTime_us;
				long threshold_us = exposureTime_us * 0.5;		// 50% seems like a good number
				if (abs(diff_us) > threshold_us)
				{
					Log(1, "*** WARNING: time to take image (%s) ", length_in_units(timeToTakeImage_us, true));
					Log(1, "differs from requested exposure time (%s) ", length_in_units(exposureTime_us, true));
					Log(1, "by %s, ", length_in_units(diff_us, true));
					Log(1, "threshold=%'ld\n", length_in_units(threshold_us, true));
				}
			}

			numErrors = 0;
			ASIGetControlValue(cameraId, ASI_GAIN, &actualGain, &bAuto);
			debug_text[0] = '\0';
#ifdef USE_HISTOGRAM
			if (histogram != NULL && mean != NULL)
			{
				*mean = computeHistogram(imageBuffer, width, height, imageType, histogram);
				sprintf(debug_text, " @ mean %d", *mean);
				if (currentAutoGain && ! takingDarkFrames)
				{
					char *p = debug_text + strlen(debug_text);
					sprintf(p, ", auto gain %ld", actualGain);
				}
			}
#endif
			lastExposure_us = exposureTime_us;
			// Per ZWO, when in manual-exposure mode, the returned exposure length should always
			// be equal to the requested length; in fact, "there's no need to call ASIGetControlValue()".
			// When in auto-exposure mode, the returned exposure length is what the driver thinks the
			// next exposure should be, and will eventually converge on the correct exposure.
			ASIGetControlValue(cameraId, ASI_EXPOSURE, &reportedExposure_us, &wasAutoExposure);
			Log(3, "  > Got image%s.  Returned exposure: %s\n", debug_text, length_in_units(reportedExposure_us, true));

			// If this was a manual exposure, make sure it took the correct exposure.
			// Per ZWO, this should never happen.
			if (wasAutoExposure == ASI_FALSE && exposureTime_us != reportedExposure_us)
			{
				Log(0, "  > WARNING: not correct exposure (requested: %'ld us, reported: %'ld us, diff: %'ld)\n", exposureTime_us, reportedExposure_us, reportedExposure_us - exposureTime_us);
			}
			ASIGetControlValue(cameraId, ASI_TEMPERATURE, &actualTemp, &bAuto);
			if (ASICameraInfo.IsColorCam)
			{
				ASIGetControlValue(cameraId, ASI_WB_R, &actualWBR, &bAuto);
				ASIGetControlValue(cameraId, ASI_WB_B, &actualWBB, &bAuto);
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
		totalTimeInSec = (dayExposure_us / US_IN_SEC) + (dayDelay_ms / MS_IN_SEC);
		Log(5, "xxx totalTimeInSec=%.1fs, dayExposure_us=%'ldus , daydelay_ms=%'dms\n", totalTimeInSec, dayExposure_us, dayDelay_ms);
	}
	else	// NIGHT
	{
		// At nightime if the exposure is less than the max, we wait until max has expired,
		// so use it instead of the exposure time.
		totalTimeInSec = (nightMaxAutoexposure_ms / MS_IN_SEC) + (nightDelay_ms / MS_IN_SEC);
		Log(5, "xxx totalTimeInSec=%.1fs, nightMaxAutoexposure_ms=%'dms, nightDelay_ms=%'dms\n", totalTimeInSec, nightMaxAutoexposure_ms, nightDelay_ms);
	}

	gainTransitionImages = ceil(gainTransitionTime / totalTimeInSec);
	if (gainTransitionImages == 0)
	{
		Log(0, "*** INFORMATION: Not adjusting gain - your 'gaintransitiontime' (%d seconds) is less than the time to take one image plus its delay (%.1f seconds).\n", gainTransitionTime, totalTimeInSec);
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
		gainTransitionImages, gainTransitionTime, perImageAdjustGain, totalAdjustGain);

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
		dayOrNight.c_str(), amt, amt+currentGain, numGainChanges, gainTransitionImages);
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
	tty = isatty(fileno(stdout)) ? true : false;
	signal(SIGINT, IntHandle);
	signal(SIGTERM, IntHandle);	// The service sends SIGTERM to end this program.
	signal(SIGHUP, sig);		// xxxxxxxxxx TODO: Re-read settings (we currently just restart).

	pthread_mutex_init(&mtxSaveImg, 0);
	pthread_cond_init(&condStartSave, 0);

	int fontname[] = {
		cv::FONT_HERSHEY_SIMPLEX,			cv::FONT_HERSHEY_PLAIN,		cv::FONT_HERSHEY_DUPLEX,
		cv::FONT_HERSHEY_COMPLEX,			cv::FONT_HERSHEY_TRIPLEX,	cv::FONT_HERSHEY_COMPLEX_SMALL,
		cv::FONT_HERSHEY_SCRIPT_SIMPLEX,	cv::FONT_HERSHEY_SCRIPT_COMPLEX };
	char const *fontnames[]		= {		// Character representation of names for clarity:
		"SIMPLEX",							"PLAIN",					"DUPEX",
		"COMPLEX",							"TRIPLEX",					"COMPLEX_SMALL",
		"SCRIPT_SIMPLEX",					"SCRIPT_COMPLEX" };

	char bufTime[128]			= { 0 };
	char bufTemp[128]			= { 0 };
	char const *bayer[]			= { "RG", "BG", "GR", "GB" };
	bool endOfNight				= false;
	int i;
	ASI_ERROR_CODE asiRetCode;				// used for return code from ASI functions.
	bool saveCC					= false;	// Save Camera Capabilities and exit?
	char const *CC_saveDir		= DEFAULT_SAVEDIR;		// Where to put camera's capabilities
	char const *version			= NULL;		// version of Allsky

	// Some settings have both day and night versions, some have only one version that applies to both,
	// and some have either a day OR night version but not both.
	// For settings with both versions we keep a "current" variable (e.g., "currentBin") that's either the day
	// or night version so the code doesn't always have to check if it's day or night.
	// The settings have either "day" or "night" in the name.
	// In theory, almost every setting could have both day and night versions (e.g., width & height),
	// but the chances of someone wanting different versions.

	char const *locale			= DEFAULT_LOCALE;
	// All the font settings apply to both day and night.
	long fontnumber				= DEFAULT_FONTNUMBER;
	long iTextX					= DEFAULT_ITEXTX;
	long iTextY					= DEFAULT_ITEXTY;
	long iTextLineHeight		= DEFAULT_ITEXTLINEHEIGHT;
	char const *ImgText			= "";
	char const *ImgExtraText	= "";
	long extraFileAge			= 0;	// 0 disables it
	double fontsize				= DEFAULT_FONTSIZE;
	long linewidth				= DEFAULT_LINEWIDTH;
	long outlinefont			= DEFAULT_OUTLINEFONT;
	int fontcolor[3]			= { 255, 0, 0 };
	int smallFontcolor[3]		= { 0, 0, 255 };
	int linetype[3]				= { cv::LINE_AA, 8, 4 };
	long linenumber				= DEFAULT_LINENUMBER;
	long width					= DEFAULT_WIDTH;	long originalWidth  = width;
	long height					= DEFAULT_HEIGHT;	long originalHeight = height;
	long dayBin					= DEFAULT_DAYBIN;
	long nightBin				= DEFAULT_NIGHTBIN;
	long imageType				= DEFAULT_IMAGE_TYPE;
	long asiBandwidth			= DEFAULT_ASIBANDWIDTH;
	bool asiAutoBandwidth		= false;						// is Auto Bandwidth on or off?

	// There is no max day autoexposure since daylight exposures are always pretty short.
	long nightExposure_us		= DEFAULT_NIGHTEXPOSURE;
	bool nightAutoExposure		= DEFAULT_NIGHTAUTOEXPOSURE;	// is it on or off for nighttime?
	// currentAutoExposure is global so is defined outside of main()

// Maximum number of auto-exposure frames to skip when starting the program.
// This helps eliminate overly bright or dark images before the auto-exposure algorith kicks in.
// At night, don't use too big a number otherwise it takes a long time to get the first frame.
	long daySkipFrames			= DEFAULT_DAYSKIPFRAMES;
	long nightSkipFrames		= DEFAULT_NIGHTSKIPFRAMES;
	long currentSkipFrames		= NOT_SET;

	long dayGain				= DEFAULT_DAYGAIN;
	bool dayAutoGain			= DEFAULT_DAYAUTOGAIN;			// is Auto Gain on or off for daytime?
	long dayMaxGain				= DEFAULT_DAYMAXGAIN;
	long nightGain				= DEFAULT_NIGHTGAIN;
	bool nightAutoGain			= DEFAULT_NIGHTAUTOGAIN;		// is Auto Gain on or off for nighttime?
	long nightMaxGain			= DEFAULT_NIGHTMAXGAIN;
	long currentMaxGain			= NOT_SET;
	long currentDelay_ms		= NOT_SET;
	long gamma				 	= DEFAULT_GAMMA;
	long dayBrightness			= DEFAULT_BRIGHTNESS;
	long nightBrightness		= DEFAULT_BRIGHTNESS;
	long offset					= DEFAULT_OFFSET;

	char const *latitude		= DEFAULT_LATITUDE;
	char const *longitude		= DEFAULT_LONGITUDE;
	// angle of the sun with the horizon
	// (0=sunset, -6=civil twilight, -12=nautical twilight, -18=astronomical twilight)
	char const *angle			= DEFAULT_ANGLE;

	bool help					= false;
	bool preview				= false;
	bool showTime				= DEFAULT_SHOWTIME;
	char const *tempType		= "C";							// Celsius
	bool showTemp				= DEFAULT_SHOWTEMP;
	bool showExposure			= DEFAULT_SHOWEXPOSURE;
	bool showGain				= DEFAULT_SHOWGAIN;
	bool showBrightness			= DEFAULT_SHOWBRIGHTNESS;
	bool showMean				= DEFAULT_SHOWMEAN;
#ifdef USE_HISTOGRAM
	int maxHistogramAttempts	= 15;	// max number of times we'll try for a better histogram mean
	bool showHistogramBox		= false;
	int histogramBoxSizeX		= DEFAULT_BOX_SIZEX;
	int histogramBoxSizeY		= DEFAULT_BOX_SIZEY;
	bool showFocus				= DEFAULT_SHOWFOCUS;
	long aggression				= DEFAULT_AGGRESSION; // ala PHD2. Percent of change made, 1 - 100.

	// If we just transitioned from night to day, it's possible currentExposure_us will
	// be MUCH greater than the daytime max (and will possibly be at the nighttime's max exposure).
	// So, decrease currentExposure_us by a certain amount of the difference between the two so
	// it takes several frames to reach the daytime max (which is now in currentMaxAutoexposure_us).

	// If we don't do this, we'll be stuck in a loop taking an exposure
	// that's over the max forever.

	// Note that it's likely getting lighter outside with every exposure
	// so the mean will eventually get into the valid range.
	const int percentChange		= DEFAULT_PERCENTCHANGE;
#endif

	bool daytimeCapture			= DEFAULT_DAYTIMECAPTURE;	// are we capturing daytime pictures?

	long quality				= DEFAULT_JPG_QUALITY;
	bool coolerEnabled		 	= false;
	long targetTemp				= 0;

	//-------------------------------------------------------------------------------------------------------
	//-------------------------------------------------------------------------------------------------------
	setlinebuf(stdout);					// Line buffer output so entries appear in the log immediately.

	char const *fc = NULL, *sfc = NULL;	// temporary pointers to fontcolor and smallfontcolor
	double temp_dayExposure_ms = DEFAULT_DAYEXPOSURE;			// entered in ms - converted to us later
	double temp_nightExposure_ms = DEFAULT_NIGHTEXPOSURE;		// entered in ms - converted to us later
	if (argc > 1)
	{
		for (i=1 ; i <= argc - 1 ; i++)
		{
			// Misc. settings
			if (strcmp(argv[i], "-h") == 0 || strcmp(argv[i], "--help") == 0)
			{
				help = true;
				quietExit = true;	// we display the help message and quit
			}
			else if (strcmp(argv[i], "-version") == 0)
			{
				version = argv[++i];
			}
			else if (strcmp(argv[i], "-save_dir") == 0)
			{
				saveDir = argv[++i];
			}
			else if (strcmp(argv[i], "-cc_save_dir") == 0)
			{
				CC_saveDir = argv[++i];
				saveCC = true;
				quietExit = true;	// we display info and quit
			}
			else if (strcmp(argv[i], "-tty") == 0)	// overrides what was automatically determined
			{
				tty = getBoolean(argv[++i]);
			}
			else if (strcmp(argv[i], "-preview") == 0)
			{
				preview = getBoolean(argv[++i]);
			}
			else if (strcmp(argv[i], "-daytime") == 0)
			{
				daytimeCapture = getBoolean(argv[++i]);
			}

			// daytime settings
			else if (strcmp(argv[i], "-dayautoexposure") == 0)
			{
				dayAutoExposure = getBoolean(argv[++i]);
			}
			else if (strcmp(argv[i], "-daymaxexposure") == 0)
			{
				dayMaxAutoexposure_ms = atol(argv[++i]);
			}
			else if (strcmp(argv[i], "-dayexposure") == 0)
			{
				temp_dayExposure_ms = atof(argv[++i]);	// allow fractions
			}
			else if (strcmp(argv[i], "-daymean") == 0)
			{
// TODO
//				myModeMeanSetting.dayMean = std::min(1.0,std::max(0.0,atof(argv[++i])));
//				myModeMeanSetting.mode_mean = true;
i++;
			}
			else if (strcmp(argv[i], "-daybrightness") == 0)
			{
				dayBrightness = atol(argv[++i]);
			}
			else if (strcmp(argv[i], "-daydelay") == 0)
			{
				dayDelay_ms = atol(argv[++i]);
			}
			else if (strcmp(argv[i], "-dayautogain") == 0)
			{
				dayAutoGain = getBoolean(argv[++i]);
			}
			else if (strcmp(argv[i], "-daymaxgain") == 0)
			{
				dayMaxGain = atol(argv[++i]);
			}
			else if (strcmp(argv[i], "-daygain") == 0)
			{
				dayGain = atol(argv[++i]);
			}
			else if (strcmp(argv[i], "-daybin") == 0)
			{
				dayBin = atol(argv[++i]);
			}
			else if (strcmp(argv[i], "-dayawb") == 0)
			{
				dayAutoAWB = getBoolean(argv[++i]);
			}
			else if (strcmp(argv[i], "-daywbr") == 0)
			{
				dayWBR = atol(argv[++i]);
			}
			else if (strcmp(argv[i], "-daywbb") == 0)
			{
				dayWBB = atol(argv[++i]);
			}
			else if (strcmp(argv[i], "-dayskipframes") == 0)
			{
				daySkipFrames = atol(argv[++i]);
			}

			// nighttime settings
			else if (strcmp(argv[i], "-nightautoexposure") == 0)
			{
				nightAutoExposure = getBoolean(argv[++i]);
			}
			else if (strcmp(argv[i], "-nightmaxexposure") == 0)
			{
				nightMaxAutoexposure_ms = atol(argv[++i]);
			}
			else if (strcmp(argv[i], "-nightexposure") == 0)
			{
				temp_nightExposure_ms = atof(argv[++i]);
			}
			else if (strcmp(argv[i], "-nightmean") == 0)
			{
// TODO
//				myModeMeanSetting.mean_value = std::min(1.0,std::max(0.0,atof(argv[i + 1])));
//				myModeMeanSetting.nightMean = std::min(1.0,std::max(0.0,atof(argv[++i])));
//				myModeMeanSetting.mode_mean = true;
i++;
			}
			else if (strcmp(argv[i], "-nightbrightness") == 0)
			{
				nightBrightness = atol(argv[++i]);
			}
			else if (strcmp(argv[i], "-nightdelay") == 0)
			{
				nightDelay_ms = atol(argv[++i]);
			}
			else if (strcmp(argv[i], "-nightautogain") == 0)
			{
				nightAutoGain = getBoolean(argv[++i]);
			}
			else if (strcmp(argv[i], "-nightmaxgain") == 0)
			{
				nightMaxGain = atol(argv[++i]);
			}
			else if (strcmp(argv[i], "-nightgain") == 0)
			{
				nightGain = atol(argv[++i]);
			}
			else if (strcmp(argv[i], "-nightbin") == 0)
			{
				nightBin = atol(argv[++i]);
			}
			else if (strcmp(argv[i], "-nightawb") == 0)
			{
				nightAutoAWB = getBoolean(argv[++i]);
			}
			else if (strcmp(argv[i], "-nightwbr") == 0)
			{
				nightWBR = atol(argv[++i]);
			}
			else if (strcmp(argv[i], "-nightwbb") == 0)
			{
				nightWBB = atol(argv[++i]);
			}
			else if (strcmp(argv[i], "-nightskipframes") == 0)
			{
				nightSkipFrames = atol(argv[++i]);
			}

			// daytime and nighttime settings
			else if (strcmp(argv[i], "-gamma") == 0)
			{
				gamma = atol(argv[++i]);
			}
			else if (strcmp(argv[i], "-offset") == 0)
			{
				offset = atol(argv[++i]);
			}
			else if (strcmp(argv[i], "-aggression") == 0)
			{
				aggression = atol(argv[++i]);
			}
			else if (strcmp(argv[i], "-gaintransitiontime") == 0)
			{
				gainTransitionTime = atol(argv[++i]);
			}
			else if (strcmp(argv[i], "-width") == 0)
			{
				width = atol(argv[++i]);
			}
			else if (strcmp(argv[i], "-height") == 0)
			{
				height = atol(argv[++i]);
			}
			else if (strcmp(argv[i], "-type") == 0)
			{
				imageType = atol(argv[++i]);
			}
			else if (strcmp(argv[i], "-quality") == 0)
			{
				quality = atol(argv[++i]);
			}
			else if (strcmp(argv[i], "-autousb") == 0)
			{
				asiAutoBandwidth = getBoolean(argv[++i]);
			}
			else if (strcmp(argv[i], "-usb") == 0)
			{
				asiBandwidth = atol(argv[++i]);
			}
			else if (strcmp(argv[i], "-filename") == 0)
			{
				fileName = argv[++i];
			}
			else if (strcmp(argv[i], "-flip") == 0)
			{
				flip = atol(argv[++i]);
			}
			else if (strcmp(argv[i], "-notificationimages") == 0)
			{
				notificationImages = getBoolean(argv[++i]);
			}
			else if (strcmp(argv[i], "-coolerEnabled") == 0)
			{
				coolerEnabled = getBoolean(argv[++i]);
			}
			else if (strcmp(argv[i], "-targetTemp") == 0)
			{
				targetTemp = atol(argv[++i]);
			}
			else if (strcmp(argv[i], "-latitude") == 0)
			{
				latitude = argv[++i];
			}
			else if (strcmp(argv[i], "-longitude") == 0)
			{
				longitude = argv[++i];
			}
			else if (strcmp(argv[i], "-angle") == 0)
			{
				angle = argv[++i];
			}
			else if (strcmp(argv[i], "-darkframe") == 0)
			{
				takingDarkFrames = getBoolean(argv[++i]);
			}
			else if (strcmp(argv[i], "-locale") == 0)
			{
				locale = argv[++i];
			}
#ifdef USE_HISTOGRAM
			else if (strcmp(argv[i], "-histogrambox") == 0)
			{
				if (sscanf(argv[++i], "%d %d %f %f", &histogramBoxSizeX, &histogramBoxSizeY, &histogramBoxPercentFromLeft, &histogramBoxPercentFromTop) != 4)
					Log(-1, "%s*** ERROR: Not enough histogram box parameters: '%s'%s\n", c(KRED), argv[i], c(KNRM));

				// scale user-input 0-100 to 0.0-1.0
				histogramBoxPercentFromLeft /= 100;
				histogramBoxPercentFromTop /= 100;
			}
#endif
			else if (strcmp(argv[i], "-debuglevel") == 0)
			{
				debugLevel = atol(argv[++i]);
			}
			else if (strcmp(argv[i], "-newexposure") == 0)
			{
				useNewExposureAlgorithm = getBoolean(argv[++i]);
			}
			else if (strcmp(argv[i], "-alwaysshowadvanced") == 0)
			{
				i++;	// not used
			}

			// overlay settings
			else if (strcmp(argv[i], "-showTime") == 0)
			{
				showTime = getBoolean(argv[++i]);
			}
			else if (strcmp(argv[i], "-timeformat") == 0)
			{
				timeFormat = argv[++i];
			}
			else if (strcmp(argv[i], "-showTemp") == 0)
			{
				showTemp = getBoolean(argv[++i]);
			}
			else if (strcmp(argv[i], "-temptype") == 0)
			{
				tempType = argv[++i];
			}
			else if (strcmp(argv[i], "-showExposure") == 0)
			{
				showExposure = getBoolean(argv[++i]);
			}
			else if (strcmp(argv[i], "-showGain") == 0)
			{
				showGain = getBoolean(argv[++i]);
			}
			else if (strcmp(argv[i], "-showBrightness") == 0)
			{
				showBrightness = getBoolean(argv[++i]);
			}
			else if (strcmp(argv[i], "-showMean") == 0)
			{
				showMean = getBoolean(argv[++i]);
			}
#ifdef USE_HISTOGRAM
			else if (strcmp(argv[i], "-showhistogrambox") == 0)
			{
				showHistogramBox = getBoolean(argv[++i]);
			}
#endif
			else if (strcmp(argv[i], "-showFocus") == 0)
			{
				showFocus = getBoolean(argv[++i]);
			}
			else if (strcmp(argv[i], "-text") == 0)
			{
				ImgText = argv[++i];
			}
			else if (strcmp(argv[i], "-extratext") == 0)
			{
				ImgExtraText = argv[++i];
			}
			else if (strcmp(argv[i], "-extratextage") == 0)
			{
				extraFileAge = atol(argv[++i]);
			}
			else if (strcmp(argv[i], "-textlineheight") == 0)
			{
				iTextLineHeight = atol(argv[++i]);
			}
			else if (strcmp(argv[i], "-textx") == 0)
			{
				iTextX = atol(argv[++i]);
			}
			else if (strcmp(argv[i], "-texty") == 0)
			{
				iTextY = atol(argv[++i]);
			}
			else if (strcmp(argv[i], "-fontname") == 0)
			{
				fontnumber = atol(argv[++i]);
			}
			else if (strcmp(argv[i], "-fontcolor") == 0)
			{
				fc = argv[++i];
			}
			else if (strcmp(argv[i], "-smallfontcolor") == 0)
			{
				sfc = argv[++i];
			}
			else if (strcmp(argv[i], "-fonttype") == 0)
			{
				linenumber = atol(argv[++i]);
			}
			else if (strcmp(argv[i], "-fontsize") == 0)
			{
				fontsize = atof(argv[++i]);
			}
			else if (strcmp(argv[i], "-fontline") == 0)
			{
				linewidth = atol(argv[++i]);
			}
			else if (strcmp(argv[i], "-outlinefont") == 0)
			{
				outlinefont = getBoolean(argv[++i]);
			}

			// Arguments that may be passed to us but we don't use.
			else if (strcmp(argv[i], "-alwaysshowadvanced") == 0)
			{
				i++;
			}
		}
	}

	if (! saveCC)
	{
		printf("\n%s", c(KGRN));
		if (version == NULL) version = "UNKNOWN";
		char v[100]; snprintf(v, sizeof(v), "*** Allsky Camera Software Version %s ***", version);
		for (size_t i=0; i<strlen(v); i++) printf("*");
		printf("\n");
		printf("%s\n", v);
		for (size_t i=0; i<strlen(v); i++) printf("*");
		printf("\n\n");
		printf("Capture images of the sky with a Raspberry Pi and an ASI Camera\n");
		printf("%s\n", c(KNRM));
		if (! help) printf("%sAdd -h or --help for available options%s\n\n", c(KYEL), c(KNRM));
		printf("Author: Thomas Jacquin - <jacquin.thomas@gmail.com>\n\n");
		printf("Contributors:\n");
		printf(" -Knut Olav Klo\n");
		printf(" -Daniel Johnsen\n");
		printf(" -Yang and Sam from ZWO\n");
		printf(" -Robert Wagner\n");
		printf(" -Michael J. Kidd - <linuxkidd@gmail.com>\n");
		printf(" -Chris Kuethe\n");
		printf(" -Eric Claeys\n");
		printf("\n");
	}

	if (setlocale(LC_NUMERIC, locale) == NULL)
		Log(-1, "*** WARNING: Could not set locale to %s ***\n", locale);

	if (help)
	{
		printf("%sUsage:\n", c(KRED));
		printf(" ./capture -width 640 -height 480 -nightexposure 5000000 -type 1 -nightbin 1 -filename Lake-Laberge.PNG\n\n");
		printf("%s", c(KNRM));

		printf("%sAvailable Arguments:\n", c(KYEL));
		printf(" -dayautoexposure		- Default = %s: 1 enables daytime auto-exposure\n", yesNo(DEFAULT_DAYAUTOEXPOSURE));
		printf(" -daymaxexposure		- Default = %'d: Maximum daytime auto-exposure in ms (equals to %.1f sec)\n", DEFAULT_DAYMAXAUTOEXPOSURE_MS, (float)DEFAULT_DAYMAXAUTOEXPOSURE_MS/US_IN_MS);
		printf(" -dayexposure			- Default = %'d: Daytime exposure in us (equals to %.4f sec)\n", DEFAULT_DAYEXPOSURE, (float)DEFAULT_DAYEXPOSURE/US_IN_SEC);
		printf(" -daymean				- Default = %.2f: Daytime target exposure brightness\n", DEFAULT_DAYMEAN);
		printf("						  NOTE: Daytime Auto-Gain and Auto-Exposure should be on for best results\n");
		printf(" -daybrightness			- Default = %d: Daytime brightness level\n", DEFAULT_BRIGHTNESS);
		printf(" -dayDelay				- Default = %'d: Delay between daytime images in milliseconds - 5000 = 5 sec.\n", DEFAULT_DAYDELAY);
		printf(" -dayautogain			- Default = %s: 1 enables daytime auto gain\n", yesNo(DEFAULT_DAYAUTOGAIN));
		printf(" -daymaxgain			- Default = %d: Daytime maximum auto gain\n", DEFAULT_DAYMAXGAIN);
		printf(" -daygain				- Default = %d: Daytime gain\n", DEFAULT_DAYGAIN);
		printf(" -daybin				- Default = %d: 1 = binning OFF (1x1), 2 = 2x2 binning, 4 = 4x4 binning\n", DEFAULT_DAYBIN);
		printf(" -dayautowhitebalance	- Default = %s: 1 enables auto White Balance\n", yesNo(DEFAULT_DAYAUTOAWB));
		printf(" -daywbr				- Default = %d: Manual White Balance Red\n", DEFAULT_DAYWBR);
		printf(" -daywbb				- Default = %d: Manual White Balance Blue\n", DEFAULT_DAYWBB);
		printf(" -dayskipframes			- Default = %d: Number of auto-exposure frames to skip when starting software during daytime.\n", DEFAULT_DAYSKIPFRAMES);

		printf(" -nightautoexposure		- Default = %s: 1 enables nighttime auto-exposure\n", yesNo(DEFAULT_NIGHTAUTOEXPOSURE));
		printf(" -nightmaxexposure		- Default = %'d: Maximum nighttime auto-exposure in ms (equals to %.1f sec)\n", DEFAULT_NIGHTMAXAUTOEXPOSURE_MS, (float)DEFAULT_NIGHTMAXAUTOEXPOSURE_MS/US_IN_MS);
		printf(" -nightexposure			- Default = %'d: Nighttime exposure in us (equals to %.4f sec)\n", DEFAULT_NIGHTEXPOSURE, (float)DEFAULT_NIGHTEXPOSURE/US_IN_SEC);
		printf(" -nightmean				- Default = %.2f: Nighttime target exposure brightness\n", DEFAULT_NIGHTMEAN);
		printf("						  NOTE: Nighttime Auto-Gain and Auto-Exposure should be on for best results\n");
		printf(" -nightbrightness		- Default = %d: Nighttime brightness level\n", DEFAULT_BRIGHTNESS);
		printf(" -nightDelay			- Default = %'d: Delay between nighttime images in milliseconds - %d = 1 sec.\n", DEFAULT_NIGHTDELAY, MS_IN_SEC);
		printf(" -nightautogain			- Default = %s: 1 enables nighttime auto gain\n", yesNo(DEFAULT_NIGHTAUTOGAIN));
		printf(" -nightmaxgain			- Default = %d: Nighttime maximum auto gain\n", DEFAULT_NIGHTMAXGAIN);
		printf(" -nightgain				- Default = %d: Nighttime gain\n", DEFAULT_NIGHTGAIN);
		printf(" -nightbin				- Default = %d: same as daybin but for night\n", DEFAULT_NIGHTBIN);
		printf(" -nightautowhitebalance	- Default = %s: 1 enables auto White Balance\n", yesNo(DEFAULT_NIGHTAUTOAWB));
		printf(" -nightwbr				- Default = %d: Manual White Balance Red\n", DEFAULT_NIGHTWBR);
		printf(" -nightwbb				- Default = %d: Manual White Balance Blue\n", DEFAULT_NIGHTWBB);
		printf(" -nightskipframes		- Default = %d: Number of auto-exposure frames to skip when starting software during nighttime.\n", DEFAULT_NIGHTSKIPFRAMES);

		printf(" -gamma					- Default = %d: Gamma level\n", DEFAULT_GAMMA);
		printf(" -offset				- Default = %d: Offset\n", DEFAULT_OFFSET);
		printf(" -aggression			- Default = %d%%: Percent of exposure change to make, similar to PHD2.\n", DEFAULT_AGGRESSION);
		printf(" -gaintransitiontime	- Default = %'d: Seconds to transition gain from day-to-night or night-to-day.  0 disable it.\n", DEFAULT_GAIN_TRANSITION_TIME);
		printf(" -width					- Default = %d = Camera Max Width\n", DEFAULT_WIDTH);
		printf(" -height				- Default = %d = Camera Max Height\n", DEFAULT_HEIGHT);
		printf(" -type = Image Type		- Default = %d: 99 = auto,  0 = RAW8,  1 = RGB24,  2 = RAW16,  3 = Y8\n", DEFAULT_IMAGE_TYPE);
		printf(" -quality				- Default PNG=3, JPG=%d, Values: PNG=0-9, JPG=0-100\n", DEFAULT_JPG_QUALITY);
		printf(" -autousb				- Default = false: 1 enables auto USB Speed\n");
		printf(" -usb = USB Speed		- Default = %d: Values between %d-%d, This is BandwidthOverload\n", DEFAULT_ASIBANDWIDTH, MIN_ASIBANDWIDTH, MAX_ASIBANDWIDTH);
		printf(" -filename				- Default = %s\n", DEFAULT_FILENAME);
		printf(" -flip					- Default = 0: 0 = No flip, 1 = Horizontal, 2 = Vertical, 3 = Both\n");
		printf(" -notificationimages	- 1 enables notification images, for example, 'Camera is off during day'.\n");
		printf(" -coolerEnabled			- 1 enables cooler (cooled cameras only)\n");
		printf(" -targetTemp			- Target temperature in degrees C (cooled cameras only)\n");
		printf(" -latitude				- No default - you must set it.  Latitude of the camera.\n");
		printf(" -longitude				- No default - you must set it.  Longitude of the camera.\n");
		printf(" -angle					- Default = %s: Angle of the sun below the horizon.\n", DEFAULT_ANGLE);
		printf("		-6=civil twilight   -12=nautical twilight   -18=astronomical twilight\n");
		printf(" -darkframe				- 1 disables the overlay and takes dark frames instead\n");
		printf(" -locale				- Default = %s: Your locale - to determine thousands separator and decimal point.\n", DEFAULT_LOCALE);
		printf("						  Type 'locale' at a command prompt to determine yours.\n");
#ifdef USE_HISTOGRAM
		printf(" -histogrambox			- Default = %d %d %0.2f %0.2f (box width X, box width y, X offset percent (0-100), Y offset (0-100))\n", DEFAULT_BOX_SIZEX, DEFAULT_BOX_SIZEY, DEFAULT_BOX_FROM_LEFT * 100, DEFAULT_BOX_FROM_TOP * 100);
#endif
		printf(" -debuglevel			- Default = 0. Set to 1, 2, 3, or 4 for more debugging information.\n");
		printf(" -newexposure			- Default = %s. Determines if version 0.8 exposure method should be used.\n", yesNo(DEFAULT_NEWEXPOSURE));

		printf(" -showTime				- Set to 1 to display the time on the image.\n");
		printf(" -timeformat			- Format the optional time is displayed in; default is '%s'\n", DEFAULT_TIMEFORMAT);
		printf(" -showTemp				- 1 displays the camera sensor temperature\n");
		printf(" -temptype				- Units to display temperature in: 'C'elsius, 'F'ahrenheit, or 'B'oth.\n");
		printf(" -showExposure			- 1 displays the exposure length\n");
		printf(" -showGain				- 1 display the gain\n");
		printf(" -showBrightness		- 1 displays the brightness\n");
		printf(" -showMean				- 1 displays the mean brightness\n");
#ifdef USE_HISTOGRAM
		printf(" -showhistogrambox		- 1 displays an outline of the histogram box on the image overlay.\n");
		printf("						  Useful to determine what parameters to use with -histogrambox.\n");
#endif
		printf(" -focus					- Set to 1 to display a focus metric on the image.\n");
		printf(" -text					- Default = \"\": Text Overlay\n");
		printf(" -extratext				- Default = \"\": Full Path to extra text to display\n");
		printf(" -extratextage			- Default = 0: If the extra file is not updated after this many seconds its contents will not be displayed. 0 disables it.\n");
		printf(" -textlineheight		- Default = %d: Text Line Height in pixels\n", DEFAULT_ITEXTLINEHEIGHT);
		printf(" -textx					- Default = %d: Text Placement Horizontal from LEFT in pixels\n", DEFAULT_ITEXTX);
		printf(" -texty					- Default = %d: Text Placement Vertical from TOP in pixels\n", DEFAULT_ITEXTY);
		printf(" -fontname				- Default = %d: Font Types (0-7), Ex. 0 = simplex, 4 = triplex, 7 = script\n", DEFAULT_FONTNUMBER);
		printf(" -fontcolor				- Default = 255 0 0: Text font color (BGR)\n");
		printf(" -smallfontcolor		- Default = 0 0 255: Small text font color (BGR)\n");
		printf(" -fonttype				- Default = %d: Font Line Type: 0=AA, 1=8, 2=4\n", DEFAULT_LINENUMBER);
		printf(" -fontsize				- Default = %d: Text Font Size\n", DEFAULT_FONTSIZE);
		printf(" -fontline				- Default = %d: Text Font Line Thickness\n", DEFAULT_LINEWIDTH);
		printf(" -outlinefont			- Default = %s: 1 enables outline font\n", yesNo(DEFAULT_OUTLINEFONT));

		printf("\n");
		printf(" -daytime				- Default = %s: 1 enables capture daytime images\n", yesNo(DEFAULT_DAYTIMECAPTURE));
		printf(" -save_dir directory	- Default = %s: where to save 'filename'\n", DEFAULT_SAVEDIR);
		printf(" -preview				- 1 previews the captured images. Only works with a Desktop Environment\n");
		printf(" -cc_save_dir directory	- Outputs the camera's capabilities to the specified directory and exists.\n");
		printf(" -version				- Version of Allsky in use.\n");

		printf("%s", c(KNRM));
		closeUp(EXIT_OK);
	}

	// Do argument error checking if we're not going to exit soon.
	// Some checks are done lower in the code, after we processed some values.
	if (! saveCC)
	{
		// xxxx TODO: NO_MAX_VALUE will be replaced by acutal values
		validateLong(&dayMaxAutoexposure_ms, 1, NO_MAX_VALUE, "Daytime Max Auto-Exposure", true);	// camera-specific
		validateFloat(&temp_dayExposure_ms, 1, NO_MAX_VALUE, "Daytime Manual Exposure", true);		// camera-specific
				dayExposure_us = temp_dayExposure_ms * US_IN_MS;
		validateLong(&dayBrightness, 0, 100, "Daytime Brightness", true);					// camera-specific
		validateLong(&dayDelay_ms, 10, NO_MAX_VALUE, "Daytime Delay", false);
		validateLong(&dayMaxGain, 0, NO_MAX_VALUE, "Daytime Max Auto-Gain", true);					// camera-specific
		validateLong(&dayGain, 0, NO_MAX_VALUE, "Daytime Gain", true);								// camera-specific
		validateLong(&dayBin, 1, NO_MAX_VALUE, "Daytime Binning", false);								// camera-specific
		validateLong(&dayWBR, 0, NO_MAX_VALUE, "Daytime Red Balance", true);							// camera-specific
		validateLong(&dayWBB, 0, NO_MAX_VALUE, "Daytime Blue Balance", true);						// camera-specific
		validateLong(&daySkipFrames, 0, 50, "Daytime Skip Frames", true);
		validateLong(&nightMaxAutoexposure_ms, 1, NO_MAX_VALUE, "Nighttime Max Auto-Exposure", true);// camera-specific
		validateFloat(&temp_nightExposure_ms, 1, NO_MAX_VALUE, "Nighttime Manual Exposure", true);	// camera-specific
				nightExposure_us = temp_nightExposure_ms * US_IN_MS;
		validateLong(&nightBrightness, 0, 100, "Nighttime Brightness", true);				// camera-specific
		validateLong(&nightDelay_ms, 10, NO_MAX_VALUE, "Nighttime Delay", false);
		validateLong(&nightMaxGain, 0, NO_MAX_VALUE, "Nighttime Max Auto-Gain", true);				// camera-specific
		validateLong(&nightGain, 0, NO_MAX_VALUE, "Nighttime Gain", true);							// camera-specific
		validateLong(&nightBin, 1, NO_MAX_VALUE, "Nighttime Binning", false);							// camera-specific
		validateLong(&nightWBR, 0, NO_MAX_VALUE, "Nighttime Red Balance", true);						// camera-specific
		validateLong(&nightWBB, 0, NO_MAX_VALUE, "Nighttime Blue Balance", true);					// camera-specific
		validateLong(&nightSkipFrames, 0, 50, "Nighttime Skip Frames", true);
		validateLong(&gamma, 0, NO_MAX_VALUE, "Gamma", true);										// camera-specific
		validateLong(&offset, 0, NO_MAX_VALUE, "Offset", true);										// camera-specific
		validateLong(&aggression, 1, 100, "Aggression", true);
		validateLong(&gainTransitionTime, 0, NO_MAX_VALUE, "Gain Transition Time", true);
		// user specifies minutes but we want seconds.
		gainTransitionTime *= 60;
		if (imageType != AUTO_IMAGE_TYPE)
			validateLong(&imageType, 0, ASI_IMG_END, "Image Type", false);
		validateLong(&asiBandwidth, MIN_ASIBANDWIDTH, MAX_ASIBANDWIDTH, "USB Bandwidth", true);
		validateLong(&flip, 0, 3, "Flip", false);
		validateLong(&targetTemp, -50, NO_MAX_VALUE, "Target Sensor Temperature", true);				// camera-specific
		validateLong(&debugLevel, 0, 5, "Debug Level", true);

		validateLong(&extraFileAge, 0, NO_MAX_VALUE, "Max Age Of Extra", true);
		validateLong(&fontnumber, 0, sizeof(fontname)-1, "Font Name", true);
		validateLong(&linenumber, 0, sizeof(linetype)-1, "Font Smoothness", true);

		if (fc != NULL && sscanf(fc, "%d %d %d", &fontcolor[0], &fontcolor[1], &fontcolor[2]) != 3)
			Log(0, "%s*** ERROR: Not enough font color parameters: '%s'%s\n", c(KRED), fc, c(KNRM));
		if (sfc != NULL && sscanf(sfc, "%d %d %d", &smallFontcolor[0], &smallFontcolor[1], &smallFontcolor[2]) != 3)
			Log(0, "%s*** ERROR: Not enough small font color parameters: '%s'%s\n", c(KRED), sfc, c(KNRM));
	}
	char const *imagetype = "";
	char const *ext = checkForValidExtension(fileName, imageType);
	if (ext == NULL)
	{
		// checkForValidExtension() displayed the error message.
		closeUp(EXIT_ERROR_STOP);
	}
	if (strcasecmp(ext, "jpg") == 0 || strcasecmp(ext, "jpeg") == 0)
	{
		imagetype = "jpg";
		compressionParameters.push_back(cv::IMWRITE_JPEG_QUALITY);
		// want dark frames to be at highest quality
		if (takingDarkFrames)
		{
			quality = 100;
		}
		else if (quality == NOT_SET)
		{
			quality = 95;
		}
		else
		{
			validateLong(&quality, 0, 100, "JPG Quality", true);
		}
	}
	else if (strcasecmp(ext, "png") == 0)
	{
		imagetype = "png";
		compressionParameters.push_back(cv::IMWRITE_PNG_COMPRESSION);
		// png is lossless so "quality" is really just the amount of compression.
		if (takingDarkFrames)
		{
			quality = 9;
		}
		else if (quality == NOT_SET)
		{
			quality = DEFAULT_PNG_COMPRESSION;
		}
		else
		{
			validateLong(&quality, 0, 9, "PNG Quality/Compression", true);
		}
	}
	compressionParameters.push_back(quality);

	// Get just the name of the file, without any directories or the extension.
	char fileNameOnly[50] = { 0 };
	if (takingDarkFrames)
	{
		// To avoid overwriting the optional notification image with the dark image,
		// during dark frames we use a different file name.
		static char darkFilename[20];
		sprintf(darkFilename, "dark.%s", imagetype);
		fileName = darkFilename;
		strncat(finalFileName, fileName, sizeof(finalFileName)-1);
	}
	else
	{
		char const *slash = strrchr(fileName, '/');
		if (slash == NULL)
			strncat(fileNameOnly, fileName, sizeof(fileNameOnly)-1);
		else
			strncat(fileNameOnly, slash + 1, sizeof(fileNameOnly)-1);
		char *dot = strrchr(fileNameOnly, '.');	// we know there's an extension
		*dot = '\0';
	}

	processConnectedCameras();	// exits on error
	ASIGetCameraProperty(&ASICameraInfo, CamNum);

	asiRetCode = ASIOpenCamera(CamNum);
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
	if (width == 0 || height == 0)
	{
		width  = iMaxWidth;
		height = iMaxHeight;
	}
	else
	{
		validateLong(&width, 0, iMaxWidth, "Width", true);
		validateLong(&height, 0, iMaxHeight, "Height", true);
	}
	originalWidth = width;
	originalHeight = height;
	// Limit these to a reasonable value based on the size of the sensor.
	validateLong(&iTextLineHeight, 0, (long)(iMaxHeight / 2), "Line Height", true);
	validateLong(&iTextX, 0, (long)iMaxWidth - 10, "Text X", true);
	validateLong(&iTextY, 0, (long)iMaxHeight - 10, "Text Y", true);
	validateFloat(&fontsize, 0.1, iMaxHeight / 2, "Font Size", true);
	validateLong(&linewidth, 0, (long)(iMaxWidth / 2), "Font Weight", true);

	ASIGetNumOfControls(CamNum, &iNumOfCtrl);

	if (saveCC)
	{
		saveCameraInfo(ASICameraInfo, CC_saveDir, iMaxWidth, iMaxHeight, pixelSize, bayer[ASICameraInfo.BayerPattern]);
		closeUp(EXIT_OK);
	}

	outputCameraInfo(ASICameraInfo, iMaxWidth, iMaxHeight, pixelSize, bayer[ASICameraInfo.BayerPattern]);
	// checkExposureValues() must come after outputCameraInfo().
	(void) checkExposureValues(dayExposure_us, dayAutoExposure, nightExposure_us, nightAutoExposure);

#ifdef USE_HISTOGRAM
	int centerX, centerY;
	int leftOfBox, rightOfBox;
	int topOfBox, bottomOfBox;

	// The histogram box needs to fit on the image.
	// If we're binning we'll decrease the size of the box accordingly.
	bool ok = true;
	if (histogramBoxSizeX < 1 || histogramBoxSizeY < 1)
	{
		Log(-1, "%s*** ERROR: Histogram box size must be > 0; you entered X=%d, Y=%d%s\n",
			c(KRED), histogramBoxSizeX, histogramBoxSizeY, c(KNRM));
		ok = false;
	}
	if (isnan(histogramBoxPercentFromLeft) || isnan(histogramBoxPercentFromTop) || 
		histogramBoxPercentFromLeft < 0.0 || histogramBoxPercentFromTop < 0.0)
	{
		Log(-1, "%s*** ERROR: Bad values for histogram percents; you entered X=%.0f%%, Y=%.0f%%%s\n",
			c(KRED), (histogramBoxPercentFromLeft*100.0), (histogramBoxPercentFromTop*100.0), c(KNRM));
		ok = false;
		centerX = centerY = 0;		// keeps compiler quiet
		leftOfBox = rightOfBox = topOfBox = bottomOfBox = 0;	// keeps compiler quiet
	}
	else
	{
		centerX = width * histogramBoxPercentFromLeft;
		centerY = height * histogramBoxPercentFromTop;
		leftOfBox = centerX - (histogramBoxSizeX / 2);
		rightOfBox = centerX + (histogramBoxSizeX / 2);
		topOfBox = centerY - (histogramBoxSizeY / 2);
		bottomOfBox = centerY + (histogramBoxSizeY / 2);

		if (leftOfBox < 0 || rightOfBox >= width || topOfBox < 0 || bottomOfBox >= height)
		{
			Log(-1, "%s*** ERROR: Histogram box location must fit on image; upper left of box is %dx%d, lower right %dx%d%s\n", c(KRED), leftOfBox, topOfBox, rightOfBox, bottomOfBox, c(KNRM));
			ok = false;
		}
	}

	if (! ok)
		closeUp(EXIT_ERROR_STOP);	// force the user to fix it
#endif

	asiRetCode = ASIInitCamera(CamNum);
	if (asiRetCode != ASI_SUCCESS)
	{
		printf("*** ERROR: Unable to initialise camera: %s\n", getRetCode(asiRetCode));
		closeUp(EXIT_ERROR_STOP);	// Can't do anything so might as well exit.
	}

	// Handle "auto" imageType.
	if (imageType == AUTO_IMAGE_TYPE)
	{
		// If it's a color camera, create color pictures.
		// If it's a mono camera use RAW16 if the image file is a .png, otherwise use RAW8.
		// There is no good way to handle Y8 automatically so it has to be set manually.
		if (ASICameraInfo.IsColorCam)
			imageType = IMG_RGB24;
		else if (strcmp(imagetype, "png") == 0)
			imageType = IMG_RAW16;
		else // jpg
			imageType = IMG_RAW8;
	}

	char const *sType;		// displayed in output
	if (imageType == IMG_RAW16)
	{
		sType = "RAW16";
		currentBpp = 2;
		currentBitDepth = 16;
	}
	else if (imageType == IMG_RGB24)
	{
		sType = "RGB24";
		currentBpp = 3;
		currentBitDepth = 8;
	}
	else if (imageType == IMG_RAW8)
	{
		// Color cameras should use Y8 instead of RAW8. Y8 is the mono mode for color cameras.
		if (ASICameraInfo.IsColorCam)
		{
			imageType = IMG_Y8;
			sType = "Y8 (not RAW8 for color cameras)";
		}
		else
		{
			sType = "RAW8";
		}
		currentBpp = 1;
		currentBitDepth = 8;
	}
	else if (imageType == IMG_Y8)
	{
		sType = "Y8";
		currentBpp = 1;
		currentBitDepth = 8;
	}
	else
	{
		sType = "unknown";		// keeps compiler quiet
		Log(0, "*** ERROR: Unknown Image Type: %d\n", imageType);
		closeUp(EXIT_ERROR_STOP);
	}

	//-------------------------------------------------------------------------------------------------------
	//-------------------------------------------------------------------------------------------------------

	printf("%s", c(KGRN));
	printf("\nCapture Settings:\n");
	printf(" Image Type: %s\n", sType);
	printf(" Resolution (before any binning): %ldx%ld\n", width, height);
	printf(" Quality: %ld\n", quality);
	printf(" Daytime capture: %s\n", yesNo(daytimeCapture));

	printf(" Exposure (day):   %s, Auto: %s\n", length_in_units(dayExposure_us, true), yesNo(dayAutoExposure));
	printf(" Exposure (night): %s, Auto: %s\n", length_in_units(nightExposure_us, true), yesNo(nightAutoExposure));
	printf(" Max Auto-Exposure (day):   %s\n", length_in_units(dayMaxAutoexposure_ms, true));
	printf(" Max Auto-Exposure (night): %s\n", length_in_units(nightMaxAutoexposure_ms, true));
	printf(" Gain (day):   %ld, Auto: %s, max: %ld\n", dayGain, yesNo(dayAutoGain), dayMaxGain);
	printf(" Gain (night): %ld, Auto: %s, max: %ld\n", nightGain, yesNo(nightAutoGain), nightMaxGain);
	printf(" Gain Transition Time: %.1f minutes\n", (float) gainTransitionTime/60);
	printf(" Brightness (day):   %ld\n", dayBrightness);
	printf(" Brightness (night): %ld\n", nightBrightness);
	printf(" Binning (day):   %ld\n", dayBin);
	printf(" Binning (night): %ld\n", nightBin);
	if (ASICameraInfo.IsColorCam)
	{
		printf(" White Balance (day)   Red: %ld, Blue: %ld, Auto: %s\n", dayWBR, dayWBB, yesNo(dayAutoAWB));
		printf(" White Balance (night) Red: %ld, Blue: %ld, Auto: %s\n", nightWBR, nightWBB, yesNo(nightAutoAWB));
	}
	printf(" Delay (day):   %s\n", length_in_units(dayDelay_ms, true));
	printf(" Delay (night): %s\n", length_in_units(nightDelay_ms, true));
	printf(" Skip Frames (day):   %ld\n", daySkipFrames);
	printf(" Skip Frames (night): %ld\n", nightSkipFrames);

	printf(" Aggression: %ld%%\n", aggression);
	if (ASICameraInfo.IsCoolerCam)
	{
		printf(" Cooler Enabled: %s", yesNo(coolerEnabled));
		if (coolerEnabled) printf(", Target Temperature: %ld C\n", targetTemp);
		printf("\n");
	}
	printf(" Gamma: %ld\n", gamma);
	printf(" Offset: %ld\n", offset);
	printf(" USB Speed: %ld, auto: %s\n", asiBandwidth, yesNo(asiAutoBandwidth));
	printf(" Flip Image: %s (%ld)\n", getFlip(flip), flip);
	printf(" Filename: %s\n", fileName);
	printf(" Filename Save Directory: %s\n", saveDir);
	printf(" Latitude: %s, Longitude: %s\n", latitude, longitude);
	printf(" Sun Elevation: %s\n", angle);
	printf(" Locale: %s\n", locale);
	printf(" Notification Images: %s\n", yesNo(notificationImages));
#ifdef USE_HISTOGRAM
	printf(" Histogram Box: %d %d %0.0f %0.0f, center: %dx%d, upper left: %dx%d, lower right: %dx%d\n",
		histogramBoxSizeX, histogramBoxSizeY,
		histogramBoxPercentFromLeft * 100, histogramBoxPercentFromTop * 100,
		centerX, centerY, leftOfBox, topOfBox, rightOfBox, bottomOfBox);
	printf(" Show Histogram Box: %s\n", yesNo(showHistogramBox));
#endif
	printf(" Preview: %s\n", yesNo(preview));
	printf(" Taking Dark Frames: %s\n", yesNo(takingDarkFrames));
	printf(" Debug Level: %ld\n", debugLevel);
	printf(" On TTY: %s\n", yesNo(tty));
	printf(" Video OFF Between Images: %s\n", yesNo(useNewExposureAlgorithm));

	printf(" Text Overlay: %s\n", ImgText[0] == '\0' ? "[none]" : ImgText);
	printf(" Text Extra File: %s, Age: %ld seconds\n", ImgExtraText[0] == '\0' ? "[none]" : ImgExtraText, extraFileAge);
	printf(" Text Line Height %ldpx\n", iTextLineHeight);
	printf(" Text Position: %ldpx from left, %ldpx from top\n", iTextX, iTextY);
	printf(" Font Name: %s (%d)\n", fontnames[fontnumber], fontname[fontnumber]);
	printf(" Font Color: %d, %d, %d\n", fontcolor[0], fontcolor[1], fontcolor[2]);
	printf(" Small Font Color: %d, %d, %d\n", smallFontcolor[0], smallFontcolor[1], smallFontcolor[2]);
	printf(" Font Line Type: %d\n", linetype[linenumber]);
	printf(" Font Size: %1.1f\n", fontsize);
	printf(" Font Line Width: %ld\n", linewidth);
	printf(" Outline Font : %s\n", yesNo(outlinefont));

	printf(" Show Time: %s (format: %s)\n", yesNo(showTime), timeFormat);
	printf(" Show Exposure: %s\n", yesNo(showExposure));
	printf(" Show Temperature: %s, type: %s\n", yesNo(showTemp), tempType);
	printf(" Show Gain: %s\n", yesNo(showGain));
	printf(" Show Brightness: %s\n", yesNo(showBrightness));
	printf(" Show Mean Brightness: %s\n", yesNo(showMean));
	printf(" Show Focus Metric: %s\n", yesNo(showFocus));
	printf(" ZWO SDK version %s\n", ASIGetSDKVersion());
	printf(" Allsky version: %s\n", version);
	printf("%s\n", c(KNRM));

	//-------------------------------------------------------------------------------------------------------
	//-------------------------------------------------------------------------------------------------------
	// These configurations apply to both day and night.
	// Other calls to setControl() are done after we know if we're in daytime or nighttime.
	setControl(CamNum, ASI_BANDWIDTHOVERLOAD, asiBandwidth, asiAutoBandwidth ? ASI_TRUE : ASI_FALSE);
	setControl(CamNum, ASI_HIGH_SPEED_MODE, 0, ASI_FALSE);	// ZWO sets this in their program
	setControl(CamNum, ASI_GAMMA, gamma, ASI_FALSE);
	setControl(CamNum, ASI_OFFSET, offset, ASI_FALSE);
	setControl(CamNum, ASI_FLIP, flip, ASI_FALSE);

	if (ASICameraInfo.IsCoolerCam)
	{
		asiRetCode = setControl(CamNum, ASI_COOLER_ON, coolerEnabled ? ASI_TRUE : ASI_FALSE, ASI_FALSE);
		if (asiRetCode != ASI_SUCCESS)
		{
			printf("%s", c(KRED));
			printf(" WARNING: Could not enable cooler: %s, but continuing without it.\n", getRetCode(asiRetCode));
			printf("%s", c(KNRM));
		}
		asiRetCode = setControl(CamNum, ASI_TARGET_TEMP, targetTemp, ASI_FALSE);
		if (asiRetCode != ASI_SUCCESS)
		{
			printf("%s", c(KRED));
			printf(" WARNING: Could not set cooler temperature: %s, but continuing without it.\n", getRetCode(asiRetCode));
			printf("%s", c(KNRM));
		}
	}

	if (! bSaveRun && pthread_create(&hthdSave, 0, SaveImgThd, 0) == 0)
	{
		bSaveRun = true;
	}

	// Initialization
	int exitCode				= EXIT_OK;	// Exit code for main()
	int originalITextX			= iTextX;
	int originalITextY			= iTextY;
	int originalFontsize		= fontsize;
	int originalLinewidth		= linewidth;
	// Have we displayed "not taking picture during day" message, if applicable?
	bool displayedNoDaytimeMsg	= false;
	int gainChange				= 0;		// how much to change gain up or down

	// Display one-time messages.

	// If autogain is on, our adjustments to gain will get overwritten by the camera
	// so don't transition.
	// gainTransitionTime of 0 means don't adjust gain.
	// No need to adjust gain if day and night gain are the same.
	if (dayAutoGain || nightAutoGain || gainTransitionTime == 0 || dayGain == nightGain || takingDarkFrames)
	{
		adjustGain = false;
		Log(3, "Will NOT adjust gain at transitions\n");
	}
	else
	{
		adjustGain = true;
		Log(3, "Will adjust gain at transitions\n");
	}

	if (ImgExtraText[0] != '\0' && extraFileAge > 0) {
		Log(3, "Extra Text File Age Disabled So Displaying Anyway\n");
	}

	if (tty)
		printf("*** Press Ctrl+C to stop ***\n\n");

	// Start taking pictures

	if (! useNewExposureAlgorithm)
	{
		asiRetCode = ASIStartVideoCapture(CamNum);
		if (asiRetCode != ASI_SUCCESS)
		{
			Log(0, "*** ERROR: Unable to start video capture: %s\n", getRetCode(asiRetCode));
			closeUp(EXIT_ERROR_STOP);
		}
	}

	while (bMain)
	{
setAutoExposure = false;	// XXXXXXXXXXXX testing
		// Find out if it is currently DAY or NIGHT
		dayOrNight = calculateDayOrNight(latitude, longitude, angle);
		std::string lastDayOrNight = dayOrNight;

		if (! takingDarkFrames)
			currentAdjustGain = resetGainTransitionVariables(dayGain, nightGain);

		if (takingDarkFrames)
		{
			// We're doing dark frames so turn off autoexposure and autogain, and use
			// nightime gain, delay, max exposure, bin, and brightness to mimic a nightime shot.
			currentAutoExposure = false;
			nightAutoExposure = false;
			currentAutoGain = false;
			currentGain = nightGain;
			currentMaxGain = nightMaxGain;		// not needed since we're not using auto gain, but set to be consistent
			gainChange = 0;
			currentDelay_ms = nightDelay_ms;
			currentMaxAutoexposure_us = currentExposure_us = nightMaxAutoexposure_ms * US_IN_MS;
			currentBin = nightBin;
			currentBrightness = nightBrightness;
			if (ASICameraInfo.IsColorCam)
			{
				currentAutoAWB = false;
				currentWBR = nightWBR;
				currentWBB = nightWBB;
			}

			Log(0, "Taking dark frames...\n");

			if (notificationImages) {
				system("scripts/copy_notification_image.sh --expires 0 DarkFrames &");
			}
		}

		else if (dayOrNight == "DAY")
		{
			// Setup the daytime capture parameters
			if (endOfNight == true)	// Execute end of night script
			{
				Log(0, "Processing end of night data\n");
				system("scripts/endOfNight.sh &");
				endOfNight = false;
				displayedNoDaytimeMsg = false;
			}

			if (! daytimeCapture)
			{
				// Only display messages once a day.
				if (! displayedNoDaytimeMsg) {
					if (notificationImages) {
						system("scripts/copy_notification_image.sh --expires 0 CameraOffDuringDay &");
					}
					Log(0, "It's daytime... we're not saving images.\n%s",
						tty ? "*** Press Ctrl+C to stop ***\n" : "");
					displayedNoDaytimeMsg = true;

					// sleep until almost nighttime, then wake up and sleep more if needed.
					int secsTillNight = calculateTimeToNightTime(latitude, longitude, angle);
					timeval t;
					t = getTimeval();
					t.tv_sec += secsTillNight;
					Log(1, "Sleeping until %s (%'d seconds)\n", formatTime(t, timeFormat), secsTillNight);
					sleep(secsTillNight);
				}
				else
				{
					// Shouldn't need to sleep more than a few times before nighttime.
					int s = 5;
					Log(1, "Not quite nighttime; sleeping %'d more seconds\n", s);
					sleep(s);
				}

				// No need to do any of the code below so go back to the main loop.
				continue;
			}

			else
			{
				Log(0, "==========\n=== Starting daytime capture ===\n==========\n");

				// We only skip initial frames if we are starting in daytime and using auto-exposure.
				if (numExposures == 0 && dayAutoExposure)
					currentSkipFrames = daySkipFrames;

				// If we went from Night to Day, then currentExposure_us will be the last night
				// exposure so leave it if we're using auto-exposure so there's a seamless change from
				// Night to Day, i.e., if the exposure was fine a minute ago it will likely be fine now.
				// On the other hand, if this program just started or we're using manual exposures,
				// use what the user specified.
				if (numExposures == 0 || ! dayAutoExposure)
				{
					if (dayAutoExposure && dayExposure_us > dayMaxAutoexposure_ms*US_IN_MS)
					{
						snprintf(bufTemp, sizeof(bufTemp), "%s", length_in_units(dayExposure_us, true));
						Log(0, "*** WARNING: daytime Manual Exposure [%s] > Max Auto-Exposure [%s]; user smaller number.\n", bufTemp, length_in_units(dayMaxAutoexposure_ms*US_IN_MS, true));
						dayExposure_us = dayMaxAutoexposure_ms * US_IN_MS;
					}
					currentExposure_us = dayExposure_us;
				}
				else
				{
					// If gain changes, we have to change the exposure time to get an equally
					// exposed image.
					// ZWO gain has unit 0.1dB, so we have to convert the gain values to a factor first
					//		newExp =  (oldExp * oldGain) / newGain
					// e.g.		20s = (10s    * 2.0)     / (1.0) 

					// current values here are last night's values
					double oldGain = pow(10, (float)currentGain / 10.0 / 20.0);
					double newGain = pow(10, (float)dayGain / 10.0 / 20.0);
					Log(2, "Using the last night exposure (%s),", length_in_units(currentExposure_us, true));
					currentExposure_us = (currentExposure_us * oldGain) / newGain;
					Log(2," old (%'f) and new (%'f) Gain to calculate new exposure of %s\n", oldGain, newGain, length_in_units(currentExposure_us, true));
				}

				currentMaxAutoexposure_us = dayMaxAutoexposure_ms * US_IN_MS;
				if (dayAutoExposure && currentExposure_us > currentMaxAutoexposure_us)
				{
					currentExposure_us = currentMaxAutoexposure_us;
				}
#ifdef USE_HISTOGRAM
				// Don't use camera auto-exposure since we mimic it ourselves.
				if (dayAutoExposure)
				{
					Log(2, "Turning off daytime auto-exposure to use histogram exposure.\n");
				}
				// With the histogram method we NEVER use auto exposure - either the user said
				// not to, or we turn it off ourselves.
				currentAutoExposure = false;
#else
				currentAutoExposure = dayAutoExposure;
#endif
				currentBrightness = dayBrightness;
				if (ASICameraInfo.IsColorCam)
				{
					currentAutoAWB = dayAutoAWB;
					currentWBR = dayWBR;
					currentWBB = dayWBB;
				}
				currentDelay_ms = dayDelay_ms;
				currentBin = dayBin;
				currentGain = dayGain;	// must come before determineGainChange() below
				currentMaxGain = dayMaxGain;
				if (currentAdjustGain)
				{
					// we did some nightime images so adjust gain
					numGainChanges = 0;
					gainChange = determineGainChange(dayGain, nightGain);
				}
				else
				{
					gainChange = 0;
				}
				currentAutoGain = dayAutoGain;
			}
		}

		else	// NIGHT
		{
			Log(0, "==========\n=== Starting nighttime capture ===\n==========\n");

			// We only skip initial frames if we are starting in nighttime and using auto-exposure.
			if (numExposures == 0 && nightAutoExposure)
				currentSkipFrames = nightSkipFrames;

			// Setup the night time capture parameters
			if (numExposures == 0 || ! nightAutoExposure)
			{
				if (nightAutoExposure && nightExposure_us > nightMaxAutoexposure_ms*US_IN_MS)
				{
					snprintf(bufTemp, sizeof(bufTemp), "%s", length_in_units(nightExposure_us, true));
					Log(0, "*** WARNING: nighttime Manual Exposure [%s] > Max Auto-Exposure [%s]; user smaller number.\n", bufTemp, length_in_units(nightMaxAutoexposure_ms*US_IN_MS, true));
					nightExposure_us = nightMaxAutoexposure_ms * US_IN_MS;
				}
				currentExposure_us = nightExposure_us;
			}

			currentAutoExposure = nightAutoExposure;
			currentBrightness = nightBrightness;
			if (ASICameraInfo.IsColorCam)
			{
				currentAutoAWB = nightAutoAWB;
				currentWBR = nightWBR;
				currentWBB = nightWBB;
			}
			currentDelay_ms = nightDelay_ms;
			currentBin = nightBin;
			currentMaxAutoexposure_us = nightMaxAutoexposure_ms * US_IN_MS;
			currentGain = nightGain;	// must come before determineGainChange() below
			currentMaxGain = nightMaxGain;
			if (currentAdjustGain)
			{
				// we did some daytime images so adjust gain
				numGainChanges = 0;
				gainChange = determineGainChange(dayGain, nightGain);
			}
			else
			{
				gainChange = 0;
			}
			currentAutoGain = nightAutoGain;
		}

		if (ASICameraInfo.IsColorCam)
		{
			setControl(CamNum, ASI_WB_R, currentWBR, currentAutoAWB ? ASI_TRUE : ASI_FALSE);
			setControl(CamNum, ASI_WB_B, currentWBB, currentAutoAWB ? ASI_TRUE : ASI_FALSE);
		}
		else if (! currentAutoAWB && ! takingDarkFrames)
		{
			// We only read the actual values if in auto white balance; since we're not, get them now.
			actualWBR = currentWBR;
			actualWBB = currentWBB;
		}

		setControl(CamNum, ASI_GAIN, currentGain + gainChange, currentAutoGain ? ASI_TRUE : ASI_FALSE);
		if (currentAutoGain)
			setControl(CamNum, ASI_AUTO_MAX_GAIN, currentMaxGain, ASI_FALSE);

		// never go over the camera's max auto exposure. ASI_AUTO_MAX_EXP is in ms so convert
		currentMaxAutoexposure_us = std::min(currentMaxAutoexposure_us, cameraMaxAutoexposure_us);
		if (currentAutoExposure)
		{
			setControl(CamNum, ASI_AUTO_MAX_EXP, currentMaxAutoexposure_us / US_IN_MS, ASI_FALSE);
			setControl(CamNum, ASI_AUTO_TARGET_BRIGHTNESS, currentBrightness, ASI_FALSE);
		}

#ifndef USE_HISTOGRAM
		setControl(CamNum, ASI_EXPOSURE, currentExposure_us, currentAutoExposure ? ASI_TRUE : ASI_FALSE);
		// If not using histogram algorithm, ASI_EXPOSURE is set in takeOneExposure()
#endif

		if (numExposures == 0 || dayBin != nightBin)
		{
			// Adjusting variables for chosen binning.
			// Only need to do at the beginning and if bin changes.
			height						= originalHeight / currentBin;
			width						= originalWidth / currentBin;
			iTextX						= originalITextX / currentBin;
			iTextY						= originalITextY / currentBin;
			fontsize					= originalFontsize / currentBin;
			linewidth					= originalLinewidth / currentBin;
			currentHistogramBoxSizeX	= histogramBoxSizeX / currentBin;
			currentHistogramBoxSizeY	= histogramBoxSizeY / currentBin;

			bufferSize = width * height * currentBpp;

// TODO: if not the first time, should we free the old pRgb?
			if (imageType == IMG_RAW16)
			{
				pRgb.create(cv::Size(width, height), CV_16UC1);
			}
			else if (imageType == IMG_RGB24)
			{
				pRgb.create(cv::Size(width, height), CV_8UC3);
			}
			else // RAW8 and Y8
			{
				pRgb.create(cv::Size(width, height), CV_8UC1);
			}

// TODO: ASISetStartPos(CamNum, from_left_xxx, from_top_xxx);	By default it's at the center.
// TODO: width % 8 must be 0. height % 2 must be 0.
// TODO: ASI120's (width*height) % 1024 must be 0
			asiRetCode = ASISetROIFormat(CamNum, width, height, currentBin, (ASI_IMG_TYPE)imageType);
			if (asiRetCode != ASI_SUCCESS)
			{
				if (asiRetCode == ASI_ERROR_INVALID_SIZE)
				{
					Log(0, "*** ERROR: your camera does not support bin %dx%d.\n", currentBin, currentBin);
					closeUp(EXIT_ERROR_STOP);
				}
				else
				{
					Log(0, "ASISetROIFormat(%d, %dx%d, %d, %d) = %s\n", CamNum, width, height, currentBin, imageType, getRetCode(asiRetCode));
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

		while (bMain && lastDayOrNight == dayOrNight)
		{
			// date/time is added to many log entries to make it easier to associate them
			// with an image (which has the date/time in the filename).
			timeval t = getTimeval();
			char exposureStart[128];
			char f[10] = "%F %T";
			sprintf(exposureStart, "%s", formatTime(t, f));
			Log(0, "STARTING EXPOSURE at: %s   @ %s\n", exposureStart, length_in_units(currentExposure_us, true));

			// Get start time for overlay. Make sure it has the same time as exposureStart.
			if (showTime)
			{
				sprintf(bufTime, "%s", formatTime(t, timeFormat));
			}

			asiRetCode = takeOneExposure(CamNum, currentExposure_us, pRgb.data, width, height, (ASI_IMG_TYPE) imageType, histogram, &mean);
			if (asiRetCode == ASI_SUCCESS)
			{
				numErrors = 0;
				numExposures++;

				focusMetric = showFocus ? (int)round(get_focus_metric(pRgb)) : -1;

				if (numExposures == 0 && preview)
				{
					// Start the preview thread at the last possible moment.
					bDisplay = true;
					pthread_create(&threadDisplay, NULL, Display, (void *)&pRgb);
				}

#ifdef USE_HISTOGRAM
				bool usedHistogram = false;	// did we use the histogram method?

				// We don't use this at night since the ZWO bug is only when it's light outside.
				if (dayOrNight == "DAY" && dayAutoExposure && ! takingDarkFrames)
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
					long histMinExposure_us = cameraMinExposure_us ? cameraMinExposure_us : 100;
					long tempMinExposure_us = histMinExposure_us;
					long tempMaxExposure_us = currentMaxAutoexposure_us;

					if (dayBrightness != DEFAULT_BRIGHTNESS)
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
							numMultiples = (float)(dayBrightness - DEFAULT_BRIGHTNESS) / DEFAULT_BRIGHTNESS;
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
						if (aggression != 100 && currentSkipFrames <= 0)
						{
							adjustment = priorMeanDiff * (1 - ((float)aggression/100));
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

					while ((mean < minAcceptableMean || mean > maxAcceptableMean) && ++attempts <= maxHistogramAttempts && currentExposure_us <= currentMaxAutoexposure_us)
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
						if (currentExposure_us != lastExposure_us)
							printf("xxxxxxxxxxx currentExposure_us %'ld != lastExposure_us %'ld\n", currentExposure_us, lastExposure_us);
						// if mean/acceptable is 9/90, it's 1/10th of the way there, so multiple exposure by 90/9 (10).
						// ZWO cameras don't appear to be linear so increase the multiplier amount some.
						float multiply = ((double)acceptable / mean) * multiplier;
						newExposure_us= lastExposure_us * multiply;
						printf("=== next exposure=%'ld (multiply by %.3f) [lastExposure_us=%'ld, %sAcceptable=%d, mean=%d]\n", newExposure_us, multiply, lastExposure_us, acceptableType, acceptable, mean);

						if (priorMeanDiff > 0 && lastMeanDiff < 0)
						{ 
printf(" >xxx mean was %d and went from %d above max of %d to %d below min of %d, is now at %d; should NOT set temp min to currentExposure_us of %'ld\n",
							priorMean, priorMeanDiff, maxAcceptableMean,
							-lastMeanDiff, minAcceptableMean, mean, currentExposure_us);
						} 
						else
						{
							if (priorMeanDiff < 0 && lastMeanDiff > 0)
							{
							// OK to set upper limit since we know it's too high.
printf(" >xxx mean was %d and went from %d below min of %d to %d above max of %d, is now at %d; OK to set temp max to currentExposure_us of %'ld\n",
								priorMean, -priorMeanDiff, minAcceptableMean,
								lastMeanDiff, maxAcceptableMean, mean, currentExposure_us);
							}

							if (mean < minAcceptableMean)
							{
								tempMinExposure_us = currentExposure_us;
							} 
							else if (mean > maxAcceptableMean)
							{
								tempMaxExposure_us = currentExposure_us;
							} 
						} 

						newExposure_us = roundTo(newExposure_us, roundToMe);
						newExposure_us = std::max(tempMinExposure_us, newExposure_us);
						newExposure_us = std::min(tempMaxExposure_us, newExposure_us);
						newExposure_us = std::min(currentMaxAutoexposure_us, newExposure_us);

						if (newExposure_us == currentExposure_us)
						{
							break;
						}

						currentExposure_us = newExposure_us;
						if (currentExposure_us > currentMaxAutoexposure_us)
						{
							break;
						}

						Log(3, "  >> Retry %i @ %'ld us, min=%'ld us, max=%'ld us: mean (%d)\n", attempts, newExposure_us, tempMinExposure_us, tempMaxExposure_us, mean);

						priorMean = mean;
						priorMeanDiff = lastMeanDiff;

						asiRetCode = takeOneExposure(CamNum, currentExposure_us, pRgb.data, width, height, (ASI_IMG_TYPE) imageType, histogram, &mean);
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
						Log(2,"  > Sleeping %s from failed exposure\n", length_in_units(currentDelay_ms * US_IN_MS, false));
						usleep(currentDelay_ms * US_IN_MS);
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
						 Log(3, "  > max attempts reached - using exposure of %s us with mean %d\n", length_in_units(currentExposure_us, true), mean);
					}
					else if (attempts >= 1)
					{
						if (currentExposure_us > currentMaxAutoexposure_us)
						{
							 // If we call length_in_units() twice in same command line they both return the last value.
							 char x[100];
							 snprintf(x, sizeof(x), "%s", length_in_units(currentExposure_us, false));
							 Log(3, "  > Stopped trying: new exposure of %s would be over max of %s\n", x, length_in_units(currentMaxAutoexposure_us, false));

							 long diff = (long)((float)currentExposure_us * (1/(float)percentChange));
							 currentExposure_us -= diff;
							 Log(3, "  > Decreasing next exposure by %d%% (%'ld us) to %'ld\n", percentChange, diff, currentExposure_us);
						}
						else if (currentExposure_us == currentMaxAutoexposure_us)
						{
							Log(3, "  > Stopped trying: hit max exposure limit of %s, mean %d\n", length_in_units(currentMaxAutoexposure_us, false), mean);
							// If currentExposure_us causes too high of a mean, decrease exposure
							// so on the next loop we'll adjust it.
							if (mean > maxAcceptableMean)
								currentExposure_us--;
						}
						else if (newExposure_us == currentExposure_us)
						{
							Log(3, "  > Stopped trying: newExposure_us == currentExposure_us == %s\n", length_in_units(currentExposure_us, false));
						}
						else
						{
							Log(3, "  > Stopped trying, using exposure of %s us with mean %d, min=%d, max=%d\n", length_in_units(currentExposure_us, false), mean, minAcceptableMean, maxAcceptableMean);
						}
						 
					}
					else if (currentExposure_us == currentMaxAutoexposure_us)
					{
						Log(3, "  > Did not make any additional attempts - at max exposure limit of %s, mean %d\n", length_in_units(currentMaxAutoexposure_us, false), mean);
					}
					// xxxx TODO: this was "actualExposure_us = ..."	reportedExposure_us = currentExposure_us;

				} else {
					// Didn't use histogram method.
					// If we used auto-exposure, set the next exposure to the last reported
					// exposure, which is what the camera driver thinks the next exposure should be.
					// But temper it by the aggression value so we don't bounce up and down.
					if (currentAutoExposure)
					{
						// If we're skipping frames we want to get to a good exposure as fast as
						// possible so don't set an adjustment.
						if (aggression != 100 && currentSkipFrames <= 0)
						{
							long exposureDiff_us, diff_us;
							diff_us = reportedExposure_us - currentExposure_us;
							exposureDiff_us = diff_us * (float)aggression / 100;
							if (exposureDiff_us != 0)
							{
								Log(4, "  > Next exposure full change is %s, ", length_in_units(diff_us, true));
								Log(4, "after aggression: %s ", length_in_units(exposureDiff_us, true));
								Log(4, "from %s ", length_in_units(currentExposure_us, true));
								currentExposure_us += exposureDiff_us;
								Log(4, "to %s\n", length_in_units(currentExposure_us, true));
							}
						}
						else
						{
							currentExposure_us = reportedExposure_us;
						}
					}
					else
					{
						// Didn't use auto-exposure - don't change exposure
					}
				}
#endif
				if (currentSkipFrames > 0)
				{
#ifdef USE_HISTOGRAM
					// If we're already at a good exposure, or the last exposure was longer
					// than the max, don't skip any more frames.
// xxx TODO: should we have a separate variable to define "too long" instead of currentMaxAutoexposure_us?
					if ((mean >= MINMEAN && mean <= MAXMEAN) || lastExposure_us > currentMaxAutoexposure_us)
					{
						currentSkipFrames = 0;
					}
					else
#endif
					{
						Log(2, "  >>>> Skipping this frame\n");
						currentSkipFrames--;
						// Do not save this frame or sleep after it.
						// We just started taking images so no need to check if DAY or NIGHT changed
						continue;
					}
				}

				// If takingDarkFrames is off, add overlay text to the image
				if (! takingDarkFrames)
				{
					int iYOffset = 0;

					iYOffset = doOverlay(pRgb,
						showTime, bufTime,
						showExposure, lastExposure_us, currentAutoExposure,
						showTemp, actualTemp, tempType,
 						showGain, actualGain, currentAutoGain, gainChange,
						showMean, mean,
						showBrightness, currentBrightness,
						showFocus, focusMetric,
						ImgText, ImgExtraText, extraFileAge,
						iTextX, iTextY, currentBin, width, iTextLineHeight,
						fontsize, linewidth, linetype[linenumber], fontname[fontnumber],
						fontcolor, smallFontcolor, outlinefont, imageType);
					iYOffset += 0;		// keeps compiler quiet about "not used" message

#ifdef USE_HISTOGRAM
					if (showHistogramBox && usedHistogram)
					{
						// Draw a rectangle where the histogram box is.
						// Put a black and white line one next to each other so they
						// can be seen in light and dark images.
						int lt = cv::LINE_AA, thickness = 2;
						int X1 = (width * histogramBoxPercentFromLeft) - (histogramBoxSizeX / 2);
						int X2 = X1 + histogramBoxSizeX;
						int Y1 = (height * histogramBoxPercentFromTop) - (histogramBoxSizeY / 2);
						int Y2 = Y1 + histogramBoxSizeY;
						cv::Scalar outerLine, innerLine;
						outerLine = cv::Scalar(0,0,0);
						innerLine = cv::Scalar(255,255,255);
						cv::rectangle(pRgb, cv::Point(X1, Y1), cv::Point(X2, Y2), outerLine, thickness, lt, 0);
						cv::rectangle(pRgb, cv::Point(X1+thickness, Y1+thickness), cv::Point(X2-thickness, Y2-thickness), innerLine, thickness, lt, 0);
					}
#endif

					if (currentAdjustGain)
					{
						// Determine if we need to change the gain on the next image.
						// This must come AFTER the "showGain" above.
						gainChange = determineGainChange(dayGain, nightGain);
						setControl(CamNum, ASI_GAIN, currentGain + gainChange, currentAutoGain ? ASI_TRUE : ASI_FALSE);
					}
				}

#ifndef USE_HISTOGRAM
				if (currentAutoExposure)
				{
					// Retrieve the current Exposure for smooth transition to night time
					// as long as auto-exposure is enabled during night time
					currentExposure_us = lastExposure_us;
				}
#endif

				// Save the image
				if (! bSavingImg)
				{
					if (! takingDarkFrames)
					{
						// Create the name of the file that goes in the images/<date> directory.
						snprintf(finalFileName, sizeof(finalFileName), "%s-%s.%s",
							fileNameOnly, formatTime(t, "%Y%m%d%H%M%S"), imagetype);
					}
					snprintf(fullFilename, sizeof(fullFilename), "%s/%s", saveDir, finalFileName);

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

				if (currentAutoExposure)
				{
#ifndef USE_HISTOGRAM

					if (dayOrNight == "DAY")
					{
						currentExposure_us = lastExposure_us;
					}
#endif

					// Delay applied before next exposure
					if (dayOrNight == "NIGHT" && nightAutoExposure && lastExposure_us < (nightMaxAutoexposure_ms * US_IN_MS) && ! takingDarkFrames)
					{
						// If using auto-exposure and the actual exposure is less than the max,
						// we still wait until we reach maxexposure, then wait for the delay period.
						// This is important for a constant frame rate during timelapse generation.
						// This doesn't apply during the day since we don't have a max time then.
						long s_us = (nightMaxAutoexposure_ms * US_IN_MS) - lastExposure_us; // to get to max
						s_us += currentDelay_ms * US_IN_MS;		// Add standard delay amount
						Log(0, "  > Sleeping: %s\n", length_in_units(s_us, false));
						usleep(s_us);	// usleep() is in us (microseconds)
					}
					else
					{
						// Sleep even if taking dark frames so the sensor can cool between shots like it would
						// do on a normal night. With no delay the sensor may get hotter than it would at night.
						Log(0, "  > Sleeping %s from %s exposure\n", length_in_units(currentDelay_ms * US_IN_MS, false), takingDarkFrames ? "dark frame" : "auto");
						usleep(currentDelay_ms * US_IN_MS);
					}
				}
				else
				{
					std::string s;
					if (takingDarkFrames)
						s = "dark frame";
					else
						s = "manual";
#ifdef USE_HISTOGRAM
					if (usedHistogram)
						s = "histogram";
#endif
					Log(0, "  > Sleeping %s from %s exposure\n", length_in_units(currentDelay_ms * US_IN_MS, false), s.c_str());
					usleep(currentDelay_ms * US_IN_MS);
				}
				dayOrNight = calculateDayOrNight(latitude, longitude, angle);
			}
		}
		if (lastDayOrNight == "NIGHT")
		{
			endOfNight = true;
		}
	}

	closeUp(exitCode);
}
