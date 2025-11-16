"use strict";

//
// Startup the overlay editor. If allsky is not running then wait until it is
// since we need the capturede image for the overlay.
//
class OESTARTUP {
  // Flags and internal settings
  #first = true;                    // True until the first successful overlay load
  #checkTimerInterval = 1000;       // How often to poll overlay status (ms)
  #pauseBeforeStartInterval = 2000; // Delay before launching overlay after first load
  #backgroundImage = null;          // Image DOM element that displays the overlay background
  #backgroundSrc = '';              // Base URL of the background image (returned from backend)

  constructor() {

    // On startup, fetch the name/path of the background image
    $.ajax({
      url: 'includes/overlayutil.php?request=ImageName',
      type: 'GET',
      dataType: 'json',
      cache: false,
      async: true,
      context: this
    })
      .done(function (imageUrl) {

        // Store the returned image path
        this.#backgroundSrc = imageUrl;

        // Dynamically create the background <img> element
        this.#backgroundImage = document.createElement("img");
        this.#backgroundImage.id = "oe-background-image";
        this.#backgroundImage.className = "oe-background-image";
        this.#backgroundImage.alt = "Overlay Image";
        this.#backgroundImage.style.width = "100%";

        // Add a timestamp query parameter to force the browser to reload without caching
        const forcedSrc = this.#backgroundSrc + "?t=" + Date.now();

        // When the image has fully loaded, start the status polling loop
        this.#backgroundImage.onload = () => {
          this.tick();
        };

        // Trigger the browser load by setting src
        this.#backgroundImage.src = forcedSrc;

        // Add the image to the document
        document.body.appendChild(this.#backgroundImage);
      })
      .fail(function (xhr, status, error) {
        // If the initial request fails, log it and retry after a delay
        console.error("Overlay Status AJAX Error:", error);
        setTimeout(() => this.tick(), this.#checkTimerInterval);
      });
  }

  runOverlayManager() {
    // Hide the "not running" warning banner
    $('#oe-overlay-not-running').addClass('hidden');

    // Force reload of the background image (timestamp to avoid caching)
    const forcedSrc = this.#backgroundSrc + "?t=" + Date.now();
    this.#backgroundImage.src = forcedSrc;

    // After the updated image loads, instantiate and build the overlay editor UI
    this.#backgroundImage.onload = function () {
      var overlayEditor = new OVERLAYEDITOR($("#overlay_container"), this);
      overlayEditor.buildUI();
    };
  }

  tick() {
    // Poll backend to check if the overlay process is running
    $.ajax({
      url: 'includes/overlayutil.php?request=Status',
      type: 'GET',
      dataType: 'json',
      cache: false,
      context: this
    })
      .done(function (result) {

        let startOverlay = true;

        // Update UI based on backend status response
        if (result && result.running !== undefined) {
          startOverlay = result.running;
          $('#oe-overlay-not-running-status').html('Status: <em>' + result.status + '</em>');
        }

        // If the overlay process is running, either start immediately on first run,
        // or wait a short delay to allow saveimage.sh to finish writing the image.
        if (startOverlay) {
          if (this.#first) {
            this.runOverlayManager();
          } else {
            setTimeout(() => this.runOverlayManager(), this.#pauseBeforeStartInterval);
          }
        } else {
          // Overlay not running — show warning and try again later
          $('#oe-overlay-not-running').removeClass('hidden');
          setTimeout(() => this.tick(), this.#checkTimerInterval);
        }

        // Mark the first run as complete
        this.#first = false;
      })
      .fail(function (xhr, status, error) {
        // Network failure or server error — retry safely
        console.error("Overlay Status AJAX Error:", error);
        setTimeout(() => this.tick(), this.#checkTimerInterval);
      });
  }
}

// Start the whole system once the DOM is ready
$(document).ready(function () {
  let oeStartup = new OESTARTUP();
});