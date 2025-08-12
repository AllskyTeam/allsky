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
		$(document).on('click', '.alert-text.truncated', function() {
			$(this).removeClass('truncated').addClass('expanded');
		});
	}

	#setupCloseSystemMessages() {
		$('#system-messages #closePanel').on('click', function() {
			$(this).closest('.panel').remove();
		});
	}

	#setupMenu() {

		$(function () {
			$('[data-toggle="popover"]').popover({
				delay: { show: 500, hide: 100 }
			});
		});

		var $sidebar = $('#sidebar');
		var $activeFlyout = null;
		var flyoutOwner = null; // the <li.dropdown> that owns current flyout

		// Popovers with delay
		$(function () {
			$('[data-toggle="popover"]').popover({
				delay: { show: 300, hide: 100 },
				container: 'body'
			});
		});

		// Collapse toggle
		$('#toggleNav').on('click', function () { $sidebar.toggleClass('collapsed'); });
		function autoCollapse() { (window.innerWidth < 768) ? $sidebar.addClass('collapsed') : $sidebar.removeClass('collapsed'); }
		$(window).on('resize', autoCollapse); $(document).ready(autoCollapse);

		// Utility: position a menu next to its owner, flipping if near right edge
		function positionFlyout($ownerLi, $menu) {
			var sidebarRect = $sidebar[0].getBoundingClientRect();
			var ownerRect = $ownerLi[0].getBoundingClientRect();

			var left = sidebarRect.left + $sidebar.outerWidth(); // default: to the right of sidebar
			var top = ownerRect.top;

			// If the submenu would overflow right edge, flip to open left
			var menuWidth = $menu.outerWidth() || 220;
			var willOverflowRight = (left + menuWidth) > window.innerWidth;
			if (willOverflowRight) {
				left = Math.max(0, sidebarRect.left - menuWidth); // open to the left of sidebar
			}

			// Constrain vertically if needed
			var maxTop = window.innerHeight - $menu.outerHeight();
			if (top > maxTop) top = Math.max(0, maxTop);

			$menu.css({ left: Math.round(left) + 'px', top: Math.round(top) + 'px' });
		}

		// Show flyout: move submenu to body and position it
		function showFlyout($li) {
			hideFlyout(); // close any existing
			var $menu = $li.children('.dropdown-menu');
			if (!$menu.length) return;

			flyoutOwner = $li;

			// Clone to keep original structure intact OR detach to reuse.
			// We'll detach + append for accurate widths.
			$activeFlyout = $menu.detach().appendTo('body').addClass('floating-flyout');

			positionFlyout($li, $activeFlyout);

			// Keep it open while hovering either the owner or the floating menu
			var hideTimer = null;
			function scheduleHide() { hideTimer = setTimeout(hideFlyout, 120); }
			function cancelHide() { if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; } }

			$li.on('mouseleave.fly', scheduleHide).on('mouseenter.fly', cancelHide);
			$activeFlyout.on('mouseleave.fly', scheduleHide).on('mouseenter.fly', cancelHide);
		}

		// Hide flyout: move submenu back under its owner
		function hideFlyout() {
			if ($activeFlyout && flyoutOwner) {
				$activeFlyout.removeClass('floating-flyout').appendTo(flyoutOwner).hide();
				flyoutOwner.off('.fly');
			}
			$activeFlyout = null;
			flyoutOwner = null;
		}

		// Desktop: open on hover
		$sidebar.on('mouseenter', '.sidebar-dropdown', function () {
			if (window.matchMedia('(min-width: 768px)').matches) showFlyout($(this));
		});

		// Touch / click support
		$(document).on('click', '.submenu-toggle', function (e) {
			e.preventDefault(); e.stopPropagation();
			var $li = $(this).closest('.sidebar-dropdown');
			if (flyoutOwner && flyoutOwner[0] === $li[0]) { hideFlyout(); return; }
			showFlyout($li);
		});

		// Close when clicking anywhere else or on resize
		$(document).on('click', function () { hideFlyout(); });
		$(window).on('resize scroll', function () { if ($activeFlyout && flyoutOwner) positionFlyout(flyoutOwner, $activeFlyout); });

		// Prevent clicks inside flyout from closing immediately
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
