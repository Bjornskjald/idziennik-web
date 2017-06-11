var d = {lekcje: 'Lekcje: <br />', sprawdziany: 'Sprawdziany: <br />', zadania: 'Zadania: <br />', wydarzenia: 'Wydarzenia: <br />'}
var j = {lekcje: 'Lekcje: <br />', sprawdziany: 'Sprawdziany: <br />', zadania: 'Zadania: <br />', wydarzenia: 'Wydarzenia: <br />'}

d.date = new Date()
d.dzien = d.date.getDay() === 0 ? 7 : d.date.getDay()
d.jsondate = new Date(d.date)
d.jsondate.setHours(d.date.getHours() - d.date.getTimezoneOffset() / 60)
d.jsondate = d.jsondate.toJSON().split('T')[0]

j.date = new Date()
j.date.setDate(d.date.getDate() + 1)
j.dzien = d.dzien === 7 ? 1 : d.dzien + 1
j.jsondate = new Date(j.date)
j.jsondate.setHours(j.date.getHours() - j.date.getTimezoneOffset() / 60)
j.jsondate = j.jsondate.toJSON().split('T')[0]

request.get('/api/plan/').then(plan => {
	plan.body.Przedmioty.forEach(l => {
		if (l.DzienTygodnia === d.dzien) {
			d.lekcje += l.TypZastepstwa === -1 ? `${l.Godzina}. ${l.Nazwa}<br />` : `<span style="text-decoration: line-through">${l.Godzina}. ${l.Nazwa}</span> <br />`
		}
		if (j.dzien !== 1 && l.DzienTygodnia === j.dzien) {
			j.lekcje += l.TypZastepstwa === -1 ? `${l.Godzina}. ${l.Nazwa}<br />` : `<span style="text-decoration: line-through">${l.Godzina}. ${l.Nazwa}</span> <br />`
		}
	})

	document.querySelector('#dzisiaj-lekcje').innerHTML = d.lekcje.length === 14 ? 'Brak lekcji' : d.lekcje

	if (d.dzien !== 7) {
		document.querySelector('#jutro-lekcje').innerHTML = j.lekcje.length === 14 ? 'Brak lekcji' : j.lekcje
		return false
	} else {
		// Trzeba powtórzyć żądanie żeby pobrać plan na następny dzień (poniedziałek)
		return request.get('/api/plan/').query({date: j.date.getTime()})
	}
}).then(plan => {
	if (plan) {
		plan.body.Przedmioty.forEach(l => {
			if (l.DzienTygodnia === j.dzien) {
				j.lekcje += l.TypZastepstwa === -1 ? `${l.Godzina}. ${l.Nazwa}<br />` : `<span style="text-decoration: line-through">${l.Godzina}. ${l.Nazwa}</span> <br />`
			}
		})
		document.querySelector('#jutro-lekcje').innerHTML = j.lekcje.length === 14 ? 'Brak lekcji' : j.lekcje
	}
	return request.get('/api/sprawdziany/')
}).then(sprawdziany => {
	sprawdziany.body.ListK.forEach(spr => {
		d.sprawdziany += spr.data === d.jsondate ? `${spr.rodzaj} - ${spr.rodzaj}: ${spr.zakres} <br />` : ''
		j.sprawdziany += spr.data === j.jsondate ? `${spr.rodzaj} - ${spr.rodzaj}: ${spr.zakres} <br />` : ''

	})
	
	document.querySelector('#dzisiaj-sprawdziany').innerHTML = d.sprawdziany.length === 19 ? 'Brak sprawdzianów' : d.sprawdziany
	
	if (j.date.getDate() !== 1) {
		document.querySelector('#jutro-sprawdziany').innerHTML = j.sprawdziany.length === 19 ? 'Brak sprawdzianów' : j.sprawdziany
		return false
	} else {
		return request.get('/api/sprawdziany/').query({date: j.date.getTime()})
	}
}).then(sprawdziany => {
	if (sprawdziany) {
		sprawdziany.body.ListK.forEach(spr => {
			j.sprawdziany += spr.data === j.jsondate.toJSON().split('T')[0] ? `${spr.rodzaj} - ${spr.rodzaj}: ${spr.zakres} <br />` : ''
		})
		document.querySelector('#jutro-sprawdziany').innerHTML = j.sprawdziany.length === 19 ? 'Brak sprawdzianów' : j.sprawdziany
	}
	return request.get('/api/zadania/')
}).then(zadania => {
	zadania.body.ListK.forEach(zadanie => {
		d.zadania += zadanie.dataO === d.jsondate ? `${zadanie.przed}: ${zadanie.tytul} <br />` : ''
		j.zadania += zadanie.dataO === j.jsondate ? `${zadanie.przed}: ${zadanie.tytul} <br />` : ''
	})

	document.querySelector('#dzisiaj-zadania').innerHTML = d.zadania.length === 15 ? 'Brak zadań domowych' : d.zadania
	document.querySelector('#jutro-zadania').innerHTML = j.zadania.length === 15 ? 'Brak zadań domowych' : j.zadania
	return request.get('/api/wydarzenia/')
}).then(wydarzenia => {
	wydarzenia.body.ListK.forEach(wydarzenie => {
		d.wydarzenia += wydarzenie.data === d.jsondate ? wydarzenie.info : ''
		j.wydarzenia += wydarzenie.data === j.jsondate ? wydarzenie.info : ''
	})
	document.querySelector('#dzisiaj-wydarzenia').innerHTML = d.wydarzenia.length === 18 ? 'Brak wydarzeń' : d.wydarzenia
	document.querySelector('#jutro-wydarzenia').innerHTML = j.wydarzenia.length === 18 ? 'Brak wydarzeń' : j.wydarzenia
}).catch(console.error)