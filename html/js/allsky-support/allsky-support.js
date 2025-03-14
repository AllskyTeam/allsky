"use strict";

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
            bootbox.prompt({
                title: 'Enter the id of the Github discussion', 
                centerVertical: true,
                inputType: 'number',
                callback: function(githubid){ 
                    if (githubid !== null && githubid !== '') {                    
                        $('.as-support-loading').LoadingOverlay('show', {
                            background: 'rgba(0, 0, 0, 0.5)',
                            imageColor: '#a94442'
                        });
                        $.ajax({
                            type: 'POST',
                            url: 'includes/supportutils.php?request=ChangeGithubId',
                            data: {
                                logId: logId,
                                githubid: githubid
                            },
                            dataType: 'json',
                            cache: false
                        }).done(() => {
                            logTable.ajax.reload();
                        }).always(() => {
                            $('.as-support-loading').LoadingOverlay('hide')
                        })
                    }
                }
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
                data: {
                    logId: logId
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
                    
                    $.ajax({
                        url: 'includes/supportutils.php?request=GenerateLog',
                        type: 'GET',
                        dataType: 'json',
                        cache: false                
                    }).done(() => {
                        logTable.ajax.reload()
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
                    data: 'issue',
                    render: function (item, type, row, meta) {
                        let result = 'No LInked Issue'
                        if (item !== 'none') {
                            let issue = 'https://github.com/AllskyTeam/allsky/discussions/' + item
                            result = '<a external="true" href="' + issue + '" target="_blank">Issue ' + item + '</a>'
                        }

                        return result
                    }                 
                },{
                    data: 'size'                  
                },{
                    data: null,
                    width: '120px',
                    render: function (item, type, row, meta) {
                        let buttonGithub = '<button type="button" title="Edit Guthib Discussion Number" class="btn btn-primary as-support-log-github mr-10" data-logid="' + item.filename + '"><i class="fa-brands fa-github"></i></button>'
                        let buttonDownload = '<button type="button" title="Download log" class="btn btn-primary as-support-log-download mr-10" data-logid="' + item.filename + '"><i class="fa-solid fa-download"></i></button>'
                        let buttonDelete = '<button type="button" title="Delete Log" class="btn btn-danger as-support-log-delete" data-logid="' + item.filename + '"><i class="fa-solid fa-trash"></i></button>'
                        
                        let buttons = '<div>' + buttonDownload + buttonGithub + buttonDelete + '</div>'
                        return buttons
                    }
                }
            ]
        });
    }

}
