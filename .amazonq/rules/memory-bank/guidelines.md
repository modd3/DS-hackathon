# Development Guidelines

## Code Quality Standards

### Module System
- Server uses **CommonJS** exclusively: `require()` / `module.exports = { ... }`
- Client uses **ES Modules** exclusively: `import` / `export default` / named exports
- Never mix module systems within a layer

### Naming Conventions
- Files: `camelCase.js` / `PascalCase.jsx` for React components
- Functions: `camelCase` verbs — `mapIncomingEvent`, `persistNormalizedEvent`, `sendNotification`
- Constants/color maps: `UPPER_SNAKE_CASE` — `STATUS_COLORS`, `STAGE_COLORS`, `sourceToEventSource`
- React components: `PascalCase` — `HealthIndicator`, `DeadLetterRow`, `JourneyRow`
- Prisma models: `PascalCase` matching schema — `Customer`, `Journey`, `JourneyEvent`

### Function Structure
- Keep functions single-purpose and small
- Async functions always use `async/await`, never `.then()` chains in component logic
- Destructure parameters at the top of functions: `function mapIncomingEvent({ source, body })`
- Return plain objects from service functions, not class instances

---

## Server Patterns

### Zod Validation (eventMapper.js)
Always validate external input at the boundary with Zod before any processing:

```js
const { z } = require('zod');

const schema = z.object({
  field: z.string().min(1),
  optionalField: z.string().optional(),
  date: z.coerce.date(),
  enumField: z.enum(['VALUE_A', 'VALUE_B'])
});

function handler({ body }) {
  const parsed = schema.parse(body); // throws ZodError on invalid input
  // use parsed.*
}
```

### OpenTelemetry Tracing (ingestionProcessor.js, notificationService.js)
Every significant async operation gets a span. Pattern used in all services:

```js
const { trace, SpanStatusCode } = require('@opentelemetry/api');
const tracer = trace.getTracer('dayliff.<service-name>');

async function doWork(input) {
  const span = tracer.startSpan('operation.name', {
    attributes: { key: value }
  });
  try {
    // ... work ...
    span.setAttribute('result.key', resultValue);
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    throw error;
  } finally {
    span.end(); // always end the span
  }
}
```

Tracer names follow the pattern `dayliff.<domain>` (e.g. `dayliff.ingestion`, `dayliff.notifications`).

### Trace Context Propagation (notificationService.js)
When crossing service/channel boundaries, inject W3C trace context:

```js
const { context, propagation } = require('@opentelemetry/api');

const carrier = {};
propagation.inject(context.active(), carrier);
span.setAttributes({
  'notification.traceparent': carrier.traceparent || '',
  'notification.tracestate': carrier.tracestate || ''
});
```

### Prisma Transactions (ingestionProcessor.js)
Use `prisma.$transaction(async (tx) => { ... })` for multi-step writes that must be atomic.
Use `upsert` for idempotent create-or-update operations (customer, journey).
Handle duplicate key errors explicitly:

```js
try {
  event = await tx.journeyEvent.create({ data: { ... } });
} catch (error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    event = await tx.journeyEvent.findUnique({ where: eventWhere });
  } else {
    throw error;
  }
}
```

### Route / Service Separation
- Routes are thin: validate auth, enqueue/call service, return HTTP response
- All business logic lives in `services/`
- Workers call services; services call `lib/prisma` directly
- Never import route files from services or workers

### Error Responses (app.js)
Express global error handler returns `{ ok: false, error: message }`.
Successful responses return `{ ok: true, data: ... }` or `{ data: ... }`.

```js
// Success
res.json({ data: result });

// Error (caught in handler)
res.status(500).json({ ok: false, error: error.message });
```

### Lookup Tables over Switch Statements
Prefer object maps for source/channel routing:

```js
// Preferred
const sourceToEventSource = { crm: 'CRM', engineering: 'ENGINEERING', erp: 'ERP' };
const eventSource = sourceToEventSource[sourceKey];
if (!eventSource) throw new Error(`Unsupported source: ${source}`);

// Acceptable for complex branching
switch (channel) {
  case 'EMAIL': return sendEmail(...);
  case 'SMS':   return sendSMS(...);
  default:      throw new Error(`Unsupported channel: ${channel}`);
}
```

---

## Client Patterns

### Data Fetching with SWR (useApi.js)
All server data is fetched via custom hooks in `hooks/useApi.js` using `useSWR`.
Always pass `refreshInterval: POLL_INTERVAL` for live data. Use `keepPreviousData: true` on list hooks.

```js
import useSWR from 'swr'
import { apiFetch, POLL_INTERVAL } from '../config/config.js'

const fetcher = (url) => apiFetch(url).then(r => r.data)

export function useMyResource(id) {
  return useSWR(id ? `/api/resource/${id}` : null, fetcher, {
    refreshInterval: POLL_INTERVAL
  })
}
```

Conditional fetching: pass `null` as the key to disable fetching when the ID is not yet available.

### apiFetch for Mutations (SystemHealth.jsx)
Use `apiFetch` directly (not SWR) for POST/mutation calls inside event handlers:

```js
import { apiFetch } from '../config.js'

async function handleAction() {
  try {
    const r = await apiFetch('/api/internal/some/action', {
      method: 'POST',
      auth: true,
      body: JSON.stringify({ limit: 100 })
    })
    setResult(r.data)
  } catch (e) {
    alert(e.message)
  }
}
```

After a mutation, call the relevant SWR `mutate()` function to revalidate.

### Component Decomposition
- Pages export a single `default` function component
- Extract sub-components (rows, indicators, cards) as named functions in the same file when used only on that page
- Shared primitives live in `components/ui.jsx` — `MetricCard`, `StatusBadge`, `StageBadge`, `Skeleton`, `ErrorState`
- Layout wrapper always wraps page content: `<Layout><PageHeader .../> ... </Layout>`

### Tailwind + clsx (SystemHealth.jsx, Dashboard.jsx)
Use `clsx` for conditional class merging. Never string-concatenate class names:

```jsx
import { clsx } from 'clsx'

<div className={clsx('base-classes', condition && 'conditional-class', map[key])} />
```

Color/style maps are defined as plain objects at the top of the file:

```js
const STATUS_COLORS = { ACTIVE: '#10b981', STALLED: '#f59e0b', COMPLETED: '#38bdf8' }
const map = {
  healthy:  { bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
  degraded: { bg: 'bg-amber-500/15',   text: 'text-amber-400'   },
}
```

### Loading / Error States
Every data-dependent section follows this pattern:

```jsx
{isLoading && <Skeleton className="h-24 rounded-xl" />}
{error && <ErrorState message={error.message} />}
{!isLoading && !error && data && ( /* render data */ )}
```

For lists, render skeleton rows: `Array.from({length: N}).map((_, i) => <Skeleton key={i} ... />)`

### useMemo for Derived Data (Dashboard.jsx)
Compute aggregates/derived state with `useMemo` keyed on the source data:

```js
const stats = useMemo(() => {
  if (!journeys) return null
  // compute from journeys
  return { counts, stages, breached, total }
}, [journeys])
```

### Recharts Conventions (Dashboard.jsx)
- Always wrap charts in `<ResponsiveContainer width="100%" height={N}>`
- Use `contentStyle` on `<Tooltip>` for dark theme: `{ background: '#111827', border: '1px solid #1e2d45', borderRadius: 8, fontSize: 12 }`
- Derive chart data arrays from `stats` using `Object.entries(...).filter(([,v]) => v > 0).map(...)`

---

## Architectural Conventions

### Idempotency
Event ingestion is idempotent by design. The `(source, sourceEventId)` composite unique constraint on `JourneyEvent` prevents duplicate processing. Always check for existing records before inserting.

### Append-Only Events
`JourneyEvent` records are never updated or deleted. State (journey status, current stage) is derived by processing the event stream in order.

### Worker Intervals
Workers are started in `server.js` via `setInterval`. Interval durations come from environment variables with sensible defaults. Workers should be self-contained and not depend on each other.

### Prototype Stubs
Notification delivery methods (`sendEmail`, `sendSMS`, `sendInApp`) are prototype stubs with `console.log` output. Comments mark where real provider integrations (SendGrid, SES, Twilio) should be inserted. Do not remove these comments when implementing.

### CSS Class Naming
Custom utility classes are defined in `index.css` and used directly: `btn-primary`, `btn-ghost`, `card`, `select`, `table-row-hover`, `metric-num`, `dot-breach`, `animate-pulse-slow`. Prefer these over ad-hoc Tailwind combinations for repeated patterns.
