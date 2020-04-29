//block right click
window.oncontextmenu = (e) => { 
    e.preventDefault();  // loại bỏ thao tác với chuột phải 
    event.stopPropagation();
}
//go home page  
function activePageIndex(){
	location.href = `./`;
}
//timer reset and betting
function gameTimer(gameIndex) {
	let valueBet
	let gameType
	if(seconds == 60) {
		seconds = 0
		writeHtmlTimeLine()
	}
	if (seconds > 0 && seconds < 60 ) { 
		$('#carteSoudCtrl') && $('#carteSoudCtrl')[0].play();
		$(`#timecountDown${seconds}`).css('background', `#D8EBF2`)
		if(seconds ==  10) {
			let amount = reFormatNumber(document.getElementById('number').value)
			if(gameIndex == 1 || gameIndex == 2) {
				var betValue = $('#valueBet').attr('data')
			} else if(gameIndex == 3) {
				let left = $('#valueBet .buttonValue:nth-child(1)').html() != "." ? $('#valueBet .buttonValue:nth-child(1)').html() : null
				let center = $('#valueBet .buttonValue:nth-child(2)').html() != "." ? $('#valueBet .buttonValue:nth-child(2)').html() : null
				let right = $('#valueBet .buttonValue:nth-child(3)').html() != "." ? $('#valueBet .buttonValue:nth-child(3)').html() : null
				var betValue = left && center && right ? [left,center,right] : null
			}
			getData(gameIndex, betValue)
			getBalnce(amount)
		}
	} else if (seconds == 0) {
		let value = reFormatNumber(document.getElementById('number').value)
		if(gameIndex == 1){
			valueBet = $('#valueBet').attr('data')
			gameType = "sippingBetting"
		} else if(gameIndex == 2) {
			valueBet = $('#valueBet').attr('data')
			gameType = "srpBetting"
		} else {
			let leftVal = $('#valueBet .buttonValue:nth-child(1)').html() != "." ? $('#valueBet .buttonValue:nth-child(1)').html() : null
			let centerVal = $('#valueBet .buttonValue:nth-child(2)').html() != "." ? $('#valueBet .buttonValue:nth-child(2)').html() : null
			let rightVal = $('#valueBet .buttonValue:nth-child(3)').html() != "." ? $('#valueBet .buttonValue:nth-child(3)').html() : null
			valueBet =  leftVal && centerVal && rightVal ? Array(leftVal, centerVal, rightVal) : null
			gameType = "lottoBetting"
		}
		const addGame = { 
			No: listBet[0].No+1, 
			Block: "null",
			Hash: "null",
			IntegerHash: "null",
			BetResult: "null",
			BetUser: "null",
			BetAmount: "null"
		}
		listBet.unshift(addGame)
		if(value >= BetPrice && valueBet) {
			$.ajax({
				type: 'POST',
				url: `${appLinkApi}/games/${gameType}`,
				dataType:"JSON",
				data : {
					_user : 'tanpham', 
					_token : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0YW5waGFtIiwiaWF0IjoxNTg0NzcyNDE3fQ.BQDplHY_1F7yUq0mh2yWA4PoZkb-BHcXFvXIhB12M50', 
					_blockNo : listBet[1].Block,
					_bet: valueBet, 
					_amount: value*1000, // 5k => 5000 
				},
				success: (data) => {
					document.getElementById('balance').innerHTML =  document.getElementById('balanceChange').innerHTML
					listBet[1].BetUser = valueBet === undefined ? "null" : valueBet
					listBet[1].BetAmount = value*1000
				},
				error: (request, status, error) => {}
			});

			$.ajax({
				type: 'POST',
				url: `${appLinkApi}/games/handriseExperience`,
				dataType:"JSON",
				data : {
					id : 'tanpham', 
					exp : valueBet,
					gameType : gameType
				},
				success: (data) => {
					console.log('hanldeRise Data=========================>', data);
				},
				error: (request, status, error) => {}
			});
		}
		resetValue(gameIndex)
		listByHeight(gameIndex)
	}
	seconds++;
}
//set view height
function listByHeight(gameIndex){
	let count = 1
	const betTbodyHeight= $('body').height() - ($('#header').height() + $('.betting').height() + 25); //20 is table padding //5 is table thead margin
	const betTheadHeight = $('.inner tr').height() 
	const itemExtraHeight = 6
	const countItem = parseInt((betTbodyHeight-betTheadHeight)/(betTheadHeight+itemExtraHeight))
	bets = []
	for(let i = 0; i < listBet.length ; i++){
		if(i == 10 ) break
			if(count > countItem) {
				break
			} else {
				bets.unshift(listBet[i])
				count ++
			}
		}
		setGameList(gameIndex)
	}	
//Increment Bet Amount by button
function mousedownIncrementValueTouch(){
	$('.buttonIncrement').css({'background-image': 'url("imagesGameNews/inc-click.png")'})
	let valueBalance = reFormatNumber(document.getElementById('balanceChange').innerHTML)
	if(valueBalance >= BetPrice) {
		if(!pressButton) {
			inC = setInterval(function(){
				let value = reFormatNumber(document.getElementById('number').value)
				value += BetPrice;
				valueBalance -=BetPrice
				document.getElementById('number').value = formatNumber(value);
				document.getElementById('balanceChange').innerHTML = formatNumber(valueBalance)
			}, 120)
			pressButton = true
		}
	}
}
function mouseupIncrementValue(){
	$('.buttonIncrement').css({'background-image': 'url("imagesGameNews/inc.png")'})
	const valueBalance = reFormatNumber(document.getElementById('balanceChange').innerHTML);
	if(valueBalance >= BetPrice) {
		document.getElementById('number').value = formatNumber(reFormatNumber(document.getElementById('number').value)+BetPrice)
		document.getElementById('balanceChange').innerHTML = formatNumber(valueBalance-BetPrice)
	}
	if (pressButton) {
		clearInterval(inC)
		pressButton = false;
	}
}
//Decrement Bet Amount by button
function mousedownDecrementValueTouch(gameIndex){
	$('.buttonDecrement').css({ 'background-image': 'url("imagesGameNews/dec-click.png")'})
	let value = reFormatNumber(document.getElementById('number').value)
	if(value >= BetPrice) {
		if(!pressButton) {
			deC = setInterval(function(){
				if(value == BetPrice){
					resetValue(gameIndex)
					clearInterval(deC)
					pressButton = false;
					return
				}
				let valueBalance = reFormatNumber(document.getElementById('balanceChange').innerHTML)
				value -= BetPrice;
				valueBalance += BetPrice
				document.getElementById('number').value = formatNumber(value);
				document.getElementById('balanceChange').innerHTML = formatNumber(valueBalance)
			}, 120)
			pressButton = true
		} 
	}
}
function mouseupDecrementValue(gameIndex){
	$('.buttonDecrement').css({ 'background-image': 'url("imagesGameNews/dec.png")' })
	let value = reFormatNumber(document.getElementById('number').value)
	if(value > BetPrice) {
		document.getElementById('number').value = formatNumber(value-BetPrice)
		document.getElementById('balanceChange').innerHTML = formatNumber(reFormatNumber(document.getElementById('balanceChange').innerHTML)+BetPrice)
	} else if(value == BetPrice){
		resetValue(gameIndex)
	}
	if (pressButton) {
		clearInterval(deC)
		pressButton = false;
	}
}
//reset bet value of betting page
function resetValue(gameIndex) {
	document.getElementById('number').value = 0;
	document.getElementById('balanceChange').innerHTML = document.getElementById('balance').innerHTML;
	if(gameIndex == 1 || gameIndex == 2) {
		$('#valueBet').removeAttr('data')
		$('#valueBet').empty()
		$('#valueBet').append(`<img src="imagesGameNews/bet_null.png" alt="">`)
	} else if(gameIndex == 3) {
		document.getElementById('inputNumberLeft').value = 0
		document.getElementById('inputNumberCenter').value = 0
		document.getElementById('inputNumberRight').value = 0
		changeHtmlProceeding('reset')
	}
}
function mousedownResetValueTouch(gameIndex){
	$('.buttonReset').css({ 'background-image': 'url("imagesGameNews/reset-click.png")'})
	resetValue(gameIndex)
}
function mouseupResetValue(){
	$('.buttonReset').css({ 'background-image': 'url("imagesGameNews/reset.png")' })
}
//show game list
function setGameList(gameIndex){
	$('.bet-main > .gamelist > .inner > tbody').empty()
	if(gameIndex == 1 || gameIndex == 2) {
		for (var i = 0; i < bets.length; i++) {
			if(i == bets.length-1){
				$('.bet-main > .gamelist > .inner > tbody').append(` 
					<tr >
					<td><span>${bets[i].No}</span></td>
					<td><span id="valueBet" class="valueBet${i}">${bets[i].BetUser}</span></td>
					<td><span class="valueResult${i}" style="color:#4A77D9; font-weight: 600;">Proceeding</span></td>
					<td class="truncatedcss" onclick='activePage(${JSON.stringify(bets[i])})'><span class="wordNoBet"><img src="imagesGameNews/detail.png" alt=""></span></td>
					</tr>
					`)
			} else {
				if(bets[i].BetResult == "null"){
					$('.bet-main > .gamelist > .inner > tbody').append(` 
						<tr >
						<td><span>${bets[i].No}</span></td>
						<td><span class="valueBet${i}">${bets[i].BetUser}</span></td>
						<td><span class="valueResult${i}" style="color:#4A77D9; font-weight: 600;">Waiting</span></td>
						<td class="truncatedcss" onclick='activePage(${JSON.stringify(bets[i])})'><span class="wordNoBet"><img src="imagesGameNews/detail.png" alt=""></span></td>
						</tr>
						`)
				} else {
					$('.bet-main > .gamelist > .inner > tbody').append(` 
						<tr >
						<td ${checkWin(bets[i])}><span>${bets[i].No}</span></td>
						<td ${checkWin(bets[i])} ><span class="valueBet${i}">${bets[i].BetUser}</span></td>
						<td ${checkWin(bets[i])} ><span class="valueResult${i}">${bets[i].BetResult}</span></td>
						<td class="truncatedcss" onclick='activePage(${JSON.stringify(bets[i])})'><span class="word"><img src="imagesGameNews/detail.png" alt=""></span></td>
						</tr>
						`)
				}
			}
			getImageBetAndResult(`valueBet${i}`)
			getImageBetAndResult(`valueResult${i}`)
		}
	} else if(gameIndex == 3) {
		for (var i = 0; i < bets.length; i++) {
			if(i == bets.length-1){
				$('.bet-main > .gamelist > .inner > tbody').append(` 
					<tr>
					<td><span style="color:black;">${bets[i].No}</span></td>
					<td id="valueBet" style="width: 30%;" class="valueBet${i}"></td>
					<td style="width: 30%;" class="valueResult${i}"><span style="color:#4A77D9; font-weight: 600;">Proceeding</span></td>
					<td class="truncatedcss" onclick='activePage(${JSON.stringify(bets[i])})'><span><img src="imagesGameNews/detail.png" alt=""></span></td>
					</tr>
					`)
				getImageBetAndResult(`valueBet${i}`, bets[i].BetUser)
			} else {
				if(bets[i].BetResult === "null"){
					$('.bet-main > .gamelist > .inner > tbody').append(` 
						<tr >
						<td><span>${bets[i].No}</span></td>
						<td style="width: 30%;" class="valueBet${i}"></td>
						<td style="width: 30%;" class="valueResult${i}"><span style="color:#4A77D9; font-weight: 600;">Waiting</span></td>
						<td class="truncatedcss" onclick='activePage(${JSON.stringify(bets[i])})'><span><img src="imagesGameNews/detail.png" alt=""></span></td>
						</tr>
						`)
				} else {
					$('.bet-main > .gamelist > .inner > tbody').append(` 
						<tr >
						<td ${checkWin(bets[i])}><span>${bets[i].No}</span></td>
						<td ${checkWin(bets[i])} class="valueBet${i} width30"></td>
						<td ${checkWin(bets[i])} class="valueResult${i} width30"></td>
						<td class="truncatedcss" onclick='activePage(${JSON.stringify(bets[i])})'><span class="word"><img src="imagesGameNews/detail.png" alt=""></span></td>
						</tr>
						`)
					getImageBetAndResult(`valueResult${i}`, bets[i].BetResult)
				}
				getImageBetAndResult(`valueBet${i}`, bets[i].BetUser)
			}
		}
	}
}
//update timeline
function writeHtmlTimeLine(){
	$('#lineTime').empty()
	for (var i = 1; i < 60; i++) {
		$('#lineTime').append(` 
			<div class="timecountDown" id="timecountDown${i}"></div>
			`)
	}
}
//open bet page
function activePage(item){
	$(".popup-main").toggle()
	setDetail(item)
}
//close bet page
function activePageHome(gameIndex){
	if(gameIndex == 3){
		$(".popup-main >.block-transaction > .block > div:nth-child(2)").empty()
	}
	$(".popup-main >.block-transaction > .block > table > tbody").empty()
	$(".popup-main").hide()
}
//format number to amount
function formatNumber(number) {
	if(number != 0){
		return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")+"K"
	} else {
		return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
	}
}
//format amount to number
function reFormatNumber(text){
	let result = text.replace(/,/g, '')
	result = result.replace('K', '')
	return parseInt(result)
}
//call API of get server time
function getTimestamp(gameIndex){
	$.ajax({
		type: 'GET',
		url: `${appLinkApi}/games/getTimestamp`,
		success: (data) => { 
			seconds = new Date(data.timestamp).getSeconds()
			document.getElementById('userId').innerHTML = userId
			writeHtmlTimeLine()
			for (var i = 1; i <= seconds; i++) {
				$(`#timecountDown${i}`).css('background', `#D8EBF2`)
			}
			window.setInterval(function() {  gameTimer(gameIndex); }, 1000);
		},
		error: (request, status, error) => { console.log(error) }
	});
}
//call API of get user balance
function getBalnce(betAmount = null) {
	$.ajax({
		type: 'POST',
		url: `${appLinkApi}/users/userBalance`,
		dataType:"JSON",
		data : {
			id : 'tanpham',
			token : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0YW5waGFtIiwiaWF0IjoxNTg0NzcyNDE3fQ.BQDplHY_1F7yUq0mh2yWA4PoZkb-BHcXFvXIhB12M50'
		},
		success: (data) => { 
			document.getElementById('balance').innerHTML = data.balance === undefined ? "loading..." : formatNumber(parseInt(data.balance/1000))  //=== undefined ? data.balance : formatNumber(parseInt(data.Balance/1000))
			if(betAmount) {
				return document.getElementById('balanceChange').innerHTML = data.balance === undefined ? "loading..." : formatNumber(parseInt(data.balance/1000) - betAmount)
			}
			document.getElementById('balanceChange').innerHTML = data.balance === undefined ? "loading..." : formatNumber(parseInt(data.balance/1000))//=== undefined ? data.balance: formatNumber(parseInt(data.Balance/1000))
		},
		error: (request, status, error) => {}
	});
}
//call API of get game data
function getData(gameIndex, betValue = null) { 
	let gameurl
	if(gameIndex == 1) {
		gameurl = 'sipping'
	} else if(gameIndex == 2) {
		gameurl = 'srp'
	} else if(gameIndex == 3) {
		gameurl = 'lotto'
	}
	$.ajax({
		type: 'POST',
		url: `${appLinkApi}/games/${gameurl}`,
		data : {
			_user : userId
		},
		success: (data) => { 
			localStorage.setItem('listBet', JSON.stringify(data))
			listBet = JSON.parse(localStorage.getItem('listBet'))
			listByHeight(gameIndex)
			if(gameIndex == 1 || gameIndex == 2) {
				$('#valueBet').html("")
				$('#valueBet').attr('data', betValue)
				if(gameIndex == 1 && betValue == 0) {
					$('#valueBet').append( `<img src="imagesGameNews/button_even.png" alt="">`)
				} else if(gameIndex == 1 && betValue == 1) {
					$('#valueBet').append( `<img src="imagesGameNews/button_odd.png" alt="">`)
				} else if(gameIndex == 2 && betValue == 0) {
					$('#valueBet').append( `<img class="srpIcon" src="imagesGameNews/icon_Scissors.png" alt="">`)
				} else if(gameIndex == 2 && betValue == 1) {
					$('#valueBet').append( `<img class="srpIcon" src="imagesGameNews/icon_Rock.png" alt="">`)
				} else if(gameIndex == 2 && betValue == 2) {
					$('#valueBet').append( `<img class="srpIcon" src="imagesGameNews/icon_Paper.png" alt="">`)
				} else {
					$('#valueBet').append(`<img src="imagesGameNews/bet_null.png" alt="">`)
				}
			} else if (gameIndex == 3 && betValue) {
				$('#valueBet .buttonValue:nth-child(1)').html(betValue[0])
				$('#valueBet .buttonValue:nth-child(2)').html(betValue[1])
				$('#valueBet .buttonValue:nth-child(3)').html(betValue[2])
				$('#valueBet .buttonValue:nth-child(1)').css({ 'background-image': 'url("imagesGameNews/inputNumber-left.png")', 'color' : 'white'})
				$('#valueBet .buttonValue:nth-child(2)').css({ 'background-image': 'url("imagesGameNews/inputNumber-center.png")', 'color' : 'white'})
				$('#valueBet .buttonValue:nth-child(3)').css({ 'background-image': 'url("imagesGameNews/inputNumber-right.png")', 'color' : 'white'})
			} 
		},
		error: (request, status, error) => {}
	});
}
