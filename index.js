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
  var d = {lekcje: 'Lekcje: <br />', sprawdziany: 'Sprawdziany: <br />', zadania: 'Zadania: <br />', wydarzenia: 'Wydarzenia: <br />'}
  var j = {lekcje: 'Lekcje: <br />', sprawdziany: 'Sprawdziany: <br />', zadania: 'Zadania: <br />', wydarzenia: 'Wydarzenia: <br />'}
  d.date = new Date()
  j.date = new Date()
  j.date.setDate(d.date.getDate() + 1)
  data[req.cookies.username].client.plan(d.date).then(plan => {
    d.dzien = d.date.getDay() === 0 ? 7 : d.date.getDay()
    j.dzien = d.dzien === 7 ? 0 : d.dzien + 1
    plan.Przedmioty.forEach(lekcja => {
      if (lekcja.DzienTygodnia === d.dzien) {
        if (lekcja.TypZastepstwa === -1) {
          d.lekcje += `${lekcja.Godzina}. ${lekcja.Nazwa}<br />`
        } else {
          d.lekcje += `<span style="text-decoration: line-through">${lekcja.Godzina}. ${lekcja.Nazwa}</span> <br />`
        }
      }
      if (d.dzien !== 7 && lekcja.DzienTygodnia === j.dzien) {
        if (lekcja.TypZastepstwa === -1) {
          j.lekcje += `${lekcja.Godzina}. ${lekcja.Nazwa}<br />`
        } else {
          j.lekcje += `<span style="text-decoration: line-through">${lekcja.Godzina}. ${lekcja.Nazwa}</span> <br />`
        }
      }
    })
    if (d.lekcje.length === 14) {
      d.lekcje = 'Brak lekcji'
    }
    if (d.dzien !== 7) {
      if (j.lekcje.length === 14) {
        j.lekcje = 'Brak lekcji'
      }
      return false
    } else {
      // Trzeba powtórzyć żądanie żeby pobrać plan na następny dzień (poniedziałek)
      return data[req.cookies.username].client.plan(j.date)
    }
  }).then(plan => {
    if (plan) {
      plan.Przedmioty.forEach(lekcja => {
        if (lekcja.DzienTygodnia === j.dzien) {
          if (lekcja.TypZastepstwa === -1) {
            j.lekcje += `${lekcja.Godzina}. ${lekcja.Nazwa} <br />`
          } else {
            j.lekcje += `<span style="text-decoration: line-through">${lekcja.Godzina}. ${lekcja.Nazwa}</span> <br />`
          }
        }
      })
      if (j.lekcje.length === 14) {
        j.lekcje = 'Brak lekcji'
      }
    }
    return data[req.cookies.username].client.sprawdziany(d.date)
  }).then(sprawdziany => {
    d.jsondate = new Date(d.date)
    j.jsondate = new Date(j.date)
    d.jsondate.setHours(d.date.getHours() - d.date.getTimezoneOffset() / 60)
    j.jsondate.setHours(j.date.getHours() - j.date.getTimezoneOffset() / 60)
    sprawdziany.ListK.forEach(sprawdzian => {
      if (sprawdzian.data === d.jsondate.toJSON().split('T')[0]) {
        d.sprawdziany += `${sprawdzian.rodzaj} - ${sprawdzian.rodzaj}: ${sprawdzian.zakres} <br />`
      }
      if (sprawdzian.data === j.jsondate.toJSON().split('T')[0]) {
        j.sprawdziany += `${sprawdzian.rodzaj} - ${sprawdzian.rodzaj}: ${sprawdzian.zakres} <br />`
      }
    })
    if (d.sprawdziany.length === 19) {
      d.sprawdziany = 'Brak sprawdzianów'
    }
    if (d.dzien !== 7) {
      if (j.sprawdziany.length === 19) {
        j.sprawdziany = 'Brak sprawdzianów'
      }
      return false
    } else {
      return data[req.cookies.username].client.sprawdziany(j.date)
    }
  }).then(sprawdziany => {
    if (sprawdziany) {
      sprawdziany.ListK.forEach(sprawdzian => {
        if (sprawdzian.data === j.jsondate.toJSON().split('T')[0]) {
          j.sprawdziany += `${sprawdzian.rodzaj} - ${sprawdzian.rodzaj}: ${sprawdzian.zakres} <br />`
        }
      })
      if (j.sprawdziany.length === 19) {
        j.sprawdziany = 'Brak sprawdzianów'
      }
    }
    return data[req.cookies.username].client.praceDomowe(d.date)
  }).then(zadania => {
    zadania.ListK.forEach(zadanie => {
      if (zadanie.dataO === d.jsondate.toJSON().split('T')[0]) {
        d.zadania += `${zadanie.przed}: ${zadanie.tytul} <br />`
      }
      if (zadanie.dataO === j.jsondate.toJSON().split('T')[0]) {
        j.zadania += `${zadanie.przed}: ${zadanie.tytul} <br />`
      }
    })
    if (d.zadania.length === 15) {
      d.zadania = 'Brak zadań domowych'
    }
    if (j.zadania.length === 15) {
      j.zadania = 'Brak zadań domowych'
    }
    return data[req.cookies.username].client.wydarzenia()
  }).then(wydarzenia => {
    wydarzenia.ListK.forEach(wydarzenie => {
      if (wydarzenie.data === d.jsondate.toJSON().split('T')[0]) {
        d.wydarzenia += wydarzenie.info
      }
      if (wydarzenie.data === j.jsondate.toJSON().split('T')[0]) {
        j.wydarzenia += wydarzenie.info
      }
    })
    if (d.wydarzenia.arr.length === 18) {
      d.wydarzenia.str = 'Brak wydarzeń'
    }
    if (j.wydarzenia.arr.length === 18) {
      j.wydarzenia.str = 'Brak wydarzeń'
    }
    res.render('pulpit', {name: req.cookies.username, d: d, j: j})
  }).catch(err => handleError(req, res, err))
})

app.get('/oceny/', (req, res) => {
  if (!loggedIn(req)) {
    res.redirect('/login/')
    return
  }
  data[req.cookies.username].client.oceny().then(result => {
    var srednia = 0
    var sredniaCounter = 0
    var list = {}
    result.Przedmioty.forEach(przedmiot => {
      var tmp = []
      przedmiot.Oceny.forEach(ocena => {
        var desc = `Kategoria: ${ocena.Kategoria}<br />Waga: ${ocena.Waga}<br />Data: ${ocena.Data_wystaw}`
        if (ocena.Typ === 0) {
          if (typeof req.query.filtr === 'string' && req.query.filtr === '1') {
            if (Math.abs(new Date() - new Date(ocena.Data_wystaw.replace(/-/g, '/'))) < 2678400000) {
              tmp.push(`<a href="#!" class="ocena" style="color:#${ocena.Kolor}" onclick="Materialize.toast('${desc}', 5000)">${ocena.Ocena}</a>`)
            }
          } else if (typeof req.query.szukaj === 'string') {
            if (ocena.Kategoria.toLowerCase().includes(req.query.szukaj.toLowerCase()) || ocena.Ocena.toLowerCase().includes(req.query.szukaj.toLowerCase())) {
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
    res.render('oceny', {result: list, name: req.cookies.username, srednia: srednia})
  }).catch(err => handleError(req, res, err))
})

app.get('/plan/', (req, res) => {
  if (!loggedIn(req)) {
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
      switch (lekcja.TypZastepstwa) {
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
      lekcje[lekcja.DzienTygodnia - 1][lekcja.Godzina] = tmp.join('<br />')
    })
    res.render('plan', {name: req.cookies.username, lekcje: lekcje, godziny: plan.GodzinyLekcyjne})
  }).catch(err => handleError(req, res, err))
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
  var date = typeof req.query.date === 'string' ? new Date(req.query.date) : new Date()
  var miesiac = []
  var offset = new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  if (offset === 0) {
    offset = 7
  } else {
    offset--
  }
  for (let i = 0; i < offset; i++) {
    miesiac.push([])
  }
  data[req.cookies.username].client.obecnosci(date).then(obecnosci => {
    obecnosci.Obecnosci.forEach(lekcja => {
      var color
      switch (lekcja.TypObecnosci) {
        case 'T':
          color = '#CCFFCC' // zielony
          break
        case 'N':
          color = '#FFAD99' // czerwony
          break
        case 'F':
        case 'B':
          color = '#E3E3E3' // szary
          break
        case 'S':
          color = '#FFFFAA' // żółty
          break
        case 'U':
          color = '#FFE099' // pomarańczowy
          break
        case 'Z':
          color = '#A8BEFF' // niebieski
          break
        case 'ZO':
          color = '#FF69B4' // fioletowy
          break
        default:
          color = '#E3E3E3'
          break
      }
      if (typeof miesiac[lekcja.Dzien - 1 + offset] !== 'object') {
        miesiac[lekcja.Dzien - 1 + offset] = []
      }
      miesiac[lekcja.Dzien - 1 + offset][lekcja.Godzina - 1] = {
        opis: `${lekcja.Godzina}. ${lekcja.Przedmiot}`,
        color: color
      }
    })
    var tygodnie = []
    for (let i = 0; i < miesiac.length; i += 7) {
      tygodnie.push(miesiac.slice(i, i + 7))
    }
    res.render('obecnosci', {name: req.cookies.username, tygodnie: tygodnie})
  }).catch(err => handleError(req, res, err))
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

app.get('*', (req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'res', '404.html'))
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
