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
config cg;					// holds all configuration variables

#include "include/RPiHQ_raspistill.h"
#include "include/mode_RPiHQ_mean.h"

#define CAMERA_TYPE				"RPi"
#define IS_RPi
#include "ASI_functions.cpp"

using namespace std;

// Define's specific to this camera type.  Others that apply to all camera types are in allsky_common.h
#define DEFAULT_FONTSIZE		32
#define DEFAULT_DAYGAIN			1.0
#define DEFAULT_DAYAUTOGAIN		true
#define DEFAULT_DAYMAXGAIN		16.0
#define DEFAULT_NIGHTGAIN		4.0
#define DEFAULT_NIGHTAUTOGAIN	true
#define DEFAULT_NIGHTMAXGAIN	16.0


#define DEFAULT_DAYWBR			2.5
#define DEFAULT_DAYWBB			2.0
#define DEFAULT_NIGHTWBR		DEFAULT_DAYWBR		// change if people report different values for night
#define DEFAULT_NIGHTWBB		DEFAULT_DAYWBB		// change if people report different values for night

//-------------------------------------------------------------------------------------------------------
//-------------------------------------------------------------------------------------------------------

// These are global so they can be used by other routines.
// Variables for command-line settings are first.
long actualTemp				= -999;					// temp of sensor during last image. -999 means not supported
timeval exposureStartDateTime;						// date/time an image started
char allskyHome[100]			= { 0 };

std::vector<int> compressionParameters;
bool bMain					= true;
bool bDisplay				= false;
std::string dayOrNight;
int numErrors				= 0;					// Number of errors in a row
bool gotSignal				= false;				// did we get a SIGINT (from keyboard), or SIGTERM/SIGHUP (from service)?
int iNumOfCtrl				= NOT_SET;				// Number of camera control capabilities
pthread_t threadDisplay		= 0;					// Not used by Rpi;
int numExposures			= 0;					// how many valid pictures have we taken so far?
double minSaturation;								// produces black and white
double maxSaturation;
double defaultSaturation;
long minBrightness;									// what user enters on command line
long maxBrightness;
long defaultBrightness;
int currentBpp				= NOT_SET;				// bytes per pixel: 8, 16, or 24
int currentBitDepth			= NOT_SET;				// 8 or 16
float mean					= NOT_SET;				// mean brightness of image
raspistillSetting myRaspistillSetting;
modeMeanSetting myModeMeanSetting;

//-------------------------------------------------------------------------------------------------------
//-------------------------------------------------------------------------------------------------------


char const *getCameraCommand(bool libcamera)
{
	if (libcamera)
		return("libcamera-still");
	else
		return("raspistill");
}

// Build capture command to capture the image from the camera.
int RPicapture(config cg, cv::Mat *image)
{
	// Define command line.
	string command = getCameraCommand(cg.isLibcamera);

	// Ensure no process is still running.
	string kill = "pgrep '" + command + "' | xargs kill -9 2> /dev/null";
	char kcmd[kill.length() + 1];		// Define char variable
	strcpy(kcmd, kill.c_str());			// Convert command to character variable
	Log(5, " > Kill command: %s\n", kcmd);
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
			if (myModeMeanSetting.modeMean && myModeMeanSetting.meanAuto != MEAN_AUTO_OFF)
				ss << 1;	// We do our own auto-exposure so no need to wait at all.
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
		command += " --timeout " + ss.str();
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

	if (myModeMeanSetting.modeMean && myModeMeanSetting.meanAuto != MEAN_AUTO_OFF)
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
		if (myModeMeanSetting.modeMean && myModeMeanSetting.meanAuto != MEAN_AUTO_OFF) {
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
		if (myModeMeanSetting.modeMean && myModeMeanSetting.meanAuto != MEAN_AUTO_OFF)
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
	else	// Is manual gain
	{
		ss.str("");
		ss << cg.currentGain;
		command += " --analoggain " + ss.str();
	}

	if (myModeMeanSetting.modeMean && myModeMeanSetting.meanAuto != MEAN_AUTO_OFF) {
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

	ss.str("");
	ss << cg.saturation;
	command += " --saturation "+ ss.str();

	ss.str("");
	if (cg.isLibcamera)
		ss << (float) cg.currentBrightness / 100;	// User enters -100 to 100.  Convert to -1.0 to 1.0.
	else
		ss << cg.currentBrightness;
	command += " --brightness " + ss.str();

	ss.str("");
	ss << cg.quality;
	command += " --quality " + ss.str();

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

	Log(1, "  > Capture command: %s\n", cmd);

	// Execute the command.
	int ret = system(cmd);
	if (ret == 0)
	{
		*image = cv::imread(cg.fullFilename, cv::IMREAD_UNCHANGED);
		if (! image->data) {
			printf("WARNING: Error re-reading file '%s'; skipping further processing.\n", basename(cg.fullFilename));
		}
	}
	return(ret);
}


//-------------------------------------------------------------------------------------------------------
//-------------------------------------------------------------------------------------------------------

int main(int argc, char *argv[])
{
	char * a = getenv("ALLSKY_HOME");		// This needs to come before anything else
	if (a != NULL)
		snprintf(allskyHome, sizeof(allskyHome)-1, "%s/", a);

	setDefaults(&cg, ctRPi);

	cg.tty = isatty(fileno(stdout)) ? true : false;
	signal(SIGINT, IntHandle);
	signal(SIGTERM, IntHandle);	// The service sends SIGTERM to end this program.
	signal(SIGHUP, sig);		// xxxxxxxxxx TODO: Re-read settings (we currently just restart).

	char bufTime[128]			= { 0 };
	char bufTemp[1024]			= { 0 };
	char const *bayer[]			= { "RG", "BG", "GR", "GB" };
	bool endOfNight				= false;

	// We need to know its value before setting other variables.
	if (argc > 2 && strcmp(argv[1], "-cmd") == 0 && strcmp(argv[2], "libcamera") == 0)
	{
		cg.isLibcamera = true;
	} else {
		cg.isLibcamera = false;
	}

	// All the font settings apply to both day and night.
	long lastExposure_us 		= 0;					// last exposure taken
	double lastGain				= 0.0;					// last gain taken
	if (cg.isLibcamera)
	{
		defaultSaturation		= 1.0;
		minSaturation			= 0.0;
		maxSaturation			= 2.0;

		defaultBrightness		= 0;
		minBrightness			= -100;
		maxBrightness			= 100;
	}
	else
	{
		defaultSaturation		= 0.0;
		minSaturation			= -100.0;
		maxSaturation			= 100.0;

		defaultBrightness		= 50;
		minBrightness			= 0;
		maxBrightness			= 100;
	}
	cg.saturation					= defaultSaturation;
	cg.dayBrightness				= defaultBrightness;
	cg.nightBrightness				= defaultBrightness;

	int retCode;
	cv::Mat pRgb;							// the image

	//-------------------------------------------------------------------------------------------------------
	//-------------------------------------------------------------------------------------------------------
	setlinebuf(stdout);		// Line buffer output so entries appear in the log immediately.

	if (! getCommandLineArguments(&cg, argc, argv))
	{
		// getCommandLineArguents outputs an error message.
		exit(EXIT_ERROR_STOP);
	}

// TODO: after merging myModeMeanSetting into cg.myModeMeanSetting, delete these lines.
	myModeMeanSetting.dayMean = cg.myModeMeanSetting.dayMean;
	myModeMeanSetting.nightMean = cg.myModeMeanSetting.nightMean;
	myModeMeanSetting.mean_threshold = cg.myModeMeanSetting.mean_threshold;
	myModeMeanSetting.mean_p0 = cg.myModeMeanSetting.mean_p0;
	myModeMeanSetting.mean_p1 = cg.myModeMeanSetting.mean_p1;
	myModeMeanSetting.mean_p2 = cg.myModeMeanSetting.mean_p2;

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
const double minGain = 1.0;		// TODO: determine based on camera
	if (! cg.saveCC)
	{
		// xxxx TODO: NO_MAX_VALUE will be replaced by acutal values

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

		validateLong(&cg.dayBrightness, minBrightness, maxBrightness, "Daytime Brightness", true);
		validateLong(&cg.dayDelay_ms, 10, NO_MAX_VALUE, "Daytime Delay", false);
		validateFloat(&cg.dayMaxAutoGain, 1, NO_MAX_VALUE, "Daytime Max Auto-Gain", true);
		validateFloat(&cg.dayGain, 1, cg.dayAutoGain ? cg.dayMaxAutoGain : NO_MAX_VALUE, "Daytime Gain", true);
		validateLong(&cg.dayBin, 1, 3, "Daytime Binning", false);
		validateFloat(&cg.dayWBR, 0, NO_MAX_VALUE, "Daytime Red Balance", true);
		validateFloat(&cg.dayWBB, 0, NO_MAX_VALUE, "Daytime Blue Balance", true);
		validateLong(&cg.daySkipFrames, 0, 50, "Daytime Skip Frames", true);

		validateLong(&cg.nightBrightness, minBrightness, maxBrightness, "Nighttime Brightness", true);
		validateLong(&cg.nightDelay_ms, 10, NO_MAX_VALUE, "Nighttime Delay", false);
		validateFloat(&cg.nightMaxAutoGain, 0, NO_MAX_VALUE, "Nighttime Max Auto-Gain", true);
		validateFloat(&cg.nightGain, 0, cg.nightAutoGain ? cg.nightMaxAutoGain : NO_MAX_VALUE, "Nighttime Gain", true);
		validateLong(&cg.nightBin, 1, 3, "Nighttime Binning", false);
		validateFloat(&cg.nightWBR, 0, NO_MAX_VALUE, "Nighttime Red Balance", true);
		validateFloat(&cg.nightWBB, 0, NO_MAX_VALUE, "Nighttime Blue Balance", true);
		validateLong(&cg.nightSkipFrames, 0, 50, "Nighttime Skip Frames", true);

		validateFloat(&cg.saturation, minSaturation, maxSaturation, "Saturation", true);
		validateLong(&cg.rotation, 0, 180, "Rotation", true);
		if (cg.imageType != AUTO_IMAGE_TYPE)
			validateLong(&cg.imageType, 0, ASI_IMG_END, "Image Type", false);
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

		// libcamera only supports 0 and 180 degree rotation
		if (cg.rotation != 0)
		{
			if (cg.isLibcamera)
			{
				if (cg.rotation != 180)
				{
					Log(0, "%s*** ERROR: Only 0 and 180 degrees are supported for rotation; you entered %ld.%s\n", c(KRED), cg.rotation, c(KNRM));
					closeUp(EXIT_ERROR_STOP);
				}
			}
			else if (cg.rotation != 90 && cg.rotation != 180 && cg.rotation != 270)
			{
				Log(0, "%s*** ERROR: Only 0, 90, 180, and 270 degrees are supported for rotation; you entered %ld.%s\n", c(KRED), cg.rotation, c(KNRM));
				closeUp(EXIT_ERROR_STOP);
			}
		}
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
		validateLong(&cg.width, 0, iMaxWidth, "Width", false);
		validateLong(&cg.height, 0, iMaxHeight, "Height", false);
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

	// Handle "auto" imageType.
	if (cg.imageType == AUTO_IMAGE_TYPE)
	{
		// user will have to manually set for 8- or 16-bit mono mode
		cg.imageType = IMG_RGB24;
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
		cg.sType = "RAW8";
		currentBpp = 1;
		currentBitDepth = 8;
	}
	else
	{
		Log(0, "*** ERROR: Unknown Image Type: %d\n", cg.imageType);
		exit(EXIT_ERROR_STOP);
	}

	//-------------------------------------------------------------------------------------------------------
	//-------------------------------------------------------------------------------------------------------

	displaySettings(cg);

	// Initialization
	int originalITextX		= cg.overlay.iTextX;
	int originalITextY		= cg.overlay.iTextY;
	int originalFontsize	= cg.overlay.fontsize;
	int originalLinewidth	= cg.overlay.linewidth;
	// Have we displayed "not taking picture during day" message, if applicable?
	bool displayedNoDaytimeMsg = false;

	if (cg.tty)
		printf("*** Press Ctrl+C to stop ***\n\n");

	// Start taking pictures

	while (bMain)
	{
		// Find out if it is currently DAY or NIGHT
		dayOrNight = calculateDayOrNight(cg.latitude, cg.longitude, cg.angle);
		std::string lastDayOrNight = dayOrNight;

		if (cg.takingDarkFrames)
		{
			// We're doing dark frames so turn off autoexposure and autogain, and use
			// nightime gain, delay, exposure, and brightness to mimic a nightime shot.
			cg.currentSkipFrames = 0;
			cg.currentAutoExposure = false;
			cg.nightAutoExposure = false;
			cg.currentAutoGain = false;
			cg.currentGain = cg.nightGain;
			cg.currentMaxAutoGain = cg.nightMaxAutoGain;		// not needed since we're not using auto gain, but set to be consistent
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
// TODO: after merging myModeMeanSetting into cg.myModeMeanSetting, delete these lines.
myModeMeanSetting.modeMean = cg.myModeMeanSetting.modeMean;

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

				cg.currentExposure_us = cg.dayExposure_us;
				cg.currentMaxAutoExposure_us = cg.dayMaxAutoExposure_us;
				cg.currentAutoExposure = cg.dayAutoExposure;
				cg.currentBrightness = cg.dayBrightness;
				if (cg.isColorCamera)
				{
					cg.currentAutoAWB = cg.dayAutoAWB;
					cg.currentWBR = cg.dayWBR;
					cg.currentWBB = cg.dayWBB;
				}
				cg.currentDelay_ms = cg.dayDelay_ms;
				cg.currentBin = cg.dayBin;
				cg.currentGain = cg.dayGain;
				cg.currentMaxAutoGain = cg.dayMaxAutoGain;
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
			cg.currentExposure_us = cg.nightExposure_us;
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
			cg.currentGain = cg.nightGain;
			cg.currentMaxAutoGain = cg.nightMaxAutoGain;
			cg.currentAutoGain = cg.nightAutoGain;
			if (cg.isCooledCamera)
			{
				cg.currentEnableCooler = cg.nightEnableCooler;
				cg.currentTargetTemp = cg.nightTargetTemp;
			}
			cg.myModeMeanSetting.currentMean = cg.myModeMeanSetting.nightMean;
		}
		// ========== Done with dark fram / day / night settings


		if (cg.myModeMeanSetting.currentMean > 0.0)
		{
			cg.myModeMeanSetting.modeMean = true;
			myModeMeanSetting.meanValue = cg.myModeMeanSetting.currentMean;
			if (! aegInit(cg, cg.cameraMinExposure_us, minGain, myRaspistillSetting, myModeMeanSetting))
			{
				closeUp(EXIT_ERROR_STOP);
			}
		}
		else
		{
			cg.myModeMeanSetting.modeMean = false;
		}
// TODO: after merging myModeMeanSetting into cg.myModeMeanSetting, delete this line.
myModeMeanSetting.modeMean = cg.myModeMeanSetting.modeMean;

		// Want initial exposures to have the exposure time and gain the user specified.
		if (numExposures == 0)
		{
			myRaspistillSetting.shutter_us = cg.currentExposure_us;
			myRaspistillSetting.analoggain = cg.currentGain;
		}

		if (numExposures == 0 || cg.dayBin != cg.nightBin)
		{
			// Adjusting variables for chosen binning.
			// Only need to do at the beginning and if bin changes.
			cg.height				= originalHeight / cg.currentBin;
			cg.width				= originalWidth / cg.currentBin;
			cg.overlay.iTextX		= originalITextX / cg.currentBin;
			cg.overlay.iTextY		= originalITextY / cg.currentBin;
			cg.overlay.fontsize		= originalFontsize / cg.currentBin;
			cg.overlay.linewidth	= originalLinewidth / cg.currentBin;

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
			Log(0, "STARTING EXPOSURE at: %s   @ %s\n", exposureStart, length_in_units(myRaspistillSetting.shutter_us, true));

			// Get start time for overlay. Make sure it has the same time as exposureStart.
			if (cg.overlay.showTime)
			{
				sprintf(bufTime, "%s", formatTime(exposureStartDateTime, cg.timeFormat));
			}

			if (! cg.takingDarkFrames)
			{
				// Create the name of the file that goes in the images/<date> directory.
				snprintf(cg.finalFileName, sizeof(cg.finalFileName), "%s-%s.%s",
					cg.fileNameOnly, formatTime(exposureStartDateTime, "%Y%m%d%H%M%S"), cg.imageExt);
			}
			snprintf(cg.fullFilename, sizeof(cg.fullFilename), "%s/%s", cg.saveDir, cg.finalFileName);

			// Capture and save image
			retCode = RPicapture(cg, &pRgb);
			if (retCode == 0)
			{
				numExposures++;

				int focusMetric;
				focusMetric = cg.overlay.showFocus ? (int)round(get_focus_metric(pRgb)) : -1;

				// If takingDarkFrames is off, add overlay text to the image
				if (! cg.takingDarkFrames)
				{
					lastExposure_us = myRaspistillSetting.shutter_us;
					if (cg.myModeMeanSetting.modeMean && myModeMeanSetting.meanAuto != MEAN_AUTO_OFF)
					{
						lastGain =  myRaspistillSetting.analoggain;
					}
					else
					{
						lastGain = cg.currentGain;	// ZWO gain=0.1 dB , RPi gain=factor
					}

					mean = -1;
					if (cg.myModeMeanSetting.modeMean && myModeMeanSetting.meanAuto != MEAN_AUTO_OFF)
					{
if (lastExposure_us != myRaspistillSetting.shutter_us)
  Log(0, " xxxx lastExposure_us (%ld) != shutter_us (%ld)\n", lastExposure_us, myRaspistillSetting.shutter_us);
//xxx						mean = aegCalcMean(pRgb, cg.currentExposure_us, cg.currentGain,
						mean = aegCalcMean(pRgb);
						aegGetNextExposureSettings(mean, lastExposure_us, lastGain,
								myRaspistillSetting, myModeMeanSetting);

						Log(2, "  > Got exposure: %s, gain: %1.3f,", length_in_units(lastExposure_us, false), lastGain);
						Log(2, " shutter: %s, quickstart: %d, mean=%1.3f\n", length_in_units(myRaspistillSetting.shutter_us, false), myModeMeanSetting.quickstart, mean);
						if (mean == -1)
						{
							numErrors++;
							Log(-1, "ERROR: aegCalcMean() returned mean of -1.\n");
							Log(1, "  > Sleeping from failed exposure: %.1f seconds\n", (float)cg.currentDelay_ms / MS_IN_SEC);
							usleep(cg.currentDelay_ms * US_IN_MS);
							continue;
						}
					}
					else {
						myRaspistillSetting.shutter_us = cg.currentExposure_us;
						myRaspistillSetting.analoggain = cg.currentGain;
					}

					if (cg.currentSkipFrames == 0 && ! cg.overlay.externalOverlay && doOverlay(pRgb, cg, bufTime,
						lastExposure_us, actualTemp, lastGain, 0, mean, focusMetric) > 0)
					{
						// if we added anything to overlay, write the file out
						bool result = cv::imwrite(cg.fullFilename, pRgb, compressionParameters);
						if (! result) fprintf(stderr, "*** ERROR: Unable to write to '%s'\n", cg.fullFilename);
					}
				}

				if (cg.currentSkipFrames > 0)
				{
					Log(2, "  >>>> Skipping this frame\n");
					cg.currentSkipFrames--;
					// Do not save this frame or sleep after it.
					// We just started taking images so no need to check if DAY or NIGHT changed
					continue;
				}
				else
				{
					// We primarily skip the initial frames to give auto-exposure time to
					// lock in on a good exposure.  If it does that quickly, stop skipping images.
					if (cg.goodLastExposure)
					{
						cg.currentSkipFrames = 0;
					}

					char cmd[1100+sizeof(allskyHome)];
					Log(1, "  > Saving %s image '%s'\n", cg.takingDarkFrames ? "dark" : dayOrNight.c_str(), cg.finalFileName);
					snprintf(cmd, sizeof(cmd), "%sscripts/saveImage.sh %s '%s'", allskyHome, dayOrNight.c_str(), cg.fullFilename);

					// TODO: in the future the calculation of mean should independent from modeMean. -1 means don't display.
					float m = (cg.myModeMeanSetting.modeMean && myModeMeanSetting.meanAuto != MEAN_AUTO_OFF) ? mean : -1.0;
					add_variables_to_command(cmd, exposureStartDateTime,
						lastExposure_us, cg.currentBrightness, m,
						cg.currentAutoExposure, cg.currentAutoGain, cg.currentAutoAWB, cg.currentWBR, cg.currentWBB,
						actualTemp, lastGain, cg.currentBin, getFlip(cg.flip), currentBitDepth, focusMetric);
					strcat(cmd, " &");
					system(cmd);
				}

				if (cg.myModeMeanSetting.modeMean && myModeMeanSetting.quickstart && myModeMeanSetting.meanAuto != MEAN_AUTO_OFF)
				{
					long x = 1 * US_IN_SEC;
					Log(0, "Sleeping 1 second (quickstart on, %d left)...\n", myModeMeanSetting.quickstart);
					usleep(x);
				}
				else
				{
					std::string s;
					if (cg.currentAutoExposure)
						s = "auto";
					else
						s = "manual";
					delayBetweenImages(cg, myRaspistillSetting.shutter_us, s);
				}
			}
			else
			{
				numErrors++;
				int r = retCode >> 8;
				printf(" >>> Unable to take picture, return code=%d, r=%d\n", retCode, r);
				if (WIFSIGNALED(r)) r = WTERMSIG(r);
				{
					// Got a signal.  See if it's one we care about.
					std::string z = "";
					if (r == SIGINT) z = "SIGINT";
					else if (r == SIGTERM) z = "SIGTERM";
					else if (r == SIGHUP) z = "SIGHUP";
					if (z != "")
					{
						printf("xxxx Got %s in %s\n", z.c_str(), getCameraCommand(cg.isLibcamera));
					}
					else
					{
						printf("xxxx Got signal %d in capture_RPiHQ.cpp\n", r);
					}
				}
				// Don't wait the full amount on error.
				long timeToSleep = (float)cg.currentDelay_ms * .25;
				Log(1, "  > Sleeping from failed exposure: %.1f seconds\n", (float)timeToSleep / MS_IN_SEC);
				usleep(timeToSleep * US_IN_MS);
			}

			// Check for day or night based on location and angle
			dayOrNight = calculateDayOrNight(cg.latitude, cg.longitude, cg.angle);
		}

		if (lastDayOrNight == "NIGHT")
		{
			// Flag end of night processing is needed
			endOfNight = true;
		}
	}

	closeUp(EXIT_OK);
}
