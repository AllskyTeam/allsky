// Progressive startrails video creation program using OpenCV

#include <getopt.h>
#include <glob.h>
#include <sys/stat.h>
#include <algorithm>
#include <cmath>
#include <cstdlib>
#include <iostream>
#include <string>
#include <vector>

#include <opencv2/opencv.hpp>

struct config_t {
	std::string directory;
	std::string extension = "jpg";
	std::string output = "startrail.mp4";
	double brightness_limit = 0.3;
	double fps = 25.0;
	double image_scale = 1.0;
	unsigned long frames = 0;
	int verbose = 0;
};

static const char* program_name = "startrailslapse";

static void usage(int status)
{
	std::cerr << "Usage: " << program_name
		<< " -d <directory> [-o <output.mp4>]"
		<< " [-e <extension>]"
		<< " [-b <brightness>] [-r <fps>] [-s <scale>] [-n <frames>] [-v]" << std::endl;
	std::cerr << "  -d, --directory    directory containing images" << std::endl;
	std::cerr << "  -e, --extension    image extension when using --directory (jpg)" << std::endl;
	std::cerr << "  -o, --output       output MP4 filename (startrail.mp4)" << std::endl;
	std::cerr << "  -b, --brightness   maximum mean brightness to include (0.3)" << std::endl;
	std::cerr << "  -r, --fps          output frames per second (25)" << std::endl;
	std::cerr << "  -s, --image-size   image scale factor from 0.1 to 2.0 (1)" << std::endl;
	std::cerr << "  -n, --frames       maximum number of frames; 0 means all (0)" << std::endl;
	std::cerr << "  -v, --verbose      print processing progress" << std::endl;
	exit(status);
}

static void parse_args(int argc, char** argv, config_t& config)
{
	static struct option options[] = {
		{"directory", required_argument, nullptr, 'd'},
		{"extension", required_argument, nullptr, 'e'},
		{"output", required_argument, nullptr, 'o'},
		{"brightness", required_argument, nullptr, 'b'},
		{"fps", required_argument, nullptr, 'r'},
		{"image-size", required_argument, nullptr, 's'},
		{"frames", required_argument, nullptr, 'n'},
		{"verbose", no_argument, nullptr, 'v'},
		{"help", no_argument, nullptr, 'h'},
		{nullptr, 0, nullptr, 0}
	};

	int option;
	while ((option = getopt_long(argc, argv, "d:e:o:b:r:s:n:vh", options, nullptr)) != -1) {
		switch (option) {
			case 'd': config.directory = optarg; break;
			case 'e': config.extension = optarg; break;
			case 'o': config.output = optarg; break;
			case 'b': config.brightness_limit = atof(optarg); break;
			case 'r': config.fps = atof(optarg); break;
			case 's': config.image_scale = atof(optarg); break;
			case 'n': config.frames = strtoul(optarg, nullptr, 10); break;
			case 'v': config.verbose++; break;
			case 'h': usage(0); break;
			default: usage(2);
		}
	}

	if (config.directory.empty())
		usage(2);
	if (config.output.size() < 4 ||
		config.output.substr(config.output.size() - 4) != ".mp4")
		usage(2);
	if (config.brightness_limit < 0 || config.brightness_limit > 1 || config.fps <= 0 ||
		config.image_scale < 0.1 || config.image_scale > 2.0)
		usage(2);
}

static double image_brightness(const cv::Mat& image)
{
	cv::Scalar mean = cv::mean(image);
	double value = mean[0];
	if (image.channels() >= 3)
		value = std::max(mean[0], std::max(mean[1], mean[2]));
	if (image.depth() == CV_8U)
		value /= 255.0;
	else if (image.depth() == CV_16U)
		value /= 65535.0;
	return value;
}

static bool read_image(const std::string& filename, const config_t& config, cv::Mat& image)
{
	struct stat info;
	if (stat(filename.c_str(), &info) != 0 || info.st_size == 0)
		return false;
	image = cv::imread(filename, cv::IMREAD_UNCHANGED);
	if (image.empty())
		return false;
	if (config.image_scale != 1.0) {
		int width = static_cast<int>(std::round(image.cols * config.image_scale));
		int height = static_cast<int>(std::round(image.rows * config.image_scale));
		cv::resize(image, image, cv::Size(width, height), 0, 0,
			config.image_scale < 1.0 ? cv::INTER_AREA : cv::INTER_LINEAR);
	}
	return true;
}

static std::vector<std::string> image_list(const config_t& config)
{
	std::vector<std::string> result;
	glob_t files = {};
	std::string pattern = config.directory + "/*." + config.extension;
	if (glob(pattern.c_str(), 0, nullptr, &files) == 0) {
		for (size_t index = 0; index < files.gl_pathc; index++)
			result.emplace_back(files.gl_pathv[index]);
	}
	globfree(&files);
	return result;
}

int main(int argc, char** argv)
{
	config_t config;
	parse_args(argc, argv, config);
	std::vector<std::string> files = image_list(config);
	if (files.empty()) {
		std::cerr << program_name << ": no images found" << std::endl;
		return 98;
	}
	if (config.frames > 0 && files.size() > config.frames)
		files.resize(config.frames);

	cv::VideoWriter writer;
	cv::Mat accumulated;
	int used = 0;
	int processed = 0;

	for (const std::string& filename : files) {
		cv::Mat image;
		if (!read_image(filename, config, image)) {
			std::cerr << program_name << ": unable to read " << filename << std::endl;
			continue;
		}
		processed++;
		double brightness = image_brightness(image);
		if (brightness > config.brightness_limit)
			continue;

		if (accumulated.empty())
			image.copyTo(accumulated);
		else {
			if (image.type() != accumulated.type())
				image.convertTo(image, accumulated.type());
			accumulated = cv::max(accumulated, image);
		}

		if (!writer.isOpened()) {
			int codec = cv::VideoWriter::fourcc('a', 'v', 'c', '1');
			writer.open(config.output, codec, config.fps, accumulated.size(), accumulated.channels() != 1);
			if (!writer.isOpened())
				writer.open(config.output, cv::VideoWriter::fourcc('m', 'p', '4', 'v'), config.fps,
					accumulated.size(), accumulated.channels() != 1);
			if (!writer.isOpened()) {
				std::cerr << program_name << ": could not open " << config.output << std::endl;
				return 2;
			}
		}
		writer.write(accumulated);
		used++;
		if (config.verbose)
			std::cout << "frame " << processed << ": " << filename << std::endl;
	}

	if (!writer.isOpened() || used == 0) {
		std::cerr << program_name << ": no images were below the brightness threshold" << std::endl;
		return 90;
	}
	writer.release();
	std::cout << program_name << ": wrote " << used << " of " << processed
		<< " checked images to " << config.output << std::endl;
	return 0;
}