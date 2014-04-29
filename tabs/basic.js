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
                            var dt = '<dt title="' + firmware_options[j].name + '"><input type="checkbox" name="' + firmware_options[j].name + '" id="' + firmware_options[j].name + '" ' + checked(firmware_options[j].default) + ' /></dt>';
                            var dd = '<dd title="' + firmware_options[j].name + '"><label for="' + firmware_options[j].name + '">' + firmware_options[j].description + '</label></dd>';

                            target_element.append(dt + dd);
                            break;
                    }

                    break;
                }
            }
        }

        for (var i = 0; i < properties.length; i++) {
            if (properties[i][2] == 'checkbox') {
                $('input[name="' + properties[i][0] + '"]').prop('checked', properties[i][1]);
            } else {
                $('input[name="' + properties[i][0] + '"]').val(properties[i][1]);
            }
        }
    }

    $('#content').load("./tabs/basic.html", function() {
        generate_ui(['MOTOR_REVERSE', 'RC_CALIBRATION', 'BEACON', 'MOTOR_BRAKE']);

        $('select#firmware').change(function() {
            var val = $(this).val();

            if (val != '0' && val != 'custom') {
                $('.tab-basic input:disabled').each(function() {
                    $(this).prop('disabled', false);
                });
            } else {
                $('.tab-basic input:enabled').each(function() {
                    $(this).prop('disabled', true);
                });
            }
        }).change();

        // bind events
        $('.tab-basic dl:first input').change(function() {
            var element = $(this);
            var type = element.prop('type');
            var name = element.prop('name');

            if (type == 'checkbox') {
                var val = + element.is(':checked'); // + converts boolean to decimal
            } else {
                var val = element.val();
            }

            for (var i = 0; i < properties.length; i++) {
                if (properties[i][0] == name) {
                    properties[i][1] = val;

                    return;
                }
            }

            properties.push([name, val, type]);
        });
    });
}