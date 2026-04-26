const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http');
const { PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');

let sdk;

function initTelemetry() {
  if (process.env.OTEL_ENABLED === 'false') {
    return;
  }

  const authHeader = process.env.OTEL_EXPORTER_AUTH_HEADER;
  const serviceName = process.env.OTEL_SERVICE_NAME || 'dayliff-1000-eyes-server';
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';

  const traceExporter = new OTLPTraceExporter({
    url: `${endpoint}/v1/traces`,
    headers: authHeader ? {Authorization: authHeader} : {}
  });

  const metricExporter = new OTLPMetricExporter({
    url: `${endpoint}/v1/metrics`,
    headers: authHeader ? {Authorization: authHeader} : {}
  });

  sdk = new NodeSDK({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName
    }),
    traceExporter,
    metricReader: new PeriodicExportingMetricReader({
      exporter: metricExporter,
      exportIntervalMillis: Number(process.env.OTEL_METRIC_EXPORT_INTERVAL_MS || 10000)
    })
  });

  sdk.start();
}

async function shutdownTelemetry() {
  if (!sdk) return;
  await sdk.shutdown();
}

module.exports = {
  initTelemetry,
  shutdownTelemetry
};
