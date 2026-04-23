const { getQueueStats, getBrokerHealth } = require('../lib/eventBus');
const { prisma } = require('../lib/prisma');

async function evaluateSloPolicies() {
  const maxDeadLetters = Number(process.env.SLO_MAX_DEAD_LETTERS || 20);
  const maxQueueDepth = Number(process.env.SLO_MAX_QUEUE_DEPTH || 1000);
  const maxFailedAlertsHourly = Number(process.env.SLO_MAX_FAILED_ALERTS_HOURLY || 50);

  const [stats, health] = await Promise.all([getQueueStats(), getBrokerHealth()]);
  const issues = [];

  if (stats.deadLetters > maxDeadLetters) {
    issues.push(`Dead letters ${stats.deadLetters} exceeded threshold ${maxDeadLetters}.`);
  }

  if (stats.queued > maxQueueDepth) {
    issues.push(`Queue depth ${stats.queued} exceeded threshold ${maxQueueDepth}.`);
  }

  if (health.status !== 'healthy') {
    issues.push(`Broker health is ${health.status}: ${health.issues.join('; ')}`);
  }

  const oneHourAgo = new Date(Date.now() - (60 * 60 * 1000));
  const failedAlertsLastHour = await prisma.alert.count({
    where: {
      status: 'FAILED',
      createdAt: { gte: oneHourAgo }
    }
  });

  if (failedAlertsLastHour > maxFailedAlertsHourly) {
    issues.push(`Failed alerts in last hour ${failedAlertsLastHour} exceeded threshold ${maxFailedAlertsHourly}.`);
  }

  if (issues.length > 0) {
    console.error('[slo-policy][ALERT]', { issues });
  }

  return {
    healthy: issues.length === 0,
    issues,
    stats: {
      queued: stats.queued,
      deadLetters: stats.deadLetters,
      failedAlertsLastHour
    }
  };
}

module.exports = {
  evaluateSloPolicies
};
