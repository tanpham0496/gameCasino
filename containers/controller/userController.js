const express = require('express');
const router = express.Router();
const userService = require('../service/userService')
const blockCasino = require('../service/blocksCasinoService')

// router.post('/getUserId',getUserId);
router.post('/saveData', saveData);
router.post('/getBlocksByMatchId',getBlocksByMatchId);

router.post('/userBalance', userBalance);
router.post('/tx-create-reward', TxCreateReward);
router.post('/tx-create-pay', TxCreatePay);
router.post('/checkAccount', checkAccount);

router.post('/getInfoRoomCasino', getInfoRoomCasino);
router.post('/updateDataRoomCasino', updateDataRoomCasino);
router.post('/getInfoRoomCasinoId', getInfoRoomCasinoId);
router.post('/RemoveUserIdInCasino', RemoveUserIdInCasino);

module.exports = router;

// function getUserId(req, res, next) {
// 	 userService.getUserId(req.body)
//         .then(user => res.json(user))
//         .catch(err => next(err));
// }
function saveData(req, res, next) {
	 userService.saveData(req.body)
        .then(user => res.json(user))
        .catch(err => next(err));
}

function getBlocksByMatchId(req, res, next) {
	 blockCasino.getBlocksByMatchId(req.body)
        .then(user => res.json(user))
        .catch(err => next(err));
}
function getBlocksByMatchId(req, res, next) {
	 blockCasino.getBlocksByMatchId(req.body)
        .then(user => res.json(user))
        .catch(err => next(err));
}
// get and check balance
function userBalance(req, res, next) {
	 userService.userBalance(req.body)
        .then(user => res.json(user))
        .catch(err => next(err));
}
// get and check balance
function checkAccount(req, res, next) {
         userService.checkAccount(req.body)
        .then(user => res.json(user))
        .catch(err => next(err));
}
//admin send money to user
function TxCreateReward(req, res, next) {
	 userService.TxCreateReward(req.body)
        .then(user => res.json(user))
        .catch(err => next(err));
}
//user send money to admin
function TxCreatePay(req, res, next) {
	 userService.TxCreatePay(req.body)
        .then(user => res.json(user))
        .catch(err => next(err));
}function getInfoRoomCasino(req, res, next) {
     userService.getInfoRoomCasino(req.body)
        .then(user => res.json(user))
        .catch(err => next(err));
}function updateDataRoomCasino(req, res, next) {
     userService.updateDataRoomCasino(req.body)
        .then(user => res.json(user))
        .catch(err => next(err));
}
function getInfoRoomCasinoId(req, res, next) {
        userService.getInfoRoomCasinoId(req.body)
           .then(user => res.json(user))
           .catch(err => next(err));
   }

   function RemoveUserIdInCasino(req, res, next) {
        userService.RemoveUserIdInCasino(req.body)
           .then(user => res.json(user))
           .catch(err => next(err));
   }