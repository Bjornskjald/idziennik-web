function obecnosci (date) {
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
		formatSubmit: 'yyyy/mm/dd',
		onSet: event => {
			if (event.select) {
				obecnosci(new Date(picker.get('select', 'yyyy/mm/dd')))
			}
		}
	})
	var picker = $input.pickadate('picker')
	var date = typeof date === 'object' ? date : new Date()
	var temp = ''
	var miesiac = []
	var offset = new Date(date.getFullYear(), date.getMonth(), 1).getDay()
	if(offset === 0){
		offset = 7
	} else {
		offset--
	}
	for(var i = 0; i < offset; i++){
		miesiac.push({godziny: [], dzien: 0})
	}
	request.get('/api/obecnosci/').query({date: date.getTime()}).then(obecnosci => {
		console.log(obecnosci)
		obecnosci.body.Obecnosci.forEach(lekcja => {
			switch(lekcja.TypObecnosci){
				case 'T':
					var color = '#CCFFCC' // zielony
					break
				case 'N':
					var color = '#FFAD99' // czerwony
					break
				case 'F':
				case 'B':
					var color = '#E3E3E3' // szary
					break
				case 'S':
					var color = '#FFFFAA' // żółty
					break
				case 'U':
					var color = '#FFE099' // pomarańczowy
					break
				case 'Z':
					var color = '#A8BEFF' // niebieski
					break
				case 'ZO':
					var color = '#FF69B4' // fioletowy
					break
			}
			if(typeof miesiac[lekcja.Dzien - 1 + offset] !== 'object'){
				miesiac[lekcja.Dzien - 1 + offset] = {godziny: [], dzien: lekcja.Dzien}
			}
			miesiac[lekcja.Dzien - 1 + offset].godziny[lekcja.Godzina-1] = {
				opis: `${lekcja.Przedmiot}`,
				color: color
			}
		})
		for(var j = 0; j < miesiac.length; j += 7){
			temp += '<tr>'
			miesiac.slice(j, j+7).forEach(dzien => {
				if(dzien.dzien !== 0){
					temp += `<td style="vertical-align: top">${date.getFullYear()}-${date.getMonth()+1}-${dzien.dzien}<ul class="collection">`
					for(var k = 0; k < dzien.godziny.length; k++){
						var godzina = dzien.godziny[k]
						temp += typeof godzina === 'undefined' ? `<li class="collection-item">&nbsp;</li>` : `<li class="collection-item" style="background-color: ${godzina.color}; white-space: nowrap;">${godzina.opis}</li>`
					}
					temp += '</ul></td>'
				} else {
					temp += '<td></td>'
				}
			})
			temp += '</tr>'
		}
		document.querySelector('#table').innerHTML = temp
	}).catch(console.error)
}

obecnosci()