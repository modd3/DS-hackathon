const EventEmitter = require('events');

const emitter = new EventEmitter();
const queue = [];
const deadLetters = [];
const MAX_ATTEMPTS = 3;
let workerAttached = false;
let inFlight = false;

function createQueueId() {
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function enqueueNormalizedEvent(normalized) {
  const message = {
    id: createQueueId(),
    enqueuedAt: new Date(),
    attempts: 0,
    normalized
  };

  queue.push(message);
  emitter.emit('queue:message');

  return message;
}

function moveToDeadLetter(message, reason) {
  deadLetters.push({
    ...message,
    failedAt: new Date(),
    reason
  });
}

function processNext(handler) {
  if (inFlight) return;

  const message = queue.shift();
  if (!message) return;

  inFlight = true;

  Promise.resolve(handler(message))
    .catch((error) => {
      const attempts = message.attempts + 1;
      const retriableMessage = {
        ...message,
        attempts
      };

      if (attempts >= MAX_ATTEMPTS) {
        moveToDeadLetter(retriableMessage, error.message);
      } else {
        setTimeout(() => {
          queue.push(retriableMessage);
          emitter.emit('queue:message');
        }, 500);
      }

      console.error('[event-bus] failed to process message', {
        queueId: message.id,
        attempts,
        error: error.message
      });
    })
    .finally(() => {
      inFlight = false;

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

function getQueueStats() {
  return {
    queued: queue.length,
    deadLetters: deadLetters.length,
    inFlight,
    maxAttempts: MAX_ATTEMPTS
  };
}

function listDeadLetters(limit = 50) {
  return deadLetters.slice(-Math.max(1, Number(limit)));
}

function requeueDeadLetter(messageId) {
  const index = deadLetters.findIndex((item) => item.id === messageId);
  if (index === -1) return null;

  const [deadLetter] = deadLetters.splice(index, 1);

  const message = {
    id: deadLetter.id,
    enqueuedAt: new Date(),
    attempts: 0,
    normalized: deadLetter.normalized
  };

  queue.push(message);
  emitter.emit('queue:message');

  return message;
}

module.exports = {
  enqueueNormalizedEvent,
  startEventConsumer,
  getQueueStats,
  listDeadLetters,
  requeueDeadLetter
};
