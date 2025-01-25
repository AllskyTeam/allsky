"use strict";

; (function ($) {

    $.allskyI2C = function (element, options) {
        var defaults = {
            data: {},
            active: true,
            id: 'oe-i2c',
            dirty: false,
            address: '',
            i2cSelected: function (address) { }
        }

        if (options === undefined) {
            options = element;
            element = null;
        } else {
            element = $(element);
        }
        var plugin = this;


        plugin.settings = $.extend({}, defaults, options);

        let pluginPrefix = plugin.settings.id + '-' + Math.random().toString(36).substr(2, 9);

        plugin.mmId = pluginPrefix + '-allskyi2c';


        plugin.init = function () {
            getData();
            createHtml();
            buildUI();
            updateUI();
            setupEvents();
        }

        var getData = function() {
            $('body').LoadingOverlay('show', {
                background: 'rgba(0, 0, 0, 0.5)',
                imageColor: '#a94442',
                textColor: '#a94442',
                text: 'Loading i2c Data'
            });            
            let result = $.ajax({
                url: '/includes/i2cutil.php?request=Devices',
                type: 'GET',
                dataType: 'json',
                cache: false,
                async: false,                
                context: this
            });
            plugin.settings.installedDevices = result.responseJSON

            result = $.ajax({
                url: '/includes/i2cutil.php?request=Data',
                type: 'GET',
                dataType: 'json',
                cache: false,
                async: false,                
                context: this
            }); 
            plugin.settings.deviceList = result.responseJSON;
            
            let data = []
            for ( let address in plugin.settings.deviceList) {
                data.push({
                    'address': address,
                    'devices': plugin.settings.deviceList[address]
                });
            }
            plugin.settings.deviceListData = data;

            data = [];
            for (let deviceNumber in plugin.settings.installedDevices[1].devices) {
                let deviceAddress = plugin.settings.installedDevices[1].devices[deviceNumber];
                let intAddress = addressToDecinal(deviceAddress)
                if (intAddress !== 0) {
                    for (let libDeviceAddress in plugin.settings.deviceList) {
                        let intLibDeviceAddress = addressToDecinal(libDeviceAddress);
                        if (intAddress == intLibDeviceAddress) {
                            data.push({
                                'address': deviceAddress,
                                'devices': plugin.settings.deviceList[libDeviceAddress]
                            });
                            break;
                        }
                    }
                }
            }
            plugin.settings.detected = data;

            $('body').LoadingOverlay('hide')
        }

        var addressToDecinal = function(address) {
            address = address.replace('0x','');

            let intAddress = parseInt(address, 16);

            return intAddress
        }

        var createHtml = function() {

            plugin.settings.deviceTable = $('#mm-i2c-dialog-tab-detected-devices').DataTable({
                data: plugin.settings.detected,
                retrieve: true,
                autoWidth: false,
                pagingType: 'simple_numbers',
                paging: true,
                info: true,
                ordering: false,
                searching: true,
                pageLength: 5,
                lengthMenu: [ [5, 10, -1], [5, 10, 'All']],
                rowId: 'id',
                order: [[0, 'asc']],
                columns: [
                    {
                        data: 'address',
                        width: '100px'
                    }, {
                        data: null,
                        width: '400px',
                        render: function (item, type, row, meta) {
                            let devicesList = '';
                            let len = Math.ceil((item.devices.length / 2));
                            for (let entry in item.devices) {
                                if (entry < len) {
                                    devicesList += '&#x2022; ' + item.devices[entry].device + '<br/>';
                                }
                            }
                            devicesList += '<br/>';

                            return devicesList;
                        }                        
                    }, {
                        data: null,
                        width: '400px',
                        render: function (item, type, row, meta) {
                            let devicesList = '';
                            let len = item.devices.length - Math.ceil((item.devices.length / 2));
                            for (let entry in item.devices) {
                                if (entry >= len) {
                                    devicesList += '&#x2022; ' + item.devices[entry].device + '<br/>';
                                }
                            }
                            devicesList += '<br/>';

                            return devicesList;
                        }                        
                    }

                ]
            });
            
            let selectedRow = -1;
            plugin.settings.deviceTable.rows().every (function (rowIdx, tableLoop, rowLoop) {
                if (this.data().address === plugin.settings.address) {
                  this.select();
                  selectedRow = rowIdx;
                }
            });
            updateUI();

            if (selectedRow != -1) {
                let rowsPerPage = plugin.settings.deviceTable.page.len();
                let pageNumber = Math.floor(selectedRow / rowsPerPage);
                plugin.settings.deviceTable.page(pageNumber).draw(false);
            }

            plugin.settings.deviceTable.on('click', 'tbody tr', (e) => {
                e.preventDefault();
                e.stopPropagation();
                let classList = e.currentTarget.classList;
             
                if (classList.contains('selected')) {
                    classList.remove('selected');
                    plugin.settings.address = '';
                }
                else {
                    let data = plugin.settings.deviceTable.row(e.currentTarget).data();
                    plugin.settings.deviceTable.rows('.selected').nodes().each((row) => row.classList.remove('selected'));
                    classList.add('selected');
                    plugin.settings.address = data.address;
                }
                updateUI();
            });

            $('#mm-i2c-dialog-tab-library-library').DataTable({
                data: plugin.settings.deviceListData,
                retrieve: true,
                autoWidth: false,
                pagingType: 'simple_numbers',
                paging: true,
                info: true,
                ordering: false,
                searching: true,
                pageLength: 5,
                lengthMenu: [ [5, 10, -1], [5, 10, 'All']],
                rowId: 'id',
                order: [[0, 'asc']],
                columns: [
                    {
                        data: 'address',
                        width: '100px'
                    }, {
                        data: null,
                        width: '400px',
                        render: function (item, type, row, meta) {
                            let devicesList = '';
                            for (let entry in item.devices) {
                                devicesList += '&#x2022; ' + item.devices[entry].device + '<br/>';
                            }
                            devicesList += '<br/>';

                            return devicesList;
                        }                                               
                    }, {
                        data: null,
                        width: '400px',
                        render: function (item, type, row, meta) {
                            let addressList = '';
                            for (let entry in item.devices) {
                                addressList += item.devices[entry].addresses + '<br/>';
                            }
                            addressList += '<br/>';

                            return addressList;
                        }                                               
                    }, {
                        data: null,
                        width: '400px',
                        render: function (item, type, row, meta) {
                            let urlList = '';
                            for (let entry in item.devices) {
                                if (item.devices[entry].url !== '') {
                                    urlList += '<a href= "' + item.devices[entry].url + '" target="_blank">Adafruit Website</a>' + '<br/>';
                                }
                            }
                            urlList += '<br/>';

                            return urlList;
                        }                                               
                    }
                ]
            }); 

        }

        var setupEvents = function() {
            $('#mm-i2c-dialog').on('click', '#mm-i2c-dialog-select', (e) => {
                plugin.settings.i2cSelected.call(this, plugin.settings.address);
				$('#mm-i2c-dialog').modal('hide');
            })
        }

        var updateUI = function() {
            if (plugin.settings.address == '') {
                $('#mm-i2c-dialog-select').hide();
            } else {
                $('#mm-i2c-dialog-select').show();
            }
        }

        var buildUI = function() {
            $('#mm-i2c-dialog').modal({
                keyboard: false,
                width: 800
            });

            $('#mm-i2c-dialog').on('hidden.bs.modal', function () {
                plugin.settings.deviceTable.off('click', 'tbody tr');

                $('#mm-i2c-dialog-tab-detected-devices').DataTable().destroy()
                $('#mm-i2c-dialog-tab-library-library').DataTable().destroy()
            });

        }

        plugin.destroy = function () {
			$('#mm-i2c-dialog-tab-library-library').DataTable().destroy()
			$('#mm-i2c-dialog-tab-detected-devices').DataTable().destroy()
            $(document).removeData('allskyI2C')
        }

        plugin.init();       
    }

    $.fn.allskyI2C = function (options) {
        return this.each(function () {
            if (undefined == $(this).data('allskyI2C')) {
                var plugin = new $.allskyI2C(this, options);
                $(this).data('allskyI2C', plugin);
            }
        });
    }

})(jQuery);