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
#define DEFAULT_NOTIFICATIONIMAGES	true
#define DEFAULT_SAVEDIR				"tmp"
#define DEFAULT_FILENAME			"image.jpg"
#define DEFAULT_TIMEFORMAT			"%Y%m%d %H:%M:%S"	// format to display time in
#define DEFAULT_LOCALE				"en_US.UTF-8"
#define AUTO_IMAGE_TYPE				99	// must match what's in the camera_settings.json file
#define DEFAULT_IMAGE_TYPE			AUTO_IMAGE_TYPE
#define DEFAULT_DAYTIMECAPTURE		false	// Capture images during the day?
#define DEFAULT_WIDTH				0
#define DEFAULT_HEIGHT				0
#define	DEFAULT_LONGITUDE			""
#define DEFAULT_LATITUDE			""
#define DEFAULT_ANGLE				"-6"

// Default overlay values - will go away once external overlay program is implemented
#define DEFAULT_FONTNUMBER			0
#define DEFAULT_ITEXTX				15
#define DEFAULT_ITEXTY				25
#define DEFAULT_ITEXTLINEHEIGHT		30
#define SMALLFONTSIZE_MULTIPLIER	0.08
#define DEFAULT_LINEWIDTH			1
#define DEFAULT_OUTLINEFONT			false
#define DEFAULT_LINENUMBER			0
#define DEFAULT_SHOWTIME			true	// Show the date/time in the overlay?

// Exit codes.  Need to match what's in allsky.sh
#define EXIT_OK				0
#define EXIT_RESTARTING		98		// process is restarting, i.e., stop, then start
#define EXIT_RESET_USB		99		// need to reset USB bus; cannot continue
#define EXIT_ERROR_STOP		100		// Got an unrecoverable ERROR

// Global variables and functions.
extern int debugLevel;
extern char debug_text[];
extern bool tty;
extern bool notificationImages;
extern std::string dayOrNight;

void cvText(cv::Mat, const char *, int, int, double,
	int, int,
	int, int [], int, bool, int);
timeval getTimeval();
char *formatTime(timeval, char const *);
char *getTime(char const *);
double time_diff_us(int64, int64);
long timeval_diff_us(timeval, timeval);
std::string exec(const char *);
void add_variables_to_command(char *, long, int, float,
	bool, bool, bool, float, float,
	int, float, int,
	int, int, int, int);
const char *checkForValidExtension(const char *, int);
std::string calculateDayOrNight(const char *, const char *, const char *);
int calculateTimeToNightTime(const char *, const char *, const char *);
void Log(int, const char *, ...);
char const *c(char const *);
void closeUp(int);
char const *yesNo(bool);
char *length_in_units(long, bool);
int doOverlay(cv::Mat,
	bool, char *,
	bool, long, bool,
	bool, int, const char *,
	bool, float, bool, int,
	bool, float,
	bool, int,
	bool, int,
	const char *, const char *, int,
	int, int, int, int, int,
	int, int, int, int,
	int[], int[], bool, int);
bool getBoolean(const char *);
