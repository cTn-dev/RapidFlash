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
    this.chip_erased = false; // on chip erase mcu reboots, we need to keep track

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
    self.chip_erased = false;

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

USBasp_protocol.prototype.loadAddress = function(address, callback) {
    var self = this;

    self.controlTransfer('out', self.func.SETLONGADDRESS, 0, 0, 0, [address, (address >> 8), (address >> 16), (address >> 24)], function() {
        callback();
    });
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
            self.controlTransfer('in', self.func.CONNECT, 0, 0, 4, 0, function(data) {
                self.upload_procedure(2);
            });
            break;
        case 2:
            self.controlTransfer('in', self.func.ENABLEPROG, 0, 0, 4, 0, function(data) {
                if (data[0] == 0) {
                    if (!self.chip_erased) {
                        self.upload_procedure(3);
                    } else {
                        self.upload_procedure(8);
                    }
                } else {
                    console.log('Target not found? i dont know');
                    self.upload_procedure(99);
                }
            });
            break;
        case 3:
            // chip id
            var i = 0;
            var id = 0;

            function get_chip_id() {
                self.controlTransfer('in', self.func.TRANSMIT, 0x30, i++, 4, 0, function(data) {
                    id |= data[3] << 8 * (3 - i);

                    if (i < 3) {
                        get_chip_id();
                    } else {
                        // we should verify chip ID, if we support it, continue
                        console.log('Chip ID: ' + id);
                        self.upload_procedure(4);
                    }
                });
            }

            get_chip_id();
            break;
        case 4:
            // low fuse
            var i = 0;
            var low_fuse = null;

            function read_low_fuse() {
                self.controlTransfer('in', self.func.TRANSMIT, 0x0050, 0, 4, 0, function(data) {
                    if (i < 3) {
                        if (low_fuse == data[3]) {
                            low_fuse = data[3];
                            i++;
                            read_low_fuse();
                        } else {
                            i = 0;
                            low_fuse = data[3];
                            read_low_fuse();
                        }
                    } else {
                        console.log('Low fuse: ' + low_fuse);
                        self.upload_procedure(5);
                    }
                });
            }

            read_low_fuse();
            break;
        case 5:
            // high fuse
            var i = 0;
            var high_fuse = null;

            function read_high_fuse() {
                self.controlTransfer('in', self.func.TRANSMIT, 0x0858, 0, 4, 0, function(data) {
                    if (i < 3) {
                        if (high_fuse == data[3]) {
                            high_fuse = data[3];
                            i++;
                            read_high_fuse();
                        } else {
                            i = 0;
                            high_fuse = data[3];
                            read_high_fuse();
                        }
                    } else {
                        console.log('High fuse: ' + high_fuse);
                        self.upload_procedure(6);
                    }
                });
            }

            read_high_fuse();
            break;
        case 6:
            // e fuse
            var i = 0;
            var e_fuse = null;

            function read_e_fuse() {
                self.controlTransfer('in', self.func.TRANSMIT, 0x0850, 0, 4, 0, function(data) {
                    if (i < 3) {
                        if (e_fuse == data[3]) {
                            e_fuse = data[3];
                            i++;
                            read_e_fuse();
                        } else {
                            i = 0;
                            e_fuse = data[3];
                            read_e_fuse();
                        }
                    } else {
                        console.log('E fuse: ' + e_fuse);
                        self.upload_procedure(7);
                    }
                });
            }

            read_e_fuse();
            break;
        case 7:
            // chip erase
            console.log('Executing global chip erase');

            self.controlTransfer('in', self.func.TRANSMIT, 0x80AC, 0, 4, 0, function(data) {
                self.chip_erased = true;
                self.upload_procedure(1);
            });
            break;
        case 8:
            // write
            // code below might be completely wrong since i don't understand the buffer sequence for avrdude: usbasp_transmit("USBASP_FUNC_WRITEFLASH", 0x00, 0x04, 0x80, 0x03)
            // my buest guess is that first byte indicates the position in a block, second byte indicates block, third byte is transmission length, and fourth i got no clue
            console.log('Writing ...');

            var blocks = self.hex.data.length - 1;
            var flashing_block = 0;
            var address = self.hex.data[flashing_block].address;
            var bytes_flashed = 0;

            function write_to_flash() {
                if (bytes_flashed < self.hex.data[flashing_block].bytes) {
                    var bytes_to_write = ((bytes_flashed + 128) <= self.hex.data[flashing_block].bytes) ? 128 : (self.hex.data[flashing_block].bytes - bytes_flashed);
                    var data_to_flash = self.hex.data[flashing_block].data.slice(bytes_flashed, bytes_flashed + bytes_to_write);

                    self.loadAddress(address, function() {
                        self.controlTransfer('out', self.func.WRITEFLASH, 0, 0, bytes_to_write, data_to_flash, function() {
                            address += bytes_to_write;
                            bytes_flashed += bytes_to_write;

                            write_to_flash();
                        });
                    });
                } else {
                    if (flashing_block < blocks) {
                        // move to another block
                        flashing_block++;

                        address = self.hex.data[flashing_block].address;
                        bytes_flashed = 0;

                        write_to_flash();
                    } else {
                        // all blocks flashed
                        console.log('Writing: done');

                        // proceed to next step
                        self.upload_procedure(9);
                    }
                }
            }

            write_to_flash();
            break;
        case 9:
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