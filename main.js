// Get access to the background window object
// This object is used to pass current connectionId to the backround page
// so the onClosed event can close the port for us if it was left opened, without this
// users can experience weird behavior if they would like to access the serial bus afterwards.
chrome.runtime.getBackgroundPage(function(result) {
    backgroundPage = result;
    backgroundPage.app_window = window;
});

// Google Analytics BEGIN
var ga_config; // google analytics config reference
var ga_tracking; // global result of isTrackingPermitted

var service = analytics.getService('ice_cream_app');
service.getConfig().addCallback(function(config) {
    ga_config = config;
    ga_tracking = config.isTrackingPermitted();
});

var ga_tracker = service.getTracker('UA-32728876-8');

ga_tracker.sendAppView('Application Started');
// Google Analytics END

$(document).ready(function() {
    PortHandler.initialize();

    // alternative - window.navigator.appVersion.match(/Chrome\/([0-9.]*)/)[1];
    GUI.log('Running - OS: <strong>' + GUI.operating_system + '</strong>, ' +
        'Chrome: <strong>' + window.navigator.appVersion.replace(/.*Chrome\/([0-9.]*).*/,"$1") + '</strong>, ' +
        chrome.runtime.getManifest().name + ': <strong>' + chrome.runtime.getManifest().version + '</strong>');

    // alpha notice
    GUI.log('<span style="color: red">This application is currently in <strong>beta stage</strong></span>');

    // generate list of firmwares
    var e_firmware = $('select#firmware');
    for (var i = 0; i < firmware_type.length; i++) {
        e_firmware.append('<option value="' + firmware_type[i] + '">' + firmware_type[i] + '</option>');
    }

    chrome.storage.local.get('programmer', function(result) {
        if (result.programmer) $('select#programmer').val(result.programmer);
    });

    chrome.storage.local.get('firmware', function(result) {
        if (result.firmware) $('select#firmware').val(result.firmware);
    });

    // UI hooks
    // app options
    $('a#app_options').click(function() {
        var el = $(this);

        if (!el.hasClass('active')) {
            el.addClass('active');
            el.after('<div id="app_options-window"></div>');
            $('div#app_options-window').load('./tabs/app_options.html', function() {
                ga_tracker.sendAppView('Options');

                // translate to user-selected language
                localize();

                // if notifications are enabled, or wasn't set, check the notifications checkbox
                chrome.storage.local.get('update_notify', function(result) {
                    if (typeof result.update_notify === 'undefined' || result.update_notify) {
                        $('div.notifications input').prop('checked', true);
                    }
                });

                $('div.notifications input').change(function() {
                    var check = $(this).is(':checked');

                    chrome.storage.local.set({'update_notify': check});
                });

                // if tracking is enabled, check the statistics checkbox
                if (ga_tracking == true) {
                    $('div.statistics input').prop('checked', true);
                }

                $('div.statistics input').change(function() {
                    var check = $(this).is(':checked');

                    ga_tracking = check;

                    ga_config.setTrackingPermitted(check);
                });

                $(this).slideDown();
            });
        } else {
            $('div#app_options-window').slideUp(function() {
                el.removeClass('active');
                $(this).empty().remove();
            });
        }
    });

    // Tabs
    var tabs = $('#tabs > ul');
    $('a', tabs).click(function() {
        if ($(this).parent().hasClass('active') == false) { // only initialize when the tab isn't already active
            var self = this;
            var index = $(self).parent().index();

            // disable previously active tab highlight
            $('li', tabs).removeClass('active');

            // get tab class name (there should be only one class listed)
            var tab = $(self).parent().prop('class');

            // Highlight selected tab
            $(self).parent().addClass('active');

            // detach listeners and remove element data
            $('#content').empty();

            switch (tab) {
                case 'tab_welcome':
                    tab_initialize_welcome();
                    break;
                case 'tab_basic':
                    tab_initialize_basic();
                    break;
                case 'tab_advanced':
                    tab_initialize_advanced();
                    break;
            }
        }
    });

    $('#tabs a:first').click();

    // backend
    function begin_upload(hex) {
        switch($('select#programmer').val()) {
            case 'turnigy_usb_linker':
                STK500V2.connect(9600, hex);
                break;
            case 'afro_esc_usb_linker':
                STK500V2.connect(9600, hex);
                break;
            case 'arduino_usb_linker':
                STK500V2.connect(19600, hex);
                break;
        }
    }

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
        var name = $('select#firmware').val();

        if (name != 0 && name != 'custom') {
            request_firmware(save);

            function save() {
                chrome.fileSystem.chooseEntry({type: 'saveFile', suggestedName: name, accepts: [{extensions: ['hex']}]}, function(fileEntry) {
                    if (!fileEntry) {
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
            }
        } else {
            GUI.log('Please select firmware');
        }
    });

    $('a.reset').click(function() {
        properties = [];

        switch (GUI.active_tab) {
            case 'basic':
                tab_initialize_basic();
                break;
            case 'advanced':
                tab_initialize_advanced();
                break;
        }
    });

    $('a.flash').click(function() {
        if (!GUI.connect_lock) {
            if ($('select#programmer').val() != '0') {
                if ($('select#firmware').val() != '0') {
                    if ($('select#port').val() != '0') {
                        if ($('select#firmware').val() != 'custom') {
                            // save some of the settings for next use
                            chrome.storage.local.set({'last_used_port': $('select#port').val()});
                            chrome.storage.local.set({'programmer': $('select#programmer').val()});
                            chrome.storage.local.set({'firmware': $('select#firmware').val()});

                            // Request firmware
                            request_firmware(function(raw, parsed) {
                                begin_upload(parsed);
                            });
                        } else {
                            if (ihex.parsed) {
                                // save some of the settings for next use
                                chrome.storage.local.set({'last_used_port': $('select#port').val()});
                                chrome.storage.local.set({'programmer': $('select#programmer').val()});
                                chrome.storage.local.set({'firmware': 0});

                                // custom firmware
                                begin_upload(ihex.parsed);
                            } else {
                                GUI.log('Please load valid firmware first');
                            }
                        }
                    } else {
                        GUI.log('Please select port');
                    }
                } else {
                    GUI.log('Please select firmware');
                }
            } else {
                GUI.log('Please select programmer');
            }
        }
    });
});