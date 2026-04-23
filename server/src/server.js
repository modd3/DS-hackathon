require('dotenv').config();
const { app } = require('./app');
const { startIngestionConsumer } = require('./workers/ingestionConsumer');
const { evaluateSlaBreaches } = require('./workers/slaWorker');
const { dispatchPendingAlerts } = require('./workers/alertDeliveryWorker');

const port = Number(process.env.PORT || 4000);
const slaIntervalMs = Number(process.env.SLA_INTERVAL_MS || 5 * 60 * 1000);
const alertDispatchIntervalMs = Number(process.env.ALERT_DISPATCH_INTERVAL_MS || 60 * 1000);

startIngestionConsumer();
setInterval(() => {
  evaluateSlaBreaches().catch((error) => {
    console.error('[sla-scheduler] evaluation failed', error.message);
  });
}, slaIntervalMs);

setInterval(() => {
  dispatchPendingAlerts().catch((error) => {
    console.error('[alert-scheduler] dispatch failed', error.message);
  });
}, alertDispatchIntervalMs);

app.listen(port, () => {
  console.log(`Dayliff 1000 Eyes server listening on port ${port}`);
});
