var Gamer = require('./gamer'),
	Room = require('./room'),
	Poker = require('./poker'),
	Holdem = require('./holdem_poker');
const userService = require('../containers/service/userService.js');
const blocksCasino = require('../containers/service/blocksCasinoService');
var _ = require('lodash');
var uuid = require('uuid');

var ls = require('local-storage');
exports = module.exports = HoldemGame;

var GAME_OVER = 0,
	SMALL_BLIND = 1,
	BIG_BLIND = 2,
	PREFLOP = 3,
	FLOP = 4,
	TURN = 5,
	RIVER = 6,
	SHOWDOWN = 7;

var LIMIT = 0,
	POT_LIMIT = 1,
	NO_LIMIT = 2;
	
var STATE = {
	0: 'gameover',
	1: 'ready',
	2: 'binds',
	3: 'preflop',
	4: 'flop',
	5: 'turn',
	6: 'river',
	7: 'showdown'
};
//contructor holdemGame include param ( casino, typeid, roomid, options)
function HoldemGame( casino, typeid, roomid, options ) {
	var defaults = {
		max_seats: 6,
		no_joker: true,
		no_color: [],
		no_number: [],
		ready_countdown: 10,
		turn_countdown: 10,
		limit_rule: 0,		// 0: limit, 1: pot limit, 2: no limit
		limit: 100,			// big blind
		limit_cap: 200,		// -1, means no limit
	};
	if(options && (typeof options === 'object')) {
		for(var i in options) defaults[i] = options[i];
	}
	
	Room.call(this, casino, typeid, roomid, defaults);
	
	this.raise_per_round = (this.options.limit_rule === LIMIT) ? 3 : -1;
	this.raise_counter = 0;
	
	this.ready_gamers = 0;
	this.ready_countdown = -1;
	
	this.is_ingame = false;
	this.state = GAME_OVER;
	this.dealer_seat = 0;
	this.big_blind = this.options.limit;
	this.bettingMax = this.options.bettingMax;
	
	this.in_gamers = [];
	this.turn_countdown = -1;
	
	this.deal_order = [];
	this.cards = {};
	this.shared_cards = [];
	
	this.chips = {};
	//add_new_23
	this.listCoins = {};
	
	this.pot_chips = [];
	this.pot = 0;
	this.max_chip = 0;
	this.last_raise = 0;
	this.no_raise_counter = 0;
	//add new
	this.waitingStart = false;
	this.moreWinner = false;
	this.listFold = [];
}

HoldemGame.LIMIT = LIMIT;
HoldemGame.POT_LIMIT = POT_LIMIT;
HoldemGame.NO_LIMIT = NO_LIMIT;

HoldemGame.prototype = Object.create(Room.prototype);

HoldemGame.prototype.constructor = HoldemGame;
//holdeGamer details return client that's client show room data;
HoldemGame.prototype.details = function() {
	var data = Room.prototype.details.call(this);

	data.cards = this.cards;
	data.chips = this.chips;
	data.listCoins = this.listCoins;
	
	data.dealer_seat = this.dealer_seat;

	data.shared_cards = this.shared_cards;
	data.pot = this.pot;
	data.pot_chips = this.pot_chips;
	data.max_chip = this.max_chip;
	data.last_raise = this.last_raise;
	
	return data;
};
// timer => reduplicate time 1s
HoldemGame.prototype.tick = function() {
	Room.prototype.tick.call(this);

	var room = this;
	if(room.is_ingame) {
		var gamer = room.in_gamers[0];
		if(room.turn_countdown > 0) {
			room.notifyAll('countdown', {
				seat: gamer.seat,
				sec: room.turn_countdown
			});
			room.turn_countdown --;
			
		} else if(room.turn_countdown === 0) {
			// TODO: for test only
			//Add new
			var gamers = room.gamers;
			
			var call_chip = (room.max_chip - gamer.chips);
			var raise_max = gamer.profile.coins - call_chip;
			//gamer auto leave room.
			
			// auto leave when player have coins = 0 or player fold = 3.
			if(call_chip > 0 && (gamer.profile.coins !== 0)) {
				gamer.fold ++;
				if(gamer.fold === 3) {
					room.autoLeave(gamer.uid,'leave','' );
				}
				else {
					room.gamerGiveUp( gamers[gamer.uid] );
					room.pub.publish('user:#' + gamer.uid, JSON.stringify({
						f : 'event',
						uid : gamer.uid,
						e : 'prompt',
						args : {leave: true}
					}))
				}
			} else {
				//when timer count = 0 that player not click(betting) into button(call,raise) => auto click button check
				room.no_raise_counter ++;
				room.notifyAll('check', {
					seat: gamer.seat,
					uid: gamer.uid,
					call: 0,
					raise: 0
				});
				//move turn next player;
				room.gamerMoveTurn(true);
			}
			
		} else {
			// console.log('not started, just wait')
		}
		
	} else {
		var listUser = _.keys(room.gamers);
		
		if(room.ready_countdown > 0) {
			room.notifyAll('countdown', {
				seat: -1,
				sec: room.ready_countdown
			});
			room.ready_countdown --;
			
		} else if(room.ready_countdown === 0) {
			// check amount player ready on the room => start Game.
			if(listUser.length >= 2) {
				room.gameStart();
			}
			else if (listUser.length === 1){
				room.ready_countdown = -1;
				var gamer = room.gamers[ listUser[0] ];
				gamer.is_ready = true;
				room.pub.publish('room:#'+ room.id, JSON.stringify(
					{ 
						uid: listUser[0], 
						f: 'ready', 
						args: '0' 
					}
				));
			}
			//when the room have not player. => reset room
			else{
				room.ready_countdown = -1;
				room.in_gamers = [];
				room.is_ingame = false;
				room.turn_countdown = -1;
				room.deal_order = [];
				room.cards = {};
				room.chips = {};
				room.listCoins = {};
				room.notifyAll('updateListCoins', {
					ListCoins: room.listCoins
				})
				room.pot_chips = [];
				room.pot = 0;
				room.max_chip = 0;
				room.last_raise = 0;
				room.ready_gamers = 0;
			}
			
		} else {
			// not ready, just wait
		}
	}
};
// constructor start game =>
HoldemGame.prototype.gameStart = function() {
	var room = this;
	var seats = room.seats;
	var gamers = room.gamers;
	
	room.is_ingame = true;
	room.ready_countdown = -1;
	room.big_blind = room.options.limit;
	
	room.shared_cards = [];
	room.cards = {};
	room.chips = {};
	//add_new_23
	room.listCoins = {};
	room.notifyAll('updateListCoins', {
		ListCoins: room.listCoins
	});

	room.pot_chips = [];
	room.pot = 0;
	room.max_chip = 0;
	room.last_raise = room.big_blind;
	room.raise_counter = 0;
	room.no_raise_counter = 0;

	var i, j, uid, gamer, first = room.dealer_seat;
	var in_gamers = room.in_gamers = [];
	//push gamer to property room.in_gamers 
	for(i=first; i<seats.length; i++) {
		uid = seats[i];
		if(uid) {
			gamer = gamers[ uid ];
			if(gamer.is_ready) {
				in_gamers.push( gamer );
			}
		}
	}
	for(i=0; i<first; i++) {
		uid = seats[i];
		if(uid) {
			gamer = gamers[ uid ];
			if(gamer.is_ready) {
				in_gamers.push( gamer );
			}
		}
	}
	
	var deal_order = room.deal_order = [];
	var in_seats = [];
	for(j=0; j<in_gamers.length; j++) {
		gamer = in_gamers[j];
		
		room.ready_gamers --;
		gamer.is_ready = false;
		gamer.is_ingame = true;
		gamer.is_cardseen = false;
		gamer.is_allin = false;
		gamer.cards = [];
		gamer.chips = 0;
		gamer.prize = 0;
		
		deal_order.push( gamer );
		in_seats.push( gamer.seat );
	}
	room.ingamers_count = in_gamers.length;
	
	if(in_gamers.length > 2) in_gamers.push( in_gamers.shift() );
	// else: 1 vs 1 -- heads up

	//old code

	// // small blind
	// var small = in_gamers.shift();
	// in_gamers.push( small );
	
	// gamer = small;
	// var n = Math.round( room.big_blind * 0.5 );
	// console.log('gamer.profile.coins----- gamerStart',gamer.profile.coins)
	// gamer.profile.coins -= n;
	// gamer.chips += n;
	// room.chips[ gamer.seat ] = gamer.chips;
	// room.pot_chips.push(n);
	// room.pot += n;
	// room.max_chip = n;
	
	// // big blind
	// var big = in_gamers.shift();
	// in_gamers.push( big );
	
	// gamer = big;
	// n = room.big_blind;

	// gamer.profile.coins -= n;
	// gamer.chips += n;
	// room.chips[ gamer.seat ] = gamer.chips;
	// room.pot_chips.push(n);
	// room.pot += n;
	// room.max_chip = n;

	//substract money on the room
	in_gamers.map(itemGamer => {
		n = room.big_blind;
		itemGamer.profile.coins -= n;
		room.notify(itemGamer.profile.uid, 'stakeGameStartPoker', {money : n});
		itemGamer.chips += n;
		room.chips[ itemGamer.seat ] = itemGamer.chips;
		//add_new_23
		room.listCoins[ itemGamer.seat ] = itemGamer.profile.coins;
		room.pot_chips.push(n);
		room.pot += n;
		room.max_chip = n;

		return;
	});

	// end add
	//return room details to client.
	room.notifyAll('gamestart', {
		room: room.details(),
		seats: in_seats
	});
	//Update coins of player on the room.
	room.notifyAll('updateListCoins', {
		ListCoins: room.listCoins
	});

	// deal hole cards
	var fullcards = room.fullcards = Poker.newSet(room.options);
	var roomcards = room.cards = {};
	var deals = [];
	//draw poker for each one in the Room.
	for(i=0; i<deal_order.length; i++) {
		gamer = deal_order[i];
		if(gamer.is_ingame) {
			gamer.cards = Poker.sortByNumber( Poker.draw(fullcards, 2) );
			roomcards[ gamer.seat ] = [0,0];
			deals.push([ gamer.seat, [0,0] ]);
		}
	}
	room.notifyAll('deal', {
		deals: deals,
		delay: 3
	});
	
	for(i=0; i<deal_order.length; i++) {
		gamer = deal_order[i];
		if(gamer.is_ingame) {
			room.notify(gamer.uid, 'seecard', {
				seat: gamer.seat,
				uid: gamer.uid,
				cards: gamer.cards
			});
		}
	}
	
	setTimeout(function(){
		// draw three poker show to SharedCards
		room.state = PREFLOP;
		room.gamerMoveTurn(false);
		
	}, 3000);
	
};

HoldemGame.prototype.dealSharedCards = function(n) {
	var room = this;
	
	var cards = Poker.draw(room.fullcards, n);
	room.shared_cards = Poker.merge(room.shared_cards, cards);

	var deals = [];
	deals.push([-1, cards]);
	
	room.notifyAll('deal', {
		deals: deals,
		delay: 1
	});
};
//add new 7/2/2020
//function count time 10s and auto restart game
function timingLeaveAndRestart(room,time){
	// console.log("timing =>>>> waiting", time);
	if(time === 0){
		//clear all cache
		ls.clear();
		var listUserOnRoom = [];
		for(uid in room.gamers){
			var gamer = room.gamers[ uid ];
			gamer.is_ready = false;
			if(gamer.profile.coins > 1000) {
				listUserOnRoom.push(uid);
			}
			else{
				// console.log("==============>GO OUT => Because You must take 1000 Btamin");
				room.autoLeave(gamer.uid,'leave','');
			}
		}


		// console.log('==========> RESTART GAME <==============');
		room.is_ingame = false;
		room.shared_cards = [];
		room.ready_gamers = 0;
		room.waitingStart = false;
		room.notifyAll('restartGame', '');
		
		// console.log('listUserOnRoom timingLeaveAndRestart',listUserOnRoom);
		if(listUserOnRoom.length !== 0){
			room.enableButtonLeaveOnRoom('prompt',{leave: null}, listUserOnRoom);
			listUserOnRoom.map(itemId => {
				room.pub.publish('room:#'+ room.id, JSON.stringify(
					{ 
						uid: itemId, 
						f: 'ready', 
						args: '0' 
					}
				));
			})
		}
	} else {
		setTimeout(() => {
			time--;
			room.notifyAll('countdown', {
				seat: -1,
				sec: time
			});
			timingLeaveAndRestart(room,time);
		}, 1000)
	}
}
// waitting timer that's show button leave => after restartGame
HoldemGame.prototype.timingLeaveRoomAndRestartGame = function(time) {
	var room = this;
	room.moreWinner = false;
	timingLeaveAndRestart(room, time);
	
	var listUser = _.keys(room.gamers);
	// hide all button leave on client-side
	room.enableButtonLeaveOnRoom('prompt',{leave: null}, listUser);
	setTimeout(()=> {
		// show all button leave on client-side
		room.enableButtonLeaveOnRoom('prompt',{leave: true}, listUser);
	},1000)

}
//handle gameOVer *** => caculation money
HoldemGame.prototype.gameOver = function() {
	var room = this;
	var in_gamers = room.in_gamers, i, gamer, item, scorelist = [];
	var listLose = [], surplus= 0, listBettingInGame = [], stateOnlyOne = true;
	var nameCardOfWinner, cardWinner;

	//save block
	var inGamers = in_gamers.map(item => {
		const ret = {
			uid: item.uid,
		    chips: item.chips,
		    cards : item.cards
		}
		return ret;
	})
	//get user win in match
	gamerWin = in_gamers.map(item => {
		if(item.prize > 0) return item;
		return null;
	}).filter(item => item);

	var param = {
		roomId : room.id,
		in_gamers : inGamers,
		Winner : gamerWin[0].uid,
		status : "endGame",
		type : 'poker',
		matchId :uuid.v4(),
		pot : room.pot
	}
	//save BlocksCa
	const saveData = blocksCasino.createBlocksCasino(param);

	for(i=0; i<in_gamers.length; i++) {
		gamer = in_gamers[i];
		gamer.is_ingame = false;
		console.log('gamer.prize==================>', gamer.prize)
		if(gamer.prize === 0) {
			listLose.push(gamer)
		}
	}

	for(i=0; i<in_gamers.length; i++) {
		gamer = in_gamers[i];
		//state only one validate when have more winner
		if(gamer.prize > 0 && stateOnlyOne) {
			listLose.map(item => {
				if( (item.chips > gamer.chips ) && !room.listFold.includes(item.uid) ){
					item.chips -= gamer.chips;
					item.profile.coins += item.chips;
					if(item.chips >= 0 && item.profile.uid){
						userService.TxCreateRewardPoker({ amount : item.chips, userId : item.profile.uid }).then(result=> {
							// console.log('loser =====>==========================>function Gameover', result)
						})
					}
					listBettingInGame.push({uid : item.profile.uid, coins : gamer.chips});
					surplus += item.chips;
					item.saveData();
				}
				else{
					if(item.chips > gamer.chips){
						surplus += (item.chips - gamer.chips);
					}
					listBettingInGame.push({uid : item.profile.uid, coins : item.chips});
				}
			});
			stateOnlyOne = false;
		}
	}

	for(i=0; i<in_gamers.length; i++) {
		gamer = in_gamers[i];
		if(gamer.prize > 0) {
			gamer.profile.exp += 2;
			gamer.profile.score ++;

			const percentReceive = (100 - parseInt(gamer.profile.gameFeeIdxMS)/10)/100;
			// console.log('================================>>>gamer.profile.gameFeeIdxMS=====================================>>>>', gamer.profile.gameFeeIdxMS)
			gamer.profile.coins = gamer.profile.coins + (gamer.prize-surplus)*percentReceive;
			console.log('=============>>>gamer.profile.coins winner=======================>>>>', {coins : gamer.profile.coins, prize : gamer.prize, surplus : surplus})
			//socket.emit to uid(winner) => get uid token.
			room.notify(gamer.profile.uid, 'sendMoneyToWinner', {money : (gamer.prize-surplus), nameGame : 'poker'});
			
			// console.log('SAVE DATA')
			if(gamer.cards.length == 2 && room.shared_cards.length ==5){
				const maxcards = Holdem.maxFive(gamer.cards, room.shared_cards);
				// nameCardOfWinner = Holdem.patternString(maxcards);
				nameCardOfWinner = Holdem.patternString(maxcards);
				cardWinner = Poker.visualize(maxcards);
				// console.log('nameCardOfWinner ====================',nameCardOfWinner, cardWinner)
			}
			listBettingInGame.push({uid : gamer.profile.uid, coins : gamer.prize-surplus});
			gamer.saveData();
			//add new
			// socket.emit to => winner
			room.notifyWinner(gamer.uid, 'Win', {listBettingInGame : listBettingInGame, moreWinner : room.moreWinner}); //uid, event, args
		}
		
		item = gamer.getProfile();
		item.seat = gamer.seat;
		item.cards = gamer.cards;
		item.chips = gamer.chips;
		item.prize = gamer.prize;
		// rise experien for user play game.
		userService.handleRiseExperien({id : gamer.uid, exp : gamer.chips}).then(result => {
			console.log('handleRiseExperien =====> ============================>', result)
		});
		//update gameFeeIdxMS for user
		(async()=> {
			const getExperienUser = await userService.getExperienUser({id : gamer.uid});
			if(getExperienUser && getExperienUser.status){
				var user_record = {
					uid: gamer.uid,
					name: gamer.uid,
					uuid: gamer.uid,
					phone: 0,
					email: '',
					phone_validated: 0,
					email_validated: 0,
					avatar: '',
					last_login: 0,
					coins: gamer.profile.coins,
					score: 0,
					level: 0,
					exp: getExperienUser.data.exp,
					rank: getExperienUser.data.rank,
					gameFeeIdxMS : getExperienUser.data.gameFeeIdxMS
				};
				gamer.setProfile( user_record );
			}
		})();

		
		scorelist.push(item);
	}
	// console.log('scorelist',scorelist);
	
	if(nameCardOfWinner && cardWinner ){
		if(room.moreWinner){
			room.notifyAll('showNameCardWinner', {nameCardOfWinner :"Draw: " + nameCardOfWinner, cardWinner : cardWinner});
		}
		else{
			room.notifyAll('showNameCardWinner', {nameCardOfWinner : nameCardOfWinner, cardWinner : cardWinner});
		}
		
	}
	
	room.notifyAll('gameover', scorelist);
	room.notifyAll('gamesUpdateMoney', scorelist);
	
	//add new and prevent button ready
	const params = {
		fold: null,
		check: null,
		call: null,
		raise: null,
		all_in: null,
		leave: null
	};

	//add new
	var listUser= [];
	for(i=0; i<in_gamers.length; i++) {
		gamer = in_gamers[i];
		item = gamer.getProfile();
		listUser.push(item);
	}
	
	//hide all button leave on client-side
	setTimeout(()=> {
		room.notifyUserId('prompt',params, listUser);
	},500);

	room.turn_countdown = -1;
	room.listFold = [];
	room.ingamers_count = 0;
	
	// for next round, move deal seat to next
	room.dealer_seat = room.deal_order[0].seat;
	
	room.deal_order = [];
	room.cards = {};
	room.chips = {};

	room.listCoins = {};
	room.notifyAll('updateListCoins', {
		ListCoins: room.listCoins
	});

	room.pot_chips = [];
	room.pot = 0;
	room.max_chip = 0;
	room.last_raise = 0;
	//add new
	room.ready_gamers = 0;
	
// ==========> WAITING FOR USER 10s ======> SHOW RESULT <========
	//show btn leave
	room.timingLeaveRoomAndRestartGame(room.options.show_result);
	
};
//return cmds for client-side
HoldemGame.prototype.cmdsForGamer = function(gamer) {
	var room = this;
	var limit_rule = room.options.limit_rule;
	
	var cmds = {};
	const listUser = _.keys(room.gamers);
	//check listUser in the room.
	if(listUser.length === 1){
		return cmds;
	}
	switch(room.state) {
	case PREFLOP:
	case FLOP:
	case TURN:
	// case RIVER:
	// 	cmds.fold = true;
	// 	var call_chip = (room.max_chip - gamer.chips);
	// 	var raise_max = gamer.profile.coins - call_chip;
	// 	if(call_chip > 0) {
	// 		if(raise_max >= 0) cmds.call = true;
	// 	} 
	// 	else {
	// 		cmds.check = true;
	// 	}

	// 	// if(raise_max >= room.last_raise) { //old
	// 	if(raise_max >= room.big_blind) {	//new
	// 		if(limit_rule === POT_LIMIT) {
	// 			//add code
	// 			var uid_key = 'userId:#' + gamer.uid;
	// 			if(ls.get(uid_key) === null){
	// 				ls.set(uid_key, 'raise');
	// 				// cmds.raise = 'range,' + room.last_raise + ',' + raise_max; //old
	// 				// console.log('room.last_raise ',room.last_raise );
	// 				cmds.raise = 'range,' + room.big_blind + ',' + raise_max; // new
	// 			}
	// 			else{
	// 				ls.remove(uid_key);
	// 			}
	// 			//old
	// 			// raise_max = Math.min(raise_max, room.pot + call_chip);
	// 			// cmds.raise = 'range,' + room.last_raise + ',' + raise_max;
	// 		} else if(limit_rule === NO_LIMIT) {
	// 			cmds.raise = 'range,' + room.last_raise + ',' + raise_max;
				
	// 		} else if(limit_rule === LIMIT) {
	// 			var allow_raise = ((room.raise_per_round > 0) && (room.raise_counter < room.raise_per_round));
	// 			switch(room.state) {
	// 			case PREFLOP:
	// 			case FLOP:
	// 				if(allow_raise) {
	// 					cmds.raise = [ room.big_blind ]; // small bet
	// 				}
	// 				break;
	// 			case TURN:
	// 			case RIVER:
	// 				if(allow_raise) {
	// 					cmds.raise = [ room.big_blind * 2 ]; // big bet
	// 				}
	// 				break;
	// 			}
	// 		}
	// 	}
	// 	//add new
	// 	else{
	// 		if(limit_rule === POT_LIMIT) {
	// 			if((gamer.profile.coins > 0) && (!cmds.call || cmds.call === false) && cmds.check !== true) cmds.call = true;
	// 			else{
	// 				if(cmds && cmds.call && cmds.call !== true) {
	// 					cmds.check = true;
	// 				}
	// 			}
	// 		}
	// 	}
		
	// 	if(limit_rule === NO_LIMIT) {
	// 		if(gamer.profile.coins > 0) cmds.all_in = true;
	// 	}
		
	// 	break;
	// }
	// if(cmds && cmds.check !== true && cmds.call !== true && cmds.raise !== true) {
	// 	cmds.check = true;
	// }
	case RIVER:
		cmds.fold = true;
		if(gamer.profile.coins >= room.bettingMax){

			console.log('==============NEW CODE <=============');

			call_chip = (room.max_chip - gamer.chips);
			raise_max = room.bettingMax - call_chip;

			// console.log('call_chip ', call_chip)
			// console.log('raise_max ', raise_max)

			if(call_chip > 0) {
				if(raise_max >= 0) cmds.call = true;
			} 
			else {
				cmds.check = true;
			}

			if(raise_max < room.big_blind || raise_max == 0  || call_chip == room.bettingMax) {
				if((gamer.profile.coins > room.big_blind) && (!cmds.call || cmds.call === false) && cmds.check !== true) cmds.call = true;
				else{
					if(cmds && cmds.call && cmds.call !== true) {
						cmds.check = true;
					}
				}
			}
			else{
				var uid_key = 'userId:#' + gamer.uid;
				if(ls.get(uid_key) === null && call_chip != room.bettingMax){
					ls.set(uid_key, 'raise');
					cmds.raise = 'range,' + room.big_blind + ',' + raise_max; // new
				}
				else{
					ls.remove(uid_key);
				}
			}
		}
		else{
			console.log('=========================> ODD CODE');

			call_chip = (room.max_chip - gamer.chips);
			raise_max = gamer.profile.coins - call_chip;
			if(call_chip > 0) {
				if(raise_max >= 0) cmds.call = true;
			} 
			else {
				cmds.check = true;
			}
			if(raise_max >= room.big_blind) {	//new

				if(limit_rule === POT_LIMIT) {
					//add code
					var uid_key = 'userId:#' + gamer.uid;
					if(ls.get(uid_key) === null && call_chip != room.bettingMax){
						ls.set(uid_key, 'raise');
						cmds.raise = 'range,' + room.big_blind + ',' + raise_max; // new
					}
					else{
						ls.remove(uid_key);
					}
					
				} 
				
			}
			//add new
			else{
				if(limit_rule === POT_LIMIT) {
					if((gamer.profile.coins > 0) && (!cmds.call || cmds.call === false) && cmds.check !== true) cmds.call = true;
					else{
						if(cmds && cmds.call && cmds.call !== true) {
							cmds.check = true;
						}
					}
				}
			}

			if(cmds && cmds.check !== true && cmds.call !== true && cmds.raise !== true) {
				cmds.check = true;
			}
			
			break;
		}
	}
	return cmds;
};
// move active betting on player other.
HoldemGame.prototype.moveTurnToNext = function() {
	console.log('moveTurnToNext')
	var room = this;
	var in_gamers = room.in_gamers;

	
	var last = in_gamers[0], next;
	//check in_gamers[0] off app when play game =>>> last = undefined
	if(typeof last === 'undefined') {
		console.log('last===============><================================in_gamers', in_gamers)
		const userOnGame = _.keys(room.gamers);
		if(userOnGame.length >=2) room.gamerMoveTurn(true);
		//add new 28/4
		else { return; }
	}
	else{
		room.notify(last.uid, 'prompt', {
			fold: null,
			check: null,
			call: null,
			raise: null,
			all_in: null
		}); 
		
		do {
			in_gamers.push( in_gamers.shift() );
			
			
			next = in_gamers[0];
			console.log("typeof next",typeof next);
			
			if(next.seat === room.first_turn) room.round_counter ++;
			console.log('2222========>')
			
			const data = _.keys(room.gamers);
			//check player that must have in the room. If Player not in the room => continue.
			if(next.seat === last.seat && data.includes(next)) break;
			console.log('3333========>')
			if(next.is_ingame) {
				if(next.is_allin) {
					room.no_raise_counter ++;
				} else {
					break;
				}
			}
			console.log('4444==========>')
			//these player turn off App or disconnect wifi. => Amount player = 1.
			if(data.length === 1) {
				break;
			}
			if(data.length === 0) {
				break;
			}
			
		} while(true);
	}
	
};
// draw poker or move turn to player other
HoldemGame.prototype.gamerMoveTurn = function(move) {
	var room = this;
	var in_gamers = room.in_gamers, deal_order = room.deal_order;
	
	if(move) room.moveTurnToNext();
	var deal_card = false;
	if(room.no_raise_counter === room.ingamers_count) {
		room.state ++;
		switch(room.state) {
		case FLOP:
			room.dealSharedCards(3);
			deal_card = true;
			ls.clear();
			break;
		case TURN:
			room.dealSharedCards(1);
			deal_card = true;
			ls.clear();
			break;
		case RIVER:
			room.dealSharedCards(1);
			for(i=0; i<room.deal_order.length; i++) {
				gamer = room.deal_order[i];
				const maxcards = Holdem.maxFive(gamer.cards, room.shared_cards);
				const nameFiveCard = Holdem.patternString(maxcards);
				// console.log('nameFiveCard ================', nameFiveCard);
				if(gamer.is_ingame) {
					room.notify(gamer.uid, 'seecard', {
						seat: gamer.seat,
						uid: gamer.uid,
						cards: gamer.cards,
						nameFiveCard : nameFiveCard
					});
				}
			}
			deal_card = true;
			ls.clear();
			break;
		}
		
		room.no_raise_counter = 0;
		room.raise_counter = 0;
		
		// after dealing, we start bet next round from the first
		for(var i=0; i<deal_order.length; i++) {
			in_gamers[i] = deal_order[i];
		}
		room.moveTurnToNext();
	}
	
	var gamer = in_gamers[0];
	if(typeof gamer !== 'undefined') {
		room.turn_countdown = room.options.turn_countdown;
		room.notifyAll('moveturn', {
			seat: gamer.seat,
			uid: gamer.uid,
			countdown: room.turn_countdown
		});
			
		if(deal_card) {
			setTimeout(function(){
				room.notify(gamer.uid, 'prompt', room.cmdsForGamer(gamer) );
			}, 1000);
			
		} else {
			if(room.state < SHOWDOWN) {
				room.notify(gamer.uid, 'prompt', room.cmdsForGamer(gamer) );
			} else {
				// console.log('GAMER SHOW DOWN')
				room.gamerShowDown();
			}
		}

	}
	
	
};
// handle player fold => give up
HoldemGame.prototype.gamerGiveUp = function( gamer ) {
	var room = this;
	var in_gamers = room.in_gamers;
	
	room.notifyAll('fold', {
		seat: gamer.seat,
		uid: gamer.uid
	});
	//add Gamer give up into list
	room.listFold.push(gamer.profile.uid)
	
	gamer.is_ingame = false;
	room.ingamers_count --;
	
	gamer.profile.exp ++;
	//gamer.profile.score --;
	gamer.saveData();
	
	room.notify(gamer.uid, 'prompt', {
		fold: null,
		check: null,
		call: null,
		raise: null,
		all_in: null
	});
	
	if(room.ingamers_count === 1) {
		room.simpleWin();
		
	} else {
		var is_myturn = (gamer.seat === in_gamers[0].seat);
		if(is_myturn) room.gamerMoveTurn(true);
	}
};

HoldemGame.prototype.simpleWin = function() {
	var room = this, in_gamers = this.in_gamers;
	var prize = room.pot;
	
	// TODO: 
	/*
		var rake = Math.round( room.pot * room.options.rake_percent );
		if(room.options.rake_pot > 0) {
			if(room.pot < room.options.rake_pot) rake = 0;
		}
		if(room.options.rake_cap > 0) {
			if(rake > room.options.rake_cap) rake = room.options.rake_cap;
		}
		var prize = room.pot - rake;
	*/
	for(var i=0; i<in_gamers.length; i++) {
		var gamer = in_gamers[i];
		gamer.prize = 0;
		
		if(gamer.is_ingame) {
			gamer.prize = prize;
			
			gamer.is_ingame = false;
			room.ingamers_count --;

			break;
		}
	}
	setTimeout(() => {
		room.gameOver();
	},100);
};
//show down all poker when cardsTable = 5
HoldemGame.prototype.gamerShowDown = function() {
	var room = this;
	var in_gamers = room.in_gamers, finals = [], gamers_bychips = [];
	var i, gamer, maxFive, someone_allin = false;
	for(i=0; i<in_gamers.length; i++) {
		gamer = in_gamers[i];
		gamers_bychips.push( gamer );
		
		if(! gamer.is_ingame) continue;
		if(gamer.is_allin) someone_allin = true;
		
		maxFive = Holdem.maxFive(gamer.cards, room.shared_cards);
		// console.log('MaxFive -------------', maxFive);
		if(maxFive) {
			gamer.maxFiveRank = Holdem.rank( maxFive );
			// console.log('gamer.maxFiveRank=============',gamer.maxFiveRank)
			finals.push( gamer );
		}
	}
	// lấy người thắng có maxfiverank lớn nhất ở vị trí đầu trong mảng - find winner put at One on array
	finals.sort( function(a,b){ return b.maxFiveRank - a.maxFiveRank; } );
	if(someone_allin) {
		// if someone allin, the pot distribution will be complex
		/*
		 * 当有一或多个牌手全押时，德州扑克的彩池分配较为复杂，超过牌手押注金额的部份将会形成一或多个边池。
		 * 牌手参与投注该彩池才有机会于该彩池胜出分配奖金。 
		 * 
		 * 当一局结束而且有“全押”的牌手赢牌时，该牌手有参与投注的主池边池奖金均归该牌手。
		 * 而其他边池由参与该边池投注里，持有最大牌面的牌手赢得。
		 * 在几个牌手全押形成多个边池时，依全押的顺序分配给各边池中最佳牌面的牌手。
		 * 无人跟注的边池（仅有一位牌手下注，剩下其他牌手都盖牌）将会直接赢得该边池。
		 * 
		 * 彩池分配范例：
		 * 
		 * 例如ABCDEF六名牌手参与牌局，F于中途盖牌退出，最终A全押投入$50，B全押投入$250，C全押投入$350，
		 * DE各投入$800，F投入$500，此时总彩池大小为$2750，形成了一个主池为50*6=$300，
		 * 边池各为（250-50）*5=$1000，（350-250）*4=$400，（500-350）*3=$450，（800-500）*2=$600，
		 * 若最终组成牌面大小为F>A>B>D>E>C，但F已盖牌不能分配任何彩池，则此局主池即为A于此局赢得的筹码（$300），
		 * B可赢得第一个边池（$1000），D参与至最后一个边池，且牌面胜过参与第二、第三及第四边池的所有牌手，
		 * 因此可赢得剩下所有的边池（400+450+600=$1450）。
		 */
		gamers_bychips.sort( function(a,b) { return a.chips - b.chips; } );
		
	} else {
		// only keep the largest one, may be one, two, or more same big
		/* 
		 * 当没有牌手全押(all-in)时，彩池由未盖牌的牌手中牌型最大的者独得。
		 * 如多于一名牌手拥有最大的手牌，彩池会由他们平等均分。
		 * 不能平分的零头数筹码由发牌者后依顺时针方向，尚未盖牌的第一个牌手获得(即位置相对最不利者)。
		 * 
		 * 举例来说：
		 * 
		 * 有ABCDE依顺时钟方向入座，A为本局发牌者，最小面额筹码为$10，所有牌手皆未盖牌至斗牌，
		 * 最终由CDE胜出平分本局彩池$1000时，则DE各分到$330，而多出的$10将分配给最靠近A的赢家C，C于本局可分到$340。
		 */
		for(i=0; i<finals.length-1; i++) {
			if(finals[i].maxFiveRank > finals[i+1].maxFiveRank) {
				var losers = finals.splice(i+1, Number.MAX_VALUE);
				while(losers.length > 0) {
					var loser = losers.shift();
					loser.profile.exp ++;
					loser.saveData();
				}
				break;
			}
		}
		
		var prize = room.pot;
		var n = finals.length;
		// số người cùng thắng ->>> 
		if(n > 1) {
			room.moreWinner = true;
			var AllChipsOfWin = 0;
			var AllChipsOfLoser = 0;
			for(let i = 0 ; i < finals.length ; i ++ ){
				AllChipsOfWin = AllChipsOfWin + finals[i].chips;
			}
			AllChipsOfLoser = prize - AllChipsOfWin;
			console.log('AllChipsOfLoser======', AllChipsOfLoser);
			// console.log('AllChipsOfWin', AllChipsOfWin)
			// for(i=0; i<finals.length; i++) {
			// 	// console.log('(finals[i].chips)/AllChipsOfWin * prize', (finals[i].chips)/AllChipsOfWin * prize)
			// 	finals[i].prize = (finals[i].chips)/AllChipsOfWin * prize;
			// }

			for(i=0; i<finals.length; i++) {
				finals[i].prize = (finals[i].chips)/AllChipsOfWin * AllChipsOfLoser;
			}
			
			//old code 
			// var average = Math.floor( prize / n );
			// for(i=0; i<finals.length; i++) {
			// 	finals[i].prize = average;
			// }
			
			// var odd = prize % n;
			// if(odd > 0) {
			// 	// find the nearest winner after dealer seat
			// 	finals.sort( function(a,b){ return a.seat - b.seat; } );
			// 	var first_seat = finals[0].seat, dealer_seat = room.dealer_seat;
			// 	do {
			// 		gamer = finals.pop();
			// 		if(gamer.seat > dealer_seat) {
			// 			finals.unshift( gamer );
			// 		} else {
			// 			finals.push( gamer );
			// 			break;
			// 		}
			// 	} while (gamer.seat !== first_seat);
				
			// 	finals[0].prize += odd;
			// }
		} else {
			finals[0].prize = prize;
		}
	}
	
	room.gameOver();
};
//count timer and restartGame
function WaitingStartGame(room, time) {
	var listUser = _.keys(room.gamers);
	if(time === 0){
		room.waitingStart = true;
		//hide all button leave  in the client-side
		room.enableButtonLeaveOnRoom('prompt',{leave: null}, listUser);
	} else {
		setTimeout(() => {
			time--;
			WaitingStartGame(room,time);
		}, 1000)
	}
}
// Handle ready game for player.
HoldemGame.prototype.onGamer_ready = function(req, reply) {
	var room = this;
	var uid = req.uid;
	var gamer = room.gamers[ uid ];

	const updateInGameOfUser = userService.handleOnlineAndOffline({uid, stt : 2});
	
	if(typeof gamer === 'undefined') {
		console.log('typeof gamer === undefined ',room)
	}
	if(typeof gamer !== 'undefined') {
		if(gamer.profile.coins < 1000) {
			// room.notify(gamer.uid, 'prompt', {leave : true});
			reply(401, 'you must take 1000 Btamin'); return;
		}
		
		if(gamer.seat < 0) {
			room.autoLeave(gamer.uid,'leave','' );
			// room.notify(gamer.uid, 'prompt', {leave : true});
			reply(402, 'Room is full! Please come back later'); return;
		}
		if(room.is_ingame) {
			room.notify(gamer.uid, 'prompt', {leave : true});
			reply(400, 'game already started, wait next round'); return;
		}
		
		if(gamer.is_ready) {
			room.notify(gamer.uid, 'prompt', {leave : true});
			reply(400, 'already ready'); return;
		}
		
		gamer.is_ready = true;
		room.ready_gamers ++;
		
		room.notifyAll('ready', {
			uid: uid,
			where: gamer.seat
		});
		
		//add new 7/2
		if(room.ready_gamers === 1){
			this.pub.publish('user:#'+gamer.uid, JSON.stringify({
				f:'event',
				uid: uid,
				e: 'prompt',
				args: {leave : null}
			}));
			setTimeout(()=>{
				this.pub.publish('user:#'+gamer.uid, JSON.stringify({
					f:'event',
					uid: uid,
					e: 'prompt',
					args: {leave : true}
				}));
			},100);
		}
		if(room.ready_gamers === 2) {
			room.ready_countdown = room.options.ready_countdown;
			
			var listUser = _.keys(room.gamers);
			setTimeout(()=>{
				room.enableButtonLeaveOnRoom('prompt',{leave: null}, listUser);
			},100);
			setTimeout(()=>{
				room.enableButtonLeaveOnRoom('prompt',{leave: true}, listUser);
			},700);

			// ========>onGamer_Waiting<=========
			WaitingStartGame(room,room.options.show_leave_on_start);
		}
		if(room.ready_gamers > 2 && !room.waitingStart){
			room.notify(gamer.uid, 'prompt', {leave : true});
		}
	}
};
// handle take a seat when The match have just already.
HoldemGame.prototype.onGamer_takeseat = function(req, reply) {
	var room = this;

	var uid = req.uid;
	var gamer = room.gamers[ uid ];
	
	if(gamer.profile.coins < room.options.limit) {
		reply(400, 'no enough coins, need at least: ' + room.options.limit);
		return;
	}
	
	Room.prototype.onGamer_takeseat.call(this, req, function(err,ret){
		if(! err) {
			if(! ret.cmds) ret.cmds = {};
		}
		reply(err, ret);
	});
	
	room.pub.publish('room:#'+gamer.room.id, JSON.stringify(
		{ 
			uid: uid, 
			f: 'ready', 
			args: '0' 
		}
	));
};

HoldemGame.prototype.onGamer_unseat = function(req, reply) {
	var room = this;
	var uid = req.uid;
	var gamer = room.gamers[ uid ];

	var cmds = {};
	
	if(gamer.is_ingame) {
		room.onGamer_fold(req, function(e,r){
			if((!e) && r.cmds) {
				for(var i in r.cmds) cmds[i] = r.cmds[i];
			}
		});
	}

	if(gamer.is_ready) {
		gamer.is_ready = false;
		room.ready_gamers --;
	}
	
	cmds.ready = null;
	
	Room.prototype.onGamer_unseat.call(this, req, function(e,r){
		if((!e) && r.cmds) {
			for(var i in r.cmds) cmds[i] = r.cmds[i];
		}
	});
	
	reply(0, {
		cmds: cmds
	});
};
// hanlde event when player click button fold.
HoldemGame.prototype.onGamer_fold = function(req, reply) {
	var room = this, uid = req.uid;
	var gamers = room.gamers;
	var gamer = gamers[ uid ];
	gamer.fold = 0 ;
	if(! gamer.is_ingame) {
		reply(400, 'no in game'); return;
	}
	
	room.gamerGiveUp( gamer );
	
	//add new
	var cmds = {
		leave: true
	};

	var listUser= [];
	for(itemId in room.gamers){
		listUser.push(itemId)
	};
	
	if(listUser.length > 2 && gamer.fold !== 1) {
		reply(0, {
			cmds: cmds
		});
	}else {
		reply(0, {});
	}
	
};
// hanlde event when player click button check.
HoldemGame.prototype.onGamer_check = function(req, reply) {
	var room = this, uid = req.uid;
	var gamers = room.gamers;
	var gamer = gamers[ uid ];
	gamer.fold = 0 ;
	
	if(! gamer.is_ingame) {
		reply(400, 'no in game'); return;
	}
	
	var call_chip = room.max_chip - gamer.chips;
	
	room.no_raise_counter ++;
	
	room.notifyAll('check', {
		seat: gamer.seat,
		uid: gamer.uid,
		call: 0,
		raise: 0
	});
	
	reply(0, {});
	
	room.gamerMoveTurn(true);
	
};
// hanlde event when player click button call.
HoldemGame.prototype.onGamer_call = function(req, reply) {
	var room = this, uid = req.uid;
	var gamers = room.gamers;
	var gamer = gamers[ uid ];
	gamer.fold = 0 ;
	
	if(! gamer.is_ingame) {
		reply(400, 'no in game'); return;
	}
	
	var call_chip = room.max_chip - gamer.chips;
	var n = call_chip;

	
	
	(async()=> {
		//get btamin
		var checkBalance = await userService.userBalance({id : req.uid, token : req.token});
		console.log('checkBalanceCall_Game  Poker ============>>> ', checkBalance);
		room.no_raise_counter ++;
		var tmp;
		// if(checkBalance.status == false) {
		// 	reply(400, 'Invalid UserId'); return;
		// }
		// if(checkBalance.status && checkBalance.balance < 1000) {
		// 	reply(400, 'You must take 1000 Btamin'); return;
		// }
		
		if(checkBalance.balance > gamer.profile.coins){
			tmp = checkBalance.balance;
			gamer.profile.coins = checkBalance.balance;
			gamer.saveData();
		}
		else if(checkBalance.balance < gamer.profile.coins){
			tmp = gamer.profile.coins;
			gamer.profile.coins = checkBalance.balance;
			gamer.saveData();
		}
		else{
			tmp = gamer.profile.coins;
		}
		gamer.getProfile();
		//add new validate
		// if(gamer.profile.coins < 1000) {
		// 	reply(400, 'You must take 1000 Btamin'); return;
		// }
		//add new
		if(n > tmp) {
			gamer.profile.coins -= tmp;
			
			gamer.chips += tmp;
			room.chips[ gamer.seat ] = gamer.chips;

			//add_new_23
			room.listCoins[gamer.seat] = gamer.profile.coins ;

			room.notifyAll('updateListCoins', {
				ListCoins: room.listCoins
			});

			room.pot_chips.push(tmp);
			room.pot += tmp;
			//send money to admin
			userService.TxCreatePayPoker({ amount : tmp, userId : req.uid, userToken : req.token}).then(result => {
				// console.log('Call =====> ============================>', result)
			});
			
			room.notifyAll('call', {
				seat: gamer.seat,
				uid: gamer.uid,
				call: tmp,
				raise: 0
			});
			
			reply(0, {});
			
			room.gamerMoveTurn(true);
		}
		else{
			//old
			gamer.profile.coins -= n;
			gamer.chips += n;
			
			room.chips[ gamer.seat ] = gamer.chips;

			//add_new_23
			room.listCoins[gamer.seat] = gamer.profile.coins ;

			room.notifyAll('updateListCoins', {
				ListCoins: room.listCoins
			});
			
			room.pot_chips.push(n);
			room.pot += n;
			//send money to admin
			userService.TxCreatePayPoker({ amount : n, userId : req.uid, userToken : req.token}).then(result => {
				// console.log('Call =====> ============================>', result)
			});
			//send call user for all player in the room
			room.notifyAll('call', {
				seat: gamer.seat,
				uid: gamer.uid,
				call: n,
				raise: 0
			});
			
			reply(0, {});
			
			room.gamerMoveTurn(true);
		}
	})();
	
	
};
// hanlde event when player click button raise.
HoldemGame.prototype.onGamer_raise = function(req, reply) {
	var room = this, uid = req.uid;

	var gamers = room.gamers;
	var gamer = gamers[ uid ];
	gamer.fold = 0 ;
	
	if(! gamer.is_ingame) {
		reply(400, 'no in game'); return;
	}
	
	var raise = parseInt( req.args );

	//add new
	if(isNaN(raise)) {
		reply(400, 'invalid raise: ' + raise); return;
	}
	//end
	(async()=>{
		var call_chip = room.max_chip - gamer.chips;
		var n = call_chip + raise;

		var checkBalance = await userService.userBalance({id : req.uid, token : req.token});
		// console.log('checkBalance ============>>> ', checkBalance);
		// if(checkBalance.status == false) {
		// 	reply(400, 'Invalid UserId'); return;
		// }

		// if(checkBalance.status && checkBalance.balance < 1000) {
		// 	reply(400, 'You must take 1000 Btamin'); return;
		// }

		if(n > gamer.profile.coins) {
			reply(400, 'no enough coins, need: ' + n); return;
		}

		if(room.raise_per_round > 0) {
			if(room.raise_counter >= room.raise_per_round) {
				reply(400, 'no more raise this round'); return;
			}
			
			room.raise_counter ++;
		}
		
		room.no_raise_counter = 1;
		
		room.notifyAll('raise', {
			seat: gamer.seat,
			uid: gamer.uid,
			call: call_chip,
			raise: raise
		});
		
		gamer.profile.coins -= n;
		gamer.chips += n;
		room.chips[ gamer.seat ] = gamer.chips;

		//add_new_23
		room.listCoins[gamer.seat] = gamer.profile.coins;
		room.notifyAll('updateListCoins', {
			ListCoins: room.listCoins
		});
		//hanle send money to admin
		
		userService.TxCreatePayPoker({amount : n, userId : req.uid, userToken : req.token}).then(result => {
			// console.log('raise =====> ============================>', result)
		});
		
		room.pot_chips.push(n);
		room.pot += n;
		
		room.max_chip = Math.max(room.max_chip, gamer.chips);
		room.last_raise = raise;
		
		reply(0, {});
		
		room.gamerMoveTurn(true);

	})();
	
	
};
// handle button All_in in the room
HoldemGame.prototype.onGamer_all_in = function(req, reply) {
	var room = this, uid = req.uid;
	var gamers = room.gamers;
	var gamer = gamers[ uid ];
	gamer.fold = 0 ;
	
	if(! gamer.is_ingame) {
		reply(400, 'no in game'); return;
	}
	
	var n = gamer.profile.coins;
	gamer.is_allin = true;
	
	gamer.profile.coins -= n;
	gamer.chips += n;
	room.chips[ gamer.seat ] = gamer.chips;

	room.listCoins[gamer.seat] = gamer.profile.coins;
	room.notifyAll('updateListCoins', {
		ListCoins: room.listCoins
	});
	
	room.pot_chips.push(n);
	room.pot += n;
	room.max_chip = Math.max(room.max_chip, gamer.chips);
	
	room.notifyAll('all_in', {
		seat: gamer.seat,
		uid: gamer.uid,
		call: 0,
		raise: n
	});
	
	reply(0, {});
	
	room.gamerMoveTurn(true);
};
//handle relogin
HoldemGame.prototype.onGamer_relogin = function(req, reply) {
	Room.prototype.onGamer_relogin.call(this, req, reply);

	var room = this, uid = req.uid;
	
	var gamer = room.gamers[ uid ];
	if(gamer.seat >= 0) {
		room.notify(uid, 'seecard', {
			seat: gamer.seat,
			uid: uid,
			cards: gamer.cards
		});
		
		var is_myturn = false;
		var cmds = {
			fold: null
		};
		if(gamer.is_ready || gamer.is_ingame) cmds.ready = null;
		if(gamer.is_ingame) {
			cmds.fold = true;
			var next = room.in_gamers[0];
			is_myturn = (next.seat === gamer.seat);
		}
		room.notify(uid, 'prompt', cmds);
		
		if(is_myturn) {
			room.gamerMoveTurn(false);
		}
	}
};

HoldemGame.prototype.close = function() {
	var room = this;
	if(room.is_ingame) {
		room.gameOver();
	}

	Room.prototype.close.call(this);
};


