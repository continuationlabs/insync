'use strict';

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
    filter: Collection.filter,
    filterSeries: Collection.filterSeries,
    select: Collection.filter,
    selectSeries: Collection.filterSeries,
    reject: Collection.reject,
    rejectSeries: Collection.rejectSeries,
    reduce: Collection.reduce,
    inject: Collection.reduce,
    foldl: Collection.reduce,
    reduceRight: Collection.reduceRight,
    foldr: Collection.reduceRight,
    detect: Collection.detect,
    detectSeries: Collection.detectSeries,
    sortBy: Collection.sortBy,
    some: Collection.some,
    any: Collection.some,
    every: Collection.every,
    all: Collection.every,
    concat: Collection.concat,
    concatSeries: Collection.concatSeries,

    // Control flow
    series: Flow.series,
    parallel: Flow.parallel,
    parallelLimit: Flow.parallelLimit,
    whilst: Flow.whilst,
    doWhilst: Flow.doWhilst,
    until: Flow.until,
    doUntil: Flow.doUntil,
    forever: Flow.forever,
    waterfall: Flow.waterfall,
    compose: Flow.compose,
    seq: Flow.seq,
    applyEach: Flow.applyEach,
    applyEachSeries: Flow.applyEachSeries,
    queue: Flow.queue,
    priorityQueue: Flow.priorityQueue,
    cargo: Flow.cargo,
    auto: Flow.auto,
    retry: Flow.retry,
    iterator: Flow.iterator,
    apply: Flow.apply,
    times: Flow.times,
    timesSeries: Flow.timesSeries,

    // Utils
    memoize: Util.memoize,
    unmemoize: Util.unmemoize,
    log: Util.log,
    dir: Util.dir,
    noConflict: Util.noConflict
};
