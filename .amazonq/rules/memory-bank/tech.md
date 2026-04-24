# Technology Stack

## Languages & Runtimes

| Layer | Language | Runtime |
|-------|----------|---------|
| Backend | JavaScript (CommonJS) | Node.js 18+ |
| Frontend | JavaScript / JSX (ES Modules) | Browser (Vite dev server) |
| Database schema | Prisma SDL | — |

## Backend (`server/`)

### Core Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| express | ^4.19.2 | HTTP server and routing |
| @prisma/client | ^6.10.0 | PostgreSQL ORM |
| zod | ^3.23.8 | Runtime schema validation |
| dotenv | ^16.4.5 | Environment variable loading |
| morgan | ^1.10.1 | HTTP request logging |
| @opentelemetry/sdk-node | ^0.54.0 | Distributed tracing |
| @opentelemetry/sdk-metrics | ^1.27.0 | Custom metrics |
| @opentelemetry/exporter-trace-otlp-http | ^0.54.0 | OTLP trace export |
| @opentelemetry/exporter-metrics-otlp-http | ^0.54.0 | OTLP metrics export |

### Dev Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| prisma | ^6.10.0 | Prisma CLI (migrations, generate) |

### Database
- PostgreSQL 13+ via Prisma ORM
- Connection string: `DATABASE_URL` env var
- Schema: `server/prisma/schema.prisma`

## Frontend (`client/`)

### Core Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| react | ^18.3.1 | UI framework |
| react-dom | ^18.3.1 | DOM renderer |
| react-router-dom | ^6.26.2 | Client-side routing |
| swr | ^2.2.5 | Data fetching with stale-while-revalidate |
| recharts | ^2.12.7 | Charts and data visualization |
| lucide-react | ^0.438.0 | Icon library |
| clsx | ^2.1.1 | Conditional className utility |
| date-fns | ^3.6.0 | Date formatting and manipulation |

### Dev Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| vite | ^5.4.8 | Build tool and dev server |
| @vitejs/plugin-react | ^4.3.1 | React Fast Refresh |
| tailwindcss | ^3.4.13 | Utility-first CSS |
| postcss | ^8.4.47 | CSS processing |
| autoprefixer | ^10.4.20 | CSS vendor prefixes |

## Development Commands

### Server
```bash
cd server
npm install
cp .env.example .env          # configure DATABASE_URL etc.
npx prisma db push            # apply schema to DB
npx prisma generate           # generate Prisma client
npm run dev                   # start with --watch (auto-restart)
npm start                     # production start
npm run check                 # syntax check all source files
```

### Client
```bash
cd client
npm install
cp .env.example .env          # set VITE_API_BASE_URL
npm run dev                   # Vite dev server on port 3000
npm run build                 # production build
npm run preview               # preview production build
```

## Ports & Endpoints

| Service | Port | Notes |
|---------|------|-------|
| Express server | 4000 | `PORT` env var |
| Vite dev server | 3000 | proxies `/api`, `/health`, `/metrics` to port 4000 |
| OTLP collector | 4318 | `OTEL_EXPORTER_OTLP_ENDPOINT` |

## Key Environment Variables

### Server
| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | postgresql://postgres:postgres@localhost:5432/dayliff_1000_eyes | PostgreSQL connection |
| `WEBHOOK_SHARED_SECRET` | change-me | Auth token for webhook/internal endpoints |
| `BROKER_PROVIDER` | file-state | `file-state` or `redis-streams` |
| `BROKER_STATE_FILE` | .broker-state.json | File-backed queue persistence |
| `SLA_INTERVAL_MS` | 300000 | SLA breach check interval |
| `ALERT_DISPATCH_INTERVAL_MS` | 60000 | Alert delivery worker interval |
| `OTEL_ENABLED` | true | Enable OpenTelemetry |

### Client
| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_BASE_URL` | http://localhost:4000 | Backend base URL |
| `VITE_POLL_INTERVAL_MS` | 15000 | SWR polling interval |

## Module System

- Server uses **CommonJS** (`require` / `module.exports`)
- Client uses **ES Modules** (`import` / `export`), enforced by `"type": "module"` in `client/package.json`
