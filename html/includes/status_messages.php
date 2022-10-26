<?php
class StatusMessages {
	public $messages = array();

	public function addMessage($message, $level='success', $dismissable=true) {
		$status = "<table class='alert alert-$level' width='100%'><tr><td>$message</td>";
		if ($dismissable) $status .= '<td class="alert-dismissable"><button type="button" class="close" data-dismiss="alert" aria-hidden="true">x</button></td>';
		$status .= "</tr></table>";

		array_push($this->messages, $status);
	}

	public function showMessages($clear = true) {
		foreach($this->messages as $message) {
			echo $message;
		}
		if ( $clear ) $this->messages = array();
	}
}
?>
