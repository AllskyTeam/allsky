/* *
 *
 *  Organization chart module
 *
 *  (c) 2018-2024 Torstein Honsi
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */
'use strict';
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
import SeriesRegistry from '../../Core/Series/SeriesRegistry.js';
var SankeyPointClass = SeriesRegistry.seriesTypes.sankey.prototype.pointClass;
import U from '../../Core/Utilities.js';
var defined = U.defined, find = U.find, pick = U.pick;
/* *
 *
 *  Functions
 *
 * */
/**
 * Get columns offset including all sibling and cousins etc.
 * @private
 */
function getOffset(node) {
    var offset = node.linksFrom.length;
    node.linksFrom.forEach(function (link) {
        if (link.id === link.toNode.linksTo[0].id) {
            // Node has children, that hangs directly from it:
            offset += getOffset(link.toNode);
        }
        else {
            // If the node hangs from multiple parents, and this is not
            // the last one, ignore it:
            offset--;
        }
    });
    return offset;
}
/* *
 *
 *  Class
 *
 * */
var OrganizationPoint = /** @class */ (function (_super) {
    __extends(OrganizationPoint, _super);
    /* *
     *
     *  Functions
     *
     * */
    function OrganizationPoint(series, options, x) {
        var _this = _super.call(this, series, options, x) || this;
        if (!_this.isNode) {
            _this.dataLabelOnNull = true;
            _this.formatPrefix = 'link';
        }
        return _this;
    }
    /**
     * All nodes in an org chart are equal width.
     * @private
     */
    OrganizationPoint.prototype.getSum = function () {
        return 1;
    };
    /**
     * Set node.column for hanging layout
     * @private
     */
    OrganizationPoint.prototype.setNodeColumn = function () {
        _super.prototype.setNodeColumn.call(this);
        var node = this, fromNode = node.getFromNode().fromNode;
        // Hanging layout
        if (
        // Not defined by user
        !defined(node.options.column) &&
            // Has links to
            node.linksTo.length !== 0 &&
            // And parent uses hanging layout
            fromNode &&
            fromNode.options.layout === 'hanging') {
            var i_1 = -1, link = void 0;
            // Default all children of the hanging node
            // to have hanging layout
            node.options.layout = pick(node.options.layout, 'hanging');
            node.hangsFrom = fromNode;
            find(fromNode.linksFrom, function (link, index) {
                var found = link.toNode === node;
                if (found) {
                    i_1 = index;
                }
                return found;
            });
            // For all siblings' children (recursively)
            // increase the column offset to prevent overlapping
            for (var j = 0; j < fromNode.linksFrom.length; ++j) {
                link = fromNode.linksFrom[j];
                if (link.toNode.id === node.id) {
                    // Break
                    j = fromNode.linksFrom.length;
                }
                else {
                    i_1 += getOffset(link.toNode);
                }
            }
            node.column = (node.column || 0) + i_1;
        }
    };
    return OrganizationPoint;
}(SankeyPointClass));
/* *
 *
 *  Default Export
 *
 * */
export default OrganizationPoint;
