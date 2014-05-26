
function fileMeta(hashCode,holder,sender,receiver)
{
    this.hashCode = hashCode;
    this.holder = holder;
    this.sender = sender;
    this.receiver = receiver;
    this.hasSentNo = -1;
    this.storage = {};
} 

var FileShare = {};
FileShare.events = {};
FileShare.on = function (eventname, fn) {

    FileShare.events[eventname] = webrtc.events[eventname] || [];
    FileShare.events[eventname].push(fn);
}
FileShare.fire = function (eventname, _) {

    var events = this.events[eventname];
    var args = Array.prototype.slice.call(arguments, 1);
    if (!events) return;

    events.forEach(function (ele) {
        ele.apply(null, args);
    })
}