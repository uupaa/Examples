// @name: Clock.js
// @require: Valid.js
// @cutoff: @assert @node

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
                : global["msRequestAnimationFrame"]     ? "msRequestAnimationFrame"
                : global["mozRequestAnimationFrame"]    ? "mozRequestAnimationFrame"
                : global["webkitRequestAnimationFrame"] ? "webkitRequestAnimationFrame"
                                                        : "setTimeout";

var VSYNC_STOP  = global["cancelAnimationFrame"]        ? "cancelAnimationFrame"
                : global["msCancelAnimationFrame"]      ? "msCancelAnimationFrame"
                : global["mozCancelAnimationFrame"]     ? "mozCancelAnimationFrame"
                : global["webkitCancelAnimationFrame"]  ? "webkitCancelAnimationFrame"
                                                        : "clearTimeout";
// --- interface -------------------------------------------
function Clock(options) { // @arg Object(= null): { vsync: Boolean, speed: 4 }
                          //    options.vsync - Boolean: true is VSync mode.
                          //    options.speed - Number: setInterval(, speed)
                          // @desc: Master Clock.
                          // @help: Clock
//{@assert
    _if(!Valid.type(options, "Object/omit", "vsync,speed"), "Clock(options)");
//}@assert

    options = options || {};

    this._vsync     = options.vsync || false;   // vsync mode
    this._speed     = options.speed || 4;       // setInterval(, speed)
    this._tid       = 0;                        // interval timer id.
    this._counter   = 0;                        // counter
    this._running   = false;                    // running state. true is running, false is stoped.
    this._beginTime = 0;                        // begin DateTime(from 0)
    this._lastTime  = 0;                        // last DateTime
    this._callback  = [];                       // callback functions. [fn, ...]
    this._on        = [];                       // on/off flags. [Boolean, ... ]
}

Clock["repository"] = "https://github.com/uupaa/Clock.js";
Clock["prototype"] = {
    "constructor":  Clock,
    "on":           Clock_on,           // Clock#on(callback:Function):Boolean
    "off":          Clock_off,          // Clock#off(callback:Function):Boolean
    "once":         Clock_once,         // Clock#once(callback:Function, times:Integer = 1):Boolean
    "clear":        Clock_clear,        // Clock#clear():this
    "run":          Clock_run,          // Clock#run():this
    "stop":         Clock_stop,         // Clock#stop():this
    "isRunning":    Clock_isRunning,    // Clock#isRunning():Boolean
    "resetCount":   Clock_resetCount    // Clock#resetCount():this
};

// --- implement -------------------------------------------
function Clock_on(callback) { // @arg Function: callback(counter:Integer, now:Number, delta:Number):void
                              // @ret Boolean: true is register, false is already registered.
                              // @help: Clock#on
//{@assert
    _if(!Valid.type(callback, "Function"), "Clock#on(callback)");
//}@assert

    var pos = this._callback.indexOf(callback);

    if (pos < 0) { // not exists
        this._callback.push(callback); // add callback
        this._on.push(true);           // on
        return true;
    } else if (!this._on[pos]) { // off?
        this._on[pos] = true;    // off -> on
        return true;
    }
    return false;
}

function Clock_off(callback) { // @arg Function: registered callback.
                               // @ret Boolean: true is unregistered, false is not registered.
                               // @help: Clock#off
//{@assert
    _if(!Valid.type(callback, "Function"), "Clock#off(callback)");
//}@assert

    var pos = this._callback.indexOf(callback);

    if (pos >= 0 && this._on[pos]) {
        this._on[pos] = false; // on -> off
        return true;
    }
    return false;
}

function Clock_once(callback, // @arg Function: callback(counter:Integer, now:Number, delta:Number):void
                    times) {  // @arg Integer(= 1):
                              // @ret Boolean: true is register, false is already registered.
                              // @desc: register the callback of once.
                              // @help: Clock#once
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
    for (var i = 0, iz = this._on.length; i < iz; ++i) {
        this._on[i] = false;
    }
    return this;
}

function Clock_run() { // @ret this:
                       // @help: Clock#run
    _runner(this, true);
    return this;
}

function Clock_stop() { // @ret this:
                        // @help: Clock#stop
    _runner(this, false);
    return this;
}

function _runner(that,  // @arg this:
                 run) { // @arg Boolean: true is run, false is stop.
                        // @desc: tick and onEnterFrame runner
    if (run) {
        if (!that._running) {
            that._running = true;
            that._beginTime = PERFORMANCE.now();
            that._lastTime  = 0;
            if (that._vsync) {
                that._tid = global[VSYNC_START](_tick, 16); // 16.666 = 1000 / 60fps
            } else {
                that._tid = global.setInterval(_tick, that._speed);
            }
        }
    } else {
        if (that._running) {
            that._running = false;
            if (that._vsync) {
                global[VSYNC_STOP](that._tid);
            } else {
                global.clearInterval(that._tid);
            }
            _sweep(that);
        }
    }

    // interval tick or onEnterFrame
    function _tick() {
        var iz = that._callback.length;

        if (that._vsync) {
            if (that._running) {
                that._tid = global[VSYNC_START](_tick, 16); // 16.666 = 1000 / 60fps
            }
        }
        if (iz) {
            var sweep = false;
            var now = PERFORMANCE["now"]() - that._beginTime; // (performance || Date).now()
            var delta = now - that._lastTime;

            if (!that._lastTime) {
                delta = 0;
            }
            for (var i = 0; i < iz; ++i) {
                if (that._on[i]) { // on?
                    var fn = that._callback[i];

                    if (fn) {
                        fn(that._counter, now, delta);
                    }
                } else {
                    sweep = true;
                }
            }
            that._lastTime = now; // update last time
            ++that._counter;

            if (sweep) {
                _sweep(that);
            }
        }
    }
}

function _sweep(that) {
    var i = that._on.length;

    while (i--) {
        if (!that._on[i]) { // off -> remove
            that._callback.splice(i, 1);
            that._on.splice(i, 1);
        }
    }
}

function Clock_isRunning() { // @ret Boolean: true is running, false is stopped
                             // @help: Clock#isRunning
    return this._running;
}

function Clock_resetCount() { // @ret this:
                              // @help: Clock#resetCount
    this._count = 0;
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

