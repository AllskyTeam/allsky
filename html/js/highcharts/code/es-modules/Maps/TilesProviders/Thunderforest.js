/* *
 * Thunderforest provider, used for tile map services
 * */
'use strict';
/* *
 *
 *  Class
 *
 * */
class Thunderforest {
    constructor() {
        /* *
         *
         *  Properties
         *
         * */
        this.defaultCredits = ('Maps &copy <a href="https://www.thunderforest.com">Thunderforest</a>' +
            ', Data &copy; <a href="https://www.openstreetmap.org/copyright">' +
            'OpenStreetMap contributors</a>');
        this.initialProjectionName = 'WebMercator';
        this.requiresApiKey = true;
        this.subdomains = ['a', 'b', 'c'];
        this.themes = {
            OpenCycleMap: {
                url: 'https://{s}.tile.thunderforest.com/cycle/{z}/{x}/{y}.png?apikey={apikey}',
                minZoom: 0,
                maxZoom: 22
            },
            Transport: {
                url: 'https://{s}.tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey={apikey}',
                minZoom: 0,
                maxZoom: 22
            },
            TransportDark: {
                url: 'https://{s}.tile.thunderforest.com/transport-dark/{z}/{x}/{y}.png?apikey={apikey}',
                minZoom: 0,
                maxZoom: 22
            },
            SpinalMap: {
                url: 'https://{s}.tile.thunderforest.com/spinal-map/{z}/{x}/{y}.png?apikey={apikey}',
                minZoom: 0,
                maxZoom: 22
            },
            Landscape: {
                url: 'https://{s}.tile.thunderforest.com/landscape/{z}/{x}/{y}.png?apikey={apikey}',
                minZoom: 0,
                maxZoom: 22
            },
            Outdoors: {
                url: 'https://{s}.tile.thunderforest.com/outdoors/{z}/{x}/{y}.png?apikey={apikey}',
                minZoom: 0,
                maxZoom: 22
            },
            Pioneer: {
                url: 'https://{s}.tile.thunderforest.com/pioneer/{z}/{x}/{y}.png?apikey={apikey}',
                minZoom: 0,
                maxZoom: 22
            },
            MobileAtlas: {
                url: 'https://{s}.tile.thunderforest.com/mobile-atlas/{z}/{x}/{y}.png?apikey={apikey}',
                minZoom: 0,
                maxZoom: 22
            },
            Neighbourhood: {
                url: 'https://{s}.tile.thunderforest.com/neighbourhood/{z}/{x}/{y}.png?apikey={apikey}',
                minZoom: 0,
                maxZoom: 22
            }
        };
    }
}
/* *
 *
 *  Default Export
 *
 * */
export default Thunderforest;
