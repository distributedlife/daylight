'use strict';

var each = require('lodash').each;
var map = require('lodash').map;
var unique = require('lodash').unique;
var pluck = require('lodash').pluck;
var moment = require('moment');

var logError = require('./workflow').logError;
var flattenErrors = require('./workflow').flattenErrors;
var getAllTheErrors = require('./workflow').getAllTheErrors;

function simplifyErrors (errors) {
  return map(errors, function (error) {
    return {
      tag: error.tags[0],
      counter: error.counter,
      created: moment(error.created).format('YYYY-MM-DD')
    };
  });
}

function groupByDate (errors) {
  var grouped = {};
  each(errors, function (error) {
    var date = grouped[error.created] || {};
    date[error.tag] = date[error.tag] || 0;
    date[error.tag] += error.counter;

    grouped[error.created] = date;
  });

  var tags = unique(pluck(errors, 'tag'));

  console.log(grouped);
  var header = 'date' + '\t';
  each(tags, function (tag) {
    header += tag + '\t';
  });
  console.log(header);

  each(grouped, function (values, date) {
    var string = date + '\t';

    each(tags, function (tag) {
      var count = values[tag] || 0;
      string += count + '\t';
    });

    console.log(string);
  });
}

getAllTheErrors()
  .then(flattenErrors)
  .then(simplifyErrors)
  .then(groupByDate)
  .catch(logError);