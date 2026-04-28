class AllskyLiveView {
	constructor(rootElement) {
		this.rootElement = $(rootElement);
		this.liveContainerElement = $('#live_container');
		this.currentLightboxElement = $('#current_lightbox');
		this.miniTimelapseLinkElement = $('#mini_timelapse_lightbox');
		this.imageName = this.rootElement.data('image-name') || '';
		this.refreshDelay = parseInt(this.rootElement.data('refresh-delay') || '0', 10);
		this.currentImageGallery = null;
		this.miniTimelapseGallery = null;
	}

	start() {
		this.initialiseLightGallery();
		this.startImageLoop();
	}

	startImageLoop() {
		if (!this.liveContainerElement.length || !this.imageName || !Number.isFinite(this.refreshDelay) || this.refreshDelay <= 0) {
			return;
		}

		this.loadNextImage();
	}

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

	replaceLiveImage(nextImage) {
		if (!this.liveContainerElement.length) {
			return;
		}

		this.currentLightboxElement
			.attr('href', nextImage.src)
			.empty()
			.append(nextImage);

		if (this.currentImageGallery) {
			this.currentImageGallery.refresh();
		}
	}

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

	static run() {
		const rootElement = $('#liveview-root');
		if (!rootElement.length) {
			return;
		}

		const liveView = new AllskyLiveView(rootElement.get(0));
		liveView.start();
	}
}

$(function () {
	AllskyLiveView.run();
});
