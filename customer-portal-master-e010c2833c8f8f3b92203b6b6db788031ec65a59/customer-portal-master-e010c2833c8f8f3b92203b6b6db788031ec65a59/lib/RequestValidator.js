"use strict";

var ApiSecurity = require('mli-api-security').ApiSecurity;


module.exports = class RequestValidator{

	constructor(apiSecurity){
		this._apiSecurity = apiSecurity;
	}

	ValidateRequest(req, expectedQueryParams){
		var apiId = req.headers["x-api-id"];
		var apiSecret = req.headers["x-api-secret"];
		var acceptLanguage = req.headers["accept-language"];

		var parsedReq = {};

		if(apiId == undefined){
			throw 'Missing required header value "x-api-id"';
		}

		if(apiSecret == undefined){
			throw 'Missing required header value "x-api-secret"';
		}

		if(!this._apiSecurity.Verify(apiId, apiSecret)){
			throw 'x-api-id or x-api-secret invalid!'
		}

		if(acceptLanguage == undefined){
			throw 'Missing required header value "accept-language"';
		}

		acceptLanguage = acceptLanguage.substring(0, 2);

		if(acceptLanguage != 'en' && acceptLanguage != 'fr'){
			throw 'Invalid header value "accept-language"';
		}

		parsedReq['Language'] = acceptLanguage;

		if(Object.prototype.toString.call( expectedQueryParams ) === '[object Array]') {
    		expectedQueryParams.forEach(function(item, index){
    			var value = req.query[item];

    			if(value == undefined){
    				throw 'Missing required query parameter "' + item + '"';    				
    			}

    			parsedReq[item] = value;

    		});
		}

		return parsedReq;
	}
}