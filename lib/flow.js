'use strict';

// Load modules

var Collection = require('./collection');
var Util = require('./util');


// Declare internals

var internals = {
    DEFAULT_RETRIES: 5,
    DEFAULT_INTERVAL: 0
};


internals._applyEach = function (eachfn, fns, ...args) {

    var go = function (...args) {

        var self = this;
        var callback = args.pop();

        return eachfn(fns, function (fn, cb) {

            fn.apply(self, args.concat([cb]));
        }, callback);
    };

    if (args.length > 0) {
        return go.apply(this, args);
    }

    return go;
};


internals._parallel = function (eachfn, tasks, callback) {

    callback = callback || Util.noop;

    if (Array.isArray(tasks)) {
        eachfn.map(tasks, function (fn, callback) {

            fn(function (err, ...args) {

                if (args.length <= 1) {
                    args = args[0];
                }

                callback.call(null, err, args);
            });
        }, callback);
    }
    else {
        var results = {};

        eachfn.each(Object.keys(tasks), function (k, callback) {

            tasks[k](function (err, ...args) {

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

    callback = callback || Util.noop;

    if (Array.isArray(tasks)) {
        Collection.mapSeries(tasks, function (fn, callback) {

            fn(function (err, ...args) {

                if (args.length <= 1) {
                    args = args[0];
                }

                callback.call(null, err, args);
            });
        }, callback);
    }
    else {
        var results = {};

        Collection.eachSeries(Object.keys(tasks), function (k, callback) {

            tasks[k](function (err, ...args) {

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


module.exports.parallelLimit = function (tasks, limit, callback) {

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

    iterator(function (err, ...args) {

        if (err) {
            return callback(err);
        }

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

    iterator(function (err, ...args) {

        if (err) {
            return callback(err);
        }

        if (!test.apply(null, args)) {
            module.exports.doUntil(iterator, test, callback);
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

    callback = callback || Util.noop;

    if (!Array.isArray(tasks)) {
        var err = new Error('First argument to waterfall must be an array of functions');

        return callback(err);
    }

    if (!tasks.length) {
        return callback();
    }

    var called = false;
    var size = tasks.length;
    var args = [];

    var iterate = function (completed) {

        var func = tasks[completed];

        var done = function (err) {

            if (called) {
                throw new Error('Callback was already called');
            }

            called = true;

            if (err) {
                return callback(err);
            }

            ++completed;
            if (completed === size) {
                return callback.apply(null, arguments);
            }

            var l = arguments.length;
            args = Array(l > 1 ? l - 1 : 0);

            for (var i = 1; i < l; ++i) {
                args[i - 1] = arguments[i];
            }

            iterate(completed);
        };

        called = false;
        args.push(done);
        func.apply(null, args);
    };

    iterate(0);
};


module.exports.compose = function (...args) {

    return module.exports.seq.apply(null, Array.prototype.reverse.call(args));
};


module.exports.seq = function (...fns) {

    return function (...args) {

        var self = this;
        var callback = args.pop();

        Collection.reduce(fns, args, function (newargs, fn, cb) {

            fn.apply(self, newargs.concat([function (err, ...nextargs) {

                cb(err, nextargs);
            }]));
        }, function (err, results) {

            callback.apply(self, [err].concat(results));
        });
    };
};


module.exports.applyEach = Collection.doParallel(internals._applyEach);


module.exports.applyEachSeries = Collection.doSeries(internals._applyEach);


internals._queue = function (worker, concurrency, payload) {

    if (concurrency === undefined) {
        concurrency = 1;
    }
    else if (concurrency < 1 || concurrency >>> 0 !== concurrency) {
        throw new RangeError('Concurrency must be a positive integer');
    }

    var _insert = function (q, data, pos, callback) {

        if (callback !== undefined && typeof callback !== 'function') {
            throw new TypeError('Callback must be a function');
        }

        q.started = true;

        if (!Array.isArray(data)) {
            data = [data];
        }

        if (data.length === 0 && q.idle()) {
            // Call drain immediately if there are no tasks
            return setImmediate(q.drain);
        }

        for (var i = 0, il = data.length; i < il; ++i) {
            var item = {
                data: data[i],
                callback: typeof callback === 'function' ? callback : Util.noop
            };

            if (pos) {
                q.tasks.unshift(item);
            } else {
                q.tasks.push(item);
            }

            if (q.tasks.length === q.concurrency) {
                q.saturated();
            }
        }

        setImmediate(q.process);
    };

    var next = function (q, tasks) {

        return function (...args) {

            workers--;

            for (var i = 0, il = tasks.length; i < il; ++i) {
                var task = tasks[i];
                task.callback.apply(task, args);
            }

            if (q.tasks.length + workers === 0) {
                q.drain();
            }

            q.process();
        };
    };

    var workers = 0;
    var q = {
        tasks: [],
        concurrency: concurrency,
        saturated: Util.noop,
        empty: Util.noop,
        drain: Util.noop,
        started: false,
        paused: false,
        push: function (data, callback) {

            _insert(q, data, false, callback);
        },
        kill: function () {

            q.drain = Util.noop;
            q.tasks = [];
        },
        unshift: function (data, callback) {

            _insert(q, data, true, callback);
        },
        process: function () {

            while (!q.paused && workers < q.concurrency && q.tasks.length) {
                var tasks = payload ? q.tasks.splice(0, payload) : q.tasks.splice(0, q.tasks.length);
                var length = tasks.length;
                var data = new Array(length);

                for (var i = 0; i < length; ++i) {
                    data[i] = tasks[i].data;
                }

                if (q.tasks.length === 0) {
                    q.empty();
                }

                var cb = Util.onlyOnce(next(q, tasks));
                workers++;
                worker(data, cb);
            }
        },
        length: function () {

            return q.tasks.length;
        },
        running: function () {

            return workers;
        },
        idle: function () {

            return q.tasks.length + workers === 0;
        },
        pause: function () {

            q.paused = true;
        },
        resume: function () {

            if (q.paused === false) {
                return;
            }

            q.paused = false;
            // Need to call q.process once per concurrent
            // worker to preserve full concurrency after pause
            var resumeCount = Math.min(q.concurrency, q.tasks.length);

            for (var w = 1; w <= resumeCount; ++w) {
                setImmediate(q.process);
            }
        }
    };

    return q;
};


module.exports.queue = function (worker, concurrency) {

    return internals._queue(function (items, cb) {

        worker(items[0], cb);
    }, concurrency, 1);
};


module.exports.priorityQueue = function (worker, concurrency) {

    var _compareTasks = function (a, b) {

        return a.priority - b.priority;
    };

    var _binarySearch = function (sequence, item, compare) {

        var beg = -1;
        var end = sequence.length - 1;

        while (beg < end) {
            var mid = beg + ((end - beg + 1) >>> 1);

            if (compare(item, sequence[mid]) >= 0) {
                beg = mid;
            }
            else {
                end = mid - 1;
            }
        }

        return beg;
    };

    var _insert = function (q, data, priority, callback) {

        if (callback !== undefined && typeof callback !== 'function') {
            throw new TypeError('Callback must be a function');
        }

        q.started = true;

        if (!Array.isArray(data)) {
            data = [data];
        }

        if (data.length === 0) {
            // Call drain immediately if there are no tasks
            return setImmediate(q.drain);
        }

        data.forEach(function (task) {

            var item = {
                data: task,
                priority: priority,
                callback: typeof callback === 'function' ? callback : Util.noop
            };

            q.tasks.splice(_binarySearch(q.tasks, item, _compareTasks) + 1, 0, item);

            if (q.tasks.length === q.concurrency) {
                q.saturated();
            }

            setImmediate(q.process);
        });
    };

    // Start with a normal queue
    var q = module.exports.queue(worker, concurrency);

    // Override push to accept second parameter representing priority
    q.push = function (data, priority, callback) {

        _insert(q, data, priority, callback);
    };

    // Remove unshift function
    delete q.unshift;

    return q;
};


module.exports.cargo = function (worker, payload) {

    return internals._queue(worker, 1, payload);
};


module.exports.auto = function (tasks, callback) {

    callback = callback || Util.noop;

    var keys = Object.keys(tasks);
    var remainingTasks = keys.length;

    if (!remainingTasks) {
        return callback();
    }

    var results = {};
    var listeners = [];

    var addListener = function (fn) {

        listeners.unshift(fn);
    };

    var removeListener = function (fn) {

        var index = listeners.indexOf(fn);
        listeners.splice(index, 1);
    };

    var taskComplete = function () {

        remainingTasks--;
        listeners.slice(0).forEach(function (fn) {

            fn();
        });
    };

    addListener(function () {

        if (!remainingTasks) {

            var theCallback = callback;

            // Prevent final callback from calling itself if it errors
            callback = Util.noop;
            theCallback(null, results);
        }
    });

    keys.forEach(function (k) {

        var task = Array.isArray(tasks[k]) ? tasks[k] : [tasks[k]];

        var taskCallback = function (err, ...args) {

            if (args.length <= 1) {
                args = args[0];
            }

            if (err) {
                var safeResults = {};
                var keys = Object.keys(results);

                for (var i = 0, il = keys.length; i < il; ++i) {
                    var rkey = keys[i];

                    safeResults[rkey] = results[rkey];
                }

                safeResults[k] = args;
                callback(err, safeResults);
                // Stop subsequent errors hitting callback multiple times
                callback = Util.noop;
            }
            else {
                results[k] = args;
                setImmediate(taskComplete);
            }
        };

        var requires = task.slice(0, Math.abs(task.length - 1));

        // Prevent deadlocks
        var len = requires.length;

        while (len--) {
            var dep = tasks[requires[len]];

            if (!dep) {
                throw new Error('Has inexistant dependency');
            }

            if (Array.isArray(dep) && dep.indexOf(k) !== -1) {
                throw new Error('Has cyclic dependencies');
            }
        }

        var ready = function () {

            // Note: Originally this was ported with the
            // !results.hasOwnProperty(k) check first in the
            // return statement. However, coverage was never achieved
            // for this line as I have yet to see a case where this
            // was false. A test would be appreciated, otherwise this
            // return statement should be refactored.
            return requires.reduce(function (a, x) {

                return a && results.hasOwnProperty(x);
            }, true) && !results.hasOwnProperty(k);
        };

        if (ready()) {
            task[task.length - 1](taskCallback, results);
        }
        else {
            var listener = function () {

                if (ready()) {
                    removeListener(listener);
                    task[task.length - 1](taskCallback, results);
                }
            };

            addListener(listener);
        }
    });
};


module.exports.retry = function (times, task, callback) {

    var attempts = [];
    var interval;

    // Parse arguments
    if (typeof times === 'function') {
        // retry(task[, callback])
        callback = task;
        task = times;
        times = internals.DEFAULT_RETRIES;
        interval = internals.DEFAULT_INTERVAL;
    }
    else if (typeof times === 'number') {
        // retry(number, task[, callback])
        times = (times >>> 0) || internals.DEFAULT_RETRIES;
        interval = internals.DEFAULT_INTERVAL;
    }
    else if (times !== null && typeof times === 'object') {
        // retry(object, task[, callback])
        interval = typeof times.interval === 'number' ? times.interval : internals.DEFAULT_INTERVAL;
        times = (times.times >>> 0) || internals.DEFAULT_RETRIES;
    }
    else {
        throw TypeError('Retry expects number or object');
    }

    var wrappedTask = function (wrappedCallback, wrappedResults) {

        var retryAttempt = function (task, finalAttempt) {

            return function (seriesCallback) {

                task(function (err, result) {

                    seriesCallback(!err || finalAttempt, {
                        err: err,
                        result: result
                    });
                }, wrappedResults);
            };
        };

        var retryTimeout = function (seriesCallback) {

            setTimeout(seriesCallback, interval);
        };

        while (times) {
            var finalAttempt = --times === 0;
            attempts.push(retryAttempt(task, finalAttempt));

            if (!finalAttempt && interval > 0) {
                attempts.push(retryTimeout);
            }
        }

        module.exports.series(attempts, function (done, data) {

            data = data[data.length - 1];
            (wrappedCallback || callback)(data.err, data.result);
        });
    };

    // If a callback is passed, run this as a control flow
    return callback ? wrappedTask() : wrappedTask;
};


module.exports.iterator = function (tasks) {

    var makeCallback = function (index) {

        var fn = function (...args) {

            if (tasks.length) {
                tasks[index].apply(null, args);
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


module.exports.apply = function (fn, ...args) {

    return function (...innerArgs) {

        return fn.apply(null, args.concat(innerArgs));
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


module.exports.timesLimit = function (count, limit, iterator, callback) {

    var counter = [];

    for (var i = 0; i < count; ++i) {
        counter.push(i);
    }

    return Collection.mapLimit(counter, limit, iterator, callback);
};
