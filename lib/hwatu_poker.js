var HwatuPoker = {};
exports = module.exports = HwatuPoker;

HwatuPoker.rank = function (userCard){
	var userScore;
	const i = 0;
	let typeA = false // check card Type A or B
	//if second card if bigger than first card => change card index
	if(userCard[i] > userCard[i+1] ) {
		let exchange = userCard[i]
		userCard[i] = userCard[i+1]
		userCard[i+1] = exchange
	}
	// if card type is A
	if(userCard[i] < 11) {
		typeA = true 
	}
	//set userScore 
	if(userCard[i] == 1 || userCard[i] == 11) {	//if first card is 1
		if(typeA) {
			if(userCard[i+1] == 3) {
				 return userScore = 48
			} else if(userCard[i+1] == 8) {
				 return userScore = 49
			} else if(userCard[i+1] == 11) {
				return userScore = 31
			} 
		} 
		if(userCard[i+1] == 2 || userCard[i+1] == 12) {
			return userScore = 29
		} else if(userCard[i+1] == 4  || userCard[i+1] == 14) {
			return userScore = 28
		} else if(userCard[i+1] == 9  || userCard[i+1] == 19) {
			return userScore = 27
		} else if(userCard[i+1] == 10  || userCard[i+1] == 20) {
			return userScore = 26
		}
		return userScore = 10 + ((userCard[i] + userCard[i+1]) %10) //if no have rule
	} else if(userCard[i] == 3 || userCard[i] == 13) { //if first card is 3
		if(typeA) {
			if(userCard[i+1] == 7) {
				return userScore = 0
			} else if(userCard[i+1] == 8) {
				return userScore = 50 
			} else if(userCard[i+1] == 13) {
				return userScore = 33 
			}
		} 
		return userScore = 10 + ((userCard[i] + userCard[i+1]) %10) //if no have rule
	} else if(userCard[i] == 4 || userCard[i] == 14) { //if first card is 4
		if(typeA) {
			if(userCard[i+1] == 7) {
				return userScore = 1 
			} else if(userCard[i+1] == 9) {
				return userScore = 40
			} else if(userCard[i+1] == 14) {
				return userScore = 34
			}
		}
		if(userCard[i+1] == 6 || userCard[i+1] == 16) {
			return userScore = 24
		} else if(userCard[i+1] == 9 || userCard[i+1] == 19) {
			return userScore = 30
		} else if(userCard[i+1] == 10 || userCard[i+1] == 20) {
			return userScore = 25
		} 
		return userScore = 10 + ((userCard[i] + userCard[i+1]) %10) //if no have rule
	} else if(userCard[i] == 10) { //if first card is 10
		if(userCard[i+1] == 20) {
			return userScore = 47
		} else{
			return userScore = 10 + ((userCard[i] + userCard[i+1]) %10) //if no have rule
		}
	} else if(userCard[i] == userCard[i+1]%10) { //if first card and second card is same
		return userScore = 30 + userCard[i]
	} else{
		return userScore = 10 + ((userCard[i] + userCard[i+1]) %10) //if no have rule
	}
}
HwatuPoker.findWinnerPlayer = function(userScore){
	var winnerCount = 0;
	var winnerScore = 0;
	var killGwangUser = 0;
	var killGwang = false;
	var killTtangUser = 0;
	var killTtang = false;
	var winner = [];
	for(let i = 0; i<userScore.length ;i++) {
		if(userScore[i] == 0) {
			killTtangUser = i
			killTtang = true
		}
		if(userScore[i] == 1) {
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
	if(winnerScore == 48 || winnerScore == 49) {
		if(killGwang == true) {
			winner[winnerCount] = killGwangUser
		}
	} 
	else if(winnerScore > 30 && winnerScore < 40) {
		if(killTtang == true) {
			winner[winnerCount] = killTtangUser
		}
	} 
	else if(winnerScore == 30 || winnerScore == 40) {
		//reGame() 
		return { message : 'reGame'}
	} 
	else if(winnerScore == 11 && killGwang == true) {
		winnerCount++
		winner[winnerCount] = killGwangUser
	} 
	else if(winnerScore == 10 && killTtang == true) {
		winnerCount++
		winner[winnerCount] = killTtangUser
	} 
	//check winner count
	if(winnerCount == 0) {
		// endGame()
		return { message : 'endGame', winner : winner}
	} else if(winnerCount > 0) {
		// reGame()
		return { message : 'newGame',winner : winner}
	}
}
HwatuPoker.Gwangdang = function(userCard){
	var hwatu = this;
	var score = hwatu.rank(userCard);
	switch(score){
		case 50 :
			return "38광땡";
			break;
		case 49 :
				return "18광땡";
				break;
		case 48 :
			return "13광땡";
			break;
		case 47 :
			return "장땡";
			break;

		case 40:
			return "멍구사";
			break;
		case 39:
			return "구땡";
			break;
		case 38 :
			return "팔땡";
			break;
		case 37 :
			return "칠땡";
			break;
		case 36 :
			return "육땡";
			break;
		case 35 :
			return "오땡";
			break;
		case 34:
			return "사땡";
			break;
		case 33:
			return "삼땡";
			break;	
		case 32:
			return "이땡";
			break;
		case 31:
			return "일땡";
			break;
		case 30 :
			return "구사";
			break;
		case 29 :
			return "알리";
			break;
		case 28 :
			return "독사";
			break;
		case 27 :
			return "구삥";
			break;
		case 26:
			return "장삥";
			break;
		case 25:
			return "장사";
			break;
			
		case 24:
			return "세륙";
			break;
		case 19 :
			return "갑오";
			break;
		case 18 :
			return "8끗";
			break;
		case 17 :
			return "7끗";
			break;
		case 16 :
			return "6끗";
			break;
		case 15:
			return "5끗";
			break;
		case 14:
			return "4끗";
			break;
		case 13 :
			return "3끗";
			break;
		case 12 :
			return "2끗";
			break;
		case 11:
			return "1끗";
			break;
		case 10:
			return "끗";
			break;
		case 1:
			return "멍구사";
			break;
		case 0:
			return "멍구사";
			break;
		default : 
			return '';
	}
}


