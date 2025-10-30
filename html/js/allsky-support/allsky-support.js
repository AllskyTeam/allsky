"use strict";

let externalIcon = '&nbsp;<i class="fa fa-external-link-alt fa_external"></i>';
let troubleshootingMsg = ' Please refer to the WebUI <a target="_blank" href="/documentation/troubleshooting/reportingProblems.html#supportErrors">Getting&nbsp;Support';
troubleshootingMsg += externalIcon;
troubleshootingMsg += '</a> page';


class ALLSKYSUPPORT {
	#supportFilesTable = null

	constructor() {

		$(document).on('click', '.as-support-log-delete', (event) => {
			var logId = $(event.currentTarget).data('logid')
			var logTable = this.#supportFilesTable
			bootbox.confirm({
				message: 'Are you sure you wish to delete this log entry?',
				centerVertical: true,
				callback: function(result) {
					if (result) {
						$('.as-support-loading').LoadingOverlay('show', {
							background: 'rgba(0, 0, 0, 0.5)',
							imageColor: '#a94442'
						});
						$.ajax({
							type: 'POST',
							url: 'includes/supportutils.php?request=DeleteLog',
							data: {
								logId: logId
							},
							dataType: 'json',
							cache: false
						}).fail(() => {
							bootbox.alert({
								title: 'Error',
								message: 'Error deleting the support log. ' + troubleshootingMsg
							});
						}).done(() => {
							logTable.ajax.reload()
						}).always(() => {
							$('.as-support-loading').LoadingOverlay('hide')
						})
					}
				}
			})
		})

		$(document).on('click', '.as-support-log-github', (event) => {
			var logId = $(event.currentTarget).data('logid')
			var logTable = this.#supportFilesTable

			// File name format:
			//		support-REPO-PROBLEM_TYPE-PROBLEM_ID-YYYYMMDDHHMMSS.zip
			//      0       1    2            3          4

			var ok = true;
			const match = logId.split("-");
			var num = match.length;
			if (num != 5) {
				ok = false;
			} else {
				var support = match[0];
				if (support != "support") {
					ok = false;
				} else {
					var repo = match[1];
//x					var type = match[2];
					var id = match[3];
					if (id == "none") id = "";
				}
			}
			if (! ok) {
				bootbox.alert({
					title: 'Error',
					message: 'Error finding support log "' + logId + '".' + troubleshootingMsg
				});
				return
			}

			$('input[name="choice"][value="' + repo + '"]').prop('checked', true);
			$('#githubIdModalId').val(id);
			$('#githubIdModal').modal('show');

			$('#githubIdModalOK').off('click');
			$('#githubIdModalOK').on('click', () => {
				var repo = $('input[name="choice"]:checked').val();
				var newId = $('#githubIdModalId').val();
				if (newId == "") {
					bootbox.alert({
						title: 'Error',
						message: 'The GitHub ID is required.'
					});
					return;		// This leaves the dialog box up so the user can enter the ID.
				}
				$('#githubIdModal').modal('hide');
				$('.as-support-loading').LoadingOverlay('show', {
					background: 'rgba(0, 0, 0, 0.5)',
					imageColor: '#a94442'
				});
				$.ajax({
					type: 'POST',
						url: 'includes/supportutils.php?request=ChangeGithubId',
						data: {
							logId: logId,
							repo: repo,
							newId: newId
					},
					dataType: 'json',
					cache: false
				}).fail(() => {
					bootbox.alert({
						title: 'Error',
						message: 'Error updating the GitHub support log file. ' + troubleshootingMsg
					});
				}).done(() => {
					logTable.ajax.reload();
				}).always(() => {
					$('.as-support-loading').LoadingOverlay('hide')
				})
			});
		})

		$(document).on('click', '.as-support-log-download', (event) => {
			var logId = $(event.currentTarget).data('logid')
			$('.as-support-loading').LoadingOverlay('show', {
				background: 'rgba(0, 0, 0, 0.5)',
				imageColor: '#a94442'
			});

			$.ajax({
				url: 'includes/supportutils.php?request=DownloadLog',
				type: 'POST',
				cache: false,
				data: {
					logId: logId,
    			csrf_token: window.csrfToken 					
				},
				xhrFields: {
				  responseType: 'blob'
				}
			}).done((blob) => {
				const url = window.URL.createObjectURL(blob)
				const a = document.createElement('a')
				a.href = url
				a.download = logId
				document.body.appendChild(a)
				a.click()
				a.remove()
				window.URL.revokeObjectURL(url)
			}).fail((a,b,c) => {
				bootbox.alert({
					title: 'Error',
					message: 'Error downloading file. ' + troubleshootingMsg
				});
			}).always(() => {
				$('.as-support-loading').LoadingOverlay('hide')
			})
		})

		$(document).on('click', '#as-support-generate', (event) => {
			var logTable = this.#supportFilesTable
let message="This script will collect data from your Raspberry Pi to assist in reporting a problem.<br>\
<strong>No personal information is collected</strong>.\
The following data is collected:<br><br>\
<ul>\
<li>Basic system information</li>\
<li>Filesystem / Memory / Network Information (IPV4/6/MAC details are obfuscated)</li>\
<li>Installed system and python packages</li>\
<li>Allsky and web server logs and error logs</li>\
<li>Connected camera details</li>\
<li>i2c bus details</li>\
<li>Running processes</li>\
<li>Allsky config files (obfuscated where required to hide any credentials)</li>\
</ul><br>\
Select '<strong>OK</strong>' to agree or '<strong>Cancel</strong>' to cancel."

			bootbox.confirm(message, function(result){
				if (result) {
					$('body').LoadingOverlay('show', {
						background: 'rgba(0, 0, 0, 0.5)',
						imageColor: '#a94442',
						textColor: '#a94442',
						text: 'Generating Support Information'
					});

// TODO: prompt for repo and optionally the id

					$.ajax({ url: 'includes/supportutils.php?request=GenerateLog',
						type: 'GET',
						dataType: 'json',
						cache: false
					}).done(() => {
						logTable.ajax.reload()
					}).fail((a,b,c) => {
						bootbox.alert({
							title: 'Error',
							message: 'Error unable to create the support log. ' + troubleshootingMsg
						});
					}).always(() => {
						$('body').LoadingOverlay('hide')
					})
				}
			});
		})

		this.#supportFilesTable = $('#as-support-files').DataTable({
			ajax: {
				url: 'includes/supportutils.php?request=SupportFilesList',
				type: 'GET',
				dataSrc: ''
			},
			dom: 'rtip',
			order: [[1, 'desc']],
			columnDefs: [
				{
					targets: [0,1],
					visible: false
				}
			],
			columns: [
				{
					data: 'filename'
				},{
					data: 'sortfield'
				},{
					data: 'date'
				},{
					data: 'ID',
					render: function (ID, type, row, meta) {
						if (ID == '') {
							return('');
						}

						let DIR = "";
						let problemType = row.type;
						if (problemType == "discussion" || problemType == "issue") {
							DIR = problemType.toLowerCase() + 's';
						}

						let result = "";
						if (ID != 'none' && DIR != "") {
							let fileName = row.filename;
							let URL = "";
							let text = '';
							if (row.repo == 'AS') {
								URL = ALLSKY_REPO_URL;
								text = 'Allsky';
							} else {
								URL = ALLSKY_MODULES_REPO_URL;
								text = 'Allsky Modules';
							}
							URL += '/' + DIR + '/' + ID;
							let label = text + ' ' + problemType + ' ' + ID;
							result = '<a href="' + URL + '">' + label + '</a>' + externalIcon;
						} else {
							if (problemType == "type") problemType = "";
							result = 'No GitHub ' + problemType + '  Number';
						}
						return result
					}
				},{
					data: 'size'
				},{
					data: null,
					width: '150px',
					render: function (item, type, row, meta) {
						if (item.filename == '') {
							return('');
						}
						let buttonGithub = '<button type="button" title="Edit Guthib Discussion/Issue Number" class="btn btn-primary as-support-log-github mr-10" data-logid="' + item.filename + '"><i class="fa-brands fa-github"></i></button>'
						let buttonDownload = '<button type="button" title="Download Support Log" class="btn btn-primary as-support-log-download mr-10" data-logid="' + item.filename + '"><i class="fa-solid fa-download"></i></button>'
						let buttonDelete = '<button type="button" title="Delete Support Log" class="btn btn-danger as-support-log-delete" data-logid="' + item.filename + '"><i class="fa-solid fa-trash"></i></button>'

						let buttons = '<div>' + buttonDownload + buttonGithub + buttonDelete + '</div>'
						return buttons
					}
				}
			]
		});
	}
}
