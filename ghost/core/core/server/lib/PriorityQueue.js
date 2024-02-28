const orderBy = require('lodash/orderBy');

class PriorityQueue {
    queue = [];

    push(item, priority1 = 0, priority2 = 0) {
        this.queue.push({item, priority1, priority2});

        this.#sort();
    }

    pop() {
        if (this.queue.length === 0) {
            return;
        }

        return this.queue.pop().item;
    }

    shift() {
        if (this.queue.length === 0) {
            return;
        }

        return this.queue.shift().item;
    }

    unshift(item, priority1 = 0, priority2 = 0) {
        this.queue.unshift({item, priority1, priority2});

        this.#sort();
    }

    slice(start, end) {
        const slicedQueue = this.queue.slice(start, end);
        const newQueue = new PriorityQueue();

        slicedQueue.forEach(item => newQueue.push(item.item, item.priority1, item.priority2));

        return newQueue;
    }

    map(callback) {
        return this.queue.map((element, index) => callback(element.item, index));
    }

    get length() {
        return this.queue.length;
    }

    #sort() {
        this.queue = orderBy(this.queue, ['priority1', 'priority2'], ['asc', 'asc']);
    }
}

module.exports = PriorityQueue;
