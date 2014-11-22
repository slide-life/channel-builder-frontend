//little bit messy but will clean up later

var blocks = [];
var sec = new Object();

function Bucket (data, sec) {
    this.id = data.id;
    this.publicKey = data.key;
    this.fields = data.fields;
    this.cipherKey = data.cipherkey;
    this.privateKey = sec;
    this.decoded = false;
    return this;
}

Bucket.prototype.decodeF = function (blocks, cb, iter) {
    if (iter < blocks.len - 1) {
        slide.crypto.decryptString(blocks[iter], this.cipherKey, this.privateKey, function(clear, carry) {
            this.fields[blocks[iter]] = clear;
            this.decodeF(blocks, cb, iter + 1);
        }, null);
    } else {
        slide.crypto.decryptString(blocks[iter], this.cipherKey, this.privateKey, function(clear, carry) {
            this.fields[blocks[iter]] = clear;
            cb();
        });
    }
};

Bucket.prototype.decode = function (cb) {
    if (!this.decoded) {
        this.decoded = true;
        this.decodeF(blocks, cb, 0);
    }
}

Bucket.prototype.html = function (cb) {
    this.decode(function(){
        str = "";
        for (var i = 0; i < this.fields.keys.len; i++) {
            var a = this.fields.keys[i];
            str += a + ":" + this.fields[a];
            str += "<hr>";
        }
        cb("<div class=\"bucket\">" + str + "</div>");
    });
};

addOn = function (int_id, name) {
    blocks.push(name);
    $('.selected_blocks').append("<div name=\"" + int_id + "\">" +
            name + " <a class=\"remove\" id=\"" + int_id+ "\">Remove</a>" +
            "</div>");
};

newMessage = function (evt) {
    var bucket = new Bucket(evt, sec);
    bucket.html(function (b) { //b is a bucket
        $('.live').append(b);
    });
};

init = function () {
    $.ajax({
        type: 'GET',
        url: 'http://' + HOST + '/blocks',
        contentType: 'application/json',
        success: function (data) {
            for (var a = 0; a < data.length; a++) {
                var el = data[a];
                $('.block_selector').append("<a class=\"block_item\" id=\"" + a + "\">" +
                        el.name + "</a>");
                $("#" + el.id).click(function(){
                    addOn(el.id, el.name);
                });
            }
            $('.remove').click(function(){
                var block = this.name;
                $("#" + block).remove();
                var index = blocks.indexOf(block);
                if (index > -1) blocks.splice(index, 1);
            });
        }
    });
    $('.submit').click(function(){
        //generate key
        this.generateKeys = function(384, '', function(keys, carry) {
            sec = keys.sec;
            //post
            $.ajax({
                type: 'POST',
                url: 'http://' + HOST + '/channels',
                contentType: 'application/json',
                data: JSON.stringify({
                    key: keys.pub,
                    blocks: blocks
                }),
                success: function (data) {
                    //subscribe to ws
                    var socket = new WebSocket('ws://' + HOST + '/channels/' + data.id + '/listen');
                    socket.onmessage = newMessage;
                }
            });
        }, null, 0);
    });
};

$(document).ready(function(){
    init();
});
