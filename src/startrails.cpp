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

struct config_t {
  std::string img_src_dir, img_src_ext, dst_startrails;
  bool startrails_enabled;
  int img_width;
  int img_height;
  int verbose;
  double brightness_limit;
} config;

void parse_args(int, char**, struct config_t*);
void usage_and_exit(int);

//-------------------------------------------------------------------------------------------------------
//-------------------------------------------------------------------------------------------------------
void parse_args(int argc, char** argv, struct config_t* cf) {
  int c;
  cf->verbose = 0;
  cf->startrails_enabled = true;
  cf->img_height = cf->img_width = 0;
  cf->brightness_limit = 0.35;  // not terrible in the city

  while (1) {  // getopt loop
    int option_index = 0;
    static struct option long_options[] = {
        {"brightness", optional_argument, 0, 'b'},
        {"directory", required_argument, 0, 'd'},
        {"extension", required_argument, 0, 'e'},
        {"output", required_argument, 0, 'o'},
        {"image-size", required_argument, 0, 's'},
        {"statistics", no_argument, 0, 'S'},
        {"verbose", no_argument, 0, 'v'},
        {"help", no_argument, 0, 'h'},
        {0, 0, 0, 0}};

    c = getopt_long(argc, argv, "hvsd:e:o:s:", long_options, &option_index);
    if (c == -1)
      break;
    switch (c) {  // option switch
      case 'h':
        usage_and_exit(0);
        // NOTREACHED
        break;
      case 'v':
        cf->verbose++;
        break;
      case 'S':
        cf->startrails_enabled = false;
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
      case 'b':
        double b;
        b = atof(optarg);
        if (b >= 0 && b <= 1.0)
          cf->brightness_limit = b;
        break;
      case 'd':
        cf->img_src_dir = optarg;
        break;
      case 'e':
        cf->img_src_ext = optarg;
        break;
      case 'o':
        cf->dst_startrails = optarg;
        break;
      default:
        break;
    }  // option switch
  }    // getopt loop
}

void usage_and_exit(int x) {
  std::cout << "Usage: startrails [-v] -d <dir> -e <ext> [-b <brightness> -o "
               "<output> -s <size> | -S]"
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
  std::cout << "-h | --help : display this help, then exit" << std::endl;
  std::cout << "-v | --verbose : increase log verbosity" << std::endl;
  std::cout << "-S | --statistics : print image directory statistics without "
               "producing image."
            << std::endl;
  std::cout << "-d | --directory <str> : directory from which to read images"
            << std::endl;
  std::cout << "-e | --extension <str> : filter images to just this extension"
            << std::endl;
  std::cout << "-o | --output-file <str> : output image filename" << std::endl;
  std::cout << "-s | --image-size <int>x<int> : restrict processed images to "
               "this size"
            << std::endl;
  std::cout << "-b | --brightness-limit <float> : ranges from 0 (black) to 1 "
               "(white). Default 0.35"
            << std::endl;
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
  struct config_t config;
  int i;
  char* e;

  parse_args(argc, argv, &config);

  if (config.verbose < 1)
    if ((e = getenv("ALLSKY_DEBUG_LEVEL")))
      if ((i = atoi(e)) > 0)
        config.verbose = i;

  if (config.img_src_dir.empty() || config.img_src_ext.empty())
    usage_and_exit(3);

  if (!config.startrails_enabled) {
    config.brightness_limit = 0;
    config.dst_startrails = "/dev/null";
  }

  if (!config.dst_startrails.empty() && config.brightness_limit < 0)
    usage_and_exit(3);

  // Find files
  glob_t files;
  std::string wildcard = config.img_src_dir + "/*." + config.img_src_ext;
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
      if (config.verbose)
        fprintf(stderr, "Error reading file %s\n", basename(files.gl_pathv[f]));
      stats.col(f) = 1.0;  // mark as invalid
      continue;
    }

    if (config.img_height && config.img_width &&
        (image.cols != config.img_width || image.rows != config.img_height)) {
      if (config.verbose)
        fprintf(stderr, "skipped %s - got size %dx%d, want %dx%d\n",
                files.gl_pathv[f], image.cols, image.cols, config.img_width,
                config.img_height);
      continue;
    }

    // first valid image sets the number of channels we expect
    if (nchan == 0 && image.channels())
      nchan = image.channels();

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
    if (config.verbose > 1)
      std::cout << "[" << f + 1 << "/" << files.gl_pathc << "] "
                << basename(files.gl_pathv[f]) << " " << mean << std::endl;

    stats.col(f) = mean;

    if (config.startrails_enabled && mean <= config.brightness_limit) {
      if (image.channels() != nchan) {
        if (config.verbose)
          fprintf(stderr, "repairing %s channel mismatch: got %d, want %d\n",
                  files.gl_pathv[f], image.channels(), nchan);
        if (image.channels() < nchan)
          cv::cvtColor(image, image, cv::COLOR_GRAY2BGR, nchan);
        else if (image.channels() > nchan)
          cv::cvtColor(image, image, cv::COLOR_BGR2GRAY, nchan);
      }
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
  if (config.startrails_enabled) {
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

    cv::imwrite(config.dst_startrails, accumulated, compression_params);
  }
  globfree(&files);
  return 0;
}
