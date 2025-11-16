<?php
if (basename(__FILE__) === basename($_SERVER['SCRIPT_FILENAME'])) {
    include_once('functions.php');
    redirect("/index.php");
}

function DisplayOverlay($image_name)
{
	global $settings_array;
	global $pageHeaderTitle, $pageIcon;

	$myStatus = new StatusMessages();
?>

    <script src="/js/jquery-loading-overlay/dist/loadingoverlay.min.js?c=<?php echo ALLSKY_VERSION; ?>"></script>

    <script src="/js/moment/moment-min.js?c=<?php echo ALLSKY_VERSION; ?>"></script>

    <script src="/js/overlay/oe-overlayeditor.js?c=<?php echo ALLSKY_VERSION; ?>"></script>
    <script src="/js/overlay/oe-config.js?c=<?php echo ALLSKY_VERSION; ?>"></script>
    <script src="/js/overlay/oe-uimanager.js?c=<?php echo ALLSKY_VERSION; ?>"></script>
    <script src="/js/overlay/oe-startup.js?c=<?php echo ALLSKY_VERSION; ?>"></script>

    <script src="/js/overlay/fields/oe-fieldmanager.js?c=<?php echo ALLSKY_VERSION; ?>"></script>
    <script src="/js/overlay/fields/oe-field.js?c=<?php echo ALLSKY_VERSION; ?>"></script>
    <script src="/js/overlay/fields/oe-text.js?c=<?php echo ALLSKY_VERSION; ?>"></script>
    <script src="/js/overlay/fields/oe-image.js?c=<?php echo ALLSKY_VERSION; ?>"></script>
    <script src="/js/overlay/fields/oe-rect.js?c=<?php echo ALLSKY_VERSION; ?>"></script>
    <script src="/js/overlay/oe-exposure.js?c=<?php echo ALLSKY_VERSION; ?>"></script>

    <script src="/js/jquery-attributes/jquery-attributes.js?c=<?php echo ALLSKY_VERSION; ?>"></script>

    <script src="/js/bootbox/bootbox.all.js?c=<?php echo ALLSKY_VERSION; ?>"></script>
    <script src="/js/bootbox/bootbox.locales.min.js?c=<?php echo ALLSKY_VERSION; ?>"></script>

    <link rel='stylesheet' href='/css/checkbox.css?c=<?php echo ALLSKY_VERSION; ?>' />

    <link rel='stylesheet' href='/js/jquery-ui-1.14.1.custom/jquery-ui.min.css?c=<?php echo ALLSKY_VERSION; ?>' />
    <script src="/js/jquery-ui-1.14.1.custom/jquery-ui.min.js?c=<?php echo ALLSKY_VERSION; ?>"></script>
    <script src="/js/jquery-ui-sortable/jquery-ui-sortable.js?c=<?php echo ALLSKY_VERSION; ?>"></script>

    <link rel="stylesheet" href="/js/bootstrap-slider/dist/css/bootstrap-slider.css?c=<?php echo ALLSKY_VERSION; ?>">
    <script src="/js/bootstrap-slider/dist/bootstrap-slider.js?c=<?php echo ALLSKY_VERSION; ?>"></script>
        
    <link rel='stylesheet' href='/js/spectrum/dist/spectrum.css?c=<?php echo ALLSKY_VERSION; ?>' />
    <script src="/js/spectrum/dist/spectrum.js?c=<?php echo ALLSKY_VERSION; ?>"></script>

    <link rel='stylesheet' href='/js/jqPropertyGrid/jqPropertyGrid.css?c=<?php echo ALLSKY_VERSION; ?>' />
    <script src="/js/jqPropertyGrid/jqPropertyGrid.js?c=<?php echo ALLSKY_VERSION; ?>"></script>

    <link rel="stylesheet" type="text/css" href="/js/datatables/datatables.min.css?c=<?php echo ALLSKY_VERSION; ?>" />
    <script type="text/javascript" src="/js/datatables/datatables.js?c=<?php echo ALLSKY_VERSION; ?>"></script>

    <link rel="stylesheet" type="text/css" href="/js/overlay/imagemanager/oe-imagemanager.css?c=<?php echo ALLSKY_VERSION; ?>" />
    <script type="text/javascript" src="/js/overlay/imagemanager/oe-imagemanager.js?c=<?php echo ALLSKY_VERSION; ?>"></script>

    <link rel="stylesheet" href="/js/jquery-mask/jquery-mask.css?c=<?php echo ALLSKY_VERSION; ?>">
    <script src="/js/jquery-mask/jquery-mask.js?c=<?php echo ALLSKY_VERSION; ?>"></script>

    <script type="text/javascript" src="/js/jquery-overlaymanager/jquery-overlaymanager.js?c=<?php echo ALLSKY_VERSION; ?>"></script>

    <link href="/js/dropzone/dropzone.css?c=<?php echo ALLSKY_VERSION; ?>" type="text/css" rel="stylesheet" />
    <script src="/js/dropzone/dropzone-min.js?c=<?php echo ALLSKY_VERSION; ?>"></script>

    <script src="/js/konva/konva.min.js?c=<?php echo ALLSKY_VERSION; ?>"></script>

    <link href="/css/overlay.css?c=<?php echo ALLSKY_VERSION; ?>" rel="stylesheet">

    <link rel="stylesheet" href="/js/jquery-variable/jquery-variable.css">
    <script src="/js/jquery-variable/jquery-variable.js?c=<?php echo ALLSKY_VERSION; ?>"></script>

    <script src="/js/jquery-datebuilder/jquery-datebuilder.js?c=<?php echo ALLSKY_VERSION; ?>"></script>
    <link rel='stylesheet' href='/js/jquery-datebuilder/jquery-datebuilder.css?c=<?php echo ALLSKY_VERSION; ?>' />

    <div id="oeeditor">
        <div id="oe-overlay-manager"></div>     
        <div id="oe-viewport" class="panel panel-allsky">
            <div id="oe-overlay-not-running" class="oe-not-running big hidden">
                <div class="center-full">
                    <div class="center-paragraph">
                        <h1>Allsky is not currently capturing images</h1>
                        <p>Please wait for Allsky to begin capturing before using the Overlay Editor</p>
                        <small>You can stay on this page and the Overlay Editor will start automatically once Allsky is running. <span id="oe-overlay-not-running-status"></span></small>
                    </div>
                </div>
            </div> 
			<div class="panel-heading"><i class="<?php echo $pageIcon ?>"></i> <?php echo $pageHeaderTitle ?></div>
                <p id="editor-messages"><?php $myStatus->showMessages(); ?></p>
                <nav class="navbar navbar-default">
                    <div class="container-fluid">
                        <div class="navbar-header">
                            <button type="button" class="navbar-toggle collapsed" data-toggle="collapse" data-target="#oe-main-navbar" aria-expanded="false">
                                <span class="sr-only">Toggle navigation</span>
                                <span class="icon-bar"></span>
                                <span class="icon-bar"></span>
                                <span class="icon-bar"></span>
                            </button>
                        </div>

                        <div class="collapse navbar-collapse" id="oe-main-navbar">
                            <ul class="nav navbar-nav" id="oe-editor-toolbar">
                                <li>
                                    <div class="tooltip-wrapper disabled" data-toggle="tooltip" data-container="body" data-placement="top" title="Save The Current Configuration">
                                        <div class="btn btn-lg navbar-btn oe-button disabled" id="oe-save"><i class="fa-solid fa-floppy-disk"></i></div>
                                    </div>
                                </li>
                                <li>
                                    <div class="btn btn-lg navbar-btn oe-button" id="oe-add-text" data-toggle="tooltip" data-container="body" data-placement="top" title="Add New Text Field"><i class="fa-solid fa-font"></i></div>
                                </li>
                                <li>
                                    <div class="btn btn-lg navbar-btn oe-button" id="oe-add-image" data-toggle="tooltip" data-container="body" data-placement="top" title="Add Existing Image Field"><i class="fa-regular fa-image"></i></div>
                                </li>
                                <li>
                                    <div class="tooltip-wrapper disabled" data-toggle="tooltip" data-container="body" data-placement="top" title="Delete The Selected Field">
                                        <div class="btn btn-lg navbar-btn oe-button disabled" id="oe-delete"><i class="fa-solid fa-xmark"></i></div>
                                    </div>
                                </li>
                                <li>
                                    <div class="btn btn-lg navbar-btn oe-button" id="oe-item-list" data-toggle="tooltip" data-container="body" data-placement="top" title="Variable Manager"><i class="fa-regular fa-rectangle-list"></i></div>
                                </li>
                                <li>
                                    <div class="btn btn-lg navbar-btn oe-button" id="oe-test-mode" data-toggle="tooltip" data-container="body" data-placement="top" title="Display Sample Data"><i class="fa-regular fa-square-check"></i></div>
                                </li>



                                <li>
                                    <div class="btn btn-lg navbar-btn oe-zoom oe-button border-left" id="oe-group" data-toggle="tooltip" data-container="body" data-placement="top" title="Group Fields"><i class="fa-solid fa-object-group"></i></div>
                                </li>
                                <li>
                                    <div class="btn btn-lg navbar-btn oe-zoom oe-button" id="oe-ungroup" data-toggle="tooltip" data-container="body" data-placement="top" title="Un Group Fields"><i class="fa-solid fa-object-ungroup"></i></div>
                                </li>

                                
                                <li>
                                    <div class="btn btn-lg navbar-btn oe-zoom oe-button border-left" id="oe-left-align" data-toggle="tooltip" data-container="body" data-placement="top" title="Left Align"><i class="fa-solid fa-align-left"></i></div>
                                </li>
                                <li>
                                    <div class="btn btn-lg navbar-btn oe-zoom oe-button" id="oe-vertical-equal" data-toggle="tooltip" data-container="body" data-placement="top" title="Equal Spacing"><i class="fa-solid fa-arrows-up-down"></i></div>
                                </li>
                                <li>
                                    <div class="btn btn-lg navbar-btn oe-zoom oe-button" id="oe-equal-width" data-toggle="tooltip" data-container="body" data-placement="top" title="Equal Width"><i class="fa-solid fa-rotate-90 fa-arrows-up-down"></i></div>
                                </li>                                    

                                <li>
                                    <div class="btn btn-lg navbar-btn oe-zoom oe-button border-left" id="oe-zoom-in" data-toggle="tooltip" data-container="body" data-placement="top" title="Zoom In"><i class="fa-solid fa-magnifying-glass-plus"></i></div>
                                </li>
                                <li>
                                    <div class="btn btn-lg navbar-btn oe-zoom oe-button" id="oe-zoom-out" data-toggle="tooltip" data-container="body" data-placement="top" title="Zoom Out"><i class="fa-solid fa-magnifying-glass-minus"></i></div>
                                </li>
                                <li>
                                    <div class="btn btn-lg navbar-btn oe-zoom oe-button" id="oe-zoom-full" data-toggle="tooltip" data-container="body" data-placement="top" title="View Full Size"><i class="fa-solid fa-up-right-and-down-left-from-center"></i></div>
                                </li>
                                <li>
                                    <div class="btn btn-lg navbar-btn oe-zoom oe-button" id="oe-zoom-fit" data-toggle="tooltip" data-container="body" data-placement="top" title="Fit to Window"><i class="fa-solid fa-down-left-and-up-right-to-center"></i></div>
                                </li>
                                <li>
                                    <div class="btn btn-lg navbar-btn border-left" id="oe-show-overlay-manager" data-toggle="tooltip" data-container="body" data-placement="top" title="Overlay Manager"><i class="fa-solid fa-gears"></i></div>
                                </li>
                                <li>
                                    <div class="btn btn-lg navbar-btn oe-field-errors hidden" id="oe-field-errors" data-toggle="tooltip" data-container="body" data-placement="top" title="Display Field Errors"><i class="fa-solid fa-circle-exclamation"></i></div>
                                </li>
                            </ul>
                            <ul class="nav navbar-nav navbar-right">
                                <li id="oe-toolbar-debug" class="hidden">
                                    <div id="oe-toobar-debug-button" class="btn btn-lg navbar-btn oe-button" data-toggle="tooltip" data-container="body" data-placement="top" title="Debug Info"><i class="fa-solid fa-bug"></i></div>
                                </li>
                                <li>
                                    <div id="oe-upload-font" class="btn btn-lg navbar-btn oe-button" data-toggle="tooltip" data-container="body" data-placement="top" title="Font Manager">
                                        <i class="fa-solid fa-font"></i>
                                    </div>
                                </li>
                                <li>
                                    <div id="oe-show-image-manager" class="btn btn-lg navbar-btn oe-button" data-toggle="tooltip" data-container="body" data-placement="top" title="Image Manager"><i class="fa-regular fa-images"></i></div>
                                </li>
                                <li>
                                    <div class="btn btn-lg navbar-btn oe-button" id="oe-options" data-toggle="tooltip" data-container="body" data-placement="top" title="Layout and App Options"><i class="fa-solid fa-gear"></i>
                                    </div>
                                </li>
                                <li>
                                    <div class="btn btn-lg navbar-btn oe-button" id="oe-help" data-toggle="tooltip" data-container="body" data-placement="top" title="Help"><i class="fa-solid fa-question"></i>
                                    </div>
                                </li>
                            </ul>
                        </div>
                    </div>
                </nav>                        
                <div class="oe-editor panel-body">
                    <div id="overlay_container" style="background-color: black; position: relative">
                        <div id="oe-overlay-disable" class="hidden">
                            <div class="center">
                                <div class="center-paragraph"><h2>You are using a default <?php echo(getTOD()); ?> time overlay.</h2> <p>To create a new overlay click <a href="#" id="oe-overlay-disable-new">here</a></p></div>
                            </div>
                        </div> 
                        <div id="oe-editor-stage"></div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div id="textdialog" title="Text Properties">
        <div id="textpropgrid"></div>
    </div>

    <div id="imagedialog" title="Image Properties">
        <div id="imagepropgrid"></div>
    </div>

    <div id="rectdialog" title="Rect Properties">
        <div id="rectpropgrid"></div>
    </div>

    <div id="debugdialog" title="Debug Info">
        <div id="debugpropgrid"></div>
    </div>

    <div class="modal" role="dialog" id="formatdialog"  title="Format Help">
        <div id="oe-format-filters-wrapper">
            <form class="form-horizontal">
                <div class="form-group-temp mb-3">
                    <label for="oe-format-filters" class="col-sm-1 control-label">Filter</label>
                    <div class="col-sm-3">
                        <select class="form-control" id="oe-format-filters">
                            <option value="all">Show All</option>
                        </select>                
                    </div>
                </div>
            </form>
        </div>
        <table id="formatlisttable" class="hidden" style="width:100%">
            <thead>
                <tr>
                    <th>Format</th>
                    <th>Description</th>
                    <th>Sample</th>
                    <th>Type</th>
                    <th>Legacy</th>
                    <th></th>
                </tr>
            </thead>
        </table>

        <div class="modal-footer">
            <div class="pull-right">
                <button type="button" id="oe-format-filters-close" class="btn btn-success">Close</button>
            </div>
        </div>
    </div>

    <div class="modal" role="dialog" id="oe-field-errors-dialog">
        <div class="modal-dialog modal-lg" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                    <h4 class="modal-title">Field Errors</h4>
                </div>
                <div class="modal-body">
                    <div role="tabpanel" class="tab-pane active" id="oe-field-errors-dialog-fields">
                        <table id="fielderrorstable" class="display compact" style="width:98%">
                            <thead>
                                <tr>
                                    <th>Field Name</th>
                                    <th>Type</th>
                                    <th>&nbsp;</th>
                                </tr>
                            </thead>
                        </table>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-default" id="oe-field-errors-dialog-close">Close</button>
                </div>
            </div>
        </div>
    </div>

    <div class="modal" role="dialog" id="fontlistdialog">
        <div class="modal-dialog modal-lg" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                    <h4 class="modal-title">Font Manager</h4>
                </div>
                <div class="modal-body">
                    <div class="mt-3">            
                        <table id="fontlisttable" class="display compact" style="width:98%">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Family</th>
                                    <th>Style</th>
                                    <th>&nbsp;</th>
                                </tr>
                            </thead>
                        </table>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-primary pull-left" id="oe-font-dialog-add-font">Install from dafont</button>
                    <button type="button" class="btn btn-primary pull-left" id="oe-font-dialog-upload-font">Upload Font</button>
                    <button type="button" class="btn btn-primary pull-left" id="oe-font-dialog-preview">Preview</button>
                    <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
                </div>
            </div>
        </div>
    </div>

    <div id="oe-font-preview-modal" class="modal fade" tabindex="-1" role="dialog">
    <div class="modal-dialog">
        <div class="modal-content">

        <div class="modal-header">
            <h4 class="modal-title">Font Preview</h4>
        </div>

        <div class="modal-body">
            <form>
            <div class="form-group">
                <label for="oe-font-preview-modal-font-select">Choose a font:</label>
                <select id="oe-font-preview-modal-font-select" class="form-control"></select>
            </div>

            <div class="form-group form-inline">
                <label for="oe-font-preview-modal-preview-text">Enter text:</label>
                <input type="text" id="oe-font-preview-modal-preview-text" class="form-control" placeholder="Type something..." style="width: 60%;" />

                <label for="oe-font-preview-modal-font-size" style="margin-left: 10px;">Size:</label>
                <input type="number" id="oe-font-preview-modal-font-size" class="form-control" value="16" min="8" max="100" step="1" style="width: 80px;" />
                <span>px</span>
            </div>

            <div class="form-group">
                <label>Preview:</label>
                <div id="oe-font-preview-modal-preview-box">
                The quick brown fox jumps over the lazy dog.
                </div>
            </div>
            </form>
        </div>

        <div class="modal-footer">
            <button class="btn btn-default" data-dismiss="modal">Close</button>
        </div>

        </div>
    </div>
    </div>

    <div class="modal" role="dialog" id="oe-debug-dialog">
        <div class="modal-dialog modal-lg" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                    <h4 class="modal-title">Debug Info</h4>
                </div>
                <div class="modal-body">
                    <form id="oe-debug-dialog-form" class="form-horizontal">
                        <div class="form-group">
                            <label for="oe-debug-dialog-overlay" class="col-sm-2 control-label">Overlay Data</label>
                            <div class="col-sm-10">
                                <div class="input-group">
                                    <textarea id="oe-debug-dialog-overlay" name="oe-debug-dialog-overlay" rows="10" cols="80" disabled="disabled"></textarea>
                                </div>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="oe-debug-dialog-fields" class="col-sm-2 control-label">Field Data</label>
                            <div class="col-sm-10">
                                <div class="input-group">
                                    <textarea id="oe-debug-dialog-fields" name="oe-debug-dialog-fields" rows="10" cols="80" disabled="disabled"></textarea>
                                </div>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="oe-debug-dialog-config" class="col-sm-2 control-label">Editor Config</label>
                            <div class="col-sm-10">
                                <div class="input-group">
                                    <textarea id="oe-debug-dialog-config" name="oe-debug-dialog-config" rows="10" cols="80" disabled="disabled"></textarea>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
                </div>
            </div>
        </div>
    </div>

    <div class="modal" tabindex="-1" id="optionsdialog">
        <div class="modal-dialog modal-lg" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                    <h4 class="modal-title">Overlay Editor Options</h4>
                </div>
                <div class="modal-body">



                    <div>

                        <!-- Nav tabs -->
                        <ul class="nav nav-tabs" role="tablist">
                            <li role="presentation" class="active"><a href="#configoptions" aria-controls="configoptions" role="tab" data-toggle="tab" id="oe-editor-layout-defaults">Layout Defaults</a></li>
                            <li role="presentation"><a href="#oeeditoroptions" aria-controls="oeeditoroptions" role="tab" data-toggle="tab">Editor Settings</a></li>
                            <li role="presentation"><a href="#oeeditoroverlays" aria-controls="oeeditoroverlays" role="tab" data-toggle="tab">Overlays</a></li>                                
                        </ul>

                        <!-- Tab panes -->
                        <div class="tab-content">
                            <div role="tabpanel" class="tab-pane active" id="configoptions">
                                <br />

                                <form id="oe-defaults-form" class="form-horizontal">
                                    <div class="form-group">
                                        <label for="defaultimagetopacity" class="control-label col-xs-4">Default Image
                                            Opacity</label>
                                        <div class="col-xs-8">
                                            <div class="input-group">
                                                <input id="defaultimagetopacity" name="defaultimagetopacity" type="number" min="0" max="100" step="1" class="form-control layoutfield">
                                            </div>
                                        </div>
                                    </div>
                                    <div class="form-group">
                                        <label for="defaultimagerotation" class="control-label col-xs-4">Default Image
                                            Rotation</label>
                                        <div class="col-xs-8">
                                            <div class="input-group">
                                                <input id="defaultimagerotation" name="defaultimagerotation" type="number" min="0" max="359" step="1" class="form-control layoutfield">
                                            </div>
                                        </div>
                                    </div>
                                    <div class="form-group">
                                        <label for="defaultfont" class="control-label col-xs-4">Default Font</label>
                                        <div class="col-xs-8">
                                            <div class="input-group">
                                                <select id="defaultfont" name="defaultfont" class="form-control layoutfield">
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="form-group">
                                        <label for="defaultfontsize" class="control-label col-xs-4">Default Font
                                            Size</label>
                                        <div class="col-xs-8">
                                            <div class="input-group">
                                                <input id="defaultfontsize" name="defaultfontsize" type="number" min="8" max="64" step="1" class="form-control layoutfield">
                                            </div>
                                        </div>
                                    </div>
                                    <div class="form-group">
                                        <label for="defaultfontopacity" class="control-label col-xs-4">Default Font
                                            Opacity</label>
                                        <div class="col-xs-8">
                                            <div class="input-group">
                                                <input id="defaultfontopacity" name="defaultfontopacity" type="number" min="0" max="100" step="1" class="form-control layoutfield">
                                            </div>
                                        </div>
                                    </div>
                                    <div class="form-group">
                                        <label for="oe-default-font-colour" class="control-label col-xs-4">Default Font
                                            Colour</label>
                                        <div class="col-xs-8">
                                            <div class="input-group">
                                                <input id="oe-default-font-colour" name="oe-default-font-colour" type="input" class="form-control layoutfield">
                                            </div>
                                        </div>
                                    </div>
                                    <div class="form-group">
                                        <label for="defaulttextrotation" class="control-label col-xs-4">Default Text
                                            Rotation</label>
                                        <div class="col-xs-8">
                                            <div class="input-group">
                                                <input id="defaulttextrotation" name="defaulttextrotation" type="number" min="0" max="359" step="1" class="form-control layoutfield">
                                            </div>
                                        </div>
                                    </div>
                                    <div class="form-group">
                                        <label for="oe-default-stroke-colour" class="control-label col-xs-4">Default Stroke
                                            Colour</label>
                                        <div class="col-xs-8">
                                            <div class="input-group">
                                                <input id="oe-default-stroke-colour" name="oe-default-stroke-colour" type="input" class="form-control layoutfield">
                                            </div>
                                        </div>
                                    </div>

                                    <div class="form-group">
                                        <label for="defaultexpirytext" class="control-label col-xs-4">Expiry Text</label>
                                        <div class="col-xs-8">
                                            <div class="input-group">
                                                <input id="defaultexpirytext" name="defaultexpirytext" type="text" class="form-control layoutfield">
                                            </div>
                                            <p class="help-block">If blank then any expired fields will be removed. If non blank the value of an expired field will be replaced with this text</p>
                                        </div>
                                    </div>
                                </form>

                            </div>

                            <div role="tabpanel" class="tab-pane" id="oeeditoroptions">
                                <br />

                                <form id="oe-app-settings-form" class="form-horizontal">
                                    <div class="form-group">
                                        <div class="col-sm-offset-4 col-sm-8">
                                            <div class="checkbox">
                                                <label>
                                                    <input type="checkbox" id="oe-app-options-show-grid"> Show Grid
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="form-group">
                                        <label for="oe-app-options-grid-size" class="col-sm-4 control-label">Grid Size</label>
                                        <div class="col-sm-8">
                                            <div class="input-group">
                                                <select class="form-control" id="oe-app-options-grid-size" name="oe-app-options-grid-size">
                                                    <option value="0">None</option>
                                                    <option value="5">5x5</option>
                                                    <option value="10">10x10</option>
                                                    <option value="15">15x15</option>
                                                    <option value="20">20x20</option>
                                                    <option value="25">25x25</option>
                                                    <option value="30">30x30</option>
                                                    <option value="35">35x35</option>
                                                    <option value="40">40x40</option>
                                                    <option value="45">45x45</option>
                                                    <option value="50">50x50</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="form-group">
                                        <label for="oe-app-options-grid-colour" class="control-label col-xs-4">Grid Colour</label>
                                        <div class="col-sm-8">
                                            <div class="input-group">
                                                <input id="oe-app-options-grid-colour" name="oe-app-options-grid-colour" type="input" class="form-control">
                                            </div>
                                        </div>
                                    </div>
                                    <div class="form-group">
                                        <label for="oe-app-options-grid-opacity" class="col-sm-4 control-label">Grid Brightness</label>
                                        <div class="col-sm-8">
                                            <div class="input-group">
                                                <input id="oe-app-options-grid-opacity" name="oe-app-options-grid-opacity" type="number" min="0" max="100" step="5" class="form-control">

                                            </div>
                                            <p class="help-block">0 = Lowest, 100 = Brightest</p>
                                        </div>
                                    </div>
                                    <div class="form-group">
                                        <div class="col-sm-offset-4 col-sm-8">
                                            <div class="checkbox">
                                                <label>
                                                    <input type="checkbox" id="oe-app-options-snap-background"> Show Snap Rectangle
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="form-group">
                                        <label for="oe-app-options-add-list-size" class="col-sm-4 control-label">Add List Page Size</label>
                                        <div class="col-sm-8">
                                            <div class="input-group">
                                                <select class="form-control" id="oe-app-options-add-list-size" name="oe-app-options-add-list-size">
                                                    <option value="5">5</option>
                                                    <option value="10">10</option>
                                                    <option value="15">15</option>
                                                    <option value="20">20</option>
                                                    <option value="25">25</option>
                                                    <option value="30">30</option>
                                                    <option value="35">35</option>
                                                    <option value="40">40</option>
                                                    <option value="45">45</option>
                                                    <option value="50">50</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="form-group">
                                        <label for="oe-app-options-add-field-opacity" class="col-sm-4 control-label">Add Field Brightness</label>
                                        <div class="col-sm-8">
                                            <div class="input-group">
                                                <input id="oe-app-options-add-field-opacity" name="oe-app-options-add-field-opacity" type="number" min="0" max="100" step="5" class="form-control">
                                            </div>
                                            <p class="help-block">The brightness existing fields will be set to when adding a field. 0 = Lowest, 100 = Brightest</p>
                                        </div>
                                    </div>


                                    <div class="form-group">
                                        <label for="oe-app-options-select-field-opacity" class="col-sm-4 control-label">Select Field Brightness</label>
                                        <div class="col-sm-8">
                                            <div class="input-group">
                                                <input id="oe-app-options-select-field-opacity" name="oe-app-options-select-field-opacity" type="number" min="0" max="100" step="5" class="form-control">
                                            </div>
                                            <p class="help-block">The brightness existing fields will be set to when selecting a field. 0 = Lowest, 100 = Brightest</p>
                                        </div>
                                    </div>
                                    <div class="form-group">
                                        <div class="col-sm-offset-4 col-sm-8">
                                            <div class="checkbox">
                                                <label>
                                                    <input type="checkbox" id="oe-app-options-mousewheel-zoom"> Zoom with Mouse Wheel
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="form-group">
                                        <label for="oe-app-options-background-opacity" class="col-sm-4 control-label">Background Image Brightness</label>
                                        <div class="col-sm-8">
                                            <div class="input-group">
                                                <input id="oe-app-options-background-opacity" name="oe-app-options-background-opacity" type="number" min="0" max="100" step="10" class="form-control">
                                            </div>
                                            <p class="help-block">0 = Lowest, 100 = Brightest</p>
                                        </div>
                                    </div>
                                </form>

                            </div>

                            <div role="tabpanel" class="tab-pane" id="oeeditoroverlays">
                                <div class="mt-2">
                                    <table id="overlaytablelist" style="width:100%">
                                        <thead>
                                            <tr>
                                                <th>Type</th>                                                
                                                <th>Name</th>
                                                <th>Brand</th>
                                                <th>Model</th>
                                                <th>TOD</th>
                                                <th></th>
                                            </tr>
                                        </thead>
                                    </table> 
                                </div>
                            </div>
                            
                        </div>
                    </div>

                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
                    <button type="button" id="oe-defaults-save" class="btn btn-primary">Save changes</button>
                </div>
            </div><!-- /.modal-content -->
        </div><!-- /.modal-dialog -->
    </div>

    <div class="modal" role="dialog" id="oe-fontuploaddialog">
        <div class="modal-dialog modal-lg" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                    <h4 class="modal-title">Upload Font</h4>
                </div>
                <div class="modal-body">
                    <div>

                        <div class="alert alert-success mt-3" role="alert" id="oe-fontuploaddialog-info">
                            Please refer to the <a href="/documentation/overlays/overlays.html" target="_blank">documentation</a> before uploading zip files. Please ensure the zip file only contains fonts
                        </div>

                        <div class="alert alert-danger hidden oe-fontuploaddialog-error" id="oe-fontuploaddialog-invalid">
                            <strong>Error!</strong> Unable to upload the zip file. Invalid Signature for font file
                        </div>

                        <div class="alert alert-danger hidden oe-fontuploaddialog-error" id="oe-fontuploaddialog-zip-only">
                            <strong>Error!</strong> You can only upload zip files, please refer to the Overlay documentation for more information
                        </div>

                        <div class="alert alert-danger hidden oe-fontuploaddialog-error" id="oe-fontuploaddialog-size">
                            <strong>Error!</strong> The file you are attempting to upload is to large for the current php configuration. Please refer to the Overlay documentation for help on fixing this error
                        </div>

                        <div class="alert alert-danger hidden oe-fontuploaddialog-error" id="oe-fontuploaddialog-header">
                            <strong>Error!</strong> The file you are attempting to upload contains invalid ttf or otf files. Please refer to the Overlay documentation for help on fixing this error
                        </div>

                        <div class="alert alert-danger hidden oe-fontuploaddialog-error" id="oe-fontuploaddialog-file-failed">
                            <strong>Error!</strong> Unable to save the font on the pi. Please refer to the Overlay documentation for help on fixing this error
                        </div>

                        <div class="alert alert-danger hidden oe-fontuploaddialog-error" id="oe-fontuploaddialog-no-fonts">
                            <strong>Error!</strong> The zip file did not contain any valid fonts. Please refer to the Overlay documentation for help on fixing this error
                        </div>

                        <form enctype="multipart/form-data" id="fontuploadform" >
                            <div class="form-group mt-5">
                                <div class="input-group">
                                    <input type="file" class="form-control" id="oe-fontupload-file" name="oe-fontupload-file" required />
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-primary disabled" name="oe-fontupload-submit" id="oe-fontupload-submit">Upload</button>
                    <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
                </div>
            </div>
        </div>
    </div>

    <div class="modal" role="dialog" id="oe-font-delete-dialog">
        <div class="modal-dialog modal-lg" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                    <h4 class="modal-title">Delete Font</h4>
                </div>
                <div class="modal-body">
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-danger" id="oe-font-delete-dialog-do-delete" disabled>Delete</button>
                    <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
                </div>
            </div>
        </div>
    </div>

    <div class="modal" role="dialog" id="fontinstalldialog">
        <div class="modal-dialog modal-lg" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                    <h4 class="modal-title">Install Font from dafont.com</h4>
                </div>
                <div class="modal-body">
                    <div class="alert alert-success mt-1" role="alert" id="oe-fontinstalldialog-info">
                        <strong>Note:</strong> Browse to the font page on dafont.com then copy and paste the url into the input field below.
                    </div>
                    <div class="alert alert-danger hidden mt-1" role="alert" id="oe-fontinstalldialog-missing">
                        <strong>ERROR:</strong> Unable to install the requested font. Please check the URL.
                    </div>
                    <div class="alert alert-danger hidden mt-1" role="alert" id="oe-fontinstalldialog-dl-error">
                        <strong>ERROR:</strong> The URL is valid but unable to download the font. Please refer to the Allsky documentation.
                    </div>                       
                    <form role="form">
                        <div class="form-group">
                            <input type="url" class="form-control mt-3" id="oe-fontinstalldialog-url" placeholder="https://www.dafont.com/led-sled.font">
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <a class="btn btn-primary pull-left" href="https://dafont.com" target="_blank">dafont.com <i class="fa-solid fa-arrow-up-right-from-square"></i></a>
                    <button type="button" class="btn btn-success" name="oe-fontinstalldialog-install" id="oe-fontinstalldialog-install" disabled>Install</button>
                    <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
                </div>
            </div>
        </div>
    </div>

    <?php
}
    ?>
