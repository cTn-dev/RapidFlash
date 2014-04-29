function tab_initialize_welcome() {
    $('#content').load("./tabs/welcome.html", function() {
        // load changelog content
        $('div.changelog .wrapper').load('./changelogs/app.html');
    });
}