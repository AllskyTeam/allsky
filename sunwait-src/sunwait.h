//
// sunwait - sunwait.h
//
// 08-12-2014  IFC  0.6  Add timezone handling for output, if required
// 02-05-2015  IFC  0.7  Fix timezone and DST problems
// 06-05-2015  IFC  0.8  Fix polar calculations
//

#include <time.h>

#ifndef SUNWAIT_H
#define SUNWAIT_H

#define DEFAULT_LIST      1           /* in 'List' mode, report these number days */
#define DEFAULT_ANGLE     0.83        /* Default twighlight angle. */
#define DEFAULT_LATITUDE  52.952308 
#define DEFAULT_LONGITUDE 359.048052  /* The Buttercross, Bingham, England */

#define boolean bool
#define NOT_SET 9999999
#define     SET 1111111

typedef enum
{ ONOFF_ON
, ONOFF_OFF
} OnOff;

typedef struct
{ 
  double        latitude;            // Degrees N - Global position
  double        longitude;           // Degrees E - Global position

  double        offsetHour;          // Unit: Hours. Adjust sunrise or sunset by this amount, towards midday.
  double        twilightAngle;       // Degrees. -ve = below horizon. Twilight angle requested by user.

  time_t        nowTimet;            // Time this program is run
  time_t        targetTimet;         // Midnight (00:00am) UTC on target day

  unsigned long now2000;            // Days from 1/1/2000 to "now"
  unsigned long target2000;         // Days from 1/1/2000 to "target"

  OnOff         functionVersion;     // User wants program version number reported
  OnOff         functionUsage;       // User wants program usage info reported
  OnOff         functionReport;      // User wants a report generated
  OnOff         functionList;        // User wants a list of sunrise or sunset times
  OnOff         functionPoll;        // User wants a "NIGHT" or "DAY" return code/text
  OnOff         functionWait;        // User wants the program to wait until sunrise or sunset

  OnOff         utc;                 // Printed output is in GMT/UTC (on) or localtime (off)
  OnOff         debug;               // Is debug output required

  OnOff         reportSunrise;       // Report sun rising
  OnOff         reportSunset;        // Report sun setting

  unsigned int  listDays;            // How many days should sunrise/set be listed for. (function: List)

  double        utcBiasHours;        // Add to UTC to get local-time (hours)

} runStruct;

typedef struct
{ 
  // "Input" data
  double        twilightAngle;       // Degrees. -ve = below horizon. Can be: daylight, civil, nautical, astronomical, or custom.
  unsigned long daysSince2000;       // The sunrise calculation needs this: days from start of 2000 to targetTimet

  // "Output" data
  double        diurnalArc;          // Target day: The time it takes the sun to travel across the sky. "southHourUTC" is mid-way.
  double        southHourUTC;        // Target day: Sun directly south - time (hours) from targetTimet (midnight, target Day UTC)
} targetStruct;

#define EXIT_OK    0
#define EXIT_ERROR 1
#define EXIT_DAY   2
#define EXIT_NIGHT 3

#define DAYS_TO_2000  365*30+7      // Number of days from 'C' time epoch (1/1/1970 to 1/1/2000) [including leap days]


// Functions

void myUtcTime   (const time_t * ptrTimet, struct tm * ptrTm);
void myLocalTime (const time_t * ptrTimet, struct tm * ptrTm);

OnOff isDay (const runStruct *pRun);

int poll (const runStruct *pRun);
int wait (const runStruct *pRun);


#endif
