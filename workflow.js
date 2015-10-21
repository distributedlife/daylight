'use strict';

var flatten = require('lodash').flatten;

function flattenErrors (errors) {
  return flatten(errors);
}

function logError (e) {
  console.error(e);
}

module.exports = {
  flattenErrors: flattenErrors,
  logError: logError
};