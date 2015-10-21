'use strict';

var Promise = require('bluebird');
var request = Promise.promisify(require('request'));
var flatten = require('lodash').flatten;
var pluck = require('lodash').pluck;
var each = require('lodash').each;
var unique = require('lodash').unique;
var select = require('lodash').select;
var contains = require('lodash').contains;
var reduce = require('lodash').reduce;

var project = process.env.MINT_PROJECT;

var listErrorsOptions = require('./request-opts').listErrorsOptions;
var logError = require('./workflow').logError;
var flattenErrors = require('./workflow').flattenErrors;

function morePages (currentPageData) {
  return (currentPageData.page < currentPageData.pages);
}

function getPageOfErrorData (page, errors) {
  var requestOpts = listErrorsOptions(project, page);

  console.log('Getting error page: ' + page);

  return request(requestOpts)
    .spread(function (response, body) {
      var currentPageData = JSON.parse(body);

      errors.push(currentPageData.data);

      if (morePages(currentPageData)) {
        return getPageOfErrorData(page + 1, errors);
      } else {
        return errors;
      }
    });
}

function getAllTheErrors () {
  var errors = [];

  return getPageOfErrorData(1, errors);
}

function printTags (errors) {
  var tagSet = unique(flatten(pluck(errors, 'tags')));

  var grandTotal = 0;

  each(tagSet, function countInstances(tag) {
    var counts = pluck(select(errors, function (error) {
      return contains(error.tags, tag);
    }), 'counter');

    var total = reduce(counts, function (total, n) {
      return total + n;
    });

    grandTotal += total;

    console.log(tag, total);
  });

  console.log('Grand Total', grandTotal);
}

getAllTheErrors()
  .then(flattenErrors)
  .then(printTags)
  .catch(logError);