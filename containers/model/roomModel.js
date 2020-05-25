const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const roomSchema = new Schema({
    roomNum : {type : Number, default : 0, index : true},
    listUser : { type : Array, default : []},
    status : {type : String},
    type : {type : String, trim : true}

}, { timestamps : true});

module.exports = mongoose.model('Room', roomSchema);