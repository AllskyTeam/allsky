(function ($) {
	"use strict";

	var PLUGIN = "devicemanager";

	var PROXY_URL = "/includes/moduleutil.php";
	var PROXY_REQUEST = "ProxyLocalApi";

	/* ============================================================
	   DEFAULT CONFIG (I2C FIRST)
	============================================================ */
	var DEFAULT_CONFIG = {
		"i2c": {
			enabled: true,
			update_interval: 0,
			tabname: "I2C",
			endpoint: "/i2c/devices/html"
		},
		"onewire": {
			enabled: true,
			update_interval: 0,
			tabname: "1-Wire",
			endpoint: "/onewire/devices/html"
		},
		"serial": {
			enabled: true,
			update_interval: 0,
			tabname: "Serial",
			endpoint: "/serial/sample/html"
		},
		"gpio": {
			enabled: true,
			update_interval: 0,
			tabname: "GPIO Status",
			endpoint: "/gpio/status/html"
		}
	};

	var defaults = {
		title: "Device Manager",
		modalId: null,
		sizeClass: "modal-lg",
		cache: false,
		ajaxTimeout: 15000,
		proxyUrl: PROXY_URL,
		proxyRequest: PROXY_REQUEST,
		config: DEFAULT_CONFIG,
		reloadOnOpen: true,
		reloadAllOnOpen: true
	};

	/* ============================================================
	   Utilities
	============================================================ */

	function uid() {
		return "dm_" + Math.random().toString(36).substr(2, 9);
	}

	function deepClone(obj) {
		return JSON.parse(JSON.stringify(obj || {}));
	}

	function buildProxyUrl(proxyUrl, proxyRequest, endpoint) {
		var query =
			"request=" + encodeURIComponent(proxyRequest) +
			"&endpoint=" + encodeURIComponent(endpoint || "");

		return proxyUrl + (proxyUrl.indexOf("?") >= 0 ? "&" : "?") + query;
	}

	function getActiveTabKey(modalId, $modal) {
		var $a = $modal.find('ul[data-role="dm-tabs"] li.active a[data-toggle="tab"]');
		var href = $a.attr("href") || "";
		var parts = href.split(modalId + "_pane_");
		return parts.length === 2 ? parts[1] : null;
	}

	/* ============================================================
	   Constructor
	============================================================ */

	function DeviceManager(element, options) {

		this.$trigger = $(element);

		var baseDefaults = $.extend(true, {}, defaults, {
			config: deepClone(DEFAULT_CONFIG)
		});

		this.options = $.extend(true, {}, baseDefaults, options || {});
		this.options.config = deepClone(this.options.config);

		this.modalId = this.options.modalId || uid();
		this.$modal = null;
		this.tabs = {};

		this._init();
	}

	DeviceManager.prototype._init = function () {
		this._buildModal();
		this._buildTabs();
		this._bindModalEvents();
		this._bindFooterButtons();
	};

	/* ============================================================
	   Build Modal
	============================================================ */

	DeviceManager.prototype._buildModal = function () {

		var existing = $("#" + this.modalId);
		if (existing.length) {
			this.$modal = existing;
			return;
		}

		var html =
			'<div class="modal fade" id="' + this.modalId + '" tabindex="-1">' +
				'<div class="modal-dialog ' + this.options.sizeClass + '">' +
					'<div class="modal-content">' +
						'<div class="modal-header">' +
							'<button type="button" class="close" data-dismiss="modal">&times;</button>' +
							'<h4 class="modal-title">' + this.options.title + '</h4>' +
						'</div>' +
						'<div class="modal-body">' +
							'<ul class="nav nav-tabs" data-role="dm-tabs"></ul>' +
							'<div class="tab-content" style="padding-top:15px;" data-role="dm-panes"></div>' +
						'</div>' +
						'<div class="modal-footer">' +
							'<div class="pull-left">' +
								'<button type="button" class="btn btn-default" data-role="dm-refresh">Refresh</button>' +
							'</div>' +
							'<div class="pull-right">' +
								'<button type="button" class="btn btn-primary" data-dismiss="modal">Close</button>' +
							'</div>' +
							'<div class="clearfix"></div>' +
						'</div>' +
					'</div>' +
				'</div>' +
			'</div>';

		this.$modal = $(html).appendTo("body");
	};

	/* ============================================================
	   Build Tabs
	============================================================ */

	DeviceManager.prototype._buildTabs = function () {

		var self = this;
		var $tabs = this.$modal.find('[data-role="dm-tabs"]');
		var $panes = this.$modal.find('[data-role="dm-panes"]');

		$tabs.empty();
		$panes.empty();
		this.tabs = {};

		var enabledKeys = [];

		$.each(this.options.config, function (key, entry) {
			if (entry.enabled) enabledKeys.push(key);
		});

		if (!enabledKeys.length) return;

		$.each(enabledKeys, function (i, key) {

			var entry = self.options.config[key];
			var paneId = self.modalId + "_pane_" + key;
			var active = i === 0;

			$tabs.append(
				'<li class="' + (active ? 'active' : '') + '">' +
					'<a data-toggle="tab" href="#' + paneId + '">' +
						entry.tabname +
					'</a>' +
				'</li>'
			);

			var $pane = $('<div class="tab-pane dm-tab-' + key + ' ' + (active ? 'active' : '') + '" id="' + paneId + '"></div>');

			$panes.append($pane);

			self.tabs[key] = {
				entry: entry,
				$pane: $pane,
				timer: null,
				loaded: false
			};
		});

		self._loadTab(enabledKeys[0]);
	};

	/* ============================================================
	   Load Tab (LoadingOverlay version)
	============================================================ */

	DeviceManager.prototype._loadTab = function (key) {

		var tab = this.tabs[key];
		if (!tab) return;

		var self = this;

		var url = buildProxyUrl(
			this.options.proxyUrl,
			this.options.proxyRequest,
			tab.entry.endpoint
		);

		this.$modal.find(".modal-body").LoadingOverlay("show", {
			text: "Loading"
		});

		$.ajax({
			url: url,
			method: "GET",
			dataType: "html",
			cache: this.options.cache,
			timeout: this.options.ajaxTimeout
		})
		.done(function (html) {
			tab.$pane.html(html);
			tab.loaded = true;
		})
		.fail(function () {
			tab.$pane.html('<div class="alert alert-danger">Failed to load. Please ensure the Allsky Server is running</div>');
		})
		.always(function () {
			self.$modal.find(".modal-body").LoadingOverlay("hide");
		});
	};

	/* ============================================================
	   Refresh Active Tab
	============================================================ */

	DeviceManager.prototype._refreshActiveTab = function () {
		var key = getActiveTabKey(this.modalId, this.$modal);
		if (key) {
			this.tabs[key].loaded = false;
			this._loadTab(key);
		}
	};

	DeviceManager.prototype._bindFooterButtons = function () {
		var self = this;
		this.$modal.on("click", "[data-role='dm-refresh']", function () {
			self._refreshActiveTab();
		});
	};

	/* ============================================================
	   Modal Events
	============================================================ */

	DeviceManager.prototype._bindModalEvents = function () {
		var self = this;

		this.$modal.on("shown.bs.modal", function () {
			if (self.options.reloadOnOpen) {
				$.each(self.tabs, function (key) {
					self.tabs[key].loaded = false;
				});
				if (self.options.reloadAllOnOpen) {
					$.each(self.tabs, function (key) {
						self._loadTab(key);
					});
				}
			}
		});
	};

	/* ============================================================
	   Public Methods
	============================================================ */

	DeviceManager.prototype.open = function () {
		this.$modal.modal("show");
	};

	DeviceManager.prototype.reload = function () {
		var self = this;
		$.each(this.tabs, function (key) {
			self._loadTab(key);
		});
	};

	/* ============================================================
	   Auto Init Wrapper
	============================================================ */

	$.fn[PLUGIN] = function (arg) {

		var args = Array.prototype.slice.call(arguments, 1);

		return this.each(function () {

			var $this = $(this);
			var instance = $this.data(PLUGIN);

			if (!instance) {
				instance = new DeviceManager(this, typeof arg === "object" ? arg : {});
				$this.data(PLUGIN, instance);
			}

			if (typeof arg === "string") {
				instance[arg].apply(instance, args);
			}
		});
	};

})(jQuery);