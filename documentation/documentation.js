// https://htmlpreview.github.io/?https://raw.githubusercontent.com/thomasjacquin/allsky/blob/dev/documentation/basics/index.html
// https://raw.githubusercontent.com/thomasjacquin/allsky/dev/documentation/images/Desktop.png


// This file resides on the Allsky Github page with a copy on a person's Pi.

// branch is updated during installation.
var branch = "moretesting";

// On the Pi, URLs will either begin with "/documentation" (which is a web
// alias to ~/allsky/documentation), or will be a relative path.
// Either way, use it as is.

// On GitHub, all URLs must have "/documentation/" in them - either because they were defined
// that way in the html file, or we add them in this script.
var documentation_URL = "/documentation/";
var documentation_URL_length = documentation_URL.length;

var onGitHub;

var git_hostname = "htmlpreview.github.io";
var preURL_href, preURL_src;			// What gets prepended to the desired URL.

var git_preURL_href = "https://" + git_hostname + "/?";
var git_raw = "https://raw.githubusercontent.com/thomasjacquin/allsky/";

if (location.hostname == git_hostname) {
	onGitHub = true;

	// On GitHub, the URLs for anchors (href=) and images (src=) are different.
	// anchors need get_preURL_href prepended to them and "/blob/" added.
	// image URLs are simplier.
	preURL_href = git_preURL_href + git_raw + "blob/" + branch;
	preURL_src = git_raw + branch;
} else {
	onGitHub = false;		// on a Pi
	preURL_href = "";
}

var convertURL_called = false;

// Convert URL for all tags with an "allsky=true" attribute.
// The specified URL is assumed to be relative to the root of the documentation tree.
function convertURL() {
	if (convertURL_called) return;
	// TODO: should we only be called once?
	// What if includeHTML() found multiple files and they all had "allsky" links?
	convertURL_called = true;

	allTags = document.getElementsByTagName("*");
var show_href=true;
	for (var i = 0; i < allTags.length; i++) {
		var elmnt = allTags[i];
		/*
			Search for elements with "allsky" attribute which means
			we need to update the URL.
		*/
		if (! elmnt.getAttribute("allsky")) continue;	// "allsky" not defined - ignore tag

		var url = null;
		var preURL;
		var attribute = "href";
		url = elmnt.getAttribute(attribute);
		if (url) {
			preURL = preURL_href;
		} else {
			attribute = "src";
			url = elmnt.getAttribute(attribute);
			if (url) {
				preURL = preURL_src;
			} else {
				attribute = "unknown attribute";
				url = "?";
			}
		}
if (show_href || attribute !== "href") {
console.log("======= ELMNT=", elmnt);
if (attribute === "href") show_href = false;
		console.log("Looking at " + attribute + "= " + url);
}

		var isDocumentation = false;	// Is the URL in the Allsky documentation area?
		if (url !== "?" && url !== "") {
			// See if the url starts with documentation_URL.
			isDocumentation = (url.substr(0, documentation_URL_length) == documentation_URL) ? true : false;
			if (onGitHub) {
				if (! isDocumentation) {
					// Need to add the documentation string.
					elmnt[attribute] += documentation_URL;
console.log("== After adding documenatation_URL (" + documenation_URL + "), elmnt[" + attribute + "] now = " + elmnt[attribute]);
				}

				// Only prepend if not already there.
				if (elmnt[attribute].search(preURL) < 0)
//console.log("== setting " + attribute + " " + elmnt[attribute] + " to preURL=" + preURL + " + url=" + url);
					elmnt[attribute] = preURL + url;
console.log("== After adding preURL/URL (" + preURL + " / " + URL + "), elmnt[" + attribute + "] now = " + elmnt[attribute]);
			} else if (! isDocumentation) {
				elmnt[attribute] = documentation_URL + url;
			}
			// else on Pi and in documenation so do nothing to do since the URL is already correct.

		} else {
			console.log("--- Unknown attribute for allsky, elmnt=", elmnt);
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
			/* Make an HTTP request using the attribute value as the file name */
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

			if (onGitHub) {
				file = preURL_href + "/" + file;
			}  // else on Pi so nothing to do since the URL is already correct.
console.log("GET " + file);
			xhttp.open("GET", file, true);
			xhttp.send();

			/* Exit the function: */
			return;
		}
	}
}
