/* *
 *
 *  (c) 2016-2024 Highsoft AS
 *
 *  Authors: Jon Arild Nygard
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */
'use strict';
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
/* *
 *
 *  Imports
 *
 * */
import U from '../Core/Utilities.js';
var extend = U.extend, isNumber = U.isNumber, pick = U.pick;
/* *
 *
 *  Functions
 *
 * */
/**
 * Creates an object map from parent id to children's index.
 *
 * @private
 * @function Highcharts.Tree#getListOfParents
 *
 * @param {Array<*>} data
 *        List of points set in options. `Array.parent` is parent id of point.
 *
 * @return {Highcharts.Dictionary<Array<*>>}
 * Map from parent id to children index in data
 */
function getListOfParents(data) {
    var root = '', ids = [], listOfParents = data.reduce(function (prev, curr) {
        var _a = curr.parent, parent = _a === void 0 ? '' : _a, id = curr.id;
        if (typeof prev[parent] === 'undefined') {
            prev[parent] = [];
        }
        prev[parent].push(curr);
        if (id) {
            ids.push(id);
        }
        return prev;
    }, {});
    Object.keys(listOfParents).forEach(function (node) {
        var _a;
        if ((node !== root) && (ids.indexOf(node) === -1)) {
            var adoptedByRoot = listOfParents[node].map(function (orphan) {
                var parentExcluded = __rest(orphan, []); // #15196
                return parentExcluded;
            });
            (_a = listOfParents[root]).push.apply(_a, adoptedByRoot);
            delete listOfParents[node];
        }
    });
    return listOfParents;
}
/** @private */
function getNode(id, parent, level, data, mapOfIdToChildren, options) {
    var after = options && options.after, before = options && options.before, node = {
        data: data,
        depth: level - 1,
        id: id,
        level: level,
        parent: (parent || '')
    };
    var descendants = 0, height = 0, start, end;
    // Allow custom logic before the children has been created.
    if (typeof before === 'function') {
        before(node, options);
    }
    // Call getNode recursively on the children. Calculate the height of the
    // node, and the number of descendants.
    var children = ((mapOfIdToChildren[id] || [])).map(function (child) {
        var node = getNode(child.id, id, (level + 1), child, mapOfIdToChildren, options), childStart = child.start || NaN, childEnd = (child.milestone === true ?
            childStart :
            child.end ||
                NaN);
        // Start should be the lowest child.start.
        start = ((!isNumber(start) || childStart < start) ?
            childStart :
            start);
        // End should be the largest child.end.
        // If child is milestone, then use start as end.
        end = ((!isNumber(end) || childEnd > end) ?
            childEnd :
            end);
        descendants = descendants + 1 + node.descendants;
        height = Math.max(node.height + 1, height);
        return node;
    });
    // Calculate start and end for point if it is not already explicitly set.
    if (data) {
        data.start = pick(data.start, start);
        data.end = pick(data.end, end);
    }
    extend(node, {
        children: children,
        descendants: descendants,
        height: height
    });
    // Allow custom logic after the children has been created.
    if (typeof after === 'function') {
        after(node, options);
    }
    return node;
}
/** @private */
function getTree(data, options) {
    return getNode('', null, 1, null, getListOfParents(data), options);
}
/* *
 *
 *  Default Export
 *
 * */
var Tree = {
    getNode: getNode,
    getTree: getTree
};
export default Tree;
