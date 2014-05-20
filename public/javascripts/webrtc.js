var getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia
	, URL = window.URL || window.webkitURL || window.oURL || window.msURL || window.mozURL
	, PeerConnection = window.PeerConnection || window.webkitPeerConnection00 || window.webkitRTCPeerConnection || window.msPeerConnection || window.mozPeerConnection;




var context = new webkitAudioContext();
var sineWave = context.createOscillator();

// Declare gain node
var gainNode = context.createGainNode();

// Connect sine wave to gain node
//sineWave.connect(gainNode);

// Connect gain node to speakers
gainNode.connect(context.destination);

// Play sine wave
//sineWave.noteOn(0);

gainNode.gain.value = 0;

function PCManager(socketid,forVideo,caller){
	this.socketid = socketid;
	this.forVideo = forVideo;
	this.oweAnswer = false;
	this.hasLocalStream = false;
	this.NO = forVideo?0:1;
	this.dc = null;
	this.caller = caller;
	this.setRemoteDescription = function(sdp){
		this.pc.setRemoteDescription(sdp, function () {
            
        }, function () {
            
        });
	}
	this.setLocalDescription = function(sdp){
		this.pc.setLocalDescription(sdp, function () {
            
        }, function () {
            
        });
	}
	
	this.addIceCandidate = function(candidate){
		this.pc.addIceCandidate(candidate, function () {
            
        }, function () {
           
        })
	}
	this.tryToSendOffer = function(){
		var can = this.forVideo&&this.hasLocalStream || !this.forVideo;
		sendOffer(this);
	}
	this.tryToSendAnswer = function(){
		var can =  this.forVideo && this.hasLocalStream || !this.forVideo;
		if(!can){
			this.oweAnswer = true;
		}
		else{
			sendAnswer(this);
			this.oweAnswer = false;
		}
	}
	this.addStream = function(stream){
		if(this.forVideo)
		{
			this.pc.addStream(stream);
			this.hasLocalStream = true;	
		}
		
	}
	createPeerConnection(this);
	
}
var twoPC = {};
var webrtc = {};

webrtc.signalingchannel = null;
var room = getRoomNumber();
var hasStream = false;

webrtc.streams = [];
webrtc.events = {};
webrtc.connections = [];

webrtc.remoteStreams={};
webrtc.dataChannels = {};
webrtc.socket = null;
webrtc.config = {
    /*the ice server and the datachannel config*/
    rtcconfig: { iceServers: [{ url: "stun:stun.l.google.com:19302"}] },
    dataChannel: { optional: [{ RtpDataChannels: true}] }

};

var dataChannelConfig = {
    ordered:true,
    maxRetransmitTime:3000
};

webrtc.on = function (eventname, fn) {

    webrtc.events[eventname] = webrtc.events[eventname] || [];
    webrtc.events[eventname].push(fn);

}
webrtc.fire = function (eventname, _) {

    var events = webrtc.events[eventname];
    var args = Array.prototype.slice.call(arguments, 1);
    if (!events) return;

    events.forEach(function (ele) {
        ele.apply(null, args);
    })
}
webrtc.connect = function (server, room, nickname) {
    console.log(nickname);
    webrtc.signalingchannel = io.connect(server);

    webrtc.signalingchannel.on('message', function (msg) {

        webrtc.fire(msg.event, msg.data);
    })
    webrtc.signalingchannel.on('connected', function (msg) {
        console.log(msg.data);
        webrtc.signalingchannel.emit('join_room', { 'room': room, 'nickname': nickname });
        webrtc.socket = webrtc.signalingchannel.socket.sessionid;
    });
    webrtc.on('new_comer', function (data) {
        var comer = data.socketid;
        webrtc.connections.push(comer);
        twoPC[comer] = [];
        twoPC[comer][0] = new PCManager(comer, true, false);
        twoPC[comer][1] = new PCManager(comer, false, false);
        if (hasStream) {
            twoPC[comer][0].addStream(webrtc.streams[0]);
        }
        htmlRender.fire('systemMessage', {
            'msg': data.nickname + '进入房间.'
        });


    });
    webrtc.on('someone_leave', function (data) {

        var idx = webrtc.connections.indexOf(data.socketid);
        webrtc.connections.splice(idx, 1);
        console.log(data.socketid + ' leave.');
        delete twoPC[data.socketid];
        delete webrtc.remoteStreams[data.socketid];
        reArrangeVideo(webrtc.remoteStreams, $('.remote-video'));
        htmlRender.fire('systemMessage', {
            'msg': data.nickname + '离开房间.'
        });
    });


    webrtc.on('receive_offer', function (data) {

        console.log('debug in receive offer');
        twoPC[data.socketid][data.NO].setRemoteDescription(new RTCSessionDescription(data.sdp));
        twoPC[data.socketid][data.NO].tryToSendAnswer()
    })


    webrtc.on('receive_answer', function (data) {
        twoPC[data.socketid][data.NO].setRemoteDescription(new RTCSessionDescription(data.sdp));
        //twoPC[data.socketid][data.NO].tryToCreateDataChannel();

    });

    webrtc.on('receive_ice_candidate', function (data) {

        if (!data.candidate) return;
        twoPC[data.socketid][data.NO].addIceCandidate(new RTCIceCandidate(data.candidate));
    })
    webrtc.on('get_connections_already_in_room', function (data) {
        //console.log('debug 1 '+data.sockets);
        webrtc.connections = data.sockets || [];

        webrtc.connections.forEach(function (socketid) {
            twoPC[socketid] = [];
            twoPC[socketid][0] = new PCManager(socketid, true, true);
            twoPC[socketid][1] = new PCManager(socketid, false, true);
        });

        /*for(var i in twoPC){
        twoPC[i][1].tryToSendOffer();
        }*/
    });
    webrtc.on('text_chat', function (data) {
        htmlRender.fire(data.event,data.data);
    });
}

function createPeerConnection(pcMg) {
    pcMg.pc = new PeerConnection(webrtc.config.rtcconfig);
    
    pcMg.pc.onicecandidate = function (evt) {
    	console.log("onicecandidate "+pcMg.socketid+" "+pcMg.NO);
        webrtc.signalingchannel.emit('send_ice_candidate', {
            'candidate': evt.candidate,
            'socketid': pcMg.socketid,            //bob
            'room': room,
            'NO':pcMg.NO
        })
    }
    
    pcMg.pc.onnegotiationneeded = function () {
        //pc.createOffer(localDescCreated, logError);
        console.log('onnegeotiation')
        if(!pcMg.forVideo)pcMg.tryToSendOffer();
    }
    
    pcMg.pc.onaddstream = function (evt) {
        console.log('pc get stream');
        var remoteVideos = $('.remote-video');
   
        console.log('onaddstream '+pcMg.socketid);
        webrtc.remoteStreams[pcMg.socketid] = evt.stream;
        
        reArrangeVideo(webrtc.remoteStreams, remoteVideos);
    }
    
    pcMg.pc.onremovestream = function (event) {
       
        
        delete webrtc.remoteStreams[pcMg.socketId];
    };
    
    pcMg.pc.onsignalingstatechange = function (event) {
        
        console.log('signalingstate=' + event.srcElement.signalingState);
        if (event.srcElement.signalingState == 'closed') {
            console.log('debug in onsignalingstatechange: someone leave');
        }
    };

    pcMg.pc.oniceconnectionstatechange = function (event) {
        if (event.srcElement.iceConnectionState == 'disconnected') {
        	//this = null;
        	pcMg.pc = null;
            console.log('debug in oniceconnectionstatechange: someone leave');
        }
    };
    
    pcMg.pc.ondatachannel = function(event){
    	
    	pcMg.dc = event.channel;
    	setUpDataChannel(pcMg.dc);
    }
    
    if(pcMg.caller&&!pcMg.forVideo){
	    pcMg.dc = pcMg.pc.createDataChannel(pcMg.socketid, dataChannelConfig,function(){
	    
		});
		setUpDataChannel(pcMg.dc);
    }
    
}


function setUpDataChannel(dc){
	dc.onerror = logError;
    dc.onmessage = function (event) {
        
        var data = JSON.parse(event.data);
        
        htmlRender.fire(data.event,data.data);
        /*if(data.dataType=='text'){
        	console.log(data.displayType+' '+JSON.stringify(data.content));
	        htmlRender.fire(data.displayType,data.content);
        }
        	
        	
        if(data.dataType=='file'){
            console.log(data.content);
            var content = data.content;
            
	        arrayToStoreChunks.push(content.chunk);
	        //console.log(JSON.stringify(data.chunk));
	        if (content.last) {
	        	console.log(content.filename);
		        saveToDisk(arrayToStoreChunks.join(''), content.filename);
		        arrayToStoreChunks = []; // resetting array
		        
		    }
        }*/
    };
    dc.onopen = function () {
        console.log('Data Channel has opened!');
    };
    dc.onclose = function () {
        console.log("Data Channel closed!");
    };
}




function startPlayUserMedia(mediaConfig, successCallback, failureCallback) {
    getUserMedia.call(navigator, {
        "audio": true,
        "video": true
    }, function (stream) {
        var localVideo = document.getElementById('localvideo');
        localVideo.src = URL.createObjectURL(stream);
        localVideo.play();
        localVideo.volume = 0;
        localVideo.muted =0;
        webrtc.streams.push(stream);
        hasStream = true;
        for (var socketid in twoPC) {
           
            twoPC[socketid][0].addStream(stream);
            if (twoPC[socketid][0].oweAnswer == true) {
                twoPC[socketid][0].tryToSendAnswer();
            } else {
                twoPC[socketid][0].tryToSendOffer();
            }
        };

        successCallback();
    }, function (err) {
        logError(err);
        failureCallback();
    });
}



function reArrangeVideo(streams, remoteVideosEle) {
    var idx = 0;
    var len = remoteVideosEle.length;
    for (var i = 0; i < len; i++) {
        remoteVideosEle[i].src = '';
    }
    for (var socketid in streams) {
        if (idx == len) return;
        remoteVideosEle[idx].src = URL.createObjectURL(streams[socketid]);
        idx++;
    }
}





function sendOffer(pcMg) {
    

    pcMg.pc.createOffer(function (sdp) {
        pcMg.setLocalDescription(sdp);
        
        webrtc.signalingchannel.emit('send_offer', {
            'sdp': sdp,
            'socketid': pcMg.socketid,
            'NO':pcMg.NO
        });
    }, logError);
}

function sendAnswer(pcMg) {
    
    pcMg.pc.createAnswer(function (sdp) {
        pcMg.setLocalDescription(sdp);
        webrtc.signalingchannel.emit('send_answer', {
            'sdp': sdp,
            'socketid': pcMg.socketid,
            'NO':pcMg.NO
        });
        pcMg.oweAnswer = false;
    }, logError);
}
/*function findKeyByValue(value,dict){
    for(var key in dict)
    {
        if (dict[key] == value)
            return key;
    }
    return null;
}*/


function logError(error) {
	console.log("log error:"+JSON.stringify(error));	
    console.log(error.name + ": " + error.message);
}

function getRoomNumber(){
	return window.location.hash.slice(1);
}
window.onbeforeunload = function () {
    webrtc.singnalingchannel.emit('disconnect');
    for(var socketid in twoPC){
	    twoPC[socketid][0].pc.close();
	    twoPC[socketid][1].pc.close();
    }
    
}






