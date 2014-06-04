function request_firmware(callback) {
    GUI.log('<strong>Requesting</strong> firmware');

    var host = 'http://www.openlrsng.org/cgi-bin/tgy/gethex.cgi?';
    var firmware = $('select#firmware').val();
    var release = $('select#release').val();

    var params = {};
    for (var i = 0; i < properties.length; i++) {
        params[properties[i][0]] = properties[i][1];
    }

    var url;
    if (release == 'master') {
        url = host + 'BOARD=' + firmware + '.hex' + '&' + $.param(params);
    } else {
        url = host + 'GITVERSION=' + release + '&BOARD=' + firmware + '.hex' + '&' + $.param(params);
    }

    console.log('Requesting - ' + url);

    $.get(url, function(data) {
        if (data.indexOf('ERROR') == -1) {
            GUI.log('Firmware <span style="color: green">received</span>');

            ihex.raw = data;

            // parsing hex in different thread
            var worker = new Worker('./js/workers/hex_parser.js');

            // "callback"
            worker.onmessage = function (event) {
                ihex.parsed = event.data;

                if (callback) callback(ihex.raw, ihex.parsed);
            };

            // send data/string over for processing
            worker.postMessage(data);
        } else {
            GUI.log('Compile Server - <span style="color: red">Error</span>: ' + data.slice(6));
        }
    }).fail(function() {
        GUI.log('<span style="color: red">Failed</span> to contact compile server');
    });
}

function request_releases(callback) {
    $.get('http://www.openlrsng.org/cgi-bin/tgy/taglist.cgi', function(data) {
        var releases = data.split('\n');
        releases.pop(); // remove last (empty) member
        releases.reverse();

        callback(releases);
    }).fail(function() {
        GUI.log('<span style="color: red">Failed</span> to request releases from compile server');
    });
}