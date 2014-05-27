function fileMeta(hashCode,holder,sender,receiver)
{
    this.hashCode = hashCode;
    this.holder = holder;
    this.sender = sender;
    this.receiver = receiver;
    this.hasSentNo = -1;
    this.storage = [];
    this.queue = [];
    this.last = function(){
	    return this.queue[this.queue.length-1];
    }
} 

var fileShare = {};
fileShare.events = {};

fileShare.init = function(me,length){
	fileShare.chunkLength = 1000;
	fileShare.me = me;
	
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
fileShare.send = function(receiver,data){
	twoPC[receiver][1].dc.send(JSON.stringify({
		'space':'fileShare',
		'msg':data
	}));
}

fileShare.dispatch(msg){
	var d = JSON.parse(msg);
	fileShare.fire(d.event,d.data);
}

fileShare.initMeta(hashCode,DataURL,holder)
{
	var meta = fileMeta(hashCode,holder,null,null);
	var holder = fileShare.me;
	meta.queue.push(holder);
	while(DataURL.length>0){
		meta.storage.push(DataURL.slice(0, fileShare.chunkLength));
		DataURL = DataURL.slice(fileShare.chunkLength,DataURL.length);
	}
	fileShare.files[hashCode] = meta; 
	
}
fileShare.files = {};
fileShare.on('someone_request_file',function(data){
	
	var someone = data.someone;
	var hashCode = data.hashCode;
	var meta = fileShare.files[hashCode];
	var last = meta.last();
	//inform receiver
	fileShare.send(someone,{
		'event':'setup_for_sharing',
		'data':{
			'hashCode':hashCode,
			'holder':meta.holder,
			'sender':last
		}
	})
	//inform sender
	if(last == meta.holder){
		fileShare.fire('new_receiver',{
			'data':{
				'hashCode':hashCode,
				'receiver':someone
			}
		})
		
	}else{
		
		fileShare.send(last,{
			'event':'new_receiver',
			'data':{
				'hashCode':hashCode,
				'receiver':someone
			}
		})
	}
	
	
});

fileShare.on('setup_for_sharing',function(data){
	
	var hashCode = data.hashCode;
	var holder = data.holder;
	var sender = data.sender;
	var receiver = data.sender;
	fileShare.files[hashCode] = fileMeta(hashCode,holder,sender,receiver);
});

fileShare.on('receive_chunk',function(data){
	var hashCode = data.hashCode;
	var chunk = data.chunk;
	var meta = fileShare.files[hashCode];
	
	meta.storage.push(chunk);
	if(!meta.receiver)
		return;
	fileShare.send(meta.receiver,{
		'event':'receive_chunk',
		'data':{
			'chunk':chunk,
			'hashCode':hashCode
		}
	});	
	meta.hasSentNo++;
	
});
fileShare.on('someone_leave_when_sharing',function(){
	var someone = data.someone;
	var hashCode = data.hashCode;
	var meta = fileShare.files[hashCode];
	var index = mata.queue.indexOf(someone);
	meta.queue.splice(index, 1);
	
});
fileShare.on('sender_leave',function(data){
	
	var newSender = data.newSender;
	var hashCode = data.hashCode;
	fileShare.files[hashCode].sender = newSender;
	
});
fileShare.on('receiver_leave',function(data){
	
	var newReceiver = data.receiver;
	var hashCode = data.hashCode;
	
	var meta = fileShare.files[hashCode];
	var hasSentNo = meta.hasSentNo;
	meta.receiver = newReceiver;
	for(var i=hasSentNo+1,end=meta.storage.length;i<end;i++)
	{
		fileShare.send(newReceiver,{
			'event':'receive_chunk',
			'data':{
				'chunk':meta.storage[i],
				'hashCode':hashCode,
				'sender':fileShare.me
			}
		});
		meta.hasSentNo;++;
	}
});
fileShare.on('new_receiver',function(data){
	var newReceiver = data.receiver;
	var hashCode = data.hashCode;
	
	var meta = fileShare.files[hashCode];
	meta.receiver = newReceiver;
	for(var i=hashCode+1,end= meta.storage.length;i<end;i++){
		fileShare.send(newReceiver,{
			'event':'receive_chunk',
			'data':{
				'chunk':meta.storage[i],
				'hashCode':hashCode,
				'sender':fileShare.me
			}
		});
		meta.hasSentNo;++;

	}	
})
