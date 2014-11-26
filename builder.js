//little bit messy but will clean up later

var sec = new Object();
var bucketTemplate;
var blockItemTemplate;
var blocks;

function ReceivedBucket (data, sec) {
    this.id = data.id; //TODO: map out POST /channels/:id -> ruby -> ws notify -> here, field mapping
    this.publicKey = data.key;
    this.fields = data.fields;
    this.cipherKey = data.cipherkey;
    this.privateKey = sec;
    this.decoded = false;
    return this;
}

ReceivedBucket.prototype.decodeF = function (blocks, cb, iter) {
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

ReceivedBucket.prototype.decode = function (cb) {
    if (!this.decoded) {
        this.decoded = true;
        this.decodeF(blocks, cb, 0);
    }
};

ReceivedBucket.prototype.html = function (cb) {
    this.decode(function(){
        str = "";
        for (var a in this.fields) {
            str += a + ":" + this.fields[a];
            str += "<hr>";
        }
        cb(Mustache.render(bucketTemplate, {content: str}));
    });
};

newMessage = function (evt) {
    var bucket = new ReceivedBucket(evt, sec);
    bucket.html(function (b) { //b is a bucket html entry
        $('.live').append(b);
    });
};

init = function () {
    bucketTemplate = $('#bucket').html();
    blockItemTemplate = $('#block_item').html();
    Mustache.parse(bucketTemplate);
    Mustache.parse(blockItemTemplate);
    $.ajax({
        type: 'GET',
        url: 'http://' + HOST + '/blocks',
        contentType: 'application/json',
        success: function (data) {
            for (var a = 0; a < data.length; a++) {
                var el = data[a];
                $('#blocks').append(
                    Mustache.render(blockItemTemplate, {name: el.name, description: el.description}));
            }
        }
    });
    $('.submit').click(function(){
        blocks = $('#blocks').val();
        //generate key
        slide.crypto.generateKeys(384, '', function(keys, carry) {
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
                    alert(JSON.stringify(data));
                    //subscribe to ws
                    var socket = new WebSocket('ws://' + HOST + '/channels/' + data.__id.$oid + '/listen');
                    socket.onmessage = newMessage;
                }
            });
        }, null, 0);
    });
};

$(document).ready(function(){
    init();
});
