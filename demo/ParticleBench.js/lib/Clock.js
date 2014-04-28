// @name: Clock.js
// @require: Valid.js
// @cutoff: @assert @node @xbrowser

(function(global) {
"use strict";

// --- variable --------------------------------------------
//{@assert
var Valid = global["Valid"] || require("uupaa.valid.js");
//}@assert

var _inNode = "process" in global;

// --- define ----------------------------------------------
var PERFORMANCE = (global["performance"] || 0)["now"] ? global["performance"] : Date;

var VSYNC_START = global["requestAnimationFrame"]       ? "requestAnimationFrame"
/*{@xbrowser*/  : global["msRequestAnimationFrame"]     ? "msRequestAnimationFrame"
                : global["mozRequestAnimationFrame"]    ? "mozRequestAnimationFrame"
/*}@xbrowser*/  : global["webkitRequestAnimationFrame"] ? "webkitRequestAnimationFrame"
                                                        : "setTimeout";

var VSYNC_STOP  = global["cancelAnimationFrame"]        ? "cancelAnimationFrame"
/*{@xbrowser*/  : global["msCancelAnimationFrame"]      ? "msCancelAnimationFrame"
                : global["mozCancelAnimationFrame"]     ? "mozCancelAnimationFrame"
/*}@xbrowser*/  : global["webkitCancelAnimationFrame"]  ? "webkitCancelAnimationFrame"
                                                        : "clearTimeout";
// --- interface -------------------------------------------
function Clock(options) { // @arg Object(= null): { vsync, speed }
                          //    options.vsync - Boolean: use requestAnimationFrame, use setInterval is false.
                          //    options.speed - Number(= 4): setInterval(, speed)
                          // @desc: Master Clock.
                          // @help: Clock
//{@assert
    _if(!Valid.type(options, "Object/omit", "vsync,speed"), "Clock(options)");
    if (options) {
        _if(!Valid.type(options.vsync, "Boolean/omit"), "Clock(options.vsync)");
        _if(!Valid.type(options.speed, "Number/omit"),  "Clock(options.speed)");
    }
//}@assert

    options = options || {};

    this._vsync     = options.vsync || false;   // Boolean: vsync mode
    this._speed     = options.speed || 4;       // Integer: setInterval(, speed)
    this._tid       = 0;                        // Integer: timer id.
    this._counter   = 0;                        // Integer: callback counter.
    this._running   = false;                    // Boolean: Master clock running state. true is running, false is stopped.
    this._beginTime = 0.0;                      // Number: begin DateTime(from 0)
    this._lastTime  = 0.0;                      // Number: last DateTime
    this._callback  = [];                       // FunctionArray: callback functions. [callback, ...]
    this._sweep     = [];                       // FunctionArray: sweep functions. [callback, ... ]
    this._tickRef   = _tick.bind(this);         // ThisBoundFunction:
}

Clock["repository"] = "https://github.com/uupaa/Clock.js";
Clock["prototype"] = {
    "constructor":  Clock,              // new Clock(options:Object = null):Clock
    // --- register / unregister ---
    "on":           Clock_on,           // Clock#on(callback:Function):this
    "off":          Clock_off,          // Clock#off(callback:Function):this
    "has":          Clock_has,          // Clock#has(callback):Boolean
    "once":         Clock_once,         // Clock#once(callback:Function, times:Integer = 1):this
    "clear":        Clock_clear,        // Clock#clear():this
    // --- master clock ---
    "run":          Clock_run,          // Clock#run():this
    "stop":         Clock_stop,         // Clock#stop():this
    "isRunning":    Clock_isRunning,    // Clock#isRunning():Boolean
    // --- utility ---
    "resetCount":   Clock_resetCount    // Clock#resetCount():this
};

// --- implement -------------------------------------------
function Clock_on(callback) { // @arg Function: callback(counter:Integer, now:Number, delta:Number):void
                              // @ret this:
                              // @help: Clock#on
                              // @desc: register callback.
//{@assert
    _if(!Valid.type(callback, "Function"), "Clock#on(callback)");
//}@assert

    if ( !this["has"](callback) ) {
        this._callback.push(callback);
    }
    return this;
}

function Clock_off(callback) { // @arg Function: registered callback.
                               // @ret this:
                               // @help: Clock#off
                               // @desc: deregister callback.
//{@assert
    _if(!Valid.type(callback, "Function"), "Clock#off(callback)");
//}@assert

    if ( this["has"](callback) ) {
        this._sweep.push(callback);
    }
    if (!this._running) {
        _sweep(this);
    }
    return this;
}

function Clock_has(callback) { // @arg Function: callback
                               // @ret Boolean: true is registered, false is unregistered.
                               // @help: Clock#is
                               // @desc: callback has registered?
//{@assert
    _if(!Valid.type(callback, "Function"), "Clock#is(callback)");
//}@assert

    return (this._callback.indexOf(callback) >= 0) &&
           (this._sweep.indexOf(callback) < 0);
}


function Clock_once(callback, // @arg Function: callback(counter:Integer, now:Number, delta:Number):void
                    times) {  // @arg Integer(= 1):
                              // @ret this:
                              // @help: Clock#once
                              // @desc: register the callback of one-time-only.
//{@assert
    _if(!Valid.type(callback, "Function"),                "Clock#once(callback)");
    _if(!Valid.type(times, "Integer/omit") || times <= 0, "Clock#once(,times)");
//}@assert

    times = times || 1;
    var that = this;

    return that["on"](_handler);

    function _handler(counter, now, delta) {
        callback(counter, now, delta);
        if (--times <= 0) {
            that["off"](_handler);
        }
    }
}

function Clock_clear() { // @ret this:
                         // @help: Clock#clear
                         // @desc: Clear all callbacks.
    Array.prototype.push.apply(this._sweep, this._callback.slice());
    return this;
}

function Clock_run() { // @ret this:
                       // @help: Clock#run
                       // @desc: Start the master clock.
    var that = this;

    if (!that._running) {
        that._running = true;

        // --- init Master clock ---
        that._beginTime = PERFORMANCE["now"](); // performance.now() or Date.now()
        that._lastTime  = 0;
        if (that._vsync) {
            that._tid = global[VSYNC_START](that._tickRef, 16); // 16 <- 16.666 <- 1000 / 60fps
        } else {
            that._tid = global.setInterval(that._tickRef, that._speed);
        }
    }
    return that;
}

function Clock_stop() { // @ret this:
                        // @help: Clock#stop
                        // @desc: Stop the master clock.
    var that = this;

    if (that._running) {
        that._running = false;
        if (that._vsync) {
            global[VSYNC_STOP](that._tid);
        } else {
            global.clearInterval(that._tid);
        }
        that._tid = 0;
        _sweep(that);
    }
    return that;
}


    // interval tick, onEnterFrame function
    function _tick() {
        var that = this;

        // --- schedule next tick ---
        if (that._vsync) {
            if (that._running) {
                // requestAnimationFrame(_onEnterFrame) or setTimeout(_onEnterFrame, 16)
                that._tid = global[VSYNC_START](that._tickRef, 16); // 16 <- 16.666 <- 1000 / 60fps
            }
        }

        // --- sweep deregistered callbacks ---
        if (that._sweep.length) {
            _sweep(that);
        }

        var i = 0, iz = that._callback.length;

        if (iz) {
            // --- get current time and delta time ---
            var now   = PERFORMANCE["now"]() - that._beginTime; // performance.now() or Date.now()
            var delta = that._lastTime ? now - that._lastTime
                                       : 0; // init
            // --- callback ---
            var counter = that._counter++;

            for (; i < iz; ++i) {
                var callback = that._callback[i];

                if (callback) {
                    callback(counter, now, delta);
                }
            }
            // --- finish ---
            that._lastTime = now;
        }
    }


function _sweep(that) {
    if (that._sweep.length) {
        var sweepedCallbacks = [];

        for (var i = 0, iz = that._callback.length; i < iz; ++i) {
            var callback = that._callback[i];

            if (that._sweep.indexOf(callback) < 0) {
                sweepedCallbacks.push(callback);
            }
        }
        that._sweep = [];
        that._callback = sweepedCallbacks;
    }
}

function Clock_isRunning() { // @ret Boolean: true is running, false is stopped
                             // @help: Clock#isRunning
    return this._running;
}

function Clock_resetCount() { // @ret this:
                              // @help: Clock#resetCount
    this._counter = 0;
    return this;
}

//{@assert
function _if(value, msg) {
    if (value) {
        console.error(Valid.stack(msg));
        throw new Error(msg);
    }
}
//}@assert

// --- export ----------------------------------------------
//{@node
if (_inNode) {
    module["exports"] = Clock;
}
//}@node
if (global["Clock"]) {
    global["Clock_"] = Clock; // already exsists
} else {
    global["Clock"]  = Clock;
}

})((this || 0).self || global);

