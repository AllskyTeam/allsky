<?php

function DisplayImageData() {

	$status = new StatusMessages();

  ?>

    <script src="/js/jscharts/dist/chart.min.js"></script>
    <script src="/js/jscharts-plugins/chartjs-plugin-zoom.js"></script>
    <script src="/js/jquery-loading-overlay/dist/loadingoverlay.min.js"></script>

    <link rel='stylesheet' href='/css/imagedata.css' />
    <script src="/js/imagedata/imagedata.js"></script>

	<div class="row">
		<div class="panel panel-primary">
			<div class="panel-heading"><i class="fa fa-code fa-tachometer-alt"></i> Image Data</div>
			<div class="panel-body">

                <div id="id-charts-wrapper" class="hidden">
                    <ul id="id-tabs" class="nav nav-tabs" role="tablist">
                        <li role="presentation" class="active" id="live"><a href="#id-live" aria-controls="home" role="tab" data-toggle="tab" data-id="live">Live</a></li>
                        <li role="presentation" id="historic"><a href="#id-historic" aria-controls="profile" role="tab" data-toggle="tab" data-id="historic">Historic</a></li>
                    </ul>

                    <div class="tab-content">
                        <div role="tabpanel" class="tab-pane active" id="id-live">
                            <div id="id-live-warnings">
                                <div id="id-warnings-nomodule" class="alert alert-danger hidden" role="alert">
                                    <h3>Error</h3>
                                    <p>The module required to save data for this display is not enabled. Please add the 'Save Image Data' module and ensure that it is enabled</p>
                                </div>
                                <div id="id-warnings-day" class="hidden" role="alert">
                                    <h2 id="daywarning">Its currently daytime so no live data can be displayed</h2>
                                </div>                            
                            </div>
                            <div id="id-live-charts" class="hidden">
                            <div class="row">
                                    <div class="col-md-6">
                                        <canvas id="id-live-exposure" height="150" width="200"></canvas>
                                    </div>
                                    <div class="col-md-6">
                                        <canvas id="id-live-stars" height="150" width="200"></canvas>
                                    </div>
                                </div>                            
                                <canvas id="id-live-skystate" height="150" width="600"></canvas>
                            </div>
                        </div>
                        
                        
                        <div role="tabpanel" class="tab-pane" id="id-historic">

                            <nav class="navbar navbar-default">
                                <div class="container-fluid">
                                    <div class="collapse navbar-collapse" id="oe-autoexposure-navbar">
                                        <ul class="nav navbar-nav">
                                        <li class="btn-lg">
                                            <form id="oe-item-list-edit-dialog-form" class="form-horizontal">
                                                <div class="form-group">
                                                    <select class="form-control navbar-form" id="id-historic-date" name="id-historic-date" width="200px">
                                                    </select>
                                                </div>
                                            </form>
                                        </li>
                                        </ul>                            
                                    </div>
                                </div>
                            </nav>

                            <div id="id-historic-warnings">
                                <div id="id-warnings-nodata" class="alert alert-danger hidden" role="alert">
                                    <h3>Error</h3>
                                    <p>There is no historic data to display</p>
                                </div>                            
                            </div>                        
                            <div id="id-historic-charts"  class="hidden">
                                <div class="row">
                                    <div class="col-md-6">
                                        <canvas id="id-historic-exposure" height="150" width="200"></canvas>
                                    </div>
                                    <div class="col-md-6">
                                        <canvas id="id-historic-stars" height="150" width="200"></canvas>
                                    </div>
                                </div>
                                <canvas id="id-historic-skystate" height="150" width="600"></canvas>                            
                            </div>
                        </div>
                    </div>

                </div>

                <div id="id-charts-nodb" class="hidden">
                    <h2 id="nodbwarning">No data availble. Please chaeck that the 'Save Details' module is running</h2>
                </div>
			</div>
		</div>
	</div>

    <script type="module">
        var imageData = new IMAGEDATA();
        imageData.run();
    </script>

<?php 
}
?>
