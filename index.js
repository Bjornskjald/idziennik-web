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
	if(loggedIn(req)){
		res.redirect('/pulpit/')
		return
	}
	res.render('index')
})

app.get('/login/', (req, res) => {
	if(loggedIn(req)){
		res.redirect('/pulpit/')
	}
	res.render('login', {status: 'Zaloguj się'})
})

app.post('/login/', (req, res) => {
	if(loggedIn(req)){
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
	if(!loggedIn(req)){
		res.redirect('/login/')
		return
	}
	var d = {lekcje: {arr: []}, sprawdziany: {arr: []}, zadania: {arr: []}, wydarzenia: {arr: []}}
	var j = {lekcje: {arr: []}, sprawdziany: {arr: []}, zadania: {arr: []}, wydarzenia: {arr: []}}
	data[req.cookies.username].client.plan(new Date()).then(plan => {
		d.dzien = new Date().getDay() === 0 ? 7 : new Date().getDay()
		j.dzien = d.dzien === 7 ? 0 : d.dzien + 1
		plan.Przedmioty.forEach(lekcja => {
			if(lekcja.DzienTygodnia === d.dzien){
				if(lekcja.TypZastepstwa !== -1){
					d.lekcje.arr.push(`<span style="text-decoration: line-through">${lekcja.Godzina}. ${lekcja.Nazwa}</span>`)
				} else {
					d.lekcje.arr.push(`${lekcja.Godzina}. ${lekcja.Nazwa}`)
				}
			}
			if(d.dzien !== 7 && lekcja.DzienTygodnia === j.dzien){
				if(lekcja.TypZastepstwa !== -1){
					j.lekcje.arr.push(`<span style="text-decoration: line-through">${lekcja.Godzina}. ${lekcja.Nazwa}</span>`)
				} else {
					j.lekcje.arr.push(`${lekcja.Godzina}. ${lekcja.Nazwa}`)
				}
			}
		})
		if(d.lekcje.arr.length === 0){
			d.lekcje.str = 'Brak lekcji'
		} else {
			d.lekcje.arr.push('')
			d.lekcje.str = d.lekcje.arr.join('<br />')
			d.lekcje.str = 'Lekcje: <br />' + d.lekcje.str
		}
		if(d.dzien === 7){
			// Trzeba powtórzyć żądanie żeby pobrać plan na następny dzień (poniedziałek)
			return data[req.cookies.username].client.plan(new Date(new Date().getTime()+86400000))
		} else {
			if(j.lekcje.arr.length === 0){
				j.lekcje.str = 'Brak lekcji'
			} else {
				j.lekcje.arr.push('')
				j.lekcje.str = j.lekcje.arr.join('<br />')
				j.lekcje.str = 'Lekcje: <br />' + j.lekcje.str
			}
			return
		}
	}).then(plan => {
		if(typeof j.lekcje.str !== 'string'){
			plan.Przedmioty.forEach(lekcja => {
				if(lekcja.DzienTygodnia === j.dzien){
					if(lekcja.TypZastepstwa !== -1){
						j.lekcje.arr.push(`<span style="text-decoration: line-through">${lekcja.Godzina}. ${lekcja.Nazwa}</span>`)
					} else {
						j.lekcje.arr.push(`${lekcja.Godzina}. ${lekcja.Nazwa}`)
					}
				}
			})
			if(j.lekcje.arr.length === 0){
				j.lekcje.str = 'Brak lekcji'
			} else {
				j.lekcje.arr.push('')
				j.lekcje.str = j.lekcje.arr.join('<br />')
				j.lekcje.str = 'Lekcje: <br />' + j.lekcje.str
			}
		}
		return data[req.cookies.username].client.sprawdziany(new Date())
	}).then(sprawdziany => {
		d.date = new Date()
		d.date.setHours(d.date.getHours() - d.date.getTimezoneOffset() / 60)
		j.date = new Date(new Date().getTime()+86400000)
		j.date.setHours(j.date.getHours() - j.date.getTimezoneOffset() / 60)
		sprawdziany.ListK.forEach(sprawdzian => {
			if(sprawdzian.data === d.date.toJSON().split('T')[0]){
				d.sprawdziany.arr.push(`${sprawdzian.rodzaj} - ${sprawdzian.rodzaj}: ${sprawdzian.zakres}`)
			}
			if(sprawdzian.data === j.date.toJSON().split('T')[0]){
				j.sprawdziany.arr.push(`${sprawdzian.rodzaj} - ${sprawdzian.rodzaj}: ${sprawdzian.zakres}`)
			}
		})
		if(d.sprawdziany.arr.length === 0){
			d.sprawdziany.str = 'Brak sprawdzianów'
		} else {
			d.sprawdziany.str = d.sprawdziany.arr.join('<br />')
			d.sprawdziany.str = 'Sprawdziany: <br />'+d.sprawdziany.str
		}
		if(j.date.getDate() === 1){
			return data[req.cookies.username].client.sprawdziany(j.date())
		} else {
			if(j.sprawdziany.arr.length === 0){
				j.sprawdziany.str = 'Brak sprawdzianów'
			} else {
				j.sprawdziany.str = j.sprawdziany.arr.join('<br />')
				j.sprawdziany.str = 'Sprawdziany: <br />'+j.sprawdziany.str
			}
			return
		}
	}).then(sprawdziany => {
		if(typeof d.sprawdziany.str !== 'string'){
			sprawdziany.ListK.forEach(sprawdzian => {
				if(sprawdzian.data === d.date.toJSON().split('T')[0]){
					d.sprawdziany.arr.push(`${sprawdzian.rodzaj} - ${sprawdzian.rodzaj}: ${sprawdzian.zakres}`)
				}
				if(sprawdzian.data === j.date.toJSON().split('T')[0]){
					j.sprawdziany.arr.push(`${sprawdzian.rodzaj} - ${sprawdzian.rodzaj}: ${sprawdzian.zakres}`)
				}
			})
			if(j.sprawdziany.arr.length === 0){
				j.sprawdziany.str = 'Brak sprawdzianów'
			} else {
				j.sprawdziany.str = j.sprawdziany.arr.join('<br />')
				j.sprawdziany.str = 'Sprawdziany: <br />'+j.sprawdziany.str
			}
		}
		return data[req.cookies.username].client.praceDomowe(new Date())
	}).then(zadania => {
		zadania.ListK.forEach(zadanie => {
			if(zadanie.dataO === d.date.toJSON().split('T')[0]){
				d.zadania.arr.push(`${zadanie.przed}: ${zadanie.tytul}`)
			}
			if(zadanie.dataO === j.date.toJSON().split('T')[0]){
				j.zadania.arr.push(`${zadanie.przed}: ${zadanie.tytul}`)
			}
			if(d.zadania.arr.length === 0){
				d.zadania.str = 'Brak zadań domowych'
			} else {
				d.zadania.str = d.zadania.arr.join('<br />')
				d.zadania.str = 'Zadania: <br />'+d.zadania.str
			}
			if(j.zadania.arr.length === 0){
				j.zadania.str = 'Brak zadań domowych'
			} else {
				j.zadania.str = j.zadania.arr.join('<br />')
				j.zadania.str = 'Zadania: <br />'+j.zadania.str
			}
		})
		return data[req.cookies.username].client.wydarzenia()
	}).then(wydarzenia => {
		wydarzenia.ListK.forEach(wydarzenie => {
			if(wydarzenie.data === d.date.toJSON().split('T')[0]){
				d.wydarzenia.arr.push(wydarzenie.info)
			}
			if(wydarzenie.data === j.date.toJSON().split('T')[0]){
				j.wydarzenia.arr.push(wydarzenie.info)
			}
			if(d.wydarzenia.arr.length === 0){
				d.wydarzenia.str = 'Brak wydarzeń'
			} else {
				d.wydarzenia.str = d.wydarzenia.arr.join('<br />')
				d.wydarzenia.str = 'Wydarzenia: <br />'+d.wydarzenia.str
			}
			if(j.wydarzenia.arr.length === 0){
				j.wydarzenia.str = 'Brak wydarzeń'
			} else {
				j.wydarzenia.str = j.wydarzenia.arr.join('<br />')
				j.wydarzenia.str = 'Wydarzenia: <br />'+j.wydarzenia.str
			}
		})
		res.render('pulpit', {name: req.cookies.username, d: d, j: j})
	}).catch(err => {
		if(err.toString().toLowerCase().includes('authentication failed.')){
			var index = data[req.cookies.username].tokens.indexOf(req.cookies.token)
			delete data[req.cookies.username].tokens[index]
			res.clearCookie('token')
			res.clearCookie('username')
			res.render('error', {error: 'Sesja wygasła. Zaloguj się ponownie'})
			return
		}
		res.render('error', {error: err})
	})
})

app.get('/oceny/', (req, res) => {
	if(!loggedIn(req)){
		res.redirect('/login/')
		return
	}
	data[req.cookies.username].client.oceny().then(result => {
		var srednia = 0, sredniaCounter = 0
		var list = {}
		result.Przedmioty.forEach(przedmiot => {
			var tmp = []
			przedmiot.Oceny.forEach(ocena => {
				var desc = `Kategoria: ${ocena.Kategoria}<br />Waga: ${ocena.Waga}<br />Data: ${ocena.Data_wystaw}`
				if(ocena.Typ === 0){
					if(typeof req.query.filtr === 'string' && req.query.filtr === '1'){
						if(Math.abs(new Date() - new Date(ocena.Data_wystaw.replace(/-/g, '/'))) < 2678400000){
							tmp.push(`<a href="#!" class="ocena" style="color:#${ocena.Kolor}" onclick="Materialize.toast('${desc}', 5000)">${ocena.Ocena}</a>`)
						}							
					} else if(typeof req.query.szukaj === 'string') {
						if(ocena.Kategoria.toLowerCase().includes(req.query.szukaj.toLowerCase()) || ocena.Ocena.toLowerCase().includes(req.query.szukaj.toLowerCase())){
							tmp.push(`<a href="#!" class="ocena" style="color:#${ocena.Kolor}" onclick="Materialize.toast('${desc}', 5000)">${ocena.Ocena}</a>`)
						}
					} else {
						tmp.push(`<a href="#!" class="ocena" style="color:#${ocena.Kolor}" onclick="Materialize.toast('${desc}', 5000)">${ocena.Ocena}</a>`)
					}
				}
			})
			list[przedmiot.Przedmiot] = {
				oceny: tmp.join(' '),
				srednia: przedmiot.SrednieCaloroczne,
				srednianum: markToInt(parseInt(przedmiot.SrednieCaloroczne, 10))}
			srednia += markToInt(parseInt(przedmiot.SrednieCaloroczne, 10))
			sredniaCounter++
		})
		srednia = Math.round(srednia / sredniaCounter * 100) / 100
		res.render('oceny', { result: list, name: req.cookies.username, srednia: srednia})
	}).catch(err => {
		if(err.toString().toLowerCase().includes('authentication failed.')){
			var index = data[req.cookies.username].tokens.indexOf(req.cookies.token)
			delete data[req.cookies.username].tokens[index]
			res.clearCookie('token')
			res.clearCookie('username')
			res.render('error', {error: 'Sesja wygasła. Zaloguj się ponownie'})
			return
		}
		res.render('error', {error: err})
	})
})

app.get('/plan/', (req, res) => {
	if(!loggedIn(req)){
		res.redirect('/login/')
		return
	}
	var lekcje = [[], [], [], [], []]
	var date = typeof req.query.date === 'string' ? new Date(req.query.date) : new Date()
	data[req.cookies.username].client.plan(date).then(plan => {
		var descBase = '<span style="color: #ff3300">'
		plan.Przedmioty.forEach(lekcja => {
			var tmp = []
			tmp.push(lekcja.Nazwa.length < 15 ? lekcja.Nazwa : lekcja.Skrot)
			switch(lekcja.TypZastepstwa){
				case 0:
					tmp.push(descBase + 'Odwołane</span>')
					break
				case 1:
					tmp.push(descBase + 'Zastępstwo')
					tmp.push(`(${lekcja.NauZastepujacy})</span>`)
					break
				case 2:
					tmp.push(descBase + 'Zastępstwo')
					tmp.push(`(${lekcja.NauZastepujacy} - ${lekcja.PrzedmiotZastepujacy})</span>`)
					break
				case 3:
					tmp.push(descBase + 'Zastępstwo - inne')
					tmp.push(`(${lekcja.NauZastepujacy})</span>`)
					break
				case 4:
					tmp.push(descBase + 'Łączona')
					tmp.push(`(${lekcja.NauZastepujacy})</span>`)
					break
				case 5:
					tmp.push(descBase + 'Łączona - inna')
					tmp.push(`(${lekcja.NauZastepujacy} - ${lekcja.PrzedmiotZastepujacy})</span>`)
					break
			}
			lekcje[lekcja.DzienTygodnia-1][lekcja.Godzina] = tmp.join('<br />')
		})
		res.render('plan', {name: req.cookies.username, lekcje: lekcje, godziny: plan.GodzinyLekcyjne})
	}).catch(err => {
		if(err.toString().toLowerCase().includes('authentication failed.')){
			var index = data[req.cookies.username].tokens.indexOf(req.cookies.token)
			delete data[req.cookies.username].tokens[index]
			res.clearCookie('token')
			res.clearCookie('username')
			res.render('error', {error: 'Sesja wygasła. Zaloguj się ponownie'})
			return
		}
		res.render('error', {error: err})
	})
})

app.get('/zadania/', (req, res) => {
	if(!loggedIn(req)){
		res.redirect('/login/')
		return
	}
	var date = new Date()
	var list = []
	data[req.cookies.username].client.praceDomowe(date).then(zadania => {
		zadania.ListK.forEach(zadanie => {
			list.push({
				dataZ: zadanie.dataZ,
				dataO: zadanie.dataO,
				temat: `<a href="/zadanie/?id=${zadanie._recordId}">${zadanie.tytul}</a>`,
				przedmiot: zadanie.przed
			})
		})
		res.render('zadania', {name: req.cookies.username, list: list})
	}).catch(err => {
		if(err.toString().toLowerCase().includes('authentication failed.')){
			var index = data[req.cookies.username].tokens.indexOf(req.cookies.token)
			delete data[req.cookies.username].tokens[index]
			res.clearCookie('token')
			res.clearCookie('username')
			res.render('error', {error: 'Sesja wygasła. Zaloguj się ponownie'})
			return
		}
		res.render('error', {error: err})
	})
})

app.get('/zadanie/', (req, res) => {
	if(!loggedIn(req) || )
	if(typeof req.query.id !== 'string'){
		console.log(typeof req.query.id)
		res.redirect('/pulpit/')
	} else {
		console.log('jest to string')
		res.redirect('/pulpit/')
	}
})

app.get('/logout/', (req, res) => {
	if(loggedIn(req)){
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

function loggedIn(req){
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