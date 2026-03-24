;(function ($) {
  $.allskyGPIO = function (options) {
    var defaults = {
      id: "gpio",
      dirty: false,
      gpio: null,
      gpioSelected: function (gpio) {},
      gpioData: {
        top: {
          "2": { stroke: "#ff0000", fill: "white", text: "black", label: "5V", desc: "Power", labelBack: "#ffcccc", labelColour: "black", selectable: false },
          "4": { stroke: "#ff0000", fill: "white", text: "black", label: "5V", desc: "Power", labelBack: "#ffcccc", labelColour: "black", selectable: false },
          "6": { stroke: "white", fill: "black", text: "white", label: "Ground", desc: "", labelBack: "#dddddd", labelColour: "black", selectable: false },
          "8": { stroke: "#9933ff", fill: "white", text: "black", label: "GPIO14", desc: "UARTTO_TXD", labelBack: "#e6e6ff", labelColour: "black", selectable: true, pin: 14 },
          "10": { stroke: "#9933ff", fill: "white", text: "black", label: "GPIO15", desc: "UARTTO_RXD", labelBack: "#e6e6ff", labelColour: "black", selectable: true, pin: 15 },
          "12": { stroke: "#00cc00", fill: "white", text: "black", label: "GPIO18", desc: "PCM_CLK", labelBack: "#ccffcc", labelColour: "black", selectable: true, pin: 18 },
          "14": { stroke: "white", fill: "black", text: "white", label: "Ground", desc: "", labelBack: "#dddddd", labelColour: "black", selectable: false },
          "16": { stroke: "#00cc00", fill: "white", text: "black", label: "GPIO23", desc: "", labelBack: "#ccffcc", labelColour: "black", selectable: true, pin: 23 },
          "18": { stroke: "#00cc00", fill: "white", text: "black", label: "GPIO24", desc: "", labelBack: "#ccffcc", labelColour: "black", selectable: true, pin: 24 },
          "20": { stroke: "white", fill: "black", text: "white", label: "Ground", desc: "", labelBack: "#dddddd", labelColour: "black", selectable: false },
          "22": { stroke: "#00cc00", fill: "white", text: "black", label: "GPIO25", desc: "", labelBack: "#ccffcc", labelColour: "black", selectable: true, pin: 25 },
          "24": { stroke: "#3333ff", fill: "white", text: "black", label: "GPIO8", desc: "SPIO_CE0_N", labelBack: "#cfe7f5", labelColour: "black", selectable: true, pin: 8 },
          "26": { stroke: "#3333ff", fill: "white", text: "black", label: "GPIO7", desc: "SPIO_CE1_N", labelBack: "#cfe7f5", labelColour: "black", selectable: true, pin: 7 },
          "28": { stroke: "#ffff00", fill: "white", text: "black", label: "ID_SC", desc: "I2C ID EEPROM", labelBack: "#ffffcc", labelColour: "black", selectable: false },
          "30": { stroke: "white", fill: "black", text: "white", label: "Ground", desc: "", labelBack: "#dddddd", labelColour: "black", selectable: false },
          "32": { stroke: "#00cc00", fill: "white", text: "black", label: "GPIO12", desc: "", labelBack: "#ccffcc", labelColour: "black", selectable: true, pin: 12 },
          "34": { stroke: "white", fill: "black", text: "white", label: "Ground", desc: "", labelBack: "#dddddd", labelColour: "black", selectable: false },
          "36": { stroke: "#00cc00", fill: "white", text: "black", label: "GPIO16", desc: "", labelBack: "#ccffcc", labelColour: "black", selectable: true, pin: 16 },
          "38": { stroke: "#00cc00", fill: "white", text: "black", label: "GPIO20", desc: "", labelBack: "#ccffcc", labelColour: "black", selectable: true, pin: 20 },
          "40": { stroke: "#00cc00", fill: "white", text: "black", label: "GPIO21", desc: "", labelBack: "#ccffcc", labelColour: "black", selectable: true, pin: 21 }
        },
        bottom: {
          "1": { stroke: "#ff950e", fill: "white", text: "black", label: "3V3", desc: "Power", labelBack: "#ffcc99", labelColour: "black", selectable: false },
          "3": { stroke: "#ff33ff", fill: "white", text: "black", label: "GPIO2", desc: "SDA1 I2C", labelBack: "#ffccff", labelColour: "black", selectable: true, pin: 2 },
          "5": { stroke: "#ff33ff", fill: "white", text: "black", label: "GPIO3", desc: "SCL1 I2C", labelBack: "#ffccff", labelColour: "black", selectable: true, pin: 3 },
          "7": { stroke: "#00cc00", fill: "white", text: "black", label: "GPIO4", desc: "", labelBack: "#ccffcc", labelColour: "black", selectable: true, pin: 4 },
          "9": { stroke: "white", fill: "black", text: "white", label: "Ground", desc: "", labelBack: "#dddddd", labelColour: "black", selectable: false },
          "11": { stroke: "#00cc00", fill: "white", text: "black", label: "GPIO17", desc: "", labelBack: "#ccffcc", labelColour: "black", selectable: true, pin: 17 },
          "13": { stroke: "#00cc00", fill: "white", text: "black", label: "GPIO27", desc: "", labelBack: "#ccffcc", labelColour: "black", selectable: true, pin: 27 },
          "15": { stroke: "#00cc00", fill: "white", text: "black", label: "GPIO22", desc: "", labelBack: "#ccffcc", labelColour: "black", selectable: true, pin: 22 },
          "17": { stroke: "#ff950e", fill: "white", text: "black", label: "3V3", desc: "Power", labelBack: "#ffcc99", labelColour: "black", selectable: false },
          "19": { stroke: "#3333ff", fill: "white", text: "black", label: "GPIO10", desc: "SPIO_MOSI", labelBack: "#cfe7f5", labelColour: "black", selectable: true, pin: 10 },
          "21": { stroke: "#3333ff", fill: "white", text: "black", label: "GPIO9", desc: "SPIO_MISO", labelBack: "#cfe7f5", labelColour: "black", selectable: true, pin: 9 },
          "23": { stroke: "#3333ff", fill: "white", text: "black", label: "GPIO11", desc: "SPIO_SCLK", labelBack: "#cfe7f5", labelColour: "black", selectable: true, pin: 11 },
          "25": { stroke: "white", fill: "black", text: "white", label: "Ground", desc: "", labelBack: "#dddddd", labelColour: "black", selectable: false },
          "27": { stroke: "#ffff00", fill: "white", text: "black", label: "ID_SD", desc: "I2C ID EEPROM", labelBack: "#ffffcc", labelColour: "black", selectable: false },
          "29": { stroke: "#00cc00", fill: "white", text: "black", label: "GPIO5", desc: "", labelBack: "#ccffcc", labelColour: "black", selectable: true, pin: 5 },
          "31": { stroke: "#00cc00", fill: "white", text: "black", label: "GPIO6", desc: "", labelBack: "#ccffcc", labelColour: "black", selectable: true, pin: 6 },
          "33": { stroke: "#00cc00", fill: "white", text: "black", label: "GPIO13", desc: "", labelBack: "#ccffcc", labelColour: "black", selectable: true, pin: 13 },
          "35": { stroke: "#00cc00", fill: "white", text: "black", label: "GPIO19", desc: "", labelBack: "#ccffcc", labelColour: "black", selectable: true, pin: 19 },
          "37": { stroke: "#00cc00", fill: "white", text: "black", label: "GPIO26", desc: "", labelBack: "#ccffcc", labelColour: "black", selectable: true, pin: 26 },
          "39": { stroke: "white", fill: "black", text: "white", label: "Ground", desc: "", labelBack: "#dddddd", labelColour: "black", selectable: false }
        }
      }
    };

    var plugin = this;
    plugin.settings = {};
    plugin.gpioId = options.id + "-allskygpio";
    plugin.gpioContainerId = options.id + "-allskygpio-container";
    plugin._modalInstance = null;

    plugin.init = function () {
      plugin.settings = $.extend({}, defaults, options);

      var gpioHTML =
        '<div class="modal fade" id="' + plugin.gpioId + '" tabindex="-1" aria-hidden="true">' +
        '  <div class="modal-dialog modal-lg" role="document">' +
        '    <div class="modal-content" style="width: 885px">' +
        '      <div class="modal-header">' +
        '        <h5 class="modal-title">Select GPIO Pin</h5>' +
        '        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>' +
        '      </div>' +
        '      <div class="modal-body">' +
        '        <div class="oe-roi" id="' + plugin.gpioContainerId + '"></div>' +
        '      </div>' +
        '      <div class="modal-footer">' +
        '        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>' +
        '        <button type="button" class="btn btn-primary" id="' + plugin.gpioId + '-save">Save</button>' +
        '      </div>' +
        '    </div>' +
        '  </div>' +
        '</div>';

      $("#" + plugin.gpioId).remove();
      $(document.body).append(gpioHTML);

      // Save handler (kept as delegated in case dialog gets rebuilt)
      $(document).on("click", "#" + plugin.gpioId + "-save", function () {
        plugin.settings.gpioSelected.call(this, plugin.settings.gpio);
        if (plugin._modalInstance) plugin._modalInstance.hide();
      });

      // Build the Konva stage
      var stage = new Konva.Stage({
        container: plugin.gpioContainerId,
        width: 850,
        height: 350
      });

      function drawGPIOPins() {
        stage.clear();
        var layer = new Konva.Layer();
        stage.add(layer);

        var background = new Konva.Rect({ width: 850, height: 400, fill: "#222222" });
        layer.add(background);

        var pinBorder = new Konva.Rect({
          x: 0,
          y: 120,
          width: 850,
          height: 100,
          stroke: "red",
          strokeWidth: 5,
          fill: "#444444"
        });
        layer.add(pinBorder);

        var x = 30;
        for (var pin in plugin.settings.gpioData.top) {
          if (!Object.prototype.hasOwnProperty.call(plugin.settings.gpioData.top, pin)) continue;
          var pinData = plugin.settings.gpioData.top[pin];

          var circleColour = convertColour(pinData.fill, pinData);
          var circleStroke = convertColour(pinData.stroke, pinData);
          var textColour = convertColour(pinData.text, pinData);
          var descRectBackColour = convertColour(pinData.labelBack, pinData);
          var labelColour = convertColour(pinData.labelColour, pinData);

          var pinNumber = false;
          if (pinData.pin !== undefined) {
            pinNumber = pinData.pin;
            if (plugin.settings.gpio == pinData.pin) {
              circleColour = "#ff0000";
              circleStroke = "#830606";
              descRectBackColour = "#ff0000";
            }
          }

          var group = new Konva.Group({ id: pinNumber });

          var circle = new Konva.Circle({
            x: x,
            y: 150,
            radius: 16,
            fill: circleColour,
            stroke: circleStroke,
            strokeWidth: 5
          });
          group.add(circle);

          var text = new Konva.Text({
            x: x - 16,
            y: 142,
            text: pin,
            fontSize: 16,
            fontFamily: "Tahoma",
            fill: textColour,
            width: 32,
            align: "center"
          });
          group.add(text);

          var textRect = new Konva.Rect({
            x: x - 18,
            y: 25,
            width: 35,
            height: 92,
            fill: descRectBackColour
          });
          group.add(textRect);

          text = new Konva.Text({
            x: x - 16,
            y: 113,
            text: pinData.label,
            fontSize: 18,
            fontFamily: "Tahoma",
            fontStyle: "bold",
            fill: labelColour,
            width: 100,
            rotation: 270
          });
          group.add(text);

          text = new Konva.Text({
            x: x + 2,
            y: 113,
            text: pinData.desc,
            fontSize: 12,
            fontFamily: "Tahoma",
            fill: labelColour,
            width: 100,
            rotation: 270
          });

          if (pinData.selectable) {
            group.on("click", function (e) {
              var p = e.currentTarget.id();
              plugin.settings.gpio = p;
              drawGPIOPins();
            });
          }
          group.add(text);
          layer.add(group);

          x += 41;
        }

        x = 30;
        for (var pinB in plugin.settings.gpioData.bottom) {
          if (!Object.prototype.hasOwnProperty.call(plugin.settings.gpioData.bottom, pinB)) continue;
          var pinDataB = plugin.settings.gpioData.bottom[pinB];

          var circleColourB = convertColour(pinDataB.fill, pinDataB);
          var circleStrokeB = convertColour(pinDataB.stroke, pinDataB);
          var textColourB = convertColour(pinDataB.text, pinDataB);
          var descRectBackColourB = convertColour(pinDataB.labelBack, pinDataB);
          var labelColourB = convertColour(pinDataB.labelColour, pinDataB);

          var pinNumberB = false;
          if (pinDataB.pin !== undefined) {
            pinNumberB = pinDataB.pin;
            if (plugin.settings.gpio == pinDataB.pin) {
              circleColourB = "#ff0000";
              circleStrokeB = "#830606";
              descRectBackColourB = "#ff0000";
            }
          }

          var groupB = new Konva.Group({ id: pinNumberB });

          var circleB = new Konva.Circle({
            x: x,
            y: 190,
            radius: 16,
            fill: circleColourB,
            stroke: circleStrokeB,
            strokeWidth: 5
          });
          groupB.add(circleB);

          var fontStyle = "";
          if (plugin.settings.gpio !== undefined && pinDataB.pin !== undefined) {
            if (plugin.settings.gpio == pinDataB.pin) fontStyle = "bold";
          }

          var textB = new Konva.Text({
            x: x - 16,
            y: 182,
            text: pinB,
            fontSize: 16,
            fontFamily: "Tahoma",
            fontStyle: fontStyle,
            fill: textColourB,
            width: 32,
            align: "center"
          });
          groupB.add(textB);

          var textRectB = new Konva.Rect({
            x: x - 18,
            y: 223,
            width: 35,
            height: 92,
            fill: descRectBackColourB
          });
          groupB.add(textRectB);

          textB = new Konva.Text({
            x: x + 15,
            y: 225,
            text: pinDataB.label,
            fontSize: 18,
            fontFamily: "Tahoma",
            fontStyle: "bold",
            fill: labelColourB,
            width: 100,
            rotation: 90
          });
          groupB.add(textB);

          textB = new Konva.Text({
            x: x - 2,
            y: 225,
            text: pinDataB.desc,
            fontSize: 12,
            fontFamily: "Tahoma",
            fill: labelColourB,
            width: 100,
            rotation: 90
          });

          if (pinDataB.selectable) {
            groupB.on("click", function (e) {
              var p = e.currentTarget.id();
              plugin.settings.gpio = p;
              drawGPIOPins();
            });
          }
          groupB.add(textB);
          layer.add(groupB);

          x += 41;
        }
      }

      function convertColour(colour, pinData) {
        var result = colour;
        if (!pinData.selectable) {
          if (colour === "white") result = "#666666";
          else if (colour === "black") result = "#999999";
          else if (/^#([0-9a-f]{6})$/i.test(colour)) {
            var red = parseInt(colour.substr(1, 2), 16);
            var green = parseInt(colour.substr(3, 2), 16);
            var blue = parseInt(colour.substr(5, 2), 16);
            var mono = Math.round((red + green + blue) / 3);
            result = "rgb(" + mono + "," + mono + "," + mono + ")";
          }
        }
        return result;
      }

      drawGPIOPins();

      // Bootstrap 5 modal control
      var modalEl = document.getElementById(plugin.gpioId);
      plugin._modalInstance = new bootstrap.Modal(modalEl, {
        backdrop: "static",
        keyboard: false
      });
      plugin._modalInstance.show();
    };

    plugin.destroy = function () {
      // Remove delegated handler for this instance’s save button
      $(document).off("click", "#" + plugin.gpioId + "-save");
      // Dispose and remove modal
      var modalEl = document.getElementById(plugin.gpioId);
      if (modalEl) {
        var inst = bootstrap.Modal.getInstance(modalEl);
        if (inst) inst.dispose();
        $("#" + plugin.gpioId).remove();
      }
      $(document).removeData("allskyGPIO");
    };

    plugin.init();
  };

  $.fn.allskyGPIO = function (options) {
    return this.each(function () {
      if (undefined == $(this).data("allskyGPIO")) {
        var plugin = new $.allskyGPIO(options || {});
        $(this).data("allskyGPIO", plugin);
      }
    });
  };
})(jQuery);
