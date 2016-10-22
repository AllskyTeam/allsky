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

int bDisplay = 0;
int bMain = 1;
int bChangeFormat = 0;
enum CHANGE{
	change_imagetype = 0,
	change_bin,
	change_size_bigger,
	change_size_smaller
};
CHANGE change;

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
int  main(int argc, char* argv[])
{
	int width;
	char* bayer[] = {"RG","BG","GR","GB"};

	int height;
	int i;
	char c;
	bool bresult;

	int time1,time2,timeSave;
	int count=0;

	char buf[128]={0};

	int CamNum=0;
	

	IplImage *pRgb;

	int numDevices = ASIGetNumOfConnectedCameras();
	if(numDevices <= 0)
	{
		printf("no camera connected, press any key to exit\n");
		getchar();
		return -1;
	}
	else
		printf("attached cameras:\n");

	ASI_CAMERA_INFO ASICameraInfo;
	

	for(i = 0; i < numDevices; i++)
	{
		ASIGetCameraProperty(&ASICameraInfo, i);
		printf("%d %s\n",i, ASICameraInfo.Name);
	}

	//printf("\nselect one to privew\n");
	//scanf("%d", &CamNum);
	

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
	printf("resolution:%dX%d\n", iMaxWidth, iMaxHeight);
	if(ASICameraInfo.IsColorCam)
		printf("Color Camera: bayer pattern:%s\n",bayer[ASICameraInfo.BayerPattern]);
	else
		printf("Mono camera\n");
	
	ASI_CONTROL_CAPS ControlCaps;
	int iNumOfCtrl = 0;
	ASIGetNumOfControls(CamNum, &iNumOfCtrl);
	for( i = 0; i < iNumOfCtrl; i++)
	{
		ASIGetControlCaps(CamNum, i, &ControlCaps);
		printf("%s\n", ControlCaps.Name);
	}

	printf("\nPlease input the <width height bin image_type> with one space, ie. 640 480 2 0. use max resolution if input is 0. Press ESC when video window is focused to quit capture\n");
	int bin = 1, Image_type;
	
	//scanf("%d %d %d %d", &width, &height, &bin, &Image_type);
	width = strtol(argv[1], NULL, 10);
	height = strtol(argv[2], NULL, 10);
	bin = strtol(argv[3], NULL, 10);
	Image_type = strtol(argv[4], NULL, 10);
	printf("%d %d %d %d", width, height, bin, Image_type);

	if(width == 0 || height == 0)
	{
		width = iMaxWidth;
		height = iMaxHeight;
	}

	long ltemp = 0;
	ASI_BOOL bAuto = ASI_FALSE;
	ASIGetControlValue(CamNum, ASI_TEMPERATURE, &ltemp, &bAuto);
	printf("sensor temperature:%02f\n", (float)ltemp/10.0);

	while(ASI_SUCCESS != ASISetROIFormat(CamNum, width, height, bin, (ASI_IMG_TYPE)Image_type))//IMG_RAW8
	{
		printf("Set format error, please check the width and height\n ASI120's data size(width*height) must be integer multiple of 1024\n");
		printf("Please input the width and height again£¬ie. 640 480\n");
		scanf("%d %d %d %d", &width, &height, &bin, &Image_type);
	}
	printf("\nset image format %d %d %d %d success, start preview, press ESC to stop \n", width, height, bin, Image_type);

	ASIGetROIFormat(CamNum, &width, &height, &bin, (ASI_IMG_TYPE*)&Image_type);
	if(Image_type == ASI_IMG_RAW16)
		pRgb=cvCreateImage(cvSize(width, height), IPL_DEPTH_16U, 1);
	else if(Image_type == ASI_IMG_RGB24)
		pRgb=cvCreateImage(cvSize(width, height), IPL_DEPTH_8U, 3);
	else
		pRgb=cvCreateImage(cvSize(width, height), IPL_DEPTH_8U, 1);

	char *pEnd;
	ASISetControlValue(CamNum, ASI_TEMPERATURE, 50*1000, ASI_FALSE);
	ASISetControlValue(CamNum, ASI_GAIN, strtol(argv[5], &pEnd, 10), ASI_FALSE);
	ASISetControlValue(CamNum, ASI_BANDWIDTHOVERLOAD, 40, ASI_FALSE);
	ASISetControlValue(CamNum, ASI_EXPOSURE, strtol(argv[6], &pEnd, 10), ASI_FALSE);
	ASISetControlValue(CamNum, ASI_WB_R, strtol(argv[10], &pEnd, 10), ASI_FALSE);
	ASISetControlValue(CamNum, ASI_WB_B, strtol(argv[11], &pEnd, 10), ASI_FALSE);
	

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
	std::string fileName = locationName + "-full.jpg";
	int iStrLen = 0, iTextX = 20, iTextY = 30;
	void* retval;
	std::string sunwaitCommand = "sunwait poll exit set civil ";
	sunwaitCommand.append(argv[8]);
	sunwaitCommand.append(" ");
	sunwaitCommand.append(argv[9]);
	bool endOfNight = false;

	ASI_EXPOSURE_STATUS status;
	int iDropped = 0;
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
			std::string result = exec(sunwaitCommand.c_str());		
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
	cvReleaseImage(&pRgb);
	printf("main function over\n");
	return 1;
}






