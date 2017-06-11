const app = require('express')()
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const path = require('path')
const idziennik = require('idziennik')
const Chance = require('chance')
const chance = new Chance()
var data = {}

app.use(cookieParser())
app.use(bodyParser.urlencoded({ extended: true }))
app.set('view engine', 'pug')
app.listen(8080, () => {
  console.log('App is listening on port 8080.')
})

require('./api.js')(data, app)

app.get('/', (req, res) => {
  if (loggedIn(req)) {
    res.redirect('/pulpit/')
    return
  }
  res.render('index')
})

app.get('/login/', (req, res) => {
  if (loggedIn(req)) {
    res.redirect('/pulpit/')
  }
  res.render('login', {status: 'Zaloguj się'})
})

app.post('/login/', (req, res) => {
  if (loggedIn(req)) {
    res.redirect('/pulpit/')
    return
  }
  if (typeof req.body.username !== 'string' || typeof req.body.password !== 'string') {
    res.render('login', {status: 'Nieprawidłowe dane'})
    return
  }
  idziennik({username: req.body.username, password: req.body.password}).then(client => {
    // Logowanie się powiodło
    var token = chance.string({pool: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', length: 16})
    if (typeof data[req.body.username] !== 'object') {
      data[req.body.username] = {}
    }
    if (typeof data[req.body.username].tokens !== 'object') {
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
  if (!loggedIn(req)) {
    res.redirect('/login/')
    return
  }
  res.render('pulpit', {name: req.cookies.username})
})

app.get('/oceny/', (req, res) => {
  if (!loggedIn(req)) {
    res.redirect('/login/')
    return
  }
  res.render('oceny', {name: req.cookies.username})
})

app.get('/plan/', (req, res) => {
  if (!loggedIn(req)) {
    res.redirect('/login/')
    return
  }
  res.render('plan', {name: req.cookies.username})
})

app.get('/zadania/', (req, res) => {
  if (!loggedIn(req)) {
    res.redirect('/login/')
    return
  }
  var date = typeof req.query.date === 'string' ? new Date(req.query.date) : new Date()
  data[req.cookies.username].client.praceDomowe(date).then(zadania => {
    res.render('zadania', {name: req.cookies.username, zadania: zadania.ListK})
  }).catch(err => handleError(req, res, err))
})

app.get('/zadanie/', (req, res) => {
  if (!loggedIn(req)) {
    res.redirect('/login/')
    return
  }
  if (typeof req.query.id !== 'string') {
    res.redirect('/zadania/')
  }
  data[req.cookies.username].client.pracaDomowa(req.query.id).then(zadanie => {
    zadanie = zadanie.praca
    var tmp = []
    tmp.push(`Tytuł: ${zadanie.tytul}`)
    tmp.push(`Przedmiot: ${zadanie.przedNazwa}`)
    tmp.push(`Data zadania: ${zadanie.dataZ}`)
    tmp.push(`Data oddania: ${zadanie.dataO}`)
    tmp.push(`Treść: ${zadanie.tresc.replace('\n', '<br />')}`)
    res.render('zadanie', {name: req.cookies.username, zadanie: tmp.join('<br />')})
  }).catch(err => handleError(req, res, err))
})

app.get('/obecnosci/', (req, res) => {
  if (!loggedIn(req)) {
    res.redirect('/login/')
    return
  }
  res.render('obecnosci', {name: req.cookies.username})
})

app.get('/uwagi/', (req, res) => {
  if (!loggedIn(req)) {
    res.redirect('/login/')
    return
  }
  if (typeof req.query.filtr === 'string') {
    var filtr = req.query.filtr
  }
  data[req.cookies.username].client.uwagi().then(uwagi => {
    var counter = uwagi.Poczatkowa
    uwagi.SUwaga.forEach(uwaga => {
      counter += parseInt(uwaga.Punkty, 10)
      switch (uwaga.Typ) {
        case 'o':
          uwaga.color = 'rgb(255, 255, 214)'
          break
        case 'n':
          uwaga.color = 'rgb(255, 214, 214)'
          break
        case 'p':
          uwaga.color = 'rgb(214, 255, 214)'
          break
      }
    })
    res.render('uwagi', {name: req.cookies.username, uwagi: uwagi.SUwaga, punkty: counter, filtr: filtr})
  }).catch(err => handleError(req, res, err))
})

app.get('/sprawdziany/', (req, res) => {
  if (!loggedIn(req)) {
    res.redirect('/login/')
    return
  }
  var date = typeof req.query.date === 'string' ? new Date(req.query.date) : new Date()
  data[req.cookies.username].client.sprawdziany(date).then(sprawdziany => {
    res.render('sprawdziany', {name: req.cookies.username, sprawdziany: sprawdziany.ListK})
  }).catch(err => handleError(req, res, err))
})

app.get('/komunikator/', (req, res) => {
  res.redirect('/komunikator/odebrane/')
})

app.get('/komunikator/odebrane/', (req, res) => {
  if (!loggedIn(req)) {
    res.redirect('/login/')
    return
  }
  data[req.cookies.username].client.odebrane().then(odebrane => {
    res.render('odebrane', {name: req.cookies.username, lista: odebrane.ListK})
  }).catch(err => handleError(req, res, err))
})

app.get('/komunikator/wyslane/', (req, res) => {
  if (!loggedIn(req)) {
    res.redirect('/login/')
    return
  }
  data[req.cookies.username].client.wyslane().then(wyslane => {
    res.render('wyslane', {name: req.cookies.username, lista: wyslane.ListK})
  }).catch(err => handleError(req, res, err))
})

app.get('/komunikator/wiadomosc/', (req, res) => {
  if (!loggedIn(req)) {
    res.redirect('/login/')
    return
  }
  if (typeof req.query.id !== 'string') {
    res.redirect('/komunikator/odebrane/')
    return
  }
  data[req.cookies.username].client.wiadomosc(req.query.id).then(wiadomosc => {
    var tmp = []
    wiadomosc.Wiadomosc.ListaOdbiorcow.forEach(odbiorca => {
      tmp.push(odbiorca.NazwaOdbiorcy)
    })
    wiadomosc.Wiadomosc.ListaOdbiorcow = tmp.join(', ')
    res.render('wiadomosc', {name: req.cookies.username, wiadomosc: wiadomosc.Wiadomosc})
  })
})

app.get('/logout/', (req, res) => {
  if (loggedIn(req)) {
    var index = data[req.cookies.username].tokens.indexOf(req.cookies.token)
    delete data[req.cookies.username].tokens[index]
    res.clearCookie('token')
    res.clearCookie('username')
  }
  res.redirect('/')
})

function loggedIn (req) {
  return (typeof req.cookies.token === 'string' && typeof req.cookies.username === 'string' && typeof data[req.cookies.username] === 'object' && data[req.cookies.username].tokens.includes(req.cookies.token) && typeof data[req.cookies.username].client === 'object')
}

function markToInt (ocena) {
  if (ocena >= 95) return 6
  if (ocena >= 85) return 5
  if (ocena >= 70) return 4
  if (ocena >= 50) return 3
  if (ocena >= 35) return 2
  return 1
}

function handleError (req, res, err) {
  if (err.toString().toLowerCase().includes('authentication failed.') || err.toString().toLowerCase().includes('unauthorized')) {
    var index = data[req.cookies.username].tokens.indexOf(req.cookies.token)
    delete data[req.cookies.username].tokens[index]
    res.clearCookie('token')
    res.clearCookie('username')
    res.render('error', {error: 'Sesja wygasła. Zaloguj się ponownie'})
    return
  }
  res.render('error', {error: err})
}

app.get('/js/:filename', (req, res) => { // TODO: fix
  res.sendFile(path.join(__dirname, 'res', 'js', req.params.filename))
})

app.get('*', (req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'res', '404.html'))
})