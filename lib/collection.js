'use strict';

// Load modules

var Common = require('./common');


// Declare internals

var internals = {};


internals.doParallelLimit = function(limit, fn) {

    return function () {

        var args = Array.prototype.slice.call(arguments);

        return fn.apply(null, [internals._eachLimit(limit)].concat(args));
    };
};


internals._map = function (arr) {

    var result = [];

    for (var i = 0, il = arr.length; i < il; ++i) {
        result.push({
            index: i,
            value: arr[i]
        });
    }

    return result;
};


internals._unmap = function (arr) {

    var result = [];

    for (var i = 0, il = arr.length; i < il; ++i) {
        result.push(arr[i].value);
    }

    return result;
};


internals._asyncMap = function (eachfn, arr, iterator, callback) {

    arr = internals._map(arr);

    if (!callback) {
        eachfn(arr, function (item, callback) {

            iterator(item.value, function (err) {

                callback(err);
            });
        });
    }
    else {
        var results = [];

        eachfn(arr, function (item, callback) {

            iterator(item.value, function (err, value) {

                results[item.index] = value;
                callback(err);
            });
        }, function (err) {

            callback(err, results);
        });
    }
};


internals._filter = function (eachfn, arr, iterator, callback) {

    var results = [];

    arr = internals._map(arr);

    eachfn(arr, function (item, callback) {

        iterator(item.value, function (value) {

            if (value) {
                results.push(item);
            }

            callback();
        });
    }, function (err) {

        results.sort(function (a, b) {

            return a.index - b.index;
        });

        results = internals._unmap(results);
        callback(results);
    });
};


internals._reject = function (eachfn, arr, iterator, callback) {

    var results = [];

    arr = internals._map(arr);

    eachfn(arr, function (item, callback) {

        iterator(item.value, function (value) {

            if (!value) {
                results.push(item);
            }

            callback();
        });
    }, function (err) {

        results.sort(function (a, b) {

            return a.index - b.index;
        });

        results = internals._unmap(results);
        callback(results);
    });
};


internals._detect = function (eachfn, arr, iterator, callback) {

    eachfn(arr, function (item, cb) {

        iterator(item, function (result) {

            if (result) {
                callback(item);
                callback = Common.noop;
            }
            else {
                cb();
            }
        });
    }, function (err) {

        callback();
    });
};


internals._concat = function (eachfn, arr, fn, callback) {

    var r = [];

    eachfn(arr, function (x, cb) {

        fn(x, function (err, y) {

            r = r.concat(y || []);
            cb(err);
        });
    }, function (err) {

        callback(err, r);
    });
};


// Used in flow.js
module.exports.doSeries = internals.doSeries = function (fn) {

    return function () {

        var args = Array.prototype.slice.call(arguments);

        return fn.apply(null, [module.exports.eachSeries].concat(args));
    };
};


// Used in flow.js
module.exports.doParallel = internals.doParallel = function (fn) {

    return function () {

        var args = Array.prototype.slice.call(arguments);

        return fn.apply(null, [module.exports.each].concat(args));
    };
};


// Used in flow.js
module.exports._eachLimit = internals._eachLimit = function (limit) {

    return function (arr, iterator, callback) {

        callback = callback || Common.noop;

        if (!arr.length || limit <= 0) {
            return callback();
        }

        var completed = 0;
        var started = 0;
        var running = 0;

        (function replenish () {

            var iteratorCallback = function (err) {

                if (err) {
                    callback(err);
                    callback = Common.noop;
                }
                else {
                    completed++;
                    running--;

                    if (completed >= arr.length) {
                        callback();
                    }
                    else {
                        replenish();
                    }
                }
            };

            while (running < limit && started < arr.length) {
                started++;
                running++;

                iterator(arr[started - 1], iteratorCallback);
            }
        })();
    };
};


// Used in flow.js
module.exports._mapLimit = internals._mapLimit = function(limit) {

    return internals.doParallelLimit(limit, internals._asyncMap);
};


module.exports.each = function (arr, iterator, callback) {

    callback = callback || Common.noop;

    if (!arr.length) {
        return callback();
    }

    var completed = 0;

    var done = function (err) {

        if (err) {
            callback(err);
            callback = Common.noop;
        }
        else {
            ++completed;

            if (completed >= arr.length) {
                callback();
            }
        }
    };

    for (var i = 0, il = arr.length; i < il; ++i) {
        iterator(arr[i], Common.onlyOnce(done));
    }
};


module.exports.eachSeries = function (arr, iterator, callback) {

    callback = callback || Common.noop;

    if (!arr.length) {
        return callback();
    }

    var completed = 0;

    var iterate = function () {

        iterator(arr[completed], function (err) {

            if (err) {
                callback(err);
                callback = Common.noop;
            }
            else {
                completed++;

                if (completed >= arr.length) {
                    callback();
                }
                else {
                    iterate();
                }
            }
        });
    };

    iterate();
};


module.exports.eachLimit = function (arr, limit, iterator, callback) {

    var fn = internals._eachLimit(limit);

    fn.apply(null, [arr, iterator, callback]);
};


module.exports.map = internals.doParallel(internals._asyncMap);


module.exports.mapSeries = internals.doSeries(internals._asyncMap);


module.exports.mapLimit = function (arr, limit, iterator, callback) {

    return internals._mapLimit(limit)(arr, iterator, callback);
};


module.exports.filter = internals.doParallel(internals._filter);


module.exports.filterSeries = internals.doSeries(internals._filter);


module.exports.reject = internals.doParallel(internals._reject);


module.exports.rejectSeries = internals.doSeries(internals._reject);


// reduce() only has a series version.
// A parallel reduce() won't work in many situations.
module.exports.reduce = function (arr, memo, iterator, callback) {

    module.exports.eachSeries(arr, function (item, callback) {

        iterator(memo, item, function (err, value) {

            memo = value;
            callback(err);
        });
    }, function (err) {

        callback(err, memo);
    });
};


module.exports.reduceRight = function (arr, memo, iterator, callback) {

    var reversed = [];

    for (var i = arr.length - 1; i >= 0; --i) {
        reversed.push(arr[i]);
    }

    module.exports.reduce(reversed, memo, iterator, callback);
};


module.exports.detect = internals.doParallel(internals._detect);


module.exports.detectSeries = internals.doSeries(internals._detect);


module.exports.sortBy = function (arr, iterator, callback) {

    module.exports.map(arr, function (item, callback) {

        iterator(item, function (err, criteria) {

            if (err) {
                callback(err);
            }
            else {
                callback(null, {
                    value: item,
                    criteria: criteria
                });
            }
        });
    }, function (err, results) {

        if (err) {
            return callback(err);
        }

        results.sort(function (left, right) {

            var a = left.criteria;
            var b = right.criteria;

            return a < b ? -1 : a > b ? 1 : 0;
        });

        results = internals._unmap(results);
        callback(null, results);
    });
};


module.exports.some = function (arr, iterator, callback) {

    module.exports.each(arr, function (item, cb) {

        iterator(item, function (value) {

            if (value) {
                callback(true);
                callback = Common.noop;
            }

            cb();
        });
    }, function (err) {

        callback(false);
    });
};


module.exports.every = function (arr, iterator, callback) {

    module.exports.each(arr, function (item, cb) {

        iterator(item, function (value) {

            if (!value) {
                callback(false);
                callback = Common.noop;
            }

            cb();
        });
    }, function (err) {

        callback(true);
    });
};


module.exports.concat = internals.doParallel(internals._concat);


module.exports.concatSeries = internals.doSeries(internals._concat);
