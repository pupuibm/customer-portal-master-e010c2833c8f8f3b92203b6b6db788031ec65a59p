"use strict"

var DataphileWrapper = require('mli-dataphile').DataphileWrapper;
var mliUtil = require('mli-util');

module.exports = class AccountActivites {

	constructor(endpointMap, stringLookup, logger){
		this._endpointMap = endpointMap;
		this._stringLookup = stringLookup;
		this._logger = logger;
		this._wrappers = [];

		this._jsonUtil = mliUtil.JSONUtils;
		this._nodeHelpers = mliUtil.NodeHelpers;
	}

	GetAccountActivites(language, dealerCode, accountNum, firstNavKey, lastNavKey, callback){
		callback = (typeof callback === 'function') ? callback : function() {};
		var self = this;

		self._logger.Time('AccountActivites.GetAccountActivites');

		self._nodeHelpers.Sync(function*(resume){
			try{
				var endpoint = self._endpointMap[dealerCode];
				var wrapper = new DataphileWrapper(mliUtil, endpoint['wsdlUrl'], endpoint['username'], endpoint['password'], self._logger);
				self._wrappers.push(wrapper);

				var client = yield wrapper.CreateClient('ACCOUNT', resume);
				var history = yield client.GetHistory(accountNum, '', '', resume);
				var clientId = self._jsonUtil.SearchJSONTree(history, 'client-id')[0];
				var clientSummary = yield client.GetClientSummary(clientId, resume);	
				
				self._formatResponse(accountNum, language, history, clientSummary, callback);
			}catch(ex){
				return callback(ex, null);
			}
		});
	}

	Dispose(callback){
		callback = (typeof callback === 'function') ? callback : function() {};
		var self = this;
		
		var disposedCount = 0;

		function disposeCallback(err, status){
			disposedCount++;
			if(disposedCount == self._wrappers.length){
				return callback(null, true); 
			}
		}

		for (var dealerCode in self._wrappers) {
			self._wrappers[dealerCode].Dispose();			
		}
	}

	_formatResponse(accountNum, language, historyData, clientSummary, callback){
		callback = (typeof callback === 'function') ? callback : function() {};
		var self = this;

		try{

			self._logger.Time('AccountActivites._formatResponse');	
			
			var positionDataStatus = this._jsonUtil.SearchJSONTree(historyData, 'requestStatus');
			var clientSummaryStatus = this._jsonUtil.SearchJSONTree(clientSummary, 'requestStatus');
			
			var accountSummary = this._jsonUtil.SearchJSONTree(historyData, 'accountSummaryRow');
			var accountHistories = this._jsonUtil.SearchJSONTree(historyData, 'accountHistoryRow');
			var recipientTypeValue = this._jsonUtil.SearchJSONTree(clientSummary, 'recipient-type');
			var firstNavKeyValue = this._jsonUtil.SearchJSONTree(historyData, 'firstNavKey')[0];
			var lastNavKeyValue = this._jsonUtil.SearchJSONTree(historyData, 'lastNavKey')[0];

			if(positionDataStatus != 'SUCCESS' || clientSummaryStatus != 'SUCCESS'){
				return callback('The SOAP request resulted in an error.', historyData);
			}
			
			if(!accountSummary || accountSummary.length != 1){
				return callback('Invalid accountSummary section is SOAP response.', null);
			}

			if(!recipientTypeValue || recipientTypeValue.length != 1){
				return callback('Invalid recipient-type in SOAP response.', historyData);
			}

			accountSummary = accountSummary[0];
			recipientTypeValue = recipientTypeValue[0];

			var response = {
				accountActivity:{
					accountSummary: this._formatSummary(accountSummary, recipientTypeValue, language),
					accountTransaction: [],
					historyNavigation: {
						firstNavKey: this._formatNumber(firstNavKeyValue),
						lastNavKey: this._formatNumber(lastNavKeyValue)
					}
				}
			}

			for(var i = 0; i < accountHistories.length; i++){
				response['accountActivity']['accountTransaction'].push(this._formatHistory(accountNum, accountHistories[i]));
			}

			return callback(null, response);
		}catch(exc){
			return callback(exc, null);
		}
	}

	_formatSummary(accountSummary, recipientTypeValue, language){
		return {
			stat: accountSummary['stat'][0],
			recipientType: recipientTypeValue,
			acctNumber: accountSummary['acct-number'][0],
			acctName: accountSummary['acct-name'][0],
			clientId: accountSummary['client-id'][0],
			iaCode: accountSummary['ia-code'][0],
			acctType: accountSummary['acct-type'][0],
			acctSub: accountSummary['acct-sub'][0],
			acctTypeDescription: this._stringLookup.LookupAccountType(accountSummary['acct-type'][0], accountSummary['acct-sub'][0], language),
			funds: accountSummary['funds'][0],
			fundsDescription: this._stringLookup.LookupFundCode(accountSummary['funds'][0], language),
			acctDescription: accountSummary['acct-description'][0],
			acctStatus: accountSummary['acct-status'][0],
			acctStatusDescription: this._stringLookup.LookupAccountStatus(accountSummary['acct-status'][0], language),
			acctDivisionCode: accountSummary['acct-division-code'][0],
			tradeCash: this._formatNumber(accountSummary['trade-cash'][0]),
			settlementCash: this._formatNumber(accountSummary['settlement-cash'][0]),
			marketValue: this._formatNumber(accountSummary['market-value'][0]),
			prevYearMarketValue: 'dataphile defect. Not in May 5th drop',
			equityValue: this._formatNumber(accountSummary['equity-value'][0]),
			marginAvail: this._formatNumber(accountSummary['margin-avail'][0]),
			loanValue: this._formatNumber(accountSummary['loan-value'][0]),
			lastStatementDate: this._formatSummaryDate(accountSummary['last-statement-date'][0]),
			portType: accountSummary['port-type'][0],
			portTypeDescription: this._stringLookup.LookupPortFlag(accountSummary['port-type'][0], language),
			bookValue: this._formatNumber(accountSummary['book-value'][0]),
			beneficiaryName: accountSummary['benef-name'][0]
		}
	}

	_formatHistory(accountNum, accountHistory){
		return {
			acctNumber: accountNum,
			stat: accountHistory['stat'][0],
			activity: accountHistory['activity'][0],
			processingDate: this._formatTransactionDate(accountHistory['processing-date'][0]),
			settlementDate: this._formatTransactionDate(accountHistory['settlement-date'][0]),
			description: accountHistory['description'][0],
			quantity : this._formatNumber(accountHistory['quantity'][0]),
			price: this._formatNumber(accountHistory['price'][0]),
			commission: this._formatNumber(accountHistory['commission'][0]),
			netAmount: this._formatNumber(accountHistory['net-amount'][0]),
			transactionStatus: this._formatTransactionStatus(accountHistory['settlement-date'][0])
		}
	}

	_formatNumber(value){
		var unquoted = JSON.stringify(value).replace(/^"(.*)"$/, '$1');
		var code = unquoted.slice(-1);

		if(code == 'C' || code == 'U'){
			unquoted = unquoted.substring(0, unquoted.length - 1);
		}
		
		if(isNaN(unquoted)){
			return value;
		}

		return Number(unquoted);
	}

	_formatTransactionDate(value){
		// Dates currently coming from dataphile in format yy/mm/dd

		if(value.length != 'yy/mm/dd'.length){
			return value;
		}

		var year = value.substring(0, 2);
		var separator1 = value.substring(2, 3);
		var month = value.substring(3, 5);
		var separator2 = value.substring(5, 6);
		var day = value.substring(6, 8);

		if(isNaN(year) || isNaN(month) || isNaN(day) || separator1 != '/' || separator2 != '/'){
			return value;
		}

  		return '20' + year + '-' + month + '-' + day;
	}

	_formatSummaryDate(value){
		var date = new Date(value);

		if(isNaN(date)){
			return value;
		}

		var day = ("0" + date.getDate()).slice(-2);
  		var month = ("0" + (date.getMonth() + 1)).slice(-2);
  		var year = date.getFullYear();

  		return year + '-' + month + '-' + day;
	}

	_formatTransactionStatus(settlementDate){
		var date = new Date(this._formatTransactionDate(settlementDate));

		if(isNaN(date)){
			return '';
		}

		if(date > Date.now()){
			return 'Pending';
		}else{
			return 'Completed';
		}
	}
}
