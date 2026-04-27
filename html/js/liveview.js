class AllskyLiveView {
	constructor(rootElement) {
		this.$rootElement = $(rootElement);
		this.$liveContainerElement = $('#live_container');
		this.$miniTimelapseLinkElement = $('#mini_timelapse_lightbox');
		this.imageName = this.$rootElement.data('image-name') || '';
		this.refreshDelay = parseInt(this.$rootElement.data('refresh-delay') || '0', 10);
		this.miniPlayerUrl = this.$rootElement.data('mini-player-url') || '';
		this.updateImageMaxHeight = this.updateImageMaxHeight.bind(this);
	}

	start() {
		this.updateImageMaxHeight();
		$(window).on('resize', this.updateImageMaxHeight);
		this.$liveContainerElement.find('img.current').on('load', this.updateImageMaxHeight);
		this.startImageLoop();
		this.initialiseMiniTimelapseLightbox();
	}

	startImageLoop() {
		if (!this.$liveContainerElement.length || !this.imageName || !Number.isFinite(this.refreshDelay) || this.refreshDelay <= 0) {
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
		if (!this.$liveContainerElement.length) {
			return;
		}

		this.$liveContainerElement.empty().append(nextImage);
		this.updateImageMaxHeight();
	}

	updateImageMaxHeight() {
		if (!this.$rootElement.length || !this.$liveContainerElement.length) {
			return;
		}

		const liveContainerElement = this.$liveContainerElement.get(0);
		const currentImageElement = this.$liveContainerElement.find('img.current').get(0);
		const panelBodyElement = this.$rootElement.find('> .panel-body').get(0);
		const liveContainerTop = liveContainerElement.getBoundingClientRect().top;
		const panelBodyStyles = panelBodyElement ? window.getComputedStyle(panelBodyElement) : null;
		const rootStyles = window.getComputedStyle(this.$rootElement.get(0));
		const bottomSpace = (
			(panelBodyStyles ? parseFloat(panelBodyStyles.paddingBottom) : 0) +
			parseFloat(rootStyles.borderBottomWidth || 0) +
			1
		);
		const maxHeight = Math.max(0, Math.floor(window.innerHeight - liveContainerTop - bottomSpace));

		this.$rootElement.get(0).style.setProperty('--liveview-image-max-height', `${maxHeight}px`);

		if (!currentImageElement || !currentImageElement.naturalWidth || !currentImageElement.naturalHeight) {
			return;
		}

		const maxWidth = liveContainerElement.clientWidth;
		const scale = Math.min(
			maxWidth / currentImageElement.naturalWidth,
			maxHeight / currentImageElement.naturalHeight,
			1
		);
		const imageWidth = Math.floor(currentImageElement.naturalWidth * scale);
		const imageHeight = Math.floor(currentImageElement.naturalHeight * scale);

		$(currentImageElement).css({
			width: `${imageWidth}px`,
			height: `${imageHeight}px`
		});
	}

	initialiseMiniTimelapseLightbox() {
		if (!this.$miniTimelapseLinkElement.length || !this.miniPlayerUrl || typeof lightGallery !== 'function') {
			return;
		}

		this.$miniTimelapseLinkElement.on('click', (event) => {
			event.preventDefault();

			const gallery = lightGallery(this.$miniTimelapseLinkElement.get(0), {
				dynamic: true,
				dynamicEl: [{
					src: this.miniPlayerUrl,
					iframe: true,
					thumb: '',
					subHtml: 'Mini-Timelapse'
				}],
				plugins: [lgZoom, lgThumbnail],
				download: false,
				iframeMaxWidth: '90%',
				iframeMaxHeight: '90%',
				speed: 400
			});

			gallery.openGallery(0);
			this.$miniTimelapseLinkElement.one('lgAfterClose', function handleAfterClose() {
				gallery.destroy();
			});
		});
	}

	static run() {
		const $rootElement = $('#liveview-root');
		if (!$rootElement.length) {
			return;
		}

		const liveView = new AllskyLiveView($rootElement.get(0));
		liveView.start();
	}
}

$(function () {
	AllskyLiveView.run();
});
