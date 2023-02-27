<?php
class StatusMessages {
	public $messages = array();

	public function addMessage($message, $level='success', $dismissable=true) {
		$status = "<tr class='alert alert-$level'><td>$message</td>";
		if ($dismissable)
			$status .= "<td class='alert-dismissable'><button type='button' class='close' data-dismiss='alert' aria-hidden='true'>x</button></td>";
		else
			$status .= "<td></td>";
		$status .= "</tr>";

		array_push($this->messages, $status);
	}

	public function showMessages($clear=true, $escape=false) {
		$count = 0;
		echo "<table width='100%'>";
		foreach($this->messages as $message) {
			if ($count++ >= 1) {
				echo "<tr style='height: 5px'><td></td></tr>";		// space between messages
			}
			if ($escape === true)
				$message = str_replace("'", "&apos;", $message);
			echo $message;
		}
		echo "</table>";
		if ( $clear ) $this->messages = array();
	}
}
?>
