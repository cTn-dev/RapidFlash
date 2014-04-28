function initialize_firmware_options() {
    $('#content').load('./tabs/firmware_options.html', function() {
        function begin_upload(hex) {
            switch($('select#programmer').val()) {
                case 'turnigy_usb_linker':
                    STK500V2.connect(9600, hex);
                    break;
                case 'arduino_usb_linker':
                    STK500V2.connect(19600, hex);
                    break;
            }
        }

        // disable all firmware options in the start
        $('select#firmware').change(function() {
            var val = $(this).val();

            if (val != '0' && val != 'custom') {
                $('.tab-firmware_options input:disabled').each(function() {
                    $(this).prop('disabled', false);
                });
            } else {
                $('.tab-firmware_options input:enabled').each(function() {
                    $(this).prop('disabled', true);
                });
            }
        }).change();

        $('a.load').click(function() {
            chrome.fileSystem.chooseEntry({type: 'openFile', accepts: [{extensions: ['hex']}]}, function(fileEntry) {
                if (!fileEntry) {
                    // no "valid" file selected/created, aborting
                    console.log('No valid file selected, aborting');
                    return;
                }

                // reset default ihex properties
                ihex.raw = false;
                ihex.parsed = false;

                chrome.fileSystem.getDisplayPath(fileEntry, function(path) {
                    console.log('Loading file from: ' + path);

                    fileEntry.file(function(file) {
                        var reader = new FileReader();

                        reader.onprogress = function(e) {
                            if (e.total > 1048576) { // 1 MB
                                // dont allow reading files bigger then 1 MB
                                console.log('File limit (1 MB) exceeded, aborting');
                                GUI.log('File limit (1 MB) <span style="color: red">exceeded</span>, aborting');
                                reader.abort();
                            }
                        };

                        reader.onloadend = function(e) {
                            if (e.total != 0 && e.total == e.loaded) {
                                console.log('File loaded');

                                // parsing hex in different thread
                                var worker = new Worker('./js/workers/hex_parser.js');

                                // "callback"
                                worker.onmessage = function (event) {
                                    if (event.data) {
                                        ihex.parsed = event.data;

                                        GUI.log('Custom HEX file <span style="color: green">loaded</span>');
                                        $('select#firmware').val('custom').change();
                                    } else {
                                        GUI.log('HEX file appears to be <span style="color: red">corrupted</span>');
                                    }
                                };

                                // save raw data structure
                                ihex.raw = e.target.result;

                                // send data/string over for processing
                                worker.postMessage(e.target.result);
                            }
                        };

                        reader.readAsText(file);
                    });
                });
            });
        });

        $('a.save').click(function() {
            if (ihex.raw != undefined && ihex.raw != 'undefined') {
                var name = $('select#firmware').val();

                chrome.fileSystem.chooseEntry({type: 'saveFile', suggestedName: name, accepts: [{extensions: ['hex']}]}, function(fileEntry) {
                    if (!fileEntry) {
                        // no "valid" file selected/created, aborting
                        console.log('No valid file selected, aborting');
                        return;
                    }

                    chrome.fileSystem.getDisplayPath(fileEntry, function(path) {
                        console.log('Saving firmware to: ' + path);
                        GUI.log('Saving firmware to: <strong>' + path + '</strong>');

                        // change file entry from read only to read/write
                        chrome.fileSystem.getWritableEntry(fileEntry, function(fileEntryWritable) {
                            // check if file is writable
                            chrome.fileSystem.isWritableEntry(fileEntryWritable, function(isWritable) {
                                if (isWritable) {
                                    var blob = new Blob([ihex.raw], {type: 'text/plain'}); // first parameter for Blob needs to be an array

                                    fileEntryWritable.createWriter(function(writer) {
                                        writer.onerror = function (e) {
                                            console.error(e);
                                        };

                                        var truncated = false;
                                        writer.onwriteend = function() {
                                            if (!truncated) {
                                                // onwriteend will be fired again when truncation is finished
                                                truncated = true;
                                                writer.truncate(blob.size);

                                                return;
                                            }

                                            // all went fine
                                            callback(true);
                                        };

                                        writer.write(blob);
                                    }, function (e) {
                                        console.error(e);
                                    });
                                } else {
                                    // Something went wrong or file is set to read only and cannot be changed
                                    console.log('You don\'t have write permissions for this file, sorry.');
                                }
                            });
                        });
                    });
                });
            } else {
                GUI.log('You need to <strong>load</strong> a valid firmware before you can save it');
            }
        });

        $('a.flash').click(function() {
            if (!GUI.connect_lock) {
                if ($('select#programmer').val() != '0') {
                    if ($('select#firmware').val() != '0') {
                        if ($('select#firmware').val() != 'custom') {
                            // TODO load the firmware
                            /*
                            ihex.raw = result;

                            // parsing hex in different thread
                            var worker = new Worker('./js/workers/hex_parser.js');

                            // "callback"
                            worker.onmessage = function (event) {
                                ihex.parsed = event.data;

                                begin_upload(ihex.parsed);
                            };

                            // send data/string over for processing
                            worker.postMessage(result);
                            */
                        } else {
                            // custom firmware
                            begin_upload(ihex.parsed);
                        }
                    } else {
                        GUI.log('Please select firmware from the menu');
                    }
                } else {
                    GUI.log('Please select programmer from the menu');
                }
            }
        });
    });
}