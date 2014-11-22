Slide.crypto = new Object();
function slide_crypto() {
    this.symmetricAlgorithm = "aes-twofish";
    this.asyncTimeout = 10;

    this.generateKeys = function(bits, pass, callback, carry, depth) {
        depth = typeof depth !== 'undefined' ? depth : 0;
        pass = typeof pass !== 'undefined' ? pass : ''; //in case of pin
        slide.crypto.generateKeysF(bits, pass, function(keys, carry) {
            if (keys == null && depth < 3) {
                slide.crypto.generateKeys(bits, pass, callback, carry, depth + 1);
            } else {
                callback(keys, carry);
            }
        }, carry);
    };

    this.generateKeysF = function(bits, pass, callback, carry) {
        var carrier = {"callback": callback, "outercarrier": carry};
        carrier.bits = bits; carrier.pass = pass;
        if (bits != 192 && bits != 224 && bits != 256 && bits != 384 && bits != 512) {
            bits = 512;
        }
        if (bits == 384) {
            sjcl.ecc.elGamal.generateKeysAsync(192, 10, function(keys, carrier) {
                sjcl.ecc.elGamal.generateKeysAsync(384, 10, function(keys, carrier) {
                    setTimeout(function() {
                        slide.crypto.processKeys(keys, carrier);
                    }, slide.crypto.asyncTimeout);
                }, carrier);
            }, carrier);
        } else {
            sjcl.ecc.elGamal.generateKeysAsync(bits, 10, function(keys, carrier) {
                setTimeout(function() {
                    slide.crypto.processKeys(keys, carrier);
                }, slide.crypto.asyncTimeout);
            }, carrier);
        }
    };

    this.processKeys = function(keys, carrier) {
        var sec = slide.crypto.serializeSecretKey(keys.sec, "elGamal");
        var pub = slide.crypto.serializePublicKey(keys.pub, "elGamal");
        var val = slide.crypto.checkKeypair(pub, sec, "elGamal");
        if (!val) {
            var cb = carrier.callback;
            carrier = carrier.outercarrier;
            setTimeout(function() {
                cb(null, carrier);
            }, slide.crypto.asyncTimeout);
            return;
        }
        carrier.pub = pub;
        carrier.sec = sec;
        setTimeout(function() {
            slide.crypto.processKeysF(carrier);
        }, slide.crypto.asyncTimeout);
    };

    this.processKeysF = function(carrier) {
        var pass = carrier.pass;//unused
        var pub = carrier.pub;
        var sec = carrier.sec;
        var keys = {pub: pub,
            sec: sec};
        var cb = carrier.callback;
        carrier = carrier.outercarrier;
        setTimeout(function() {
            cb(keys, carrier);
        }, slide.crypto.asyncTimeout);
    };

    this.decryptString = function(text, cipherkey, sec, cb, carrier) {
        sec = slide.crypto.deserializeSecretKey(sec);
        sec.unkemAsync(cipherkey, function(sym, carrier) {
            setTimeout(function() {
                cb(sjcl.decrypt(sym, text), carrier);
            }, slide.crypto.asyncTimeout);
        });
    };

    this.serializeSecretKey = function(sec) {
        var exponent = sec._exponent.toBits();
        var curve = sec._curve.b.exponent;
        var sec_json = {exponent: exponent, curve: curve};
        return JSON.stringify(sec_json);
    };

    this.deserializeSecretKey = function(sec) {
        sec = JSON.parse(sec);
        var exponent = sec.exponent;
        var curve = sec.curve;
        exponent = sjcl.bn.fromBits(exponent);
        var sec_obj = new sjcl.ecc.elGamal.secretKey(sjcl.ecc.curves['c' + curve], exponent);
        return sec_obj;
    }

    this.serializePublicKey = function(pub) {
        var point = pub._point.toBits();
        var curve = pub._curve.b.exponent;
        var pub_json = {point: point, curve: curve};
        return JSON.stringify(pub_json);
    };

    this.deserializePublicKey = function(pub) {
        pub = JSON.parse(pub);
        var bits = pub.point;
        var curve = pub.curve;
        var point = sjcl.ecc.curves['c'+curve].fromBits(bits);
        var pubkey = new sjcl.ecc.elGamal.publicKey(point.curve, point);
        return pubkey;
    }
}
