function initialize_firmware_options() {
    $('#content').load('./tabs/firmware_options.html', function() {
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
    });
}