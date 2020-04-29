const db = require('../../db/db');
const ObjectId = require('mongoose').Types.ObjectId;
var _ = require('lodash')

module.exports = {
	createBlocksCasino,
	getBlocksByMatchId,
}

async function createBlocksCasino({roomId, in_gamers, Winner, status, type, matchId, pot}) {
	try{
		if(!roomId || !in_gamers || !status || !type || !matchId || !pot)
			return { status : false, message : 'Not enough param'};
		const data = await db.BlocksCasino.create({
			roomNumber : roomId, 
			inGamers : in_gamers, 
			Winner : Winner, 
			status : status, 
			type : type, 
			matchId : matchId, 
			totalBetting : pot
		});
		console.log('data',data);
		if(!data) return { status : false, message : 'Create data not success !'}
		return { status : true }
	}
	catch(e) {
		console.log('Error : ', e);
		return {status : false, message : e}
	}
}
async function getBlocksByMatchId({matchId, WinnerId}) {
	try{
		if(!matchId) return {status : false, message : 'Not enough param'}
		var listLose = [], listGamer = [], surplus = 0, totalOnMatch = 0;
		const blocks = await db.BlocksCasino.find({matchId : matchId}).lean();
		if(!blocks) return { status : false, message : 'Not found blocks with matchId'};

		blocks.map(item => {
			totalOnMatch += item.totalBetting;
			if(listGamer.length === 0) {
				item.inGamers.map(gamer => {
					listGamer.push(gamer);
				});
			}
			else{
				item.inGamers.map(gamer => {
					listGamer.map(itemGamer => {
						if(gamer.uid === itemGamer.uid){
							itemGamer.chips += gamer.chips;
						}
					})
				});
			}
		});

		// console.log({totalOnMatch : totalOnMatch, listGamer : listGamer});
		var playerWin = listGamer.map(gamer => {
			if(gamer.uid === WinnerId) {
				return gamer;
			}
			else{
				listLose.push(gamer);
			}
		}).filter(gamerWin => gamerWin);

		// console.log('playerWin', playerWin)

		listLose = listLose.map(gamerLose => {
			if(gamerLose.chips > playerWin[0].chips){
				gamerLose.chips -= playerWin[0].chips;
				totalOnMatch -= gamerLose.chips;
				//or surplus += gamerLose.chips; => totalonMatch = totalOnMatch -total(surplus)
				return gamerLose;
			}
			else{
				gamerLose.chips = 0;
				return gamerLose
			}
		});
		// console.log({listLose : listLose, totalOnMatch : totalOnMatch})

		return {status : true, listLose, totalOnMatch };
	}
	catch(e) {
		console.log('Error : ', e);
		return {status : false, message : e}
	}
}