// loadXMLDoc
//
// Retrieve XML document (reusable generic function). Parameter is URL string
// (relative or complete) to an .xml file whose Content-Type is a valid XML
// type, such as text/xml; XML source must be from same domain as HTML file.
//
// Expanded by CS to branch to a function returned by the XML, thus making this
// routine extremely reusable.
//
// Many thanks to the following article:
// http://developer.apple.com/internet/webcontent/xmlhttpreq.html

function loadXMLDoc(url) {

	// we use a javascript feature here called "inner functions"
	// using these means the local variables retain their values after the outer function
	// has returned. this is useful for thread safety, so 
	// reassigning the onreadystatechange function doesn't stomp over earlier requests.
	// Adapted from http://www.xml.com/cs/user/view/cs_msg/2815

  function ajaxHandle() {
		// Is the request loaded?
		if (req.readyState == 4) {
			// Is the response 200, or "OK"?"
			if (req.status == 200) {
				// Is the data loaded actually XML?
				if (req.responseXML) {
					// This is where we branch based on what was returned
					response = req.responseXML.documentElement;
					call = response.getElementsByTagName("function")[0].firstChild.data;
					if (call == "") {
						alert("XML did not return a function to call.");
					} else {
						// Call the function returned
						eval(call+'(response)');
					}
				} else {
					alert("There was a problem retrieving the XML data:\n" + req.statusText);
				}
			}
		}
	}
	
	var req = null; 

	// branch for native XMLHttpRequest object

	if (window.XMLHttpRequest) {
		req = new XMLHttpRequest();
		req.onreadystatechange = ajaxHandle;
    req.open("GET", url, true);
		req.send(null);
	} else if (window.ActiveXObject) {
	  isItIE = true;
	  req = new ActiveXObject("Microsoft.XMLHTTP");
		req.onreadystatechange = ajaxHandle;
    req.open("GET", url, true);
		req.send();
	}
	
}


