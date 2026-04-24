const express = require('express');
const { prisma } = require('../lib/prisma');
const { getJourneyTimeline } = require('../services/journeyTimelineService');

const router = express.Router();

// Analytics must be registered before /:journeyId to avoid route shadowing
router.get('/analytics', async (req, res) => {
  try {
    const { region, limit = 100 } = req.query;

    const journeys = await prisma.journey.findMany({
      where: {
        ...(region ? { customer: { region } } : {}),
      },
      include: {
        customer: { select: { region: true } },
        stages: { orderBy: { sequenceNo: 'asc' } },
        _count: { select: { events: true, slaBreaches: true } },
      },
      orderBy: { openedAt: 'desc' },
      take: Number(limit),
    });

    // Time-in-stage aggregates (minutes)
    const stageStats = { INQUIRY: [], DESIGN: [], QUOTATION: [], DELIVERY: [] };
    const now = new Date();

    for (const journey of journeys) {
      for (const stage of journey.stages) {
        const mins = Math.floor(
          (new Date(stage.exitedAt || now) - new Date(stage.enteredAt)) / 60000
        );
        if (stageStats[stage.stage]) stageStats[stage.stage].push(mins);
      }
    }

    function agg(arr) {
      if (!arr.length) return { avg: 0, min: 0, max: 0, count: 0 };
      const sorted = [...arr].sort((a, b) => a - b);
      const sum = arr.reduce((s, v) => s + v, 0);
      return {
        avg: Math.round(sum / arr.length),
        min: sorted[0],
        max: sorted[sorted.length - 1],
        count: arr.length,
      };
    }

    const stageDurations = Object.fromEntries(
      Object.entries(stageStats).map(([stage, arr]) => [stage, agg(arr)])
    );

    // Status breakdown
    const statusCounts = { ACTIVE: 0, STALLED: 0, COMPLETED: 0, CANCELLED: 0 };
    for (const j of journeys) statusCounts[j.status] = (statusCounts[j.status] || 0) + 1;

    // Region breakdown
    const regionCounts = {};
    for (const j of journeys) {
      const r = j.customer?.region || 'Unknown';
      regionCounts[r] = (regionCounts[r] || 0) + 1;
    }

    // Throughput: completed journeys with total duration
    const completed = journeys
      .filter(j => j.status === 'COMPLETED' && j.closedAt)
      .map(j => ({
        ref: j.externalRef || j.id.slice(0, 8),
        totalMins: Math.floor((new Date(j.closedAt) - new Date(j.openedAt)) / 60000),
      }))
      .sort((a, b) => a.totalMins - b.totalMins)
      .slice(0, 20);

    // Breach rate per stage
    const breachByStage = await prisma.slaBreach.groupBy({
      by: ['stage'],
      _count: { id: true },
    });

    return res.json({
      data: {
        totalJourneys: journeys.length,
        statusCounts,
        regionCounts,
        stageDurations,
        completedThroughput: completed,
        breachByStage: Object.fromEntries(breachByStage.map(b => [b.stage, b._count.id])),
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});
router.get('/', async (req, res) => {
  try {
    const { status, region, limit = 20 } = req.query;

    const journeys = await prisma.journey.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(region ? { customer: { region } } : {})
      },
      include: {
        customer: true,
        _count: { select: { events: true, slaBreaches: true } }
      },
      orderBy: { updatedAt: 'desc' },
      take: Number(limit)
    });

    return res.json({ data: journeys });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/:journeyId/timeline', async (req, res) => {
  try {
    const timeline = await getJourneyTimeline(req.params.journeyId);

    if (!timeline) {
      return res.status(404).json({ error: 'Journey not found.' });
    }

    return res.json({ data: timeline });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/:journeyId/current-status', async (req, res) => {
  try {
    const journey = await prisma.journey.findUnique({
      where: { id: req.params.journeyId },
      include: {
        stages: {
          where: { isCurrent: true },
          take: 1
        },
        slaBreaches: {
          where: { isResolved: false },
          orderBy: { breachedAt: 'desc' },
          take: 1
        }
      }
    });

    if (!journey) {
      return res.status(404).json({ error: 'Journey not found.' });
    }

    return res.json({
      data: {
        journeyId: journey.id,
        status: journey.status,
        currentStage: journey.currentStage,
        currentOwner: journey.stages[0]?.ownerUserId || null,
        activeBreach: journey.slaBreaches[0] || null,
        lastUpdatedAt: journey.updatedAt
      }
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = { journeysRouter: router };
