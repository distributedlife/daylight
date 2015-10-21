'use strict';

var Promise = require('bluebird');
var request = Promise.promisify(require('request'));
var each = require('lodash').each;
var select = require('lodash').select;
var contains = require('lodash').contains;
var moment = require('moment');

var rules = require('./rules.json');

var getErrorOptions = require('./request-opts').getErrorOptions;
var updateErrorRequest = require('./request-opts').updateErrorRequest;

var logError = require('./workflow').logError;

var project = process.env.MINT_PROJECT;

function getError (id) {
  console.log('Getting (', id, ')');

  var requestOpts = getErrorOptions(project, id);
  return request(requestOpts).spread(function (response, body) {
    return JSON.parse(body);
  });
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

    console.log(putOptions);

    console.log(rule.status, e.error.id);

    promises.push(request(putOptions, function(err, response) {
      return JSON.parse(response.body);
    }));
  });

  return Promise.settle(promises);
}

function resolveRequireError (rule, error) {
  var code = require('./' + rule.require);

  var toResolve = select([error], function(error) {
    return code(error);
  });

  return resolveErrorsWithRule (rule.require, toResolve, rule);
}

function resolveMatcherError (rule, error) {
  var toResolve = select([error], function(error) {
    return select(error.stacktrace, function (string) {
      return contains(string, rule.matcher);
    }).length > 0;
  });

  return resolveErrorsWithRule (rule.matcher, toResolve, rule);
}

function runResolverRules (error) {
  var matcherRules = select(rules, 'matcher');
  var requireRules = select(rules, 'require');

  each(matcherRules, function (rule) { resolveMatcherError(rule, error); });
  each(requireRules, function (rule) { resolveRequireError(rule, error); });
}

function printError (error) {
  console.log(error);
  return error;
}

function done () {
  console.log('done');
}

getError(4313948122)
  .then(printError)
  .then(runResolverRules)
  .then(done)
  .catch(logError);