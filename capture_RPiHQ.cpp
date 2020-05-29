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
#include <cstring>
#include <sstream>
#include <iostream>
#include <cstdio>
#include <tr1/memory>
#include <ctime>
#include <stdlib.h>
#include <signal.h>
#include <fstream>

using namespace std;

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

char nameCnt[128];
char const *fileName = "image.jpg";
bool bMain = true, bDisplay = false;
std::string dayOrNight;

bool bSavingImg = false;

//-------------------------------------------------------------------------------------------------------
//-------------------------------------------------------------------------------------------------------
/*
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
*/

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
/*
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
*/
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

void RPiHQcapture(int asiAutoExposure, int asiExposure, int asiAutoGain, double asiGain, int bin, double asiWBR, double asiWBB, int asiFlip, int asiGamma, int asiBrightness, int quality, const char* fileName)
{
	//printf ("capturing image in file %s\n", fileName);

	// Ensure no rraspistill process is still running
	string kill = "ps -ef|grep raspistill| grep -v color|awk '{print $2}'|xargs kill -9 1> /dev/null 2>&1";

	// Define char variable
	char kcmd[kill.length() + 1];

	// Convert command to character variable
	strcpy(kcmd, kill.c_str());

	//printf("Command: %s\n", cmd);

	// Execute raspistill command
	system(kcmd);

	stringstream ss;

/*
	static char time_buffer[40];
	const struct std::tm *tm_ptr;
	std::time_t now;

	now = std::time ( NULL );
	tm_ptr = std::localtime ( &now );

	std::strftime ( time_buffer, 40, "%d %B %Y %I:%M:%S %p", tm_ptr );
*/

	ss << fileName;

	// Define strings for raspistill command string and
	string command = "raspistill --nopreview --thumb none --output " + ss.str() + " --burst -st ";

	// Define strings for roi (used for binning) string
	string roi;

	if (bin > 3)
	{
		bin = 3;
	}

	if (bin < 1)
	{
		bin = 1;
	}

	// Check for binning 1x1 is selected
	if (bin==1)
	{
		// Select binning 1x1 (4060 x 3056 pixels)
		roi = "--mode 3 ";
	}

	// Check if binning 2x2 is selected
	else if (bin==2)
	{
		// Select binning 2x2 (2028 x 1520 pixels)
		roi = "--mode 2 ";
	}

	// Check if binning 3x3 is selected
	else
	{
		// Select binning 3x3 (1352 x 1013 pixels)
		roi = "--mode 4 ";
	}

	// Append binning window
	command += roi;

	if (asiExposure < 1)
	{
		asiExposure = 1;
	}

	if (asiExposure > 240000000)
	{
		asiExposure = 240000000;
	}

	// Exposure time
	string shutter;

	// Check if automatic determined exposure time is selected
	if (asiAutoExposure)
	{
		shutter = "--exposure auto ";
	}

	// Set exposure time
	else if (asiExposure)
	{
		ss.str("");
		ss << asiExposure;
		shutter = "--exposure off --shutter " + ss.str() + " ";
	}

	// Add exposure time setting to raspistill command string
	command += shutter;

	// Anolog Gain
	string gain;

	// Check if auto gain is sleected
	if (asiAutoGain)
	{
		// Set analog gain to 1
		gain = "--analoggain 1 ";
	}

	// Set manual analog gain setting
	else if (asiGain) {
		if (asiGain < 1)
		{
			asiGain = 1;
		}

		if (asiGain > 16)
		{
			asiGain = 16;
		}

		ss.str("");
		ss << asiGain;
		gain = "--analoggain " + ss.str() + " ";
	}

	// Add gain setting to raspistill command string
	command += gain;

	// White balance
	string awb;

	// Check if R and B component are given
	if (asiWBR && asiWBB) {
		if (asiWBR < 0.1)
		{
			asiWBR = 0.1;
		}

		if (asiWBR > 10)
		{
			asiWBR = 10;
		}

		if (asiWBB < 0.1)
		{
			asiWBB = 0.1;
		}

		if (asiWBB > 10)
		{
			asiWBB = 10;
		}

		ss.str("");
		ss << asiWBR;
		awb  = "--awb off --awbgains " + ss.str();

		ss.str("");
		ss << asiWBB;
		awb += "," + ss.str() + " ";
	}

	// Use automatic white balance
	else
	{
		awb = "--awb auto ";
	}

	// Add white balance setting to raspistill command string
	command += awb;

	// Flip image
	string flip = "";

	// Check if flip is selected
	if (asiFlip & 1)
	{
		// Set horizontal flip
		flip += "--hflip ";
	}
	if (asiFlip & 2)
	{
		// Set vertical flip
		flip += "--vflip ";
	}

	// Add flip info to raspistill command string
	command += flip;

	//Gamma correction (saturation)
	string saturation;

	// Check if gamma correction is set
	if (asiGamma < -100)
	{
		asiGamma = -100;
	}

	if (asiGamma > 100)
	{
		asiGamma = 100;
	}

	if (asiGamma)
	{
		ss.str("");
		ss << asiGamma;
		saturation = "--saturation "+ ss.str() + " ";
	}

	// Add gamma correction info to raspistill command string
	command += saturation;

	// Brightness
	string brightness;

	if (asiBrightness < 0)
	{
		asiBrightness = 0;
	}

	if (asiBrightness > 100)
	{
		asiBrightness = 100;
	}

	// check if brightness setting is set
	if (asiBrightness!=50)
	{
		ss.str("");
		ss << asiBrightness;
		brightness = "--brightness " + ss.str() + " ";
	}

	// Add brightness info to raspistill command string
	command += brightness;

	// Quality
	string squality;

	if (quality < 0)
	{
		quality = 0;
	}

	if (quality > 100)
	{
		quality = 100;
	}

	ss.str("");
	ss << quality;
	squality = "--quality " + ss.str() + " ";

	// Add image quality info to raspistill command string
	command += squality;

	// Define char variable
	char cmd[command.length() + 1];

	// Convert command to character variable
	strcpy(cmd, command.c_str());

	// printf("Command: %s\n", cmd);

	// Execute raspistill command
	system(cmd);
}

//-------------------------------------------------------------------------------------------------------
//-------------------------------------------------------------------------------------------------------

int main(int argc, char *argv[])
{
	signal(SIGINT, IntHandle);
/*
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
*/
	int width             = 0;
	int height            = 0;
	int bin               = 2;
	int asiExposure       = 30000000;
	int asiAutoExposure   = 0;
	double asiGain           = 1;
	int asiAutoGain       = 0;
	int delay             = 10;   // Delay in milliseconds. Default is 10ms
	int daytimeDelay      = 5000; // Delay in milliseconds. Default is 5000ms
	double asiWBR         = 2;
	double asiWBB         = 2;
	int asiGamma          = 50;
	int asiBrightness     = 50;
	int asiFlip           = 0;
	char const *latitude  = "52.57N"; //GPS Coordinates of Limmen, Netherlands where this code was altered
	char const *longitude = "4.70E";
	char const *angle  	  = "0"; // angle of the sun with the horizon (0=sunset, -6=civil twilight, -12=nautical twilight, -18=astronomical twilight)
	int preview           = 0;
	int time              = 1;
	// int darkframe         = 0;
	int daytimeCapture    = 0;
	int help              = 0;
	int quality           = 70;

	int i;
	//id *retval;
	bool endOfNight    = false;
	//hread_t hthdSave = 0;

	//-------------------------------------------------------------------------------------------------------
	//-------------------------------------------------------------------------------------------------------
	printf("\n");
	printf("%s ******************************************\n", KGRN);
	printf("%s *** Allsky Camera Software v0.6 | 2019 ***\n", KGRN);
	printf("%s ******************************************\n\n", KGRN);
	printf("\%sCapture images of the sky with a Raspberry Pi and an ZWO ASI or RPi HQ camera\n", KGRN);
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
	printf("-Michael J. Kidd - <linuxkidd@gmail.com>\n");
	printf("-Rob Musquetier\n\n");

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
/*
			else if (strcmp(argv[i], "-type") == 0)
			{
				Image_type = atoi(argv[i + 1]);
				i++;
			}
*/
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
/*
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
*/
			else if (strcmp(argv[i], "-flip") == 0)
			{
				asiFlip = atoi(argv[i + 1]);
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
/*
			else if (strcmp(argv[i], "-darkframe") == 0)
			{
				darkframe = atoi(argv[i + 1]);
				i++;
			}
*/
			else if (strcmp(argv[i], "-daytime") == 0)
			{
				daytimeCapture = atoi(argv[i + 1]);
				i++;
			}
		}
	}

	if (help == 1)
	{
		printf("%sAvailable Arguments: \n", KYEL);
		printf(" -width                             - Default = Camera Max Width \n");
		printf(" -height                            - Default = Camera Max Height \n");
		printf(" -exposure                          - Default = 5000000 - Time in Âµs (equals to 5 sec) \n");
		printf(" -autoexposure                      - Default = 0 - Set to 1 to enable auto Exposure \n");
		printf(" -gain                              - Default = 1 (1 - 16) \n");
		printf(" -autogain                          - Default = 0 - Set to 1 to enable auto Gain \n");
		printf(" -gamma                             - Default = 50 (-100 till 100)\n");
		printf(" -brightness                        - Default = 50 (0 till 100) \n");
		printf(" -wbr                               - Default = 2 - White Balance Red  (0 = off)\n");
		printf(" -wbb                               - Default = 2 - White Balance Blue (0 = off)\n");
		printf(" -bin                               - Default = 1 - 1 = binning OFF (1x1), 2 = 2x2, 3 = 3x3 "
			   "binning\n");
		printf(" -delay                             - Default = 10 - Delay between images in milliseconds - 1000 = 1 "
			   "sec.\n");
		printf(" -daytimeDelay                      - Default = 5000 - Delay between images in milliseconds - 5000 = "
			   "5 sec.\n");
		printf(" -type = Image Type                 - Default = 0 - 0 = RAW8,  1 = RGB24,  2 = RAW16 \n");
		printf(" -quality                           - Default = 70%%, 0%% (poor) 100%% (perfect)\n");
		printf(" -filename                          - Default = image.jpg\n");
		printf(" -flip                              - Default = 0 - 0 = Orig, 1 = Horiz, 2 = Verti, 3 = Both\n");
		printf("\n");
/*
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
*/
		printf("\n");
		printf("\n");
		printf(" -latitude                          - Default = 60.7N (Whitehorse)   - Latitude of the camera.\n");
		printf(" -longitude                         - Default = 135.05W (Whitehorse) - Longitude of the camera\n");
		printf(" -angle                             - Default = -6 - Angle of the sun below the horizon. -6=civil "
			   "twilight, -12=nautical twilight, -18=astronomical twilight\n");
		printf("\n");
		printf(" -preview                           - set to 1 to preview the captured images. Only works with a "
			   "Desktop Environment \n");
		//printf(" -time                              - Adds the time to the image. Combine with Text X and Text Y for "
		//	   "placement \n");
//		printf(" -darkframe                         - Set to 1 to disable time and text overlay \n");

		printf("%sUsage:\n", KRED);
		printf(" ./capture -width 640 -height 480 -exposure 5000000 -gamma 50 -bin 1 -filename Lake-Laberge.PNG\n\n");
	}
	printf("%s", KNRM);

	int iMaxWidth, iMaxHeight;
	double pixelSize;

	pixelSize = 1.55;
	iMaxWidth = 4096;
	iMaxHeight = 3040;

	printf("- Resolution: %dx%d\n", iMaxWidth, iMaxHeight);
	printf("- Pixel Size: %1.2fÎ¼m\n", pixelSize);
	printf("- Supported Bin: 1x, 2x and 3x\n");

	width  = iMaxWidth;
	height = iMaxHeight;

	// Adjusting variables for chosen binning
	height    = height / bin;
	width     = width / bin;
	//iTextX    = iTextX / bin;
	//iTextY    = iTextY / bin;
	//fontsize  = fontsize / bin;
	//linewidth = linewidth / bin;

	//-------------------------------------------------------------------------------------------------------
	//-------------------------------------------------------------------------------------------------------

	printf("%s", KGRN);
	printf("\nCapture Settings: \n");
	printf(" Resolution: %dx%d \n", width, height);
	printf(" Quality: %d \n", quality);
	printf(" Exposure: %1.0fms\n", round(asiExposure / 1000));
	printf(" Auto Exposure: %d\n", asiAutoExposure);
	printf(" Gain: %1.2f\n", asiGain);
	printf(" Auto Gain: %d\n", asiAutoGain);
	printf(" Brightness: %d\n", asiBrightness);
	printf(" Gamma: %d\n", asiGamma);
	printf(" WB Red: %1.2f\n", asiWBR);
	printf(" WB Blue: %1.2f\n", asiWBB);
	printf(" Binning: %d\n", bin);
	printf(" Delay: %dms\n", delay);
	printf(" Daytime Delay: %dms\n", daytimeDelay);
/*
		printf(" Text Overlay: %s\n", ImgText);
		printf(" Text Position: %dpx left, %dpx top\n", iTextX, iTextY);
		printf(" Font Name:  %d\n", fontname[fontnumber]);
		printf(" Font Color: %d , %d, %d\n", fontcolor[0], fontcolor[1], fontcolor[2]);
		printf(" Small Font Color: %d , %d, %d\n", smallFontcolor[0], smallFontcolor[1], smallFontcolor[2]);
		printf(" Font Line Type: %d\n", linetype[linenumber]);
		printf(" Font Size: %1.1f\n", fontsize);
		printf(" Font Line: %d\n", linewidth);
		printf(" Outline Font : %d\n", outlinefont);
*/
	printf(" Flip Image: %d\n", asiFlip);
	printf(" Filename: %s\n", fileName);
	printf(" Latitude: %s\n", latitude);
	printf(" Longitude: %s\n", longitude);
	printf(" Sun Elevation: %s\n", angle);
	printf(" Preview: %d\n", preview);
	printf(" Time: %d\n", time);
	// printf(" Darkframe: %d\n", darkframe);

	// Show selected camera type
	printf(" Camera: Raspberry Pi HQ camera\n");

	printf("%s", KNRM);

	// Initialization
	int currentExposure = asiExposure;
	int exp_ms          = 0;
	int useDelay        = 0;

	while (bMain)
	{
		bool needCapture = true;
		std::string lastDayOrNight;

		// Find out if it is currently DAY or NIGHT
		calculateDayOrNight(latitude, longitude, angle);

// Next line is present for testing purposes
// dayOrNight.assign("NIGHT");

		lastDayOrNight = dayOrNight;
		printf("\n");
		if (dayOrNight == "DAY")
		{
			// Setup the daytime capture parameters
			if (endOfNight == true)
			{
				system("scripts/endOfNight_RPiHQ.sh &");
				endOfNight = false;
			}

// Next line is present for testing purposes
daytimeCapture = 1;

			if (daytimeCapture != 1)
			{
				needCapture = false;
				printf("It's daytime... we're not saving images\n");
				usleep(daytimeDelay * 1000);
			}
			else
			{
				printf("Starting daytime capture\n");
				exp_ms         = 32;
				printf("Saving %d ms exposed images every %d ms\n\n", exp_ms, daytimeDelay);
				useDelay       = daytimeDelay;

				// Set ZWO Exposure and Gain settings
				currentExposure = exp_ms * 1000;
			}
		}
		else if (dayOrNight == "NIGHT")
		{
			printf("Saving %ds exposure images every %d ms\n\n", (int)round(currentExposure / 1000000), delay);

			// Set exposure value for night time capture
			useDelay = delay;
		}

		printf("Press Ctrl+C to stop\n\n");

		if (needCapture)
		{
			while (bMain && lastDayOrNight == dayOrNight)
			{
				printf("Saving...\n");

				RPiHQcapture(asiAutoExposure, currentExposure, asiAutoGain, asiGain, bin, asiWBR, asiWBB, asiFlip, asiGamma, asiBrightness, quality, fileName);

				if (!bSavingImg)
				{
					bSavingImg = true;

					if (dayOrNight == "NIGHT")
					{
						system("scripts/saveImageNight.sh &");
					}
					else
					{
						system("scripts/saveImageDay.sh &");
					}

					bSavingImg = false;
				}

				usleep(useDelay * 1000);
			}

			calculateDayOrNight(latitude, longitude, angle);

// Next line is present for testing purposes
// dayOrNight.assign("NIGHT");

			if (lastDayOrNight == "NIGHT")
			{
				endOfNight = true;
			}
		}
	}

	printf("main function over\n");

	return 1;
}
