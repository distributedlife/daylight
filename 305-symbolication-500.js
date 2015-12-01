'use strict';

var Promise = require('bluebird');
var request = Promise.promisify(require('request'));
var select = require('lodash').select;
var cookie = require('./cookie.json').cookie;
var project = process.env.MINT_PROJECT;

function symbolicateOptions (projectId, errorId) {
  return {
    url: 'https://mint.splunk.com/project/' + projectId + '/errors/' + errorId + '/symbolicate',
    headers: {
      'cookie': cookie
    }
  };
}

var results = {};

function symbolicate (error) {
  var requestOpts = symbolicateOptions(project, error.error.id);

  return request(requestOpts).spread(function (res, body) {
    var result;
    try {
      result = JSON.parse(body);
      results[error.error.id] = false;
      return error;
    } catch (e) {
      results[error.error.id] = (e.message === 'Unexpected token A');
      return error;
    }
  }).catch(function (e) {
    console.error(e);
    return symbolicate(error);
  });
}

var notSymbolicatedString = /^(TargetAppKit|TargetApp)\s0x[0-9a-f]+\s0x[0-9a-f]+\s\+\s[0-9]+$/m;

function symbolication500with305 (error) {
  //jshint camelcase:false
  if (!error.app_versions['3.0.5']) {
    results[error.error.id] = false;
    return error;
  }

  var needsSymbolication = select(error.stacktrace, function (string) {
    return notSymbolicatedString.test(string);
  }).length > 0;

  if (!needsSymbolication) {
    results[error.error.id] = false;
    return error;
  }

  return symbolicate(error);
}

function check (error) {
  return results[error.error.id];
}

module.exports = {
  async: symbolication500with305,
  check: check
};