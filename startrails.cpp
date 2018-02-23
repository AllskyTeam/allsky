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

#include <opencv2/imgproc/imgproc.hpp>
#include <opencv2/highgui/highgui.hpp>

#define KNRM "\x1B[0m"
#define KRED "\x1B[31m"
#define KGRN "\x1B[32m"
#define KYEL "\x1B[33m"
#define KBLU "\x1B[34m"
#define KMAG "\x1B[35m"
#define KCYN "\x1B[36m"
#define KWHT "\x1B[37m"

//-------------------------------------------------------------------------------------------------------
//-------------------------------------------------------------------------------------------------------

int main(int argc, char *argv[])
{
    if (argc != 5)
    {
        std::cout << KRED
                  << "You need to pass 4 arguments: source directory, file extension, brightness treshold, output file"
                  << KNRM << std::endl;
        std::cout << "    ex: startrails ../images/20180208/ jpg 0.07 startrails.jpg" << std::endl;
        std::cout << "    brightness ranges from 0 (black) to 1 (white)" << std::endl;
        std::cout << "    A moonless sky is around 0.05 while full moon can be as high as 0.4" << std::endl;
        return 3;
    }
    std::string directory  = argv[1];
    std::string extension  = argv[2];
    double threshold       = atof(argv[3]);
    std::string outputfile = argv[4];

    // Find files
    glob_t files;
    std::string wildcard = directory + "/*." + extension;
    glob(wildcard.c_str(), 0, NULL, &files);

    cv::Mat accumulated;

    // Create space for statistics
    cv::Mat stats;
    stats.create(1, files.gl_pathc, CV_64F);

    for (size_t f = 0; f < files.gl_pathc; f++)
    {
        cv::Mat image = cv::imread(files.gl_pathv[f], cv::IMREAD_UNCHANGED);

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
        std::cout << "[" << f + 1 << "/" << files.gl_pathc << "] " << basename(files.gl_pathv[f]) << " " << mean
                  << std::endl;

        stats.col(f) = mean;

        if (mean <= threshold)
        {
            if (accumulated.empty())
            {
                image.copyTo(accumulated);
            }
            else
            {
                accumulated = cv::max(accumulated, image);
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
    return 0;
}
