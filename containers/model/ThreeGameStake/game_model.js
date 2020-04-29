const mongoose = require('mongoose');

const gamesSchema = new mongoose.Schema({
	game_type : { type: Number, required: true, trim: true },
	block_id : { type: Number, required: true, trim: true },
	options : { type: String, required: true, trim: true },
	winner : { type: String, trim: true },
	status : { type: Number, default: 0 },
	create_at : { type: Number,default: Date.now() },
	update_at : { type: Number,default: Date.now() }
})
module.exports = mongoose.model('games', gamesSchema);