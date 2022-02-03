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

using namespace cv;

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
int nchan = 0;
unsigned long nfiles = 0;
int s_len = 0;	// length in characters of nfiles, e.g. if nfiles == "1000", s_len = 4.

// Read a single file and return true on success and false on error.
// On success, set "mat".
bool read_file(struct config_t* cf, char* filename, cv::Mat* mat, int file_num, bool verbose)
{
	const int msg_size = 500;
	char msg[msg_size];

	if (verbose && cf->verbose > 1) {
		snprintf(msg, msg_size, "[%*d/%lu] %s", s_len, file_num, nfiles, filename);
	}

	*mat = cv::imread(filename, cv::IMREAD_UNCHANGED);
	if (! mat->data || mat->empty()) {
		if (cf->verbose) {
			stdio_mutex.lock();
			std::cout << "Error reading file " << filename << ": no data" << std::endl;
			stdio_mutex.unlock();
		}
		return(false);
	}

	if (verbose && cf->verbose > 1) {	// should be same verbose level as above
		stdio_mutex.lock();
		fprintf(stderr, "%s", msg);
		if (cf->verbose > 2)	// if printed, this is appended to the debug msg above
			fprintf(stderr, ", channels=%d", mat->channels());
		fprintf(stderr, "\n");
		stdio_mutex.unlock();
	}

	if (mat->cols == 0 || mat->rows == 0) {
		if (cf->verbose) {
			stdio_mutex.lock();
			fprintf(stderr, "%s image size %dx%d is invalid; ignoring\n", filename, mat->rows, mat->cols);
			stdio_mutex.unlock();
		}
		return(false);
	}
	if (cf->img_height && cf->img_width &&
		(mat->cols != cf->img_width || mat->rows != cf->img_height)) {
		if (cf->verbose) {
			stdio_mutex.lock();
			fprintf(stderr, "%s: image size %dx%d does not match expected size %dx%d; ignoring\n",
				filename, mat->rows, mat->cols, cf->img_width, cf->img_height);
			stdio_mutex.unlock();
		}
		return(false);
	}

	return(true);
}

void parse_args(int, char**, struct config_t*);
void usage_and_exit(int);
int get_font_by_name(char*);
void keogram_worker(int,				// thread num
					struct config_t*,	// config
					glob_t*,			// file list
					std::mutex*,		// mutex
					cv::Mat*,			// accumulated
					cv::Mat*,			// annotations
					cv::Mat*			// mask
);

// Keep track of number of digits in nfiles so file numbers will be consistent width.
char s_[10];

void keogram_worker(int thread_num,
					struct config_t* cf,
					glob_t* files,
					std::mutex* mtx,
					cv::Mat* acc,
					cv::Mat* ann,
					cv::Mat* mask) {
  int start_num, end_num, batch_size, prevHour = -1;
  cv::Mat thread_accumulator;

  batch_size = nfiles / cf->num_threads;
  start_num = thread_num * batch_size;
  thread_num++;	// so messages start at human-friendly thread 1, not 0.

  // last thread has more work to do if the number of images isn't multiple of
  // the number of threads
  if (thread_num == cf->num_threads)
		end_num = nfiles - 1;
  else
		end_num = start_num + batch_size - 1;

  if (cf->verbose > 2 && cf->num_threads > 1) {
		stdio_mutex.lock();
		fprintf(stderr, "thread %d/%d processing files %*d-%d (%d/%lu)\n",
		thread_num, cf->num_threads, s_len, start_num +1, end_num + 1,
		end_num - start_num + 1, nfiles);
		stdio_mutex.unlock();
  }

  for (int f = start_num; f <= end_num; f++) {
		char* filename = files->gl_pathv[f];
		cv::Mat imagesrc;
		if (! read_file(cf, filename, &imagesrc, f+1, true)) continue;

		if (imagesrc.channels() != nchan) {
			if (cf->verbose) {
				stdio_mutex.lock();
				fprintf(stderr, "%s: repairing channel mismatch: %d != %d\n", filename, imagesrc.channels(), nchan);
				stdio_mutex.unlock();
			}
			if (imagesrc.channels() < nchan)
				cv::cvtColor(imagesrc, imagesrc, cv::COLOR_GRAY2BGR, nchan);
			else if (imagesrc.channels() > nchan)
				cv::cvtColor(imagesrc, imagesrc, cv::COLOR_BGR2GRAY, nchan);
		}

		if (cf->rotation_angle) {
			cv::Point2f center((imagesrc.cols - 1) / 2.0, (imagesrc.rows - 1) / 2.0);
			cv::Mat rot = cv::getRotationMatrix2D(center, cf->rotation_angle, 1.0);
			cv::Rect2f bbox = cv::RotatedRect(cv::Point2f(), imagesrc.size(), cf->rotation_angle).boundingRect2f();
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
					if (((float)(cf->num_img_expand * nfiles) / imagesrc.cols) < 0.8) // minimal size 0.8 * imagesrc.cols 
						cf->num_img_expand++;
				}
				// channel_info ?
				if (cf->channel_info) {
					// create mask
					*mask = cv::Mat::zeros(imagesrc.size(), CV_8U);
					cv::circle(*mask, cv::Point(mask->cols/2, mask->rows/2), mask->rows/3, cv::Scalar(255, 255, 255), -1, 8, 0);
				}
				acc->create(imagesrc.rows, nfiles * cf->num_img_expand , imagesrc.type());
				if (cf->verbose > 2) {
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
			try {
				imagesrc.col(imagesrc.cols / 2).copyTo(acc->col(destCol+i));   //copy
			} catch (cv::Exception& ex) {
				fprintf(stderr, "WARNING: internal copy of '%s' failed; ignoring\n", filename);
				continue;
			}
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
				ft.tm_mday = t->tm_mday;
				ft.tm_mon = t->tm_mon +1;
				ft.tm_year = t->tm_year+1900;
			}

			// record the annotation
			if (ft.tm_hour != prevHour) {
				if (prevHour != -1) {
					mtx->lock();
					cv::Mat a = (cv::Mat_<int>(1, 5) << destCol, ft.tm_hour, ft.tm_year, ft.tm_mon, ft.tm_mday);
					ann->push_back(a);
					mtx->unlock();
				}
				prevHour = ft.tm_hour;
			}
		}

		if (cf->channel_info)
		{
			Scalar mean_scalar = cv::mean(imagesrc, *mask);
			Vec3b color;
			uchar color_mono;
			double mean;
			double mean_Sum;
			double mean_maxValue = 255.0/100.0;

			// Scale to 0-1 range
			switch (imagesrc.depth())
			{
				case CV_8U:
					mean_maxValue = 255.0/100.0;
					break;
				case CV_16U:
					mean_maxValue = 65535.0/100.0;
					break;
			}

	  	// background
			for (int i=0; i < cf->num_img_expand; i++) {
				switch (nchan)
				{
				case 1:
					line( *acc, Point(destCol+i,0), Point(destCol+i,100),  Scalar( 255 ), 1,  LINE_8 );
					break;
				
				default:
				  line( *acc, Point(destCol+i,0), Point(destCol+i,100),  Scalar( 255, 255, 255 ), 1,  LINE_8 );
					break;
				}
			}
			// grid
			color.val[0] = color.val[1] = color.val[2] = 127;
			color_mono = 127;
			for (int j=0; j <= 10; j++) {
				switch (nchan)
				{
				case 1:
					acc->at<uchar>(Point(destCol,100-10*j)) = color_mono;
					break;
				
				default:
				  acc->at<cv::Vec3b>(Point(destCol,100-10*j)) = color;
					break;
				}
			} 
			// values
			mean_Sum = 0;
			for (int channel=0; channel < imagesrc.channels(); channel++) {
				mean = mean_scalar[channel] / mean_maxValue;
				mean_Sum += mean;
				color.val[0] = color.val[1] = color.val[2] = 0;
				color.val[channel] = 255;
				color_mono = 255;
				for (int i=0; i < cf->num_img_expand; i++) {
					switch (nchan)
					{
					case 1:
						acc->at<uchar>(Point(destCol+i,100-mean)) = color_mono;
						break;
				
					default:
				  	acc->at<cv::Vec3b>(Point(destCol+i,100-mean)) = color;
						break;
					}
				}
			}
			mean_Sum = mean_Sum / std::min(3,imagesrc.channels());
			color.val[0] = color.val[1] = color.val[2] = 0;
			color_mono = 0;
			for (int i=0; i < cf->num_img_expand; i++) {
				switch (nchan)
				{
				case 1:
					acc->at<uchar>(Point(destCol+i,100-mean_Sum)) = color_mono;
					break;
			
				default:
			  	acc->at<cv::Vec3b>(Point(destCol+i,100-mean_Sum)) = color;
					break;
				}
			}
		}
  }
}

void annotate_image(cv::Mat* ann, cv::Mat* acc, struct config_t* cf) {
  int baseline = 0;
  char hour[3];

  if (cf->labels_enabled && !ann->empty())
  {
		for (int r = 0; r < ann->rows; r++)
 		{
			// Draw a dashed line and label for hour
			cv::LineIterator it(*acc, cv::Point(ann->at<int>(r, 0), 0), cv::Point(ann->at<int>(r, 0), acc->rows));
			for (int i = 0; i < it.count; i++, ++it)
			{
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
			cv::Size textSize = cv::getTextSize(text, cf->fontFace, cf->fontScale, cf->lineWidth, &baseline);

			if (ann->at<int>(r, 0) - textSize.width >= 0) {
				// black background
				cv::putText(*acc, text,
					cv::Point(ann->at<int>(r, 0) - textSize.width, 
					acc->rows - (textSize.height)),
					cf->fontFace, cf->fontScale,
					cv::Scalar(0, 0, 0), cf->lineWidth+2,
					cf->fontType);
				cv::putText(*acc, text,
					cv::Point(ann->at<int>(r, 0) - textSize.width,
					acc->rows - textSize.height),
					cf->fontFace, cf->fontScale,
					cv::Scalar(cf->b, cf->g, cf->r), cf->lineWidth,
					cf->fontType);
			}

			if (ann->at<int>(r, 1) == 0) {
				// Draw date
				char time_buf[256];
				snprintf(time_buf, 256, "%02d-%02d-%02d", ann->at<int>(r, 3), ann->at<int>(r, 4), ann->at<int>(r, 2));
				std::string text(time_buf);
				cv::Size textSize = cv::getTextSize(text, cf->fontFace, cf->fontScale, cf->lineWidth, &baseline);

				if (ann->at<int>(r, 0) - textSize.width >= 0) {
					// black background
					cv::putText(*acc, text,
						cv::Point(ann->at<int>(r, 0) - textSize.width, 
						acc->rows - (2.5 * textSize.height)),
						cf->fontFace, cf->fontScale,
						cv::Scalar(0, 0, 0), cf->lineWidth+2,
						cf->fontType);
					// Text
					cv::putText(*acc, text,
						cv::Point(ann->at<int>(r, 0) - textSize.width, 
						acc->rows - (2.5 * textSize.height)),
						cf->fontFace, cf->fontScale,
						cv::Scalar(cf->b, cf->g, cf->r), cf->lineWidth,
						cf->fontType);
				}
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
		{"fixed-channel-number", required_argument, 0, 'f'},
		{0, 0, 0, 0}};

		c = getopt_long(argc, argv, "d:e:o:r:s:L:C:N:S:T:Q:q:f:npvhxc", long_options, &option_index);
		if (c == -1)
			break;
		if (cf->verbose >= 3)
			fprintf(stderr, "Looking at [%c], optarg=[%s]\n", c, optarg);
		switch (c)
		{
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
				break;
			case 'c':
				cf->channel_info = true;
				break;
			case 'f':
				nchan = atoi(optarg);
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
				// Allow space- or comma-separated numbers, or hex numbers
				if (strchr(optarg, ' ') || strchr(optarg, ',')) {
					int r, g, b;
					if (strchr(optarg, ' '))
						sscanf(optarg, "%d %d %d", &b, &g, &r);
					else
						sscanf(optarg, "%d,%d,%d", &b, &g, &r);
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
				if (cf->lineWidth < 1) {
					cf->lineWidth = 1;
					fprintf(stderr, "font-line changed to 1 (=minimum)\n");
				}				
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
					fprintf(stderr, "invalid number of threads %d; using %d\n", tmp, cf->num_threads);
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
		}	// option switch
  	}		// getopt loop
}

void usage_and_exit(int x) {
  std::cout << "Usage:\tkeogram -d <imagedir> -e <ext> -o <outputfile> [<other_args>]" << std::endl;
  if (x)
	std::cout << KRED << "Source directory, image extension, and output file are required" << std::endl;

  std::cout << KNRM << std::endl;
  std::cout << "Arguments:" << std::endl;
  std::cout << "-d | --directory <str> : directory from which to load images (required)" << std::endl;
  std::cout << "-e | --extension <str> : image extension to process (required)" << std::endl;
  std::cout << "-o | --output-file <str> : name of output file (required)" << std::endl;
  std::cout << "-r | --rotate <float> : number of degrees to rotate image, counterclockwise (0)" << std::endl;
  std::cout << "-s | --image-size <int>x<int> : only process images of a given size, eg. 1280x960" << std::endl;
  std::cout << "-h | --help : display this help message" << std::endl;
  std::cout << "-v | --verbose : Increase logging verbosity" << std::endl;
  std::cout << "-n | --no-label : Disable hour labels" << std::endl;
  std::cout << "-C | --font-color <str> : label font color, in HTML format (0000ff)" << std::endl;
  std::cout << "-L | --font-line <int> : font line thickness (3), (min=1)" << std::endl;
  std::cout << "-N | --font-name <str> : font name (simplex)" << std::endl;
  std::cout << "-S | --font-size <float> : font size (2.0)" << std::endl;
  std::cout << "-T | --font-type <int> : font line type (1)" << std::endl;
  std::cout << "-Q | --max-threads <int> : limit maximum number of processing threads. (use all cpus)" << std::endl;
  std::cout << "-q | --nice-level <int> : nice(2) level of processing threads (10)" << std::endl;
  std::cout << "-x | --image-expand : expand image to get the proportions of source" << std::endl;
  std::cout << "-c | --channel-info : show channel infos - mean value of R/G/B" << std::endl;
  std::cout << "-f | --fixed-channel-number <int> : define number of channels 0=auto, 1=mono, 3=rgb (0=auto)" << std::endl;
  std::cout << "-p | --parse-filename : parse time using filename instead of stat(filename)" << std::endl;

  std::cout << KNRM << std::endl;
  std::cout << "Font name is one of these OpenCV font names:\n\tSimplex, Plain, "
	"Duplex, Complex, Triplex, ComplexSmall, ScriptSimplex, ScriptComplex" << std::endl;
  std::cout << "Font Type is an OpenCV line type: 0=antialias, 1=8-connected, 2=4-connected" << std::endl;
  std::cout << KNRM << std::endl;
  std::cout << "In some cases --font-line and --font-size can lead to annoying horizontal lines. Solution: try other values" << std::endl;
  std::cout << KNRM << std::endl;
  std::cout << "	ex: keogram --directory ../images/current/ --extension jpg --output-file keogram.jpg --font-size 2" << std::endl;
  std::cout << "	ex: keogram -d . -e png -o /home/pi/allsky/keogram.jpg -n" << KNRM << std::endl;
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
	std::cout << KRED << "Unknown font '" << s << "', using SIMPLEX " << KNRM << std::endl;
  return cv::FONT_HERSHEY_SIMPLEX;
}

int main(int argc, char* argv[]) {
	struct config_t config;
	int r;

	parse_args(argc, argv, &config);

	if (config.img_src_dir.empty() || config.img_src_ext.empty() || config.dst_keogram.empty())
		usage_and_exit(3);

	r = setpriority(PRIO_PROCESS, 0, config.nice_level);
	if (r) {
		config.nice_level = getpriority(PRIO_PROCESS, 0);
		fprintf(stderr, "unable to set nice level: %s\n", strerror(errno));
	}

	glob_t files;
	std::string wildcard = config.img_src_dir + "/*." + config.img_src_ext;
	glob(wildcard.c_str(), 0, NULL, &files);
	nfiles = files.gl_pathc;
	if (nfiles == 0) {
		globfree(&files);
		std::cout << "No images found, exiting." << std::endl;
		exit(1);
	}
	// Determine width of the number of files, e.g., "1234" is 4 characters wide.
	sprintf(s_, "%d", (int)files.gl_pathc);
	s_len = strlen(s_);

	std::mutex accumulated_mutex;
	cv::Mat accumulated;
	cv::Mat annotations;
	cv::Mat mask;
	annotations.create(0, 2, CV_32S);
	annotations = -1;

	// Set the global "nchan" variable to be the number of channels in the 1st file.
	// Any subsequent file with a different number of channels will be converted to
	// the first file's number.
	// Ditto for the width and height.
	// In both cases only set the variables if not specified on the command line.
	cv::Mat temp;
	const int sample_file_num = 0;
	char *sample_file = files.gl_pathv[sample_file_num];
	if (nchan == 0 || (config.img_width == 0 && config.img_height == 0)) {
		if (! read_file(&config, sample_file, &temp, sample_file_num+1, false)) {
			fprintf(stderr, "Unable to read first file (%s); quitting\n", sample_file);
			exit(1);
		}
		if (config.verbose > 1) {
			fprintf(stderr, "Getting nchan and/or size from: '%s'\n", sample_file);
		}
	}
	if (nchan == 0)
	{
		nchan = temp.channels();
		if (config.verbose > 1) {
			fprintf(stderr, "     nchan = %d\n", nchan);
		}
	}
	// Set the width and height based on the same file if not specified on the command line.
	if (config.img_width == 0 && config.img_height == 0) {
		config.img_width = temp.cols;
		config.img_height = temp.rows;
		if (config.verbose > 1) {
			fprintf(stderr, "     size = %d x %d\n", config.img_width, config.img_height);
		}
	}

	std::vector<std::thread> threadpool;
	for (int tid = 0; tid < config.num_threads; tid++)
		threadpool.push_back(std::thread(keogram_worker, tid, &config, &files,
										 &accumulated_mutex, &accumulated,
										 &annotations, &mask));

	for (auto& t : threadpool)
		t.join();

	if (config.labels_enabled)
		annotate_image(&annotations, &accumulated, &config);
	globfree(&files);

	// If the destination doesn't have an extension, use config.img_src_ext.
	// We assume that anything after the "." is an extension.
	// If not, imwrite() below will crash.
	std::string ext = "";
	const char* e = strrchr(config.dst_keogram.c_str(), '.');
	if (e != NULL) {
		ext = ++e;
	} else {
		ext = config.img_src_ext;
		config.dst_keogram += "." + ext;
	}

	std::vector<int> compression_params;
	if (ext == "png") {
		compression_params.push_back(cv::IMWRITE_PNG_COMPRESSION);
		compression_params.push_back(9);
	} else if (ext == "jpg") {
		compression_params.push_back(cv::IMWRITE_JPEG_QUALITY);
		compression_params.push_back(95);
	}

	bool result = false;
	try {
		result = cv::imwrite(config.dst_keogram, accumulated, compression_params);
	} catch (cv::Exception& ex) {
		fprintf(stderr, "ERROR: could not save keogram file: %s\n", ex.what());
		exit(2);
	}
	if (! result) {
		fprintf(stderr, "ERROR: could not save Keogram file: %s\n", strerror(errno));
		exit(2);
	}

	exit(0);
}
