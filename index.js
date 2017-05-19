const 	app = require('express')(),
		cookieParser = require('cookie-parser'),
		bodyParser = require('body-parser'),
		idziennik = require('idziennik'),
		Chance = require('chance'),
		chance = new Chance()

var data = {};

app.use(cookieParser())
app.use(bodyParser.urlencoded({ extended: true }))
app.set('view engine', 'pug')

app.get('*', (req, res) => {
	res.status(404).sendFile('./res/404.html')
})