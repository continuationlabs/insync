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


internals._parallel = function(eachfn, tasks, callback) {

    callback = callback || Common.noop;

    if (Array.isArray(tasks)) {
        eachfn.map(tasks, function (fn, callback) {

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

        eachfn.each(Object.keys(tasks), function (k, callback) {

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


module.exports.parallel = function (tasks, callback) {

    internals._parallel({
        map: Collection.map,
        each: Collection.each
    }, tasks, callback);
};


module.exports.parallelLimit = function(tasks, limit, callback) {

    internals._parallel({
        map: Collection._mapLimit(limit),
        each: Collection._eachLimit(limit)
    }, tasks, callback);
};


module.exports.whilst = function (test, iterator, callback) {

    if (test()) {
        iterator(function (err) {

            if (err) {
                return callback(err);
            }

            module.exports.whilst(test, iterator, callback);
        });
    }
    else {
        callback();
    }
};


module.exports.doWhilst = function (iterator, test, callback) {

    iterator(function (err) {
        if (err) {
            return callback(err);
        }

        var args = Array.prototype.slice.call(arguments, 1);

        if (test.apply(null, args)) {
            module.exports.doWhilst(iterator, test, callback);
        }
        else {
            callback();
        }
    });
};


module.exports.until = function (test, iterator, callback) {

    if (!test()) {
        iterator(function (err) {

            if (err) {
                return callback(err);
            }

            module.exports.until(test, iterator, callback);
        });
    }
    else {
        callback();
    }
};


module.exports.doUntil = function (iterator, test, callback) {

    iterator(function (err) {

        if (err) {
            return callback(err);
        }

        var args = Array.prototype.slice.call(arguments, 1);

        if (!test.apply(null, args)) {
            async.doUntil(iterator, test, callback);
        }
        else {
            callback();
        }
    });
};


module.exports.forever = function (fn, callback) {

    var next = function (err) {

        if (err) {
            if (callback) {
                return callback(err);
            }

            throw err;
        }

        fn(next);
    };

    next();
};


module.exports.waterfall = function (tasks, callback) {

    callback = callback || Common.noop;

    if (!Array.isArray(tasks)) {
      var err = new Error('First argument to waterfall must be an array of functions');

      return callback(err);
    }

    if (!tasks.length) {
        return callback();
    }

    var wrapIterator = function (iterator) {

        return function (err) {

            if (err) {
                callback.apply(null, arguments);
                callback = Common.noop;
            }
            else {
                var args = Array.prototype.slice.call(arguments, 1);
                var next = iterator.next();

                if (next) {
                    args.push(wrapIterator(next));
                }
                else {
                    args.push(callback);
                }

                setImmediate(function () {

                    iterator.apply(null, args);
                });
            }
        };
    };

    wrapIterator(module.exports.iterator(tasks))();
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


module.exports.iterator = function (tasks) {

    var makeCallback = function (index) {

        var fn = function () {

            if (tasks.length) {
                tasks[index].apply(null, arguments);
            }

            return fn.next();
        };

        fn.next = function () {

            return (index < tasks.length - 1) ? makeCallback(index + 1) : null;
        };

        return fn;
    };

    return makeCallback(0);
};


module.exports.apply = function (fn) {

    var args = Array.prototype.slice.call(arguments, 1);

    return function () {

        return fn.apply(null, args.concat(Array.prototype.slice.call(arguments)));
    };
};


module.exports.times = function (count, iterator, callback) {

    var counter = [];

    for (var i = 0; i < count; ++i) {
        counter.push(i);
    }

    return Collection.map(counter, iterator, callback);
};


module.exports.timesSeries = function (count, iterator, callback) {

    var counter = [];

    for (var i = 0; i < count; ++i) {
        counter.push(i);
    }

    return Collection.mapSeries(counter, iterator, callback);
};
