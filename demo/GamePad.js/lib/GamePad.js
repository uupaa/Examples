(function moduleExporter(name, closure) {
"use strict";

var entity = GLOBAL["WebModule"]["exports"](name, closure);

if (typeof module !== "undefined") {
    module["exports"] = entity;
}
return entity;

})("GamePad", function moduleClosure(global) {
"use strict";

// --- dependency modules ----------------------------------
var Catalog = global["WebModule"]["GamePadCatalog"];

// --- define / local variables ----------------------------
var PADS = Catalog["PADS"];

// --- class / interfaces ----------------------------------
function GamePad(id) { // @arg GamePadIDString
    var gamepadList = navigator.getGamepads();

    this._padIndex = 0;
    for (var i = 0, iz = gamepadList.length; i < iz; ++i) {
        if (gamepadList[i]["id"] === id) {
            this._id            = id;
            this._type          = PADS[this._id][1] || "GAMEPAD";
            this._last          = null; // last value
            this._edge          = null; // edge status
            this._value         = {};   // current value
            this._handler       = GamePad[PADS[this._id][0]].bind(this); // assign handler
            // key buffer: 10min * 60sec * 60frame * 4bytes = 140KB
            this._buffer        = new Uint32Array(10 * 60 * 60);
            this._bufferCursor  = 0;
            this._padIndex      = i;
            this["scan"]();
            break;
        }
    }
}

GamePad["repository"] = "https://github.com/uupaa/GamePad.js";
GamePad["prototype"] = Object.create(GamePad, {
    "constructor":  { "value": GamePad                              }, // new GamePad(id:GamePadIDString):GamePad
    "id":           { "get":   function()  { return this._id;     } }, // GamePad#id:GamePadIDString
    "type":         { "get":   function()  { return this._type;   } }, // GamePad#type:GamePadTypeString
    "scan":         { "value": GamePad_scan                         }, // GamePad#scan():this
    "edge":         { "get":   function()  { return this._edge;   } }, // GamePad#edge:GamePadEdgeObject
    "value":        { "get":   function()  { return this._value;  } }, // GamePad#value:GamePadValueObject
    "buffer":       { "get":   function()  { return this._buffer; } }, // GamePad#buffer:Object
    "connected":    { "get":   GamePad_connected                    }, // GamePad#connected:Boolean
});
GamePad["NexusPlayer"] = GamePad_NexusPlayer;

// --- implements ------------------------------------------
function GamePad_scan() { // @ret this
    var gamepad = navigator["getGamepads"]()[this._padIndex];

    this._buffer[this._bufferCursor++] = this._handler(gamepad);

    if (this._bufferCursor >= this._buffer.length) {
        this._bufferCursor = 0;
    }
    return this;
}

function GamePad_connected() { // @ret Boolean
    var gamepad = navigator["getGamepads"]()[this._padIndex];

    return (gamepad || {})["connected"];
}

function GamePad_NexusPlayer(gamepad) { // @arg GamePadObject
                                        // @ret UINT32
    var padButtons = gamepad["buttons"];
    var padAxes    = gamepad["axes"];

    // --- D-PAD ---
    var U   = 0;
    var R   = 0;
    var D   = 0;
    var L   = 0;
    // --- BUTTON ---
    var A   = padButtons[ 0]["pressed"] ? 1 : 0; // 0 or 1
    var B   = padButtons[ 1]["pressed"] ? 1 : 0; // 0 or 1
    var X   = padButtons[ 3]["pressed"] ? 1 : 0; // 0 or 1
    var Y   = padButtons[ 4]["pressed"] ? 1 : 0; // 0 or 1
    var L1  = padButtons[ 6]["pressed"] ? 1 : 0; // 0 or 1
    var R1  = padButtons[ 7]["pressed"] ? 1 : 0; // 0 or 1
    var SL  = padButtons[13]["pressed"] ? 1 : 0; // 0 or 1 | STICK L PRESSED
    var SR  = padButtons[14]["pressed"] ? 1 : 0; // 0 or 1 | STICK R PRESSED
    // --- AXIS ---
    var SLX = (padAxes[0] + 1) * 7 | 0; // 0 ... 7 ... 14 | STICK L X
    var SLY = (padAxes[1] + 1) * 7 | 0; // 0 ... 7 ... 14 | STICK L Y
    var SRX = (padAxes[2] + 1) * 7 | 0; // 0 ... 7 ... 14 | STICK R X
    var SRY = (padAxes[5] + 1) * 7 | 0; // 0 ... 7 ... 14 | STICK R Y
    var L2  = (padAxes[3] + 1) * 1 | 0; // 0 ... 2 | L2
    var R2  = (padAxes[4] + 1) * 1 | 0; // 0 ... 2 | R2

    // --- D-PAD ---
    //  axes[9] is D_PAD input
    //              value + offset
    //      NEUTRAL: 1.28 + 1.0 = 2.28
    //      L+U:     1.00 + 1.0 = 2.00
    //      L:       0.71 + 1.0 = 1.71
    //      D+L:     0.42 + 1.0 = 1.42
    //      D:       0.14 + 1.0 = 1.14
    //      R+D:    -0.14 + 1.0 = 0.86
    //      R:      -0.42 + 1.0 = 0.58
    //      U+R:    -0.71 + 1.0 = 0.29
    //      U:      -1.00 + 1.0 = 0.00
    var D_PAD = padAxes[9] + 1; // 1 is offset

    if (D_PAD > 2.00 + 0.05) { /*NEUTRAL*/ } else
    if (D_PAD > 2.00 - 0.05) { U = L = 1;  } else
    if (D_PAD > 1.71 - 0.05) {     L = 1;  } else
    if (D_PAD > 1.42 - 0.05) { L = D = 1;  } else
    if (D_PAD > 1.14 - 0.05) {     D = 1;  } else
    if (D_PAD > 0.86 - 0.05) { D = R = 1;  } else
    if (D_PAD > 0.58 - 0.05) {     R = 1;  } else
    if (D_PAD > 0.29 - 0.05) { R = U = 1;  } else
    if (D_PAD > 0.00 - 0.05) {     U = 1;  }

    this._last = this._value; // ref
    this._value = {
        // --- D-PAD ---
        "U":    U,
        "R":    R,
        "D":    D,
        "L":    L,
        // --- button ---
        "A":    A,
        "B":    B,
        "X":    X,
        "Y":    Y,
        "L1":   L1,
        "R1":   R1,
        "SL":   SL,
        "SR":   SR,
        // --- axis ---
        "SLX":  SLX,
        "SLY":  SLY,
        "SRX":  SRX,
        "SRY":  SRY,
        "L2":   L2,
        "R2":   R2,
    };

    var last = this._last;

    this._edge = {
        // --- D-PAD ---
        "U":    last["U"]   !== U,
        "R":    last["R"]   !== R,
        "D":    last["D"]   !== D,
        "L":    last["L"]   !== L,
        // --- button ---
        "A":    last["A"]   !== A,
        "B":    last["B"]   !== B,
        "X":    last["X"]   !== X,
        "Y":    last["Y"]   !== Y,
        "L1":   last["L1"]  !== L1,
        "R1":   last["R1"]  !== R1,
        "SL":   last["SL"]  !== SL,
        "SR":   last["SR"]  !== SR,
        // --- axis ---
        "SLX":  last["SLX"] !== SLX,
        "SLY":  last["SLY"] !== SLY,
        "SRX":  last["SRX"] !== SRX,
        "SRY":  last["SRY"] !== SRY,
        "L2":   last["L2"]  !== L2,
        "R2":   last["R2"]  !== R2,
    };

    return (U   << 31 | R   << 30 | D   << 29 | L   << 28 |
            A   << 27 | B   << 26 | X   << 25 | Y   << 24 |
            L1  << 23 | R1  << 22 | SL  << 21 | SR  << 20 |
            SLX << 16 | SLY << 12 | SRX <<  8 | SRY <<  4 |
            L2  <<  2 | R2) >>> 0;
}

return GamePad; // return entity

});

