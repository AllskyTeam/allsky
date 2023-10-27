// Functions used by the "capture" and other programs.
// When outputting messages containing settings, use the names as they appear in the WebUI.

#include <opencv2/core.hpp>
#include <opencv2/imgproc.hpp>
#include <opencv2/highgui.hpp>
#include <sys/time.h>
#include <sys/stat.h>
#include <unistd.h>
#include <string.h>
#include <errno.h>
#include <string>
#include <cstring>
#include <tr1/memory>
#include <stdlib.h>
#include <fstream>
#include <stdarg.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <stdio.h>
#include <fcntl.h>

#include "include/allsky_common.h"

using namespace std;

char debug_text[500];						// buffer to hold debug messages
static char const *fontnames[]		= {		// Character representation of names for clarity:
	"SIMPLEX",				"PLAIN",				"DUPEX",
	"COMPLEX",				"TRIPLEX",				"COMPLEX_SMALL",
	"SCRIPT_SIMPLEX",		"SCRIPT_COMPLEX" };

//xxxxxxxxxxxxxx TODO: isDayOrNight dayOrNight;


/**
 * Helper function to display debug info.
 * If the required_level is negative then also put the info in a "message" file.
**/
void Log(int required_level, const char *fmt, ...)
{
	if ((int)abs(CG.debugLevel) >= required_level) {
		char msg[1000];
		va_list va;
		va_start(va, fmt);
		vsnprintf(msg, sizeof(msg)-1, fmt, va);
		printf("%s", msg);

		if (required_level <= 0)
		{
			char const *severity;
			if (strcasestr(msg, "warning") != NULL)
				severity = "warning";
			else if (strcasestr(msg, "error") != NULL)
				severity = "error";
			else
				severity = "info";

			char *p = &msg[strlen(msg) - 1];
			if (*p == '\n')
			{
				*p = '\0';
			}

			char command[sizeof(msg) + 100];
			snprintf(command, sizeof(command)-1, "%s/scripts/addMessage.sh %s '%s'",
				CG.allskyHome, severity, msg);
			Log(4, "Executing %s\n", command);
			(void) system(command);
		}

		va_end(va);
	}
}

// Return the string for the specified color, or "" if we're not on a tty.
char const *c(char const *color)
{
	if (CG.tty)
		return(color);
	else
		return("");
}

// Create Hex value from RGB
unsigned long createRGB(int r, int g, int b)
{
	return ((r & 0xff) << 16) + ((g & 0xff) << 8) + (b & 0xff);
}

void cvText(cv::Mat img, const char *text, int x, int y, double fontsize,
	int linewidth, int linetype,
	int fontname, int fontcolor[], int imgtype, bool useOutline, int width)
{
	cv::Point xy = cv::Point(x, y);

	// Replace HTML codes for apostrophy and double quotes with actual characters
	std::string s = text;
	std::size_t pos;
	stringstream ss;
	ss << "";
	int l;
	l = strlen("&#x27");
	for ( pos = s.find("&#x27"); pos != string::npos; pos = s.find("&#x27"))
	{
//printf("&#x27 found at position %u in [%s]\n", pos, s.c_str());
		if (pos == 0)
			ss << "'" << s.substr(l);
		else
			ss << s.substr(0, pos) << "'" << s.substr(pos+l);

		s = ss.str();
		ss.str("");
	}

	l = strlen("&quot;");
	for ( pos = s.find("&quot;"); pos != string::npos; pos = s.find("&quot;"))
	{
//printf("&quot; found at position %u in [%s]\n", pos, s.c_str());
		if (pos == 0)
			ss << "'" << s.substr(l);
		else
			ss << s.substr(0, pos) << "\"" << s.substr(pos+l);

		s = ss.str();
		ss.str("");
	}

	// Resize for screen width so the same numbers on small and big screens produce
	// roughly the same size font on the image.
	fontsize = fontsize * width / 1200;
	linewidth = std::max(linewidth * width / 700, 1);
	int outline_size = linewidth * 1.5;

	// int baseline = 0;
	// cv::Size textSize = cv::getTextSize(s.c_str(), fontname, fontsize, linewidth, &baseline);

	if (imgtype == IMG_RAW16)
	{
		unsigned long fontcolor16 = createRGB(fontcolor[2], fontcolor[1], fontcolor[0]);
		if (useOutline)
			cv::putText(img, s.c_str(), xy, fontname, fontsize, cv::Scalar(0,0,0), outline_size, linetype);
		cv::putText(img, s.c_str(), xy, fontname, fontsize, fontcolor16, linewidth, linetype);
	}
	else
	{
		cv::Scalar font_color = cv::Scalar(fontcolor[0], fontcolor[1], fontcolor[2]);
		if (useOutline)
			cv::putText(img, s.c_str(), xy, fontname, fontsize, cv::Scalar(0,0,0, 255), outline_size, linetype);
		cv::putText(img, s.c_str(), xy, fontname, fontsize, font_color, linewidth, linetype);
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
	static char TimeString[50];
	strftime(TimeString, 80, tf, localtime(&t.tv_sec));
	return(TimeString);
}

// Return the current time as a string.  Uses both functions above.
char *getTime(char const *tf)
{
	return(formatTime(getTimeval(), tf));
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

std::string getOverlayMethod(int m)
{
	if (m == OVERLAY_METHOD_LEGACY)
		return("legacy");
	else if (m == OVERLAY_METHOD_MODULE)
		return("module");
	else
		return("unknown");
}

void add_variables_to_command(config cg, char *cmd, timeval startDateTime)
{
	// If the double variables are an integer value, pass an integer value.
	// Pass boolean values as 0 or 1.
	// If any value < 0 don't use it.

	int const s = 100;
	char tmp[s];

	snprintf(tmp, s, " DATE=%s", formatTime(startDateTime, "%Y%m%d"));
	strcat(cmd, tmp);
	snprintf(tmp, s, " TIME=%s", formatTime(startDateTime, "%H%M%S"));
	strcat(cmd, tmp);

	snprintf(tmp, s, " AUTOEXPOSURE=%d", cg.currentAutoExposure ? 1 : 0);
	strcat(cmd, tmp);
	snprintf(tmp, s, " sAUTOEXPOSURE='%s'", cg.currentAutoExposure ? "(auto)" : "");
	strcat(cmd, tmp);
	if (cg.lastExposure_us >= 0) {
		snprintf(tmp, s, " EXPOSURE_US=%ld", cg.lastExposure_us);
		strcat(cmd, tmp);

		snprintf(tmp, s, " sEXPOSURE='%s'", length_in_units(cg.lastExposure_us, true));
		strcat(cmd, tmp);
	}

	snprintf(tmp, s, " AUTOGAIN=%d", cg.currentAutoGain ? 1 : 0);
	strcat(cmd, tmp);
	snprintf(tmp, s, " sAUTOGAIN='%s'", cg.currentAutoGain ? "(auto)" : "");
	strcat(cmd, tmp);
	if (cg.lastGain >= 0.0) {
		snprintf(tmp, s, " GAIN=%s", LorF(cg.lastGain, "%d", "%f"));
		strcat(cmd, tmp);
	}

	snprintf(tmp, s, " AUTOWB=%d", cg.currentAutoAWB ? 1 : 0);
	strcat(cmd, tmp);
	snprintf(tmp, s, " sAUTOAWB='%s'", cg.currentAutoAWB ? "(auto)" : "");
	strcat(cmd, tmp);
	if (cg.lastWBR >= 0.0) {
		snprintf(tmp, s, " WBR=%s", LorF(cg.lastWBR, "%d", "%f"));
		strcat(cmd, tmp);
	}
	if (cg.lastWBB >= 0.0) {
		snprintf(tmp, s, " WBB=%s", LorF(cg.lastWBB, "%d", "%f"));
		strcat(cmd, tmp);
	}

	if (cg.currentBrightness >= 0) {
		snprintf(tmp, s, " BRIGHTNESS=%ld", cg.currentBrightness);
		strcat(cmd, tmp);
	}

	if (cg.lastMean >= 0.0) {
		snprintf(tmp, s, " MEAN=%s", LorF(cg.lastMean, "%d", "%f"));
		strcat(cmd, tmp);
	}
	// FULLMEAN is to see if the mean of the whole image is the same as the mean returned
	// by removeBadImages.sh; if so, removeBadImages.sh doesn't need to determine the mean.
	if (cg.lastMeanFull >= 0.0) {
		snprintf(tmp, s, " FULLMEAN=%s", LorF(cg.lastMeanFull, "%d", "%f"));
		strcat(cmd, tmp);
	}

	// Since negative temperatures are valid, check against an impossible temperature.
	// The temperature passed to us is 10 times the actual temperature so we can deal with
	// integers with 1 decimal place, which is all we care about.
	if (cg.supportsTemperature && cg.lastSensorTemp != NOT_SET) {
		snprintf(tmp, s, " TEMPERATURE_C=%d", (int)round(cg.lastSensorTemp));
		strcat(cmd, tmp);
		snprintf(tmp, s, " TEMPERATURE_F=%d", (int)round((cg.lastSensorTemp * 1.8) +32));
		strcat(cmd, tmp);
	}


	if (cg.currentBin >= 0) {
		snprintf(tmp, s, " BIN=%ld", cg.currentBin);
		strcat(cmd, tmp);
	}

	char const *f = getFlip(cg.flip);
	if (f[0] != '\0') {
		snprintf(tmp, s, " FLIP=%s", f);
		strcat(cmd, tmp);
	}

	if (cg.currentBitDepth >= 0) {
		snprintf(tmp, s, " BIT_DEPTH=%d", cg.currentBitDepth);
		strcat(cmd, tmp);
	}

	if (cg.lastFocusMetric >= 0) {
		snprintf(tmp, s, " FOCUS=%ld", cg.lastFocusMetric);
		strcat(cmd, tmp);
	}

	snprintf(tmp, s, " DARKFRAME=%d", cg.takeDarkFrames ? 1 : 0);
	strcat(cmd, tmp);

	snprintf(tmp, s, " eOVERLAY=%d", cg.overlay.overlayMethod);
	strcat(cmd, tmp);

	if (cg.ct == ctZWO) {
		snprintf(tmp, s, " AUTOUSB=%d", cg.asiAutoBandwidth ? 1 : 0);
		strcat(cmd, tmp);
		snprintf(tmp, s, " USB=%ld", cg.lastAsiBandwidth);
		strcat(cmd, tmp);
	}
}


// Display a length of time in different units, depending on the length's value.
// If the "multi" flag is set, display in multiple units if appropriate.
// Rotate buffers so we can call length_in_units() up to l_count times in one printf().

const int l_count = 3;		// 3 buffers
const int l = 50;			// each 50 long
int on_l = l_count;			// point to last one
static char length[l_count][l+1];
static char *length_p = length[l_count - 1];	// last one

char *length_in_units(long us, bool multi)	// microseconds
{
	// Rotate buffers.
	if (++on_l > l_count)
		on_l = 1;
	length_p = length[on_l - 1];

	if (us == 0)
	{
		snprintf(length_p, l, "0 us");
		return(length_p);
	}

	double us_in_ms = (double)us / US_IN_MS;
	double abs_us_in_ms = abs(us_in_ms);
	// The boundaries on when to display one or two units are really a matter of taste.
	if (abs_us_in_ms < 0.5)						// less than 0.5 ms
	{
		snprintf(length_p, l, "%'ld us", us);
	}
	else if (abs_us_in_ms < 1.5)				// between 0.5 ms and 1.5 ms
	{
		if (multi)
			snprintf(length_p, l, "%'ld us (%.3f ms)", us, us_in_ms);
		else
			snprintf(length_p, l, "%'ld us", us);
	}
	else if (abs_us_in_ms < (0.5 * MS_IN_SEC))	// 1.5 ms to 0.5 sec
	{
		// Don't display seconds if it'll look like (0.00 sec).
		double s = (double)us / US_IN_SEC;
		if (multi && s >= 0.005) {
			snprintf(length_p, l, "%'.2f ms (%.2lf sec)", us_in_ms, s);
		} else {
			snprintf(length_p, l, "%'.2f ms", us_in_ms);
		}
	}
	else if (abs_us_in_ms < (1.0 * MS_IN_SEC))	// between 0.5 sec and 1 sec
	{
		if (multi)
			snprintf(length_p, l, "%'.2f ms (%.2lf sec)", us_in_ms, (double)us / US_IN_SEC);
		else
			snprintf(length_p, l, "%'.1f ms", us_in_ms);
	}
	else									// over 1 sec
	{
		snprintf(length_p, l, "%'.1lf sec", (double)us / US_IN_SEC);
	}

	return(length_p);
}

// sunwait barfs if it receives an angle with a comma in it,
// so convert it to a period.
char const *convertCommaToPeriod(float n, char const *format)
{
	static char number[20];
	char *p = number;
	snprintf(number, sizeof(number), format, n);
	while (*p != '\0') {
		if (*p == ',') {
			*p = '.';
			break;
		}
		p++;
	}
	return(number);
}

// Calculate if it is day or night
std::string _day = "DAY", _night = "NIGHT";
std::string calculateDayOrNight(const char *latitude, const char *longitude, float angle)
{
	char sunwaitCommand[128];
	int d;

	snprintf(sunwaitCommand, sizeof(sunwaitCommand),
		"sunwait poll exit angle %s %s %s > /dev/null",
		convertCommaToPeriod(angle, "%.4f"), latitude, longitude);
	Log(4, "Executing %s\n", sunwaitCommand);
	d = system(sunwaitCommand);	// returns exit code 2 for DAY, 3 for night

	if (WIFEXITED(d))
	{
		d = WEXITSTATUS(d);
		if (d != 2 && d != 3)
		{
			Log(0, "*** %s: ERROR: sunwait returned %d, not DAY or NIGHT\n", CG.ME, d);
			closeUp(EXIT_ERROR_STOP);
		}
		return(d == 2 ? _day : _night);
	}

	// Didn't exit normally
	Log(0, "*** %s: ERROR: sunwait exited abnormally: 0x%x\n", CG.ME, d);
	closeUp(EXIT_ERROR_STOP);
	/*NOTREACHED*/
	return("");
}

// Calculate how long until daytime (forDaytime==true) or nighttime (forDaytime==false).
int calculateTimeToNextTime(const char *latitude, const char *longitude, float angle, bool forDaytime)
{
	// We are sleeping UNTIL which time?
	const char *toTime = "night";
	if (! forDaytime) toTime = "day";

	std::string t;
	char sunwaitCommand[128];	// returns "hh:mm, hh:mm"  (daytime begin, nighttime begin)
	snprintf(sunwaitCommand, sizeof(sunwaitCommand),
		"sunwait list %s angle %s %s %s",
		forDaytime ? "rise" : "set",
		convertCommaToPeriod(angle, "%.4f"), latitude, longitude);
	t = exec(sunwaitCommand);
	t.erase(std::remove(t.begin(), t.end(), '\n'), t.end());

	int hNext=0, mNext=0;		// hours plus minutes to the next time
	// It's possible for sunwait to return "--:--" if the angle causes sunset to start
	// after midnight or before noon.
	if (sscanf(t.c_str(), "%d:%d", &hNext, &mNext) != 2)
	{
		Log(0, "*** %s: ERROR: With angle %.4f sunwait returned unknown time to %stime: %s\n",
			CG.ME, angle, toTime, t.c_str());
		return(1 * S_IN_HOUR);	// 1 hour - should we exit instead?
	}

	// Total seconds to nextTime from start of today.
	// sunwait doesn't return seconds so on average the actual time will be 30 seconds
	// after the stated time, So add 30 seconds.
	int sNext = (hNext * S_IN_HOUR) + (mNext * S_IN_MIN) + 30;

	// Now get how long from NOW the next time is.
	char *now = getTime("%H:%M:%S");
	int hNow=0, mNow=0, sNow=0;
	sscanf(now, "%d:%d:%d", &hNow, &mNow, &sNow);
	// Convert to total seconds to now from start of today
	sNow = (hNow*S_IN_HOUR) + (mNow*S_IN_MIN) + sNow;
	Log(4, "Now=%s, %stime starts at %s\n", now, toTime, t.c_str());

	// Handle the (probably rare) case where nighttime/daytime is tomorrow.
	// If nighttime is earlier than now, it was past midnight.
	int diff_s = sNext - sNow;
	if (diff_s < 0)
	{
		// This assumes tomorrow's nighttime/daytime starts same as today's, which is close enough.
		return(diff_s + S_IN_DAY);	// Add one day
	}
	else
	{
		return(diff_s);
	}
}

// Simple function to make flags easier to read for humans.
char const *yesNo(bool flag)
{
	if (flag)
		return("Yes");
	else
		return("No");
}

// Convert "arg" to a boolean.
bool getBoolean(const char* arg)
{
	if (strcasecmp(arg, "yes") == 0 ||
		strcasecmp(arg, "true") == 0 ||
		strcasecmp(arg, "1") == 0) {
		return(true);
	}
	if (strcasecmp(arg, "no") != 0 &&
		strcasecmp(arg, "false") != 0 &&
		strcasecmp(arg, "0") != 0) {
		Log(0, "*** %s: WARNING: argument '%s' is not a boolean; setting to 'false'\n", CG.ME, arg);
	}
	return(false);
}

// Check for a valid file extension.  Return false if it can't be determined.
// If ok, set the quality based on the extension.
bool checkForValidExtension(config *cg)
{
	char const *ext = strrchr(cg->fileName, '.');		// e.g., "image.jpg"
	if (ext == NULL) {
		Log(0, "*** %s: ERROR: No extension given on filename: [%s]\n", CG.ME, cg->fileName);
		return(false);
	}

	ext++;
	if (strcasecmp(ext, "jpg") == 0 || strcasecmp(ext, "jpeg") == 0) {
		if (cg->imageType == IMG_RAW16) {
			Log(0, "*** %s: ERROR: RAW16 images only work with .png files; either change the Image Type or the Filename.\n", cg->ME);
			return(false);
		}
		cg->imageExt = "jpg";
		cg->extensionType = isJPG;

		compressionParameters.push_back(cv::IMWRITE_JPEG_QUALITY);
		// Want dark frames to be at highest quality as well as images that will be passed
		// to a module to be post-processed.
		if (cg->takeDarkFrames || cg->overlay.overlayMethod == OVERLAY_METHOD_MODULE) {
			cg->quality = 100;
		} else if (cg->quality == NOT_SET) {
			cg->quality = cg->qualityJPG;
		} else {
			validateLong(&cg->quality, 0, 100, "JPG Quality", true);
		}

	} else if (strcasecmp(ext, "png") == 0) {
		cg->imageExt = "png";
		cg->extensionType = isPNG;

		compressionParameters.push_back(cv::IMWRITE_PNG_COMPRESSION);
		// png is lossless so "quality" is really just the amount of compression.
		if (cg->takeDarkFrames || cg->overlay.overlayMethod == OVERLAY_METHOD_MODULE) {
			cg->quality = 9;
		} else if (cg->quality == NOT_SET) {
			cg->quality = cg->qualityPNG;
		} else {
			validateLong(&cg->quality, 0, 9, "PNG Quality/Compression", true);
		}

	} else {
		Log(0, "*** %s: ERROR: Unsupported image extension (%s); only .jpg and .png are supported.\n", cg->ME, ext);
		return(false);
	}

	compressionParameters.push_back(cg->quality);

	// Get just the name of the file, without any directories or the extension.
	if (cg->takeDarkFrames)
	{
		// To avoid overwriting the optional notification image with the dark image,
		// during dark frames we use a different file name.
		static char darkFilename[20];
		snprintf(darkFilename, sizeof(darkFilename), "dark.%s", cg->imageExt);
		cg->fileName = darkFilename;
		strncpy(cg->finalFileName, cg->fileName, sizeof(cg->finalFileName)-1);
		snprintf(cg->fullFilename, sizeof(cg->fullFilename), "%s/%s", cg->saveDir, cg->finalFileName);
	}
	else
	{
		// There shouldn't be any "/" in fileName; if there is, only get the file name portion.
		char const *slash = strrchr(cg->fileName, '/');
		if (slash == NULL)
			strncpy(cg->fileNameOnly, cg->fileName, sizeof(cg->fileNameOnly)-1);
		else
			strncpy(cg->fileNameOnly, slash + 1, sizeof(cg->fileNameOnly)-1);

		// Keep track of the filename without the extension, which we know is there.
		char *dot = strrchr(cg->fileNameOnly, '.');
		*dot = '\0';
	}
	Log(4, "fileName=[%s], fileNameOnly=[%s], finalFileName=[%s]\n", cg->fileName, cg->fileNameOnly, cg->finalFileName);

	return(true);
}



int fontname[] = {
	cv::FONT_HERSHEY_SIMPLEX,			cv::FONT_HERSHEY_PLAIN,		cv::FONT_HERSHEY_DUPLEX,
	cv::FONT_HERSHEY_COMPLEX,			cv::FONT_HERSHEY_TRIPLEX,	cv::FONT_HERSHEY_COMPLEX_SMALL,
	cv::FONT_HERSHEY_SCRIPT_SIMPLEX,	cv::FONT_HERSHEY_SCRIPT_COMPLEX };

int doOverlay(cv::Mat image, config cg, char *startTime, int gainChange)
{
	int iYOffset	= 0;
	char tmp[128]	= { 0 };
	int lineType = cg.overlay.linetype[cg.overlay.linenumber];
	int font = fontname[cg.overlay.fontnumber];

	if (cg.overlay.showTime)
	{
		// The time and ImgText are in the larger font; everything else is in smaller font.
		cvText(image, startTime, cg.overlay.iTextX, cg.overlay.iTextY + (iYOffset / cg.currentBin),
			cg.overlay.fontsize * 0.1, cg.overlay.linewidth,
			lineType, font, cg.overlay.fontcolor, cg.imageType, cg.overlay.outlinefont, cg.width);
		iYOffset += cg.overlay.iTextLineHeight;
	}

	if (cg.overlay.ImgText[0] != '\0')
	{
		cvText(image, cg.overlay.ImgText, cg.overlay.iTextX, cg.overlay.iTextY + (iYOffset / cg.currentBin),
			cg.overlay.fontsize * 0.1, cg.overlay.linewidth,
			lineType, font, cg.overlay.fontcolor, cg.imageType, cg.overlay.outlinefont, cg.width);
		iYOffset+=cg.overlay.iTextLineHeight;
	}

	if (cg.overlay.showTemp)
	{
		char C[20] = { 0 }, F[20] = { 0 };
		if (strcmp(cg.tempType, "C") == 0 || strcmp(cg.tempType, "B") == 0)
		{
			sprintf(C, "  %.0fC", cg.lastSensorTemp);
		}
		if (strcmp(cg.tempType, "F") == 0 || strcmp(cg.tempType, "B") == 0)
		{
			sprintf(F, "  %.0fF", ((cg.lastSensorTemp * 1.8) + 32));
		}
		sprintf(tmp, "Sensor: %s %s", C, F);
		cvText(image, tmp, cg.overlay.iTextX, cg.overlay.iTextY + (iYOffset / cg.currentBin),
			cg.overlay.fontsize * SMALLFONTSIZE_MULTIPLIER, cg.overlay.linewidth,
			lineType, font, cg.overlay.smallFontcolor, cg.imageType, cg.overlay.outlinefont, cg.width);
		iYOffset += cg.overlay.iTextLineHeight;
	}

	if (cg.overlay.showExposure)
	{
		sprintf(tmp, "Exposure: %s", length_in_units(cg.lastExposure_us, false));
		// Indicate if in auto-exposure mode.
		if (cg.currentAutoExposure) strcat(tmp, " (auto)");
		cvText(image, tmp, cg.overlay.iTextX, cg.overlay.iTextY + (iYOffset / cg.currentBin),
			cg.overlay.fontsize * SMALLFONTSIZE_MULTIPLIER, cg.overlay.linewidth,
			lineType, font, cg.overlay.smallFontcolor, cg.imageType, cg.overlay.outlinefont, cg.width);
		iYOffset += cg.overlay.iTextLineHeight;
	}

	if (cg.overlay.showGain)
	{
		snprintf(tmp, sizeof(tmp), "Gain: %s", LorF(cg.lastGain, "%d", "%1.2f"));

		// Indicate if in auto gain mode.
		if (cg.currentAutoGain) strcat(tmp, " (auto)");
		// Indicate if in gain transition mode.
		if (gainChange != 0)
		{
			char x[20];
			sprintf(x, " (adj: %+d)", gainChange);
			strcat(tmp, x);
		}
		cvText(image, tmp, cg.overlay.iTextX, cg.overlay.iTextY + (iYOffset / cg.currentBin),
			cg.overlay.fontsize * SMALLFONTSIZE_MULTIPLIER, cg.overlay.linewidth,
			lineType, font, cg.overlay.smallFontcolor, cg.imageType, cg.overlay.outlinefont, cg.width);
		iYOffset += cg.overlay.iTextLineHeight;
	}

	if (cg.overlay.showBrightness)
	{
		sprintf(tmp, "Brightness: %ld", cg.currentBrightness);
		cvText(image, tmp, cg.overlay.iTextX, cg.overlay.iTextY + (iYOffset / cg.currentBin),
			cg.overlay.fontsize * SMALLFONTSIZE_MULTIPLIER, cg.overlay.linewidth,
			lineType, font, cg.overlay.smallFontcolor, cg.imageType, cg.overlay.outlinefont, cg.width);
		iYOffset += cg.overlay.iTextLineHeight;
	}

	if (cg.overlay.showMean && cg.lastMean != 1)
	{
		snprintf(tmp, sizeof(tmp), "Mean: %s", LorF(cg.lastMean, "%d", "%.3f"));
		cvText(image, tmp, cg.overlay.iTextX, cg.overlay.iTextY + (iYOffset / cg.currentBin),
			cg.overlay.fontsize * SMALLFONTSIZE_MULTIPLIER, cg.overlay.linewidth,
			lineType, font, cg.overlay.smallFontcolor, cg.imageType, cg.overlay.outlinefont, cg.width);
		iYOffset += cg.overlay.iTextLineHeight;
	}

	if (cg.overlay.showFocus)
	{
		sprintf(tmp, "Focus: %ld", cg.lastFocusMetric);
		cvText(image, tmp, cg.overlay.iTextX, cg.overlay.iTextY + (iYOffset / cg.currentBin),
			cg.overlay.fontsize * SMALLFONTSIZE_MULTIPLIER, cg.overlay.linewidth,
			lineType, font, cg.overlay.smallFontcolor, cg.imageType, cg.overlay.outlinefont, cg.width);
		iYOffset += cg.overlay.iTextLineHeight;
	}

	if (cg.overlay.showUSB)
	{
		sprintf(tmp, "USB Bandwidth: %ld", cg.lastAsiBandwidth);
		cvText(image, tmp, cg.overlay.iTextX, cg.overlay.iTextY + (iYOffset / cg.currentBin),
			cg.overlay.fontsize * SMALLFONTSIZE_MULTIPLIER, cg.overlay.linewidth,
			lineType, font, cg.overlay.smallFontcolor, cg.imageType, cg.overlay.outlinefont, cg.width);
		iYOffset += cg.overlay.iTextLineHeight;
	}

	/**
	 * Optionally display extra text which is read from the provided file. If the
	 * age of the file exceeds the specified limit then ignore the file.
	 * This prevents situations where the program updating the file stops working.
	**/
	if (cg.overlay.ImgExtraText[0] != '\0') {
		// Display these messages every time, since it's possible the user will
		// correct the issue while we're running.
		if (access(cg.overlay.ImgExtraText, F_OK ) == -1 ) {
			Log(1, "  > *** %s: WARNING: Extra Text File Does Not Exist So Ignoring It\n", cg.ME);
		} else if (access(cg.overlay.ImgExtraText, R_OK ) == -1 ) {
			Log(1, "  > *** %s: WARNING: Cannot Read From Extra Text File So Ignoring It\n", cg.ME);
		} else {
			FILE *fp = fopen(cg.overlay.ImgExtraText, "r");

			if (fp != NULL) {
				bool bAddExtra = false;
				if (cg.overlay.extraFileAge > 0) {
					struct stat buffer;
					if (stat(cg.overlay.ImgExtraText, &buffer) == 0) {
						struct tm modifiedTime = *localtime(&buffer.st_mtime);
						time_t now = time(NULL);
						double ageInSeconds = difftime(now, mktime(&modifiedTime));
						Log(4, "  > Extra Text File (%s) Modified %.1f seconds ago", cg.overlay.ImgExtraText, ageInSeconds);
						if (ageInSeconds < cg.overlay.extraFileAge) {
							Log(4, ", so Using It\n");
							bAddExtra = true;
						} else {
							Log(4, ", so Ignoring\n");
						}
					} else {
						Log(0, "  > *** %s: ERROR: Stat Of Extra Text File Failed !\n", cg.ME);
					}
				} else {
					bAddExtra = true;
				}

				if (bAddExtra) {
					char *line = NULL;
					size_t len = 0;
					int slen = 0;
					while (getline(&line, &len, fp) != -1) {
						slen = strlen(line);
						if (slen >= 2 && (line[slen-2] == 10 || line[slen-2] == 13)) {  // LF, CR
							line[slen-2] = '\0';
						} else if (slen >= 1 && (line[slen-1] == 10 || line[slen-1] == 13)) {
							line[slen-1] = '\0';
						}

						cvText(image, line, cg.overlay.iTextX, cg.overlay.iTextY + (iYOffset / cg.currentBin),
							cg.overlay.fontsize * SMALLFONTSIZE_MULTIPLIER, cg.overlay.linewidth,
							lineType, font,
							cg.overlay.smallFontcolor, cg.imageType, cg.overlay.outlinefont, cg.width);
						iYOffset += cg.overlay.iTextLineHeight;
					}
				}
				fclose(fp);
			} else {
				Log(1, "  > *** %s: WARNING: Failed To Open Extra Text File\n", cg.ME);
			}
		}
	}

	return(iYOffset);
}

// https://stackoverflow.com/questions/7765810/is-there-a-way-to-detect-if-an-image-is-blurry
// https://drive.google.com/file/d/0B6UHr3GQEkQwYnlDY2dKNTdudjg/view?resourcekey=0-a73PvBnc3a2B5wztAV0QaA
double get_focus_metric(cv::Mat img)
{
 	cv::Mat lap;
	cv::Laplacian(img, lap, CV_64F);

	cv::Scalar mu, sigma;
	cv::meanStdDev(lap, mu, sigma);

	double focusMetric = sigma.val[0]*sigma.val[0];
	Log(4, "  > Focus: %'f\n", focusMetric);
	return(focusMetric);
}


// Return the flip value as a human-readable string
char const *getFlip(int f)
{
	if (f == 0)
		return("none");
	else if (f == 1)
		return("horizontal");
	else if (f == 2)
		return("vertical");
	else if (f == 3)
		return("both");
	else
	{
		static char u[40];
		snprintf(u, sizeof(u), "Unknown flip: %d", f);
		return(u);
	}
}

// Display a notification image.
int displayNotificationImage(char const *arg)
{
	char cmd[1024];

	snprintf(cmd, sizeof(cmd)-1, "%s/scripts/copy_notification_image.sh %s", CG.allskyHome, arg);
	Log(4, "Calling system(%s)\n", cmd);
	return(system(cmd));
}


// Exit the program gracefully.
void closeUp(int e)
{
	if (CG.quietExit) exit(e);		// Called manually so don't display anything.

	static bool closingUp = false;		// indicates if we're in the process of exiting.
	// For whatever reason, we're sometimes called twice, but we should only execute once.
	if (closingUp) return;

	closingUp = true;

	(void) stopVideoCapture(CG.cameraNumber);

	// Close the optional display window.	// not used by RPi
	if (bDisplay)
	{
		bDisplay = false;
		void *retval;
		pthread_join(threadDisplay, &retval);
	}

	char const *a = e == EXIT_RESTARTING ? "Restarting" : "Stopping";

	if (CG.notificationImages) {
		if (e == EXIT_RESTARTING)
			(void) displayNotificationImage("--expires 15 Restarting &");
		else
			(void) displayNotificationImage("--expires 2 NotRunning &");

		// Sleep to give it a chance to print any messages so they (hopefully) get printed
		// before the one below. This is only so it looks nicer in the log file.
		sleep(3);
	}

	printf("     ***** %s AllSky *****\n", a);

	// ZWO seems to hang on ASICloseCamera() if taking a picture when the signal is sent,
	// until the exposure finishes, then it never returns so the remaining code doesn't
	// get executed. Don't know how to get around that - hopefully this works:
	if (CG.ct == ctZWO && ! gotSignal && e != EXIT_NO_CAMERA)
		(void) closeCamera(CG.cameraNumber);

	exit(e);
}

// Handle signals
void IntHandle(int i)
{
	// We sometimes get the signal twice, so ignore 2nd time.
	if (gotSignal) return;

	gotSignal = true;
	if (i == SIGHUP)
	{
		gotSignal = false;

		// TODO: Re-read configuration instead of restarting.
		Log(4, "%s: Got SIGHUP to restart.\n", CG.ME);
		closeUp(EXIT_RESTARTING);
		/*NOTREACHED*/
	}

	if (i == SIGINT || i == SIGTERM)
	{
		Log(4, "%s: Got %s to exit.\n", CG.ME, i == SIGINT ? "SIGINT" : "SIGTERM");
		closeUp(EXIT_OK);
	}
	else
	{
		Log(0, "%s: Got unknown signal %d.\n", CG.ME, i);
		closeUp(i);
	}
}


// Validate a long integer, typically a command-line argument.
// invalidIsOK determines whether we return "true" if the number out of bounds, or "false".
// "false" means it's an error, "true" means it's a warning.
bool validateLong(long *num, long min, long max, char const *name, bool invalidIsOK)
{
	if (*num < min) {
		fprintf(stderr, "*** %s: '%s' (%'ld) is less than the minimum of %'ld",
			invalidIsOK ? "WARNING" : "ERROR", name, *num, min);
		if (invalidIsOK)
		{
			fprintf(stderr, "; setting to the minimum");
			*num = min;
		}
		fprintf(stderr, "\n");
		return invalidIsOK;

	} else if (*num > max) {
		fprintf(stderr, "*** %s: '%s' (%'ld) is greater than the maximum of %'ld",
			invalidIsOK ? "WARNING" : "ERROR", name, *num, max);
		if (invalidIsOK)
		{
			fprintf(stderr, "; setting to the maximum");
			*num = max;
		}
		fprintf(stderr, "\n");
		return invalidIsOK;
	}
	return true;
}

// Ditto but for floating-point numbers.
bool validateFloat(double *num, double min, double max, char const *name, bool invalidIsOK)
{
	if (*num < min) {
		fprintf(stderr, "*** %s: '%s' (%'.3f) is less than the minimum of %'.3f",
			invalidIsOK ? "WARNING" : "ERROR", name, *num, min);
		if (invalidIsOK == true)
		{
			fprintf(stderr, "; setting to the minimum.");
			*num = min;
		}
		fprintf(stderr, "\n");
		return invalidIsOK;

	} else if (*num > max) {
		fprintf(stderr, "*** %s: '%s' (%'.3f) is greater than the maximum of %'.3f",
			invalidIsOK ? "WARNING" : "ERROR", name, *num, max);
		if (invalidIsOK == true)
		{
			fprintf(stderr, "; setting to the maximum.");
			*num = max;
		}
		fprintf(stderr, "\n");
		return invalidIsOK;
	}

	return true;
}


// Display the header whenever Allsky starts.
void displayHeader(config cg)
{
	// Display the version
	printf("\n%s", c(KGRN));
	char v[100]; snprintf(v, sizeof(v), "*** Allsky Camera Software Version %s ***", cg.version);
	for (size_t i=0; i<strlen(v); i++) printf("*");
	printf("\n");
	printf("%s\n", v);
	for (size_t i=0; i<strlen(v); i++) printf("*");
	printf("\n\n");

	if (cg.ct == ctZWO)
		printf("Capture images of the sky with a Raspberry Pi and a ZWO ASI camera\n");
	else
		printf("Capture images of the sky with a Raspberry Pi and an RPi camera\n");
	printf("%s\n", c(KNRM));

	if (! cg.help) printf("%sAdd --help for available options%s\n\n", c(KYEL), c(KNRM));
	printf("Author: Thomas Jacquin - <jacquin.thomas@gmail.com>\n\n");
	printf("Contributors:\n");
	printf(" -Knut Olav Klo\n");
	printf(" -Daniel Johnsen\n");
	printf(" -Robert Wagner\n");
	printf(" -Michael J. Kidd - <linuxkidd@gmail.com>\n");
	printf(" -Rob Musquetier\n");
	if (cg.ct == ctZWO) {
		printf(" -Yang and Sam from ZWO\n");
		printf(" -Chris Kuethe\n");
	}
	printf(" -Eric Claeys\n");
	printf(" -Andreas Lindinger\n");
	printf("\n");
}


// Display the help message.
int const n = 25;		// width of argument name
void displayHelp(config cg)
{
	printf("%sUsage:\n", c(KRED));
	printf(" capture%s -width 0 -height 0 -nightexposure 5000000 -daybin 1 -nightbin 2\n\n", cg.ct == ctRPi ? "_RPiHQ" : "");
	printf("%s", c(KNRM));
	printf("%sAvailable Arguments (see the WebUI for more details):\n", c(KYEL));
	printf("     'b' is a boolean (0 or 1), 'n' is a number, 's' is a string\n");
	printf("     %'d ms (milli-seconds) = 1 second.  %'d us (micro-seconds) = 1 second.\n", 1000, 1000000);
	printf("     See the Allsky WebUI for camera-dependent defaults.\n");
	printf("     Non camera-dependent defaults are in [brackets].\n");

	printf(" -%-*s - Optional configuration file to use instead of, or in addition to,\n", n, "config s");
	printf("  %-*s   command-line arguments.  The file is read when seen on the command line [none].\n", n, "");

	printf("\nDaytime settings:\n");
	printf(" -%-*s - 1 enables capturing of daytime images [%s].\n", n, "takeDaytimeImages b", yesNo(cg.daytimeCapture));
	printf(" -%-*s - 1 enables saving of daytime images [%s].\n", n, "saveDaytimeImages b", yesNo(cg.daytimeSave));
	printf(" -%-*s - 1 enables daytime auto-exposure [%s].\n", n, "dayautoexposure b", yesNo(cg.dayAutoExposure));
	printf(" -%-*s - Maximum daytime auto-exposure in ms.\n", n, "daymaxexposure n");
	printf(" -%-*s - Daytime exposure in us [%'ld].\n", n, "dayexposure n", cg.dayExposure_us);
	printf(" -%-*s - Daytime mean target brightness [%.2f].\n", n, "daymean", cg.myModeMeanSetting.dayMean);
	printf(" -%-*s - Daytime mean target threshold [%.2f].\n", n, "daymean-threshold n", cg.myModeMeanSetting.dayMean_threshold);
	printf("  %-*s   NOTE: Daytime auto-gain and auto-exposure should be on for best results.\n", n, "");
	printf(" -%-*s - Daytime brightness change [%'ld].\n", n, "daybrightness n", cg.dayBrightness);
	printf(" -%-*s - Delay between daytime images in ms [%'ld].\n", n, "dayDelay n", cg.dayDelay_ms);
	printf(" -%-*s - 1 enables daytime auto gain [%s].\n", n, "dayautogain b", yesNo(cg.dayAutoGain));
	printf(" -%-*s - Daytime maximum auto gain.\n", n, "daymaxautogain n");
	printf(" -%-*s - Daytime gain.\n", n, "daygain n");
	printf(" -%-*s - 1 = binning OFF (1x1), 2 = 2x2 binning, etc. [%ld]\n", n, "daybin n", cg.dayBin);
	printf(" -%-*s - 1 enables auto White Balance [%s].\n", n, "dayautowhitebalance b", yesNo(cg.dayAutoAWB));
	printf(" -%-*s - Manual White Balance Red.\n", n, "daywbr n");
	printf(" -%-*s - Manual White Balance Blue.\n", n, "daywbb n");
	printf(" -%-*s - Number of auto-exposure frames to skip when starting software during daytime [%ld].\n", n, "dayskipframes n", cg.daySkipFrames);
	if (cg.ct == ctZWO) {
		printf(" -%-*s - 1 enables cooler (cooled cameras only) [%s].\n", n, "dayEnableCooler b", yesNo(cg.dayEnableCooler));
		printf(" -%-*s - Target temperature in degrees C (cooled cameras only).\n", n, "dayTargetTemp n");
	}
	if (cg.ct == ctRPi && cg.isLibcamera) {
		printf(" -%-*s - Name of the day camera tuning file to use [%s].\n", n, "dayTuningFile s", "none");
	}

	printf("\nNighttime settings:\n");
	printf(" -%-*s - 1 enables capturing of nighttime images [%s].\n", n, "takeNighttimeImages b", yesNo(cg.nighttimeCapture));
	printf(" -%-*s - 1 enables saving of nighttime images [%s].\n", n, "saveNighttimeImages b", yesNo(cg.nighttimeSave));
	printf(" -%-*s - 1 enables nighttime auto-exposure [%s].\n", n, "nightautoexposure b", yesNo(cg.nightAutoExposure));
	printf(" -%-*s - Maximum nighttime auto-exposure in ms.\n", n, "nightmaxexposure n");
	printf(" -%-*s - Nighttime exposure in us [%'ld].\n", n, "nightexposure n", cg.nightExposure_us);
	printf(" -%-*s - Nighttime mean target brightness [%.2f].\n", n, "nightmean n", cg.myModeMeanSetting.nightMean);
	printf("  %-*s   NOTE: Nighttime auto-gain and auto-exposure should be on for best results.\n", n, "");
	printf(" -%-*s - Nighttime mean target threshold [%.2f].\n", n, "nightmean-threshold n", cg.myModeMeanSetting.nightMean_threshold);
	printf(" -%-*s - Nighttime brightness change [%ld].\n", n, "nightbrightness n n", cg.nightBrightness);
	printf(" -%-*s - Delay between nighttime images in ms [%'ld].\n", n, "nightDelay n", cg.nightDelay_ms);
	printf(" -%-*s - 1 enables nighttime auto gain [%s].\n", n, "nightautogain b", yesNo(cg.nightAutoGain));
	printf(" -%-*s - Nighttime maximum auto gain.\n", n, "nightmaxautogain n");
	printf(" -%-*s - Nighttime gain.\n", n, "nightgain n");
	printf(" -%-*s - Same as daybin but for night [%ld].\n", n, "nightbin n", cg.nightBin);
	printf(" -%-*s - 1 enables auto White Balance [%s].\n", n, "nightautowhitebalance n", yesNo(cg.nightAutoAWB));
	printf(" -%-*s - Manual White Balance Red.\n", n, "nightwbr n");
	printf(" -%-*s - Manual White Balance Blue.\n", n, "nightwbb n");
	printf(" -%-*s - Number of auto-exposure frames to skip when starting software during nighttime [%ld].\n", n, "nightskipframes n", cg.nightSkipFrames);
	if (cg.ct == ctZWO) {
		printf(" -%-*s - 1 enables cooler (cooled cameras only) [%s]\n", n, "nightEnableCooler b", yesNo(cg.nightEnableCooler));
		printf(" -%-*s - Target temperature in degrees C (cooled cameras only).\n", n, "nightTargetTemp n");
	}
	if (cg.ct == ctRPi && cg.isLibcamera) {
		printf(" -%-*s - Name of the night camera tuning file to use [%s].\n", n, "nightTuningFile s", "none");
	}

	printf("\nDay and nighttime settings:\n");
	if (cg.ct == ctRPi) {
		printf(" -%-*s - Image saturation.\n", n, "saturation n");
		printf(" -%-*s - Image contrast..\n", n, "contrast n");
		printf(" -%-*s - Image sharpness.\n", n, "sharpness n");
	}
	if (cg.ct == ctZWO) {
		printf(" -%-*s - Gamma level.\n", n, "gamma n");
		printf(" -%-*s - Offset.\n", n, "offset n");
		printf(" -%-*s - Percent of exposure change to make, similar to PHD2 [%ld%%].\n", n, "aggression n", cg.aggression);
		printf(" -%-*s - Seconds to transition gain from day-to-night or night-to-day.  0 disable it [%'ld].\n", n, "gaintransitiontime n", cg.gainTransitionTime);
	}
	printf(" -%-*s - Camera maximum width [%ld].\n", n, "width n", cg.width);
	printf(" -%-*s - Camera maximum height [%ld].\n", n, "height n", cg.height);
	printf(" -%-*s - Type of image: 99 = auto,  0 = RAW8,  1 = RGB24 [%ld]", n, "type n", cg.imageType);
	if (cg.ct == ctZWO) {
		printf(",  2 = RAW16,  3 = Y8");
	}
	printf("\n");
	printf(" -%-*s - Quality (JPG, 0-100) or compression (PNG, 0-9) of image [JPG=%ld, PNG=%ld].\n", n, "quality n", cg.qualityJPG, cg.qualityPNG);
	printf(" -%-*s - Name of image file to create [%s].\n", n, "filename s", cg.fileName);
	if (cg.ct == ctRPi) {
		if (cg.isLibcamera)
			printf(" -%-*s - Amount to rotate image in degrees - 0 or 180 [%ld].\n", n, "rotation n", cg.rotation);
		else
			printf(" -%-*s - Amount to rotate image in degrees - 0, 90, 180, or 270 [%ld].\n", n, "rotation n", cg.rotation);
	}
	printf(" -%-*s - 0 = No flip, 1 = Horizontal, 2 = Vertical, 3 = Both [%ld].\n", n, "flip n", cg.flip);
	printf(" -%-*s - 1 enables focus mode [%s].\n", n, "determineFocus b", yesNo(cg.determineFocus));
	printf(" -%-*s - 1 enables consistent delays between images [%s].\n", n, "consistentDelays b", yesNo(cg.consistentDelays));
	printf(" -%-*s - Format the time is displayed in [%s].\n", n, "timeformat s", cg.timeFormat);
	printf(" -%-*s - 1 enables notification images, for example, 'Camera is off during day' [%s].\n", n, "notificationimages b", yesNo(cg.notificationImages));
	printf(" -%-*s - Latitude of the camera [no default - you must set it].\n", n, "latitude s");
	printf(" -%-*s - Longitude of the camera [no default - you must set it].\n", n, "longitude s");
	printf(" -%-*s - Angle of the sun below the horizon [%.2f].\n", n, "angle n", cg.angle);
	printf("  %-*s   -6 = civil twilight   -12 = nautical twilight   -18 = astronomical twilight.\n", n, "");
	printf(" -%-*s - 1 takes dark frames [%s].\n", n, "takeDarkFrames b", yesNo(cg.takeDarkFrames));
	printf(" -%-*s - Your locale - to determine thousands separator and decimal point [%s].\n", n, "locale s", "locale on Pi");
	printf("  %-*s   Type 'locale' at a command prompt to determine yours.\n", n, "");
	if (cg.ct == ctZWO) {
		printf(" -%-*s - Default = %d %d %0.2f %0.2f (box width X, box width y, X offset percent (0-100), Y offset (0-100))\n", n, "histogrambox n n n n", cg.HB.histogramBoxSizeX, cg.HB.histogramBoxSizeY, cg.HB.histogramBoxPercentFromLeft * 100.0, cg.HB.histogramBoxPercentFromTop * 100.0);
		printf(" -%-*s - 1 enables auto USB Speed.\n", n, "autousb b");
		printf(" -%-*s - USB bandwidth percent.\n", n, "usb n");
		printf(" -%-*s - 1 enables a newer ZWO auto-exposure algorithm [%s].\n", n, "experimentalExposure b", yesNo(cg.HB.useExperimentalExposure));
		printf(" -%-*s - Determines if version 0.8 exposure method should be used [%s].\n", n, "newexposure b", yesNo(cg.videoOffBetweenImages));
	}
	if (cg.ct == ctRPi) {
		printf(" -%-*s - Extra arguments pass to image capture program [%s].\n", n, "extraArgs s", cg.extraArgs);
	}
	printf(" -%-*s - Set to 1, 2, 3, or 4 for more debugging information [%ld].\n", n, "debuglevel n", cg.debugLevel);

	printf("\nOverlay settings:\n");
	printf(" -%-*s - Set to %d to use the new, enhanced 'module' overlay program [%s].\n", n, "overlayMethod n", OVERLAY_METHOD_LEGACY, getOverlayMethod(cg.overlay.overlayMethod).c_str());
	printf(" -%-*s - Set to 1 to display the time [%s].\n", n, "showTime b", yesNo(cg.overlay.showTime));
	printf(" -%-*s - Units to display temperature in: 'C'elsius, 'F'ahrenheit, or 'B'oth [%s].\n", n, "temptype s", cg.tempType);
	printf(" -%-*s - 1 displays the exposure length [%s].\n", n, "showExposure b", yesNo(cg.overlay.showExposure));
	printf(" -%-*s - 1 displays the camera sensor temperature [%s].\n", n, "showTemp b", yesNo(cg.overlay.showTemp));
	printf(" -%-*s - 1 displays the gain [%s].\n", n, "showGain b", yesNo(cg.overlay.showGain));
	printf(" -%-*s - 1 displays the brightness [%s].\n", n, "showBrightness b", yesNo(cg.overlay.showBrightness));
	printf(" -%-*s - 1 displays the mean brightness used in auto-exposure [%s].\n", n, "showMean b", yesNo(cg.overlay.showMean));
	printf(" -%-*s - 1 displays a focus metric - the higher the number the better focus [%s].\n", n, "showFocus b", yesNo(cg.overlay.showFocus));
	if (cg.ct == ctZWO) {
		printf(" -%-*s - 1 displays an outline of the histogram box.\n", n, "showhistogrambox b");
		printf("  %-*s   Useful to determine what parameters to use with -histogrambox.\n", n, "");
	}
	printf(" -%-*s - Text Overlay [\"\"].\n", n, "text s");
	printf(" -%-*s - Full Path to extra text to display [\"\"].\n", n, "extratext s");
	printf(" -%-*s - If the extra file is not updated after this many seconds its contents will not be displayecg. 0 disables it [0].\n", n, "extratextage n");
	printf(" -%-*s - Text Line Height in pixels [%ld].\n", n, "textlineheight n", cg.overlay.iTextLineHeight);
	printf(" -%-*s - Text Placement Horizontal from LEFT in pixels [%'ld].\n", n, "textx n", cg.overlay.iTextX);
	printf(" -%-*s - Text Placement Vertical from TOP in pixels [%'ld].\n", n, "texty n", cg.overlay.iTextY);
	printf(" -%-*s - Font Types (0-7), Ex. 0 = simplex, 4 = triplex, 7 = script [%ld]\n", n, "fontname n", cg.overlay.fontnumber);
	printf(" -%-*s - Text font color (BGR) [255 0 0].\n", n, "fontcolor n n n");
	printf(" -%-*s - Small text font color (BGR) [0 0 255].\n", n, "smallfontcolor n n n");
	printf(" -%-*s - Font Line Type: 0=AA, 1=8, 2=4 [%ld].\n", n, "fonttype n", cg.overlay.linenumber);
	printf(" -%-*s - Text Font Size [%.2f].\n", n, "fontsize n", cg.overlay.fontsize);
	printf(" -%-*s - Text Font Line Thickness [%ld].\n", n, "fontline n", cg.overlay.linewidth);
	printf(" -%-*s - 1 enables outline font [%s].\n", n, "outlinefont b", yesNo(cg.overlay.outlinefont));

	printf("\nMisc. settings:\n");
	printf(" -%-*s - Camera number [%d].\n", n, "cameraID n", cg.cameraNumber);
	printf(" -%-*s - Where to save 'filename' [%s].\n", n, "save_dir s", cg.saveDir);
	printf(" -%-*s - 1 previews the captured images. Only works with a Desktop Environment [%s]\n", n, "preview", yesNo(cg.preview));
	printf(" -%-*s - Outputs the camera's capabilities to the specified file and exists.\n", n, "cc_file s");
	if (cg.ct == ctRPi) {
		printf(" -%-*s - Command being used to take pictures (Buster: raspistill, Bullseye: libcamera-still\n", n, "cmd s");
	}
/* These are too advanced for anyone other than developers.
	printf(" -%-*s - Be careful changing these values, ExposureChange (Steps) = p0 + (p1*diff) + (p2*diff)^2 [%.1f].\n", n, "mean-p0 n", cg.myModeMeanSetting.dayMean_threshold);
	printf(" -%-*s - [%.1f].\n", n, "mean-p1 n", cg.myModeMeanSetting.mean_p1);
	printf(" -%-*s - [%.1f].\n", n, "mean-p2 n", cg.myModeMeanSetting.mean_p2);
*/

	printf(" -%-*s - Version of Allsky in use.\n", n, "version s");

	printf("%s\n", c(KNRM));
}

// If it's a Long integer, return a string representation with the specified "L" format.
// If the passed in value is a Float, return a string representation of it with the specified "F" format.
// Alternate use of static variables so LorF() can be called multiple times in one printf() statement.
char *LorF(double num, char const *L, char const *F)
{
#define NUM_BUFS 4
	static char n[NUM_BUFS][20];
	static int on = 0;
	int o = on;
	if (num == (int)num) {
		snprintf(n[on], sizeof(n[0]), L, (long)num);
	} else {
		snprintf(n[on], sizeof(n[0]), F, num);
	}
	if (++on == NUM_BUFS) on = 0;
	return(n[o]);
}

// Return the string if it exists, or "[none]"
char const *stringORnone(char const *s)
{
	if (s == NULL || *s == '\0')
		return("[none]");
	else
		return(s);
}


// Display settings.
void displaySettings(config cg)
{
	printf("%s", c(KGRN));
	printf("\nSettings:\n");

	if (cg.cameraNumber > 0)
		printf("   Camera number: %d\n", cg.cameraNumber);
	if (cg.cmdToUse != NULL)
		printf("   Command: %s\n", cg.cmdToUse);
	printf("   Image Type: %s (%ld)\n", cg.sType, cg.imageType);
	printf("   Resolution (before any binning): %ldx%ld\n", cg.width, cg.height);
	printf("   Configuration file: %s\n", stringORnone(cg.configFile));
	printf("   Quality: %ld\n", cg.userQuality);
	printf("   Daytime capture: %s\n", yesNo(cg.daytimeCapture));
	printf("   Daytime save: %s\n", yesNo(cg.daytimeSave));
	printf("   Nighttime capture: %s\n", yesNo(cg.nighttimeCapture));
	printf("   Nighttime save: %s\n", yesNo(cg.nighttimeSave));

	printf("   Exposure (day):   %15s, Auto: %3s", length_in_units(cg.dayExposure_us, true), yesNo(cg.dayAutoExposure));
		if (cg.dayAutoExposure)
			printf(", Max Auto-Exposure: %s", length_in_units(cg.dayMaxAutoExposure_us, true));
		printf("\n");
	printf("   Exposure (night): %15s, Auto: %3s", length_in_units(cg.nightExposure_us, true), yesNo(cg.nightAutoExposure));
		if (cg.nightAutoExposure)
			printf(", Max Auto-Exposure: %s", length_in_units(cg.nightMaxAutoExposure_us, true));
		printf("\n");
	printf("   Gain (day):   %5s, Auto: %3s", LorF(cg.dayGain, "%ld", "%1.2f"), yesNo(cg.dayAutoGain));
		if (cg.dayAutoGain)
			printf(", Max Auto-Gain: %s", LorF(cg.dayMaxAutoGain, "%ld", "%1.2f"));
		printf("\n");
	printf("   Gain (night): %5s, Auto: %3s", LorF(cg.nightGain, "%ld", "%1.2f"), yesNo(cg.nightAutoGain));
		if (cg.nightAutoGain)
			printf(", Max Auto-Gain: %s", LorF(cg.nightMaxAutoGain, "%ld", "%1.2f"));
		printf("\n");
	if (cg.gainTransitionTimeImplemented)
		printf("   Gain Transition Time: %.1f minutes\n", (float) cg.gainTransitionTime/60);

	printf("   Target Mean Value (day):       %1.3f\n", cg.myModeMeanSetting.dayMean);
	printf("   Target Mean Value (night):     %1.3f\n", cg.myModeMeanSetting.nightMean);
	printf("   Target Mean Threshold (day):   %1.3f\n", cg.myModeMeanSetting.dayMean_threshold);
	printf("   Target Mean Threshold (night): %1.3f\n", cg.myModeMeanSetting.nightMean_threshold);
	if (cg.supportsMyModeMean)
	{
		printf("      p0: %1.3f\n", cg.myModeMeanSetting.mean_p0);
		printf("      p1: %1.3f\n", cg.myModeMeanSetting.mean_p1);
		printf("      p2: %1.3f\n", cg.myModeMeanSetting.mean_p2);
	}

	printf("   Brightness (day):   %ld\n", cg.dayBrightness);
	printf("   Brightness (night): %ld\n", cg.nightBrightness);
	printf("   Binning (day):   %ld\n", cg.dayBin);
	printf("   Binning (night): %ld\n", cg.nightBin);
	if (cg.isColorCamera) {
		printf("   White Balance (day)   Red: %s, Blue: %s, Auto: %3s\n", LorF(cg.dayWBR, "%ld", "%.2f"), LorF(cg.dayWBB, "%ld", "%.2f"), yesNo(cg.dayAutoAWB));
		printf("   White Balance (night) Red: %s, Blue: %s, Auto: %3s\n", LorF(cg.nightWBR, "%ld", "%.2f"), LorF(cg.nightWBB, "%ld", "%.2f"), yesNo(cg.nightAutoAWB));
	}
	printf("   Delay (day):   %s\n", length_in_units(cg.dayDelay_ms * US_IN_MS, true));
	printf("   Delay (night): %s\n", length_in_units(cg.nightDelay_ms * US_IN_MS, true));
	printf("   Consistent delays: %s\n", yesNo(cg.consistentDelays));
	printf("   Skip Frames (day):   %ld\n", cg.daySkipFrames);
	printf("   Skip Frames (night): %ld\n", cg.nightSkipFrames);

	if (cg.supportsAggression)
		printf("   Aggression: %ld%%\n", cg.aggression);
	if (cg.isCooledCamera) {
		printf("   Enable Cooler (day): %s", yesNo(cg.dayEnableCooler));
		if (cg.dayEnableCooler) printf(", Target Temperature (day): %ld C\n", cg.dayTargetTemp);
		printf("   Enable Cooler (night): %s", yesNo(cg.nightEnableCooler));
		if (cg.nightEnableCooler) printf(", Target Temperature (night): %ld C\n", cg.nightTargetTemp);
		printf("\n");
	}
	if (cg.ct == ctZWO) {
		if (cg.gamma != NOT_CHANGED) printf("   Gamma: %ld\n", cg.gamma);
		if (cg.offset != NOT_CHANGED) printf("   Offset: %ld\n", cg.offset);
		if (cg.asiBandwidth != NOT_CHANGED) printf("   USB Speed: %ld, auto: %s\n", cg.asiBandwidth, yesNo(cg.asiAutoBandwidth));
	}
	if (cg.ct == ctRPi) {
		printf("   Saturation: %.1f\n", cg.saturation);
		printf("   Contrast: %.1f\n", cg.contrast);
		printf("   Sharpness: %.1f\n", cg.sharpness);
		printf("   Rotation: %ld\n", cg.rotation);
	}
	if (cg.flip != NOT_CHANGED) printf("   Flip Image: %s (%ld)\n", getFlip(cg.flip), cg.flip);
	printf("   Filename: %s saved to %s\n", stringORnone(cg.fileName), stringORnone(cg.saveDir));
	printf("   Latitude: %s, Longitude: %s\n", stringORnone(cg.latitude), stringORnone(cg.longitude));
	printf("   Sun Elevation: %.2f\n", cg.angle);
	if (cg.ct == ctRPi) {
		printf("   Extra arguments: %s\n", stringORnone(cg.extraArgs));
	}
	printf("   Locale: %s\n", cg.locale);
	printf("   Notification Images: %s\n", yesNo(cg.notificationImages));
	if (cg.ct == ctZWO) {
		printf("   Histogram Box: %d %d %0.0f %0.0f, center: %dx%d, upper left: %dx%d, lower right: %dx%d\n",
			cg.HB.histogramBoxSizeX, cg.HB.histogramBoxSizeY,
			cg.HB.histogramBoxPercentFromLeft * 100.0, cg.HB.histogramBoxPercentFromTop * 100.0,
			cg.HB.centerX, cg.HB.centerY, cg.HB.leftOfBox, cg.HB.topOfBox, cg.HB.rightOfBox, cg.HB.bottomOfBox);
		printf("   New Exposure Algorithm: %s\n", yesNo(cg.HB.useExperimentalExposure));
		printf("   Video OFF Between Images: %s\n", yesNo(cg.videoOffBetweenImages));
	}
	printf("   Preview: %s\n", yesNo(cg.preview));
	printf("   Focus mode: %s\n", yesNo(cg.determineFocus));
	printf("   Taking Dark Frames: %s\n", yesNo(cg.takeDarkFrames));
	printf("   Debug Level: %ld\n", cg.debugLevel);
	printf("   On TTY: %s\n", yesNo(cg.tty));
	if (cg.ct == ctRPi && cg.isLibcamera) {
		printf("   Tuning File (day): %s\n", stringORnone(cg.dayTuningFile));
		printf("   Tuning File (night): %s\n", stringORnone(cg.nightTuningFile));
	}

	printf("   Overlay method: %s\n", getOverlayMethod(cg.overlay.overlayMethod).c_str());
	if (cg.overlay.overlayMethod == OVERLAY_METHOD_LEGACY) {
		printf("   Overlay settings:\n");
		printf("      Text Overlay: %s\n", stringORnone(cg.overlay.ImgText));
		printf("      Text Extra File: %s, Age: %ld seconds\n", stringORnone(cg.overlay.ImgExtraText), cg.overlay.extraFileAge);
		printf("      Text Line Height %ldpx\n", cg.overlay.iTextLineHeight);
		printf("      Text Position: %ldpx from left, %ldpx from top\n", cg.overlay.iTextX, cg.overlay.iTextY);
		printf("      Font Name: %s (%ld)\n", fontnames[cg.overlay.fontnumber], cg.overlay.fontnumber);
		printf("      Font Color: %d, %d, %d\n", cg.overlay.fontcolor[0], cg.overlay.fontcolor[1], cg.overlay.fontcolor[2]);
		printf("      Small Font Color: %d, %d, %d\n", cg.overlay.smallFontcolor[0], cg.overlay.smallFontcolor[1], cg.overlay.smallFontcolor[2]);
		printf("      Font Line Type: %d\n", cg.overlay.linetype[cg.overlay.linenumber]);
		printf("      Font Size: %1.1f\n", cg.overlay.fontsize);
		printf("      Font Line Width: %ld\n", cg.overlay.linewidth);
		printf("      Outline Font : %s\n", yesNo(cg.overlay.outlinefont));

		printf("      Show Time: %s (format: %s)\n", yesNo(cg.overlay.showTime), stringORnone(cg.timeFormat));
		printf("      Show Exposure: %s\n", yesNo(cg.overlay.showExposure));
		if (cg.supportsTemperature)
			printf("      Show Temperature: %s, type: %s\n", yesNo(cg.overlay.showTemp), stringORnone(cg.tempType));
		printf("      Show Gain: %s\n", yesNo(cg.overlay.showGain));
		printf("      Show Brightness: %s\n", yesNo(cg.overlay.showBrightness));
		printf("      Show Target Mean Brightness: %s\n", yesNo(cg.overlay.showMean));
		printf("      Show Focus Metric: %s\n", yesNo(cg.overlay.showFocus));
		if (cg.ct == ctZWO) {
			printf("      Show Histogram Box: %s\n", yesNo(cg.overlay.showHistogramBox));
		}
	} else if (cg.supportsTemperature) {
		printf("   Temperature type: %s\n", stringORnone(cg.tempType));
	}

	printf("   Allsky version: %s\n", stringORnone(cg.version));
	if (cg.ct == ctZWO) {
		printf("   ZWO SDK version %s\n", stringORnone(cg.ASIversion));
	}
	printf("%s", c(KNRM));
}

// Sleep when we're not taking daytime or nighttime images.
// Try to be smart about it so we don't sleep a gazillion times.
// "forDaytime" will be true if we're sleeping during the day, else at night.
bool day_night_timeSleep(bool displayedMsg, config cg, bool forDaytime)
{
	// Only display messages once a day.
	if (! displayedMsg)
	{
		if (cg.notificationImages) {
			// In case another notification image is being upload, give it time to finish.
			sleep(5);
			if (forDaytime)
				(void) displayNotificationImage("--expires 0 CameraOffDuringDay &");
			else
				(void) displayNotificationImage("--expires 0 CameraOffDuringNight &");
		}
		Log(1, "It's %stime... we're not saving images.\n", forDaytime ? "day" : "night");
		displayedMsg = true;

		// Sleep until a little before nighttime/daytime, then wake up and sleep more if needed.
		int secsTillNext = calculateTimeToNextTime(cg.latitude, cg.longitude, cg.angle, forDaytime);
		timeval t;
		t = getTimeval();
		t.tv_sec += secsTillNext;
		Log(2, "Sleeping until %s (%'d seconds)\n", formatTime(t, cg.timeFormat), secsTillNext);
		sleep(secsTillNext);
	}
	else
	{
		// Shouldn't need to sleep more than a few times before nighttime.
		int s = 5;
		Log(2, "Not quite %time; sleeping %'d more seconds\n", forDaytime ? "night" : "day", s);
		sleep(s);
	}

	return(displayedMsg);
}


void delayBetweenImages(config cg, long lastExposure_us, std::string sleepType)
{
	if (cg.takeDarkFrames) {
		Log(2, "  > Not sleeping between dark frames\n");
		return;
	}

	long s_us = 0;
	if (cg.consistentDelays) {
		// consistentDelays keeps a constant frame rate during timelapse generation by
		// always using starting the next exposure (delay + currentMaxAutoExposure_us)
		// after the last exposure.
		// So if the actual exposure is less than the max,
		// we still wait until we reach maxexposure, then wait for the delay period.

		if (lastExposure_us < cg.currentMaxAutoExposure_us)		// TODO: if AE_ALLSKY:    && cg.currentAutoExposure)
			s_us = cg.currentMaxAutoExposure_us - lastExposure_us;	// how much longer till max?
		s_us += (cg.currentDelay_ms * US_IN_MS);		// Add standard delay amount
		Log(2, "  > Sleeping: %s\n", length_in_units(s_us, false));

	} else {
		s_us = cg.currentDelay_ms * US_IN_MS;
		Log(2, "  > Sleeping %s between %s exposures\n", length_in_units(s_us, false), sleepType.c_str());
	}

	usleep(s_us);	// usleep() is in us (microseconds)
}


// Get a line from the specified buffer.
// The first time getLine() is called, it starts at the beginning of the buffer.
// Subsequent calls start at the beginning on the next line.
// A line ends with NULL, or the last CR/LF.
// NULL-out CR or LF, or both if they are in a row.
// Keep track of the beginning of the next line.
// Return a pointer to the beginning of the line or NULL if at the end of the file.
char *getLine(char *buffer)
{
	static char *nextLine = NULL;
	char *startOfLine;
	char *ptr;

	if (nextLine == NULL)
		ptr = buffer;
	else
		ptr = nextLine;

	if (*ptr == '\0')
		return(NULL);		// end of the buffer

	startOfLine = ptr;
	for (; *ptr != '\0'; ptr++)
	{
		if (*ptr == '\r' || *ptr == '\n')
		{
			*ptr = '\0';
			ptr++;
			if (*ptr == '\r' || *ptr == '\n')
			{
				*ptr = '\0';
				ptr++;
			}
			break;
		}
	}
	nextLine = ptr;

	return(startOfLine);
}

// Get settings from a configuration file.
bool called_from_getConfigFileArguments = false;
static bool getConfigFileArguments(config *cg)
{
	if (called_from_getConfigFileArguments)
	{
		Log(-1, "*** %s: WARNING: Configuration file calls itself; ignoring!\n", cg->ME);
		return true;
	}

	if (cg->configFile[0] == '\0') {
		Log(0, "*** %s: ERROR: Unable to read configuration file: no file specified!\n", cg->ME);
		return false;
	}

	// Read the whole configuration file into memory so we can create argv with pointers
	static char *buf = NULL;
	int fd;
	if ((fd = open(cg->configFile, O_RDONLY)) == -1)
	{
		int e = errno;
		Log(0, "*** %s: ERROR: Could not open configuration file '%s': %s!",
			cg->ME, cg->configFile, strerror(e));
		return false;
	}
	struct stat statbuf;
	if (fstat(fd, &statbuf) == 1)		// This should never fail
	{
		int e = errno;
		Log(0, "*** %s: ERROR: Could not fstat() configuration file '%s': %s!",
			cg->ME, cg->configFile, strerror(e));
		return false;
	}
	// + 1 for trailing NULL
	if ((buf = (char *) realloc(buf, statbuf.st_size + 1)) == NULL)
	{
		int e = errno;
		Log(0, "*** %s: ERROR: Could not malloc() configuration file '%s': %s!",
			cg->ME, cg->configFile, strerror(e));
		return false;
	}
	if (read(fd, buf, statbuf.st_size) != statbuf.st_size)
	{
		int e = errno;
		Log(0, "*** %s: ERROR: Could not read() configuration file '%s': %s!",
			cg->ME, cg->configFile, strerror(e));
		return false;
	}
	buf[statbuf.st_size] = '\0';
	(void) close(fd);

	int const numSettings = 500 * 2;	// some settings take an argument
	char *argv[numSettings];

	int lineNum = 0;		// number of arguments found
	int argc = 0;

	argv[argc++] = (char *) "getConfigFileArguments()";
	char *line;
	while ((line = getLine(buf)) != NULL)
	{
		lineNum++;
		if (*line == '#' || *line == '\0')
		{
			continue;		// comment or blank line
		}

		if (*line == '=')		// still at start of line
		{
			Log(-1, "*** %s: WARNING: Line %d in configuration file '%s' has nothing before '='!\n",
				cg->ME, lineNum, cg->configFile);
			continue;
		}

		// Find a "setting=value" pair or just "setting"
		char *equal = line;			// beginning of an argument
		while (*equal != '=' && *equal != '\0')
		{
			equal++;
		}
		// "equal" is pointing at equal sign or end of argumment
// TODO: if line doesn't start with "-", add it
		argv[argc++] = line;
		if (*equal == '=')
		{
			*equal = '\0';
			argv[argc++] = equal+1;
		}
	}

	if (argc == 1)
	{
		Log(-1, "*** %s: WARNING: configuration file '%s' has no valid entries!\n",
			cg->ME, cg->configFile);
	}

	// Let's hope the config file doesn't call itself!
	called_from_getConfigFileArguments = true;
	bool ret = getCommandLineArguments(cg, argc, argv);
	called_from_getConfigFileArguments = false;
	return(ret);
}


// Get arguments from the command line.
bool getCommandLineArguments(config *cg, int argc, char *argv[])
{
	const char *b;
	if (called_from_getConfigFileArguments)
		b = "    ";
	else
		b = "";

	if (argc <= 1)
		return(true);

	for (int i=1; i <= argc - 1; i++)
	{
		// Allow UPPER and lower case on the command line.
		// Note that all strings in strcmp() must be lowercase.
		char *a = argv[i];
		for (int j=0; a[j] != '\0'; j++) {
			a[j] = (char) tolower(a[j]);
		}
		if (*a == '-') a++;		// skip leading "-"

		Log(4, "%s >>> Parameter [%-*s]  Value: [%s]\n", b, n, a, argv[i+1]);

		// Misc. settings
		if (strcmp(a, "config") == 0)
		{
			// Read the file as soon as we see it on the command line so
			// any command-line arguments after it will overwrite the config file.
			// A file name of "[none]" means to ignore the option.
			cg->configFile = argv[++i];
			if (strcmp(cg->configFile, "[none]") != 0 && ! getConfigFileArguments(cg))
			{
				return(false);
			}
		}
		else if (strcmp(a, "-help") == 0)
		{
			cg->help = true;
			cg->quietExit = true;	// we display the help message and quit
		}
		else if (strcmp(a, "version") == 0)
		{
			cg->version = argv[++i];
		}
		else if (strcmp(a, "cameranumber") == 0)
		{
			cg->cameraNumber = atoi(argv[++i]);
		}
		else if (strcmp(a, "save_dir") == 0)
		{
			cg->saveDir = argv[++i];
		}
		else if (strcmp(a, "cc_file") == 0)
		{
			cg->CC_saveFile = argv[++i];
			// Since the user specified the CC_saveFile that means they want to save
			// the camera capabilities and quit.
			cg->saveCC = true;
			cg->quietExit = true;	// we display info and quit
		}
		else if (strcmp(a, "cmd") == 0)
		{
			cg->cmdToUse = argv[++i];
			cg->isLibcamera = strcmp(cg->cmdToUse, "libcamera-still") == 0 ? true : false;
		}
		else if (strcmp(a, "tty") == 0)	// overrides what was automatically determined
		{
			cg->tty = getBoolean(argv[++i]);
		}
		else if (strcmp(a, "preview") == 0)
		{
			cg->preview = getBoolean(argv[++i]);
		}

		// daytime settings
		else if (strcmp(a, "takedaytimeimages") == 0)
		{
			cg->daytimeCapture = getBoolean(argv[++i]);
		}
		else if (strcmp(a, "savedaytimeimages") == 0)
		{
			cg->daytimeSave = getBoolean(argv[++i]);
		}
		else if (strcmp(a, "dayautoexposure") == 0)
		{
			cg->dayAutoExposure = getBoolean(argv[++i]);
		}
		else if (strcmp(a, "daymaxautoexposure") == 0)
		{
			cg->temp_dayMaxAutoExposure_ms = atof(argv[++i]);	// allow fractions
		}
		else if (strcmp(a, "dayexposure") == 0)
		{
			cg->temp_dayExposure_ms = atof(argv[++i]);	// allow fractions
		}
		else if (strcmp(a, "daymean") == 0)
		{
			cg->myModeMeanSetting.dayMean = atof(argv[++i]);
		}
		else if (strcmp(a, "daymeanthreshold") == 0)
		{
			cg->myModeMeanSetting.dayMean_threshold = atof(argv[++i]);
		}
		else if (strcmp(a, "daybrightness") == 0)
		{
			cg->dayBrightness = atol(argv[++i]);
		}
		else if (strcmp(a, "daydelay") == 0)
		{
			cg->dayDelay_ms = atol(argv[++i]);
		}
		else if (strcmp(a, "dayautogain") == 0)
		{
			cg->dayAutoGain = getBoolean(argv[++i]);
		}
		else if (strcmp(a, "daymaxautogain") == 0)
		{
			cg->dayMaxAutoGain = atof(argv[++i]);
		}
		else if (strcmp(a, "daygain") == 0)
		{
			cg->dayGain = atof(argv[++i]);
		}
		else if (strcmp(a, "daybin") == 0)
		{
			cg->dayBin = atol(argv[++i]);
		}
		else if (strcmp(a, "dayawb") == 0)
		{
			cg->dayAutoAWB = getBoolean(argv[++i]);
		}
		else if (strcmp(a, "daywbr") == 0)
		{
			cg->dayWBR = atof(argv[++i]);
		}
		else if (strcmp(a, "daywbb") == 0)
		{
			cg->dayWBB = atof(argv[++i]);
		}
		else if (strcmp(a, "dayskipframes") == 0)
		{
			cg->daySkipFrames = atol(argv[++i]);
		}
		else if (strcmp(a, "dayenablecooler") == 0)
		{
			cg->dayEnableCooler = getBoolean(argv[++i]);
		}
		else if (strcmp(a, "daytargettemp") == 0)
		{
			cg->dayTargetTemp = atol(argv[++i]);
		}
		else if (strcmp(a, "daytuningfile") == 0)
		{
			cg->dayTuningFile = argv[++i];
		}

		// nighttime settings
		else if (strcmp(a, "takenighttimeimages") == 0)
		{
			cg->nighttimeCapture = getBoolean(argv[++i]);
		}
		else if (strcmp(a, "savenighttimeimages") == 0)
		{
			cg->nighttimeSave = getBoolean(argv[++i]);
		}
		else if (strcmp(a, "nightautoexposure") == 0)
		{
			cg->nightAutoExposure = getBoolean(argv[++i]);
		}
		else if (strcmp(a, "nightmaxautoexposure") == 0)
		{
			cg->temp_nightMaxAutoExposure_ms = atof(argv[++i]);
		}
		else if (strcmp(a, "nightexposure") == 0)
		{
			cg->temp_nightExposure_ms = atof(argv[++i]);
		}
		else if (strcmp(a, "nightmean") == 0)
		{
			cg->myModeMeanSetting.nightMean = atof(argv[++i]);
		}
		else if (strcmp(a, "nightmeanthreshold") == 0)
		{
			cg->myModeMeanSetting.nightMean_threshold = atof(argv[++i]);
		}
		else if (strcmp(a, "nightbrightness") == 0)
		{
			cg->nightBrightness = atol(argv[++i]);
		}
		else if (strcmp(a, "nightdelay") == 0)
		{
			cg->nightDelay_ms = atol(argv[++i]);
		}
		else if (strcmp(a, "nightautogain") == 0)
		{
			cg->nightAutoGain = getBoolean(argv[++i]);
		}
		else if (strcmp(a, "nightmaxautogain") == 0)
		{
			cg->nightMaxAutoGain = atof(argv[++i]);
		}
		else if (strcmp(a, "nightgain") == 0)
		{
			cg->nightGain = atof(argv[++i]);
		}
		else if (strcmp(a, "nightbin") == 0)
		{
			cg->nightBin = atol(argv[++i]);
		}
		else if (strcmp(a, "nightawb") == 0)
		{
			cg->nightAutoAWB = getBoolean(argv[++i]);
		}
		else if (strcmp(a, "nightwbr") == 0)
		{
			cg->nightWBR = atof(argv[++i]);
		}
		else if (strcmp(a, "nightwbb") == 0)
		{
			cg->nightWBB = atof(argv[++i]);
		}
		else if (strcmp(a, "nightskipframes") == 0)
		{
			cg->nightSkipFrames = atol(argv[++i]);
		}
		else if (strcmp(a, "nightenablecooler") == 0)
		{
			cg->nightEnableCooler = getBoolean(argv[++i]);
		}
		else if (strcmp(a, "nighttargettemp") == 0)
		{
			cg->nightTargetTemp = atol(argv[++i]);
		}
		else if (strcmp(a, "nighttuningfile") == 0)
		{
			cg->nightTuningFile = argv[++i];
		}

		// daytime and nighttime settings
		else if (strcmp(a, "saturation") == 0)
		{
			cg->saturation = atof(argv[++i]);
		}
		else if (strcmp(a, "contrast") == 0)
		{
			cg->contrast = atof(argv[++i]);
		}
		else if (strcmp(a, "sharpness") == 0)
		{
			cg->sharpness = atof(argv[++i]);
		}
		else if (strcmp(a, "gamma") == 0)
		{
			cg->gamma = atol(argv[++i]);
		}
		else if (strcmp(a, "offset") == 0)
		{
			cg->offset = atol(argv[++i]);
		}
		else if (strcmp(a, "aggression") == 0)
		{
			cg->aggression = atol(argv[++i]);
		}
		else if (strcmp(a, "gaintransitiontime") == 0)
		{
			cg->gainTransitionTime = atol(argv[++i]);
		}
		else if (strcmp(a, "width") == 0)
		{
			cg->width = atol(argv[++i]);
		}
		else if (strcmp(a, "height") == 0)
		{
			cg->height = atol(argv[++i]);
		}
		else if (strcmp(a, "type") == 0)
		{
			cg->imageType = atol(argv[++i]);
		}
		else if (strcmp(a, "quality") == 0)
		{
			cg->userQuality = cg->quality = atol(argv[++i]);
		}
		else if (strcmp(a, "meanp0") == 0)
		{
			cg->myModeMeanSetting.mean_p0 = atof(argv[++i]);
		}
		else if (strcmp(a, "meanp1") == 0)
		{
			cg->myModeMeanSetting.mean_p1 = atof(argv[++i]);
		}
		else if (strcmp(a, "meanp2") == 0)
		{
			cg->myModeMeanSetting.mean_p2 = atof(argv[++i]);
		}
		else if (strcmp(a, "autousb") == 0)
		{
			cg->asiAutoBandwidth = getBoolean(argv[++i]);
		}
		else if (strcmp(a, "usb") == 0)
		{
			cg->asiBandwidth = atol(argv[++i]);
		}
		else if (strcmp(a, "filename") == 0)
		{
			cg->fileName = argv[++i];
		}
		else if (strcmp(a, "rotation") == 0)
		{
			cg->rotation = atol(argv[++i]);
		}
		else if (strcmp(a, "flip") == 0)
		{
			cg->flip = atol(argv[++i]);
		}
		else if (strcmp(a, "determineFocus") == 0)
		{
			cg->determineFocus = getBoolean(argv[++i]);
		}
		else if (strcmp(a, "notificationimages") == 0)
		{
			cg->notificationImages = getBoolean(argv[++i]);
		}
		else if (strcmp(a, "consistentdelays") == 0)
		{
	   		cg->consistentDelays = getBoolean(argv[++i]);
		}
		else if (strcmp(a, "latitude") == 0)
		{
			cg->latitude = argv[++i];
		}
		else if (strcmp(a, "longitude") == 0)
		{
			cg->longitude = argv[++i];
		}
		else if (strcmp(a, "angle") == 0)
		{
			cg->angle = atof(argv[++i]);
		}
		else if (strcmp(a, "takedarkframes") == 0)
		{
			cg->takeDarkFrames = getBoolean(argv[++i]);
		}
		else if (strcmp(a, "locale") == 0)
		{
			cg->locale = argv[++i];
		}
		else if (strcmp(a, "histogrambox") == 0)
		{
			cg->HB.sArgs = argv[++i];
		}
		else if (strcmp(a, "debuglevel") == 0)
		{
			cg->debugLevel = atol(argv[++i]);
		}
		else if (strcmp(a, "experimentalexposure") == 0)
		{
			cg->HB.useExperimentalExposure = getBoolean(argv[++i]);
		}
		else if (strcmp(a, "newexposure") == 0)
		{
			cg->videoOffBetweenImages = getBoolean(argv[++i]);
		}
		else if (strcmp(a, "extraargs") == 0)
		{
			cg->extraArgs = argv[++i];
		}

		// overlay settings
		else if (strcmp(a, "overlaymethod") == 0)
		{
			cg->overlay.overlayMethod = atoi(argv[++i]);
		}
		else if (strcmp(a, "showtime") == 0)
		{
			cg->overlay.showTime = getBoolean(argv[++i]);
		}
		else if (strcmp(a, "timeformat") == 0)
		{
			cg->timeFormat = argv[++i];
		}
		else if (strcmp(a, "showtemp") == 0)
		{
			cg->overlay.showTemp = getBoolean(argv[++i]);
		}
		else if (strcmp(a, "temptype") == 0)
		{
			cg->tempType = argv[++i];
		}
		else if (strcmp(a, "showexposure") == 0)
		{
			cg->overlay.showExposure = getBoolean(argv[++i]);
		}
		else if (strcmp(a, "showgain") == 0)
		{
			cg->overlay.showGain = getBoolean(argv[++i]);
		}
		else if (strcmp(a, "showbrightness") == 0)
		{
			cg->overlay.showBrightness = getBoolean(argv[++i]);
		}
		else if (strcmp(a, "showmean") == 0)
		{
			cg->overlay.showMean = getBoolean(argv[++i]);
		}
		else if (strcmp(a, "showhistogrambox") == 0)
		{
			cg->overlay.showHistogramBox = getBoolean(argv[++i]);
		}
		else if (strcmp(a, "showfocus") == 0)
		{
			cg->overlay.showFocus = getBoolean(argv[++i]);
		}
		else if (strcmp(a, "text") == 0)
		{
			cg->overlay.ImgText = argv[++i];
		}
		else if (strcmp(a, "extratext") == 0)
		{
			cg->overlay.ImgExtraText = argv[++i];
		}
		else if (strcmp(a, "extratextage") == 0)
		{
			cg->overlay.extraFileAge = atol(argv[++i]);
		}
		else if (strcmp(a, "textlineheight") == 0)
		{
			cg->overlay.iTextLineHeight = atol(argv[++i]);
		}
		else if (strcmp(a, "textx") == 0)
		{
			cg->overlay.iTextX = atol(argv[++i]);
		}
		else if (strcmp(a, "texty") == 0)
		{
			cg->overlay.iTextY = atol(argv[++i]);
		}
		else if (strcmp(a, "fontname") == 0)
		{
			cg->overlay.fontnumber = atol(argv[++i]);
		}
		else if (strcmp(a, "fontcolor") == 0)
		{
			cg->overlay.fc = argv[++i];
		}
		else if (strcmp(a, "smallfontcolor") == 0)
		{
			cg->overlay.sfc = argv[++i];
		}
		else if (strcmp(a, "fonttype") == 0)
		{
			cg->overlay.linenumber = atol(argv[++i]);
		}
		else if (strcmp(a, "fontsize") == 0)
		{
			cg->overlay.fontsize = atof(argv[++i]);
		}
		else if (strcmp(a, "fontline") == 0)
		{
			cg->overlay.linewidth = atol(argv[++i]);
		}
		else if (strcmp(a, "outlinefont") == 0)
		{
			cg->overlay.outlinefont = getBoolean(argv[++i]);
		}

		else
			Log(-1, "*** %s: WARNING: Unknown argument: [%s].  Ignored.\n", cg->ME, a);
	}


	// Assume if cg->saveDir is NULL that we're not taking pictures and instead are
	// producing Camera Capabilities info, in which case we need cg->CC_saveFile set so
	// we know where to put the info.
	// If we are in "help" mode then we won't take picture AND won't produce CC info.
	if (cg->saveDir == NULL && cg->CC_saveFile == NULL && ! cg->help) {
		cg->saveDir = cg->allskyHome;
		Log(-1, "*** %s: WARNING: No directory to save images was specified. Using: [%s]\n",
			cg->ME, cg->saveDir);
	}

	return(true);
}

// validate and convert Latitude and Longitude to N, S, E, W versions.
static char strLatitude[20], strLongitude[20];

static char const *validateLatLong(
		char const *l,
		char positive,
		char negative,
		char *savedLocation,
		int maxSize,
		char const *name)
{
	if (l == NULL || *l == '\0') {
		Log(0, "*** %s: ERROR: %s not specified!\n", CG.ME, name);
		return(NULL);
	}

	Log(4, "validateLatLong(l=%s, positive=%c, negative=%c, name=%s)\n", l, positive, negative, name);

	if (index(l, ' ') != NULL) {
		Log(0, "*** %s: ERROR: %s cannot have any spaces.  You entered [%s].\n", CG.ME, name, l);
		return(NULL);
	}

	// Valid formats:
	//	12.34
	//	[+-]12.34
	//	12.34[NS]		# Latitude only
	//	12.34[EW]		# Longitude only

	int len = strlen(l);
	unsigned char direction = toupper(l[len-1]);		// Last character
	if (isalpha(direction)) {
		// Make sure it's a valid direction.
		unsigned char upper = toupper(direction);
		if (upper == 'N' || upper == 'S') {
			if (strcmp(name, "Longitude") == 0) {
				Log(0, "*** %s: ERROR: %s uses 'E' or 'W'.  You entered [%s].\n",
					CG.ME, name, l);
				return(NULL);
			}
		} else if (upper == 'E' || upper == 'W') {
			if (strcmp(name, "Latitude") == 0) {
				Log(0, "*** %s: ERROR: %s uses 'N' or 'S'.  You entered [%s].\n",
					CG.ME, name, l);
				return(NULL);
			}
		} else {
			Log(0, "*** %s: ERROR: Unknown direction; must be 'N', 'S', 'E', or 'W'.  You entered [%s].\n",
				CG.ME, l);
			return(NULL);
		}

		if (upper == positive || upper == negative) {
			if (l[0] == '+' || l[0] == '-') {
				Log(0, "*** %s: ERROR: %s cannot have BOTH + or - AND %c or %c.  You entered [%s].\n",
					CG.ME, name, positive, negative, l);
				return(NULL);
			}

			//	12.34[NSEW]
			return(l);
		}
	}

	//	12.34
	// or
	//	[+-]12.34
	// Convert to a string that ends with N, S, E, or W which is what sunwait needs.

	// The number may have a period or comma as the decimal point,
	// which may or may not match the user's locale, e.g.,
	//   12.34
	// with locale = DE.  atof() uses the locale so will convert that to 12
	// Get around that by not converting to a number.
	char p_or_n;
	if (l[0] == '-') {
		p_or_n = negative;
		l++;		// skip sign
	} else if (l[0] == '+') {
		p_or_n = positive;
		l++;		// skip sign
	} else {
		p_or_n = positive;
	}
	snprintf(savedLocation, maxSize-1, "%s%c", l, p_or_n);
	Log(4, "   new value = %s\n", savedLocation);
	return(savedLocation);
}

bool validateLatitudeLongitude(config *cg)
{
	bool ret = true;
	cg->latitude = validateLatLong(cg->latitude, 'N', 'S', strLatitude, sizeof(strLatitude), "Latitude");
	if (cg->latitude == NULL)
		ret = false;
	cg->longitude = validateLatLong(cg->longitude, 'E', 'W', strLongitude, sizeof(strLongitude), "Longitude");
	if (cg->longitude == NULL)
		ret = false;

	return(ret);
}

// Set the locale
void doLocale(config *cg)
{
	if (cg->locale == NULL) {
		cg->locale = setlocale(LC_NUMERIC, NULL);
		if (cg->locale == NULL) {
			Log(-1, "*** %s: WARNING: Could not get locale from Pi!\n", cg->ME);
		} else {
			static char locale[100];
			strncpy(locale, cg->locale, sizeof(locale)-1);
			cg->locale = locale;
		}
	} else if (setlocale(LC_NUMERIC, cg->locale) == NULL && ! cg->saveCC) {
		Log(-1, "*** %s: WARNING: Could not set locale to %s.\n", cg->ME, cg->locale);
	}
}
