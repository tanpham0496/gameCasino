exports = module.exports = {
	server: {
		port: 7001,
		host: '0.0.0.0',
		hellomsg: 'welcome to online casino => Custom by Habrod of company',
		server: 20141201,
		client_req: 20141130
	},
	typeGame : 'poker',
	Room_Id : 2,
	redis: {
		host: 'localhost',
		port: 6379,
		passwd: null
	},
	new_user : {
		coins: 10000,
		score: 0,
		exp: 0,
		level: 1
	},
	games: {
		'holdem2': {
			name: 'texas holdem',
			desc: 'texas holdem, rule: pot limit',
			game: 'holdem_game.js',
			options: {
				roomId : 2,
				max_seats: 6,
				no_joker: true,
				no_number: [],
				ready_countdown: 15,
				turn_countdown: 15,
				show_result : 10,
				show_leave_on_start: 10,
				limit_rule: 1,		// 0: limit, 1: pot limit, 2: no limit
				limit: 1000,		// big blind
				bettingMax : 10000, //default max 10,000,000
				limit_cap: -1,		// -1, means no limit
				takeBitamin : 20000,
			},
			min: 2,
			max: 6
		},
		// 'hwatu': {
		// 	name: 'texas holdem',
		// 	desc: 'texas holdem, rule: pot limit',
		// 	game: 'hwatu_game.js',
		// 	options: {
		// 		roomId : 7,
		// 		max_seats: 6,
		// 		no_joker: true,
		// 		no_number: [],
		// 		ready_countdown: 15,
		// 		turn_countdown: 15,
		// 		show_result : 10,
		// 		show_leave_on_start: 10,
		// 		limit_rule: 1,		// 0: limit, 1: pot limit, 2: no limit
		// 		limit: 1000,			// big blind
		// 		bettingMax : 10000,
		// 		limit_cap: -1,		// -1, means no limit
		// 	},
		// 	min: 2,
		// 	max: 6
		// },
	},
};
