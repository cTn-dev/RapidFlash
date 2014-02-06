chrome.app.runtime.onLaunched.addListener(function() {
    start_app();
});

chrome.runtime.onInstalled.addListener(function(details) {
    if (details.reason == 'update') {
    }
});

chrome.notifications.onButtonClicked.addListener(function(notificationId, buttonIndex) {
});

function start_app() {
    chrome.app.window.create('main.html', {
        id: 'main-window',
        frame: 'native',
        resizable: false,
        minWidth: 960,
        minHeight: 357,
        maxWidth: 960,
        maxHeight: 357
    }, function(main_window) {
        main_window.onClosed.addListener(function() {
            // connectionId is passed from the script side through the chrome.runtime.getBackgroundPage refference
            // allowing us to automatically close the port when application shut down
            
            // save connectionId in separate variable before app_window is destroyed
            var connectionId = app_window.serial.connectionId;
            
            if (connectionId > 0) {
                setTimeout(function() {
                    chrome.serial.disconnect(connectionId, function(result) {
                        console.log('SERIAL: Connection closed - ' + result);
                    });
                }, 50);
            }
        });
    });
}