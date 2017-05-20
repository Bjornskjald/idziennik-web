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
		res.redirect('/pulpit/')
		return
	}
	res.render('index')
})

app.get('/login/', (req, res) => {
	if(loggedIn(req, res)){
		res.redirect('/pulpit/')
	}
	res.render('login', {status: 'Zaloguj się'})
})

app.post('/login/', (req, res) => {
	if(loggedIn(req, res)){
		res.redirect('/pulpit/')
		return
	}
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
		res.redirect('/pulpit/')
	}).catch(error => {
		// Logowanie się nie powiodło
		res.render('login', {status: error.toString()})
	})
})

app.get('/pulpit/', (req, res) => {
	if(!loggedIn(req, res)){
		res.redirect('/')
		return
	}
	res.render('pulpit', {name: req.cookies.username})
})

app.get('/oceny/', (req, res) => {
	if(!loggedIn(req, res)){
		res.redirect('/')
		return
	}
	data[req.cookies.username].client.oceny().then(result => {
		var Srednia = 0, SredniaCounter = 0
		var list = {}
		result.Przedmioty.forEach(przedmiot => {
			var tmp = []
			przedmiot.Oceny.forEach(ocena => {
				var desc = 'Kategoria: '+ocena.Kategoria+'<br />Waga: '+ocena.Waga+'<br />Data: '+ocena.Data_wystaw
				if(ocena.Typ === 0){
					if(typeof req.query.filtr === 'string' && req.query.filtr === '1'){
						if(Math.abs(new Date() - new Date(ocena.Data_wystaw.replace(/-/g, '/'))) < 2678400000){
							tmp.push('<a href="#!" class="ocena" style="color:#'+ocena.Kolor+'" onclick="Materialize.toast(\''+desc+'\', 5000)">'+ocena.Ocena+'</a>')
						}							
					} else if(typeof req.query.szukaj === 'string') {
						if(ocena.Kategoria.toLowerCase().includes(req.query.szukaj.toLowerCase()) || ocena.Ocena.toLowerCase().includes(req.query.szukaj.toLowerCase())){
							tmp.push('<a href="#!" class="ocena" style="color:#'+ocena.Kolor+'" onclick="Materialize.toast(\''+desc+'\', 5000)">'+ocena.Ocena+'</a>')
						}
					} else {
						tmp.push('<a href="#!" class="ocena" style="color:#'+ocena.Kolor+'" onclick="Materialize.toast(\''+desc+'\', 5000)">'+ocena.Ocena+'</a>')
					}
				}
			})
			list[przedmiot.Przedmiot] = {
				oceny: tmp.join(' '),
				srednia: przedmiot.SrednieCaloroczne,
				srednianum: markToInt(parseInt(przedmiot.SrednieCaloroczne, 10))}
			Srednia += markToInt(parseInt(przedmiot.SrednieCaloroczne, 10))
			SredniaCounter++
		})
		Srednia = Math.round(Srednia / SredniaCounter * 100) / 100
		res.render('oceny', { result: list, name: req.cookies.username, srednia: Srednia})
	}).catch(err => {
		if(err.toString().toLowerCase().includes('authentication')){
			var index = data[req.cookies.username].tokens.indexOf(req.cookies.token)
			delete data[req.cookies.username].tokens[index]
			res.clearCookie('token')
			res.clearCookie('username')
			res.render('error', {error: 'Błąd logowania. Zaloguj się ponownie'})
		}
		res.render('error', {error: err})
	})
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

function markToInt(ocena){
	if(ocena >= 95) return 6
	if(ocena >= 85) return 5
	if(ocena >= 70) return 4
	if(ocena >= 50) return 3
	if(ocena >= 35) return 2
	return 1
}