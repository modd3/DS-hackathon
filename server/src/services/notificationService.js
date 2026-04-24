const { trace, SpanStatusCode, context, propagation } = require('@opentelemetry/api');
const { prisma } = require('../lib/prisma');
const tracer = trace.getTracer('dayliff.notifications');

// ─── helpers ────────────────────────────────────────────────────────────────

function injectTraceCarrier(span) {
  const carrier = {};
  propagation.inject(context.active(), carrier);
  span.setAttributes({
    'notification.traceparent': carrier.traceparent || '',
    'notification.tracestate':  carrier.tracestate  || '',
  });
  return carrier;
}

// ─── EMAIL ───────────────────────────────────────────────────────────────────

async function sendEmail(recipient, subject, body) {
  const span = tracer.startSpan('notification.email.send', {
    attributes: { 'notification.channel': 'email', 'notification.recipient': recipient },
  });
  injectTraceCarrier(span);

  try {
    // ── DEMO: log to console (remove in production) ──────────────────────────
    console.log('[email] DEMO — would send to:', recipient);
    console.log('  Subject:', subject);
    console.log('  Body:', body.slice(0, 120) + (body.length > 120 ? '…' : ''));
    // ── END DEMO ─────────────────────────────────────────────────────────────

    // ── PRODUCTION — SendGrid ─────────────────────────────────────────────────
    // npm install @sendgrid/mail
    //
    // const sgMail = require('@sendgrid/mail');
    // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    // await sgMail.send({
    //   to:      recipient,
    //   from:    process.env.EMAIL_FROM || 'noreply@dayliff.com',
    //   subject: subject,
    //   text:    body,
    //   html:    body.replace(/\n/g, '<br>'),
    // });
    // ─────────────────────────────────────────────────────────────────────────

    // ── PRODUCTION — AWS SES ──────────────────────────────────────────────────
    // npm install @aws-sdk/client-ses
    //
    // const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
    // const ses = new SESClient({ region: process.env.AWS_REGION || 'us-east-1' });
    // await ses.send(new SendEmailCommand({
    //   Destination: { ToAddresses: [recipient] },
    //   Message: {
    //     Subject: { Data: subject },
    //     Body:    { Text: { Data: body } },
    //   },
    //   Source: process.env.EMAIL_FROM || 'noreply@dayliff.com',
    // }));
    // ─────────────────────────────────────────────────────────────────────────

    span.setStatus({ code: SpanStatusCode.OK });
    return { success: true };
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    throw error;
  } finally {
    span.end();
  }
}

// ─── SMS ─────────────────────────────────────────────────────────────────────

async function sendSMS(recipient, message) {
  const span = tracer.startSpan('notification.sms.send', {
    attributes: { 'notification.channel': 'sms', 'notification.recipient': recipient },
  });
  injectTraceCarrier(span);

  try {
    // ── DEMO: log to console (remove in production) ──────────────────────────
    console.log('[sms] DEMO — would send to:', recipient);
    console.log('  Message:', message);
    // ── END DEMO ─────────────────────────────────────────────────────────────

    // ── PRODUCTION — Twilio ───────────────────────────────────────────────────
    // npm install twilio
    //
    // const twilio = require('twilio');
    // const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    // await client.messages.create({
    //   body: message,
    //   from: process.env.TWILIO_FROM_NUMBER,
    //   to:   recipient,
    // });
    // ─────────────────────────────────────────────────────────────────────────

    // ── PRODUCTION — Africa's Talking (recommended for Kenya/East Africa) ─────
    // npm install africastalking
    //
    // const AfricasTalking = require('africastalking');
    // const at = AfricasTalking({
    //   apiKey:   process.env.AT_API_KEY,
    //   username: process.env.AT_USERNAME,
    // });
    // await at.SMS.send({
    //   to:      [recipient],
    //   message: message,
    //   from:    process.env.AT_SENDER_ID,
    // });
    // ─────────────────────────────────────────────────────────────────────────

    span.setStatus({ code: SpanStatusCode.OK });
    return { success: true };
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    throw error;
  } finally {
    span.end();
  }
}

// ─── IN-APP ───────────────────────────────────────────────────────────────────
// Persists to the InAppNotification table so the dashboard bell can display it.
// No external provider needed — this is the fully working implementation.

async function sendInApp(recipient, title, message, meta = {}) {
  const span = tracer.startSpan('notification.inapp.send', {
    attributes: { 'notification.channel': 'in_app', 'notification.recipient': recipient },
  });
  injectTraceCarrier(span);

  try {
    const notification = await prisma.inAppNotification.create({
      data: {
        recipient,
        title,
        message,
        alertId:   meta.alertId   || null,
        journeyId: meta.journeyId || null,
      },
    });

    span.setAttribute('notification.id', notification.id);
    span.setStatus({ code: SpanStatusCode.OK });
    return { success: true, notificationId: notification.id };
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    throw error;
  } finally {
    span.end();
  }
}

// ─── dispatcher ──────────────────────────────────────────────────────────────

async function sendNotification(channel, recipient, data, meta = {}) {
  switch (channel) {
    case 'EMAIL':  return sendEmail(recipient, data.subject, data.body);
    case 'SMS':    return sendSMS(recipient, data.message);
    case 'IN_APP': return sendInApp(recipient, data.title, data.message, meta);
    default:       throw new Error(`Unsupported notification channel: ${channel}`);
  }
}

module.exports = { sendNotification, sendEmail, sendSMS, sendInApp };
