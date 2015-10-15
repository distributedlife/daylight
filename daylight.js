'use strict';

var Promise = require('bluebird');
var request = Promise.promisify(require('request'));
var flatten = require('lodash').flatten;
var each = require('lodash').each;
var select = require('lodash').select;
var contains = require('lodash').contains;
var moment = require('moment');

var rules = require('./rules.json');
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

function resolveErrorsWithRule (name, errors, rule) {
  console.log('Resolving ' + errors.length + ' ' + name + ' errors');

  var promises = [];

  each(errors, function(e) {
    e.error.tags = rule.tags;
    e.error.status = rule.status;
    //jshint camelcase:false
    e.error.resolved_at = rule.resolvedVersion;
    e.error.resolved = moment().format('YYYY-MM-DDThh:mm:ss.ssss');

    var putOptions = updateErrorRequest(project, e.error);

    console.log(rule.status, e.error.id);

    promises.push(request(putOptions, function() {}));
  });

  return Promise.settle(promises);
}

function resolveRequireErrors (rule) {
  var code = require('./' + rule.require);

  var toResolve = select(expandedErrors, function(error) {
    return code(error);
  });

  return resolveErrorsWithRule (rule.require, toResolve, rule);
}

function resolveMatcherErrors (rule) {
  var toResolve = select(expandedErrors, function(error) {
    return select(error.stacktrace, function (string) {
      return contains(string, rule.matcher);
    }).length > 0;
  });

  return resolveErrorsWithRule (rule.matcher, toResolve, rule);
}

function runResolverRules () {
  var matcherRules = select(rules, 'matcher');
  var requireRules = select(rules, 'require');

  each(matcherRules, resolveMatcherErrors);
  each(requireRules, resolveRequireErrors);
}

function logError (e) {
  console.error(e);
}

getAllTheErrors()
  .then(flattenErrors)
  .then(expandErrors)
  .then(runResolverRules)
  .catch(logError);