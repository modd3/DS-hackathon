const { prisma } = require('../lib/prisma');
const { trace, SpanStatusCode } = require('@opentelemetry/api');
const { sendNotification } = require('../services/notificationService');
const tracer = trace.getTracer('dayliff.alerts');

async function dispatchPendingAlerts(limit = 100) {
  const span = tracer.startSpan('alerts.dispatch');
  try {
    const pendingAlerts = await prisma.alert.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      take: limit,
      include: {
        breach: {
          include: {
            journey: {
              include: { customer: true }
            },
            rule: true
          }
        }
      }
    });

    let sent = 0;
    let failed = 0;

    for (const alert of pendingAlerts) {
      const alertSpan = tracer.startSpan('alert.send', {
        attributes: {
          'alert.id': alert.id,
          'alert.channel': alert.channel,
          'alert.recipient': alert.recipient
        }
      });

      try {
        // Prepare notification data based on breach details
        const breach = alert.breach;
        const journey = breach.journey;
        const customer = journey.customer;
        const rule = breach.rule;

        let notificationData;
        switch (alert.channel) {
          case 'EMAIL':
            notificationData = {
              subject: `SLA Breach Alert: ${journey.title}`,
              body: `SLA breach detected for journey "${journey.title}" (Customer: ${customer.fullName}).
Stage: ${breach.stage}
Rule: ${rule.name}
Breached at: ${breach.breachedAt.toISOString()}
Duration: ${breach.durationMins} minutes over ${rule.maxDurationMins} minute limit

Please review and take action.`
            };
            break;
          case 'SMS':
            notificationData = {
              message: `SLA Breach: ${journey.title} - ${breach.stage} stage exceeded ${rule.maxDurationMins}min limit.`
            };
            break;
          case 'IN_APP':
            notificationData = {
              title: 'SLA Breach Alert',
              message: `${journey.title} has breached SLA in ${breach.stage} stage.`
            };
            break;
          default:
            throw new Error(`Unsupported channel: ${alert.channel}`);
        }

        // Send notification with trace context propagation
        await sendNotification(alert.channel, alert.recipient, notificationData, {
          alertId:   alert.id,
          journeyId: breach.journeyId,
        });

        await prisma.alert.update({
          where: { id: alert.id },
          data: {
            status: 'SENT',
            sentAt: new Date(),
            errorMessage: null
          }
        });

        sent += 1;
        alertSpan.setStatus({ code: SpanStatusCode.OK });
      } catch (error) {
        await prisma.alert.update({
          where: { id: alert.id },
          data: {
            status: 'FAILED',
            errorMessage: error.message
          }
        });

        failed += 1;
        alertSpan.recordException(error);
        alertSpan.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      } finally {
        alertSpan.end();
      }
    }

    span.setAttribute('alerts.sent', sent);
    span.setAttribute('alerts.failed', failed);
    span.setStatus({ code: SpanStatusCode.OK });

    return {
      scanned: pendingAlerts.length,
      sent,
      failed
    };
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    throw error;
  } finally {
    span.end();
  }
}

module.exports = {
  dispatchPendingAlerts
};
