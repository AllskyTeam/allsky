// Simple startrails composition program using OpenCV
// Copyright 2018 Jarno Paananen <jarno.paananen@gmail.com>
// Based on script by Thomas Jacquin
// SPDX-License-Identifier: MIT

#include <getopt.h>
#include <glob.h>
#include <unistd.h>
#include <algorithm>
#include <cstdlib>
#include <iostream>
#include <string>
#include <vector>

#include <opencv2/highgui.hpp>
#include <opencv2/imgproc.hpp>

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

void usage_and_exit(int x) {
  std::cout << "Usage: startrails [-v] -d <dir> -e <ext> [-b <brightness> -o "
               "<output> | -s]"
            << std::endl;
  if (x) {
    std::cout << KRED
              << "Source directory and file extension are always required."
              << std::endl;
    std::cout << "brightness threshold and output file are required to render "
                 "startrails"
              << KNRM << std::endl;
  }

  std::cout << std::endl << "Arguments:" << std::endl;
  std::cout << "-h : display this help, then exit" << std::endl;
  std::cout << "-v : increase log verbosity" << std::endl;
  std::cout << "-s : print image directory statistics without producing image."
            << std::endl;
  std::cout << "-d <str> : directory from which to read images" << std::endl;
  std::cout << "-e <str> : filter images to just this extension" << std::endl;
  std::cout << "-o <str> : output image filename" << std::endl;
  std::cout << "-S <int>x<int> : restrict processed images to this size"
            << std::endl;
  std::cout << "-b <float> : ranges from 0 (black) to 1 (white)" << std::endl;
  std::cout << "\tA moonless sky may be as low as 0.05 while full moon can be "
               "as high as 0.4"
            << std::endl;
  std::cout << std::endl
            << "ex: startrails -b 0.07 -d ../images/20180208/ -e jpg -o "
               "startrails.jpg"
            << std::endl;
  exit(x);
}

int main(int argc, char* argv[]) {
  std::string directory, extension, outputfile;
  double threshold = -1;
  int verbose = 0, stats_only = 0, height = 0, width = 0;
  int c;

  while ((c = getopt(argc, argv, "hvsb:d:e:o:S:")) != -1) {
    switch (c) {
      case 'h':
        usage_and_exit(0);
        // NOTREACHED
        break;
      case 'v':
        verbose++;
        break;
      case 's':
        stats_only = 1;
        break;
      case 'S':
        sscanf(optarg, "%dx%d", &width, &height);
        // 122.8Mpx should be enough for anybody.
        if (height < 0 || height > 9600 || width < 0 || width > 12800)
          height = width = 0;
        break;
      case 'b':
        double tf;
        tf = atof(optarg);
        if (tf >= 0 && tf <= 1.0)
          threshold = tf;
        break;
      case 'd':
        directory = optarg;
        break;
      case 'e':
        extension = optarg;
        break;
      case 'o':
        outputfile = optarg;
        break;
      default:
        break;
    }
  }

  if (stats_only) {
    threshold = 0;
    outputfile = "/dev/null";
  }

  if (directory.empty() || extension.empty() || outputfile.empty() ||
      threshold < 0)
    usage_and_exit(3);

  // Find files
  glob_t files;
  std::string wildcard = directory + "/*." + extension;
  glob(wildcard.c_str(), 0, NULL, &files);
  if (files.gl_pathc == 0) {
    globfree(&files);
    std::cout << "No images found, exiting." << std::endl;
    return 0;
  }

  cv::Mat accumulated;

  // Create space for statistics
  cv::Mat stats;
  stats.create(1, files.gl_pathc, CV_64F);
  int nchan = 0;

  for (size_t f = 0; f < files.gl_pathc; f++) {
    cv::Mat image = cv::imread(files.gl_pathv[f], cv::IMREAD_UNCHANGED);
    if (!image.data) {
      std::cout << "Error reading file " << basename(files.gl_pathv[f])
                << std::endl;
      stats.col(f) = 1.0;  // mark as invalid
      continue;
    }

    cv::Scalar mean_scalar = cv::mean(image);
    double mean;
    switch (image.channels()) {
      default:  // mono case
        mean = mean_scalar.val[0];
        break;
      case 3:  // for color choose maximum channel
      case 4:
        mean = cv::max(mean_scalar[0], cv::max(mean_scalar[1], mean_scalar[2]));
        break;
    }
    // Scale to 0-1 range
    switch (image.depth()) {
      case CV_8U:
        mean /= 255.0;
        break;
      case CV_16U:
        mean /= 65535.0;
        break;
    }
    if (verbose)
      std::cout << "[" << f + 1 << "/" << files.gl_pathc << "] "
                << basename(files.gl_pathv[f]) << " " << mean << std::endl;

    stats.col(f) = mean;

    if (mean <= threshold) {
      if (accumulated.empty()) {
        image.copyTo(accumulated);
      } else {
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

  std::cout << "Minimum: " << min_mean << " maximum: " << max_mean
            << " mean: " << mean_mean << " median: " << median_mean
            << std::endl;

  // If we still don't have an image (no images below threshold), copy the
  // minimum mean image so we see why
  if (!stats_only) {
    if (accumulated.empty()) {
      std::cout << "No images below threshold, writing the minimum image only"
                << std::endl;
      accumulated = cv::imread(files.gl_pathv[min_loc.x], cv::IMREAD_UNCHANGED);
    }

    std::vector<int> compression_params;
    compression_params.push_back(cv::IMWRITE_PNG_COMPRESSION);
    compression_params.push_back(9);
    compression_params.push_back(cv::IMWRITE_JPEG_QUALITY);
    compression_params.push_back(95);

    cv::imwrite(outputfile, accumulated, compression_params);
  }
  globfree(&files);
  return 0;
}