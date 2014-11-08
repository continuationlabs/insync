'use strict';

// Load modules

var Collection = require('./collection');
var Common = require('./common');


// Declare internals

var internals = {
    DEFAULT_RETRIES: 5
};


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

    return go;
};


internals._parallel = function(eachfn, tasks, callback) {

    callback = callback || Common.noop;

    if (Array.isArray(tasks)) {
        eachfn.map(tasks, function (fn, callback) {

            fn(function (err) {

                var args = Array.prototype.slice.call(arguments, 1);

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

            fn(function (err) {

                var args = Array.prototype.slice.call(arguments, 1);

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


module.exports.applyEach = Collection.doParallel(internals._applyEach);


module.exports.applyEachSeries = Collection.doSeries(internals._applyEach);


module.exports.queue = function (worker, concurrency) {

    if (concurrency === undefined) {
        concurrency = 1;
    }

    var _insert = function (q, data, pos, callback) {

        if (!q.started) {
            q.started = true;
        }

        if (!Array.isArray(data)) {
            data = [data];
        }

        if (data.length === 0) {
            // call drain immediately if there are no tasks
            return setImmediate(function() {

                if (q.drain) {
                    q.drain();
                }
            });
        }

        data.forEach(function (task) {

            var item = {
                data: task,
                callback: typeof callback === 'function' ? callback : null
            };

            if (pos) {
                q.tasks.unshift(item);
            } else {
                q.tasks.push(item);
            }

            if (q.saturated && q.tasks.length === q.concurrency) {
                q.saturated();
            }

            setImmediate(q.process);
        });
    };

    var workers = 0;
    var q = {
        tasks: [],
        concurrency: concurrency,
        saturated: null,
        empty: null,
        drain: null,
        started: false,
        paused: false,
        push: function (data, callback) {

            _insert(q, data, false, callback);
        },
        kill: function () {

            q.drain = null;
            q.tasks = [];
        },
        unshift: function (data, callback) {

            _insert(q, data, true, callback);
        },
        process: function () {

            if (!q.paused && workers < q.concurrency && q.tasks.length) {
                var task = q.tasks.shift();

                if (q.empty && q.tasks.length === 0) {
                    q.empty();
                }

                workers++;

                var next = function () {

                    workers--;

                    if (task.callback) {
                        task.callback.apply(task, arguments);
                    }

                    if (q.drain && q.tasks.length + workers === 0) {
                        q.drain();
                    }

                    q.process();
                };

                var cb = Common.onlyOnce(next);

                worker(task.data, cb);
            }
        },
        length: function () {

            return q.tasks.length;
        },
        running: function () {

            return workers;
        },
        idle: function() {

            return q.tasks.length + workers === 0;
        },
        pause: function () {

            if (q.paused === true) {
                return;
            }

            q.paused = true;
        },
        resume: function () {

            if (q.paused === false) {
                return;
            }

            q.paused = false;
            // Need to call q.process once per concurrent
            // worker to preserve full concurrency after pause
            for (var concur = q.concurrency, w = 1; w <= concur; ++w) {
                setImmediate(q.process);
            }
        }
    };

    return q;
};


module.exports.priorityQueue = function (worker, concurrency) {

    var _compareTasks = function (a, b){

        return a.priority - b.priority;
    };

    var _binarySearch = function (sequence, item, compare) {

        var beg = -1;
        var end = sequence.length - 1;

        while (beg < end) {
            var mid = beg + ((end - beg + 1) >>> 1);

            if (compare(item, sequence[mid]) >= 0) {
                beg = mid;
            } else {
                end = mid - 1;
            }
        }

        return beg;
    };

    var _insert = function (q, data, priority, callback) {

        if (!q.started) {
            q.started = true;
        }

        if (!Array.isArray(data)) {
            data = [data];
        }

        if (data.length === 0) {
            // Call drain immediately if there are no tasks
            return setImmediate(function () {

                if (q.drain) {
                    q.drain();
                }
            });
        }

        data.forEach(function(task) {

            var item = {
                data: task,
                priority: priority,
                callback: typeof callback === 'function' ? callback : null
            };

            q.tasks.splice(_binarySearch(q.tasks, item, _compareTasks) + 1, 0, item);

            if (q.saturated && q.tasks.length === q.concurrency) {
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

    var working = false;
    var tasks = [];

    var cargo = {
        tasks: tasks,
        payload: payload,
        saturated: null,
        empty: null,
        drain: null,
        drained: true,
        push: function (data, callback) {

            if (!Array.isArray(data)) {
                data = [data];
            }

            data.forEach(function(task) {

                tasks.push({
                    data: task,
                    callback: typeof callback === 'function' ? callback : null
                });
                cargo.drained = false;

                if (cargo.saturated && tasks.length === payload) {
                    cargo.saturated();
                }
            });

            setImmediate(cargo.process);
        },
        process: function process() {

            if (working) {
                return;
            }

            if (tasks.length === 0) {
                if (cargo.drain && !cargo.drained) {
                    cargo.drain();
                }

                cargo.drained = true;
                return;
            }

            var ts = typeof payload === 'number'
                        ? tasks.splice(0, payload)
                        : tasks.splice(0, tasks.length);

            var ds = ts.map(function (task) {

                return task.data;
            });

            if (cargo.empty) {
                cargo.empty();
            }

            working = true;

            worker(ds, function () {

                working = false;

                var args = arguments;

                ts.forEach(function (data) {

                    if (data.callback) {
                        data.callback.apply(null, args);
                    }
                });

                process();
            });
        },
        length: function () {

            return tasks.length;
        },
        running: function () {

            return working;
        }
    };

    return cargo;
};


module.exports.auto = function (tasks, callback) {

    callback = callback || Common.noop;

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
            callback = Common.noop;
            theCallback(null, results);
        }
    });

    keys.forEach(function (k) {

        var task = Array.isArray(tasks[k]) ? tasks[k] : [tasks[k]];

        var taskCallback = function (err) {

            var args = Array.prototype.slice.call(arguments, 1);

            if (args.length <= 1) {
                args = args[0];
            }

            if (err) {
                var safeResults = {};

                Object.keys(results).forEach(function (rkey) {

                    safeResults[rkey] = results[rkey];
                });

                safeResults[k] = args;
                callback(err, safeResults);
                // Stop subsequent errors hitting callback multiple times
                callback = Common.noop;
            }
            else {
                results[k] = args;
                setImmediate(taskComplete);
            }
        };

        var requires = task.slice(0, Math.abs(task.length - 1));

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


module.exports.retry = function(times, task, callback) {

    var attempts = [];
    // Use defaults if times not passed
    if (typeof times === 'function') {
        callback = task;
        task = times;
        times = internals.DEFAULT_RETRIES;
    }
    // Make sure times is a number
    times = parseInt(times, 10) || internals.DEFAULT_RETRIES;

    var wrappedTask = function(wrappedCallback, wrappedResults) {

        var retryAttempt = function(task, finalAttempt) {

            return function(seriesCallback) {

                task(function(err, result) {

                    seriesCallback(!err || finalAttempt, {
                        err: err,
                        result: result
                    });
                }, wrappedResults);
            };
        };

        while (times) {
            attempts.push(retryAttempt(task, !(times -= 1)));
        }

        module.exports.series(attempts, function(done, data) {
            data = data[data.length - 1];
            (wrappedCallback || callback)(data.err, data.result);
        });
    };

    // If a callback is passed, run this as a control flow
    return callback ? wrappedTask() : wrappedTask;
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
