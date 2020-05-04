const userService = require('../containers/service/userService.js');
var conf = require('../conf/casino.conf.js');
exports = module.exports = Gamer;

function Gamer() {
	if(!(this instanceof Gamer)) return new Gamer();
	
	this.uid = null;
	this.profile = {};
	this.room = null;
	this.seat = -1;
	this.fold = 0;
	//add new this.nextGame will handle between n people that have same the score 
	//or The score player = 40 || 30
	this.nextGame = false;
}

Gamer.prototype.setLink = function(server, socket, pin) {
	var gamer = this;
	var uid = gamer.uid;
	
	if(gamer.socket) {
		gamer.removeLink();
	}
	
	gamer.server = server;
	gamer.socket = socket;
	gamer.pin = pin;
	
	socket.gamers[ uid ] = gamer;
	socket.gamers_count ++;
	
	return this;
};

Gamer.prototype.removeLink = function() {
	var gamer = this;
	
	var socket = gamer.socket;
	if(socket) {
		delete socket.gamers[ gamer.uid ];
		socket.gamers_count --;
	}
	
	gamer.socket = null;
	gamer.server = null;
	gamer.pin = null;
	
	return this;
};

Gamer.prototype.notify = function(event, args) {
	// console.log('LOGIN_NOTIFY', {event, args})
	var socket = this.socket;
	if(socket) {
		socket.emit('notify', {
			uid: this.uid,
			e: event,
			args: args
		});
	}
	
	return this;
};
//ADD NEW DATA
Gamer.prototype.createProfile = async function(p) {
	var profile = await userService.createProfile(p);
	return {
		uid: profile.uid,
		name: profile.name,
		avatar: profile.avatar,
		coins: profile.coins,
		score: profile.score,
		exp: profile.exp,
		level: profile.level
	};
}

Gamer.prototype.setProfile = function( p ) {
	this.uid = p.uid;
	//Add new
 	var gamer =this;
 	gamer.createProfile(p);

	// Old
	this.profile = {
		uid: p.uid,
		name: p.name,
		avatar: p.avatar,
		coins: p.coins,
		score: p.score,
		exp: p.exp,
		level: p.level,
		gameFeeIdxMS : 25
	};

	return this;
};

Gamer.prototype.getUser = async ( p ) => {
	// ADD NEW DATA
	return await userService.getProfile({uid: p.uid, name: p.name});
}

Gamer.prototype.getProfile = function() {
	var p = this.profile;

	return {
		uid: p.uid,
		name: p.name,
		avatar: p.avatar,
		coins: p.coins,
		score: p.score,
		exp: p.exp,
		level: p.level,
		gameFeeIdxMS : 25
	};
};

Gamer.prototype.getName = function() {
	return {
		uid: this.uid,
		name: this.profile.name
	};
};

Gamer.prototype.saveData = function( reply ){
	var gamer = this;
	if(typeof reply !== 'function') reply = function(err,ret){};

	var db = null;
	if(gamer.server) db = gamer.server.db;
	else if(gamer.room) db = gamer.room.db;
	else {
		reply(500, 'db err');
		return;
	}

	var p = gamer.profile;
	
	// console.log('p ===***',p)
	const data = userService.saveData(p).then(result => {
		// console.log('SAVE DATA',result);
		 console.log('**SAVE DATA** in mongoDB');
	});
	
	var uid_key = 'user:#' + gamer.uid;
	db.multi()
	.hset(uid_key, 'coins', p.coins)
	.hset(uid_key, 'score', p.score)
	.hset(uid_key, 'exp', p.exp)
	.hset(uid_key, 'level', p.level)
	.exec(function(err,ret){
		if(err) reply(500, 'db err');
		else { 
			reply(0, {});
		}
	});
	console.log('**SAVE DATA**====>>> on RAM');
};

Gamer.prototype.refresh = function( reply ){
	var gamer = this;
	if(typeof reply !== 'function') reply = function(err,ret){};
	
	var db = null;
	if(gamer.server) db = gamer.server.db;
	else if(gamer.room) db = gamer.room.db;
	else {
		reply(500, 'db err');
		return;
	}

	var uid_key = 'user:#' + gamer.uid;
	db.hgetall(uid_key, function(err,userinfo){
		if(err) reply(500, 'db err');
		else { 
			if(userinfo) {
				gamer.setProfile( userinfo );
				reply(0, {});
			} else {
				reply(404, 'not found');
			}
		}
	});
};

Gamer.prototype.onLogin = function(){
	var gamer = this;
	
	var pub = gamer.server.pub;
	
	pub.publish('user:log', 'user (' + gamer.uid + ') login');
	
	pub.publish('user:#'+gamer.uid, JSON.stringify({
		f:'login',
		uid: gamer.uid,
		e: 'login',
		args: gamer.pin
	}));

};

Gamer.prototype.onDrop = function() {
	var gamer = this;
	if(gamer.room) {
		var room_key = 'room:#' + gamer.room;
		gamer.server.pub.publish(room_key, JSON.stringify({
			uid: gamer.uid,
			f: 'drop',
			seq: 0,
			args: null
		}));
	}
};

Gamer.prototype.onRelogin = function( req ) {
	var gamer = this;

	var pub = gamer.server.pub;
	
	pub.publish('user:log', 'user (' + gamer.uid + ') re-login');

	pub.publish('user:#'+gamer.uid, JSON.stringify({
		f:'login',
		seq: req.seq,
		uid: gamer.uid,
		e: 'relogin',
		args: gamer.pin
	}));
	
	if(gamer.room) {
		var room_key = 'room:#' + gamer.room;
		gamer.socket.join(room_key);
		gamer.server.pub.publish(room_key,JSON.stringify({
			uid: gamer.uid,
			f: 'relogin',
			seq: 0,
			args: null
		}));
	}
};

Gamer.prototype.onLogout = function() {
	var gamer = this;
	if(gamer.room) {
		var room_key = 'room:#' + gamer.room;
		gamer.server.pub.publish(room_key,JSON.stringify({
			uid: gamer.uid,
			f: 'logout',
			seq: 0,
			args: null
		}));
		gamer.socket.leave(room_key);
	}
};

Gamer.prototype.onGamer_games = function(req, func) {
	var db = this.server.db;
	if(! db) { func(500, 'db err'); return; }
	
	var now = Date.now();
	if(! db.cache) db.cache = {};
	var cache = db.cache;

	// console.log('onGamer_games CACHE', cache)
	
	var list = cache['game:all'];
	// console.log('list',list)
	var timestamp = cache['t_game:all'];
	// console.log('timestamp',timestamp)
	if(list && timestamp && (now < timestamp +1000)) {
		func(0, list);
		
	} else {
		db.zrange('game:all', 0, -1, function(err,ret){
			if(err) { func(500, 'db err'); return; }
			if(! ret) { func(404, 'not found'); return; }
			
			var m = db.multi();
			for(var i=0, len=ret.length; i<len; i++){
				m.hgetall('game:#'+ret[i])
				.zcount('game:#'+ret[i]+'#rooms', now-5000, now);
			}
			m.exec(function(err,ret){
				//console.log(err, ret);
				if(err) { func(500, 'db err'); return; }
				var list = [];
				for(var i=0, len=ret.length; i<len; i+=2) {
					var game = ret[i];
					game.rooms = ret[i+1];
					list.push( game );
				}
				cache['game:all'] = list;
				cache['t_game:all'] = now;
				func(0, list);
			});
		});
	}
};

Gamer.prototype.onGamer_rooms = function(req, func) {
	var db = this.server.db;
	if(! db) { func(500,'db err'); return; }
	
	var gametype = req.args;
	
	var now = Date.now();
	if(! db.cache) db.cache = {};
	var cache = db.cache;
	
	var rooms_key = 'game:#'+gametype+'#rooms';
	var list = cache[rooms_key];
	var timestamp = cache['t_'+rooms_key];
	if(list && timestamp && (now < timestamp +1000)) {
		func(null, list);
		
	} else {
		db.zrange(rooms_key, 0, -1, function(err,ret){
			if(err) { func(500, 'db err'); return; }
			if(! ret) { func(404, 'not found'); return; }
			
			var m = db.multi();
			for(var i=0, len=ret.length; i<len; i++){
				m.hgetall('room:#' + ret[i]);
			}
			m.exec(function(err,list){
				if(err) return;
				cache[rooms_key] = list;
				cache['t_'+rooms_key] = now;
				func(0, list);
			});
		});
	}
};
Gamer.prototype.onGamer_JoinRoom = function (req, func) {

	console.log('=======>JOIN ROOM<======', {req, func})
	var gamer = this;
	if(gamer.room) {
		func(400, 'already in room');
		return;
	}
	if(gamer.profile.coins < 5000) {
		func(400, 'you can take 5000 Btamin');
		return;
	}
	console.log('req', req)
	var gametype = req.args;
	
	var db = this.server.db;
	var rooms_key = 'game:#' + gametype + '#rooms_notfull';
	db.zrange(rooms_key, 0, -1, function(err,ret){
		if(err) { func(500, 'db err'); return; }
		if(ret && ret.length>0) {
			var room_key = 'room:#' + req.roomid;
			gamer.room = req.roomid;
			gamer.socket.join(room_key);
			console.log('roomid',req.roomid);
			gamer.server.pub.publish(room_key, JSON.stringify({
				f: 'enter',
				uid: gamer.uid, 
				seq: req.seq,
				args: req.roomid
			}));

		} else {
			func(404, 'all full'); 
		}
		
	});

}
Gamer.prototype.onGamer_entergame = function(req, func) {
	console.log('req---------------', req)
	var gamer = this;
	var gametype = req.args;
	var db = this.server.db;
	//add new
	var uid_key = 'user:#' + gamer.uid;
	var joinGame = false;
	// if(gamer.room) {
	// 	func(400, 'already in room');
	// 	return;
	// }

	console.log('gamer.room', gamer.room);
	
	db.hgetall(uid_key, async function(err,userinfo){
		if(err) { 
			socket.emit('rpc_ret', { seq: req.seq, err:500, ret:'db err' });  
			return; 
		}
	
		if(gamer.profile.coins < 10000) {
			func(400, 'You must take 10000 Btamin'); return;
		}

		/////////////////////////////
		// var rooms_key = 'game:#' + gametype + '#rooms_notfull';
		// db.zrange(rooms_key, 0, -1, function(err,ret){
		// 	if(err) { func(500, 'db err'); return; }
		// 	if(ret && ret.length>0) {
		// 		var roomid = ret[0];
		// 		var room_key = 'room:#' + roomid;
		// 		gamer.room = roomid;
		// 		try{
		// 			gamer.socket.join(room_key);	
		// 		}
		// 		catch(e){
		// 			console.log(e);
		// 			func(404, 'all full'); 
		// 		}
		// 		console.log('gamer.socket',gamer.socket);
		// 		gamer.server.pub.publish(room_key, JSON.stringify({
		// 			f: 'enter',
		// 			uid: gamer.uid, 
		// 			seq: req.seq,
		// 			args: roomid
		// 		}));

		// 	} else {
		// 		func(404, 'all full'); 
		// 	}
			
		// });
		////////////////////////

		var rooms_key = 'game:#' + gametype + '#rooms_notfull';
		console.log('rooms_key=============', rooms_key)
		// var room_key, roomid;
		
		var roomid = 2;
		var room_key = 'room:#' + roomid;
		gamer.room = roomid;
		
		console.log('_______room_key_______', room_key);
		setTimeout(() => {
			db.hgetall(room_key, function(err, ret) {
				console.log('err, ret', {err, ret});
				if(ret && ret.gamers_count >= '6'){
					func(400, 'Room is full! Please come back later'); return;
				}else{
					try{
						gamer.socket.join(room_key);	
					}
					catch(e){
						console.log(e);
						return func(404, 'all full'); 
					}
					console.log('uid: gamer.uid', {uid: gamer.uid, seq: req.seq, args: roomid});
					console.log('gamer.server.pub', gamer.server.pub.publish)
					gamer.server.pub.publish(room_key, JSON.stringify({
						f: 'enter',
						uid: gamer.uid, 
						seq: req.seq,
						args: roomid
					}));
				}
			});
		},500);
		
	});
	
	

};

Gamer.prototype.onGamer_enter = function(req, func) {
	var gamer = this;
	
	if(gamer.room) {
		func(400, 'already in room');
		return;
	}
	
	var roomid = req.args;
	
	var db = this.server.db;
	var room_key = 'room:#' + roomid;
	db.hgetall(room_key, function(err,roominfo){
		console.log('roominfo', roominfo)
		if (err) {
			func(500, 'db err');
			return;
		}
		if(roominfo) {
			gamer.room = roomid;
			gamer.socket.join(room_key);
			gamer.server.pub.publish(room_key, JSON.stringify({
				f: 'enter',
				uid: gamer.uid, 
				seq: req.seq,
				args: roomid
			}));
			
		} else {
			func(404, 'room ' + roomid + ' not found');
		}
		
	});
};
//add 17/2
Gamer.prototype.onGamer_listFriend = async function(req, func) {
	var gamer = this;
	
	if(!gamer.room) {
		func(400, 'Not in room');
		return;
	}
	let data = [];
	data = await userService.getFriendList({uid : gamer.uid});
	if(data.status === true) {
		data = data.data.map(item => {
			item.roomId = gamer.room;
			return item;
		});
	}
	gamer.notify('listFriend', {
		data: data
	});
}
Gamer.prototype.onGamer_invite = async function( req, func) {
	var gamer = this;
	if(!gamer.room) {
		func(400, 'Not in room');
		return;
	}
	console.log('gamer.room', req)
	if(req.args[0].online === 2 || req.args[0].online == 0) {
		func(400, 'Sorry, My friend being offline or in the Game');
		return;
	}
	const check = await userService.checkUserInviteJoomRoom({uid : req.args[0].uid, online : req.args[0].online});
	if(check.status){
		gamer.server.pub.publish('user:#' + req.args[0].uid, JSON.stringify({
			f: 'invite',
			err: 0,
			ret: {
				roomId : req.args[0].roomId, 
				senderId : req.uid,
				type : req.type
			}
		}));		
	}
}


Gamer.prototype.onGamer_leave = function(req, func) {
	console.log('----->>onGamer_leave<<-------')
	var gamer = this;
	//leave game but until user online
	const updateOnlineOfUser = userService.handleOnlineAndOffline({uid : gamer.uid, stt : 1});
	
	var roomid = gamer.room;
	console.log('roomid', roomid)
	if(! roomid) {
		func(400, 'not in room');
		return;
	}
	
	var room_key = 'room:#' + roomid;
	// console.log('gamer.server', gamer.server)
	gamer.server.pub.publish(room_key, JSON.stringify({
		f:'leave',
		uid: gamer.uid,
		seq: req.seq,
		args: null
	}));
	gamer.room = null;
	gamer.socket.leave(room_key);
	
	gamer.onGamer_games(0, function(err,ret){
		if(! err) {
			var args = [];
			for(var i in ret) {
				args.push(ret[i].id);
			}
			gamer.notify('prompt', {
				entergame: args
			});
		}
	});
};

Gamer.prototype.onGamer_shout = function shout( msg, func ) {
	var gamer = this;
	
	gamer.server.io.emit('notify', {
		uid: null,
		e: 'shout',
		args: {
			who: {
				uid: gamer.uid,
				name: gamer.profile.name
			},
			msg: msg
		}
	});
};

Gamer.prototype.onMessage = function(message) {
	var socket = this.socket;
	if(! socket) return;
	try {
		var req = JSON.parse(message);
		if(req && (typeof req === 'object')) {
			switch(req.f) {
			case 'response':
				delete req.f;
				socket.emit('rpc_ret', req);
				break;
			case 'event':
				delete req.f;
				socket.emit('notify', req);
				break;
			case 'login':
				if((req.uid == this.uid) && (req.args != this.pin)) {
					this.notify('bye', 'replaced by another login');
				}
				break;
			case 'refresh':
				var gamer = this;
				gamer.refresh( function(err,ret) {
					gamer.server.pub.publish('user:log', 'user (' + gamer.uid + ') refresh data');
					if(gamer.room) {
						var room_key = 'room:#' + gamer.room;
						gamer.server.pub.publish(room_key, JSON.stringify({
							f: 'refresh',
							uid: gamer.uid, 
							seq: 0,
							args: 0
						}));
					} else {
						gamer.notify('refresh', {
							uid: gamer.uid,
							profile: gamer.getProfile()
						});
					}
				});
				break;
			//add_new
			case 'leave' :
				console.log('leave____________________________________________');
				var gamer = this;
				console.log('gamer.uid______', gamer.uid)
				gamer.onGamer_leave(0, function(err, ret){});
				break;
			//add_new
			case 'invite' :
				delete req.f;
				socket.emit('INVITE-FRIEND-JOIN-ROOM', req);
				break;
			}
		}
	} catch( err ) {
		console.log(err);
	}
};


