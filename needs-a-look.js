'use strict';

var select = require('lodash').select;
var reject = require('lodash').reject;
var contains = require('lodash').contains;
var first = require('lodash').first;
var map = require('lodash').map;
var uniq = require('lodash').uniq;

var notSymbolicatedString = /^(TargetAppKit|TargetApp)\s0x[0-9a-f]+\s0x[0-9a-f]+\s\+\s[0-9]+$/m;

var crypto = require('crypto');

function hash (string) {
  return crypto.createHash('sha1').update(string).digest('hex');
}

var hashes = [];

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

  console.log('\n');
  console.log('\n');
  console.log(error.error.id);
  console.log(error.stacktrace);

  var patternStackTrace = map(error.stacktrace, function (string) {
    if (notSymbolicatedString.test(string)) {
      return string;
    } else {
      return first(string.split(' '));
    }
  });
  console.log(hash(patternStackTrace.join('+')));

  hashes.push(hash(patternStackTrace.join('+')));
  console.log(uniq(hashes));

  return true;
}

module.exports = needsALook;