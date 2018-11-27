// Simple keogram composition program using OpenCV
// Copyright 2018 Jarno Paananen <jarno.paananen@gmail.com>
// Based on a script by Thomas Jacquin
// SPDX-License-Identifier: MIT

#include <cstdlib>
#include <glob.h>
#include <iostream>
#include <string>
#include <sys/stat.h>
#include <vector>
#include <stdio.h>

#include <opencv2/highgui/highgui.hpp>
#include <opencv2/imgproc/imgproc.hpp>

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
    if (argc < 4)
    {
        std::cout << KRED << "You need to pass 3 arguments: source directory, "
                             "image extension, output file"
                  << std::endl;
        std::cout << "Optionally you can pass after them: " << std::endl;
        std::cout << " -no-label                    - Disable hour labels" << std::endl;
        std::cout << " -fontname = Font Name        - Default = 0    - Font Types "
                     "(0-7), Ex. 0 = simplex, 4 = triplex, 7 = script"
                  << std::endl;
        std::cout << " -fontcolor = Font Color      - Default = 255 0 0  - Text "
                     "blue (BRG)"
                  << std::endl;
        std::cout << " -fonttype = Font Type        - Default = 8    - Font Line "
                     "Type,(0-2), 0 = AA, 1 = 8, 2 = 4"
                  << std::endl;
        std::cout << " -fontsize                    - Default = 2.0  - Text Font Size" << std::endl;
        std::cout << " -fontline                    - Default = 3    - Text Font "
                     "Line Thickness"
                  << std::endl;
        std::cout << "    ex: keogram ../images/current/ jpg keogram.jpg -fontsize 2" << std::endl;
        std::cout << "    ex: keogram . png /home/pi/allsky/keogram.jpg -no-label" << KNRM << std::endl;
        return 3;
    }

    std::string directory  = argv[1];
    std::string extension  = argv[2];
    std::string outputfile = argv[3];

    bool labelsEnabled = true;
    int fontFace       = cv::FONT_HERSHEY_SCRIPT_SIMPLEX;
    double fontScale   = 2;
    int fontType       = 8;
    int thickness      = 3;
    char fontColor[3]  = { 255, 0, 0 };

    // Handle optional parameters
    for (int a = 4; a < argc; ++a)
    {
        if (!strcmp(argv[a], "-no-label"))
        {
            labelsEnabled = false;
        }
        else if (!strcmp(argv[a], "-fontname"))
        {
            fontFace = atoi(argv[++a]);
        }
        else if (!strcmp(argv[a], "-fonttype"))
        {
            fontType = atoi(argv[++a]);
        }
        else if (!strcmp(argv[a], "-fontsize"))
        {
            fontScale = atof(argv[++a]);
        }
        else if (!strcmp(argv[a], "-fontline"))
        {
            thickness = atoi(argv[++a]);
        }
        else if (!strcmp(argv[a], "-fontcolor"))
        {
            fontColor[0] = atoi(argv[++a]);
            fontColor[1] = atoi(argv[++a]);
            fontColor[2] = atoi(argv[++a]);
        }
    }

    glob_t files;
    std::string wildcard = directory + "/*." + extension;
    glob(wildcard.c_str(), 0, NULL, &files);

    cv::Mat accumulated;

    int prevHour = -1;

    for (size_t f = 0; f < files.gl_pathc; f++)
    {
        cv::Mat image = cv::imread(files.gl_pathv[f], cv::IMREAD_UNCHANGED);
        if (!image.data)
        {
            std::cout << "Error reading file " << basename(files.gl_pathv[f]) << std::endl;
            continue;
        }

        std::cout << "[" << f + 1 << "/" << files.gl_pathc << "] " << basename(files.gl_pathv[f]) << std::endl;

        // If we don't have image yet, create one using height and format from
        // the source image and width from number of files
        if (accumulated.empty())
        {
            accumulated.create(image.rows, files.gl_pathc, image.type());
        }
        // Copy middle column to destination
        image.col(image.cols / 2).copyTo(accumulated.col(f));

        if (labelsEnabled)
        {
            struct stat s;
            stat(files.gl_pathv[f], &s);

            struct tm *t = localtime(&s.st_mtime);
            if (t->tm_hour != prevHour)
            {
                if (prevHour != -1)
                {
                    // Draw a dashed line and label for hour
                    cv::LineIterator it(accumulated, cv::Point(f, 0), cv::Point(f, accumulated.rows));
                    for (int i = 0; i < it.count; i++, ++it)
                    {
                        // 4 pixel dashed line
                        if (i & 4)
                        {
                            uchar *p = *it;
                            for (int c = 0; c < it.elemSize; c++)
                            {
                                *p = ~(*p);
                                p++;
                            }
                        }
                    }

                    // Draw text label to the left of the dash
                    char hour[3];
                    snprintf(hour, 3, "%02d", t->tm_hour);
                    std::string text(hour);
                    int baseline      = 0;
                    cv::Size textSize = cv::getTextSize(text, fontFace, fontScale, thickness, &baseline);

                    if (f - textSize.width >= 0)
                    {
                        cv::putText(accumulated, text,
                                    cv::Point(f - textSize.width, accumulated.rows - textSize.height), fontFace,
                                    fontScale, cv::Scalar(fontColor[0], fontColor[1], fontColor[2]), thickness,
                                    fontType);
                    }
                }
                prevHour = t->tm_hour;
            }
        }
    }
    globfree(&files);

    std::vector<int> compression_params;
    compression_params.push_back(CV_IMWRITE_PNG_COMPRESSION);
    compression_params.push_back(9);
    compression_params.push_back(CV_IMWRITE_JPEG_QUALITY);
    compression_params.push_back(95);

    cv::imwrite(outputfile, accumulated, compression_params);
}
