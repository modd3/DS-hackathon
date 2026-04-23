const { Prisma, prisma } = require('../lib/prisma');
const { trace, SpanStatusCode } = require('@opentelemetry/api');
const tracer = trace.getTracer('dayliff.ingestion');

async function persistNormalizedEvent(normalized) {
  const span = tracer.startSpan('ingestion.persist', {
    attributes: {
      source: normalized.source,
      source_event_id: normalized.sourceEventId,
      event_type: normalized.event.type
    }
  });

  const fallbackCustomerCode = `auto:${normalized.customer.email || normalized.customer.fullName}`;
  const resolvedCustomerCode = normalized.customer.customerCode || fallbackCustomerCode;

  try {
    const result = await prisma.$transaction(async (tx) => {
    const customer = await tx.customer.upsert({
      where: {
        customerCode: resolvedCustomerCode
      },
      create: {
        customerCode: resolvedCustomerCode,
        fullName: normalized.customer.fullName,
        email: normalized.customer.email,
        phone: normalized.customer.phone,
        region: normalized.customer.region
      },
      update: {
        fullName: normalized.customer.fullName,
        email: normalized.customer.email,
        phone: normalized.customer.phone,
        region: normalized.customer.region
      }
    });

    const journey = await tx.journey.upsert({
      where: { externalRef: normalized.journeyExternalRef },
      create: {
        externalRef: normalized.journeyExternalRef,
        customerId: customer.id,
        title: normalized.journey.title,
        description: normalized.journey.description,
        currentStage: normalized.event.stage || 'INQUIRY'
      },
      update: {
        customerId: customer.id,
        title: normalized.journey.title,
        description: normalized.journey.description,
        currentStage: normalized.event.stage || undefined
      }
    });

    const eventWhere = {
      source_sourceEventId: {
        source: normalized.source,
        sourceEventId: normalized.sourceEventId
      }
    };

    const existingEvent = await tx.journeyEvent.findUnique({ where: eventWhere });

    let event = existingEvent;
    let isNewEventInsert = false;

    if (!existingEvent) {
      try {
        event = await tx.journeyEvent.create({
          data: {
            journeyId: journey.id,
            stage: normalized.event.stage,
            eventType: normalized.event.type,
            source: normalized.source,
            sourceEventId: normalized.sourceEventId,
            sourceSystem: normalized.sourceSystem,
            occurredAt: normalized.event.occurredAt,
            actorUserId: normalized.event.actorUserId,
            actorName: normalized.event.actorName,
            payload: normalized.payload
          }
        });

        isNewEventInsert = true;
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          event = await tx.journeyEvent.findUnique({ where: eventWhere });
        } else {
          throw error;
        }
      }
    }

    if (
      isNewEventInsert
      && normalized.event.stage
      && normalized.event.type === 'STAGE_ENTERED'
    ) {
      const count = await tx.journeyStage.count({ where: { journeyId: journey.id } });

      await tx.journeyStage.updateMany({
        where: { journeyId: journey.id, isCurrent: true },
        data: { isCurrent: false, exitedAt: normalized.event.occurredAt }
      });

      await tx.journeyStage.create({
        data: {
          journeyId: journey.id,
          stage: normalized.event.stage,
          sequenceNo: count + 1,
          enteredAt: normalized.event.occurredAt,
          isCurrent: true,
          ownerUserId: normalized.event.actorUserId
        }
      });

      await tx.journey.update({
        where: { id: journey.id },
        data: { currentStage: normalized.event.stage }
      });
    }

    if (isNewEventInsert && normalized.event.type === 'DELIVERY_CONFIRMED') {
      await tx.journey.update({
        where: { id: journey.id },
        data: { status: 'COMPLETED', closedAt: normalized.event.occurredAt, currentStage: 'DELIVERY' }
      });
    }

    return {
      journeyId: journey.id,
      eventId: event.id,
      wasDuplicateEvent: !isNewEventInsert
    };
  });

    span.setAttribute('journey.id', result.journeyId);
    span.setAttribute('duplicate_event', result.wasDuplicateEvent);
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    throw error;
  } finally {
    span.end();
  }
}

module.exports = {
  persistNormalizedEvent
};
