function tab_initialize_basic() {
    function generate_ui(items) {
        var target_element = $('.tab-basic');

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
                    }

                    break;
                }
            }
        }

        for (var i = 0; i < PROPERTIES.length; i++) {
            if (PROPERTIES[i][2] == 'checkbox') {
                $('.tab-basic input[name="' + PROPERTIES[i][0] + '"]').prop('checked', PROPERTIES[i][1]);
            } else if (PROPERTIES[i][2] == 'number') {
                $('.tab-basic input[name="' + PROPERTIES[i][0] + '"]').val(PROPERTIES[i][1]);
            }
        }
    }

    $('#content').load("./tabs/basic.html", function() {
        GUI.active_tab = 'basic';
        googleAnalytics.sendAppView('Basic');

        generate_ui([
            'MOTOR_REVERSE',
            'RC_CALIBRATION',
            'BEACON',
            'MOTOR_BRAKE'
        ]);

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
        $('.tab-basic input').change(function() {
            var element = $(this);
            var type = element.prop('type');
            var name = element.prop('name');

            if (type == 'checkbox') {
                var val = + element.is(':checked'); // + converts boolean to decimal
            } else {
                var val = element.val();
            }

            for (var i = 0; i < PROPERTIES.length; i++) {
                if (PROPERTIES[i][0] == name) {
                    PROPERTIES[i][1] = val;

                    return;
                }
            }

            PROPERTIES.push([name, val, type]);
        });
    });
}