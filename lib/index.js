// Load modules

var Collection = require('./collection');
var Flow = require('./flow');
var Util = require('./util');


// Declare internals

var internals = {};


module.exports = {

    // Exposed for consistency with async
    nextTick: process.nextTick,
    setImmediate: setImmediate,

    // Collections
    each: Collection.each,
    forEach: Collection.each,
    eachSeries: Collection.eachSeries,
    forEachSeries: Collection.eachSeries,
    eachLimit: Collection.eachLimit,
    forEachLimit: Collection.eachLimit,
    map: Collection.map,
    mapSeries: Collection.mapSeries,
    mapLimit: Collection.mapLimit,
    // filter: Collection.filter,
    // filterSeries: Collection.filterSeries,
    // reject: Collection.reject,
    // rejectSeries: Collection.rejectSeries,
    reduce: Collection.reduce,
    // reduceRight: Collection.reduceRight,
    // detect: Collection.detect,
    // detectSeries: Collection.detectSeries,
    // sortBy: Collection.sortBy,
    // some: Collection.some,
    // every: Collection.every,
    // concat: Collection.concat,
    // concatSeries: Collection.concatSeries,

    // Control flow
    series: Flow.series,
    // parallel: Flow.parallel,
    // parallelLimit: Flow.parallelLimit,
    // whilst: Flow.whilst,
    // doWhilst: Flow.doWhilst,
    // until: Flow.until,
    // doUntil: Flow.doUntil,
    // forever: Flow.forever,
    // waterfall: Flow.waterfall,
    compose: Flow.compose,
    seq: Flow.seq,
    // applyEach: Flow.applyEach,
    // applyEachSeries: Flow.applyEachSeries,
    // queue: Flow.queue,
    // priorityQueue: Flow.priorityQueue,
    // cargo: Flow.cargo,
    // auto: Flow.auto,
    // retry: Flow.retry,
    // iterator: Flow.iterator,
    // apply: Flow.apply,
    // times: Flow.times,
    // timesSeries: Flow.timesSeries,

    // Utils
    // memoize: Util.memoize,
    // unmemoize: Util.unmemoize,
    log: Util.log,
    dir: Util.dir,
    noConflict: Util.noConflict
};


/*
var async = {};


//// cross-browser compatiblity functions ////

var _each = function (arr, iterator) {
  return arr.forEach(iterator);
};

var _map = function (arr, iterator) {
  return arr.map(iterator);
};

var noop = function noop() {}

// inject alias
async.inject = async.reduce;
// foldl alias
async.foldl = async.reduce;

async.reduceRight = function (arr, memo, iterator, callback) {
    var reversed = arr.map(function (x) {
        return x;
    }).reverse();
    async.reduce(reversed, memo, iterator, callback);
};
// foldr alias
async.foldr = async.reduceRight;

var _filter = function (eachfn, arr, iterator, callback) {
    var results = [];
    arr = _map(arr, function (x, i) {
        return {index: i, value: x};
    });
    eachfn(arr, function (x, callback) {
        iterator(x.value, function (v) {
            if (v) {
                results.push(x);
            }
            callback();
        });
    }, function (err) {
        callback(_map(results.sort(function (a, b) {
            return a.index - b.index;
        }), function (x) {
            return x.value;
        }));
    });
};
async.filter = doParallel(_filter);
async.filterSeries = doSeries(_filter);
// select alias
async.select = async.filter;
async.selectSeries = async.filterSeries;

var _reject = function (eachfn, arr, iterator, callback) {
    var results = [];
    arr = arr.map(function (x, i) {
        return {index: i, value: x};
    });
    eachfn(arr, function (x, callback) {
        iterator(x.value, function (v) {
            if (!v) {
                results.push(x);
            }
            callback();
        });
    }, function (err) {
        callback(_map(results.sort(function (a, b) {
            return a.index - b.index;
        }), function (x) {
            return x.value;
        }));
    });
};
async.reject = doParallel(_reject);
async.rejectSeries = doSeries(_reject);

var _detect = function (eachfn, arr, iterator, main_callback) {
    eachfn(arr, function (x, callback) {
        iterator(x, function (result) {
            if (result) {
                main_callback(x);
                main_callback = noop;
            }
            else {
                callback();
            }
        });
    }, function (err) {
        main_callback();
    });
};
async.detect = doParallel(_detect);
async.detectSeries = doSeries(_detect);

async.some = function (arr, iterator, main_callback) {
    async.each(arr, function (x, callback) {
        iterator(x, function (v) {
            if (v) {
                main_callback(true);
                main_callback = noop;
            }
            callback();
        });
    }, function (err) {
        main_callback(false);
    });
};
// any alias
async.any = async.some;

async.every = function (arr, iterator, main_callback) {
    async.each(arr, function (x, callback) {
        iterator(x, function (v) {
            if (!v) {
                main_callback(false);
                main_callback = noop;
            }
            callback();
        });
    }, function (err) {
        main_callback(true);
    });
};
// all alias
async.all = async.every;

async.sortBy = function (arr, iterator, callback) {
    async.map(arr, function (x, callback) {
        iterator(x, function (err, criteria) {
            if (err) {
                callback(err);
            }
            else {
                callback(null, {value: x, criteria: criteria});
            }
        });
    }, function (err, results) {
        if (err) {
            return callback(err);
        }
        else {
            var fn = function (left, right) {
                var a = left.criteria, b = right.criteria;
                return a < b ? -1 : a > b ? 1 : 0;
            };
            callback(null, _map(results.sort(fn), function (x) {
                return x.value;
            }));
        }
    });
};

async.auto = function (tasks, callback) {
    callback = callback || noop;
    var keys = Object.keys(tasks);
    var remainingTasks = keys.length
    if (!remainingTasks) {
        return callback();
    }

    var results = {};

    var listeners = [];
    var addListener = function (fn) {
        listeners.unshift(fn);
    };
    var removeListener = function (fn) {
        for (var i = 0; i < listeners.length; i += 1) {
            if (listeners[i] === fn) {
                listeners.splice(i, 1);
                return;
            }
        }
    };
    var taskComplete = function () {
        remainingTasks--
        _each(listeners.slice(0), function (fn) {
            fn();
        });
    };

    addListener(function () {
        if (!remainingTasks) {
            var theCallback = callback;
            // prevent final callback from calling itself if it errors
            callback = noop;

            theCallback(null, results);
        }
    });

    _each(keys, function (k) {
        var task = Array.isArray(tasks[k]) ? tasks[k]: [tasks[k]];
        var taskCallback = function (err) {
            var args = Array.prototype.slice.call(arguments, 1);
            if (args.length <= 1) {
                args = args[0];
            }
            if (err) {
                var safeResults = {};
                _each(Object.keys(results), function(rkey) {
                    safeResults[rkey] = results[rkey];
                });
                safeResults[k] = args;
                callback(err, safeResults);
                // stop subsequent errors hitting callback multiple times
                callback = noop;
            }
            else {
                results[k] = args;
                setImmediate(taskComplete);
            }
        };
        var requires = task.slice(0, Math.abs(task.length - 1)) || [];
        var ready = function () {
            return !results.hasOwnProperty(k) && requires.reduce(function (a, x) {
                return a && results.hasOwnProperty(x);
            }, true);
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

async.retry = function(times, task, callback) {
    var DEFAULT_TIMES = 5;
    var attempts = [];
    // Use defaults if times not passed
    if (typeof times === 'function') {
        callback = task;
        task = times;
        times = DEFAULT_TIMES;
    }
    // Make sure times is a number
    times = parseInt(times, 10) || DEFAULT_TIMES;
    var wrappedTask = function(wrappedCallback, wrappedResults) {
        var retryAttempt = function(task, finalAttempt) {
            return function(seriesCallback) {
                task(function(err, result){
                    seriesCallback(!err || finalAttempt, {err: err, result: result});
                }, wrappedResults);
            };
        };
        while (times) {
            attempts.push(retryAttempt(task, !(times-=1)));
        }
        async.series(attempts, function(done, data){
            data = data[data.length - 1];
            (wrappedCallback || callback)(data.err, data.result);
        });
    }
    // If a callback is passed, run this as a controll flow
    return callback ? wrappedTask() : wrappedTask
};

async.waterfall = function (tasks, callback) {
    callback = callback || noop;
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
                callback = noop;
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
    wrapIterator(async.iterator(tasks))();
};

var _parallel = function(eachfn, tasks, callback) {
    callback = callback || noop;
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

async.parallel = function (tasks, callback) {
    _parallel({ map: async.map, each: async.each }, tasks, callback);
};

async.parallelLimit = function(tasks, limit, callback) {
    _parallel({ map: _mapLimit(limit), each: _eachLimit(limit) }, tasks, callback);
};

async.iterator = function (tasks) {
    var makeCallback = function (index) {
        var fn = function () {
            if (tasks.length) {
                tasks[index].apply(null, arguments);
            }
            return fn.next();
        };
        fn.next = function () {
            return (index < tasks.length - 1) ? makeCallback(index + 1): null;
        };
        return fn;
    };
    return makeCallback(0);
};

async.apply = function (fn) {
    var args = Array.prototype.slice.call(arguments, 1);
    return function () {
        return fn.apply(
            null, args.concat(Array.prototype.slice.call(arguments))
        );
    };
};

var _concat = function (eachfn, arr, fn, callback) {
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
async.concat = doParallel(_concat);
async.concatSeries = doSeries(_concat);

async.whilst = function (test, iterator, callback) {
    if (test()) {
        iterator(function (err) {
            if (err) {
                return callback(err);
            }
            async.whilst(test, iterator, callback);
        });
    }
    else {
        callback();
    }
};

async.doWhilst = function (iterator, test, callback) {
    iterator(function (err) {
        if (err) {
            return callback(err);
        }
        var args = Array.prototype.slice.call(arguments, 1);
        if (test.apply(null, args)) {
            async.doWhilst(iterator, test, callback);
        }
        else {
            callback();
        }
    });
};

async.until = function (test, iterator, callback) {
    if (!test()) {
        iterator(function (err) {
            if (err) {
                return callback(err);
            }
            async.until(test, iterator, callback);
        });
    }
    else {
        callback();
    }
};

async.doUntil = function (iterator, test, callback) {
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

async.queue = function (worker, concurrency) {
    if (concurrency === undefined) {
        concurrency = 1;
    }
    function _insert(q, data, pos, callback) {
      if (!q.started){
        q.started = true;
      }
      if (!Array.isArray(data)) {
          data = [data];
      }
      if(data.length == 0) {
         // call drain immediately if there are no tasks
         return setImmediate(function() {
             if (q.drain) {
                 q.drain();
             }
         });
      }
      _each(data, function(task) {
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
    }

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
                workers += 1;
                var next = function () {
                    workers -= 1;
                    if (task.callback) {
                        task.callback.apply(task, arguments);
                    }
                    if (q.drain && q.tasks.length + workers === 0) {
                        q.drain();
                    }
                    q.process();
                };
                var cb = only_once(next);
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
            if (q.paused === true) { return; }
            q.paused = true;
        },
        resume: function () {
            if (q.paused === false) { return; }
            q.paused = false;
            // Need to call q.process once per concurrent
            // worker to preserve full concurrency after pause
            for (var w = 1; w <= q.concurrency; w++) {
                setImmediate(q.process);
            }
        }
    };
    return q;
};

async.priorityQueue = function (worker, concurrency) {

    function _compareTasks(a, b){
      return a.priority - b.priority;
    };

    function _binarySearch(sequence, item, compare) {
      var beg = -1,
          end = sequence.length - 1;
      while (beg < end) {
        var mid = beg + ((end - beg + 1) >>> 1);
        if (compare(item, sequence[mid]) >= 0) {
          beg = mid;
        } else {
          end = mid - 1;
        }
      }
      return beg;
    }

    function _insert(q, data, priority, callback) {
      if (!q.started){
        q.started = true;
      }
      if (!Array.isArray(data)) {
          data = [data];
      }
      if(data.length == 0) {
         // call drain immediately if there are no tasks
         return setImmediate(function() {
             if (q.drain) {
                 q.drain();
             }
         });
      }
      _each(data, function(task) {
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
    }

    // Start with a normal queue
    var q = async.queue(worker, concurrency);

    // Override push to accept second parameter representing priority
    q.push = function (data, priority, callback) {
      _insert(q, data, priority, callback);
    };

    // Remove unshift function
    delete q.unshift;

    return q;
};

async.cargo = function (worker, payload) {
    var working     = false,
        tasks       = [];

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
            _each(data, function(task) {
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
            if (working) return;
            if (tasks.length === 0) {
                if(cargo.drain && !cargo.drained) cargo.drain();
                cargo.drained = true;
                return;
            }

            var ts = typeof payload === 'number'
                        ? tasks.splice(0, payload)
                        : tasks.splice(0, tasks.length);

            var ds = _map(ts, function (task) {
                return task.data;
            });

            if(cargo.empty) cargo.empty();
            working = true;
            worker(ds, function () {
                working = false;

                var args = arguments;
                _each(ts, function (data) {
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


async.memoize = function (fn, hasher) {
    var memo = {};
    var queues = {};
    hasher = hasher || function (x) {
        return x;
    };
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

async.unmemoize = function (fn) {
  return function () {
    return (fn.unmemoized || fn).apply(null, arguments);
  };
};

async.times = function (count, iterator, callback) {
    var counter = [];
    for (var i = 0; i < count; i++) {
        counter.push(i);
    }
    return async.map(counter, iterator, callback);
};

async.timesSeries = function (count, iterator, callback) {
    var counter = [];
    for (var i = 0; i < count; i++) {
        counter.push(i);
    }
    return async.mapSeries(counter, iterator, callback);
};


async.applyEach = doParallel(_applyEach);
async.applyEachSeries = doSeries(_applyEach);

async.forever = function (fn, callback) {
    function next(err) {
        if (err) {
            if (callback) {
                return callback(err);
            }
            throw err;
        }
        fn(next);
    }
    next();
};
*/