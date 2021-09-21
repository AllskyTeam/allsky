// Simple keogram composition program using OpenCV
// Copyright 2018 Jarno Paananen <jarno.paananen@gmail.com>
// Based on a script by Thomas Jacquin
// Rotation added by Agustin Nunez @agnunez
// SPDX-License-Identifier: MIT

#include <getopt.h>
#include <glob.h>
#include <stdio.h>
#include <sys/stat.h>
#include <cstdlib>
#include <iostream>
#include <string>
#include <vector>

#ifdef OPENCV_C_HEADERS
#include <opencv2/core/types_c.h>
#include <opencv2/highgui/highgui_c.h>
#include <opencv2/imgcodecs/legacy/constants_c.h>
#include <opencv2/imgproc/imgproc_c.h>
#endif

#include <opencv2/highgui/highgui.hpp>
#include <opencv2/imgproc/imgproc.hpp>
#include <opencv2/opencv.hpp>

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
int loglevel = 0;

void usage_and_exit(int x) {
  std::cout
      << "Usage:\tkeogram -d <imagedir> -e <ext> -o <outputfile> [<other_args>]"
      << std::endl;
  if (x)
    std::cout
        << KRED
        << "Source directory, image extension, and output file are required"
        << std::endl;

  std::cout << KNRM << std::endl;
  std::cout << "Arguments:" << std::endl;
  std::cout << "-d | --directory <str> : directory from which to load images "
               "(required)"
            << std::endl;
  std::cout << "-e | --extension <str> : image extension to process (required)"
            << std::endl;
  std::cout << "-o | --output-file <str> : name of output file (required)"
            << std::endl;
  std::cout << "-r | --r <float> : number of degrees to rotate image, "
               "counterclockwise (0)"
            << std::endl;
  std::cout << "-h | --help : display this help message" << std::endl;
  std::cout << "-v | --verbose : Increase logging verbosity" << std::endl;
  std::cout << "-n | --no-label : Disable hour labels" << std::endl;
  std::cout
      << "-C | --font-color <str> : label font color, in HTML format (0000ff)"
      << std::endl;
  std::cout << "-L | --font-line <int> : font line thickness (3)" << std::endl;
  std::cout << "-N | --font-name <str> : font name (simplex)" << std::endl;
  std::cout << "-S | --font-side <float> : font size (2.0)" << std::endl;
  std::cout << "-T | --font-type <int> : font line type (1)" << std::endl;

  std::cout << KNRM << std::endl;
  std::cout
      << "Font name is one of these OpenCV font names:\n\tSimplex, Plain, "
         "Duplex, Complex, Triplex, ComplexSmall, ScriptSimplex, ScriptComplex"
      << std::endl;
  std::cout << "Font Type is an OpenCV line type: 0=antialias, 1=8-connected, "
               "2=4-connected"
            << std::endl;
  std::cout << KNRM << std::endl;
  std::cout << "    ex: keogram --directory ../images/current/ --extension jpg "
               "--output-file keogram.jpg --font-size 2"
            << std::endl;
  std::cout << "    ex: keogram -d . -e png -o /home/pi/allsky/keogram.jpg -n"
            << KNRM << std::endl;
  exit(x);
}

int get_font_by_name(char* s) {
  // case insensitively check the user-specified font, and use something
  // sensible in case of erroneous input
  if (strcasecmp(s, "plain") == 0)
    return cv::FONT_HERSHEY_PLAIN;
  if (strcasecmp(s, "duplex") == 0)
    return cv::FONT_HERSHEY_DUPLEX;
  if (strcasecmp(s, "complex") == 0)
    return cv::FONT_HERSHEY_COMPLEX;
  if (strcasecmp(s, "complexsmall") == 0)
    return cv::FONT_HERSHEY_COMPLEX_SMALL;
  if (strcasecmp(s, "triplex") == 0)
    return cv::FONT_HERSHEY_TRIPLEX;
  if (strcasecmp(s, "scriptsimplex") == 0)
    return cv::FONT_HERSHEY_SCRIPT_SIMPLEX;
  if (strcasecmp(s, "scriptcomplex") == 0)
    return cv::FONT_HERSHEY_SCRIPT_COMPLEX;
  if (strcasecmp(s, "simplex"))  // yes, this is intentional
    std::cout << KRED << "Unknown font '" << s << "', using SIMPLEX " << KNRM
              << std::endl;
  return cv::FONT_HERSHEY_SIMPLEX;
}

int main(int argc, char* argv[]) {
  int c;
  bool labelsEnabled = true;
  int fontFace = cv::FONT_HERSHEY_SCRIPT_SIMPLEX;
  double fontScale = 2;
  int fontType = cv::LINE_8;
  int thickness = 3;
  unsigned char fontColor[3] = {255, 0, 0};
  double angle = 0;
  std::string directory, extension, outputfile;

  while (1) {  // getopt loop
    int option_index = 0;
    static struct option long_options[] = {
        {"image-dir", required_argument, 0, 'd'},
        {"extension", required_argument, 0, 'e'},
        {"output", required_argument, 0, 'o'},
        {"font-color", required_argument, 0, 'C'},
        {"font-line", required_argument, 0, 'L'},
        {"font-name", required_argument, 0, 'N'},
        {"font-size", required_argument, 0, 'S'},
        {"font-type", required_argument, 0, 'T'},
        {"rotate", required_argument, 0, 'r'},
        {"no-label", no_argument, 0, 'n'},
        {"verbose", no_argument, 0, 'v'},
        {"help", no_argument, 0, 'h'},
        {0, 0, 0, 0}};

    c = getopt_long(argc, argv, "d:e:o:r:C:L:N:S:T:nvh", long_options,
                    &option_index);
    if (c == -1)
      break;
    switch (c) {  // option switch
      int tmp;
      case 'h':
        usage_and_exit(0);
        // NOTREACHED
      case 'd':
        directory = optarg;
        break;
      case 'e':
        extension = optarg;
        break;
      case 'o':
        outputfile = optarg;
        break;
      case 'n':
        labelsEnabled = false;
        break;
      case 'r':
        angle = atof(optarg);
        break;
      case 'v':
        loglevel++;
        break;
      case 'C':
        if (optarg[0] == '#')  // skip '#' if input is like '#coffee'
          optarg++;
        sscanf(optarg, "%06x", &tmp);
        fontColor[0] = (tmp >> 16) & 0xff;
        fontColor[1] = (tmp >> 8) & 0xff;
        fontColor[2] = tmp & 0xff;
        break;
      case 'L':
        thickness = atoi(optarg);
        break;
      case 'N':
        fontFace = get_font_by_name(optarg);
        break;
      case 'S':
        fontScale = atof(optarg);
        break;
      case 'T':
        tmp = atoi(optarg);
        if (tmp == 2)
          fontType = cv::LINE_4;
        else if (tmp == 0)
          fontType = cv::LINE_AA;
        else
          fontType = cv::LINE_8;
        break;
      default:
        break;
    }  // option switch
  }    // getopt loop

  if (directory.empty() || extension.empty() || outputfile.empty())
    usage_and_exit(3);

  glob_t files;
  std::string wildcard = directory + "/*." + extension;
  glob(wildcard.c_str(), 0, NULL, &files);
  if (files.gl_pathc == 0) {
    globfree(&files);
    std::cout << "No images found, exiting." << std::endl;
    return 0;
  }

  cv::Mat accumulated;

  int prevHour = -1;

  for (size_t f = 0; f < files.gl_pathc; f++) {
    cv::Mat imagesrc = cv::imread(files.gl_pathv[f], cv::IMREAD_UNCHANGED);
    if (!imagesrc.data) {
      std::cout << "Error reading file " << basename(files.gl_pathv[f])
                << std::endl;
      continue;
    }

    if (loglevel)
      std::cout << "[" << f + 1 << "/" << files.gl_pathc << "] "
                << basename(files.gl_pathv[f]) << std::endl;

    cv::Point2f center((imagesrc.cols - 1) / 2.0, (imagesrc.rows - 1) / 2.0);
    cv::Mat rot = cv::getRotationMatrix2D(center, angle, 1.0);
    cv::Rect2f bbox =
        cv::RotatedRect(cv::Point2f(), imagesrc.size(), angle).boundingRect2f();
    rot.at<double>(0, 2) += bbox.width / 2.0 - imagesrc.cols / 2.0;
    rot.at<double>(1, 2) += bbox.height / 2.0 - imagesrc.rows / 2.0;
    cv::Mat imagedst;
    cv::warpAffine(imagesrc, imagedst, rot, bbox.size());
    if (accumulated.empty()) {
      accumulated.create(imagedst.rows, files.gl_pathc, imagesrc.type());
    }

    // Copy middle column to destination
    imagedst.col(imagedst.cols / 2).copyTo(accumulated.col(f));

    if (labelsEnabled) {
      struct stat s;
      stat(files.gl_pathv[f], &s);

      struct tm* t = localtime(&s.st_mtime);
      if (t->tm_hour != prevHour) {
        if (prevHour != -1) {
          // Draw a dashed line and label for hour
          cv::LineIterator it(accumulated, cv::Point(f, 0),
                              cv::Point(f, accumulated.rows));
          for (int i = 0; i < it.count; i++, ++it) {
            // 4 pixel dashed line
            if (i & 4) {
              uchar* p = *it;
              for (int c = 0; c < it.elemSize; c++) {
                *p = ~(*p);
                p++;
              }
            }
          }

          // Draw text label to the left of the dash
          char hour[3];
          snprintf(hour, 3, "%02d", t->tm_hour);
          std::string text(hour);
          int baseline = 0;
          cv::Size textSize =
              cv::getTextSize(text, fontFace, fontScale, thickness, &baseline);

          if (f - textSize.width >= 0) {
            cv::putText(accumulated, text,
                        cv::Point(f - textSize.width,
                                  accumulated.rows - textSize.height),
                        fontFace, fontScale,
                        cv::Scalar(fontColor[0], fontColor[1], fontColor[2]),
                        thickness, fontType);
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
