<?php

function DisplayModule() {

?>

<script src="/documentation/js/all.min.js" type="application/javascript"></script>

<script src="/js/sortable/sortable.js"></script>
<script src="/js/sortable/jquery-sortable.js"></script>

<link rel='stylesheet' href='/css/modules.css' />
<script src="/js/modules/modules.js"></script>

<script src="/js/jquery-loading-overlay/dist/loadingoverlay.min.js"></script>

<script src="/js/bootbox/bootbox.all.js"></script>
<script src="/js/bootbox/bootbox.locales.min.js"></script>

<link rel='stylesheet' href='/js/jquery-ui-1.13.1.custom/jquery-ui.min.css' />
<script src="/js/jquery-ui-1.13.1.custom/jquery-ui.min.js"></script>

<link rel="stylesheet" type="text/css" href="/js/overlay/imagemanager/oe-imagemanager.css" />
<script type="text/javascript" src="/js/overlay/imagemanager/oe-imagemanager.js"></script>

<link href="/js/dropzone/dropzone.css" type="text/css" rel="stylesheet" />
<script src="/js/dropzone/dropzone-min.js"></script>

<script src="/js/jquery-gpio/jquery-gpio.js"></script>
<script src="/js/jquery-roi/jquery-roi.js"></script>
<script src="/js/konva/konva.min.js"></script>

<div class="row">
    <div class="col-lg-12">
		<div class="panel panel-primary">
			<div class="panel-heading"><i class="fa fa-bars fa-fw"></i> Module Manager</div>
            <div class="panel-body">
                <nav class="navbar navbar-default">
                    <div class="container-fluid">
                        <div class="collapse navbar-collapse" id="oe-autoexposure-navbar">
                            <ul class="nav navbar-nav">
                                <li>
                                    <div class="btn btn-lg navbar-btn" id="module-editor-save" data-toggle="tooltip" data-placement="top" data-container="body" title="Save The Module Configuration"><i class="fa-solid fa-floppy-disk fa-lg"></i></div>
                                </li>
                                <li>
                                    <div class="btn btn-lg navbar-btn" id="module-editor-new" data-toggle="tooltip" data-placement="top" data-container="body" title="Add A New Module"><i class="fa-solid fa-upload fa-lg"></i></div>
                                </li>
                                <li class="btn-lg">
                                    <form id="oe-item-list-edit-dialog-form" class="form-horizontal">
                                        <div class="form-group">
                                            <select class="form-control navbar-form" id="module-editor-config" name="module-editor-config" width="200px">
                                                <option value="day">Daytime Configuration</option>
                                                <option value="night">Nighttime Configuration</option>
                                                <!-- <option value="endofnight">End Of Day Configuration</option> -->
                                            </select>
                                        </div>
                                    </form>
                                </li>
                            </ul>
                            <ul class="nav navbar-nav navbar-right">
                                <li>
                                    <div class="btn btn-lg navbar-btn" id="module-options" data-toggle="tooltip" data-container="body" data-placement="top" title="Module Options"><i class="fa-solid fa-gear fa-lg"></i>
                                    </div>
                                </li>
                                <li id="oe-toolbar-debug" class="hidden">
                                    <div id="module-toobar-debug-button" class="btn btn-lg navbar-btn" data-toggle="tooltip" data-container="body" data-placement="top" title="Debug Info"><i class="fa-solid fa-bug fa-lg"></i></div>
                                </li>                                
                                <li>
                                    <div class="btn btn-lg navbar-btn" id="module-editor-reset" data-toggle="tooltip" data-placement="top" data-container="body" title="Reset Config to default"><i class="fa-solid fa-rotate-right fa-lg"></i></div>
                                </li>
                            </ul>                            
                        </div>
                    </div>
                </nav>
                <div class="row module-lists">
                    <div class="col-sm-6 col-md-6 col-lg-6 module-column">
                        <h4 class="text-center">Available Modules</h4>
                        <div class="module-container">
                            <div id="modules-available" class="list-group"></div>
                            <div id="modules-available-empty"><span>No modules available</span></div>
                        </div>
                    </div>
                    <div class="col-sm-6 col-md-6 col-lg-6 module-column">
                        <h4 class="text-center">Selected Modules</h4>
                        <div class="module-container">
                            <div id="modules-selected" class="list-group"></div>
                            <div id="modules-selected-empty"><span>Drag modules here to enable them</span></div>
                        </div>
                    </div>
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
    <div class="modal-dialog modal-lg" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                <h4 class="modal-title">Module Settings</h4>
            </div>
            <div class="modal-body">
                <form id="oe-debug-dialog-form" class="form-horizontal">
                    <div class="form-group">
                        <label for="checkbox" class="control-label col-xs-4"></label> 
                        <div class="col-xs-8">
                            <label class="checkbox-inline">
                            <input type="checkbox" name="enablewatchdog" id="enablewatchdog" checked="checked">
                                Enable Watchdog
                            </label>
                            <p class="help-block">Enable the module watchdog. This will automatically disable slow running modules</p>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="watchdog-timeout" class="col-sm-4 control-label">Module Max Time</label>
                        <div class="col-sm-8">
                            <div class="input-group">
                                <input id="watchdog-timeout" name="watchdog-timeout" type="number" min="0" max="10000" step="100" class="form-control">
                            </div>
                            <p class="help-block">The maximum time a module can run for, in milliseconds. After this amount of time it will be disabled</p>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="checkbox" class="control-label col-xs-4"></label> 
                        <div class="col-xs-8">
                            <label class="checkbox-inline">
                            <input type="checkbox" name="autoenable" id="autoenable">
                                Auto Enable
                            </label>
                            <p class="help-block">Auto enable modules when selected</p>
                        </div>
                    </div> 
                    <div class="form-group">
                        <label for="checkbox" class="control-label col-xs-4"></label> 
                        <div class="col-xs-8">
                            <label class="checkbox-inline">
                            <input type="checkbox" name="showexperimental" id="showexperimental">
                                Show Experimental
                            </label>
                            <p class="help-block">Show exterimental modules. NOTE: These may be unstable and cause issues</p>
                        </div>
                    </div>                                      
                    <div class="form-group">
                        <label for="checkbox" class="control-label col-xs-4"></label> 
                        <div class="col-xs-8">
                            <label class="checkbox-inline">
                            <input type="checkbox" name="debugmode" id="debugmode">
                                Debug Mode
                            </label>
                            <p class="help-block">Enable debug mode. An additional icon will appear inthe toolbar showing the last results of each running module</p>
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
    <div class="modal-dialog modal-lg" role="document">
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


<div class="modal" role="dialog" id="module-file-manager-dialog">
    <div class="modal-dialog modal-lg" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                <h4 class="modal-title">Image Manager</h4>
            </div>
            <div class="modal-body">
                <div id="module-image-manager"></div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-default" id="module-file-manager-dialog-close" data-dismiss="modal">Close</button>
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