/*
** sunriset.c - computes Sun rise/set times, including twilights
** Written as DAYLEN.C, 1989-08-16
** Modified to SUNRISET.C, 1992-12-01
** (c) Paul Schlyter, 1989, 1992
** Released to the public domain by Paul Schlyter, December 1992
*/

/*
**
** Who  When        Ver  What
** IFC  04-12-2014  0.5  General fixes to "sunwait for windows" and linux port
** IFC  08-12-2014  0.6  Add timezone for output of timings
** IFC  29-04-2015  0.7  Fix for timezone (esp near date line) and more debug
** IFC  2015-05-27  0.8  Resolve 'dodgy day' and cleanup
**
*/

#include <stdio.h>
#include <stdlib.h> // Linux
#include <iostream>
#include <math.h>
#include <time.h>

#include "sunwait.h"
#include "sunriset.h"

using namespace std;

/************************************************************************/
/* Note: Eastern longitude positive, Western longitude negative         */
/*       Northern latitude positive, Southern latitude negative         */
/*                                                                      */
/* >>>   Longitude value IS critical in this function!              <<< */
/*                                                                      */
/*       days  = Days since 2000 plus fraction to local noon            */
/*       altit = the altitude which the Sun should cross                */
/*               Set to -35/60 degrees for rise/set, -6 degrees         */
/*               for civil, -12 degrees for nautical and -18            */
/*               degrees for astronomical twilight.                     */
/*       upper_limb: non-zero -> upper limb, zero -> center             */
/*               Set to non-zero (e.g. 1) when computing rise/set       */
/*               times, and to zero when computing start/end of         */
/*               twilight.                                              */
/*                                                                      */
/*               Both times are relative to the specified altitude,     */
/*               and thus this function can be used to comupte          */
/*               various twilight times, as well as rise/set times      */
/* Return Codes:                                                        */
/*       0  = sun rises/sets this day. Success.                         */
/*                    Times held at *trise and *tset.                   */
/*       +1 = Midnight Sun. Fail.                                       */
/*                    Sun above the specified "horizon" all 24 hours.   */
/*                    *trise set to time when the sun is at south,      */
/*                    minus 12 hours while *tset is set to the south    */
/*                    time plus 12 hours. "Day" length = 24 hours       */
/*       -1 = Polar Night. Fail.                                        */
/*                    Sun is below the specified "horizon" all 24hours. */
/*                    "Day" length = 0 hours, *trise and *tset are      */
/*                    both set to the time when the sun is at south.    */
/*                                                                      */
/************************************************************************/
void sunriset (const runStruct *pRun, targetStruct *pTarget)
{
  double sr;               /* solar distance, astronomical units */
  double sra;              /* sun's right ascension */
  double sdec;             /* sun's declination */
  double sradius;          /* sun's apparent radius */
  double siderealTime;     /* local sidereal time */
  double altitude;         /* sun's altitude: angle to the sun relative to the mathematical (flat-earth) horizon */
  double diurnalArc = 0.0; /* the diurnal arc, hours */
  double southHour  = 0.0; /* Hour UTC the sun is directly south (or north for southern Hemisphere) of lat/long position */

  /* compute sideral time at 00:00 UTC of target day for this longitude. */
  siderealTime = revolution (GMST0(pTarget->daysSince2000) + 180.0 + pRun->longitude); // 180 = 0 hour UTC is measured 180 degrees from dateline

  /* compute sun's ra + decl at this moment */
  sun_RA_dec (pTarget->daysSince2000, &sra, &sdec, &sr );

  /* compute time when sun is directly south - in hours UTC. "12.00" == noon. "15" == 180degrees/12hours [degrees per hour] */
  southHour = 12.0 - rev180 (siderealTime - sra)/15.0;

  /* compute the sun's apparent radius, degrees */
  sradius = 0.2666 / sr;  // Apparent angular radius of sun is 0.2666/distance in AU (deg)

  /* Do correction for upper limb ('top' of sun) only, for "daylight" sunrise or set. Otherwise calculate for centre of sun */
  if (pTarget->twilightAngle == TWILIGHT_ANGLE_DAYLIGHT)
    altitude = pTarget->twilightAngle - sradius;
  else
    altitude = pTarget->twilightAngle;

  /* compute the diurnal arc that the sun traverses to reach the specified altitide altit: */
  double cost = (sind(altitude) - sind(pRun->latitude) * sind(sdec)) / (cosd(pRun->latitude) * cosd(sdec));

  if (abs(cost) < 1.0)
    diurnalArc = 2*acosd(cost)/15.0;    /* Diurnal arc, hours */
  else if (cost>=1.0)
    diurnalArc =  0.0; // Polar Night
  else
    diurnalArc = 24.0; // Midnight Sun

  if (pRun->debug == ONOFF_ON)
  { printf ("Debug: sunriset.cpp: Sun directly south: %f UTC, Dirunal Arc = %f hours\n", southHour, diurnalArc);
    printf ("Debug: sunriset.cpp: Days since 2000: %li\n", pTarget->daysSince2000);
    if (diurnalArc >= 24.0) printf ("Debug: sunriset.cpp: No rise or set: Midnight Sun\n");
    if (diurnalArc <=  0.0) printf ("Debug: sunriset.cpp: No rise or set: Polar Night\n");
  }

  // Error Check - just make sure odd things don't happen (causing trouble further on)
  if (diurnalArc > 24.0) diurnalArc = 24.0;
  if (diurnalArc <  0.0) diurnalArc =  0.0;

  /* Apply values */
  pTarget->southHourUTC = southHour;
  pTarget->diurnalArc   = diurnalArc;
}

void sunpos (const double d, double *lon, double *r)
/******************************************************/
/* Computes the Sun's ecliptic longitude and distance */
/* at an instant given in d, number of days since     */
/* 2000 Jan 0.0.  The Sun's ecliptic latitude is not  */
/* computed, since it's always very near 0.           */
/******************************************************/
{
  double M,         /* Mean anomaly of the Sun */
         w,         /* Mean longitude of perihelion */
                    /* Note: Sun's mean longitude = M + w */
         e,         /* Eccentricity of Earth's orbit */
         E,         /* Eccentric anomaly */
         x, y,      /* x, y coordinates in orbit */
         v;         /* True anomaly */

  /* Compute mean elements */
  M = revolution (356.0470 + 0.9856002585 * d);
  w = 282.9404 + 4.70935E-5 * d;
  e = 0.016709 - 1.151E-9 * d;

  /* Compute true longitude and radius vector */
  E = M + e * RADIAN_TO_DEGREE * sind(M) * (1.0 + e * cosd(M));
  x = cosd (E) - e;
  y = sqrt (1.0 - e*e) * sind(E);
  *r = sqrt (x*x + y*y);              /* Solar distance */
  v = atan2d (y, x);                  /* True anomaly */
  *lon = revolution (v + w);          /* True solar longitude, made 0..360 degrees */
}

void sun_RA_dec (const double d, double *RA, double *dec, double *r)
{
  double lon, obl_ecl;
  double xs, ys, zs;
  double xe, ye, ze;
  
  /* Compute Sun's ecliptical coordinates */
  sunpos (d, &lon, r);
  
  /* Compute ecliptic rectangular coordinates */
  xs = *r * cosd(lon);
  ys = *r * sind(lon);
  zs = 0; /* because the Sun is always in the ecliptic plane! */

  /* Compute obliquity of ecliptic (inclination of Earth's axis) */
  obl_ecl = 23.4393 - 3.563E-7 * d;
  
  /* Convert to equatorial rectangular coordinates - x is unchanged */
  xe = xs;
  ye = ys * cosd(obl_ecl);
  ze = ys * sind(obl_ecl);
  
  /* Convert to spherical coordinates */
  *RA = atan2d(ye, xe);
  *dec = atan2d(ze, sqrt(xe*xe + ye*ye));
}

//
// Utility functions
//

// Reduce angle to within 0..359.999 degrees
double revolution (const double x)
{ double remainder = fmod (x, (double) 360.0);
  return remainder < (double) 0.0 ? remainder + (double) 360.0 : remainder;
}

// Reduce angle to -179.999 to +180 degrees
double rev180 (const double x)
{ double y = revolution (x);
  return y <= (double) 180.0 ? y : y - (double) 360.0;
}

// Fix angle to 0-359.999
double fixLongitude (const double x)
{ return revolution (x);
}

// Fix angle to 0-89.999 and -0.001 to -89.999
double fixLatitude (const double x)
{
  // Make angle 0 to 359.9999
  double y = revolution (x);

       if (y <= (double)  90.0) ;
  else if (y <= (double) 180.0) y = (double) 180.0 - y;
  else if (y <= (double) 270.0) y = (double) 180.0 - y;
  else if (y <= (double) 360.0) y = y - (double) 360.0;

  // Linux compile of sunwait doesn't like 90, Windows is OK. 
  // Let's just wiggle things a little bit to make things OK.
       if (y == (double)  90.0) y = (double)  89.9999999;
  else if (y == (double) -90.0) y = (double) -89.9999999;

  return y;
}

// Time must be between 0:00 amd 23:59
double fix24 (const double x)
{
  double remainder = fmod (x, (double) 24.0);
  return remainder < (double) 0.0 ? remainder + (double) 24.0 : remainder;
}

/*******************************************************************/
/* This function computes GMST0, the Greenwhich Mean Sidereal Time */
/* at 0h UT (i.e. the sidereal time at the Greenwhich meridian at  */
/* 0h UT).  GMST is then the sidereal time at Greenwich at any     */
/* time of the day.  I've generalized GMST0 as well, and define it */
/* as:  GMST0 = GMST - UT  --  this allows GMST0 to be computed at */
/* other times than 0h UT as well.  While this sounds somewhat     */
/* contradictory, it is very practical:  instead of computing      */
/* GMST like:                                                      */
/*                                                                 */
/*  GMST = (GMST0) + UT * (366.2422/365.2422)                      */
/*                                                                 */
/* where (GMST0) is the GMST last time UT was 0 hours, one simply  */
/* computes:                                                       */
/*                                                                 */
/*  GMST = GMST0 + UT                                              */
/*                                                                 */
/* where GMST0 is the GMST "at 0h UT" but at the current moment!   */
/* Defined in this way, GMST0 will increase with about 4 min a     */
/* day.  It also happens that GMST0 (in degrees, 1 hr = 15 degr)   */
/* is equal to the Sun's mean longitude plus/minus 180 degrees!    */
/* (if we neglect aberration, which amounts to 20 seconds of arc   */
/* or 1.33 seconds of time)                                        */
/*                                                                 */
/*******************************************************************/

inline double GMST0 (const double d)
{
  /* Sidtime at 0h UT = L (Sun's mean longitude) + 180.0 degr  */
  /* L = M + w, as defined in sunpos().  Since I'm too lazy to */
  /* add these numbers, I'll let the C compiler do it for me.  */
  /* Any decent C compiler will add the constants at compile   */
  /* time, imposing no runtime or code overhead.               */
  return revolution ((180.0 + 356.0470 + 282.9404) + (0.9856002585 + 4.70935E-5) * d);
}


unsigned long daysSince2000 (const time_t *pTimet)
{
  struct tm tmpTm;

  myUtcTime (pTimet, &tmpTm);
  
  unsigned int yearsSince2000 = tmpTm.tm_year - 100; // Get year, but tm_year starts from 1900

  // Calucate number of leap days, but -
  //   yearsSince2000 - 1 
  // Don't include this year as tm_yday includes this year's leap day in the next bit

  unsigned int leapDaysSince2000
    = (unsigned int) floor ((yearsSince2000-1)/4)    // Every evenly divisible 4 years is a leap-year
    - (unsigned int) floor ((yearsSince2000-1)/100)  // Except centuries
    + (unsigned int) floor ((yearsSince2000-1)/400)  // Unless evenlt divisible by 400
    + 1;                                             // 2000 itself was a leap year with the 400 rule (a fix for 0/400 == 0)

  return (yearsSince2000 * 365) + leapDaysSince2000 + tmpTm.tm_yday;
}

/*
** Utility functions
*/

long   myRound (const double d) { return d > 0.0 ? (int) (d + 0.5) : (int) (d - 0.5) ; }
long   myTrunc (const double d) { return (d>0) ? (int) floor(d) : (int) ceil(d) ; }
double myAbs   (const double d) { return (d>0) ? d : -d ; }

int hours   (const double d) { return myTrunc (d); }
int minutes (const double d) { return myTrunc (fmod (myAbs (d) * 60,   60)); }


