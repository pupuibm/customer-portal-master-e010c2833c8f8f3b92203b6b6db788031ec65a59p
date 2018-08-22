var assert = require('assert');
var RequestValidator = require('../lib/RequestValidator');

var mockApiSecurity = {};
mockApiSecurity.constructor = function(){ return mockApiSecurity; };

describe('RequestValidator', function() {
  	describe('#ValidateRequest()', function() {

  		it('Valid request', function() {
	    	mockApiSecurity.Verify = function(apiId, apiSecret){
	    		return true;
	    	}

	    	var req = {
	    		'headers': {
	    			'x-api-id': '12345',
	    			'x-api-secret': 'dfjdkfjdfkdjfkdfj',
	    			'accept-language': 'en-US'
	    		}
	    	};

	    	var validator = new RequestValidator(mockApiSecurity);

	    	var values = null

	    	assert.doesNotThrow(() => values = validator.ValidateRequest(req, []));

	    	assert.ok(values != null)
	    	assert.equal('en', values['Language']);	    			
	    });

	    it('Missing x-api-id throws error', function() {
	    	mockApiSecurity.Verify = function(apiId, apiSecret){
	    		return true;
	    	}

	    	var req = {
	    		'headers': {	    			
	    			'x-api-secret': 'dfjdkfjdfkdjfkdfj',
	    			'accept-language': 'en-US'
	    		}
	    	};

	    	var validator = new RequestValidator(mockApiSecurity);

	    	assert.throws(() => validator.ValidateRequest(req, []), 
	    		function(err) {
	    			assert.equal('Missing required header value "x-api-id"', err);
    				return true;
				}, "unexpected error");	    		
	    });

	    it('Missing x-api-secret throws error', function() {
	    	mockApiSecurity.Verify = function(apiId, apiSecret){
	    		return true;
	    	}

	    	var req = {
	    		'headers': {	
	    			'x-api-id': '12345',    			
	    			'accept-language': 'en-US'
	    		}
	    	};

	    	var validator = new RequestValidator(mockApiSecurity);

	    	assert.throws(() => validator.ValidateRequest(req, []), 
	    		function(err) {
	    			assert.equal('Missing required header value "x-api-secret"', err);
    				return true;
				}, "unexpected error");	    		
	    });

	    it('Invalid x-api-id or x-api-secret', function() {
	    	mockApiSecurity.Verify = function(apiId, apiSecret){
	    		return false;
	    	}

	    	var req = {
	    		'headers': {
	    			'x-api-id': '12345',
	    			'x-api-secret': 'dfjdkfjdfkdjfkdfj',
	    			'accept-language': 'en-US'
	    		}
	    	};

	    	var validator = new RequestValidator(mockApiSecurity);

	    	assert.throws(() => validator.ValidateRequest(req, []), 
	    		function(err) {
	    			assert.equal('x-api-id or x-api-secret invalid!', err);
    				return true;
				}, "unexpected error");	    				
	    });

	    it('Valid request with query string parameters', function() {
	    	mockApiSecurity.Verify = function(apiId, apiSecret){
	    		return true;
	    	}

	    	var req = {
	    		'headers': {
	    			'x-api-id': '12345',
	    			'x-api-secret': 'dfjdkfjdfkdjfkdfj',
	    			'accept-language': 'en-US'
	    		},
	    		'query': {
	    			'MyAwesomeValue': '10',
	    			'LessAwesomeValue': '2'
	    		}
	    	};

	    	var validator = new RequestValidator(mockApiSecurity);

	    	var values = null

	    	assert.doesNotThrow(() => values = validator.ValidateRequest(req, ['MyAwesomeValue', 'LessAwesomeValue']));

	    	assert.ok(values != null)
	    	assert.equal('en', values['Language']);
	    	assert.equal('10', values['MyAwesomeValue']);
	    	assert.equal('2', values['LessAwesomeValue']);	   	    			
	    });

	    it('Valid request with missing required query string parameter', function() {
	    	mockApiSecurity.Verify = function(apiId, apiSecret){
	    		return true;
	    	}

	    	var req = {
	    		'headers': {
	    			'x-api-id': '12345',
	    			'x-api-secret': 'dfjdkfjdfkdjfkdfj',
	    			'accept-language': 'en-US'
	    		},
	    		'query': {	    			
	    			'LessAwesomeValue': '2'
	    		}
	    	};

	    	var validator = new RequestValidator(mockApiSecurity);

	    	assert.throws(() => validator.ValidateRequest(req, ['MyAwesomeValue', 'LessAwesomeValue']), 
	    		function(err) {
	    			assert.equal('Missing required query parameter "MyAwesomeValue"', err);
    				return true;
				}, "unexpected error");	    	 	    			
	    });

	});
});