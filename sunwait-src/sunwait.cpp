// sunwait.cpp : Defines the entry point for the console application.
//

// vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv CHANGE ME
// vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv CHANGE ME
const double VERSION=0.8; // <<<<<<<<< CHANGE ME
// ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ CHANGE ME
// ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ CHANGE ME

/* copyright (c) 2000,2004 Daniel Risacher */
/* minor changes courtesy of Dr. David M. MacMillan */
/* major changes courtesy of Ian Craig (2012-13) */
/* Licensed under the Gnu General Public License */

// Who  When        Ver  What
// IFC  2013-07-13  0.4  Working version of "sunwait", ported to Windows.
// IFC  2014-12-01  0.5  The linux port was not working - the windows sleep is for seconds, the linux is miliseconds.
//                       I'm porting my home power control to Linux, so I've reworked the whole program to suit.
// IFC  2014-12-08  0.6  Add timezone handling for output - if required
// IFC  2015-04-29  0.7  Timezone and DST fixes - and for date line timings
// IFC  2015-05-27  0.8  Resolve 'dodgy day' and cleanup
//

#include <stdio.h>
#include <stdlib.h>
#include <iostream>
#include <time.h>
#include <cstring>
#include <math.h>

// Windows
#if defined _WIN32 || defined _WIN64
  #include <windows.h>
#endif

// Linux
#if defined __linux__
  #include <unistd.h>
#endif

#include "sunwait.h"
#include "sunriset.h"
#include "print.h"

using namespace std;


/*
** Define global:
** 'runStruct' structure allows pretty much everything to be carted simply around functions.
** 'targetStruct' structure is the interface to the sunrise calcs. Compact, and allows multi-results to be used.
** It can be a bit naughty on side-effects, so I use 'const' where-ever I can.
*/

runStruct  gRun;
runStruct *pRun;

void print_version ()
{
  printf ("Sunwait for Windows. Version %f (IFC).\n", VERSION);
  printf ("Code Contributors: P.Schlyter, D.Risacher, D.MacMillan and I.Craig.\n");
  printf ("\n");
  printf (" Sunset is the instant at which the upper edge of the Sun disappears below the horizon.\n");
  printf (" Civil twilight is the period from sunset until the geometric centre of the sun is 6° below the horizon.\n");
  printf (" Nautical twilight is the period when the geometric centre of the sun is between 6° and 12° below the horizon.\n");
  printf (" Astronomical twilight is the period when the geometric centre of the sun is between 12° and 18° below the horizon.\n");
  printf (" Night is period when the geometric center of the sun falls 18° below the horizon.\n");

}

/*
** It's very useful to have this here 
*/
void print_usage () 
{ printf ("Calculate sunrise and sunset times for the current or targetted day.\n");
  printf ("The times can be adjusted either for twilight or fixed durations.\n");
  printf ("\n");
  printf ("The program can either: wait for sunrise or sunset   (function: wait),\n");
  printf ("  or return the time (GMT or local) the event occurs (function: list),\n");
  printf ("  or report the day length and twilight timings      (function: report),\n");
  printf ("  or simply report if it is DAY or NIGHT             (function: poll).\n");
  printf ("\n");
  printf ("You should specify the latitude and longitude of your target location.\n");
  printf ("\n");
  printf ("\n");
  printf ("Usage: sunwait [major options] [minor options] [twilight type] [rise|set] [offset] [latitude] [longitude]\n");
  printf ("\n");
  printf ("Major options, either:\n");
  printf ("    poll          Returns immediately indicating DAY or NIGHT. See 'program exit codes'. Default.\n");
  printf ("    wait          Sleep until specified event occurs. Else exit immediate.\n");
  printf ("    list [X]      Report twilight times for next 'X' days (inclusive). Default: %u.\n", DEFAULT_LIST);
  printf ("    report        Generate a report about the days sunrise and sunset timings.\n");
  printf ("\n");
  printf ("Minor options, any of:\n");
  printf ("    [no]debug     Print extra info and returns in one minute. Default: nodebug.\n");
  printf ("    [no]version   Print the version number. Default: noversion.\n");
  printf ("    [no]help      Print this help. Default: nohelp.\n");
  printf ("    [no]gmt       Print times in GMT or local-time.  Default: nogmt.\n");
  printf ("\n");
  printf ("Twilight types, either:\n");
  printf ("    daylight      Top of sun just below the horizon. Default.\n");
  printf ("    civil         Civil Twilight.         -6 degrees below horizon.\n");
  printf ("    nautical      Nautical twilight.     -12 degrees below horizon.\n");
  printf ("    astronomical  Astronomical twilight. -18 degrees below horizon.\n");
  printf ("    angle [X.XX]  User-specified twilight-angle (degrees). Default: 0.\n");
  printf ("\n");
  printf ("Sunrise/sunset. Only useful with major-options: 'wait' and 'list'. Any of: (default: both)\n");
  printf ("    rise          Wait for the sun to rise past specified twilight & offset.\n");
  printf ("    set           Wait for the sun to  set past specified twilight & offset.\n");
  printf ("\n");
  printf ("Offset:\n");
  printf ("    offset [MM|HH:MM] Time interval (+ve towards noon) to adjust twilight calculation.\n");
  printf ("\n");
  printf ("Target date. Only useful with major-options: 'report' or 'list'. Default: today\n");
  printf ("    d [DD]        Set the target Day-of-Month to calculate for. 1 to 31.\n");
  printf ("    m [MM]        Set the target Month to calculate for. 1 to 12.\n");
  printf ("    y [YYYY]      Set the target Year to calculate for. 2000 to 2099.\n");
  printf ("\n");
  printf ("latitude/longitude coordinates: floating-point degrees, with [NESW] appended. Default: Bingham, England.\n");
  printf ("\n");
  printf ("Exit (return) codes:\n");
  printf ("    %1d           OK: exit from 'wait' or 'list' only.\n",            EXIT_OK);
  printf ("    %1d           Error.\n",                                          EXIT_ERROR);
  printf ("    %1d           Exit from 'poll': it is DAY or twilight.\n",        EXIT_DAY);
  printf ("    %1d           Exit from 'poll': it is NIGHT (after twilight).\n", EXIT_NIGHT);
  printf ("\n");
  printf ("Example 1: sunwait wait rise offset -1:15:10 51.477932N 0.000000E\n");
  printf ("Wait until 1 hour 15 minutes 10 secs before the sun rises in Greenwich, London.\n");
  printf ("\n");
  printf ("Example 2: sunwait list 7 civil 55.752163N 37.617524E\n");
  printf ("List civil sunrise and sunset times for today and next 6 days. Moscow.\n");
  printf ("\n");
  printf ("Example 3: sunwait poll exit angle 10 54.897786N -1.517536E\n");
  printf ("Indicate by program exit-code if is Day or Night using a custom twilight angle of 10 degrees above horizon. Washington, UK.\n");
  printf ("\n");
  printf ("Example 4: sunwait list 7 gmt sunrise angle 3\n");
  printf ("List next 7 days sunrise times, custom +3 degree twilight angle, default location.\n");
  printf ("Uses GMT; as any change in daylight saving over the specified period is not considered.\n");
  printf ("\n");
  printf ("Note that program uses C library functions to determine time and localtime.\n");
  printf ("Error for timings are estimated at: +/- 4 minutes.\n");
  printf ("\n");
}

void myToLower (char *arg)
{ for (unsigned int i=0; i < strlen (arg); i++)
    arg[i] = tolower (arg[i]);
}

void myToLower (const int argc, char *argv[])
{ for (int i=1; i < argc; i++)
    myToLower (argv [i]); 
}

boolean myIsNumber (const char *arg)
{ bool digitSet = false;
  for (int i=0; ; i++)
  { switch (arg[i])
    {
    case  '0':
    case  '1':
    case  '2':
    case  '3':
    case  '4':
    case  '5':
    case  '6':
    case  '7':
    case  '8':
    case  '9': digitSet = true; break;
    case  '-':
    case  '+': if (digitSet) return false; break;
    case '\0': return digitSet; break; // Exit OK
    default:   return false;           // Exit Error
    }
  }
  return false; /* Shouldn't get here */
}

boolean myIsSignedNumber (const char *arg)
{ bool digitSet = false;
  for (int i=0; ; i++)
  { switch (arg[i])
    {
    case  '0':
    case  '1':
    case  '2':
    case  '3':
    case  '4':
    case  '5':
    case  '6':
    case  '7':
    case  '8':
    case  '9': digitSet = true; break;
    case  '+':
    case  '-': if (i>0) return false; break; /* Sign only at start */
    case '\0': return digitSet; break; // Exit OK
    default:   return false;           // Exit Error
    }
  }
  return false; /* Shouldn't get here */
}

boolean myIsSignedFloat (const char *arg)
{ bool digitSet = false;
  for (int i=0; ; i++)
  { switch (arg[i])
    {
    case  '0':
    case  '1':
    case  '2':
    case  '3':
    case  '4':
    case  '5':
    case  '6':
    case  '7':
    case  '8':
    case  '9': digitSet = true; break;
    case  '.': break; /* Can be anywhere (but in front of sign), or not there */
    case  '+':
    case  '-': if (i>0) return false; break; /* Sign only at start */
    case '\0': return digitSet; break; // Exit OK
    default:   return false;           // Exit Error
    }
  }
  return false; /* Shouldn't get here */
}

boolean myIsSignedFloat (const char *pArg, double *pDouble)
{ double number = 0;
  int    exponent = 0;
  bool   negative = false;
  bool   exponentSet = false;
  for (int i=0; ; i++)
  { switch (pArg[i])
    {
    case '0': number = (number*10) + 0; exponentSet?exponent++:true; break;
    case '1': number = (number*10) + 1; exponentSet?exponent++:true; break;
    case '2': number = (number*10) + 2; exponentSet?exponent++:true; break;
    case '3': number = (number*10) + 3; exponentSet?exponent++:true; break;
    case '4': number = (number*10) + 4; exponentSet?exponent++:true; break;
    case '5': number = (number*10) + 5; exponentSet?exponent++:true; break;
    case '6': number = (number*10) + 6; exponentSet?exponent++:true; break;
    case '7': number = (number*10) + 7; exponentSet?exponent++:true; break;
    case '8': number = (number*10) + 8; exponentSet?exponent++:true; break;
    case '9': number = (number*10) + 9; exponentSet?exponent++:true; break;
    case '.': case ',':
      exponentSet = true;
      exponent = 0; // May be: N36.513679 (not right, but it'll do)
      break;
    case '+':
      if (i>0) return false; // Sign only at start
      negative = false;
      break;
    case '-':
      if (i>0) return false; // Sign only at start
      negative = true;
      break;
    case '\0': /* Exit */
      /* Place decimal point in number */
      if (exponentSet && exponent > 0) number = number / pow (10, (double) exponent);
      if (negative) number = -number;
      *pDouble = number;
      return true; /* All done */
      break;
    default:
      return false;
    }
  }
  return false; /* Shouldn't get to here */
}

boolean isBearing (runStruct *pRun, const char *pArg)
{ double bearing = 0;
  int    exponent = 0;
  bool   negativeBearing = false;
  bool   exponentSet = false;
  char   compass = 'X';

  for (int i=0; ; i++)
  { switch (pArg[i])
    {
    case '0': bearing = (bearing*10) + 0; exponentSet?exponent++:true; break;
    case '1': bearing = (bearing*10) + 1; exponentSet?exponent++:true; break;
    case '2': bearing = (bearing*10) + 2; exponentSet?exponent++:true; break;
    case '3': bearing = (bearing*10) + 3; exponentSet?exponent++:true; break;
    case '4': bearing = (bearing*10) + 4; exponentSet?exponent++:true; break;
    case '5': bearing = (bearing*10) + 5; exponentSet?exponent++:true; break;
    case '6': bearing = (bearing*10) + 6; exponentSet?exponent++:true; break;
    case '7': bearing = (bearing*10) + 7; exponentSet?exponent++:true; break;
    case '8': bearing = (bearing*10) + 8; exponentSet?exponent++:true; break;
    case '9': bearing = (bearing*10) + 9; exponentSet?exponent++:true; break;
    case '.': case ',':
      exponentSet = true;
      exponent = 0; // May be: N36.513679 (not right, but it'll do)
      break;
    case '+':
      if (i>0) return false; // Sign only at start
      negativeBearing = false;
      break;
    case '-':
      if (i>0) return false; // Sign only at start
      negativeBearing = true;
      break;
    case 'n': case 'N': compass = 'N'; exponentSet = true; break; // Can support 36N513679 (not right, but it'll do)
    case 'e': case 'E': compass = 'E'; exponentSet = true; break;
    case 's': case 'S': compass = 'S'; exponentSet = true; break;
    case 'w': case 'W': compass = 'W'; exponentSet = true; break;
    case ' ':  /* Exit */
    case '\0': /* Exit */
      /* Fail, if the compass has not been set */
      if (compass == 'X') return false;

      /* Place decimal point in bearing */
      if (exponentSet && exponent > 0) bearing = bearing / pow (10, (double) exponent);

      /* Fix-up bearing so that it is in range zero to just under 360 */
      bearing = revolution (bearing);
      bearing = negativeBearing ? 360 - bearing : bearing;

      /* Fix-up bearing to Northings or Eastings only */
           if (compass == 'S') { bearing = 360 - bearing; compass = 'N'; }
      else if (compass == 'W') { bearing = 360 - bearing; compass = 'E'; }

      /* It's almost done, assign bearing to appropriate global */
           if (compass == 'N') pRun->latitude  = fixLatitude  (bearing); 
      else if (compass == 'E') pRun->longitude = fixLongitude (bearing);
      else return false;
      return true;  /* All done */
      break;
    default:
      return false;
    }
  }
  return false; /* Shouldn't get to here */
}

boolean isOffset (runStruct *pRun, const char *pArg)
{ int    colon = 0, number0 = 0, number1 = 0, number2 = 0;
  bool   negativeOffset = false;
  double returnOffset = 0.0;

  for (int i=0; ; i++)
  { switch (pArg[i])
    {
    case '0': number0 = (number0*10) + 0; break;
    case '1': number0 = (number0*10) + 1; break;
    case '2': number0 = (number0*10) + 2; break;
    case '3': number0 = (number0*10) + 3; break;
    case '4': number0 = (number0*10) + 4; break;
    case '5': number0 = (number0*10) + 5; break;
    case '6': number0 = (number0*10) + 6; break;
    case '7': number0 = (number0*10) + 7; break;
    case '8': number0 = (number0*10) + 8; break;
    case '9': number0 = (number0*10) + 9; break;
    case ':':
      number2 = number1;
      number1 = number0;
      number0 = 0;
      colon++;
      break;
    case '+':
      break;
    case '-':
      if (i>0) return false; // Sign only at start
      negativeOffset = true;
      break;
    case '\0': /* Exit */
           if (colon==0) returnOffset = number0/60.0;
      else if (colon==1) returnOffset = number1 + number0/60.0;
      else if (colon==2) returnOffset = number2 + number1/60.0 + number0/3600.0;
      else return false;
      if (negativeOffset) { returnOffset = -returnOffset; }
      pRun->offsetHour = returnOffset;
      return true; /* <-- Hopefully, exit here <-- */
      break;
    default:
      return false;
    }
  }
  return false; /* Shouldn't get here */
}


/*
** time_t converted to  struct tm. Using GMT (UTC) time.
*/
void myUtcTime (const time_t *pTimet, struct tm *pTm)
{
    /* Windows code: Start */
      #if defined _WIN32 || defined _WIN64
        errno_t err;
        err = _gmtime64_s (pTm, pTimet);
        if (err) { printf ("Error: Invalid Argument to _gmtime64_s ().\n"); exit (EXIT_ERROR); }
      #endif
    /* Windows code: End */

    /* Linux code: Start */
      #if defined __linux__
        gmtime_r (pTimet, pTm);
      #endif
    /* Linux code: End */
}

/*
** time_t converted to  struct tm. Using local time.
*/
void myLocalTime (const time_t *pTimet, struct tm *pTm)
{
    /* Windows code: Start */
      #if defined _WIN32 || defined _WIN64
        errno_t err;
        err = _localtime64_s (pTm, pTimet);
        if (err) { printf ("Error: Invalid Argument to _gmtime64_s ().\n"); exit (EXIT_ERROR); }
      #endif
    /* Windows code: End */

    /* Linux code: Start */
      #if defined __linux__
        localtime_r (pTimet, pTm);
      #endif
    /* Linux code: End */
}

/*
** A "struct tm" time can be different from UTC because of TimeZone
** or Daylight Savings.  This function gives the difference - unit: hours.
**
** Usage:
** Add the UTC bias to convert from local-time to UTC.
** ptrTm is set
*/
double getUtcBiasHours (const time_t *pTimet)
{
  struct tm utcTm;
  double utcBiasHours = 0.0;

  // Populate "struct tm" with UTC data for the given day
  myUtcTime (pTimet, &utcTm);

  /* Windows code: Start */
  #if defined _WIN32 || defined _WIN64
    struct tm utcNoonTm, localNoonTm;

    // Keep to the same day given, but go for noon. Daylight savings changes usually happen in the early hours.
    // mktime() changes the values in "struct tm", so I need to use a private one anyway.
    utcTm.tm_hour = 12;
    utcTm.tm_min  = 0;
    utcTm.tm_sec  = 0;

    // Now convert this time to time_t (which is always, by definition, UTC),
    // so I can run both of the two functions I can use that differentiate between timezones, using the same UTC moment.
    time_t noonTimet = mktime (&utcTm); // Unfortunately this is noonTimet is local time. It's the best I can do.
                                        // If it was UTC, all locations on earth are within the same day at noon.
                                        // (Because UTC = GMT.  Noon GMT +/- 12hrs nestles upto, but not across, the dateline)
                                        // Local-time 'days' (away from GMT) will probably cross the date line.

    myLocalTime (&noonTimet, &localNoonTm);  // Generate 'struct tm' for local time
    myUtcTime   (&noonTimet, &utcNoonTm);    // Generate 'struct tm' for UTC

    // This is not nice, but Visual Studio does not support "strftime(%z)" (get UTC bias) like linux does.
    // I'll figure out the UTC bias by comparing readings of local time to UTC for the same moment.

    // Although localTm and utcTm may be different, some secret magic ensures that mktime() will bring
    // them back to the same time_t value (as it should: they identify the same moment, just in different timezones).
    // I'll just have to work out the utcBias using the differing 'struct tm' values. It isn't pretty.

    utcBiasHours = (localNoonTm.tm_hour - utcNoonTm.tm_hour)
                 + (localNoonTm.tm_min  - utcNoonTm.tm_min) / 60.0;
    
    // The day may be different between the two times, especially if the local timezone is near the dateline.
    // Rollover of tm_yday (from 365 to 0) is a further problem, but no bias is ever more than 24 hours - that wouldn't make sense.

         if (localNoonTm.tm_year >  utcNoonTm.tm_year) utcBiasHours += 24.0; // Local time is in a new year, utc isn't:     so local time is a day ahead
    else if (localNoonTm.tm_year <  utcNoonTm.tm_year) utcBiasHours -= 24.0; // Local time is in old year, utc is new year: so local time is a day behind
    else utcBiasHours += (localNoonTm.tm_yday - utcNoonTm.tm_yday)*24.0;     // Year has not changed, so we can use tm_yday normaly
  #endif
  /* Windows code: End */

  /* Linux code: Start */
  #if defined __linux__
    char buffer [80];
    signed long int tmpLong = 0;

    mktime (&utcTm); // Let "mktime()" do it's magic

    strftime (buffer, 80, "%z", &utcTm);

    if (strlen (buffer) > 0 && myIsNumber (buffer))
    { tmpLong = atol (buffer);
      utcBiasHours = (int)(tmpLong/100 + (tmpLong%100)/60.0);
    }
  #endif
  /* Linux code: End */

  return utcBiasHours;
}

/*
** Debug: What's the time (include timezone)?
*/
void myDebugTime (const char * pTitleChar, const time_t *pTimet)
{ if (pRun->debug == ONOFF_ON)
  { struct tm tmpLocalTm, tmpUtcTm;
    char   utcBuffer [80];
    char localBuffer [80];

    // Convert current time to struct tm for UTC and local timezone
    myLocalTime (pTimet, &tmpLocalTm);
    myUtcTime   (pTimet, &tmpUtcTm);

    strftime (  utcBuffer, 80, "%c %Z", &tmpUtcTm);
    printf ("Debug: %s   utcTm:  %s\n", pTitleChar, utcBuffer);
    strftime (localBuffer, 80, "%c %Z", &tmpLocalTm);
    printf ("Debug: %s localTm:  %s\n", pTitleChar, localBuffer);

    // Difference between UTC and local TZ
    strftime (  utcBuffer, 80, "%Z",   &tmpUtcTm);
    strftime (localBuffer, 80, "%Z", &tmpLocalTm);
    printf ("Debug: %s UTC bias (add to %s to get %s) hours: %f\n", pTitleChar,  utcBuffer, localBuffer, getUtcBiasHours (pTimet));
  }
}

/*
** Return time_t of midnight UTC on the day given
** In effect, this function is going to shave upto 24 hours off a time
** returning 00:00 UTC on the day given.
*/
time_t getMidnightUTC (const time_t *pTimet, const runStruct *pRun)
{ struct tm tmpTm;

  // Convert target "struct tm" to time_t.  It'll be set to midnight local time, on the target day.
  myUtcTime (pTimet, &tmpTm);

  // Set to the start of the day
  tmpTm.tm_hour = 0;
  tmpTm.tm_min  = 0;
  tmpTm.tm_sec  = 0;

  // Fiddle with other "struct tm" fields to get things right
  tmpTm.tm_wday  = 0;   // mktime will ignore this when calculating time_t as it contradicts days and months
  tmpTm.tm_yday  = 0;   // mktime will ignore this when calculating time_t as it contradicts days and months
  tmpTm.tm_isdst = -1;  // -1 means: mktime() must work it out. 0=DST not in effect. 1=DST in effect. (Daylight Savings)

  // Shave off (add) UTC offset, so that time_t is converted from midnight local-time to midnight UTC on the target day
  tmpTm.tm_sec += myRound (pRun->utcBiasHours * 3600.0);

  // Let mktime() do it's magic
  return mktime (&tmpTm);  
}

/*
** A utility that helps determine if the given targetStruct is DAY or NIGHT
** This isn't the end of the matter, as DAY from yesterday or tomorrow
** could slip past midnight into the target day.  Near the dateline
** a UTC day features midday NIGHT. The sun is high near midnight UTC.
**
** THE TARGET DATE MUST BE THE CURRENT DATE (on 1st call, as this function iterates)
*/
OnOff isDay (const runStruct *pRun)
{ // If the time is before sunrise or after sunset, I need to know that
  // we're not in the daylight of either the neighbouring days.

  targetStruct yesterday;
  yesterday.twilightAngle = pRun->twilightAngle;
  yesterday.daysSince2000 = pRun->now2000 - 1;

  targetStruct today;
  today.twilightAngle = pRun->twilightAngle;
  today.daysSince2000 = pRun->now2000;

  targetStruct tomorrow;
  tomorrow.twilightAngle = pRun->twilightAngle;
  tomorrow.daysSince2000 = pRun->now2000 + 1;

  sunriset (pRun, &yesterday);
  sunriset (pRun, &today);
  sunriset (pRun, &tomorrow);

  yesterday.southHourUTC -= 24.0;
   tomorrow.southHourUTC += 24.0;

  // Get current time (hours from UTC midnight of current day).
  // Difftime() returns "seconds", we want "hours".
  time_t midnightUTC = getMidnightUTC (&pRun->nowTimet, pRun);
  double nowHourUTC = difftime (pRun->nowTimet, midnightUTC) / (3600.0);

  // Get the time (0-24) of sunrise and set, of the three days
  double riseHourUTCYesterday = getOffsetRiseHourUTC (pRun, &yesterday);
  double  setHourUTCYesterday =  getOffsetSetHourUTC (pRun, &yesterday);
  double riseHourUTCToday     = getOffsetRiseHourUTC (pRun, &today);
  double  setHourUTCToday     =  getOffsetSetHourUTC (pRun, &today);
  double riseHourUTCTomorrow  = getOffsetRiseHourUTC (pRun, &tomorrow);
  double  setHourUTCTomorrow  =  getOffsetSetHourUTC (pRun, &tomorrow);

  // Figure out if we're between sunrise and sunset (with offset) of any of the three days
  return
  (  (nowHourUTC >= riseHourUTCYesterday && nowHourUTC <= setHourUTCYesterday)
  || (nowHourUTC >= riseHourUTCToday     && nowHourUTC <= setHourUTCToday    )
  || (nowHourUTC >= riseHourUTCTomorrow  && nowHourUTC <= setHourUTCTomorrow )
  ) ? ONOFF_ON : ONOFF_OFF;
}

/*
**
** >>>>> main() <<<<<
**
*/

int main (int argc, char *argv[])
{
  pRun = &gRun;

  // Set Default values
  pRun->latitude          = DEFAULT_LATITUDE;
  pRun->longitude         = DEFAULT_LONGITUDE;
  pRun->offsetHour        = 0.0;
  pRun->utcBiasHours      = 0.0;
  pRun->functionVersion   = ONOFF_OFF;
  pRun->functionUsage     = ONOFF_OFF;
  pRun->functionWait      = ONOFF_OFF;
  pRun->functionPoll      = ONOFF_OFF;
  pRun->functionReport    = ONOFF_OFF;
  pRun->functionList      = ONOFF_OFF;
  pRun->debug             = ONOFF_OFF;
  pRun->reportSunrise     = ONOFF_OFF;
  pRun->reportSunset      = ONOFF_OFF;
  pRun->utc               = ONOFF_OFF;

  pRun->twilightAngle     = TWILIGHT_ANGLE_DAYLIGHT;

  // For target year
  int yearInt = NOT_SET;
  int  monInt = NOT_SET;
  int mdayInt = NOT_SET;

  // Return code
  int exitCode = EXIT_OK;

  //
  // DO NOT PUT CODE BEFORE "debug" ARGUMENT IS KNOWN (UNTIL AFTER COMMAND LINE PARSED)
  //

  /*
  **
  ** Parse command line arguments 
  **
  */

  // Change to all lowercase, just to make life easier ... 
  myToLower (argc, argv); 

  // Look for debug being activated ...
  for (int i=1; i < argc; i++) if (!strcmp (argv [i], "debug")) pRun->debug = ONOFF_ON;

  // For each argument
  for (int i=1; i < argc; i++)
  { 
    char *arg = argv[i];

    // Echo argument, if in debug
    if (pRun->debug == ONOFF_ON) printf ("Debug: argv[%d]: >%s<\n", i, arg);

    // Strip any hyphen from arguments, but not negative signs of numbers
    if (arg[0] == '-' && arg[1] != '\0' && !isdigit(arg[1])) *arg++;

    // Normal help or version info
         if   (!strcmp (arg, "v")             ||
               !strcmp (arg, "version"))      pRun->functionVersion = ONOFF_ON;
    else if   (!strcmp (arg, "nv")            ||
               !strcmp (arg, "noversion"))    pRun->functionVersion = ONOFF_OFF;

    else if   (!strcmp (arg, "?")             ||
               !strcmp (arg, "usage")         ||
               !strcmp (arg, "h")             ||
               !strcmp (arg, "help"))         pRun->functionUsage = ONOFF_ON;
    else if   (!strcmp (arg, "nh" )           ||
               !strcmp (arg, "nousage")       ||
               !strcmp (arg, "nohelp"))       pRun->functionUsage = ONOFF_OFF;

    // Major Options
    else if   (!strcmp (arg, "wait"))         pRun->functionWait   = ONOFF_ON;
    else if   (!strcmp (arg, "poll"))         pRun->functionPoll   = ONOFF_ON;
    else if   (!strcmp (arg, "report"))       pRun->functionReport = ONOFF_ON;
    else if   (!strcmp (arg, "list"))         { // List should have a parameter attached
                                                pRun->functionList = ONOFF_ON;
                                                if (i+1<argc && myIsSignedNumber (argv[i+1]))
                                                  pRun->listDays = atoi (argv [++i]); // Note: ++i
                                                else
                                                  pRun->listDays = DEFAULT_LIST;
                                              }

    // Minor Options

    // Print output in GMT or local-time
    else if   (!strcmp (arg, "gmt")           ||
               !strcmp (arg, "utc"))          pRun->utc = ONOFF_ON;
    else if   (!strcmp (arg, "nogmt")         ||
               !strcmp (arg, "noutc"))        pRun->utc = ONOFF_OFF;

    // Debug mode
    else if   (!strcmp (arg, "debug"))        pRun->debug = ONOFF_ON;
    else if   (!strcmp (arg, "nodebug"))      pRun->debug = ONOFF_OFF;

    // Poll. Is it DAY or NIGHT?
    else if   (!strcmp (arg, "e")             ||
               !strcmp (arg, "er")            ||
               !strcmp (arg, "exit")          ||
               !strcmp (arg, "poll")          ||
               !strcmp (arg, "exitreport"))   pRun->functionPoll = ONOFF_ON;
    else if   (!strcmp (arg, "ne")            ||
               !strcmp (arg, "ner")           ||
               !strcmp (arg, "noexit")        ||
               !strcmp (arg, "nopoll")        ||
               !strcmp (arg, "noexitreport")) pRun->functionPoll = ONOFF_OFF;

    // Specify twilight angle
    else if   (!strcmp (arg, "sun")           ||
               !strcmp (arg, "day")           ||
               !strcmp (arg, "light")         ||
               !strcmp (arg, "normal")        ||
               !strcmp (arg, "visible")       ||
               !strcmp (arg, "daylight"))     pRun->twilightAngle = TWILIGHT_ANGLE_DAYLIGHT;
    else if   (!strcmp (arg, "civil")         ||
               !strcmp (arg, "civ"))          pRun->twilightAngle = TWILIGHT_ANGLE_CIVIL;
    else if   (!strcmp (arg, "nautical")      ||
               !strcmp (arg, "nau")           ||
               !strcmp (arg, "naut"))         pRun->twilightAngle = TWILIGHT_ANGLE_NAUTICAL;
    else if   (!strcmp (arg, "astronomical")  ||
               !strcmp (arg, "ast")           ||
               !strcmp (arg, "astr")          ||
               !strcmp (arg, "astro"))        pRun->twilightAngle = TWILIGHT_ANGLE_ASTRONOMICAL;
    else if   (!strcmp (arg, "a")             ||
               !strcmp (arg, "angle")         ||
               !strcmp (arg, "twilightangle") ||
               !strcmp (arg, "twilight"))     { if (i+1<argc && myIsSignedFloat (argv[i+1]))
                                                  pRun->twilightAngle = atof (argv [++i]); // Note: "++i"
                                                else
                                                  pRun->twilightAngle = TWILIGHT_ANGLE_DAYLIGHT;
                                              }

    // Specify target date (default is today)
    else if   (!strcmp (arg, "y") && i+1<argc && myIsNumber (argv[i+1])) yearInt = atoi (argv [++i]); // Note: "++i"
    else if   (!strcmp (arg, "m") && i+1<argc && myIsNumber (argv[i+1]))  monInt = atoi (argv [++i]); // Note: "++i"
    else if   (!strcmp (arg, "d") && i+1<argc && myIsNumber (argv[i+1])) mdayInt = atoi (argv [++i]); // Note: "++i"

    // Specify fixed duration offset 
    else if   (!strcmp (arg, "o")             ||
               !strcmp (arg, "off")           ||
               !strcmp (arg, "offset"))       { if (i+1<argc && isOffset (pRun, argv[i+1])) { ++i; } /* Functionality in "isOffset()" */
                                              }

    // Specify if sunrise and/or sunset timings a required.
    else if   (!strcmp (arg, "sunrise")       ||
               !strcmp (arg, "rise")          ||
               !strcmp (arg, "dawn")          ||
               !strcmp (arg, "sunup")         ||
               !strcmp (arg, "up"))           pRun->reportSunrise = ONOFF_ON;
    else if   (!strcmp (arg, "sunset")        ||
               !strcmp (arg, "set")           ||
               !strcmp (arg, "dusk")          ||
               !strcmp (arg, "sundown")       ||
               !strcmp (arg, "down"))         pRun->reportSunset = ONOFF_ON;

    // Specify latitude and longitude - quite complex, so I've handled it elsewhere
    else if   (isBearing (pRun, arg)) {} /* Functionality in "isBearing()" */

    // Don't know what in on the command line, so complain.
    else printf ("Error: Unknown command-line argument: %s\n", arg);
  }


  /*
  **
  ** Analyse command line, check for errors and fill in gaps
  **
  */

  if (pRun->debug == ONOFF_ON)
  { if (pRun->utc == ONOFF_ON)
      printf ("Debug: All output to use UTC.\n");
    else
      printf ("Debug: All output to use local timezone (nogmt).\n");
  }


  /*
  ** Get: current time (time_t is UTC, always) and bias of local-time from UTC
  */

  time (&pRun->nowTimet);
  if (pRun->debug == ONOFF_ON) myDebugTime ("Now", &pRun->nowTimet);

  pRun->utcBiasHours = getUtcBiasHours (&pRun->nowTimet);
  if (pRun->debug == ONOFF_ON) printf ("Debug: UTC Bias (hours): %f\n", pRun->utcBiasHours);

  pRun->now2000 = daysSince2000 (&pRun->nowTimet);
  if (pRun->debug == ONOFF_ON) printf ("Debug: Now: Days since 2000: %lu\n", pRun->now2000);


  /*
  ** Get: Target Date
  */

  { struct tm targetTm;

    // Populate targetTm :-
    // Get the target day (as "struct tm") for "now" - the default
    // I'll get the local-time day, as it'll make sense with the user, unless UTC was asked for
    //

    if (pRun->utc == ONOFF_ON)
      myUtcTime   (&pRun->nowTimet, &targetTm); // User wants UTC
    else
      myLocalTime (&pRun->nowTimet, &targetTm); // User gets local timezone

    //
    // Parse "target" year, month and day [adjust target]
    //

    if (yearInt != NOT_SET)
    { if (yearInt < 0 || yearInt > 99)
      { printf ("Error: \"Year\" must be between 0 and 99: %u\n", yearInt); 
        exit (EXIT_ERROR);
      }
      targetTm.tm_year = yearInt + 100;
    }
    if (pRun->debug == ONOFF_ON) printf ("Debug: Target  year set to: %u\n", targetTm.tm_year);

    if (monInt != NOT_SET)
    { if (monInt < 1 || monInt > 12)
      { printf ("Error: \"Month\" must be between 1 and 12: %u\n", monInt); 
        exit (EXIT_ERROR);
      }
      targetTm.tm_mon = monInt-1; // We need month 0 to 11, not 1 to 12
    }
    if (pRun->debug == ONOFF_ON) printf ("Debug: Target   mon set to: %u\n", targetTm.tm_mon);
  
    if (mdayInt != NOT_SET)
    { if (mdayInt < 1 || mdayInt > 31)
      { printf ("Error: \"Day of month\" must be between 1 and 31: %u\n", mdayInt);
        exit (EXIT_ERROR);
      }
      targetTm.tm_mday = mdayInt;
    }
    if (pRun->debug == ONOFF_ON) printf ("Debug: Target  mday set to: %u\n", targetTm.tm_mday);
  
    // Set target time to the start of the UTC day
    targetTm.tm_hour = 0;
    targetTm.tm_min  = 0;
    targetTm.tm_sec  = 0;

    // Fiddle with other "struct tm" fields to get things right
    targetTm.tm_wday  = 0;   // mktime will ignore this when calculating time_t as it contradicts days and months
    targetTm.tm_yday  = 0;   // mktime will ignore this when calculating time_t as it contradicts days and months
    targetTm.tm_isdst = -1;  // -1 means: mktime() must work it out. 0=DST not in effect. 1=DST in effect. (Daylight Savings)

    // Convert target "struct tm" to time_t.  It'll be set to midnight local time, on the target day.
    pRun->targetTimet = mktime (&targetTm);  

    // Shave off (add) UTC offset, so that time_t is converted from midnight local-time to midnight UTC on the target day
    targetTm.tm_sec += myRound (pRun->utcBiasHours * 60.0 * 60.0);

    // Adjustment below suggested by Phos Quartz on sourceforge.net to
    // address the case when invocation time and target time are not
    // in the same timezone (i.e. standard time vs daylight time)
    // see https://sourceforge.net/p/sunwait4windows/discussion/general/thread/98fc17dd5f/
    struct tm localTm;
    myLocalTime (&pRun->nowTimet, &localTm);
    int isdst = localTm.tm_isdst;
    targetTm.tm_isdst = isdst;

    // All done
    pRun->targetTimet = mktime (&targetTm);  // <<<<<< The important bit done <<< targetTimet is set to midnight UTC

    if (pRun->debug == ONOFF_ON) myDebugTime ("Target", &pRun->targetTimet);
  }

  pRun->target2000 = daysSince2000 (&pRun->targetTimet);
  if (pRun->debug == ONOFF_ON) printf ("Debug: Target: Days since 2000: %lu\n", pRun->target2000);

  /*
  ** Check: Latitude and Longitude
  */

  if (pRun->latitude == NOT_SET)
  { if (pRun->debug == ONOFF_ON) printf ("Debug: latitude not set. Default applied.\n"); 
    pRun->latitude  = DEFAULT_LATITUDE; /* The Buttercross, Bingham, England */
  }

  if (pRun->longitude == NOT_SET) 
  { if (pRun->debug == ONOFF_ON) printf ("Debug: longitude not set. Default applied.\n"); 
    pRun->longitude = DEFAULT_LONGITUDE; /* The Buttercross, Bingham, England */
  }

  // /* Co-ordinates must be in 0 to 360 range */           // IFC 2014-12-02: Removed as done in isBearing()
  // pRun->latitude  = revolution (pRun->latitude);   // IFC 2014-12-02: Removed as done in isBearing()
  // pRun->longitude = revolution (pRun->longitude);  // IFC 2014-12-02: Removed as done in isBearing()

  if (pRun->debug == ONOFF_ON)
  {  printf ("Debug: Co-ordinates -  Latitude: %fN\n", pRun->latitude);
     printf ("Debug: Co-ordinates - Longitude: %fE\n", pRun->longitude);
  }

  /*
  ** Check: Twilight Angle 
  */

  if (pRun->twilightAngle == NOT_SET)
  { if (pRun->debug == ONOFF_ON) printf ("Debug: twilight angle not set. Default: daylight.\n");
    pRun->twilightAngle = TWILIGHT_ANGLE_DAYLIGHT;
  }

  if (pRun->twilightAngle <= -90 || pRun->twilightAngle >= 90)
  {
    printf ("Error: Twilight angle must be between -90 and +90 (-ve = below horizon), your setting: %f\n", pRun->twilightAngle);
    pRun->twilightAngle = TWILIGHT_ANGLE_DAYLIGHT;
  }

  if (pRun->debug == ONOFF_ON)
  {       if (pRun->twilightAngle == TWILIGHT_ANGLE_DAYLIGHT)     printf ("Debug: Twilight - Daylight\n");
     else if (pRun->twilightAngle == TWILIGHT_ANGLE_CIVIL)        printf ("Debug: Twilight - Civil\n");
     else if (pRun->twilightAngle == TWILIGHT_ANGLE_NAUTICAL)     printf ("Debug: Twilight - Nautical\n");
     else if (pRun->twilightAngle == TWILIGHT_ANGLE_ASTRONOMICAL) printf ("Debug: Twilight - Astronomical\n");
     else printf ("Debug: Twilight - Custom angle (degrees): %f\n", pRun->twilightAngle);
  }

  /*
  ** Check: Offset
  */

  if (pRun->debug == ONOFF_ON) printf ("Debug: User specified offset (hours): %f\n", pRun->offsetHour);


  /*
  ** Check: Major-option or Function
  */

  // IF no function requested THEN default to "usage"
  if 
  (  pRun->functionList    == ONOFF_OFF
  && pRun->functionPoll    == ONOFF_OFF
  && pRun->functionUsage   == ONOFF_OFF
  && pRun->functionVersion == ONOFF_OFF
  && pRun->functionWait    == ONOFF_OFF
  && pRun->functionReport  == ONOFF_OFF
  )  pRun->functionUsage = ONOFF_ON;

  /*
  ** Check: Sunrise or sunset.  IF neither set THEN set both
  */

  if (pRun->reportSunrise == ONOFF_OFF && pRun->reportSunset == ONOFF_OFF)
  { pRun->reportSunrise = ONOFF_ON;
    pRun->reportSunset  = ONOFF_ON;
  }

  /*
  ** OK - we're all done figuring out what to do - let's do it
  */

  if (pRun->functionVersion == ONOFF_ON) 
  { if (pRun->debug == ONOFF_ON) printf ("Debug: Function selected: Version\n");
    print_version (); 
    exitCode = EXIT_OK; 
  }

  if (pRun->functionUsage == ONOFF_ON) 
  { if (pRun->debug == ONOFF_ON) printf ("Debug: Function selected: Usage\n");
    print_usage (); 
    exitCode = EXIT_OK; 
  }

  if (pRun->functionReport == ONOFF_ON)
  { if (pRun->debug == ONOFF_ON) printf ("Debug: Function selected: Report\n");
    generate_report (pRun);
    exitCode = EXIT_OK; 
  }

  if (pRun->functionList == ONOFF_ON)  
  { if (pRun->debug == ONOFF_ON) printf ("Debug: Function selected: List\n");
    print_list (pRun);  
    exitCode = EXIT_OK; 
  }

  if (pRun->functionWait == ONOFF_ON)
  { if (pRun->debug == ONOFF_ON) printf ("Debug: Function selected: Wait\n");
    exitCode = wait (pRun); 
  }

  if (pRun->functionPoll == ONOFF_ON)  
  { if (pRun->debug == ONOFF_ON) printf ("Debug: Function selected: Poll\n");
    exitCode = poll (pRun); 
         if (exitCode == EXIT_DAY)   printf ("DAY\n");
    else if (exitCode == EXIT_NIGHT) printf ("NIGHT\n");
    else if (exitCode == EXIT_OK)    printf ("OK\n");
    else if (exitCode == EXIT_ERROR) printf ("ERROR\n");
  }

  exit (exitCode);
}

/*
** Simply check if we think now/current-time is night OR day (day includes twilight)
*/
inline int poll (const runStruct *pRun)
{ return isDay (pRun) == ONOFF_ON ? EXIT_DAY : EXIT_NIGHT;
}

/*
** Wait until sunrise or sunset occurs on the target day.
** That sounds simple, until you start to consider longitudes near the dateline.
** Midnight UTC can lands later and later within a local day for large longitudes.
** Latitudes heading towards the poles can either shrink the day length to nothing or the whole day, depending on the season.
** A user-specified offset messes around with daylength too.
** Exit immediately if its a polar day or midnight sun (including offset).
*/
int wait (const runStruct *pRun)
{
  /*
  ** Calculate start/end of twilight for given twilight type/angle.
  ** For latitudes near poles, the sun might not pass through specified twilight angle that day. 
  ** For big longitudes, it's quite likely the sun is up at midnight UTC: this means we have to calculate successive days.
  */

  targetStruct yesterday;
  yesterday.twilightAngle = pRun->twilightAngle;
  yesterday.daysSince2000 = pRun->target2000 - 1;

  targetStruct today;
  today.twilightAngle = pRun->twilightAngle;
  today.daysSince2000 = pRun->target2000;

  targetStruct tomorrow;
  tomorrow.twilightAngle = pRun->twilightAngle;
  tomorrow.daysSince2000 = pRun->target2000 + 1;

  sunriset (pRun, &yesterday);
  sunriset (pRun, &today);
  sunriset (pRun, &tomorrow);

  yesterday.southHourUTC -= 24;
   tomorrow.southHourUTC += 24;

  // Calculate duration (seconds) from "now" to "midnight UTC on the target day". [difftime (end, beginning)]
  long waitMidnightUTC = static_cast <long> (difftime (pRun->targetTimet, pRun->nowTimet));

  // Calculate duration to wait for each day's rise and set (seconds)
  // (targetTimet is set to midnight on the target day)
  long waitRiseYesterday = waitMidnightUTC + static_cast <long> ( 3600.0 * getOffsetRiseHourUTC (pRun, &yesterday) );
  long waitSetYesterday  = waitMidnightUTC + static_cast <long> ( 3600.0 * getOffsetSetHourUTC  (pRun, &yesterday) );
  long waitRiseToday     = waitMidnightUTC + static_cast <long> ( 3600.0 * getOffsetRiseHourUTC (pRun, &today)     );
  long waitSetToday      = waitMidnightUTC + static_cast <long> ( 3600.0 * getOffsetSetHourUTC  (pRun, &today)     );
  long waitRiseTomorrow  = waitMidnightUTC + static_cast <long> ( 3600.0 * getOffsetRiseHourUTC (pRun, &tomorrow)  );
  long waitSetTomorrow   = waitMidnightUTC + static_cast <long> ( 3600.0 * getOffsetSetHourUTC  (pRun, &tomorrow)  );

  // Determine next sunrise and sunset 
  // (we may be in DAY, so the next event is sunset - followed by sunrise)

  long waitRiseSeconds = 0;
  long waitSetSeconds = 0;

  if      (waitRiseYesterday > 0) { waitRiseSeconds = waitRiseYesterday; waitSetSeconds = waitSetYesterday; }
  else if (waitSetYesterday  > 0) { waitRiseSeconds = waitRiseToday;     waitSetSeconds = waitSetYesterday; }
  else if (waitRiseToday     > 0) { waitRiseSeconds = waitRiseToday;     waitSetSeconds = waitSetToday;     }
  else if (waitSetToday      > 0) { waitRiseSeconds = waitRiseTomorrow;  waitSetSeconds = waitSetToday;     }
  else if (waitRiseTomorrow  > 0) { waitRiseSeconds = waitRiseTomorrow;  waitSetSeconds = waitSetTomorrow;  }
  else if (waitSetTomorrow   > 0) { waitRiseSeconds = 0;                 waitSetSeconds = waitSetTomorrow;  }

  // Is it currently DAY or NIGHT?

  OnOff isDay = ONOFF_OFF;

  if      (waitRiseYesterday > 0) { isDay = ONOFF_OFF; }
  else if (waitSetYesterday  > 0) { isDay = ONOFF_ON;  }
  else if (waitRiseToday     > 0) { isDay = ONOFF_OFF; }
  else if (waitSetToday      > 0) { isDay = ONOFF_ON;  }
  else if (waitRiseTomorrow  > 0) { isDay = ONOFF_OFF; }
  else if (waitSetTomorrow   > 0) { isDay = ONOFF_ON;  }

  // Determine if the day is "normal" (where the rises and sets) or "polar" ("midnight sun" or "polar night")

  bool exitPolar = false;

  if      (waitSetYesterday > 0) { double diurnalArc = diurnalArcWithOffset (pRun, &yesterday); exitPolar = diurnalArc <= 0.0 || diurnalArc >= 24.0; }
  else if (waitSetToday     > 0) { double diurnalArc = diurnalArcWithOffset (pRun, &today);     exitPolar = diurnalArc <= 0.0 || diurnalArc >= 24.0; }
  else                           { double diurnalArc = diurnalArcWithOffset (pRun, &tomorrow);  exitPolar = diurnalArc <= 0.0 || diurnalArc >= 24.0; }

  if (exitPolar) 
  { if (pRun->debug == ONOFF_ON) printf ("Debug: Polar region or large offset: No sunrise today, there's nothing to wait for!\n");
    return EXIT_ERROR;
  }

  // Get next rise or set time UNLESS the opposite event happens first (unless less than 6 hours to required event)
  // IF both rise and set requested THEN wait for whichever is next

  long waitSeconds = 0;

  if (pRun->reportSunrise == ONOFF_ON  && pRun->reportSunset == ONOFF_OFF)
  { if (isDay == ONOFF_OFF || waitRiseSeconds < 6*60*60) waitSeconds = waitRiseSeconds; }
  else if (pRun->reportSunrise == ONOFF_OFF && pRun->reportSunset == ONOFF_ON)
  { if (isDay == ONOFF_ON || waitSetSeconds < 6*60*60)  waitSeconds = waitSetSeconds; }
  else
  { waitSeconds = waitRiseSeconds < waitSetSeconds ? waitRiseSeconds : waitSetSeconds; }

  // Don't wait if event has passed (or next going to occur soon [6hrs])
  if (waitSeconds <= 0) 
  { if (pRun->debug == ONOFF_ON) printf ("Debug: Event already passed today, can't wait for that!\n");
    return EXIT_ERROR;
  }

  //
  // In debug mode, we don't want to wait for sunrise or sunset. Wait a minute instead.
  //

  if (pRun->debug == ONOFF_ON)
  { printf("Debug: Wait reduced from %li to 10 seconds.\n", waitSeconds);
    waitSeconds = 10;
  }
  else if (pRun->functionPoll == ONOFF_ON) waitSeconds += 60; // Make more sure that a subsequent POLL works properly (wink ;-)
  
  /*
  ** Sleep (wait) until the event is expected
  */

  /* Windows code: Start */
  #if defined _WIN32 || defined _WIN64
    waitSeconds *= 1000; // Convert hours to milliseconds for Windows
    Sleep ((DWORD) waitSeconds); // Windows-only . waitSec is tested positive or zero
  #endif
  /* Windows code: End */

  /* Linux code: Start */
  #if defined __linux__
    sleep (waitSeconds);    // Linux-only (seconds OK)
  #endif
  /* Linux code: End */

  return EXIT_OK;
}
