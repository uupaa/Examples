(function moduleExporter(name, closure) {
"use strict";

var entity = GLOBAL["WebModule"]["exports"](name, closure);

if (typeof module !== "undefined") {
    module["exports"] = entity;
}
return entity;

})("GamePadConnector", function moduleClosure(global) {
"use strict";

// --- dependency modules ----------------------------------
var Catalog = global["WebModule"]["GamePadCatalog"];

// --- define / local variables ----------------------------
// --- class / interfaces ----------------------------------
function GamePadConnector(connect,      // @arg Function - connect(id:GamePadIDString):void
                          disconnect) { // @arg Function = null - disconnect(id:GamePadIDString):void
    if (IN_NW || IN_BROWSER) {
        global.addEventListener("gamepadconnected",    _handleEvent);
        global.addEventListener("gamepaddisconnected", _handleEvent);
    }

    function _handleEvent(event) {
        var id = event.gamepad.id || "";

        switch (event.type) {
        case "gamepadconnected":
            if (GamePadConnector["VERBOSE"]) { console.log("gamepad connected: " + id); }
            if (id in Catalog["PADS"]) { // well-known id?
                connect(id);
            }
            break;
        case "gamepaddisconnected":
            if (GamePadConnector["VERBOSE"]) { console.log("gamepad disconnected: " + id); }
            if (id in Catalog["PADS"]) { // well-known id?
                if (disconnect) {
                    disconnect(id);
                }
            }
        }
    }
}

GamePadConnector["VERBOSE"] = false;

// --- implements ------------------------------------------

return GamePadConnector; // return entity

});

