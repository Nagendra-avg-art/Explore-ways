# Smart Travel Companion (AI Local Guide) 🧭

> **Explore smarter. Travel better.**  
> *An AI-powered local travel companion designed to help you discover places, optimize routes, compare transport options, and build personalized itineraries in minutes.*

---

## 📌 Project Overview
When arriving in a new city or unfamiliar neighborhood, travelers often struggle to prioritize what to see, understand how to get there efficiently, calculate realistic transport fares, and structure their day to fit their available time and budget.

**Smart Travel Companion** acts as a personal local guide. It combines GPS geolocation, place discovery, interactive maps, multi-modal transport comparisons, fair fare estimation, and an AI reasoning layer grounded in verified location data.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18 with Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS (Custom travel palette with dark/light themes)
- **Icons**: Lucide React
- **Maps**: Leaflet / OpenStreetMap (Interactive, zero-cost, no credit card required)

### Backend
- **Runtime**: Node.js v22 (LTS)
- **Framework**: Express
- **Language**: TypeScript (executed with `tsx`)
- **API Architecture**: REST with proxying (`/api/*`)
- **Database / ORM**: PostgreSQL with Prisma (SQLite fallback for quick local demo)

### AI & Services
- **AI Reasoning**: Google Gemini API / Pluggable AI Service adapter
- **Routing & Distances**: OSRM (Open Source Routing Machine) / Haversine road-distance heuristics
- **Weather**: Open-Meteo (zero-key free tier)

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+ recommended, v22 tested)
- npm (v9+)

### Installation
1. Clone the repository:
   ```bash
   git clone <repo-url>
   cd Web_Tec_project
   ```
2. Install all dependencies:
   ```bash
   npm run install:all
   ```

### Running the Project

Open two terminal windows:

**Terminal 1 — Backend API Server:**
```bash
npm run dev:server
# Server will run at http://localhost:5000
# Health check available at http://localhost:5000/api/health
```

**Terminal 2 — Frontend Client:**
```bash
npm run dev:client
# Client will run at http://localhost:5173
```

---

## 🔐 Environment Variables

Copy the example environment files:
- Server: `server/.env.example` -> `server/.env`

Key configurations:
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
DEMO_MODE=true
AI_PROVIDER=gemini
GEMINI_API_KEY=
```

---

## 🗺️ Roadmap & Current Phase
- [x] **Phase 1: Project Foundation** (Monorepo, Express TS, React Vite TS, Tailwind, Health check)
- [ ] **Phase 2: UI Foundation & Layout**
- [ ] **Phase 3: Geolocation & Reverse Geocoding**
- [ ] **Phase 4: Interactive Map System**
- [ ] **Phase 5: Place Discovery & Rich Cards**
- [ ] **Phase 6: User Preferences Engine**
- [ ] **Phase 7: Recommendation Engine**
- [ ] **Phase 8: Distance Matrix & Multi-stop Routing**
- [ ] **Phase 9: Transport Comparison (Walk, Auto, Cab, Bike)**
- [ ] **Phase 10: Smart Fair Fare Assistant**
- [ ] **Phase 11: Dynamic Itinerary Generator**
- [ ] **Phase 12: Context-Grounded AI Assistant**
- [ ] **Phase 13: Local Food & Cafe Explorer**
- [ ] **Phase 14: Weather-Aware Planning**
- [ ] **Phase 15: My Trip Saved Collections**
- [ ] **Phase 16: Polish & Micro-animations**
- [ ] **Phase 17: Mobile & Security Audits**
- [ ] **Phase 18: Deployment & Production Build**
