/**
 * Prisma seed — SLA rules
 * Run: npx prisma db seed
 *
 * In a real-world deployment these rules represent agreed business policy
 * (e.g. from an SLA contract or internal OKRs). They ship with the app and
 * are tuned via the Admin UI or a follow-up migration — not by developers
 * editing code on every change.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const RECIPIENT = process.env.ALERT_DEFAULT_RECIPIENT || 'operations@dayliff.local';

const SLA_RULES = [
  {
    name: 'Inquiry Response SLA',
    description: 'Initial customer inquiry must be acknowledged and moved to Design within 2 hours.',
    stage: 'INQUIRY',
    maxDurationMins: 120,
    alertChannels: ['IN_APP', 'EMAIL'],
    alertRecipients: [RECIPIENT],
    scope: 'GLOBAL',
  },
  {
    name: 'Engineering Design SLA',
    description: 'Engineering design phase must be completed within 48 hours of handoff.',
    stage: 'DESIGN',
    maxDurationMins: 2880,
    alertChannels: ['IN_APP', 'EMAIL'],
    alertRecipients: [RECIPIENT],
    scope: 'GLOBAL',
  },
  {
    name: 'Quotation Submission SLA',
    description: 'Quotation must be submitted to the customer within 24 hours of design approval.',
    stage: 'QUOTATION',
    maxDurationMins: 1440,
    alertChannels: ['IN_APP', 'EMAIL', 'SMS'],
    alertRecipients: [RECIPIENT],
    scope: 'GLOBAL',
  },
  {
    name: 'Delivery Completion SLA',
    description: 'Delivery must be completed within 72 hours of confirmed order.',
    stage: 'DELIVERY',
    maxDurationMins: 4320,
    alertChannels: ['IN_APP', 'EMAIL'],
    alertRecipients: [RECIPIENT],
    scope: 'GLOBAL',
  },
];

async function main() {
  console.log('Seeding SLA rules…');
  for (const rule of SLA_RULES) {
    await prisma.slaRule.upsert({
      where: { name: rule.name },
      update: { ...rule },
      create: { ...rule },
    });
    console.log(`  ✅  ${rule.stage.padEnd(10)} — ${rule.name} (max ${rule.maxDurationMins} min)`);
  }
  console.log(`\nDone. ${SLA_RULES.length} rules seeded.`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
