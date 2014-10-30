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

        setTimeout(function() {

            result.push(item);
            callback(null);
        }, item * 100);
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
        });




        //it('`eachLimit` is the same as each, only with a limited number of iterators running', function (done) {
        //
        //    var result = [];
        //
        //    Nsync.eachLimit([1,9,2,8,3,7,4,6,5], 4, internals.eachAsync(result), function (error) {
        //
        //        expect(error).to.not.exist();
        //        expect(result).to.deep.equal([1, 2, 3, 8, 4, 9, 7, 5, 6]);
        //        done();
        //    });
        //});
        //
        //it('`map` products a new array of values by running them through an async function', function (done) {
        //
        //    va
        //});

    });

    describe('Flow', function () {

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