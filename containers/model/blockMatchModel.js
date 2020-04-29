const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const blockMatchSchema = new Schema({
    roomNumber: { type: Number },
    inGamers : [],
    Winner : {type : String },
 	status : {type : String },
    type : {type : String },
    matchId : {type : String },
   	totalBetting : {type : Number, default : 0 },
}, { timestamps : true});

module.exports = mongoose.model('BlocksCasino', blockMatchSchema);