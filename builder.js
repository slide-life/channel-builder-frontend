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

(function () {
    var customBlockItemTemplate = $('#custom-block-item').html();
    var receivedItemTemplate = $('#received-item').html();
    var channelsTemplate = $('#channels').html();
    var channelBuilderTemplate = $('#channel-builder').html();
    var channelTemplate = $('#channel').html();
    Mustache.parse(customBlockItemTemplate);
    Mustache.parse(receivedItemTemplate);
    Mustache.parse(channelsTemplate);
    Mustache.parse(channelBuilderTemplate);
    Mustache.parse(channelTemplate);

    var sec = {};
    this.newMessage = function (evt, sec) {
        Slide.crypto.decryptData(evt, evt.cipherkey, sec, function(result, carry) {
            var newStruct = [];
            for (var k in result.fields) {
                newStruct.push({ key: k, value: result.fields[k] });
            }
            $('.live').append(Mustache.render(receivedItemTemplate, { fields: newStruct }));
        }, null);
    };

    this.getChannels = function () {
        return JSON.parse(window.localStorage['channels']);
    };

    this.addChannel = function (channel) {
        var channels = JSON.parse(window.localStorage['channels']) || [];
        channels.push(channel);
        window.localStorage['channels'] = JSON.stringify(channels);
        return channels;
    };

    $('#page').html(Mustache.render(channelsTemplate, {
        channels: getChannels()
    }));

    var blocks;
    Slide.getBlocks(function (b) {
        blocks = b;
    });

    $('#page').on('click', '#blocks .block', function () {
        $(this).toggleClass('selected').toggleClass('btn-primary').toggleClass('btn-default');
    });
    $('#page').on('click', '#add-custom-block', function () {
        $('#custom-blocks').append(
            Mustache.render(customBlockItemTemplate, {
                type: $('#custom-block-type').val(),
                description: $('#custom-block-description').val()
            })
        );
        $('#custom-block-description').val('');
    });
    $('#page').on('click', '#create-new-channel', function () {
        $('#page').html(Mustache.render(channelBuilderTemplate, {
            blocks: blocks
        }));
    });
    $('#page').on('click', '#create-channel', function() {
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
                addChannel({
                    id: 'TODO',
                    name: $('#channel-name').val(),
                    privateKey: 'TODO'
                });
                $('#page').html(Mustache.render(channelTemplate, {
                    QRCodeURL: channel.getQRCodeURL()
                }));
                test(channel);
            },
            listen: newMessage
        });
    });
}());
