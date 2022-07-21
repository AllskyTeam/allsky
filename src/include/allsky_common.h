// Items used by the "capture*" programs.

// Image formats.  Match the ASI_* settings to make it consistent with ZWO's library.
#define IMG_RAW8	0
#define IMG_RGB24	1
#define IMG_RAW16	2
#define IMG_Y8		3

// Colors for messages
#define KNRM "\x1B[0m"
#define KRED "\x1B[31m"
#define KGRN "\x1B[32m"
#define KYEL "\x1B[33m"
#define KBLU "\x1B[34m"
#define KMAG "\x1B[35m"
#define KCYN "\x1B[36m"
#define KWHT "\x1B[37m"

// Times
#define US_IN_MS	1000						// microseconds in a millisecond
#define MS_IN_SEC	1000						// milliseconds in a second
#define US_IN_SEC	(US_IN_MS * MS_IN_SEC)		// microseconds in a second
#define S_IN_MIN	60
#define S_IN_HOUR	(60 * 60)
#define S_IN_DAY	(24 * S_IN_HOUR)

// NOT_SET are items that aren't set yet and will be calculated at run time.
// NOT_CHANGED items are command-line arguments where the default is camera-dependent,
// and we can't use NOT_SET because -1 may be a legal value.
// IS_DEFAULT means the value is the same as the camera default, so don't pass to camera program
// since it'll use the default anyway.
#define NOT_SET						-1
#define NOT_CHANGED					-999999
#define	IS_DEFAULT					NOT_CHANGED

// Defaults
#define NO_MAX_VALUE				9999999		// signifies a number has no maximum value//
#define AUTO_IMAGE_TYPE				99	// must match what's in the camera_settings.json file
#define DEFAULT_DAYMEAN				0.5
#define DEFAULT_NIGHTMEAN			0.2

// Default overlay values - will go away once external overlay program is implemented
#define SMALLFONTSIZE_MULTIPLIER	0.08

// Exit codes.  Need to match what's in allsky.sh
#define EXIT_OK						0
#define EXIT_RESTARTING				98		// Process is restarting, i.e., stop, then start
#define EXIT_RESET_USB				99		// Need to reset USB bus; cannot continue
#define EXIT_ERROR_STOP				100		// Got an unrecoverable ERROR
#define EXIT_NO_CAMERA				101		// Could not find a camera - is unrecoverable

enum isDayOrNight {
	isDay,
	isNight
};

enum cameraType {
	ctZWO,
	ctRPi
};

// Use long instead of int so we can use validateLong() without creating validateInt().
struct overlay {
	char const *ImgText					= "";
	char const *ImgExtraText			= "";
	long extraFileAge					= 0;
	long iTextLineHeight				= 30;
	long iTextX							= 15;
	long iTextY							= 25;
	long fontnumber						= 0;
	// fontcolor / fc, and smallfontcolor / sfc should match
	int fontcolor[3]					= { 255, 0, 0 };
	char const *fc						= "0 0 255"; 		// string version of fontcolor[]
	int smallFontcolor[3]				= { 0, 0, 255 };
	char const *sfc						= "0 0 255";		// string version of smallfontcolor[]
	int linetype[3]						= { cv::LINE_AA, 8, 4 };
	long linenumber						= 0;
	double fontsize						= 10;
	long linewidth						= 1;
	bool outlinefont					= false;
	bool showTime						= true;
	bool showExposure					= false;
	bool showTemp						= false;
	bool showGain						= false;
	bool showBrightness					= false;
	bool showMean						= false;
	bool showFocus						= false;
	bool showHistogramBox				= false;
	bool externalOverlay				= false;
};

// Histogram Box, ZWO only
struct HB {
	int histogramBoxSizeX				= 500;			// width of box in pixels
	int currentHistogramBoxSizeX		= NOT_CHANGED;
	int histogramBoxSizeY				= 500;			// height of box in pixels
	int currentHistogramBoxSizeY		= NOT_CHANGED;
	float histogramBoxPercentFromLeft	= 0.5;			// 25% means left/top side starts 25% of
	float histogramBoxPercentFromTop	= 0.5;			//    the image width/height
	int centerX							= NOT_SET;		// center X and Y pixel (calculated value)
	int centerY							= NOT_SET;		// center X and Y pixel (calculated value)
	int leftOfBox						= NOT_SET;		// top left pixel (calculated value)
	int topOfBox						= NOT_SET;		// top left pixel (calculated value)
	int rightOfBox						= NOT_SET;		// bottom right pixel (calculated value)
	int bottomOfBox						= NOT_SET;		// bottom right pixel (calculated value)
	char const *sArgs					= NULL;			// string version of arguments
};

struct myModeMeanSetting {
	bool modeMean						= false;		// currently using it?
	double dayMean						= DEFAULT_DAYMEAN;
	double nightMean					= DEFAULT_NIGHTMEAN;
	double currentMean					= NOT_SET;		// (calculated value)
	double Mean							= NOT_SET;		// (calculated value)
	double mean_threshold				= 0.1;
	double mean_p0						= 5.0;
	double mean_p1						= 20.0;
	double mean_p2						= 45.0;
};


struct config {			// for configuration variables
	// Some of these variables aren't settings, but are temporary variables that need to be
	// passed around.

	// Camera number, type and model
	int cameraNumber					= 0;			// 0 to number-of-cameras-attached minus 1
	cameraType ct						= ctRPi;
	char const *cm						= "";

	// Settings can be in the config file and/or command-line.
	char const *configFile				= "";

	bool isColorCamera					= false;		// Is the camera color or mono?
	bool isCooledCamera					= false;		// Does the camera have a cooler?
	bool supportsTemperature			= false;		// Does the camera have a temp sensor?
	bool supportsAggression				= false;		// currently ZWO only
	bool gainTransitionTimeImplemented	= false;		// currently ZWO only
	// camera's min and max exposures (camera dependent), and max auto-exposure length
	long cameraMinExposure_us			= NOT_SET;		// Minimum exposure supported by camera
	long cameraMaxExposure_us			= NOT_SET;		// Maximum exposure supported by camera
	long cameraMaxAutoExposure_us		= NOT_SET;		// Maximum exposure supported by camera
	bool goodLastExposure				= false;		// Was the last image propery exposed?

	// The following are settings based on command-line arguments.
	bool help							= false;		// User wants usage message displayed
	bool quietExit						= false;		// Exit without any messages
	const char *version					= "UNKNOWN";	// Allsky version
	bool isLibcamera					= true;			// RPi only
	char const *cmdToUse				= "";			// RPi command to us to take images
	char const *saveDir					= "";			// Directory to save images
	char const *CC_saveDir				= "";			// Directory to save camera controls file
	bool saveCC							= false;		// Save camera controls file?
	bool tty							= false;		// Running on a tty?
	bool preview						= false;		// Display a preview windoe?
	bool daytimeCapture					= false;		// Capture images during daytime?
	char const *timeFormat				= "%Y%m%d %H:%M:%S";

	// To make the code cleaner, comments are only given for daytime variables.
	bool dayAutoExposure				= true;				// Use auto-exposure?
	bool nightAutoExposure				= true;
	long dayMaxAutoExposure_us			= 10 * US_IN_SEC;	// Max exposure in auto-exposure mode
	double temp_dayMaxAutoExposure_ms	= dayMaxAutoExposure_us / US_IN_MS;
	long nightMaxAutoExposure_us		= 60 * US_IN_SEC;
	double temp_nightMaxAutoExposure_ms	= nightMaxAutoExposure_us / US_IN_MS;
	long dayExposure_us					= 0.3 * US_IN_SEC;	// Exposure requested by user
	double temp_dayExposure_ms			= dayExposure_us / US_IN_MS;
	long nightExposure_us				= 20 * US_IN_SEC;
	double temp_nightExposure_ms		= nightExposure_us / US_IN_MS;
	long dayBrightness					= NOT_CHANGED;		// Brightness requested by user
	long nightBrightness				= NOT_CHANGED;
	long dayDelay_ms					= 10 * MS_IN_SEC;	// Delay between capture end and start
	long nightDelay_ms					= 10 * MS_IN_SEC;
	bool dayAutoGain					= true;				// Use auto-gain?
	bool nightAutoGain					= true;
	double dayMaxAutoGain				= NOT_CHANGED;		// Max gain in auto-gain mode
	double nightMaxAutoGain				= NOT_CHANGED;
	double dayGain						= NOT_CHANGED;		// Gain requested by user
	double nightGain					= NOT_CHANGED;
	long dayBin							= 1;				// Bin requested by user
	long nightBin						= 1;
	bool dayAutoAWB						= false;			// Use auto AWB?
	bool nightAutoAWB					= false;
	double dayWBR						= NOT_CHANGED;		// Red balance requested by user
	double nightWBR						= NOT_CHANGED;
	double dayWBB						= NOT_CHANGED;		// Blue balance requested by user
	double nightWBB						= NOT_CHANGED;
	long daySkipFrames					= 5;				// # images to skip when starting
	long nightSkipFrames				= 1;
	bool dayEnableCooler				= false;			// Enable the cooler?
	bool nightEnableCooler				= false;
	long dayTargetTemp					= 0;				// Target temp when cooler is enabled
	long nightTargetTemp				= 0;

	double saturation					= NOT_CHANGED;
	double contrast						= NOT_CHANGED;
	double sharpness					= NOT_CHANGED;
	long gamma							= 50;
	long offset							= 0;
	long aggression						= 75;
	long gainTransitionTime				= 5;
	long width							= 0;				// use full sensor width
	long height							= 0;				// use full sensor height
	long imageType						= AUTO_IMAGE_TYPE;
	char const *sType					= "";				// string version of imageType
	char const *imageExt				= "jpg";			// image extension
	long qualityJPG						= 95;
	long qualityPNG						= 3;
	long quality						= qualityJPG;
	bool asiAutoBandwidth				= true;
	long minAsiBandwidth				= 40;
	long maxAsiBandwidth				= 100;
	long asiBandwidth					= 40;
	char const *fileName				= "image.jpg";
		char fileNameOnly[50]			= { 0 };
		// final name of the file that's written to disk, with no directories
		char finalFileName[200]			= { 0 };
		// full name of file written to disk
		char fullFilename[1000]			= { 0 };
	long rotation						= 0;
	long flip							= 0;
	bool notificationImages				= true;
	char const *tempType				= "C";
	char const *latitude				= "";
	char const *longitude				= "";
	float angle							= -6.0;
	bool takingDarkFrames				= false;
	char const *locale					= "en_US.UTF-8";
	long debugLevel						= 1;
	bool consistentDelays				= true;
	bool videoOffBetweenImages			= true;
	char const *ASIversion				= "UNKNOWN";		// calculated value

	struct overlay overlay;
	struct myModeMeanSetting myModeMeanSetting;
	struct HB HB;							// Histogram Box, ZWO only

	// Current values - may vary between day and night
	bool currentAutoExposure;
	long currentMaxAutoExposure_us;
	long currentExposure_us;
	long currentBrightness;
	int currentDelay_ms;
	bool currentAutoGain;
	double currentMaxAutoGain;
	double currentGain;
	long currentBin;
	bool currentAutoAWB;
	double currentWBR, currentWBB;
	long currentSkipFrames;
	bool currentEnableCooler;
	long currentTargetTemp;
};

// Global variables and functions.
extern char debug_text[];
extern char allskyHome[];
extern std::string dayOrNight;
extern bool gotSignal;
extern bool bDisplay;
extern pthread_t threadDisplay;
extern config cg;

void cvText(cv::Mat, const char *, int, int, double,
	int, int,
	int, int [], int, bool, int);
timeval getTimeval();
char *formatTime(timeval, char const *);
char *getTime(char const *);
double time_diff_us(int64, int64);
long timeval_diff_us(timeval, timeval);
std::string exec(const char *);
void add_variables_to_command(char *, timeval,
	long, int, float,
	bool, bool, bool, float, float,
	int, float, int, const char *, int, int);
const char *checkForValidExtension(const char *, int);
std::string calculateDayOrNight(const char *, const char *, float);
int calculateTimeToNightTime(const char *, const char *, float);
void Log(int, const char *, ...);
char const *c(char const *);
void closeUp(int);
char const *yesNo(bool);
char *length_in_units(long, bool);
int doOverlay(cv::Mat, config, char *,
	long, int, float, int, float, int);
bool getBoolean(const char *);
double get_focus_metric(cv::Mat);
char const *getFlip(int);
void closeUp(int);
void sig(int);
void IntHandle(int);
int stopVideoCapture(int);
bool validateLong(long *, long, long, char const *, bool);
bool validateFloat(double *, double, double, char const *, bool);
void displayHeader(config);
void displayHelp(config);
void displaySettings(config);
char *LorF(double, char const *, char const *);
bool daytimeSleep(bool, config);
void delayBetweenImages(config, long, std::string);
void setDefaults(config *, cameraType);
bool getCommandLineArguments(config *, int, char *[]);
