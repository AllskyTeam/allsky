#ifdef OPENCV_C_HEADERS
#include <opencv2/core/types_c.h>
#include <opencv2/highgui/highgui_c.h>
#include <opencv2/imgproc/imgproc_c.h>
#include <opencv2/imgcodecs/legacy/constants_c.h>
#endif

#include <opencv2/core/core.hpp>
#include <opencv2/imgproc/imgproc.hpp>
#include <opencv2/highgui/highgui.hpp>
//#include <sys/time.h>
//#include <time.h>
#include <unistd.h>
#include <string.h>
//#include <sys/types.h>
#include <errno.h>
#include <string>
#include <iomanip>
#include <cstring>
#include <sstream>
//include <iostream>
//#include <cstdio>
#include <tr1/memory>
//#include <ctime>
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

//char nameCnt[128];
char const *fileName = "image.jpg";
bool bMain = true;
//ol bDisplay = false;
std::string dayOrNight;

bool bSavingImg = false;

//-------------------------------------------------------------------------------------------------------
//-------------------------------------------------------------------------------------------------------
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

// Calculate if it is day or night
void calculateDayOrNight(const char *latitude, const char *longitude, const char *angle)
{
	char sunwaitCommand[128];

	// Log data
	sprintf(sunwaitCommand, "sunwait poll exit set angle %s %s %s", angle, latitude, longitude);

	// Inform user
	printf("Determine if it is day or night using variables: desired sun declination angle: %s degrees, latitude: %s, longitude: %s\n", angle, latitude, longitude);

	// Determine if it is day or night
	dayOrNight = exec(sunwaitCommand);

	// RMu, I have no clue what this does...
	dayOrNight.erase(std::remove(dayOrNight.begin(), dayOrNight.end(), '\n'), dayOrNight.end());
}

// write value to log file
void writeToLog(int val)
{
	std::ofstream outfile;

	// Append value to the logfile
	outfile.open("log.txt", std::ios_base::app);
	outfile << val;
	outfile << "\n";
}

// Build capture command to capture the image from the HQ camera
void RPiHQcapture(int asiAutoFocus, int asiAutoExposure, int asiExposure, int asiAutoGain, int asiAutoAWB, double asiGain, int bin, double asiWBR, double asiWBB, int asiRotation, int asiFlip, int asiGamma, int asiBrightness, int quality, const char* fileName, int time, int showDetails, const char* ImgText, int fontsize, int fontcolor, int background, int darkframe)
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

	now = std::
time ( NULL );
	tm_ptr = std::localtime ( &now );

	std::strftime ( time_buffer, 40, "%d %B %Y %I:%M:%S %p", tm_ptr );
*/

	ss << fileName;

	// Define strings for raspistill command string and
	string command = "nice raspistill --nopreview --thumb none --output " + ss.str() + " --burst -st ";

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
		roi = "--mode 2  --width 2028 --height 1520 ";
	}

	// Check if binning 3x3 is selected
	else
	{
		// Select binning 4x4 (1012 x 760 pixels)
		roi = "--mode 4 --width 1012 --height 760 ";
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

	if (asiAutoFocus)
	{
		command += "--focus ";
	}

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
	if (!asiAutoGain) {
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

	// Check if rotation is at least 0 degrees
	if (asiRotation != 0 && asiRotation != 90 && asiRotation != 180 && asiRotation != 270)
	{
		// Set rotation to 0 degrees
		asiRotation = 0;
	}

	// check if rotation is needed
	if (asiRotation!=0) {
		ss.str("");
		ss << asiRotation;

		// Add white balance setting to raspistill command string
		command += "--rotation "  + ss.str() + " ";
	}

	// Flip image
	string flip = "";

	// Check if flip is selected
	if (asiFlip == 1 || asiFlip == 3)
	{
		// Set horizontal flip
		flip += "--hflip ";
	}
	if (asiFlip == 2 || asiFlip == 3)
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

	if (!darkframe) {
		if (showDetails)
			command += "-a 1104 ";

		if (time==1)
			command += "-a 1036 ";

		if (strcmp(ImgText, "") != 0) {
			ss.str("");
	//		ss << ReplaceAll(ImgText, std::string(" "), std::string("_"));
			ss << ImgText;
			command += "-a \"" + ss.str() + "\" ";
		}

		if (fontsize < 6)
			fontsize = 6;

		if (fontsize > 160)
			fontsize = 160;

		ss.str("");
		ss << fontsize;

		if (fontcolor < 0)
			fontcolor = 0;

		if (fontcolor > 255)
			fontcolor = 255;

		std::stringstream C;
		C  << std::setfill ('0') << std::setw(2) << std::hex << fontcolor;

		if (background < 0)
			background = 0;

		if (background > 255)
			background = 255;

		std::stringstream B;
		B  << std::setfill ('0') << std::setw(2) << std::hex << background;

		command += "-ae " + ss.str() + ",0x" + C.str() + ",0x8080" + B.str() + " ";
	}

	// Define char variable
	char cmd[command.length() + 1];

	// Convert command to character variable
	strcpy(cmd, command.c_str());

	printf("Capture command: %s\n", cmd);

	// Execute raspistill command
	system(cmd);
}

//-------------------------------------------------------------------------------------------------------
//-------------------------------------------------------------------------------------------------------

int main(int argc, char *argv[])
{
	signal(SIGINT, IntHandle);
/*
	int fontname[] = { CV_FONT_HERSHEY_SIMPLEX,		CV_FONT_HERSHEY_PLAIN,		 CV_FONT_HERSHEY_DUPLEX,
					   CV_FONT_HERSHEY_COMPLEX,		CV_FONT_HERSHEY_TRIPLEX,       CV_FONT_HERSHEY_COMPLEX_SMALL,
					   CV_FONT_HERSHEY_SCRIPT_SIMPLEX, CV_FONT_HERSHEY_SCRIPT_COMPLEX };
	int fontnumber = 0;
	int iStrLen;
	int iTextX = 15, iTextY = 25;
*/
	char const *ImgText   = "";
	char const *param     = "";
	double fontsize       = 32;
/*
	int linewidth		 = 1;
	int outlinefont       = 0;
*/
	int fontcolor		 = 255;
	int background		= 0;
/*
	int smallFontcolor[3] = { 0, 0, 255 };
	int linetype[3]       = { CV_AA, 8, 4 };
	int linenumber		= 0;
	char buf[1024]    = { 0 };
	char bufTime[128] = { 0 };
	char bufTemp[128] = { 0 };
*/
	int width		     = 0;
	int height		    = 0;
	int bin		       = 2;
	int asiExposure       = 60000000;
	int asiAutoExposure   = 0;
	int asiAutoFocus      = 0;
	double asiGain		= 4;
	int asiAutoGain       = 0;
	int asiAutoAWB		= 0;
	int delay		     = 10;   // Delay in milliseconds. Default is 10ms
	int daytimeDelay      = 15000; // Delay in milliseconds. Default is 15 seconds
	double asiWBR		 = 2.5;
	double asiWBB		 = 2;
	int asiGamma		  = 50;
	int asiBrightness     = 50;
	int asiFlip		   = 0;
	int asiRotation       = 0;
	char const *latitude  = "52.57N"; //GPS Coordinates of Limmen, Netherlands where this code was altered
	char const *longitude = "4.70E";
	char const *angle  	  = "0"; // angle of the sun with the horizon (0=sunset, -6=civil twilight, -12=nautical twilight, -18=astronomical twilight)
	//int preview		   = 0;
	int time		      = 0;
	int showDetails       = 0;
	int darkframe		 = 0;
	int daytimeCapture    = 0;
	int help		      = 0;
	int quality		   = 90;

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
		// printf("Found %d parameters...\n", argc - 1);

		for (i = 0; i < argc - 1; i++)
		{
			// printf("Processing argument: %s\n\n", argv[i]);

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

			else if (strcmp(argv[i], "-autofocus") == 0)
			{
				asiAutoFocus = atoi(argv[i + 1]);
				i++;
			}
			else if (strcmp(argv[i], "-gain") == 0)
			{
				asiGain = atof(argv[i + 1]);
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
/*
			else if (strcmp(argv[i], "-awb") == 0)
			{
				asiAutoAWB = atoi(argv[i + 1]);
				i++;
			}
*/
			else if (strcmp(argv[i], "-wbr") == 0)
			{
				asiWBR = atof(argv[i + 1]);
				i++;
			}
			else if (strcmp(argv[i], "-wbb") == 0)
			{
				asiWBB = atof(argv[i + 1]);
				i++;
			}

			// Check for text parameter
			else if (strcmp(argv[i], "-text") == 0)
			{
				// Get first param
				param = argv[i + 1];

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

					// Increase parameter counter
					i++;

					// Flag first word is entered
					j = 1;

					// Get next parameter
					param = argv[i + 1];
				}
			}
/*
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
*/
			else if (strcmp(argv[i], "-background") == 0)
			{
				background = atoi(argv[i + 1]);
				i++;
			}
			else if (strcmp(argv[i], "-fontcolor") == 0)
			{
				fontcolor = atoi(argv[i + 1]);
				i++;
			}
/*
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
*/
			else if (strcmp(argv[i], "-fontsize") == 0)
			{
				fontsize = atof(argv[i + 1]);
				i++;
			}
/*
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
			else if (strcmp(argv[i], "-rotation") == 0)
			{
				asiRotation = atoi(argv[i + 1]);
				i++;
			}
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
/*
			else if (strcmp(argv[i], "-preview") == 0)
			{
				preview = atoi(argv[i + 1]);
				i++;
			}
*/
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
		}
	}

	// Save the status of Auto Gain for night exposure
	int oldAutoExposure = asiAutoExposure;
	int oldGain = asiGain;

	if (help == 1)
	{
		printf("%sAvailable Arguments: \n", KYEL);
		printf(" -width						     - Default = Camera Max Width \n");
		printf(" -height						    - Default = Camera Max Height \n");
		printf(" -exposure						  - Default = 5000000 - Time in µs (equals to 5 sec) \n");
		printf(" -autoexposure				      - Default = 0 - Set to 1 to enable auto Exposure \n");
		printf(" -autofocus						 - Default = 0 - Set to 1 to enable auto Focus \n");
		printf(" -gain						      - Default = 1 (1 - 16) \n");
		printf(" -autogain						  - Default = 0 - Set to 1 to enable auto Gain \n");
		printf(" -gamma						     - Default = 50 (-100 till 100)\n");
		printf(" -brightness						- Default = 50 (0 till 100) \n");
//		printf(" -awb						       - Default = 0 - Auto White Balance (0 = off)\n");
		printf(" -wbr						       - Default = 2 - White Balance Red  (0 = off)\n");
		printf(" -wbb						       - Default = 2 - White Balance Blue (0 = off)\n");
		printf(" -bin						       - Default = 1 - binning OFF (1x1), 2 = 2x2, 3 = 3x3 binning\n");
		printf(" -delay						     - Default = 10 - Delay between images in milliseconds - 1000 = 1 sec.\n");
		printf(" -daytimeDelay				      - Default = 5000 - Delay between images in milliseconds - 5000 = 5 sec.\n");
		printf(" -type = Image Type				 - Default = 0 - 0 = RAW8,  1 = RGB24,  2 = RAW16 \n");
		printf(" -quality						   - Default = 70%%, 0%% (poor) 100%% (perfect)\n");
		printf(" -filename						  - Default = image.jpg\n");
		printf(" -rotation						  - Default = 0 degrees - Options 0, 90, 180 or 270\n");
		printf(" -flip						      - Default = 0 - 0 = Orig, 1 = Horiz, 2 = Verti, 3 = Both\n");
		printf("\n");
		printf(" -text						      - Default =      - Character/Text Overlay. Use Quotes.  Ex. -c "
			   "\"Text Overlay\"\n");
/*
		printf(
			" -textx						     - Default = 15   - Text Placement Horizontal from LEFT in Pixels\n");
		printf(" -texty = Text Y				    - Default = 25   - Text Placement Vertical from TOP in Pixels\n");
		printf(" -fontname = Font Name		      - Default = 0    - Font Types (0-7), Ex. 0 = simplex, 4 = triplex, "
			   "7 = script\n");
*/
		printf(" -fontcolor = Font Color		    - Default = 255  - Text gray scale color  (0 - 255)\n");
		printf(" -background= Font Color		    - Default = 0  - Backgroud gray scale color (0 - 255)\n");
/*
		printf(" -smallfontcolor = Small Font Color - Default = 0 0 255  - Text red (BGR)\n");
		printf(" -fonttype = Font Type		      - Default = 0    - Font Line Type,(0-2), 0 = AA, 1 = 8, 2 = 4\n");
*/
		printf(" -fontsize						  - Default = 32  - Text Font Size (range 6 - 160, 32 default)\n");
/*
		printf(" -fontline						  - Default = 1    - Text Font Line Thickness\n");
*/
		printf("\n");
		printf("\n");
		printf(" -latitude						  - Default = 60.7N (Whitehorse)   - Latitude of the camera.\n");
		printf(" -longitude						 - Default = 135.05W (Whitehorse) - Longitude of the camera\n");
		printf(" -angle						     - Default = -6 - Angle of the sun below the horizon. -6=civil "
			   "twilight, -12=nautical twilight, -18=astronomical twilight\n");
		printf("\n");
		// printf(" -preview						   - set to 1 to preview the captured images. Only works with a Desktop Environment \n");
		printf(" -time						      - Adds the time to the image.\n");
		printf(" -darkframe						 - Set to 1 to grab dark frame and cover your camera \n");
		printf(" -showDetails				       - Set to 1 to display the metadata on the image \n");

		printf("%sUsage:\n", KRED);
		printf(" ./capture -width 640 -height 480 -exposure 5000000 -gamma 50 -bin 1 -filename Lake-Laberge.JPG\n\n");
	}

	printf("%s", KNRM);

	int iMaxWidth = 4096;
	int iMaxHeight = 3040;
	double pixelSize = 1.55;

	printf("- Resolution: %dx%d\n", iMaxWidth, iMaxHeight);
	printf("- Pixel Size: %1.2fμm\n", pixelSize);
	printf("- Supported Bin: 1x, 2x and 3x\n");

	// Adjusting variables for chosen binning
	width  = iMaxWidth / bin;
	height = iMaxHeight / bin;

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
	printf(" Auto Focus: %d\n", asiAutoFocus);
	printf(" Gain: %1.2f\n", asiGain);
	printf(" Auto Gain: %d\n", asiAutoGain);
	printf(" Brightness: %d\n", asiBrightness);
	printf(" Gamma: %d\n", asiGamma);
//	printf(" Auto White Balance: %d\n", asiAutoAWB);
	printf(" WB Red: %1.2f\n", asiWBR);
	printf(" WB Blue: %1.2f\n", asiWBB);
	printf(" Binning: %d\n", bin);
	printf(" Delay: %dms\n", delay);
	printf(" Daytime Delay: %dms\n", daytimeDelay);
	printf(" Text Overlay: %s\n", ImgText);
/*
		printf(" Text Position: %dpx left, %dpx top\n", iTextX, iTextY);
		printf(" Font Name:  %d\n", fontname[fontnumber]);
*/
		printf(" Font Color: %d\n", fontcolor);
		printf(" Font Background Color: %d\n", background);
/*
		printf(" Small Font Color: %d , %d, %d\n", smallFontcolor[0], smallFontcolor[1], smallFontcolor[2]);
		printf(" Font Line Type: %d\n", linetype[linenumber]);
*/
		printf(" Font Size: %1.1f\n", fontsize);
/*
		printf(" Font Line: %d\n", linewidth);
		printf(" Outline Font : %d\n", outlinefont);
*/
	printf(" Rotation: %d\n", asiRotation);
	printf(" Flip Image: %d\n", asiFlip);
	printf(" Filename: %s\n", fileName);
	printf(" Latitude: %s\n", latitude);
	printf(" Longitude: %s\n", longitude);
	printf(" Sun Elevation: %s\n", angle);
	// printf(" Preview: %d\n", preview);
	printf(" Time: %d\n", time);
	printf(" Show Details: %d\n", showDetails);
	printf(" Darkframe: %d\n", darkframe);

	// Show selected camera type
	printf(" Camera: Raspberry Pi HQ camera\n");

	printf("%s", KNRM);

	// Initialization
	int currentExposure = asiExposure;
	int exp_ms		  = 0;
	int useDelay		= 0;
	bool needCapture	= true;
	std::string lastDayOrNight;

	while (bMain)
	{
		printf("\n");

		needCapture = true;

		// Find out if it is currently DAY or NIGHT
		calculateDayOrNight(latitude, longitude, angle);

// Next line is present for testing purposes
// dayOrNight.assign("NIGHT");

		lastDayOrNight = dayOrNight;

// Next lines are present for testing purposes
// printf("Daytimecapture: %d\n", daytimeCapture);

		if (dayOrNight=="DAY")
			printf("Check for day or night: DAY\n");
		else if (dayOrNight=="NIGHT")
			printf("Check for day or night: NIGHT\n");
		else
			printf("Nor day or night...\n");

		printf("\n");

		if (dayOrNight == "DAY")
		{
			// Switch auto gain on
			asiAutoExposure = 1;
			asiGain = 1;

			// Execute end of night script
			if (endOfNight == true)
			{
				system("scripts/endOfNight_RPiHQ.sh &");

				// Reset end of night indicator
				endOfNight = false;
			}

// Next line is present for testing purposes
// daytimeCapture = 1;

			// Check if images should not be captured during day-time
			if (daytimeCapture != 1)
			{
				// Indicate no images need capturing
				needCapture = false;

				// Inform user
				printf("It's daytime... we're not saving images\n");

				// Sleep for a while
				usleep(daytimeDelay * 1000);
			}

			// Images should be captured during day-time
			else
			{
				// Inform user
				printf("Starting daytime capture\n");

				// Set exposure to 32 ms
				exp_ms		 = 32;

				// Inform user
				printf("Saving %d ms exposed images with %d seconds delays in between...\n\n", exp_ms, daytimeDelay / 1000);

				// Set delay time
				useDelay       = daytimeDelay;

				// Set exposure time
				currentExposure = exp_ms * 1000;
			}
		}

		// Check for night time
		else if (dayOrNight == "NIGHT")
		{
			// Retrieve auto gain setting
			asiAutoExposure = oldAutoExposure;
			asiGain = oldGain;

			// Inform user
			printf("Saving %d seconds exposure images with %d ms delays in between...\n\n", (int)round(currentExposure / 1000000), delay);

			// Set exposure value for night time capture
			useDelay = delay;

			currentExposure = asiExposure;
		}

		// Inform user
		printf("Press Ctrl+Z to stop capturing images...\n\n");

		// check if images should be captured
		if (needCapture)
		{
			// Wait for switch day time -> night time or night time -> day time
			while (bMain && lastDayOrNight == dayOrNight)
			{
				// Inform user
				printf("Capturing & saving image...\n");

				// Capture and save image
				RPiHQcapture(asiAutoFocus, asiAutoExposure, currentExposure, asiAutoGain, asiAutoAWB, asiGain, bin, asiWBR, asiWBB, asiRotation, asiFlip, asiGamma, asiBrightness, quality, fileName, time, showDetails, ImgText, fontsize, fontcolor, background, darkframe);

				// Check if no processing is going on
				if (!bSavingImg)
				{
					// Flag processing is on-going
					bSavingImg = true;

					// Check for night time
					if (dayOrNight == "NIGHT")
					{
						// Preserve image during night time
						system("scripts/saveImageNight.sh &");
					}
					else
					{
						// Upload and resize image when configured
						system("scripts/saveImageDay.sh &");
					}

					// Flag processing is over
					bSavingImg = false;
				}

				// Inform user
				printf("Capturing & saving image done, now wait %d seconds...\n", useDelay / 1000);

				// Sleep for a moment
				usleep(useDelay * 1000);

				// Check for day or night based on location and angle
				calculateDayOrNight(latitude, longitude, angle);

// Next line is present for testing purposes
// dayOrNight.assign("NIGHT");

				// Check if it is day time
				if (dayOrNight=="DAY")
				{
					// Check started capturing during day time
					if (lastDayOrNight=="DAY")
					{
						printf("Check for day or night: DAY (waiting for changing DAY into NIGHT)...\n");
					}

					// Started capturing during night time
					else
					{
						printf("Check for day or night: DAY (waiting for changing NIGHT into DAY)...\n");
					}
				}

				// Check if it is night time
				else if (dayOrNight=="NIGHT")
				{
					// Check started capturing during day time
					if (lastDayOrNight=="DAY")
					{
						printf("Check for day or night: NIGHT (waiting for changing DAY into NIGHT)...\n");
					}

					// Started capturing during night time
					else
					{
						printf("Check for day or night: NIGHT (waiting for changing NIGHT into DAY)...\n");
					}
				}

				// Unclear if it is day or night
				else
				{
					printf("Nor day or night...\n");
				}

				printf("\n");
			}

			// Check for night situation
			if (lastDayOrNight == "NIGHT")
			{
				// Flag end of night processing is needed
				endOfNight = true;
			}
		}
	}

	// Stop script
	printf("main function over\n");

	// Return all is well
	return 1;
}
