/**
 * Controller for the WebUI Live View page.
 *
 * The PHP page renders the initial image, refresh delay, and configured preview
 * mode as data attributes on #liveview-root.  This class then handles the parts
 * that should remain local to the browser:
 *
 * - refresh the current image without reloading the whole page
 * - switch between preview modes without writing to settings.json
 * - show the current image with the browser Fullscreen API
 * - keep "Fit Image" mode within the visible browser viewport
 * - attach lightGallery to the current image and mini-timelapse link
 */
class AllskyLiveView {
	/**
	 * Cache the page elements and initial state used by the live view.
	 *
	 * @param {HTMLElement} rootElement The #liveview-root panel element.
	 */
	constructor(rootElement) {
		this.rootElement = $(rootElement);
		this.liveContainerElement = $('#live_container');
		this.currentLightboxElement = $('#current_lightbox');
		this.miniTimelapseLinkElement = $('#mini_timelapse_lightbox');
		this.modeSwitcherElement = $('.liveview-mode-switcher');
		this.modeLabelElement = $('#liveview-mode-label');
		this.fullscreenButtonElement = $('#liveview-fullscreen-button');
		this.imageName = this.rootElement.data('image-name') || '';
		this.refreshDelay = parseInt(this.rootElement.data('refresh-delay') || '0', 10);
		this.liveViewMode = this.rootElement.data('live-view-mode') || 'fullwidth';
		this.currentImageGallery = null;
		this.miniTimelapseGallery = null;
	}

	/**
	 * Start all Live View behaviours.
	 *
	 * The initial image is already in the DOM when this runs.  We still listen
	 * for its load event because a cached or slow image may not have dimensions
	 * available immediately, and Fit Image mode needs those dimensions.
	 */
	start() {
		this.updateScaledContainerHeight();
		this.currentLightboxElement.find('img').on('load', () => {
			this.updateScaledContainerHeight();
		});
		$(window).on('resize', () => {
			this.updateScaledContainerHeight();
		});
		this.bindModeSwitcher();
		this.bindFullscreenButton();
		this.initialiseLightGallery();
		this.startImageLoop();
	}

	/**
	 * Start the image refresh loop if the page has enough information to do so.
	 *
	 * Invalid or missing values are treated as a disabled refresh rather than an
	 * error, so a partially rendered page still shows the initial image.
	 */
	startImageLoop() {
		if (!this.liveContainerElement.length || !this.imageName || !Number.isFinite(this.refreshDelay) || this.refreshDelay <= 0) {
			return;
		}

		this.loadNextImage();
	}

	/**
	 * Load the next version of the current image.
	 *
	 * A timestamp query parameter bypasses browser caching.  The image is decoded
	 * before it replaces the current DOM image so the user does not see a broken
	 * or half-loaded frame during refresh.
	 */
	loadNextImage() {
		const nextImage = new Image();
		nextImage.src = `${this.imageName}?_ts=${Date.now()}`;
		nextImage.id = 'current';
		nextImage.className = 'current';

		nextImage.decode().then(() => {
			this.replaceLiveImage(nextImage);
		}).catch((error) => {
			if (!nextImage.complete || typeof nextImage.naturalWidth === 'undefined' || nextImage.naturalWidth === 0) {
				console.log('broken image:', error);
			}
		}).finally(() => {
			window.setTimeout(() => {
				this.loadNextImage();
			}, this.refreshDelay);
		});
	}

	/**
	 * Replace the displayed Live View image and update dependent UI state.
	 *
	 * @param {HTMLImageElement} nextImage The decoded replacement image.
	 */
	replaceLiveImage(nextImage) {
		if (!this.liveContainerElement.length) {
			return;
		}

		this.currentLightboxElement
			.attr('href', nextImage.src)
			.empty()
			.append(nextImage);

		this.updateScaledContainerHeight();

		if (this.currentImageGallery) {
			this.currentImageGallery.refresh();
		}
	}

	/**
	 * Size the Live View image container for Fit Image mode.
	 *
	 * Full width mode lets the image determine the page height naturally, so this
	 * method only acts when the current mode is "scaled".  In that mode the
	 * container height is the smaller of:
	 *
	 * - the image's rendered height at the current container width
	 * - the remaining visible viewport height below the top of the image area
	 *
	 * This keeps the panel from showing large empty areas when the image is short
	 * enough to fit, while also avoiding a vertical scrollbar when the browser is
	 * too short to show the full image.
	 */
	updateScaledContainerHeight() {
		if (this.liveViewMode !== 'scaled' || !this.liveContainerElement.length) {
			return;
		}

		const containerTop = this.liveContainerElement.get(0).getBoundingClientRect().top;
		const windowHeight = $(window).height();
		const panelBodyElement = this.liveContainerElement.closest('.panel-body');
		const panelElement = this.rootElement;
		const panelBodyBottomPadding = parseFloat(panelBodyElement.css('padding-bottom')) || 0;
		const panelBottomMargin = parseFloat(panelElement.css('margin-bottom')) || 0;
		const bottomSpacing = panelBodyBottomPadding + panelBottomMargin + 2;
		const availableHeight = Math.max(1, windowHeight - containerTop - bottomSpacing);
		const currentImage = this.currentLightboxElement.find('img').get(0);
		let containerHeight = availableHeight;

		if (currentImage && currentImage.naturalWidth > 0 && currentImage.naturalHeight > 0) {
			const containerWidth = this.liveContainerElement.width();
			const renderedWidth = Math.min(currentImage.naturalWidth, containerWidth);
			const renderedHeight = renderedWidth * (currentImage.naturalHeight / currentImage.naturalWidth);
			containerHeight = Math.min(availableHeight, Math.max(1, renderedHeight));
		}

		this.liveContainerElement.css('height', `${containerHeight}px`);
	}

	/**
	 * Wire the panel header mode dropdown.
	 *
	 * This is intentionally a browser-only mode switch.  It changes the current
	 * page preview without posting back to the server or updating settings.json.
	 */
	bindModeSwitcher() {
		this.modeSwitcherElement.on('click', '[data-liveview-mode-option]', (event) => {
			event.preventDefault();
			this.setLiveViewMode($(event.currentTarget).data('liveview-mode-option'));
		});
	}

	/**
	 * Apply a preview mode selected from the panel header dropdown.
	 *
	 * @param {string} mode Either "fullwidth" or "scaled".
	 */
	setLiveViewMode(mode) {
		if (mode !== 'fullwidth' && mode !== 'scaled') {
			return;
		}

		this.liveViewMode = mode;
		this.rootElement
			.removeClass('liveview-mode-fullwidth liveview-mode-scaled')
			.addClass(`liveview-mode-${mode}`)
			.data('live-view-mode', mode);

		if (mode === 'scaled') {
			this.updateScaledContainerHeight();
		} else {
			this.liveContainerElement.css('height', '');
		}

		this.modeLabelElement.text(mode === 'scaled' ? 'Fit Image' : 'Full width');
		this.modeSwitcherElement.find('li').removeClass('active');
		this.modeSwitcherElement.find(`[data-liveview-mode-option="${mode}"]`).parent().addClass('active');
	}

	/**
	 * Wire the standalone fullscreen button.
	 *
	 * This uses the browser Fullscreen API on the Live View image container.  It
	 * deliberately does not open lightGallery, so the user gets a true browser
	 * fullscreen image instead of the in-page gallery viewer.
	 */
	bindFullscreenButton() {
		if (!this.isFullscreenSupported()) {
			this.fullscreenButtonElement.hide();
			return;
		}

		this.fullscreenButtonElement.on('click', (event) => {
			event.preventDefault();
			this.showImageFullscreen();
		});
	}

	/**
	 * Return whether this browser supports fullscreen on the Live View container.
	 *
	 * @returns {boolean}
	 */
	isFullscreenSupported() {
		const liveContainer = this.liveContainerElement.get(0);

		return !!(
			liveContainer &&
			(liveContainer.requestFullscreen ||
				liveContainer.webkitRequestFullscreen ||
				liveContainer.mozRequestFullScreen ||
				liveContainer.msRequestFullscreen)
		);
	}

	/**
	 * Ask the browser to show the current image container fullscreen.
	 */
	showImageFullscreen() {
		const liveContainer = this.liveContainerElement.get(0);
		if (!liveContainer) {
			return;
		}

		if (liveContainer.requestFullscreen) {
			liveContainer.requestFullscreen();
		} else if (liveContainer.webkitRequestFullscreen) {
			liveContainer.webkitRequestFullscreen();
		} else if (liveContainer.mozRequestFullScreen) {
			liveContainer.mozRequestFullScreen();
		} else if (liveContainer.msRequestFullscreen) {
			liveContainer.msRequestFullscreen();
		}
	}

	/**
	 * Attach lightGallery to the Live View image and the mini-timelapse link.
	 *
	 * lightGallery is loaded by liveview.php.  The guard keeps this file harmless
	 * if the plugin fails to load or the page is rendered without those assets.
	 */
	initialiseLightGallery() {
		if (typeof lightGallery !== 'function') {
			return;
		}

		const commonOptions = {
			cssEasing: 'cubic-bezier(0.680, -0.550, 0.265, 1.550)',
			plugins: [lgZoom, lgThumbnail],
			mode: 'lg-slide-circular',
			speed: 400,
			download: false,
			thumbnail: true,
			iframeMaxWidth: '90%',
			iframeMaxHeight: '90%'
		};

		if (this.liveContainerElement.length) {
			this.currentImageGallery = lightGallery(this.liveContainerElement.get(0), $.extend({}, commonOptions, {
				selector: 'a.liveview-lightgallery-item'
			}));
		}

		if (this.miniTimelapseLinkElement.length) {
			this.miniTimelapseGallery = lightGallery(this.miniTimelapseLinkElement.get(0), $.extend({}, commonOptions, {
				selector: 'this'
			}));
		}
	}

	/**
	 * Locate the Live View root element and start the controller.
	 *
	 * The file can be loaded safely on other pages; if #liveview-root is absent,
	 * nothing runs.
	 */
	static run() {
		const rootElement = $('#liveview-root');
		if (!rootElement.length) {
			return;
		}

		const liveView = new AllskyLiveView(rootElement.get(0));
		liveView.start();
	}
}

// Bootstrap the Live View controller once the DOM is ready.
$(function () {
	AllskyLiveView.run();
});
