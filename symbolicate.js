'use strict';

var Promise = require('bluebird');
var request = Promise.promisify(require('request'));
var flatten = require('lodash').flatten;
var each = require('lodash').each;
var select = require('lodash').select;
var cookie = require('./cookie.json').cookie;

var project = process.env.MINT_PROJECT;

function listErrorsOptions (projectId, page) {
  return {
    url: 'https://mint.splunk.com/api/v1/project/' + projectId + '/errors.json?days=90&status=open&page=' + page,
    headers: {
      'x-splunk-mint-apikey': process.env.MINT_API_KEY,
      'x-splunk-mint-auth-token': process.env.MINT_AUTH_TOKEN,
      'cookie': cookie
    }
  };
}

function getErrorOptions (projectId, errorId) {
  return {
    url: 'https://mint.splunk.com/api/v1/project/' + projectId + '/errors/' + errorId + '.json',
    headers: {
      'x-splunk-mint-apikey': process.env.MINT_API_KEY,
      'x-splunk-mint-auth-token': process.env.MINT_AUTH_TOKEN,
      'cookie': cookie
    }
  };
}

function symbolicateOptions (projectId, errorId) {
  return {
    url: 'https://mint.splunk.com/project/' + projectId + '/errors/' + errorId + '/symbolicate',
    headers: {
      'x-splunk-mint-apikey': process.env.MINT_API_KEY,
      'x-splunk-mint-auth-token': process.env.MINT_AUTH_TOKEN,
      'cookie': cookie
    }
  };
}

var errors = [];
var expandedErrors = [];

function morePages (currentPageData) {
  return (currentPageData.page < currentPageData.pages);
}

function getPageOfErrorData (page) {
  var requestOpts = listErrorsOptions(project, page);

  console.log('Getting error page: ' + page);

  return request(requestOpts)
    .spread(function (response, body) {
      var currentPageData = JSON.parse(body);

      errors.push(currentPageData.data);

      if (morePages(currentPageData)) {
        return getPageOfErrorData(page + 1);
      }
    });
}

function getAllTheErrors () {
  return getPageOfErrorData(1);
}

function flattenErrors () {
  errors = flatten(errors);
}

function expandErrors () {
  console.log('expanding ' + errors.length + ' errors');

  var promises = [];

  each(errors, function (error) {
    var requestOpts = getErrorOptions(project, error.id);

    var p = request(requestOpts).spread(function (response, body) {
      expandedErrors.push(JSON.parse(body));
    });

    promises.push(p);
  });

  return Promise.settle(promises);
}

function symbolicateIfRequired () {
  var notSymbolicatedString = /^(TargetAppKit|TargetApp)\s0x[0-9a-f]+\s0x[0-9a-f]+\s\+\s[0-9]+$/m;

  var needsSymbolication = select(expandedErrors, function(error) {
    return select(error.stacktrace, function (string) {
      return notSymbolicatedString.test(string);
    }).length > 0;
  });

  console.log('To symbolicate ' + needsSymbolication.length + ' errors');

  function symbolicate (projectId, i, parallel) {
    var error = needsSymbolication[i];
    if (!error) {
      return;
    }

    console.log('symbolicating:', (i + 1), 'of', needsSymbolication.length, '(', error.error.id, ')');

    var requestOpts = symbolicateOptions(projectId, error.error.id);

    return request(requestOpts).spread(function (res, body) {
      var result;
      try {
        result = JSON.parse(body);
      } catch (e) {
        console.error(e);
      }

      if (result.status !== 'ok') {
        console.log(result);
      } else {
        error.stacktrace = result.stacktrace;
      }

      return symbolicate(projectId, i + parallel, parallel);
    });
  }

  return Promise.settle([
    symbolicate(project, 0, 5),
    symbolicate(project, 1, 5),
    symbolicate(project, 2, 5),
    symbolicate(project, 3, 5),
    symbolicate(project, 4, 5),
  ]);
}

function logError (e) {
  console.error(e);
}

getAllTheErrors()
  .then(flattenErrors)
  .then(expandErrors)
  .then(symbolicateIfRequired)
  .catch(logError);