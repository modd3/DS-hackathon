const EventEmitter = require('events');

const emitter = new EventEmitter();
const queue = [];
let workerAttached = false;

function createQueueId() {
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function enqueueNormalizedEvent(normalized) {
  const message = {
    id: createQueueId(),
    enqueuedAt: new Date(),
    normalized
  };

  queue.push(message);
  emitter.emit('queue:message');

  return message;
}

function processNext(handler) {
  const message = queue.shift();
  if (!message) return;

  Promise.resolve(handler(message))
    .catch((error) => {
      console.error('[event-bus] failed to process message', {
        queueId: message.id,
        error: error.message
      });

      // requeue with a tiny backoff for transient errors
      setTimeout(() => {
        queue.push(message);
        emitter.emit('queue:message');
      }, 500);
    })
    .finally(() => {
      if (queue.length > 0) {
        setImmediate(() => processNext(handler));
      }
    });
}

function startEventConsumer(handler) {
  if (workerAttached) return;

  workerAttached = true;

  emitter.on('queue:message', () => {
    processNext(handler);
  });
}

module.exports = {
  enqueueNormalizedEvent,
  startEventConsumer
};
