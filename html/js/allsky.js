"use strict";

// Timer intervals.  Make global to allow changing.
let allskystatus_interval = 10 * 1000;		// it's decreased when starting / stopping Allsky
let cpuload_interval = 10 * 1000;
let cputemp_interval = 10 * 1000;
let memory_interval = 10 * 1000;
let throttle_interval = 30 * 1000;

class ALLSKY {
    #timers  = {};
    #allskyPage = '';
    #pageTimers = {
        all: {
            timers: {
                allskystatus: {
                    url: 'includes/uiutil.php?request=AllskyStatus',
                    interval: allskystatus_interval,
                    element: '#allskyStatus',
                    name: 'Allsky status',
                    wait: false

                }
            }            
        },
        system : {
            timers: {
                cpuload: {
                    url: 'includes/uiutil.php?request=CPULoad',
                    interval: cpuload_interval,
                    element: '#as-cpuload',
                    name: 'CPU load',
                    wait: false
                },
                cputemp: {
                    url: 'includes/uiutil.php?request=CPUTemp',
                    interval: cputemp_interval,
                    element: '#as-cputemp',
                    name: 'CPU temperature',
                    wait: true
                },
                memory: {
                    url: 'includes/uiutil.php?request=MemoryUsed',
                    interval: memory_interval,
                    element: '#as-memory',
                    name: 'memory usage',
                    wait: true
                },
                throttle: {
                    url: 'includes/uiutil.php?request=ThrottleStatus',
                    interval: throttle_interval,
                    element: '#as-throttley',
                    name: 'Pi throttle',
                    wait: true
                }
            }
        }
    };
    constructor(page) {
        this.#allskyPage = page;
        console.log("On " + page + " page");
    }

    #setupTheme() {
        if (!localStorage.getItem("theme")) {
                localStorage.setItem("theme", "light")
        }

        $('body').attr('class', localStorage.getItem('theme'));

        $('#as-switch-theme').on('click', (e) => {
            if (localStorage.getItem('theme') === 'light') {
                localStorage.setItem('theme', 'dark');
            } else {
                localStorage.setItem('theme', 'light');
            }
            $('body').attr('class', localStorage.getItem('theme'));
        });

    };

    #setupBigScreen() {
        $('#live_container').click(function () {
            if (BigScreen.enabled) {
                BigScreen.toggle(this, null, null, null);
            } else {
                console.log('Not Supported');
            }
        });
    }

    #addTimestamp(id) {
        const x = document.getElementById(id);
        if (! x) {
            console.log('No id for ' + id);
        } else {
            x.href += '&_ts=' + new Date().getTime();
        }
    }

    #setupTimestamps() {
        this.#addTimestamp('live_view');
        this.#addTimestamp('list_days');
        this.#addTimestamp('configuration');
        this.#addTimestamp('editor');
        this.#addTimestamp('overlay');
        this.#addTimestamp('module');
        this.#addTimestamp('LAN');
        this.#addTimestamp('WLAN');
        this.#addTimestamp('wifi');
        this.#addTimestamp('auth_conf');
        this.#addTimestamp('system');
    }

    #initTimers(page) {
        if (page in this.#pageTimers) {
            const timers = this.#pageTimers[page].timers;

            for (const name in timers) {
                const timer = timers[name];

                if (timer.url && timer.element && timer.interval) {
                    if (timer.wait !== undefined && !timer.wait) {
                        this.fetchAndUpdate(timer.url, timer.element, timer.name);
                    }
                    this.#timers[name] = setInterval(() => {
                        this.fetchAndUpdate(timer.url, timer.element, timer.name);
                    }, timer.interval);
                }
            }
        }
    }

    fetchAndUpdate(url, elementSelector, name) {
        $.ajax({
            url: url,
            type: 'GET',
            cache: false, 
            success: (data) => {
                $(elementSelector).html(data);
            },
            error: () => {
                $(elementSelector).text('Error loading ' + name + ' data');
            }
        });
    }

    #stopAllTimers() {
        for (const name in this.#timers) {
            clearInterval(this.#timers[name]);
        }
    }

    init() {
        this.#setupTheme();
        this.#setupBigScreen();
        this.#setupTimestamps();

        // initialize timers that apply to all pages
        this.#initTimers('all');
        // initialize timers that apply to this page only
        this.#initTimers(this.#allskyPage);

        includeHTML();
    }

}

$(document).ready(function() {
    const allsky = new ALLSKY(allskyPage);
    allsky.init();
});
