"use strict";

// Timer intervals.  Make global to allow changing.
let allskystatus_interval = 20 * 1000;		// it's decreased when starting / stopping Allsky
let uptime_interval = 60 * 1000;			// Display only goes to minutes.
let throttle_interval = 30 * 1000;
let memory_interval = 10 * 1000;
let cpuloadtemp_interval = 5 * 1000;
let diskusage_interval = 30 * 1000;

class ALLSKY {
	#timers = {};
	#allskyPage = '';
	#pageTimers = {
		all: {			// Timers that apply to ALL pages
			timers: {
				allskystatus: {
					url: 'includes/uiutil.php?request=AllskyStatus',
					interval: allskystatus_interval,
					updateelement: '#allskyStatus',
					wait: false
				}
			}
		},
		system: {			// Timers for the WebUI "System" page
			timers: {
				uptime: {
					url: 'includes/uiutil.php?request=Uptime',
					interval: uptime_interval,
					updateelement: '#as-uptime',
					wait: true
				},
				throttle: {
					url: 'includes/uiutil.php?request=ThrottleStatus',
					interval: throttle_interval,
					updateelement: '#as-throttley',
					wait: true
				},
				memory: {
					url: 'includes/uiutil.php?request=MemoryUsed',
					interval: memory_interval,
					updateelement: '#as-memory',
					wait: true
				},
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
						}
					],
					wait: false
				}
				/*
								diskUsage: {
									url: 'includes/uiutil.php?request=Multiple',
									interval: diskusage_interval,
									updateelement: [
										{
											data: 'diskUsage',
											element: '#as-diskUsage',
										},
										{
											data: 'tmpUsage',
											element: '#as-tmpUsage',
										}
									],
									wait: true
				*/
			}
		}
	};

	constructor(page) {
		this.#setupajaxIntercept();
		this.#allskyPage = page;
	}

	#setupajaxIntercept() {

		$.ajaxSetup({
			beforeSend: function (xhr, settings) {
				if (window.csrfToken) {
					xhr.setRequestHeader('X-CSRF-Token', window.csrfToken);
				}
			}
		});

		$(document).ajaxComplete(function(event, xhr, settings) {
				try {
						var response = xhr.responseJSON || JSON.parse(xhr.responseText);
						if (response && response.redirect) {
								window.location.href = response.redirect;
						}
				} catch (e) {
				}
		});

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
		if (!x) {
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
		this.#addTimestamp('charts');
		this.#addTimestamp('LAN_info');
		this.#addTimestamp('WLAN_info');
		this.#addTimestamp('wifi');
		this.#addTimestamp('system');
		this.#addTimestamp('auth_conf');
		this.#addTimestamp('support');
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
			contentType: 'application/json',
			cache: false,
			crossDomain: true,
			xhrFields: { withCredentials: false },
			headers: { "X-Requested-With": "XMLHttpRequest" },
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
				console.log('Error loading ' + timerId + ' data')
			}
		});
	}

	#stopAllTimers() {
		for (const name in this.#timers) {
			clearInterval(this.#timers[name]);
		}
	}

	#detectDeviceType() {
		const uaIsMobile = /Mobi|Android|iPhone|iPad|Windows Phone/i.test(navigator.userAgent);
		const wideScreen = window.matchMedia("(min-width: 992px)").matches;

		if (!uaIsMobile && wideScreen) {
			return "desktop";
		}
		if (uaIsMobile && wideScreen) {
			return "tablet";
		}

		return "mobile";
	}

	#setupTruncatedText() {
		$(document).on('click', '.alert-text.truncated', function () {
			$(this).removeClass('truncated').addClass('expanded');
		});
	}

	#setupCloseSystemMessages() {
		$('#system-messages #closePanel').on('click', function () {
			$(this).closest('.panel').remove();
		});
	}

	#setupMenu() {

		// --- Popovers (single init) ---
		$(function () {
			$('[data-toggle="popover"]').popover({
				delay: { show: 300, hide: 100 },
				container: 'body'
			});
		});

		var $sidebar = $('#sidebar');
		var $activeFlyout = null;
		var flyoutOwner = null; // the <li.sidebar-dropdown> that owns current flyout

		// Collapse toggle
		$('#toggleNav').on('click', function () { $sidebar.toggleClass('collapsed'); });
		function autoCollapse() { (window.innerWidth < 768) ? $sidebar.addClass('collapsed') : $sidebar.removeClass('collapsed'); }
		$(window).on('resize', autoCollapse); $(document).ready(autoCollapse);

		// ===== timings =====
		var OPEN_DELAY = 160;   // hover before opening
		var HIDE_DELAY = 140;   // grace before hiding
		var COOLDOWN = 200;   // ignore neighbor hovers for this long

		var openTimer = null;
		var hideTimer = null;
		var hoverCooldownUntil = 0;
		var $pendingLi = null;

		function clearOpenTimer() { if (openTimer) { clearTimeout(openTimer); openTimer = null; } }
		function clearHideTimer() { if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; } }
		function now() { return Date.now(); }

		// position next to owner, flip if needed
		function positionFlyout($ownerLi, $menu) {
			var sidebarRect = $sidebar[0].getBoundingClientRect();
			var ownerRect = $ownerLi[0].getBoundingClientRect();

			var left = sidebarRect.left + $sidebar.outerWidth(); // default right
			var top = ownerRect.top;

			var menuWidth = $menu.outerWidth() || 220;
			if ((left + menuWidth) > window.innerWidth) {
				left = Math.max(0, sidebarRect.left - menuWidth);  // open left
			}

			var maxTop = window.innerHeight - $menu.outerHeight();
			if (top > maxTop) top = Math.max(0, maxTop);

			$menu.css({ left: Math.round(left) + 'px', top: Math.round(top) + 'px' });
		}

		// move submenu to body and position it
		function showFlyout($li) {
			if (flyoutOwner && flyoutOwner[0] === $li[0]) return; // already open for this
			hideFlyout(); // close any existing (does NOT clear open timer)
			var $menu = $li.children('.dropdown-menu');
			if (!$menu.length) return;

			flyoutOwner = $li;
			$activeFlyout = $menu.detach().appendTo('body').addClass('floating-flyout');
			positionFlyout($li, $activeFlyout);
		}

		// move submenu back under its owner
		function hideFlyout() {
			clearHideTimer();
			// DO NOT clearOpenTimer() here - we might be opening the neighbor
			if ($activeFlyout && flyoutOwner) {
				$activeFlyout.removeClass('floating-flyout').appendTo(flyoutOwner).hide();
			}
			$activeFlyout = null;
			flyoutOwner = null;
		}

		// schedule an open, honoring cooldown
		function scheduleOpen($li, extraDelay) {
			clearOpenTimer();
			$pendingLi = $li;
			var delay = Math.max(OPEN_DELAY, (hoverCooldownUntil - now()), extraDelay || 0, 0);
			openTimer = setTimeout(function () {
				if (!$pendingLi) return;
				if ($pendingLi.is(':hover')) showFlyout($pendingLi);
				$pendingLi = null;
			}, delay);
		}

		// schedule hide with grace
		function scheduleHide() {
			clearHideTimer();
			hideTimer = setTimeout(function () { hideFlyout(); }, HIDE_DELAY);
		}

		// ===== Desktop hover with debounce/cooldown =====
		$sidebar.on('mouseenter', '.sidebar-dropdown', function () {
			if (!window.matchMedia('(min-width: 768px)').matches) return;
			clearHideTimer(); // we're aiming at another item

			// even during cooldown, we schedule an open AFTER cooldown expires
			scheduleOpen($(this));
		});

		$sidebar.on('mouseleave', '.sidebar-dropdown', function () {
			hoverCooldownUntil = now() + COOLDOWN;        // start cooldown
			if ($pendingLi && $pendingLi[0] === this) {   // cancel pending open of the one we just left
				clearOpenTimer();
				$pendingLi = null;
			}
			if (flyoutOwner && flyoutOwner[0] === this) { // hide if this owned the flyout
				scheduleHide();
			}
		});

		// keep flyout open while hovered; hide after grace when leaving
		$(document).on('mouseenter', '.floating-flyout', function () { clearHideTimer(); });
		$(document).on('mouseleave', '.floating-flyout', function () { scheduleHide(); });

		// Touch / click support (immediate)
		$(document).on('click', '.submenu-toggle', function (e) {
			e.preventDefault(); e.stopPropagation();
			hoverCooldownUntil = 0;
			clearOpenTimer(); clearHideTimer();
			var $li = $(this).closest('.sidebar-dropdown');
			if (flyoutOwner && flyoutOwner[0] === $li[0]) { hideFlyout(); return; }
			showFlyout($li);
		});

		// close elsewhere; reposition on resize/scroll
		$(document).on('click', function () { hideFlyout(); });
		$(window).on('resize scroll', function () {
			if ($activeFlyout && flyoutOwner) positionFlyout(flyoutOwner, $activeFlyout);
		});

		// clicks inside flyout shouldn't bubble
		$(document).on('click', '.floating-flyout', function (e) { e.stopPropagation(); });
	}

	init() {
		this.#setupTheme();
		this.#setupBigScreen();
		this.#setupTimestamps();
		// initialize timers that apply to all pages
		this.#initTimers('all');
		// initialize timers that apply to this page only
		this.#initTimers(this.#allskyPage);

		this.#setupMenu();
		this.#setupCloseSystemMessages();
		this.#setupTruncatedText();
		includeHTML();
	}

}

$(document).ready(function () {
	const allsky = new ALLSKY(allskyPage);
	allsky.init();
});
