"use strict";

class AllskyEditor {
	constructor(config) {
		this.config = config || {};
		this.clearTimer = null;
		this.currentMarks = [];
		this.editor = null;
		this.fileStatus = {
			local: !!this.config.localOK,
			remote: !!this.config.remoteOK,
			env: !!this.config.envOK
		};
	}

	init() {
		if (!document.getElementById("editorContainer")) {
			return;
		}

		this.createEditor(this.config.initialContent || "");
		this.editor.on("change", () => {
			// TODO: This is executed TWICE each time a file changes. Why?
			this.highlightText(this.config.needToUpdate);
			this.checkCorruption();
		});

		this.highlightText(this.config.needToUpdate);
		this.checkCorruption();
		jQuery(window).on("resize", () => this.queueEditorResize());
		new MutationObserver(() => this.syncEditorTheme()).observe(document.body, {
			attributes: true,
			attributeFilter: ["class"]
		});

		jQuery("#save_file").on("click", event => this.saveFile(event));
		jQuery("#script_path").on("change", event => this.changeFile(event));
	}

	resizeEditor() {
		if (this.editor === null) {
			return;
		}

		const editorContainer = document.getElementById("editorContainer");
		const bottomSection = document.querySelector(".editorBottomSection");
		if (editorContainer === null || bottomSection === null) {
			return;
		}

		const editorTop = editorContainer.getBoundingClientRect().top;
		const bottomStyle = window.getComputedStyle(bottomSection);
		const bottomHeight = bottomSection.offsetHeight +
			parseFloat(bottomStyle.marginTop) +
			parseFloat(bottomStyle.marginBottom);
		const panelBody = document.querySelector(".panel-body");
		const panelBodyStyle = panelBody ? window.getComputedStyle(panelBody) : null;
		const panelBottomPadding = panelBodyStyle ? parseFloat(panelBodyStyle.paddingBottom) : 0;
		const panel = editorContainer.closest(".panel");
		const panelStyle = panel ? window.getComputedStyle(panel) : null;
		const panelBottomMargin = panelStyle ? parseFloat(panelStyle.marginBottom) : 0;
		const bottomMargin = 12;
		const viewportHeight = document.documentElement.clientHeight || window.innerHeight;
		const editorHeight = Math.max(
			250,
			viewportHeight - editorTop - bottomHeight - panelBottomPadding - panelBottomMargin - bottomMargin
		);

		this.editor.setSize("100%", editorHeight);
		this.editor.refresh();
	}

	queueEditorResize() {
		window.requestAnimationFrame(() => this.resizeEditor());
	}

	getEditorTheme() {
		return document.body.classList.contains("dark") ? "monokai" : "default";
	}

	syncEditorTheme() {
		if (this.editor === null) {
			return;
		}

		this.editor.setOption("theme", this.getEditorTheme());
	}

	getFileType() {
		const path = jQuery("#script_path").val() || "";
		if (path.substr(0, 8) === "{REMOTE}") {
			return "remote";
		}
		if (path === this.config.fullEnvName) {
			return "env";
		}
		return "local";
	}

	checkCorruption() {
		const fileType = this.getFileType();
		const ok = !!this.fileStatus[fileType];
		const fileCorruption = document.getElementById("file-corruption");
		if (fileCorruption === null) {
			return;
		}

		if (ok) {
			fileCorruption.innerHTML = "";
		} else {
			let message = "This file appears corrupted.<br>";
			message += "Scroll down in the window below until you see a";
			message += " <div class='CodeMirror-lint-marker CodeMirror-lint-marker-error'></div>";
			message += " on the left side of the window.";
			fileCorruption.innerHTML = '<div class="alert alert-danger">' + message + "</div>";
		}
		this.queueEditorResize();
	}

	highlightText(searchTerm) {
		this.currentMarks.forEach(mark => mark.clear());
		this.currentMarks = [];

		if (!searchTerm) {
			this.setNeedToUpdateMessage("");
			this.queueEditorResize();
			return;
		}

		let numMatches = 0;
		const cursor = this.editor.getSearchCursor(searchTerm, null, { caseFold: true });
		while (cursor.findNext()) {
			const mark = this.editor.markText(cursor.from(), cursor.to(), {
				className: "as-editor-highlight",
			});
			numMatches++;
			this.currentMarks.push(mark);
		}

		if (numMatches === 0) {
			this.setNeedToUpdateMessage("");
		} else {
			let message = "NOTE: You must update all <span class='as-editor-highlight'>";
			message += this.config.needToUpdate;
			message += "</span> values below before the Website will work.";
			this.setNeedToUpdateMessage('<div class="alert alert-warning">' + message + "</div>");
		}
		this.queueEditorResize();
	}

	setNeedToUpdateMessage(message) {
		const needToUpdate = document.getElementById("need-to-update");
		if (needToUpdate !== null) {
			needToUpdate.innerHTML = message;
		}
	}

	validateJSON(jsonString) {
		try {
			JSON.parse(jsonString);
			return { valid: true, error: null };
		} catch (error) {
			const match = error.message.match(/at position (\d+)/);
			const position = match ? parseInt(match[1], 10) : null;
			return { valid: false, error: error.message, position: position };
		}
	}

	startTimer(milliseconds) {
		this.clearTimer = setInterval(() => {
			clearInterval(this.clearTimer);
			this.clearTimer = null;
			document.getElementById("editor-messages").innerHTML = "";
			this.queueEditorResize();
		}, milliseconds);
	}

	createEditor(data) {
		this.editor = CodeMirror(document.querySelector("#editorContainer"), {
			value: data,
			theme: this.getEditorTheme(),
			lineNumbers: true,
			mode: "application/json",
			gutters: ["CodeMirror-lint-markers"],
			lint: true
		});
		this.resizeEditor();
	}

	saveFile(event) {
		event.preventDefault();
		if (this.clearTimer !== null) {
			clearInterval(this.clearTimer);
			this.clearTimer = null;
		}

		const content = this.editor.doc.getValue();
		const jsonStatus = this.validateJSON(content);
		if (!jsonStatus.valid) {
			this.showInvalidJsonAlert(jsonStatus.error);
			return;
		}

		const saveDetails = this.getSaveDetails();
		jQuery(".panel-body").LoadingOverlay("show", {
			background: "rgba(0, 0, 0, 0.5)"
		});

		jQuery.ajax({
			type: "POST",
			url: "includes/save_file.php",
			data: { content: content, path: saveDetails.fileName, isRemote: saveDetails.isRemote },
			dataType: "text",
			cache: false,
			success: data => this.handleSaveSuccess(data),
			error: (xmlHttpRequest, textStatus, errorThrown) => this.handleSaveError(saveDetails.fileName, errorThrown)
		});
	}

	getSaveDetails() {
		const path = jQuery("#script_path").val() || "";
		const fileType = this.getFileType();
		let fileName = path;
		let isRemote = false;

		if (fileType === "remote") {
			fileName = path.substr(8);
			this.fileStatus.remote = true;
			isRemote = true;
		} else if (fileType === "local") {
			this.fileStatus.local = true;
		} else if (fileType === "env") {
			this.fileStatus.env = true;
		}

		return { fileName: fileName, isRemote: isRemote };
	}

	handleSaveSuccess(data) {
		const result = this.parseSaveResponse(data);
		if (result.ok) {
			this.checkCorruption();
		}

		const messages = document.getElementById("editor-messages");
		if (messages === null) {
			jQuery(".panel-body").LoadingOverlay("hide");
			return;
		}

		let messageHtml = '<div class="alert alert-' + result.cssClass + ' alert-dismissible" role="alert">';
		messageHtml += '<button type="button" class="close" data-dismiss="alert" aria-label="Close">';
		messageHtml += '<span aria-hidden="true">&times;</span>';
		messageHtml += "</button>";
		messageHtml += result.message;
		messageHtml += "</div>";
		messages.innerHTML = messageHtml;
		this.queueEditorResize();
		jQuery(".panel-body").LoadingOverlay("hide");
		if (result.cssClass === "success") {
			this.startTimer(2000);
		} else if (result.cssClass === "warning") {
			this.startTimer(5000);
		}
	}

	parseSaveResponse(data) {
		let message = "";
		let ok = true;
		let cssClass = "success";

		if (data === "") {
			return { message: "No response from save_file.php", ok: false, cssClass: "danger" };
		}

		const returnLines = data.split("\n");
		for (let index = 0; index < returnLines.length; index++) {
			const line = returnLines[index];
			const returnStatus = line.substr(0, 2);
			if (returnStatus === "S\t") {
				message += line.substr(2);
			} else if (returnStatus === "W\t") {
				cssClass = "warning";
				message += line.substr(2);
			} else if (returnStatus === "E\t") {
				ok = false;
				cssClass = "danger";
				message += line.substr(2);
			} else {
				cssClass = "info";
				console.log(line);
			}
		}

		return { message: message, ok: ok, cssClass: cssClass };
	}

	handleSaveError(fileName, errorThrown) {
		jQuery(".panel-body").LoadingOverlay("hide");
		alert("Unable to save '" + fileName + ": " + errorThrown);
		this.startTimer(15000);
	}

	showInvalidJsonAlert(error) {
		let message = "<span class='errorMsgBig'>Error:</span>";
		message += "<br><h3>Unable to save as the file is invalid.</h3>";
		message += "<br><h4>" + error + "</h4>";
		bootbox.alert({
			message: message,
			buttons: {
				ok: {
					label: "OK",
					className: "btn-danger"
				}
			}
		});
	}

	changeFile(event) {
		let fileName = event.currentTarget.value;
		if (fileName.substr(0, 8) === "{REMOTE}") {
			fileName = fileName.substr(8);
		}

		try {
			this.editor.getDoc().setValue("");
		} catch (error) {
			console.log("Got error reading " + fileName);
			return;
		}

		this.setEditorMode(fileName);
		jQuery.get(fileName + "?_ts=" + new Date().getTime(), data => {
			const fileData = JSON.stringify(data, null, "\t");
			this.editor.getDoc().setValue(fileData);
			this.highlightText(this.config.needToUpdate);
			this.queueEditorResize();
		}).fail(response => {
			if (response.status === 200) {
				this.editor.getDoc().setValue(response.responseText);
				this.queueEditorResize();
			} else {
				alert("Requested file [" + fileName + "] not found or an unsupported language.");
			}
		});
	}

	setEditorMode(fileName) {
		const extension = fileName.substring(fileName.lastIndexOf(".") + 1);
		if (extension === "js") {
			this.editor.setOption("mode", "javascript");
		} else if (extension === "json") {
			this.editor.setOption("mode", "json");
		} else {
			this.editor.setOption("mode", "shell");
		}
	}
}

window.AllskyEditor = AllskyEditor;

jQuery(function () {
	if (!window.allskyEditorConfig) {
		return;
	}

	window.allskyEditor = new AllskyEditor(window.allskyEditorConfig);
	window.allskyEditor.init();
});
