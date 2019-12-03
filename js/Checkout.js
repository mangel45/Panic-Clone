// POD Client Order Page Functions v6
// (C) 2010 Panic, Inc.
// Patent Pending
//
// Absolutely not for redistribution.
//
// REQUIRES: XMLrequest.js

spinner_on  = new Image(16,16); spinner_on.src  = "/images-global/spinner.gif";
spinner_off = new Image(16,16); spinner_off.src = "/images-global/spacer.gif";
check_on    = new Image(16,16); check_on.src = "/images-global/checkmark.png";
check_off   = new Image(16,16); check_off.src = "/images-global/spacer.gif";
check_bad   = new Image(16,16); check_bad.src = "/images-global/checkmark-bad.png";

buyDisabled  = new Image(); buyDisabled.src = "/images-global/buy-button-disabled.png";
buyDisabledN = new Image(); buyDisabledN.src = "/images-global/buy-button.png";

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

// Initialize Globals

var totalDiv = "order-total",
	buybuttonDiv = "buy-button",
	submitButton = "submitButton",
	progressbuttonDiv = "progressButton",
	progressbuttonNew = "progressButton-new",
	spinnerImg = "spinner",
	itempriceDivPrefix = "itemprice-",
	priceDivPrefix = "price-",
	quantityLabelSuffix = "-quantitylabel",

	debugging = true,
	handlingCharge = 2.00,

	shippingTotal = 0,
	theTotal      = 0.00,
	boughtThings  = "",
	boughtQty	  = new Array(),
	boughtItem	  = new Array(),
	boughtPrice   = new Array(),
	promoAmount   = 0,
	promoItems    = "",
	promoArray    = new Array(),
	shipArray	  = new Array(),
	shipEstimate  = new Array(),

	currentInfoBoxItem = "",
	currentOpenHere    = "";

// Localizble strings that can be overridden in HTML

shipEstimate[0] = "Immediately";
shipEstimate[5] = "Electronic Delivery";
shipEstimate[20] = "24 Hours";
shipEstimate[40] = "1-3 Business Days";
shipEstimate[60] = "1-2 Weeks";
shipEstimate[80] = "2-3 Weeks";
shipEstimate[100] = "3-4 Weeks";
shipEstimate[120] = "4+ Weeks";

// initializePage()
//
// Initialization function. Called onLoad() to make sure the page looks OK.
// Remember that we can get to this page via the "back" button on an error...

function initializePage() {

	var tempArray, i, currentPromo;

	// Make sure the Shipping Address visibility matches the checkbox state.

	if (document.orderform.useShippingAddress) {
		if (document.orderform.useShippingAddress.checked) {
			document.getElementById('block-shipto').style.display = "";
		} else {
			document.getElementById('block-shipto').style.display = "none";
		}
	}

	// Make sure the PayPal area (if present) visibility matches the radio button state.

	if (document.getElementById("cc-info")) {
		if (document.getElementById("Card").checked ) {
			document.getElementById('cc-info').style.display = "";
		} else {
			document.getElementById('cc-info').style.display = "none";
		}
	}

	// Modify weight settings to match selected pop-ups, if variety pop-ups exist.
	// It's possible to "reload" the browser and have pop-up states remain, but the code refreshes to default

	for (i=0; i < quantityArray.length; i++) {
		if (document.getElementsByName("var_"+quantityArray[i]).length > 0) {
			tempArray = document.getElementsByName("var_"+quantityArray[i])[0].value.split(" ");
			if (tempArray) {
				if (weightArray[i] != tempArray[1]) {
					weightArray[i] = tempArray[1];
				}
			}
		}
	}

	// Calculate Total

	calcTotalNew();

	// Reload shipping information if provided

	if ( typeof(shipType) == 'undefined' )
		shipType = '';

	getShippingRate(shipType);

	// Reload coupon code if provided

	getPromoCode();

	// Set coupon code text box color

	/*
	if (document.getElementById && document.getElementById("promoCode")) {
		currentPromo = document.getElementById("promoCode");
		if (currentPromo.value != "" && currentPromo.value != "optional" && currentPromo.value != "オプション") {
			currentPromo.style.color = '#000000';
		}
	}
	*/

	// If there's a Order Token field (used for duplicate order checking), set it to a UUID

	if (document.getElementById && document.getElementById("pod_orderToken")) {
		if (document.getElementById("pod_orderToken").value == '' ) {
			document.getElementById("pod_orderToken").value = new UUID();
		}
	}

	// Display reseller fields if URL has reseller at the end

	var resellerSearch = /reseller$/g;
	var isReseller = false;

	if ( resellerSearch.exec(document.URL) == 'reseller' )
		isReseller = true;

	if ( isReseller )
	{
		if ( document.getElementById('resellerExplanation') )
			document.getElementById('resellerExplanation').style.display = 'inherit';

		if ( document.getElementById('paypalPayment') )
			document.getElementById('paypalPayment').style.display = 'none';

		if ( document.getElementById('mf_reseller') )
		{
			document.getElementById('mf_reseller').value = 'yes';
		}
	}

	// Possibly update the progress bar button.

	finalVerifyForm();

	return;
}

// resetForm
//
// When hooked up to onUnload event, this will turn the submit button back on
// and turn off the animation once the page is left. This means, if the
// user clicks the back button to correct an error, they can then re-submit
// the form.

function resetForm() {
	if (document.getElementById(buybuttonDiv)) {
		document.getElementById(buybuttonDiv).disabled = false;
		document.getElementById(buybuttonDiv).src = buyDisabledN.src;
	}
	if (document.getElementById(progressbuttonDiv)) {
		document.getElementById(progressbuttonDiv).disabled = false;
	}
	if (document.getElementById(submitButton)) {
		document.getElementById(submitButton).disabled = false;
	}
	if (document.getElementById(spinnerImg)) {
		document.getElementById(spinnerImg).src = spinner_off.src;
	}
}

// calcTotalNew()
//
// This function does it all:
//   - Calculates the total of items ordered
//   - Enables quantity fields reflected checked items
//   - Pluralized "copy" / "copies"
//   - Adds item to the confirmation string
//   - Creates a weight total for shipping estimates
//   - Calculates a discount if discount code is present
//
// Requires:
//   - Item's checkbox or radiobox to be "item.[name]"
//   - Item's quantity field to be "[name]"

function calcTotalNew(wasKeyPress) {

	theTotal = 0;

	var	subTotal 		= 0,
		shipDate 		= 0,
		radioMatch 		= 0,
		itemsList      	= new Array,
		variationsList 	= new Array,
		quantitiesList 	= new Array,
		i, x, k;

	// Clear out the item list

	boughtThings = "";
	boughtQty = new Array();
	boughtItem = new Array();
	boughtPrice = new Array();

	var manualOrder = false;

	if ( typeof document.manualform !== 'undefined' )
	{
		// Came from the POD manual order page

		document.orderform = document.manualform;
		manualOrder = true;
	}

	// Walk through each of the possible defined items, to look for checked/selected ones

	for (i=0; i < quantityArray.length; i++) {

		// First, update the price display of any coupon discounted items

		if (promoArray[i]) {
			subPrice = parseInt(priceArray[i]) - Math.round(priceArray[i] * (promoArray[i] / 100));
			if (document.getElementById(itempriceDivPrefix+quantityArray[i])) {
				document.getElementById(itempriceDivPrefix+quantityArray[i]).innerHTML = "<span class=\"sale\">" + subPrice + "</span>";
			}
		} else {
			subPrice = priceArray[i];
			if (document.getElementById(itempriceDivPrefix+quantityArray[i])) {
				document.getElementById(itempriceDivPrefix+quantityArray[i]).innerHTML = addCommas(subPrice);
			}
		}

		// Now, iterate through radio button arrays, if they exist, to determine the chosen item

		if (typeof radioArray != 'undefined') {
			radioMatch = 0;

			// Iterate through all of the radio button arrays on the order form.
			for (x=0; x < radioArray.length; x++) {
				// Find out which specific item was checked in the radio array.
				// Only proceed if there's more than one element in the radio array.
				if (document.orderform[radioArray[x]].length) {
					j = document.orderform[radioArray[x]].length;
					for (k=0; k < j; k++) {
						// If it was checked, see if it matches the form item we're testing.
						if (document.orderform[radioArray[x]][k].checked) {
							if (document.orderform[radioArray[x]][k].value == checkedArray[i]) {
								// Yes! Flag it.
								radioMatch = 1;
							}
						}
					}
				} else {
					// If there's only one radio button (why?), radio.length is undefined.
					// So, we assume it's the only option, and just grab its value directly.
					if (document.orderform[radioArray[x]].value == checkedArray[i]) {
						radioMatch = 1;
					}
				}
			}
		}

		// We have an item selected!

		if ((document.orderform[checkedArray[i]] && document.orderform[checkedArray[i]].checked) || radioMatch == 1) {

			// Don't do these things on keypresses / live changes, because it will be annoying, such
			// as when the user has simply cleared field out to type a new value.

			if (! wasKeyPress) {

				// Enable the quantity field. If it used to be disabled, set the value to "1" also.

				if (document.orderform[quantityArray[i]].disabled == true) {
					document.orderform[quantityArray[i]].disabled = false;
					document.orderform[quantityArray[i]].value = "1";
				}

				// If it's empty, set it to "1".

				if (document.orderform[quantityArray[i]].value == "") {
					document.orderform[quantityArray[i]].value = "1";
				}

			}

			// Get the value of the quantity field and round it just in case

			if (document.orderform[quantityArray[i]].value != "" && Math.ceil(document.orderform[quantityArray[i]].value) != document.orderform[quantityArray[i]].value) {
				document.orderform[quantityArray[i]].value = Math.ceil(document.orderform[quantityArray[i]].value);
			}

			// Make sure there are no letters and such.

			if (isNaN(document.orderform[quantityArray[i]].value)) {
				document.orderform[quantityArray[i]].value = "1";
			}

			if (document.orderform[quantityArray[i]].value < 1 && document.orderform[quantityArray[i]].value != "") {
				document.orderform[quantityArray[i]].value = "1";
			}

			// If the quantity > 1000, scale it down to 1000. Nobody is ever going to buy this much stuff. CRY.GIF

			if (document.orderform[quantityArray[i]].value > 1000) {
				document.orderform[quantityArray[i]].value = "1000";
			}

			// Pluralize the "copies" field, if it exists.

			pluralizeElement(quantityArray[i]);

			// Add it to our confirmation display

			boughtThings = boughtThings + document.orderform[quantityArray[i]].value+" qty. of "+descriptArray[i]+"\n";
			boughtQty.push(document.orderform[quantityArray[i]].value);
			boughtItem.push(descriptArray[i]);

			// Discount any applicable discount, and then ADD it to the total.

			if (promoArray[i]) {
				// The promo code applies to this item
				subPrice = parseInt(priceArray[i]) - Math.round(priceArray[i] * (promoArray[i] / 100));
			}

			else if (typeof(formulaArray) != 'undefined' && formulaArray[i] ) {

				// There is a quantity discount formula

				if ( document.orderform[quantityArray[i]].value > 1 )
				{
					finalFormula = formulaArray[i];
					finalFormula = finalFormula.replace("#PRICE#", priceArray[i]);
					finalFormula = finalFormula.replace("#QTY#", document.orderform[quantityArray[i]].value);
					finalFormula = finalFormula.replace(' log10(', ' Math.log10(');

					eval('subPrice = Math.round(('+finalFormula+') / '+document.orderform[quantityArray[i]].value+')');
				}
				else
				{
					subPrice = priceArray[i];
				}

				if ( manualOrder == true )
				{
					subPrice *= document.orderform[quantityArray[i]].value;
				}

				// If it lowered the price, display the new price in red

				if (document.getElementById(itempriceDivPrefix+quantityArray[i])) {

					if (subPrice < priceArray[i]) {
						document.getElementById(itempriceDivPrefix+quantityArray[i]).innerHTML = addCommas(subPrice);
						// Highlight it if there's an enclosing <span> around the price
						if (document.getElementById(priceDivPrefix+quantityArray[i])) {
							document.getElementById(priceDivPrefix+quantityArray[i]).className = 'highlight';
						}
					} else {
						// Turn off the highlight if no discount
						if (document.getElementById(priceDivPrefix+quantityArray[i])) {
							document.getElementById(priceDivPrefix+quantityArray[i]).className = '';
						}
					}
				}

				if ( manualOrder == true )
				{
					document.getElementById('price.'+quantityArray[i]).value = subPrice;
				}
			}
			else {
				subPrice = priceArray[i];

				// Also if highlighted, turn it off
				if (document.getElementById(priceDivPrefix+quantityArray[i])) {
					document.getElementById(priceDivPrefix+quantityArray[i]).className = '';
				}
			}

			// Now do the total price.

			subTotal = subPrice * document.orderform[quantityArray[i]].value;
			theTotal = theTotal + subTotal;

			// Also add price to our confirmtaion display

			boughtPrice.push(subPrice);

			// Update the shipping date. Use the highest index count for the ship estimate text.

			if (parseInt(shipArray[i]) > shipDate) {
				shipDate = parseInt(shipArray[i]);
			}

			// Build an array of lists: items, variations (if they exist), and quantities.
			// This is used to pass to the shipping calculator script.

			if (document.getElementsByName("var_"+quantityArray[i]).length > 0) {
				tempValue = document.orderform['var_' + quantityArray[i]].value;
				tempList = tempValue.split(' ');
				variationsList.push(tempList[0]);
			} else{
				variationsList.push("");
			}

			quantitiesList.push(document.orderform[quantityArray[i]].value);
			itemsList.push(quantityArray[i]);

		}
		else
		{
			if ( manualOrder == false )
			{
				// It's not checked, so let's disable the text box, set the value to "0".
				document.orderform[quantityArray[i]].disabled = true;
				document.orderform[quantityArray[i]].value = "0";
				pluralizeElement(quantityArray[i]);
			}
		}
	}

	// Make the item/quantity/variation lists comma separated.

	itemsList = itemsList.join(',');
	quantitiesList = quantitiesList.join(',');
	variationsList = variationsList.join(',');

	// Apply a WHOLE ORDER promo code

	if (promoAmount && (promoAmount != 0 && promoItems == "all")) {
		theTotal = parseInt(theTotal) - parseInt(parseInt(theTotal) * (promoAmount / 100));
	}

	// Add shipping cost to the total

	if (shippingTotal != 0) {
		theTotal = parseFloat(theTotal) + parseFloat(shippingTotal);
	}

	// Final cleanup

	theTotal = theTotal.toFixed(2);

	// Now update the whole page total

	if (isNaN(theTotal)) {
		if (document.orderform.pod_language.value == "jp") {
			alert("半角数字以外の文字は入力できません！ "); // Space at the end because of IE6. Whoah
		} else {
			alert("You can only use numbers in the quantity fields.");
		}
	}
	else {
		displayTotal = theTotal;
	}

	// Round down Yen amounts to whole numbers (9800 instead of 9800.00)

	if (document.orderform.pod_currency && document.orderform.pod_currency.value == "JPY" ) {
		displayTotal = Math.floor(displayTotal);
	}

	// Now update the total text, if we can

	if (document.getElementById && document.getElementById(totalDiv)) {
		if (promoAmount != 0 && promoItems == "all") {
			document.getElementById(totalDiv).innerHTML = addCommas(displayTotal) + " <span class=\"sale\">(-" + promoAmount + "%)</span>";
		} else {
			document.getElementById(totalDiv).innerHTML = addCommas(displayTotal);
		}
	}

	// Now update the estimated shipping date

	changeShipDateDisplay(shipEstimate[shipDate]);
}

// pluralizeElement
//
// Pluralize a "copies" field, only if it exists.
//
// If the value of the quantity field is exactly 1, change the word "copies" to "copy".
// The "copies" label needs to be in a span with ID "[NAMEOFITEM]-quantitylabel".
//
// TODO: Currently the script only handles copy/copies.  We should look into expanding it
// to handle other words like "licenses," "items," "packs," "shirts," "upgrades,", etc.

function pluralizeElement(itemName) {
	if (document.getElementById(itemName + quantityLabelSuffix) && document.orderform.pod_language.value != "jp") {
		if (document.orderform[itemName].value == 1) {
			document.getElementById(itemName + quantityLabelSuffix).innerHTML = 'copy';
		} else {
			document.getElementById(itemName + quantityLabelSuffix).innerHTML = 'copies';
		}
	}
}

// finalVerifyForm
//
// This script will make sure any form field that needs to be filled out, is.
// It calculates how many are required, and how many filled out, for the optional progress button.
// Finally, it displays the last chance "confirmation" alert box if all is well.
//
// finalTest = 'true' if this is the last scan, which should pop-up the confirmation.
//             otherwise we assume the user is still working.

function finalVerifyForm(finalTest) {

	calcTotalNew(); // Disabled? because it would re-calculate shipping

	var errorFlag = 0,
		totalRequired = 0,
		countRequired = 0,
		x;

	// Check every form element to make sure it's filled.
	// If it's set to class "required", and it's blank, change the class to "error" to display the X circle.
	// If it's set to class "required-card", and there's a "cc-info" block, do the same.

	for (x = 0; x < document.orderform.elements.length; x++) {

		if (document.orderform.elements[x].className == "required") {
			if (document.orderform.elements[x].type == "text" || document.orderform.elements[x].type == "password" || document.orderform.elements[x].type == "email" || document.orderform.elements[x].type == "tel" || document.orderform.elements[x].type == "url") {

				totalRequired++;

				if (document.orderform.elements[x].value == "") {
					if (finalTest == 'true') {
						addClassName(document.orderform.elements[x].parentNode, 'error');
						errorFlag = 1;
					}
				} else {
					if (finalTest == 'true') {
						removeClassName(document.orderform.elements[x].parentNode, 'error');
					}
					countRequired++;
				}
			}

			if (document.orderform.elements[x].type == "checkbox") {

				totalRequired++;

				if (document.orderform.elements[x].checked == false) {
					if (finalTest == 'true') {
						addClassName(document.orderform.elements[x].parentNode, 'error');
						errorFlag = 1;
					}
				} else {
					if (finalTest == 'true') {
						removeClassName(document.orderform.elements[x].parentNode, 'error');
					}
					countRequired++;
				}

			}

		} else if (document.orderform.elements[x].className == "required-card" && document.getElementById("cc-info")) {
			if (document.getElementById("Card").checked) {
				if (document.orderform.elements[x].type == "text") {

					totalRequired++;

					if (document.orderform.elements[x].value == "") {
						if (finalTest == 'true') {
							addClassName(document.orderform.elements[x].parentNode, 'error');
							errorFlag = 1;
						}
					} else {
						if (finalTest == 'true') {
							removeClassName(document.orderform.elements[x].parentNode, 'error');
						}
						countRequired++;
					}
				}
			} else {
				removeClassName(document.orderform.elements[x].parentNode, 'error');
			}

		} else {

			// If a class gets switched to not-required, make sure to clear errors.

			if (hasClassName(document.orderform.elements[x].parentNode, 'error')) {
				removeClassName(document.orderform.elements[x].parentNode, 'error');
			}
		}
	}

	percentRequired = Math.round((countRequired / totalRequired) * 100);

	// If there's a progress button, change it

	if (document.getElementById(progressbuttonDiv) && document.getElementById(progressbuttonDiv).getAttribute('title') != "") {
		if (document.getElementById(progressbuttonNew)) {
			setProgressButtonNew(progressbuttonNew, percentRequired, document.getElementById(progressbuttonDiv).getAttribute('title'));
		} else {
			setProgressButton(progressbuttonDiv, percentRequired, document.getElementById(progressbuttonDiv).getAttribute('title'));
		}

	} else if (document.getElementById(progressbuttonDiv)) {
		if (document.getElementById(progressbuttonNew)) {
			setProgressButtonNew(progressbuttonNew, percentRequired, '');
		} else {
			setProgressButton(progressbuttonDiv, percentRequired, '');
		}

	} else if (document.getElementById(submitButton).dataset) {
    	setProgressButtonNewest(submitButton, percentRequired, document.getElementById(submitButton).getAttribute('title'));
	}

	if (finalTest == 'true') {

		if (errorFlag == 1) {
			if (document.orderform.pod_language.value == "jp") {
				alert("注文の前に、マークが現れたすべての項目を埋めてください");
			} else {
				alert("You must fill out all marked fields before you can submit the form!");
			}
			return false;
		}

		// Show confirmation window, get confirmation

		if (document.orderform.pod_language.value == "jp") {
			str = "ご注文商品:\n"+boughtThings+"\n合計金額: $"+displayTotal+"\n\n内容が正しいことを確認して OK をクリックしてください";
		} else {
			str = "You're buying:\n"+boughtThings+"\nYour Total: $"+displayTotal+"\n\nIs this correct? If so, click OK!";
		}

		// Show the confirmation dialog!

		if ( document.getElementById('confirm-purchase') )
		{
			showConfirmationPopup();
			return false;
		}
		else
		{
			return true;
		}

	}
}

//
// showConfirmationPopup
//

function showConfirmationPopup() {

	var popFullscreen = document.getElementById('fullscreen'),
		popLarge = document.getElementById('largepopup'),
		x;

	// Put the correct content in the pop-up

	document.getElementById('confirm-purchase').className = 'show';

	// Update the bought table

	tableHTML = "";

	for (x = 0; x < boughtQty.length; x++) {
		tableHTML = tableHTML + "<tr>";
		tableHTML = tableHTML + "<td class=\"quantity\">"+boughtQty[x]+"</td>";
		tableHTML = tableHTML + "<td class=\"item\">"+boughtItem[x]+"</td>";
		tableHTML = tableHTML + "<td class=\"price\">";

		if (document.orderform.pod_language.value == "jp")
			tableHTML = tableHTML + "&yen;";
		else
			tableHTML = tableHTML + "$";

		tableHTML = tableHTML + boughtPrice[x]+"</td>";
		tableHTML = tableHTML + "</tr>";
	}

	if (document.getElementById) {
		document.getElementById("purchased_items").innerHTML = tableHTML;
		document.getElementById("total").innerHTML = displayTotal;
		document.getElementById("email-confirmation").innerHTML = document.orderform.mf_email.value;
	}

	// Make fullscreen thing really full screen, and show it
	getSize();
	popFullscreen.style.height = myScrollHeight + 'px';
	popFullscreen.style.display = 'block';

	// Position pop-up
	popLarge.style.left = ((myWidth - popLarge.offsetWidth) / 2) + 'px';
	popLarge.style.top = (((myHeight - popLarge.offsetHeight) / 2) + myScroll) + 'px';
	popLarge.style.visibility = 'visible';

	// Focus Confirmation button - added for accessibility by Neven
	if (document.getElementById && document.getElementById('button-confirm-link')) {
	    document.getElementById('button-confirm-link').focus();
	}

}

function hideConfirmationPopup() {
	var popFullscreen = document.getElementById('fullscreen'),
		popLarge = document.getElementById('largepopup');

	popLarge.style.visibility = 'hidden';
	popFullscreen.style.display = 'none';
}

function confirmPopup() {

	var popFullscreen = document.getElementById('fullscreen'),
		popLarge = document.getElementById('largepopup');

	popLarge.style.visibility = 'hidden';
	popFullscreen.style.display = 'none';

	// Actually submit the order!

	if (document.getElementById(buybuttonDiv)) {
		document.getElementById(buybuttonDiv).disabled = true;
		document.getElementById(buybuttonDiv).src = buyDisabled.src;
	}

	if (document.getElementById(progressbuttonDiv)) {
		document.getElementById(progressbuttonDiv).disabled = true;
	}

	if (document.getElementById(submitButton)) {
		document.getElementById(submitButton).disabled = true;
		alert("Disabled the submit button!");
	}

	if (document.getElementById(spinnerImg)) {
		document.getElementById(spinnerImg).src = spinner_on.src;
	}

	// This popup now only exists on the Transmit buy pages and
	// is being deprecated.  confirmTransmitOrder() is needed
	// to support Stripe card tokenization on the T4 page.

	confirmTransmitOrder();

}

// changeItemDetails
//
// Passed the itemID, and "variety weight" passed as itemVAR, finds the element
// in the item array and changes the weight of that item on the fly.

function changeItemDetails(itemID, itemVAR) {

	var changeArray = itemVAR.split(" "),
		i;

	// Walk through the array to find out with Index ID the item is
	// Is there really no way to get an index ID using javascript?

	for (i=0; i < quantityArray.length; i++) {
		if (quantityArray[i] == itemID) {
			// Found it; set the weight!

			if (changeArray[1] != "") {
				weightArray[i] = changeArray[1];
			}

			if (changeArray[2] != "") {
				shipArray[i] = changeArray[2];
			}

		}
	}

	// If the info box is open, and the item showing is the item that changed, update the infobox

	infobox = document.getElementById("InfoBox");
	if ((infobox.style.visibility != "hidden" || infobox.style.visibility != "") && currentInfoBoxItem == itemID) {
		updateInfoBox(itemID);
		showInfoBox(currentOpenHere, 0);
	}

	return;
}

// getShippingRate
//
// Call the necessary functions to get and display the shipping cost.

function getShippingRate(shipType) {

	// First -- is there a shipping block? Is this page even interested in this?

	if (! (document.getElementById && document.getElementById("shipping"))) {
		return;
	}

	// Second -- does the browser support this?

	if (! (window.XMLHttpRequest || (window.ActiveXObject && navigator.platform.indexOf("Mac") == -1))) {
		return;
	}

	// Now we get the shipping rate.
	// If there's no zip code defined, we can't get an accurate rate, so don't.
	// (A note about this. Getting "cpi_card-zip" the normal way because of the dash in the name. That's
	// why we're using document.getElementsByName. It's frustrating.)

	// Pull Zip / Country from shipping address if necessary

	if (document.orderform.useShippingAddress.checked) {
		currentZip = document.getElementsByName("cpi_ship-zip")[0].value;
		currentCountry = document.getElementsByName("cpi_ship-country")[0].value;
	} else {
		currentZip = document.getElementsByName("cpi_card-zip")[0].value;
		currentCountry = document.getElementsByName("cpi_card-country")[0].value;
	}

    storeName = document.getElementsByName("pod_storeName")[0].value;

	// Now start the animation and do the request

	if (currentZip != "" && currentCountry == "United States") {
		if (document.images["ship-spinner"]) {
			document.images["ship-spinner"].src = spinner_on.src;
		}
		if ( typeof(shipType) == 'undefined' || shipType == '' )
			shipType = 'Priority';

	    loadXMLDoc("/pod-bin/xml-shiprate.php?type="+shipType+"&store="+storeName+"&country="+currentCountry+"&to="+currentZip+"&from=97209&items="+itemsList+"&variations="+variationsList+"&quantities="+quantitiesList);
	}
  else if (currentCountry != "United States") {
		if (document.images["ship-spinner"]) {
			document.images["ship-spinner"].src = spinner_on.src;
		}
		if ( typeof(shipType) == 'undefined' || shipType == '' )
			shipType = 'Priority+Mail+International';
	    loadXMLDoc("/pod-bin/xml-shiprate.php?type="+shipType+"&store="+storeName+"&country="+currentCountry+"&items="+itemsList+"&variations="+variationsList+"&quantities="+quantitiesList);
	}
	else
	{
		shippingTotal = 0;
		changeShipDisplay("[Need Address]");
		calcTotalNew();
	}
}

// XML RESPONSE: shipResponse
// Correctly handle a Shipping Rate XML request response, and adjust the necessary fields

function shipResponse(xml) {

	var XMLvalue;

	// Turn off the spinner (if one is active)

	if (document.images["ship-spinner"]) {
		document.images["ship-spinner"].src = spinner_off.src;
	}

	XMLvalue = xml.getElementsByTagName("rate")[0].firstChild.data;

	if (XMLvalue != "0.00") {

		// Since price is in cents, also work with shippingTotal in cents

		shippingTotal = XMLvalue;
		shippingTotal = parseFloat(shippingTotal) + parseFloat(handlingCharge);  // (Handling Charge Added)
		shippingTotal = shippingTotal.toFixed(2);

		// Calculate display amount

		displayShippingTotal = shippingTotal;

		// Display the shipping cost

		changeShipDisplay(temp);

	} else {
		changeShipDisplay("[Unknown]");
	}

	calcTotalNew();

}

// changeShipDisplay
//
// Called when the XML loading is complete. Does the actual work in changing
// the shipping amount.

function changeShipDisplay(value) {
	if (document.getElementById && document.getElementById('shipping')) {
		document.getElementById('shipping').innerHTML = value;
	}
}

// changeShipDateDisplay
//
// Called when the XML loading is complete. Does the actual work in changing
// the shipping amount.

function changeShipDateDisplay(value) {
	if (document.getElementById && document.getElementById('shipdate')) {
		document.getElementById('shipdate').innerHTML = value;
	}
}

// getPromoCode
//
// Verify the promo code via XML request, and set the discount and item variables with it

function getPromoCode() {

	// Wait 0.5 seconds from last change before performing lookup

	if ( typeof promoCodeTimeout !== "undefined" )
		clearTimeout(promoCodeTimeout);

	promoCodeTimeout = setTimeout('getPromoCodeDeferred()', 500);
}

function getPromoCodeDeferred() {
	// First -- is there a promo block? Is this page even interested in this?

	if (! (document.getElementById && document.getElementById("promoCode"))) {
		return;
	}

	// Second -- does the browser support this?

	if (! (window.XMLHttpRequest || (window.ActiveXObject && navigator.platform.indexOf("Mac") == -1))) {
		return;
	}

	currentPromo = document.getElementById("promoCode").value;
	console.log(currentPromo);

	// Now possibly start the animation and do the request

	if (currentPromo != "" && currentPromo != "optional" && currentPromo != "オプション") {

		/*
		if (document.getElementById && document.getElementById("promoCode")) {
			document.getElementById("promoCode").style.backgroundImage = "url(" + spinner_on.src + ")";
		}
		*/

		// loadXMLDoc("/pod-bin/xml-promocode.php?store="+theStore+"&code="+currentPromo);
		circlePromoCheck(currentPromo, circleItem);

	} else {
		// The promo code was blank / set to default. Don't do XML.
		promoAmount = 0;
		promoItems = "";
		promoArray = "";

		/*
		if (document.getElementById && document.getElementById("promoCode")) {
			document.getElementById("promoCode").style.backgroundImage = "none";
		}
		*/
	}

	calcTotalNew();
}

function circlePromoCheck(promoCode, item) {

	var promoCheckReq = new XMLHttpRequest();
	var promoCheckURL = 'https://' + serverConfig.circleHost + '/api/v1/promo_check/' + item + '/' + promoCode + '/';

    promoCheckReq.open("GET", promoCheckURL, false);
    promoCheckReq.send(null);
    var responseText =  promoCheckReq.responseText;
	var response = JSON.parse(responseText);

	if (response['status'] && response['status'] === 'ok') {
		promoAmount = response['value'];
		promoItems = "all";

		if (document.getElementById && document.getElementById("promo")) {
			document.getElementById("promo").className = 'valid';
		}
	} else {
		promoArray = new Array();
		promoItems = "";
		promoDate = 0;
		promoAmount = 0;

		if (document.getElementById && document.getElementById("promo")) {
			document.getElementById("promo").className = 'invalid';
		}
	}
}

// XML RESPONSE: promoResponse
// Correctly handle a promo code response, and adjust the necessary fields

function promoResponse(xml) {

	var i, j;

	// Turn off the spinner (if one is active)

	/*
	if (document.getElementById && document.getElementById("promoCode")) {
		document.getElementById("promoCode").style.backgroundImage = "none";
	}
	*/

	// promoAmount is expressed as a percentage, ie; 25 = 25% discount

	promoAmount = xml.getElementsByTagName("discount")[0].firstChild.data;
	promoItems = xml.getElementsByTagName("items")[0].firstChild.data.split(",");
	promoDate = xml.getElementsByTagName("expired")[0].firstChild.data;

	// Catch if the promo code doesn't exist or is expired

	if (promoAmount == "0" && promoItems == "none")
	{
		promoArray = new Array();
		promoItems = "";
		promoDate = 0;
		/*
		if (document.orderform.pod_language.value == "jp") {
			document.getElementById("promoCode").value = "不明なコードです";
		} else {
			document.getElementById("promoCode").value = "unknown code";
		}
		document.getElementById("promoCode").style.color = "#777777";
		if (document.getElementById && document.getElementById("promoCode")) {
			document.getElementById("promoCode").style.backgroundImage = "url(" + check_bad.src + ")";
		}
		*/

		if (document.getElementById && document.getElementById("promo")) {
			document.getElementById("promo").className = 'invalid';
		}
	}
	else if (promoDate == "true")
	{
		// The promo code is expired

		promoAmount = 0;
		promoArray = new Array();
		promoItems = "";
		promoDate = 0;

		/*
		if (document.orderform.pod_language.value == "jp") {
			document.getElementById("promoCode").value = "有効期限が切れています";
		} else {
			document.getElementById("promoCode").value = "expired code";
		}

		document.getElementById("promoCode").style.color = "#777777";
		if (document.getElementById && document.getElementById("promoCode")) {
			document.getElementById("promoCode").style.backgroundImage = "url(" + check_bad.src + ")";
		}
		*/

		if (document.getElementById && document.getElementById("promo")) {
			document.getElementById("promo").className = 'invalid';
		}
	}
	else
	{
		// The promo code is good!

		if (document.getElementById && document.getElementById("promo")) {
			document.getElementById("promo").className = 'valid';
		}

		/*
		if (document.getElementById && document.getElementById("promoCode")) {
			document.getElementById("promoCode").style.backgroundImage = "url(" + check_on.src + ")";
		}
		*/
	}

	// If it's not "all", build the per-item discount array (promoArray).
	// Look through the promo items, and the page's items, to find relevant matches.

	promoArray = new Array();

	if (promoItems != "all") {
		for (i=0; i < quantityArray.length; i++) {
			for (j=0; j < promoItems.length; j++) {
				if (promoItems[j] == quantityArray[i]) {
					promoArray[i] = promoAmount;
				}
			}
		}
	}

	calcTotalNew();
}


// updateCardDisplay()

function updateCardDisplay(number, divName, cvvDivName) {

	var re1 = new RegExp("^4"), // Visa
		re2 = new RegExp("^5[1-5]"), // Mastercard
		re3 = new RegExp("^3[47]"), // Amex
		re4 = new RegExp("^(6011|622(1(2[6-9]|[3-9][0-9])|[2-8][0-9][0-9]|9([0-1][0-9]|2[0-5]))|64[4-9]|65)"), // Discover
		re5 = new RegExp("^35(2[8-9]|[3-8][0-9])"); // JCB

	if (number.match(re5) != null)
		document.getElementById(divName).className = "jcb";

	else if (number.match(re4) != null)
		document.getElementById(divName).className = "discover";

	else if (number.match(re1) != null)
		document.getElementById(divName).className = "visa";

	else if (number.match(re2) != null)
		document.getElementById(divName).className = "mastercard";

	else if (number.match(re3) != null) {
		document.getElementById(divName).className = "amex";
		if (cvvDivName) {
			addClassName(document.getElementById(cvvDivName), 'amex');
		}
	}

	else {
		document.getElementById(divName).className = "all";
		if (cvvDivName) {
			removeClassName(document.getElementById(cvvDivName), 'amex');
		}
	}

}

// Progresss bar button

function setProgressButton(elemName, percent, finalLabel) {
	if (percent == null)
		percent = 100;

	var elem = document.getElementById(elemName),
		barWidth = Math.floor((elem.clientWidth / 100) * percent);

	// get button width

	try {
		elem.style.backgroundPosition = barWidth + 'px 0px, 0px 0px';
	} catch(err) {
		// IE8 does not like that multiple background definition. Suck it, IE8.
	}

	if (percent == 100 && finalLabel != null) {
		originalLabel = elem.value;
		elem.value = finalLabel;
	} else {
		if (typeof(originalLabel) != 'undefined' && originalLabel != elem.value) {
			elem.value = originalLabel;
		}
	}
}

// New-Style Progresss bar button

function setProgressButtonNew(elemName, percent, finalLabel) {

	if (percent == null)
		percent = 100;

	var elem = document.getElementById(elemName);

	// get button width

	elem.style.width = percent + '%';
	elem.dataset.progress = percent;

	if (percent == 100 && finalLabel != null) {
		originalLabel = elem.value;
		elem.value = finalLabel;
	} else {
		if (typeof(originalLabel) != 'undefined' && originalLabel != elem.value) {
			elem.value = originalLabel;
		}
	}
}

// New-New-Style Progresss bar button

function setProgressButtonNewest(elemName, percent, finalLabel) {

	if (percent == null)
		percent = 100;

	var elem = document.getElementById(elemName);

	elem.dataset.progress = percent;

	if (percent == 100 && finalLabel != null) {
		originalLabel = elem.value;
		elem.value = finalLabel;
	} else {
		if (typeof(originalLabel) != 'undefined' && originalLabel != elem.value) {
			elem.value = originalLabel;
		}
	}
}

//////////////////////////
//
// Item Info Box Functions
//
///////////////////////////

// Show / Hide Div Layer Function

function toggleDiv(block, image) {
	var mye;

	if (document.getElementById) {
		findBlock = document.getElementById(block);
		if (image != "") { findImage = document.getElementById(image); }
	} else if (document.all) {
		findBlock = eval("document.all."+block);
		if (image != "") { findImage = eval("docmuent.all."+image); }
	}

	if (!findBlock) return;

	if (findBlock.style.display.indexOf("none") >=0) {
		findBlock.style.display = "";
		if (image != "") { findImage.setAttribute("src", "images/widget-minus.png"); }
	}
	else if (findBlock.style.display == "") {
		findBlock.style.display = "none";
		if (image != "") { findImage.setAttribute("src", "images/widget-plus.png"); }
	}
}

//
// Info Box
//

function toggleInfoBox(openHere, theItem) {
	infobox = document.getElementById("InfoBox");
	currentOpenHere = openHere;

	// Show it. And fill it with the right info.

	if ((infobox.style.visibility == "hidden" || infobox.style.visibility == "") && currentInfoBoxItem != theItem) {
		// It's not showing, and this is a new item clicked on. Update and fade.
		updateInfoBox(theItem);
		document.getElementById(openHere).src = '/goods/images/info.gif';
		currentInfoBoxItem = theItem;
		showInfoBox(openHere, 1);
	} else if ((infobox.style.visibility != "hidden" || infobox.style.visibility != "") && currentInfoBoxItem != theItem) {
		// It is showing, and this is a new item, so don't fade, just update and move.
		updateInfoBox(theItem);
		showInfoBox(openHere, 0);
		currentInfoBoxItem = theItem;
	} else {
		// It's the same item, presumably, and it's open, so we want to close it.
		hideInfoBox(openHere);
	}
}

function showInfoBox(openHere, doFade) {

	// doFade. 1 = Yes, fade it in. 0 = Leave it how it is, assuming it's open

	infohost = document.getElementById(openHere);
	infobox = document.getElementById("InfoBox");

	// Find the location of where we should position the pop-up box
	// "PopHost" is the document element near where the pop-up box should appear.
	// This is passed in as a variable (openHere) from the caller.

	var infohostY = 0,
		infohostX = 0,
		count = 0,
		infohostFind = infohost;

	// Iterate through the target item's many potential parents to calculate position X and Y values

	do {
		infohostY += infohostFind.offsetTop;
		infohostX += infohostFind.offsetLeft;
	} while ( infohostFind = infohostFind.offsetParent )

	// Now position the pop-up box, based on the parent element's location and height.

	infobox.style.left = infohostX - (infobox.offsetWidth / 2) + 11;
	infobox.style.top = infohostY + (infohost.offsetHeight / 2) - 3;

	if (doFade == 1) {

		// Now make the box visible (fade in?)

		setOpacity(0, "InfoBox");
		infobox.style.visibility = "visible";
		fadeElementSetup("InfoBox", 0, 100, 5);
	}
}

function hideInfoBox() {
	if (infobox.style.visibility != "hidden" || infobox.style.visibility != "") {
		fadeElementSetup("InfoBox", 100, 0, 5);
	}
	currentInfoBoxItem = "";
}

function updateInfoBox(theItem) {
	// Get the information about the item and draw it.

	for (var m=0; m < quantityArray.length; m++) {
		if (quantityArray[m] == theItem) {
			radioIndex = m;
		}
	}

	if (document.orderform.pod_language.value == "jp") {
		infoHtml = "<font color=\"#666666\">重量:</font> "+weightArray[radioIndex]+" lbs<br>\n";
		infoHtml += "<font color=\"#666666\">配送予定日:</font> "+shipEstimate[shipArray[radioIndex]]+"<br>\n";
	} else {
		infoHtml = "<font color=\"#666666\">Weight:</font> "+weightArray[radioIndex]+" lbs<br>\n";
		infoHtml += "<font color=\"#666666\">Est. Ship:</font> "+shipEstimate[shipArray[radioIndex]]+"<br>\n";
	}
	document.getElementById('InfoText').innerHTML = infoHtml;
	return;
}

////////////////////////
//
// UUID Generation Code
// Copyright (C) 2006-2008, Erik Giberti (AF-Design), All rights reserved.
//
////////////////////////

// On creation of a UUID object, set it's initial value

function UUID(){
	this.id = this.createUUID();
}

// When asked what this Object is, lie and return it's value

UUID.prototype.valueOf = function(){ return this.id; }
UUID.prototype.toString = function(){ return this.id; }

//
// INSTANCE SPECIFIC METHODS
//

UUID.prototype.createUUID = function(){
	//
	// Loose interpretation of the specification DCE 1.1: Remote Procedure Call
	// described at http://www.opengroup.org/onlinepubs/009629399/apdxa.htm#tagtcjh_37
	// since JavaScript doesn't allow access to internal systems, the last 48 bits
	// of the node section is made up using a series of random numbers (6 octets long).
	//
	var dg 	= new Date(1582, 10, 15, 0, 0, 0, 0),
		dc 	= new Date(),
		t 	= dc.getTime() - dg.getTime(),
		h 	= '-',
		tl 	= UUID.getIntegerBits(t,0,31),
		tm 	= UUID.getIntegerBits(t,32,47),
		thv = UUID.getIntegerBits(t,48,59) + '1', // version 1, security version is 2
		csar= UUID.getIntegerBits(UUID.rand(4095),0,7),
		csl = UUID.getIntegerBits(UUID.rand(4095),0,7),

		// since detection of anything about the machine/browser is far to buggy,
		// include some more random numbers here
		// if NIC or an IP can be obtained reliably, that should be put in
		// here instead.
		n 	= UUID.getIntegerBits(UUID.rand(8191),0,7) +
			  UUID.getIntegerBits(UUID.rand(8191),8,15) +
			  UUID.getIntegerBits(UUID.rand(8191),0,7) +
			  UUID.getIntegerBits(UUID.rand(8191),8,15) +
			  UUID.getIntegerBits(UUID.rand(8191),0,15); // this last number is two octets long
	return tl + h + tm + h + thv + h + csar + csl + h + n;
}


//
// GENERAL METHODS (Not instance specific)
//

// Pull out only certain bits from a very large integer, used to get the time
// code information for the first part of a UUID. Will return zero's if there
// aren't enough bits to shift where it needs to.

UUID.getIntegerBits = function(val,start,end){
	var base16 = UUID.returnBase(val,16);
	var quadArray = new Array();
	var quadString = '';
	var i = 0;
	for(i=0;i<base16.length;i++){
		quadArray.push(base16.substring(i,i+1));
	}
	for(i=Math.floor(start/4);i<=Math.floor(end/4);i++){
		if(!quadArray[i] || quadArray[i] == '') quadString += '0';
		else quadString += quadArray[i];
	}
	return quadString;
}

// Replaced from the original function to leverage the built in methods in
// JavaScript. Thanks to Robert Kieffer for pointing this one out

UUID.returnBase = function(number, base){
	return (number).toString(base).toUpperCase();
}

// pick a random number within a range of numbers
// int b rand(int a); where 0 <= b <= a

UUID.rand = function(max){
	return Math.floor(Math.random() * (max + 1));
}

// end of UUID class file

////////////////////////
//
// Add And Remove Classes
// Based on http://snippets.dzone.com/posts/show/2630
//
////////////////////////

function hasClassName(objElement, strClass) {

	if ( objElement.className ) {
		var arrList = objElement.className.split(' ');
		var strClassUpper = strClass.toUpperCase();
		for ( var i = 0; i < arrList.length; i++ ) {
			if ( arrList[i].toUpperCase() == strClassUpper ) {
				return true;
			}
		}
	}

	return false;

}

function addClassName(objElement, strClass) {

	if ( objElement.className ) {
		var arrList = objElement.className.split(' ');

		var strClassUpper = strClass.toUpperCase();
		for ( var i = 0; i < arrList.length; i++ ) {
			if ( arrList[i].toUpperCase() == strClassUpper ) {
				arrList.splice(i, 1);
				i--;
			}
		}

		arrList[arrList.length] = strClass;
		objElement.className = arrList.join(' ');
	}

	else {
		objElement.className = strClass;
	}
}

function removeClassName(objElement, strClass) {

	if ( objElement.className ) {

		var arrList = objElement.className.split(' ');
		var strClassUpper = strClass.toUpperCase();

		for ( var i = 0; i < arrList.length; i++ ) {

			if ( arrList[i].toUpperCase() == strClassUpper ) {
				arrList.splice(i, 1);
				i--;
			}

		}

		objElement.className = arrList.join(' ');

	}
}

//////////////////////
//
// Currency Support
//
//////////////////////

function addCommas(nStr)
{
	nStr += '';
	x = nStr.split('.');
	x1 = x[0];
	x2 = x.length > 1 ? '.' + x[1] : '';
	var rgx = /(\d+)(\d{3})/;
	while (rgx.test(x1)) {
		x1 = x1.replace(rgx, '$1' + ',' + '$2');
	}
	return x1 + x2;
}
