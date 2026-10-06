# System Data Flow

## 1. Location-Aware Discovery Pipeline
When the user opens the application or selects a new city:

```
User Selects Location
        ↓
LocationContext updates (lat, lon, city, area)
        ↓
PlacesContext & FoodContext trigger background refresh
        ↓
API Calls:
  • GET /api/places/nearby?lat=...&lon=...&radius=6000
  • GET /api/places/food?lat=...&lon=...&radius=5000
        ↓
Server Queries Nominatim with bounding viewbox
        ↓
Server normalizes raw OSM tags into Place / FoodPlace models
        ↓
Frontend receives data & executes recommendation scoring
        ↓
UI renders sorted recommendations & Leaflet map markers
```

## 2. Multi-Stop Route & Itinerary Pipeline
When the user adds stops to their itinerary:

```
User taps "Add to Trip"
        ↓
TripContext updates `tripPlaceIds` and stops array
        ↓
routingService calls GET /api/routes/directions with stop coordinates
        ↓
Server queries OSRM for real turn-by-turn road geometry
        ↓
itineraryEngineService evaluates timeline:
  • Travel times (driving/walking)
  • Visit durations per stop
  • Total duration vs. user available hours (feasibility buffer)
        ↓
transportRecommendationService scores Walking, Bus, Auto, Cab
        ↓
UI displays Itinerary Timeline & Transport Comparison
```

## 3. Grounded AI Travel Guide Pipeline
When the user asks a question in the AI Guide:

```
User types query in AIGuideView
        ↓
aiGuideService formats compact application context:
  • Active city & user coordinates
  • Selected itinerary stops & timeline
  • Recommended transport mode & estimated fare
  • Top 5 nearby attractions & top 5 nearby food places
        ↓
POST /api/ai/chat with query + context
        ↓
aiService builds grounded system prompt:
  • If GEMINI_API_KEY is present: calls Gemini with grounding constraints
  • If offline / missing key: runs deterministic grounded fallback
        ↓
Response prefixed with [APPLICATION DATA] or [ESTIMATE]
        ↓
AIGuideView renders verified, non-hallucinated response
```
