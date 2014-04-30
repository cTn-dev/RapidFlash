function tab_initialize_advanced() {
    function generate_ui(items) {
        var target_element = $('.tab-advanced');

        function checked(val) {
            if (val) return 'checked';
        }

        for (var i = 0; i < items.length; i++) {
            for (var j = 0; j < firmware_options.length; j++) {
                if (items[i] == firmware_options[j].name) {
                    switch (firmware_options[j].element) {
                        case 'checkbox':
                            var div = '<div class="checkbox">\
                                <label>\
                                <div><input type="checkbox" name="' + firmware_options[j].name + '" id="' + firmware_options[j].name + '" ' + checked(firmware_options[j].default) + ' /></div>\
                                <div>[' + firmware_options[j].name + ']</div>\
                                <div>' + firmware_options[j].description + '</div>\
                                </label>\
                                </div>';

                            target_element.append(div);
                            break;
                        case 'number':
                            var div = '<div class="number">\
                                <label>\
                                <div>\
                                    <input type="number"\
                                       name="' + firmware_options[j].name + '" \
                                       id="' + firmware_options[j].name + '" \
                                       value="' + firmware_options[j].default + '" \
                                       min="' + firmware_options[j].min + '" \
                                       max="' + firmware_options[j].max + '" \/>\
                                </div>\
                                <div>[' + firmware_options[j].name + ']</div>\
                                <div>' + firmware_options[j].description + '</div>\
                                </label>\
                                </div>';

                            target_element.append(div);
                            break;
                    }

                    break;
                }
            }
        }

        for (var i = 0; i < properties.length; i++) {
            if (properties[i][2] == 'checkbox') {
                $('.tab-advanced input[name="' + properties[i][0] + '"]').prop('checked', properties[i][1]);
            } else if (properties[i][2] == 'number') {
                $('.tab-advanced input[name="' + properties[i][0] + '"]').val(properties[i][1]);
            }
        }
    }

    $('#content').load("./tabs/advanced.html", function() {
        GUI.active_tab = 'advanced';
        ga_tracker.sendAppView('Advanced');

        generate_ui([
            'MOTOR_REVERSE',
            'COMP_PWM',
            'RC_CALIBRATION',
            'BEACON', 'MOTOR_BRAKE',
            'RC_PULS_REVERSE',
            'SLOW_THROTTLE',
            'LOW_BRAKE',
            'CHECK_HARDWARE',
            'BLIP_CELL_COUNT',
            'DEBUG_ADC_DUMP',
            'MOTOR_DEBUG',
            'MOTOR_ADVANCE',
            'BRAKE_SPEED'
        ]);

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
        $('.tab-advanced input').change(function() {
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