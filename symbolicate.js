'use strict';

var Promise = require('bluebird');
var request = Promise.promisify(require('request'));
var select = require('lodash').select;
var cookie = require('./cookie.json').cookie;

var project = process.env.MINT_PROJECT;

var logError = require('./workflow').logError;
var flattenErrors = require('./workflow').flattenErrors;
var getErrors = require('./workflow').getErrors;

var results = {
  ok: [],
  notok: [],
  serverError: [],
  noDsym: []
};

function getErrorOptions (projectId, errorId) {
  return {
    url: 'https://mint.splunk.com/api/v1/project/' + projectId + '/errors/' + errorId + '.json',
    headers: {
      'cookie': cookie
    }
  };
}

function symbolicateOptions (projectId, errorId) {
  return {
    url: 'https://mint.splunk.com/project/' + projectId + '/errors/' + errorId + '/symbolicate',
    headers: {
      'cookie': cookie
    }
  };
}

function expandErrors (errors) {
  console.log('expanding ' + errors.length + ' errors');

  function expand (error) {
    console.log('expanding (', error.id, ')');

    var requestOpts = getErrorOptions(project, error.id);
    return request(requestOpts).spread(function (response, body) {
      return JSON.parse(body);
    });
  }

  return Promise.map(errors, expand, {concurrency: 25});
}

function symbolicateIfRequired (errors) {
  var notSymbolicatedString = /^(TargetAppKit|TargetApp)\s0x[0-9a-f]+\s0x[0-9a-f]+\s\+\s[0-9]+$/m;

  var needsSymbolication = select(errors, function(error) {
    return select(error.stacktrace, function (string) {
      return notSymbolicatedString.test(string);
    }).length > 0;
  });

  console.log('To symbolicate ' + needsSymbolication.length + ' errors');

  function symbolicate (error) {
    console.log('symbolicating: (', error.error.id, ')');

    var requestOpts = symbolicateOptions(project, error.error.id);

    return request(requestOpts).spread(function (res, body) {
      var result;
      try {
        result = JSON.parse(body);
      } catch (e) {
        results.serverError.push(error);
        console.error(requestOpts.url, e);
        return error;
      }

      if (result.status !== 'ok') {
        console.log(result);

        if (result.message === null) {
          results.noDsym.push(error);

          console.log(error.error.app_versions);
        } else {
          results.notok.push(error);
        }
      } else {
        results.ok.push(error);

        error.stacktrace = result.stacktrace;
      }

      return error;
    }).catch(function (e) {
      console.error(e);
      return symbolicate(error);
    });
  }

  return Promise.map(needsSymbolication, symbolicate, { concurrency: 25 });
}

function printSummary () {
  console.log('ok:', results.ok.length);
  console.log('notok:', results.notok.length);
  console.log('serverError:', results.serverError.length);
  console.log('noDsym:', results.noDsym.length);
}

getErrors({status: 'open', tag: 'log'})
  .then(flattenErrors)
  .then(expandErrors)
  .then(symbolicateIfRequired)
  .then(printSummary)
  .catch(logError);