<style>
    .alert {
        padding: 15px !important;
        margin-bottom: 20px !important;
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
</style>

<div class="row">
	<div class="panel panel-primary">
		<div class="panel-heading"><i class="fa fa-code fa-question"></i> Support Information</div>
		<div class="panel-body as-support-loading">


            <div class="panel panel-default">
                <div class="panel-heading">
                    <h3>Getting Support <small>howto ask for help</small></h3>
                </div>
                <div class="panel-body">

                    <div class="alert alert-success" role="alert">
                        <p>If you have a <b>QUESTION</b> or want to suggest a <b>NEW FEATURE</b>, add a new <a external="true" href="https://github.com/AllskyTeam/allsky/discussions">Discussion</a> item via the link at the top of any GitHub page; do <u>not</u> submit an Issue.</p>
                        <p>If you found a <b>BUG</b> or something isn't working right, first look in the <a external="true" href="https://github.com/AllskyTeam/allsky/discussions">Discussions</a> area and at existing <a external="true" href="https://github.com/AllskyTeam/allsky/issues">Issues</a>. If no one has already reported the problem, create a new Issue.</p>                    
                    </div>

                    <div class="alert alert-danger" role="alert">
                        <h4><b>NOTE:</b> The Allsky developers do not actively monitor other social media channels such as facebook so please use GitHub for support.</h4>
                    </div> 

                </div>
            </div>

            <div class="panel panel-default">
                <div class="panel-heading">
                    <h3>Support Logs <small>previously generated log files</small><div class="pull-right"><button type="button" class="btn btn-danger" id="as-support-generate">Generate</button></div></h3>
                </div>
                <div class="panel-body">
                    <div class="alert alert-warning" role="alert">
                        <p>When requesting support please generate a log file by either clicking the 'Generate' button on the right or logging into your pi as the SAME user you installed Allsky as and from the Allsky home directory run</p>
                        <p>./support.sh</p>
                        <p>Once complete return to this page and refresh it. The generated log will be available below to download.</p>
                    </div>
                    
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