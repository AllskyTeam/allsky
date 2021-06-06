#include <opencv2/core/core.hpp>
#include <opencv2/imgproc/imgproc.hpp>
#include <opencv2/highgui/highgui.hpp>
//#include <sys/time.h>
//#include <time.h>
#include <unistd.h>
#include <string.h>
//#include <sys/types.h>
#include <errno.h>
#include <string>
#include <iomanip>
#include <cstring>
#include <sstream>
#include <iostream>
#include <cstdio>
#include <tr1/memory>
//#include <ctime>
#include <stdlib.h>
#include <signal.h>
#include <fstream>

int Belichtungsstufe = 1;
int Verstaerkung = 1;

// Build capture command to capture the image from the HQ camera
void RPiHQcalcMean(const char* fileName, int asiExposure, double asiGain, double mean_value, double mean_threshold, double& Belichtungszeit, int& Verstaerkung)
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

   		double mean_diff = abs(mean - mean_value);
    
		int Belichtungsstufe_step = 1;
		if (mean_diff > 0.4) {
			Belichtungsstufe_step = 16;
		}  
		else if (mean_diff > 0.3) {
			Belichtungsstufe_step = 8;
		}  
		else if (mean_diff > 0.2) {
			Belichtungsstufe_step = 4;
		}  
		else if (mean_diff > 0.1) {
			Belichtungsstufe_step = 2;
		}  
        
		if (mean < (mean_value - mean_threshold)) {
			if (Belichtungszeit < (asiExposure/1000.0)) {
				Belichtungsstufe += Belichtungsstufe_step;
			}
			else if (Verstaerkung < asiGain) {
				Verstaerkung++;
			}
		}
		if (mean > (mean_value - mean_threshold))  {
			if (Belichtungszeit < 0.0001) {
				printf("Wahrscheinlich Tagmodus - nicht mehr weiter regeln\n");
			}
			else if (Verstaerkung > 1)  {
				 Verstaerkung--;
			}
			else {
				Belichtungsstufe -= Belichtungsstufe_step;
			}

		}

		Belichtungszeit = pow(2.0, double(Belichtungsstufe)/3.0);
		if (Belichtungszeit > asiExposure/1000.0) {
			Belichtungszeit = asiExposure/1000.0;
		}

		printf("Mean: %1.2f Belichtungsstufe:%d Belichtungszeit:%1.4f Verstaerkung:%d\n", mean, Belichtungsstufe, Belichtungszeit, Verstaerkung);

	}

}
