<?php
function renderlive_view($twig)
{
	global $image_name, $delay, $daydelay, $daydelay_postMsg, $nightdelay, $nightdelay_postMsg, $darkframe, $showUpdatedMessage;

	$myStatus = new StatusMessages();

	if ($darkframe) {
		$myStatus->addMessage('Currently capturing dark frames. You can turn this off in the Allsky Settings page.', 'danger');
	} else if ($showUpdatedMessage) {
		$s = number_format($daydelay);
		$msg = "Daytime images updated every $s seconds$daydelay_postMsg,";
		$s = number_format($nightdelay);
		$msg .= " nighttime every $s seconds$nightdelay_postMsg";
		$myStatus->addMessage("$msg", "success", true, "fa-solid fa-circle-info");
	}

	$messages = "";
	if ($myStatus->isMessage()) {
		$messages = $myStatus->getMessages();
	}

	return $twig->render('pages/live_view/page.twig', [
		'image_name' => $image_name,
		'delay' => $delay,
		"messages" => $messages
	]);
}
?>