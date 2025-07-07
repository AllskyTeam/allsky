"use strict";

; (function ($) {

    $.allskyI2C = function (element, options) {
        var defaults = {
            data: {},
            active: true,
            id: 'oe-i2c',
            modalid: 'oe-i2c-modal',
            dirty: false,
            address: '',
            bus: 1,
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
            addDialogHTML();
            getData();
            if (Object.keys(plugin.settings.installedDevices).length === 0) {

                $(`#${plugin.settings.modalid}`).modal({
                    keyboard: false,
                    width: 900
                });

                $('.have-i2c').addClass('hidden');
                $('#dont-have-i2c').removeClass('hidden');
            } else {
                createTables();
                buildUI();
                updateUI();
                setupEvents();
            }
        }

        var getData = function () {
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
            for (let address in plugin.settings.deviceList) {
                data.push({
                    'address': address,
                    'devices': plugin.settings.deviceList[address]
                });
            }
            plugin.settings.deviceListData = data;

            $('body').LoadingOverlay('hide')
        }

        var addressToDecinal = function (address) {
            address = address.replace('0x', '');

            let intAddress = parseInt(address, 16);

            return intAddress
        }

        var boldFirstWord = function (text) {
            return text.replace(/^(\S+)/, '<strong>$1</strong>');
        }

        var createTables = function () {

            $('#mm-i2c-dialog-tab-detected-devices').DataTable().destroy()
            $('#mm-i2c-dialog-tab-library-library').DataTable().destroy()

            plugin.settings.deviceTable = $('#mm-i2c-dialog-tab-detected-devices').DataTable({
                data: plugin.settings.detected,
                retrieve: true,
                autoWidth: false,
                pagingType: 'simple_numbers',
                select: {
                    style: 'single'
                },
                paging: true,
                info: true,
                ordering: false,
                searching: true,
                pageLength: 5,
                lengthMenu: [[5, 10, -1], [5, 10, 'All']],
                rowId: 'id',
                order: [[0, 'asc']],
                columns: [
                    {
                        data: 'address',
                        width: '100px',
                        type: 'string',
                        className: 'v-align-top'
                    }, {
                        data: null,
                        width: '400px',
                        render: function (item, type, row, meta) {
                            let devicesList = '';
                            let len = Math.ceil((item.devices.length / 2));
                            for (let entry in item.devices) {
                                if (entry < len) {
                                    devicesList += '&#x2022; ' + boldFirstWord(item.devices[entry].device) + '<br/>';
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
                                    devicesList += '&#x2022; ' + boldFirstWord(item.devices[entry].device) + '<br/>';
                                }
                            }
                            devicesList += '<br/>';

                            return devicesList;
                        }
                    }

                ]
            });

            /*  let selectedRow = -1;
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
  */
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
                lengthMenu: [[5, 10, -1], [5, 10, 'All']],
                rowId: 'id',
                order: [[0, 'asc']],
                columns: [
                    {
                        data: 'address',
                        width: '100px',
                        type: 'string',
                        className: 'v-align-top'
                    }, {
                        data: null,
                        width: '400px',
                        render: function (item, type, row, meta) {
                            let devicesList = '';
                            for (let entry in item.devices) {
                                devicesList += '&#x2022; ' + boldFirstWord(item.devices[entry].device) + '<br/>';
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

        var addDialogHTML = function () {
            $(`#${plugin.settings.modalid}`).remove();
            $('body').append(`
                <div class="modal" role="dialog" id="${plugin.settings.modalid}">
                    <div class="modal-dialog modal-lg" role="document">
                        <div class="modal-content">
                            <div class="modal-header">
                                <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                                <h4 class="modal-title">i2c Selector</h4>
                            </div>
                            <div class="modal-body">
                                <div class="panel panel-default panel-shadow hidden" id="dont-have-i2c">
                                    <div class="panel-heading">
                                        <h3 class="panel-title text-danger">i2c Error</h3>
                                    </div>
                                    <div class="panel-body">
                                        <blockquote>i2c is not enabled on your Pi. Please use the raspi-config utility to enable the i2c interface. Please refer to the troubleshooting section of the Allsky documentation for more information.</blockquote>
                                        <h4>Once i2c is enabled please close and reopen this dialog.</h4>
                                    </div>
                                </div>
                                <div class="panel panel-default panel-shadow have-i2c">
                                    <div class="panel-body">
                                        <form id="as-i2c-bus-select-form" class="form-horizontal hidden">
                                            <label for="bus-select" class="col-sm-2 control-label">Select Bus</label>
                                            <div class="col-sm-4">
                                                <select id="as-i2c-bus-select" class="form-control">
                                                </select>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                                <div class="panel panel-default panel-shadow have-i2c">                                
                                    <ul class="nav nav-tabs" role="tablist">
                                        <li role="presentation" class="active"><a href="#mm-i2c-dialog-tab-detected" role="tab" data-toggle="tab">Detected Devices</a></li>
                                        <li role="presentation"><a href="#mm-i2c-dialog-tab-library" aria-controls="profile" role="tab" data-toggle="tab">i2c Library</a></li>
                                        <li role="presentation"><a href="#mm-i2c-dialog-tab-help" aria-controls="profile" role="tab" data-toggle="tab">Help</a></li>
                                    </ul>
                                    <div class="alert alert-danger mt-5" id="mm-i2c-error" style="display: none" role="alert">No i2c devices found. Please check that i2c is enabled using the raspi-config tool</div>
                                    <div class="panel panel-default mt-5" id="mm-i2c-data-missing" style="display: none">
                                        <div class="panel-heading">
                                            <h3 class="panel-title">i2c Library missing</h3>
                                        </div>
                                        <div class="panel-body">
                                            <p>The i2c library is not installed. To create the library please click the button below. The update can take several minutes.</p>
                                            <div class="text-center">
                                                <button class="btn btn-primary mm-i2c-create-library" >Create Library</button>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="tab-content">
                                        <div role="tabpanel" class="tab-pane active" id="mm-i2c-dialog-tab-detected">
                                            <table id="mm-i2c-dialog-tab-detected-devices" class="display i2ctable" style="width:98%">
                                                <thead>
                                                    <tr>
                                                        <th>Address</th>
                                                        <th>Possible Devices</th>
                                                        <th></th>                                        
                                                    </tr>
                                                </thead>
                                            </table>
                                        </div>
                                        <div role="tabpanel" class="tab-pane" id="mm-i2c-dialog-tab-library">
                                            <div id="oe-item-list-dialog-all-table">
                                                <table id="mm-i2c-dialog-tab-library-library" class="display compact i2ctable" style="width:98%">
                                                    <thead>
                                                        <tr>
                                                            <th>Address</th>
                                                            <th>Devices</th>
                                                            <th>Address Range</th>
                                                            <th>Link</th>
                                                        </tr>
                                                    </thead>
                                                </table>
                                            </div>
                                        </div>
                                        <div role="tabpanel" class="tab-pane" id="mm-i2c-dialog-tab-help">
                                            <h3>Information</h3>
                                            <p>This dialog allows you to select the required i2c address by providing a list of devices addresses detected on your Pi and a list of possible devices.</p>
                                            <p><strong>NOTE:</strong> The devices listed are only possible devices. If you are sure you know the address you require but your device is not listed please select the address anyway.</p>
                                            <p>The hardware and address data used in this dialog has been provided by Adafruit, see <a href="https://github.com/adafruit/I2C_Addresses" target="_blank">Adafruit i2c list</a></p>
                                            <br>
                                            <h4>Detected Devices</h4>
                                            <p>Since multiple hardware devices can share the same i2c address This tab displays the devices that have been detected and a list of possible devices</p>
                                            <p>Select the relevant address by clicking on the row.</p>
                                            <h4>i2c Library</h4>
                                            <p>This tab shows a list of knows i2c hardware devices and the addresses they occupy. Given that new devices are released frequntly this list may not be uptodate</p>
                                        </div>                        
                                    </div>
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-primary pull-left mm-i2c-create-library" >Update Database</button>
                                    <button type="button" class="btn btn-danger" data-dismiss="modal" id="mm-i2c-dialog-cancel">Close</button>
                                    <button type="submit" class="btn btn-primary have-i2c" id="mm-i2c-dialog-select">Select</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `);
        }

        var setupEvents = function () {
            $('#mm-i2c-dialog-select').off('click').on('click', (e) => {
                plugin.settings.i2cSelected.call(this, plugin.settings.address, plugin.settings.bus);
                $(`#${plugin.settings.modalid}`).modal('hide');
            })

            $('.mm-i2c-create-library').on('click', (e) => {
                $('body').LoadingOverlay('show', {
                    background: 'rgba(0, 0, 0, 0.5)',
                    imageColor: '#a94442',
                    textColor: '#a94442',
                    text: 'Building i2c Database'
                });

                $.ajax({
                    url: 'includes/i2cutil.php?request=Build',
                    type: 'GET',
                    dataType: 'json',
                    cache: false
                })
                    .always(() => {
                        getData();
                        setI2CBus(1);
                        createTables();
                        updateUI();
                        $('body').LoadingOverlay('hide')
                    });
            });

            $('#as-i2c-bus-select').off('change').on('change', function () {
                const bus = $(this).val();
                setI2CBus(bus);
            });
        }

        var setI2CBus = function (bus) {
            let data = [];
            if (plugin.settings.installedDevices[bus] === undefined) {
                bus = 1
            }
            for (let deviceNumber in plugin.settings.installedDevices[bus].devices) {
                let deviceAddress = plugin.settings.installedDevices[bus].devices[deviceNumber];
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
            plugin.settings.bus = parseInt(bus);

            plugin.settings.deviceTable.clear();
            plugin.settings.deviceTable.rows.add(data);
            plugin.settings.deviceTable.draw();
        }

        var updateUI = function () {
            const count = Object.keys(plugin.settings.installedDevices).length;
            if (count > 1) {
                $('#as-i2c-bus-select-form').removeClass('hidden');
            }

            if (plugin.settings.address == '') {
                $('#mm-i2c-dialog-select').hide();
            } else {
                $('#mm-i2c-dialog-select').show();
            }

            if (plugin.settings.installedDevices[1].devices == 0) {
                $('#mm-i2c-dialog-tab-detected-devices_wrapper').hide();
                $('#mm-i2c-dialog-tab-library-library_wrapper').hide();
                $('#mm-i2c-error').show();
            } else {
                $('#mm-i2c-dialog-tab-detected-devices_wrapper').show();
                $('#mm-i2c-dialog-tab-library-library_wrapper').show();
                $('#mm-i2c-error').hide();

                if (plugin.settings.deviceListData.length == 0) {
                    $('#mm-i2c-dialog-tab-detected-devices_wrapper').hide();
                    $('#mm-i2c-dialog-tab-library-library_wrapper').hide();
                    $('#mm-i2c-data-missing').show();
                } else {
                    $('#mm-i2c-dialog-tab-detected-devices_wrapper').show();
                    $('#mm-i2c-dialog-tab-library-library_wrapper').show();
                    $('#mm-i2c-data-missing').hide();
                }
            }
        }

        var buildUI = function () {
            const count = Object.keys(plugin.settings.installedDevices).length;
            if (count > 1) {
                $('#as-i2c-bus-select-form').removeClass('hidden');
            }
            var select = $('#as-i2c-bus-select');
            select.empty();
            Object.keys(plugin.settings.installedDevices).forEach((bus) => {
                select.append('<option value="' + bus + '">Bus ' + bus + '</option>');
            });

            $(`#${plugin.settings.modalid}`).modal({
                keyboard: false,
                width: 900
            });

            $(`#${plugin.settings.modalid}`).off('hidden.bs.modal').on('hidden.bs.modal', function () {
                plugin.settings.deviceTable.off('click', 'tbody tr');

                $('#mm-i2c-dialog-tab-detected-devices').DataTable().destroy()
                $('#mm-i2c-dialog-tab-library-library').DataTable().destroy()
            });

            setI2CBus(plugin.settings.bus);
            $('#as-i2c-bus-select').val(plugin.settings.bus);
            plugin.settings.deviceTable.rows().deselect(); 
            plugin.settings.deviceTable.rows().every(function () {
                var data = this.data();
                if (data.address === plugin.settings.address) {
                    this.select();
                }
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