# JVC v2

![github](https://img.shields.io/github/license/andronick83/jquery.json-viewer-callback)

jQuery JSON Viewer With Callback Support (**JVC**)

![Screenshot](demo-screenshot.png)

<hr>

## Demo page:
- [demo.html](https://andronick83.github.io/jquery.json-viewer-callback/demo.html)

<hr>

## Examples:
- Add to \<head\>:
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.4/jquery.min.js"></script>
<link rel=stylesheet href="jvc.min.css"/>
<script src="jvc.min.js"></script>
```

- Add to \<body\>:
```html
<div id=jvc></div>
```

- Simple Object:
```JavaScript
let json = {
	"null": null,
	"true": true,
	"false": false,
	"undefined": undefined,
	"text": "\"text&nbsp;'text'\t`text`<br>\ntext\"",
	"url": "http://example.com/",
	"array": [0, 0.1, 2, [], {}],
	"callback": {
		"§Callback": "https://cdn.jsdelivr.net/gh/herrstrietzel/fonthelpers@main/json/gfontsAPI.json"
	}
}
```

- JVC Calback Event:
```JavaScript
let jvcCb = function(ev){
	// Get JVC and Data:
	let jvc = ev.JVC, data = ev.data;
	// Ajax request:
	$.ajax({url:data, dataType:"json"})
	.done(v=>jvc(v))
	.fail((xhr, status, err)=>{
		jvc(Error("jvc-"+status+' '+(err? err :xhr.status)));
	});
};
```

- JVC Configuration: (expand, showMenu, showQuotes, showCommas, showJSON, showConsole, logger, change, callback, keyPrefix, keyLoop, keyCallback, keysArrGroup, keysNonEnum, keysSymbols, keysProto)
```JavaScript
let conf = {showJSON: true, showConsole: true, callback: jvcCb};
```

- JVC Show Viewer:
```JavaScript
$('#jvc').JVC(json, conf);
```

<hr>

## More examples:
- [demo.html](https://github.com/andronick83/jquery.json-viewer-callback/blob/main/demo.html)

<hr>

## Requirements:
- JS ES2015/ES6:
```
Chrome	>=51	May 2016
Firefox	>=52	Mar 2017
Edge	>=79	Jan 2020
Safari	>=10	Sep 2016
Opera	>=38	Jun 2016
```

<hr>

## About
- Author: [andronick83.mail@gmail.com](mailto:andronick.mail@gmail.com) :shipit:
- License: [MIT License](http://opensource.org/licenses/MIT) :+1:
