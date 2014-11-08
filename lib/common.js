'use strict';

// Load modules


// Declare internals

var internals = {};


module.exports.noop = function noop() {};


module.exports.onlyOnce = function (fn) {

    var called = false;

    return function() {

        if (called) {
            throw new Error('Callback was already called.');
        }

        called = true;
        fn.apply(global, arguments);
    };
};
