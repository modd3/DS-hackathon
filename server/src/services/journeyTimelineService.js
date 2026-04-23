const { prisma } = require('../lib/prisma');

function deriveStatusFromLatestEvent(eventType) {
  if (!eventType) return 'ACTIVE';
  if (eventType === 'DELIVERY_CONFIRMED') return 'COMPLETED';
  if (eventType === 'SLA_BREACH') return 'STALLED';
  return 'ACTIVE';
}

async function getJourneyTimeline(journeyId) {
  const journey = await prisma.journey.findUnique({
    where: { id: journeyId },
    include: {
      customer: true,
      events: {
        orderBy: { occurredAt: 'asc' }
      },
      stages: {
        orderBy: { sequenceNo: 'asc' }
      },
      slaBreaches: {
        where: { isResolved: false },
        orderBy: { breachedAt: 'desc' },
        include: { rule: true }
      }
    }
  });

  if (!journey) return null;

  const latestEvent = journey.events[journey.events.length - 1];
  const derivedStatus = deriveStatusFromLatestEvent(latestEvent?.eventType);

  return {
    id: journey.id,
    externalRef: journey.externalRef,
    title: journey.title,
    status: journey.status,
    derivedStatus,
    currentStage: journey.currentStage,
    openedAt: journey.openedAt,
    closedAt: journey.closedAt,
    customer: {
      id: journey.customer.id,
      fullName: journey.customer.fullName,
      email: journey.customer.email,
      phone: journey.customer.phone,
      region: journey.customer.region
    },
    stages: journey.stages,
    events: journey.events,
    activeBreaches: journey.slaBreaches
  };
}

module.exports = {
  getJourneyTimeline,
  deriveStatusFromLatestEvent
};
