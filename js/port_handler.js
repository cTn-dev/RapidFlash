'use strict';

var PortHandler = new function () {
    this.main_timeout_reference;
    this.initial_ports = false;

    this.port_detected_callbacks = [];
    this.port_removed_callbacks = [];
}

PortHandler.initialize = function () {
    // start listening, check after 250ms
    this.check();
};

PortHandler.check = function () {
    var self = this;

    serial.getDevices(function(current_ports) {
        // port got removed or initial_ports wasn't initialized yet
        if (self.array_difference(self.initial_ports, current_ports).length > 0 || !self.initial_ports) {
            var removed_ports = self.array_difference(self.initial_ports, current_ports);

            if (self.initial_ports != false) {
                if (removed_ports.length > 1) {
                    console.log('PortHandler - Removed: ' + removed_ports);
                } else {
                    console.log('PortHandler - Removed: ' + removed_ports[0]);
                }
            }

            self.update_port_select(current_ports);

            // trigger callbacks (only after initialization)
            if (self.initial_ports) {
                for (var i = (self.port_removed_callbacks.length - 1); i >= 0; i--) {
                    var obj = self.port_removed_callbacks[i];

                    // remove timeout
                    clearTimeout(obj.timer);

                    // trigger callback
                    obj.code(removed_ports);

                    // cleanup
                    self.port_removed_callbacks.splice(self.port_removed_callbacks.indexOf(obj), 1);
                }
            }

            // auto-select last used port (only during initialization)
            if (!self.initial_ports) {
                chrome.storage.local.get('last_used_port', function (result) {
                    // if last_used_port was set, we try to select it
                    if (result.last_used_port) {
                        current_ports.forEach(function (port) {
                            if (port == result.last_used_port) {
                                console.log('Selecting last used port: ' + result.last_used_port);

                                $('div#controls #port').val(result.last_used_port);
                            }
                        });
                    } else {
                        console.log('Last used port wasn\'t saved "yet", auto-select disabled.');
                    }
                });
            }

            if (!self.initial_ports) {
                // initialize
                self.initial_ports = current_ports;
            } else {
                for (var i = 0; i < removed_ports.length; i++) {
                    self.initial_ports.splice(self.initial_ports.indexOf(removed_ports[i]), 1);
                }
            }
        }

        // new port detected
        var new_ports = self.array_difference(current_ports, self.initial_ports);

        if (new_ports.length) {
            if (new_ports.length > 1) {
                console.log('PortHandler - Found: ' + new_ports);
            } else {
                console.log('PortHandler - Found: ' + new_ports[0]);
            }

            self.update_port_select(current_ports);

            // select / highlight new port, if connected -> select connected port
            if (!GUI.connected_to) {
                $('div#controls #port').val(new_ports[0]);
            } else {
                $('div#controls #port').val(GUI.connected_to);
            }

            // trigger callbacks
            for (var i = (self.port_detected_callbacks.length - 1); i >= 0; i--) {
                var obj = self.port_detected_callbacks[i];

                // remove timeout
                clearTimeout(obj.timer);

                // trigger callback
                obj.code(new_ports);

                // cleanup
                self.port_detected_callbacks.splice(self.port_detected_callbacks.indexOf(obj), 1);
            }

            self.initial_ports = current_ports;
        }

        if (GUI.optional_usb_permissions) {
            check_usb_devices();
        }

        self.main_timeout_reference = setTimeout(function () {
            self.check();
        }, 250);
    });

    function check_usb_devices() {
        chrome.usb.getDevices(usbDevices.USBASP, function (result) {
            if (result.length) {
                if (!$("div#controls #port [value='usbasp']").length) {
                    $('div#controls #port').append('<option value="usbasp">USBASP</option>');
                    $('div#controls #port').val('usbasp');
                }
            } else {
                if ($("div#controls #port [value='usbasp']").length) {
                   $("div#controls #port [value='usbasp']").remove();
                }
            }
        });
    }
};

PortHandler.update_port_select = function (ports) {
    $('div#controls #port').html(''); // drop previous one

    if (ports.length > 0) {
        for (var i = 0; i < ports.length; i++) {
            $('div#controls #port').append($("<option/>", {value: ports[i], text: ports[i]}));
        }
    } else {
        $('div#controls #port').append($("<option/>", {value: 0, text: 'No Ports'}));
    }
};

PortHandler.port_detected = function (name, code, timeout) {
    var self = this;
    var obj = {'name': name, 'code': code, 'timeout': (timeout) ? timeout : 10000};

    obj.timer = setTimeout(function() {
        console.log('PortHandler - timeout - ' + obj.name);

        // trigger callback
        code(false);

        self.port_detected_callbacks.splice(self.port_detected_callbacks.indexOf(obj), 1);
    }, (timeout) ? timeout : 10000);

    this.port_detected_callbacks.push(obj);

    return obj;
};

PortHandler.port_removed = function (name, code, timeout) {
    var self = this;
    var obj = {'name': name, 'code': code, 'timeout': (timeout) ? timeout : 10000};

    obj.timer = setTimeout(function() {
        console.log('PortHandler - timeout - ' + obj.name);

        // trigger callback
        code(false);

        self.port_removed_callbacks.splice(self.port_removed_callbacks.indexOf(obj), 1);
    }, (timeout) ? timeout : 10000);

    this.port_removed_callbacks.push(obj);

    return obj;
};

// accepting single level array with "value" as key
PortHandler.array_difference = function (firstArray, secondArray) {
    var cloneArray = [];

    // create hardcopy
    for (var i = 0; i < firstArray.length; i++) {
        cloneArray.push(firstArray[i]);
    }

    for (var i = 0; i < secondArray.length; i++) {
        if (cloneArray.indexOf(secondArray[i]) != -1) {
            cloneArray.splice(cloneArray.indexOf(secondArray[i]), 1);
        }
    }

    return cloneArray;
};