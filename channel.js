function Channel(blocks) {
    this.blocks = blocks;
}

Channel.prototype.open = function (cb) {
    Slide.crypto.generateKeys(384, '', function(keys, carry) {
        this.sec = keys.sec;
        this.pub = keys.pub;
        $.ajax({
            type: 'POST',
            url: 'http://' + HOST + '/channels',
            contentType: 'application/json',
            context: this,
            data: JSON.stringify({
                key: keys.pub,
                blocks: blocks
            }),
            success: function (data) {
                this.id = data.__id.$oid; //back to var channel_id if bad
                cb.onCreate(this);
                var socket = new WebSocket('ws://' + HOST + '/channels/' + this.id + '/listen');
                socket.onmessage = function(evt) {
                    cb.onBlockReceived(JSON.parse(evt.data));
                };
            }
        });
    }, null, this);
}
