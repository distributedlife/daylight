'use strict';

var flatten = require('lodash').flatten;
var pluck = require('lodash').pluck;
var each = require('lodash').each;
var unique = require('lodash').unique;
var select = require('lodash').select;
var contains = require('lodash').contains;
var reduce = require('lodash').reduce;

var logError = require('./workflow').logError;
var flattenErrors = require('./workflow').flattenErrors;
var getAllTheErrors = require('./workflow').getAllTheErrors;

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