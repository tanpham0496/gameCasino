(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

var Client = require('../lib/client'),
	Poker = require('../lib/poker'),
	Jinhua = require('../lib/jinhua_poker'),
	Holdem = require('../lib/holdem_poker');

var apiConfig = 'http://localhost';

var client = null;
Poker.toHTML = function(cards, client) {
	var html = '';
	for(var i=0; i<cards.length; i++) {
		var card = cards[i];
		//add new hwatu game
		console.log('client_______',client)
		if(client && client.room.type === 'hwatu'){
			var png = card + '.png';
			html += "<img src='imgCards_hwatu/" + png + "' style='margin-left: 4px;'/>";
		}
		else{
			//poke
			var color = card >> 4;
			var number = card & 0xf;
			var png = color + '_' + number + '.png';
			html += "<img src='imgCards/" + png + "' style='margin-left: 4px;'/>";
		}
	}
	return html;
};

$(document).ready(function(){
	var socket = io();
	
	socket.log_traffic = true;
	
	client = new Client(socket);
	// console.log('client ----------------------- ',client);
	var lang = $.cookie('lang');
	if(lang) {
		$("select#lang option").filter(function() {
		    return $(this).val() == lang; 
		}).prop('selected', true);
		
		hotjs.i18n.setLang( lang );
		hotjs.i18n.translate();
	}
	$(document).on('input', '#raise',  function() {
		var value = $(this).val()
		if(value !=''){
			document.getElementById('bettingValue').innerHTML = nFormatter(Number(value));
			var balanceChange = document.getElementById('balance').innerHTML
			balanceChange = reFormatNumber(balanceChange)
			document.getElementById('balanceChange').innerHTML =(balanceChange - value) > 0 ? formatNumber(balanceChange - value) : 0;
		} 
	});
	
	$("#increase").click(function(){ increment(); });
	$("#decrease").click(function(){ decrement(); });

	$('select#lang').change(function(){
		$( "select#lang option:selected" ).each(function() {
			$.cookie('lang', $(this).val());
			location.reload();
		});	
	});
	socket.on('hello', function(data){
		console.log('data ------------> helo', data);
		$('#messages').empty();
		$('div#cmds').empty();
		showRoom(null);
		
		addMsg(data.msg);
		
		setTimeout(function(){
			var u = localStorage.getItem('x_userid');
			var p = localStorage.getItem('x_passwd');
			if(u && p) {
				login(u, p);
			} else {
				client.rpc('fastsignup', 0, parseSignUpReply);
			}
		}, 1000);
	});

	socket.on('Res_Room_Full', function(ret){
		// console.log('Res_Room_Full', ret);
		// console.log(ret.game === 'poker' && ret.uid === client.uid)
		if(ret.game === 'poker' && ret.uid === client.uid){
			setTimeout(()=> {
				window.location = `${apiConfig}:7000`;
			},900);
		}
	});
	
	// $('#listFriend').on('click', onBtnClicked);
	$('.logout').on('click', function(res) {
		window.ReactNativeWebView.postMessage("LogoutGames");
	})
 
	client.on('stakeGameStart', function(ret) {
		if(ret.money) {
			var req = {
				uid: localStorage.getItem('userId'),
				token: localStorage.getItem('token'),
				money : ret.money
			};
			console.log('SEND_MONEY_TO_ADMIN', req)
			socket.emit('SEND_MONEY_TO_ADMIN_GAME_START', req);
		}
		
	});

	client.on('sendMoneyToWinner', function(ret) {
		if(ret.money) {
			var req = {
				uid: localStorage.getItem('userId'),
				token: localStorage.getItem('token'),
				money : ret.money
			};
			socket.emit('SEND_MONEY_TO_WINNER', req);
		}
	})

	// client.on('listFriend', function(ret){
	// 	console.log('rettttttttttt listFriend', ret)
	// 	let data = ret;

	// 	$(".popup-listFriend").css({ 'height': $(".contents").height(), })

	// 	$('.listFriend').css('height', $(".contents").height() - 103) // padding: 20px, head = 63px
		
	// 	// item height = 40px
	// 	var padding = ($(".listFriend").height() - 12)%40
	// 	var height = ($(".listFriend").height() - 12) -  padding
	// 	$('.listFriend #listFriend').css({'height' : height, 'padding-top' : '5px'}) // 12 => margin bottom 12px

	// 	$('.block > .listFriend > #listFriend').empty()
	// 	$(".popup-listFriend").toggle()

	// 	var listFriend = ret.data
	// 	listFriend && listFriend.map((item, ind) => {
	// 		div = $('<div>');
	// 		divContent = $('<div>')
	// 		div.append(divContent)
	// 		btn = $('<button>').text(_T('Invite')).attr('id', `invite${item.uid}`).attr('arg', item.uid);
	// 		if(item.online == 0 || item.online == 2) {
	// 			divContent.addClass('infOffline')
	// 			divContent.append(`
	// 				<span class='nameInfo'>${item.uid}</span>
	// 				<span class='stateInfo' style='color: ${item.online == 0 ? '#CFBFBF': '#B94A0F;'}'>${item.online == 0 ? 'Offline': 'In Game'}</span>
	// 			`)
	// 			btn.addClass('buttonInviteOffline')
	// 		} else {
	// 			divContent.addClass('infOnline')
	// 			divContent.append(`
	// 				<span class='nameInfo'>${item.uid}</span>
	// 				<span class='stateInfo' style='color: #92BB37;'>Online</span>
	// 			`)
	// 			btn.addClass('buttonInviteOnline')
			
	// 			btn.on('click', function(){
	// 				var socket = client.uplink;
	// 				var callback = {
	// 					seq: ++ socket.rpc_seq,
	// 					t: Date.now()
	// 				};
	// 				socket.rpc_callbacks[ callback.seq ] = callback;

	// 				const uid = $(`#invite${item.uid}`).attr('arg');
	// 				const userInvite = listFriend.map(item => {
	// 					if(item.uid === uid){
	// 						return item;
	// 					}
	// 					return null;		 		
	// 				}).filter(item => item);

	// 				// old code
	// 				// var req = {
	// 				// 	seq: callback.seq,
	// 				// 	uid: client.uid,
	// 				// 	pin: client.pin,
	// 				// 	f: 'invite',
	// 				// 	args: userInvite
	// 				// };	
	// 				// socket.emit('rpc', req);
	// 				// $(".popup-listFriend").hide()

	// 				// new code
	// 				var req = {
	// 					seq: callback.seq,
	// 					uid: client.uid,
	// 					pin: client.pin,
	// 					type : client.room.type,
	// 					f: 'invite',
	// 					args: userInvite
	// 				};	
	// 				socket.emit('rpc', req);
	// 				$(".popup-listFriend").hide()
	// 			})
	// 		}
	// 		div.append(btn)
	// 		$('.block > .listFriend > #listFriend').append(div)
	// 	});
	// 	console.log('client_______', client)
	// });

	//add_new
	// socket.on('INVITE-FRIEND-JOIN-ROOM', function(reply){
	// 	console.log('reply++++++++++++++++++++++++', reply)
	// 	if(reply && reply.ret.roomId) {
	// 		$('.popup-join').css('display', 'none')
	// 		$('.popup-join').toggle()
	// 		$('.boxs').css('display', 'none')

	// 		// console.log('countdown', countdown)
	// 		document.getElementById('timeInviteHoldem2').innerHTML = '01:00'
	// 		clearInterval(countdown)
	// 		startTimer(60); // Count down

	// 		document.getElementById('nameSender').innerHTML = reply.ret.senderId + " invite you to Poker game"
	// 		$('#JoinRoom').on('click',function(){
	// 			// client.rpc('JoinRoom', {name : 'holdem2', roomid : parseInt(reply.ret.roomId) } , parseReply);
	// 			client.rpc('JoinRoom', {name : reply.ret.type, roomid : parseInt(reply.ret.roomId) } , parseReply);
	// 			clearInterval(countdown)
	// 			$('.popup-join').hide()
	// 			$('.boxs').css('display', 'block')
	// 		});
	// 		$('#noJoinRoom').on('click',function(){
	// 			clearInterval(countdown)
	// 			$('.popup-join').hide()
	// 			$('.boxs').css('display', 'block')
	// 		});
	// 	}
	// })
	client.on('prompt', updateCmds);
	
	client.on('shout', function(ret){
		console.log('shout =====> ', ret)
		addMsg(ret.who.name + _T_('shout:') + ret.msg);
	});
	
	client.on('look', function(ret){
		console.log('look =====> ', ret)
		showRoom(ret);
	});
	
	client.on('refresh', function(ret){
		console.log('refresh =====> ', ret)
		showRoom(client.room);
	});

	client.on('gamesUpdateMoney', function(ret) {
		console.log("Return==== ****==============", ret);
		for(var i = 0; i < ret.length; i++){
			if(ret[i].uid === client.uid){
				document.getElementById('balance').innerHTML = formatNumber(Number(ret[i].coins))
				document.getElementById('balanceChange').innerHTML = ret[i].coins > 0 ? formatNumber(Number(ret[i].coins)) : 0;

				// document.getElementById('balanceHome').innerHTML = formatNumber(Number(ret[i].coins))
				document.getElementById('balanceChangeHome').innerHTML = formatNumber(Number(ret[i].coins))
				// document.getElementById('balanceChangeHomePoker').innerHTML = formatNumber(Number(ret[i].coins))
			}
		}
	})
	
	client.on('enter', function(ret){
		console.log('enter =====> ', ret)
		addMsg(ret.who.name + _T_('enter') + ret.where);
		showRoom(client.room);
	});
	
	client.on('exit', function(ret){
		console.log('exit =====> ', ret)
		addMsg(ret.who.name + _T_('exit') + ret.where);
		if(ret.uid === client.uid) {
			showRoom(null);
			list_games();
		} else {
			showRoom(client.room);
		}
	});

	client.on('takeseat', function(ret){
		addMsg(ret.who.name + _T_('take seat') + ret.where);
		showRoom(client.room);
	});

	client.on('unseat', function(ret){
		addMsg(ret.who.name + _T_('unseat from') + ret.where);
		showRoom(client.room);
	});
	client.on('updateListCoins', function(ret){
		console.log('==========  ret.listCoins', ret.ListCoins)
		if(ret.ListCoins && client && client.room) {
			client.room.listCoins = ret.ListCoins;
		}
		console.log('========== client.room.listCoins', client.room.listCoins)
	});
	
	client.on('gamestart', function(ret){
		addMsg(_T('game start'));
		
		if(ret.room) {
			client.room = ret.room;
		}
		
		if(ret.inseats) {
			var seats = client.room.seats;
			var seat = ret.inseats[0];
			var uid = seats[ seat ];
			addMsg( 'first/D button: ' + uid + ' at seat ' + seat );
		}
	});
	
	client.on('deal', function(ret){
		addMsg(_T('dealing cards'));
		
		var room_cards = client.room.cards;
		var deals = ret.deals;
		var item, seat, cards;
		while(deals.length > 0) {
			item = deals.pop();
			seat = item[0];
			cards = item[1];
			if(seat >= 0) {
				room_cards[ seat ] = Poker.sortByNumber( cards );
			} else {
				client.room.shared_cards = Poker.merge(client.room.shared_cards, cards);
			}
		}
		//Add_new_Tan
		$('#carteSoudCtrl1')[0].play();
		showRoom(client.room);
		
		if(ret.delay) {
			addMsg(_T_('delay') + ret.delay + _T_('seconds') +  _T_('to bet') );
		}
	});
	
	client.on('moveturn', function(ret){
		var seat = ret.seat;
		$('li.seat').removeClass('active');
		$('li#seat'+seat).addClass('active');
		
		if(ret.uid === client.uid) {
			$('#cmds').removeClass('inactive');
			$('#cmds').addClass('active');
		} else {
			$('#cmds').removeClass('active');
			$('#cmds').addClass('inactive');
		}
		
		addMsg(_T('now:') + seat + ', ' + ret.uid);
	});
	
	client.on('countdown', function(ret){
		$('#carteSoudCtrl')[0].play();
		addMsg(_T('count down:') + ret.seat + ', ' + ret.sec);
	});
	
	client.on('fold', function(ret){
		//Add_new_Tan
		$('#carteSoudCtrl3')[0].play();
	});
	client.on('leave', function(ret){
		console.log('ret================>', ret);
		if(ret && ret.uid === client.uid){
			 window.location = `${apiConfig}:7000`
		}
		
	});
	client.on('check', function(ret){
		//Add_new_Tan
		$('#carteSoudCtrl3')[0].play();
	});
	
	client.on('call', function(ret){
		var seat = parseInt(ret.seat);
		addMsg( ret.uid + _T_('at seat') + seat + _T_('call') + ret.call);
		
		client.room.pot += ret.call;
		
		var chips = client.room.chips;
		if(chips) {
			chips[ seat ] += ret.call;
		}
		
		var gamers = client.room.gamers;
		if(ret.uid in gamers) {
			gamers[ ret.uid ].coins -= ret.call;
		}
		//Add_new_Tan
		$('#carteSoudCtrl3')[0].play();
		showRoom(client.room);
	});

	client.on('raise', function(ret){
		var seat = parseInt(ret.seat);
		var raise_sum = (ret.call + ret.raise);
		addMsg( ret.uid + _T_('at seat') + seat + _T_('raise') + ret.raise + ' (' + raise_sum + ')');
		
		client.room.pot += raise_sum;
		
		var chips = client.room.chips;
		if(chips) {
			chips[ seat ] += raise_sum;
		}

		var gamers = client.room.gamers;
		if(ret.uid in gamers) {
			gamers[ ret.uid ].coins -= raise_sum;
		}
		//Add_new_Tan
		$('#carteSoudCtrl3')[0].play();
		showRoom(client.room);
	});

	client.on('pk', function(ret){
		addMsg( ret.uid + _T_('at seat') + ret.seat +  _T('pk') + ret.pk_uid + _T_('at seat') + ret.pk_seat + ', ' + _T('result') + ': ' + (ret.win?_T('win'):_T('fail')));
		
		var gamers = client.room.gamers;
		if(ret.uid in gamers) {
			gamers[ ret.uid ].coins -= ret.pk_cost;
		}
		
		showRoom(client.room);
	});
	
	client.on('seecard', function(ret){
		var seat = parseInt(ret.seat);
		addMsg( ret.uid + _T_('at seat') + seat + _T_('seecard') );
		if(ret.cards) {
			console.log('see', ret.cards)
			client.room.cards[ seat ] = ret.cards;
			showRoom(client.room);
		}
		if(ret.nameTwoCard){
			const arr = client && client.room && client.room.seats;
			const listCoins = client && client.room && client.room.listCoins;
			const newClientSeats = locationOfMeIntoCenter(arr,client.uid, listCoins);
			for(let i = 0 ; i < newClientSeats.length ; i++) {
				if(newClientSeats[i].uid === ret.uid){
					document.getElementById(`nameTwoCards${newClientSeats[i].seat}`).innerHTML = ret.nameTwoCard;
				}
			}
		}
		if(ret.nameFiveCard){
			const arr = client && client.room && client.room.seats;
			const listCoins = client && client.room && client.room.listCoins;
			const newClientSeats = locationOfMeIntoCenter(arr,client.uid, listCoins);
			for(let i = 0 ; i < newClientSeats.length ; i++) {
				if(newClientSeats[i].uid === ret.uid){
					document.getElementById(`nameFiveCard${newClientSeats[i].seat}`).innerHTML = ret.nameFiveCard;
				}
			}
		}
	});
	
	client.on('showcard', function(ret){
		addMsg( ret.uid + _T_('at seat') + ret.seat + _T_('showcard') );
		if(ret.cards) {
			console.log('show', ret.cards)
			client.room.cards[ parseInt(ret.seat) ] = ret.cards;
			showRoom(client.room);
		}
	});
	
	client.on('showNameCardWinner', function(ret) {
		console.log('ret =================================>', ret)
		if(ret.nameCardOfWinner && ret.cardWinner){
			$('.blocks > .block > .contents > .cardsTable').append(`
				<div id="nameCardWinner">
					<div class="nameCardOfWinner">${ret.nameCardOfWinner}</div>
					<div class="cardWinner">${ret.cardWinner}</div>
				</div>
			`);
			if(document.getElementById('nameCardWinner')){
				setTimeout(() => {
					$('#nameCardWinner').remove();
				},9000);
			}
		}
		if(ret.nameCardOfWinnerHwatu && ret.cardWinnerHwatu){
			$('.blocks > .block > .contents > .cardsTable').append(`
				<div id="nameCardWinnerHwatu">
					<div class="nameCardOfWinner">${ret.nameCardOfWinnerHwatu}</div>
					<div class="cardWinner">
						<img src="imgCards_hwatu/${ret.cardWinnerHwatu[0]}.png"  alt="">
						<img src="imgCards_hwatu/${ret.cardWinnerHwatu[1]}.png"  alt="">
					</div>
				</div>
			`);
			if(document.getElementById('nameCardWinnerHwatu')){
				setTimeout(() => {
					$('#nameCardWinnerHwatu').remove();
				},9000);
			}
			
		}
		if(ret.showWinner){
			$('.blocks > .block > .contents > .cardsTable').append(`
				<div id="nameCardWinnerHwatu">
					<div class="nameCardOfWinner">${ret.nameCardReGameHwatu}</div>
					<div class="nameCardOfWinner">${ret.showWinner.toString()}</div>
				</div>
			`);
			if(document.getElementById('nameCardWinnerHwatu')){
				setTimeout(() => {
					$('#nameCardWinnerHwatu').remove();
				},9000);
			}
		}
	});

	// $('#GamePoker').on('click', function(){
	// 	$('#homes').css('display', 'none');
	// 	$('#roomGame').css('display', 'block');
	// });

	// $('#logoutGame').on('click', function(){
	// 	$('#roomGame').css('display', 'none');
	// 	$('#homes').css('display', 'block');
	// })

	client.on('gameover', function(ret){
		// console.log('resttttttttttttttttttttttt', ret)
		addMsg( _T('game over!'));
		
		var shared_cards = client.room.shared_cards;
		var gamers = client.room.gamers;
		var cards = client.room.cards;
		var chips = client.room.chips;
		while(ret.length > 0) {
			var gamer = ret.shift();
			var uid = gamer.uid;
			var n = (gamer.prize - gamer.chips);
			
			if(n > 0) n = '+' + n;
			
			var mycards = gamer.cards;
			var pattern = '';
			if(mycards.length === 3) {
				pattern = Jinhua.patternString(mycards);
				addMsg( '#' + gamer.seat + ', ' + uid + ': ' + n + ', ' + _T_(pattern) );
			} else {
				var maxFive = Holdem.sort( Holdem.maxFive(mycards, shared_cards) );
				pattern = Holdem.patternString( maxFive );
				addMsg( '#' + gamer.seat + ', ' + uid + ': ' + n + ', ' + _T_(pattern) + ' (' + Poker.visualize(maxFive) + ')' );
			}
			
			cards[ gamer.seat ] = gamer.cards;
			chips[ gamer.seat ] = gamer.chips;
			
			// if gamer still in room
			if(uid in gamers) {
				delete gamer.cards;
				delete gamer.chips;
				delete gamer.prize;
				
				gamers[ uid ] = gamer;
			}
		}
		
		showRoom(client.room);
	});

	client.on('bye', function(ret){
		addMsg(ret);
	});

	$('#m').focus();
	$('form').submit(function(e) {
		execCmd();
		return false;
	});
});

/*
 * cmds {
 *     exit: true,
 *     takeseat: true,
 *     unseat: true,
 *     call: true,
 *     raise: [50,100,150],
 *     raise: 'range,0,1000000',
 *     fold: true,
 *     pk: ['zhang3', 'li4', 'wang5'],
 *     seecard: true,
 *     showcard: true,
 *   }
 */
function parseSignUpReply(err,ret){
	parseReply(err,ret);
	if(! err) {
		addMsg(_T('account created:') + ret.uid + '/' + ret.passwd);
		login(ret.uid, ret.passwd);
	}
}

function onBtnClicked(e) {
	// $('#sharedcards').empty(); /// Clear sharedcards;
	event.preventDefault();
	$(this).attr("disabled", true);
	setTimeout(() => {
		$(this).removeAttr('disabled');
	}, 1500);
	//do something
	
	
	var method = $(this).attr('id');
	
	switch(method) {
		case 'fastsignup':
			client.rpc(method, $(this).attr('arg'), parseSignUpReply);
			break;
		case 'holdem2':
			
			client.rpc(method, $(this).attr('arg'), parseReply);
		case 'hwatu':
			client.rpc(method, $(this).attr('arg'), parseReply);
		default:
			client.rpc(method, $(this).attr('arg'), parseReply);
	}
}
function onInputBtnClicked(e){
	event.preventDefault();
	$(this).attr("disabled", true);
	setTimeout(() => {
		$(this).removeAttr('disabled');
	}, 1500);

	var method = $(this).attr('id');
	client.rpc(method, $('input#'+method).val(), parseReply);
	$('input#'+method).val('');
}
function onInputBoxEnter(e) {
	if(e.which == 13) onInputBtnClicked.call(this, e);
}
function onDialogBtnClicked(e) {
	var method = $(this).attr('id');
	var dlg = $('div#'+method);
	var x = ($(window).width() - dlg.width()) / 2;
	var y = ($(window).height() - dlg.height()) / 2;
	dlg.show();
	dlg.css({ 
		position:'absolute',
		left: x + 'px', 
		top: y + 'px'
	});
	
	$(this).hide();
}
function onDialogXClicked(e) {
	var method = $(this).attr('X');
	$('div#'+method).hide();
	$('button#'+method).show();
}
function onDialogOKClicked(e) {
	var method = $(this).attr('OK');
	var args = {};
	$('input.' + method).each(function(i, v){
		var input = $(this);
		args[ input.attr('id') ] = input.val();
	});
	switch(method) {
	case 'signup':
		client.rpc(method, args, parseSignUpReply);
		break;
	default:
		client.rpc(method, args, parseReply);
	}
}

function updateCmds( cmds ){
	// console.log('cmds =======  ',cmds);
	var classTypeButton = client.room ? client.room.type == 'hwatu' ? 'hwatu' : 'poker' : ''
	$('#cmds').removeClass('hwatu').removeClass('poker').addClass(classTypeButton)
	//// Get value when Betting ////////////////
	var value = 0
	if(cmds.raise) {
		value = 1000
		$('#bet').removeClass('centerElementButton')
	} else {
		$('#bet').addClass('centerElementButton')
		let msg = localStorage.getItem('msg')
		if(msg){
			msg = JSON.parse(msg)
			if(cmds.call && !cmds.check) {
				var seats = client.room.seats;
				var chips = client.room.chips;

				var index = client.room.seats.indexOf(client.uid)
				var greatest_value = 0
				for(var i = 0; i < seats.length; i++) {
					if(chips && chips[i] && chips[i] > 0) {
						greatest_value = chips[i] > greatest_value ? chips[i] : greatest_value
					} 
				}
				let balance = reFormatNumber(document.getElementById('balanceChange').innerHTML) // Get balance in profile update for call
				value = (greatest_value - chips[index]) > balance ? balance : (greatest_value - chips[index])
			} else if(!cmds.call && cmds.check) value = 0 
		} 
	}
	document.getElementById('bettingValue').innerHTML = nFormatter(Number(value));
	//// End get value when Betting ////////////////
	var v, div, btn, words, label, input;
	for(var k in cmds) {
		v = cmds[ k ];
		console.log('v==============',k)
		if(v === null) {
			//Add_new
			$('div#'+k).remove();
			$('button#'+k).remove();
		} else if(v === true) {
			if(k !== 'unseat' && k !=='games' && k !== 'logout' && k !== 'enter' && k !== 'entergame' && k !== 'say' && k!=='takeseat' && k!=='unseat') {
				btn = $('<button>').text(_T(k)).attr('id', k).attr('arg', 0).addClass('cmd'); //// Đổi games => Games 
				$('#cmds').append(btn);
			
				btn.on('click', onBtnClicked);
			}
		} else if(typeof v === 'string') {
			/////////////////////////// Input-Button Raise ////////////////
			words = v.split(',');
			if(words[0] === 'range'){
				//// input here ////
				div = $('<div>').attr('id',k).addClass('cmd').addClass(classTypeButton);
				$('#drag').append(div); ///////////////////////////////////////////
				input = $('<input>').attr('id', k).addClass('cmd');
				input.attr('type', 'range').attr('step', 1000);
				if(words[1]) {
					var min = parseInt(words[1]);
					input.attr('min', min).val(min);
				}
				if(words[2]) input.attr('max', parseInt(words[2]));
			} else {
				// console.log('1111111111111111')
				div = $('<div>').attr('id',k).addClass('cmd');
				$('#cmds').append(div);
				input = $('<input>').attr('id', k).addClass('cmd');
				switch(words[0]) {
				case 'number':
					input.attr('type', 'number').attr('size',5);
					if(words[1]) input.attr('min', parseInt(words[1]));
					if(words[2]) input.attr('max', parseInt(words[2]));
					break;
				case 'password':
					input.attr('type', 'password').attr('size',40);
					break;
				//case 'text':
				default:
					input.attr('type', 'text').attr('size',40);
					break;
				}
			}
			// // Off Chat
			if(k !== 'say'){
				/// change position button Raise
				if(k === 'raise'){
					var btnDe = $('<button>').attr('id', 'decrease').addClass('cmd');
					var btnIn = $('<button>').attr('id', 'increase').addClass('cmd');

					var divParentRaiseInput = $('<div>').addClass('parentRaiseInput');
					divParentRaiseInput.append(input)

					div.append(btnDe); // btn Decrease
					btnDe.on('click', decrement);
					
					div.append(divParentRaiseInput);
					
					// div.append(input);
					
					div.append(btnIn); // btn Increase
					btnIn.on('click', increment);

					btn = $('<button>').text(_T(k)).attr('id', k).addClass('cmd');
					$('#cmds').append(btn)
					btn.on('click', onInputBtnClicked);
					input.keydown(onInputBoxEnter);
				} else {
					div.append(input);
					btn = $('<button>').text(_T(k)).attr('id', k).addClass('cmd');
					div.append(btn);
					btn.on('click', onInputBtnClicked);
					input.keydown(onInputBoxEnter);
				}
			}
			
		} else if( Object.prototype.toString.call( v ) === '[object Array]' ) {
			div = $('<div>').attr('id',k).addClass('cmd');
			$('#cmds').append(div);
			for(var i=0; i<v.length; i++) {
				var arg = v[i];
				//off Button chat , jinhua1, jinhua2, holdem1, holdem2
				if(v[i] !== 'chat') {
					var t_arg = (typeof arg === 'string') ? _T(arg) : arg;
					if( arg === 'hwatu' || arg === 'holdem2'){
						// Add_new
						// btn = $('<button>').text(_T(k)+' '+ t_arg).attr('id', k).attr('arg', arg).addClass('cmd');

						$(`#${arg}`).empty()
						// btn = $('<button>').attr('id', k).attr('arg', arg).addClass('cmd').css('background-image', `url(imagesHomes/${arg}.png)`);
						btn = $('<button>').attr('id', k).attr('arg', arg).addClass('cmd');
						var img = $('<img>').attr('src', `imagesHomes/${arg}.png`);
						$('#loaderGame').css('display', 'none');
						$('#oddOrEven').css('display', 'block');
						$('#rcissorsRockPaper').css('display', 'block');
						$('#300Lotto').css('display', 'block');
						btn.append(img)
						$(`#${arg}`).append(btn)
						btn.on('click', onBtnClicked);
						// $(`button[arg=${arg}]`).attr('id', k).on('click', onBtnClicked)
					} else {
						btn = $('<button>').text(_T(k)+' '+ t_arg).attr('id', k).attr('arg', arg).addClass('cmd');
						div.append(btn);
						btn.on('click', onBtnClicked);
						// $(`button[arg=${arg}]`).attr('id', k).on('click', onBtnClicked)
					}
					
				}
			}
			
		} else if( typeof v === 'object' ) {
			btn = $('<button>').text(_T(k)).attr('id', k).addClass('cmd');
			$('#cmds').append(btn);
			
			var dlg = $('<div>').attr('id',k).addClass('dialog');
			$('body').append(dlg);
			dlg.hide();
			
			var dlgheader = $('<div>').addClass('dlgheader');
			dlg.append(dlgheader);
			dlgheader.append($('<span>').text(_T(k)));
			var X = $('<button>').text('X').attr('X', k).addClass('cmd');
			dlgheader.append(X);
			for(var j in v) {
				label = $('<label>').attr('for', j).text(_T(j)+':').addClass('cmd');
				input = $('<input>').attr('id', j).addClass(k).addClass('cmd');
				
				words = v[j].split(',');
				switch(words[0]) {
				case 'range':
					input.attr('type', 'range');
					if(words[1]) input.attr('min', parseInt(words[1]));
					if(words[2]) input.attr('max', parseInt(words[2]));
					break;
				case 'number':
					input.attr('type', 'number').attr('size',5);
					if(words[1]) input.attr('min', parseInt(words[1]));
					if(words[2]) input.attr('max', parseInt(words[2]));
					break;
				case 'password':
					input.attr('type', 'password').attr('size',40);
					break;
				//case 'text':
				default:
					input.attr('type', 'text').attr('size',40);
					break;
				}
				
				switch(j) { // auto fill if we remember uid & passwd
				case 'uid':
					var u = localStorage.getItem('x_userid');
					if(u) input.val(u);
					break;
				case 'passwd':
					var p = localStorage.getItem('x_passwd');
					if(p) input.val(p);
					break;
				}
				dlg.append(label).append(input).append('<br/>');
			}
			var dlgfooter = $('<div>').addClass('dlgfooter');
			dlg.append(dlgfooter);
			var OK = $('<button>').text('OK').attr('OK', k).addClass('cmd');
			dlgfooter.append(OK);
			
			btn.on('click', onDialogBtnClicked);
			OK.on('click', onDialogOKClicked);
			X.on('click', onDialogXClicked);

		} else {
			
		}
	}
}

function login(u, p) {
	client.rpc('login', {
		uid: u,
		passwd: p
	}, 
	function(err,ret){
		if(err) {
            localStorage.removeItem('x_userid');
		  	localStorage.removeItem('x_passwd');
			echo(ret);
			socket.emit('hello', {});
		} else {
			$('#messages').empty();
			$('div#cmds').empty();
			showRoom(null);

			localStorage.setItem('x_userid', u);
			localStorage.setItem('x_passwd', p);
			// addMsg(ret.token.uid + ' (' + ret.profile.name + ') ' + _T('login success'));
			
			console.log('========================JoinRoom=============================')
			client.rpc('entergame','holdem2', parseReply);
			// if(ret.cmds) {
			// 	updateCmds(ret.cmds);
			// 	if('entergame' in ret.cmds) {
			// 		list_games();
			// 	}
			// }
		}
	});
}

function list_games(){
	client.rpc('games', 0, function(err, ret){
		if(err) echo(ret);
		else {
			$('#roomname').text(_T('available games'));
			var list = $('#seats');
			list.empty();
			for(var i=0; i<(ret.length-5); i++) {
				var game = ret[i];
				var str = (i+1) + ', ' + _T_( game.id ) + ': ' + game.name + ' (' + game.desc + '), ' + game.rooms + ' rooms';
				list.append($('<li>').text(str));
			}
		}
	});
}

function list_rooms( gameid ) {
	client.rpc('rooms', gameid, function(err, ret){
		if(err) echo(ret);
		else {
			var list = $('#seats');
			list.empty();
			for(var i=0; i<ret.length; i++) {
				var room = ret[i];
				var str = 'room id: ' + room.id + 
					', name: "' + room.name +
					'", seats: ' + room.seats_taken + '/' + room.seats_count + 
					', gamers: ' + room.gamers_count;
				list.append($('<li>').text(str));
			}
		}
	});
}

function addMsg(str) {
	$('#messages').append($('<li>').text(str).addClass('msg'));
	var msgs = $('li.msg');
	var n = msgs.length - 20;
	if(n > 0) {
		for(var i=0; i<n; i++) {
			msgs[i].remove();
		}
	}
}

function echo(ret) {
	addMsg( JSON.stringify(ret) );
}

function echoReply(err, ret) {
	addMsg( JSON.stringify(ret) );
}

function parseReply(err, ret) {
	if(err) addMsg(ret);
	else if(ret.cmds) updateCmds(ret.cmds);
}

function showRoom(room) {
	$('#roomname').empty();
	$('#roomdesc').empty();
	$('#sharedcards').empty();
	$('#pot').empty();
	$('#countdown').empty();
	$('#seats').empty();
	$('.sum').empty();
	// $('#mycards').empty(); ///////////////////////
	if(! room) return;
	
	$('#roomname').text( _T('room number') + ': ' + room.id + ' (' + room.name + ')');
	
	var gamers = room.gamers;
	var seats = room.seats;
	var cards = room.cards;
	var chips = room.chips;
	$('#roomdesc').text(_T('gamers in room') + ': ' + Object.keys(gamers).join(', '));

	var restartGame = !!localStorage.getItem('restartGame') ? localStorage.getItem('restartGame') : ''
	var greatest_value = 0
	var valueChip = 0;

	
	
	for(var i=0, len=seats.length; i<len; i++) {
		var uid = seats[i];
		var g = uid ? gamers[ uid ] : null;
		var str = "#" + i + ': ';
		
		///////////////////////////////////////// SEATS ///////////////////////////////////////
		if(g) {
			str += g.uid + ' (' + g.name + ') [' + g.coins + ', ' + g.score + ', ' + g.exp + ', ' + g.level + ']';
			//new_code
			
			if(cards && cards[i]) {
				str += _T_('private cards') + '[ ' + Poker.visualize( cards[i] ) + ' ]';

				const arr = client && client.room && client.room.seats;
				const listCoins = client && client.room && client.room.listCoins;
				const newClientSeats = locationOfMeIntoCenter(arr,client.uid, listCoins);
				const locate = newClientSeats.findIndex(item => item.seat === i)
				//sound mp3 share card
				//Add_new_Tan
				const JustOnlySound = localStorage.getItem('JustOnlySound');

				if(!JustOnlySound && room && room.shared_cards && room.shared_cards.length === 0){
					localStorage.setItem('JustOnlySound', cards.length);
					$('#carteSoudCtrl1')[0].play();
				}
				
				if(g.uid === client.uid) {
					// $('#mycards').html(Poker.toHTML(cards[i], client) ); /// show bài ra ở đây
					if(restartGame){
						$('#mycards').html( Poker.toHTML([], client));
					} else {
						$('#mycards').html(Poker.toHTML(cards[i], client) ); /// show bài ra ở đây
					}
					
				} else {
					$(`#cards${locate}`).empty()
					if(restartGame){
						$(`#cards${locate}`).empty()
					} else {
						if(client && client.room.type === 'hwatu'){
							// console.log('cards[i]cards[i]cards[i]cards[i]cards[i]', cards[i])
							for(k = 0; k < cards[i].length; k++){
								$(`#cards${locate}`).append(`
									<img ${newClientSeats[locate].uid !== null ? 'src="imgCards_hwatu/0_0.png"':''}  alt="">
								`)
							}
							// $(`#cards${locate}`).append(`
							// 	<img ${newClientSeats[locate].uid !== null ? 'src="imgCards_hwatu/0_0.png"':''}  alt="">
							// `)
						}
						else{
							$(`#cards${locate}`).append(`
								<img ${newClientSeats[locate].uid !== null ? 'src="imgCards/0_0.png"':''}  alt="">
								<img ${newClientSeats[locate].uid !== null ? 'src="imgCards/0_0.png"':''}  alt="">
							`)
						}
					}
				}
			}

			if(chips && chips[i] && chips[i] > 0) {
				valueChip = chips[i]
				// $(`span#seat${i}`).html( nFormatter(Number(valueChip)) )

				if(restartGame){
					$(`span#seat${i}`).html('')
				}
				else {
					$(`span#seat${i}`).html( nFormatter(Number(valueChip)) )
				}
			} 
			///////////////////// Add get balanceChange ////////////////
			if( g.uid === client.uid ){
				document.getElementById('balance').innerHTML = formatNumber(Number(g.coins))
				document.getElementById('balanceChange').innerHTML = g.coins > 0 ? formatNumber(Number(g.coins)) : 0;
				
				// document.getElementById('balanceHome').innerHTML = formatNumber(Number(g.coins))
				document.getElementById('balanceChangeHome').innerHTML = formatNumber(Number(g.coins))
				// document.getElementById('balanceChangeHomePoker').innerHTML = formatNumber(Number(g.coins))

				document.getElementById('infoUserName').innerHTML = g.uid
				document.getElementById('infoUserNameHome').innerHTML = g.uid
				// document.getElementById('infoUserNameHomePoker').innerHTML = g.uid
			}
			/////////////////////////////////////////////////////////////////////////////
		} else {
			str += '(' + _T('empty') + ')';
		}
		$('#seats').append($('<li>').text(str).attr('id', 'seat'+i).addClass('seat'));
	}
	
	//new_code
	var fold = !!localStorage.getItem('fold') ? JSON.parse(localStorage.getItem('fold')) : []
	if(fold != []){
		const arr = client && client.room && client.room.seats;
		const listCoins = client && client.room && client.room.listCoins;
		const newClientSeats = locationOfMeIntoCenter(arr,client.uid, listCoins);
		var folder = client.room.type == 'hwatu' ? 'imgCards_hwatu' : 'imgCards'
		for (var i = 0; i < fold.length; i++) {
			const locateFold = newClientSeats.findIndex(item => item.seat === fold[i].seat)

			$(`#cards${locateFold}`).empty()
			if(folder == 'imgCards_hwatu'){
				var arrCard = client.room.cards[fold[i].seat]
				for(let k = 0; k < arrCard.length; k++){
					$(`#cards${locateFold}`).append(`<img src="${folder}/0_1.png"  alt="">`)
				}
			} else {
				$(`#cards${locateFold}`).append(`
					<img src="${folder}/0_1.png"  alt="">
					<img src="${folder}/0_1.png"  alt="">
				`)
			}

		// old code	
			// $(`#cards${locateFold}`).empty()
			// $(`#cards${locateFold}`).append(`
			// 	<img src="${folder}/0_1.png"  alt="">
			// 	<img src="${folder}/0_1.png"  alt="">
			// `)
		}
	}
	
	
	if(restartGame){
		
		$('#sharedcards').html( Poker.toHTML([], client));
	}
	else if(room.shared_cards) {
		if(client && client.room.type === 'hwatu'){
			$('#sharedcards').addClass('sharedcards')
		}
		
		$('#sharedcards').html( Poker.toHTML(room.shared_cards, client) );
	}

	if(room.pot) {
		$('#pot').text( _T('pot') + ': ' + room.pot );
	}
	$('.sum').append(`SUM ${nFormatter(Number(room.pot))}`)
	
}

function execCmd() {
	var cmd = $('#m').val() + '';
	if(cmd.length === 0) return false;
	$('#m').val('');
	$('#m').focus();
	
	var words = cmd.split(' ');
	switch(words[0]) {
	case 'clear':
		$('#seats').empty();
		$('#messages').empty();
		break;
	case 'fastsignup':
		client.rpc('fastsignup', 0, parseSignUpReply);
		break;
	case 'signup':
		client.rpc('signup', {
			uid: words[1],
			passwd: words[2]
		}, parseSignUpReply);
		break;
	case 'login':
		login(words[1], words[2]);
		break;
	case 'logout':
		client.rpc('logout', 0, parseReply);
		break;
	case 'games':
		list_games();
		break;
	case 'rooms':
		list_rooms( words[1] );
		break;
	case 'entergame':
		client.rpc('entergame', words[1], parseReply);
		break;
	case 'enter':
		client.rpc('enter', words[1], parseReply);
		break;
	case 'look':
		client.rpc('look', 0, function(err, ret){
			if(err) echo(ret);
			else {
				showRoom(ret);
			}
		});
		break;
	case 'exit':
		client.rpc('exit', 0, function(err, ret){
			if(err) echo(ret);
			else {
				echo(ret);
				showRoom(null);
				list_games();
			}
		});
		break;
	case 'takeseat':
		client.rpc('takeseat', words[1], parseReply);
		break;
	case 'unseat':
		client.rpc('unseat', 0, parseReply);
		break;
	case 'shout':
		words.shift();
		client.rpc('shout', words.join(' '), parseReply );
		break;
	case 'say':
		words.shift();
		client.rpc('say', words.join(' '), parseReply );
		break;
	default:
		//client.say( cmd, parseReply );
	}
}

},{"../lib/client":2,"../lib/holdem_poker":3,"../lib/jinhua_poker":4,"../lib/poker":5}],2:[function(require,module,exports){
exports = module.exports = Client;

function Client( socket ) {	
	this.uid = null;
	this.pin = null;
	this.profile = {};
	this.events = {};
	this.room = null;
	this.cmds = {};
	
	this.setUplink( socket );
}

Client.prototype.setUplink = function(socket) {
	var client = this;
	client.uplink = socket;
	if(! socket.gamers) {
		
		socket.gamers = {};
		socket.gamers_count = 0;
		socket.rpc_seq = 0;
		socket.rpc_callbacks = {};
		
		socket.on('notify', function( msg ){ // { uid:x, e:xx, args:xxx }
			
			// console.log('=====================msg======================', msg)
			// console.log('====================client====================', client)
			
			if(msg.e !== 'countdown'){
				// console.log('=====================msg======================', msg)
				console.log('====================client====================', client)
			}
			
			changeAction(client, msg)
			checkTakeseat(client, msg)
			
			if(msg.e === 'enter'){
				activeGameAfterChoose(client.room.type)
			}

			if(msg.e === 'countdown') {
				//new_code
				const arr = client && client.room && client.room.seats;
				const listCoins = client && client.room && client.room.listCoins;
				const newClientSeats = locationOfMeIntoCenter(arr,client.uid, listCoins);
				if(client.room.type == 'holdem2'){
					for(let i =0 ; i < newClientSeats.length; i++){
						if(document.getElementById(`money${newClientSeats[i].seat}`)) document.getElementById(`money${newClientSeats[i].seat}`).innerHTML = newClientSeats[i].coins !== null ? formatNumber(newClientSeats[i].coins) : '';
					}
					changeImageActive(newClientSeats, msg)
				} else {
					for(let i =0 ; i < newClientSeats.length; i++){
						if(document.getElementById(`money${newClientSeats[i].seat}`)) document.getElementById(`money${newClientSeats[i].seat}`).innerHTML = newClientSeats[i].coins !== null ? formatNumber(newClientSeats[i].coins) : '';
					}
					changeImageActive_Hwatu(newClientSeats, msg)
				}
			}
			
			if(msg.e === 'restartGame'){
				localStorage.removeItem("Win");
				localStorage.removeItem("fold");
				localStorage.removeItem("leave");
				$('#sharedcards').empty()
				$('.sum').empty()
				$('.sum').append(`SUM 0`);
				localStorage.setItem('restartGame', 'restartGame')
			}
			
			if(msg.e === 'takeseat') {
				var item = {uid: msg.args.uid, seat: msg.args.where}
				localStorage.setItem("takeseat", JSON.stringify(item));
				
				const arr = client && client.room && client.room.seats;
				const listCoins = client && client.room && client.room.listCoins;
				const newClientSeats = locationOfMeIntoCenter(arr, client.uid, listCoins);
				if(msg.args.uid === client.uid){
					var takeseat = []
					var me = {uid: msg.args.uid, seat: msg.args.where}
					takeseat.push(me)
					localStorage.setItem('takeseat', JSON.stringify(takeseat))
				} else {
					var locationFold = newClientSeats.findIndex(item => item.seat === msg.args.where);
					document.getElementById(`actionSeat${ locationFold }`).innerHTML = 'Watting'
					if(client.room.type == 'holdem2'){
						$(`#active${locationFold}`).removeClass().addClass(`${locationFold < 3 ? 'usersTopReady':'usersBottomReady'}`)
					} else {
						$(`#active${locationFold}`).removeClass().addClass(`${locationFold < 3 ? 'usersTopReadyHwatu':'usersBottomReadyHwatu'}`)
					}
					$(`#active${locationFold} .${locationFold < 3 ? 'infoTop':'infoBottom'} .name .userName`).empty()
					$(`#active${locationFold} .${locationFold < 3 ? 'infoTop':'infoBottom'} .name .userName`).append(msg.args.uid)
				}
			}
			if(msg.e === 'leave'){
				localStorage.removeItem(`${client.uid}`)
				if(msg.args.uid == client.uid){
					$('body').removeClass().addClass('bodyHomes')
					if(client.room.type == 'holdem2') $('.balance').addClass('balanceHomes').removeClass('balance')
					else $('.balanceHwatu').addClass('balanceHomes').removeClass('balanceHwatu')
				}
			}
			
			//add_new
			if(msg.e === 'Win') {
				var arr = client && client.room && client.room.seats;
				var listCoins = client && client.room && client.room.listCoins;
				var newClientSeats = locationOfMeIntoCenter(arr,client.uid, listCoins);
				var listBettingInGame = msg.args.listBettingInGame ? msg.args.listBettingInGame : [];
				if(client.room.type == 'holdem2' && !msg.moreWinner){
					writeHTMLEndGame(newClientSeats, client, msg, listBettingInGame)
				} else {
					writeHTMLEndGame_Hwatu(newClientSeats, client, msg, listBettingInGame)
				}
				
				localStorage.setItem('Win', 'Win');
				$('#carteSoudCtrl2')[0].play();
				localStorage.removeItem('JustOnlySound');
				localStorage.removeItem('cardsChange');
			}
			if(msg.e === 'DrawHwatu') {
				console.log('DrawHwatu=================>', msg)
				var arr = client && client.room && client.room.seats;
				var listCoins = client && client.room && client.room.listCoins;
				var newClientSeats = locationOfMeIntoCenter(arr,client.uid, listCoins);
				var listBettingInGame = msg.args.listBettingInGame ? msg.args.listBettingInGame : [];
			
				writeHTMLDrawGame_Hwatu(newClientSeats, client, msg, listBettingInGame)
				
				localStorage.setItem('Win', 'Win');
				$('#carteSoudCtrl2')[0].play();
				localStorage.removeItem('JustOnlySound');
				localStorage.removeItem('cardsChange');
			}
			
			if(msg.e === 'ready') {
				var Win = !!localStorage.getItem('Win') ? localStorage.getItem('Win') : ''
				if(!Win){
					const arr = client && client.room && client.room.seats;
					const listCoins = client && client.room && client.room.listCoins;
					const newClientSeats = locationOfMeIntoCenter(arr,client.uid, listCoins);
					// console.log('newClientSeats', newClientSeats)
					if(client.room.type == 'holdem2'){
						handleNewWriteHTML(newClientSeats, client)
						changeImageActive(newClientSeats, msg)
					} else {
						handleNewWriteHTML_Hwatu(newClientSeats, client)
						changeImageActive_Hwatu(newClientSeats, msg)
					}
				}
			}

			if(msg.e === 'gamestart') {
				localStorage.removeItem("restartGame");
				localStorage.removeItem("Win");
				localStorage.removeItem("fold");
				localStorage.removeItem("leave");
				
				//new_code
				const arr = client && client.room && client.room.seats;
				const listCoins = client && client.room && client.room.listCoins;
				const newClientSeats = locationOfMeIntoCenter(arr,client.uid, listCoins);
				if(client.room.type == 'holdem2'){
					handleNewWriteHTML(newClientSeats, client)
					changeImageActive(newClientSeats, msg)
				} else {
					handleNewWriteHTML_Hwatu(newClientSeats, client)
					changeImageActive_Hwatu(newClientSeats, msg)
				}
			}
			
			//add_new
			if(msg.e === 'gamesUpdateMoney') {
				// Update bance
				var user = client.room.gamers[client.uid]
				document.getElementById('balance').innerHTML = formatNumber(Number(user.coins))
				document.getElementById('balanceChange').innerHTML =user.coins > 0 ? formatNumber(Number(user.coins)) : 0;

				// document.getElementById('balanceHome').innerHTML = formatNumber(Number(user.coins))
				document.getElementById('balanceChangeHome').innerHTML = formatNumber(Number(user.coins))
				// document.getElementById('balanceChangeHomePoker').innerHTML = formatNumber(Number(user.coins))
				
				// Show cards all user
				if(client.room.shared_cards.length === 5){
					for(var j = 0; j < Object.entries(client.room.cards).length; j++){
						var html = '';
						var cards = client.room.cards[j]

						var numberCardLeave = ''
						var folder = client.room.type == 'hwatu' ? 'imgCards_hwatu' : 'imgCards'
						for(var i = 0; i < cards.length; i++) {
							if(client.room.type == 'hwatu'){
								numberCardLeave = cards[i]
								var card = cards[i];
								var png = card + '.png';
								html += "<img src='imgCards_hwatu/" + png + "' style='margin-left: 4px;'/>";
							}
							else {
								var card = cards[i];
								var color = card >> 4;
								numberCardLeave = color
								var number = card & 0xf;
								var png = color + '_' + number + '.png';
								html += "<img src='imgCards/" + png + "' style='margin-left: 4px;'/>";
							}
						}
						
						var arr = client && client.room && client.room.seats;
						const listCoins = client && client.room && client.room.listCoins;
						var newClientSeats = locationOfMeIntoCenter(arr,client.uid, listCoins);
						const location = newClientSeats.findIndex(item => item.seat === j);

						if(client.room.type == 'hwatu'){
							if(numberCardLeave != 0) $(`#mycards${location}`).html(html);
						} else {
							if(numberCardLeave != 0) $(`#mycards${location}`).html(html);
						}
						
						var fold = !!localStorage.getItem('fold') ? JSON.parse(localStorage.getItem('fold')) : []
						if(fold.length > 0){
							var folder = client.room.type == 'hwatu' ? 'imgCards_hwatu' : 'imgCards'
							for (var i = 0; i < fold.length; i++) {
								const indexFold = newClientSeats.findIndex(item => item.seat === fold[i].seat);
								$(`#mycards${indexFold}`).empty()
								if(folder == 'imgCards_hwatu'){
									var arrCard = client && client.room && client.room.cards[fold[i].seat]
									for(let k = 0; k < arrCard.length; k++){
										$(`#mycards${indexFold}`).append(`<img src="${folder}/0_1.png"  alt="">`)
									}
								} else {
									$(`#mycards${indexFold}`).append(`
										<img src="${folder}/0_1.png"  alt="" style='margin-left: 4px;'>
										<img src="${folder}/0_1.png"  alt="" style='margin-left: 4px;'>
									`)
								}
							}
						}
					}
				}
			} 
			// Get time
			localStorage.setItem(`${client.uid}`, msg.args.sec ? msg.args.sec : 'null')
			seconds = localStorage.getItem(`${client.uid}`)
			//Add_new_Tan
			if(client && client.room && client.room.type === 'hwatu'){
				if(seconds <= 15){
					for (var i = 15; i >= seconds; i--) { 
						msg.e === 'countdown' && $('#carteSoudCtrl')[0].play();
						$(`#timecountDown${i}`).css('background', `#c5bebe`)
					}
				} else {
					for (var i = 15; i > 0; i--) { 
						msg.e === 'countdown' && $('#carteSoudCtrl')[0].play();
						$(`#timecountDown${i}`).css('background', `#050000`)
					}
				}
			}
			else{
				if(seconds <= 15){
					for (var i = 15; i >= seconds; i--) { 
						msg.e === 'countdown' && $('#carteSoudCtrl')[0].play();
						$(`#timecountDown${i}`).css('background', `#050000`)
					}
				} else {
					for (var i = 15; i > 0; i--) { 
						msg.e === 'countdown' && $('#carteSoudCtrl')[0].play();
						$(`#timecountDown${i}`).css('background', `#c5bebe`)
					}
				}
			}
			
			
			if(! msg) return;
			if(typeof msg !== 'object') return;
			var event = msg.e;
			if(! event) return;
			
			var args = msg.args;
			var target;
			if(msg.uid) {
				target = socket.gamers[ msg.uid ];
				if(target) target.onNotify( event, args );
			} else {
				var gamers = socket.gamers;
				for(var uid in gamers) {
					target = gamers[ uid ];
					if(target) target.onNotify( event, args );
				}
			}
		});
		
		socket.on('rpc_ret', function(reply){
			
			// if(socket.log_traffic) console.log('rpc_ret ============> ', reply);
			
			if(reply.ret.token && reply.ret.profile) {
				document.getElementById('balance').innerHTML = formatNumber(Number(reply.ret.profile.coins))
				document.getElementById('balanceChange').innerHTML =reply.ret.profile.coins > 0 ? formatNumber(Number(reply.ret.profile.coins)) : 0;

				// document.getElementById('balanceHome').innerHTML = formatNumber(Number(reply.ret.profile.coins))
				document.getElementById('balanceChangeHome').innerHTML = formatNumber(Number(reply.ret.profile.coins))
				// document.getElementById('balanceChangeHomePoker').innerHTML = formatNumber(Number(reply.ret.profile.coins))

				document.getElementById('infoUserName').innerHTML = reply.ret.profile.uid
				document.getElementById('infoUserNameHome').innerHTML = reply.ret.profile.uid
				// document.getElementById('infoUserNameHomePoker').innerHTML = reply.ret.profile.uid
			}
			
			if(reply.err) {
				$(".popup-err").toggle()
				$('#message').empty()
				$('#message').append(` 
                    <div class="messagesContent">${reply.ret}</div>
				`)
				setTimeout(()=>{ $(".popup-err").hide() }, 5000)
			}
			
			if(reply && reply.seq) {
				var seq = reply.seq, err = reply.err, ret = reply.ret;
				var callback = socket.rpc_callbacks[ seq ];
				if(callback) {
					if(! err) {
						if(ret && ret.cmds) {
							client.filterCmds( ret.cmds );
						}
					}
					var func = callback.func;
					if(typeof func === 'function') func(err, ret);
					
					delete socket.rpc_callbacks[ seq ];
				}
			}
		});
	}
	
	client.uid = ++ socket.rpc_seq;
	// console.log('client ==================> setUplink',client)
	socket.gamers[ client.uid ] = client;
	return this;
};

Client.prototype.on = function(event, func) {
	// if(event === 'prompt') console.log('Client On', {event, func})
	this.events[ event ] = func;
	return this;
};

Client.prototype.filterCmds = function(cmds) {
	for(var i in cmds) {
		if(cmds[i] !== null) this.cmds[i] = 1;
	}
	var login = cmds.login;
	var signup = cmds.signup;
	var fastsignup = cmds.fastsignup;
	if(login) {
		for(i in this.cmds) {
			cmds[i] = null;
		}
		cmds.login = login;
		if(signup) cmds.signup = signup;
		if(fastsignup) cmds.fastsignup = fastsignup;
	}
	for(i in this.cmds){
		if(this.cmds[i] === null) delete this.cmds[i];
	}
};

Client.prototype.onNotify = function(event, args) {
	switch(event) {
	case 'prompt':
		this.filterCmds(args);
		break;
	case 'look':
		this.room = args;
		break;
	case 'enter':
		this.room.gamers[ args.who.uid ] = args.who;
		break;
	case 'leave':
		args.who = this.room.gamers[ args.uid ];
		break;
	case 'takeseat':
		this.room.seats[ args.where ] = args.uid;
		args.who = this.room.gamers[ args.uid ];
		break;
	case 'unseat':
		this.room.seats[ args.where ] = null;
		args.who = this.room.gamers[ args.uid ];
		break;
	case 'say':
		args.who = this.room.gamers[ args.uid ];
		break;
	case 'refresh':
		var uid = args.uid;
		if(uid === this.uid) {
			this.profile = args.profile;
		}
		var room = this.room;
		if(room && (uid in room.gamers)) {
			room.gamers[ uid ] = args.profile;
		}
	}
	
	var func;
	if(typeof (func = this.events[event]) === 'function') {
		func(args);
	} else if(typeof (func = this.events['else']) === 'function') {
		func(args);
	}
	
	switch(event) {
	case 'bye':
		this.pin = null;
		this.profile = {};
		this.room = null;
		this.cmds = {};
		break;
	}
};

Client.prototype.removeUplink = function() {
	var socket = client.uplink;
	if(socket) {
		client.socket = null;
		delete socket.gamers[ this.uid ];
		socket.gamers_count --;
	}
	
	return this;
};

/*
 * accepted methods and args:
 * 
 * signup, {uid, passwd, name, email, phone, uuid}
 * login, {uid, passwd}
 * logout, 0
 * 
 * games, 0
 * rooms, gameid
 * shout, msg
 * entergame, gameid
 * enter, roomid
 * say, msg
 * look, 0
 * takeseat, seat or ''
 * unseat, 0
 * leave, 0
 * 
 * follow, 0
 * addchip, n
 * giveup, 0
 * pk, uid
 * checkcard, 0
 * showcard, 0
 * 
 */

Client.prototype.rpc = function(method, args, func) {

	console.log('method, args, func', {method, args, func})

	var client = this;
	var socket = client.uplink;
	
	if(typeof func !== 'function') {
		throw 'need a callback func(err,ret)';
	}

	var callback_func = func;
	switch(method) {
	case 'fastsignup':
	case 'signup':
		break;
	case 'login':
		callback_func = function(err, ret){
			if(! err) {
				if(client.uid !== ret.token.uid) {
					delete socket.gamers[ client.uid ];
				}
				
				client.uid = ret.token.uid;
				client.pin = ret.token.pin;
				client.profile = ret.profile;
				
				socket.gamers[ client.uid ] = client;
			}
			func(err, ret);
		};
		break;
	default:
		if(! client.pin) {
			func(400, 'need login first');
			return this;
		}
	}
	
	var callback = {
			seq: ++ socket.rpc_seq,
			func: callback_func,
			t: Date.now()
		};
	socket.rpc_callbacks[ callback.seq ] = callback;
	
	if(method === 'JoinRoom') {
		var req = {
			seq: callback.seq,
			// uid: localStorage.getItem('userId'),
			uid : client.uid,
			pin: client.pin,
			token: localStorage.getItem('token'),
			f: method,
			args: args.name,
			roomid : args.roomid
		};
		socket.emit('rpc', req);

		return this;
	}
	if(method === 'check') {
		var balanceChange = document.getElementById('balance').innerHTML
		balanceChange = reFormatNumber(balanceChange)
		document.getElementById('balanceChange').innerHTML =balanceChange > 0 ? formatNumber(balanceChange) : 0;
	}

	var req = {
		seq: callback.seq,
		// uid: localStorage.getItem('userId'),
		uid : client.uid,
		pin: client.pin,
		token: localStorage.getItem('token'),
		f: method,
		args: args
	};
	console.log('socket ====> ***** <====', req)
	socket.emit('rpc', req);
	

	if(socket.log_traffic) console.log('rpc', req);
	
	return this;
};


},{}],3:[function(require,module,exports){
var Poker = require('./poker');

var POKER_CARDS = Poker.CARDS;

var HIGH_CARD		= 1, // 高牌, AQ953
	ONE_PAIR		= 2, // 一对, KK854
	TWO_PAIR		= 3, // 两对, KKJJ9
	THREE			= 4, // 三条, KKK98
	STRAIGHT		= 5, // 顺子, 98765
	FLUSH			= 6, // 同花, 
	FULLHOUSE		= 7, // 葫芦, KKK99
	FOUR			= 8, // 四条, KKKK9
	STRAIGHT_FLUSH	= 9, // 同花顺, 98765
	ROYAL_FLUSH		= 10; // 皇家同花顺, AKQJ10

var HOLDEM_PATTERNS = {
	0: 'invalid',		// 错误
	1: 'high card',		// 高牌
	2: 'one pair',		// 一对
	3: 'two pair',		// 两对
	4: 'three of a kind', // 三条
	5: 'straight', 		// 顺子
	6: 'flush', 		//  同花
	7: 'fullhouse', 	// 葫芦
	8: 'four of a kind', // 四条
	9: 'straight flush', // 同花顺
	10: 'royal flush' 	// 皇家同花顺
};

var Holdem = {
	HIGH_CARD: 		1,
	ONE_PAIR: 		2,
	TWO_PAIR: 		3,
	THREE: 			4,
	STRAIGHT: 		5,
	FLUSH: 			6,
	FULLHOUSE: 		7,
	FOUR: 			8,
	STRAIGHT_FLUSH: 9,
	ROYAL_FLUSH: 	10,
	
	PATTERNS: HOLDEM_PATTERNS,
};

exports = module.exports = Holdem;

Holdem.sort = function(cards) {
	if(cards.length != 5) return cards;
	Poker.sortByNumber(cards);

	var n0 = cards[0] & 0xf,
		n1 = cards[1] & 0xf,
		n2 = cards[2] & 0xf,
		n3 = cards[3] & 0xf,
		n4 = cards[4] & 0xf;
	
	var d0 = n0 - n1,
		d1 = n1 - n2,
		d2 = n2 - n3,
		d3 = n3 - n4;


	if((d1 === 0) && (d2 === 0)) {
		if(d0 === 0) { 
			// XXXXM
		} else if(d3 === 0) { 
			// MXXXX -> XXXXM
			cards.push( cards.shift() );
		} else { 
			// MXXXN
			var c0 = cards.shift();
			cards.splice(3, 0, c0);
		}
	} else if((d0 === 0) && (d1 === 0)) { 
		// XXXMN, or XXXMM
	} else if((d2 === 0) && (d3 === 0)) { 
		// MNXXX -> XXXMN
		cards.push( cards.shift() );
		cards.push( cards.shift() );
	} else if((d0 === 0) && (d2 === 0)) {   //edit by kalbas d1->d2
		// XXYYM
	} else if((d0 === 0) && (d3 === 0)) {
		// XXMYY -> XXYYM
		var c2 = cards[2];
		cards.splice(2, 1);
		cards.push( c2 );
	} else if((d1 === 0) && (d3 === 0)) {
		// MXXYY -> XXYYM
		cards.push( cards.shift() );
	} else if(d0 === 0) {
		// XXABC
	} else if(d1 === 0) {
		// AXXBC -> XXABC
		var c_0 = cards.shift();
		cards.splice(2, 0, c_0);
	} else if(d2 === 0) {
		// ABXXC -> XXABC
		var c_2 = cards[2], c_3 = cards[3];
		cards.splice(2, 2);
		cards.unshift(c_3);
		cards.unshift(c_2);
	} else if(d3 === 0) {               //edit by kalbas added d3 condition
		// ABCXX -> XXABC
		cards.push( cards.shift() );
		cards.push( cards.shift() );
		cards.push( cards.shift() );
	} else {
		// ABCDE
	}
	
	return cards;
};

Holdem.rank = function(cards) {
	if(cards.length != 5) return 0;
	Holdem.sort(cards);
	
	var c0 = cards[0] >> 4,
		c1 = cards[1] >> 4,
		c2 = cards[2] >> 4,
		c3 = cards[3] >> 4,
		c4 = cards[4] >> 4;
		
	var n0 = cards[0] & 0xf,
		n1 = cards[1] & 0xf,
		n2 = cards[2] & 0xf,
		n3 = cards[3] & 0xf,
		n4 = cards[4] & 0xf;

	var d0 = n0 - n1,
		d1 = n1 - n2,
		d2 = n2 - n3,
		d3 = n3 - n4;
	
	var isFlush = ((c0 === c1) && (c1 === c2) && (c2 === c3) && (c3 === c4));
	var isStraight;
	
	if ((n0 === 14) && (d0 === 9)){
	    isStraight = ((n0 === 14) && (d0 === 9) && (d1 === 1) && (d2 === 1) && (d3 === 1)); // edited by kalbas A 5 4 3 2 1 straight
	} else {
	    isStraight = ((d0 === 1) && (d1 === 1) && (d2 === 1) && (d3 === 1));
	}
	
	var rank = (n0 << 16) | (n1 << 12) | (n2 << 8) | (n3 << 4) | n4;
	
	//edit by kalbas
	//if we face an A5432 straight we should n0=1 and then calculate the rank
	if ((n0 === 14) && (d0 === 9) && (d1 === 1) && (d2 === 1) && (d3 === 1)) {
	    var exceptionaln0 = 1;
	    rank = (exceptionaln0 << 16) | (n1 << 12) | (n2 << 8) | (n3 << 4) | n4;
	}
	//end edit by kalbas
	
	var pattern = 0;
	
	if(isFlush && isStraight) {
		if(n4 === 10) { // Poker.NUMBER_RANK['A'] // edited by kalbas, n0=14 can be A5432 too, we use n4=11=jack
			pattern = ROYAL_FLUSH;
		} else {
			pattern = STRAIGHT_FLUSH;
		}
	} else if((d0 === 0) && (d1 === 0) && (d2 === 0)) {
		pattern = FOUR;
		
	} else if((d0 === 0) && (d1 === 0) && (d3 === 0)) {
		pattern = FULLHOUSE;
		
	} else if(isFlush) {
		pattern = FLUSH;
		
	} else if(isStraight) {
		pattern = STRAIGHT;
		
	} else if((d0 === 0) && (d1 === 0)) {
		pattern = THREE;
		
	} else if((d0 === 0) && (d2 === 0)) {
		pattern = TWO_PAIR;
		
	} else if((d0 === 0)) {
		pattern = ONE_PAIR;
		
	} else {
		pattern = HIGH_CARD;
	}
	
	return (pattern << 20) | rank;
};

/*
 * 如有两名以上的牌手在最后一轮下注结束时仍未盖牌，则须进行斗牌。
 * 斗牌时，每名牌手以自己的两张底牌，加上桌面五张公共牌，共七张牌中，取最大的五张牌组合决定胜负.
 * 当中可包括两张或一张底牌，甚至只有公共牌。
 */
Holdem.maxFive = function(private_cards, shared_cards) {
	var cards = Poker.sort( Poker.merge( Poker.clone(private_cards), shared_cards ) );
	var len = cards.length;
	if(len < 5 || len > 7 ) return null;
	
	var maxrank = 0, maxcards = null, i, j, tmp, tmprank;
	
	if(len === 5) {
		return cards;
		
	} else if(len === 6) {
		for(j=0; j<6; j++) {
			tmp = Poker.clone(cards);
			tmp.splice(j, 1);
			tmprank = Holdem.rank( tmp );
			if(tmprank > maxrank) {
				maxrank = tmprank;
				maxcards = tmp;
			}
		}
		
	} else if(len === 7) {
		/*
		for(i=0; i<7; i++) {
			for(j=0; j<6; j++) {
				tmp = Poker.clone(cards);
				tmp.splice(i, 1);
				tmp.splice(j, 1);
				tmprank = Holdem.rank( tmp );
				if(tmprank > maxrank) {
					maxrank = tmprank;
					maxcards = tmp;
				}
			}
		}
		*/
		
		
		// edit start by kalbas 
		// we rank only board cards at first, all 5 of them
		
		tmprank = Holdem.rank( shared_cards );
		if(tmprank > maxrank) {
					maxrank = tmprank;
					maxcards = shared_cards;
		}
		
		// we rank 1st hole card + 4 board cards
		
		for(j=0; j<5; j++) {
		    tmp = Poker.clone( shared_cards );
		    tmp.splice(j,1);
		    tmp.push( private_cards[0] );
		    tmprank = Holdem.rank( tmp );
		    if(tmprank > maxrank) {
					maxrank = tmprank;
					maxcards = tmp;
		    }
		}
		
		// we rank 2nd hole card + 4 board cards
		
		for(j=0; j<5; j++) {
		    tmp = Poker.clone( shared_cards );
		    tmp.splice(j,1);
		    tmp.push( private_cards[1] );
		    tmprank = Holdem.rank( tmp );
		    if(tmprank > maxrank) {
					maxrank = tmprank;
					maxcards = tmp;
		    }
		}
		
		// we rank two hole cards + 3 board cards
		
		var iii = [1,1,1,1,1,1,2,2,2,3];
		var jjj = [2,2,2,3,3,4,3,3,4,4];
		var kkk = [3,4,5,4,5,5,4,5,5,5];
		
		/*
		There are 10 ways to choose 3
		cards out of 5, (5x4x3)/(3x2x1)
		
		123(45) 124(35) 125(34) 134(25)
		135(24) 145(23) 234(15) 235(14)
		245(13) 345(12) therefore:
		
		push : iii[n] + jjj[n] + kkk[n]
		and then add two hole cards
		*/
		
		for(j=0; j<10; j++) {
    		tmp = [];
    		tmp.push( shared_cards[iii[j]-1] );
    		tmp.push( shared_cards[jjj[j]-1] );
    		tmp.push( shared_cards[kkk[j]-1] );
    		tmp.push( private_cards[0] );
    		tmp.push( private_cards[1] );
    		tmprank = Holdem.rank( tmp );
    		if(tmprank > maxrank) {
    		    maxrank = tmprank;
    			maxcards = tmp;
    		}
		}
		cards = maxcards;
		console.log(Poker.visualize(cards)+' : '+Holdem.patternString(cards)); // result
		// end edit by kalbas
		
	}
	console.log('maxcards', maxcards)
	return maxcards;
};

Holdem.pattern = function(cards) {
	return Holdem.rank(cards) >> 20;
};

Holdem.patternString = function(cards) {
	return HOLDEM_PATTERNS[ Holdem.rank(cards) >> 20 ];
};

Holdem.compare = function(a, b) {
	return Holdem.rank(a) - Holdem.rank(b);
};

Holdem.view = function(cards) {
	var rank = Holdem.rank(cards);
	var pattern = rank >> 20;
	var str = Poker.visualize(cards).join(',') + ' -> ' + HOLDEM_PATTERNS[ pattern ] + ', rank:' + rank;
	console.log( str );
};


},{"./poker":5}],4:[function(require,module,exports){
var Poker = require('./poker');

var POKER_CARDS = Poker.CARDS;

var HIGH_CARD		= 1, // 单张
	PAIR			= 2, // 对子
	STRAIGHT		= 3, // 顺子
	FLUSH			= 4, // 同花
	STRAIGHT_FLUSH	= 5, // 同花顺
	THREE			= 6; // 豹子

var JINHUA_PATTERNS = {
	0: 'invalid',
	1: 'danzhang',
	2: 'duizi',
	3: 'shunzi',
	4: 'tonghua',
	5: 'tonghuashun',
	6: 'baozi'
};

var Jinhua = {
	HIGH_CARD: 	1,
	PAIR: 		2,
	STRAIGHT: 	3,
	FLUSH: 	4,
	STRAIGHT_FLUSH: 5,
	THREE: 		6,
	
	PATTERNS: JINHUA_PATTERNS,
};

exports = module.exports = Jinhua;

Jinhua.sort = function(cards) {
	if(cards.length != 3) return cards;
	Poker.sortByNumber(cards);
	
	var n1 = cards[1] & 0xf, n2 = cards[2] & 0xf;
	if(n1 === n2) { // avoid pair at end
		cards.push( cards.shift() );
	}
	return cards;
};

Jinhua.rank = function(cards) {
	if(cards.length != 3) return 0;
	Jinhua.sort(cards);
	
	var c0 = cards[0] >> 4, c1 = cards[1] >> 4, c2 = cards[2] >> 4;
	var n0 = cards[0] & 0xf, n1 = cards[1] & 0xf, n2 = cards[2] & 0xf;
	var d0 = n0 - n1, d1 = n1 - n2;
	
	var rank = (n0 << 8) | (n1 << 4) | n2;
	var pattern = 0;
	
	if((d0 === 0) && (d1 === 0)) {
		pattern = THREE;
		
	} else if((c0 === c1) && (c1 === c2)) {
		if((d0 === 1) && (d1 === 1)) {
			pattern = STRAIGHT_FLUSH;
			
		} else {
			pattern = FLUSH;
		}
		
	} else if((d0 === 1) && (d1 === 1)) {
		pattern = STRAIGHT;
		
	} else if((d0 === 0) || (d1 === 0)) {
		pattern = PAIR;
		
	} else {
		pattern = HIGH_CARD;
	}

	return (pattern << 12) | rank;
};

Jinhua.pattern = function(cards) {
	return Jinhua.rank(cards) >> 12;
};

Jinhua.patternString = function(cards) {
	return JINHUA_PATTERNS[ Jinhua.rank(cards) >> 12 ];
};

Jinhua.compare = function(a, b) {
	return Jinhua.rank(a) - Jinhua.rank(b);
};

Jinhua.view = function(cards) {
	var rank = Jinhua.rank(cards);
	var pattern = rank >> 12;
	var str = Poker.visualize(cards).join(',') + ' -> ' + JINHUA_PATTERNS[ pattern ] + ', rank:' + rank;
	console.log( str );
};


},{"./poker":5}],5:[function(require,module,exports){

var POKER_COLORS = {
	4: '♠', 		// spade
	3: '♥', 	// heart
	2: '♣', 	// club
	1: '♦' 		// diamond
};

var POKER_NUMBERS = {
	14 : 'A',
	13 : 'K',
	12 : 'Q',
	11 : 'J',
	10 : '10',
	9 : '9',
	8 : '8',
	7 : '7',
	6 : '6',
	5 : '5',
	4 : '4',
	3 : '3',
	2 : '2',
	0 : '?'
};

var POKER_NUMBER_RANK = {
	'A': 14,
	'K': 13,
	'Q': 12,
	'J': 11,
	'10': 10,
	'9': 9,
	'8': 8,
	'7': 7,
	'6': 6,
	'5': 5,
	'4': 4,
	'3': 3,
	'2': 2,
	'?': 0,
	'': 0
};

var POKER_COLOR_RANK = {
	'S': 4,
	'H': 3,
	'C': 2,
	'D': 1,
	'': 0
};

var RED_JOKER = (6 << 4) | 15;
var BLACK_JOKER = (5 << 4) | 15;

var POKER_CARDS = {};
for(var color=1; color<=4; color++) {
	for(var number=2; number<=14; number++) {
		var card = (color << 4) | number;
		POKER_CARDS[ card ] = POKER_NUMBERS[ number ] + '' + POKER_COLORS[ color ];
	}
}
POKER_CARDS[ RED_JOKER ] = '@';
POKER_CARDS[ BLACK_JOKER ] = '*';
POKER_CARDS[ 0 ] = '?';

exports = module.exports = Poker;

function Poker(str){
	if(typeof str === 'string') {
		var c = POKER_COLOR_RANK[ str.charAt(0) ];
		var n = POKER_NUMBER_RANK[ str.substring(1) ];
		if(c && n) {
			return (c << 4) | n;
		} else {
			return 0;
		}
	} else if(typeof str === 'object') {
		var cards = [];
		for(var i=0; i<str.length; i++) {
			cards.push( Poker(str[i]) );
		}
		return cards;
	} else {
		return 0;
	}
}

Poker.RED_JOKER = RED_JOKER;
Poker.BLACK_JOKER = BLACK_JOKER;
	
Poker.SPADE = 4;
Poker.HEART = 3;
Poker.CLUB	= 2;
Poker.DIAMOND = 1;
	
Poker.COLORS = POKER_COLORS;
Poker.NUMBERS = POKER_NUMBERS;
Poker.CARDS = POKER_CARDS;
Poker.NUMBER_RANK = POKER_NUMBER_RANK;

Poker.visualize = function( cards ) {
	if(typeof cards === 'number') return POKER_CARDS[ cards ];
	
	var v_cards = [];
	for(var i=0, len=cards.length; i<len; i++) {
		v_cards.push( POKER_CARDS[ cards[i] ] );
	}
	return v_cards;
};

Poker.newSet = function( options ) {
	var no_joker = true, no_color = [], no_number = [], no_card = [];
	if(options) {
		if(typeof options.no_joker === 'boolean') no_joker = options.no_joker;
		if(typeof options.no_color === 'object') no_color = options.no_color;
		if(typeof options.no_number === 'object') no_number = options.no_number;
		if(typeof options.no_card === 'object') no_card = options.no_card;
	}
	
	var cards = [];
	for(var color=1; color<=4; color++) {
		if(no_color.indexOf(color) >= 0) continue;
		
		for(var number=2; number<=14; number++) {
			if(no_number.indexOf(number) >= 0) continue;
			
			var card = (color << 4) | number;
			if(no_card.indexOf(card) >= 0) continue;
			
			cards.push( card );
		}
	}
	
	if(! no_joker) {
		cards.push( RED_JOKER );
		cards.push( BLACK_JOKER );
	}
	
	return cards;
};

Poker.clone = function(cards) {
	var cloned = [];
	for(var i=0; i<cards.length; i++) {
		cloned[i] = cards[i];
	}
	return cloned;
};

Poker.draw = function(cards, n) {
	var len = cards.length;
	if(len < n) return [];
	
	var subset = [];
	while(n -- > 0) {
		var i = Math.floor( Math.random() * len );
		subset.push( cards[i] );
		cards.splice(i,1); // NOTICE: splice will return an array
		len --;
	}
	// console.log('subset', subset)
	return subset;
};

Poker.randomize = function( cards ) {
	var randomized = this.draw(cards, cards.length);
	while(randomized.length > 0) {
		cards.push( randomized.shift() );
	}
	// console.log('carddddddddddddddd', cards)
	return cards;
};

Poker.compareColorNumber = function(a, b) {
	if(a == b) return 0;
	else {
		var aColor = a >> 4, aNumber = a & 0x0f;
		var bColor = b >> 4, bNumber = b & 0x0f;
		if(aColor == bColor) return aNumber - bNumber;
		else return aColor - bColor;
	}
};

Poker.compareNumberColor = function(a, b) {
	if(a == b) return 0;
	else {
		var aColor = a >> 4, aNumber = a & 0x0f;
		var bColor = b >> 4, bNumber = b & 0x0f;
		if(aNumber == bNumber) return aColor - bColor;
		else return aNumber - bNumber;
	}
};

Poker.compare = function(a, b) {
	return (a & 0xff) - (b & 0xff);
};

Poker.sort =
Poker.sortByColor = function( cards ) {
	return cards.sort( Poker.compareColorNumber ).reverse();
};

Poker.sortByNumber = function( cards ) {
	return cards.sort( Poker.compareNumberColor ).reverse();
};

Poker.merge = function( a, b ) {
	return a.concat(b);
};

Poker.print = function( cards ) {
	var str = cards.join(',');
	console.log( str );
};

Poker.view = function( cards ) {
	var str = Poker.visualize(cards).join(',');
	console.log( str );
};

},{}]},{},[1]);

// exports = module.exports = {seconds}; 