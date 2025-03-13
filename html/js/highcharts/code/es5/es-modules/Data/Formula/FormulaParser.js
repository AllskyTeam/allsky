/* *
 *
 *  (c) 2009-2024 Highsoft AS
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 *  Authors:
 *  - Sophie Bremer
 *
 * */
'use strict';
/* *
 *
 *  Constants
 *
 * */
/**
 * @private
 */
var booleanRegExp = /^(?:FALSE|TRUE)/;
/**
 * `.`-separated decimal.
 * @private
 */
var decimal1RegExp = /^[+\-]?\d+(?:\.\d+)?(?:e[+\-]\d+)?/;
/**
 * `,`-separated decimal.
 * @private
 */
var decimal2RegExp = /^[+\-]?\d+(?:,\d+)?(?:e[+\-]\d+)?/;
/**
 * - Group 1: Function name
 * @private
 */
var functionRegExp = /^([A-Z][A-Z\d\.]*)\(/;
/**
 * @private
 */
var operatorRegExp = /^(?:[+\-*\/^<=>]|<=|=>)/;
/**
 * - Group 1: Start column
 * - Group 2: Start row
 * - Group 3: End column
 * - Group 4: End row
 * @private
 */
var rangeA1RegExp = /^(\$?[A-Z]+)(\$?\d+)\:(\$?[A-Z]+)(\$?\d+)/;
/**
 * - Group 1: Start row
 * - Group 2: Start column
 * - Group 3: End row
 * - Group 4: End column
 * @private
 */
var rangeR1C1RegExp = /^R(\d*|\[\d+\])C(\d*|\[\d+\])\:R(\d*|\[\d+\])C(\d*|\[\d+\])/;
/**
 * - Group 1: Column
 * - Group 2: Row
 * @private
 */
var referenceA1RegExp = /^(\$?[A-Z]+)(\$?\d+)(?![\:C])/;
/**
 * - Group 1: Row
 * - Group 2: Column
 * @private
 */
var referenceR1C1RegExp = /^R(\d*|\[\d+\])C(\d*|\[\d+\])(?!\:)/;
/* *
 *
 *  Functions
 *
 * */
/**
 * Extracts the inner string of the most outer parantheses.
 *
 * @private
 *
 * @param {string} text
 * Text string to extract from.
 *
 * @return {string}
 * Extracted parantheses. If not found an exception will be thrown.
 */
function extractParantheses(text) {
    var parantheseLevel = 0;
    for (var i = 0, iEnd = text.length, char = void 0, parantheseStart = 1; i < iEnd; ++i) {
        char = text[i];
        if (char === '(') {
            if (!parantheseLevel) {
                parantheseStart = i + 1;
            }
            ++parantheseLevel;
            continue;
        }
        if (char === ')') {
            --parantheseLevel;
            if (!parantheseLevel) {
                return text.substring(parantheseStart, i);
            }
        }
    }
    if (parantheseLevel > 0) {
        var error = new Error('Incomplete parantheses.');
        error.name = 'FormulaParseError';
        throw error;
    }
    return '';
}
/**
 * Extracts the inner string value.
 *
 * @private
 *
 * @param {string} text
 * Text string to extract from.
 *
 * @return {string}
 * Extracted string. If not found an exception will be thrown.
 */
function extractString(text) {
    var start = -1;
    for (var i = 0, iEnd = text.length, char = void 0, escaping = false; i < iEnd; ++i) {
        char = text[i];
        if (char === '\\') {
            escaping = !escaping;
            continue;
        }
        if (escaping) {
            escaping = false;
            continue;
        }
        if (char === '"') {
            if (start < 0) {
                start = i;
            }
            else {
                return text.substring(start + 1, i); // `ì` is excluding
            }
        }
    }
    var error = new Error('Incomplete string.');
    error.name = 'FormulaParseError';
    throw error;
}
/**
 * Parses an argument string. Formula arrays with a single term will be
 * simplified to the term.
 *
 * @private
 *
 * @param {string} text
 * Argument string to parse.
 *
 * @param {boolean} alternativeSeparators
 * Whether to expect `;` as argument separator and `,` as decimal separator.
 *
 * @return {Formula|Function|Range|Reference|Value}
 * The recognized term structure.
 */
function parseArgument(text, alternativeSeparators) {
    var match;
    // Check for a R1C1:R1C1 range notation
    match = text.match(rangeR1C1RegExp);
    if (match) {
        var beginColumnRelative = (match[2] === '' || match[2][0] === '[');
        var beginRowRelative = (match[1] === '' || match[1][0] === '[');
        var endColumnRelative = (match[4] === '' || match[4][0] === '[');
        var endRowRelative = (match[3] === '' || match[3][0] === '[');
        var range = {
            type: 'range',
            beginColumn: (beginColumnRelative ?
                parseInt(match[2].substring(1, -1) || '0', 10) :
                parseInt(match[2], 10) - 1),
            beginRow: (beginRowRelative ?
                parseInt(match[1].substring(1, -1) || '0', 10) :
                parseInt(match[1], 10) - 1),
            endColumn: (endColumnRelative ?
                parseInt(match[4].substring(1, -1) || '0', 10) :
                parseInt(match[4], 10) - 1),
            endRow: (endRowRelative ?
                parseInt(match[3].substring(1, -1) || '0', 10) :
                parseInt(match[3], 10) - 1)
        };
        if (beginColumnRelative) {
            range.beginColumnRelative = true;
        }
        if (beginRowRelative) {
            range.beginRowRelative = true;
        }
        if (endColumnRelative) {
            range.endColumnRelative = true;
        }
        if (endRowRelative) {
            range.endRowRelative = true;
        }
        return range;
    }
    // Check for a A1:A1 range notation
    match = text.match(rangeA1RegExp);
    if (match) {
        var beginColumnRelative = match[1][0] !== '$';
        var beginRowRelative = match[2][0] !== '$';
        var endColumnRelative = match[3][0] !== '$';
        var endRowRelative = match[4][0] !== '$';
        var range = {
            type: 'range',
            beginColumn: parseReferenceColumn(beginColumnRelative ?
                match[1] :
                match[1].substring(1)) - 1,
            beginRow: parseInt(beginRowRelative ?
                match[2] :
                match[2].substring(1), 10) - 1,
            endColumn: parseReferenceColumn(endColumnRelative ?
                match[3] :
                match[3].substring(1)) - 1,
            endRow: parseInt(endRowRelative ?
                match[4] :
                match[4].substring(1), 10) - 1
        };
        if (beginColumnRelative) {
            range.beginColumnRelative = true;
        }
        if (beginRowRelative) {
            range.beginRowRelative = true;
        }
        if (endColumnRelative) {
            range.endColumnRelative = true;
        }
        if (endRowRelative) {
            range.endRowRelative = true;
        }
        return range;
    }
    // Fallback to formula processing for other pattern types
    var formula = parseFormula(text, alternativeSeparators);
    return (formula.length === 1 && typeof formula[0] !== 'string' ?
        formula[0] :
        formula);
}
/**
 * Parse arguments string inside function parantheses.
 *
 * @private
 *
 * @param {string} text
 * Parantheses string of the function.
 *
 * @param {boolean} alternativeSeparators
 * Whether to expect `;` as argument separator and `,` as decimal separator.
 *
 * @return {Highcharts.FormulaArguments}
 * Parsed arguments array.
 */
function parseArguments(text, alternativeSeparators) {
    var args = [], argumentsSeparator = (alternativeSeparators ? ';' : ',');
    var parantheseLevel = 0, term = '';
    for (var i = 0, iEnd = text.length, char = void 0; i < iEnd; ++i) {
        char = text[i];
        // Check for separator
        if (char === argumentsSeparator &&
            !parantheseLevel &&
            term) {
            args.push(parseArgument(term, alternativeSeparators));
            term = '';
            // Check for a quoted string before skip logic
        }
        else if (char === '"' &&
            !parantheseLevel &&
            !term) {
            var string = extractString(text.substring(i));
            args.push(string);
            i += string.length + 1; // Only +1 to cover ++i in for-loop
            // Skip space and check paranthesis nesting
        }
        else if (char !== ' ') {
            term += char;
            if (char === '(') {
                ++parantheseLevel;
            }
            else if (char === ')') {
                --parantheseLevel;
            }
        }
    }
    // Look for left-overs from last argument
    if (!parantheseLevel && term) {
        args.push(parseArgument(term, alternativeSeparators));
    }
    return args;
}
/**
 * Converts a spreadsheet formula string into a formula array. Throws a
 * `FormulaParserError` when the string can not be parsed.
 *
 * @private
 * @function Formula.parseFormula
 *
 * @param {string} text
 * Spreadsheet formula string, without the leading `=`.
 *
 * @param {boolean} alternativeSeparators
 * * `false` to expect `,` between arguments and `.` in decimals.
 * * `true` to expect `;` between arguments and `,` in decimals.
 *
 * @return {Formula.Formula}
 * Formula array representing the string.
 */
function parseFormula(text, alternativeSeparators) {
    var decimalRegExp = (alternativeSeparators ?
        decimal2RegExp :
        decimal1RegExp), formula = [];
    var match, next = (text[0] === '=' ? text.substring(1) : text).trim();
    while (next) {
        // Check for an R1C1 reference notation
        match = next.match(referenceR1C1RegExp);
        if (match) {
            var columnRelative = (match[2] === '' || match[2][0] === '[');
            var rowRelative = (match[1] === '' || match[1][0] === '[');
            var reference = {
                type: 'reference',
                column: (columnRelative ?
                    parseInt(match[2].substring(1, -1) || '0', 10) :
                    parseInt(match[2], 10) - 1),
                row: (rowRelative ?
                    parseInt(match[1].substring(1, -1) || '0', 10) :
                    parseInt(match[1], 10) - 1)
            };
            if (columnRelative) {
                reference.columnRelative = true;
            }
            if (rowRelative) {
                reference.rowRelative = true;
            }
            formula.push(reference);
            next = next.substring(match[0].length).trim();
            continue;
        }
        // Check for an A1 reference notation
        match = next.match(referenceA1RegExp);
        if (match) {
            var columnRelative = match[1][0] !== '$';
            var rowRelative = match[2][0] !== '$';
            var reference = {
                type: 'reference',
                column: parseReferenceColumn(columnRelative ?
                    match[1] :
                    match[1].substring(1)) - 1,
                row: parseInt(rowRelative ?
                    match[2] :
                    match[2].substring(1), 10) - 1
            };
            if (columnRelative) {
                reference.columnRelative = true;
            }
            if (rowRelative) {
                reference.rowRelative = true;
            }
            formula.push(reference);
            next = next.substring(match[0].length).trim();
            continue;
        }
        // Check for a formula operator
        match = next.match(operatorRegExp);
        if (match) {
            formula.push(match[0]);
            next = next.substring(match[0].length).trim();
            continue;
        }
        // Check for a boolean value
        match = next.match(booleanRegExp);
        if (match) {
            formula.push(match[0] === 'TRUE');
            next = next.substring(match[0].length).trim();
            continue;
        }
        // Check for a number value
        match = next.match(decimalRegExp);
        if (match) {
            formula.push(parseFloat(match[0]));
            next = next.substring(match[0].length).trim();
            continue;
        }
        // Check for a quoted string
        if (next[0] === '"') {
            var string = extractString(next);
            formula.push(string.substring(1, -1));
            next = next.substring(string.length + 2).trim();
            continue;
        }
        // Check for a function
        match = next.match(functionRegExp);
        if (match) {
            next = next.substring(match[1].length).trim();
            var parantheses = extractParantheses(next);
            formula.push({
                type: 'function',
                name: match[1],
                args: parseArguments(parantheses, alternativeSeparators)
            });
            next = next.substring(parantheses.length + 2).trim();
            continue;
        }
        // Check for a formula in parantheses
        if (next[0] === '(') {
            var paranteses = extractParantheses(next);
            if (paranteses) {
                formula
                    .push(parseFormula(paranteses, alternativeSeparators));
                next = next.substring(paranteses.length + 2).trim();
                continue;
            }
        }
        // Something is not right
        var position = text.length - next.length, error = new Error('Unexpected character `' +
            text.substring(position, position + 1) +
            '` at position ' + (position + 1) +
            '. (`...' + text.substring(position - 5, position + 6) + '...`)');
        error.name = 'FormulaParseError';
        throw error;
    }
    return formula;
}
/**
 * Converts a reference column `A` of `A1` into a number. Supports endless sizes
 * `ZZZ...`, just limited by integer precision.
 *
 * @private
 *
 * @param {string} text
 * Column string to convert.
 *
 * @return {number}
 * Converted column index.
 */
function parseReferenceColumn(text) {
    var column = 0;
    for (var i = 0, iEnd = text.length, code = void 0, factor = text.length - 1; i < iEnd; ++i) {
        code = text.charCodeAt(i);
        if (code >= 65 && code <= 90) {
            column += (code - 64) * Math.pow(26, factor);
        }
        --factor;
    }
    return column;
}
/* *
 *
 *  Default Export
 *
 * */
var FormulaParser = {
    parseFormula: parseFormula
};
export default FormulaParser;
