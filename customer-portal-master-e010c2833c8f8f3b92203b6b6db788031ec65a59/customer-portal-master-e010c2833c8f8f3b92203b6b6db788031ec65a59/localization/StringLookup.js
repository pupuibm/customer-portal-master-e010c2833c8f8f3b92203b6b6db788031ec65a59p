"use strict";

var fs = require('fs');

module.exports = class StringLookup {

	constructor(){
		this._acctStatus = {};
		this._acctType = {};
		this._assetClass = {};
		this._dealerType = {};
		this._fundCode = {};
		this._portFlag = {};
		this._recipientType = {};
		this._trnCode = {};

		this._readAccountStatuses();
		this._readAccountTypes();
		this._readAssetClasses();
		this._readDealerTypes();
		this._readFundCodes();
		this._readPortFlags();
		this._readRecipientTypes();
		this._readTrnCodes();

	}

	LookupAccountStatus(acctStatus, language){
		var key = acctStatus;
		var entry = this._acctStatus[key];

		if(entry){
			return entry[language];
		}

		return '';
	}

	LookupAccountType(acctType, acctSub, language){
		var key = acctType + '.' + acctSub;
		var entry = this._acctType[key];
		
		if(entry){
			return entry[language];
		}

		return '';
	}

	LookupAssetClass(assetClass, language){
		var key = assetClass;
		var entry = this._assetClass[key];

		if(entry){
			return entry[language];
		}

		return '';
	}

	LookupAssetClassSort(assetClass){
		var key = assetClass;
		var entry = this._assetClass[key];

		if(entry){
			return entry['sort'];
		}

		return '';
	}

	LookupDealerType(dealerType, language){
		var key = dealerType;
		var entry = this._dealerType[key];

		if(entry){
			return entry[language];
		}

		return '';
	}

	LookupDealerTypeSort(dealerType){
		var key = dealerType;
		var entry = this._dealerType[key];

		if(entry){
			return entry['sort'];
		}

		return '';
	}

	LookupFundCode(fundCode, language){
		var key = fundCode;
		var entry = this._fundCode[key];

		if(entry){
			return entry[language];
		}

		return '';
	}

	LookupPortFlag(portFlag, language){
		var key = portFlag;
		var entry = this._portFlag[key];

		if(entry){
			return entry[language];
		}

		return '';
	}

	LookupRecipientType(recipientType, language){
		var key = recipientType;
		var entry = this._recipientType[key];

		if(entry){
			return entry[language];
		}

		return '';
	}

	LookupTrnCode(trnCode, language){
		var key = trnCode;
		var entry = this._trnCode[key];

		if(entry){
			return entry[language];
		}

		return '';
	}

	_readAccountStatuses(){
		var content = JSON.parse(fs.readFileSync('./localization/acctStatusLookup.json', 'utf8'));

		for(var i = 0; i < content['entry'].length; i++){
			var key = content['entry'][i].acctStatus;

			var enValue = content['entry'][i].en;
			var frValue = content['entry'][i].fr;

			this._acctStatus[key] = { "en": enValue, "fr": frValue };
		}
	}

	_readAccountTypes(){
		var content = JSON.parse(fs.readFileSync('./localization/acctTypeLookup.json', 'utf8'));

		for(var i = 0; i < content['entry'].length; i++){
			var key = content['entry'][i].acctType + '.' + content['entry'][i].acctSub;

			var enValue = content['entry'][i].en;
			var frValue = content['entry'][i].fr;

			this._acctType[key] = { "en": enValue, "fr": frValue };
		}
	}

	_readAssetClasses(){
		var content = JSON.parse(fs.readFileSync('./localization/assetClassLookup.json', 'utf8'));

		for(var i = 0; i < content['entry'].length; i++){
			var key = content['entry'][i].assetClass;

			var enValue = content['entry'][i].en;
			var frValue = content['entry'][i].fr;
			var sortValue = content['entry'][i].sort;

			this._assetClass[key] = { "en": enValue, "fr": frValue, "sort": sortValue };
		}
	}

	_readDealerTypes(){
		var content = JSON.parse(fs.readFileSync('./localization/dealerTypeLookup.json', 'utf8'));

		for(var i = 0; i < content['entry'].length; i++){
			var key = content['entry'][i].assetClass;

			var enValue = content['entry'][i].en;
			var frValue = content['entry'][i].fr;
			var sortValue = content['entry'][i].sort;

			this._dealerType[key] = { "en": enValue, "fr": frValue, "sort": sortValue };
		}
	}

	_readFundCodes(){
		var content = JSON.parse(fs.readFileSync('./localization/fundCodeLookup.json', 'utf8'));

		for(var i = 0; i < content['entry'].length; i++){
			var key = content['entry'][i].fundCode;

			var enValue = content['entry'][i].en;
			var frValue = content['entry'][i].fr;

			this._fundCode[key] = { "en": enValue, "fr": frValue };
		}
	}

	_readPortFlags(){
		var content = JSON.parse(fs.readFileSync('./localization/portFlagLookup.json', 'utf8'));

		for(var i = 0; i < content['entry'].length; i++){
			var key = content['entry'][i].portFlag;

			var enValue = content['entry'][i].en;
			var frValue = content['entry'][i].fr;

			this._portFlag[key] = { "en": enValue, "fr": frValue };
		}
	}

	_readRecipientTypes(){
		var content = JSON.parse(fs.readFileSync('./localization/recipientTypeLookup.json', 'utf8'));

		for(var i = 0; i < content['entry'].length; i++){
			var key = content['entry'][i].recipientType;

			var enValue = content['entry'][i].en;
			var frValue = content['entry'][i].fr;

			this._recipientType[key] = { "en": enValue, "fr": frValue };
		}
	}

	_readTrnCodes(){
		var content = JSON.parse(fs.readFileSync('./localization/transCodeLookup.json', 'utf8'));

		for(var i = 0; i < content['entry'].length; i++){
			var key = content['entry'][i].trnCode;

			var enValue = content['entry'][i].en;
			var frValue = content['entry'][i].fr;

			this._trnCode[key] = { "en": enValue, "fr": frValue };
		}
	}
}