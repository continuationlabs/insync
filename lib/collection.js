// Load modules

var Common = require('./common');


// Declare internals

var internals = {};


internals.doParallel = function (fn) {

    return function () {

        var args = Array.prototype.slice.call(arguments);

        return fn.apply(null, [module.exports.each].concat(args));
    };
};


internals.doParallelLimit = function(limit, fn) {

    return function () {

        var args = Array.prototype.slice.call(arguments);

        return fn.apply(null, [internals._eachLimit(limit)].concat(args));
    };
};


internals.doSeries = function (fn) {

    return function () {

        var args = Array.prototype.slice.call(arguments);

        return fn.apply(null, [module.exports.eachSeries].concat(args));
    };
};


internals._asyncMap = function (eachfn, arr, iterator, callback) {

    arr = arr.map(function (value, index) {

        return {
            index: index,
            value: value
        };
    });

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


internals._eachLimit = function (limit) {

    return function (arr, iterator, callback) {

        callback = callback || Common.noop;

        if (!arr.length || limit <= 0) {
            return callback();
        }

        var completed = 0;
        var started = 0;
        var running = 0;

        (function replenish () {

            if (completed >= arr.length) {
                return callback();
            }

            while (running < limit && started < arr.length) {
                started += 1;
                running += 1;

                iterator(arr[started - 1], function (err) {

                    if (err) {
                        callback(err);
                        callback = Common.noop;
                    }
                    else {
                        completed += 1;
                        running -= 1;

                        if (completed >= arr.length) {
                            callback();
                        }
                        else {
                            replenish();
                        }
                    }
                });
            }
        })();
    };
};


internals._mapLimit = function(limit) {

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
    }

    arr.forEach(function (item) {

        iterator(item, Common.onlyOnce(done));
    });
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
                completed += 1;

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
