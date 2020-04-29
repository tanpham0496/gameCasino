const RPC = require('./lib/rpc');
const HTTPProvider = require('./lib/provider/HTTPProvider');
const BLOOD = require('./blood/blood');
const KeyPair = require('./lib/crypto/key_pair');
const Signature = require('./lib/crypto/signature');
const {Tx} = require('./lib/structs');
const Algorithm = require('./lib/crypto/algorithm');
const Account = require('./blood/account');
const TxHandler = require('./blood/tx_handler');
const base58 = require('bs58');

module.exports = {
	BLOOD: BLOOD,
    RPC: RPC,
    HTTPProvider: HTTPProvider,
    KeyPair: KeyPair,
    Tx : Tx,
    Algorithm: Algorithm,
    Account: Account,
    TxHandler: TxHandler,
    Bs58: base58,
    Signature: Signature,
};

(function(){
    if(typeof window !== 'undefined'){
        window.BLOOD = module.exports
    }
})();