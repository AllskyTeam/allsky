"use strict";

!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?module.exports=t():"function"==typeof define&&define.amd?define(t):(e="undefined"!=typeof globalThis?globalThis:e||self,function(){var n=e.Cookies,o=e.Cookies=t();o.noConflict=function(){return e.Cookies=n,o}}())}(this,(function(){"use strict";function e(e){for(var t=1;t<arguments.length;t++){var n=arguments[t];for(var o in n)e[o]=n[o]}return e}var t=function t(n,o){function r(t,r,i){if("undefined"!=typeof document){"number"==typeof(i=e({},o,i)).expires&&(i.expires=new Date(Date.now()+864e5*i.expires)),i.expires&&(i.expires=i.expires.toUTCString()),t=encodeURIComponent(t).replace(/%(2[346B]|5E|60|7C)/g,decodeURIComponent).replace(/[()]/g,escape);var c="";for(var u in i)i[u]&&(c+="; "+u,!0!==i[u]&&(c+="="+i[u].split(";")[0]));return document.cookie=t+"="+n.write(r,t)+c}}return Object.create({set:r,get:function(e){if("undefined"!=typeof document&&(!arguments.length||e)){for(var t=document.cookie?document.cookie.split("; "):[],o={},r=0;r<t.length;r++){var i=t[r].split("="),c=i.slice(1).join("=");try{var u=decodeURIComponent(i[0]);if(o[u]=n.read(c,u),e===u)break}catch(e){}}return e?o[e]:o}},remove:function(t,n){r(t,"",e({},n,{expires:-1}))},withAttributes:function(n){return t(this.converter,e({},this.attributes,n))},withConverter:function(n){return t(e({},this.converter,n),this.attributes)}},{attributes:{value:Object.freeze(o)},converter:{value:Object.freeze(n)}})}({read:function(e){return'"'===e[0]&&(e=e.slice(1,-1)),e.replace(/(%[\dA-F]{2})+/gi,decodeURIComponent)},write:function(e){return encodeURIComponent(e).replace(/%(2[346BF]|3[AC-F]|40|5[BDE]|60|7[BCD])/g,decodeURIComponent)}},{path:"/"});return t}));

class ALLSKYSETTINGSCONTROLLER {
    #cookieName = 'allskysettingsstate';
    #showIcon = '<i class="fa fa-chevron-down fa-fw"></i>';
	#hideIcon = '<i class="fa fa-chevron-up fa-fw"></i>';

    constructor() {
        this.#readState();
    }
    
    #saveState() {
        return;
        var states = {};

        $('.setting-header-toggle').each((index, el) => {
            let sectionNumber = $(el).data('settinggroup');
            let section = $('#header' + sectionNumber);
            let state = section.css('display');

            states[sectionNumber]= state;
        });

        var jsonString = JSON.stringify(states);
        Cookies.set(this.#cookieName, jsonString);
    }

    #readState() {
        return;
        let cookieData = Cookies.get(this.#cookieName);

        try {
            let states = JSON.parse(cookieData);
            for (let key in states) {
                if (states[key] !== 'none') {
                    this.#openSettingsGroup(key);
                } else {
                    this.#closeSettingsGroup(key);
                }
            }

            this.#setAllButtonState();
        } catch(err) {
            // Ignore any errors
        }
    }

    #setAllButtonState() {
        var allOpen = true;
        $('.settings-header').each((index, element) => {
            let el = $(element);
            let state = el.css('display');

            if (state === 'none') {
                allOpen = false;
            }
        });

        if (!allOpen) {
            $('#settings-all-control').html(this.#showIcon);
        } else {
            $('#settings-all-control').html(this.#hideIcon);
        }        
    }

    #openSettingsGroup(sectionNumber) {
        let headerEl = $('#h' + sectionNumber);
        let sectionEl = $('#header' + sectionNumber);

        $(headerEl).html(this.#hideIcon);
        $(sectionEl).css('display', 'table-row');
    }

    #closeSettingsGroup(sectionNumber) {
        let headerEl = $('#h' + sectionNumber);
        let sectionEl = $('#header' + sectionNumber);

        $(headerEl).html(this.#showIcon);
        $(sectionEl).css('display', 'none');
    }

    run() {
        /**
         * Handle clicking open/close all settings button
         */
        $('#settings-all-control').on('click', (event) => {
            let jEl = $(event.currentTarget);

            $('.setting-header-toggle').each((index, element) => {
                let el = $(element);
                let sectionNumber = el.data('settinggroup');
                
                if (jEl.hasClass('settings-expand')) {
                    this.#openSettingsGroup(sectionNumber)
                } else {
                    this.#closeSettingsGroup(sectionNumber);
                }             
            });
            
            this.#setAllButtonState();

            if (jEl.hasClass('settings-expand')) {
                jEl.removeClass('settings-expand')
            } else {
                jEl.addClass('settings-expand')
            }

            this.#saveState();
        });

        /**
         * Handle clicking open/close a settings group
         */
        $('.setting-header-toggle').on('click', (event) => {
            let el = $(event.currentTarget);
            let sectionNumber = el.data('settinggroup');
            let section = $('#header' + sectionNumber);
            let state = section.css('display');

            if (state === 'none') {
                this.#openSettingsGroup(sectionNumber);
            } else {
                this.#closeSettingsGroup(sectionNumber);
            }
            this.#setAllButtonState();
            this.#saveState();            
        });

        /**
         * Handle scroll back to top of the page
         */
        $('#backToTopBtn').on('click', (event) => {
            event.preventDefault();
            $('.content').animate({
                scrollTop: 0
              }, 1000);
        });        
        
        $('.content').on( 'scroll', (event) => {
            let top = $(event.currentTarget).scrollTop();
            if (top > 20) {
                $('#backToTopBtn').show();
            } else {
                $('#backToTopBtn').hide();
            }
        });

        $('#settings-reset').on('click', (event) => {

            let result = confirm('Really RESET ALL VALUES TO DEFAULT??');

            if (result === false) {
                event.preventDefault();
            }

        });
        

    }
  }

  let settingController = new ALLSKYSETTINGSCONTROLLER();
  settingController.run();
