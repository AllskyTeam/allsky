#include <opencv2/core/core.hpp>
#include <opencv2/imgproc/imgproc.hpp>
#include <opencv2/highgui/highgui.hpp>
#include "include/ASICamera2.h"
#include <sys/time.h>
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

#define KNRM "\x1B[0m"
#define KRED "\x1B[31m"
#define KGRN "\x1B[32m"
#define KYEL "\x1B[33m"
#define KBLU "\x1B[34m"
#define KMAG "\x1B[35m"
#define KCYN "\x1B[36m"
#define KWHT "\x1B[37m"

//-------------------------------------------------------------------------------------------------------
//-------------------------------------------------------------------------------------------------------

cv::Mat pRgb;
char nameCnt[128];
char const *fileName = "image.jpg";
std::vector<int> compression_parameters;
bool bMain = true, bDisplay = false;
std::string dayOrNight;

bool bSaveRun = false, bSavingImg = false;
pthread_mutex_t mtx_SaveImg;
pthread_cond_t cond_SatrtSave;

//-------------------------------------------------------------------------------------------------------
//-------------------------------------------------------------------------------------------------------

void cvText(cv::Mat &img, const char *text, int x, int y, double fontsize, int linewidth, int linetype, int fontname,
            int fontcolor[], int imgtype, int outlinefont)
{
    if (imgtype == ASI_IMG_RAW16)
    {
        if (outlinefont)
            cv::putText(img, text, cvPoint(x, y), fontname, fontsize, cvScalar(0,0,0), linewidth+4, linetype);
        cv::putText(img, text, cvPoint(x, y), fontname, fontsize, cvScalar(fontcolor[0], fontcolor[1], fontcolor[2]),
                    linewidth, linetype);
    }
    else
    {
        if (outlinefont)
            cv::putText(img, text, cvPoint(x, y), fontname, fontsize, cvScalar(0,0,0, 255), linewidth+4, linetype);
        cv::putText(img, text, cvPoint(x, y), fontname, fontsize,
                    cvScalar(fontcolor[0], fontcolor[1], fontcolor[2], 255), linewidth, linetype);
    }
}

char *getTime()
{
    static int seconds_last = 99;
    static char TimeString[128];
    timeval curTime;
    gettimeofday(&curTime, NULL);
    if (seconds_last == curTime.tv_sec)
    {
        return 0;
    }

    seconds_last = curTime.tv_sec;
    strftime(TimeString, 80, "%Y%m%d %H:%M:%S", localtime(&curTime.tv_sec));
    return TimeString;
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
    cv::Mat *pImg = (cv::Mat *)params;
    cvNamedWindow("video", 1);
    while (bDisplay)
    {
        cvShowImage("video", pImg);
        cvWaitKey(100);
    }
    cvDestroyWindow("video");
    printf("Display thread over\n");
    return (void *)0;
}

void *SaveImgThd(void *para)
{
    while (bSaveRun)
    {
        pthread_mutex_lock(&mtx_SaveImg);
        pthread_cond_wait(&cond_SatrtSave, &mtx_SaveImg);
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
        }
        bSavingImg = false;
        pthread_mutex_unlock(&mtx_SaveImg);
    }

    printf("save thread over\n");
    return (void *)0;
}

void IntHandle(int i)
{
    bMain = false;
}

void calculateDayOrNight(const char *latitude, const char *longitude, const char *angle)
{
    char sunwaitCommand[128];
    sprintf(sunwaitCommand, "sunwait poll exit set angle %s %s %s", angle, latitude, longitude);
    dayOrNight = exec(sunwaitCommand);
    dayOrNight.erase(std::remove(dayOrNight.begin(), dayOrNight.end(), '\n'), dayOrNight.end());
}

void writeToLog(int val)
{
    std::ofstream outfile;
    outfile.open("log.txt", std::ios_base::app);
    outfile << val;
    outfile << "\n";
}

//-------------------------------------------------------------------------------------------------------
//-------------------------------------------------------------------------------------------------------

int main(int argc, char *argv[])
{
    signal(SIGINT, IntHandle);
    pthread_mutex_init(&mtx_SaveImg, 0);
    pthread_cond_init(&cond_SatrtSave, 0);

    int fontname[] = { CV_FONT_HERSHEY_SIMPLEX,        CV_FONT_HERSHEY_PLAIN,         CV_FONT_HERSHEY_DUPLEX,
                       CV_FONT_HERSHEY_COMPLEX,        CV_FONT_HERSHEY_TRIPLEX,       CV_FONT_HERSHEY_COMPLEX_SMALL,
                       CV_FONT_HERSHEY_SCRIPT_SIMPLEX, CV_FONT_HERSHEY_SCRIPT_COMPLEX };
    int fontnumber = 0;
    int iStrLen, iTextX = 15, iTextY = 25;
    char const *ImgText   = "";
    double fontsize       = 0.6;
    int linewidth         = 1;
    int outlinefont       = 0;
    int fontcolor[3]      = { 255, 0, 0 };
    int smallFontcolor[3] = { 0, 0, 255 };
    int linetype[3]       = { CV_AA, 8, 4 };
    int linenumber        = 0;

    char buf[1024]    = { 0 };
    char bufTime[128] = { 0 };
    char bufTemp[128] = { 0 };

    int width             = 0;
    int height            = 0;
    int bin               = 1;
    int Image_type        = 1;
    int asiBandwidth      = 40;
    int asiExposure       = 5000000;
    int asiMaxExposure    = 10000;
    int asiAutoExposure   = 0;
    int asiGain           = 150;
    int asiMaxGain        = 200;
    int asiAutoGain       = 0;
    int delay             = 10;   // Delay in milliseconds. Default is 10ms
    int daytimeDelay      = 5000; // Delay in milliseconds. Default is 5000ms
    int asiWBR            = 65;
    int asiWBB            = 85;
    int asiGamma          = 50;
    int asiBrightness     = 50;
    int asiFlip           = 0;
    int asiCoolerEnabled  = 0;
    long asiTargetTemp    = 0;
    char const *latitude  = "60.7N"; //GPS Coordinates of Whitehorse, Yukon where the code was created
    char const *longitude = "135.05W";
    char const *angle  = "-6"; // angle of the sun with the horizon (0=sunset, -6=civil twilight, -12=nautical twilight, -18=astronomical twilight)
    int preview        = 0;
    int time           = 1;
    int darkframe      = 0;
    int showDetails    = 0;
    int daytimeCapture = 0;
    int help           = 0;
    int quality        = 200;

    char const *bayer[] = { "RG", "BG", "GR", "GB" };
    int CamNum          = 0;
    int i;
    void *retval;
    bool endOfNight    = false;
    pthread_t hthdSave = 0;

    //-------------------------------------------------------------------------------------------------------
    //-------------------------------------------------------------------------------------------------------
    printf("\n");
    printf("%s ******************************************\n", KGRN);
    printf("%s *** Allsky Camera Software v0.6 | 2019 ***\n", KGRN);
    printf("%s ******************************************\n\n", KGRN);
    printf("\%sCapture images of the sky with a Raspberry Pi and an ASI Camera\n", KGRN);
    printf("\n");
    printf("%sAdd -h or -help for available options \n", KYEL);
    printf("\n");
    printf("\%sAuthor: ", KNRM);
    printf("Thomas Jacquin - <jacquin.thomas@gmail.com>\n\n");
    printf("\%sContributors:\n", KNRM);
    printf("-Knut Olav Klo\n");
    printf("-Daniel Johnsen\n");
    printf("-Yang and Sam from ZWO\n");
    printf("-Robert Wagner\n");
    printf("-Michael J. Kidd - <linuxkidd@gmail.com>\n\n");

    if (argc > 0)
    {
        for (i = 0; i < argc - 1; i++)
        {
            if (strcmp(argv[i], "-h") == 0 || strcmp(argv[i], "-help") == 0)
            {
                help = atoi(argv[i + 1]);
                i++;
            }
            else if (strcmp(argv[i], "-width") == 0)
            {
                width = atoi(argv[i + 1]);
                i++;
            }
            else if (strcmp(argv[i], "-height") == 0)
            {
                height = atoi(argv[i + 1]);
                i++;
            }
            else if (strcmp(argv[i], "-type") == 0)
            {
                Image_type = atoi(argv[i + 1]);
                i++;
            }
            else if (strcmp(argv[i], "-quality") == 0)
            {
                quality = atoi(argv[i + 1]);
                i++;
            }
            else if (strcmp(argv[i], "-exposure") == 0)
            {
                asiExposure = atoi(argv[i + 1]) * 1000;
                i++;
            }
            else if (strcmp(argv[i], "-maxexposure") == 0)
            {
                asiMaxExposure = atoi(argv[i + 1]);
                i++;
            }
            else if (strcmp(argv[i], "-autoexposure") == 0)
            {
                asiAutoExposure = atoi(argv[i + 1]);
                i++;
            }
            else if (strcmp(argv[i], "-gain") == 0)
            {
                asiGain = atoi(argv[i + 1]);
                i++;
            }
            else if (strcmp(argv[i], "-maxgain") == 0)
            {
                asiMaxGain = atoi(argv[i + 1]);
                i++;
            }
            else if (strcmp(argv[i], "-autogain") == 0)
            {
                asiAutoGain = atoi(argv[i + 1]);
                i++;
            }
            else if (strcmp(argv[i], "-gamma") == 0)
            {
                asiGamma = atoi(argv[i + 1]);
                i++;
            }
            else if (strcmp(argv[i], "-brightness") == 0)
            {
                asiBrightness = atoi(argv[i + 1]);
                i++;
            }
            else if (strcmp(argv[i], "-bin") == 0)
            {
                bin = atoi(argv[i + 1]);
                i++;
            }
            else if (strcmp(argv[i], "-delay") == 0)
            {
                delay = atoi(argv[i + 1]);
                i++;
            }
            else if (strcmp(argv[i], "-daytimeDelay") == 0)
            {
                daytimeDelay = atoi(argv[i + 1]);
                i++;
            }
            else if (strcmp(argv[i], "-wbr") == 0)
            {
                asiWBR = atoi(argv[i + 1]);
                i++;
            }
            else if (strcmp(argv[i], "-wbb") == 0)
            {
                asiWBB = atoi(argv[i + 1]);
                i++;
            }
            else if (strcmp(argv[i], "-text") == 0)
            {
                ImgText = (argv[i + 1]);
                i++;
            }
            else if (strcmp(argv[i], "-textx") == 0)
            {
                iTextX = atoi(argv[i + 1]);
                i++;
            }
            else if (strcmp(argv[i], "-texty") == 0)
            {
                iTextY = atoi(argv[i + 1]);
                i++;
            }
            else if (strcmp(argv[i], "-fontname") == 0)
            {
                fontnumber = atoi(argv[i + 1]);
                i++;
            }
            else if (strcmp(argv[i], "-fontcolor") == 0)
            {
                fontcolor[0] = atoi(argv[i + 1]);
                i++;
                fontcolor[1] = atoi(argv[i + 1]);
                i++;
                fontcolor[2] = atoi(argv[i + 1]);
                i++;
            }
            else if (strcmp(argv[i], "-smallfontcolor") == 0)
            {
                smallFontcolor[0] = atoi(argv[i + 1]);
                i++;
                smallFontcolor[1] = atoi(argv[i + 1]);
                i++;
                smallFontcolor[2] = atoi(argv[i + 1]);
                i++;
            }
            else if (strcmp(argv[i], "-fonttype") == 0)
            {
                linenumber = atoi(argv[i + 1]);
                i++;
            }
            else if (strcmp(argv[i], "-fontsize") == 0)
            {
                fontsize = atof(argv[i + 1]);
                i++;
            }
            else if (strcmp(argv[i], "-fontline") == 0)
            {
                linewidth = atoi(argv[i + 1]);
                i++;
            }
            else if (strcmp(argv[i], "-outlinefont") == 0)
            {
                outlinefont = atoi(argv[i + 1]);
				if (outlinefont != 0)
				    outlinefont = 1;
                i++;
            }
            else if (strcmp(argv[i], "-flip") == 0)
            {
                asiFlip = atoi(argv[i + 1]);
                i++;
            }
            else if (strcmp(argv[i], "-usb") == 0)
            {
                asiBandwidth = atoi(argv[i + 1]);
                i++;
            }
            else if (strcmp(argv[i], "-filename") == 0)
            {
                fileName = (argv[i + 1]);
                i++;
            }
            else if (strcmp(argv[i], "-latitude") == 0)
            {
                latitude = argv[i + 1];
                i++;
            }
            else if (strcmp(argv[i], "-longitude") == 0)
            {
                longitude = argv[i + 1];
                i++;
            }
            else if (strcmp(argv[i], "-angle") == 0)
            {
                angle = argv[i + 1];
                i++;
            }
            else if (strcmp(argv[i], "-preview") == 0)
            {
                preview = atoi(argv[i + 1]);
                i++;
            }
            else if (strcmp(argv[i], "-time") == 0)
            {
                time = atoi(argv[i + 1]);
                i++;
            }
            else if (strcmp(argv[i], "-darkframe") == 0)
            {
                darkframe = atoi(argv[i + 1]);
                i++;
            }
            else if (strcmp(argv[i], "-showDetails") == 0)
            {
                showDetails = atoi(argv[i + 1]);
                i++;
            }
            else if (strcmp(argv[i], "-daytime") == 0)
            {
                daytimeCapture = atoi(argv[i + 1]);
                i++;
            }
	    else if (strcmp(argv[i], "-coolerEnabled") == 0)
            {
                asiCoolerEnabled = atoi(argv[i + 1]);
                i++;
            }
	    else if (strcmp(argv[i], "-targetTemp") == 0)
            {
                asiTargetTemp = atol(argv[i + 1]);
                i++;
            }
        }
    }

    if (help == 1)
    {
        printf("%sAvailable Arguments: \n", KYEL);
        printf(" -width                             - Default = Camera Max Width \n");
        printf(" -height                            - Default = Camera Max Height \n");
        printf(" -exposure                          - Default = 5000000 - Time in µs (equals to 5 sec) \n");
        printf(" -maxexposure                       - Default = 10000 - Time in ms (equals to 10 sec) \n");
        printf(" -autoexposure                      - Default = 0 - Set to 1 to enable auto Exposure \n");
        printf(" -gain                              - Default = 50 \n");
        printf(" -maxgain                           - Default = 200 \n");
        printf(" -autogain                          - Default = 0 - Set to 1 to enable auto Gain \n");
        printf(" -coolerEnabled                     - Set to 1 to enable cooler (works on cooled cameras only) \n");
        printf(" -targetTemp                        - Target temperature in degrees C (works on cooled cameras only) \n");
	printf(" -gamma                             - Default = 50 \n");
        printf(" -brightness                        - Default = 50 \n");
        printf(" -wbr                               - Default = 50   - White Balance Red \n");
        printf(" -wbb                               - Default = 50   - White Balance Blue \n");
        printf(" -bin                               - Default = 1    - 1 = binning OFF (1x1), 2 = 2x2 binning, 4 = 4x4 "
               "binning\n");
        printf(" -delay                             - Default = 10   - Delay between images in milliseconds - 1000 = 1 "
               "sec.\n");
        printf(" -daytimeDelay                      - Default = 5000   - Delay between images in milliseconds - 5000 = "
               "5 sec.\n");
        printf(" -type = Image Type                 - Default = 0    - 0 = RAW8,  1 = RGB24,  2 = RAW16 \n");
        printf(" -quality                           - Default PNG=3, JPG=95, Values: PNG=0-9, JPG=0-100\n");
        printf(" -usb = USB Speed                   - Default = 40   - Values between 40-100, This is "
               "BandwidthOverload \n");
        printf(" -filename                          - Default = IMAGE.PNG \n");
        printf(" -flip                              - Default = 0    - 0 = Orig, 1 = Horiz, 2 = Verti, 3 = Both\n");
        printf("\n");
        printf(" -text                              - Default =      - Character/Text Overlay. Use Quotes.  Ex. -c "
               "\"Text Overlay\"\n");
        printf(
            " -textx                             - Default = 15   - Text Placement Horizontal from LEFT in Pixels\n");
        printf(" -texty = Text Y                    - Default = 25   - Text Placement Vertical from TOP in Pixels\n");
        printf(" -fontname = Font Name              - Default = 0    - Font Types (0-7), Ex. 0 = simplex, 4 = triplex, "
               "7 = script\n");
        printf(" -fontcolor = Font Color            - Default = 255 0 0  - Text blue (BGR)\n");
        printf(" -smallfontcolor = Small Font Color - Default = 0 0 255  - Text red (BGR)\n");
        printf(" -fonttype = Font Type              - Default = 0    - Font Line Type,(0-2), 0 = AA, 1 = 8, 2 = 4\n");
        printf(" -fontsize                          - Default = 0.5  - Text Font Size\n");
        printf(" -fontline                          - Default = 1    - Text Font Line Thickness\n");
        //printf(" -bgc = BG Color                    - Default =      - Text Background Color in Hex. 00ff00 = Green\n");
        //printf(" -bga = BG Alpha                    - Default =      - Text Background Color Alpha/Transparency 0-100\n");
        printf("\n");
        printf("\n");
        printf(" -latitude                          - Default = 60.7N (Whitehorse)   - Latitude of the camera.\n");
        printf(" -longitude                         - Default = 135.05W (Whitehorse) - Longitude of the camera\n");
        printf(" -angle                             - Default = -6 - Angle of the sun below the horizon. -6=civil "
               "twilight, -12=nautical twilight, -18=astronomical twilight\n");
        printf("\n");
        printf(" -preview                           - set to 1 to preview the captured images. Only works with a "
               "Desktop Environment \n");
        printf(" -time                              - Adds the time to the image. Combine with Text X and Text Y for "
               "placement \n");
        printf(" -darkframe                         - Set to 1 to disable time and text overlay \n");
        printf(" -showDetails                       - Set to 1 to display the metadata on the image \n");

        printf("%sUsage:\n", KRED);
        printf(" ./capture -width 640 -height 480 -exposure 5000000 -gamma 50 -type 1 -bin 1 -filename "
               "Lake-Laberge.PNG\n\n");
    }
    printf("%s", KNRM);

    const char *ext = strrchr(fileName, '.');
    if (strcmp(ext + 1, "jpg") == 0 || strcmp(ext + 1, "JPG") == 0 || strcmp(ext + 1, "jpeg") == 0 ||
        strcmp(ext + 1, "JPEG") == 0)
    {
        compression_parameters.push_back(CV_IMWRITE_JPEG_QUALITY);
        if (quality == 200)
        {
            quality = 95;
        }
    }
    else
    {
        compression_parameters.push_back(CV_IMWRITE_PNG_COMPRESSION);
        if (quality == 200)
        {
            quality = 3;
        }
    }
    compression_parameters.push_back(quality);

    int numDevices = ASIGetNumOfConnectedCameras();
    if (numDevices <= 0)
    {
        printf("\nNo Connected Camera...\n");
        width  = 1; //Set to 1 when NO Cameras are connected to avoid error: OpenCV Error: Insufficient memory
        height = 1; //Set to 1 when NO Cameras are connected to avoid error: OpenCV Error: Insufficient memory
    }
    else
    {
        printf("\nListing Attached Cameras:\n");
    }

    ASI_CAMERA_INFO ASICameraInfo;

    for (i = 0; i < numDevices; i++)
    {
        ASIGetCameraProperty(&ASICameraInfo, i);
        printf("- %d %s\n", i, ASICameraInfo.Name);
    }

    if (ASIOpenCamera(CamNum) != ASI_SUCCESS)
    {
        printf("Open Camera ERROR, Check that you have root permissions!\n");
    }

    printf("\n%s Information:\n", ASICameraInfo.Name);
    int iMaxWidth, iMaxHeight;
    double pixelSize;
    iMaxWidth  = ASICameraInfo.MaxWidth;
    iMaxHeight = ASICameraInfo.MaxHeight;
    pixelSize  = ASICameraInfo.PixelSize;
    printf("- Resolution:%dx%d\n", iMaxWidth, iMaxHeight);
    printf("- Pixel Size: %1.1fμm\n", pixelSize);
    printf("- Supported Bin: ");
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
        printf("- Color Camera: bayer pattern:%s\n", bayer[ASICameraInfo.BayerPattern]);
    }
    else
    {
        printf("- Mono camera\n");
    }
    if (ASICameraInfo.IsCoolerCam)
    {
        printf("- Camera with cooling capabilities\n");
    }

    const char *ver = ASIGetSDKVersion();
    printf("- SDK version %s\n", ver);

    if (ASIInitCamera(CamNum) == ASI_SUCCESS)
    {
        printf("- Initialise Camera OK\n");
    }
    else
    {
        printf("- Initialise Camera ERROR\n");
    }

    ASI_CONTROL_CAPS ControlCaps;
    int iNumOfCtrl = 0;
    ASIGetNumOfControls(CamNum, &iNumOfCtrl);
    for (i = 0; i < iNumOfCtrl; i++)
    {
        ASIGetControlCaps(CamNum, i, &ControlCaps);
        //printf("- %s\n", ControlCaps.Name);
    }

    if (width == 0 || height == 0)
    {
        width  = iMaxWidth;
        height = iMaxHeight;
    }

    long ltemp     = 0;
    ASI_BOOL bAuto = ASI_FALSE;
    ASIGetControlValue(CamNum, ASI_TEMPERATURE, &ltemp, &bAuto);
    printf("- Sensor temperature:%02f\n", (float)ltemp / 10.0);

    // Adjusting variables for chosen binning
    height    = height / bin;
    width     = width / bin;
    iTextX    = iTextX / bin;
    iTextY    = iTextY / bin;
    fontsize  = fontsize / bin;
    linewidth = linewidth / bin;

    const char *sType;
    if (Image_type == ASI_IMG_RAW16)
    {
        sType = "ASI_IMG_RAW16";
        pRgb.create(cvSize(width, height), CV_16UC1);
    }
    else if (Image_type == ASI_IMG_RGB24)
    {
        sType = "ASI_IMG_RGB24";
        pRgb.create(cvSize(width, height), CV_8UC3);
    }
    else
    {
        sType = "ASI_IMG_RAW8";
        pRgb.create(cvSize(width, height), CV_8UC1);
    }

    if (Image_type != ASI_IMG_RGB24 && Image_type != ASI_IMG_RAW16)
    {
        iStrLen     = strlen(buf);
        CvRect rect = cvRect(iTextX, iTextY - 15, iStrLen * 11, 20);
        cv::Mat roi = pRgb(rect);
        roi.setTo(cv::Scalar(180, 180, 180));
    }

    //-------------------------------------------------------------------------------------------------------
    //-------------------------------------------------------------------------------------------------------

    printf("%s", KGRN);
    printf("\nCapture Settings: \n");
    printf(" Image Type: %s\n", sType);
    printf(" Resolution: %dx%d \n", width, height);
    printf(" Quality: %d \n", quality);
    printf(" Exposure: %1.0fms\n", round(asiExposure / 1000));
    printf(" Max Exposure: %dms\n", asiMaxExposure);
    printf(" Auto Exposure: %d\n", asiAutoExposure);
    printf(" Gain: %d\n", asiGain);
    printf(" Max Gain: %d\n", asiMaxGain);
    printf(" Cooler Enabled: %d\n", asiCoolerEnabled);
    printf(" Target Temperature: %ldC\n", asiTargetTemp);
    printf(" Auto Gain: %d\n", asiAutoGain);
    printf(" Brightness: %d\n", asiBrightness);
    printf(" Gamma: %d\n", asiGamma);
    printf(" WB Red: %d\n", asiWBR);
    printf(" WB Blue: %d\n", asiWBB);
    printf(" Binning: %d\n", bin);
    printf(" Delay: %dms\n", delay);
    printf(" Daytime Delay: %dms\n", daytimeDelay);
    printf(" USB Speed: %d\n", asiBandwidth);
    printf(" Text Overlay: %s\n", ImgText);
    printf(" Text Position: %dpx left, %dpx top\n", iTextX, iTextY);
    printf(" Font Name:  %d\n", fontname[fontnumber]);
    printf(" Font Color: %d , %d, %d\n", fontcolor[0], fontcolor[1], fontcolor[2]);
    printf(" Small Font Color: %d , %d, %d\n", smallFontcolor[0], smallFontcolor[1], smallFontcolor[2]);
    printf(" Font Line Type: %d\n", linetype[linenumber]);
    printf(" Font Size: %1.1f\n", fontsize);
    printf(" Font Line: %d\n", linewidth);
    printf(" Outline Font : %d\n", outlinefont);
    printf(" Flip Image: %d\n", asiFlip);
    printf(" Filename: %s\n", fileName);
    printf(" Latitude: %s\n", latitude);
    printf(" Longitude: %s\n", longitude);
    printf(" Sun Elevation: %s\n", angle);
    printf(" Preview: %d\n", preview);
    printf(" Time: %d\n", time);
    printf(" Darkframe: %d\n", darkframe);
    printf(" Show Details: %d\n", showDetails);
    printf("%s", KNRM);

    ASISetROIFormat(CamNum, width, height, bin, (ASI_IMG_TYPE)Image_type);

    //-------------------------------------------------------------------------------------------------------
    //-------------------------------------------------------------------------------------------------------
    ASISetControlValue(CamNum, ASI_TEMPERATURE, 50 * 1000, ASI_FALSE);
    ASISetControlValue(CamNum, ASI_BANDWIDTHOVERLOAD, asiBandwidth, ASI_FALSE);
    ASISetControlValue(CamNum, ASI_EXPOSURE, asiExposure, asiAutoExposure == 1 ? ASI_TRUE : ASI_FALSE);
    ASISetControlValue(CamNum, ASI_AUTO_MAX_EXP, asiMaxExposure, ASI_FALSE);
    ASISetControlValue(CamNum, ASI_GAIN, asiGain, asiAutoGain == 1 ? ASI_TRUE : ASI_FALSE);
    ASISetControlValue(CamNum, ASI_AUTO_MAX_GAIN, asiMaxGain, ASI_FALSE);
    ASISetControlValue(CamNum, ASI_WB_R, asiWBR, ASI_FALSE);
    ASISetControlValue(CamNum, ASI_WB_B, asiWBB, ASI_FALSE);
    ASISetControlValue(CamNum, ASI_GAMMA, asiGamma, ASI_FALSE);
    ASISetControlValue(CamNum, ASI_BRIGHTNESS, asiBrightness, ASI_FALSE);
    ASISetControlValue(CamNum, ASI_FLIP, asiFlip, ASI_FALSE);
    if (ASICameraInfo.IsCoolerCam)
    {
        ASI_ERROR_CODE err = ASISetControlValue(CamNum, ASI_COOLER_ON, asiCoolerEnabled == 1 ? ASI_TRUE : ASI_FALSE, ASI_FALSE);
	if (err != ASI_SUCCESS)
	{
		printf("%s", KRED);
		printf(" Could not enable cooler\n");
		printf("%s", KNRM);
	}
	err = ASISetControlValue(CamNum, ASI_TARGET_TEMP, asiTargetTemp, ASI_FALSE);
	if (err != ASI_SUCCESS)
        {
                printf("%s", KRED);
                printf(" Could not set cooler temperature\n");
                printf("%s", KNRM);
        }
    }

    pthread_t thread_display = 0;
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
    int currentExposure = asiExposure;
    int exp_ms          = 0;
    long autoGain       = 0;
    long autoExp        = 0;
    int useDelay        = 0;

    while (bMain)
    {
        bool needCapture = true;
        std::string lastDayOrNight;
        int captureTimeout = -1;

        // Find out if it is currently DAY or NIGHT
        calculateDayOrNight(latitude, longitude, angle);

        lastDayOrNight = dayOrNight;
        printf("\n");
        if (dayOrNight == "DAY")
        {
            // Setup the daytime capture parameters
            if (endOfNight == true)
            {
                system("scripts/endOfNight.sh &");
                endOfNight = false;
            }
            if (daytimeCapture != 1)
            {
                needCapture = false;
                printf("It's daytime... we're not saving images\n");
                usleep(daytimeDelay * 1000);
            }
            else
            {
                printf("Starting daytime capture\n");
                printf("Saving auto exposed images every %d ms\n\n", daytimeDelay);
                exp_ms         = 32;
                useDelay       = daytimeDelay;
                captureTimeout = exp_ms <= 100 ? 200 : exp_ms * 2;
                ASISetControlValue(CamNum, ASI_EXPOSURE, exp_ms, ASI_TRUE);
                ASISetControlValue(CamNum, ASI_GAIN, 0, ASI_FALSE);
            }
        }
        else if (dayOrNight == "NIGHT")
        {
            // Setup the night time capture parameters
            if (asiAutoExposure == 1)
            {
                printf("Saving auto exposed images every %d ms\n\n", delay);
            }
            else
            {
                printf("Saving %ds exposure images every %d ms\n\n", (int)round(currentExposure / 1000000), delay);
            }
            // Set exposure value for night time capture
            useDelay = delay;
	    ASISetControlValue(CamNum, ASI_EXPOSURE, currentExposure, asiAutoExposure == 1 ? ASI_TRUE : ASI_FALSE);
            ASISetControlValue(CamNum, ASI_GAIN, asiGain, asiAutoGain == 1 ? ASI_TRUE : ASI_FALSE);
        }
        printf("Press Ctrl+C to stop\n\n");

        if (needCapture)
        {
            ASIStartVideoCapture(CamNum);
            while (bMain && lastDayOrNight == dayOrNight)
            {
                if (ASIGetVideoData(CamNum, pRgb.data, pRgb.step[0] * pRgb.rows, captureTimeout) == ASI_SUCCESS)
                {
                    // Read current camera parameters
                    ASIGetControlValue(CamNum, ASI_EXPOSURE, &autoExp, &bAuto);
                    ASIGetControlValue(CamNum, ASI_GAIN, &autoGain, &bAuto);
                    ASIGetControlValue(CamNum, ASI_TEMPERATURE, &ltemp, &bAuto);

                    // Get Current Time for overlay
                    sprintf(bufTime, "%s", getTime());

                    if (darkframe != 1)
                    {
                        // If darkframe mode is off, add overlay text to the image
                        int iYOffset = 0;
                        //cvText(pRgb, ImgText, iTextX, iTextY+(iYOffset/bin), fontsize, linewidth, linetype[linenumber], fontname[fontnumber], fontcolor, Image_type);
                        //iYOffset+=30;
                        if (time == 1)
                        {
                            cvText(pRgb, bufTime, iTextX, iTextY + (iYOffset / bin), fontsize, linewidth,
                                   linetype[linenumber], fontname[fontnumber], fontcolor, Image_type, outlinefont);
                            iYOffset += 30;
                        }

                        if (showDetails == 1)
                        {
                            sprintf(bufTemp, "Sensor %.1fC", (float)ltemp / 10);
                            cvText(pRgb, bufTemp, iTextX, iTextY + (iYOffset / bin), fontsize * 0.8, linewidth,
                                   linetype[linenumber], fontname[fontnumber], smallFontcolor, Image_type, outlinefont);
                            iYOffset += 30;
                            sprintf(bufTemp, "Exposure %.3f s", (float)autoExp / 1000000);
                            cvText(pRgb, bufTemp, iTextX, iTextY + (iYOffset / bin), fontsize * 0.8, linewidth,
                                   linetype[linenumber], fontname[fontnumber], smallFontcolor, Image_type, outlinefont);
                            iYOffset += 30;
                            sprintf(bufTemp, "Gain %d", (int)autoGain);
                            cvText(pRgb, bufTemp, iTextX, iTextY + (iYOffset / bin), fontsize * 0.8, linewidth,
                                   linetype[linenumber], fontname[fontnumber], smallFontcolor, Image_type, outlinefont);
                            iYOffset += 30;
                        }
                    }
                    printf("Exposure value: %.0f µs\n", (float)autoExp);
                    if (asiAutoExposure == 1)
                    {
                        // Retrieve the current Exposure for smooth transition to night time
                        // as long as auto-exposure is enabled during night time
                        currentExposure = autoExp;
                    }

                    // Save the image
                    printf("Saving...");
                    printf(bufTime);
                    printf("\n");
                    if (!bSavingImg)
                    {
                        pthread_mutex_lock(&mtx_SaveImg);
                        pthread_cond_signal(&cond_SatrtSave);
                        pthread_mutex_unlock(&mtx_SaveImg);
                    }

                    if (asiAutoGain == 1 && dayOrNight == "NIGHT")
                    {
                        ASIGetControlValue(CamNum, ASI_GAIN, &autoGain, &bAuto);
                        printf("Auto Gain value: %d\n", (int)autoGain);
                        writeToLog(autoGain);
                    }

                    if (asiAutoExposure == 1)
                    {
                        printf("Auto Exposure value: %d ms\n", (int)round(autoExp / 1000));
                        writeToLog(autoExp);
                        if (dayOrNight == "NIGHT")
                        {
                            ASIGetControlValue(CamNum, ASI_EXPOSURE, &autoExp, &bAuto);
                        }
                        else
                        {
                            currentExposure = autoExp;
                        }

                        // Delay applied before next exposure
                        if (autoExp < asiMaxExposure * 1000 && dayOrNight == "NIGHT")
                        {
                            // if using auto-exposure and the actual exposure is less than the max,
                            // we still wait until we reach maxexposure. This is important for a
                            // constant frame rate during timelapse generation
                            printf("Sleeping: %d ms\n", asiMaxExposure - (int)(autoExp / 1000) + useDelay);
                            usleep((asiMaxExposure * 1000 - autoExp) + useDelay * 1000);
                        }
                        else
                        {
                            usleep(useDelay * 1000);
                        }
                    }
                    else
                    {
                        usleep(useDelay * 1000);
                    }
                    calculateDayOrNight(latitude, longitude, angle);
                }
            }
            if (lastDayOrNight == "NIGHT")
            {
                endOfNight = true;
            }
            ASIStopVideoCapture(CamNum);
        }
    }
    ASICloseCamera(CamNum);

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
    printf("main function over\n");
    return 1;
}
