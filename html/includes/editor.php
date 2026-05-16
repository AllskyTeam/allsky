<?php

if (basename(__FILE__) === basename($_SERVER['SCRIPT_FILENAME'])) {
    include_once('functions.php');
    redirect("/index.php");
}

include_once(__DIR__ . '/uiutil.php');

class AllskyEditorPage
{
    private $status;
    private array $files = [];
    private array $fileStatuses = [];
    private string $initialContent = "";
    private string $initialKey = "";
    private ?array $initialSchema = null;
    private string $initialSchemaFileName = "";

    public function display(): void
    {
        global $pageHeaderTitle, $pageIcon, $pageHelp;

        $this->status = new StatusMessages();
        $this->loadFiles();
        $numFiles = count($this->files);

        if ($numFiles > 0) {
            $this->renderConfigData();
        }
        ?>

        <div class="row">
            <div class="col-lg-12">
                <div class="panel panel-allsky">
                    <div class="panel-heading clearfix">
                        <span><i class="<?php echo $pageIcon ?>"></i> <?php echo $pageHeaderTitle ?></span>
                        <?php if (!empty($pageHelp)) { doHelpLink($pageHelp); } ?>
                    </div>
                    <div class="panel-body">
                        <?php if ($numFiles > 0) { $this->renderEditorToolbar(); } ?>
                        <p id="editor-messages"><?php $this->status->showMessages(); ?></p>
                        <p id="need-to-update"></p> <p id="file-corruption"></p>
                        <div id="editor-source-only">
                            <div id="editorContainer"></div>
                        </div>
                        <div id="editor-tabs" class="as-editor-tabs" style="display:none;">
                            <ul class="nav nav-tabs" role="tablist">
                                <li role="presentation" class="active">
                                    <a href="#editor-form-pane" id="editor-form-tab" role="tab" aria-controls="editor-form-pane">Simple</a>
                                </li>
                                <li role="presentation">
                                    <a href="#editor-source-pane" id="editor-source-tab" role="tab" aria-controls="editor-source-pane">Advanced</a>
                                </li>
                            </ul>
                            <div class="tab-content">
                                <div role="tabpanel" class="tab-pane active" id="editor-form-pane">
                                    <div id="jedisonContainer"></div>
                                </div>
                                <div role="tabpanel" class="tab-pane" id="editor-source-pane"></div>
                            </div>
                        </div>
                        <?php if ($numFiles === 0) { ?>
                            <div class="editorBottomSection">
                                <?php $this->renderNoFilesMessage(); ?>
                            </div>
                        <?php } ?>
                    </div>
                </div>
            </div>
        </div>
        <div class="modal fade as-editor-save-modal" id="as-editor-save-modal" tabindex="-1" role="dialog" aria-labelledby="as-editor-save-modal-title">
            <div class="modal-dialog" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                        <h4 class="modal-title">
                            <i id="as-editor-save-modal-icon" class="fa-solid fa-circle-check" aria-hidden="true"></i>
                            <span id="as-editor-save-modal-title">File Saved</span>
                        </h4>
                    </div>
                    <div class="modal-body">
                        <div id="as-editor-save-modal-message" class="as-editor-save-modal-message" aria-live="polite"></div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        </div>
        <?php
    }

    private function loadFiles(): void
    {
        try {
            $configuredFiles = UIUTIL::readEditorFilesConfig(true);
        } catch (RuntimeException $e) {
            $this->status->addMessage($e->getMessage(), 'danger');
            return;
        }

        foreach ($configuredFiles as $key => $file) {
            if (!$file['ok']) {
                $this->addConfiguredMessages($file, 'unavailable');
                continue;
            }

            if (!UIUTIL::isEditorFileIncluded($file)) {
                $this->addConfiguredMessages($file, 'excluded');
                continue;
            }

            $this->addConfiguredMessages($file, 'available');

            if (!$file['writable']) {
                $msg = "<code>" . htmlspecialchars($file['label'], ENT_QUOTES, 'UTF-8') . "</code>";
                $msg .= " is readable but not writable by the web server.";
                $this->status->addMessage($msg, 'warning');
            }

            $this->files[$key] = $file;
        }

        if (count($this->files) === 0) {
            return;
        }

        $firstKey = array_key_first($this->files);
        if (!is_string($firstKey)) {
            return;
        }

        $this->initialKey = $firstKey;
        $this->loadInitialContent($firstKey);
    }

    private function addConfiguredMessages(array $file, string $context): void
    {
        foreach (UIUTIL::getEditorFileMessages($file, $context) as $message) {
            $this->status->addMessage($message['message'], $message['severity']);
        }
    }

    private function loadInitialContent(string $key): void
    {
        try {
            $file = UIUTIL::readEditorFileByKey($key);
            $this->initialContent = (string)$file['content'];
            $this->fileStatuses[$key] = (bool)$file['validJson'];
            $this->initialSchema = is_array($file['schema'] ?? null) ? $file['schema'] : null;
            $this->initialSchemaFileName = (string)($file['schemaFileName'] ?? '');
            if (isset($this->files[$key])) {
                $this->files[$key]['hasSchema'] = (bool)($file['hasSchema'] ?? false);
                $this->files[$key]['schemaFileName'] = (string)($file['schemaFileName'] ?? '');
                $this->files[$key]['schemaError'] = (string)($file['schemaError'] ?? '');
            }
        } catch (RuntimeException $e) {
            $this->initialContent = "";
            $this->fileStatuses[$key] = false;
            $this->initialSchema = null;
            $this->initialSchemaFileName = "";
            $this->status->addMessage($e->getMessage(), 'warning');
        }

        foreach ($this->files as $fileKey => $file) {
            if (!array_key_exists($fileKey, $this->fileStatuses)) {
                $this->fileStatuses[$fileKey] = true;
            }
        }
    }

    private function renderConfigData(): void
    {
        $files = [];
        foreach ($this->files as $file) {
            $files[] = [
                'key' => $file['key'],
                'label' => $file['label'],
                'fileName' => $file['fileName'],
                'validateJson' => $file['validateJson'],
                'hasSchema' => $file['hasSchema'],
                'schemaFileName' => $file['schemaFileName'],
                'schemaError' => $file['schemaError'],
            ];
        }

        $config = json_encode(
            [
                'files' => $files,
                'fileStatuses' => $this->fileStatuses,
                'initialKey' => $this->initialKey,
                'initialSchema' => $this->initialSchema,
                'initialSchemaFileName' => $this->initialSchemaFileName,
                'needToUpdate' => ALLSKY_NEED_TO_UPDATE,
                'initialContent' => $this->initialContent
            ],
            JSON_HEX_TAG|JSON_HEX_APOS|JSON_HEX_QUOT|JSON_HEX_AMP|JSON_UNESCAPED_SLASHES
        );
        if (!is_string($config)) {
            $config = "{}";
        }
        ?>
        <template id="allsky-editor-config"><?php echo htmlspecialchars($config, ENT_NOQUOTES, 'UTF-8'); ?></template>
        <?php
    }

    private function renderNoFilesMessage(): void
    {
        ?>
        <div id="as-editor-overlay" class="as-overlay big">
            <div class="center-full">
                <div class="center-paragraph">
                    <h1>There are no files to edit</h1>
                    <p>No configuration files could be found to edit.</p>
                </div>
            </div>
        </div>
        <?php
    }

    private function renderEditorToolbar(): void
    {
        CSRFToken();
        ?>
        <nav class="navbar navbar-default as-editor-toolbar">
            <div class="container-fluid-old">
                <div class="navbar-header">
                    <button type="button" class="navbar-toggle collapsed pull-left" style="margin-left: 15px;" data-toggle="collapse" data-target="#as-file-editor-navbar">
                        <span class="sr-only">Toggle navigation</span>
                        <span class="icon-bar"></span>
                        <span class="icon-bar"></span>
                        <span class="icon-bar"></span>
                    </button>
                </div>
                <div class="collapse navbar-collapse" id="as-file-editor-navbar">
                    <ul class="nav navbar-nav" id="as-file-editor-toolbar">
                        <li>
                            <div class="btn navbar-btn" id="save_file" data-toggle="tooltip" data-container="body" data-placement="top" title="Save Changes" aria-label="Save Changes" aria-disabled="false">
                                <i class="fa-solid fa-floppy-disk"></i>
                            </div>
                        </li>
                        <li class="as-editor-file-toolbar-item">
                            <form id="as-editor-file-form" class="navbar-form">
                                <div class="form-group">
                                    <div class="tooltip-wrapper" data-toggle="tooltip" data-container="body" data-placement="top" title="Pick a file">
                                        <label class="sr-only" for="script_path">File</label>
                                        <select class="form-control as-editor-file-select" id="script_path" name="script_path">
                                            <?php
                                            foreach ($this->files as $key => $file) {
                                                $selected = $key === $this->initialKey ? " selected" : "";
                                                echo "<option value='" . htmlspecialchars($key, ENT_QUOTES, 'UTF-8') . "'$selected>";
                                                echo htmlspecialchars($file['label'], ENT_QUOTES, 'UTF-8');
                                                echo "</option>\n";
                                            }
                                            ?>
                                        </select>
                                    </div>
                                </div>
                            </form>
                        </li>
                        <li class="dropdown">
                            <div class="btn navbar-btn dropdown-toggle" id="as-editor-toggle-fields" data-toggle="dropdown" data-container="body" title="Field display" aria-label="Field display" aria-disabled="true">
                                <span id="as-editor-toggle-fields-label">Show required</span> <span class="caret"></span>
                            </div>
                            <ul class="dropdown-menu" id="as-editor-field-mode-menu">
                                <li><a href="#" class="as-editor-field-mode" data-show-all="true">Show All</a></li>
                                <li><a href="#" class="as-editor-field-mode" data-show-all="false">Show required</a></li>
                            </ul>
                        </li>
                    </ul>
                </div>
	            </div>
	        </nav>
        <?php
    }
}

function DisplayEditor()
{
    $editor = new AllskyEditorPage();
    $editor->display();
}
?>
