"use strict";

// Timer intervals.  Make global to allow changing.
let allskystatus_interval = 20 * 1000;		// it's decreased when starting / stopping Allsky
let cpuloadtemp_interval = 5 * 1000;		// also for cpu temp and uptime
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
                    updateelement: '#allskyStatus',
                    wait: false

                }
            }            
        },
        system : {
            timers: {
                cpuandtemp: {
                    url: 'includes/uiutil.php?request=Multiple',
                    interval: cpuloadtemp_interval,
                    updateelement: [
                        {
                            data: 'CPULoad',
                            element: '#as-cpuload',
                        },
                        {
                            data: 'CPUTemp',
                            element: '#as-cputemp',
                        },
                        {
                            data: 'Uptime',
                            element: '#as-uptime',
                        }
                    ],
                    wait: false
                },
                memory: {
                    url: 'includes/uiutil.php?request=MemoryUsed',
                    interval: memory_interval,
                    updateelement: '#as-memory',
                    wait: true
                },
                throttle: {
                    url: 'includes/uiutil.php?request=ThrottleStatus',
                    interval: throttle_interval,
                    updateelement: '#as-throttley',
                    wait: true
                }
            }
        }
    };

    constructor(page) {
        this.#allskyPage = page;
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

            for (const timerId in timers) {
                const timer = timers[timerId];

                if (timer.url && timer.updateelement && timer.interval) {
                    if (timer.wait !== undefined && !timer.wait) {
                        this.fetchAndUpdate(timerId, timer);
                    }
                    this.#timers[timerId] = setInterval(() => {
                        this.fetchAndUpdate(timerId, timer);
                    }, timer.interval);
                }
            }
        }
    }

    fetchAndUpdate(timerId, timer) {
        const url = timer.url
        let updateElement = timer.updateelement || null;
        let type = 'GET';
        let dataType = 'html';
        let postData = [];

        if (Array.isArray(updateElement)) {
            postData = updateElement;
            type = 'POST'
            dataType = 'json';
        }

        $.ajax({
            url: url,
            type: type,
            data: JSON.stringify(postData),
            dataType: dataType,
            cache: false, 
            success: (response) => {
                if (Array.isArray(updateElement)) {
                    timer.updateelement.forEach(updateData => {
                        if (updateData && updateData.element) {
                            $(updateData.element).html(response[updateData.data]);
                        } else {
                            console.error('Invalid element configuration for', timerId);
                        }
                    });
                } else {
                    $(updateElement).html(response);
                }
            },
            error: (a, b) => {
                $(elementSelector).html('Error loading ' + timerId + ' data');
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
