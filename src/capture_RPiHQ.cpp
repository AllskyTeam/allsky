// 2022-01-14  MEAN_AUTO_MODE, depending in autoGain and autoExposure different modes are in use  
//			New optional start parameter -daymean.
//			User can define different values for day and night (autoExposure, Exposure, mean-value, ...).

#include <opencv2/core/core.hpp>
#include <opencv2/imgproc/imgproc.hpp>
#include <opencv2/highgui/highgui.hpp>
#include <sys/time.h>
#include <unistd.h>
#include <string.h>
#include <errno.h>
#include <string>
#include <iomanip>
#include <cstring>
#include <sstream>
#include <tr1/memory>
#include <stdlib.h>
#include <signal.h>
#include <fstream>
#include <stdarg.h>

#include "include/allsky_common.h"

// new includes (MEAN)
#include "include/RPiHQ_raspistill.h"
#include "include/mode_RPiHQ_mean.h"

using namespace std;

//-------------------------------------------------------------------------------------------------------
//-------------------------------------------------------------------------------------------------------

std::vector<int> compression_parameters;
bool bMain					= true;
//bool bDisplay = false;
std::string dayOrNight;

// These are global so they can be used by other routines.
int numErrors				= 0;	// Number of errors in a row.
int numExposures			= 0;	// how many valid pictures have we taken so far?
double currentGain			= NOT_SET;
float min_saturation;				// produces black and white
float max_saturation;
float default_saturation;
int min_brightness;					// what user enters on command line
int max_brightness;
int default_brightness;
int currentBrightness		= NOT_SET;
int asiFlip					= 0;
int current_bpp				= NOT_SET;	// bytes per pixel: 8, 16, or 24
int current_bit_depth		= NOT_SET;	// 8 or 16
int currentBin				= NOT_SET;
float mean					= NOT_SET;	// mean brightness of image

// Some command-line and other option definitions needed outside of main():
bool tty					= false;	// are we on a tty?
#define DEFAULT_NOTIFICATIONIMAGES 1
int notificationImages		= DEFAULT_NOTIFICATIONIMAGES;
#define DEFAULT_SAVEDIR		"tmp"
char const *save_dir		= DEFAULT_SAVEDIR;
#define DEFAULT_FILENAME	"image.jpg"
char const *fileName		= DEFAULT_FILENAME;
char final_file_name[200];	// final name of the file that's written to disk, with no directories
char full_filename[1000];	// full name of file written to disk
#define DEFAULT_TIMEFORMAT	"%Y%m%d %H:%M:%S"	// format the time should be displayed in
char const *timeFormat		= DEFAULT_TIMEFORMAT;
bool currentAutoExposure	= false;	// is auto-exposure currently on?
bool currentAutoGain		= false;	// is auto-gain currently on?
bool autoAWB				= false;
double WBR					= 2.5;
double WBB					= 2;

//bool bSavingImg = false;

raspistillSetting myRaspistillSetting;
modeMeanSetting myModeMeanSetting;

//-------------------------------------------------------------------------------------------------------
//-------------------------------------------------------------------------------------------------------

// Exit the program gracefully.
void closeUp(int e)
{
	static int closingUp = 0;		// indicates if we're in the process of exiting.
	// For whatever reason, we're sometimes called twice, but we should only execute once.
	if (closingUp) return;

	closingUp = 1;

	// If we're not on a tty assume we were started by the service.
	// Unfortunately we don't know if the service is stopping us, or restarting us.
	// If it was restarting there'd be no reason to copy a notification image since it
	// will soon be overwritten.  Since we don't know, always copy it.
	const char *a = "Stopping";
	if (notificationImages) {
		if (e == EXIT_RESTARTING)
		{
			system("scripts/copy_notification_image.sh Restarting &");
			a = "Restarting";
		}
		else
		{
			system("scripts/copy_notification_image.sh NotRunning &");
		}
		// Sleep to give it a chance to print any messages so they (hopefully) get printed
		// before the one below.  This is only so it looks nicer in the log file.
		sleep(3);
	}

	printf("     ***** %s AllSky *****\n", a);
	exit(e);
}

void sig(int i)
{
	printf("XXXXXX == got %s %d in sig()\n", i == SIGUSR1 ? "SIGUSR1" : i == SIGHUP ? "SIGHUP" : "unknown signal", i);
	bMain = false;
	closeUp(EXIT_RESTARTING);
}
void IntHandle(int i)
{
printf("XXXXXX == in IntHandle(), got signal %d\n", i);
	bMain = false;
	closeUp(0);
}

// Build capture command to capture the image from the HQ camera
int RPiHQcapture(bool auto_exposure, int exposure_us, bool auto_gain, bool auto_AWB, double gain, int bin, double WBR, double WBB, int rotation, int flip, float saturation, int brightness, int quality, const char* fileName, int time, const char* ImgText, int fontsize, int *fontcolor, int background, int darkframe, int preview, int width, int height, bool libcamera, cv::Mat *image)
{
	// Define command line.
	string command;
	if (libcamera) command = "libcamera-still";
	else command = "raspistill";

	// Ensure no process is still running.
	string kill = "pgrep '" + command + "' | xargs kill -9 2> /dev/null";
	char kcmd[kill.length() + 1];		// Define char variable
	strcpy(kcmd, kill.c_str());			// Convert command to character variable

	Log(4, " > Kill command: %s\n", kcmd);
	system(kcmd);						// Stop any currently running process

	stringstream ss;

	ss << fileName;
	command += " --output '" + ss.str() + "'";
	if (libcamera)
	{
		// xxx TODO: does this do anything?
		// command += " --tuning-file /usr/share/libcamera/ipa/raspberrypi/imx477.json";
		command += "";	// xxxx
	}
	else
	{
		command += " --thumb none --burst -st";
	}

	// --timeout (in MS) determines how long the video will run before it takes a picture.
	if (preview)
	{
		stringstream wh;
		wh << width << "," << height;
		command += " --timeout 5000";
		command += " --preview '0,0," + wh.str() + "'";	// x,y,width,height
	}
	else
	{
		ss.str("");
		// Daytime auto-exposure pictures don't need a very long --timeout since the exposures are
		// normally short so the camera can home in on the correct exposure quickly.
		if (auto_exposure)
		{
			if (myModeMeanSetting.mode_mean && myModeMeanSetting.mean_auto != MEAN_AUTO_OFF)
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
			ss << 10;
		}
		command += " --timeout " + ss.str();
		command += " --nopreview";
	}

	if (bin > 3)
		bin = 3;
	else if (bin < 1)
		bin = 1;

//xxxx not sure if this still applies for libcamera
	// https://www.raspberrypi.com/documentation/accessories/camera.html#raspistill
	// Mode		Size		Aspect Ratio	Frame rates		FOV		Binning/Scaling
	// 0		automatic selection
	// 1		2028x1080		169:90		0.1-50fps		Partial	2x2 binned
	// 2		2028x1520		4:3			0.1-50fps		Full	2x2 binned	<<< bin==2
	// 3		4056x3040		4:3			0.005-10fps		Full	None		<<< bin==1
	// 4		1332x990		74:55		50.1-120fps		Partial	2x2 binned	<<< else 

	if (libcamera)
	{
		if (bin==1)
			// xxxxxx command += " --width 4060 --height 3056";
			command += " --width 4056 --height 3040";
		else if (bin==2)
			command += " --width 2028 --height 1520";
		else
			command += " --width 1012 --height 760";
	}
	else
	{
		if (bin==1)
			command += " --mode 3";
		else if (bin==2)
			command += " --mode 2 --width 2028 --height 1520";
		else
			command += " --mode 4 --width 1012 --height 760";
	}

	if (myModeMeanSetting.mode_mean && myModeMeanSetting.mean_auto != MEAN_AUTO_OFF)
		exposure_us = myRaspistillSetting.shutter_us;

	if (exposure_us < 1)
		exposure_us = 1;
	else if (exposure_us > 200 * US_IN_SEC)
		exposure_us = 200 * US_IN_SEC;

	// Check if automatic determined exposure time is selected
	if (auto_exposure)
	{
		if (myModeMeanSetting.mode_mean && myModeMeanSetting.mean_auto != MEAN_AUTO_OFF) {
			ss.str("");
			ss << exposure_us;
			if (! libcamera)
				command += " --exposure off";
			command += " --shutter " + ss.str();
		} else {
			// libcamera doesn't use "exposure off/auto".  For auto-exposure set shutter to 0.
			if (libcamera)
				command += " --shutter 0";
			else
				command += " --exposure auto";
		}
	}
	else if (exposure_us)		// manual exposure
	{
		ss.str("");
		ss << exposure_us;
		if (! libcamera)
			command += " --exposure off";
		command += " --shutter " + ss.str();
	}

	// Check if auto gain is selected
	if (auto_gain)
	{
		if (myModeMeanSetting.mode_mean && myModeMeanSetting.mean_auto != MEAN_AUTO_OFF)
		{
			ss.str("");
			ss << myRaspistillSetting.analoggain;
			if (libcamera)
				command += " --gain " + ss.str();
			else
				command += " --analoggain " + ss.str();

			// libcamera just has "gain".  If it's higher than what the camera supports,
			// the excess is the "digital" gain.
			if (! libcamera) { // TODO: need to fix this for libcamera
				if (myRaspistillSetting.digitalgain > 1.0) {
					ss.str("");
					ss << myRaspistillSetting.digitalgain;
					command += " --digitalgain " + ss.str();
				}
			}
		}
		else
		{
			if (libcamera)
				command += " --gain 1";	// 1 effectively makes it autogain
			else
				command += " --analoggain 1";	// 1 effectively makes it autogain
		}
	}
	else	// Is manual gain
	{
		// xxx what are libcamera limits?
		if (gain < 1.0)
			gain = 1.0;
		else if (gain > 16.0)
			gain = 16.0;
		ss.str("");
		ss << gain;
		if (libcamera)
			command += " --gain " + ss.str();
		else
			command += " --analoggain " + ss.str();
	}

	if (myModeMeanSetting.mode_mean && myModeMeanSetting.mean_auto != MEAN_AUTO_OFF) {
		stringstream Str_ExposureTime;
			stringstream Str_Reinforcement;
			Str_ExposureTime <<  myRaspistillSetting.shutter_us;
			Str_Reinforcement << myRaspistillSetting.analoggain;
		
			command += " --exif IFD0.Artist=li_" + Str_ExposureTime.str() + "_" + Str_Reinforcement.str();
	}

	// White balance
	if (WBR < 0.1)
		WBR = 0.1;
	else if (WBR > 10)
		WBR = 10;
	if (WBB < 0.1)
		WBB = 0.1;
	else if (WBB > 10)
		WBB = 10;

	// libcamera: if the red and blue numbers are given it turns off AWB.
//xxx I don't think the check for myModeMeanSetting.mode_mean is needed anymore.
	// Check if R and B component are given
	if (myModeMeanSetting.mode_mean && myModeMeanSetting.mean_auto != MEAN_AUTO_OFF) {
		if (auto_AWB) {
			command += " --awb auto";
		}
		else {
			ss.str("");
			ss << WBR << "," << WBB;
			if (! libcamera)
				command += " --awb off";
			command += " --awbgains " + ss.str();
		}
	}
	else if (! auto_AWB) {
		ss.str("");
		ss << WBR << "," << WBB;
		if (! libcamera)
			command += " --awb off";
		command += " --awbgains " + ss.str();
	}
	// Use automatic white balance
	else {
		command += " --awb auto";
	}

	// libcamera only supports 0 and 180 degree rotation
	if (rotation != 0 && rotation != 90 && (! libcamera && rotation != 180 && rotation != 270))
		rotation = 0;

	if (rotation != 0) {
		ss.str("");
		ss << rotation;
		command += " --rotation " + ss.str();
	}

	if (flip == 1 || flip == 3)
		command += " --hflip";		// horizontal flip
	if (flip == 2 || flip == 3)
		command += " --vflip";		// vertical flip

	if (saturation < min_saturation)
		saturation = min_saturation;
	else if (saturation > max_saturation)
		saturation = max_saturation;
	ss.str("");
	ss << saturation;
	command += " --saturation "+ ss.str();

	ss.str("");
	if (brightness < min_brightness)
		brightness = min_brightness;
	else if (brightness > max_brightness)
		brightness = max_brightness;
	if (libcamera)
		ss << (float) brightness / 100;	// User enters -100 to 100.  Convert to -1.0 to 1.0.
	else
		ss << brightness;
	command += " --brightness " + ss.str();

	ss.str("");
	ss << quality;
	command += " --quality " + ss.str();

	if (libcamera)
	{
		// gets rid of a bunch of libcamera verbose messages
		command = "LIBCAMERA_LOG_LEVELS='ERROR,FATAL' " + command;
		command += " 2> /dev/null";	// gets rid of a bunch of libcamera verbose messages
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
		*image = cv::imread(fileName, cv::IMREAD_UNCHANGED);
		if (! image->data) {
			printf("WARNING: Error re-reading file '%s'; skipping further processing.\n", basename(fileName));
		}
	}
	return(ret);
}


//-------------------------------------------------------------------------------------------------------
//-------------------------------------------------------------------------------------------------------

int main(int argc, char *argv[])
{
	// is_libcamera is only temporary so do a hack to determine if we should use raspistill or libcamera.
	// We need to know its value before setting other variables.
	bool is_libcamera;	// are we using libcamera or raspistill?
	if (argc > 2 && strcmp(argv[1], "-cmd") == 0 && strcmp(argv[2], "libcamera") == 0)
		is_libcamera = true;
	else
		is_libcamera = false;

	tty = isatty(fileno(stdout)) ? true : false;
	signal(SIGINT, IntHandle);
	signal(SIGTERM, IntHandle);	// The service sends SIGTERM to end this program.
	signal(SIGHUP, sig);	// xxxxxxxxxx Reload the service
	signal(SIGUSR1, sig);	// xxxxxxxxxx Reload the service

	int fontname[] = {	cv::FONT_HERSHEY_SIMPLEX,		cv::FONT_HERSHEY_PLAIN,		cv::FONT_HERSHEY_DUPLEX,
						cv::FONT_HERSHEY_COMPLEX,		cv::FONT_HERSHEY_TRIPLEX,	cv::FONT_HERSHEY_COMPLEX_SMALL,
						cv::FONT_HERSHEY_SCRIPT_SIMPLEX, cv::FONT_HERSHEY_SCRIPT_COMPLEX };
#define DEFAULT_LOCALE			"en_US.UTF-8"
const char *locale				= DEFAULT_LOCALE;
	// All the font settings apply to both day and night.
#define DEFAULT_FONTNUMBER		0
	int fontnumber				= DEFAULT_FONTNUMBER;
#define DEFAULT_ITEXTX			15
#define DEFAULT_ITEXTY			25
	int iTextX					= DEFAULT_ITEXTX;
	int iTextY					= DEFAULT_ITEXTY;
#define DEFAULT_ITEXTLINEHEIGHT	30
	int iTextLineHeight			= DEFAULT_ITEXTLINEHEIGHT;
	char const *ImgText			= "";
	char const *ImgExtraText	= "";
	int extraFileAge			= 0;	// 0 disables it
#define DEFAULT_FONTSIZE		32
	double fontsize				= DEFAULT_FONTSIZE;
#define SMALLFONTSIZE_MULTIPLIER 0.08
#define DEFAULT_LINEWIDTH		1
	int linewidth				= DEFAULT_LINEWIDTH;
#define DEFAULT_OUTLINEFONT		0
	int outlinefont				= DEFAULT_OUTLINEFONT;
	int fontcolor[3]			= { 255, 0, 0 };
	int background				= 0;
	int smallFontcolor[3]		= { 0, 0, 255 };
	int linetype[3]				= { cv::LINE_AA, 8, 4 };
#define DEFAULT_LINENUMBER		0
	int linenumber				=DEFAULT_LINENUMBER;

	char bufTime[128]			= { 0 };
#define DEFAULT_WIDTH			0
#define DEFAULT_HEIGHT			0
	int width					= DEFAULT_WIDTH;		int originalWidth  = width;
	int height					= DEFAULT_HEIGHT;		int originalHeight = height;
	int dayBin					= 1;
	int nightBin				= 1;

#define AUTO_IMAGE_TYPE			99	// needs to match what's in the camera_settings.json file
#define DEFAULT_IMAGE_TYPE		AUTO_IMAGE_TYPE
	int Image_type				= DEFAULT_IMAGE_TYPE;
	int asiDayExposure_us		= 32;
	int asiNightExposure_us		= 60 * US_IN_SEC;
	int currentExposure_us		= NOT_SET;
	int asiNightAutoExposure	= 0;
	int asiDayAutoExposure		= 1;
	long last_exposure_us 		= 0;		// last exposure taken
	double asiNightGain 		= 4.0;
	double asiDayGain			= 1.0;
	int asiNightAutoGain		= 0;
	int asiDayAutoGain			= 0;
	float last_gain				= 0.0;		// last gain taken
	int nightDelay_ms			= 10;
	int dayDelay_ms				= 15 * MS_IN_SEC;
	int currentDelay_ms 		= NOT_SET;
	float saturation;
	int asiDayBrightness;
	int asiNightBrightness;
	if (is_libcamera)
	{
		default_saturation		= 1.0;
		saturation				= default_saturation;
		min_saturation			= 0.0;
		max_saturation			= 2.0;

		default_brightness		= 0;
		asiDayBrightness		= default_brightness;
		asiNightBrightness		= default_brightness;
		min_brightness			= -100;
		max_brightness			= 100;
	}
	else
	{
		default_saturation		= 0.0;
		saturation				= default_saturation;
		min_saturation			= -100.0;
		max_saturation			= 100.0;

		default_brightness		= 50;
		asiDayBrightness		= default_brightness;
		asiNightBrightness		= default_brightness;
		min_brightness			= 0;
		max_brightness			= 100;
	}
	int asiRotation				= 0;
	char const *latitude		= DEFAULT_LATITUDE;
	char const *longitude 		= DEFAULT_LONGITUDE;
	// angle of the sun with the horizon
	// (0=sunset, -6=civil twilight, -12=nautical twilight, -18=astronomical twilight)
	char const *angle			= DEFAULT_ANGLE;

	int preview					= 0;
	int showTime				= DEFAULT_SHOWTIME;
	int showExposure			= 0;
	int showGain				= 0;
	int showBrightness			= 0;
	int showMean				= 0;
	int showFocus				= 0;
	int darkframe				= 0;
	int daytimeCapture			= 0;
	int help					= 0;
	int quality					= 90;

	int i;
	bool endOfNight				= false;
	int retCode;
	cv::Mat pRgb;	// the image

	//-------------------------------------------------------------------------------------------------------
	//-------------------------------------------------------------------------------------------------------
	setlinebuf(stdout);		// Line buffer output so entries appear in the log immediately.
	if (setlocale(LC_NUMERIC, locale) == NULL)
		printf("*** WARNING: Could not set locale to %s ***\n", locale);

	printf("\n");
	printf("%s ********************************************\n", c(KGRN));
	printf("%s *** Allsky Camera Software v0.8.3.2 | 2021 ***\n", c(KGRN));
	printf("%s ********************************************\n\n", c(KGRN));
	printf("\%sCapture images of the sky with a Raspberry Pi and a RPi HQ camera\n", c(KGRN));
	printf("\n");
	printf("%sAdd -h or --help for available options\n", c(KYEL));
	printf("\n");
	printf("\%sAuthor: ", c(KNRM));
	printf("Thomas Jacquin - <jacquin.thomas@gmail.com>\n\n");
	printf("\%sContributors:\n", c(KNRM));
	printf("-Knut Olav Klo\n");
	printf("-Daniel Johnsen\n");
	printf("-Robert Wagner\n");
	printf("-Michael J. Kidd - <linuxkidd@gmail.com>\n");
	printf("-Rob Musquetier\n");	
	printf("-Eric Claeys\n");
	printf("-Andreas Lindinger\n");
	printf("\n");

	// The newer "allsky.sh" puts quotes around arguments so we can have spaces in them.
	// If you are running the old allsky.sh, set this to false:
	bool argumentsQuoted = true;

	if (argc > 1)
	{
		Log(4, "Found %d parameters...\n", argc - 1);

		for (i = 1; i <= argc - 1; i++)
		{
			Log(4, "Processing argument %2d: %s\n", i, argv[i]);

			if (strcmp(argv[i], "-h") == 0 || strcmp(argv[i], "--help") == 0)
			{
				help = 1;
			}
			else if (strcmp(argv[i], "-save_dir") == 0)
			{
				save_dir = argv[++i];
			}
			else if (strcmp(argv[i], "-cmd") == 0)
			{
				is_libcamera = strcmp(argv[i+1], "libcamera") == 0 ? true : false;
			}
			else if (strcmp(argv[i], "-locale") == 0)
			{
				locale = argv[++i];
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
			else if (strcmp(argv[i], "-focus") == 0 || strcmp(argv[i], "-autofocus") == 0)
			{
				showFocus = atoi(argv[++i]);
			}
			// check for old names as well - the "||" part is the old name
			else if (strcmp(argv[i], "-dayexposure") == 0)
			{
				asiDayExposure_us = atoi(argv[++i]) * US_IN_MS;
			}
			else if (strcmp(argv[i], "-nightexposure") == 0 || strcmp(argv[i], "-exposure") == 0)
			{
				asiNightExposure_us = atoi(argv[++i]) * US_IN_MS;
			}

			else if (strcmp(argv[i], "-dayautoexposure") == 0)
			{
				asiDayAutoExposure = atoi(argv[++i]);
			}
			else if (strcmp(argv[i], "-nightautoexposure") == 0 || strcmp(argv[i], "-autoexposure") == 0)
			{
				asiNightAutoExposure = atoi(argv[++i]);
			}

			else if (strcmp(argv[i], "-dayautogain") == 0)
			{
				asiDayAutoGain = atoi(argv[++i]);
			}
			else if (strcmp(argv[i], "-nightautogain") == 0 || strcmp(argv[i], "-autogain") == 0)
			{
				asiNightAutoGain = atoi(argv[++i]);
			}
			else if (strcmp(argv[i], "-daygain") == 0)
			{
				asiDayGain = atof(argv[++i]);
			}
			else if (strcmp(argv[i], "-nightgain") == 0 || strcmp(argv[i], "-gain") == 0)
			{
				asiNightGain = atof(argv[++i]);
			}
			else if (strcmp(argv[i], "-saturation") == 0)
			{
				saturation = atof(argv[++i]);
			}
			else if (strcmp(argv[i], "-brightness") == 0)// old "-brightness" applied to day and night
			{
				asiDayBrightness = atoi(argv[++i]);
				asiNightBrightness = asiDayBrightness;
			}
			else if (strcmp(argv[i], "-daybrightness") == 0)
			{
				asiDayBrightness = atoi(argv[++i]);
			}
			else if (strcmp(argv[i], "-nightbrightness") == 0)
			{
				asiNightBrightness = atoi(argv[++i]);
			}
 			else if (strcmp(argv[i], "-daybin") == 0)
			{
				dayBin = atoi(argv[++i]);
			}
			else if (strcmp(argv[i], "-nightbin") == 0 || strcmp(argv[i], "-bin") == 0)
			{
				nightBin = atoi(argv[++i]);
			}
			else if (strcmp(argv[i], "-daydelay") == 0 || strcmp(argv[i], "-daytimeDelay") == 0)
			{
				dayDelay_ms = atoi(argv[++i]);
			}
			else if (strcmp(argv[i], "-nightdelay") == 0 || strcmp(argv[i], "-delay") == 0)
			{
				nightDelay_ms = atoi(argv[++i]);
			}
			else if (strcmp(argv[i], "-awb") == 0)
			{
				autoAWB = atoi(argv[++i]) == 1 ? true : false;
			}
			else if (strcmp(argv[i], "-wbr") == 0)
			{
				WBR = atof(argv[++i]);
			}
			else if (strcmp(argv[i], "-wbb") == 0)
			{
				WBB = atof(argv[++i]);
			}
			else if (strcmp(argv[i], "-nightmean") == 0 || strcmp(argv[i], "-mean-value") == 0)
			{
				myModeMeanSetting.mean_value = std::min(1.0,std::max(0.0,atof(argv[i + 1])));
				myModeMeanSetting.nightMean = myModeMeanSetting.mean_value;
				myModeMeanSetting.mode_mean = true;
				i++;
			}
			else if (strcmp(argv[i], "-daymean") == 0)
			{
				myModeMeanSetting.dayMean = std::min(1.0,std::max(0.0,atof(argv[i + 1])));
				myModeMeanSetting.mode_mean = true;
				i++;
			}
			else if (strcmp(argv[i], "-mean-threshold") == 0)
			{
				myModeMeanSetting.mean_threshold = std::min(0.1,std::max(0.0001,atof(argv[i + 1])));
				myModeMeanSetting.mode_mean = true;
				i++;
			}
			else if (strcmp(argv[i], "-mean-p0") == 0)
			{
				myModeMeanSetting.mean_p0 = std::min(50.0,std::max(0.0,atof(argv[i + 1])));
				myModeMeanSetting.mode_mean = true;
				i++;
			}
			else if (strcmp(argv[i], "-mean-p1") == 0)
			{
				myModeMeanSetting.mean_p1 = std::min(50.0,std::max(0.0,atof(argv[i + 1])));
				myModeMeanSetting.mode_mean = true;
				i++;
			}
			else if (strcmp(argv[i], "-mean-p2") == 0)
			{
				myModeMeanSetting.mean_p2 = std::min(50.0,std::max(0.0,atof(argv[i + 1])));
				myModeMeanSetting.mode_mean = true;
				i++;
			}

			// Check for text parameter
			else if (strcmp(argv[i], "-text") == 0)
			{
				if (argumentsQuoted)
				{
					ImgText = argv[++i];
				}
				else
				{
					// Get first param
					char *param = argv[i + 1];

					// Space character
					const char *space = " ";

					// Temporary text buffer
					char buffer[1024]; // <- danger, only storage for 1024 characters.

					// First word flag
					int j = 0;

					// Loop while next parameter doesn't start with a - character
					while (strncmp(param, "-", 1) != 0)
					{
						// Copy Text into buffer
						strncpy(buffer, ImgText, sizeof(buffer));

						// Add a space after each word (skip for first word)
						if (j)
							strncat(buffer, space, sizeof(buffer));

						// Add parameter
						strncat(buffer, param, sizeof(buffer));

						// Copy buffer into ImgText variable
						ImgText = buffer;

						// Flag first word is entered
						j = 1;

						// Get next parameter
						param = argv[++i];
					}
				}
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
			else if (strcmp(argv[i], "-background") == 0)
			{
				background = atoi(argv[++i]);
			}
			else if (strcmp(argv[i], "-fontcolor") == 0)
			{
				sscanf(argv[++i], "%d %d %d", &fontcolor[0], &fontcolor[1], &fontcolor[2]);
			}
			else if (strcmp(argv[i], "-smallfontcolor") == 0)
			{
				if (argumentsQuoted)
				{
					sscanf(argv[++i], "%d %d %d", &smallFontcolor[0], &smallFontcolor[1], &smallFontcolor[2]);
				}
				else
				{
					smallFontcolor[0] = atoi(argv[++i]);
					smallFontcolor[1] = atoi(argv[++i]);
					smallFontcolor[2] = atoi(argv[++i]);
				}
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
				outlinefont = atoi(argv[++i]);
			}
			else if (strcmp(argv[i], "-rotation") == 0)
			{
				asiRotation = atoi(argv[++i]);
			}
			else if (strcmp(argv[i], "-flip") == 0)
			{
				asiFlip = atoi(argv[++i]);
			}
			else if (strcmp(argv[i], "-filename") == 0)
			{
				fileName = (argv[++i]);
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
			else if (strcmp(argv[i], "-preview") == 0)
			{
				preview = atoi(argv[++i]);
			}
			else if (strcmp(argv[i], "-debuglevel") == 0)
			{
				debugLevel = atoi(argv[++i]);
			}
			else if (strcmp(argv[i], "-showTime") == 0 || strcmp(argv[i], "-time") == 0)
			{
				showTime = atoi(argv[++i]);
			}
			else if (strcmp(argv[i], "-timeformat") == 0)
			{
				timeFormat = argv[++i];
			}
			else if (strcmp(argv[i], "-darkframe") == 0)
			{
				darkframe = atoi(argv[++i]);
			}
			else if (strcmp(argv[i], "-showExposure") == 0)
			{
				showExposure = atoi(argv[++i]);
			}
			else if (strcmp(argv[i], "-showGain") == 0)
			{
				showGain = atoi(argv[++i]);
			}
			else if (strcmp(argv[i], "-showBrightness") == 0)
			{
				showBrightness = atoi(argv[++i]);
			}
			else if (strcmp(argv[i], "-showMean") == 0)
			{
				showMean = atoi(argv[++i]);
			}
			else if (strcmp(argv[i], "-showFocus") == 0)
			{
				showFocus = atoi(argv[++i]);
			}
			else if (strcmp(argv[i], "-daytime") == 0)
			{
				daytimeCapture = atoi(argv[++i]);
			}
			else if (strcmp(argv[i], "-notificationimages") == 0)
			{
				notificationImages = atoi(argv[++i]);
			}
			else if (strcmp(argv[i], "-tty") == 0)
			{
				tty = atoi(argv[++i]) ? true : false;
			}
		}
	}

	if (help == 1)
	{
		printf("%sUsage:\n", c(KRED));
		printf(" ./capture_RPiHQ -width 640 -height 480 -nightexposure 5000000 -nightbin 1 -filename Lake-Laberge.JPG\n\n");
		printf("%s", c(KNRM));

		printf("%sAvailable Arguments:\n", c(KYEL));
		printf(" -cmd								- Default = raspistill - cmd being used\n");
		printf(" -width								- Default = Camera Max Width\n");
		printf(" -height							- Default = Camera Max Height\n");
		printf(" -nightexposure						- Default = 5000000 - Time in us (equals to 5 sec)\n");
		printf(" -nightautoexposure					- Default = 0 - Set to 1 to enable auto Exposure\n");
		printf(" -nightgain							- Default = 4.0 (1.0 - 16.0)\n");
		printf(" -nightautogain						- Default = 0 - Set to 1 to enable auto Gain at night\n");
		printf(" -saturation						- Default = %.1f (%.1f to %.1f)\n", default_saturation, min_saturation, max_saturation);
		printf(" -brightness						- Default = %d (%d to %d)\n", default_brightness, min_brightness, max_brightness);
		printf(" -awb								- Default = 0 - Auto White Balance (0 = off)\n");
		printf(" -wbr								- Default = 2 - White Balance Red (0 = off)\n");
		printf(" -wbb								- Default = 2 - White Balance Blue (0 = off)\n");
		printf(" -daybin							- Default = 1 - binning OFF (1x1), 2 = 2x2, 3 = 3x3 binning\n");
		printf(" -nightbin							- Default = 1 - same as -daybin but for nighttime\n");
		printf(" -nightdelay						- Default = 10 ms - Delay between nighttime images - %d = 1 sec.\n", MS_IN_SEC);
		printf(" -daydelay							- Default = 5000 ms - Delay between daytime images - 5000 = 5 sec.\n");
		printf(" -type = Image Type					- Default = 0; 0=RAW8, 1=RGB24, 2=RAW16\n");
		printf(" -quality							- Default = 70%%, 0%% (poor) 100%% (perfect)\n");
		printf(" -filename							- Default = image.jpg\n");
		printf(" -save_dir							- Default = %s: where to save 'filename'\n", DEFAULT_SAVEDIR);
		if (is_libcamera)
			printf(" -rotation							- Default = 0 degrees - Options 0 or 180\n");
		else
			printf(" -rotation							- Default = 0 degrees - Options 0, 90, 180 or 270\n");
		printf(" -flip								- Default = 0 - 0 = Orig, 1 = Horiz, 2 = Verti, 3 = Both\n");
		printf("\n");
		printf(" -text								- Default = "" - Character/Text Overlay. Use Quotes. Ex. -c \"Text Overlay\"\n");
		printf(" -textx								- Default = 15 - Text Placement Horizontal from LEFT in Pixels\n");
		printf(" -texty = Text Y					- Default = 25 - Text Placement Vertical from TOP in Pixels\n");
		printf(" -fontname = Font Name				- Default = 0 - Font Types (0-7), Ex. 0 = simplex, 4 = triplex, 7 = script\n");
		printf(" -fontcolor = Font Color			- Default = 255 - Text gray scale color (0 - 255)\n");
		printf(" -background= Font Color			- Default = 0 - Backgroud gray scale color (0 - 255)\n");
		printf(" -smallfontcolor = Small Font Color - Default = 0 0 255 - Text red (BGR)\n");
		printf(" -fonttype = Font Type				- Default = 0 - Font Line Type,(0-2), 0 = AA, 1 = 8, 2 = 4\n");
		printf(" -fontsize							- Default = 32 - Text Font Size (range 6 - 160, 32 default)\n");
		printf(" -fontline							- Default = 1 - Text Font Line Thickness\n");
		printf("\n");
		printf("\n");
		printf(" -latitude							- Default = 60.7N (Whitehorse) - Latitude of the camera.\n");
		printf(" -longitude							- Default = 135.05W (Whitehorse) - Longitude of the camera\n");
		printf(" -angle								- Default = -6 - Angle of the sun below the horizon. -6=civil "
			"twilight, -12=nautical twilight, -18=astronomical twilight\n");
		printf("\n");
		printf(" -preview							- Set to 1 to preview the captured images. Only works with a Desktop Environment\n");
		printf(" -darkframe							- Set to 1 to grab dark frame and cover your camera\n");
		printf(" -time								- Set to 1 to display the time on the image.\n");
		printf(" -focus								- Set to 1 to display a focus metric on the image.\n");
		printf(" -notificationimages				- Set to 1 to enable notification images, for example, 'Camera is off during day'.\n");
		printf(" -debuglevel						- Default = 0. Set to 1,2 or 3 for more debugging information.\n");

		printf(" -nightmean							- Default = 0.3 Sets night mean value and activates exposure control\n");
		printf("									  NOTE: Auto-Gain and Auto-Exposure (day & night) should be On in the WebUI for best results\n");
		printf(" -daymean							- Default = same value as nightmean but for the day.\n");
		printf(" -mean-threshold					- Default = 0.01 Set mean-value and activates exposure control\n");
		printf(" -mean-p0							- Default = 5.0, be careful changing these values, ExposureChange (Steps) = p0 + p1 * diff + (p2*diff)^2\n");
		printf(" -mean-p1							- Default = 20.0\n");
		printf(" -mean-p2							- Default = 45.0\n");

		printf("%s", c(KNRM));
		exit(0);
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
		if (quality > 100 || darkframe)
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
		if (quality > 9 || darkframe)
		{
			quality = 9;
		}
		else if (quality == NOT_SET)
		{
			quality = 3;
		}
	}
	compression_parameters.push_back(quality);

	int iMaxWidth = 4096;
	int iMaxHeight = 3040;
	double pixelSize = 1.55;
	if (width == 0 || height == 0)
	{
		width  = iMaxWidth;
		height = iMaxHeight;
	}
	originalWidth = width;
	originalHeight = height;

	printf(" Camera: Raspberry Pi HQ camera\n");
	printf("  - Resolution: %dx%d\n", iMaxWidth, iMaxHeight);
	printf("  - Pixel Size: %1.2fmicrons\n", pixelSize);
	printf("  - Supported Bins: 1x, 2x and 3x\n");

	// Get just the name of the file, without any directories or the extension.
	char fileNameOnly[50] = { 0 };
	if (darkframe)
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

	// Handle "auto" Image_type.
	if (Image_type == AUTO_IMAGE_TYPE)
	{
		// user will have to manually set for 8- or 16-bit mono mode
		Image_type = IMG_RGB24;
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
		sType = "RAW8";
		current_bpp = 1;
		current_bit_depth = 8;
	}
	else
	{
		Log(0, "*** ERROR: Unknown Image Type: %d\n", Image_type);
		exit(EXIT_ERROR_STOP);
	}

	//-------------------------------------------------------------------------------------------------------
	//-------------------------------------------------------------------------------------------------------

	printf("%s", c(KGRN));
	printf("\nCapture Settings:\n");
	printf(" Command: %s\n", is_libcamera ? "libcamera-still" : "raspistill");
	printf(" Image Type: %s\n", sType);
	printf(" Resolution (before any binning): %dx%d\n", width, height);
	printf(" Quality: %d\n", quality);
	printf(" Daytime capture: %s\n", yesNo(daytimeCapture));
	printf(" Exposure (night): %1.0fms\n", round(asiNightExposure_us / US_IN_MS));
	printf(" Auto Exposure (night): %s\n", yesNo(asiNightAutoExposure));
	printf(" Gain (day): %1.2f\n", asiDayGain);
	printf(" Gain (night): %1.2f\n", asiNightGain);
	printf(" Auto Gain (night): %s\n", yesNo(asiNightAutoGain));
	printf(" Brightness (day): %d\n", asiDayBrightness);
	printf(" Brightness (night): %d\n", asiNightBrightness);
	printf(" Saturation: %.1f\n", saturation);
	printf(" Auto White Balance: %s\n", yesNo(autoAWB));
	printf(" WB Red: %1.2f\n", WBR);
	printf(" WB Blue: %1.2f\n", WBB);
	printf(" Binning (day): %d\n", dayBin);
	printf(" Binning (night): %d\n", nightBin);
	printf(" Delay (day): %dms\n", dayDelay_ms);
	printf(" Delay (night): %dms\n", nightDelay_ms);
	printf(" Text Overlay: %s\n", ImgText);
	printf(" Text Position: %dpx left, %dpx top\n", iTextX, iTextY);
	printf(" Font Name: %d\n", fontname[fontnumber]);
	printf(" Font Color: %d, %d, %d\n", fontcolor[0], fontcolor[1], fontcolor[2]);
	printf(" Font Background Color: %d\n", background);
	printf(" Small Font Color: %d, %d, %d\n", smallFontcolor[0], smallFontcolor[1], smallFontcolor[2]);
	printf(" Font Line Type: %d\n", linetype[linenumber]);
	printf(" Font Size: %1.1f\n", fontsize);
	printf(" Font Line: %d\n", linewidth);
	printf(" Outline Font : %s\n", yesNo(outlinefont));
	printf(" Rotation: %d\n", asiRotation);
	printf(" Flip Image: %d\n", asiFlip);
	printf(" Filename: %s\n", fileName);
	printf(" Filename Save Directory: %s\n", save_dir);
	printf(" Latitude: %s\n", latitude);
	printf(" Longitude: %s\n", longitude);
	printf(" Sun Elevation: %s\n", angle);
	printf(" Locale: %s\n", locale);
	printf(" Notification Images: %s\n", yesNo(notificationImages));
	printf(" Show Time: %s (format: %s)\n", yesNo(showTime), timeFormat);
	printf(" Show Exposure: %s\n", yesNo(showExposure));
	printf(" Show Gain: %s\n", yesNo(showGain));
	printf(" Show Brightness: %s\n", yesNo(showBrightness));
	printf(" Show Focus Metric: %s\n", yesNo(showFocus));
	printf(" Preview: %s\n", yesNo(preview));
	printf(" Taking Dark Frames: %s\n", yesNo(darkframe));
	printf(" Debug Level: %d\n", debugLevel);
	printf(" On TTY: %s\n", tty ? "Yes" : "No");
	printf(" Mode Mean: %s\n", yesNo(myModeMeanSetting.mode_mean));
	if (myModeMeanSetting.mode_mean) {
		if (myModeMeanSetting.dayMean == -1.0) {
			myModeMeanSetting.dayMean = myModeMeanSetting.mean_value;
		}
		printf("    Mean Value (night): %1.3f\n", myModeMeanSetting.nightMean);
		printf("    Mean Value (day): %1.3f\n", myModeMeanSetting.dayMean);
		printf("    Threshold: %1.3f\n", myModeMeanSetting.mean_threshold);
		printf("    p0: %1.3f\n", myModeMeanSetting.mean_p0);
		printf("    p1: %1.3f\n", myModeMeanSetting.mean_p1);
		printf("    p2: %1.3f\n", myModeMeanSetting.mean_p2);
	}
	printf("%s", c(KNRM));

	// Initialization
	int originalITextX = iTextX;
	int originalITextY = iTextY;
	int originalFontsize = fontsize;
	int originalLinewidth = linewidth;
	// Have we displayed "not taking picture during day" message, if applicable?
	int displayedNoDaytimeMsg = 0;

	while (bMain)
	{
		std::string lastDayOrNight;

		// Find out if it is currently DAY or NIGHT
		calculateDayOrNight(latitude, longitude, angle);

		lastDayOrNight = dayOrNight;

		if (darkframe) {
			// We're doing dark frames so turn off autoexposure and autogain, and use
			// nightime gain, delay, exposure, and brightness to mimic a nightime shot.
			currentAutoExposure = false;
			currentAutoGain = false;
			currentGain = asiNightGain;
			currentDelay_ms = nightDelay_ms;
			currentExposure_us = asiNightExposure_us;
			currentBrightness = asiNightBrightness;
			currentBin = nightBin;

 			Log(0, "Taking dark frames...\n");
			if (notificationImages) {
				system("scripts/copy_notification_image.sh DarkFrames &");
			}
		}
		else {
			if (dayOrNight == "DAY")
			{
				if (endOfNight == true)		// Execute end of night script
				{
					system("scripts/endOfNight.sh &");

					// Reset end of night indicator
					endOfNight = false;

					displayedNoDaytimeMsg = 0;
				}

				// Check if images should not be captured during day-time
				if (daytimeCapture != 1)
				{
					// Only display messages once a day.
					if (displayedNoDaytimeMsg == 0) {
						if (notificationImages) {
							system("scripts/copy_notification_image.sh CameraOffDuringDay &");
						}
						Log(0, "It's daytime... we're not saving images.\n%s\n",
							tty ? "Press Ctrl+C to stop" : "Stop the allsky service to end this process.");
						displayedNoDaytimeMsg = 1;

						// sleep until around nighttime, then wake up and sleep more if needed.
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

				// Images should be captured during day-time
				else
				{
					Log(0, "==========\n=== Starting daytime capture ===\n==========\n");

					currentExposure_us = asiDayExposure_us;
					currentAutoExposure = asiDayAutoExposure;
					currentBrightness = asiDayBrightness;
					currentDelay_ms = dayDelay_ms;
					currentBin = dayBin;
					currentGain = asiDayGain;
					currentAutoGain = asiDayAutoGain;
					if (myModeMeanSetting.mode_mean)
					{
						myModeMeanSetting.mean_value = myModeMeanSetting.dayMean;
						RPiHQInit(currentAutoExposure, currentExposure_us, currentAutoGain, currentGain, myRaspistillSetting, myModeMeanSetting);
					}
				}
			}
			else	// NIGHT
			{
				Log(0, "==========\n=== Starting nighttime capture ===\n==========\n");

				// Setup the night time capture parameters
				currentExposure_us = asiNightExposure_us;
				currentAutoExposure = asiNightAutoExposure;
				currentBrightness = asiNightBrightness;
				currentDelay_ms = nightDelay_ms;
				currentBin = nightBin;
				currentGain = asiNightGain;
				currentAutoGain = asiNightAutoGain;
				if (myModeMeanSetting.mode_mean)
				{
					myModeMeanSetting.mean_value = myModeMeanSetting.nightMean;
					RPiHQInit(currentAutoExposure, currentExposure_us, currentAutoGain, currentGain, myRaspistillSetting, myModeMeanSetting);
				}
			}
		}

		// Want initial exposures to have the exposure time and gain the user specified.
		if (numExposures == 0)
		{
			myRaspistillSetting.shutter_us = currentExposure_us;
			// xxx this doesn't work    myRaspistillSetting.analoggain = currentGain;
		}

		// Adjusting variables for chosen binning
		height		= originalHeight / currentBin;
		width		= originalWidth / currentBin;
		iTextX		= originalITextX / currentBin;
		iTextY		= originalITextY / currentBin;
		fontsize	= originalFontsize / currentBin;
		linewidth	= originalLinewidth / currentBin;

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

		if (tty)
			printf("Press Ctrl+C to stop\n\n");
		else
			printf("Stop the allsky service to end this process.\n\n");

		// Wait for switch day time -> night time or night time -> day time
		while (bMain && lastDayOrNight == dayOrNight)
		{
			// date/time is added to many log entries to make it easier to associate them
			// with an image (which has the date/time in the filename).
			timeval t;
			t = getTimeval();
			char exposureStart[128];
			char f[10] = "%F %T";
			snprintf(exposureStart, sizeof(exposureStart), "%s", formatTime(t, f));
			Log(0, "STARTING EXPOSURE at: %s   @ %s\n", exposureStart, length_in_units(myRaspistillSetting.shutter_us, true));

			// Get start time for overlay. Make sure it has the same time as exposureStart.
			if (showTime == 1)
				sprintf(bufTime, "%s", formatTime(t, timeFormat));

			if (! darkframe)
			{
				// Create the name of the file that goes in the images/<date> directory.
				snprintf(final_file_name, sizeof(final_file_name), "%s-%s.%s",
					fileNameOnly, formatTime(t, "%Y%m%d%H%M%S"), imagetype);
			}
			snprintf(full_filename, sizeof(full_filename), "%s/%s", save_dir, final_file_name);

			// Capture and save image
			retCode = RPiHQcapture(currentAutoExposure, currentExposure_us, currentAutoGain, autoAWB, currentGain, currentBin, WBR, WBB, asiRotation, asiFlip, saturation, currentBrightness, quality, full_filename, showTime, ImgText, fontsize, fontcolor, background, darkframe, preview, width, height, is_libcamera, &pRgb);

			int focus_metric;
			if (retCode == 0)
			{
				numExposures++;
				focus_metric = (int)round(get_focus_metric(pRgb));

				// If taking_dark_frames is off, add overlay text to the image
				if (! darkframe)
				{
					last_exposure_us = myRaspistillSetting.shutter_us;
					if (myModeMeanSetting.mode_mean && myModeMeanSetting.mean_auto != MEAN_AUTO_OFF)
						last_gain =  myRaspistillSetting.analoggain;
					else
						last_gain = currentGain;	// ZWO gain=0.1 dB , RPiHQ gain=factor

					int iYOffset = 0;

					mean = -1;
					if (myModeMeanSetting.mode_mean && myModeMeanSetting.mean_auto != MEAN_AUTO_OFF)
					{
						mean = RPiHQcalcMean(pRgb, currentExposure_us, currentGain, myRaspistillSetting, myModeMeanSetting);
						Log(2, "  > Got exposure: %'ld us, shutter: %s, quickstart: %d, mean=%1.6f\n", currentExposure_us, length_in_units(myRaspistillSetting.shutter_us, false), myModeMeanSetting.quickstart, mean);
						if (mean == -1)
						{
							numErrors++;
							Log(0, "ERROR: RPiHQcalcMean() returned mean of -1.\n");
							Log(1, "  > Sleeping from failed exposure: %.1f seconds\n", (float)currentDelay_ms / MS_IN_SEC);
							usleep(currentDelay_ms * US_IN_MS);
							continue;
						}
					}
					else {
						myRaspistillSetting.shutter_us = currentExposure_us;
						myRaspistillSetting.analoggain = currentGain;
					}

					// false and 0 are for showTemp, which RPiHQ cameras don't support.
					iYOffset = doOverlay(pRgb,
						showTime, bufTime,
						showExposure, last_exposure_us, currentAutoExposure,
						false, 0, "",
 						showGain, last_gain, currentAutoGain, 0,
						(showMean && mean != -1), mean,
						showBrightness, currentBrightness,
						showFocus, focus_metric,
						ImgText, ImgExtraText, extraFileAge,
						iTextX, iTextY, currentBin, width, iTextLineHeight,
						fontsize, linewidth, linetype[linenumber], fontname[fontnumber],
						fontcolor, smallFontcolor, outlinefont, Image_type);

					if (iYOffset > 0)	// if we added anything to overlay, write the file out
					{
						bool result = cv::imwrite(full_filename, pRgb, compression_parameters);
						if (! result) printf("*** ERROR: Unable to write to '%s'\n", full_filename);
					}
				}
			}
			else
			{
				numErrors++;
				int r = retCode >> 8;
				printf(" >>> Unable to take picture, return code=%d, r=%d\n", retCode, r);
#if 1 == 1
r = retCode;
if (WIFSIGNALED(r)) r = WTERMSIG(r);
{

#else
				if (r > 128)
				{
					// Got a signal.  See if it's one we care about.
					r -= 128;
#endif
					std::string z = "";
					if (r == SIGINT) z = "SIGINT";
					else if (r == SIGTERM) z = "SIGTERM";
					else if (r == SIGUSR1) z = "SIGUSR1";
					else if (r == SIGHUP) z = "SIGHUP";
					if (z != "")
					{
						printf("xxxx Got %s in capture_RPiHQ.cpp\n", z.c_str());
						closeUp(EXIT_RESTARTING);
					}
					else
					{
						printf("xxxx Got signal %d in capture_RPiHQ.cpp\n", r);
					}
				}
				Log(1, "  > Sleeping from failed exposure: %.1f seconds\n", (float)currentDelay_ms / MS_IN_SEC);
				usleep(currentDelay_ms * US_IN_MS);
				continue;
			}

			char cmd[1100];
			Log(1, "  > Saving %s image '%s'\n", darkframe ? "dark" : dayOrNight.c_str(), final_file_name);
			snprintf(cmd, sizeof(cmd), "scripts/saveImage.sh %s '%s'", dayOrNight.c_str(), full_filename);

			// -999 for temperature says the camera doesn't support it
			// TODO: in the future the calculation of mean should independent from mode_mean. -1 means don't display.
			add_variables_to_command(cmd, last_exposure_us, currentBrightness,
				(myModeMeanSetting.mode_mean && myModeMeanSetting.mean_auto != MEAN_AUTO_OFF) ? mean : -1.0,
				currentAutoExposure, currentAutoGain, autoAWB, WBR, WBB,
				-999, last_gain, (int)round(20.0 * 10.0 * log10(last_gain)),
				currentBin, asiFlip, current_bit_depth, focus_metric);
			strcat(cmd, " &");

			system(cmd);

			long s;
			if (myModeMeanSetting.mode_mean && myModeMeanSetting.quickstart && myModeMeanSetting.mean_auto != MEAN_AUTO_OFF)
			{
				s = 1 * US_IN_SEC;
			}
			else if ((dayOrNight == "NIGHT"))
			{
				s = (asiNightExposure_us - myRaspistillSetting.shutter_us) + (nightDelay_ms * US_IN_MS);
			}
			else
			{
				s = currentDelay_ms * US_IN_MS;
			}
			Log(0, "Sleeping %.1f seconds...\n", (float)s / US_IN_SEC);
			usleep(s);

			// Check for day or night based on location and angle
			calculateDayOrNight(latitude, longitude, angle);
		}

		if (lastDayOrNight == "NIGHT")
		{
			// Flag end of night processing is needed
			endOfNight = true;
		}
	}

	closeUp(0);
}
