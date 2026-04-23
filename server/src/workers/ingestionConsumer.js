const { startEventConsumer } = require('../lib/eventBus');
const { persistNormalizedEvent } = require('../services/ingestionProcessor');
const { context, propagation } = require('@opentelemetry/api');

function startIngestionConsumer() {
  startEventConsumer(async (message) => {
    const carrier = message.traceContext || {};
    const extractedContext = propagation.extract(context.active(), carrier);
    const result = await context.with(extractedContext, async () => persistNormalizedEvent(message.normalized));

    console.log('[ingestion-consumer] processed', {
      queueId: message.id,
      journeyId: result.journeyId,
      eventId: result.eventId,
      wasDuplicateEvent: result.wasDuplicateEvent
    });
  });
}

module.exports = {
  startIngestionConsumer
};
