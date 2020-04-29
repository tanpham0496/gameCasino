// const blood = require('../mainnet_sdk');
// const db = require('../db/db');
// const axios = require("axios");
// var _ = require('lodash');

// var rpc = new blood.RPC(new blood.HTTPProvider("http://ext.blood.land:30001")); 

// (async () => {
// 	const checkSchedule = await axios.get('http://192.168.56.1:7000/checkSchedule');
// 	console.log('checkSchedule', checkSchedule)
// 	var currentBlock = await rpc.blockchain.getChainInfo() //최신 블록 가져오기	
// 	let randomBlock = 170 + Math.floor(Math.random() * 10);
// 	const checkCollectionGame = await db.game.find({}).lean();
// 	if(_.isNull(checkCollectionGame)){
// 		var createGame_Odd = await db.game.create({ //홀짝 게임 생성
// 		game_type : 1,
// 		block_id : 5729595, //최신 블록+90초 후 블록번호 
// 		options : "Odd,Even"
// 		});
// 		console.log('createGame_Odd', createGame_Odd)
// 		var createGame_srp = await db.game.create({ //가위바위보 게임 생성
// 			game_type : 2,
// 			block_id :5729595, //최신 블록+90초 후 블록번호
// 			options : "Scissors,Rock,Paper"
// 		})	
// 		console.log('createGame_srp', createGame_srp)
// 		var createGame_lotto = await db.game.create({ //로또 게임 생성
// 			game_type : 3,
// 			block_id : 5729595, //최신 블록+90초 후 블록번호
// 			options : "Lotto"
// 		});
// 		console.log('createGame_lotto', createGame_lotto)
// 	}
	
// 	//============ runSchedule
// 	const runSchedule = await axios.get('http://192.168.56.1:7000/runSchedule');
// 	console.log('runSchedule', runSchedule);
// })();