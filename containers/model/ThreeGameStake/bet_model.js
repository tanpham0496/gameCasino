const mongoose = require('mongoose');

const bettingSchema = new mongoose.Schema({
	game_type : { type: Number, required: true, trim: true },
	game_id : { type: String, required: true, trim: true },
	user_id : { type: String, required: true, trim: true },
	betOption : { type: String, required: true, trim: true },
	amount : { type: Number, required: true, default: 0 },
	rewardAmount : { type: Number, required: true, default: 0 },
	status : { type: Number, default: 0 },
	payment_txid : { type: String, required: true, trim: true },
	reward_txid : { type: String,default: null },
	reward_at : { type: Number,default: null },
	create_at : { type: Number,default: Date.now() },
	update_at : { type: Number,default: Date.now() }
})
module.exports = mongoose.model('betting', bettingSchema);