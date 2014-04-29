function tab_initialize_welcome() {
    $('#content').load("./tabs/welcome.html", function() {
        // move donation box inside content area
        // load custom firmware and flash buttons should reside outside of content area
    });
}