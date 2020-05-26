const db = require('../../db/db.js');
const ObjectId = require('mongoose').Types.ObjectId;
var _ = require('lodash');
const axios = require("axios");
const encryptor = require('../../lib/encryptor');
var conf = require('../../conf/casino.conf.js');
require('../../conf/lottoSrpOeConfig');
require('dotenv').config();
module.exports = {
	createProfile,
	getProfile,
	saveData,
	handleOnlineAndOffline,
	getFriendList,
	checkUserInviteJoomRoom,
	userBalance,
	checkAccount,
	TxCreateRewardPoker,
	TxCreatePayPoker,
	getFriendListIntoBlaaChat,
	sendMoneyToWinnerGame,
	getExperienUser,
	handleRiseExperien,

	TxCreateRewardHwatu,
	TxCreatePayHwatu,

	getInfoRoomCasino,
	updateDataRoomCasino,

	getInfoRoomCasinoId,
	RemoveUserIdInCasino

}
async function getInfoRoomCasinoId({roomNum, typeGame}){
	try{
		if(!roomNum || !typeGame) return { status : false, message : 'Not enough params'}
		const checkExistRoom = await db.RoomCasino.findOne({roomNum : roomNum, type : typeGame});
		// console.log('checkExistRoom', checkExistRoom)
		if(_.isEmpty(checkExistRoom)){
			return { statue : true , data : []}
		}
		else{
			// console.log('checkExistRoom=========> data', checkExistRoom);
			return { status : true, data : checkExistRoom };
		}
	}
	catch(e){
		// console.log('Error : ', e);
		return{ status : false, message : e}
	}
}
async function RemoveUserIdInCasino({roomNum, typeGame, userId}){
	try{
		if(!roomNum || !typeGame || !userId) return { status : false, message : 'Not enough params'}
		const data = await db.RoomCasino.findOneAndUpdate(
			{roomNum : roomNum, type : typeGame},
			{$pull : {'listUser' : userId}},
			{new : true}
		);
		if(data){
			return { status : true, message : 'leave room'}
		}
		else{
			return { status : false, message : 'Leave Room not success'}
		}
	}
	catch(e){
		// console.log('e',e);
		return {status : false, message : 'error'}
	}
}

async function updateDataRoomCasino({roomNum, userId, status, typeGame, join}){
	try{
		let data;
		const checkExistRoom = await db.RoomCasino.findOne({roomNum : roomNum, type : typeGame});
		// console.log('_.isEmpty(checkExistRoom)', _.isEmpty(checkExistRoom))
		if(_.isEmpty(checkExistRoom)){
			data = await db.RoomCasino.create({
				roomNum : roomNum,
				listUser : [userId],
				type : typeGame,
			});
			// console.log('data=====> new', data);
			if(data){
				return { status : true, message : 'create new room'}
			}
			else{
				return { status : false, message : 'not create success!'}
			}
		}
		else{
			if(join === 1){
				data = await db.RoomCasino.findOneAndUpdate(
					{roomNum : roomNum, type : typeGame},
					{$addToSet : {'listUser' : userId}},
					{new : true}
				);
				// console.log('data=====> join', data);
				if(data){
					return { status : true, message : 'Join room'}
				}
				else{
					return { status : false, message : 'Join Room not success!'}
				}
			}
			if(join===0){
				data = await db.RoomCasino.findOneAndUpdate(
					{roomNum : roomNum, type : typeGame},
					{$pull : {'listUser' : userId}},
					{new : true}
				);
				if(data){
					return { status : true, message : 'leave room'}
				}
				else{
					return { status : false, message : 'Leave Room not success'}
				}
			}
			
		}

		return{ status : true}

	}catch(e){
		// console.log('Error : ', e);
		return { statue : false, message : e};
	}
}

async function getInfoRoomCasino({typeGame}){
	try{
		if(!typeGame) return { status : false, message : 'Not enough params'}
		const checkExistRoom = await db.RoomCasino.find({type : typeGame});
		// console.log('_.isEmpty(che?ckExistRoom)', _.isEmpty(checkExistRoom))
		if(_.isEmpty(checkExistRoom)){
			return { statue : true , data : []}
		}
		else{
			// console.log('checkExistRoom=========> data', checkExistRoom);
			return { status : true, data : checkExistRoom };
		}
	}
	catch(e){
		// console.log('Error : ', e);
		return{ status : false, message : e}
	}
}
async function createProfile({uid, name, avatar, coins, score, exp, level}) {
	try{
		if(!uid || !name || !coins || !score || !exp || !level) return { status : false, mess : 'Cannot enough param'};
		
		const checkUserExist = await db.User.findOne({uid : uid, name : name}).lean();
		if(_.isNull(checkUserExist)) {
			const user = await db.User.create({uid : uid, name : name, avatar : avatar, 
				coins : coins, score : score, exp : exp, level : level});
			return user;
		}
		else{
			const user = await db.User.findOne({uid : uid, name : name}).lean();
			return user;
		}
	}
	catch(e) {
		// console.log('Error',e);
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
		// console.log('Error',e);
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
			if(!data) return { status : false, mess : "Update User not success!"}
		}
		return { status : true, data};
	}
	catch(e) {
		// console.log('Error: ', e );
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
			return { status : true }
		}

	}
	catch(e){
		// console.log('Error', e);
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
		// console.log('data=================>', data);
		return {status : true, data }
	}
	catch(e){
		// console.log('Error : ', e);
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
		// console.log('Error : ', e);
		return { status : false, message : e}
	}
}
async function checkAccount({id, token}){
	try{
		if(!id || !token) return {status : false, message : 'Not enough param'}
		const inputData = encryptor.encryptObjectBySeckey({account: id, token: token}, APP_SECKEY);
		const outputData = await axios.post('http://213.136.68.203:41002/btamin/account-check',{app: APP_NAME, data: inputData})
		if(outputData.data.success)
			return { status : true };
		return { status : false, message :outputData.data}
	}
	catch(e){
		return { status : false, message : e}
	}
}

async function userBalance({id, token}){
	try {
		if(!id || !token) return {status : false, message : 'Not enough param'}
		const inputData = encryptor.encryptObjectBySeckey({account: id, token: token}, process.env.RefeseckeyPoker);
		const outputData = await axios.post(`${conf.casino_game.ApiBtamin}/btamin/account-balance`,{app: process.env.APP_POKER, data: inputData});
		// console.log('balanceResult.data', outputData.data);
		if(outputData.data.success) 
			return { status : true, balance : outputData.data.data.balance};
		return { status : false, message :outputData.data}
	}
	catch(e) {
		// console.log('Error : ', e);
	}
}
// admin send money to user => admin send money to loser in game
async function TxCreateRewardPoker({amount, userId}) {
	try{
		// console.log('{amount, userId}', {amount, userId})
		if(!amount || !userId) return {status : false, message : 'Not enough param'}
		const inputData = encryptor.encryptObjectBySeckey({amount: amount, receiver: userId}, process.env.RefeseckeyPoker );// poker satda
		const outputData = await axios.post(`${conf.casino_game.ApiBtamin}/btamin/tx-create-reward`,{app: process.env.APP_POKER, data: inputData});

		// console.log('rewardResult',rewardResult)
		if(outputData.data.success)
			return { status : true, data : outputData.data}
		return { status : false, message : outputData.data}
	}
	catch(e){
		console.log("Error : ", e);
	}
}

//user send money to admin
async function TxCreatePayPoker({amount, userId, userToken}) {
	try{
		 // user_id : _user // user_token : _token
		const inputData = encryptor.encryptObjectBySeckey({amount: amount, account: userId, token: userToken}, process.env.RefeseckeyPoker );
		const outputData = await axios.post(`${conf.casino_game.ApiBtamin}/btamin/tx-create-pay`,{app: process.env.APP_POKER, data: inputData})

		if(outputData.data.success)
			return { status : true, data : outputData.data}
		return { status : false, message : outputData.data}
	}
	catch(e){
		// console.log("Error : ", e);
	}
}

// admin send money to user
async function TxCreateRewardHwatu({amount, userId}) {
	try{
		if(!amount || !userId) return {status : false, message : 'Not enough param'}
		const inputData = encryptor.encryptObjectBySeckey({amount: amount, receiver: userId}, process.env.RefeseckeyHwatu );// poker satda
		const outputData = await axios.post(`${conf.casino_game.ApiBtamin}/btamin/tx-create-reward`,{app: process.env.APP_HWATU, data: inputData});
		// console.log('rewardResult',rewardResult)
		if(outputData.data.success)
			return { status : true, data : outputData.data}
		return { status : false, message : outputData.data}
	}
	catch(e){
		// console.log("Error : ", e);
	}
}
//user send money to admin
async function TxCreatePayHwatu({amount, userId, userToken}) {
	try{
		const inputData = encryptor.encryptObjectBySeckey({amount: amount, account: userId, token: userToken}, process.env.RefeseckeyHwatu );
		const outputData = await axios.post(`${conf.casino_game.ApiBtamin}/btamin/tx-create-pay`,{app: process.env.APP_HWATU, data: inputData});

		if(outputData.data.success) {
			return { status : true, data : outputData.data}
		} else {
			return { status : false, message : outputData.data}
		}
	}
	catch(e){
		// console.log("Error : ", e);
	}
}
async function getFriendListIntoBlaaChat({userId, accessToken}){
	try{
		if(!userId || !accessToken) return {status : false, message : 'Not enough param'}
		var listFriend = [];
		let configHeaders = {
			headers: {
				'Content-Type': 'application/json',
				'Authorization': 'Bearer ' + accessToken
			}
		}
		
		const getListFriend = await axios.post(`${conf.casino_game.ApiBlaaServer}/v1/user/getFriendList`, {userId :userId, accessToken : accessToken}, configHeaders);
		if(!getListFriend.data.success || !Array.isArray(getListFriend.data.data)){
			return { status : false, message : 'Get ListFriend in blaaServer not success!' }
		}
   
	    for(let i = 0 ; i < getListFriend.data.data.length ; i++){
	    	const friend = await db.User.findOne({uid : getListFriend.data.data[i]}).select('_id uid coins online').lean();
	    	if(!_.isEmpty(friend) ){
	    		listFriend.push(friend[0])
	    	}
			
	    }
	    if(listFriend.length === getListFriend.data.data.length){
	    	// console.log('listFriend', listFriend)
    		return { status : true, listFriend}
    	}
    	else{
    	 	return { status : false, listFriend : [], message : "call api getFriendListIntoBlaaChat not success" }
    	}
		
	}
	catch(e){
		return { status : false, message : e}
	}
}

async function sendMoneyToWinnerGame({id, token, amount, nameGame}) {
	 try{
	 	// console.log('{id, token, amount, nameGame}', {id, token, amount, nameGame})
	 	if(!id || !token || !amount || !nameGame) return {status : false, message : 'Not enough param'};
	 	const refescekey = nameGame === 'poker' ? process.env.RefeseckeyPoker : process.env.RefeseckeyHwatu;
	 	const AppName = nameGame === 'poker' ? process.env.APP_POKER : process.env.APP_HWATU;
		var inputData = encryptor.encryptObjectBySeckey({account: id, token: token, amount: amount},refescekey);// 36b6887d831401af5d63e67be11d7803
		let outputData = await axios.post(`${conf.casino_game.ApiBtaminSendWinner}/btamin/reward-gamewin`,{app: AppName, data: inputData});
		// console.log('outputData =================',outputData)

		if(outputData.data.success) 
			return { status : true }
		return {status : false, message : outputData.data}
	}
	catch(e){
		return {status : false, message : e}
	}
}


async function getExperienUser({id}){
	try{
		if(!id) return {status : false, message : "Not found userId"}
		var inputData = encryptor.encryptObjectBySeckey({account: id}, process.env.RefeseckeyPoker ); //5bdb4e8250debe487e3077f6271c41e0 = expSeckey
		let outputData = await axios.post(`${conf.casino_game.ApiExperien}/exp/exp-account-exp`,{app: process.env.APP_POKER, data: inputData})

		if(outputData.data.success) 
			return { status : true, data : outputData.data.data}
		return { status : false, message : outputData.data}
	}
	catch(e){
		return { status : false, message : e}
	}
}
async function handleRiseExperien({id, exp}){
	try{
		if(!id || !exp) return {status : false, message : "Not found userId"}
		var $ = require('../../lib/arguments').get({account: id, exp: exp, expType: 5});
		var inputData = encryptor.encryptObjectBySeckey({account: $.account, exp: parseInt(exp*0.025), expType: $.expType}, process.env.RefeseckeyPoker );
		let outputData = await axios.post(`${conf.casino_game.ApiExperien}/exp/exp-up`,{app: process.env.APP_POKER, data: inputData})
		
		if(outputData.data.success) 
			return { status : true, Balance : outputData.data}
		return { status : false, message : outputData.data}
	}
	catch(e){
		return { status : false, message : e}
	}
}

