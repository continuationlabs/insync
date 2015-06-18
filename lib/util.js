'use strict';

// Load modules


// Declare internals

var internals = {};


internals.consoleFn = function (name) {

    return function (fn, ...args) {

        fn.apply(null, args.concat([function (err, ...args) {

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


module.exports.noop = function noop () {};


module.exports.onlyOnce = function (fn) {

    var called = false;

    return function (...args) {

        if (called) {
            throw new Error('Callback was already called.');
        }

        called = true;
        fn.apply(global, args);
    };
};


module.exports.ensureAsync = function (fn) {

    return function (...args) {

        var callback = args.pop();

        if (typeof callback !== 'function') {
            throw new TypeError('Last argument must be a function.');
        }

        var sync = true;

        args.push(function (...innerArgs) {

            if (sync) {
                setImmediate(function () {

                    callback.apply(null, innerArgs);
                });
            }
            else {
                callback.apply(null, innerArgs);
            }
        });

        fn.apply(this, args);
        sync = false;
    };
};


module.exports.isArrayLike = function (arr) {

    return Array.isArray(arr) || (typeof arr === 'object' &&
                                  arr !== null &&
                                  arr.length >= 0 &&
                                  arr.length >>> 0 === arr.length);
};


module.exports.memoize = function (fn, hasher) {

    hasher = hasher || function (item) {

        return item;
    };

    var memo = {};
    var queues = {};

    var memoized = function (...args) {

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
            fn.apply(null, args.concat([function (...args) {

                memo[key] = args;
                var q = queues[key];
                delete queues[key];

                for (var i = 0, l = q.length; i < l; i++) {
                    q[i].apply(null, args);
                }
            }]));
        }
    };

    memoized.memo = memo;
    memoized.unmemoized = fn;

    return memoized;
};


module.exports.unmemoize = function (fn) {

    return function (...args) {

        return (fn.unmemoized || fn).apply(null, args);
    };
};


module.exports.log = internals.consoleFn('log');


module.exports.dir = internals.consoleFn('dir');
