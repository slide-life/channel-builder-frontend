export default function () {
    this.symmetricAlgorithm = "aes-twofish";
    this.asyncTimeout = 10;

    this.generateKeys = function(bits, pass, callback, carry, depth) {
        depth = typeof depth !== 'undefined' ? depth : 0;
        pass = typeof pass !== 'undefined' ? pass : ''; //in case of pin
        Slide.crypto.generateKeysF(bits, pass, function(keys, carry) {
            if (keys == null && depth < 3) {
                Slide.crypto.generateKeys(bits, pass, callback, carry, depth + 1);
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
                        Slide.crypto.processKeys(keys, carrier);
                    }, Slide.crypto.asyncTimeout);
                }, carrier);
            }, carrier);
        } else {
            sjcl.ecc.elGamal.generateKeysAsync(bits, 10, function(keys, carrier) {
                setTimeout(function() {
                    Slide.crypto.processKeys(keys, carrier);
                }, Slide.crypto.asyncTimeout);
            }, carrier);
        }
    };

    this.processKeys = function(keys, carrier) {
        var sec = Slide.crypto.serializeSecretKey(keys.sec);
        var pub = Slide.crypto.serializePublicKey(keys.pub);
        var val = Slide.crypto.checkKeypair(keys.pub, sec);
        if (!val) {
            var cb = carrier.callback;
            carrier = carrier.outercarrier;
            setTimeout(function() {
                cb(null, carrier);
            }, Slide.crypto.asyncTimeout);
            return;
        }
        carrier.pub = pub;
        carrier.sec = sec;
        setTimeout(function() {
            Slide.crypto.processKeysF(carrier);
        }, Slide.crypto.asyncTimeout);
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
        }, Slide.crypto.asyncTimeout);
    };

    this.randomKeyString = function(len) {
        var result = '';
        var chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        for (var i = 0; i < len; i++) {
            result += chars[Math.round(Math.random() * (chars.length - 1))];
        }
        return result;
    };

    //TODO: modularize this as well
    this.encryptData = function(data, pubkey, callback, carry) {
        var rand = Slide.crypto.randomKeyString(64);
        var pk = (typeof pubkey == "string") ? Slide.crypto.deserializePublicKey(pubkey) : pubkey;
        var carrier = {
            "cleartext": data,
            "callback": callback,
            "outercarrier": carry,
            "rand": rand,
            "pubkey": pk,
            "enckey": new Object()
        };
        setTimeout(function(){
            Slide.crypto.encryptDataF(carrier);
        }, Slide.crypto.asyncTimeout);
    };

    this.encryptDataF = function(carrier) {
        var pk = carrier.pubkey;
        Slide.crypto.kemAsync(pk, function(symkey, carrier) {
            var enckey = Slide.crypto.symEncrypt(carrier.rand, symkey.key);
            var keyhash = Slide.crypto.hashPublicKey(pk);
            carrier.enckey = { enckey: enckey, keytag: symkey.tag, keyhash: keyhash };
            var ret = { key: Slide.crypto.deserializePublicKey(pk), cipherkey: carrier.enckey, fields: new Object() };
            for (var k in carrier.cleartext) {
                Slide.crypto.symEncryptAsync(carrier.cleartext[k], carrier.rand, function(ciphertext, carrier) {
                    ret.fields[k] = ciphertext;
                }, carrier);
            }
            carrier.callback(ret, carrier.outercarrier);
        }, carrier);
    };

    this.encryptString = function(text, pubkey, callback, carry) {
        var rand = Slide.crypto.randomKeyString(64);
        var pk = (typeof pubkey == "string") ? Slide.crypto.deserializePublicKey(pubkey) : pubkey;
        var carrier = {
            "cleartext": text,
            "callback": callback,
            "outercarrier": carry,
            "rand": rand,
            "pubkey": pk,
            "enckey": new Object()
        };
        setTimeout(function(){
            Slide.crypto.encryptStringF(carrier);
        }, Slide.crypto.asyncTimeout);
    };

    this.encryptStringF = function(carrier) {
        var pk = carrier.pubkey;
        Slide.crypto.kemAsync(pk, function(symkey, carrier) {
            var enckey = Slide.crypto.symEncrypt(carrier.rand, symkey.key);
            var keyhash = Slide.crypto.hashPublicKey(pk);
            carrier.enckey = { enckey: enckey, keytag: symkey.tag, keyhash: keyhash };
            Slide.crypto.symEncryptAsync(carrier.cleartext, carrier.rand, function(ciphertext, carrier) {
                var msg = { "enckey": carrier.enckey, "ciphertext": ciphertext };
                setTimeout(function() {
                    carrier.callback(msg, carrier.outercarrier);
                }, Slide.crypto.asyncTimeout);
            }, carrier);
        }, carrier);
    };

    this.kemAsync = function(pub, cb, carrier) {
        //fuck it
        var keyData = pub.kem();
        cb({
            key: sjcl.codec.hex.fromBits(keyData.key),
            tag: sjcl.codec.hex.fromBits(keyData.tag)
        }, carrier);
    };

    this.symEncrypt = function(rand, sym) {
        return sjcl.encrypt(sym, rand);
    };

    this.symEncryptAsync = function(text, rand, cb, carrier) {
        //fuck it
        cb(Slide.crypto.symEncrypt(text, rand), carrier);
    };

    this.hashPublicKey = function(pub) {
        var hash1, hash2, c = 0;
        do {
            hash1 = sjcl.hash.sha1.hash(pub);
            hash1 = sjcl.codec.hex.fromBits(hash1);
            hash2 = sjcl.hash.sha1.hash(pub);
            hash2 = sjcl.codec.hex.fromBits(hash2);
            c++;
        } while (hash1 != hash2 && c <= 3);
        return hash1;
    };

    this.decryptString = function(text, cipherkey, sec, cb, carrier) {
        //decrypt enckey -sym> rand
        //decrypt text -rand> clear
        sec = Slide.crypto.deserializeSecretKey(sec);
        var sym = sec.unkem(sjcl.codec.hex.toBits(cipherkey.keytag));
        var rand = sjcl.decrypt(sjcl.codec.hex.fromBits(sym), cipherkey.enckey);
        setTimeout(function() {
            cb(sjcl.decrypt(rand, text), carrier);
        }, Slide.crypto.asyncTimeout);
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
    };

    this.checkKeypair = function(pub, sec) {
        var v_pub = Slide.crypto.checkPublicKey(pub);
        var v_sec = Slide.crypto.checkSecretKey(sec);
        return (v_pub && v_sec);
    };

    this.checkPublicKey = function(pub) {
        try {
            return pub._point.isValid();
        } catch (e) {
            return false;
        }
    };

    this.checkSecretKey = function(sec) {
        if (typeof sec == "String" || typeof sec == "string") {
            try {
                var dser = Slide.crypto.deserializeSecretKey(sec);
                return ((typeof dser == "object" || typeof dser == "Object") && dser != null);
            } catch (e) {
                return false;
            }
        } else {
            try {
                var ser = Slide.crypto.serializeSecretKey(sec);
                var dser = Slide.crypto.deserializeSecretKey(ser);
                return ((typeof dser == "object" || typeof dser == "Object") && dser != null);
            } catch (e) {
                return false;
            }
        }
    };
};
