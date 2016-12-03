
#ifndef ASICAMERA_H
#define ASICAMERA_H


#ifdef _WINDOWS
	#define ASICAMERA_API __declspec(dllexport)
#else
	#define ASICAMERA_API 
#endif



enum Control_TYPE{ //Control ID//
	CONTROL_GAIN = 0,
	CONTROL_EXPOSURE,//us
	CONTROL_GAMMA,
	CONTROL_WB_R,
	CONTROL_WB_B,
	CONTROL_BRIGHTNESS,
	CONTROL_BANDWIDTHOVERLOAD,	
	CONTROL_OVERCLOCK,
	CONTROL_TEMPERATURE,//return a temperature value multiplied 10
	CONTROL_HARDWAREBIN,
	CONTROL_HIGHSPEED,
	CONTROL_COOLERPOWERPERC,
	CONTROL_TARGETTEMP,
	CONTROL_COOLER_ON,
	CONTROL_MONO_BIN,
	CONTROL_FAN_ON,
	CONTROL_PATTERN_ADJUST
};


enum IMG_TYPE{ //Supported image type
	IMG_RAW8=0,
	IMG_RGB24,
	IMG_RAW16,
	IMG_Y8,
};

enum GuideDirections{ //Guider Direction
	guideNorth=0,
	guideSouth,
	guideEast,
	guideWest
};

enum BayerPattern{
	BayerRG=0,
	BayerBG,
	BayerGR,
	BayerGB
};

enum EXPOSURE_STATUS {
	EXP_IDLE = 0,//: idle states, you can start exposure now
	EXP_WORKING,//: exposuring
	EXP_SUCCESS,// exposure finished and waiting for download
	EXP_FAILED,//:exposure failed, you need to start exposure again
};

typedef struct _ASIID{
	unsigned char id[8];
}ASIID;

#ifndef __cplusplus
#define bool char
#define BayerPattern int
#define CAMERA_TYPE int
#define Control_TYPE int
#define IMG_TYPE int
#define GuideDirections int
#endif

#ifdef __cplusplus
extern "C" {
#endif

	// get number of Connected ASI cameras.
	ASICAMERA_API  int getNumberOfConnectedCameras(); 
	//open Camera, camIndex 0 means the first one.
	ASICAMERA_API  bool openCamera(int camIndex);
	// init the  camera after Open
	ASICAMERA_API  bool initCamera();
	//don't forget to closeCamera if you opened one
	ASICAMERA_API  void closeCamera();
	//Is it a color camera?
	ASICAMERA_API  bool isColorCam();
	//get the pixel size of the camera
	ASICAMERA_API  double getPixelSize();
	// what is the bayer pattern
	ASICAMERA_API  BayerPattern getColorBayer();
	//get the camera name. camIndex 0 means the first one.
	ASICAMERA_API  char* getCameraModel(int camIndex);

	//Subtract Dark using bmp file
	ASICAMERA_API bool EnableDarkSubtract(char *BMPPath);
	//Disable Subtracting Dark 
	ASICAMERA_API void DisableDarkSubtract();

	// is control supported by current camera
	ASICAMERA_API bool isAvailable(Control_TYPE control) ;   
	// is control supported auto adjust
	ASICAMERA_API bool isAutoSupported(Control_TYPE control) ;		
	// get control current value and auto status
	ASICAMERA_API int getValue(Control_TYPE control, bool *pbAuto)  ;    
	// get minimal value of control
	ASICAMERA_API int getMin(Control_TYPE control) ;  
	// get maximal  value of control
	ASICAMERA_API int getMax(Control_TYPE control) ;  
	// set current value and auto states of control
	ASICAMERA_API void setValue(Control_TYPE control, int value, bool autoset); 
	// set auto parameter
	ASICAMERA_API void setAutoPara(int iMaxGain, int iMaxExp, int iDestBrightness);
	// get auto parameter
	ASICAMERA_API void getAutoPara(int *pMaxGain, int *pMaxExp, int *pDestBrightness);

	ASICAMERA_API  int getMaxWidth();  // max image width
	ASICAMERA_API  int getMaxHeight(); // max image height
	ASICAMERA_API  int getWidth(); // get current width
	ASICAMERA_API  int getHeight(); // get current heigth
	ASICAMERA_API  int getStartX(); // get ROI start X
	ASICAMERA_API  int getStartY(); // get ROI start Y

	ASICAMERA_API  float getSensorTemp(); //get the temp of sensor ,only ASI120 support
	ASICAMERA_API  unsigned long getDroppedFrames(); //get Dropped frames 
	ASICAMERA_API  bool SetMisc(bool bFlipRow, bool bFlipColumn);	//Flip x and y
	ASICAMERA_API  void GetMisc(bool * pbFlipRow, bool * pbFlipColumn); //Get Flip setting	

	//whether the camera support bin2 or bin3
	ASICAMERA_API  bool isBinSupported(int binning); 
	//whether the camera support this img_type
	ASICAMERA_API  bool isImgTypeSupported(IMG_TYPE img_type); 
	//get the current binning method
	ASICAMERA_API  int getBin(); 

	//call this function to change ROI area after setImageFormat
	//return true when success false when failed
	ASICAMERA_API  bool setStartPos(int startx, int starty); 
	// set new image format 
	//Make sure width%8 = 0 and height%2 = 0, further, for USB2.0 camera ASI120, please make sure that width*height%1024=0. 
	ASICAMERA_API  bool setImageFormat(int width, int height,  int binning, IMG_TYPE img_type);  
	//get the image type current set
	ASICAMERA_API  IMG_TYPE getImgType(); 

	//start capture image
	ASICAMERA_API  void startCapture(); 
	//stop capture image
	ASICAMERA_API  void stopCapture();


	// wait waitms capture a single frame -1 means wait forever, success return true, failed return false
	ASICAMERA_API bool getImageData(unsigned char* buffer, int bufSize, int waitms);

	//ST4 guide support. only the module with ST4 port support this
	ASICAMERA_API void pulseGuide(GuideDirections direction, int timems);

	//Starts an exposure, 0 means dark frame if there is shutter 
	ASICAMERA_API void  startExposure();

	//EXPOSURE_STATUS GetExpStates();
	ASICAMERA_API enum EXPOSURE_STATUS getExpStatus();

	ASICAMERA_API bool getImageAfterExp(unsigned char* buffer, int bufSize);
	
	//Stops the current exposure, if any. you can still get the image with the getImageAfterExp API 
	ASICAMERA_API void  stopExposure();

	//check if the camera works at usb3 status
	ASICAMERA_API bool isUSB3Host();

	//check if this is a camera with cooler;
	ASICAMERA_API bool isCoolerCam();

	//get id number stored in flash, only supported for USB3.0 camera.
	ASICAMERA_API bool GetID(ASIID *pID);

	//set id number to flash, only supported for USB3.0 camera.
	ASICAMERA_API bool SetID(ASIID ID);

	//check if the camera is usb3
	ASICAMERA_API bool isUSB3Camera();

	//get e/ADU of camera
	ASICAMERA_API float getElectronsPerADU();

//highest dynamic range, unity gain, lowest read noise, lowest read noise
	ASICAMERA_API void getGainOffset(int *Offset_HighestDR, int *Offset_UnityGain, int *Gain_LowestRN, int *Offset_LowestRN);
	

#ifdef __cplusplus
}
#endif

#endif
