function Channel (blocks) {
  this.blocks = blocks;
  return this;
}

Channel.fromObject = function (object) {
  var channel = new Channel();
  for (var key in object) {
    if (object.hasOwnProperty(key)) {
      channel[key] = object[key];
    }
  }
  channel.privateKey = forge.pki.privateKeyFromPem(channel.privateKey);
  return channel;
};

Channel.prototype.toObject = function () {
  var channel = this;
  var object = {};
  for (var key in channel) {
    if (channel.hasOwnProperty(key)) {
      object[key] = channel[key];
    }
  }
  object.privateKey = forge.pki.privateKeyToPem(object.privateKey);
  return object;
};

Channel.prototype.create = function (cb) {
  var self = this;
  Slide.crypto.generateKeys(function (keys) {
    self.publicKey = keys.publicKey;
    self.privateKey = keys.privateKey;
    var pem = btoa(forge.pki.publicKeyToPem(self.publicKey));
    $.ajax({
      type: 'POST',
      url: 'http://' + Slide.host + '/channels',
      contentType: 'application/json',
      data: JSON.stringify({
        key: pem,
        blocks: self.blocks
      }),
      success: function (data) {
        self.id = data.id;
        cb && cb(self, keys);
      }
    });
  }, null, this);
}

Channel.prototype.getWSURL = function () {
  return 'ws://' + Slide.host + '/channels/' + this.id + '/listen';
};

Channel.prototype.getURL = function () {
  return 'http://' + Slide.host + '/channels/' + this.id;
};

Channel.prototype.getQRCodeURL = function () {
  return this.getURL() + '/qr';
};

Channel.prototype.listen = function (cb) {
  var socket = new WebSocket(this.getWSURL());
  var self = this;
  socket.onmessage = function (event) {
    cb(Slide.crypto.decryptData(JSON.parse(event.data).fields, self.privateKey));
  };
};

Channel.prototype.prompt = function (cb) {
  var frame = $('<iframe/>', {
    src: 'frames/prompt.html?channel=' + this.id,
    id: 'slide-channel-frame'
  });
  this.frame = frame;
  $('#modal .modal-body').append(frame);
  $('#modal').modal('toggle');

  this.listen(function (fields) {
    $('#modal').modal('toggle');
    frame.remove();
    cb && cb(fields);
  });
};

Channel.prototype.getResponses = function(cb) {
  var privateKey = this.privateKey;
  $.ajax({
    type: 'GET',
    url: 'http://' + Slide.host + '/channels/' + this.id,
    contentType: 'application/json',
    success: function (data) {
      cb(data.responses.map(function(response) {
        response.fields = Slide.crypto.decryptData(response.fields, privateKey);
        return response;
      }));
    }
  });
};

export default Channel;
