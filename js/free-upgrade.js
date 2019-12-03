// This file is loaded at the end of the buy.html document.

var serverConfig = {};
var host = window.location.hostname;

$.ajaxSetup({
  contentType: 'application/json',
  jsonp: false
});

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


function submitFreeUpgradeForm(productID) {
  var url;
  var payload;
  var oldSerial;
  var form;

  $(document).ajaxError(function handleAjaxError(event, request, settings) {
    var errorForm;
    var errorURL = 'https://' + serverConfig.returnHost + '/order/problem.php';
    var reason;
    var parsedResponse;

    if (siteLang === 'JP') {
      errorURL = 'https://' + serverConfig.returnHost + '/jp/order/problem.php';
    }

    if (request && request.responseText) {
      console.log(request.responseText);
      parsedResponse = JSON.parse(request.responseText);
      if (parsedResponse.success !== 0) {
        reason = parsedResponse.reason || 'Server Error';
        errorForm = $('<form action="' + errorURL + '" method="post" style="display:none;">' +
          '<input type="text" name="reason" value="' + reason + '" />' +
          '</form>');
        $('body').append(errorForm);
        errorForm.submit();
      } else {
        errorForm = $('<form action="' + errorURL + '" method="post" style="display:none;">' +
          '<input type="text" name="reason" value="Could not parse server response." />' +
          '</form>');
        $('body').append(errorForm);
        errorForm.submit();
      }
    } else {
      errorForm = $('<form action="' + errorURL + '" method="post" style="display:none;">' +
        '<input type="text" name="reason" value="Server Error" />' +
        '</form>');
      $('body').append(errorForm);
      errorForm.submit();
    }
  });

  oldSerial = $('#oldSerial').val();
  url = 'https://' + serverConfig.circleHost + '/api/v1/upgrade_o_matic/' + productID + '/';
  payload = {
    serial_number: oldSerial
  };

  $.post(url, JSON.stringify(payload), function handlePostData(data) {
    var completeURL = 'https://' + serverConfig.returnHost + '/order/thanks.php';

    if (siteLang === 'JP') {
      completeURL = 'https://' + serverConfig.returnHost + '/jp/order/thanks.php';
    }

    form = $('<form action="' + completeURL + '" method="post" style="display:none;">' +
      '<input type="text" name="order_id" value="' + data.order_id + '" />' +
      '<input type="text" name="serial_number" value="' + data.serial_number + '" />' +
      '</form>');
    $('body').append(form);
    form.submit();
  }, 'json');

  return false;
}
