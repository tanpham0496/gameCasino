const express = require('express');
const router = express.Router();
const axios = require("axios");
const mongoose = require('mongoose')
const schedule = require('node-schedule');
const db = require('../../db/db');
const blood = require('../../mainnet_sdk');
const block = db.blockGames;
const game = db.games;
const betting = db.betting;
const encryptor = require('../../lib/encryptor');
require('../../conf/lottoSrpOeConfig');

module.exports = {
    sipping,
    
	sippingBetting,
	srp,
    lotto,
    lottoBetting,
    checkSchedule,
    runSchedule,
    getTimestamp,
}

var endGameSchedule
var newGameSchedule
var rpc = new blood.RPC(new blood.HTTPProvider("http://ext.blood.land:30001")); 

async function sipping({_user}){
	try{
        if(!_user) return { status : false, message : 'Not found params'}
		if(_user) { //인자 값 확인
			const gameCount =  await game.countDocuments({game_type: 1}) // 홀짝게임 전체개수 가져오기
            const games = await game.find({game_type: 1}).sort({_id:-1}).limit(15) //최근 게임 15개 가져오기
            if(!games) return { status : false, message : 'Not found games in sipping'}
			let gameList = new Array()
			for(let i=0;i<games.length;i++) {
				const userBet = await betting.findOne({game_id: games[i]._id, user_id: _user}) //유저배팅내역
				let userBetting = 'null'
				let userAmount = 'null'
				if(userBet){
					if(userBet.betOption == 'Odd'){
						userBetting = 1//유저베팅 홀
					} else if(userBet.betOption == 'Even') { 
						userBetting = 0 //유저배팅 짝
					}
					userAmount = userBet.amount //유저 배팅금액
				}
				const blockData = await block.findOne({block:games[i].block_id}) //게임의 블록 가져오기 
				if(!blockData) { 
					// 결과 없는 게임
					gameList.push({No : gameCount-i, Block : games[i].block_id, Hash : 'null', IntegerHash: 'null',BetResult : 'null',BetUser : userBetting ,BetAmount : userAmount} )
				} 
				else {
					//결과 있는 게임
					gameList.push({No : gameCount-i, Block : games[i].block_id, Hash : blockData.hash, IntegerHash: blockData.hash_int, BetResult : blockData.hash_int%2,BetUser : userBetting ,BetAmount : userAmount} )
				}
			}
			// res.json(gameList)
            return gameList
        } else {
            // res.json({"err":"Invalid API Call"}) //인자 값 없음
            return { status : false }
		}
	}
	catch(e){
        console.log('Error :', e);
        return { status : false, message : e}
	}
}
async function sippingBetting(req, res){
	try{
		const {_user, _token, _blockNo, _bet, _amount} = req.body //유저 아이디, 유저 베팅, 유저 베팅금
		if(!_user || !_token || !_blockNo || !_bet || !_amount) {
			res.json({"err":"Invalid API Call"})
		}
		if(_amount < 5000) {
			res.json({"err":"balance is less than 5000"}) //최소배팅금액 5,000 BTAMIN
		}
		let bets = "" 
		if(_bet == 0) {
			bets = "Even" //유저 짝 베팅
		} else if(_bet == 1){
			bets = "Odd" //유저 홀 베팅
		} else {
			res.json({"err":"invalid betOption"}); //유효하지 않은 베팅 옵션
		}
		let $ = require('../../lib/arguments').get({account: user_id, token: user_token}); // user_id : _user // user_token : _token
		const balanceData = encryptor.encryptObjectBySeckey({account: $.account, token: $.token}, APP_SECKEY);
		const balanceResult = await axios.post('http://167.99.69.209:7777/btamin/account-balance',{app: APP_NAME, data: balanceData})
		if(!balanceResult.data.success) {
			res.json({"err":"no have this account"})  //해당 유저 없음
		} else if(balanceResult.data.data.balance < _amount) {
			res.json({"err":"user balance is not enough"}) //배팅 금액이 보유 금액보다 큼
		} else {
			const latelyGame = await game.findOne({status : 0, block_id:_blockNo, game_type: 1}).sort({_id:-1}) //마지막 홀짝 게임
			//최근 게임 블록과 현재 블록 비교
			const current_Block = await rpc.blockchain.getChainInfo()
			if(!latelyGame) {
				res.json({"err":"no have lately game"}) //스케쥴러 문제로 게임이 생성 되지 않음
			} else if(latelyGame.block_id <= current_Block.lib_block) { 
				res.json({"err":"can't batting to past game"}) 
			} else {
				const checkBet = await betting.findOne({game_id: latelyGame._id, user_id:user_id, }).sort({_id:-1}) //유저 배팅
				if(checkBet) {
					res.json({"err":"already bet this game"}) //해당 게임이 이미 배팅함
				} else {
					$ = require('../../lib/arguments').get({amount: _amount, account: user_id, token: user_token}); // user_id : _user // user_token : _token
					const paymentData = encryptor.encryptObjectBySeckey({amount: $.amount, account: $.account, token: $.token}, APP_SECKEY);
					const paymentResult = await axios.post('http://167.99.69.209:7777/btamin/tx-create-pay',{app: APP_NAME, data: paymentData})
					if(paymentResult.data.success) {
						const betData = new betting({ //배팅내역 DB 생성
							game_type : 1,
							game_id : latelyGame._id,
							user_id : user_id, // _user
							betOption : bets,
							amount : paymentResult.data.data.amount,
							payment_txid : paymentResult.data.data.hash
						})
						betData.save()
					} else {
						res.json({"err":"Invalid API Call"})
					}
					res.json({"success":"true"})
				}
			}
		}
	}
	catch(e){
		console.log('Error :', e);
	}
}
async function srp(req, res){
	try{
		const {_user} = req.body
		if(_user) { //인자 값 확인
			const gameCount =  await game.countDocuments({game_type: 2}) //가위바위보 전체개수 가져오기
			const games = await game.find({game_type: 2}).sort({_id:-1}).limit(15) //최근 게임 15개 가져오기
			let gameList = new Array()
			for(let i=0;i<games.length;i++) {
				const userBet = await betting.findOne({game_id:games[i]._id, user_id: _user}) //유저배팅내역
				var userBetting = 'null'
				var userAmount = 'null'
				if(userBet) {
					if(userBet.betOption == 'Scissors'){
						userBetting = 0 //유저배팅 가위
					} else if(userBet.betOption == 'Rock') {
						userBetting = 1 //유저배팅 바위
					} else if(userBet.betOption == 'Paper') {
						userBetting = 2 //유저배팅 보
					}
					userAmount = userBet.amount //유저 배팅금액
				}
				const blockData = await block.findOne({block:games[i].block_id}) //게임의 블록 가져오기 
				if(!blockData) {
					//결과 없는 게임
					gameList.push({No : gameCount-i, Block : games[i].block_id, Hash : 'null', IntegerHash: 'null',BetResult : 'null',BetUser : userBetting ,BetAmount : userAmount} )
				} 
				else {
					//결과 있는 게임
					gameList.push({No : gameCount-i, Block : games[i].block_id, Hash : blockData.hash, IntegerHash: blockData.hash_int, BetResult : blockData.hash_int%3,BetUser : userBetting ,BetAmount : userAmount} )
				}
			}
			res.json(gameList)
		} else {
			res.json({"err":"Invalid API Call"}) //인자 값 없음
		}
	}
	catch(e){
		console.log('Error :', e);
	}
}
async function srpBetting(req, res){
	try{
		const {_user, _token, _blockNo, _bet, _amount} = req.body //유저 아이디, 유저 베팅, 유저 베팅금
		if(!_user || !_token || !_blockNo || !_bet || !_amount) {
			res.json({"err":"Invalid API Call"})
		}
		if(_amount < 5000) {
			res.json({"err":"balance is less than 5000"}) //최소배팅금액 5,000 BTAMIN
		}
		let bets = ""
		if(_bet == 0) {
			bets = "Scissors" //유저 가위 베팅
		} else if(_bet == 1){
			bets = "Rock" //유저 바위 베팅
		} else if(_bet == 2){
			bets = "Paper" //유저 보 베팅
		} else {
			res.json({"err":"invalid betOption"}); //유효하지 않은 베팅 옵션
		}
		let $ = require('../../lib/arguments').get({account: user_id, token: user_token}); // user_id : _user // user_token : _token
		const balanceData = encryptor.encryptObjectBySeckey({account: $.account, token: $.token}, APP_SECKEY);
		const balanceResult = await axios.post('http://167.99.69.209:7777/btamin/account-balance',{app: APP_NAME, data: balanceData})
		if(!balanceResult.data.success) {
			res.json({"err":"no have this account"})  //해당 유저 없음
		} else if(balanceResult.data.data.balance < _amount) {
			res.json({"err":"user balance is not enough"}) //배팅 금액이 보유 금액보다 큼
		} else {
			const latelyGame = await game.findOne({status : 0, game_type: 2}).sort({_id:-1}) //마지막 홀짝 게임
			//최근 게임 블록과 현재 블록 비교
			const current_Block = await rpc.blockchain.getChainInfo()
			if(!latelyGame) {
				res.json({"err":"no have lately game"}) //스케쥴러 문제로 게임이 생성 되지 않음
			} else if(latelyGame.block_id <= current_Block.lib_block) { 
				res.json({"err":"can't batting to past game"}) 
			} else {
				const checkBet = await betting.findOne({game_id: latelyGame._id, user_id:user_id, }).sort({_id:-1}) //유저 배팅
				if(checkBet) {
					res.json({"err":"already bet this game"}) //해당 게임이 이미 배팅함
				} else {
					$ = require('../../lib/arguments').get({amount: _amount, account: user_id, token: user_token}); // user_id : _user // user_token : _token
					const paymentData = encryptor.encryptObjectBySeckey({amount: $.amount, account: $.account, token: $.token}, APP_SECKEY);
					const paymentResult = await axios.post('http://167.99.69.209:7777/btamin/tx-create-pay',{app: APP_NAME, data: paymentData})
					if(paymentResult.data.success) {
						const betData = new betting({ //배팅내역 DB 생성
							game_type : 2,
							game_id : latelyGame._id,
							user_id : user_id, // _user
							betOption : bets,
							amount : paymentResult.data.data.amount,
							payment_txid : paymentResult.data.data.hash,
							payment_at : paymentResult.data.data.timestamp,
						})
						betData.save()
					} else {
						res.json({"err":"Invalid API Call"})
					}
					res.json({"success":"true"})
				}
			}
		}
	}
	catch(e){
		console.log('Error :', e);
	}
}
async function lotto(req, res){
	try{
		const {_user} = req.body //유저 아이디
		if(_user) { //인자 값 확인
			const gameCount =  await game.countDocuments({game_type: 3}) // 로또게임 전체개수 가져오기
			const games = await game.find({game_type: 3}).sort({_id:-1}).limit(15) //최근 게임 15개 가져오기
			let gameList = new Array()
			for(let i=0;i<games.length;i++) {
				let blockList = new Array()
				const userBet = await betting.findOne({game_id:games[i]._id, user_id: _user}) //유저배팅내역
				let userBetting = 'null'
				let userAmount = 'null'
				if(userBet) {
					userBetting = userBet.betOption.split(',')
					userAmount = userBet.amount //유저의 배팅 번호 3개
				}
				for(let j=0;j<3;j++) { //해당 게임의 블록 3개 가져오기 
					const blockData = await block.findOne({block:games[i].block_id+j})
					if(blockData) {
						blockList.push({Block : blockData.block, Hash : blockData.hash, IntegerHash: blockData.hash_int, Sipping : blockData.hash_int%10})
					}
				}
				if(!blockList[0]){
					//결과 없는 게임
					gameList.push({No : gameCount-i, Block : Array(games[i].block_id, games[i].block_id+1, games[i].block_id+2), Hash : 'null', IntegerHash: 'null', BetResult : 'null',BetUser : userBetting ,BetAmount : userAmount} )
				} 
				else {
					//결과 있는 게임
					gameList.push({No : gameCount-i, Block : Array(blockList[0].Block,blockList[1].Block,blockList[2].Block), Hash : Array(blockList[0].Hash, blockList[1].Hash, blockList[2].Hash), IntegerHash: Array(blockList[0].IntegerHash, blockList[1].IntegerHash, blockList[2].IntegerHash), BetResult : Array(blockList[0].IntegerHash%10, blockList[1].IntegerHash%10, blockList[2].IntegerHash%10),BetUser : userBetting ,BetAmount : userAmount} )
				}
			}
			res.json(gameList)
		} else {
			res.json({"err":"Invalid API Call"}) //인자 값 없음
		}
	}
	catch(e){
		console.log('Error :', e);
	}
}
async function lottoBetting(req, res) {
	try{
		const {_user, _token, _blockNo, _bet, _amount} = req.body //유저 아이디, 유저 베팅, 유저 베팅금
		if(!_user || !_token || !_blockNo || !_blockNo || !_bet || !_amount) {
			res.json({"err":"Invalid API Call"})
		}
		if(_amount < 5000) {
			res.json({"err":"balance is less than 5000"}) //최소배팅금액 5,000 BTAMIN
		}
		for(let i=0;i<3;i++) {
			if(_bet[i] < 0 || _bet[i] > 9 || _bet[i] === undefined ) {
				res.json({"err":"bet number is wrong"}); //유효하지 않은 베팅 옵션
			}
		}
		let $ = require('../../lib/arguments').get({account: user_id, token: user_token}); // user_id : _user // user_token : _token
		const balanceData = encryptor.encryptObjectBySeckey({account: $.account, token: $.token}, APP_SECKEY);
		const balanceResult = await axios.post('http://167.99.69.209:7777/btamin/account-balance',{app: APP_NAME, data: balanceData})
		if(!balanceResult.data.success) {
			res.json({"err":"no have this account"})  //해당 유저 없음
		} else if(balanceResult.data.data.balance < _amount) {
			res.json({"err":"user balance is not enough"}) //배팅 금액이 보유 금액보다 큼
		} else {
			const latelyGame = await game.findOne({status : 0, block_id:_blockNo[0], game_type: 3}).sort({_id:-1}) //마지막 홀짝 게임
			//최근 게임 블록과 현재 블록 비교
			const current_Block = await rpc.blockchain.getChainInfo()
			if(!latelyGame) {
				res.json({"err":"no have lately game"}) //스케쥴러 문제로 게임이 생성 되지 않음
			} else if(latelyGame.block_id <= current_Block.lib_block) { 
				res.json({"err":"can't batting to past game"}) 
			} else {
				const checkBet = await betting.findOne({game_id: latelyGame._id, user_id:user_id, }).sort({_id:-1}) //유저 배팅
				if(checkBet) {
					res.json({"err":"already bet this game"}) //해당 게임이 이미 배팅함
				} else {
					$ = require('../../lib/arguments').get({amount: _amount, account: user_id, token: user_token}); // user_id : _user // user_token : _token
					const paymentData = encryptor.encryptObjectBySeckey({amount: $.amount, account: $.account, token: $.token}, APP_SECKEY);
					const paymentResult = await axios.post('http://167.99.69.209:7777/btamin/tx-create-pay',{app: APP_NAME, data: paymentData})
					if(paymentResult.data.success) {
						const betData = new betting({ //배팅내역 DB 생성
							game_type : 3,
							game_id : latelyGame._id,
							user_id :  _user,
							betOption : _bet.toString(),
							amount : paymentResult.data.data.amount,
							payment_txid : paymentResult.data.data.hash
						})
						betData.save()
					} else {
						res.json({"err":"Invalid API Call"})
					}
					res.json({"success":"true"})
				}
			}
		}
	}
	catch(e) {
		console.log('Error :', e);
	}
}
async function checkSchedule(req, res){
	try{
		//배팅 스케쥴러 동작 확인
		res.json({NewGame:newGame_scheduler? 'Running': 'Stop',EndGame:endGame_scheduler? 'Running': 'Stop',InvestGame:invest_scheduler? 'Running': 'Stop'})
	}
	catch(e){
		console.log('Error :', e);
	}
}
async function runSchedule(req, res){
	try{
		//게임생성 스케쥴러
		if(newGame_scheduler == false) //스케쥴러 미실행 시
		{
			newGameSchedule = schedule.scheduleJob('* * * * *', async function(){ //매 1분마다 실행
				const currentBlock = await rpc.blockchain.getChainInfo() //최신 블록 가져오기	
				const randomBlock = 170 + Math.floor(Math.random() * 5) // 0~4초 그리고 5,6초
				const createGame_Odd = new game({ //홀짝 게임 생성
					game_type : 1,
					block_id : parseInt(currentBlock.lib_block) + randomBlock + Math.floor(Math.random() * 3), //최신 블록+90초 후 블록번호 
					options : "Odd,Even"
				})	
				const createGame_srp = new game({ //가위바위보 게임 생성
					game_type : 2,
					block_id : parseInt(currentBlock.lib_block) + randomBlock + Math.floor(Math.random() * 3), //최신 블록+90초 후 블록번호
					options : "Scissors,Rock,Paper"
				})	
				const createGame_lotto = new game({ //로또 게임 생성
					game_type : 3,
					block_id : parseInt(currentBlock.lib_block) + randomBlock, //최신 블록+90초 후 블록번호
					options : "Lotto"
				})	
				await createGame_Odd.save()
				await createGame_srp.save()
				await createGame_lotto.save()
			});
			newGame_scheduler = true //스케쥴러 실행 상태로 변경
			console.log('The New_Game Scheduler is running');
		} 
		else { //스케쥴러 실행중
			newGameSchedule.cancel() //스케쥴러 정지
			newGame_scheduler = false //스케쥴러 정지 상태로 변경
			console.log('The New_Game Scheduler is stop');
		}
		//블록생성 스케쥴러
		if(endGame_scheduler == false){ //스케쥴러 미실행 시
			endGameSchedule = schedule.scheduleJob('30 * * * * *', async function(){ //매 분 30초에 실행
				const currentBlock = await rpc.blockchain.getChainInfo() //최신 블록 가져오기
				const finishedGames = await game.find({game_type : 3 , status : 0, block_id : {$lte:currentBlock.lib_block-3}}).sort({"_id":1}) //블록체인에 생성된 블록의 게임 리스트  
				for(let i=0;i<finishedGames.length;i++) {
					for(let j=0;j<3;j++) { //로또게임을 위해 블록 3개 저장
						const getblock = await rpc.blockchain.getBlockByNum((finishedGames[i].block_id)+j,true) //게임의 블록 정보 가져오기 (-3은 중간블록 미생성 에러방지) 
						const hash_integer = await parseInt(getblock.block.hash.slice(-10),36) //해쉬 정수화
						const addBlock = new block({ //블록 DB 생성
							block : getblock.block.number,
							timestamp : getblock.block.time,
							hash : getblock.block.hash,
							hash_int: hash_integer
						})	
						addBlock.save()
					}
				}
				const game_block = await game.find({status : 0, block_id : {$lte:currentBlock.lib_block-3}}).sort({"_id":1}) //블록체인에 생성된 블록의 게임 리스트  (-3은 중간블록 미생성 에러방지) 
				game_block.forEach(games=>{ 
					games.status = 1 //블록 생성된 게임은 status를 1로 변경
					games.save()
				})
			})
			endGame_scheduler = true //스케쥴러 실행 상태로 변경
			console.log('The End_Game Scheduler is running');
		} 
		else {
			endGameSchedule.cancel() //스케쥴러 정지
			endGame_scheduler = false //스케쥴러 정지 상태로 변경
			console.log('The End_Game scheduler is stop');
		}
		//게임정산 스케쥴러
		if(invest_scheduler == false) { //스케쥴러 미실행 시
			investSchedule = schedule.scheduleJob('45 * * * * *', async function(){ //매 분 45초에 실행
				const investGames = await game.find({status : 1}).sort({"_id":1}) //블록이 생성된 게임 리스트
				for(let i=0;i<investGames.length;i++) {
					const betList = await betting.find({game_id:investGames[i]._id, status:0}) //해당 게임의 유저 배팅 리스트 
					if(betList) { //해당 게임의 베팅이 없으면 실행안함
						const blockResult = await block.findOne({block:investGames[i].block_id}) //해당 게임의 블록 정보
						for(let j=0;j<betList.length;j++) {
							var winner = false //승패여부
							if(betList[j].game_type == 1) { //홀짝 게임일 경우 
								const userBet = betList[j].betOption == "Odd" ? 1 : 0 //유저 배팅(홀=1 : 짝=0)
								if(userBet == blockResult.hash_int%2) { //유저 배팅과 결과가 같은 경우
									const $ = require('../../lib/arguments').get({amount: betList[j].amount*1.9, receiver: user_id});
									const rewardData = encryptor.encryptObjectBySeckey({amount: $.amount, receiver: $.receiver}, APP_SECKEY);
									const rewardResult = await axios.post('http://167.99.69.209:7777/btamin/tx-create-reward',{app: APP_NAME, data: rewardData})
									if(rewardResult.data.success) {
										betList[j].reward_txid = rewardResult.data.data.hash
										betList[j].reward_at = rewardResult.data.data.timestamp
										betList[j].status = 2 //정산 후 승리한 베팅내역은 status를 2로 변경
										winner = true //승리시
									} else {
										res.json({"err":"failed rewards"})
									}
								} 
							} else if(betList[j].game_type == 2) { //가위바위보 게임일 경우 
								const userBet = betList[j].betOption == "Scissors" ? 3 : (betList[j].betOption == "Rock" ? 1 : 2) //유저 배팅(가위=3 : 바위=1 : 보=2)
								if(userBet-1 == blockResult.hash_int%3) { //유저배팅이 결과를 이긴 경우 
									const $ = require('../../lib/arguments').get({amount: betList[j].amount*2.28, receiver: user_id});
									const rewardData = encryptor.encryptObjectBySeckey({amount: $.amount, receiver: $.receiver}, APP_SECKEY);
									const rewardResult = await axios.post('http://167.99.69.209:7777/btamin/tx-create-reward',{app: APP_NAME, data: rewardData})
									if(rewardResult.data.success) {
										betList[j].reward_txid = rewardResult.data.data.hash
										betList[j].reward_at = rewardResult.data.data.timestamp
										betList[j].status = 3 //정산 후 비길경우 베팅내역은 status를 2로 변경
										winner = true //승리시
									} else {
										res.json({"err":"failed rewards"})
									}
								} else if(userBet%3 == blockResult.hash_int%3) { //유저 배팅과 결과가 같은 경우
									const $ = require('../../lib/arguments').get({amount: betList[j].amount*0.475, receiver: user_id});
									const rewardData = encryptor.encryptObjectBySeckey({amount: $.amount, receiver: $.receiver}, APP_SECKEY);
									const rewardResult = await axios.post('http://167.99.69.209:7777/btamin/tx-create-reward',{app: APP_NAME, data: rewardData})
									if(rewardResult.data.success) {
										betList[j].reward_txid = rewardResult.data.data.hash
										betList[j].reward_at = rewardResult.data.data.timestamp
										betList[j].status = 2 //정산 후 승리한 베팅내역은 status를 2로 변경
										winner = true //승리시
									} else {
										res.json({"err":"failed rewards"})
									}
								}
							} else if(betList[j].game_type == 3) { //로또 게임일 경우 
								const nextBlockResult = await block.findOne({block:investGames[i].block_id+1}) //해당 게임의 두번째 블록 정보
								const mextBlockResult = await block.findOne({block:investGames[i].block_id+2}) //해당 게임의 세번째 블록 정보
								const userBet = (betList[j].betOption).split(',') //유저 배팅 숫자 3개
								let rewards = 316.35 //배팅금액의 333배 추가 (배팅금x333에 수수료 5% 뺀 금액)
								//결과의 첫번째 두번째 세번째 번호가 전부 같은 경우 배당금은 1000배
								if((blockResult.hash_int)%10  == (nextBlockResult.hash_int)%10 && (nextBlockResult.hash_int)%10 == (mextBlockResult.hash_int)%10) {
									rewards = 950 //배팅금액의 1000배 추가 (배팅금x1000에 수수료 5% 뺀 금액)
								}
								//유저 배팅과 결과가 같은 경우
								if(userBet[0] == (blockResult.hash_int)%10 && userBet[1] == (nextBlockResult.hash_int)%10 && userBet[2] == (mextBlockResult.hash_int)%10) {
									const $ = require('../../lib/arguments').get({amount: betList[j].amount*rewards, receiver: user_id});
									const data = encryptor.encryptObjectBySeckey({amount: $.amount, receiver: $.receiver}, APP_SECKEY);
									const rewardResult = await axios.post('http://167.99.69.209:7777/btamin/tx-create-reward',{app: APP_NAME, data: data})
									if(rewardResult.data.success) {
										betList[j].reward_txid = rewardResult.data.data.hash
										betList[j].reward_at = rewardResult.data.data.timestamp
										betList[j].status = 2 //정산 후 승리한 베팅내역은 status를 2로 변경
										winner = true //승리시
									} else {
										res.json({"err":"failed rewards"})
									}
								}
							}
							if(!winner) { //패배시
								betList[j].status = 1 //정산 후 패배한 베팅내역은 status를 1로 변경
							}
							betList[j].save()
						}
						blockResult.status = 1 //정산된 블록은 status를 1로 변경
						blockResult.save()
					}
					investGames[i].status = 2 //정산된 게임은 status를 2로 변경
					investGames[i].save()
				}
			})
			invest_scheduler = true //스케쥴러 실행 상태로 변경
			console.log('The Invest_Game Scheduler is running');
		} else { //스케쥴러 실행중
			investSchedule.cancel() //스케쥴러 정지
			invest_scheduler = false //스케쥴러 정지 상태로 변경
			console.log('The Invest_Game scheduler is stop');
		}
		res.json({NewGame:newGame_scheduler? 'Running': 'Stop',EndGame:endGame_scheduler? 'Running': 'Stop',InvestGame:invest_scheduler? 'Running': 'Stop'})

	}
	catch(e){
		console.log('Error :', e);
	}
}
async function getTimestamp(){
	try {
		return ({timestamp:Date.now()+5000}) //서버 Timestamp + 5초 반환
	}
	catch(e) {
		console.log('Error : ', e);
	}
}