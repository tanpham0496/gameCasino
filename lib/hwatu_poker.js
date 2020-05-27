var HwatuPoker = {};
exports = module.exports = HwatuPoker;

HwatuPoker.rank =function (userCard){
	let typeA = false // check card Type A or B
	//if second card if bigger than first card => change card index
	if(userCard[0] > userCard[1] ) {
		let exchange = userCard[0]
		userCard[0] = userCard[1]
		userCard[1] = exchange
	}
	// if card type is A
	if(userCard[0] < 11) typeA = true;
	//set userScore 
	if(userCard[0] == 1 || userCard[0] == 11) {	//if first card is 1
		if(typeA) {
			if(userCard[1] == 3) return 48;
			else if(userCard[1] == 8) return 49;
			else if(userCard[1] == 11) return 31;
		} 
		if(userCard[1] % 10 == 2) return 29;
		else if(userCard[1] %10 == 4) return 28;
		else if(userCard[1] %10 == 9) return 27;
		else if(userCard[1] %10 == 0) return 26;
	} else if(userCard[0] == 2 ) { //if first card is 2
		if(userCard[1] == 11) return 29;
		else if(userCard[1] == 12) return 32;
	} else if(userCard[0] == 3 || userCard[0] == 13) { //if first card is 3
		if(typeA) {
			if(userCard[1] == 7) return 0;
			else if(userCard[1] == 8) return 50;
			else if(userCard[1] == 13) return 33;
		} 
	} else if(userCard[0] == 4 || userCard[0] == 14) { //if first card is 4
		if(typeA) {
			if(userCard[1] == 7) return 1;
			else if(userCard[1] == 9) return 40;
			else if(userCard[1] == 11) return 28;
			else if(userCard[1] == 14) return 34;
		}
		if(userCard[1] %10 == 6) return 24;
		else if(userCard[1] %10 == 9) return 30;
		else if(userCard[1] %10 == 0) return 25;
	} else if(userCard[0] == 6) { //if first card is 6
		if(userCard[1] == 14) return 24;
		else if(userCard[1] == 16) return 36;
	} else if(userCard[0] == 9) { //if first card is 6
		if(userCard[1] == 11) return 27;
		else if(userCard[1] == 14) return 30;
		else if(userCard[1] == 19) return 39;
	} else if(userCard[0] == 10) { //if first card is 10
		if(userCard[1] == 11) return 26;
		else if(userCard[1] == 14) return 25;
		else if(userCard[1] == 20) return 47;
	} else if(userCard[0] == userCard[1]%10) return 30 + userCard[0]; //if first card and second card is same
	return 10 + ((userCard[0] + userCard[1]) %10) //if no have rule
}
HwatuPoker.findWinnerPlayer = function(userScore){
	var winnerCount = 0;
	var winnerScore = -1;
	var killGwangUser = -1;
	var killGwang = false;
	var killTtangUser = -1;
	var killTtang = false;
	var winner = [];
	// check winner and killOption
	for(let i = 0; i < userScore.length; i++) {
		if(userScore[i] == 0) {
			killTtangUser = i
			killTtang = true
		} else if(userScore[i] == 1) {
			killGwangUser = i
			killGwang = true
		}
		if(winnerScore < userScore[i]) {
			winnerCount = 0
			winner[winnerCount] = i
			winnerScore = userScore[i]
		} else if (winnerScore == userScore[i]) {
			winnerCount++
			winner[winnerCount] = i
		}
	}
	//check Special rule
	if((winnerScore == 48 && killGwang) || (winnerScore == 49 && killGwang)) return { message : 'endGame', winner : [killGwangUser]};
	else if(winnerScore > 30 && winnerScore < 40 && killTtang) return { message : 'endGame', winner : [killTtangUser]};
	else if(winnerScore == 30 || winnerScore == 40) return { message : 'reGame','winner': winnerScore};
	
	else if(winnerScore == 11 && killGwang) {
		winnerCount++;
		winner[winnerCount] = killGwangUser;
	} 
	else if(winnerScore == 10 && killTtang) {
		winnerCount++;
		winner[winnerCount] = killTtangUser;
	} 
	//check winner count
	if(winnerCount > 0) return { message : 'newGame', winner : winner};
	return { message : 'endGame', winner : winner};
}


HwatuPoker.Gwangdang = function(userCard){
	var hwatu = this;
	var score = hwatu.rank(userCard);
	switch(score){
		case 50 :
		return "38 king pair";
		break;
		case 49 :
		return "18 king pair";
		break;
		case 48 :
		return "13 king pair";
		break;
		case 47 :
		return "10 pair";
		break;
		case 40:
		return "Stupid";
		break;
		case 39:
		return "9 pair";
		break;
		case 38 :
		return "8 pair";
		break;
		case 37 :
		return "7 pair";
		break;
		case 36 :
		return "6 pair";
		break;
		case 35 :
		return "5 pair";
		break;
		case 34:
		return "4 pair";
		break;
		case 33:
		return "3 pair";
		break;	
		case 32:
		return "2 pair";
		break;
		case 31:
		return "1 pair";
		break;
		case 30 :
		return "Nothing";
		break;
		case 29 :
		return "Ali";
		break;
		case 28 :
		return "Docsa";
		break;
		case 27 :
		return "Guping";
		break;
		case 26:
		return "Jangping";
		break;
		case 25:
		return "Jangsa";
		break;
		case 24:
		return "Seruk";
		break;
		case 19 :
		return "9 end";
		break;
		case 18 :
		return "8 end";
		break;
		case 17 :
		return "7 end";
		break;
		case 16 :
		return "6 end";
		break;
		case 15:
		return "5 end";
		break;
		case 14:
		return "4 end";
		break;
		case 13 :
		return "3 end";
		break;
		case 12 :
		return "2 end";
		break;
		case 11:
		return "1 end";
		break;
		case 10:
		return "0 end";
		break;
		case 1:
		return "Police";
		break;
		case 0:
		return "Slave";
		break;
		default : 
		return '';
	}
}

