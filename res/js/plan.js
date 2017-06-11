var $input = $('#date').pickadate({
	selectMonths: true,
	selectYears: 15,
	today: 'Dzisiaj',
	clear: 'Wyczyść',
	close: 'Zamknij',
	monthsFull: [ 'styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec', 'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień' ],
	monthsShort: [ 'sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru' ],
	weekdaysFull: [ 'niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota' ],
	weekdaysShort: [ 'niedz.', 'pn.', 'wt.', 'śr.', 'cz.', 'pt.', 'sob.' ],
	firstDay: 1,
	format: 'd mmmm yyyy',
	formatSubmit: 'yyyy-mm-dd',
	onSet: event => {
		if (event.select) {
			plan(new Date(picker.get('select', 'yyyy-mm-dd')))
		}
	}
})
var picker = $input.pickadate('picker')

function plan(date){
	var lekcje = []
	request.get('/api/plan/').query({date: date.getTime()}).then(plan => {
		plan = plan.body
		console.log('plan', plan)
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
			if(typeof lekcje[lekcja.Godzina] !== 'object'){
				lekcje[lekcja.Godzina] = []
			}
			if(typeof lekcje[lekcja.Godzina][0] !== 'object'){
				lekcje[lekcja.Godzina][0] = plan.GodzinyLekcyjne[lekcja.Godzina].Poczatek + ' - ' + plan.GodzinyLekcyjne[lekcja.Godzina].Koniec
			}
			lekcje[lekcja.Godzina][lekcja.DzienTygodnia] = tmp.join('<br />')
		})
		var temp = ''
		lekcje.forEach(godzina => {
			temp += '<tr>'
			for(var i = 0; i < 6; i++){
				if(typeof godzina[i] === 'undefined'){
					temp += '<td></td>'
				} else {
					temp += '<td>' + godzina[i] + '</td>'
				}
			}
			temp += '</tr>'
		})
		document.querySelector('#table').innerHTML = temp
	}).catch(console.error)
}

plan(new Date())