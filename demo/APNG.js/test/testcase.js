var ModuleTestAPNG = (function(global) {

var _isNodeOrNodeWebKit = !!global.global;
var _runOnNodeWebKit =  _isNodeOrNodeWebKit &&  /native/.test(setTimeout);
var _runOnNode       =  _isNodeOrNodeWebKit && !/native/.test(setTimeout);
var _runOnWorker     = !_isNodeOrNodeWebKit && "WorkerLocation" in global;
var _runOnBrowser    = !_isNodeOrNodeWebKit && "document" in global;

var test = new Test("APNG", {
        disable:    false,
        browser:    true,
        worker:     false,
        node:       false,
        nw:         false,
        button:     false,
        both:       false, // test the primary module and secondary module
        ignoreError:false,
    }).add([ ]);

if (_runOnBrowser || _runOnNodeWebKit) {
    test.add([
        setup,
        drawPNGImage,
    ]);
}

//APNGPanel["VERBOSE"] = true; // verbose mode
global["apng"] = null; // apng instance
global["clock"] = null;
global["nodes"] = {}; // { clockrange, ... }
global["decoder"] = {};
global["reuseMap"] = new WeakMap();
global["threadPool"] = null;

return test.run().clone();

// --- setup -----------------------------------------------
function setup(test, pass, miss) {

    global["clock"] = new Clock([], { start: true, wait: 16.666, pulse: 16.666, suspend: true });
//  global["clock"] = new Clock([], { start: true, vsync: true, suspend: true });

    global["threadPool"] = new ThreadPool([
                new Thread("../lib/APNGDecodeThread.js"),
                new Thread("../lib/APNGDecodeThread.js"),
            ]);

    var clock     = global["clock"];
    var nodes     = global["nodes"];
    var rangeList = document.querySelectorAll("#form>input[type=range]"); // [clockrange, pluserange]
    var spanList  = document.querySelectorAll("#form>span"); // [clockms, clockfps, ...]

    nodes["clockrange"]   = rangeList[0];
    nodes["pluserange"]   = rangeList[1];
    nodes["clockms"]      = spanList[0];
    nodes["clockfps"]     = spanList[1];
    nodes["plusems"]      = spanList[2];
    nodes["state"]        = spanList[3];
    nodes["frameLength"]  = spanList[4];
    nodes["currentFrame"] = spanList[5];

    // --- wait handler ---
    nodes["clockms"].textContent = clock.wait;
    nodes["clockfps"].textContent = (1000 / clock.wait) | 0;
    nodes["clockrange"].value = clock.wait;
    nodes["clockrange"].onchange = function(event) {
        var value = parseInt(event.target.value);
        clock.wait = value;
        nodes["clockms"].textContent = value;
        nodes["clockfps"].textContent = (1000 / value) | 0;
    };
    // --- pulse handler ---
    nodes["plusems"].textContent = clock.pulse;
    nodes["pluserange"].value = clock.pulse;
    nodes["pluserange"].onchange = function(event) {
        var value = parseInt(event.target.value);
        clock.pulse = value;
        nodes["plusems"].textContent = value;
    };
    // --- frame information ---

    test.done(pass());
}

// ---------------------------------------------------------
function drawPNGImage(test, pass, miss) {
    // test.done(pass());

/* keep
    document.querySelector('input[type="file"]').addEventListener("change", function(event) {
        var source = event.target.files[0];

      //drawImageNode(source);
        drawCanvasNode(source);
    });
 */
    var imageList = document.querySelectorAll("img");

    [].slice.call(imageList).forEach(function(image) {
        image.onclick = function(event) {
            drawCanvasNode(event.target);
        };
    });
}

/*
function drawImageNode(source) {
    var image = document.querySelector("img");

    var reader = new FileReader();
    reader.onload = function(event) {
        image.src = reader.result;
    };
    reader.readAsDataURL(source);
}
 */

function drawCanvasNode(source) { // HTMLImageElement
    var canvas = document.querySelector("canvas");
    var options = {
            x:              0,
            y:              0,
            canvas:         canvas,
            clock:          clock,
            loop:           true,
            autoplay:       true,
            threadPool:     global["threadPool"],
            canvasShare:    false,
            decoderShare:   global["reuseMap"],
        };
    var apng = global["apng"];

    if (!apng) {
        apng = new APNGImage(options);
        apng.onenterframe = function(event) {
            var clock = global["clock"];

            nodes["currentFrame"].textContent = apng.currentFrame;
            nodes["frameLength"].textContent  = apng.frameLength;
            nodes["state"].textContent        = apng.state;
        };
        apng.onplay      = function(event) { nodes["state"].textContent = apng.state; };
        apng.onpause     = function(event) { nodes["state"].textContent = apng.state; };
        apng.onended     = function(event) { nodes["state"].textContent = apng.state; };
        apng.oncanplay   = function(event) { nodes["state"].textContent = apng.state; };
        apng.onloadstart = function(event) { nodes["state"].textContent = apng.state; };
        apng.src = source;

        global["apng"] = apng; // export to global
    } else {
        apng.src = source;
    }
}

})((this || 0).self || global);

