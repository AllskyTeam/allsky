"use strict";

class ALLSKYFOCUSER {

    allskyRunning = true;
    magnifier = null;
    grabbing = false;
    grabTimeout = null;

    focusChart = null;
    focusSeries = [];
    focusMoveIndex = 0;

    constructor() {
        this.#setupEvents();
        this.#startTimers();
        this.#initialiseMagnifier();
        this.#initFocusChart();
    }

    #setupEvents() {
        $('#sidebar').addClass('active');

        $(document).off('click', '.asf-allsky-start');
        $(document).on('click', '.asf-allsky-start', (e) => {
            this.#sendAjax('/allsky/start', 'GET', {}, true, true);
        });

        $(document).off('click', '.asf-allsky-stop');
        $(document).on('click', '.asf-allsky-stop', (e) => {
            this.#sendAjax('/allsky/stopall', 'GET', {}, true, true);
        });

        $(document).off('click', '#asf-motor-settings-button');
        $(document).on('click', '#asf-motor-settings-button', (e) => {
            this.#openMotorSettings();
        });

        // SAVE in the dialog
        $(document).off('click', '#asf-save-motor-settings');
        $(document).on('click', '#asf-save-motor-settings', (e) => {
            this.#saveMotorSettings();
        });

        // Toggle fields on motor type change
        $(document).off('change', '#asf-motor-type');
        $(document).on('change', '#asf-motor-type', (e) => {
            this.#toggleMotorFields();
        });

        $(document).off('click', '.asf-pick-gpio');
        $(document).on('click', '.asf-pick-gpio', (e) => {
            const targetSel = $(e.currentTarget).data('target');
            const preset = parseInt($(targetSel).val(), 10) || null;
            this.#openGpioPicker(targetSel, preset);
        });

        $(document).off('change', '#asf-motor-type');
        $(document).on('change', '#asf-motor-type', (e) => {
            this.#toggleMotorFields();
            this.#applyDriverProfile();  // if switching to ULN2003 with Titan selected, prefill
        });

        // When driver profile changes, apply it
        $(document).off('change', '#asf-driver-profile');
        $(document).on('change', '#asf-driver-profile', (e) => {
            this.#applyDriverProfile();
        });

        $(document).off('click', '.asf-motor-move');
        $(document).on('click', '.asf-motor-move', (e) => {
            let el = e.currentTarget;

            let direction = $(el).data('direction')
            let speed = $(el).data('speed')

            let steps = 10;
            if (speed == 'fast') {
                steps = $('#asf-motor-fast-step').val();
            } else {
                steps = $('#asf-motor-slow-step').val();
            }

            this.#sendAjax('/focuser/move', 'POST', {
                'direction': direction,
                'speed': speed,
                'steps': steps
            },
                false,
                false)
        });

        $(document).off('click', '#asf-motor-enable');
        $(document).on('click', '#asf-motor-enable', (event) => {
            this.#updateMotorStatus();
        });

        $(document).off('click', '#asf-grab-image');
        $(document).on('click', '#asf-grab-image', (e) => {

            let camera = $('#asf-camera').val();
            let exposure = $('#asf-exposure-time').val();
            let gain = $('#asf-gain').val();

            this.#sendAjax('/focuser/getimage', 'POST', {
                'camera': camera,
                'exposure': exposure,
                'gain': gain
            },
                true,
                false,
                true)
        });

        $(document).off('click', '#asf-start');
        $(document).on('click', '#asf-start', (e) => {
            if (this.grabbing) return;
            this.grabbing = true;
            this.#grabLoop();
            $('#asf-grab-image').prop('disabled', true)
            $('#asf-start').prop('disabled', true)
        });

        $(document).off('click', '#asf-stop');
        $(document).on('click', '#asf-stop', (e) => {
            this.grabbing = false;
            clearTimeout(this.grabTimeout);
            this.grabTimeout = null;
            $('#asf-grab-image').prop('disabled', false)
            $('#asf-start').prop('disabled', false)
        });

        $(document).off('click', '#asf-zoom-enable');
        $(document).on('click', '#asf-zoom-enable', (e) => {
            this.#initialiseMagnifier();
        });

        $(document).off('change', '#asf-magnifier-scale');
        $(document).on('change', '#asf-magnifier-scale', (e) => {
            this.#initialiseMagnifier();
        });

        $(document).off('click', '.asf-zoom');
        $(document).on('click', '.asf-zoom', (e) => {
            this.#setZoom(e.currentTarget);
        });

        $(document).off('click', '#asf-focus-reset');
        $(document).on('click', '#asf-focus-reset', () => this.#resetFocusChart());

    }

    #updateUI() {
        if (this.allskyRunning) {
            $('.asf-disable-when-running').prop('disabled', true);
            $('.asf-allsky-start').prop('disabled', true);
            $('.asf-allsky-stop').prop('disabled', false);
        } else {
            $('.asf-disable-when-running').prop('disabled', false);
            $('.asf-allsky-start').prop('disabled', false);
            $('.asf-allsky-stop').prop('disabled', true);
        }
        if (this.grabbing) {
            $('#asf-grab-image').prop('disabled', true);
            $('#asf-start').prop('disabled', true);        
        } else {
            $('#asf-grab-image').prop('disabled', false);
            $('#asf-start').prop('disabled', false);           
        }
    }

    #updateMotorStatus() {
        let motorEnabled = $('#asf-motor-enable').prop('checked');
        if (motorEnabled) {
            this.#sendAjax('/focuser/enable')
            $('.asf-motor-move').prop('disabled', false);
        } else {
            this.#sendAjax('/focuser/disable')
            $('.asf-motor-move').prop('disabled', true);
        }        
    }

    #sendAjax(endPoint, type = 'GET', data = {}, showOverlay = false, doUIUpdate = false, doUpdateImage = false) {
        if (showOverlay) {
            $('#as-main-content').loadingMessages();
        }
        $.ajax({
            type: type,
            url: endPoint,
            data: JSON.stringify(data),
            contentType: 'application/json',
            dataType: 'json',
            cache: false,
            context: this
        }).done((result) => {
            if (doUIUpdate) {
                this.allskyPoller.tick();
            }
            if (doUpdateImage) {
                this.#renderExifTable(result.exif, '#asf-allsky-exif')
                this.#setImageSource('#asf-preview-image', result.url, { timeout: 8000, bustCache: true },
                    function onLoad(imgEl) {
                        this.#initialiseMagnifier()
                    },
                    function onError(err) {
                        $('#asf-preview-image').replaceWith('<div style="color:red;">Failed to load image</div>');
                        console.error(err);
                    }
                );
                if (this.grabbing) {
                    this.grabTimeout = setTimeout(() => this.#grabLoop(), 1000);
                }                
                if (typeof result.focus_score === 'number') {
                    this.#pushFocusScore(result.focus_score);
                }
            }
        }).always(() => {
            if (showOverlay) {
                $('#as-main-content').loadingMessages('stop');
            }
        }).fail((xhr, status, error) => {
            console.log(error);
        });
    }

    #startTimers() {
        this.allskyPoller = new AjaxPoller({
            url: '/allsky/status',
            interval: 5000,
            onSuccess: (result) => {
                let status = result.allsky.status.toLowerCase();
                $('#asf-allsky-status').html(result.status_html);
                if (status === 'running') {
                    this.allskyRunning = true;
                    $('#asf-running-alert').removeClass('d-none');
                    $('#asf-preview-image').addClass('d-none');
                } else {
                    this.allskyRunning = false;
                    $('#asf-running-alert').addClass('d-none');
                    $('#asf-preview-image').removeClass('d-none');
                }
                this.#updateUI();
            },
            onError: (_, __, err) => {

            }
        });

        this.allskyPoller.start(true);
    }

    #setImageSource = (imgTarget, src, {
        crossOrigin = null,
        timeout = 10000,
        bustCache = false
    } = {}, onLoad, onError) => {
        const img = imgTarget && imgTarget.jquery ? imgTarget : $(imgTarget);
        if (!img || !img.length) {
            if (onError) onError.call(this, new Error('Image element not found'));
            return;
        }

        const node = img[0];

        const sameSrc = (node.currentSrc || node.src) === src;
        if (sameSrc && node.complete && node.naturalWidth) {
            if (onLoad) onLoad.call(this, node);
            return;
        }

        if (crossOrigin) node.crossOrigin = crossOrigin;

        let srcToSet = src;
        if (bustCache || sameSrc) {
            const sep = src.includes('?') ? '&' : '?';
            srcToSet = `${src}${sep}_ts=${Date.now()}`;
        }

        let timer = null;

        const cleanup = () => {
            if (timer) { clearTimeout(timer); timer = null; }
            img.off('load', handleLoad).off('error', handleError);
        };

        const handleLoad = () => {
            cleanup();
            if (onLoad) onLoad.call(this, node);
        };

        const handleError = (e) => {
            cleanup();
            if (onError) onError.call(this, e || new Error('Image load failed'));
        };

        img.one('load', handleLoad).one('error', handleError);

        if (timeout > 0) {
            timer = setTimeout(() => {
                handleError(new Error('Image load timeout'));
            }, timeout);
        }

        img.attr('src', srcToSet);

        if (node.complete && node.naturalWidth) handleLoad();
    };

    #renderExifTable(exif, container) {
        const host = container && container.jquery ? container : $(container);
        if (!host.length) return;

        const wrapper = $('<div class="table-responsive mb-3"></div>');
        const table = $('<table class="table table-sm table-striped table-hover align-middle mb-0"></table>');

        const thead = $('<thead><tr><th scope="col" style="width:45%">Field</th><th scope="col">Value</th></tr></thead>');
        const tbody = $('<tbody></tbody>');

        Object.keys(exif).forEach((key) => {
            const row = $('<tr></tr>');
            const th = $('<th scope="row" class="fw-semibold"></th>').html(key);
            const td = $('<td></td>').html(exif[key]);
            row.append(th, td);
            tbody.append(row);
        });

        table.append(thead, tbody);
        wrapper.append(table);

        host.empty().append(wrapper);
    }

    #initialiseMagnifier() {

        if (this.magnifier !== null) {
            this.magnifier.destroy();
            this.magnifier = null;
        }

        let scale = $('#asf-magnifier-scale').val();

        if ($('#asf-zoom-enable').prop('checked')) {
            this.magnifier = $('#asf-preview-image').blowup({
                round: true,
                width: 300,
                height: 300,
                background: '#FFF',
                shadow: '0 8px 17px 0 rgba(0, 0, 0, 0.2)',
                border: '6px solid #FFF',
                cursor: true,
                zIndex: 999999,
                scale: scale,
                customClasses: ''
            });
            $('#asf-zoom-enable').trigger('mousemove');
            //     window.allskytools.setStorage('asf-magnifier', true);
        } else {
            //     window.allskytools.setStorage('asf-magnifier', false);
        }
    }

    #setZoom(el) {
        let type = $(el).data('type');

        if (type === 'fit') {
            $('#asf-preview-image').css('height', '85vh');
        }
        if (type === 'full') {
            $('#asf-preview-image').css('height', '100%');
        }

        if (type === 'in' || type === 'out') {
            let height = $('#asf-preview-image').data('height');
            height = parseInt(height);

            let delta = 1;
            if (type === 'out') {
                delta = -1
            }

            height = height + delta;
            $('#asf-preview-image').css('height', height.toString() + 'vh');

            // fixed missing '#' so we select the element by id
            $('#asf-preview-image').data('height', height);
        }
    }

    #grabLoop() {
        if (!this.grabbing) return;

        const camera = $('#asf-camera').val();
        const exposure = $('#asf-exposure-time').val();
        const gain = $('#asf-gain').val();

        this.#sendAjax('/focuser/getimage', 'POST', {
            camera: camera,
            exposure: exposure,
            gain: gain
        }, false, false, true);
    }

    /*
    * Focus chart 
    */

    #initFocusChart() {
        const ctx = document.getElementById('asf-focus-chart');
        if (!ctx || !window.Chart) return;
        this.focusSeries = [];
        this.captureIndex = 0;
        this.focusChart = new Chart(ctx, {
            type: 'line',
            data: { datasets: [{ label: 'Focus score', data: this.focusSeries, pointRadius: 2, tension: 0.2 }] },
            options: {
                animation: false, maintainAspectRatio: false,
                scales: {
                    x: { type: 'linear', title: { display: true, text: 'Capture #' }, ticks: { precision: 0 } },
                    y: { title: { display: true, text: 'Variance' }, beginAtZero: true }
                },
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `Score: ${c.parsed.y.toFixed(2)}` } } }
            }
        });
    }
    #resetFocusChart() {
        this.focusSeries.length = 0;
        this.captureIndex = 0;
        this.focusChart?.update();
    }
    #pushFocusScore(score) {
        if (typeof score !== 'number' || !isFinite(score)) return;
        this.captureIndex += 1;
        this.focusSeries.push({ x: this.captureIndex, y: score });
        this.focusChart?.update();
    }

    /*
    * End Focus chart 
    */


    /* =======================
       Motor Settings (Dialog)
       ======================= */

    // --- Bootstrap 5 modal helpers (normalize to a real Element) ---
    #resolveEl(ref) {
        if (!ref) return null;
        if (ref instanceof Element) return ref;         // DOM element
        if (typeof ref === 'string') {                  // "#id" or "id"
            if (ref.startsWith('#')) return document.querySelector(ref);
            return document.getElementById(ref);
        }
        if (ref.jquery && ref.length) return ref[0];    // jQuery → DOM
        return null;
    }

    #getModalInstance(ref) {
        const el = this.#resolveEl(ref);
        if (!el) { console.error('Modal element not found:', ref); return null; }
        return window.bootstrap?.Modal.getOrCreateInstance(el);
    }
    #showModal(ref) { this.#getModalInstance(ref)?.show(); }
    #hideModal(ref) { this.#getModalInstance(ref)?.hide(); }

    #openMotorSettings() {
        // Try to prefill from server
        $.ajax({
            url: '/focuser/settings',
            type: 'GET',
            dataType: 'json',
            cache: false
        })
            .done((res) => {
                this.#prefillMotorSettings(res.settings || {});
                this.#toggleMotorFields();
                this.#showModal('asf-motor-settings');
            })
            .fail((_xhr) => {
                // open with defaults if no pre-existing settings
                this.#prefillMotorSettings(null);
                this.#toggleMotorFields();
                this.#showModal('asf-motor-settings');
            });
    }

    #prefillMotorSettings(prefill) {
        let type = 'a4988';
        let fast = '';
        let slow = '';
        let pins = {};
        let profile = 'custom';

        if (prefill && prefill.type) {
            type = prefill.type;                         // expect "a4988" or "uln2003"
            profile = prefill.profile || 'custom';
            if (prefill.steps) {
                fast = prefill.steps.fast ?? '';
                slow = prefill.steps.slow ?? '';
            }
            pins = prefill.pins || {};
        }

        $('#asf-motor-type').val(type);
        $('#asf-driver-profile').val(profile);

        if (type === 'a4988') {
            $('#asf-a4988-dir').val(pins.direction ?? '');
            $('#asf-a4988-step').val(pins.step ?? '');
            $('#asf-a4988-en').val(pins.enable ?? '');
        } else if (type === 'uln2003') {
            $('#asf-byj-in1').val(pins.in1 ?? '');
            $('#asf-byj-in2').val(pins.in2 ?? '');
            $('#asf-byj-in3').val(pins.in3 ?? '');
            $('#asf-byj-in4').val(pins.in4 ?? '');
        }

        $('#asf-step-fast').val(fast);
        $('#asf-step-slow').val(slow);
    }

    #toggleMotorFields() {
        let motorType = $('#asf-motor-type').val();
        if (motorType === 'a4988') {
            $('#asf-a4988-fields').show();
            $('#asf-byj-fields').hide();
        } else if (motorType === 'uln2003') {
            $('#asf-a4988-fields').hide();
            $('#asf-byj-fields').show();
        }
    }

    #readMotorSettings() {
        let motorType = $('#asf-motor-type').val();
        let settings = {
            type: motorType,                       // now "a4988" or "uln2003"
            profile: $('#asf-driver-profile').val(), // include the profile
            steps: {
                fast: parseInt($('#asf-step-fast').val(), 10) || 0,
                slow: parseInt($('#asf-step-slow').val(), 10) || 0
            },
            pins: {}
        };

        if (motorType === 'a4988') {
            settings.pins = {
                direction: parseInt($('#asf-a4988-dir').val(), 10),
                step: parseInt($('#asf-a4988-step').val(), 10),
                enable: parseInt($('#asf-a4988-en').val(), 10)
            };
        } else if (motorType === 'uln2003') {    // changed
            settings.pins = {
                in1: parseInt($('#asf-byj-in1').val(), 10),
                in2: parseInt($('#asf-byj-in2').val(), 10),
                in3: parseInt($('#asf-byj-in3').val(), 10),
                in4: parseInt($('#asf-byj-in4').val(), 10)
            };
        }
        return settings;
    }

    #validateMotorSettings(settings) {
        if (settings.steps.fast <= 0 || settings.steps.slow <= 0) {
            return "Step sizes must be positive integers.";
        }
        let pins = Object.values(settings.pins);
        if (pins.some((p) => isNaN(p) || p < 0)) {
            return "All GPIO pins must be valid non-negative integers (BCM numbering).";
        }
        let unique = new Set(pins);
        if (unique.size !== pins.length) {
            return "GPIO pins must be unique.";
        }
        return null;
    }

    #openGpioPicker(targetSelector, preselect = null) {
        // Use a stable id so repeated opens replace the modal (plugin removes prior instance of same id)
        const pickerId = 'asf-gpio-picker';

        $.allskyGPIO({
            id: pickerId,
            gpio: preselect,                 // preselected BCM value or null
            gpioSelected: (gpio) => {
                // Write chosen BCM pin back to the target input
                $(targetSelector).val(gpio).trigger('change');
            }
            // You can also override gpioData here if needed, but your plugin already has defaults
        });

        // Optional: clean up after the modal is hidden (keeps DOM tidy)
        const modalEl = document.getElementById(`${pickerId}-allskygpio`);
        if (modalEl) {
            modalEl.addEventListener('hidden.bs.modal', () => {
                const inst = bootstrap.Modal.getInstance(modalEl);
                if (inst) inst.dispose();
                $(`#${pickerId}-allskygpio`).remove();
            }, { once: true });
        }
    }

    #applyDriverProfile() {
        const profile = $('#asf-driver-profile').val();
        const motorTypeSel = $('#asf-motor-type');

        $('#asf-step-fast').val(500);
        $('#asf-step-slow').val(50);

        if (profile === 'titan') {
            // Force ULN2003
            motorTypeSel.val('uln2003');
            this.#toggleMotorFields(); // show ULN2003, hide A4988

            // Prefill Titan Astro mapping
            $('#asf-byj-in1').val(20);
            $('#asf-byj-in2').val(21);
            $('#asf-byj-in3').val(26);
            $('#asf-byj-in4').val(19);
        } else {
            // Custom: do nothing; keep user’s current values & selected motor type
            // (You can optionally leave motor type as-is, or reset if you prefer)
        }
    }

    #saveMotorSettings() {
        let settings = this.#readMotorSettings();
        let err = this.#validateMotorSettings(settings);
        if (err) {
            alert(err);
            return;
        }

        $.ajax({
            url: '/focuser/settings',
            type: 'POST',
            data: JSON.stringify(settings),
            contentType: 'application/json',
            dataType: 'json'
        })
            .done((res) => {
                // Reflect step sizes into the quick move inputs if present
                $('#asf-motor-fast-step').val(settings.steps.fast);
                $('#asf-motor-slow-step').val(settings.steps.slow);
                this.#hideModal('asf-motor-settings'); // BS5 Modal hide
            })
            .fail((xhr) => {
                let msg = xhr && xhr.responseText ? xhr.responseText : xhr.status;
                alert('Failed to save settings: ' + msg);
            });
    }

}

$(function () {
    const focuserClass = new ALLSKYFOCUSER()
});