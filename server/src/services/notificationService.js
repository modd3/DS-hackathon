const { trace, SpanStatusCode, context, propagation } = require('@opentelemetry/api');
const tracer = trace.getTracer('dayliff.notifications');

async function sendEmail(recipient, subject, body, traceContext = {}) {
  const span = tracer.startSpan('notification.email.send', {
    attributes: {
      'notification.channel': 'email',
      'notification.recipient': recipient
    }
  });

  // Inject trace context into headers
  const carrier = {};
  propagation.inject(context.active(), carrier);
  span.setAttributes({
    'notification.traceparent': carrier.traceparent || '',
    'notification.tracestate': carrier.tracestate || ''
  });

  try {
    // Prototype email sending - replace with real provider (SendGrid, SES, etc.)
    console.log('[email-notification] sending', {
      recipient,
      subject,
      body,
      traceContext: carrier
    });

    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 100));

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

async function sendSMS(recipient, message, traceContext = {}) {
  const span = tracer.startSpan('notification.sms.send', {
    attributes: {
      'notification.channel': 'sms',
      'notification.recipient': recipient
    }
  });

  // Inject trace context
  const carrier = {};
  propagation.inject(context.active(), carrier);
  span.setAttributes({
    'notification.traceparent': carrier.traceparent || '',
    'notification.tracestate': carrier.tracestate || ''
  });

  try {
    // Prototype SMS sending - replace with real provider (Twilio, etc.)
    console.log('[sms-notification] sending', {
      recipient,
      message,
      traceContext: carrier
    });

    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 50));

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

async function sendInApp(recipient, title, message, traceContext = {}) {
  const span = tracer.startSpan('notification.inapp.send', {
    attributes: {
      'notification.channel': 'in_app',
      'notification.recipient': recipient
    }
  });

  // Inject trace context
  const carrier = {};
  propagation.inject(context.active(), carrier);
  span.setAttributes({
    'notification.traceparent': carrier.traceparent || '',
    'notification.tracestate': carrier.tracestate || ''
  });

  try {
    // Prototype in-app notification - replace with real implementation
    console.log('[inapp-notification] sending', {
      recipient,
      title,
      message,
      traceContext: carrier
    });

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

async function sendNotification(channel, recipient, data, traceContext = {}) {
  switch (channel) {
    case 'EMAIL':
      return sendEmail(recipient, data.subject, data.body, traceContext);
    case 'SMS':
      return sendSMS(recipient, data.message, traceContext);
    case 'IN_APP':
      return sendInApp(recipient, data.title, data.message, traceContext);
    default:
      throw new Error(`Unsupported notification channel: ${channel}`);
  }
}

module.exports = {
  sendNotification,
  sendEmail,
  sendSMS,
  sendInApp
};