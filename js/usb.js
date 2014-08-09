'use strict';

var usbDevices = {
    USBASP: {'vendorId': 5824, 'productId': 1500}
};
var usbPermissions = {permissions: [{'usbDevices': [usbDevices.USBASP]}]};

function check_usb_permissions(callback) {
    chrome.permissions.contains(usbPermissions, function(result) {
        if (result) {
            GUI.optional_usb_permissions = true;
        } else {
            console.log('Optional USB permissions: missing');
        }

        if (callback) callback();
    });
}