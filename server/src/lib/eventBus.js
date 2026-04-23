const EventEmitter = require('events');
const fs = require('fs');

const emitter = new EventEmitter();
const queue = [];
const deadLetters = [];
const MAX_ATTEMPTS = 3;
const MAX_QUEUE_SIZE = Number(process.env.QUEUE_MAX_SIZE || 10000);
const DEAD_LETTER_FILE = process.env.DEAD_LETTER_FILE || 'server/.dead-letters.log';
let workerAttached = false;
let inFlight = false;

function createQueueId() {
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function enqueueNormalizedEvent(normalized) {
  if (queue.length >= MAX_QUEUE_SIZE) {
    const error = new Error('In-memory queue capacity reached.');
    error.code = 'QUEUE_FULL';
    throw error;
  }

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

function persistDeadLetter(deadLetter) {
  try {
    fs.appendFileSync(DEAD_LETTER_FILE, `${JSON.stringify(deadLetter)}\n`);
  } catch (error) {
    console.error('[event-bus] failed to persist dead letter', error.message);
  }
}

function moveToDeadLetter(message, reason) {
  const deadLetter = {
    ...message,
    failedAt: new Date(),
    reason
  };

  deadLetters.push(deadLetter);
  persistDeadLetter(deadLetter);
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
    maxAttempts: MAX_ATTEMPTS,
    maxQueueSize: MAX_QUEUE_SIZE,
    deadLetterFile: DEAD_LETTER_FILE
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
