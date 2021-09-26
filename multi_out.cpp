// Unified night image processor, producing keogram and startrails
// Copyright 2021 Chris Kuethe <chris.kuethe@gmail.com>
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
#include "allsky.h"

#include <opencv2/highgui/highgui.hpp>
#include <opencv2/imgproc/imgproc.hpp>
#include <opencv2/opencv.hpp>

struct config_t {
  std::string img_src_dir, img_src_ext, dst_keogram, dst_startrails;
  bool labels_enabled, keogram_enabled, startrails_enabled, parse_filename;
  int img_width;
  int img_height;
  int fontFace;
  int fontType;
  int lineWidth;
  int verbose;
  union {
    uint32_t textColor;
    uint8_t a, r, g, b;
  };
  double fontScale;
  double rotation_angle;
  double brightness_limit;
} config;

// ---------------------------------------------------------------------------

void parse_args(struct config_t*);
int get_font_by_name(char*);
void usage_and_exit(int);

// ---------------------------------------------------------------------------

void parse_args(int argc, char** argv, struct config_t* cf) {
  int optchar, tmp, h, w;

  // set up some defaults
  cf->img_height = cf->img_width = 0;  // #Nofilter
  cf->verbose = 0;                     // oh hush, you.
  cf->textColor = 0x000000ff;          // blue
  cf->brightness_limit = -1.0;         // will inhibit startrails
  cf->rotation_angle = 0.0;
  cf->labels_enabled = true;
  cf->parse_filename = cf->keogram_enabled = cf->startrails_enabled = false;
  cf->fontType = cv::LINE_8;
  cf->fontScale = 2.0;
  cf->lineWidth = 3;
  cf->fontFace = cv::FONT_HERSHEY_SIMPLEX;

  while (1) {  // getopt loop
    int option_index = 0;
    static struct option long_options[] = {
        {"directory", required_argument, 0, 'd'},
        {"extension", required_argument, 0, 'e'},
        {"keogram", required_argument, 0, 'k'},
        {"startrail", required_argument, 0, 't'},
        {"brightness", required_argument, 0, 'b'},
        {"image-size", required_argument, 0, 's'},
        {"font-color", required_argument, 0, 'C'},
        {"line-width", required_argument, 0, 'L'},
        {"font-name", required_argument, 0, 'N'},
        {"font-size", required_argument, 0, 'S'},
        {"font-type", required_argument, 0, 'T'},
        {"rotate", required_argument, 0, 'r'},
        {"no-label", no_argument, 0, 'n'},
        {"parse-filename", no_argument, 0, 'p'},
        {"verbose", no_argument, 0, 'v'},
        {"help", no_argument, 0, 'h'},
        {0, 0, 0, 0}};

    optchar = getopt_long(argc, argv, "b:d:e:k:r:s:t:C:L:N:S:T:npvh",
                          long_options, &option_index);
    if (optchar == -1)
      break;
    switch (optchar) {  // option switch
      case 'h':
        usage_and_exit(0);
        // NOTREACHED
      case 'd':
        cf->img_src_dir = optarg;
        break;
      case 'e':
        cf->img_src_ext = optarg;
        break;
      case 'k':
        cf->dst_keogram = optarg;
        cf->keogram_enabled = true;
        break;
      case 'b':
        cf->brightness_limit = atof(optarg);
        break;
      case 't':
        cf->dst_startrails = optarg;
        cf->startrails_enabled = true;
        break;
      case 'n':
        cf->labels_enabled = false;
        break;
      case 'p':
        cf->parse_filename = true;
        break;
      case 'r':
        cf->rotation_angle = atof(optarg);
        if (isnan(cf->rotation_angle))
          cf->rotation_angle = 0.0;
        else
          cf->rotation_angle = fmod(cf->rotation_angle, 360.0);
        break;
      case 's':
        sscanf(optarg, "%dx%d", &w, &h);
        // 122.8Mpx should be enough for anybody.
        if (h < 0 || h > 9600 || w < 0 || w > 12800) {
          cf->img_height = cf->img_width = 0;
        } else {
          cf->img_height = h;
          cf->img_width = w;
        }
        break;
      case 'v':
        cf->verbose++;
        break;
      case 'C':
        if (optarg[0] == '#')  // skip '#' if input is like '#coffee'
          optarg++;
        sscanf(optarg, "%06x", &tmp);
        cf->r = (tmp >> 16) & 0xff;
        cf->g = (tmp >> 8) & 0xff;
        cf->b = tmp & 0xff;
        break;
      case 'L':
        cf->lineWidth = atoi(optarg);
        if (cf->lineWidth < 1)
          cf->lineWidth = 1;
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
  return;
}

void usage_and_exit(int x) {
  std::cout << "Usage:\tmulti_out -d <imagedir> -e <ext> [<other_args>]"
            << std::endl;
  if (x)
    std::cout << KRED
              << "At least source directory and image extension are required"
              << std::endl;

  std::cout << KNRM << std::endl;
  std::cout << "Arguments:" << std::endl;
  std::cout << "-d | --directory <str> : directory from which to load images "
               "(required)"
            << std::endl;
  std::cout << "-e | --extension <str> : image extension to process (required)"
            << std::endl;
  std::cout << "-k | --keogram <str> : name of keogram file" << std::endl;
  std::cout << "-t | --startrails <str> : name of startrails file" << std::endl;
  std::cout << "-b | --brightness <float> : maximum brightness of images used "
               "in startrails "
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
  std::cout << "-p | --parse-filename : extract image time from filename "
               "rather than time on disk"
            << std::endl;
  std::cout
      << "-C | --font-color <str> : label font color, in HTML format (0000ff)"
      << std::endl;
  std::cout << "-L | --line-width <int> : keogram line thickness (3)"
            << std::endl;
  std::cout << "-N | --font-name <str> : font name (simplex)" << std::endl;
  std::cout << "-S | --font-side <float> : font size (2.0)" << std::endl;
  std::cout << "-T | --font-type <int> : font line type (1)" << std::endl;

  std::cout << std::endl;
  std::cout
      << "Font name is one of these OpenCV font names:\n\tSimplex, Plain, "
         "Duplex, Complex, Triplex, ComplexSmall, ScriptSimplex, ScriptComplex"
      << std::endl;
  std::cout << "Font Type is an OpenCV line type: 0=antialias, 1=8-connected, "
               "2=4-connected"
            << std::endl;
  std::cout << std::endl;
  std::cout << "examples:" << std::endl;
  std::cout
      << "multi_out --directory ../images/current/ --extension jpg "
         "--brightness 0.35 --keogram keogram.jpg --startrails startrails.jpg"
      << std::endl;
  std::cout << "multi_out -d . -e png -C ff0000 -k keogram.jpg" << std::endl;
  std::cout << "multi_out -d . -e png --brightness 0.35 -t keogram.jpg"
            << std::endl;
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

  parse_args(argc, argv, &config);

  if (config.img_src_dir.empty() || config.img_src_ext.empty())
    usage_and_exit(3);

  if (!config.dst_startrails.empty() && config.brightness_limit < 0)
    usage_and_exit(3);

  // if no images are being output, don't bother rotating the input
  if (config.dst_keogram.empty() and config.dst_startrails.empty())
    config.rotation_angle = 0.0;

  glob_t files;
  std::string wildcard = config.img_src_dir + "/*." + config.img_src_ext;
  glob(wildcard.c_str(), 0, NULL, &files);
  if (files.gl_pathc == 0) {
    globfree(&files);
    std::cout << "No images found in " << config.img_src_dir << ". Exiting."
              << std::endl;
    return 0;
  }

  int prevHour = -1;
  int nchan = 0, nskip = 0;
  double image_mean_brightness;
  cv::Mat keogram_buf;
  cv::Mat startrails_buf;
  cv::Mat tmp_mat;

  // we know how many images over which statistics will be commputed, so
  // create a matrix of that size and fill it with NaN (Not-a-Number) to
  // indicate that it contains no valid measurements (yet).
  cv::Mat image_stats(1, files.gl_pathc, CV_64F, cv::Scalar(NAN));

  for (size_t i = 0; i < files.gl_pathc; i++) {
    if (config.verbose)
      std::cout << "[" << i + 1 << "/" << files.gl_pathc << "] "
                << basename(files.gl_pathv[i]) << std::endl;

    cv::Mat src_image = cv::imread(files.gl_pathv[i], cv::IMREAD_UNCHANGED);
    if (!src_image.data) {
      std::cout << "Error reading file " << basename(files.gl_pathv[i])
                << std::endl;
      nskip++;
      continue;
    }

    // reject improperly sized images
    if (config.img_height && config.img_width &&
        (src_image.cols != config.img_width ||
         src_image.rows != config.img_height)) {
      if (config.verbose) {
        fprintf(stderr, "size %dx%d != %dx%d\n", src_image.cols, src_image.cols,
                config.img_width, config.img_height);
        nskip++;
        continue;
      }
    }

    // first properly sized image sets expected number of channels
    if (nchan == 0)
      nchan = src_image.channels();

    // repair incorrect number of channels if possible
    if (src_image.channels() != nchan) {
      if (config.verbose)
        fprintf(stderr, "repairing channel mismatch: %d != %d\n",
                src_image.channels(), nchan);
      if (src_image.channels() < nchan)
        cv::cvtColor(src_image, src_image, cv::COLOR_GRAY2BGR, nchan);
      else if (src_image.channels() > nchan)
        cv::cvtColor(src_image, src_image, cv::COLOR_BGR2GRAY, nchan);
    }

    // statistics
    cv::Scalar mean_scalar = cv::mean(src_image);
    switch (src_image.channels()) {
      default:  // mono case
        image_mean_brightness = mean_scalar.val[0];
        break;
      case 3:  // for color choose maximum channel
      case 4:
        image_mean_brightness =
            cv::max(mean_scalar[0], cv::max(mean_scalar[1], mean_scalar[2]));
        break;
    }
    // Scale to 0-1 range
    switch (src_image.depth()) {
      case CV_8U:
        image_mean_brightness /= 255.0;
        break;
      case CV_16U:
        image_mean_brightness /= 65535.0;
        break;
    }
    image_stats.col(i) = image_mean_brightness;

    // don't rotate unless rotation is configured, eg. skip 0 degree rotation
    if (config.rotation_angle) {
      cv::Point2f center((src_image.cols - 1) / 2.0,
                         (src_image.rows - 1) / 2.0);
      cv::Mat rot = cv::getRotationMatrix2D(center, config.rotation_angle, 1.0);
      cv::Rect2f bbox = cv::RotatedRect(cv::Point2f(), src_image.size(),
                                        config.rotation_angle)
                            .boundingRect2f();
      rot.at<double>(0, 2) += bbox.width / 2.0 - src_image.cols / 2.0;
      rot.at<double>(1, 2) += bbox.height / 2.0 - src_image.rows / 2.0;

      cv::warpAffine(src_image, tmp_mat, rot, bbox.size());
      src_image = tmp_mat;
    }

    // now we have an image at the correct orientation, with the proper number
    // of channels, let's do the needful.

    if (config.startrails_enabled) {  // all the startrails things
      if (image_mean_brightness <= config.brightness_limit) {
        if (startrails_buf.empty()) {
          src_image.copyTo(startrails_buf);
        } else {
          startrails_buf = cv::max(startrails_buf, src_image);
        }
      }
    }

    if (config.keogram_enabled) {  // all the keogram things
      if (keogram_buf.empty())
        keogram_buf.create(src_image.rows, files.gl_pathc, src_image.type());

      // Copy middle column to destination
      src_image.col(src_image.cols / 2).copyTo(keogram_buf.col(i));

      if (config.labels_enabled) {
        struct tm ft;  // the time of the file, by any means necessary
        if (config.parse_filename) {
          /* engage your safety squints!
           * this mess assumes that filenames are formatted thus:
           * /path/to/whatever/images/YYYYmmdd/image-11112233445566.ext
           *
           * Based on this assumption, it finds the last '-' in the input
           * string and advances one character beyond that... to the first
           * character of a sequence of digits which could reasonably be
           * interpreted as a timestamp. It then uses sscanf to extract
           * some integers and stash them into a struct tm.
           *
           * Hope you don't have any really weird filenames... :P */
          char* s;
          s = strrchr(files.gl_pathv[i], '-');
          s++;
          sscanf(s, "%04d%02d%02d%02d%02d%02d.%*s", &ft.tm_year, &ft.tm_mon,
                 &ft.tm_mday, &ft.tm_hour, &ft.tm_min, &ft.tm_sec);
        } else {
          struct stat s;
          stat(files.gl_pathv[i], &s);

          struct tm* t = localtime(&s.st_mtime);
          ft.tm_hour = t->tm_hour;
        }

        if (ft.tm_hour != prevHour) {
          if (prevHour != -1) {
            // Draw a dashed line and label for hour
            cv::LineIterator it(keogram_buf, cv::Point(i, 0),
                                cv::Point(i, keogram_buf.rows));
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

            if (i - textSize.width >= 0) {
              cv::putText(keogram_buf, text,
                          cv::Point(i - textSize.width,
                                    keogram_buf.rows - textSize.height),
                          config.fontFace, config.fontScale,
                          cv::Scalar(config.b, config.g, config.r),
                          config.lineWidth, config.fontType);
            }
          }
          prevHour = ft.tm_hour;
        }
      }
    }
  }

  std::vector<int> compression_params;
  compression_params.push_back(cv::IMWRITE_PNG_COMPRESSION);
  compression_params.push_back(9);
  compression_params.push_back(cv::IMWRITE_JPEG_QUALITY);
  compression_params.push_back(95);

  // Calculate some statistics
  double min_mean, max_mean;
  cv::Point min_loc;
  cv::minMaxLoc(image_stats, &min_mean, &max_mean, &min_loc);
  double mean_mean = cv::mean(image_stats)[0];

  std::vector<double> vec;
  image_stats.copyTo(vec);
  std::nth_element(vec.begin(), vec.begin() + (vec.size() / 2), vec.end());
  double median_mean = vec[vec.size() / 2];

  std::cout << "Minimum: " << min_mean << " maximum: " << max_mean
            << " mean: " << mean_mean << " median: " << median_mean
            << std::endl;

  if (config.startrails_enabled) {
    if (startrails_buf.empty()) {
      std::cout << "No images below threshold, writing the minimum image only"
                << std::endl;
      startrails_buf =
          cv::imread(files.gl_pathv[min_loc.x], cv::IMREAD_UNCHANGED);
    }

    cv::imwrite(config.dst_startrails, startrails_buf, compression_params);
  }

  if (config.keogram_enabled) {
    cv::imwrite(config.dst_keogram, keogram_buf, compression_params);
  }

  globfree(&files);
  return 0;
}
