'use strict';

// Load modules


// Declare internals

var internals = {};


internals.consoleFn = function (name) {

    return function (fn) {

        var args = Array.prototype.slice.call(arguments, 1);

        fn.apply(null, args.concat([function (err) {

            var args = Array.prototype.slice.call(arguments, 1);

            if (err) {
                return console.error(err);
            }

            var consoleFn = console[name];

            if (typeof consoleFn === 'function') {
                args.forEach(function (item) {

                    consoleFn(item);
                });
            }
        }]));
    };
};


module.exports.memoize = function (fn, hasher) {

    hasher = hasher || function (item) {

        return item;
    };

    var memo = {};
    var queues = {};

    var memoized = function () {

        var args = Array.prototype.slice.call(arguments);
        var callback = args.pop();
        var key = hasher.apply(null, args);

        if (key in memo) {
            process.nextTick(function () {

                callback.apply(null, memo[key]);
            });
        }
        else if (key in queues) {
            queues[key].push(callback);
        }
        else {
            queues[key] = [callback];
            fn.apply(null, args.concat([function () {

                memo[key] = arguments;
                var q = queues[key];
                delete queues[key];

                for (var i = 0, l = q.length; i < l; i++) {
                  q[i].apply(null, arguments);
                }
            }]));
        }
    };

    memoized.memo = memo;
    memoized.unmemoized = fn;

    return memoized;
};


module.exports.unmemoize = function (fn) {

  return function () {

    return (fn.unmemoized || fn).apply(null, arguments);
  };
};


module.exports.log = internals.consoleFn('log');


module.exports.dir = internals.consoleFn('dir');


module.exports.noConflict = function () {

    // This function is more useful in a browser
    return require('../');
};
