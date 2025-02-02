<?php

function DisplayModule() {

?>

<script src="/documentation/js/all.min.js?c=<?php echo ALLSKY_VERSION; ?>" type="application/javascript"></script>

<script src="/js/sortable/sortable.js?c=<?php echo ALLSKY_VERSION; ?>"></script>
<script src="/js/sortable/jquery-sortable.js?c=<?php echo ALLSKY_VERSION; ?>"></script>

<link rel='stylesheet' href='/css/modules.css?c=<?php echo ALLSKY_VERSION; ?>' />
<script src="/js/modules/modules.js?c=<?php echo ALLSKY_VERSION; ?>"></script>

<script src="/js/jquery-loading-overlay/dist/loadingoverlay.min.js?c=<?php echo ALLSKY_VERSION; ?>"></script>

<script src="/js/bootbox/bootbox.all.js?c=<?php echo ALLSKY_VERSION; ?>"></script>
<script src="/js/bootbox/bootbox.locales.min.js?c=<?php echo ALLSKY_VERSION; ?>"></script>

<link rel='stylesheet' href='/js/jquery-ui-1.13.1.custom/jquery-ui.min.css?c=<?php echo ALLSKY_VERSION; ?>' />
<script src="/js/jquery-ui-1.13.1.custom/jquery-ui.min.js?c=<?php echo ALLSKY_VERSION; ?>"></script>

<link rel="stylesheet" type="text/css" href="/js/overlay/imagemanager/oe-imagemanager.css?c=<?php echo ALLSKY_VERSION; ?>" />
<script type="text/javascript" src="/js/overlay/imagemanager/oe-imagemanager.js?c=<?php echo ALLSKY_VERSION; ?>"></script>

<link href="/js/dropzone/dropzone.css?c=<?php echo ALLSKY_VERSION; ?>" type="text/css" rel="stylesheet" />
<script src="/js/dropzone/dropzone-min.js?c=<?php echo ALLSKY_VERSION; ?>"></script>

<script src="/js/jquery-gpio/jquery-gpio.js?c=<?php echo ALLSKY_VERSION; ?>"></script>
<script src="/js/jquery-roi/jquery-roi.js?c=<?php echo ALLSKY_VERSION; ?>"></script>
<script src="/js/konva/konva.min.js?c=<?php echo ALLSKY_VERSION; ?>"></script>

<link rel="stylesheet" href="/js/jquery-i2c/jquery-i2c.css?c=<?php echo ALLSKY_VERSION; ?>">
<script src="/js/jquery-i2c/jquery-i2c.js?c=<?php echo ALLSKY_VERSION; ?>"></script>

<link rel="stylesheet" href="/js/jquery-variable/jquery-variable.css">
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

<div class="row">
    <div class="col-lg-12">
		<div class="panel panel-primary">
			<div class="panel-heading"><i class="fa fa-bars fa-fw"></i> Module Manager</div>
            <div class="panel-body">
                <nav class="navbar navbar-default">
                    <div class="container-fluid">
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
                                <li class="btn-lg">
                                    <form id="oe-item-list-edit-dialog-form" class="form-horizontal">
                                        <div class="form-group">
                                            <div class="tooltip-wrapper disabled" data-toggle="tooltip" data-container="body" data-placement="top" title="Sselect the Flow to manage">
                                                <select class="form-control navbar-form" id="module-editor-config" name="module-editor-config" width="200px">
                                                    <option value="day">Daytime Configuration</option>
                                                    <option value="night">Nighttime Configuration</option>
                                                    <!-- <option value="endofnight">End Of Day Configuration</option> -->
                                                </select>
                                            </div>
                                        </div>
                                    </form>
                                </li>
                            </ul>
                            <ul class="nav navbar-nav navbar-right">
                                <li>
                                    <div class="btn btn-lg navbar-btn" id="module-options" data-toggle="tooltip" data-container="body" data-placement="top" title="Module Options"><i class="fa-solid fa-gear"></i>
                                    </div>
                                </li>
                                <li id="oe-toolbar-debug" class="hidden">
                                    <div id="module-toobar-debug-button" class="btn btn-lg navbar-btn" data-toggle="tooltip" data-container="body" data-placement="top" title="Debug Info"><i class="fa-solid fa-bug"></i></div>
                                </li>                                
                                <li>
                                    <div class="btn btn-lg navbar-btn" id="module-editor-reset" data-toggle="tooltip" data-placement="top" data-container="body" title="Reset Config to default"><i class="fa-solid fa-rotate-right"></i></div>
                                </li>
                                <li>
                                    <div class="btn btn-lg navbar-btn" id="module-editor-restore" data-toggle="tooltip" data-placement="top" data-container="body" title="Restore last good config"><i class="fa-solid fa-upload"></i></div>
                                </li>
                            </ul>                            
                        </div>
                    </div>
                </nav>
                <div class="row module-lists">
                    <div class="col-sm-6 col-md-6 col-lg-6 module-column">
                        <h4 class="text-center">Available Modules</h4>



						<form class="form-horizontal">
							<div class="form-group">
								<label for="module-module-filter" class="col-sm-2 control-label">Search</label>
								<div class="col-sm-6">
									<input type="text" class="form-control" id="module-module-filter">
								</div>
								<button type="button" class="btn btn-primary btn-sm" id="module-module-filter-clear"><i class="fa-solid fa-magnifying-glass-minus"></i></button>
							</div>
						</form>



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
                    <!-- <div class="form-group">
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
                                <input id="watchdog-timeout" name="watchdog-timeout" type="number" min="0" max="100" step="1" class="form-control">
                            </div>
                            <p class="help-block">The maximum time a module can run for, in seconds. After this amount of time it will be disabled</p>
                        </div>
                    </div> -->
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
                            <input type="checkbox" name="debugmode" id="debugmode">
                                Debug Mode
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

<div class="modal" role="dialog" id="mm-i2c-dialog">
	<div class="modal-dialog modal-lg" role="document">
		<div class="modal-content">
			<div class="modal-header">
				<button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
				<h4 class="modal-title">i2c Selector</h4>
			</div>
			<div class="modal-body">
				<ul class="nav nav-tabs" role="tablist">
					<li role="presentation" class="active"><a href="#mm-i2c-dialog-tab-detected" role="tab" data-toggle="tab">Detected Devices</a></li>
					<li role="presentation"><a href="#mm-i2c-dialog-tab-library" aria-controls="profile" role="tab" data-toggle="tab">i2c Library</a></li>
					<li role="presentation"><a href="#mm-i2c-dialog-tab-help" aria-controls="profile" role="tab" data-toggle="tab">Help</a></li>
				</ul>

				<div class="tab-content">
					<div role="tabpanel" class="tab-pane active" id="mm-i2c-dialog-tab-detected">
						<table id="mm-i2c-dialog-tab-detected-devices" class="display i2ctable" style="width:98%">
							<thead>
								<tr>
									<th>Address</th>
									<th>Possible Devices</th>
									<th></th>                                        
								</tr>
							</thead>
						</table>
					</div>
					<div role="tabpanel" class="tab-pane" id="mm-i2c-dialog-tab-library">
						<div id="oe-item-list-dialog-all-table">
							<table id="mm-i2c-dialog-tab-library-library" class="display compact i2ctable" style="width:98%">
								<thead>
									<tr>
										<th>Address</th>
										<th>Devices</th>
										<th>Address Range</th>
										<th>Link</th>
									</tr>
								</thead>
							</table>
						</div>
					</div>
					<div role="tabpanel" class="tab-pane" id="mm-i2c-dialog-tab-help">
						<h3>Information</h3>
						<p>This dialog allows you to select the required i2c address by providing a list of devices addresses detected on your Pi and a list of possible devices.</p>
						<p><strong>NOTE:</strong> The devices listed are only possible devices. If you are sure you know the address you require but your device is not listed please select the address anyway.</p>
						<p>The hardware and address data used in this dialog has been provided by Adafruit, see <a href="https://github.com/adafruit/I2C_Addresses" target="_blank">Adafruit i2c list</a></p>
						<br>
						<h4>Detected Devices</h4>
						<p>Since multiple hardware devices can share the same i2c address This tab displays the devices that have been detected on the FIRST i2c bus and a list of possible devices</p>
						<p>Select the relevant address by clicking on the row.</p>
						<h4>i2c Library</h4>
						<p>This tab shows a list of knows i2c hardware devices and the addresses they occupy. Given that new devices are released frequntly this list may not be uptodate</p>
					</div>                        
				</div>
			</div>
			<div class="modal-footer">
				<button type="button" class="btn btn-danger" data-dismiss="modal" id="mm-i2c-dialog-cancel">Close</button>
				<button type="submit" class="btn btn-primary" id="mm-i2c-dialog-select">Select</button>
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