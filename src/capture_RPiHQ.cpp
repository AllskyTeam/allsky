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

// new includes (MEAN)
#include "include/RPiHQ_raspistill.h"
#include "include/mode_RPiHQ_mean.h"

#ifndef ASI_IMG_RAW8
#define ASI_IMG_RAW8	0
#define ASI_IMG_RGB24	1
#define ASI_IMG_RAW16	2
#define ASI_IMG_Y8		3
#endif

#ifndef ASI_TRUE
#define ASI_TRUE true
#define ASI_FALSE false
#endif

using namespace std;

#define KNRM "\x1B[0m"
#define KRED "\x1B[31m"
#define KGRN "\x1B[32m"
#define KYEL "\x1B[33m"
#define KBLU "\x1B[34m"
#define KMAG "\x1B[35m"
#define KCYN "\x1B[36m"
#define KWHT "\x1B[37m"

#define US_IN_MS 1000                     // microseconds in a millisecond
#define MS_IN_SEC 1000                    // milliseconds in a second
#define US_IN_SEC (US_IN_MS * MS_IN_SEC)  // microseconds in a second
#define S_IN_MIN 60
#define S_IN_HOUR (60 * 60)
#define S_IN_DAY (24 * S_IN_HOUR)

//-------------------------------------------------------------------------------------------------------
//-------------------------------------------------------------------------------------------------------

std::vector<int> compression_parameters;
bool bMain					= true;
//bool bDisplay = false;
std::string dayOrNight;

// These are global so they can be used by other routines.
#define NOT_SET				  -1	// signifies something isn't set yet
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
#define DEFAULT_SAVEDIR		  "tmp"
char const *save_dir		= DEFAULT_SAVEDIR;
#define DEFAULT_FILENAME	  "image.jpg"
char const *fileName		= DEFAULT_FILENAME;
char final_file_name[200];	// final name of the file that's written to disk, with no directories
char full_filename[1000];	// full name of file written to disk
#define DEFAULT_TIMEFORMAT	  "%Y%m%d %H:%M:%S"	// format the time should be displayed in
char const *timeFormat		= DEFAULT_TIMEFORMAT;
bool currentAutoExposure	= false;	// is auto-exposure currently on?
bool currentAutoGain   		= false;	// is auto-gain currently on?
bool AutoAWB	       		= false;
double WBR         			= 2.5;
double WBB         			= 2;

//bool bSavingImg = false;

raspistillSetting myRaspistillSetting;
modeMeanSetting myModeMeanSetting;

//-------------------------------------------------------------------------------------------------------
//-------------------------------------------------------------------------------------------------------

char debug_text[500];		// buffer to hold debug messages
int debugLevel = 0;

/**
 * Helper function to display debug info
**/
void Log(int required_level, const char *fmt, ...)
{
    if (debugLevel >= required_level) {
		char msg[8192];
		snprintf(msg, sizeof(msg), "%s", fmt);
		va_list va;
		va_start(va, fmt);
		vfprintf(stdout, msg, va);
		va_end(va);
	}
}

// Return the string for the specified color, or "" if we're not on a tty.
char const *c(char const *color)
{
	if (tty)
	{
		return(color);
	}
	else
	{
		return("");
	}
}

// Create Hex value from RGB
unsigned long createRGB(int r, int g, int b)
{
    return ((r & 0xff) << 16) + ((g & 0xff) << 8) + (b & 0xff);
}

void cvText(cv::Mat img, const char *text, int x, int y, double fontsize,
	int linewidth, int linetype,
	int fontname, int fontcolor[], int imgtype, int use_outline, int width)
{
	cv::Point xy = cv::Point(x, y);

	// Resize for screen width so the same numbers on small and big screens produce
	// roughly the same size font on the image.
	fontsize = fontsize * width / 1200;
	linewidth = std::max(linewidth * width / 700, 1);
	int outline_size = linewidth * 1.5;

	// int baseline = 0;
	// cv::Size textSize = cv::getTextSize(text, fontname, fontsize, linewidth, &baseline);

	if (imgtype == ASI_IMG_RAW16)
	{
		unsigned long fontcolor16 = createRGB(fontcolor[2], fontcolor[1], fontcolor[0]);
		if (use_outline)
			cv::putText(img, text, xy, fontname, fontsize, cv::Scalar(0,0,0), outline_size, linetype);
		cv::putText(img, text, xy, fontname, fontsize, fontcolor16, linewidth, linetype);
	}
	else
	{
		cv::Scalar font_color = cv::Scalar(fontcolor[0], fontcolor[1], fontcolor[2]);
		if (use_outline)
			cv::putText(img, text, xy, fontname, fontsize, cv::Scalar(0,0,0, 255), outline_size, linetype);
		cv::putText(img, text, xy, fontname, fontsize, font_color, linewidth, linetype);
	}
}

// Return the numeric time.
timeval getTimeval()
{
    timeval curTime;
    gettimeofday(&curTime, NULL);
    return(curTime);
}

// Format a numeric time as a string.
char *formatTime(timeval t, char const *tf)
{
    static char TimeString[128];
    strftime(TimeString, 80, tf, localtime(&t.tv_sec));
    return(TimeString);
}

// Return the current time as a string.  Uses both functions above.
char *getTime(char const *tf)
{
    return(formatTime(getTimeval(), tf));
}

std::string ReplaceAll(std::string str, const std::string& from, const std::string& to) {
	size_t start_pos = 0;
	while((start_pos = str.find(from, start_pos)) != std::string::npos) {
		str.replace(start_pos, from.length(), to);
		start_pos += to.length(); // Handles case where 'to' is a substring of 'from'
	}
	return str;
}

std::string exec(const char *cmd)
{
	std::tr1::shared_ptr<FILE> pipe(popen(cmd, "r"), pclose);
	if (!pipe)
		return "ERROR";
	char buffer[128];
	std::string result = "";
	while (!feof(pipe.get()))
	{
		if (fgets(buffer, 128, pipe.get()) != NULL)
		{
			result += buffer;
		}
	}
	return result;
}

// Display a length of time in different units, depending on the length's value.
// If the "multi" flag is set, display in multiple units if appropriate.
char *length_in_units(long us, bool multi)	// microseconds
{
	const int l = 50;
	static char length[l];
	if (us == 0)
	{
		snprintf(length, l, "0 us");
	}
	else
	{
		double us_in_ms = (double)us / US_IN_MS;
		// The boundaries on when to display one or two units are really a matter of taste.
		if (us_in_ms < 0.5)						// less than 0.5 ms
		{
			snprintf(length, l, "%'ld us", us);
		}
		else if (us_in_ms < 1.5)				// between 0.5 and 1.5 ms
		{
			if (multi)
				snprintf(length, l, "%'ld us (%.3f ms)", us, us_in_ms);
			else
				snprintf(length, l, "%'ld us", us);
		}
		else if (us_in_ms < (0.5 * MS_IN_SEC))	// 1.5 ms to 0.5 sec
		{
			if (multi)
				snprintf(length, l, "%.2f ms (%.2lf sec)", us_in_ms, (double)us / US_IN_SEC);
			else
				snprintf(length, l, "%.2f ms", us_in_ms);
		}
		else if (us_in_ms < (1.0 * MS_IN_SEC))	// between 0.5 sec and 1 sec
		{
			if (multi)
				snprintf(length, l, "%.2f ms (%.2lf sec)", us_in_ms, (double)us / US_IN_SEC);
			else
				snprintf(length, l, "%.1f ms", us_in_ms);
		}
		else									// over 1 sec
		{
			snprintf(length, l, "%.1lf sec", (double)us / US_IN_SEC);
		}

	}
	return(length);
}

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
		// 98 tells the invoker we're restarting
		if (e == 98)
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
	closeUp(98);
}
void IntHandle(int i)
{
printf("XXXXXX == in IntHandle(), got signal %d\n", i);
	bMain = false;
	closeUp(0);
}

// A user error was found.  Wait for the user to fix it.
void waitToFix(char const *msg)
{
    printf("**********\n");
    printf("%s\n", msg);
    printf("*** After fixing, ");
    if (tty)
        printf("restart allsky.sh.\n");
    else
        printf("restart the allsky service.\n");
    if (notificationImages)
        system("scripts/copy_notification_image.sh Error &");
    sleep(5);	// give time for image to be copied
    printf("*** Sleeping until you fix the problem.\n");
    printf("**********\n");
    sleep(100000);	// basically, sleep forever until the user fixes this.
}

// Calculate if it is day or night
void calculateDayOrNight(const char *latitude, const char *longitude, const char *angle)
{
	char sunwaitCommand[128];

	// Log data.  Don't need "exit" or "set".
	sprintf(sunwaitCommand, "sunwait poll angle %s %s %s", angle, latitude, longitude);
	dayOrNight = exec(sunwaitCommand);

	// RMu, I have no clue what this does...
	dayOrNight.erase(std::remove(dayOrNight.begin(), dayOrNight.end(), '\n'), dayOrNight.end());

	if (dayOrNight != "DAY" && dayOrNight != "NIGHT")
	{
		sprintf(debug_text, "*** ERROR: dayOrNight isn't DAY or NIGHT, it's '%s'\n", dayOrNight.c_str());
		waitToFix(debug_text);
		closeUp(100);
	}
}

// Calculate how long until nighttime.
int calculateTimeToNightTime(const char *latitude, const char *longitude, const char *angle)
{
    std::string t;
    char sunwaitCommand[128];	// returns "hh:mm"
    sprintf(sunwaitCommand, "sunwait list set angle %s %s %s", angle, latitude, longitude);
    t = exec(sunwaitCommand);
    t.erase(std::remove(t.begin(), t.end(), '\n'), t.end());

    int hNight=0, mNight=0, secsNight;
	// It's possible for sunwait to return "--:--" if the angle causes sunset to start
	// after midnight or before noon.
	if (sscanf(t.c_str(), "%d:%d", &hNight, &mNight) != 2)
	{
		Log(0, "ERROR: With angle %s sunwait returned unknown time to nighttime: %s\n", angle, t.c_str());
		return(1 * S_IN_HOUR);	// 1 hour - should we exit instead?
	}
    secsNight = (hNight * S_IN_HOUR) + (mNight * S_IN_MIN);	// secs to nighttime from start of today
	// sunwait doesn't return seconds so on average the actual time will be 30 seconds
	// after the stated time. So, add 30 seconds.
	secsNight += 30;

	char *now = getTime("%H:%M:%S");
    int hNow=0, mNow=0, sNow=0, secsNow;
    sscanf(now, "%d:%d:%d", &hNow, &mNow, &sNow);
    secsNow = (hNow*S_IN_HOUR) + (mNow*S_IN_MIN) + sNow;	// seconds to now from start of today
	Log(3, "Now=%s, nighttime starts at %s\n", now, t.c_str());

	// Handle the (probably rare) case where nighttime is tomorrow.
	// We are only called during the day, so if nighttime is earlier than now, it was past midnight.
	int diff_s = secsNight - secsNow;
    if (diff_s < 0)
    {
		// This assumes tomorrow's nighttime starts same as today's, which is close enough.
		return(diff_s + S_IN_DAY);	// Add one day
    }
    else
    {
        return(diff_s);
    }
}

// Build capture command to capture the image from the HQ camera
int RPiHQcapture(bool auto_exposure, int *exposure_us, bool auto_gain, bool auto_AWB, double gain, int bin, double WBR, double WBB, int rotation, int flip, float saturation, int brightness, int quality, const char* fileName, int time, const char* ImgText, int fontsize, int *fontcolor, int background, int darkframe, int preview, int width, int height, bool libcamera, cv::Mat *image)
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
			if (myModeMeanSetting.mode_mean)
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
	// Mode   Size         Aspect Ratio  Frame rates  FOV      Binning/Scaling
	// 0      automatic selection
	// 1      2028x1080    169:90        0.1-50fps    Partial  2x2 binned
	// 2      2028x1520    4:3           0.1-50fps    Full     2x2 binned      <<< bin==2
	// 3      4056x3040    4:3           0.005-10fps  Full     None            <<< bin==1
	// 4      1332x990     74:55         50.1-120fps  Partial  2x2 binned      <<< else 

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

	if (myModeMeanSetting.mode_mean)
		*exposure_us = myRaspistillSetting.shutter_us;

	if (*exposure_us < 1)
		*exposure_us = 1;
	else if (*exposure_us > 200 * US_IN_SEC)
		*exposure_us = 200 * US_IN_SEC;

	// Check if automatic determined exposure time is selected
	if (auto_exposure)
	{
		if (myModeMeanSetting.mode_mean) {
			ss.str("");
			ss << *exposure_us;
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
	else if (*exposure_us)		// manual exposure
	{
		ss.str("");
		ss << *exposure_us;
		if (! libcamera)
			command += " --exposure off";
		command += " --shutter " + ss.str();
	}

	// Check if auto gain is selected
	if (auto_gain)
	{
		if (myModeMeanSetting.mode_mean)
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

	if (myModeMeanSetting.mode_mean) {
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
	if (myModeMeanSetting.mode_mean) {
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
		command += " --rotation "  + ss.str();
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

#ifdef DO_NOT_USE
	if (!darkframe) {
		string info_text = "";

		bool showDetails = false;	// will be removed in the future
		if (showDetails)
		{
			if (libcamera)
				info_text += " Exposure: %exp, Gain: %ag, Focus: %focus, red: %rg, blue: %bg";
			else
				info_text += " -a 1104";
		}

		if (time==1)
		{
			if (libcamera)
			{
				ss.str("");
				ss << timeFormat;
				info_text += " Time: " + ss.str();
			}
			else
				info_text += " -a 1036";
		}

		if (strcmp(ImgText, "") != 0) {
			ss.str("");
			ss << " " << ImgText; 
			if (debugLevel > 1) {
				ss << " (li-" << __TIMESTAMP__ 
				<< ") br:" << myRaspistillSetting.brightness 
				<< " WBR:" << WBR 
				<< " WBB:" << WBB;
			}
			if (libcamera)
				info_text += ss.str();
			else
				info_text += " -a \"" + ss.str() + "\"";
		}
		if (info_text != "")
		{
// xxxxxxxxxxx libcamera: this only sets text on title bar of preview window, so don't bother.
			if (! libcamera)
				command += " " + info_text;
		}

if (! libcamera)	// xxxx libcamera doesn't have fontsize, color, or background.
{
		if (fontsize < 6)
			fontsize = 6;
		else if (fontsize > 160)
			fontsize = 160;

		ss.str("");
		ss << fontsize;

		// xxxxxxxx use all 3
		if (fontcolor[0] < 0)
			fontcolor[0] = 0;
		else if (fontcolor[0] > 255)
			fontcolor[0] = 255;

		std::stringstream C;
		C  << std::setfill ('0') << std::setw(2) << std::hex << fontcolor[0];

		if (background < 0)
			background = 0;
		else if (background > 255)
			background = 255;

		std::stringstream B;
		B  << std::setfill ('0') << std::setw(2) << std::hex << background;

		command += " -ae " + ss.str() + ",0x" + C.str() + ",0x8080" + B.str();
}
	}
#endif //DO_NOT_USE


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

// Simple function to make flags easier to read for humans.
char const *yes = "1 (yes)";
char const *no  = "0 (no)";
char const *yesNo(int flag)
{
    if (flag)
        return(yes);
    else
        return(no);
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

	int fontname[] = { cv::FONT_HERSHEY_SIMPLEX,        cv::FONT_HERSHEY_PLAIN,         cv::FONT_HERSHEY_DUPLEX,
					   cv::FONT_HERSHEY_COMPLEX,        cv::FONT_HERSHEY_TRIPLEX,       cv::FONT_HERSHEY_COMPLEX_SMALL,
					   cv::FONT_HERSHEY_SCRIPT_SIMPLEX, cv::FONT_HERSHEY_SCRIPT_COMPLEX };
#define DEFAULT_LOCALE       "en_US.UTF-8"
const char *locale         = DEFAULT_LOCALE;
	// All the font settings apply to both day and night.
#define DEFAULT_FONTNUMBER  0
	int fontnumber        = DEFAULT_FONTNUMBER;
#define DEFAULT_ITEXTX      15
#define DEFAULT_ITEXTY      25
	int iTextX            = DEFAULT_ITEXTX;
	int iTextY            = DEFAULT_ITEXTY;
#define DEFAULT_ITEXTLINEHEIGHT  30
	int iTextLineHeight   = DEFAULT_ITEXTLINEHEIGHT;
	char const *ImgText   = "";
	char const *ImgExtraText   = "";
	int extraFileAge           = 0;   // 0 disables it
// The "extra text" file hasn't been implemented in RPiHQ.  The next line keeps the compiler quiet so users don't think there's a problem.
if (extraFileAge == 99999 && ImgExtraText[0] == '\0') ImgExtraText = "xxxxxx   keep compiler quiet";
#define DEFAULT_FONTSIZE    32
	double fontsize       = DEFAULT_FONTSIZE;
#define SMALLFONTSIZE_MULTIPLIER 0.08
#define DEFAULT_LINEWIDTH   1
	int linewidth         = DEFAULT_LINEWIDTH;
#define DEFAULT_OUTLINEFONT 0
	int outlinefont       = DEFAULT_OUTLINEFONT;
	int fontcolor[3]      = { 255, 0, 0 };
	int background        = 0;
	int smallFontcolor[3] = { 0, 0, 255 };
	int linetype[3]       = { cv::LINE_AA, 8, 4 };
#define DEFAULT_LINENUMBER       0
	int linenumber             =DEFAULT_LINENUMBER;

	char bufTime[128]     = { 0 };
	char bufTemp[128]     = { 0 };
	char bufTemp2[50]     = { 0 };
#define DEFAULT_WIDTH            0
#define DEFAULT_HEIGHT           0
	int width             = DEFAULT_WIDTH;		int originalWidth  = width;
	int height            = DEFAULT_HEIGHT;		int originalHeight = height;
	int dayBin            = 1;
	int nightBin          = 1;

#define AUTO_IMAGE_TYPE     99	// needs to match what's in the camera_settings.json file
#define DEFAULT_IMAGE_TYPE       AUTO_IMAGE_TYPE
	int Image_type        = DEFAULT_IMAGE_TYPE;
	int asiDayExposure_us = 32;
	int asiNightExposure_us= 60 * US_IN_SEC;
	int currentExposure_us= NOT_SET;
	int asiNightAutoExposure= 0;
	int asiDayAutoExposure= 1;
	long last_exposure_us = 0;		// last exposure taken
	double asiNightGain   = 4.0;
	double asiDayGain     = 1.0;
	int asiNightAutoGain  = 0;
	int asiDayAutoGain    = 0;
	float last_gain		  = 0.0;		// last gain taken
	int nightDelay_ms     = 10;
	int dayDelay_ms       = 15 * MS_IN_SEC;
	int currentDelay_ms   = NOT_SET;
	float saturation;
	int asiDayBrightness;
	int asiNightBrightness;
	if (is_libcamera)
	{
		default_saturation= 1.0;
		saturation        = default_saturation;
		min_saturation    = 0.0;
		max_saturation    = 2.0;

		default_brightness= 0;
		asiDayBrightness  = default_brightness;
		asiNightBrightness= default_brightness;
		min_brightness    = -100;
		max_brightness    = 100;
	}
	else
	{
		default_saturation= 0.0;
		saturation        = default_saturation;
		min_saturation    = -100.0;
		max_saturation    = 100.0;

		default_brightness= 50;
		asiDayBrightness  = default_brightness;
		asiNightBrightness= default_brightness;
		min_brightness    = 0;
		max_brightness    = 100;
	}
	int asiRotation       = 0;
	char const *latitude  = "52.57N";
	char const *longitude = "4.70E";
	char const *angle     = "0"; // angle of the sun with the horizon (0=sunset, -6=civil twilight, -12=nautical twilight, -18=astronomical twilight)
	int preview           = 0;
	int showTime          = 0;
	int showExposure      = 0;
	int showGain          = 0;
	int showBrightness    = 0;
	int showMean          = 0;
	int showFocus         = 0;
	int darkframe         = 0;
	int daytimeCapture    = 0;
	int help              = 0;
	int quality           = 90;

	int i;
	bool endOfNight    = false;
	int retCode;
	cv::Mat pRgb;	// the image

	//-------------------------------------------------------------------------------------------------------
	//-------------------------------------------------------------------------------------------------------
	setlinebuf(stdout);   // Line buffer output so entries appear in the log immediately.
	if (setlocale(LC_NUMERIC, locale) == NULL)
		printf("*** WARNING: Could not set locale to %s ***\n", locale);

	printf("\n");
	printf("%s ********************************************\n", c(KGRN));
	printf("%s *** Allsky Camera Software v0.8.3 | 2021 ***\n", c(KGRN));
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
				AutoAWB = atoi(argv[++i]) == 1 ? true : false;
			}
			else if (strcmp(argv[i], "-wbr") == 0)
			{
				WBR = atof(argv[++i]);
			}
			else if (strcmp(argv[i], "-wbb") == 0)
			{
				WBB = atof(argv[++i]);
			}
			else if (strcmp(argv[i], "-mean-value") == 0)
			{
				myModeMeanSetting.mean_value = std::min(1.0,std::max(0.0,atof(argv[i + 1])));
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
		printf(" -cmd                               - Default = raspistill - cmd being used\n");
		printf(" -width                             - Default = Camera Max Width\n");
		printf(" -height                            - Default = Camera Max Height\n");
		printf(" -nightexposure                     - Default = 5000000 - Time in us (equals to 5 sec)\n");
		printf(" -nightautoexposure                 - Default = 0 - Set to 1 to enable auto Exposure\n");
		printf(" -nightgain                         - Default = 4.0 (1.0 - 16.0)\n");
		printf(" -nightautogain                     - Default = 0 - Set to 1 to enable auto Gain at night\n");
		printf(" -saturation                        - Default = %.1f (%.1f to %.1f)\n", default_saturation, min_saturation, max_saturation);
		printf(" -brightness                        - Default = %d (%d to  %d)\n", default_brightness, min_brightness, max_brightness);
		printf(" -awb                               - Default = 0 - Auto White Balance (0 = off)\n");
		printf(" -wbr                               - Default = 2 - White Balance Red  (0 = off)\n");
		printf(" -wbb                               - Default = 2 - White Balance Blue (0 = off)\n");
		printf(" -daybin                            - Default = 1 - binning OFF (1x1), 2 = 2x2, 3 = 3x3 binning\n");
		printf(" -nightbin                          - Default = 1 - same as -daybin but for nighttime\n");
		printf(" -nightdelay                        - Default = 10 ms - Delay between nighttime images - %d = 1 sec.\n", MS_IN_SEC);
		printf(" -daydelay                          - Default = 5000 ms - Delay between daytime images - 5000 = 5 sec.\n");
		printf(" -type = Image Type                 - Default = 0 - 0 = RAW8,  1 = RGB24,  2 = RAW16\n");
		printf(" -quality                           - Default = 70%%, 0%% (poor) 100%% (perfect)\n");
		printf(" -filename                          - Default = image.jpg\n");
		printf(" -save_dir                          - Default = %s: where to save 'filename'\n", DEFAULT_SAVEDIR);
		if (is_libcamera)
			printf(" -rotation                          - Default = 0 degrees - Options 0 or 180\n");
		else
			printf(" -rotation                          - Default = 0 degrees - Options 0, 90, 180 or 270\n");
		printf(" -flip                              - Default = 0 - 0 = Orig, 1 = Horiz, 2 = Verti, 3 = Both\n");
		printf("\n");
		printf(" -text                              - Default =      - Character/Text Overlay. Use Quotes.  Ex. -c "
			   "\"Text Overlay\"\n");
		printf(" -textx                             - Default = 15   - Text Placement Horizontal from LEFT in Pixels\n");
		printf(" -texty = Text Y                    - Default = 25   - Text Placement Vertical from TOP in Pixels\n");
		printf(" -fontname = Font Name              - Default = 0    - Font Types (0-7), Ex. 0 = simplex, 4 = triplex, 7 = script\n");
		printf(" -fontcolor = Font Color            - Default = 255  - Text gray scale color  (0 - 255)\n");
		printf(" -background= Font Color            - Default = 0  - Backgroud gray scale color (0 - 255)\n");
		printf(" -smallfontcolor = Small Font Color - Default = 0 0 255  - Text red (BGR)\n");
		printf(" -fonttype = Font Type              - Default = 0    - Font Line Type,(0-2), 0 = AA, 1 = 8, 2 = 4\n");
		printf(" -fontsize                          - Default = 32  - Text Font Size (range 6 - 160, 32 default)\n");
		printf(" -fontline                          - Default = 1    - Text Font Line Thickness\n");
		printf("\n");
		printf("\n");
		printf(" -latitude                          - Default = 60.7N (Whitehorse)   - Latitude of the camera.\n");
		printf(" -longitude                         - Default = 135.05W (Whitehorse) - Longitude of the camera\n");
		printf(" -angle                             - Default = -6 - Angle of the sun below the horizon. -6=civil "
			   "twilight, -12=nautical twilight, -18=astronomical twilight\n");
		printf("\n");
		printf(" -preview                           - set to 1 to preview the captured images. Only works with a Desktop Environment\n");
		printf(" -darkframe                         - Set to 1 to grab dark frame and cover your camera\n");
		printf(" -time                              - Set to 1 to display the time on the image.\n");
		printf(" -focus                             - Set to 1 to display a focus metric on the image.\n");
		printf(" -notificationimages                - Set to 1 to enable notification images, for example, 'Camera is off during day'.\n");
		printf(" -debuglevel                        - Default = 0. Set to 1,2 or 3 for more debugging information.\n");

		printf(" -mean-value                        - Default = 0.3 Set mean-value and activates exposure control\n");
		printf("                                      NOTE: Auto-Gain should be On in the WebUI\n");
		printf("                                            -autoexposure should be set in config.sh:\n");
		printf("                                            CAPTURE_EXTRA_PARAMETERS='-mean-value 0.3 -autoexposure 1'\n"); 
		printf(" -mean-threshold                    - Default = 0.01 Set mean-value and activates exposure control\n");
		printf(" -mean-p0                           - Default = 5.0, be careful changing these values, ExposureChange (Steps) = p0 + p1 * diff + (p2*diff)^2\n");
		printf(" -mean-p1                           - Default = 20.0\n");
		printf(" -mean-p2                           - Default = 45.0\n");

		printf("%s", c(KNRM));
		exit(0);
	}

	const char *imagetype = "";
	const char *ext = strrchr(fileName, '.');
	if (ext == NULL)
	{
		sprintf(debug_text, "*** ERROR: No extension given on filename: [%s]\n", fileName);
		waitToFix(debug_text);
		exit(100);
	}
	ext++;
	if (strcasecmp(ext, "jpg") == 0 || strcasecmp(ext, "jpeg") == 0)
	{
		if (Image_type == ASI_IMG_RAW16)
		{
			waitToFix("*** ERROR: RAW16 images only work with .png files; either change the Image Type or the Filename.\n");
			exit(100);
		}

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
		if (quality > 9  || darkframe)
		{
			quality = 9;
		}
		else if (quality == NOT_SET)
		{
			quality = 3;
		}
	}
	else
	{
		sprintf(debug_text, "*** ERROR: Unsupported image extension (%s); only .jpg and .png are supported.\n", ext);
		waitToFix(debug_text);
		exit(100);
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
		Image_type = ASI_IMG_RGB24;
	}

	const char *sType;		// displayed in output
	if (Image_type == ASI_IMG_RAW16)
	{
		sType = "RAW16";
		current_bpp = 2;
		current_bit_depth = 16;
	}
	else if (Image_type == ASI_IMG_RGB24)
	{
		sType = "RGB24";
		current_bpp = 3;
		current_bit_depth = 8;
	}
	else if (Image_type == ASI_IMG_RAW8)
	{
		sType = "RAW8";
		current_bpp = 1;
		current_bit_depth = 8;
	}
	else
	{
		sprintf(debug_text, "*** ERROR: Unknown Image Type: %d\n", Image_type);
		waitToFix(debug_text);
		exit(100);
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
	printf(" Gain (night): %1.2f\n", asiNightGain);
	printf(" Auto Gain (night): %s\n", yesNo(asiNightAutoGain));
	printf(" Brightness (day): %d\n", asiDayBrightness);
	printf(" Brightness (night): %d\n", asiNightBrightness);
	printf(" Saturation: %.1f\n", saturation);
	printf(" Auto White Balance: %s\n", yesNo(AutoAWB));
	printf(" WB Red: %1.2f\n", WBR);
	printf(" WB Blue: %1.2f\n", WBB);
	printf(" Binning (day): %d\n", dayBin);
	printf(" Binning (night): %d\n", nightBin);
	printf(" Delay (day): %dms\n", dayDelay_ms);
	printf(" Delay (night): %dms\n", nightDelay_ms);
	printf(" Text Overlay: %s\n", ImgText);
	printf(" Text Position: %dpx left, %dpx top\n", iTextX, iTextY);
	printf(" Font Name:  %d\n", fontname[fontnumber]);
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
		printf("    Mean Value: %1.3f\n", myModeMeanSetting.mean_value);
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

		else if (dayOrNight == "DAY")
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

                // If we went from Night to Day, then currentExposure_us will be the last night
                // exposure so leave it if we're using auto-exposure so there's a seamless change from
                // Night to Day, i.e., if the exposure was fine a minute ago it will likely be fine now.
                // On the other hand, if this program just started or we're using manual exposures,
                // use what the user specified.
                if (numExposures == 0 || ! asiDayAutoExposure)
                {
					currentExposure_us = asiDayExposure_us;
                }
                else
                {
                    Log(3, "Using the last night exposure of %'ld\n", currentExposure_us);
                }
				currentAutoExposure = asiDayAutoExposure;
				currentBrightness = asiDayBrightness;
				currentDelay_ms = dayDelay_ms;
				currentBin = dayBin;
				currentGain = asiDayGain;
				currentAutoGain = asiDayAutoGain;
			}
		}

		else	// NIGHT
		{
			Log(0, "==========\n=== Starting nighttime capture ===\n==========\n");

			// Setup the night time capture parameters
			if (numExposures == 0 || ! asiNightAutoExposure)
			{
				currentExposure_us = asiNightExposure_us;
				Log(3, "Using night exposure (%'ld us)\n", asiNightExposure_us);
			}
			currentAutoExposure = asiNightAutoExposure;
			currentBrightness = asiNightBrightness;
			currentDelay_ms = nightDelay_ms;
			currentBin = nightBin;
			currentGain = asiNightGain;
			currentAutoGain = asiNightAutoGain;
		}

		// Want initial exposures to have the exposure time and gain the user specified.
		if (numExposures == 0)
		{
			myRaspistillSetting.shutter_us = currentExposure_us;
			// xxx this doesn't work    myRaspistillSetting.analoggain = currentGain;
		}

		// Adjusting variables for chosen binning
		height    = originalHeight / currentBin;
		width     = originalWidth / currentBin;
		iTextX    = originalITextX / currentBin;
		iTextY    = originalITextY / currentBin;
		fontsize  = originalFontsize / currentBin;
		linewidth = originalLinewidth / currentBin;

// TODO: if not the first time, should we free the old pRgb?
		if (Image_type == ASI_IMG_RAW16)
		{
			pRgb.create(cv::Size(width, height), CV_16UC1);
		}
		else if (Image_type == ASI_IMG_RGB24)
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
			Log(0, "STARTING EXPOSURE at: %s   @ %s\n", exposureStart, length_in_units(currentExposure_us, true));

			// Get start time for overlay.  Make sure it has the same time as exposureStart.
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
			retCode = RPiHQcapture(currentAutoExposure, &currentExposure_us, currentAutoGain, AutoAWB, currentGain, currentBin, WBR, WBB, asiRotation, asiFlip, saturation, currentBrightness, quality, full_filename, showTime, ImgText, fontsize, fontcolor, background, darkframe, preview, width, height, is_libcamera, &pRgb);

			int focus_metric;
			if (retCode == 0)
			{
				numExposures++;
				focus_metric = (int)round(get_focus_metric(pRgb));

				// If taking_dark_frames is off, add overlay text to the image
				if (! darkframe)
				{
					last_exposure_us = currentExposure_us;
					if (myModeMeanSetting.mode_mean)
						last_gain =  myRaspistillSetting.analoggain;
					else
						last_gain = currentGain;	// ZWO gain=0.1 dB , RPiHQ gain=factor
					int iYOffset = 0;

					if (myModeMeanSetting.mode_mean)
					{
// xxxxxx use max exposure and gain values, current_max_autoexposure_us, asiNightMaxGain (current_max_gain)
// xxxxxx May need to re-initialize at day/night boundary.

						mean = RPiHQcalcMean(pRgb, asiNightExposure_us, asiNightGain, myRaspistillSetting, myModeMeanSetting);
						Log(2, "  > Got exposure: %'ld us, shutter: %1.4f s, quickstart: %d, mean=%1.6f\n", currentExposure_us, (double) myRaspistillSetting.shutter_us / US_IN_SEC, myModeMeanSetting.quickstart, mean);
						if (mean == -1)
						{
							numErrors++;
							Log(0, "ERROR: RPiHQcalcMean() returned mean of -1.\n");
							Log(1, "  > Sleeping from failed exposure: %.1f seconds\n", (float)currentDelay_ms / MS_IN_SEC);
							usleep(currentDelay_ms * US_IN_MS);
							continue;
						}
					}

					if (showTime == 1)
					{
						// The time and ImgText are in the larger font; everything else is in smaller font.
						cvText(pRgb, bufTime, iTextX, iTextY + (iYOffset / currentBin),
							fontsize * 0.1, linewidth,
							linetype[linenumber], fontname[fontnumber], fontcolor,
							Image_type, outlinefont, width);
						iYOffset += iTextLineHeight;
					}

					if (ImgText[0] != '\0')
					{
						cvText(pRgb, ImgText, iTextX, iTextY + (iYOffset / currentBin),
							fontsize * 0.1, linewidth,
							linetype[linenumber], fontname[fontnumber], fontcolor,
							Image_type, outlinefont, width);
						iYOffset+=iTextLineHeight;
					}

					if (showExposure == 1)
					{
						// display in seconds if >= 1 second, else in ms
						if (last_exposure_us >= (1 * US_IN_SEC))
							sprintf(bufTemp, "Exposure: %'.2f s%s", (float)last_exposure_us / US_IN_SEC, bufTemp2);
						else
							sprintf(bufTemp, "Exposure: %'.2f ms%s", (float)last_exposure_us / US_IN_MS, bufTemp2);
						// Indicate if in auto-exposure mode.
						if (currentAutoExposure) strcat(bufTemp, " (auto)");
						cvText(pRgb, bufTemp, iTextX, iTextY + (iYOffset / currentBin),
							fontsize * SMALLFONTSIZE_MULTIPLIER, linewidth,
							linetype[linenumber], fontname[fontnumber], smallFontcolor,
							Image_type, outlinefont, width);
						iYOffset += iTextLineHeight;
					}

					if (showGain == 1)
					{
						sprintf(bufTemp, "Gain: %1.2f", last_gain);
						// Indicate if in auto gain mode.
						if (currentAutoGain) strcat(bufTemp, " (auto)");
						cvText(pRgb, bufTemp, iTextX, iTextY + (iYOffset / currentBin),
							fontsize * SMALLFONTSIZE_MULTIPLIER, linewidth,
							linetype[linenumber], fontname[fontnumber], smallFontcolor,
							Image_type, outlinefont, width);
						iYOffset += iTextLineHeight;
					}

					if (showBrightness == 1)
					{
						sprintf(bufTemp, "Brightness: %d", currentBrightness);
						cvText(pRgb, bufTemp, iTextX, iTextY + (iYOffset / currentBin),
							fontsize * SMALLFONTSIZE_MULTIPLIER, linewidth,
							linetype[linenumber], fontname[fontnumber], smallFontcolor,
							Image_type, outlinefont, width);
						iYOffset += iTextLineHeight;
					}

					if (showMean == 1 && myModeMeanSetting.mode_mean)
					{
						sprintf(bufTemp, "Mean: %.3f", mean);
						cvText(pRgb, bufTemp, iTextX, iTextY + (iYOffset / currentBin),
							fontsize * SMALLFONTSIZE_MULTIPLIER, linewidth,
							linetype[linenumber], fontname[fontnumber], smallFontcolor,
							Image_type, outlinefont, width);
						iYOffset += iTextLineHeight;
					}

					if (showFocus == 1)
					{
						sprintf(bufTemp, "Focus: %d", focus_metric);
						cvText(pRgb, bufTemp, iTextX, iTextY + (iYOffset / currentBin),
							fontsize * SMALLFONTSIZE_MULTIPLIER, linewidth,
							linetype[linenumber], fontname[fontnumber], smallFontcolor,
							Image_type, outlinefont, width);
						iYOffset += iTextLineHeight;
					}

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
						closeUp(98);
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
			char tmp[50];
			Log(1, "  > Saving %s image '%s'\n", darkframe ? "dark" : dayOrNight.c_str(), final_file_name);
			snprintf(cmd, sizeof(cmd), "scripts/saveImage.sh %s '%s'", dayOrNight.c_str(), full_filename);
			snprintf(tmp, sizeof(tmp), " EXPOSURE_US=%ld", last_exposure_us);
			strcat(cmd, tmp);
			snprintf(tmp, sizeof(tmp), " BRIGHTNESS=%d", currentBrightness);
			strcat(cmd, tmp);
			snprintf(tmp, sizeof(tmp), " MEAN=%.3f", mean);
			strcat(cmd, tmp);
			snprintf(tmp, sizeof(tmp), " AUTOEXPOSURE=%d", currentAutoExposure ? 1 : 0);
			strcat(cmd, tmp);
			snprintf(tmp, sizeof(tmp), " AUTOGAIN=%d", currentAutoGain ? 1 : 0);
			strcat(cmd, tmp);
			snprintf(tmp, sizeof(tmp), " AUTOWB=%d", AutoAWB ? 1 : 0);
			strcat(cmd, tmp);
			snprintf(tmp, sizeof(tmp), " WBR=%1.2f", WBR);
			strcat(cmd, tmp);
			snprintf(tmp, sizeof(tmp), " WBB=%1.2f", WBB);
			strcat(cmd, tmp);

			// TEMPERATURE, GAIN, and BIN are used by the dark* scripts to sort and compare against
			// prior values, so make them fixed width to aid in doing that.

			// There's currently no way to get to the RPiHQ camera's temperature sensor.
			//snprintf(tmp, sizeof(tmp), " TEMPERATURE=%02d", (int)round(actualTemp/10));
			//strcat(cmd, tmp);
			snprintf(tmp, sizeof(tmp), " GAIN=%1.2f", last_gain);
			strcat(cmd, tmp);
			snprintf(tmp, sizeof(tmp), " GAINDB=%03d", (int)round(20.0 * 10.0 * log10(last_gain)));
			strcat(cmd, tmp);
			snprintf(tmp, sizeof(tmp), " BIN=%d", currentBin);
			strcat(cmd, tmp);
			snprintf(tmp, sizeof(tmp), " FLIP=%d", asiFlip);
			strcat(cmd, tmp);
			snprintf(tmp, sizeof(tmp), " BIT_DEPTH=%02d", current_bit_depth);
			strcat(cmd, tmp);
			snprintf(tmp, sizeof(tmp), " FOCUS=%3d", focus_metric);
			strcat(cmd, tmp);

			strcat(cmd, " &");

			system(cmd);

			long s;
			if (myModeMeanSetting.mode_mean && myModeMeanSetting.quickstart)
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
