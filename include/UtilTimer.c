// timer implementation
// author: zhihui.zheng@yahoo.com
// 2009-5-12
// all right reserved


#include <stdio.h>
#include <stdlib.h>
#include <sys/time.h>
#include <sys/types.h>
#include <unistd.h>
#include <pthread.h>

#include "UtilTimer.h"

// Local define and static variables
#define DEFAULT_TIMER_INTERVAL 50
#define REAL_TIMER_INTERVAL (DEFAULT_TIMER_INTERVAL*1000)
#define TIMER_COUNT_MAX 50
#define FOREACHITEM(item, listhead, nextmember) \
        for ((item)=(listhead) ; \
             (item) != NULL; \
             (item) = (item)->nextmember) 

typedef enum
{
  TIMER_STATE_STOP = 0,
  TIMER_STATE_RUN
}TimerState;

struct _TimerList
{
  struct _TimerList * prev;
  struct _TimerList * next;
  TimerState state;
  struct TimerInfo timer;
  unsigned long timeLeft;
};
typedef struct _TimerList TimerList;

static TimerList * listHead, * listEnd;
static int timerCount = 0;
static int TimerInited = 0;
static pthread_mutex_t timerMutex;
static pthread_t timerPid;

// Local functions
static void * OnTimeout(void *);
static void RemoveAllTimers(void);
static void * AddTimer(struct TimerInfo * timer);
static int RemoveTimer(TimerList * handler);

//Public interface implemention
int UtilTimer_Init(void)
{
  if (TimerInited)
  {
    printf("Timer is already inited\n");
    return -1;
  }

  if (timerCount)
  {
    RemoveAllTimers();
  }

  pthread_mutex_lock(&timerMutex);
  TimerInited = 1;
  pthread_create(&timerPid, 0, OnTimeout, NULL);
  listHead = NULL;
  listEnd = NULL;
  pthread_mutex_unlock(&timerMutex);
  return 0;
}

int UtilTimer_Term(void)
{
  if (!TimerInited)
  {
    printf("Timer already terminated\n");
    return -1;
  }

  pthread_mutex_lock(&timerMutex);
  TimerInited = 0;
  pthread_mutex_unlock(&timerMutex);

  pthread_join(timerPid, NULL);
  RemoveAllTimers();
  timerCount = 0;
  return 0;
}

TimerHandler UtilTimer_AddTimer(struct TimerInfo * timer)
{
  return AddTimer(timer);;
}

int UtilTimer_RemoveTimer(TimerHandler handler)
{
  TimerList * item;
  item = (TimerList *)handler;

  return RemoveTimer(item);
}

int UtilTimer_StartTimer(TimerHandler handler)
{
  TimerList * item;

  pthread_mutex_lock(&timerMutex);
  FOREACHITEM(item, listHead, next)
  {
    if ((void *)item == handler)
    {
      item->state = TIMER_STATE_RUN;
      break;
    }
  }
  pthread_mutex_unlock(&timerMutex);
  return 0;
}

int UtilTimer_StopTimer(TimerHandler handler)
{
  TimerList * item;

  pthread_mutex_lock(&timerMutex);
  FOREACHITEM(item, listHead, next)
  {
    if ((void *)item == handler)
    {
      item->state = TIMER_STATE_STOP;
      break;
    }
  }
  pthread_mutex_unlock(&timerMutex);
  return 0;
}

int UtilTimer_ResetTimer(TimerHandler handler, struct TimerInfo * info)
{
  TimerList * item;

  pthread_mutex_lock(&timerMutex);
  FOREACHITEM(item, listHead, next)
  {
    if ((void *)item == handler)
    {
      item->timer.expires = info->expires;
      item->timer.type = info->type;
      item->timer.data = info->data;
      item->timer.callback = info->callback;
      break;
    }
  }
  pthread_mutex_unlock(&timerMutex);
  return 0;
}

///////////// local function
static void * OnTimeout(void * pdata)
{
  struct timeval prev, cur, tm;
  unsigned int delay;
  TimerList * item;

  gettimeofday(&cur, 0);
  while (TimerInited)
  {
    tm.tv_sec = 0;
    tm.tv_usec = REAL_TIMER_INTERVAL;
    prev.tv_sec = cur.tv_sec;
    prev.tv_usec = cur.tv_usec;

    select(0, 0, 0, 0, &tm);

    gettimeofday(&cur, 0);
    delay = (cur.tv_sec - prev.tv_sec) * 1000 + \
            (cur.tv_usec - prev.tv_usec) / 1000;
    pthread_mutex_lock(&timerMutex);
    FOREACHITEM(item, listHead, next) {
      if (item->state == TIMER_STATE_STOP)
      {
        continue;
      }

      if ((item->timeLeft) < delay)
      {
        item->timeLeft = 0;
      }
      else
      {
        item->timeLeft -= delay;
      }
      if (item->timeLeft == 0)
      {
        item->timer.callback(item->timer.data);

        if (item->timer.type == TIMER_ONCE)
        {
          item->state = TIMER_STATE_STOP;
        }
        else
        {
          item->timeLeft = item->timer.expires;
        }
      }
    }
    pthread_mutex_unlock(&timerMutex);
  }
  return NULL;
}

static int RemoveTimer(TimerList * handler)
{
  TimerList * item;
  pthread_mutex_lock(&timerMutex);
  if (handler == listHead)
  {                                                    
    listHead = listHead->next;
    free(handler);                                     
    timerCount--;
    pthread_mutex_unlock(&timerMutex);                 
    return 0;
  }                                                    
  FOREACHITEM(item, listHead, next)
  {     
    if ((void *)(item->next) == handler)
    {   
      if (item->next != listEnd)                       
      { 
        item->next = (item->next)->next;
        free(handler);                                 
        timerCount--;                                  
        break;                                         
      }
      else                                             
      {                                                
        item->next = NULL;                             
        free(handler);
        listEnd = item;                                
        timerCount--;                                  
        break;
      }
    }                                                  
  }
  pthread_mutex_unlock(&timerMutex);
  return 0;
}

static void RemoveAllTimers()
{
  TimerList * item;

  item = listHead;
  pthread_mutex_lock(&timerMutex);
  while (item != NULL)
  {
    listHead = item->next;
    free(item);
    item = listHead;
  }
  listHead = NULL;
  listEnd = NULL;
  timerCount = 0;
  pthread_mutex_unlock(&timerMutex);
}

static void * AddTimer(struct TimerInfo * timer)
{
  TimerList * item;
  if (timerCount == TIMER_COUNT_MAX)
  {
    printf("Timer count excceed!\n");
    return NULL;
  }

  item = (TimerList *)malloc(sizeof(TimerList));
  item->state = TIMER_STATE_STOP;
  item->timer.expires = timer->expires;
  item->timer.type = timer->type;
  item->timer.data = timer->data;
  item->timer.callback = timer->callback;
  item->timeLeft = item->timer.expires;

  pthread_mutex_lock(&timerMutex);
  if (listHead == NULL)
  {
    listHead = item;
    listHead->next = listEnd;
    listEnd = listHead;
  }
  else
  {
    listEnd->next = item;
    listEnd = item;
    listEnd->next = NULL;
  }
  timerCount++;
  pthread_mutex_unlock(&timerMutex);
  return (void *)item;
}
