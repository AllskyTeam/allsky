; (function ($) {

    $.allskyGPIO = function (options) {
        var defaults = {
            id: "gpio",
            dirty: false,
            gpio: null,
            gpioSelected: function (gpio) { },
            gpioData: {
                'top': {
                    '2': {
                        stroke: '#ff0000',
                        fill: 'white',
                        text: 'black',
                        label: '5V',
                        desc: 'Power',
                        labelBack: '#ffcccc',
                        labelColour: 'black',
                        selectable: false
                    },
                    '4': {
                        stroke: '#ff0000',
                        fill: 'white',
                        text: 'black',
                        label: '5V',
                        desc: 'Power',
                        labelBack: '#ffcccc',
                        labelColour: 'black',
                        selectable: false
                    },
                    '6': {
                        stroke: 'white',
                        fill: 'black',
                        text: 'white',
                        label: 'Ground',
                        desc: '',
                        labelBack: '#dddddd',
                        labelColour: 'black',
                        selectable: false                        
                    },
                    '8': {
                        stroke: '#9933ff',
                        fill: 'white',
                        text: 'black',
                        label: 'GPIO14',
                        desc: 'UARTTO_TXD',
                        labelBack: '#e6e6ff',
                        labelColour: 'black' ,
                        selectable: true,
                        pin: 14                                               
                    },
                    '10': {
                        stroke: '#9933ff',
                        fill: 'white',
                        text: 'black',
                        label: 'GPIO15',
                        desc: 'UARTTO_RXD',
                        labelBack: '#e6e6ff',
                        labelColour: 'black',
                        selectable: true,
                        pin: 15                      
                    },
                    '12': {
                        stroke: '#00cc00',
                        fill: 'white',
                        text: 'black',
                        label: 'GPIO18',
                        desc: 'PCM_CLK',
                        labelBack: '#ccffcc',
                        labelColour: 'black',
                        selectable: true,
                        pin: 18                          
                    },
                    '14': {
                        stroke: 'white',
                        fill: 'black',
                        text: 'white',
                        label: 'Ground',
                        desc: '',
                        labelBack: '#dddddd',
                        labelColour: 'black',
                        selectable: false   
                    },
                    '16': {
                        stroke: '#00cc00',
                        fill: 'white',
                        text: 'black',
                        label: 'GPIO23',
                        desc: '',
                        labelBack: '#ccffcc',
                        labelColour: 'black',
                        selectable: true,
                        pin: 23
                    },
                    '18': {
                        stroke: '#00cc00',
                        fill: 'white',
                        text: 'black',
                        label: 'GPIO24',
                        desc: '',
                        labelBack: '#ccffcc',
                        labelColour: 'black',
                        selectable: true,
                        pin: 24
                    },
                    '20': {
                        stroke: 'white',
                        fill: 'black',
                        text: 'white',
                        label: 'Ground',
                        desc: '',
                        labelBack: '#dddddd',
                        labelColour: 'black',
                        selectable: false  
                    },
                    '22': {
                        stroke: '#00cc00',
                        fill: 'white',
                        text: 'black',
                        label: 'GPIO25',
                        desc: '',
                        labelBack: '#ccffcc',
                        labelColour: 'black',
                        selectable: true,
                        pin: 25
                    },
                    '24': {
                        stroke: '#3333ff',
                        fill: 'white',
                        text: 'black',
                        label: 'GPIO8',
                        desc: 'SPIO_CE0_N',
                        labelBack: '#cfe7f5',
                        labelColour: 'black',
                        selectable: true,
                        pin: 8                  
                    },
                    '26': {
                        stroke: '#3333ff',
                        fill: 'white',
                        text: 'black',
                        label: 'GPIO7',
                        desc: 'SPIO_CE1_N',
                        labelBack: '#cfe7f5',
                        labelColour: 'black',
                        selectable: true,
                        pin: 7
                    },
                    '28': {
                        stroke: '#ffff00',
                        fill: 'white',
                        text: 'black',
                        label: 'ID_SC',
                        desc: 'I2C ID EEPROM',
                        labelBack: '#ffffcc',
                        labelColour: 'black',
                        selectable: false  
                    },
                    '30': {
                        stroke: 'white',
                        fill: 'black',
                        text: 'white',
                        label: 'Ground',
                        desc: '',
                        labelBack: '#dddddd',
                        labelColour: 'black',
                        selectable: false  
                    }, 
                    '32': {
                        stroke: '#00cc00',
                        fill: 'white',
                        text: 'black',
                        label: 'GPIO12',
                        desc: '',
                        labelBack: '#ccffcc',
                        labelColour: 'black',
                        selectable: true,
                        pin: 12
                    },
                    '34': {
                        stroke: 'white',
                        fill: 'black',
                        text: 'white',
                        label: 'Ground',
                        desc: '',
                        labelBack: '#dddddd',
                        labelColour: 'black',
                        selectable: false
                    },
                    '36': {
                        stroke: '#00cc00',
                        fill: 'white',
                        text: 'black',
                        label: 'GPIO16',
                        desc: '',
                        labelBack: '#ccffcc',
                        labelColour: 'black',
                        selectable: true,
                        pin: 16
                    },
                    '38': {
                        stroke: '#00cc00',
                        fill: 'white',
                        text: 'black',
                        label: 'GPIO20',
                        desc: '',
                        labelBack: '#ccffcc',
                        labelColour: 'black',
                        selectable: true,
                        pin: 20
                    },
                    '40': {
                        stroke: '#00cc00',
                        fill: 'white',
                        text: 'black',
                        label: 'GPIO21',
                        desc: '',
                        labelBack: '#ccffcc',
                        labelColour: 'black',
                        selectable: true,
                        pin: 21
                    }                                                                                                                                                
                },
                'bottom' : {
                    '1': {
                        stroke: '#ff950e',
                        fill: 'white',
                        text: 'black',
                        label: '3V3',
                        desc: 'Power',
                        labelBack: '#ffcc99',
                        labelColour: 'black',
                        selectable: false
                    },
                    '3': {
                        stroke: '#ff33ff',
                        fill: 'white',
                        text: 'black',
                        label: 'GPIO2',
                        desc: 'SDA1 I2C',
                        labelBack: '#ffccff',
                        labelColour: 'black',
                        selectable: true,
                        pin: 2
                    },
                    '5': {
                        stroke: '#ff33ff',
                        fill: 'white',
                        text: 'black',
                        label: 'GPIO3',
                        desc: 'SCL1 I2C',
                        labelBack: '#ffccff',
                        labelColour: 'black',
                        selectable: true,
                        pin: 3
                    },
                    '7': {
                        stroke: '#00cc00',
                        fill: 'white',
                        text: 'black',
                        label: 'GPIO4',
                        desc: '',
                        labelBack: '#ccffcc',
                        labelColour: 'black',
                        selectable: true,
                        pin: 4
                    },
                    '9': {
                        stroke: 'white',
                        fill: 'black',
                        text: 'white',
                        label: 'Ground',
                        desc: '',
                        labelBack: '#dddddd',
                        labelColour: 'black',
                        selectable: false
                    },
                    '11': {
                        stroke: '#00cc00',
                        fill: 'white',
                        text: 'black',
                        label: 'GPIO17',
                        desc: '',
                        labelBack: '#ccffcc',
                        labelColour: 'black',
                        selectable: true,
                        pin: 17
                    }, 
                    '13': {
                        stroke: '#00cc00',
                        fill: 'white',
                        text: 'black',
                        label: 'GPIO27',
                        desc: '',
                        labelBack: '#ccffcc',
                        labelColour: 'black',
                        selectable: true,
                        pin: 27
                    }, 
                    '15': {
                        stroke: '#00cc00',
                        fill: 'white',
                        text: 'black',
                        label: 'GPIO22',
                        desc: '',
                        labelBack: '#ccffcc',
                        labelColour: 'black',
                        selectable: true,
                        pin: 22
                    },
                    '17': {
                        stroke: '#ff950e',
                        fill: 'white',
                        text: 'black',
                        label: '3V3',
                        desc: 'Power',
                        labelBack: '#ffcc99',
                        labelColour: 'black',
                        selectable: false
                    },
                    '19': {
                        stroke: '#3333ff',
                        fill: 'white',
                        text: 'black',
                        label: 'GPIO10',
                        desc: 'SPIO_MOSI',
                        labelBack: '#cfe7f5',
                        labelColour: 'black',
                        selectable: true,
                        pin: 18
                    },
                    '21': {
                        stroke: '#3333ff',
                        fill: 'white',
                        text: 'black',
                        label: 'GPIO9',
                        desc: 'SPIO_MISO',
                        labelBack: '#cfe7f5',
                        labelColour: 'black',
                        selectable: true,
                        pin: 9
                    }, 
                    '23': {
                        stroke: '#3333ff',
                        fill: 'white',
                        text: 'black',
                        label: 'GPIO11',
                        desc: 'SPIO_SCLK',
                        labelBack: '#cfe7f5',
                        labelColour: 'black',
                        selectable: true,
                        pin: 11
                    },
                    '25': {
                        stroke: 'white',
                        fill: 'black',
                        text: 'white',
                        label: 'Ground',
                        desc: '',
                        labelBack: '#dddddd',
                        labelColour: 'black',
                        selectable: false
                    },
                    '27': {
                        stroke: '#ffff00',
                        fill: 'white',
                        text: 'black',
                        label: 'ID_SD',
                        desc: 'I2C ID EEPROM',
                        labelBack: '#ffffcc',
                        labelColour: 'black',
                        selectable: false
                    },
                    '29': {
                        stroke: '#00cc00',
                        fill: 'white',
                        text: 'black',
                        label: 'GPIO5',
                        desc: '',
                        labelBack: '#ccffcc',
                        labelColour: 'black',
                        selectable: true,
                        pin: 5
                    },
                    '31': {
                        stroke: '#00cc00',
                        fill: 'white',
                        text: 'black',
                        label: 'GPIO6',
                        desc: '',
                        labelBack: '#ccffcc',
                        labelColour: 'black',
                        selectable: true,
                        pin: 6
                    },
                    '33': {
                        stroke: '#00cc00',
                        fill: 'white',
                        text: 'black',
                        label: 'GPIO13',
                        desc: '',
                        labelBack: '#ccffcc',
                        labelColour: 'black',
                        selectable: true,
                        pin: 13
                    }, 
                    '35': {
                        stroke: '#00cc00',
                        fill: 'white',
                        text: 'black',
                        label: 'GPIO19',
                        desc: '',
                        labelBack: '#ccffcc',
                        labelColour: 'black',
                        selectable: true,
                        pin: 19
                    },
                    '37': {
                        stroke: '#00cc00',
                        fill: 'white',
                        text: 'black',
                        label: 'GPIO26',
                        desc: '',
                        labelBack: '#ccffcc',
                        labelColour: 'black',
                        selectable: true,
                        pin: 26
                    },
                    '39': {
                        stroke: 'white',
                        fill: 'black',
                        text: 'white',
                        label: 'Ground',
                        desc: '',
                        labelBack: '#dddddd',
                        labelColour: 'black',
                        selectable: false
                    }                                                                                                                                                                                                                                                                                                                                                                                                    
                }
            }
        }

        var plugin = this;

        plugin.settings = {}

        plugin.gpioId = options.id + "-allskygpio";
        plugin.gpioContainerId = options.id + "-allskygpio-container";

        plugin.init = function () {

            plugin.settings = $.extend({}, defaults, options);

            let gpioHTML = '\
                <div class="modal" role="dialog" id="' + plugin.gpioId + '">\
                    <div class="modal-dialog modal-lg" role="document">\
                        <div class="modal-content">\
                            <div class="modal-header">\
                                <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>\
                                <h4 class="modal-title">Select GPIO Pin</h4>\
                            </div>\
                            <div class="modal-body">\
                                <div class="oe-roi" id="' + plugin.gpioContainerId + '">\
                                </div>\
                            </div>\
                            <div class="modal-footer">\
                                <button type="button" class="btn btn-danger" data-dismiss="modal">Cancel</button>\
                                <button type="button" class="btn btn-primary" id="' + plugin.gpioId + '-save">Save</button>\
                            </div>\
                        </div>\
                    </div>\
                </div>\
            ';
            $('#' + plugin.gpioId).remove();
            $(document.body).append(gpioHTML);

            $(document).on('click', '#' + plugin.gpioId + '-save', (event) => {
                plugin.settings.gpioSelected.call(this, plugin.settings.gpio);
                $('#' + plugin.gpioId).modal('hide');
            });

            var containerWidth = $('#' + plugin.gpioContainerId).width();
            let stage = new Konva.Stage({
                container: plugin.gpioContainerId,
                width: 850,
                height: 350
            });

            function drawGPIOPins() {
                stage.clear();
                layer = new Konva.Layer();
                stage.add(layer);

                let background = new Konva.Rect({
                    width: 850,
                    height: 400,
                    fill: '#222222'
                });
                layer.add(background);

                let pinBorder = new Konva.Rect({
                    x:0,
                    y: 120,
                    width: 850,
                    height: 100,
                    stroke: "red",
                    strokeWidth: 5,                
                    fill: '#444444'
                });
                layer.add(pinBorder);

                x = 30
                for (pin in plugin.settings.gpioData.top) {
                    pinData = plugin.settings.gpioData.top[pin];
                    
                    let circleColour = convertColour(pinData.fill,pinData);
                    let circleStroke = convertColour(pinData.stroke,pinData);
                    let textColour = convertColour(pinData.text,pinData);
                    let descRectBackColour = convertColour(pinData.labelBack, pinData);
                    let labelColour = convertColour(pinData.labelColour,pinData);

                    pinNumber = false;
                    if (pinData.pin !== undefined) {
                        pinNumber = pinData.pin;

                        if (plugin.settings.gpio == pinData.pin) {
                            circleColour = '#ff0000';
                            circleStroke = '#830606';
                            descRectBackColour = '#ff0000';
                        }
                    }

                    var group = new Konva.Group({
                        id: pinNumber
                    });

                    var circle = new Konva.Circle({
                        x: x,
                        y: 150,
                        radius: 16,
                        fill: circleColour,
                        stroke: circleStroke,
                        strokeWidth: 5,
                    });
                    group.add(circle);

                    var text = new Konva.Text({
                        x: x-16,
                        y: 142,
                        text: pin,
                        fontSize: 16,
                        fontFamily: 'Calibri',
                        fill: textColour,
                        width: 32,
                        align: 'center',
                    });
                    group.add(text);

                    var textRect = new Konva.Rect({
                        x: x-18,
                        y: 25,
                        width: 35,
                        height: 92,             
                        fill: descRectBackColour
                    });
                    group.add(textRect);

                    text = new Konva.Text({
                        x: x-16,
                        y: 113,
                        text: pinData.label,
                        fontSize: 18,
                        fontFamily: 'Calibri',
                        fontStyle: 'bold',
                        fill: labelColour,
                        width: 100,
                        rotation: 270
                    });
                    group.add(text);

                    text = new Konva.Text({
                        x: x+2,
                        y: 113,
                        text: pinData.desc,
                        fontSize: 12,
                        fontFamily: 'Calibri',
                        fill: labelColour,
                        width: 100,
                        rotation: 270
                    });

                    if (pinData.selectable) {
                        group.on('click', (e) => {
                            let pin = e.currentTarget.id();
                            plugin.settings.gpio = pin;
                            drawGPIOPins();                            
                        });
                    }
                    group.add(text);
                    layer.add(group); 

                    x += 41
                }

                x = 30
                for (pin in plugin.settings.gpioData.bottom) {
                    pinData = plugin.settings.gpioData.bottom[pin];

                    let circleColour = convertColour(pinData.fill,pinData);
                    let circleStroke = convertColour(pinData.stroke,pinData);
                    let textColour = convertColour(pinData.text,pinData);
                    let descRectBackColour = convertColour(pinData.labelBack, pinData);
                    let labelColour = convertColour(pinData.labelColour,pinData);

                    pinNumber = false;
                    if (pinData.pin !== undefined) {
                        pinNumber = pinData.pin;

                        if (plugin.settings.gpio == pinData.pin) {
                            circleColour = '#ff0000';
                            circleStroke = '#830606';
                            descRectBackColour = '#ff0000';
                        }
                    }

                    pinNumber = false;
                    if (pinData.pin !== undefined) {
                        pinNumber = pinData.pin;
                    }

                    var group = new Konva.Group({
                        id: pinNumber
                    });

                    var circle = new Konva.Circle({
                        x: x,
                        y: 190,
                        radius: 16,
                        fill: circleColour,
                        stroke: circleStroke,
                        strokeWidth: 5,
                    });
                    group.add(circle);    
                    
                    let fontStyle = '';
                    if (plugin.settings.gpio !== undefined) {
                        if (pinData.pin !== undefined) {
                            if (plugin.settings.gpio == pinData.pin) {
                                fontStyle = 'bold;'
                            }
                        }
                    }

                    var text = new Konva.Text({
                        x: x-16,
                        y: 182,
                        text: pin,
                        fontSize: 16,
                        fontFamily: 'Calibri',
                        fontStyle: fontStyle,
                        fill: textColour,
                        width: 32,
                        align: 'center',
                    });
                    group.add(text);
                    
                    var textRect = new Konva.Rect({
                        x: x-18,
                        y: 223,
                        width: 35,
                        height: 92,             
                        fill: descRectBackColour
                    });
                    group.add(textRect);

                    text = new Konva.Text({
                        x: x+15,
                        y: 225,
                        text: pinData.label,
                        fontSize: 18,
                        fontFamily: 'Calibri',
                        fontStyle: 'bold',
                        fill: labelColour,
                        width: 100,
                        rotation: 90
                    });
                    group.add(text);
                    
                    text = new Konva.Text({
                        x: x-2,
                        y: 225,
                        text: pinData.desc,
                        fontSize: 12,
                        fontFamily: 'Calibri',
                        fill: labelColour,
                        width: 100,
                        rotation: 90
                    });
                    if (pinData.selectable) {
                        group.on('click', (e) => {
                            let pin = e.currentTarget.id();
                            plugin.settings.gpio = pin;
                            drawGPIOPins();
                        });
                    }  
                    group.add(text);                              
                    layer.add(group); 

                    x += 41
                }
            }
            
            function convertColour(colour, pinData) {
                if (!pinData.selectable) {
                    if (colour =='white') {
                        colour = '#666666';
                    }
                    if (colour =='black') {
                        colour = '#999999';
                    }
                    red = colour.substr(1,2);
                    green = colour.substr(3,2)
                    blue = colour.substr(5,2)

                    red = parseInt(red, 16);
                    green = parseInt(green, 16);
                    blue = parseInt(blue, 16);
                    
                    mono = (red + green + blue) / 3;

                    result = 'rgb(' + mono.toString() + ',' + + mono.toString() + ',' + mono.toString() + ')';
                } else {
                    result = colour;
                }
                return result;
            }

            drawGPIOPins();

            $('#' + plugin.gpioId).modal({
                keyboard: false
            });
        }

        plugin.destroy = function () {
            $(document).removeData('allskyGPIO');
        }


        plugin.init();

    }

    $.fn.allskyGPIO = function (options) {
        return this.each(function () {
            if (undefined == $(this).data('allskyGPIO')) {
                var plugin = new $.allskyGPIO(this, options);
                $(this).data('allskyGPIO', plugin);
            }
        });
    }

})(jQuery);