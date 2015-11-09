'use strict';

var flatten = require('lodash').flatten;
var pluck = require('lodash').pluck;
var map = require('lodash').map;
var unique = require('lodash').unique;
var select = require('lodash').select;
var contains = require('lodash').contains;
var reduce = require('lodash').reduce;
var first = require('lodash').first;
var sortBy = require('lodash').sortBy;

var logError = require('./workflow').logError;
var flattenErrors = require('./workflow').flattenErrors;
var getAllTheErrors = require('./workflow').getAllTheErrors;
var rules = require('./rules.json');

function printTags (errors) {
  var tagSet = unique(flatten(pluck(errors, 'tags')));

  var grandTotal = 0;

  var tally = map(tagSet, function countInstances(tag) {
    var counts = pluck(select(errors, function (error) {
      return contains(error.tags, tag);
    }), 'counter');

    var total = reduce(counts, function (total, n) {
      return total + n;
    });

    grandTotal += total;

    var rule = first(select(rules, function(rule) {
      return contains(rule.tags, tag);
    }));
    var status = rule ? rule.status : 'open';

    return { tag: tag, total: total, status: status };
  });

  var sorted = sortBy(tally, 'total').reverse();
  console.log(sorted);

  console.log('Grand Total', grandTotal);
}

getAllTheErrors()
  .then(flattenErrors)
  .then(printTags)
  .catch(logError);