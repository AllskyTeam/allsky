/* *
 *
 *  (c) 2010-2024 Torstein Honsi, Magdalena Gut
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */
import U from '../../Core/Utilities.js';
var defined = U.defined;
/**
 *
 */
function rescalePatternFill(element, stackHeight, width, height, borderWidth) {
    if (borderWidth === void 0) { borderWidth = 1; }
    var fill = element && element.attr('fill'), match = fill && fill.match(/url\(([^)]+)\)/);
    if (match) {
        var patternPath = document.querySelector("".concat(match[1], " path"));
        if (patternPath) {
            var bBox = patternPath.getBBox();
            // Firefox (v108/Mac) is unable to detect the bounding box within
            // defs. Without this block, the pictorial is not rendered.
            if (bBox.width === 0) {
                var parent_1 = patternPath.parentElement;
                // Temporarily append it to the root
                element.renderer.box.appendChild(patternPath);
                bBox = patternPath.getBBox();
                parent_1.appendChild(patternPath);
            }
            var scaleX = 1 / (bBox.width + borderWidth);
            var scaleY = stackHeight / height / bBox.height, aspectRatio = bBox.width / bBox.height, pointAspectRatio = width / stackHeight, x = -bBox.width / 2;
            if (aspectRatio < pointAspectRatio) {
                scaleX = scaleX * aspectRatio / pointAspectRatio;
            }
            patternPath.setAttribute('stroke-width', borderWidth / (width * scaleX));
            patternPath.setAttribute('transform', 'translate(0.5, 0)' +
                "scale(".concat(scaleX, " ").concat(scaleY, ") ") +
                "translate(".concat(x + borderWidth * scaleX / 2, ", ").concat(-bBox.y, ")"));
        }
    }
}
/**
 *
 */
function getStackMetrics(yAxis, shape) {
    var height = yAxis.len, y = 0;
    if (shape && defined(shape.max)) {
        y = yAxis.toPixels(shape.max, true);
        height = yAxis.len - y;
    }
    return {
        height: height,
        y: y
    };
}
/**
 *
 */
function invertShadowGroup(shadowGroup, yAxis) {
    var inverted = yAxis.chart.inverted;
    if (inverted) {
        shadowGroup.attr({
            rotation: inverted ? 90 : 0,
            scaleX: inverted ? -1 : 1
        });
    }
}
export default { rescalePatternFill: rescalePatternFill, invertShadowGroup: invertShadowGroup, getStackMetrics: getStackMetrics };
