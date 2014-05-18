var fileType = {
	'image':'glyphicon glyphicon-picture',
	'application':'glyphicon glyphicon-paperclip',
	'text':'glyphicon glyphicon-file'
}
String.prototype.hashCode = function() {
  for(var ret = 0, i = 0, len = this.length; i < len; i++) {
    ret = (31 * ret + this.charCodeAt(i)) << 0;
  }
  return ret;
};
var htmlRender = {};
	htmlRender.handlers = [];
	_nickname = '';
	htmlRender.on = function (displayType, fn) {

    	htmlRender.handlers[displayType] = htmlRender.handlers[displayType] || [];
    	htmlRender.handlers[displayType].push(fn);

    }
    htmlRender.fire = function (displayType, _) {

    	var handlers = htmlRender.handlers[displayType];
    	var args = Array.prototype.slice.call(arguments, 1);
    	if (!handlers) return;

    	handlers.forEach(function (h) {
   	     	h.apply(null, args);
   	    })
   	}
   	
var messageAgent = {
    groupSend: function (data) {
        for (var i in twoPC) {
            twoPC[i][1].dc.send(JSON.stringify(data));
        }
    },
    send: function (socketid, data) {
        if (!(socketid in twoPC)) {
            htmlRender.fire('systemMessage', { 'msg': socketid + ' 已离开.' });
            return;
        }

        twoPC[socketid][1].dc.send(JSON.stringify(data));
    }

}

	
	
	var fileArea = document.getElementById('chat-box');
	fileArea.addEventListener('drop',dropHandler,false);
	fileArea.addEventListener('dragover',dragoverHandler,false);
	
	var dataURLFile = {};
	
	function dropHandler(event) {
	    
	    event.stopPropagation();
	    event.preventDefault();
	    
	    var file = event.dataTransfer.files[0];
   	 	
   	 	
   	 	var data = {};
   	 	data.name = file.name;
   	 	data.type = file.type;
   	 	data.size = file.size;
   	 	data.nickname= _nickname;
   	 	data.socketid = webrtc.socket;
   	 	data.hashCode = (file.name + Math.random()).hashCode();
   	 	
   	 	var reader = new window.FileReader();
   	 	reader.readAsDataURL(file);
   	 	reader.onload = function(event) {
   	 		dataURLFile[data.hashCode] = event.target.result;
   	 		
   	 		
	   	 	messageAgent.groupSend({
		   	 	'event':'askTransferPermission',
		   	 	'data':data
	   	 	});
	   	 	htmlRender.fire('uploadFile',data);
		};
   	};
	
   	
   	   	
   	function dragoverHandler(event){
   		event.stopPropagation();
	    event.preventDefault();
   	}




	htmlRender.on('localMessage',function(data){	
		
		console.log('fff'+data);
		/*$('<small>'+data.nickname+'</small><br>').appendTo('#message-box');*/
		
        $html = '<div class="message-me"><div class="bubble"><small>' + data.msg + '<small></div></div>';
        $($html).appendTo('#message-box');
        $('.nano').nanoScroller();
        $(".nano").nanoScroller({ scroll: 'bottom' });
        $('#input-box').val('');
	})
	htmlRender.on('remoteMessage',function(data){
	    console.log('remote'+data);
		$html = '<div class="message-others"><div class="name">'+data.nickname+':</div><div class="bubble-other"><small>' + data.msg + '</small></div></div>';
		$($html).appendTo('#message-box');
        $('.nano').nanoScroller();
        $(".nano").nanoScroller({ scroll: 'bottom' });
        $('#input-box').val('');
	})
    htmlRender.on('systemMessage',function(data){
    	console.log(data);
	    $html = '<div class="message-system"><div class="bubble-system"><small>' + data.msg + '</small></div></div>';
		$($html).appendTo('#message-box');
        $('.nano').nanoScroller();
        $(".nano").nanoScroller({ scroll: 'bottom' });
        $('#input-box').val('');
    })
    
    htmlRender.on('askTransferPermission', function (data) {
        console.log(data);
        var id = 'ac' + data.hashCode;
        //data = JSON.parse(data);
        $html = '<div class="message-others"><div class="name">'+data.nickname+':</div><div class="bubble-other">'+
        		'<span class="'+fileType[data.type.substring(0,data.type.indexOf('/'))]+'"></span><br><small>' +
	    	    data.name +'</br>'+
	    		Math.ceil(data.size/1024) + 'KB</small>'+
	    		'<span class="glyphicon glyphicon-ok-circle accept" id="' + id + '"></span>'+
	    		'</div></div>';

        $($html).appendTo('#message-box');
        $('.nano').nanoScroller();
        $(".nano").nanoScroller({ scroll: 'bottom' });
        $('#input-box').val('');

        var accept = document.getElementById(id);
        accept.addEventListener('click', function () {
            messageAgent.send(data.socketid, {
                'event': 'startSendFile',
                'data': {
                    'socketid': webrtc.socket,
                    'hashCode': data.hashCode,
                    'filename':data.name,
                    'nickname':_nickname
                }
            })
        });

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

   var arrayToStoreChunks = {};

	htmlRender.on('receiveChunkyFile', function (data) {
	 	
	    arrayToStoreChunks[data.hashCode] = arrayToStoreChunks[data.hashCode] || [];
	    arrayToStoreChunks[data.hashCode].push(data.chunk);

	    if (data.last) {
	        console.log(data.filename);
	        saveToDisk(arrayToStoreChunks[data.hashCode].join(''), data.filename);
	        //delete arrayToStoreChunks[data.hashCode]; // resetting array
            console.log(data.socketid+'ssss');
            messageAgent.send(data.socketid,{
	            'event':'systemMessage',
	            'data':{
		            'msg':'<strong>'+_nickname+'</strong>已成功接收'+data.filename+'.'
	            }
            })
	    }
	})
	
	htmlRender.on('startSendFile',function(data){
        console.log(data.socketid+' '+data.filename+' '+data.hashCode)
	    sendChunkyFile(dataURLFile[data.hashCode],data.socketid,data.filename,data.hashCode);
    });
    
    var chunkLength = 50000;
    function sendChunkyFile(text,socketid,filename,hashCode){
	   	var data = {};
	   	if (text.length > chunkLength) {
		   	 	data.chunk = text.slice(0, chunkLength); // getting chunk using predefined chunk length
		   	 	data.hashCode = hashCode;
		   	} else {
		        data.chunk = text;
		        data.last = true;
		        data.filename = filename;
		        data.hashCode = hashCode;
		        data.socketid = webrtc.socket;
		        data.nickname = _nickname;
		    }
		    messageAgent.send(socketid,{
			    'event':'receiveChunkyFile',
			    'data':data
                
		    });
		    

		    var remainingDataURL = text.slice(data.chunk.length);
		    if (remainingDataURL.length)
		    {
		    	 setTimeout(function () {
			    	 sendChunkyFile(remainingDataURL,socketid,filename,hashCode); // continue transmitting
			     }, 100);
			}
   	}

    htmlRender.on('uploadFile',function(data){
    	console.log(data);
        //data = JSON.parse(data);
	    $html = '<div class="message-me"><div class="bubble">'+
	    		'<span class="'+fileType[data.type.substring(0,data.type.indexOf('/'))]+'"></span><br><small>' +
	    	    data.name +'</br>'+
	    		//data.type+'</br>'+
	    		Math.ceil(data.size/1024) + 'KB</small></div></div>';
	    $($html).appendTo('#message-box');
        $('.nano').nanoScroller();
        $(".nano").nanoScroller({ scroll: 'bottom' });
        $('#input-box').val('');
    });
    
    
    
    
    var mainVideo = document.getElementById('main-video');
    
    $('#send').click(function () {
    	
    	var content = $('#input-box').val();
    	messageAgent.groupSend({
	    	'event':'remoteMessage',
	    	'data':{
		    	'msg':content,
	        	'nickname':_nickname
	    	}
    	});
        htmlRender.fire('localMessage',{
	        'msg':content,
	        'nickname':_nickname
        });
    })
     $('#input-box').keydown(function (event) {
        var key = event.keyCode || event.which; // differences between IE and other browsers
        if (key != 13) return;
        if ($('#input-box').val().length === 0) {
        
        } else {
        	var content = $('#input-box').val();
        	messageAgent.groupSend({
	        	'event':'remoteMessage',
	        	'data':{
		        	'msg':content,
		        	'nickname':_nickname 
	        	}
        	});
            
          	htmlRender.fire('localMessage',{
	        	'msg':content,
	        	'nickname':_nickname
	        });
        }
    });
    
    var hasOpenedP2PChannel = false;
    $('#play-pause').click(function () {
        var video = document.getElementById('main-video')
        var playButton = document.getElementById('play-pause');
        if (!hasOpenedP2PChannel) {
            startPlayUserMedia({ "audio": true, "video": true }, function () {
                //playButton.innerHTML = '<span class="glyphicon glyphicon-pause"></span>';
                hasOpenedP2PChannel = true;

            }, function () {
                console.log('Error occurs when play user\'s media. ');

            });
            return;

        }

        if (video.paused == true) {
            video.play();
            playButton.innerHTML = '<span class="glyphicon glyphicon-pause"></span>';
        } else {

            video.pause();
            playButton.innerHTML = '<span class="glyphicon glyphicon-play"></span>';
        }
    });
    
    $('#volume-up').click(function () {
        if (mainVideo.volume + 0.2 > 1) return;
        mainVideo.volume += 0.2;

    });
    $('#volume-down').click(function () {
        //if(mainVideo.volume - 0.2 <0)return;
        //mainVideo.volume -= 0.2;
        mainVideo.muted = true;
        console.log('muted=' + mainVideo.muted);
    });
   
    $('#full-screen').click(function () {
        console.log('full screen click');
        toggleFullScreen();
    });

    var fullscreenElement = mainVideo.fullscreenElement || mainVideo.mozFullScreenElement || mainVideo.webkitFullscreenElement;
    var requestFullScreen = mainVideo.requestFullscreen || mainVideo.mozRequestFullScreen || mainVideo.webkitRequestFullscreen;
    var cancelFullScreen = mainVideo.cancelFullScreen || mainVideo.mozCancelFullScreen || mainVideo.webkitCancelFullScreen;
    function toggleFullScreen() {
        if (!fullscreenElement) {  // current working methods
            //document.documentElement.webkitRequestFullscreen();
            requestFullScreen.call(mainVideo);
        } else {

            cancelFullScreen.call(mainVideo);
        }
    }
    
    $('#myModal').modal({
		show:true
	});
	$('#nickname').keydown(function(event){
		var key = event.keyCode || event.which; // differences between IE and other browsers
        if (key != 13) return;
        var nickname = $('#nickname').val();
		if(nickname=="")
		{
			
		}
		else
		{
			triggeredbyok=true;
			$('#myModal').modal('hide');
			_nickname = nickname;
			webrtc.connect('http://192.168.1.104:3000', room,_nickname);
			htmlRender.fire('systemMessage',{
	        	'msg':nickname+', 欢迎进入 <strong>Face Express</strong>.',
	        	
	        });
		}
	});
	var triggeredbyok=false;
	$('#ok').click(function(){
		var nickname = $('#nickname').val();
		if(nickname=="")
		{
			
		}
		else
		{
			triggeredbyok=true;
			$('#myModal').modal('hide');
			_nickname = nickname;
			webrtc.connect('http://192.168.1.104:3000', room,_nickname);
			htmlRender.fire('systemMessage',{
	        	'msg':nickname+', 欢迎进入 <strong>Face Express</strong>.',
	        	
	        });
		}
			
	})
	$('#myModal').on('hide.bs.modal', function (e) {
		return triggeredbyok;
  	})	
    /*function Player(isMain, element) {
        this.isMain = isMain || false;
        this.stream = [];
        this.label = '';
        this.element = element;
        this.dbclickHandler = function (sender) {
            this.isMain = true;
            console.log(this.label + " was double clicked!");
            console.log('send\'s id=' + sender.id);
            sender.src = this.stream;
        }
    };
   
    var players = [];
    var boxs = $('.remote-video');
    function registerVideoManager() {
        for (var i = 0, len = boxs.length; i < len; i++) {

            var b = boxs[i];
            var p = new Player();
            b.id = i;
            p.label = i;
            players.push(p);
            console.log($(boxs[i]).attr('id'));
            //$(b).bind('dblclick', function () {
            //    players[this.id].dbclickHandler(this);
            //});
            b.addEventListener('dblclick', function () {
                players[this.id].dbclickHandler(this);
            });
        }
    }*/

    //registerVideoManager()