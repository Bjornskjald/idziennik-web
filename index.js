const 	app = require('express')(),
		cookieParser = require('cookie-parser'),
		bodyParser = require('body-parser'),
		path = require('path'),
		idziennik = require('idziennik'),
		Chance = require('chance'),
		chance = new Chance()

var data = {}

app.use(cookieParser())
app.use(bodyParser.urlencoded({ extended: true }))
app.set('view engine', 'pug')
app.listen(8080, () => {
	console.log('App is listening on port 8080.')
})

app.get('/', (req, res) => {
	if(loggedIn(req, res)){
		res.redirect('/dashboard/')
	} else {
		res.render('index')
	}
})

app.get('/login/', (req, res) => {
	if(loggedIn(req, res)){
		res.redirect('/dashboard/')
	} else {
		res.render('login', {status: 'Zaloguj się'})
	}
})

app.post('/login/', (req, res) => {
	if(loggedIn(req, res)){
		res.redirect('/dashboard/')
	} else {
		if(typeof req.body.username !== 'string' || typeof req.body.password !== 'string'){
			res.render('login', {status: 'Nieprawidłowe dane'})
			return
		}
		idziennik({username: req.body.username, password: req.body.password}).then(client => {
			// Logowanie się powiodło
			var token = chance.string({pool:'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', length: 16})
			if(typeof data[req.body.username] !== 'object'){
				data[req.body.username] = {}
			}
			if(typeof data[req.body.username].tokens !== 'object'){
				data[req.body.username].tokens = []
			}

			data[req.body.username].client = client
			data[req.body.username].tokens.push(token)

			res.cookie('username', req.body.username)
			res.cookie('token', token)
			res.redirect('/dashboard/')
		}).catch(error => {
			// Logowanie się nie powiodło
			res.render('login', {status: error})
		})
	}
})

app.get('/dashboard/', (req, res) => {
	if(loggedIn(req, res)){
		res.render('dashboard')
	} else {
		res.redirect('/')
	}
})

app.get('/logout/', (req, res) => {
	if(loggedIn(req, res)){
		var index = data[req.cookies.username].tokens.indexOf(req.cookies.token)
		delete data[req.cookies.username].tokens[index]
		res.clearCookie('token')
		res.clearCookie('username')
	}
	res.redirect('/')
})

app.get('*', (req, res) => {
	res.status(404).sendFile(path.join(__dirname, 'res', '404.html'))
})

function loggedIn(req, res){
	return (typeof req.cookies.token === 'string' && typeof req.cookies.username === 'string' && typeof data[req.cookies.username] === 'object' && data[req.cookies.username].tokens.includes(req.cookies.token))
}