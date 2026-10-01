"use strict";

class AjaxPoller {
  constructor({
    url,
    interval = 5000,
    method = 'GET',
    data = null,
    dataType = 'json',
    onSuccess = () => { },
    onError = () => { }
  } = {}) {
    this.url = url;
    this.interval = interval;
    this.method = method;
    this.data = data;
    this.dataType = dataType;

    this.onSuccess = onSuccess;
    this.onError = onError;

    this.active = false;
    this.timeoutId = null;
    this.xhr = null;
    this.inFlight = false;
  }

  start(immediate = true) {
    if (this.active) return;
    this.active = true;
    if (immediate) this.tick();
    else this.scheduleNext(this.interval);
  }

  stop() {
    this.active = false;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    if (this.xhr) {
      this.xhr.abort();
      this.xhr = null;
    }
  }

  scheduleNext(ms) {
    if (!this.active) return;
    this.timeoutId = setTimeout(() => this.tick(), ms);
  }

  tick = () => {
    if (!this.active || this.inFlight) return;
    this.inFlight = true;

    this.xhr = $.ajax({
      url: this.url,
      method: this.method,
      data: this.data,
      dataType: this.dataType,
      cache: false
    })
      .done((data) => this.onSuccess(data))
      .fail((xhr, status, err) => this.onError(xhr, status, err))
      .always(() => {
        this.inFlight = false;
        this.xhr = null;
        this.scheduleNext(this.interval);
      });
  }
}

