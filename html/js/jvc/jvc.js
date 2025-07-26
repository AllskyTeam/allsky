/*!
 * jQuery JSON Viewer With Callback Support (JVC) v2.0.0
 * @Link: https://github.com/andronick83/jquery.json-viewer-callback
 * @License: Released under the MIT license
 * @Author: andronick83 <andronick.mail@gmail.com>
 */

"use strict";

((W,n)=>{
	const	J=W.JVC||{},M=J.M||new Map(),$=jQuery,D=document,DR=D.documentElement,DH=D.head,DB=D.body,O=Object,A=Array,R=Reflect,
		[_exp,_sMenu,_sCommas,_sQuotes,_sJSON,_sCons,_log,_cb,_phCb,_ch,_load,_dbg,_err,_kPref,_kLoop,_kCb,_kNonEn,_kGroup,_kSym,
		_kProto,_pre,_suf,_cls,_cons,_proto,_str,_obj,_arr,_symb,_Arr,_Obj,_Func,_Symb,_Node,_dom,_hljs,_jvc,_jItem,_jPart,
		_jLstPart,_jTog,_jCol,_jExp,_jLine,_jVal,_jLst,_jDef,_jStyle,_jFail,_jRef,_jNode,_jHl]=
		('expand,showMenu,showCommas,showQuotes,showJSON,showConsole,logger,callback,phCb,change,loading,debug,error,keyPrefix,'+
		'keyLoop,keyCallback,keysNonEnum,keysArrGroup,keysSymbols,keysProto,prefix,suffix,classList,constructor,prototype,string,'+
		'object,array,symbol,Array,Object,Function,Symbol,Node,dom,hljs-'+(',,item,item-part,list-part,toggle,collapsed,expand,'+
		'line,value,list,default,style,fail,item-ref,node,hl').replace(/,/g,',jvc-')).split(','),
	// Srt/Arr/Obj/Node
		pA=A[_proto],pO=O[_proto],isNum=s=>/^\d+$/.test(s),sStr=JSON.stringify,sProp=p=>sStr(tOf(p,_symb)?oStr(p,_Symb):p).slice(1,-1),
		iOf=(o,c)=>(o instanceof c),tOf=(o,t)=>(typeof(o)==t),oIsEnum=(o,p)=>pO.propertyIsEnumerable.call(o,p),
		isUrl=s=>{try{let u=new URL(s);return u.protocol=="http:"||u.protocol=="https:"}catch(_){return!1}},aFrom=o=>[...o],
		aFor=(a,c)=>{for(let e of a)c(e)},aJoin=(o,c='')=>aFrom(o).join(c),oFor=(o,c)=>{for(let k in o)c(k)},
		oStr=(o,t)=>(t==_Symb?o.description:t=='Date'?o.toJSON():(W[t]&&W[t][_proto]||pO).toString.call(o)),oHas=R.has,
		oType=o=>(o&&o[_cons]?o[_cons].name:pO.toString.call(o).replace(/^\[object (.*)\]$/,'$1')),oProto=R.getPrototypeOf,
		oProps=O.defineProperties,oCopy=(c,d={})=>{let r=O.assign({},d,c);aFor(kGet(c),k=>{
			if(oType(c[k])==_Obj&&oHas(d,k)){if(oType(d[k])==_Obj)r[k]=oCopy(c[k],d[k]);else r[k]=d[k]}});return r},
		oPrChain=o=>{var l=new Set();while(o&&o!==pO&&o!==pA){l.add(oType(o));o=oProto(o)}return aJoin(l,':')},
		fNative=o=>/{\s*\[native code\]\s*}$/.test(tOf(o,_str)?o:oStr(o,_Func)),ePrev=e=>e.preventDefault(),
		//
		N=HTMLElement,pN=N[_proto],nArr=l=>(iOf(l,A)||iOf(l,NodeList)?l:[l]),nCh=e=>e.childNodes,nParent=e=>e.parentNode,
		nApp=(pN.append?(e,l)=>e.append(...nArr(l)):(e,l)=>aFor(nArr(l),n=>e.appendChild(nFrom(n)))),
		nPre=(pN.prepend?(e,n)=>e.prepend(n):(e,n)=>e.insertBefore(n,e.firstChild)),nEv=(n,e,c)=>n.addEventListener(e,c),
		nAft=(pN.after?(e,n)=>e.after(n):(e,n)=>{nParent(e).insertBefore(n,e.nextSibling)}),nRem=e=>e.remove(),
		nRepl=(pN.replaceWith?(e,r)=>e.replaceWith(r):(e,r)=>nParent(e).replaceChild(r,e)),nClos=(e,s)=>e.closest('.'+s),
		nClsAll=(c,e=D)=>e.querySelectorAll('.'+c),nClsOne=(c,e=D)=>e.querySelector('.'+c),nClsHas=(e,c)=>e[_cls].contains(c),
		nClsAdd=(e,c)=>e[_cls].add(...(tOf(c,_str)?[c]:c)),nClsRem=(e,c)=>e[_cls].remove(c),nText=(n,t)=>n.innerText=t,
		nHl=function(l){nUnHl();aFor(nArr(l),n=>nClsAdd(n,_jHl))},nUnHl=_=>{nHlClr();aFor(nClsAll(_jHl),n=>nClsRem(n,_jHl))},
		nHlClr=_=>{if(nHl.tmr)clearTimeout(nHl.tmr);nHl.tmr=!1},nUnHlTmr=_=>{nHlClr();nHl.tmr=setTimeout(nUnHl,1000)},
		nAttr=(n,o)=>{oFor(o,k=>n.setAttribute(k,o[k]))},nFrom=(t='')=>(tOf(t,_str)?D.createTextNode(t):t),
		nNode=(p,c=0,a=0,l=0)=>{let n=(tOf(p,_str)?D.createElement(p):p.cloneNode(!0));if(c)nClsAdd(n,c);if(a)nAttr(n,a);
			if(l)nApp(n,l);return n},nData=(d,n,v=null)=>{let o='JVC';if(!oHas(d,o))d[o]={};return(v===null?d[o][n]:(d[o][n]=v))},
		//
		oPars=(o,c)=>{let v,s,t=oType(o),k,p=c[_kPref];
			// native replacers:
			if(t=='Null'||t=='Boolean'||t=='Undefined'){
						s='keyword';	v=(t=='Undefined'?sStr(o+''):o+'')}
			else if(t=='String'){	s=_str;		v=(isUrl(o)?nNode(nLink,0,{href:o},sStr(o)):sStr(o))}
			else if(t=='Number'||t=='BigInt'||oType(o.toExponential)==_Func||o.isLosslessNumber){
						s='number';	v=(isFinite(o)?o.toString():sStr(o.toString()))}
			if(s)		return[v,s];
			if(t=='Date'||t=='RegExp')
					return[sStr(oStr(o,t)),_str,t];
			if(iOf(o,Error))return[sStr(oStr(o,'Error')),_str,t];
			//
			k=kGet(o,c,!0);
			// iterators:
			try{if(R.has(o,W[_Symb].iterator)&&!(iOf(o,A))){
				if(!oHas(o,0))			v=aFrom(o);
					return[v,_obj,t+'-'+p+'Iterator',k]}}catch(_){}
			// native check props:
			if(kNatives.has(o[_cons])){
				     if(t==_Obj)s=_obj;
				else if(t==_Arr){
						s=_arr;		k.delete('length');k.clr();
					if(k.size!=k.cnt().num){
						s=_obj;		t+='-'+p+_Obj}}
				else if(t=='Set'||t=='Map'||t=='WeakSet'||t=='WeakMap'){
					if(k.size!=k.cnt().num){
						s=_obj;		t+='-'+p+_Obj}
					else{	s=_obj}}
				else if(t=='WeakRef'){
						s=_obj;		v={Deref:o.deref()}}
				else if(t==_Func){}
				// Promise: -
				else if(k.size){s=_obj;		t+='-'+p+_Obj}
				if(s)	return[v,s,t,k]};
			// replacers:
			if(t==_Func){		s=_str;		v=oStr(o,t).replace(/\s\s+/g,' ').trim();let n=fNative(v);
				if(n)				t+='-'+p+'Native';
				else if(v.startsWith('class')){	t+='-'+p+'Class'}
				if(o[_proto]||n)		v=v.replace(/^function\s*/,'')
								.replace(/\s*{[\s\S]*\}$/,(n?'{[native]}':'{…}')).trim();
				else{				v=v.replace(/\s*=>.*$/,'=>(…)')}
				if(k.size){	t+='-'+p+_Obj;
						s=_obj;		v={[_Func]:'ƒ '+v}}}
			else if(iOf(o,Node)){	s=_obj;		t+='-'+p+_Node;
				try{				v=o.nodeName.toLowerCase()+(o.id?' #'+o.id:'');
					if(oHas(o,_cls)&&o[_cls].length)
								v+=' .'+aJoin(o[_cls],' .');
								v={[_Node]:v};
					if(oHas(o,'data'))	v.Data=o.data;
					let ch=nCh(o);ch.length&&(v.Childs=ch);
				}catch(_){if(v&&tOf(v,_str))	v={[_Node]:v}}}
			if(!s)			s=(tOf(v,_str)?_str:_obj);
					return(tOf(v,_str)?[sStr(v),s,t]:[v,s,t,k])},
	// Keys // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Enumerability_and_ownership_of_properties
		kClr=function(k=!1){if(!k)k=this;let s=k._s;s.all=s.num=s.str=s.sym=0;return k},
		kCnt=function(k=!1){if(!k)k=this;if(k._s.all==k.size)return k._s;let s=k.clr()._s;s.all=k.size;aFor(k,p=>{
			s[(tOf(p,_str)?(isNum(p)?'num':'str'):'sym')]++});return s},
		kNew=(a=null)=>{let k=(iOf(a,Set)?a:new Set(a));k._s={};k.clr=kClr.bind(k);k.cnt=kCnt.bind(k);return k.clr()},
		kSkip=(k,s)=>{let _k=k.size,_s=s.size;if(_k&&_s){_s<=_k&&aFor(s,p=>k.delete(p))||aFor(k,p=>(s.has(p)?k.delete(p):!1));k.clr()}},
		kSkipPr=(k,o)=>{let l,p=oProto(o);while(p){let c=p[_cons];if(c&&fNative(c)){let l=kProtos.get(c);
			if(!l){l=kGet(c[_proto]);kProtos.set(c,l)}if(l){kSkip(k,l);break}}p=oProto(p)}
			/*func*/if(k.has(_proto)&&o[_proto][_cons]===o)k.delete(_proto)},
		kAdd=(o,k,c=!1)=>{aFor(R.ownKeys(o),p=>{if(!c||((c[_kSym]||tOf(p,_str))&&(c[_kNonEn]||oIsEnum(o,p))))k.add(p)});k.clr()},
		kGet=(o,c=!1,s=!1,own=!0)=>{let k=kNew();while(own||!kTops.has(o)){kAdd(o,k,c);if(own)break;o=oProto(o)}
			s===!0&&kSkipPr(k,o)||s&&kSkip(k,s);return k},
		kProtos=new Map(),kTops=new Set([null]),kNatives=new Set([undefined]);
		aFor([_Obj,_Arr,_Func].concat('Set,Map,WeakSet,WeakMap,WeakRef,Promise'.split(',')),o=>{
			kProtos.set(W[o],kGet(W[o][_proto]));kTops.add(W[o][_proto]);kNatives.add(W[o])});
	// JVC DOM
	const	nDiv=nNode('div'),nSpan=nNode('span'),nLabel=nNode('label'),nCheck=nNode('input',0,{type:'checkbox'}),
		nLink=nNode('a',_hljs+'link',{target:'_blank'}),nList=nNode(nSpan,_jLst),nRoot=nNode(nList,[_jvc+'root',_jvc+'scroll']),
		nItem=nNode(nDiv,_jItem),nQuote=nNode(nSpan,_jvc+'quote',0,'"'),tQuote=nFrom('"'),nProp=nNode(nSpan,_hljs+'attr'),
		nValue=nNode(nSpan,_jVal),nType=nNode(nSpan,_hljs+'type'),nPunct=nNode(nSpan,_hljs+'punctuation'),
		nColon=nNode(nPunct,_jvc+'colon',0,':'),nComma=nNode(nPunct,_jvc+'comma',0,','),
		nComm=nNode(nSpan,_hljs+'comment'),nPref=nNode(nSpan,[_jvc+_pre,_jLine]),nSuff=nNode(nSpan,[_jvc+_suf,_jLine]),
		nPart=nNode(nSpan,[_jPart,_jTog,_jCol]),nPartList=nNode(nDiv,_jLstPart),nLogs=nNode(nComm,_jvc+'logs'),
		nDom=nNode(nItem,0,0,[nNode(nPref,0,0,[nProp,nColon,nValue,nPunct]),nNode(nSuff,0,0,[nNode(nPunct),nComma])]),
		//
		dGet=(e,c=_jItem)=>nData(nClos(e,c),_dom),dBr=(d,b)=>{nText(d.brF,b[0]);nText(d.brL,b[1])},
		dPh=(d,h,pre=!1)=>nApp(d[pre?_pre:_suf],nNode(nComm,0,{'data-ph':' '+h+(pre?' ':'')})),
		dVal=d=>{var p=d.pars,s=p.cls;nApp(d.prop,p.val);if(s&&s!=_obj&&s!=_arr)nClsAdd(d.prop,_hljs+s);nRem(d.brF);nRem(d.brL)},
		dObj=(d,c)=>{let p=d.pars;dBr(d,(p.cls==_arr?['[',']']:['{','}']));nRem(d.prop);
			if(p.k.size||p.val||(p.cls==_obj&&p.kp.size)){nClsAdd(d.root,_jTog);
			if(!d.exp){if(c[_exp]&&c[_exp]>d.lev)d.exp=!0;nClsAdd(d.root,_jCol);nClsRem(d.root,_jExp)}
			if(oHas(d.val,c[_kCb])){nClsAdd(d.root,[_jCol,_jvc+_cb]);nClsRem(d.root,_jExp)}else if(d.exp)dExp(d,c,!1)}},
		dPars=(d,c)=>{let o=d.val,p=d.pars={};
			if(iOf(o,O)){if(c.map.has(o)){p.val=sStr(c.map.get(o).path);p.cls=_str;
				dPh(d,'['+c[_kLoop]+':'+oType(o)+']');nClsAdd(d.root,_jRef);dVal(d);return d}c.map.set(o,d)}
			let [v,s,t,k]=oPars(o,c),_o=(s==_obj||s==_arr),h=[];[p.val,p.cls,p.type,p.k]=[v,s,t,k];
			if(_o){	let ks=k.size,vs=(v?O.keys(v).length:0);
				if(c[_kProto]){p.kp=kGet(oProto(o),c,k,!1);if(p.kp.size)p.chain=oPrChain(o)}
				if(ks+vs)h.push(ks+vs+(ks+vs==1?' item':' items'));
				if(k.has(c[_kCb]))h.push('['+c[_kCb]+']')}
			if(t){	if(t!=_Obj&&t!=_Arr)h.push('['+p.type+']');
				if(t.endsWith(c[_kPref]+'Native'))nClsAdd(d.root,_jvc+'native')}
			if(iOf(o,N))nClsAdd(d.root,_jNode);else if(iOf(o,Error))nClsAdd(d.root,_jFail);
			if(h.length)dPh(d,h.join(' '),_o);if(_o)dObj(d,c);else dVal(d);return d},
		//
		dPart=(d,h,v,k)=>{let r=nNode(nPart,0,0,nNode(nPref,0,0,nNode(nComm,0,{'data-ph':h})));
			return nData(r,_dom,{lev:d.lev,path:d.path,root:r,val:d.val,pars:oCopy({val:v,k:k},d.pars)})},
		dItem=(k,l,t,v,c,x=!1)=>{let d={val:v,key:k,lev:l,path:t,exp:x},_pr='property';d.root=nNode(nDom);nData(d.root,_dom,d);
			[d[_pre],d[_suf]]=nCh(d.root);[d[_pr],d.colon,d.prop,d.brF]=nCh(d[_pre]);[d.brL,d.comma]=nCh(d[_suf]);
			if(k===!1){nRem(d.colon);nRem(d[_pr])}else{nText(d[_pr],sProp(k));nPre(d[_pr],nNode(nQuote));nApp(d[_pr],nNode(nQuote))}
			return dPars(d,c)},
		dProps=(o,k,p,l,path,lev,c,pr=!1)=>{aFor(k,_p=>{let v;try{v=o[_p]}catch(_){v=_}
			let n=dItem((p.cls==_obj?(pr?pr+_p:_p):!1),lev,path+'['+sProp(_p)+']',v,c);
			if(pr===!1&&!oIsEnum(o,_p))nClsAdd(n.root,_jvc+'nonenum');l.push(n.root)})},
		dExp=(d,c,e=!0)=>{let p=d.pars,ko=p.k,s=ko.size,l=[],pr=c[_kPref],dp;
			if(nClsHas(d.root,_jPart)){dp=d;d=dGet(d.root)}else dBr(d,(p.cls==_arr?['[',']']:['{','}']));
			if(p.cls==_arr&&s>100&&c[_kGroup]){var g=100;
				for(let i=0;i<s;i+=g){let st=i,sp=i+g-1;if(sp>=s)sp=s-1;//arr-part
					let _k=kNew(aFrom(ko).slice(st,sp+1)),ph='['+st+' … '+sp+']';
					l.push(dPart(d,ph,p.val,_k).root)}}
			else{	if(!dp&&p.val)dProps(p.val,kGet(p.val,!1,!0),p,l,d.path,d.lev+1,c,pr);
				dProps(d.val,ko,p,l,d.path,d.lev+1,c);
				if(!dp&&c[_kProto]&&p.cls==_obj&&p.kp.size){//obj-proto
					let ph=pr+'Proto: '+p.kp.size+(p.kp.size==1?' item':' items')+(p.chain?' ['+p.chain+']':'');
					l.push(dPart(d,ph,d.val,p.kp).root)}}
			if(dp){if(l.length)nAft(dp.root,(dp.list=nNode(nPartList,0,0,l)))}
			else{if(!d.list){d.list=nNode(nList);nAft(d[_pre],d.list)}nApp(d.list,l)}
			nClsAdd(dp?dp.root:d.root,_jExp);nClsRem(dp?dp.root:d.root,_jCol);if(e)jChange(nClos(d.root,'jvc'),c)},
		dTog=(d,c)=>{if(!nClsHas(d.root,_jCol)){
				aFor(nClsAll(_jItem,d.list),n=>{let d=nData(n,_dom),v=c.map.get(d.val);if(v===d)c.map.delete(d.val)});
				nClsAdd(d.root,_jCol);nClsRem(d.root,_jExp);nRem(d.list);d.list=!1;
				if(nClsHas(d.root,_jPart)){d=dGet(nClos(d.root,_jItem))}jChange(nClos(d.root,'jvc'),c)}
			else if(!oHas(d.val,c[_kCb]))dExp(d,c);
				else{nClsAdd(d.root,_jvc+_load);c[_cb]&&c[_cb]($.Event(_jvc+_cb,{JVC:o=>jCallb(d,o,c),data:d.val[c[_kCb]]}))}},
	//
	// JVC Getters/Setters/Events
		jProp=(n,v=null)=>(v===null?DR.style.getPropertyValue('--'+_jvc+n):DR.style.setProperty('--'+_jvc+n,v)),
		jTabS=(sp=4)=>{jProp('tab-size',sp);jProp('char-width',(parseFloat(jProp('tab-width'))/sp))+'px'},
		jTabW=(px=33.6)=>{jProp('tab-width',px+'px');jProp('char-width',(px/jProp('tab-size'))+'px')},
		jLineH=(px=18)=>jProp('line-height',Math.ceil(px/2)*2+'px'),
		jFontN=(n=!1)=>jProp('font-family',(!n||n==_jDef?'"Source Code Pro",monospace':n)),jFontS=(px=14)=>jProp('font-size',px+'px'),
		jCss=('.hljs{background-c:#293134;c:#e0e2e4},punctuation{c:#e8e2b7},attr{c:#678cb1},number{c:#ffcd22},'+
			'keyword{c:#93c763;font-style:normal},type{c:#93c76380},link{c:#ec7600},string{c:#ec7600},'+
			'title{c:#dcdcaa;font-style:normal},comment{c:#818e96}').replace(/,/g,'.'+_hljs).replace(/c:/g,'color:'),
		jStyle=(n=_jDef)=>{aFor(nClsAll(_jStyle),n=>nClsAdd(n,_jStyle+'-old'));
			let del=_=>{let old=nClsAll(_jStyle+'-old');aFor(old,nRem)},add=(d='')=>{nApp(DH,nNode('style',_jStyle,0,d));del()};
			if(!n||n=='no-style')add();else if(n==_jDef)add(jCss);
			else{let u=(isUrl(n)?n:'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/'+n+'.min.css'),
				l=nNode('link',_jStyle,{rel:'stylesheet',href:u});l.onload=del;nApp(DH,l)}},
		jJSON=j=>nClsOne(_jvc+'root',j?(iOf(j,N)?j:j.get(0)):nClsOne('jvc')).innerText,
		jReady=c=>(D.readyState===_load?nEv(D,'DOMContentLoaded',_=>c(J)):c(J)),
		jChange=(j,c)=>{if(c[_sJSON]||c[_ch]){let s=nClsOne(_jvc+'root',j).innerText;
			if(c[_sJSON]){let l=nClsOne(_jvc+'json',j);l.innerHTML='';nApp(l,s+"\n");
				try{JSON.parse(s)}catch(e){c[_log][_err]('FAIL',s,e);nApp(l,'// FAIL: '+e+"\n")}}
			if(c[_ch]){c[_ch]($.Event(_jvc+_ch,{JVC:{doc:j,json:s}}))}}},
		jAjax=e=>{let c=e.JVC,d=e.data;$.ajax(d).done(v=>c(v)).fail((x,s,r)=>c(Error(_jvc+s+' '+(r?r:x.status))))},
		jCallb=(d,v,c)=>{c[_log][_dbg](_jvc+_cb,v);let p=d.pars;p.val=p.val||{};p.val.Response=v;nClsRem(d.root,_jvc+_load);dExp(d,c)},
	// JVC Conf
		jConf={	[_exp]:		2,	[_sMenu]:	!0,	[_sQuotes]:	!1,
			[_sCommas]:	!0,	[_sJSON]:	!1,	[_sCons]:	!1,
			[_log]:		console,[_ch]:		!1,	[_cb]:		jAjax,	
			[_kPref]:	'§',	[_kLoop]:	'§Loop',[_kCb]:		'§Callback',
			[_kGroup]:	!0,	[_kNonEn]:	!0,	[_kSym]:	!0,	[_kProto]:	!0},
	// JVC Root Nodes
		jOpts=(j,o,c)=>oFor(o,p=>(c[p]?nClsRem(j,_jvc+'no-'+o[p]):nClsAdd(j,_jvc+'no-'+o[p]))),
		jLogs=j=>{let n=nNode(nSpan,_jvc+'json');nApp(j,nNode(nLogs,0,0,['// JSON: ',n]));
			$(n).on('click',function(){let r=D.createRange();r.selectNodeContents(this);
				let s=W.getSelection();s.removeAllRanges();s.addRange(r)})},
		jMenuCb=(j,e)=>{let i=M.get(j),n=e.currentTarget;$(j).JVC(i[_dom].val,oCopy({[n.prop]:n.checked},i.conf))},
		jMenuOpts=[_sQuotes,_sCommas,_sJSON,_sCons,_kGroup,_kNonEn,_kSym,_kProto],
		jMenu=(j,c)=>{let m=nNode(nComm,_jvc+'menu'),s=nNode(nSpan,_jvc+'menu-sub');aFor(jMenuOpts,n=>{
			let i=nNode(nCheck,0,{name:n});i.prop=n;i.checked=c[n];nEv(i,_ch,e=>jMenuCb(j,e));
				nApp(s,nNode(nLabel,0,0,[i,n]))});nApp(m,s);nApp(j,m)},
		jConsCb=($j,n,c)=>{let s=n.innerText||'null';n.blur();
			try{$j.JVC(W['eval']('('+s+')'));nAttr(n,{pholder:s});nText(n,'')}catch(_){c[_log][_err](_jvc+'console',_);$j.JVC(_)}},
		jConsCl=(j,e,c)=>{let n=nClsOne(_jvc+'input');nText(n,e.target.innerText);jConsCb($(j),n,c)},
		jCons=(j,c)=>{let $j=$(j),n=nNode(nDiv,[_hljs+'comment',_jvc+'input'],{contenteditable:true,pholder:'json'});
			nEv(n,'keydown',e=>{let k=e.keyCode||e.charCode||e.which;if((k==10||k==13)&&!e.shiftKey){ePrev(e);jConsCb($j,n,c)}});
			let l=[];if(iOf(c[_sCons],A)){aFor(c[_sCons],s=>{let i=nNode(nComm,0,0,s);nEv(i,'click',e=>jConsCl(j,e,c));l.push(i)})}
			nApp(j,nNode(nDiv,_jvc+'console',0,[n,nNode(nDiv,_jvc+'hist',0,l)]))};
	// JVC Main
	jReady(_=>{jStyle();jFontS();jTabS();let c=10,t=nNode('span',['jvc',_jvc+'tab-observer'],0,"\t".repeat(c)),o=new ResizeObserver(_=>{
		let w=t.offsetWidth/c,h=t.offsetHeight;if(w)jTabW(w);if(h)jLineH(h)});o.observe(t);nApp(DB,t)});
	$.fn.JVC=function $JVC(o=!1,_c={}){return this.each(function(){let j=this,$j=$(j),i=M.get(j),c=oCopy(_c,(i?nData(j,'conf'):jConf));
		nClsAdd(j,['jvc','hljs']);if(!i)j.innerHTML='';c.map=new WeakMap();nData(j,'conf',c);
		jOpts(j,{[_sMenu]:'menu',[_sJSON]:'logs',[_sQuotes]:'quotes',[_sCommas]:'commas',[_sCons]:'console'},c);
		//
		let d=dItem(!1,0,c[_kPref]+'JVC',o,c),cl='click',me='mouseenter',ml='mouseleave';
		if(i)nRepl(i[_dom].root,d.root);else{nApp(j,nNode(nRoot,0,0,d.root));jMenu(j,c);jLogs(j);jCons(j,c)}
		nData(j,_dom,d);M.set(j,{doc:j,[_dom]:d,conf:c});c[_log][_dbg]('JVC:Set',i||M.get(j));jChange(j,c);
		//
		$j.off(cl).off(me).off(ml)
		.on(cl,'.'+_jItem+'.'+_jTog+'>.'+_jLine,function(e){ePrev(e);dTog(dGet(this),c)})
		.on(cl,'.'+_jPart+'>.'+_jLine,function(e){ePrev(e);dTog(dGet(this,_jPart),c)})
		.on(cl,'.'+_jRef+'>.'+_jLine,function(e){ePrev(e);let d=dGet(this),r=c.map.get(d.val);
			if(r)r[_pre].scrollIntoView({behavior:'smooth',block:'start',inline:'start'});
			else nRepl(d.root,dItem(d.key,d.lev,d.path,d.val,c,!0).root)})
		.on(me,'.'+_jRef+'>.'+_jLine,function(){let r=c.map.get(dGet(this).val);if(r)nHl(r.root)})
		.on(me,'.'+_jNode+'>.'+_jLine,function(){nHl(dGet(this).val)})
		.on(ml,'.'+_jRef+'>.'+_jLine+',.'+_jNode+'>.'+_jLine,nUnHlTmr)})};
	// JVC Globals/Prototype/Onload
	O.assign(J,{defConf:jConf,property:jProp,setTabSize:jTabS,setFontFamily:jFontN,setFontSize:jFontS,setStyle:jStyle,getJSON:jJSON});
	let l=J.onload,pJ={name:'JVC',objType:oType,objKeys:kGet,map:M,onload:{add:c=>c(J)}};
	delete J.onload;R.setPrototypeOf(J,pJ);W.JVC=J;if(l)aFor(l,c=>c(J))
})(typeof window=='undefined'?this:window,'JVC');
