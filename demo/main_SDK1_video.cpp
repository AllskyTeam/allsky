#include "stdio.h"
#include "highgui.h"
#include "ASICamera.h"
#include <sys/time.h>
#include <time.h>

//#pragma comment(lib,"../OpenCV/lib/highgui.lib") 
//#pragma comment(lib,"../OpenCV/lib/cxcore.lib") 
//#pragma comment(lib,"../../lib/ASIcamera.lib") 


#define  MAX_CONTROL 7


void cvText(IplImage* img, const char* text, int x, int y)
{
	CvFont font;

	double hscale = 0.6;
	double vscale = 0.6;
	int linewidth = 2;
	cvInitFont(&font,CV_FONT_HERSHEY_SIMPLEX | CV_FONT_ITALIC,hscale,vscale,0,linewidth);

	CvScalar textColor =cvScalar(255,255,255);
	CvPoint textPos =cvPoint(x, y);

	cvPutText(img, text, textPos, &font,textColor);
}

unsigned long GetTickCount()
{

#ifdef _MAC
  // return clock()/1000;

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
	stopCapture();
	return (void*)0;
}
int  main()
{
	int width;
	char* bayer[] = {"RG","BG","GR","GB"};
	char* controls[MAX_CONTROL] = {"Exposure", "Gain", "Gamma", "WB_R", "WB_B", "Brightness", "USB Traffic"};

	int height;
	int i;
	char c;
	bool bresult;

	int time1,time2;
	int count=0;

	char buf[128]={0};

	int CamNum=0;
	
	///long exposure, exp_min, exp_max, exp_step, exp_flag, exp_default;
	//long gain, gain_min, gain_max,gain_step, gain_flag, gain_default;

	IplImage *pRgb;


	int numDevices = getNumberOfConnectedCameras();
	if(numDevices <= 0)
	{
		printf("no camera connected, press any key to exit\n");
		getchar();
		return -1;
	}
	else
		printf("attached cameras:\n");

	for(i = 0; i < numDevices; i++)
		printf("%d %s\n",i, getCameraModel(i));

	printf("\nselect one to privew\n");
	scanf("%d", &CamNum);


	bresult = openCamera(CamNum);
	if(!bresult)
	{
		printf("OpenCamera error,are you root?,press any key to exit\n");
		getchar();
		return -1;
	}

	printf("%s information\n",getCameraModel(CamNum));
	int iMaxWidth, iMaxHeight;
	iMaxWidth = getMaxWidth();
	iMaxHeight =  getMaxHeight();
	printf("resolution:%dX%d\n", iMaxWidth, iMaxHeight);
	if(isColorCam())
		printf("Color Camera: bayer pattern:%s\n",bayer[getColorBayer()]);
	else
		printf("Mono camera\n");
	
	for( i = 0; i < MAX_CONTROL; i++)
	{
			if(isAvailable((Control_TYPE)i))
				printf("%s support:Yes\n", controls[i]);
			else
				printf("%s support:No\n", controls[i]);
	}

	printf("\nPlease input the <width height bin image_type> with one space, ie. 640 480 2 0. use max resolution if input is 0. Press ESC when video window is focused to quit capture\n");
	int bin = 1, Image_type;
	scanf("%d %d %d %d", &width, &height, &bin, &Image_type);
	if(width == 0 || height == 0)
	{
		width = iMaxWidth;
		height = iMaxHeight;
	}

	initCamera(); //this must be called before camera operation. and it only need init once
	printf("sensor temperature:%02f\n", getSensorTemp());

//	IMG_TYPE image_type;
	
	while(!setImageFormat(width, height, bin, (IMG_TYPE)Image_type))//IMG_RAW8
	{
		printf("Set format error, please check the width and height\n ASI120's data size(width*height) must be integer multiple of 1024\n");
		printf("Please input the width and height again£¬ie. 640 480\n");
		scanf("%d %d %d %d", &width, &height, &bin, &Image_type);
	}
	printf("\nset image format %d %d %d %d success, start privew, press ESC to stop \n", width, height, bin, Image_type);

	
	if(Image_type == IMG_RAW16)
		pRgb=cvCreateImage(cvSize(getWidth(),getHeight()), IPL_DEPTH_16U, 1);
	else if(Image_type == IMG_RGB24)
		pRgb=cvCreateImage(cvSize(getWidth(),getHeight()), IPL_DEPTH_8U, 3);
	else
		pRgb=cvCreateImage(cvSize(getWidth(),getHeight()), IPL_DEPTH_8U, 1);

	setValue(CONTROL_EXPOSURE, 100*1000, false); //ms//auto
	setValue(CONTROL_GAIN,getMin(CONTROL_GAIN), false); 
	setValue(CONTROL_BANDWIDTHOVERLOAD, getMin(CONTROL_BANDWIDTHOVERLOAD), false); //low transfer speed

	setValue(CONTROL_WB_B, 90, false);
 	setValue(CONTROL_WB_R, 48, false);
  	setAutoPara(getMax(CONTROL_GAIN)/2,10,150); //max auto gain and exposure and target brightness
//	EnableDarkSubtract("dark.bmp"); //dark subtract will be disabled when exposure set auto and exposure below 500ms
	startCapture(); //start privew


	

	bDisplay = 1;
#ifdef _LIN
	pthread_t thread_display;
	pthread_create(&thread_display, NULL, Display, (void*)pRgb);
#elif defined _WINDOWS
	HANDLE thread_setgainexp;
	thread_setgainexp = (HANDLE)_beginthread(Display,  NULL, (void*)pRgb);
#endif

	time1 = GetTickCount();
	int iStrLen = 0, iTextX = 40, iTextY = 60;
	void* retval;
//	int time0, iWaitMs = -1;
//	bool bGetImg;
	while(bMain)
	{

//		time0 = GetTickCount();
		getImageData((unsigned char*)pRgb->imageData, pRgb->imageSize, -1);

//		bGetImg = getImageData((unsigned char*)pRgb->imageData, pRgb->imageSize, iWaitMs);
		time2 = GetTickCount();
//		printf("waitMs%d, deltaMs%d, %d\n", iWaitMs, time2 - time0, bGetImg);
		count++;
		
		if(time2-time1 > 1000 )
		{
			sprintf(buf, "fps:%d dropped frames:%lu ImageType:%d",count, getDroppedFrames(), (int)getImgType());

			count = 0;
			time1=GetTickCount();	
			printf(buf);
			printf("\n");

		}
		if(Image_type != IMG_RGB24 && Image_type != IMG_RAW16)
		{
			iStrLen = strlen(buf);
			CvRect rect = cvRect(iTextX, iTextY - 15, iStrLen* 11, 20);
			cvSetImageROI(pRgb , rect);
			cvSet(pRgb, CV_RGB(180, 180, 180)); 
			cvResetImageROI(pRgb);
		}
		cvText(pRgb, buf, iTextX,iTextY );

		if(bChangeFormat)
		{
			bChangeFormat = 0;
			bDisplay = false;
			pthread_join(thread_display, &retval);
			cvReleaseImage(&pRgb);
			stopCapture();
			
			switch(change)
			{
				 case change_imagetype:
					Image_type++;
					if(Image_type > 3)
						Image_type = 0;
					
					break;
				case change_bin:
					if(bin == 1)
					{
						bin = 2;
						width/=2;
						height/=2;
					}
					else 
					{
						bin = 1;
						width*=2;
						height*=2;
					}
					break;
				case change_size_smaller:
					if(width > 320 && height > 240)
					{
						width/= 2;
						height/= 2;
					}
					break;
				
				case change_size_bigger:
				
					if(width*2*bin <= iMaxWidth && height*2*bin <= iMaxHeight)
					{
						width*= 2;
						height*= 2;
					}
					break;
			}
			setImageFormat(width, height, bin, (IMG_TYPE)Image_type);
			if(Image_type == IMG_RAW16)
				pRgb=cvCreateImage(cvSize(getWidth(),getHeight()), IPL_DEPTH_16U, 1);
			else if(Image_type == IMG_RGB24)
				pRgb=cvCreateImage(cvSize(getWidth(),getHeight()), IPL_DEPTH_8U, 3);
			else
				pRgb=cvCreateImage(cvSize(getWidth(),getHeight()), IPL_DEPTH_8U, 1);
			bDisplay = 1;
			pthread_create(&thread_display, NULL, Display, (void*)pRgb);
			startCapture(); //start privew
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
	
	stopCapture();
	closeCamera();
	cvReleaseImage(&pRgb);
	printf("main function over\n");
	return 1;
}






