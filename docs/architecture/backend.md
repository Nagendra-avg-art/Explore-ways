# Backend Architecture & Service Flow

## 1. Directory Organization
The backend follows a classic layered pattern inside `server/src/`:

```
server/src/
├── routes/             # Express HTTP route definitions
├── controllers/        # Request validation and HTTP response formatting
├── services/           # Business logic, external API integrations, caching
├── data/
│   └── demo/           # Documented fallback datasets (Hyderabad & Dining)
├── utils/              # Pure math/geocoding utilities (Haversine formula)
├── types/              # Server-side TypeScript interfaces
└── server.ts           # Express app bootstrap, CORS, and middleware
```

## 2. Request Lifecycle
Each API request follows a strict unidirectional pipeline:

```
HTTP Client Request
       ↓
Express Router (routes/)
       ↓
Controller (controllers/) — Validates params & formats responses
       ↓
Service Layer (services/) — Executes business logic & caching
       ↓
External Provider / Data Layer (OSM Nominatim / OSRM / data/demo/)
       ↓
Normalized Data
       ↓
Controller JSON Response
```

## 3. Data Source Transparency
- Services check an in-memory cache first (10–30 min TTL).
- If cache misses, the service queries the live provider (OpenStreetMap / OSRM).
- If the live query fails, times out, or returns insufficient results, the service falls back to `data/demo/` and explicitly flags the response with `source: 'demo'`, `sourceName: 'Demo data'`, and `isLive: false`.
