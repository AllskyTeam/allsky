"use strict";

class ALLSKY {
    #timers  = {};
    #allskyPage = '';
    #pageTimers = {
        all: {
            timers: {
                allskystatus: {
                    url: 'includes/uiutil.php?request=AllskyStatus',
                    interval: 4000,
                    element: '#allskyStatus',
                    wait: false

                }
            }            
        },
        system : {
            timers: {
                cpuload: {
                    url: 'includes/uiutil.php?request=CPULoad',
                    interval: 5000,
                    element: '#as-cpuload',
                    wait: false
                },
                cputemp: {
                    url: 'includes/uiutil.php?request=CPUTemp',
                    interval: 10000,
                    element: '#as-cputemp',
                    wait: true
                },
                memory: {
                    url: 'includes/uiutil.php?request=MemoryUsed',
                    interval: 10000,
                    element: '#as-memory',
                    wait: true
                },
                throttle: {
                    url: 'includes/uiutil.php?request=ThrottleStatus',
                    interval: 15000,
                    element: '#as-throttley',
                    wait: true
                }
            }
        }
    };
    constructor(page) {
        this.#allskyPage = page;
        console.log(page);
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
                        this.fetchAndUpdate(timer.url, timer.element);
                    }
                    this.#timers[name] = setInterval(() => {
                        this.fetchAndUpdate(timer.url, timer.element);
                    }, timer.interval);
                }
            }
        }
    }

    fetchAndUpdate(url, elementSelector) {
        $.ajax({
            url: url,
            type: 'GET',
            success: (data) => {
                $(elementSelector).html(data);
            },
            error: () => {
                $(elementSelector).text('Error loading data');
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
        this.#initTimers('all');
        this.#initTimers(this.#allskyPage);

        includeHTML();
    }

}

$(document).ready(function() {
    const allsky = new ALLSKY(allskyPage);
    allsky.init();
});