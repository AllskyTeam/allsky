/* *
 *
 *  DataGrid default options
 *
 *  (c) 2009-2024 Highsoft AS
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
*  Authors:
 *  - Dawid Dragula
 *  - Sebastian Bochan
 *
 * */
'use strict';
import Utils from '../Core/Utilities.js';
var merge = Utils.merge;
/**
 * Namespace for default options.
 */
var Defaults;
(function (Defaults) {
    /**
     * Default options for the DataGrid.
     */
    Defaults.defaultOptions = {
        accessibility: {
            enabled: true,
            announcements: {
                cellEditing: true,
                sorting: true
            }
        },
        lang: {
            accessibility: {
                cellEditing: {
                    editable: 'Editable.',
                    announcements: {
                        started: 'Entered cell editing mode.',
                        edited: 'Edited cell value.',
                        cancelled: 'Editing canceled.'
                    }
                },
                sorting: {
                    announcements: {
                        ascending: 'Sorted ascending.',
                        descending: 'Sorted descending.',
                        none: 'Not sorted.'
                    }
                }
            },
            noData: 'No data to display'
        },
        rendering: {
            columns: {
                distribution: 'full'
            },
            rows: {
                bufferSize: 10,
                strictHeights: false,
                virtualization: true
            },
            header: {
                enabled: true
            }
        },
        credits: {
            enabled: true,
            text: 'Highcharts.com',
            href: 'https://www.highcharts.com?credits',
            position: 'bottom'
        },
        columnDefaults: {
            sorting: {
                sortable: true
            },
            resizing: true
        }
    };
    /**
     * Merge the default options with custom options. Commonly used for defining
     * reusable templates.
     *
     * @param options
     * The new custom chart options.
     */
    function setOptions(options) {
        merge(true, Defaults.defaultOptions, options);
    }
    Defaults.setOptions = setOptions;
})(Defaults || (Defaults = {}));
/* *
 *
 *  Default Export
 *
 * */
export default Defaults;
