"use strict";

; (function ($) {
    const pluginName = 'loadingMessages';
    const defaults = {

        _loading: [
            "Counting money...",
            "Swapping time and space...",
            "Holding breath...",
            "Preparing chips...",
            "Testing your patience...",
            "Speeding up the loading screen...",
            "Counting backwards from infinity...",
            "Computing chance of success...",
            "Looking for exact change...",
            "All your web browser are belong to us",
            "I swear, it's almost done!",
            "Adjusting the flux capacitor...",
            "Where did all internets go...?",
            "Convincing the AI not to turn evil...",
            "Turning it off and on again...",
            "Dividing by zero...",
            "Cracking military-grade encryption...",
            "Searching for plot device...",
            "Working on the side project...",
            "Feel free to spin in your chair",
            "Downloading more RAM...",
            "Changing project requirements...",
            "Becoming self-aware...",
            "Running in circles...",
            "Downloading the entire internet...",
            "Ordering takeaway...",
            "Patching up the patches...",
            "Reading the manual...",
            "Connecting to dark web...",
            "Making stuff up...",
            "Generating random tasks...",
            "Automating random events...",
            "Generating infinite triangles...",
            "Ejecting the warp core...",
            "Hacking the mainframe...",
            "Adjusting hidden agendas...",
            "Going back in time...",
            "Generating dad jokes...",
            "Brewing coffee...",
            "Please wait... the internet is on its coffee break...",
            "Summoning the magic...",
            "Sharpening the pencils...",
            "Loading...or not?",
            "Applying fees...",
            "Waking up...",
            "Simulating the Universe...",
            "Enabling rain...",
            "Harvesting apples...",
            "Baking the cake...",
            "Hiding dragons in your code...",
            "Scaling cat ears to 1.5x...",
            "Putting up warning signs...",
            "Putting raccoons in your wheelie...",
            "Adding unnecessary complexity...",
            "Compressing cars to bus.zip...",
            "The wizard will now install your software...",
            "Installing Cats v1.2...",
            "Asking AI to generate more loading messages...",
            "Installing \"Any\" key on your system...",
            "Flattening polygons...",
            "Colliding matter with antimater...",
            "Grabbing coffee...",
            "Failing the Turing test on purpose...",
            "Taking over the world...",
            "Staring at cats...",
            "Calling the Doctor...",
            "Searching for llamas...",
            "Realigning alternate timelines...",
            "Setting mood...",
            "Listening to transmissions from outer space...",
            "Realigning the power distribution network...",
            "Assembling the away team...",
        ],
        messages: [
            "Sorry this is taking longer than expected ...",
            "Sorry this really is taking too long ...",
            "Your call is important to us -  after lunch.",
            "I am pretty sure I am getting there ...",
            "I'm sorry Dave, I'm not sure what is going on.",
            "You might want a cup of tea ...",
            "This seemed like a good idea at the time...",
            "Perhaps you should go to lunch?",
            "Almost done lying about progress...",
            "I'm Still faster than your last meeting...",
            "Or just come back tomorrow - AI is hard ..."
        ],
        delays: [1000, 2000, 2000, 2000, 4000, 4000, 4000, 8000, 8000, 8000, 8000]
    };

    function Plugin($el, options) {
        this.$el = $el;
        this.settings = $.extend({}, defaults, options);
        this.timers = [];
        this.init();
    }

    Plugin.prototype.init = function () {
        let total = 0;
        let msg = this.settings._loading[Math.floor(Math.random() * this.settings._loading.length)];

        this.$el.LoadingOverlay("show", {
            background: "rgba(0, 0, 0, 0.6)",
            textColor: "#ffffff",
            imageColor: "#ffffff",
            zIndex: 99999,
            text: msg
        });

        this.settings.messages.forEach((msg, i) => {
            const delay = this.settings.delays[i] ?? this.settings.delays.slice(-1)[0];
            total += delay;
            const t = setTimeout(() => {
                this.$el.LoadingOverlay('text', msg);
            }, total);
            this.timers.push(t);
        });
    };

    Plugin.prototype.clear = function () {
        this.timers.forEach(clearTimeout);
        this.timers = [];
    };

    Plugin.prototype.stop = function () {
        this.clear();
        this.$el.LoadingOverlay('hide', true);
    };

    Plugin.prototype.restart = function (options) {
        this.clear();
        this.settings = $.extend({}, defaults, options || {});
        this.init();
    };

    $.fn[pluginName] = function (option, ...args) {
        return this.each(function () {
            const $this = $(this);
            let instance = $this.data('plugin_' + pluginName);

            if (!instance) {
                if (typeof option === 'object' || option === undefined) {
                    instance = new Plugin($this, option);
                    $this.data('plugin_' + pluginName, instance);
                }
            } else {
                if (typeof option === 'string' && typeof instance[option] === 'function') {
                    instance[option](...args);
                } else if (typeof option === 'object' || option === undefined) {
                    // Re-init with new or same options
                    instance.restart(option);
                }
            }
        });
    };
})(jQuery);