(function(global) {
"use strict";

// --- dependency modules ----------------------------------
var Clock       = global["Clock"];
var Codec       = global["Codec"];
var MessagePack = global["Codec"]["MessagePack"];
var APNGDecoder = global["APNGDecoder"];
var APNGPanel   = global["APNGPanel"];

// --- define / local variables ----------------------------
//var _isNodeOrNodeWebKit = !!global.global;
//var _runOnNodeWebKit =  _isNodeOrNodeWebKit &&  /native/.test(setTimeout);
//var _runOnNode       =  _isNodeOrNodeWebKit && !/native/.test(setTimeout);
//var _runOnWorker     = !_isNodeOrNodeWebKit && "WorkerLocation" in global;
//var _runOnBrowser    = !_isNodeOrNodeWebKit && "document" in global;

// --- class / interfaces ----------------------------------
function APNGImage(options) { // @arg Object = {} - { x, y, canvas, clock, loop, autoplay, threadPool, canvasShare, decoderShare }
                              // @options.x        Integer = 0
                              // @options.y        Integer = 0
                              // @options.canvas   HTMLCanvasElement - draw target
                              // @options.clock    Clock = null
                              // @options.loop     Boolean = false
                              // @options.autoplay Boolean = false
                              // @options.threadPool ThreadPool = null
                              // @options.canvasShare Boolean = false
                              // @options.decoderShare WeakMap = null
//{@dev
    if (!global["BENCHMARK"]) {
        $valid($type(options, "Object|omit"), APNGImage, "options");
        $valid($keys(options, "x|y|canvas|clock|loop|autoplay|threadPool|canvasShare|decoderShare"), APNGImage, "options");
        if (options) {
            $valid($type(options.x,             "Integer|omit"),           APNGImage, "options.x");
            $valid($type(options.y,             "Integer|omit"),           APNGImage, "options.x");
            $valid($type(options.canvas,        "HTMLCanvasElement|omit"), APNGImage, "options.canvas");
            $valid($type(options.clock,         "Clock|omit"),             APNGImage, "options.clock");
            $valid($type(options.loop,          "Boolean|omit"),           APNGImage, "options.loop");
            $valid($type(options.autoplay,      "Boolean|omit"),           APNGImage, "options.autoplay");
            $valid($type(options.threadPool,    "ThreadPool|omit"),        APNGImage, "options.threadPool");
            $valid($type(options.canvasShare,   "Boolean|omit"),           APNGImage, "options.canvasShare");
            $valid($type(options.decoderShare,  "WeakMap|omit"),           APNGImage, "options.decoderShare");
        }
    }
//}@dev

    options = options || {};

    this._clock         = options["clock"]        || new Clock([], { vsync: true, suspend: true, start: true });
    this._loop          = options["loop"]         || false;
    this._autoplay      = options["autoplay"]     || false;
    this._threadPool    = options["threadPool"]   || null;
    this._canvasShare   = options["canvasShare"]  || false;
    this._decoderShare  = options["decoderShare"] || null; // WeakMap

    this._tick      = _tick.bind(this);
    this._redraw    = _redraw.bind(this);
    this._src       = null;     // URLString|File|Blob|ArrayBuffer|APNGDecoder|HTMLImageElement
    // --- decode data -------------------------------------
    this._decoder   = null;     // APNGDecoder
    this._png       = null;     // Object. { apng, width, height, frame, loopCount, frameDelays, usePosterFrame }
    this._animation = {
        panel:      null,       // png panels and png tiles. aka: PNG Image CSS Sprite
        frames:     null,       // animation frames
        canvases:   null,       // panel canvas
        ctxs:       null        // panel canvas context
    };
    // --- internal state ----------------------------------
    this._adjust    = false;    // adjust the last modified time to timeStamp.
    this._decoded   = false;    // png decoded
    this._loading   = false;    // now loading
    this._playing   = false;    // if (decoded &&  playing) -> playing
                                // if (decoded && !playing) -> paused
    // --- event handler -----------------------------------
    this._handler  = { loadstart: null, play: null, pause: null, ended: null, canplay: null, enterframe: null };
    // --- view --------------------------------------------
    this._view = {
        modat:      0.0,        // last modified time
        i:          0,          // frame index
        iz:         0,          // frame length
        x:          options["x"] || 0,
        y:          options["y"] || 0,
        canvas:     null,
        ctx:        null
    };
    this["canvas"] = options["canvas"];
}

APNGImage["VERBOSE"] = false;
APNGImage["prototype"] = Object.create(APNGImage["prototype"], {
    "constructor":  { "value": APNGImage            }, // new APNGImage(source:URLString|ArrayBuffer):APNGImage
    "play":         { "value": APNGImage_play       }, // APNGImage#play():void
    "pause":        { "value": APNGImage_pause      }, // APNGImage#pause():void
    "x":            { "set": function(v) { this._view.x = v | 0; },
                      "get": function()  { return this._view.x; } },
    "y":            { "set": function(v) { this._view.y = v | 0; },
                      "get": function()  { return this._view.y; } },
    "src":          { "set": function(v) { if (this._src !== v) { this._src = v; _decode(this); } },
                      "get": function()  { return this._src; } },
    "canvas":       { "set": function(v) { if (v) { this._view.canvas = v; this._view.ctx = v.getContext("2d"); } },
                      "get": function()  { return this._view.canvas; } },
    "decoder":      { "get": function()  { return this._decoder; } },
    "currentFrame": { "set": function(v) { this._view.i = v % this._animation.frames.length;
                                           this._redraw(); },
                      "get": function()  { return this._view.i % this._animation.frames.length; } },
    "frameLength":  { "get": function()  { return this._animation.frames.length || 0; } },
    "paused":       { "get": function()  { return !this._playing; } },
    "ended":        { "get": function()  { return this._view.i >= this._view.iz; } },
    "state":        { "get": function()  { if (this._decoded) { return this.ended ? "ended" : this._playing ? "playing" : "paused"; }
                                           return this._loading ? "loading" : "wait"; } },
    "onloadstart":  { "set": function(v) { this._handler.loadstart  = v; } },
    "onplay":       { "set": function(v) { this._handler.play       = v; } },
    "onpause":      { "set": function(v) { this._handler.pause      = v; } },
    "onended":      { "set": function(v) { this._handler.ended      = v; } },
    "oncanplay":    { "set": function(v) { this._handler.canplay    = v; } },
    "onenterframe": { "set": function(v) { this._handler.enterframe = v; } },
});

// --- implements ------------------------------------------
function _decode(that) {
    that._decoded = false;
    that._loading = true;

    _drawPosterFrame(that);

    if (that._handler.loadstart) {
        that._handler.loadstart( { "type": "loadstart", "target": that } );
    }

    if (that._decoderShare.has(that._src)) {
        _decoded( that._decoderShare.get(that._src) );
    } else {
        var src = that._src;

        if (src instanceof HTMLImageElement) { // <img>
            src = src["src"]; // <img src>
        }
        if (src instanceof APNGDecoder) {
                _decoded(src);
        } else if (that._threadPool) {
            // decode by worker thread.
            that._threadPool.post(null, "", src, null, function(event, key, arrayBuffer) {
                _decoded( MessagePack["decode"](new Uint8Array(arrayBuffer)) );
            });
        } else {
            // decode by main thread.
            Codec["toArrayBuffer"](src, function(arrayBuffer) {
                var decoder = new APNGDecoder(new Uint8Array(arrayBuffer));
                if (decoder["decode"]()) {
                    _decoded(decoder);
                }
            });
        }
    }

    function _decoded(decoder) {
        that._decoder = decoder;

        var png    = decoder["toJSON"]();
        var width  = png.width;
        var height = png.height;

        // --- set decod data ------------------------------
        that._png = png;
        that._animation.panel    = APNGPanel["tiling"](width, height, png.frame.length); // { panels, tiles }
        that._animation.frames   = decoder["getAnimationFrames"](); // [ { index: 1, delay: 40 }, ... ]
        that._animation.canvases = APNGPanel["prerender"](decoder, that._animation.panel); // [canvas, ...]
        that._animation.ctxs     = that._animation.canvases.map(function(canvas) {
                                        return canvas.getContext("2d");
                                    });
        // --- reset view ----------------------------------
        that._view.modat = 0.0;
        that._view.i     = 0;
        that._view.iz    = that._loop ? (that._animation.frames.length * 0xff) // x 255 loop
                                      :  that._animation.frames.length;
      //that._view.canvas= null;
      //that._view.ctx   = null;
      //that._view.x     = 0;
      //that._view.y     = 0;
        // -------------------------------------------------
        _resizeCanvas(that, width, height);

        that._decoded = true;
        that._loading = false;

        if (that._decoderShare) {
            that._decoderShare.set(that._src, decoder);
        }
        if (that._handler.canplay) {
            that._handler.canplay( { "type": "canplay", "target": that } );
        }
        if (that._autoplay) {
            that["play"]();
        }
    }
}

function APNGImage_play() {
    this._clock.on(this._tick);
    if ( this._view && this._png && this._png.apng ) {
        if (this._view.i >= this._view.iz) {
            this._view.i = 0;
        }
        if (!this._playing) {
            this._playing = true;
            this._adjust = true;
            if (this._handler.play) {
                this._handler.play( { "type": "play", "target": this } );
            }
        }
    }
}
function APNGImage_pause() {
    this._clock.off(this._tick);
    if (this._playing) {
        this._playing = false;
        if (this._handler.pause) {
            this._handler.pause( { "type": "pause", "target": this } );
        }
    }
}

function _tick(timeStamp /* deltaTime, count */) {
    var view = this._view;

    if (this._decoded && this._playing && view.i < view.iz) {
        if (this._adjust) {
            this._adjust = false;
            view.modat = timeStamp;
        }
        var i      = view.i;
        var iz     = view.iz;
        var modat  = view.modat;
        var redraw = i === 0;   // first frame -> redraw

        if (!redraw) {
            var frames = this._animation.frames;
            var prevFrame = frames[(i - 1) % frames.length]; // { index, delay }
            if (timeStamp - modat >= prevFrame["delay"]) {
                timeStamp = modat +  prevFrame["delay"];
                redraw = true;
            }
        }
        if (redraw) {
            this._redraw();

            if (this._handler.enterframe) {
                this._handler.enterframe({ "type": "enterframe", "target": this });
            }

            // udpate last modified time and animation frames index
            view.modat = timeStamp;

            if (++view.i >= iz) {
                this._playing = false;
                if (this._handler.ended) {
                    this._handler.ended({ "type": "ended", "target": this });
                }
            }
        }
    }
}

function _redraw() {
    if (this._decoded) {
        var view = this._view;
        var frames = this._animation.frames;
        var frameIndex = frames[view.i % frames.length]["index"];
        var tile = this._animation.panel["tiles"][frameIndex]; // { p, x, y, w, h }
        var pn = tile["p"]; // panel number
        var tw = tile["w"]; // tile width
        var th = tile["h"]; // tile height
        var x  = view.x;
        var y  = view.y;

        if (!this._canvasShare) {
            x = 0;
            y = 0;
            view.ctx.clearRect(0, 0, tw, th);
        }
        // BitBlt
        view.ctx.drawImage(this._animation.ctxs[pn].canvas,
                           tile["x"], tile["y"], tw, th, x, y, tw, th);
    }
}

function _drawPosterFrame(that) {
    if (that._src instanceof HTMLImageElement) {
        var w = that._src.naturalWidth;
        var h = that._src.naturalHeight;

        _resizeCanvas(that, w, h);
        that._view.ctx.drawImage(that._src, 0, 0, w, h);
    } else if (typeof that._src === "string") {
        var img = new Image();
        img.onload = function() {
            that._view.ctx.drawImage(img, 0, 0, img.width, img.height);
        };
        img.src = that._src;
    }
}

function _resizeCanvas(that, width, height) {
    if (that._view.canvas.width  !== width ||
        that._view.canvas.height !== height) {
        that._view.canvas.width    = width;
        that._view.canvas.height   = height;
    }
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
    module["exports"] = APNGImage;
}
global["APNGImage" in global ? "APNGImage_" : "APNGImage"] = APNGImage; // switch module. http://git.io/Minify

})((this || 0).self || global); // WebModule idiom. http://git.io/WebModule

