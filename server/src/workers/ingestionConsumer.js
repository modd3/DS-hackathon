const { startEventConsumer } = require('../lib/eventBus');
const { persistNormalizedEvent } = require('../services/ingestionProcessor');

function startIngestionConsumer() {
  startEventConsumer(async (message) => {
    const result = await persistNormalizedEvent(message.normalized);

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
