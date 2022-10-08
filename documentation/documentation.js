// This file resides on the Allsky Github page with a copy on a person's Pi.

// branch is updated during installation.
var branch = "dev";

var onPi;
var preURL;			// What gets prepended to the desired URL.
var Pi_preURL = "/documentation/";
var Pi_preURL_length = Pi_preURL.length;

// console.log("hostname=" + location.hostname);
var git_hostname = "htmlpreview.github.io";
var git_preURL = "https://" + git_hostname + "/?";
var git_raw = "https://raw.githubusercontent.com/thomasjacquin/allsky/blob/";
if (location.hostname == git_hostname) {
	onPi = false;
	// To make the URLs shorter in the .html files,
	// they are relative to the "documentation" directory.
	var dir = git_raw + branch + Pi_preURL;
	preURL = git_preURL + dir;
} else {
	onPi = true;
	// "/documentation" is a web alias to ~/allsky/documentation
	preURL = Pi_preURL;
}

var convertURL_called = false;

var xxShowAll = false;
// Convert URL for all tags with "allsky" attribute
function convertURL() {
	if (convertURL_called) return;
	convertURL_called = true;

	var i, elmnt, allsky, url, attribute;

	allTags = document.getElementsByTagName("*");
var numAllsky = 1;
	for (i = 0; i < allTags.length; i++) {
		elmnt = allTags[i];
		/*
			Search for elements with "allsky" attribute which means
			the file is in allsky's "documentation" directory.
		*/
url = elmnt.getAttribute("href");
//if (url) console.log(i + ": href=" + url);
var f;
if (url) {
	f = url.search("settings/allsky.html");
	if (f >= 0) console.log("======= FOUND ", elmnt.outerHTML);
}

		allsky = elmnt.getAttribute("allsky");
		if (allsky) {
numAllsky++;
if (f >= 0 || xxShowAll) {
console.log("ALLSKY " + numAllsky);
}
			attribute = "href";
			url = elmnt.getAttribute(attribute);
			if (! url) {
				attribute = "src";
				url = elmnt.getAttribute(attribute);
			}
			if (url) {
var elmntInitial = elmnt[attribute];
if (f >= 0 || xxShowAll) {
console.log("   " + elmnt.localName + "[" + attribute + "]=" + elmntInitial);
}

				// See if the url starts with pi_preURL.
				// If it does and we're on a Pi, then
				var isDoc = url.substr(0, Pi_preURL_length) == Pi_preURL ? true : false;
				if (onPi) {
					if (! isDoc) {
						// Prepend to the URL.
						elmnt[attribute] = Pi_preURL + url;
					}
					// else nothing to do since the string is already there.

				} else {
					if (isDoc) {
						// Need to skip the string.
						elmnt[attribute] = elmnt[attribute].substr(Pi_preURL_length);
					}
if (f >= 0 || xxShowAll) {
console.log("elmntInitial=" + elmntInitial);
console.log("preURL=" + preURL);
console.log("url=" + url);
console.log("git_preURL=" + git_preURL);
}
					// Only prepend if not already there.
					if (elmnt[attribute].search(git_preURL) < 0)
						elmnt[attribute] = preURL + url;
				}
			}
		}
	}
}


// Include a file (e.g., header, footer, sidebar) in a page using Javascript.
function includeHTML() {
	var i, elmnt, file, xhttp;

	/* Loop through a collection of all HTML elements: */
	allTags = document.getElementsByTagName("*");
	for (i = 0; i < allTags.length; i++) {
		elmnt = allTags[i];
		/*search for elements with a certain atrribute:*/
		file = elmnt.getAttribute("w3-include-html");
		if (file) {
			/* Make an HTTP request using the attribute value as the file name: */
			xhttp = new XMLHttpRequest();
			xhttp.onreadystatechange = function() {
				if (this.readyState == 4) {
					if (this.status == 200)
						elmnt.innerHTML = this.responseText;
					else if (this.status == 400 || this.status == 404)
						elmnt.innerHTML = this.status + ": Page not found.";
					/*
						Remove the attribute, and call this function once more
						to see if there are any new entries to process and to handle
						any other original entries.
					 */
					elmnt.removeAttribute("w3-include-html");
					includeHTML();
					if (! convertURL_called) convertURL();
				}
			}

			if (onPi) {
				file = preURL + file;
			} else {
				var d = elmnt.getAttribute("d");
				if (d) {
					file = d + file;
				}
// 	file = preURL + file;
}
			console.log("GET " + file);
			xhttp.open("GET", file, true);
			xhttp.send();

			/* Exit the function: */
			return;
		}
	}
}
