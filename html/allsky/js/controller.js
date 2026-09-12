var app = angular.module('allsky', ['ngLodash']);

var overlayBuilt = false;				// has the overlay been built yet?

var virtualSkyData = null;
var sunData = "data.json";				// contains sunrise/sunset times and related data
var configData = "configuration.json";	// contains web configuration data
var dateTimeF = "YYYY-MM-DD HH:mm:ss";
var dateF = "YYYY-MM-DD";
var timeF = "HH:mm";
var userTimeF = "h:mm a";				// Time the user sees.
var spanOn  = "<span style='color: white'>";
var spanOff = "</span>";

// This returns the height INCLUDING the border:      $("#imageContainer").css('height')
// This returns the height NOT including the border:  $("#imageContainer").height()

// These two are used by virtualsky.js to set the overlay width and height,
// if there was a difference.
var overlayWidth = 0, overlayHeight = 0;
var overlayWidthMax = 0, overlayHeightMax = 0;
var starmapWidth = 0, starmapHeight = 0;
var wasDiff = true;
var last_s_iW = 0, last_s_iH = 0;
var icWidth = 0;
var icHeight = 0;
var icImageAspectRatio = 0;
var overlayAspectRatio = 0;
var myLatitude = 0, myLongitude = 0;
var imageBorder = 0;

$(window).resize(function () {
	if (overlayBuilt) {					// only rebuild if already built once
		var newW = Math.round($("#imageContainer").width(), 0);
		var newH = Math.round($("#imageContainer").height(), 0);

		$("#starmap_container").css("width", newW + "px").css("height", newH + "px");

		var diffW = newW - icWidth;
		// Scale the height based on the aspect ratio of the image.
		var diffH = (newH - icHeight);
		icWidth = newW;
		icHeight = newH;

		if (diffW == 0 && diffH == 0) {
			wasDiff = false;
			console.log(">>> No change in image size.");
			return;
		}

		wasDiff = true;

		// Refresh the page if there was a difference.
		// TODO: reloading the page causes it to flash,
		// and if the overlay is showing, it becomes hidden,
		// so don't reload it.
		if (0 && wasDiff) {
			location.reload();
		}

		// This holds the starmap button, so needs to resize
		starmapWidth += diffW;
		starmapHeight += diffH;
		$("#starmap").css("width", starmapWidth + "px").css("height", starmapHeight + "px");

		overlayWidth  += diffW;
			if (overlayWidth > overlayWidthMax) overlayWidth = overlayWidthMax;
		overlayHeight += diffH;
			if (overlayHeight > overlayHeightMax) overlayHeight = overlayHeightMax;
		$("#starmap_inner")
			.css("width", overlayWidth + "px")
			.css("height", overlayHeight + "px");
	}
});

function buildOverlay(){
	if (overlayBuilt) {
		S.virtualsky(virtualSkyData);
	} else {
		$.ajax({
			// No need for ?_ts=   since $.ajax adds one
			url: configData,
			cache: false,
			dataType: 'json',
			error: function(jqXHR, textStatus, errorThrown) {
				// TODO: Display the message on the screen.
				if (jqXHR.status == 404) {
					console.log(configData + " not found!");
				} else {
					console.log("Error reading '" + configData + "': " + errorThrown);
				}
			},
			success: function (data) {
				var c = data.config;
				// "config" was defined in index.php to include ALL the variables we need,
				// including ones not in the "config" section of the configuration file.
				// However, "array" types like "colour" aren't handled in index.php.

				// TODO: I tried not doing the ajax call, but the overlay wouldn't show.
				// It's a shame - there's no reason to re-read the file.

				virtualSkyData = c;
				virtualSkyData.latitude = myLatitude;
				virtualSkyData.longitude = myLongitude;

				// These variables have different names in virtualsky.js and our config file.
				virtualSkyData.width = c.overlayWidth;
				virtualSkyData.height = c.overlayHeight;

				S.virtualsky(virtualSkyData);		// Creates overlay
				overlayBuilt = true;

				// max-width of #imageContainer is set in index.php based on
				// width user specified (imageWidth)
				icWidth = $("#imageContainer").width();
				icHeight = $("#imageContainer").height();
				icImageAspectRatio = icWidth / icHeight;

				$("#starmap_container")
					.css("width", icWidth + "px")
					.css("height", icHeight + "px");

				overlayWidth =  c.overlayWidth;
				overlayHeight =  c.overlayHeight;
				overlayAspectRatio = overlayWidth / overlayHeight;

				// never go larger than what user specified
				overlayHeightMax = overlayHeight;
				overlayWidthMax = overlayWidth;

				starmapWidth = $("#starmap").width();
				starmapHeight = $("#starmap").height();

				var percentSmallerHeight = 1;
				var percentSmallerWidth = 1;
				var imageWidth = c.imageWidth
				var checkWidth = icWidth + (imageBorder ? 2 : 0);	// border is 1px
				if (checkWidth < imageWidth) {
					// The actual image on the screen is smaller than the
					// imageWidth requested by the user.
					// Determine the percent smaller, then shrink the overlay that amount.
					percentSmallerWidth = icWidth / c.imageWidth;
					percentSmallerHeight = percentSmallerWidth;

					// #starmap holds the starmap button, so needs to resize it as well.
					w = starmapWidth * percentSmallerWidth;
					var h = Math.round(w / overlayAspectRatio, 0);
					w = Math.round(w, 0);
					$("#starmap")
						.css("width", w + "px")
						.css("height", h + "px");
					starmapWidth = w;
					starmapHeight = h;

					//  Offset of overlay + New Margins
					var scalemargins = icWidth / overlayWidthMax;
					$("#starmap")
						.css("margin-top", c.overlayOffsetTop * scalemargins + "px")
						.css("margin-left", c.overlayOffsetLeft * scalemargins + "px");

					overlayWidth = Math.round(overlayWidth * percentSmallerWidth, 0);
					overlayHeight = Math.round(overlayWidth / overlayAspectRatio, 0);
					$("#starmap_inner")
						.css("width", overlayWidth + "px")
						.css("height", overlayHeight + "px");
				} else {
					$("#starmap")
						.css("margin-top", c.overlayOffsetTop + "px")
						.css("margin-left", Math.round(c.overlayOffsetLeft, 0) + "px");
				}

				// id="live_container" is where the image goes.
				var image_w = c.imageWidth;
				var image_h = Math.round((image_w / icImageAspectRatio), 0);

				// The "?" icon is in the "starmap" container,
				// which is part of the (usually larger) "starmap_container".
				// Since the optional border goes around the "starmap_container",
				// put "?" icon on upper right of that container, 3 pixels inside the border.

				// Determine how far apart the right sides of the
				// "starmap" and "starmap_container" are.

				var i = "starmap_container";
				var starmap_containerWidth = $("#"+i).width();
				var diffWidth = Math.round((starmap_containerWidth - starmapWidth) * percentSmallerWidth, 0) - c.overlayOffsetLeft;
				let x = -diffWidth + 3;
				var y = -c.overlayOffsetTop + 3;

				if (checkWidth < imageWidth) {
// This doesn't work very well - when the browser window is larger than the image,
// the "?" icon is in the correct place, but when the browser window is smaller than the image,
// which it is when (checkWidth < imageWidth), the icon is slightly too far to the right
// when checkWidth is slightly < imageWidth, then as checkWidth decreases, the icon
// move farther and farther left.
// The "percentSmallerWidth" tries unsuccessfully to take that movement into account.
					if (c.overlayOffsetLeft != 0) {
						// TODO: I have no idea why this is needed.
						// I got the number by trial and error but
						// they aren't great.
						var change =  ((percentSmallerWidth * 0.95 * x) - x) / 2;
						x += change + 20;
						x = Math.round(x, 0);
					}

					if (c.overlayOffsetTop > 0) {
						y *= percentSmallerHeight * 1.3;
						y = Math.round(y, 0);
					} else if (c.overlayOffsetTop < 0) {
						y *= percentSmallerHeight * 1.5;
						y = Math.round(y, 0);
					}
				}
				$(".starmap_btn_help").css("right", Math.round(x, 0) + "px");
				$(".starmap_btn_help").css("top", Math.round(y, 0) + "px");
//console.log("percentSmallerWidth="+percentSmallerWidth +", adjusted="+(percentSmallerWidth * 1.001));
//console.log("===========");
//console.log("putting at x="+x +", y="+y, $("#"+i));
//console.log("starmapWidth="+starmapWidth +", starmap_containerWidth="+starmap_containerWidth +", diff width="+diffWidth);
//console.log("oL="+c.overlayOffsetLeft +", oT="+c.overlayOffsetTop);

				// Keep track of the sizes.  virtualsky.js seems to change them,
				// so we need to change them based on our last known sizes.
				last_s_iW = $("#starmap_inner").width();
				last_s_iH = $("#starmap_inner").height();
			}
		});
	}
};

function compile($compile) {
	// directive factory creates a link function
	return function (scope, element, attrs) {
		scope.$watch(
			function (scope) {
				// watch the 'compile' expression for changes
				return scope.$eval(attrs.compile);
			},
			function (value) {
				// when the 'compile' expression changes
				// assign it into the current DOM
				element.html(value);

				// compile the new DOM and link it to the current
				// scope.
				// NOTE: we only compile .childNodes so that
				// we don't get into infinite loop compiling ourselves
				$compile(element.contents())(scope);
			}
		);
	};
}

function convertLatitude(sc, lat) {			// sc == scope
	var convertToString = false;
	var len, direction;

	if (typeof lat === "string") {
		sc.s_latitude = lat;	// string version

		len = lat.length;
		direction = lat.substr(len-1, 1).toUpperCase();
		if (direction == "N")
			sc.latitude = lat.substr(0, len-2) * 1;
		else if (direction == "S")
			sc.latitude = lat.substr(0, len-2) * -1;
		else {
			// a number with quotes around it which is treated as a string
			sc.latitude = lat * 1;
			convertToString = true;
		}
	} else {
		sc.latitude = lat;
		convertToString = true;
	}

	if (convertToString) {
		if (lat >= 0)
			sc.s_latitude = lat + "N";
		else
			sc.s_latitude = -lat + "S";
	}

	return sc.latitude;
}

function convertLongitude(sc, lon) {
	var convertToString = false;
	var len, direction;

	if (typeof lon === "string") {
		sc.s_longitude = lon;

		len = config.longitude.length;
		direction = lon.substr(len-1, 1).toUpperCase();
		if (direction == "E")
			sc.longitude = lon.substr(0, len-2) * 1;
		else if (direction == "W")
			sc.longitude = lon.substr(0, len-2) * -1;
		else {
			// a number with quotes around it which is treated as a string
			sc.longitude = lon * 1;
			convertToString = true;
		}
	} else {
		sc.longitude = lon;
		convertToString = true;
	}

	if (convertToString) {
		if (config.longitude >= 0)
			sc.s_longitude = lon + "E";
		else
			sc.s_longitude = -lon + "W";
	}

	return sc.longitude;
}

function AppCtrl($scope, $timeout, $http, _) {

	// Allow latitude and longitude to have or not have N, S, E, W,
	// but in the popout, always use the letters for consistency.
	// virtualsky.js expects decimal numbers so we need both.
	// Need to convert them before building the overlay.
	$scope.latitude = convertLatitude($scope, config.latitude);
	myLatitude = $scope.latitude;
	$scope.longitude = convertLongitude($scope, config.longitude);
	myLongitude = $scope.longitude;

	$scope.imageURL = config.loadingImage;
	imageBorder = config.imageBorder;
	$scope.showInfo = false;
	$scope.showOverlay = config.showOverlayAtStartup;
	if ($scope.showOverlay) {
		console.log("@@ Building overlay at startup for showOverlay...");
		buildOverlay();
	}
	$scope.notification = "";
	$scope.location = config.location;
	$scope.camera = config.camera;
	$scope.lens = config.lens;
	$scope.computer = config.computer;
	$scope.equipmentinfo = config.equipmentinfo;
	$scope.owner = config.owner;
	$scope.auroraForecast = config.auroraForecast;
	$scope.imageName = config.imageName;
	$scope.AllskyVersion = config.AllskyVersion;
	$scope.messages = document.getElementById("messages");
	$scope.messages.innerHTML = "";

	function getHiddenProp() {
		var prefixes = ['webkit', 'moz', 'ms', 'o'];

		// if 'hidden' is natively supported just return it
		if ('hidden' in document) return 'hidden';

		// otherwise loop over all the known prefixes until we find one
		for (var i = 0; i < prefixes.length; i++) {
			if ((prefixes[i] + 'Hidden') in document)
				return prefixes[i] + 'Hidden';
		}

		// otherwise it's not supported
		return null;
	}
	var hiddenProperty = getHiddenProp();

	function isHidden() {
		if (! hiddenProperty) return false;
		return document[hiddenProperty];
	}

	// If the "sunData" file wasn't found, or for some reason "sunset" isn't in it,
	// the routine that reads "sunData" will set "dataMissingMsg" so display it.
	// If the file's old "dataOldMsg" will be set.
	var dataMissingMsg = "";
	var dataOldMsg = "";

	function formatMessage(msg, msgType) {
		return("<div class='msg " + msgType + "-msg'>" + msg + "</div>");
	}

	// How old should the data file be, or the sunset time be, in order to warn the user?
	// In the morning before a new file is uploaded,
	// it'll be a day old so use a value at least greater than 1.
	const oldDataLimit = 2;

	// The defaultInterval should ideally be based on the time between day and
	// night images - why check every 5 seconds if new images only appear once a minute?

	// Time to wait between normal images.
	var defaultInterval = (config.intervalSeconds * 1000);
	// Amount of time we're currently waiting
	var intervalTimer = defaultInterval;

	// If we're not taking pictures during the day,
	// we don't need to check for updated images as often.
	// If we're displaying an aurora picture, it's only updated every 5 mintutes.
	// If we're not displaying an aurora picture the picture we ARE displaying doesn't change so
	// there's no need to check until nightfall.
	// However, in case the image DOES change, check every minute.
	// Seems like a good compromise.

	// Also, in both cases, if we wait too long, when the user returns to the web page after
	// it's been hidden, they'll have to wait a long time for the page to update.
	var auroraIntervalTimer = (60 * 1000);			// seconds
	var auroraIntervalTimerShortened = (15 * 1000);	// seconds
	var nonAuroraIntervalTimer = (60 * 1000);		// seconds

	// When there is only this much time to nightime,
	// shorten the timeout value for quicker message updates.
	const startShortenedTimeout = (10 * 60 * 1000);	// minutes

	var lastType = "";
	var loggedTimes = false;
	var numImagesRead = 0;
	var numCalls = 0;

	$scope.getImage = function () {
		var url= "";
		var imageClass= "";
		// Go through the loop occassionally even when hidden so we re-read the sunData file
		// if needed.
		if (! isHidden() || ++numCalls % 5 == 0) {
			$scope.notification = "";
			if (dataMissingMsg !== "") {
				$scope.notification += formatMessage(dataMissingMsg, "error");
			}
			if (dataOldMsg !== "") {
				$scope.notification += formatMessage(dataOldMsg, "warning");
			}

			var rereadSunriseSunset = false;

			numImagesRead++;

			// the "m_" prefix means it's a moment() object.
			var m_now = moment(new Date());
			var m_nowTime = m_now.format(timeF);
			var m_sunriseTime = moment($scope.sunrise).format(timeF);
			var m_sunsetTime  = moment($scope.sunset).format(timeF);
			var beforeSunriseTime = m_nowTime < m_sunriseTime;
			var afterSunsetTime = m_nowTime > m_sunsetTime;

			// Check if the sunset time is too old.
			// If the data file is old, don't bother checking sunset time since it'll be old too.
			// However, we may need "daysOld" below so calculate it.
			var m_nowDate = moment(m_now.format(dateF));	// needs to be moment() object
			var m_sunsetDate = moment($scope.sunset.format(dateF));
			var daysOld = moment.duration(m_nowDate.diff(m_sunsetDate)).days();
			var oldMsg = "";

			// This check assumes sunrise and sunset are both in the same day,
			// which they should be since postData.sh runs at the end of nighttime and calculates
			// sunrise and sunset for the current day.

			// It's nighttime if we're either before sunrise (e.g., 3 am and sunrise is 6 am) OR
			// it's after sunset (e.g., 9 pm and sunset is 8 pm).
			// Both only work if we're in the same day.
			var is_nighttime;
			if (beforeSunriseTime || afterSunsetTime) {
				// sunrise is in the future so it's currently nighttime
				is_nighttime = true;
			} else {
				is_nighttime = false;
			}

			// The sunrise and sunset times change every day, and the user may have changed
			// when they're taking images, so re-read the "sunData" file when something changes.
			if (is_nighttime) {
				// Only add to the console log once per message type
				if (lastType !== "nighttime") {
					console.log("=== Night Time imaging starts at " + m_now.format(userTimeF));
					lastType = "nighttime";
					loggedTimes = false;
					rereadSunriseSunset = true;
				}
				url = config.imageName;
				imageClass = 'current';
				intervalTimer = defaultInterval;

			} else if ($scope.takedaytimeimages) {
				if (lastType !== "daytime") {
					console.log("=== Day Time imaging starts at " + m_now.format(userTimeF));
					lastType = "daytime";
					loggedTimes = false;
					rereadSunriseSunset = true;
				}
				url = config.imageName;
				imageClass = 'current';
				intervalTimer = defaultInterval;

			} else {	// daytime but we're not taking pictures
				if (lastType !== "daytimeoff") {
					console.log("=== Camera turned off during Day Time at " + m_now.format(userTimeF));
					lastType = "daytimeoff";
					loggedTimes = false;
					rereadSunriseSunset = true;
				}

			 	// Countdown calculation
				// The sunset time only has hours and minutes so could be off by up to a minute,
				// so add some time.  Better to tell the user to come back in 2 minutes and
				// have the actual time be 1 minute, than to tell them 1 minute and a new
				// picture doesn't appear for 2 minutes after they return so they sit around waiting.
				// Need to compare on the same date, but different times.
				var ms = moment($scope.sunset, dateTimeF)
						.add(daysOld,"days")
						.diff(moment(m_now, dateTimeF));

				// Testing showed that 1 minute wasn't enough to add, and we need to account for
				// long nighttime exposures, so add 2.5 minutes.
				const add = 2.5 * 60 * 1000;
				ms += add;
				const time_to_come_back = moment($scope.sunset + add).format(userTimeF);

				var d = moment.duration(ms);
				var hours = Math.floor(d.asHours());
				var minutes = moment.utc(ms).format("m");
				var seconds = moment.utc(ms).format("s");
				var h = hours !== 0 ? hours + " hour" + (hours > 1 ? "s " : " ") : "";
				// Have to use != instead of !== because "minutes" is a string.
				var m = minutes != 0 ? minutes + " minute" + (minutes > 1 ? "s" : "") : "";
				var s
				if (hours == 0 && minutes == 0)
					s = seconds + " seconds";
				else
					s = h + m;
				$scope.notification += formatMessage("It's not dark yet in " + config.location + ".&nbsp; &nbsp; Come back at " + time_to_come_back + " (" + s + ").", "notice");

				if (! loggedTimes) {
					console.log("=== Resuming at nighttime in " + s);
				}
				if ($scope.auroraForecast) {
					url = "https://services.swpc.noaa.gov/images/animations/ovation/";
					url += config.auroraMap + "/latest.jpg";
					imageClass = 'forecast-map';
					// If less than startShortenedTimeout time left, shorten the timer.
					if (ms < startShortenedTimeout) {
						intervalTimer = auroraIntervalTimerShortened;
					} else {
						intervalTimer = auroraIntervalTimer;
					}
				} else {
					url = config.imageName;
					imageClass = 'current';
					intervalTimer = nonAuroraIntervalTimer;
				}

			}

			if (! loggedTimes) {		// for debugging
				loggedTimes = true;
				console.log("  m_now = " + m_now.format(dateTimeF));
				if (oldMsg !== "") console.log("    > " + oldMsg);

				console.log("  m_now="+m_nowTime + ", m_sunrise="+m_sunriseTime + ", m_sunset="+m_sunsetTime);
				console.log("  beforeSunriseTime = " + beforeSunriseTime);
				console.log("  afterSunsetTime = " + afterSunsetTime);
			}

			var img = $("<img title='allsky image' />")
				.addClass(imageClass)
				.on('load', function() {
					$("#live_container").empty().append(img);
					$scope.messages.innerHTML = "";
				}).on('error', function(e) {
					if ($scope.messages.innerHTML == "") {
						console.log("GOT ERROR reading image");

						let message = "The image at <span style='color: white;'>";
						message += $scope.imageName;
// TODO: is there a way to determine "not found" from "corrupted" ?
						message += "</span> is not found or is corrupted.";
						message += "<br><br>";
						message += "Check the <span style='color: #a6e22e;'>imageName</span>";
						message += " setting in the WebUI's 'Editor' page.";
						message += "<br>";
						message += "<br>For local Websites, edit ";
						message += "<code>configuration.json</code>.";
						message += "<br>For remote Websites, edit ";
						message += "<code>remote_configuration.json</code>.";
						// If it contains "current" say that's only for local Websites
						if ($scope.imageName.search("/current") >= 0) {
							message += "<br><br>";
							message += "If this is a <u>remote</u> Allsky Website,<br>";
							message += " the setting should normally be ";
							message += " <span style='color: white;'>image.jpg</span>.";
						}
						$scope.messages.innerHTML = formatMessage(message, "warning");
					}
				})
// TODO: Is there a way to specify not to cache this without using "?_ts" ?
				.attr('src', url + '?_ts=' + new Date().getTime());

			// Don't re-read after the 1st image of this period since we read it right before the image.
			if (rereadSunriseSunset && numImagesRead > 1) {
				$scope.getSunRiseSet();
			}
		} // if (! isHidden()))
	};

	// Set a default sunrise if we can't get it from "sunData".
	var usingDefaultSunrise = false;
	function getDefaultSunrise(today) {
		return(moment(new Date(today.getFullYear(), today.getMonth(), today.getDate(), 6, 0, 0)));
	}
	// Set a default sunset if we can't get it from "sunData".
	var usingDefaultSunset = false;
	function getDefaultSunset(today) {
		return(moment(new Date(today.getFullYear(), today.getMonth(), today.getDate(), 18, 0, 0)));
	}

	function writeSunriseSunsetToConsole() {
		console.log("  * sunrise = " + $scope.sunrise.format(dateTimeF) +
			(usingDefaultSunrise ? " (default)" : ""));
		console.log("  * sunset = "  + $scope.sunset.format(dateTimeF) +
			(usingDefaultSunset ? " (default)" : ""));
		console.log("  * takedaytimeimages == " + $scope.takedaytimeimages);
		console.log("  * takenighttimeimages == " + $scope.takenighttimeimages);
		if (lastModifiedSunriseSunsetFile !== null)
			console.log("  * last modified = "  + lastModifiedSunriseSunsetFile.format(dateTimeF));
	}

	var usingDefaultTakingDaytime = false;
	var usingDefaultTakingNighttime = false;
	var lastModifiedSunriseSunsetFile = null;

	$scope.getSunRiseSet = function () {
		now = new Date();
		var url = sunData;
// TODO: is ?_ts needed if we are not cache'ing ?
		url += '?_ts=' + now.getTime();
		console.log("Read " + sunData + " on " + moment(now).format("MM-DD h:mm:ss a") + ":");
		$http.get(url, {
			cache: false
		}).then(
			function (data) {
				// Make sure all the data is there.
				if (data.data.sunrise) {
					$scope.sunrise = moment(data.data.sunrise);
					usingDefaultSunrise = false;
				} else if (! usingDefaultSunrise) {
					$scope.sunrise = getDefaultSunrise(now);
					usingDefaultSunrise = true;
				}
				if (data.data.sunset) {
					$scope.sunset = moment(data.data.sunset);
					usingDefaultSunset = false;
				} else if (! usingDefaultSunset) {
					$scope.sunset = getDefaultSunset(now);
					usingDefaultSunset = true;
				}
				if (data.data.takedaytimeimages) {
					$scope.takedaytimeimages = data.data.takedaytimeimages === "true";
				} else {
					$scope.takedaytimeimages = true;
					usingDefaultTakingDaytime = true;
				}
				if (data.data.takenighttimeimages) {
					$scope.takenighttimeimages = data.data.takenighttimeimages === "true";
				} else {
					$scope.takenighttimeimages = true;
					usingDefaultTakingNighttime = true;
				}

				dataMissingMsg = "";
				if (usingDefaultSunset || usingDefaultSunrise ||
						usingDefaultTakingDaytime || usingDefaultTakingNighttime) {
					dataMissingMsg = "ERROR: Data missing from '" + sunData + "':";
					dataMissingMsg += "<div><ul style='text-align: left; display: inline-block; '>";
					if (usingDefaultSunrise) {
						dataMissingMsg += "<li>'sunrise' (using " + $scope.sunrise.format(userTimeF) + ")";
					}
					if (usingDefaultSunset) {
						dataMissingMsg += "<li>'sunset' (using " + $scope.sunset.format(userTimeF) + ")";
					}
					if (usingDefaultTakingDaytime) {
						dataMissingMsg += "<li>'takedaytimeimages' (using " + $scope.takedaytimeimages + ")";
					}
					if (usingDefaultTakingNighttime) {
						dataMissingMsg += "<li>'takenighttimeimages' (using " + $scope.takenighttimeimages + ")";
					}
					dataMissingMsg += "</ul></div>";
					dataMissingMsg += "Run 'allsky-config check_post_data'";
					dataMissingMsg += " on the Pi to determine why data is missing.";
				}

				// Get when the file was last modified so we can warn if it's old.
				function fetchHeader(url, wch) {
					try {
						var req=new XMLHttpRequest();
						req.open("HEAD", url, false);
						req.send(null);
						if(req.status == 200){
							return new Date(req.getResponseHeader(wch));
						}
						else return false;
					} catch(er) {
						return er.message;
					}
				}
				lastModifiedSunriseSunsetFile = null;
				var x = fetchHeader(url,'Last-Modified');
				if (typeof x === "object") {	// success - "x" is a Date object
					lastModifiedSunriseSunsetFile = moment(x);
					var duration = moment.duration(moment(now).diff(lastModifiedSunriseSunsetFile));
					if (duration.days() > oldDataLimit) {
						var file = spanOn + sunData + spanOff;
						dataOldMsg = "WARNING: '" + file + "'";
						dataOldMsg += " is " + duration.days() + " days old.";
						if (dataMissingMsg == "") {
							var cmd = spanOn + "allsky-config check_post_data" + spanOff;
							dataOldMsg += "<br>Run '" + cmd + "'";
							dataOldMsg += " on the Pi to troubleshoot.";
						}
					}

				} else {
					console.log("fetchHeader(" + sunData + ") returned " + x);
				}

				writeSunriseSunsetToConsole();

				$scope.getImage()

			}, function() {
				// Unable to read file.  Set to defaults.
				$scope.sunrise = getDefaultSunrise(now); usingDefaultSunrise = true;
				$scope.sunset = getDefaultSunset(now); usingDefaultSunset = true;
				$scope.takedaytimeimages = true;; usingDefaultTakingDaytime = true;
				$scope.takenighttimeimages = true;; usingDefaultTakingDaytime = true;

				var file = spanOn + sunData + spanOff;
				dataMissingMsg = "ERROR: '" + file + "' file not found.";
				dataMissingMsg += "<br>Using " + $scope.sunrise.format(userTimeF) + " for sunrise";
				dataMissingMsg += " and " + $scope.sunset.format(userTimeF) + " for sunset.";
				var cmd = spanOn + "allsky-config check_post_data" + spanOff;
				dataMissingMsg += "<br>Run '" + cmd + "'";
				dataMissingMsg += " on the Pi to troubleshoot,";
				dataMissingMsg += " then refresh this browser window.";
				console.log("  *** Unable to read '" + sunData + "' file");
				writeSunriseSunsetToConsole();

				$scope.getImage()
			}
		);
	};
	$scope.getSunRiseSet();

	$scope.intervalFunction = function () {
		$timeout(function () {
			$scope.getImage();
			$scope.intervalFunction();
		}, intervalTimer)
	};
	$scope.intervalFunction();

	$scope.toggleInfo = function () {
		$scope.showInfo = !$scope.showInfo;
	};
	
	$scope.toggleOverlay = function () {
		$scope.showOverlay = !$scope.showOverlay;

		if (! overlayBuilt && $scope.showOverlay) {
			console.log("@@@@ Building overlay from toggle...");
			// Version 0.7.7 of VirtualSky only shows the overlay if buildOverlay() is called.
			buildOverlay();
		}

		$('.options').fadeToggle();
		$('#starmap_container').fadeToggle();
	};

	// based mostly on https://auroraforecast.is/kp-index/
	$scope.getScale = function (index) {
		var scale = {
			0: "Extremely_Quiet",
			1: "Very_Quiet",
			2: "Quiet",
			3: "Unsettled",
			4: "Active",
			5: "Minor_Storm",
			6: "Moderate_Storm",
			7: "Strong_Storm",
			8: "Severe_Storm",
			9: "Extreme_Storm",
			100: "WARNING"
		};
		return scale[index];
	};

	if ($scope.auroraForecast) {
		$scope.getForecast = function () {

			function getSum(data, field) {
				var total = _.sumBy(data, function (row) {
					return parseInt(row[field]);
				});
				return Math.round(total / data.length);	// return average
			}

			function getDay(number) {
				var day = moment().add(number, 'd');
				return moment(day).format("MMM") + " " + moment(day).format("DD");
			}

			$http.get("getForecast.php")
				.then(function (response) {
					$scope.forecast = {};
					// If the 1st 'time' value begins with "WARNING", there was an error getting data.
					msg = response.data[0]['time'];
					if ((msg.substring(0,9) == "WARNING: ") || response.data == "") {
						// 100 indicates warning
						$scope.forecast[''] = 100;	// displays "WARNING"
						$scope.forecast[msg.substring(9)] = -1; // displays msg
					} else {
						$scope.forecast[getDay(0)] = getSum(response.data, "day1");
						$scope.forecast[getDay(1)] = getSum(response.data, "day2");
						$scope.forecast[getDay(2)] = getSum(response.data, "day3");
					}
				});
		};

		$scope.getForecast();
	}
}


angular
	.module('allsky')
	.directive('compile', ['$compile', compile])
	.controller("AppCtrl", ['$scope', '$timeout', '$http', 'lodash', AppCtrl])
;
