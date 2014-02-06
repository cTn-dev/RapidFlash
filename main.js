// Get access to the background window object
// This object is used to pass current connectionId to the backround page
// so the onClosed event can close the port for us if it was left opened, without this
// users can experience weird behavior if they would like to access the serial bus afterwards.
chrome.runtime.getBackgroundPage(function(result) {
    backgroundPage = result;
    backgroundPage.app_window = window;
});

$(document).ready(function() {
    PortHandler.initialize();
    
    // alternative - window.navigator.appVersion.match(/Chrome\/([0-9.]*)/)[1];
    GUI.log('Running - OS: <strong>' + GUI.operating_system + '</strong>, ' + 
        'Chrome: <strong>' + window.navigator.appVersion.replace(/.*Chrome\/([0-9.]*).*/,"$1") + '</strong>, ' +
        'Flasher: <strong>' + chrome.runtime.getManifest().version + '</strong>');
    

    // simple flash button for testing
    $('a.flash').click(function() {
        $.get("./test_fw/bs_nfet.hex", function(result) {
            // parsing hex in different thread
            var worker = new Worker('./js/workers/hex_parser.js');
            
            // "callback"
            worker.onmessage = function (event) {
                parsed_hex = event.data;
                
                console.log(parsed_hex);
            };
            
            // send data/string over for processing
            worker.postMessage(result);
        });
    });
});

// accepting single level array with "value" as key
function array_difference(firstArray, secondArray) {
    var cloneArray = [];
    
    // create hardcopy
    for (var i = 0; i < firstArray.length; i++) {
        cloneArray.push(firstArray[i]);
    }
    
    for (var i = 0; i < secondArray.length; i++) {
        if (cloneArray.indexOf(secondArray[i]) != -1) {
            cloneArray.splice(cloneArray.indexOf(secondArray[i]), 1);
        }
    }
    
    return cloneArray;
}