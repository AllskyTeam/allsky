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
int maxErrors				= 5;					// Max number of errors in a row before we exit

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

	stringstream ss, ss2;

	ss << cg.fullFilename;
	command += " --output '" + ss.str() + "'";

	if (*cg.extraArgs)
	{
		// add the extra arguments as is; do not parse them
		ss.str("");
		ss << cg.extraArgs;
		command += " " + ss.str();
	}

	if (cg.isLibcamera)
	{
		// libcamera tuning file
		if (cg.currentTuningFile != NULL && strcmp(cg.currentTuningFile, "") != 0) {
			ss.str("");
			ss << cg.currentTuningFile;
			command += " --tuning-file '" + ss.str() + "'";
		}

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

	ss.str("");
	ss2.str("");
	if (cg.isLibcamera)
	{
		// Ideally for bin 2 we'd use information from below,
		// but that's pretty hard to do.
		//	'SRGGB10_CSI2P' : 1332x990 
		//	'SRGGB12_CSI2P' : 2028x1080 2028x1520 4056x3040 
		//								bin 2x2   bin 1x1
		if (cg.currentBin == 1)
		{
			ss << cg.width;
			ss2 << cg.height;
			command += " --width " + ss.str() + " --height " + ss2.str();
		}
		else if (cg.currentBin == 2)
		{
			ss << cg.width / 2;
			ss2 << cg.height / 2;
			command += " --width " + ss.str() + " --height " + ss2.str();
		}
	}
	else
	{
		if (cg.currentBin == 1)
			command += " --mode 3";
		else if (cg.currentBin == 2)
		{
			ss << cg.width / 2;
			ss2 << cg.height / 2;
			command += " --mode 2 --width " + ss.str() + " --height " + ss2.str();
		}
	}

	if (myModeMeanSetting.meanAuto != MEAN_AUTO_OFF)
	{
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
	else if (cg.currentGain != cg.defaultGain)	// Is manual gain
	{
		ss.str("");
		ss << cg.currentGain;
		command += " --analoggain " + ss.str();
	}

/* TODO: what exif fields should we use?
	if (myModeMeanSetting.meanAuto != MEAN_AUTO_OFF) {
		stringstream strExposureTime;
		stringstream strReinforcement;
		strExposureTime <<  myRaspistillSetting.shutter_us;
		strReinforcement << myRaspistillSetting.analoggain;

		command += " --exif IFD0.Artist=li_" + strExposureTime.str() + "_" + strReinforcement.str();
	}
*/

	// libcamera: if the red and blue numbers are given it turns off AWB.
	// Check if R and B component are given
	if (! cg.currentAutoAWB) {
		ss.str("");
		ss << cg.currentWBR << "," << cg.currentWBB;
		if (! cg.isLibcamera)
			command += " --awb off";
		if (cg.currentWBR != cg.defaultWBR || cg.currentWBB != cg.defaultWBB)
			command += " --awbgains " + ss.str();
	}
	else {		// Use automatic white balance
		command += " --awb auto";
	}

	if (cg.rotation != cg.defaultRotation) {
		ss.str("");
		ss << cg.rotation;
		command += " --rotation " + ss.str();
	}

	if (cg.flip != cg.defaultFlip) {
		if (cg.flip == 1 || cg.flip == 3)
			command += " --hflip";		// horizontal flip
		if (cg.flip == 2 || cg.flip == 3)
			command += " --vflip";		// vertical flip
	}

	if (cg.saturation != cg.defaultSaturation) {
		ss.str("");
		ss << cg.saturation;
		command += " --saturation "+ ss.str();
	}

	if (cg.contrast != cg.defaultContrast) {
		ss.str("");
		ss << cg.contrast;
		command += " --contrast "+ ss.str();
	}

	if (cg.sharpness != cg.defaultSharpness) {
		ss.str("");
		ss << cg.sharpness;
		command += " --sharpness "+ ss.str();
	}

	if (cg.currentBrightness != cg.defaultBrightness) {
		ss.str("");
		if (cg.isLibcamera)
			// User enters -100 to 100.  Convert to -1.0 to 1.0.
			ss << (float) cg.currentBrightness / 100;
		else
			ss << cg.currentBrightness;
		command += " --brightness " + ss.str();
	}

	if (cg.quality != cg.defaultQuality) {
		ss.str("");
		ss << cg.quality;
		command += " --quality " + ss.str();
	}

	// Define char variable
	char cmd[command.length() + 1];
	// Convert command to character variable.
	// Log without the LIBCAMERA_LOG..., which just confuses users.
	strcpy(cmd, command.c_str());
	Log(2, "  > Capture command: %s\n", cmd);

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

	if (cg.isLibcamera)
	{
		// Tried putting this in putenv() but it didn't seem to work.
		command = "LIBCAMERA_LOG_LEVELS=ERROR,FATAL " + command;
		strcpy(cmd, command.c_str());
	}

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


//---------------------------------------------------------------------------------------------
//---------------------------------------------------------------------------------------------

int main(int argc, char *argv[])
{
	char * a = getenv("ALLSKY_HOME");		// This must come before anything else
	if (a != NULL)
		snprintf(CG.allskyHome, sizeof(CG.allskyHome)-1, "%s/", a);

	char bufTime[128]			= { 0 };
	char bufTemp[1024]			= { 0 };
	char const *bayer[]			= { "RG", "BG", "GR", "GB" };
	bool justTransitioned		= false;
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

	//---------------------------------------------------------------------------------------------
	//---------------------------------------------------------------------------------------------
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

	doLocale(CG);

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
		saveCameraInfo(ASICameraInfo, CG.CC_saveFile, iMaxWidth, iMaxHeight, pixelSize, bayer[ASICameraInfo.BayerPattern]);
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
			CG.currentExposure_us = CG.nightMaxAutoExposure_us;
			CG.currentMaxAutoExposure_us = CG.nightMaxAutoExposure_us;
			CG.currentBrightness = CG.nightBrightness;
			if (CG.isColorCamera)
			{
				CG.currentAutoAWB = false;
				CG.currentWBR = CG.nightWBR;
				CG.currentWBB = CG.nightWBB;
			}
			CG.currentDelay_ms = CG.nightDelay_ms;
			CG.currentBin = CG.nightBin;
			CG.currentGain = CG.nightGain;
			CG.currentMaxAutoGain = CG.nightMaxAutoGain;		// not needed since we're not using auto gain, but set to be consistent
			CG.currentAutoGain = false;
			CG.myModeMeanSetting.currentMean = NOT_SET;
			if (CG.isCooledCamera)
			{
				CG.currentEnableCooler = CG.nightEnableCooler;
				CG.currentTargetTemp = CG.nightTargetTemp;
			}
			CG.currentTuningFile = CG.nightTuningFile;

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
				snprintf(bufTemp, sizeof(bufTemp)-1, "%sscripts/endOfNight.sh &", CG.allskyHome);
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

				if (numExposures == 0 && CG.dayAutoExposure)
					CG.currentSkipFrames = CG.daySkipFrames;
				// We only skip initial frames if we are starting in daytime and using auto-exposure.
				CG.currentAutoExposure = CG.dayAutoExposure;
				CG.currentExposure_us = CG.dayExposure_us;
				CG.currentMaxAutoExposure_us = CG.dayMaxAutoExposure_us;
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
				CG.currentTuningFile = CG.dayTuningFile;
			}
		}

		else	// NIGHT
		{
			if (justTransitioned == true)
			{
				// Just transitioned from day to night, so execute end of day script
				Log(1, "Processing end of day data\n");
				snprintf(bufTemp, sizeof(bufTemp)-1, "%sscripts/endOfDay.sh &", CG.allskyHome);
				system(bufTemp);
				justTransitioned = false;
			}

			Log(1, "==========\n=== Starting nighttime capture ===\n==========\n");

			// We only skip initial frames if we are starting in nighttime and using auto-exposure.
			if (numExposures == 0 && CG.nightAutoExposure)
				CG.currentSkipFrames = CG.nightSkipFrames;

			CG.currentAutoExposure = CG.nightAutoExposure;
			CG.currentExposure_us = CG.nightExposure_us;
			CG.currentMaxAutoExposure_us = CG.nightMaxAutoExposure_us;
			CG.currentBrightness = CG.nightBrightness;
			if (CG.isColorCamera)
			{
				CG.currentAutoAWB = CG.nightAutoAWB;
				CG.currentWBR = CG.nightWBR;
				CG.currentWBB = CG.nightWBB;
			}
			CG.currentDelay_ms = CG.nightDelay_ms;
			CG.currentBin = CG.nightBin;
			CG.currentGain = CG.nightGain;
			CG.currentMaxAutoGain = CG.nightMaxAutoGain;
			CG.currentAutoGain = CG.nightAutoGain;
			CG.myModeMeanSetting.currentMean = CG.myModeMeanSetting.nightMean;
			if (CG.isCooledCamera)
			{
				CG.currentEnableCooler = CG.nightEnableCooler;
				CG.currentTargetTemp = CG.nightTargetTemp;
			}
			CG.currentTuningFile = CG.nightTuningFile;
		}
		// ========== Done with dark frame / day / night settings


		if (CG.myModeMeanSetting.currentMean > 0.0)
		{
			CG.myModeMeanSetting.modeMean = true;
			myModeMeanSetting.meanValue = CG.myModeMeanSetting.currentMean;
			if (! aegInit(CG, myRaspistillSetting, myModeMeanSetting))
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

			// For dark frames we already know the finalFilename.
			if (! CG.takeDarkFrames)
			{
				// Create the name of the file that goes in the images/<date> directory.
				snprintf(CG.finalFileName, sizeof(CG.finalFileName), "%s-%s.%s",
					CG.fileNameOnly, formatTime(exposureStartDateTime, "%Y%m%d%H%M%S"), CG.imageExt);
				snprintf(CG.fullFilename, sizeof(CG.fullFilename), "%s/%s", CG.saveDir, CG.finalFileName);
			}

			// Capture and save image
			retCode = RPicapture(CG, &pRgb);
			if (retCode == 0)
			{
				numExposures++;
Log(4, "xxx >>> Got here 1: numExposures=%d\n", numExposures);
				numErrors = 0;

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

Log(4, "xxx >>> Got here 2: calculating mean=\n");
					CG.lastMean = aegCalcMean(pRgb);
Log(4, "xxx >>> Got here 3: mean=%f\n", CG.lastMean);
					if (myModeMeanSetting.meanAuto != MEAN_AUTO_OFF)
					{
						// set myRaspistillSetting.shutter_us and myRaspistillSetting.analoggain
						aegGetNextExposureSettings(&CG, myRaspistillSetting, myModeMeanSetting);
Log(4, "xxx >>> Got here 4: called aegGetNextExposureSettings()\n");

						if (CG.lastMean == -1)
						{
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

					if (CG.currentSkipFrames == 0 &&
						CG.overlay.overlayMethod == OVERLAY_METHOD_LEGACY &&
						doOverlay(pRgb, CG, bufTime, 0) > 0)
					{
Log(4, "xxx >>> Got here 5: Added overlay, saving %s\n", CG.fullFilename);
						// if we added anything to overlay, write the file out
						bool result = cv::imwrite(CG.fullFilename, pRgb, compressionParameters);
						if (! result) fprintf(stderr, "*** ERROR: Unable to write to '%s'\n", CG.fullFilename);
					}
else {
Log(4, "xxx >>> Got here 6: will use Overlay Module.\n");
}
				}

				// We skip the initial frames to give auto-exposure time to
				// lock in on a good exposure.  If it does that quickly, stop skipping images.
				if (CG.goodLastExposure && CG.currentSkipFrames > 0)
				{
					Log(2, "Turning off Skip Frames\n");
					CG.currentSkipFrames = 0;
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
					char cmd[1100+sizeof(CG.allskyHome)];
					Log(1, "  > Saving %s image '%s'\n", CG.takeDarkFrames ? "dark" : dayOrNight.c_str(), CG.finalFileName);
					snprintf(cmd, sizeof(cmd), "%sscripts/saveImage.sh %s '%s'", CG.allskyHome, dayOrNight.c_str(), CG.fullFilename);

					// TODO: in the future the calculation of mean should independent from modeMean. -1 means don't display.
Log(4, "xxx >>> Got here 7: calling add_variables_to_command()\n");
					add_variables_to_command(CG, cmd, exposureStartDateTime);
					strcat(cmd, " &");
					system(cmd);
				}

				std::string s;
				if (CG.currentAutoExposure)
					s = "auto";
				else
					s = "manual";
Log(4, "xxx >>> Got here 8: doing %s pause between images\n", s.c_str());
				delayBetweenImages(CG, myRaspistillSetting.shutter_us, s);
			}
			else
			{
				numErrors++;
				int r = retCode >> 8;
				Log(1, " >>> WARNING: Unable to take picture, return code=%d, r=%d\n", retCode, r);
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

				if (numErrors >= maxErrors)
				{
					Log(0, "*** ERROR: maximum number of consecutive errors of %d reached; capture program stopped.\n", maxErrors);
					closeUp(EXIT_ERROR_STOP);
				}
	
				// Don't wait the full amount on error.
				long timeToSleep = (float)CG.currentDelay_ms * .25;
				Log(2, "  > Sleeping from failed exposure: %.1f seconds\n", (float)timeToSleep / MS_IN_SEC);
				usleep(timeToSleep * US_IN_MS);
			}

			// Check for day or night based on location and angle
			dayOrNight = calculateDayOrNight(CG.latitude, CG.longitude, CG.angle);
		}

		if (lastDayOrNight != dayOrNight)
			justTransitioned = true;
	}

	closeUp(EXIT_OK);
}
