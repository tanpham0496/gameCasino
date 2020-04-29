const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
	// uid : {type : mongoose.Schema.Types.ObjectId, index : true},
	uid : {type : String , required : true, trim : true},
    name: { type: String, required: true },
    passwd: { type: String },
    phone: { type: Number },
    email : { type : String , trim : true, index : true},
    coins : {type : Number, default : 0 },
 	score : {type : Number, default : 0 },
    exp : {type : Number, default : 0 },
    level : {type : String },
   	online : {type : Number, default : 0 },
}, { timestamps : true});

module.exports = mongoose.model('User', userSchema);