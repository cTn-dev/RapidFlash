/*
    USBasp uses:
    control transfers for communicating
    recipient is device
    request type is vendor

    Descriptors seems to be broken in current chrome.usb API implementation (writing this while using canary 37.0.2040.0
*/

var USBasp_protocol = function() {
    this.hex; // ref
    this.verify_hex;

    this.handle = null; // connection handle

    this.func = {
        CONNECT:            1,
        DISCONNECT:         2,
        TRANSMIT:           3,
        READFLASH:          4,
        ENABLEPROG:         5,
        WRITEFLASH:         6,
        READEEPROM:         7,
        WRITEEEPROM:        8,
        SETLONGADDRESS:     9,
        SETISPSCK:          10,
        TPI_CONNECT:        11,
        TPI_DISCONNECT:     12,
        TPI_RAWREAD:        13,
        TPI_RAWWRITE:       14,
        TPI_READBLOCK:      15,
        TPI_WRITEBLOCK:     16,
        GETCAPABILITIES:    127
    };
};

USBasp_protocol.prototype.connect = function(hex) {
    var self = this;
    self.hex = hex;

    // reset and set some variables before we start
    self.upload_time_start = microtime();
    self.verify_hex = [];

    chrome.usb.getDevices(usbDevices.USBASP, function(result) {
        if (result.length) {
            console.log('USBasp detected with ID: ' + result[0].device);

            self.openDevice(result[0]);
        } else {
            // TODO: throw some error
        }
    });
};

USBasp_protocol.prototype.openDevice = function(device) {
    var self = this;

    chrome.usb.openDevice(device, function(handle) {
        self.handle = handle;

        console.log('Device opened with Handle ID: ' + handle.handle);
        self.claimInterface(0);
    });
};

USBasp_protocol.prototype.closeDevice = function() {
    var self = this;

    chrome.usb.closeDevice(this.handle, function closed() {
        console.log('Device closed with Handle ID: ' + self.handle.handle);

        self.handle = null;
    });
};

USBasp_protocol.prototype.claimInterface = function(interfaceNumber) {
    var self = this;

    chrome.usb.claimInterface(this.handle, interfaceNumber, function claimed() {
        console.log('Claimed interface: ' + interfaceNumber);

        self.upload_procedure(1);
    });
};

USBasp_protocol.prototype.releaseInterface = function(interfaceNumber) {
    var self = this;

    chrome.usb.releaseInterface(this.handle, interfaceNumber, function released() {
        console.log('Released interface: ' + interfaceNumber);

        self.closeDevice();
    });
};

USBasp_protocol.prototype.resetDevice = function(callback) {
    chrome.usb.resetDevice(this.handle, function(result) {
        console.log('Reset Device: ' + result);

        if (callback) callback();
    });
};

USBasp_protocol.prototype.controlTransfer = function(direction, request, value, interface, length, data, callback) {
    if (direction == 'in') {
        // data is ignored
        chrome.usb.controlTransfer(this.handle, {
            'direction':    'in',
            'recipient':    'device',
            'requestType':  'vendor',
            'request':      request,
            'value':        value,
            'index':        interface,
            'length':       length
        }, function(result) {
            if (result.resultCode) console.log(result.resultCode);

            var buf = new Uint8Array(result.data);
            callback(buf, result.resultCode);
        });
    } else {
        // length is ignored
        if (data) {
            var arrayBuf = new ArrayBuffer(data.length);
            var arrayBufView = new Uint8Array(arrayBuf);
            arrayBufView.set(data);
        } else {
            var arrayBuf = new ArrayBuffer(0);
        }

        chrome.usb.controlTransfer(this.handle, {
            'direction':    'out',
            'recipient':    'device',
            'requestType':  'vendor',
            'request':      request,
            'value':        value,
            'index':        interface,
            'data':         arrayBuf
        }, function(result) {
            if (result.resultCode) console.log(result.resultCode);

            callback(result);
        });
    }
};

USBasp_protocol.prototype.verify_flash = function(first_array, second_array) {
    for (var i = 0; i < first_array.length; i++) {
        if (first_array[i] != second_array[i]) {
            console.log('Verification failed on byte: ' + i + ' expected: 0x' + first_array[i].toString(16) + ' received: 0x' + second_array[i].toString(16));
            return false;
        }
    }

    console.log('Verification successful, matching: ' + first_array.length + ' bytes');

    return true;
};

USBasp_protocol.prototype.upload_procedure = function(step) {
    var self = this;

    switch (step) {
        case 1:
            self.upload_procedure(99);
            break;
        case 99:
            // cleanup
            console.log('Script finished after: ' + (microtime() - self.upload_time_start).toFixed(4) + ' seconds');

            self.releaseInterface(0);
            break;
    }
};

// initialize object
var USBASP = new USBasp_protocol();