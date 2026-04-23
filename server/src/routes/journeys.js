const express = require('express');
const { prisma } = require('../lib/prisma');
const { getJourneyTimeline } = require('../services/journeyTimelineService');

const router = express.Router();

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
