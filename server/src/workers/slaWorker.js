const { prisma } = require('../lib/prisma');

function minutesBetween(start, end) {
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
}

async function evaluateSlaBreaches(now = new Date()) {
  const rules = await prisma.slaRule.findMany({ where: { isActive: true } });

  if (!rules.length) {
    return { checkedJourneys: 0, breachesCreated: 0 };
  }

  const activeJourneys = await prisma.journey.findMany({
    where: { status: { in: ['ACTIVE', 'STALLED'] } },
    include: {
      stages: {
        where: { isCurrent: true },
        take: 1
      }
    }
  });

  let breachesCreated = 0;

  for (const journey of activeJourneys) {
    const currentStage = journey.stages[0];
    if (!currentStage) continue;

    const stageRules = rules.filter((rule) => rule.stage === currentStage.stage);
    for (const rule of stageRules) {
      const durationMins = minutesBetween(currentStage.enteredAt, now);
      if (durationMins <= rule.maxDurationMins) continue;

      const existing = await prisma.slaBreach.findFirst({
        where: {
          journeyId: journey.id,
          ruleId: rule.id,
          isResolved: false
        }
      });

      if (existing) continue;

      await prisma.slaBreach.create({
        data: {
          journeyId: journey.id,
          ruleId: rule.id,
          stage: currentStage.stage,
          breachedAt: now,
          durationMins,
          alerts: {
            create: rule.alertChannels.map((channel) => ({
              channel,
              recipient: 'operations@dayliff.local',
              status: 'PENDING'
            }))
          }
        }
      });

      await prisma.journey.update({
        where: { id: journey.id },
        data: { status: 'STALLED' }
      });

      breachesCreated += 1;
    }
  }

  return {
    checkedJourneys: activeJourneys.length,
    breachesCreated
  };
}

module.exports = {
  evaluateSlaBreaches
};
