function port_handler() {
    this.initial_ports = false;
    
    this.port_detected_callbacks = [];
    this.port_removed_callbacks = [];
}

port_handler.prototype.initialize = function() {
    var self = this;
    
    // 250ms refresh interval, fire instantly after creation
    GUI.interval_add('port_handler', function() {
        serial.getDevices(function(current_ports) {
            // port got removed or initial_ports wasn't initialized yet
            if (self.array_difference(self.initial_ports, current_ports).length > 0 || !self.initial_ports) {
                var removed_ports = self.array_difference(self.initial_ports, current_ports);
                
                if (self.initial_ports != false) {
                    if (removed_ports.length > 1) {
                        console.log('Ports removed: ' + removed_ports);
                    } else {
                        console.log('Port removed: ' + removed_ports[0]);
                    }
                }
                
                self.update_port_select(current_ports);
                
                // trigger callbacks (only after initialization)
                if (self.initial_ports) {
                    for (var i = 0; i < self.port_removed_callbacks.length; i++) {
                        var obj = self.port_removed_callbacks[i];
                        
                        // remove timeout
                        GUI.timeout_remove(obj.name);
                        
                        // trigger callback
                        obj.code(removed_ports);
                    }
                    self.port_removed_callbacks = []; // drop references
                }
                
                // auto-select last used port (only during initialization)
                if (!self.initial_ports) {
                    chrome.storage.local.get('last_used_port', function(result) {
                        // if last_used_port was set, we try to select it
                        if (result.last_used_port) {                            
                            current_ports.forEach(function(port) {
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
                    console.log('Ports found: ' + new_ports);
                } else {
                    console.log('Port found: ' + new_ports[0]);
                }
                
                self.update_port_select(current_ports);
                
                // select / highlight new port, if connected -> select connected port
                if (!GUI.connected_to) {
                    $('div#controls #port').val(new_ports[0]);
                } else {   
                    $('div#controls #port').val(GUI.connected_to);
                }
                
                // trigger callbacks
                for (var i = 0; i < self.port_detected_callbacks.length; i++) {
                    var obj = self.port_detected_callbacks[i];
                    
                    // remove timeout
                    GUI.timeout_remove(obj.name);
                    
                    // trigger callback
                    obj.code(new_ports);
                }
                self.port_detected_callbacks = []; // drop references
                
                self.initial_ports = current_ports;
            }
        });
    }, 250, true);
};

port_handler.prototype.update_port_select = function(ports) {
    $('div#controls #port').html(''); // drop previous one
    
    if (ports.length > 0) {
        for (var i = 0; i < ports.length; i++) {
            $('div#controls #port').append($("<option/>", {value: ports[i], text: ports[i]}));
        }
    } else {
        $('div#controls #port').append($("<option/>", {value: 0, text: 'No Ports'}));
    }  
};

port_handler.prototype.port_detected = function(name, code, timeout) {
    var self = this;
    var obj = {'name': name, 'code': code, 'timeout': timeout};
    
    if (timeout) {
        GUI.timeout_add(name, function() {
            console.log('PortHandler - port detected timeout triggered - ' + obj.name);
        
            // trigger callback
            code(false);
            
            // reset callback array
            self.port_detected_callbacks = [];
        }, timeout);
    }
    
    this.port_detected_callbacks.push(obj);
};

port_handler.prototype.port_removed = function(name, code, timeout) {
    var self = this;
    var obj = {'name': name, 'code': code, 'timeout': timeout};
    
    if (timeout) {
        GUI.timeout_add(name, function() {
            console.log('PortHandler - port removed timeout triggered - ' + obj.name);
            
            // trigger callback
            code(false);
            
            // reset callback array
            self.port_removed_callbacks = [];
        }, timeout);
    }
    
    this.port_removed_callbacks.push(obj);
};

// accepting single level array with "value" as key
port_handler.prototype.array_difference = function(firstArray, secondArray) {
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

var PortHandler = new port_handler();