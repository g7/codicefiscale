enyo.kind({
	name: "CodiceFiscale.Main",
	kind: enyo.VFlexBox,
	published: {
		lastGot: null,
		currentRecord: null,
		currentCodice: null,
		launchParams: null
	},
	components: [
		{kind: "AppMenu", components: [
			{kind: "EditMenu"},
			{caption: $L("About"), onclick: "openAboutPopup"},
		]},
		{kind: "Popup", name: "AboutPopup", components: [
			{content: $L("Italian Fiscal Codes by Eugenio Paolantonio.") + "<br /><br />"},
			{content: "<a href='http://medesimo.eu'>medesimo.eu</a> - <a href='mailto:me@medesimo.eu'>me@medesimo.eu</a>"},
		]},
		{kind: enyo.ApplicationEvents, onBack: "goBack"},
		{kind: "DbService", name: "dbService", dbKind: "eu.medesimo.codicefiscale:1", onFailure: "dbNonExistent", components: [
			{name: "dbCreate", method: "putKind", onSuccess: "createDBsuccess"},
			{name: "dbGet", method: "get"},
			{name: "dbFind", method: "find", onResponse: "listQueryResponse"},
			{name: "dbDel", method: "del", onSuccess: "deletedResponse"},
			{name: "dbPut", method: "put", onSuccess: "addedResponse"},
			{name: "dbMerge", method: "merge"}
		]},
		{kind: "SlidingPane", flex: 1, multiViewMinWidth: 480,onSelect: "paneSelected", name: "mainSliding",
			components: [
				{name: "CodiceListPane", "width": "30%", kind: "CodiceFiscale.List", onListTap: "showCodice", onDeleteCodice: "deleteCodiceItem", onNewCodiceTap: "addNewCodice"},
				{name: "CodiceShowPane", kind: "CodiceFiscale.Show", onSaveData: "doSave", onGenerateCodice: "generateCodice", onClipboardCopy: "clipboardCopy"}
		]},
		{
			name: "putDBPermissions", 
			kind: enyo.PalmService,
		    service: "palm://com.palm.db/",
		    method: "putPermissions",
		    onSuccess: "permissionSuccess",
		    onFailure: "permissionFailure",
		}
	],

	/* General events and overrides */
	goBack: function(inSender, inEvent) {
		this.$.mainSliding.back(inEvent);
		inEvent.stopPropagation();
	},

	ready: function() {
		if (screen.width <= 640) {
			// block orientation on phones
			enyo.setAllowedOrientation("up");
		}

		// hide things
		this.$.CodiceShowPane.$.row_result.hide();
		this.$.CodiceShowPane.$.row_data.hide();
	
		// build statePicker
		this.buildStatePicker();
		

	},

	create: function() {
		this.inherited(arguments);
	},
	/* End general events and overrides */




	/* Just Type */
	//This will be called if setLaunchParams is called from index.html.  It's called automatically since launchParams is a published property on our kind.
	launchParamsChanged: function(){
		//if we received a launch parameter then we either make a query based on it or create a new player
		if (this.launchParams){
			if (this.launchParams.newCodice){
				// assume name is first and surname is last
				text_split = this.launchParams.newCodice.split(" ");
				if (text_split != [""]) {
					var name = this.capitalize(text_split[0]);
					var surname = this.capitalize(text_split[text_split.length-1]);
					if (name == surname) {
						// same. remove surname
						var surname = "";
					}
				}
				else {
					var name = ""
					var surname = ""
				}
					
				this.addNewCodice("", "", name, surname);
			}
			else if (this.launchParams.showCodice) {
				this.$.dbGet.call({ids:[this.launchParams.showCodice]}, {onSuccess: "showCodiceQuerySuccess"});
			}
		}
	},
	/* End Just Type */




	/* Database-related functions (permissions, installers, events) */
	permissionSuccess: function(){
		console.log("DB permission granted successfully!");
	},
	
	permissionFailure: function(){
		console.log("DB failed to grant permissions!");
	},
		
	listQueryResponse: function(inSender, inResponse, inRequest) {
		this.$.CodiceListPane.$.codiciList.queryResponse(inResponse, inRequest);
	},

	dbNonExistent: function() {
		// some check?
		// install db
		this.createDB();
	},
	
	createDB: function() {
		// Create database kind
		console.log("Creating db kind...");
		var indexes = [{"name":"codiciObjects", props:[{"name": "jtype", "tokenize":"all", "collate":"primary"}, {"name": "name"}, {"name": "surname"}, {"name": "date"}, {"name": "sex"}, {"name": "place"}, {"name": "is_foreign"}, {"name": "codice"}]}];
		this.$.dbCreate.call({owner: enyo.fetchAppId(), indexes:indexes, sync:true});
	
	},
	
	createDBsuccess: function(inSender, inResponse) {
		//attempt to give db permissions to the launcher so user's can perform queries on our data with the Just Type feature
		//We do this after the db has been installed since otherwise we'd have nothing to grant permissions for.
		var permObj = [{"type":"db.kind","object":'eu.medesimo.codicefiscale:1',"caller":"com.palm.launcher","operations":{"read":"allow"}}];
		this.$.putDBPermissions.call({"permissions":permObj});
	},

	dbFail: function(inSender, inResponse) {
		console.log("dbService failure: " + enyo.json.stringify(inResponse));
	},

	showCodiceQuerySuccess: function(inSender, inResponse, inRequest) {
		this.showCodice(null, null, null, inResponse.results[0]);
	},

	deletedResponse: function(inSender, inResponse, inRequest) {
		this.$.CodiceListPane.$.codiciList.punt();
	},

	addedResponse: function(inSender, inResponse, inRequest) {
		//var items = this.$.CodiceListPane.totalItems;
		//this.$.CodiceListPane.setTotalItems(0); //clear it
		//console.log(items);
		
		this.$.CodiceListPane.$.codiciList.punt();	
		
		// show the newly added item
		this.$.dbGet.call({ids:[inResponse.results[0]["id"]]}, {onSuccess: "showCodiceFromResponse"});
		
		// scroll the list to bottom
		//this.$.CodiceListPane.$.codiciList.$.scroller.$.scroll.setScrollPosition(this.$.CodiceListPane.$.codiciList.$.scroller.bottom);
		/*for (var i=0; idx > this.$.CodiceListPane.$.codiciList.$.scroller.bottom && i<10;i++) {
			this.$.CodiceListPane.$.codiciList.$.scroller.$.scroll.setScrollPosition(this.$.CodiceListPane.$.codiciList.$.scroller.$.scroll.y + this.$.CodiceListPane.$.codiciList.$.scroller.contentHeight);
			sthis.$.CodiceListPane.$.codiciList.$.scroller.scroll();
		} */
		//this.$.CodiceListPane.scrollTo(this.$.CodiceListPane.recordList.length-1);
		//this.$.CodiceListPane.scrollTo(this.recordNumbers-1);
	},
	
	showCodiceFromResponse: function(inSender, inResponse, inRequest) {
		// shows codice after addedResponse got the object of the newly added item
		this.showCodice(null, null, null, inResponse.results[0]);
	},
	/* End database-related functions */
	
	
	
	
	/* String-related functions */
	capitalize: function(string) {
		// capitalizes a string. (taken from http://stackoverflow.com/questions/2332811/capitalize-words-in-string/7592235#7592235)
		return string.replace(/(?:^|\s)\S/g, function(a) { return a.toUpperCase(); });
	},
	
	parseString: function(string) {
		// Returns a base string with only letters (and no accents).
		
		if (!string) {
			return "";
		}
		
		string = enyo.g11n.Char.getBaseString(string);
		lettere_split = string.split("");
		new_string = new Array();
		
		for (lettera in lettere_split) {
			if (["a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","x","y","w","z"," ","'"].indexOf(lettere_split[lettera].toLowerCase()) >= 0) {
				new_string.push(lettere_split[lettera]);
			}
		}
		
		return new_string.join("");
	},
	/* End string-related functions */




	/* UI (User Interface): Popups, helper functions, etc. */
	openAboutPopup: function(inSender, inEvent) {
		this.$.AboutPopup.openAtCenter();
	},

	buildStatePicker: function() {
		var processed = []
		for (estero in esteri) {
			processed.push(estero)
		}
		
		this.$.CodiceShowPane.$.statePicker.setItems(processed);
		this.$.CodiceShowPane.$.statePicker.setValue("ITALIA"); // set default
	},

	showCodice: function(inSender, inEvent, inIndex, fetched) {
		if (!fetched) {
			// we should fetch it ourselves
			this.setCurrentRecord(this.$.CodiceListPane.$.codiciList.fetch(inIndex));
		}
		else {
			// fetched (calling from just type or showCodiceFromResponse)
			this.setCurrentRecord(fetched);
		}
		
		this.setCurrentCodice("");
		
		if (this.currentRecord) {
			//fix date
			if (this.currentRecord.date != "") {
				date = new Date(this.currentRecord.date);
			}
			else {
				date = new Date();
			}
			
			this.$.CodiceShowPane.$.row_result.show();
			this.$.CodiceShowPane.$.row_data.show();
 

			this.$.mainSliding.selectView(this.$.CodiceShowPane);
			this.$.CodiceShowPane.$.selectedItemName.setContent(this.currentRecord.name + " " + this.currentRecord.surname);
			
			if (this.currentRecord.codice != "") {
				this.setCurrentCodice(this.currentRecord.codice);
				this.$.CodiceShowPane.$.CodiceResult.setValue(this.currentRecord.codice);
				this.$.CodiceShowPane.$.CodiceCopyToClipboard.setDisabled(false);
			}
			
			this.$.CodiceShowPane.$.CodiceName.setValue(this.currentRecord.name);
			this.$.CodiceShowPane.$.CodiceSurname.setValue(this.currentRecord.surname);
			
			this.$.CodiceShowPane.$.CodiceSex.setValue(this.currentRecord.sex);
			
			this.$.CodiceShowPane.$.CodiceDate.setValue(date);
			
			// set state
			if (this.currentRecord.is_foreign) {
				// foreign state, set place on the statePicker.
				this.$.CodiceShowPane.$.statePicker.setValue(this.currentRecord.place);
			}
			else {
				// italy, set statePicker to ITALIA and text area to place.
				this.$.CodiceShowPane.$.statePicker.setValue("ITALIA");
				this.$.CodiceShowPane.$.CodicePlace.setValue(this.currentRecord.place);
			}
			// properly set state
			this.$.CodiceShowPane.setForeign(this.$.CodiceShowPane.$.statePicker, null);
		}
	},

	clipboardCopy: function(inSender) {
		if (this.currentCodice != "") {
			enyo.dom.setClipboard(this.currentCodice);
			PalmSystem.copiedToClipboard(); 
		}
	},
	/* End UI */




	/* Data changes in database (put, merge, delete) */
	deleteCodiceItem: function(inSender, inIndex) {
		item = this.$.CodiceListPane.$.codiciList.fetch(inIndex);
		
		if (item) {
			if (this.currentRecord && (this.currentRecord._id == item._id)) {
				//we dropped the current item, hide rows
				this.$.CodiceShowPane.$.row_result.hide();
				this.$.CodiceShowPane.$.row_data.hide();
				//blank header on show
				this.$.CodiceShowPane.$.selectedItemName.setContent("");
			}
			
			this.$.dbDel.call({ids: [item._id]});
		}
	},
	

	addNewCodice: function(inSender, inSomething, name, surname) {
		if (!(name)) { var name = "" };
		if (!(surname)) { var surname = ""};
				
		var newCodice = {
			_kind: "eu.medesimo.codicefiscale:1",
			jtype: name + " " + surname,
			name: name,
			surname: surname,
			date: "",
			sex: "",
			place: "",
			is_foreign: false,
			codice: ""
		};
		
		this.$.dbPut.call({objects: [newCodice]});
		
	},

	doSave: function(inSender, inIndex) {
		if (this.currentRecord) {
			name = this.parseString(this.$.CodiceShowPane.$.CodiceName.getValue());
			surname = this.parseString(this.$.CodiceShowPane.$.CodiceSurname.getValue());
			
			//reset name and surname which have just been parsed
			this.$.CodiceShowPane.$.CodiceName.setValue(name);
			this.$.CodiceShowPane.$.CodiceSurname.setValue(surname);
			
			sex = this.$.CodiceShowPane.$.CodiceSex.getValue();

			date = this.$.CodiceShowPane.$.CodiceDate.getValue();
			
			// handle is_foreign
			if (this.$.CodiceShowPane.$.statePicker.getValue() == "ITALIA") {
				is_foreign = false;
			}
			else {
				is_foreign = true;
			}
			// handle place
			if (is_foreign == true) {
				// foreign, set place to the statePicker value.
				place = this.$.CodiceShowPane.$.statePicker.getValue();
			}
			else {
				place = this.parseString(this.$.CodiceShowPane.$.CodicePlace.getValue().toUpperCase());
				//reset place which has just been parsed
				this.$.CodiceShowPane.$.CodicePlace.setValue(place);
			}
						
			// generate code (or try to)
			codice = this.generateCodice(name, surname, sex, date, is_foreign, place);
			
			// refresh selecteditemname
			this.$.CodiceShowPane.$.selectedItemName.setContent(name + " " + surname);
		
			// refresh currentCodice
			this.setCurrentCodice(codice);
		
			// update database
			this.$.dbMerge.call({objects: [{
				_id: this.currentRecord._id,
				jtype: name + " " + surname,
				name: name,
				surname: surname,
				sex: sex,
				date: date,
				is_foreign: is_foreign,
				place: place,
				codice: codice,
			}]});
		
			}

			this.$.CodiceListPane.$.codiciList.punt();
	},
	/* End data changes-relevant functions */




	/* The star: the function who actually calculates the fiscal code. Treat it well. */
	generateCodice: function(name, surname, sex, date, is_foreign, place) {
		// TODO: Convertire tutti i commenti in italiano in inglese :)
		var mesi = {"01":"A", "02":"B", "03":"C", "04":"D", "05":"E", "06":"H", "07":"L", "08":"M", "09":"P", "10":"R", "11":"S", "12":"T"};
		var dispari_control = {"0":"1", "1":"0", "2":"5", "3":"7", "4":"9", "5":"13", "6":"15", "7":"17", "8":"19", "9":"21", "A":"1", "B":"0", "C":"5", "D":"7", "E":"9", "F":"13", "G":"15", "H":"17", "I":"19", "J":"21", "K":"2", "L":"4", "M":"18", "N":"20", "O":"11", "P":"3", "Q":"6", "R":"8", "S":"12", "T":"14", "U":"16", "V":"10", "W":"22", "X":"25", "Y":"24", "Z":"23"};
		var pari_control    = {"0":"0", "1":"1", "2":"2", "3":"3", "4":"4", "5":"5", "6":"6", "7":"7", "8":"8", "9":"9", "A":"0", "B":"1", "C":"2", "D":"3", "E":"4", "F":"5", "G":"6", "H":"7", "I":"8", "J":"9", "K":"10", "L":"11", "M":"12", "N":"13", "O":"14", "P":"15", "Q":"16", "R":"17", "S":"18", "T":"19", "U":"20", "V":"21", "W":"22", "X":"23", "Y":"24", "Z":"25"};
		var tutto_control = {"0":"A", "1":"B", "2":"C", "3":"D", "4":"E", "5":"F", "6":"G", "7":"H", "8":"I", "9":"J", "10":"K", "11":"L", "12":"M", "13":"N", "14":"O", "15":"P", "16":"Q", "17":"R", "18":"S", "19":"T", "20":"U", "21":"V", "22":"W", "23":"X", "24":"Y", "25":"Z"};
		
		if (this.currentRecord) {
			var name = name.toUpperCase();
			var surname = surname.toUpperCase();
			var sex = sex;
			var date = new Date(date);
			var day = date.getDate().toString();
			var month = (date.getMonth() +1).toString();
			var year = date.getFullYear().toString();
			var place = place.toUpperCase();
			var is_foreign = is_foreign;
			
			if (!(name && surname && sex && place)) {
				// do not calculate, not enough data
				this.$.CodiceShowPane.$.CodiceResult.setValue("");
				this.$.CodiceShowPane.$.CodiceCopyToClipboard.setDisabled(true);
				this.currentRecord.codice = "";
				return;
			}
			
			var result = new Array();
						
			// fix up dates (add 0 if needed)
			if (day.length < 2) { day = "0" + day };
			if (month.length < 2) { month = "0" + month };
			
			//// COGNOME:
				// Cognome (tre): solo consonanti
				var count = 0;
				var sur_split = surname.split(" ");
				for (cogn in sur_split) {
					var cogn_split = sur_split[cogn].split("")
					for (lettera in cogn_split) {
						if ((["A","E","I","O","U"].indexOf(cogn_split[lettera]) == -1) && count < 3) {
							result.push(cogn_split[lettera]);
							count = count + 1;
						}
					}
				}
				// se non sono tre, si aggiungono le vocali
				for (cogn in sur_split) {
					var cogn_split = sur_split[cogn].split("")
					for (lettera in cogn_split) {
						if ((["A","E","I","O","U"].indexOf(cogn_split[lettera]) >= 0) && count < 3) {
							result.push(cogn_split[lettera]);
							count = count + 1;
						}
					}
				}
				// se non sono ancora tre, si aggiunge la X
				while (count < 3) {
					result.push("X");
					count = count + 1;
				}
			//// FINE COGNOME
			
			//// NOME
				// Nome (tre): solo consonanti (prima, terza, quarta se >= 4; prime tre se < 4)
				var lettere = new Array();
				var name_split = name.split(" ")
				for (nom in name_split) {
					var nom_split = name_split[nom].split("")
					for (lettera in nom_split) {
						if ((["A","E","I","O","U"].indexOf(nom_split[lettera]) == -1)) {
							lettere.push(nom_split[lettera]);
						}
					}
				}
				
				if (lettere.length >= 4) {
					// prima terza e quarta
					result.push(lettere[0]);
					result.push(lettere[2]);
					result.push(lettere[3]);
				}
				else if (lettere.length == 3) {
					// prima seconda e terza
					result.push(lettere[0]);
					result.push(lettere[1]);
					result.push(lettere[2]);
				}
				else {
					// meno di tre, si riparte e si aggiungono le vocali
					for (nom in name_split) {
						var nom_split = name_split[nom].split("")
						for (lettera in nom_split) {
							if ((["A","E","I","O","U"].indexOf(nom_split[lettera]) >= 0) && lettere.length < 3) {
								lettere.push(nom_split[lettera]);
							}
						}
					}
					
					if (lettere.length < 3) {
						// ancora meno di 3, aggiungiamo una X
						while (lettere.length != 3) {
							lettere.push("X")
						}
					}
					
					result = result.concat(lettere);
				}
				
			//// FINE NOME
			
			//// DATA DI NASCITA
				var year = year.substring(2); // ultimi 2
				var month = mesi[month];
				
				if (sex == "female") {
					// se femmina, si somma 40
					var day = ((day * 1) + 40).toString();
				}
				
				result = result.concat([year, month, day]);
				
			//// FINE DATA DI NASCITA
			
			//// COMUNE
				// fix place
				if (is_foreign == false) {
					// fix place
					var place2 = new Array();
					var place_split = place.split(" ");
					for (lettera in place_split) {
						if (place_split[lettera] != "") {
							place2.push(place_split[lettera]);
						}
					}
					place = place2.join(" ");
					if (!(place in comuni)) {
						return;
					}
					result.push(comuni[place]);
				}
				else {
					result.push(esteri[place]);
				}
			//// FINE COMUNE
			
			//// CARATTERE DI CONTROLLO
				var pari = new Array()
				var dispari = new Array()
				var count = 0
				
				var codice_fino_ad_adesso = result.join("").split("")
				for (lettera in codice_fino_ad_adesso) {
					count = count + 1;
					if ((count % 2) == 0) {
						// pari
						pari.push(codice_fino_ad_adesso[lettera]);
					}
					else {
						// dispari
						dispari.push(codice_fino_ad_adesso[lettera]);
					}
				}
				
				var dispari_somma = 0;
				var pari_somma = 0;
				var tutto = 0;
				
				// sommiamo
				for (lettera in dispari) {
					dispari_somma = dispari_somma + (dispari_control[dispari[lettera]] * 1);
				}
				for (lettera in pari) {
					pari_somma = pari_somma + (pari_control[pari[lettera]] * 1);
				}
				tutto = pari_somma + dispari_somma;
				tutto = tutto % 26; // resto della divisione per 26
				
				result.push(tutto_control[tutto.toString()]);
			//// FINE CARATTERE DI CONTROLLO
			
			//// Scrivo.
			this.$.CodiceShowPane.$.CodiceResult.setValue(result.join(""));
			this.$.CodiceShowPane.$.CodiceCopyToClipboard.setDisabled(false);
			
			return result.join("");		
		}
	}

});
