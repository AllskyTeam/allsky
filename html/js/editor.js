"use strict";

const EDITOR_FILE_ENDPOINT = "includes/uiutil.php?request=EditorFile";
const EDITOR_FORM_VIEW = "form";
const EDITOR_MIN_HEIGHT = 250;
const EDITOR_SOURCE_VIEW = "source";

class AllskyEditor {
	constructor(config) {
		this.config = config || {};
		this.clearTimer = null;
		this.currentMarks = [];
		this.currentFileKey = this.config.initialKey || "";
		this.editor = null;
		this.editorContainer = $();
		this.fileStatus = Object.assign({}, this.config.fileStatuses || {});
		this.filesByKey = this.buildFileMap(this.config.files || []);
		this.activeView = EDITOR_SOURCE_VIEW;
		this.currentSchemaHasChangeFields = false;
		this.jedison = null;
		this.jedisonContainer = $();
		this.jsonErrorLineHandle = null;
		this.loadingCount = 0;
		this.pendingReadRequest = null;
		this.pendingSaveRequest = null;
		this.refreshTimer = null;
		this.resizeRequest = null;
		this.schemasByKey = {};
		this.saveModalTimer = null;
		this.showAllFormFields = false;
		this.suppressJedisonChange = false;
		this.suppressChangeRefresh = false;

		if (this.currentFileKey === "") {
			this.currentFileKey = this.getFirstFileKey();
		}
		if (this.currentFileKey !== "" && this.isUsableSchema(this.config.initialSchema)) {
			this.schemasByKey[this.currentFileKey] = this.config.initialSchema;
		}
	}

	static escapeHtml(value) {
		return $("<div>").text(value === null || value === undefined ? "" : String(value)).html();
	}

	static numericStyle(value) {
		const numeric = parseFloat(value);
		return Number.isFinite(numeric) ? numeric : 0;
	}

	static isVisible(element) {
		const target = $(element);
		return target.length > 0 && target.is(":visible");
	}

	static outerHeight(element) {
		const target = $(element);
		if (target.length === 0) {
			return 0;
		}

		return target.outerHeight(true) || 0;
	}

	static cloneJson(value) {
		return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
	}

	static jsonValuesEqual(left, right) {
		if (Object.is(left, right)) {
			return true;
		}
		if (left === null || right === null || typeof left !== "object" || typeof right !== "object") {
			return false;
		}
		if (Array.isArray(left) !== Array.isArray(right)) {
			return false;
		}
		if (Array.isArray(left)) {
			return left.length === right.length && left.every((item, index) => AllskyEditor.jsonValuesEqual(item, right[index]));
		}

		const leftKeys = Object.keys(left);
		const rightKeys = Object.keys(right);
		return leftKeys.length === rightKeys.length && leftKeys.every(key =>
			Object.prototype.hasOwnProperty.call(right, key) &&
			AllskyEditor.jsonValuesEqual(left[key], right[key])
		);
	}

	static getJsonErrorPosition(message) {
		const match = String(message || "").match(/position\s+(\d+)/i);
		return match ? parseInt(match[1], 10) : null;
	}

	static getJsonErrorLineColumn(message) {
		const match = String(message || "").match(/line\s+(\d+)\s+column\s+(\d+)/i);
		if (!match) {
			return { line: null, column: null };
		}

		return {
			line: parseInt(match[1], 10),
			column: parseInt(match[2], 10)
		};
	}

	static getJsonLineColumnFromPosition(jsonString, position) {
		if (!Number.isInteger(position) || position < 0) {
			return { line: null, column: null };
		}

		const beforeError = String(jsonString || "").slice(0, position);
		const lines = beforeError.split(/\r\n|\n|\r/);
		return {
			line: lines.length,
			column: lines[lines.length - 1].length + 1
		};
	}

	isUsableSchema(schema) {
		return schema !== null && typeof schema === "object" && !Array.isArray(schema);
	}

	getJedisonConstraints() {
		return {
			"x-notvalue": context => this.validateXNotValue(context)
		};
	}

	validateXNotValue(context) {
		const schema = context.schema || {};
		if (!Object.prototype.hasOwnProperty.call(schema, "x-notvalue")) {
			return [];
		}
		if (!AllskyEditor.jsonValuesEqual(context.value, schema["x-notvalue"])) {
			return [];
		}

		return [{
			type: "error",
			path: context.path,
			constraint: "x-notvalue",
			property: "x-notvalue",
			messages: ["This value is not allowed"]
		}];
	}

	prepareSchemaForEditor(schema) {
		const schemaCopy = AllskyEditor.cloneJson(schema);
		if (this.isUsableSchema(schemaCopy) && this.currentSchemaHasChangeFields && !this.showAllFormFields) {
			this.applyChangeVisibility(schemaCopy, true);
		}

		return schemaCopy;
	}

	schemaHasChangeFields(schemaNode) {
		if (!this.isUsableSchema(schemaNode)) {
			return false;
		}
		if (schemaNode["x-change"] === true) {
			return true;
		}

		if (this.isUsableSchema(schemaNode.properties) && Object.keys(schemaNode.properties).some(key => this.schemaHasChangeFields(schemaNode.properties[key]))) {
			return true;
		}
		if (this.isUsableSchema(schemaNode.patternProperties) && Object.keys(schemaNode.patternProperties).some(key => this.schemaHasChangeFields(schemaNode.patternProperties[key]))) {
			return true;
		}
		if (this.schemaHasChangeFields(schemaNode.additionalProperties) || this.schemaHasChangeFields(schemaNode.items)) {
			return true;
		}
		if (Array.isArray(schemaNode.prefixItems) && schemaNode.prefixItems.some(itemSchema => this.schemaHasChangeFields(itemSchema))) {
			return true;
		}
		if (["allOf", "anyOf", "oneOf"].some(key => Array.isArray(schemaNode[key]) && schemaNode[key].some(childSchema => this.schemaHasChangeFields(childSchema)))) {
			return true;
		}
		if (["contains", "if", "then", "else", "not"].some(key => this.schemaHasChangeFields(schemaNode[key]))) {
			return true;
		}
		if (this.isUsableSchema(schemaNode.dependentSchemas) && Object.keys(schemaNode.dependentSchemas).some(key => this.schemaHasChangeFields(schemaNode.dependentSchemas[key]))) {
			return true;
		}

		return false;
	}

	applyChangeVisibility(schemaNode, isRoot) {
		if (!this.isUsableSchema(schemaNode)) {
			return false;
		}

		let hasChangeField = schemaNode["x-change"] === true;

		if (this.isUsableSchema(schemaNode.properties)) {
			Object.keys(schemaNode.properties).forEach(key => {
				hasChangeField = this.applyChangeVisibility(schemaNode.properties[key], false) || hasChangeField;
			});
		}
		if (this.isUsableSchema(schemaNode.patternProperties)) {
			Object.keys(schemaNode.patternProperties).forEach(key => {
				hasChangeField = this.applyChangeVisibility(schemaNode.patternProperties[key], false) || hasChangeField;
			});
		}
		if (this.isUsableSchema(schemaNode.additionalProperties)) {
			hasChangeField = this.applyChangeVisibility(schemaNode.additionalProperties, false) || hasChangeField;
		}
		if (this.isUsableSchema(schemaNode.items)) {
			hasChangeField = this.applyChangeVisibility(schemaNode.items, false) || hasChangeField;
		}
		if (Array.isArray(schemaNode.prefixItems)) {
			schemaNode.prefixItems.forEach(itemSchema => {
				hasChangeField = this.applyChangeVisibility(itemSchema, false) || hasChangeField;
			});
		}
		["allOf", "anyOf", "oneOf"].forEach(key => {
			if (Array.isArray(schemaNode[key])) {
				schemaNode[key].forEach(childSchema => {
					hasChangeField = this.applyChangeVisibility(childSchema, false) || hasChangeField;
				});
			}
		});
		["contains", "if", "then", "else", "not"].forEach(key => {
			if (this.isUsableSchema(schemaNode[key])) {
				hasChangeField = this.applyChangeVisibility(schemaNode[key], false) || hasChangeField;
			}
		});
		if (this.isUsableSchema(schemaNode.dependentSchemas)) {
			Object.keys(schemaNode.dependentSchemas).forEach(key => {
				hasChangeField = this.applyChangeVisibility(schemaNode.dependentSchemas[key], false) || hasChangeField;
			});
		}

		if (!isRoot) {
			if (hasChangeField) {
				delete schemaNode["x-hidden"];
			} else {
				schemaNode["x-hidden"] = true;
			}
		}

		return hasChangeField;
	}

	buildFileMap(files) {
		const filesByKey = {};
		if (!Array.isArray(files)) {
			return filesByKey;
		}

		files.forEach(file => {
			if (file && typeof file.key === "string" && file.key !== "") {
				filesByKey[file.key] = Object.assign({}, file);
			}
		});

		return filesByKey;
	}

	getFirstFileKey() {
		const keys = Object.keys(this.filesByKey);
		return keys.length > 0 ? keys[0] : "";
	}

	syncFormFieldVisibilityToggle() {
		const visible = this.jedison !== null && this.currentSchemaHasChangeFields;
		const effectiveShowAll = !this.currentSchemaHasChangeFields || this.showAllFormFields;
		const label = effectiveShowAll ? "Show All" : "Show required";
		const button = $("#as-editor-toggle-fields");
		button.closest("li").toggle(visible);
		button
			.toggleClass("disabled", !visible)
			.toggleClass("active", effectiveShowAll)
			.attr("aria-disabled", visible ? "false" : "true")
			.attr("aria-label", label)
			.attr("title", label)
			.attr("data-original-title", label);
		$("#as-editor-toggle-fields-label").text(label);
		$(".as-editor-field-mode")
			.parent()
			.removeClass("active");
		$(".as-editor-field-mode")
			.filter('[data-show-all="' + (effectiveShowAll ? "true" : "false") + '"]')
			.parent()
			.addClass("active");
	}

	changeFormFieldVisibility(event) {
		if (event && typeof event.preventDefault === "function") {
			event.preventDefault();
		}
		if ($("#as-editor-toggle-fields").hasClass("disabled") || !this.currentSchemaHasChangeFields) {
			return;
		}

		const target = $(event.currentTarget);
		const requestedValue = target.attr("data-show-all");
		const nextShowAll = requestedValue === "true";
		if (requestedValue !== "true" && requestedValue !== "false") {
			return;
		}
		if (nextShowAll === this.showAllFormFields) {
			this.syncFormFieldVisibilityToggle();
			return;
		}

		const previousShowAll = this.showAllFormFields;
		this.showAllFormFields = nextShowAll;
		if (this.jedison === null || !this.hasSchemaForFile(this.currentFileKey)) {
			this.syncFormFieldVisibilityToggle();
			return;
		}

		const parsed = this.activeView === EDITOR_SOURCE_VIEW ?
			this.parseJsonContent(this.editor.getDoc().getValue()) :
			{ valid: true, value: this.jedison.getValue() };
		if (!parsed.valid) {
			this.showAllFormFields = previousShowAll;
			this.showInvalidJsonAlert(parsed);
			this.syncFormFieldVisibilityToggle();
			return;
		}

		this.suppressJedisonChange = true;
		try {
			this.createJedison(this.currentFileKey, parsed.value);
		} finally {
			this.suppressJedisonChange = false;
		}
		this.queueEditorResize();
	}

	init() {
		const editorContainer = $("#editorContainer");
		if (editorContainer.length === 0) {
			return;
		}
		this.editorContainer = editorContainer;
		this.jedisonContainer = $("#jedisonContainer");

		this.createEditor(editorContainer, this.config.initialContent || "");
		this.editor.on("change", () => {
			this.clearJsonErrorLine();
			if (!this.suppressChangeRefresh) {
				this.queueEditorStateRefresh();
			}
		});

		this.setupTabs();
		this.configureEditorViews(
			this.currentFileKey,
			this.config.initialContent || "",
			this.config.initialSchema,
			true
		);
		this.refreshEditorState();
		$(window).off("resize.allskyEditor").on("resize.allskyEditor", () => this.queueEditorResize());
		const pageBody = $("body");
		if (pageBody.length > 0) {
			new MutationObserver(() => this.syncEditorTheme()).observe(pageBody[0], {
				attributes: true,
				attributeFilter: ["class"]
			});
		}

		$("#save_file").off("click.allskyEditor").on("click.allskyEditor", event => this.saveFile(event));
		$("#script_path").off("change.allskyEditor").on("change.allskyEditor", event => this.changeFile(event));
		$("#as-editor-toggle-fields").off("click.allskyEditor").on("click.allskyEditor", event => {
			if ($(event.currentTarget).hasClass("disabled")) {
				event.preventDefault();
				event.stopPropagation();
			}
		});
		$(".as-editor-field-mode").off("click.allskyEditor").on("click.allskyEditor", event => this.changeFormFieldVisibility(event));
		$("#as-file-editor-navbar")
			.off("shown.bs.collapse.allskyEditor hidden.bs.collapse.allskyEditor")
			.on("shown.bs.collapse.allskyEditor hidden.bs.collapse.allskyEditor", () => this.queueEditorResize());
		$("#as-editor-save-modal")
			.appendTo("body")
			.off("hidden.bs.modal.allskyEditor")
			.on("hidden.bs.modal.allskyEditor", () => this.clearSaveModalTimer());
	}

	setupTabs() {
		$("#editor-form-tab").off("click.allskyEditor").on("click.allskyEditor", event => {
			event.preventDefault();
			this.showEditorView(EDITOR_FORM_VIEW);
		});
		$("#editor-source-tab").off("click.allskyEditor").on("click.allskyEditor", event => {
			event.preventDefault();
			this.showEditorView(EDITOR_SOURCE_VIEW);
		});
	}

	showEditorView(view) {
		if (view === EDITOR_FORM_VIEW) {
			if (!this.hasSchemaForFile(this.currentFileKey) || !this.syncFormFromSource()) {
				return false;
			}
			this.activateEditorTab(EDITOR_FORM_VIEW);
			return true;
		}

		if (this.syncSourceFromForm(true) === null) {
			return false;
		}
		this.activateEditorTab(EDITOR_SOURCE_VIEW);
		this.queueEditorResize();
		return true;
	}

	activateEditorTab(view) {
		const showForm = view === EDITOR_FORM_VIEW;
		this.activeView = showForm ? EDITOR_FORM_VIEW : EDITOR_SOURCE_VIEW;
		$("#editor-form-tab").parent().toggleClass("active", showForm);
		$("#editor-source-tab").parent().toggleClass("active", !showForm);
		$("#editor-form-pane").toggleClass("active", showForm);
		$("#editor-source-pane").toggleClass("active", !showForm);
		this.refreshEditorState();
		this.queueEditorResize();
	}

	resizeEditor() {
		if (this.editor === null) {
			return;
		}

		const editorContainer = $("#editorContainer");
		if (editorContainer.length === 0) {
			return;
		}

		if (this.resizeTabbedEditor(editorContainer)) {
			return;
		}

		this.resizeSourceEditor(editorContainer);
	}

	getAvailableEditorHeight(anchorElement) {
		const anchor = $(anchorElement);
		if (!AllskyEditor.isVisible(anchor)) {
			return EDITOR_MIN_HEIGHT;
		}

		const bottomSection = $(".editorBottomSection");
		const editorOffset = anchor.offset();
		const editorTop = editorOffset ? editorOffset.top - $(window).scrollTop() : 0;
		const bottomHeight = bottomSection.length > 0 ? bottomSection.outerHeight(true) || 0 : 0;
		const panelBody = anchor.closest(".panel-body");
		const panelBottomPadding = panelBody.length > 0 ? AllskyEditor.numericStyle(panelBody.css("padding-bottom")) : 0;
		const panel = anchor.closest(".panel");
		const panelBottomMargin = panel.length > 0 ? AllskyEditor.numericStyle(panel.css("margin-bottom")) : 0;
		const bottomMargin = 12;
		const viewportHeight = $(window).height() || window.innerHeight;
		const editorHeight = Math.max(
			EDITOR_MIN_HEIGHT,
			viewportHeight - editorTop - bottomHeight - panelBottomPadding - panelBottomMargin - bottomMargin
		);

		return editorHeight;
	}

	resizeTabbedEditor(editorContainer) {
		const editorTabs = $("#editor-tabs");
		const tabContent = editorTabs.find(".tab-content");
		const tabHeaders = editorTabs.find(".nav-tabs");
		if (!AllskyEditor.isVisible(editorTabs) || tabContent.length === 0) {
			return false;
		}

		const editorHeight = this.getAvailableEditorHeight(editorTabs);
		const tabContentHeight = Math.max(EDITOR_MIN_HEIGHT, editorHeight - AllskyEditor.outerHeight(tabHeaders));
		editorTabs.css({
			height: editorHeight + "px",
			maxHeight: editorHeight + "px"
		});
		tabContent.css({
			height: tabContentHeight + "px",
			maxHeight: tabContentHeight + "px"
		});

		if (AllskyEditor.isVisible(editorContainer)) {
			this.editor.setSize("100%", tabContentHeight);
			this.editor.refresh();
		}

		return true;
	}

	resizeSourceEditor(editorContainer) {
		if (!AllskyEditor.isVisible(editorContainer)) {
			return;
		}

		const editorHeight = this.getAvailableEditorHeight(editorContainer);

		this.editor.setSize("100%", editorHeight);
		this.editor.refresh();
	}

	queueEditorResize() {
		if (this.resizeRequest !== null) {
			return;
		}

		const requestFrame = window.requestAnimationFrame || (callback => window.setTimeout(callback, 16));
		this.resizeRequest = requestFrame(() => {
			this.resizeRequest = null;
			this.resizeEditor();
		});
	}

	clearEditorStateRefresh() {
		if (this.refreshTimer !== null) {
			clearTimeout(this.refreshTimer);
			this.refreshTimer = null;
		}
	}

	queueEditorStateRefresh() {
		this.clearEditorStateRefresh();
		this.refreshTimer = setTimeout(() => {
			this.refreshTimer = null;
			this.refreshEditorState();
		}, 100);
	}

	refreshEditorState() {
		this.clearEditorStateRefresh();
		this.highlightText(this.config.needToUpdate);
		this.checkCorruption();
	}

	getEditorTheme() {
		return $("body").hasClass("dark") ? "monokai" : "default";
	}

	syncEditorTheme() {
		if (this.editor === null) {
			return;
		}

		this.editor.setOption("theme", this.getEditorTheme());
	}

	getSelectedKey() {
		const selectedKey = $("#script_path").val();
		if (typeof selectedKey === "string" && selectedKey !== "") {
			return selectedKey;
		}

		return this.currentFileKey;
	}

	getFileMetadata(fileKey) {
		const file = this.filesByKey[fileKey];
		if (file) {
			return file;
		}

		return {
			key: fileKey,
			label: fileKey,
			fileName: fileKey,
			validateJson: true,
			hasSchema: false,
			schemaFileName: "",
			schemaError: ""
		};
	}

	getFileLabel(fileKey) {
		const file = this.getFileMetadata(fileKey);
		return file.label || file.fileName || fileKey;
	}

	shouldValidateJson(fileKey) {
		return this.getFileMetadata(fileKey).validateJson !== false;
	}

	updateFileMetadata(fileKey, data) {
		const existing = this.getFileMetadata(fileKey);
		const hasValidateJson = Object.prototype.hasOwnProperty.call(data, "validateJson");
		const schema = this.isUsableSchema(data.schema) ? data.schema : null;
		this.filesByKey[fileKey] = {
			key: fileKey,
			label: data.label || existing.label || fileKey,
			fileName: data.fileName || existing.fileName || fileKey,
			validateJson: hasValidateJson ? data.validateJson !== false : existing.validateJson !== false,
			hasSchema: schema !== null,
			schemaFileName: data.schemaFileName || existing.schemaFileName || "",
			schemaError: data.schemaError || ""
		};

		if (schema !== null) {
			this.schemasByKey[fileKey] = schema;
		} else {
			delete this.schemasByKey[fileKey];
		}
	}

	hasSchemaForFile(fileKey) {
		return this.isUsableSchema(this.schemasByKey[fileKey]);
	}

	getSchemaForFile(fileKey) {
		return this.hasSchemaForFile(fileKey) ? this.schemasByKey[fileKey] : null;
	}

	checkCorruption() {
		const fileKey = this.getSelectedKey();
		const ok = !this.shouldValidateJson(fileKey) || this.fileStatus[fileKey] !== false;
		const fileCorruption = $("#file-corruption");
		if (fileCorruption.length === 0) {
			return;
		}

		if (ok) {
			fileCorruption.empty();
		} else {
			let message = "This file appears corrupted.<br>";
			message += "Scroll down in the window below until you see a";
			message += " <div class='CodeMirror-lint-marker CodeMirror-lint-marker-error'></div>";
			message += " on the left side of the window.";
			fileCorruption.html('<div class="alert alert-danger">' + message + "</div>");
		}
		this.queueEditorResize();
	}

	highlightText(searchTerm) {
		this.currentMarks.forEach(mark => mark.clear());
		this.currentMarks = [];

		const term = typeof searchTerm === "string" ? searchTerm : String(searchTerm || "");
		if (this.editor === null || term === "" || typeof this.editor.getSearchCursor !== "function") {
			this.setNeedToUpdateMessage("");
			this.queueEditorResize();
			return;
		}

		let numMatches = 0;
		const cursor = this.editor.getSearchCursor(term, null, { caseFold: true });
		while (cursor.findNext()) {
			const mark = this.editor.markText(cursor.from(), cursor.to(), {
				className: "as-editor-highlight",
			});
			numMatches++;
			this.currentMarks.push(mark);
		}

		if (numMatches === 0 || this.activeView !== EDITOR_SOURCE_VIEW) {
			this.setNeedToUpdateMessage("");
		} else {
			let message = "NOTE: You must update all <span class='as-editor-highlight'>";
			message += AllskyEditor.escapeHtml(term);
			message += "</span> values below before the Website will work.";
			this.setNeedToUpdateMessage('<div class="alert alert-warning">' + message + "</div>");
		}
		this.queueEditorResize();
	}

	setNeedToUpdateMessage(message) {
		$("#need-to-update").html(message);
	}

	clearJsonErrorLine() {
		if (this.editor !== null && this.jsonErrorLineHandle !== null) {
			this.editor.removeLineClass(this.jsonErrorLineHandle, "background", "as-json-error-line");
		}
		this.jsonErrorLineHandle = null;
	}

	pinpointJsonError(details) {
		if (this.editor === null || !details || !Number.isInteger(details.line)) {
			return;
		}

		if (this.activeView !== EDITOR_SOURCE_VIEW) {
			this.activateEditorTab(EDITOR_SOURCE_VIEW);
		}

		this.clearJsonErrorLine();
		const lineCount = this.editor.lineCount();
		if (lineCount < 1) {
			return;
		}

		const targetLine = Math.max(0, Math.min(details.line - 1, lineCount - 1));
		const lineText = this.editor.getLine(targetLine) || "";
		const targetColumn = Number.isInteger(details.column) ? details.column - 1 : 0;
		const targetCh = Math.max(0, Math.min(targetColumn, lineText.length));

		this.jsonErrorLineHandle = this.editor.addLineClass(targetLine, "background", "as-json-error-line");
		this.editor.setCursor({ line: targetLine, ch: targetCh });
		this.editor.scrollIntoView({ line: targetLine, ch: targetCh }, 120);
		this.queueEditorResize();
	}

	validateJSON(jsonString) {
		try {
			JSON.parse(jsonString);
			this.clearJsonErrorLine();
			return { valid: true, error: null };
		} catch (error) {
			return this.buildJsonErrorDetails(jsonString, error);
		}
	}

	buildJsonErrorDetails(jsonString, error) {
		const message = error && error.message ? error.message : String(error || "Invalid JSON");
		const position = AllskyEditor.getJsonErrorPosition(message);
		let location = AllskyEditor.getJsonLineColumnFromPosition(jsonString, position);

		if (location.line === null || location.column === null) {
			location = AllskyEditor.getJsonErrorLineColumn(message);
		}

		return {
			valid: false,
			error: message,
			position: position,
			line: location.line,
			column: location.column,
			snippet: this.formatJsonErrorSnippet(jsonString, location.line, location.column)
		};
	}

	formatJsonErrorSnippet(jsonString, lineNumber, columnNumber) {
		if (!Number.isInteger(lineNumber) || lineNumber < 1) {
			return "";
		}

		const lines = String(jsonString || "").split(/\r\n|\n|\r/);
		const errorLineIndex = lineNumber - 1;
		if (errorLineIndex < 0 || errorLineIndex >= lines.length) {
			return "";
		}

		const start = Math.max(0, errorLineIndex - 2);
		const end = Math.min(lines.length, errorLineIndex + 3);
		const lineNumberWidth = String(end).length;
		const output = [];
		const maxLineLength = 140;

		for (let index = start; index < end; index++) {
			const isErrorLine = index === errorLineIndex;
			const line = lines[index];
			const formatted = this.formatJsonSnippetLine(line, isErrorLine ? columnNumber : null, maxLineLength);
			const prefix = (isErrorLine ? "> " : "  ") + String(index + 1).padStart(lineNumberWidth, " ") + " | ";
			output.push(prefix + formatted.text);
			if (isErrorLine && Number.isInteger(formatted.column) && formatted.column > 0) {
				output.push(" ".repeat(prefix.length + formatted.column - 1) + "^");
			}
		}

		return output.join("\n");
	}

	formatJsonSnippetLine(line, columnNumber, maxLineLength) {
		if (line.length <= maxLineLength) {
			return { text: line, column: columnNumber };
		}

		if (!Number.isInteger(columnNumber) || columnNumber < 1) {
			return { text: line.slice(0, maxLineLength) + "...", column: null };
		}

		const zeroColumn = columnNumber - 1;
		const contextBefore = 55;
		const start = Math.max(0, Math.min(zeroColumn - contextBefore, line.length - maxLineLength));
		const end = Math.min(line.length, start + maxLineLength);
		const prefix = start > 0 ? "..." : "";
		const suffix = end < line.length ? "..." : "";

		return {
			text: prefix + line.slice(start, end) + suffix,
			column: columnNumber - start + prefix.length
		};
	}

	clearMessageTimer() {
		if (this.clearTimer !== null) {
			clearTimeout(this.clearTimer);
			this.clearTimer = null;
		}
	}

	startTimer(milliseconds) {
		this.clearMessageTimer();
		this.clearTimer = setTimeout(() => {
			this.clearTimer = null;
			$("#editor-messages").empty();
			this.queueEditorResize();
		}, milliseconds);
	}

	createEditor(container, data) {
		const fileKey = this.currentFileKey;
		const validateJson = this.shouldValidateJson(fileKey);
		this.editor = CodeMirror(container[0], {
			value: data,
			theme: this.getEditorTheme(),
			lineNumbers: true,
			mode: this.getEditorMode(this.getFileMetadata(fileKey)),
			gutters: ["CodeMirror-lint-markers"],
			lint: validateJson
		});
		this.resizeEditor();
	}

	setEditorValue(data, refreshState) {
		if (this.editor === null) {
			return;
		}
		const shouldRefresh = refreshState !== false;

		this.suppressChangeRefresh = true;
		try {
			this.editor.getDoc().setValue(typeof data === "string" ? data : "");
		} finally {
			this.suppressChangeRefresh = false;
		}
		if (shouldRefresh) {
			this.refreshEditorState();
		}
	}

	saveFile(event) {
		if (event && typeof event.preventDefault === "function") {
			event.preventDefault();
		}
		if (this.editor === null || $("#save_file").hasClass("disabled")) {
			return;
		}

		this.clearMessageTimer();
		if (this.pendingReadRequest !== null) {
			this.showEditorMessage("Wait for the selected file to finish loading before saving.", "warning", false);
			return;
		}
		if (this.pendingSaveRequest !== null) {
			return;
		}

		const fileKey = this.getSelectedKey();
		const content = this.getContentForSave(fileKey);
		if (content === null) {
			return;
		}
		const validateJson = this.shouldValidateJson(fileKey);
		if (validateJson) {
			const jsonStatus = this.validateJSON(content);
			if (!jsonStatus.valid) {
				this.showInvalidJsonAlert(jsonStatus);
				return;
			}
		}

		this.setSaveEnabled(false);
		this.showLoading();
		const request = $.ajax({
			type: "POST",
			url: EDITOR_FILE_ENDPOINT,
			data: { content: content, key: fileKey },
			dataType: "json",
			cache: false,
			success: data => this.handleSaveSuccess(data, fileKey),
			error: (xmlHttpRequest, textStatus, errorThrown) => this.handleSaveError(fileKey, xmlHttpRequest, errorThrown),
			complete: () => {
				if (this.pendingSaveRequest === request) {
					this.pendingSaveRequest = null;
					this.setSaveEnabled(this.currentFileKey !== "");
				}
				this.hideLoading();
			}
		});
		this.pendingSaveRequest = request;
	}

	getContentForSave(fileKey) {
		if (this.activeView === EDITOR_FORM_VIEW && this.hasSchemaForFile(fileKey)) {
			return this.getJedisonContentForSave();
		}

		return this.editor.getDoc().getValue();
	}

	getJedisonContentForSave() {
		if (this.jedison === null) {
			return this.editor.getDoc().getValue();
		}

		const errors = this.jedison.getErrors(["error"]);
		if (errors.length > 0) {
			this.jedison.showValidationErrors(errors);
			this.showEditorMessage("The form has validation errors. Fix them before saving from the form tab.", "danger", false);
			this.queueEditorResize();
			return null;
		}

		return this.syncSourceFromForm(false);
	}

	handleSaveSuccess(data, fileKey) {
		const result = this.parseSaveResponse(data);
		if (result.ok) {
			this.fileStatus[fileKey] = true;
			this.checkCorruption();
		}

		this.showSaveResultModal(result.message, result.cssClass, true, result.ok);
	}

	parseSaveResponse(data) {
		if (!data || typeof data !== "object") {
			return { message: "No response from uiutil.php", ok: false, cssClass: "danger" };
		}

		const ok = !!data.ok && data.error !== true;
		let cssClass = ok ? "success" : "danger";
		if (ok && data.warning) {
			cssClass = "warning";
		}

		return {
			message: data.message || (ok ? "File saved" : "Unable to save file"),
			ok: ok,
			cssClass: cssClass
		};
	}

	handleSaveError(fileKey, xmlHttpRequest, errorThrown) {
		const response = xmlHttpRequest.responseJSON || {};
		const message = response.message || errorThrown || "Request failed";
		const label = this.getFileLabel(fileKey);
		this.showSaveResultModal("Unable to save '" + label + "': " + message, "danger", false, false);
	}

	clearSaveModalTimer() {
		if (this.saveModalTimer !== null) {
			clearTimeout(this.saveModalTimer);
			this.saveModalTimer = null;
		}
	}

	showSaveResultModal(message, cssClass, isHtml, autoClose) {
		this.clearSaveModalTimer();

		const modal = $("#as-editor-save-modal");
		if (modal.length === 0 || typeof modal.modal !== "function") {
			this.showEditorMessage(message, cssClass, isHtml);
			return;
		}

		const type = ["success", "warning", "danger"].indexOf(cssClass) === -1 ? "success" : cssClass;
		const titleMap = {
			success: "File Saved",
			warning: "File Saved",
			danger: "Save Failed"
		};
		const iconMap = {
			success: "fa-solid fa-circle-check",
			warning: "fa-solid fa-triangle-exclamation",
			danger: "fa-solid fa-circle-xmark"
		};
		const content = isHtml ? message : AllskyEditor.escapeHtml(message);

		modal
			.removeClass("as-editor-save-modal-success as-editor-save-modal-warning as-editor-save-modal-danger")
			.addClass("as-editor-save-modal-" + type);
		modal.find("#as-editor-save-modal-title").text(titleMap[type]);
		modal.find("#as-editor-save-modal-icon").attr("class", iconMap[type]);
		modal.find("#as-editor-save-modal-message").html(content);
		modal.modal({
			backdrop: autoClose ? true : "static",
			keyboard: true,
			show: true
		});

		if (autoClose) {
			this.saveModalTimer = setTimeout(() => {
				this.saveModalTimer = null;
				modal.modal("hide");
			}, 2000);
		}
	}

	showInvalidJsonAlert(details) {
		const errorDetails = details && typeof details === "object" ?
			details :
			{ error: String(details || "Invalid JSON"), line: null, column: null, snippet: "" };
		this.pinpointJsonError(errorDetails);

		let message = '<div class="as-json-error-dialog">';
		message += '<p class="as-json-error-summary">The JSON contains a syntax error. Fix it before saving or using the form view.</p>';
		message += '<dl class="as-json-error-meta">';
		message += "<dt>Parser message</dt>";
		message += "<dd><code>" + AllskyEditor.escapeHtml(errorDetails.error) + "</code></dd>";
		if (Number.isInteger(errorDetails.line)) {
			message += "<dt>Location</dt>";
			message += "<dd>Line " + errorDetails.line;
			if (Number.isInteger(errorDetails.column)) {
				message += ", column " + errorDetails.column;
			}
			message += "</dd>";
			message += "<dt>Editor</dt>";
			message += "<dd>The JSON tab has been moved to the error line.</dd>";
		}
		message += "</dl>";
		if (errorDetails.snippet) {
			message += '<div class="as-json-error-snippet-title">Nearby JSON</div>';
			message += '<pre class="as-json-error-snippet"><code>' + AllskyEditor.escapeHtml(errorDetails.snippet) + "</code></pre>";
		}
		message += "</div>";

		bootbox.alert({
			title: '<i class="fa-solid fa-circle-exclamation" aria-hidden="true"></i> Invalid JSON',
			message: message,
			buttons: {
				ok: {
					label: "Close",
					className: "btn-danger"
				}
			}
		});
	}

	showEditorMessage(message, cssClass, isHtml) {
		const messages = $("#editor-messages");
		if (messages.length === 0) {
			return;
		}

		const content = isHtml ? message : AllskyEditor.escapeHtml(message);
		let messageHtml = '<div class="alert alert-' + cssClass + ' alert-dismissible" role="alert">';
		messageHtml += '<button type="button" class="close" data-dismiss="alert" aria-label="Close">';
		messageHtml += '<span aria-hidden="true">&times;</span>';
		messageHtml += "</button>";
		messageHtml += content;
		messageHtml += "</div>";
		messages.html(messageHtml);
	}

	showLoading() {
		this.loadingCount += 1;
		if (this.loadingCount > 1) {
			return;
		}

		const panelBody = $(".panel-body");
		if (typeof panelBody.LoadingOverlay === "function") {
			panelBody.LoadingOverlay("show", {
				background: "rgba(0, 0, 0, 0.5)"
			});
		}
	}

	hideLoading() {
		this.loadingCount = Math.max(0, this.loadingCount - 1);
		if (this.loadingCount > 0) {
			return;
		}

		const panelBody = $(".panel-body");
		if (typeof panelBody.LoadingOverlay === "function") {
			panelBody.LoadingOverlay("hide", true);
		}
	}

	setSaveEnabled(enabled) {
		$("#save_file")
			.toggleClass("disabled", !enabled)
			.attr("aria-disabled", enabled ? "false" : "true");
	}

	configureEditorViews(fileKey, content, schema, preferForm) {
		const validJson = this.fileStatus[fileKey] !== false;
		if (!this.isUsableSchema(schema) || !validJson) {
			this.hideJedisonTabs();
			const file = this.getFileMetadata(fileKey);
			if (file.schemaError) {
				this.showEditorMessage(file.schemaError, "warning", false);
				this.startTimer(8000);
			}
			return;
		}

		this.schemasByKey[fileKey] = schema;
		if (!this.showJedisonTabs(fileKey, content)) {
			this.hideJedisonTabs();
			return;
		}

		if (preferForm) {
			this.activateEditorTab(EDITOR_FORM_VIEW);
		} else {
			this.activateEditorTab(this.activeView);
		}
	}

	showJedisonTabs(fileKey, content) {
		if (typeof window.Jedison === "undefined" || this.jedisonContainer.length === 0) {
			this.showEditorMessage("The JSON form editor is not available. Use the JSON tab instead.", "warning", false);
			this.startTimer(8000);
			return false;
		}

		const parsed = this.parseJsonContent(content);
		if (!parsed.valid) {
			this.hideJedisonTabs();
			return false;
		}

		this.moveEditorToTabbedPane();
		$("#editor-source-only").hide();
		$("#editor-tabs").show();
		return this.createJedison(fileKey, parsed.value);
	}

	hideJedisonTabs() {
		this.destroyJedison();
		this.moveEditorToSourceOnly();
		$("#editor-tabs").hide();
		$("#editor-source-only").show();
		this.activeView = EDITOR_SOURCE_VIEW;
		this.queueEditorResize();
	}

	moveEditorToTabbedPane() {
		const sourcePane = $("#editor-source-pane");
		if (sourcePane.length > 0 && this.editorContainer.length > 0 && !this.editorContainer.parent().is(sourcePane)) {
			sourcePane.append(this.editorContainer);
		}
	}

	moveEditorToSourceOnly() {
		const sourceOnly = $("#editor-source-only");
		if (sourceOnly.length > 0 && this.editorContainer.length > 0 && !this.editorContainer.parent().is(sourceOnly)) {
			sourceOnly.append(this.editorContainer);
		}
	}

	createJedison(fileKey, data) {
		this.destroyJedison();
		if (this.jedisonContainer.length === 0) {
			return false;
		}

		const sourceSchema = this.getSchemaForFile(fileKey);
		if (!this.isUsableSchema(sourceSchema)) {
			this.currentSchemaHasChangeFields = false;
			return false;
		}
		this.currentSchemaHasChangeFields = this.schemaHasChangeFields(sourceSchema);
		const schema = this.prepareSchemaForEditor(sourceSchema);

		try {
			this.jedison = new window.Jedison.Create({
				container: this.jedisonContainer[0],
				theme: new window.Jedison.ThemeBootstrap3(),
				schema: schema,
				iconLib: 'fontawesome6',
				btnContents: false,
				enableCollapseToggle: true,
				subErrors: false,
				data: data,
				showErrors: "change",
				objectAdd: false,
				enablePropertiesToggle: true,
				constraints: this.getJedisonConstraints(),
				enforceRequired: true,
				enforceMinItems: true,
				enforceMaxItems: true,
				enforceEnum: true
			});
		} catch (error) {
			console.error("Unable to create Jedison editor", error);
			this.showEditorMessage("Unable to create the JSON form editor. Use the JSON tab instead.", "warning", false);
			this.startTimer(8000);
			return false;
		}
		this.jedison.on("change", initiator => {
			if (!this.suppressJedisonChange && initiator === "user") {
				this.syncSourceFromForm(true);
			}
		});
		this.syncFormFieldVisibilityToggle();
		return true;
	}

	destroyJedison() {
		if (this.jedison !== null && typeof this.jedison.destroy === "function") {
			this.jedison.destroy();
		} else if (this.jedisonContainer.length > 0) {
			this.jedisonContainer.empty();
		}
		this.jedison = null;
		this.currentSchemaHasChangeFields = false;
		this.syncFormFieldVisibilityToggle();
	}

	parseJsonContent(content) {
		try {
			return { valid: true, value: JSON.parse(content) };
		} catch (error) {
			return this.buildJsonErrorDetails(content, error);
		}
	}

	syncFormFromSource() {
		if (this.jedison === null) {
			return false;
		}

		const parsed = this.parseJsonContent(this.editor.getDoc().getValue());
		if (!parsed.valid) {
			this.showInvalidJsonAlert(parsed);
			this.activateEditorTab(EDITOR_SOURCE_VIEW);
			this.queueEditorResize();
			return false;
		}

		this.suppressJedisonChange = true;
		try {
			return this.createJedison(this.currentFileKey, parsed.value);
		} finally {
			this.suppressJedisonChange = false;
		}
	}

	syncSourceFromForm(refreshState) {
		if (this.jedison === null) {
			return this.editor.getDoc().getValue();
		}

		const content = JSON.stringify(this.jedison.getValue(), null, "\t");
		if (typeof content !== "string") {
			this.showEditorMessage("The form value could not be converted to JSON.", "danger", false);
			return null;
		}
		this.setEditorValue(content, refreshState);
		this.fileStatus[this.currentFileKey] = true;
		return content;
	}

	changeFile(event) {
		const fileKey = event.currentTarget.value;
		if (!fileKey) {
			return;
		}
		if (fileKey === this.currentFileKey) {
			return;
		}

		this.readFile(fileKey);
	}

	readFile(fileKey) {
		if (this.pendingReadRequest !== null) {
			this.pendingReadRequest.abort();
		}

		this.setSaveEnabled(false);
		this.showLoading();
		const request = $.ajax({
			type: "GET",
			url: EDITOR_FILE_ENDPOINT,
			data: { key: fileKey, _ts: Date.now() },
			dataType: "json",
			cache: false,
			success: data => this.handleFileReadSuccess(fileKey, data),
			error: (response, textStatus, errorThrown) => this.handleFileReadError(fileKey, response, textStatus, errorThrown),
			complete: () => {
				if (this.pendingReadRequest === request) {
					this.pendingReadRequest = null;
					this.setSaveEnabled(this.currentFileKey !== "");
				}
				this.hideLoading();
			}
		});
		this.pendingReadRequest = request;
	}

	handleFileReadSuccess(fileKey, data) {
		if (this.getSelectedKey() !== fileKey) {
			return;
		}

		this.updateFileMetadata(fileKey, data || {});
		this.currentFileKey = fileKey;
		this.fileStatus[fileKey] = !this.shouldValidateJson(fileKey) || (data ? data.validJson !== false : false);
		this.setEditorModeForKey(fileKey);
		const content = data && typeof data.content === "string" ? data.content : "";
		this.setEditorValue(content);
		this.configureEditorViews(fileKey, content, data ? data.schema : null, true);
	}

	handleFileReadError(fileKey, response, textStatus, errorThrown) {
		if (textStatus === "abort") {
			return;
		}

		const data = response.responseJSON || {};
		const message = data.message || errorThrown || ("Requested file [" + fileKey + "] not found or unavailable.");
		if (this.currentFileKey !== "") {
			$("#script_path").val(this.currentFileKey);
		}
		this.showEditorMessage(message, "danger", false);
		this.startTimer(15000);
	}

	setEditorModeForKey(fileKey) {
		if (this.editor === null) {
			return;
		}

		const file = this.getFileMetadata(fileKey);
		this.editor.setOption("mode", this.getEditorMode(file));
		this.editor.setOption("lint", file.validateJson !== false);
	}

	getEditorMode(file) {
		const fileName = (file.fileName || file.key || "").toLowerCase();
		if (file.validateJson !== false || fileName.endsWith(".json")) {
			return "application/json";
		}
		if (fileName.endsWith(".js")) {
			return "javascript";
		}
		if (fileName.endsWith(".sh") || fileName.endsWith(".bash") || fileName.endsWith(".zsh")) {
			return "shell";
		}

		return "text/plain";
	}
}

window.AllskyEditor = AllskyEditor;

function readAllskyEditorConfig() {
	const configElement = $("#allsky-editor-config");
	if (configElement.length === 0) {
		return null;
	}

	const templateContent = configElement.prop("content");
	const rawConfig = templateContent ? $(templateContent).text() : configElement.text();
	if (!rawConfig || rawConfig.trim() === "") {
		return null;
	}

	try {
		const config = JSON.parse(rawConfig);
		return config && typeof config === "object" ? config : null;
	} catch (error) {
		console.error("Unable to parse editor configuration", error);
		return null;
	}
}

$(function () {
	const config = readAllskyEditorConfig();
	if (config === null) {
		return;
	}

	window.allskyEditor = new AllskyEditor(config);
	window.allskyEditor.init();
});
