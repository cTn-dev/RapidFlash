/*
    [MESSAGE_START 1b][SEQUENCE_NUMBER 1b][MESSAGE_SIZE 2b, MSB first][TOKEN 1b][MESSAGE_BODY 0-65535b][CHECKSUM 1b]
    
    CHECKSUM = Uses all characters in message including MESSAGE_START and MESSAGE_BODY, XOR of all bytes
*/

var STK500v2_protocol = function() {
    this.hex; // ref
    this.verify_hex;
    
    this.message = {
        MESSAGE_START:              0x1B,
        TOKEN:                      0x0E,
        ANSWER_CKSUM_ERROR:         0xB0
    };
    
    this.command = {
        CMD_SIGN_ON:                0x01,
        CMD_SET_PARAMETER:          0x02,
        CMD_GET_PARAMETER:          0x03,
        CMD_SET_DEVICE_PARAMETERS:  0x04,
        CMD_OSCCAL:                 0x05,
        CMD_LOAD_ADDRESS:           0x06,
        CMD_FIRMWARE_UPGRADE:       0x07,
        
        CMD_ENTER_PROGMODE_ISP:     0x10,
        CMD_LEAVE_PROGMODE_ISP:     0x11,
        CMD_CHIP_ERASE_ISP:         0x12,
        CMD_PROGRAM_FLASH_ISP:      0x13,
        CMD_READ_FLASH_ISP:         0x14,
        CMD_PROGRAM_EEPROM_ISP:     0x15,
        CMD_READ_EEPROM_ISP:        0x16,
        CMD_PROGRAM_FUSE_ISP:       0x17,
        CMD_READ_FUSE_ISP:          0x18,
        CMD_PROGRAM_LOCK_ISP:       0x19,
        CMD_READ_LOCK_ISP:          0x1A,
        CMD_READ_SIGNATURE_ISP:     0x1B,
        CMD_READ_OSCCAL_ISP:        0x1C,
        CMD_SPI_MULTI:              0x1D,
        
        CMD_ENTER_PROGMODE_PP:      0x20,
        CMD_LEAVE_PROGMODE_PP:      0x21,
        CMD_CHIP_ERASE_PP:          0x22,
        CMD_PROGRAM_FLASH_PP:       0x23,
        CMD_READ_FLASH_PP:          0x24,
        CMD_PROGRAM_EEPROM_PP:      0x25,
        CMD_READ_EEPROM_PP:         0x26,
        CMD_PROGRAM_FUSE_PP:        0x27,
        CMD_READ_FUSE_PP:           0x28,
        CMD_PROGRAM_LOCK_PP:        0x29,
        CMD_READ_LOCK_PP:           0x2A,
        CMD_READ_SIGNATURE_PP:      0x2B,
        CMD_READ_OSCCAL_PP:         0x2C,
        CMD_SET_CONTROL_STACK:      0x2D,
        
        CMD_ENTER_PROGMODE_HVSP:    0x30,
        CMD_LEAVE_PROGMODE_HVSP:    0x31,
        CMD_CHIP_ERASE_HVSP:        0x32,
        CMD_PROGRAM_FLASH_HVSP:     0x33,
        CMD_READ_FLASH_HVSP:        0x34,
        CMD_PROGRAM_EEPROM_HVSP:    0x35,
        CMD_READ_EEPROM_HVSP:       0x36,
        CMD_PROGRAM_FUSE_HVSP:      0x37,
        CMD_READ_FUSE_HVSP:         0x38,
        CMD_PROGRAM_LOCK_HVSP:      0x39,
        CMD_READ_LOCK_HVSP:         0x3A,
        CMD_READ_SIGNATURE_HVSP:    0x3B,
        CMD_READ_OSCCAL_HVSP:       0x3C
    };
    
    this.status = {
        STATUS_CMD_OK:              0x00,
        STATUS_CMD_TOUT:            0x80,
        STATUS_RDY_BSY_TOUT:        0x81,
        STATUS_SET_PARAM_MISSING:   0x82,
        STATUS_CMD_FAILED:          0xC0,
        STATUS_CKSUM_ERROR:         0xC1,
        STATUS_CMD_UNKNOWN:         0xC9
    };
    
    this.param = {
        PARAM_BUILD_NUMBER_LOW:     0x80,
        PARAM_BUILD_NUMBER_HIGH:    0x81,
        PARAM_HW_VER:               0x90,
        PARAM_SW_MAJOR:             0x91,
        PARAM_SW_MINOR:             0x92,
        PARAM_VTARGET:              0x94,
        PARAM_VADJUST:              0x95,
        PARAM_OSC_PSCALE:           0x96,
        PARAM_OSC_CMATCH:           0x97,
        PARAM_SCK_DURATION:         0x98,
        PARAM_TOPCARD_DETECT:       0x9A,
        PARAM_STATUS:               0x9C,
        PARAM_DATA:                 0x9D,
        PARAM_RESET_POLARITY:       0x9E,
        PARAM_CONTROLLER_INIT:      0x9F
    };
    
    // state machine variables
    this.sequence_number;
    
    this.message_state = 0;
    this.message_size = 0;
    this.message_buffer = [];
    this.message_buffer_i = 0;
    this.message_crc = 0;
    
    this.message_callbacks = [];
};

STK500v2_protocol.prototype.initialize = function() {
    var self = this;
    
    this.verify_hex = [];
    
    this.sequence_number = 0;
    
    serial.onReceive.addListener(function(readInfo) {
        self.read(readInfo);
    });
    
    var retry = 0;
    GUI.interval_add('get_in_sync', function() {
        self.send([self.command.CMD_SIGN_ON], function(data_array) {
            GUI.interval_remove('get_in_sync');
            
            console.log('Programmer in sync');
            
            self.upload_procedure(1);
        });
        
        if (retry++ >= 5) {
            GUI.interval_remove('get_in_sync');
            GUI.log('Connection to the module <span style="color: red">failed</span>');
            
            // disconnect
            self.upload_procedure(99);
        }
    }, 1000, true);
};

STK500v2_protocol.prototype.read = function(readInfo) {
    var data = new Uint8Array(readInfo.data);
    
    for (var i = 0; i < data.length; i++) {
        // state machine
        switch(this.message_state) {
            case 0:
                if (data[i] == this.message.MESSAGE_START) {
                    this.message_crc ^= data[i];
                    this.message_state++;
                }
                break;
            case 1:
                if (data[i] == this.sequence_number) {
                    this.message_crc ^= data[i];
                    this.message_state++;
                } else {
                    this.message_crc = 0;
                    this.message_state = 0;
                }
                break;
            case 2:
                this.message_size = data[i] << 8; // MSB
                this.message_crc ^= data[i];
                
                this.message_state++;
                break;
            case 3:
                this.message_size |= data[i]; // LSB
                this.message_crc ^= data[i];
                
                this.message_state++;
                break;
            case 4:
                if (data[i] == this.message.TOKEN) {
                    this.message_buffer = new ArrayBuffer(this.message_size);
                    this.message_buffer_uint8_view = new Uint8Array(this.message_buffer);
                    this.message_crc ^= data[i];
                    
                    this.message_state++;
                } else {
                    this.message_crc = 0;
                    this.message_state = 0;
                }
                break;
            case 5:
                this.message_buffer_uint8_view[this.message_buffer_i] = data[i];
                this.message_crc ^= data[i];
                this.message_buffer_i++;
                
                if (this.message_buffer_i >= this.message_size) {
                    this.message_state++;
                }                
                break;
            case 6:
                if (this.message_crc == data[i]) {
                    // message received, all is proper, process
                    var callback_fired = false;
                    for (var j = (this.message_callbacks.length - 1); j >= 0; j--) {
                        if (this.message_callbacks[j].command == this.message_buffer_uint8_view[0]) {
                            // fire callback
                            if (!callback_fired) {
                                this.message_callbacks[j].callback(this.message_buffer_uint8_view, this.message_buffer);
                                callback_fired = true;
                            }
                            
                            // remove callback object
                            this.message_callbacks.splice(j, 1);
                        }
                    }
                    
                    if (!callback_fired) {
                        // unexpected message arrived
                        console.log(this.message_buffer_uint8_view);
                    }
                } else {
                    // crc failed
                    console.log('crc failed, sequence: ' + this.sequence_number);
                }
                
                this.message_buffer_i = 0;
                this.message_crc = 0;
                this.message_state = 0;
                break;
        }
    }
};

STK500v2_protocol.prototype.send = function(Array, callback) {
    var bufferOut = new ArrayBuffer(Array.length + 6); // 6 bytes protocol overhead
    var bufferView = new Uint8Array(bufferOut);
    
    this.sequence_number++;
    if (this.sequence_number >= 256) this.sequence_number = 0; // reset 8 bit
    
    bufferView[0] = this.message.MESSAGE_START;
    bufferView[1] = this.sequence_number;
    bufferView[2] = Array.length >> 8;      // MSB
    bufferView[3] = Array.length & 0x00FF;  // LSB
    bufferView[4] = this.message.TOKEN;
    
    bufferView.set(Array, 5); // apply protocol offset
    
    // calculate CRC
    var crc = 0;
    for (var i = 0; i < (bufferView.length - 1); i++) {
        crc ^= bufferView[i];
    }
    bufferView[bufferView.length - 1] = crc;
    
    // attach callback
    if (callback) this.message_callbacks.push({'command': Array[0], 'callback': callback});
    
    serial.send(bufferOut, function(writeInfo) {}); 
};

STK500v2_protocol.prototype.connect = function(baud, hex) {
    var self = this;
    self.hex = hex;
    
    var selected_port = String($('div#controls #port').val());
    
    if (selected_port != '0') {
        serial.connect(selected_port, {bitrate: baud}, function(openInfo) {
            if (openInfo) {
                GUI.log('Connection <span style="color: green">successfully</span> opened with ID: ' + openInfo.connectionId);
                
                self.initialize();
            } else {
                GUI.log('<span style="color: red">Failed</span> to open serial port');
            }
        });
    } else {
        GUI.log('Please select valid serial port');
    }    
};

STK500v2_protocol.prototype.upload_procedure = function(step) {
    var self = this;
    
    switch (step) {
        case 1:
            // enter programming mode
            var arr = [];
            arr[0] = this.command.CMD_ENTER_PROGMODE_ISP;
            arr[1] = 200; // timeout (Command time-out (in ms)
            arr[2] = 100; // Delay (in ms) used for pin stabilization
            arr[3] = 25; // Delay (in ms) in connection with the EnterProgMode command execution 
            arr[4] = 32; // Number of synchronization loops 
            arr[5] = 0; // Delay (in ms) between each byte in the EnterProgMode command.
            arr[6] = 0x53; // Poll value: 0x53 for AVR, 0x69 for AT89xx 
            arr[7] = 3; // Start address, received byte: 0 = no polling, 3 = AVR, 4 = AT89xx
            arr[8] = 0xAC; // Command Byte # 1 to be transmitted
            arr[9] = 0x53; // Command Byte # 2 to be transmitted
            arr[10] = 0x00; // Command Byte # 3 to be transmitted
            arr[11] = 0x00; // Command Byte # 4 to be transmitted
            
            self.send(arr, function(data) {
                if (data[1] == self.status.STATUS_CMD_OK) {
                    console.log('Entered programming mode');
                    self.upload_procedure(3);
                } else {
                    console.log('Failed to enter programming mode');
                    self.upload_procedure(99);
                }
            });
            break;
        case 2:
            // no idea what happens here for now (skipped for now)
            var needle = 0;
            var arr = [[], [], []];
            
            // first set
            arr[0][0] = this.command.CMD_SPI_MULTI;
            arr[0][1] = 0x04; // Number of bytes to transmit 
            arr[0][2] = 0x04; // Number of bytes to receive
            arr[0][3] = 0x00; // Start address of returned data. Specifies on what transmitted byte the response is to be stored and returned.
            // TxData below, The data be transmitted. The size is specified by NumTx
            arr[0][4] = 0x30;
            arr[0][5] = 0x00;
            arr[0][6] = 0x00;
            arr[0][7] = 0x00;
            
            // second set
            arr[1][0] = this.command.CMD_SPI_MULTI;
            arr[1][1] = 0x04;
            arr[1][2] = 0x04;
            arr[1][3] = 0x00;
            // TxData below
            arr[1][4] = 0x30;
            arr[1][5] = 0x00;
            arr[1][6] = 0x01;
            arr[1][7] = 0x00;
            
            // third set
            arr[2][0] = this.command.CMD_SPI_MULTI;
            arr[2][1] = 0x04;
            arr[2][2] = 0x04;
            arr[2][3] = 0x00;
            // TxData below
            arr[2][4] = 0x30;
            arr[2][5] = 0x00;
            arr[2][6] = 0x02;
            arr[2][7] = 0x00;
            
            var send_spi = function() {
                self.send(arr[needle], function(data) {
                    console.log(data);
                    
                    needle++;
                    if (needle < 3) {
                        send_spi();
                    } else {
                        self.upload_procedure(3);
                    }
                });
            };
            
            // start sending
            send_spi();
            break;
        case 3:
            // chip erase
            var arr = [];
            
            arr[0] = self.command.CMD_CHIP_ERASE_ISP;
            arr[1] = 10; // Delay (in ms) to ensure that the erase of the device is finished
            arr[2] = 0; // Poll method, 0 = use delay 1= use RDY/BSY command 
            arr[3] = 0xAC; // Command Byte # 1 to be transmitted 
            arr[4] = 0x98; // Command Byte # 2 to be transmitted 
            arr[5] = 0x3B; // Command Byte # 3 to be transmitted 
            arr[6] = 0xE6; // Command Byte # 4 to be transmitted 
            
            self.send(arr, function(data) {
                if (data[1] == self.status.STATUS_CMD_OK) {
                    console.log('Chip erased');
                    self.upload_procedure(4);
                } else {
                    console.log('failed to erase chip');
                    self.upload_procedure(99);
                }
            });
            break;
        case 4:
            // enter programming mode
            var arr = [];
            arr[0] = this.command.CMD_ENTER_PROGMODE_ISP;
            arr[1] = 200; // timeout (Command time-out (in ms)
            arr[2] = 100; // Delay (in ms) used for pin stabilization
            arr[3] = 25; // Delay (in ms) in connection with the EnterProgMode command execution 
            arr[4] = 32; // Number of synchronization loops 
            arr[5] = 0; // Delay (in ms) between each byte in the EnterProgMode command.
            arr[6] = 0x53; // Poll value: 0x53 for AVR, 0x69 for AT89xx 
            arr[7] = 3; // Start address, received byte: 0 = no polling, 3 = AVR, 4 = AT89xx
            arr[8] = 0xAC; // Command Byte # 1 to be transmitted
            arr[9] = 0x53; // Command Byte # 2 to be transmitted
            arr[10] = 0x00; // Command Byte # 3 to be transmitted
            arr[11] = 0x00; // Command Byte # 4 to be transmitted
            
            self.send(arr, function(data) {
                if (data[1] == self.status.STATUS_CMD_OK) {
                    console.log('Entered programming mode');
                    self.upload_procedure(5);
                } else {
                    console.log('Failed to enter programming mode');
                    self.upload_procedure(99);
                }
            });
            break;
        case 5:
            // flash
            GUI.log('Writing ...');
            
            var blocks = self.hex.data.length - 1;
            var flashing_block = 0;
            var bytes_flashed = 0;
            var flashing_memory_address = self.hex.data[flashing_block].address;
            
            self.send([self.command.CMD_LOAD_ADDRESS, 0x00, 0x00, (flashing_memory_address >> 8), (flashing_memory_address & 0x00FF)], function(data) {
                if (data[1] == self.status.STATUS_CMD_OK) {
                    console.log('Address loaded: ' + flashing_memory_address);
                    
                    // start writing
                    write();
                } else {
                    console.log('Failed to load address');
                    self.upload_procedure(99);
                }
            });
            
            var write = function() {
                if (bytes_flashed >= self.hex.data[flashing_block].bytes) {
                    // move to another block
                    if (flashing_block < blocks) {
                        flashing_block++;
                        
                        flashing_memory_address = self.hex.data[flashing_block].address;
                        bytes_flashed = 0;
                        
                        // change address
                        self.send([self.command.CMD_LOAD_ADDRESS, 0x00, 0x00, (flashing_memory_address >> 8), (flashing_memory_address & 0x00FF)], function(data) {
                            if (data[1] == self.status.STATUS_CMD_OK) {
                                console.log('Address loaded: ' + flashing_memory_address);
                                
                                // continue writing
                                write();
                            } else {
                                console.log('Failed to load address');
                                self.upload_procedure(99);
                            }
                        });
                    } else {
                        GUI.log('Writing <span style="color: green;">done</span>');
                        self.upload_procedure(6);
                    }
                } else {
                    var bytes_to_write;
                    if ((bytes_flashed + 64) <= self.hex.data[flashing_block].bytes) {
                        bytes_to_write = 64;
                    } else {
                        bytes_to_write = self.hex.data[flashing_block].bytes - bytes_flashed;
                    }
                    
                    console.log('STK500V2 - Writing to: ' + flashing_memory_address);
                
                    var arr = [];
                    arr[0] = self.command.CMD_PROGRAM_FLASH_ISP;
                    arr[1] = 0; // Total number of bytes to program, MSB first 
                    arr[2] = bytes_to_write; // LSB
                    arr[3] = 0xA1; // Mode byte
                    arr[4] = 10; // delay
                    arr[5] = bytes_to_write; // Command 1 (Load Page, Write Program Memory)
                    arr[6] = 0x4C; // Command 2 (Write Program Memory Page) 
                    arr[7] = 0x20; // Command 3 (Read Program Memory) 
                    arr[8] = 0xFF; // Poll Value #1 
                    arr[9] = 0x00; // Poll Value #2 (not used for flash programming)
                    
                    for (var i = 0; i < bytes_to_write; i++) {
                        arr.push(self.hex.data[flashing_block].data[bytes_flashed++]);
                    }
                    
                    self.send(arr, function(data) {
                        if (data[1] == self.status.STATUS_CMD_OK) {
                            flashing_memory_address += bytes_to_write;
                            // flash another page
                            write();
                        } else {
                            // failed to write
                            self.upload_procedure(99);
                        }
                    });
                }
            };
            break;
        case 6:
            // read
            GUI.log('Verifying ...');
            
            var blocks = self.hex.data.length - 1;
            var reading_block = 0;
            var bytes_verified = 0;
            var verifying_memory_address = 0;
            
            // initialize arrays
            for (var i = 0; i <= blocks; i++) {
                self.verify_hex.push([]);
            }
            
            self.send([self.command.CMD_LOAD_ADDRESS, 0x00, 0x00, (verifying_memory_address >> 8), (verifying_memory_address & 0x00FF)], function(data) {
                if (data[1] == self.status.STATUS_CMD_OK) {
                    console.log('Address loaded: ' + verifying_memory_address);
                    
                    // start reading
                    reading();
                } else {
                    console.log('Failed to load address');
                    self.upload_procedure(99);
                }
            });
            
            var reading = function() {
                if (bytes_verified >= self.hex.data[reading_block].bytes) {
                    // move to another block
                    if (reading_block < blocks) {
                        reading_block++;
                        
                        verifying_memory_address = self.hex.data[reading_block].address;
                        bytes_verified = 0;
                        
                        // change address
                        self.send([self.command.CMD_LOAD_ADDRESS, 0x00, 0x00, (verifying_memory_address >> 8), (verifying_memory_address & 0x00FF)], function(data) {
                            if (data[1] == self.status.STATUS_CMD_OK) {
                                console.log('Address loaded: ' + verifying_memory_address);
                                
                                // continue reading
                                reading();
                            } else {
                                console.log('Failed to load address');
                                self.upload_procedure(99);
                            }
                        });
                    } else {
                        // all blocks read, verify
                        
                        var verify = true;
                        for (var i = 0; i <= blocks; i++) {
                            verify = self.verify_flash(self.hex.data[i].data, self.verify_hex[i]);
                            
                            if (!verify) break;
                        }
                        
                        if (verify) {
                            GUI.log('Verifying <span style="color: green">done</span>');
                            GUI.log('Programming: <span style="color: green;">SUCCESSFUL</span>');
                        } else {
                            GUI.log('Verifying <span style="color: red">failed</span>');
                            GUI.log('Programming: <span style="color: red;">FAILED</span>');
                        }
                        
                        self.upload_procedure(7);
                    }
                } else {
                    var bytes_to_read;
                    if ((bytes_verified + 128) <= self.hex.data[reading_block].bytes) {
                        bytes_to_read = 128;
                    } else {
                        bytes_to_read = self.hex.data[reading_block].bytes - bytes_verified;
                    }
                    
                    console.log('STK500V2 - Reading from: ' + verifying_memory_address);
                    
                    var arr = [];
                    arr[0] = self.command.CMD_READ_FLASH_ISP;
                    arr[1] = 0; // Total number of bytes to read, MSB first
                    arr[2] = bytes_to_read; // LSB
                    arr[3] = 32; // Read Program Memory command byte #1. Low/High byte selection bit (3rd bit) is handled in the FIRMWARE
                    
                    self.send(arr, function(data) {
                        if (data[1] == self.status.STATUS_CMD_OK) {
                            for (var i = 2; i < (data.length - 1); i++) { // - status2 byte
                                self.verify_hex[reading_block].push(data[i]);
                                bytes_verified++;
                            }
                            
                            verifying_memory_address += bytes_to_read;
                            
                            // verify another page
                            reading();
                        } else {
                            // failed to read
                            self.upload_procedure(99);
                        }
                    });
                }
            };
            break;
        case 7:
            // leave programming mode            
            var arr = [];
            arr[0] = self.command.CMD_LEAVE_PROGMODE_ISP;
            arr[1] = 1; // Pre-delay (in ms)
            arr[2] = 1; // Post-delay (in ms)
            
            self.send(arr, function(data) {
                console.log('Left Programming Mode');
                self.upload_procedure(99);
            });
            break;
        case 99:
            serial.disconnect(function(result) {
                if (result) { // All went as expected
                    GUI.log('<span style="color: green">Successfully</span> closed serial connection');
                } else { // Something went wrong
                    GUI.log('<span style="color: red">Failed</span> to close serial port');
                }
            });
            break;
    }
};

// first_array = usually hex_to_flash array
// second_array = usually verify_hex array
// result = true/false
STK500v2_protocol.prototype.verify_flash = function(first_array, second_array) {
    for (var i = 0; i < first_array.length; i++) {
        if (first_array[i] != second_array[i]) {
            console.log('Verification failed on byte: ' + i + ' expected: ' + first_array[i] + ' received: ' + second_array[i]);
            return false;
        }
    }
    
    console.log('Verification successful, matching: ' + first_array.length + ' bytes');
    
    return true;
};

var STK500V2 = new STK500v2_protocol();