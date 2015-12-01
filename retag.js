'use strict';

var Promise = require('bluebird');
var request = Promise.promisify(require('request'));
var each = require('lodash').each;
var updateErrorRequest = require('./request-opts').updateErrorRequest;

var logError = require('./workflow').logError;
var flattenErrors = require('./workflow').flattenErrors;
var getErrors = require('./workflow').getErrors;

var project = process.env.MINT_PROJECT;

function retagError (error, newTag) {
  error.tags = [newTag];

  return request(updateErrorRequest(project, error), function() {});
}

function retag(newTag) {
  return function retagErrors (errors) {
    console.log('Retagging ' + errors.length + ' errors');

    var promises = [];

    each(errors, function(error) {
      promises.push(retagError(error, newTag));
    });

    return Promise.settle(promises);
  };
}

getErrors({tag: 'lookback'})
  .then(flattenErrors)
  .then(retag('log'))
  .catch(logError);