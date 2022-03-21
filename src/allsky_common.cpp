// Functions used by the "capture" and other programs.

#include <opencv2/core/core.hpp>
#include <opencv2/imgproc/imgproc.hpp>
#include <opencv2/highgui/highgui.hpp>
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

#include "include/allsky_common.h"

using namespace std;


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

	// Resize for screen width so the same numbers on small and big screens produce
	// roughly the same size font on the image.
	fontsize = fontsize * width / 1200;
	linewidth = std::max(linewidth * width / 700, 1);
	int outline_size = linewidth * 1.5;

	// int baseline = 0;
	// cv::Size textSize = cv::getTextSize(text, fontname, fontsize, linewidth, &baseline);

	if (imgtype == IMG_RAW16)
	{
		unsigned long fontcolor16 = createRGB(fontcolor[2], fontcolor[1], fontcolor[0]);
		if (useOutline)
			cv::putText(img, text, xy, fontname, fontsize, cv::Scalar(0,0,0), outline_size, linetype);
		cv::putText(img, text, xy, fontname, fontsize, fontcolor16, linewidth, linetype);
	}
	else
	{
		cv::Scalar font_color = cv::Scalar(fontcolor[0], fontcolor[1], fontcolor[2]);
		if (useOutline)
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

double time_diff_us(int64 start, int64 end)
{
	double frequency = cv::getTickFrequency();
	return (double)(end - start) / frequency;	// in Microseconds
}

long timeval_diff_us(timeval start, timeval end)
{
	time_t diff_s = end.tv_sec - start.tv_sec;
	if (diff_s == 0)
	{
		// If in the same second, the difference is the usec's
		return(end.tv_usec - start.tv_usec);
	}

	suseconds_t start_us = start.tv_usec;
	suseconds_t end_us = (diff_s * US_IN_SEC) + end.tv_usec;
// xxx printf("===== diff_s=%'ld, start.tv_usec=%'ld, end.tv_usec=%'ld\n", diff_s, start.tv_usec, end.tv_usec);
	return (end_us - start_us);
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

void add_variables_to_command(char *cmd, long exposure_us, int brightness, float mean,
	bool autoExposure, bool autoGain, bool autoAWB, float WBR, float WBB,
	int temperature, float gainDB, int gain,
	int bin, int flip, int bitDepth, int focusMetric)
{
	// If the double variables are an integer value, pass an integer value.
	// Pass boolean values as 0 or 1.
	// If any value < 0 don't use it.

	char tmp[50];

	if (exposure_us >= 0) {
		snprintf(tmp, sizeof(tmp), " EXPOSURE_US=%ld", exposure_us);
		strcat(cmd, tmp);
	}

	if (brightness >= 0) {
		snprintf(tmp, sizeof(tmp), " BRIGHTNESS=%d", brightness);
		strcat(cmd, tmp);
	}

	if (mean >= 0.0) {
		if (mean == (int)mean)
			snprintf(tmp, sizeof(tmp), " MEAN=%d", (int)mean);
		else
			snprintf(tmp, sizeof(tmp), " MEAN=%f", mean);
		strcat(cmd, tmp);
	}

	snprintf(tmp, sizeof(tmp), " AUTOEXPOSURE=%d", autoExposure ? 1 : 0);
	strcat(cmd, tmp);

	snprintf(tmp, sizeof(tmp), " AUTOGAIN=%d", autoGain ? 1 : 0);
	strcat(cmd, tmp);

	snprintf(tmp, sizeof(tmp), " AUTOWB=%d", autoAWB ? 1 : 0);
	strcat(cmd, tmp);

	if (WBR >= 0.0) {
		if (WBR == (int)WBR)
			snprintf(tmp, sizeof(tmp), " WBR=%d", (int)WBR);
		else
			snprintf(tmp, sizeof(tmp), " WBR=%f", WBR);
		strcat(cmd, tmp);
	}

	if (WBB >= 0.0) {
		if (WBB == (int)WBB)
			snprintf(tmp, sizeof(tmp), " WBB=%d", (int)WBB);
		else
			snprintf(tmp, sizeof(tmp), " WBB=%f", WBB);
		strcat(cmd, tmp);
	}

	// Since negative temperatures are valid, check against an impossible temperature.
	// The temperature passed to us is 10 times the actual temperature so we can deal with
	// integers with 1 decimal place, which is all we care about.
	if (temperature != -999) {
		snprintf(tmp, sizeof(tmp), " TEMPERATURE=%d", (int)round(temperature/10));
		strcat(cmd, tmp);
	}

	if (gain >= 0) {
		snprintf(tmp, sizeof(tmp), " GAIN=%d", gain);
		strcat(cmd, tmp);
	}

	if (gainDB >= 0.0) {
		snprintf(tmp, sizeof(tmp), " GAINDB=%1.2f", gainDB);
		strcat(cmd, tmp);
	}

	if (bin >= 0) {
		snprintf(tmp, sizeof(tmp), " BIN=%d", bin);
		strcat(cmd, tmp);
	}

	if (flip >= 0) {
		snprintf(tmp, sizeof(tmp), " FLIP=%d", flip);
		strcat(cmd, tmp);
	}

	if (bitDepth >= 0) {
		snprintf(tmp, sizeof(tmp), " BIT_DEPTH=%d", bitDepth);
		strcat(cmd, tmp);
	}

	if (focusMetric >= 0) {
		snprintf(tmp, sizeof(tmp), " FOCUS=%d", focusMetric);
		strcat(cmd, tmp);
	}
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
		double abs_us_in_ms = abs(us_in_ms);
		// The boundaries on when to display one or two units are really a matter of taste.
		if (abs_us_in_ms < 0.5)						// less than 0.5 ms
		{
			snprintf(length, l, "%'ld us", us);
		}
		else if (abs_us_in_ms < 1.5)				// between 0.5 and 1.5 ms
		{
			if (multi)
				snprintf(length, l, "%'ld us (%.3f ms)", us, us_in_ms);
			else
				snprintf(length, l, "%'ld us", us);
		}
		else if (abs_us_in_ms < (0.5 * MS_IN_SEC))	// 1.5 ms to 0.5 sec
		{
			if (multi)
				snprintf(length, l, "%.2f ms (%.2lf sec)", us_in_ms, (double)us / US_IN_SEC);
			else
				snprintf(length, l, "%.2f ms", us_in_ms);
		}
		else if (abs_us_in_ms < (1.0 * MS_IN_SEC))	// between 0.5 sec and 1 sec
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

// Calculate if it is day or night
std::string calculateDayOrNight(const char *latitude, const char *longitude, const char *angle)
{
	char sunwaitCommand[128];
	std::string d;

	sprintf(sunwaitCommand, "sunwait poll angle %s %s %s", angle, latitude, longitude);
	d = exec(sunwaitCommand);

	d.erase(std::remove(d.begin(), d.end(), '\n'), d.end());

	if (d != "DAY" && d != "NIGHT")
	{
		Log(0, "*** ERROR: it's not DAY or NIGHT, it's '%s'\n", d.c_str());
		closeUp(EXIT_ERROR_STOP);
	}
	return(d);
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
		Log(0, "*** WARNING: argument '%s' is not a boolean; setting to 'false'\n", arg);
	}
	return(false);
}

// Check for a valid file extension and return it, or NULL on error.
const char *checkForValidExtension(const char *fileName, int imageType)
{
	const char *ext = strrchr(fileName, '.');
	if (ext == NULL)
	{
		Log(0, "*** ERROR: No extension given on filename: [%s]\n", fileName);
		return(NULL);
	}

	ext++;
	if (strcasecmp(ext, "jpg") == 0 || strcasecmp(ext, "jpeg") == 0)
	{
		if (imageType == IMG_RAW16)
		{
			Log(0, "*** ERROR: RAW16 images only work with .png files; either change the Image Type or the Filename.\n");
			return(NULL);
		}

		return("jpg");
	}
	else if (strcasecmp(ext, "png") == 0)
	{
		return("png");
	}
	else
	{
		Log(0, "*** ERROR: Unsupported image extension (%s); only .jpg and .png are supported.\n", ext);
		return(NULL);
	}
}

int doOverlay(cv::Mat image,
	bool showTime, char *startTime,
	bool showExposure, long exposure_us, bool autoExposure,
	bool showTemp, int temp, const char *tempType,
	bool showGain, float gain, bool autoGain, int gainChange,
	bool showMean, float mean,
	bool showBrightness, int brightness,
	bool showFocus, int focusMetric,
	const char *ImgText, const char *ImgExtraText, int extraFileAge,
	int x, int y, int bin, int width, int textLineHeight,
	int fontSize, int lineWidth, int lineType, int font,
	int fontColor[], int smallFontColor[], bool useOutline, int imageType)
{
	int iYOffset	= 0;
	char tmp[128]	= { 0 };

	if (showTime)
	{
		// The time and ImgText are in the larger font; everything else is in smaller font.
		cvText(image, startTime, x, y + (iYOffset / bin),
			fontSize * 0.1, lineWidth,
			lineType, font, fontColor, imageType, useOutline, width);
		iYOffset += textLineHeight;
	}

	if (ImgText[0] != '\0')
	{
		cvText(image, ImgText, x, y + (iYOffset / bin),
			fontSize * 0.1, lineWidth,
			lineType, font, fontColor, imageType, useOutline, width);
		iYOffset+=textLineHeight;
	}

	if (showTemp)
	{
		char C[20] = { 0 }, F[20] = { 0 };
		if (strcmp(tempType, "C") == 0 || strcmp(tempType, "B") == 0)
		{
			sprintf(C, "  %.0fC", (float)temp / 10);
		}
		if (strcmp(tempType, "F") == 0 || strcmp(tempType, "B") == 0)
		{
			sprintf(F, "  %.0fF", (((float)temp / 10 * 1.8) + 32));
		}
		sprintf(tmp, "Sensor: %s %s", C, F);
		cvText(image, tmp, x, y + (iYOffset / bin),
			fontSize * SMALLFONTSIZE_MULTIPLIER, lineWidth,
			lineType, font, smallFontColor, imageType, useOutline, width);
		iYOffset += textLineHeight;
	}

	if (showExposure)
	{
		sprintf(tmp, "Exposure: %s", length_in_units(exposure_us, false));
		// Indicate if in auto-exposure mode.
		if (autoExposure) strcat(tmp, " (auto)");
		cvText(image, tmp, x, y + (iYOffset / bin),
			fontSize * SMALLFONTSIZE_MULTIPLIER, lineWidth,
			lineType, font, smallFontColor, imageType, useOutline, width);
		iYOffset += textLineHeight;
	}

	if (showGain)
	{
		if (gain == (int)gain)
			snprintf(tmp, sizeof(tmp), "Gain: %d", (int)gain);
		else
			snprintf(tmp, sizeof(tmp), "Gain: %1.2f", gain);

		// Indicate if in auto gain mode.
		if (autoGain) strcat(tmp, " (auto)");
		// Indicate if in gain transition mode.
		if (gainChange != 0)
		{
			char x[20];
			sprintf(x, " (adj: %+d)", gainChange);
			strcat(tmp, x);
		}
		cvText(image, tmp, x, y + (iYOffset / bin),
			fontSize * SMALLFONTSIZE_MULTIPLIER, lineWidth,
			lineType, font, smallFontColor, imageType, useOutline, width);
		iYOffset += textLineHeight;
	}

	if (showBrightness)
	{
		sprintf(tmp, "Brightness: %d", brightness);
		cvText(image, tmp, x, y + (iYOffset / bin),
			fontSize * SMALLFONTSIZE_MULTIPLIER, lineWidth,
			lineType, font, smallFontColor, imageType, useOutline, width);
		iYOffset += textLineHeight;
	}

	if (showMean)
	{
		if (mean == (int)mean)
			snprintf(tmp, sizeof(tmp), "Mean: %d", (int)mean);
		else
			snprintf(tmp, sizeof(tmp), "Mean: %.3f", mean);
		cvText(image, tmp, x, y + (iYOffset / bin),
			fontSize * SMALLFONTSIZE_MULTIPLIER, lineWidth,
			lineType, font, smallFontColor, imageType, useOutline, width);
		iYOffset += textLineHeight;
	}

	if (showFocus)
	{
		sprintf(tmp, "Focus: %d", focusMetric);
		cvText(image, tmp, x, y + (iYOffset / bin),
			fontSize * SMALLFONTSIZE_MULTIPLIER, lineWidth,
			lineType, font, smallFontColor, imageType, useOutline, width);
		iYOffset += textLineHeight;
	}

	/**
	 * Optionally display extra text which is read from the provided file. If the
	 * age of the file exceeds the specified limit then ignore the file.
	 * This prevents situations where the program updating the file stops working.
	**/
	if (ImgExtraText[0] != '\0') {
		// Display these messages every time, since it's possible the user will
		// correct the issue while we're running.
		if (access(ImgExtraText, F_OK ) == -1 ) {
			Log(1, "  > *** WARNING: Extra Text File Does Not Exist So Ignoring It\n");
		} else if (access(ImgExtraText, R_OK ) == -1 ) {
			Log(1, "  > *** WARNING: Cannot Read From Extra Text File So Ignoring It\n");
		} else {
			FILE *fp = fopen(ImgExtraText, "r");

			if (fp != NULL) {
				bool bAddExtra = false;
				if (extraFileAge > 0) {
					struct stat buffer;
					if (stat(ImgExtraText, &buffer) == 0) {
						struct tm modifiedTime = *localtime(&buffer.st_mtime);
						time_t now = time(NULL);
						double ageInSeconds = difftime(now, mktime(&modifiedTime));
						Log(4, "  > Extra Text File (%s) Modified %.1f seconds ago", ImgExtraText, ageInSeconds);
						if (ageInSeconds < extraFileAge) {
							Log(1, ", so Using It\n");
							bAddExtra = true;
						} else {
							Log(1, ", so Ignoring\n");
						}
					} else {
						Log(0, "  > *** ERROR: Stat Of Extra Text File Failed !\n");
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

						cvText(image, line, x, y + (iYOffset / bin),
							fontSize * SMALLFONTSIZE_MULTIPLIER, lineWidth,
							lineType, font,
							smallFontColor, imageType, useOutline, width);
						iYOffset += textLineHeight;
					}
				}
				fclose(fp);
			} else {
				Log(0, "  > *** WARNING: Failed To Open Extra Text File\n");
			}
		}
	}

	return(iYOffset);
}
