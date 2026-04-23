const express = require('express');
const { getQueueStats, listDeadLetters, requeueDeadLetter } = require('../lib/eventBus');
const { verifyWebhookAuth } = require('../middleware/verifyWebhookAuth');
const { dispatchPendingAlerts } = require('../workers/alertDeliveryWorker');

const router = express.Router();

router.use(verifyWebhookAuth);

router.get('/queue/stats', (_req, res) => {
  res.json({ data: getQueueStats() });
});

router.get('/queue/dead-letters', (req, res) => {
  const { limit = 50 } = req.query;
  res.json({ data: listDeadLetters(Number(limit)) });
});

router.post('/queue/dead-letters/:messageId/requeue', (req, res) => {
  const message = requeueDeadLetter(req.params.messageId);

  if (!message) {
    return res.status(404).json({ error: 'Dead letter not found.' });
  }

  return res.json({ data: message });
});

router.post('/alerts/dispatch', async (req, res) => {
  const { limit = 100 } = req.body || {};

  try {
    const result = await dispatchPendingAlerts(Number(limit));
    return res.json({ data: result });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = { internalRouter: router };
