#include <opencv2/core/core.hpp>
#include <opencv2/imgproc/imgproc.hpp>
#include <opencv2/highgui/highgui.hpp>
#include <unistd.h>
#include <string.h>
#include <errno.h>
#include <string>
#include <iomanip>
#include <cstring>
#include <sstream>
#include <iostream>
#include <cstdio>
#include <tr1/memory>
#include <stdlib.h>
#include <signal.h>
#include <fstream>

using namespace cv;
using namespace std;

// image-20210709222814  some stars
// image-20210708223326  no stars
// image-20210718014420 viele, aber mit wolken
char const *fileName = "image-20210718014420.jpg";


// https://www.youtube.com/watch?v=2FYm3GOonhk

void getContours(Mat imgDil, Mat img) {
	vector<vector<Point>> contours;
	vector<Vec4i> hierarchy;

	findContours (imgDil, contours, hierarchy, RETR_EXTERNAL, CHAIN_APPROX_SIMPLE);

	int cnt = 0;
	for (int i = 0; i < (int) contours.size(); i++) {
		int area = contourArea(contours[i]);
		if (area < 30) {
			cnt++;
			cout << cnt << ": " << i << " " << area << endl;
			drawContours (img, contours, i, Scalar(255,0,255),2);
		}
	}
}

int main(int argc, char *argv[])
{
    Mat img = imread(fileName);
	Mat imgGray;
	Mat imgBlur;
	Mat imgCanny;
	Mat imgDil;

    if (!img.data)
    {
            std::cout << "Error reading file " << basename(fileName) << std::endl;
    }
	else {
		// Preprocessing
		cvtColor (img, imgGray, COLOR_BGR2GRAY);
		GaussianBlur (imgGray, imgBlur, Size(3,3),3,0);
		Canny (imgBlur, imgCanny, 35,65); //Canny (imgBlur, imgCanny, 25,75);
		Mat kernel = getStructuringElement(MORPH_RECT, Size(3,3));
		dilate (imgCanny, imgDil, kernel);
		getContours(imgDil, img);

		imwrite("gray.jpg", imgGray);
		imwrite("blur.jpg", imgBlur);
		imwrite("canny.jpg", imgCanny);
		imwrite("dil.jpg", imgDil);

		imwrite("result.jpg", img);

	}
}

