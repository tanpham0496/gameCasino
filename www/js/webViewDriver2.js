export function webViewDriver2(){
    return `
    (function () {
        var promiseChain = Promise.resolve();
        var callbacks = {};
        var init = function () {
            // 유니크한 아이디를 생성한다.
            // native에서 callback 받을때 id의 callback을 호출한다.
            const guid = function () {
                function s4() {
                    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
                }
                return s4() + s4() + "-" + s4() + "-" + s4() + "-" + s4() + "-" + s4() + s4() + s4();
            }
    
            /**
             * javascript => react-native
             * javascript에서 react-native에 메세지를 보낸다.
             */
            window.webViewBridge = {
                send: function (targetFunc, data, success, error) {
    
                    var msgObj = {
                        targetFunc: targetFunc,
                        data: data || {}
                    };
    
                    if (success || error) {
                        msgObj.msgId = guid();
                    }
    
                    var msg = JSON.stringify(msgObj);
    
                    promiseChain = promiseChain.then(function () {
                        return new Promise(function (resolve, reject) {
                            console.log("react native에 메세지를 보냄 " + msgObj.targetFunc);
    
                            if (msgObj.msgId) {
                                callbacks[msgObj.msgId] = {
                                    onsuccess: success,
                                    onerror: error
                                };
                            }
                            window.ReactNativeWebView.postMessage(msg);
                            resolve();
                        })
                    }).catch(function (e) {
                        console.error('메세지 실패 ' + e.message);
                    });
                },
            };
    
            /** apple
             * react-native => javascript
             * react native에서 화면에 결과를 넘겨준다.
             */
            window.addEventListener('message', function (e) {
                //console.log("react native에서 메세지를 받음", JSON.parse(e.data));
                //console.log("react native에서 메세지를 받음", e.data);
                //alert(e.data)

                let data = JSON.parse(e.data)
                if(data.userToken){
                    localStorage.setItem('token', data.userToken)
                }
                if(data.userId){
                    localStorage.setItem('userId', data.userId)
                }
    
                var message;
                try {
                    //message = JSON.parse(e.data)
                    message = e.data
                }
                catch (err) {
                    console.error("메세지를 파싱할수 없음 " + err);
                    return;
                }
    
                // callback을 트리거한다.
                if (callbacks[message.msgId]) {
                    if (message.isSuccessfull) {
                        callbacks[message.msgId].onsuccess.call(null, message);
                    } else {
                        callbacks[message.msgId].onerror.call(null, message);
                    }
                    delete callbacks[message.msgId];
                }
            });
    
            /** android
             * react-native => javascript
             * react native에서 화면에 결과를 넘겨준다.
             * 안드로이드
             */
            window.document.addEventListener('message', function (e) {
                console.log("react native에서 메세지를 받음", JSON.parse(e.data));
                //console.log("react native에서 메세지를 받음", e.data);
                //alert(e.data)

                let data = JSON.parse(e.data)
                if(data.userToken){
                    localStorage.setItem('token', data.userToken)
                }
                if(data.userId){
                    localStorage.setItem('userId', data.userId)
                }

                var message;
                try {
                    //message = JSON.parse(e.data)
                    message = e.data
                }
                catch (err) {
                    console.error("메세지를 파싱할수 없음 " + err);
                    return;
                }
    
                // callback을 트리거한다.
                if (callbacks[message.msgId]) {
                    if (message.isSuccessfull) {
                        callbacks[message.msgId].onsuccess.call(null, message);
                    } else {
                        callbacks[message.msgId].onerror.call(null, message);
                    }
                    delete callbacks[message.msgId];
                }
            });
        }
    
        
        console.log('init');
        init();
    }());
    `
}