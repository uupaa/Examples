importScripts("../node_modules/uupaa.codec.js/node_modules/uupaa.hash.js/lib/Hash.js");
importScripts("../node_modules/uupaa.codec.js/lib/Codec.js");
importScripts("../node_modules/uupaa.codec.js/lib/MessagePack.js");
importScripts("../node_modules/uupaa.codec.js/lib/ZLib.js");
importScripts("../node_modules/uupaa.thread.js/lib/Thread.js");
importScripts("../lib/APNGFrame.js");
importScripts("../lib/APNGDecoder.js");

(function(global) {
"use strict";

var thread = new global.Thread("", function(event, key, source) {
        global.Codec["toArrayBuffer"](source, function(arrayBuffer) {

            var decoder = new global.APNGDecoder(new Uint8Array(arrayBuffer));
            var png = decoder.decode();
            if (png) {
                var packed = global.Codec.MessagePack.encode(decoder);
                thread.post(event, "", packed.buffer, [packed.buffer]);
            } else {
                thread.post(event);
            }
        });

    }, function(yes /*, no */) {
        yes();
    });

})((this || 0).self || global);

