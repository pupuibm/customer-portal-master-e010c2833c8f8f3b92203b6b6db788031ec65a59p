"use strict"

var DataphileWrapper = require('mli-dataphile').DataphileWrapper;
var mliUtil = require('mli-util');

module.exports = class AccountHoldings {

	constructor(endpointMap, stringLookup, logger){
		this._endpointMap = endpointMap;
		this._stringLookup = stringLookup;
		this._logger = logger;
		this._wrappers = [];

		this._jsonUtil = mliUtil.JSONUtils;
		this._nodeHelpers = mliUtil.NodeHelpers;
	}

	GetAccountHoldings(language, dealerCode, accountNum, callback){
		callback = (typeof callback === 'function') ? callback : function() {};
		var self = this;

		self._logger.Time('AccountActivites.GetAccountActivites');

		self._nodeHelpers.Sync(function*(resume){
			try{
				var endpoint = self._endpointMap[dealerCode];
				var wrapper = new DataphileWrapper(mliUtil, endpoint['wsdlUrl'], endpoint['username'], endpoint['password'], self._logger);
				self._wrappers.push(wrapper);

				var client = yield wrapper.CreateClient('ACCOUNT', resume);
				var positions = yield client.GetPositions(accountNum, resume);
				var clientId = self._jsonUtil.SearchJSONTree(positions, 'client-id')[0];
				var clientSummary = yield client.GetClientSummary(clientId, resume);	
				
				self._formatResponse(accountNum, language, positions, clientSummary, callback);
			}catch(ex){
				return callback(ex, null);
			}
		});
	}

	Dispose(callback){
		callback = (typeof callback === 'function') ? callback : function() {};

		if(this._currentWrapper){
			this._currentWrapper.Dispose(callback);
		}
	}

	_formatResponse(accountNum, language, positionsData, clientSummary, callback){
		callback = (typeof callback === 'function') ? callback : function() {};
		var self = this;

		try{

			self._logger.Time('AccountHoldings._formatResponse');	
			
			var positionDataStatus = this._jsonUtil.SearchJSONTree(positionsData, 'requestStatus');
			var clientSummaryStatus = this._jsonUtil.SearchJSONTree(clientSummary, 'requestStatus');
			var recipientTypeValue = this._jsonUtil.SearchJSONTree(clientSummary, 'recipient-type');
			var accountSummary = this._jsonUtil.SearchJSONTree(positionsData, 'accountSummaryRow');
			var accountPositions = this._jsonUtil.SearchJSONTree(positionsData, 'accountPositionRow');

			if(positionDataStatus != 'SUCCESS' || clientSummaryStatus != 'SUCCESS'){
				return callback('The SOAP request resulted in an error.', positionsData);
			}

			if(!recipientTypeValue || recipientTypeValue.length != 1){
				return callback('Invalid recipient-type in SOAP response.', positionsData);
			}

			if(!accountSummary || accountSummary.length != 1){
				return callback('Invalid accountSummary section in SOAP response.', positionsData);
			}

			accountSummary = accountSummary[0];
			recipientTypeValue = recipientTypeValue[0];
			
			var response = {
				accountHoldings:{
					accountSummary: this._formatSummary(accountSummary, recipientTypeValue, language),					
					assetClassGroup: []
				}
			}			

			accountPositions = this._sortPositions(accountPositions);
			accountPositions = this._groupPositions(accountPositions, language);

			for(var assetClass in accountPositions){
				var group = accountPositions[assetClass];
	
				var groupEntry = {
					assetClassDescription: assetClass,
					assetClassMarketValue: group.marketValue,
					accountHolding: []
				}

				for(var j = 0; j < group.positions.length; j++){
					groupEntry['accountHolding'].push(this._formatPosition(accountNum, group.positions[j]));
				}

				response['accountHoldings']['assetClassGroup'].push(groupEntry);
			}

			self._logger.TimeEnd('AccountHoldings._formatResponse');
			return callback(null, response);
		}catch(exc){
			self._logger.TimeEnd('AccountHoldings._formatResponse');
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
			lastStatementDate: this._formatDate(accountSummary['last-statement-date'][0]),
			portType: accountSummary['port-type'][0],
			portTypeDescription: this._stringLookup.LookupPortFlag(accountSummary['port-type'][0], language),
			bookValue: this._formatNumber(accountSummary['book-value'][0]),
			beneficiaryName: accountSummary['benef-name'][0]
		}
	}

	_formatPosition(accountNum, accountPosition, language){
		return {
			acctNumber: accountNum,
			stat: accountPosition['stat'][0],
			securityType: accountPosition['security-type'][0],
			symbol: accountPosition['symbol'][0],
			exchange: accountPosition['exchange'][0],
			callPut: accountPosition['call-put'][0],
			expiryDate: this._formatDate(accountPosition['expiry-date'][0]),
			strikePrice: this._formatNumber(accountPosition['strike-price'][0]),
			codedSymbol: accountPosition['coded-symbol'][0],
			symbolDescription: accountPosition['symbol-description'][0],
			quantity: this._formatNumber(accountPosition['quantity'][0]),
			pendingQuantity: this._formatNumber(accountPosition['pending-quantity'][0]),
			price: this._formatNumber(accountPosition['price'][0]),
			countryOfIssue: this._formatCountryOfIssue(accountPosition['price'][0]),
			marketValue: this._formatNumber(accountPosition['market-value'][0]),
			holdingPercentage: this._formatNumber(accountPosition['holding-percentage'][0]),
			currentCost: 'Not in May 5 code drop',
			averageCost: this._formatNumber(accountPosition['average-cost'][0]),
			assetClass: accountPosition['class'][0],					
			assetClassDescription: this._stringLookup.LookupAssetClass(accountPosition['class'][0], language),	
			gain: this._formatNumber(accountPosition['gain'][0]),
		}
	}

	_sortPositions(unsortedPositions){
		var self = this;

		return unsortedPositions.sort(function(a, b){
			var aSort = self._stringLookup.LookupAssetClassSort(a['class'][0]);
			var bSort = self._stringLookup.LookupAssetClassSort(b['class'][0]);

			return aSort > bSort;
		});
	}

	_groupPositions(ungroupedPositions, language){
		var groupedData = {};

		for(var i = 0; i < ungroupedPositions.length; i++){
			var accountPosition = ungroupedPositions[i];
			var assetClass = this._stringLookup.LookupAssetClass(accountPosition['class'][0], language);

			if(!groupedData[assetClass]){
				groupedData[assetClass] = {marketValue: 0, positions: []};
			}

			groupedData[assetClass].positions.push(accountPosition);
			groupedData[assetClass].marketValue = groupedData[assetClass].marketValue + this._formatNumber(accountPosition['market-value'][0]);				
		}

		return groupedData;
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

	_formatCountryOfIssue(value){
		var unquoted = JSON.stringify(value).replace(/^"(.*)"$/, '$1');

		var code = unquoted.slice(-1);

		if(code == 'C' || code == 'U'){
			return code;
		}

		return '';
	}

	_formatDate(value){
		var date = new Date(value);

		if(isNaN(date)){
			return value;
		}

		var day = ("0" + date.getDate()).slice(-2);
  		var month = ("0" + (date.getMonth() + 1)).slice(-2);
  		var year = date.getFullYear();

  		return year + '-' + month + '-' + day;
	}
}