/*
	Translation library v0.3
*/
(function(root){


	// Get the URL query string and parse it
	function getQuery() {
		var r = {length:0};
		var q = location.search;
		if(q && q != '#'){
			// remove the leading ? and trailing &
			q = q.replace(/^\?/,'').replace(/\&$/,'');
			q.split('&').forEach(function(element){
				var key = element.split('=')[0];
				var val = element.split('=')[1];
				if(/^[0-9.]+$/.test(val)) val = parseFloat(val);	// convert floats
				r[key] = val;
				r['length']++;
			});
		}
		return r;
	};

	function Translator(inp){

		this.q = getQuery();
		this.id = (inp && typeof inp.id==="string") ? inp.id : 'form';
		this.langfile = (inp && typeof inp.languages==="string") ? inp.languages : '';
		this.formfile = (inp && typeof inp.help==="string") ? inp.help : '';
		this.langs = (inp && typeof inp.langs==="object") ? inp.langs : { 'en': {'name':'English'} };
		// Set empty help and phrasebook
		this.form = undefined;
		this.phrasebook = undefined;
		this.logging = true;
		if(inp.callback) this.callback = inp.callback;

		if(this.langfile) this.loadLanguages();
		else{
			for(var l in this.langs){
				if(this.langs[l]['default']) this.langdefault = l;
			}
		}
		this.loadHelp();
		
		return this;
	};
	
	Translator.prototype.loadHelp = function(){
		this.log('loadHelp',this.formfile);
		S(document).ajax(this.formfile,{
			'dataType': 'json',
			'this': this,
			'success': function(d,attr){
				this.form = d;
				this.init();
			},
			'error': function(err,attr){
				this.log('ERROR','Unable to load '+attr.url,err)
			}		
		});
		return this;
	};

	Translator.prototype.loadLanguages = function(){
		this.log('loadLanguages',this.langfile);
		S(document).ajax(this.langfile,{
			'dataType': 'json',
			'this': this,
			'success': function(d,attr){
				this.langs = d;
				for(var l in this.langs){
					if(this.langs[l]['default']) this.langdefault = l;
				}
				this.init();
			},
			'error': function(err,attr){
				this.log('ERROR','Unable to load '+attr.url,err)
			}
		});


		return this;
	};

	Translator.prototype.init = function(){
		this.log('init');
		if(!this.langdefault){
			this.log('ERROR','No default language set. Please make sure '+this.langfile+' has a default language set. Just add a %c"default": true%c','font-weight: bold;color:#0DBC37');
			return this;
		}
		
		// We need both input files (languages and the form) to continue
		if(!this.form || !this.langs) return this;
		
		// Load the master language config file
		this.setLanguage();

		this.lang = this.q.lang;
		if(!this.lang) this.lang = "en";
		
		this.page = S('#'+this.id);

		if(!this.langs[this.lang]){
			this.log('ERROR','The language '+this.lang+' does not appear to exist in the translation file.');
			this.page.html('The language '+this.lang+' does not appear to exist yet.');
			return this;
		}

		html = "<form id=\"langchoice\"><label>Select language (not all are complete):</label><select name=\"lang\">"
		for(var l in this.langs){
			html += '<option name="'+l+'" value="'+l+'"'+(this.lang==l ? " selected" : "")+'>'+sanitize(this.langs[l].name)+'</option>';
		}
		html += "</select> <button id=\"newlang\">Create new language</button></form>";


		if(S('#translate_chooser').length == 0) this.page.prepend('<div id="translate_chooser"></div>');
		if(S('#translation').length == 0) this.page.append('<div id="translation"></div>')
		S('#translate_chooser').html(html).find('#langchoice select').on('change',{me:this},function(e){ e.data.me.setLanguage(e.currentTarget.value); });

		S('#newlang').on('click',{me:this},function(e){
			e.preventDefault();
			var f = S('#translation input, #translation textarea, #translation select');
			for(var i = 0; i < f.length; i++) f[i].value = "";
			e.data.me.update();
		});
		this.setLanguage(this.lang);

		return this;
	};

	Translator.prototype.log = function(){
		if(this.logging || arguments[0]=="ERROR"){
			var args = Array.prototype.slice.call(arguments, 0);
			if(console && typeof console.log==="function"){
				if(arguments[0] == "ERROR") console.log('%cERROR%c %cTranslator%c: '+args[1],'color:white;background-color:#D60303;padding:2px;','','font-weight:bold;','',(args.length > 2 ? args.splice(2):""));
				else if(arguments[0] == "WARNING") console.log('%cWARNING%c %cTranslator%c: '+args[1],'color:white;background-color:#F9BC26;padding:2px;','','font-weight:bold;','',(args.length > 2 ? args.splice(2):""));
				else console.log('%cTranslator%c','font-weight:bold;','',args);
			}
		}
		return this;
	};

	Translator.prototype.setLanguage = function(lang){
		this.log('setLanguage',lang)
		// If a language is provided, set it
		if(lang) this.lang = lang;

		// Load the specified language
		this.loadLanguage(this.lang);

		return this;
	};

	Translator.prototype.loadLanguage = function(lang){
		this.log('loadLanguage',lang);
		if(!lang) lang = this.langdefault;

		// Is the language already loaded?
		if(this.phrasebook && this.phrasebook[lang]){
			this.log('Already loaded '+this.phrasebook[lang].language.name+' ('+lang+')');
			return this.processLanguage(lang);
		}

		// Set the loaded files counter for this language
		this.langs[lang].filesloaded = 0;

		this.log('Loading file '+this.langs[lang].file);
		
		S(document).ajax(this.langs[lang].file,{
			dataType: 'json',
			this: this,
			lang: lang,
			error: function(err,attr){
				// We couldn't find this language so load the English version
				// so there is something to work from.
				this.log('ERROR',"Couldn't load "+attr.lang)
				if(attr.lang != "en") this.loadLanguage('en');
			},
			success: function(data,attr){
				// Increment the loaded file counter
				this.langs[attr.lang].filesloaded++;
				if(!this.phrasebook) this.phrasebook = {};
				if(!this.phrasebook[attr.lang]) this.phrasebook[attr.lang] = data;
				this.processLanguage(attr.lang);
			}
		});

		return this;
	};
	
	Translator.prototype.processLanguage = function(lang){
		this.log('processLanguage',lang);
		
		if(lang){
			var hrefcat = S('a.langlinkcat').attr('href');
			S('a.langlinkcat').attr('href',hrefcat.substring(0,hrefcat.indexOf('?'))+'?lang='+this.phrasebook[lang].language.code);
			S('.langname').html(this.phrasebook[lang].language.name);
		}

		this.rebuildForm();

		return this;
	};

	Translator.prototype.rebuildForm = function(){
		this.log('rebuildForm',this.phrasebook);

		var html = "<form id=\"language\"></form>";

		S('#translation').html(html);
		this.buildForm();
		
		S('#translation input, #translation textarea, #translation select').on('change',{me:this},function(e){
			e.data.me.update();
		});

		this.update();

		return this;
	};

	Translator.prototype.update = function(){
		this.getOutput();
		this.percentComplete();
		var f = S('#translation input, #translation textarea, #translation select');

		var dir = (this.phrasebook && this.phrasebook[this.lang] && this.phrasebook[this.lang].language.alignment) ? this.phrasebook[this.lang].language.alignment=="right" : "";
		if(S('#meta-alignment').length == 1) dir = S('#meta-alignment')[0].value;
		
		dir = (dir=="right" ? "rtl" : "ltr");
		f.attr('dir',dir);
		S('#translation').removeClass('ltr').removeClass('rtl').addClass(dir).attr('dir',dir);
		
		for(var i = 0; i < f.length; i++){
			if(f[i].value && S(f[i]).hasClass('error')) S(f[i]).removeClass('error').removeClass('blank');
			else if(!f[i].value) S(f[i]).addClass('error').addClass('blank');
		}
		return this;
	};

	Translator.prototype.buildField = function(field,attr){
		if(!attr || !attr.key) return "";
		var id,d,p,cl,newk,ldef,inp,key,inpdef;
		key = attr.key;
		inp = "";
		ldef = this.phrasebook[this.langdefault].language.name;
		newk = safeKey(key);
		cl = sanitize((field._highlight ? "highlight" : ""));
		cl = sanitize((this.phrasebook && this.phrasebook[this.lang] && this.phrasebook[this.lang][key] ? cl : "blank error"));
		p = (attr.value || "");
		// Make new lines explicit
		if(p.indexOf("\n")>= 0) p = p.replace("\n","\\n");
		id = (attr.id || newk);
		id = "phrasebook-"+id;
		var inpdef = (attr['default'] || '');
		if(field._type=="textarea"){
			css = (field._height) ? ' style="height:'+field._height+'"' : "";
			inp = '<textarea class="'+cl+'" id="'+id+'" name="'+id+'"'+css+'>'+sanitize(p || (field._usedef ? inpdef : ""))+'</textarea>';
		}else if(field._type=="noedit"){
			inp = '<input type="hidden" id="'+id+'" name="'+id+'" value="'+sanitize(p)+'" />'+sanitize(p);
			inpdef = "";
		}else if(field._type=="select"){
			inp = '<select id="'+id+'" name="'+id+'">';
			for(var o = 0; o < field._options.length ; o++){
				var seldef = (d && field._options[o].value==d[key]) ? ' selected="selected"' : '';
				var sel = (p && field._options[o].value==p) ? ' selected="selected"' : (field._usedef) ? seldef : '';
				inp += '<option value="'+field._options[o].value+'"'+sel+'>'+field._options[o].name+'</option>'
				if(field._options[o].value == inpdef) inpdef = field._options[o].name;
			}
			inp += '</select>';
		}else if(field._type=="string"){
			inp = '<input type="text" class="'+cl+'" id="'+id+'" name="'+id+'" value="'+sanitize(p || (field._usedef ? inpdef : ""))+'" />';
		}
		return this.row((field._title ? field._title : key),field._text,inp,ldef,inpdef);
	}
	
	Translator.prototype.buildForm = function(){

		var d,k,n,css;
		var html = "";
		var newk = "";
		var inp = "";
		var arr = false;
		var ldef = this.phrasebook[this.langdefault].language.name;
		var inpdef = "";
		k = "";
		done = {};
		var el = S('form#language');
		var id,subkey,def;

		// Loop over the help file keys
		for(key in this.form){
			if(typeof this.form[key]==="object"){
				newk = safeKey(key);
				id = key;
				if(this.form[key]._text && this.form[key]._type){
					html += this.buildField(this.form[key],{'key':key,'id':id,'default':this.phrasebook[this.langdefault][key],'value':this.phrasebook[this.lang][key]});
					done[id] = true;
				}else{
				
					// If this section is a title
					if(this.form[key]._title){
						if(this.form[key]._level){
							l = this.form[key]._level;
							html += '<h'+l+'>'+this.form[key]._title+'</h'+l+'>';
						}else{
							html += '<h2>'+this.form[key]._title+'</h2>';
						}
						if(this.form[key]._text){
							html += "	<div class=\"subt\">";
							html += "		<p>"+this.form[key]._text+"</p>";
							html += "	</div>";
						}
					
						//if(n >= 0) html += '<div class="group">';
					}
					if(this.form[key]){
						// Loop over properties processing this
						for(subkey in this.form[key]){
							if(this.form[key][subkey]){
								if(subkey.indexOf('_')!=0 && this.form[key][subkey]._text && this.form[key][subkey]._type){
									id = key+'-'+subkey;
									def = "";
									if(this.phrasebook[this.langdefault] && this.phrasebook[this.langdefault][key] && this.phrasebook[this.langdefault][key][subkey]) def = this.phrasebook[this.langdefault][key][subkey]+'';
									v = "";
									if(this.phrasebook[this.lang] && this.phrasebook[this.lang][key] && this.phrasebook[this.lang][key][subkey]) v = this.phrasebook[this.lang][key][subkey];
									html += this.buildField(JSON.parse(JSON.stringify(this.form[key][subkey])),{'key':subkey+'','id':id,'value':v,'default':def});
									done[id] = true;
								}
							}
						}
					}
				}
			}
		}

		this.misc = {};
		// Loop over the default language keys
		for(key in this.phrasebook){
			if(this.phrasebook[key] && this.phrasebook[key][this.langdefault] && this.phrasebook[key][this.langdefault].value && !done[key]){
				this.misc[key] = true;
			}else{
				this.log('WARNING','Unable to set '+key);
			}
		}

		if(this.misc){
			html += '<h2>Misc options</h2>';
			for(var f in this.misc){
				html += this.buildField({"_title":f,"_text":f,"_type":"string"},{'key':f,'value':this.phrasebook[this.lang][f],'default':this.phrasebook[this.langdefault][f]});
			}
		}

		el.append(html);
		return this;
	};

	Translator.prototype.percentComplete = function(){
		var percent = (100*this.count.done/this.count.total).toFixed(1);
		S('#progressbar .progress-inner').css({'width':percent+'%'});
		return this;
	};

	Translator.prototype.row = function(title,desc,field,ldef,def){
		var id = field.indexOf("id=\"");
		id = field.substr(id+4);
		id = id.substr(0,id.indexOf("\""));

		var html = "	<fieldset>";// id=\"fs"+id+"\">";
		html += "		<legend>"+title+"</legend>";
		html += "		<div class=\"twocol\">";
		html += "			<label for=\""+id+"\">"+desc+"</label>";
		html += "		</div>";
		html += "		<div class=\"fourcol\">";
		html += "			"+field;
		html += "			<div class=\"default\"><strong>"+ldef+" (default):</strong> "+def+"</div>";
		html += "		</div>";
		html += "	</fieldset>";
		return html;
	};

	Translator.prototype.getOutput = function(){
	
		var output = {};
		var i,f,file,k,sk,key,subkey,val,css,out;
		this.count = { 'done': 0,'total': 0 };
		var lang = (S('#phrasebook-language-code')[0].value || this.lang);

		if(S('#output').length == 0) S('#translation').after('<div id="output"></div>');

		output = {'file':this.langs[this.langdefault].file.replace(new RegExp("(^|[^A-Za-z])"+this.langdefault+"([^A-Za-z])"),function(m,p1,p2){ return p1+lang+p2; }),'json':''};
		ojson = JSON.parse(JSON.stringify(this.phrasebook.en));
		k = 0;
		// Loop over every element and add it to an appropriate JSON for each output file
		for(key in this.phrasebook[this.langdefault]){
			if(k > 0) output.json += ',\n';
			if(typeof this.phrasebook[this.langdefault][key]==="string"){
				val = converter(S('#phrasebook-'+key)[0].value || "");
				output.json += '\t"'+key+'": "'+val+'"';
				ojson[key] = (S('#phrasebook-'+key)[0].value || "");
				if(val) this.count.done++;
				this.count.total++;
			}else{
				// Sub keys
				output.json +='\t"'+key+'\": {\n';
				sk = 0;
				for(subkey in this.phrasebook[this.langdefault][key]){
					val = converter(S('#phrasebook-'+key+'-'+subkey)[0].value || "");
					if(sk > 0) output.json += ',\n';
					output.json += '\t\t"'+subkey+'": "'+val+'"';
					ojson[key][subkey] = (S('#phrasebook-'+key+'-'+subkey)[0].value||"").replace(/\\n/g,"\n");
					if(val) this.count.done++;
					this.count.total++;
					sk++;
				}
				output.json += '\n\t}';
			}
			k++;
		}
	
		f = 0;
		S('#output').html('');
		json = '{\n'+output.json+'\n}';
		json = sanitize(json);
			
		css = (json) ? ' style="height:20em;overflow-x:hidden;font-family:monospace;"' : ''
		out = '<textarea onfocus="this.select()"'+css+' wrap="off">'+json+"</textarea>";
		
		if(typeof this.callback.update==="function") this.callback.update.call(this,{'json':ojson,'lang':lang});

		var email;
		this.page.html().replace(/\(([a-zA-Z0-9\.\-]+) AT ([a-zA-Z0-9\.\-]+)\)/,function(m,p1,p2){
			email = p1+'@'+p2;
			return p1;
		});
		etxt = (S('.email a').length == 1) ? S('.email a').html() : S('.email').html();
		lang = S('#phrasebook-language-name')[0].value;
		S('.email').html('<a href="mailto:'+email+'?subject='+this.phrasebook.en.title+': '+lang+' translation&body='+encodeURI('Hi Chris,\n\nHere is an update to the '+lang+' translation.\n\nBest regards,\n\nNAME\n\n\n')+''+encodeURI(json)+'">'+etxt+'</a>')
		S('#output').append(out);
		S('.langfile').attr('href','https://github.com/slowe/VirtualSky/'+(this.langs[lang] ? 'edit':'new')+'/gh-pages/lang/'+output.file).html(output.file);

		return this;
	};

	function safeKey(k){
		return k.replace(/\./g,'-');
	}

	function converter(tstr) {
		if(!tstr) return "";
		var bstr = '';
		for(var i=0; i<tstr.length; i++){
			if(tstr.charCodeAt(i)>127) bstr += '&amp;#' + tstr.charCodeAt(i) + ';';
			else bstr += tstr.charAt(i);
		}
		return bstr;
	}
	
	function sanitize(str){
		if(str && typeof str==="string"){
			str = str.replace(/</g,"&lt;");
			str = str.replace(/>/g,"&gt;");
			str = str.replace(/"/g,"&quot;");
			//str = str.replace(/\\n/g,"\\n");
		}
		return str;
	}

	// Add CommonGround as a global variable
	root.Translator = Translator;

})(window || this); // Self-closing function

