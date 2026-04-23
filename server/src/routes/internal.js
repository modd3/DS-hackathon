const express = require('express');
const { getQueueStats, listDeadLetters, requeueDeadLetter } = require('../lib/eventBus');
const { verifyWebhookAuth } = require('../middleware/verifyWebhookAuth');

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

module.exports = { internalRouter: router };
