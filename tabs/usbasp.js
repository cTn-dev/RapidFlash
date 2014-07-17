function tab_initialize_usbasp() {
    $('#content').load("./tabs/usbasp.html", function() {
        GUI.active_tab = 'usbasp';
        googleAnalytics.sendAppView('USBASP');

        if (!GUI.optional_usb_permissions) {
            GUI.log(chrome.i18n.getMessage('please_grant_usb_permissions'));

            // display optional usb permissions request box
            $('div.optional_permissions').show();

            // UI hooks
            document.getElementById("requestOptionalPermissions").addEventListener('click', function() {
                chrome.permissions.request(usbPermissions, function(result) {
                    if (result) {
                        GUI.log(chrome.i18n.getMessage('usb_permissions_granted'));
                        $('div.optional_permissions').hide();

                        GUI.optional_usb_permissions = true;
                    }
                });
            });
        }

        localize();
    });
}