const { prisma } = require('../lib/prisma');
const { trace, SpanStatusCode } = require('@opentelemetry/api');
const tracer = trace.getTracer('dayliff.alerts');

async function dispatchPendingAlerts(limit = 100) {
  const span = tracer.startSpan('alerts.dispatch');
  try {
    const pendingAlerts = await prisma.alert.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      take: limit
    });

    let sent = 0;
    let failed = 0;

    for (const alert of pendingAlerts) {
      try {
        // Prototype delivery shim (replace with real provider adapters).
        console.log('[alert-dispatcher] sending', {
          alertId: alert.id,
          channel: alert.channel,
          recipient: alert.recipient
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
      } catch (error) {
        await prisma.alert.update({
          where: { id: alert.id },
          data: {
            status: 'FAILED',
            errorMessage: error.message
          }
        });

        failed += 1;
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
