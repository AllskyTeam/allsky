"use strict";

class ALLSKYLOGS {
    constructor() {
        this.timer = null;
        this.currentLogId = null;
        this.offset = null;
        this.follow = true;
        this.maxBytes = 65536;
        this.maxChars = 200000;
        this.buffer = '';

        this.$select = $('#as-system-log-select');
        this.$output = $('#as-system-log-output');
        this.$meta = $('#as-system-log-meta');
        this.$warning = $('#as-system-log-warning');
        this.$follow = $('#as-system-log-follow');

        this.fetchList = this.fetchList.bind(this);
        this.fetchTail = this.fetchTail.bind(this);
    }

    setMeta(text) {
        this.$meta.text(text);
    }

    setWarning(text) {
        if (text) {
            this.$warning.text(text).show();
        } else {
            this.$warning.hide().text('');
        }
    }

    fetchList() {
        $.ajax({
            url: 'includes/logutil.php?request=LogList',
            method: 'GET',
            cache: false,
            dataType: 'json'
        }).done((list) => {
            this.$select.empty();
            this.setWarning('');
            if (!Array.isArray(list) || list.length === 0) {
                this.setMeta('No logs available.');
                return;
            }
            let defaultId = null;
            list.forEach((item) => {
                const opt = $('<option></option>').val(item.id).text(item.label);
                this.$select.append(opt);
                if (item.default && !defaultId) defaultId = item.id;
            });
            if (defaultId) {
                this.currentLogId = defaultId;
            } else if (!this.currentLogId) {
                this.currentLogId = list[0].id;
            }
            this.$select.val(this.currentLogId);
            this.offset = null;
            this.$output.text('');
            this.fetchTail();
        }).fail(() => {
            this.setMeta('Unable to load log list.');
            this.setWarning('Unable to load log list.');
        });
    }

    appendText(text) {
        if (!text) return;
        this.buffer += text;
        if (this.buffer.length > this.maxChars) {
            this.buffer = this.buffer.slice(-this.maxChars);
        }
        this.renderBuffer();
    }

    renderBuffer() {
        const el = this.$output[0];
        el.innerHTML = this.colorize(this.buffer);
        if (this.follow) {
            el.scrollTop = el.scrollHeight;
        }
    }

    escapeHtml(text) {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    colorize(text) {
        const safe = this.escapeHtml(text);
        return safe
            .replace(/\bERROR\b/g, '<span class="log-error">ERROR</span>')
            .replace(/\bWARN\b/g, '<span class="log-warn">WARN</span>')
            .replace(/\bINFO\b/g, '<span class="log-info">INFO</span>');
    }

    fetchTail() {
        if (!this.currentLogId) return;

        const params = $.param({
            request: 'LogTail',
            logId: this.currentLogId,
            offset: this.offset !== null ? this.offset : '',
            maxBytes: this.maxBytes
        });

        $.ajax({
            url: 'includes/logutil.php?' + params,
            method: 'GET',
            cache: false,
            dataType: 'json'
        }).done((data) => {
            if (!data || data.error) {
                this.setMeta('Error reading log.');
                this.setWarning('Unable to read the log file. Check file path and permissions for the web server user.');
                return;
            }

            this.setWarning('');
            if (data.reset) {
                this.buffer = '';
                this.$output.text('');
            }

            this.appendText(data.text || '');
            this.offset = typeof data.nextOffset === 'number' ? data.nextOffset : this.offset;

            const size = typeof data.size === 'number' ? data.size : 0;
            const now = new Date();
            const meta = `Updated ${now.toLocaleTimeString()} | Size ${size} bytes` + (data.truncated ? ' | Truncated' : '');
            this.setMeta(meta);
        }).fail(() => {
            this.setMeta('Error reading log.');
            this.setWarning('Unable to read the log file. Check file path and permissions for the web server user.');
        });
    }

    run() {
        this.$select.on('change', () => {
            this.currentLogId = this.$select.val();
            this.offset = null;
            this.buffer = '';
            this.$output.text('');
            this.fetchTail();
        });

        this.$follow.on('change', () => {
            this.follow = this.$follow.is(':checked');
        });

        this.fetchList();
        this.timer = setInterval(() => this.fetchTail(), 2000);
    }
}

let allskyLogs = new ALLSKYLOGS();
allskyLogs.run();
