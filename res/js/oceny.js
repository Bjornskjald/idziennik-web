request.get('/api/oceny').then(oceny => {
	oceny = oceny.body
	console.log('oceny', oceny)
	window.oceny = oceny
	var temp = '', srednia = 0, sredniaCounter = 0
	oceny.Przedmioty.forEach(przedmiot => {
		temp += `
			<tr>
				<td>${przedmiot.Przedmiot}</td>
				<td>
		`
		przedmiot.Oceny.forEach(ocena => {
			if(ocena.Typ === 0){
				temp += `<a href="#!" style="color:#${ocena.Kolor}" onclick="Materialize.toast('`
				temp += `Ocena: ${ocena.Ocena}<br />Kategoria: ${ocena.Kategoria}<br />Waga: ${ocena.Waga}<br />Data: ${ocena.Data_wystaw}`
				temp += `', 5000)">${ocena.Ocena}&nbsp;</a>`
			}
		})
		temp += `
				</td>
				<td>${przedmiot.SrednieCaloroczne}</td>
				<td>${markToInt(parseInt(przedmiot.SrednieCaloroczne, 10))}</td>
			</tr>
		`
		srednia += markToInt(parseInt(przedmiot.SrednieCaloroczne, 10))
		sredniaCounter++
	})
	srednia = Math.round(srednia / sredniaCounter * 100) / 100
	window.ocenyRendered = temp
	document.querySelector('#table').innerHTML = temp
	document.querySelector('#srednia').innerHTML += srednia
}).catch(alert)

function filter(filter){
	var temp = ''
	var query = filter === 'szukaj' ? document.querySelector('#szukaj').value : undefined
	console.log(query)
	oceny.Przedmioty.forEach(przedmiot => {
		temp += `
			<tr>
				<td>${przedmiot.Przedmiot}</td>
				<td>
		`
		var tmp = []
		przedmiot.Oceny.forEach(ocena => {
			if(ocena.Typ === 0){
				switch(filter){
					case 'ostatniMiesiac': 
						if(Math.abs(new Date() - new Date(ocena.Data_wystaw.replace(/-/g, '/'))) < 2678400000){
							temp += `<a href="#!" style="color:#${ocena.Kolor}" onclick="Materialize.toast('`
							temp += `Ocena: ${ocena.Ocena}<br />Kategoria: ${ocena.Kategoria}<br />Waga: ${ocena.Waga}<br />Data: ${ocena.Data_wystaw}`
							temp += `', 5000)">${ocena.Ocena}&nbsp;</a>`
						}
						break
					case 'szukaj':
						if(ocena.Kategoria.toLowerCase().includes(query.toLowerCase()) || ocena.Ocena.toLowerCase().includes(query.toLowerCase())){
							console.log(ocena.Kategoria, ocena.Ocena, query)
							temp += `<a href="#!" style="color:#${ocena.Kolor}" onclick="Materialize.toast('`
							temp += `Ocena: ${ocena.Ocena}<br />Kategoria: ${ocena.Kategoria}<br />Waga: ${ocena.Waga}<br />Data: ${ocena.Data_wystaw}`
							temp += `', 5000)">${ocena.Ocena}&nbsp;</a>`
						}
						break

				}
			}
		})
		temp += `
				</td>
				<td>${przedmiot.SrednieCaloroczne}</td>
				<td>${markToInt(parseInt(przedmiot.SrednieCaloroczne, 10))}</td>
			</tr>
		`
	})
	document.querySelector('#table').innerHTML = temp
}

function wszystkie(){
	document.querySelector('#table').innerHTML = ocenyRendered
}

function markToInt(ocena){
	if(ocena >= 95) return 6
	if(ocena >= 85) return 5
	if(ocena >= 70) return 4
	if(ocena >= 50) return 3
	if(ocena >= 35) return 2
	return 1
}