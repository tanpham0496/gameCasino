const mongoose = require('mongoose');

const blocksSchema = new mongoose.Schema({
	block : { type: Number, required: true, trim: true },
	timestamp : { type: String, default: 0 },
	hash : { type: String, required: true, trim: true },
	hash_int : { type: Number, required: true, trim: true },
	status : { type: Number, default: 0 },
	create_at : { type: Number,default: Date.now() },
	update_at : { type: Number,default: Date.now() }
})
module.exports = mongoose.model('blockGames', blocksSchema);