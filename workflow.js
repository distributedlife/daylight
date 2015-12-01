'use strict';

var Promise = require('bluebird');
var request = Promise.promisify(require('request'));
var flatten = require('lodash').flatten;

var listErrorsOptions = require('./request-opts').listErrorsOptions;
var getErrorOptions = require('./request-opts').getErrorOptions;

var project = process.env.MINT_PROJECT;

function flattenErrors (errors) {
  return flatten(errors);
}

function logError (e) {
  console.error(e);
}

function morePages (currentPageData) {
  return (currentPageData.page < currentPageData.pages);
}

function getPageOfErrorData (page, errors, options) {
  var requestOpts = listErrorsOptions(project, page, options);

  console.log('Getting error page: ' + page);

  return request(requestOpts)
    .spread(function (response, body) {
      if (response.statusCode !== 200) {
        console.error(response);
      }

      var currentPageData = JSON.parse(body);

      errors.push(currentPageData.data);

      if (morePages(currentPageData)) {
        return getPageOfErrorData(page + 1, errors, options);
      } else {
        return errors;
      }
    }).catch(function (e) {
      console.error(e);
      return getPageOfErrorData(page, errors, requestOpts);
    });
}

function getAllTheErrors () {
  var errors = [];

  return getPageOfErrorData(1, errors);
}

function getErrors (options) {
  var errors = [];

  return getPageOfErrorData(1, errors, options);
}

function expandErrors (errors) {
  console.log('expanding ' + errors.length + ' errors');

  function expand (error) {
    console.log('expanding (', error.id, ')');

    var requestOpts = getErrorOptions(project, error.id);
    return request(requestOpts).spread(function (response, body) {
      return JSON.parse(body);
    }).catch(function (e) {
      console.error(e);
      return expand(error);
    });
  }

  return Promise.map(errors, expand, {concurrency: 20});
}


module.exports = {
  flattenErrors: flattenErrors,
  logError: logError,
  getAllTheErrors: getAllTheErrors,
  getErrors: getErrors,
  expandErrors: expandErrors
};