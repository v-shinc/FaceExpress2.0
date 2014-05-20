
var socketio = require('socket.io');
var io;

module.exports.listen = function (server) {
    io = socketio.listen(server);
    io.xxconnections = {};
    io.rooms = [];
    io.names = {};
    io.sockets.on('connection', function (socket) {

        socket.emit('connected', { data: 'hello world' });

        socket.on('join_room', function (data) {
            console.log(JSON.stringify(data));
            var room = data.room;
            io.names[socket.id] = data.nickname;
            socket.join(room);
            io.xxconnections[socket.id] = io.xxconnections[socket.id] || socket;
            socket.broadcast.to(room).emit('message', {
                'event': 'new_comer',
                'data': {
                    'room': room,
                    'socketid': socket.id,
                    'nickname': data.nickname
                }
            });

            //console.log(io.sockets.clients(data.room));
            var connectionsid = getOtherMembersInRoom(room, socket.id);

            socket.emit('message', {
                'event': 'get_connections_already_in_room',
                'data': {
                    'sockets': connectionsid
                }
            });
        });
        socket.on('GoupTextChat', function (data) {
            console.log('group text chat'+ data)
            socket.broadcast.to(room).emit('message',{
                'event': 'text_chat',
                'data': data
            })
        });
        
        socket.on('send_offer', function (data) {
            console.log(data.socketid);
            if (data.socketid in io.xxconnections) {
                io.xxconnections[data.socketid].emit('message', {
                    'event': 'receive_offer',
                    'data': {
                        'socketid': socket.id,
                        'sdp': data.sdp,
                        'NO': data.NO
                    }
                });
            } else {
                socket.emit('message', {
                    'event': 'someone_leave',
                    'socketid': data.socketid,
                    'nickname': io.names[data.socketid]
                });
            }
            /*relay(data.socketid,function(){
            io.xxconnections[data.socketid].emit('message', {
            'event': 'receive_offer',
            'data': {
            'socketid': socket.id,
            'sdp': data.sdp,	
            'NO':data.NO
            }
            });
            },
            function(){
            socket.emit('message', {
            'event': 'someone_leave',
            'data': {
            'socketid': socket.id
            }
            });
            });*/
        });



        socket.on('send_answer', function (data) {
            io.xxconnections[data.socketid].emit('message', {
                'event': 'receive_answer',
                'data': {
                    'socketid': socket.id,
                    'sdp': data.sdp,
                    'NO': data.NO
                }
            });
        });
        socket.on('send_ice_candidate', function (data) {
            //console.log(io.connections.length);
            if (data.socketid in io.xxconnections) {
                io.xxconnections[data.socketid].emit('message', {
                    'event': 'receive_ice_candidate',
                    'data': {
                        'candidate': data.candidate,
                        'socketid': socket.id,
                        'room': data.room,
                        'NO': data.NO
                    }
                });
            } else {
                socket.emit('message', {
                    'event': 'someone_leave',
                    'data': {
                        'socketid': data.socketid,
                        'nickname': io.names[data.socketid]
                    }
                });
            }

        });
        socket.on('disconnect', function () {

            var rooms = getOwnRooms(socket.id);
            rooms.forEach(function (room) {
                if (room.length > 0) {
                    console.log('myroom=' + room);

                    socket.broadcast.to(room).emit('message', {
                        'event': 'someone_leave',
                        'data': {
                            'socketid': socket.id,
                            'nickname': io.names[socket.id]
                        }
                    });
                    socket.leave(room);
                }
            });
            //console.log('bbbb '+JSON.stringify(io.xxconnections));
            console.log('room =' + rooms);
            console.log('sb leave room ' + getMembersInRoom(rooms[0]));
            console.log('sb leave room ' + getMembersInRoom(rooms[1]));
            delete io.xxconnections[socket.id];
            delete io.names[socket.id];
            //console.log('aaaa '+JSON.stringify(io.xxconnections));

        })

    });

    return io;
};
function relay(socketId,successCallback,failureCallback){
	if(socketId in io.xxconnections){
		successCallback();
	}else{
		failureCallback();
	};
}
function sendMsg(socket,data){
    socket.emit('message', data);
}
function getOwnRooms(socketId){
	var ownRooms = [];
	console.log('xxxxxxxx'+JSON.stringify(io.sockets.manager.roomClients[socketId]));
	var rooms = io.sockets.manager.roomClients[socketId];
    for(var i in rooms){
    	if(rooms[i] == true){
    	    console.log('ddddd '+i);
    		ownRooms.push(i.substring(1, i.length));
	   	}
  	}
  	console.log('Own room '+ ownRooms +'length='+ownRooms.length);
  	return ownRooms;
}
  	
function getMembersInRoom(roomId){
	return io.sockets.clients(roomId).map(function (x) { return x.id; });
}
function getOtherMembersInRoom(roomId,myId){
	var connectionsid = getMembersInRoom(roomId);
	return connectionsid.filter(function (x) { return x != myId; });
}
function createJsonData(){
    
}