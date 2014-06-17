(function(global) {
"use strict";

// --- dependency module -----------------------------------
// --- local variable --------------------------------------
//var _runOnNode = "process" in global;
//var _runOnWorker = "WorkerLocation" in global;
//var _runOnBrowser = "document" in global;

// --- define ----------------------------------------------
var HTML_FRAGMENT = _multiline(function() {/*

<div id="chromize">
  <div class="mask"></div>
  <div class="dialog centering">
    <ul>
      <li>
        <a href="" id="intent-link1">
          <div class="list-item">
            <div class="icon icon-chrome"></div>
            <div class="title">{{PLAY_ON_CHROME}}</div>
          </div>
        </a>
      </li>
      <li>
        <a href="" id="intent-link2">
          <div class="list-item">
            <div class="icon icon-play"></div>
            <div class="title">{{FIND_CHROME}}</div>
          </div>
        </a>
      </li>
      <li>
        <hr />
      </li>
      <li>
        <a href="#" id="intent-link3" onclick="document.querySelector('#chromize').style.display='none'">
          <div class="list-item">
            <div class="icon icon-browser"></div>
            <div class="title">{{PLAY_ON_BROWSER}}</div>
          </div>
        </a>
      </li>
    </ul>
  </div>
</div>

*/});

var RESOURCE_STRING = {
    "en": {
        "PLAY_ON_CHROME":  "Play on Chrome<br />(RECOMMEND)",
        "FIND_CHROME":     "Find newest Chrome",
        "PLAY_ON_BROWSER": "Play on Android browser"
    },
    "ja": {
        "PLAY_ON_CHROME":  "Chrome ブラウザで遊ぶ<br />(推奨)",
        "FIND_CHROME":     "最新の Chrome ブラウザを探す",
        "PLAY_ON_BROWSER": "Android 標準ブラウザで遊ぶ"
    }
};

// --- interface -------------------------------------------
function Chromize() {
}

Chromize["repository"] = "https://github.com/uupaa/Chromize.js"; // GitHub repository URL. http://git.io/Help

Chromize["openIntentDialog"] = Chromize_openIntentDialog; // Chromize#openIntentDialog():Boolean

// --- implement -------------------------------------------
function Chromize_openIntentDialog(url,      // @arg URLString - open url
                                   locale) { // @arg String = "en"
                                             // @ret Boolean
//alert(navigator.userAgent);
    document.body.innerHTML += localization(HTML_FRAGMENT, locale || "ja");

    var scheme = /^https/.test(url) ? "https" : "http";

    var intentFrame = document.querySelector("#chromize");

    intentFrame.style.display = "block";

    var link1 = document.querySelector("#intent-link1");
    var link2 = document.querySelector("#intent-link2");

    link1.href = "intent://" + encodeURIComponent(url) +
                 "#Intent;scheme=" + scheme +
                 ";action=android.intent.action.VIEW;package=com.android.chrome;end";
    link2.href = "intent://#Intent;package=com.android.chrome;end";
}

function localization(fragment, locale) {
    var resource = RESOURCE_STRING[locale];

    for (var key in resource) {
        var rex = new RegExp("\\{\\{" + key + "\\}\\}", "g");

        fragment = fragment.replace(rex, function(_) {
            return resource[key];
        });
    }
    return fragment;
}

function _multiline(fn) { // @arg Function:
                          // @ret String:
    return (fn + "").split("\n").slice(1, -1).join("\n");
}

// --- export ----------------------------------------------
if ("process" in global) {
    module["exports"] = Chromize;
}
global["Chromize" in global ? "Chromize_" : "Chromize"] = Chromize; // switch module. http://git.io/Minify

})((this || 0).self || global); // WebModule idiom. http://git.io/WebModule

