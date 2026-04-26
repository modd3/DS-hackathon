/**
 * Dayliff 1000 Eyes — Demo Seed Script
 *
 * Simulates a realistic day of operations across Dayliff's CRM, Engineering,
 * and ERP systems. Run with:
 *
 *   node mock-data.js
 *
 * Requires a running server at http://localhost:4000 and a valid .env with
 * WEBHOOK_SHARED_SECRET set.
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const crypto = require('crypto');

const SECRET = process.env.WEBHOOK_SHARED_SECRET;
if (!SECRET) {
  console.error('❌  WEBHOOK_SHARED_SECRET not set — check server/.env');
  process.exit(1);
}
const SERVER = 'http://localhost:4000';

// ─── helpers ────────────────────────────────────────────────────────────────

function hoursAgo(h) {
  return new Date(Date.now() - h * 60 * 60 * 1000).toISOString();
}

function minsAgo(m) {
  return new Date(Date.now() - m * 60 * 1000).toISOString();
}

async function send(system, body) {
  const payload = JSON.stringify(body);
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
  const res = await fetch(`${SERVER}/api/webhooks/${system}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-dayliff-webhook-token': SECRET,
      'x-dayliff-signature': sig,
    },
    body: payload,
  });
  const data = await res.json();
  console.log('[webhook]', data)
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;
}

function log(label, ref) {
  console.log(`  ✅  ${label.padEnd(42)} [${ref}]`);
}

// ─── scenario data ───────────────────────────────────────────────────────────

const JOURNEYS = [
  // 1. Completed delivery — Mombasa borehole project
  {
    ref: 'JRN-2025-0041',
    customer: { fullName: 'Coastal Agri-Ventures Ltd', email: 'ops@coastalagri.co.ke', phone: '+254711200100', region: 'Mombasa', customerCode: 'CUST-0041' },
    title: 'Borehole pump installation — Kilifi farm (50m depth)',
    events: [
      { system: 'crm',         type: 'REQUEST_CREATED',    stage: 'INQUIRY',    at: hoursAgo(72), actor: 'Amina Odhiambo',   id: 'E041-01' },
      { system: 'crm',         type: 'STAGE_ENTERED',      stage: 'DESIGN',     at: hoursAgo(68), actor: 'Brian Mwangi',     id: 'E041-02' },
      { system: 'engineering', type: 'HANDOFF',            stage: 'DESIGN',     at: hoursAgo(66), actor: 'Brian Mwangi',     id: 'E041-03' },
      { system: 'engineering', type: 'DOCUMENT_UPLOADED',  stage: 'DESIGN',     at: hoursAgo(60), actor: 'Brian Mwangi',     id: 'E041-04', payload: { doc: 'site-survey-kilifi.pdf' } },
      { system: 'engineering', type: 'STAGE_COMPLETED',    stage: 'DESIGN',     at: hoursAgo(55), actor: 'Brian Mwangi',     id: 'E041-05' },
      { system: 'crm',         type: 'STAGE_ENTERED',      stage: 'QUOTATION',  at: hoursAgo(54), actor: 'Amina Odhiambo',   id: 'E041-06' },
      { system: 'crm',         type: 'DOCUMENT_UPLOADED',  stage: 'QUOTATION',  at: hoursAgo(50), actor: 'Amina Odhiambo',   id: 'E041-07', payload: { doc: 'quotation-Q2025-041.pdf', amount: 485000 } },
      { system: 'crm',         type: 'STAGE_COMPLETED',    stage: 'QUOTATION',  at: hoursAgo(48), actor: 'Amina Odhiambo',   id: 'E041-08' },
      { system: 'erp',         type: 'STAGE_ENTERED',      stage: 'DELIVERY',   at: hoursAgo(24), actor: 'Logistics ERP',    id: 'E041-09' },
      { system: 'erp',         type: 'DELIVERY_CONFIRMED', stage: 'DELIVERY',   at: hoursAgo(2),  actor: 'Logistics ERP',    id: 'E041-10', payload: { invoiceNo: 'INV-2025-0041', deliveredBy: 'Dayliff Mombasa Branch' } },
    ],
  },

  // 2. Active — Nairobi hospital solar water heating, currently in DESIGN (SLA at risk)
  {
    ref: 'JRN-2025-0058',
    customer: { fullName: 'Kenyatta National Hospital', email: 'facilities@knh.or.ke', phone: '+254202726300', region: 'Nairobi', customerCode: 'CUST-0058' },
    title: 'Solar water heating system — 500L capacity, ward block C',
    events: [
      { system: 'crm',         type: 'REQUEST_CREATED',   stage: 'INQUIRY',   at: hoursAgo(30), actor: 'Peter Kariuki',    id: 'E058-01' },
      { system: 'crm',         type: 'COMMENT_ADDED',     stage: 'INQUIRY',   at: hoursAgo(28), actor: 'Peter Kariuki',    id: 'E058-02', payload: { comment: 'Client requires KEBS-certified panels only. Budget approved at KES 320,000.' } },
      { system: 'crm',         type: 'STAGE_ENTERED',     stage: 'DESIGN',    at: hoursAgo(26), actor: 'Peter Kariuki',    id: 'E058-03' },
      { system: 'engineering', type: 'HANDOFF',           stage: 'DESIGN',    at: hoursAgo(25), actor: 'Grace Njoroge',    id: 'E058-04' },
      { system: 'engineering', type: 'COMMENT_ADDED',     stage: 'DESIGN',    at: hoursAgo(10), actor: 'Grace Njoroge',    id: 'E058-05', payload: { comment: 'Roof load assessment pending structural engineer sign-off.' } },
    ],
  },

  // 3. Stalled — Kisumu irrigation project, stuck in QUOTATION for 3 days
  {
    ref: 'JRN-2025-0063',
    customer: { fullName: 'Nyanza Flower Farms', email: 'procurement@nyanzaflowers.co.ke', phone: '+254572021900', region: 'Kisumu', customerCode: 'CUST-0063' },
    title: 'Drip irrigation pump system — 40-acre flower farm',
    events: [
      { system: 'crm',         type: 'REQUEST_CREATED',   stage: 'INQUIRY',    at: hoursAgo(96), actor: 'Samuel Otieno',   id: 'E063-01' },
      { system: 'crm',         type: 'STAGE_ENTERED',     stage: 'DESIGN',     at: hoursAgo(90), actor: 'Samuel Otieno',   id: 'E063-02' },
      { system: 'engineering', type: 'HANDOFF',           stage: 'DESIGN',     at: hoursAgo(89), actor: 'David Ochieng',   id: 'E063-03' },
      { system: 'engineering', type: 'DOCUMENT_UPLOADED', stage: 'DESIGN',     at: hoursAgo(80), actor: 'David Ochieng',   id: 'E063-04', payload: { doc: 'hydraulic-design-nyanza.pdf' } },
      { system: 'engineering', type: 'STAGE_COMPLETED',   stage: 'DESIGN',     at: hoursAgo(78), actor: 'David Ochieng',   id: 'E063-05' },
      { system: 'crm',         type: 'STAGE_ENTERED',     stage: 'QUOTATION',  at: hoursAgo(77), actor: 'Samuel Otieno',   id: 'E063-06' },
      { system: 'crm',         type: 'COMMENT_ADDED',     stage: 'QUOTATION',  at: hoursAgo(72), actor: 'Samuel Otieno',   id: 'E063-07', payload: { comment: 'Awaiting updated pump pricing from procurement. Client following up.' } },
      { system: 'crm',         type: 'STATUS_UPDATED',    stage: 'QUOTATION',  at: hoursAgo(48), actor: 'Samuel Otieno',   id: 'E063-08', payload: { status: 'STALLED', reason: 'Procurement delay on Grundfos SP17-14 pump stock' } },
    ],
  },

  // 4. Active — Nakuru dairy farm, just entered DELIVERY
  {
    ref: 'JRN-2025-0071',
    customer: { fullName: 'Rift Valley Dairy Co-op', email: 'admin@rvdairy.co.ke', phone: '+254512213400', region: 'Nakuru', customerCode: 'CUST-0071' },
    title: 'Submersible pump + pressure tank — dairy processing plant',
    events: [
      { system: 'crm',         type: 'REQUEST_CREATED',   stage: 'INQUIRY',    at: hoursAgo(50), actor: 'Faith Wanjiku',   id: 'E071-01' },
      { system: 'crm',         type: 'STAGE_ENTERED',     stage: 'DESIGN',     at: hoursAgo(46), actor: 'Faith Wanjiku',   id: 'E071-02' },
      { system: 'engineering', type: 'HANDOFF',           stage: 'DESIGN',     at: hoursAgo(45), actor: 'James Kamau',     id: 'E071-03' },
      { system: 'engineering', type: 'STAGE_COMPLETED',   stage: 'DESIGN',     at: hoursAgo(38), actor: 'James Kamau',     id: 'E071-04' },
      { system: 'crm',         type: 'STAGE_ENTERED',     stage: 'QUOTATION',  at: hoursAgo(37), actor: 'Faith Wanjiku',   id: 'E071-05' },
      { system: 'crm',         type: 'DOCUMENT_UPLOADED', stage: 'QUOTATION',  at: hoursAgo(34), actor: 'Faith Wanjiku',   id: 'E071-06', payload: { doc: 'quotation-Q2025-071.pdf', amount: 210000 } },
      { system: 'crm',         type: 'STAGE_COMPLETED',   stage: 'QUOTATION',  at: hoursAgo(30), actor: 'Faith Wanjiku',   id: 'E071-07' },
      { system: 'erp',         type: 'STAGE_ENTERED',     stage: 'DELIVERY',   at: hoursAgo(6),  actor: 'Logistics ERP',   id: 'E071-08' },
      { system: 'erp',         type: 'COMMENT_ADDED',     stage: 'DELIVERY',   at: minsAgo(90),  actor: 'Logistics ERP',   id: 'E071-09', payload: { comment: 'Truck dispatched from Nakuru depot. ETA 2 hours.' } },
    ],
  },

  // 5. Active — Eldoret school, fresh inquiry (just came in)
  {
    ref: 'JRN-2025-0079',
    customer: { fullName: 'Moi Girls High School', email: 'bursar@moigirls.sc.ke', phone: '+254532033100', region: 'Eldoret', customerCode: 'CUST-0079' },
    title: 'Rainwater harvesting pump + 10,000L tank — school dormitory block',
    events: [
      { system: 'crm', type: 'REQUEST_CREATED', stage: 'INQUIRY', at: minsAgo(45), actor: 'Collins Ruto', id: 'E079-01', payload: { source: 'website-inquiry-form', priority: 'high' } },
      { system: 'crm', type: 'COMMENT_ADDED',   stage: 'INQUIRY', at: minsAgo(30), actor: 'Collins Ruto', id: 'E079-02', payload: { comment: 'School term starts in 3 weeks. Client needs installation completed before reopening.' } },
    ],
  },

  // 6. Completed — Nairobi apartment complex, quick turnaround
  {
    ref: 'JRN-2025-0055',
    customer: { fullName: 'Upperhill Apartments Ltd', email: 'manager@upperhillapts.co.ke', phone: '+254202710500', region: 'Nairobi', customerCode: 'CUST-0055' },
    title: 'Booster pump system — 12-storey residential block, 3 pumps',
    events: [
      { system: 'crm',         type: 'REQUEST_CREATED',   stage: 'INQUIRY',    at: hoursAgo(120), actor: 'Lydia Muthoni',  id: 'E055-01' },
      { system: 'crm',         type: 'STAGE_ENTERED',     stage: 'DESIGN',     at: hoursAgo(116), actor: 'Lydia Muthoni',  id: 'E055-02' },
      { system: 'engineering', type: 'HANDOFF',           stage: 'DESIGN',     at: hoursAgo(115), actor: 'Eric Njuguna',   id: 'E055-03' },
      { system: 'engineering', type: 'STAGE_COMPLETED',   stage: 'DESIGN',     at: hoursAgo(108), actor: 'Eric Njuguna',   id: 'E055-04' },
      { system: 'crm',         type: 'STAGE_ENTERED',     stage: 'QUOTATION',  at: hoursAgo(107), actor: 'Lydia Muthoni',  id: 'E055-05' },
      { system: 'crm',         type: 'STAGE_COMPLETED',   stage: 'QUOTATION',  at: hoursAgo(100), actor: 'Lydia Muthoni',  id: 'E055-06' },
      { system: 'erp',         type: 'STAGE_ENTERED',     stage: 'DELIVERY',   at: hoursAgo(48),  actor: 'Logistics ERP',  id: 'E055-07' },
      { system: 'erp',         type: 'DELIVERY_CONFIRMED',stage: 'DELIVERY',   at: hoursAgo(20),  actor: 'Logistics ERP',  id: 'E055-08', payload: { invoiceNo: 'INV-2025-0055', deliveredBy: 'Dayliff Nairobi Branch' } },
    ],
  },

  // 7. Active — Garissa solar pumping station (remote region, high-value)
  {
    ref: 'JRN-2025-0082',
    customer: { fullName: 'Tana River County Government', email: 'water@tanariver.go.ke', phone: '+254465522100', region: 'Garissa', customerCode: 'CUST-0082' },
    title: 'Solar-powered community water pumping station — 3 villages, 15,000 beneficiaries',
    events: [
      { system: 'crm',         type: 'REQUEST_CREATED',   stage: 'INQUIRY',    at: hoursAgo(18), actor: 'Hassan Abdi',    id: 'E082-01', payload: { fundingSource: 'World Bank WASH Grant', estimatedValue: 4200000 } },
      { system: 'crm',         type: 'COMMENT_ADDED',     stage: 'INQUIRY',    at: hoursAgo(16), actor: 'Hassan Abdi',    id: 'E082-02', payload: { comment: 'Donor reporting deadline: end of quarter. Expedited processing requested.' } },
      { system: 'crm',         type: 'STAGE_ENTERED',     stage: 'DESIGN',     at: hoursAgo(14), actor: 'Hassan Abdi',    id: 'E082-03' },
      { system: 'engineering', type: 'HANDOFF',           stage: 'DESIGN',     at: hoursAgo(13), actor: 'Fatuma Warsame', id: 'E082-04' },
      { system: 'engineering', type: 'COMMENT_ADDED',     stage: 'DESIGN',     at: minsAgo(120), actor: 'Fatuma Warsame', id: 'E082-05', payload: { comment: 'Remote site survey scheduled for tomorrow. Solar irradiance data pulled from NASA POWER API.' } },
      { system: 'crm',         type: 'STAGE_ENTERED',     stage: 'QUOTATION',  at: hoursAgo(107), actor: 'Lydia Muthoni',  id: 'E082-05' },
      { system: 'crm',         type: 'STAGE_COMPLETED',   stage: 'QUOTATION',  at: hoursAgo(100), actor: 'Lydia Muthoni',  id: 'E082-06' },
      { system: 'erp',         type: 'STAGE_ENTERED',     stage: 'DELIVERY',   at: minsAgo(50),  actor: 'Logistics ERP',  id: 'E082-07' },
      { system: 'erp',         type: 'DELIVERY_CONFIRMED',stage: 'DELIVERY',   at: minsAgo(20),  actor: 'Logistics ERP',  id: 'E082-08', payload: { invoiceNo: 'INV-2025-00556655', deliveredBy: 'Dayliff Garissa Branch' } },
    ],
  },
  {
  ref: 'JRN-2025-0090',                          // unique ref
  customer: {
    fullName: 'Dayliff Demo Customer',
    email: 'demo@example.com',
    phone: '+254700000000',
    region: 'Nairobi',
    customerCode: 'CUST-0090'                    // unique customer code
  },
  title: 'Your journey title here',
  events: [
    { system: 'crm', type: 'REQUEST_CREATED', stage: 'INQUIRY',
      at: minsAgo(10), actor: 'Your Name', id: 'E090-01' },  // unique id
  ],
},
];

// ─── seed ────────────────────────────────────────────────────────────────────

async function seed() {
  console.log('\n🌍  Dayliff 1000 Eyes — Demo Seed\n');
  console.log(`    Server : ${SERVER}`);
  console.log(`    Journeys: ${JOURNEYS.length}\n`);

  let total = 0;
  let failed = 0;

  for (const journey of JOURNEYS) {
    console.log(`\n📋  ${journey.ref} — ${journey.title}`);
    console.log(`    Customer: ${journey.customer.fullName} (${journey.customer.region})`);

    for (const ev of journey.events) {
      const body = {
        sourceEventId: ev.id,
        sourceSystem: ev.system,
        journeyExternalRef: journey.ref,
        customer: journey.customer,
        journey: { title: journey.title, description: journey.title },
        event: {
          type: ev.type,
          stage: ev.stage,
          occurredAt: ev.at,
          actorName: ev.actor,
          actorUserId: ev.actor.toLowerCase().replace(/\s+/g, '_'),
        },
        payload: ev.payload || {},
      };

      try {
        await send(ev.system, body);
        log(`${ev.type} (${ev.stage})`, ev.id);
        total++;
      } catch (err) {
        console.error(`  ❌  ${ev.type} [${ev.id}] — ${err.message}`);
        failed++;
      }

      // Small delay to preserve event ordering
      await new Promise(r => setTimeout(r, 80));
    }
  }

  console.log(`\n${'─'.repeat(56)}`);
  console.log(`✅  Seeded ${total} events across ${JOURNEYS.length} journeys`);
  if (failed > 0) console.log(`⚠️   ${failed} events failed — check server logs`);
  console.log(`\n🔗  Open http://localhost:3000 to explore the dashboard`);
  console.log(`    • JRN-2025-0041 & 0055 → COMPLETED journeys`);
  console.log(`    • JRN-2025-0063       → STALLED in QUOTATION (SLA breach likely)`);
  console.log(`    • JRN-2025-0058 & 082 → ACTIVE in DESIGN`);
  console.log(`    • JRN-2025-0071       → ACTIVE in DELIVERY`);
  console.log(`    • JRN-2025-0079       → Fresh INQUIRY (school, urgent)\n`);
}

seed().catch(err => {
  console.error('\n💥  Seed failed:', err.message);
  process.exit(1);
});
