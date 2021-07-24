// Simple stacking program using OpenCV
// Based on:
// Simple startrails composition program using OpenCV
// Copyright 2018 Jarno Paananen <jarno.paananen@gmail.com>
// Based on script by Thomas Jacquin
// SPDX-License-Identifier: MIT

#include <cstdlib>
#include <glob.h>
#include <string>
#include <iostream>
#include <vector>
#include <algorithm>
#include <time.h>       /* time_t, struct tm, difftime, time, mktime */
#include <sys/stat.h>

#ifdef OPENCV_C_HEADERS
#include <opencv2/core/types_c.h>
#include <opencv2/highgui/highgui_c.h>
#include <opencv2/imgproc/imgproc_c.h>
#include <opencv2/imgcodecs/legacy/constants_c.h>
#endif

#include <opencv2/imgproc/imgproc.hpp>
#include <opencv2/highgui/highgui.hpp>

using namespace cv;
using namespace std;

#define KNRM "\x1B[0m"
#define KRED "\x1B[31m"
#define KGRN "\x1B[32m"
#define KYEL "\x1B[33m"
#define KBLU "\x1B[34m"
#define KMAG "\x1B[35m"
#define KCYN "\x1B[36m"
#define KWHT "\x1B[37m"

//-------------------------------------------------------------------------------------------------------
// https://cppsecrets.com/users/204211510411798104971091085153504964103109971051084699111109/C00-OpenCV-to-rotate-an-image.php
Mat rotate(Mat src, double angle, Point2f pt)   //rotate function returning mat object with parametres imagefile and angle    
{
    Mat dst;      //Mat object for output image file
    //Point2f pt(src.cols/2., src.rows/2.);          //point from where to rotate    
    Mat r = getRotationMatrix2D(pt, angle, 1.0);      //Mat object for storing after rotation
    warpAffine(src, dst, r, Size(src.cols, src.rows));  ///applie an affine transforation to image.
    std::cout << angle << std::endl;
    return dst;         //returning Mat object for output image file
}
//-------------------------------------------------------------------------------------------------------

int main(int argc, char *argv[])
{
    if (argc != 8)
    {
        std::cout << KRED
                  << "You need to pass 6 arguments: source directory, file extension, brightness treshold, x  y anglePerMinute output file"
                  << KNRM << std::endl;
        std::cout << "    ex: ./stacking ../images/20210722/ jpg 0.07 820 375 -0.25 startrails.jpg" << std::endl;
        std::cout << "    brightness ranges from 0 (black) to 1 (white)" << std::endl;
        std::cout << "    A moonless sky is around 0.05 while full moon can be as high as 0.4" << std::endl;
        return 3;
    }
    std::string directory  = argv[1];
    std::string extension  = argv[2];
    double threshold       = atof(argv[3]);
    float x                = atof(argv[4]);
    float y                = atof(argv[5]);
    double angle           = atof(argv[6]);
    std::string outputfile = argv[7];
    std::string outputfile_1 = "-5_-5.jpg";
    std::string outputfile_2 = "5_-5.jpg";
    std::string outputfile_3 = "5_5.jpg";
    std::string outputfile_4 = "-5_5.jpg";
    Point2f pt(x, y);
    Point2f pt_1(x-5.0, y-5.0);
    Point2f pt_2(x+5.0, y-5.0);
    Point2f pt_3(x+5.0, y+5.0);
    Point2f pt_4(x-5.0, y+5.0);

    // Find files
    glob_t files;
    std::string wildcard = directory + "/*." + extension;
    glob(wildcard.c_str(), 0, NULL, &files);
    if (files.gl_pathc == 0)
    {
        globfree(&files);
        std::cout << "No images found, exiting." << std::endl;
        return 0;
    }

    cv::Mat accumulated;
    cv::Mat accumulated_1;
    cv::Mat accumulated_2;
    cv::Mat accumulated_3;
    cv::Mat accumulated_4;

    // Create space for statistics
    cv::Mat stats;
    stats.create(1, files.gl_pathc, CV_64F);

    time_t time_first;
    double seconds;

    for (size_t f = 0; f < files.gl_pathc; f++)
    {
        cv::Mat image = cv::imread(files.gl_pathv[f], cv::IMREAD_UNCHANGED);
        if (!image.data)
        {
            std::cout << "Error reading file " << basename(files.gl_pathv[f]) << std::endl;
            stats.col(f) = 1.0; // mark as invalid
            continue;
        }

        struct stat t_stat;
        stat(files.gl_pathv[f], &t_stat);
        struct tm * timeinfo = localtime(&t_stat.st_mtime); // or gmtime() depending on what you want
        if ((int)f == 0) {
            time_first = mktime(timeinfo);
            seconds = 0.0;
        }
        else {
          seconds = difftime(mktime(timeinfo),time_first);
        }

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
        std::cout << "[" << f + 1 << "/" << files.gl_pathc << "] " << basename(files.gl_pathv[f]) << " " << mean << " sec=" << seconds << " angle:" << seconds * angle / 60.0 << std::endl;

        stats.col(f) = mean;

        if (mean <= threshold)
        {
            if (accumulated.empty())
            {
                image.copyTo(accumulated);
                image.copyTo(accumulated_1);
                image.copyTo(accumulated_2);
                image.copyTo(accumulated_3);
                image.copyTo(accumulated_4);
            }
            else
            {
                //Then define your mask image
	            cv::Mat mask = cv::Mat::zeros(image.size(), CV_8U);

	            //Define your destination image
	            cv::Mat dstImage = cv::Mat::zeros(image.size(), CV_8U);    

	            //I assume you want to draw the circle at the center of your image, with a radius of  mask.rows/3
	            cv::circle(mask, cv::Point(mask.cols/2, mask.rows/2), mask.rows*11/24, cv::Scalar(255, 255, 255), -1, 8, 0);

    	        //Now you can copy your source image to destination image with masking
	            image.copyTo(dstImage, mask);

                // rotate
                Mat dst;      //Mat object for output image file
                //dst = rotate(dstImage, (double)(f-1) * 60.0 * -360.0 / (24.0 * 60.0 * 60.0), pt);       //rotating image
                dst = rotate(dstImage, seconds * angle / 60.0, pt);       //rotating image
                accumulated = cv::max(accumulated, dst);
                dst = rotate(dstImage, seconds * angle / 60.0, pt_1);       //rotating image
                accumulated_1 = cv::max(accumulated_1, dst);
                dst = rotate(dstImage, seconds * angle / 60.0, pt_2);       //rotating image
                accumulated_2 = cv::max(accumulated_2, dst);
                dst = rotate(dstImage, seconds * angle / 60.0, pt_3);       //rotating image
                accumulated_3 = cv::max(accumulated_3, dst);
                dst = rotate(dstImage, seconds * angle / 60.0, pt_4);       //rotating image
                accumulated_4 = cv::max(accumulated_4, dst);
            }
        }
    }

    // Calculate some statistics
    double min_mean, max_mean;
    cv::Point min_loc;
    cv::minMaxLoc(stats, &min_mean, &max_mean, &min_loc);
    double mean_mean = cv::mean(stats)[0];

    // For median, do partial sort and take middle value
    std::vector<double> vec;
    stats.copyTo(vec);
    std::nth_element(vec.begin(), vec.begin() + (vec.size() / 2), vec.end());
    double median_mean = vec[vec.size() / 2];

    std::cout << "Minimum: " << min_mean << " maximum: " << max_mean << " mean: " << mean_mean
              << " median: " << median_mean << std::endl;

    // If we still don't have an image (no images below threshold), copy the minimum mean image so we see why
    if (accumulated.empty())
    {
        std::cout << "No images below threshold, writing the minimum image only" << std::endl;
        accumulated = cv::imread(files.gl_pathv[min_loc.x], cv::IMREAD_UNCHANGED);
    }
    globfree(&files);

    std::vector<int> compression_params;
    compression_params.push_back(CV_IMWRITE_PNG_COMPRESSION);
    compression_params.push_back(9);
    compression_params.push_back(CV_IMWRITE_JPEG_QUALITY);
    compression_params.push_back(95);

    cv::imwrite(outputfile, accumulated, compression_params);
    cv::imwrite(outputfile_1, accumulated_1, compression_params);
    cv::imwrite(outputfile_2, accumulated_2, compression_params);
    cv::imwrite(outputfile_3, accumulated_3, compression_params);
    cv::imwrite(outputfile_4, accumulated_4, compression_params);
    return 0;
}
