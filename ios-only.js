'use strict';

var select = require('lodash').select;
var contains = require('lodash').contains;

function iOSOnlyBug (error) {
  var us = select(error.stacktrace, function(row) {
    return contains(row, 'TargetApp');
  });

  return (us.length === 0);
}

module.exports = iOSOnlyBug;