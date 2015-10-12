'use strict';

var Promise = require('bluebird');
var request = Promise.promisify(require('request'));
var flatten = require('lodash').flatten;
var each = require('lodash').each;
var select = require('lodash').select;
var contains = require('lodash').contains;
var moment = require('moment');

// var rules = require('./rules.json');
var cookie = require('./cookie.json').cookie;

var project = process.env.MINT_PROJECT;

function listErrorsOptions (projectId, page) {
  return {
    url: 'https://mint.splunk.com/api/v1/project/' + projectId + '/errors.json?status=open&page=' + page,
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

function updateErrorRequest (projectId, error) {
  return {
    url: 'https://mint.splunk.com/api/v1/project/' + projectId + '/errors/' + error.id + '.json',
    method: 'PUT',
    headers: {
      'x-splunk-mint-apikey': process.env.MINT_API_KEY,
      'x-splunk-mint-auth-token': process.env.MINT_AUTH_TOKEN,
      'cookie': cookie
    },
    body: JSON.stringify(error)
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

function resolveErrors (errorType, tag, resolvedVersion) {
  var toResolve = select(expandedErrors, function(error) {
    return select(error.stacktrace, function (string) {
      return contains(string, errorType);
    }).length > 0;
  });

  console.log('Resolving ' + toResolve.length + ' ' + errorType + ' errors');

  var promises = [];

  each(toResolve, function(e) {
    e.error.tags = [tag];
    e.error.status = 'resolved';
    //jshint camelcase:false
    e.error.resolved_at = resolvedVersion;
    e.error.resolved = moment().format('YYYY-MM-DDThh:mm:ss.ssss');

    var putOptions = updateErrorRequest(project, e.error);

    console.log(e.error.id);

    promises.push(request(putOptions, function() {}));
  });

  return Promise.settle(promises);
}

getPageOfErrorData(1)
  .then(function flattenErrors () {
    errors = flatten(errors);
  })
  .then(function expandErrors () {
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
  })
  .then(function symbolicateIfRequired () {
    var notSymbolicatedString = /^[a-zA-z_\.]+\s0x[0-9a-f]+\s0x[0-9a-f]+\s\+\s[0-9]+$/m;

    var needsSymbolication = select(expandedErrors, function(error) {
      return select(error.stacktrace, function (string) {
        return notSymbolicatedString.test(string);
      }).length > 0 ;
    });

    console.log('To symbolicate ' + needsSymbolication.length + ' errors');
    console.log(needsSymbolication);

    function symbolicate (projectId, i) {
      var error = needsSymbolication[i];
      if (!error) {
        return;
      }

      console.log('symbolicating: ' + i + ' of ' + needsSymbolication.length);

      var requestOpts = symbolicateOptions(projectId, error.error.id);

      return request(requestOpts).spread(function (res, body) {
        var result = JSON.parse(body);

        if (result.status !== 'ok') {
          console.log(result);
        }

        return symbolicate(projectId, i + 1);
      });
    }

    return symbolicate(project, 0);
  })
  .then(function resolve205Errors () {
    var errorType = 'TargetPhone';
    var tag = 'salmat';
    var resolvedVersion = '3.0.4';

    resolveErrors(errorType, tag, resolvedVersion);
  })
  .then(function resolve304NSAttributedString () {
    var errorType = '_NSReadAttributedStringFromURLOrData';
    var tag = 'threading';
    var resolvedVersion = '3.0.5';

    resolveErrors(errorType, tag, resolvedVersion);
  })
  .catch(function (e) {
    console.log(e);
  });