'use strict';

// Load modules

const Collection = require('./collection');
const Flow = require('./flow');
const Util = require('./util');


// Declare internals

const internals = {};


module.exports = {

    // Collections
    each: Collection.each,
    forEach: Collection.each,
    eachSeries: Collection.eachSeries,
    forEachSeries: Collection.eachSeries,
    eachLimit: Collection.eachLimit,
    forEachLimit: Collection.eachLimit,
    eachOf: Collection.eachOf,
    forEachOf: Collection.eachOf,
    eachOfSeries: Collection.eachOfSeries,
    forEachOfSeries: Collection.eachOfSeries,
    eachOfLimit: Collection.eachOfLimit,
    forEachOfLimit: Collection.eachOfLimit,
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
    timesLimit: Flow.timesLimit,

    // Utils
    ensureAsync: Util.ensureAsync,
    memoize: Util.memoize,
    unmemoize: Util.unmemoize,
    log: Util.log,
    dir: Util.dir
};
