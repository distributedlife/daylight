'use strict';

var select = require('lodash').select;

var notSymbolicatedString = /^(TargetAppKit|TargetApp)\s0x[0-9a-f]+\s0x[0-9a-f]+\s\+\s[0-9]+$/m;

function noSymbols304 (error) {
  //jshint camelcase:false
  if (!error.app_versions['3.0.4']) {
    return false;
  }

  var needsSymbolication = select(error.stacktrace, function (string) {
    return notSymbolicatedString.test(string);
  }).length > 0;

  if (!needsSymbolication) {
    return false;
  }

  return true;
}

module.exports = noSymbols304;