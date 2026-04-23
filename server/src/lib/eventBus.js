const EventEmitter = require('events');
const fs = require('fs');

const emitter = new EventEmitter();
const MAX_ATTEMPTS = 3;
const MAX_QUEUE_SIZE = Number(process.env.QUEUE_MAX_SIZE || 10000);
const BROKER_PROVIDER = process.env.BROKER_PROVIDER || 'file-state';
const BROKER_STATE_FILE = process.env.BROKER_STATE_FILE || 'server/.broker-state.json';
const BROKER_POLL_MS = Number(process.env.BROKER_POLL_MS || 1000);
const BROKER_RECLAIM_MS = Number(process.env.BROKER_RECLAIM_MS || 30000);

const REDIS_STREAM_KEY = process.env.REDIS_STREAM_KEY || 'dayliff:events';
const REDIS_DLQ_STREAM_KEY = process.env.REDIS_DLQ_STREAM_KEY || 'dayliff:events:dlq';
const REDIS_CONSUMER_GROUP = process.env.REDIS_CONSUMER_GROUP || 'dayliff_ingestion';
const REDIS_CONSUMER_NAME = process.env.REDIS_CONSUMER_NAME || 'worker_1';
const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const state = {
  queue: [],
  deadLetters: []
};

let workerAttached = false;
let inFlight = false;
let pollTimer = null;
let reclaimTimer = null;

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

async function redisCommand(command, args = []) {
  if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
    throw new Error('Missing Upstash Redis credentials for redis-streams provider.');
  }

  const response = await fetch(`${UPSTASH_REDIS_REST_URL}/${command}/${args.map((arg) => encodeURIComponent(String(arg))).join('/')}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`
    }
  });

  if (!response.ok) {
    throw new Error(`Redis command failed: ${command}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(`Redis error: ${data.error}`);
  }

  return data.result;
}

function encodeMessage(normalized, attempts = 0, reason = null) {
  return {
    payload: JSON.stringify(normalized),
    attempts: String(attempts),
    reason: reason || ''
  };
}

function decodeFields(fieldArray) {
  const mapped = {};
  for (let i = 0; i < fieldArray.length; i += 2) {
    mapped[fieldArray[i]] = fieldArray[i + 1];
  }
  return mapped;
}

async function ensureRedisConsumerGroup() {
  try {
    await redisCommand('XGROUP', ['CREATE', REDIS_STREAM_KEY, REDIS_CONSUMER_GROUP, '$', 'MKSTREAM']);
  } catch (error) {
    if (!error.message.includes('BUSYGROUP')) {
      throw error;
    }
  }
}

async function enqueueFileState(normalized) {
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

async function enqueueRedisStreams(normalized) {
  const fields = encodeMessage(normalized, 0);
  const id = await redisCommand('XADD', [REDIS_STREAM_KEY, '*', 'payload', fields.payload, 'attempts', fields.attempts, 'reason', fields.reason]);

  return {
    id,
    enqueuedAt: new Date().toISOString(),
    attempts: 0,
    normalized
  };
}

async function enqueueNormalizedEvent(normalized) {
  if (BROKER_PROVIDER === 'redis-streams') {
    return enqueueRedisStreams(normalized);
  }

  return enqueueFileState(normalized);
}

function moveToDeadLetterFileState(message, reason) {
  const deadLetter = {
    ...message,
    failedAt: new Date().toISOString(),
    reason
  };

  state.deadLetters.push(deadLetter);
  persistStateToDisk();
}

async function moveToDeadLetterRedis(message, reason) {
  const fields = encodeMessage(message.normalized, message.attempts, reason);
  await redisCommand('XADD', [REDIS_DLQ_STREAM_KEY, '*', 'payload', fields.payload, 'attempts', fields.attempts, 'reason', fields.reason]);
}

function processNextFileState(handler) {
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
        moveToDeadLetterFileState(retriableMessage, error.message);
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
        setImmediate(() => processNextFileState(handler));
      }
    });
}

async function processRedisEntry(handler, entryId, fieldArray) {
  const fields = decodeFields(fieldArray);
  const attempts = Number(fields.attempts || 0);
  const normalized = JSON.parse(fields.payload);

  try {
    await handler({
      id: entryId,
      attempts,
      normalized
    });

    await redisCommand('XACK', [REDIS_STREAM_KEY, REDIS_CONSUMER_GROUP, entryId]);
  } catch (error) {
    const nextAttempts = attempts + 1;

    if (nextAttempts >= MAX_ATTEMPTS) {
      await moveToDeadLetterRedis({ normalized, attempts: nextAttempts }, error.message);
    } else {
      const retryFields = encodeMessage(normalized, nextAttempts, error.message);
      await redisCommand('XADD', [REDIS_STREAM_KEY, '*', 'payload', retryFields.payload, 'attempts', retryFields.attempts, 'reason', retryFields.reason]);
    }

    await redisCommand('XACK', [REDIS_STREAM_KEY, REDIS_CONSUMER_GROUP, entryId]);

    console.error('[event-bus][redis] failed to process message', {
      queueId: entryId,
      attempts: nextAttempts,
      error: error.message
    });
  }
}

async function processNextRedisStreams(handler) {
  if (inFlight) return;
  inFlight = true;

  try {
    const streamData = await redisCommand('XREADGROUP', ['GROUP', REDIS_CONSUMER_GROUP, REDIS_CONSUMER_NAME, 'COUNT', '10', 'STREAMS', REDIS_STREAM_KEY, '>']);

    if (!streamData || streamData.length === 0) {
      return;
    }

    const [, entries] = streamData[0];
    if (!entries || entries.length === 0) {
      return;
    }

    for (const [entryId, fieldArray] of entries) {
      await processRedisEntry(handler, entryId, fieldArray);
    }
  } catch (error) {
    console.error('[event-bus][redis] poll failed', error.message);
  } finally {
    inFlight = false;
  }
}

async function reclaimPendingRedisEntries(handler) {
  try {
    const claimed = await redisCommand('XAUTOCLAIM', [REDIS_STREAM_KEY, REDIS_CONSUMER_GROUP, REDIS_CONSUMER_NAME, '60000', '0-0', 'COUNT', '10']);
    if (!claimed || claimed.length < 2) return;

    const entries = claimed[1] || [];
    for (const [entryId, fieldArray] of entries) {
      await processRedisEntry(handler, entryId, fieldArray);
    }
  } catch (error) {
    console.error('[event-bus][redis] reclaim failed', error.message);
  }
}

function startEventConsumer(handler) {
  if (workerAttached) return;

  workerAttached = true;

  if (BROKER_PROVIDER === 'redis-streams') {
    ensureRedisConsumerGroup()
      .then(() => {
        pollTimer = setInterval(() => {
          processNextRedisStreams(handler);
        }, BROKER_POLL_MS);

        reclaimTimer = setInterval(() => {
          reclaimPendingRedisEntries(handler);
        }, BROKER_RECLAIM_MS);
      })
      .catch((error) => {
        console.error('[event-bus][redis] failed to start consumer group', error.message);
      });

    return;
  }

  emitter.on('queue:message', () => {
    processNextFileState(handler);
  });

  if (state.queue.length > 0) {
    emitter.emit('queue:message');
  }
}

async function getBrokerMetrics() {
  if (BROKER_PROVIDER === 'redis-streams') {
    const groups = await redisCommand('XINFO', ['GROUPS', REDIS_STREAM_KEY]);
    const pending = await redisCommand('XPENDING', [REDIS_STREAM_KEY, REDIS_CONSUMER_GROUP]);

    return {
      provider: BROKER_PROVIDER,
      streamKey: REDIS_STREAM_KEY,
      deadLetterStreamKey: REDIS_DLQ_STREAM_KEY,
      consumerGroup: REDIS_CONSUMER_GROUP,
      consumerName: REDIS_CONSUMER_NAME,
      groups,
      pendingSummary: pending
    };
  }

  return {
    provider: BROKER_PROVIDER,
    inFlight,
    queued: state.queue.length,
    deadLetters: state.deadLetters.length,
    maxAttempts: MAX_ATTEMPTS
  };
}

async function getBrokerHealth() {
  const issues = [];

  if (BROKER_PROVIDER === 'redis-streams') {
    if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
      issues.push('Missing Upstash Redis credentials.');
      return { status: 'down', provider: BROKER_PROVIDER, issues };
    }

    try {
      const pending = await redisCommand('XPENDING', [REDIS_STREAM_KEY, REDIS_CONSUMER_GROUP]);
      const pendingCount = Number(pending?.[0] || 0);

      if (pendingCount > 100) {
        issues.push(`High pending message count: ${pendingCount}`);
      }
    } catch (error) {
      issues.push(`Redis health probe failed: ${error.message}`);
    }
  } else {
    const usageRatio = state.queue.length / Math.max(1, MAX_QUEUE_SIZE);
    if (usageRatio > 0.8) {
      issues.push(`Queue usage above 80% (${Math.round(usageRatio * 100)}%).`);
    }

    try {
      if (BROKER_PROVIDER === 'file-state') {
        fs.accessSync(BROKER_STATE_FILE, fs.constants.W_OK);
      }
    } catch (error) {
      issues.push(`Broker state file not writable: ${error.message}`);
    }
  }

  return {
    status: issues.length > 0 ? 'degraded' : 'healthy',
    provider: BROKER_PROVIDER,
    issues
  };
}

async function getQueueStats() {
  if (BROKER_PROVIDER === 'redis-streams') {
    const queued = Number(await redisCommand('XLEN', [REDIS_STREAM_KEY]));
    const deadLetters = Number(await redisCommand('XLEN', [REDIS_DLQ_STREAM_KEY]));

    return {
      provider: BROKER_PROVIDER,
      queued,
      deadLetters,
      inFlight,
      maxAttempts: MAX_ATTEMPTS,
      streamKey: REDIS_STREAM_KEY,
      deadLetterStreamKey: REDIS_DLQ_STREAM_KEY,
      consumerGroup: REDIS_CONSUMER_GROUP,
      consumerName: REDIS_CONSUMER_NAME
    };
  }

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

async function listDeadLetters(limit = 50) {
  if (BROKER_PROVIDER === 'redis-streams') {
    const result = await redisCommand('XREVRANGE', [REDIS_DLQ_STREAM_KEY, '+', '-', 'COUNT', Number(limit)]);
    return result.map(([id, fields]) => {
      const mapped = decodeFields(fields);
      return {
        id,
        attempts: Number(mapped.attempts || 0),
        reason: mapped.reason || '',
        normalized: JSON.parse(mapped.payload)
      };
    });
  }

  return state.deadLetters.slice(-Math.max(1, Number(limit)));
}

async function requeueDeadLetter(messageId) {
  if (BROKER_PROVIDER === 'redis-streams') {
    const result = await redisCommand('XRANGE', [REDIS_DLQ_STREAM_KEY, messageId, messageId, 'COUNT', '1']);
    if (!result || result.length === 0) return null;

    const [id, fields] = result[0];
    const mapped = decodeFields(fields);
    const normalized = JSON.parse(mapped.payload);

    const retryFields = encodeMessage(normalized, 0);
    const newId = await redisCommand('XADD', [REDIS_STREAM_KEY, '*', 'payload', retryFields.payload, 'attempts', retryFields.attempts, 'reason', retryFields.reason]);
    await redisCommand('XDEL', [REDIS_DLQ_STREAM_KEY, id]);

    return {
      id: newId,
      enqueuedAt: new Date().toISOString(),
      attempts: 0,
      normalized
    };
  }

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
  getBrokerMetrics,
  getBrokerHealth,
  listDeadLetters,
  requeueDeadLetter
};
