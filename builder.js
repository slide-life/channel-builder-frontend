function test (channel) { //TODO
  var result = Slide.crypto.encryptDataWithKey({
    'first-name': 'John',
    'last-name': 'Smith'
  }, channel.publicKey);

  $.ajax({
    type: 'POST',
    url: channel.getURL(),
    contentType: 'application/json',
    data: JSON.stringify({ fields: result })
  });
}

(function () {
  var customBlockItemTemplate = Handlebars.compile($('#custom-block-item').html());
  var responseTemplate        = Handlebars.compile($('#response').html());
  var channelsTemplate        = Handlebars.compile($('#channels').html());
  var channelBuilderTemplate  = Handlebars.compile($('#channel-builder').html());
  var channelTemplate         = Handlebars.compile($('#channel').html());

  this.addResponse = function (fields) {
    $('.channel-live-responses').append(responseTemplate({ fields: fields }));
  }

  this.showChannels = function () {
    $('#page').html(channelsTemplate({
      channels: getChannels()
    }));
  };

  this.showChannel = function (channel) {
    channel.listen(addResponse);
    channel.getResponses(function (responses) {
      $('#page').html(channelTemplate({
        QRCodeURL: channel.getQRCodeURL()
      }));
      responses.forEach(function (response) {
        addResponse(response.fields);
      });
    });
  };

  this.getChannels = function () {
    var channels = JSON.parse(window.localStorage['channels'] || '[]');
    return channels.map(function (channel) {
      return Slide.Channel.fromObject(channel);
    });
  };

  this.setChannels = function (channels) {
    window.localStorage['channels'] = JSON.stringify(channels.map(function (c) {
      var channel = c.toObject();
      return {
        id: channel.id,
        name: channel.name,
        privateKey: channel.privateKey
      };
    }));
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
      throw 'Cannot delete channel: index out of range';
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
      customBlockItemTemplate({
        type: $('#custom-block-type').val(),
        description: $('#custom-block-description').val()
      })
    );
    $('#custom-block-description').val('');
  });

  var blocks;
  $('#page').on('click', '#create-new-channel', function () {
    var render = function () {
      $('#page').html(channelBuilderTemplate({
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

    var channel = new Slide.Channel(blocks);
    channel.create(function () {
      channel.name = $('#channel-name').val();
      addChannel(channel);
      showChannel(channel);
    });
  });
}());
