function test(channel) { //TODO
    Slide.crypto.encryptDataWithKey({
        'card-number': '1234',
        'card-expiry-date': '1234'
    }, channel.publicKey, function(result, carry) {
        $.ajax({
            type: 'POST',
            url: channel.getURL(),
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

    this.newMessage = function (channel) {
        return function (data) {
            var result = Slide.crypto.decryptData(data, channel.privateKey);
            $('.live').append(Mustache.render(receivedItemTemplate, { fields: result }));
        };
    }

    this.showChannels = function () {
        $('#page').html(Mustache.render(channelsTemplate, {
            channels: getChannels()
        }));
    };

    this.showChannel = function (channel) {
        channel.getResponses(function (responses) {
            $('#page').html(Mustache.render(channelTemplate, {
                QRCodeURL: channel.getQRCodeURL(),
                responses: responses
            }));
        });
    };

    this.getChannels = function () {
        var channels = JSON.parse(window.localStorage['channels']) || [];
        return channels.map(function (channel) {
            return Slide.Channel.fromObject(channel);
        });

    };

    this.setChannels = function (channels) {
        window.localStorage['channels'] = JSON.stringify(channels);
    };

    this.addChannel = function (channel) {
        var channels = getChannels();
        channels.push(channel);
        setChannels(channels);
        return channels;
    };

    this.removeChannel = function (index) {
        var channels = getChannels();
        if (index < 0 || index >= channels.length) {
            throw 'Cannot delete channel : index out of range';
        } else {
            channels.splice(index, 1);
            setChannels(channels);
        }
    };

    showChannels();

    $('#page').on('click', '#blocks .block', function () {
        $(this).toggleClass('selected').toggleClass('btn-primary').toggleClass('btn-default');
    });

    $('#page').on('click', '.view-channel', function () {
        var channel = $(this).index();
        showChannel(getChannels()[channel]);
    }).on('click', '.delete-channel', function () {
        removeChannel($(this).index());
        showChannels();
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

    var blocks;
    $('#page').on('click', '#create-new-channel', function () {
        var render = function () {
            $('#page').html(Mustache.render(channelBuilderTemplate, {
                blocks: blocks
            }));
        };

        if (blocks) {
            render();
        } else {        
            Slide.getBlocks(function (retrievedBlocks) {
                blocks = retrievedBlocks;
                render();
            });
        }
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
                    id: channel.id,
                    name: $('#channel-name').val(),
                    privateKey: channel.privateKey
                });
                showChannel(channel);
                test(channel);
            },
            listen: newMessage(channel)
        });
    });
}());
