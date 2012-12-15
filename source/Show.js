enyo.kind({
	name: "CodiceFiscale.Show",
	kind: enyo.SlidingView,
	layoutKind: enyo.VFlexLayout,
	components : [
		{name: "holder", kind:"HtmlContent",className:"holder"},
		{kind: "Popup", name: "autocompletePopup", components: [
			{layoutKind: "VFlexLayout", flex: 1, height: "150px", components: [
				{kind: enyo.Scroller, flex: 1, name:"autocompleteScroller", components: [
					//{kind: "VirtualRepeater", onSetupRow: "setupRow", name: "autocompleteList", components: [
					{kind: enyo.VirtualRepeater, onSetupRow: "setupRow", onclick: "suggestionSelect", name: "autocompleteList", components: [
						{kind: enyo.Item, layoutKind: enyo.HFlexLayout, tapHighlight: true, components: [
							{name: "autocompleteListItemName", content:""},
						]},
					]},
				]},
			]},
		]},
		{kind: enyo.Header, style: "min-height: 60px;", layoutKind: enyo.HFlexLayout, components: [
			{content: "", name: "selectedItemName", style: "text-overflow: ellipsis; overflow: hidden;  white-space: nowrap;", flex: 1},
		]},
		{kind: enyo.Scroller, flex: 20, autoHorizontal: false, horizontal: false, components: [
			{kind: "RowGroup", caption: $L("Result"), name: "row_result", components: [
				{kind: "RichText", value:"", hint:"", onchange: "doSaveData", spellcheck: false, autocorrect: false, name: "CodiceResult", components: [
					{kind: "Button", name: "CodiceCopyToClipboard", caption: $L("Copy"), onclick: "doClipboardCopy", disabled:true}
				]
			}
			]},
			{kind: "RowGroup", caption: $L("Informations"), name: "row_data", // style: "width: 500px",
				components: [
					{kind: enyo.Input, name: "CodiceName", autoWordComplete: false, autocorrect: false, hint: $L("Name"), onchange: "doSaveData"},
					{kind: enyo.Input, name: "CodiceSurname", autoWordComplete: false, autocorrect: false, hint: $L("Surname"), onchange: "doSaveData"},
					{kind: "RadioGroup", label: $L("Sex"), name: "CodiceSex", onclick: "doSaveData",
						components: [
							{caption: $L("Male"), value: "male"},
							{caption: $L("Female"), value: "female"}
						]
					},
					{kind: "DatePicker", label: $L("Born"), name: "CodiceDate", onChange: "doSaveData"},
					{kind: enyo.HFlexBox, components: [
						{kind: "Picker", name: "statePicker", onChange: "setForeign"},
						{kind: enyo.Input, name: "CodicePlace", autoKeyModifier: "shift-lock", autoWordComplete: false, autocorrect: false, hint:$L("Municipality of birth"), onchange: "publisherInputKeyPress", changeOnInput: true, flex: 1},
					]},

				]
			},
		]},
		{flex :1},
		{kind: enyo.Toolbar, pack: "justify", components: [
			{kind: enyo.GrabButton},
			//{flex: 1},
			//{caption: "Salva", onclick: "doSaveData"},
			//{caption: "Genera", onclick: "doGenerateCodice"},
		]}
	],
	
	setForeign: function(inSender, inValue) {
		if (inSender.getValue() != "ITALIA") {
			// hide CodicePlace
			this.$.CodicePlace.hide();
			// clear CodcePlace
			this.$.CodicePlace.setValue("");
		}
		else {
			// show CodicePlace
			this.$.CodicePlace.show();
		}
		
		this.owner.doSave();
	},

	setupRow: function(inSender, inIndex) {
		var sug = this.suggestions[inIndex];
		
		if (sug) {
			this.$.autocompleteListItemName.setContent(sug);
			return true;
		}
	},

	// Autocomplete code by Geoff Gauchet (zhepree): https://gist.github.com/1150840
	// Thank you!
	publisherInputKeyPress: function(inSender,event,value,d) {
		//handle autocomplete
		this.suggestions=[];
		value = this.owner.parseString(value.toUpperCase());
		var cursor=inSender.getSelection();
		var leftChar=value.charAt(cursor.start); //get the character to the left of the cursor

		if ((leftChar==" ") && (this.suggestions.length <= 1)) { 
			this.$.autocompletePopup.close();
			this.owner.doSave();
		}
		
		//figure out the chunk of text to use as a search
		searchString = value
		if (searchString.length < 2) {
			// require at least three chars
			this.$.autocompletePopup.close(); //ensure popup is closed
			return;
		}
				
		for(comune in comuni) {
			if((comune.indexOf(searchString) == 0)) {
				this.suggestions.push(comune);
				if (this.suggestions.length == 20) { break }; // limit suggestions to 20
			}
		}
				
		if ((this.suggestions.length == 1) && (this.suggestions[0] == searchString)) {
			// only one choice, and it's the one user has wrote.
			this.$.autocompletePopup.close();
			this.owner.doSave();
			return;
		}
							
		if(this.suggestions.length>0){
			//set the content of our hidden DIV to the same as our Input to measure the text width
			this.$.holder.setContent(value);

			//get the width of our hidden DIV
			var textWidth=this.$.holder.getBounds().width;

			//get the positions of our popup and the autocomplete suggestions popup
			var pl=this.$.CodicePlace.getBounds();
			var bl=this.$.autocompletePopup.getBounds();

			//calculate the left of the suggestions. fudge it a bit so it won't cover the cursor
			var left=pl.left+textWidth+40;
			//var left=0;
			var top=0;

			// if phone, open the popup at center.
			if(screen.width <= 640){
				// open at center
				var openAtCenter = true;
			}
			else {
				var openAtCenter = false;
			}

			//open our suggestions list
			if (openAtCenter) {
				this.$.autocompletePopup.openAtCenter();
			}
			else {
				this.$.autocompletePopup.openAtControl(inSender,{top: top,left: left});
			}
			
			//however, if the box is already open, we have to manually set its left
			//this moves the box to the right a bit as we type
			if (openAtCenter == false) { this.$.autocompletePopup.applyStyle("left",left+"px") };
			
			//to top
			this.$.autocompleteScroller.scrollTo(0,0);

			//re-render the VirtualRepeater. You can figure this out
			this.$.autocompleteList.render();
		}else{
			//bail if autocomplete is unnecessary
			this.$.autocompletePopup.close();
		}
	},
	
	//handle when an autocomplete item is tapped
	suggestionSelect: function(inSender,inEvent){
		var sug=inEvent.rowIndex;
		var row=this.suggestions[sug];

		this.$.autocompletePopup.close();

		//quick and dirtily replace the @ and the chunk with the full item
		this.$.CodicePlace.setValue(row);

		//move the cursor to the end of the Input
		var len=this.$.CodicePlace.getValue().length;
		this.$.CodicePlace.setSelection({start:len,end:len});
		
		// save.
		this.owner.doSave();
	},

	
	events: {
		"onSetupRow": "",
		"onsetForeign": "",
		"onClipboardCopy": "",
		"onGenerateCodice": "",
		"onSaveData": "",
		"onListTap": "",
		"onRefreshTap": ""
	} 

});
