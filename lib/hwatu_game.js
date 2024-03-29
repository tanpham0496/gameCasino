var Gamer = require('./gamer'),
	Room = require('./room'),
	Hwatu = require('./Hwatu'),
	HwatuPoker = require('./hwatu_poker');
const userService = require('../containers/service/userService');
const blocksCasino = require('../containers/service/blocksCasinoService');
var _ = require('lodash');
var uuid = require('uuid');

var ls = require('local-storage');
exports = module.exports = HwatuGame;

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
function HwatuGame( casino, typeid, roomid, options ) {
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
	//save temporary player fold on the match => hanlde reGame except player fold before that.
	this.listFold = [];
	//add new this.next_match will handle between n people that have same the score 
	//or The score player = 40 || 30
	this.next_match = false;
	//save temporary in_gamers on the previous match;
	this.in_gamers_previous = [];
	// this.ReGameListUser = [];
}

HwatuGame.LIMIT = LIMIT;
HwatuGame.POT_LIMIT = POT_LIMIT;
HwatuGame.NO_LIMIT = NO_LIMIT;

HwatuGame.prototype = Object.create(Room.prototype);

HwatuGame.prototype.constructor = HwatuGame;
//holdeGamer details return client that's client show room data;
HwatuGame.prototype.details = function() {
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
HwatuGame.prototype.tick = function() {
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
			// console.log('turn_countdown === 0 <=====');
			var gamers = room.gamers;
			
			var call_chip = (room.max_chip - gamer.chips);
			var raise_max = gamer.profile.coins - call_chip;
			//gamer auto leave room.
			

			if(call_chip > 0 && (gamer.profile.coins !== 0)) {
				gamer.fold ++;
				if(gamer.fold === 3) {
					// console.log("==============>GO OUT");
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
				room.no_raise_counter ++;
				room.notifyAll('check', {
					seat: gamer.seat,
					uid: gamer.uid,
					call: 0,
					raise: 0
				});
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
			if(listUser.length >= 2) {
				// console.log('listUser.length >= 2')
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
			else{
				room.ready_countdown = -1;
				room.in_gamers = [];
				room.is_ingame = false;
				room.turn_countdown = -1;
				room.deal_order = [];
				room.cards = {};
				room.chips = {};
				//add_new_23
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
HwatuGame.prototype.gameStart = function() {
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
	// room.ReGameListUser = [];
	room.pot = 0;
	room.max_chip = 0;
	room.last_raise = room.big_blind;
	room.raise_counter = 0;
	room.no_raise_counter = 0;

	var i, j, uid, gamer, first = room.dealer_seat;
	var in_gamers = room.in_gamers = [];
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
		gamer.prize = 0;
		gamer.chipsReGame = 0;
		gamer.chips = 0;
		//add turn off nextGame
		gamer.nextGame = false; 
		
		deal_order.push( gamer );
		in_seats.push( gamer.seat );
	}
	room.ingamers_count = in_gamers.length;
	
	if(in_gamers.length > 2) in_gamers.push( in_gamers.shift() );

	in_gamers.map(itemGamer => {
		n = room.big_blind;
		itemGamer.profile.coins -= n;
		room.notify(itemGamer.profile.uid, 'stakeGameStartHwatu', {money : n});
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
	
	room.notifyAll('gamestart', {
		room: room.details(),
		seats: in_seats
	});

	room.notifyAll('updateListCoins', {
		ListCoins: room.listCoins
	});

	// deal hole cards
	var fullcards = room.fullcards = Hwatu.newSet();
	var roomcards = room.cards = {};
	var deals = room.deals = [];
	for(i=0; i<deal_order.length; i++) {
		gamer = deal_order[i];
		if(gamer.is_ingame) {
			// gamer.cards = Hwatu.sortByNumber( Hwatu.draw(fullcards, 1) );
			gamer.cards = Hwatu.draw(fullcards, 1);
			room.cards[ gamer.seat ] = [0];
			deals.push([ gamer.seat, [0] ]);
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
		room.state = PREFLOP;
		room.gamerMoveTurn(false);
		
	}, 3000);
	
};

HwatuGame.prototype.dealSharedCards = function(n) {
	var room = this;
	
	var cards = Hwatu.draw(room.fullcards, n);
	// console.log('room.fullcards----------------',room.fullcards)
	room.shared_cards = Hwatu.merge(room.shared_cards, cards);

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
	console.log("timing =>>>> waiting", time);
	if(time === 0){
		//clear all cache
		ls.clear();
		var listUserOnRoom = [];
		for(uid in room.gamers){
			var gamer = room.gamers[ uid ];
			gamer.is_ready = false;
			if(room.next_match) room.next_match = false;

			if(gamer.profile.coins > 1000) {
				// console.log('gamer.profile.coins', {coins : gamer.profile.coins, uid : uid})
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

		// const listUserOnRoom = _.keys(room.gamers);
		// console.log('listUserOnRoom timingLeaveAndRestart',listUserOnRoom);

		// if(listUserOnRoom.length >=2) {
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
			
		// }
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
HwatuGame.prototype.timingLeaveRoomAndRestartGame = function(time) {
	var room = this;
	timingLeaveAndRestart(room, time);
	
	var listUser = _.keys(room.gamers);

	room.enableButtonLeaveOnRoom('prompt',{leave: null}, listUser);
	setTimeout(()=> {
		room.enableButtonLeaveOnRoom('prompt',{leave: true}, listUser);
	},1000)

}
//handle gameOVer *** => caculation money
HwatuGame.prototype.gameOver = function() {
	var room = this;
	// console.log('room.fullcards',room.fullcards);
	var in_gamers = room.in_gamers, i, gamer, gamerWin, item, scorelist = [];
	var listLose = [], surplus= 0, listBettingInGame = [], stateOnlyOne = true, listChipGameOver = [];
	var nameCardOfWinnerHwatu, cardWinnerHwatu;
	//hanle endgame when The match have field next_match(includes : regame || newgame)
	var inGamers = in_gamers.map(item => {
		const ret = {
			uid: item.uid,
			chips: item.chips,
			cards : item.cards,
			coins : item.profile.coins 
		}
		return ret;
	})
	//get user win in match
	if(!room.next_match) {
		gamerWin = in_gamers.map(item => {
			if(item.prize > 0) return item;
			return null;
		}).filter(item => item);
	}
	
	var param = {
		roomId : room.id,
		in_gamers : inGamers,
		Winner : room.next_match ? 'Draw' : (gamerWin && gamerWin[0].uid) ? gamerWin[0].uid : '',
		status : "endGame",
		type : 'hwatu',
		matchId : room.next_match ? room.matchId : uuid.v4(),
		pot : room.pot
	}
	if(!room.next_match) room.matchId = param.matchId;
	//case : regame || newgame
	if(room.next_match) {
		const saveData = blocksCasino.createBlocksCasino(param);
		for(i=0; i<in_gamers.length; i++) {
			gamer = in_gamers[i];
			if(gamer.nextGame) {
				console.log('{uid ==== chips }', {uid :  gamer.profile.uid, chipsReGame : gamer.chipsReGame})
				let percentReceive = (100 - parseInt(gamer.profile.gameFeeIdxMS)/10)/100;
				gamer.profile.coins = gamer.profile.coins + gamer.chipsReGame * percentReceive;
				room.notify(gamer.profile.uid, 'sendMoneyToWinner', {money : gamer.chipsReGame, nameGame : 'hwatu'});

				// userService.TxCreateRewardHwatu({ amount : gamer.chipsReGame, userId : gamer.profile.uid }).then(result=> {
				// 	// console.log('Dra =====>==========================>function Gameover', result)
				// })

				listBettingInGame.push({uid : gamer.profile.uid, coins : gamer.chipsReGame * percentReceive, draw : 'true'});
				gamer.saveData();
			}
			else{
				listBettingInGame.push({uid : gamer.profile.uid, coins : gamer.chips, draw : 'false'});
			}
			gamer.nextGame = false;
			
			item = gamer.getProfile();
			item.seat = gamer.seat;
			item.cards = gamer.cards;
			item.chips = gamer.chips;
			item.prize = gamer.prize;

			userService.handleRiseExperien({id : gamer.uid, exp : gamer.chips}).then(result => {
				// console.log('handleRiseExperien =====> ============================>', result)
			});
			
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
		
		room.notifyAll('DrawHwatu', {listBettingInGame : listBettingInGame });
		room.notifyAll('gameover', scorelist);
		room.notifyAll('gamesUpdateMoney', scorelist);
		
	}
	//hanle endgame normal
	else{
		const saveData = blocksCasino.createBlocksCasino(param);

		for(i=0; i<in_gamers.length; i++) {
			gamer = in_gamers[i];
			gamer.is_ingame = false;
			console.log('gamer.prize==============>', gamer.prize)
			if(gamer.prize === 0) {
				listLose.push(gamer)
			}
			listChipGameOver.push({uid : gamer.uid, chips : gamer.chips})
		}

		for(i=0; i<in_gamers.length; i++) {
			gamer = in_gamers[i];
			//state only one validate when have more winner
			if(gamer.prize > 0 && stateOnlyOne) {
				listLose.map(item => {
					console.log('!room.listFold.includes(item.uid)', {uid : item.uid, fold : !room.listFold.includes(item.uid)})
					if((item.chips > gamer.chips) && !room.listFold.includes(item.uid)){
						item.chips -= gamer.chips;
						item.profile.coins += item.chips;
						
						if(item.chips >= 0 && item.profile.uid){
							userService.TxCreateRewardHwatu({ amount : item.chips, userId : item.profile.uid }).then(result=> {
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
						// console.log('=====================item.chips <<<<<<<< gamer.chips======================')
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
				let percentReceive = (100 - parseInt(gamer.profile.gameFeeIdxMS)/10)/100;
				gamer.profile.coins = gamer.profile.coins + (gamer.prize-surplus)*percentReceive;

				room.notify(gamer.profile.uid, 'sendMoneyToWinner', {money : (gamer.prize-surplus), nameGame : 'hwatu'});

				listBettingInGame.push({uid : gamer.profile.uid, coins : (gamer.prize-surplus)*percentReceive});
				
				gamer.saveData();
				//add new
				room.notifyWinner(gamer.uid, 'Win', { listBettingInGame : listBettingInGame, listChipGameOver : listChipGameOver }); //uid, event, args
				if(gamer.cards.length == 2 && room.shared_cards.length ==5){
					cardWinnerHwatu = gamer.cards;
					nameCardOfWinnerHwatu = HwatuPoker.Gwangdang(gamer.cards);
				}
			}
			
			item = gamer.getProfile();
			item.seat = gamer.seat;
			item.cards = gamer.cards;
			item.chips = gamer.chips;
			item.prize = gamer.prize;

			userService.handleRiseExperien({id : gamer.uid, exp : gamer.chips}).then(result => {
				// console.log('handleRiseExperien =====> ============================>', result)
			});
			
			
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
		if(nameCardOfWinnerHwatu && cardWinnerHwatu){
			room.notifyAll('showNameCardWinner', {nameCardOfWinnerHwatu : nameCardOfWinnerHwatu, cardWinnerHwatu : cardWinnerHwatu});
		}
		room.notifyAll('gameover', scorelist);
		room.notifyAll('gamesUpdateMoney', scorelist);

	}

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

		var uid_key = 'user:#' + gamer.uid;
		
	}
	
	setTimeout(()=> {
		room.notifyUserId('prompt',params, listUser);
	},500);
	

	
	room.turn_countdown = -1;
	//old code
	// room.in_gamers = [];
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
	// room.ReGameListUser = [];

	// console.log('==========> WAITING FOR USER 10s ======> SHOW RESULT <========');
	room.timingLeaveRoomAndRestartGame(room.options.show_result);
	
};
//return cmds for client-side
HwatuGame.prototype.cmdsForGamer = function(gamer) {
	var room = this;
	var limit_rule = room.options.limit_rule;
	
	var cmds = {};
	const listUser = _.keys(room.gamers);
	if(listUser.length === 1){
		return cmds;
	}
	switch(room.state) {
	case PREFLOP:
	case FLOP:
	case TURN:
	case RIVER:
		cmds.fold = true;
		if(gamer.profile.coins >= room.bettingMax){
			console.log('================NewCODE ================================')
			call_chip = (room.max_chip - gamer.chips);
			raise_max = room.bettingMax - call_chip;

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
			console.log('================ODD CODE================================')
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
					var uid_key = 'userId:#' + gamer.uid;
					if(ls.get(uid_key) === null && call_chip != room.bettingMax){
						ls.set(uid_key, 'raise');
						// cmds.raise = 'range,' + room.last_raise + ',' + raise_max; //old
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
	console.log('CMDS****===>>>', cmds);
	return cmds;
};
// draw poker or move turn to player other
HwatuGame.prototype.moveTurnToNext = function() {
	console.log('moveTurnToNext')
	var room = this;
	var in_gamers = room.in_gamers;

	
	var last = in_gamers[0], next;
	if(typeof last === 'undefined') {
		console.log('last===============><================================in_gamers', in_gamers)
		// console.log('in_gamers=========================');
		// console.log('room.gamers',room.gamers);
		const userOnGame = _.keys(room.gamers);
		console.log('userOnGame', userOnGame)
		if(userOnGame.length >=2) room.gamerMoveTurn(true);
		// if(userOnGame.length === 1) {
		// 	break;
		// }
	}
	else{
		console.log('last.uid===============', last.uid)
		room.notify(last.uid, 'prompt', {
			fold: null,
			check: null,
			call: null,
			raise: null,
			all_in: null
		}); 
		let tmpBreak = 0;
		
		do {
			tmpBreak ++;
			in_gamers.push( in_gamers.shift() );
			
			next = in_gamers[0];
			console.log("typeof next",typeof next);
			console.log("-------------NEXT--------------------->", next.uid);
			// console.log("-------------seat === room.first_turn--------------------->", seat === room.first_turn);
			if(next.seat === room.first_turn) room.round_counter ++;

			console.log('2222222==========>')
			
			const data = _.keys(room.gamers);
			console.log("------------- data---------------->", data);
			
			if(next.seat === last.seat && data.includes(next)) {
				console.log("------------- next---------------->", next);
				console.log("------------- last---------------->", last);
				break;
			}
			console.log('33333============>')
			if(next.is_ingame) {
				console.log("------------- next.is_ingame ---------------->", next.is_ingame );
				if(next.is_allin) {
					room.no_raise_counter ++;
				} else {
					break;
				}
			}
			console.log('4444===========>')
			if(data.length === 1) {
				console.log('clear data.length === 1', data);
				break;
			}
			else if(data.length === 0) {
				console.log('clear data.length === 0', data);
				break;
			}
			if(room.in_gamers.length == 0 || room.in_gamers.length == 1){
				console.log('room.in_gamers.length===========>');
				break;
			}
			console.log('tmpBreak =================>', tmpBreak)

			if(tmpBreak == 5){
				console.log('tmpBreak == 5', tmpBreak)
				break;
			}
			// else{
			// 	console.log('next===========>', next);
			// 	if(next.is_ingame == false){
			// 		break;
			// 	}
			// }
			
		} while(true);
	}
	
};

HwatuGame.prototype.gamerMoveTurn = function(move) {
	console.log('gamerMoveTurn')

	var room = this;
	var in_gamers = room.in_gamers, deal_order = room.deal_order;

	
	if(move) room.moveTurnToNext();
	var deal_card = false;
	if(room.no_raise_counter === room.ingamers_count) {
		room.state ++;
		switch(room.state) {
		case FLOP:
			room.dealSharedCards(2);
			deal_card = true;
			ls.clear();
			break;
		case TURN:
			room.dealSharedCards(3);
			deal_card = true;
			ls.clear();
			break;
		case RIVER:
			var deals= [];
			for(i=0; i<room.deal_order.length; i++) {
				gamer = deal_order[i];
				if(gamer.is_ingame) {
					let oneCard = Hwatu.draw(room.fullcards, 1);
					gamer.cards.push(oneCard[0]); 
					room.cards[ gamer.seat ] = [0,0];
					deals.push([ gamer.seat, [0,0] ]);
				}
			}
			
			room.notifyAll('deal', {
				deals: deals,
				delay: 3
			});
			
			for(i=0; i<room.deal_order.length; i++) {
				gamer = room.deal_order[i];
				// console.log('gamer.cards___',gamer.cards);
				const nameTwoCard = HwatuPoker.Gwangdang(gamer.cards);
				// const nameTwoCard = HwatuPoker.rank( gamer.cards );
				if(gamer.is_ingame) {
					room.notify(gamer.uid, 'seecard', {
						seat: gamer.seat,
						uid: gamer.uid,
						cards: gamer.cards,
						nameTwoCard : nameTwoCard
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
				console.log('GAMER SHOW DOWN')
				room.gamerShowDown();
			}
		}

	}
	
	
};
// handle player fold => give up
HwatuGame.prototype.gamerGiveUp = function( gamer ) {
	try{
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
	}
	catch(e){
		console.log('{e, gamer} : ', {e, gamer});
	}
};

HwatuGame.prototype.simpleWin = function() {
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
HwatuGame.prototype.gamerShowDown = function() {
	var room = this;
	var in_gamers = room.in_gamers, finals = [],listPlayer=[], 
	listWinner = [], listReGame = [], gamers_bychips = [], showWinner = [];
	var i, gamer, maxFive, someone_allin = false;
	var AllChipsOfWin = 0, AllChipsOfLose = 0;
	for(i=0; i<in_gamers.length; i++) {
		gamer = in_gamers[i];
		gamers_bychips.push( gamer );
		
		if(! gamer.is_ingame) continue;
		if(gamer.is_allin) someone_allin = true;

		gamer.cards.sort(function(a,b){return a- b});
		console.log('gamer.cards_________',gamer.cards);
		// ==============>old code correctly<=================
		gamer.maxFiveRank = HwatuPoker.rank( gamer.cards );

		//=============>add to test reGame when userScore = 40<======================
		// if(i === 0 || i === 1){
		// 	gamer.maxFiveRank = 30;
		// }else{
		// 	gamer.maxFiveRank = 10;
		// }

		//=================>add test newGame listWinner have same score<=============

		// if(i === 0 || i === 1){
		// 	gamer.maxFiveRank = 29;
		// }
		// else {
		// 	gamer.maxFiveRank = 10;
		// }

		console.log('gamer.Rank=============',{maxFiveRank :gamer.maxFiveRank, uid : gamer.uid})
		finals.push( gamer.maxFiveRank );
		listPlayer.push(gamer);
	}
	// lấy người thắng có maxfiverank lớn nhất ở vị trí đầu trong mảng - find winner put at One on array
	// listPlayer.sort( function(a,b){ return b.maxFiveRank - a.maxFiveRank; } );

	const location = HwatuPoker.findWinnerPlayer(finals); //finals = userScore
	if(location.message === 'newGame') {
		console.log('========================NEWGAME====================================>')
		var in_gamers = room.in_gamers.map(item => {
			const ret = {
				uid: item.uid,
				chips: item.chips,
				cards : item.cards,
			
			}
			return ret;
		})
		
		listWinner = location.winner && location.winner.map(item=> {
			showWinner.push(listPlayer[item].uid)
			return listPlayer[item];
		});
		ls.clear();
		room.notifyAll('showNameCardWinner', {nameCardReGameHwatu : 'Draw', showWinner : showWinner});

		
		room.next_match = true;
		for( let i = 0; i < room.in_gamers.length ; i++){
			var gamerNewGame = room.in_gamers[i];
			console.log('===========>newGame =======>',gamerNewGame.uid)
			listWinner.map(item => {
				console.log('item.uid',item.uid)
				if(item.uid === gamerNewGame.uid){
					gamerNewGame.nextGame = true;
					// sum chips of all winner.
					AllChipsOfWin = AllChipsOfWin + gamerNewGame.chips;
				}
			})
		}
		console.log('room.pot =========>          ', room.pot);
		console.log('AllChipsOfWin =========>         ', AllChipsOfWin);
		AllChipsOfLose = room.pot - AllChipsOfWin;
		console.log('AllChipsOfLose =========>         ', AllChipsOfLose);
		//Divide sum btamin of loser that's for these winner follow percent
		for( let i = 0; i < room.in_gamers.length ; i++){
			var gamerNewGame = room.in_gamers[i];
			listWinner.map(item => {
				if(item.uid === gamerNewGame.uid){
					gamerNewGame.chipsReGame = gamerNewGame.chips + (gamerNewGame.chips)/AllChipsOfWin * AllChipsOfLose;
					console.log('-------------->gamerNewGame.chipsReGame <---------------', gamerNewGame.chipsReGame)
				}
			})
		}
		room.gameOver();
	} else if (location.message === 'reGame') {
		console.log('========================REGAME====================================>')
		var in_gamers = room.in_gamers.map(item => {
			const ret = {
				uid: item.uid,
			    chips: item.chips,
			}
			return ret;
		})
		
		ls.clear();
		if(location.winner == 40) {
			room.notifyAll('showNameCardWinner', {nameCardOfWinnerHwatu : '40', cardWinnerHwatu : [4,9]});
		}
		else{
			let cardWinner = room.in_gamers.map(item => {
				if(item.maxFiveRank == 30){
					return item.cards
				}
				return  null;
			}).filter(item => item);
			console.log('cardWinner==============>', cardWinner[0])
			room.notifyAll('showNameCardWinner', {nameCardOfWinnerHwatu : '30', cardWinnerHwatu : cardWinner[0]});
		}
		
		room.next_match = true;
		for( let i = 0; i < room.in_gamers.length ; i++){
			var gamerReGame = room.in_gamers[i];
			if(!room.listFold.includes(gamerReGame.uid)){
				gamerReGame.nextGame = true;
				AllChipsOfWin = AllChipsOfWin + gamerReGame.chips;
			}
			else{
				gamerReGame.nextGame = false;
			}
		}

		console.log('room.pot =========>          ', room.pot);
		console.log('AllChipsOfWin =========>         ', AllChipsOfWin);
		AllChipsOfLose = room.pot - AllChipsOfWin;
		console.log('AllChipsOfLose =========>         ', AllChipsOfLose);
		//Divide sum btamin of loser that's for these winner follow percent
		for( let i = 0; i < room.in_gamers.length ; i++){
			var gamerReGame = room.in_gamers[i];
			if(!room.listFold.includes(gamerReGame.uid)){
				gamerReGame.chipsReGame = gamerReGame.chips + (gamerReGame.chips)/AllChipsOfWin * AllChipsOfLose;
				console.log('-------------->gamerReGame.chipsReGame <---------------', gamerReGame.chipsReGame)
			}
		}
		room.gameOver();
	} else {
		const locationWinner = location.winner[0];
		const winner = listPlayer.splice(locationWinner, 1);
		console.log('winner',winner)
		
		for(i=0; i < listPlayer.length; i++) {
			while(listPlayer.length > 0){
				var loser = listPlayer.shift();
				console.log('lose.uid______',loser.uid)
				loser.profile.exp ++;
				loser.saveData();
			}
			break;
		}	
		var prize = room.pot;
		winner[0].prize = prize;
		// send => client
		room.gameOver();
	}

	
};
//count timer and restartGame
function WaitingStartGame(room, time) {
	console.log("timing =>>>> waiting", time);
	var listUser = _.keys(room.gamers);
	if(time === 0){
		room.waitingStart = true;
		room.enableButtonLeaveOnRoom('prompt',{leave: null}, listUser);
	} else {
		setTimeout(() => {
			time--;
			WaitingStartGame(room,time);
		}, 1000)
	}
}
// Handle ready game for player.
HwatuGame.prototype.onGamer_ready = function(req, reply) {
	var room = this;
	console.log('onGamer_ready------------------room.id : ',room.id)
	var uid = req.uid;
	var gamer = room.gamers[ uid ];

	// const updateInGameOfUser = userService.handleOnlineAndOffline({uid, stt : 2});
	//add new Gamer gamer.profile.coins <=0
	//add new 6/2/20 => if(typeof gamer !== 'undefined') error
	if(typeof gamer === 'undefined') {
		console.log('typeof gamer === undefined ',room)
	}
	if(typeof gamer !== 'undefined') {
		if(gamer.profile.coins < 1000) {
			room.notify(gamer.uid, 'prompt', {leave : true});
			reply(401, 'you must take 1000 Btamin'); return;
		}
		
		if(gamer.seat < 0) {
			room.notify(gamer.uid, 'prompt', {leave : true});
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

			// console.log('========>onGamer_Waiting<=========');
			WaitingStartGame(room,room.options.show_leave_on_start);
		}
		if(room.ready_gamers > 2 && !room.waitingStart){
			room.notify(gamer.uid, 'prompt', {leave : true});
		}
	}
};
// ready new game when these player have just been score equal or score.....
// HwatuGame.prototype.onGamer_readyNewGame= function(req, reply) {
// 	console.log("=========================> HwatuGame.prototype.onGamer_readyNewGame <======================")
// 	var room = this;
// 	var uid = req.uid;
// 	var gamer = room.gamers[ uid ];

// 	if(typeof gamer === 'undefined') {
// 		console.log('typeof gamer === undefined ',room)
// 	}
// 	if(typeof gamer !== 'undefined') {
		
// 		if(gamer.seat < 0) {
// 			room.notify(gamer.uid, 'prompt', {leave : true});
// 			reply(402, 'Room is full! Please come back later'); return;
// 		}
		
// 		room.notifyAll('ready', {
// 			uid: uid,
// 			where: gamer.seat
// 		});
// 		var listUser = _.keys(room.gamers);

// 		var listUser = _.keys(room.gamers);
// 		if(listUser.length == 0){
// 			room.next_match = false;
// 			listUser.map(itemId => {
// 				room.pub.publish('room:#'+ room.id, JSON.stringify(
// 					{ 
// 						uid: itemId, 
// 						f: 'ready', 
// 						args: '0' 
// 					}
// 				));
// 			})
// 		}

// 		if(gamer.nextGame){
// 			gamer.is_ready = true;
// 			room.ready_gamers ++;
// 			console.log('room.ready_gamers',room.ready_gamers)
// 			if(room.ready_gamers >= 2) {
// 				room.gameStart();
// 			}
// 		}
// 		else{
// 			gamer.is_ready = false;
// 			room.notify(gamer.uid, 'prompt', {leave : null});
// 			setTimeout(() => {
// 				room.notify(gamer.uid, 'prompt', {leave : true});
// 			},1000)
// 			reply(402, 'Please wait for those players to win and lose'); return;
// 		}
		
// 	}

// }
// handle take a seat when The match have just already.
HwatuGame.prototype.onGamer_takeseat = function(req, reply) {
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
	console.log('gamer.room---***------ add new 6/2/20',gamer.room.id)
	//add new 6/2/20
	room.pub.publish('room:#'+gamer.room.id, JSON.stringify(
		{ 
			uid: uid, 
			f: 'ready', 
			args: '0' 
		}
	));
};

HwatuGame.prototype.onGamer_unseat = function(req, reply) {
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
HwatuGame.prototype.onGamer_fold = function(req, reply) {
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

	var listUser= _.keys(room.gamers);
	
	if(listUser.length > 2 && gamer.fold !== 1) {
		// console.log('FOLD__________________', cmds)
		reply(0, {
			cmds: cmds
		});
	}else {
		reply(0, {});
	}
	
	
};
// hanlde event when player click button check.
HwatuGame.prototype.onGamer_check = function(req, reply) {
	console.log('onGamer_check',req);
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
HwatuGame.prototype.onGamer_call = function(req, reply) {
	var room = this, uid = req.uid;
	var gamers = room.gamers;
	var gamer = gamers[ uid ];
	gamer.fold = 0 ;
	var user_record;
	
	if(! gamer.is_ingame) {
		reply(400, 'no in game'); return;
	}
	
	var call_chip = room.max_chip - gamer.chips;
	var n = call_chip;
	
	(async()=> {
		//get btamin
		var checkBalance = await userService.userBalance({id : req.uid, token : req.token});
		room.no_raise_counter ++;
		var tmp;
		// if(checkBalance.status == false) {
		// 	reply(400, 'Invalid UserId'); return;
		// }
		
		if(checkBalance.balance > gamer.profile.coins){
			tmp = checkBalance.balance;
			gamer.profile.coins = checkBalance.balance;

			user_record = {
				uid: req.uid,
				name: req.uid,
				avatar: '',
				coins: gamer.profile.coins,
				score: gamer.profile.score,
				exp: gamer.profile.exp,
				level: gamer.profile.level,
				rank: gamer.profile.rank,
				gameFeeIdxMS : gamer.profile.gameFeeIdxMS
			};
			gamer.setProfile( user_record );


			gamer.saveData();
		}
		else if(checkBalance.balance < gamer.profile.coins){
			tmp = gamer.profile.coins;
			gamer.profile.coins = checkBalance.balance;

			user_record = {
				uid: req.uid,
				name: req.uid,
				avatar: '',
				coins: gamer.profile.coins,
				score: gamer.profile.score,
				exp: gamer.profile.exp,
				level: gamer.profile.level,
				rank: gamer.profile.rank,
				gameFeeIdxMS : gamer.profile.gameFeeIdxMS
			};
			gamer.setProfile( user_record );

			gamer.saveData();
		}
		else{
			tmp = gamer.profile.coins;
		}
		gamer.getProfile();

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
			userService.TxCreatePayHwatu({ amount : tmp, userId : req.uid, userToken : req.token}).then(result => {
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
			userService.TxCreatePayHwatu({ amount : n, userId : req.uid, userToken : req.token}).then(result => {
				// console.log('Call =====> ============================>', result)
			})	
			
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
HwatuGame.prototype.onGamer_raise = function(req, reply) {
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
		//send money use raise betting to admin
		userService.TxCreatePayHwatu({amount : n, userId : req.uid, userToken : req.token}).then(result => {
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
// hanlde event when player click button All_in.
HwatuGame.prototype.onGamer_all_in = function(req, reply) {
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
// handle re_login
HwatuGame.prototype.onGamer_relogin = function(req, reply) {
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
			// ready: true,
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

HwatuGame.prototype.close = function() {
	var room = this;
	if(room.is_ingame) {
		room.gameOver();
	}

	Room.prototype.close.call(this);
};


