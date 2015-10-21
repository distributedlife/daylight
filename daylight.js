'use strict';

var Promise = require('bluebird');
var request = Promise.promisify(require('request'));
var flatten = require('lodash').flatten;
var each = require('lodash').each;
var select = require('lodash').select;
var contains = require('lodash').contains;
var moment = require('moment');

var rules = require('./rules.json');
var listErrorsOptions = require('./request-opts').listErrorsOptions;
var getErrorOptions = require('./request-opts').getErrorOptions;
var updateErrorRequest = require('./request-opts').updateErrorRequest;

var project = process.env.MINT_PROJECT;

var errors = [];
var expandedErrors = [];

function morePages (currentPageData) {
  return (currentPageData.page < currentPageData.pages);
}

function getPageOfErrorData (page) {
  var requestOpts = listErrorsOptions(project, page, {status: 'open'});

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

  function expand (project, i, parallel) {
    var error = errors[i];

    console.log('expanding:', (i + 1), 'of', errors.length, '(', error.id, ')');

    var requestOpts = getErrorOptions(project, error.id);
    return request(requestOpts).spread(function (response, body) {
      expandedErrors.push(JSON.parse(body));

      return expand(project, i + parallel, parallel);
    });
  }

  var parallel = 10;
  for (var i = 0; i < parallel; i += 1) {
    promises.push(expand(project, i, parallel));
  }

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