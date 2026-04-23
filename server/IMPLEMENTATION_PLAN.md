# Dayliff 1000 Eyes - Immediate Next Steps

This document translates the hackathon brief into executable milestones for a PERN implementation.

## 1) Scope for Prototype (v1)

- Build an observability layer that ingests events from CRM, engineering, and ERP tools.
- Reconstruct a unified journey timeline per customer request.
- Detect and alert SLA stalls.
- Provide role-specific visibility for sales engineers, backend designers, and regional managers.

## 2) Backend Foundation

### Data Layer

- Use PostgreSQL with Prisma models defined in `prisma/schema.prisma`.
- Keep `JourneyEvent` append-only to preserve auditable history.
- Derive current status from event stream + latest `JourneyStage`.

### Integration Layer

Implement webhook endpoints:

- `POST /api/webhooks/crm`
- `POST /api/webhooks/engineering`
- `POST /api/webhooks/erp`

Each endpoint should:

1. Validate source signature/token.
2. Map source payload to canonical schema.
3. Publish to event queue (RabbitMQ or Redis Streams).
4. Persist to `JourneyEvent` with idempotency (`source + sourceEventId`).

### Timeline Query API

- `GET /api/journeys/:journeyId/timeline`
- `GET /api/journeys/:journeyId/current-status`
- `GET /api/journeys?status=ACTIVE&region=...`

## 3) SLA & Alerting Service

- Scheduler/worker checks active journeys against `SlaRule` thresholds.
- On breach, create `SlaBreach` and `Alert` rows.
- Notification channels for prototype:
  - In-app (required)
  - Email (optional)
  - SMS (mock/stub acceptable)

## 4) Frontend Pages

- Dashboard (global and region filters)
- Journey detail timeline
- SLA incidents page
- Admin RBAC + SLA rules page

### Suggested RBAC permissions

- `journey.read`
- `journey.update`
- `sla.read`
- `sla.manage`
- `alerts.read`
- `admin.users.manage`

## 5) Definition of Done (Hackathon)

- Simulated events can flow end-to-end and appear in timeline in near real-time.
- SLA breach simulation produces visible alert.
- Managers can identify stalled stage and responsible owner/team.
- Technical docs include architecture, API examples, and schema.

## 6) Suggested Demo Script

1. Create inquiry event from CRM webhook.
2. Push design handoff from engineering.
3. Pause long enough to trigger SLA breach.
4. Show alert on dashboard and breach in journey detail.
5. Complete delivery event and show closed lifecycle.

## 7) Implementation Progress (Current)

- ✅ Webhook ingestion routes scaffolded for CRM/Engineering/ERP.
- ✅ Canonical event mapping + schema validation implemented.
- ✅ Journey timeline and current-status APIs implemented.
- ✅ SLA evaluation worker implemented with breach + alert record creation.
- ✅ Queue decoupling implemented with an in-process event bus abstraction (ready to swap with RabbitMQ/Redis Streams).
- ✅ Dead-letter queue handling added to in-process bus with retries and requeue support.
- ✅ SLA scheduler enabled from server bootstrap for periodic breach checks.
- ✅ Internal queue routes protected with auth token middleware.
- 📝 Note: `journey.currentStage` is only advanced on stage-bearing events; non-stage updates intentionally do not clear it.
- ✅ Alert delivery worker added with scheduled dispatch loop and manual internal trigger endpoint.
- ✅ Queue + DLQ state are now persisted in a file-backed broker state store for restart recovery.
- ⏭️ Next: replace file-state broker with external broker adapter (RabbitMQ/Redis Streams) and implement producer/consumer adapters.
