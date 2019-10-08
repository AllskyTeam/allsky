# sunwait

Sunwait calculates sunrise or sunset times with civil, nautical, astronomical and custom twilights. 

It is intended for use in home automation with Windows Task Scheduler or cron. Use it to turn lights on *before* it gets dark! The program can wait from invocation until the event specified on the command line occurs or it can return immediately indicating if it is day or night. It's best to schedule Sunwait to run a little before the earliest opportunity for the event to occur each year - ie dusk range is 3:30pm to 10:30pm here, so it reasonable to schedule a dusk task at 3pm and allow Sunwait to pause the task for between 30mins and 7 and a half hours. If you scheduled the task for 6pm, then your lights will come on no earlier than 6pm.

The sun's position is calculated using time, and position - latitude and longitude should be specified on the command line.

Features: 

* Calculates sunrise and sunset for given coordinates
* Can wait for sunrise/sunset, or return DAY or NIGHT codes
* Works with Windows Task Scheduler (or cron)
* Supports custom twilight angles
* Used to automate domestic lighting with Arduino transmitter and radio controlled sockets

History: 

This project is a "reclaimed fork". I (Dan Risacher) wrote the original version around 2000, and maintained it until 2004.  In 2013, Ian Craig made a version that compiled cleanly on Windows and added some useful features.  In 2019, I'm moving it to GitHub as a better collaborative development platform.  If you have feature requests or issues, please report them here. 
