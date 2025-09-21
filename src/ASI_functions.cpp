// This file is #include'd into the capture*.cpp files.
// The CAMERA_TYPE #define must be set.
// For the RPi, functions that mimic the ZWO "ASI" functions were added so the capture
// code for both cameras can be as similar as possible.

#if !defined(CAMERA_TYPE)
#error ERROR: CAMERA_TYPE not defined
#endif

// Forward definitions of variables in capture*.cpp.
extern int iNumOfCtrl;
char *skipType(char *);

#define CC_TYPE_SIZE		10
#define CAMERA_NAME_SIZE	64
#define	MODULE_SIZE			100
// +5 for other characters in name
#define SENSOR_SIZE			(CAMERA_NAME_SIZE + MODULE_SIZE + 5)
#define FULL_SENSOR_SIZE	(2 * SENSOR_SIZE)

// Holds connected camera types.
struct CONNECTED_CAMERAS
{
	int cameraID;
	char Type[CC_TYPE_SIZE];			// ZWO or RPi
	char Name[CAMERA_NAME_SIZE];		// camera name, e.g., "ASI290MC", "HQ"
	char Sensor[FULL_SENSOR_SIZE];		// full sensor name (what --list-cameras returns)

	// These are RPi only:
	char *Module;						// sensor type
	size_t Module_len;					// strncmp length.  0 for whole Module name
};
CONNECTED_CAMERAS connectedCameras[100];
int totalNum_connectedCameras = 0;			// num connected cameras of all types

char *connectedCameraTypes[100] = {};		// points to connectedCameras.Type
int num_connectedCameraTypes = 0;

// Find the end of the token that begins at "start".
// The end is either "delimeter" or NULL.
// If "delimeter", replace with NULL.

char *getToken(char *start, char delimeter)
{
	// "nextToken" points to the place to look for the next token,
	// or NULL if we're at the end of the line.
	static char *nextToken = NULL;

	if (start == NULL || *start == '\0')
	{
		// If "start" is NULL we're going to start a new line
		// so reset "nextToken".
		nextToken = NULL;
		return(NULL);
	}

	char *startOfToken;
	char *ptr;

	if (nextToken == NULL)
		ptr = start;
	else
		ptr = nextToken;

	if (*ptr == '\0')
		return(NULL);

	startOfToken = ptr;

	// Find end of token.
	while (*ptr != delimeter && *ptr != '\0')
	{
		ptr++;
	}

	if (*ptr == '\0')
	{
		// At the end of the line so reset "nextToken".
		nextToken = ptr;
	}
	else
	{
		// at delimeter.  Assume there is at least 1 more character in the line.
		*ptr = '\0';
		nextToken = (ptr+1);
	}

	return(startOfToken);
}

// Return the number of cameras PHYSICALLY connected of the correct type.
// allsky.sh created the file; we just need to count the number of lines in it.
// Also, save information on ALL connected cameras.
int getNumOfConnectedCameras()
{
	// Read the whole file into memory so we can easily parse it.
	static char *buf = readFileIntoBuffer(&CG, CG.connectedCamerasFile);
	if (buf == NULL)
	{
		Log(0, "%s: ERROR: Unable to read from CG.RPI_cameraInfoFile '%s': %s\n",
			CG.ME, CG.RPI_cameraInfoFile, strerror(errno));
		closeUp(EXIT_ERROR_STOP);
	}

	int numThisType = 0;
	char *line;

	// Input file format (tab-separated):
	//		camera_type  camera_number   sensor_name_or_Model  optional_other_stuff
	//		1            2               3                      4
	// Sample lines:
	// 		RPi          0               imx477                [4056x3040]
	// 		ZWO          1               ASI120MC Mini
	// ZWO Model names may have multiple words.

	int on_line=0;
	(void) getLine(NULL);		// resets the buffer pointer
	while ((line = getLine(buf)) != NULL)
	{
		on_line++;
		Log(5, "Line %d: [%s]\n", on_line, line);
		(void) getToken(NULL, '\t');		// tells getToken() we have a new line.

		char *cameraType = getToken(line, '\t');
		char *numStr = getToken(line, '\t');
		char *cameraModel = getToken(line, '\t');
		if (cameraModel != NULL)
		{
			int cameraNum = atoi(numStr);
			Log(5, "  cameraType=[%s], cameraNum=[%d], cameraModel=[%s]\n", cameraType, cameraNum, cameraModel);
			CONNECTED_CAMERAS *cC = &connectedCameras[totalNum_connectedCameras++];
			cC->cameraID = cameraNum;
			strncpy(cC->Type, cameraType, CC_TYPE_SIZE);
#ifdef IS_ZWO
			strncpy(cC->Name, cameraModel, CAMERA_NAME_SIZE);
			strncpy(cC->Sensor, cameraModel, CAMERA_NAME_SIZE);
#else
			// cC->Name done later
			strncpy(cC->Sensor, cameraModel, SENSOR_SIZE);
#endif

			if (strcmp(cameraType, CAMERA_TYPE) == 0)
				numThisType++;

			// Add to the list of connected camera types if not already there.
			const char *p;
			int n = num_connectedCameraTypes;
			for (int i=0; i <= n; i++)
			{
Log(5, "Checking connectedCameraTypes[%d] of %d\n", i, n);
				if (i == num_connectedCameraTypes)
				{
					p = "";
				}
				else
				{
					p = connectedCameraTypes[i];
				}
Log(5, "    p is [%s], cameraType=[%s]\n", *p != '\0' ? p : "NOT SET", cameraType);
				if (strcmp(p, cameraType) == 0)
				{
Log(5, "  >> %s already in list; skipping\n", p);
					break;
				} else if (num_connectedCameraTypes == 0 || strcmp(p, cameraType) != 0)
				{
					connectedCameraTypes[num_connectedCameraTypes] = cC->Type;
					num_connectedCameraTypes++;
Log(5, "  NEW TYPE FOUND [%s], num_connectedCameraTypes now = %d\n", cC->Type, num_connectedCameraTypes);
					break;
				}
			}
		}
		else
		{
			// "line" ends with newline
			Log(1, "%s: WARNING: skipping invalid line %d in '%s': [%s]",
				CG.ME, on_line, basename(CG.connectedCamerasFile), line);
		}
	}

	Log(4, "%s connected cameras: %d of %d total types connected\n",
		CAMERA_TYPE, numThisType, num_connectedCameraTypes);

#ifdef IS_ZWO
	int  ZWOnum = ASIGetNumOfConnectedCameras();
	if (ZWOnum != numThisType)
	{
		Log(0, "%s: ERROR: mismatch with number of ZWO cameras connected: per ZWO SDK: %d, per %s: %d\n",
			CG.ME, ZWOnum, CG.connectedCamerasFile, numThisType);

		Log(1, "Attached Cameras:\n");
		ASI_CAMERA_INFO info;
		for (int i=0; i < ZWOnum; i++)
		{
			Log(1, "    Camera # %d: ", i);
			ASI_ERROR_CODE ret = ASIGetCameraProperty(&info, i);
			if (ret != ASI_SUCCESS)
			{
				char *getRetCode(ASI_ERROR_CODE code);
				Log(1, "ERROR: cannot get information: %s.\n", getRetCode(ret));
			}
			else
			{
				Log(1, "Name: %s, CameraID: %d, MaxHeight: %ld, MaxWidth: %ld\n",
					info.Name, info.CameraID, info.MaxHeight, info.MaxWidth);
			}
		}

		closeUp(EXIT_ERROR_STOP);
	}
#endif

	return(numThisType);
}



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

typedef struct _ASI_CAMERA_INFO
{
	char Module[MODULE_SIZE];				// sensor name; RPi only
	size_t Module_len;						// strncmp length.  0 for whole Module name
	char Name[CAMERA_NAME_SIZE];			// Name of camera
	int CameraID;
	long MaxHeight;							// sensor height
	long MaxWidth;
	ASI_BOOL IsColorCam;					// Is this a color camera?
	ASI_BAYER_PATTERN BayerPattern;
	int SupportedBins[5];	// 1 means bin 1x1 is supported, 2 means 2x2 is supported, etc.
	ASI_IMG_TYPE SupportedVideoFormat[8];	// Supported image formats
	double PixelSize;						// e.g, 5.6 um
	ASI_BOOL IsCoolerCam;
	int BitDepth;
	ASI_BOOL SupportsTemperature;

	// These are RPi only:
	ASI_BOOL SupportsAutoFocus;
	char Sensor[SENSOR_SIZE];				// full sensor name returned by --list-cameras
} ASI_CAMERA_INFO;


// The number and order of these needs to match argumentNames[]
typedef enum ASI_CONTROL_TYPE{
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
	EV,
	SATURATION,
	CONTRAST,
	SHARPNESS,

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

ASI_CAMERA_INFO ASICameraInfoArray[] =
{
	// The CameraID will be updated for the cameras physically connected.

	// Module (sensor), Module_len, Name, CameraID, MaxHeight, MaxWidth, IsColorCam,
		// BayerPattern, SupportedBins, SupportedVideoFormat, PixelSize, IsCoolerCam,
		// BitDepth, SupportsTemperature, SupportAutoFocus
	{ "imx477", 0, "HQ", 0, 3040, 4056, ASI_TRUE,
		// Need ASI_IMG_END so we know where the end of the list is.
		BAYER_RG, {1, 2, 0}, {ASI_IMG_RGB24, ASI_IMG_END}, 1.55, ASI_FALSE,
		12, ASI_TRUE, ASI_FALSE
	},

	// There are many versions of the imx708 (_wide, _noir, _wide_noir, etc.)
	// so just check for "imx708" (6 characters).
	{ "imx708", 6, "Module 3", 0, 2592, 4608, ASI_TRUE,
		BAYER_RG, {1, 2, 0}, {ASI_IMG_RGB24, ASI_IMG_END}, 1.4, ASI_FALSE,
		10, ASI_TRUE, ASI_TRUE
	},

	{ "ov5647", 0, "Version 1", 0, 1944, 2592, ASI_TRUE,
		BAYER_RG, {1, 2, 0}, {ASI_IMG_RGB24, ASI_IMG_END}, 1.4, ASI_FALSE,
		10, ASI_FALSE, ASI_FALSE
	},

	{ "imx290", 0, "imx290 60.00 fps", 0, 1080, 1920, ASI_TRUE,
		BAYER_RG, {1, 2, 0}, {ASI_IMG_RGB24, ASI_IMG_END}, 2.9, ASI_FALSE,
		12, ASI_FALSE, ASI_FALSE
	},

	{ "imx519", 0, "Arducam 16 MP", 0, 3496, 4656, ASI_TRUE,
		BAYER_RG, {1, 2, 0}, {ASI_IMG_RGB24, ASI_IMG_END}, 1.22, ASI_FALSE,
		10, ASI_FALSE, ASI_TRUE
	},

	{ "arducam_64mp", 0, "Arducam 64 MP", 0, 6944, 9152, ASI_TRUE,
		BAYER_RG, {1, 2, 0}, {ASI_IMG_RGB24, ASI_IMG_END}, 0.8, ASI_FALSE,
		10, ASI_FALSE, ASI_TRUE
	},

	{ "arducam-pivariety", 0, "Arducam 462", 0, 1080, 1920, ASI_TRUE,
		BAYER_RG, {1, 2, 0}, {ASI_IMG_RGB24, ASI_IMG_END}, 2.9, ASI_FALSE,
		10, ASI_FALSE, ASI_TRUE
	},

	{ "imx219", 0, "Waveshare imx219-d160", 0, 2464, 3280, ASI_TRUE,
		BAYER_RG, {1, 2, 0}, {ASI_IMG_RGB24, ASI_IMG_END}, 1.12, ASI_FALSE,
		10, ASI_FALSE, ASI_FALSE
	},

	{ "ov64a40", 0, "Arducam 64MP Owlsight", 0, 6944, 9248, ASI_TRUE,
		BAYER_BG, {1, 2, 0}, {ASI_IMG_RGB24, ASI_IMG_END}, 1.008, ASI_FALSE,
		10, ASI_FALSE, ASI_TRUE
	},

	{ "imx283", 0, "OneInchEye IMX283", 0, 3648, 5472, ASI_TRUE,
		BAYER_RG, {1, 2, 0}, {ASI_IMG_RGB24, ASI_IMG_END}, 2.4, ASI_FALSE,
		12, ASI_FALSE, ASI_FALSE
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
	{ "TargetBrightness", "brightness" },		// not used but keep to be consistent with ZWO
	{ "ExposureCompensation", "ev" },
	{ "Saturation", "saturation" },
	{ "Contrast", "contrast" },
	{ "Sharpness", "sharpness" },
};
int const argumentNamesSize =  sizeof(argumentNames) / sizeof(argumentNames[0]);

#define MAX_NUM_CONTROL_CAPS (CONTROL_TYPE_END)
ASI_CONTROL_CAPS ControlCapsArray[][MAX_NUM_CONTROL_CAPS] =
{
	// Each camera model has 1 entry for libcamera.
	// If a newer camera package is ever release an entry for it needs to be added.
	// They need to be in that order and in the same order as in ASICameraInfoArray[].

	// The "Name" must match what ZWO uses; "" names means not supported.
	// 99 == don't know

	// Name, Description, MaxValue, MinValue, DefaultValue, CurrentValue, IsAutoSupported, IsWritable, ControlType
	{ // imx477, libcamera		THIS MUST BE THE FIRST CAMERA
		{ "Gain", "Gain", 16.0, 1.0, 1.0, NOT_SET, ASI_TRUE, ASI_TRUE, ASI_GAIN },
		{ "Exposure", "Exposure Time (us)", 230 * US_IN_SEC, 114, 10000, NOT_SET, ASI_TRUE, ASI_TRUE, ASI_EXPOSURE },
		{ "WB_R", "White balance: Red component", 10.0, 0.1, 2.5, NOT_SET, ASI_TRUE, ASI_TRUE, ASI_WB_R },
		{ "WB_B", "White balance: Blue component", 10.0, 0.1, 2.0, NOT_SET, ASI_TRUE, ASI_TRUE, ASI_WB_B },
		{ "Flip", "Flip: 0->None, 1->Horiz, 2->Vert, 3->Both", 3, 0, 0, NOT_SET, ASI_FALSE, ASI_TRUE, ASI_FLIP },
		{ "AutoExpMaxGain", "Auto exposure maximum gain value", 16.0, 1.0, 16.0, NOT_SET, ASI_FALSE, ASI_TRUE, ASI_AUTO_MAX_GAIN },
		{ "AutoExpMaxExpMS", "Auto exposure maximum exposure value (ms)", 230 * MS_IN_SEC, 1, 60 * MS_IN_SEC, NOT_SET, ASI_FALSE, ASI_TRUE, ASI_AUTO_MAX_EXP },
		{ "ExposureCompensation", "Exposure Compensation", 10.0, -10.0, 0.0, NOT_SET, ASI_FALSE, ASI_TRUE, EV },
		{ "Saturation", "Saturation", 15.99, 0.0, 1.0, NOT_SET, ASI_FALSE, ASI_TRUE, SATURATION },
		{ "Contrast", "Contrast", 15.99, 0.0, 1.0, NOT_SET, ASI_FALSE, ASI_TRUE, CONTRAST },
		{ "Sharpness", "Sharpness", 15.99, 0.0, 1.0, NOT_SET, ASI_FALSE, ASI_TRUE, SHARPNESS },

		{ "End", "End", 0.0, 0.0, 0.0, 0.0, ASI_FALSE, ASI_FALSE, CONTROL_TYPE_END },	// Signals end of list
	},

	{ // imx708*, libcamera
		{ "Gain", "Gain", 16.0, 1.122807, 1.122807, NOT_SET, ASI_TRUE, ASI_TRUE, ASI_GAIN },
		{ "Exposure", "Exposure Time (us)", 112015553, 26, 10000, NOT_SET, ASI_TRUE, ASI_TRUE, ASI_EXPOSURE },
		{ "WB_R", "White balance: Red component", 32.0, 0.0, 2.5, NOT_SET, ASI_TRUE, ASI_TRUE, ASI_WB_R },
		{ "WB_B", "White balance: Blue component", 32.0, 0.0, 2.0, NOT_SET, ASI_TRUE, ASI_TRUE, ASI_WB_B },
		{ "Flip", "Flip: 0->None, 1->Horiz, 2->Vert, 3->Both", 3, 0, 0, NOT_SET, ASI_FALSE, ASI_TRUE, ASI_FLIP },
		{ "AutoExpMaxGain", "Auto exposure maximum gain value", 16.0, 1.122807, 16.0, NOT_SET, ASI_FALSE, ASI_TRUE, ASI_AUTO_MAX_GAIN },
		{ "AutoExpMaxExpMS", "Auto exposure maximum exposure value (ms)", 112015553 / US_IN_MS, 26.0, 60 * MS_IN_SEC, NOT_SET, ASI_FALSE, ASI_TRUE, ASI_AUTO_MAX_EXP },
		{ "ExposureCompensation", "Exposure Compensation", 8.0, -8.0, 0.0, NOT_SET, ASI_FALSE, ASI_TRUE, EV },
		{ "Saturation", "Saturation", 32.0, 0.0, 1.0, NOT_SET, ASI_FALSE, ASI_TRUE, SATURATION },
		{ "Contrast", "Contrast", 32.0, 0.0, 1.0, NOT_SET, ASI_FALSE, ASI_TRUE, CONTRAST },
		{ "Sharpness", "Sharpness", 32.0, 0.0, 1.0, NOT_SET, ASI_FALSE, ASI_TRUE, SHARPNESS },

		{ "End", "End", 0.0, 0.0, 0.0, 0.0, ASI_FALSE, ASI_FALSE, CONTROL_TYPE_END },
	},

	{ // ov5647, libcamera
		{ "Gain", "Gain", 63.9375, 1.0, 1.0, NOT_SET, ASI_TRUE, ASI_TRUE, ASI_GAIN },
		{ "Exposure", "Exposure Time (us)", 969249, 130, 9000, NOT_SET, ASI_TRUE, ASI_TRUE, ASI_EXPOSURE },
		{ "WB_R", "White balance: Red component", 32.0, 0.0, 0.0, NOT_SET, ASI_TRUE, ASI_TRUE, ASI_WB_R },
		{ "WB_B", "White balance: Blue component", 32.0, 0.0, 0.0, NOT_SET, ASI_TRUE, ASI_TRUE, ASI_WB_B },
		{ "Flip", "Flip: 0->None, 1->Horiz, 2->Vert, 3->Both", 3, 0, 0, NOT_SET, ASI_FALSE, ASI_TRUE, ASI_FLIP },
		{ "AutoExpMaxGain", "Auto exposure maximum gain value", 63.9375, 1.0, 63.9375, NOT_SET, ASI_FALSE, ASI_TRUE, ASI_AUTO_MAX_GAIN },
		{ "AutoExpMaxExpMS", "Auto exposure maximum exposure value (ms)", 969249 / US_IN_MS, 1.0, 9 * MS_IN_SEC, NOT_SET, ASI_FALSE, ASI_TRUE, ASI_AUTO_MAX_EXP },
		{ "ExposureCompensation", "Exposure Compensation", 8.0, -8.0, 0.0, NOT_SET, ASI_FALSE, ASI_TRUE, EV },
		{ "Saturation", "Saturation", 32, 0.0, 1.0, NOT_SET, ASI_FALSE, ASI_TRUE, SATURATION },
		{ "Contrast", "Contrast", 32.0, 0.0, 1.0, NOT_SET, ASI_FALSE, ASI_TRUE, CONTRAST },
		{ "Sharpness", "Sharpness", 16.0, 0.0, 1.0, NOT_SET, ASI_FALSE, ASI_TRUE, SHARPNESS },

		{ "End", "End", 0.0, 0.0, 0.0, 0.0, ASI_FALSE, ASI_FALSE, CONTROL_TYPE_END },
	},

	{ // imx290, libcamera
		{ "Gain", "Gain", 16.0, 1.0, 1.0, NOT_SET, ASI_TRUE, ASI_TRUE, ASI_GAIN },
		{ "Exposure", "Exposure Time (us)", 200 * US_IN_SEC, 1, 10000, NOT_SET, ASI_TRUE, ASI_TRUE, ASI_EXPOSURE },
		{ "WB_R", "White balance: Red component", 10.0, 0.1, 2.5, NOT_SET, ASI_TRUE, ASI_TRUE, ASI_WB_R },
		{ "WB_B", "White balance: Blue component", 10.0, 0.1, 2.0, NOT_SET, ASI_TRUE, ASI_TRUE, ASI_WB_B },
		{ "Flip", "Flip: 0->None, 1->Horiz, 2->Vert, 3->Both", 3, 0, 0, NOT_SET, ASI_FALSE, ASI_TRUE, ASI_FLIP },
		{ "AutoExpMaxGain", "Auto exposure maximum gain value", 16.0, 1.0, 16.0, NOT_SET, ASI_FALSE, ASI_TRUE, ASI_AUTO_MAX_GAIN },
		{ "AutoExpMaxExpMS", "Auto exposure maximum exposure value (ms)", 200 * MS_IN_SEC, 1, 60 * MS_IN_SEC, NOT_SET, ASI_FALSE, ASI_TRUE, ASI_AUTO_MAX_EXP },
		{ "ExposureCompensation", "Exposure Compensation", 10.0, -10.0, 0.0, NOT_SET, ASI_FALSE, ASI_TRUE, EV },
		{ "Saturation", "Saturation", 15.99, 0.0, 1.0, NOT_SET, ASI_FALSE, ASI_TRUE, SATURATION },
		{ "Contrast", "Contrast", 15.99, 0.0, 1.0, NOT_SET, ASI_FALSE, ASI_TRUE, CONTRAST },
		{ "Sharpness", "Sharpness", 15.99, 0.0, 1.0, NOT_SET, ASI_FALSE, ASI_TRUE, SHARPNESS },

		{ "End", "End", 0.0, 0.0, 0.0, 0.0, ASI_FALSE, ASI_FALSE, CONTROL_TYPE_END },
	},

	{ // imx519, libcamera
		{ "Gain", "Gain", 16.0, 1.0, 1.0, NOT_SET, ASI_TRUE, ASI_TRUE, ASI_GAIN },
		{ "Exposure", "Exposure Time (us)", 200 * US_IN_SEC, 1, 10000, NOT_SET, ASI_TRUE, ASI_TRUE, ASI_EXPOSURE },
		{ "WB_R", "White balance: Red component", 32.0, 0.1, 2.5, NOT_SET, ASI_TRUE, ASI_TRUE, ASI_WB_R },
		{ "WB_B", "White balance: Blue component", 32.0, 0.1, 2.0, NOT_SET, ASI_TRUE, ASI_TRUE, ASI_WB_B },
		{ "Flip", "Flip: 0->None, 1->Horiz, 2->Vert, 3->Both", 3, 0, 0, NOT_SET, ASI_FALSE, ASI_TRUE, ASI_FLIP },
		{ "AutoExpMaxGain", "Auto exposure maximum gain value", 16.0, 1.0, 16.0, NOT_SET, ASI_FALSE, ASI_TRUE, ASI_AUTO_MAX_GAIN },
		{ "AutoExpMaxExpMS", "Auto exposure maximum exposure value (ms)", 200 * MS_IN_SEC, 1, 60 * MS_IN_SEC, NOT_SET, ASI_FALSE, ASI_TRUE, ASI_AUTO_MAX_EXP },
		{ "ExposureCompensation", "Exposure Compensation", 10.0, -10.0, 0.0, NOT_SET, ASI_FALSE, ASI_TRUE, EV },
		{ "Saturation", "Saturation", 32.0, 0.0, 1.0, NOT_SET, ASI_FALSE, ASI_TRUE, SATURATION },
		{ "Contrast", "Contrast", 32.0, 0.0, 1.0, NOT_SET, ASI_FALSE, ASI_TRUE, CONTRAST },
		{ "Sharpness", "Sharpness", 16.0, 0.0, 1.0, NOT_SET, ASI_FALSE, ASI_TRUE, SHARPNESS },

		{ "End", "End", 0.0, 0.0, 0.0, 0.0, ASI_FALSE, ASI_FALSE, CONTROL_TYPE_END },
	},

	{ // arducam_64mp, libcamera
		{ "Gain", "Gain", 16.0, 1.0, 1.0, NOT_SET, ASI_TRUE, ASI_TRUE, ASI_GAIN },
		{ "Exposure", "Exposure Time (us)", 200 * US_IN_SEC, 1, 10000, NOT_SET, ASI_TRUE, ASI_TRUE, ASI_EXPOSURE },
		{ "WB_R", "White balance: Red component", 10.0, 0.1, 2.5, NOT_SET, ASI_TRUE, ASI_TRUE, ASI_WB_R },
		{ "WB_B", "White balance: Blue component", 10.0, 0.1, 2.0, NOT_SET, ASI_TRUE, ASI_TRUE, ASI_WB_B },
		{ "Flip", "Flip: 0->None, 1->Horiz, 2->Vert, 3->Both", 3, 0, 0, NOT_SET, ASI_FALSE, ASI_TRUE, ASI_FLIP },
		{ "AutoExpMaxGain", "Auto exposure maximum gain value", 16.0, 1.0, 16.0, NOT_SET, ASI_FALSE, ASI_TRUE, ASI_AUTO_MAX_GAIN },
		{ "AutoExpMaxExpMS", "Auto exposure maximum exposure value (ms)", 200 * MS_IN_SEC, 1, 60 * MS_IN_SEC, NOT_SET, ASI_FALSE, ASI_TRUE, ASI_AUTO_MAX_EXP },
		{ "ExposureCompensation", "Exposure Compensation", 10.0, -10.0, 0.0, NOT_SET, ASI_FALSE, ASI_TRUE, EV },
		{ "Saturation", "Saturation", 15.99, 0.0, 1.0, NOT_SET, ASI_FALSE, ASI_TRUE, SATURATION },
		{ "Contrast", "Contrast", 15.99, 0.0, 1.0, NOT_SET, ASI_FALSE, ASI_TRUE, CONTRAST },
		{ "Sharpness", "Sharpness", 15.99, 0.0, 1.0, NOT_SET, ASI_FALSE, ASI_TRUE, SHARPNESS },

		{ "End", "End", 0.0, 0.0, 0.0, 0.0, ASI_FALSE, ASI_FALSE, CONTROL_TYPE_END },
	},

	{ // arducam-pivariety, libcamera
		{ "Gain", "Gain", 200.0, 1.0, 1.33, NOT_SET, ASI_TRUE, ASI_TRUE, ASI_GAIN },
		{ "Exposure", "Exposure Time (us)", 15.5 * US_IN_SEC, 14, 10 * US_IN_SEC, NOT_SET, ASI_TRUE, ASI_TRUE, ASI_EXPOSURE },
		{ "WB_R", "White balance: Red component", 32.0, 0.0, 1.0, NOT_SET, ASI_TRUE, ASI_TRUE, ASI_WB_R },
		{ "WB_B", "White balance: Blue component", 32.0, 0.0, 1.0, NOT_SET, ASI_TRUE, ASI_TRUE, ASI_WB_B },
		{ "Flip", "Flip: 0->None, 1->Horiz, 2->Vert, 3->Both", 3, 0, 0, NOT_SET, ASI_FALSE, ASI_TRUE, ASI_FLIP },
		{ "AutoExpMaxGain", "Auto exposure maximum gain value", 200.0, 1.0, 200.0, NOT_SET, ASI_FALSE, ASI_TRUE, ASI_AUTO_MAX_GAIN },
		{ "AutoExpMaxExpMS", "Auto exposure maximum exposure value (ms)", 15.5 * MS_IN_SEC, 1, 15.5 * MS_IN_SEC, NOT_SET, ASI_FALSE, ASI_TRUE, ASI_AUTO_MAX_EXP },
		{ "ExposureCompensation", "Exposure Compensation", 8.0, -8.0, 0.0, NOT_SET, ASI_FALSE, ASI_TRUE, EV },
		{ "Saturation", "Saturation", 32.0, 0.0, 1.0, NOT_SET, ASI_FALSE, ASI_TRUE, SATURATION },
		{ "Contrast", "Contrast", 32.0, 0.0, 1.0, NOT_SET, ASI_FALSE, ASI_TRUE, CONTRAST },
		{ "Sharpness", "Sharpness", 16.0, 0.0, 1.0, NOT_SET, ASI_FALSE, ASI_TRUE, SHARPNESS },

		{ "End", "End", 0.0, 0.0, 0.0, 0.0, ASI_FALSE, ASI_FALSE, CONTROL_TYPE_END },
	},

	{ // Waveshare imx219, libcamera
		{ "Gain", "Gain", 10.666667, 1.0, 1.0, NOT_SET, ASI_TRUE, ASI_TRUE, ASI_GAIN },
		{ "Exposure", "Exposure Time (us)", 11.767556 * US_IN_SEC, 75, 10 * US_IN_SEC, NOT_SET, ASI_TRUE, ASI_TRUE, ASI_EXPOSURE },
		{ "WB_R", "White balance: Red component", 32.0, 0.0, 1.0, NOT_SET, ASI_TRUE, ASI_TRUE, ASI_WB_R },
		{ "WB_B", "White balance: Blue component", 32.0, 0.0, 1.0, NOT_SET, ASI_TRUE, ASI_TRUE, ASI_WB_B },
		{ "Flip", "Flip: 0->None, 1->Horiz, 2->Vert, 3->Both", 3, 0, 0, NOT_SET, ASI_FALSE, ASI_TRUE, ASI_FLIP },
		{ "AutoExpMaxGain", "Auto exposure maximum gain value", 10.666667, 1.0, 10.666667, NOT_SET, ASI_FALSE, ASI_TRUE, ASI_AUTO_MAX_GAIN },
		{ "AutoExpMaxExpMS", "Auto exposure maximum exposure value (ms)", 11.767556 * MS_IN_SEC, 1, 11.767556 * MS_IN_SEC, NOT_SET, ASI_FALSE, ASI_TRUE, ASI_AUTO_MAX_EXP },
		{ "ExposureCompensation", "Exposure Compensation", 8.0, -8.0, 0.0, NOT_SET, ASI_FALSE, ASI_TRUE, EV },
		{ "Brightness", "Brightness", 1.0, -1.0, 0.0, NOT_SET, ASI_FALSE, ASI_TRUE, ASI_AUTO_TARGET_BRIGHTNESS },
		{ "Saturation", "Saturation", 32.0, 0.0, 1.0, NOT_SET, ASI_FALSE, ASI_TRUE, SATURATION },
		{ "Contrast", "Contrast", 32.0, 0.0, 1.0, NOT_SET, ASI_FALSE, ASI_TRUE, CONTRAST },
		{ "Sharpness", "Sharpness", 16.0, 0.0, 1.0, NOT_SET, ASI_FALSE, ASI_TRUE, SHARPNESS },

		{ "End", "End", 0.0, 0.0, 0.0, 0.0, ASI_FALSE, ASI_FALSE, CONTROL_TYPE_END },
	},

	{	// Arducam ov64a40, libcamera
		{ "Gain", "Gain", 15.992188, 1.0, 1.0, NOT_SET, ASI_TRUE, ASI_TRUE, ASI_GAIN },
		{ "Exposure", "Exposure Time (us)", 608453664, 580, 10000000, NOT_SET, ASI_TRUE, ASI_TRUE, ASI_EXPOSURE },
		{ "WB_R", "White balance: Red component", 32.0, 0.0, 1.0, NOT_SET, ASI_TRUE, ASI_TRUE, ASI_WB_R },
		{ "WB_B", "White balance: Blue component", 32.0, 0.0, 1.0, NOT_SET, ASI_TRUE, ASI_TRUE, ASI_WB_B },
		{ "Flip", "Flip: 0->None 1->Horiz 2->Vert 3->Both", 3, 0, 0, NOT_SET, ASI_FALSE, ASI_TRUE, ASI_FLIP },
		{ "AutoExpMaxGain", "Auto exposure maximum gain value", 15.992188, 1.0, 1.0, NOT_SET, ASI_FALSE, ASI_TRUE, ASI_AUTO_MAX_GAIN },
		{ "AutoExpMaxExpMS", "Auto exposure maximum exposure value (ms)", 608454, 0.580, 60000, NOT_SET, ASI_FALSE, ASI_TRUE, ASI_AUTO_MAX_EXP },
		{ "ExposureCompensation", "Exposure Compensation", 8.0, -8.0, 0.0, NOT_SET, ASI_FALSE, ASI_TRUE, EV },
		{ "Saturation", "Saturation", 32.0, 0.0, 1.0, NOT_SET, ASI_FALSE, ASI_TRUE, SATURATION },
		{ "Contrast", "Contrast", 32.0, 0.0, 1.0, NOT_SET, ASI_FALSE, ASI_TRUE, CONTRAST },
		{ "Sharpness", "Sharpness", 16.0, 0.0, 1.0, NOT_SET, ASI_FALSE, ASI_TRUE, SHARPNESS },

		{ "End", "End", 0.0, 0.0, 0.0, 0.0, ASI_FALSE, ASI_FALSE, CONTROL_TYPE_END },
	},

	{ // OneInchEye IMX283, libcamera
		{ "Gain", "Gain", 22.505495, 1.0, 4.0, NOT_SET, ASI_TRUE, ASI_TRUE, ASI_GAIN },
		{ "Exposure", "Exposure Time (us)", 129373756, 58, 10 * US_IN_SEC, NOT_SET, ASI_TRUE, ASI_TRUE, ASI_EXPOSURE },
		{ "WB_R", "White balance: Red component", 32.0, 0.0, 1.0, NOT_SET, ASI_TRUE, ASI_TRUE, ASI_WB_R },
		{ "WB_B", "White balance: Blue component", 32.0, 0.0, 1.0, NOT_SET, ASI_TRUE, ASI_TRUE, ASI_WB_B },
		{ "Flip", "Flip: 0->None 1->Horiz 2->Vert 3->Both", 3, 0, 0, NOT_SET, ASI_FALSE, ASI_TRUE, ASI_FLIP },
		{ "AutoExpMaxGain", "Auto exposure maximum gain value", 22.505495, 1.0, 4.0, NOT_SET, ASI_FALSE, ASI_TRUE, ASI_AUTO_MAX_GAIN },
		{ "AutoExpMaxExpMS", "Auto exposure maximum exposure value (ms)", 129374, .0580, 60 * MS_IN_SEC, NOT_SET, ASI_FALSE, ASI_TRUE, ASI_AUTO_MAX_EXP },
		{ "ExposureCompensation", "Exposure Compensation", 8.0, -8.0, 0.0, NOT_SET, ASI_FALSE, ASI_TRUE, EV },
		{ "Brightness", "Brightness", 1.0, -1.0, 0.0, NOT_SET, ASI_FALSE, ASI_TRUE, ASI_AUTO_TARGET_BRIGHTNESS },
		{ "Saturation", "Saturation", 32.0, 0.0, 1.0, NOT_SET, ASI_FALSE, ASI_TRUE, SATURATION },
		{ "Contrast", "Contrast", 32.0, 0.0, 1.0, NOT_SET, ASI_FALSE, ASI_TRUE, CONTRAST },
		{ "Sharpness", "Sharpness", 16.0, 0.0, 1.0, NOT_SET, ASI_FALSE, ASI_TRUE, SHARPNESS },

		{ "End", "End", 0.0, 0.0, 0.0, 0.0, ASI_FALSE, ASI_FALSE, CONTROL_TYPE_END },
	},

	// FUTURE CAMERAS GO HERE...
};



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
// Also save the info on each connected camera of the current type.
int getCameraNumber()
{
	int actualIndex;					// index into ASICameraInfoArray[]
	int RPiCameraIndex = -1;			// index into RPiCameras[]
	int thisIndex = -1;					// index of camera found in RPiCameras
	int num_RPiCameras = 0;

	enum LINE_TYPE {
		LT_camera, LT_libcamera
	} lineType;

if (0) {
	ASI_CAMERA_INFO *aci = NULL;
	size_t size = sizeof(ASI_CAMERA_INFO) * CG.numCameras;
	if ((aci = (ASI_CAMERA_INFO *) realloc(aci, size)) == NULL)
	{
		int e = errno;
		Log(0, "*** %s: ERROR: Could not realloc() for aci: %s!", CG.ME, strerror(e));
		closeUp(EXIT_ERROR_STOP);
	}

	const int cameraTokens = 15, controlCapsTokens = 9;
	const int maxArgs = cameraTokens;
	char *args[maxArgs] = {};		// maximum number of arguments

	// Read the whole configuration file into memory so we can create argv with pointers.
	static char *buf = readFileIntoBuffer(&CG, CG.RPI_cameraInfoFile);
	if (buf == NULL)
	{
		Log(0, "%s: ERROR: Unable to read from CG.RPI_cameraInfoFile '%s': %s\n",
			CG.ME, CG.RPI_cameraInfoFile, strerror(errno));
		closeUp(EXIT_ERROR_STOP);
	}

	bool cameraMatch = false;
	bool inCamera = false, inControlCaps = false, inLibcamera = false;
	char full_line[1000];
	char *line;
	int on_line = 0;
	char *token;
	int max_tokens = 0;

	(void) getLine(NULL);		// resets the buffer pointer
	while ((line = getLine(buf)) != NULL)
	{
		strcpy(full_line, line);		// use full_line in error messages
		on_line++;
		Log(5, "Line %3d: %s\n", on_line, full_line);

		(void) getToken(NULL, '\t');		// tells getToken() we have a new line.

		char *cameraLength = NULL;
		char *lt = getToken(line, '\t');	// line type
		if (lt == NULL)
		{
			Log(0, "%s: ERROR: Line %d: no line type found in %s [%s]\n",
				CG.ME, on_line, CG.RPI_cameraInfoFile, full_line);
			continue;
		}

		if (strcmp(lt, "camera") == 0)
		{
			lineType = LT_camera;
			max_tokens = cameraTokens;
		}
		else if (strcmp(lt, "libcamera") == 0)
		{
			lineType = LT_libcamera;
			max_tokens = controlCapsTokens;
		}
		else
		{
			Log(0, "%s: ERROR: Line %d: unknown line '%s' type in %s [%s]\n",
				CG.ME, on_line, lt, CG.RPI_cameraInfoFile, full_line);
			continue;
		}

		// Create an array of arguments.
		int numTokens = 0;
		while ((token = getToken(line, '\t')) != NULL)
		{
			numTokens++;
// printf("xxxxx token %d: %s\n", numTokens, token);

			if (numTokens == 1)
			{
				if (strcmp(token, "End") == 0)
				{
					break;
				}

				if (lineType == LT_camera)
				{
					// See if this is one of the connected cameras.

					// Determine how much of the Sensor name to compare.
					cameraLength = getToken(line, '\t');
// TODO: check for NULL
// printf("xxxxx >> token (l) %d: %s\n", numTokens+1, cameraLength);
					size_t len = atoi(cameraLength);
					if (len == 0)
					{
						len = strlen(token);
					}

					cameraMatch = false;
					for (int cc=0; cc < totalNum_connectedCameras; cc++)
					{
						CONNECTED_CAMERAS *cC = &connectedCameras[cc];
						if (strcmp(cC->Type, CAMERA_TYPE) != 0)
						{
							continue;
						}

// printf(">>>> checking %s vs %s for %ld [%s]\n", token, cC->Sensor, len, cameraLength);
			
						// Now compare the attached sensor name with what's in our list.
						if (strncmp(token, cC->Sensor, len) == 0)
						{
							cameraMatch = true;
							num_RPiCameras++;
							Log(5, "[[[[[[[[[[[[[ MATCH, num_RPiCameras=%d\n", num_RPiCameras);
							break;
						}
					}
				}

				if (cameraMatch)
				{
					if (lineType == LT_camera)
					{
						inCamera = true;
						inLibcamera = false;
						inControlCaps = false;
					}
					else if (lineType == LT_libcamera)
					{
						inLibcamera = true;
						inControlCaps = true;
					}
				}
			}
			else if (numTokens > max_tokens)
			{
				Log(5, "Too many tokens (%d vs %d)\n", numTokens, max_tokens);
				break;
			}

			if (cameraMatch)
			{
				Log(5, "SETTING args[%d] to %s\n", numTokens-1, token);
				args[numTokens-1] = token;
				if (lineType == LT_camera && numTokens == 1)
				{
					numTokens++;
					Log(5, ">> SETTING args[%d] to %s\n", numTokens-1, cameraLength);
					args[numTokens-1] = cameraLength;
				}
			}
		}

		if (cameraMatch)
		{
			if (numTokens == 1)
			{
				// End of control capability entries for this camera.
				inCamera = false;
				inLibcamera = false;
				inControlCaps = false;
			}
			else if (numTokens == cameraTokens)
			{
				// camera entry
				strncpy(aci[num_RPiCameras - 1].Module, args[0], MODULE_SIZE-1);
				aci[num_RPiCameras - 1].Module_len = atol(args[1]);
// TODO: add rest of args.

				inCamera = true;
			}
			else if (numTokens == controlCapsTokens)
			{
				// control caps entry
// TODO: add to CC array.
				inControlCaps = true;
			}
			else
			{
				Log(-1, "%s: Ignoring line %d in %s: too many %s tokens (%d) [%s]\n",
					CG.ME, on_line, CG.RPI_cameraInfoFile,
					(lineType == LT_camera) ? "camera" : "control caps",
					numTokens, full_line);
			}
		}
if (numTokens > 1) Log(5, ", inCamera=%s, inControlCaps=%s, inLibcamera=%s\n", yesNo(inCamera), yesNo(inControlCaps), yesNo(inLibcamera));

		if (num_RPiCameras == CG.numCameras)
		{
			Log(5, "Found %d cameras; skipping rest of file\n", CG.numCameras);
			break;
		}

	}
}// end of if(0)

	// For each camera found, update the next *RPiCameras[] entry to point to the
	// camera's ASICameraInfoArray[] entry.
	// Return the index into *RPiCameras[] of the attached camera we're using.

	for (int cc=0; cc < totalNum_connectedCameras; cc++)
	{
		CONNECTED_CAMERAS *cC = &connectedCameras[cc];
		if (strcmp(cC->Type, CAMERA_TYPE) != 0)
		{
			continue;
		}

		char *sensor = cC->Sensor;

		// Found a camera of the right type.

// XXX TODO: use RPI_cameraInfoFile instead
		// Check all known cameras to make sure it's one we know about.
		for (int i=0; i < ASICameraInfoArraySize; i++)
		{
			ASI_CAMERA_INFO *p = &ASICameraInfoArray[i];

			// This code tells us how much of the Module name to compare.
			size_t len;
			if (p->Module_len > 0)
				len = p->Module_len;
			else
				len = sizeof(p->Module);

			// Now compare the attached sensor name with what's in our list.
			if (strncmp(sensor, p->Module, len) == 0)
			{
				// The sensor is in our list.
				actualIndex = i;
				num_RPiCameras++;
				thisIndex++;
				cC->Module_len = p->Module_len;
				cC->Module = p->Module;

				strncpy(p->Sensor, sensor, SENSOR_SIZE);
				RPiCameras[thisIndex].CameraInfo = &ASICameraInfoArray[actualIndex];
				Log(4, "Saving sensor [%s] from ASICameraInfoArray[%d] to RPiCameras[%d],",
					sensor, actualIndex, thisIndex);
				RPiCameras[thisIndex].ControlCaps = &ControlCapsArray[actualIndex][0];
				Log(4, " ControlCapsArray[%d]", actualIndex);

				// Use camera model if we have it.
				if (CG.cm[0] != '\0')
				{
 					if (strcmp(RPiCameras[thisIndex].CameraInfo->Name, CG.cm) == 0)
					{
						RPiCameraIndex = thisIndex;
						Log(4, " - MATCH on cm=%s\n", CG.cm);
					}
					else
					{
						Log(4, ".\n");
					}
				} else if (thisIndex == CG.cameraNumber)
				{
					RPiCameraIndex = thisIndex;
					Log(4, " - MATCH\n");
				}
				else
				{
					Log(4, ".\n");
				}

				break;		// exit inner loop
			}
		}
	}

	// These checks should "never" fail since allsky.sh created the input file
	// based on what's connected.
	if (num_RPiCameras == 0)
	{
		Log(0, "%s: ERROR: No %s cameras found.\n", CG.ME, CAMERA_TYPE);
		closeUp(EXIT_NO_CAMERA);
	}
	if (RPiCameraIndex == -1)
	{
		Log(0, "%s: ERROR: camera number %d not found.\n", CG.ME, CG.cameraNumber);
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
		Log(0, "%s: ERROR: ASIGetCameraProperty(), iCameraIndex (%d) bad (CG.numCameras=%d).\n",
			CG.ME, iCameraIndex, CG.numCameras);
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
		Log(0, "%s: ERROR: ASIGetNumOfControls(), iCameraIndex (%d) bad.\n", CG.ME, iCameraIndex);
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
ASI_ERROR_CODE ASIGetControlCaps(
		int iCameraIndex,
		int iControlIndex,
		ASI_CONTROL_CAPS *pControlCaps)
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
ASI_ERROR_CODE ASIGetControlValue(
		int iCameraIndex,
		ASI_CONTROL_TYPE ControlType,
		double *plValue,
		ASI_BOOL *pbAuto)
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


// Empty routines so code compiles.
int stopExposure(int cameraID) { return((int) ASI_SUCCESS); }
int stopVideoCapture(int cameraID) { return((int) ASI_SUCCESS); }
int closeCamera(int cameraID) { return((int) ASI_SUCCESS); }
char const *getZWOexposureType(ZWOexposure t) { return("ZWOend"); }

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
	{ "TargetTemp", "targettemp" },
	{ "CoolerOn", "enablecooler" },					// day/night
	{ "MonoBin", "" },
	{ "FanOn", "??" },				// correct Control name?
	{ "PatternAdjust", "" },		// correct Control name?
	{ "AntiDewHeater", "" },		// correct Control name?
	{ "FanAdjust", "" },
	{ "PwrledBright", "" },
	{ "USBHubReset", "" },
	{ "GPSSupport", "" },
	{ "GPSStartLine", "" },
	{ "GPSEndLine", "" },
	{ "RollingInterval", "" },
	{ "future use 1", "" },		// in case ZWO adds more and we don't realize it
	{ "future use 2", "" },
	{ "future use 3", "" },
};
int const argumentNamesSize =  sizeof(argumentNames) / sizeof(argumentNames[0]);

int stopExposure(int cameraID)
{
	return((int) ASIStopExposure(cameraID));
}
int stopVideoCapture(int cameraID)
{
	return((int) ASIStopVideoCapture(cameraID));
}
int closeCamera(int cameraID)
{
	return((int) ASICloseCamera(cameraID));
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

char const *getZWOexposureType(ZWOexposure t)
{
	if (t == ZWOsnap) return("snapshot");
	if (t == ZWOvideoOff) return("video off between frames");
	if (t == ZWOvideo) return("video (original)");
	return("invalid type");
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
		ret = "ASI_ERROR_TIMEOUT";
		if (CG.ZWOexposureType == ZWOvideoOff)
			ret += " (video off between images)";
		else if (CG.ZWOexposureType == ZWOvideo)
			ret += " (original video mode)";
		// else just return ASI_ERROR_TIMEOUT.  Should never happen in ZWOsnap mode.
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
	// This also sets global totalNum_connectedCameras.
	CG.numCameras = getNumOfConnectedCameras();
	if (CG.numCameras <= 0)
	{
		Log(0, "*** %s: ERROR: No Connected Camera...\n", CG.ME);
		closeUp(EXIT_NO_CAMERA);		// If there are no cameras we can't do anything.
	}

	CG.cameraNumber = getCameraNumber();
	if (CG.cameraNumber >= CG.numCameras)
	{
		Log(0, "*** %s: ERROR: Camera number %d not connected.  Highest number is %d.\n",
			CG.ME, CG.cameraNumber, CG.numCameras-1);
		closeUp(EXIT_NO_CAMERA);
	}

	if (CG.numCameras > 1 && CG.debugLevel >= 4)
		printf("\nAttached Cameras:\n");

	ASI_CAMERA_INFO info;
	int numThisType = 0;
	for (int cc=0; cc < totalNum_connectedCameras; cc++)
	{
		CONNECTED_CAMERAS *cC = &connectedCameras[cc];
		if (strcmp(cC->Type, CAMERA_TYPE) != 0)
		{
			continue;
		}

		if (ASIGetCameraProperty(&info, numThisType) != ASI_SUCCESS)
		{
#ifdef IS_ZWO	// RPi version already displayed message.
			Log(0, "ERROR: cannot get information for camera number %d.\n", numThisType);
#endif
			numThisType++;
			continue;
		}

		if (CG.numCameras > 1 && CG.debugLevel >= 4)
			printf("  - %d", numThisType);

		char *cm;
#ifdef IS_RPi
		strncpy(cC->Name, info.Name, CAMERA_NAME_SIZE);
		snprintf(cC->Sensor, FULL_SENSOR_SIZE, "%s [%s]", info.Name, info.Sensor);
		cm = cC->Sensor;
#else
		cm = info.Name;
#endif
		if (CG.numCameras > 1 && CG.debugLevel >= 4)
		{
			printf(" %s ", cm);
			printf(" %s\n", numThisType == CG.cameraNumber ? " (selected)" : "");
		}

		numThisType++;
	}
}


// Get the camera control with the specified control type.
ASI_ERROR_CODE getControlCapForControlType(
		int iCameraIndex,
		ASI_CONTROL_TYPE ControlType,
		ASI_CONTROL_CAPS *pControlCap)
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
			Log(3, "%s: ASIGetControlCaps(%d, %i, &cc) failed: %s\n",
				CG.ME, iCameraIndex, i, getRetCode(ret));
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
			Log(1, "*** %s: WARNING: unable to get camera serial number (%s)\n",
				CG.ME, getRetCode(asiRetCode));
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

// Remove the camera type from the name if it's there.
char *skipType(char *cameraName)
{
	static char *p;
	p = cameraName;
	int l = strlen(CAMERA_TYPE);

	if (strncmp(CAMERA_TYPE, p, l) == 0)
		p += l;
	if (*p == ' ') p++;		// skip optional space
	return(p);
}


// Get the camera model, removing the camera type from the name if it's there.
char *getCameraModel(char *cameraName)
{
	static char cameraModel[CAMERA_NAME_SIZE + 1];
	strcpy(cameraModel, skipType(cameraName));

	return(cameraModel);
}

// Save information on the specified camera.
void saveCameraInfo(
		ASI_CAMERA_INFO cameraInfo,
		char const *file,
		int width, int height,
		double pixelSize,
		char const *bayer)
{
	char *sn = getSerialNumber(cameraInfo.CameraID);
	char camModel[CAMERA_NAME_SIZE + 1];
	strncpy(camModel, getCameraModel(cameraInfo.Name), CAMERA_NAME_SIZE);

	FILE *f;
	if (strcmp(file, "-") == 0)
	{
		f = stdout;
		file = "stdout";
	}
	else
	{
		f = fopen(file, "w");
		if (f == NULL)
		{
			Log(0, "%s: ERROR: Unable to open '%s': %s\n", CG.ME, file, strerror(errno));
			closeUp(EXIT_ERROR_STOP);
		}
	}
	Log(4, "saveCameraInfo(): saving to %s\n", file);

	// output basic information on camera as well as all it's capabilities
	fprintf(f, "{\n");
	fprintf(f, "\t\"cameraType\" : \"%s\",\n", CAMERA_TYPE);
		fprintf(f, "\t\"cameraTypes\" : [\n");
		for (int camType = 0; camType < num_connectedCameraTypes; camType++)
		{
			fprintf(f, "\t\t{ \"value\" : \"%s\", \"label\" : \"%s\" },\n",
				connectedCameraTypes[camType], connectedCameraTypes[camType]);
		}
		fprintf(f, "\t\t{ \"value\" : \"%s\", \"label\" : \"%s\" }\n", "Refresh", "Refresh");
		fprintf(f, "\t],\n");
	fprintf(f, "\t\"cameraName\" : \"%s\",\n", cameraInfo.Name);
	fprintf(f, "\t\"cameraModel\" : \"%s\",\n", camModel);
		fprintf(f, "\t\"cameraModels\" : [\n");
		int numThisType = 0;
		bool foundThisModel = false;
		for (int cc=0; cc < totalNum_connectedCameras; cc++)
		{
			CONNECTED_CAMERAS *cC = &connectedCameras[cc];
			if (strcmp(cC->Type, CAMERA_TYPE) != 0)
			{
				continue;
			}

			if (numThisType > 0)
			{
				fprintf(f, ",");		// comma on all but last one
				fprintf(f, "\n");
			}
			char *cm = getCameraModel(cC->Name);
			Log(5, "cC->Name=%s, cm=%s, camModel=%s\n", cC->Name, cm, camModel);
			if (strcmp(cm, camModel) == 0)
			{
				foundThisModel = true;
			}
			fprintf(f, "\t\t{ \"value\" : \"%s\", \"label\" : \"%s\" }",
				cm,
#ifdef IS_RPi
				skipType(cC->Sensor)
#else
				cm
#endif
			);

			numThisType++;
		}
		fprintf(f, "\n\t],\n");
		if (! foundThisModel)
		{
			Log(0, "%s: ERROR: Currently connected '%s %s' camera not found in '%s'.\n",
				CG.ME, CAMERA_TYPE, camModel, CG.connectedCamerasFile);
			if (f != stdout)
				fclose(f);
			closeUp(EXIT_ERROR_STOP);
		}
#ifdef IS_RPi
	fprintf(f, "\t\"sensor\" : \"%s\",\n", cameraInfo.Sensor);
#endif
#ifdef IS_ZWO
	fprintf(f, "\t\"cameraID\" : \"%s\",\n", hasCameraID ? (char const *)cID : "");
#endif
	fprintf(f, "\t\"cameraNumber\" : %d,\n", CG.cameraNumber);

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
				break;
			}
			if (i > 0)
			{
				fprintf(f, ",");		// comma on all but last one
				fprintf(f, "\n");
			}
			fprintf(f, "\t\t{ \"value\" : %d, \"label\" : \"%dx%d\" }", b, b, b);
		}
	fprintf(f, "\n\t],\n");

	fprintf(f, "\t\"hasSensorTemperature\" : %s,\n", CG.supportsTemperature ? "true" : "false");
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
		fprintf(f, "\t\t{ \"value\" : 180, \"label\" : \"180 degrees\" }\n");
	fprintf(f, "\t],\n");
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
	fprintf(f, "\n\t],\n");


	// Add some other things the camera supports, or the software supports for this camera.
	// Adding it to the "controls" array makes the code that checks what's available easier.
	fprintf(f, "\t\"controls\": [\n");

#ifdef IS_ZWO
	// Setting the sensor width and height with libcamera does a digital zoom,
	// then resizes the resulting image back to the original size.

	// sensor size was also saved above, but this is the size the user can change.
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
#endif

	// Crop values
	float maxCropPercent = 0.9;	// Don't allow full size
	fprintf(f, "\t\t{\n");
	fprintf(f, "\t\t\t\"Name\" : \"imageCropTop\",\n");
	fprintf(f, "\t\t\t\"argumentName\" : \"imagecroptop\",\n");
	fprintf(f, "\t\t\t\"MinValue\" : 0,\n");
	fprintf(f, "\t\t\t\"MaxValue\" : %d,\n", int(height * maxCropPercent));
	fprintf(f, "\t\t\t\"DefaultValue\" : 0\n");
	fprintf(f, "\t\t},\n");
	fprintf(f, "\t\t{\n");
	fprintf(f, "\t\t\t\"Name\" : \"imageCropRight\",\n");
	fprintf(f, "\t\t\t\"argumentName\" : \"imagecropright\",\n");
	fprintf(f, "\t\t\t\"MinValue\" : 0,\n");
	fprintf(f, "\t\t\t\"MaxValue\" : %d,\n", int(width * maxCropPercent));
	fprintf(f, "\t\t\t\"DefaultValue\" : 0\n");
	fprintf(f, "\t\t},\n");
	fprintf(f, "\t\t{\n");
	fprintf(f, "\t\t\t\"Name\" : \"imageCropBottom\",\n");
	fprintf(f, "\t\t\t\"argumentName\" : \"imagecropbottom\",\n");
	fprintf(f, "\t\t\t\"MinValue\" : 0,\n");
	fprintf(f, "\t\t\t\"MaxValue\" : %d,\n", int(height * maxCropPercent));
	fprintf(f, "\t\t\t\"DefaultValue\" : 0\n");
	fprintf(f, "\t\t},\n");
	fprintf(f, "\t\t{\n");
	fprintf(f, "\t\t\t\"Name\" : \"imageCropLeft\",\n");
	fprintf(f, "\t\t\t\"argumentName\" : \"imagecropleft\",\n");
	fprintf(f, "\t\t\t\"MinValue\" : 0,\n");
	fprintf(f, "\t\t\t\"MaxValue\" : %d,\n", int(width * maxCropPercent));
	fprintf(f, "\t\t\t\"DefaultValue\" : 0\n");
	fprintf(f, "\t\t},\n");

	// Max values for images, timelapse, ...
	fprintf(f, "\t\t{\n");
	fprintf(f, "\t\t\t\"Name\" : \"timelapseWidth\",\n");
	fprintf(f, "\t\t\t\"argumentName\" : \"timelapsewidth\",\n");
	fprintf(f, "\t\t\t\"MaxValue\" : %d\n", width);
	fprintf(f, "\t\t},\n");
	fprintf(f, "\t\t{\n");
	fprintf(f, "\t\t\t\"Name\" : \"timelapseHeight\",\n");
	fprintf(f, "\t\t\t\"argumentName\" : \"timelapseheight\",\n");
	fprintf(f, "\t\t\t\"MaxValue\" : %d\n", height);
	fprintf(f, "\t\t},\n");
	fprintf(f, "\t\t{\n");
	fprintf(f, "\t\t\t\"Name\" : \"minitimelapseWidth\",\n");
	fprintf(f, "\t\t\t\"argumentName\" : \"minitimelapsewidth\",\n");
	fprintf(f, "\t\t\t\"MaxValue\" : %d\n", width);
	fprintf(f, "\t\t},\n");
	fprintf(f, "\t\t{\n");
	fprintf(f, "\t\t\t\"Name\" : \"minitimelapseHeight\",\n");
	fprintf(f, "\t\t\t\"argumentName\" : \"minitimelapseheight\",\n");
	fprintf(f, "\t\t\t\"MaxValue\" : %d\n", height);
	fprintf(f, "\t\t},\n");
	fprintf(f, "\t\t{\n");
	fprintf(f, "\t\t\t\"Name\" : \"imageresizeuploadsWidth\",\n");
	fprintf(f, "\t\t\t\"argumentName\" : \"imageresizeuploadswidth\",\n");
	fprintf(f, "\t\t\t\"MaxValue\" : %d\n", width);
	fprintf(f, "\t\t},\n");
	fprintf(f, "\t\t{\n");
	fprintf(f, "\t\t\t\"Name\" : \"imageresizeuploadsHeight\",\n");
	fprintf(f, "\t\t\t\"argumentName\" : \"imageresizeuploadsheight\",\n");
	fprintf(f, "\t\t\t\"MaxValue\" : %d\n", height);
	fprintf(f, "\t\t},\n");

	// Autogain - RPi should be on, ZWO off (until we implement the RPi autoexposure/gain algorithm on ZWO).
	fprintf(f, "\t\t{\n");
	fprintf(f, "\t\t\t\"Name\" : \"%s\",\n", "dayautogain");
	fprintf(f, "\t\t\t\"argumentName\" : \"%s\",\n", "dayautogain");
	fprintf(f, "\t\t\t\"DefaultValue\" : %s\n",
#ifdef IS_ZWO
		"false"
#else
		"true"
#endif
		);
	fprintf(f, "\t\t},\n");
	fprintf(f, "\t\t{\n");
	fprintf(f, "\t\t\t\"Name\" : \"%s\",\n", "nightautogain");
	fprintf(f, "\t\t\t\"argumentName\" : \"%s\",\n", "nightautogain");
	fprintf(f, "\t\t\t\"DefaultValue\" : %s\n",
#ifdef IS_ZWO
		"false"
#else
		"true"
#endif
		);
	fprintf(f, "\t\t},\n");

	fprintf(f, "\t\t{\n");
	fprintf(f, "\t\t\t\"Name\" : \"delayBetweenImages_ms\",\n");
	fprintf(f, "\t\t\t\"argumentName\" : \"delay\",\n");
	fprintf(f, "\t\t\t\"MinValue\" : %ld,\n", CG.minDelay_ms);
	fprintf(f, "\t\t\t\"MaxValue\" : \"%s\"\n", "none");
	fprintf(f, "\t\t},\n");

	fprintf(f, "\t\t{\n");
	fprintf(f, "\t\t\t\"Name\" : \"%s\",\n", "daymean");
	fprintf(f, "\t\t\t\"argumentName\" : \"%s\",\n", "daymean");
	fprintf(f, "\t\t\t\"MinValue\" : 0.0,\n");
	fprintf(f, "\t\t\t\"MaxValue\" : 1.0,\n");
	fprintf(f, "\t\t\t\"DefaultValue\" : %.1f\n", CG.myModeMeanSetting.dayMean);
	fprintf(f, "\t\t},\n");

	fprintf(f, "\t\t{\n");
	fprintf(f, "\t\t\t\"Name\" : \"%s\",\n", "DayMeanThreshold");
	fprintf(f, "\t\t\t\"argumentName\" : \"%s\",\n", "daymeanthreshold");
	fprintf(f, "\t\t\t\"MinValue\" : 0.01,\n");
	fprintf(f, "\t\t\t\"MaxValue\" : 1.0,\n");
	fprintf(f, "\t\t\t\"DefaultValue\" : %.2f\n", CG.myModeMeanSetting.dayMean_threshold);
	fprintf(f, "\t\t},\n");

	fprintf(f, "\t\t{\n");
	fprintf(f, "\t\t\t\"Name\" : \"%s\",\n", "nightmean");
	fprintf(f, "\t\t\t\"argumentName\" : \"%s\",\n", "nightmean");
	fprintf(f, "\t\t\t\"MinValue\" : 0.0,\n");
	fprintf(f, "\t\t\t\"MaxValue\" : 1.0,\n");
	fprintf(f, "\t\t\t\"DefaultValue\" : %.1f\n", CG.myModeMeanSetting.nightMean);
	fprintf(f, "\t\t},\n");

	fprintf(f, "\t\t{\n");
	fprintf(f, "\t\t\t\"Name\" : \"%s\",\n", "NightMeanThreshold");
	fprintf(f, "\t\t\t\"argumentName\" : \"%s\",\n", "nightmeanthreshold");
	fprintf(f, "\t\t\t\"MinValue\" : 0.01,\n");
	fprintf(f, "\t\t\t\"MaxValue\" : 1.0,\n");
	fprintf(f, "\t\t\t\"DefaultValue\" : %.2f\n", CG.myModeMeanSetting.nightMean_threshold);
	fprintf(f, "\t\t},\n");

	if (CG.isColorCamera) {
		fprintf(f, "\t\t{\n");
		fprintf(f, "\t\t\t\"Name\" : \"%s\",\n", "AutoWhiteBalance");
		fprintf(f, "\t\t\t\"argumentName\" : \"%s\",\n", "awb");
		fprintf(f, "\t\t\t\"DefaultValue\" : false\n");
		fprintf(f, "\t\t},\n");
	}
	if (CG.isCooledCamera) {
		fprintf(f, "\t\t{\n");
		fprintf(f, "\t\t\t\"Name\" : \"%s\",\n", "EnableCooler");
		fprintf(f, "\t\t\t\"argumentName\" : \"%s\",\n", "enablecooler");
		fprintf(f, "\t\t\t\"DefaultValue\" : false\n");
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
	fprintf(f, "\t\t\t\"DefaultValue\" : true\n");
	fprintf(f, "\t\t},\n");

	fprintf(f, "\t\t{\n");
	fprintf(f, "\t\t\t\"Name\" : \"%s\",\n", "histogrambox");
	fprintf(f, "\t\t\t\"argumentName\" : \"%s\",\n", "histogrambox");
	fprintf(f, "\t\t\t\"DefaultValue\" : \"%s\"\n", CG.HB.sArgs);
	fprintf(f, "\t\t},\n");

	fprintf(f, "\t\t{\n");
	fprintf(f, "\t\t\t\"Name\" : \"%s\",\n", "ZWOexposureType");
	fprintf(f, "\t\t\t\"argumentName\" : \"%s\",\n", "zwoexposuretype");
	fprintf(f, "\t\t\t\"DefaultValue\" : %d\n", ZWOsnap);
	fprintf(f, "\t\t},\n");
#endif

#ifdef IS_RPi
	fprintf(f, "\t\t{\n");
	fprintf(f, "\t\t\t\"Name\" : \"%s\",\n", "ExtraArguments");
	fprintf(f, "\t\t\t\"argumentName\" : \"%s\"\n", "extraargs");
	fprintf(f, "\t\t},\n");

	if (CG.ct == ctRPi) {
		fprintf(f, "\t\t{\n");
		fprintf(f, "\t\t\t\"Name\" : \"%s\",\n", "TuningFile");
		fprintf(f, "\t\t\t\"argumentName\" : \"%s\",\n", "tuningfile");
		fprintf(f, "\t\t\t\"DefaultValue\" : \"\"\n");
		fprintf(f, "\t\t},\n");

		fprintf(f, "\t\t{\n");
		fprintf(f, "\t\t\t\"Name\" : \"%s\",\n", "Rotation");
		fprintf(f, "\t\t\t\"argumentName\" : \"%s\"\n", "rotation");
		fprintf(f, "\t\t},\n");
	}
#endif

	double minGain=0.0, maxGain=0.0;
	int div_by;

	for (int i = 0; i < iNumOfCtrl; i++)
	{
		ASI_CONTROL_CAPS cc;
		ASI_ERROR_CODE ret = ASIGetControlCaps(cameraInfo.CameraID, i, &cc);
		if (ret != ASI_SUCCESS) {
			Log(0, "%s: ASIGetControlCaps(%d, %d...) failed with %s\n",
				CG.ME, cameraInfo.CameraID, i, getRetCode(ret));
			continue;
		}
// printf("iNumOfCtrl=%d, i=%d, cc.ControlType=%d, cc.Name=%s\n", iNumOfCtrl, i, cc.ControlType, cc.Name);
		if (cc.ControlType >= argumentNamesSize) {
			Log(0, "%s: ccControlType (%d) >= argumentNamesSize (%d)\n",
				CG.ME, cc.ControlType, argumentNamesSize);
// TODO: should we exit ??
			continue;
		}

		// blank names means it's unsupported
		if (cc.Name[0] == '\0')
		{
// printf("cc.Name[0] is null, i=%d\n", i);
			continue;
		}

		// blank argument name means we don't have a command-line argument for it
// printf("getting a for ControlType %d (of %d), i=%d\n", cc.ControlType, argumentNamesSize, i);
		char const *a =  argumentNames[cc.ControlType][1];
		if (a == NULL || a[0] == '\0')
		{
// if (a == NULL) printf("a is null, i=%d\n", i);
// else printf("a[0] is null, i=%d\n", i);
			continue;
		}

		if (strcmp(cc.Name, "Exposure") == 0) {
			// The camera's values are in microseconds (us),
			// but the WebUI displays in milliseconds (ms) so convert.
			div_by = US_IN_MS;
		} else {
			div_by = 1;
		}
		double min = cc.MinValue / (double)div_by;
		double max = cc.MaxValue / (double)div_by;
		double def = cc.DefaultValue / (double)div_by;
#ifdef IS_ZWO
		if (strcmp(cc.Name, "AutoExpMaxExpMS") == 0) {
			// ZWO defaults for this setting are extremely low, so use the max value.
			def = cc.MaxValue / (double)div_by;
		}
#endif

// XXXXXXXXX this is to help determine why some float settings are being output as integers
if (strcmp(cc.Name,"Gain") == 0 && CG.debugLevel >= 4)
{
printf("===== cc.MinValue=%1.2f, min=%1.2f   cc.MaxValue=%1.2f, max=%1.2f, iNumOfCtrl=%d\n",
(double) cc.MinValue, min, (double) cc.MaxValue, max, iNumOfCtrl);
printf("MinValue : %s,\n", LorF(min, "%ld", "%.3f"));
printf("MaxValue : %s,\n", LorF(max, "%ld", "%.3f"));
}

		fprintf(f, "\t\t{\n");
		fprintf(f, "\t\t\t\"Name\" : \"%s\",\n", cc.Name);
		fprintf(f, "\t\t\t\"argumentName\" : \"%s\",\n", a);
		fprintf(f, "\t\t\t\"MinValue\" : %s,\n", LorF(min, "%ld", "%.3f"));
		fprintf(f, "\t\t\t\"MaxValue\" : %s,\n", LorF(max, "%ld", "%.3f"));
		if (def == NO_DEFAULT)
			fprintf(f, "\t\t\t\"DefaultValue\" : \"none\",\n");
		else
			fprintf(f, "\t\t\t\"DefaultValue\" : %s,\n", LorF(def, "%ld", "%.3f"));
		fprintf(f, "\t\t\t\"IsAutoSupported\" : %s,\n", cc.IsAutoSupported == ASI_TRUE ? "true" : "false");
		fprintf(f, "\t\t\t\"IsWritable\" : %s,\n", cc.IsWritable == ASI_TRUE ? "true" : "false");
		fprintf(f, "\t\t\t\"ControlType\" : %d\n", cc.ControlType);
		fprintf(f, "\t\t},\n");

		if (strcmp(cc.Name, "Gain") == 0) {
			minGain = cc.MinValue;
			maxGain = cc.MaxValue;
		}
	}

	// These override the generic values.

	fprintf(f, "\t\t{\n");
	fprintf(f, "\t\t\t\"Name\" : \"%s\",\n", "dayexposure");
	fprintf(f, "\t\t\t\"argumentName\" : \"%s\",\n", "dayexposure");
	fprintf(f, "\t\t\t\"DefaultValue\" : %d\n", (int) (0.5 * MS_IN_SEC));
	fprintf(f, "\t\t},\n");
	fprintf(f, "\t\t{\n");
	fprintf(f, "\t\t\t\"Name\" : \"%s\",\n", "nightexposure");
	fprintf(f, "\t\t\t\"argumentName\" : \"%s\",\n", "nightexposure");
	fprintf(f, "\t\t\t\"DefaultValue\" : %d\n", 10 * MS_IN_SEC);
	fprintf(f, "\t\t},\n");

	// Set the day gain to the minimum possible.
	fprintf(f, "\t\t{\n");
	fprintf(f, "\t\t\t\"Name\" : \"%s\",\n", "daygain");
	fprintf(f, "\t\t\t\"argumentName\" : \"%s\",\n", "daygain");
	fprintf(f, "\t\t\t\"DefaultValue\" : %s\n", LorF(minGain, "%ld", "%.3f"));
	fprintf(f, "\t\t},\n");
	// Set the night gain to the half the max.
	fprintf(f, "\t\t{\n");
	fprintf(f, "\t\t\t\"Name\" : \"%s\",\n", "nightgain");
	fprintf(f, "\t\t\t\"argumentName\" : \"%s\",\n", "nightgain");
	fprintf(f, "\t\t\t\"DefaultValue\" : %s\n", LorF(maxGain / 2, "%ld", "%.3f"));
	fprintf(f, "\t\t}\n");		// NO COMMA ON LAST ONE


	// End the list
	fprintf(f, "\t]\n");
	fprintf(f, "}\n");

	if (f != stdout)
		fclose(f);
}

// Output basic camera information.
void outputCameraInfo(ASI_CAMERA_INFO cameraInfo, config cg,
	long width, long height, double pixelSize, char const *bayer)
{
	printf(" Camera Information:\n");
	printf("  - Type: %s\n", CAMERA_TYPE);
	printf("  - Model: %s", getCameraModel(cameraInfo.Name));
	if (strcmp(getCameraModel(cameraInfo.Name), cg.cm) != 0)
	{
		printf(" (%s)", cg.cm);
	}
	printf("\n");
#ifdef IS_ZWO
	printf("  - ID: %s\n", cID);
#endif
	printf("  - Serial Number: %s\n", getSerialNumber(cameraInfo.CameraID));
	if (cg.cameraNumber > 0)
		printf("   Camera number: %d\n", cg.cameraNumber);
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
		printf("  - Sensor temperature: ");
#ifdef IS_ZWO
		printf("%0.1f C\n", (float)temp / cg.divideTemperatureBy);
#else
		printf("not available until an image is taken.\n");
#endif
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
	 	Log(1, "*** %s: WARNING: daytime exposure %'ld us less than camera minimum of %'ld us; setting to minimum\n",
			cg->ME, cg->dayExposure_us, cg->cameraMinExposure_us);
	 	cg->dayExposure_us = cg->cameraMinExposure_us;
	}
	else if (cg->dayExposure_us > cg->cameraMaxExposure_us)
	{
	 	Log(-1, "*** %s: WARNING: daytime exposure %'ld us greater than camera maximum of %'ld us; setting to maximum\n",
			cg->ME, cg->dayExposure_us, cg->cameraMaxExposure_us);
	 	cg->dayExposure_us = cg->cameraMaxExposure_us;
	}
	else if (cg->dayAutoExposure && cg->dayExposure_us > cg->cameraMaxAutoExposure_us)
	{
	 	Log(-1, "*** %s: WARNING: daytime exposure %'ld us greater than camera maximum of %'ld us; setting to maximum\n",
			cg->ME, cg->dayExposure_us, cg->cameraMaxAutoExposure_us);
	 	cg->dayExposure_us = cg->cameraMaxAutoExposure_us;
	}

	if (cg->nightExposure_us < cg->cameraMinExposure_us)
	{
	 	Log(1, "*** %s: WARNING: nighttime exposure %'ld us less than camera minimum of %'ld us; setting to minimum\n",
			cg->ME, cg->nightExposure_us, cg->cameraMinExposure_us);
	 	cg->nightExposure_us = cg->cameraMinExposure_us;
	}
	else if (cg->nightExposure_us > cg->cameraMaxExposure_us)
	{
	 	Log(-1, "*** %s: WARNING: nighttime exposure %'ld us greater than camera maximum of %'ld us; setting to maximum\n",
			cg->ME, cg->nightExposure_us, cg->cameraMaxExposure_us);
	 	cg->nightExposure_us = cg->cameraMaxExposure_us;
	}
	else if (cg->nightAutoExposure && cg->nightExposure_us > cg->cameraMaxAutoExposure_us)
	{
	 	Log(-1, "*** %s: WARNING: nighttime exposure %'ld us greater than camera maximum of %'ld us; setting to maximum\n",
			cg->ME, cg->nightExposure_us, cg->cameraMaxAutoExposure_us);
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
		Log(0, "*** %s: ERROR: %s bin of %ldx%ld not supported by camera %s.\n",
			CG.ME, field, b, b, ci.Name);

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
		cg->myModeMeanSetting.minMean = DEFAULT_MINMEAN_ZWO;	// min number a user should enter
		cg->myModeMeanSetting.maxMean = DEFAULT_MAXMEAN_ZWO;	// max number a user should enter
		cg->myModeMeanSetting.dayMean_threshold = DEFAULT_DAYMEAN_THRESHOLD_ZWO;
		cg->myModeMeanSetting.nightMean_threshold = DEFAULT_NIGHTMEAN_THRESHOLD_ZWO;
		cg->myModeMeanSetting.minMean_threshold = DEFAULT_MINMEAN_THRESHOLD_ZWO;
		cg->myModeMeanSetting.maxMean_threshold = DEFAULT_MAXMEAN_THRESHOLD_ZWO;
		cg->myModeMeanSetting.mean_p0 = DEFAULT_MEAN_P0_ZWO;
		cg->myModeMeanSetting.mean_p1 = DEFAULT_MEAN_P1_ZWO;
		cg->myModeMeanSetting.mean_p2 = DEFAULT_MEAN_P2_ZWO;
		cg->myModeMeanSetting.minMean_p = DEFAULT_MINMEAN_P_ZWO;
		cg->myModeMeanSetting.maxMean_p = DEFAULT_MAXMEAN_P_ZWO;

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
		cg->myModeMeanSetting.mean_p0 = DEFAULT_MEAN_P0_RPi;
		cg->myModeMeanSetting.mean_p1 = DEFAULT_MEAN_P1_RPi;
		cg->myModeMeanSetting.mean_p2 = DEFAULT_MEAN_P2_RPi;
		cg->myModeMeanSetting.minMean_p = DEFAULT_MINMEAN_P_RPi;
		cg->myModeMeanSetting.maxMean_p = DEFAULT_MAXMEAN_P_RPi;
	}

	if (cg->imagesSavedInBackground) {
		// Images are saved in a separate thread so need to give time for an image to be saved.
		cg->minDelay_ms = 10;
	} else {
		// The capture program waits for the image to be saved.
		cg->minDelay_ms = 0;
	}

	// The remaining settings are camera-specific and have camera defaults.

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
			Log(0, "%s: ASI_AUTO_MAX_EXP failed with %s\n", cg->ME, getRetCode(ret));
			ok = false;
		}
	} else {
		Log(0, "%s: ASI_EXPOSURE failed with %s\n", cg->ME, getRetCode(ret));
		ok = false;
	}

	signal(SIGINT, IntHandle);		// When run at the command line, this signal terminates us.
	signal(SIGTERM, IntHandle);		// The service sends SIGTERM to end this program.
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

	// If this camera model/name is different than the last one it likely means the settings
	// are the the last camera as well, so stop.
	char *model = getCameraModel(ci.Name);
	if (strcmp(model, cg->cm) != 0)
	{
		Log(0, "%s: ERROR: camera model changed; was [%s], now [%s].\n", cg->ME, cg->cm, model);
		closeUp(EXIT_ERROR_STOP);
	}

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

	if (! validateFloat(&cg->myModeMeanSetting.dayMean, cg->myModeMeanSetting.minMean,
			cg->myModeMeanSetting.maxMean, "Daytime Mean Target", false))
		ok = false;
	if (! validateFloat(&cg->myModeMeanSetting.dayMean_threshold,
			cg->myModeMeanSetting.minMean_threshold, cg->myModeMeanSetting.maxMean_threshold,
			"Mean Threshold", false))
		ok = false;
	if (! validateFloat(&cg->myModeMeanSetting.nightMean, cg->myModeMeanSetting.minMean,
			cg->myModeMeanSetting.maxMean, "Nighttime Mean Target", false))
		ok = false;
	if (! validateFloat(&cg->myModeMeanSetting.nightMean_threshold,
			cg->myModeMeanSetting.minMean_threshold, cg->myModeMeanSetting.maxMean_threshold,
			"Mean Threshold", false))
		ok = false;
	if (! validateFloat(&cg->myModeMeanSetting.mean_p0, cg->myModeMeanSetting.minMean_p,
			cg->myModeMeanSetting.maxMean_p, "Mean p0", false))
		ok = false;
	if (! validateFloat(&cg->myModeMeanSetting.mean_p0, cg->myModeMeanSetting.minMean_p,
			cg->myModeMeanSetting.maxMean_p, "Mean p1", false))
		ok = false;
	if (! validateFloat(&cg->myModeMeanSetting.mean_p2, cg->myModeMeanSetting.minMean_p,
			cg->myModeMeanSetting.maxMean_p, "Mean p2", false))
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
		Log(0, "%s: ASI_FLIP failed with %s\n", cg->ME, getRetCode(ret));
		ok = false;
	}

	cg->defaultRotation = 0;
	if (cg->rotation != 0)
	{
		if (cg->ct == ctRPi)
		{
			// libcamera only supports 0 and 180 degree rotation
			if (cg->rotation != 180)
			{
				Log(0, "*** %s: ERROR: Only 0 and 180 degrees are supported for rotation; you entered %ld.\n", cg->ME, cg->rotation);
				ok = false;
			}
		}
		else if (cg->rotation != 90 && cg->rotation != 180 && cg->rotation != 270)
		{
			Log(0, "*** %s: ERROR: Only 0, 90, 180, and 270 degrees are supported for rotation; you entered %ld.\n", cg->ME, cg->rotation);
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

	validateLong(&cg->debugLevel, 0, 5, "Debug Level", true);

	cg->defaultBin = 1;
	if (! checkBin(cg->dayBin, ci, "Daytime Binning"))
		ok = false;
	if (! checkBin(cg->nightBin, ci, "Nighttime Binning"))
		ok = false;

	if (! validateLatitudeLongitude(cg))
		ok = false;

	// The remaining settings are camera-specific and have camera defaults.
	// If the user didn't specify anything (i.e., the value is NOT_CHANGED), set it to the default.

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
		Log(0, "*** %s: ERROR: ASI_GAIN failed with %s\n", cg->ME, getRetCode(ret));
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
		Log(0, "*** %s: ERROR: ASI_AUTO_MAX_GAIN failed with %s\n", cg->ME, getRetCode(ret));
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
			Log(0, "*** %s: ERROR: ASI_WB_R failed with %s\n", cg->ME, getRetCode(ret));
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
			Log(0, "*** %s: ERROR: ASI_WB_B failed with %s\n", cg->ME, getRetCode(ret));
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
			Log(0, "*** %s: ERROR: SATURATION failed with %s\n", cg->ME, getRetCode(ret));
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
			Log(0, "*** %s ERROR: CONTRAST failed with %s\n", cg->ME, getRetCode(ret));
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
			Log(0, "*** %s ERROR: SHARPNESS failed with %s\n", cg->ME, getRetCode(ret));
			ok = false;
		}
	}
	else if (cg->ct == ctZWO) {
		if (cg->isCooledCamera && (cg->dayEnableCooler || cg->nightEnableCooler)) {
			ret = getControlCapForControlType(cg->cameraNumber, ASI_TARGET_TEMP, &cc);
			if (ret == ASI_SUCCESS)
			{
				if (cg->dayTargetTemp == NOT_CHANGED)
					cg->dayTargetTemp = cc.DefaultValue;
				else
					validateLong(&cg->dayTargetTemp, cc.MinValue, cc.MaxValue,
						"Daytime Target Sensor Temperature", true);

				if (cg->nightTargetTemp == NOT_CHANGED)
					cg->nightTargetTemp = cc.DefaultValue;
				else
					validateLong(&cg->nightTargetTemp, cc.MinValue, cc.MaxValue,
						"Nighttime Target Sensor Temperature", true);
			} else if (ret != ASI_ERROR_INVALID_CONTROL_TYPE) {
				Log(0, "*** %s ERROR: ASI_TARGET_TEMP failed with %s\n", cg->ME, getRetCode(ret));
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
			Log(0, "*** %s: ERROR: ASI_BANDWIDTHOVERLOAD failed with %s\n", cg->ME, getRetCode(ret));
			ok = false;
		}
	}

	return(ok);
}

