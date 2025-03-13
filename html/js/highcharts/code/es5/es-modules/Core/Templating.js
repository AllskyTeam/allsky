/* *
 *
 *  (c) 2010-2024 Torstein Honsi
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */
'use strict';
import D from './Defaults.js';
var defaultOptions = D.defaultOptions, defaultTime = D.defaultTime;
import G from './Globals.js';
var pageLang = G.pageLang;
import U from './Utilities.js';
var extend = U.extend, getNestedProperty = U.getNestedProperty, isArray = U.isArray, isNumber = U.isNumber, isObject = U.isObject, isString = U.isString, pick = U.pick, ucfirst = U.ucfirst;
var helpers = {
    // Built-in helpers
    add: function (a, b) { return a + b; },
    divide: function (a, b) { return (b !== 0 ? a / b : ''); },
    // eslint-disable-next-line eqeqeq
    eq: function (a, b) { return a == b; },
    each: function (arr) {
        var match = arguments[arguments.length - 1];
        return isArray(arr) ?
            arr.map(function (item, i) { return format(match.body, extend(isObject(item) ? item : { '@this': item }, {
                '@index': i,
                '@first': i === 0,
                '@last': i === arr.length - 1
            })); }).join('') :
            false;
    },
    ge: function (a, b) { return a >= b; },
    gt: function (a, b) { return a > b; },
    'if': function (condition) { return !!condition; },
    le: function (a, b) { return a <= b; },
    lt: function (a, b) { return a < b; },
    multiply: function (a, b) { return a * b; },
    // eslint-disable-next-line eqeqeq
    ne: function (a, b) { return a != b; },
    subtract: function (a, b) { return a - b; },
    ucfirst: ucfirst,
    unless: function (condition) { return !condition; }
};
var numberFormatCache = {};
/* *
 *
 *  Functions
 *
 * */
// Internal convenience function
var isQuotedString = function (str) { return /^["'].+["']$/.test(str); };
/**
 * Formats a JavaScript date timestamp (milliseconds since Jan 1st 1970) into a
 * human readable date string. The format is a subset of the formats for PHP's
 * [strftime](https://www.php.net/manual/en/function.strftime.php) function.
 * Additional formats can be given in the {@link Highcharts.dateFormats} hook.
 *
 * Since v6.0.5, all internal dates are formatted through the
 * {@link Highcharts.Chart#time} instance to respect chart-level time settings.
 * The `Highcharts.dateFormat` function only reflects global time settings set
 * with `setOptions`.
 *
 * Supported format keys:
 * - `%a`: Short weekday, like 'Mon'
 * - `%A`: Long weekday, like 'Monday'
 * - `%d`: Two digit day of the month, 01 to 31
 * - `%e`: Day of the month, 1 through 31
 * - `%w`: Day of the week, 0 through 6
 * - `%b`: Short month, like 'Jan'
 * - `%B`: Long month, like 'January'
 * - `%m`: Two digit month number, 01 through 12
 * - `%y`: Two digits year, like 09 for 2009
 * - `%Y`: Four digits year, like 2009
 * - `%H`: Two digits hours in 24h format, 00 through 23
 * - `%k`: Hours in 24h format, 0 through 23
 * - `%I`: Two digits hours in 12h format, 00 through 11
 * - `%l`: Hours in 12h format, 1 through 12
 * - `%M`: Two digits minutes, 00 through 59
 * - `%p`: Upper case AM or PM
 * - `%P`: Lower case AM or PM
 * - `%S`: Two digits seconds, 00 through 59
 * - `%L`: Milliseconds (naming from Ruby)
 *
 * @function Highcharts.dateFormat
 *
 * @param {string} format
 *        The desired format where various time representations are prefixed
 *        with `%`.
 *
 * @param {number} timestamp
 *        The JavaScript timestamp.
 *
 * @param {boolean} [upperCaseFirst=false]
 *        Upper case first letter in the return.
 *
 * @return {string}
 *         The formatted date.
 */
function dateFormat(format, timestamp, upperCaseFirst) {
    return defaultTime.dateFormat(format, timestamp, upperCaseFirst);
}
/**
 * Format a string according to a subset of the rules of Python's String.format
 * method.
 *
 * @example
 * let s = Highcharts.format(
 *     'The {color} fox was {len:.2f} feet long',
 *     { color: 'red', len: Math.PI }
 * );
 * // => The red fox was 3.14 feet long
 *
 * @function Highcharts.format
 *
 * @param {string} str
 *        The string to format.
 *
 * @param {Record<string, *>} ctx
 *        The context, a collection of key-value pairs where each key is
 *        replaced by its value.
 *
 * @param {Highcharts.Chart} [chart]
 *        A `Chart` instance used to get numberFormatter and time.
 *
 * @return {string}
 *         The formatted string.
 */
function format(str, ctx, chart) {
    if (str === void 0) { str = ''; }
    var regex = /\{([\p{L}\d:\.,;\-\/<>\[\]%_@+"'’= #\(\)]+)\}/gu, 
    // The sub expression regex is the same as the top expression regex,
    // but except parens and block helpers (#), and surrounded by parens
    // instead of curly brackets.
    subRegex = /\(([\p{L}\d:\.,;\-\/<>\[\]%_@+"'= ]+)\)/gu, matches = [], floatRegex = /f$/, decRegex = /\.(\d)/, lang = (chart === null || chart === void 0 ? void 0 : chart.options.lang) || defaultOptions.lang, time = chart && chart.time || defaultTime, numberFormatter = chart && chart.numberFormatter || numberFormat;
    /*
     * Get a literal or variable value inside a template expression. May be
     * extended with other types like string or null if needed, but keep it
     * small for now.
     */
    var resolveProperty = function (key) {
        if (key === void 0) { key = ''; }
        var n;
        // Literals
        if (key === 'true') {
            return true;
        }
        if (key === 'false') {
            return false;
        }
        if ((n = Number(key)).toString() === key) {
            return n;
        }
        if (isQuotedString(key)) {
            return key.slice(1, -1);
        }
        // Variables and constants
        return getNestedProperty(key, ctx);
    };
    var match, currentMatch, depth = 0, hasSub;
    // Parse and create tree
    while ((match = regex.exec(str)) !== null) {
        // When a sub expression is found, it is evaluated first, and the
        // results recursively evaluated until no subexpression exists.
        var mainMatch = match, subMatch = subRegex.exec(match[1]);
        if (subMatch) {
            match = subMatch;
            hasSub = true;
        }
        if (!currentMatch || !currentMatch.isBlock) {
            currentMatch = {
                ctx: ctx,
                expression: match[1],
                find: match[0],
                isBlock: match[1].charAt(0) === '#',
                start: match.index,
                startInner: match.index + match[0].length,
                length: match[0].length
            };
        }
        // Identify helpers
        var fn = (currentMatch.isBlock ? mainMatch : match)[1].split(' ')[0].replace('#', '');
        if (helpers[fn]) {
            // Block helper, only 0 level is handled
            if (currentMatch.isBlock && fn === currentMatch.fn) {
                depth++;
            }
            if (!currentMatch.fn) {
                currentMatch.fn = fn;
            }
        }
        // Closing a block helper
        var startingElseSection = match[1] === 'else';
        if (currentMatch.isBlock &&
            currentMatch.fn && (match[1] === "/".concat(currentMatch.fn) ||
            startingElseSection)) {
            if (!depth) { // === 0
                var start = currentMatch.startInner, body = str.substr(start, match.index - start);
                // Either closing without an else section, or when encountering
                // an else section
                if (currentMatch.body === void 0) {
                    currentMatch.body = body;
                    currentMatch.startInner = match.index + match[0].length;
                    // The body exists already, so this is the else section
                }
                else {
                    currentMatch.elseBody = body;
                }
                currentMatch.find += body + match[0];
                if (!startingElseSection) {
                    matches.push(currentMatch);
                    currentMatch = void 0;
                }
            }
            else if (!startingElseSection) {
                depth--;
            }
            // Common expression
        }
        else if (!currentMatch.isBlock) {
            matches.push(currentMatch);
        }
        // Evaluate sub-matches one by one to prevent orphaned block closers
        if (subMatch && !(currentMatch === null || currentMatch === void 0 ? void 0 : currentMatch.isBlock)) {
            break;
        }
    }
    // Execute
    matches.forEach(function (match) {
        var body = match.body, elseBody = match.elseBody, expression = match.expression, fn = match.fn;
        var replacement, i;
        // Helper function
        if (fn) {
            // Pass the helpers the amount of arguments defined by the function,
            // then the match as the last argument.
            var args = [match], parts = [], len = expression.length;
            var start = 0, startChar = void 0;
            for (i = 0; i <= len; i++) {
                var char = expression.charAt(i);
                // Start of string
                if (!startChar && (char === '"' || char === '\'')) {
                    startChar = char;
                    // End of string
                }
                else if (startChar === char) {
                    startChar = '';
                }
                if (!startChar &&
                    (char === ' ' || i === len)) {
                    parts.push(expression.substr(start, i - start));
                    start = i + 1;
                }
            }
            i = helpers[fn].length;
            while (i--) {
                args.unshift(resolveProperty(parts[i + 1]));
            }
            replacement = helpers[fn].apply(ctx, args);
            // Block helpers may return true or false. They may also return a
            // string, like the `each` helper.
            if (match.isBlock && typeof replacement === 'boolean') {
                replacement = format(replacement ? body : elseBody, ctx, chart);
            }
            // Simple variable replacement
        }
        else {
            var valueAndFormat = isQuotedString(expression) ?
                [expression] : expression.split(':');
            replacement = resolveProperty(valueAndFormat.shift() || '');
            // Format the replacement
            if (valueAndFormat.length && typeof replacement === 'number') {
                var segment = valueAndFormat.join(':');
                if (floatRegex.test(segment)) { // Float
                    var decimals = parseInt((segment.match(decRegex) || ['', '-1'])[1], 10);
                    if (replacement !== null) {
                        replacement = numberFormatter(replacement, decimals, lang.decimalPoint, segment.indexOf(',') > -1 ? lang.thousandsSep : '');
                    }
                }
                else {
                    replacement = time.dateFormat(segment, replacement);
                }
            }
            // Use string literal in order to be preserved in the outer
            // expression
            subRegex.lastIndex = 0;
            if (subRegex.test(match.find) && isString(replacement)) {
                replacement = "\"".concat(replacement, "\"");
            }
        }
        str = str.replace(match.find, pick(replacement, ''));
    });
    return hasSub ? format(str, ctx, chart) : str;
}
/**
 * Format a number and return a string based on input settings.
 *
 * @sample highcharts/members/highcharts-numberformat/
 *         Custom number format
 *
 * @function Highcharts.numberFormat
 *
 * @param {number} number
 *        The input number to format.
 *
 * @param {number} decimals
 *        The amount of decimals. A value of -1 preserves the amount in the
 *        input number.
 *
 * @param {string} [decimalPoint]
 *        The decimal point, defaults to the one given in the lang options, or
 *        a dot.
 *
 * @param {string} [thousandsSep]
 *        The thousands separator, defaults to the one given in the lang
 *        options, or a space character.
 *
 * @return {string}
 *         The formatted number.
 */
function numberFormat(number, decimals, decimalPoint, thousandsSep) {
    var _a, _b;
    number = +number || 0;
    decimals = +decimals;
    var ret, fractionDigits, _c = number.toString().split('e').map(Number), mantissa = _c[0], exp = _c[1];
    var lang = ((_a = this === null || this === void 0 ? void 0 : this.options) === null || _a === void 0 ? void 0 : _a.lang) || defaultOptions.lang, origDec = (number.toString().split('.')[1] || '').split('e')[0].length, firstDecimals = decimals, options = {};
    decimalPoint !== null && decimalPoint !== void 0 ? decimalPoint : (decimalPoint = lang.decimalPoint);
    thousandsSep !== null && thousandsSep !== void 0 ? thousandsSep : (thousandsSep = lang.thousandsSep);
    if (decimals === -1) {
        // Preserve decimals. Not huge numbers (#3793).
        decimals = Math.min(origDec, 20);
    }
    else if (!isNumber(decimals)) {
        decimals = 2;
    }
    else if (decimals && exp < 0) {
        // Expose decimals from exponential notation (#7042)
        fractionDigits = decimals + exp;
        if (fractionDigits >= 0) {
            // Remove too small part of the number while keeping the notation
            mantissa = +mantissa.toExponential(fractionDigits).split('e')[0];
            decimals = fractionDigits;
        }
        else {
            // `fractionDigits < 0`
            mantissa = Math.floor(mantissa);
            if (decimals < 20) {
                // Use number instead of exponential notation (#7405)
                number = +(mantissa * Math.pow(10, exp)).toFixed(decimals);
            }
            else {
                // Or zero
                number = 0;
            }
            exp = 0;
        }
    }
    if (exp) {
        decimals !== null && decimals !== void 0 ? decimals : (decimals = 2);
        number = mantissa;
    }
    if (isNumber(decimals) && decimals >= 0) {
        options.minimumFractionDigits = decimals;
        options.maximumFractionDigits = decimals;
    }
    if (thousandsSep === '') {
        options.useGrouping = false;
    }
    var hasSeparators = thousandsSep || decimalPoint, locale = hasSeparators ?
        'en' :
        ((this === null || this === void 0 ? void 0 : this.locale) || lang.locale || pageLang), cacheKey = JSON.stringify(options) + locale, nf = (_b = numberFormatCache[cacheKey]) !== null && _b !== void 0 ? _b : (numberFormatCache[cacheKey] = new Intl.NumberFormat(locale, options));
    ret = nf.format(number);
    // If thousandsSep or decimalPoint are set, fall back to using English
    // format with string replacement for the separators.
    if (hasSeparators) {
        ret = ret
            // Preliminary step to avoid re-swapping (#22402)
            .replace(/([,\.])/g, '_$1')
            .replace(/_\,/g, thousandsSep !== null && thousandsSep !== void 0 ? thousandsSep : ',')
            .replace('_.', decimalPoint !== null && decimalPoint !== void 0 ? decimalPoint : '.');
    }
    if (
    // Remove signed zero (#20564)
    (!decimals && +ret === 0) ||
        // Small numbers, no decimals (#14023)
        (exp < 0 && !firstDecimals)) {
        ret = '0';
    }
    if (exp && +ret !== 0) {
        ret += 'e' + (exp < 0 ? '' : '+') + exp;
    }
    return ret;
}
/* *
 *
 *  Default Export
 *
 * */
var Templating = {
    dateFormat: dateFormat,
    format: format,
    helpers: helpers,
    numberFormat: numberFormat
};
export default Templating;
