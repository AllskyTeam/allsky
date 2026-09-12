#include "stdio.h"
#include "pthread.h"
#include "ASICamera2.h"
#include <sys/time.h>
#include <stdlib.h>
#include <termios.h>
#include <curses.h>
#include <unistd.h>
#include <term.h>



#define  MAX_CONTROL 7

/*
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
*/
extern unsigned long GetTickCount();

static struct termios initial_settings, new_settings;
static int peek_character = -1;
void init_keyboard();
void close_keyboard();
int kbhit();
int readch();


int bDisplay = 0;
int bMain = 1;
int bChangeFormat = 0;
int bSendTiggerSignal = 0;
ASI_CAMERA_INFO CamInfo;
enum CHANGE{
	change_imagetype = 0,
	change_bin,
	change_size_bigger,
	change_size_smaller
};
CHANGE change;

void close_keyboard()
{
	tcsetattr(0,TCSANOW, &initial_settings);
}
 
int kbhit()
{
	char ch;
	int nread;
	
	if(peek_character != -1)
	{
		return -1;
	}
	new_settings.c_cc[VMIN] = 0;
	tcsetattr(0, TCSANOW, &new_settings);
	nread = read(0, &ch, 1);
	new_settings.c_cc[VMIN] = 1;
	tcsetattr(0,TCSANOW, &new_settings);
 
	if(nread == 1)
	{
		peek_character = ch;
		return 1;
	}
	return 0;
}
 
int readch()
{
	char ch;
	if(peek_character != -1)
	{
		ch = peek_character;
		peek_character = -1;
		return ch;
	}
	read (0, &ch, 1);
	return ch;
}


void init_keyboard()
{
	tcgetattr(0, &initial_settings);
	new_settings = initial_settings;
	new_settings.c_lflag &= ~ICANON;
	new_settings.c_lflag &= ~ECHO;
	new_settings.c_lflag &= ~ISIG;
	new_settings.c_cc[VMIN] = 1;
	new_settings.c_cc[VTIME] = 0;
	tcsetattr(0,TCSANOW, &new_settings);
}


void* Display(void* params)
{
//	IplImage *pImg = (IplImage *)params;
//	cvNamedWindow("video", 1);
	int ch = 0;
	init_keyboard();

	while(bDisplay)
	{
		sleep(1);
		if(kbhit())
		{
			ch = readch();
		}
		else
		{
			ch = 0;
		}
		switch(ch)
		{
			case 'q':
			bDisplay = false;
			bMain = false;
			break;
				
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

			case 't'://triiger
			bSendTiggerSignal = true;
			break;
		}
	}
//	cvDestroyWindow("video");

	printf("Display thread over\n");
	ASIStopVideoCapture(CamInfo.CameraID);
	close_keyboard();
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
	int modeIndex;

	int time1,time2;
	int count=0;

	char buf[128]={0};

	int CamIndex=0;
	int inputformat;
	int definedformat;
	
	
	//IplImage *pRgb;
	//uint8_t *DataBuf;
	unsigned char *DataBuf;
	int DataSize;


	int numDevices = ASIGetNumOfConnectedCameras();
	if(numDevices <= 0)
	{
		printf("no camera connected, press any key to exit\n");
		getchar();
		return -1;
	}
	else
		printf("attached cameras:\n");

	for(i = 0; i < numDevices; i++)
	{
		ASIGetCameraProperty(&CamInfo, i);
		printf("%d %s\n",i, CamInfo.Name);
	}

	printf("\nselect one to privew\n");
	scanf("%d", &CamIndex);

	
	ASIGetCameraProperty(&CamInfo, CamIndex);
	bresult = ASIOpenCamera(CamInfo.CameraID);
	bresult += ASIInitCamera(CamInfo.CameraID);
	if(bresult)
	{
		printf("OpenCamera error,are you root?,press any key to exit\n");
		getchar();
		return -1;
	}

	printf("%s information\n",CamInfo.Name);
	int iMaxWidth, iMaxHeight;
	iMaxWidth = CamInfo.MaxWidth;
	iMaxHeight =  CamInfo.MaxHeight;
	printf("resolution:%dX%d\n", iMaxWidth, iMaxHeight);
	if(CamInfo.IsColorCam)
		printf("Color Camera: bayer pattern:%s\n",bayer[CamInfo.BayerPattern]);
	else
		printf("Mono camera\n");
	
	int ctrlnum;
	ASIGetNumOfControls(CamInfo.CameraID, &ctrlnum);
	ASI_CONTROL_CAPS ctrlcap;
	for( i = 0; i < ctrlnum; i++)
	{
		ASIGetControlCaps(CamInfo.CameraID, i,&ctrlcap);
			
		printf("%s\n", ctrlcap.Name);
			
	}

	int bin = 1, Image_type;
	printf("Use customer format or predefined fromat resolution?\n 0:customer format \n 1:predefined format\n");
	scanf("%d", &inputformat);
	if(inputformat)
	{
		printf("0:Size %d X %d, BIN 1, ImgType raw8\n", iMaxWidth, iMaxHeight);
		printf("1:Size %d X %d, BIN 1, ImgType raw16\n", iMaxWidth, iMaxHeight);
		printf("2:Size 1920 X 1080, BIN 1, ImgType raw8\n");
		printf("3:Size 1920 X 1080, BIN 1, ImgType raw16\n");
		printf("4:Size 320 X 240, BIN 2, ImgType raw8\n");
		scanf("%d", &definedformat);
		
		switch(definedformat)
		{
			case 0:
			ASISetROIFormat(CamInfo.CameraID, iMaxWidth, iMaxHeight, 1, ASI_IMG_RAW8);
			width = iMaxWidth;
			height = iMaxHeight;
			bin = 1;
			Image_type = ASI_IMG_RAW8;
			break;
			case 1:
			ASISetROIFormat(CamInfo.CameraID, iMaxWidth, iMaxHeight, 1, ASI_IMG_RAW16);
			width = iMaxWidth;
			height = iMaxHeight;
			bin = 1;
			Image_type = ASI_IMG_RAW16;
			break;
			case 2:
			ASISetROIFormat(CamInfo.CameraID, 1920, 1080, 1, ASI_IMG_RAW8);
			width = 1920;
			height = 1080;
			bin = 1;
			Image_type = ASI_IMG_RAW8;
			break;
			case 3:
			ASISetROIFormat(CamInfo.CameraID, 1920, 1080, 1, ASI_IMG_RAW16);
			width = 1920;
			height = 1080;
			bin = 1;
			Image_type = ASI_IMG_RAW16;
			break;
			case 4:
			ASISetROIFormat(CamInfo.CameraID, 320, 240, 2, ASI_IMG_RAW8);
			width = 320;
			height = 240;
			bin = 2;
			Image_type = ASI_IMG_RAW8;
			break;
			default:
			printf("Wrong input! Will use the resolution0 as default.\n");
			ASISetROIFormat(CamInfo.CameraID, iMaxWidth, iMaxHeight, 1, ASI_IMG_RAW8);
			width = iMaxWidth;
			height = iMaxHeight;
			bin = 1;
			Image_type = ASI_IMG_RAW8;
			break;
		}
		
	}
	else
	{
		printf("\nPlease input the <width height bin image_type> with one space, ie. 640 480 2 0. use max resolution if input is 0. Press ESC when video window is focused to quit capture\n");
		scanf("%d %d %d %d", &width, &height, &bin, &Image_type);
		if(width == 0 || height == 0)
		{
			width = iMaxWidth;
			height = iMaxHeight;
		}

		
		while(ASISetROIFormat(CamInfo.CameraID, width, height, bin, (ASI_IMG_TYPE)Image_type))//IMG_RAW8
		{
			printf("Set format error, please check the width and height\n ASI120's data size(width*height) must be integer multiple of 1024\n");
			printf("Please input the width and height again, ie. 640 480\n");
			scanf("%d %d %d %d", &width, &height, &bin, &Image_type);
		}
		printf("\nset image format %d %d %d %d success, start privew, press ESC to stop \n", width, height, bin, Image_type);
	}
/*
	if(Image_type == ASI_IMG_RAW16)
		pRgb=cvCreateImage(cvSize(width,height), IPL_DEPTH_16U, 1);
	else if(Image_type == ASI_IMG_RGB24)
		pRgb=cvCreateImage(cvSize(width,height), IPL_DEPTH_8U, 3);
	else
		pRgb=cvCreateImage(cvSize(width,height), IPL_DEPTH_8U, 1);
*/
	if(Image_type == ASI_IMG_RAW16)
	{
		DataBuf = (unsigned char *)malloc(sizeof(char)*(width*height*2));
		DataSize = width*height*2;
	}
	else if(Image_type == ASI_IMG_RGB24)
	{
		DataBuf = (unsigned char *)malloc(sizeof(char)*(width*height*3));
		DataSize = width*height*3;
	}
	else
	{
		DataBuf = (unsigned char *)malloc(sizeof(char)*(width*height));
		DataSize = width*height;
	}

	int exp_ms;
	printf("Please input exposure time(ms)\n");
	scanf("%d", &exp_ms);
	ASISetControlValue(CamInfo.CameraID,ASI_EXPOSURE, exp_ms*1000, ASI_FALSE);
	ASISetControlValue(CamInfo.CameraID,ASI_GAIN,0, ASI_FALSE); 
	ASISetControlValue(CamInfo.CameraID,ASI_BANDWIDTHOVERLOAD, 60, ASI_FALSE); //low transfer speed
	ASISetControlValue(CamInfo.CameraID,ASI_HIGH_SPEED_MODE, 0, ASI_FALSE);
	ASISetControlValue(CamInfo.CameraID,ASI_WB_B, 90, ASI_FALSE);
 	ASISetControlValue(CamInfo.CameraID,ASI_WB_R, 48, ASI_TRUE);
	
	ASI_SUPPORTED_MODE cammode;
	ASI_CAMERA_MODE mode;
	if(CamInfo.IsTriggerCam)
	{
		i = 0;
		printf("This is multi mode camera, you need to select the camera mode:\n");
		ASIGetCameraSupportMode(CamInfo.CameraID, &cammode);
		while(cammode.SupportedCameraMode[i]!= ASI_MODE_END)
		{
			if(cammode.SupportedCameraMode[i]==ASI_MODE_NORMAL)
				printf("%d:Normal Mode\n", i);
			if(cammode.SupportedCameraMode[i]==ASI_MODE_TRIG_SOFT_EDGE)
				printf("%d:Trigger Soft Edge Mode\n", i);
			if(cammode.SupportedCameraMode[i]==ASI_MODE_TRIG_RISE_EDGE)
				printf("%d:Trigger Rise Edge Mode\n", i);
			if(cammode.SupportedCameraMode[i]==ASI_MODE_TRIG_FALL_EDGE)
				printf("%d:Trigger Fall Edge Mode\n", i);
			if(cammode.SupportedCameraMode[i]==ASI_MODE_TRIG_SOFT_LEVEL)
				printf("%d:Trigger Soft Level Mode\n", i);
			if(cammode.SupportedCameraMode[i]==ASI_MODE_TRIG_HIGH_LEVEL)
				printf("%d:Trigger High Level Mode\n", i);
			if(cammode.SupportedCameraMode[i]==ASI_MODE_TRIG_LOW_LEVEL)
				printf("%d:Trigger Low  Lovel Mode\n", i);
			
			i++;
		}

		scanf("%d", &modeIndex);
		ASISetCameraMode(CamInfo.CameraID, cammode.SupportedCameraMode[modeIndex]);
		ASIGetCameraMode(CamInfo.CameraID, &mode);
		if(mode != cammode.SupportedCameraMode[modeIndex])
			printf("Set mode failed!\n");
		
	}

	ASIStartVideoCapture(CamInfo.CameraID); //start privew

	long lVal;
	ASI_BOOL bAuto;
	ASIGetControlValue(CamInfo.CameraID, ASI_TEMPERATURE, &lVal, &bAuto);
	printf("sensor temperature:%.1f\n", lVal/10.0);

	bDisplay = 1;
	
#ifdef _LIN
	pthread_t thread_display;
	pthread_create(&thread_display, NULL, Display, (void*)DataBuf);
#elif defined _WINDOWS
	HANDLE thread_setgainexp;
	thread_setgainexp = (HANDLE)_beginthread(Display,  NULL, (void*)DataBuf);
#endif

	time1 = GetTickCount();
	int iStrLen = 0, iTextX = 40, iTextY = 60;
	void* retval;


	int iDropFrmae;
	while(bMain)
	{

		if(mode == ASI_MODE_NORMAL) 
		{
			if(ASIGetVideoData(CamInfo.CameraID, (unsigned char*)DataBuf, DataSize, exp_ms<=100?200:exp_ms*2) == ASI_SUCCESS)
			{
				count++;
				printf("This is the %d frame in normal mode.\n", count);
			}
		}
		else
		{
			if(ASIGetVideoData(CamInfo.CameraID, (unsigned char*)DataBuf, DataSize, 2000) == ASI_SUCCESS)
			{
				count++;
				printf("This is the %d frame in trigger mode.\n", count);
			}
		}


		time2 = GetTickCount();


		
		if(time2-time1 > 2000 )
		{
			ASIGetDroppedFrames(CamInfo.CameraID, &iDropFrmae);
			sprintf(buf, "fps:%d dropped frames:%lu ImageType:%d",count, iDropFrmae, (int)Image_type);

			count = 0;
			time1=GetTickCount();	
			printf(buf);
			printf("\n");

		}
/*		if(Image_type != ASI_IMG_RGB24 && Image_type != ASI_IMG_RAW16)
		{
			iStrLen = strlen(buf);
			CvRect rect = cvRect(iTextX, iTextY - 15, iStrLen* 11, 20);
			cvSetImageROI(pRgb , rect);
			cvSet(pRgb, CV_RGB(180, 180, 180)); 
			cvResetImageROI(pRgb);
		}
		cvText(pRgb, buf, iTextX,iTextY );
*/
		if(bSendTiggerSignal) 
		{
			printf("Send a trigger signal\n");
			ASISendSoftTrigger(CamInfo.CameraID, ASI_TRUE);
			bSendTiggerSignal = 0;
		}

		if(bChangeFormat)
		{
			bChangeFormat = 0;
			bDisplay = false;
			pthread_join(thread_display, &retval);
//			cvReleaseImage(&pRgb);
			ASIStopVideoCapture(CamInfo.CameraID);
			
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
			ASISetROIFormat(CamInfo.CameraID, width, height, bin, (ASI_IMG_TYPE)Image_type);
			if(Image_type == ASI_IMG_RAW16)
			{
				DataBuf = (unsigned char *)malloc(sizeof(char)*(width*height*2));
				DataSize = width*height*2;
			}
			else if(Image_type == ASI_IMG_RGB24)
			{
				DataBuf = (unsigned char *)malloc(sizeof(char)*(width*height*3));
				DataSize = width*height*3;
			}
			else
			{
				DataBuf = (unsigned char *)malloc(sizeof(char)*(width*height));
				DataSize = width*height;
			}
			bDisplay = 1;
			pthread_create(&thread_display, NULL, Display, (void*)DataBuf);
			ASIStartVideoCapture(CamInfo.CameraID); //start privew
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
	
	ASIStopVideoCapture(CamInfo.CameraID);
	ASICloseCamera(CamInfo.CameraID);
//	cvReleaseImage(&pRgb);
	printf("main function over\n");
	return 0;
}






