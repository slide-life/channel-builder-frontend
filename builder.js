var sec = new Object();
var bucketTemplate;
var blockItemTemplate;
var receivedItemTemplate;
var channel;

var newMessage = function (evt, sec) {
    Slide.crypto.decryptData(evt, evt.cipherkey, sec, function(result, carry) {
        var newStruct = [];
        for (var k in result.fields) {
            newStruct.push({ key: k, value: result.fields[k] });
        }
        $('.live').append(Mustache.render(receivedItemTemplate, { fields: newStruct }));
    }, null);
    /*
    var bucket = new ReceivedBucket(evt, sec);
    bucket.html(function (b) { //b is a bucket html entry
        $('.live').append(b);
    });*/
};

function test(ch) { //TODO
    Slide.crypto.encryptData({
        'card-number': '1234',
        'card-expiry-date': '1234'
    }, ch.publicKey, function(result, carry) {
        $.ajax({
            type: 'POST',
            url: ch.getURL(),
            contentType: 'application/json',
            data: JSON.stringify(result)
        });
    });
}

var init = function () {
    bucketTemplate = $('#bucket').html();
    blockItemTemplate = $('#block-item').html();
    receivedItemTemplate = $('#received-item').html();
    Mustache.parse(bucketTemplate);
    Mustache.parse(blockItemTemplate);
    Mustache.parse(receivedItemTemplate);
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
        var blocks = $('#blocks .block.selected').map(function () {
            return $(this).attr('data-block');
        }).toArray();

        channel = new Slide.Channel(blocks);
        channel.create({
            onCreate: function () {
                $('.channel-builder').hide();
                $('.channel').show();
                $('#channel-switch').bootstrapSwitch().on('switchChange.bootstrapSwitch', function (event, state) {
                    channel.updateState(state, function () {
                        if (state) {
                            channel.listen(newMessage);
                        }
                    });
                });
                $('#qr').html('<img src="' + channel.getQRCodeURL() + '">');
                test(channel);
            },
            listen: newMessage
        });
    });
};

$(document).ready(function(){
    init();
});
