const express = require('express');
const { trace, SpanStatusCode, context, propagation } = require('@opentelemetry/api');
const { mapIncomingEvent } = require('../services/eventMapper');
const { verifyWebhookAuth } = require('../middleware/verifyWebhookAuth');
const { enqueueNormalizedEvent } = require('../lib/eventBus');

const router = express.Router();
const tracer = trace.getTracer('dayliff.webhooks');

function buildWebhookHandler(source) {
  return async (req, res) => {
    const span = tracer.startSpan('webhook.receive', {
      attributes: { source }
    });

    try {
      const normalized = mapIncomingEvent({ source, body: req.body });
      const carrier = {};
      propagation.inject(context.active(), carrier);
      const queued = await enqueueNormalizedEvent(normalized, { traceContext: carrier });
      span.setAttribute('queue.id', queued.id);
      span.setAttribute('event.type', normalized.event.type);
      span.setStatus({ code: SpanStatusCode.OK });

      return res.status(202).json({
        accepted: true,
        source,
        queueId: queued.id,
        enqueuedAt: queued.enqueuedAt
      });
    } catch (error) {
      if (error.code === 'QUEUE_FULL') {
        span.recordException(error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
        return res.status(503).json({
          accepted: false,
          source,
          error: error.message
        });
      }

      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      return res.status(400).json({
        accepted: false,
        source,
        error: error.message
      });
    } finally {
      span.end();
    }
  };
}

router.post('/crm', verifyWebhookAuth, buildWebhookHandler('crm'));
router.post('/engineering', verifyWebhookAuth, buildWebhookHandler('engineering'));
router.post('/erp', verifyWebhookAuth, buildWebhookHandler('erp'));

module.exports = { webhooksRouter: router };
