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
      'x-csrftoken': 'b1820cf755eb53550e5bfca8879575d6c8992f3030107055c0b01d79fcdf214b'
    },
    body: JSON.stringify(error)
  };
}

module.exports = {
  listErrorsOptions: listErrorsOptions,
  getErrorOptions: getErrorOptions,
  updateErrorRequest: updateErrorRequest
};