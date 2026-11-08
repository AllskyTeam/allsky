; (function ($) {

    $.allskyPOSITION = function (el, options) {
        var defaults = {
            dirty: false,
            lat: 52,
            lon: 0,
			height: 0,
            zoom: 8,
            defaultprecision: 4,
            latPrecision: 4,
            lonPrecision: 4,
            onClick: function (latlon) { }
        }

        var plugin = this;
        var el = $(el);
        plugin.settings = {}

        plugin.init = function () {
            plugin.settings = $.extend({}, defaults, options);

            plugin.modalid = el.attr('id') + "-modal";
            plugin.modalmapid = el.attr('id') + "-map";

            plugin.settings.latData = el.data('lat');
            plugin.settings.lonData = el.data('lon');
            plugin.settings.format = el.data('format') || 'decimal';

            let latData = processLatLon($('#' + plugin.settings.latData).val(), $('#' + plugin.settings.lonData).val());

            plugin.settings.lat = Number.isFinite(latData.lat) ? latData.lat : defaults.lat;
            plugin.settings.lon = Number.isFinite(latData.lon) ? latData.lon : defaults.lon;

            let mapHTML = '\
                <div class="modal" tabindex="-1" id="' + plugin.modalid + '">\
                    <div class="modal-dialog modal-lg">\
                        <div class="modal-content">\
                        <div class="modal-header">\
                            <h5 class="modal-title">Select Map Location</h5>\
                            <button type="button" class="close" data-dismiss="modal" aria-label="Close">\
                            <span aria-hidden="true">&times;</span>\
                            </button>\
                        </div>\
                        <div class="modal-body">\
                            <div style="width: 100%; height: 400px" id="' + plugin.modalmapid + '">\
                            </div>\
                        </div>\
                        <div class="modal-footer">\
                            <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>\
                            <button type="button" class="btn btn-primary" id="' + plugin.modalid + '-save">Save</button>\
                        </div>\
                        </div>\
                    </div>\
                </div>\
            ';

            $('#' + plugin.modalid).remove();
            $(document.body).append(mapHTML);

            $(document).on('click', '#' + plugin.modalid + '-save', (event) => {
                let latlon = marker.getLatLng();
                
                let lat = plugin.settings.format === 'cardinal'
                    ? Math.abs(latlon.lat).toFixed(plugin.settings.latPrecision) + (latlon.lat < 0 ? 'S' : 'N')
                    : setPrecision(latlon.lat, plugin.settings.latPrecision);
                let lon = plugin.settings.format === 'cardinal'
                    ? Math.abs(latlon.lng).toFixed(plugin.settings.lonPrecision) + (latlon.lng < 0 ? 'W' : 'E')
                    : setPrecision(latlon.lng, plugin.settings.lonPrecision);

                $('#' + plugin.settings.latData).val(lat).trigger('change');
                $('#' + plugin.settings.lonData).val(lon).trigger('change');

                plugin.settings.onClick.call(plugin.settings.onClick);
                $('#' + plugin.modalid).modal('hide');
            });

            var map = L.map(plugin.modalmapid).setView([plugin.settings.lat, plugin.settings.lon], plugin.settings.zoom);
            L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '© OpenStreetMap'
            }).addTo(map);

            var marker = L.marker([plugin.settings.lat, plugin.settings.lon], {draggable: true}).addTo(map)

            map.on('click', function(e) {        
                var latlng= e.latlng;
                marker.setLatLng(latlng);     
            });


            $('#' + plugin.modalid).on('shown.bs.modal', function (e) {
                map.invalidateSize();

            })            

            $(el).on("click", (event) => {

                const latitudeValue = $('#' + plugin.settings.latData).val();
                const longitudeValue = $('#' + plugin.settings.lonData).val();

                plugin.settings.latPrecision = $('#' + plugin.settings.latData).data('precision');
                if (plugin.settings.latPrecision == undefined) {
                    plugin.settings.latPrecision = plugin.settings.defaultprecision;
                }
                plugin.settings.lonPrecision = $('#' + plugin.settings.lonData).data('precision');
                if (plugin.settings.lonPrecision == undefined) {
                    plugin.settings.lonPrecision = plugin.settings.defaultprecision;
                }

                let lat = setPrecision(latitudeValue, plugin.settings.latPrecision);
                let lon = setPrecision(longitudeValue, plugin.settings.lonPrecision);

                let latlon = processLatLon(lat, lon);

                if (Number.isFinite(latlon.lat) && Number.isFinite(latlon.lon)) {
                    let latlng = L.latLng(latlon.lat, latlon.lon);
                    marker.setLatLng(latlng);
                    map.setView(latlng);
                    $('#' + plugin.modalid).modal({
                        keyboard: false
                    });
                } else {
                    alert("Invalid LAT/LON");
                }
            });

        }

        plugin.destroy = function () {
            $('#' + plugin.modalid).remove();
            $(document).removeData('allskyLATLON');
        }

        var setPrecision = function(value, precision) {
            let lastChar = '';

            value = String(value);
            value = value.replace(/\s/g, '');
            if (value != '') {
                value = String(value);
                value = value.replace(/\s/g, '');
                if (isNaN(value.at(-1))) {
                    lastChar = value.at(-1);
                    value = value.slice(0, -1); 
                }

                let dpPos = value.indexOf(".");
                value = value.substring(0, dpPos + precision + 1);
                value = value + lastChar;
            }
            return value;
        }

        var processLatLon = function(lat,lon) {

            if (lat == undefined) {
                lat = "0";
            }
            if (lon == undefined) {
                lon = "0";
            }

            lat = lat.toString().replace(/\s/g, '');
            lon = lon.toString().replace(/\s/g, '');

            if (lat != "") {
                if (isNaN(lat)) {
                    const lastChar = lat.at(-1);
                    if (lastChar.toUpperCase() == "N" || lastChar.toUpperCase() == "S") {
                        lat = lat.slice(0, -1);                    
        
                        if (lastChar.toUpperCase() == "S") {
                            lat = "-" + lat;
                        }
                        
                    } else {
                        lat = NaN;
                    }
                }
                if (!isNaN(lat)) {
                    lat = parseFloat(lat);

                    if (lat < -90 || lat > 90) {
                        lat = NaN;
                    }
                } else {
                    lat = NaN;
                }
            } else {
                lat = plugin.settings.lat;
            }

            if (lon != "") {
                if (isNaN(lon)) {
                    const lastChar = lon.at(-1);
                    if (lastChar.toUpperCase() == "E" || lastChar.toUpperCase() == "W") {
                        lon = lon.slice(0, -1);                    
        
                        if (lastChar.toUpperCase() == "W") {
                            lon = "-" + lon;
                        }
                        
                    } else {
                        lon = NaN;
                    }
                } 
                if (!isNaN(lon)) {
                    lon = parseFloat(lon);

                    if (lon < -180 || lon > 180) {
                        lon = NaN;
                    }
                } else {
                    lon = NaN;
                }
            } else {
                lon = plugin.settings.lon;
            }

            return {
                'lat': lat,
                'lon': lon
            };
        }

        plugin.init();

    }

    $.fn.allskyPOSITION = function (options) {
        return this.each(function () {
            if (undefined == $(this).data('allskyPOSITION')) {
                var plugin = new $.allskyPOSITION(this, options);
                $(this).data('allskyPOSITION', plugin);
            }
        });
    }

})(jQuery);
