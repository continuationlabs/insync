// Load modules


// Declare internals

var internals = {};


internals.consoleFn = function (name) {

    return function (fn) {

        var args = Array.prototype.slice.call(arguments, 1);

        fn.apply(null, args.concat([function (err) {

            var args = Array.prototype.slice.call(arguments, 1);

            if (err) {
                return console.error(err);
            }

            var consoleFn = console[name];

            if (consoleFn) {
                args.forEach(function (item) {
                    consoleFn(item);
                });
            }
        }]));
    };
};


module.exports.noConflict = function () {
    // This function is more useful in a browser
    return module.exports;
};


module.exports.log = internals.consoleFn('log');


module.exports.dir = internals.consoleFn('dir');
