/* *
 *
 *  (c) 2009-2024 Øystein Moseng
 *
 *  Class representing a speech synthesis voice.
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */
'use strict';
import U from '../../Core/Utilities.js';
var pick = U.pick;
/**
 * The SonificationSpeaker class. This class represents an announcer using
 * speech synthesis. It allows for scheduling speech announcements, as well
 * as speech parameter changes - including rate, volume and pitch.
 *
 * @sample highcharts/demo/sonification-navigation
 *         Demo using SonificationSpeaker directly for some announcements
 *
 * @requires modules/sonification
 *
 * @class
 * @name Highcharts.SonificationSpeaker
 *
 * @param {Highcharts.SonificationSpeakerOptionsObject} options
 *        Configuration for the speaker
 */
var SonificationSpeaker = /** @class */ (function () {
    function SonificationSpeaker(options) {
        this.options = options;
        this.masterVolume = 1;
        this.synthesis = window.speechSynthesis;
        if (typeof speechSynthesis.onvoiceschanged !== 'undefined') {
            speechSynthesis.onvoiceschanged = this.setVoice.bind(this);
        }
        this.setVoice();
        this.scheduled = [];
    }
    /**
     * Say a message using the speaker voice. Interrupts other currently
     * speaking announcements from this speaker.
     * @function Highcharts.SonificationSpeaker#say
     * @param {string} message The message to speak.
     * @param {SonificationSpeakerOptionsObject} [options]
     * Optionally override speaker configuration.
     */
    SonificationSpeaker.prototype.say = function (message, options) {
        if (this.synthesis) {
            this.synthesis.cancel();
            var utterance = new SpeechSynthesisUtterance(message);
            if (this.voice) {
                utterance.voice = this.voice;
            }
            utterance.rate = options && options.rate || this.options.rate || 1;
            utterance.pitch = options && options.pitch ||
                this.options.pitch || 1;
            utterance.volume = pick(options && options.volume, this.options.volume, 1) * this.masterVolume;
            this.synthesis.speak(utterance);
        }
    };
    /**
     * Schedule a message using the speaker voice.
     * @function Highcharts.SonificationSpeaker#sayAtTime
     * @param {number} time
     * The time offset to speak at, in milliseconds from now.
     * @param {string} message
     * The message to speak.
     * @param {SonificationSpeakerOptionsObject} [options]
     * Optionally override speaker configuration.
     */
    SonificationSpeaker.prototype.sayAtTime = function (time, message, options) {
        this.scheduled.push(setTimeout(this.say.bind(this, message, options), time));
    };
    /**
     * Clear scheduled announcements, and stop current speech.
     * @function Highcharts.SonificationSpeaker#cancel
     */
    SonificationSpeaker.prototype.cancel = function () {
        this.scheduled.forEach(clearTimeout);
        this.scheduled = [];
        this.synthesis.cancel();
    };
    /**
     * Stop speech and release any used resources
     * @private
     */
    SonificationSpeaker.prototype.destroy = function () {
        // Ran on TimelineChannel.destroy
        // (polymorphism with SonificationInstrument).
        // Currently all we need to do is cancel.
        this.cancel();
    };
    /**
     * Set speaker overall/master volume modifier. This affects all
     * announcements, and applies in addition to the individual announcement
     * volume.
     * @function Highcharts.SonificationSpeaker#setMasterVolume
     * @param {number} vol Volume from 0 to 1.
     */
    SonificationSpeaker.prototype.setMasterVolume = function (vol) {
        this.masterVolume = vol;
    };
    /**
     * Set the active synthesis voice for the speaker.
     * @private
     */
    SonificationSpeaker.prototype.setVoice = function () {
        if (this.synthesis) {
            var name_1 = this.options.name, lang = this.options.language || 'en-US', voices = this.synthesis.getVoices(), len = voices.length;
            var langFallback = void 0;
            for (var i = 0; i < len; ++i) {
                if (name_1 && voices[i].name === name_1) {
                    this.voice = voices[i];
                    return;
                }
                if (!langFallback && voices[i].lang === lang) {
                    langFallback = voices[i];
                    if (!name_1) {
                        break;
                    }
                }
            }
            this.voice = langFallback;
        }
    };
    return SonificationSpeaker;
}());
/* *
 *
 *  Default Export
 *
 * */
export default SonificationSpeaker;
/* *
 *
 *  API declarations
 *
 * */
/**
 * Configuration for a SonificationSpeaker.
 * @requires modules/sonification
 * @interface Highcharts.SonificationSpeakerOptionsObject
 */ /**
* Name of the voice synthesis to use. If not found, reverts to the default
* voice for the language chosen.
* @name Highcharts.SonificationSpeakerOptionsObject#name
* @type {string|undefined}
*/ /**
* The language of the voice synthesis. Defaults to `"en-US"`.
* @name Highcharts.SonificationSpeakerOptionsObject#language
* @type {string|undefined}
*/ /**
* The pitch modifier of the voice. Defaults to `1`. Set higher for a higher
* voice pitch.
* @name Highcharts.SonificationSpeakerOptionsObject#pitch
* @type {number|undefined}
*/ /**
* The speech rate modifier. Defaults to `1`.
* @name Highcharts.SonificationSpeakerOptionsObject#rate
* @type {number|undefined}
*/ /**
* The speech volume, from 0 to 1. Defaults to `1`.
* @name Highcharts.SonificationSpeakerOptionsObject#volume
* @type {number|undefined}
*/
(''); // Keep above doclets in JS file
