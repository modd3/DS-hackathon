const express = require('express');
const { getQueueStats, listDeadLetters, requeueDeadLetter } = require('../lib/eventBus');
const { verifyWebhookAuth } = require('../middleware/verifyWebhookAuth');
const { dispatchPendingAlerts } = require('../workers/alertDeliveryWorker');

const router = express.Router();

router.use(verifyWebhookAuth);

router.get('/queue/stats', async (_req, res) => {
  try {
    const stats = await getQueueStats();
    res.json({ data: stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/queue/dead-letters', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const deadLetters = await listDeadLetters(Number(limit));
    res.json({ data: deadLetters });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/queue/dead-letters/:messageId/requeue', async (req, res) => {
  try {
    const message = await requeueDeadLetter(req.params.messageId);

    if (!message) {
      return res.status(404).json({ error: 'Dead letter not found.' });
    }

    return res.json({ data: message });
  } catch (error) {
    if (error.code === 'QUEUE_FULL') {
      return res.status(503).json({ error: error.message });
    }

    return res.status(500).json({ error: error.message });
  }
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
