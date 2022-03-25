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

#define USE_HISTOGRAM		// use the histogram code as a workaround to ZWO's bug

// Forward definitions
char *getRetCode(ASI_ERROR_CODE);
void closeUp(int);
bool check_max_errors(int *, int);

//-------------------------------------------------------------------------------------------------------
//-------------------------------------------------------------------------------------------------------

cv::Mat pRgb;
std::vector<int> compression_parameters;
// In version 0.8 we introduced a different way to take exposures. Instead of turning video mode on at
// the beginning of the program and off at the end (which kept the camera running all the time, heating it up),
// version 0.8 turned video mode on, then took a picture, then turned it off. This helps cool the camera,
// but some users (seems hit or miss) get ASI_ERROR_TIMEOUTs when taking exposures.
// So, we added the ability for them to use the 0.7 video-always-on method, or the 0.8 "new exposure" method.
bool use_new_exposure_algorithm = true;
bool bMain = true, bDisplay = false;
std::string dayOrNight;

bool bSaveRun = false, bSavingImg = false;
pthread_mutex_t mtx_SaveImg;
pthread_cond_t cond_StartSave;

// These are global so they can be used by other routines.
ASI_CONTROL_CAPS ControlCaps;
int numErrors					= 0;				// Number of errors in a row.
int maxErrors					= 5;				// Max number of errors in a row before we exit
bool gotSignal					= false;			// did we get a SIGINT (from keyboard) or SIGTERM (from service)?
int iNumOfCtrl					= 0;
int CamNum						= 0;
pthread_t thread_display		= 0;
pthread_t hthdSave				= 0;
int numExposures				= 0;				// how many valid pictures have we taken so far?
int currentGain					= NOT_SET;
long camera_max_autoexposure_us	= NOT_SET;			// camera's max auto-exposure
long camera_min_exposure_us		= 100;				// camera's minimum exposure
long current_exposure_us		= NOT_SET;
long actualTemp					= 0;				// actual sensor temp, per the camera
long last_exposure_us			= 0;				// last exposure taken
bool taking_dark_frames			= false;
int flip						= 0;
int current_bpp					= NOT_SET;			// bytes per pixel: 8, 16, or 24
int current_bit_depth			= NOT_SET;			// 8 or 16
int currentBin					= NOT_SET;
int currentBrightness			= NOT_SET;

// Some command-line and other option definitions needed outside of main():
bool tty						= false;			// are we on a tty?
bool notificationImages			= DEFAULT_NOTIFICATIONIMAGES;
char const *save_dir			= DEFAULT_SAVEDIR;
char const *fileName			= DEFAULT_FILENAME;
char final_file_name[200];							// final name of the file that's written to disk, with no directories
char full_filename[1000];							// full name of file written to disk
char const *timeFormat			= DEFAULT_TIMEFORMAT;

#define DEFAULT_DAYEXPOSURE		500					// microseconds - good starting point for daytime exposures
long dayExposure_us				= DEFAULT_DAYEXPOSURE;
#define DEFAULT_DAYMAXAUTOEXPOSURE_MS (60 * MS_IN_SEC)	// 60 seconds
int dayMaxAutoexposure_ms		= DEFAULT_DAYMAXAUTOEXPOSURE_MS;
#define DEFAULT_DAYAUTOEXPOSURE	true
bool dayAutoExposure			= DEFAULT_DAYAUTOEXPOSURE;	// is it on or off for daylight?
#define DEFAULT_DAYDELAY		(5 * MS_IN_SEC)		// 5 seconds
int dayDelay_ms					= DEFAULT_DAYDELAY;	// Delay in milliseconds.
#define DEFAULT_NIGHTDELAY		(10 * MS_IN_SEC)	// 10 seconds
int nightDelay_ms				= DEFAULT_NIGHTDELAY;	// Delay in milliseconds.
#define DEFAULT_NIGHTMAXAUTOEXPOSURE_MS (20 * MS_IN_SEC)	// 20 seconds
int nightMaxAutoexposure_ms		= DEFAULT_NIGHTMAXAUTOEXPOSURE_MS;
long currentMaxAutoexposure_us	= NOT_SET;

#define DEFAULT_GAIN_TRANSITION_TIME 5				// user specifies minutes
int gainTransitionTime			= DEFAULT_GAIN_TRANSITION_TIME;
bool currentAutoExposure		= false;			// is auto-exposure currently on or off?
bool currentAutoGain			= false;			// is auto-gain currently on or off?
#define DEFAULT_AUTOAWB			false
bool autoAWB					= DEFAULT_AUTOAWB;	// is Auto White Balance on or off?
#define DEFAULT_WBR				65
int WBR							= DEFAULT_WBR;
#define DEFAULT_WBB				85
int WBB							= DEFAULT_WBB;

#ifdef USE_HISTOGRAM
#define DEFAULT_BOX_SIZEX		500					// Must be a multiple of 2
#define DEFAULT_BOX_SIZEY		500					// Must be a multiple of 2
int current_histogramBoxSizeX =	NOT_SET;
int current_histogramBoxSizeY =	NOT_SET;
#define DEFAULT_BOX_FROM_LEFT	0.5
#define DEFAULT_BOX_FROM_TOP	0.5
// % from left/top side that the center of the box is. 0.5 == the center of the image's X/Y axis
float histogramBoxPercentFromLeft = DEFAULT_BOX_FROM_LEFT;
float histogramBoxPercentFromTop = DEFAULT_BOX_FROM_TOP;
#endif	// USE_HISTOGRAM
int mean						= NOT_SET;			// histogram mean

// Make sure we don't try to update a non-updateable control, and check for errors.
ASI_ERROR_CODE setControl(int CamNum, ASI_CONTROL_TYPE control, long value, ASI_BOOL makeAuto)
{
	ASI_ERROR_CODE ret = ASI_SUCCESS;
	int i;
	for (i = 0; i < iNumOfCtrl && i <= control; i++)	// controls are sorted 1 to n
	{
		ret = ASIGetControlCaps(CamNum, i, &ControlCaps);
		if (ret != ASI_SUCCESS)
		{
			Log(0, "WARNING: ASIGetControlCaps() for control %d failed: %s\n", i, getRetCode(ret));
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
				ret = ASISetControlValue(CamNum, control, value, makeAuto);
				if (ret != ASI_SUCCESS)
				{
					Log(0, "WARNING: ASISetControlCaps() for control %d, value=%ld failed: %s\n", control, value, getRetCode(ret));
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
		pthread_mutex_lock(&mtx_SaveImg);
		pthread_cond_wait(&cond_StartSave, &mtx_SaveImg);

		if (gotSignal)
		{
			// we got a signal to exit, so don't save the (probably incomplete) image
			pthread_mutex_unlock(&mtx_SaveImg);
			break;
		}

		bSavingImg = true;

		int64 st, et;

		bool result = false;
		if (pRgb.data)
		{
			char cmd[1100];
			Log(1, "  > Saving %s image '%s'\n", taking_dark_frames ? "dark" : dayOrNight.c_str(), final_file_name);
			snprintf(cmd, sizeof(cmd), "scripts/saveImage.sh %s '%s'", dayOrNight.c_str(), full_filename);
			// -1 for no focusMetric
			float gainDB = pow(10, (float)currentGain / 10.0 / 20.0);
			add_variables_to_command(cmd, last_exposure_us, currentBrightness, mean,
				currentAutoExposure, currentAutoGain, autoAWB, WBR, WBB,
				actualTemp, gainDB, currentGain,
				currentBin, flip, current_bit_depth, -1);
			strcat(cmd, " &");

			st = cv::getTickCount();
			try
			{
				result = imwrite(full_filename, pRgb, compression_parameters);
			}
			catch (const cv::Exception& ex)
			{
				printf("*** ERROR: Exception saving image: %s\n", ex.what());
			}
			et = cv::getTickCount();

			if (result)
				system(cmd);
			else
				printf("*** ERROR: Unable to save image '%s'.\n", full_filename);

		} else {
			// This can happen if the program is closed before the first picture.
			Log(2, "----- SaveImgThd(): pRgb.data is null\n");
		}
		bSavingImg = false;

		if (result)
		{
			static int total_saves = 0;
			static double total_time_ms = 0;
			total_saves++;
			double diff = time_diff_us(st, et) * US_IN_MS;	// we want ms
			total_time_ms += diff;
			char const *x;
			if (diff > 1 * MS_IN_SEC)
				x = "  > *****\n";	// indicate when it takes a REALLY long time to save
			else
				x = "";
			Log(4, "%s  > Image took %'.1f ms to save (average %'.1f ms).\n%s", x, diff, total_time_ms / total_saves, x);
		}

		pthread_mutex_unlock(&mtx_SaveImg);
	}

	return (void *)0;
}

// Display ASI errors in human-readable format
char *getRetCode(ASI_ERROR_CODE code)
{
	static char retCodeBuffer[100];
	static int error_timeout_cntr = 0;
	std::string ret;

	if (code == ASI_SUCCESS) ret = "ASI_SUCCESS";
	else if (code == ASI_ERROR_INVALID_INDEX) ret = "ASI_ERROR_INVALID_INDEX";
	else if (code == ASI_ERROR_INVALID_ID) ret = "ASI_ERROR_INVALID_ID";
	else if (code == ASI_ERROR_INVALID_CONTROL_TYPE) ret = "ASI_ERROR_INVALID_CONTROL_TYPE";
	else if (code == ASI_ERROR_CAMERA_CLOSED) ret = "ASI_ERROR_CAMERA_CLOSED";
	else if (code == ASI_ERROR_CAMERA_REMOVED) ret = "ASI_ERROR_CAMERA_REMOVED";
	else if (code == ASI_ERROR_INVALID_PATH) ret = "ASI_ERROR_INVALID_PATH";
	else if (code == ASI_ERROR_INVALID_FILEFORMAT) ret = "ASI_ERROR_INVALID_FILEFORMAT";
	else if (code == ASI_ERROR_INVALID_SIZE) ret = "ASI_ERROR_INVALID_SIZE";
	else if (code == ASI_ERROR_INVALID_IMGTYPE) ret = "ASI_ERROR_INVALID_IMGTYPE";
	else if (code == ASI_ERROR_OUTOF_BOUNDARY) ret = "ASI_ERROR_OUTOF_BOUNDARY";
	else if (code == ASI_ERROR_TIMEOUT)
	{
		// To aid in debugging these errors, keep track of how many we see.
		error_timeout_cntr += 1;
		ret = "ASI_ERROR_TIMEOUT #" + std::to_string(error_timeout_cntr) +
			  " (with 0.8 exposure = " + ((use_new_exposure_algorithm)?("YES"):("NO")) + ")";
	}
	else if (code == ASI_ERROR_INVALID_SEQUENCE) ret = "ASI_ERROR_INVALID_SEQUENCE";
	else if (code == ASI_ERROR_BUFFER_TOO_SMALL) ret = "ASI_ERROR_BUFFER_TOO_SMALL";
	else if (code == ASI_ERROR_VIDEO_MODE_ACTIVE) ret = "ASI_ERROR_VIDEO_MODE_ACTIVE";
	else if (code == ASI_ERROR_EXPOSURE_IN_PROGRESS) ret = "ASI_ERROR_EXPOSURE_IN_PROGRESS";
	else if (code == ASI_ERROR_GENERAL_ERROR) ret = "ASI_ERROR_GENERAL_ERROR";
	else if (code == ASI_ERROR_END) ret = "ASI_ERROR_END";
	else if (code == -1) ret = "Non-ASI ERROR";
	else ret = "UNKNOWN ASI ERROR";

	sprintf(retCodeBuffer, "%s (%d)", ret.c_str(), (int) code);
	return(retCodeBuffer);
}

char *getCameraMode(ASI_CAMERA_MODE mode)
{
	static char retModeBuffer[100];
	std::string ret;

	if (mode == ASI_MODE_NORMAL) ret = "NORMAL";
	else if (mode == ASI_MODE_TRIG_SOFT_EDGE) ret = "TRIG_SOFT_EDGE";
	else if (mode == ASI_MODE_TRIG_RISE_EDGE) ret = "TRIG_RISE_EDGE";
	else if (mode == ASI_MODE_TRIG_FALL_EDGE) ret = "TRIG_FALL_EDGE";
	else if (mode == ASI_MODE_TRIG_SOFT_LEVEL) ret = "TRIG_SOFT_LEVEL";
	else if (mode == ASI_MODE_TRIG_HIGH_LEVEL) ret = "TRIG_HIGH_LEVEL";
	else if (mode == ASI_MODE_TRIG_LOW_LEVEL) ret = "TRIG_LOW_LEVEL";
	else if (mode == ASI_MODE_END) ret = "End of list";
	else ret = "UNKNOWN MODE";

	sprintf(retModeBuffer, "%s (%d)", ret.c_str(), (int) mode);
	return(retModeBuffer);
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

int computeHistogram(unsigned char *imageBuffer, int width, int height, ASI_IMG_TYPE imageType, int *histogram)
{
	int h, i;
	unsigned char *buf = imageBuffer;

	// Clear the histogram array.
	for (h = 0; h < 256; h++) {
		histogram[h] = 0;
	}

	// Different image types have a different number of bytes per pixel.
	width *= current_bpp;
	int roiX1 = (width * histogramBoxPercentFromLeft) - (current_histogramBoxSizeX * current_bpp / 2);
	int roiX2 = roiX1 + (current_bpp * current_histogramBoxSizeX);
	int roiY1 = (height * histogramBoxPercentFromTop) - (current_histogramBoxSizeY / 2);
	int roiY2 = roiY1 + current_histogramBoxSizeY;

	// Start off and end on a logical pixel boundries.
	roiX1 = (roiX1 / current_bpp) * current_bpp;
	roiX2 = (roiX2 / current_bpp) * current_bpp;

	// For RGB24, data for each pixel is stored in 3 consecutive bytes: blue, green, red.
	// For all image types, each row in the image contains one row of pixels.
	// current_bpp doesn't apply to rows, just columns.
	switch (imageType) {
	case IMG_RGB24:
	case IMG_RAW8:
	case IMG_Y8:
		for (int y = roiY1; y < roiY2; y++) {
			for (int x = roiX1; x < roiX2; x+=current_bpp) {
				i = (width * y) + x;
				int total = 0;
				for (int z = 0; z < current_bpp; z++)
				{
					// For RGB24 this averages the blue, green, and red pixels.
					total += buf[i+z];
				}
				int avg = total / current_bpp;
				histogram[avg]++;
			}
		}
		break;
	case IMG_RAW16:
		for (int y = roiY1; y < roiY2; y++) {
			for (int x = roiX1; x < roiX2; x+=current_bpp) {
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
static void flush_buffered_image(int cameraId, void *buf, size_t size)
{
	enum { NUM_IMAGE_BUFFERS = 2 };

	int num_cleared;
	for (num_cleared = 0; num_cleared < NUM_IMAGE_BUFFERS; num_cleared++)
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
	if (num_cleared > 0)
	{
		Log(3, "  > [Cleared %d buffer frame%s]\n", num_cleared, num_cleared > 1 ? "s" : "");
	}
}


long reported_exposure_us = 0;	// exposure reported by the camera, either actual exposure or suggested next one
long actualGain = 0;			// actual gain used, per the camera
ASI_BOOL bAuto = ASI_FALSE;		// "auto" flag returned by ASIGetControlValue, when we don't care what it is

ASI_BOOL wasAutoExposure = ASI_FALSE;
long bufferSize = NOT_SET;

ASI_ERROR_CODE takeOneExposure(
		int cameraId,
		long exposure_time_us,
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
	long timeout = ((exposure_time_us * 2) / US_IN_MS) + 5000;	// timeout is in ms

	if (currentAutoExposure && exposure_time_us > currentMaxAutoexposure_us)
	{
		// If we call length_in_units() twice in same command line they both return the last value.
		char x[100];
		snprintf(x, sizeof(x), "%s", length_in_units(exposure_time_us, true));
		Log(0, "*** WARNING: exposure_time_us requested [%s] > currentMaxAutoexposure_us [%s]\n", x, length_in_units(currentMaxAutoexposure_us, true));
		exposure_time_us = currentMaxAutoexposure_us;
	}

	// This debug message isn't typcally needed since we already displayed a message about
	// starting a new exposure, and below we display the result when the exposure is done.
	Log(4, "  > %s to %s, timeout: %'ld ms\n",
		wasAutoExposure == ASI_TRUE ? "Camera set auto-exposure" : "Exposure set",
		length_in_units(exposure_time_us, true), timeout);

	setControl(cameraId, ASI_EXPOSURE, exposure_time_us, currentAutoExposure ? ASI_TRUE :ASI_FALSE);

	flush_buffered_image(cameraId, imageBuffer, bufferSize);

	if (use_new_exposure_algorithm)
	{
		status = ASIStartVideoCapture(cameraId);
	} else {
		status = ASI_SUCCESS;
	}

	if (status == ASI_SUCCESS) {
		// Make sure the actual time to take the picture is "close" to the requested time.
		timeval tStart = getTimeval();
		status = ASIGetVideoData(cameraId, imageBuffer, bufferSize, timeout);
		if (status != ASI_SUCCESS)
		{
			int exitCode;
			Log(0, "  > ERROR: Failed getting image: %s\n", getRetCode(status));

			// Check if we reached the maximum number of consective errors
			if (! check_max_errors(&exitCode, maxErrors))
			{
				closeUp(exitCode);
			}
		}
		else
		{
			// There is too much variance in the overhead of taking a picture to accurately
			// determine the time to take an image at short exposures, so only check for longer ones.
			if (exposure_time_us > (5 * US_IN_SEC))
			{
		 		timeval tEnd = getTimeval();
				// After testing there seems to be about 450,000 us overhead, so subtract it.
				long timeToTakeImage_us = timeval_diff_us(tStart, tEnd) - 450000;
Log(4, "xxxxxxx exposure_time_us=%'ld, estimated timeToTakeImage_us=%'ld\n", exposure_time_us, timeToTakeImage_us);
				long diff_us = timeToTakeImage_us - exposure_time_us;
				long threshold_us = exposure_time_us * 0.5;
				if (abs(diff_us) > threshold_us) {
					Log(1, "*** WARNING: time to take image (%'ld) differs from requested exposure time (%'ld) by %'ld, threshold=%'ld\n", timeToTakeImage_us, exposure_time_us, diff_us, threshold_us);
				}
			}

			numErrors = 0;
			debug_text[0] = '\0';
#ifdef USE_HISTOGRAM
			if (histogram != NULL && mean != NULL)
			{
				*mean = computeHistogram(imageBuffer, width, height, imageType, histogram);
				sprintf(debug_text, " @ mean %d", *mean);
			}
#endif
			last_exposure_us = exposure_time_us;
			// Per ZWO, when in manual-exposure mode, the returned exposure length should always
			// be equal to the requested length; in fact, "there's no need to call ASIGetControlValue()".
			// When in auto-exposure mode, the returned exposure length is what the driver thinks the
			// next exposure should be, and will eventually converge on the correct exposure.
			ASIGetControlValue(cameraId, ASI_EXPOSURE, &reported_exposure_us, &wasAutoExposure);
			Log(3, "  > Got image%s.  Reported exposure: %s, auto=%s\n", debug_text, length_in_units(reported_exposure_us, true), wasAutoExposure == ASI_TRUE ? "yes" : "no");

			// If this was a manual exposure, make sure it took the correct exposure.
			// Per ZWO, this should never happen.
			if (wasAutoExposure == ASI_FALSE && exposure_time_us != reported_exposure_us)
			{
				Log(0, "  > WARNING: not correct exposure (requested: %'ld us, reported: %'ld us, diff: %'ld)\n", exposure_time_us, reported_exposure_us, reported_exposure_us - exposure_time_us);
			}
			ASIGetControlValue(cameraId, ASI_GAIN, &actualGain, &bAuto);
			ASIGetControlValue(cameraId, ASI_TEMPERATURE, &actualTemp, &bAuto);
		}

		if (use_new_exposure_algorithm)
			ASIStopVideoCapture(cameraId);

	}
	else {
		Log(0, "  > ERROR: Not fetching exposure data because status is %s\n", getRetCode(status));
	}

	return status;
}

// Exit the program gracefully.
void closeUp(int e)
{
	static bool closingUp = false;		// indicates if we're in the process of exiting.
	// For whatever reason, we're sometimes called twice, but we should only execute once.
	if (closingUp) return;

	closingUp = true;

	ASIStopVideoCapture(CamNum);

	// Seems to hang on ASICloseCamera() if taking a picture when the signal is sent,
	// until the exposure finishes, then it never returns so the remaining code doesn't
	// get executed. Don't know a way around that, so don't bother closing the camera.
	// Prior versions of allsky didn't do any cleanup, so it should be ok not to close the camera.
	//	ASICloseCamera(CamNum);

	// Close the optional display window.
	if (bDisplay)
	{
		bDisplay = false;
		void *retval;
		pthread_join(thread_display, &retval);
	}

	const char *a = "Stopping";
	if (notificationImages) {
		if (e == EXIT_RESTARTING)
		{
			system("scripts/copy_notification_image.sh --expires 15 Restarting &");
			a = "Restarting";
		}
		else
		{
			system("scripts/copy_notification_image.sh --expires 2 NotRunning &");
		}
		// Sleep to give it a chance to print any messages so they (hopefully) get printed
		// before the one below. This is only so it looks nicer in the log file.
		sleep(3);
	}

	printf("     ***** %s AllSky *****\n", a);
	exit(e);
}

void sig(int i)
{
	printf("XXXXXX == got %s %d in sig()\n", i == SIGUSR1 ? "SIGUSR1" : i == SIGHUP ? "SIGHUP" : "unknown signal", i);
	gotSignal = true;
	closeUp(EXIT_RESTARTING);
}
void IntHandle(int i)
{
	gotSignal = true;
	closeUp(EXIT_OK);
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
	Log(4, "xxx resetGainTransitionVariables(%d, %d) called at %s\n", dayGain, nightGain, dayOrNight.c_str());

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
		Log(4, "xxx totalTimeInSec=%.1fs, dayExposure_us=%'ldus , daydelay_ms=%'dms\n", totalTimeInSec, dayExposure_us, dayDelay_ms);
	}
	else	// NIGHT
	{
		// At nightime if the exposure is less than the max, we wait until max has expired,
		// so use it instead of the exposure time.
		totalTimeInSec = (nightMaxAutoexposure_ms / MS_IN_SEC) + (nightDelay_ms / MS_IN_SEC);
		Log(4, "xxx totalTimeInSec=%.1fs, nightMaxAutoexposure_ms=%'dms, nightDelay_ms=%'dms\n", totalTimeInSec, nightMaxAutoexposure_ms, nightDelay_ms);
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

	Log(4, "xxx gainTransitionImages=%d, gainTransitionTime=%ds, perImageAdjustGain=%d, totalAdjustGain=%d\n",
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
bool check_max_errors(int *e, int max_errors)
{
	// Once takeOneExposure() fails with a timeout, it seems to always fail,
	// even with extremely large timeout values, so apparently ASI_ERROR_TIMEOUT doesn't
	// necessarily mean it's timing out. Exit which will cause us to be restarted.
	numErrors++; sleep(2);
	if (numErrors >= max_errors)
	{
		*e = EXIT_RESET_USB;		// exit code. Need to reset USB bus
		Log(0, "*** ERROR: Maximum number of consecutive errors of %d reached; exiting...\n", max_errors);
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
	signal(SIGHUP, sig);		// xxxxxxxxxx Reload the service
	signal(SIGUSR1, sig);		// xxxxxxxxxx Reload the service

	pthread_mutex_init(&mtx_SaveImg, 0);
	pthread_cond_init(&cond_StartSave, 0);

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
	ASI_ERROR_CODE asiRetCode;			// used for return code from ASI functions.

	// Some settings have both day and night versions, some have only one version that applies to both,
	// and some have either a day OR night version but not both.
	// For settings with both versions we keep a "current" variable (e.g., "currentBin") that's either the day
	// or night version so the code doesn't always have to check if it's day or night.
	// The settings have either "day" or "night" in the name.
	// In theory, almost every setting could have both day and night versions (e.g., width & height),
	// but the chances of someone wanting different versions.

	// #define the defaults so we can use the same value in the help message.

	const char *locale			= DEFAULT_LOCALE;
	// All the font settings apply to both day and night.
	int fontnumber				= DEFAULT_FONTNUMBER;
	int iTextX					= DEFAULT_ITEXTX;
	int iTextY					= DEFAULT_ITEXTY;
	int iTextLineHeight			= DEFAULT_ITEXTLINEHEIGHT;
	char const *ImgText			= "";
	char const *ImgExtraText	= "";
	int extraFileAge			= 0;	// 0 disables it
#define DEFAULT_FONTSIZE		7
	double fontsize				= DEFAULT_FONTSIZE;
#define SMALLFONTSIZE_MULTIPLIER 0.08
	int linewidth				= DEFAULT_LINEWIDTH;
	int outlinefont				= DEFAULT_OUTLINEFONT;
	int fontcolor[3]			= { 255, 0, 0 };
	int smallFontcolor[3]		= { 0, 0, 255 };
	int linetype[3]				= { cv::LINE_AA, 8, 4 };
	int linenumber				= DEFAULT_LINENUMBER;

	int width					= DEFAULT_WIDTH;	int originalWidth  = width;
	int height					= DEFAULT_HEIGHT;	int originalHeight = height;

#define DEFAULT_DAYBIN			1		// binning during the day probably isn't too useful...
#define DEFAULT_NIGHTBIN		1
	int dayBin					= DEFAULT_DAYBIN;
	int nightBin				= DEFAULT_NIGHTBIN;

#define DEFAULT_IMAGE_TYPE		AUTO_IMAGE_TYPE
	int Image_type				= DEFAULT_IMAGE_TYPE;

#define DEFAULT_ASIBANDWIDTH	40
	int asiBandwidth			= DEFAULT_ASIBANDWIDTH;
	bool asiAutoBandwidth		= false;						// is Auto Bandwidth on or off?

	// There is no max day autoexposure since daylight exposures are always pretty short.
#define DEFAULT_NIGHTEXPOSURE	(5 * US_IN_SEC)					// 5 seconds
	long nightExposure_us = DEFAULT_NIGHTEXPOSURE;
#define DEFAULT_NIGHTAUTOEXPOSURE true
	bool nightAutoExposure		= DEFAULT_NIGHTAUTOEXPOSURE;	// is it on or off for nighttime?
	// currentAutoExposure is global so is defined outside of main()

// Maximum number of auto-exposure frames to skip when starting the program.
// This helps eliminate overly bright or dark images before the auto-exposure algorith kicks in.
// At night, don't use too big a number otherwise it takes a long time to get the first frame.
#define DEFAULT_DAYSKIPFRAMES	5
	int day_skip_frames			= DEFAULT_DAYSKIPFRAMES;
#define DEFAULT_NIGHTSKIPFRAMES	1
	int night_skip_frames		= DEFAULT_NIGHTSKIPFRAMES;
	int current_skip_frames		= NOT_SET;

#define DEFAULT_DAYGAIN			false
	bool dayGain				= DEFAULT_DAYGAIN;
	bool dayAutoGain			= false;						// is Auto Gain on or off for daytime?
#define DEFAULT_NIGHTGAIN		150
	int nightGain				= DEFAULT_NIGHTGAIN;
#define DEFAULT_NIGHTAUTOGAIN	false
	bool nightAutoGain			= DEFAULT_NIGHTAUTOGAIN;		// is Auto Gain on or off for nighttime?
#define DEFAULT_NIGHTMAXGAIN	200
	int nightMaxGain			= DEFAULT_NIGHTMAXGAIN;

	int currentDelay_ms			= NOT_SET;

#define DEFAULT_GAMMA			50								// not supported by all cameras
	int gamma				 	= DEFAULT_GAMMA;

#define DEFAULT_BRIGHTNESS		50
	int dayBrightness			= DEFAULT_BRIGHTNESS;
	int nightBrightness			= DEFAULT_BRIGHTNESS;

	char const *latitude		= DEFAULT_LATITUDE;
	char const *longitude		= DEFAULT_LONGITUDE;
	// angle of the sun with the horizon
	// (0=sunset, -6=civil twilight, -12=nautical twilight, -18=astronomical twilight)
	char const *angle			= DEFAULT_ANGLE;

	bool preview				= false;
	bool showTime				= DEFAULT_SHOWTIME;
	char const *tempType		= "C";							// Celsius

	bool showTemp				= false;
	bool showExposure			= false;
	bool showGain				= false;
	bool showBrightness			= false;
#ifdef USE_HISTOGRAM
	bool showMean				= false;
	int maxHistogramAttempts	= 15;	// max number of times we'll try for a better histogram mean
	bool showHistogramBox		= false;
	int histogramBoxSizeX		= DEFAULT_BOX_SIZEX;
	int histogramBoxSizeY		= DEFAULT_BOX_SIZEY;
#define DEFAULT_AGGRESSION		75
	int aggression				= DEFAULT_AGGRESSION; // ala PHD2. Percent of change made, 1 - 100.

	// If we just transitioned from night to day, it's possible current_exposure_us will
	// be MUCH greater than the daytime max (and will possibly be at the nighttime's max exposure).
	// So, decrease current_exposure_us by a certain amount of the difference between the two so
	// it takes several frames to reach the daytime max (which is now in currentMaxAutoexposure_us).

	// If we don't do this, we'll be stuck in a loop taking an exposure
	// that's over the max forever.

	// Note that it's likely getting lighter outside with every exposure
	// so the mean will eventually get into the valid range.
#define DEFAULT_PERCENTCHANGE	10.0	// percent of ORIGINAL difference
	const int percent_change	= DEFAULT_PERCENTCHANGE;
#endif

	bool daytimeCapture			= DEFAULT_DAYTIMECAPTURE;	// are we capturing daytime pictures?

	bool help					= false;
	int quality					= NOT_SET;
	bool coolerEnabled		 	= false;
	long targetTemp				= 0;

	//-------------------------------------------------------------------------------------------------------
	//-------------------------------------------------------------------------------------------------------
	setlinebuf(stdout);				// Line buffer output so entries appear in the log immediately.
	if (setlocale(LC_NUMERIC, locale) == NULL)
		printf("*** WARNING: Could not set locale to %s ***\n", locale);

	printf("\n%s", c(KGRN));
	printf("**********************************************\n");
	printf("*** Allsky Camera Software v0.8.3.3 |  2022 ***\n");
	printf("**********************************************\n\n");
	printf("Capture images of the sky with a Raspberry Pi and an ASI Camera\n");
	printf("%s\n", c(KNRM));
	printf("%sAdd -h or --help for available options%s\n\n", c(KYEL), c(KNRM));
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

	if (argc > 1)
	{
		// Many of the argument names changed to allow day and night values.
		// However, still check for the old names in case the user didn't update their settings.json file.
		// The old names should be removed below in a future version.
		for (i=1 ; i <= argc - 1 ; i++)
		{
			if (strcmp(argv[i], "-h") == 0 || strcmp(argv[i], "--help") == 0)
			{
				help = true;
			}
			else if (strcmp(argv[i], "-save_dir") == 0)
			{
				save_dir = argv[++i];
			}
			else if (strcmp(argv[i], "-newexposure") == 0)
			{
				use_new_exposure_algorithm = getBoolean(argv[++i]);
			}
			else if (strcmp(argv[i], "-locale") == 0)
			{
				locale = argv[++i];
			}
			else if (strcmp(argv[i], "-dayskipframes") == 0)
			{
				day_skip_frames = atoi(argv[++i]);
			}
			else if (strcmp(argv[i], "-nightskipframes") == 0)
			{
				night_skip_frames = atoi(argv[++i]);
			}
			else if (strcmp(argv[i], "-tty") == 0)	// overrides what was automatically determined
			{
				tty = getBoolean(argv[++i]);
			}
			else if (strcmp(argv[i], "-width") == 0)
			{
				width = atoi(argv[++i]);
			}
			else if (strcmp(argv[i], "-height") == 0)
			{
				height = atoi(argv[++i]);
			}
			else if (strcmp(argv[i], "-type") == 0)
			{
				Image_type = atoi(argv[++i]);
			}
			else if (strcmp(argv[i], "-quality") == 0)
			{
				quality = atoi(argv[++i]);
			}
			else if (strcmp(argv[i], "-dayexposure") == 0)
			{
				dayExposure_us = atof(argv[++i]) * US_IN_MS;	// allow fractions
			}
			else if (strcmp(argv[i], "-nightexposure") == 0)
			{
				nightExposure_us = atof(argv[++i]) * US_IN_MS;
			}
			else if (strcmp(argv[i], "-dayautoexposure") == 0)
			{
				dayAutoExposure = getBoolean(argv[++i]);
			}
			else if (strcmp(argv[i], "-nightautoexposure") == 0)
			{
				nightAutoExposure = getBoolean(argv[++i]);
			}
			else if (strcmp(argv[i], "-daymaxexposure") == 0)
			{
				dayMaxAutoexposure_ms = atoi(argv[++i]);
			}
			else if (strcmp(argv[i], "-nightmaxexposure") == 0)
			{
				nightMaxAutoexposure_ms = atoi(argv[++i]);
			}
			else if (strcmp(argv[i], "-nightgain") == 0)
			{
				nightGain = atoi(argv[++i]);
			}
			else if (strcmp(argv[i], "-nightmaxgain") == 0)
			{
				nightMaxGain = atoi(argv[++i]);
			}
			else if (strcmp(argv[i], "-nightautogain") == 0)
			{
				nightAutoGain = getBoolean(argv[++i]);
			}
			else if (strcmp(argv[i], "-gaintransitiontime") == 0)
			{
				// user specifies minutes but we want seconds.
				gainTransitionTime = atoi(argv[++i]) * 60;
			}
			else if (strcmp(argv[i], "-gamma") == 0)
			{
				gamma = atoi(argv[++i]);
			}
			else if (strcmp(argv[i], "-daybrightness") == 0)
			{
				dayBrightness = atoi(argv[++i]);
			}
			else if (strcmp(argv[i], "-nightbrightness") == 0)
			{
				nightBrightness = atoi(argv[++i]);
			}
			else if (strcmp(argv[i], "-daybin") == 0)
			{
				dayBin = atoi(argv[++i]);
			}
			else if (strcmp(argv[i], "-nightbin") == 0)
			{
				nightBin = atoi(argv[++i]);
			}
			else if (strcmp(argv[i], "-daydelay") == 0)
			{
				dayDelay_ms = atoi(argv[++i]);
			}
			else if (strcmp(argv[i], "-nightdelay") == 0)
			{
				nightDelay_ms = atoi(argv[++i]);
			}
			else if (strcmp(argv[i], "-wbr") == 0)
			{
				WBR = atoi(argv[++i]);
			}
			else if (strcmp(argv[i], "-wbb") == 0)
			{
				WBB = atoi(argv[++i]);
			}
			else if (strcmp(argv[i], "-awb") == 0 || strcmp(argv[i], "-autowhitebalance") == 0)
			{
				autoAWB = getBoolean(argv[++i]);
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
				extraFileAge = atoi(argv[++i]);
			}
			else if (strcmp(argv[i], "-textlineheight") == 0)
			{
				iTextLineHeight = atoi(argv[++i]);
			}
			else if (strcmp(argv[i], "-textx") == 0)
			{
				iTextX = atoi(argv[++i]);
			}
			else if (strcmp(argv[i], "-texty") == 0)
			{
				iTextY = atoi(argv[++i]);
			}
			else if (strcmp(argv[i], "-fontname") == 0)
			{
				fontnumber = atoi(argv[++i]);
			}
			else if (strcmp(argv[i], "-fontcolor") == 0)
			{
				if (sscanf(argv[++i], "%d %d %d", &fontcolor[0], &fontcolor[1], &fontcolor[2]) != 3)
					fprintf(stderr, "%s*** ERROR: Not enough font color parameters: '%s'%s\n", c(KRED), argv[i], c(KNRM));
			}
			else if (strcmp(argv[i], "-smallfontcolor") == 0)
			{
				if (sscanf(argv[++i], "%d %d %d", &smallFontcolor[0], &smallFontcolor[1], &smallFontcolor[2]) != 3)
					fprintf(stderr, "%s*** ERROR: Not enough small font color parameters: '%s'%s\n", c(KRED), argv[i], c(KNRM));
			}
			else if (strcmp(argv[i], "-fonttype") == 0)
			{
				linenumber = atoi(argv[++i]);
			}
			else if (strcmp(argv[i], "-fontsize") == 0)
			{
				fontsize = atof(argv[++i]);
			}
			else if (strcmp(argv[i], "-fontline") == 0)
			{
				linewidth = atoi(argv[++i]);
			}
			else if (strcmp(argv[i], "-outlinefont") == 0)
			{
				outlinefont = getBoolean(argv[++i]);
			}
			else if (strcmp(argv[i], "-flip") == 0)
			{
				flip = atoi(argv[++i]);
			}
			else if (strcmp(argv[i], "-usb") == 0)
			{
				asiBandwidth = atoi(argv[++i]);
			}
			else if (strcmp(argv[i], "-autousb") == 0)
			{
				asiAutoBandwidth = getBoolean(argv[++i]);
			}
			else if (strcmp(argv[i], "-filename") == 0)
			{
				fileName = argv[++i];
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
			else if (strcmp(argv[i], "-notificationimages") == 0)
			{
				notificationImages = getBoolean(argv[++i]);
			}
#ifdef USE_HISTOGRAM
			else if (strcmp(argv[i], "-histogrambox") == 0)
			{
				if (sscanf(argv[++i], "%d %d %f %f", &histogramBoxSizeX, &histogramBoxSizeY, &histogramBoxPercentFromLeft, &histogramBoxPercentFromTop) != 4)
					fprintf(stderr, "%s*** ERROR: Not enough histogram box parameters: '%s'%s\n", c(KRED), argv[i], c(KNRM));

				// scale user-input 0-100 to 0.0-1.0
				histogramBoxPercentFromLeft /= 100;
				histogramBoxPercentFromTop /= 100;
			}
			else if (strcmp(argv[i], "-showhistogrambox") == 0)
			{
				showHistogramBox = getBoolean(argv[++i]);
			}
			else if (strcmp(argv[i], "-aggression") == 0)
			{
				aggression = atoi(argv[++i]);
				if (aggression < 1)
				{
					fprintf(stderr, "Aggression must be between 1 and 100; setting to 1.\n");
				}
				else if (aggression > 100)
				{
					fprintf(stderr, "Aggression must be between 1 and 100; setting to 100.\n");
				}
			}
#endif
			else if (strcmp(argv[i], "-preview") == 0)
			{
				preview = getBoolean(argv[++i]);
			}
			else if (strcmp(argv[i], "-debuglevel") == 0)
			{
				debugLevel = atoi(argv[++i]);
			}
			else if (strcmp(argv[i], "-showTime") == 0)
			{
				showTime = getBoolean(argv[++i]);
			}
			else if (strcmp(argv[i], "-timeformat") == 0)
			{
				timeFormat = argv[++i];
			}
			else if (strcmp(argv[i], "-darkframe") == 0)
			{
				taking_dark_frames = getBoolean(argv[++i]);
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
#ifdef USE_HISTOGRAM
			else if (strcmp(argv[i], "-showMean") == 0 || strcmp(argv[i], "-showHistogram") == 0)
			{
				showMean = getBoolean(argv[++i]);
			}
#endif
			else if (strcmp(argv[i], "-daytime") == 0)
			{
				daytimeCapture = getBoolean(argv[++i]);
			}
			else if (strcmp(argv[i], "-coolerEnabled") == 0)
			{
				coolerEnabled = getBoolean(argv[++i]);
			}
			else if (strcmp(argv[i], "-targetTemp") == 0)
			{
				targetTemp = atol(argv[++i]);
			}
		}
	}

	if (help)
	{
		printf("%sUsage:\n", c(KRED));
		printf(" ./capture -width 640 -height 480 -nightexposure 5000000 -gamma 50 -type 1 -nightbin 1 -filename Lake-Laberge.PNG\n\n");
		printf("%s", c(KNRM));

		printf("%sAvailable Arguments:\n", c(KYEL));
		printf(" -width					- Default = %d = Camera Max Width\n", DEFAULT_WIDTH);
		printf(" -height				- Default = %d = Camera Max Height\n", DEFAULT_HEIGHT);
		printf(" -daytime				- Default = %s: 1 enables capture daytime images\n", yesNo(DEFAULT_DAYTIMECAPTURE));
		printf(" -dayexposure			- Default = %'d: Daytime exposure in us (equals to %.4f sec)\n", DEFAULT_DAYEXPOSURE, (float)DEFAULT_DAYEXPOSURE/US_IN_SEC);
		printf(" -nightexposure			- Default = %'d: Nighttime exposure in us (equals to %.4f sec)\n", DEFAULT_NIGHTEXPOSURE, (float)DEFAULT_NIGHTEXPOSURE/US_IN_SEC);
		printf(" -dayautoexposure		- Default = %s: 1 enables daytime auto-exposure\n", yesNo(DEFAULT_DAYAUTOEXPOSURE));
		printf(" -nightautoexposure		- Default = %s: 1 enables nighttime auto-exposure\n", yesNo(DEFAULT_NIGHTAUTOEXPOSURE));
		printf(" -daymaxexposure		- Default = %'d: Maximum daytime auto-exposure in ms (equals to %.1f sec)\n", DEFAULT_DAYMAXAUTOEXPOSURE_MS, (float)DEFAULT_DAYMAXAUTOEXPOSURE_MS/US_IN_MS);
		printf(" -nightmaxexposure		- Default = %'d: Maximum nighttime auto-exposure in ms (equals to %.1f sec)\n", DEFAULT_NIGHTMAXAUTOEXPOSURE_MS, (float)DEFAULT_NIGHTMAXAUTOEXPOSURE_MS/US_IN_MS);
		printf(" -daybrightness			- Default = %d: Daytime brightness level\n", DEFAULT_BRIGHTNESS);
		printf(" -nightbrightness		- Default = %d: Nighttime brightness level\n", DEFAULT_BRIGHTNESS);
		printf(" -nightgain				- Default = %d: Nighttime gain\n", DEFAULT_NIGHTGAIN);
		printf(" -nightmaxgain			- Default = %d: Nighttime maximum auto gain\n", DEFAULT_NIGHTMAXGAIN);
		printf(" -nightautogain			- Default = %s: 1 enables nighttime auto gain\n", yesNo(DEFAULT_NIGHTAUTOGAIN));
		printf(" -gaintransitiontime	- Default = %'d: Seconds to transition gain from day-to-night or night-to-day.  0 disable it.\n", DEFAULT_GAIN_TRANSITION_TIME);
		printf(" -dayskipframes			- Default = %d: Number of auto-exposure daytime frames to skip when starting software.\n", DEFAULT_DAYSKIPFRAMES);
		printf(" -nightskipframes		- Default = %d: Number of auto-exposure nighttime frames to skip when starting software.\n", DEFAULT_NIGHTSKIPFRAMES);

		printf(" -coolerEnabled			- 1 enables cooler (cooled cameras only)\n");
		printf(" -targetTemp			- Target temperature in degrees C (cooled cameras only)\n");
		printf(" -gamma					- Default = %d: Gamma level\n", DEFAULT_GAMMA);
		printf(" -wbr					- Default = %d: Manual White Balance Red\n", DEFAULT_WBR);
		printf(" -wbb					- Default = %d: Manual White Balance Blue\n", DEFAULT_WBB);
		printf(" -autowhitebalance		- Default = %s: 1 enables auto White Balance\n", yesNo(DEFAULT_AUTOAWB));
		printf(" -daybin				- Default = %d: 1 = binning OFF (1x1), 2 = 2x2 binning, 4 = 4x4 binning\n", DEFAULT_DAYBIN);
		printf(" -nightbin				- Default = %d: same as daybin but for night\n", DEFAULT_NIGHTBIN);
		printf(" -dayDelay				- Default = %'d: Delay between daytime images in milliseconds - 5000 = 5 sec.\n", DEFAULT_DAYDELAY);
		printf(" -nightDelay			- Default = %'d: Delay between nighttime images in milliseconds - %d = 1 sec.\n", DEFAULT_NIGHTDELAY, MS_IN_SEC);
		printf(" -type = Image Type		- Default = %d: 99 = auto,  0 = RAW8,  1 = RGB24,  2 = RAW16,  3 = Y8\n", DEFAULT_IMAGE_TYPE);
		printf(" -quality				- Default PNG=3, JPG=95, Values: PNG=0-9, JPG=0-100\n");
		printf(" -usb = USB Speed		- Default = %d: Values between 40-100, This is BandwidthOverload\n", DEFAULT_ASIBANDWIDTH);
		printf(" -autousb				- Default = false: 1 enables auto USB Speed\n");
		printf(" -filename				- Default = %s\n", DEFAULT_FILENAME);
		printf(" -save_dir				- Default = %s: where to save 'filename'\n", DEFAULT_SAVEDIR);
		printf(" -flip					- Default = 0: 0 = No flip, 1 = Horizontal, 2 = Vertical, 3 = Both\n");
		printf("\n");
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
		printf("\n");
		printf(" -latitude				- Default = %7s: Latitude of the camera.\n", DEFAULT_LATITUDE);
		printf(" -longitude				- Default = %7s: Longitude of the camera\n", DEFAULT_LONGITUDE);
		printf(" -angle					- Default = %s: Angle of the sun below the horizon.\n", DEFAULT_ANGLE);
		printf("		-6=civil twilight   -12=nautical twilight   -18=astronomical twilight\n");
		printf("\n");
		printf(" -locale				- Default = %s: Your locale - to determine thousands separator and decimal point.\n", DEFAULT_LOCALE);
		printf("						  Type 'locale' at a command prompt to determine yours.\n");
		printf(" -notificationimages	- 1 enables notification images, for example, 'Camera is off during day'.\n");
#ifdef USE_HISTOGRAM
		printf(" -histogrambox			- Default = %d %d %0.2f %0.2f (box width X, box width y, X offset percent (0-100), Y offset (0-100))\n", DEFAULT_BOX_SIZEX, DEFAULT_BOX_SIZEY, DEFAULT_BOX_FROM_LEFT * 100, DEFAULT_BOX_FROM_TOP * 100);
		printf(" -showhistogrambox		- 1 displays an outline of the histogram box on the image overlay.\n");
		printf("						  Useful to determine what parameters to use with -histogrambox.\n");
		printf(" -aggression			- Default = %d%%: Percent of exposure change to make, similar to PHD2.\n", DEFAULT_AGGRESSION);
#endif
		printf(" -darkframe				- 1 disables the overlay and takes dark frames instead\n");
		printf(" -preview				- 1 previews the captured images. Only works with a Desktop Environment\n");
		printf(" -time					- 1 displays the time. Combine with Text X and Text Y for placement\n");
		printf(" -timeformat			- Format the optional time is displayed in; default is '%s'\n", DEFAULT_TIMEFORMAT);
		printf(" -showTemp				- 1 displays the camera sensor temperature\n");
		printf(" -temptype				- Units to display temperature in: 'C'elsius, 'F'ahrenheit, or 'B'oth.\n");
		printf(" -showExposure			- 1 displays the exposure length\n");
		printf(" -showGain				- 1 display the gain\n");
		printf(" -showBrightness		- 1 displays the brightness\n");
#ifdef USE_HISTOGRAM
		printf(" -showMean				- 1 displays the histogram mean\n");
#endif
		printf(" -debuglevel			- Default = 0. Set to 1,2, 3, or 4 for more debugging information.\n");

		printf("%s", c(KNRM));
		closeUp(EXIT_OK);
	}

	const char *imagetype = "";
	const char *ext = checkForValidExtension(fileName, Image_type);
	if (ext == NULL)
	{
		// checkForValidExtension() displayed the error message.
		closeUp(EXIT_ERROR_STOP);
	}
	if (strcasecmp(ext, "jpg") == 0 || strcasecmp(ext, "jpeg") == 0)
	{
		imagetype = "jpg";
		compression_parameters.push_back(cv::IMWRITE_JPEG_QUALITY);
		// want dark frames to be at highest quality
		if (quality > 100 || taking_dark_frames)
		{
			quality = 100;
		}
		else if (quality == NOT_SET)
		{
			quality = 95;
		}
	}
	else if (strcasecmp(ext, "png") == 0)
	{
		imagetype = "png";
		compression_parameters.push_back(cv::IMWRITE_PNG_COMPRESSION);
		// png is lossless so "quality" is really just the amount of compression.
		if (quality > 9 || taking_dark_frames)
		{
			quality = 9;
		}
		else if (quality == NOT_SET)
		{
			quality = 3;
		}
	}
	compression_parameters.push_back(quality);

	// Get just the name of the file, without any directories or the extension.
	char fileNameOnly[50] = { 0 };
	if (taking_dark_frames)
	{
		// To avoid overwriting the optional notification image with the dark image,
		// during dark frames we use a different file name.
		static char darkFilename[20];
		sprintf(darkFilename, "dark.%s", imagetype);
		fileName = darkFilename;
		strncat(final_file_name, fileName, sizeof(final_file_name)-1);
	}
	else
	{
		const char *slash = strrchr(fileName, '/');
		if (slash == NULL)
			strncat(fileNameOnly, fileName, sizeof(fileNameOnly)-1);
		else
			strncat(fileNameOnly, slash + 1, sizeof(fileNameOnly)-1);
		char *dot = strrchr(fileNameOnly, '.');	// we know there's an extension
		*dot = '\0';
	}

	int numDevices = ASIGetNumOfConnectedCameras();
	if (numDevices <= 0)
	{
		printf("*** ERROR: No Connected Camera...\n");
		// Don't wait here since it's possible the camera is physically connected
		// but the software doesn't see it and the USB bus needs to be reset.
		closeUp(EXIT_ERROR_STOP);		// If there are no cameras we can't do anything.
	}

	ASI_CAMERA_INFO ASICameraInfo;
	if (numDevices > 1)
	{
		printf("\nAttached Cameras%s:\n", numDevices == 1 ? "" : " (using first one)");
		for (i = 0; i < numDevices; i++)
		{
			ASIGetCameraProperty(&ASICameraInfo, i);
			printf("  - %d %s\n", i, ASICameraInfo.Name);
		}
	}
	ASIGetCameraProperty(&ASICameraInfo, 0);	// want info on 1st camera

	asiRetCode = ASIOpenCamera(CamNum);
	if (asiRetCode != ASI_SUCCESS)
	{
		printf("*** ERROR opening camera, check that you have root permissions! (%s)\n", getRetCode(asiRetCode));
		closeUp(EXIT_ERROR_STOP);				// Can't do anything so might as well exit.
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
	originalWidth = width;
	originalHeight = height;

#ifdef USE_HISTOGRAM
	int centerX, centerY;
	int left_of_box, right_of_box;
	int top_of_box, bottom_of_box;

	// The histogram box needs to fit on the image.
	// If we're binning we'll decrease the size of the box accordingly.
	bool ok = true;
	if (histogramBoxSizeX < 1 || histogramBoxSizeY < 1)
	{
		fprintf(stderr, "%s*** ERROR: Histogram box size must be > 0; you entered X=%d, Y=%d%s\n",
			c(KRED), histogramBoxSizeX, histogramBoxSizeY, c(KNRM));
		ok = false;
	}
	if (isnan(histogramBoxPercentFromLeft) || isnan(histogramBoxPercentFromTop) || 
		histogramBoxPercentFromLeft < 0.0 || histogramBoxPercentFromTop < 0.0)
	{
		fprintf(stderr, "%s*** ERROR: Bad values for histogram percents; you entered X=%.0f%%, Y=%.0f%%%s\n",
			c(KRED), (histogramBoxPercentFromLeft*100.0), (histogramBoxPercentFromTop*100.0), c(KNRM));
		ok = false;
		centerX = centerY = 0;		// keeps compiler quiet
		left_of_box = right_of_box = top_of_box = bottom_of_box = 0;	// keeps compiler quiet
	}
	else
	{
		centerX = width * histogramBoxPercentFromLeft;
		centerY = height * histogramBoxPercentFromTop;
		left_of_box = centerX - (histogramBoxSizeX / 2);
		right_of_box = centerX + (histogramBoxSizeX / 2);
		top_of_box = centerY - (histogramBoxSizeY / 2);
		bottom_of_box = centerY + (histogramBoxSizeY / 2);

		if (left_of_box < 0 || right_of_box >= width || top_of_box < 0 || bottom_of_box >= height)
		{
			fprintf(stderr, "%s*** ERROR: Histogram box location must fit on image; upper left of box is %dx%d, lower right %dx%d%s\n", c(KRED), left_of_box, top_of_box, right_of_box, bottom_of_box, c(KNRM));
			ok = false;
		}
	}

	if (! ok)
		closeUp(EXIT_ERROR_STOP);	// force the user to fix it
#endif

	printf("\n%s Information:\n", ASICameraInfo.Name);
	printf("  - Native Resolution: %dx%d\n", iMaxWidth, iMaxHeight);
	printf("  - Pixel Size: %1.1fmicrons\n", pixelSize);
	printf("  - Supported Bins: ");
	for (int i = 0; i < 16; ++i)
	{
		if (ASICameraInfo.SupportedBins[i] == 0)
		{
			break;
		}
		printf("%d ", ASICameraInfo.SupportedBins[i]);
	}
	printf("\n");

	if (ASICameraInfo.IsColorCam)
	{
		printf("  - Color Camera: bayer pattern: %s\n", bayer[ASICameraInfo.BayerPattern]);
	}
	else
	{
		printf("  - Mono camera\n");
	}
	if (ASICameraInfo.IsCoolerCam)
	{
		printf("  - Camera with cooling capabilities\n");
	}

	printf("\n");
	ASI_ID cameraID;	// USB 3 cameras only
	if (ASICameraInfo.IsUSB3Camera == ASI_TRUE && ASIGetID(CamNum, &cameraID) == ASI_SUCCESS)
	{
		printf("  - Camera ID: ");
		if (cameraID.id[0] == '\0')
		{
			printf("[none]");
		} else {
			for (unsigned int i=0; i<sizeof(cameraID.id); i++) printf("%c", cameraID.id[i]);
		}
		printf("\n");
	}
	// To clear the camera ID:
		// cameraID.id[0] = '\0';
		// ASISetID(CamNum, cameraID);
	ASI_SN serialNumber;
	asiRetCode = ASIGetSerialNumber(CamNum, &serialNumber);
	if (asiRetCode != ASI_SUCCESS)
	{
		if (asiRetCode == ASI_ERROR_GENERAL_ERROR)
			printf("Camera does not support serialNumber\n");
		else
			printf("*** WARNING: unable to get serialNumber (%s)\n", getRetCode(asiRetCode));
	}
	else
	{
		printf("  - Camera Serial Number: ");
		if (serialNumber.id[0] == '\0')
		{
			printf("[none]");
		} else {
			for (unsigned int i=0; i<sizeof(serialNumber.id); i++) printf("%02x", serialNumber.id[i]);
		}
		printf("\n");
	}

	ASIGetControlValue(CamNum, ASI_TEMPERATURE, &actualTemp, &bAuto);
	printf("- Sensor temperature: %0.2f\n", (float)actualTemp / 10.0);

	ASI_CAMERA_MODE CamMode;
	asiRetCode = ASIGetCameraMode(CamNum, &CamMode);
	if (asiRetCode != ASI_SUCCESS)
	{
		printf("*** ERROR getting camera mode (%s)\n", getRetCode(asiRetCode));
		closeUp(EXIT_ERROR_STOP);	// Can't do anything so might as well exit.
	}
	printf("  - Current camera mode: %s\n", getCameraMode(CamMode));

	asiRetCode = ASIInitCamera(CamNum);
	if (asiRetCode != ASI_SUCCESS)
	{
		printf("*** ERROR: Unable to initialise camera: %s\n", getRetCode(asiRetCode));
		closeUp(EXIT_ERROR_STOP);	// Can't do anything so might as well exit.
	}

	// Get a few values from the camera that we need elsewhere.
	ASIGetNumOfControls(CamNum, &iNumOfCtrl);
	if (debugLevel >= 4)
		printf("Control Caps:\n");
	for (i = 0; i < iNumOfCtrl; i++)
	{
		ASIGetControlCaps(CamNum, i, &ControlCaps);
		switch (ControlCaps.ControlType) {
		case ASI_EXPOSURE:
			camera_min_exposure_us = ControlCaps.MinValue;
			break;
#ifdef USE_HISTOGRAM
		case ASI_AUTO_MAX_EXP:
			// Keep track of the camera's max auto-exposure so we don't try to exceed it.
			// MaxValue is in MS so convert to microseconds
			camera_max_autoexposure_us = ControlCaps.MaxValue * US_IN_MS;
			break;
		default:	// needed to keep compiler quiet
			break;
#endif
		}
		if (debugLevel >= 4)
		{
			printf("- %s:\n", ControlCaps.Name);
			printf("   - Description = %s\n", ControlCaps.Description);
			printf("   - MinValue = %'ld\n", ControlCaps.MinValue);
			printf("   - MaxValue = %'ld\n", ControlCaps.MaxValue);
			printf("   - DefaultValue = %'ld\n", ControlCaps.DefaultValue);
			printf("   - IsAutoSupported = %d\n", ControlCaps.IsAutoSupported);
			printf("   - IsWritable = %d\n", ControlCaps.IsWritable);
			printf("   - ControlType = %d\n", ControlCaps.ControlType);
		}
	}

	if (dayExposure_us < camera_min_exposure_us)
	{
	 	fprintf(stderr, "*** WARNING: daytime exposure %'ld us less than camera minimum of %'ld us; setting to minimum\n", dayExposure_us, camera_min_exposure_us);
	 	dayExposure_us = camera_min_exposure_us;
	}
	else if (dayAutoExposure && dayExposure_us > camera_max_autoexposure_us)
	{
	 	fprintf(stderr, "*** WARNING: daytime exposure %'ld us greater than camera maximum of %'ld us; setting to maximum\n", dayExposure_us, camera_max_autoexposure_us);
	 	dayExposure_us = camera_max_autoexposure_us;
	}
	if (nightExposure_us < camera_min_exposure_us)
	{
	 	fprintf(stderr, "*** WARNING: nighttime exposure %'ld us less than camera minimum of %'ld us; setting to minimum\n", nightExposure_us, camera_min_exposure_us);
	 	nightExposure_us = camera_min_exposure_us;
	}
	else if (nightAutoExposure && nightExposure_us > camera_max_autoexposure_us)
	{
	 	fprintf(stderr, "*** WARNING: nighttime exposure %'ld us greater than camera maximum of %'ld us; setting to maximum\n", nightExposure_us, camera_max_autoexposure_us);
	 	nightExposure_us = camera_max_autoexposure_us;
	}

	if (debugLevel >= 4)
	{
		printf("Supported video formats:\n");
		for (i = 0; i < 8; i++)
		{
			ASI_IMG_TYPE it = ASICameraInfo.SupportedVideoFormat[i];
			if (it == ASI_IMG_END)
			{
				break;
			}
			printf("   - %s\n",
				it == ASI_IMG_RAW8 ?  "ASI_IMG_RAW8" :
				it == ASI_IMG_RGB24 ?  "ASI_IMG_RGB24" :
				it == ASI_IMG_RAW16 ?  "ASI_IMG_RAW16" :
				it == ASI_IMG_Y8 ?  "ASI_IMG_Y8" :
				"unknown video format");
		}
	}

	if (debugLevel >= 4)
	{
		ASI_SUPPORTED_MODE CamSupportedModes;
		asiRetCode = ASIGetCameraSupportMode(CamNum, &CamSupportedModes);
		if (asiRetCode != ASI_SUCCESS)
		{
			printf("*** WARNING: unable to get camera supported modes (%s)\n", getRetCode(asiRetCode));
		}
		else
		{
			printf("Supported modes:\n");
			for (int i = 0; i < 16; ++i)
			{
				if (CamSupportedModes.SupportedCameraMode[i] == ASI_MODE_END)
				{
					break;
				}
				printf("   - %s ", getCameraMode(CamSupportedModes.SupportedCameraMode[i]));
			}
			printf("\n");
		}
	}

	// Handle "auto" Image_type.
	if (Image_type == AUTO_IMAGE_TYPE)
	{
		// If it's a color camera, create color pictures.
		// If it's a mono camera use RAW16 if the image file is a .png, otherwise use RAW8.
		// There is no good way to handle Y8 automatically so it has to be set manually.
		if (ASICameraInfo.IsColorCam)
			Image_type = IMG_RGB24;
		else if (strcmp(imagetype, "png") == 0)
			Image_type = IMG_RAW16;
		else // jpg
			Image_type = IMG_RAW8;
	}

	const char *sType;		// displayed in output
	if (Image_type == IMG_RAW16)
	{
		sType = "RAW16";
		current_bpp = 2;
		current_bit_depth = 16;
	}
	else if (Image_type == IMG_RGB24)
	{
		sType = "RGB24";
		current_bpp = 3;
		current_bit_depth = 8;
	}
	else if (Image_type == IMG_RAW8)
	{
		// Color cameras should use Y8 instead of RAW8. Y8 is the mono mode for color cameras.
		if (ASICameraInfo.IsColorCam)
		{
			Image_type = IMG_Y8;
			sType = "Y8 (not RAW8 for color cameras)";
		}
		else
		{
			sType = "RAW8";
		}
		current_bpp = 1;
		current_bit_depth = 8;
	}
	else if (Image_type == IMG_Y8)
	{
		sType = "Y8";
		current_bpp = 1;
		current_bit_depth = 8;
	}
	else
	{
		sType = "unknown";		// keeps compiler quiet
		Log(0, "*** ERROR: Unknown Image Type: %d\n", Image_type);
		closeUp(EXIT_ERROR_STOP);
	}

	//-------------------------------------------------------------------------------------------------------
	//-------------------------------------------------------------------------------------------------------

	printf("%s", c(KGRN));
	printf("\nCapture Settings:\n");
	printf(" Image Type: %s\n", sType);
	printf(" Resolution (before any binning): %dx%d\n", width, height);
	printf(" Quality: %d\n", quality);
	printf(" Daytime capture: %s\n", yesNo(daytimeCapture));
	printf(" Exposure (day): %'1.3fms, Auto: %s\n", (float)dayExposure_us / US_IN_MS, yesNo(dayAutoExposure));
	printf(" Exposure (night): %'1.0fms, Auto: %s\n", round(nightExposure_us / US_IN_MS), yesNo(nightAutoExposure));
	printf(" Max Auto-Exposure (day): %'dms (%'.1fs)\n", dayMaxAutoexposure_ms, (float)dayMaxAutoexposure_ms / MS_IN_SEC);
	printf(" Max Auto-Exposure (night): %'dms (%'.1fs)\n", nightMaxAutoexposure_ms, (float)nightMaxAutoexposure_ms / MS_IN_SEC);

	printf(" Delay (day): %'dms\n", dayDelay_ms);
	printf(" Delay (night): %'dms\n", nightDelay_ms);
	printf(" Gain (night only): %d, Auto: %s, max: %d\n", nightGain, yesNo(nightAutoGain), nightMaxGain);
	printf(" Gain Transition Time: %.1f minutes\n", (float) gainTransitionTime/60);
	printf(" Brightness (day): %d\n", dayBrightness);
	printf(" Brightness (night): %d\n", nightBrightness);
	printf(" Skip Frames (day): %d\n", day_skip_frames);
	printf(" Skip Frames (night): %d\n", night_skip_frames);
	printf(" Aggression: %d%%\n", aggression);

	if (ASICameraInfo.IsCoolerCam)
	{
		printf(" Cooler Enabled: %s", yesNo(coolerEnabled));
		if (coolerEnabled) printf(", Target Temperature: %ld C\n", targetTemp);
		printf("\n");
	}
	printf(" Gamma: %d\n", gamma);
	if (ASICameraInfo.IsColorCam)
	{
		printf(" WB Red: %d, Blue: %d, Auto: %s\n", WBR, WBB, yesNo(autoAWB));
	}
	printf(" Binning (day): %d\n", dayBin);
	printf(" Binning (night): %d\n", nightBin);
	printf(" USB Speed: %d, auto: %s\n", asiBandwidth, yesNo(asiAutoBandwidth));

	printf(" Text Overlay: %s\n", ImgText[0] == '\0' ? "[none]" : ImgText);
	printf(" Text Extra File: %s, Age: %d seconds\n", ImgExtraText[0] == '\0' ? "[none]" : ImgExtraText, extraFileAge);
	printf(" Text Line Height %dpx\n", iTextLineHeight);
	printf(" Text Position: %dpx from left, %dpx from top\n", iTextX, iTextY);
	printf(" Font Name: %s (%d)\n", fontnames[fontnumber], fontname[fontnumber]);
	printf(" Font Color: %d, %d, %d\n", fontcolor[0], fontcolor[1], fontcolor[2]);
	printf(" Small Font Color: %d, %d, %d\n", smallFontcolor[0], smallFontcolor[1], smallFontcolor[2]);
	printf(" Font Line Type: %d\n", linetype[linenumber]);
	printf(" Font Size: %1.1f\n", fontsize);
	printf(" Font Line Width: %d\n", linewidth);
	printf(" Outline Font : %s\n", yesNo(outlinefont));

	printf(" Flip Image: %d\n", flip);
	printf(" Filename: %s\n", fileName);
	printf(" Filename Save Directory: %s\n", save_dir);
	printf(" Latitude: %s, Longitude: %s\n", latitude, longitude);
	printf(" Sun Elevation: %s\n", angle);
	printf(" Locale: %s\n", locale);
	printf(" Notification Images: %s\n", yesNo(notificationImages));
#ifdef USE_HISTOGRAM
	printf(" Histogram Box: %d %d %0.0f %0.0f, center: %dx%d, upper left: %dx%d, lower right: %dx%d\n",
		histogramBoxSizeX, histogramBoxSizeY,
		histogramBoxPercentFromLeft * 100, histogramBoxPercentFromTop * 100,
		centerX, centerY, left_of_box, top_of_box, right_of_box, bottom_of_box);
	printf(" Show Histogram Box: %s\n", yesNo(showHistogramBox));
	printf(" Show Histogram Mean: %s\n", yesNo(showMean));
#endif
	printf(" Show Time: %s (format: %s)\n", yesNo(showTime), timeFormat);
	printf(" Show Temperature: %s, type: %s\n", yesNo(showTemp), tempType);
	printf(" Show Exposure: %s\n", yesNo(showExposure));
	printf(" Show Gain: %s\n", yesNo(showGain));
	printf(" Show Brightness: %s\n", yesNo(showBrightness));
	printf(" Preview: %s\n", yesNo(preview));
	printf(" Taking Dark Frames: %s\n", yesNo(taking_dark_frames));
	printf(" Debug Level: %d\n", debugLevel);
	printf(" On TTY: %s\n", yesNo(tty));
	printf(" Video OFF Between Images: %s\n", yesNo(use_new_exposure_algorithm));
	printf(" ZWO SDK version %s\n", ASIGetSDKVersion());
	printf("%s\n", c(KNRM));

	//-------------------------------------------------------------------------------------------------------
	//-------------------------------------------------------------------------------------------------------
	// These configurations apply to both day and night.
	// Other calls to setControl() are done after we know if we're in daytime or nighttime.
	setControl(CamNum, ASI_BANDWIDTHOVERLOAD, asiBandwidth, asiAutoBandwidth ? ASI_TRUE : ASI_FALSE);
	setControl(CamNum, ASI_HIGH_SPEED_MODE, 0, ASI_FALSE);	// ZWO sets this in their program
	if (ASICameraInfo.IsColorCam)
	{
		setControl(CamNum, ASI_WB_R, WBR, autoAWB ? ASI_TRUE : ASI_FALSE);
		setControl(CamNum, ASI_WB_B, WBB, autoAWB ? ASI_TRUE : ASI_FALSE);
	}
	setControl(CamNum, ASI_GAMMA, gamma, ASI_FALSE);
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
	if (dayAutoGain || nightAutoGain || gainTransitionTime == 0 || dayGain == nightGain || taking_dark_frames)
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
		Log(1, "Extra Text File Age Disabled So Displaying Anyway\n");
	}

	if (tty)
		printf("*** Press Ctrl+C to stop ***\n\n");
	else
		printf("*** Stop the allsky service to end this process. ***\n\n");


	// Start taking pictures

	if (! use_new_exposure_algorithm)
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
		// Find out if it is currently DAY or NIGHT
		dayOrNight = calculateDayOrNight(latitude, longitude, angle);
		std::string lastDayOrNight = dayOrNight;

		if (! taking_dark_frames)
			currentAdjustGain = resetGainTransitionVariables(dayGain, nightGain);

		if (taking_dark_frames)
		{
			// We're doing dark frames so turn off autoexposure and autogain, and use
			// nightime gain, delay, max exposure, bin, and brightness to mimic a nightime shot.
			currentAutoExposure = false;
			nightAutoExposure = false;
			currentAutoGain = false;
			// Don't need to set ASI_AUTO_MAX_GAIN since we're not using auto gain
			currentGain = nightGain;
			gainChange = 0;
			currentDelay_ms = nightDelay_ms;
			currentMaxAutoexposure_us = current_exposure_us = nightMaxAutoexposure_ms * US_IN_MS;
			currentBin = nightBin;
			currentBrightness = nightBrightness;

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

			if (daytimeCapture != 1)
			{
				// Only display messages once a day.
				if (! displayedNoDaytimeMsg) {
					if (notificationImages) {
						system("scripts/copy_notification_image.sh --expires 0 CameraOffDuringDay &");
					}
					Log(0, "It's daytime... we're not saving images.\n*** %s ***\n",
						tty ? "Press Ctrl+C to stop" : "Stop the allsky service to end this process.");
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
					current_skip_frames = day_skip_frames;

				// If we went from Night to Day, then current_exposure_us will be the last night
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
					current_exposure_us = dayExposure_us;
				}
				else
				{
					// If gain changes, we have to change the exposure time to get an equally
					// exposed image.
					// ZWO gain has unit 0.1dB, so we have to convert the gain values to a factor first
					//		newExp =  (oldExp * oldGain) / newGain
					// e.g.		20s = (10s    * 2.0)     / (1.0) 

					// current values are here the last night values
					current_exposure_us = (current_exposure_us * pow(10, (float)currentGain / 10.0 / 20.0)) / pow(10, (float)dayGain / 10.0 / 20.0);
					Log(2, "Using the last night exposure, old and new Gain to calculate new exposure of %s\n", length_in_units(current_exposure_us, true));
				}

				currentMaxAutoexposure_us = dayMaxAutoexposure_ms * US_IN_MS;
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
				currentDelay_ms = dayDelay_ms;
				currentBin = dayBin;
				currentGain = dayGain;	// must come before determineGainChange() below
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
// xxxx TODO: add dayMaxGain and currentMaxGain.
// xxxx then can move the setControl further below
				// We don't have a separate dayMaxGain, so set to night one
				setControl(CamNum, ASI_AUTO_MAX_GAIN, nightMaxGain, ASI_FALSE);
			}
		}

		else	// NIGHT
		{
			Log(0, "==========\n=== Starting nighttime capture ===\n==========\n");

			// We only skip initial frames if we are starting in nighttime and using auto-exposure.
			if (numExposures == 0 && nightAutoExposure)
				current_skip_frames = night_skip_frames;

			// Setup the night time capture parameters
			if (numExposures == 0 || ! nightAutoExposure)
			{
				if (nightAutoExposure && nightExposure_us > nightMaxAutoexposure_ms*US_IN_MS)
				{
					snprintf(bufTemp, sizeof(bufTemp), "%s", length_in_units(nightExposure_us, true));
					Log(0, "*** WARNING: nighttime Manual Exposure [%s] > Max Auto-Exposure [%s]; user smaller number.\n", bufTemp, length_in_units(nightMaxAutoexposure_ms*US_IN_MS, true));
					nightExposure_us = nightMaxAutoexposure_ms * US_IN_MS;
				}
				current_exposure_us = nightExposure_us;
				Log(4, "Using night exposure (%s)\n", length_in_units(nightExposure_us, true));
			}

			currentAutoExposure = nightAutoExposure;
			currentBrightness = nightBrightness;
			currentDelay_ms = nightDelay_ms;
			currentBin = nightBin;
			currentMaxAutoexposure_us = nightMaxAutoexposure_ms * US_IN_MS;
			currentGain = nightGain;	// must come before determineGainChange() below
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
			setControl(CamNum, ASI_AUTO_MAX_GAIN, nightMaxGain, ASI_FALSE);
		}

		// never go over the camera's max auto exposure. ASI_AUTO_MAX_EXP is in ms so convert
		currentMaxAutoexposure_us = std::min(currentMaxAutoexposure_us, camera_max_autoexposure_us);
		setControl(CamNum, ASI_AUTO_MAX_EXP, currentMaxAutoexposure_us / US_IN_MS, ASI_FALSE);
		setControl(CamNum, ASI_GAIN, currentGain + gainChange, currentAutoGain ? ASI_TRUE : ASI_FALSE);
		// ASI_BRIGHTNESS is also called ASI_OFFSET
		setControl(CamNum, ASI_BRIGHTNESS, currentBrightness, ASI_FALSE);

#ifndef USE_HISTOGRAM
		setControl(CamNum, ASI_EXPOSURE, current_exposure_us, currentAutoExposure ? ASI_TRUE : ASI_FALSE);
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
			current_histogramBoxSizeX	= histogramBoxSizeX / currentBin;
			current_histogramBoxSizeY	= histogramBoxSizeY / currentBin;

			bufferSize = width * height * current_bpp;
			Log(4, "Buffer size: %ld\n", bufferSize);

// TODO: if not the first time, should we free the old pRgb?
			if (Image_type == IMG_RAW16)
			{
				pRgb.create(cv::Size(width, height), CV_16UC1);
			}
			else if (Image_type == IMG_RGB24)
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
			asiRetCode = ASISetROIFormat(CamNum, width, height, currentBin, (ASI_IMG_TYPE)Image_type);
			if (asiRetCode != ASI_SUCCESS)
			{
				if (asiRetCode == ASI_ERROR_INVALID_SIZE)
				{
					Log(0, "*** ERROR: your camera does not support bin %dx%d.\n", currentBin, currentBin);
					closeUp(EXIT_ERROR_STOP);
				}
				else
				{
					Log(0, "ASISetROIFormat(%d, %dx%d, %d, %d) = %s\n", CamNum, width, height, currentBin, Image_type, getRetCode(asiRetCode));
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
			Log(0, "STARTING EXPOSURE at: %s   @ %s\n", exposureStart, length_in_units(current_exposure_us, true));

			// Get start time for overlay. Make sure it has the same time as exposureStart.
			if (showTime)
			{
				sprintf(bufTime, "%s", formatTime(t, timeFormat));
			}

			asiRetCode = takeOneExposure(CamNum, current_exposure_us, pRgb.data, width, height, (ASI_IMG_TYPE) Image_type, histogram, &mean);
			if (asiRetCode == ASI_SUCCESS)
			{
				numErrors = 0;
				numExposures++;

				if (numExposures == 0 && preview)
				{
					// Start the preview thread at the last possible moment.
					bDisplay = true;
					pthread_create(&thread_display, NULL, Display, (void *)&pRgb);
				}

#ifdef USE_HISTOGRAM
				bool usedHistogram = false;	// did we use the histogram method?

				// We don't use this at night since the ZWO bug is only when it's light outside.
				if (dayOrNight == "DAY" && dayAutoExposure && ! taking_dark_frames)
				{
					usedHistogram = true;	// we are using the histogram code on this exposure
					attempts = 0;

					// Got these by trial and error. They are more-or-less half the max of 255.
#define MINMEAN 122
#define MAXMEAN 134
					int minAcceptableMean = MINMEAN;
					int maxAcceptableMean = MAXMEAN;
					int roundToMe = 5; // round exposures to this many microseconds

					long new_exposure_us = 0;

					// camera_min_exposure_us is a camera property.
					// hist_min_exposure_us is the min exposure used in the histogram calculation.
// xxxxxxxxx dump hist_min_exposure_us? Set temp_min_exposure_us = camera_min_exposure_us ? ...
					long hist_min_exposure_us = camera_min_exposure_us ? camera_min_exposure_us : 100;
					long temp_min_exposure_us = hist_min_exposure_us;
					long temp_max_exposure_us = currentMaxAutoexposure_us;

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
// xxxxxxxxx TODO: don't adjust hist_min_exposure_us; just histogram numbers.
						hist_min_exposure_us *= exposureAdjustment;
						minAcceptableMean *= exposureAdjustment;
						maxAcceptableMean *= exposureAdjustment;
					}

					// Keep track of whether or not we're bouncing around, for example,
					// one exposure is less than the min and the second is greater than the max.
					// When that happens we don't want to set the min to the second exposure
					// or else we'll never get low enough.
					// Negative is below lower limit, positive is above upper limit.
					// Adjust the min or maxAcceptableMean depending on the aggression.
					int prior_mean = mean;
					int prior_mean_diff = 0;
					int adjustment = 0;

					int last_mean_diff = 0;	// like prior_mean_diff but for next exposure

					if (mean < minAcceptableMean)
					{
						prior_mean_diff = mean - minAcceptableMean;
						// If we're skipping frames we want to get to a good exposure as fast as
						// possible so don't set an adjustment.
						if (aggression != 100 && current_skip_frames <= 0)
						{
							adjustment = prior_mean_diff * (1 - ((float)aggression/100));
							if (adjustment < 1)
								minAcceptableMean += adjustment;
						}
					}
					else if (mean > maxAcceptableMean)
					{
						prior_mean_diff = mean - maxAcceptableMean;
					}
					if (adjustment != 0)
					{
						Log(3, "  > !!! Adjusting %sAcceptableMean by %d to %d\n",
							adjustment < 0 ? "min" : "max",
							adjustment,
							adjustment < 0 ? minAcceptableMean : maxAcceptableMean);
					}

					while ((mean < minAcceptableMean || mean > maxAcceptableMean) && ++attempts <= maxHistogramAttempts && current_exposure_us <= currentMaxAutoexposure_us)
					{
						int acceptable;
						float multiplier = 1.10;
						const char *acceptable_type;
						if (mean < minAcceptableMean) {
							acceptable = minAcceptableMean;
							acceptable_type = "min";
						} else {
							acceptable = maxAcceptableMean;
							acceptable_type = "max";
							multiplier = 1 / multiplier;
						}
						if (current_exposure_us != last_exposure_us)
							printf("xxxxxxxxxxx current_exposure_us %'ld != last_exposure_us %'ld\n", current_exposure_us, last_exposure_us);
						// if mean/acceptable is 9/90, it's 1/10th of the way there, so multiple exposure by 90/9 (10).
						// ZWO cameras don't appear to be linear so increase the multiplier amount some.
						float multiply = ((double)acceptable / mean) * multiplier;
						new_exposure_us= last_exposure_us * multiply;
						printf("=== next exposure=%'ld (multiply by %.3f) [last_exposure_us=%'ld, %sAcceptable=%d, mean=%d]\n", new_exposure_us, multiply, last_exposure_us, acceptable_type, acceptable, mean);

						if (prior_mean_diff > 0 && last_mean_diff < 0)
						{ 
printf(" >xxx mean was %d and went from %d above max of %d to %d below min of %d, is now at %d; should NOT set temp min to current_exposure_us of %'ld\n",
							prior_mean, prior_mean_diff, maxAcceptableMean,
							-last_mean_diff, minAcceptableMean, mean, current_exposure_us);
						} 
						else
						{
							if (prior_mean_diff < 0 && last_mean_diff > 0)
							{
							// OK to set upper limit since we know it's too high.
printf(" >xxx mean was %d and went from %d below min of %d to %d above max of %d, is now at %d; OK to set temp max to current_exposure_us of %'ld\n",
								prior_mean, -prior_mean_diff, minAcceptableMean,
								last_mean_diff, maxAcceptableMean, mean, current_exposure_us);
							}

							if (mean < minAcceptableMean)
							{
								temp_min_exposure_us = current_exposure_us;
							} 
							else if (mean > maxAcceptableMean)
							{
								temp_max_exposure_us = current_exposure_us;
							} 
						} 

						new_exposure_us = roundTo(new_exposure_us, roundToMe);
						new_exposure_us = std::max(temp_min_exposure_us, new_exposure_us);
						new_exposure_us = std::min(temp_max_exposure_us, new_exposure_us);
						new_exposure_us = std::min(currentMaxAutoexposure_us, new_exposure_us);

						if (new_exposure_us == current_exposure_us)
						{
							break;
						}

						current_exposure_us = new_exposure_us;
						if (current_exposure_us > currentMaxAutoexposure_us)
						{
							break;
						}

						Log(3, "  >> Retry %i @ %'ld us, min=%'ld us, max=%'ld us: mean (%d)\n", attempts, new_exposure_us, temp_min_exposure_us, temp_max_exposure_us, mean);

						prior_mean = mean;
						prior_mean_diff = last_mean_diff;

						asiRetCode = takeOneExposure(CamNum, current_exposure_us, pRgb.data, width, height, (ASI_IMG_TYPE) Image_type, histogram, &mean);
						if (asiRetCode == ASI_SUCCESS)
						{

							if (mean < minAcceptableMean)
								last_mean_diff = mean - minAcceptableMean;
							else if (mean > maxAcceptableMean)
								last_mean_diff = mean - maxAcceptableMean;
							else
								last_mean_diff = 0;

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
						 Log(3, "  > max attempts reached - using exposure of %s us with mean %d\n", length_in_units(current_exposure_us, true), mean);
					}
					else if (attempts >= 1)
					{
						if (current_exposure_us > currentMaxAutoexposure_us)
						{
							 // If we call length_in_units() twice in same command line they both return the last value.
							 char x[100];
							 snprintf(x, sizeof(x), "%s", length_in_units(current_exposure_us, false));
							 Log(3, "  > Stopped trying: new exposure of %s would be over max of %s\n", x, length_in_units(currentMaxAutoexposure_us, false));

							 long diff = (long)((float)current_exposure_us * (1/(float)percent_change));
							 current_exposure_us -= diff;
							 Log(3, "  > Decreasing next exposure by %d%% (%'ld us) to %'ld\n", percent_change, diff, current_exposure_us);
						}
						else if (current_exposure_us == currentMaxAutoexposure_us)
						{
							Log(3, "  > Stopped trying: hit max exposure limit of %s, mean %d\n", length_in_units(currentMaxAutoexposure_us, false), mean);
							// If current_exposure_us causes too high of a mean, decrease exposure
							// so on the next loop we'll adjust it.
							if (mean > maxAcceptableMean)
								current_exposure_us--;
						}
						else if (new_exposure_us == current_exposure_us)
						{
							Log(3, "  > Stopped trying: new_exposure_us == current_exposure_us == %s\n", length_in_units(current_exposure_us, false));
						}
						else
						{
							Log(3, "  > Stopped trying, using exposure of %s us with mean %d, min=%d, max=%d\n", length_in_units(current_exposure_us, false), mean, minAcceptableMean, maxAcceptableMean);
						}
						 
					}
					else if (current_exposure_us == currentMaxAutoexposure_us)
					{
						Log(3, "  > Did not make any additional attempts - at max exposure limit of %s, mean %d\n", length_in_units(currentMaxAutoexposure_us, false), mean);
					}
					// xxxx TODO: this was "actual_exposure_us = ..."	reported_exposure_us = current_exposure_us;

				} else {
					// Didn't use histogram method.
					// If we used auto-exposure, set the next exposure to the last reported
					// exposure, which is what the camera driver thinks the next exposure should be.
					// But temper it by the agression value so we don't bounce up and down.
					if (currentAutoExposure)
					{
						// If we're skipping frames we want to get to a good exposure as fast as
						// possible so don't set an adjustment.
						if (aggression != 100 && current_skip_frames <= 0)
						{
							long exposureDiff_us;
							exposureDiff_us = reported_exposure_us - current_exposure_us;
							exposureDiff_us *= (float)aggression / 100;
							if (exposureDiff_us != 0)
							{
								Log(4, "  > Changing next exposure by %s ", length_in_units(exposureDiff_us, true));
								Log(4, "from %s ", length_in_units(current_exposure_us, true));
								current_exposure_us += exposureDiff_us;
								Log(4, "to %s\n", length_in_units(current_exposure_us, true));
							}
						}
						else
						{
							current_exposure_us = reported_exposure_us;
						}
					}
					else
					{
						// Didn't use auto-exposure - don't change exposure
					}
				}
#endif
				if (current_skip_frames > 0)
				{
#ifdef USE_HISTOGRAM
					// If we're already at a good exposure, or the last exposure was longer
					// than the max, don't skip any more frames.
// xxx TODO: should we have a separate variable to define "too long" instead of currentMaxAutoexposure_us?
					if ((mean >= MINMEAN && mean <= MAXMEAN) || last_exposure_us > currentMaxAutoexposure_us)
					{
						current_skip_frames = 0;
					}
					else
#endif
					{
						Log(2, "  >>>> Skipping this frame\n");
						current_skip_frames--;
						// Do not save this frame or sleep after it.
						// We just started taking images so no need to check if DAY or NIGHT changed
						continue;
					}
				}

				// If taking_dark_frames is off, add overlay text to the image
				if (! taking_dark_frames)
				{
					int iYOffset = 0;

					// false and 0 are for showFocus and focus_metric which ZWO doesn't have yet
					iYOffset = doOverlay(pRgb,
						showTime, bufTime,
						showExposure, last_exposure_us, currentAutoExposure,
						showTemp, actualTemp, tempType,
 						showGain, actualGain, currentAutoGain, gainChange,
						showMean, mean,
						showBrightness, currentBrightness,
						false, 0,
						ImgText, ImgExtraText, extraFileAge,
						iTextX, iTextY, currentBin, width, iTextLineHeight,
						fontsize, linewidth, linetype[linenumber], fontname[fontnumber],
						fontcolor, smallFontcolor, outlinefont, Image_type);
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
						cv::Scalar outer_line, inner_line;
						outer_line = cv::Scalar(0,0,0);
						inner_line = cv::Scalar(255,255,255);
						cv::rectangle(pRgb, cv::Point(X1, Y1), cv::Point(X2, Y2), outer_line, thickness, lt, 0);
						cv::rectangle(pRgb, cv::Point(X1+thickness, Y1+thickness), cv::Point(X2-thickness, Y2-thickness), inner_line, thickness, lt, 0);
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
					current_exposure_us = last_exposure_us;
				}
#endif

				// Save the image
				if (! bSavingImg)
				{
					if (! taking_dark_frames)
					{
						// Create the name of the file that goes in the images/<date> directory.
						snprintf(final_file_name, sizeof(final_file_name), "%s-%s.%s",
							fileNameOnly, formatTime(t, "%Y%m%d%H%M%S"), imagetype);
					}
					snprintf(full_filename, sizeof(full_filename), "%s/%s", save_dir, final_file_name);

					pthread_mutex_lock(&mtx_SaveImg);
					pthread_cond_signal(&cond_StartSave);
					pthread_mutex_unlock(&mtx_SaveImg);
				}
				else
				{
					// Hopefully the user can use the time it took to save a file to disk
					// to help determine why they are getting this warning.
					// Perhaps their disk is very slow or their delay is too short.
					Log(0, "  > WARNING: currently saving an image; can't save new one at %s.\n", exposureStart);

					// TODO: wait for the prior image to finish saving.
				}

				if (nightAutoGain && dayOrNight == "NIGHT" && ! taking_dark_frames)
				{
					ASIGetControlValue(CamNum, ASI_GAIN, &actualGain, &bAuto);
					Log(1, "  > Auto Gain value: %ld\n", actualGain);
				}

				if (currentAutoExposure)
				{
#ifndef USE_HISTOGRAM

					if (dayOrNight == "DAY")
					{
						current_exposure_us = last_exposure_us;
					}
#endif

					// Delay applied before next exposure
					if (dayOrNight == "NIGHT" && nightAutoExposure && last_exposure_us < (nightMaxAutoexposure_ms * US_IN_MS) && ! taking_dark_frames)
					{
						// If using auto-exposure and the actual exposure is less than the max,
						// we still wait until we reach maxexposure, then wait for the delay period.
						// This is important for a constant frame rate during timelapse generation.
						// This doesn't apply during the day since we don't have a max time then.
						long s_us = (nightMaxAutoexposure_ms * US_IN_MS) - last_exposure_us; // to get to max
						s_us += currentDelay_ms * US_IN_MS;		// Add standard delay amount
						Log(0, "  > Sleeping: %s\n", length_in_units(s_us, false));
						usleep(s_us);	// usleep() is in us (microseconds)
					}
					else
					{
						// Sleep even if taking dark frames so the sensor can cool between shots like it would
						// do on a normal night. With no delay the sensor may get hotter than it would at night.
						Log(0, "  > Sleeping %s from %s exposure\n", length_in_units(currentDelay_ms * US_IN_MS, false), taking_dark_frames ? "dark frame" : "auto");
						usleep(currentDelay_ms * US_IN_MS);
					}
				}
				else
				{
					std::string s;
					if (taking_dark_frames)
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
