'use strict';

var each = require('lodash').each;
var cookie = require('./cookie.json').cookie;

function listErrorsOptions (projectId, page, opts) {
  var qs = '&page=' + page;
  if (opts) {
    each(opts, function(value, key) {
      qs += '&' + key + '=' + value;
    });
  }

  return {
    url: 'https://mint.splunk.com/api/v1/project/' + projectId + '/errors.json?days=90' + qs,
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
      'cookie': cookie,
      'content-type':'application/json',
      'x-csrftoken': 'd3e52dff199b665daf3526cc97a90d6eeb13769040b91a32333790fcddde1a19'
    },
    body: JSON.stringify(error)
  };
}

module.exports = {
  listErrorsOptions: listErrorsOptions,
  getErrorOptions: getErrorOptions,
  updateErrorRequest: updateErrorRequest
};