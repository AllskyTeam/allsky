<?php

if (basename(__FILE__) === basename($_SERVER['SCRIPT_FILENAME'])) {
    include_once('functions.php');
    redirect("/index.php");
}

function DisplayModule()
{
	global $pageHeaderTitle, $pageIcon, $pageHelp;
?>

<script src="/documentation/js/all.min.js?c=<?php echo ALLSKY_VERSION; ?>" type="application/javascript"></script>

<script src="/js/sortable/sortable.js?c=<?php echo ALLSKY_VERSION; ?>"></script>
<script src="/js/sortable/jquery-sortable.js?c=<?php echo ALLSKY_VERSION; ?>"></script>

<!-- <link rel='stylesheet' href='/css/modules.css?c=<?php echo ALLSKY_VERSION; ?>' /> -->
<script src="/js/modules/modules.js?c=<?php echo ALLSKY_VERSION; ?>"></script>

<script src="/js/jquery-loading-overlay/dist/loadingoverlay.min.js?c=<?php echo ALLSKY_VERSION; ?>"></script>

<script src="/js/bootbox/bootbox.all.js?c=<?php echo ALLSKY_VERSION; ?>"></script>
<script src="/js/bootbox/bootbox.locales.min.js?c=<?php echo ALLSKY_VERSION; ?>"></script>

<link rel='stylesheet' href='/js/jquery-ui-1.14.1.custom/jquery-ui.min.css?c=<?php echo ALLSKY_VERSION; ?>' />
<script src="/js/jquery-ui-1.14.1.custom/jquery-ui.min.js?c=<?php echo ALLSKY_VERSION; ?>"></script>

<link rel="stylesheet" type="text/css" href="/js/overlay/imagemanager/oe-imagemanager.css?c=<?php echo ALLSKY_VERSION; ?>" />
<script type="text/javascript" src="/js/overlay/imagemanager/oe-imagemanager.js?c=<?php echo ALLSKY_VERSION; ?>"></script>

<link rel="stylesheet" href="/js/jquery-mask/jquery-mask.css?c=<?php echo ALLSKY_VERSION; ?>">
<script src="/js/jquery-mask/jquery-mask.js?c=<?php echo ALLSKY_VERSION; ?>"></script>

<link rel="stylesheet" href="/js/bootstrap-slider/dist/css/bootstrap-slider.css?c=<?php echo ALLSKY_VERSION; ?>">
<script src="/js/bootstrap-slider/dist/bootstrap-slider.js?c=<?php echo ALLSKY_VERSION; ?>"></script>

<link href="/js/dropzone/dropzone.css?c=<?php echo ALLSKY_VERSION; ?>" type="text/css" rel="stylesheet" />
<script src="/js/dropzone/dropzone-min.js?c=<?php echo ALLSKY_VERSION; ?>"></script>

<script src="/js/jquery-gpio/jquery-gpio.js?c=<?php echo ALLSKY_VERSION; ?>"></script>
<script src="/js/jquery-roi/jquery-roi.js?c=<?php echo ALLSKY_VERSION; ?>"></script>
<script src="/js/konva/konva.min.js?c=<?php echo ALLSKY_VERSION; ?>"></script>

<link rel="stylesheet" href="/js/jquery-i2c/jquery-i2c.css?c=<?php echo ALLSKY_VERSION; ?>">
<script src="/js/jquery-i2c/jquery-i2c.js?c=<?php echo ALLSKY_VERSION; ?>"></script>

<script src="/js/jquery-variable/jquery-variable.js?c=<?php echo ALLSKY_VERSION; ?>"></script>

<link rel="stylesheet" type="text/css" href="/js/datatables/datatables.min.css?c=<?php echo ALLSKY_VERSION; ?>" />
<script type="text/javascript" src="/js/datatables/datatables.js?c=<?php echo ALLSKY_VERSION; ?>"></script>

<link rel='stylesheet' href='/js/spectrum/dist/spectrum.css?c=<?php echo ALLSKY_VERSION; ?>' />
<script src="/js/spectrum/dist/spectrum.js?c=<?php echo ALLSKY_VERSION; ?>"></script>

<link rel='stylesheet' href='/js/jquery-select2/dist/css/select2.min.css?c=<?php echo ALLSKY_VERSION; ?>' />
<link rel='stylesheet' href='/js/jquery-select2-bootstrap-theme/dist/select2-bootstrap.min.css?c=<?php echo ALLSKY_VERSION; ?>' />
<script src="js/jquery-select2/dist/js/select2.full.min.js?c=<?php echo ALLSKY_VERSION; ?>"></script>

<script src="/js/jvc/jvc.min.js?c=<?php echo ALLSKY_VERSION; ?>"></script>
<link rel='stylesheet' href='/js/jvc/jvc.min.css?c=<?php echo ALLSKY_VERSION; ?>' />

<link rel="stylesheet" href="/js/leaflet/leaflet.css?c=<?php echo ALLSKY_VERSION; ?>">
<script src="/js/leaflet/leaflet.js?c=<?php echo ALLSKY_VERSION; ?>"></script>
<script src="/js/jquery-position/jquery-position.js?c=<?php echo ALLSKY_VERSION; ?>"></script>

<link rel="stylesheet" href="/js/jquery-urlcheck/jquery-urlcheck.css?c=<?php echo ALLSKY_VERSION; ?>">
<script src="/js/jquery-urlcheck/jquery-urlcheck.js?c=<?php echo ALLSKY_VERSION; ?>"></script>

<link rel='stylesheet' href='/css/checkbox.css?c=<?php echo ALLSKY_VERSION; ?>' />

<script src="/js/jquery-devicemanager/jquery-devicemanager.js?c=<?php echo ALLSKY_VERSION; ?>"></script>

<script src="/js/highcharts/code/highcharts.js?c=<?php echo ALLSKY_VERSION; ?>"></script>
<script src="/js/highcharts/code/highcharts-more.js?c=<?php echo ALLSKY_VERSION; ?>"></script>
<script src="/js/highcharts/code/highcharts-3d.js?c=<?php echo ALLSKY_VERSION; ?>"></script>
<script src="/js/highcharts/code/modules/series-label.js?c=<?php echo ALLSKY_VERSION; ?>"></script>
<script src="/js/highcharts/code/modules/solid-gauge.js?c=<?php echo ALLSKY_VERSION; ?>"></script>
<script src="/js/highcharts/code/modules/no-data-to-display.js"></script>

<script src="/js/jquery-chart/jquery-chart.js?c=<?php echo ALLSKY_VERSION; ?>"></script>

<link rel="stylesheet" href="/css/charts.css?c=<?php echo ALLSKY_VERSION; ?>" />

<script src="/js/jquery-satpicker/jquery-satpicker.js?c=<?php echo ALLSKY_VERSION; ?>"></script>

<script src="js/jquery-allskykamera/jquery-allskykamera.js?c=<?php echo ALLSKY_VERSION; ?>"></script>
<script src="js/jquery-allskysensor/jquery-allskysensor.js?c=<?php echo ALLSKY_VERSION; ?>"></script>

<div class="panel panel-allsky">
	<div class="panel-heading clearfix">
        <span><i class="<?php echo $pageIcon ?>"></i> <?php echo $pageHeaderTitle ?></span>
<?php if (!empty($pageHelp)) { ?>
        <a class="pull-right" href="<?php echo $pageHelp; ?>" target="_blank" rel="noopener noreferrer" data-toggle="tooltip" data-container="body" data-placement="left" title="Help">
            <i class="fa-solid fa-circle-question"></i> Help
        </a>
<?php } ?>
    </div>
    <div class="panel-body">
        <nav class="navbar navbar-default">
            <div class="container-fluid-na">
                <div class="navbar-header">
                    <button type="button" class="navbar-toggle collapsed" data-toggle="collapse" data-target="#oe-module-editor-navbar">
                        <span class="sr-only">Toggle navigation</span>
                        <span class="icon-bar"></span>
                        <span class="icon-bar"></span>
                        <span class="icon-bar"></span>                                            
                    </button>
                </div>                        
                <div class="collapse navbar-collapse" id="oe-module-editor-navbar">
                    <ul class="nav navbar-nav">
                        <li>
                            <div class="tooltip-wrapper disabled" data-toggle="tooltip" data-container="body" data-placement="top" title="Save The Module Configuration">
                                <div class="btn btn-lg navbar-btn" id="module-editor-save"><i class="fa-solid fa-floppy-disk"></i></div>
                            </div>
                        </li>
                        <li class="btn">
                            <form id="oe-item-list-edit-dialog-form" class="form-horizontal">
                                <div class="form-group">
                                    <div class="tooltip-wrapper disabled" data-toggle="tooltip" data-container="body" data-placement="top" title="Select the Flow to manage">
                                        <select class="form-control navbar-form" id="module-editor-config" name="module-editor-config" width="200px">
                                            <option value="day">Daytime Configuration</option>
                                            <option value="night">Nighttime Configuration</option>
                                            <!-- <option value="endofnight">End Of Day Configuration</option> -->
                                        </select>
                                    </div>
                                </div>
                            </form>
                        </li>
                        <li class="ml-4">
                            <div class="btn btn-lg navbar-btn" id="module-editor-periodic" data-toggle="tooltip" data-container="body" data-placement="top" title="Periodic Flow"><i class="fa-solid fa-clock"></i></div>
                        </li>
                        <li class="btn ml-4">
                            <form id="oe-item-filter-dialog-form" class="form-horizontal">
                                <div class="form-group">                            
                                    <select class="form-control navbar-form" name="module-filters" id="module-filters">
                                    </select>
                                </div>
                            </form>
                        </li>
                    </ul>
                    <ul class="nav navbar-nav navbar-right">
                        <li>
                            <div class="btn btn-lg navbar-btn" id="module-installer-manager" data-toggle="tooltip" data-container="body" data-placement="top" title="Module package Manager"><i class="fa-solid fa-box-open"></i></div>
                        </li>
                        <li>
                            <div class="btn btn-lg navbar-btn" id="device-manager" data-toggle="tooltip" data-container="body" data-placement="top" title="Device Manager"><i class="fa-solid fa-wrench"></i></div>
                        </li>
                        <li>
                            <div class="btn btn-lg navbar-btn" id="module-options" data-toggle="tooltip" data-container="body" data-placement="top" title="Module Options"><i class="fa-solid fa-gear"></i></div>
                        </li>
                        <li id="oe-toolbar-debug" class="hidden">
                            <div id="module-toobar-debug-button" class="btn btn-lg navbar-btn" data-toggle="tooltip" data-container="body" data-placement="top" title="Debug Info"><i class="fa-solid fa-bug"></i></div>
                        </li>
                    </ul>                            
                </div>
            </div>
        </nav>
        <div class="row module-lists">
            <div class="col-sm-6 col-md-6 col-lg-6 module-column">
                <h4 class="text-center">Available Modules
                    <form class="form-horizontal mt-3">
                        <div class="form-group">
                            <label for="module-module-filter" class="col-sm-3 col-xs-3 control-label hidden-xs">Search</label>
                            <div class="col-sm-5 col-xs-4">
                                <input type="text" class="form-control" id="module-available-filter">
                            </div>
                            <div class="col-sm-4 col-xs-2">
                                <button type="button" class="btn btn-primary btn-sm pull-left" id="module-available-filter-clear" title="Clear filter"><i class="fa-solid fa-xmark"></i></button>
                            </div>                                    
                        </div>
                    </form>
                </h4>


                <div class="module-container">
                    <div id="modules-available" class="list-group"></div>
                    <div id="modules-available-empty"><span>No modules available</span></div>
                </div>
            </div>
            <div class="col-sm-6 col-md-6 col-lg-6 module-column">
                <h4 class="text-center">Selected Modules
                    <form class="form-horizontal mt-3">
                        <div class="form-group">
                            <label for="module-module-filter" class="col-sm-3 control-label hidden-xs">Search</label>
                            <div class="col-sm-5 col-xs-4">
                                <input type="text" class="form-control" id="module-selected-filter">
                            </div>
                            <div class="col-sm-4 col-xs-2">
                                <button type="button" class="btn btn-primary btn-sm pull-left" id="module-selected-filter-clear" title="Clear filter"><i class="fa-solid fa-xmark"></i></button>
                            </div>
                        </div>
                    </form>
                </h4>

                <div class="module-container">
                    <div id="modules-selected" class="list-group"></div>
                    <div id="modules-selected-empty"><span>Drag modules here to enable them</span></div>
                </div>
            </div>
        </div>
    </div>
</div>


<div class="modal" role="dialog" id="module-upload-dialog">
    <form id="module-upload-dialog-form" class="form-horizontal">
        <div class="modal-dialog modal-lg" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                    <h4 class="modal-title">Upload Module</h4>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label for="oe-debug-dialog-overlay" class="col-sm-2 control-label">File</label>
                        <div class="col-sm-10">
                            <div class="input-group">
                                <input type="file" class="form-control" id="module-file" name="module-file" required />
                            </div>
                        </div>
                    </div>    
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>
                    <button type="submit" class="btn btn-default" id="module-upload-file-button">Upload</button>
                </div>
            </div>
        </div>
    </form>
</div>

<div class="modal" role="dialog" id="module-editor-settings-dialog">
    <div class="modal-dialog modal-lg mt-100" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                <h4 class="modal-title">Module Settings</h4>
            </div>
            <div class="modal-body">
                <form id="oe-debug-dialog-form" class="form-horizontal">
                    <div class="form-group">
                        <label for="autoenable" class="control-label col-xs-4">Auto Enable</label> 
                        <div class="col-xs-8">
                            <label class="el-switch el-switch-sm el-switch-green">
                                <input type="checkbox" id="autoenable">
                                <span class="el-switch-style"></span>
                            </label>
                            <p class="help-block">Auto enable modules when selected</p>
                        </div>
                    </div>                                      
                    <div class="form-group">
                        <label for="debugmode" class="control-label col-xs-4">Debug Mode</label> 
                        <div class="col-xs-8">
                            <label class="el-switch el-switch-sm el-switch-green">
                                <input type="checkbox" id="debugmode">
                                <span class="el-switch-style"></span>
                            </label>
                            <p class="help-block">Enable debug mode. An additional icon will appear inthe toolbar showing the last results of each running module</p>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="watchdog-timeout" class="col-sm-4 control-label">Periodic Timer</label>
                        <div class="col-sm-8">
                            <div class="input-group">
                                <input id="periodic-timer" name="periodic-timer" type="number" min="0" max="3600" step="1" class="form-control">
                            </div>
                            <p class="help-block">The delay between running periodic modules in seconds</p>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="watchdog-timeout" class="col-sm-4 control-label">Data Expiry</label>
                        <div class="col-sm-8">
                            <div class="input-group">
                                <input id="expiry-age" name="expiry-age" type="number" min="0" max="600000" step="1" class="form-control">
                            </div>
                            <p class="help-block">Max age extra data will be kept before being deleted</p>
                        </div>
                    </div>               
                </form>                          
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
                <button type="button" class="btn btn-primary" id="module-editor-settings-dialog-save">Save</button>
            </div>
        </div>
    </div>
</div>

<div class="modal" role="dialog" id="module-editor-debug-dialog">
    <div class="modal-dialog modal-lg mt-100" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                <h4 class="modal-title">Debug Information</h4>
            </div>
            <div class="modal-body">
                <div id="module-editor-debug-dialog-content"></div>   
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
            </div>
        </div>
    </div>
</div>

<div class="modal" role="dialog" id="module-installer-dialog">
    <div class="modal-dialog modal-lg" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                <h4 class="modal-title">Module package Manager</h4>
            </div>
            <div class="modal-body">
                <nav class="navbar navbar-default" style="margin-bottom: 15px;">
                    <div class="container-fluid">
                        <div class="nav navbar-nav" style="margin-left: 0;">
                            <button type="button" class="btn btn-primary navbar-btn" id="module-installer-verify-all" data-toggle="tooltip" data-container="body" data-placement="bottom" title="Verify Installed Modules">
                                <i class="fa-solid fa-shield-check fa-fw"></i>
                            </button>
                            <button type="button" class="btn btn-info navbar-btn" id="module-installer-update-all" data-toggle="tooltip" data-container="body" data-placement="bottom" title="Update All Installed Modules">
                                <i class="fa-solid fa-download fa-fw"></i>
                            </button>
                            <button type="button" class="btn btn-success navbar-btn" id="module-installer-install-all" data-toggle="tooltip" data-container="body" data-placement="bottom" title="Install All Modules">
                                <i class="fa-solid fa-layer-group fa-fw"></i>
                            </button>
                        </div>
                    </div>
                </nav>
                <ul class="nav nav-tabs" role="tablist">
                    <li role="presentation" class="active"><a href="#module-installer-tab" aria-controls="module-installer-tab" role="tab" data-toggle="tab">Installer</a></li>
                    <li role="presentation"><a href="#module-core-tab" aria-controls="module-core-tab" role="tab" data-toggle="tab">Core Modules</a></li>
                    <li role="presentation"><a href="#module-suggested-tab" aria-controls="module-suggested-tab" role="tab" data-toggle="tab">Suggested</a></li>
                </ul>
                <div id="module-installer-list">
                    <div class="tab-content">
                        <div role="tabpanel" class="tab-pane active" id="module-installer-tab">
                            <div id="module-installer-fixed">
                                <div class="row">
                                    <div class="col-sm-3">
                                        <div class="form-group">
                                            <label for="module-installer-branch">Version</label>
                                            <select class="form-control" id="module-installer-branch"></select>
                                        </div>
                                    </div>
                                <div class="col-sm-5">
                                    <div class="form-group">
                                        <label for="module-installer-search">Filter Modules</label>
                                        <input type="text" class="form-control" id="module-installer-search" placeholder="Search by name, code, description, group">
                                    </div>
                                </div>
                                <div class="col-sm-4">
                                    <div class="form-group">
                                        <label for="module-installer-filter" class="control-label">Show</label>
                                        <select class="form-control" id="module-installer-filter">
                                            <option value="all">All Modules</option>
                                            <option value="updateable">Updateable Modules</option>
                                            <option value="migrateable">Migrateable Modules</option>
                                            <option value="not-installed">Not Installed</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                                <div id="module-installer-summary"></div>
                            </div>
                            <div id="module-installer-groups"></div>
                        </div>
                        <div role="tabpanel" class="tab-pane" id="module-core-tab">
                            <div id="module-core-groups"></div>
                        </div>
                        <div role="tabpanel" class="tab-pane" id="module-suggested-tab">
                            <div id="module-suggested-groups"></div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <span class="pull-left text-muted" id="module-installer-repo"></span>
                <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
            </div>
        </div>
    </div>
</div>

<div class="modal" role="dialog" id="module-installer-progress-modal">
    <div class="modal-dialog modal-md" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h4 class="modal-title">Installer Progress</h4>
            </div>
            <div class="modal-body">
                <div id="module-installer-progress-status" class="help-block" style="margin-top: 0;"></div>
                <pre id="module-installer-progress-log" style="height: 320px; overflow-y: auto; margin-bottom: 0;"></pre>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-warning" id="module-installer-progress-cancel">Cancel</button>
                <button type="button" class="btn btn-default" id="module-installer-progress-close" data-dismiss="modal">Close</button>
            </div>
        </div>
    </div>
</div>

<script type="module">
    var moduleEditor = new MODULESEDITOR();
    moduleEditor.run();
</script>

<?php
}
?>
