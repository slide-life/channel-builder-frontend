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
        Slide.crypto.decryptString(blocks[iter], this.cipherKey, this.privateKey, function(clear, carry) {
            this.fields[blocks[iter]] = clear;
            this.decodeF(blocks, cb, iter + 1);
        }, null);
    } else {
        Slide.crypto.decryptString(blocks[iter], this.cipherKey, this.privateKey, function(clear, carry) {
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
    blockItemTemplate = $('#block-item').html();
    Mustache.parse(bucketTemplate);
    Mustache.parse(blockItemTemplate);
    Slide.getBlocks(function (blocks) {
        blocks.forEach(function (block) {
            $('#blocks').append(
                Mustache.render(blockItemTemplate, { name: block.name, description: block.description })
            );
        });
    });
    $('#blocks').on('click', '.block', function () {
        $(this).toggleClass('selected').toggleClass('btn-primary').toggleClass('btn-default');
    });
    $('.submit').on('click', function() {
        $(this).addClass('disabled');
        blocks = $('#blocks .block.selected').map(function () {
            return $(this).attr('data-block');
        }).toArray();
        //generate key
        Slide.createChannel(blocks, function (channel) {
            //subscribe to ws
            $('.channel-builder').hide();
            $('.channel').show();
            $('#channel-switch').bootstrapSwitch().on('switchChange.bootstrapSwitch', function (event, state) {
                channel.updateState(state);
            });
            $('#qr').html('<img src="' + channel.getQRCodeURL() + '">');
            channel.listen(newMessage);
        });
    });
};

$(document).ready(function(){
    init();
});
