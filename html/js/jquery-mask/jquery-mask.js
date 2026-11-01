"use strict";
(function ($) {
    const api = 'includes/overlayutil.php?request=';
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    const copy = value => JSON.parse(JSON.stringify(value));

    class MaskRenderer {
        static blurAlpha(alpha, width, height, radius) {
            const temporary = new Uint8Array(alpha.length);
            let result = new Uint8Array(alpha.length);
            const divisor = radius * 2 + 1;
            for (let pass = 0; pass < 3; pass++) {
                for (let y = 0; y < height; y++) {
                    const row = y * width;
                    let sum = 0;
                    for (let x = 0; x <= radius && x < width; x++) sum += alpha[row + x];
                    for (let x = 0; x < width; x++) {
                        temporary[row + x] = Math.round(sum / divisor);
                        if (x - radius >= 0) sum -= alpha[row + x - radius];
                        if (x + radius + 1 < width) sum += alpha[row + x + radius + 1];
                    }
                }
                for (let x = 0; x < width; x++) {
                    let sum = 0;
                    for (let y = 0; y <= radius && y < height; y++) sum += temporary[y * width + x];
                    for (let y = 0; y < height; y++) {
                        result[y * width + x] = Math.round(sum / divisor);
                        if (y - radius >= 0) sum -= temporary[(y - radius) * width + x];
                        if (y + radius + 1 < height) sum += temporary[(y + radius + 1) * width + x];
                    }
                }
                [alpha, result] = [result, alpha];
            }
            return alpha;
        }
        static bounds(object) {
            if (object.type === 'circle') {
                const radius = Math.hypot(object.b.x - object.a.x, object.b.y - object.a.y);
                return { left: object.a.x - radius, top: object.a.y - radius,
                    right: object.a.x + radius, bottom: object.a.y + radius };
            }
            const points = object.points || [object.a, object.b];
            const bounds = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity };
            for (const point of points) {
                bounds.left = Math.min(bounds.left, point.x);
                bounds.top = Math.min(bounds.top, point.y);
                bounds.right = Math.max(bounds.right, point.x);
                bounds.bottom = Math.max(bounds.bottom, point.y);
            }
            return bounds;
        }
        static shapePath(context, object) {
            const a = object.a, b = object.b || a;
            context.beginPath();
            if (object.type === 'rectangle') {
                context.rect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y));
            } else if (object.type === 'ellipse') {
                const rx = Math.abs(b.x - a.x) / 2, ry = Math.abs(b.y - a.y) / 2;
                context.ellipse((a.x + b.x) / 2, (a.y + b.y) / 2, Math.max(rx, .01), Math.max(ry, .01), 0, 0, Math.PI * 2);
            } else if (object.type === 'circle') {
                context.arc(a.x, a.y, Math.max(Math.hypot(b.x - a.x, b.y - a.y), .01), 0, Math.PI * 2);
            } else {
                const points = object.points || [a, b];
                context.moveTo(points[0].x, points[0].y);
                for (let i = 1; i < points.length; i++) context.lineTo(points[i].x, points[i].y);
                if (points.length === 1) context.lineTo(points[0].x + .01, points[0].y);
            }
        }
        static paintObject(context, object, scale, layer) {
            const feather = Math.max(0, Number(object.feather) || 0);
            const radius = feather ? Math.max(1, Math.round(feather * scale / 2)) : 0;
            const bounds = MaskRenderer.bounds(object);
            const strokePad = ['brush', 'eraser', 'line'].includes(object.type) ? (object.size || 1) / 2 : 0;
            const margin = radius * 3 + 2;
            const left = Math.max(0, Math.floor((bounds.left - strokePad) * scale) - margin);
            const top = Math.max(0, Math.floor((bounds.top - strokePad) * scale) - margin);
            const right = Math.min(context.canvas.width, Math.ceil((bounds.right + strokePad) * scale) + margin);
            const bottom = Math.min(context.canvas.height, Math.ceil((bounds.bottom + strokePad) * scale) + margin);
            if (right <= left || bottom <= top) return;
            const tileWidth = right - left, tileHeight = bottom - top;
            // Blur a smaller mask when the feather is wide, then let canvas
            // interpolate it back to the image resolution. This keeps edits
            // responsive even for large images and large feathers.
            const reduction = radius ? Math.min(8, Math.max(1, Math.floor(radius / 4))) : 1;
            layer.width = Math.ceil(tileWidth / reduction);
            layer.height = Math.ceil(tileHeight / reduction);
            const xScale = layer.width / tileWidth, yScale = layer.height / tileHeight;
            const brush = layer.getContext('2d');
            brush.setTransform(scale * xScale, 0, 0, scale * yScale, -left * xScale, -top * yScale);
            brush.fillStyle = object.color === 'black' ? '#000' : '#fff';
            brush.strokeStyle = brush.fillStyle;
            brush.lineWidth = object.size || 1;
            brush.lineJoin = 'round';
            brush.lineCap = 'round';
            MaskRenderer.shapePath(brush, object);
            if (['brush', 'eraser', 'line'].includes(object.type)) brush.stroke();
            else brush.fill();
            if (radius) {
                const image = brush.getImageData(0, 0, layer.width, layer.height);
                const alpha = new Uint8Array(layer.width * layer.height);
                for (let pixel = 0; pixel < alpha.length; pixel++) alpha[pixel] = image.data[pixel * 4 + 3];
                const softened = MaskRenderer.blurAlpha(alpha, layer.width, layer.height,
                    Math.max(1, Math.round(radius * Math.min(xScale, yScale))));
                const colour = object.color === 'black' ? 0 : 255;
                for (let pixel = 0; pixel < softened.length; pixel++) {
                    const offset = pixel * 4;
                    image.data[offset] = colour;
                    image.data[offset + 1] = colour;
                    image.data[offset + 2] = colour;
                    image.data[offset + 3] = softened[pixel];
                }
                brush.setTransform(1, 0, 0, 1, 0, 0);
                brush.putImageData(image, 0, 0);
            }
            context.imageSmoothingEnabled = true;
            context.drawImage(layer, left, top, tileWidth, tileHeight);
        }
    }

    class MaskEditor {
      constructor(element, options) {
        const settings = $.extend({
            modalId: 'allsky-mask-drawingModal',
            image: null,
            name: null,
            onComplete: function () {}
        }, options);
        let modal, canvas, ctx, panels = $(), background = null, backgroundName = '', width = 0, height = 0;
        let objects = [], history = [], historySizes = [], cursor = -1, selected = -1, active = null;
        let tool = 'select', paintColour = 'white', size = 20, feather = 0, backgroundOpacity = 65, displayScale = 1, zoom = 1;
        let projectName = settings.name || '', backgroundSourceMask = '', ready = false;
        let activeProjectOption = '', knownProjects = new Set(), confirmingOverwrite = false, loadSequence = 0;
        let cleanState = null, allowClose = false, confirmingClose = false;
        let previewMode = false, spacePan = false, cacheDirty = true, cacheExcluded = -2;
        const cachedObjects = document.createElement('canvas');
        const previewMask = document.createElement('canvas');
        const paintLayer = document.createElement('canvas');

        const field = id => modal.find('[data-mask-' + id + ']');
        const message = value => field('message').text(value || '');
        const saveFeedback = (value, state = '') => field('save-feedback').text(value || '').attr('data-state', state);
        const saveError = (reason, control) => {
            saveFeedback(reason, 'error');
            if (control) control.addClass('allsky-mask-invalid').trigger('focus');
        };
        const requestError = (xhr, fallback) => xhr.responseJSON?.message || fallback;
        const project = () => ({ version: 1, width, height, background: backgroundName, objects: copy(objects) });
        const state = () => JSON.stringify({ name: field('name').val().trim(), width, height, backgroundName, objects });
        const markClean = () => { cleanState = state(); };
        const hasUnsavedChanges = () => cleanState !== null && state() !== cleanState;
        const snapshot = () => {
            const serialized = JSON.stringify(objects);
            if (history[cursor] === serialized) return draw();
            history = history.slice(0, cursor + 1);
            historySizes = historySizes.slice(0, cursor + 1);
            history.push(serialized);
            historySizes.push(serialized.length);
            let totalBytes = historySizes.reduce((total, bytes) => total + bytes, 0);
            while (history.length > 1 && (history.length > 41 || totalBytes > 32 * 1024 * 1024)) {
                history.shift();
                totalBytes -= historySizes.shift();
            }
            cursor = history.length - 1;
            field('undo').prop('disabled', cursor < 1);
            field('redo').prop('disabled', true);
            cacheDirty = true;
            renderObjectList();
            draw();
        };
        const restore = index => {
            cursor = index;
            objects = JSON.parse(history[cursor]);
            selected = -1;
            field('undo').prop('disabled', cursor < 1);
            field('redo').prop('disabled', cursor >= history.length - 1);
            cacheDirty = true;
            renderObjectList();
            draw();
        };
        const renderObjectList = () => {
            if (field('object-panel').prop('hidden')) return;
            const list = field('object-list');
            list.find('[data-mask-object-action]').popover('destroy');
            list.empty();
            for (let index = objects.length - 1; index >= 0; index--) {
                const object = objects[index];
                const row = $('<div class="allsky-mask-object-row">').attr('data-mask-object-index', index);
                $('<button type="button" class="allsky-mask-object-name">')
                    .attr('aria-label', 'Select ' + object.type + ' ' + (index + 1))
                    .text((index + 1) + '. ' + object.type).appendTo(row);
                const actions = $('<span class="allsky-mask-object-actions">').appendTo(row);
                for (const [action, icon, label, disabled] of [
                    ['visibility', object.hidden ? 'fa-eye-slash' : 'fa-eye', object.hidden ? 'Show' : 'Hide', false],
                    ['duplicate', 'fa-copy', 'Duplicate', false],
                    ['up', 'fa-arrow-up', 'Move forward', index === objects.length - 1],
                    ['down', 'fa-arrow-down', 'Move backward', index === 0]
                ]) {
                    $('<button type="button" class="btn btn-default btn-xs">').attr({
                        'data-mask-object-action': action,
                        'aria-label': label + ' ' + object.type + ' ' + (index + 1),
                        title: label,
                        disabled: disabled || null
                    }).append($('<i class="fa-solid">').addClass(icon).attr('aria-hidden', 'true')).appendTo(actions);
                }
                list.append(row);
                row.find('[data-mask-object-action]').each(function () {
                    const action = this.dataset.maskObjectAction;
                    $(this).popover({ container: 'body', trigger: 'hover focus', placement: 'left',
                        content: action === 'visibility' ? 'Show or hide this object in the saved mask.' :
                            action === 'duplicate' ? 'Create an offset copy of this object.' :
                            'Change this object’s stacking order.',
                        delay: { show: 450, hide: 100 } });
                });
            }
            field('object-empty').prop('hidden', objects.length > 0);
        };
        const syncControls = () => {
            const object = objects[selected];
            field('selected').text(object ? 'Object ' + (selected + 1) + ' of ' + objects.length : 'No object selected');
            field('delete').prop('disabled', !object);
            field('size').val(object ? object.size : size);
            field('feather').val(object ? object.feather : feather);
            modal.find('[data-mask-color-choice]').each(function () {
                const isActive = $(this).data('mask-color-choice') === (object ? object.color : paintColour);
                $(this).toggleClass('active', isActive).attr('aria-pressed', String(isActive));
            });
            field('size-value').text(field('size').val() + ' px');
            field('feather-value').text(field('feather').val() + ' px');
            field('object-list').children('[data-mask-object-index]').each(function () {
                $(this).toggleClass('selected', Number(this.dataset.maskObjectIndex) === selected);
            });
        };
        const renderMask = (target, scale) => {
            const targetCtx = target.getContext('2d');
            const layer = document.createElement('canvas');
            layer.width = target.width;
            layer.height = target.height;
            targetCtx.filter = 'none';
            targetCtx.globalAlpha = 1;
            targetCtx.fillStyle = '#000';
            targetCtx.fillRect(0, 0, target.width, target.height);
            for (const object of objects) if (!object.hidden) MaskRenderer.paintObject(targetCtx, object, scale, layer);
            targetCtx.globalAlpha = 1;
        };
        const ensureCachedObjects = excluded => {
            if (!cacheDirty && cacheExcluded === excluded && cachedObjects.width === canvas.width &&
                cachedObjects.height === canvas.height) return;
            cachedObjects.width = canvas.width;
            cachedObjects.height = canvas.height;
            const cacheContext = cachedObjects.getContext('2d');
            for (let index = 0; index < objects.length; index++) {
                if (index !== excluded && !objects[index].hidden) {
                    MaskRenderer.paintObject(cacheContext, objects[index], displayScale, paintLayer);
                }
            }
            cacheExcluded = excluded;
            cacheDirty = false;
        };
        const draw = () => {
            if (!ready) return;
            const pixelWidth = canvas.width, pixelHeight = canvas.height;
            ctx.clearRect(0, 0, pixelWidth, pixelHeight);
            const liveIndex = active && active.kind !== 'pan' ? selected : -1;
            ensureCachedObjects(liveIndex);
            if (previewMode) {
                previewMask.width = pixelWidth;
                previewMask.height = pixelHeight;
                const maskContext = previewMask.getContext('2d');
                maskContext.fillStyle = '#000';
                maskContext.fillRect(0, 0, pixelWidth, pixelHeight);
                maskContext.drawImage(cachedObjects, 0, 0);
                if (liveIndex >= 0 && !objects[liveIndex].hidden) {
                    MaskRenderer.paintObject(maskContext, objects[liveIndex], displayScale, paintLayer);
                }
                if (background) {
                    ctx.drawImage(background, 0, 0, pixelWidth, pixelHeight);
                    ctx.globalCompositeOperation = 'multiply';
                    ctx.drawImage(previewMask, 0, 0);
                    ctx.globalCompositeOperation = 'source-over';
                } else ctx.drawImage(previewMask, 0, 0);
            } else {
                ctx.fillStyle = '#242424';
                ctx.fillRect(0, 0, pixelWidth, pixelHeight);
                ctx.globalAlpha = backgroundOpacity / 100;
                if (background) ctx.drawImage(background, 0, 0, pixelWidth, pixelHeight);
                ctx.globalAlpha = 1;
                ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
                ctx.fillRect(0, 0, pixelWidth, pixelHeight);
                ctx.drawImage(cachedObjects, 0, 0);
                if (liveIndex >= 0 && !objects[liveIndex].hidden) {
                    MaskRenderer.paintObject(ctx, objects[liveIndex], displayScale, paintLayer);
                }
            }
            const object = objects[selected];
            if (!previewMode && object && !object.hidden && panels.filter('[data-mask-panel="feather"]').prop('hidden')) {
                ctx.save();
                ctx.scale(displayScale, displayScale);
                ctx.strokeStyle = '#00d8ff';
                ctx.lineWidth = 2 / displayScale;
                ctx.setLineDash([7 / displayScale, 5 / displayScale]);
                const bounds = MaskRenderer.bounds(object);
                const padding = (object.feather || 0) +
                    (['brush', 'eraser', 'line'].includes(object.type) ? object.size / 2 : 0) + 6 / displayScale;
                ctx.strokeRect(bounds.left - padding, bounds.top - padding,
                    bounds.right - bounds.left + padding * 2, bounds.bottom - bounds.top + padding * 2);
                if (!['brush', 'eraser'].includes(object.type)) {
                    ctx.setLineDash([]);
                    for (const point of [object.a, object.b]) {
                        ctx.fillStyle = '#00d8ff';
                        ctx.fillRect(point.x - 5 / displayScale, point.y - 5 / displayScale,
                            10 / displayScale, 10 / displayScale);
                    }
                }
                ctx.restore();
            }
            syncControls();
        };
        const resize = () => {
            if (!width || !height) return;
            const frame = field('frame')[0];
            const wrap = field('canvas-wrap')[0];
            const centreX = ready ? (frame.scrollLeft + frame.clientWidth / 2 - canvas.offsetLeft) / displayScale : width / 2;
            const centreY = ready ? (frame.scrollTop + frame.clientHeight / 2 - canvas.offsetTop) / displayScale : height / 2;
            const maxWidth = Math.max(200, frame.clientWidth - 2);
            const maxHeight = Math.max(200, frame.clientHeight - 2);
            const fitScale = Math.min(1, maxWidth / width, maxHeight / height);
            const maxZoom = Math.min(4, 8192 / (width * fitScale), 8192 / (height * fitScale),
                Math.sqrt(32000000 / (width * height * fitScale * fitScale)));
            zoom = clamp(zoom, 0.25, maxZoom);
            displayScale = fitScale * zoom;
            canvas.width = Math.max(1, Math.round(width * displayScale));
            canvas.height = Math.max(1, Math.round(height * displayScale));
            canvas.style.width = canvas.width + 'px';
            canvas.style.height = canvas.height + 'px';
            wrap.style.width = Math.max(frame.clientWidth, canvas.width) + 'px';
            wrap.style.height = Math.max(frame.clientHeight, canvas.height) + 'px';
            frame.scrollLeft = centreX * displayScale + canvas.offsetLeft - frame.clientWidth / 2;
            frame.scrollTop = centreY * displayScale + canvas.offsetTop - frame.clientHeight / 2;
            field('zoom-value').text(Math.round(zoom * 100) + '%');
            field('zoom-out').prop('disabled', zoom <= 0.25);
            field('zoom-in').prop('disabled', zoom >= maxZoom);
            ready = true;
            cacheDirty = true;
            draw();
        };
        const setZoom = value => {
            zoom = value;
            resize();
        };
        const loadImage = (url, storedName, reset, markAsClean = false,
            beforeApply = null, isCurrent = () => true) => {
            const image = new Image();
            image.onload = () => {
                if (!isCurrent()) return;
                backgroundSourceMask = '';
                if (beforeApply) beforeApply();
                background = image;
                backgroundName = storedName || '';
                if (reset) {
                    ready = false;
                    width = image.naturalWidth;
                    height = image.naturalHeight;
                    zoom = 1;
                    objects = [];
                    history = [];
                    historySizes = [];
                    cursor = -1;
                    selected = -1;
                    snapshot();
                }
                resize();
                if (markAsClean) markClean();
                saveFeedback();
                message('Background: ' + width + ' × ' + height);
            };
            image.onerror = () => { if (isCurrent()) message('Unable to load background image.'); };
            image.src = url;
        };
        const pointer = event => {
            const rect = canvas.getBoundingClientRect();
            return {
                x: clamp((event.clientX - rect.left) * width / rect.width, 0, width),
                y: clamp((event.clientY - rect.top) * height / rect.height, 0, height)
            };
        };
        const hit = point => {
            const test = document.createElement('canvas').getContext('2d');
            for (let i = objects.length - 1; i >= 0; i--) {
                const object = objects[i];
                if (object.hidden) continue;
                MaskRenderer.shapePath(test, object);
                if (['brush', 'eraser', 'line'].includes(object.type)) {
                    test.lineWidth = Math.max(object.size, 10 / displayScale) + object.feather * 2;
                    if (test.isPointInStroke(point.x, point.y)) return i;
                } else if (test.isPointInPath(point.x, point.y)) return i;
            }
            return -1;
        };
        const moveObject = (object, dx, dy) => {
            object.a.x += dx; object.a.y += dy;
            if (object.b) { object.b.x += dx; object.b.y += dy; }
            if (object.points) object.points.forEach(point => { point.x += dx; point.y += dy; });
        };
        const detectCircle = () => {
            if (!background) return message('Choose a background image first.');
            const sample = document.createElement('canvas');
            sample.width = 256;
            sample.height = Math.max(1, Math.round(256 * height / width));
            const sampleCtx = sample.getContext('2d', { willReadFrequently: true });
            sampleCtx.drawImage(background, 0, 0, sample.width, sample.height);
            const pixels = sampleCtx.getImageData(0, 0, sample.width, sample.height).data;
            const brightness = (x, y) => {
                x = clamp(Math.round(x), 0, sample.width - 1);
                y = clamp(Math.round(y), 0, sample.height - 1);
                const i = (y * sample.width + x) * 4;
                return (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
            };
            const w = sample.width, h = sample.height, side = Math.min(w, h);
            let best = null;
            for (let cy = h * .4; cy <= h * .6; cy += Math.max(2, side * .04)) {
                for (let cx = w * .4; cx <= w * .6; cx += Math.max(2, side * .04)) {
                    for (let radius = side * .32; radius <= side * .58; radius += Math.max(2, side * .025)) {
                        let inside = 0, outside = 0, count = 0;
                        for (let angle = 0; angle < 48; angle++) {
                            const radians = angle * Math.PI / 24;
                            const ix = cx + Math.cos(radians) * radius * .88;
                            const iy = cy + Math.sin(radians) * radius * .88;
                            const ox = cx + Math.cos(radians) * radius * 1.08;
                            const oy = cy + Math.sin(radians) * radius * 1.08;
                            if (ox < 0 || ox >= w || oy < 0 || oy >= h) continue;
                            inside += brightness(ix, iy);
                            outside += brightness(ox, oy);
                            count++;
                        }
                        if (count < 24) continue;
                        const score = (inside - outside) / count;
                        if (!best || score > best.score) best = { cx, cy, radius, score };
                    }
                }
            }
            if (!best || best.score < 12) return message('No clear image circle found. Draw one manually.');
            const ratio = width / w;
            objects.push({ type: 'circle', color: 'white', a: { x: best.cx * ratio, y: best.cy * ratio },
                b: { x: (best.cx + best.radius) * ratio, y: best.cy * ratio }, size: 1,
                feather: Math.max(feather, Math.round(width * .008)) });
            selected = objects.length - 1;
            snapshot();
            message('Detected circle added. Select and drag it to adjust.');
        };
        const confirmAction = (title, detail, confirmLabel, callback) => {
            const dialog = bootbox.confirm({
                className: 'allsky-mask-close-confirm', title, message: detail,
                buttons: {
                    cancel: { label: 'Cancel', className: 'btn-default' },
                    confirm: { label: confirmLabel, className: 'btn-danger' }
                },
                callback
            });
            $('.modal-backdrop').last().addClass('allsky-mask-close-backdrop');
            dialog.on('hidden.bs.modal', () => {
                if (modal.hasClass('in')) $('body').addClass('modal-open');
            });
        };
        const confirmDiscard = (description, proceed) => {
            if (!hasUnsavedChanges()) return proceed();
            confirmAction('Discard unsaved mask changes?', description,
                'Discard changes', confirmed => { if (confirmed) proceed(); });
        };
        const normalizedName = () => field('name').val().trim().replace(/\.png$/i, '');
        const confirmOverwrite = name => {
            if (confirmingOverwrite) return;
            confirmingOverwrite = true;
            saveFeedback();
            confirmAction('Replace existing PNG?', 'Saving "' + $('<span>').text(name).html() +
                '" will replace its PNG and any editable mask project with that name.', 'Replace mask', confirmed => {
                confirmingOverwrite = false;
                if (confirmed) performSave(name, true);
            });
        };
        const saveProject = (name, overwrite) => {
            const output = document.createElement('canvas');
            output.width = width;
            output.height = height;
            let image;
            try {
                renderMask(output, 1);
                image = output.toDataURL('image/png');
            } catch (error) {
                saveError('Unable to render the PNG mask. Try a smaller background image.');
                field('save').prop('disabled', false);
                return;
            }
            $.ajax({ url: api + 'MaskProject', method: 'POST', dataType: 'json',
                data: { name, sourceMask: backgroundSourceMask, overwrite: overwrite ? 1 : 0,
                    project: JSON.stringify(project()), image } })
                .done(response => {
                    projectName = name;
                    backgroundSourceMask = name;
                    knownProjects.add(name);
                    markClean();
                    allowClose = true;
                    modal.modal('hide');
                    settings.onComplete.call(element, response);
                })
                .fail(xhr => {
                    if (xhr.status === 409 && !overwrite) confirmOverwrite(name);
                    else saveError(requestError(xhr, 'Unable to save mask. Check the connection and try again.'));
                })
                .always(() => field('save').prop('disabled', false));
        };
        const performSave = (name, overwrite) => {
            field('save').prop('disabled', true);
            saveFeedback('Saving mask…', 'progress');
            if (backgroundName || !background) return saveProject(name, overwrite);
            $.ajax({ url: api + 'MaskBackground', method: 'POST', dataType: 'json', data: { current: 1 } })
                .done(result => { backgroundName = result.background; backgroundSourceMask = ''; saveProject(name, overwrite); })
                .fail(xhr => {
                    saveError(requestError(xhr, 'Unable to store the background image. Check the connection and try again.'));
                    field('save').prop('disabled', false);
                });
        };
        const save = () => {
            saveFeedback();
            if (!ready) return saveError('Choose a background image before saving.');
            const name = normalizedName();
            if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(name)) {
                return saveError('Enter a mask name using letters, numbers, underscores or hyphens.', field('name'));
            }
            field('name').removeClass('allsky-mask-invalid');
            loadSequence++; // A pending background or project load must not replace the mask being saved.
            if (knownProjects.has(name) || name === projectName) return confirmOverwrite(name);
            performSave(name, false);
        };
        const build = () => {
            $('#' + settings.modalId).remove();
            modal = $(`<div class="modal fade" id="${settings.modalId}" tabindex="-1" role="dialog" aria-label="Mask editor">
              <div class="modal-dialog allsky-mask-dialog" role="document"><div class="modal-content">
                <div class="modal-header allsky-mask-header">
                  <h4 class="modal-title">Mask Editor</h4>
                  <div class="allsky-mask-project-row">
                    <label>Mask name <input data-mask-name type="text" maxlength="80" placeholder="my_mask" class="form-control input-sm"></label>
                    <label>Saved mask <select data-mask-projects class="form-control input-sm"><option value="">New mask</option></select></label>
                    <span data-mask-imagepicker class="allsky-mask-image-picker">
                      <input type="hidden" class="js-allsky-image-picker-input">
                      <button type="button" class="btn btn-default js-allsky-image-picker-button" title="Choose background image" aria-label="Choose background image"><i class="fa-solid fa-folder-open" aria-hidden="true"></i></button>
                    </span>
                    <button data-mask-detect type="button" class="btn btn-default" title="Detect image circle" aria-label="Detect image circle"><i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i></button>
                  </div>
                  <div class="allsky-mask-header-actions">
                    <div class="btn-group" role="group" aria-label="Undo, redo and clear">
                      <button data-mask-undo type="button" class="btn btn-default" title="Undo" aria-label="Undo" disabled><i class="fa-solid fa-rotate-left" aria-hidden="true"></i></button>
                      <button data-mask-redo type="button" class="btn btn-default" title="Redo" aria-label="Redo" disabled><i class="fa-solid fa-rotate-right" aria-hidden="true"></i></button>
                      <button data-mask-clear type="button" class="btn btn-default" title="Clear all objects" aria-label="Clear all objects"><i class="fa-solid fa-broom" aria-hidden="true"></i></button>
                    </div>
                    <span class="allsky-mask-close-action"><button data-mask-close type="button" class="btn btn-default" data-dismiss="modal" title="Close editor" aria-label="Close editor"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button></span>
                  </div>
                </div>
                <div class="modal-body"><div class="allsky-mask-toolbar" role="toolbar" aria-label="Mask editor tools">
                  <div data-mask-tool-row class="allsky-mask-tool-row">
                    <div class="allsky-mask-tools btn-group" role="group" aria-label="Drawing tools">
                      <button data-tool="select" type="button" class="btn btn-default active" title="Select and move" aria-label="Select and move"><i class="fa-solid fa-arrow-pointer" aria-hidden="true"></i></button>
                      <button data-tool="brush" type="button" class="btn btn-default" title="Brush" aria-label="Brush"><i class="fa-solid fa-paintbrush" aria-hidden="true"></i></button>
                      <button data-tool="eraser" type="button" class="btn btn-default" title="Eraser" aria-label="Eraser"><i class="fa-solid fa-eraser" aria-hidden="true"></i></button>
                      <button data-tool="rectangle" type="button" class="btn btn-default" title="Rectangle" aria-label="Rectangle"><i class="fa-regular fa-square" aria-hidden="true"></i></button>
                      <button data-tool="ellipse" type="button" class="btn btn-default" title="Ellipse" aria-label="Ellipse"><span class="allsky-mask-ellipse-icon" aria-hidden="true"></span></button>
                      <button data-tool="circle" type="button" class="btn btn-default" title="Circle" aria-label="Circle"><i class="fa-regular fa-circle" aria-hidden="true"></i></button>
                      <button data-tool="line" type="button" class="btn btn-default" title="Line" aria-label="Line"><i class="fa-solid fa-slash" aria-hidden="true"></i></button>
                    </div>
                    <div class="allsky-mask-colors btn-group" role="group" aria-label="Paint colour">
                      <button data-mask-color-choice="white" type="button" class="btn btn-default active" title="Paint white: show image" aria-label="Paint white: show image" aria-pressed="true"><span class="allsky-mask-swatch allsky-mask-swatch-white"></span></button>
                      <button data-mask-color-choice="black" type="button" class="btn btn-default" title="Paint black: hide image" aria-label="Paint black: hide image" aria-pressed="false"><span class="allsky-mask-swatch allsky-mask-swatch-black"></span></button>
                    </div>
                    <div class="allsky-mask-popover-wrap">
                      <button data-mask-panel-toggle="size" type="button" class="btn btn-default" title="Brush and line size" aria-label="Brush and line size" aria-expanded="false"><i class="fa-solid fa-up-right-and-down-left-from-center" aria-hidden="true"></i></button>
                      <div data-mask-panel="size" class="allsky-mask-popover" hidden><label>Brush / line size</label><div class="allsky-mask-slider-row"><input data-mask-size type="range" min="1" max="200" value="20" aria-label="Brush and line size"><span data-mask-size-value>20 px</span></div></div>
                    </div>
                    <div class="allsky-mask-popover-wrap">
                      <button data-mask-panel-toggle="feather" type="button" class="btn btn-default" title="Feather edges" aria-label="Feather edges" aria-expanded="false"><i class="fa-solid fa-feather" aria-hidden="true"></i></button>
                      <div data-mask-panel="feather" class="allsky-mask-popover" hidden><label>Feather edges</label><div class="allsky-mask-slider-row"><input data-mask-feather type="range" min="0" max="100" value="0" aria-label="Feather edges"><span data-mask-feather-value>0 px</span></div></div>
                    </div>
                    <div class="allsky-mask-popover-wrap">
                      <button data-mask-panel-toggle="opacity" type="button" class="btn btn-default" title="Background opacity" aria-label="Background opacity" aria-expanded="false"><i class="fa-solid fa-image" aria-hidden="true"></i></button>
                      <div data-mask-panel="opacity" class="allsky-mask-popover" hidden><label>Background opacity</label><div class="allsky-mask-slider-row"><input data-mask-opacity type="range" min="0" max="100" value="65" aria-label="Background opacity"><span data-mask-opacity-value>65%</span></div></div>
                    </div>
                    <button data-mask-delete type="button" class="btn btn-default" title="Delete selected object" aria-label="Delete selected object" disabled><i class="fa-solid fa-trash" aria-hidden="true"></i></button>
                    <div class="allsky-mask-zoom btn-group" role="group" aria-label="Canvas zoom">
                      <button data-mask-zoom-out type="button" class="btn btn-default" title="Zoom out" aria-label="Zoom out"><i class="fa-solid fa-magnifying-glass-minus" aria-hidden="true"></i></button>
                      <button data-mask-zoom-fit type="button" class="btn btn-default" title="Fit image" aria-label="Fit image"><i class="fa-solid fa-expand" aria-hidden="true"></i></button>
                      <button data-mask-zoom-in type="button" class="btn btn-default" title="Zoom in" aria-label="Zoom in"><i class="fa-solid fa-magnifying-glass-plus" aria-hidden="true"></i></button>
                    </div>
                    <button data-mask-preview type="button" class="btn btn-default" title="Preview masked image" aria-label="Preview masked image" aria-pressed="false"><i class="fa-solid fa-eye" aria-hidden="true"></i></button>
                    <button data-mask-objects type="button" class="btn btn-default" title="Show object list" aria-label="Show object list" aria-expanded="false"><i class="fa-solid fa-layer-group" aria-hidden="true"></i></button>
                    <span data-mask-zoom-value class="allsky-mask-zoom-value" aria-live="polite">100%</span>
                    <span data-mask-selected class="allsky-mask-selection">No object selected</span>
                  </div>
                </div><div class="allsky-mask-stage"><div data-mask-frame class="allsky-mask-frame"><div data-mask-canvas-wrap class="allsky-mask-canvas-wrap"><canvas data-mask-canvas></canvas></div></div>
                  <aside data-mask-object-panel class="allsky-mask-object-panel" aria-label="Mask objects" hidden><div class="allsky-mask-object-panel-title">Objects <small>Top first</small></div><div data-mask-object-list class="allsky-mask-object-list"></div><p data-mask-object-empty class="allsky-mask-object-empty">No objects yet</p></aside></div>
                <p data-mask-message class="allsky-mask-message" role="status"></p></div>
                <div class="modal-footer"><span data-mask-save-feedback class="allsky-mask-save-feedback" role="status" aria-live="polite"></span><button data-mask-save type="button" class="btn btn-primary">Save</button><button data-mask-close type="button" class="btn btn-default" data-dismiss="modal">Close</button></div>
              </div></div></div>`).appendTo('body');
            this.modal = modal;
            panels = modal.find('[data-mask-panel]');
            panels.each(function () { $(this).data('mask-home', this.parentNode); });
            canvas = field('canvas')[0];
            ctx = canvas.getContext('2d');
            const pickerContainer = field('imagepicker');
            let pickerModal = null;
            if (typeof $.fn.allskyImagePicker === 'function') {
                pickerContainer.allskyImagePicker({
                    title: 'Choose mask background image',
                    topLevelFoldersOnly: true,
                    excludeTestFolders: true
                });
                pickerModal = pickerContainer.data('allskyImagePicker').modalElement;
                pickerModal.on('hidden.bs.modal', () => {
                    if (modal.hasClass('in')) $('body').addClass('modal-open');
                });
                modal.on('hidden.bs.modal', () => pickerModal.remove());
            } else {
                pickerContainer.find('button').prop('disabled', true);
                message('Image picker is unavailable.');
            }
            pickerContainer.find('.js-allsky-image-picker-input').on('change', function () {
                if (!this.value) return;
                const path = this.value;
                this.value = '';
                if (field('save').prop('disabled')) return message('Wait for the mask to finish saving.');
                const sequence = ++loadSequence;
                const choose = () => confirmDiscard(
                    'Choosing another background will clear the current mask objects and unsaved changes.', () => {
                        const acceptedState = state();
                        saveFeedback();
                        message('Loading background…');
                        $.ajax({ url: api + 'MaskBackground', method: 'POST', dataType: 'json', data: { path } })
                            .done(result => {
                                if (sequence === loadSequence) loadImage(result.url + '&v=' + Date.now(),
                                    result.background, true, false, null, () => {
                                        if (sequence !== loadSequence) return false;
                                        if (state() !== acceptedState) {
                                            message('Mask changed while the background loaded. Choose the image again.');
                                            return false;
                                        }
                                        return true;
                                    });
                            })
                            .fail(xhr => {
                                if (sequence === loadSequence) message(requestError(xhr, 'Unable to load background image.'));
                            });
                    });
                if (pickerModal && pickerModal.hasClass('in')) pickerModal.one('hidden.bs.modal', choose);
                else choose();
            });
            field('name').val(projectName);
            markClean();
            field('name').on('input', function () {
                $(this).removeClass('allsky-mask-invalid');
                saveFeedback();
            });
            for (const id of ['undo', 'redo', 'clear', 'delete', 'zoom-out', 'zoom-fit', 'zoom-in']) {
                field(id).wrap('<span class="allsky-mask-help-host"></span>').removeAttr('title');
            }
            const help = [
                [field('undo'), 'Undo', 'Revert a recent change. Up to 40 steps are kept within the undo memory limit.'],
                [field('redo'), 'Redo', 'Restore the last undone change.'],
                [field('clear'), 'Clear mask', 'Remove all drawn objects. You can undo this.'],
                [field('close'), 'Close editor', 'Close the editor. Unsaved changes require confirmation.'],
                [field('name'), 'Mask name', 'Name the PNG mask and editable project.'],
                [field('projects'), 'Saved mask', 'Open a saved mask or start a new one. Unsaved changes require confirmation.'],
                [pickerContainer.find('button'), 'Background image', 'Choose an image to draw the mask over. Clearing unsaved objects requires confirmation.'],
                [field('detect'), 'Detect image circle', 'Find the circular image area and add a feathered white circle.'],
                [modal.find('[data-tool="select"]'), 'Select', 'Click an object to edit it. Drag it to move it, or drag a shape handle to resize it.'],
                [modal.find('[data-tool="brush"]'), 'Brush', 'Draw a freehand stroke using the selected paint colour and brush size.'],
                [modal.find('[data-tool="eraser"]'), 'Eraser', 'Paint black freehand to hide part of the masked image.'],
                [modal.find('[data-tool="rectangle"]'), 'Rectangle', 'Drag to draw a filled rectangle. The editor returns to Select afterward.'],
                [modal.find('[data-tool="ellipse"]'), 'Ellipse', 'Drag to draw a filled ellipse. The editor returns to Select afterward.'],
                [modal.find('[data-tool="circle"]'), 'Circle', 'Drag outward from the centre to draw a filled circle.'],
                [modal.find('[data-tool="line"]'), 'Line', 'Drag to draw a line at the selected brush size.'],
                [modal.find('[data-mask-color-choice="white"]'), 'White paint', 'White reveals the image through the saved mask.'],
                [modal.find('[data-mask-color-choice="black"]'), 'Black paint', 'Black hides the image in the saved mask.'],
                [modal.find('[data-mask-panel-toggle="size"]'), 'Brush size', 'Set the width of brush, eraser, and line strokes.'],
                [modal.find('[data-mask-panel-toggle="feather"]'), 'Feather', 'Soften the edge of the selected object or new objects.'],
                [modal.find('[data-mask-panel-toggle="opacity"]'), 'Background opacity', 'Change only the background image opacity in this preview.'],
                [field('size'), 'Brush size', 'Set the stroke width in pixels.'],
                [field('feather'), 'Feather', 'Set the edge softness in pixels.'],
                [field('opacity'), 'Background opacity', 'Adjust background visibility while editing. This does not change the saved mask.'],
                [field('delete'), 'Delete object', 'Remove the selected object. You can undo this.'],
                [field('zoom-out'), 'Zoom out', 'Reduce the editor canvas zoom.'],
                [field('zoom-fit'), 'Fit image', 'Fit the full image in the editor.'],
                [field('zoom-in'), 'Zoom in', 'Enlarge the editor canvas for detailed work.'],
                [field('preview'), 'Preview result', 'Show how the background image looks through the saved mask. Click again to edit.'],
                [field('objects'), 'Object list', 'Show objects to select, hide, duplicate, or change their stacking order.'],
                [field('save'), 'Save mask', 'Save the PNG mask and its editable project. Replacing an existing mask requires confirmation.']
            ];
            let helpControls = $();
            for (const [control, title, content] of help) {
                control.each(function () {
                    const element = $(this);
                    const host = element.parent('.allsky-mask-help-host');
                    const target = host.length ? host : element;
                    const placement = target.closest('.modal-footer').length ? 'top' : 'bottom';
                    target.popover({ title, content, container: 'body', trigger: 'hover focus',
                        placement, delay: { show: 450, hide: 100 } });
                    helpControls = helpControls.add(target);
                });
            }
            modal.on('click', 'button, input, select', event => {
                const control = $(event.target).closest('button, input, select');
                const host = control.parent('.allsky-mask-help-host');
                const target = host.length ? host : control;
                if (target.data('bs.popover')) target.popover('hide');
            });
            modal.on('hide.bs.modal', () => helpControls.popover('hide'));
            modal.on('hidden.bs.modal', () => {
                helpControls.popover('destroy');
                field('object-list').find('[data-mask-object-action]').popover('destroy');
            });
            field('zoom-out').on('click', () => setZoom(zoom / 1.25));
            field('zoom-in').on('click', () => setZoom(zoom * 1.25));
            field('zoom-fit').on('click', () => setZoom(1));
            modal.on('hide.bs.modal', event => {
                if (allowClose || !hasUnsavedChanges()) return;
                event.preventDefault();
                if (confirmingClose) return;
                confirmingClose = true;
                const confirmDialog = bootbox.confirm({
                    className: 'allsky-mask-close-confirm',
                    title: 'Discard mask changes?',
                    message: 'Close the mask editor and discard your unsaved changes?',
                    buttons: {
                        cancel: { label: 'Keep editing', className: 'btn-default' },
                        confirm: { label: 'Discard changes', className: 'btn-danger' }
                    },
                    callback: confirmed => {
                        if (confirmed) {
                            allowClose = true;
                            modal.modal('hide');
                        }
                    }
                });
                $('.modal-backdrop').last().addClass('allsky-mask-close-backdrop');
                confirmDialog.on('hidden.bs.modal', () => {
                    confirmingClose = false;
                    if (modal.hasClass('in')) $('body').addClass('modal-open');
                });
            });
            modal.on('shown.bs.modal', resize).on('hidden.bs.modal', () => {
                loadSequence++;
                $(window).off('resize.allskyMask', resize);
                $(window).off('resize.allskyMaskPanel');
                $(document).off('click.allskyMaskPanel');
                $(document).off('.allskyMaskKeys');
                modal.remove();
                $(element).removeData('allskyMASK');
            });
            $(window).on('resize.allskyMask', resize);
            modal.on('click', '[data-tool]', event => {
                tool = $(event.currentTarget).data('tool');
                modal.find('[data-tool]').removeClass('active');
                $(event.currentTarget).addClass('active');
                selected = -1; draw();
            });
            const closePanels = () => {
                const featherWasOpen = !panels.filter('[data-mask-panel="feather"]').prop('hidden');
                panels.each(function () {
                    const panel = $(this);
                    const home = panel.data('mask-home');
                    panel.prop('hidden', true).removeAttr('style');
                    if (this.parentNode !== home) panel.appendTo(home);
                });
                modal.find('[data-mask-panel-toggle]').attr('aria-expanded', 'false').removeClass('active');
                if (featherWasOpen) draw();
            };
            modal.on('hide.bs.modal', closePanels);
            $(window).on('resize.allskyMaskPanel', closePanels);
            field('tool-row').on('scroll', closePanels);
            modal.on('click', '[data-mask-panel-toggle]', event => {
                event.stopPropagation();
                const button = $(event.currentTarget);
                const panel = panels.filter('[data-mask-panel="' + button.data('mask-panel-toggle') + '"]');
                const shouldOpen = panel.prop('hidden');
                closePanels();
                if (shouldOpen) {
                    const content = modal.find('.modal-content');
                    panel.appendTo(content).prop('hidden', false);
                    const rect = button[0].getBoundingClientRect();
                    const bounds = content[0].getBoundingClientRect();
                    const left = Math.max(8, Math.min(rect.left - bounds.left, bounds.width - panel.outerWidth() - 8));
                    const below = rect.bottom - bounds.top + 6;
                    const top = below + panel.outerHeight() <= bounds.height - 8
                        ? below : Math.max(8, rect.top - bounds.top - panel.outerHeight() - 6);
                    panel.css({ left: left + 'px', top: top + 'px' });
                    button.attr('aria-expanded', 'true').addClass('active');
                    if (button.data('mask-panel-toggle') === 'feather') draw();
                }
            });
            panels.on('click', event => event.stopPropagation());
            $(document).on('click.allskyMaskPanel', closePanels);
            field('size').on('input', function () {
                size = Number(this.value);
                if (selected >= 0) objects[selected].size = size;
                cacheDirty = true;
                draw();
            });
            field('size').on('change', () => { if (selected >= 0) snapshot(); });
            field('feather').on('input', function () {
                feather = Number(this.value);
                if (selected >= 0) objects[selected].feather = feather;
                cacheDirty = true;
                draw();
            });
            field('feather').on('change', () => { if (selected >= 0) snapshot(); });
            field('opacity').on('input change', function () {
                backgroundOpacity = Number(this.value);
                field('opacity-value').text(backgroundOpacity + '%');
                draw();
            });
            modal.on('click', '[data-mask-color-choice]', event => {
                paintColour = $(event.currentTarget).data('mask-color-choice');
                if (selected >= 0) { objects[selected].color = paintColour; snapshot(); }
                else syncControls();
            });
            field('undo').on('click', () => { if (cursor > 0) restore(cursor - 1); });
            field('redo').on('click', () => { if (cursor < history.length - 1) restore(cursor + 1); });
            const deleteSelected = () => { if (selected >= 0) { objects.splice(selected, 1); selected = -1; snapshot(); } };
            field('delete').on('click', deleteSelected);
            field('clear').on('click', () => { objects = []; selected = -1; snapshot(); });
            field('preview').on('click', () => {
                previewMode = !previewMode;
                field('preview').toggleClass('active', previewMode).attr('aria-pressed', String(previewMode));
                field('preview').attr('aria-label', previewMode ? 'Return to editing' : 'Preview masked image');
                modal.toggleClass('allsky-mask-previewing', previewMode);
                draw();
            });
            field('objects').on('click', () => {
                const panel = field('object-panel');
                const opening = panel.prop('hidden');
                panel.prop('hidden', !opening);
                field('objects').toggleClass('active', opening).attr('aria-expanded', String(opening));
                if (opening) renderObjectList();
                resize();
            });
            field('object-list').on('click', '[data-mask-object-index]', event => {
                const row = $(event.target).closest('[data-mask-object-index]');
                const index = Number(row.attr('data-mask-object-index'));
                const action = $(event.target).closest('[data-mask-object-action]').attr('data-mask-object-action');
                if (!action) {
                    selected = index;
                    tool = 'select';
                    modal.find('[data-tool]').removeClass('active');
                    modal.find('[data-tool="select"]').addClass('active');
                    draw();
                    return;
                }
                if (action === 'visibility') {
                    objects[index].hidden = !objects[index].hidden;
                    if (objects[index].hidden && selected === index) selected = -1;
                } else if (action === 'duplicate') {
                    const duplicated = copy(objects[index]);
                    moveObject(duplicated, 20, 20);
                    objects.splice(index + 1, 0, duplicated);
                    selected = index + 1;
                } else {
                    const destination = index + (action === 'up' ? 1 : -1);
                    if (destination < 0 || destination >= objects.length) return;
                    [objects[index], objects[destination]] = [objects[destination], objects[index]];
                    if (selected === index) selected = destination;
                    else if (selected === destination) selected = index;
                }
                snapshot();
            });
            $(document).on('keydown.allskyMaskKeys keyup.allskyMaskKeys', event => {
                if (event.type === 'keyup') {
                    if (event.code === 'Space') {
                        spacePan = false;
                        modal.removeClass('allsky-mask-panning');
                    }
                    return;
                }
                if ($('.modal.in').last()[0] !== modal[0]) return;
                const editingText = $(event.target).is('input, textarea, select, [contenteditable="true"]');
                if (editingText) return;
                if (event.code === 'Space' && !event.ctrlKey && !event.metaKey && !event.altKey) {
                    if ($(event.target).is('button, a')) return;
                    spacePan = true;
                    modal.addClass('allsky-mask-panning');
                    event.preventDefault();
                } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
                    if (event.shiftKey) field('redo').trigger('click');
                    else field('undo').trigger('click');
                    event.preventDefault();
                } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
                    field('redo').trigger('click');
                    event.preventDefault();
                } else if (event.key === 'Delete' || event.key === 'Backspace') {
                    deleteSelected();
                    event.preventDefault();
                }
            });
            field('detect').on('click', detectCircle);
            field('save').on('click', save);
            field('projects').on('change', function () {
                const name = this.value;
                field('projects').val(activeProjectOption);
                if (name === activeProjectOption) return;
                if (field('save').prop('disabled')) return message('Wait for the mask to finish saving.');
                const sequence = ++loadSequence;
                const open = () => {
                    if (!name) {
                        projectName = '';
                        activeProjectOption = '';
                        field('name').val('');
                        field('projects').val('');
                        objects = [];
                        history = []; historySizes = []; cursor = -1; selected = -1;
                        snapshot();
                        markClean();
                        message('New mask. Choose a background or draw on the current image.');
                        return;
                    }
                    saveFeedback();
                    message('Opening mask…');
                    const acceptedState = state();
                    $.getJSON(api + 'MaskProject', { name }).done(result => {
                        if (sequence !== loadSequence) return;
                        if (state() !== acceptedState) {
                            return message('Mask changed while the project loaded. Open it again.');
                        }
                        if (result.version !== 1 || !Array.isArray(result.objects)) {
                            return message('Unsupported mask project.');
                        }
                        const apply = () => {
                            projectName = name;
                            activeProjectOption = name;
                            backgroundSourceMask = name;
                            field('name').val(name);
                            field('projects').val(name);
                            ready = false;
                            width = result.width; height = result.height;
                            zoom = 1;
                            objects = result.objects;
                            selected = -1; history = []; historySizes = []; cursor = -1;
                            tool = 'select';
                            modal.find('[data-tool]').removeClass('active');
                            modal.find('[data-tool="select"]').addClass('active');
                            snapshot();
                        };
                        const url = result.background ? api + 'MaskBackground&mask=' + encodeURIComponent(name) +
                            '&name=' + encodeURIComponent(result.background) : settings.image;
                        if (url) loadImage(url, result.background || '', false, true, apply,
                            () => {
                                if (sequence !== loadSequence) return false;
                                if (state() !== acceptedState) {
                                    message('Mask changed while the project image loaded. Open it again.');
                                    return false;
                                }
                                return true;
                            });
                        else {
                            apply(); background = null; backgroundName = '';
                            resize(); markClean();
                        }
                    }).fail(xhr => {
                        if (sequence === loadSequence) message(requestError(xhr, 'Unable to open mask project.'));
                    });
                };
                confirmDiscard('Opening another mask will replace your current unsaved changes.', open);
            });
            canvas.addEventListener('pointerdown', event => {
                if (!ready || event.button !== 0) return;
                if (previewMode && !spacePan) return;
                canvas.setPointerCapture(event.pointerId);
                if (spacePan) {
                    active = { kind: 'pan', x: event.clientX, y: event.clientY,
                        left: field('frame')[0].scrollLeft, top: field('frame')[0].scrollTop };
                    return;
                }
                const point = pointer(event);
                if (tool === 'select') {
                    const current = objects[selected] && !objects[selected].hidden ? objects[selected] : null;
                    const handle = current && !['brush', 'eraser'].includes(current.type) &&
                        ['a', 'b'].find(key => Math.hypot(point.x - current[key].x, point.y - current[key].y) < 12 / displayScale);
                    if (handle) active = { kind: 'resize', handle, changed: false };
                    else {
                        selected = hit(point);
                        active = selected < 0 ? null : { kind: 'move', last: point, changed: false };
                    }
                } else {
                    const object = { type: tool, color: tool === 'eraser' ? 'black' : paintColour,
                        a: point, b: copy(point), size, feather };
                    if (['brush', 'eraser'].includes(tool)) object.points = [copy(point)];
                    objects.push(object);
                    selected = objects.length - 1;
                    active = { kind: 'draw', object };
                }
                draw();
            });
            canvas.addEventListener('pointermove', event => {
                if (!active) return;
                if (active.kind === 'pan') {
                    const frame = field('frame')[0];
                    frame.scrollLeft = active.left - (event.clientX - active.x);
                    frame.scrollTop = active.top - (event.clientY - active.y);
                    return;
                }
                const point = pointer(event);
                if (active.kind === 'move') {
                    const dx = point.x - active.last.x, dy = point.y - active.last.y;
                    if (dx || dy) { moveObject(objects[selected], dx, dy); active.changed = true; }
                    active.last = point;
                } else if (active.kind === 'resize') {
                    objects[selected][active.handle] = point;
                    active.changed = true;
                } else if (['brush', 'eraser'].includes(tool)) active.object.points.push(point);
                else active.object.b = point;
                draw();
            });
            const finish = event => {
                if (!active) return;
                if (active.kind === 'draw' || active.changed) snapshot();
                if (event.type === 'pointerup' && active.kind === 'draw' &&
                    ['rectangle', 'ellipse', 'circle', 'line'].includes(active.object.type)) {
                    tool = 'select';
                    modal.find('[data-tool]').removeClass('active');
                    modal.find('[data-tool="select"]').addClass('active');
                }
                active = null;
            };
            canvas.addEventListener('pointerup', finish);
            canvas.addEventListener('pointercancel', finish);
            $.getJSON(api + 'MaskProjects').done(names => {
                knownProjects = new Set(names);
                names.forEach(name => field('projects').append($('<option>').val(name).text(name)));
                if (projectName && names.includes(projectName)) field('projects').val(projectName).trigger('change');
            });
            if (!projectName) {
                const sequence = ++loadSequence;
                $.ajax({ url: api + 'MaskBackground', method: 'POST', dataType: 'json', data: { current: 1 } })
                    .done(result => {
                        if (sequence === loadSequence) loadImage(result.url, result.background, true, true,
                            null, () => sequence === loadSequence);
                    })
                    .fail(() => {
                        if (sequence === loadSequence) message('Choose a background image to begin.');
                    });
            }
            modal.modal({ keyboard: true });
        };
        build();
      }
      destroy() {
        if (this.modal) this.modal.modal('hide');
      }
    }

    $.fn.allskyMASK = function (options) {
        return this.each(function () {
            const existing = $(this).data('allskyMASK');
            if (existing) existing.destroy();
            $(this).data('allskyMASK', new MaskEditor(this, options));
        });
    };
})(jQuery);
