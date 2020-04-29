//CONNECT MONGODB
const mongoose = require('mongoose');

mongoose.set('useCreateIndex', true);
const dbURI = 'mongodb://localhost/Casino';
try {
   mongoose.connect(dbURI, {
       useNewUrlParser: true,
       useCreateIndex: true,
       useFindAndModify: false,
       useUnifiedTopology: true,
    })
} catch (error) { throw error}

// When successfully connected
mongoose.connection.on('connected', function () {
    console.log('Mongoose default connection open to ' + dbURI);
});

// If the connection throws an error
mongoose.connection.on('error', function (err) {
    console.log('Mongoose default connection error: ' + err);
});

// When the connection is disconnected
mongoose.connection.on('disconnected', function () {
    console.log('Mongoose default connection disconnected');
});

// If the Node process ends, close the Mongoose connection
process.on('SIGINT', function () {
    mongoose.connection.close(function () {
        console.log('Mongoose default connection disconnected through app termination');
        process.exit(0);
    });
});

mongoose.Promise = global.Promise;
module.exports = {
	User : require('../containers/model/userModel'),
    BlocksCasino : require('../containers/model/blockMatchModel'),
    games: require('../containers/model/ThreeGameStake/game_model'),
    blockGames : require('../containers/model/ThreeGameStake/block_model'),
    betting : require('../containers/model/ThreeGameStake/bet_model')
}