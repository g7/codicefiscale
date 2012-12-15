enyo.kind({
	name: "CodiceFiscale.List",
	kind: enyo.SlidingView,
	layoutKind: enyo.VFlexLayout,
	components : [
		{kind: enyo.Header, style: "min-height: 60px;", components: [
			{content: $L("Italian Fiscal Codes")}
		]},
		{flex: 1, name: "codiciList", kind: "DbList", pageSize: 50, onQuery: "listQuery", onSetupRow: "setupCodici", components: [
			{kind: enyo.SwipeableItem, onclick:"doListTap", onConfirm: "doDeleteCodice", layoutKind: enyo.VFlexLayout, tapHighlight: true, components: [
				{name: "listItemName", content: "", style: "text-overflow: ellipsis; overflow: hidden; white-space: nowrap;"},
				{name: "listItemCodice", content: "", style: "font-size: 0.75em"},
			]}
		]},
		{kind: enyo.Toolbar, pack: "justify", components: [
			{flex: 1},
			{icon: "images/menu-icon-new.png", onclick: "doNewCodiceTap", align: "right"}
		]},
	],

	setupCodici: function(inSender, inRecord, inIndex) {
		if ((inRecord.name != "") || (inRecord.surname != "")) {
			this.$.listItemName.setContent(inRecord.name + " " + inRecord.surname);
		}
		else {
			this.$.listItemName.setContent($L("Untitled"));
		}
		this.$.listItemCodice.setContent(inRecord.codice);
	},

	listQuery: function(inSender, inQuery) {
		//inQuery.orderBy = "name";
		return this.owner.$.dbFind.call({query: inQuery});
	},

	events: {
		"onListTap": "",
		"onNewCodiceTap": "",
		"onDeleteCodice": ""
	} 
});
