/*!
 * stuQuery
 */
(function(root){

	var eventcache = {};

	function stuQuery(els){
		// Make our own fake, tiny, version of jQuery simulating the parts we need
		this.stuquery = "1.0.26";

		this.getBy = function(e,s){
			var i,m,k;
			i = -1;
			var result = [];
			if(s.indexOf(':eq') > 0){
				m = s.replace(/(.*)\:eq\(([0-9]+)\)/,'$1 $2').split(" ");
				s = m[0];
				i = parseInt(m[1]);
			}
			if(s[0] == '.') els = e.getElementsByClassName(s.substr(1));
			else if(s[0] == '#') els = e.getElementById(s.substr(1));
			else els = e.getElementsByTagName(s);
			if(!els) els = [];
			// If it is a select field we don't want to select the options within it
			if(els.nodeName && els.nodeName=="SELECT") result.push(els);
			else{
				if(typeof els.length!=="number") els = [els];
				for(k = 0; k < els.length; k++){ result.push(els[k]); }
				if(i >= 0 && result.length > 0){
					if(i < result.length) result = [result[i]];
					else result = [];
				}
			}
			return result;
		};
		this.matchSelector = function(e,s){
			// Does this one element match the s
			if(s[0] == '.'){
				s = s.substr(1);
				for(var i = 0; i < e.classList.length; i++) if(e.classList[i] == s) return true;
			}else if(s[0] == '#'){
				if(e.id == s.substr(1)) return true;
			}else{
				if(e.tagName == s.toUpperCase()) return true;
			}
			return false;
		};
		if(typeof els==="string") this.e = this.querySelector(document,els);
		else if(typeof els==="object") this.e = (typeof els.length=="number") ? els : [els];
		for(var it in this.e){
			if(this.e[it]) this[it] = this.e[it];
		}
		this.length = (this.e ? this.e.length : 0);

		return this;
	}
	stuQuery.prototype.querySelector = function(els,selector){
		var result = [];
		var a,els2,i,j,k,tmp;
		if(selector.indexOf(':eq') >= 0){
			a = selector.split(' ');
			for(i = 0; i < a.length; i++){
				if(i==0){
					tmp = this.getBy(els,a[i]);
				}else{
					els2 = [];
					for(j = 0; j < tmp.length; j++) els2 = els2.concat(this.getBy(tmp[j],a[i]));
					tmp = els2.splice(0);
				}
			}
		}else tmp = els.querySelectorAll(selector);					// We can use the built-in selector
		for(k = 0; k < tmp.length; k++){ result.push(tmp[k]); }
		return result;
	};
	stuQuery.prototype.ready = function(f){
		if(/in/.test(document.readyState)) setTimeout('S(document).ready('+f+')',9);
		else f();
	};
	stuQuery.prototype.html = function(html){
		// Return HTML or set the HTML
		if(typeof html==="number") html = ''+html;
		if(typeof html!=="string" && this.length == 1) return this[0].innerHTML;
		if(typeof html==="string") for(var i = 0; i < this.length; i++) this[i].innerHTML = html;
		return this;
	};
	stuQuery.prototype.append = function(html){
		if(!html && this.length == 1) return this[0].innerHTML;
		if(html){
			for(var i = 0; i < this.length; i++){
				var d = document.createElement('template');
				d.innerHTML = html;
				var c = (typeof d.content==="undefined" ? d : d.content);
				if(c.childNodes.length > 0) while(c.childNodes.length > 0) this[i].appendChild(c.childNodes[0]);
				else this[i].append(html);
			}
		}
		return this;	
	};
	stuQuery.prototype.prepend = function(t){
		var i,j,d,e;
		if(!t && this.length==1) return this[0].innerHTML;
		for(i = 0 ; i < this.length ; i++){
			d = document.createElement('div');
			d.innerHTML = t;
			e = d.childNodes;
			for(j = e.length-1; j >= 0; j--) this[i].insertBefore(e[j], this[i].firstChild);
		}
		return this;
	};
	stuQuery.prototype.before=function(t){
		var i,d,e,j;
		for(i = 0 ; i < this.length ; i++){
			d = document.createElement('div');
			d.innerHTML = t;
			e = d.childNodes;
			for(j = 0; j < e.length; j++) this[i].parentNode.insertBefore(e[j], this[i]);
		}
		return this;
	};
	stuQuery.prototype.after = function(t){
		for(var i = 0 ; i < this.length ; i++) this[i].insertAdjacentHTML('afterend', t);
		return this;
	};
	function NodeMatch(a,el){
		if(a && a.length > 0){
			for(var i = 0; i < a.length; i++){
				if(a[i].node == el) return {'success':true,'match':i};
			}
		}
		return {'success':false};
	}
	function storeEvents(e,event,fn,fn2,data){
		if(!eventcache[event]) eventcache[event] = [];
		eventcache[event].push({'node':e,'fn':fn,'fn2':fn2,'data':data});
	}
	function getEvent(e){
		if(eventcache[e.type]){
			var m = NodeMatch(eventcache[e.type],e.currentTarget);
			if(m.success){
				if(m.match.data) e.data = eventcache[e.type][m.match].data;
				return {'fn':eventcache[e.type][m.match].fn,'data':e};
			}
		}
		return function(){ return {'fn':''}; };
	}
	stuQuery.prototype.off = function(event){
		// Try to remove an event with attached data and supplied function, fn.

		// If the remove function doesn't exist, we make it
		if(typeof Element.prototype.removeEventListener !== "function"){
			Element.prototype.removeEventListener = function (sEventType, fListener /*, useCapture (will be ignored!) */) {
				if (!oListeners.hasOwnProperty(sEventType)) { return; }
				var oEvtListeners = oListeners[sEventType];
				for (var nElIdx = -1, iElId = 0; iElId < oEvtListeners.aEls.length; iElId++) {
					if (oEvtListeners.aEls[iElId] === this) { nElIdx = iElId; break; }
				}
				if (nElIdx === -1) { return; }
				for (var iLstId = 0, aElListeners = oEvtListeners.aEvts[nElIdx]; iLstId < aElListeners.length; iLstId++) {
					if (aElListeners[iLstId] === fListener) { aElListeners.splice(iLstId, 1); }
				}
			};
		}
		for(var i = 0; i < this.length; i++){
			var m = NodeMatch(eventcache[event],this.e[i]);
			if(m.success){
				this[i].removeEventListener(event,eventcache[event][m.match].fn2,false);
				eventcache[event].splice(m.match,1);
			}
		}
		return this;
	};
	stuQuery.prototype.on = function(event,data,fn){
		// Add events
		var events = (event || window.event).split(/ /);
		if(typeof data==="function" && !fn){
			fn = data;
			data = "";
		}
		if(typeof fn !== "function") return this;

		if(this.length > 0){
			var _obj = this;
			var f;
			for(var ev = 0; ev < events.length; ev++){
				event = events[ev];
				f = function(b){
					var e = getEvent({'currentTarget':this,'type':event,'data':data,'originalEvent':b,'preventDefault':function(){ if(b.preventDefault) b.preventDefault(); },'stopPropagation':function(){
						if(b.stopImmediatePropagation) b.stopImmediatePropagation();
						if(b.stopPropagation) b.stopPropagation();
						if(b.cancelBubble!=null) b.cancelBubble = true;
					}});
					if(typeof e.fn === "function") return e.fn.call(_obj,e.data);
				};
				for(var i = 0; i < this.length; i++){
					storeEvents(this[i],event,fn,f,data);
					if(this[i].addEventListener) this[i].addEventListener(event, f, false); 
					else if(this[i].attachEvent) this[i].attachEvent(event, f);
				}
			}
		}
		return this;
	};
	stuQuery.prototype.trigger = function(e,orig){
		var event; // The custom event that will be created
		var events = e.split(/ /);

		for(var ev = 0; ev < events.length; ev++){
			if(document.createEvent) {
				event = document.createEvent("HTMLEvents");
				event.initEvent((orig||events[ev]), true, true);
			}else{
				event = document.createEventObject();
				event.eventType = (orig||events[ev]);
			}
			event.eventName = e;

			for(var i = 0 ;  i < this.length ; i++){
				if(document.createEvent) this[i].dispatchEvent(event);
				else this[i].fireEvent("on" + event.eventType, event);
			}
		}

		return this;
	};
	stuQuery.prototype.focus = function(){
		// If there is only one element, we trigger the focus event
		if(this.length == 1) this[0].focus();
		return this;
	};
	stuQuery.prototype.blur = function(){
		// If there is only one element, we trigger the blur event
		if(this.length == 1) this[0].blur();
		return this;
	};
	stuQuery.prototype.remove = function(){
		// Remove DOM elements
		if(this.length < 1) return this;
		for(var i = this.length-1; i >= 0; i--){
			if(!this[i]) return;
			if(typeof this[i].remove==="function") this[i].remove();
			else if(typeof this[i].parentElement.removeChild==="function") this[i].parentElement.removeChild(this[i]);
		}
		return this;
	};
	stuQuery.prototype.hasClass = function(cls){
		// Check if a DOM element has the specified class
		var result = true;
		for(var i = 0; i < this.length; i++){
			if(!this[i].className.match(new RegExp("(\\s|^)" + cls + "(\\s|$)"))) result = false;
		}
		return result;
	};
	stuQuery.prototype.toggleClass = function(cls){
		// Toggle a class on a DOM element
		for(var i = 0; i < this.length; i++){
			if(this[i].className.match(new RegExp("(\\s|^)" + cls + "(\\s|$)"))) this[i].className = this[i].className.replace(new RegExp("(\\s|^)" + cls + "(\\s|$)", "g")," ").replace(/ $/,'');
			else this[i].className = (this[i].className+' '+cls).replace(/^ /,'');
		}
		return this;
	};
	stuQuery.prototype.addClass = function(cls){
		// Add a class on a DOM element
		for(var i = 0; i < this.length; i++){
			if(!this[i].className.match(new RegExp("(\\s|^)" + cls + "(\\s|$)"))) this[i].className = (this[i].className+' '+cls).replace(/^ /,'');
		}
		return this;
	};
	stuQuery.prototype.removeClass = function(cls){
		// Remove a class on a DOM element
		for(var i = 0; i < this.length; i++){
			while(this[i].className.match(new RegExp("(\\s|^)" + cls + "(\\s|$)"))) this[i].className = this[i].className.replace(new RegExp("(\\s|^)" + cls + "(\\s|$)", "g")," ").replace(/ $/,'').replace(/^ /,'');
		}
		return this;
	};
	stuQuery.prototype.css = function(css){
		var styles,i,key;
		if(this.length==1 && typeof css==="string"){
			styles = window.getComputedStyle(this[0]);
			return styles[css];
		}
		for(i = 0; i < this.length; i++){
			// Read the currently set style
			styles = {};
			var style = this[i].getAttribute('style');
			if(style){
				var bits = this[i].getAttribute('style').split(";");
				for(var b = 0; b < bits.length; b++){
					var pairs = bits[b].split(":");
					if(pairs.length==2) styles[pairs[0]] = pairs[1];
				}
			}
			if(typeof css==="object"){
				// Add the user-provided style to what was there
				for(key in css){
					if(typeof css[key]!=="undefined") styles[key] = css[key];
				}
				// Build the CSS string
				var newstyle = '';
				for(key in styles){
					if(typeof styles[key]!=="undefined"){
						if(newstyle) newstyle += ';';
						if(styles[key]) newstyle += key+':'+styles[key];
					}
				}
				// Update style
				this[i].setAttribute('style',newstyle);
			}
		}
		return this;
	};
	stuQuery.prototype.parent = function(){
		var tmp = [];
		for(var i = 0; i < this.length; i++) tmp.push(this[i].parentElement);
		return S(tmp);
	};
	stuQuery.prototype.children = function(c){
		var i;
		// Only look one level down
		if(typeof c==="string"){
			// We are using a selector
			var result = [];
			for(i = 0; i < this.length; i++){
				for(var ch = 0; ch < this[i].children.length; ch++){
					if(this.matchSelector(this[i].children[ch],c)) result.push(this[i].children[ch]);
				}
			}
			return S(result);
		}else{
			// We are using an index
			for(i = 0; i < this.length; i++) this[i] = (this[i].children.length > c ? this[i].children[c] : this[i]);
			return this;
		}
	};
	stuQuery.prototype.find = function(selector){
		var result = [];
		for(var i = 0; i < this.length; i++) result = result.concat(this.querySelector(this[i],selector));
		// Return a new instance of stuQuery
		return S(result);
	};
	function getset(s,attr,val,typs){
		var tmp = [];
		for(var i = 0; i < s.length; i++){
			tmp.push(s[i].getAttribute(attr));
			var ok = false;
			for(var j in typs){ if(typeof val===typs[j]) ok = true; }
			if(ok){
				if(val) s[i].setAttribute(attr,val);
				else s[i].removeAttribute(attr);
			}
		}
		if(tmp.length==1) tmp = tmp[0];
		if(typeof val==="undefined") return tmp;
		else return s;
	}
	stuQuery.prototype.attr = function(attr,val){
		return getset(this,attr,val,["string","number"]);
	};
	stuQuery.prototype.prop = function(attr,val){
		return getset(this,attr,val,["boolean"]);
	};
	stuQuery.prototype.clone = function(){
		var span = document.createElement('div');
		span.appendChild(this[0].cloneNode(true));
		return span.innerHTML;
	};
	stuQuery.prototype.replaceWith = function(html){
		var tempDiv;
		var clone = S(this.e);
		for(var i = 0; i < this.length; i++){
			tempDiv = document.createElement('div');
			tempDiv.innerHTML = html;
			clone[i] = tempDiv.cloneNode(true);
			this[i].parentNode.replaceChild(clone[i], this[i]);
		}
		return clone;
	};
	stuQuery.prototype.width = function(){
		if(this.length > 1) return;
		return this[0].offsetWidth;
	};
	stuQuery.prototype.height = function(){
		if(this.length > 1) return;
		return this[0].offsetHeight;
	};
	stuQuery.prototype.outerWidth = function(){
		if(this.length > 1) return;
		var s = getComputedStyle(this[0]);
		return this[0].offsetWidth + parseInt(s.marginLeft) + parseInt(s.marginRight);
	};
	stuQuery.prototype.outerHeight = function(){
		if(this.length > 1) return;
		var s = getComputedStyle(this[0]);
		return this[0].offsetHeight + parseInt(s.marginTop) + parseInt(s.marginBottom);
	};
	stuQuery.prototype.offset = function(){
		var rect = this[0].getBoundingClientRect();
	
		return {
		  top: rect.top + document.body.scrollTop,
		  left: rect.left + document.body.scrollLeft
		};
	};
	stuQuery.prototype.position = function(){
		if(this.length > 1) return;
		return {left: this[0].offsetLeft, top: this[0].offsetTop};
	};
	stuQuery.prototype.ajax = function(url,attrs){
		//=========================================================
		// ajax(url,{'complete':function,'error':function,'dataType':'json'})
		// complete: function - a function executed on completion
		// error: function - a function executed on an error
		// cache: break the cache
		// dataType: json - will convert the text to JSON
		//           jsonp - will add a callback function and convert the results to JSON

		if(typeof url!=="string") return false;
		if(!attrs) attrs = {};
		var cb = "",qs = "";
		var oReq,urlbits;
		// If part of the URL is query string we split that first
		if(url.indexOf("?") > 0){
			urlbits = url.split("?");
			if(urlbits.length){
				url = urlbits[0];
				qs = urlbits[1];
			}
		}
		if(attrs.dataType=="jsonp"){
			cb = 'fn_'+(new Date()).getTime();
			window[cb] = function(rsp){
				if(typeof attrs.success==="function") attrs.success.call((attrs['this'] ? attrs['this'] : this), rsp, attrs);
			};
		}
		if(typeof attrs.cache==="boolean" && !attrs.cache) qs += (qs ? '&':'')+(new Date()).valueOf();
		if(cb) qs += (qs ? '&':'')+'callback='+cb;
		if(attrs.data) qs += (qs ? '&':'')+attrs.data;

		// Build the URL to query
		if(attrs.method=="POST") attrs.url = url;
		else attrs.url = url+(qs ? '?'+qs:'');

		if(attrs.dataType=="jsonp"){
			var script = document.createElement('script');
			script.src = attrs.url;
			document.body.appendChild(script);
			return this;
		}

		// code for IE7+/Firefox/Chrome/Opera/Safari or for IE6/IE5
		oReq = (window.XMLHttpRequest) ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP");
		oReq.addEventListener("load", window[cb] || complete);
		oReq.addEventListener("error", error);
		oReq.addEventListener("progress", progress);
		var responseTypeAware = 'responseType' in oReq;
		if(attrs.beforeSend) oReq = attrs.beforeSend.call((attrs['this'] ? attrs['this'] : this), oReq, attrs);

		function complete(evt) {
			attrs.header = oReq.getAllResponseHeaders();
			var rsp;
			if(oReq.status == 200 || oReq.status == 201 || oReq.status == 202) {
				rsp = oReq.response;
				if(oReq.responseType=="" || oReq.responseType=="text") rsp = oReq.responseText;
				if(attrs.dataType=="json"){
					try {
						if(typeof rsp==="string") rsp = JSON.parse(rsp.replace(/[\n\r]/g,"\\n").replace(/^([^\(]+)\((.*)\)([^\)]*)$/,function(e,a,b,c){ return (a==cb) ? b:''; }).replace(/\\n/g,"\n"));
					} catch(e){ error(e); }
				}

				// Parse out content in the appropriate callback
				if(attrs.dataType=="script"){
					var fileref=document.createElement('script');
					fileref.setAttribute("type","text/javascript");
					fileref.innerHTML = rsp;
					document.head.appendChild(fileref);
				}
				attrs.statusText = 'success';
				if(typeof attrs.success==="function") attrs.success.call((attrs['this'] ? attrs['this'] : this), rsp, attrs);
			}else{
				attrs.statusText = 'error';
				error(evt);
			}
			if(typeof attrs.complete==="function") attrs.complete.call((attrs['this'] ? attrs['this'] : this), rsp, attrs);
		}

		function error(evt){
			if(typeof attrs.error==="function") attrs.error.call((attrs['this'] ? attrs['this'] : this),evt,attrs);
		}

		function progress(evt){
			if(typeof attrs.progress==="function") attrs.progress.call((attrs['this'] ? attrs['this'] : this),evt,attrs);
		}

		// ECC: "script" gives warning message
		if(responseTypeAware && attrs.dataType && attrs.dataType !== "script"){
			try { oReq.responseType = attrs.dataType; }
			catch(err){ error(err); }
		}

		try{ oReq.open((attrs.method||'GET'), attrs.url, true); }
		catch(err){ error(err); }

		if(attrs.method=="POST") oReq.setRequestHeader('Content-type','application/x-www-form-urlencoded');

		try{ oReq.send((attrs.method=="POST" ? qs : null)); }
		catch(err){ error(err); }

		return this;
	};
	stuQuery.prototype.loadJSON = function(url,fn,attrs){
		if(!attrs) attrs = {};
		attrs.dataType = "json";
		attrs.complete = fn;
		this.ajax(url,attrs);
		return this;
	};

	root.stuQuery = stuQuery;
	root.S = function(e){ return new stuQuery(e); };

})(window || this);
