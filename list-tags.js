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
var cookie = require('./cookie.json').cookie;

var project = process.env.MINT_PROJECT;

function listErrorsOptions (projectId, page) {
  return {
    url: 'https://mint.splunk.com/api/v1/project/' + projectId + '/errors.json?days=90&page=' + page,
    headers: {
      'x-splunk-mint-apikey': process.env.MINT_API_KEY,
      'x-splunk-mint-auth-token': process.env.MINT_AUTH_TOKEN,
      'cookie': cookie
    }
  };
}

var errors = [];

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

function printTags () {
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

function flattenErrors () {
  errors = flatten(errors);
}

function logError (e) {
  console.error(e);
}

getAllTheErrors()
  .then(flattenErrors)
  .then(printTags)
  .catch(logError);