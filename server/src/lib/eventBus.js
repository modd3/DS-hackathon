const EventEmitter = require('events');
const fs = require('fs');

const emitter = new EventEmitter();
const MAX_ATTEMPTS = 3;
const MAX_QUEUE_SIZE = Number(process.env.QUEUE_MAX_SIZE || 10000);
const BROKER_PROVIDER = process.env.BROKER_PROVIDER || 'file-state';
const BROKER_STATE_FILE = process.env.BROKER_STATE_FILE || 'server/.broker-state.json';

const state = {
  queue: [],
  deadLetters: []
};

let workerAttached = false;
let inFlight = false;

function hydrateStateFromDisk() {
  if (BROKER_PROVIDER !== 'file-state') return;

  try {
    if (!fs.existsSync(BROKER_STATE_FILE)) return;

    const raw = fs.readFileSync(BROKER_STATE_FILE, 'utf8');
    if (!raw.trim()) return;

    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.queue)) state.queue = parsed.queue;
    if (Array.isArray(parsed.deadLetters)) state.deadLetters = parsed.deadLetters;
  } catch (error) {
    console.error('[event-bus] failed to hydrate state', error.message);
  }
}

function persistStateToDisk() {
  if (BROKER_PROVIDER !== 'file-state') return;

  try {
    fs.writeFileSync(BROKER_STATE_FILE, JSON.stringify(state, null, 2));
  } catch (error) {
    console.error('[event-bus] failed to persist state', error.message);
  }
}

hydrateStateFromDisk();

function createQueueId() {
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function enqueueNormalizedEvent(normalized) {
  if (state.queue.length >= MAX_QUEUE_SIZE) {
    const error = new Error('Queue capacity reached.');
    error.code = 'QUEUE_FULL';
    throw error;
  }

  const message = {
    id: createQueueId(),
    enqueuedAt: new Date().toISOString(),
    attempts: 0,
    normalized
  };

  state.queue.push(message);
  persistStateToDisk();
  emitter.emit('queue:message');

  return message;
}

function moveToDeadLetter(message, reason) {
  const deadLetter = {
    ...message,
    failedAt: new Date().toISOString(),
    reason
  };

  state.deadLetters.push(deadLetter);
  persistStateToDisk();
}

function processNext(handler) {
  if (inFlight) return;

  const message = state.queue.shift();
  if (!message) return;

  persistStateToDisk();
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
          state.queue.push(retriableMessage);
          persistStateToDisk();
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

      if (state.queue.length > 0) {
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

  if (state.queue.length > 0) {
    emitter.emit('queue:message');
  }
}

function getQueueStats() {
  return {
    provider: BROKER_PROVIDER,
    queued: state.queue.length,
    deadLetters: state.deadLetters.length,
    inFlight,
    maxAttempts: MAX_ATTEMPTS,
    maxQueueSize: MAX_QUEUE_SIZE,
    brokerStateFile: BROKER_STATE_FILE
  };
}

function listDeadLetters(limit = 50) {
  return state.deadLetters.slice(-Math.max(1, Number(limit)));
}

function requeueDeadLetter(messageId) {
  const index = state.deadLetters.findIndex((item) => item.id === messageId);
  if (index === -1) return null;

  if (state.queue.length >= MAX_QUEUE_SIZE) {
    const error = new Error('Queue capacity reached.');
    error.code = 'QUEUE_FULL';
    throw error;
  }

  const [deadLetter] = state.deadLetters.splice(index, 1);

  const message = {
    id: deadLetter.id,
    enqueuedAt: new Date().toISOString(),
    attempts: 0,
    normalized: deadLetter.normalized
  };

  state.queue.push(message);
  persistStateToDisk();
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
