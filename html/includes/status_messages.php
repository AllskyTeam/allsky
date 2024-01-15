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
		if ($escape === true) {
			// We can't have any single quotes in the output.
			$apos = "&apos;";
			$nl = "";
			$tab = "";
		} else {
			$apos = "'";
			$nl = "\n";
			$tab = "\t";
		}

		$count = 0;
		foreach($this->messages as $message) {
			$count++;
			if ($count === 1) {
				if ($highlight) {
					$class = "class=${apos}highlightedBox${apos}";
				} else {
					$class = "";
				}
				echo "$nl<div $class><table width=${apos}100%${apos}>";
			}

			if ($count >= 2) {
				// space between messages
				echo "$nl$tab<tr style=${apos}height: 10px${apos}><td></td></tr>";
			}

			if ($escape === true)
				$message = str_replace("'", "&apos;", $message);


			// Replace newlines with HTML breaks.
			$message = str_replace("\n", "<br>", $message);
			echo "$nl$tab$message";
		}

		if ($count > 0) {
			echo "$nl</table></div>";
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
