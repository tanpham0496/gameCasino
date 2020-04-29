function nFormatter(num) {
    if (num >= 1000) {
        let result = (num / 1000).toString()+"K"
        return result
    } else return num.toString();
}

function reFormatter(text){
    if(!Number.isInteger(Number(text))){
        let result = text.split('K')[0]*1000
        return result
    } else  return parseInt(text)
}

// format Number
function formatNumber(number) {
    number = parseInt(number);
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// reformat Number
function reFormatNumber(text){
    let result = text.replace(/,/g, '')
    return parseInt(result)
}

function truncStringPortion(str, firstCharCount = 6, endCharCount = 6, dotCount = 3) {
    var convertedStr="";
    convertedStr+=str.substring(0, firstCharCount);
    convertedStr += ".".repeat(dotCount);
    convertedStr+=str.substring(str.length-endCharCount, str.length);
    return convertedStr;
}

function writeHtmlTimeLine(){
    $('#lineTime').empty()
    for (var i = 59; i > 0; i--) {
        $('#lineTime').append(` 
            <div class="timecountDown" id="timecountDown${i}"></div>
        `)
    }
}

/////////////////////// Button Increment ////////////////////
function incrementValue(){
    if (lockButton) return;
    else {
        var value = document.getElementById('number').value
        value = reFormatter(value)
        var valueBalance = document.getElementById('balanceChange').innerHTML;
        valueBalance = reFormatNumber(valueBalance)
        if(valueBalance < 100) return
        else {
            value += 100;
            valueBalance -=100 
            document.getElementById('number').value = value >= 1000 ? nFormatter(value) : value;
            document.getElementById('balanceChange').innerHTML = formatNumber(valueBalance)
        }
    }
}
function mousedownIncrementValue(event){
    if(event.which != 1) return clearInterval(inC)
    else { mousedownIncrementValueTouch() }
}
function mousedownIncrementValueTouch(){
    $('.buttonIncrement').css({'background-image': 'url("imagesGameNews/inc-click.png")'})
    timeClick = Date.now()
    inC = setInterval(function(){
        var value = document.getElementById('number').value
        value = reFormatter(value)
        var valueBalance = document.getElementById('balanceChange').innerHTML;
        valueBalance = reFormatNumber(valueBalance)
        if(valueBalance < 1000){
            if(valueBalance < 100) return clearInterval(inC)
            else {
                value += 100;
                valueBalance -=100
                document.getElementById('number').value = value >= 1000 ? nFormatter(value) : value;
                document.getElementById('balanceChange').innerHTML = formatNumber(valueBalance)
            }
        } 
        else {
            value += 1000;
            valueBalance -=1000
            document.getElementById('number').value = value >= 1000 ? nFormatter(value) : value;
            document.getElementById('balanceChange').innerHTML = formatNumber(valueBalance)
        }
    }, 50)
}
function mouseupIncrementValue(){
    clearInterval(inC)
    $('.buttonIncrement').css({'background-image': 'url("imagesGameNews/inc.png")'})
    if(Date.now() - timeClick >= 400) lockButton = true;
    else lockButton = false;
    timeClick = 0
}
/////////////////////// End Increment ///////////////////////

/////////////////////// Button Decrement ////////////////////
function decrementValue() {
    if (lockButton) return;
    else{
        var value = document.getElementById('number').value
        value = reFormatter(value)
        var valueBalance = document.getElementById('balanceChange').innerHTML;
        valueBalance = reFormatNumber(valueBalance)
        if(value <= 0)  document.getElementById('number').value = 0;
        else {
            value -= 100;
            valueBalance +=100
            document.getElementById('number').value = value >= 1000 ? nFormatter(value) : value;
        }
        document.getElementById('balanceChange').innerHTML = formatNumber(valueBalance)
    }
}
function mousedownDecrementValue(event){
    if(event.which != 1) return clearInterval(deC)
    else { mousedownDecrementValueTouch() }
}
function mousedownDecrementValueTouch(){
    $('.buttonDecrement').css({ 'background-image': 'url("imagesGameNews/dec-click.png")'})
    timeClick = Date.now()
    deC = setInterval(function(){
        var value = document.getElementById('number').value
        value = reFormatter(value)
        var valueBalance = document.getElementById('balanceChange').innerHTML;
        valueBalance = reFormatNumber(valueBalance)
        if(value < 1000){
            if(value < 100) return clearInterval(deC)
            else {
                value -= 100;
                valueBalance +=100
                document.getElementById('number').value = value >= 1000 ? nFormatter(value) : value;
                document.getElementById('balanceChange').innerHTML = formatNumber(valueBalance)
            }
        } 
        else {
            value -= 1000;
            valueBalance +=1000
            document.getElementById('number').value = value >= 1000 ? nFormatter(value) : value;
            document.getElementById('balanceChange').innerHTML = formatNumber(valueBalance)
        }
    }, 50)
}
function mouseupDecrementValue(){
    clearInterval(deC)
    $('.buttonDecrement').css({ 'background-image': 'url("imagesGameNews/dec.png")' })
    if(Date.now() - timeClick >= 400) lockButton = true;
    else lockButton = false;
    timeClick = 0
}
////////////////////// End Decrement ////////////////////////

function getImageBetAndResult(className, item, column, idName){
    if(item[0] !== 'null'){
        $(`.${className}`).append( `
            <button class="buttonValue" style="background-image: url('imagesGameNews/inputNumber-left.png') !important; border-radius: 50%;"> ${item[0]}</button>
            <button class="buttonValue" style="background-image: url('imagesGameNews/inputNumber-center.png') !important; border-radius: 50%;"> ${item[1]}</button>
            <button class="buttonValue" style="background-image: url('imagesGameNews/inputNumber-right.png') !important; border-radius: 50%;"> ${item[2]}</button>
        `)
    } else if(item[0] === 'null'){
        if(column === 1){
            if(idName !== 3){
                $(`.${className}`).append(`
                    <button class="buttonValue" style="background-image: url('imagesGameNews/inputNumber-null.png') !important; border-radius: 50%; color: black;">#</button>
                    <button class="buttonValue" style="background-image: url('imagesGameNews/inputNumber-null.png') !important; border-radius: 50%; color: black;">#</button>
                    <button class="buttonValue" style="background-image: url('imagesGameNews/inputNumber-null.png') !important; border-radius: 50%; color: black;">#</button>
                `)
            } else {
                $(`.${className}`).append(`
                    <button class="buttonValue" style="background-image: url('imagesGameNews/inputNumber-null.png') !important; border-radius: 50%; color: black;">#</button>
                    <button class="buttonValue" style="background-image: url('imagesGameNews/inputNumber-null.png') !important; border-radius: 50%; color: black;">#</button>
                    <button class="buttonValue" style="background-image: url('imagesGameNews/inputNumber-null.png') !important; border-radius: 50%; color: black;">#</button>
                `)
            }
        } else if(column === 2){
            return
        }
    }
}
function writeHtml(){
    $('.blocks > .block > .inner > tbody').empty()
    for (var i = 0; i < bets.length; i++) {
        var item = JSON.stringify(bets[i])
        if(i == bets.length-1){
            $('.blocks > .block > .inner > tbody').append(` 
                <tr>
                    <td class="blockId"><span style="color:black;">#${bets[i].No}</span></td>
                    <td ${checkWin(bets[i])} id="valueBet"  style="width: 30%;" class="valueBet${i}"></td>
                    <td style="width: 30%;" class="valueResult${i}"><span style="color:#4A77D9; font-weight: 600;">Proceeding</span></td>
                    <td class="truncatedcss"><span class="wordNoBet"><img src="imagesGameNews/detail.png" alt="" style="opacity: 0.5;"></span></td>
                </tr>
            `)
            getImageBetAndResult(`valueBet${i}`, bets[i].UserSipping, 1, `valueBet${i}`)
        } else {
            if(bets[i].Sipping == "null"){
                $('.blocks > .block > .inner > tbody').append(` 
                    <tr >
                        <td class="blockId"><span>#${bets[i].No}</span></td>
                        <td style="width: 30%;" class="valueBet${i}"></td>
                        <td style="width: 30%;" class="valueResult${i}"><span style="color:#4A77D9; font-weight: 600;">Waiting</span></td>
                        <td class="truncatedcss"><span class="wordNoBet"><img src="imagesGameNews/detail.png" alt="" style="opacity: 0.5;"></span></td>
                    </tr>
                `)
                getImageBetAndResult(`valueBet${i}`, bets[i].UserSipping, 1, 3)
            } else {
                $('.blocks > .block > .inner > tbody').append(` 
                    <tr >
                        <td ${checkWin(bets[i])} class="blockId"><span>#${bets[i].No}</span></td>
                        <td ${checkWin(bets[i])} style="width: 30%;" class="valueBet${i}"></td>
                        <td ${checkWin(bets[i])} style="width: 30%;" class="valueResult${i}"></td>
                        <td class="point truncatedcss" onclick='activePage(${JSON.stringify(bets[i])})'><span class="word"><img src="imagesGameNews/detail.png" alt=""></span></td>
                    </tr>
                `)
                getImageBetAndResult(`valueBet${i}`, bets[i].UserSipping, 1, 3)
            }
        }
        getImageBetAndResult(`valueResult${i}`, bets[i].Sipping, 2)
    }
}
