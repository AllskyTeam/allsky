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

void cvText(IplImage* img, const char* text, int x, int y, double fontsize, int linewidth, int linetype, int fontname, int fontcolor[])
{
	cv::Mat mat_img(img );
	cv::putText(mat_img, text, cvPoint(x, y), fontname, fontsize, cvScalar(fontcolor[0],fontcolor[1],fontcolor[2]), linewidth, linetype);
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
	static char TimeString[128];
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
int quality[3] = {CV_IMWRITE_PNG_COMPRESSION, 200, 0};
bool bSaveRun = false, bSavingImg = false, bMain=true, bDisplay=false;
pthread_mutex_t mtx_SaveImg;
pthread_cond_t cond_SatrtSave;

void* Display(void* params)
{
	IplImage *pImg = (IplImage *)params;
	cvNamedWindow("video", 1);
	while(bDisplay)
	{
		cvShowImage("video", pImg);
		char c=cvWaitKey(1);
	}
END:
	cvDestroyWindow("video");
	printf("Display thread over\n");
	return (void*)0;
}

void* SaveImgThd(void * para)
{
	while(bSaveRun)
	{
		pthread_mutex_lock(&mtx_SaveImg);
		pthread_cond_wait(&cond_SatrtSave,&mtx_SaveImg);
		bSavingImg = true;
		if(pRgb)
			cvSaveImage( nameCnt, pRgb, quality);
		bSavingImg = false;
		pthread_mutex_unlock(&mtx_SaveImg);

	}

	printf("save thread over\n");
	return (void*)0;
}

void IntHandle(int i)
{
	bMain = false;
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

	int fontname[] = {CV_FONT_HERSHEY_SIMPLEX, CV_FONT_HERSHEY_PLAIN, CV_FONT_HERSHEY_DUPLEX, CV_FONT_HERSHEY_COMPLEX,
 		CV_FONT_HERSHEY_TRIPLEX, CV_FONT_HERSHEY_COMPLEX_SMALL, CV_FONT_HERSHEY_SCRIPT_SIMPLEX, CV_FONT_HERSHEY_SCRIPT_COMPLEX};
	int fontnumber = 0;
	int iStrLen, iTextX = 15, iTextY = 25;
	char const * ImgText="";
	double fontsize = 0.6;
	int linewidth =1;
	int fontcolor[3]={255,0,0};
	int linetype[3]={CV_AA, 8, 4};
	int linenumber = 0;
	
	char buf[1024]={0};
	char bufTime[128]={0};


	char const * fileName="image.jpg";

	int delay=10; // Delay in milliseconds. Default is 10ms

	int width=0;
	int height=0;
	int bin=1;
	int Image_type=1;
	int asiGain=150;
	int asiBandwidth=40;
	int asiExposure=2000000;
	int asiWBR=65;
	int asiWBB=85;
	int asiGamma=50;
	int asiBrightness=50;
	int asiFlip=0;
        char const * latitude="60.7N";
	char const * longitude="135.05W";
        int display=1;

	char const* bayer[] = {"RG","BG","GR","GB"};
	int CamNum=0;
	int i;

//-------------------------------------------------------------------------------------------------------
//-------------------------------------------------------------------------------------------------------
  printf("\n");  
  printf("%s ******************************************\n", KGRN);  
  printf("%s *** Allsky Camera Software v0.1 | 2016 ***\n", KGRN);
  printf("%s ******************************************\n\n", KGRN);
  printf("\%sCapture images of the sky with a Raspberry Pi and an ASI Camera\n",KGRN); 
  printf("\n");
  printf("\%sAuthor:",KNRM);
  printf("Thomas Jacquin\n\n");
  printf("\%sContributors:\n",KNRM);
  printf("-Knut Olav Klo\n");
  printf("-Daniel Johnsen\n");
  printf("-Yang and Sam from ZWO\n\n");
  printf("%sSwitches: \n",KYEL);
  printf(" -w | -wid = Width      - Default = Camera Max Width \n");
  printf(" -h | -hei = Height     - Default = Camera Max Height \n");
  printf(" -e | -exp = Exposure   - Default = 50000µs \n");
  printf(" -g | -gai = Gain       - Default = 50 \n");
  printf(" -a | -gam = Gamma      - Default = 50 \n");
  printf(" -r | -bri = Brightness - Default = 50 \n");
  printf("    | -wbr = WB_Red     - Default = 50   - White Balance Red \n");
  printf("    | -wbb = WB_Blue    - Default = 50   - White Balance Blue \n");
  printf(" -b | -bin = Bin        - Default = 1    - 1 = binning OFF (1x1), 2 = 2x2 binning, 4 = 4x4 binning\n");
  printf(" -d | -dly = Delay      - Default = 10   - Delay between images in milliseconds - 1000 = 1 sec.\n");
  printf(" -t | -typ = Image Type - Default = 0    - 0 = RAW8,  1 = RGB24,  2 = RAW16 \n");
  printf(" -c | -txt = Text       - Default =      - Character/Text Overlay. Use Quotes.  Ex. -c \"Text Overlay\"\n");
  printf(" -x | -txx = Text X     - Default = 15   - Text Placement Horizontal from LEFT in Pixels\n");
  printf(" -y | -txy = Text Y     - Default = 25   - Text Placement Vertical from TOP in Pixels\n");
  printf(" -n | -fon = Font Name  - Default = 0    - Font Types (0-7), Ex. 0 = simplex, 4 = triplex, 7 = script\n");
  printf(" -k | -foc = Font Color - Default = 255 0 0  - Text blue (BRG)\n");
  printf("    | -fot = Font Type  - Default = 0    - Font Line Type,(0-2), 0 = AA, 1 = 8, 2 = 4\n");

  printf(" -s | -fos = Font Size  - Default = 0.5  - Text Font Size\n");
  printf(" -l | -fol = Font Line  - Default = 1    - Text Font Line Thickness\n");

//printf(" -c = BG Color   - Default =      - Text Background Color in Hex. 00ff00 = Green\n");
//printf(" -a = BG Alpha   - Default =      - Text Background Color Alpha/Transparency 0-100\n");
  printf(" -i | -inc = Increment  - Default = 0    - Image increment number. Ex. 1 = 0-9, 2 = 00-99 \n");
  printf(" -z | -flp = Flip Image - Default = 0    - 0 = Orig, 1 = Horiz, 2 = Verti, 3 = Both\n");
  printf(" -q | -qty = Quality    - Default = 3/95 - Default PNG=3, JPG=95, Values: PNG=0-9, JPG=0-100\n");
  printf(" -u | -usb = USB Speed  - Default = 40   - Values between 40-100, This is BandwidthOverload \n");
  printf(" -f | -fil = Filename   - Default = IMAGE.PNG \n");
  printf("\n");
  printf("    | -lat = Latitude   - Default = 60.7N   - Latitude of the camera \n");
  printf("    | -lon = Longitude  - Default = 135.05W - Longitude of the camera \n");
  printf("\n");  
  printf("    | -dis = Display    - Default = true - Set to false to capture images without displaying it \n");

  printf("%sUsage:\n", KRED);
  printf(" ./asiSnap -w 640 -h 480 -e 50000 -g 50 -t 1 -b 1 -f Timelapse.PNG\n\n");

  printf("%s", KNRM);    


if(argc > 0)
    {
      for(i = 0; i < argc-1; i++)
	{
//		 if(strcmp(argv[i], "-size") == 0 || strcmp(argv[i],      "-siz") == 0 || strcmp(argv[i], "-s") == 0){
//	  width = atoi(argv[i+1]); i++;
//	  height = atoi(argv[i+1]); i++;}
		 if(strcmp(argv[i], "-width") == 0 || strcmp(argv[i], 	  "-wid") == 0 || strcmp(argv[i], "-w") == 0){
	width = atoi(argv[i+1]); i++;}
	    else if(strcmp(argv[i], "-height") == 0 || strcmp(argv[i], 	  "-hei") == 0 || strcmp(argv[i], "-h") == 0){
	height = atoi(argv[i+1]); i++;}
	    else if(strcmp(argv[i], "-imagetype") == 0 || strcmp(argv[i], "-typ") == 0 || strcmp(argv[i], "-t") == 0){
	Image_type = atoi(argv[i+1]); i++;}
	    else if(strcmp(argv[i], "-quality") == 0 || strcmp(argv[i],   "-qty") == 0 || strcmp(argv[i], "-q") == 0){
        quality[1] = atoi(argv[i+1]); i++;}
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
	    else if(strcmp(argv[i], "-wbred") == 0 || strcmp(argv[i],     "-wbr") == 0){
        asiWBR = atoi(argv[i+1]); i++;}
	    else if(strcmp(argv[i], "-wbblue") == 0 || strcmp(argv[i],    "-wbb") == 0){
        asiWBB = atoi(argv[i+1]); i++;}
	    else if(strcmp(argv[i], "-text") == 0 || strcmp(argv[i], 	  "-txt") == 0 || strcmp(argv[i], "-c") == 0){
        ImgText = (argv[i+1]); i++;}
            else if(strcmp(argv[i], "-textx") == 0 || strcmp(argv[i],     "-txx") == 0 || strcmp(argv[i], "-x") == 0){
        iTextX = atoi(argv[i+1]); i++;}
            else if(strcmp(argv[i], "-texty") == 0 || strcmp(argv[i],     "-txy") == 0 || strcmp(argv[i], "-y") == 0){
        iTextY = atoi(argv[i+1]); i++;}
	    else if(strcmp(argv[i], "-fontname") == 0 || strcmp(argv[i],  "-fon") == 0 || strcmp(argv[i], "-n") == 0){
        fontnumber = atoi(argv[i+1]); i++;}
	    else if(strcmp(argv[i], "-fontcolor") == 0 || strcmp(argv[i], "-foc") == 0 || strcmp(argv[i], "-k") == 0){
        fontcolor[0] = atoi(argv[i+1]); i++;
	fontcolor[1] = atoi(argv[i+1]); i++;
	fontcolor[2] = atoi(argv[i+1]); i++;}
	    else if(strcmp(argv[i], "-fonttype") == 0 || strcmp(argv[i],  "-fot") == 0){
        linenumber = atoi(argv[i+1]); i++;}
	    else if(strcmp(argv[i], "-fontsize") == 0 || strcmp(argv[i],  "-fos") == 0 || strcmp(argv[i], "-s") == 0){
	  fontsize = atof(argv[i+1]); i++;}
            else if(strcmp(argv[i], "-fontline") == 0 || strcmp(argv[i],  "-fol") == 0 || strcmp(argv[i], "-l") == 0){
        linewidth = atoi(argv[i+1]); i++;}
            else if(strcmp(argv[i], "-flip") == 0 || strcmp(argv[i],      "-flp") == 0 || strcmp(argv[i], "-z") == 0){
        asiFlip = atoi(argv[i+1]); i++;}
            else if(strcmp(argv[i], "-usbspeed") == 0 || strcmp(argv[i],  "-usb") == 0 || strcmp(argv[i], "-u") == 0){
        asiBandwidth = atoi(argv[i+1]); i++;}
            else if(strcmp(argv[i], "-filename") == 0 || strcmp(argv[i],  "-fil") == 0 || strcmp(argv[i], "-f") == 0){
        fileName = (argv[i+1]); i++;}
	    else if(strcmp(argv[i], "-latitude") == 0 || strcmp(argv[i],  "-lat") == 0 ){
        latitude = argv[i+1]; i++;}
            else if(strcmp(argv[i], "-longitude") == 0 || strcmp(argv[i],  "-lon") == 0 ){
        longitude = argv[i+1]; i++;}
 	    else if(strcmp(argv[i], "-display") == 0 || strcmp(argv[i],  "-dis") == 0 ){
        display = atoi(argv[i+1]); i++;}
	}
    }

	const char * ext = strrchr(fileName, '.');
	if (strcmp(ext+1, "jpg") == 0 || strcmp(ext+1, "JPG") == 0 || strcmp(ext+1, "jpeg") == 0 || strcmp(ext+1, "JPEG") == 0) {
	    quality[0] = CV_IMWRITE_JPEG_QUALITY;
		if(quality[1] == 200){
			quality[1] = 95;
		}
	}
	else{
		quality[1] = 3;
	}



	int numDevices = ASIGetNumOfConnectedCameras();
	if(numDevices <= 0){
	   printf("\nNo Connected Camera...\n");
	   width=1;	//Set to 1 when NO Cameras are connected to avoid error: OpenCV Error: Insufficient memory
	   height=1;	//Set to 1 when NO Cameras are connected to avoid error: OpenCV Error: Insufficient memory
	} else
	   printf("\nListing Attached Cameras:\n");

	ASI_CAMERA_INFO ASICameraInfo;
	

	for(i = 0; i < numDevices; i++)
	{
		ASIGetCameraProperty(&ASICameraInfo, i);
		printf("%d %s\n",i, ASICameraInfo.Name);
	}	

	if(ASIOpenCamera(CamNum) != ASI_SUCCESS)
	{
		printf("Open Camera ERROR, Check that you have root permissions!\n");
	}

	printf("\n%s Information:\n",ASICameraInfo.Name);
	int iMaxWidth, iMaxHeight;
	iMaxWidth = ASICameraInfo.MaxWidth;
	iMaxHeight =  ASICameraInfo.MaxHeight;
	printf("Resolution:%dx%d\n", iMaxWidth, iMaxHeight);
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
		//printf("%s\n", ControlCaps.Name);
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
	printf(" Image Type: %d \n",Image_type);
	printf(" Resolution: %dx%d \n",width,height);
	printf(" Quality: %d \n",quality[1]);
	printf(" Gain: %d\n",asiGain);
	printf(" Exposure: %dns\n",asiExposure);
	printf(" Brightness: %d\n",asiBrightness);
	printf(" Gamma: %d\n",asiGamma);
	printf(" WB Red: %d\n",asiWBR);
	printf(" WB Blue: %d\n",asiWBB);
	printf(" Binning: %d\n",bin);
	printf(" Delay: %dms\n",delay);
	printf(" USB Speed: %d\n",asiBandwidth);
	printf(" Text Overlay: %s\n",ImgText);
	printf(" Text Position: %dpx left, %dpx top\n",iTextX,iTextY);
	printf(" Font Name:  %d\n",fontname[fontnumber]);
	printf(" Font Color: %d , %d, %d\n",fontcolor[0], fontcolor[1], fontcolor[2]);
	printf(" Font Line Type: %d\n",linetype[linenumber]);
	printf(" Font Size: %1.1f\n",fontsize);
	printf(" Font Line: %d\n",linewidth);
	printf(" Flip Image: %d\n",asiFlip);
	printf(" Filename: %s\n",fileName);
	printf(" Latitude: %s\n",latitude);
	printf(" Longitude: %s\n",longitude);
        printf(" Display: %i\n",display);
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
	
	//if (display == 1) {
		bDisplay = 1;
		pthread_t thread_display;
		pthread_create(&thread_display, NULL, Display, (void*)pRgb);
	//}

	time1 = GetTickCount();
	timeSave = GetTickCount();
	
	void* retval;
	std::string sunwaitCommand = "sunwait poll exit set civil ";
	sunwaitCommand.append(latitude);
	sunwaitCommand.append(" ");
	sunwaitCommand.append(longitude);
	bool endOfNight = false;
	char c;
	bool bresult;

	ASI_EXPOSURE_STATUS status;
	int iDropped = 0;
	pthread_t hthdSave = 0;

	if(!bSaveRun)
	{
		bSaveRun = true;
		if(pthread_create(&hthdSave, 0, SaveImgThd, 0)!=0)
			bSaveRun = false;

	}

	while(bMain)
	{
		ASIStartExposure(CamNum, ASI_FALSE);
		usleep(delay*1000); //10ms
		status = ASI_EXP_WORKING;

		if(status == ASI_EXP_WORKING)
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
			sprintf(buf, " - fps:%d dropped frames:%d ImageType:%d", count, iDropped, Image_type);
			sprintf(bufTime, "%s", getTime());
			count = 0;
			time1=GetTickCount();
			//printf(bufTime);
			//printf(buf);
			printf(".");
			printf("\n");
		}

		if(Image_type != ASI_IMG_RGB24 && Image_type != ASI_IMG_RAW16)
		{
			iStrLen = strlen(buf);
			CvRect rect = cvRect(iTextX, iTextY - 15, iStrLen* 11, 20);
			cvSetImageROI(pRgb , rect);
			cvSet(pRgb, CV_RGB(5, 5, 5));
			cvResetImageROI(pRgb);
		}
  		cvText(pRgb, ImgText, iTextX, iTextY, fontsize, linewidth, linetype[linenumber], fontname[fontnumber], fontcolor);
		

		if (time2 - timeSave > 5000) {
			std::string result = exec(sunwaitCommand.c_str());		
			result.erase(std::remove(result.begin(), result.end(), '\n'), result.end());
			if (result == "NIGHT"){
				printf("NIGHT");
				printf("\n");
				/*if(!bSavingImg)
				{
					pthread_mutex_lock(& mtx_SaveImg);
					pthread_cond_signal(&cond_SatrtSave);
					pthread_mutex_unlock(& mtx_SaveImg);
				}*/
				cvSaveImage( fileName, pRgb );					
				endOfNight = true;
			} else if (result == "DAY" && endOfNight){
				printf("DAY");
				printf("\n");
				printf("Generating Timelapse");
				std::string timelapseCommand = "./timelapse.sh ";
				timelapseCommand.append(fileName);
				system(timelapseCommand.c_str());
				printf("\n");
				endOfNight = false;		
			}
			timeSave = GetTickCount();				
		}
		
	}

	ASIStopExposure(CamNum);
	ASICloseCamera(CamNum);
		
	if(bDisplay)
	{
		bDisplay = 0;
   		pthread_join(thread_display, &retval);
	}

	/*if(bSaveRun)
	{
		bSaveRun = false;
		pthread_mutex_lock(&mtx_SaveImg);
		pthread_cond_signal(&cond_SatrtSave);
		pthread_mutex_unlock(& mtx_SaveImg);
		pthread_join(hthdSave, 0);

	}*/
	cvReleaseImage(&pRgb);
	printf("main function over\n");
	return 1;
}