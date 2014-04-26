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
        'Flasher: <strong>' + chrome.runtime.getManifest().version + '</strong>');

    // alpha notice
    GUI.log('<span style="color: red">This application is currently in <strong>alpha stage</strong></span>');

    // generate list of firmwares
    var e_firmware = $('select#firmware');
    for (var i = 0; i < firmware_type.length; i++) {
        e_firmware.append('<option value="' + firmware_type[i] + '">' + firmware_type[i] + '</option>');
    }

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

    initialize_firmware_options();
});