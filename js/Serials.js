// Panic Serial Sender
// (C) 2007 Panic, Inc. / Cabel Sasser
// This one is gray. Migrate to XMlHttpRequest soon.
//
// All Rights Reserved. Must not be reproduced without express written permission of Panic, INc.

var serverConfig = {};
var host = window.location.hostname;

if (host === 'panic.vagrant.panic.com') {
  serverConfig.circleHost = 'circle.vagrant.panic.com';
  serverConfig.returnHost = 'panic.vagrant.panic.com';
} else if (host === 'stage.panic.com') {
  serverConfig.circleHost = 'circle-stage.panic.com';
  serverConfig.returnHost = 'stage.panic.com';
} else {
  serverConfig.circleHost = 'circle.panic.com';
  serverConfig.returnHost = 'panic.com';
}


// Precache Spinner (again -- this one is gray)

sn_spinner_on   	= new Image(16,16); sn_spinner_on.src   = "/images-global/spacer.gif";
sn_spinner_on_white = new Image(16,16); sn_spinner_on_white.src = "/images-global/spacer.gif";
sn_spinner_off  	= new Image(16,16); sn_spinner_off.src  = "/images-global/circle-bad.png";
sn_spinner_done 	= new Image(16,16); sn_spinner_done.src = "/images-global/circle-good.png";

// Set the spinner, and change the location of the hidden iFrame element. Poor man's XMLHttpRequest!

function serialSend() {
  document.images["serial-spinner"].src = sn_spinner_on.src;
  tempName = document.serial.email.value;
  tempStor = document.serial.pod_storeName.value;
  tempLang = document.serial.pod_language.value;

  document.getElementById('serialSubmit').src = '/pod-bin/serial.php?format=inline&pod_storeName='+tempStor+'&pod_language='+tempLang+'&email='+encodeURIComponent(tempName);

}

// Serials done -- Function called by the HTML loaded into the iFrame, once complete.

function serialDone(respMsg) {

  // Turn off the spinner, we're done processing

  document.images["serial-spinner"].src = sn_spinner_off.src;

  // Handle the response

  if (respMsg != "OK") {
    // Display an error, if returned
    alert(respMsg);
  } else {
    // Display a success graphic
    document.images["serial-spinner"].src = sn_spinner_done.src;
    // document.serial.email.value = "Serials Sent";
    // document.serial.email.style.color = "#777777";

    if (document.serial.pod_language.value == "jp") {
      document.serial.finish.value = "���M����";
    } else {
      document.serial.finish.value = "Serials Sent";
    }
    document.serial.finish.disabled = true;
  }

  // Clear out the iframe (in case of page reloads, etc.)

  document.getElementById('serialSubmit').src = '/global/blank.html';
}


// -- AJAX Version --

function ajax_serialSendStateChange()
{
	if ( this.readyState == 4 )
	{
		// Turn off the spinner, we're done processing

		document.images["serial-spinner"].src = sn_spinner_off.src;

		// Handle the response

		if (this.responseText != "OK") {
		// Display an error, if returned
		alert(this.responseText);
		} else {
		// Display a success graphic
		document.images["serial-spinner"].src = sn_spinner_done.src;
		document.serial.classList.toggle("sent");
		// document.serial.email.value = "Serials Sent";
		// document.serial.email.style.color = "#777777";

		if (document.serial.pod_language.value == "jp") {
		  document.serial.finish.value = "���M����";
		} else {
		  document.serial.finish.value = "Serials Sent";
		}
		document.serial.finish.disabled = true;
		}
	}
};

function ajax_serialSend(spinnerSrc)
{
	if ( spinnerSrc == "white" )
		document.images["serial-spinner"].src = sn_spinner_on_white.src;
	else
		document.images["serial-spinner"].src = sn_spinner_on.src;

	tempName = document.serial.email.value;
	tempStor = document.serial.pod_storeName.value;
	tempLang = document.serial.pod_language.value;

	var url = '/pod-bin/serial.php?format=ajax&pod_storeName=' + tempStor + '&pod_language=' + tempLang + '&email=' + encodeURIComponent(tempName);
	var req = new XMLHttpRequest();

	req.onreadystatechange = ajax_serialSendStateChange.bind(req);
	req.open("GET", url, true);
	req.send(null);
}

function ajax_serialSendCircle(spinnerSrc)
{
  if ( spinnerSrc == "white" )
    document.images["serial-spinner"].src = sn_spinner_on_white.src;
  else
    document.images["serial-spinner"].src = sn_spinner_on.src;

  email = document.serial.email.value;

  // tempStor = document.serial.pod_storeName.value;
  // tempLang = document.serial.pod_language.value;

  var url = 'https://' + serverConfig.circleHost + '/api/v1/get_serials/';
  var req = new XMLHttpRequest();
  req.onreadystatechange = ajax_serialSendStateChangeCircle.bind(req);
  req.open("POST", url, true);
  req.setRequestHeader("Content-Type", "application/json");
  req.send(JSON.stringify({email:email}));
}

function ajax_serialSendStateChangeCircle()
{
	if ( this.readyState == 4 )
	{
		// Turn off the spinner, we're done processing

		document.images["serial-spinner"].src = sn_spinner_off.src;

		// Handle the response
    var jsonResponse = JSON.parse(this.responseText);

		if (jsonResponse["status"] != "OK") {
  		// Display an error, if returned
  		alert("Sorry, invalid email! Try again?");
		} else {
  		// Display a success graphic
  		document.images["serial-spinner"].src = sn_spinner_done.src;
  		document.serial.classList.toggle("sent");
  		// document.serial.email.value = "Serials Sent";
  		// document.serial.email.style.color = "#777777";

  		if (document.serial.pod_language.value == "jp") {
  		  document.serial.finish.value = "���M����";
  		} else {
  		  document.serial.finish.value = "Serials Sent";
  		}
  		document.serial.finish.disabled = true;
		}
	}
};
