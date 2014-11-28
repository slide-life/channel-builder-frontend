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
                self.listen(cb.listen);
            }
        });
    }, null, this);
}

Channel.prototype.getQRCodeURL = function () {
    return 'http://' + Slide.host + '/channels/' + this.id + '/qr';
}

Channel.prototype.updateState = function (state, cb) {
    $.ajax({
        type: 'PUT',
        url: 'http://' + Slide.host + '/channels/' + this.id,
        contentType: 'application/json',
        data: JSON.stringify({
            open: state
        }),
        success: cb
    });
};

Channel.prototype.listen = function (cb) {
    var socket = new WebSocket('ws://' + Slide.host + '/buckets/' + this.id + '/listen');
    socket.onmessage = function (event) {
        cb(JSON.parse(event.data));
    };
};

export default Channel;
