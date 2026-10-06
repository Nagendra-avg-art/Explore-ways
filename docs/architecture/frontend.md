# Frontend Architecture & Component Hierarchy

## 1. Directory Organization
The frontend code is structured into clear domains inside `client/src/`:

```
client/src/
├── components/
│   ├── common/         # Modals, category filters, location pickers
│   ├── explore/        # Attraction discovery, place cards, detail modals
│   ├── food/           # Food Explorer, cuisine filters, radius pills
│   ├── map/            # Interactive Leaflet map, popups, route polyline
│   ├── transport/      # Mode comparison card (walking, bus, auto, cab)
│   ├── itinerary/      # Multi-stop timeline, duration/buffer calculations
│   └── ai-guide/       # Conversational AI travel guide interface
├── context/            # React Context providers for global application state
├── layouts/            # MainLayout (header, sidebar, mobile bottom navigation)
├── services/           # Pure TypeScript logic (routing, scoring, transport, AI)
├── types/              # Central TypeScript definitions (travel.ts)
└── config/             # Map configuration and provider settings
```

## 2. Global State Management (Contexts)
- **`LocationContext`**: Single source of truth for user coordinates (`lat`, `lon`), active city, and detected area.
- **`PreferencesContext`**: User travel profile (interests, budget, pace, available time).
- **`PlacesContext`**: Discovered attractions for the active location.
- **`TripContext`**: Selected itinerary stops, feasibility buffer, and preferred transport mode.
- **`FoodContext`**: Discovered dining options, search radius (1–10 km), and category filters.

## 3. Component Communication Flow
- Views consume Context hooks (`useLocation()`, `useTrip()`, `useFood()`).
- Changes in one view (e.g. clicking "Add to Trip" on a food card or attraction card) immediately propagate across the Map, Itinerary, and AI Guide via Context state without page reloads.
