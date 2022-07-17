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

// Defaults
#define NOT_SET						-1				// signifies something isn't set yet
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
	char const *ImgText;
	char const *ImgExtraText;
	long extraFileAge;
	long iTextLineHeight;
	long iTextX, iTextY;					// calculated for day and night
	char const *fontname_s;					// fontnames[fontnumber] (calculated value)
	long fontnumber;
	int fontcolor[3];
	char const *fc;							// string version of fontcolor[]
	int smallFontcolor[3];
	char const *sfc;						// string version of smallfontcolor[]
	int linetype[3];
	long linenumber;
	double fontsize;						// calculated for day and night
	long linewidth;							// calculated for day and night
	bool outlinefont;
	bool showTime;
	bool showExposure;
	bool showTemp;
	bool showGain;
	bool showBrightness;
	bool showMean;
	bool showFocus;
	bool showHistogramBox;
	bool externalOverlay;
};

// Histogram Box, ZWO only
struct HB {
	int histogramBoxSizeX;				// width of box in pixels
	int currentHistogramBoxSizeX;		// day and night values can be different
	int histogramBoxSizeY;				// height of box in pixels
	int currentHistogramBoxSizeY;		// day and night values can be different
	float histogramBoxPercentFromLeft;	// e.g., 25% means left side starts 25% of the image width
	float histogramBoxPercentFromTop;	// ditto for top percent
	int centerX, centerY;				// center X and Y pixel (calculated value)
	int leftOfBox, topOfBox;			// top left pixel (calculated value)
	int rightOfBox, bottomOfBox;		// bottom right pixel (calculated value)
	char const *sArgs;					// string version of arguments
};

struct myModeMeanSetting {
	bool modeMean;
	double nightMean, dayMean;
	double currentMean;
	double Mean;						// (calculated value)
	double mean_threshold;
	double mean_p0, mean_p1, mean_p2;
};


struct config {			// for configuration variables
	// Camera number, type and model
	int cameraNumber;						// 0 to number-of-cameras-attached minus 1
	cameraType ct;
	char const *cm;

	bool isColorCamera;						// xxx from ASICameraInfo.IsColorCam)
	bool isCooledCamera;					// from ASICameraInfo.IsCoolerCam
	bool supportsTemperature;				// sensor temperature from ASICameraInfo
	bool supportsAggression;				// currently ZWO only
	bool gainTransitionTimeImplemented;		// currently ZWO only
	long cameraMinExposure_us;				// camera's minimum exposure - camera dependent
	long cameraMaxExposure_us;				// camera's maximum exposure - camera dependent
	long cameraMaxAutoExposure_us;			// camera's max auto-exposure

	// The following are settings based on command-line arguments
	bool help;
	bool quietExit;
	const char *version;
	bool isLibcamera;						// RPi only
	char const *saveDir;
	char const *CC_saveDir;	bool saveCC;
	bool tty;
	bool preview;
	bool daytimeCapture;					// capture images during daytime?
	char const *timeFormat;

	bool dayAutoExposure, nightAutoExposure;
	long dayMaxAutoExposure_us, nightMaxAutoExposure_us;
	long dayExposure_us, nightExposure_us;
	long dayBrightness, nightBrightness;
	long dayDelay_ms, nightDelay_ms;
	bool dayAutoGain, nightAutoGain;
	double dayMaxAutoGain, nightMaxAutoGain;
	double dayGain, nightGain;
	long dayBin, nightBin;
	bool dayAutoAWB, nightAutoAWB;
	double dayWBR, nightWBR, dayWBB, nightWBB;
	long daySkipFrames, nightSkipFrames;
	bool dayEnableCooler, nightEnableCooler;
	long dayTargetTemp, nightTargetTemp;
	// These are entered in ms and we convert to us later
	double temp_dayExposure_ms;
	double temp_nightExposure_ms;
	double temp_dayMaxAutoExposure_ms;
	double temp_nightMaxAutoExposure_ms;

	double saturation;
	long gamma;
	long offset;
	long aggression;
	long gainTransitionTime;
	long width, height;						// image width and height
	long imageType;
	char const *sType;						// string version of imageType
	long quality, qualityJPG, qualityPNG;
	bool asiAutoBandwidth;
	long asiBandwidth, minAsiBandwidth, maxAsiBandwidth;
	char const *fileName;
		char fileNameOnly[50];
		// final name of the file that's written to disk, with no directories
		char finalFileName[200];
		// full name of file written to disk
		char fullFilename[1000];
	long rotation;
	long flip;
	bool notificationImages;
	char const *tempType;
	char const *latitude, *longitude;
	float angle;
	bool takingDarkFrames;
	char const *locale;
	long debugLevel;
	bool consistentDelays;
	bool videoOffBetweenImages;
	char const *ASIversion;					// calculated value

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
char const *getCameraCommand(bool);
void getCommandLineArguments(config *, int, char *[]);
