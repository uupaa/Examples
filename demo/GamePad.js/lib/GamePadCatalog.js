(function moduleExporter(name, closure) {
"use strict";

var entity = GLOBAL["WebModule"]["exports"](name, closure);

if (typeof module !== "undefined") {
    module["exports"] = entity;
}
return entity;

})("GamePadCatalog", function moduleClosure() {
"use strict";

var PADS = {
    // KEY                                          NAME            TYPE
    "ASUS Gamepad (Vendor: 0b05 Product: 4500)":    ["NexusPlayer", "GAMEPAD"]
};

//// Key Mapping Data
//var KEY_MAPS = {
//    //   name        ↑  →  ↓  ←  △  ◯  ×  □
//    //               U   R   D   L   Y   B   A   X   L1  R1  L2  R2  SB1  SB2  S1X  S1Y  S2X  S2Y
//    "NexusPlayer": [ A9, A9, A9, A9, B4, B1, B0, B3, B6, B7, A3, A4, B13, B14, A0,  A1,  A2,  A5],
//};

return {
    "PADS": PADS
};

});

