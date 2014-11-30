function ReceivedBucket (data, sec) {
    //this.id = data.id; //TODO: map out POST /channels/:id -> ruby -> ws notify -> here, field mapping
    this.fields = data.fields;
    this.clearFields = new Object();
    this.cipherKey = data.cipherkey;
    this.privateKey = sec;
    this.decoded = false;
    this.decrypted = 0;
    return this;
}

ReceivedBucket.prototype.decode = function (cb) {
    if (!this.decoded) {
        this.decoded = true;
        for (var k in this.fields) {
            alert(this.privateKey);
            Slide.crypto.decryptString(this.fields[k], this.cipherKey, this.privateKey, (function(clear, carry) {
                this.clearFields[carry] = clear;
                this.decrypted++;
                if (this.decrypted == Object.keys(this.fields).length) {
                    cb();
                }
            }).bind(this), k);
        }
    }
};

ReceivedBucket.prototype.html = function (cb) {
    this.decode((function(){
        str = "";
        for (var a in this.clearFields) {
            str += a + ":" + this.clearFields[a];
            str += ";";
        }
        cb(Mustache.render(bucketTemplate, {content: str}));
    }).bind(this));
};
