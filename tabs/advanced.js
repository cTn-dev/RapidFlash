function tab_initialize_advanced() {
    function generate_ui(items) {
        var target_element = $('.tab-advanced dl:first');

        function checked(val) {
            if (val) return 'checked';
        }

        for (var i = 0; i < items.length; i++) {
            for (var j = 0; j < firmware_options.length; j++) {
                if (items[i] == firmware_options[j].name) {
                    switch (firmware_options[j].element) {
                        case 'checkbox':
                            var dt = '<dt title="' + firmware_options[j].description + '"><input type="checkbox" name="' + firmware_options[j].name + '" id="' + firmware_options[j].name + '" ' + checked(firmware_options[j].default) + ' /></dt>';
                            var dd = '<dd title="' + firmware_options[j].description + '"><label for="' + firmware_options[j].name + '">[' + firmware_options[j].name + ']</label></dd>';

                            target_element.append(dt + dd);
                            break;
                        case 'number':
                            var dt = '<dt class="number" \
                                title="' + firmware_options[j].description + '">\
                                <input type="number"\
                                       name="' + firmware_options[j].name + '" \
                                       id="' + firmware_options[j].name + '" \
                                       value="' + firmware_options[j].default + '" \
                                       min="' + firmware_options[j].min + '" \
                                       max="' + firmware_options[j].max + '" \/></dt>';

                            var dd = '<dd class="number" title="' + firmware_options[j].description + '"><label for="' + firmware_options[j].name + '">[' + firmware_options[j].name + ']</label></dd>';

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

    $('#content').load("./tabs/advanced.html", function() {
        generate_ui(['MOTOR_REVERSE', 'COMP_PWM', 'RC_CALIBRATION', 'BEACON', 'MOTOR_BRAKE', 'RC_PULS_REVERSE', 'MOTOR_ADVANCE']);

        $('select#firmware').change(function() {
            var val = $(this).val();

            if (val != '0' && val != 'custom') {
                $('.tab-advanced input:disabled').each(function() {
                    $(this).prop('disabled', false);
                });
            } else {
                $('.tab-advanced input:enabled').each(function() {
                    $(this).prop('disabled', true);
                });
            }
        }).change();

        // bind events
        $('.tab-advanced dl:first input').change(function() {
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