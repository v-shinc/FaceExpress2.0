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
fileShare.send = function(receiver,space,data){
	twoPC[receiver][1].dc.send(JSON.stringify({
		'space':space,
		'msg':data
	}));
}

fileShare.dispatch(msg){
	var d = JSON.parse(msg);
	fileShare.fire(d.event,d.data);
}

fileShare.createMeta(hashCode,filename,DataURL,holder)
{
	var meta = fileMeta(hashCode,filename,holder,null,null);
	var holder = fileShare.me;
	meta.queue.push(holder);
	while(DataURL.length>0){
		meta.storage.push(DataURL.slice(0, fileShare.chunkLength));
		DataURL = DataURL.slice(fileShare.chunkLength,DataURL.length);
	}
	meta.chunkCount = meta.storage.length;
	fileShare.files[hashCode] = meta; 
	return meta;
	
}
fileShare.files = {};
fileShare.on('someone_request_file',function(data){
	
	var someone = data.someone;
	var hashCode = data.hashCode;
	var meta = fileShare.files[hashCode];
	var last = meta.last();
	//inform receiver
	fileShare.send(someone,'fileShare'{
		'event':'setup_for_sharing',
		'data':{
			'hashCode':hashCode,
			'filename':meta.filename,
			'holder':meta.holder,
			'sender':last,
			'chunkCount':meta.chunkCount
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
		
		fileShare.send(last,'fileShare',{
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
	var filename = data.filename;
	var holder = data.holder;
	var sender = data.sender;
	var receiver = data.receiver;
	var chunkCount = data.chunkCount;

	fileShare.files[hashCode] = fileMeta(hashCode,filename,holder,sender,receiver);
});

	function saveToDisk(fileUrl, fileName) {
		console.log('save to disk');
		var save = document.createElement('a');
		save.href = fileUrl;
		save.target = '_blank';
		save.download = fileName || fileUrl;

		var event = document.createEvent('Event');
		event.initEvent('click', true, true);
    
		save.dispatchEvent(event);
    
		URL.revokeObjectURL(save.href);	
	}
	
fileShare.on('receive_chunk',function(data){
	var hashCode = data.hashCode;
	var chunk = data.chunk;
	var meta = fileShare.files[hashCode];
	
	meta.storage.push(chunk);
	
	if(meta.storage.length == meta.chunkCount){
		saveToDisk(meta.storage.join(''), meta.filename);
		//inform file provider that someone has received file succesfully
		fileShare.send(meta.holder,'htmlRender',{
			'event':'systemMessage',
			'data':{
				'msg':'<strong>'+_nickname+'</strong>已经成功接收'+meta.filename+'.' //TODO: get nick name from meta.
			}
		});
	}
	if(!meta.receiver)
		return;
	fileShare.send(meta.receiver,'htmlRender',{
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
		fileShare.send(newReceiver,'fileShare',{
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
	for(var i=meta.hasSentNo+1,end= meta.storage.length;i<end;i++){
	
		var data = {};
		data.chunk = meta.storage[i];
		data.hashCode = hashCode;
		data.sender = fileShare.me;
		
		fileShare.send(newReceiver,'fileShare',{
			'event':'receive_chunk',
			'data':data
		});
		meta.hasSentNo;++;

	}	
})
