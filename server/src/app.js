const express = require('express');
const { webhooksRouter } = require('./routes/webhooks');
const { journeysRouter } = require('./routes/journeys');
const { internalRouter } = require('./routes/internal');
const { evaluateSlaBreaches } = require('./workers/slaWorker');
const { renderPrometheusMetrics } = require('./services/metricsService');

const app = express();

app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'dayliff-1000-eyes-server' });
});

app.get('/metrics', async (_req, res) => {
  try {
    const metrics = await renderPrometheusMetrics();
    res.set('Content-Type', 'text/plain; version=0.0.4');
    res.send(metrics);
  } catch (error) {
    res.status(500).send(`# metrics_error ${error.message}`);
  }
});

app.use('/api/webhooks', webhooksRouter);
app.use('/api/journeys', journeysRouter);
app.use('/api/internal', internalRouter);

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
