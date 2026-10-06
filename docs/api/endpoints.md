# REST API Endpoints Reference

All endpoints are hosted on the backend server (default: `http://localhost:5000`).

---

### Places & Attractions
| Method | Route | Description | Query Parameters |
|---|---|---|---|
| `GET` | `/api/places` | List attractions | `category`, `search`, `maxDistance`, `minRating`, `openNow`, `sortBy`, `lat`, `lon` |
| `GET` | `/api/places/:id` | Fetch place by unique ID | `lat`, `lon` |
| `GET` | `/api/places/nearby` | Discover nearby attractions via OSM | `lat`, `lon`, `radius` (default 6000), `category` |
| `GET` | `/api/places/food` | Discover nearby dining spots via OSM | `lat` (or `latitude`), `lon` (or `longitude`), `radius` (1000–10000), `category`, `openNow` |

---

### Recommendations & Itinerary
| Method | Route | Description | Query Parameters / Body |
|---|---|---|---|
| `GET` | `/api/recommendations` | Get personalized place recommendations | `city`, `interests`, `budget`, `hours`, `lat`, `lon` |
| `POST` | `/api/routes/directions` | Compute road route between waypoints | Body: `{ coordinates: [[lon1, lat1], [lon2, lat2], ...] }` |

---

### Location Services
| Method | Route | Description | Query Parameters |
|---|---|---|---|
| `GET` | `/api/location/search` | Search city or landmark name | `q` |
| `GET` | `/api/location/reverse` | Reverse geocode coordinates to city/area | `lat`, `lon` |

---

### AI Travel Guide
| Method | Route | Description | Body Payload |
|---|---|---|---|
| `GET` | `/api/ai/status` | Check AI model and provider connectivity | None |
| `POST` | `/api/ai/chat` | Query AI guide with structured context | `{ message, context: { location, selectedTrip, ... }, conversationHistory }` |
