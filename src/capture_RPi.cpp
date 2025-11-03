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
bool bMain						= true;
bool bDisplay					= false;
std::string dayOrNight;
int numTotalErrors				= 0;				// Total number of errors, fyi
int numConsecutiveErrors		= 0;				// Number of consecutive errors

bool gotSignal					= false;			// Did we get signal?
int iNumOfCtrl					= NOT_SET;			// Number of camera control capabilities
pthread_t threadDisplay			= 0;				// Not used by Rpi;
int numExposures				= 0;				// how many valid pictures have we taken so far?
int currentBpp					= NOT_SET;			// bytes per pixel: 8, 16, or 24
int currentBitDepth				= NOT_SET;			// 8 or 16
raspistillSetting myRaspistillSetting;
modeMeanSetting myModeMeanSetting;
std::string errorOutput;
std::string metadataFile = "";
std::string metadataArgs = "";


//---------------------------------------------------------------------------------------------
//---------------------------------------------------------------------------------------------


bool readMetadataFile(string file);		// forward definition

// Display what's in the libcamera output debug file.
std::string showDebugFile(string debugFile)
{
		// Ignore info lines - we only care about errors.
		std::string command, errMsg;
		command = "grep -E -v 'Mode selection|Score|configuration adjusted' " + debugFile;
		errMsg = exec(command.c_str());
		return(errMsg);
}

// Build capture command to capture the image from the camera.
// If an argument is IS_DEFAULT, the user didn't set it so don't pass to the program and
// the default will be used.
string savedImage = "";
int RPicapture(config cg, cv::Mat *image)
{
	stringstream ss, ss2, ss_cmd;		// temporary variables

	// Ensure no prior process is still running.
	ss_cmd << cg.cmdToUse;
	string kill = "pkill --signal SIGKILL '" + ss_cmd.str() + "' 2> /dev/null";
	static bool showed_kill_command = false;
	if (! showed_kill_command) {
		// only show once - it never changes
		showed_kill_command = true;
		Log(4, " > Kill command: %s\n", kill.c_str());
	}
	system(kill.c_str());

	if (myModeMeanSetting.meanAuto != MEAN_AUTO_OFF)
	{
		cg.currentExposure_us = myRaspistillSetting.shutter_us;
	}

	// The command sometimes hangs so put a timeout on it that's longer than the exposure time.
	// When AWB is enable, up to 5 images can be taken before control is returned to us.
	long m = 1.0;
	if (cg.currentAutoAWB) m = 5.0;
	long timeout_s = ((cg.currentExposure_us / US_IN_SEC) * m) + 300;		// guess on how much longer
	ss << timeout_s;

	// Define command line.
	string command = "timeout " + ss.str() + " " + ss_cmd.str();

	ss.str("");
	ss << cg.fullFilename;

	command += " --thumb none";		// don't include a thumbnail in the file
	command += " --immediate";		// speed up image taking
	savedImage = ss.str();
	command += " --output '" + savedImage + "'";

	// libcamera tuning file
	if (cg.currentTuningFile != NULL && *cg.currentTuningFile != '\0') {
		ss.str("");
		ss << cg.currentTuningFile;
		command += " --tuning-file '" + ss.str() + "'";
	}

	if (strcmp(cg.imageExt, "png") == 0)
		command += " --encoding png";

	// --timeout (in MS) determines how long the video will run before it takes a picture.
	// Value of 0 runs forever.
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

	// https://www.raspberrypi.com/documentation/accessories/camera.html#raspistill
	// Mode		Size		Aspect Ratio	Frame rates		FOV		Binning/Scaling
	// 0		automatic selection
	// 1		2028x1080		169:90		0.1-50fps		Partial	2x2 binned
	// 2		2028x1520		4:3			0.1-50fps		Full	2x2 binned	<<< bin==2
	// 3		4056x3040		4:3			0.005-10fps		Full	None		<<< bin==1
	// 4		1332x990		74:55		50.1-120fps		Partial	2x2 binned	<<< else 

	ss.str("");
	ss2.str("");
	// Ideally for bin 2 we'd use information from below,
	// but that's pretty hard to do.
	//	'SRGGB10_CSI2P' : 1332x990 
	//	'SRGGB12_CSI2P' : 2028x1080 2028x1520 4056x3040 
	//								bin 2x2   bin 1x1
	// cg.width and cg.height are already reduced for binning as needed.
	if (cg.currentBin == 1 || cg.currentBin == 2)
	{
		ss << cg.width;
		ss2 << cg.height;
		command += " --width " + ss.str() + " --height " + ss2.str();
	}

	// Check if automatic determined exposure time is selected
	if (cg.currentAutoExposure)
	{
		if (myModeMeanSetting.meanAuto != MEAN_AUTO_OFF) {
			ss.str("");
			ss << cg.currentExposure_us;
			command += " --shutter " + ss.str();
		} else {
			// libcamera doesn't use "exposure off/auto".  For auto-exposure set shutter to 0.
			command += " --shutter 0";
		}
	}
	else if (cg.currentExposure_us)		// manual exposure
	{
		ss.str("");
		ss << cg.currentExposure_us;
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
		else
		{
			command += " --analoggain 0";	// 0 makes it autogain
		}
	}
	else 	// Is manual gain
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
	if (cg.currentAutoAWB) {
		command += " --awb auto";
	}
	else {
		// If we don't specify when they are the default then auto mode is enabled.
		ss.str("");
		ss << cg.currentWBR << "," << cg.currentWBB;
		command += " --awbgains " + ss.str();
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

	if (cg.quality != cg.defaultQuality) {
		ss.str("");
		ss << cg.quality;
		command += " --quality " + ss.str();
	}

	if (*cg.extraArgs)
	{
		// add the extra arguments as is; do not parse them
		ss.str("");
		ss << cg.extraArgs;
		command += " " + ss.str();
	}

	// Log the command we're going to run without the
	//		LIBCAMERA_LOG...
	// string and without any redirect of stdout or stderr.
	// Those strings confuse some users.

	// Tried putting this in putenv() but it didn't seem to work.
	char const *s1 = "LIBCAMERA_LOG_LEVELS=ERROR,FATAL ";

	string s2 = "";
	command += metadataArgs;
	s2 = " > " + errorOutput + " 2>&1";

	// Create the command we'll actually run.
	// It needs to include the current size plus future strings s1 and s2.
	int size = command.length() + strlen(s1) + s2.length() + 10;		// +10 "just in case"
	char cmd[size];
	strncpy(cmd, command.c_str(), size-1);
	Log(2, " > Running: %s\n", cmd);

	command = s1 + command + s2;
	strncpy(cmd, command.c_str(), size-1);

	// Execute the command.
	int ret = system(cmd);
	if (WIFEXITED(ret) && WEXITSTATUS(ret) == 0)
	{
		*image = cv::imread(cg.fullFilename, cv::IMREAD_UNCHANGED);
		if (! image->data) {
			Log(-1, "*** %s: WARNING: Error re-reading file '%s'; skipping further processing.\n",
				cg.ME, basename(cg.fullFilename));
		}
		ret = 0;	// Makes it easier for caller to determine if there was an error.

		readMetadataFile(metadataFile);
	}
	else
	{
		// Unable to take picture.
		// The child command is "/bin/sh" and will basically never get a signal even
		// if the camera program does, so check for a signal in WEXITSTATUS() not ret.

		int l = 0;		// log level
		if (WIFSIGNALED(WEXITSTATUS(ret)))
		{
			l = 1;		// Don't send camera's message to WebUI.

			int sig_num = WTERMSIG(WEXITSTATUS(ret));
			if (sig_num == 124)		// The "timeout" command exits with this if a timeout occurred.
			{
				Log(-1, "WARNING: %s timed out taking image after %d seconds.\n", cg.cmdToUse, timeout_s);
			}
			else
			{
				Log(1, "WARNING: %s received signal %d, ret=0x%x\n", cg.cmdToUse, sig_num, ret);
			}
		}
		else if (WIFEXITED(ret))
		{
			// "Normal" return but command failed.
			Log(1, " >>> %s: WARNING: Unable to take picture, return code=0x%0x, WEXITSTATUS=0x%0x\n",
				cg.ME, ret, WEXITSTATUS(ret));
		}
		else
		{
			// Not sure what this would be...
			Log(1, " >>> %s: WARNING: Unable to take picture, command did not return normally, return code=0x%0x WEXITSTATUS=0x%0x\n",
				cg.ME, ret, WEXITSTATUS(ret));
		}

		// Add errorOutput to the log file.
		std::string m = showDebugFile(errorOutput).c_str();
		if (m != "") {
			Log(1, "********************\n");		// 1 so it doesn't go to WebUI.
			Log(l, "%s\n", m.c_str());
			Log(1, "********************\n");
		}
	}

	return(ret);
}

bool readMetadataFile(string file)
{
	char *buf = readFileIntoBuffer(&CG, file.c_str());
	if (buf == NULL)
	{
		CG.lastSensorTemp = NOT_CHANGED;
		// The other "last" values will use the requested values.
		return(false);
	}

	char *line;
	int on_line = 0;			// number of lines found
	(void) getLine(NULL);		// resets the buffer pointer
	while ((line = getLine(buf)) != NULL)
	{
		on_line++;
		Log(5, "Line %d: [%s]\n", on_line, line);
		if (*line == '\0')
		{
			continue;		// blank line
		}
		(void) getToken(NULL, '=');		// tells getToken() we have a new line.

		// Input lines are:  name=value
		char *name = getToken(line, '=');
		char *value = getToken(line, '=');
		if (value == NULL)
		{
			// "line" ends with newline
			Log(1, "%s: WARNING: skipping invalid line %d in '%s': [%s=%s]",
				CG.ME, on_line, file.c_str(), name,value);
			continue;
		}

		if (strcmp(name, "ExposureTime") == 0)
		{
			// integer
			int x = atoi(value);
			if (x != myRaspistillSetting.shutter_us)
			{
Log(5, "  ExposureTime %d !=  myRaspistillSetting.shutter_us (%d)\n", x, myRaspistillSetting.shutter_us);
// CG.lastExposure_us = myRaspistillSetting.shutter_us;		SHOULD be == auto/manual exposure algormithm value
			}
else Log(5, "  ExposureTime = %f ('%s')\n", x, value);
		}
		else if (strcmp(name, "ColourGains") == 0)
		{

			// [ float, float ]		red, blue
			int n = sscanf(value, "[ %lf, %lf ]", &CG.lastWBR, &CG.lastWBB);
			if (n != 2)
			{
				Log(1, "*** %s: WARNING, WBR and WBB not on line: '%s=%s'; num matches: %d.\n", CG.ME, name,value, n);
			}
else
Log(5, "  ColourGains: Red: %lf, Blue: %lf\n", CG.lastWBR, CG.lastWBB);
		}
		else if (strcmp(name, "SensorTemperature") == 0)
		{
			CG.lastSensorTemp = atof(value);
Log(5, "  SensorTemperature = %f ('%s')\n", CG.lastSensorTemp, value);

		}
		else if (strcmp(name, "AnalogueGain") == 0)
		{
			// float
			float x = atof(value);
			if (x != myRaspistillSetting.analoggain)
			{
Log(5, "  AnalogueGain %f !=  myRaspistillSetting.analoggain (%f)\n", x, myRaspistillSetting.analoggain);
// CG.lastGain =  myRaspistillSetting.analoggain; 		SHOULD be == auto/manual exposure algormithm value
			}
else Log(5, "  AnalogueGain = %f ('%s')\n", x, value);
		}
	}
	return(true);
}

//---------------------------------------------------------------------------------------------
//---------------------------------------------------------------------------------------------

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

	char bufTemp[1024]			= { 0 };
	char const *bayer[]			= { "RG", "BG", "GR", "GB" };
	bool justTransitioned		= false;
	ASI_ERROR_CODE asiRetCode;		// used for return code from ASI functions.
	int retCode;
	cv::Mat pRgb;							// the image

	//---------------------------------------------------------------------------------------------
	//---------------------------------------------------------------------------------------------
	setlinebuf(stdout);		// Line buffer output so entries appear in the log immediately.

	CG.ct = ctRPi;

	processConnectedCameras();	// exits on error

	ASI_CAMERA_INFO ASICameraInfo;
	// This gives a segmentation fault if cameraNumber isn't connected.
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

	errorOutput  = CG.saveDir;
	errorOutput += "/capture_RPi_debug.txt";
	metadataFile = CG.saveDir;
	metadataFile += "/metadata.txt";
	metadataArgs = " --metadata '" + metadataFile + "' --metadata-format txt";

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
		Log(0, "*** %s: ERROR: Unknown Image Type: %d\n", CG.ME, CG.imageType);
		exit(EXIT_ERROR_STOP);
	}

	//-------------------------------------------------------------------------------------------------------
	//-------------------------------------------------------------------------------------------------------

	displaySettings(CG);

	// Initialization
	// Have we displayed "not taking picture during day/night" messages, if applicable?
	bool displayedNoDaytimeMsg = false;
	bool displayedNoNighttimeMsg = false;

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
			// nightime gain, delay, and exposure to mimic a nightime shot.
			CG.currentSkipFrames = 0;
			CG.currentAutoExposure = false;
			CG.nightAutoExposure = false;
			CG.currentExposure_us = CG.nightMaxAutoExposure_us;
			CG.currentMaxAutoExposure_us = CG.nightMaxAutoExposure_us;
			if (CG.isColorCamera)
			{
				CG.currentAutoAWB = false;
				CG.currentWBR = CG.nightWBR;
				CG.currentWBB = CG.nightWBB;
			}
			CG.currentDelay_ms = CG.nightDelay_ms;
			CG.currentBin = CG.nightBin;
			CG.currentGain = CG.nightGain;
			// not needed since we're not using auto gain, but set to be consistent
			CG.currentMaxAutoGain = CG.nightMaxAutoGain;
			CG.currentAutoGain = false;
			CG.myModeMeanSetting.currentMean = NOT_SET;
			CG.myModeMeanSetting.currentMean_threshold = NOT_SET;
			if (CG.isCooledCamera)
			{
				CG.currentEnableCooler = CG.nightEnableCooler;
				CG.currentTargetTemp = CG.nightTargetTemp;
			}
			CG.currentTuningFile = CG.nightTuningFile;

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
				// Not too useful to check return code for commands run in the background.
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

			if (numExposures == 0 && CG.dayAutoExposure)
				CG.currentSkipFrames = CG.daySkipFrames;
			// We only skip initial frames if we are starting in daytime and using auto-exposure.
			CG.currentAutoExposure = CG.dayAutoExposure;
			CG.currentExposure_us = CG.dayExposure_us;
			CG.currentMaxAutoExposure_us = CG.dayMaxAutoExposure_us;
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
			CG.myModeMeanSetting.currentMean_threshold = CG.myModeMeanSetting.dayMean_threshold;
			if (CG.isCooledCamera)
			{
				CG.currentEnableCooler = CG.dayEnableCooler;
				CG.currentTargetTemp = CG.dayTargetTemp;
			}
			CG.currentTuningFile = CG.dayTuningFile;
		}

		else	// NIGHT
		{
			if (justTransitioned == true)
			{
				// Just transitioned from day to night, so execute end of day script
				Log(1, "Processing end of day data\n");
				snprintf(bufTemp, sizeof(bufTemp)-1, "%s/endOfDay.sh &", CG.allskyScripts);
				// Not too useful to check return code for commands run in the background.
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

			CG.currentAutoExposure = CG.nightAutoExposure;
			CG.currentExposure_us = CG.nightExposure_us;
			CG.currentMaxAutoExposure_us = CG.nightMaxAutoExposure_us;
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
			CG.myModeMeanSetting.currentMean_threshold = CG.myModeMeanSetting.nightMean_threshold;
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
			// Using Allsky auto-exposure/gain algorithm
			CG.myModeMeanSetting.modeMean = true;
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
		}

		// Here and below, indent sub-messages with "  > " so it's clear they go with the un-indented line.
		// This simply makes it easier to see things in the log file.

		// Wait for switch day time -> night time or night time -> day time
		while (bMain && lastDayOrNight == dayOrNight)
		{
			if (CG.focusMode && numExposures == 1)
			{
				// Once we know the correct exposure, manual exposure and gain are faster.
				if (CG.currentAutoExposure)
				{
					Log(1, "Turning off auto-exposure due to focus mode\n");
					CG.currentAutoExposure = false;
				}
				if (CG.currentAutoGain)
				{
					Log(1, "Turning off auto-gain due to focus mode\n");
					CG.currentAutoGain = false;
				}
	
				CG.myModeMeanSetting.modeMean = false;
				myModeMeanSetting.meanAuto = MEAN_AUTO_OFF;
			}

			// date/time is added to many log entries to make it easier to associate them
			// with an image (which has the date/time in the filename).
			exposureStartDateTime = getTimeval();
			char exposureStart[128];
			snprintf(exposureStart, sizeof(exposureStart), "%s", formatTime(exposureStartDateTime, "%F %T"));
			Log(2, "-----\n");
			Log(1, "STARTING EXPOSURE at: %s   @ %s\n", exposureStart, length_in_units(myRaspistillSetting.shutter_us, true));

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
				numConsecutiveErrors = 0;

				// Don't use mask for dark frames.
				CG.lastMean = aegCalcMean(pRgb, CG.takeDarkFrames ? false : true);

// TODO: NEW: use current values if manual mode, otherwise use the value from metadata.
				if (CG.currentAutoAWB)
				{
					CG.lastWBR = CG.currentWBR;
					CG.lastWBB = CG.currentWBB;
				}

				if (! CG.takeDarkFrames)
				{
					CG.lastFocusMetric = CG.determineFocus ? (int)round(get_focus_metric(pRgb)) : -1;

					CG.lastExposure_us = myRaspistillSetting.shutter_us;
					if (myModeMeanSetting.meanAuto != MEAN_AUTO_OFF)
					{
						CG.lastGain =  myRaspistillSetting.analoggain;
					}
					else
					{
						CG.lastGain = CG.currentGain;	// ZWO gain=0.1 dB , RPi gain=factor
					}

					if (myModeMeanSetting.meanAuto != MEAN_AUTO_OFF)
					{
						// set myRaspistillSetting.shutter_us and myRaspistillSetting.analoggain
						aegGetNextExposureSettings(&CG, myRaspistillSetting, myModeMeanSetting);
					}
					else {
						myRaspistillSetting.shutter_us = CG.currentExposure_us;
						myRaspistillSetting.analoggain = CG.currentGain;
					}
				}

				// We skip the initial frames to give auto-exposure time to
				// lock in on a good exposure.  If it does that quickly, stop skipping images.
				if (CG.goodLastExposure && CG.currentSkipFrames > 0)
				{
					Log(2, "  >>>> Turning off Skip Frames\n");
					CG.currentSkipFrames = 0;
				}

				if (CG.currentSkipFrames > 0)
				{
					CG.currentSkipFrames--;
					Log(2, "  >>>> Skipping this frame.  %d left to skip\n", CG.currentSkipFrames);
					// Do not save this frame or sleep after it.
					// We just started taking images so no need to check if DAY or NIGHT changed.
					if (remove(CG.fullFilename) != 0)
						Log(0, "*** %s: ERROR: Unable to remove '%s': %s\n",
							CG.ME, CG.fullFilename, strerror(errno));
					continue;
				}
				else if (meanIsOK(&CG, exposureStartDateTime))	// meanIsOK() outputs messages
				{
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

					// Not too useful to check return code for commands run in the background.
					system(cmd);
				} else {
					// We're not using the image so delete it.
					unlink(savedImage.c_str());
				}

				std::string s;
				if (CG.currentAutoExposure)
					s = "auto";
				else
					s = "manual";
				delayBetweenImages(CG, myRaspistillSetting.shutter_us, s);
			}
			else
			{
				// Unable to take picture.
				numTotalErrors++;
				numConsecutiveErrors++;
				if ((numConsecutiveErrors % CG.maxErrors) == 0)
				{
					Log(0, "*** %s: ERROR: maximum number of consecutive errors of %d reached; capture program stopped. Total errors=%'d.\n", CG.ME, CG.maxErrors, numTotalErrors);
					Log(0, "Make sure cable between camera and Pi is all the way in.\n");
					std::string m = showDebugFile(errorOutput).c_str();
					if (m != "") {
						Log(0, "The last error was: %s", showDebugFile(errorOutput).c_str());
					}
					closeUp(EXIT_ERROR_STOP);
				}
	
				// Don't wait the full amount of time on error in case the error was a one-off.
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

