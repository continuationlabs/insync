// Load Modules

var Domain = require('domain');
var Code = require('code');
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var Insync = require('../lib');
var Common = require('../lib/common');

// Declare internals

var internals = {};

internals.eachAsync = function (result) {

    return function (item, callback) {

        setTimeout(function () {

            result.push(item);
            callback(null);
        }, item * 100);
    };
};

internals.mapAsync = function (result) {

    return function (item, callback) {

        setTimeout(function () {

            var dbl = item + item;
            result.push(dbl);
            callback(null, dbl);
        }, item * 100);
    };
};

internals.filterAsync = function (callOrder) {

    return function (item, callback) {

        callOrder.push(item);

        setTimeout(function () {

            callback(item > 1);
        }, item * 100);
    };
};

internals.reduceAsync = function (callOrder) {

    return function (memo, item, callback) {

        callOrder.push(item);

        setTimeout(function () {

            callback(null, memo + item);
        });
    };
};

internals.doNothing = function () {

    var args = Array.prototype.slice.call(arguments);
    var callback = args.pop();

    setTimeout(function() {

        callback(null);
    }, 100);
};

// Test aliases
var describe = lab.describe;
var it = lab.it;
var before = lab.before;
var after = lab.after;
var expect = Code.expect;

describe('Insync', function () {

    describe('Collection', function () {

        describe('#each', function () {

            it('iterates over a collection of items in parallel', function (done) {

                var result = [];

                Insync.each([4, 3, 2, 1], internals.eachAsync(result), function (error) {

                    expect(error).to.not.exist();
                    expect(result).to.deep.equal([1, 2, 3, 4]);
                    done();
                });
            });

            it('provides a default callback if one is not provided', function (done) {

                var noop = Common.noop;

                Common.noop = function (error) {

                    Common.noop = noop;
                    expect(error).to.not.exist();
                    done();
                };

                Insync.each([4], internals.doNothing);
            });

            it('short circuits if the array is empty', function (done) {

                Insync.each([], Common.noop, function (error) {

                    expect(error).to.not.exist();
                    done();
                });
            });

            it('sends an error when it occurs', function (done) {

                Insync.each([1], function (item, callback) {

                    setTimeout(function() {

                        callback(new Error('async error'));
                    });
                }, function (error) {

                    expect(error).to.exist();
                    expect(error.message).to.equal('async error');
                    done();
                });
            });

            it('is aliased as forEach()', function (done) {

                expect(Insync.each).to.equal(Insync.forEach);
                done();
            });
        });

        describe('#eachSeries', function () {

            it('iterates over a collection of items in series', function (done) {

                var result = [];

                Insync.eachSeries([1,3,2], internals.eachAsync(result), function (error) {

                    expect(error).to.not.exist();
                    expect(result).to.deep.equal([1, 3, 2]);
                    done();
                });
            });

            it('provides a default callback if one is not provided', function (done) {

                var noop = Common.noop;

                Common.noop = function (error) {

                    Common.noop = noop;
                    expect(error).to.not.exist();
                    done();
                };

                Insync.eachSeries([1], internals.doNothing);
            });

            it('short circuits if the array is empty', function (done) {

                Insync.eachSeries([], Common.noop, function (error) {

                    expect(error).to.not.exist();
                    done();
                });
            });

            it('sends an error when it occurs', function (done) {

                Insync.eachSeries([1], function (item, callback) {

                    setTimeout(function() {

                        callback(new Error('async error'));
                    });
                }, function (error) {

                    expect(error).to.exist();
                    expect(error.message).to.equal('async error');
                    done();
                });
            });

            it('is aliased as forEachSeries()', function (done) {

                expect(Insync.eachSeries).to.equal(Insync.forEachSeries);
                done();
            });
        });

        describe('#eachLimit', function () {

            it('iterates over a collection with a limit', function (done) {

                var arr = [0, 1, 2, 3];
                var result = [];

                Insync.eachLimit(arr, 2, internals.eachAsync(result), function (err) {

                    expect(err).to.not.exist();
                    expect(result).to.deep.equal(arr);
                    done();
                });
            });

            it('does not call iterator if array is empty', function (done) {

                Insync.eachLimit([], 2, function (item, callback) {

                    expect(true).to.equal(false);
                }, function (err) {

                    expect(err).to.not.exist();
                    done();
                });
            });

            it('does not call iterator if limit is zero', function (done) {

                Insync.eachLimit([1, 2, 3], 0, function (item, callback) {

                    expect(true).to.equal(false);
                }, function (err) {

                    expect(err).to.not.exist();
                    done();
                });
            });

            it('properly passes error to final callback', function (done) {

                var arr = [0, 1, 2, 3];
                var result = [];

                Insync.eachLimit(arr, 2, function (item, callback) {

                    result.push(item);

                    if (item === 2) {
                        return callback(new Error('foo'));
                    }

                    callback();
                }, function (err) {

                    expect(err).to.exist();
                    expect(result).to.deep.equal([0, 1, 2]);
                    done();
                });
            });

            it('provides a default callback if one is not provided', function (done) {

                var noop = Common.noop;

                Common.noop = function (error) {

                    Common.noop = noop;
                    expect(error).to.not.exist();
                    done();
                };

                Insync.eachLimit([1, 2, 3, 4], 2, internals.doNothing);
            });

            it('is aliased as forEachLimit()', function (done) {

                expect(Insync.eachLimit).to.equal(Insync.forEachLimit);
                done();
            });
        });

        describe('#map', function () {

            it('creates a mapped version of input', function (done) {

                var arr = [0, 1, 2, 3];
                var result = [];

                Insync.map(arr, internals.mapAsync(result), function (err, mapped) {

                    expect(err).to.not.exist();
                    expect(arr).to.deep.equal([0, 1, 2, 3]);
                    expect(mapped).to.deep.equal(result);
                    done();
                });
            });

            it('works without final callback', function (done) {

                var arr = [0, 1, 2, 3];
                var result = [];

                Insync.map(arr, function (item, callback) {

                    result.push(item);

                    if (result.length === arr.length) {
                        expect(arr).to.deep.equal(result);
                        done();
                    }

                    callback(null, item);
                });
            });

            it('properly passes error to final callback', function (done) {

                var arr = [0, 1, 2, 3];
                var result = [];

                Insync.map(arr, function (item, callback) {

                    result.push(item);

                    if (item === 2) {
                        return callback(new Error('foo'));
                    }

                    callback();
                }, function (err) {

                    expect(err).to.exist();
                    expect(result).to.deep.equal([0, 1, 2]);
                    done();
                });
            });
        });

        describe('#mapSeries', function () {

            it('creates a mapped version of input', function (done) {

                var arr = [0, 1, 2, 3];
                var result = [];

                Insync.mapSeries(arr, internals.mapAsync(result), function (err, mapped) {

                    expect(err).to.not.exist();
                    expect(arr).to.deep.equal([0, 1, 2, 3]);
                    expect(mapped).to.deep.equal(result);
                    done();
                });
            });

            it('properly passes error to final callback', function (done) {

                var arr = [0, 1, 2, 3];
                var result = [];

                Insync.mapSeries(arr, function (item, callback) {

                    result.push(item);

                    if (item === 2) {
                        return callback(new Error('foo'));
                    }

                    callback();
                }, function (err) {

                    expect(err).to.exist();
                    expect(result).to.deep.equal([0, 1, 2]);
                    done();
                });
            });
        });

        describe('#mapLimit', function () {

            it('iterates over a collection with a limit', function (done) {

                var arr = [0, 1, 2, 3];
                var result = [];

                Insync.mapLimit(arr, 2, internals.mapAsync(result), function (err, mapped) {

                    expect(err).to.not.exist();
                    expect(result).to.deep.equal(mapped);
                    done();
                });
            });
        });

        describe('#filter', function () {

            it('filters an array', function (done) {

                var arr = [0, 1, 2, 3];
                var callOrder = [];

                Insync.filter(arr, internals.filterAsync(callOrder), function (results) {

                    expect(arr).to.deep.equal([0, 1, 2, 3]);
                    expect(results).to.deep.equal([2, 3]);
                    done();
                });
            });

            it('is aliased as select()', function (done) {

                expect(Insync.filter).to.equal(Insync.select);
                done();
            });
        });

        describe('#filterSeries', function () {

            it('filters an array in series', function (done) {

                var arr = [0, 1, 2, 3];
                var callOrder = [];

                Insync.filterSeries(arr, internals.filterAsync(callOrder), function (results) {

                    expect(arr).to.deep.equal([0, 1, 2, 3]);
                    expect(callOrder).to.deep.equal(arr);
                    expect(results).to.deep.equal([2, 3]);
                    done();
                });
            });

            it('is aliased as selectSeries()', function (done) {

                expect(Insync.filterSeries).to.equal(Insync.selectSeries);
                done();
            });
        });

        describe('#reject', function () {

            it('filters an array', function (done) {

                var arr = [0, 1, 2, 3];
                var callOrder = [];

                Insync.reject(arr, internals.filterAsync(callOrder), function (results) {

                    expect(arr).to.deep.equal([0, 1, 2, 3]);
                    expect(results).to.deep.equal([0, 1]);
                    done();
                });
            });
        });

        describe('#rejectSeries', function () {

            it('filters an array in series', function (done) {

                var arr = [0, 1, 2, 3];
                var callOrder = [];

                Insync.rejectSeries(arr, internals.filterAsync(callOrder), function (results) {

                    expect(arr).to.deep.equal([0, 1, 2, 3]);
                    expect(callOrder).to.deep.equal(arr);
                    expect(results).to.deep.equal([0, 1]);
                    done();
                });
            });
        });

        describe('#reduce', function () {

            it('reduces an array', function (done) {

                var arr = [0, 1, 2, 3];
                var callOrder = [];

                Insync.reduce(arr, 0, internals.reduceAsync(callOrder), function (err, result) {

                    expect(err).to.not.exist();
                    expect(result).to.equal(6);
                    expect(arr).to.deep.equal([0, 1, 2, 3]);
                    expect(callOrder).to.deep.equal(arr);
                    done();
                });
            });

            it('handles errors', function (done) {

                Insync.reduce([1, 2, 3], 0, function(a, x, callback) {

                    callback(new Error());
                }, function(err) {

                    expect(err).to.exist();
                    done();
                });
            });

            it('is aliased as inject()', function (done) {

                expect(Insync.reduce).to.equal(Insync.inject);
                done();
            });

            it('is aliased as foldl()', function (done) {

                expect(Insync.reduce).to.equal(Insync.foldl);
                done();
            });
        });

        describe('#reduceRight', function () {

            it('reduces an array', function (done) {

                var arr = [0, 1, 2, 3];
                var callOrder = [];

                Insync.reduceRight(arr, 0, internals.reduceAsync(callOrder), function (err, result) {

                    expect(err).to.not.exist();
                    expect(result).to.equal(6);
                    expect(arr).to.deep.equal([0, 1, 2, 3]);
                    expect(callOrder).to.deep.equal([3, 2, 1, 0]);
                    done();
                });
            });

            it('is aliased as foldr()', function (done) {

                expect(Insync.reduceRight).to.equal(Insync.foldr);
                done();
            });
        });

        describe('#detect', function () {

            it('returns the first value that passes test', function (done) {

                var arr = [0, 1, 2, 3];
                var callOrder = [];

                Insync.detect(arr, function (item, callback) {

                    callOrder.push(item);

                    setTimeout(function () {

                        callback(item === 2);
                    }, 100);
                }, function (result) {

                    expect(result).to.equal(2);
                    done();
                });
            });

            it('returns undefined when no items pass test', function (done) {

                var arr = [0, 1, 2, 3];
                var callOrder = [];

                Insync.detect(arr, function (item, callback) {

                    callOrder.push(item);

                    setTimeout(function () {

                        callback(item === 6);
                    }, 100);
                }, function (result) {

                    expect(result).to.equal(undefined);
                    done();
                });
            });
        });

        describe('#detectSeries', function () {

            it('detects in series', function (done) {

                var callOrder = [];

                Insync.detectSeries([3, 2, 1], function (item, callback) {

                    callOrder.push(item);
                    setTimeout(function () {

                        callback(item === 2);
                    }, 10);
                }, function (result) {

                    expect(result).to.equal(2);
                    expect(callOrder).to.deep.equal([3, 2]);
                    done();
                });
            });
        });

        describe('#some', function () {

            it('returns true if at least one element satisfies test', function (done) {

                var arr = [0, 1, 2, 3];

                Insync.some(arr, function (item, callback) {

                    setTimeout(function () {

                        callback(item === 2);
                    }, 100);
                }, function (result) {

                    expect(result).to.equal(true);
                    done();
                });
            });

            it('returns false if no elements satisfies test', function (done) {

                var arr = [0, 1, 2, 3];

                Insync.some(arr, function (item, callback) {

                    setTimeout(function () {

                        callback(item === 6);
                    }, 100);
                }, function (result) {

                    expect(result).to.equal(false);
                    done();
                });
            });

            it('returns early on match', function (done) {

                var callOrder = [];

                Insync.some([1, 2, 3], function(item, callback) {

                    setTimeout(function () {

                        callOrder.push(item);
                        callback(item === 1);
                    }, item * 25);
                }, function (result) {

                    expect(result).to.equal(true);
                    expect(callOrder).to.deep.equal([1]);
                    // note that 2 and 3 are still executed
                    done();
                });
            });

            it('is aliased as any()', function (done) {

                expect(Insync.some).to.equal(Insync.any);
                done();
            });
        });

        describe('#every', function () {

            it('returns true if every element satisfies test', function (done) {

                var arr = [0, 1, 2, 3];

                Insync.every(arr, function (item, callback) {

                    setTimeout(function () {

                        callback(item >= 0 && item < 4);
                    }, 100);
                }, function (result) {

                    expect(result).to.equal(true);
                    done();
                });
            });

            it('returns false if any element fails test', function (done) {

                var arr = [0, 1, 2, 3];

                Insync.every(arr, function (item, callback) {

                    setTimeout(function () {

                        callback(item >= 1);
                    }, 100);
                }, function (result) {

                    expect(result).to.equal(false);
                    done();
                });
            });

            it('returns early on failure', function (done) {

                var callOrder = [];

                Insync.every([1, 2, 3], function(item, callback) {

                    setTimeout(function () {

                        callOrder.push(item);
                        callback(item === 1);
                    }, item * 25);
                }, function (result) {

                    expect(result).to.equal(false);
                    expect(callOrder).to.deep.equal([1, 2]);
                    // note that 3 is still executed
                    done();
                });
            });

            it('is aliased as all()', function (done) {

                expect(Insync.every).to.equal(Insync.all);
                done();
            });
        });

        describe('#concat', function () {

            it('concatenates results', function (done) {

                var arr = [0, 1, 2, 3];

                Insync.concat(arr, function (item, callback) {

                    setTimeout(function () {

                        callback(null, [item, item]);
                    }, 100);
                }, function (err, results) {

                    expect(err).to.not.exist();
                    expect(arr).to.deep.equal([0, 1, 2, 3]);
                    expect(results).to.deep.equal([0, 0, 1, 1, 2, 2, 3, 3]);
                    done();
                });
            });


            it('creates empty array when iterator returns no results', function (done) {

                var arr = [0, 1, 2, 3];

                Insync.concat(arr, function (item, callback) {

                    setTimeout(function () {

                        callback(null);
                    }, 100);
                }, function (err, results) {

                    expect(err).to.not.exist();
                    expect(arr).to.deep.equal([0, 1, 2, 3]);
                    expect(results).to.deep.equal([]);
                    done();
                });
            });
        });

        describe('#concatSeries', function () {

            it('concatenates results in series', function (done) {

                var arr = [0, 1, 2, 3];

                Insync.concatSeries(arr, function (item, callback) {

                    setTimeout(function () {

                        callback(null, [item, item]);
                    }, 100);
                }, function (err, results) {

                    expect(err).to.not.exist();
                    expect(arr).to.deep.equal([0, 1, 2, 3]);
                    expect(results).to.deep.equal([0, 0, 1, 1, 2, 2, 3, 3]);
                    done();
                });
            });
        });

        describe('#sortBy', function () {

            it('performs an asynchronous sort', function (done) {

                var arr = [3, 1, 0, 2, 0];

                Insync.sortBy(arr, function (item, callback) {

                    setTimeout(function () {

                        callback(null, item);
                    }, 50);
                }, function (err, result) {

                    expect(err).to.not.exist();
                    expect(arr).to.deep.equal([3, 1, 0, 2, 0]);
                    expect(result).to.deep.equal([0, 0, 1, 2, 3]);
                    done();
                });
            });

            it('handles errors properly', function (done) {

                var arr = [3, 1, 0, 2, 0];

                Insync.sortBy(arr, function (item, callback) {

                    setTimeout(function () {

                        if (item === 2) {
                            return callback(new Error('foo'));
                        }

                        callback(null, item);
                    }, 50);
                }, function (err, result) {

                    expect(err).to.exist();
                    expect(arr).to.deep.equal([3, 1, 0, 2, 0]);
                    expect(result).to.not.exist();
                    done();
                });
            });
        });
    });

    describe('Flow', function () {

        describe('#series', function () {

            it('executes array of functions in series', function (done) {

                var callOrder = [];

                Insync.series([
                    function (callback) { setTimeout(function () { callOrder.push(0); callback(null, 0); }, 100); },
                    function (callback) { setTimeout(function () { callOrder.push(1); callback(null, 1); }, 100); },
                    function (callback) { setTimeout(function () { callOrder.push(2); callback(null, 2, 3); }, 10); }
                ], function (err, results) {

                    expect(err).to.not.exist();
                    expect(callOrder).to.deep.equal([0, 1, 2]);
                    expect(results).to.deep.equal([0, 1, [2, 3]]);
                    done();
                });
            });

            it('executes object of functions in series', function (done) {

                var callOrder = [];

                Insync.series({
                    zero: function (callback) { setTimeout(function () { callOrder.push(0); callback(null, 0); }, 100); },
                    one: function (callback) { setTimeout(function () { callOrder.push(1); callback(null, 1); }, 100); },
                    two: function (callback) { setTimeout(function () { callOrder.push(2); callback(null, 2, 3); }, 10); }
                }, function (err, results) {

                    expect(err).to.not.exist();
                    expect(callOrder).to.deep.equal([0, 1, 2]);
                    expect(results).to.deep.equal({ zero: 0, one: 1, two: [2, 3] });
                    done();
                });
            });

            it('handles empty array of functions', function (done) {

                Insync.series([], function (err, results) {

                    expect(err).to.not.exist();
                    expect(results).to.deep.equal([]);
                    done();
                });
            });

            it('handles array functions that call back with no arguments', function (done) {

                Insync.series([
                    function (callback) { setTimeout(function () { callback(); }, 100); }
                ], function (err, results) {

                    expect(err).to.not.exist();
                    expect(results).to.deep.equal([undefined]);
                    done();
                });
            });

            it('handles object functions that call back with no arguments', function (done) {

                Insync.series({
                    zero: function (callback) { setTimeout(function () { callback(); }, 100); }
                }, function (err, results) {

                    expect(err).to.not.exist();
                    expect(results).to.deep.equal({ zero: undefined });
                    done();
                });
            });

            it('handles errors when an array is passed', function (done) {

                Insync.series([
                    function (callback) { setTimeout(function () { callback(new Error()); }, 100); }
                ], function (err, results) {

                    expect(err).to.exist();
                    done();
                });
            });

            it('handles errors when an object is passed', function (done) {

                Insync.series({
                    zero: function (callback) { setTimeout(function () { callback(new Error()); }, 100); }
                }, function (err, results) {

                    expect(err).to.exist();
                    done();
                });
            });

            it('handles case where no callback is provided', function (done) {

                var noop = Common.noop;

                Common.noop = function (error) {

                    Common.noop = noop;
                    expect(error).to.not.exist();
                    done();
                };

                Insync.series({
                    zero: function (callback) { setTimeout(function () { callback(null, 0); }, 100); }
                });
            });
        });

        describe('#parallel', function () {

            it('executes array of functions in parallel', function (done) {

                var callOrder = [];

                Insync.parallel([
                    function (callback) { setTimeout(function () { callOrder.push(0); callback(null, 0); }, 50); },
                    function (callback) { setTimeout(function () { callOrder.push(1); callback(null, 1); }, 100); },
                    function (callback) { setTimeout(function () { callOrder.push(2); callback(null, 2, 3); }, 10); }
                ], function (err, results) {

                    expect(err).to.not.exist();
                    expect(callOrder).to.deep.equal([2, 0, 1]);
                    expect(results).to.deep.equal([0, 1, [2, 3]]);
                    done();
                });
            });

            it('executes object of functions in parallel', function (done) {

                var callOrder = [];

                Insync.parallel({
                    zero: function (callback) { setTimeout(function () { callOrder.push(0); callback(null, 0); }, 50); },
                    one: function (callback) { setTimeout(function () { callOrder.push(1); callback(null, 1); }, 100); },
                    two: function (callback) { setTimeout(function () { callOrder.push(2); callback(null, 2, 3); }, 10); }
                }, function (err, results) {

                    expect(err).to.not.exist();
                    expect(callOrder).to.deep.equal([2, 0, 1]);
                    expect(results).to.deep.equal({ zero: 0, one: 1, two: [2, 3] });
                    done();
                });
            });

            it('handles case where no callback is provided', function (done) {

                var noop = Common.noop;

                Common.noop = function (error) {

                    Common.noop = noop;
                    expect(error).to.not.exist();
                    done();
                };

                Insync.parallel({
                    zero: function (callback) { setTimeout(function () { callback(null, 0); }, 100); }
                });
            });
        });

        describe('#whilst', function () {

            it('executes an asynchronous while loop', function (done) {

                var callOrder = [];
                var count = 0;

                Insync.whilst(function () {

                    callOrder.push(['test', count]);
                    return count < 5;
                }, function (callback) {

                    callOrder.push(['iterator', count]);

                    setTimeout(function () {

                        count++;
                        callback();
                    }, 10);
                }, function (err) {

                    expect(err).to.not.exist();
                    expect(count).to.equal(5);
                    expect(callOrder).to.deep.equal([
                        ['test', 0],
                        ['iterator', 0], ['test', 1],
                        ['iterator', 1], ['test', 2],
                        ['iterator', 2], ['test', 3],
                        ['iterator', 3], ['test', 4],
                        ['iterator', 4], ['test', 5]
                    ]);
                    done();
                });
            });

            it('handles errors in iterator', function (done) {

                var callOrder = [];
                var count = 0;

                Insync.whilst(function () {

                    callOrder.push(['test', count]);
                    return count < 5;
                }, function (callback) {

                    callOrder.push(['iterator', count]);

                    setTimeout(function () {
                        count++;

                        if (count === 2) {
                            return callback(new Error('foo'));
                        }

                        callback();
                    }, 50);
                }, function (err) {

                    expect(err).to.exist();
                    expect(count).to.equal(2);
                    expect(callOrder).to.deep.equal([
                        ['test', 0],
                        ['iterator', 0], ['test', 1],
                        ['iterator', 1]
                    ]);
                    done();
                });
            });
        });

        describe('#doWhilst', function () {

            it('executes an asynchronous do...while loop', function (done) {

                var callOrder = [];
                var count = 0;

                Insync.doWhilst(function (callback) {

                    callOrder.push(['iterator', count]);

                    setTimeout(function () {

                        count++;
                        callback();
                    }, 10);
                }, function () {

                    callOrder.push(['test', count]);
                    return count < 5;
                }, function (err) {

                    expect(err).to.not.exist();
                    expect(count).to.equal(5);
                    expect(callOrder).to.deep.equal([
                        ['iterator', 0], ['test', 1],
                        ['iterator', 1], ['test', 2],
                        ['iterator', 2], ['test', 3],
                        ['iterator', 3], ['test', 4],
                        ['iterator', 4], ['test', 5]
                    ]);
                    done();
                });
            });

            it('iterator calls back with arguments', function (done) {

                var callOrder = [];
                var count = 0;

                Insync.doWhilst(function (callback) {

                    callOrder.push(['iterator', count]);

                    setTimeout(function () {

                        count++;
                        callback(null, count);
                    }, 10);
                }, function (cnt) {

                    callOrder.push(['test', cnt]);
                    return cnt < 5;
                }, function (err) {

                    expect(err).to.not.exist();
                    expect(count).to.equal(5);
                    expect(callOrder).to.deep.equal([
                        ['iterator', 0], ['test', 1],
                        ['iterator', 1], ['test', 2],
                        ['iterator', 2], ['test', 3],
                        ['iterator', 3], ['test', 4],
                        ['iterator', 4], ['test', 5]
                    ]);
                    done();
                });
            });

            it('handles errors in iterator', function (done) {

                var callOrder = [];
                var count = 0;

                Insync.doWhilst(function (callback) {

                    callOrder.push(['iterator', count]);

                    setTimeout(function () {
                        count++;

                        if (count === 2) {
                            return callback(new Error('foo'));
                        }

                        callback();
                    }, 50);
                }, function () {

                    callOrder.push(['test', count]);
                    return count < 5;
                }, function (err) {

                    expect(err).to.exist();
                    expect(count).to.equal(2);
                    expect(callOrder).to.deep.equal([
                        ['iterator', 0], ['test', 1],
                        ['iterator', 1]
                    ]);
                    done();
                });
            });
        });

        describe('#until', function () {

            it('executes an asynchronous until loop', function (done) {

                var callOrder = [];
                var count = 0;

                Insync.until(function () {

                    callOrder.push(['test', count]);
                    return count === 5;
                }, function (callback) {

                    callOrder.push(['iterator', count]);

                    setTimeout(function () {

                        count++;
                        callback();
                    }, 10);
                }, function (err) {

                    expect(err).to.not.exist();
                    expect(count).to.equal(5);
                    expect(callOrder).to.deep.equal([
                        ['test', 0],
                        ['iterator', 0], ['test', 1],
                        ['iterator', 1], ['test', 2],
                        ['iterator', 2], ['test', 3],
                        ['iterator', 3], ['test', 4],
                        ['iterator', 4], ['test', 5]
                    ]);
                    done();
                });
            });

            it('handles errors in iterator', function (done) {

                var callOrder = [];
                var count = 0;

                Insync.until(function () {

                    callOrder.push(['test', count]);
                    return count === 5;
                }, function (callback) {

                    callOrder.push(['iterator', count]);

                    setTimeout(function () {
                        count++;

                        if (count === 2) {
                            return callback(new Error('foo'));
                        }

                        callback();
                    }, 50);
                }, function (err) {

                    expect(err).to.exist();
                    expect(count).to.equal(2);
                    expect(callOrder).to.deep.equal([
                        ['test', 0],
                        ['iterator', 0], ['test', 1],
                        ['iterator', 1]
                    ]);
                    done();
                });
            });
        });

        describe('#doUntil', function () {

            it('executes an asynchronous do...until loop', function (done) {

                var callOrder = [];
                var count = 0;

                Insync.doUntil(function (callback) {

                    callOrder.push(['iterator', count]);

                    setTimeout(function () {

                        count++;
                        callback();
                    }, 10);
                }, function () {

                    callOrder.push(['test', count]);
                    return count === 5;
                }, function (err) {

                    expect(err).to.not.exist();
                    expect(count).to.equal(5);
                    expect(callOrder).to.deep.equal([
                        ['iterator', 0], ['test', 1],
                        ['iterator', 1], ['test', 2],
                        ['iterator', 2], ['test', 3],
                        ['iterator', 3], ['test', 4],
                        ['iterator', 4], ['test', 5]
                    ]);
                    done();
                });
            });

            it('iterator calls back with arguments', function (done) {

                var callOrder = [];
                var count = 0;

                Insync.doUntil(function (callback) {

                    callOrder.push(['iterator', count]);

                    setTimeout(function () {

                        count++;
                        callback(null, count);
                    }, 10);
                }, function (cnt) {

                    callOrder.push(['test', cnt]);
                    return cnt === 5;
                }, function (err) {

                    expect(err).to.not.exist();
                    expect(count).to.equal(5);
                    expect(callOrder).to.deep.equal([
                        ['iterator', 0], ['test', 1],
                        ['iterator', 1], ['test', 2],
                        ['iterator', 2], ['test', 3],
                        ['iterator', 3], ['test', 4],
                        ['iterator', 4], ['test', 5]
                    ]);
                    done();
                });
            });

            it('handles errors in iterator', function (done) {

                var callOrder = [];
                var count = 0;

                Insync.doUntil(function (callback) {

                    callOrder.push(['iterator', count]);

                    setTimeout(function () {
                        count++;

                        if (count === 2) {
                            return callback(new Error('foo'));
                        }

                        callback();
                    }, 50);
                }, function () {

                    callOrder.push(['test', count]);
                    return count === 5;
                }, function (err) {

                    expect(err).to.exist();
                    expect(count).to.equal(2);
                    expect(callOrder).to.deep.equal([
                        ['iterator', 0], ['test', 1],
                        ['iterator', 1]
                    ]);
                    done();
                });
            });
        });

        describe('#forever', function () {

            it('runs an infinite loop', function (done) {

                var count = 0;

                Insync.forever(function (callback) {

                    setImmediate(function () {

                        count++;

                        if (count === 50) {
                            return callback(new Error('enough'));
                        }

                        callback();
                    });
                }, function (err) {

                    expect(err).to.exist();
                    expect(count).to.equal(50);
                    done();
                });
            });

            it('throws if no callback is provided', function (done) {

                expect(function () {

                    Insync.forever(function (callback) {

                        callback(new Error('foo'));
                    });
                }).to.throw();
                done();
            });
        });

        describe('#waterfall', function () {

            it('runs tasks in a waterfall', function (done) {

                var callOrder = [];

                Insync.waterfall([
                    function (callback) {

                        setTimeout(function () {

                            callOrder.push(0);
                            callback(null, 0);
                        }, 5);
                    },
                    function (arg0, callback) {

                        expect(arg0).to.equal(0);
                        setTimeout(function () {

                            callOrder.push(1);
                            callback(null, 1, arg0);
                        }, 2);
                    },
                    function (arg1, arg0, callback) {

                        expect(arg1).to.equal(1);
                        expect(arg0).to.equal(0);
                        callOrder.push(2);
                        callback(null, arg0, arg1, 2);
                    }
                ], function (err, arg0, arg1, arg2) {

                    expect(err).to.not.exist();
                    expect(callOrder).to.deep.equal([0, 1, 2]);
                    expect(arg0).to.equal(0);
                    expect(arg1).to.equal(1);
                    expect(arg2).to.equal(2);
                    done();
                });
            });

            it('handles an empty array of tasks', function (done) {

                Insync.waterfall([], function (err) {

                    expect(err).to.not.exist();
                    done();
                });
            });

            it('works if final callback function is not provided', function (done) {

                var noop = Common.noop;

                Common.noop = function (error) {

                    Common.noop = noop;
                    expect(error).to.not.exist();
                    done();
                };

                Insync.waterfall([]);
            });

            it('errors if an array is not passed as first argument', function (done) {

                Insync.waterfall(null, function (err) {

                    expect(err).to.exist();
                    expect(arguments.length).to.equal(1);
                    done();
                });
            });

            it('handles errors in tasks', function (done) {

                var callOrder = [];

                Insync.waterfall([
                    function (callback) {

                        setTimeout(function () {

                            callOrder.push(0);
                            callback(null, 0);
                        }, 5);
                    },
                    function (arg0, callback) {

                        expect(arg0).to.equal(0);
                        setTimeout(function () {

                            callOrder.push(1);
                            callback(new Error('foo'));
                        }, 2);
                    },
                    function (callback) {

                        expect(false).to.equal(true);
                    }
                ], function (err) {

                    expect(err).to.exist();
                    expect(callOrder).to.deep.equal([0, 1]);
                    done();
                });
            });
        });

        describe('#times', function () {

            it('executes a function a number of times', function (done) {

                Insync.times(5, function (n, callback) {

                    setTimeout(function () { callback(null, n); }, 10);
                }, function (err, results) {

                    expect(err).to.not.exist();
                    expect(results).to.deep.equal([0, 1, 2, 3, 4]);
                    done();
                });
            });
        });

        describe('#timesSeries', function () {

            it('executes a function a number of times in series', function (done) {

                var callOrder = [];

                Insync.timesSeries(5, function (n, callback) {

                    callOrder.push(n);
                    setTimeout(function () { callback(null, n); }, 100 - n * 10);
                }, function (err, results) {

                    expect(err).to.not.exist();
                    expect(results).to.deep.equal([0, 1, 2, 3, 4]);
                    expect(callOrder).to.deep.equal([0, 1, 2, 3, 4]);
                    done();
                });
            });
        });

        describe('#apply', function () {

            it('creates a continuation function with applied arguments', function (done) {

                var fn = Insync.apply(function (num1, num2, callback) {

                    callback(null, num1 + num2);
                }, 2, 3, function (err, sum) {

                    expect(err).to.not.exist();
                    expect(sum).to.equal(5);
                    done();
                });

                fn();
            });

            it('supports partial application', function (done) {

                var fn = function () {

                    var args = Array.prototype.slice.call(arguments);

                    expect(args).to.deep.equal([1, 2, 3, 4]);
                };

                Insync.apply(fn, 1, 2, 3, 4)();
                Insync.apply(fn, 1, 2, 3)(4);
                Insync.apply(fn, 1, 2)(3, 4);
                Insync.apply(fn, 1)(2, 3, 4);
                Insync.apply(fn)(1, 2, 3, 4);
                done();
            });
        });

        describe('#applyEach', function () {

            it('applies the supplied arguments to each function in the list', function (done) {

                var callOrder = [];

                var one = function (val, callback) {

                    expect(val).to.equal(5);
                    setTimeout(function () {

                        callOrder.push(1);
                        callback(null, 1);
                    }, 100);
                };

                var two = function (val, callback) {

                    expect(val).to.equal(5);
                    setTimeout(function () {

                        callOrder.push(2);
                        callback(null, 2);
                    }, 50);
                };

                var three = function (val, callback) {

                    expect(val).to.equal(5);
                    setTimeout(function () {

                        callOrder.push(3);
                        callback(null, 3);
                    }, 150);
                };

                Insync.applyEach([one, two, three], 5, function (err) {

                    expect(err).to.not.exist();
                    expect(callOrder).to.deep.equal([2, 1, 3]);
                    done();
                });
            });

            it('works when no arguments are applied', function (done) {

                var callOrder = [];

                var one = function (callback) {

                    expect(arguments.length).to.equal(1);
                    setTimeout(function () {

                        callOrder.push(1);
                        callback();
                    }, 100);
                };

                var two = function (callback) {

                    expect(arguments.length).to.equal(1);
                    setTimeout(function () {

                        callOrder.push(2);
                        callback();
                    }, 50);
                };

                Insync.applyEach([one, two], function (err) {

                    expect(err).to.not.exist();
                    expect(callOrder).to.deep.equal([2, 1]);
                    done();
                });
            });

            it('supports partial application', function (done) {

                var callOrder = [];

                var one = function (val, cb) {

                    expect(val).to.equal(5);
                    setTimeout(function () {

                        callOrder.push(1);
                        cb(null, 1);
                    }, 100);
                };

                var two = function (val, cb) {

                    expect(val).to.equal(5);
                    setTimeout(function () {

                        callOrder.push(2);
                        cb(null, 2);
                    }, 50);
                };

                var three = function (val, cb) {

                    expect(val).to.equal(5);
                    setTimeout(function () {

                        callOrder.push(3);
                        cb(null, 3);
                    }, 150);
                };

                var partial = Insync.applyEach([one, two, three]);

                partial(5, function (err) {

                    expect(err).to.not.exist();
                    expect(callOrder).to.deep.equal([2, 1, 3]);
                    done();
                });
            });
        });

        describe('#applyEachSeries', function () {

            it('applies the supplied arguments to each function in the list in order', function (done) {

                var callOrder = [];

                var one = function (val, callback) {

                    expect(val).to.equal(5);
                    setTimeout(function () {

                        callOrder.push(1);
                        callback(null, 1);
                    }, 100);
                };

                var two = function (val, callback) {

                    expect(val).to.equal(5);
                    setTimeout(function () {

                        callOrder.push(2);
                        callback(null, 2);
                    }, 50);
                };

                var three = function (val, callback) {

                    expect(val).to.equal(5);
                    setTimeout(function () {

                        callOrder.push(3);
                        callback(null, 3);
                    }, 150);
                };

                Insync.applyEachSeries([one, two, three], 5, function (err) {

                    expect(err).to.not.exist();
                    expect(callOrder).to.deep.equal([1, 2, 3]);
                    done();
                });
            });
        });

        describe('#parallelLimit', function () {

            it('executes array of functions in parallel with a limit', function (done) {

                var callOrder = [];

                Insync.parallelLimit([
                    function (callback) { setTimeout(function () { callOrder.push(0); callback(null, 0); }, 50); },
                    function (callback) { setTimeout(function () { callOrder.push(1); callback(null, 1); }, 100); },
                    function (callback) { setTimeout(function () { callOrder.push(2); callback(null, 2, 3); }, 25); }
                ], 2, function (err, results) {

                    expect(err).to.not.exist();
                    expect(callOrder).to.deep.equal([0, 2, 1]);
                    expect(results).to.deep.equal([0, 1, [2, 3]]);
                    done();
                });
            });

            it('handles empty array of tasks', function (done) {

                Insync.parallelLimit([], 2, function (err, results) {

                    expect(err).to.not.exist();
                    expect(results).to.deep.equal([]);
                    done();
                });
            });

            it('handles errors in tasks', function (done) {

                Insync.parallelLimit([
                    function (callback) { callback(new Error(1), 1); },
                    function (callback) { callback(new Error(2), 2); }
                ], 1, function (err, results) {

                    expect(err).to.exist();
                    done();
                });
            });

            it('handles omitted final callback', function (done) {

                var noop = Common.noop;

                Common.noop = function (error) {

                    Common.noop = noop;
                    expect(error).to.not.exist();
                    done();
                };

                Insync.parallelLimit([
                    function (callback) {callback(); },
                    function (callback) {callback();}
                ], 1);
            });
        });

        describe('#seq', function () {

            it('normal behavior', function (done) {

                var add2 = function (n, cb) {

                    expect(n).to.equal(3);
                    setTimeout(function () {

                        cb(null, n + 2);
                    }, 50);
                };

                var mul3 = function (n, cb) {

                    expect(n).to.equal(5);
                    setTimeout(function () {

                        cb(null, n * 3);
                    }, 15);
                };

                var add1 = function (n, cb) {

                    expect(n).to.equal(15);
                    setTimeout(function () {

                        cb(null, n + 1);
                    }, 100);
                };

                var add2mul3add1 = Insync.seq(add2, mul3, add1);

                add2mul3add1(3, function (err, result) {

                    expect(err).to.not.exist();
                    expect(result).to.equal(16);
                    done();
                });
            });

            it('supports setting this', function (done) {

                var testcontext = { name: 'foo' };

                var add2 = function (n, cb) {

                    expect(this).to.equal(testcontext);
                    setTimeout(function () {

                        cb(null, n + 2);
                    }, 50);
                };

                var mul3 = function (n, cb) {

                    expect(this).to.equal(testcontext);
                    setTimeout(function () {

                        cb(null, n * 3);
                    }, 15);
                };

                var add2mul3 = Insync.seq(add2, mul3);

                add2mul3.call(testcontext, 3, function (err, result) {

                    expect(err).to.not.exist();
                    expect(this).to.equal(testcontext);
                    expect(result).to.equal(15);
                    done();
                });
            });

            it('handles errors', function (done) {

                var add2 = function (n, cb) {

                    expect(n).to.equal(3);
                    setTimeout(function () {

                        cb(null, n + 2);
                    }, 50);
                };

                var mul3 = function (n, cb) {

                    expect(n).to.equal(5);
                    setTimeout(function () {

                        cb(new Error(), n * 3);
                    }, 15);
                };

                var add1 = function (n, cb) {

                    expect(true).to.equal(false);
                };

                var add2mul3add1 = Insync.seq(add2, mul3, add1);

                add2mul3add1(3, function (err, result) {

                    expect(err).to.exist();
                    done();
                });
            });
        });

        describe('#compose', function () {

            it('creates a function which is a composition of the passed asynchronous functions', function (done) {

                var add2 = function (n, cb) {

                    expect(n).to.equal(3);
                    setTimeout(function () {

                        cb(null, n + 2);
                    }, 50);
                };

                var mul3 = function (n, cb) {

                    expect(n).to.equal(5);
                    setTimeout(function () {

                        cb(null, n * 3);
                    }, 15);
                };

                var add1 = function (n, cb) {

                    expect(n).to.equal(15);
                    setTimeout(function () {

                        cb(null, n + 1);
                    }, 100);
                };

                var add2mul3add1 = Insync.compose(add1, mul3, add2);

                add2mul3add1(3, function (err, result) {

                    expect(err).to.not.exist();
                    expect(result).to.equal(16);
                    done();
                });
            });

            it('supports setting this', function (done) {

                var testcontext = { name: 'foo' };

                var add2 = function (n, cb) {

                    expect(this).to.equal(testcontext);
                    setTimeout(function () {

                        cb(null, n + 2);
                    }, 50);
                };

                var mul3 = function (n, cb) {

                    expect(this).to.equal(testcontext);
                    setTimeout(function () {

                        cb(null, n * 3);
                    }, 15);
                };

                var composition = Insync.compose(mul3, add2);

                composition.call(testcontext, 3, function (err, result) {

                    expect(err).to.not.exist();
                    expect(this).to.equal(testcontext);
                    expect(result).to.equal(15);
                    done();
                });
            });

            it('handles errors', function (done) {

                var add2 = function (n, cb) {

                    expect(n).to.equal(3);
                    setTimeout(function () {

                        cb(null, n + 2);
                    }, 50);
                };

                var mul3 = function (n, cb) {

                    expect(n).to.equal(5);
                    setTimeout(function () {

                        cb(new Error(), n * 3);
                    }, 15);
                };

                var add1 = function (n, cb) {

                    expect(true).to.equal(false);
                };

                var composition = Insync.compose(add1, mul3, add2);

                composition(3, function (err, result) {

                    expect(err).to.exist();
                    done();
                });
            });
        });

        describe('#queue', function () {

            var generateTask = function (queue, callOrder, expectLengh, processNumber) {

                return function (err, arg) {

                    expect(err).to.equal('error');
                    expect(arg).to.equal('arg');
                    expect(queue.length()).to.equal(expectLengh);
                    callOrder.push('callback ' + processNumber);
                };
            };

            it('creates a queue object with the specified concurrency', function (done) {

                var callOrder = [];
                var delays = [160, 80, 240, 80];

                var q = Insync.queue(function (task, callback) {

                    setTimeout(function () {

                        callOrder.push('process ' + task);
                        callback('error', 'arg');
                    }, delays.shift());
                }, 2);

                var genTask = generateTask.bind(null, q, callOrder);

                q.push(1, genTask(1, 1));
                q.push(2, genTask(2, 2));
                q.push(3, genTask(0, 3));
                q.push(4, genTask(0, 4));

                expect(q.length()).to.equal(4);
                expect(q.concurrency).to.equal(2);

                q.drain = function () {

                    expect(callOrder).to.deep.equal([
                        'process 2', 'callback 2',
                        'process 1', 'callback 1',
                        'process 4', 'callback 4',
                        'process 3', 'callback 3'
                    ]);

                    expect(q.concurrency).to.equal(2);
                    expect(q.length()).to.equal(0);
                    done();
                };
            });

            it('creates a queue object with the default concurrency of one', function (done) {

                var callOrder = [];
                var delays = [160, 80, 240, 80];

                var q = Insync.queue(function (task, callback) {

                    setTimeout(function () {

                        callOrder.push('process ' + task);
                        callback('error', 'arg');
                    }, delays.shift());
                });

                var genTask = generateTask.bind(null, q, callOrder);

                q.push(1, genTask(3, 1));
                q.push(2, genTask(2, 2));
                q.push(3, genTask(1, 3));
                q.push(4, genTask(0, 4));

                expect(q.length()).to.equal(4);
                expect(q.concurrency).to.equal(1);

                q.drain = function () {

                    expect(callOrder).to.deep.equal([
                        'process 1', 'callback 1',
                        'process 2', 'callback 2',
                        'process 3', 'callback 3',
                        'process 4', 'callback 4'
                    ]);

                    expect(q.concurrency).to.equal(1);
                    expect(q.length()).to.equal(0);
                    done();
                };
            });

            it('propagates errors from task objects', function (done) {

                var results = [];

                var q = Insync.queue(function (shouldError, callback) {

                    callback(shouldError ? new Error() : null);
                }, 2);

                q.drain = function () {

                    expect(results).to.deep.equal(['bar', 'foo']);
                    done();
                };

                q.push(true, function (err) {

                    expect(err).to.exist();
                    results.push('bar');
                });

                q.push(false, function (err) {

                    expect(err).to.not.exist();
                    results.push('foo');
                });
            });

            it('supports changing concurrency', function (done) {

                var callOrder = [];
                var delays = [40, 20, 60, 20];
                var q = Insync.queue(function (task, callback) {

                    setTimeout(function () {

                        callOrder.push('process ' + task);
                        callback('error', 'arg');
                    }, delays.shift());
                }, 2);

                var genTask = generateTask.bind(null, q, callOrder);

                q.push(1, genTask(3, 1));
                q.push(2, genTask(2, 2));
                q.push(3, genTask(1, 3));
                q.push(4, genTask(0, 4));

                expect(q.length()).to.equal(4);
                expect(q.concurrency).to.equal(2);
                q.concurrency = 1;

                setTimeout(function () {
                    expect(callOrder).to.deep.equal([
                        'process 1', 'callback 1',
                        'process 2', 'callback 2',
                        'process 3', 'callback 3',
                        'process 4', 'callback 4'
                    ]);

                    expect(q.length()).to.equal(0);
                    expect(q.concurrency).to.equal(1);
                    done();
                }, 250);
            });

            it('supports tasks without callback functions', function (done) {

                var callOrder = [];
                var delays = [160, 80, 240, 80];

                var q = Insync.queue(function (task, callback) {

                    setTimeout(function () {

                        callOrder.push('process ' + task);
                        callback('error', 'arg');
                    }, delays.shift());
                }, 2);

                q.push(1);
                q.push(2);
                q.push(3);
                q.push(4);

                setTimeout(function () {

                    expect(callOrder).to.deep.equal([
                        'process 2',
                        'process 1',
                        'process 4',
                        'process 3'
                    ]);
                    done();
                }, 800);
            });

            it('supports unshifting tasks', function (done) {

                var queueOrder = [];
                var q = Insync.queue(function (task, callback) {

                    queueOrder.push(task);
                    callback();
                }, 1);

                q.unshift(4);
                q.unshift(3);
                q.unshift(2);
                q.unshift(1);

                setTimeout(function () {

                    expect(queueOrder).to.deep.equal([1, 2, 3, 4]);
                    done();
                }, 100);
            });

            it('throws an error when executing callback too many times', function (done) {

                var q = Insync.queue(function (task, callback) {

                    callback();
                    expect(function() {

                        callback();
                    }).to.throw();
                    done();
                });

                q.push(1);
            });

            it('supports queing an array of tasks', function (done) {

                var callOrder = [];
                var delays = [160, 80, 240, 80];

                var q = Insync.queue(function (task, callback) {

                    setTimeout(function () {

                        callOrder.push('process ' + task);
                        callback('error', task);
                    }, delays.shift());
                }, 2);

                q.push([1, 2, 3, 4], function (err, arg) {

                    expect(err).to.equal('error');
                    callOrder.push('callback ' + arg);
                });

                expect(q.length()).to.equal(4);
                expect(q.concurrency).to.equal(2);

                setTimeout(function () {

                    expect(callOrder).to.deep.equal([
                        'process 2', 'callback 2',
                        'process 1', 'callback 1',
                        'process 4', 'callback 4',
                        'process 3', 'callback 3'
                    ]);
                    expect(q.concurrency).to.equal(2);
                    expect(q.length()).to.equal(0);
                    done();
                }, 800);
            });

            it('keeps track of idle state', function (done) {

                var q = Insync.queue(function (task, callback) {

                    expect(q.idle()).to.be.false();
                    callback();
                }, 1);

                expect(q.idle()).to.be.true();

                q.unshift(4);
                q.unshift(3);
                q.unshift(2);
                q.unshift(1);

                expect(q.idle()).to.be.false();

                q.drain = function () {

                    expect(q.idle()).to.be.true();
                    done();
                };
            });

            it('supports pausing', function (done) {

                var callOrder = [];
                var taskTimeout = 100;
                var pauseTimeout = 300;
                var resumeTimeout = 500;
                var tasks = [1, 2, 3, 4, 5, 6];

                var elapsed = (function () {

                    var start = Date.now();
                    return function () {

                        return Math.floor((Date.now() - start) / 100) * 100;
                    };
                }());

                var q = Insync.queue(function (task, callback) {

                    callOrder.push('process ' + task);
                    callOrder.push('timeout ' + elapsed());
                    callback();
                });

                var pushTask = function () {

                    var task = tasks.shift();

                    if (!task) {
                        return;
                    }

                    setTimeout(function () {

                        q.push(task);
                        pushTask();
                    }, taskTimeout);
                };

                pushTask();

                setTimeout(function () {

                    q.pause();
                    expect(q.paused).to.be.true();

                    // Call pause() when already paused
                    q.pause();
                    expect(q.paused).to.be.true();
                }, pauseTimeout);

                setTimeout(function () {

                    q.resume();
                    expect(q.paused).to.be.false();

                    // Call resume() when not paused
                    q.resume();
                    expect(q.paused).to.be.false();
                }, resumeTimeout);

                setTimeout(function () {

                    expect(callOrder).to.deep.equal([
                        'process 1', 'timeout 100',
                        'process 2', 'timeout 200',
                        'process 3', 'timeout 500',
                        'process 4', 'timeout 500',
                        'process 5', 'timeout 500',
                        'process 6', 'timeout 600'
                    ]);
                    done();
                }, 800);
            });

            it('supports pausing with concurrency', function (done) {

                var callOrder = [];
                var taskTimeout = 100;
                var pauseTimeout = 300;
                var resumeTimeout = 500;
                var tasks = [1, 2, 3, 4, 5, 6];

                var elapsed = (function () {

                    var start = Date.now();
                    return function () {

                        return Math.floor((Date.now() - start) / 100) * 100;
                    };
                }());

                var q = Insync.queue(function (task, callback) {

                    callOrder.push('process ' + task);
                    callOrder.push('timeout ' + elapsed());
                    callback();
                }, 2);

                var pushTask = function () {

                    var task = tasks.shift();

                    if (!task) {
                        return;
                    }

                    setTimeout(function () {

                        q.push(task);
                        pushTask();
                    }, taskTimeout);
                };

                pushTask();

                setTimeout(function () {

                    q.pause();
                    expect(q.paused).to.be.true();
                }, pauseTimeout);

                setTimeout(function () {

                    q.resume();
                    expect(q.paused).to.be.false();
                }, resumeTimeout);

                setTimeout(function () {

                    expect(callOrder).to.deep.equal([
                        'process 1', 'timeout 100',
                        'process 2', 'timeout 200',
                        'process 3', 'timeout 500',
                        'process 4', 'timeout 500',
                        'process 5', 'timeout 500',
                        'process 6', 'timeout 600'
                    ]);
                    done();
                }, 800);
            });

            it('supports killing the queue', function (done) {

                var callbackCalled = false;
                var drainCalled = false;

                var q = Insync.queue(function (task, callback) {

                    setTimeout(function () {

                        callbackCalled = true;
                        callback();
                    }, 300);
                });

                q.drain = function() {

                    drainCalled = true;
                };

                q.push(0);
                q.kill();

                setTimeout(function() {

                    expect(q.length()).to.equal(0);
                    expect(drainCalled).to.be.false();
                    expect(callbackCalled).to.be.false();
                    done();
                }, 600);
            });

            it('calls drain when empty task array is added to empty queue', function (done) {

                var calls = [];

                var q = Insync.queue(function (task, cb) {

                    expect(true).to.equal(false);
                }, 3);

                q.drain = function () {

                    expect(q.length()).to.equal(0);
                    expect(q.running()).to.equal(0);
                    done();
                };

                q.push([]);
            });

            it('maintains started property', function (done) {

                var q = Insync.queue(function(task, cb) {});

                expect(q.started).to.equal(false);
                q.push([]);
                expect(q.started).to.equal(true);
                done();
            });

            it('supports saturated, empty, and drain events', function (done) {

                var calls = [];

                var q = Insync.queue(function (task, cb) {

                    calls.push(task);
                    setImmediate(cb);
                }, 10);

                q.concurrency = 3;

                q.saturated = function () {

                    expect(q.length()).to.equal(3);
                    calls.push('saturated');
                };

                q.empty = function () {

                    expect(q.length()).to.equal(0);
                    calls.push('empty');
                };

                q.drain = function () {

                    expect(q.length()).to.equal(0);
                    expect(q.running()).to.equal(0);
                    calls.push('drain');
                    expect(calls).to.deep.equal([
                        'saturated',
                        '1',
                        '2',
                        '3',
                        '1 cb',
                        '4',
                        '2 cb',
                        'empty',
                        '5',
                        '3 cb',
                        '4 cb',
                        '5 cb',
                        'drain'
                    ]);
                    done();
                };

                q.push('1', function () { calls.push('1 cb'); });
                q.push('2', function () { calls.push('2 cb'); });
                q.push('3', function () { calls.push('3 cb'); });
                q.push('4', function () { calls.push('4 cb'); });
                q.push('5', function () { calls.push('5 cb'); });
            });
        });

        describe('#iterator', function () {

            it('creates an iterator function', function (done) {

                var callOrder = [];

                var iterator = Insync.iterator([
                    function () {

                        callOrder.push(1);
                    },
                    function (arg1) {

                        expect(arg1).to.equal('arg1');
                        callOrder.push(2);
                    },
                    function (arg1, arg2) {

                        expect(arg1).to.equal('arg1');
                        expect(arg2).to.equal('arg2');
                        callOrder.push(3);
                    }
                ]);

                iterator();
                expect(callOrder).to.deep.equal([1]);
                var iterator2 = iterator();
                expect(callOrder).to.deep.equal([1, 1]);
                var iterator3 = iterator2('arg1');
                expect(callOrder).to.deep.equal([1, 1, 2]);
                var iterator4 = iterator3('arg1', 'arg2');
                expect(callOrder).to.deep.equal([1, 1, 2, 3]);
                expect(iterator4).to.not.exist();
                done();
            });

            it('can iterate using next()', function (done) {

                var callOrder = [];

                var iterator = Insync.iterator([
                    function () {

                        callOrder.push(1);
                    },
                    function (arg1) {

                        expect(arg1).to.equal('arg1');
                        callOrder.push(2);
                    },
                    function (arg1, arg2) {

                        expect(arg1).to.equal('arg1');
                        expect(arg2).to.equal('arg2');
                        callOrder.push(3);
                    }
                ]);

                var fn = iterator.next();
                var iterator2 = fn('arg1');
                expect(callOrder).to.deep.equal([2]);
                iterator2('arg1','arg2');
                expect(callOrder).to.deep.equal([2, 3]);
                expect(iterator2.next()).to.not.exist();
                done();
            });

            it('handles an empty array', function (done) {

                var iterator = Insync.iterator([]);

                expect(iterator()).to.not.exist();
                expect(iterator.next()).to.not.exist();
                done();
            });
        });

        describe('#retry', function () {

            it('all attempts error', function (done) {

                var times = 3;
                var callCount = 0;

                var fn = function (callback, results) {

                    callCount++;
                    callback(new Error(callCount), callCount);
                };

                Insync.retry(times, fn, function (err, result) {

                    expect(callCount).to.equal(times);
                    expect(err).to.exist();
                    expect(err.message).to.equal(times + '');
                    expect(result).to.equal(callCount);
                    done();
                });
            });

            it('attempt succeeds', function (done) {

                var callCount = 0;
                var failed = false;

                var fn = function (callback, results) {

                    callCount++;

                    if (failed) {
                        return callback(null, callCount);
                    }

                    failed = true;
                    callback(new Error(callCount), callCount);
                };

                Insync.retry(3, fn, function (err, result) {

                    expect(callCount).to.equal(2);
                    expect(err).to.not.exist();
                    expect(result).to.equal(2);
                    done();
                });
            });

            it('uses default number of retries', function (done) {

                var times = 5;
                var callCount = 0;

                var fn = function (callback, results) {

                    callCount++;
                    callback(new Error(callCount), callCount);
                };

                Insync.retry(fn, function (err, result) {

                    expect(callCount).to.equal(times);
                    expect(err).to.exist();
                    expect(err.message).to.equal(times + '');
                    expect(result).to.equal(callCount);
                    done();
                });
            });

            it('uses default number of retries if times is falsey', function (done) {

                var times = 5;
                var callCount = 0;

                var fn = function (callback, results) {

                    callCount++;
                    callback(new Error(callCount), callCount);
                };

                Insync.retry(0, fn, function (err, result) {

                    expect(callCount).to.equal(times);
                    expect(err).to.exist();
                    expect(err.message).to.equal(times + '');
                    expect(result).to.equal(callCount);
                    done();
                });
            });

            it('as an embedded task', function (done) {

                var retryResult = 'RETRY';
                var fooResults;
                var retryResults;

                Insync.auto({
                    foo: function (callback, results) {

                        fooResults = results;
                        callback(null, 'FOO');
                    },
                    retry: Insync.retry(function (callback, results) {

                        retryResults = results;
                        callback(null, retryResult);
                    })
                }, function (err, results) {

                    expect(err).to.not.exist();
                    expect(results.retry).to.deep.equal(retryResult);
                    expect(fooResults).to.equal(retryResults);
                    done();
                });
            });
        });

        describe('#auto', function () {

            it('determines the best order to run tasks', function (done) {

                var callOrder = [];

                Insync.auto({
                    task1: ['task2', function (callback) {

                        setTimeout(function () {

                            callOrder.push('task1');
                            callback(null, 1, 10);
                        }, 25);
                    }],
                    task2: function (callback) {

                        setTimeout(function () {

                            callOrder.push('task2');
                            callback(null, 2);
                        }, 50);
                    },
                    task3: ['task2', function (callback) {

                        callOrder.push('task3');
                        callback(null, 3);
                    }],
                    task4: ['task1', 'task2', function(callback) {

                        callOrder.push('task4');
                        callback(null, 4);
                    }],
                    task5: ['task2', function (callback) {

                        setTimeout(function () {

                            callOrder.push('task5');
                            callback();
                        }, 0);
                    }],
                    task6: ['task2', function (callback) {

                        callOrder.push('task6');
                        callback(null, 6);
                    }]
                }, function (err, results) {

                    expect(err).to.not.exist();
                    expect(callOrder).to.deep.equal(['task2','task6','task3','task5','task1','task4']);
                    expect(results).to.deep.equal({
                        task1: [1, 10],
                        task2: 2,
                        task3: 3,
                        task4: 4,
                        task5: undefined,
                        task6: 6
                    });
                    done();
                });
            });

            it('petrify', function (done) {

                var callOrder = [];

                Insync.auto({
                    task1: ['task2', function (callback) {

                        setTimeout(function () {

                            callOrder.push('task1');
                            callback();
                        }, 100);
                    }],
                    task2: function (callback) {

                        setTimeout(function () {

                            callOrder.push('task2');
                            callback();
                        }, 200);
                    },
                    task3: ['task2', function (callback) {

                        callOrder.push('task3');
                        callback();
                    }],
                    task4: ['task1', 'task2', function (callback) {

                        callOrder.push('task4');
                        callback();
                    }]
                }, function (err) {

                    expect(err).to.not.exist();
                    expect(callOrder).to.deep.equal(['task2', 'task3', 'task1', 'task4']);
                    done();
                });
            });

            it('handles an empty object', function (done) {

                Insync.auto({}, function (err) {

                    expect(err).to.not.exist();
                    done();
                });
            });

            it('works when no callback is provided', function (done) {

                var noop = Common.noop;

                Common.noop = function (error) {

                    Common.noop = noop;
                    expect(error).to.not.exist();
                    done();
                };

                Insync.auto({
                    task1: function (callback) { callback(); },
                    task2: ['task1', function (callback) { callback(); }]
                });
            });

            it('handles errors from tasks', function (done) {

                Insync.auto({
                    task1: function (callback) {

                        callback(new Error(1));
                    },
                    task2: ['task1', function (callback) {

                        expect(true).to.equal(false);
                        callback();
                    }],
                    task3: function (callback) {

                        callback(new Error(2));
                    }
                }, function (err) {

                    expect(err).to.exist();
                    expect(err.message).to.equal('1');
                    done();
                });
            });

            it('passes partial results on errors', function (done) {

                Insync.auto({
                    task1: function (callback) {

                        callback(null, 'result1');
                    },
                    task2: ['task1', function (callback) {

                        callback(new Error(1), 'result2');
                    }],
                    task3: ['task2', function (callback) {

                        expect(true).to.equal(false);
                    }]
                }, function (err, results) {

                    expect(err).to.exist();
                    expect(err.message).to.equal('1');
                    expect(results).to.exist();
                    expect(results.task1).to.equal('result1');
                    expect(results.task2).to.equal('result2');
                    done();
                });
            });

            it('removeListener() has side effect on loop iterator', function (done) {

                Insync.auto({
                    task1: ['task3', function (callback) { done(); }],
                    task2: ['task3', function (callback) { /* by design: don't call callback */ }],
                    task3: function (callback) { callback(); }
                });
            });

            it('modifying results does not cause final callback to run early', function (done) {

                Insync.auto({
                    task1: function (callback, results) {

                        results.inserted = true;
                        callback(null, 'task1');
                    },
                    task2: function (callback) {

                        setTimeout(function () {

                            callback(null, 'task2');
                        }, 50);
                    },
                    task3: function (callback) {

                        setTimeout(function () {

                            callback(null, 'task3');
                        }, 100);
                    }
                }, function (err, results) {

                    expect(err).to.not.exist();
                    expect(results.inserted).to.equal(true);
                    expect(results).to.deep.equal({
                        task1: 'task1',
                        task2: 'task2',
                        task3: 'task3',
                        inserted: true
                    });
                    done();
                });
            });

            it('calls callback multiple times', function (done) {

                var domain = Domain.create();
                var finalCallCount = 0;

                domain.on('error', function (e) {

                    // Ignore test error
                    if (!e._testError) {
                        return test.done(e);
                    }
                });

                domain.run(function () {

                    Insync.auto({
                        task1: function (callback) { callback(null); },
                        task2: ['task1', function (callback) { callback(null); }]
                    }, function (err) {

                        // Error throwing final callback. This should only run once
                        finalCallCount++;
                        var error = new Error();
                        error._testError = true;
                        throw error;
                    });
                });

                setTimeout(function () {

                    expect(finalCallCount).to.equal(1);
                    done();
                }, 100);
            });
        });

        describe('#priorityQueue', function () {

            it('completes tasks in priority order', function (done) {

                var callOrder = [];

                // Order of completion: 2, 1, 4, 5, 3

                var q = Insync.priorityQueue(function (task, callback) {

                    callOrder.push('task ' + task);
                    callback(new Error(task), task);
                }, 1);

                q.push(1, 1.4, function (err, arg) {

                    expect(err).to.exist();
                    expect(err.message).to.equal('1');
                    expect(arg).to.equal(1);
                    expect(q.length()).to.equal(3);
                    callOrder.push('callback 1');
                });

                q.push(2, 0.2, function (err, arg) {

                    expect(err).to.exist();
                    expect(err.message).to.equal('2');
                    expect(arg).to.equal(2);
                    expect(q.length()).to.equal(4);
                    callOrder.push('callback 2');
                });

                q.push(3, 3.8, function (err, arg) {

                    expect(err).to.exist();
                    expect(err.message).to.equal('3');
                    expect(arg).to.equal(3);
                    expect(q.length()).to.equal(0);
                    callOrder.push('callback 3');
                });

                q.push([4, 5], 2.9, function (err, arg) {

                    expect(err).to.exist();

                    if (arg === 4) {
                        expect(err.message).to.equal('4');
                        expect(q.length()).to.equal(2);
                        return callOrder.push('callback 4');
                    }
                    else if (arg === 5) {
                        expect(err.message).to.equal('5');
                        expect(q.length()).to.equal(1);
                        return callOrder.push('callback 5');
                    }

                    expect(true).to.be.false();
                });

                expect(q.length()).to.equal(5);
                expect(q.concurrency).to.equal(1);

                q.drain = function () {

                    expect(callOrder).to.deep.equal([
                        'task 2', 'callback 2',
                        'task 1', 'callback 1',
                        'task 4', 'callback 4',
                        'task 5', 'callback 5',
                        'task 3', 'callback 3'
                    ]);
                    expect(q.concurrency).to.equal(1);
                    expect(q.length()).to.equal(0);
                    done();
                };
            });

            it('supports concurrency', function (done) {

                var callOrder = [];
                var delays = [160, 80, 240, 80];

                // worker1: --2-3
                // worker2: -1---4
                // Order of completion: 1, 2, 3, 4

                var q = Insync.priorityQueue(function (task, callback) {

                    setTimeout(function () {

                        callOrder.push('task ' + task);
                        callback(new Error(task), task);
                    }, delays.splice(0, 1)[0]);
                }, 2);

                q.push(1, 1.4, function (err, arg) {

                    expect(err).to.exist();
                    expect(err.message).to.equal('1');
                    expect(arg).to.equal(1);
                    expect(q.length()).to.equal(2);
                    callOrder.push('callback ' + 1);
                });

                q.push(2, 0.2, function (err, arg) {

                    expect(err).to.exist();
                    expect(err.message).to.equal('2');
                    expect(arg).to.equal(2);
                    expect(q.length()).to.equal(1);
                    callOrder.push('callback ' + 2);
                });

                q.push(3, 3.8, function (err, arg) {

                    expect(err).to.exist();
                    expect(err.message).to.equal('3');
                    expect(arg).to.equal(3);
                    expect(q.length()).to.equal(0);
                    callOrder.push('callback ' + 3);
                });

                q.push(4, 2.9, function (err, arg) {

                    expect(err).to.exist();
                    expect(err.message).to.equal('4');
                    expect(arg).to.equal(4);
                    expect(q.length()).to.equal(0);
                    callOrder.push('callback ' + 4);
                });

                expect(q.length()).to.equal(4);
                expect(q.concurrency).to.equal(2);

                q.drain = function () {

                    expect(callOrder).to.deep.equal([
                        'task 1', 'callback 1',
                        'task 2', 'callback 2',
                        'task 3', 'callback 3',
                        'task 4', 'callback 4'
                    ]);
                    expect(q.concurrency).to.equal(2);
                    expect(q.length()).to.equal(0);
                    done();
                };
            });

            it('calls drain() when empty data is inserted in empty queue', function (done) {

                var q = Insync.priorityQueue(function (task, callback) {

                    expect(true).to.be.false();
                }, 1);

                q.drain = function () {

                    expect(q.concurrency).to.equal(1);
                    expect(q.length()).to.equal(0);
                    done();
                };

                q.push([], 1.0, function (err, arg) {

                    expect(true).to.be.false();
                });

                expect(q.length()).to.equal(0);
                expect(q.concurrency).to.equal(1);
            });

            it('does nothing when empty data is inserted in empty queue with no drain()', function (done) {

                var q = Insync.priorityQueue(function (task, callback) {

                    expect(true).to.be.false();
                }, 1);

                q.push([], 1.0, function (err, arg) {

                    expect(true).to.be.false();
                });

                expect(q.length()).to.equal(0);
                expect(q.concurrency).to.equal(1);
                setTimeout(done, 400);
            });

            it('handles tasks with no callback', function (done) {

                var callOrder = [];

                var q = Insync.priorityQueue(function (task, callback) {

                    callOrder.push('task ' + task);
                    callback(null, task);
                }, 1);

                q.drain = function () {

                    expect(callOrder).to.deep.equal(['task 1']);
                    expect(q.concurrency).to.equal(1);
                    expect(q.length()).to.equal(0);
                    done();
                };

                q.push(1, 1.0);
                expect(q.length()).to.equal(1);
                expect(q.concurrency).to.equal(1);
            });

            it('calls saturated() on saturation', function (done) {

                var callOrder = [];

                var q = Insync.priorityQueue(function (task, callback) {

                    callOrder.push('task ' + task);
                    callback(null, task);
                }, 1);

                q.saturated = function () { callOrder.push('saturated'); };

                q.drain = function () {

                    expect(callOrder).to.deep.equal(['saturated', 'task 1', 'callback 1']);
                    expect(q.concurrency).to.equal(1);
                    expect(q.length()).to.equal(0);
                    done();
                };

                q.push(1, 1.0, function (err, arg) {

                    expect(err).to.not.exist();
                    expect(arg).to.equal(1);
                    callOrder.push('callback 1');
                });

                expect(q.length()).to.equal(1);
                expect(q.concurrency).to.equal(1);
            });
        });

        describe('#cargo', function () {

            it('supports default behavior', function (done) {

                var callOrder = [];
                var delays = [160, 160, 80];

                // Worker: --12--34--5-
                // Order of completion: 1, 2, 3, 4, 5

                var c = Insync.cargo(function (tasks, callback) {

                    expect(c.running()).to.be.true();
                    setTimeout(function () {

                        var task = tasks.join(' ');

                        callOrder.push('task ' + task);
                        callback(new Error(task), task);
                    }, delays.shift());
                }, 2);

                c.push(1, function (err, arg) {

                    expect(c.running()).to.be.false();
                    expect(err).to.exist();
                    expect(err.message).to.equal('1 2');
                    expect(arg).to.equal('1 2');
                    expect(c.length()).to.equal(4);
                    callOrder.push('callback 1');
                });

                c.push(2, function (err, arg) {

                    expect(c.running()).to.be.false();
                    expect(err).to.exist();
                    expect(err.message).to.equal('1 2');
                    expect(arg).to.equal('1 2');
                    expect(c.length()).to.equal(4);
                    callOrder.push('callback 2');
                });

                expect(c.length()).to.equal(2);
                expect(c.running()).to.be.false();

                // Async push
                setTimeout(function () {

                    c.push(3, function (err, arg) {

                        expect(c.running()).to.be.false();
                        expect(err).to.exist();
                        expect(err.message).to.equal('3 4');
                        expect(arg).to.equal('3 4');
                        expect(c.length()).to.equal(2);
                        callOrder.push('callback 3');
                    });
                }, 60);

                setTimeout(function () {

                    c.push(4, function (err, arg) {

                        expect(c.running()).to.be.false();
                        expect(err).to.exist();
                        expect(err.message).to.equal('3 4');
                        expect(arg).to.equal('3 4');
                        expect(c.length()).to.equal(2);
                        callOrder.push('callback 4');
                    });

                    expect(c.length()).to.equal(2);

                    var c5 = true;

                    c.push([5, 6], function (err, arg) {

                        expect(c.running()).to.be.false();
                        expect(err).to.exist();
                        expect(err.message).to.equal('5 6');
                        expect(arg).to.equal('5 6');
                        expect(c.length()).to.equal(0);
                        callOrder.push('callback 5 6');
                    });
                }, 120);

                setTimeout(function () {

                    expect(c.running()).to.be.false();
                    expect(callOrder).to.deep.equal([
                        'task 1 2', 'callback 1', 'callback 2',
                        'task 3 4', 'callback 3', 'callback 4',
                        'task 5 6', 'callback 5 6', 'callback 5 6'
                    ]);
                    expect(c.length()).to.equal(0);
                    done();
                }, 800);
            });

            it('drains once', function (done) {

                var c = Insync.cargo(function (tasks, callback) {

                    callback();
                }, 3);

                var drainCounter = 0;

                c.drain = function () { drainCounter++; };

                for (var i = 0; i < 10; ++i) {
                    c.push(i);
                }

                setTimeout(function () {

                    expect(drainCounter).to.equal(1);
                    done();
                }, 100);
            });

            it('drains twice', function (done) {

                var c = Insync.cargo(function (tasks, callback) {

                    callback();
                }, 3);

                var loadCargo = function () {

                    for (var i = 0; i < 10; ++i) {
                        c.push(i);
                    }
                };

                var drainCounter = 0;

                c.drain = function () { drainCounter++; };

                loadCargo();
                setTimeout(loadCargo, 200);
                setTimeout(function () {

                    expect(drainCounter).to.equal(2);
                    done();
                }, 400);
            });

            it('calls saturated() on saturation', function (done) {

                var callOrder = [];

                var c = Insync.cargo(function (tasks, callback) {

                    setTimeout(function () {

                        var task = tasks.join(' ');

                        callOrder.push('task ' + task);
                        callback(null, task);
                    }, 10);
                }, 1);

                c.saturated = function () { callOrder.push('saturated'); };

                c.drain = function () {

                    expect(callOrder).to.deep.equal(['saturated', 'task 1', 'callback 1']);
                    done();
                };

                c.push(1, function (err, arg) {

                    expect(err).to.not.exist();
                    expect(arg).to.equal('1');
                    expect(c.length()).to.equal(0);
                    callOrder.push('callback 1');
                });

                expect(c.length()).to.equal(1);
            });

            it('calls empty() when the last item is given to a worker', function (done) {

                var callOrder = [];

                var c = Insync.cargo(function (tasks, callback) {

                    setTimeout(function () {

                        var task = tasks.join(' ');

                        callOrder.push('task ' + task);
                        callback(null, task);
                    }, 10);
                }, 1);

                c.empty = function () { callOrder.push('empty'); };

                c.drain = function () {

                    expect(callOrder).to.deep.equal(['empty', 'task 1', 'callback 1']);
                    done();
                };

                c.push(1, function (err, arg) {

                    expect(err).to.not.exist();
                    expect(arg).to.equal('1');
                    expect(c.length()).to.equal(0);
                    callOrder.push('callback 1');
                });

                expect(c.length()).to.equal(1);
            });

            it('handles omitted payload size', function (done) {

                var callOrder = [];
                var delays = [120, 40];

                // Worker: -1234-
                // Order of completion: 1, 2, 3, 4

                var c = Insync.cargo(function (tasks, callback) {

                    setTimeout(function () {

                        var task = tasks.join(' ');

                        callOrder.push('task ' + task);
                        callback(null, task);
                    }, delays.shift());
                });

                c.drain = function () {

                    expect(callOrder).to.deep.equal([
                        'task 1 2 3 4',
                        'callback 1 2 3 4',
                        'callback 1 2 3 4',
                        'callback 1 2 3 4',
                        'callback 1 2 3 4'
                    ]);
                    expect(c.length()).to.equal(0);
                    done();
                };

                c.push([1, 2, 3, 4], function (err, arg) {

                    expect(err).to.not.exist();
                    expect(arg).to.equal('1 2 3 4');
                    callOrder.push('callback ' + arg);
                });

                expect(c.length()).to.equal(4);
            });
        });
    });

    describe('Util', function () {

        describe('#memoize', function () {

            it('successfully memoizes a function', function (done) {

                var originalCalls = [];

                var fn = function (arg1, arg2, callback) {

                    originalCalls.push([arg1, arg2]);
                    callback(null, arg1 + arg2);
                };

                var memoized = Insync.memoize(fn);

                memoized(1, 2, function (err, result) {

                    expect(result).to.equal(3);
                    memoized(1, 2, function (err, result) {

                        expect(result).to.equal(3);
                        memoized(2, 2, function (err, result) {

                            expect(result).to.equal(4);
                            expect(originalCalls.length).to.equal(2);
                            expect(originalCalls[0]).to.deep.equal([1, 2]);
                            expect(originalCalls[1]).to.deep.equal([2, 2]);
                            done();
                        });
                    });
                });
            });

            it('supports customer hasher functions', function (done) {

                var fn = function (arg1, arg2, callback) {

                    callback(null, arg1 + arg2);
                };

                var memoized = Insync.memoize(fn, function (item) {

                    return 'foo';
                });

                memoized(1, 2, function (err, result) {

                    expect(result).to.equal(3);
                    memoized(2, 2, function (err, result) {

                        expect(result).to.equal(3);
                        done();
                    });
                });
            });

            it('allows multiple callbacks on asynchronous operations', function (done) {

                var timesCalled = 0;
                var originalCalls = [];

                var fn = function (arg1, arg2, callback) {

                    setImmediate(function () {

                        originalCalls.push([arg1, arg2]);
                        callback(null, arg1 + arg2);
                    });
                };

                var cb = function (err, result) {

                    timesCalled++;

                    if (timesCalled === 2) {
                        expect(originalCalls.length).to.equal(1);
                        expect(originalCalls[0]).to.deep.equal([1, 2]);
                        done();
                    }
                };

                var memoized = Insync.memoize(fn);

                memoized(1, 2, cb);
                memoized(1, 2, cb);
            });

            it('allows inputs to be manually cached', function (done) {

                var fn = function (arg, callback) {

                    callback(new Error('should not be called'));
                };

                var memoized = Insync.memoize(fn);

                memoized.memo.foo = [null, 'bar'];
                memoized('foo', function (err, value) {

                    expect(err).to.not.exist();
                    expect(value).to.equal('bar');
                    memoized('baz', function (err, value) {

                        expect(err).to.exist();
                        expect(value).to.not.exist();
                        done();
                    });
                });
            });
        });

        describe('#unmemoize', function () {

            it('successfully unmemoizes a function', function (done) {

                var originalCalls = [];

                var fn = function (arg1, arg2, callback) {

                    originalCalls.push([arg1, arg2]);
                    callback(null, arg1 + arg2);
                };

                var memoized = Insync.memoize(fn);
                var unmemoized = Insync.unmemoize(memoized);

                unmemoized(1, 2, function (err, result) {

                    expect(result).to.equal(3);
                    unmemoized(1, 2, function (err, result) {

                        expect(result).to.equal(3);
                        unmemoized(2, 2, function (err, result) {

                            expect(result).to.equal(4);
                            expect(originalCalls.length).to.equal(3);
                            expect(originalCalls[0]).to.deep.equal([1, 2]);
                            expect(originalCalls[1]).to.deep.equal([1, 2]);
                            expect(originalCalls[2]).to.deep.equal([2, 2]);
                            done();
                        });
                    });
                });
            });

            it('works with a non-memoized function', function (done) {

                var originalCalls = [];

                var fn = function (arg1, arg2, callback) {

                    callback(null, arg1 + arg2);
                };

                var unmemoized = Insync.unmemoize(fn);

                fn(1, 2, function (err, sum1) {

                    unmemoized(1, 2, function (err, sum2) {

                        expect(sum1).to.equal(sum2);
                        done();
                    });
                });
            });
        });

        describe('#log', function () {

            it('displays the results of a function', function (done) {

                var log = console.log;

                console.log = function () {

                    console.log = log;
                    expect(arguments.length).to.equal(1);
                    expect(arguments[0]).to.equal('foo');
                    done();
                };

                var fn = function (callback) {

                    setImmediate(function () {

                        callback(null, 'foo');
                    });
                };

                Insync.log(fn);
            });

            it('handles additional arguments after the function', function (done) {

                var log = console.log;

                console.log = function () {

                    console.log = log;
                    expect(arguments.length).to.equal(1);
                    expect(arguments[0]).to.equal('foobarbaz');
                    done();
                };

                var fn = function (arg1, arg2, callback) {

                    setImmediate(function () {

                        callback(null, 'foo' + arg1 + arg2);
                    });
                };

                Insync.log(fn, 'bar', 'baz');
            });

            it('handles errors returned by the asynchronous function', function (done) {

                var error = console.error;

                console.error = function () {

                    console.error = error;
                    expect(arguments.length).to.equal(1);
                    expect(arguments[0].message).to.equal('foo');
                    done();
                };

                var fn = function (callback) {

                    setImmediate(function () {

                        callback(new Error('foo'));
                    });
                };

                Insync.log(fn);
            });

            it('does not error if console.log() has been removed', function (done) {

                var log = console.log;
                var write = process.stdout.write;
                var writeAttempted = false;

                process.stdout.write = function () {

                    writeAttempted = true;
                };

                delete console.log;
                Object.defineProperty(console, 'log', {
                    configurable: true,
                    get: function () {

                        process.nextTick(function () {

                            delete console.log;
                            console.log = log;
                            process.stdout.write = write;
                            expect(writeAttempted).to.equal(false);
                            done();
                        });

                        return undefined;
                    }
                });

                var fn = function (callback) {

                    setImmediate(function () {

                        callback(null, 'foo');
                    });
                };

                Insync.log(fn);
            });
        });

        describe('#dir', function () {

            // Theses tests would just be a duplicate of Insync.log.
            // Including a single test for completeness.

            it('displays the results of a function', function (done) {

                var dir = console.dir;

                console.dir = function () {

                    console.dir = dir;
                    expect(arguments.length).to.equal(1);
                    expect(arguments[0]).to.equal('foo');
                    done();
                };

                var fn = function (callback) {

                    setImmediate(function () {

                        callback(null, 'foo');
                    });
                };

                Insync.dir(fn);
            });
        });

        describe('#noConflict', function () {

            it('returns a reference to the original Insync', function (done) {

                expect(Insync.noConflict()).to.equal(Insync);
                done();
            });
        });
    });

    describe('Common', function () {

        describe('#onlyOnce', function () {

            it('does not throw if function is called once', function (done) {

                var fn = Common.onlyOnce(Common.noop);

                expect(fn).to.not.throw();
                done();
            });

            it('throws an error if function is called more than once', function (done) {

                var fn = Common.onlyOnce(Common.noop);

                fn();
                expect(fn).to.throw('Callback was already called.');
                done();
            });
        });
    });
});
