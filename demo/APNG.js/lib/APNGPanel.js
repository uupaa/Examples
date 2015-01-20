(function(global) {
"use strict";

// --- dependency modules ----------------------------------
// --- define / local variables ----------------------------
//var _isNodeOrNodeWebKit = !!global.global;
//var _runOnNodeWebKit =  _isNodeOrNodeWebKit &&  /native/.test(setTimeout);
//var _runOnNode       =  _isNodeOrNodeWebKit && !/native/.test(setTimeout);
//var _runOnWorker     = !_isNodeOrNodeWebKit && "WorkerLocation" in global;
//var _runOnBrowser    = !_isNodeOrNodeWebKit && "document" in global;

// --- class / interfaces ----------------------------------
function APNGPanel() {
}

APNGPanel["tiling"]    = APNGPanel_tiling;    // APNGPanel.tiling(tileWidth:UINT16, tileHeight:UINT16, tileLength:UINT16, maximumWidth:UINT16 = 2048, maximumHeight:UINT16 = 2048):PanelObject
APNGPanel["prerender"] = APNGPanel_prerender; // APNGPanel.prerender(decoder:APNGDecoder, panel:PanelObject):HTMLCanvasElementArray
APNGPanel["VERBOSE"]   = false;

// --- implements ------------------------------------------
function APNGPanel_tiling(tileWidth,       // @arg UINT16 - tile width.
                          tileHeight,      // @arg UINT16 - tile height.
                          tileLength,      // @arg UINT16 - tile length.
                          maximumWidth,    // @arg UINT16 = 2048 - maximum panel width.
                          maximumHeight) { // @arg UINT16 = 2048 - maximum panel height.
                                           // @ret PanelObject - { panels, tiles }
                                           // @return.panels PanelObjectArray - panels. [ { w, h }, ... ]
                                           // @return.tiles  TileObjectArray  - tiles.  [ { p, x, y, w, h }, ... ]
/*
    panels = [{
        { w: 2048, h: 2048 },
        { w: 2048, h: 1024 },
    }];
    tiles = [
        { p: 0, x:   0, y: 0, w: 128, h: 128 },
        { p: 0, x: 128, y: 0, w: 128, h: 128 },
        { p: 0, x: 256, y: 0, w: 128, h: 128 },
    ];
 */
    //    +--------+--------+--------+  ^
    //    | tile   | tile   | tile   |  |
    //    +--------+--------+--------+  |
    //    | tile   | tile   | tile   |  | maximumHeight
    //    +--------+--------+--------+  |
    //    | tile   | tile   | tile   |  |
    //    +--------+--------+--------+  |
    //                                  v
    //    <------ maximumWidth -------->

//{@dev
    if (!global["BENCHMARK"]) {
        $valid($type(tileWidth,  "UINT16"), APNGPanel, "tileWidth");
        $valid($type(tileHeight, "UINT16"), APNGPanel, "tileHeight");
        $valid($type(tileLength, "UINT16"), APNGPanel, "tileLength");
        $valid($type(maximumWidth, "UINT16|omit"), APNGPanel, "maximumWidth");
        $valid($type(maximumHeight, "UINT16|omit"), APNGPanel, "maximumHeight");
    }
//}@dev

    maximumWidth  = maximumWidth  || 2048;
    maximumHeight = maximumHeight || 2048;

    var panels = []; // panel objects. [ { w, h }, ... ]
    var tiles  = []; // tile rect objects.  [ { p, x, y, w, h }, ... ]
    var i = 0, iz = tileLength;
    var w = tileWidth;
    var h = tileHeight;
    var p = 0; // panel number

    if (w > maximumWidth || h > maximumHeight) {
        // have too big tiles, will assign 1 panel as 1 tile.
        for (; i < iz; ++i) {
            tiles.push({ "p": i, "x": 0, "y": 0, "w": w, "h": h });
            panels.push({ "w": w, "h": h });
        }
        return { "panels": panels, "tiles": tiles };
    }

    // do tiling to maximum width and maximumHeight.
    var x = -w;
    var y = 0;

    for (; i < iz; ++i) {
        x += w;
        if (x + w > maximumWidth) {
            y += h;
            if (y + h > maximumHeight) {
                ++p;
                y = 0;
            }
            x = 0;
        }
        _add(p, x, y, w, h);
    }

    function _add(p, x, y, w, h) {
        if (p in panels) {
            panels[p]["w"] = Math.max(panels[p]["w"], x + w);
            panels[p]["h"] = Math.max(panels[p]["h"], y + h);
        } else {
            panels[p] = { "w": x + w, "h": y + h };
        }
        tiles.push({ "p": p, "x": x, "y": y, "w": w, "h": h });
    }

    return { "panels": panels, "tiles": tiles };
}

function APNGPanel_prerender(decoder, // @arg APNGDecoder
                             panel) { // @arg PanelObject - { panels, tiles }
                                      // @ret HTMLCanvasElementArray - [canvas, ...]
//{@dev
    $valid($type(decoder, "APNGDecoder"), APNGPanel_prerender, "decoder");
    $valid($type(panel, "PanelObject"),   APNGPanel_prerender, "panel");
    $valid($keys(panel, "panels|tiles"),  APNGPanel_prerender, "panel");
    $valid($type(panel.panels, "Array"),  APNGPanel_prerender, "panel.panels");
    $valid($type(panel.tiles,  "Array"),  APNGPanel_prerender, "panel.tiles");
//}@dev

    var result      = []; // [canvas, ...]
    var ctxs        = []; // [ctx, ...]

    var panels      = panel["panels"];
    var tiles       = panel["tiles"];
    var png         = decoder.toJSON();
    var tz          = tiles.length;
    var fgctx       = _createCanvas(png.width, png.height).getContext("2d");
    var bgctx       = _createCanvas(png.width, png.height).getContext("2d");
    var prevFrame   = null; // previous frame. { x, y, w, h, blend, dispose, pixels }
    var imageData   = null;

    if (APNGPanel["VERBOSE"]) {
        document.body.appendChild(fgctx.canvas);
        document.body.appendChild(bgctx.canvas);
    }
    panels.forEach(function(panel) { // { w, h }
        var canvas = _createCanvas(panel["w"], panel["h"]);
        result.push( canvas );
        ctxs.push( canvas.getContext("2d") );

        if (APNGPanel["VERBOSE"]) {
            canvas.style.cssText = "border: 1px solid red";
            document.body.appendChild(canvas);
        }
    });

    for (var i = 0; i < tz; ++i) {
        var frame   = png.frame[i].toJSON(); // { x, y, w, h, blend, dispose, pixels }
        var fx      = frame["x"];
        var fy      = frame["y"];
        var fw      = frame["w"];
        var fh      = frame["h"];
        var blend   = frame["blend"];   // blend operation
        var dispose = frame["dispose"]; // dispose operation
        var pixels  = frame["pixels"];  // ImagePixel data, Uint8Array

        // --- dispose operation --------------------------
        if (i === 0) { // is first frame
            fgctx.clearRect(0, 0, png.width, png.height);
        } else {
            if (prevFrame.dispose === 1) { // APNG_DISPOSE_OP_BACKGROUND
                fgctx.clearRect(prevFrame.x, prevFrame.y, prevFrame.w, prevFrame.h);
            } else if (prevFrame.dispose === 2) { // APNG_DISPOSE_OP_PREVIOUS
                imageData = bgctx.createImageData(prevFrame.w, prevFrame.h);

                bgctx.clearRect(0, 0, png.width, png.height);
                imageData.data.set(prevFrame.pixels);
                bgctx.putImageData(imageData, prevFrame.x, prevFrame.y);

                fgctx.drawImage(bgctx.canvas, 0, 0, png.width, png.height);
            }
        }
        prevFrame = frame;

        // --- retrieve pixel data ---
        imageData = bgctx.createImageData(fw, fh);
        bgctx.clearRect(0, 0, png.width, png.height);
        imageData.data.set(pixels);
        bgctx.putImageData(imageData, fx, fy);

        // --- blend operation ----------------------------
        if (blend === 0) {
            fgctx.clearRect(fx, fy, fw, fh);
        }
        fgctx.drawImage(bgctx.canvas, 0, 0, png.width, png.height);

        // --- draw frame info ---
        if (APNGPanel["VERBOSE"]) {
            var text = _format("#@,disp:@,blend:@,x:@,y:@,w:@,h:@",
                               [0, i, dispose, blend, fx, fy, fw, fh]);
            fgctx.textBaseline = "bottom";
            fgctx.clearRect(0, fgctx.canvas.height - 15, 300, 30);
            fgctx.fillText(text, 0, fgctx.canvas.height - 3);
        }

        // --- draw sprite canvas -------------------------
        var panelNumber = tiles[i]["p"];

        ctxs[panelNumber].drawImage(fgctx.canvas, tiles[i]["x"], tiles[i]["y"]);
    }
    return result;
}

function _format(format, // @arg String - "@, @, @..."
                 args) { // @ret Array  - [1, 2, 3...]
                         // @ret String - "1, 2, 3..."
    return format.replace(/@/g, function() {
            return args[++args[0]];
        });
}

function _createCanvas(width,    // @arg UINT16
                       height) { // @arg UINT16
                                 // @ret HTMLCanvasElement
    var canvas = document.createElement("canvas");

    canvas["width"]  = width;
    canvas["height"] = height;

    return canvas;
}

// --- validate / assertions -------------------------------
//{@dev
function $valid(val, fn, hint) { if (global["Valid"]) { global["Valid"](val, fn, hint); } }
function $type(obj, type) { return global["Valid"] ? global["Valid"].type(obj, type) : true; }
function $keys(obj, str) { return global["Valid"] ? global["Valid"].keys(obj, str) : true; }
//function $some(val, str, ignore) { return global["Valid"] ? global["Valid"].some(val, str, ignore) : true; }
//function $args(fn, args) { if (global["Valid"]) { global["Valid"].args(fn, args); } }
//}@dev

// --- exports ---------------------------------------------
if (typeof module !== "undefined") {
    module["exports"] = APNGPanel;
}
global["APNGPanel" in global ? "APNGPanel_" : "APNGPanel"] = APNGPanel;

})((this || 0).self || global); // WebModule idiom. http://git.io/WebModule

