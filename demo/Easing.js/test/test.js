var ModuleTestEasing = (function(global) {

testEasing();

return testEasing;

function testEasing(next) {
    var range = { start: 20, end: 300, time: 1000 };

    _move(range.start, range.end, range.time, function() {
        _move(range.end, range.start, range.time, function() {
            if (_isOK(range.start)) {
                next && next.pass();
            } else {
                next && next.miss();
            }
        });
    });
}

function _isOK(x) {
    for (var i = 0; i < 18; ++i) {
        var node = document.querySelector("#Particle" + i);
        if ( parseInt(node.style.left, 10) !== x ) {
            return false;
        }
    }
    return true;
}

function _move(start, end, time, callback) {
    var currentTime    = 0;
    var beginningValue = start;
    var endValue       = end;
    var durationTime   = time;
    var beginningTime  = Date.now();

    var particle = [];

    function _createParticle(id, x, y, w, h, color) {
        var node = document.querySelector("#" + id);

        if (node) {
            // reuse DOM Node
        } else {
            node = document.createElement("div");
            node.id = id;
        }
        node.style.cssText = "position:absolute;" +
                             "left:"   + x + "px;" +
                             "top:"    + y + "px;" +
                             "width:"  + w + "px;" +
                             "height:" + h + "px;" +
                             "background-color:" + color;
        return node;
    }

    for (var i = 0; i < 18; ++i) {
        var node = _createParticle("Particle" + i,
                                   start,    // init x
                                   i * 16,   // init y
                                   16,       // width
                                   16,       // height
                                   "rgb(" + i * 5 + "%,0%,0%)");
        if (node.parentNode) {
            // reuse attached DOM Node
        } else {
            document.body.appendChild(node);
        }
        particle.push(node);
    }

    (function _tick() {
        currentTime = Date.now() - beginningTime;

        for (var i = 0; i < 18; ++i) {
            var x = Easing[i](currentTime > durationTime ? durationTime
                                                         : currentTime,
                              beginningValue,
                              endValue - beginningValue,
                              durationTime);

            particle[i].style.left = x + "px";
        }
        if (currentTime < durationTime) {
            setTimeout(_tick, 0);
        } else {
            callback();
        }
    })();
}

})((this || 0).self || global);

