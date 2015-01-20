(function(global) {
"use strict";

// --- dependency modules ----------------------------------
var APNGFrame   = global["APNGFrame"];
var MessagePack = global["Codec"]["MessagePack"];

// --- define / local variables ----------------------------
//var _isNodeOrNodeWebKit = !!global.global;
//var _runOnNodeWebKit =  _isNodeOrNodeWebKit &&  /native/.test(setTimeout);
//var _runOnNode       =  _isNodeOrNodeWebKit && !/native/.test(setTimeout);
//var _runOnWorker     = !_isNodeOrNodeWebKit && "WorkerLocation" in global;
//var _runOnBrowser    = !_isNodeOrNodeWebKit && "document" in global;
var COLOR_TYPE_TRUE_COLOR       = 2; // RRGGBB   3bytes
var COLOR_TYPE_INDEX_COLOR      = 3; // INDEX    1byte
var COLOR_TYPE_TRUE_COLOR_ALPHA = 6; // RRGGBBAA 4bytes

var PNG_SIGNATURE = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];

// --- class / interfaces ----------------------------------
function APNGDecoder(source,   // @arg Uint8Array = null - PNG or APNG data
                     cursor) { // @arg Integer = 0 - source cursor
//{@dev
    if (!global["BENCHMARK"]) {
        $valid($type(source, "Uint8Array|omit"), APNGDecoder, "source");
        $valid($type(cursor, "Integer|omit"),    APNGDecoder, "cursor");
    }
//}@dev

    this._source = source || null;      // Uint8Array|null
    this._cursor = cursor || 0;         // Integer - source cursor
    this._apng = false;                 // acTL
    this._gamma = 1;                    // gAMA - Math.ceil(1 / 2.2) = 0.45455...
    this._width = 0;                    // IHDR
    this._height = 0;                   // IHDR
    this._bitDepth = 0;                 // IHDR
    this._colourType = 0;               // IHDR
    this._filterMethod = 0;             // IHDR
    this._interlaceMethod = 0;          // IHDR
    this._compressionMethod = 0;        // IHDR
    this._frame = [];                   // [PosterFrame, AnimationFrame, ...]
    this._palette = new Uint32Array(256); // PLTE - RRGGBBAAInteger [0xRRGGBBAA, ...]
    this._chunkList = [];               // ["IHDR", ... "IEND"]
    this._loopCount = 0;                // acTL
    this._frameDelays = [];             // delay to next frame. [delay, ...]
    this._lastModified = null;          // tIME - last modified time
    this._usePosterFrame = false;       // IDAT - use poster frame to first animation frame
    this._backgroundColor = 0x000000;   // bKGD - 0xRRGGBB
    this._transparentColor = -1;        // tRNS - 0xRRGGBB or -1
}

// --- serialize ---
APNGDecoder["pack"]   = APNGDecoder_pack;               // APNGDecoder.pack(source:APNGDecoder):Uint8Array
APNGDecoder["unpack"] = APNGDecoder_unpack;             // APNGDecoder.unpack(source:Uint8Array):APNGDecoder
APNGDecoder["prototype"] = {
    "constructor":      APNGDecoder,                    // new APNGDecoder(...):APNGDecoder
    "decode":           APNGDecoder_decode,             // APNGDecoder#decode():Boolean
    "toJSON":           APNGDecoder_toJSON,             // APNGDecoder#toJSON():Object
    "getAnimationFrames":APNGDecoder_getAnimationFrames,// APNGDecoder#getAnimationFrames():FrameAndDelayObjectArray
    // --- internal functions ---
    IHDR: IHDR,
    PLTE: PLTE,
    acTL: acTL,
    fcTL: fcTL,
    fdAT: fdAT,
    tRNS: tRNS,
    IDAT: IDAT,
    bKGD: bKGD,
    tIME: tIME,
    gAMA: gAMA,
    read1: read1,
    read2: read2,
    read4: read4,
    checkSum: checkSum,
    hasPNGSignature: hasPNGSignature,
};

// --- implements ------------------------------------------
function APNGDecoder_decode() { // @ret Boolean - success
    var success = false;

    if (this._source && this.hasPNGSignature()) {
        var sourceLength = this._source.length;

        // --- parse ---
        while (this._cursor < sourceLength) {
            // --- read chunk block ---
            //
            //  | size | keyword             | value             |
            //  |------|---------------------|-------------------|
            //  | 4    | chunkDataSize       |                   |
            //  | 4    | chunkType           |                   |
            //  | ?    | chunkData           |                   |
            //  | 4    | crc                 |                   |
            var chunkDataSize = this.read4();
            var chunkType     = String.fromCharCode(this.read1(), this.read1(),
                                                    this.read1(), this.read1());

            this._chunkList.push(chunkType);

            switch (chunkType) {
            case "IHDR": this.IHDR(); break;
            case "PLTE": this.PLTE(chunkDataSize); break;
            case "acTL": this.acTL(); break;
            case "fcTL": this.fcTL(); break;
            case "fdAT": this.fdAT(chunkDataSize); break;
            case "tRNS": this.tRNS(chunkDataSize); break;
            case "IDAT": this.IDAT(chunkDataSize); break;
            case "bKGD": this.bKGD(); break;
            case "tIME": this.tIME(); break;
            case "gAMA": this.gAMA(); break;
            case "IEND": break;
            default: this._cursor += chunkDataSize; // skip unknown chunk
            }
            if (!this.checkSum(this.read4())) {
                break;
            }
        }
        // --- decode ---
        for (var i = 0, iz = this._frame.length; i < iz; ++i) {
            this._frame[i]["decode"](this._palette, this._transparentColor, this._gamma);
        }
        success = true;
    }
    // --- GC ---
    this._source = null;
    this._cursor = 0;

    return success;
}

function APNGDecoder_toJSON() { // @ret Object
    return {
        "apng":             this._apng,             // Boolean
        "width":            this._width,            // Integer
        "height":           this._height,           // Integer
        "frame":            this._frame,            // [new APNGFrame, ...]
        "loopCount":        this._loopCount,        // Integer
        "frameDelays":      this._frameDelays,      // [Number, ...]
        "usePosterFrame":   this._usePosterFrame,   // Boolean
      //"backgroundColor":  this._backgroundColor,  // RRGGBB
    };
}
function APNGDecoder_pack(source) { // @arg APNGDecoder
                                    // @ret Uint8Array
    return MessagePack["encode"](source["toJSON"]());
}
function APNGDecoder_unpack(source) { // @arg Uint8Array
                                      // @ret APNGDecoder
    var result = new APNGDecoder();
    var data = MessagePack["decode"](source);

    for (var key in data) {
        result["_" + key] = data[key];
    }
    return result;
}
function APNGDecoder_getAnimationFrames() { // @ret FrameAndDelayObjectArray - [ { index: 1, delay: 40, }, ... ]
                                            // @desc return the animation frames in consideration of the poster frame.
    var result = [];
    var frameLength = this._frame.length;

    for (var i = this._usePosterFrame ? 0 : 1; i < frameLength; ++i) {
        result.push({ "index": i, "delay": this._frameDelays[i] });
    }
    return result;
}

function IHDR() {
    //  | size | keyword           | value                   |
    //  |------|-------------------|-------------------------|
    //  | 4    | width             | image width             |
    //  | 4    | height            | image height            |
    //  | 1    | bitDepth          | available values are 1, 2, 4, 8 and 16 |
    //  | 1    | colourType        | available values are 0, 2, 3, 4 and 6  |
    //  | 1    | compressionMethod | available values is 0   |
    //  | 1    | filterMethod      | available values is 0   |
    //  | 1    | interraceMethod   | available values is 0 or 1 |

    this._width               = this.read4();
    this._height              = this.read4();
    this._bitDepth            = this.read1();
    this._colourType          = this.read1();
    this._compressionMethod   = this.read1();
    this._filterMethod        = this.read1();
    this._interlaceMethod     = this.read1();

    switch (this._colourType) {
    case COLOR_TYPE_TRUE_COLOR:
    case COLOR_TYPE_INDEX_COLOR:
    case COLOR_TYPE_TRUE_COLOR_ALPHA:
        break;
  //case COLOR_TYPE_GRAY_SCALE: // 0
  //case COLOR_TYPE_GRAY_SCALE_ALPHA: // 4
    default:
        throw new TypeError("unsupported colour type: " + this._colourType);
    }
    if (this._bitDepth !== 8) {
        throw new TypeError("unsupported bit depth:" + this._bitDepth);
    }
    if (this._interlaceMethod) {
        throw new TypeError("unsupported interlace method:" + this._interlaceMethod);
    }
}

function PLTE(chunkDataSize) {
    if (chunkDataSize % 3 !== 0) {
        throw new TypeError("palette size error: " + chunkDataSize);
    }
    for (var i = 0, j = 0, iz = chunkDataSize; i < iz; i += 3, ++j) {
        var r = this._source[this._cursor++];
        var g = this._source[this._cursor++];
        var b = this._source[this._cursor++];
        this._palette[j] = ((r << 24) | (g << 16) | (b << 8) | 0xff) >>> 0;
    }
    for (; j < 256; ++j) {
        this._palette[j] = 0x000000ff;
    }
}

function acTL() { // Animation Control Chunk
    //
    //  | size | keyword           | value         |
    //  |------|-------------------|---------------|
    //  | 4    | numFrames         | 総フレーム数  |
    //  | 4    | numPlays          | ループ数      |
    //
    //  - acTL があれば apng
    //  - acTL はIDATの前に必要
    //  - numFrames の値は fcTL チャンクの個数と一致する
    //  - numFrames に 0 は指定できない(エラーになる), 1フレームのみの apng なら 1 を指定する
    //  - numPlays に 0 を指定すると無限ループになる
    //  - numPlays に指定された回数アニメーションをループし最後のフレームで停止する

    this.read4(); // numFrames
    this._loopCount = this.read4(); // numPlays
    this._apng = true;
}

function fcTL() { // Frame Control Chunk
    //
    //  | size | keyword           | value                                        |
    //  |------|-------------------|----------------------------------------------|
    //  | 4    | sequenceNumber    | アニメーションチャンクのシーケンス番号       |
    //  | 4    | width             | アニメーションフレームの幅                   |
    //  | 4    | height            | アニメーションフレームの高さ                 |
    //  | 4    | x                 | アニメーションフレームを描画するオフセットx  |
    //  | 4    | y                 | アニメーションフレームを描画するオフセットy  |
    //  | 2    | delayNum          | delay 時間の分子 |
    //  | 2    | delayDen          | delay 時間の分母 |
    //  | 1    | dispose           | 描画後の扱いを指定する |
    //  | 1    | blend             | アニメーションフレームの描画方法 |
    //
    //  - sequenceNumber は0から始まる
    //  - アニメーションフレームは矩形(x, y, w, h)で指定された領域に描画する
    //  - x, y, width, height には負の値を指定できない
    //  - アニメーションフレームの矩形は IDAT の矩形(0, 0, IDAT.width, IDAT.height) からはみ出てはならない
    //  - delayNum と delayDen でアニメーションフレームを何秒後に描画するかを指定できる
    //  - delayDen には 0 を指定可能。その場合は 100 が指定されたものとして扱う
    //      - delayDen に 0 を指定すると 10ms (1/100s) の遅延となる
    //  - delayNum には 0 を指定可能。0 を指定した場合は、次のアニメーションをできるだけ早く描画する(ベストエフォート)
    //      - 「できるだけ早く」の定義はレンダラーが自由に定義できる。「できるだけ早く = 5ms以内」と決めてしまってもよい
    //  - アニメーションの描画は、デコードタイミングとは切り離され安定していること
    //  - dispose に指定可能な値は 0(APNG_DISPOSE_OP_NONE), 1(APNG_DISPOSE_OP_BACKGROUND), 2(APNG_DISPOSE_OP_PREVIOUS)
    //      - APNG_DISPOSE_OP_NONE       は 次のフレームを描画する前に消去しない。出力バッファをそのまま使用する
    //      - APNG_DISPOSE_OP_BACKGROUND は 次のフレームを描画する前に、出力バッファのフレーム領域を「完全に透過な黒」で塗りつぶす
    //      - APNG_DISPOSE_OP_PREVIOUS   は 次のフレームを描画する前に、出力バッファのフレーム領域をこのフレームに入る前の状態に戻す
    //  - 最初の fcTL の dispose で APNG_DISPOSE_OP_PREVIOUS が指定された場合は APNG_DISPOSE_OP_BACKGROUND として扱う
    //  - blend に指定可能な値は 0(APNG_BLEND_OP_SOURCE) と 1(APNG_BLEND_OP_OVER)
    //      - APNG_BLEND_OP_SOURCE は アルファ値を含めた全ての要素をフレームの出力バッファ領域に上書きする
    //      - APNG_BLEND_OP_OVER   は 書き込むデータのアルファ値を使って出力バッファに合成する

    this.read4(); // sequenceNumber

    var w = this.read4();
    var h = this.read4();
    var x = this.read4();
    var y = this.read4();
    var delayNum = this.read2();
    var delayDen = this.read2();
    var dispose  = this.read1();
    var blend    = this.read1();

    if (x < 0 || y < 0 || w <= 0 || h <= 0 ||
        x + w > this._width ||
        y + h > this._height) {
        throw new TypeError("invalid rect");
    }
    if (delayDen === 0) { delayDen = 100; }

    //  40    = 1000 * 4        / 100
    var delay = 1000 * delayNum / delayDen; // ms

    this._frameDelays.push(delay);
    this._frame.push( new APNGFrame(this._colourType, x, y, w, h, dispose, blend) );
}

function fdAT(chunkDataSize) { // Frame Data Chunk
    //
    //  | size | keyword           | value                                        |
    //  |------|-------------------|----------------------------------------------|
    //  | 4    | sequenceNumber    | アニメーションチャンクのシーケンス番号       |
    //  | ...  | frame             | フレームデータ                               |
    //
    //  - sequenceNumber は 0から始まる
    //  - frame は IDAT と同様のフォーマット

    this.read4(); // sequenceNumber
    var lastFrame = this._frame[this._frame.length - 1];
    var from = this._cursor;

    this._cursor += chunkDataSize - 4;
    lastFrame["add"](this._source.subarray(from, this._cursor));
}

function IDAT(chunkDataSize) {
    //
    //  | size | keyword           | value                   |
    //  |------|-------------------|-------------------------|
    //  | 1    | zlib compress     |                         |
    //  | 1    | flag and check    |                         |
    //  | ...  | compressedData    |                         |
    //  | 4    | checkSum          | ADLER32                 |
    //
    //  - ポスターフレームをアニメーションに含める場合は IDATチャンクの前に1つ fcTLチャンクを置く
    //      - fcTL が先にある場合は this._frame.length === 1 の状態 [1]
    //      - fcTL が先にない場合は this._frame.length === 0 の状態 [2]

    if (this._chunkList.indexOf("fcTL") > 0) { // [1]
        // IHDR ->  acTL  -> [PLTE] -> [tRNS] -> fcTL -> IDAT
        this._usePosterFrame = true;
    } else { // [2]
        // IHDR -> [acTL] -> [PLTE] -> [tRNS]         -> IDAT
        if (this._frame.length === 0) {
            this._frame[0] = new APNGFrame(this._colourType, 0, 0, this._width, this._height, 0, 0);
            this._frameDelays[0] = 0.0;
        }
    }
    var from = this._cursor;

    this._cursor += chunkDataSize;
    this._frame[0]["add"](this._source.subarray(from, this._cursor));
}

function tRNS(chunkDataSize) { // Transparency Chunk
    //
    //  COLOR_TYPE_TRUE_COLOR
    //  | size | keyword           | value                   |
    //  |------|-------------------|-------------------------|
    //  | 2    | Red sample value  |                         |
    //  | 2    | Blue sample value |                         |
    //  | 2    | Green sample value|                         |
    //
    //  COLOR_TYPE_INDEX_COLOR
    //  | size | keyword                   | value           |
    //  |------|---------------------------|-----------------|
    //  | 1    | Alpha for palette index 0 |                 |
    //  | 1    | Alpha for palette index 1 |                 |
    //  | ...  | Alpha for palette index n |                 |
    //
    //  - COLOR_TYPE_TRUE_COLOR
    //      - Red, Blue, Green sample value と一致する画素は 透明(alpah=0) として扱う
    //          - その他の画素は全て不透明として扱う
    //  - COLOR_TYPE_INDEX_COLOR の場合、パレットのエントリと一致する alpha値のデータが格納されている
    //      - 0 は透明, 255 は不透明
    //      - tRNSのデータ数とパレット数(256)は一致しない場合があり、この場合は省略されたalphaの値を255として扱う
    //      - 全てのパレットインデックスが不透明な場合は tRNS チャンクは省略可能

    switch (this._colourType) {
    case COLOR_TYPE_TRUE_COLOR:
        var r = this.read2();
        var g = this.read2();
        var b = this.read2();

        this._transparentColor = (r << 16) | (g << 8) | b;
        break;
    case COLOR_TYPE_INDEX_COLOR:
        for (var i = 0, iz = chunkDataSize; i < iz; ++i) {
            var alpha = this.read1(); // alpha value. (0x00 - 0xff)

            this._palette[i] = (this._palette[i] & 0xffffff00) | alpha;
        }
    }
}

function bKGD() {
    //
    //  COLOR_TYPE_TRUE_COLOR(2)
    //  COLOR_TYPE_TRUE_COLOR_ALPHA(6)
    //  | size | keyword           | value                   |
    //  |------|-------------------|-------------------------|
    //  | 2    | Red               |                         |
    //  | 2    | Blue              |                         |
    //  | 2    | Green             |                         |
    //
    //  COLOR_TYPE_INDEX_COLOR(3)
    //  | size | keyword           | value                   |
    //  |------|-------------------|-------------------------|
    //  | 1    | palette index     |                         |

    switch (this._colourType) {
    case COLOR_TYPE_TRUE_COLOR:
    case COLOR_TYPE_TRUE_COLOR_ALPHA:
        var r = this.read2();
        var g = this.read2();
        var b = this.read2();

        this._backgroundColor = (r << 16) | (g << 8) | b;
        break;
    case COLOR_TYPE_INDEX_COLOR:
        var paletteIndex = this.read1();
        var RRGGBBAA     = this._palette[paletteIndex]; // true color

        this._backgroundColor = (RRGGBBAA >>> 8) & 0xffffff;
    }
}

function tIME() {
    //
    //  | size | keyword           | value                   |
    //  |------|-------------------|-------------------------|
    //  | 2    | year              | 0000 - 9999             |
    //  | 1    | month             | 1 - 12                  |
    //  | 1    | day               | 1 - 31                  |
    //  | 1    | hour              | 0 - 23                  |
    //  | 1    | minute            | 0 - 23                  |
    //  | 1    | second            | 0 - 60 (60 is leap seconds) |

    var year   = this.read2();
    var month  = this.read1();
    var day    = this.read1();
    var hour   = this.read1();
    var minute = this.read1();
    var second = this.read1();

    if (second === 60) { // leap seconds
        second = 59;
    }
    this._lastModified = new Date(year, month, day, hour, minute, second, 0);
}

function gAMA() { // Gamma Chunk
    //
    //  | size | keyword           | value                   |
    //  |------|-------------------|-------------------------|
    //  | 4    | gamma             | gamma * 100000 (1/2.2 = 45455) |

    var gamma  = this.read4();

    this._gamma = gamma / 100000;
}

function read1() { // @ret UINT8
    return   this._source[this._cursor++];
}
function read2() { // @ret UINT16
    return  (this._source[this._cursor++]  <<  8) |
             this._source[this._cursor++];
}
function read4() { // @ret UINT32
    return ((this._source[this._cursor++]  << 24) |
            (this._source[this._cursor++]  << 16) |
            (this._source[this._cursor++]  <<  8) |
             this._source[this._cursor++]) >>> 0;
}
function checkSum(/* sum */) {
    // TODO: impl
    return true;
}
function hasPNGSignature() {
    for (var i = 0, iz = PNG_SIGNATURE.length; i < iz; ++i) {
        if ( this._source[this._cursor++] !== PNG_SIGNATURE[i] ) {
            return false;
        }
    }
    return true;
}

// --- validate / assertions -------------------------------
//{@dev
function $valid(val, fn, hint) { if (global["Valid"]) { global["Valid"](val, fn, hint); } }
function $type(obj, type) { return global["Valid"] ? global["Valid"].type(obj, type) : true; }
//function $keys(obj, str) { return global["Valid"] ? global["Valid"].keys(obj, str) : true; }
//function $some(val, str, ignore) { return global["Valid"] ? global["Valid"].some(val, str, ignore) : true; }
//function $args(fn, args) { if (global["Valid"]) { global["Valid"].args(fn, args); } }
//}@dev

// --- exports ---------------------------------------------
if (typeof module !== "undefined") {
    module["exports"] = APNGDecoder;
}
global["APNGDecoder" in global ? "APNGDecoder_" : "APNGDecoder"] = APNGDecoder; // switch module. http://git.io/Minify

})((this || 0).self || global); // WebModule idiom. http://git.io/WebModule

