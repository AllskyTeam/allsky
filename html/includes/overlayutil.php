<?php

include_once('functions.php');
initialize_variables();		// sets some variables

define('RASPI_ADMIN_DETAILS', RASPI_CONFIG . '/raspap.auth');

include_once('authenticate.php');

class OVERLAYUTIL
{
    private $request;
    private $method;
    private $jsonResponse = false;
    private $overlayPath;
    private $allskyTmp;
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
        $this->allskyTmp = ALLSKY_HOME . '/tmp';

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
        $fileName = $this->overlayPath . '/config/overlay.json';
        $config = $_POST["config"];
        $formattedJSON = json_encode(json_decode($config), JSON_PRETTY_PRINT);
        $bytesWritten = file_put_contents($fileName, $formattedJSON);
        if ($bytesWritten === false) {
            $this->send500();
        } else {
            $this->sendResponse();
        }
    }

    public function getAppConfig()
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
        $this->sendResponse($config);
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

    public function getData()
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

        $this->sendResponse($jsonFields);
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

    public function getOverlayData() {
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
        $data = json_encode($result, JSON_PRETTY_PRINT);
        $this->sendResponse($data);
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

    public function getFonts()
    {
        $fileName = $this->overlayPath . '/config/overlay.json';
        $config = file_get_contents($fileName);
        $config = json_decode($config);

        $fields = [];
        $count = 1;
        foreach ($config->fonts as $name => $font) {
            $obj = (object) [
                'id' => $count,
                'name' => $name,
                'path' => $font->fontPath,
            ];
            $fields[] = $obj;
            $count++;
        }

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

}

$overlayUtil = new OVERLAYUTIL();
$overlayUtil->run();
