"use strict";

var express = require('express');

var StringLookup = require('./localization/StringLookup');

var AccountHoldings = require('./lib/AccountHoldings');
var AccountActivites = require('./lib/AccountActivites');
var RecentActivity = require('./lib/RecentActivity');
var RequestValidator = require('./lib/RequestValidator');

var ApiSecurity = require('mli-api-security').ApiSecurity;
var DataphileWrapper = require('mli-dataphile').DataphileWrapper;

var mliUtil = require('mli-util');
var Logger = require('mli-logging');

var fs = require('fs');
var app = express();

var disposableObjects = {};
var shutdownInitiatedFlag = false;

var security = new ApiSecurity();
var logger = new Logger.ConsoleLogger(Logger.LOGGING_LEVEL.DEBUG);
var validator = new RequestValidator(security);

var stringLookup = new StringLookup();
var endpointMap;

// respond with a string when a GET request is made to the homepage
app.get('/', function (req, res) {
	res.status(200).json('Success');    
});

app.get('/api/AccountHoldings', function (req, res) {
	logger.Time('index.AccountHoldings');	
	var guid = mliUtil.Guid.NewGuid();

	function dispose(){
		if(disposableObjects[guid]) disposableObjects[guid].Dispose();
		delete disposableObjects[guid];
		logger.TimeEnd('index.AccountHoldings');
	}

	function getAccountHoldingsCallback(err, response){
		dispose();
		if(err) return res.status(500).json(OnError(res, err));
		return res.status(200).json(response);
	}		

	try{
		checkConfigLoaded();
		var pr = validator.ValidateRequest(req, ['AccountNum', 'DealerCode']);		
		var acct = new AccountHoldings(endpointMap, stringLookup, logger);
		disposableObjects[guid] = acct;
		acct.GetAccountHoldings(pr.Language, pr.DealerCode, pr.AccountNum, getAccountHoldingsCallback);
	}catch(err){
		dispose();
		return res.status(500).json(OnError(res, err));		
	}
});

app.get('/api/AccountActivity', function (req, res) {
	logger.Time('index.AccountActivity');	
	var guid = mliUtil.Guid.NewGuid();
	
	var firstNavKey = req.query.firstNavKey || '';
	var lastNavKey = req.query.lastNavKey || '';

	function dispose()
	{
		if(disposableObjects[guid]) disposableObjects[guid].Dispose();
		delete disposableObjects[guid];
		logger.TimeEnd('index.AccountActivity');
	}

	function getAccountActivityCallback(err, response){
		dispose();
		if(err) return res.status(500).json(OnError(res, err));
		return res.status(200).json(response);
	}

	try
	{
		checkConfigLoaded();
		var pr = validator.ValidateRequest(req, ['AccountNum', 'DealerCode']);
		var acct = new AccountActivites(endpointMap, stringLookup, logger);
		disposableObjects[guid] = acct;
		acct.GetAccountActivites(pr.Language, pr.DealerCode, pr.AccountNum, firstNavKey, lastNavKey, getAccountActivityCallback);
	}
	catch(err)
	{
		dispose();
		return res.status(500).json(OnError(res, err));		
	}
});

app.get('/api/RecentActivity', function (req, res) {
	logger.Time('index.RecentActivity');	
	var guid = mliUtil.Guid.NewGuid();

	function dispose()
	{
		if(disposableObjects[guid]) disposableObjects[guid].Dispose();
		delete disposableObjects[guid];
		logger.TimeEnd('index.RecentActivity');
	}

	function getRecentActivityCallback(err, response){
		dispose();
		if(err) return res.status(500).json(OnError(res, err));
		return res.status(200).json(response);
	}

	try
	{
		checkConfigLoaded();
		var pr = validator.ValidateRequest(req, ['AccountNums']);
		var acct = new RecentActivity(endpointMap, stringLookup, logger);
		disposableObjects[guid] = acct;
		acct.GetAccountActivites(pr.Language, pr.AccountNums, getRecentActivityCallback);
	}
	catch(err)
	{
		dispose();
		return res.status(500).json(OnError(res, err));		
	}
});

app.get('/api/CustomerTombstoneData', function (req, res) {
	
});

function exitHandler(options, err) {
	if(err){
		logger.Error(err.stack);
	}
	
	if(shutdownInitiatedFlag){
		// Multiple attempts to shutdown
		process.exit(1);
	}

	shutdownInitiatedFlag = true;

    if (options.cleanup){

    	if(Any(disposableObjects)){

		    let requests = disposableObjects.map((item) => {
				return new Promise((resolve) => {
		    		item.Dispose(resolve);
		    	});
		    });		

			Promise.all(requests).then(function(){ if (options.exit) process.exit(); });
		}

    }else{
    	if (err) logger.Error(err.stack);
    if (options.exit) process.exit();
    }
}

//do something when app is closing
process.on('exit', exitHandler.bind(null,{cleanup:true}));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {exit:true}));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {cleanup:true, exit:true}));

function OnError(res, err){
	var errorElement = [];
	console.log('Exception: ' + err);

	if(err.stack){
		logger.Error(err.stack);		
	}else{
		logger.Error(err);
	}

	errorElement.push("{'errors': ['status': '500', 'title': 'Error', 'details':'" + err + "']}");
	
	return errorElement;
}

function EscapeHTML(s) { 
    return s.replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
}

function Any(obj) {
  return Object.keys(obj).length;
}

function checkConfigLoaded(){
	if(!process.env["API_CONFIGURATION"]){
		console.log("API_CONFIGURATION NOT FOUND");
		if (fs.existsSync('api.config')) {
			process.env["API_CONFIGURATION"] = fs.readFileSync('api.config', 'utf8');	
		}else{
			throw new Error('Valid configuration not found!');
		}
	}

	var parsed = JSON.parse(process.env["API_CONFIGURATION"]);

	logger = new Logger.ConsoleLogger(parsed.LOGGING_LEVEL);
	endpointMap = parsed.DATAPHILE_ENDPOINTS;

	parsed.API_SECURITY.forEach((item, index) => { security.Add(item["x-api-id"], item["x-api-secret"]) });

	console.log(JSON.stringify(endpointMap));
}

/******************************************/
var port = process.env.PORT || 3000;
console.log( "listening on " + port );

app.listen(port);