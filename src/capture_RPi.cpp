#include <opencv2/core.hpp>
#include <opencv2/imgproc.hpp>
#include <opencv2/highgui.hpp>
#include <sys/time.h>
#include <unistd.h>
#include <string.h>
#include <errno.h>
#include <string>
#include <tr1/memory>
#include <stdlib.h>
#include <signal.h>
#include <fstream>
#include <stdarg.h>

#include <iomanip>
#include <cstring>
#include <sstream>

#include "include/allsky_common.h"

// CG holds all configuration variables.
// There are only a few cases where it's not passed to a function.
// When it's passed, functions call it "cg", so use upper case for global version.
config CG;

#include "include/raspistill.h"
#include "include/mode_mean.h"

#define CAMERA_TYPE				"RPi"
#define IS_RPi
#include "ASI_functions.cpp"

using namespace std;


//-------------------------------------------------------------------------------------------------------
//-------------------------------------------------------------------------------------------------------

// These are global so they can be used by other routines.
// Variables for command-line settings are first.
timeval exposureStartDateTime;						// date/time an image started

std::vector<int> compressionParameters;
bool bMain					= true;
bool bDisplay				= false;
std::string dayOrNight;
int numErrors				= 0;					// Number of errors in a row
bool gotSignal				= false;				// did we get a SIGINT (from keyboard), or SIGTERM/SIGHUP (from service)?
int iNumOfCtrl				= NOT_SET;				// Number of camera control capabilities
pthread_t threadDisplay		= 0;					// Not used by Rpi;
int numExposures			= 0;					// how many valid pictures have we taken so far?
int currentBpp				= NOT_SET;				// bytes per pixel: 8, 16, or 24
int currentBitDepth			= NOT_SET;				// 8 or 16
raspistillSetting myRaspistillSetting;
modeMeanSetting myModeMeanSetting;

//-------------------------------------------------------------------------------------------------------
//-------------------------------------------------------------------------------------------------------


// Build capture command to capture the image from the camera.
// If an argument is IS_DEFAULT, the user didn't set it so don't pass to the program and
// the default will be used.
int RPicapture(config cg, cv::Mat *image)
{
	// Define command line.
	string command = cg.cmdToUse;

	// Ensure no process is still running.
	string kill = "pgrep '" + command + "' | xargs kill -9 2> /dev/null";
	char kcmd[kill.length() + 1];		// Define char variable
	strcpy(kcmd, kill.c_str());			// Convert command to character variable
	Log(4, " > Kill command: %s\n", kcmd);
	system(kcmd);						// Stop any currently running process

	if (cg.isLibcamera)
	{
		// Tried putting this in putenv() but it didn't seem to work.
		command = "LIBCAMERA_LOG_LEVELS=ERROR,FATAL " + command;
	}
	stringstream ss;

	ss << cg.fullFilename;
	command += " --output '" + ss.str() + "'";
	if (cg.isLibcamera)
	{
		// xxx TODO: does this do anything?
		// command += " --tuning-file /usr/share/libcamera/ipa/raspberrypi/imx477.json";
		command += "";	// xxxx

		if (strcmp(cg.imageExt, "png") == 0)
			command += " --encoding png";
	}
	else
	{
		command += " --thumb none --burst -st";
	}

	// --timeout (in MS) determines how long the video will run before it takes a picture.
	if (cg.preview)
	{
		stringstream wh;
		wh << cg.width << "," << cg.height;
		command += " --timeout 5000";
		command += " --preview '0,0," + wh.str() + "'";	// x,y,width,height
	}
	else
	{
		ss.str("");
		// Daytime auto-exposure pictures don't need a very long --timeout since the exposures are
		// normally short so the camera can home in on the correct exposure quickly.
		if (cg.currentAutoExposure)
		{
			if (myModeMeanSetting.meanAuto != MEAN_AUTO_OFF)
			{
				// We do our own auto-exposure so no need to wait at all.
				// Tried --immediate, but on Buster (don't know about Bullseye), it hung exposures.
				ss << 1;
			}
			else if (dayOrNight == "DAY")
				ss << 2 * MS_IN_SEC;
			else	// NIGHT
			{
				// could use longer but it'll take forever for pictures to appear
				ss << 10 * MS_IN_SEC;
			}
		}
		else
		{
			// Manual exposure shots don't need any time to home in since we're specifying the time.
			ss << 1;
		}
		if (ss.str() != "") command += " --timeout " + ss.str();
		command += " --nopreview";
	}

//xxxx not sure if this still applies for libcamera
	// https://www.raspberrypi.com/documentation/accessories/camera.html#raspistill
	// Mode		Size		Aspect Ratio	Frame rates		FOV		Binning/Scaling
	// 0		automatic selection
	// 1		2028x1080		169:90		0.1-50fps		Partial	2x2 binned
	// 2		2028x1520		4:3			0.1-50fps		Full	2x2 binned	<<< bin==2
	// 3		4056x3040		4:3			0.005-10fps		Full	None		<<< bin==1
	// 4		1332x990		74:55		50.1-120fps		Partial	2x2 binned	<<< else 

	if (cg.isLibcamera)
	{
		// xxxx TODO: don't hard code resolutions - use what's defined for camera.
		//	'SRGGB10_CSI2P' : 1332x990 
		//	'SRGGB12_CSI2P' : 2028x1080 2028x1520 4056x3040 
		//								bin 2x2   bin 1x1
		if (cg.currentBin == 1)
			command += " --width 4056 --height 3040";
		else if (cg.currentBin == 2)
			command += " --width 2028 --height 1520";
	}
	else
	{
		if (cg.currentBin == 1)
			command += " --mode 3";
		else if (cg.currentBin == 2)
			command += " --mode 2 --width 2028 --height 1520";
	}

	if (myModeMeanSetting.meanAuto != MEAN_AUTO_OFF)
	{
if (0 && cg.currentExposure_us != myRaspistillSetting.shutter_us)
{
printf("xxxxxxxxxxx cg.currentExposure_us = %s != ", length_in_units(cg.currentExposure_us, true));
printf(" myRaspistillSetting.shutter_us= %s\n", length_in_units(myRaspistillSetting.shutter_us, true));
}
		cg.currentExposure_us = myRaspistillSetting.shutter_us;
	}

	// Check if automatic determined exposure time is selected
	if (cg.currentAutoExposure)
	{
		if (myModeMeanSetting.meanAuto != MEAN_AUTO_OFF) {
			ss.str("");
			ss << cg.currentExposure_us;
			if (! cg.isLibcamera)
				command += " --exposure off";
			command += " --shutter " + ss.str();
		} else {
			// libcamera doesn't use "exposure off/auto".  For auto-exposure set shutter to 0.
			if (cg.isLibcamera)
				command += " --shutter 0";
			else
				command += " --exposure auto";
		}
	}
	else if (cg.currentExposure_us)		// manual exposure
	{
		ss.str("");
		ss << cg.currentExposure_us;
		if (! cg.isLibcamera)
			command += " --exposure off";
		command += " --shutter " + ss.str();
	}

	// Check if auto gain is selected
	if (cg.currentAutoGain)
	{
		if (myModeMeanSetting.meanAuto != MEAN_AUTO_OFF)
		{
			ss.str("");
			ss << myRaspistillSetting.analoggain;
			command += " --analoggain " + ss.str();
		}
		else if (cg.isLibcamera)
		{
			command += " --analoggain 0";	// 0 makes it autogain
		}
		else
		{
			command += " --analoggain 1";	// 1 makes it autogain
		}
	}
	else if (cg.currentGain != IS_DEFAULT)	// Is manual gain
	{
		ss.str("");
		ss << cg.currentGain;
		command += " --analoggain " + ss.str();
	}

	if (myModeMeanSetting.meanAuto != MEAN_AUTO_OFF) {
		stringstream strExposureTime;
		stringstream strReinforcement;
		strExposureTime <<  myRaspistillSetting.shutter_us;
		strReinforcement << myRaspistillSetting.analoggain;

		command += " --exif IFD0.Artist=li_" + strExposureTime.str() + "_" + strReinforcement.str();
	}

	// libcamera: if the red and blue numbers are given it turns off AWB.
	// Check if R and B component are given
	if (! cg.currentAutoAWB) {
		ss.str("");
		ss << cg.currentWBR << "," << cg.currentWBB;
		if (! cg.isLibcamera)
			command += " --awb off";
		if (cg.currentWBR != IS_DEFAULT and cg.currentWBB != IS_DEFAULT)
			command += " --awbgains " + ss.str();
	}
	else {		// Use automatic white balance
		command += " --awb auto";
	}

	if (cg.rotation != 0) {
		ss.str("");
		ss << cg.rotation;
		command += " --rotation " + ss.str();
	}

	if (cg.flip == 1 || cg.flip == 3)
		command += " --hflip";		// horizontal flip
	if (cg.flip == 2 || cg.flip == 3)
		command += " --vflip";		// vertical flip

	if (cg.saturation != IS_DEFAULT) {
		ss.str("");
		ss << cg.saturation;
		command += " --saturation "+ ss.str();
	}

	if (cg.contrast != IS_DEFAULT) {
		ss.str("");
		ss << cg.contrast;
		command += " --contrast "+ ss.str();
	}

	if (cg.sharpness != IS_DEFAULT) {
		ss.str("");
		ss << cg.sharpness;
		command += " --sharpness "+ ss.str();
	}

	if (cg.currentBrightness != IS_DEFAULT) {
		ss.str("");
		if (cg.isLibcamera)
			ss << (float) cg.currentBrightness / 100;	// User enters -100 to 100.  Convert to -1.0 to 1.0.
		else
			ss << cg.currentBrightness;
		command += " --brightness " + ss.str();
	}

	if (cg.quality != IS_DEFAULT) {
		ss.str("");
		ss << cg.quality;
		command += " --quality " + ss.str();
	}

	if (cg.isLibcamera)
	{
		if (cg.debugLevel >= 4)
		{
			command += " > /tmp/capture_RPi_debug.txt 2>&1";
		}
		else
		{
			// Hide verbose libcamera messages that are only needed when debugging.
			command += " 2> /dev/null";	// gets rid of a bunch of libcamera verbose messages
		}
	}

	// Define char variable
	char cmd[command.length() + 1];

	// Convert command to character variable
	strcpy(cmd, command.c_str());

	Log(2, "  > Capture command: %s\n", cmd);

	// Execute the command.
	int ret = system(cmd);
	if (ret == 0)
	{
		*image = cv::imread(cg.fullFilename, cv::IMREAD_UNCHANGED);
		if (! image->data) {
			Log(1, "WARNING: Error re-reading file '%s'; skipping further processing.\n", basename(cg.fullFilename));
		}
	}
	return(ret);
}


//-------------------------------------------------------------------------------------------------------
//-------------------------------------------------------------------------------------------------------

int main(int argc, char *argv[])
{
	char * a = getenv("ALLSKY_HOME");		// This must come before anything else
	if (a != NULL)
		snprintf(CG.allskyHome, sizeof(CG.allskyHome)-1, "%s/", a);

	char bufTime[128]			= { 0 };
	char bufTemp[1024]			= { 0 };
	char const *bayer[]			= { "RG", "BG", "GR", "GB" };
	bool endOfNight				= false;
	ASI_ERROR_CODE asiRetCode;		// used for return code from ASI functions.

	// We need to know its value before setting other variables.
	CG.cmdToUse = "libcamera-still";		// default
	if (argc > 2 && strcmp(argv[1], "-cmd") == 0 && strcmp(argv[2], CG.cmdToUse) == 0)
	{
		CG.isLibcamera = true;
	} else {
		CG.isLibcamera = false;
		CG.cmdToUse = "raspistill";
	}

	int retCode;
	cv::Mat pRgb;							// the image

	//-------------------------------------------------------------------------------------------------------
	//-------------------------------------------------------------------------------------------------------
	setlinebuf(stdout);		// Line buffer output so entries appear in the log immediately.

	CG.ct = ctRPi;
	if (! getCommandLineArguments(&CG, argc, argv))
	{
		// getCommandLineArguents outputs an error message.
		exit(EXIT_ERROR_STOP);
	}

	if (! CG.saveCC && ! CG.help)
	{
		displayHeader(CG);
	}

	if (setlocale(LC_NUMERIC, CG.locale) == NULL)
		Log(-1, "*** WARNING: Could not set locale to %s ***\n", CG.locale);

	if (CG.help)
	{
		displayHelp(CG);
		closeUp(EXIT_OK);
	}

	processConnectedCameras();	// exits on error

	ASI_CAMERA_INFO ASICameraInfo;
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

	// Do argument error checking if we're not going to exit soon.
	if (! CG.saveCC && ! setDefaultsAndValidateSettings(&CG, ASICameraInfo))
		closeUp(EXIT_ERROR_STOP);

	char const *ext = checkForValidExtension(CG.fileName, CG.imageType);
	if (ext == NULL)
	{
		// checkForValidExtension() displayed the error message.
		closeUp(EXIT_ERROR_STOP);
	}

// TODO: make common
	if (strcasecmp(ext, "jpg") == 0 || strcasecmp(ext, "jpeg") == 0)
	{
		CG.imageExt = "jpg";
		compressionParameters.push_back(cv::IMWRITE_JPEG_QUALITY);
		// want dark frames to be at highest quality
		if (CG.takeDarkFrames)
		{
			CG.quality = 100;
		}
		else if (CG.quality == NOT_SET)
		{
			CG.quality = CG.qualityJPG;
		}
		else
		{
			validateLong(&CG.quality, 0, 100, "JPG Quality", true);
		}
	}
	else if (strcasecmp(ext, "png") == 0)
	{
		CG.imageExt = "png";
		compressionParameters.push_back(cv::IMWRITE_PNG_COMPRESSION);
		// png is lossless so "quality" is really just the amount of compression.
		if (CG.takeDarkFrames)
		{
			CG.quality = 9;
		}
		else if (CG.quality == NOT_SET)
		{
			CG.quality = CG.qualityPNG;
		}
		else
		{
			validateLong(&CG.quality, 0, 9, "PNG Quality/Compression", true);
		}
	}
	compressionParameters.push_back(CG.quality);

// TODO: make common.
	// Get just the name of the file, without any directories or the extension.
	if (CG.takeDarkFrames)
	{
		// To avoid overwriting the optional notification image with the dark image,
		// during dark frames we use a different file name.
		static char darkFilename[20];
		sprintf(darkFilename, "dark.%s", CG.imageExt);
		CG.fileName = darkFilename;
		strncat(CG.finalFileName, CG.fileName, sizeof(CG.finalFileName)-1);
	}
	else
	{
		char const *slash = strrchr(CG.fileName, '/');
		if (slash == NULL)
			strncat(CG.fileNameOnly, CG.fileName, sizeof(CG.fileNameOnly)-1);
		else
			strncat(CG.fileNameOnly, slash + 1, sizeof(CG.fileNameOnly)-1);
		char *dot = strrchr(CG.fileNameOnly, '.');	// we know there's an extension
		*dot = '\0';
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
		validateLong(&CG.width, 0, iMaxWidth, "Width", false);
		validateLong(&CG.height, 0, iMaxHeight, "Height", false);
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
		saveCameraInfo(ASICameraInfo, CG.CC_saveDir, iMaxWidth, iMaxHeight, pixelSize, bayer[ASICameraInfo.BayerPattern]);
		closeUp(EXIT_OK);
	}

	outputCameraInfo(ASICameraInfo, CG, iMaxWidth, iMaxHeight, pixelSize, bayer[ASICameraInfo.BayerPattern]);
	// checkExposureValues() must come after outputCameraInfo().
	(void) checkExposureValues(&CG);

	// Handle "auto" imageType.
	if (CG.imageType == AUTO_IMAGE_TYPE)
	{
		// user will have to manually set for 8- or 16-bit mono mode
		CG.imageType = IMG_RGB24;
	}

	if (CG.imageType == IMG_RAW16)
	{
		CG.sType = "RAW16";
		currentBpp = 2;
		currentBitDepth = 16;
	}
	else if (CG.imageType == IMG_RGB24)
	{
		CG.sType = "RGB24";
		currentBpp = 3;
		currentBitDepth = 8;
	}
	else if (CG.imageType == IMG_RAW8)
	{
		CG.sType = "RAW8";
		currentBpp = 1;
		currentBitDepth = 8;
	}
	else
	{
		Log(0, "*** ERROR: Unknown Image Type: %d\n", CG.imageType);
		exit(EXIT_ERROR_STOP);
	}

	//-------------------------------------------------------------------------------------------------------
	//-------------------------------------------------------------------------------------------------------

// TODO: after merging myModeMeanSetting into CG.myModeMeanSetting, delete these lines.
	myModeMeanSetting.dayMean = CG.myModeMeanSetting.dayMean;
	myModeMeanSetting.nightMean = CG.myModeMeanSetting.nightMean;
	myModeMeanSetting.mean_threshold = CG.myModeMeanSetting.mean_threshold;
	myModeMeanSetting.mean_p0 = CG.myModeMeanSetting.mean_p0;
	myModeMeanSetting.mean_p1 = CG.myModeMeanSetting.mean_p1;
	myModeMeanSetting.mean_p2 = CG.myModeMeanSetting.mean_p2;

	displaySettings(CG);

	// Initialization
	int originalITextX		= CG.overlay.iTextX;
	int originalITextY		= CG.overlay.iTextY;
	int originalFontsize	= CG.overlay.fontsize;
	int originalLinewidth	= CG.overlay.linewidth;
	// Have we displayed "not taking picture during day" message, if applicable?
	bool displayedNoDaytimeMsg = false;

	if (CG.tty)
		Log(0, "*** Press Ctrl+C to stop ***\n\n");

	// Start taking pictures

	while (bMain)
	{
		// Find out if it is currently DAY or NIGHT
		dayOrNight = calculateDayOrNight(CG.latitude, CG.longitude, CG.angle);
		std::string lastDayOrNight = dayOrNight;

		if (CG.takeDarkFrames)
		{
			// We're doing dark frames so turn off autoexposure and autogain, and use
			// nightime gain, delay, exposure, and brightness to mimic a nightime shot.
			CG.currentSkipFrames = 0;
			CG.currentAutoExposure = false;
			CG.nightAutoExposure = false;
			CG.currentAutoGain = false;
			CG.currentGain = CG.nightGain;
			CG.currentMaxAutoGain = CG.nightMaxAutoGain;		// not needed since we're not using auto gain, but set to be consistent
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

 			Log(1, "Taking dark frames...\n");

			if (CG.notificationImages) {
				snprintf(bufTemp, sizeof(bufTemp)-1, "%sscripts/copy_notification_image.sh --expires 0 DarkFrames &", CG.allskyHome);
				system(bufTemp);
			}
		}

		else if (dayOrNight == "DAY")
		{
			if (endOfNight == true)		// Execute end of night script
			{
				Log(1, "Processing end of night data\n");
				snprintf(bufTemp, sizeof(bufTemp)-1, "%sscripts/endOfNight.sh &", CG.allskyHome);
				system(bufTemp);
				endOfNight = false;
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

				CG.currentExposure_us = CG.dayExposure_us;
				CG.currentMaxAutoExposure_us = CG.dayMaxAutoExposure_us;
				CG.currentAutoExposure = CG.dayAutoExposure;
				CG.currentBrightness = CG.dayBrightness;
				if (CG.isColorCamera)
				{
					CG.currentAutoAWB = CG.dayAutoAWB;
					CG.currentWBR = CG.dayWBR;
					CG.currentWBB = CG.dayWBB;
				}
				CG.currentDelay_ms = CG.dayDelay_ms;
				CG.currentBin = CG.dayBin;
				CG.currentGain = CG.dayGain;
				CG.currentMaxAutoGain = CG.dayMaxAutoGain;
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
			Log(1, "==========\n=== Starting nighttime capture ===\n==========\n");

			// We only skip initial frames if we are starting in nighttime and using auto-exposure.
			if (numExposures == 0 && CG.nightAutoExposure)
				CG.currentSkipFrames = CG.nightSkipFrames;

			// Setup the night time capture parameters
			CG.currentExposure_us = CG.nightExposure_us;
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
			CG.currentGain = CG.nightGain;
			CG.currentMaxAutoGain = CG.nightMaxAutoGain;
			CG.currentAutoGain = CG.nightAutoGain;
			if (CG.isCooledCamera)
			{
				CG.currentEnableCooler = CG.nightEnableCooler;
				CG.currentTargetTemp = CG.nightTargetTemp;
			}
			CG.myModeMeanSetting.currentMean = CG.myModeMeanSetting.nightMean;
		}
		// ========== Done with dark frame / day / night settings


		if (CG.myModeMeanSetting.currentMean > 0.0)
		{
			CG.myModeMeanSetting.modeMean = true;
			myModeMeanSetting.meanValue = CG.myModeMeanSetting.currentMean;
			if (! aegInit(CG, CG.cameraMinExposure_us, CG.cameraMinGain, myRaspistillSetting, myModeMeanSetting))
			{
				closeUp(EXIT_ERROR_STOP);
			}
		}
		else
		{
			CG.myModeMeanSetting.modeMean = false;
			myModeMeanSetting.meanAuto = MEAN_AUTO_OFF;
		}
// TODO: after merging myModeMeanSetting into CG.myModeMeanSetting, delete this line.
myModeMeanSetting.modeMean = CG.myModeMeanSetting.modeMean;

		// Want initial exposures to have the exposure time and gain the user specified.
		if (numExposures == 0)
		{
			myRaspistillSetting.shutter_us = CG.currentExposure_us;
			myRaspistillSetting.analoggain = CG.currentGain;
		}

		if (numExposures == 0 || CG.dayBin != CG.nightBin)
		{
			// Adjusting variables for chosen binning.
			// Only need to do at the beginning and if bin changes.
			CG.height				= originalHeight / CG.currentBin;
			CG.width				= originalWidth / CG.currentBin;
			CG.overlay.iTextX		= originalITextX / CG.currentBin;
			CG.overlay.iTextY		= originalITextY / CG.currentBin;
			CG.overlay.fontsize		= originalFontsize / CG.currentBin;
			CG.overlay.linewidth	= originalLinewidth / CG.currentBin;

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
		}

		// Here and below, indent sub-messages with "  > " so it's clear they go with the un-indented line.
		// This simply makes it easier to see things in the log file.

		// Wait for switch day time -> night time or night time -> day time
		while (bMain && lastDayOrNight == dayOrNight)
		{
			// date/time is added to many log entries to make it easier to associate them
			// with an image (which has the date/time in the filename).
			exposureStartDateTime = getTimeval();
			char exposureStart[128];
			snprintf(exposureStart, sizeof(exposureStart), "%s", formatTime(exposureStartDateTime, "%F %T"));
			Log(2, "-----\n");
			Log(1, "STARTING EXPOSURE at: %s   @ %s\n", exposureStart, length_in_units(myRaspistillSetting.shutter_us, true));

			// Get start time for overlay. Make sure it has the same time as exposureStart.
			if (CG.overlay.showTime)
			{
				sprintf(bufTime, "%s", formatTime(exposureStartDateTime, CG.timeFormat));
			}

			if (! CG.takeDarkFrames)
			{
				// Create the name of the file that goes in the images/<date> directory.
				snprintf(CG.finalFileName, sizeof(CG.finalFileName), "%s-%s.%s",
					CG.fileNameOnly, formatTime(exposureStartDateTime, "%Y%m%d%H%M%S"), CG.imageExt);
			}
			snprintf(CG.fullFilename, sizeof(CG.fullFilename), "%s/%s", CG.saveDir, CG.finalFileName);

			// Capture and save image
			retCode = RPicapture(CG, &pRgb);
			if (retCode == 0)
			{
				numExposures++;

				// We currently have no way to get the actual white balance values,
				// so use what the user requested.
				CG.lastWBR = CG.currentWBR;
				CG.lastWBB = CG.currentWBB;

				CG.lastFocusMetric = CG.overlay.showFocus ? (int)round(get_focus_metric(pRgb)) : -1;

				// If takeDarkFrames is off, add overlay text to the image
				if (! CG.takeDarkFrames)
				{
					CG.lastExposure_us = myRaspistillSetting.shutter_us;
					if (myModeMeanSetting.meanAuto != MEAN_AUTO_OFF)
					{
						CG.lastGain =  myRaspistillSetting.analoggain;
					}
					else
					{
						CG.lastGain = CG.currentGain;	// ZWO gain=0.1 dB , RPi gain=factor
					}

					CG.lastMean = aegCalcMean(pRgb);
					if (myModeMeanSetting.meanAuto != MEAN_AUTO_OFF)
					{
if (CG.lastExposure_us != myRaspistillSetting.shutter_us)
  Log(0, " xxxx lastExposure_us (%ld) != shutter_us (%ld)\n", CG.lastExposure_us, myRaspistillSetting.shutter_us);
						aegGetNextExposureSettings(CG.lastMean, CG.lastExposure_us, CG.lastGain,
								myRaspistillSetting, myModeMeanSetting);

						Log(2, "  > Got exposure: %s, gain: %1.3f,", length_in_units(CG.lastExposure_us, false), CG.lastGain);
						Log(2, " shutter: %s, quickstart: %d, mean=%1.3f\n", length_in_units(myRaspistillSetting.shutter_us, false), myModeMeanSetting.quickstart, CG.lastMean);
						if (CG.lastMean == -1)
						{
							numErrors++;
							Log(-1, "ERROR: aegCalcMean() returned mean of -1.\n");
							Log(2, "  > Sleeping from failed exposure: %.1f seconds\n", (float)CG.currentDelay_ms / MS_IN_SEC);
							usleep(CG.currentDelay_ms * US_IN_MS);
							continue;
						}
					}
					else {
						myRaspistillSetting.shutter_us = CG.currentExposure_us;
						myRaspistillSetting.analoggain = CG.currentGain;
					}

					if (CG.currentSkipFrames == 0 && ! CG.overlay.externalOverlay && \
						doOverlay(pRgb, CG, bufTime, 0) > 0)
					{
						// if we added anything to overlay, write the file out
						bool result = cv::imwrite(CG.fullFilename, pRgb, compressionParameters);
						if (! result) fprintf(stderr, "*** ERROR: Unable to write to '%s'\n", CG.fullFilename);
					}
				}

				if (CG.currentSkipFrames > 0)
				{
					CG.currentSkipFrames--;
					Log(2, "  >>>> Skipping this frame.  %d left to skip\n", CG.currentSkipFrames);
					// Do not save this frame or sleep after it.
					// We just started taking images so no need to check if DAY or NIGHT changed
					if (remove(CG.fullFilename) != 0)
						Log(0, "ERROR: Unable to remove '%s': %s\n", CG.fullFilename, strerror(errno));
					continue;
				}
				else
				{
					// We primarily skip the initial frames to give auto-exposure time to
					// lock in on a good exposure.  If it does that quickly, stop skipping images.
					if (CG.goodLastExposure)
					{
						CG.currentSkipFrames = 0;
					}

					char cmd[1100+sizeof(CG.allskyHome)];
					Log(1, "  > Saving %s image '%s'\n", CG.takeDarkFrames ? "dark" : dayOrNight.c_str(), CG.finalFileName);
					snprintf(cmd, sizeof(cmd), "%sscripts/saveImage.sh %s '%s'", CG.allskyHome, dayOrNight.c_str(), CG.fullFilename);

					// TODO: in the future the calculation of mean should independent from modeMean. -1 means don't display.
					add_variables_to_command(CG, cmd, exposureStartDateTime);
					strcat(cmd, " &");
					system(cmd);
				}

				if (myModeMeanSetting.quickstart && myModeMeanSetting.meanAuto != MEAN_AUTO_OFF)
				{
					long x = 1 * US_IN_SEC;
					Log(2, "Sleeping 1 second (quickstart on, %d left)...\n", myModeMeanSetting.quickstart);
					usleep(x);
				}
				else
				{
					std::string s;
					if (CG.currentAutoExposure)
						s = "auto";
					else
						s = "manual";
					delayBetweenImages(CG, myRaspistillSetting.shutter_us, s);
				}
			}
			else
			{
				numErrors++;
				int r = retCode >> 8;
				Log(0, " >>> ERROR: Unable to take picture, return code=%d, r=%d\n", retCode, r);
				if (WIFSIGNALED(r)) r = WTERMSIG(r);
				{
					// Got a signal.  See if it's one we care about.
					std::string z = "";
					if (r == SIGINT) z = "SIGINT";
					else if (r == SIGTERM) z = "SIGTERM";
					else if (r == SIGHUP) z = "SIGHUP";
					if (z != "")
					{
						Log(3, "xxxx Got %s in %s\n", z.c_str(), CG.cmdToUse);
					}
					else
					{
						Log(3, "xxxx Got signal %d in capture_RPi.cpp\n", r);
					}
				}
				// Don't wait the full amount on error.
				long timeToSleep = (float)CG.currentDelay_ms * .25;
				Log(2, "  > Sleeping from failed exposure: %.1f seconds\n", (float)timeToSleep / MS_IN_SEC);
				usleep(timeToSleep * US_IN_MS);
			}

			// Check for day or night based on location and angle
			dayOrNight = calculateDayOrNight(CG.latitude, CG.longitude, CG.angle);
		}

		if (lastDayOrNight == "NIGHT")
		{
			// Flag end of night processing is needed
			endOfNight = true;
		}
	}

	closeUp(EXIT_OK);
}
