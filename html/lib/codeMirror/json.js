// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: https://codemirror.net/LICENSE

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
"use strict";

CodeMirror.defineMode('json', function(config, parserConfig) {
	var wordRE = parserConfig.wordCharacters || /[\w$\xa1-\uffff]/;

	// Keep the colors similar to javascript.

	function tokenBase(stream, state) {
//if (stream.pos == 0) console.log("tokenBase, stream=", stream, ", stream.string=", stream.string)
		if (stream.eatSpace()) return null;

		var ch = stream.next();
		if (ch === '{' || ch === '}') return null;
		if (ch === '[' || ch === ']') return 'def';
		if (ch === ':') return null;

		// strings
		if (ch === '\'' || ch === '"') {
			var s = tokenString(ch);
			state.tokens.unshift(s);
			return tokenize(stream, state);
		}

		// numbers, with or without decimal.
		if (/\d/.test(ch)) {
			stream.eatWhile(/\d/);
			if(stream.eol() || !/\w/.test(stream.peek())) {
				return 'number';
			}
		}
		if (ch == "." && stream.match(/^\d[\d_]*(?:[eE][+\-]?[\d_]+)?/)) {
			return 'number';
		}

		// check for keywords
		if (wordRE.test(ch)) {
			stream.eatWhile(wordRE);
			var word = stream.current().toLowerCase();
			if (word === "true" || word === "false" || word === "null")
				return 'atom';
        }

		return null;
	}

	function tokenize(stream, state) {
		return (state.tokens[0] || tokenBase) (stream, state);
	};

	function tokenString(quote) {
		var close = quote == "(" ? ")" : quote == "{" ? "}" : quote;
		return function(stream, state) {
			var next, escaped = false;
			while ((next = stream.next()) != null) {
				if (next === close && !escaped) {
					state.tokens.shift();
					break;
				} else if (!escaped && quote !== close && next === quote) {
					state.tokens.unshift(tokenString(quote))
					return tokenize(stream, state)
				} else if (!escaped && /['"]/.test(next) && !/['"]/.test(quote)) {
					state.tokens.unshift(tokenStringStart(next, "string"));
					stream.backUp(1);
					break;
				}
				escaped = !escaped && next === '\\';
			}

			// JSON format is:
			//		key: value
			// "key" should always be a string, but we want to color it as an attribute.
			// There is optional whitespace after "key".
			// "value" can be a string, number, etc. and should be colored accordingly.
			stream.eatSpace();
			var n = stream.peek();
			if (n === ":") return 'attribute';

			return 'string';
		};
	};


	return {
		startState: function() {
			return {tokens:[]};
		},
		token: function(stream, state) {
			return tokenize(stream, state);
		},
	};

});

CodeMirror.defineMIME('application/json', 'json');

});
