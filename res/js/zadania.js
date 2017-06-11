request.get('/api/zadania/').then(zadania => {
	zadania = zadania.body
	console.log('zadania', zadania)
	window.zadania = zadania
	var temp = ''
	zadania.ListK.forEach(zadanie => {
		if(new Date(zadanie.dataO) > new Date()){
			temp += `
				<tr>
					<td>${zadanie.przed}</td>
					<td>${zadanie.dataZ}</td>
					<td>${zadanie.dataO}</td>
					<td>
						<a href="javascript:zadanie(${zadanie._recordId})">${zadanie.tytul}</a>
					</td>
				</tr>
			`
		}
	})
	if(temp.length === 0){
		temp += `
			<tr>
				<td colspan="4" style="text-align: center">Brak zadań domowych</td>
			</tr>
		`
	}
	window.zadaniaRendered = temp
	document.querySelector('#table').innerHTML = temp
}).catch(console.error)

function zadania_wszystkie(){
	var temp = ''
	zadania.ListK.forEach(zadanie => {
		temp += `
			<tr>
				<td>${zadanie.przed}</td>
				<td>${zadanie.dataZ}</td>
				<td>${zadanie.dataO}</td>
				<td>
					<a href="javascript:zadanie(${zadanie._recordId})">${zadanie.tytul}</a>
				</td>
			</tr>
		`
	})
	if(temp.length === 0){
		temp += `
			<tr>
				<td colspan="4" style="text-align: center">Brak zadań domowych</td>
			</tr>
		`
	}
	document.querySelector('#table').innerHTML = temp
}

function zadania_nadchodzace(){
	document.querySelector('#table').innerHTML = zadaniaRendered
}

function zadanie(recordID){
	request.get(`/api/zadanie/${recordID}/`).then(zadanie => {
		zadanie = zadanie.body.praca
		console.log('zadanie', zadanie)
		document.querySelector('#zadanie').innerHTML = `
			<h4>${zadanie.tytul}</h4><br />
			Przedmiot: ${zadanie.przedNazwa}<br />
			Data zadania: ${zadanie.dataZ}<br />
			Treść: ${zadanie.tresc.replace('\n', '<br />')}
		`
		$('#zadanie-modal').modal()
		$('#zadanie-modal').modal('open')
	}).catch(console.error)
}