module.exports = {
	get: function(obj) {
		var args = process.argv.slice(2);
		var pair, k, v;

		for (var k in obj) //console.log('require: ' + k);

		for (var i = 0; i < args.length; i++) {
			pair = args[i].split('=');
			k = String(pair[0]).trim();
			v = String(pair[1]).trim();
			obj.hasOwnProperty(k) && (obj[k] = v);
		}

		return obj;
	}
};
