// Simple keogram composition program using OpenCV
// Copyright 2018 Jarno Paananen <jarno.paananen@gmail.com>
// Based on a script by Thomas Jacquin
// Rotation added by Agustin Nunez @agnunez
// SPDX-License-Identifier: MIT

using namespace std;

#include <getopt.h>
#include <glob.h>
#include <stdio.h>
#include <sys/resource.h>
#include <sys/stat.h>
#include <sys/time.h>
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
  std::string img_src_dir, img_src_ext, dst_keogram;
  bool labels_enabled, keogram_enabled, parse_filename, junk, img_expand, channel_info;
  int img_width;
  int img_height;
  int fontFace;
  int fontType;
  int lineWidth;
  int verbose;
  int num_threads;
  int nice_level;
  int num_img_expand;
  uint8_t a, r, g, b;
  double fontScale;
  double rotation_angle;
  double brightness_limit;
} config;

std::mutex stdio_mutex;

void parse_args(int, char**, struct config_t*);
void usage_and_exit(int);
int get_font_by_name(char*);
void keogram_worker(int,               // thread num
                    struct config_t*,  // config
                    glob_t*,           // file list
                    std::mutex*,       // mutex
                    cv::Mat*,          // accumulated
                    cv::Mat*           // annotations
);

void keogram_worker(int thread_num,
                    struct config_t* cf,
                    glob_t* files,
                    std::mutex* mtx,
                    cv::Mat* acc,
                    cv::Mat* ann) {
  int start_num, end_num, batch_size, prevHour = -1, nchan = 0;
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
    if (cf->verbose > 1) {
      stdio_mutex.lock();
      fprintf(stderr, "[%d/%lu] %s\n", f + 1, nfiles, filename);
      stdio_mutex.unlock();
    }

    cv::Mat imagesrc = cv::imread(filename, cv::IMREAD_UNCHANGED);
    if (!imagesrc.data) {
      if (cf->verbose) {
        stdio_mutex.lock();
        std::cout << "Error reading file " << filename << std::endl;
        stdio_mutex.unlock();
      }
      continue;
    }

    if (cf->img_height && cf->img_width &&
        (imagesrc.cols != cf->img_width || imagesrc.rows != cf->img_height)) {
      if (cf->verbose) {
        stdio_mutex.lock();
        fprintf(stderr,
                "%s image size %dx%d does not match expected size %dx%d\n",
                filename, imagesrc.cols, imagesrc.cols, cf->img_width,
                cf->img_height);
        stdio_mutex.unlock();
      }
      continue;
    }

    if (nchan == 0)
      nchan = imagesrc.channels();

    if (imagesrc.channels() != nchan) {
      if (cf->verbose) {
        stdio_mutex.lock();
        fprintf(stderr, "repairing channel mismatch: %d != %d\n",
                imagesrc.channels(), nchan);
        stdio_mutex.unlock();
      }
      if (imagesrc.channels() < nchan)
        cv::cvtColor(imagesrc, imagesrc, cv::COLOR_GRAY2BGR, nchan);
      else if (imagesrc.channels() > nchan)
        cv::cvtColor(imagesrc, imagesrc, cv::COLOR_BGR2GRAY, nchan);
    }

    if (cf->rotation_angle) {
      if (cf->verbose > 1) {
        stdio_mutex.lock();
        fprintf(stderr, "rotating image by %.2f\n", cf->rotation_angle);
        stdio_mutex.unlock();
      }
      cv::Point2f center((imagesrc.cols - 1) / 2.0, (imagesrc.rows - 1) / 2.0);
      cv::Mat rot = cv::getRotationMatrix2D(center, cf->rotation_angle, 1.0);
      cv::Rect2f bbox =
          cv::RotatedRect(cv::Point2f(), imagesrc.size(), cf->rotation_angle)
              .boundingRect2f();
      rot.at<double>(0, 2) += bbox.width / 2.0 - imagesrc.cols / 2.0;
      rot.at<double>(1, 2) += bbox.height / 2.0 - imagesrc.rows / 2.0;
      // cv::Mat imagedst;
      // cv::warpAffine(imagesrc, imagedst, rot, bbox.size());
      cv::warpAffine(imagesrc, imagesrc, rot, bbox.size());
    }

    /* This seemingly redundant check saves a bunch of locking and unlocking
    later. Maybe all the threads will see the accumlator as empty, so they will
    all try grab the lock...

    The winner of that race initializes the accumulator with its image, and
    releases the lock. The rest of the threads will - in turn - get the lock,
    and on checking the accumulator again, find it no longer in need of
    initialization, so they skip the .create().

    Future iterations will all see that the accumulator is non-empty.
    */
    if (acc->empty()) {
      mtx->lock();
      if (acc->empty()) {
        // expand ?
        if (cf->img_expand) {
          cf->num_img_expand = std::max(1, (int) (imagesrc.cols / (float) nfiles));
        }
        acc->create(imagesrc.rows, nfiles * cf->num_img_expand , imagesrc.type());
        if (cf->verbose > 1) {
          stdio_mutex.lock();
          fprintf(stderr, "thread %d initialized accumulator\n", thread_num);
          stdio_mutex.unlock();
        }
      }
      mtx->unlock();
    }

    // Copy middle column to destination
    // locking not required - we have absolute index into the accumulator
    int destCol = f * cf->num_img_expand;
    for (int i=0; i < cf->num_img_expand; i++) {
      imagesrc.col(imagesrc.cols / 2).copyTo(acc->col(destCol+i));   //copy
    }

    if (cf->labels_enabled) {
      struct tm ft;  // the time of the file, by any means necessary
      if (cf->parse_filename) {
        // engage your safety squints!
        char* s;
        s = strrchr(filename, '-');
        s++;
        sscanf(s, "%04d%02d%02d%02d%02d%02d.%*s", &ft.tm_year, &ft.tm_mon,
               &ft.tm_mday, &ft.tm_hour, &ft.tm_min, &ft.tm_sec);
      } else {
        // sometimes you can believe the file time on disk
        struct stat s;
        stat(filename, &s);
        struct tm* t = localtime(&s.st_mtime);
        ft.tm_hour = t->tm_hour;
      }

      // record the annotation
      if (ft.tm_hour != prevHour) {
        if (prevHour != -1) {
          mtx->lock();
          cv::Mat a = (cv::Mat_<int>(1, 2) << destCol, ft.tm_hour);
          ann->push_back(a);
          mtx->unlock();
        }
        prevHour = ft.tm_hour;
      }
    }
  }
}

void annotate_image(cv::Mat* ann, cv::Mat* acc, struct config_t* cf) {
  int baseline = 0;
  char hour[3];

  if (cf->labels_enabled && !ann->empty()) {
    for (int r = 0; r < ann->rows; r++) {
      // Draw a dashed line and label for hour
      cv::LineIterator it(*acc, cv::Point(ann->at<int>(r, 0), 0),
                          cv::Point(ann->at<int>(r, 0), acc->rows));
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
      snprintf(hour, 3, "%02d", ann->at<int>(r, 1));
      std::string text(hour);
      cv::Size textSize = cv::getTextSize(text, cf->fontFace, cf->fontScale,
                                          cf->lineWidth, &baseline);

      if (ann->at<int>(r, 0) - textSize.width >= 0) {
        cv::putText(*acc, text,
                    cv::Point(ann->at<int>(r, 0) - textSize.width,
                              acc->rows - textSize.height),
                    cf->fontFace, cf->fontScale,
                    cv::Scalar(cf->b, cf->g, cf->r), cf->lineWidth,
                    cf->fontType);
      }
    }
  }
}

void parse_args(int argc, char** argv, struct config_t* cf) {
  int c, tmp, ncpu = std::thread::hardware_concurrency();

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
  cf->num_threads = ncpu;
  cf->nice_level = 10;
  cf->img_expand = false;
  cf->num_img_expand = 1;
  cf->channel_info = false;

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
        {"max-threads", required_argument, 0, 'Q'},
        {"nice-level", required_argument, 0, 'q'},
        {"parse-filename", no_argument, 0, 'p'},
        {"no-label", no_argument, 0, 'n'},
        {"verbose", no_argument, 0, 'v'},
        {"help", no_argument, 0, 'h'},
        {"image-expand", no_argument, 0, 'x'},
        {"channel-info", no_argument, 0, 'c'},
        {0, 0, 0, 0}};

    c = getopt_long(argc, argv, "d:e:o:r:s:C:L:N:S:T:Q:q:npvhxc", long_options,
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
      case 'x':
        cf->img_expand = true;
      case 'c':
        cf->channel_info = true;
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
  std::cout << "-Q | --max-threads <int> : limit maximum number of processing "
               "threads. (use all cpus)"
            << std::endl;
  std::cout
      << "-q | --nice-level <int> : nice(2) level of processing threads (10)"
      << std::endl;

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
  int i, r;
  char* e;

  parse_args(argc, argv, &config);

  if (config.verbose < 1)
    if ((e = getenv("ALLSKY_DEBUG_LEVEL")))
      if ((i = atoi(e)) > 0)
        config.verbose = i;

  if (config.img_src_dir.empty() || config.img_src_ext.empty() ||
      config.dst_keogram.empty())
    usage_and_exit(3);

  r = setpriority(PRIO_PROCESS, 0, config.nice_level);
  if (r) {
    config.nice_level = getpriority(PRIO_PROCESS, 0);
    fprintf(stderr, "unable to set nice level: %s\n", strerror(errno));
  }

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
  cv::Mat annotations;
  annotations.create(0, 2, CV_32S);
  annotations = -1;

  std::vector<std::thread> threadpool;
  for (int tid = 0; tid < config.num_threads; tid++)
    threadpool.push_back(std::thread(keogram_worker, tid, &config, &files,
                                     &accumulated_mutex, &accumulated,
                                     &annotations));

  for (auto& t : threadpool)
    t.join();

  if (config.labels_enabled)
    annotate_image(&annotations, &accumulated, &config);
  globfree(&files);

  std::vector<int> compression_params;
  compression_params.push_back(cv::IMWRITE_PNG_COMPRESSION);
  compression_params.push_back(9);
  compression_params.push_back(cv::IMWRITE_JPEG_QUALITY);
  compression_params.push_back(95);

  cv::imwrite(config.dst_keogram, accumulated, compression_params);
}
