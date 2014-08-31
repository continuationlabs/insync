// Load Modules

var Lab = require('lab');
var lab = exports.lab = Lab.script();
var Async = require('../lib');
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
var expect = Lab.expect;

describe('Async', function () {

    describe('Collections', function () {

        describe('#each', function () {

            it('iterates over a collection of items in parallel', function (done) {

                var result = [];

                Async.each([4, 3, 2, 1], internals.eachAsync(result), function (error) {

                    expect(error).to.not.exist;
                    expect(result).to.deep.equal([1, 2, 3, 4]);

                    done();
                });
            });

            it('provides a default callback if one is not provided', function (done) {

                var noop = Common.noop;

                Common.noop = function (error) {

                    expect(error).to.not.exist;
                    Common.noop = noop;

                    done();
                };

                Async.each([4], internals.doNothing);
            });

            it('short circuits if the array is empty', function (done) {

                Async.each([], Common.noop, function (error) {

                    expect(error).to.not.exist;
                    done();
                });
            });

            it('sends an error when it occurs', function (done) {

                Async.each([1], function (item, callback) {

                    setTimeout(function() {

                        callback(new Error('async error'));
                    });
                }, function (error) {

                    expect(error).to.exist;
                    expect(error.message).to.equal('async error');

                    done();
                });
            });
        });

        describe('#eachSerires', function () {

            it('iterates over a collection of items in a series', function (done) {

                var result = [];

                Async.eachSeries([1,3,2], internals.eachAsync(result), function (error) {

                    expect(error).to.not.exist;
                    expect(result).to.deep.equal([1, 3, 2]);

                    done();
                });
            });

            it('provides a default callback if one is not provided', function (done) {

                var noop = Common.noop;

                Common.noop = function (error) {

                    expect(error).to.not.exist;
                    Common.noop = noop;

                    done();
                };

                Async.eachSeries([1], internals.doNothing);
            });

            it('short circuits if the array is empty', function (done) {

                Async.eachSeries([], Common.noop, function (error) {

                    expect(error).to.not.exist;
                    done();
                });
            });

            it('sends an error when it occurs', function (done) {

                Async.eachSeries([1], function (item, callback) {

                    setTimeout(function() {

                        callback(new Error('async error'));
                    });
                }, function (error) {

                    expect(error).to.exist;
                    expect(error.message).to.equal('async error');

                    done();
                });
            });
        });




        //it('`eachLimit` is the same as each, only with a limited number of iterators running', function (done) {
        //
        //    var result = [];
        //
        //    Async.eachLimit([1,9,2,8,3,7,4,6,5], 4, internals.eachAsync(result), function (error) {
        //
        //        expect(error).to.not.exist;
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
});