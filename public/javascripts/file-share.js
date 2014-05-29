function fileMeta(hashCode,filename,holder,sender,receiver,chunkCount)
{
    this.hashCode = hashCode;
    this.filename = filename
    this.holder = holder;
    this.sender = sender;
    this.receiver = receiver;
    
    this.hasSentNo = -1;
    this.chunkCount = chunkCount;
    this.storage = [];
    this.queue = [];
    this.last = function(){
	    return this.queue[this.queue.length-1];
    }
} 

var fileShare = {};
fileShare.events = {};

fileShare.init = function (length) {
    
    fileShare.chunkLength = 1000;
    //fileShare.me = me;

}
fileShare.on = function (eventname, fn) {

    fileShare.events[eventname] = fileShare.events[eventname] || [];
    fileShare.events[eventname].push(fn);
}
fileShare.fire = function (eventname, _) {

    var events = this.events[eventname];
    var args = Array.prototype.slice.call(arguments, 1);
    if (!events) return;

    events.forEach(function (ele) {
        ele.apply(null, args);
    })
}
fileShare.send = function (receiver, space, data) {
    if (!(receiver in twoPC))
        return;
    twoPC[receiver][1].dc.send(JSON.stringify({
        'space': space,
        'msg': data
    }));
}

fileShare.dispatch = function(msg){
	
	fileShare.fire(msg.event,msg.data);
}

fileShare.createMeta = function(hashCode,filename,DataURL,holder)
{
	var meta = new fileMeta(hashCode,filename,holder,null,null);
	
	meta.queue.push(holder);
	while(DataURL.length>0){
		meta.storage.push(DataURL.slice(0, fileShare.chunkLength));
		DataURL = DataURL.slice(fileShare.chunkLength,DataURL.length);
	}
	meta.chunkCount = meta.storage.length;
	fileShare.files[hashCode] = meta; 
	return meta;
	
}
fileShare.leave = function (callback) {
    for (var i in fileShare.files) {
        var meta = fileShare.files[i];
        if (meta.holder == webrtc.socket) { //TODO: seperate webrtc

        } else {
            //inform sender that i want to leave
            fileShare.send(meta.sender, 'fileShare', {
                'event': 'receiver_leave',
                'data': {
                    'hashCode': meta.hashCode,
                    'newReceiver': meta.receiver,
                    'hasSentNo': meta.hasSentNo
                }

            })
            fileShare.send(meta.holder, 'fileShare', {
                'event': 'someone_leave_when_sharing',
                'data': {
                    'someone': webrtc.socket,
                    'hashCode': mata.hashCode,
                }
            });

            if (!!meta.receiver) {
                fileShare.send(meta.receiver, 'fileShare', {
                    'event': 'sender_leave',
                    'data': {
                        'hashCode': meta.hashCode,
                        'newSender': meta.sender
                    }
                })
            }

        }
    }
    callback();
}
fileShare.files = {};
fileShare.on('someone_request_file', function (data) {

    console.log('debug (someone_request_file) ' + JSON.stringify(data));
    var someone = data.someone;
    var hashCode = data.hashCode;
    var meta = fileShare.files[hashCode];
    var last = meta.last();
    //inform receiver
    fileShare.send(someone, 'fileShare', {
        'event': 'setup_for_sharing',
        'data': {
            'hashCode': hashCode,
            'filename': meta.filename,
            'holder': meta.holder,
            'sender': last,
            'chunkCount': meta.chunkCount
        }
    })
    //inform sender
    if (last == meta.holder) {
        fileShare.fire('new_receiver', {
            'hashCode': hashCode,
            'receiver': someone

        })

    } else {

        fileShare.send(last, 'fileShare', {
            'event': 'new_receiver',
            'data': {
                'hashCode': hashCode,
                'receiver': someone
            }
        })
    }
    meta.queue.push(someone);


});

fileShare.on('setup_for_sharing', function (data) {
    console.log('debug (setup_for_sharing) ' + JSON.stringify(data));
    var hashCode = data.hashCode;
    var filename = data.filename;
    var holder = data.holder;
    var sender = data.sender;
    var receiver = data.receiver;
    var chunkCount = data.chunkCount;

    fileShare.files[hashCode] = new  fileMeta(hashCode, filename, holder, sender, receiver,chunkCount);
});

function fileShareSaveToDisk(fileUrl, fileName) {
    console.log(fileName + 'save to disk');
    var save = document.createElement('a');
    save.href = fileUrl;
    save.target = '_blank';
    save.download = fileName || fileUrl;

    var event = document.createEvent('Event');
    event.initEvent('click', true, true);

    save.dispatchEvent(event);

    URL.revokeObjectURL(save.href);
}

fileShare.on('receive_chunk', function (data) {
    var hashCode = data.hashCode;
    var chunk = data.chunk;
    var meta = fileShare.files[hashCode];

    meta.storage.push(chunk);
    console.log('receive chunk (file share) ' + meta.storage.length);
    if (meta.storage.length == meta.chunkCount) {
        fileShareSaveToDisk(meta.storage.join(''), meta.filename);
        //inform file provider that someone has received file succesfully
        fileShare.send(meta.holder, 'htmlRender', {
            'event': 'systemMessage',
            'data': {
                'msg': '<strong>' + _nickname + '</strong>已经成功接收' + meta.filename + '.' //TODO: get nick name from meta.
            }
        });
    }
    if (!meta.receiver)
        return;
    fileShare.send(meta.receiver, 'fileShare', {
        'event': 'receive_chunk',
        'data': {
            'chunk': chunk,
            'hashCode': hashCode
        }
    });
    meta.hasSentNo++;

});
fileShare.on('someone_leave_when_sharing',function(data){
    console.log('debug (someone_leave_when_sharing) '+ JSON.stringify(data));
	var someone = data.someone;
	var hashCode = data.hashCode;
	var meta = fileShare.files[hashCode];
	var index = mata.queue.indexOf(someone);
	meta.queue.splice(index, 1);
	
});
fileShare.on('sender_leave', function (data) {
    console.log('debug (sender_leave) '+ JSON.stringify(data));
    var newSender = data.newSender;
    var hashCode = data.hashCode;
    fileShare.files[hashCode].sender = newSender;

});
fileShare.on('receiver_leave', function (data) {
    console.log('debug (receiver_leave) ' + JSON.stringify(data));
    var newReceiver = data.newReceiver;
    var hashCode = data.hashCode;
    var hasSentNo = data.hasSentNo;
    var meta = fileShare.files[hashCode];

    meta.receiver = newReceiver;
    meta.hasSentNo = data.hasSentNo;
    console.log('debug (receiver_leave) ' + JSON.stringify(data));
    fileShareSendChunk(meta.hasSentNo + 1, meta.storage.length, meta, hashCode);

    //for (var i = hasSentNo + 1, end = meta.storage.length; i < end; i++) {
    //    fileShare.send(newReceiver, 'fileShare', {
    //        'event': 'receive_chunk',
    //        'data': {
    //            'chunk': meta.storage[i],
    //            'hashCode': hashCode,
    //            'sender': fileShare.me
    //        }
    //    });
    //    meta.hasSentNo++;
    //}
});
fileShare.on('new_receiver', function (data) {
    var newReceiver = data.receiver;
    var hashCode = data.hashCode;

    var meta = fileShare.files[hashCode];
    //console.log('debug (new_receiver) ' + JSON.stringify(meta));
    meta.receiver = newReceiver;
    fileShareSendChunk(meta.hasSentNo + 1, meta.storage.length, meta,hashCode);
    //for (var i = meta.hasSentNo + 1, end = meta.storage.length; i < end; i++) {

    //    var data = {};
    //    data.chunk = meta.storage[i];
    //    data.hashCode = hashCode;
    //    data.sender = fileShare.me;

    //    fileShare.send(newReceiver, 'fileShare', {
    //        'event': 'receive_chunk',
    //        'data': data
    //    });
    //    meta.hasSentNo++;

    //}
})
function fileShareSendChunk(i,end,meta,hashCode)
{
    console.log('debug in file share send chunk i='+i+' end='+end);
    if(i<end)
    {
        var data = {};
        data.chunk = meta.storage[i];
        data.hashCode = hashCode;
        data.sender = webrtc.socket; //TODO: seperate webrtc 

        fileShare.send(meta.receiver, 'fileShare', {
            'event': 'receive_chunk',
            'data': data
        });
        meta.hasSentNo++;
        i++;
        setTimeout(function () {
            fileShareSendChunk(i, end, meta,hashCode);
        }, 500);
    }
    
}