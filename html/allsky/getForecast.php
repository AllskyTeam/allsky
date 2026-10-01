<?php
$url = "https://services.swpc.noaa.gov/text/3-day-forecast.txt";
// Don't want warning messages to go into the web log for things like the server is down.
// We display a message to the user which is sufficient.
error_reporting(E_ALL ^ E_WARNING);
$forecast   = file_get_contents($url);
if ($forecast != "") {
    $stripStart = substr($forecast, strpos($forecast, "00-03UT"));
    $kpTable    = substr($stripStart, 0, strpos($stripStart, "Rationale") -2 );
    $rows       = explode("\n", $kpTable);

    foreach($rows as $row => $data)
    {
        //get row data
        $noBrackets = preg_replace("/\([^)]+\)/","", $data);
        $dataFormatted = preg_replace('!\s+!', ' ', $noBrackets);
        $row_data = explode(' ', $dataFormatted);
        $info[$row]['time']  = $row_data[0];
        $info[$row]['day1']  = $row_data[1];
        $info[$row]['day2']  = $row_data[2];
        $info[$row]['day3']  = $row_data[3];
    }
} else {
	// The calling routine looks for "WARNING" in this field.
	$info[0]['time'] = "WARNING: Unable to get data from '$url'";
}
echo json_encode($info);
?>
