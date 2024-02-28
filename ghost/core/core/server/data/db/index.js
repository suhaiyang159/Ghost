const logging = require('@tryghost/logging');
const metrics = require('@tryghost/metrics');
const config = require('../../../shared/config');
const ConnectionPoolInstrumentation = require('./ConnectionPoolInstrumentation');

let connection;

Object.defineProperty(exports, 'knex', {
    enumerable: true,
    configurable: true,
    get: function get() {
        connection = connection || require('./connection');
        prioritiseConnectionAquisitionByRequest(connection.client.pool);
        if (config.get('telemetry:connectionPool')) {
            const instrumentation = new ConnectionPoolInstrumentation({knex: connection, logging, metrics, config});
            instrumentation.instrument();
        }
        return connection;
    }
});

function prioritiseConnectionAquisitionByRequest(pool) {
    // Patch the pool to use a priority queue for pending acquires
    // This will ensure that the oldest pending acquire will be the next to acquire a connection

    const asyncLocalStorage = require('../../../shared/async-local-storage');
    const PriorityQueue = require('../../lib/PriorityQueue');
    const {PendingOperation} = require('tarn/dist/PendingOperation');

    // Only patch once
    if (pool.pendingAcquires instanceof PriorityQueue !== false) {
        return;
    }

    // @see https://github.com/Vincit/tarn.js/blob/master/src/Pool.ts#L29
    pool.pendingAcquires = new PriorityQueue();

    // @see https://github.com/Vincit/tarn.js/blob/master/src/Pool.ts#L187
    pool.acquire = function () {
        pool.eventId = pool.eventId + 1;
        pool._executeEventHandlers('acquireRequest', pool.eventId);

        const reqCount = asyncLocalStorage.getStore()?.requestCount;

        const pendingAcquire = new PendingOperation(pool.acquireTimeoutMillis);
        pool.pendingAcquires.push(pendingAcquire, reqCount, pool.eventId);

        pendingAcquire.promise = pendingAcquire.promise
            .then((resource) => {
                pool._executeEventHandlers('acquireSuccess', pool.eventId, resource);

                return resource;
            })
            .catch((err) => {
                pool._executeEventHandlers('acquireFail', pool.eventId, err);
                remove(pool.pendingAcquires, pendingAcquire);

                return Promise.reject(err);
            });

        pool._tryAcquireOrCreate();

        return pendingAcquire;
    };
}

// @see https://github.com/Vincit/tarn.js/blob/master/src/Pool.ts#L642
function remove(arr, item) {
    const idx = arr.indexOf(item);

    if (idx === -1) {
        return false;
    }
    else {
        arr.splice(idx, 1);

        return true;
    }
}
