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

#define TIMESTAMP
#ifdef TIMESTAMP
#include <sys/stat.h>
#endif

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

#ifdef TIMESTAMP
    int prevHour = -1;
#endif

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

#ifdef TIMESTAMP
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
                const int fontFace     = cv::FONT_HERSHEY_SCRIPT_SIMPLEX;
                const double fontScale = 2;
                const int thickness    = 3;
                int baseline           = 0;
                cv::Size textSize      = cv::getTextSize(text, fontFace, fontScale, thickness, &baseline);

                cv::putText(accumulated, text, cv::Point(f - textSize.width, accumulated.rows - textSize.height),
                            fontFace, fontScale, cv::Scalar::all(255), thickness);
            }
            prevHour = t->tm_hour;
        }
#endif
    }
    globfree(&files);

    std::vector<int> compression_params;
    compression_params.push_back(CV_IMWRITE_PNG_COMPRESSION);
    compression_params.push_back(9);
    compression_params.push_back(CV_IMWRITE_JPEG_QUALITY);
    compression_params.push_back(95);

    cv::imwrite(outputfile, accumulated, compression_params);
}
