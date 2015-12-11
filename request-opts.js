'use strict';

var each = require('lodash').each;
var cookie = require('./cookie.json').cookie;
var csrf = require('./csrf.json').csrf;

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
      'cookie': cookie
    }
  };
}

function listErrorInstancesOptions (projectId, errorId, page, opts) {
  var qs = 'first=' + page === 1 ? 'OK' : page;
  if (opts) {
    each(opts, function(value, key) {
      qs += '&' + key + '=' + value;
    });
  }

  return {
    url: 'https://mint.splunk.com/api/v1/project/' + projectId + '/errors/' + errorId + '/logs.json?' + qs,
    headers: {
      'cookie': cookie
    }
  };
}

function getErrorOptions (projectId, errorId) {
  return {
    url: 'https://mint.splunk.com/api/v1/project/' + projectId + '/errors/' + errorId + '.json',
    headers: {
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
      'x-csrftoken': csrf
    },
    body: JSON.stringify(error)
  };
}

module.exports = {
  listErrorsOptions: listErrorsOptions,
  listErrorInstancesOptions: listErrorInstancesOptions,
  getErrorOptions: getErrorOptions,
  updateErrorRequest: updateErrorRequest
};