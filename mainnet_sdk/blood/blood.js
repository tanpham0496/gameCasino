const RPC = require('../lib/rpc');
const {Tx} = require('../lib/structs');
const TxHandler = require('./tx_handler');
const Callback = require('./callback');
const Base58 = require('bs58');

const defaultConfig = {
    habrosRatio: 1,
    habrosLimit: 2000000,
    delay: 0,
    expiration: 90,
    defaultLimit: "unlimited"
};

/**
 * BLOOD开发工具，可以帮忙发交易
 * @constructor
 * @param {object}config - 这个blood的配置
 * @param {HTTPProvider} - provider
 */
class BLOOD {
    constructor(config) {
        this.rpc = undefined;
        this.account = undefined;
        this.serverTimeDiff = 0;

        this.config = defaultConfig;
        if (!config) {
            return
        }
        Object.assign(this.config, config);
    }

    /**
     * 调用智能合约ABI
     * @param {string}contract - 智能合约ID或者域名
     * @param {string}abi - 智能合约ABI
     * @param {Array}args - 智能合约参数数组
     * @returns {Tx}
     */
    callABI(contract, abi, args) {
        const t = new Tx(this.config.habrosRatio, this.config.habrosLimit);
        t.addAction(contract, abi, JSON.stringify(args));
        t.setTime(this.config.expiration, this.config.delay, this.serverTimeDiff);
        return t
    }

    /**
     * 转账
     * @param {string}token - token名
     * @param {string}from - 付款人
     * @param {string}to - 收款人
     * @param {string}amount - 金额
     * @param {string}memo - 转账备注
     * @returns {Tx}
     */
    transfer(token, from, to, amount, memo = "") {
        let t = this.callABI("token.blood", "transfer", [token, from, to, amount, memo]);
        t.addApprove(token, amount);
        return t;
    }

    /**
     * 新建账号
     * @param {string}name - 用户名
     * @param {string}creator - 帐号创建者的用户名
     * @param {string}ownerkey - 用户的owner key
     * @param {string}activekey - 用户的active key
     * @param {number}initialBRAIN - 用户初始BRAIN
     * @param {number}initialHabrosPledge - 用户初始BLOOD质押
     * @returns {Tx}
     */
    newAccount(name, creator, ownerkey, activekey, initialBRAIN, initialHabrosPledge) {
        if (!this._checkPublicKey(ownerkey) || !this._checkPublicKey(activekey))
            throw "error public key";

        const t = new Tx(this.config.habrosRatio, this.config.habrosLimit);
        t.addAction("auth.blood", "signUp", JSON.stringify([name, ownerkey, activekey]));
        if (initialBRAIN > 10) {
            t.addAction("brain.blood", "buy", JSON.stringify([creator, name, initialBRAIN]));
        }
        if (initialHabrosPledge > 0){
            t.addAction("habros.blood", "pledge", JSON.stringify([creator, name, initialHabrosPledge+""]));
        }
        t.setTime(this.config.expiration, this.config.delay, this.serverTimeDiff);
        return t
    }

    _checkPublicKey(key) {
        let b = Base58.decode(key);
        return b.length === 32;
    }

    /**
     * 直接发送交易
     * @param tx
     * @constructor
     */
    signAndSend(tx) {
        tx.setTime(this.config.expiration, this.config.delay, this.serverTimeDiff);
        let cb = new Callback(this.currentRPC.transaction);
        let hash = "";
        let self = this;

        self.currentAccount.signTx(tx);
        setTimeout(function () {
            self.currentRPC.transaction.sendTx(tx)
                .then(function(data){
                    hash = data.hash;
                    cb.pushMsg("pending", hash);
                    cb.hash = hash
                })
                .catch(function (e) {
                    cb.pushMsg("failed", e)
                })
        }, 50);

        return cb;
    }

    /**
     * 钱包预留接口，可以获得来自钱包的账户
     */
    currentAccount() {
        return this.currentAccount;
    }

    /**
     * 钱包预留接口，可以获得来自钱包的provider
     */
    currentRPC() {
        return this.currentRPC;
    }

    /**
     * set a RPC to this blood
     * @param {RPC}rpc - rpc created by hand
     */
    async setRPC(rpc) {
        this.currentRPC = rpc;
        
        const requestStartTime = new Date().getTime() * 1e6;
        const nodeInfo = await this.currentRPC.net.getNodeInfo();
        const requestEndTime = new Date().getTime() * 1e6;

        if (requestEndTime - requestStartTime < 30 * 1e9) {
            this.serverTimeDiff = nodeInfo.server_time - requestStartTime;
        }
    };

    /**
     * set an account to this blood
     * @param {Account}account - rpc created by hand
     *
     */
    setAccount(account) {
        this.currentAccount = account;
    }

}

module.exports = BLOOD;