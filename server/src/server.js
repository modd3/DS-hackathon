require('dotenv').config();
const { initTelemetry, shutdownTelemetry } = require('./lib/telemetry');
const { app } = require('./app');
const { startIngestionConsumer } = require('./workers/ingestionConsumer');
const { evaluateSlaBreaches } = require('./workers/slaWorker');
const { dispatchPendingAlerts } = require('./workers/alertDeliveryWorker');
const { getBrokerHealth } = require('./lib/eventBus');
const { evaluateSloPolicies } = require('./workers/sloPolicyWorker');

const port = Number(process.env.PORT || 4000);
const slaIntervalMs = Number(process.env.SLA_INTERVAL_MS || 5 * 60 * 1000);
const alertDispatchIntervalMs = Number(process.env.ALERT_DISPATCH_INTERVAL_MS || 60 * 1000);
const brokerHealthIntervalMs = Number(process.env.BROKER_HEALTH_INTERVAL_MS || 60 * 1000);
const sloEvalIntervalMs = Number(process.env.SLO_EVAL_INTERVAL_MS || 60 * 1000);

initTelemetry();
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

setInterval(() => {
  getBrokerHealth()
    .then((health) => {
      if (health.status !== 'healthy') {
        console.error('[broker-health][ALERT]', health);
      }
    })
    .catch((error) => {
      console.error('[broker-health][ALERT] probe failed', error.message);
    });
}, brokerHealthIntervalMs);

setInterval(() => {
  evaluateSloPolicies().catch((error) => {
    console.error('[slo-policy][ALERT] evaluation failed', error.message);
  });
}, sloEvalIntervalMs);

app.listen(port, () => {
  console.log(`Dayliff 1000 Eyes server listening on port ${port}`);
});

process.on('SIGINT', () => {
  shutdownTelemetry()
    .catch((error) => console.error('[telemetry] shutdown failed', error.message))
    .finally(() => process.exit(0));
});
