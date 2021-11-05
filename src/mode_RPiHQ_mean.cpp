#include <opencv2/core/core.hpp>
#include <opencv2/imgproc/imgproc.hpp>
#include <opencv2/highgui/highgui.hpp>
#include <unistd.h>
#include <string.h>
#include <errno.h>
#include <string>
#include <iomanip>
#include <cstring>
#include <sstream>
#include <iostream>
#include <cstdio>
#include <tr1/memory>
#include <stdlib.h>
#include <signal.h>
#include <fstream>
#include <algorithm> 

#include "include/RPiHQ_raspistill.h"
#include "include/mode_RPiHQ_mean.h"

double mean_history [5] = {0.0,1.0,0.0,1.0,0.0};
int exp_history [5] = {0,0,0,0,0};

int MeanCnt = 0;
double dMean = 1.0; // Mean(n-1)-Mean(n)
int dExp = 1.0; //Exp(n-1)-Exp(n)
int lastExposureChange = 0;
int dExposureChange = 0;

bool createMaskHorizon = true;
bool fastforward = false;

// remove same areas
void RPiHQmask(const char* fileName)
{
	bool foundMaskFile = true;

	//std::cout <<  "RPiHQcalcMean Bild wird zur Analyse geladen" << std::endl;
    cv::Mat image = cv::imread(fileName, cv::IMREAD_UNCHANGED);

	//std::cout <<  "RPiHQcalcMean Laden fertig" << std::endl;
    if (!image.data)
    {
            std::cout << "Error reading file " << basename(fileName) << std::endl;
    }
	else {
		//Define your destination image
		cv::Mat dstImage = cv::Mat::zeros(image.size(), CV_8U);    


//##########################################################################################
// Test Mask horizon 
// https://docs.opencv.org/4.5.2/d3/d96/tutorial_basic_geometric_drawing.html

		dstImage = cv::Mat::zeros(image.size(), CV_8U);
		cv::Mat maskHorizon;
    	std::vector<int> compression_params;
    	compression_params.push_back(CV_IMWRITE_PNG_COMPRESSION);
    	compression_params.push_back(9);
    	compression_params.push_back(CV_IMWRITE_JPEG_QUALITY);
    	compression_params.push_back(100);

		if (createMaskHorizon) {
			// 1. Define maskHorizon image
			maskHorizon = cv::Mat::zeros(image.size(), CV_8U);   

			// 2. circle
			cv::circle(maskHorizon, cv::Point(image.cols/2, image.rows/2), image.rows*10/12, cv::Scalar(255, 255, 255), -1, 8, 0);
			cv::circle(maskHorizon, cv::Point(image.cols/2, image.rows/2), image.rows*3/12, cv::Scalar(0, 0, 0), 5, 8, 0);
			cv::circle(maskHorizon, cv::Point(image.cols/2, image.rows/2), image.rows*4/12, cv::Scalar(0, 0, 0), 5, 8, 0);
			cv::circle(maskHorizon, cv::Point(image.cols/2, image.rows/2), image.rows*5/12, cv::Scalar(0, 0, 0), 5, 8, 0);
			cv::circle(maskHorizon, cv::Point(image.cols/2, image.rows/2), image.rows*6/12, cv::Scalar(0, 0, 0), 5, 8, 0);
			cv::circle(maskHorizon, cv::Point(image.cols/2, image.rows/2), image.rows*7/12, cv::Scalar(0, 0, 0), 5, 8, 0);
			cv::circle(maskHorizon, cv::Point(image.cols/2, image.rows/2), image.rows*8/12, cv::Scalar(0, 0, 0), 5, 8, 0);
			cv::circle(maskHorizon, cv::Point(image.cols/2, image.rows/2), image.rows*9/12, cv::Scalar(0, 0, 0), 5, 8, 0);

			// 3. some guidelines
			cv::line( maskHorizon,
    			cv::Point( 0, image.rows/2 ), 
				cv::Point( maskHorizon.cols, maskHorizon.rows/2 ),
    			cv::Scalar( 0, 0, 0 ),
    			5,
    			cv::LINE_8 );

			cv::line( maskHorizon,
    			cv::Point( maskHorizon.cols/2, 0 ), 
				cv::Point( maskHorizon.cols/2, maskHorizon.rows ),
    			cv::Scalar( 0, 0, 0 ),
    			5,
    			cv::LINE_8 );

  			ellipse( maskHorizon,
       			cv::Point(maskHorizon.cols/2, maskHorizon.rows/2),
       			cv::Size( maskHorizon.cols, 1 ),
       			45,
       			0,
       			360,
       			cv::Scalar( 0, 0, 0 ),
       			5,
       			cv::LINE_8 );
  			ellipse( maskHorizon,
       			cv::Point(image.cols/2, image.rows/2),
       			cv::Size( image.cols, 1 ),
       			135,
       			0,
       			360,
       			cv::Scalar( 0, 0, 0 ),
       			5,
       			cv::LINE_8 );

			// 4. Save Mask to mask_template
    		cv::imwrite("mask_template.jpg", maskHorizon, compression_params);
			createMaskHorizon = false;
		}
		else {
    		maskHorizon = cv::imread("mask.jpg", cv::IMREAD_UNCHANGED);
    		if (!image.data)
    		{
    			maskHorizon = cv::imread("mask_template.jpg", cv::IMREAD_UNCHANGED);
				foundMaskFile = false;
    		}
		}

		// 5. Save masked image to mask_template_test or filename
		image.copyTo(dstImage, maskHorizon);

		if (foundMaskFile) {
			remove( fileName );
    		cv::imwrite(fileName, dstImage, compression_params);
		}
		else {
    		cv::imwrite("mask_template_test.jpg", dstImage, compression_params);
		}

//##########################################################################################
	}
}

// Calculate new raspistillSettings (exposure, gain)
void RPiHQcalcMean(const char* fileName, int asiExposure, double asiGain, raspistillSetting &currentRaspistillSetting, modeMeanSetting &currentModeMeanSetting)
{

	//Hauptvariablen
    double mean;
    double mean_diff;

	if (currentModeMeanSetting.init) {
		currentModeMeanSetting.init = false;
		currentModeMeanSetting.ExposureLevelMax = log(asiGain * asiExposure/1000000.0) / log (2.0) * pow(currentModeMeanSetting.shuttersteps,2.0) + 1; 
		currentModeMeanSetting.ExposureLevelMin = log(1.0     * 1.0        /1000000.0) / log (2.0) * pow(currentModeMeanSetting.shuttersteps,2.0) - 1;
		if (currentModeMeanSetting.debugLevel >= 1)
		  printf("ExposureLevel: %1.8f ... %1.8f\n", currentModeMeanSetting.ExposureLevelMin, currentModeMeanSetting.ExposureLevelMax);

		//currentModeMeanSetting.mean_k0 *=currentModeMeanSetting.shuttersteps;  
		//currentModeMeanSetting.mean_k1 *=currentModeMeanSetting.shuttersteps;  
		//currentModeMeanSetting.mean_k2 *=currentModeMeanSetting.shuttersteps;  
	}

	// get old ExposureTime
	double ExposureTime_s = (double) currentRaspistillSetting.shutter_us/1000000.0;

	//std::cout <<  "RPiHQcalcMean Bild wird zur Analyse geladen" << std::endl;
    cv::Mat image = cv::imread(fileName, cv::IMREAD_UNCHANGED);

	//std::cout <<  "RPiHQcalcMean Laden fertig" << std::endl;
    if (!image.data)
    {
            std::cout << "Error reading file " << basename(fileName) << std::endl;
    }
	else {
		//Then define your mask image
		//cv::Mat mask = cv::Mat::zeros(image.size(), image.type());
		cv::Mat mask = cv::Mat::zeros(image.size(), CV_8U);

		//Define your destination image
		cv::Mat dstImage = cv::Mat::zeros(image.size(), CV_8U);    

		//I assume you want to draw the circle at the center of your image, with a radius of  mask.rows/3
		cv::circle(mask, cv::Point(mask.cols/2, mask.rows/2), mask.rows/3, cv::Scalar(255, 255, 255), -1, 8, 0);

		//Now you can copy your source image to destination image with masking
		image.copyTo(dstImage, mask);

/////////////////////////////////////////////////////////////////////////////////////
// Test focus
// https://stackoverflow.com/questions/7765810/is-there-a-way-to-detect-if-an-image-is-blurry
// https://drive.google.com/file/d/0B6UHr3GQEkQwYnlDY2dKNTdudjg/view?resourcekey=0-a73PvBnc3a2B5wztAV0QaA
 		cv::Mat lap;
    	cv::Laplacian(dstImage, lap, CV_64F);

    	cv::Scalar mu, sigma;
    	cv::meanStdDev(lap, mu, sigma);

    	double focusMeasure = sigma.val[0]*sigma.val[0];
	    if (currentModeMeanSetting.debugLevel >= 2) {
			std::cout <<  "focusMeasure: " << focusMeasure << std::endl;
		}
/////////////////////////////////////////////////////////////////////////////////////
        

    	std::vector<int> compression_params;
    	compression_params.push_back(CV_IMWRITE_PNG_COMPRESSION);
    	compression_params.push_back(9);
    	compression_params.push_back(CV_IMWRITE_JPEG_QUALITY);
    	compression_params.push_back(95);

    	cv::imwrite("test.jpg", dstImage, compression_params);

        //cv::Scalar mean_scalar = cv::mean(image);
        //cv::Scalar mean_scalar = cv::mean(dstImage);
        cv::Scalar mean_scalar = cv::mean(image, mask);
        switch (image.channels())
        {
            default: // mono case
			    std::cout <<  "mean_scalar.val[0]" << mean_scalar.val[0] << std::endl;
                mean = mean_scalar.val[0];
                break;
            case 3: // for color choose maximum channel
            case 4:
			    //std::cout <<  "image.channels() " << image.channels() << std::endl;
			    //std::cout <<  "mean_scalar.val[0] " << mean_scalar.val[0] << std::endl;
			    //std::cout <<  "mean_scalar.val[1] " << mean_scalar.val[1] << std::endl;
			    //std::cout <<  "mean_scalar.val[2] " << mean_scalar.val[2] << std::endl;
                //mean = cv::max(mean_scalar[0], cv::max(mean_scalar[1], mean_scalar[2]));
				mean = (mean_scalar[0] + mean_scalar[1] + mean_scalar[2]) / 3.0;
                break;
        }
        // Scale to 0-1 range
        switch (image.depth())
        {
            case CV_8U:
                mean /= 255.0;
                break;
            case CV_16U:
                mean /= 65535.0;
                break;
        }
		 
		if ( currentModeMeanSetting.debugLevel >= 1) {
			std::cout <<  basename(fileName) << " " << ExposureTime_s << " " << mean << " " << (currentModeMeanSetting.mean_value - mean) << std::endl;
		}

		// avg of mean history 
		if (currentModeMeanSetting.debugLevel >= 3) {
			printf("MeanCnt: %d\n", MeanCnt);
			printf("mean_historySize: %d\n", currentModeMeanSetting.historySize);
		}
		mean_history[MeanCnt % currentModeMeanSetting.historySize] = mean;
		int values = 0;
		mean=0.0;
		for (int i=1; i <= currentModeMeanSetting.historySize; i++) {
			int idx =  (MeanCnt + i) % currentModeMeanSetting.historySize;
			if (currentModeMeanSetting.debugLevel >= 1)
				printf("i=%d: idx=%d mean=%1.4f exp=%d\n", i, idx, mean_history[idx], exp_history[idx]);
			mean += mean_history[idx] * (double) i;
			values += i;
		} 

		int idx = (MeanCnt + currentModeMeanSetting.historySize) % currentModeMeanSetting.historySize;
		int idxN1 = (MeanCnt + currentModeMeanSetting.historySize-1) % currentModeMeanSetting.historySize;

		dMean = mean_history[idx] - mean_history[idxN1];
		dExp = exp_history[idx] - exp_history[idxN1];
		
		// forcast (m_forcast = m_neu + diff = m_neu + m_neu - m_alt = 2*m_neu - m_alt)
		double mean_forecast = 2.0 * mean_history[idx] - mean_history[idxN1];
		mean_forecast = std::min((double) std::max((double) mean_forecast, 0.0), 1.0);
		if (currentModeMeanSetting.debugLevel >= 2)
			printf("mean_forecast: %1.4f\n", mean_forecast);
		// gleiche Wertigkeit wie aktueller Wert
		mean += mean_forecast * currentModeMeanSetting.historySize;
		values += currentModeMeanSetting.historySize;

		if (currentModeMeanSetting.debugLevel >= 3)
			printf("values: %d\n", values);
		mean = mean / (double) values;

   		mean_diff = abs(mean - currentModeMeanSetting.mean_value);
		if (currentModeMeanSetting.debugLevel >= 2)
			printf("mean_diff: %1.4f\n", mean_diff);
    
		int ExposureChange = currentModeMeanSetting.shuttersteps / 2;
		
	    // fast forward
		if ((fastforward) || (mean_diff > (currentModeMeanSetting.mean_threshold * 2.0))) {
			ExposureChange = std::max(1.0, currentModeMeanSetting.mean_k0 + currentModeMeanSetting.mean_k1 * mean_diff + pow (currentModeMeanSetting.mean_k2 * mean_diff,2.0));
		}
		// slow forward
		else if (mean_diff > (currentModeMeanSetting.mean_threshold)) {
			ExposureChange = std::max(1.0, currentModeMeanSetting.mean_k0 + currentModeMeanSetting.mean_k1 * mean_diff);
		}

		dExposureChange = ExposureChange-lastExposureChange;
		lastExposureChange = ExposureChange;

		if (currentModeMeanSetting.debugLevel >= 1)
			printf("ExposureChange: %d (%d)\n", ExposureChange, dExposureChange);

		if (mean < (currentModeMeanSetting.mean_value - (currentModeMeanSetting.mean_threshold))) {
            if ((currentRaspistillSetting.analoggain < asiGain) || (currentRaspistillSetting.shutter_us < asiExposure)) {  // obere Grenze durch Gaim und shutter
				currentModeMeanSetting.ExposureLevel += ExposureChange;
			}
		}
		if (mean > (currentModeMeanSetting.mean_value + currentModeMeanSetting.mean_threshold))  {
			if (ExposureTime_s <= 0.000001) { // untere Grenze durch shuttertime
				if (currentModeMeanSetting.debugLevel >= 2)
					printf("ExposureTime_s to low - stop !\n");
			}
			else {
				currentModeMeanSetting.ExposureLevel -= ExposureChange;
			}
		}

		// Begrenzung 
		currentModeMeanSetting.ExposureLevel = std::max(std::min((int)currentModeMeanSetting.ExposureLevel, (int)currentModeMeanSetting.ExposureLevelMax), (int)currentModeMeanSetting.ExposureLevelMin);

		// fastforward ?
		if ((currentModeMeanSetting.ExposureLevel == (int)currentModeMeanSetting.ExposureLevelMax) || (currentModeMeanSetting.ExposureLevel == (int)currentModeMeanSetting.ExposureLevelMin)) {
			fastforward = true;
			printf("FF aktiviert\n");
		}
		if ((abs(mean_history[idx] - currentModeMeanSetting.mean_value) < currentModeMeanSetting.mean_threshold) &&
			(abs(mean_history[idxN1] - currentModeMeanSetting.mean_value) < currentModeMeanSetting.mean_threshold)) {
			fastforward = false;
			printf("FF deaktiviert\n");
		}
		
		// gain or exposure ?
		if (true) {
        	// change gain
			double newGain = std::min(asiGain, std::max(1.0, pow(2.0, double(currentModeMeanSetting.ExposureLevel)/pow(currentModeMeanSetting.shuttersteps,2.0)) / (asiExposure/1000000.0))); 
			double deltaGain = newGain - currentRaspistillSetting.analoggain; 
			if (deltaGain > 2.0) {
				currentRaspistillSetting.analoggain += 2.0;
			}
			else if (deltaGain < -2.0) {
				currentRaspistillSetting.analoggain -= 2.0;
			}
			else {
				currentRaspistillSetting.analoggain = newGain;
			}
			ExposureTime_s = pow(2.0, double(currentModeMeanSetting.ExposureLevel)/pow(currentModeMeanSetting.shuttersteps,2.0)) / currentRaspistillSetting.analoggain;
		}
		else {
			// change ExposureTime_s
			// calculate new ExposureTime_s
			ExposureTime_s = pow(2.0, double(currentModeMeanSetting.ExposureLevel)/pow(currentModeMeanSetting.shuttersteps,2.0)) / currentRaspistillSetting.analoggain;
			if ((ExposureTime_s > (asiExposure/1000000.0)) && (currentRaspistillSetting.analoggain < asiGain)) {
				currentRaspistillSetting.analoggain += 1.0;
				ExposureTime_s = pow(2.0, double(currentModeMeanSetting.ExposureLevel)/pow(currentModeMeanSetting.shuttersteps,2.0)) / currentRaspistillSetting.analoggain;
			}
			else if ((currentRaspistillSetting.analoggain >= 2) && (pow(2.0, double(currentModeMeanSetting.ExposureLevel)/pow(currentModeMeanSetting.shuttersteps,2.0)) / (currentRaspistillSetting.analoggain-1) <= (asiExposure/1000000.0))) {
				currentRaspistillSetting.analoggain -= 1.0;
				ExposureTime_s = pow(2.0, double(currentModeMeanSetting.ExposureLevel)/pow(currentModeMeanSetting.shuttersteps,2.0)) / currentRaspistillSetting.analoggain;
			}
		}

		if (ExposureTime_s > (asiExposure/1000000.0)) {
			ExposureTime_s = asiExposure/1000000.0;
		}
		else if (ExposureTime_s < 0.000001) {
			ExposureTime_s = 0.000001;
		}


		//#############################################################################################################
		// Vorbereitung fuer naechste Messung
		if (currentModeMeanSetting.quickstart > 0) {
			currentModeMeanSetting.quickstart--;
		}
		// Exposure gilt fuer die naechste Messung
		MeanCnt++;
		exp_history[MeanCnt % currentModeMeanSetting.historySize] = currentModeMeanSetting.ExposureLevel;

		currentRaspistillSetting.shutter_us = ExposureTime_s * 1000 * 1000;
		printf("Mean: %1.4f (%1.4f) Exposure level:%d (%d) Exposure time:%1.8f analoggain:%1.2f\n", mean, mean_diff, currentModeMeanSetting.ExposureLevel, currentModeMeanSetting.ExposureLevel-exp_history[idx], ExposureTime_s, currentRaspistillSetting.analoggain);
	}
}