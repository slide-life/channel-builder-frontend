function Bucket (data, sec) {
    this.id = data.id;
    this.publicKey = data.key;
    this.privateKey = sec;
    return this;
}

Bucket.create = function (fields, cb) {
    $.ajax({
        type: 'POST',
        url: 'http://' + Slide.host + '/buckets',
        contentType : 'application/json',
        data: JSON.stringify(fields),
        success: function (data) {
            var bucket = new Bucket(data, keys.sec);
            cb(bucket, keys);
        }
    });
};

Bucket.prototype.listen = function (cb) {
    var socket = new WebSocket('ws://' + Slide.host + '/buckets/' + this.id + '/listen');
    socket.onmessage = function (event) {
        cb(JSON.parse(event.data));
    };
};

Bucket.prototype.prompt = function (cb) {
    var frame = $('<iframe/>', {
        src: 'http://localhost:8000/frames/prompt.html?bucket=' + this.id,
        id: 'slide-bucket-frame'
    });
    $('#modal .modal-body').append(frame);
    $('#modal').modal('toggle');

    this.listen(function (data) {
        cb(data.fields, data.cipherkey);
        $('#modal').modal('toggle');
        frame.remove();
    });
};

export default Bucket;
