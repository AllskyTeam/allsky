#include "stdio.h"
#include "highgui.h"
#include "ASICamera2.h"
#include <sys/time.h>
#include <time.h>
#include <unistd.h>
#include <string.h>
#include <sys/types.h>
#include <errno.h>
#include <string>
#include <iostream>
#include <cstdio>
#include <tr1/memory>
#include <ctime>
#include <stdlib.h>
#include <signal.h>

#define KNRM  "\x1B[0m"
#define KRED  "\x1B[31m"
#define KGRN  "\x1B[32m"
#define KYEL  "\x1B[33m"
#define KBLU  "\x1B[34m"
#define KMAG  "\x1B[35m"
#define KCYN  "\x1B[36m"
#define KWHT  "\x1B[37m"

void cvText(IplImage* img, const char* text, int x, int y)
{
	CvFont font;

	double hscale = 0.5;
	double vscale = 0.5;
	int linewidth = 1;
	cvInitFont(&font,CV_FONT_HERSHEY_SIMPLEX | CV_FONT_ITALIC,hscale,vscale,0,linewidth);

	CvScalar textColor =cvScalar(255,255,255);
	CvPoint textPos =cvPoint(x, y);
	cvPutText(img, text, textPos, &font,textColor);
}

static unsigned long GetTickCount()
{
#ifdef _MAC
    struct timeval  now;
    gettimeofday(&now, NULL);
    unsigned long ul_ms = now.tv_usec/1000 + now.tv_sec*1000;
    return ul_ms;
#else
   struct timespec ts;
   clock_gettime(CLOCK_MONOTONIC,&ts);
   return (ts.tv_sec*1000 + ts.tv_nsec/(1000*1000));
#endif
}

char* getTime(){
	static int seconds_last = 99;
	char TimeString[128];
	
	timeval curTime;
	gettimeofday(&curTime, NULL);
	if (seconds_last == curTime.tv_sec)
		return 0;
	
	seconds_last = curTime.tv_sec;
	
	strftime(TimeString, 80, "%Y%m%d %H:%M:%S", localtime(&curTime.tv_sec));
	return TimeString;
}

std::string exec(const char* cmd) {
    std::tr1::shared_ptr<FILE> pipe(popen(cmd, "r"), pclose);
    if (!pipe) return "ERROR";
    char buffer[128];
    std::string result = "";
    while (!feof(pipe.get())) {
        if (fgets(buffer, 128, pipe.get()) != NULL)
            result += buffer;
    }
    return result;
}

IplImage *pRgb = 0;
char nameCnt[128];
bool bSaveRun = false, bSavingImg = false, bMain=true;
pthread_mutex_t mtx_SaveImg;
pthread_cond_t cond_SatrtSave;
void* SaveImgThd(void * para)
{
	while(bSaveRun)
	{
		pthread_mutex_lock(&mtx_SaveImg);
		pthread_cond_wait(&cond_SatrtSave,&mtx_SaveImg);

		bSavingImg = true;

		if(pRgb)
			cvSaveImage( nameCnt, pRgb );

		bSavingImg = false;


		pthread_mutex_unlock(&mtx_SaveImg);

	}
//END:
	printf("save thread over\n");
	return (void*)0;
}
void IntHandle(int i)
{
	bMain = false;
}

//-------------------------------------------------------------------------------------------------------
//-------------------------------------------------------------------------------------------------------


void* Display(void* params)
{
	IplImage *pImg = (IplImage *)params;
	cvNamedWindow("video", 1);
	while(bDisplay)
	{
		cvShowImage("video", pImg);
		
		char c=cvWaitKey(1);
		switch(c)
		{
			case 27://esc
			bDisplay = false;
			bMain = false;
			goto END;
			
			case 'i'://space
			bChangeFormat = true;
			change = change_imagetype;
			break;

			case 'b'://space
			bChangeFormat = true;
			change = change_bin;
			break;

			case 'w'://space
			bChangeFormat = true;
			change = change_size_smaller;
			break;

			case 's'://space
			bChangeFormat = true;
			change = change_size_bigger;
			break;
		}
	}
END:
	cvDestroyWindow("video");
	printf("Display thread over\n");
	return (void*)0;
}

//-------------------------------------------------------------------------------------------------------
//-------------------------------------------------------------------------------------------------------


int  main(int argc, char* argv[])
{
	signal(SIGINT, IntHandle);
	pthread_mutex_init(&mtx_SaveImg, 0);
	pthread_cond_init(&cond_SatrtSave, 0);
	int time1,time2,timeSave;
	int count=0;

	int iStrLen = 0, iTextX = 20, iTextY = 20;
	char const * ImgText="";
	
	
	char buf[1024]={0};
	char bufTime[128]={0};
	
	int imgCounter=0;
	int j=0;
	char imgCnTmp[128];
	
	char const * fileName="IMAGE.PNG";
	
	int delay=10; // Delay in milliseconds. Default is 10ms
	
	int width=0;
	int height=0;
	int bin=1;
	int Image_type=0;
	int asiGain=150;
	int asiBandwidth=40;
	int asiExposure=50000;
	int asiWBR=65;
	int asiWBB=85;
	int asiGamma=50;
	int asiBrightness=50;
	int asiFlip=0;

	char const* bayer[] = {"RG","BG","GR","GB"};
	int CamNum=0;
	int i;
	

	//-------------------------------------------------------------------------------------------------------
//-------------------------------------------------------------------------------------------------------
  printf("\n%sUsage:\n", KRED);
  printf(" ./startCapture -w 640 -h 480 -e 50000 -g 50 -t 1 -b 1 -f Timelapse.PNG\n\n");
  printf("%sSwitches: \n",KYEL);
  printf(" -w = Width	 - Default = Camera Max Width \n");
  printf(" -h = Height	 - Default = Camera Max Height \n");
  printf(" -e = Exposure   - Default = 50000ns \n");
  printf(" -g = Gain	 - Default = 50 \n");
  printf(" -m = Gamma	 - Default = 50 \n");
  printf(" -r = Brightness - Default = 50 \n");
  printf(" -v = WB_Red     - Default = 50   - White Balance Red \n");
  printf(" -j = WB_Blue    - Default = 50   - White Balance Blue \n");
  printf(" -b = Bin        - Default = 1    - 1 = binning OFF, 2 = 2x2 binning \n");
  printf(" -d = Delay      - Default = 10   - Delay between images in milliseconds - 1000 = 1 sec.\n");
  printf(" -p = Image Type - Default = 0    - 0 = RAW8, 1 = RGB24, 2 = RAW16 \n");
  printf(" -t = Text       - Default =      - Text Overlay. Use Quotes.  Ex. -c \"Text Overlay\"\n");
//printf(" -x = Text X 	   - Default = 15   - Text Placement Horizontal from LEFT in Pixels\n");
//printf(" -y = Text Y     - Default = 20   - Text Placement Vertical from TOP in Pixels\n");
//printf(" -c = BG Color   - Default =      - Text Background Color in Hex. 00ff00 = Green\n");
//printf(" -a = BG Alpha   - Default =      - Text Background Color Alpha/Transparency 0-100\n");
  printf(" -i = Increment  - Default = 0    - Image increment number. Ex. 1 = 0-9, 2 = 00-99 \n");
  printf(" -z = Flip Image - Default = 0    - 0 = Orig, 1 = Horiz, 2 = Verti, 3 = Both\n");
//printf(" -q = Quality    - Default = 3/95 - Default PNG=3, JPG=95, Values: PNG=0-9, JPG=0-100\n");
  printf(" -s = USB Speed  - Default = 40   - Values between 40-100, This is BandwidthOverload \n");
//printf(" -n = AutoGain   - Default =      - Default = 0(OFF), Values 0=OFF, 1=ON \n");
//printf(" -u = AutoExp    - Default =       - Default = 0(OFF), Values 0=OFF, 1=ON \n");
//printf(" -o = AutoBright - Default =       - Default = 0(OFF), Values 0=OFF, 1=ON \n");
  printf(" -f = Filename   - Default = IMAGE.PNG \n\n");
  printf("%s", KNRM);



    if(argc > 0)
    {
      for(i = 0; i < argc-1; i++)
	{
		 if(strcmp(argv[i], "-size") == 0 || strcmp(argv[i],      "-siz") == 0 || strcmp(argv[i], "-s") == 0){
	width = atoi(argv[i+1]); i++;
	height = atoi(argv[i+1]); i++;}
	    else if(strcmp(argv[i], "-width") == 0 || strcmp(argv[i], 	  "-wid") == 0 || strcmp(argv[i], "-w") == 0){
	width = atoi(argv[i+1]); i++;}
	    else if(strcmp(argv[i], "-height") == 0 || strcmp(argv[i], 	  "-hei") == 0 || strcmp(argv[i], "-h") == 0){
	height = atoi(argv[i+1]); i++;}
	    else if(strcmp(argv[i], "-imagetype") == 0 || strcmp(argv[i],      "-typ") == 0 || strcmp(argv[i], "-p") == 0){
	Image_type = atoi(argv[i+1]); i++;}
	    else if(strcmp(argv[i], "-exposure") == 0 || strcmp(argv[i],  "-exp") == 0 || strcmp(argv[i], "-e") == 0){
        asiExposure = atoi(argv[i+1]); i++;}
	    else if(strcmp(argv[i], "-gain") == 0 || strcmp(argv[i], 	  "-gai") == 0 || strcmp(argv[i], "-g") == 0){
        asiGain = atoi(argv[i+1]); i++;}
	    else if(strcmp(argv[i], "-gamma") == 0 || strcmp(argv[i], 	  "-gam") == 0 || strcmp(argv[i], "-a") == 0){
        asiGamma = atoi(argv[i+1]); i++;}
	    else if(strcmp(argv[i], "-brightness") == 0 || strcmp(argv[i],"-bri") == 0 || strcmp(argv[i], "-r") == 0){
        asiBrightness = atoi(argv[i+1]); i++;}
	    else if(strcmp(argv[i], "-binning") == 0 || strcmp(argv[i],   "-bin") == 0 || strcmp(argv[i], "-b") == 0){
        bin = atoi(argv[i+1]); i++;}
	    else if(strcmp(argv[i], "-delay") == 0 || strcmp(argv[i],     "-dly") == 0 || strcmp(argv[i], "-d") == 0){
        delay = atoi(argv[i+1]); i++;}
	    else if(strcmp(argv[i], "-wbred") == 0 || strcmp(argv[i],     "-wbr") == 0 || strcmp(argv[i], "-v") == 0){
        asiWBR = atoi(argv[i+1]); i++;}
	    else if(strcmp(argv[i], "-wbblue") == 0 || strcmp(argv[i],    "-wbb") == 0 || strcmp(argv[i], "-j") == 0){
        asiWBB = atoi(argv[i+1]); i++;}
	    else if(strcmp(argv[i], "-text") == 0 || strcmp(argv[i], 	  "-txt") == 0 || strcmp(argv[i], "-t") == 0){
        ImgText = (argv[i+1]); i++;}
            else if(strcmp(argv[i], "-increment") == 0 || strcmp(argv[i], "-inc") == 0 || strcmp(argv[i], "-i") == 0){
        imgCounter = atoi(argv[i+1]); i++;}
            else if(strcmp(argv[i], "-flip") == 0 || strcmp(argv[i],      "-flp") == 0 || strcmp(argv[i], "-z") == 0){
        asiFlip = atoi(argv[i+1]); i++;}
            else if(strcmp(argv[i], "-usbspeed") == 0 || strcmp(argv[i],  "-usb") == 0 || strcmp(argv[i], "-u") == 0){
        asiBandwidth = atoi(argv[i+1]); i++;}
            else if(strcmp(argv[i], "-filename") == 0 || strcmp(argv[i],  "-fil") == 0 || strcmp(argv[i], "-f") == 0){
        fileName = (argv[i+1]); i++;}

	}
    }


	int numDevices = ASIGetNumOfConnectedCameras();
	if(numDevices <= 0)
	{
		printf("no camera connected, press any key to exit\n");
		width=1;	//Set to 1 when NO Cameras are connected to avoid error: OpenCV Error: Insufficient memory
		height=1;	//Set to 1 when NO Cameras are connected to avoid error: OpenCV Error: Insufficient memory
	
		getchar();
		return -1;
	}
	else
		printf("\nListing Attached Cameras:\n");

	ASI_CAMERA_INFO ASICameraInfo;
	

	for(i = 0; i < numDevices; i++)
	{
		ASIGetCameraProperty(&ASICameraInfo, i);
		printf("%d %s\n",i, ASICameraInfo.Name);
	}
	

	if(ASIOpenCamera(CamNum) != ASI_SUCCESS)
	{
		printf("OpenCamera error,are you root?,press any key to exit\n");
		getchar();
		return -1;
	}

	printf("%s information\n",ASICameraInfo.Name);
	int iMaxWidth, iMaxHeight;
	iMaxWidth = ASICameraInfo.MaxWidth;
	iMaxHeight =  ASICameraInfo.MaxHeight;
	printf("resolution:%dx%d\n", iMaxWidth, iMaxHeight);
	if(ASICameraInfo.IsColorCam)
		printf("Color Camera: bayer pattern:%s\n",bayer[ASICameraInfo.BayerPattern]);
	else
		printf("Mono camera\n");

	if(ASIInitCamera(CamNum) == ASI_SUCCESS)
		printf("Initialise Camera OK\n");
	else
		printf("Initialise Camera ERROR\n");
	
	ASI_CONTROL_CAPS ControlCaps;
	int iNumOfCtrl = 0;
	ASIGetNumOfControls(CamNum, &iNumOfCtrl);
	for( i = 0; i < iNumOfCtrl; i++)
	{
		ASIGetControlCaps(CamNum, i, &ControlCaps);
		printf("%s\n", ControlCaps.Name);
	}

	if(width == 0 || height == 0)
	{
		width = iMaxWidth;
		height = iMaxHeight;
	}

	long ltemp = 0;
	ASI_BOOL bAuto = ASI_FALSE;
	ASIGetControlValue(CamNum, ASI_TEMPERATURE, &ltemp, &bAuto);
	printf("sensor temperature:%02f\n", (float)ltemp/10.0);

	
//-------------------------------------------------------------------------------------------------------
//-------------------------------------------------------------------------------------------------------
printf("%s",KGRN);
	printf("\nCapture Settings: \n");
	printf(" Resolution: %dx%d \n",width,height);
	printf(" Exposure: %d\n",asiExposure);
	printf(" Brightness: %d\n",asiBrightness);
	printf(" Gain: %d\n",asiGain);
	printf(" Gamma: %d\n",asiGamma);
	printf(" WB Red: %d\n",asiWBR);
	printf(" WB Blue: %d\n",asiWBB);
	printf(" Binning: %d\n",bin);
	printf(" Image Type: %d\n",Image_type);
	printf(" Delay: %d\n",delay);
	printf(" USB Speed: %d\n",asiBandwidth);
	printf(" Increment: %d\n",imgCounter);
	printf(" Text Overlay: %s\n",ImgText);
	printf(" Flip Image: %d\n",asiFlip);
	printf(" Filename: %s\n",fileName);
printf("%s",KNRM);

asiBrightness=asiBrightness*1000;

	ASISetROIFormat(CamNum, width, height, bin, (ASI_IMG_TYPE)Image_type);
	ASIGetROIFormat(CamNum, &width, &height, &bin, (ASI_IMG_TYPE*)&Image_type);
	if(Image_type == ASI_IMG_RAW16)
		{
		printf("\n\nASI_IMG_RAW16\n\n");
		pRgb=cvCreateImage(cvSize(width, height), IPL_DEPTH_16U, 1);
		}
	else if(Image_type == ASI_IMG_RGB24)
		{
		printf("\n\nASI_IMG_RGB24\n\n");
		pRgb=cvCreateImage(cvSize(width, height), IPL_DEPTH_8U, 3);
		}
	else	{
		printf("\n\nASI_IMG_RAW8\n\n");
		pRgb=cvCreateImage(cvSize(width, height), IPL_DEPTH_8U, 1);
		}

//-------------------------------------------------------------------------------------------------------
//-------------------------------------------------------------------------------------------------------
	ASISetControlValue(CamNum, ASI_TEMPERATURE, 50*1000, ASI_FALSE);
	ASISetControlValue(CamNum, ASI_GAIN, asiGain, ASI_FALSE);
	ASISetControlValue(CamNum, ASI_BANDWIDTHOVERLOAD, asiBandwidth, ASI_FALSE);
	ASISetControlValue(CamNum, ASI_EXPOSURE, asiExposure, ASI_FALSE);
	ASISetControlValue(CamNum, ASI_WB_R, asiWBR, ASI_FALSE);
	ASISetControlValue(CamNum, ASI_WB_B, asiWBB, ASI_FALSE);
	ASISetControlValue(CamNum, ASI_GAMMA, asiGamma, ASI_FALSE);
	ASISetControlValue(CamNum, ASI_BRIGHTNESS, asiBrightness, ASI_FALSE);
	ASISetControlValue(CamNum, ASI_FLIP, asiFlip, ASI_FALSE);
	

	bDisplay = 1;
#ifdef _LIN
	pthread_t thread_display;
	pthread_create(&thread_display, NULL, Display, (void*)pRgb);
#elif defined _WINDOWS
	HANDLE thread_setgainexp;
	thread_setgainexp = (HANDLE)_beginthread(Display,  NULL, (void*)pRgb);
#endif

	time1 = GetTickCount();
	timeSave = GetTickCount();

	std::string locationName = argv[7];
	//std::string fileName = locationName + "-full.jpg";
	int iStrLen = 0, iTextX = 20, iTextY = 30;
	void* retval;
	std::string sunwaitCommand = "sunwait poll exit set civil ";
	sunwaitCommand.append(argv[8]);
	sunwaitCommand.append(" ");
	sunwaitCommand.append(argv[9]);
	bool endOfNight = false;

	ASI_EXPOSURE_STATUS status;
	int iDropped = 0;
	pthread_t hthdSave = 0;
	while(bMain)
	{

		ASIStartExposure(CamNum, ASI_FALSE);
		usleep(10000);//10ms
		status = ASI_EXP_WORKING;
		while(status == ASI_EXP_WORKING)
		{
			ASIGetExpStatus(CamNum, &status);		
		}
		if(status == ASI_EXP_SUCCESS){
			ASIGetDataAfterExp(CamNum, (unsigned char*)pRgb->imageData, pRgb->imageSize);
		}

		time2 = GetTickCount();
		
		count++;
		
		if(time2-time1 > 1000 )
		{
			ASIGetDroppedFrames(CamNum, &iDropped);
			//sprintf(buf, "fps:%d dropped frames:%lu ImageType:%d",count, iDropped, Image_type);
			sprintf(buf, "%s", getTime());
			count = 0;
			time1=GetTickCount();	
			//printf(buf);
			printf(".");
			printf("\n");
		}

		if (time2 - timeSave > 5000) {
			/*std::string result = exec(sunwaitCommand.c_str());		
			result.erase(std::remove(result.begin(), result.end(), '\n'), result.end());
			if (result == "NIGHT"){
				printf("NIGHT");
				printf("\n");
				cvText(pRgb, buf, iTextX,iTextY );
				cvSaveImage( fileName.c_str(), pRgb );					
				endOfNight = true;
			} else if (result == "DAY" && endOfNight){
				printf("DAY");
				printf("\n");
				printf("Generating Timelapse");
				system(("./timelapse.sh " + locationName).c_str());
				printf("\n");
				endOfNight = false;		
			}*/
			if(!bSavingImg)
			{
				pthread_mutex_lock(& mtx_SaveImg);
				pthread_cond_signal(&cond_SatrtSave);
				pthread_mutex_unlock(& mtx_SaveImg);
			}

			
			timeSave = GetTickCount();				
		}

		if(Image_type != ASI_IMG_RGB24 && Image_type != ASI_IMG_RAW16)
		{
			iStrLen = strlen(buf);
			CvRect rect = cvRect(iTextX, iTextY - 15, iStrLen* 11, 20);
			cvSetImageROI(pRgb , rect);
			cvSet(pRgb, CV_RGB(180, 180, 180)); 
			cvResetImageROI(pRgb);
		}
				
	}
END:
	
	if(bDisplay)
	{
		bDisplay = 0;
#ifdef _LIN
   		pthread_join(thread_display, &retval);
#elif defined _WINDOWS
		Sleep(50);
#endif
	}
	
	ASIStopExposure(CamNum);
	ASICloseCamera(CamNum);

	if(bSaveRun)
	{
		bSaveRun = false;
		pthread_mutex_lock(&mtx_SaveImg);
		pthread_cond_signal(&cond_SatrtSave);
		pthread_mutex_unlock(& mtx_SaveImg);
		pthread_join(hthdSave, 0);
	}

	cvReleaseImage(&pRgb);
	printf("main function over\n");

	return 1;
}






