(function ($) {
    "use strict";

    var PLUGIN_NAME = "allskykamera";
    var STYLE_ID = "allskykamera-styles";

    var defaults = {
        title: "Allsky Kamera Data Mapping",
        variablesUrl: "../../includes/moduleutil.php?request=VariableList&showempty=no",
        sunDataUrl: "../../includes/moduleutil.php?request=SunData",
        dailyLimit: 5000,
        frequencyMinutes: 15,
        configData: null,
        configText: null,
        autoOpen: false,
        onSave: null
    };

    function ensureStyles() {
        if (document.getElementById(STYLE_ID)) {
            return;
        }
        $("<style>", { id: STYLE_ID, text: "" }).appendTo("head");
    }

    function uid() {
        return "ask_" + Math.random().toString(36).slice(2, 10);
    }

    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function escapeAttribute(value) {
        return escapeHtml(value);
    }

    function isNumericType(type) {
        var value = String(type || "").toLowerCase();
        return ["number", "numeric", "float", "integer", "decimal", "double", "int"].indexOf(value) !== -1;
    }

    function parseNumericValue(raw) {
        var num = Number(raw);
        return isNaN(num) ? null : num;
    }

    function normalizeField(field) {
        return {
            name: String(field && field.name || "").trim(),
            variable: String(field && field.variable || "").trim()
        };
    }

    function normalizeRunAt(runAt) {
        var value = String(runAt || "").toLowerCase();
        if (value !== "day" && value !== "night" && value !== "both") {
            value = "both";
        }
        return value;
    }

    function normalizeEntry(entry, fallbackFrequency) {
        var frequency = parseInt(entry && entry.frequency_minutes, 10);
        if (isNaN(frequency) || frequency < 1) {
            frequency = fallbackFrequency;
        }

        return {
            ext_sensor: String(entry && entry.ext_sensor || "").trim(),
            frequency_minutes: frequency,
            run_at: normalizeRunAt(entry && entry.run_at),
            fields: (Array.isArray(entry && entry.fields) ? entry.fields : []).map(normalizeField).filter(function (field) {
                return field.name !== "" && field.variable !== "";
            })
        };
    }

    function normalizeConfig(config, fallbackFrequency, dailyLimit) {
        var source = config && typeof config === "object" ? config : {};
        var legacyFrequency = parseInt(source.frequency_minutes, 10);
        var effectiveFrequency = legacyFrequency;
        var configuredLimit = parseInt(source.daily_limit, 10);

        if (isNaN(effectiveFrequency) || effectiveFrequency < 1) {
            effectiveFrequency = fallbackFrequency;
        }

        if (isNaN(configuredLimit) || configuredLimit < 1) {
            configuredLimit = dailyLimit;
        }

        return {
            version: 1,
            daily_limit: configuredLimit,
            entries: (Array.isArray(source.entries) ? source.entries : []).map(function (entry) {
                return normalizeEntry(entry, effectiveFrequency);
            })
        };
    }

    function parseConfigText(configText) {
        var parsedText;
        var parsedConfig;

        if (typeof configText !== "string" || $.trim(configText) === "") {
            return null;
        }

        try {
            parsedText = JSON.parse(configText);
        } catch (error) {
            parsedText = configText;
        }

        if (typeof parsedText !== "string") {
            return parsedText;
        }

        try {
            parsedConfig = JSON.parse(parsedText);
        } catch (error2) {
            return null;
        }

        return parsedConfig;
    }

    function AllskyKamera(element, options) {
        this.$el = $(element);
        this.options = $.extend(true, {}, defaults, options || {});
        this.instanceId = uid();
        this.state = {
            variables: [],
            variableMap: {},
            config: normalizeConfig(null, this.options.frequencyMinutes, this.options.dailyLimit),
            sunData: null,
            selectedEntryIndex: null,
            entryEditIndex: null,
            entryFormVisible: false,
            useOwnBackdrop: true
        };

        ensureStyles();
        this.buildModal();
        this.bindEvents();
        this.loadVariables();
        this.loadSunData();
        this.setConfig(this.options.configData, this.options.configText);

        if (this.options.autoOpen) {
            this.open();
        }
    }

    AllskyKamera.prototype.buildModal = function () {
        var modalId = this.instanceId + "_modal";
        var html = ""
            + "<div class='modal ask-modal' id='" + modalId + "' tabindex='-1'>"
            + "  <div class='modal-dialog modal-lg'>"
            + "    <div class='modal-content'>"
            + "      <div class='modal-header'>"
            + "        <button type='button' class='close' data-dismiss='modal' aria-label='Close'><span aria-hidden='true'>&times;</span></button>"
            + "        <h4 class='modal-title'>" + escapeHtml(this.options.title) + "</h4>"
            + "      </div>"
            + "      <div class='modal-body'>"
            + "        <div data-role='flash-host'></div>"
            + "        <div class='ask-summary' data-role='summary'></div>"
            + "        <div class='row'>"
            + "          <div class='col-md-5'>"
            + "            <div class='panel panel-default'>"
            + "              <div class='panel-heading clearfix'>"
            + "                <strong>Entries</strong>"
            + "                <button type='button' class='btn btn-primary btn-xs pull-right' data-action='new-entry'>Add Entry</button>"
            + "              </div>"
            + "              <div class='panel-body'>"
            + "                <div class='well well-sm ask-entry-editor'>"
            + "                  <h4 data-role='entry-editor-title'>Add Entry</h4>"
            + "                  <div class='form-group'>"
            + "                    <label for='" + this.instanceId + "_sensor'>Entry Name</label>"
            + "                    <input id='" + this.instanceId + "_sensor' class='form-control' type='text' placeholder='Test_Sensor'>"
            + "                  </div>"
            + "                  <div class='form-group'>"
            + "                    <label for='" + this.instanceId + "_entry_freq'>Frequency</label>"
            + "                    <div class='input-group'>"
            + "                      <input id='" + this.instanceId + "_entry_freq' class='form-control' type='number' min='1' step='1' placeholder='15'>"
            + "                      <span class='input-group-addon'>minutes</span>"
            + "                    </div>"
            + "                  </div>"
            + "                  <div class='form-group'>"
            + "                    <label for='" + this.instanceId + "_entry_run_at'>When</label>"
            + "                    <select id='" + this.instanceId + "_entry_run_at' class='form-control'>"
            + "                      <option value='day'>Day</option>"
            + "                      <option value='night'>Night</option>"
            + "                      <option value='both'>Both</option>"
            + "                    </select>"
            + "                  </div>"
            + "                  <div>"
            + "                    <button type='button' class='btn btn-primary' data-action='save-entry' data-role='save-entry-button'>Add Entry</button>"
            + "                    <button type='button' class='btn btn-default' data-action='cancel-entry' data-role='cancel-entry-button'>Clear</button>"
            + "                  </div>"
            + "                </div>"
            + "                <div class='list-group' data-role='entry-list'></div>"
            + "              </div>"
            + "            </div>"
            + "          </div>"
            + "          <div class='col-md-7'>"
            + "            <div class='panel panel-default'>"
            + "              <div class='panel-heading clearfix'>"
            + "                <strong data-role='fields-header'>Fields</strong>"
                + "                <button type='button' class='btn btn-default btn-xs pull-right' data-action='add-field'>Add Field</button>"
            + "              </div>"
            + "              <div class='panel-body'>"
            + "                <div data-role='field-list'></div>"
            + "              </div>"
            + "            </div>"
            + "            <div class='panel panel-default'>"
            + "              <div class='panel-heading clearfix'>"
            + "                <strong>Preview Payload</strong>"
            + "                <span class='label label-success pull-right' data-role='variable-status'>Variables loading...</span>"
            + "              </div>"
            + "              <div class='panel-body'>"
            + "                <pre class='well well-sm' data-role='preview'></pre>"
            + "              </div>"
            + "            </div>"
            + "          </div>"
            + "        </div>"
            + "      </div>"
            + "      <div class='modal-footer'>"
            + "        <div class='pull-left'>"
            + "          <button type='button' class='btn btn-default' data-action='toggle-theme'>Toggle Theme</button>"
            + "        </div>"
            + "        <button type='button' class='btn btn-default' data-dismiss='modal'>Close</button>"
            + "        <button type='button' class='btn btn-success' data-action='save-config'>Save Config</button>"
            + "      </div>"
            + "    </div>"
            + "  </div>"
            + "</div>";

        this.$modal = $(html).appendTo("body");
    };

    AllskyKamera.prototype.bindEvents = function () {
        var self = this;

        this.$modal.on("show.bs.modal", function () {
            self.prepareModalStack();
        });

        this.$modal.on("hidden.bs.modal", function () {
            self.resetModalStack();
        });

        this.$modal.on("click", "[data-action='new-entry']", function () {
            self.openAddEntryForm();
        });

        this.$modal.on("click", "[data-action='cancel-entry']", function () {
            self.resetEntryForm();
        });

        this.$modal.on("click", "[data-action='save-entry']", function () {
            self.saveEntry();
        });

        this.$modal.on("click", "[data-action='select-entry']", function () {
            self.selectEntry(parseInt($(this).attr("data-index"), 10));
        });

        this.$modal.on("click", "[data-action='edit-entry']", function (event) {
            event.stopPropagation();
            self.startEditEntry(parseInt($(this).attr("data-index"), 10));
        });

        this.$modal.on("click", "[data-action='delete-entry']", function (event) {
            event.stopPropagation();
            self.deleteEntry(parseInt($(this).attr("data-index"), 10));
        });

        this.$modal.on("click", "[data-action='add-field']", function () {
            self.addField();
        });

        this.$modal.on("click", "[data-action='delete-field']", function () {
            self.deleteField(parseInt($(this).attr("data-index"), 10));
        });

        this.$modal.on("input", ".ask-field-name", function () {
            self.updateFieldDraft($(this).closest("tr"), "name", $(this).val());
        });

        this.$modal.on("change", ".ask-variable-select", function () {
            var $row = $(this).closest("tr");
            self.updateFieldDraft($row, "variable", $(this).val());
            self.updateFieldMetadata($row);
        });

        this.$modal.on("click", "[data-action='reload-variables']", function () {
            self.loadVariables();
        });

        this.$modal.on("click", "[data-action='toggle-theme']", function () {
            $("body").toggleClass("dark");
        });

        this.$modal.on("click", "[data-action='save-config']", function () {
            self.saveConfig();
        });
    };

    AllskyKamera.prototype.prepareModalStack = function () {
        var zIndex = 1040 + (10 * $(".modal.in").length);

        this.$modal.css("z-index", zIndex);

        if (!this.state.useOwnBackdrop) {
            return;
        }

        window.setTimeout(function () {
            var $backdrop = $(".modal-backdrop").last();
            if ($backdrop.length) {
                $backdrop.css("z-index", zIndex - 1).addClass("ask-modal-stack");
            }
        }, 0);
    };

    AllskyKamera.prototype.resetModalStack = function () {
        this.$modal.css("z-index", "");
        if ($(".modal.in").length) {
            $("body").addClass("modal-open");
        }
    };

    AllskyKamera.prototype.open = function () {
        this.state.useOwnBackdrop = $(".modal.in").not(this.$modal).length === 0;
        this.$modal.modal({
            backdrop: this.state.useOwnBackdrop ? true : false,
            keyboard: true
        });
    };

    AllskyKamera.prototype.showMessage = function (message, isError) {
        var klass = isError ? "alert-danger" : "alert-success";
        var $host = this.$modal.find("[data-role='flash-host']");
        var $flash = $host.find(".ask-flash");

        if (!$flash.length) {
            $flash = $("<div class='alert ask-flash'></div>").appendTo($host);
        }

        $flash.removeClass("alert-danger alert-success").addClass(klass).text(message).show();

        clearTimeout(this.flashTimer);
        this.flashTimer = setTimeout(function () {
            $flash.fadeOut(200);
        }, 3000);
    };

    AllskyKamera.prototype.setStatus = function (message, isError) {
        var $status = this.$modal.find("[data-role='variable-status']");
        $status.text(message);
        $status.removeClass("label-success label-danger label-default").addClass(isError ? "label-danger" : "label-success");
    };

    AllskyKamera.prototype.loadVariables = function () {
        var self = this;
        self.setStatus("Loading numeric variables...", false);

        $.getJSON(self.options.variablesUrl)
            .done(function (data) {
                var variables = Array.isArray(data) ? data.filter(function (item) {
                    return isNumericType(item.type);
                }) : [];

                variables.sort(function (a, b) {
                    return String(a.variable || "").localeCompare(String(b.variable || ""));
                });

                self.state.variables = variables;
                self.state.variableMap = {};
                $.each(variables, function (_, variable) {
                    self.state.variableMap[variable.variable] = variable;
                });

                self.setStatus(variables.length + " numeric variables loaded", false);
                self.renderFields();
                self.renderPreview();
            })
            .fail(function () {
                self.setStatus("Unable to load variables", true);
                self.showMessage("Unable to load variables from " + self.options.variablesUrl + ".", true);
            });
    };

    AllskyKamera.prototype.loadSunData = function () {
        var self = this;

        $.getJSON(self.options.sunDataUrl)
            .done(function (data) {
                self.state.sunData = data && typeof data === "object" ? data : null;
                self.renderSummary();
            })
            .fail(function () {
                self.state.sunData = null;
                self.renderSummary();
                self.showMessage("Unable to load sunrise and sunset data from " + self.options.sunDataUrl + ".", true);
            });
    };

    AllskyKamera.prototype.afterConfigLoad = function () {
        this.state.selectedEntryIndex = this.state.config.entries.length ? 0 : null;
        this.state.entryEditIndex = null;
        this.state.entryFormVisible = false;
        this.render();
        this.resetEntryForm();
    };

    AllskyKamera.prototype.setConfig = function (configData, configText) {
        var parsedConfig = parseConfigText(configText);

        if (parsedConfig !== null) {
            this.state.config = normalizeConfig(parsedConfig, this.options.frequencyMinutes, this.options.dailyLimit);
        } else {
            this.state.config = normalizeConfig(configData, this.options.frequencyMinutes, this.options.dailyLimit);
        }

        this.afterConfigLoad();
    };

    AllskyKamera.prototype.getSelectedEntry = function () {
        var idx = this.state.selectedEntryIndex;
        if (idx === null || idx < 0 || idx >= this.state.config.entries.length) {
            return null;
        }
        return this.state.config.entries[idx];
    };

    AllskyKamera.prototype.render = function () {
        this.renderSummary();
        this.renderEntryEditorState();
        this.renderEntries();
        this.renderFields();
        this.renderPreview();
    };

    AllskyKamera.prototype.renderEntryEditorState = function () {
        var isEditing = this.state.entryEditIndex !== null;
        var isVisible = this.state.entryFormVisible;
        this.$modal.find(".ask-entry-editor").toggle(isVisible);
        this.$modal.find("[data-role='entry-editor-title']").text(isEditing ? "Edit Entry" : "Add Entry");
        this.$modal.find("[data-role='save-entry-button']").text(isEditing ? "Save Entry" : "Add Entry");
        this.$modal.find("[data-role='cancel-entry-button']").text(isEditing ? "Cancel Edit" : "Clear");
    };

    AllskyKamera.prototype.openAddEntryForm = function () {
        this.state.entryEditIndex = null;
        this.state.entryFormVisible = true;
        this.renderEntryEditorState();
        this.$modal.find("#" + this.instanceId + "_sensor").val("").focus();
        this.$modal.find("#" + this.instanceId + "_entry_freq").val(this.options.frequencyMinutes);
        this.$modal.find("#" + this.instanceId + "_entry_run_at").val("both");
    };

    AllskyKamera.prototype.parseClockMinutes = function (value) {
        var parts = String(value || "").split(":");
        var hours;
        var minutes;

        if (parts.length !== 2) {
            return null;
        }

        hours = parseInt(parts[0], 10);
        minutes = parseInt(parts[1], 10);

        if (isNaN(hours) || isNaN(minutes)) {
            return null;
        }

        return (hours * 60) + minutes;
    };

    AllskyKamera.prototype.countRunsInWindow = function (startMinute, endMinute, frequency) {
        var minute = 0;
        var count = 0;

        if (frequency < 1 || startMinute === null || endMinute === null || endMinute <= startMinute) {
            return 0;
        }

        for (minute = 0; minute < 1440; minute += frequency) {
            if (minute >= startMinute && minute < endMinute) {
                count += 1;
            }
        }

        return count;
    };

    AllskyKamera.prototype.calculateStats = function () {
        var self = this;
        var fieldCount = 0;
        var valuesPerDay = 0;
        var entryRunsPerDay = 0;
        var dayRuns = 0;
        var nightRuns = 0;
        var dayMinutes = null;
        var nightMinutes = null;
        var sunriseMinutes = null;
        var sunsetMinutes = null;
        var currentTod = "";

        if (this.state.sunData) {
            sunriseMinutes = this.parseClockMinutes(this.state.sunData.sunrise);
            sunsetMinutes = this.parseClockMinutes(this.state.sunData.sunset);
            currentTod = String(this.state.sunData.tod || "");
        }

        if (sunriseMinutes !== null && sunsetMinutes !== null && sunsetMinutes > sunriseMinutes) {
            dayMinutes = sunsetMinutes - sunriseMinutes;
            nightMinutes = 1440 - dayMinutes;
        }

        $.each(this.state.config.entries, function (_, entry) {
            var frequency = Math.max(1, parseInt(entry.frequency_minutes, 10) || 1);
            var runsPerDay = self.countRunsInWindow(0, 1440, frequency);
            var entryDayRuns = 0;
            var entryNightRuns = 0;

            if (sunriseMinutes !== null && sunsetMinutes !== null && sunsetMinutes > sunriseMinutes) {
                entryDayRuns = self.countRunsInWindow(sunriseMinutes, sunsetMinutes, frequency);
                entryNightRuns = self.countRunsInWindow(0, sunriseMinutes, frequency) + self.countRunsInWindow(sunsetMinutes, 1440, frequency);
            } else {
                entryNightRuns = runsPerDay;
            }

            fieldCount += entry.fields.length;
            if (entry.run_at === "day") {
                entryRunsPerDay += entryDayRuns;
                dayRuns += entryDayRuns;
                valuesPerDay += entry.fields.length * entryDayRuns;
            } else if (entry.run_at === "night") {
                entryRunsPerDay += entryNightRuns;
                nightRuns += entryNightRuns;
                valuesPerDay += entry.fields.length * entryNightRuns;
            } else {
                entryRunsPerDay += runsPerDay;
                dayRuns += entryDayRuns;
                nightRuns += entryNightRuns;
                valuesPerDay += entry.fields.length * runsPerDay;
            }
        });

        return {
            entries: this.state.config.entries.length,
            mappedFields: fieldCount,
            sunrise: this.state.sunData && this.state.sunData.sunrise ? this.state.sunData.sunrise : "",
            sunset: this.state.sunData && this.state.sunData.sunset ? this.state.sunData.sunset : "",
            currentTod: currentTod,
            dayMinutes: dayMinutes,
            nightMinutes: nightMinutes,
            dayRuns: dayRuns,
            nightRuns: nightRuns,
            entryRunsPerDay: entryRunsPerDay,
            valuesPerDay: valuesPerDay,
            remaining: this.state.config.daily_limit - valuesPerDay
        };
    };

    AllskyKamera.prototype.renderSummary = function () {
        var stats = this.calculateStats();
        var remainingLabelClass = stats.remaining < 0 ? "label label-danger" : "label label-success";
        var currentTodText = stats.currentTod || "Unavailable";
        var dayWindowText = (stats.sunrise && stats.sunset) ? (stats.sunrise + " - " + stats.sunset) : "Unavailable";
        var nightWindowText = (stats.sunrise && stats.sunset) ? ("00:00 - " + stats.sunrise + ", " + stats.sunset + " - 24:00") : "Unavailable";
        var html = ""
            + "<div class='panel panel-default'>"
            + "  <div class='panel-heading clearfix'>"
            + "    <strong>API Usage</strong>"
            + "    <span class='" + remainingLabelClass + " pull-right'>"
            +      escapeHtml(stats.remaining.toFixed(2) + " remaining of " + this.state.config.daily_limit)
            + "    </span>"
            + "  </div>"
            + "  <table class='table table-bordered table-condensed'>"
            + "    <tbody>"
            + "      <tr>"
            + "        <th>Day Window</th>"
            + "        <td>" + escapeHtml(dayWindowText) + "</td>"
            + "        <th>Night Window</th>"
            + "        <td>" + escapeHtml(nightWindowText) + "</td>"
            + "      </tr>"
            + "      <tr>"
            + "        <th>Current State</th>"
            + "        <td>" + escapeHtml(currentTodText) + "</td>"
            + "        <th>Mapped Fields</th>"
            + "        <td>" + stats.mappedFields + "</td>"
            + "      </tr>"
            + "      <tr>"
            + "        <th>Day Calls</th>"
            + "        <td>" + stats.dayRuns + "</td>"
            + "        <th>Night Calls</th>"
            + "        <td>" + stats.nightRuns + "</td>"
            + "      </tr>"
            + "      <tr>"
            + "        <th>Entries</th>"
            + "        <td>" + stats.entries + "</td>"
            + "        <th>Entry Runs / Day</th>"
            + "        <td>" + stats.entryRunsPerDay.toFixed(2) + "</td>"
            + "      </tr>"
            + "      <tr>"
            + "        <th></th>"
            + "        <td></td>"
            + "        <th>Values / Day</th>"
            + "        <td>" + stats.valuesPerDay.toFixed(2) + "</td>"
            + "      </tr>"
            + "    </tbody>"
            + "  </table>"
            + "</div>";

        this.$modal.find("[data-role='summary']").html(html);
    };

    AllskyKamera.prototype.renderEntries = function () {
        var self = this;
        var entries = this.state.config.entries;
        var html;

        if (!entries.length) {
            this.$modal.find("[data-role='entry-list']").html("<div class='list-group-item text-muted'>No entries configured yet.</div>");
            return;
        }

        html = "";

        $.each(entries, function (index, entry) {
            var itemClass = self.state.selectedEntryIndex === index ? "list-group-item active" : "list-group-item";
            var buttonClass = self.state.selectedEntryIndex === index ? "btn btn-default btn-xs" : "btn btn-default btn-xs";
            var runAtLabel = entry.run_at.charAt(0).toUpperCase() + entry.run_at.slice(1);
            html += ""
                + "<a href='#' class='" + itemClass + "' data-action='select-entry' data-index='" + index + "'>"
                + "  <div class='clearfix'>"
                + "  <div class='pull-left'>"
                + "    <strong>" + escapeHtml(entry.ext_sensor) + "</strong>"
                + "    <div class='text-muted'>" + entry.fields.length + " mapped field" + (entry.fields.length === 1 ? "" : "s") + " every " + escapeHtml(entry.frequency_minutes) + " minute" + (entry.frequency_minutes === 1 ? "" : "s") + " during " + escapeHtml(runAtLabel) + "</div>"
                + "  </div>"
                + "  <div class='pull-right'>"
                + "    <button type='button' class='" + buttonClass + "' data-action='edit-entry' data-index='" + index + "'>Edit</button>"
                + "    <button type='button' class='btn btn-danger btn-xs' data-action='delete-entry' data-index='" + index + "'>Delete</button>"
                + "  </div>"
                + "</div>"
                + "</a>";
        });

        this.$modal.find("[data-role='entry-list']").html(html);
    };

    AllskyKamera.prototype.renderFields = function () {
        var self = this;
        var entry = this.getSelectedEntry();
        var html;

        if (!entry) {
            this.$modal.find("[data-role='fields-header']").text("Fields");
            this.$modal.find("[data-role='field-list']").html("<div class='well well-sm text-muted text-center'>Create or select an entry first.</div>");
            this.$modal.find("[data-action='add-field']").prop("disabled", true);
            return;
        }

        this.$modal.find("[data-action='add-field']").prop("disabled", false);
        this.$modal.find("[data-role='fields-header']").text(entry.ext_sensor + " Fields");

        if (!entry.fields.length) {
            html = ""
                + "<div class='well well-sm text-muted text-center'>Click <strong>Add Field</strong> to map a numeric Allsky variable into this entry.</div>";
            this.$modal.find("[data-role='field-list']").html(html);
            return;
        }

        html = ""
            + "<table class='table ask-fields-table'>"
            + "<thead><tr><th>Field Name</th><th>Allsky Variable</th><th></th></tr></thead>"
            + "<tbody>";

        $.each(entry.fields, function (index, field) {
            html += ""
                + "<tr data-index='" + index + "'>"
                + "    <td>"
                + "      <input type='text' class='form-control ask-field-name' value='" + escapeAttribute(field.name) + "' placeholder='temp_c'>"
                + "    </td>"
                + "    <td>"
                + "      <select class='form-control ask-variable-select'>" + self.buildVariableOptions(field.variable) + "</select>"
                + "    </td>"
                + "    <td class='text-right'>"
                + "      <button type='button' class='btn btn-danger btn-sm' data-action='delete-field' data-index='" + index + "'>Delete</button>"
                + "    </td>"
                + "</tr>";
        });

        html += "</tbody></table>";
        this.$modal.find("[data-role='field-list']").html(html);

        this.$modal.find("[data-role='field-list'] tbody tr").each(function () {
            self.updateFieldMetadata($(this));
        });
    };

    AllskyKamera.prototype.buildVariableOptions = function (selectedValue) {
        var html = "<option value=''>Select numeric variable</option>";

        $.each(this.state.variables, function (_, variable) {
            var selected = variable.variable === selectedValue ? " selected" : "";
            var description = variable.description || variable.group || "Numeric variable";
            html += "<option value='" + escapeAttribute(variable.variable) + "'" + selected + ">"
                + escapeHtml(variable.variable + " (" + description + ")")
                + "</option>";
        });

        return html;
    };

    AllskyKamera.prototype.updateFieldMetadata = function ($row) {
        return $row;
    };

    AllskyKamera.prototype.resetEntryForm = function () {
        this.state.entryEditIndex = null;
        this.state.entryFormVisible = false;
        this.$modal.find("#" + this.instanceId + "_sensor").val("");
        this.$modal.find("#" + this.instanceId + "_entry_freq").val(this.options.frequencyMinutes);
        this.$modal.find("#" + this.instanceId + "_entry_run_at").val("both");
        this.renderEntryEditorState();
    };

    AllskyKamera.prototype.selectEntry = function (index) {
        if (index < 0 || index >= this.state.config.entries.length) {
            return;
        }
        this.state.selectedEntryIndex = index;
        this.renderEntries();
        this.renderFields();
        this.renderPreview();
    };

    AllskyKamera.prototype.startEditEntry = function (index) {
        var entry = this.state.config.entries[index];
        if (!entry) {
            return;
        }
        this.state.entryEditIndex = index;
        this.state.entryFormVisible = true;
        this.renderEntryEditorState();
        this.$modal.find("#" + this.instanceId + "_sensor").val(entry.ext_sensor).focus();
        this.$modal.find("#" + this.instanceId + "_entry_freq").val(entry.frequency_minutes);
        this.$modal.find("#" + this.instanceId + "_entry_run_at").val(entry.run_at);
    };

    AllskyKamera.prototype.saveEntry = function () {
        var extSensor = $.trim(this.$modal.find("#" + this.instanceId + "_sensor").val());
        var frequency = parseInt(this.$modal.find("#" + this.instanceId + "_entry_freq").val(), 10);
        var runAt = normalizeRunAt(this.$modal.find("#" + this.instanceId + "_entry_run_at").val());
        var i;

        if (extSensor === "") {
            this.showMessage("Entry name (ext_sensor) is required.", true);
            return;
        }

        if (isNaN(frequency) || frequency < 1) {
            this.showMessage("Entry frequency must be 1 minute or greater.", true);
            return;
        }

        for (i = 0; i < this.state.config.entries.length; i += 1) {
            if (this.state.config.entries[i].ext_sensor === extSensor && i !== this.state.entryEditIndex) {
                this.showMessage("Entry names must be unique.", true);
                return;
            }
        }

        if (this.state.entryEditIndex === null) {
            this.state.config.entries.push({ ext_sensor: extSensor, frequency_minutes: frequency, run_at: runAt, fields: [] });
            this.state.selectedEntryIndex = this.state.config.entries.length - 1;
            this.showMessage("Entry added.", false);
        } else {
            this.state.config.entries[this.state.entryEditIndex].ext_sensor = extSensor;
            this.state.config.entries[this.state.entryEditIndex].frequency_minutes = frequency;
            this.state.config.entries[this.state.entryEditIndex].run_at = runAt;
            this.state.selectedEntryIndex = this.state.entryEditIndex;
            this.showMessage("Entry updated.", false);
        }

        this.resetEntryForm();
        this.render();
    };

    AllskyKamera.prototype.deleteEntry = function (index) {
        if (index < 0 || index >= this.state.config.entries.length) {
            return;
        }

        this.state.config.entries.splice(index, 1);

        if (!this.state.config.entries.length) {
            this.state.selectedEntryIndex = null;
        } else if (this.state.selectedEntryIndex === index) {
            this.state.selectedEntryIndex = Math.max(0, index - 1);
        } else if (this.state.selectedEntryIndex !== null && this.state.selectedEntryIndex > index) {
            this.state.selectedEntryIndex -= 1;
        }

        if (this.state.entryEditIndex === index) {
            this.resetEntryForm();
        } else if (this.state.entryEditIndex !== null && this.state.entryEditIndex > index) {
            this.state.entryEditIndex -= 1;
        }

        this.render();
        this.showMessage("Entry deleted.", false);
    };

    AllskyKamera.prototype.addField = function () {
        var entry = this.getSelectedEntry();
        if (!entry) {
            this.showMessage("Create or select an entry before adding fields.", true);
            return;
        }

        entry.fields.push({ name: "", variable: "" });
        this.renderFields();
        this.renderSummary();
        this.renderPreview();
    };

    AllskyKamera.prototype.deleteField = function (index) {
        var entry = this.getSelectedEntry();
        if (!entry || index < 0 || index >= entry.fields.length) {
            return;
        }

        entry.fields.splice(index, 1);
        this.renderFields();
        this.renderSummary();
        this.renderPreview();
    };

    AllskyKamera.prototype.updateFieldDraft = function ($row, key, value) {
        var entry = this.getSelectedEntry();
        var index = parseInt($row.attr("data-index"), 10);
        var field;

        if (!entry || isNaN(index) || index < 0 || index >= entry.fields.length) {
            return;
        }

        field = entry.fields[index];
        field[key] = $.trim(value);

        this.renderSummary();
        this.renderPreview();
    };

    AllskyKamera.prototype.buildPreviewPayload = function () {
        var self = this;

        return $.map(this.state.config.entries, function (entry) {
            var fields = {};

            $.each(entry.fields, function (_, field) {
                if (!field.name || !field.variable) {
                    return;
                }

                fields[field.name] = self.state.variableMap[field.variable] ? parseNumericValue(self.state.variableMap[field.variable].value) : null;
            });

            return {
                timestamp: new Date().toISOString(),
                ext_sensor: entry.ext_sensor,
                fields: fields
            };
        });
    };

    AllskyKamera.prototype.renderPreview = function () {
        var payloads = this.buildPreviewPayload();
        var previewText;

        if (!payloads.length) {
            previewText = "No entries configured.";
        } else {
            previewText = $.map(payloads, function (payload, index) {
                return "API Call " + (index + 1) + "\n" + JSON.stringify(payload, null, 2);
            }).join("\n\n");
        }

        this.$modal.find("[data-role='preview']").text(previewText);
    };

    AllskyKamera.prototype.getConfig = function () {
        var config = normalizeConfig(this.state.config, this.options.frequencyMinutes, this.options.dailyLimit);
        $.each(config.entries, function (_, entry) {
            entry.fields = $.map(entry.fields, function (field) {
                if (!field.name || !field.variable) {
                    return null;
                }
                return normalizeField(field);
            });
        });
        return config;
    };

    AllskyKamera.prototype.getConfigValue = function () {
        return $.extend(true, {}, this.getConfig());
    };

    AllskyKamera.prototype.getConfigText = function () {
        return JSON.stringify(this.getConfigValue());
    };

    AllskyKamera.prototype.getConfigJsonValueText = function () {
        return JSON.stringify(this.getConfigText());
    };

    AllskyKamera.prototype.saveConfig = function () {
        var payload = this.getConfigJsonValueText();

        this.$el.trigger("allskykamera.save", [payload]);

        if ($.isFunction(this.options.onSave)) {
            this.options.onSave.call(this, payload);
        }

        this.showMessage("Config value text passed to save callback.", false);
        this.$modal.modal("hide");
    };

    AllskyKamera.prototype.destroy = function () {
        this.$el.off().removeData(PLUGIN_NAME);
        if (this.$modal) {
            this.$modal.remove();
        }
    };

    $.fn[PLUGIN_NAME] = function (option) {
        var args = Array.prototype.slice.call(arguments, 1);

        return this.each(function () {
            var $this = $(this);
            var instance = $this.data(PLUGIN_NAME);

            if (!instance) {
                if (typeof option === "string") {
                    throw new Error("allskykamera must be initialised before calling methods.");
                }
                instance = new AllskyKamera(this, option);
                $this.data(PLUGIN_NAME, instance);
                return;
            }

            if (typeof option === "string" && typeof instance[option] === "function") {
                instance[option].apply(instance, args);
            }
        });
    };
}(jQuery));
