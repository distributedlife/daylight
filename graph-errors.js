'use strict';

var Promise = require('bluebird');
Promise.longStackTraces();
var each = require('lodash').each;
var map = require('lodash').map;
var unique = require('lodash').unique;
var flatten = require('lodash').flatten;
var pluck = require('lodash').pluck;
var moment = require('moment');

var logError = require('./workflow').logError;
var flattenErrors = require('./workflow').flattenErrors;
var getAllTheErrors = require('./workflow').getAllTheErrors;
var getPageOfErrorInstanceData = require('./workflow').getPageOfErrorInstanceData;

function getInstanceDataForError (error) {
  var instances = [];

  function mergeInstancesWithError (instances) {
    error.instances = flatten(unique(instances, 'id'));
    return error;
  }

  return getPageOfErrorInstanceData(error.id, 1, instances)
    .then(mergeInstancesWithError);
}

function getInstanceData (errors) {
  return Promise.map(errors, getInstanceDataForError, {concurrency: 50});
}

function simplifyErrors (errors) {
  return flatten(map(errors, function (error) {
    if (error.counter !== error.instances.length) {
      console.log(error);
      console.log(error.counter, error.instances.length);
    }

    return map(error.instances, function(instance) {
      return {
        counter: 1,
        tag: error.tags[0],
        created: moment(instance.created).format('YYYY-MM-DD')
      };
    });
  }));
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
  .then(getInstanceData)
  .then(simplifyErrors)
  .then(groupByDate)
  .catch(logError);