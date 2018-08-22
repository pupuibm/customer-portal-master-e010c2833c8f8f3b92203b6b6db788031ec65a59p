"use strict"

var DataphileWrapper = require('mli-dataphile').DataphileWrapper;
var mliUtil = require('mli-util');

module.exports = class RecentActivity {

	constructor(endpointMap, stringLookup, logger){
		this._endpointMap = endpointMap;
		this._stringLookup = stringLookup;
		this._logger = logger;
		this._wrappers = [];

		this._jsonUtil = mliUtil.JSONUtils;
		this._nodeHelpers = mliUtil.NodeHelpers;
	}

	GetAccountActivites(language, accountNums, callback){
		callback = (typeof callback === 'function') ? callback : function() {};
		var self = this;

		var accountArray = accountNums.split(',');
		var count = accountArray.length;

		var count = 0;
		var accountData = {};
		accountArray.forEach(function(account){
			self._nodeHelpers.Sync(function*(resume){	
				try{		
					var rowData = account.split(':');
					var accountNum = rowData[0];
					var dealerCode = rowData[1];			

					var endpoint = self._endpointMap[dealerCode];

					var wrapper = new DataphileWrapper(mliUtil, endpoint['wsdlUrl'], endpoint['username'], endpoint['password'], self._logger);
					self._wrappers.push(wrapper);
				
					var client = yield wrapper.CreateClient('ACCOUNT', resume);
					var data = yield client.GetHistory(accountNum, '', '', resume);

					var status = self._jsonUtil.SearchJSONTree(data, 'requestStatus');
					var historyRecords = self._jsonUtil.SearchJSONTree(data, 'accountHistoryRow');

					if(status != 'SUCCESS'){
						return callback('The SOAP request resulted in an error.', null);
					}

					accountData[accountNum] = historyRecords;
				}catch(ex){
					return callback(ex, null);
				}

				count++;
				if(count == accountArray.length){
					self._formatResponse(accountData, callback);
				}
			});			
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

	_formatResponse(accountHistoryData, callback){
		callback = (typeof callback === 'function') ? callback : function() {};
		var self = this;

		var max_trn_per_account = 10;
		var max_days_prior = 10;
		var today = new Date();

		var date_limit = today - max_days_prior;

		var response = {
			recentActivity: []
		};		

		var formattedHistoryRecords = [];
		for(var accountNum in accountHistoryData) {
			var accountRecordCount = 0;		
			var accountHistories = accountHistoryData[accountNum];

			for(var i = 0; i < accountHistories.length; i++){
				var settlementDate = new Date(this._formatTransactionDate(accountHistories[i]['settlement-date'][0]));
				if(settlementDate >= date_limit && accountRecordCount < max_trn_per_account){
					accountRecordCount++;
					response['recentActivity'].push(self._formatHistory(accountNum, accountHistories[i]));
				}
			}
		}

		return callback(null, response);
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