/* *
 *
 *  (c) 2019-2024 Highsoft AS
 *
 *  Boost module: stripped-down renderer for higher performance
 *
 *  License: highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */
'use strict';
/* *
 *
 *  Class
 *
 * */
/**
 * Vertex Buffer abstraction.
 * A vertex buffer is a set of vertices which are passed to the GPU
 * in a single call.
 *
 * @private
 * @class
 * @name WGLVertexBuffer
 *
 * @param {WebGLContext} gl
 * Context in which to create the buffer.
 * @param {WGLShader} shader
 * Shader to use.
 */
class WGLVertexBuffer {
    /* *
     *
     *  Constructor
     *
     * */
    constructor(gl, shader, dataComponents
    /* , type */
    ) {
        /* *
         *
         *  Properties
         *
         * */
        this.buffer = false;
        this.iterator = 0;
        this.preAllocated = false;
        this.vertAttribute = false;
        this.components = dataComponents || 2;
        this.dataComponents = dataComponents;
        this.gl = gl;
        this.shader = shader;
    }
    /* *
     *
     *  Functions
     *
     * */
    /**
     * Note about pre-allocated buffers:
     *     - This is slower for charts with many series
     * @private
     */
    allocate(size) {
        this.iterator = -1;
        this.preAllocated = new Float32Array(size * 4);
    }
    /**
     * Bind the buffer
     * @private
     */
    bind() {
        if (!this.buffer) {
            return false;
        }
        /// gl.bindAttribLocation(shader.program(), 0, 'aVertexPosition');
        // gl.enableVertexAttribArray(vertAttribute);
        // gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        this.gl.vertexAttribPointer(this.vertAttribute, this.components, this.gl.FLOAT, false, 0, 0);
        /// gl.enableVertexAttribArray(vertAttribute);
    }
    /**
     * Build the buffer
     * @private
     * @param {Array<number>} dataIn
     * Zero padded array of indices
     * @param {string} attrib
     * Name of the Attribute to bind the buffer to
     * @param {number} dataComponents
     * Number of components per. indice
     */
    build(dataIn, attrib, dataComponents) {
        let farray;
        this.data = dataIn || [];
        if ((!this.data || this.data.length === 0) && !this.preAllocated) {
            /// console.error('trying to render empty vbuffer');
            this.destroy();
            return false;
        }
        this.components = dataComponents || this.components;
        if (this.buffer) {
            this.gl.deleteBuffer(this.buffer);
        }
        if (!this.preAllocated) {
            farray = new Float32Array(this.data);
        }
        this.buffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, this.preAllocated || farray, this.gl.STATIC_DRAW);
        /// gl.bindAttribLocation(shader.program(), 0, 'aVertexPosition');
        this.vertAttribute = this.gl
            .getAttribLocation(this.shader.getProgram(), attrib);
        this.gl.enableVertexAttribArray(this.vertAttribute);
        // Trigger cleanup
        farray = false;
        return true;
    }
    /**
     * @private
     */
    destroy() {
        if (this.buffer) {
            this.gl.deleteBuffer(this.buffer);
            this.buffer = false;
            this.vertAttribute = false;
        }
        this.iterator = 0;
        this.components = this.dataComponents || 2;
        this.data = [];
    }
    /**
     * Adds data to the pre-allocated buffer.
     * @private
     * @param {number} x
     * X data
     * @param {number} y
     * Y data
     * @param {number} a
     * A data
     * @param {number} b
     * B data
     */
    push(x, y, a, b) {
        if (this.preAllocated) { // && iterator <= preAllocated.length - 4) {
            this.preAllocated[++this.iterator] = x;
            this.preAllocated[++this.iterator] = y;
            this.preAllocated[++this.iterator] = a;
            this.preAllocated[++this.iterator] = b;
        }
    }
    /**
     * Render the buffer
     *
     * @private
     * @param {number} from
     * Start indice.
     * @param {number} to
     * End indice.
     * @param {WGLDrawModeValue} drawMode
     * Draw mode.
     */
    render(from, to, drawMode) {
        const length = this.preAllocated ?
            this.preAllocated.length : this.data.length;
        if (!this.buffer) {
            return false;
        }
        if (!length) {
            return false;
        }
        if (!from || from > length || from < 0) {
            from = 0;
        }
        if (!to || to > length) {
            to = length;
        }
        if (from >= to) {
            return false;
        }
        drawMode = drawMode || 'POINTS';
        this.gl.drawArrays(this.gl[drawMode], from / this.components, (to - from) / this.components);
        return true;
    }
}
/* *
 *
 *  Default Export
 *
 * */
export default WGLVertexBuffer;
