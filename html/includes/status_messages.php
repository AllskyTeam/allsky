<?php
if (basename(__FILE__) === basename($_SERVER['SCRIPT_FILENAME'])) {
    include_once('functions.php');
    redirect("/index.php");
}

class StatusMessages {
	public $messages = array();

	public function addMessage($message, $level='success', $dismissable=false) {		
		$dismissableButton = '';
		$dismissablClass = '';
		if ($dismissable) {
			$dismissablClass = 'alert-dismissible';
			$dismissableButton = "<button type='button' class='close' data-dismiss='alert'><span aria-hidden='true'>&times;</span></button>";
		}		
		$status = "<div class='alert alert-$level $dismissablClass' role='alert'>$dismissableButton <div class='alert-text'>$message</div></div>";

		array_push($this->messages, $status);
	}


	// If $escape is true, escape single quotes.
	public function showMessages($clear=true, $escape=false) {

		if ($this->isMessage()) {
			foreach($this->messages as $message) {
				if ($escape === true)
					$message = str_replace("'", "&apos;", $message);

				$message = str_replace("\n", "<br>", $message);

				echo $message;
			}

			if ($clear) {
				$this->messages = array();
			}
		}
	}

	public function isMessage() {
		$c = 0;
		if (count($this->messages, $c) === 0)
			return(false);
		else
			return(true);
	}

	public function reset() {
		$this->messages = array();
	}

	public function count() {
		return count($this->messages);
	}

	public function get() {
		return $this->messages;
	}
}
?>
