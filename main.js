// Get access to the background window object
// This object is used to pass variables between active page and background page
chrome.runtime.getBackgroundPage(function(result) {
    backgroundPage = result;
    backgroundPage.app_window = window;
});

// Google Analytics
var googleAnalyticsService = analytics.getService('ice_cream_app');
var googleAnalytics = googleAnalyticsService.getTracker('UA-32728876-8');
var googleAnalyticsConfig = false;
googleAnalyticsService.getConfig().addCallback(function(config) {
    googleAnalyticsConfig = config;
});

$(document).ready(function() {
    googleAnalytics.sendAppView('Application Started');

    PortHandler.initialize();

    // alternative - window.navigator.appVersion.match(/Chrome\/([0-9.]*)/)[1];
    GUI.log('Running - OS: <strong>' + GUI.operating_system + '</strong>, ' +
        'Chrome: <strong>' + window.navigator.appVersion.replace(/.*Chrome\/([0-9.]*).*/,"$1") + '</strong>, ' +
        chrome.runtime.getManifest().name + ': <strong>' + chrome.runtime.getManifest().version + '</strong>');

    // generate list of firmwares
    var e_firmware = $('select#firmware');
    for (var i = 0; i < firmware_type.length; i++) {
        e_firmware.append('<option value="' + firmware_type[i] + '">' + firmware_type[i] + '</option>');
    }

    // generate list of releases
    var e_releases = $('select#release');
    request_releases(function(releases) {
        for (var i = 0; i < releases.length; i++) {
            e_releases.append('<option value="' + releases[i] + '">' + releases[i] + '</option>');
        }

        chrome.storage.local.get('release', function(result) {
            if (result.release) {
                // check if release is whitelisted (exists), if yes select
                var options = $('select#release option');

                for (var i = 0; i < options.length; i++) {
                    if ($(options[i]).val() == result.release) {
                        $('select#release').val(result.release);
                        break;
                    }
                }
            }
        });
    });

    // auto-select certain settings if they were saved
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
                googleAnalytics.sendAppView('Options');

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
                if (googleAnalyticsConfig.isTrackingPermitted()) {
                    $('div.statistics input').prop('checked', true);
                }

                $('div.statistics input').change(function() {
                    var result = $(this).is(':checked');
                    googleAnalyticsConfig.setTrackingPermitted(result);
                });

                function close_and_cleanup(e) {
                    if (e.type == 'click' && !$.contains($('div#app_options-window')[0], e.target) || e.type == 'keyup' && e.keyCode == 27) {
                        $(document).unbind('click keyup', close_and_cleanup);

                        $('div#app_options-window').slideUp(function() {
                            el.removeClass('active');
                            $(this).empty().remove();
                        });
                    }
                }

                $(document).bind('click keyup', close_and_cleanup);

                $(this).slideDown();
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
        var release = $('select#release').val();

        if (name != '0' && name != 'custom') {
            if (release != '0') {
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
                GUI.log('Please select release');
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
                STK500V2.connect(19200, hex);
                break;
            case 'usbasp':
                USBASP.connect(hex);
                break;
        }
    }

    $('a.flash').click(function() {
        if (!GUI.connect_lock) {
            if ($('select#programmer').val() != '0') {
                if ($('select#firmware').val() != '0') {
                    if ($('select#port').val() != '0') {
                        if ($('select#firmware').val() != 'custom') {
                            if ($('select#release').val() != '0') {
                                // save some of the settings for next use
                                chrome.storage.local.set({'last_used_port': $('select#port').val()});
                                chrome.storage.local.set({'programmer': $('select#programmer').val()});
                                chrome.storage.local.set({'firmware': $('select#firmware').val()});
                                chrome.storage.local.set({'release': $('select#release').val()});

                                // Request firmware
                                request_firmware(function(raw, parsed) {
                                    begin_upload(parsed);
                                });
                            } else {
                                GUI.log('Please select release');
                            }
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

    $("#content").on('keydown', 'input[type="number"]', function(e) {
        // whitelist all that we need for numeric control
        if ((e.keyCode >= 96 && e.keyCode <= 105) || (e.keyCode >= 48 && e.keyCode <= 57)) { // allow numpad and standard number keypad
        } else if (e.keyCode == 109 || e.keyCode == 189) { // minus on numpad and in standard keyboard
        } else if (e.keyCode == 8 || e.keyCode == 46 || e.keyCode == 9) { // backspace, delete, tab
        } else if (e.keyCode == 190 || e.keyCode == 110) { // allow and decimal point
        } else if ((e.keyCode >= 37 && e.keyCode <= 40) || e.keyCode == 13) { // allow arrows, enter
        } else {
            // block everything else
            e.preventDefault();
        }
    });

    $("#content").on('change', 'input[type="number"]', function() {
        var element = $(this);
        var min = parseFloat(element.prop('min'));
        var max = parseFloat(element.prop('max'));
        var step = parseFloat(element.prop('step'));
        var val = parseFloat(element.val());

        // only adjust minimal end if bound is set
        if (element.prop('min')) {
            if (val < min) element.val(min);
        }

        // only adjust maximal end if bound is set
        if (element.prop('max')) {
            if (val > max) element.val(max);
        }

        // if entered value is illegal use previous value instead
        if (isNaN(val)) {
            element.val(element.data('previousValue'));
        }

        // if step is not set or step is int and value is float use previous value instead
        if (isNaN(step) || step % 1 === 0) {
            if (val % 1 !== 0) {
                element.val(element.data('previousValue'));
            }
        }

        // if step is set and is float and value is int, convert to float, keep decimal places in float according to step *experimental*
        if (!isNaN(step) && step % 1 !== 0) {
            var decimal_places = String(step).split('.')[1].length;

            if (val % 1 === 0) {
                element.val(val.toFixed(decimal_places));
            } else if (String(val).split('.')[1].length != decimal_places) {
                element.val(val.toFixed(decimal_places));
            }
        }
    });
});

function microtime() {
    var now = new Date().getTime() / 1000;

    return now;
}

function millitime() {
    var now = new Date().getTime();

    return now;
}