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

int ExposureLevel = 1;
double lastMeans [5] = {0.5,0.5,0.5,0.5,0.5};
int MeanCnt = 0;

// Build capture command to capture the image from the HQ camera
void RPiHQcalcMean(const char* fileName, int asiExposure, double asiGain, double mean_value, double mean_threshold, double mean_shuttersteps, double& ExposureTime, int& Reinforcement)
{

    cv::Mat image = cv::imread(fileName, cv::IMREAD_UNCHANGED);
    if (!image.data)
    {
            std::cout << "Error reading file " << basename(fileName) << std::endl;
    }
	else {
        cv::Scalar mean_scalar = cv::mean(image);
        double mean;
        switch (image.channels())
        {
            default: // mono case
                mean = mean_scalar.val[0];
                break;
            case 3: // for color choose maximum channel
            case 4:
                mean = cv::max(mean_scalar[0], cv::max(mean_scalar[1], mean_scalar[2]));
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
        std::cout <<  basename(fileName) << " " << mean << std::endl;

		// avg of last means 
		lastMeans[MeanCnt++ % 5] = mean;
		mean = (lastMeans[0] + lastMeans[1] + lastMeans[2] + lastMeans[3] + lastMeans[4]) / 5.0;

   		double mean_diff = abs(mean - mean_value);
		printf("mean_diff: %1.4f\n", mean_diff);
    
		int ExposureChange = 1;
	    // fast forward
		if (mean_diff > (mean_threshold * 2)) {
			// magic number 4.0 ! be careful changing this value
			// Number 		Change of ExposureTime for (mean_diff = 0.5)
			// 3.46			2^3 = x8   slower
			// 4.00			2^4 = x16
			// 4.47         2^5 = x32  faster			  
			ExposureChange = pow ((mean_diff * 4.0 * mean_shuttersteps),2.0);
		}

		//printf("asiExposure: %d\n", asiExposure);
		//printf("asiGain: %1.4f\n", asiGain);
		if (mean < (mean_value - mean_threshold)) {
			if (ExposureTime < (asiExposure/1000000.0)) {
				ExposureLevel += ExposureChange;
			}
			else if (Reinforcement < asiGain) {
				Reinforcement++;
			}
		}
		if (mean > (mean_value + mean_threshold))  {
			if (ExposureTime <= 0.000001) {
				printf("ExposureTime to low - stop !\n");
			}
			else if (Reinforcement > 1)  {
				 Reinforcement--;
			}
			else {
				ExposureLevel -= ExposureChange;
			}

		}

		//printf("mean_shuttersteps: %1.4f\n", mean_shuttersteps);
		ExposureTime = pow(2.0, double(ExposureLevel)/pow(mean_shuttersteps,2.0));
		if (ExposureTime > (asiExposure/1000000.0)) {
			ExposureTime = asiExposure/1000000.0;
		}
		else if (ExposureTime < 0.000001) {
			ExposureTime = 0.000001;
		}

		printf("Mean: %1.4f Exposure level:%d Exposure time:%1.8f Reinforcement:%d\n", mean, ExposureLevel, ExposureTime, Reinforcement);

	}

}
