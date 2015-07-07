(function moduleExporter(name, closure) {
"use strict";

var entity = GLOBAL["WebModule"]["exports"](name, closure);

if (typeof module !== "undefined") {
    module["exports"] = entity;
}
return entity;

})("GamePadPlayer", function moduleClosure(global) {
"use strict";

// --- dependency modules ----------------------------------
var Catalog = global["WebModule"]["GamePadCatalog"];

// --- define / local variables ----------------------------
var PADS = Catalog["PADS"];
var DEFAULT_STATUS = {
        // --- D-PAD ---
        "UP":   false,
        "RIGHT":false,
        "DOWN": false,
        "LEFT": false,
        // --- button ---
        "A":    false,
        "B":    false,
        "X":    false,
        "Y":    false,
        "L":    false,
        "R":    false,
        "S1":   false,
        "S2":   false,
        // --- axis ---
        "S1X":  0,
        "S1Y":  0,
        "S2X":  0,
        "S2Y":  0,
        "L2":   -1,
        "R2":   -1,
    };
var DEFAULT_EDGE_STATUS = {
        // --- D-PAD ---
        "UP":   false,
        "RIGHT":false,
        "DOWN": false,
        "LEFT": false,
        // --- button ---
        "A":    false,
        "B":    false,
        "X":    false,
        "Y":    false,
        "L":    false,
        "R":    false,
        "S1":   false,
        "S2":   false,
        // --- axis ---
        "S1X":  false,
        "S1Y":  false,
        "S2X":  false,
        "S2Y":  false,
        "L2":   false,
        "R2":   false,
    };

// --- class / interfaces ----------------------------------
function GamePadPlayer(id,       // @arg GamePadIDString
                       buffer) { // @arg Uint32Array
    this._id            = id;
    this._type          = PADS[this._id][1] || "GAMEPAD";
    this._last          = null; // last value
    this._edge          = null; // edge status
    this._value         = {};   // current value
    this._handler       = GamePadPlayer[PADS[this._id][0]].bind(this); // assign handler
    this._buffer        = buffer;
    this._bufferCursor  = 0;
}

GamePadPlayer["prototype"] = Object.create(GamePadPlayer, {
    "constructor":  { "value": GamePadPlayer                       }, // new GamePadPlayer(id:GamePadIDString, buffer:Uint32Array):GamePadPlayer
    "id":           { "get":   function()  { return this._id;    } }, // GamePadPlayer#id:GamePadIDString
    "type":         { "get":   function()  { return this._type;  } }, // GamePadPlayer#type:GamePadTypeString
    "scan":         { "value": GamePadPlayer_scan                  }, // GamePadPlayer#scan():this
    "edge":         { "get":   function()  { return this._edge;  } }, // GamePadPlayer#edge:GamePadEdgeObject
    "value":        { "get":   function()  { return this._value; } }, // GamePadPlayer#value:GamePadValueObject
    "connected":    { "get":   function()  { return true;        } }, // GamePadPlayer#connected:Boolean
});
GamePadPlayer["NexusPlayer"] = GamePadPlayer_NexusPlayer;

// --- implements ------------------------------------------
function GamePadPlayer_scan() { // @ret this
    this._handler(this._buffer[this._bufferCursor++] >>> 0);

    if (this._bufferCursor >= this._buffer.length) {
        this._bufferCursor = 0;
    }
    return this;
}

function GamePadPlayer_NexusPlayer(u32) { // @arg Uint32

    this._last = this._value; // ref
    this._value = {
        // --- D-PAD ---
        "U":    (u32 >>> 31) & 0x1,
        "R":    (u32 >>> 30) & 0x1,
        "D":    (u32 >>> 29) & 0x1,
        "L":    (u32 >>> 28) & 0x1,
        // --- button ---
        "A":    (u32 >>> 27) & 0x1,
        "B":    (u32 >>> 26) & 0x1,
        "X":    (u32 >>> 25) & 0x1,
        "Y":    (u32 >>> 24) & 0x1,
        "L1":   (u32 >>> 23) & 0x1,
        "R1":   (u32 >>> 22) & 0x1,
        "SL":   (u32 >>> 21) & 0x1,
        "SR":   (u32 >>> 20) & 0x1,
        // --- axis ---
        "SLX":  (u32 >>> 16) & 0xf,
        "SLY":  (u32 >>> 12) & 0xf,
        "SRX":  (u32 >>>  8) & 0xf,
        "SRY":  (u32 >>>  4) & 0xf,
        "L2":   (u32 >>>  2) & 0x3,
        "R2":   (u32 >>>  0) & 0x3,
    };

    var last = this._last;
    var curt = this._value;

    this._edge = {
        // --- D-PAD ---
        "U":    last["U"]   !== curt["U"],
        "R":    last["R"]   !== curt["R"],
        "D":    last["D"]   !== curt["D"],
        "L":    last["L"]   !== curt["L"],
        // --- button ---       utton ---
        "A":    last["A"]   !== curt["A"],
        "B":    last["B"]   !== curt["B"],
        "X":    last["X"]   !== curt["X"],
        "Y":    last["Y"]   !== curt["Y"],
        "L1":   last["L1"]  !== curt["L1"],
        "R1":   last["R1"]  !== curt["R1"],
        "SL":   last["SL"]  !== curt["SL"],
        "SR":   last["SR"]  !== curt["SR"],
        // --- axis ---         xis ---
        "SLX":  last["SLX"] !== curt["SLX"],
        "SLY":  last["SLY"] !== curt["SLY"],
        "SRX":  last["SRX"] !== curt["SRX"],
        "SRY":  last["SRY"] !== curt["SRY"],
        "L2":   last["L2"]  !== curt["L2"],
        "R2":   last["R2"]  !== curt["R2"],
    };
}

return GamePadPlayer; // return entity

});

