var aes256 = require('aes256');

module.exports = {
	encryptObjectBySeckey: function(obj, seckey, callback) {
		try {
			obj.ts = Date.now();
			return aes256.encrypt(seckey, JSON.stringify(obj));
		} catch (e) {
			return null;
		}
	},
	decryptObjectBySeckey: function(data, seckey, callback) {
		try {
			return JSON.parse(aes256.decrypt(seckey, data));
		} catch (e) {
			return null;
		}
	}
};
