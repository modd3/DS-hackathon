require('dotenv').config();
const { app } = require('./app');
const { startIngestionConsumer } = require('./workers/ingestionConsumer');
const { evaluateSlaBreaches } = require('./workers/slaWorker');

const port = Number(process.env.PORT || 4000);
const slaIntervalMs = Number(process.env.SLA_INTERVAL_MS || 5 * 60 * 1000);

startIngestionConsumer();
setInterval(() => {
  evaluateSlaBreaches().catch((error) => {
    console.error('[sla-scheduler] evaluation failed', error.message);
  });
}, slaIntervalMs);

app.listen(port, () => {
  console.log(`Dayliff 1000 Eyes server listening on port ${port}`);
});
