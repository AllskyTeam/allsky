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
// NO_DEFAULT items don't have a default value.
// and we can't use NOT_SET because -1 may be a legal value.
// IS_DEFAULT means the value is the same as the camera default, so don't pass to camera program
// since it'll use the default anyway.
#define NOT_SET						-1
#define NOT_CHANGED					-999999
#define NO_DEFAULT					-999998
#define	IS_DEFAULT					NOT_CHANGED

// Defaults
#define NO_MAX_VALUE				9999999		// signifies a number has no maximum value
#define AUTO_IMAGE_TYPE				99	// must match what's in the camera_settings.json file

#define DEFAULT_DAYMEAN_RPi				0.5	// target value
#define DEFAULT_DAYMEAN_THRESHOLD_RPi	0.1	// mean brightness must be within this % to be "ok"
#define DEFAULT_NIGHTMEAN_RPi			0.2	// target value
#define DEFAULT_NIGHTMEAN_THRESHOLD_RPi	0.1	// target value
#define DEFAULT_MEAN_P0_RPi				5.0
#define DEFAULT_MEAN_P1_RPi				20.0
#define DEFAULT_MEAN_P2_RPi				45.0
#define DEFAULT_MINMEAN_P_RPi			0.0
#define DEFAULT_MAXMEAN_P_RPi			50.0
#define DEFAULT_MINMEAN_RPi				0.0
#define DEFAULT_MAXMEAN_RPi				1.0
#define DEFAULT_MINMEAN_THRESHOLD_RPi	0.0
#define DEFAULT_MAXMEAN_THRESHOLD_RPi	1.0

// Got these by trial and error. 128 is more-or-less half the max of 255.
#define DEFAULT_DAYMEAN_ZWO				(128.0 / 255)	// matches old way
#define DEFAULT_DAYMEAN_THRESHOLD_ZWO	(6.0 / 255)		// matches old way
#define DEFAULT_NIGHTMEAN_ZWO			(75.0 / 255)	// TODO: pure guess as of May 22, 2023
#define DEFAULT_NIGHTMEAN_THRESHOLD_ZWO	(6.0 / 255)
#define DEFAULT_MEAN_P0_ZWO				5.0		// TODO: set after porting modemean to ZWO
#define DEFAULT_MEAN_P1_ZWO				20.0	// TODO: set after porting modemean to ZWO
#define DEFAULT_MEAN_P2_ZWO				45.0	// TODO: set after porting modemean to ZWO
#define DEFAULT_MINMEAN_P_ZWO			0.0		// TODO: set after porting modemean to ZWO
#define DEFAULT_MAXMEAN_P_ZWO			50.0	// TODO: set after porting modemean to ZWO
#define DEFAULT_MINMEAN_ZWO				DEFAULT_MINMEAN_RPi
#define DEFAULT_MAXMEAN_ZWO				DEFAULT_MAXMEAN_RPi
#define DEFAULT_MINMEAN_THRESHOLD_ZWO	DEFAULT_MINMEAN_THRESHOLD_RPi
#define DEFAULT_MAXMEAN_THRESHOLD_ZWO	DEFAULT_MAXMEAN_THRESHOLD_RPi

// Default overlay values - will go away once external overlay program is implemented
#define SMALLFONTSIZE_MULTIPLIER	0.08

// Exit codes.  Need to match what's in allsky.sh
#define EXIT_OK						0
#define EXIT_RESTARTING				98		// Process is restarting, i.e., stop, then start
#define EXIT_RESET_USB				99		// Need to reset USB bus; cannot continue
#define EXIT_ERROR_STOP				100		// Got an unrecoverable ERROR
#define EXIT_NO_CAMERA				101		// Could not find a camera - is unrecoverable

enum extType {
	isJPG,
	isPNG
};

enum isDayOrNight {
	isDay,
	isNight
};

enum cameraType {
	ctZWO,
	ctRPi
};

enum ZWOexposure {
	ZWOsnap,		// snapshot mode
	ZWOvideoOff,	// video mode with video off between shots
	ZWOvideo,		// video mode with video on all the time (original method)
	ZWOend
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
	bool showMean						= false;
	bool showFocus						= false;
	bool showHistogramBox				= false;
	bool showUSB						= false;
	int overlayMethod					= NOT_SET;
};
#define OVERLAY_METHOD_LEGACY			0
#define OVERLAY_METHOD_MODULE			1

// Histogram Box, ZWO only
struct HB {
	bool useHistogram					= false;		// Should we use histogram auto-exposure?
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
	char const *sArgs					= "500 500 50 50";		// string version of arguments
};

struct myModeMeanSetting {
	bool modeMean						= false;		// currently using it?
	double dayMean						= NOT_SET;		// initialized at runtime
	double nightMean					= NOT_SET;		// initialized at runtime
	double currentMean					= NOT_SET;		// holds either day or night mean

	double Mean							= NOT_SET;		// calculated value after exposure
	double minMean						= NOT_SET;		// initialized at runtime
	double maxMean						= NOT_SET;		// initialized at runtime

	double dayMean_threshold			= NOT_SET;		// initialized at runtime
	double nightMean_threshold			= NOT_SET;		// initialized at runtime
	double currentMean_threshold		= NOT_SET;		// holds either day or night threshold
	double minMean_threshold			= NOT_SET;		// initialized at runtime
	double maxMean_threshold			= NOT_SET;		// initialized at runtime

	// ExposureChange (Steps) = p0 + p1 * diff + (p2*diff)^2
	double mean_p0						= NOT_SET;		// initialized at runtime
	double mean_p1						= NOT_SET;		// initialized at runtime
	double mean_p2						= NOT_SET;		// initialized at runtime
	double minMean_p					= NOT_SET;		// initialized at runtime
	double maxMean_p					= NOT_SET;		// initialized at runtime
};


struct config {			// for configuration variables
	// Some of these variables aren't settings, but are temporary variables that need to be
	// passed around.
	char const *ME						= "";			// name of program running

	// Camera number, type and model
	int numCameras						= 0;			// Number of cameras physically connected
	int cameraNumber					= 0;			// 0 to number-of-cameras-attached minus 1
	cameraType ct						= ctRPi;
	char const *cm						= "";

	// Settings can be in the config file and/or command-line.
	char const *allskyHome				= "";			// full pathname to home of Allsky
	char const *configFile				= "";

	bool isColorCamera					= false;		// Is the camera color or mono?
	bool isCooledCamera					= false;		// Does the camera have a cooler?
	bool supportsTemperature			= false;		// Does the camera have a temp sensor?
	double divideTemperatureBy			= NOT_SET;		// How much to divided the reported temp by
	bool supportsAggression				= false;		// currently ZWO only
	bool supportsMyModeMean				= false;
	bool supportsAutoFocus				= false;
	bool gainTransitionTimeImplemented	= false;		// currently ZWO only
	bool imagesSavedInBackground		= false;		// are images save in background?

	// These are camera-specific and are here because they are used in a lot of places.
	long cameraMinExposure_us			= NOT_SET;		// Minimum exposure
	long cameraMaxExposure_us			= NOT_SET;		// Maximum exposure
	long cameraMaxAutoExposure_us		= NOT_SET;		// Maximum exposure in auto-exposure mode
	double cameraMinGain				= NOT_SET;		// Minimum gain

	// The following settings are based on command-line arguments.
	bool help							= false;		// User wants usage message displayed
	bool quietExit						= false;		// Exit without any messages
	const char *version					= "UNKNOWN";	// Allsky version
	bool isLibcamera					= true;			// RPi only
	char const *cmdToUse				= NULL;			// RPi command to us to take images
	char const *saveDir					= NULL;			// Directory to save images
	char const *CC_saveFile				= NULL;			// File to save camera controls to
	bool saveCC							= false;		// Save camera controls file?
	bool tty							= false;		// Running on a tty?
	bool preview						= false;		// Display a preview windoe?
	char const *timeFormat				= "%Y%m%d %H:%M:%S";
	char const *extraArgs				= "";			// Optional extra arguments passed on
	bool determineFocus					= false;

	// To make the code cleaner, comments are only given for daytime variables.

	// Settings not camera-dependent.
	bool daytimeCapture					= true;			// Capture images during daytime?
	bool daytimeSave					= false;		// Save images during daytime?
	bool nighttimeCapture				= true;
	bool nighttimeSave					= true;
	long dayDelay_ms					= 10 * MS_IN_SEC;	// Delay between capture end and start
	long nightDelay_ms					= 10 * MS_IN_SEC;
	long minDelay_ms					= NOT_SET;			// Minimum delay between images
	long daySkipFrames					= 5;				// # images to skip when starting
	long nightSkipFrames				= 1;
	bool dayEnableCooler				= false;			// Enable the cooler?
	bool nightEnableCooler				= false;
	long aggression						= 85;
	long gainTransitionTime				= 5;
	long width							= 0;				// use full sensor width
	long height							= 0;				// use full sensor height
	long imageType						= AUTO_IMAGE_TYPE;
	char const *sType					= "";				// string version of imageType
	char const *imageExt				= "jpg";			// image extension
	extType extensionType				= isJPG;
	long qualityJPG						= 95;
	long qualityPNG						= 3;
	long quality						= qualityJPG;
	long userQuality					= qualityJPG;		// quality entered by user

	// Camera-dependent settings.  Numeric values will be checked for validity.
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
	long dayTargetTemp					= NOT_CHANGED;		// Target temp when cooler is enabled
	long nightTargetTemp				= NOT_CHANGED;
	char const *dayTuningFile			= NULL;				// Camera tuning file, libcamera only
	char const *nightTuningFile			= NULL;
	double saturation					= NOT_CHANGED;
	double contrast						= NOT_CHANGED;
	double sharpness					= NOT_CHANGED;
	long gamma							= NOT_CHANGED;
	bool asiAutoBandwidth				= true;
	long asiBandwidth					= NOT_CHANGED;
	char const *fileName				= "image.jpg";		// value user specified
		// name of file without any extension, e.g., "image"
		char fileNameOnly[50]			= { 0 };
		// final name of the file that's written to disk, with no directories
		char finalFileName[200]			= { 0 };
		// full name of file written to disk
		char fullFilename[1000]			= { 0 };
	long rotation						= 0;
	long flip							= 0;
	bool notificationImages				= true;
	char const *tempType				= "C";
	char const *latitude				= NULL;
	char const *longitude				= NULL;
	float angle							= -6.0;
	bool takeDarkFrames					= false;
	char const *locale					= NULL;
	long debugLevel						= 1;
	bool consistentDelays				= true;
	char const *ASIversion				= "UNKNOWN";		// calculated value
	bool videoOffBetweenImages			= true;
	ZWOexposure ZWOexposureType			= ZWOsnap;

	struct overlay overlay;
	struct myModeMeanSetting myModeMeanSetting;
	struct HB HB;							// Histogram Box, ZWO only

	// Default values used in multiple places, so get just once.
	// Only include variables that we pass to the capture routine/program.
	int defaultFlip						= NOT_SET;
	int defaultRotation					= NOT_SET;
	int	defaultBin						= NOT_SET;
	double defaultGain					= NOT_SET;
	double defaultWBR					= NOT_SET;
	double defaultWBB					= NOT_SET;
	double defaultSaturation			= NOT_SET;
	double defaultContrast				= NOT_SET;
	double defaultSharpness				= NOT_SET;
	int defaultQuality					= NOT_SET;

	// Current values - may vary between day and night
	bool currentAutoExposure;
	long currentMaxAutoExposure_us;
	long currentExposure_us;
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
	int currentBitDepth;
	char const *currentTuningFile;

	// Last values - from image just taken.  Only for settings that can change image to image.
	long lastExposure_us				= NOT_SET;
	double lastGain						= NOT_SET;
	double lastWBR, lastWBB				= NOT_SET;
	double lastSensorTemp				= NOT_SET;
	long lastFocusMetric				= NOT_SET;
	long lastAsiBandwidth				= NOT_SET;
	double lastMean						= NOT_SET;
	bool goodLastExposure				= false;		// Was the last image propery exposed?
};

// Global variables and functions.
extern char debug_text[];
extern char allskyHome[];
extern std::string dayOrNight;
extern bool gotSignal;
extern bool bDisplay;
extern pthread_t threadDisplay;
extern config CG;
extern std::vector<int>compressionParameters;

void cvText(cv::Mat, const char *, int, int, double,
	int, int,
	int, int [], int, bool, int);
timeval getTimeval();
char *formatTime(timeval, char const *);
char *getTime(char const *);
std::string exec(const char *);
void add_variables_to_command(config, char *, timeval);
bool checkForValidExtension(config *);
std::string calculateDayOrNight(const char *, const char *, float);
int calculateTimeToNextTime(const char *, const char *, float, bool);
void Log(int, const char *, ...);
char const *c(char const *);
void closeUp(int);
char const *yesNo(bool);
char *length_in_units(long, bool);
int doOverlay(cv::Mat, config, char *, int);
bool getBoolean(const char *);
double get_focus_metric(cv::Mat);
char const *getFlip(int);
void closeUp(int);
void IntHandle(int);
int stopVideoCapture(int);
int stopExposure(int);
int closeCamera(int);
bool validateLong(long *, long, long, char const *, bool);
bool validateFloat(double *, double, double, char const *, bool);
void displayHeader(config);
void displayHelp(config);
void displaySettings(config);
char *LorF(double, char const *, char const *);
bool day_night_timeSleep(bool, config, bool);
void delayBetweenImages(config, long, std::string);
bool getCommandLineArguments(config *, int, char *[]);
int displayNotificationImage(char const *);
bool validateLatitudeLongitude(config *);
void doLocale(config *);
char const *getZWOexposureType(ZWOexposure);
