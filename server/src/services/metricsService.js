const { getQueueStats, getBrokerHealth } = require('../lib/eventBus');

async function renderPrometheusMetrics() {
  const stats = await getQueueStats();
  const health = await getBrokerHealth();

  const providerIsRedis = stats.provider === 'redis-streams' ? 1 : 0;
  const healthStatus = health.status === 'healthy' ? 1 : 0;

  return [
    '# HELP dayliff_broker_queue_size Current number of queued messages.',
    '# TYPE dayliff_broker_queue_size gauge',
    `dayliff_broker_queue_size ${stats.queued}`,
    '# HELP dayliff_broker_dead_letters Current number of dead-letter messages.',
    '# TYPE dayliff_broker_dead_letters gauge',
    `dayliff_broker_dead_letters ${stats.deadLetters}`,
    '# HELP dayliff_broker_in_flight Whether broker consumer is currently processing.',
    '# TYPE dayliff_broker_in_flight gauge',
    `dayliff_broker_in_flight ${stats.inFlight ? 1 : 0}`,
    '# HELP dayliff_broker_provider_redis Broker provider is redis-streams (1=true).',
    '# TYPE dayliff_broker_provider_redis gauge',
    `dayliff_broker_provider_redis ${providerIsRedis}`,
    '# HELP dayliff_broker_health Healthy broker status (1=healthy, 0=degraded/down).',
    '# TYPE dayliff_broker_health gauge',
    `dayliff_broker_health ${healthStatus}`
  ].join('\n');
}

module.exports = {
  renderPrometheusMetrics
};
