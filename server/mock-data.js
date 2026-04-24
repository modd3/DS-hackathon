const crypto = require('crypto');

// Update these values to match your .env
const WEBHOOK_SHARED_SECRET = process.env.WEBHOOK_SHARED_SECRET;
const SERVER_URL = 'http://localhost:4000';
function sendEvent(system, eventData) {
  const payload = JSON.stringify(eventData);
  
  // Calculate signature (this is what the server verifies)
  const signature = crypto
    .createHmac('sha256', WEBHOOK_SHARED_SECRET)
    .update(payload)
    .digest('hex');

  return fetch(`${SERVER_URL}/api/webhooks/${system}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-dayliff-webhook-token': WEBHOOK_SHARED_SECRET,
      'x-dayliff-signature': signature
    },
    body: payload
  })
  .then(res => res.json())
  .then(data => console.log(`✅ ${system} event sent:`, data))
  .catch(err => console.error(`❌ Failed:`, err.message));
}

// Send a new customer inquiry from CRM
async function sendNewInquiry() {
  await sendEvent('crm', {
    sourceEventId: `test_${Date.now()}`,
    sourceSystem: 'crm',
    journeyExternalRef: `INV-${Math.floor(Math.random() * 10000)}`,
    customer: {
      fullName: 'John Doe',
      email: 'john@example.com',
      phone: '+254700123456',
      region: 'Nairobi',
      customerCode: 'CUST-00123'
    },
    journey: {
      title: 'Solar water pump installation request',
      description: 'Customer needs pump for 10,000L tank'
    },
    event: {
      type: 'REQUEST_CREATED',
      stage: 'INQUIRY',
      occurredAt: new Date().toISOString(),
      actorUserId: 'sales_54',
      actorName: 'Mercy K.'
    },
    payload: {}
  });
  
  console.log("\n✅ Now go to the dashboard and you will see this journey appear!");
  console.log("⏱  Wait 2 minutes and you will see an SLA breach alert automatically created");
}

// Run it
sendNewInquiry();
