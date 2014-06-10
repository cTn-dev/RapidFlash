function tab_initialize_welcome() {
    $('#content').load("./tabs/welcome.html", function() {
        GUI.active_tab = 'welcome';
        ga_tracker.sendAppView('Welcome');

        check_usb_permissions();

        // translate to user-selected language
        localize();

        // load changelog content
        $('div.changelog .wrapper').load('./changelogs/app.html');
    });
}