const db = require('../../db/db.js');
const ObjectId = require('mongoose').Types.ObjectId;
var _ = require('lodash');
const axios = require("axios");
const encryptor = require('../../lib/encryptor');
require('../../conf/lottoSrpOeConfig');
module.exports = {
	createProfile,
	getProfile,
	saveData,
	handleOnlineAndOffline,
	getFriendList,
	checkUserInviteJoomRoom,
	userBalance,
	checkAccount,
	TxCreateReward,
	TxCreatePay,
	getFriendListIntoBlaaChat,
	sipping
}
async function sipping({_user}){
	try{
		if(_user) { //인자 값 확인
			const gameCount =  await db.games.find({game_type: 1}) // 홀짝게임 전체개수 가져오기
			const games = await db.games.find({game_type: 1}).sort({_id:-1}).limit(15) //최근 게임 15개 가져오기
			let gameList = new Array()
			for(let i=0;i<games.length;i++) {
				const userBet = await db.betting.findOne({game_id:games[i]._id, user_id: _user}) //유저배팅내역
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
				const blockData = await db.block.findOne({block:games[i].block_id}) //게임의 블록 가져오기 
				if(!blockData) { 
					// 결과 없는 게임
					gameList.push({No : gameCount-i, Block : games[i].block_id, Hash : 'null', IntegerHash: 'null',BetResult : 'null',BetUser : userBetting ,BetAmount : userAmount} )
				} 
				else {
					//결과 있는 게임
					gameList.push({No : gameCount-i, Block : games[i].block_id, Hash : blockData.hash, IntegerHash: blockData.hash_int, BetResult : blockData.hash_int%2,BetUser : userBetting ,BetAmount : userAmount} )
				}
			}
			return { status : true, gameList}
		} else {
			// res.json({"err":"Invalid API Call"}) //인자 값 없음
			return { status : true, message : 'Invalid API Call'}
		}
	}
	catch(e){
		return { status : false, message : e}
	}
}
async function createProfile({uid, name, avatar, coins, score, exp, level}) {
	try{
		if(!uid || !name || !coins || !score || !exp || !level) return { status : false, mess : 'Cannot enough param'};
		
		const checkUserExist = await db.User.findOne({uid : uid, name : name}).lean();
		if(_.isNull(checkUserExist)) {
			// console.log('Create======user')
			const user = await db.User.create({uid : uid, name : name, avatar : avatar, 
				coins : coins, score : score, exp : exp, level : level});
			return user;
		}
		else{
			// console.log('GET=========USER=========>>>ID')
			const user = await db.User.findOne({uid : uid, name : name}).lean();
			return user;
		}
	}
	catch(e) {
		console.log('Error',e);
		return {status : false, mess : e}
	}

}

async function getProfile({uid, name}) {
	try{
		if(!uid || !name ) return { status : false, mess : 'Cannot enough param'};
		const user = await db.User.findOne({uid : uid, name : name}).lean();
		if(!user) return { status : false};
		return user;
	}
	catch(e) {
		console.log('Error',e);
		return { status : false, message : e}
	}
}
async function saveData({uid, name, coins, score,avatar, exp, level}) {
	try{

		if(!uid || !name || !coins || !score || !exp || !level) return { status : false, mess : 'Cannot enough param'};
		const user = await db.User.find({uid : uid, name : name}).lean();
		let data;

		if(Array.isArray(user) && user.length === 0 ) {
			data = await db.User.create({
				uid : uid,
				name : name,
				coins : coins,
				score : score,
				exp : exp,
				level : level
			})
			// console.log('data ===>> Created');
			if(!data) return { status : false, mess : "Created User not success!"}
		}
		else{
			data = await db.User.findOneAndUpdate({uid : uid, name : name},
				{$set : {coins : coins , score : score , exp : exp, level : level} }, 
				{new : true}).lean();
			// console.log('data====>>>Update')
			if(!data) return { status : false, mess : "Update User not success!"}
		}
		return { status : true, data};
	}
	catch(e) {
		console.log('Error : ', e );
		return { status : false, mess : e}
	}
}

async function handleOnlineAndOffline({uid, stt}){
	try{
		if(!uid) return{ status : false, message : "Can't found UserId"}
		const checkUserExist = await db.User.findOne({uid : uid});
		if(!_.isNull(checkUserExist)) { 
			const data = await db.User.findOneAndUpdate({uid : uid },{$set : {online : stt}},{new : true}).lean();
			if(!data) return{ status : false, message : "can't success update"}
			// console.log('data__________',data)
			return { status : true }
		}

	}
	catch(e){
		console.log('Error', e);
		return { status : false, message : e}
	}
}
// Get list friend temporary
async function getFriendList ({uid}) {
	try{
		// console.log('uid : ', uid);
		if(!uid) return { status : false, message : 'Cannot found userId'}
		let friendList = await db.User.find({});
		if(!friendList) return { status : false}
		let data = [];
		if(friendList && friendList.length !== 0) {
			data = friendList.map(item => {
				if(item.uid !== uid){
					return {
						_id : item._id,
						uid : item.uid,
						coins : item.coins,
						online : item.online
					}
				}
				return null;
			}).filter(item => item);
		}
		return {status : true, data }
	}
	catch(e){
		console.log('Error : ', e);
		return { status : false, message : e}
	}
}
async function checkUserInviteJoomRoom({uid, online}) {
	try{
		if(!uid) return { status : false, message : 'Cannot found userId'}
		const checkUserExist = await db.User.findOne({uid : uid});
		if(_.isNull(checkUserExist)){
			return { status : false, message : 'Cannot uid in listFriend'}
		}
		if(checkUserExist.online !== online) return { status : false}
		return { status : true} 
	}
	catch(e){
		console.log('Error : ', e);
		return { status : false, message : e}
	}
}
async function checkAccount({id, token}){
	try{
		if(!id && !token) return {status : false, message : 'Not enough param'}
		const $ = require('../../lib/arguments').get({account: id, token: token}); 
		const data = encryptor.encryptObjectBySeckey({account: $.account, token: $.token}, APP_SECKEY);
		const checkAccount = await axios.post('http://167.99.69.209:7777/btamin/account-check',{app: APP_NAME, data: data})
		if(checkAccount.data.success) {
			return { status : true };
		} else {
			return { status : false, message :"Invalid data"}
		}
	}
	catch(e){
		return { status : false, message : e}
	}
}

async function userBalance({id, token}){
	try {
		if(!id && !token) return {status : false, message : 'Not enough param'}
		const $ = require('../../lib/arguments').get({account: id, token: token}); 
		const balanceData = encryptor.encryptObjectBySeckey({account: $.account, token: $.token},"1b49117613dff13a966596b18db2afb7");
		const balanceResult = await axios.post('http://213.136.68.203:41002/btamin/account-balance',{app: "blood-poker", data: balanceData})
		if(balanceResult.data.success) {
			return { status : true, balance : balanceResult.data.data.balance};
		} else {
			return { status : false, message :"Invalid data"}
		}
	}
	catch(e) {
		console.log('Error : ', e);
	}
}
// admin send money to user
async function TxCreateReward({amount, userId}) {
	try{
		if(!amount && !userId) return {status : false, message : 'Not enough param'}
		const $ = require('../../lib/arguments').get({amount: amount, receiver: userId });
		const rewardData = encryptor.encryptObjectBySeckey({amount: $.amount, receiver: $.receiver}, APP_SECKEY);
		const rewardResult = await axios.post('http://167.99.69.209:7777/btamin/tx-create-reward',{app: APP_NAME, data: rewardData});
		// console.log('rewardResult',rewardResult)
		if(rewardResult.data.success) {
			return { status : true, data : rewardResult.data}
		}
		return rewardResult
	}
	catch(e){
		console.log("Error : ", e);
	}
}
//user send money to admin
async function TxCreatePay({amount, userId, userToken}) {
	try{
		$ = require('../../lib/arguments').get({amount: amount, account: userId, token: userToken}); // user_id : _user // user_token : _token
		const paymentData = encryptor.encryptObjectBySeckey({amount: $.amount, account: $.account, token: $.token}, APP_SECKEY);
		const paymentResult = await axios.post('http://167.99.69.209:7777/btamin/tx-create-pay',{app: APP_NAME, data: paymentData})
		if(paymentResult.data.success) {
			return { status : true, data : paymentResult.data}
		} else {
			return { status : false, message : "User send money to Admin that's not success"}
		}
	}
	catch(e){
		console.log("Error : ", e);
	}
}
async function getFriendListIntoBlaaChat({id, token}){
	try{
		if(!id && !token) return {status : false, message : 'Not enough param'}
		let configHeaders = {
			headers: {
				'X-Auth-Token': token,
				'X-User-Id': id
			}
		}
		const getListFriend = await axios.get("https://tt1.blood.land/api/v1/users.presence", configHeaders);
	    if(response.data.status){
	    	return{ status : true, data : response.data.user }
	    }
	    else{
	    	return { status : false, message : 'Get ListFriend not success!' }
	    }
	    
	}
	catch(e){
		return { status : false, message : e}
	}
}