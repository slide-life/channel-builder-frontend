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
    customBlockItemTemplate = $('#custom-block-item').html();
    receivedItemTemplate = $('#received-item').html();
    Mustache.parse(bucketTemplate);
    Mustache.parse(blockItemTemplate);
    Mustache.parse(receivedItemTemplate);
    Slide.getBlocks(function (blocks) {
        blocks.forEach(function (block) {
            $('#dynamic-blocks').append(
                Mustache.render(blockItemTemplate, { name: block.name, description: block.description })
            );
        });
    });
    $('#blocks').on('click', '.block', function () {
        $(this).toggleClass('selected').toggleClass('btn-primary').toggleClass('btn-default');
    });
    $('#add-custom-block').on('click', function () {
        $('#custom-blocks').append(
            Mustache.render(customBlockItemTemplate, {
                type: $('#custom-block-type').val(),
                description: $('#custom-block-description').val()
            })
        );
        $('#custom-block-description').val('');
    });
    $('.submit').on('click', function() {
        $(this).addClass('disabled');
        var blocks = $('#blocks .block.selected').map(function () {
            return {
                block: $(this).attr('data-block'),
                description: $(this).attr('data-block-description'),
                type: $(this).attr('data-block-type'),
                compound: this.hasAttribute('data-block-compound'),
                custom: this.hasAttribute('data-block-custom')
            };
        }).toArray().reduce(function (previousValue, currentValue) {
            if (currentValue.compound) {
                return previousValue.concat(currentValue.block.split(';'));
            } else if (currentValue.custom) {
                return previousValue.concat({
                    name: 'custom',
                    description: currentValue.description,
                    type: currentValue.type
                });
            } else {
                return previousValue.concat([currentValue.block]);
            }
        }, []);

        channel = new Slide.Channel(blocks);
        channel.create({
            onCreate: function () {
                $('.channel-builder').hide();
                $('.channel').show();
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
