# Architecture Overview — Smart Travel Companion

## 1. High-Level Vision
The **Smart Travel Companion** is an intelligent, location-aware travel planning application designed to give travelers personalized destination recommendations, real road routing, multi-modal transport comparisons, automated itinerary optimization, and an AI-powered local travel guide grounded strictly in verified application data.

## 2. Core Architectural Principles
1. **Single Responsibility per Layer:**
   - **Frontend:** User interaction, presentation, client-side caching, and state management.
   - **Backend:** Data discovery, caching, normalization, route estimation, and AI grounding.
2. **Deterministic Grounding First:**
   - The AI Travel Guide never invents places, fake ratings, or arbitrary prices.
   - All AI insights are grounded in the structured application data passed from the frontend.
3. **Data Transparency:**
   - Live external data (`OpenStreetMap`) is labeled as `Live OpenStreetMap data`.
   - Fallback/demo datasets are explicitly labeled as `Demo data`.
4. **Resilient Offline / Low-Connectivity Fallbacks:**
   - When public services (Nominatim/OSRM) are unreachable or rate-limited, the application gracefully provides curated fallback seeds and honest empty states without crashing.

## 3. Technology Stack
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, Leaflet (React Leaflet).
- **Backend:** Node.js, Express, TypeScript (`tsx` for dev, `tsc` for production).
- **External Providers:**
  - OpenStreetMap Nominatim (Geocoding & Nearby POI search)
  - OSRM Demo Server (Real road routing geometry and travel times)
  - Google Gemini API / Grounded Fallback Engine (Conversational local travel assistant)
