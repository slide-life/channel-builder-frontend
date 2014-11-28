var sec = new Object();
var bucketTemplate;
var blockItemTemplate;

newMessage = function (evt) {
    var bucket = new ReceivedBucket(evt, sec);
    bucket.html(function (b) { //b is a bucket html entry
        $('.live').append(b);
    });
};

function toggleChannelState (channel, state) {
    $.ajax({
        type: 'PUT',
        url: 'http://' + HOST + '/channels/' + channel.id,
        contentType: 'application/json',
        data: JSON.stringify({
            open: state
        }),
        success: function(data) { test(channel); } //TODO REMOVE
    });
}

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

init = function () {
    bucketTemplate = $('#bucket').html();
    blockItemTemplate = $('#block-item').html();
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
                    Mustache.render(blockItemTemplate, {name: el.name, description: el.description})
                );
            }
        }
    });
    $('#blocks').on('click', '.block', function () {
        $(this).toggleClass('selected').toggleClass('btn-primary').toggleClass('btn-default');
    });
    $('.submit').on('click', function() {
        $(this).addClass('disabled');
        blocks = $('#blocks .block.selected').map(function () {
            return $(this).attr('data-block');
        }).toArray();
        var channel = new Channel(blocks);
        channel.open({
            onCreate: function(channel) {
                var channel_id = channel.id;
                $('.channel-builder').hide();
                $('.channel').show();
                $('#channel-switch').bootstrapSwitch().on('switchChange.bootstrapSwitch', function (evt, state) {
                    toggleChannelState(channel, state)
                });
                $('#qr').html('<img src="http://' + HOST + '/channels/' + channel_id + '/qr">');
            },
            onBlockReceived: newMessage
        });
    });
};

$(document).ready(function(){
    init();
});
