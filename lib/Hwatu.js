
var Hwatu = {};
exports = module.exports = Hwatu;


Hwatu.newSet = function( ) {
	return [ 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20 ];
};


Hwatu.draw = function(cards, n) {
	var len = cards.length;
	if(len < n) return [];
	
	var subset = [];
	while(n -- > 0) {
		var i = Math.floor( Math.random() * len );
		subset.push( cards[i] );
		cards.splice(i,1); // NOTICE: splice will return an array
		len --;
	}
	console.log('subset',subset);
	return subset;
};


Hwatu.merge = function( a, b ) {
	return a.concat(b);
};
