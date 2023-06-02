// This file is #include'd into the capture*.cpp files.
// The CAMERA_TYPE #define must be set.
// For the RPi, functions that mimic the ZWO "ASI" functions were added so the capture
// code for both cameras can be as similar as possible.

#if !defined(CAMERA_TYPE)
#error ERROR: CAMERA_TYPE not defined
#endif

// Forward definitions of variables in capture*.cpp.
extern int iNumOfCtrl;

//-----------------------------------------------------------------------------------------
// Info and routines for RPi only
//-----------------------------------------------------------------------------------------

#ifdef IS_RPi

// Mirror the ZWO structs as much as possible to keep the code similar (including the "ASI" in the names).
typedef enum ASI_BOOL{
	ASI_FALSE =0,
	ASI_TRUE
} ASI_BOOL;

typedef enum ASI_BAYER_PATTERN {
	BAYER_RG=0,
	BAYER_BG,
	BAYER_GR,
	BAYER_GB
} ASI_BAYER_PATTERN;

typedef enum ASI_IMG_TYPE {	// Supported Video/Image Formats
	ASI_IMG_RAW8 = 0,
	ASI_IMG_RGB24,
	ASI_IMG_RAW16,
	ASI_IMG_Y8,
	ASI_IMG_END = -1
} ASI_IMG_TYPE;

typedef struct ASI_CAMERA_INFO
{
	char Module[100];		// sensor type; RPi only
	size_t Module_len;		// strncmp length.  0 for whole Module name
	char Name[64];			// Name of camera
	int CameraID;
	long MaxHeight;			// sensor height
	long MaxWidth;
	ASI_BOOL IsColorCam;		// Is this a color camera?
	ASI_BAYER_PATTERN BayerPattern;
	int SupportedBins[5];	// 1 means bin 1x1 is supported, 2 means 2x2 is supported, etc.
	ASI_IMG_TYPE SupportedVideoFormat[8];	// Supported image formats
	double PixelSize;		// e.g, 5.6 um
	ASI_BOOL IsCoolerCam;
	int BitDepth;
	ASI_BOOL SupportsTemperature;
	ASI_BOOL SupportsAutoFocus;	// RPi only
} ASI_CAMERA_INFO;


// The number and order of these needs to match argumentNames[]
typedef enum ASI_CONTROL_TYPE{ //Control type
	ASI_GAIN = 0,
	ASI_EXPOSURE,
	ASI_WB_R,
	ASI_WB_B,
	ASI_TEMPERATURE,
	ASI_FLIP,
	ASI_AUTO_MAX_GAIN,				// Max gain in auto-gain mode
	ASI_AUTO_MAX_EXP,				// Max exposure in auto-exposure mode, in ms
	ASI_AUTO_TARGET_BRIGHTNESS,

	// RPI only:
	SATURATION,
	CONTRAST,
	SHARPNESS,
	EV,

	// Put ZWO ones here - they need to be defined
	ASI_GAMMA,
	ASI_OFFSET,
	ASI_BANDWIDTHOVERLOAD,			// ZWO only
	ASI_COOLER_POWER_PERC,
	ASI_TARGET_TEMP,
	ASI_COOLER_ON,
	ASI_FAN_ON,

	CONTROL_TYPE_END
} ASI_CONTROL_TYPE;


typedef struct _ASI_CONTROL_CAPS
{
	char Name[64];					// the name of the Control like Exposure, Gain etc..
	char Description[128];			// description of this control
	double MaxValue;				// "long" on ZWO
	double MinValue;				// "long" on ZWO
	double DefaultValue;			// "long" on ZWO
	double CurrentValue;			// mimic getting value from camera
	bool IsAutoSupported;			// 1 means this capability support auto mode
	bool IsWritable;				// some controls like temperature can only be read by some cameras 
	ASI_CONTROL_TYPE ControlType;	// this is used to get value and set value of the control
} ASI_CONTROL_CAPS;

typedef enum ASI_ERROR_CODE {
	ASI_SUCCESS=0,
	ASI_ERROR_INVALID_INDEX,		// no camera connected or index value out of boundary
	ASI_ERROR_INVALID_CONTROL_TYPE,	// invalid control type, usually because control isn't supported
	ASI_ERROR_GENERAL_ERROR,		// general error, eg: value is out of valid range
	ASI_ERROR_END
} ASI_ERROR_CODE;

typedef struct _ASI_ID {
	unsigned char id[8];
} ASI_ID;
typedef ASI_ID ASI_SN;

// We vary somewhat from ZWO here:
//	* We must hard-code the values since we can't query the camera.
//	* Some values differ between raspistill and libcamera.

ASI_CAMERA_INFO ASICameraInfoArray[] =
{
	// The CameraID will be updated for the cameras physically connected.

	// Module (sensor), Module_len, Name, CameraID, MaxHeight, MaxWidth, IsColorCam,
		// BayerPattern, SupportedBins, SupportedVideoFormat, PixelSize, IsCoolerCam,
		// BitDepth, SupportsTemperature, SupportAutoFocus
	{ "imx477", 0, "RPi HQ", 0, 3040, 4056, ASI_TRUE,
		// Need ASI_IMG_END so we know where the end of the list is.
		BAYER_RG, {1, 2, 0}, {ASI_IMG_RGB24, ASI_IMG_END}, 1.55, ASI_FALSE,
		12, ASI_FALSE, ASI_FALSE
	},

	// There are many versions of the imx708 (_wide, _noir, _wide_noir, etc.)
	// so just check for "imx708" (6 characters.
	{ "imx708", 6, "RPi Module 3", 0, 2592, 4608, ASI_TRUE,
		BAYER_RG, {1, 2, 0}, {ASI_IMG_RGB24, ASI_IMG_END}, 1.40, ASI_FALSE,
		10, ASI_FALSE, ASI_TRUE
	},

	{ "imx290", 0, "imx290 60.00 fps", 0, 1920, 1080, ASI_TRUE,
		BAYER_RG, {1, 2, 0}, {ASI_IMG_RGB24, ASI_IMG_END}, 2.9, ASI_FALSE,
		12, ASI_FALSE, ASI_FALSE
	},

	{ "imx519", 0, "ArduCam 16 MP", 0, 3496, 4656, ASI_TRUE,
		BAYER_RG, {1, 2, 0}, {ASI_IMG_RGB24, ASI_IMG_END}, 1.22, ASI_FALSE,
		10, ASI_FALSE, ASI_TRUE
	},

	{ "arducam_64mp", 0, "ArduCam 64 MP", 0, 6944, 9152, ASI_TRUE,
		BAYER_RG, {1, 2, 0}, {ASI_IMG_RGB24, ASI_IMG_END}, 0.8, ASI_FALSE,
		10, ASI_FALSE, ASI_TRUE
	},

	// FUTURE CAMERAS GO HERE...
};
int const ASICameraInfoArraySize =  sizeof(ASICameraInfoArray) / sizeof(ASI_CAMERA_INFO);

// This array will be populated with pointers to ASICameraInfoArray[] for the camera(s)
// physically connected to the Pi.
// This way, the "number of cameras" is the same as the size of valid entries in
// RPiCameras[], and the pointer to the camera we're using will always be <= number of cameras.
// For example, if a imx477 and imx519 are physicall connected,
// RPiCameras[] will have two pointers into ASICameraInfoArray[]
// and two pointers into those camera's ControlCapsArray[] entries.
struct RPI_CAMERAS
{
	ASI_CAMERA_INFO *CameraInfo;
	ASI_CONTROL_CAPS *ControlCaps;
} RPiCameras[ASICameraInfoArraySize];


// The number and order of these need to match what's in the ControlCapsArray.

// Control type name, command-line argument name (without leading "day" and "night").
// ControlType is the array index.
// NULL argument name means there is not a command-line argument for it.
char const *argumentNames[][2] = {
	{ "Gain", "gain" },							// day/night
	{ "Exposure", "exposure" },					// day/night
	{ "WB_R", "wbr" },							// day/night
	{ "WB_B", "wbb" },							// day/night
	{ "Temperature", "" },						// read-only so no argument
	{ "Flip", "flip" },
	{ "AutoExpMaxGain", "maxautogain" },		// day/night
	{ "AutoExpMaxExpMS", "maxautoexposure" },	// day/night
	{ "Brightness", "brightness" },
	{ "Saturation", "saturation" },
	{ "Contrast", "contrast" },
	{ "Sharpness", "sharpness" },
	{ "ExposureCompensation", "ev" },

	{ "NEW", "" } // In case a new type is added we won't get an error
};

#define MAX_NUM_CONTROL_CAPS (CONTROL_TYPE_END)
ASI_CONTROL_CAPS ControlCapsArray[][MAX_NUM_CONTROL_CAPS] =
{
	// Each camera model has 2 entries, one for libcamera and one for raspistill.
	// They need to be in that order and in the same order as in ASICameraInfoArray[].

	// The "Name" must match what ZWO uses; "" names means not supported.
	// 99 == don't know

	// Name, Description, MaxValue, MinValue, DefaultValue, CurrentValue, IsAutoSupported, IsWritable, ControlType
	{ // imx477, libcamera		THIS MUST BE THE FIRST CAMERA
		{ "Gain", "Gain", 16.0, 1, 1, NOT_SET, ASI_TRUE, ASI_TRUE, ASI_GAIN },
		{ "Exposure", "Exposure Time (us)", 230 * US_IN_SEC, 1, 10000, NOT_SET, ASI_TRUE, ASI_TRUE, ASI_EXPOSURE },
		{ "WB_R", "White balance: Red component", 10.0, 0.1, 2.5, NOT_SET, ASI_TRUE, ASI_TRUE, ASI_WB_R },
		{ "WB_B", "White balance: Blue component", 10.0, 0.1, 2.0, NOT_SET, ASI_TRUE, ASI_TRUE, ASI_WB_B },
		{ "Temperature", "Sensor Temperature", 80, -20, NOT_SET, NOT_SET, ASI_FALSE, ASI_FALSE, ASI_TEMPERATURE },
		{ "Flip", "Flip: 0->None, 1->Horiz, 2->Vert, 3->Both", 3, 0, 0, NOT_SET, ASI_FALSE, ASI_TRUE, ASI_FLIP },
		{ "AutoExpMaxGain", "Auto exposure maximum gain value", 16.0, 1, 16.0, NOT_SET, ASI_FALSE, ASI_TRUE, ASI_AUTO_MAX_GAIN },
		{ "AutoExpMaxExpMS", "Auto exposure maximum exposure value (ms)", 230 * MS_IN_SEC, 1, 60 * MS_IN_SEC, NOT_SET, ASI_FALSE, ASI_TRUE, ASI_AUTO_MAX_EXP },
		{ "ExposureCompensation", "Exposure Compensation", 10.0, -10.0, 0, NOT_SET, ASI_FALSE, ASI_TRUE, EV },
		// These are the same for all libcamera cameras.
		{ "Brightness", "Brightness", 1.0, -1.0, 0, NOT_SET, ASI_FALSE, ASI_TRUE, ASI_AUTO_TARGET_BRIGHTNESS },
		{ "Saturation", "Saturation", 15.99, 0.0, 1.0, NOT_SET, ASI_FALSE, ASI_TRUE, SATURATION },
		{ "Contrast", "Contrast", 15.99, 0.0, 1.0, NOT_SET, ASI_FALSE, ASI_TRUE, CONTRAST },
		{ "Sharpness", "Sharpness", 15.99, 0.0, 1.0, NOT_SET, ASI_FALSE, ASI_TRUE, SHARPNESS },

		{ "End", "End", 0.0, 0.0, 0.0, 0.0, ASI_FALSE, ASI_FALSE, CONTROL_TYPE_END },	// Signals end of list
	},
	{ // imx477, raspistill.  Minimum width and height are 64.
		{ "Gain", "Gain", 16.0, 1, 1, NOT_SET, ASI_TRUE, ASI_TRUE, ASI_GAIN },
		{ "Exposure", "Exposure Time (us)", 230 * US_IN_SEC, 1, 10000, NOT_SET, ASI_TRUE, ASI_TRUE, ASI_EXPOSURE },
		{ "WB_R", "White balance: Red component", 10.0, 0.1, 2.5, NOT_SET, ASI_TRUE, ASI_TRUE, ASI_WB_R },
		{ "WB_B", "White balance: Blue component", 10.0, 0.1, 2.0, NOT_SET, ASI_TRUE, ASI_TRUE, ASI_WB_B },
		{ "", "Temperature, not supported", NOT_SET, NOT_SET, NOT_SET, NOT_SET, ASI_FALSE, ASI_FALSE, ASI_TEMPERATURE },
		{ "Flip", "Flip: 0->None, 1->Horiz, 2->Vert, 3->Both", 3, 0, 0, NOT_SET, ASI_FALSE, ASI_TRUE, ASI_FLIP },
		{ "AutoExpMaxGain", "Auto exposure maximum gain value", 16.0, 1, 16.0, NOT_SET, ASI_FALSE, ASI_TRUE, ASI_AUTO_MAX_GAIN },
		{ "AutoExpMaxExpMS", "Auto exposure maximum exposure value (ms)", 230 * MS_IN_SEC, 1, 60 * MS_IN_SEC, NOT_SET, ASI_FALSE, ASI_TRUE, ASI_AUTO_MAX_EXP },
		{ "ExposureCompensation", "Exposure Compensation", 10, -10, 0, NOT_SET, ASI_FALSE, ASI_TRUE, EV },
		{ "Brightness", "Brightness", 100, 0, 50, NOT_SET, ASI_FALSE, ASI_TRUE, ASI_AUTO_TARGET_BRIGHTNESS },
		{ "Saturation", "Saturation", 100, -100, 0, NOT_SET, ASI_FALSE, ASI_TRUE, SATURATION },
		{ "Contrast", "Contrast", 100, -100, 0, NOT_SET, ASI_FALSE, ASI_TRUE, CONTRAST },
		{ "Sharpness", "Sharpness", 100, -100, 0, NOT_SET, ASI_FALSE, ASI_TRUE, SHARPNESS },

		{ "End", "End", 0.0, 0.0, 0.0, 0.0, ASI_FALSE, ASI_FALSE, CONTROL_TYPE_END },
	},


	{ // imx708*, libcamera
		{ "Gain", "Gain", 16.0, 1, 1, NOT_SET, ASI_TRUE, ASI_TRUE, ASI_GAIN },
		{ "Exposure", "Exposure Time (us)", 120 * US_IN_SEC, 1, 10000, NOT_SET, ASI_TRUE, ASI_TRUE, ASI_EXPOSURE },
		{ "WB_R", "White balance: Red component", 10.0, 0.1, 2.5, NOT_SET, ASI_TRUE, ASI_TRUE, ASI_WB_R },
		{ "WB_B", "White balance: Blue component", 10.0, 0.1, 2.0, NOT_SET, ASI_TRUE, ASI_TRUE, ASI_WB_B },
		{ "Temperature", "Sensor Temperature", 80, -20, NOT_SET, NOT_SET, ASI_FALSE, ASI_FALSE, ASI_TEMPERATURE },
		{ "Flip", "Flip: 0->None, 1->Horiz, 2->Vert, 3->Both", 3, 0, 0, NOT_SET, ASI_FALSE, ASI_TRUE, ASI_FLIP },
		{ "AutoExpMaxGain", "Auto exposure maximum gain value", 16.0, 1, 16.0, NOT_SET, ASI_FALSE, ASI_TRUE, ASI_AUTO_MAX_GAIN },
		{ "AutoExpMaxExpMS", "Auto exposure maximum exposure value (ms)", 120 * MS_IN_SEC, 1, 60 * MS_IN_SEC, NOT_SET, ASI_FALSE, ASI_TRUE, ASI_AUTO_MAX_EXP },
		{ "ExposureCompensation", "Exposure Compensation", 10.0, -10.0, 0, NOT_SET, ASI_FALSE, ASI_TRUE, EV },
		{ "Brightness", "Brightness", 1.0, -1.0, 0, NOT_SET, ASI_FALSE, ASI_TRUE, ASI_AUTO_TARGET_BRIGHTNESS },
		{ "Saturation", "Saturation", 15.99, 0.0, 1.0, NOT_SET, ASI_FALSE, ASI_TRUE, SATURATION },
		{ "Contrast", "Contrast", 15.99, 0.0, 1.0, NOT_SET, ASI_FALSE, ASI_TRUE, CONTRAST },
		{ "Sharpness", "Sharpness", 15.99, 0.0, 1.0, NOT_SET, ASI_FALSE, ASI_TRUE, SHARPNESS },

		{ "End", "End", 0.0, 0.0, 0.0, 0.0, ASI_FALSE, ASI_FALSE, CONTROL_TYPE_END },
	},
	{ // imx708*, raspistill.  Not supported.
		{ "End", "End", 0.0, 0.0, 0.0, 0.0, ASI_FALSE, ASI_FALSE, CONTROL_TYPE_END },
	},

	{ // imx290, libcamera
		{ "Gain", "Gain", 16.0, 1, 1, NOT_SET, ASI_TRUE, ASI_TRUE, ASI_GAIN },
		{ "Exposure", "Exposure Time (us)", 200 * US_IN_SEC, 1, 10000, NOT_SET, ASI_TRUE, ASI_TRUE, ASI_EXPOSURE },
		{ "WB_R", "White balance: Red component", 10.0, 0.1, 2.5, NOT_SET, ASI_TRUE, ASI_TRUE, ASI_WB_R },
		{ "WB_B", "White balance: Blue component", 10.0, 0.1, 2.0, NOT_SET, ASI_TRUE, ASI_TRUE, ASI_WB_B },
		{ "Temperature", "Sensor Temperature", 80, -20, NOT_SET, NOT_SET, ASI_FALSE, ASI_FALSE, ASI_TEMPERATURE },
		{ "Flip", "Flip: 0->None, 1->Horiz, 2->Vert, 3->Both", 3, 0, 0, NOT_SET, ASI_FALSE, ASI_TRUE, ASI_FLIP },
		{ "AutoExpMaxGain", "Auto exposure maximum gain value", 16.0, 1, 16.0, NOT_SET, ASI_FALSE, ASI_TRUE, ASI_AUTO_MAX_GAIN },
		{ "AutoExpMaxExpMS", "Auto exposure maximum exposure value (ms)", 200 * MS_IN_SEC, 1, 60 * MS_IN_SEC, NOT_SET, ASI_FALSE, ASI_TRUE, ASI_AUTO_MAX_EXP },
		{ "ExposureCompensation", "Exposure Compensation", 10.0, -10.0, 0, NOT_SET, ASI_FALSE, ASI_TRUE, EV },
		{ "Brightness", "Brightness", 1.0, -1.0, 0, NOT_SET, ASI_FALSE, ASI_TRUE, ASI_AUTO_TARGET_BRIGHTNESS },
		{ "Saturation", "Saturation", 15.99, 0.0, 1.0, NOT_SET, ASI_FALSE, ASI_TRUE, SATURATION },
		{ "Contrast", "Contrast", 15.99, 0.0, 1.0, NOT_SET, ASI_FALSE, ASI_TRUE, CONTRAST },
		{ "Sharpness", "Sharpness", 15.99, 0.0, 1.0, NOT_SET, ASI_FALSE, ASI_TRUE, SHARPNESS },

		{ "End", "End", 0.0, 0.0, 0.0, 0.0, ASI_FALSE, ASI_FALSE, CONTROL_TYPE_END },
	},
	{ // imx290, raspistill.  Not supported.
		{ "End", "End", 0.0, 0.0, 0.0, 0.0, ASI_FALSE, ASI_FALSE, CONTROL_TYPE_END },
	},

	{ // imx519, libcamera
		{ "Gain", "Gain", 16.0, 1, 1, NOT_SET, ASI_TRUE, ASI_TRUE, ASI_GAIN },
		{ "Exposure", "Exposure Time (us)", 200 * US_IN_SEC, 1, 10000, NOT_SET, ASI_TRUE, ASI_TRUE, ASI_EXPOSURE },
		{ "WB_R", "White balance: Red component", 10.0, 0.1, 2.5, NOT_SET, ASI_TRUE, ASI_TRUE, ASI_WB_R },
		{ "WB_B", "White balance: Blue component", 10.0, 0.1, 2.0, NOT_SET, ASI_TRUE, ASI_TRUE, ASI_WB_B },
		{ "Temperature", "Sensor Temperature", 80, -20, NOT_SET, NOT_SET, ASI_FALSE, ASI_FALSE, ASI_TEMPERATURE },
		{ "Flip", "Flip: 0->None, 1->Horiz, 2->Vert, 3->Both", 3, 0, 0, NOT_SET, ASI_FALSE, ASI_TRUE, ASI_FLIP },
		{ "AutoExpMaxGain", "Auto exposure maximum gain value", 16.0, 1, 16.0, NOT_SET, ASI_FALSE, ASI_TRUE, ASI_AUTO_MAX_GAIN },
		{ "AutoExpMaxExpMS", "Auto exposure maximum exposure value (ms)", 200 * MS_IN_SEC, 1, 60 * MS_IN_SEC, NOT_SET, ASI_FALSE, ASI_TRUE, ASI_AUTO_MAX_EXP },
		{ "ExposureCompensation", "Exposure Compensation", 10.0, -10.0, 0, NOT_SET, ASI_FALSE, ASI_TRUE, EV },
		{ "Brightness", "Brightness", 1.0, -1.0, 0, NOT_SET, ASI_FALSE, ASI_TRUE, ASI_AUTO_TARGET_BRIGHTNESS },
		{ "Saturation", "Saturation", 15.99, 0.0, 1.0, NOT_SET, ASI_FALSE, ASI_TRUE, SATURATION },
		{ "Contrast", "Contrast", 15.99, 0.0, 1.0, NOT_SET, ASI_FALSE, ASI_TRUE, CONTRAST },
		{ "Sharpness", "Sharpness", 15.99, 0.0, 1.0, NOT_SET, ASI_FALSE, ASI_TRUE, SHARPNESS },

		{ "End", "End", 0.0, 0.0, 0.0, 0.0, ASI_FALSE, ASI_FALSE, CONTROL_TYPE_END },
	},
	{ // imx519, raspistill.  Not supported.
		{ "End", "End", 0.0, 0.0, 0.0, 0.0, ASI_FALSE, ASI_FALSE, CONTROL_TYPE_END },
	},


	{ // arducam_64mp, libcamera
		{ "Gain", "Gain", 16.0, 1, 1, NOT_SET, ASI_TRUE, ASI_TRUE, ASI_GAIN },
		{ "Exposure", "Exposure Time (us)", 200 * US_IN_SEC, 1, 10000, NOT_SET, ASI_TRUE, ASI_TRUE, ASI_EXPOSURE },
		{ "WB_R", "White balance: Red component", 10.0, 0.1, 2.5, NOT_SET, ASI_TRUE, ASI_TRUE, ASI_WB_R },
		{ "WB_B", "White balance: Blue component", 10.0, 0.1, 2.0, NOT_SET, ASI_TRUE, ASI_TRUE, ASI_WB_B },
		{ "Temperature", "Sensor Temperature", 80, -20, NOT_SET, NOT_SET, ASI_FALSE, ASI_FALSE, ASI_TEMPERATURE },
		{ "Flip", "Flip: 0->None, 1->Horiz, 2->Vert, 3->Both", 3, 0, 0, NOT_SET, ASI_FALSE, ASI_TRUE, ASI_FLIP },
		{ "AutoExpMaxGain", "Auto exposure maximum gain value", 16.0, 1, 16.0, NOT_SET, ASI_FALSE, ASI_TRUE, ASI_AUTO_MAX_GAIN },
		{ "AutoExpMaxExpMS", "Auto exposure maximum exposure value (ms)", 200 * MS_IN_SEC, 1, 60 * MS_IN_SEC, NOT_SET, ASI_FALSE, ASI_TRUE, ASI_AUTO_MAX_EXP },
		{ "ExposureCompensation", "Exposure Compensation", 10.0, -10.0, 0, NOT_SET, ASI_FALSE, ASI_TRUE, EV },
		{ "Brightness", "Brightness", 1.0, -1.0, 0, NOT_SET, ASI_FALSE, ASI_TRUE, ASI_AUTO_TARGET_BRIGHTNESS },
		{ "Saturation", "Saturation", 15.99, 0.0, 1.0, NOT_SET, ASI_FALSE, ASI_TRUE, SATURATION },
		{ "Contrast", "Contrast", 15.99, 0.0, 1.0, NOT_SET, ASI_FALSE, ASI_TRUE, CONTRAST },
		{ "Sharpness", "Sharpness", 15.99, 0.0, 1.0, NOT_SET, ASI_FALSE, ASI_TRUE, SHARPNESS },

		{ "End", "End", 0.0, 0.0, 0.0, 0.0, ASI_FALSE, ASI_FALSE, CONTROL_TYPE_END },
	},
	{ // arducam_64mp, raspistill.  Not supported.
		{ "End", "End", 0.0, 0.0, 0.0, 0.0, ASI_FALSE, ASI_FALSE, CONTROL_TYPE_END },
	},

	// FUTURE CAMERAS GO HERE...
};

char camerasInfoFile[128]	= { 0 };	// name of temporary file


// Return the number of cameras PHYSICALLY connected and put basic info on each camera in a file.
// We need the temporary file because it's a quick and dirty way to get output from system().
// TODO: use std::string exec(cmd) from allsky_common.cpp to avoid a temporary file
int ASIGetNumOfConnectedCameras()
{
	// CG.saveDir should be specified, but in case it isn't...
	const char *dir = CG.saveDir;
	if (dir == NULL)
		dir = "/tmp";

	// File to hold info on all the cameras.
	snprintf(camerasInfoFile, sizeof(camerasInfoFile), "%s/%s_cameras.txt", dir, CAMERA_TYPE);

	char cmd[300];
	int num;
	// Put the list of cameras and attributes in a file and return the number of cameras (the exit code).
	if (CG.isLibcamera)
	{
		// --list-cameras" writes to stderr.
		snprintf(cmd, sizeof(cmd), "NUM=$(LIBCAMERA_LOG_LEVELS=FATAL %s --list-cameras 2>&1 | grep -E '^[0-9 ]' | tee '%s' | grep -E '^[0-9] : ' | wc -l); exit ${NUM}", CG.cmdToUse, camerasInfoFile);
	}
	else
	{
		// raspistill doesn't return any info on cameras, so assume only 1 camera attached.
		// Further raspistill only supports RPi HQ camera which we assume to be 1st camera.
		snprintf(cmd, sizeof(cmd), "echo '0 : imx477 [%ldx%ld]' > '%s'; exit 1", ASICameraInfoArray[0].MaxWidth, ASICameraInfoArray[0].MaxHeight, camerasInfoFile);
	}
	num = system(cmd);
	if (WIFEXITED(num))
		num = WEXITSTATUS(num);
	Log(4, "cmd='%s', num=%d\n", cmd, num);
	return(num);
}

/* Sample "libcamera-still --list-cameras" ouput:
	1 : imx477 [4056x3040] (/base/soc/i2c0mux/i2c@1/pca@70/i2c@1/imx477@1a)
    	Modes:	'SRGGB10_CSI2P' : 1332x990
 	          	'SRGGB12_CSI2P' : 2028x1080 2028x1520 4056x3040

	Where "Modes" is:
		S<Bayer order><Bit-depth>_<Optional packing> : <Resolution list>
	Command line:   --mode <width>:<height>:<bit-depth>:<packing>
		(bit-depth and packing are optional)
	Some cameras also have additional resolutions for a given mode.
*/


// Get the cameraNumber for the camera we're using.
int getCameraNumber()
{
	// Determine which camera sensor(s) we have by reading the file created in ASIGetNumOfConnectedCameras().
	if (camerasInfoFile[0] == '\0')
	{
		Log(0, "ERROR: camerasInfoFile not created!\n");
		closeUp(EXIT_ERROR_STOP);
	}
	FILE *f = fopen(camerasInfoFile, "r");
	if (f == NULL)
	{
		Log(0, "ERROR: Unable to open '%s': %s\n", camerasInfoFile, strerror(errno));
		closeUp(EXIT_ERROR_STOP);
	}

	char line[256];
	int num = NOT_SET;
#define SENSOR_STRING_SIZE	25
	char sensor[SENSOR_STRING_SIZE];
	int actualIndex;					// index into ASICameraInfoArray[]
	int RPiCameraIndex = -1;			// index into RPiCameras[]

	// For each camera found, update the next *RPiCameras[] entry to point to the
	// camera's ASICameraInfoArray[] entry.
	// Return the index into *RPiCameras[] of the attached camera we're using.
	while (fgets(line, sizeof(line)-1, f) != NULL)
	{
		// Sample line:     0 : imx477 [4056x3040] ....
		// We only care about first two.
		if (sscanf(line, "%d : %s ", &num, sensor) == 2)
		{
			// Found a camera; check all known cameras to make sure it's one we know about.
			// Unfortunately we don't have anything else to check, like serial number.
			// I suppose we could also check the Modes are the same, but it's not worth it.
			bool foundThisSensor = false;
			for (int i=0; i < ASICameraInfoArraySize; i++)
			{
				// This code tells us how much of the Module name to compare.
				size_t len;
				if (ASICameraInfoArray[i].Module_len > 0)
					len = ASICameraInfoArray[i].Module_len;
				else
					len = sizeof(ASICameraInfoArray[i].Module);

				// Now compare the attached sensor name with what's in our list.
				if (strncmp(sensor, ASICameraInfoArray[i].Module, len) == 0)
				{
					// The sensor is in our list.
					foundThisSensor = true;
					actualIndex = i;
					RPiCameraIndex++;

					RPiCameras[RPiCameraIndex].CameraInfo = &ASICameraInfoArray[actualIndex];
					// There are TWO entries in ControlCapsArray[] for every entry in ASICameraInfoArray[].
					// The first of each pair is for libcamera, the second is for raspistill.
					// We need to return the index into ControlCapsArray[].
					Log(4, "Camera matched ASICameraInfoArray[%d] (RPiCameras[%d]): sensor %s,", actualIndex, RPiCameraIndex, sensor);
					actualIndex = (actualIndex * 2) + (CG.isLibcamera ? 0 : 1);
					RPiCameras[RPiCameraIndex].ControlCaps = &ControlCapsArray[actualIndex][0];
					Log(4, " ControlCapsArray[%d].\n", actualIndex);

					break;
				}
			}
			if (! foundThisSensor) {
				Log(1, "WARNING: Sensor '%s' found but not supported by Allsky.\n", sensor);
			}
		}
	}
	if (RPiCameraIndex == -1)
	{
		Log(0, "ERROR: No RPi cameras found.\n");
		closeUp(EXIT_NO_CAMERA);
	}

	// Caller will determine if this is out of range.
	return(RPiCameraIndex);
}

// Put the properties for the specified camera into pASICameraInfo.
ASI_ERROR_CODE ASIGetCameraProperty(ASI_CAMERA_INFO *pASICameraInfo, int iCameraIndex)
{
	if (iCameraIndex < 0 || iCameraIndex >= CG.numCameras)
	{
		Log(0, "ERROR: ASIGetCameraProperty(), iCameraIndex (%d) bad.\n", iCameraIndex);
		return(ASI_ERROR_INVALID_INDEX);
	}

	*pASICameraInfo = *(RPiCameras[iCameraIndex].CameraInfo);
	return(ASI_SUCCESS);
}


// Get the number of capabilities supported by this camera and put in piNumberOfControls.
ASI_ERROR_CODE ASIGetNumOfControls(int iCameraIndex, int *piNumberOfControls)
{
	if (iCameraIndex < 0 || iCameraIndex >= CG.numCameras)
	{
		Log(0, "ERROR: ASIGetNumOfControls(), iCameraIndex (%d) bad.\n", iCameraIndex);
		return(ASI_ERROR_INVALID_INDEX);
	}

	ASI_CONTROL_CAPS *p = RPiCameras[iCameraIndex].ControlCaps;

	int num = 0;
	for (int i=0; i < MAX_NUM_CONTROL_CAPS; i++)
	{
		if (p[i].ControlType == CONTROL_TYPE_END)
			break;
		num++;
	}
	*piNumberOfControls = num;		// This also sets the global iNumOfCtrl variable
	return(ASI_SUCCESS);
}


// Get the camera control at index iControlIndex in the array, and put in pControlCaps.
// This is typically used in a loop over all the control capabilities.
ASI_ERROR_CODE ASIGetControlCaps(int iCameraIndex, int iControlIndex, ASI_CONTROL_CAPS *pControlCaps)
{
	if (iCameraIndex < 0 || iCameraIndex >= CG.numCameras)
		return(ASI_ERROR_INVALID_INDEX);

	int numCaps = iNumOfCtrl != NOT_SET ? iNumOfCtrl : MAX_NUM_CONTROL_CAPS;
	if (iControlIndex < 0 || iControlIndex > numCaps)
		return(ASI_ERROR_INVALID_CONTROL_TYPE);

	*pControlCaps = RPiCameras[iCameraIndex].ControlCaps[iControlIndex];
	return(ASI_SUCCESS);
}


// Get the specified control capability's data value and put in plValue.
ASI_ERROR_CODE ASIGetControlValue(int iCameraIndex, ASI_CONTROL_TYPE ControlType, double *plValue, ASI_BOOL *pbAuto)
{
	if (iCameraIndex < 0 || iCameraIndex >= CG.numCameras)
		return(ASI_ERROR_INVALID_INDEX);

	int numCaps = iNumOfCtrl != NOT_SET ? iNumOfCtrl : MAX_NUM_CONTROL_CAPS;
	ASI_CONTROL_CAPS *p = RPiCameras[iCameraIndex].ControlCaps;
	for (int i=0; i < numCaps ; i++)
	{
		if (ControlType == p[i].ControlType)
		{
			*plValue = p[i].CurrentValue;
			// It's too much of a hassle to determine if this control type was auto so just return "false".
			// We'd need to see if the control type supports auto and if it was last set to auto (and
			// we're not setting any control values).
			*pbAuto = ASI_FALSE;
		}
		return(ASI_SUCCESS);
	}

	return(ASI_ERROR_INVALID_CONTROL_TYPE);
}


// Empty routine so code compiles.
int stopVideoCapture(int cameraID) { return(ASI_SUCCESS); }

// Get the camera's serial number.  RPi cameras don't support serial numbers.
ASI_ERROR_CODE  ASIGetSerialNumber(int iCameraIndex, ASI_SN *pSN)
{
	if (iCameraIndex < 0 || iCameraIndex >= CG.numCameras)
		return(ASI_ERROR_INVALID_INDEX);

	return(ASI_ERROR_GENERAL_ERROR);		// Not supported on RPi cameras
}


#else		////////////////////// ZWO

// To keep the compiler quiet, we need to define these - they are RPi only.
// It doesn't matter what the value is.
#define SATURATION	(ASI_CONTROL_TYPE) 0
#define CONTRAST	(ASI_CONTROL_TYPE) 0
#define SHARPNESS	(ASI_CONTROL_TYPE) 0
#define EV			(ASI_CONTROL_TYPE) 0

// Same ideas as for RPi but some different options.
// These must match in number and order to the ASI_CONTROL_TYPE enum in ASICamera2.h.
char const *argumentNames[][2] = {
	{ "Gain", "gain" },								// day/night
	{ "Exposure", "exposure" },						// day/night
	{ "Gamma", "gamma" },
	{ "WB_R", "wbr" },								// day/night
	{ "WB_B", "wbb" },								// day/night
	{ "Offset", "offset" },
	{ "BandWidth", "usb" },
	{ "OverCLK" "" },
	{ "Temperature", "" },							// read-only so no argument
	{ "Flip", "flip" },
	{ "AutoExpMaxGain", "maxautogain" },			// day/night
	{ "AutoExpMaxExpMS", "maxautoexposure" },		// day/night
	{ "AutoExpTargetBrightness", "brightness" },	// day/night
	{ "HardwareBin", "" },
	{ "HighSpeedMode", "" },
	{ "CoolerPowerPerc", "" },						// read-only so no argument
	{ "TargetTemp", "TargetTemp" },
	{ "CoolerOn", "EnableCooler" },					// day/night
	{ "MonoBin", "" },
	{ "FanOn", "??" },				// correct Control name?
	{ "PatternAdjust", "" },		// correct Control name?
	{ "AntiDewHeater", "" },		// correct Control name?

	{ "NEW", "" } // In case a new type is added we won't get an error
};

int stopVideoCapture(int cameraID)
{
	return((int) ASIStopVideoCapture(cameraID));
}

int getCameraNumber()
{
	return(CG.cameraNumber);
}

ASI_ID cameraID;	// USB 3 cameras only
unsigned char cID[sizeof(cameraID)+1] = { '[', 'n', 'o', 'n', 'e', ']', 0 };
bool hasCameraID = false;

ASI_ID getCameraID(ASI_CAMERA_INFO camInfo)
{
	// To CLEAR the camera ID:		cameraID.id[0] = '\0'; ASISetID(camInfo.CameraID, cameraID);
	cameraID.id[0] = '\0';
	if (camInfo.IsUSB3Camera == ASI_TRUE && ASIGetID(camInfo.CameraID, &cameraID) == ASI_SUCCESS)
	{
		if (cameraID.id[0] != '\0')
		{
			hasCameraID = true;
			unsigned int i;
			for (i=0; i<sizeof(cameraID.id); i++)
				cID[i] = (char) cameraID.id[i];
			cID[i] = '\0';
		}
	}

	return(cameraID);
}
#endif		// IS_RPi


//-----------------------------------------------------------------------------------------
// Routines common to all camera types
//-----------------------------------------------------------------------------------------


// Display ASI errors in human-readable format
char *getRetCode(ASI_ERROR_CODE code)
{
	static char retCodeBuffer[100];
	std::string ret;

	if (code == ASI_SUCCESS) ret = "ASI_SUCCESS";
	else if (code == ASI_ERROR_INVALID_INDEX) ret = "ASI_ERROR_INVALID_INDEX";
	else if (code == ASI_ERROR_INVALID_CONTROL_TYPE) ret = "ASI_ERROR_INVALID_CONTROL_TYPE";
	else if (code == ASI_ERROR_GENERAL_ERROR) ret = "ASI_ERROR_GENERAL_ERROR";
#ifdef IS_ZWO
	else if (code == ASI_ERROR_INVALID_ID) ret = "ASI_ERROR_INVALID_ID";
	else if (code == ASI_ERROR_CAMERA_CLOSED) ret = "ASI_ERROR_CAMERA_CLOSED";
	else if (code == ASI_ERROR_CAMERA_REMOVED) ret = "ASI_ERROR_CAMERA_REMOVED";
	else if (code == ASI_ERROR_INVALID_PATH) ret = "ASI_ERROR_INVALID_PATH";
	else if (code == ASI_ERROR_INVALID_FILEFORMAT) ret = "ASI_ERROR_INVALID_FILEFORMAT";
	else if (code == ASI_ERROR_INVALID_SIZE) ret = "ASI_ERROR_INVALID_SIZE";
	else if (code == ASI_ERROR_INVALID_IMGTYPE) ret = "ASI_ERROR_INVALID_IMGTYPE";
	else if (code == ASI_ERROR_OUTOF_BOUNDARY) ret = "ASI_ERROR_OUTOF_BOUNDARY";
	else if (code == ASI_ERROR_TIMEOUT)
	{
		static int errorTimeoutCntr = 0;
		// To aid in debugging these errors, keep track of how many we see.
		errorTimeoutCntr += 1;
		ret = "ASI_ERROR_TIMEOUT #" + std::to_string(errorTimeoutCntr) +
			  " (with 0.8 exposure = " + ((CG.videoOffBetweenImages)?("YES"):("NO")) + ")";
	}
	else if (code == ASI_ERROR_INVALID_SEQUENCE) ret = "ASI_ERROR_INVALID_SEQUENCE";
	else if (code == ASI_ERROR_BUFFER_TOO_SMALL) ret = "ASI_ERROR_BUFFER_TOO_SMALL";
	else if (code == ASI_ERROR_VIDEO_MODE_ACTIVE) ret = "ASI_ERROR_VIDEO_MODE_ACTIVE";
	else if (code == ASI_ERROR_EXPOSURE_IN_PROGRESS) ret = "ASI_ERROR_EXPOSURE_IN_PROGRESS";
#endif
	else if (code == ASI_ERROR_END) ret = "ASI_ERROR_END";
	else if (code == -1) ret = "Non-ASI ERROR";
	else ret = "UNKNOWN ASI ERROR";

	sprintf(retCodeBuffer, "%s (%d)", ret.c_str(), (int) code);
	return(retCodeBuffer);
}


// Get the number of cameras PHYSICALLY connected, making sure there's at least one.
void processConnectedCameras()
{
	CG.numCameras = ASIGetNumOfConnectedCameras();
	if (CG.numCameras <= 0)
	{
		Log(0, "*** ERROR: No Connected Camera...\n");
		closeUp(EXIT_NO_CAMERA);		// If there are no cameras we can't do anything.
	}

	CG.cameraNumber = getCameraNumber();
	if (CG.cameraNumber >= CG.numCameras)
	{
		Log(0, "*** ERROR: Camera number %d not connected.  Highest number is %d.\n", CG.cameraNumber, CG.numCameras-1);
		closeUp(EXIT_NO_CAMERA);
	}
	else if (CG.numCameras > 1)
	{
		ASI_CAMERA_INFO info;
		printf("\nAttached Cameras:\n");
		for (int i = 0; i < CG.numCameras; i++)
		{
			ASIGetCameraProperty(&info, i);
			printf("  - %d %s%s\n", i, info.Name, i == CG.cameraNumber ? " (selected)" : "");
		}
	}
}


// Get the camera control with the specified control type.
ASI_ERROR_CODE getControlCapForControlType(int iCameraIndex, ASI_CONTROL_TYPE ControlType, ASI_CONTROL_CAPS *pControlCap)
{
	if (iCameraIndex < 0 || iCameraIndex >= CG.numCameras)
		return(ASI_ERROR_INVALID_INDEX);

	if (iNumOfCtrl == NOT_SET)
		return(ASI_ERROR_GENERAL_ERROR);

	for (int i=0; i < iNumOfCtrl ; i++)
	{
		ASI_CONTROL_CAPS cc;
		ASI_ERROR_CODE ret;
		ret = ASIGetControlCaps(iCameraIndex, i, &cc);
		if (ret != ASI_SUCCESS) {
			Log(3, "ASIGetControlCaps(%d, %i, &cc) failed: %s\n", iCameraIndex, i, getRetCode(ret));
			return(ret);
		}
		if (ControlType == cc.ControlType)
		{
			*pControlCap = cc;
			return(ASI_SUCCESS);
		}
	}

	return(ASI_ERROR_INVALID_CONTROL_TYPE);
}


// Get the camera's serial number, if it has one.
char sn[100] = { 0 };
bool hasSerialNumber = true;

char *getSerialNumber(int camNum)
{
	ASI_SN serialNumber;
	ASI_ERROR_CODE asiRetCode = ASIGetSerialNumber(camNum, &serialNumber);
	if (asiRetCode != ASI_SUCCESS)
	{
		hasSerialNumber = false;
		if (asiRetCode == ASI_ERROR_GENERAL_ERROR)
			snprintf(sn, sizeof(sn), "[not supported]");
		else
			Log(1, "*** WARNING: unable to get camera serial number (%s)\n", getRetCode(asiRetCode));
	}
	else if (serialNumber.id[0] == '\0')
	{
		snprintf(sn, sizeof(sn), "[none]");
	}
	else
	{
		// TODO: If RPi ever supports serial number, this code may need to change.
		char digit[3];
		for (unsigned int i=0; i<sizeof(serialNumber.id); i++)
		{
			snprintf(digit, sizeof(digit), "%02x", serialNumber.id[i]);
			strcat(sn, digit);
		}
	}

	return(sn);
}

// Get the camera model.
ASI_CAMERA_INFO x_;
size_t s_ = sizeof(x_.Name);		// is NULL-terminated
char cameraModel[sizeof(x_.Name) + 1];

char *getCameraModel(ASI_CAMERA_INFO cameraInfo)
{
	// Remove the camera type from the name if it's there.
	char *p = cameraInfo.Name;
	if (strncmp(CAMERA_TYPE, p, strlen(CAMERA_TYPE)) == 0)
		p += strlen(CAMERA_TYPE);
	if (*p == ' ') p++;		// skip optional space
	strncpy(cameraModel, p, s_-1);
	for (unsigned int i=0; i<s_; i++)
	{
		// Don't want spaces in the file name - they are a hassle.
		if (cameraModel[i] == ' ')
			cameraModel[i] = '_';
	}

	return(cameraModel);
}

// Save information on the specified camera.
void saveCameraInfo(ASI_CAMERA_INFO cameraInfo, char const *file, int width, int height, double pixelSize, char const *bayer)
{
	char *camModel = getCameraModel(cameraInfo);
	char *sn = getSerialNumber(cameraInfo.CameraID);

	FILE *f = fopen(file, "w");
	if (f == NULL)
	{
		Log(0, "ERROR: Unable to open '%s': %s\n", file, strerror(errno));
		closeUp(EXIT_ERROR_STOP);
	}
	Log(4, "saveCameraInfo(): saving to %s\n", file);

	// output basic information on camera as well as all it's capabilities
	fprintf(f, "{\n");
	fprintf(f, "\t\"cameraType\" : \"%s\",\n", CAMERA_TYPE);
	fprintf(f, "\t\"cameraName\" : \"%s\",\n", cameraInfo.Name);
	fprintf(f, "\t\"cameraModel\" : \"%s\",\n", camModel);
#ifdef IS_ZWO
	fprintf(f, "\t\"cameraID\" : \"%s\",\n", hasCameraID ? (char const *)cID : "");
#endif
	fprintf(f, "\t\"serialNumber\" : \"%s\",\n", hasSerialNumber ? sn : "");
	fprintf(f, "\t\"sensorWidth\" : %d,\n", width);
	fprintf(f, "\t\"sensorHeight\" : %d,\n", height);
	fprintf(f, "\t\"pixelSize\" : %1.2f,\n", pixelSize);
	fprintf(f, "\t\"supportedBins\" : [\n");
	for (unsigned int i = 0; i < sizeof(cameraInfo.SupportedBins); ++i)
	{
		int b = cameraInfo.SupportedBins[i];
		if (b == 0)
		{
			fprintf(f, "\n");
			break;
		}
		if (i > 0)
		{
			fprintf(f, ",");		// comma on all but last one
			fprintf(f, "\n");
		}
		fprintf(f, "\t\t{ \"value\" : %d, \"label\" : \"%dx%d\" }", b, b, b);
	}
	fprintf(f, "\t],\n");;

	fprintf(f, "\t\"colorCamera\" : %s,\n", cameraInfo.IsColorCam ? "true" : "false");
	if (cameraInfo.IsColorCam)
		fprintf(f, "\t\"bayerPattern\" : \"%s\",\n", bayer);
	fprintf(f, "\t\"bitDepth\" : %d,\n", cameraInfo.BitDepth);
	if (CG.cmdToUse != NULL)
		fprintf(f, "\t\"acquisitionCommand\" : \"%s\",\n", CG.cmdToUse);

#ifdef IS_RPi
	fprintf(f, "\t\"autoFocus\" : %s,\n", cameraInfo.SupportsAutoFocus ? "true" : "false");
	fprintf(f, "\t\"supportedRotations\": [\n");
	fprintf(f, "\t\t{ \"value\" : 0, \"label\" : \"None\" },\n");
	if (CG.ct == ctRPi && CG.isLibcamera)
	{
		// libcamera only supports 0 and 180 degree rotation
		fprintf(f, "\t\t{ \"value\" : 180, \"label\" : \"180 degrees\" }\n");
	}
	else
	{
		fprintf(f, "\t\t{ \"value\" : 90, \"label\" : \"90 degrees\" },\n");
		fprintf(f, "\t\t{ \"value\" : 180, \"label\" : \"180 degrees\" },\n");
		fprintf(f, "\t\t{ \"value\" : 270, \"label\" : \"270 degrees\" }\n");
	}
	fprintf(f, "\t],\n");;
#endif

	fprintf(f, "\t\"supportedImageFormats\": [\n");
	fprintf(f, "\t\t{ ");
	fprintf(f, "\"value\" : %d, ", AUTO_IMAGE_TYPE);
	fprintf(f, "\"label\" : \"%s\"", "auto");
	fprintf(f, " },\n");
	for (unsigned int i = 0; i < sizeof(cameraInfo.SupportedVideoFormat); i++)
	{
		ASI_IMG_TYPE it = cameraInfo.SupportedVideoFormat[i];
		if (it == ASI_IMG_END)
		{
			fprintf(f, "\n");
			break;
		}
		if (i > 0)
		{
			fprintf(f, ",");		// comma on all but last one
			fprintf(f, "\n");
		}
		fprintf(f, "\t\t{ ");
		fprintf(f, "\"value\" : %d, ", (int) it);
		fprintf(f, "\"label\" : \"%s\"",
			it == ASI_IMG_RAW8 ?  "RAW8" :
			it == ASI_IMG_RGB24 ?  "RGB24" :
			it == ASI_IMG_RAW16 ?  "RAW16" :
			it == ASI_IMG_Y8 ?  "Y8" :
			"unknown format");
		fprintf(f, " }");
	}
	fprintf(f, "\t],\n");;

	// Add some other things the camera supports, or the software supports for this camera.
	// Adding it to the "controls" array makes the code that checks what's available easier.
	fprintf(f, "\t\"controls\": [\n");

	// sensor size was also saved above, but save here with min/max/default
	fprintf(f, "\t\t{\n");
	fprintf(f, "\t\t\t\"Name\" : \"sensorWidth\",\n");
	fprintf(f, "\t\t\t\"argumentName\" : \"width\",\n");
	fprintf(f, "\t\t\t\"MinValue\" : 0,\n");		// TODO: I <think> some ZWO cameras have a min
	fprintf(f, "\t\t\t\"MaxValue\" : %d,\n", width);
	fprintf(f, "\t\t\t\"DefaultValue\" : 0\n");
	fprintf(f, "\t\t},\n");

	fprintf(f, "\t\t{\n");
	fprintf(f, "\t\t\t\"Name\" : \"sensorHeight\",\n");
	fprintf(f, "\t\t\t\"argumentName\" : \"height\",\n");
	fprintf(f, "\t\t\t\"MinValue\" : 0,\n");		// TODO: I <think> some ZWO cameras have a min
	fprintf(f, "\t\t\t\"MaxValue\" : %d,\n", height);
	fprintf(f, "\t\t\t\"DefaultValue\" : 0\n");
	fprintf(f, "\t\t},\n");

	fprintf(f, "\t\t{\n");
	fprintf(f, "\t\t\t\"Name\" : \"delayBetweenImages_ms\",\n");
	fprintf(f, "\t\t\t\"argumentName\" : \"delay\",\n");
	fprintf(f, "\t\t\t\"MinValue\" : %ld,\n", CG.minDelay_ms);
	fprintf(f, "\t\t\t\"MaxValue\" : \"%s\"\n", "none");
	fprintf(f, "\t\t},\n");

	if (CG.isColorCamera) {
		fprintf(f, "\t\t{\n");
		fprintf(f, "\t\t\t\"Name\" : \"%s\",\n", "AutoWhiteBalance");
		fprintf(f, "\t\t\t\"argumentName\" : \"%s\",\n", "awb");
		fprintf(f, "\t\t\t\"DefaultValue\" : 0\n");
		fprintf(f, "\t\t},\n");
	}
	if (CG.isCooledCamera) {
		fprintf(f, "\t\t{\n");
		fprintf(f, "\t\t\t\"Name\" : \"%s\",\n", "EnableCooler");
		fprintf(f, "\t\t\t\"argumentName\" : \"%s\",\n", "EnableCooler");
		fprintf(f, "\t\t\t\"DefaultValue\" : 0\n");
		fprintf(f, "\t\t},\n");
	}
	if (CG.supportsTemperature) {
		fprintf(f, "\t\t{\n");
		fprintf(f, "\t\t\t\"Name\" : \"%s\",\n", "showTemp");
		fprintf(f, "\t\t\t\"argumentName\" : \"%s\",\n", "showTemp");
		fprintf(f, "\t\t\t\"DefaultValue\" : %d\n", CG.overlay.showTemp ? 1 : 0);
		fprintf(f, "\t\t},\n");
	}
	if (CG.supportsAggression) {
		fprintf(f, "\t\t{\n");
		fprintf(f, "\t\t\t\"Name\" : \"%s\",\n", "aggression");
		fprintf(f, "\t\t\t\"argumentName\" : \"%s\",\n", "aggression");
		fprintf(f, "\t\t\t\"MinValue\" : 0,\n");
		fprintf(f, "\t\t\t\"MaxValue\" : 100,\n");
		fprintf(f, "\t\t\t\"DefaultValue\" : %ld\n", CG.aggression);
		fprintf(f, "\t\t},\n");
	}
	if (CG.gainTransitionTimeImplemented) {
		fprintf(f, "\t\t{\n");
		fprintf(f, "\t\t\t\"Name\" : \"%s\",\n", "gaintransitiontime");
		fprintf(f, "\t\t\t\"argumentName\" : \"%s\",\n", "gaintransitiontime");
		fprintf(f, "\t\t\t\"MinValue\" : 0,\n");
		fprintf(f, "\t\t\t\"DefaultValue\" : %ld\n", CG.gainTransitionTime);
		fprintf(f, "\t\t},\n");
	}
#ifdef IS_ZWO
	fprintf(f, "\t\t{\n");
	fprintf(f, "\t\t\t\"Name\" : \"%s\",\n", "autousb");
	fprintf(f, "\t\t\t\"argumentName\" : \"%s\",\n", "autousb");
	fprintf(f, "\t\t\t\"DefaultValue\" : 1\n");
	fprintf(f, "\t\t},\n");

	fprintf(f, "\t\t{\n");
	fprintf(f, "\t\t\t\"Name\" : \"%s\",\n", "showUSB");
	fprintf(f, "\t\t\t\"argumentName\" : \"%s\",\n", "showUSB");
	fprintf(f, "\t\t\t\"DefaultValue\" : %d\n", CG.overlay.showUSB ? 1 : 0);
	fprintf(f, "\t\t},\n");

	fprintf(f, "\t\t{\n");
	fprintf(f, "\t\t\t\"Name\" : \"%s\",\n", "experimentalExposure");
	fprintf(f, "\t\t\t\"argumentName\" : \"%s\",\n", "experimentalExposure");
	fprintf(f, "\t\t\t\"DefaultValue\" : \"%s\"\n", CG.HB.useExperimentalExposure ? 1 : 0);
	fprintf(f, "\t\t},\n");

	fprintf(f, "\t\t{\n");
	fprintf(f, "\t\t\t\"Name\" : \"%s\",\n", "histogrambox");
	fprintf(f, "\t\t\t\"argumentName\" : \"%s\",\n", "histogrambox");
	fprintf(f, "\t\t\t\"DefaultValue\" : \"%s\"\n", CG.HB.sArgs);
	fprintf(f, "\t\t},\n");

	fprintf(f, "\t\t{\n");
	fprintf(f, "\t\t\t\"Name\" : \"%s\",\n", "showhistogrambox");
	fprintf(f, "\t\t\t\"argumentName\" : \"%s\",\n", "showhistogrambox");
	fprintf(f, "\t\t\t\"DefaultValue\" : %d\n", CG.overlay.showHistogramBox ? 1 : 0);
	fprintf(f, "\t\t},\n");

	fprintf(f, "\t\t{\n");
	fprintf(f, "\t\t\t\"Name\" : \"%s\",\n", "newexposure");
	fprintf(f, "\t\t\t\"argumentName\" : \"%s\",\n", "newexposure");
	fprintf(f, "\t\t\t\"DefaultValue\" : %d\n", CG.videoOffBetweenImages ? 1 : 0);
	fprintf(f, "\t\t},\n");

	fprintf(f, "\t\t{\n");
	fprintf(f, "\t\t\t\"Name\" : \"%s\",\n", "cameraNumber");
	fprintf(f, "\t\t\t\"argumentName\" : \"%s\"\n", "cameraNumber");
	fprintf(f, "\t\t},\n");
#endif

#ifdef IS_RPi
	fprintf(f, "\t\t{\n");
	fprintf(f, "\t\t\t\"Name\" : \"%s\",\n", "ExtraArguments");
	fprintf(f, "\t\t\t\"argumentName\" : \"%s\"\n", "extraArgs");
	fprintf(f, "\t\t},\n");

	fprintf(f, "\t\t{\n");
	fprintf(f, "\t\t\t\"Name\" : \"%s\",\n", "ModeMean");
	fprintf(f, "\t\t\t\"argumentName\" : \"%s\",\n", "mean");
	fprintf(f, "\t\t\t\"MinValue\" : 0.0,\n");
	fprintf(f, "\t\t\t\"MaxValue\" : 1.0,\n");
	fprintf(f, "\t\t\t\"DefaultValue\" : \"day: %.2f, night: %.2f\"\n",
		CG.myModeMeanSetting.dayMean, CG.myModeMeanSetting.nightMean);
	fprintf(f, "\t\t},\n");

	fprintf(f, "\t\t{\n");
	fprintf(f, "\t\t\t\"Name\" : \"%s\",\n", "MeanThreshold");
	fprintf(f, "\t\t\t\"argumentName\" : \"%s\",\n", "meanthreshold");
	fprintf(f, "\t\t\t\"MinValue\" : 0.01,\n");
	fprintf(f, "\t\t\t\"MaxValue\" : \"none\",\n");
	fprintf(f, "\t\t\t\"DefaultValue\" : %f\n", CG.myModeMeanSetting.mean_threshold);
	fprintf(f, "\t\t},\n");

	if (CG.ct == ctRPi && CG.isLibcamera) {
		fprintf(f, "\t\t{\n");
		fprintf(f, "\t\t\t\"Name\" : \"%s\",\n", "TuningFile");
		fprintf(f, "\t\t\t\"argumentName\" : \"%s\",\n", "TuningFile");
		fprintf(f, "\t\t\t\"DefaultValue\" : \"\"\n");
		fprintf(f, "\t\t},\n");
	}
#endif

	for (int i = 0; i < iNumOfCtrl; i++)
	{
		ASI_CONTROL_CAPS cc;
		ASIGetControlCaps(cameraInfo.CameraID, i, &cc);

		// blank names means it's unsupported
		if (cc.Name[0] == '\0')
			continue;

		// blank argument name means we don't have a command-line argument for it
		char const *a =  argumentNames[cc.ControlType][1];
		if (a == NULL or a[0] == '\0')
			continue;

		if (i > 0)
		{
			fprintf(f, ",");		// comma on all but last one
			fprintf(f, "\n");
		}

		fprintf(f, "\t\t{\n");
		fprintf(f, "\t\t\t\"Name\" : \"%s\",\n", cc.Name);
		fprintf(f, "\t\t\t\"argumentName\" : \"%s\",\n", a);
		fprintf(f, "\t\t\t\"MinValue\" : %s,\n", LorF(cc.MinValue, "%ld", "%.3f"));
		fprintf(f, "\t\t\t\"MaxValue\" : %s,\n", LorF(cc.MaxValue, "%ld", "%.3f"));
		fprintf(f, "\t\t\t\"DefaultValue\" : %s,\n", LorF(cc.DefaultValue, "%ld", "%.3f"));
		fprintf(f, "\t\t\t\"IsAutoSupported\" : %s,\n", cc.IsAutoSupported == ASI_TRUE ? "true" : "false");
		fprintf(f, "\t\t\t\"IsWritable\" : %s,\n", cc.IsWritable == ASI_TRUE ? "true" : "false");
		fprintf(f, "\t\t\t\"ControlType\" : %d\n", cc.ControlType);
		fprintf(f, "\t\t}");
	}
	fprintf(f, "\n");
	fprintf(f, "\t]\n");

	fprintf(f, "}\n");
	fclose(f);
}

// Output basic camera information.
void outputCameraInfo(ASI_CAMERA_INFO cameraInfo, config cg, long width, long height, double pixelSize, char const *bayer)
{
	printf(" Camera Information:\n");
	printf("  - Type: %s\n", CAMERA_TYPE);
	printf("  - Model: %s\n", getCameraModel(cameraInfo));
#ifdef IS_ZWO
	printf("  - Camera ID: %s\n", cID);
#endif
	printf("  - Camera Serial Number: %s\n", getSerialNumber(cameraInfo.CameraID));
	printf("  - Native Resolution: %ldx%ld\n", width, height);
	printf("  - Pixel Size: %1.2f microns\n", pixelSize);
	printf("  - Supported Bins: ");
	for (unsigned int i = 0; i < sizeof(cameraInfo.SupportedBins); ++i)
	{
		if (cameraInfo.SupportedBins[i] == 0)
			break;
		printf("%d ", cameraInfo.SupportedBins[i]);
	}
	printf("\n");

	if (cameraInfo.IsColorCam)
	{
		printf("  - Color camera, bayer pattern: %s\n", bayer);
	}
	else
	{
		printf("  - Mono camera\n");
	}
	if (cameraInfo.IsCoolerCam)
	{
		printf("  - Camera with cooling capabilities\n");
	}
	if (cg.supportsTemperature)
	{
		ASI_BOOL a;
#ifdef IS_ZWO
		long temp = 0;
#else
		double temp = 0.0;
#endif
		ASIGetControlValue(cameraInfo.CameraID, ASI_TEMPERATURE, &temp, &a);
		printf("  - Sensor temperature: %0.1f C\n", (float)temp / cg.divideTemperatureBy);
	}
	printf("  - Bit depth: %d\n", cameraInfo.BitDepth);
#ifdef IS_RPi
	printf("  - Auto focus supported: %s\n", yesNo(cameraInfo.SupportsAutoFocus));
#endif

	// Get a few values from the camera that we need elsewhere.
	ASI_CONTROL_CAPS cc;
	for (int i = 0; i < iNumOfCtrl; i++)
	{
		ASIGetControlCaps(cameraInfo.CameraID, i, &cc);
		switch (cc.ControlType) {
		case ASI_EXPOSURE:
			cg.cameraMinExposure_us = cc.MinValue;
			cg.cameraMaxExposure_us = cc.MaxValue;
			break;
		case ASI_AUTO_MAX_EXP:
			// Keep track of the camera's max auto-exposure so we don't try to exceed it.
			// MaxValue is in MS so convert to microseconds
			// If using histogram algorithm we use manual exposure so can use any max we want.
			cg.cameraMaxAutoExposure_us = cc.MaxValue * US_IN_MS;
			break;
		default:	// needed to keep compiler quiet
			break;
		}
	}
	if (cg.debugLevel >= 4)
	{
		printf("Supported image formats:\n");
		size_t s_ = sizeof(cameraInfo.SupportedVideoFormat);
		for (unsigned int i = 0; i < s_; i++)
		{
			ASI_IMG_TYPE it = cameraInfo.SupportedVideoFormat[i];
			if (it == ASI_IMG_END)
			{
				break;
			}
			printf("  - %s\n",
				it == ASI_IMG_RAW8 ?  "RAW8" :
				it == ASI_IMG_RGB24 ?  "RGB24" :
				it == ASI_IMG_RAW16 ?  "RAW16" :
				it == ASI_IMG_Y8 ?  "Y8" :
				"unknown format");
		}

		printf("Control Caps:\n");
		for (int i = 0; i < iNumOfCtrl; i++)
		{
			ASIGetControlCaps(cameraInfo.CameraID, i, &cc);
			printf("  - %s:\n", cc.Name);
			printf("    - Description = %s\n", cc.Description);
			printf("    - MinValue = %s\n", LorF(cc.MinValue, "%'ld", "%'.3f"));
			printf("    - MaxValue = %s\n", LorF(cc.MaxValue, "%'ld", "%'.3f"));
			printf("    - DefaultValue = %s\n", LorF(cc.DefaultValue, "%'ld", "%'.3f"));
			printf("    - IsAutoSupported = %d\n", cc.IsAutoSupported);
			printf("    - IsWritable = %d\n", cc.IsWritable);
			printf("    - ControlType = %d\n", cc.ControlType);
		}
	}
}

// Ensure the exposure values are valid.
bool checkExposureValues(config *cg)
{
	if (cg->dayExposure_us < cg->cameraMinExposure_us)
	{
	 	Log(1, "*** WARNING: daytime exposure %'ld us less than camera minimum of %'ld us; setting to minimum\n", cg->dayExposure_us, cg->cameraMinExposure_us);
	 	cg->dayExposure_us = cg->cameraMinExposure_us;
	}
	else if (cg->dayExposure_us > cg->cameraMaxExposure_us)
	{
	 	Log(1, "*** WARNING: daytime exposure %'ld us greater than camera maximum of %'ld us; setting to maximum\n", cg->dayExposure_us, cg->cameraMaxExposure_us);
	 	cg->dayExposure_us = cg->cameraMaxExposure_us;
	}
	else if (cg->dayAutoExposure && cg->dayExposure_us > cg->cameraMaxAutoExposure_us)
	{
	 	Log(1, "*** WARNING: daytime exposure %'ld us greater than camera maximum of %'ld us; setting to maximum\n", cg->dayExposure_us, cg->cameraMaxAutoExposure_us);
	 	cg->dayExposure_us = cg->cameraMaxAutoExposure_us;
	}

	if (cg->nightExposure_us < cg->cameraMinExposure_us)
	{
	 	Log(1, "*** WARNING: nighttime exposure %'ld us less than camera minimum of %'ld us; setting to minimum\n", cg->nightExposure_us, cg->cameraMinExposure_us);
	 	cg->nightExposure_us = cg->cameraMinExposure_us;
	}
	else if (cg->nightExposure_us > cg->cameraMaxExposure_us)
	{
	 	Log(1, "*** WARNING: nighttime exposure %'ld us greater than camera maximum of %'ld us; setting to maximum\n", cg->nightExposure_us, cg->cameraMaxExposure_us);
	 	cg->nightExposure_us = cg->cameraMaxExposure_us;
	}
	else if (cg->nightAutoExposure && cg->nightExposure_us > cg->cameraMaxAutoExposure_us)
	{
	 	Log(1, "*** WARNING: nighttime exposure %'ld us greater than camera maximum of %'ld us; setting to maximum\n", cg->nightExposure_us, cg->cameraMaxAutoExposure_us);
	 	cg->nightExposure_us = cg->cameraMaxAutoExposure_us;
	}

	return(true);		// only WARNINGs above
}

// Check that the specified bin is supported by this camera.
static bool checkBin(long b, ASI_CAMERA_INFO ci, char const *field)
{
	bool ok = false;
	for (unsigned int i = 0; i < sizeof(ci.SupportedBins); ++i)
	{
		if (ci.SupportedBins[i] == b)
		{
			ok = true;
			break;
		}
		if (ci.SupportedBins[i] == 0)
			break;
	}
	if (! ok)
		Log(0, "*** ERROR: %s bin of %ldx%ld not supported by camera %s.\n", field, b, b, ci.Name);

	return(ok);
}

// Set defaults that depend on camera type or otherwise can't be set at compile time.
// If a value is currently NOT_CHANGED, the user didn't specify so use the default.
// Validate the command-line settings.
bool setDefaults(config *cg, ASI_CAMERA_INFO ci)
{
	if (cg->saveDir == NULL) {
		static char s[256];
		snprintf(s, sizeof(s), "%s/%s", cg->allskyHome, "tmp");
		cg->saveDir = s;
	}

	cg->tty = isatty(fileno(stdout)) ? true : false;
	cg->isColorCamera = ci.IsColorCam == ASI_TRUE ? true : false;
	cg->isCooledCamera = ci.IsCoolerCam == ASI_TRUE ? true : false;

	ASI_ERROR_CODE ret;
	ASI_CONTROL_CAPS cc;
	bool ok = true;

	if (cg->ct == ctZWO) {
		cg->supportsTemperature = true;
		// ZWO cameras return a long which is 10 times the actual temp.
		cg->divideTemperatureBy = 10.0;
		cg->supportsAggression = true;
		cg->supportsMyModeMean = false;
		cg->gainTransitionTimeImplemented = true;
		cg->imagesSavedInBackground = true;
		cg->myModeMeanSetting.dayMean = DEFAULT_DAYMEAN_ZWO;
		cg->myModeMeanSetting.nightMean = DEFAULT_NIGHTMEAN_ZWO;
		cg->myModeMeanSetting.minMean = DEFAULT_MINMEAN_ZWO;		// min number a user should enter
		cg->myModeMeanSetting.maxMean = DEFAULT_MAXMEAN_ZWO;		// max number a user should enter
		cg->myModeMeanSetting.dayMean_threshold = DEFAULT_DAYMEAN_THRESHOLD_ZWO;
		cg->myModeMeanSetting.nightMean_threshold = DEFAULT_NIGHTMEAN_THRESHOLD_ZWO;
		cg->myModeMeanSetting.minMean_threshold = DEFAULT_MINMEAN_THRESHOLD_ZWO;
		cg->myModeMeanSetting.maxMean_threshold = DEFAULT_MAXMEAN_THRESHOLD_ZWO;
		cg->myModeMeanSetting.mean_threshold = DEFAULT_DAYMEAN_THRESHOLD_ZWO;		// TODO: use day and night versions
		cg->myModeMeanSetting.mean_p0 = DEFAULT_MEAN_P0_ZWO;
		cg->myModeMeanSetting.mean_p1 = DEFAULT_MEAN_P1_ZWO;
		cg->myModeMeanSetting.mean_p2 = DEFAULT_MEAN_P2_ZWO;

	} else {	// RPi
#ifdef IS_RPi		// need this so it compiles
		cg->supportsTemperature = ci.SupportsTemperature;	// this field only exists in RPi structure
		cg->divideTemperatureBy = 1.0;
		cg->supportsAutoFocus = ci.SupportsAutoFocus;	// this field only exists in RPi structure
#endif
		cg->supportsAggression = false;
		cg->supportsMyModeMean = true;
		cg->gainTransitionTimeImplemented = false;
		cg->imagesSavedInBackground = false;
		cg->myModeMeanSetting.dayMean = DEFAULT_DAYMEAN_RPi;
		cg->myModeMeanSetting.nightMean = DEFAULT_NIGHTMEAN_RPi;
		cg->myModeMeanSetting.minMean = DEFAULT_MINMEAN_RPi;
		cg->myModeMeanSetting.maxMean = DEFAULT_MAXMEAN_RPi;
		cg->myModeMeanSetting.dayMean_threshold = DEFAULT_DAYMEAN_THRESHOLD_RPi;
		cg->myModeMeanSetting.nightMean_threshold = DEFAULT_NIGHTMEAN_THRESHOLD_RPi;
		cg->myModeMeanSetting.minMean_threshold = DEFAULT_MINMEAN_THRESHOLD_RPi;
		cg->myModeMeanSetting.maxMean_threshold = DEFAULT_MAXMEAN_THRESHOLD_RPi;
		cg->myModeMeanSetting.mean_threshold = DEFAULT_DAYMEAN_THRESHOLD_RPi;		// TODO: use day and night versions
		cg->myModeMeanSetting.mean_p0 = DEFAULT_MEAN_P0_RPi;
		cg->myModeMeanSetting.mean_p1 = DEFAULT_MEAN_P1_RPi;
		cg->myModeMeanSetting.mean_p2 = DEFAULT_MEAN_P2_RPi;
	}

	if (cg->imagesSavedInBackground) {
		// Images are saved in a separate thread so need to give time for an image to be saved.
		cg->minDelay_ms = 10;
	} else {
		// The capture program waits for the image to be saved.
		cg->minDelay_ms = 0;
	}

	// Get values used in several validations.
	ret = getControlCapForControlType(cg->cameraNumber, ASI_EXPOSURE, &cc);
	if (ret == ASI_SUCCESS)
	{
		cg->cameraMinExposure_us = cc.MinValue;
		cg->cameraMaxExposure_us = cc.MaxValue;

		ret = getControlCapForControlType(cg->cameraNumber, ASI_AUTO_MAX_EXP, &cc);
		if (ret == ASI_SUCCESS)
		{
			cg->cameraMaxAutoExposure_us = cc.MaxValue * US_IN_MS;
		} else {
			Log(0, "ASI_AUTO_MAX_EXP failed with %s\n", getRetCode(ret));
			ok = false;
	}
	} else {
		Log(0, "ASI_EXPOSURE failed with %s\n", getRetCode(ret));
		ok = false;
	}

	signal(SIGINT, IntHandle);
	signal(SIGTERM, IntHandle);	// The service sends SIGTERM to end this program.
	signal(SIGHUP, IntHandle);		// SIGHUP means restart.

	return(ok);
}

// If a value is currently NOT_CHANGED, the user didn't specify so use the default.
// Validate the command-line settings.
// For cameras that use an external application to take pictures,
// set any default values specified by the user to IS_DEFAULT so we don't pass the
// value to the external program.
bool validateSettings(config *cg, ASI_CAMERA_INFO ci)
{
	ASI_ERROR_CODE ret;
	ASI_CONTROL_CAPS cc;
	bool ok = true;

	// If an exposure value, which was entered on the command-line in MS, is out of range,
	// we want to specify the valid range in MS, not US which we use internally.

	validateFloat(&cg->temp_dayExposure_ms,
		(double)cg->cameraMinExposure_us / US_IN_MS, (double)cg->cameraMaxExposure_us / US_IN_MS,
		"Daytime Exposure", true);
	if (cg->dayAutoExposure)
	{
		validateFloat(&cg->temp_dayMaxAutoExposure_ms,
			(double)cg->cameraMinExposure_us / US_IN_MS, (double)cg->cameraMaxAutoExposure_us / US_IN_MS,
			"Daytime Max Auto-Exposure", true);
	}
	validateFloat(&cg->temp_nightExposure_ms,
		(double)cg->cameraMinExposure_us / US_IN_MS, (double)cg->cameraMaxExposure_us / US_IN_MS,
		"Nighttime Exposure", true);
	if (cg->nightAutoExposure)
	{
		validateFloat(&cg->temp_nightMaxAutoExposure_ms,
			(double)cg->cameraMinExposure_us / US_IN_MS, (double)cg->cameraMaxExposure_us / US_IN_MS,
			"Nighttime Max Auto-Exposure", true);
	}

	// The user entered these in MS on the command line, but we need US, so convert.
	cg->dayExposure_us = cg->temp_dayExposure_ms * US_IN_MS;
	cg->dayMaxAutoExposure_us = cg->temp_dayMaxAutoExposure_ms * US_IN_MS;
	cg->nightExposure_us = cg->temp_nightExposure_ms * US_IN_MS;
	cg->nightMaxAutoExposure_us = cg->temp_nightMaxAutoExposure_ms * US_IN_MS;

	if (! validateFloat(&cg->myModeMeanSetting.dayMean, cg->myModeMeanSetting.minMean, cg->myModeMeanSetting.maxMean, "Daytime Mean Target", false))
		ok = false;
	if (! validateFloat(&cg->myModeMeanSetting.nightMean, cg->myModeMeanSetting.minMean, cg->myModeMeanSetting.maxMean, "Nighttime Mean Target", false))
		ok = false;
	if (! validateFloat(&cg->myModeMeanSetting.mean_threshold, cg->myModeMeanSetting.minMean_threshold, cg->myModeMeanSetting.maxMean_threshold, "Mean Threshold", false))
		ok = false;

	// If there's too short of a delay, pictures won't upload fast enough.
	const int min_delay = 0;
// TODO: determine average speed to save images on this Pi, and use that plus a buffer as min.
	validateLong(&cg->dayDelay_ms, min_delay, NO_MAX_VALUE, "Daytime Delay", true);
	validateLong(&cg->nightDelay_ms, min_delay, NO_MAX_VALUE, "Nighttime Delay", true);

	// SkipFrames only applies if auto-exposure is on.  The max are arbitrary numbers.
	if (cg->dayAutoExposure)
		validateLong(&cg->daySkipFrames, 0, 50, "Daytime Skip Frames", true);
	else
		cg->daySkipFrames = 0;
	if (cg->nightAutoExposure)
		validateLong(&cg->nightSkipFrames, 0, 10, "Nighttime Skip Frames", true);
	else
		cg->nightSkipFrames = 0;

	ret = getControlCapForControlType(cg->cameraNumber, ASI_FLIP, &cc);
	if (ret == ASI_SUCCESS)
	{
		cg->defaultFlip = cc.DefaultValue;
		if (cg->flip == NOT_CHANGED)
			cg->flip = cc.DefaultValue;
		else
			validateLong(&cg->flip, cc.MinValue, cc.MaxValue, "Flip", true);
	} else if (ret != ASI_ERROR_INVALID_CONTROL_TYPE) {
		Log(0, "ASI_FLIP failed with %s\n", getRetCode(ret));
		ok = false;
	}

	// libcamera only supports 0 and 180 degree rotation
	cg->defaultRotation = 0;
	if (cg->rotation != 0)
	{
		if (cg->ct == ctRPi && cg->isLibcamera)
		{
			if (cg->rotation != 180)
			{
				Log(0, "%s*** ERROR: Only 0 and 180 degrees are supported for rotation; you entered %ld.%s\n", c(KRED), cg->rotation, c(KNRM));
				ok = false;
			}
		}
		else if (cg->rotation != 90 && cg->rotation != 180 && cg->rotation != 270)
		{
			Log(0, "%s*** ERROR: Only 0, 90, 180, and 270 degrees are supported for rotation; you entered %ld.%s\n", c(KRED), cg->rotation, c(KNRM));
			ok = false;
		}
	}

	if (cg->ct == ctZWO) {
		validateLong(&cg->aggression, 1, 100, "Aggression", true);

		validateLong(&cg->gainTransitionTime, 0, NO_MAX_VALUE, "Gain Transition Time", true);
		// user specifies minutes but we want seconds.
		cg->gainTransitionTime *= 60;
	}

	if (cg->imageType != AUTO_IMAGE_TYPE)
	{
		ASI_IMG_TYPE highest = ASI_IMG_END;
		for (unsigned int i = 0; i < sizeof(ci.SupportedVideoFormat); i++)
		{
			ASI_IMG_TYPE it = ci.SupportedVideoFormat[i];
			if (it == ASI_IMG_END)
				break;
			highest = it;
		}
		if (! validateLong(&cg->imageType, 0, highest, "Image Type", false))
			ok = false;
	}

	validateLong(&cg->debugLevel, 0, 4, "Debug Level", true);

	// Overlay-related arguments
	validateLong(&cg->overlay.extraFileAge, 0, NO_MAX_VALUE, "Max Age Of Extra", true);
	validateLong(&cg->overlay.fontnumber, 0, 8-1, "Font Name", true);
	validateLong(&cg->overlay.linenumber, 0, sizeof(cg->overlay.linetype)-1, "Font Smoothness", true);
	if (cg->overlay.fc != NULL && sscanf(cg->overlay.fc, "%d %d %d",
			&cg->overlay.fontcolor[0], &cg->overlay.fontcolor[1], &cg->overlay.fontcolor[2]) != 3)
		Log(-1, "%s*** WARNING: Not enough font color parameters: '%s'%s\n", c(KRED), cg->overlay.fc, c(KNRM));
	if (cg->overlay.sfc != NULL && sscanf(cg->overlay.sfc, "%d %d %d",
			&cg->overlay.smallFontcolor[0], &cg->overlay.smallFontcolor[1], &cg->overlay.smallFontcolor[2]) != 3)
		Log(-1, "%s*** WARNING: Not enough small font color parameters: '%s'%s\n", c(KRED), cg->overlay.sfc, c(KNRM));

	cg->defaultBin = 1;
	if (! checkBin(cg->dayBin, ci, "Daytime Binning"))
		ok = false;
	if (! checkBin(cg->nightBin, ci, "Nighttime Binning"))
		ok = false;

	if (! validateLatitudeLongitude(cg))
		ok = false;

	// The remaining settings are camera-specific and have camera defaults.
	// If the user didn't specify anything (i.e., the value is NOT_CHANGED), set it to the default.
	ret = getControlCapForControlType(cg->cameraNumber, ASI_AUTO_TARGET_BRIGHTNESS, &cc);
	if (ret == ASI_SUCCESS)
	{
		cg->defaultBrightness = cc.DefaultValue;		// used elsewhere
		if (cg->dayBrightness == NOT_CHANGED)
			cg->dayBrightness = cc.DefaultValue;
		else
			validateLong(&cg->dayBrightness, cc.MinValue, cc.MaxValue, "Daytime Brightness", true);

		if (cg->nightBrightness == NOT_CHANGED)
			cg->nightBrightness = cc.DefaultValue;
		else
			validateLong(&cg->nightBrightness, cc.MinValue, cc.MaxValue, "Nighttime Brightness", true);
	} else if (ret != ASI_ERROR_INVALID_CONTROL_TYPE) {
		Log(0, "ASI_AUTO_TARGET_BRIGHTNESS failed with %s\n", getRetCode(ret));
		ok = false;
	}

	ret = getControlCapForControlType(cg->cameraNumber, ASI_GAIN, &cc);
	if (ret == ASI_SUCCESS)
	{
		cg->defaultGain = cc.DefaultValue;
		cg->cameraMinGain = cc.MinValue;		// used elsewhere
		if (cg->dayGain == NOT_CHANGED)
			cg->dayGain = cc.DefaultValue;
		else
			validateFloat(&cg->dayGain, cc.MinValue, cc.MaxValue, "Daytime Gain", true);
		if (cg->nightGain == NOT_CHANGED)
			cg->nightGain = cc.DefaultValue;
		else
			validateFloat(&cg->nightGain, cc.MinValue, cc.MaxValue, "Nighttime Gain", true);
	} else if (ret != ASI_ERROR_INVALID_CONTROL_TYPE) {
		Log(0, "ASI_GAIN failed with %s\n", getRetCode(ret));
		ok = false;
	}
	ret = getControlCapForControlType(cg->cameraNumber, ASI_AUTO_MAX_GAIN, &cc);
	if (ret == ASI_SUCCESS)
	{
		if (cg->dayMaxAutoGain == NOT_CHANGED)
			cg->dayMaxAutoGain = cc.DefaultValue;
		else
			validateFloat(&cg->dayMaxAutoGain, cc.MinValue, cc.MaxValue, "Daytime Max Auto-Gain", true);

		if (cg->nightMaxAutoGain == NOT_CHANGED)
			cg->nightMaxAutoGain = cc.DefaultValue;
		else
			validateFloat(&cg->nightMaxAutoGain, cc.MinValue, cc.MaxValue, "Nighttime Max Auto-Gain", true);
	} else if (ret != ASI_ERROR_INVALID_CONTROL_TYPE) {
		Log(0, "ASI_AUTO_MAX_GAIN failed with %s\n", getRetCode(ret));
		ok = false;
	}

	if (cg->isColorCamera) {
		ret = getControlCapForControlType(cg->cameraNumber, ASI_WB_R, &cc);
		if (ret == ASI_SUCCESS)
		{
			cg->defaultWBR = cc.DefaultValue;
			if (cg->dayWBR == NOT_CHANGED)
				cg->dayWBR = cc.DefaultValue;
			else
				validateFloat(&cg->dayWBR, cc.MinValue, cc.MaxValue, "Daytime Red Balance", true);
	
			if (cg->nightWBR == NOT_CHANGED)
				cg->nightWBR = cc.DefaultValue;
			else
				validateFloat(&cg->nightWBR, cc.MinValue, cc.MaxValue, "Nighttime Red Balance", true);
		} else if (ret != ASI_ERROR_INVALID_CONTROL_TYPE) {
			Log(0, "ASI_WB_R failed with %s\n", getRetCode(ret));
			ok = false;
		}
		ret = getControlCapForControlType(cg->cameraNumber, ASI_WB_B, &cc);
		if (ret == ASI_SUCCESS)
		{
			cg->defaultWBB = cc.DefaultValue;
			if (cg->dayWBB == NOT_CHANGED)
				cg->dayWBB = cc.DefaultValue;
			else
				validateFloat(&cg->dayWBB, cc.MinValue, cc.MaxValue, "Daytime Blue Balance", true);
	
			if (cg->nightWBB == NOT_CHANGED)
				cg->nightWBB = cc.DefaultValue;
			else
				validateFloat(&cg->nightWBB, cc.MinValue, cc.MaxValue, "Nighttime Blue Balance", true);
		} else if (ret != ASI_ERROR_INVALID_CONTROL_TYPE) {
			Log(0, "ASI_WB_B failed with %s\n", getRetCode(ret));
			ok = false;
		}
	}

	if (cg->ct == ctRPi) {
		ret = getControlCapForControlType(cg->cameraNumber, SATURATION, &cc);
		if (ret == ASI_SUCCESS)
		{
			cg->defaultSaturation = cc.DefaultValue;
			if (cg->saturation == NOT_CHANGED)
				cg->saturation = cc.DefaultValue;
			else
				validateFloat(&cg->saturation, cc.MinValue, cc.MaxValue, "Saturation", true);
		} else if (ret != ASI_ERROR_INVALID_CONTROL_TYPE) {
			Log(0, "SATURATION failed with %s\n", getRetCode(ret));
			ok = false;
		}
	
		ret = getControlCapForControlType(cg->cameraNumber, CONTRAST, &cc);
		if (ret == ASI_SUCCESS)
		{
			cg->defaultContrast = cc.DefaultValue;
			if (cg->contrast == NOT_CHANGED)
				cg->contrast = cc.DefaultValue;
			else
				validateFloat(&cg->contrast, cc.MinValue, cc.MaxValue, "Contrast", true);
		} else if (ret != ASI_ERROR_INVALID_CONTROL_TYPE) {
			Log(0, "CONTRAST failed with %s\n", getRetCode(ret));
			ok = false;
		}
	
		ret = getControlCapForControlType(cg->cameraNumber, SHARPNESS, &cc);
		if (ret == ASI_SUCCESS)
		{
			cg->defaultSharpness = cc.DefaultValue;
			if (cg->sharpness == NOT_CHANGED)
				cg->sharpness = cc.DefaultValue;
			else
				validateFloat(&cg->sharpness, cc.MinValue, cc.MaxValue, "Sharpness", true);
		} else if (ret != ASI_ERROR_INVALID_CONTROL_TYPE) {
			Log(0, "SHARPNESS failed with %s\n", getRetCode(ret));
			ok = false;
		}
	}
	else if (cg->ct == ctZWO) {
		ret = getControlCapForControlType(cg->cameraNumber, ASI_GAMMA, &cc);
		if (ret == ASI_SUCCESS)
		{
			if (cg->gamma == NOT_CHANGED)
				cg->gamma = cc.DefaultValue;
			else
				validateLong(&cg->gamma, cc.MinValue, cc.MaxValue, "gamma", true);
		} else if (ret != ASI_ERROR_INVALID_CONTROL_TYPE) {
			Log(0, "ASI_GAMMA failed with %s\n", getRetCode(ret));
			ok = false;
		}

		ret = getControlCapForControlType(cg->cameraNumber, ASI_OFFSET, &cc);
		if (ret == ASI_SUCCESS)
		{
			if (cg->offset == NOT_CHANGED)
				cg->offset = cc.DefaultValue;
			else
				validateLong(&cg->offset, cc.MinValue, cc.MaxValue, "offset", true);
		} else if (ret != ASI_ERROR_INVALID_CONTROL_TYPE) {
			Log(0, "ASI_OFFSET failed with %s\n", getRetCode(ret));
			ok = false;
		}

		if (cg->isCooledCamera && (cg->dayEnableCooler || cg->nightEnableCooler)) {
			ret = getControlCapForControlType(cg->cameraNumber, ASI_TARGET_TEMP, &cc);
			if (ret == ASI_SUCCESS)
			{
				if (cg->dayTargetTemp == NOT_CHANGED)
					cg->dayTargetTemp = cc.DefaultValue;
				else
					validateLong(&cg->dayTargetTemp, cc.MinValue, cc.MaxValue, "Daytime Target Sensor Temperature", true);

				if (cg->nightTargetTemp == NOT_CHANGED)
					cg->nightTargetTemp = cc.DefaultValue;
				else
					validateLong(&cg->nightTargetTemp, cc.MinValue, cc.MaxValue, "Nighttime Target Sensor Temperature", true);
			} else if (ret != ASI_ERROR_INVALID_CONTROL_TYPE) {
				Log(0, "ASI_TARGET_TEMP failed with %s\n", getRetCode(ret));
				ok = false;
			}
		}

		ret = getControlCapForControlType(cg->cameraNumber, ASI_BANDWIDTHOVERLOAD, &cc);
		if (ret == ASI_SUCCESS)
		{
			if (cg->asiBandwidth == NOT_CHANGED)
				cg->asiBandwidth = cc.DefaultValue;
			else
				validateLong(&cg->asiBandwidth, cc.MinValue, cc.MaxValue, "USB Bandwidth", true);
		} else if (ret != ASI_ERROR_INVALID_CONTROL_TYPE) {
			Log(0, "ASI_BANDWIDTHOVERLOAD failed with %s\n", getRetCode(ret));
			ok = false;
		}
	}

	return(ok);
}
