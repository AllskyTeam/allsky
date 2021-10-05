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

#include <opencv2/highgui.hpp>
#include <opencv2/imgproc.hpp>
#include <opencv2/opencv.hpp>

#define KNRM "\x1B[0m"
#define KRED "\x1B[31m"
#define KGRN "\x1B[32m"
#define KYEL "\x1B[33m"
#define KBLU "\x1B[34m"
#define KMAG "\x1B[35m"
#define KCYN "\x1B[36m"
#define KWHT "\x1B[37m"

struct config_t {
  std::string img_src_dir, img_src_ext, dst_keogram;
  bool labels_enabled, keogram_enabled, parse_filename, junk;
  int img_width;
  int img_height;
  int fontFace;
  int fontType;
  int lineWidth;
  int verbose;
  uint8_t a, r, g, b;
  double fontScale;
  double rotation_angle;
  double brightness_limit;
} config;

void parse_args(int, char**, struct config_t*);
void usage_and_exit(int);
int get_font_by_name(char*);

//-------------------------------------------------------------------------------------------------------
//-------------------------------------------------------------------------------------------------------

void parse_args(int argc, char** argv, struct config_t* cf) {
  int c;

  cf->labels_enabled = true;
  cf->parse_filename = false;
  cf->fontFace = cv::FONT_HERSHEY_SCRIPT_SIMPLEX;
  cf->fontScale = 2;
  cf->fontType = cv::LINE_8;
  cf->lineWidth = 3;
  cf->a = cf->r = cf->g = 0;
  cf->b = 0xff;
  cf->rotation_angle = 0;
  cf->verbose = cf->img_width = cf->img_height = 0;

  while (1) {  // getopt loop
    int option_index = 0;
    static struct option long_options[] = {
        {"directory", required_argument, 0, 'd'},
        {"image-size", required_argument, 0, 's'},
        {"extension", required_argument, 0, 'e'},
        {"output", required_argument, 0, 'o'},
        {"font-color", required_argument, 0, 'C'},
        {"font-line", required_argument, 0, 'L'},
        {"font-name", required_argument, 0, 'N'},
        {"font-size", required_argument, 0, 'S'},
        {"font-type", required_argument, 0, 'T'},
        {"rotate", required_argument, 0, 'r'},
        {"parse-filename", no_argument, 0, 'p'},
        {"no-label", no_argument, 0, 'n'},
        {"verbose", no_argument, 0, 'v'},
        {"help", no_argument, 0, 'h'},
        {0, 0, 0, 0}};

    c = getopt_long(argc, argv, "d:e:o:r:s:C:L:N:S:T:npvh", long_options,
                    &option_index);
    if (c == -1)
      break;
    switch (c) {  // option switch
      case 'h':
        usage_and_exit(0);
        // NOTREACHED
      case 'd':
        cf->img_src_dir = optarg;
        break;
      case 'e':
        cf->img_src_ext = optarg;
        break;
      case 'o':
        cf->dst_keogram = optarg;
        break;
      case 'p':
        cf->parse_filename = true;
        break;
      case 'n':
        cf->labels_enabled = false;
        break;
      case 'r':
        cf->rotation_angle = atof(optarg);
        break;
      case 's':
        int height, width;
        sscanf(optarg, "%dx%d", &width, &height);
        // 122.8Mpx should be enough for anybody.
        if (height < 0 || height > 9600 || width < 0 || width > 12800)
          height = width = 0;
        cf->img_height = height;
        cf->img_width = width;
        break;
      case 'v':
        cf->verbose++;
        break;
      case 'C':
        int tmp;
        if (strchr(optarg, ' ')) {
          int r, g, b;
          sscanf(optarg, "%d %d %d", &b, &g, &r);
          cf->b = b & 0xff;
          cf->g = g & 0xff;
          cf->r = r & 0xff;
          break;
        }
        if (optarg[0] == '#')  // skip '#' if input is like '#coffee'
          optarg++;
        sscanf(optarg, "%06x", &tmp);
        cf->b = tmp & 0xff;
        cf->g = (tmp >> 8) & 0xff;
        cf->r = (tmp >> 16) & 0xff;
        break;
      case 'L':
        cf->lineWidth = atoi(optarg);
        break;
      case 'N':
        cf->fontFace = get_font_by_name(optarg);
        break;
      case 'S':
        cf->fontScale = atof(optarg);
        break;
      case 'T':
        tmp = atoi(optarg);
        if (tmp == 2)
          cf->fontType = cv::LINE_4;
        else if (tmp == 0)
          cf->fontType = cv::LINE_AA;
        else
          cf->fontType = cv::LINE_8;
        break;
      default:
        break;
    }  // option switch
  }    // getopt loop
}

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
  std::cout << "-r | --rotate <float> : number of degrees to rotate image, "
               "counterclockwise (0)"
            << std::endl;
  std::cout << "-s | --image-size <int>x<int> : only process images of a given "
               "size, eg. 1280x960"
            << std::endl;
  std::cout << "-h | --help : display this help message" << std::endl;
  std::cout << "-v | --verbose : Increase logging verbosity" << std::endl;
  std::cout << "-n | --no-label : Disable hour labels" << std::endl;
  std::cout
      << "-C | --font-color <str> : label font color, in HTML format (0000ff)"
      << std::endl;
  std::cout << "-L | --font-line <int> : font line thickness (3)" << std::endl;
  std::cout << "-N | --font-name <str> : font name (simplex)" << std::endl;
  std::cout << "-S | --font-size <float> : font size (2.0)" << std::endl;
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
  struct config_t config;
  int i;
  char* e;

  parse_args(argc, argv, &config);

  if (config.verbose < 1)
    if ((e = getenv("ALLSKY_DEBUG_LEVEL")))
      if ((i = atoi(e)) > 0)
        config.verbose = i;

  if (config.img_src_dir.empty() || config.img_src_ext.empty() ||
      config.dst_keogram.empty())
    usage_and_exit(3);

  glob_t files;
  std::string wildcard = config.img_src_dir + "/*." + config.img_src_ext;
  glob(wildcard.c_str(), 0, NULL, &files);
  if (files.gl_pathc == 0) {
    globfree(&files);
    std::cout << "No images found, exiting." << std::endl;
    return 0;
  }

  cv::Mat accumulated;

  int prevHour = -1;
  int nchan = 0;

  for (size_t f = 0; f < files.gl_pathc; f++) {
    cv::Mat imagesrc = cv::imread(files.gl_pathv[f], cv::IMREAD_UNCHANGED);
    if (!imagesrc.data) {
      if (config.verbose)
        std::cout << "Error reading file " << basename(files.gl_pathv[f])
                  << std::endl;
      continue;
    }

    if (config.verbose > 1)
      std::cout << "[" << f + 1 << "/" << files.gl_pathc << "] "
                << basename(files.gl_pathv[f]) << std::endl;

    if (config.img_height && config.img_width &&
        (imagesrc.cols != config.img_width ||
         imagesrc.rows != config.img_height)) {
      if (config.verbose) {
        fprintf(stderr,
                "%s image size %dx%d does not match expected size %dx%d\n",
                files.gl_pathv[f], imagesrc.cols, imagesrc.cols,
                config.img_width, config.img_height);
      }
      continue;
    }

    if (nchan == 0)
      nchan = imagesrc.channels();

    if (imagesrc.channels() != nchan) {
      if (config.verbose) {
        fprintf(stderr, "repairing channel mismatch: %d != %d\n",
                imagesrc.channels(), nchan);
      }
      if (imagesrc.channels() < nchan)
        cv::cvtColor(imagesrc, imagesrc, cv::COLOR_GRAY2BGR, nchan);
      else if (imagesrc.channels() > nchan)
        cv::cvtColor(imagesrc, imagesrc, cv::COLOR_BGR2GRAY, nchan);
    }

    cv::Point2f center((imagesrc.cols - 1) / 2.0, (imagesrc.rows - 1) / 2.0);
    cv::Mat rot = cv::getRotationMatrix2D(center, config.rotation_angle, 1.0);
    cv::Rect2f bbox =
        cv::RotatedRect(cv::Point2f(), imagesrc.size(), config.rotation_angle)
            .boundingRect2f();
    rot.at<double>(0, 2) += bbox.width / 2.0 - imagesrc.cols / 2.0;
    rot.at<double>(1, 2) += bbox.height / 2.0 - imagesrc.rows / 2.0;
    cv::Mat imagedst;
    cv::warpAffine(imagesrc, imagedst, rot, bbox.size());
    if (accumulated.empty()) {
      accumulated.create(imagedst.rows, files.gl_pathc, imagesrc.type());
    }

    // Copy middle column to destination
    imagedst.col(imagedst.cols / 2).copyTo(accumulated.col(f));

    if (config.labels_enabled) {
      struct tm ft;  // the time of the file, by any means necessary
      if (config.parse_filename) {
        // engage your safety squints!
        char* s;
        s = strrchr(files.gl_pathv[f], '-');
        s++;
        sscanf(s, "%04d%02d%02d%02d%02d%02d.%*s", &ft.tm_year, &ft.tm_mon,
               &ft.tm_mday, &ft.tm_hour, &ft.tm_min, &ft.tm_sec);
      } else {
        // sometimes you can believe the file time on disk
        struct stat s;
        stat(files.gl_pathv[f], &s);
        struct tm* t = localtime(&s.st_mtime);
        ft.tm_hour = t->tm_hour;
      }

      if (ft.tm_hour != prevHour) {
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
          snprintf(hour, 3, "%02d", ft.tm_hour);
          std::string text(hour);
          int baseline = 0;
          cv::Size textSize =
              cv::getTextSize(text, config.fontFace, config.fontScale,
                              config.lineWidth, &baseline);

          if (f - textSize.width >= 0) {
            cv::putText(accumulated, text,
                        cv::Point(f - textSize.width,
                                  accumulated.rows - textSize.height),
                        config.fontFace, config.fontScale,
                        cv::Scalar(config.b, config.g, config.r),
                        config.lineWidth, config.fontType);
          }
        }
        prevHour = ft.tm_hour;
      }
    }
  }
  globfree(&files);

  std::vector<int> compression_params;
  compression_params.push_back(cv::IMWRITE_PNG_COMPRESSION);
  compression_params.push_back(9);
  compression_params.push_back(cv::IMWRITE_JPEG_QUALITY);
  compression_params.push_back(95);

  cv::imwrite(config.dst_keogram, accumulated, compression_params);
}
