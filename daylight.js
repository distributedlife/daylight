'use strict';

var Promise = require('bluebird');
var request = Promise.promisify(require('request'));
var each = require('lodash').each;
var select = require('lodash').select;
var contains = require('lodash').contains;
var moment = require('moment');

var rules = require('./rules.json');

var updateErrorRequest = require('./request-opts').updateErrorRequest;

var logError = require('./workflow').logError;
var flattenErrors = require('./workflow').flattenErrors;
var getErrors = require('./workflow').getErrors;
var expandErrors = require('./workflow').expandErrors;

var project = process.env.MINT_PROJECT;

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

function resolveRequireErrors (rule, errors) {
  var code = require('./' + rule.require);

  var toResolve = select(errors, function(error) {
    return code(error);
  });

  return resolveErrorsWithRule (rule.require, toResolve, rule);
}

function resolveMatcherErrors (rule, errors) {
  var toResolve = select(errors, function(error) {
    return select(error.stacktrace, function (string) {
      return contains(string, rule.matcher);
    }).length > 0;
  });

  return resolveErrorsWithRule (rule.matcher, toResolve, rule);
}

function resolveAsyncErrors (rule, errors) {
  var code = require('./' + rule.async);

  Promise.map(errors, code.async, {concurrency: 5}).then(function (errors) {
    var toResolve = select(errors, code.check);

    return resolveErrorsWithRule (rule.async, toResolve, rule);
  });
}

function runResolverRules (errors) {
  var matcherRules = select(rules, 'matcher');
  var requireRules = select(rules, 'require');
  var asyncRules = select(rules, 'async');

  each(matcherRules, function (rule) { resolveMatcherErrors(rule, errors); });
  each(requireRules, function (rule) { resolveRequireErrors(rule, errors); });
  each(asyncRules, function (rule) { resolveAsyncErrors(rule, errors); });
}

getErrors({status: 'open', tag: 'log'})
  .then(flattenErrors)
  .then(expandErrors)
  .then(runResolverRules)
  .catch(logError);