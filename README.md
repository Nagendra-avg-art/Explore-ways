# Smart Travel Companion (AI Local Guide) 🧭

> **Explore smarter. Travel better.**  
> *An intelligent, location-aware travel companion application designed to discover attractions, explore nearby dining, compare multi-modal transport, optimize multi-stop itineraries, and provide AI-grounded local guidance.*

---

## 📌 Project Overview
When exploring a new city or unfamiliar neighborhood, travelers need quick answers:
1. *Where can I find great sights and food nearby?*
2. *Which transport mode (Walking, Bus/Metro, Auto Rickshaw, Cab) is best for time vs. budget?*
3. *How do I arrange my stops so I don't run out of time?*
4. *Can an AI assistant answer my questions without hallucinating fake places?*

**Smart Travel Companion** connects GPS geolocation, OpenStreetMap place discovery, real road routing, multi-modal transport comparisons, and a grounded AI Local Guide into a clean, modern travel interface.

---

## 🏗️ Architecture & Project Organization

```
smart-travel-companion/
│
├── client/                     # Frontend Application (React 19 + TypeScript + Vite)
│   └── src/
│       ├── components/         # Domain-Driven Component Organization
│       │   ├── common/         # Modals, category filters, location pickers
│       │   ├── explore/        # Attraction discovery, place cards, detail modals
│       │   ├── food/           # Food Explorer, cuisine filters, radius pills
│       │   ├── map/            # Interactive Leaflet map, popups, route polyline
│       │   ├── transport/      # Mode comparison card (walking, bus, auto, cab)
│       │   ├── itinerary/      # Multi-stop timeline, duration/buffer calculations
│       │   └── ai-guide/       # Conversational AI travel guide interface
│       ├── context/            # React Context providers (Location, Trip, Food, etc.)
│       ├── layouts/            # MainLayout (header, sidebar, mobile navigation)
│       ├── services/           # Business logic (routing, scoring, transport, AI)
│       └── types/              # Central TypeScript definitions (travel.ts)
│
├── server/                     # Backend API Server (Node.js + Express + TypeScript)
│   └── src/
│       ├── routes/             # Express HTTP route definitions
│       ├── controllers/        # Lean request/response controllers
│       ├── services/           # Discovery, caching, and AI logic
│       ├── data/
│       │   └── demo/           # Documented fallback datasets (Hyderabad & Dining)
│       ├── utils/              # Pure geocoding & math helpers (Haversine formula)
│       └── types/              # Server-side data contracts
│
├── tests/                      # Organized Test & Verification Suites
│   ├── phase/                  # Phase verification test suites
│   │   ├── phase-08/           # Location & POI discovery tests
│   │   ├── phase-09/           # Transport & fare estimation tests
│   │   ├── phase-10/           # Smart Itinerary engine tests
│   │   ├── phase-11/           # Grounded AI Travel Guide tests
│   │   └── phase-12/           # Food Explorer verification tests
│   └── integration/            # Multi-service integration tests
│
├── docs/                       # Project Documentation
│   ├── architecture/           # Overview, frontend, backend, data-flow, external services
│   ├── api/                    # REST API endpoints reference
│   ├── phases/                 # Phase milestone summaries (Phases 7–12)
│   └── setup/                  # Developer setup instructions
│
├── .env.example
├── package.json
└── README.md
```

---

## 🛠️ Tech Stack
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, Leaflet (React Leaflet).
- **Backend:** Node.js, Express, TypeScript (`tsx` for dev, `tsc` for production).
- **External Providers:**
  - OpenStreetMap Nominatim (Geocoding & Nearby POI search)
  - OSRM Demo Server (Real road driving routes)
  - Google Gemini API / Grounded Fallback Engine (Grounded travel guidance)

---

## 🚀 Quick Start

### 1. Installation
```bash
npm run install:all
```

### 2. Run Locally
```bash
# Terminal 1: Backend API (port 5000)
npm run dev:server

# Terminal 2: Frontend Client (port 5173)
npm run dev:client
```

### 3. Run Automated Verification Tests
```bash
# Verify Phase 12 Food Explorer & Grounding
node tests/phase/phase-12/test-phase12-all.mjs

# Verify Deep Location & Filter Audit
node tests/phase/phase-12/verify-phase12-deep.mjs
```

---

## 📖 Detailed Documentation
- [Architecture Overview](docs/architecture/overview.md)
- [Frontend Architecture](docs/architecture/frontend.md)
- [Backend Architecture](docs/architecture/backend.md)
- [System Data Flow](docs/architecture/data-flow.md)
- [External Services & OSM Attribution](docs/architecture/external-services.md)
- [API Endpoints Reference](docs/api/endpoints.md)
- [Phase Milestones (Phases 7–12)](docs/phases/phase-milestones.md)
