const express = require('express');
const { getQueueStats, getBrokerMetrics, getBrokerHealth, listDeadLetters, requeueDeadLetter } = require('../lib/eventBus');
const { verifyWebhookAuth } = require('../middleware/verifyWebhookAuth');
const { dispatchPendingAlerts } = require('../workers/alertDeliveryWorker');
const { evaluateSloPolicies } = require('../workers/sloPolicyWorker');
const { prisma } = require('../lib/prisma');

const router = express.Router();

router.use(verifyWebhookAuth);

// ── SLA Rules CRUD ───────────────────────────────────────────────────────────

router.get('/sla/rules', async (_req, res) => {
  try {
    const rules = await prisma.slaRule.findMany({ orderBy: { stage: 'asc' } });
    res.json({ data: rules });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/sla/rules', async (req, res) => {
  try {
    const { name, description, stage, maxDurationMins, alertChannels, alertRecipients, scope, scopeRef } = req.body;
    const rule = await prisma.slaRule.create({
      data: { name, description, stage, maxDurationMins: Number(maxDurationMins), alertChannels: alertChannels || [], alertRecipients: alertRecipients || [], scope: scope || 'GLOBAL', scopeRef: scopeRef || null }
    });
    res.status(201).json({ data: rule });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.patch('/sla/rules/:id', async (req, res) => {
  try {
    const { maxDurationMins, isActive, alertChannels, alertRecipients, description } = req.body;
    const rule = await prisma.slaRule.update({
      where: { id: req.params.id },
      data: {
        ...(maxDurationMins !== undefined && { maxDurationMins: Number(maxDurationMins) }),
        ...(isActive !== undefined && { isActive }),
        ...(alertChannels !== undefined && { alertChannels }),
        ...(alertRecipients !== undefined && { alertRecipients }),
        ...(description !== undefined && { description }),
      }
    });
    res.json({ data: rule });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/sla/rules/:id', async (req, res) => {
  try {
    await prisma.slaRule.delete({ where: { id: req.params.id } });
    res.json({ data: { deleted: true } });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ── In-app notifications ─────────────────────────────────────────────────────

router.get('/notifications', async (req, res) => {
  try {
    const { recipient, limit = 30 } = req.query;
    const notifications = await prisma.inAppNotification.findMany({
      where: recipient ? { recipient } : {},
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
    });
    const unreadCount = await prisma.inAppNotification.count({
      where: { ...(recipient ? { recipient } : {}), isRead: false },
    });
    res.json({ data: { notifications, unreadCount } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/notifications/mark-read', async (req, res) => {
  try {
    const { ids } = req.body; // array of ids, or omit to mark all
    await prisma.inAppNotification.updateMany({
      where: ids?.length ? { id: { in: ids } } : {},
      data:  { isRead: true },
    });
    res.json({ data: { ok: true } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/queue/stats', async (_req, res) => {
  try {
    const stats = await getQueueStats();
    res.json({ data: stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


router.get('/queue/metrics', async (_req, res) => {
  try {
    const metrics = await getBrokerMetrics();
    res.json({ data: metrics });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/queue/health', async (_req, res) => {
  try {
    const health = await getBrokerHealth();
    res.json({ data: health });
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

router.post('/slo/evaluate', async (_req, res) => {
  try {
    const result = await evaluateSloPolicies();
    res.json({ data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = { internalRouter: router };
