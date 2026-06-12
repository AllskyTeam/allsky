<?php

if (basename(__FILE__) === basename($_SERVER['SCRIPT_FILENAME'])) {
    include_once('functions.php');
    redirect("/index.php");
}

function DisplayModule()
{
	global $pageHeaderTitle, $pageIcon, $pageHelp;

    echo addAsset([
        '/js/sortable/sortable.js',
        '/js/sortable/jquery-sortable.js',
        '/js/modules/modules.js',
        '/js/jquery-loading-overlay/dist/loadingoverlay.min.js',
        '/js/bootbox/bootbox.all.js',
        '/js/bootbox/bootbox.locales.min.js',
        '/js/overlay/imagemanager/oe-imagemanager.css',
        '/js/overlay/imagemanager/oe-imagemanager.js',
        '/js/jquery-mask/jquery-mask.css',
        '/js/jquery-mask/jquery-mask.js',
        '/js/bootstrap-slider/dist/css/bootstrap-slider.css',
        '/js/bootstrap-slider/dist/bootstrap-slider.js',
        '/js/dropzone/dropzone.css',
        '/js/dropzone/dropzone-min.js',
        '/js/jquery-gpio/jquery-gpio.js',
        '/js/jquery-roi/jquery-roi.js',
        '/js/konva/konva.min.js',
        '/js/jquery-i2c/jquery-i2c.css',
        '/js/jquery-i2c/jquery-i2c.js',
        '/js/jquery-variable/jquery-variable.js',
        '/js/datatables/datatables.min.css',
        '/js/datatables/datatables.js',
        '/js/spectrum/dist/spectrum.js',
        '/js/spectrum/dist/spectrum.css',
        '/js/jquery-select2/dist/css/select2.min.css',
        '/js/jquery-select2-bootstrap-theme/dist/select2-bootstrap.min.css',
        '/js/jquery-select2/dist/js/select2.full.min.js',
        '/js/jvc/jvc.min.js',
        '/js/jvc/jvc.min.css',
        '/js/leaflet/leaflet.css',
        '/js/leaflet/leaflet.js',
        '/js/jquery-position/jquery-position.js',
        '/js/jquery-urlcheck/jquery-urlcheck.js',
        '/js/jquery-urlcheck/jquery-urlcheck.css',
        '/js/jquery-filebrowser/jquery-filebrowser.js',
        '/js/jquery-devicemanager/jquery-devicemanager.js',
        '/js/highcharts/code/highcharts.js',
        '/js/highcharts/code/highcharts-more.js',
        '/js/highcharts/code/highcharts-3d.js',
        '/js/highcharts/code/modules/series-label.js',
        '/js/highcharts/code/modules/solid-gauge.js',
        '/js/highcharts/code/modules/no-data-to-display.js',
        '/js/jquery-chart/jquery-chart.js',
        '/js/jquery-satpicker/jquery-satpicker.js',
        '/js/jquery-allskykamera/jquery-allskykamera.js',
        '/js/jquery-allskysensor/jquery-allskysensor.js'
    ]);     
?>

<!--
<link rel='stylesheet' href='/js/jquery-ui-1.14.1.custom/jquery-ui.min.css?c=<?php echo ALLSKY_VERSION; ?>' />
<script src="/js/jquery-ui-1.14.1.custom/jquery-ui.min.js?c=<?php echo ALLSKY_VERSION; ?>"></script>
-->

<div class="panel panel-allsky">
	<div class="panel-heading clearfix">
        <span><i class="<?php echo $pageIcon ?>"></i> <?php echo $pageHeaderTitle ?></span>
		<?php if (!empty($pageHelp)) { doHelpLink($pageHelp); } ?>
    </div>
    <div class="panel-body">
        <nav class="navbar navbar-default">
            <div class="container-fluid-old">
                <div class="navbar-header">
                    <button type="button" class="navbar-toggle collapsed pull-left" style="margin-left: 15px;" data-toggle="collapse" data-target="#oe-module-editor-navbar">
                        <span class="sr-only">Toggle navigation</span>
                        <span class="icon-bar"></span>
                        <span class="icon-bar"></span>
                        <span class="icon-bar"></span>                                            
                    </button>
                </div>                        
                <div class="collapse navbar-collapse" id="oe-module-editor-navbar">
                    <div class="tooltip-wrapper disabled navbar-left hidden-xs" data-toggle="tooltip" data-container="body" data-placement="top" title="Save The Module Configuration">
                        <div class="btn navbar-btn" id="module-editor-save"><i class="fa-solid fa-floppy-disk"></i></div>
                    </div>
                    <form id="oe-item-list-edit-dialog-form" class="navbar-form navbar-left hidden-xs">
                        <div class="form-group">
                            <div class="tooltip-wrapper disabled" data-toggle="tooltip" data-container="body" data-placement="top" title="Select the Flow to manage">
                                <select class="form-control" id="module-editor-config" name="module-editor-config" style="width: 200px;">
                                    <option value="day">Daytime Configuration</option>
                                    <option value="night">Nighttime Configuration</option>
                                    <!-- <option value="endofnight">End Of Day Configuration</option> -->
                                </select>
                            </div>
                        </div>
                    </form>
                    <div class="btn navbar-btn navbar-left hidden-xs" id="module-editor-periodic" data-toggle="tooltip" data-container="body" data-placement="top" title="Periodic Flow"><i class="fa-solid fa-clock"></i></div>
                    <form id="oe-item-filter-dialog-form" class="navbar-form navbar-left hidden-xs hidden-sm hidden-md">
                        <div class="form-group">
                            <select class="form-control" name="module-filters" id="module-filters">
                            </select>
                        </div>
                    </form>
                    <div class="navbar-right hidden-xs">
                        <div class="btn navbar-btn" id="module-installer-manager" data-toggle="tooltip" data-container="body" data-placement="top" title="Module package Manager"><i class="fa-solid fa-box-open"></i></div>
                        <div class="btn navbar-btn hidden-xs hidden-sm hidden-md" id="device-manager" data-toggle="tooltip" data-container="body" data-placement="top" title="Device Manager"><i class="fa-solid fa-wrench"></i></div>
                        <div class="btn navbar-btn hidden-xs hidden-sm hidden-md" id="module-options" data-toggle="tooltip" data-container="body" data-placement="top" title="Module Options"><i class="fa-solid fa-gear"></i></div>
                        <span id="oe-toolbar-debug" class="hidden hidden-xs hidden-sm hidden-md">
                            <div id="module-toobar-debug-button" class="btn navbar-btn" data-toggle="tooltip" data-container="body" data-placement="top" title="Debug Info"><i class="fa-solid fa-bug"></i></div>
                        </span>
                    </div>
                    <form id="oe-item-list-edit-dialog-form-mobile" class="navbar-form visible-xs-block">
                        <div class="form-group">
                            <label for="module-editor-config-mobile">Pipeline</label>
                            <select class="form-control input-lg" id="module-editor-config-mobile" name="module-editor-config-mobile">
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="module-filters-mobile">Filter</label>
                            <select class="form-control input-lg" id="module-filters-mobile" name="module-filters-mobile">
                            </select>
                        </div>
                    </form>
                    <ul class="nav navbar-nav visible-xs-block">
                        <li><a href="#" class="module-editor-mobile-action" data-target="#module-editor-save"><i class="fa-solid fa-floppy-disk"></i> Save Configuration</a></li>
                        <li><a href="#" class="module-editor-mobile-action" data-target="#module-editor-periodic"><i class="fa-solid fa-clock"></i> Periodic Flow</a></li>
                        <li><a href="#" class="module-editor-mobile-action" data-target="#module-installer-manager"><i class="fa-solid fa-box-open"></i> Module Package Manager</a></li>
                        <li><a href="#" class="module-editor-mobile-action" data-target="#device-manager"><i class="fa-solid fa-wrench"></i> Device Manager</a></li>
                        <li><a href="#" class="module-editor-mobile-action" data-target="#module-options"><i class="fa-solid fa-gear"></i> Module Options</a></li>
                        <li id="oe-toolbar-debug-mobile" class="hidden"><a href="#" class="module-editor-mobile-action" data-target="#module-toobar-debug-button"><i class="fa-solid fa-bug"></i> Debug Info</a></li>
                    </ul>
                </div>
            </div>
        </nav>
        <div class="row module-lists">
            <div class="col-sm-6 col-md-6 col-lg-6 module-column">
                <div class="module-column-header">
                    <h4>Available Modules</h4>
                    <form class="module-column-filter" role="search">
                        <label for="module-available-filter" class="sr-only">Search available modules</label>
                        <div class="input-group input-group-sm">
                            <input type="text" class="form-control" id="module-available-filter" placeholder="Search">
                            <span class="input-group-btn">
                                <button type="button" class="btn btn-default" id="module-available-filter-clear" title="Clear filter"><i class="fa-solid fa-xmark"></i></button>
                            </span>
                        </div>
                    </form>
                </div>


                <div class="module-container">
                    <div id="modules-available" class="list-group"></div>
                    <div id="modules-available-empty"><span>No modules available</span></div>
                </div>
            </div>
            <div class="col-sm-6 col-md-6 col-lg-6 module-column">
                <div class="module-column-header">
                    <h4>Selected Modules</h4>
                    <form class="module-column-filter" role="search">
                        <label for="module-selected-filter" class="sr-only">Search selected modules</label>
                        <div class="input-group input-group-sm">
                            <input type="text" class="form-control" id="module-selected-filter" placeholder="Search">
                            <span class="input-group-btn">
                                <button type="button" class="btn btn-default" id="module-selected-filter-clear" title="Clear filter"><i class="fa-solid fa-xmark"></i></button>
                            </span>
                        </div>
                    </form>
                </div>

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
                        <div class="col-xs-1">
                            <button type="button" class="btn btn-link btn-xs as-field-help-toggle" data-toggle="popover" data-container="body" data-trigger="focus click" data-placement="left" title="Auto Enable" data-content="Auto enable modules when selected." aria-label="Show help for Auto Enable"><i class="fa-solid fa-circle-info"></i></button>
                        </div>
                        <div class="col-xs-7">
                            <label class="el-switch el-switch-sm el-switch-green">
                                <input type="checkbox" id="autoenable">
                                <span class="el-switch-style"></span>
                            </label>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="debugmode" class="control-label col-xs-4">Debug Mode</label>
                        <div class="col-xs-1">
                            <button type="button" class="btn btn-link btn-xs as-field-help-toggle" data-toggle="popover" data-container="body" data-trigger="focus click" data-placement="left" title="Debug Mode" data-content="Enable debug mode. An additional icon will appear in the toolbar showing the last results of each running module." aria-label="Show help for Debug Mode"><i class="fa-solid fa-circle-info"></i></button>
                        </div>
                        <div class="col-xs-7">
                            <label class="el-switch el-switch-sm el-switch-green">
                                <input type="checkbox" id="debugmode">
                                <span class="el-switch-style"></span>
                            </label>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="watchdog-timeout" class="col-sm-4 control-label">Periodic Timer</label>
                        <div class="col-sm-1">
                            <button type="button" class="btn btn-link btn-xs as-field-help-toggle" data-toggle="popover" data-container="body" data-trigger="focus click" data-placement="left" title="Periodic Timer" data-content="The delay between running periodic modules in seconds." aria-label="Show help for Periodic Timer"><i class="fa-solid fa-circle-info"></i></button>
                        </div>
                        <div class="col-sm-7">
                            <div class="input-group">
                                <input id="periodic-timer" name="periodic-timer" type="number" min="0" max="3600" step="1" class="form-control">
                            </div>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="watchdog-timeout" class="col-sm-4 control-label">Data Expiry</label>
                        <div class="col-sm-1">
                            <button type="button" class="btn btn-link btn-xs as-field-help-toggle" data-toggle="popover" data-container="body" data-trigger="focus click" data-placement="left" title="Data Expiry" data-content="Max age extra data will be kept before being deleted." aria-label="Show help for Data Expiry"><i class="fa-solid fa-circle-info"></i></button>
                        </div>
                        <div class="col-sm-7">
                            <div class="input-group">
                                <input id="expiry-age" name="expiry-age" type="number" min="0" max="600000" step="1" class="form-control">
                            </div>
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
                <nav class="navbar-collapse module-installer-main-navbar">
                    <div class="container-fluid">
                        <div class="btn-toolbar" role="toolbar">
                            <button type="button" class="btn navbar-btn module-block-button" id="module-installer-verify-all" data-toggle="tooltip" data-container="body" data-placement="bottom" title="Verify Installed Modules">
                                <i class="fa-solid fa-check-double"></i>
                            </button>
                            <button type="button" class="btn navbar-btn module-block-button" id="module-installer-update-all" data-toggle="tooltip" data-container="body" data-placement="bottom" title="Update All Installed Modules">
                                <i class="fa-solid fa-download fa-fw"></i>
                            </button>
                            <button type="button" class="btn navbar-btn module-block-button" id="module-installer-install-all" data-toggle="tooltip" data-container="body" data-placement="bottom" title="Install All Modules">
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
	                                        <div class="input-group module-installer-search-group">
	                                            <input type="text" class="form-control" id="module-installer-search" placeholder="Search by name, code, description, group">
	                                            <span class="input-group-btn">
	                                                <button type="button" class="btn btn-default" id="module-installer-search-clear" title="Clear filter"><i class="fa-solid fa-xmark"></i></button>
	                                            </span>
	                                        </div>
	                                    </div>
	                                </div>
                                <div class="col-sm-4">
                                    <div class="form-group">
                                        <label for="module-installer-filter" class="control-label">Show</label>
                                        <select class="form-control" id="module-installer-filter">
                                            <option value="all">All Modules</option>
                                            <option value="installed">Installed Modules</option>
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
