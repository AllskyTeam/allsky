<?php

include_once('functions.php');
initialize_variables();		// sets some variables

include_once('authenticate.php');

class OVERLAYUTIL
{
    private $request;
    private $method;
    private $jsonResponse = false;
    private $overlayPath;
    private $allskyOverlays;
    private $allskyTmp;
    private $allskyStatus;    
    private $cc = "";
    private $excludeVariables = array(
        "\${TEMPERATURE_C}" => array(
            "ccfield" => "hasSensorTemperature",
            "value" => false,
        ),
        "\${TEMPERATURE_F}" => array(
            "ccfield" => "hasSensorTemperature",
            "value" => false,
        )
    );

    public function __construct()
    {
        $this->overlayPath = ALLSKY_OVERLAY;
        $this->allskyOverlays = MY_OVERLAY_TEMPLATES . '/';
        $this->allskyTmp = ALLSKY_HOME . '/tmp';
        $this->allskyStatus = ALLSKY_CONFIG . '/status.json';

        $ccFile = ALLSKY_CONFIG . "/cc.json";
        $ccJson = file_get_contents($ccFile, true);
        $this->cc = json_decode($ccJson, true);
    }

    public function run()
    {
        $this->checkXHRRequest();
        $this->sanitizeRequest();
        $this->runRequest();
    }

    private function checkXHRRequest()
    {
        if (empty($_SERVER['HTTP_X_REQUESTED_WITH']) || strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) != 'xmlhttprequest') {
            $this->send404();
        }
    }

    private function sanitizeRequest()
    {
        $this->request = $_GET['request'];
        $this->method = strtolower($_SERVER['REQUEST_METHOD']);

        $accepts = $_SERVER['HTTP_ACCEPT'];
        if (stripos($accepts, 'application/json') !== false) {
            $this->jsonResponse = true;
        }
    }

    private function send404()
    {
        header('HTTP/1.0 404 Not Found');
        die();
    }

    private function send500()
    {
        header('HTTP/1.0 500 Internal Server Error');
        die();
    }

    private function sendResponse($response = 'ok')
    {
        echo ($response);
        die();
    }

    private function runRequest()
    {
        $action = $this->method . $this->request;
        if (is_callable(array('OVERLAYUTIL', $action))) {
            call_user_func(array($this, $action));
        } else {
            $this->send404();
        }
    }

    private function createThumbnail($sourceImagePath, $destImagePath, $thumbWidth = 90, $thumbHeight = 90, $background = false)
    {
        list($original_width, $original_height, $original_type) = getimagesize($sourceImagePath);
        if ($original_width > $original_height) {
            $new_width = $thumbWidth;
            $new_height = intval($original_height * $new_width / $original_width);
        } else {
            $new_height = $thumbHeight;
            $new_width = intval($original_width * $new_height / $original_height);
        }
        $dest_x = intval(($thumbWidth - $new_width) / 2);
        $dest_y = intval(($thumbHeight - $new_height) / 2);

        if ($original_type === 1) {
            $imgt = "ImageGIF";
            $imgcreatefrom = "ImageCreateFromGIF";
        } else if ($original_type === 2) {
            $imgt = "ImageJPEG";
            $imgcreatefrom = "ImageCreateFromJPEG";
        } else if ($original_type === 3) {
            $imgt = "ImagePNG";
            $imgcreatefrom = "ImageCreateFromPNG";
        } else {
            return false;
        }

        $old_image = $imgcreatefrom($sourceImagePath);
        $new_image = imagecreatetruecolor($thumbWidth, $thumbHeight); // creates new image, but with a black background

        // figuring out the color for the background
        if ($original_type == 1 || $original_type == 2) {
            list($red, $green, $blue) = $background;
            $color = imagecolorallocate($new_image, $red, $green, $blue);
            imagefill($new_image, 0, 0, $color);
            // apply transparent background only if is a png image
        } else if ($original_type == 3) {
            imagealphablending($new_image, false);
            imagesavealpha($new_image, true);
            //imagesavealpha($new_image, TRUE);
            //$color = imagecolorallocatealpha($new_image, 0, 0, 0, 127);
            //imagefill($new_image, 0, 0, $color);
        }

        imagecopyresampled($new_image, $old_image, $dest_x, $dest_y, 0, 0, $new_width, $new_height, $original_width, $original_height);
        $imgt($new_image, $destImagePath);
        return file_exists($destImagePath);
    }

    public function getConfig()
    {
        $fileName = $this->overlayPath . '/config/overlay.json';
        $config = file_get_contents($fileName);
        $this->sendResponse($config);
    }

    public function postConfig()
    {
        $overlayName = $_POST['overlay']['name'];
        $overlayType = $_POST['overlay']['type'];

        if ($overlayType === 'user') {
            $fileName = $this->allskyOverlays . $overlayName;
        } else {
            $fileName = $this->overlayPath . '/config/' . $overlayName;
        }
        $config = $_POST['config'];
        $formattedJSON = json_encode(json_decode($config), JSON_PRETTY_PRINT);
        $bytesWritten = file_put_contents($fileName, $formattedJSON);
        if ($bytesWritten === false) {
            $this->send500();
        } else {
            $this->sendResponse();
        }
    }

    public function getAppConfig($returnResult=false)
    {
        $fileName = $this->overlayPath . '/config/oe-config.json';
        $config = file_get_contents($fileName);
        if ($config === false) {
            $config = '{
                "gridVisible": true,
                "gridSize": 10,
                "gridOpacity": 30,
                "snapBackground": true,
                "addlistpagesize": 20,
                "addfieldopacity": 15,
                "selectfieldopacity": 30,
                "mousewheelzoom": false,
                "backgroundopacity": 40
            }';
        }

        $config = json_decode($config);
        if (!isset($config->overlayErrors)) {
            $config->overlayErrors = true;
        }
        if (!isset($config->overlayErrorsText)) {
            $config->overlayErrorsText = 'Error found; see the WebU';
        }
        $config = json_encode($config);

        if (!$config) {
            $this->sendResponse($config);
        } else {
            $config = json_decode($config);
            return $config;
        }
    }

    public function postAppConfig()
    {
        $fileName = $this->overlayPath . '/config/oe-config.json';
        $settings = $_POST["settings"];
        $formattedJSON = json_encode(json_decode($settings), JSON_PRETTY_PRINT);

        file_put_contents($fileName, $formattedJSON);
        $this->sendResponse();
    }

    private function includeField($field) {
        $result = true;
        if (isset($this->excludeVariables[$field])) {
            $modifier = $this->excludeVariables[$field];
            if (isset($this->cc[$modifier["ccfield"]])) {
                if ($this->cc[$modifier["ccfield"]] == $modifier["value"]) {
                    $result = false;
                }
            }
        }
        return $result;
    }

    public function getData($returnResult=false)
    {
        $fileName = $this->overlayPath . '/config/fields.json';
        $fields = file_get_contents($fileName);
        $systemData = json_decode($fields);

        $fileName = $this->overlayPath . '/config/userfields.json';
        $fields = file_get_contents($fileName);
        $userData = json_decode($fields);

        $counter = 1;
        $mergedFields = array();

        foreach($systemData->data as $systemField) {
            if ($this->includeField($systemField->name)) {
                $field = array(
                    "id" => $counter,
                    "name" => $systemField->name,
                    "description" => $systemField->description,
                    "format" => $systemField->format,
                    "sample" => $systemField->sample,
                    "type" => $systemField->type,
                    "source" => $systemField->source
                );
                array_push($mergedFields, $field);
                $counter++;
            }
        }

        foreach($userData->data as $userField) {

            if ($this->includeField($systemField->name)) {
                $field = array(
                    "id" => $counter,
                    "name" => $userField->name,
                    "description" => $userField->description,
                    "format" => $userField->format,
                    "sample" => $userField->sample,
                    "type" => $userField->type,
                    "source" => $userField->source
                );
                array_push($mergedFields, $field);
                $counter++;
            }
        }

        $fields = array(
            "data" => $mergedFields
        );
        $jsonFields = json_encode($fields);

        if (!$returnResult) {
            $jsonFields = json_encode($fields);
            $this->sendResponse($jsonFields);
        } else {
            return $fields;
        }
    }

    public function postData()
    {
        $fileName = $this->overlayPath . '/config/userfields.json';
        $fields = $_POST["data"];
        $fields = json_decode($fields);

        $userFields = array();
        foreach($fields->data as $fieldData) {
            if ($fieldData->source == "User") {
                $field = array(
                    "id" => 0,
                    "name" => $fieldData->name,
                    "description" => $fieldData->description,
                    "format" => $fieldData->format,
                    "sample" => $fieldData->sample,
                    "type" => $fieldData->type,
                    "source" => $fieldData->source
                );
                array_push($userFields, $field);
            }
        }
        $fields = array(
            "data" => $userFields
        );
        $formattedJSON = json_encode($fields, JSON_PRETTY_PRINT);

        file_put_contents($fileName, $formattedJSON);
        $this->sendResponse();
    }

    public function getOverlayData($returnResult=false) {
        $result = [];
        $fileName = ALLSKY_HOME . '/tmp/overlaydebug.txt';

        if (file_exists($fileName)) {
            $fields = file($fileName);

            if ($fields !== false) {
                $fieldData = [];
                $count = 0;
                foreach ($fields as $field) {
                    $fieldSplit = explode(" ", $field, 2);
                    // Fields that have \n in them will be split and
                    // the line after \n may not have any spaces.
                    // Silently ignore these lines since they aren't errors.

                    // TODO: Whatever creates this file should handle fields with \n.
                    // If the line(s) after the \n have spaces in them,
                    // they will be treated as fields, which they aren't.
                    if (count($fieldSplit) > 1) {
                        $value = trim($fieldSplit[1]);
                        $value = iconv("UTF-8","ISO-8859-1//IGNORE",$value);
                        $value = iconv("ISO-8859-1","UTF-8",$value);
                        if (substr($fieldSplit[0],0,3) == "AS_") {
                            $obj = (object) [
                                'id' => $count,
                                'name' => $fieldSplit[0],
                                'value' => $value
                            ];
                            $fieldData[] = $obj;
                            $count++;
                        }
                    }
                }

                $result['data'] = $fieldData;
            }
        }

        if (!$returnResult) {
            $data = json_encode($result, JSON_PRETTY_PRINT);
            $this->sendResponse($data);
        } else {
            return $result;
        }        
    }

    public function getAutoExposure()
    {
        $data = file_get_contents($this->overlayPath . "/config/autoexposure.json");
        $this->sendResponse($data);
    }

    public function postAutoExposure()
    {
        $data = $_POST["data"];
        $data = json_decode($data);
        if ($data !== null) {
            $data = json_encode($data, JSON_PRETTY_PRINT);
            file_put_contents($this->overlayPath . "/config/autoexposure.json", $data);
            $data = json_decode($data);

            $image = imagecreate($data->stagewidth, $data->stageheight);
            $black = imagecolorallocate($image, 0, 0, 0);
            $white = imagecolorallocate($image, 255, 255, 255);
            imagefill($image, 0, 0, $black);

            imagefilledellipse($image, $data->x, $data->y, $data->xrad * 2, $data->yrad * 2, $white);

            imagepng($image, "../autoexposure.png");
            $this->sendResponse();
        } else {
            $this->send500();
        }
    }

    private function processDebugData() {
        $file = ALLSKY_HOME . "/tmp/overlaydebug.txt";

        $exampleData = array();
        if (is_readable($file)) {
            $rawData = file($file, FILE_IGNORE_NEW_LINES);
            foreach($rawData  as $line) {
                $firstSpace = strpos($line, " ");
                $var = substr($line, 0, $firstSpace);
                $value = ltrim(substr($line, $firstSpace));
                $line = str_replace("  ", "", $line);
                $exampleData[$var] = $value;
            }
        }
        return $exampleData;
    }

    public function getFonts() {

        $count = 1;
        $usableFonts = array(
            'Arial' => array('fontpath' => '/usr/share/fonts/truetype/msttcorefonts/Arial.ttf'),
            'Arial Black' => array('fontpath' => '/usr/share/fonts/truetype/msttcorefonts/Arial_Black.ttf'),
            'Times New Roman' => array('fontpath' => '/usr/share/fonts/truetype/msttcorefonts/Times_New_Roman.ttf'),
            'Courier New' => array('fontpath' => '/usr/share/fonts/truetype/msttcorefonts/cour.ttf'),
            'Verdana' => array('fontpath' => '/usr/share/fonts/truetype/msttcorefonts/Verdana.ttf'),
            'Trebuchet MS' => array('fontpath' => '/usr/share/fonts/truetype/msttcorefonts/trebuc.ttf'),
            'Impact' => array('fontpath' => '/usr/share/fonts/truetype/msttcorefonts/Impact.ttf'),
            'Georgia' => array('fontpath' => '/usr/share/fonts/truetype/msttcorefonts/Georgia.ttf'),
            'Comic Sans MS' => array('fontpath' => '/usr/share/fonts/truetype/msttcorefonts/comic.ttf'),
        );

        foreach ($usableFonts as $fontName => $fontData) {
            $obj = (object) [
                'id' => $count,
                'name' => $fontName,
                'path' => $fontData['fontpath'],
            ];
            $fields[] = $obj;
            $count++;
        }

        $fontDir = $this->overlayPath . '/fonts/';
        $fontList = scandir($fontDir);
        foreach ($fontList as $font) {
            if ($font !== '.' && $font !== '..') {
                $obj = (object) [
                    'id' => $count,
                    'name' => basename($font),
                    'path' => '/fonts/' . $font,
                ];
            }
            $fields[] = $obj;
            $count++;
        }

        $data = array(
            'data' => $fields,
        );

        $data = json_encode($data, JSON_PRETTY_PRINT);
        $this->sendResponse($data);        
    }

    public function postFonts()
    {
        $proceed = true;

        if (isset($_POST['fontURL'])) {
            $fontURL = strtolower($_POST['fontURL']);
            if (substr($fontURL, 0, 23) === "https://www.dafont.com/") {
                $fontName = str_replace("https://www.dafont.com/", "", $fontURL);
                $fontName = str_replace(".font", "", $fontName);
                $fileName = str_replace("-", "_", $fontName);

                $downloadURL = "https://dl.dafont.com/dl/?f=" . $fileName;
                $downloadPath = sys_get_temp_dir() . '/' . $fileName . '.zip';

                if (!file_put_contents($downloadPath, file_get_contents($downloadURL))) {
                    $proceed = false;
                }
            } else {
                $proceed = false;
            }
        } else {
            if (isset($_FILES['fontuploadfile'])) {
                if (is_uploaded_file($_FILES['fontuploadfile']['tmp_name'])) {
                    $downloadPath = $_FILES['fontuploadfile']['tmp_name'];
                } else {
                    die("Error");
                }
            }
        }

        if ($proceed) {
            $saveFolder = $this->overlayPath . "/fonts/";
            $result = array();
            $zipArchive = new ZipArchive();
            $zipArchive->open($downloadPath);
            for ($i = 0; $i < $zipArchive->numFiles; $i++) {
                $stat = $zipArchive->statIndex($i);

                $nameInArchive = $stat['name'];
                $fileInfo = explode('.', $nameInArchive);
                $ext = strtolower(end($fileInfo));

                $validExtenstions = array("ttf", "otf");
                $validSignatures = array("00010000", "4F54544F");

                if (strpos($nameInArchive, "MACOSX") === false) {
                    if (in_array($ext, $validExtenstions)) {
                        $fp = $zipArchive->getStream($nameInArchive);
                        if (!$fp) {
                            exit("failed\n");
                        }

                        $contents = '';
                        while (!feof($fp)) {
                            $contents .= fread($fp, 1024);
                        }
                        fclose($fp);

                        $cleanFileName = basename(str_replace(' ', '', $nameInArchive));
                        $fileName = $saveFolder . $cleanFileName;
                        $sig = substr($contents,0,4);
                        $sig = bin2hex($sig);
                        if (in_array($sig, $validSignatures)) {
                            if ($file = fopen($fileName, 'wb')) {
                                fwrite($file, $contents);
                                fclose($file);

                                $configFileName = $this->overlayPath . '/config/overlay.json';
                                $config = file_get_contents($configFileName);
                                $config = json_decode($config);

                                $fontPath = str_replace($this->overlayPath, "", $fileName);
                                // TODO: Fix hard coded path
                                $obj = (object) [
                                    'fontPath' => $fontPath,
                                ];

                                $key = strtolower(basename($fileName));
                                $key = str_replace($validExtenstions, "", $key);
                                $key = str_replace(".", "", $key);
                                $config->fonts->$key = $obj;
                                $formattedJSON = json_encode($config, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

                                file_put_contents($configFileName, $formattedJSON);

                                $result[] = array(
                                    'key' => $key,
                                    'path' => $fontPath,
                                );
                            } else {
                                die('cant create file ' . $fileName);
                            }
                        } else {
                            $this->send500();
                        }
                    }
                }

            }
            echo (json_encode($result));
        } else {
            die('ERROR');
        }
        die();
    }

    public function deleteFont()
    {
        $fontName = strtolower($_GET['fontName']);
        $fileName = $this->overlayPath . '/overlay.json';
        $config = json_decode(file_get_contents($fileName));

        $fontPath = $this->overlayPath . "/" . $config->fonts->{$fontName}->fontPath;
        unlink($fontPath);
        unset($config->fonts->{$fontName});

        $formattedJSON = json_encode($config, JSON_PRETTY_PRINT);

        if (file_put_contents($fileName, $formattedJSON) !== false) {
            $this->sendResponse();
        } else {
            $this->send500();
        }
    }

    public function postImages()
    {
        $result = false;
        $imageFolder = $this->overlayPath . '/images/';
        $thumbnailFolder = $this->overlayPath . '/imagethumbnails/';

        if (!empty($_FILES)) {
            $tempFile = $_FILES['file']['tmp_name'];
            $targetFile = $imageFolder . $_FILES['file']['name'];
            $result = move_uploaded_file($tempFile, $targetFile);
            if ($result) {
                $thumbnailPath = $thumbnailFolder . $_FILES['file']['name'];
                $this->createThumbnail($targetFile, $thumbnailPath, 90);
            }
        }
        if ($result) {
            $this->sendResponse();
        } else {
            $this->send500();
        }
    }

    public function getImages()
    {
        $validFileTypes = array('png', 'jpg', 'jpeg');

        $baseThumbnailURL = '//' . $_SERVER['SERVER_NAME'] . '/overlay/imagethumbnails';

        $imageThumbnailFolder = $this->overlayPath . "/imagethumbnails";

        $files = array();
        $fh = opendir($imageThumbnailFolder);

        if ($fh) {
            while (($entry = readdir($fh)) !== false) {
                $ext = pathinfo($entry, PATHINFO_EXTENSION);
                if (in_array($ext, $validFileTypes)) {
                    $files[] = array(
                        'filename' => $entry,
                        'thumbnailurl' => $baseThumbnailURL . '/' . $entry,
                    );
                }
            }
        }
        closedir($fh);
        $formattedJSON = json_encode($files);
        $this->sendResponse($formattedJSON);
    }

    public function deleteImage()
    {
        $imageName = strtolower($_GET['imageName']);

        $imageThumbnailFolder = $this->overlayPath . "/imagethumbnails/";
        $imageFolder = $this->overlayPath . "/images/";

        $imagePath = $imageFolder . $imageName;
        $thumbnailPath = $imageThumbnailFolder . $imageName;

        if (is_file($imagePath) && is_file($thumbnailPath)) {
            unlink($imagePath);
            unlink($thumbnailPath);
            $this->sendResponse();
        } else {
            $this->send500();
        }

    }

    public function getFormats()
    {
        $data = file_get_contents($this->overlayPath . "/config/formats.json");
        $this->sendResponse($data);
    }

    public function getConfigs() {
        $result = [];

        $tod = getenv('DAY_OR_NIGHT');
        if ($tod === false) {
            $tod = 'night';
        }
        if ($tod == 'day') {
            $overlayFilename = $this->getSetting('daytimeoverlay');
        } else {
            $overlayFilename = $this->getSetting('nighttimeoverlay');
        }

        $fileName = $this->overlayPath . '/config/' . $overlayFilename;
        if (file_exists($fileName)) {
            $template = file_get_contents($fileName);
        } else {
            $fileName = $this->allskyOverlays . $overlayFilename;
            $template = file_get_contents($fileName);
        }
        $templateData = json_decode($template);      
        $this->fixMetaData($templateData);     
        $result['config'] = $templateData;

        $data = $this->getData(true);
        $result['data'] = $data;

        $data = $this->getOverlayData(true);
        $result['overlaydata'] = $data;        

        $data = $this->getAppConfig(true);
        $result['appconfig'] = $data;        
        
        $result = json_encode($result);
        $this->sendResponse($result);
    }

    public function getLoadOverlay($overlayName=null, $return=false) {
        if ($overlayName === null) {
            $overlayName = $_GET['overlay'];
        }
        $fileName = $this->overlayPath . '/config/' . $overlayName;

        if (file_exists($fileName)) {
            $overlay = file_get_contents($fileName);
        } else {
            $fileName = $this->allskyOverlays . $overlayName;
            $overlay = file_get_contents($fileName);
        }     

        if (!$return) {
            $this->sendResponse($overlay);
        } else {
            return $overlay;
        }

    }

    private function getSetting($name) {
        global $settings_array;
        $name = getVariableOrDefault($settings_array, $name, 'overlay.json');
        return $name;
    }

    public function getOverlays() {
        $overlayData = [];
        $overlayData['coreoverlays'] = [];
        $overlayData['useroverlays'] = [];
        $overlayData['config'] = [];
        $overlayData['config']['daytime'] = $this->getSetting('daytimeoverlay');
        $overlayData['config']['nighttime'] = $this->getSetting('nighttimeoverlay');
        $overlayData['brands'] = ['RPi', 'ZWO', 'Arducam'];
        $overlayData['brand'] = $this->getSetting('cameratype');
        $overlayData['model'] = $this->getSetting('cameramodel');

        $tod = getenv('DAY_OR_NIGHT');
        if ($tod === false) {
            $tod = 'night';
        }
        $tod = strtolower($tod);
        if ($tod == 'day') {
            $overlayData['current'] = $overlayData['config']['daytime'];
        } else {
            $overlayData['current'] = $overlayData['config']['nighttime'];
        }

        $defaultDir = $this->overlayPath . '/config/';
        $entries = scandir($defaultDir);
        foreach ($entries as $entry) {
            if ($entry !== '.' && $entry !== '..') {
                if (substr($entry,0, 7) === 'overlay') {
                    $templatePath = $defaultDir . $entry;
                    $template = file_get_contents($templatePath);
                    $templateData = json_decode($template);
                    $this->fixMetaData($templateData);
                    if (!isset($templateData->metadata)) {
                        $name = 'Unknown';
                        switch ($entry) {
                            case 'overlay.json':
                                $name = 'Default Overlay';
                                break;

                            case 'overlay-RPi.json':
                                $name = 'Default RPi Overlay';
                                break;

                            case 'overlay-ZWO.json':
                                $name = 'Default ZWO Overlay';
                                break;
                        }
                        $templateData->metadata = [];
                        $templateData->metadata['name'] = $name;
                    }
                    $overlayData['coreoverlays'][$entry] = $templateData;
                    
                }
            }
        }


        $userDir = $this->allskyOverlays;
        $entries = scandir($userDir);
        foreach ($entries as $entry) {
            if ($entry !== '.' && $entry !== '..') {
                if (substr($entry,0, 7) === 'overlay') {
                    $templatePath = $userDir . $entry;
                    if (is_file($templatePath)) {
                        $template = file_get_contents($templatePath);
                        $templateData = json_decode($template);
                        $this->fixMetaData($templateData);
                        $overlayData['useroverlays'][$entry] = $templateData;
                    }
                }
            }
        }

        $settingsFile = ALLSKY_CONFIG . '/settings.json';
        $settings = file_get_contents($settingsFile);
        $settings = json_decode($settings);
        $overlayData['settings'] = $settings;

        $overlayData = json_encode($overlayData);
        $this->sendResponse($overlayData);
    }

    public function getValidateFilename() {
        $fileName = $_GET['filename'];
        $userDir = $this->allskyOverlays;
        $filePath = $userDir . $fileName;
        $fileExists = false;

        if (is_file($filePath)) {
            $fileExists = true;
        }

        $result = [
            'error' => $fileExists
        ];
        $result = json_encode($result);
        $this->sendResponse($result);
    }

    public function getSuggest() {
        $userDir = $this->allskyOverlays;
        $maxFound = 0;

        $entries = scandir($userDir);
        foreach ($entries as $entry) {
            if ($entry !== '.' && $entry !== '..') {
                $entryBits = explode('-', $entry);
                if (count($entryBits) > 0) {
                    if (substr($entryBits[0],0,7) === 'overlay') {
                        $num = intval(substr($entryBits[0],7));
                        if ($num > $maxFound) {
                            $maxFound = $num;
                        }

                    }
                }
            }
        }
        $maxFound++;

        $this->sendResponse($maxFound);        
    }

    public function postNewOverlay() {

        if (!file_exists($this->allskyOverlays)) {
            mkdir($this->allskyOverlays);
        }

        $copyOverlay = $_POST['data']['copy'];
        if ($copyOverlay !== 'none') {
            $newOverlay = $this->getLoadOverlay($copyOverlay, true);
            $newOverlay = json_decode($newOverlay);
        } else {
            $newOverlay = (object)null;
            $this->fixMetaData($newOverlay);
        }

        $newOverlay->metadata = $_POST['fields'];

        if (!isset($newOverlay->fields)) {
            $newOverlay->fields = [];
        }
        if (!isset($newOverlay->images)) {
            $newOverlay->images = [];
        }
        if (!isset($newOverlay->fonts)) {
            $newOverlay->fonts = [
                'moon_phases' => [
                    'fontPath' => 'fonts/moon_phases.ttf'
                ]
            ];
        }
        if (!isset($newOverlay->settings)) {
            $newOverlay->settings = [
                'defaultdatafileexpiry' => '550',
                'defaultincludeplanets' => false,
                'defaultincludesun' => false,
                'defaultincludemoon' => false,
                'defaultimagetopacity' => 0.63,
                'defaultimagerotation' => 0,
                'defaulttextrotation' => 0,
                'defaultfontopacity' => 1,
                'defaultfontcolour' => 'white',
                'defaultfont' => 'Arial',
                'defaultfontsize' => 52,
                'defaultimagescale' => 1,
                'defaultnoradids' => ''                
            ];
        }            
                
        $newOverlay = json_encode($newOverlay, JSON_PRETTY_PRINT);

        $overlayFile = $this->allskyOverlays . $_POST['data']['filename'] . '.json';
        file_put_contents($overlayFile, $newOverlay);
        chmod($overlayFile, 0775);
        $this->sendResponse();
    }

    public function getDeleteOverlay() {
        $fileName = $_GET['filename'];        
        $overlayFile = $this->allskyOverlays . $fileName;
        if (file_exists($overlayFile)) {
            unlink($overlayFile);
        }
        $this->sendResponse();
    }

    public function postSaveSettings() {
        $dayTime = $_POST['daytime'];
        $nightTime = $_POST['nighttime'];

        $settingsFile = getSettingsFile();
        $data = file_get_contents($settingsFile, true);
        $settingsData = json_decode($data, true);
        $settingsData['daytimeoverlay'] = $dayTime;
        $settingsData['nighttimeoverlay'] = $nightTime;

        $mode = JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES|JSON_NUMERIC_CHECK|JSON_PRESERVE_ZERO_FRACTION;
        $data = json_encode($settingsData, $mode);

        $result = file_put_contents($settingsFile, $data);
                
        $this->sendResponse($result);

    }

    private function fixMetaData(&$overlay) {
        if (!isset($overlay->metadata)) {
            $overlay->metadata = (object)null;
        }
        if (!isset($overlay->metadata->name)) {
            $overlay->metadata->name = '???';
        }
        if (!isset($overlay->metadata->camerabrand)) {
            $overlay->metadata->camerabrand = '???';
        }
        if (!isset($overlay->metadata->cameramodel)) {
            $overlay->metadata->cameramodel = '???';
        }
        if (!isset($overlay->metadata->tod)) {
            $overlay->metadata->tod = 'both';
        }
    }

    public function getOverlayList() {
        
        $overlays = [];

        $defaultDir = $this->overlayPath . '/config/';
        $entries = scandir($defaultDir);
        foreach ($entries as $entry) {
            if ($entry !== '.' && $entry !== '..') {
                if (substr($entry,0, 7) === 'overlay') {
                    $templatePath = $defaultDir . $entry;
                    $template = file_get_contents($templatePath);
                    $templateData = json_decode($template);
                    $this->fixMetaData($templateData);
                    $overlays[] = [
                        'type' => 'Allsky',
                        'name' => $templateData->metadata->name,
                        'brand' => $templateData->metadata->camerabrand,
                        'model' => $templateData->metadata->cameramodel,
                        'tod' => $templateData->metadata->tod,
                        'filename' => $entry
                    ];
                }
            }
        }

        $userDir = $this->allskyOverlays;
        $entries = scandir($userDir);
        foreach ($entries as $entry) {
            if ($entry !== '.' && $entry !== '..') {
                if (substr($entry,0, 7) === 'overlay') {
                    $templatePath = $userDir . $entry;
                    $template = file_get_contents($templatePath);
                    $templateData = json_decode($template);
                    $this->fixMetaData($templateData);
                    $overlays[] = [
                        'type' => 'User',
                        'name' => $templateData->metadata->name,
                        'brand' => $templateData->metadata->camerabrand,
                        'model' => $templateData->metadata->cameramodel,
                        'tod' => $templateData->metadata->tod,
                        'filename' => $entry
                    ];
                }
            }
        }

        $data = array(
            'data' => $overlays
        );
        
        $data = json_encode($data, JSON_PRETTY_PRINT);
        $this->sendResponse($data);            
    }

    public function getStatus() {
        $running = [
            'running' => true,
            'status' => 'Unknown'
        ];
        if (is_file($this->allskyStatus)) {
            try {
                $statusTxt = file_get_contents($this->allskyStatus, true);
                $status = json_decode($statusTxt, true);
                if ($status !== null) {
                    if (isset($status['status'])) {
                        $running['status'] = $status['status'];
                        if (strtolower($status['status']) != 'running') {
                            $running['running'] = false;
                        }
                    }
                }
            } catch(Exception $e) {
            }
        }

        $this->sendResponse(json_encode($running));
    }
}

$overlayUtil = new OVERLAYUTIL();
$overlayUtil->run();
