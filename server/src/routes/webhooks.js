const express = require('express');
const { mapIncomingEvent } = require('../services/eventMapper');
const { verifyWebhookAuth } = require('../middleware/verifyWebhookAuth');
const { enqueueNormalizedEvent } = require('../lib/eventBus');

const router = express.Router();

function buildWebhookHandler(source) {
  return async (req, res) => {
    try {
      const normalized = mapIncomingEvent({ source, body: req.body });
      const queued = enqueueNormalizedEvent(normalized);

      return res.status(202).json({
        accepted: true,
        source,
        queueId: queued.id,
        enqueuedAt: queued.enqueuedAt
      });
    } catch (error) {
      if (error.code === 'QUEUE_FULL') {
        return res.status(503).json({
          accepted: false,
          source,
          error: error.message
        });
      }

      return res.status(400).json({
        accepted: false,
        source,
        error: error.message
      });
    }
  };
}

router.post('/crm', verifyWebhookAuth, buildWebhookHandler('crm'));
router.post('/engineering', verifyWebhookAuth, buildWebhookHandler('engineering'));
router.post('/erp', verifyWebhookAuth, buildWebhookHandler('erp'));

module.exports = { webhooksRouter: router };
