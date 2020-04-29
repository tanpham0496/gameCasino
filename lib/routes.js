
module.exports = (app) => {
	app.use('/games', require('../containers/controller/lottoSrpOeController'));
	app.use('/users', require('../containers/controller/userController'));
}