// Simple startrails composition program using OpenCV
// Copyright 2018 Jarno Paananen <jarno.paananen@gmail.com>
// Based on script by Thomas Jacquin
// SPDX-License-Identifier: MIT

// These tell the invoker to not try again with these images
// since the next command will have the same problem.
#define EXIT_PARTIAL_OK		90		// Must match what's in variables.sh.
#define NO_IMAGES			98
#define BAD_SAMPLE_FILE		99

using namespace std;

#include <getopt.h>
#include <glob.h>
#include <sys/resource.h>
#include <sys/time.h>
#include <sys/stat.h>
#include <unistd.h>
#include <algorithm>
#include <cstdlib>
#include <iostream>
#include <fstream>
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
	std::string img_src_dir;
	std::string img_src_ext;
	std::string images;				// List of images to process.  May also contain the mean brightness.
	std::string dst_startrails;
	std::string output_data_file;	// where per-image data goes
	bool startrails_enabled;
	int num_threads;
	int nice_level;
	int img_width;
	int img_height;
	int verbose;
	double brightness_limit;
} config;

std::mutex stdio_mutex;
int nchan = 0;
unsigned long nfiles = 0;
int s_len = 0;	// length in characters of nfiles, e.g. if nfiles == "1000", s_len = 4.
const char *ME = "";
int numImagesUsed = 0;
FILE *dataIO = stderr;

// Read a single file and return true on success and false on error.
// On success, set "mat".
bool read_file(
		struct config_t* cf,
		char* filename,
		cv::Mat* mat,
		int file_num,
		char *msg,
		int msg_size)
{
	if (msg_size > 0) {
		snprintf(msg, msg_size, "%s\t[%*d/%lu]", filename, s_len, file_num, nfiles);
	}

	// cv::imread() gives a terrible message when it can't read the file,
	// so check outselves.
	struct stat sb;
	if (stat(filename, &sb) == -1 || sb.st_size == 0) {
		if (msg_size > 0) {
			if (sb.st_size == 0) {
				snprintf(msg, msg_size,  "ERROR: '%s' is empty.", filename);
			} else {
				snprintf(msg, msg_size,  "ERROR reading '%s': %s.", filename, strerror(errno));
			}
		}
		return(false);
	}

	*mat = cv::imread(filename, cv::IMREAD_UNCHANGED);
	if (! mat->data || mat->empty()) {
		if (msg_size > 0) {
			if (! mat->data) {
				snprintf(msg, msg_size,  "ERROR: '%s' is corrupted.", filename);
			} else {
				snprintf(msg, msg_size,  "ERROR: no data in '%s'.", filename);
			}
		}
		return(false);
	}

	if (mat->cols == 0 || mat->rows == 0) {
		if (msg_size > 0) {
			snprintf(msg, msg_size, "WARNING: '%s' has invalid image size %dx%d; ignoring file.",
				filename, mat->cols, mat->rows);
		}
		return(false);
	}

	if (cf->img_height && cf->img_width &&
		(mat->cols != cf->img_width || mat->rows != cf->img_height)) {
		if (msg_size > 0) {
// TODO: Convert image to expected size
			snprintf(msg, msg_size, "WARNING: '%s' image size %dx%d does not match expected size %dx%d; ignoring file.\n",
				filename, mat->cols, mat->rows, cf->img_width, cf->img_height);
		}
		return(false);
	}

	if (msg_size > 0) {
		char m[100];
		snprintf(m, sizeof(m)-1, "\tchannels=%d", mat->channels());
		strcat(msg, m);
	}

	return(true);
}

void parse_args(int, char**, struct config_t*);
void usage_and_exit(int);

// Keep track of number of digits in nfiles so file numbers will be consistent width.
char s_[10];

void output_msg(char *msg)
{
	stdio_mutex.lock();
	fprintf(dataIO, "%s\n", msg);
	stdio_mutex.unlock();
}

void startrail_worker(
		int thread_num,				// thread num
		struct config_t* cf,		// config
		glob_t* files,				// file list
		std::mutex* mtx,			// mutex
		cv::Mat* stats_ptr,			// statistics
		cv::Mat* main_accumulator)	// accumulated
{
	int start_num, end_num, batch_size;
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

	const int msg_size = 500;
	char msg[msg_size];
	const int repair_msg_size = 500;
	char repair_msg[repair_msg_size];

	for (int f = start_num; f <= end_num; f++) {
		double image_mean = -1;		// an impossible value
		char *filename = files->gl_pathv[f];
		char *p = std::strstr(filename, "	");		// tab
		if (p != nullptr) {
			// Before the tab is the filename, after the tab is the mean.
			*p = '\0';
			image_mean = atof(++p);
		}

		cv::Mat imagesrc;
		msg[0] = '\0';
		bool doMsg = (cf->verbose || cf->output_data_file != "");
		if (! read_file(cf, filename, &imagesrc, f+1, msg, doMsg ? msg_size : 0)) {
			// msg contains the error message.
			stats_ptr->col(f) = -1.0;	// Set to something to avoid "nan" entries.
			if (*msg != '\0' && doMsg) {
				output_msg(msg);
			}
			continue;
		}

		repair_msg[0] = '\0';
		if (imagesrc.channels() != nchan) {
			if (cf->verbose) {
				snprintf(repair_msg, repair_msg_size, "%s: repairing channel mismatch from %d to %d\n",
					filename, imagesrc.channels(), nchan);
			}
			if (imagesrc.channels() < nchan)
				cv::cvtColor(imagesrc, imagesrc, cv::COLOR_GRAY2BGR, nchan);
			else	// imagesrc.channels() > nchan
				cv::cvtColor(imagesrc, imagesrc, cv::COLOR_BGR2GRAY, nchan);
		}

		if (image_mean == -1) {
			// Don't recalculate the mean.
			cv::Scalar mean_scalar = cv::mean(imagesrc);
			switch (imagesrc.channels()) {
				default:	// mono case
					image_mean = mean_scalar.val[0];
					break;
				case 3:		// for color choose maximum channel
				case 4:
					image_mean = cv::max(mean_scalar[0], cv::max(mean_scalar[1], mean_scalar[2]));
				break;
			}
			// Scale to 0-1 range
			switch (imagesrc.depth()) {
				case CV_8U:
					image_mean /= 255.0;
					break;
				case CV_16U:
					image_mean /= 65535.0;
					break;
			}
		}
		if (cf->verbose > 1 || cf->output_data_file != "") {
			// tab-separate fields for easier parsing.
			char temp[100];
			snprintf(temp, 100, "\tmean=%.3f", image_mean);
			strcat(msg, temp);
		}

		// Want to print the message above before this one.
		if (repair_msg[0] != '\0' && cf->verbose) {
			output_msg(repair_msg);
		}

		// the matrix pointed to by stats_ptr has already been initialized to NAN
		// so we just update the entry once the image is successfully loaded
		stats_ptr->col(f) = image_mean;

		if (cf->startrails_enabled) {
			bool used;
			if (image_mean <= cf->brightness_limit) {
				used = true;
				numImagesUsed++;		// Keep track of the number of images used
				if (thread_accumulator.empty()) {
					imagesrc.copyTo(thread_accumulator);
				} else {
					thread_accumulator = cv::max(thread_accumulator, imagesrc);
				}
			} else {
				used = false;
			}
			if (cf->verbose > 1 || cf->output_data_file != "") {
				char temp[100];
				snprintf(temp, 100, "\tincluded=%s", used ? "yes" : "no");
				strcat(msg, temp);
			}
		}

		// Output msg if needed
		if (cf->verbose > 1 || cf->output_data_file != "") {
			// tab-separate fields for easier parsing.
			char temp[100];
			snprintf(temp, 100, "\tthreshold=%.3f", cf->brightness_limit);
			strcat(msg, temp);
			output_msg(msg);
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

void parse_args(int argc, char** argv, struct config_t* cf)
{
	int c, tmp, ncpu = std::thread::hardware_concurrency();

	cf->verbose = 0;
	cf->startrails_enabled = true;
	cf->img_height = cf->img_width = 0;
	cf->brightness_limit = 0.35;	// not terrible in the city
	cf->nice_level = 10;
	cf->num_threads = ncpu;
	cf->images = "";
	cf->output_data_file = "";

	while (1) {		// getopt loop
		int option_index = 0;
		static struct option long_options[] = {
			{"brightness",		required_argument, 0, 'b'},
			{"directory",		required_argument, 0, 'd'},
			{"images",			required_argument, 0, 'i'},
			{"extension",		required_argument, 0, 'e'},
			{"max-threads",		required_argument, 0, 'Q'},
			{"nice-level",		required_argument, 0, 'q'},
			{"output",			required_argument, 0, 'o'},
			{"image-size",		required_argument, 0, 's'},
			{"output-data",		required_argument, 0, 'D'},
			{"statistics",		no_argument, 0, 'S'},
			{"verbose",			no_argument, 0, 'v'},
			{"help",			no_argument, 0, 'h'},
			{0, 0, 0, 0}
		};

		c = getopt_long(argc, argv, "hvSb:d:D:i:e:Q:q:o:s:", long_options, &option_index);
		if (c == -1)
			break;

		switch (c) {
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
				if (height < 0 || width < 0) {
					height = width = 0;
					fprintf(stderr, "%s: WARNING: height (%d) and width (%d) must be >= 0.",
						ME, height, width);
					fprintf(stderr, "  Setting to 0.\n");
				} else if (height > 9600 || width > 12800) {
					fprintf(stderr, "%s: WARNING: maximum height (%d) is 9600 and maximum width (%d) is 12800.",
						ME, height, width);
					fprintf(stderr, "  Setting to 0.\n");
					height = width = 0;
				}
				cf->img_height = height;
				cf->img_width = width;
				break;
			case 'b':
				double b;
				b = atof(optarg);
				if (b >= 0 && b <= 1.0)
					cf->brightness_limit = b;
				else {
					fprintf(stderr, KRED "%s: ERROR: Invalid brightness level %f. Must be from 0 to 1.0; exiting\n" KNRM, ME, b);
					usage_and_exit(1);
				}
				break;
			case 'd':
				cf->img_src_dir = optarg;
				break;
			case 'D':
				cf->output_data_file = optarg;
				break;
			case 'i':
				cf->images = optarg;
				break;
			case 'e':
				cf->img_src_ext = optarg;
				break;
			case 'Q':
				tmp = atoi(optarg);
				if ((tmp >= 1) && (tmp <= ncpu))
					cf->num_threads = tmp;
				else
					fprintf(stderr, "%s: WARNING: Invalid number of threads %d; using %d\n",
						ME, tmp, cf->num_threads);
				break;
			case 'q':
				tmp = atoi(optarg);
				if (PRIO_MIN > tmp) {
					tmp = PRIO_MIN;
					fprintf(stderr, "%s: WARNING: Clamping scheduler priority to PRIO_MIN (%d)\n",
						ME, PRIO_MIN);
				} else if (PRIO_MAX < tmp) {
					fprintf(stderr, "%s: WARNING: Clamping scheduler priority to PRIO_MAX (%d)\n",
						ME, PRIO_MAX);
					tmp = PRIO_MAX;
				}
				cf->nice_level = atoi(optarg);
				break;
			case 'o':
				cf->dst_startrails = optarg;
				break;
			default:
				break;
		}	// option switch
	}		// getopt loop
}

void usage_and_exit(int x) {
#define NL		std::endl		// make the code easier to read

	std::cerr << "\nUsage: " << ME << " [-v] -i <images-file> | -d <imagedir> -e <ext>" << " \\" << NL
		<< "\t[-b <brightness> -o <output> | -S] [-D <output-data-file>] " << " \\" << NL
		<< "\t[-s <WxH>] [-Q <max-threads>] [-q <nice>]" << NL;
	if (x) {
		std::cerr << "\n" << KRED
			<< "Either a list of files OR a source directory and file extension are required." << NL
			<< "An output file name is required to render startrails."
			<< KNRM << NL;
	}

	std::cerr << NL;
	std::cerr << "Arguments:" << NL;
	std::cerr << "   -h | --help : display this message, then exit." << NL;
	std::cerr << "   -v | --verbose : increase log verbosity." << NL;
	std::cerr << "   -S | --statistics : print image directory statistics without producing image." << NL;
	std::cerr << "   -i | --images <str> : file containing list of images to process." << NL;
	std::cerr << "        If the file also contains the mean brightness for an image, it will be used." << NL;
	std::cerr << "   -d | --directory <str> : directory from which to read images." << NL;
	std::cerr << "        If --images is specified then --directory is not needed unless." << NL;
	std::cerr << "        one or more image names does not start with a '/'.." << NL;
	std::cerr << "   -D | --output-data <str> : save per-image summary data to the specified file." << NL;
	std::cerr << "   -e | --extension <str> : filter images to just this extension." << NL;
	std::cerr << "   -Q | --max-threads <int> : limit maximum number of processing threads (all cpus)." << NL;
	std::cerr << "   -q | --nice-level <int> : nice(2) level of processing threads (10)." << NL;
	std::cerr << "   -o | --output <str> : output image filename." << NL;
	std::cerr << "   -s | --image-size <int>x<int> : restrict processed images to this size." << NL;
	std::cerr << "   -b | --brightness <float> : ranges from 0 (black) to 1 (white). (0.35)." << NL;
	std::cerr << "\tA moonless sky may be as low as 0.05 while full moon can be as high as 0.4." << NL;

	std::cerr << NL;
	std::cerr << "For example: startrails -b 0.07 -d ~/allsky/images/20250710/ -e jpg -o startrails.jpg" << NL;
	exit(x);
#undef END
}

int main(int argc, char* argv[]) {
	struct config_t config;
	int r;
	ME = basename(argv[0]);

	parse_args(argc, argv, &config);

	if (config.images.empty() && (config.img_src_dir.empty() || config.img_src_ext.empty()))
		usage_and_exit(3);

	r = setpriority(PRIO_PROCESS, 0, config.nice_level);
	if (r) {
		config.nice_level = getpriority(PRIO_PROCESS, 0);
		fprintf(stderr, "unable to set nice level: %s\n", strerror(errno));
	}

	std::string ext = "";
	if (config.startrails_enabled) {
		std::string extcheck = config.dst_startrails;
		std::transform(extcheck.begin(), extcheck.end(), extcheck.begin(),
						 [](unsigned char c) { return std::tolower(c); });

		if (config.dst_startrails.empty()) {
			fprintf(stderr, KRED "%s: ERROR: Output file not specified.\n\n" KNRM, ME);
			usage_and_exit(3);
		}
		if (extcheck.rfind(".png") == string::npos && extcheck.rfind(".jpg") == string::npos) {
			fprintf(stderr, KRED "%s: ERROR: Output file '%s' is missing extension (.jpg or .png).\n\n" KNRM,
					ME, config.dst_startrails.c_str());
			usage_and_exit(3);
		}
		ext = strrchr(config.dst_startrails.c_str(), '.') + 1;
	} else {
		config.brightness_limit = 0;
		config.dst_startrails = "/dev/null";
	}

	if (config.output_data_file != "") {
		if (config.output_data_file == "-") {
			dataIO = stderr;
		} else {
			dataIO = fopen(config.output_data_file.c_str(), "w");
			if (dataIO == NULL) {
				fprintf(stderr, KRED "%s: ERROR: Data output file '%s' could not be opened: %s\n\n" KNRM,
					ME, config.output_data_file.c_str(), strerror(errno));
				exit(4);
			}
		}
	}

	// Find files
	glob_t files;
	if (config.images != "") {
		// Store the file names in a vector.
		static std::vector<std::string> images;
		std::string line;

		// The images are specified in a file or stdin in if "-".
		// So as not to redo the code that reads "files",
		// set "files" to point to a vector of image names.
		// Ignore lines that begin with "#".
		if (config.images == "-") {
			while (std::getline(std::cin, line)) {
				if (line.c_str()[0] != '#')
					images.push_back(line);
			}
		} else {
			std::ifstream image_file(config.images);
			if (! image_file.is_open()) {
				std::cerr << KRED << ME << ": ERROR: Could not open image file '" << config.images << "'"
				<< ", exiting." << KNRM << std::endl;
				exit(NO_IMAGES);
			}

			while (std::getline(image_file, line)) {
				if (line.c_str()[0] != '#')
					images.push_back(line);
			}
			image_file.close();
		}
		nfiles = files.gl_pathc = images.size();
		if (nfiles == 0) {
			std::cerr << KRED << ME << ": ERROR: No images listed in '" << config.images << "'";
			std::cerr << ", exiting." << KNRM << std::endl;
			exit(NO_IMAGES);
		}

		// Make file.gl_pathv point to the image names.
		int dir_length = config.img_src_dir.length() + 1;		// + 1 for "/"
		files.gl_pathv = new char*[images.size()];

		for (size_t i = 0; i < nfiles; i++) {
			std::string image = images[i];
			int len = image.length() + 1;
			// If the first character of a file name is NOT a "/" then
			// prepend the input directory name.
			if (image.c_str()[0] != '/') {
				if(config.img_src_dir.empty()) {
					std::cerr << KRED << ME << ": ERROR: image source directory not specified and"
					<< " at least one image name is not a full pathname." << KNRM << std::endl << std::endl;
					usage_and_exit(3);
				}
				image = config.img_src_dir + "/" + image;
				len += dir_length;
			}
			files.gl_pathv[i] = new char[len];
			strcpy(files.gl_pathv[i], image.c_str());
		}

	} else {
		// Look in the input directory for files matching the pattern.
		std::string wildcard = config.img_src_dir + "/*." + config.img_src_ext;
		glob(wildcard.c_str(), 0, NULL, &files);
		nfiles = files.gl_pathc;
		if (nfiles == 0) {
			globfree(&files);
			std::cerr << KRED << ME << ": ERROR: No images found in '" << config.img_src_dir << "'";
			std::cerr << ", exiting." << KNRM << std::endl;
			exit(NO_IMAGES);
		}
	}
	// Determine width of the number of files, e.g., "1234" is 4 characters wide.
	sprintf(s_, "%d", (int)nfiles);
	s_len = strlen(s_);

	std::mutex accumulated_mutex;
	cv::Mat accumulated;
	cv::Mat stats;
	stats.create(1, nfiles, CV_64F);
	// initialize stats to NAN because some images might legitimately be 100%
	// brightness if they're massively overexposed. They should be counted in
	// the summary statistics. It is not entirely accurate to signal invalid
	// images with 1.0 brightness since no image data was read.
	stats = NAN;

	// Set the global "nchan" variable to be the number of channels in one of the images.
	// Any subsequent file with a different number of channels will be converted to
	// the sample file's number.
	// Ditto for the width and height.
	// In both cases only set the variables if not specified on the command line.
	cv::Mat temp;
	const int sample_file_num = 0;	// 1st file
	char *sample_file = files.gl_pathv[sample_file_num];

	if (nchan == 0 || (config.img_width == 0 && config.img_height == 0)) {
		char not_used[1];
		// KLUDGE: temporarily replace the tab.
		char *p = std::strstr(sample_file, "	");		// tab
		if (p != nullptr) {
			*p = '\0';
		}
		if (! read_file(&config, sample_file, &temp, sample_file_num+1, not_used, 0)) {
			fprintf(stderr, KRED "%s: ERROR: Unable to read sample file '%s'; quitting.\n" KNRM, ME, sample_file);
			exit(BAD_SAMPLE_FILE);
		}
		if (p != nullptr) {
			*p = '\t';
		}
		if (config.verbose > 1) {
			fprintf(stderr, "Getting nchan and/or size from: '%s'\n", sample_file);
		}
	}
	if (nchan == 0)
	{
		nchan = temp.channels();
		if (config.verbose > 1) {
			fprintf(stderr, "\tnchan = %d\n", nchan);
		}
	}
	// Set the width and height based on the same file if not specified on the command line.
	if (config.img_width == 0 && config.img_height == 0) {
		config.img_width = temp.cols;
		config.img_height = temp.rows;
		if (config.verbose > 1) {
			fprintf(stderr, "\tsize = %d x %d\n", config.img_width, config.img_height);
		}
	}

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

// TODO: go through "stats" looking for "stats.col(i) == -1" and replace the -1 with the mean.
// I don't know how to use stats.col(i) to do anything other than assign to it.
// This works:	stats.col(i) = 1;
// Not this:	if (stats.col(i) == 1)
// It complains that stats.col(i) is a cv::Mat.

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

	std::cout << ME << ": Minimum: " << ds_min << "   maximum: " << ds_max
			<< "   mean: " << ds_mean << "   median: " << ds_median
			<< "   numImagesUsed: " << numImagesUsed << "   numImagesNotUsed: " << (vec.size() - numImagesUsed)
			<< "   threshold: " << config.brightness_limit
			<< std::endl;

	// If we still don't have an image (no images below threshold), copy the
	// minimum mean image so we see why
	int ret = 0;	// return code
	if (config.startrails_enabled) {
		if (accumulated.empty()) {
			// Indent since this msg goes with the line above.
			fprintf(stderr, "    No images below threshold %.3f, writing the minimum mean image only.\n",
					config.brightness_limit);
			accumulated = cv::imread(files.gl_pathv[min_loc.x], cv::IMREAD_UNCHANGED);
			// EXIT_PARTIAL_OK means we created something but it's not a startrails.
			ret = EXIT_PARTIAL_OK;
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
			result = cv::imwrite(config.dst_startrails, accumulated, compression_params);
		} catch (cv::Exception& ex) {
			// Use lowercase "s"tartrails here and uppercase below so we
			// know what produced the error.
			fprintf(stderr, KRED "%s: ERROR: could not save startrails file '%s': %s\n" KNRM,
				ME, config.dst_startrails.c_str(), ex.what());
			exit(2);
		}
		if (! result) {
			fprintf(stderr, KRED "%s: ERROR: could not save Startrails file '%s': %s\n" KNRM,
				ME, config.dst_startrails.c_str(), strerror(errno));
			exit(2);
		}
	}

	
	if (config.images == "") {
		globfree(&files);
	}

	exit(ret);
}
