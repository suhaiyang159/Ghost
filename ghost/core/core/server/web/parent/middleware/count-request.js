const asyncLocalStorage = require('../../../../shared/async-local-storage');

let count = 0;

module.exports = function countRequest(req, res, next) {
    count = count + 1;

    asyncLocalStorage.run({requestCount: count}, next);
};
