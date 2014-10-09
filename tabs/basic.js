function tab_initialize_basic() {
    function generate_ui(items) {
        var target_element = $('.tab-basic');

        function checked(val) {
            if (val) return 'checked';
        }

        for (var i = 0; i < items.length; i++) {
            for (var j = 0; j < FIRMWARE_OPTIONS.length; j++) {
                if (items[i] == FIRMWARE_OPTIONS[j].name) {
                    switch (FIRMWARE_OPTIONS[j].element) {
                        case 'checkbox':
                            var div = '<div class="checkbox">\
                                <label>\
                                <div><input type="checkbox" name="' + FIRMWARE_OPTIONS[j].name + '" id="' + FIRMWARE_OPTIONS[j].name + '" ' + checked(FIRMWARE_OPTIONS[j].default) + ' /></div>\
                                <div>[' + FIRMWARE_OPTIONS[j].name + ']</div>\
                                <div>' + FIRMWARE_OPTIONS[j].description + '</div>\
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
        if (GUI.active_tab != 'basic') {
            GUI.active_tab = 'basic';
            googleAnalytics.sendAppView('Basic');
        }

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