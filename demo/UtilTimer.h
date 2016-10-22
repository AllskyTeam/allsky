// timer interface
// author: zhihui.zheng@yahoo.com
// 2009-5-12
// all right reserved

#ifndef _I_TIMER_H_
#define _I_TIMER_H_

// Interface defines
typedef enum
{
  TIMER_ONCE = 0,
  TIMER_LOOP = 1
}TimerType;

struct TimerInfo
{
  unsigned long expires; // in ms
  TimerType type;
  void * data;
  void (*callback)(void * pdata);
};

typedef void * TimerHandler;

// Interface functions
int UtilTimer_Init(void);
int UtilTimer_Term(void);
TimerHandler UtilTimer_AddTimer(struct TimerInfo * timer);
int UtilTimer_RemoveTimer(TimerHandler handler);
int UtilTimer_StartTimer(TimerHandler handler);
int UtilTimer_StopTimer(TimerHandler handler);
int UtilTimer_ResetTimer(TimerHandler handler, struct TimerInfo * info);

#endif
