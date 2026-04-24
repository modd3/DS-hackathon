# Dayliff 1000 Eyes Server

An event-driven observability backend for Dayliff 1000 Eyes, built with Node.js, Express, Prisma, and PostgreSQL. This server ingests events from CRM, Engineering, and ERP systems to reconstruct customer journey timelines, detect SLA breaches, and dispatch alerts.

## Features

- **Event Ingestion**: Webhook endpoints for CRM, Engineering, and ERP events with signature validation.
- **Journey Timeline**: Reconstructs unified timelines from event streams.
- **SLA Monitoring**: Automated SLA breach detection and alerting.
- **Queue Management**: In-process event bus with file-backed persistence or Redis Streams support.
- **Metrics & Tracing**: Prometheus metrics and OpenTelemetry tracing.
- **Health Checks**: Broker health probes and SLO policy evaluation.

## Architecture Overview

### Core Components

- **Server (`src/server.js`)**: Entry point, initializes telemetry, starts workers, and runs Express app.
- **App (`src/app.js`)**: Express app with routes, middleware, and health endpoints.
- **Prisma (`src/lib/prisma.js`)**: Database client for PostgreSQL.
- **Event Bus (`src/lib/eventBus.js`)**: Abstraction for event queuing (file-state or Redis Streams).
- **Workers**:
  - `ingestionConsumer.js`: Processes queued events.
  - `slaWorker.js`: Evaluates SLA breaches.
  - `alertDeliveryWorker.js`: Dispatches pending alerts.
  - `sloPolicyWorker.js`: Monitors system health and SLOs.
- **Routes**:
  - `/api/webhooks`: Event ingestion endpoints.
  - `/api/journeys`: Journey queries.
  - `/api/internal`: Admin operations.
- **Services**: Event mapping, metrics rendering, etc.

### Data Model

- **Customer**: Customer details.
- **Journey**: Customer requests with stages and status.
- **JourneyStage**: Stage progression with owners.
- **JourneyEvent**: Append-only event log.
- **SlaRule**: SLA thresholds.
- **SlaBreach**: Detected breaches.
- **Alert**: Notifications for breaches.

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 13+
- (Optional) Redis for production queuing

### Installation

1. Clone the repository and navigate to the server directory:
   ```bash
   cd /path/to/DS-hackathon/server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Update `DATABASE_URL` to your PostgreSQL connection string
   - Adjust other settings as needed

4. Initialize the database:
   ```bash
   npx prisma db push
   ```

5. (Optional) Generate Prisma client:
   ```bash
   npx prisma generate
   ```

## Running the Application

### Development

```bash
npm run dev
```

This starts the server with `--watch` for auto-restart on changes.

### Production

```bash
npm start
```

### Accessing the Dashboard

Once the server is running, open `http://localhost:4000` in your browser to access the operations dashboard.

The dashboard provides:
- Real-time system health monitoring
- Journey status overview with filtering
- SLA breach alerts
- Detailed journey timelines
- Queue management statistics

### Health Check

- Health endpoint: `GET /health`
- Metrics endpoint: `GET /metrics`

## API Documentation

### Authentication

- **Webhook Endpoints**: Require `x-dayliff-webhook-token` header with value from `WEBHOOK_SHARED_SECRET`.
- **Internal Endpoints**: Same as webhooks, protected for admin operations.

### Webhook Endpoints

Ingest events from external systems. All endpoints accept POST requests with JSON payloads and return 202 on success.

#### POST /api/webhooks/crm

Ingest CRM events.

**Request Headers:**
- `x-dayliff-webhook-token`: Shared secret
- `Content-Type`: application/json

**Request Body Schema:**
```json
{
  "sourceEventId": "string",
  "sourceSystem": "string",
  "journeyExternalRef": "string",
  "customer": {
    "fullName": "string",
    "email": "string?",
    "phone": "string?",
    "region": "string?",
    "customerCode": "string?"
  },
  "journey": {
    "title": "string",
    "description": "string?"
  },
  "event": {
    "type": "REQUEST_CREATED | STAGE_ENTERED | STAGE_COMPLETED | STATUS_UPDATED | HANDOFF | COMMENT_ADDED | DOCUMENT_UPLOADED | SLA_WARNING | SLA_BREACH | DELIVERY_CONFIRMED",
    "stage": "INQUIRY | DESIGN | QUOTATION | DELIVERY"?,
    "occurredAt": "ISO date string",
    "actorUserId": "string?",
    "actorName": "string?"
  },
  "payload": {}
}
```

**Response (202):**
```json
{
  "accepted": true,
  "source": "crm",
  "queueId": "string",
  "enqueuedAt": "ISO date string"
}
```

#### POST /api/webhooks/engineering

Same as CRM but for engineering events.

#### POST /api/webhooks/erp

Same as CRM but for ERP events.

### Journey Endpoints

Query journey data. No authentication required for read operations.

#### GET /api/journeys

List journeys with optional filters.

**Query Parameters:**
- `status`: JourneyStatus (ACTIVE, STALLED, COMPLETED, CANCELLED)
- `region`: string
- `limit`: number (default 20)

**Response (200):**
```json
{
  "data": [
    {
      "id": "string",
      "externalRef": "string?",
      "customerId": "string",
      "title": "string",
      "currentStage": "INQUIRY | DESIGN | QUOTATION | DELIVERY",
      "status": "JourneyStatus",
      "openedAt": "ISO date",
      "updatedAt": "ISO date",
      "customer": {
        "id": "string",
        "fullName": "string",
        "email": "string?",
        "phone": "string?",
        "region": "string?"
      },
      "_count": {
        "events": "number",
        "slaBreaches": "number"
      }
    }
  ]
}
```

#### GET /api/journeys/:journeyId/timeline

Get full journey timeline.

**Response (200):**
```json
{
  "data": {
    "id": "string",
    "externalRef": "string?",
    "title": "string",
    "status": "JourneyStatus",
    "derivedStatus": "ACTIVE | STALLED | COMPLETED",
    "currentStage": "StageType",
    "openedAt": "ISO date",
    "closedAt": "ISO date?",
    "customer": {
      "id": "string",
      "fullName": "string",
      "email": "string?",
      "phone": "string?",
      "region": "string?"
    },
    "stages": [
      {
        "id": "string",
        "stage": "StageType",
        "sequenceNo": "number",
        "enteredAt": "ISO date",
        "exitedAt": "ISO date?",
        "ownerTeam": "string?",
        "ownerUserId": "string?",
        "isCurrent": "boolean"
      }
    ],
    "events": [
      {
        "id": "string",
        "eventType": "EventType",
        "stage": "StageType?",
        "source": "EventSource",
        "occurredAt": "ISO date",
        "receivedAt": "ISO date",
        "actorUserId": "string?",
        "actorName": "string?",
        "payload": {}
      }
    ],
    "activeBreaches": [
      {
        "id": "string",
        "stage": "StageType",
        "breachedAt": "ISO date",
        "durationMins": "number",
        "rule": {
          "name": "string",
          "maxDurationMins": "number"
        }
      }
    ]
  }
}
```

#### GET /api/journeys/:journeyId/current-status

Get current journey status.

**Response (200):**
```json
{
  "data": {
    "journeyId": "string",
    "status": "JourneyStatus",
    "currentStage": "StageType",
    "currentOwner": "string?",
    "activeBreach": {
      "id": "string",
      "stage": "StageType",
      "breachedAt": "ISO date",
      "durationMins": "number"
    }?,
    "lastUpdatedAt": "ISO date"
  }
}
```

### Internal Endpoints

Admin operations requiring authentication.

#### GET /api/internal/queue/stats

Get queue statistics.

**Response (200):**
```json
{
  "data": {
    "provider": "file-state | redis-streams",
    "queued": "number",
    "deadLetters": "number",
    "inFlight": "boolean",
    "maxAttempts": "number",
    "maxQueueSize": "number",
    "brokerStateFile": "string"
  }
}
```

#### GET /api/internal/queue/health

Get broker health status.

**Response (200):**
```json
{
  "data": {
    "status": "healthy | degraded | down",
    "provider": "string",
    "issues": ["string"]
  }
}
```

#### GET /api/internal/queue/dead-letters

List dead letter messages.

**Query Parameters:**
- `limit`: number (default 50)

**Response (200):**
```json
{
  "data": [
    {
      "id": "string",
      "attempts": "number",
      "reason": "string",
      "normalized": { /* event data */ },
      "failedAt": "ISO date"
    }
  ]
}
```

#### POST /api/internal/queue/dead-letters/:messageId/requeue

Requeue a dead letter message.

**Response (200):**
```json
{
  "data": {
    "id": "string",
    "enqueuedAt": "ISO date",
    "attempts": 0,
    "normalized": { /* event data */ }
  }
}
```

#### POST /api/internal/alerts/dispatch

Manually dispatch pending alerts.

**Request Body:**
```json
{
  "limit": 100
}
```

**Response (200):**
```json
{
  "data": {
    "scanned": "number",
    "sent": "number",
    "failed": "number"
  }
}
```

#### POST /api/internal/slo/evaluate

Evaluate SLO policies.

**Response (200):**
```json
{
  "data": {
    "healthy": "boolean",
    "issues": ["string"],
    "stats": {
      "queued": "number",
      "deadLetters": "number",
      "failedAlertsLastHour": "number"
    }
  }
}
```

## Configuration

Environment variables (see `.env.example`):

- `DATABASE_URL`: PostgreSQL connection string
- `WEBHOOK_SHARED_SECRET`: Secret for webhook signature validation
- `BROKER_PROVIDER`: 'file-state' or 'redis-streams'
- `OTEL_*`: OpenTelemetry settings
- `SLA_INTERVAL_MS`: SLA check interval
- And more...

## Development

### Code Structure

```
server/
├── src/
│   ├── app.js
│   ├── server.js
│   ├── lib/
│   │   ├── eventBus.js
│   │   ├── prisma.js
│   │   └── telemetry.js
│   ├── middleware/
│   ├── routes/
│   ├── services/
│   └── workers/
├── prisma/
│   └── schema.prisma
├── .env.example
└── package.json

client/
├── index.html
└── README.md
```

### Testing

Run syntax checks:
```bash
npm run check
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes
4. Run tests and checks
5. Submit a pull request

## Demo Script

1. Send a CRM inquiry event via webhook.
2. Simulate engineering handoff.
3. Wait for SLA breach.
4. View alert on dashboard.
5. Complete delivery event.

## Monitoring and Alerting Configuration

### OTLP Metrics Export

The server exports metrics via OpenTelemetry Protocol (OTLP) to the configured endpoint (`OTEL_EXPORTER_OTLP_ENDPOINT`). These metrics can be collected by observability platforms like Grafana, DataDog, or New Relic.

### Key Metrics for Alerting

#### Queue Health Metrics
- `dayliff_queue_depth` - Current number of queued events
- `dayliff_dead_letters` - Number of messages in dead letter queue
- `dayliff_broker_health_status` - Broker health status (0=healthy, 1=degraded, 2=down)

#### SLA Metrics
- `dayliff_sla_breaches_total` - Total SLA breaches detected
- `dayliff_alerts_pending` - Number of pending alerts
- `dayliff_alerts_failed_total` - Total failed alert deliveries

#### System Metrics
- `dayliff_http_requests_total` - HTTP request count by method/status
- `dayliff_http_request_duration_seconds` - HTTP request duration histogram

### Example Grafana Alert Rules

#### High Queue Depth Alert
```
WHEN: dayliff_queue_depth > 500 FOR: 5m
LABELS: severity=warning, service=dayliff-1000-eyes
ANNOTATIONS: summary="High event queue depth", description="Queue depth is {{ $value }} messages"
```

#### Dead Letter Queue Alert
```
WHEN: dayliff_dead_letters > 10 FOR: 2m
LABELS: severity=error, service=dayliff-1000-eyes
ANNOTATIONS: summary="Dead letters accumulating", description="Dead letter queue has {{ $value }} messages"
```

#### Broker Health Alert
```
WHEN: dayliff_broker_health_status > 0 FOR: 1m
LABELS: severity=error, service=dayliff-1000-eyes
ANNOTATIONS: summary="Broker health degraded", description="Broker status is {{ $value }}"
```

#### SLA Breach Alert
```
WHEN: increase(dayliff_sla_breaches_total[5m]) > 0
LABELS: severity=warning, service=dayliff-1000-eyes
ANNOTATIONS: summary="New SLA breach detected", description="SLA breach occurred in the last 5 minutes"
```

#### Failed Alert Delivery Alert
```
WHEN: increase(dayliff_alerts_failed_total[10m]) > 5
LABELS: severity=error, service=dayliff-1000-eyes
ANNOTATIONS: summary="High alert delivery failure rate", description="{{ $value }} alerts failed in the last 10 minutes"
```

### Prometheus AlertManager Configuration

For Prometheus-based setups, add these rules to your `alert_rules.yml`:

```yaml
groups:
  - name: dayliff.alerts
    rules:
      - alert: DayliffHighQueueDepth
        expr: dayliff_queue_depth > 500
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High event queue depth"
          description: "Queue depth is {{ $value }} messages"

      - alert: DayliffDeadLetters
        expr: dayliff_dead_letters > 10
        for: 2m
        labels:
          severity: error
        annotations:
          summary: "Dead letters accumulating"
          description: "Dead letter queue has {{ $value }} messages"

      - alert: DayliffBrokerUnhealthy
        expr: dayliff_broker_health_status > 0
        for: 1m
        labels:
          severity: error
        annotations:
          summary: "Broker health degraded"
          description: "Broker status is {{ $value }}"

      - alert: DayliffSLABreach
        expr: increase(dayliff_sla_breaches_total[5m]) > 0
        labels:
          severity: warning
        annotations:
          summary: "New SLA breach detected"
          description: "SLA breach occurred in the last 5 minutes"

      - alert: DayliffAlertDeliveryFailures
        expr: increase(dayliff_alerts_failed_total[10m]) > 5
        labels:
          severity: error
        annotations:
          summary: "High alert delivery failure rate"
          description: "{{ $value }} alerts failed in the last 10 minutes"
```

### Notification Routing

Configure AlertManager routes to send alerts to appropriate channels:

```yaml
route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'dayliff-alerts'
  routes:
    - match:
        service: dayliff-1000-eyes
      receiver: 'dayliff-ops'

receivers:
  - name: 'dayliff-ops'
    email_configs:
      - to: 'operations@dayliff.com'
        from: 'alerts@dayliff.com'
        smarthost: 'smtp.dayliff.com:587'
        auth_username: 'alerts@dayliff.com'
        auth_password: 'password'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/.../.../...'
        channel: '#dayliff-alerts'
        title: '{{ .GroupLabels.alertname }}'
        text: '{{ .CommonAnnotations.description }}'
```