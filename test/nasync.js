// Load Modules

var Code = require('code');
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var Nasync = require('../lib');
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

describe('Nasync', function () {

    describe('Collection', function () {

        describe('#each', function () {

            it('iterates over a collection of items in parallel', function (done) {

                var result = [];

                Nasync.each([4, 3, 2, 1], internals.eachAsync(result), function (error) {

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

                Nasync.each([4], internals.doNothing);
            });

            it('short circuits if the array is empty', function (done) {

                Nasync.each([], Common.noop, function (error) {

                    expect(error).to.not.exist();
                    done();
                });
            });

            it('sends an error when it occurs', function (done) {

                Nasync.each([1], function (item, callback) {

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

                expect(Nasync.each).to.equal(Nasync.forEach);
                done();
            });
        });

        describe('#eachSeries', function () {

            it('iterates over a collection of items in series', function (done) {

                var result = [];

                Nasync.eachSeries([1,3,2], internals.eachAsync(result), function (error) {

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

                Nasync.eachSeries([1], internals.doNothing);
            });

            it('short circuits if the array is empty', function (done) {

                Nasync.eachSeries([], Common.noop, function (error) {

                    expect(error).to.not.exist();
                    done();
                });
            });

            it('sends an error when it occurs', function (done) {

                Nasync.eachSeries([1], function (item, callback) {

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

                expect(Nasync.eachSeries).to.equal(Nasync.forEachSeries);
                done();
            });
        });

        describe('#eachLimit', function () {

            it('iterates over a collection with a limit', function (done) {

                var arr = [0, 1, 2, 3];
                var result = [];

                Nasync.eachLimit(arr, 2, internals.eachAsync(result), function (err) {

                    expect(err).to.not.exist();
                    expect(result).to.deep.equal(arr);
                    done();
                });
            });

            it('does not call iterator if array is empty', function (done) {

                Nasync.eachLimit([], 2, function (item, callback) {

                    expect(true).to.equal(false);
                }, function (err) {

                    expect(err).to.not.exist();
                    done();
                });
            });

            it('does not call iterator if limit is zero', function (done) {

                Nasync.eachLimit([1, 2, 3], 0, function (item, callback) {

                    expect(true).to.equal(false);
                }, function (err) {

                    expect(err).to.not.exist();
                    done();
                });
            });

            it('properly passes error to final callback', function (done) {

                var arr = [0, 1, 2, 3];
                var result = [];

                Nasync.eachLimit(arr, 2, function (item, callback) {

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

                Nasync.eachLimit([1, 2, 3, 4], 2, internals.doNothing);
            });

            it('is aliased as forEachLimit()', function (done) {

                expect(Nasync.eachLimit).to.equal(Nasync.forEachLimit);
                done();
            });
        });

        describe('#map', function () {

            it('creates a mapped version of input', function (done) {

                var arr = [0, 1, 2, 3];
                var result = [];

                Nasync.map(arr, internals.mapAsync(result), function (err, mapped) {

                    expect(err).to.not.exist();
                    expect(arr).to.deep.equal([0, 1, 2, 3]);
                    expect(mapped).to.deep.equal(result);
                    done();
                });
            });

            it('works without final callback', function (done) {

                var arr = [0, 1, 2, 3];
                var result = [];

                Nasync.map(arr, function (item, callback) {

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

                Nasync.map(arr, function (item, callback) {

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

                Nasync.mapSeries(arr, internals.mapAsync(result), function (err, mapped) {

                    expect(err).to.not.exist();
                    expect(arr).to.deep.equal([0, 1, 2, 3]);
                    expect(mapped).to.deep.equal(result);
                    done();
                });
            });

            it('properly passes error to final callback', function (done) {

                var arr = [0, 1, 2, 3];
                var result = [];

                Nasync.mapSeries(arr, function (item, callback) {

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

                Nasync.mapLimit(arr, 2, internals.mapAsync(result), function (err, mapped) {

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

                Nasync.filter(arr, internals.filterAsync(callOrder), function (results) {

                    expect(arr).to.deep.equal([0, 1, 2, 3]);
                    expect(results).to.deep.equal([2, 3]);
                    done();
                });
            });

            it('is aliased as select()', function (done) {

                expect(Nasync.filter).to.equal(Nasync.select);
                done();
            });
        });

        describe('#filterSeries', function () {

            it('filters an array in series', function (done) {

                var arr = [0, 1, 2, 3];
                var callOrder = [];

                Nasync.filterSeries(arr, internals.filterAsync(callOrder), function (results) {

                    expect(arr).to.deep.equal([0, 1, 2, 3]);
                    expect(callOrder).to.deep.equal(arr);
                    expect(results).to.deep.equal([2, 3]);
                    done();
                });
            });

            it('is aliased as selectSeries()', function (done) {

                expect(Nasync.filterSeries).to.equal(Nasync.selectSeries);
                done();
            });
        });

        describe('#reject', function () {

            it('filters an array', function (done) {

                var arr = [0, 1, 2, 3];
                var callOrder = [];

                Nasync.reject(arr, internals.filterAsync(callOrder), function (results) {

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

                Nasync.rejectSeries(arr, internals.filterAsync(callOrder), function (results) {

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

                Nasync.reduce(arr, 0, internals.reduceAsync(callOrder), function (err, result) {

                    expect(err).to.not.exist();
                    expect(result).to.equal(6);
                    expect(arr).to.deep.equal([0, 1, 2, 3]);
                    expect(callOrder).to.deep.equal(arr);
                    done();
                });
            });

            it('is aliased as inject()', function (done) {

                expect(Nasync.reduce).to.equal(Nasync.inject);
                done();
            });

            it('is aliased as foldl()', function (done) {

                expect(Nasync.reduce).to.equal(Nasync.foldl);
                done();
            });
        });

        describe('#reduceRight', function () {

            it('reduces an array', function (done) {

                var arr = [0, 1, 2, 3];
                var callOrder = [];

                Nasync.reduceRight(arr, 0, internals.reduceAsync(callOrder), function (err, result) {

                    expect(err).to.not.exist();
                    expect(result).to.equal(6);
                    expect(arr).to.deep.equal([0, 1, 2, 3]);
                    expect(callOrder).to.deep.equal([3, 2, 1, 0]);
                    done();
                });
            });

            it('is aliased as foldr()', function (done) {

                expect(Nasync.reduceRight).to.equal(Nasync.foldr);
                done();
            });
        });

        describe('#detect', function () {

            it('returns the first value that passes test', function (done) {

                var arr = [0, 1, 2, 3];
                var callOrder = [];

                Nasync.detect(arr, function (item, callback) {

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

                Nasync.detect(arr, function (item, callback) {

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

        describe('#some', function () {

            it('returns true if at least one element satisfies test', function (done) {

                var arr = [0, 1, 2, 3];

                Nasync.some(arr, function (item, callback) {

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

                Nasync.some(arr, function (item, callback) {

                    setTimeout(function () {

                        callback(item === 6);
                    }, 100);
                }, function (result) {

                    expect(result).to.equal(false);
                    done();
                });
            });

            it('is aliased as any()', function (done) {

                expect(Nasync.some).to.equal(Nasync.any);
                done();
            });
        });

        describe('#every', function () {

            it('returns true if every element satisfies test', function (done) {

                var arr = [0, 1, 2, 3];

                Nasync.every(arr, function (item, callback) {

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

                Nasync.every(arr, function (item, callback) {

                    setTimeout(function () {

                        callback(item >= 1);
                    }, 100);
                }, function (result) {

                    expect(result).to.equal(false);
                    done();
                });
            });

            it('is aliased as all()', function (done) {

                expect(Nasync.every).to.equal(Nasync.all);
                done();
            });
        });

        describe('#concat', function () {

            it('concatenates results', function (done) {

                var arr = [0, 1, 2, 3];

                Nasync.concat(arr, function (item, callback) {

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

                Nasync.concat(arr, function (item, callback) {

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

                Nasync.concatSeries(arr, function (item, callback) {

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

                Nasync.sortBy(arr, function (item, callback) {

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

                Nasync.sortBy(arr, function (item, callback) {

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

                Nasync.series([
                    function (callback) { setTimeout(function () { callOrder.push(0); callback(null, 0); }, 100) },
                    function (callback) { setTimeout(function () { callOrder.push(1); callback(null, 1); }, 100) },
                    function (callback) { setTimeout(function () { callOrder.push(2); callback(null, 2, 3); }, 10) },
                ], function (err, results) {

                    expect(err).to.not.exist();
                    expect(callOrder).to.deep.equal([0, 1, 2]);
                    expect(results).to.deep.equal([0, 1, [2, 3]]);
                    done();
                });
            });

            it('executes object of functions in series', function (done) {

                var callOrder = [];

                Nasync.series({
                    zero: function (callback) { setTimeout(function () { callOrder.push(0); callback(null, 0); }, 100) },
                    one: function (callback) { setTimeout(function () { callOrder.push(1); callback(null, 1); }, 100) },
                    two: function (callback) { setTimeout(function () { callOrder.push(2); callback(null, 2, 3); }, 10) },
                }, function (err, results) {

                    expect(err).to.not.exist();
                    expect(callOrder).to.deep.equal([0, 1, 2]);
                    expect(results).to.deep.equal({ zero: 0, one: 1, two: [2, 3] });
                    done();
                });
            });

            it('handles empty array of functions', function (done) {

                Nasync.series([], function (err, results) {

                    expect(err).to.not.exist();
                    expect(results).to.deep.equal([]);
                    done();
                });
            });

            it('handles array functions that call back with no arguments', function (done) {

                Nasync.series([
                    function (callback) { setTimeout(function () { callback(); }, 100) }
                ], function (err, results) {

                    expect(err).to.not.exist();
                    expect(results).to.deep.equal([undefined]);
                    done();
                });
            });

            it('handles object functions that call back with no arguments', function (done) {

                Nasync.series({
                    zero: function (callback) { setTimeout(function () { callback(); }, 100) }
                }, function (err, results) {

                    expect(err).to.not.exist();
                    expect(results).to.deep.equal({ zero: undefined });
                    done();
                });
            });

            it('handles errors when an array is passed', function (done) {

                Nasync.series([
                    function (callback) { setTimeout(function () { callback(new Error('foo')); }, 100) }
                ], function (err, results) {

                    expect(err).to.exist();
                    done();
                });
            });

            it('handles errors when an object is passed', function (done) {

                Nasync.series({
                    zero: function (callback) { setTimeout(function () { callback(new Error('foo')); }, 100) }
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

                Nasync.series({
                    zero: function (callback) { setTimeout(function () { callback(null, 0); }, 100) }
                });
            });
        });

        describe('#parallel', function () {

            it('executes array of functions in parallel', function (done) {

                var callOrder = [];

                Nasync.parallel([
                    function (callback) { setTimeout(function () { callOrder.push(0); callback(null, 0); }, 50) },
                    function (callback) { setTimeout(function () { callOrder.push(1); callback(null, 1); }, 100) },
                    function (callback) { setTimeout(function () { callOrder.push(2); callback(null, 2, 3); }, 10) },
                ], function (err, results) {

                    expect(err).to.not.exist();
                    expect(callOrder).to.deep.equal([2, 0, 1]);
                    expect(results).to.deep.equal([0, 1, [2, 3]]);
                    done();
                });
            });

            it('executes object of functions in parallel', function (done) {

                var callOrder = [];

                Nasync.parallel({
                    zero: function (callback) { setTimeout(function () { callOrder.push(0); callback(null, 0); }, 50) },
                    one: function (callback) { setTimeout(function () { callOrder.push(1); callback(null, 1); }, 100) },
                    two: function (callback) { setTimeout(function () { callOrder.push(2); callback(null, 2, 3); }, 10) },
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

                Nasync.parallel({
                    zero: function (callback) { setTimeout(function () { callback(null, 0); }, 100) }
                });
            });
        });

        describe('#whilst', function () {

            it('executes an asynchronous while loop', function (done) {

                var callOrder = [];
                var count = 0;

                Nasync.whilst(function () {

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

                Nasync.whilst(function () {

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

                Nasync.doWhilst(function (callback) {

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

                Nasync.doWhilst(function (callback) {

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

                Nasync.doWhilst(function (callback) {

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

                Nasync.until(function () {

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

                Nasync.until(function () {

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

                Nasync.doUntil(function (callback) {

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

                Nasync.doUntil(function (callback) {

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

                Nasync.doUntil(function (callback) {

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

                Nasync.forever(function (callback) {

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

                    Nasync.forever(function (callback) {

                        callback(new Error('foo'));
                    });
                }).to.throw();
                done();
            });
        });

        describe('#waterfall', function () {

            it('runs tasks in a waterfall', function (done) {

                var callOrder = [];

                Nasync.waterfall([
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

                Nasync.waterfall([], function (err) {

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

                Nasync.waterfall([]);
            });

            it('errors if an array is not passed as first argument', function (done) {

                Nasync.waterfall(null, function (err) {

                    expect(err).to.exist();
                    expect(arguments.length).to.equal(1);
                    done();
                });
            });

            it('handles errors in tasks', function (done) {

                var callOrder = [];

                Nasync.waterfall([
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

                Nasync.times(5, function (n, callback) {

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

                Nasync.timesSeries(5, function (n, callback) {

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
    });

    describe('Util', function () {

        describe('#memoize', function () {

            it('successfully memoizes a function', function (done) {

                var originalCalls = [];

                var fn = function (arg1, arg2, callback) {

                    originalCalls.push([arg1, arg2]);
                    callback(null, arg1 + arg2);
                };

                var memoized = Nasync.memoize(fn);

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

                var memoized = Nasync.memoize(fn, function (item) {

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

                var memoized = Nasync.memoize(fn);

                memoized(1, 2, cb);
                memoized(1, 2, cb);
            });

            it('allows inputs to be manually cached', function (done) {

                var fn = function (arg, callback) {

                    callback(new Error('should not be called'));
                };

                var memoized = Nasync.memoize(fn);

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

                var memoized = Nasync.memoize(fn);
                var unmemoized = Nasync.unmemoize(memoized);

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

                var unmemoized = Nasync.unmemoize(fn);

                fn(1, 2, function (err, sum1) {

                    unmemoized(1, 2, function (err, sum2) {

                        expect(sum1).to.equal(sum2);
                        done();
                    });
                })
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

                Nasync.log(fn);
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

                Nasync.log(fn, 'bar', 'baz');
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

                Nasync.log(fn);
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

                Nasync.log(fn);
            });
        });

        describe('#dir', function () {

            // Theses tests would just be a duplicate of Nasync.log.
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

                Nasync.dir(fn);
            });
        });

        describe('#noConflict', function () {

            it('returns a reference to the original Nasync', function (done) {

                expect(Nasync.noConflict()).to.equal(Nasync);
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