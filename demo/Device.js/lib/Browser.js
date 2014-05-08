// @name: Browser.js
// @require: Valid.js
// @cutoff: @assert @node

(function(global) {
"use strict";

// --- variable --------------------------------------------
//{@assert
var Valid = global["Valid"] || require("uupaa.valid.js");
//}@assert
var Spec = global["Spec"] || require("uupaa.spec.js");

var _inNode = "process" in global;

// --- define ----------------------------------------------
// --- interface -------------------------------------------
function Browser(spec) { // @arg SpecObject:
                         // @ret SpecObject: { DEVICE, OS, ... }
                         // @desc: Detect browser spec.
                         // @help: Browser
//{@assert
    _if(!Valid.type(spec, "Object"), "Browser(spec)");
//}@assert

    _detectBasicSpec(spec);
    _detectBrowserLanguage(spec);

    _detectConnectionPerHost(spec);
    _detectMaxConnections(spec);

    return spec;
}

Browser["repository"] = "https://github.com/uupaa/Browser.js";

// --- implement -------------------------------------------
function _detectBasicSpec(spec) { // @arg SpecObject:
                                  // @desc: detect BrowserName, BrowserVersion, BrowserEngine
    var ua             = spec["BROWSER"]["USER_AGENT"];
    var browserName    = "";        // browser name: "Chrome", "Chromium", "IE", "Firefox", "Safari", "AndroidBrowser"
    var browserEngine  = "";        // browser engine: "WebKit", "Blink", "Trident":
    var browserVersion = "0.0.0";   // "Major.Minor.Patch"

    if (!ua) {
        return;
    }

    if ( /Chrome/.test(ua) ) { // Chrome and Opera.next
        // Chrome for Android
        //      Mozilla/5.0 (Linux; Android 4.2;          Nexus 7 Build/JOP40C)  AppleWebKit/535.19 (KHTML, like Gecko)             Chrome/18.0.1025.166        Safari/535.19
        //      Mozilla/5.0 (Linux; Android 4.1.1;        HTL21   Build/JRO03C)  AppleWebKit/537.36 (KHTML, like Gecko)             Chrome/33.0.1750.136 Mobile Safari/537.36
        //
        // GALAXY S4 (Chromium based custom browser)
        //      Mozilla/5.0 (Linux; Android 4.2.2; ja-jp; SC-04E  Build/JDQ39)   AppleWebKit/535.19 (KHTML, like Gecko) Version/1.0 Chrome/18.0.1025.308 Mobile Safari/535.19
        //
        // Android Chrome WebView
        //      Mozilla/5.0 (Linux; Android 4.4;          Nexus 5 Build/BuildID) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/30.0.0.0      Mobile Safari/537.36
        //
        browserName    = "Chrome";
        browserEngine  = "Blink"; // Chrome version 28+, Opera version 15+
        browserVersion = _getBrowserVersion(ua, "Chrome/");

        if ( /Version/.test(ua) ) {
            if (spec["DEVICE"]["BRAND"] === "Samsung") {
                browserName = "Chromium"; // S Browser
            }
        }
    } else if ( /Firefox/.test(ua) ) {
        browserName    = "Firefox";
        browserEngine  = "Gecko";
        browserVersion = _getBrowserVersion(ua, "Firefox/");
    } else if ( /Android/.test(ua) ) {
        browserName    = "AndroidBrowser";
        browserEngine  = "WebKit";
        browserVersion = _getBrowserVersion(ua, "Version/");
    } else if ( /MSIE|Trident/.test(ua) ) {
        browserName    = "IE";
        browserEngine  = "Trident";
        browserVersion = /MSIE/.test(ua) ? _getBrowserVersion(ua, "MSIE ") // IE 10.
                                         : _getBrowserVersion(ua, "rv:");  // IE 11+
        if ( /IEMobile/.test(ua) ) {
            browserVersion = _getBrowserVersion(ua, "IEMobile/");
        }
    } else if ( /Safari/.test(ua) ) {
        browserName    = "Safari";
        browserEngine  = "WebKit";
        browserVersion = _getBrowserVersion(ua, "Version/");
    } else if ( /AppleWebKit/.test(ua) ) {
        browserName    = "WebKit";
        browserEngine  = "WebKit";
    }

    spec["BROWSER"]["NAME"]    = browserName;
    spec["BROWSER"]["ENGINE"]  = browserEngine;
    if (spec["OS"]["TYPE"]) {
        spec["BROWSER"]["MOBILE"] = /Android|iOS|Windows Phone/.test(spec["OS"]["TYPE"]);
    }
    spec["BROWSER"]["VERSION"] = Spec["normalizeVersionString"](browserVersion);

    function _getBrowserVersion(userAgent, pile) {
        return userAgent.split(pile)[1].split(" ")[0];
    }
}

function _detectBrowserLanguage(spec) {
    var nav  = spec["DEVICE"]["INFO"]["navigator"] || global["navigator"] || {};
    var lang = nav["language"] || nav["browserLanguage"] || "";

    lang = lang.split("-", 1)[0]; // "en-us" -> "en"

    spec["BROWSER"]["LANGUAGE"] = lang;
}

function _detectConnectionPerHost(spec) {
    var ver = spec["OS"]["VERSION"].valueOf();
    var connectionPerHost = 6;

    switch ( spec["BROWSER"]["NAME"] ) {
    case "AndroidBrowser":
        connectionPerHost = ver < 4.0 ? 8
                                      : 6;
        break;
    case "IE":
        connectionPerHost = (ver < 10) ? 6
                          : (ver < 11) ? 8
                          : 13;
    }
    spec["NETWORK"]["CONNECTION_PER_HOST"] = connectionPerHost;
}

function _detectMaxConnections(spec) {
    var ver = spec["OS"]["VERSION"].valueOf();
    var max = 16;

    switch ( spec["BROWSER"]["NAME"] ) {
    case "AndroidBrowser":
        max = ver < 4.0 ? 10
                        : 16;
        break;
    }
    spec["NETWORK"]["MAX_CONNECTION"] = max;
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
    module["exports"] = Browser;
}
//}@node
if (global["Browser"]) {
    global["Browser_"] = Browser; // already exsists
} else {
    global["Browser"]  = Browser;
}

})((this || 0).self || global);

