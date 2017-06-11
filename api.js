module.exports = function(data, app) {
  app.get('/api/oceny/', (req, res) => {
    if (!loggedIn(req)) {
      res.redirect('/login/')
      return
    }
    data[req.cookies.username].client
      .oceny()
      .then(r => {
        res.json(r)
      })
      .catch(err => { handleAPIError(req, res, err) })
  })

  app.get('/api/plan/', (req, res) => {
    if (!loggedIn(req)) {
      res.redirect('/login/')
      return
    }
    data[req.cookies.username].client
      .plan(typeof req.query.date === 'string' ? new Date(parseInt(req.query.date)) : new Date())
      .then(r => {
        res.json(r)
      })
      .catch(err => { handleAPIError(req, res, err) })
  })

  app.get('/api/zadania/', (req, res) => {
    if (!loggedIn(req)) {
      res.redirect('/login/')
      return
    }
    data[req.cookies.username].client
      .praceDomowe(new Date())
      .then(r => {
        res.json(r)
      })
      .catch(err => { handleAPIError(req, res, err) })
  })

  app.get('/api/zadanie/:id/', (req, res) => {
    if (!loggedIn(req)) {
      res.redirect('/login/')
      return
    }
    if (!req.params.id){
      handleAPIError(req, res, 'Invalid homework ID')
      return
    }
    data[req.cookies.username].client
      .pracaDomowa(req.params.id)
      .then(r => {
        res.json(r)
      })
      .catch(err => { handleAPIError(req, res, err) })
  })

  app.get('/api/sprawdziany/', (req, res) => {
    if (!loggedIn(req)) {
      res.redirect('/login/')
      return
    }
    data[req.cookies.username].client
      .sprawdziany(typeof req.query.date === 'string' ? new Date(parseInt(req.query.date)) : new Date())
      .then(r => {
        res.json(r)
      })
      .catch(err => { handleAPIError(req, res, err) })
  })

  app.get('/api/wydarzenia/', (req, res) => {
    if (!loggedIn(req)) {
      res.redirect('/login/')
      return
    }
    data[req.cookies.username].client
      .wydarzenia()
      .then(r => {
        res.json(r)
      })
      .catch(err => { handleAPIError(req, res, err) })
  })

  app.get('/api/obecnosci/', (req, res) => {
    if (!loggedIn(req)) {
      res.redirect('/login/')
      return
    }
    data[req.cookies.username].client
      .obecnosci(typeof req.query.date === 'string' ? new Date(parseInt(req.query.date), 10) : new Date())
      .then(r => {
        res.json(r)
      })
      .catch(err => { handleAPIError(req, res, err) })
  })


  function handleAPIError (req, res, err) {
    if (err.toString().toLowerCase().includes('authentication failed.') || err.toString().toLowerCase().includes('unauthorized')) {
      var index = data[req.cookies.username].tokens.indexOf(req.cookies.token)
      delete data[req.cookies.username].tokens[index]
      res.clearCookie('token')
      res.clearCookie('username')
      res.json({error: 'Sesja wygasła. Zaloguj się ponownie'})
      return
    }
    res.json({error: err})
  }

  function loggedIn (req) {
    return (typeof req.cookies.token === 'string' && typeof req.cookies.username === 'string' && typeof data[req.cookies.username] === 'object' && data[req.cookies.username].tokens.includes(req.cookies.token) && typeof data[req.cookies.username].client === 'object')
  }
}