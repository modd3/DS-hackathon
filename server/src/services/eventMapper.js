const { z } = require('zod');

const sourceEventSchema = z.object({
  sourceEventId: z.string().min(1),
  sourceSystem: z.string().min(1),
  journeyExternalRef: z.string().min(1),
  customer: z.object({
    fullName: z.string().min(1),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    region: z.string().optional(),
    customerCode: z.string().optional()
  }),
  journey: z.object({
    title: z.string().min(1),
    description: z.string().optional()
  }),
  event: z.object({
    type: z.enum([
      'REQUEST_CREATED',
      'STAGE_ENTERED',
      'STAGE_COMPLETED',
      'STATUS_UPDATED',
      'HANDOFF',
      'COMMENT_ADDED',
      'DOCUMENT_UPLOADED',
      'SLA_WARNING',
      'SLA_BREACH',
      'DELIVERY_CONFIRMED'
    ]),
    stage: z.enum(['INQUIRY', 'DESIGN', 'QUOTATION', 'DELIVERY']).optional(),
    occurredAt: z.coerce.date(),
    actorUserId: z.string().optional(),
    actorName: z.string().optional()
  }),
  payload: z.record(z.any()).default({})
});

const sourceToEventSource = {
  crm: 'CRM',
  engineering: 'ENGINEERING',
  erp: 'ERP'
};

function mapIncomingEvent({ source, body }) {
  const parsed = sourceEventSchema.parse(body);

  const sourceKey = String(source).toLowerCase();
  const eventSource = sourceToEventSource[sourceKey];

  if (!eventSource) {
    throw new Error(`Unsupported source: ${source}`);
  }

  return {
    source: eventSource,
    sourceEventId: parsed.sourceEventId,
    sourceSystem: parsed.sourceSystem,
    journeyExternalRef: parsed.journeyExternalRef,
    customer: parsed.customer,
    journey: parsed.journey,
    event: parsed.event,
    payload: parsed.payload
  };
}

module.exports = {
  mapIncomingEvent
};
