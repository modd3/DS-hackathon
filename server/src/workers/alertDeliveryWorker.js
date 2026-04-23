const { prisma } = require('../lib/prisma');

async function dispatchPendingAlerts(limit = 100) {
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

  return {
    scanned: pendingAlerts.length,
    sent,
    failed
  };
}

module.exports = {
  dispatchPendingAlerts
};
