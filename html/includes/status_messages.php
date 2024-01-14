<?php
class StatusMessages {
	public $messages = array();

	public function addMessage($message, $level='success', $dismissable=true) {
		$status = "<tr class='alert alert-$level'><td>$message</td>";
		if ($dismissable) {
			$status .= "<td class='alert-dismissable'>";
			$status .= "<button type='button' class='close' data-dismiss='alert' aria-hidden='true'>x</button>";
			$status .= "</td>";
		} else {
			$status .= "<td></td>";
		}
		$status .= "</tr>";

		array_push($this->messages, $status);
	}


	// If $escape is true, escape single quotes.
	// If $highlight is true, hightlight the groups of messages (often only error message(s)).

	public function showMessages($clear=true, $escape=false, $highlight=false) {
		if ($escape === true)
			// We can't have any single quotes in the output.
			$apos = "&apos;";
		else
			$apos = "'";

		$count = 0;
		$x = "";
		foreach($this->messages as $message) {
			$count++;
			if ($count === 1) {
				if ($highlight) {
					$x .= " style=$apos" . "border: 3px dashed black; margin-top: 20px;$apos";
				} else {
					$x = "";
				}
				echo "<table width=$apos" . "100%$apos $x>";
				if ($highlight) {
					echo "<tr class=$apos alert-danger$apos style=$apos" . "height: 1em;$apos>";
					echo "<td colspan=$apos" . "2$apos></td>";
					echo "</tr>";
				}
			}

			if ($count >= 2) {
				// space between messages
				echo "<tr style=$apos" . "height: 5px$apos><td></td></tr>";
			}

			if ($escape === true)
				$message = str_replace("'", "&apos;", $message);


			// Replace newlines with HTML breaks.
			echo str_replace("\n", "<br>", $message);
		}

		if ($count > 0) {
			if ($highlight) {
				echo "<tr class=$apos alert-danger$apos style=$apos" . "height: 1em;$apos>";
				echo "<td colspan=$apos" . "2$apos></td>";
				echo "</tr>";
			}
			echo "</table>";
		}

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
