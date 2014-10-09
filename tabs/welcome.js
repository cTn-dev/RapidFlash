function tab_initialize_welcome() {
    $('#content').load("./tabs/welcome.html", function() {
        if (GUI.active_tab != 'welcome') {
            GUI.active_tab = 'welcome';
            googleAnalytics.sendAppView('Welcome');
        }

        // translate to user-selected language
        localize();

        // load changelog content
        $('div.changelog .wrapper').load('./changelogs/app.html');
    });
}