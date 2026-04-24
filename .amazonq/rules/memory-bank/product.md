# Product Overview: Dayliff 1000 Eyes

## Purpose & Value Proposition

Dayliff 1000 Eyes is an event-driven observability platform for monitoring customer journeys across Dayliff's CRM, Engineering, and ERP systems. It provides real-time visibility into customer request lifecycles — from initial inquiry through design, quotation, and delivery — enabling operations teams to detect SLA breaches, track handoffs, and dispatch alerts before issues escalate.

## Key Features

- **Multi-source Event Ingestion**: Webhook endpoints accept events from CRM, Engineering, and ERP systems with shared-secret authentication.
- **Journey Timeline Reconstruction**: Aggregates append-only event streams into unified customer journey timelines with stage progression tracking.
- **SLA Monitoring & Breach Detection**: Automated background workers evaluate SLA rules per stage and region, recording breaches and triggering alerts.
- **Alert Dispatch**: Multi-channel alert delivery (IN_APP, EMAIL, SMS) with retry logic and dead-letter handling.
- **Queue Management**: In-process event bus with file-backed persistence or Redis Streams, including dead-letter requeue capability.
- **Metrics & Observability**: Prometheus-compatible metrics endpoint and OpenTelemetry tracing/metrics export via OTLP.
- **Operations Dashboard**: React-based SPA with real-time system health, journey status overview, SLA breach alerts, and queue statistics.
- **Role-Based Access**: Four roles — SALES_ENGINEER, BACKEND_DESIGNER, REGIONAL_MANAGER, ADMIN — with permission-based access control.

## Target Users & Use Cases

| User | Use Case |
|------|----------|
| Operations / Regional Managers | Monitor active journeys, identify stalled requests, respond to SLA breach alerts |
| Sales Engineers | Track customer inquiry-to-delivery progress, view stage timelines |
| Backend Designers | Monitor engineering handoffs and design stage durations |
| Admins | Manage SLA rules, requeue dead letters, manually dispatch alerts, evaluate SLO policies |
| DevOps / SRE | Consume Prometheus metrics, configure Grafana/AlertManager alerting rules |

## Journey Lifecycle

```
INQUIRY → DESIGN → QUOTATION → DELIVERY
```

Statuses: `ACTIVE`, `STALLED`, `COMPLETED`, `CANCELLED`

Event types tracked: `REQUEST_CREATED`, `STAGE_ENTERED`, `STAGE_COMPLETED`, `STATUS_UPDATED`, `HANDOFF`, `COMMENT_ADDED`, `DOCUMENT_UPLOADED`, `SLA_WARNING`, `SLA_BREACH`, `DELIVERY_CONFIRMED`
