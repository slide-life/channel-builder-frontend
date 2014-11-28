function Channel (data, sec) {
    this.id = data.id;
    this.publicKey = data.key;
    this.privateKey = sec;
    return this;
}

Channel.create = function (blocks, cb) {
    Slide.crypto.generateKeys(384, '', function (keys, carry) {
        sec = keys.sec;
        //post
        $.ajax({
            type: 'POST',
            url: 'http://' + Slide.host + '/channels',
            contentType: 'application/json',
            data: JSON.stringify({
                key: keys.pub,
                blocks: blocks
            }),
            success: function (data) {
                cb(new Channel(data, sec));
            }
        });
    }, null, 0);
};

Channel.prototype.getQRCodeURL = function () {
    return 'http://' + Slide.host + '/channels/' + this.id + '/qr';
}

Channel.prototype.updateState = function (state) {
    $.ajax({
        type: 'PUT',
        url: 'http://' + Slide.host + '/channels/' + this.id,
        contentType: 'application/json',
        data: JSON.stringify({
            open: state
        })
    });
};

Channel.prototype.listen = function (cb) {
    var socket = new WebSocket('ws://' + Slide.host + '/buckets/' + this.id + '/listen');
    socket.onmessage = function (event) {
        cb(JSON.parse(event.data));
    };
};

export default Channel;
