"use strict";

(function ($) {
    var PLUGIN_NAME = "allskySensor";
    var defaults = {
        sensorsUrl: "",
        accessToken: "",
        title: "Sensor Selector",
        openButtonText: "Select Sensor",
        refreshButtonText: "Refresh",
        saveButtonText: "Save",
        selectLabel: "Sensor",
        placeholder: "Select a sensor",
        loadingText: "Loading sensors...",
        errorText: "Unable to load sensors.",
        helpText: "Choose a sensor from the list.",
        includeDescription: true,
        values: {},
        selectedSensorNumber: null,
        onLoaded: null,
        onChange: null,
        onMappingChange: null,
        onError: null
    };

    function ensureStyles() {
        return;
    }

    function uid() {
        return "ass_" + Math.random().toString(36).slice(2, 10);
    }

    function escapeHtml(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function normalizeSensor(sensor) {
        return {
            sensor_number: sensor && sensor.sensor_number != null ? String(sensor.sensor_number) : "",
            device: $.trim(sensor && sensor.device ? String(sensor.device) : ""),
            category: $.trim(sensor && sensor.category ? String(sensor.category) : ""),
            description: $.trim(sensor && sensor.description ? String(sensor.description) : ""),
            columns: $.map(Array.isArray(sensor && sensor.columns) ? sensor.columns : [], function (column) {
                return {
                    name: $.trim(column && column.name ? String(column.name) : ""),
                    type: $.trim(column && column.type ? String(column.type) : "")
                };
            }).filter(function (column) {
                return column.name !== "";
            })
        };
    }

    function normalizeValueOptions(values) {
        var normalized = [];

        $.each(values && typeof values === "object" ? values : {}, function (key, value) {
            var entry = value && typeof value === "object" ? value : {};

            normalized.push({
                key: String(key),
                name: $.trim(entry.name ? String(entry.name) : String(key)),
                type: $.trim(entry.type ? String(entry.type) : ""),
                group: $.trim(entry.group ? String(entry.group) : ""),
                description: $.trim(entry.description ? String(entry.description) : ""),
                source: $.trim(entry.source ? String(entry.source) : "")
            });
        });

        normalized = $.grep(normalized, function (entry) {
            return normalizeType(entry.source) === "sensor";
        });

        normalized.sort(function (a, b) {
            return a.key.localeCompare(b.key);
        });

        return normalized;
    }

    function stripCountPlaceholder(value) {
        return String(value == null ? "" : value).replace(/\$\{COUNT\}/g, "");
    }

    function hasCountPlaceholder(value) {
        return /\$\{COUNT\}/.test(String(value == null ? "" : value));
    }

    function stripTemplatePlaceholders(value) {
        var result = String(value == null ? "" : value);

        result = stripCountPlaceholder(result);
        while (/\$\{[^{}]*\}/.test(result)) {
            result = result.replace(/\$\{[^{}]*\}/g, "");
        }

        result = $.trim(result.replace(/\s{2,}/g, " "));
        result = result.replace(/\bfrom\s*$/i, "");

        return $.trim(result);
    }

    function normalizeType(value) {
        return $.trim(String(value || "")).toLowerCase();
    }

    function typesMatch(columnType, valueType) {
        var column = normalizeType(columnType);
        var value = normalizeType(valueType);

        if (column === "" || value === "") {
            return false;
        }

        if (column === value) {
            return true;
        }

        if ((column === "float" || column === "int" || column === "integer" || column === "double" || column === "numeric") && (value === "number" || value === "temperature")) {
            return true;
        }

        if (column === "string" && value === "gpio") {
            return false;
        }

        return false;
    }

    function tokenize(value) {
        return $.grep(
            normalizeType(value)
                .replace(/[^a-z0-9]+/g, " ")
                .split(/\s+/),
            function (token) {
                return token !== "";
            }
        );
    }

    function expandTokens(tokens) {
        var expanded = {};

        $.each(tokens, function (_, token) {
            expanded[token] = true;

            if (token.indexOf("temp") !== -1) {
                expanded.temp = true;
                expanded.temperature = true;
            }
            if (token.indexOf("humid") !== -1) {
                expanded.humid = true;
                expanded.humidity = true;
            }
            if (token.indexOf("press") !== -1) {
                expanded.press = true;
                expanded.pressure = true;
            }
            if (token.indexOf("dew") !== -1) {
                expanded.dew = true;
                expanded.dewpoint = true;
            }
            if (token.indexOf("alt") !== -1) {
                expanded.alt = true;
                expanded.altitude = true;
            }
            if (token.indexOf("control") !== -1) {
                expanded.control = true;
                expanded.state = true;
            }
            if (token.indexOf("gpio") !== -1) {
                expanded.gpio = true;
                expanded.state = true;
            }
            if (token.indexOf("co2") !== -1) {
                expanded.co2 = true;
            }
        });

        return Object.keys(expanded);
    }

    function getValueSearchText(valueOption) {
        return [
            valueOption.key,
            valueOption.name,
            valueOption.group,
            valueOption.description,
            valueOption.type
        ].join(" ");
    }

    function hasAnyToken(tokens, candidates) {
        var i;

        for (i = 0; i < candidates.length; i += 1) {
            if (tokens.indexOf(candidates[i]) !== -1) {
                return true;
            }
        }

        return false;
    }

    function isGenericNumericColumn(columnTokens) {
        return !hasAnyToken(columnTokens, [
            "temp", "temperature",
            "dew", "dewpoint",
            "humid", "humidity", "relhumidity",
            "press", "pressure",
            "alt", "altitude",
            "co2",
            "gpio", "state",
            "control"
        ]);
    }

    function normalizeUnderscoreName(value) {
        return normalizeType(value).replace(/[^a-z0-9]+/g, "_");
    }

    function detectSemanticCategory(text) {
        var normalized = normalizeUnderscoreName(text);

        if (normalized.indexOf("co2") !== -1) {
            return "co2";
        }
        if (normalized.indexOf("altitude") !== -1 || normalized.indexOf("alt_") === 0) {
            return "altitude";
        }
        if (normalized.indexOf("pressure") !== -1 || normalized.indexOf("press") !== -1) {
            return "pressure";
        }
        if (normalized.indexOf("relhumidity") !== -1 || normalized.indexOf("humidity") !== -1 || normalized.indexOf("humid") !== -1) {
            return "humidity";
        }
        if (normalized.indexOf("dew") !== -1) {
            return "dew";
        }
        if (normalized.indexOf("temperature") !== -1 || normalized.indexOf("temp") !== -1) {
            return "temperature";
        }
        if (normalized.indexOf("gpio") !== -1 || normalized.indexOf("controlstate") !== -1 || normalized.indexOf("state") !== -1) {
            return "state";
        }

        return "";
    }

    function getColumnPrefixPriority(columnName) {
        var normalized = normalizeUnderscoreName(columnName);

        if (normalized.indexOf("indoor_") === 0) {
            return 2;
        }

        if (normalized.indexOf("outdoor_") === 0) {
            return 1;
        }

        return 0;
    }

    function AllskySensor(element, options) {
        this.$el = $(element);
        this.isDocumentTarget = this.$el.length > 0 && this.$el[0] === document;
        this.options = $.extend({}, defaults, options || {});
        this.instanceId = uid();
        this.modalId = this.instanceId + "_modal";
        this.state = {
            sensors: [],
            sensorMap: {},
            values: normalizeValueOptions(this.options.values),
            mappingsBySensor: {},
            manualMappingsBySensor: {},
            hasLoaded: false,
            isLoading: false,
            selectedSensorNumber: this.options.selectedSensorNumber != null ? String(this.options.selectedSensorNumber) : ""
        };

        ensureStyles();
        this.buildModal();
        if (!this.isDocumentTarget) {
            this.renderLauncher();
        } else {
            this.$openButton = $();
        }
        this.bindEvents();
    }

    AllskySensor.prototype.renderLauncher = function () {
        var openButtonText = escapeHtml(this.options.openButtonText);
        var html = `
            <button type="button" class="btn btn-primary" data-action="open-modal">${openButtonText}</button>
        `;

        this.$el.empty().append(html);

        this.$openButton = this.$el.find("[data-action='open-modal']");
    };

    AllskySensor.prototype.buildModal = function () {
        var title = escapeHtml(this.options.title);
        var selectLabel = escapeHtml(this.options.selectLabel);
        var placeholder = escapeHtml(this.options.placeholder);
        var loadingText = escapeHtml(this.options.loadingText);
        var refreshButtonText = escapeHtml(this.options.refreshButtonText);
        var saveButtonText = escapeHtml(this.options.saveButtonText);
        var selectId = `${this.instanceId}_select`;
        var html = `
            <div class="modal" id="${this.modalId}" tabindex="-1" role="dialog" aria-hidden="true">
              <div class="modal-dialog modal-lg" role="document">
                <div class="modal-content">
                  <div class="modal-header">
                    <button type="button" class="close noborder" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                    <h4 class="modal-title">${title}</h4>
                  </div>
                  <div class="modal-body">
                    <div class="row" style="display:flex;flex-wrap:wrap;">
                      <div class="col-sm-5" style="display:flex;">
                        <div class="panel panel-default" style="width:100%;display:flex;flex-direction:column;">
                          <div class="panel-heading">${selectLabel}</div>
                          <div class="panel-body" style="height: 140px;">
                            <div class="form-group">
                              <div style="display:flex;gap:8px;align-items:center;">
                                <select class="form-control" id="${selectId}" data-role="select">
                                  <option value="">${placeholder}</option>
                                </select>
                                <button type="button" class="btn btn-default as-sensor-refresh" data-action="refresh-sensors" title="${refreshButtonText}" aria-label="${refreshButtonText}">
                                  <i class="fa-solid fa-rotate-right" aria-hidden="true"></i>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div class="col-sm-7" style="display:flex;">
                        <div class="panel panel-default" style="width:100%;display:flex;flex-direction:column;">
                          <div class="panel-heading"><span data-role="category-badge">Selected Sensor</span></div>
                          <div class="panel-body" style="height: 140px; overflow: hidden;">
                            <div class="text-muted text-center" data-role="details-empty" style="padding-top: 14px;">
                              <div style="font-size: 34px; margin-bottom: 10px;">
                                <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
                              </div>
                              <div><strong>No sensor selected</strong></div>
                              <div style="margin-top: 6px;">Choose a sensor to view its details and available API values.</div>
                            </div>
                            <div class="as-sensor-picker__details is-empty" data-role="details">
                              <h4 data-role="name"></h4>
                              <p class="text-muted" data-role="meta"></p>
                              <p data-role="description"></p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="panel panel-default as-sensor-picker__mapping is-empty" data-role="mapping">
                      <div class="panel-heading clearfix">
                        <div class="pull-left">Data Mapping</div>
                        <div class="pull-right text-muted" data-role="mapping-summary">0 mapped of 0 columns</div>
                      </div>
                      <div class="panel-body">
                        <div class="table-responsive" style="max-height: 360px; overflow-y: auto;">
                          <table class="table table-hover" data-role="mapping-table">
                            <thead>
                              <tr>
                                <th style="position: sticky; top: 0; background: #f5f5f5; z-index: 2;">Allsky Value</th>
                                <th style="position: sticky; top: 0; background: #f5f5f5; z-index: 2;">Allsky Type</th>
                                <th style="position: sticky; top: 0; background: #f5f5f5; z-index: 2;">Sensor Value</th>
                              </tr>
                            </thead>
                            <tbody data-role="mapping-list"></tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="modal-footer" style="display:flex;align-items:center;width:100%;">
                    <div style="display:flex;gap:8px;align-items:center;justify-content:flex-end;margin-left:auto;flex:0 0 auto;">
                      <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
                      <button type="button" class="btn btn-primary" data-action="save-close">${saveButtonText}</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
        `;

        $("#" + this.modalId).remove();
        $("body").append(html);

        this.$modal = $("#" + this.modalId);
        this.$select = this.$modal.find("[data-role='select']");
        this.$details = this.$modal.find("[data-role='details']");
        this.$detailsEmpty = this.$modal.find("[data-role='details-empty']");
        this.$categoryBadge = this.$modal.find("[data-role='category-badge']");
        this.$name = this.$modal.find("[data-role='name']");
        this.$meta = this.$modal.find("[data-role='meta']");
        this.$description = this.$modal.find("[data-role='description']");
        this.$mapping = this.$modal.find("[data-role='mapping']");
        this.$mappingList = this.$modal.find("[data-role='mapping-list']");
        this.$mappingTable = this.$modal.find("[data-role='mapping-table']");
        this.$mappingEmpty = this.$modal.find("[data-role='mapping-empty']");
        this.$mappingSummary = this.$modal.find("[data-role='mapping-summary']");
        this.$refreshButton = this.$modal.find("[data-action='refresh-sensors']");

        this.$details.hide();
        this.$detailsEmpty.show();
        this.renderMappings(null);
    };

    AllskySensor.prototype.bindEvents = function () {
        var self = this;

        this.onOpenButtonClick = function (event) {
            if (event && typeof event.preventDefault === "function") {
                event.preventDefault();
            }
            self.open();
            return false;
        };

        if (this.$openButton.length) {
            this.$openButton.off("." + PLUGIN_NAME).on("click." + PLUGIN_NAME, function () {
                self.open();
            });

            if (this.$openButton[0].addEventListener) {
                this.$openButton[0].addEventListener("click", this.onOpenButtonClick, false);
            }
        }

        this.$modal.off("." + PLUGIN_NAME).on("click." + PLUGIN_NAME, "[data-dismiss='modal']", function (event) {
            event.preventDefault();
            self.close();
        }).on("click." + PLUGIN_NAME, "[data-action='save-close']", function (event) {
            event.preventDefault();
            self.close();
        }).on("click." + PLUGIN_NAME, "[data-action='refresh-sensors']", function (event) {
            event.preventDefault();
            self.reload();
        }).on("click." + PLUGIN_NAME, function (event) {
            if (event.target === self.$modal[0]) {
                self.close();
            }
        });

        this.$mappingList.off("." + PLUGIN_NAME).on("change." + PLUGIN_NAME, "[data-role='mapping-select']", function () {
            var valueKey = String($(this).data("value-key") || "");
            var mappedColumn = String($(this).val() || "");
            var mapping = self.ensureSensorMapping(self.state.selectedSensorNumber);
            var manualMappings = self.ensureManualMappings(self.state.selectedSensorNumber);

            if (valueKey === "") {
                return;
            }

            manualMappings[valueKey] = true;

            if (mappedColumn === "") {
                delete mapping[valueKey];
            } else {
                mapping[valueKey] = mappedColumn;
            }

            self.renderMappings(self.getSelectedSensor());

            if (typeof self.options.onMappingChange === "function") {
                self.options.onMappingChange.call(
                    self.$el[0],
                    self.getSelectedSensor(),
                    self.getCurrentMapping(),
                    self.state.sensors.slice()
                );
            }

            if (typeof self.options.onChange === "function") {
                self.options.onChange.call(
                    self.$el[0],
                    self.getSelectedSensor(),
                    self.state.sensors.slice(),
                    self.getCurrentMapping()
                );
            }
        });

        this.$select.off("." + PLUGIN_NAME).on("change." + PLUGIN_NAME, function () {
            self.state.selectedSensorNumber = $(this).val();
            self.updateSelectedState();

            if (typeof self.options.onChange === "function") {
                self.options.onChange.call(
                    self.$el[0],
                    self.getSelectedSensor(),
                    self.state.sensors.slice(),
                    self.getCurrentMapping()
                );
            }
        });
    };

    AllskySensor.prototype.loadSensors = function () {
        var self = this;

        self.state.isLoading = true;
        self.setStatus(self.options.loadingText, false);
        self.$select.prop("disabled", true);
        self.$refreshButton.prop("disabled", true);

        $.ajax({
            url: self.options.sensorsUrl,
            type: "GET",
            dataType: "json",
            cache: false,
            timeout: 65000,
            headers: {
                Authorization: "Bearer " + self.options.accessToken
            }
        }).done(function (response) {
            var items = Array.isArray(response) ? response : [];
            self.state.sensors = $.map(items, function (item) {
                return normalizeSensor(item);
            }).filter(function (sensor) {
                return sensor.sensor_number !== "" && sensor.device !== "";
            });

            self.state.sensorMap = {};
            $.each(self.state.sensors, function (_, sensor) {
                self.state.sensorMap[sensor.sensor_number] = sensor;
            });

            self.state.hasLoaded = true;
            self.state.isLoading = false;
            self.populateSelect();
            self.$select.prop("disabled", false);
            self.$refreshButton.prop("disabled", false);
            self.setStatus(self.options.helpText, false);
            self.updateSelectedState();

            if (typeof self.options.onLoaded === "function") {
                self.options.onLoaded.call(self.$el[0], self.state.sensors.slice());
            }
        }).fail(function (xhr) {
            var errorMessage = self.options.errorText;

            if (xhr && xhr.responseJSON && xhr.responseJSON.message) {
                errorMessage += " " + xhr.responseJSON.message;
            }

            self.state.sensors = [];
            self.state.sensorMap = {};
            self.state.hasLoaded = false;
            self.state.isLoading = false;
            self.populateSelect();
            self.$select.prop("disabled", true);
            self.$refreshButton.prop("disabled", false);
            self.clearSelectedState();
            self.setStatus(errorMessage, true);

            if (typeof self.options.onError === "function") {
                self.options.onError.call(self.$el[0], xhr);
            }
        });
    };

    AllskySensor.prototype.populateSelect = function () {
        var self = this;

        self.$select.empty().append(
            $("<option>", {
                value: "",
                text: self.options.placeholder
            })
        );

        $.each(self.state.sensors, function (_, sensor) {
            self.$select.append(
                $("<option>", {
                    value: sensor.sensor_number,
                    text: sensor.device + " (#" + sensor.sensor_number + ")"
                })
            );
        });

        if (self.state.selectedSensorNumber && self.state.sensorMap[self.state.selectedSensorNumber]) {
            self.$select.val(self.state.selectedSensorNumber);
        } else {
            self.state.selectedSensorNumber = "";
            self.$select.val("");
        }
    };

    AllskySensor.prototype.setStatus = function (message, isError) {
        return;
    };

    AllskySensor.prototype.clearSelectedState = function () {
        this.$details.hide();
        this.$detailsEmpty.show();
        this.$categoryBadge.text("Selected Sensor");
        this.$name.text("");
        this.$meta.text("");
        this.$description.text("");
        this.renderMappings(null);
    };

    AllskySensor.prototype.ensureSensorMapping = function (sensorNumber) {
        if (!sensorNumber) {
            return {};
        }

        if (!this.state.mappingsBySensor[sensorNumber]) {
            this.state.mappingsBySensor[sensorNumber] = {};
        }

        return this.state.mappingsBySensor[sensorNumber];
    };

    AllskySensor.prototype.ensureManualMappings = function (sensorNumber) {
        if (!sensorNumber) {
            return {};
        }

        if (!this.state.manualMappingsBySensor[sensorNumber]) {
            this.state.manualMappingsBySensor[sensorNumber] = {};
        }

        return this.state.manualMappingsBySensor[sensorNumber];
    };

    AllskySensor.prototype.scoreValueForColumn = function (column, valueOption) {
        var score = 0;
        var columnTokens = expandTokens(tokenize(column.name + " " + column.type));
        var valueText = normalizeType(getValueSearchText(valueOption));
        var valueTokens = expandTokens(tokenize(getValueSearchText(valueOption)));
        var hasTypeMatch = typesMatch(column.type, valueOption.type);
        var normalizedColumnName = normalizeUnderscoreName(column.name);
        var normalizedValueKey = normalizeUnderscoreName(valueOption.key);
        var normalizedValueName = normalizeUnderscoreName(valueOption.name);
        var columnCategory = detectSemanticCategory(column.name);
        var valueCategory = detectSemanticCategory(valueOption.key + " " + valueOption.name + " " + valueOption.description);
        var columnHasKnownPrefix = normalizedColumnName.indexOf("outdoor_") === 0 || normalizedColumnName.indexOf("indoor_") === 0;
        var columnHasNoPrefix = !columnHasKnownPrefix;
        var columnIsOutdoor = normalizedColumnName.indexOf("outdoor") === 0;
        var columnIsIndoor = normalizedColumnName.indexOf("indoor") === 0;
        var columnIsTemperature = hasAnyToken(columnTokens, ["temp", "temperature"]);
        var columnIsDew = hasAnyToken(columnTokens, ["dew", "dewpoint"]);
        var columnIsHumidity = hasAnyToken(columnTokens, ["humid", "humidity", "relhumidity"]);
        var columnIsPressure = hasAnyToken(columnTokens, ["press", "pressure"]);
        var columnIsAltitude = hasAnyToken(columnTokens, ["alt", "altitude"]);
        var columnIsCo2 = hasAnyToken(columnTokens, ["co2"]);
        var columnIsGpioState = hasAnyToken(columnTokens, ["gpio", "state"]);
        var valueIsTemperature = hasAnyToken(valueTokens, ["temp", "temperature", "maxtemp"]);
        var valueIsDew = hasAnyToken(valueTokens, ["dew", "dewpoint"]);
        var valueIsHumidity = hasAnyToken(valueTokens, ["humid", "humidity", "relhumidity"]);
        var valueIsPressure = hasAnyToken(valueTokens, ["press", "pressure"]);
        var valueIsAltitude = hasAnyToken(valueTokens, ["alt", "altitude"]);
        var valueIsCo2 = hasAnyToken(valueTokens, ["co2"]);
        var valueIsGpioState = hasAnyToken(valueTokens, ["gpio", "gpiostate"]);
        var valueIsControlState = hasAnyToken(valueTokens, ["control", "controlstate", "state"]);
        var genericNumericColumn = isGenericNumericColumn(columnTokens);

        $.each(columnTokens, function (_, token) {
            if (token.length < 2) {
                return;
            }

            if (valueText.indexOf(token) !== -1) {
                score += token.length > 4 ? 20 : 12;
            }
        });

        if (hasTypeMatch) {
            score += 35;
        }

        if (columnHasNoPrefix) {
            score += 28;
        }

        if (columnIsOutdoor) {
            score += 12;
        }

        if (columnIsIndoor) {
            score -= 12;
        }

        if (normalizeType(column.name) === normalizeType(valueOption.key)) {
            score += 80;
        }

        if (normalizeType(column.name) === normalizeType(valueOption.name)) {
            score += 70;
        }

        if (columnCategory !== "" && valueCategory !== "") {
            if (columnCategory === valueCategory) {
                score += 160;
            } else {
                score -= 180;
            }
        }

        if (normalizedColumnName.indexOf("temperature") !== -1 || normalizedColumnName.indexOf("temp") === 0) {
            if (normalizedValueKey.indexOf("as_temp") !== -1 || normalizedValueName.indexOf("temp") !== -1) {
                score += 110;
            }
            if (normalizedValueKey.indexOf("as_dew") !== -1 || normalizedValueName.indexOf("dew") !== -1) {
                score -= 80;
            }
            if (normalizedValueKey.indexOf("humidity") !== -1 || normalizedValueName.indexOf("humidity") !== -1 || normalizedValueKey.indexOf("relhumidity") !== -1 || normalizedValueName.indexOf("relhumidity") !== -1) {
                score -= 90;
            }
        }

        if (normalizedColumnName.indexOf("dew") !== -1) {
            if (normalizedValueKey.indexOf("as_dew") !== -1 || normalizedValueName.indexOf("dew") !== -1) {
                score += 110;
            }
            if (normalizedValueKey.indexOf("as_temp") !== -1 || normalizedValueName.indexOf("temp") !== -1) {
                score -= 45;
            }
        }

        if (normalizedColumnName.indexOf("humidity") !== -1 || normalizedColumnName.indexOf("relhumidity") !== -1) {
            if (normalizedValueKey.indexOf("humidity") !== -1 || normalizedValueName.indexOf("humidity") !== -1 || normalizedValueKey.indexOf("relhumidity") !== -1 || normalizedValueName.indexOf("relhumidity") !== -1) {
                score += 110;
            }
            if (normalizedValueKey.indexOf("as_temp") !== -1 || normalizedValueName.indexOf("temp") !== -1) {
                score -= 70;
            }
        }

        if (normalizedColumnName.indexOf("altitude") !== -1 || normalizedColumnName.indexOf("alt_") === 0) {
            if (normalizedValueKey.indexOf("as_altitude") !== -1 || normalizedValueName.indexOf("altitude") !== -1) {
                score += 130;
            }
            if (normalizedValueKey.indexOf("as_temp") !== -1 || normalizedValueName.indexOf("temp") !== -1) {
                score -= 120;
            }
            if (normalizedValueKey.indexOf("humidity") !== -1 || normalizedValueName.indexOf("humidity") !== -1) {
                score -= 90;
            }
            if (normalizedValueKey.indexOf("pressure") !== -1 || normalizedValueName.indexOf("pressure") !== -1) {
                score -= 50;
            }
        }

        if (normalizedColumnName.indexOf("temperature") !== -1 || normalizedColumnName.indexOf("temp_") === 0) {
            if (normalizedValueKey.indexOf("as_altitude") !== -1 || normalizedValueName.indexOf("altitude") !== -1) {
                score -= 120;
            }
        }

        if (normalizedColumnName.indexOf("co2") !== -1) {
            if (normalizedValueKey.indexOf("as_co2") !== -1 || normalizedValueName.indexOf("co2") !== -1) {
                score += 140;
            }
            if (normalizedValueKey.indexOf("as_temp") !== -1 || normalizedValueName.indexOf("temp") !== -1) {
                score -= 120;
            }
            if (normalizedValueKey.indexOf("humidity") !== -1 || normalizedValueName.indexOf("humidity") !== -1) {
                score -= 100;
            }
            if (normalizedValueKey.indexOf("pressure") !== -1 || normalizedValueName.indexOf("pressure") !== -1) {
                score -= 80;
            }
            if (normalizedValueKey.indexOf("as_altitude") !== -1 || normalizedValueName.indexOf("altitude") !== -1) {
                score -= 80;
            }
        }

        if (columnIsTemperature) {
            if (normalizeType(valueOption.type) === "temperature") {
                score += 25;
            }
            if (valueIsTemperature) {
                score += 55;
            }
            if (valueIsDew) {
                score -= 45;
            }
        }

        if (columnIsDew) {
            if (valueIsDew) {
                score += 60;
            }
            if (valueIsTemperature && !valueIsDew) {
                score -= 30;
            }
        }

        if (columnIsHumidity) {
            if (valueText.indexOf("humidity") !== -1) {
                score += 25;
            }
            if (valueIsHumidity) {
                score += 40;
            }
        }

        if (columnIsPressure) {
            if (valueText.indexOf("pressure") !== -1) {
                score += 25;
            }
            if (valueIsPressure) {
                score += 40;
            }
        }

        if (columnIsAltitude) {
            if (valueIsAltitude) {
                score += 80;
            } else {
                score -= 80;
            }
        }

        if (columnIsCo2) {
            if (valueIsCo2) {
                score += 80;
            } else {
                score -= 90;
            }
        }

        if (columnIsGpioState) {
            if (valueText.indexOf("gpiostate") !== -1 || valueText.indexOf("controlstate") !== -1) {
                score += 25;
            }
            if (valueIsGpioState) {
                score += 45;
            }
            if (valueIsControlState && !valueIsGpioState) {
                score += 10;
            }
        }

        if (genericNumericColumn && (valueIsAltitude || valueIsCo2)) {
            score -= 60;
        }

        return score;
    };

    AllskySensor.prototype.predictMappings = function (sensor) {
        var self = this;
        var orderedColumns;
        var sensorNumber = sensor && sensor.sensor_number;
        var existingMapping = this.ensureSensorMapping(sensorNumber);
        var manualMappings = this.ensureManualMappings(sensorNumber);
        var nextMapping = {};
        var usedColumns = {};

        if (!sensor || !Array.isArray(sensor.columns) || sensor.columns.length === 0) {
            return existingMapping;
        }

        $.each(existingMapping, function (valueKey, columnName) {
            if (manualMappings[valueKey] && columnName) {
                nextMapping[valueKey] = columnName;
                usedColumns[columnName] = true;
            }
        });

        orderedColumns = sensor.columns.slice().sort(function (a, b) {
            return getColumnPrefixPriority(a.name) - getColumnPrefixPriority(b.name);
        });

        $.each(orderedColumns, function (_, column) {
            var bestOption = null;
            var bestScore = 0;

            if (usedColumns[column.name]) {
                return;
            }

            $.each(self.state.values, function (_, valueOption) {
                var score;

                if (manualMappings[valueOption.key] || nextMapping[valueOption.key]) {
                    return;
                }

                score = self.scoreValueForColumn(column, valueOption);
                if (score > bestScore) {
                    bestScore = score;
                    bestOption = valueOption;
                }
            });

            if (bestOption && bestScore >= 85) {
                nextMapping[bestOption.key] = column.name;
                usedColumns[column.name] = true;
            }
        });

        this.state.mappingsBySensor[sensorNumber] = nextMapping;
        return nextMapping;
    };

    AllskySensor.prototype.renderMappings = function (sensor) {
        var self = this;
        var mapping;
        var mappedCount = 0;
        var columns = sensor && Array.isArray(sensor.columns) ? sensor.columns : [];

        if (this.state.values.length === 0) {
            this.$mapping.hide();
            this.$mappingList.empty();
            this.$mappingTable.hide();
            this.$mappingSummary.text("0 mapped of 0 values");
            return;
        }

        mapping = sensor ? this.predictMappings(sensor) : {};
        this.$mappingList.empty();
        this.$mapping.show();
        this.$mappingTable.show();
        if (columns.length === 0) {
            this.$mappingSummary.text("Select a sensor to map");
        }

        $.each(self.state.values, function (_, valueOption) {
            var $row = $("<tr>");
            var $valueCell = $("<td>");
            var $typeCell = $("<td>");
            var $sensorCell = $("<td>");
            var $select = $("<select>", {
                "class": "form-control",
                "data-role": "mapping-select",
                "data-value-key": valueOption.key
            });
            var selectedColumn = null;

            $valueCell.append($("<div>", {
                "class": "as-sensor-picker__mapping-name",
                text: stripCountPlaceholder(valueOption.key)
            }));

            $typeCell.append($("<span>", {
                "class": "label label-default",
                text: valueOption.type || "unknown"
            }));

            $select.append($("<option>", {
                value: "",
                text: "Do not map this Allsky value"
            }));

            $.each(columns, function (_, column) {
                var label = column.name;
                if (column.type) {
                    label += " - " + column.type;
                }

                $select.append($("<option>", {
                    value: column.name,
                    text: label
                }));
            });

            $select.prop("disabled", columns.length === 0);

            if (mapping[valueOption.key]) {
                $select.val(mapping[valueOption.key]);
                selectedColumn = mapping[valueOption.key];
                mappedCount += 1;
            }

            if (selectedColumn) {
                selectedColumn = $.grep(columns, function (column) {
                    return column.name === selectedColumn;
                })[0] || null;
            }

            $sensorCell.append($select);

            $row.append($valueCell);
            $row.append($typeCell);
            $row.append($sensorCell);
            self.$mappingList.append($row);
        });

        if (columns.length > 0) {
            this.$mappingSummary.text(mappedCount + " mapped of " + this.state.values.length + " values");
        }
    };

    AllskySensor.prototype.updateSelectedState = function () {
        var sensor = this.getSelectedSensor();
        var meta = [];

        if (!sensor) {
            this.clearSelectedState();
            return;
        }

        if (sensor.category) {
            meta.push(sensor.category);
        }
        meta.push("Sensor #" + sensor.sensor_number);

        this.$detailsEmpty.hide();
        this.$details.show();
        this.$categoryBadge.text(sensor.category || "Selected Sensor");
        this.$name.text(sensor.device);
        this.$meta.text(meta.join(" | "));
        this.$description.text(this.options.includeDescription ? sensor.description : "");
        this.renderMappings(sensor);
    };

    AllskySensor.prototype.getSelectedSensor = function () {
        if (!this.state.selectedSensorNumber) {
            return null;
        }

        return this.state.sensorMap[this.state.selectedSensorNumber] || null;
    };

    AllskySensor.prototype.getSensors = function () {
        return this.state.sensors.slice();
    };

    AllskySensor.prototype.getCurrentMapping = function () {
        var sensorNumber = this.state.selectedSensorNumber;
        var mapping = sensorNumber ? this.ensureSensorMapping(sensorNumber) : {};

        return $.extend({}, mapping);
    };

    AllskySensor.prototype.getAllMappings = function () {
        return $.extend(true, {}, this.state.mappingsBySensor);
    };

    AllskySensor.prototype.reload = function () {
        this.state.hasLoaded = false;
        this.loadSensors();
    };

    AllskySensor.prototype.showFallbackModal = function () {
        var $backdrop = $("#" + this.modalId + "_backdrop");

        if (!$backdrop.length) {
            $backdrop = $("<div>", {
                id: this.modalId + "_backdrop",
                "class": "modal-backdrop in"
            }).css({
                zIndex: 1040
            });

            $("body").append($backdrop);
        }

        this.$modal.show().scrollTop(0);
        this.$modal.css({
            display: "block",
            zIndex: 1050
        });
        this.$modal.addClass("in");
        this.$modal.attr("aria-hidden", "false");
        this.$modal.find(".modal-dialog").css({
            zIndex: 1051
        });
        $("body").addClass("modal-open");
    };

    AllskySensor.prototype.hideFallbackModal = function () {
        $("#" + this.modalId + "_backdrop").remove();
        this.$modal.removeClass("in");
        this.$modal.attr("aria-hidden", "true");
        this.$modal.hide();
        $("body").removeClass("modal-open");
    };

    AllskySensor.prototype.open = function () {
        if (!this.state.hasLoaded && !this.state.isLoading) {
            this.loadSensors();
        }

        this.showFallbackModal();
    };

    AllskySensor.prototype.close = function () {
        this.hideFallbackModal();
    };

    AllskySensor.prototype.destroy = function () {
        this.$openButton.off("." + PLUGIN_NAME);
        if (this.$openButton.length && this.$openButton[0].removeEventListener && this.onOpenButtonClick) {
            this.$openButton[0].removeEventListener("click", this.onOpenButtonClick, false);
        }
        this.$modal.off("." + PLUGIN_NAME);
        this.$select.off("." + PLUGIN_NAME);

        this.hideFallbackModal();

        this.$modal.remove();
        this.$el.removeData(PLUGIN_NAME);
        if (!this.isDocumentTarget) {
            this.$el.empty();
        }
    };

    $.fn.allskySensor = function (options) {
        var args = Array.prototype.slice.call(arguments, 1);
        var isMethodCall = typeof options === "string";

        if (isMethodCall) {
            return this.each(function () {
                var instance = $(this).data(PLUGIN_NAME);

                if (!instance) {
                    throw new Error("allskySensor must be initialized before calling methods.");
                }

                if (typeof instance[options] !== "function") {
                    throw new Error('No method named "' + options + '" exists on allskySensor.');
                }

                instance[options].apply(instance, args);
            });
        }

        return this.each(function () {
            var existing = $(this).data(PLUGIN_NAME);

            if (existing) {
                return;
            }

            $(this).data(PLUGIN_NAME, new AllskySensor(this, options));
        });
    };
}(jQuery));
