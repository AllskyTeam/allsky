<?php

include_once('functions.php');
initialize_variables();		// sets some variables

define('RASPI_ADMIN_DETAILS', RASPI_CONFIG . '/raspap.auth');

include_once('raspap.php');
include_once('authenticate.php');

class DATAUTIL
{
    private $request;
    private $method;
    private $jsonResponse = false;
    private $overlayPath;
    private $allskyTmp;

    private $database = 'allsky.db';

    public function __construct()
    {
        $this->overlayPath = ALLSKY_CONFIG;
        $this->allskyTmp = ALLSKY_HOME . '/tmp';
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

        if (is_callable(array('DATAUTIL', $action))) {
            call_user_func(array($this, $action));
        } else {
            $this->send404();
        }
    }

    private function haveDatabase() {
        $result = true;

        try {
            $db = new SQLite3(ALLSKY_HOME . '/' . $this->database);
            $db->close();
        } catch (Exception $ex) {
            $result = false;
        }

        return $result;
    }

    public function getStartup() {

        $haveDatabase = $this->haveDatabase();

        if ($haveDatabase) {
            $cam_type = getCameraType();
            $settings_file = getSettingsFile($cam_type);
            $camera_settings_str = file_get_contents($settings_file, true);
            $camera_settings_array = json_decode($camera_settings_str, true);
            $angle = $camera_settings_array['angle'];
            $lat = $camera_settings_array['latitude'];
            $lon = $camera_settings_array['longitude'];

            $tod = 'Unknown';
            exec("sunwait poll exit set angle $angle $lat $lon", $return, $retval);
            if ($retval == 2) {
                $tod = 'day';
            } else if ($retval == 3) {
                $tod = 'night';
            }

            $overlaySettings = ALLSKY_CONFIG . '/postprocessing_night.json';
            $overlayStr = file_get_contents($overlaySettings, true);
            $overlaySettings = json_decode($overlayStr, true);

            $saveDetailsRunning = false;
            foreach ($overlaySettings as $key=>$module) {
                if (isset($module['module'])) {
                    if ($module['module'] == 'allsky_savedetails.py') {
                        if ($module['enabled']) {
                            $saveDetailsRunning = true;
                        }
                    }
                }
            }

            $db = new SQLite3(ALLSKY_HOME . '/' . $this->database);
            $res = $db->query('SELECT DISTINCT(folder) FROM images');
            $days = [];
            while ($row = $res->fetchArray()) {
                $days[ $row['folder']] = [
                    'text' => ''
                ];
            }   

            $result = [
                'tod' => $tod,
                'saverunning' => $saveDetailsRunning,
                'folders' => $days
            ];

            $this->sendResponse(json_encode($result));
        } else {
            die('jkljlk');
            $this->send404();
        }
    }
    
    public function getLiveData() {
        $db = new SQLite3(ALLSKY_HOME . '/' . $this->database);

        $current = new DateTime();
        $hoursToSubtract = 12;
        $current->sub(new DateInterval("PT{$hoursToSubtract}H"));
        $today = $current->format('Ymd');

        $statement = $db->prepare('SELECT * FROM images WHERE folder = :folder');
        $statement->bindValue(':folder', $today);
        $result = $statement->execute();

        $data = [
            'time' => [],
            'stars' => [],
            'meteors' => [],
            'exposure' => [],
            'gain' => [],
            'skystate' => []                                  
        ];

        $lastHour = -1;
        $count = 0;
        $total = 0;
        while ($row = $result->fetchArray()) {
            if ($row['skystate'] == 'Clear') {
                $time = (string)$row['time'];
                if (strlen($time) < 6) {
                    $time1 = '000000' . $time;
                    $time1 = substr($time1, -6);
                } else {
                    $time1 = $time;
                }
                $hour = (int)substr($time1,0,2);

                if ($lastHour == -1) {
                    $lastHour = $hour;
                }
                if ($hour != $lastHour) {
                    $percentage = ($count / $total) * 100;
                    $data['skystate'][] = [
                        'hour' => $lastHour,
                        'count' => $count,
                        'total' => $total,
                        'percentage' => $percentage                        
                    ];
                    $lastHour = $hour;
                    $count = 0;
                    $total = 0;
                }
                $count++;
            }
            $total++;

            $temp = $row['time'];
            $time = substr($temp,0,2) .':' . substr($temp,2,2) . ':' . substr($temp,4,2);
            $data['time'][] = $time;
            $data['stars'][] = $row['stars'];
            $data['meteors'][] = $row['meteors'];
            $data['exposure'][] = intval($row['exposure']) / 1000000;
            $data['gain'][] = $row['gain'];
            $data['images'][] = 'images/' . $row['folder'] . '/' . $row['filename'];
            $data['thumbnails'][] = 'images/' . $row['folder'] . '/thumbnails/' . $row['filename'];
        }

        $hours = [];
        $skyState = [];
        $percentage = [];
        $total = [];
        foreach ($data['skystate'] as $state) {
            array_push($hours, $state['hour']);
            array_push($skyState, $state['count']);
            array_push($percentage, $state['percentage']);
            array_push($total, $state['total']);            
        }
        $data['hours'] = $hours;
        $data['clearimages'] = $skyState;
        $data['percentageclear'] = $percentage;
        $data['totalimages'] = $total;
        $this->sendResponse(json_encode($data));
    }

    public function getData() {
        $date = $_GET['date'];
        $db = new SQLite3(ALLSKY_HOME . '/' . $this->database);
        $statement = $db->prepare('SELECT * FROM images WHERE folder = :date');
        $statement->bindValue(':date', $date);
        $result = $statement->execute();

        $data = [
            'time' => [],
            'stars' => [],
            'meteors' => [],
            'exposure' => [],
            'gain' => [],
            'skystate' => []                                  
        ];

        $lastHour = -1;
        $count = 0;
        $total = 0;
        while ($row = $result->fetchArray()) {
            if ($row['skystate'] == 'Clear') {
                $time = (string)$row['time'];
                if (strlen($time) < 6) {
                    $time1 = '000000' . $time;
                    $time1 = substr($time1, -6);
                } else {
                    $time1 = $time;
                }
                $hour = (int)substr($time1,0,2);

                if ($lastHour == -1) {
                    $lastHour = $hour;
                }
                if ($hour != $lastHour) {
                    $percentage = ($count / $total) * 100;
                    $data['skystate'][] = [
                        'hour' => $lastHour,
                        'count' => $count,
                        'total' => $total,
                        'percentage' => $percentage                        
                    ];
                    $lastHour = $hour;
                    $count = 0;
                    $total = 0;
                }
                $count++;
            }
            $total++;

            $temp = $row['time'];
            $time = substr($temp,0,2) .':' . substr($temp,2,2) . ':' . substr($temp,4,2);
            $data['time'][] = $time;
            $data['stars'][] = $row['stars'];
            $data['meteors'][] = $row['meteors'];
            $data['exposure'][] = intval($row['exposure']) / 1000000;
            $data['gain'][] = $row['gain'];
            $data['images'][] = 'images/' . $row['folder'] . '/' . $row['filename'];
            $data['thumbnails'][] = 'images/' . $row['folder'] . '/thumbnails/' . $row['filename'];
        }
        $hours = [];
        $skyState = [];
        $percentage = [];
        $total = [];
        foreach ($data['skystate'] as $state) {
            array_push($hours, $state['hour']);
            array_push($skyState, $state['count']);
            array_push($percentage, $state['percentage']);
            array_push($total, $state['total']);            
        }
        $data['hours'] = $hours;
        $data['clearimages'] = $skyState;
        $data['percentageclear'] = $percentage;
        $data['totalimages'] = $total;
        $this->sendResponse(json_encode($data));
    }
}

$dataUtil = new DATAUTIL();
$dataUtil->run();
