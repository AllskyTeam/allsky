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

	// if $escape is true, escape single quotes.
	public function showMessages($clear=true, $escape=false) {
		if ($escape === true)
			// We can't have any single quotes in the output.
			$apos = "&apos;";
		else
			$apos = "'";

		$count = 0;
		foreach($this->messages as $message) {
			if ($count === 0)
				echo "<table width=$apos" . "100%$apos>";

			if ($count++ >= 1) {
				// space between messages
				echo "<tr style=$apos" . "height: 5px$apos><td></td></tr>";
			}
			if ($escape === true)
				$message = str_replace("'", "&apos;", $message);
			echo $message;
		}

		if ($count > 0) echo "</table>";

		if ( $clear ) $this->messages = array();
	}

	public function isMessage() {
		$c = 0;
		if (count($this->messages, $c) === 0)
			return(false);
		else
			return(true);
	}
}
?>
