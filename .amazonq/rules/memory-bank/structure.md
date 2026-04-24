# Project Structure

## Repository Layout

```
DS-hackathon/
├── client/                        # React SPA (Vite + Tailwind)
│   └── src/
│       ├── components/
│       │   ├── layout/            # App shell, nav, sidebar
│       │   ├── shared/            # Reusable UI primitives
│       │   ├── ui/                # Design system components
│       │   └── Timeline.jsx       # Journey timeline renderer
│       ├── config/config.js       # API base URL and app config
│       ├── context/RoleContext.jsx # Role-based access context
│       ├── hooks/useApi.js        # SWR-based data fetching hook
│       ├── pages/
│       │   ├── Dashboard.jsx      # Main ops dashboard
│       │   ├── SystemHealth.jsx   # Queue/broker health view
│       │   ├── Incidents.jsx      # SLA breach incident list
│       │   ├── JourneyList.jsx    # Filterable journey list
│       │   └── Admin.jsx          # Admin controls
│       ├── App.jsx                # Router and layout root
│       └── main.jsx               # React DOM entry point
│
└── server/                        # Node.js Express backend
    ├── prisma/
    │   └── schema.prisma          # PostgreSQL schema (Prisma ORM)
    └── src/
        ├── app.js                 # Express app, routes, error handler
        ├── server.js              # Entry point, telemetry init, worker start
        ├── lib/
        │   ├── eventBus.js        # Queue abstraction (file-state / Redis Streams)
        │   ├── prisma.js          # Singleton Prisma client
        │   └── telemetry.js       # OpenTelemetry SDK setup
        ├── middleware/
        │   └── verifyWebhookAuth.js  # Shared-secret header validation
        ├── routes/
        │   ├── webhooks.js        # POST /api/webhooks/{crm,engineering,erp}
        │   ├── journeys.js        # GET /api/journeys, timeline, status
        │   └── internal.js        # Admin: queue stats, dead letters, alerts
        ├── services/
        │   ├── eventMapper.js     # Normalizes raw webhook payloads → domain events
        │   ├── ingestionProcessor.js  # Upserts customers/journeys/events to DB
        │   ├── journeyTimelineService.js  # Builds timeline response objects
        │   ├── metricsService.js  # Prometheus metrics rendering
        │   └── notificationService.js  # Alert creation and delivery
        └── workers/
            ├── ingestionConsumer.js   # Polls event bus, calls ingestionProcessor
            ├── slaWorker.js           # Detects SLA breaches on active journeys
            ├── alertDeliveryWorker.js # Retries PENDING/FAILED alerts
            └── sloPolicyWorker.js     # Evaluates system SLO health
```

## Core Component Relationships

```
Webhook Request
    → verifyWebhookAuth (middleware)
    → webhooks.js (route) → eventBus.enqueue()
    → ingestionConsumer (worker) → eventMapper.js → ingestionProcessor.js
    → DB (Prisma / PostgreSQL)
    → slaWorker → notificationService → alertDeliveryWorker
    → journeys.js (route) → journeyTimelineService.js → API response
    → React client (SWR polling)
```

## Architectural Patterns

- **Event-driven pipeline**: Webhooks enqueue normalized events; workers consume asynchronously.
- **Append-only event log**: `JourneyEvent` records are never mutated; state is derived from the event stream.
- **Worker polling loop**: Each worker runs on a configurable interval (`setInterval`) started in `server.js`.
- **Service layer**: Business logic lives in `services/`; routes are thin controllers.
- **Singleton DB client**: `lib/prisma.js` exports a single `PrismaClient` instance reused across the app.
- **Role context (client)**: `RoleContext.jsx` provides the active role to all pages; pages conditionally render based on role.
- **SWR data fetching**: Client uses `swr` for stale-while-revalidate polling against the Express API.
