'use strict';

var select = require('lodash').select;
var reject = require('lodash').reject;
var contains = require('lodash').contains;

var redHerrings = [
  'TargetApp main (in TargetApp) (AppDelegate.swift:6)'
];

var notSymbolicatedString = /^(TargetAppKit|TargetApp)\s0x[0-9a-f]+\s0x[0-9a-f]+\s\+\s[0-9]+$/m;

function needsALook (error) {
  if (!contains(error.error.tags, 'log')) {
    return false;
  }

  var us = select(error.stacktrace, function (string) {
    return contains(string, 'TargetApp');
  });
  if (us.length === 0) {
    return false;
  }

  var symbolicated = reject(us, function (string) {
    return notSymbolicatedString.test(string);
  });
  if(symbolicated.length === 0) {
    return false;
  }

  var afterIgnoringRedHerrings = reject(symbolicated, function (string) {
    return contains(redHerrings, string);
  });
  if(afterIgnoringRedHerrings.length === 0) {
    return false;
  }

  console.log('\n');
  console.log('\n');
  console.log(error.error.id);
  console.log(afterIgnoringRedHerrings);

  return false;
}

module.exports = needsALook;