//
// sunwait - sunriset.h
//
// 08-12-2014  IFC  0.6  Add timezone to output
// 02-05-2015  IFC  0.7  Fix timezone and DST issues
// 2015-05-27  IFC  0.8  Resolve 'dodgy day' and cleanup
//

#ifndef SUNRISET_H
#define SUNRISET_H

#include "sunwait.h"
#include "print.h"


/* Sunrise/set is considered to occur when the Sun's upper limb (upper edge) is 50 arc minutes below the horizon */
/* (this accounts for the refraction of the Earth's atmosphere). */
/* Civil twilight starts/ends when the Sun's center is 6 degrees below the horizon. */
/* Nautical twilight starts/ends when the Sun's center is 12 degrees below the horizon. */
/* Astronomical twilight starts/ends when the Sun's center is 18 degrees below the horizon. */
#define TWILIGHT_ANGLE_DAYLIGHT     -50.0/60.0
#define TWILIGHT_ANGLE_CIVIL        -6.0
#define TWILIGHT_ANGLE_NAUTICAL     -12.0
#define TWILIGHT_ANGLE_ASTRONOMICAL -18.0

/* Some conversion factors between radians and degrees */
#define RADIAN_TO_DEGREE   ( 180.0 / PI )
#define DEGREE_TO_RADIAN   ( PI / 180.0 )

/* The trigonometric functions in degrees */
#define sind(x)     (sin((x)*DEGREE_TO_RADIAN))
#define cosd(x)     (cos((x)*DEGREE_TO_RADIAN))
#define tand(x)     (tan((x)*DEGREE_TO_RADIAN))
#define atand(x)    (RADIAN_TO_DEGREE*atan(x))
#define asind(x)    (RADIAN_TO_DEGREE*asin(x))
#define acosd(x)    (RADIAN_TO_DEGREE*acos(x))
#define atan2d(y,x) (RADIAN_TO_DEGREE*atan2(y,x))

#define PI 3.1415926535897932384

void sunriset (const runStruct *pRun, targetStruct *pTarget);
double revolution (const double x);
double rev180 (const double x);
double fixLongitude (const double x);
double fixLatitude (const double x);
double fix24 (const double x);
double GMST0 (const double d);
void sun_RA_dec (double d, double *RA, double *dec, double *r);
unsigned long daysSince2000 (const time_t *pTimet);

long   myRound (const double d);
long   myTrunc (const double d);
double myAbs   (const double d);

int hours   (const double d);
int minutes (const double d);

#endif
