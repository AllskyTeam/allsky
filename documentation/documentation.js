var onPi = true;

// Go to the specified URL, either on GitHub or the Pi.
function u(id) {
	var me, url;
	me = document.querySelector("#" + id);
	if (! me) return false;

	if (! onPi) {
		url = "https://github.com/thomasjacquin/allsky/wiki/" + me.getAttribute("href");
	} else {
		url = "/documentation/" + me.getAttribute("Pi");
	}

	if (url) window.location.href = url;

	return false;	// shouldn't get here...
}


// Include a file (e.g., header, footer, sidebar) in a page using Javascript.
function includeHTML() {
	var z, i, elmnt, file, xhttp;
	/* Loop through a collection of all HTML elements: */
	z = document.getElementsByTagName("*");
	for (i = 0; i < z.length; i++) {
		elmnt = z[i];
		/*search for elements with a certain atrribute:*/
		file = elmnt.getAttribute("w3-include-html");
		if (file) {
			/* Make an HTTP request using the attribute value as the file name: */
			xhttp = new XMLHttpRequest();
			xhttp.onreadystatechange = function() {
				if (this.readyState == 4) {
					if (this.status == 200) {elmnt.innerHTML = this.responseText;}
					if (this.status == 404) {elmnt.innerHTML = "Page not found.";}
					/* Remove the attribute, and call this function once more: */
					elmnt.removeAttribute("w3-include-html");
					includeHTML();
				}
			}
			if (onPi) file = "/documentation/" + file;
			xhttp.open("GET", file, true);
			xhttp.send();
			/* Exit the function: */
			return;
		}
	}
}
