#ifdef OPENCV_C_HEADERS
#include <opencv2/core/types_c.h>
#include <opencv2/highgui/highgui_c.h>
#include <opencv2/imgproc/imgproc_c.h>
#include <opencv2/imgcodecs/legacy/constants_c.h>
#endif

#include <opencv2/core.hpp>
#include <opencv2/imgproc.hpp>
#include <opencv2/highgui.hpp>
#include <opencv2/viz.hpp>
#include "include/ASICamera2.h"
#include <sys/time.h>
#include <sys/stat.h>
#include <time.h>
#include <unistd.h>
#include <string.h>
#include <sys/types.h>
#include <errno.h>
#include <string>
#include <iostream>
#include <cstdio>
#include <tr1/memory>
#include <ctime>
#include <stdlib.h>
#include <signal.h>
#include <fstream>
#include <locale.h>

#define KNRM "\x1B[0m"
#define KRED "\x1B[31m"
#define KGRN "\x1B[32m"
#define KYEL "\x1B[33m"
#define KBLU "\x1B[34m"
#define KMAG "\x1B[35m"
#define KCYN "\x1B[36m"
#define KWHT "\x1B[37m"

#define USE_HISTOGRAM                     // use the histogram code as a workaround to ZWO's bug

#define US_IN_MS 1000                     // microseconds in a millisecond
#define MS_IN_SEC 1000                    // milliseconds in a second
#define US_IN_SEC (US_IN_MS * MS_IN_SEC)  // microseconds in a second

//-------------------------------------------------------------------------------------------------------
//-------------------------------------------------------------------------------------------------------

cv::Mat pRgb;
std::vector<int> compression_parameters;
bool use_new_exposure_algorithm = true;
bool bMain = true, bDisplay = false;
std::string dayOrNight;

bool bSaveRun = false, bSavingImg = false;
pthread_mutex_t mtx_SaveImg;
pthread_cond_t cond_SatrtSave;

// These are global so they can be used by other routines.
#define NOT_SET -1	// signifies something isn't set yet
ASI_CONTROL_CAPS ControlCaps;
void *retval;
int gotSignal            = 0;		// did we get a SIGINT (from keyboard) or SIGTERM (from service)?
int iNumOfCtrl           = 0;
int CamNum               = 0;
pthread_t thread_display = 0;
pthread_t hthdSave       = 0;
int numExposures         = 0;	// how many valid pictures have we taken so far?
int currentGain          = NOT_SET;

// Some command-line and other option definitions needed outside of main():
int tty = 0;	// 1 if we're on a tty (i.e., called from the shell prompt).
#define DEFAULT_NOTIFICATIONIMAGES 1
int notificationImages     = DEFAULT_NOTIFICATIONIMAGES;
#define DEFAULT_FILENAME     "image.jpg"
char const *fileName       = DEFAULT_FILENAME;
#define DEFAULT_TIMEFORMAT   "%Y%m%d %H:%M:%S"	// format the time should be displayed in
char const *timeFormat     = DEFAULT_TIMEFORMAT;
#define DEFAULT_ASIDAYEXPOSURE   500	// microseconds - good starting point for daytime exposures
int asiDayExposure         = DEFAULT_ASIDAYEXPOSURE;
#define DEFAULT_DAYAUTOEXPOSURE  1
int asiDayAutoExposure     = DEFAULT_DAYAUTOEXPOSURE;	// is it on or off for daylight?
#define DEFAULT_DAYDELAY     (5 * MS_IN_SEC)	// 5 seconds
int dayDelay               = DEFAULT_DAYDELAY;	// Delay in milliseconds.
#define DEFAULT_NIGHTDELAY   (10 * MS_IN_SEC)	// 10 seconds
int nightDelay             = DEFAULT_NIGHTDELAY;	// Delay in milliseconds.
#define DEFAULT_ASINIGHTMAXEXPOSURE  (10 * US_IN_MS)	// 10 ms
int asiNightMaxExposure    = DEFAULT_ASINIGHTMAXEXPOSURE;
#define DEFAULT_GAIN_TRANSITION_TIME 5		// user specifies minutes
int gainTransitionTime     = DEFAULT_GAIN_TRANSITION_TIME;
ASI_BOOL currentAutoExposure = ASI_FALSE;	// is Auto Exposure currently on or off?

#ifdef USE_HISTOGRAM
long cameraMaxAutoExposureUS  = NOT_SET;	// camera's max auto exposure in us
#define DEFAULT_BOX_SIZEX       500
#define DEFAULT_BOX_SIZEY       500
int histogramBoxSizeX         = DEFAULT_BOX_SIZEX;     // 500 px x 500 px box.  Must be a multiple of 2.
int histogramBoxSizeY         = DEFAULT_BOX_SIZEY;
#define DEFAULT_BOX_FROM_LEFT   0.5
#define DEFAULT_BOX_FROM_TOP    0.5
// % from left/top side that the center of the box is.  0.5 == the center of the image's X/Y axis
float histogramBoxPercentFromLeft = DEFAULT_BOX_FROM_LEFT;
float histogramBoxPercentFromTop = DEFAULT_BOX_FROM_TOP;
#endif	// USE_HISTOGRAM

char debugText[500];		// buffer to hold debug messages displayed by displayDebugText()
int debugLevel = 0;
/**
 * Helper function to display debug info
**/
void displayDebugText(const char * text, int requiredLevel) {
    if (debugLevel >= requiredLevel) {
        printf("%s", text);
    }
}

// Make sure we don't try to update a non-updateable control, and check for errors.
ASI_ERROR_CODE setControl(int CamNum, ASI_CONTROL_TYPE control, long value, ASI_BOOL makeAuto)
{
    ASI_ERROR_CODE ret = ASI_SUCCESS;
    int i;
    for (i = 0; i < iNumOfCtrl && i <= control; i++)    // controls are sorted 1 to n
    {
        ret = ASIGetControlCaps(CamNum, i, &ControlCaps);

#ifdef USE_HISTOGRAM
        // Keep track of the camera's max auto exposure so we don't try to exceed it.
        if (ControlCaps.ControlType == ASI_AUTO_MAX_EXP && cameraMaxAutoExposureUS == NOT_SET)
        {
            // MaxValue is in MS so convert to microseconds
            cameraMaxAutoExposureUS = ControlCaps.MaxValue * US_IN_MS;
        }
#endif

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
            } else {
                printf("ERROR: ControlCap: '%s' (#%d) not writable; not setting to %ld.\n", ControlCaps.Name, ControlCaps.ControlType, value);
                ret = ASI_ERROR_INVALID_MODE;	// this seemed like the closest error
            }
            return ret;
        }
    }
    sprintf(debugText, "NOTICE: Camera does not support ControlCap # %d; not setting to %ld.\n", control, value);
    displayDebugText(debugText, 3);
    return ASI_ERROR_INVALID_CONTROL_TYPE;
}

//-------------------------------------------------------------------------------------------------------
//-------------------------------------------------------------------------------------------------------

// Create Hex value from RGB
unsigned long createRGB(int r, int g, int b)
{
    return ((r & 0xff) << 16) + ((g & 0xff) << 8) + (b & 0xff);
}

void cvText(cv::Mat &img, const char *text, int x, int y, double fontsize, int linewidth, int linetype, int fontname,
            int fontcolor[], int imgtype, int outlinefont)
{
    if (imgtype == ASI_IMG_RAW16)
    {
        unsigned long fontcolor16 = createRGB(fontcolor[2], fontcolor[1], fontcolor[0]);
        if (outlinefont)
            cv::putText(img, text, cv::Point(x, y), fontname, fontsize, cv::Scalar(0,0,0), linewidth+4, linetype);
        cv::putText(img, text, cv::Point(x, y), fontname, fontsize, fontcolor16, linewidth, linetype);
    }
    else
    {
        if (outlinefont)
            cv::putText(img, text, cv::Point(x, y), fontname, fontsize, cv::Scalar(0,0,0, 255), linewidth+4, linetype);
        cv::putText(img, text, cv::Point(x, y), fontname, fontsize,
                    cv::Scalar(fontcolor[0], fontcolor[1], fontcolor[2], 255), linewidth, linetype);
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

double timeDiff(int64 start, int64 end)
{
	double frequency = cv::getTickFrequency();
	return (double)(end - start) / frequency;	// in Microseconds
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

void *Display(void *params)
{
    cv::Mat *para = (cv::Mat *)params;
    int w=para->cols;
    int h=para->rows;
    
    cv::Mat pImg(h,w,(int)para->type(),(uchar *)para->data);
    cv::namedWindow("video", 1);
    while (bDisplay)
    {
        // With this in, a compile error occurs:
	// no known conversion for argument 2 from ‘cv::Mat*’ to ‘cv::InputArray’
        cv::imshow("video", pImg);
        cv::waitKey(100);
    }
    cv::destroyWindow("video");
    printf("Display thread over\n");
    return (void *)0;
}

void *SaveImgThd(void *para)
{
    while (bSaveRun)
    {
        pthread_mutex_lock(&mtx_SaveImg);
        pthread_cond_wait(&cond_SatrtSave, &mtx_SaveImg);

        if (gotSignal)
        {
            // we got a signal to exit, so don't save the (probably incomplete) image
            pthread_mutex_unlock(&mtx_SaveImg);
            break;
        }

        bSavingImg = true;
        if (pRgb.data)
        {
            imwrite(fileName, pRgb, compression_parameters);
            if (dayOrNight == "NIGHT")
            {
                system("scripts/saveImageNight.sh &");
            }
            else
            {
                system("scripts/saveImageDay.sh &");
            }
        } else {
            // This can happen if the program is closed before the first picture.
            displayDebugText("----- SaveImgThd(): pRgb.data is null\n", 2);
        }
        bSavingImg = false;
        pthread_mutex_unlock(&mtx_SaveImg);
    }

    return (void *)0;
}

char retCodeBuffer[100];
// Display ASI errors in human-readable format
char *getRetCode(ASI_ERROR_CODE code)
{
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
    else if (code == ASI_ERROR_TIMEOUT) ret = "ASI_ERROR_TIMEOUT";
    else if (code == ASI_ERROR_INVALID_SEQUENCE) ret = "ASI_ERROR_INVALID_SEQUENCE";
    else if (code == ASI_ERROR_BUFFER_TOO_SMALL) ret = "ASI_ERROR_BUFFER_TOO_SMALL";
    else if (code == ASI_ERROR_VIDEO_MODE_ACTIVE) ret = "ASI_ERROR_VIDEO_MODE_ACTIVE";
    else if (code == ASI_ERROR_EXPOSURE_IN_PROGRESS) ret = "ASI_ERROR_EXPOSURE_IN_PROGRESS";
    else if (code == ASI_ERROR_GENERAL_ERROR) ret = "ASI_ERROR_GENERAL_ERROR";
    else if (code == ASI_ERROR_END) ret = "ASI_ERROR_END";
    else if (code == -1) ret = "Non-ASI ERROR";
    else ret = "UNKNOWN ASI ERROR";

    sprintf(retCodeBuffer, "%d (%s)", (int) code, ret.c_str());
    return(retCodeBuffer);
}

int roundTo(int n, int roundTo)
{
    int a = (n / roundTo) * roundTo;	// Smaller multiple
    int b = a + roundTo;		// Larger multiple
    return (n - a > b - n)? b : a;	// Return of closest of two
}

int bytesPerPixel(ASI_IMG_TYPE imageType) {
    switch (imageType) {
        case ASI_IMG_RGB24:
            return 3;
            break;
        case ASI_IMG_RAW16:
            return 2;
            break;
        case ASI_IMG_RAW8:
        case ASI_IMG_Y8:
        default:
            return 1;
    }
}

#ifdef USE_HISTOGRAM
// As of July 2021, ZWO's SDK (version 1.9) has a bug where autoexposure daylight shots'
// exposures jump all over the place.  One is way too dark and the next way too light, etc.
// As a workaround, our histogram code replaces ZWO's code auto-exposure mechanism.
// We look at the mean brightness of an X by X rectangle in image, and adjust exposure based on that.

void computeHistogram(unsigned char *imageBuffer, int width, int height, ASI_IMG_TYPE imageType, int *histogram)
{
    int h, i;
    unsigned char *b = imageBuffer;

    // Clear the histogram array.
    for (h = 0; h < 256; h++) {
        histogram[h] = 0;
    }

    // Different image types have a different number of bytes per pixel.
    int bpp = bytesPerPixel(imageType);
    width *= bpp;
    int roiX1 = (width * histogramBoxPercentFromLeft) - (histogramBoxSizeX * bpp / 2);
    int roiX2 = roiX1 + (bpp * histogramBoxSizeX);
    int roiY1 = (height * histogramBoxPercentFromTop) - (histogramBoxSizeY / 2);
    int roiY2 = roiY1 + histogramBoxSizeY;

    // Start off and end on a logical pixel boundries.
    roiX1 = (roiX1 / bpp) * bpp;
    roiX2 = (roiX2 / bpp) * bpp;

    // For RGB24, data for each pixel is stored in 3 consecutive bytes: blue, green, red.
    // For all image types, each row in the image contains one row of pixels.
    // bpp doesn't apply to rows, just columns.
    switch (imageType) {
    case ASI_IMG_RGB24:
    case ASI_IMG_RAW8:
    case ASI_IMG_Y8:
        for (int y = roiY1; y < roiY2; y++) {
            for (int x = roiX1; x < roiX2; x+=bpp) {
                i = (width * y) + x;
                int total = 0;
                for (int z = 0; z < bpp; z++)
                {
                    // For RGB24 this averages the blue, green, and red pixels.
                    total += b[i+z];
                }
                int avg = total / bpp;
                histogram[avg]++;
            }
        }
        break;
    case ASI_IMG_RAW16:
        for (int y = roiY1; y < roiY2; y++) {
            for (int x = roiX1; x < roiX2; x+=bpp) {
                i = (width * y) + x;
                int pixelValue;
                // This assumes the image data is laid out in big endian format.
                // We are going to grab the most significant byte
                // and use that for the histogram value ignoring the
                // least significant byte so we can use the 256 value histogram array.
                // If t's acutally little endian then add a +1 to the array subscript for b[i].
                pixelValue = b[i];
                histogram[pixelValue]++;
            }
        }
        break;
    default:
        sprintf(debugText, "*** ERROR: Received unspported value for ASI_IMG_TYPE: %d\n", imageType);
        displayDebugText(debugText, 0);
    }
}

int calculateHistogramMean(int *histogram) {
    int meanBin = 0;
    int a = 0, b = 0;
    for (int h = 0; h < 256; h++) {
        a += (h+1) * histogram[h];
        b += histogram[h];
    }

    if (b == 0)
    {
        sprintf(debugText, "*** ERROR: calculateHistogramMean(): b==0\n");
        displayDebugText(debugText, 0);
        return(0);
    }

    meanBin = a/b - 1;
    return meanBin;
}
#endif

long actualExposureMicroseconds = 0;	// actual exposure taken, per the camera
long actualGain = 0;			// actual gain used, per the camera
long actualTemp = 0;			// actual sensor temp, per the camera
ASI_BOOL bAuto = ASI_FALSE;		// "auto" flag returned by ASIGetControlValue, when we don't care what it is

ASI_BOOL wasAutoExposure = ASI_FALSE;
long bufferSize = NOT_SET;

ASI_ERROR_CODE takeOneExposure(
        int cameraId,
        long exposureTimeMicroseconds,
        unsigned char *imageBuffer, long width, long height,  // where to put image and its size
        ASI_IMG_TYPE imageType)
{
    if (imageBuffer == NULL) {
        return (ASI_ERROR_CODE) -1;
    }

    ASI_ERROR_CODE status;
    // ZWO recommends timeout = (exposure*2) + 500 ms
    // After some discussion, we're doing +5000ms to account for delays induced by
	// USB contention, such as that caused by heavy USB disk IO
    long timeout = ((exposureTimeMicroseconds * 2) / US_IN_MS) + 5000;	// timeout is in ms

    sprintf(debugText, "  > Exposure set to %'ld us (%'.2f ms), timeout: %'ld ms\n",
            exposureTimeMicroseconds, (float)exposureTimeMicroseconds/US_IN_MS, timeout);
    displayDebugText(debugText, 2);

    setControl(cameraId, ASI_EXPOSURE, exposureTimeMicroseconds, currentAutoExposure);

    if (use_new_exposure_algorithm)
    {
        status = ASIStartVideoCapture(cameraId);
    } else {
        status = ASI_SUCCESS;
    }

    if (status == ASI_SUCCESS) {
        status = ASIGetVideoData(cameraId, imageBuffer, bufferSize, timeout);
        if (status != ASI_SUCCESS) {
            sprintf(debugText, "  > ERROR: Failed getting image, status = %s\n", getRetCode(status));
            displayDebugText(debugText, 0);
        }
        else {
            ASIGetControlValue(cameraId, ASI_EXPOSURE, &actualExposureMicroseconds, &wasAutoExposure);
            sprintf(debugText, "  > Got image @ exposure: %'ld us (%'.2f ms)\n", actualExposureMicroseconds, (float)actualExposureMicroseconds/US_IN_MS);
            displayDebugText(debugText, 2);

            // If this was a manual exposure, make sure it took the correct exposure.
            if (wasAutoExposure == ASI_FALSE && exposureTimeMicroseconds != actualExposureMicroseconds)
            {
                sprintf(debugText, "  > WARNING: not correct exposure (requested: %'ld us, actual: %'ld us, diff: %'ld)\n", exposureTimeMicroseconds, actualExposureMicroseconds, actualExposureMicroseconds - exposureTimeMicroseconds);
                displayDebugText(debugText, 0);
                status = (ASI_ERROR_CODE) -1;
            }
            ASIGetControlValue(cameraId, ASI_GAIN, &actualGain, &bAuto);
            ASIGetControlValue(cameraId, ASI_TEMPERATURE, &actualTemp, &bAuto);
        }

        if (use_new_exposure_algorithm)
            ASIStopVideoCapture(cameraId);

    }
    else {
        sprintf(debugText, "  > ERROR: Not fetching exposure data because status is %s\n", getRetCode(status));
        displayDebugText(debugText, 0);
    }

    return status;
}

// Exit the program gracefully.
void closeUp(int e)
{
    static int closingUp = 0;		// indicates if we're in the process of exiting.
    // For whatever reason, we're sometimes called twice, but we should only execute once.
    if (closingUp) return;

    closingUp = 1;

    ASIStopVideoCapture(CamNum);

    // Seems to hang on ASICloseCamera() if taking a picture when the signal is sent,
    // until the exposure finishes, then it never returns so the remaining code doesn't
    // get executed.  Don't know a way around that, so don't bother closing the camera.
    // Prior versions of allsky didn't do any cleanup, so it should be ok not to close the camera.
    //    ASICloseCamera(CamNum);

    if (bDisplay)
    {
        bDisplay = 0;
        pthread_join(thread_display, &retval);
    }

    if (bSaveRun)
    {
        bSaveRun = false;
        pthread_mutex_lock(&mtx_SaveImg);
        pthread_cond_signal(&cond_SatrtSave);
        pthread_mutex_unlock(&mtx_SaveImg);
        pthread_join(hthdSave, 0);
    }

    // If we're not on a tty assume we were started by the service.
    // Unfortunately we don't know if the service is stopping us, or restarting us.
    // If it was restarting there'd be no reason to copy a notification image since it
    // will soon be overwritten.  Since we don't know, always copy it.
    if (notificationImages) {
        system("scripts/copy_notification_image.sh NotRunning &");
        // Sleep to give it a chance to print any messages so they (hopefully) get printed
        // before the one below.  This is only so it looks nicer in the log file.
        sleep(3);
    }

    printf("     ***** Stopping AllSky *****\n");
    exit(e);
}

void IntHandle(int i)
{
    gotSignal = 1;
    closeUp(0);
}

// A user error was found.  Wait for the user to fix it.
void waitToFix(char const *msg)
{
    printf("**********\n");
    printf(msg);
    printf("\n");
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
    // don't need "exit" or "set".
    sprintf(sunwaitCommand, "sunwait poll angle %s %s %s", angle, latitude, longitude);
    dayOrNight = exec(sunwaitCommand);
    dayOrNight.erase(std::remove(dayOrNight.begin(), dayOrNight.end(), '\n'), dayOrNight.end());

    if (dayOrNight != "DAY" && dayOrNight != "NIGHT")
    {
        sprintf(debugText, "*** ERROR: dayOrNight isn't DAY or NIGHT, it's '%s'\n", dayOrNight.c_str());
        waitToFix(debugText);
        closeUp(2);
    }
}

// Calculate how long until nighttime.
int calculateTimeToNightTime(const char *latitude, const char *longitude, const char *angle)
{
    std::string t;
    char sunwaitCommand[128];	// returns "hh:mm, hh:mm" (sunrise, sunset)
    sprintf(sunwaitCommand, "sunwait list angle %s %s %s | awk '{print $2}'", angle, latitude, longitude);
    t = exec(sunwaitCommand);
    t.erase(std::remove(t.begin(), t.end(), '\n'), t.end());

    int h=0, m=0, secs;
    sscanf(t.c_str(), "%d:%d", &h, &m);
    secs = (h*60*60) + (m*60);

    char *now = getTime("%H:%M");
    int hNow=0, mNow=0, secsNow;
    sscanf(now, "%d:%d", &hNow, &mNow);
    secsNow = (hNow*60*60) + (mNow*60);

    // Handle the (probably rare) case where nighttime is tomorrow
    if (secsNow > secs)
    {
        return(secs + (60*60*24) - secsNow);
    }
    else
    {
        return(secs - secsNow);
    }
}

void writeToLog(int val)
{
    std::ofstream outfile;
    outfile.open("log.txt", std::ios_base::app);
    outfile << val;
    outfile << "\n";
}

void writeTemperatureToFile(float val)
{
    std::ofstream outfile;
    outfile.open("temperature.txt", std::ios_base::trunc);
    outfile << val;
    outfile << "\n";
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

bool adjustGain = false;	// Should we adjust the gain?  Set by user on command line.
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
    sprintf(debugText, "xxx resetGainTransitionVariables(%d, %d) called at %s\n", dayGain, nightGain, dayOrNight.c_str());
    displayDebugText(debugText, 2);

    if (adjustGain == false)
    {
        // determineGainChange() will never be called so no need to set any variables.
        sprintf(debugText,"xxx will not adjust gain - adjustGain == false\n");
        displayDebugText(debugText, 2);
        return(false);
    }

    if (numExposures == 0)
    {
        // we don't adjust when the program first starts since there's nothing to transition from
        sprintf(debugText,"xxx will not adjust gain right now - numExposures == 0\n");
        displayDebugText(debugText, 2);
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
        totalTimeInSec = (asiDayExposure / US_IN_SEC) + (dayDelay / MS_IN_SEC);
        sprintf(debugText,"xxx totalTimeInSec=%.1fs, asiDayExposure=%'dus , daydelay=%'dms\n", totalTimeInSec, asiDayExposure, dayDelay);
        displayDebugText(debugText, 2);
    }
    else	// NIGHT
    {
        // At nightime if the exposure is less than the max, we wait until max has expired,
        // so use it instead of the exposure time.
        totalTimeInSec = (asiNightMaxExposure / MS_IN_SEC) + (nightDelay / MS_IN_SEC);
        sprintf(debugText, "xxx totalTimeInSec=%.1fs, asiNightMaxExposure=%'dms, nightDelay=%'dms\n", totalTimeInSec, asiNightMaxExposure, nightDelay);
        displayDebugText(debugText, 2);
    }

    gainTransitionImages = ceil(gainTransitionTime / totalTimeInSec);
    if (gainTransitionImages == 0)
    {
        sprintf(debugText, "*** INFORMATION: Not adjusting gain - your 'gaintransitiontime' (%d seconds) is less than the time to take one image plus its delay (%.1f seconds).\n", gainTransitionTime, totalTimeInSec);
        displayDebugText(debugText, 0);

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

    sprintf(debugText,"xxx gainTransitionImages=%d, gainTransitionTime=%ds, perImageAdjustGain=%d, totalAdjustGain=%d\n",
        gainTransitionImages, gainTransitionTime, perImageAdjustGain, totalAdjustGain);
    displayDebugText(debugText, 2);

    return(true);
}

// Determine the change in gain needed for smooth transitions between night and day.
// Gain during the day is usually 0 and at night is usually > 0.
// If auto exposure is on for both, the first several night frames may be too bright at night
// because of the sudden (often large) increase in gain, or too dark at the night-to-day
// transition.
// Try to mitigate that by changing the gain over several images at each transition.

int determineGainChange(int dayGain, int nightGain)
{
    if (numGainChanges > gainTransitionImages || totalAdjustGain == 0)
    {
        // no more changes needed in this transition
        sprintf(debugText, "  xxxx No more gain changes needed.\n");
        displayDebugText(debugText, 2);
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

    sprintf(debugText, "  xxxx Adjusting %s gain by %d on next picture to %d; will be gain change # %d of %d.\n",
        dayOrNight.c_str(), amt, amt+currentGain, numGainChanges, gainTransitionImages);
    displayDebugText(debugText, 2);
    return(amt);
}

//-------------------------------------------------------------------------------------------------------
//-------------------------------------------------------------------------------------------------------

int main(int argc, char *argv[])
{
    signal(SIGINT, IntHandle);
    signal(SIGTERM, IntHandle);	// The service sends SIGTERM to end this program.
    pthread_mutex_init(&mtx_SaveImg, 0);
    pthread_cond_init(&cond_SatrtSave, 0);

    int fontname[] = {
        cv::FONT_HERSHEY_SIMPLEX,        cv::FONT_HERSHEY_PLAIN,         cv::FONT_HERSHEY_DUPLEX,
        cv::FONT_HERSHEY_COMPLEX,        cv::FONT_HERSHEY_TRIPLEX,       cv::FONT_HERSHEY_COMPLEX_SMALL,
        cv::FONT_HERSHEY_SCRIPT_SIMPLEX, cv::FONT_HERSHEY_SCRIPT_COMPLEX };
    char const *fontnames[] = {		// Character representation of names for clarity:
        "SIMPLEX",                      "PLAIN",                       "DUPEX",
        "COMPLEX",                      "TRIPLEX",                     "COMPLEX_SMALL",
        "SCRIPT_SIMPLEX",               "SCRIPT_COMPLEX" };

    char bufTime[128]     = { 0 };
    char bufTemp[128]     = { 0 };
    char bufTemp2[50]     = { 0 };
    char const *bayer[]   = { "RG", "BG", "GR", "GB" };
    bool endOfNight       = false;
    int i;
    ASI_ERROR_CODE asiRetCode;  // used for return code from ASI functions.

    // Some settings have both day and night versions, some have only one version that applies to both,
    // and some have either a day OR night version but not both.
    // For settings with both versions we keep a "current" variable (e.g., "currentBin") that's either the day
    // or night version so the code doesn't always have to check if it's day or night.
    // The settings have either "day" or "night" in the name.
    // In theory, almost every setting could have both day and night versions (e.g., width & height),
    // but the chances of someone wanting different versions.

    // #define the defaults so we can use the same value in the help message.

#define DEFAULT_LOCALE           "en_US.UTF-8"
const char *locale = DEFAULT_LOCALE;
    // All the font settings apply to both day and night.
#define DEFAULT_FONTNUMBER       0
    int fontnumber             = DEFAULT_FONTNUMBER;
#define DEFAULT_ITEXTX           15
#define DEFAULT_ITEXTY           25
    int iTextX                 = DEFAULT_ITEXTX;
    int iTextY                 = DEFAULT_ITEXTY;
#define DEFAULT_ITEXTLINEHEIGHT  30
    int iTextLineHeight        = DEFAULT_ITEXTLINEHEIGHT;
    char const *ImgText        = "";
    char const *ImgExtraText   = "";
    int extraFileAge           = 0;   // 0 disables it
    char textBuffer[1024]      = { 0 };
#define DEFAULT_FONTSIZE         7
    double fontsize            = DEFAULT_FONTSIZE;
#define SMALLFONTSIZE_MULTIPLIER 0.08
#define DEFAULT_LINEWIDTH        1
    int linewidth              = DEFAULT_LINEWIDTH;
#define DEFAULT_OUTLINEFONT      0
    int outlinefont            = DEFAULT_OUTLINEFONT;
    int fontcolor[3]           = { 255, 0, 0 };
    int smallFontcolor[3]      = { 0, 0, 255 };
    int linetype[3]            = { cv::LINE_AA, 8, 4 };
#define DEFAULT_LINENUMBER       0
    int linenumber             = DEFAULT_LINENUMBER;

#define DEFAULT_WIDTH            0
#define DEFAULT_HEIGHT           0
    int width                  = DEFAULT_WIDTH;		int originalWidth  = width;
    int height                 = DEFAULT_HEIGHT;	int originalHeight = height;

#define DEFAULT_DAYBIN           1  // binning during the day probably isn't too useful...
#define DEFAULT_NIGHTBIN         1
    int dayBin                 = DEFAULT_DAYBIN;
    int nightBin               = DEFAULT_NIGHTBIN;
    int currentBin             = NOT_SET;

#define DEFAULT_IMAGE_TYPE       1
#define AUTO_IMAGE_TYPE         99	// needs to match what's in the camera_settings.json file
    int Image_type             = DEFAULT_IMAGE_TYPE;

#define DEFAULT_ASIBANDWIDTH    40
    int asiBandwidth           = DEFAULT_ASIBANDWIDTH;
    int asiAutoBandwidth       = 0;	// is Auto Bandwidth on or off?

    // There is no max day autoexposure since daylight exposures are always pretty short.
#define DEFAULT_ASINIGHTEXPOSURE (5 * US_IN_SEC)	// 5 seconds
    long asiNightExposure      = DEFAULT_ASINIGHTEXPOSURE;
    long currentExposure       = NOT_SET;
#define DEFAULT_NIGHTAUTOEXPOSURE 1
    int asiNightAutoExposure   = DEFAULT_NIGHTAUTOEXPOSURE;	// is it on or off for nighttime?
    // currentAutoExposure is global so is defined outside of main()

#define DEFAULT_ASIDAYGHTGAIN    0
    int asiDayGain             = DEFAULT_ASIDAYGHTGAIN;
    int asiDayAutoGain         = 0;	// is Auto Gain on or off for daytime?
#define DEFAULT_ASINIGHTGAIN     150
    int asiNightGain           = DEFAULT_ASINIGHTGAIN;
#define DEFAULT_NIGHTAUTOGAIN    0
    int asiNightAutoGain       = DEFAULT_NIGHTAUTOGAIN;	// is Auto Gain on or off for nighttime?
#define DEFAULT_ASINIGHTMAXGAIN  200
    int asiNightMaxGain        = DEFAULT_ASINIGHTMAXGAIN;
    ASI_BOOL currentAutoGain   = ASI_FALSE;

    int currentDelay           = NOT_SET;

#define DEFAULT_ASIWBR           65
    int asiWBR                 = DEFAULT_ASIWBR;
#define DEFAULT_ASIWBB           85
    int asiWBB                 = DEFAULT_ASIWBB;
#define DEFAULT_AUTOWHITEBALANCE 0
    int asiAutoWhiteBalance    = DEFAULT_AUTOWHITEBALANCE;	// is Auto White Balance on or off?

#define DEFAULT_ASIGAMMA         50		// not supported by all cameras
    int asiGamma               = DEFAULT_ASIGAMMA;

#define DEFAULT_BRIGHTNESS 50
    int asiDayBrightness       = DEFAULT_BRIGHTNESS;
#define MAX_BRIGHTNESS           600
    int asiNightBrightness     = DEFAULT_BRIGHTNESS;
    int currentBrightness      = NOT_SET;

#define DEFAULT_LATITUDE         "60.7N" //GPS Coordinates of Whitehorse, Yukon where the code was created
    char const *latitude       = DEFAULT_LATITUDE;
#define DEFAULT_LONGITUDE        "135.05W"
    char const *longitude      = DEFAULT_LONGITUDE;
#define DEFAULT_ANGLE            "-6"
    // angle of the sun with the horizon
    // (0=sunset, -6=civil twilight, -12=nautical twilight, -18=astronomical twilight)
    char const *angle          = DEFAULT_ANGLE;

    int preview                = 0;
#define DEFAULT_SHOWTIME 1
    int showTime               = DEFAULT_SHOWTIME;
    int darkframe              = 0;
    char const *tempType      = "C";	// Celsius

    int showDetails            = 0;
        // Allow for more granularity than showDetails, which shows everything:
        int showTemp           = 0;
        int showExposure       = 0;
        int showGain           = 0;
        int showBrightness     = 0;
#ifdef USE_HISTOGRAM
        int showHistogram      = 0;
    int maxHistogramAttempts   = 15;	// max number of times we'll try for a better histogram mean
    int showHistogramBox       = 0;
#endif
#define DEFAULT_DAYTIMECAPTURE   0
    int daytimeCapture         = DEFAULT_DAYTIMECAPTURE;  // are we capturing daytime pictures?

    int help                   = 0;
    int quality                = NOT_SET;
    int asiFlip                = 0;
    int asiCoolerEnabled       = 0;
    long asiTargetTemp         = 0;

    //-------------------------------------------------------------------------------------------------------
    //-------------------------------------------------------------------------------------------------------
    setlinebuf(stdout);   // Line buffer output so entries appear in the log immediately.
    printf("\n");
    printf("%s ******************************************\n", KGRN);
    printf("%s *** Allsky Camera Software v0.8 | 2021 ***\n", KGRN);
    printf("%s ******************************************\n\n", KGRN);
    printf("\%sCapture images of the sky with a Raspberry Pi and an ASI Camera\n", KGRN);
    printf("\n");
    printf("%sAdd -h or -help for available options\n", KYEL);
    printf("\n");
    printf("\%sAuthor: ", KNRM);
    printf("Thomas Jacquin - <jacquin.thomas@gmail.com>\n\n");
    printf("\%sContributors:\n", KNRM);
    printf("-Knut Olav Klo\n");
    printf("-Daniel Johnsen\n");
    printf("-Yang and Sam from ZWO\n");
    printf("-Robert Wagner\n");
    printf("-Michael J. Kidd - <linuxkidd@gmail.com>\n");
    printf("-Chris Kuethe\n\n");

    // The newer "allsky.sh" puts quotes around arguments so we can have spaces in them.
    // If you are running the old allsky.sh, set this to false:
    bool argumentsQuoted = true;

    if (argc > 0)
    {
        // -h[elp] doesn't take an argument, but the "for" loop assumes every option does,
        // so check separately, assuming the option is the first one.
        // If it's not the first option, we'll find it in the "for" loop.
        if (strcmp(argv[0], "-h") == 0 || strcmp(argv[0], "-help") == 0)
        {
            help = 1;
            i = 1;
        }
        else
        {
            i = 0;
        }

        // Many of the argument names changed to allow day and night values.
        // However, still check for the old names in case the user didn't update their
        // settings.json file.  The old names should be removed below in a future version.
        for ( ; i < argc - 1 ; i++)
        {
            // Check again in case "-h" isn't the first option.
            if (strcmp(argv[i], "-h") == 0 || strcmp(argv[i], "-help") == 0)
            {
                help = 1;
            }
            else if (strcmp(argv[i], "-newexposure") == 0)
            {
                if (atoi(argv[++i]))
                    use_new_exposure_algorithm = true;
                else
                    use_new_exposure_algorithm = false;
            }
            else if (strcmp(argv[i], "-locale") == 0)
            {
                locale = argv[++i];
            }
            else if (strcmp(argv[i], "-tty") == 0)
            {
                tty = atoi(argv[++i]);
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
            else if (strcmp(argv[i], "-nightexposure") == 0 || strcmp(argv[i], "-exposure") == 0)
            {
                asiNightExposure = atoi(argv[++i]) * US_IN_MS;
            }
            else if (strcmp(argv[i], "-dayexposure") == 0)
            {
                asiDayExposure = atof(argv[++i]) * US_IN_MS;  // allow fractions
            }
            else if (strcmp(argv[i], "-nightmaxexposure") == 0 || strcmp(argv[i], "-maxexposure") == 0)
            {
                asiNightMaxExposure = atoi(argv[++i]);
            }
            else if (strcmp(argv[i], "-dayautoexposure") == 0)
            {
                asiDayAutoExposure = atoi(argv[++i]);
            }
            else if (strcmp(argv[i], "-nightautoexposure") == 0 || strcmp(argv[i], "-autoexposure") == 0)
            {
                asiNightAutoExposure = atoi(argv[++i]);
            }
            else if (strcmp(argv[i], "-nightgain") == 0 || strcmp(argv[i], "-gain") == 0)
            {
                asiNightGain = atoi(argv[++i]);
            }
            else if (strcmp(argv[i], "-nightmaxgain") == 0 || strcmp(argv[i], "-maxgain") == 0)
            {
                asiNightMaxGain = atoi(argv[++i]);
            }
            else if (strcmp(argv[i], "-nightautogain") == 0 || strcmp(argv[i], "-autogain") == 0)
            {
                asiNightAutoGain = atoi(argv[++i]);
            }
            else if (strcmp(argv[i], "-gaintransitiontime") == 0)
            {
                // user specifies minutes but we want seconds.
                gainTransitionTime = atoi(argv[++i]) * 60;
            }
            else if (strcmp(argv[i], "-gamma") == 0)
            {
                asiGamma = atoi(argv[++i]);
            }
            // old "-brightness" applied to day and night
            else if (strcmp(argv[i], "-brightness") == 0)
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
                dayDelay = atoi(argv[++i]);
            }
            else if (strcmp(argv[i], "-nightdelay") == 0 || strcmp(argv[i], "-delay") == 0)
            {
                nightDelay = atoi(argv[++i]);
            }
            else if (strcmp(argv[i], "-wbr") == 0)
            {
                asiWBR = atoi(argv[++i]);
            }
            else if (strcmp(argv[i], "-wbb") == 0)
            {
                asiWBB = atoi(argv[++i]);
            }
            else if (strcmp(argv[i], "-autowhitebalance") == 0)
            {
                asiAutoWhiteBalance = atoi(argv[++i]);
            }
            else if (strcmp(argv[i], "-text") == 0)
            {
                if (argumentsQuoted)
                {
                    ImgText = argv[++i];
                }
                else
                {
                    // In case the text is null and isn't quoted, check if the next argument
                    // starts with a "-".  If so, the text is null, otherwise it's the text.
                    if ((char)argv[i + 1][0] != '-') {
                        ImgText = argv[++i];
                    }
                }
            }
            else if (strcmp(argv[i], "-extratext") == 0)
            {
                if (argumentsQuoted)
                {
                    ImgExtraText = argv[++i];
                }
                else
                {
                    // In case the text is null and isn't quoted, check if the next argument
                    // starts with a "-".  If so, the text is null, otherwise it's the text.
                    if ((char)argv[i + 1][0] != '-') {
                        ImgExtraText = argv[++i];
                    }
                }
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
                if (argumentsQuoted)
                {
                    sscanf(argv[++i], "%d %d %d", &fontcolor[0], &fontcolor[1], &fontcolor[2]);
                }
                else
                {
                    fontcolor[0] = atoi(argv[++i]);
                    fontcolor[1] = atoi(argv[++i]);
                    fontcolor[2] = atoi(argv[++i]);
                }
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
		if (outlinefont != 0)
		    outlinefont = 1;
            }
            else if (strcmp(argv[i], "-flip") == 0)
            {
                asiFlip = atoi(argv[++i]);
            }
            else if (strcmp(argv[i], "-usb") == 0)
            {
                asiBandwidth = atoi(argv[++i]);
            }
            else if (strcmp(argv[i], "-autousb") == 0)
            {
                asiAutoBandwidth = atoi(argv[++i]);
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
                notificationImages = atoi(argv[++i]);
            }
#ifdef USE_HISTOGRAM
            else if (strcmp(argv[i], "-histogrambox") == 0)
            {
                if (argumentsQuoted)
                {
                    sscanf(argv[++i], "%d %d %f %f", &histogramBoxSizeX, &histogramBoxSizeY, &histogramBoxPercentFromLeft, &histogramBoxPercentFromTop);
                    histogramBoxPercentFromLeft /= 100;	// user enters 0-100
                    histogramBoxPercentFromTop /= 100;
                }
                else
                {
                    histogramBoxSizeX = atoi(argv[++i]);
                    histogramBoxSizeY = atoi(argv[++i]);
                    histogramBoxPercentFromLeft = (float)atoi(argv[++i]) / 100;	// user enters 0-100
                    histogramBoxPercentFromTop = (float)atoi(argv[++i]) / 100;	// user enters 0-100
                }
            }
            else if (strcmp(argv[i], "-showhistogrambox") == 0)
            {
                showHistogramBox = atoi(argv[++i]);
            }
#endif
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
            else if (strcmp(argv[i], "-showDetails") == 0)
            {
                showDetails = atoi(argv[++i]);
                // showDetails is an obsolete variable that shows ALL details except time.
                // It's been replaced by separate variables for various lines.
                showTemp = showDetails;
		showExposure = showDetails;
		showGain = showDetails;
            }
            else if (strcmp(argv[i], "-showTemp") == 0)
            {
                showTemp = atoi(argv[++i]);
            }
            else if (strcmp(argv[i], "-temptype") == 0)
            {
                tempType = argv[++i];
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
#ifdef USE_HISTOGRAM
            else if (strcmp(argv[i], "-showHistogram") == 0)
            {
                showHistogram = atoi(argv[++i]);
            }
#endif
            else if (strcmp(argv[i], "-daytime") == 0)
            {
                daytimeCapture = atoi(argv[++i]);
            }
	    else if (strcmp(argv[i], "-coolerEnabled") == 0)
            {
                asiCoolerEnabled = atoi(argv[++i]);
            }
	    else if (strcmp(argv[i], "-targetTemp") == 0)
            {
                asiTargetTemp = atol(argv[++i]);
            }
        }
    }

    if (help == 1)
    {
        printf("%sAvailable Arguments:\n", KYEL);
        printf(" -width                             - Default = %d = Camera Max Width\n", DEFAULT_WIDTH);
        printf(" -height                            - Default = %d = Camera Max Height\n", DEFAULT_HEIGHT);
        printf(" -daytime                           - Default = %d - Set to 1 to enable daytime images\n", DEFAULT_DAYTIMECAPTURE);
        printf(" -dayexposure                       - Default = %'d - Time in us (equals to %.4f sec)\n", DEFAULT_ASIDAYEXPOSURE, (float)DEFAULT_ASIDAYEXPOSURE/US_IN_SEC);
        printf(" -nightexposure                     - Default = %'d - Time in us (equals to %.4f sec)\n", DEFAULT_ASINIGHTEXPOSURE, (float)DEFAULT_ASINIGHTEXPOSURE/US_IN_SEC);
        printf(" -nightmaxexposure                  - Default = %'d - Time in ms (equals to %.1f sec)\n", DEFAULT_ASINIGHTMAXEXPOSURE, (float)DEFAULT_ASINIGHTMAXEXPOSURE/US_IN_MS);

        printf(" -dayautoexposure                   - Default = %d - Set to 1 to enable daytime auto Exposure\n", DEFAULT_DAYAUTOEXPOSURE);
        printf(" -nightautoexposure                 - Default = %d - Set to 1 to enable nighttime auto Exposure\n", DEFAULT_NIGHTAUTOEXPOSURE);
        printf(" -nightgain                         - Default = %d\n", DEFAULT_ASINIGHTGAIN);
        printf(" -nightmaxgain                      - Default = %d\n", DEFAULT_ASINIGHTMAXGAIN);
        printf(" -nightautogain                     - Default = %d - Set to 1 to enable nighttime auto gain\n", DEFAULT_NIGHTAUTOGAIN);
        printf(" -gaintransitiontime                - Default = %'d - Seconds to transition gain from day-to-night or night-to-day.  Set to 0 to disable\n", DEFAULT_GAIN_TRANSITION_TIME);
        printf(" -coolerEnabled                     - Set to 1 to enable cooler (works on cooled cameras only)\n");
        printf(" -targetTemp                        - Target temperature in degrees C (works on cooled cameras only)\n");
        printf(" -gamma                             - Default = %d\n", DEFAULT_ASIGAMMA);
        printf(" -daybrightness                     - Default = %d (range: 0 - 600)\n", DEFAULT_BRIGHTNESS);
        printf(" -nightbrightness                   - Default = %d (range: 0 - 600)\n", DEFAULT_BRIGHTNESS);
        printf(" -wbr                               - Default = %d   - manual White Balance Red\n", DEFAULT_ASIWBR);
        printf(" -wbb                               - Default = %d   - manual White Balance Blue\n", DEFAULT_ASIWBB);
        printf(" -autowhitebalance                  - Default = %d - Set to 1 to enable auto White Balance\n", DEFAULT_AUTOWHITEBALANCE);
        printf(" -daybin                            - Default = %d    - 1 = binning OFF (1x1), 2 = 2x2 binning, 4 = 4x4 binning\n", DEFAULT_DAYBIN);
        printf(" -nightbin                          - Default = %d    - 1 = binning OFF (1x1), 2 = 2x2 binning, 4 = 4x4 binning\n", DEFAULT_NIGHTBIN);
        printf(" -dayDelay                          - Default = %'d   - Delay between daytime images in milliseconds - 5000 = 5 sec.\n", DEFAULT_DAYDELAY);
        printf(" -nightDelay                        - Default = %'d   - Delay between night images in milliseconds - %d = 1 sec.\n", DEFAULT_NIGHTDELAY, MS_IN_SEC);
        printf(" -type = Image Type                 - Default = %d    - 0 = RAW8,  1 = RGB24,  2 = RAW16,  3 = Y8\n", DEFAULT_IMAGE_TYPE);
        printf(" -quality                           - Default PNG=3, JPG=95, Values: PNG=0-9, JPG=0-100\n");
        printf(" -usb = USB Speed                   - Default = %d   - Values between 40-100, This is "
               "BandwidthOverload\n", DEFAULT_ASIBANDWIDTH);
        printf(" -autousb                           - Default = 0 - Set to 1 to enable auto USB Speed\n");
        printf(" -filename                          - Default = %s\n", DEFAULT_FILENAME);
        printf(" -flip                              - Default = 0    - 0 = Orig, 1 = Horiz, 2 = Verti, 3 = Both\n");
        printf("\n");
        printf(" -text                              - Default = \"\"   - Character/Text Overlay\n");
        printf(" -extratext                         - Default = \"\"   - Full Path to extra text to display\n");
        printf(" -extratextage                      - Default = 0  - If the extra file is not updated after this many seconds its contents will not be displayed. Set to 0 to disable\n");
        printf(" -textlineheight                    - Default = %d   - Text Line Height in Pixels\n", DEFAULT_ITEXTLINEHEIGHT);
        printf(" -textx = Text X                    - Default = %d   - Text Placement Horizontal from LEFT in pixels\n", DEFAULT_ITEXTX);
        printf(" -texty = Text Y                    - Default = %d   - Text Placement Vertical from TOP in pixels\n", DEFAULT_ITEXTY);
        printf(" -fontname = Font Name              - Default = %d   - Font Types (0-7), Ex. 0 = simplex, 4 = triplex, 7 = script\n", DEFAULT_FONTNUMBER);
        printf(" -fontcolor = Font Color            - Default = 255 0 0  - Text blue (BGR)\n");
        printf(" -smallfontcolor = Small Font Color - Default = 0 0 255  - Text red (BGR)\n");
        printf(" -fonttype = Font Type              - Default = %d    - Font Line Type,(0-2), 0 = AA, 1 = 8, 2 = 4\n", DEFAULT_LINENUMBER);
        printf(" -fontsize                          - Default = %d    - Text Font Size\n", DEFAULT_FONTSIZE);
        printf(" -fontline                          - Default = %d    - Text Font Line Thickness\n", DEFAULT_LINEWIDTH);
        printf(" -outlinefont                       - Default = %d    - TSet to 1 to enable outline font\n", DEFAULT_OUTLINEFONT);
        //printf(" -bgc = BG Color                    - Default =      - Text Background Color in Hex. 00ff00 = Green\n");
        //printf(" -bga = BG Alpha                    - Default =      - Text Background Color Alpha/Transparency 0-100\n");
        printf("\n");
        printf("\n");
        printf(" -latitude                          - Default = %7s (Whitehorse) - Latitude of the camera.\n", DEFAULT_LATITUDE);
        printf(" -longitude                         - Default = %7s (Whitehorse) - Longitude of the camera\n", DEFAULT_LONGITUDE);
        printf(" -angle                             - Default = %s - Angle of the sun below the horizon.\n", DEFAULT_ANGLE);
        printf("   -6=civil twilight\n   -12=nautical twilight\n   -18=astronomical twilight\n");
        printf("\n");
        printf(" -locale                            - Default = %s - Your locale, used to determine your thousands separator and decimal point. If you don't know it, type 'locale' at a command prompt.\n", DEFAULT_LOCALE);
        printf(" -notificationimages                - Set to 1 to enable notification images, for example, 'Camera is off during day'.\n");
#ifdef USE_HISTOGRAM
        printf(" -histogrambox                      - Default = %d %d %0.2f %0.2f (box width X, box width y, X offset percent (0-100), Y offset (0-100)\n", DEFAULT_BOX_SIZEX, DEFAULT_BOX_SIZEY, DEFAULT_BOX_FROM_LEFT * 100, DEFAULT_BOX_FROM_TOP * 100);
        printf(" -showhistogrambox                  - Set to 1 to view an outline of the histogram box. Useful to help determine what parameters to use with -histogrambox.\n");
#endif
        printf(" -darkframe                         - Set to 1 to disable time and text overlay and take dark frames instead.\n");
        printf(" -preview                           - Set to 1 to preview the captured images. Only works with a Desktop Environment\n");
        printf(" -time                              - Set to 1 to add the time to the image. Combine with Text X and Text Y for placement\n");
        printf(" -timeformat                        - Format the optional time is displayed in; default is '%s'\n", DEFAULT_TIMEFORMAT);
        printf(" -showDetails (obsolete)            - Set to 1 to display sensor temp, exposure length, and gain metadata on the image.\n");
        printf(" -showTemp                          - Set to 1 to display the camera sensor temperature on the image.\n");
        printf(" -temptype                          - How to display temperature: 'C'elsius, 'F'ahrenheit, or 'B'oth.\n");
        printf(" -showExposure                      - Set to 1 to display the exposure length on the image.\n");
        printf(" -showGain                          - Set to 1 to display the gain on the image.\n");
        printf(" -showBrightness                    - Set to 1 to display the brightness on the image, if not the default.\n");
#ifdef USE_HISTOGRAM
        printf(" -showHistogram                     - Set to 1 to display the histogram mean on the image.\n");
#endif
        printf(" -debuglevel                        - Default = 0. Set to 1,2 or 3 for more debugging information.\n");
        printf("%sUsage:\n", KRED);
        printf(" ./capture -width 640 -height 480 -nightexposure 5000000 -gamma 50 -type 1 -nightbin 1 -filename Lake-Laberge.PNG\n\n");
    }
    printf("%s\n", KNRM);
    setlocale(LC_NUMERIC, locale);

    const char *imagetype = "";
    const char *ext = strrchr(fileName, '.');
    if (strcasecmp(ext + 1, "jpg") == 0 || strcasecmp(ext + 1, "jpeg") == 0)
    {
        if (Image_type == ASI_IMG_RAW16)
	{
	    waitToFix("*** ERROR: RAW16 images only work with .png files; either change the Image Type or the Filename.\n");
	    exit(99);
	}

        imagetype = "jpg";
        compression_parameters.push_back(cv::IMWRITE_JPEG_QUALITY);
        if (quality == NOT_SET)
        {
            quality = 95;
        } else if (quality > 100)
	{
	    quality = 100;
	}
    }
    else if (strcasecmp(ext + 1, "png") == 0)
    {
        imagetype = "png";
        compression_parameters.push_back(cv::IMWRITE_PNG_COMPRESSION);
        if (quality == NOT_SET)
        {
            quality = 3;
        } else if (quality > 9)
	{
	    quality = 9;
	}
    }
    else
    {
        sprintf(textBuffer, "*** ERROR: Unsupported image extension (%s); only .jpg and .png are supported.\n", ext);
        waitToFix(textBuffer);
    	exit(99);
    }
    compression_parameters.push_back(quality);

    if (darkframe)
    {
        // To avoid overwriting the optional notification inage with the dark image,
        // during dark frames we use a different file name.
        static char darkFilename[200];
        sprintf(darkFilename, "dark.%s", imagetype);
        fileName = darkFilename;
    }

    int numDevices = ASIGetNumOfConnectedCameras();
    if (numDevices <= 0)
    {
        printf("*** ERROR: No Connected Camera...\n");
        // Don't wait here since it's possible the camera is physically connected
        // but the software doesn't see it and the USB bus needs to be reset.
    	closeUp(1);   // If there are no cameras we can't do anything.
    }

    printf("\nListing Attached Cameras%s:\n", numDevices == 1 ? "" : " (using first one)");

    ASI_CAMERA_INFO ASICameraInfo;

    for (i = 0; i < numDevices; i++)
    {
        ASIGetCameraProperty(&ASICameraInfo, i);
        printf("  - %d %s\n", i, ASICameraInfo.Name);
    }

    asiRetCode = ASIOpenCamera(CamNum);
    if (asiRetCode != ASI_SUCCESS)
    {
        printf("*** ERROR opening camera, check that you have root permissions! (%s)\n", getRetCode(asiRetCode));
        closeUp(1);      // Can't do anything so might as well exit.
    }

    printf("\n%s Information:\n", ASICameraInfo.Name);
    int iMaxWidth, iMaxHeight;
    double pixelSize;
    iMaxWidth  = ASICameraInfo.MaxWidth;
    iMaxHeight = ASICameraInfo.MaxHeight;
    pixelSize  = ASICameraInfo.PixelSize;
    printf("  - Resolution:%dx%d\n", iMaxWidth, iMaxHeight);
    printf("  - Pixel Size: %1.1fmicrons\n", pixelSize);
    printf("  - Supported Bin: ");
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
        printf("  - Color Camera: bayer pattern:%s\n", bayer[ASICameraInfo.BayerPattern]);
    }
    else
    {
        printf("  - Mono camera\n");
    }
    if (ASICameraInfo.IsCoolerCam)
    {
        printf("  - Camera with cooling capabilities\n");
    }

    const char *ver = ASIGetSDKVersion();
    printf("  - SDK version %s\n", ver);

    asiRetCode = ASIInitCamera(CamNum);
    if (asiRetCode == ASI_SUCCESS)
    {
        printf("  - Initialise Camera OK\n");
    }
    else
    {
        printf("*** ERROR: Unable to initialise camera: %s\n", getRetCode(asiRetCode));
        closeUp(1);      // Can't do anything so might as well exit.
    }

    ASIGetNumOfControls(CamNum, &iNumOfCtrl);
    if (debugLevel >= 3)	// this is really only needed for debugging
    {
        printf("Control Caps:\n");
        for (i = 0; i < iNumOfCtrl; i++)
        {
            ASIGetControlCaps(CamNum, i, &ControlCaps);
            printf("- %s:\n", ControlCaps.Name);
            printf("   - MinValue = %ld\n", ControlCaps.MinValue);
            printf("   - MaxValue = %ld\n", ControlCaps.MaxValue);
            printf("   - DefaultValue = %ld\n", ControlCaps.DefaultValue);
            printf("   - IsAutoSupported = %d\n", ControlCaps.IsAutoSupported);
            printf("   - IsWritable = %d\n", ControlCaps.IsWritable);
            printf("   - ControlType = %d\n", ControlCaps.ControlType);
        }
    }

    if (width == 0 || height == 0)
    {
        width  = iMaxWidth;
        height = iMaxHeight;
    }
    originalWidth = width;
    originalHeight = height;

    ASIGetControlValue(CamNum, ASI_TEMPERATURE, &actualTemp, &bAuto);
    printf("- Sensor temperature:%0.2f\n", (float)actualTemp / 10.0);

    // Handle "auto" Image_type.
    if (Image_type == AUTO_IMAGE_TYPE)
    {
        // If it's a color camera, create color pictures.
        // If it's a mono camera use RAW16 if the image file is a .png, otherwise use RAW8.
        // There is no good way to handle Y8 automatically so it has to be set manually.
        if (ASICameraInfo.IsColorCam)
            Image_type = ASI_IMG_RGB24;
        else if (strcmp(imagetype, "png") == 0)
            Image_type = ASI_IMG_RAW16;
        else // jpg
            Image_type = ASI_IMG_RAW8;
    }

    const char *sType;		// displayed in output
    if (Image_type == ASI_IMG_RAW16)
    {
        sType = "ASI_IMG_RAW16";
    }
    else if (Image_type == ASI_IMG_RGB24)
    {
        sType = "ASI_IMG_RGB24";
    }
    else if (Image_type == ASI_IMG_RAW8)
    {
        // Color cameras should use Y8 instead of RAW8.  Y8 is the mono mode for color cameras.
        if (ASICameraInfo.IsColorCam)
	{
	    Image_type = ASI_IMG_Y8;
            sType = "ASI_IMG_Y8 (not RAW8 for color cameras)";
	}
	else
	{
            sType = "ASI_IMG_RAW8";
	}
    }
    else
    {
        sType = "ASI_IMG_Y8";
    }

    //-------------------------------------------------------------------------------------------------------
    //-------------------------------------------------------------------------------------------------------

    printf("%s", KGRN);
    printf("\nCapture Settings:\n");
    printf(" Image Type: %s\n", sType);
    printf(" Resolution (before any binning): %dx%d\n", width, height);
    printf(" Quality: %d\n", quality);
    printf(" Daytime capture: %s\n", yesNo(daytimeCapture));
    printf(" Exposure (day): %'1.3fms\n", (float)asiDayExposure / US_IN_MS);
    printf(" Auto Exposure (day): %s\n", yesNo(asiDayAutoExposure));
    printf(" Exposure (night): %'1.0fms\n", round(asiNightExposure / US_IN_MS));
    printf(" Max Exposure (night): %'dms\n", asiNightMaxExposure);
    printf(" Auto Exposure (night): %s\n", yesNo(asiNightAutoExposure));
    printf(" Delay (day): %'dms\n", dayDelay);
    printf(" Delay (night): %'dms\n", nightDelay);
    printf(" Gain (night only): %d\n", asiNightGain);
    printf(" Auto Gain (night only): %s\n", yesNo(asiNightAutoGain));
    printf(" Max Gain (night only): %d\n", asiNightMaxGain);
    printf(" Gain Transition Time: %'d seconds\n", gainTransitionTime);
    printf(" Brightness (day): %d\n", asiDayBrightness);
    printf(" Brightness (night): %d\n", asiNightBrightness);
    printf(" Cooler Enabled: %s\n", yesNo(asiCoolerEnabled));
    printf(" Target Temperature: %ldC\n", asiTargetTemp);
    printf(" Gamma: %d\n", asiGamma);
    printf(" WB Red: %d\n", asiWBR);
    printf(" WB Blue: %d\n", asiWBB);
    printf(" Auto WB: %s\n", yesNo(asiAutoWhiteBalance));
    printf(" Binning (day): %d\n", dayBin);
    printf(" Binning (night): %d\n", nightBin);
    printf(" USB Speed: %d\n", asiBandwidth);
    printf(" Auto USB Speed: %s\n", yesNo(asiAutoBandwidth));
    printf(" Text Overlay: %s\n", ImgText[0] == '\0' ? "[none]" : ImgText);
    printf(" Text Extra Filename: %s\n", ImgExtraText[0] == '\0' ? "[none]" : ImgExtraText);
    printf(" Text Extra Filename Age: %d\n", extraFileAge);
    printf(" Text Line Height %dpx\n", iTextLineHeight);
    printf(" Text Position: %dpx left, %dpx top\n", iTextX, iTextY);
    printf(" Font Name:  %d (%s)\n", fontname[fontnumber], fontnames[fontnumber]);
    printf(" Font Color: %d , %d, %d\n", fontcolor[0], fontcolor[1], fontcolor[2]);
    printf(" Small Font Color: %d , %d, %d\n", smallFontcolor[0], smallFontcolor[1], smallFontcolor[2]);
    printf(" Font Line Type: %d\n", linetype[linenumber]);
    printf(" Font Size: %1.1f\n", fontsize);
    printf(" Font Line: %d\n", linewidth);
    printf(" Outline Font : %s\n", yesNo(outlinefont));
    printf(" Flip Image: %d\n", asiFlip);
    printf(" Filename: %s\n", fileName);
    printf(" Latitude: %s\n", latitude);
    printf(" Longitude: %s\n", longitude);
    printf(" Sun Elevation: %s\n", angle);
    printf(" Locale: %s\n", locale);
    printf(" Notification Images: %s\n", yesNo(notificationImages));
#ifdef USE_HISTOGRAM
    printf(" Histogram Box: %d %d %0.0f %0.0f\n", histogramBoxSizeX, histogramBoxSizeY,
            histogramBoxPercentFromLeft * 100, histogramBoxPercentFromTop * 100);
    printf(" Show Histogram Box: %s\n", yesNo(showHistogramBox));
    printf(" Show Histogram Mean: %s\n", yesNo(showHistogram));
#endif
    printf(" Show Time: %s (format: %s)\n", yesNo(showTime), timeFormat);
    printf(" Show Details: %s\n", yesNo(showDetails));
    printf(" Show Temperature: %s\n", yesNo(showTemp));
    printf(" Temperature Type: %s\n", tempType);
    printf(" Show Exposure: %s\n", yesNo(showExposure));
    printf(" Show Gain: %s\n", yesNo(showGain));
    printf(" Show Brightness: %s\n", yesNo(showBrightness));
    printf(" Preview: %s\n", yesNo(preview));
    printf(" Darkframe: %s\n", yesNo(darkframe));
    printf(" Debug Level: %d\n", debugLevel);
    printf(" TTY: %s\n", yesNo(tty));
    printf("%s\n", KNRM);

    //-------------------------------------------------------------------------------------------------------
    //-------------------------------------------------------------------------------------------------------
    // These configurations apply to both day and night.
    // Other calls to setControl() are done after we know if we're in daytime or nighttime.
    setControl(CamNum, ASI_BANDWIDTHOVERLOAD, asiBandwidth, asiAutoBandwidth == 1 ? ASI_TRUE : ASI_FALSE);
    setControl(CamNum, ASI_HIGH_SPEED_MODE, 0, ASI_FALSE);  // ZWO sets this in their program
    setControl(CamNum, ASI_WB_R, asiWBR, asiAutoWhiteBalance == 1 ? ASI_TRUE : ASI_FALSE);
    setControl(CamNum, ASI_WB_B, asiWBB, asiAutoWhiteBalance == 1 ? ASI_TRUE : ASI_FALSE);
    setControl(CamNum, ASI_GAMMA, asiGamma, ASI_FALSE);
    setControl(CamNum, ASI_FLIP, asiFlip, ASI_FALSE);

    if (ASICameraInfo.IsCoolerCam)
    {
        asiRetCode = setControl(CamNum, ASI_COOLER_ON, asiCoolerEnabled == 1 ? ASI_TRUE : ASI_FALSE, ASI_FALSE);
        if (asiRetCode != ASI_SUCCESS)
        {
            printf("%s", KRED);
            printf(" WARNING: Could not enable cooler: %s, but continuing without it.\n", getRetCode(asiRetCode));
            printf("%s", KNRM);
        }
        asiRetCode = setControl(CamNum, ASI_TARGET_TEMP, asiTargetTemp, ASI_FALSE);
        if (asiRetCode != ASI_SUCCESS)
        {
            printf("%s", KRED);
            printf(" WARNING: Could not set cooler temperature: %s, but continuing without it.\n", getRetCode(asiRetCode));
            printf("%s", KNRM);
        }
    }

    if (preview == 1)
    {
        bDisplay = 1;
        pthread_create(&thread_display, NULL, Display, (void *)&pRgb);
    }

    if (!bSaveRun)
    {
        bSaveRun = true;
        if (pthread_create(&hthdSave, 0, SaveImgThd, 0) != 0)
        {
            bSaveRun = false;
        }
    }

    // Initialization
    int exitCode        = 0;    // Exit code for main()
    int numErrors       = 0;    // Number of errors in a row.
    int maxErrors       = 2;    // Max number of errors in a row before we exit
    int originalITextX = iTextX;
    int originalITextY = iTextY;
    int originalFontsize = fontsize;
    int originalLinewidth = linewidth;
    int displayedNoDaytimeMsg = 0; // Have we displayed "not taking picture during day" message, if applicable?
    int gainChange = 0;			// how much to change gain up or down

    // If autogain is on, our adjustments to gain will get overwritten by the camera
    // so don't transition.
    // gainTransitionTime of 0 means don't adjust gain.
    // No need to adjust gain if day and night gain are the same.
    if (asiDayAutoGain == 1 || asiNightAutoGain == 1 || gainTransitionTime == 0 || asiDayGain == asiNightGain || darkframe == 1)
    {
        adjustGain = false;
        printf("Will NOT adjust gain at transitions\n");
    }
    else
    {
        adjustGain = true;
        printf("Will adjust gain at transitions\n");
    }

    if (tty)
        printf("Press Ctrl+C to stop\n\n");
    else
        printf("Stop the allsky service to end this process.\n\n");

    if (! use_new_exposure_algorithm)
    {
        asiRetCode = ASIStartVideoCapture(CamNum);
        if (asiRetCode != ASI_SUCCESS)
        {
            printf("*** ERROR: Unable to start video capture: %s\n", getRetCode(asiRetCode));
            closeUp(99);
        }
    }

    while (bMain)
    {
        std::string lastDayOrNight;

        // Find out if it is currently DAY or NIGHT
        calculateDayOrNight(latitude, longitude, angle);

        if (! darkframe)
            currentAdjustGain = resetGainTransitionVariables(asiDayGain, asiNightGain);

        lastDayOrNight = dayOrNight;
        if (darkframe)
        {
                // We're doing dark frames so turn off autoexposure and autogain, and use
                // nightime gain, delay, max exposure, bin, and brightness to mimic a nightime shot.
                currentAutoExposure = ASI_FALSE;
                setControl(CamNum, ASI_EXPOSURE, currentExposure, currentAutoExposure);
                asiNightAutoExposure = 0;
                currentAutoGain = ASI_FALSE;
                // Don't need to set ASI_AUTO_MAX_GAIN since we're not using auto gain
                setControl(CamNum, ASI_GAIN, asiNightGain, ASI_FALSE);
                currentGain = asiNightGain;
        	currentDelay = nightDelay;
                currentExposure = asiNightMaxExposure * US_IN_MS;
                currentBin = nightBin;
                currentBrightness = asiNightBrightness;

                displayDebugText("Taking dark frames...\n", 0);

                if (notificationImages) {
                    system("scripts/copy_notification_image.sh DarkFrames &");
                }
        }

        else if (dayOrNight == "DAY")
        {
            // Setup the daytime capture parameters
            if (endOfNight == true)	// Execute end of night script
            {
                sprintf(textBuffer, "Processing end of night data\n");
                displayDebugText(textBuffer, 0);
                system("scripts/endOfNight.sh &");
                endOfNight = false;
                displayedNoDaytimeMsg = 0;
            }

            if (daytimeCapture != 1)
            {
                // Only display messages once a day.
                if (displayedNoDaytimeMsg == 0) {
                    if (notificationImages) {
                        system("scripts/copy_notification_image.sh CameraOffDuringDay &");
                    }
                    sprintf(textBuffer, "It's daytime... we're not saving images.\n%s\n",
                        tty ? "Press Ctrl+C to stop" : "Stop the allsky service to end this process.");
                    displayDebugText(textBuffer, 0);
		    displayedNoDaytimeMsg = 1;

                    // sleep until almost nighttime, then wake up and sleep a short time
                    int secsTillNight = calculateTimeToNightTime(latitude, longitude, angle);
                    sleep(secsTillNight - 10);
		}
		else
		{
		    // Shouldn't need to sleep more than a few times before nighttime.
		    sleep(5);
		}

                // No need to do any of the code below so go back to the main loop.
                continue;
            }

            else
            {
                sprintf(textBuffer, "==========\n=== Starting daytime capture ===\n==========\n");
                displayDebugText(textBuffer, 0);
                sprintf(textBuffer, "Saving images with delay of %'d ms (%d sec)\n\n", dayDelay, dayDelay / MS_IN_SEC);
                displayDebugText(textBuffer, 0);
#ifdef USE_HISTOGRAM
                // Don't use camera auto exposure since we mimic it ourselves.
                if (asiDayAutoExposure == 1)
                {
                    sprintf(textBuffer, "Turning off daytime auto-exposure to use histogram exposure.\n");
                    displayDebugText(textBuffer, 2);
                    currentAutoExposure = ASI_FALSE;
                }
#else
                currentAutoExposure = asiDayAutoExposure ? ASI_TRUE : ASI_FALSE;
#endif
                currentBrightness = asiDayBrightness;
                currentDelay = dayDelay;
                currentBin = dayBin;

                // If we went from Night to Day, then currentExposure will be the last night
                // exposure so leave it if we're using auto-exposure so there's a seamless change from
                // Night to Day, i.e., if the exposure was fine a minute ago it will likely be fine now.
                // On the other hand, if this program just started or we're using manual exposures,
                // use what the user specified.
                if (numExposures == 0 || asiDayAutoExposure == ASI_FALSE)
                {
                    currentExposure = asiDayExposure;
                }
		else
                {
                    sprintf(textBuffer, "Using last night exposure of %'ld us (%'.2lf ms)\n", currentExposure, (float)currentExposure / US_IN_MS);
                    displayDebugText(textBuffer, 2);
                }
#ifndef USE_HISTOGRAM
                setControl(CamNum, ASI_EXPOSURE, currentExposure, currentAutoExposure);
#endif
                setControl(CamNum, ASI_AUTO_MAX_EXP, cameraMaxAutoExposureUS / US_IN_MS, ASI_FALSE);	// need ms
                currentGain = asiDayGain;	// must come before determineGainChange() below
                if (currentAdjustGain)
                {
                    // we did some nightime images so adjust gain
                    numGainChanges = 0;
                    gainChange = determineGainChange(asiDayGain, asiNightGain);
                }
                else
                {
                    gainChange = 0;
                }
                currentAutoGain = asiDayAutoGain ? ASI_TRUE : ASI_FALSE;
                setControl(CamNum, ASI_GAIN, currentGain + gainChange, currentAutoGain);
                // We don't have a separate asiDayMaxGain, so set to night one
                setControl(CamNum, ASI_AUTO_MAX_GAIN, asiNightMaxGain, ASI_FALSE);
            }
        }

        else	// NIGHT
        {
            sprintf(textBuffer, "==========\n=== Starting nighttime capture ===\n==========\n");
            displayDebugText(textBuffer, 0);

            // Setup the night time capture parameters
            if (asiNightAutoExposure == 1)
            {
                currentAutoExposure = ASI_TRUE;
                setControl(CamNum, ASI_AUTO_MAX_EXP, asiNightMaxExposure, ASI_FALSE);
                printf("Saving auto exposed night images with delay of %'d ms (%d sec)\n\n", nightDelay, nightDelay / MS_IN_SEC);
            }
            else
            {
                currentAutoExposure = ASI_FALSE;
                printf("Saving %ds manual exposure night images with delay of %'d ms (%d sec)\n\n", (int)round(currentExposure / US_IN_SEC), nightDelay, nightDelay / MS_IN_SEC);
            }

            currentBrightness = asiNightBrightness;
            currentDelay = nightDelay;
            currentBin = nightBin;
            if (numExposures == 0 || asiNightAutoExposure == ASI_FALSE)
            {
             	currentExposure = asiNightExposure;
            }
#ifndef USE_HISTOGRAM
            setControl(CamNum, ASI_EXPOSURE, currentExposure, currentAutoExposure);
#endif
            currentGain = asiNightGain;	// must come before determineGainChange() below
            if (currentAdjustGain)
            {
                // we did some daytime images so adjust gain
                numGainChanges = 0;
                gainChange = determineGainChange(asiDayGain, asiNightGain);
            }
            else
            {
                gainChange = 0;
            }
            currentAutoGain = asiNightAutoGain ? ASI_TRUE : ASI_FALSE;
            setControl(CamNum, ASI_GAIN, currentGain + gainChange, currentAutoGain);
            setControl(CamNum, ASI_AUTO_MAX_GAIN, asiNightMaxGain, ASI_FALSE);
        }

        // Adjusting variables for chosen binning
        height    = originalHeight / currentBin;
        width     = originalWidth / currentBin;
        iTextX    = originalITextX / currentBin;
        iTextY    = originalITextY / currentBin;
        fontsize  = originalFontsize / currentBin;
        linewidth = originalLinewidth / currentBin;
        bufferSize = width * height * bytesPerPixel((ASI_IMG_TYPE) Image_type);
        if (numExposures > 0 && dayBin != nightBin)
        {
            // No need to print after first time if the binning didn't change.
            sprintf(debugText, "Buffer size: %ld\n", bufferSize);
            displayDebugText(debugText, 2);
        }

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

        asiRetCode = ASISetROIFormat(CamNum, width, height, currentBin, (ASI_IMG_TYPE)Image_type);
        if (asiRetCode)
        {
			printf("ASISetROIFormat(%d, %dx%d, %d, %d) = %s\n", CamNum, width, height, currentBin, Image_type, getRetCode(asiRetCode));
			closeUp(1);
        }
        setControl(CamNum, ASI_BRIGHTNESS, currentBrightness, ASI_FALSE); // ASI_BRIGHTNESS == ASI_OFFSET

        // Here and below, indent sub-messages with "  > " so it's clear they go with the un-indented line.
        // This simply makes it easier to see things in the log file.

        // As of April 2021 there's a bug that causes the first 3 images to be identical,
        // so take 3 short ones but don't save them.
        // On the ASI178MC the shortest time is 10010 us; it may be higher on other cameras,
        // so use a higher value like 30,000 us to be safe.
        // Only do this once.
        if (numExposures == 0) {
#define SHORT_EXPOSURE 30000
            displayDebugText("===Taking 3 images to clear buffer...\n", 2);
            // turn off auto exposure
            ASI_BOOL savedAutoExposure = currentAutoExposure;
            currentAutoExposure = ASI_FALSE;
            for (i=1; i <= 3; i++)
            {
                // don't count these as "real" exposures, so don't increment numExposures.
                asiRetCode = takeOneExposure(CamNum, SHORT_EXPOSURE, pRgb.data, width, height, (ASI_IMG_TYPE) Image_type);
                if (asiRetCode != ASI_SUCCESS)
                {
                    sprintf(debugText, "buffer clearing exposure %d failed: %s\n", i, getRetCode(asiRetCode));
                    displayDebugText(debugText, 0);
                    numErrors++;
                    sleep(2);	// sometimes sleeping keeps errors from reappearing
                }
            }
            if (numErrors >= maxErrors)
            {
                bMain = false;
                exitCode = 2;
                break;
            }

            // Restore correct exposure times and auto-exposure mode.
            currentAutoExposure = savedAutoExposure;
            setControl(CamNum, ASI_EXPOSURE, currentExposure, currentAutoExposure);
            sprintf(debugText, "...DONE.  Reset exposure to %'ld us\n", currentExposure);
            displayDebugText(debugText, 2);
            // END of bug code
        }

        int mean = 0;

        while (bMain && lastDayOrNight == dayOrNight)
        {
            // date/time is added to many log entries to make it easier to associate them
            // with an image (which has the date/time in the filename).
            timeval t;
	    t = getTimeval();
            char exposureStart[128];
            char f[10] = "%F %T";
            sprintf(exposureStart, "%s", formatTime(t, f));
            sprintf(textBuffer, "STARTING EXPOSURE at: %s\n", exposureStart);
            displayDebugText(textBuffer, 0);

            // Get start time for overlay.  Make sure it has the same time as exposureStart.
            if (showTime == 1)
            	sprintf(bufTime, "%s", formatTime(t, timeFormat));

            asiRetCode = takeOneExposure(CamNum, currentExposure, pRgb.data, width, height, (ASI_IMG_TYPE) Image_type);
            if (asiRetCode == ASI_SUCCESS)
            {
                numErrors = 0;
                numExposures++;

#ifdef USE_HISTOGRAM
                int usedHistogram = 0;	// did we use the histogram method?
                // We don't use this at night since the ZWO bug is only when it's light outside.
                if (dayOrNight == "DAY" && asiDayAutoExposure && ! darkframe && currentExposure <= cameraMaxAutoExposureUS)
                {
                    int minAcceptableHistogram;
                    int maxAcceptableHistogram;
                    int reallyLowMean;
                    int lowMean;
                    int roundToMe;

                    usedHistogram = 1;	// we are using the histogram code on this exposure
                    int histogram[256];
                    computeHistogram(pRgb.data, width, height, (ASI_IMG_TYPE) Image_type, histogram);
                    mean = calculateHistogramMean(histogram);
                    // "last_OK_exposure" is the exposure time of the last OK
                    // image (i.e., mean < 255).
                    // The intent is to keep track of the last OK exposure in case the final
                    // exposure we calculate is no good, we can go back to the last OK one.
                    long last_OK_exposure = currentExposure;

                    int attempts = 0;
                    long newExposure = 0;

                    int minExposure = 100;
                    long tempMinExposure = minExposure;
                    long tempMaxExposure = asiNightMaxExposure *  US_IN_MS;

                    // Got these by trial and error.  They are more-or-less half the max of 255.
                    minAcceptableHistogram = 120;
                    maxAcceptableHistogram = 136;
                    reallyLowMean = 5;
                    lowMean = 15;

                    roundToMe = 5; // round exposures to this many microseconds

                    if (asiDayBrightness != DEFAULT_BRIGHTNESS)
                    {
                        // Adjust brightness based on asiDayBrightness.
                        // The default value has no adjustment.
                        // The only way we can do this easily is via adjusting the exposure.
                        // We could apply a stretch to the image, but that's more difficult.
                        // Sure would be nice to see how ZWO handles this variable.
                        // We asked but got a useless reply.
                        // Values below the default make the image darker; above make it brighter.

                        float exposureAdjustment = 0.0, numMultiples;

                        // Adjustments of DEFAULT_BRIGHTNESS up or down make the image this much darker/lighter.
                        // Don't want the max brightness to give pure white.
                        //xxx May have to play with this number, but it seems to work ok.
                        float adjustmentAmountPerMultiple = 0.12;	// 100 * this number is the percent to change

  			// The amount doesn't change after being set, so only display once.
                        static int showedMessage = 0;
                        if (showedMessage == 0)
                        {
                            // Determine the adjustment amount - only done once.
                            // See how many multiples we're different.
                            // If asiDayBrightnes < DEFAULT_BRIGHTNESS the numMultiples will be negative,
                            // which is ok - it just means the multiplier will be less than 1.
                            numMultiples = (asiDayBrightness - DEFAULT_BRIGHTNESS) / DEFAULT_BRIGHTNESS;
                            exposureAdjustment = 1 + (numMultiples * adjustmentAmountPerMultiple);
  			    sprintf(textBuffer, "  > >>> Adjusting exposure %.1f%% for daybrightness\n", (exposureAdjustment - 1) * 100);
                            displayDebugText(textBuffer, 2);
                            showedMessage = 1;
                        }

                        // Now adjust the variables
                        minExposure *= exposureAdjustment;
                        reallyLowMean *= exposureAdjustment;
                        lowMean *= exposureAdjustment;
                        minAcceptableHistogram *= exposureAdjustment;
                        maxAcceptableHistogram *= exposureAdjustment;
                    }

                    while ((mean < minAcceptableHistogram || mean > maxAcceptableHistogram) && ++attempts <= maxHistogramAttempts)
                    {
                        sprintf(textBuffer, "  > Attempt %i,  current exposure %'ld us,  mean %d,  temp min exposure %ld us,  tempMaxExposure %'ld us", attempts, currentExposure, mean, tempMinExposure, tempMaxExposure);
                         displayDebugText(textBuffer, 2);

			 std::string why;	// Why did we adjust the exposure?  For debugging
			 int num = 0;
                         if (mean >= 254) {
                             newExposure = currentExposure * 0.4;
                             tempMaxExposure = currentExposure - roundToMe;
			     why = "mean >= max";
			     num = 254;
                         }
                         else
                         {
                             //  The code below takes into account how far off we are from an acceptable mean.
                             //  There's probably a simplier way to do this, like adjust by some multiple of
			     //  how far of we are.  That exercise is left to the reader...
                             last_OK_exposure = currentExposure;
                             if (mean < reallyLowMean) {
                                 // The cameras don't appear linear at this low of a level,
                                 // so really crank it up to get into the linear area.
                                 newExposure = currentExposure * 20;
                                 tempMinExposure = currentExposure + roundToMe;
			         why = "mean < reallyLowMean";
			         num = reallyLowMean;
                             }
			     else if (mean < lowMean) {
                                 newExposure = currentExposure * 5;
                                 tempMinExposure = currentExposure + roundToMe;
			         why = "mean < lowMean";
			         num = lowMean;
                             }
                             else if (mean < (minAcceptableHistogram * 0.6))
                             {
                                 newExposure = currentExposure * 2.5;
                                 tempMinExposure = currentExposure + roundToMe;
			         why = "mean < (minAcceptableHistogram * 0.6)";
			         num = minAcceptableHistogram * 0.6;
                             }
                             else if (mean < minAcceptableHistogram)
                             {
                                 newExposure = currentExposure * 1.1;
                                 tempMinExposure = currentExposure + roundToMe;
			         why = "mean < minAcceptableHistogram";
			         num = minAcceptableHistogram;
                             }
                             else if (mean > (maxAcceptableHistogram * 1.6))
                             {
                                 newExposure = currentExposure * 0.7;
                                 tempMaxExposure = currentExposure - roundToMe;
			         why = "mean > (maxAcceptableHistogram * 1.6)";
			         num = (maxAcceptableHistogram * 1.6);
                             }
                             else if (mean > maxAcceptableHistogram)
                             {
                                 newExposure = currentExposure * 0.9;
                                 tempMaxExposure = currentExposure - roundToMe;
			         why = "mean > maxAcceptableHistogram";
			         num = maxAcceptableHistogram;
                             }
                         }

                         newExposure = roundTo(newExposure, roundToMe);
                         newExposure = std::max(tempMinExposure, newExposure);
                         newExposure = std::min(newExposure, tempMaxExposure);
                         newExposure = std::max(tempMinExposure, newExposure);
                         newExposure = std::min(newExposure, cameraMaxAutoExposureUS);

                         sprintf(textBuffer, ",  new exposure %'ld us\n", newExposure);
                         displayDebugText(textBuffer, 2);

                         if (newExposure == currentExposure)
                         {
                             // We can't find a better exposure so stick with this one
                             // or the last OK one.  If the last exposure had a mean >= 254,
                             // use the most recent exposure that was OK.
                             if (mean >= 254 && 0) {	// xxxxxxxxxxxxxxxxxxxx This needs work so disabled
                                 currentExposure = last_OK_exposure;
                                 sprintf(textBuffer, "  > !!! Resetting to last OK exposure of '%ld us\n", currentExposure);
                                 displayDebugText(textBuffer, 2);
                                 takeOneExposure(CamNum, currentExposure, pRgb.data, width, height, (ASI_IMG_TYPE) Image_type);
                                 computeHistogram(pRgb.data, width, height, (ASI_IMG_TYPE) Image_type, histogram);
                                 mean = calculateHistogramMean(histogram);
                             }
                             break;
                         }

                         currentExposure = newExposure;

                         sprintf(textBuffer, "  > !!! Retrying @ %'ld us because '%s (%d)'\n", currentExposure, why.c_str(), num);
                         displayDebugText(textBuffer, 2);
                         takeOneExposure(CamNum, currentExposure, pRgb.data, width, height, (ASI_IMG_TYPE) Image_type);
                         computeHistogram(pRgb.data, width, height, (ASI_IMG_TYPE) Image_type, histogram);
                         mean = calculateHistogramMean(histogram);
                    }
                    if (attempts > maxHistogramAttempts)
                    {
                         sprintf(textBuffer, "  > max attempts reached - using exposure of %'ld us with mean %d\n", currentExposure, mean);
                         displayDebugText(textBuffer, 2);
                    }
                    else if (attempts > 1)
                    {
                         sprintf(textBuffer, "  > Using exposure of %'ld us with mean %d\n", currentExposure, mean);
                         displayDebugText(textBuffer, 2);
                    }
                    else if (attempts == 1)
                    {
                         sprintf(textBuffer, "  > Current exposure of %'ld us with mean %d was ok - no additional attempts needed.\n", currentExposure, mean);
                         displayDebugText(textBuffer, 2);
                    }
                    actualExposureMicroseconds = currentExposure;
                } else {
                    currentExposure = actualExposureMicroseconds;
                }
#endif
                // Write temperature to file
                writeTemperatureToFile((float)actualTemp / 10.0);

                // If darkframe mode is off, add overlay text to the image
                if (! darkframe)
                {
                    int iYOffset = 0;

                    if (showTime == 1)
                    {
                        // The time and ImgText are in the larger font; everything else is in smaller font.
                        cvText(pRgb, bufTime, iTextX, iTextY + (iYOffset / currentBin), fontsize * 0.1, linewidth,
                               linetype[linenumber], fontname[fontnumber], fontcolor, Image_type, outlinefont);
                        iYOffset += iTextLineHeight;
                    }

                    if (ImgText[0] != '\0')
                    {
                        cvText(pRgb, ImgText, iTextX, iTextY + (iYOffset / currentBin), fontsize * 0.1, linewidth,
                               linetype[linenumber], fontname[fontnumber], fontcolor, Image_type, outlinefont);
                        iYOffset+=iTextLineHeight;
                    }


                    if (showTemp == 1)
                    {
                        char C[20] = { 0 }, F[20] = { 0 };
                        if (strcmp(tempType, "C") == 0 || strcmp(tempType, "B") == 0)
			{
			    sprintf(C, "  %.0fC", (float)actualTemp / 10);
			}
                        if (strcmp(tempType, "F") == 0 || strcmp(tempType, "B") == 0)
			{
			    sprintf(F, "  %.0fF", (((float)actualTemp / 10 * 1.8) + 32));
			}
                        sprintf(bufTemp, "Sensor: %s %s", C, F);
                        cvText(pRgb, bufTemp, iTextX, iTextY + (iYOffset / currentBin), fontsize * SMALLFONTSIZE_MULTIPLIER, linewidth,
                               linetype[linenumber], fontname[fontnumber], smallFontcolor, Image_type, outlinefont);
                        iYOffset += iTextLineHeight;
                    }

                    if (showExposure == 1)
                    {
                        // Indicate when the time to take the exposure is less than the reported exposure time
                        if (actualExposureMicroseconds == currentExposure)
                            bufTemp2[0] = '\0';
                        else
                            sprintf(bufTemp2, " actual %'.2lf ms)", (double)actualExposureMicroseconds / US_IN_MS);
                        if (actualExposureMicroseconds >= (1 * US_IN_SEC))  // display in seconds if >= 1 second, else in ms
                            sprintf(bufTemp, "Exposure: %'.2f s%s", (float)currentExposure / US_IN_SEC, bufTemp2);
                        else
                            sprintf(bufTemp, "Exposure: %'.2f ms%s", (float)currentExposure / US_IN_MS, bufTemp2);
                        // Indicate if in auto exposure mode.
                        if (currentAutoExposure == ASI_TRUE) strcat(bufTemp, " (auto)");
                        cvText(pRgb, bufTemp, iTextX, iTextY + (iYOffset / currentBin), fontsize * SMALLFONTSIZE_MULTIPLIER, linewidth,
                               linetype[linenumber], fontname[fontnumber], smallFontcolor, Image_type, outlinefont);
                        iYOffset += iTextLineHeight;
                    }

                    if (showGain == 1)
                    {
                        sprintf(bufTemp, "Gain: %ld", actualGain);

                        // Indicate if in auto gain mode.
                        if (currentAutoGain == ASI_TRUE) strcat(bufTemp, " (auto)");
                        // Indicate if in gain transition mode.
                        if (gainChange != 0)
                        {
                            char x[20];
                            sprintf(x, " (adj: %+d)", gainChange);
                            strcat(bufTemp, x);
                        }

                        cvText(pRgb, bufTemp, iTextX, iTextY + (iYOffset / currentBin), fontsize * SMALLFONTSIZE_MULTIPLIER, linewidth,
                               linetype[linenumber], fontname[fontnumber], smallFontcolor, Image_type, outlinefont);
                        iYOffset += iTextLineHeight;
                    }
                    if (currentAdjustGain)
                    {
                        // Determine if we need to change the gain on the next image.
                        // This must come AFTER the "showGain" above.
                        gainChange = determineGainChange(asiDayGain, asiNightGain);
                        setControl(CamNum, ASI_GAIN, currentGain + gainChange, currentAutoGain);
                    }

                    if (showBrightness == 1)
                    {
                        sprintf(bufTemp, "Brightness: %d", currentBrightness);
                        cvText(pRgb, bufTemp, iTextX, iTextY + (iYOffset / currentBin), fontsize * SMALLFONTSIZE_MULTIPLIER, linewidth,
                           linetype[linenumber], fontname[fontnumber], smallFontcolor, Image_type, outlinefont);
                        iYOffset += iTextLineHeight;
                     }

#ifdef USE_HISTOGRAM
                    if (showHistogram && usedHistogram)
                    {
                        sprintf(bufTemp, "Histogram mean: %d", mean);
                        cvText(pRgb, bufTemp, iTextX, iTextY + (iYOffset / currentBin), fontsize * SMALLFONTSIZE_MULTIPLIER, linewidth,
                        linetype[linenumber], fontname[fontnumber], smallFontcolor, Image_type, outlinefont);
                        iYOffset += iTextLineHeight;
                    }
                    if (showHistogramBox && usedHistogram)
                    {
                        // Draw a rectangle where the histogram box is.

                        int lt = cv::LINE_AA, thickness = 2;
			cv::Point from1, to1, from2, to2;
                        int X1 = (width * histogramBoxPercentFromLeft) - (histogramBoxSizeX / 2);
                        int X2 = X1 + histogramBoxSizeX;
                        int Y1 = (height * histogramBoxPercentFromTop) - (histogramBoxSizeY / 2);
                        int Y2 = Y1 + histogramBoxSizeY;
                        // Put a black and white line one next to each other so they
                        // can be seen in day and night images.
                        // The black line is on the outside; the white on the inside.
                        // cv::line takes care of bytes per pixel.

                        // top lines
			from1 = cv::Point(X1, Y1);
			to1 = cv::Point(X2, Y1);
                        from2 = cv::Point(X1, Y1+thickness);
                        to2 = cv::Point(X2, Y1+thickness);
                        cv::line(pRgb, from1, to1, cv::Scalar(0,0,0), thickness, lt);
                        cv::line(pRgb, from2, to2, cv::Scalar(255,255,255), thickness, lt);

                        // right lines
			from1 = cv::Point(X2, Y1);
			to1 = cv::Point(X2, Y2);
                        from2 = cv::Point(X2-thickness, Y1+thickness);
                        to2 = cv::Point(X2-thickness, Y2-thickness);
                        cv::line(pRgb, from1, to1, cv::Scalar(0,0,0), thickness, lt);
                        cv::line(pRgb, from2, to2, cv::Scalar(255,255,255), thickness, lt);

                        // bottom lines
			from1 = cv::Point(X1, Y2);
			to1 = cv::Point(X2, Y2);
                        from2 = cv::Point(X1, Y2-thickness);
                        to2 = cv::Point(X2, Y2-thickness);
                        cv::line(pRgb, from1, to1, cv::Scalar(0,0,0), thickness, lt);
                        cv::line(pRgb, from2, to2, cv::Scalar(255,255,255), thickness, lt);

                        // left lines
			from1 = cv::Point(X1, Y1);
			to1 = cv::Point(X1, Y2);
                        from2 = cv::Point(X1+thickness, Y1+thickness);
                        to2 = cv::Point(X1+thickness, Y2-thickness);
                        cv::line(pRgb, from1, to1, cv::Scalar(0,0,0), thickness, lt);
                        cv::line(pRgb, from2, to2, cv::Scalar(255,255,255), thickness, lt);
                    }
#endif
                    /**
                     * Display extra text if required. The extra text is read from the provided file. If the
                     * age of the file exceeds the specified limit then the text in the file is not displayed
                     * this is to prevent situations where the code updating the text file stops working.
                     **/
                    if (ImgExtraText[0] != '\0') {
                        bool bUseExtraFile = true;
                        // Display these messages every time, since it's possible the user will correct the
                        // issue while we're running.
                        if (access(ImgExtraText, F_OK ) == -1 ) {
                            bUseExtraFile = false;
                            displayDebugText("  > *** WARNING: Extra Text File Does Not Exist So Ignoring It\n", 1);
                        } else if (access(ImgExtraText, R_OK ) == -1 ) {
                            displayDebugText("  > *** ERROR: Cannot Read From Extra Text File So Ignoring It\n", 1);
                            bUseExtraFile = false;
                        }

                        if (bUseExtraFile) {
                            FILE *fp = fopen(ImgExtraText, "r");

                            if (fp != NULL) {
                                bool bAddExtra = false;
                                if (extraFileAge > 0) {
                                    struct stat buffer;
                                    if (stat(ImgExtraText, &buffer) == 0) {
                                        struct tm modifiedTime = *localtime(&buffer.st_mtime);

                                        time_t now = time(NULL);
                                        double ageInSeconds = difftime(now, mktime(&modifiedTime));
                                        sprintf(textBuffer, "  > Extra Text File (%s) Modified %.1f seconds ago", ImgExtraText, ageInSeconds);
                                        displayDebugText(textBuffer, 1);
                                        if (ageInSeconds < extraFileAge) {
                                            displayDebugText(", so Using It\n", 1);
                                            bAddExtra = true;
                                        } else {
                                            displayDebugText(", so Ignoring\n", 1);
                                        }
                                    } else {
                                        displayDebugText("  > *** ERROR: Stat Of Extra Text File Failed !\n", 0);
                                    }
                                } else {
                                    // xxx Should really only display this once, maybe at program start.
                                    displayDebugText("  > Extra Text File Age Disabled So Displaying Anyway\n", 1);
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

                                        cvText(pRgb, line, iTextX, iTextY + (iYOffset / currentBin), fontsize * SMALLFONTSIZE_MULTIPLIER, linewidth, linetype[linenumber], fontname[fontnumber], smallFontcolor, Image_type, outlinefont);
                                        iYOffset += iTextLineHeight;
                                    }
                                }
                                fclose(fp);
                            } else {
                                displayDebugText("  > *** WARNING: Failed To Open Extra Text File\n", 0);
                            }
                        }
                    }
                }

#ifndef USE_HISTOGRAM
                if (currentAutoExposure == ASI_TRUE)
                {
                    // Retrieve the current Exposure for smooth transition to night time
                    // as long as auto-exposure is enabled during night time
                    currentExposure = actualExposureMicroseconds;
                }
#endif

                // Save the image
                if (bSavingImg == false)
                {
                    sprintf(textBuffer, "  > Saving image '%s' that started at %s", fileName, exposureStart);
                    displayDebugText(textBuffer, 0);

                    pthread_mutex_lock(&mtx_SaveImg);
                    // Display the time it took to save an image, for debugging.
                    int64 st = cv::getTickCount();
                    pthread_cond_signal(&cond_SatrtSave);
                    int64 et = cv::getTickCount();
                    pthread_mutex_unlock(&mtx_SaveImg);

                    sprintf(textBuffer, "  (%.0f us)\n", timeDiff(st, et));
                    displayDebugText(textBuffer, 0);
                }
                else
                {
                    // Hopefully the user can use the time it took to save a file to disk
                    // to help determine why they are getting this warning.
                    // Perhaps their disk is very slow or their delay is too short.
                    sprintf(textBuffer, "  > WARNING: currently saving an image; can't save new one at %s.\n", exposureStart);
                    displayDebugText(textBuffer, 0);
                }

                if (asiNightAutoGain == 1 && dayOrNight == "NIGHT" && ! darkframe)
                {
                    ASIGetControlValue(CamNum, ASI_GAIN, &actualGain, &bAuto);
                    sprintf(textBuffer, "  > Auto Gain value: %ld\n", actualGain);
                    displayDebugText(textBuffer, 1);
                    writeToLog((int)actualGain);
                }

                if (currentAutoExposure == ASI_TRUE)
                {
#ifndef USE_HISTOGRAM
                    writeToLog((int)actualExposureMicroseconds);

                    if (dayOrNight == "DAY")
                    {
                        currentExposure = actualExposureMicroseconds;
                    }
#endif

                    // Delay applied before next exposure
                    if (dayOrNight == "NIGHT" && asiNightAutoExposure == 1 && actualExposureMicroseconds < (asiNightMaxExposure * US_IN_MS) && ! darkframe)
                    {
                        // If using auto-exposure and the actual exposure is less than the max,
                        // we still wait until we reach maxexposure, then wait for the delay period.
                        // This is important for a constant frame rate during timelapse generation.
                        // This doesn't apply during the day since we don't have a max time then.
                        int s = (asiNightMaxExposure * US_IN_MS) - actualExposureMicroseconds; // to get to max
                        s += currentDelay * US_IN_MS;   // Add standard delay amount
                        sprintf(textBuffer,"  > Sleeping: %'d ms\n", s / US_IN_MS);
                        displayDebugText(textBuffer, 0);
                        usleep(s);	// usleep() is in microseconds
                    }
                    else
                    {
                        // Sleep even if taking dark frames so the sensor can cool between shots like it would
                        // do on a normal night.  With no delay the sensor may get hotter than it would at night.
                        sprintf(textBuffer,"  > Sleeping from %s exposure: %'d ms (%.0f sec)\n", darkframe ? "dark frame" : "auto", currentDelay, (float)currentDelay/US_IN_MS);
                        displayDebugText(textBuffer, 0);
                        usleep(currentDelay * US_IN_MS);
                    }
                }
                else
                {
                    std::string s;
		    if (darkframe)
                        s = "dark frame";
		    else
                        s = "manual";
#ifdef USE_HISTOGRAM
                    if (usedHistogram == 1)
                        s = "histogram";
#endif
                    sprintf(textBuffer,"  > Sleeping from %s exposure: %'d ms\n", s.c_str(), currentDelay);
                    displayDebugText(textBuffer, 0);
                    usleep(currentDelay * US_IN_MS);
                }
                calculateDayOrNight(latitude, longitude, angle);

            } else {
                // Once takeOneExposure() fails with a timeout, it seems to always fail,
                // even with extremely large timeout values, so apparently ASI_ERROR_TIMEOUT doesn't
                // necessarily mean it's timing out.  I think it means the camera went away,
                // so exit which will cause us to be restarted.
                numErrors++; sleep(2);
                if (numErrors >= maxErrors)
                {
                    bMain = false;  // get out of inner and outer loop
                    exitCode = 2;
                }
            }
        }
        if (lastDayOrNight == "NIGHT")
        {
            endOfNight = true;
        }
    }

    closeUp(exitCode);
}
