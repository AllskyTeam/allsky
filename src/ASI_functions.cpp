// This file is #include'd into the capture*.cpp files.
// The CAMERA_BRAND #define must be set.
// For the RPi, functions that mimic the ZWO "ASI" functions were added so the capture
// code for both cameras can be as similar as possible.

#if !defined(CAMERA_BRAND)
#error ERROR: CAMERA_BRAND not defined
#endif

// Forward definitions of variables in capture*.cpp.
extern long debugLevel;
extern int iNumOfCtrl;
extern char const *CC_saveDir;
extern long cameraMinExposure_us;
extern long cameraMaxExposure_us;
extern long cameraMaxAutoexposure_us;
#ifdef IS_RPi
extern bool isLibcamera;
char const *getCameraCommand(bool);
#else
extern bool useNewExposureAlgorithm;
#endif

int numCameras = 0;		// used by several functions

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
} ASI_CAMERA_INFO;

typedef enum ASI_CONTROL_TYPE{ //Control type//
	ASI_GAIN = 0,
	ASI_EXPOSURE,
	ASI_GAMMA,
	ASI_WB_R,
	ASI_WB_B,
	ASI_TEMPERATURE,				// returns 10*temperature
	ASI_FLIP,
	ASI_AUTO_MAX_GAIN,				// Max gain in auto-gain mode
	ASI_AUTO_MAX_EXP,				// Max exposure in auto-exposure mode, in ms
	ASI_COOLER_POWER_PERC,
	ASI_TARGET_TEMP,
	ASI_COOLER_ON,
	ASI_FAN_ON,

	// RPI only:
	EV,
	BRIGHTNESS,
	CONTRAST,
	SATURATION,
	SHARPNESS,

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
	ASI_ERROR_INVALID_CONTROL_TYPE,	// invalid control type
	ASI_ERROR_GENERAL_ERROR,		// general error, eg: value is out of valid range
	ASI_ERROR_END
} ASI_ERROR_CODE;

typedef struct _ASI_ID {
	unsigned char id[8];
} ASI_ID;
typedef ASI_ID ASI_SN;

// We vary somewhat from ZWO here.  First, we have to hard-code the values since we can't query the camera.
// Second, some values differ between raspistill and libcamera.

ASI_CAMERA_INFO ASICameraInfoArray[] =
{
	// Module (sensor), Name, CameraID, MaxHeight, MaxWidth, IsColorCam, BayerPattern, SupportedBins,
	//	SupportedVideoFormat, PixelSize, IsCoolerCam, BitDepth, SupportsTemperature
	{ "imx477", "RPi HQ", 0, 3040, 4056, ASI_TRUE, BAYER_RG, {1, 2, 0},
		{ASI_IMG_RAW8, ASI_IMG_RGB24, ASI_IMG_RAW16}, 1.55, ASI_FALSE, 12, ASI_FALSE},

	// xxxxx TODO: check on 1.55 andA other settings
	{ "arducam_64mp", "ARDUCAM 64 MB", 0, 6944, 9248, ASI_TRUE, BAYER_GR, {1, 2, 4, 0},
		{ASI_IMG_RAW8, ASI_IMG_RGB24, ASI_IMG_RAW16}, 1.55, ASI_FALSE, 12, ASI_FALSE},

	// FUTURE CAMERAS GO HERE...
};

#define MAX_NUM_CONTROL_CAPS (CONTROL_TYPE_END)
ASI_CONTROL_CAPS ControlCapsArray[][MAX_NUM_CONTROL_CAPS] =
{
	// Index 0 = RPiHQ on libcamera. 1 = RPiHQ on raspistill.

	// The "Name" must match what ZWO uses.
	// Name, MaxValue, MinValue, DefaultValue, CurrentValue, IsAutoSupported, IsWritable, ControlType
	// -1 == does not apply.  99 == don't know
	{ // libcamera
		{ "Gain", "Gain", 16.0, 1, 1, NOT_SET, true, true, ASI_GAIN },
		{ "Exposure", "Exposure Time (us)", 230 * US_IN_SEC, 1, 32, NOT_SET, true, true, ASI_EXPOSURE },
		{ "WB_R", "Whit balance: Red component", 10.0, 0.1, 2.5, NOT_SET, true, true, ASI_WB_R },
		{ "WB_B", "Whit balance: Blue component", 10.0, 0.1, 2.0, NOT_SET, true, true, ASI_WB_B },
		{ "Flip", "Flip: 0->None, 1->Horiz, 2->Vert, 3->Both", 3, 0, 0, NOT_SET, false, true, ASI_FLIP },
		{ "AutoExpMaxGain", "Auto exposure maximum gain value", 16.0, 1, 16.0, NOT_SET, false, true, ASI_AUTO_MAX_GAIN },
		{ "AutoExpMaxExpMS", "Auto exposure maximum exposure value (ms)", 230 * MS_IN_SEC, 1, 60 * MS_IN_SEC, NOT_SET, false, true, ASI_AUTO_MAX_EXP },
		{ "ExposureCompensation", "Exposure Compensation", 10.0, -10.0, 0, NOT_SET, false, true, EV },
		{ "Brightness", "Brightness", 1.0, -1.0, 0, NOT_SET, false, true, BRIGHTNESS },
		{ "Contrast", "Contrast", 15.99, 0.0, 1.0, NOT_SET, false, true, CONTRAST },
		{ "Saturation", "Saturation", 15.99, 0.0, 1.0, NOT_SET, false, true, SATURATION },
		{ "Sharpness", "Sharpness", 15.99, 0.0, 1.0, NOT_SET, false, true, SHARPNESS },
		{ "End", "End", 0.0, 0.0, 0.0, 0.0, false, false, CONTROL_TYPE_END },	// Signals end of list
	},
	{ // raspistill.  Minimum width and height are 64.
		{ "Gain", "Gain", 16.0, 1, 1, NOT_SET, true, true, ASI_GAIN },
		{ "Exposure", "Exposure Time (us)", 230 * US_IN_SEC, 1, 32, NOT_SET, true, true, ASI_EXPOSURE },
		{ "WB_R", "White balance: Red component", 10.0, 0.1, 2.5, NOT_SET, true, true, ASI_WB_R },
		{ "WB_B", "White balance: Blue component", 10.0, 0.1, 2.0, NOT_SET, true, true, ASI_WB_B },
		{ "Flip", "Flip: 0->None, 1->Horiz, 2->Vert, 3->Both", 3, 0, 0, NOT_SET, false, true, ASI_FLIP },
		{ "AutoExpMaxGain", "Auto exposure maximum gain value", 16.0, 1, 16.0, NOT_SET, false, true, ASI_AUTO_MAX_GAIN },
		{ "AutoExpMaxExpMS", "Auto exposure maximum exposure value (ms)", 230 * MS_IN_SEC, 1, 60 * MS_IN_SEC, NOT_SET, false, true, ASI_AUTO_MAX_EXP },
		{ "ExposureCompensation", "Exposure Compensation", 10, -10, 0, NOT_SET, false, true, EV },
		{ "Brightness", "Brightness", 100, 0, 50, NOT_SET, false, true, BRIGHTNESS },		// xxx default ???
		{ "Contrast", "Contrast", 100, -100, 0, NOT_SET, false, true, CONTRAST },
		{ "Saturation", "Saturation", 100, -100, 0, NOT_SET, false, true, SATURATION },
		{ "Sharpness", "Sharpness", 100, -100, 0, NOT_SET, false, true, SHARPNESS },
		{ "End", "End", 0.0, 0.0, 0.0, 0.0, false, false, CONTROL_TYPE_END },	// Signals end of list
	}
	// TODO: add 2 entries for arducam_64mp (2nd entry can be empty since it's not supported on raspistill
};

char camerasInfoFile[128]	= { 0 };	// name of temporary file


// Return the number of connected cameras and put basic info on each camera in a file.
// We need the temporary file because it's a quick and dirty way to get output from system().
// TODO: use fork() and inter-process communication to get the info to avoid a temporary file.
int ASIGetNumOfConnectedCameras()
{
	// File to hold info on all the cameras.
	snprintf(camerasInfoFile, sizeof(camerasInfoFile), "%s/cameras.txt", CC_saveDir);

	char cmd[300];
	int num;
	// Put the list of cameras and attributes in a file and return the number of cameras (the exit code).
	if (isLibcamera)
	{
		// "libcamera-still --list-cameras" writes to stderr.
		snprintf(cmd, sizeof(cmd), "NUM=$(LIBCAMERA_LOG_LEVELS=FATAL libcamera-still --list-cameras 2>&1 | grep -E '^[0-9 ]' | tee '%s' | grep -E '^[0-9] : ' | wc -l); exit ${NUM}", camerasInfoFile);
	}
	else
	{
		// raspistill doesn't return any info on cameras, so assume only 1 camera attached.
		// Further we only support RPiHQ camera with raspistill (which we assume to be 1st camera).
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
*/


// Put the properties for the specified camera into pASICameraInfo.
ASI_ERROR_CODE ASIGetCameraProperty(ASI_CAMERA_INFO *pASICameraInfo, int iCameraIndex)
{
	if (iCameraIndex < 0 || iCameraIndex >= numCameras)
		return(ASI_ERROR_INVALID_INDEX);

	// Determine which camera sensor we have.
	if (camerasInfoFile[0] == '\0')
	{
		fprintf(stderr, "ERROR: camerasInfoFile not created!\n");
		closeUp(EXIT_ERROR_STOP);
	}
	FILE *f = fopen(camerasInfoFile, "r");
	if (f == NULL)
	{
		fprintf(stderr, "ERROR: Unable to open '%s': %s\n", camerasInfoFile, strerror(errno));
		closeUp(EXIT_ERROR_STOP);
	}
	char line[128];
	int num = NOT_SET;
	char sensor[25];
	bool found = false;
	int actualIndex = NOT_SET;	// index into ASICameraInfoArray[]
	while (fgets(line, sizeof(line), f) != NULL)
	{
		if (sscanf(line, "%d : %s ", &num, sensor) == 2 && num == iCameraIndex)
		{
			// Found the camera; double check that the sensor is the same.
			// Unfortunately we don't have anything else to check, like serial number.
			// I suppose we could also check the Modes are the same, but it's not worth it.
			for (int i=0; i<numCameras; i++)
			{
				if (strcmp(sensor, ASICameraInfoArray[i].Module) == 0)
				{
					found = true;
					actualIndex = i;
					break;
				}
			}
		}
	}
	if (! found)
	{
		fprintf(stderr, "ERROR: Could not find information on camera # %d\n", iCameraIndex);
		closeUp(EXIT_ERROR_STOP);
	}

	*pASICameraInfo = ASICameraInfoArray[actualIndex];
	return(ASI_SUCCESS);
}


// Get the number of capabilities supported by this camera and put in piNumberOfControls.
ASI_ERROR_CODE ASIGetNumOfControls(int iCameraIndex, int *piNumberOfControls)
{
	if (iCameraIndex < 0 || iCameraIndex >= numCameras)
		return(ASI_ERROR_INVALID_INDEX);

	if (! isLibcamera)
		iCameraIndex = (iCameraIndex * 2) + 1;		// raspistill is 2nd entry for each camera
	int num = 0;
	for (int i=0; i < MAX_NUM_CONTROL_CAPS; i++)
	{
		if (ControlCapsArray[iCameraIndex][i].ControlType == CONTROL_TYPE_END)
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
	if (iCameraIndex < 0 || iCameraIndex >= numCameras)
		return(ASI_ERROR_INVALID_INDEX);

	int numCaps = iNumOfCtrl != NOT_SET ? iNumOfCtrl : MAX_NUM_CONTROL_CAPS;
	if (iControlIndex < 0 || iControlIndex > numCaps)
		return(ASI_ERROR_INVALID_CONTROL_TYPE);

	if (! isLibcamera)
		iCameraIndex = (iCameraIndex * 2) + 1;		// raspistill is 2nd entry for each camera

	*pControlCaps = ControlCapsArray[iCameraIndex][iControlIndex];
	return(ASI_SUCCESS);
}


// Get the specified control capability's data value and put in plValue.
ASI_ERROR_CODE ASIGetControlValue(int iCameraIndex, ASI_CONTROL_TYPE ControlType, double *plValue, ASI_BOOL *pbAuto)
{
	if (iCameraIndex < 0 || iCameraIndex >= numCameras)
		return(ASI_ERROR_INVALID_INDEX);

	if (! isLibcamera)
		iCameraIndex = (iCameraIndex * 2) + 1;		// raspistill is 2nd entry for each camera
	int numCaps = iNumOfCtrl != NOT_SET ? iNumOfCtrl : MAX_NUM_CONTROL_CAPS;
	for (int i=0; i < numCaps ; i++)
	{
		if (ControlType == ControlCapsArray[iCameraIndex][i].ControlType)
		{
			*plValue = ControlCapsArray[iCameraIndex][i].CurrentValue;
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
	if (iCameraIndex < 0 || iCameraIndex >= numCameras)
		return(ASI_ERROR_INVALID_INDEX);

	return(ASI_ERROR_GENERAL_ERROR);		// Not supported on RPi cameras
}


// Control type name, command-line argument name (without leading "day" and "night").
// ControlType is the array index.
// NULL argument name means there is not a command-line argument for it.
char const *argumentNames[][2] = {
	{ "Gain", "gain" },							// day/night
	{ "Exposure", "exposure" },					// day/night
	{ "Gamma", "gamma" },
	{ "WB_R", "wbr" },							// day/night
	{ "WB_B", "wbb" },							// day/night
	{ "Temperature", "" },						// read-only so no argument
	{ "Flip", "flip" },
	{ "AutoExpMaxGain", "maxgain" },			// day/night
	{ "AutoExpMaxExpMS", "maxexposure" },		// day/night
	{ "CoolerPowerPerc", "" },		// correct Control name?			// read-only so no argument
	{ "TargetTemp", "targetTemp" },	// correct Control name?
	{ "CoolerOn", "coolerEnabled" },// correct Control name?
	{ "FanOn", "??" },				// correct Control name?
	{ "ExposureCompensation", "ev" },
	{ "Brightness", "brightness" },
	{ "Contrast", "contrast" },
	{ "Saturation", "saturation" },
	{ "Sharpness", "sharpness" },
	{ "NEW", "" } // In case a new type is added we won't get an error
};

#else		// ZWO

// Same ideas as for RPi but somewhat different options.
char const *argumentNames[][2] = {
	{ "Gain", "gain" },							// day/night
	{ "Exposure", "exposure" },					// day/night
	{ "Gamma", "gamma" },
	{ "WB_R", "wbr" },							// day/night
	{ "WB_B", "wbb" },							// day/night
	{ "Offset", "offset" },
	{ "BandWidth", "usb" },
	{ "OverCLK" "" },
	{ "Temperature", "" },						// read-only so no argument
	{ "Flip", "flip" },
	{ "AutoExpMaxGain", "maxgain" },			// day/night
	{ "AutoExpMaxExpMS", "maxexposure" },		// day/night
	{ "AutoExpTargetBrightness", "brightness" },// day/night
	{ "HardwareBin", "" },
	{ "HighSpeedMode", "" },
	{ "CoolerPowerPerc", "" },		// correct Control name?			// read-only so no argument
	{ "TargetTemp", "targetTemp" },	// correct Control name?
	{ "CoolerOn", "coolerEnabled" },// correct Control name?
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
#endif		// IS_RPi


// Get the camera control with the specified control type.
ASI_ERROR_CODE getControlCapForControlType(int iCameraIndex, ASI_CONTROL_TYPE ControlType, ASI_CONTROL_CAPS *pControlCap)
{
	if (iCameraIndex < 0 || iCameraIndex >= numCameras)
		return(ASI_ERROR_INVALID_INDEX);

	if (iNumOfCtrl == NOT_SET)
		return(ASI_ERROR_GENERAL_ERROR);

#ifdef IS_RPi
	if (! isLibcamera)
		iCameraIndex = (iCameraIndex * 2) + 1;		// raspistill is 2nd entry for each camera
#endif
	for (int i=0; i < iNumOfCtrl ; i++)
	{
		ASI_CONTROL_CAPS cc;
		ASIGetControlCaps(iCameraIndex, i, &cc);
		if (ControlType == cc.ControlType)
		{
			*pControlCap = cc;
			return(ASI_SUCCESS);
		}
	}

	return(ASI_ERROR_INVALID_CONTROL_TYPE);
}

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
			  " (with 0.8 exposure = " + ((useNewExposureAlgorithm)?("YES"):("NO")) + ")";
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

//-----------------------------------------------------------------------------------------
// Routines common to all camera brands
//-----------------------------------------------------------------------------------------

// Get the number of cameras connected, making sure there is at least one.
void processConnectedCameras()
{
	numCameras = ASIGetNumOfConnectedCameras();
	if (numCameras <= 0)
	{
		printf("*** ERROR: No Connected Camera...\n");
		// Don't wait here since it's possible the camera is physically connected
		// but the software doesn't see it.
		closeUp(EXIT_NO_CAMERA);		// If there are no cameras we can't do anything.
	}
	else if (numCameras > 1)
	{
		ASI_CAMERA_INFO info;
		printf("\nAttached Cameras (using first one):\n");
		for (int i = 0; i < numCameras; i++)
		{
			ASIGetCameraProperty(&info, i);
			printf("  - %d %s\n", i, info.Name);
		}
	}
}

#ifdef IS_ZWO
ASI_ID cameraID;	// USB 3 cameras only
bool hasCameraID = false;
unsigned char cID[sizeof(cameraID)+1] = { '[', 'n', 'o', 'n', 'e', ']', 0 };

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
#endif


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
			fprintf(stderr, "*** WARNING: unable to get camera serial number (%s)\n", getRetCode(asiRetCode));
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
	// Remove the camera brand from the name if it's there.
	char *p = cameraInfo.Name;
	if (strncmp(CAMERA_BRAND, p, strlen(CAMERA_BRAND)) == 0)
		p += strlen(CAMERA_BRAND);
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
void saveCameraInfo(ASI_CAMERA_INFO cameraInfo, char const *dir, int width, int height, double pixelSize, char const *bayer)
{
	char *camModel = getCameraModel(cameraInfo);
	char *sn = getSerialNumber(cameraInfo.CameraID);

	char fileName[128];
	snprintf(fileName, sizeof(fileName), "%s/%s_%s.json", dir, CAMERA_BRAND, camModel);
	FILE *f = fopen(fileName, "w");
	if (f == NULL)
	{
		fprintf(stderr, "ERROR: Unable to open '%s': %s\n", fileName, strerror(errno));
		closeUp(EXIT_ERROR_STOP);
	}

	// output basic information on camera as well as all it's capabilities
	fprintf(f, "{\n");
	fprintf(f, "\t\"cameraBrand\" : \"%s\",\n", CAMERA_BRAND);
	fprintf(f, "\t\"cameraName\" : \"%s\",\n", cameraInfo.Name);
	fprintf(f, "\t\"cameraModel\" : \"%s\",\n", camModel);
#ifdef IS_ZWO
	fprintf(f, "\t\"cameraID\" : \"%s\",\n", hasCameraID ? (char const *)cID : "");
#endif
	fprintf(f, "\t\"serialNumber\" : \"%s\",\n", hasSerialNumber ? sn : "");
	fprintf(f, "\t\"sensorWidth\" : %d,\n", width);
	fprintf(f, "\t\"sensorHeight\" : %d,\n", height);
	fprintf(f, "\t\"pixelSize\" : %1.2f,\n", pixelSize);
	fprintf(f, "\t\"supportedBins\" : \"");
	for (unsigned int i = 0; i < sizeof(cameraInfo.SupportedBins); ++i)
	{
		if (cameraInfo.SupportedBins[i] == 0)
			break;
		if (i > 0) fprintf(f, ",");
		fprintf(f, "%d", cameraInfo.SupportedBins[i]);
	}
	fprintf(f, "\",\n");
	fprintf(f, "\t\"colorCamera\" : %s,\n", cameraInfo.IsColorCam ? "true" : "false");
	if (cameraInfo.IsColorCam)
		fprintf(f, "\t\"bayerPattern\" : \"%s\",\n", bayer);
	fprintf(f, "\t\"bitDepth\" : %d,\n", cameraInfo.BitDepth);
#ifdef IS_RPi
	fprintf(f, "\t\"acquisitionCommand\" : \"%s\",\n", getCameraCommand(isLibcamera));
#endif
	fprintf(f, "\t\"controls\": [\n");
	for (int i = 0; i < iNumOfCtrl; i++)
	{
		ASI_CONTROL_CAPS cc;
		ASIGetControlCaps(cameraInfo.CameraID, i, &cc);
		fprintf(f, "\t\t{\n");
		fprintf(f, "\t\t\t\"Brand\" : \"%s\",\n", CAMERA_BRAND);
		fprintf(f, "\t\t\t\"Name\" : \"%s\",\n", cc.Name);
		fprintf(f, "\t\t\t\"argumentName\" : \"%s\",\n", argumentNames[cc.ControlType][1]);
#ifdef IS_ZWO
		fprintf(f, "\t\t\t\"MinValue\" : %ld,\n", cc.MinValue);
		fprintf(f, "\t\t\t\"MaxValue\" : %ld,\n", cc.MaxValue);
		fprintf(f, "\t\t\t\"DefaultValue\" : %ld,\n", cc.DefaultValue);
#else
		fprintf(f, "\t\t\t\"MinValue\" : %.3f,\n", cc.MinValue);
		fprintf(f, "\t\t\t\"MaxValue\" : %.3f,\n", cc.MaxValue);
		fprintf(f, "\t\t\t\"DefaultValue\" : %.3f,\n", cc.DefaultValue);
#endif
		fprintf(f, "\t\t\t\"ControlType\" : %d\n", cc.ControlType);
		fprintf(f, "\t\t}%s\n", i < iNumOfCtrl-1 ? "," : "");		// comma on all but last one
	}
	fprintf(f, "\t]\n");
	fprintf(f, "}\n");
	fclose(f);
}

// Output basic camera information.
void outputCameraInfo(ASI_CAMERA_INFO cameraInfo, int width, int height, double pixelSize, char const *bayer)
{
	printf(" Camera Information:\n");
	printf("  - Brand: %s\n", CAMERA_BRAND);
	printf("  - Model: %s\n", getCameraModel(cameraInfo));
#ifdef IS_ZWO
	printf("  - Camera ID: %s\n", cID);
#endif
	printf("  - Camera Serial Number: %s\n", getSerialNumber(cameraInfo.CameraID));
	printf("  - Native Resolution: %dx%d\n", width, height);
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
	bool supportsTemperature;
#ifdef IS_ZWO
	supportsTemperature = true;
#else
	supportsTemperature = cameraInfo.SupportsTemperature;
#endif
	if (supportsTemperature)
	{
		ASI_BOOL a;
#ifdef IS_ZWO
		long temp = 0;
#else
		double temp = 0.0;
#endif
		ASIGetControlValue(cameraInfo.CameraID, ASI_TEMPERATURE, &temp, &a);
		printf("  - Sensor temperature: %0.2f C\n", (float)temp / 10.0);
	}
	printf("  - Bit depth: %d\n", cameraInfo.BitDepth);

	// Get a few values from the camera that we need elsewhere.
	ASI_CONTROL_CAPS cc;
	for (int i = 0; i < iNumOfCtrl; i++)
	{
		ASIGetControlCaps(cameraInfo.CameraID, i, &cc);
		switch (cc.ControlType) {
		case ASI_EXPOSURE:
			cameraMinExposure_us = cc.MinValue;
			cameraMaxExposure_us = cc.MaxValue;
			break;
		case ASI_AUTO_MAX_EXP:
			// Keep track of the camera's max auto-exposure so we don't try to exceed it.
			// MaxValue is in MS so convert to microseconds
#ifdef HISTOGRAM
			// If using histogram algorithm we use manual exposure so set this to a value that will never be exceeded.
			cameraMaxAutoexposure_us = cameraMaxExposure_us == NOT_SET ? cameraMaxExposure_us+1 : 9999999999999;
#else
			cameraMaxAutoexposure_us = cc.MaxValue * US_IN_MS;
#endif
			break;
		default:	// needed to keep compiler quiet
			break;
		}
	}
	if (debugLevel >= 4)
	{
		for (int i = 0; i < iNumOfCtrl; i++)
		{
			ASIGetControlCaps(cameraInfo.CameraID, i, &cc);
			printf("Control Caps:\n");
			printf("  - %s:\n", cc.Name);
			printf("    - Description = %s\n", cc.Description);
#ifdef IS_ZWO
			printf("    - MinValue = %'ld\n", cc.MinValue);
			printf("    - MaxValue = %'ld\n", cc.MaxValue);
			printf("    - DefaultValue = %'ld\n", cc.DefaultValue);
#else
			printf("    - MinValue = %.3f\n", cc.MinValue);
			printf("    - MaxValue = %.3f\n", cc.MaxValue);
			printf("    - DefaultValue = %.3f\n", cc.DefaultValue);
#endif
			printf("    - IsAutoSupported = %d\n", cc.IsAutoSupported);
			printf("    - IsWritable = %d\n", cc.IsWritable);
			printf("    - ControlType = %d\n", cc.ControlType);
		}

		printf("Supported image formats:\n");
		size_t s_ = sizeof(cameraInfo.SupportedVideoFormat);
		for (unsigned int i = 0; i < sizeof(s_); i++)
		{
			ASI_IMG_TYPE it = cameraInfo.SupportedVideoFormat[i];
			if (it == ASI_IMG_END)
			{
				break;
			}
			printf("  - %s\n",
				it == ASI_IMG_RAW8 ?  "ASI_IMG_RAW8" :
				it == ASI_IMG_RGB24 ?  "ASI_IMG_RGB24" :
				it == ASI_IMG_RAW16 ?  "ASI_IMG_RAW16" :
				it == ASI_IMG_Y8 ?  "ASI_IMG_Y8" :
				"unknown video format");
		}
	}
}

// Ensure the exposure values are valid.
bool checkExposureValues(long day_us, bool dayAuto, long night_us, bool nightAuto)
{
	if (day_us < cameraMinExposure_us)
	{
	 	fprintf(stderr, "*** WARNING: daytime exposure %'ld us less than camera minimum of %'ld us; setting to minimum\n", day_us, cameraMinExposure_us);
	 	day_us = cameraMinExposure_us;
	}
	else if (day_us > cameraMaxExposure_us)
	{
	 	fprintf(stderr, "*** WARNING: daytime exposure %'ld us greater than camera maximum of %'ld us; setting to maximum\n", day_us, cameraMaxExposure_us);
	 	day_us = cameraMaxExposure_us;
	}
	else if (dayAuto && day_us > cameraMaxAutoexposure_us)
	{
	 	fprintf(stderr, "*** WARNING: daytime exposure %'ld us greater than camera maximum of %'ld us; setting to maximum\n", day_us, cameraMaxAutoexposure_us);
	 	day_us = cameraMaxAutoexposure_us;
	}

	if (night_us < cameraMinExposure_us)
	{
	 	fprintf(stderr, "*** WARNING: nighttime exposure %'ld us less than camera minimum of %'ld us; setting to minimum\n", night_us, cameraMinExposure_us);
	 	night_us = cameraMinExposure_us;
	}
	else if (night_us > cameraMaxExposure_us)
	{
	 	fprintf(stderr, "*** WARNING: nighttime exposure %'ld us greater than camera maximum of %'ld us; setting to maximum\n", night_us, cameraMaxExposure_us);
	 	night_us = cameraMaxExposure_us;
	}
	else if (nightAuto && night_us > cameraMaxAutoexposure_us)
	{
	 	fprintf(stderr, "*** WARNING: nighttime exposure %'ld us greater than camera maximum of %'ld us; setting to maximum\n", night_us, cameraMaxAutoexposure_us);
	 	night_us = cameraMaxAutoexposure_us;
	}

	return(true);		// only WARNINGs above
}
