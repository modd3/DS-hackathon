const express = require('express');
const { webhooksRouter } = require('./routes/webhooks');
const { journeysRouter } = require('./routes/journeys');
const { evaluateSlaBreaches } = require('./workers/slaWorker');

const app = express();

app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'dayliff-1000-eyes-server' });
});

app.use('/api/webhooks', webhooksRouter);
app.use('/api/journeys', journeysRouter);

app.post('/api/internal/sla/evaluate', async (_req, res) => {
  try {
    const result = await evaluateSlaBreaches();
    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.use((error, _req, res, _next) => {
  res.status(500).json({
    ok: false,
    error: error.message || 'Unexpected server error.'
  });
});

module.exports = { app };
