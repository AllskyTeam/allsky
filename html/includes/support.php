<style>
    .alert {
        padding: 10px !important;
        margin-bottom: 10px !important;
        border: 1px solid transparent !important;
        border-radius: 4px !important;
    }
    
    #as-support-files th {
        font-size: 1.3em;
    }

    #as-support-files td {
        padding-bottom: 10px;
        font-size: 1.2em;        
    }

    table tbody tr:first-child {
        color: green;
    }

    .mr-10 {
        margin-right: 10px;
    }

    .dark .markdown-body pre {
        color: white !important;
        background: #222222 !important;
    }

    .fileName {
        padding: 0 .2em !important;
        margin: 0 !important;
        font-size: 90% !important;
        color: inherit !important;
        border-radius: 6px !important;
        background-color: #fff8c555 !important;
        border: 1px solid rgba(212,167,44,0.4) !important;
    }

    .dark .fileName {
        padding: 0 .2em !important;
        margin: 0 !important;
        font-size: 90% !important;
        color: inherit !important;
        border-radius: 6px !important;
        background-color: rgba(187,128,9,0.1) !important;
        border: 1px solid rgba(187,128,9,0.4) !important;
    }    
</style>

<div class="row">
	<div class="panel panel-primary">
		<div class="panel-heading"><i class="fa fa-code fa-question"></i> Getting Support</div>
		<div class="panel-body as-support-loading">
            <div class="panel panel-default">
                <div class="panel-heading">
                    <h3>Getting Support <small>howto ask for help</small></h3>
                </div>
                <div class="panel-body markdown-body">
                    <div class="alert alert-success" role="alert">
                        <ul class="nav nav-tabs" role="tablist">
                            <li role="presentation" class="active"><a href="#as-support-pref" role="tab" data-toggle="tab">Preferred Method</a></li>
                            <li role="presentation"><a href="#as-support-alt" role="tab" data-toggle="tab">Alternative Method</a></li>
                        </ul>

                        <div class="tab-content">
                            <div role="tabpanel" class="tab-pane active" id="as-support-pref">
                                <p>The 'Support Log' section at the bottom of this page contains a 'Generate' button that will automatically collate all of the information required to provide support.</p>
                                <p>Clicking the button will display a message describing what data will be included. Click ok and the newly generated support log will be displayed, you can generate multiple logs and the latest one is displayed in green if there is more than one log</p>
                                <p>If you know the discussion number from GitHub then clicking on the GitHub icon will allow you to add this, this will then provide a quick link to the discussion for you</p>
                                <p>The support script can also be run manually if required<p>
                                <pre>cd ~/Allsky
./shpport.sh</pre>
                                <p>This will generate the support log in <span class="fileName">~/allsky/html/support</span></p>
                            </div>
                            
                            <div role="tabpanel" class="tab-pane" id="as-support-alt">
                                <p>The first step is to create a log file (<span class="fileName">/var/log/allsky.log</span>) with the proper information to help us troubleshoot:
                                    <pre>sudo systemctl stop allsky               # Stop Allsky
sudo truncate -s 0 /var/log/allsky.log   # clears out log file
# Do NOT restart Allsky yet</pre>
                                </p>
                                <p>Change <span class="WebUISetting">Debug Level</span> to 4 in the WebUI then click on the <span class="btn btn-primary btn-not-real btn-small">Save changes</span> button to restart Allsky.</p>
                                <p>Wait until the problem occurs, then run:
                                    <pre>cp  /var/log/allsky.log  /tmp/allsky.log
cp  ~/allsky/config/settings.json  /tmp/settings.json.txt</pre>
                                </p>
                            </div>
                        </div>
                        <p>Once you have created the support log create a new <a external="true" href="https://github.com/AllskyTeam/allsky/discussions">Discussion</a> in GitHub and attach the log files you have generated.</p>
                    </div>  

                    <div class="alert alert-danger" role="alert">
                        <p><b>NOTE:</b> The Allsky developers do not actively monitor other social media channels such as facebook so please use GitHub for support.</p>
                    </div> 

                </div>
            </div>

            <div class="panel panel-default">
                <div class="panel-heading">
                    <h3>Support Logs <small>previously generated log files</small><div class="pull-right"><button type="button" class="btn btn-danger" id="as-support-generate">Generate</button></div></h3>
                </div>
                <div class="panel-body">                    
                    <table id="as-support-files" class="display" style="width:100%">
                        <thead>
                            <tr>
                                <th>Filename</th>
                                <th>Sort</th>
                                <th>Date/Time Create</th>
                                <th>Issue</th>
                                <th>Size</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                    </table>

                </div>
            </div>

		</div>
	</div>
</div>

<script>
    $(document).ready(function() {
        let supportManager = new ALLSKYSUPPORT()
    });
</script>

<script src="/js/allsky-support/allsky-support.js?c=<?php echo ALLSKY_VERSION; ?>"></script>
<link rel="stylesheet" type="text/css" href="/js/datatables/datatables.min.css?c=<?php echo ALLSKY_VERSION; ?>" />
<script type="text/javascript" src="/js/datatables/datatables.js?c=<?php echo ALLSKY_VERSION; ?>"></script>
<script src="/js/jquery-loading-overlay/dist/loadingoverlay.min.js?c=<?php echo ALLSKY_VERSION; ?>"></script>
<script src="/js/bootbox/bootbox.all.js?c=<?php echo ALLSKY_VERSION; ?>"></script>
<script src="/js/bootbox/bootbox.locales.min.js?c=<?php echo ALLSKY_VERSION; ?>"></script>

<link rel="stylesheet" type="text/css" href="documentation/css/documentation.css?c=<?php echo ALLSKY_VERSION; ?>" />
