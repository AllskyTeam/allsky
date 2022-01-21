// Simple startrails composition program using OpenCV
// Copyright 2018 Jarno Paananen <jarno.paananen@gmail.com>
// Based on script by Thomas Jacquin
// SPDX-License-Identifier: MIT

using namespace std;

#include <getopt.h>
#include <glob.h>
#include <sys/resource.h>
#include <sys/time.h>
#include <unistd.h>
#include <algorithm>
#include <cstdlib>
#include <iostream>
#include <mutex>
#include <string>
#include <thread>
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
  std::string img_src_dir, img_src_ext, dst_startrails;
  bool startrails_enabled;
  int num_threads;
  int nice_level;
  int img_width;
  int img_height;
  int verbose;
  double brightness_limit;
} config;

std::mutex stdio_mutex;

void parse_args(int, char**, struct config_t*);
void usage_and_exit(int);
void startrail_worker(int,               // thread num
                      struct config_t*,  // config
                      glob_t*,           // file list
                      std::mutex*,       // mutex
                      cv::Mat*,          // statistics
                      cv::Mat*           // accumulated
);

void startrail_worker(int thread_num,
                      struct config_t* cf,
                      glob_t* files,
                      std::mutex* mtx,
                      cv::Mat* stats_ptr,
                      cv::Mat* main_accumulator) {
  int start_num, end_num, batch_size, nchan = 3; // first maybe overexposed images (mono !) making problems
  unsigned long nfiles = files->gl_pathc;
  cv::Mat thread_accumulator;

  batch_size = nfiles / cf->num_threads;
  start_num = thread_num * batch_size;

  // last thread has more work to do if the number of images isn't multiple of
  // the number of threads
  if ((thread_num + 1) == cf->num_threads)
    end_num = nfiles - 1;
  else
    end_num = start_num + batch_size - 1;

  if (cf->verbose > 1) {
    stdio_mutex.lock();
    fprintf(stderr, "thread %d/%d processing files %d-%d (%d/%lu)\n",
            thread_num + 1, cf->num_threads, start_num, end_num,
            end_num - start_num + 1, nfiles);
    stdio_mutex.unlock();
  }

  for (int f = start_num; f <= end_num; f++) {
    char* filename = files->gl_pathv[f];
    cv::Mat image = cv::imread(filename, cv::IMREAD_UNCHANGED);
    filename = basename(filename);
    if (!image.data) {
      stdio_mutex.lock();
      fprintf(stderr, "Error reading file %s\n", filename);
      stdio_mutex.unlock();
      continue;
    }

    if (cf->img_height && cf->img_width &&
        (image.cols != cf->img_width || image.rows != cf->img_height)) {
      if (cf->verbose) {
        stdio_mutex.lock();
        fprintf(stderr, "skip %s size %dx%d != %dx%d\n", filename, image.cols,
                image.cols, cf->img_width, cf->img_height);
        stdio_mutex.unlock();
      }
      continue;
    }

    // first valid image sets the number of channels we expect
    if (nchan == 0 && image.channels())
      nchan = image.channels();

    cv::Scalar mean_scalar = cv::mean(image);
    double image_mean;
    switch (image.channels()) {
      default:  // mono case
        image_mean = mean_scalar.val[0];
        break;
      case 3:  // for color choose maximum channel
      case 4:
        image_mean =
            cv::max(mean_scalar[0], cv::max(mean_scalar[1], mean_scalar[2]));
        break;
    }
    // Scale to 0-1 range
    switch (image.depth()) {
      case CV_8U:
        image_mean /= 255.0;
        break;
      case CV_16U:
        image_mean /= 65535.0;
        break;
    }
    if (cf->verbose > 1) {
      stdio_mutex.lock();
      fprintf(stderr, "[%d/%lu] %s %.3f\n", f + 1, nfiles, filename,
              image_mean);
      stdio_mutex.unlock();
    }

    // the matrix pointed to by stats_ptr has already been initialized to NAN
    // so we just update the entry once the image is successfully loaded
    stats_ptr->col(f) = image_mean;

    if (cf->startrails_enabled && image_mean <= cf->brightness_limit) {
      if (image.channels() != nchan) {
        if (cf->verbose) {
          stdio_mutex.lock();
          fprintf(stderr, "repairing channel mismatch: %d != %d\n",
                  image.channels(), nchan);
          stdio_mutex.unlock();
        }
        if (image.channels() < nchan)
          cv::cvtColor(image, image, cv::COLOR_GRAY2BGR, nchan);
        else if (image.channels() > nchan)
          cv::cvtColor(image, image, cv::COLOR_BGR2GRAY, nchan);
      }
      if (thread_accumulator.empty()) {
        image.copyTo(thread_accumulator);
      } else {
        thread_accumulator = cv::max(thread_accumulator, image);
      }
    }
  }

  if (cf->startrails_enabled) {
    // skip unlucky threads that might have got only bad images
    if (!thread_accumulator.empty()) {
      mtx->lock();
      if (main_accumulator->empty()) {
        thread_accumulator.copyTo(*main_accumulator);
      } else {
        *main_accumulator = cv::max(thread_accumulator, *main_accumulator);
      }
      mtx->unlock();
    }
  }
}

void parse_args(int argc, char** argv, struct config_t* cf) {
  int c, tmp, ncpu = std::thread::hardware_concurrency();
  cf->verbose = 0;
  cf->startrails_enabled = true;
  cf->img_height = cf->img_width = 0;
  cf->brightness_limit = 0.35;  // not terrible in the city
  cf->nice_level = 10;
  cf->num_threads = ncpu;

  while (1) {  // getopt loop
    int option_index = 0;
    static struct option long_options[] = {
        {"brightness", required_argument, 0, 'b'},
        {"directory", required_argument, 0, 'd'},
        {"extension", required_argument, 0, 'e'},
        {"max-threads", required_argument, 0, 'Q'},
        {"nice-level", required_argument, 0, 'q'},
        {"output", required_argument, 0, 'o'},
        {"image-size", required_argument, 0, 's'},
        {"statistics", no_argument, 0, 'S'},
        {"verbose", no_argument, 0, 'v'},
        {"help", no_argument, 0, 'h'},
        {0, 0, 0, 0}};

    c = getopt_long(argc, argv, "hvSb:d:e:Q:q:o:s:", long_options,
                    &option_index);
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
      case 'Q':
        tmp = atoi(optarg);
        if ((tmp >= 1) && (tmp <= ncpu))
          cf->num_threads = tmp;
        else
          fprintf(stderr, "invalid number of threads %d; using %d\n", tmp,
                  cf->num_threads);
        break;
      case 'q':
        tmp = atoi(optarg);
        if (PRIO_MIN > tmp) {
          tmp = PRIO_MIN;
          fprintf(stderr, "clamping scheduler priority to PRIO_MIN\n");
        } else if (PRIO_MAX < tmp) {
          fprintf(stderr, "clamping scheduler priority to PRIO_MAX\n");
          tmp = PRIO_MAX;
        }
        cf->nice_level = atoi(optarg);
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
               "<output> | -S] [-s <WxH>] [-Q <max-threads>] [-q <nice>]"
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
  std::cout << "-Q | --max-threads <int> : limit maximum number of processing "
               "threads. (unspecified = use all cpus)"
            << std::endl;
  std::cout << "-q | --nice <int> : nice(2) level of processing threads (10)"
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
  int r;
  struct config_t config;
  int i;
  char* e;

  parse_args(argc, argv, &config);

  if (config.img_src_dir.empty() || config.img_src_ext.empty())
    usage_and_exit(3);

  if (config.startrails_enabled) {
    std::string extcheck = config.dst_startrails;
    std::transform(extcheck.begin(), extcheck.end(), extcheck.begin(),
                   [](unsigned char c) { return std::tolower(c); });

    if (extcheck.rfind(".png") == string::npos &&
        extcheck.rfind(".jpg") == string::npos) {
      fprintf(stderr,
              KRED "Output file '%s' is missing extension (.jpg or .png)\n\n",
              config.dst_startrails.c_str());
      usage_and_exit(3);
    }
  } else {
    config.brightness_limit = 0;
    config.dst_startrails = "/dev/null";
  }

  if (!config.dst_startrails.empty() && config.brightness_limit < 0)
    usage_and_exit(3);

  r = setpriority(PRIO_PROCESS, 0, config.nice_level);
  if (r) {
    config.nice_level = getpriority(PRIO_PROCESS, 0);
    fprintf(stderr, "unable to set nice level: %s\n", strerror(errno));
  }

  // Find files
  glob_t files;
  std::string wildcard = config.img_src_dir + "/*." + config.img_src_ext;
  glob(wildcard.c_str(), 0, NULL, &files);
  if (files.gl_pathc == 0) {
    globfree(&files);
    std::cout << "No images found, exiting." << std::endl;
    return 0;
  }

  std::mutex accumulated_mutex;
  cv::Mat accumulated;
  cv::Mat stats;
  stats.create(1, files.gl_pathc, CV_64F);
  // initialize stats to NAN because some images might legitimately be 100%
  // brightness if they're massively overexposed. They should be counted in
  // the summary statistics. It is not entirely accurate to signal invalid
  // images with 1.0 brightness since no image data was read.
  stats = NAN;

  std::vector<std::thread> threadpool;
  for (int tid = 0; tid < config.num_threads; tid++)
    threadpool.push_back(std::thread(startrail_worker, tid, &config, &files,
                                     &accumulated_mutex, &stats, &accumulated));

  for (auto& t : threadpool)
    t.join();

  // Calculate some descriptive statistics
  double ds_min, ds_max, ds_mean, ds_median;
  cv::Point min_loc;

  // Each thread will have updated stats with the brightness of the images
  // that were successfully processed. Invalid images will be left as NAN.
  // In OpenCV, NAN is unequal to everything including NAN which means we can
  // filter out bogus entries by checking stats for element-wise equality
  // with itself.
  cv::Mat nan_mask = cv::Mat(stats == stats);
  cv::Mat filtered_stats;
  stats.copyTo(filtered_stats, nan_mask);
  cv::minMaxLoc(stats, &ds_min, &ds_max, &min_loc);
  ds_mean = cv::mean(filtered_stats)[0];

  // For median, do partial sort and take middle value
  std::vector<double> vec;
  filtered_stats.copyTo(vec);
  std::nth_element(vec.begin(), vec.begin() + (vec.size() / 2), vec.end());
  ds_median = vec[vec.size() / 2];

  std::cout << "Minimum: " << ds_min << " maximum: " << ds_max
            << " mean: " << ds_mean << " median: " << ds_median << std::endl;

  // If we still don't have an image (no images below threshold), copy the
  // minimum mean image so we see why
  if (config.startrails_enabled) {
    if (accumulated.empty()) {
      fprintf(
          stderr,
          "No images below threshold %.3f, writing the minimum image only\n",
          config.brightness_limit);
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
