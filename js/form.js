// form.js – Code specific to the Transmit 5 page order form.


var serverConfig = {};
var host = window.location.hostname;
var resellerSearch = /reseller$/g;
var isResellerPage = resellerSearch.exec(document.URL) === 'reseller';

var submitButtonElement = document.getElementById('submitButton');
var stripeErrorBlock = document.getElementById('stripeErrorBlock');

/* global finalVerifyForm, loadError */

if (host === 'panic.vagrant.panic.com') {
  serverConfig.stripeKey = 'pk_KvOi6wWkxC6Xw3N10ILhYpu9NzROs';
  serverConfig.circleHost = 'circle.vagrant.panic.com';
  serverConfig.returnHost = 'panic.vagrant.panic.com';
} else if (host === 'stage.panic.com') {
  serverConfig.stripeKey = 'pk_KvOi6wWkxC6Xw3N10ILhYpu9NzROs';
  serverConfig.circleHost = 'circle-stage.panic.com';
  serverConfig.returnHost = 'stage.panic.com';
} else {
  serverConfig.stripeKey = 'pk_E8oayb1ZHxxFecprCWgxT2GxhHVrF';
  serverConfig.circleHost = 'circle.panic.com';
  serverConfig.returnHost = 'panic.com';
}

$.ajaxSetup({
  contentType: 'application/json',
  jsonp: false
});

function postOrderSuccessStripe(parsedResponse) {
  var form;
  var url = 'https://' + serverConfig.returnHost + '/order/thanks.php';

  if (siteLang === 'JP') {
    url = 'https://' + serverConfig.returnHost + '/jp/order/thanks.php';
  }

  form = $('<form action="' + url + '" method="post" style="display:none;">' +
    '<input type="text" name="order_id" value="' + parsedResponse.order_id + '" />' +
    '<input type="text" name="serial_number" value="' + parsedResponse.serial_number + '" />' +
    '<input type="text" name="product_name" value="' + parsedResponse.product_name + '" />' +
    '<input type="text" name="product_short" value="' + parsedResponse.product_short + '" />' +
    '</form>');
  $('body').append(form);
  form.submit();
}

function postOrderSuccessBankTransfer(parsedResponse) {
  var orderID = parsedResponse.order_id;

  var url = 'https://' + serverConfig.returnHost + '/jp/transmit/ginfuri.php';
  var form = $('<form action="' + url + '" method="post">' +
    '<input type="text" name="order_id" value="' + orderID + '" />' +
    '</form>');
  $('body').append(form);
  form.submit();
}

function postOrder(token, shippingContact, paymentMethod, completion) {
  var elist = false;
  var quantity = parseInt(document.getElementById('transmit5').value, 10);
  var promoCode = document.getElementById('promoCode').value;
  var url, payload, currencyCode;

  if ($('#listSignup').is(':checked')) {
    elist = true;
  }

  if (siteLang === 'EN') {
    currencyCode = 'usd';
  } else if (siteLang === 'JP') {
    currencyCode = 'jpy';
  }

  if (paymentMethod === 'bank-transfer') {
    url = 'https://' + serverConfig.circleHost + '/api/v1/ginfuri_purchase/';
    payload = {
      email: shippingContact.emailAddress,
      name: [shippingContact.givenName, shippingContact.familyName].filter(function takeBoth(val) {
        return val;
      }).join(' '),
      item_id: 'transmit5',
      quantity: quantity,
      currency: currencyCode,
      promo_code: promoCode,
      elist: elist,
      address: shippingContact
    };
  } else if (paymentMethod === 'stripe') {
    url = 'https://' + serverConfig.circleHost + '/api/v1/stripe_purchase/';
    payload = {
      email: shippingContact.emailAddress,
      name: [shippingContact.givenName, shippingContact.familyName].filter(function fil(val) {
        return val;
      }).join(' '),
      item_id: 'transmit5',
      quantity: quantity,
      stripe_token: token.id,
      reseller: isResellerPage,
      currency: currencyCode,
      promo_code: promoCode,
      elist: elist
    };
  }

  $(document).ajaxError(function ajaxError(ajaxEvent, request) {
    var form;
    var errorURL = 'https://' + serverConfig.returnHost + '/order/problem.php';
    var parsedResponse = JSON.parse(request.responseText);
    var reason = parsedResponse.reason || 'Server Error';

    if (typeof completion === 'function') {
      completion(false);
    }

    if (request && request.responseText) {
      if (parsedResponse.success !== 0) {
        form = $('<form action="' + errorURL + '" method="post" style="display:none;">' +
          '<input type="text" name="reason" value="' + reason + '" />' +
          '</form>');
        $('body').append(form);
        form.submit();
        return;
      }
    }

    form = $('<form action="' + errorURL + '" method="post" style="display:none;">' +
      '<input type="text" name="reason" value="Could not parse server reseponse." />' +
      '</form>');
    $('body').append(form);
    form.submit();
  });

  $.post(url, JSON.stringify(payload), function handlePost(data) {
    if (typeof completion === 'function') {
      completion(true);
    }
    if (paymentMethod === 'bank-transfer') {
      postOrderSuccessBankTransfer(data);
    } else if (paymentMethod === 'stripe') {
      postOrderSuccessStripe(data);
    }
  }, 'json');
}

function stripeResponseHandler(status, response) {
  var token = response.id;
  var shippingContact = {};
  var stripeTokenField = document.getElementById('stripeToken');
  var orderSourceField = document.getElementById('orderSource');

  if (response.error) {
    alert(response.error.message);

    submitButtonElement.disabled = false;
    submitButtonElement.value = 'Process My Order!';
  } else {
    stripeTokenField.value = token;
    orderSourceField.value = 'submitForm';

    shippingContact.givenName = $('#name').val();
    shippingContact.emailAddress = $('#e-mail').val();
    postOrder(response, shippingContact, 'stripe');
  }
}

/* exported submitForm */
function submitForm() {
  var shippingContact = {};
  var addressInput, cityInput, stateInput;
  var form = document.getElementById('buy-form');
  var bt = document.getElementById('Bank-Transfer');

  if (finalVerifyForm('true') === false) {
    return false;
  }

  addressInput = document.getElementById('address');
  if (addressInput.value.length >= 128) {
    alert('Address too long! Please shorten to less than 128 characters and try again.');
    return false;
  }

  cityInput = document.getElementById('city');
  if (cityInput.value.length >= 128) {
    alert('City too long! Please shorten to less than 128 characters and try again.');
    return false;
  }

  stateInput = document.getElementById('state');
  if (stateInput !== null && stateInput.value.length >= 128) {
    alert('State too long! Please shorten to less than 128 characters and try again.');
    return false;
  }

  submitButtonElement.disabled = true;
  submitButtonElement.value = 'Processing!';

  if (bt !== null && bt.checked === true) {
    shippingContact.givenName = $('#name').val();
    shippingContact.emailAddress = $('#e-mail').val();
    shippingContact.addressLine1 = $('#address').val();
    shippingContact.addressLine2 = $('#company').val();
    shippingContact.city = $('#city').val();
    shippingContact.state = $('#state').val();
    shippingContact.zipCode = $('#zipcode').val();
    shippingContact.country = $('#country').val();

    postOrder(null, shippingContact, 'bank-transfer');
  } else {
    Stripe.card.createToken(form, stripeResponseHandler);
  }

  return false;
}


// Paypal submission
function postOrderSuccessPaypal(parsedResponse) {
  window.location.href = parsedResponse.redirect_url;
}

function beginPayPal(event) {
  var quantity = parseInt(document.getElementById('transmit5').value, 10);
  var promoCode = document.getElementById('promoCode').value;
  var url, payload, currencyCode;

  // Cancel order form submission if that was going to happen via a <button>
  event.preventDefault();

  if (siteLang === 'EN') {
    currencyCode = 'usd';
  } else if (siteLang === 'JP') {
    currencyCode = 'jpy';
  }

  url = 'https://' + serverConfig.circleHost + '/api/v1/paypal_purchase/';
  payload = {
    item_id: 'transmit5',
    quantity: quantity,
    success_return_url: 'https://' + serverConfig.returnHost + '/order/thanks.php',
    failure_return_url: 'https://' + serverConfig.returnHost + '/order/problem.php',
    currency: currencyCode,
    promo_code: promoCode
  };

  if (siteLang === 'JP') {
    payload.success_return_url = 'https://' + serverConfig.returnHost + '/jp/order/thanks.php';
    payload.failure_return_url = 'https://' + serverConfig.returnHost + '/jp/order/problem.php';
  }

  $(document).ajaxError(function ajaxErrorInner(ajaxEvent, request) {
    var form, parsedResponse, reason;
    var errorURL = payload.failure_return_url;

    if (request && request.responseText) {
      parsedResponse = JSON.parse(request.responseText);
      if (parsedResponse.success !== 0) {
        reason = parsedResponse.reason || 'Server Error';
        form = $('<form action="' + errorURL + '" method="post" style="display:none;">' +
          '<input type="text" name="reason" value="' + reason + '" />' +
          '</form>');
        $('body').append(form);
        form.submit();
        return;
      }
    }

    form = $('<form action="' + errorURL + '" method="post" style="display:none;">' +
      '<input type="text" name="reason" value="Could not parse server reseponse." />' +
      '</form>');
    $('body').append(form);
    form.submit();
  });

  $.post(url, JSON.stringify(payload), function postInner(data) {
    postOrderSuccessPaypal(data);
  }, 'json');
}


// Apple Pay Submission

/* global theTotal, theCountry, theCurrency */

function beginApplePay(event) {
  var session, paymentRequest;
  var quantity = document.getElementById('transmit5').value;
  var amount = theTotal;

  // Cancel order form submission if that was going to happen via a <button>
  event.preventDefault();

  // Build the payment request

  paymentRequest = {
    countryCode: theCountry,
    currencyCode: theCurrency,
    requiredBillingContactFields: ['postalAddress'],
    requiredShippingContactFields: [
      'email', 'name'
    ],
    lineItems: [{
      type: 'final',
      label: quantity + ' × Transmit 5',
      amount: amount
    }],
    total: {
      label: 'Panic Inc.',
      amount: amount
    }
  };

  // site_lang defined in the page js
  if (siteLang === 'EN') {
    paymentRequest.countryCode = 'US';
    paymentRequest.currencyCode = 'USD';
  } else if (siteLang === 'JP') {
    paymentRequest.countryCode = 'JP';
    paymentRequest.currencyCode = 'JPY';
  }

  session = Stripe.applePay.buildSession(paymentRequest, function buildSessionInner(result, completion) {
    var token = result.token;
    var shippingContact = result.shippingContact;

    if (token && token.id) {
      postOrder(token, shippingContact, 'stripe', function postOrderSuccess(success) {
        if (success) {
          completion(ApplePaySession.STATUS_SUCCESS);
        } else {
          completion(ApplePaySession.STATUS_FAILURE);
        }
      });
    } else {
      console.log('Apple Pay Failed: No token or token.id supplied buildSession.');
      completion(ApplePaySession.STATUS_FAILURE);
    }
  }, function buildSessionError(error) {
    console.error(error.message);
  });

  session.begin();
}

// Make quantity field wider if necessary

/* exported setQuantWidth */
function setQuantWidth() {
  var quantField = $('#transmit5');
  var quantity = quantField.val();
  if (quantity < 10) {
    quantField.css('width', '2em');
  } else if (quantity < 100) {
    quantField.css('width', '2.5em');
  } else if (quantity < 1000) {
    quantField.css('width', '3em');
  }
}

$(document).ready(function documentReadyInner() {
  if (typeof Stripe === 'undefined') {
    submitButtonElement.disabled = true;
    submitButtonElement.value = 'Purchase Unavailable';
    stripeErrorBlock.style.display = 'block';
  } else {
    Stripe.setPublishableKey(serverConfig.stripeKey);
    Stripe.applePay.checkAvailability(function stripeAvailableReturn(available) {
      if (available) {
        document.body.dataset.applepay = true;
      }
    });

    document.getElementById('button-applepay').addEventListener('click', beginApplePay);
    document.getElementById('applepay').addEventListener('click', beginApplePay);
  }

  document.getElementById('paypal-buy-button').addEventListener('click', beginPayPal);
});
