// Load modules

var Collection = require('./collection');
var Common = require('./common');


// Declare internals

var internals = {};


internals._applyEach = function (eachfn, fns /*args...*/) {

    var go = function () {

        var self = this;
        var args = Array.prototype.slice.call(arguments);
        var callback = args.pop();

        return eachfn(fns, function (fn, cb) {

            fn.apply(self, args.concat([cb]));
        }, callback);
    };

    if (arguments.length > 2) {
        var args = Array.prototype.slice.call(arguments, 2);

        return go.apply(this, args);
    }
    else {
        return go;
    }
};


module.exports.series = function (tasks, callback) {

    callback = callback || Common.noop;

    if (Array.isArray(tasks)) {
        Collection.mapSeries(tasks, function (fn, callback) {

            if (fn) {
                fn(function (err) {

                    var args = Array.prototype.slice.call(arguments, 1);

                    if (args.length <= 1) {
                        args = args[0];
                    }

                    callback.call(null, err, args);
                });
            }
        }, callback);
    }
    else {
        var results = {};

        Collection.eachSeries(Object.keys(tasks), function (k, callback) {

            tasks[k](function (err) {

                var args = Array.prototype.slice.call(arguments, 1);

                if (args.length <= 1) {
                    args = args[0];
                }

                results[k] = args;
                callback(err);
            });
        }, function (err) {

            callback(err, results);
        });
    }
};


module.exports.compose = function (/* functions... */) {

  return module.exports.seq.apply(null, Array.prototype.reverse.call(arguments));
};


module.exports.seq = function (/* functions... */) {

    var fns = arguments;

    return function () {

        var self = this;
        var args = Array.prototype.slice.call(arguments);
        var callback = args.pop();

        Collection.reduce(fns, args, function (newargs, fn, cb) {

            fn.apply(self, newargs.concat([function () {

                var err = arguments[0];
                var nextargs = Array.prototype.slice.call(arguments, 1);

                cb(err, nextargs);
            }]));
        }, function (err, results) {

            callback.apply(self, [err].concat(results));
        });
    };
};
