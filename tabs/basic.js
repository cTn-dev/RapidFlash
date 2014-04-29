function tab_initialize_basic() {
    function generate_ui(items) {
        var target_element = $('.tab-basic dl:first');

        function checked(val) {
            if (val) return 'checked';
        }

        for (var i = 0; i < items.length; i++) {
            for (var j = 0; j < firmware_options.length; j++) {
                if (items[i] == firmware_options[j].name) {
                    switch (firmware_options[j].element) {
                        case 'checkbox':
                            var dt = '<dt><input type="checkbox" name="' + firmware_options[j].name + '" id="' + firmware_options[j].name + '" ' + checked(firmware_options[j].default) + ' /></dt>';
                            var dd = '<dd><label for="' + firmware_options[j].name + '">' + firmware_options[j].description + '</label></dd>';

                            target_element.append(dt + dd);
                            break;
                    }

                    break;
                }
            }
        }
    }

    $('#content').load("./tabs/basic.html", function() {
        generate_ui(['MOTOR_REVERSE', 'COMP_PWM', 'RC_CALIBRATION']);

        /* // obsolete for now
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
        */

        // bind events
        $('.tab-basic dl:first input').change(function() {
            var element = $(this);
            var name = element.prop('name');
            var val = element.is(':checked');

            console.log(name);
            console.log(val);

        });
    });
}