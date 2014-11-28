var sec = new Object();
var bucketTemplate;
var blockItemTemplate;

var newMessage = function (evt) {
    var bucket = new ReceivedBucket(evt, sec);
    bucket.html(function (b) { //b is a bucket html entry
        $('.live').append(b);
    });
};

function test(ch) { //TODO
    var sec = ch.sec;
    Slide.crypto.encryptData({
        'card-number': '1234',
        'card-expiry-date': '1234'
    }, ch.pub, function(result, carry) {
        $.ajax({
            type: 'POST',
            url: 'http://' + HOST + '/channels/' + ch.id,
            contentType: 'application/json',
            data: JSON.stringify(result)
        });
    });
}

var init = function () {
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
        var blocks = $('#blocks .block.selected').map(function () {
            return $(this).attr('data-block');
        }).toArray();

        var channel = new Slide.Channel(blocks);
        channel.open({
            onCreate: function(channel) {
                var channel_id = channel.id;
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
            },
            listen: newMessage
        });
    });
};

$(document).ready(function(){
    init();
});
