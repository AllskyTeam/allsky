// https://htmlpreview.github.io/?https://raw.githubusercontent.com/thomasjacquin/allsky/blob/dev/documentation/basics/index.html
// https://raw.githubusercontent.com/thomasjacquin/allsky/dev/documentation/images/Desktop.png


// This file resides on the Allsky Github page with a copy on a person's Pi.

// branch is updated during installation.
var branch = "dev";

// On the Pi, URLs will either begin with "/documentation" (which is a web
// alias to ~/allsky/documentation), or will be a relative path.
// Either way, use it as is.

// On GitHub, all URLs must have "/documentation/" in them - either because they were defined
// that way in the html file, or we add them in this script.
var documentation_URL = "/documentation/";

var onGitHub;

var git_hostname = "htmlpreview.github.io";
var preURL_href, preURL_src;			// What gets prepended to the desired URL.

var git_preURL_href = "https://" + git_hostname + "/?";
var git_raw = "https://raw.githubusercontent.com/thomasjacquin/allsky/";

if (location.hostname == git_hostname || 1) {
	onGitHub = true;

	// On GitHub, the URLs for anchors (href=) and images (src=) are different.
	// anchors need get_preURL_href prepended to them.
	// image URLs and files that are included don't need get_preURL_href.
//x	preURL_href = git_preURL_href + git_raw + "blob/" + branch;
	preURL_href = git_preURL_href + git_raw + branch;
	preURL_src = git_raw + branch;
} else {
	onGitHub = false;		// on a Pi
	preURL_href = "";
	preURL_src = "";
}
preURL_include = preURL_src;

var convertURL_called = false;

// Convert URL for all tags with an "allsky=true" attribute.
// The specified URL will never be a full URL, i.e., it'll start with "/" or a dir/file.
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
			Search for elements with an "allsky" attribute which means
			we need to update the URL.
		*/
		if (! elmnt.getAttribute("allsky")) continue;	// "allsky" not defined - ignore tag

		var url = null;
		var preURL;

		// Most of the elements with "allsky" are href, so look for them first.
		var attribute = "href";
		url = elmnt.getAttribute(attribute);
		if (url) {
			preURL = preURL_href;
		} else {	// not "href", look for "src".
			attribute = "src";
			url = elmnt.getAttribute(attribute);
			if (url) {
				preURL = preURL_src;
			} else {
				attribute = "unknown attribute";
				console.log("xxxx unkown attribute for " + elmnt);
				continue;
			}
		}

if (show_href || attribute !== "href") {
console.log("======= ELMNT=", elmnt);
if (attribute === "href") { show_href = false; }
		console.log("Looking at " + attribute + "= " + url);
}
		// See if the url contains with documentation_URL.
		var isDocumentation = (url.indexOf(documentation_URL) >= 0) ? true : false;
		if (! isDocumentation) {
			// Need to prepend the documentation string.
			url = documentation_URL + url;
console.log("== After prepending documentatation_URL, url now = " + url);
		}

		if (onGitHub) {
			// Only prepend if not already there.
			if (url.indexOf(preURL) < 0)
//console.log("== setting " + attribute + " " + elmnt[attribute] + " to preURL=" + preURL + " + url=" + url);
				url = preURL + url;
console.log("== After prepending preURL, url now = " + url);
		}
		// else on Pi and in documentation so do nothing to do since the URL is already correct.

		elmnt[attribute] = url;
	}
}


// Include a file (e.g., header, footer, sidebar) in a page using Javascript.
function includeHTML() {
	/* Search all HTML elements looking for ones that specify a file should be included. */
	allTags = document.getElementsByTagName("*");
	for (var i = 0; i < allTags.length; i++) {
		var elmnt = allTags[i];
		/*search for elements with a certain atrribute:*/
		var file = elmnt.getAttribute("w3-include-html");
		if (file) {
			/* Make an HTTP request using the attribute value as the file name */
			var xhttp = new XMLHttpRequest();
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
				var pre = preURL_include;
				if (file.substr(0,1) !== "/") {
					pre += "/";
				}
				file = pre + file;
			}  // else on Pi so nothing to do since the URL is already correct.
console.log("GET " + file);
			xhttp.open("GET", file, true);
			xhttp.send();

			/* Exit the function: */
			return;
		}
	}
}
