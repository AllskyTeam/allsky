<?php
function renderconfiguration($twig) {
    global $settings_array, $status, $useLogin;

	// If $settings_array is null it means we're being called from the Allsky Website,
	// so read the file.
	if ($settings_array === null) {
		$settings_array = readSettingsFile();
	}

	if (isset($_POST['save_settings'])) {
        redirect("index.php?page=configuration");
    }
    
	if (isset($_POST['reset_settings'])) {
        resetSettings();
    }

    $formReadonly = false;

    $options_file = getOptionsFile();
    $errorMsg = "ERROR: Unable to process options file '$options_file'.";
	$options_array = get_decoded_json_file($options_file, true, $errorMsg);

	foreach ($options_array as &$option) {
		$name = $option['name'];
        $default = getVariableOrDefault($option, 'default', "");
        if ($default !== "" && $logicalType === "text") {
            $default = str_replace("'", "&#x27;", $default);
        }

        $s = getVariableOrDefault($option, 'source', null);
        if ($s !== null) {
            if ($formReadonly) {
                // Don't show variables in other files since they
                // may contain private information.
                $option['show'] = false;
                continue;
            }

            $fileName = getFileName($s);
            $source_array = &getSourceArray($fileName);
            if ($source_array === null) {
                $option['show'] = false;
                continue;
            }
            $option['show'] = true;
            $value = getVariableOrDefault($source_array, $name, null);
        } else {
            $option['show'] = true;
            $value = getVariableOrDefault($settings_array, $name, null);
        }
        $option['value'] = $value;
	}

    $options = groupWithoutHeaderTabs($options_array);

    $csrfToken = "";
    if ($useLogin) {
        $csrfToken = $_SESSION['csrf_token'];
    }

    $template = $twig->render('pages/settings/page.twig', [
        "grouped" => $options,
        "readonly" => $formReadonly,
        "csrftoken" => $csrfToken  
	]);

	return array(
		"template" => $template,
        "messages" => $status->getMessages(),        
		"extracss" => array(

		),
		"extrajs" => array(
            "/js/settings.js"
		)
	);

}

function &getSourceArray($file) 
{
	global $status, $debug;

	static $filesContents = array();
	static $lastFile = null;

	$fileName = getFileName($file);
	if ($fileName == "") {
		$errorMsg = "Unable to get file name for '$file'. Some settings will not work.";
		$status->addMessage($msg, 'danger');
		return ("");
	}

	if ($fileName === $lastFile) return($filesContents[$fileName]);

	$lastFile = $fileName;

	if (! isset($filesContents[$fileName])) {
		$errorMsg = "Unable to read source file from $file.";
		$retMsg = "";
		$filesContents[$fileName] = get_decoded_json_file($fileName, true, $errorMsg, $retMsg);
		if ($filesContents[$fileName] === null || $retMsg !== "") {
			$status->addMessage($retMsg, 'danger');
		}
	}
//x echo "<br><pre>return fileName=$fileName: "; var_dump($filesContents); echo "</pre>";
	return $filesContents[$fileName];
}

function groupWithoutHeaderTabs(array $items): array
{
    $groups        = [];
    $currentHeader = null;   // index into $groups
    $currentSub    = null;   // index into $groups[$currentHeader]['subgroups']

    foreach ($items as $item) {

        /* ---------- skip header-tab completely ---------- */
        if ($item['type'] === 'header-tab') {
            continue;                             // ignore
        }

        if (($item['name'] ?? '') === 'XX_END_XX') {
            continue;
        }

        /* ---------- top-level header ---------- */
        if ($item['type'] === 'header') {
            $groups[] = [
                'header'    => $item,
                'subgroups' => []
            ];
            $currentHeader = array_key_last($groups);
            $currentSub    = null;
            continue;
        }

        /* ---------- sub-header ---------- */
        if ($item['type'] === 'header-sub') {
            // ensure parent header exists
            if ($currentHeader === null) {
                $groups[] = [
                    'header'    => [
                        'name'  => 'ungrouped',
                        'label' => 'Ungrouped',
                        'type'  => 'header'
                    ],
                    'subgroups' => []
                ];
                $currentHeader = array_key_last($groups);
            }

            $groups[$currentHeader]['subgroups'][] = [
                'subheader' => $item,
                'fields'    => []
            ];
            $currentSub = array_key_last($groups[$currentHeader]['subgroups']);
            continue;
        }

        /* ---------- field item ---------- */
        // ensure there is a parent header
        if ($currentHeader === null) {
            $groups[] = [
                'header'    => [
                    'name'  => 'ungrouped',
                    'label' => 'Ungrouped',
                    'type'  => 'header'
                ],
                'subgroups' => []
            ];
            $currentHeader = array_key_last($groups);
        }
        // if we haven't seen a sub-header yet under this header,
        // create an anonymous subgroup
        if ($currentSub === null) {
            $groups[$currentHeader]['subgroups'][] = [
                'subheader' => null,
                'fields'    => []
            ];
            $currentSub = 0;
        }

        $groups[$currentHeader]['subgroups'][$currentSub]['fields'][] = $item;
    }

    return $groups;
}

function resetSettings() {
    global $status;

    if (CSRFValidate()) {
        $status->addMessage("Settings reset to default", "success");
    } else {
        $status->addMessage('Unable to reset settings - session timeout', 'danger');
    }

    $status->flash();
    redirect("index.php?page=configuration");        
}