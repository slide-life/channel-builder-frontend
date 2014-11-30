function Channel(blocks) {
    this.blocks = blocks;
    return this;
}

Channel.prototype.open = function (cb) {
    var self = this;
    Slide.crypto.generateKeys(384, '', function (keys, carry) {
        self.publicKey = keys.pub;
        self.privateKey = keys.sec;
        $.ajax({
            type: 'POST',
            url: 'http://' + Slide.host + '/channels',
            contentType: 'application/json',
            data: JSON.stringify({
                key: self.publicKey,
                blocks: self.blocks
            }),
            success: function (data) {
                self.id = data.id;
                cb.onCreate();
                self.updateState(true, function () {
                    self.listen(cb.listen);
                });
            }
        });
    }, null, this);
}

Channel.prototype.getWSURL = function() {
    return 'ws://' + Slide.host + '/channels/' + this.id + '/listen';
};

Channel.prototype.getURL = function() {
    return 'http://' + Slide.host + '/channels/' + this.id;
};

Channel.prototype.getQRCodeURL = function () {
    return this.getURL() + '/qr';
};

Channel.prototype.updateState = function (state, cb) {
    $.ajax({
        type: 'PUT',
        url: this.getURL(),
        contentType: 'application/json',
        data: JSON.stringify({
            open: state
        }),
        success: cb
    });
};

Channel.prototype.listen = function (cb) {
    var socket = new WebSocket(this.getWSURL());
    socket.onmessage = function (event) {
        cb(JSON.parse(event.data));
    };
};

export default Channel;
