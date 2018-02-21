// Simple keogram composition program using OpenCV
// Copyright 2018 Jarno Paananen <jarno.paananen@gmail.com>
// Based on a script by Thomas Jacquin
// SPDX-License-Identifier: MIT

#include <cstdlib>
#include <glob.h>
#include <string>
#include <iostream>
#include <vector>

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
    if (argc != 4)
    {
        std::cout << KRED << "You need to pass 3 arguments: source directory, image extension, output file"
                  << std::endl;
        std::cout << "    ex: keogram ../images/current/ jpg keogram.jpg" << std::endl;
        std::cout << "    ex: keogram . png /home/pi/allsky/keogram.jpg" << KNRM << std::endl;
        return 3;
    }

    std::string directory  = argv[1];
    std::string extension  = argv[2];
    std::string outputfile = argv[3];

    glob_t files;
    std::string wildcard = directory + "/*." + extension;
    glob(wildcard.c_str(), 0, NULL, &files);

    cv::Mat accumulated;

    for (size_t f = 0; f < files.gl_pathc; f++)
    {
        cv::Mat image = cv::imread(files.gl_pathv[f], cv::IMREAD_UNCHANGED);

        std::cout << "[" << f + 1 << "/" << files.gl_pathc << "] " << basename(files.gl_pathv[f]) << std::endl;

        // If we don't have image yet, create one using height and format from
        // the source image and width from number of files
        if (accumulated.empty())
        {
            accumulated.create(image.rows, files.gl_pathc, image.type());
        }
        // Copy middle column to destination
        image.col(image.cols / 2).copyTo(accumulated.col(f));
    }
    globfree(&files);

    std::vector<int> compression_params;
    compression_params.push_back(CV_IMWRITE_PNG_COMPRESSION);
    compression_params.push_back(9);
    compression_params.push_back(CV_IMWRITE_JPEG_QUALITY);
    compression_params.push_back(95);

    cv::imwrite(outputfile, accumulated, compression_params);
}
