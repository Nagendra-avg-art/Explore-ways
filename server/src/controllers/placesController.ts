import { Request, Response } from 'express';

export interface BackendPlace {
  id: string;
  name: string;
  category: string;
  categoryLabel: string;
  rating?: number;
  reviewCount?: number;
  lat: number;
  lon: number;
  distanceKm?: number;
  travelTimeMin?: number;
  isOpenNow?: boolean;
  visitDuration: string;
  imageUrl: string;
  shortDescription: string;
  fullDescription?: string;
  whyRecommended: string;
  tags: string[];
  openingHours?: string;
  openHour?: number;  // 24h format (e.g., 9 for 9 AM)
  closeHour?: number; // 24h format (e.g., 17.5 for 5:30 PM)
  closedDays?: number[]; // 0 = Sunday, 5 = Friday, etc.
  entryFee?: string;
  nearbyFood?: string[];
  transportEstimates?: { mode: string; label: string; time: string; cost: string; icon: string }[];
  source?: 'live' | 'demo';
  sourceName?: string;
  address?: string;
}

// Master places database (centered in Hyderabad hub)
export const PLACES_DATA: BackendPlace[] = [
  {
    id: 'charminar',
    name: 'Charminar',
    category: 'history',
    categoryLabel: '🏛️ Historical Landmark',
    rating: 4.6,
    reviewCount: 14200,
    lat: 17.3616,
    lon: 78.4747,
    visitDuration: '1–2 hrs',
    imageUrl: 'https://images.unsplash.com/photo-1572445271230-a78b5944a659?auto=format&fit=crop&w=800&q=80',
    shortDescription: '16th-century landmark mosque with 4 grand minarets and bustling traditional bazaars.',
    fullDescription: 'Constructed in 1591 by Muhammad Quli Qutb Shah, Charminar is the global emblem of Hyderabad. The surrounding alleys host historic perfume, pearl, and textile shops.',
    whyRecommended: 'Iconic city symbol; best visited in morning light to explore the surrounding street markets with ease.',
    tags: ['Monument', 'Heritage', 'Old City'],
    openingHours: '9:30 AM – 5:30 PM (Daily)',
    openHour: 9.5,
    closeHour: 17.5,
    entryFee: '₹25 (Indians) / ₹300 (Foreigners)',
    nearbyFood: ['Nimrah Cafe Irani Chai (50m)', 'Shadab Dum Biryani (600m)', 'Govind Dosa (300m)'],
    transportEstimates: [
      { mode: 'auto', label: 'Auto Rickshaw', time: '14 min', cost: '₹90 – ₹130', icon: '🛺' },
      { mode: 'cab', label: 'Cab / Taxi', time: '12 min', cost: '₹180 – ₹240', icon: '🚕' },
      { mode: 'bus', label: 'City Bus (#7Z)', time: '28 min', cost: '₹20', icon: '🚌' },
    ]
  },
  {
    id: 'golconda',
    name: 'Golconda Fort',
    category: 'history',
    categoryLabel: '🏰 Medieval Citadel',
    rating: 4.7,
    reviewCount: 18600,
    lat: 17.3833,
    lon: 78.4011,
    visitDuration: '2–3 hrs',
    imageUrl: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=800&q=80',
    shortDescription: 'Sprawling medieval fortress famed for acoustics, royal palaces, and panoramic sunset views.',
    fullDescription: 'Once the capital of the medieval Golconda Sultanate, this colossal fort spans over 11 kilometers of outer wall with 8 massive gates. Renowned for its world-famous acoustic engineering.',
    whyRecommended: 'Top-rated scenic landmark; best visited between 3 PM and 6 PM for gentle breezes and sunset views.',
    tags: ['Fortress', 'Acoustics', 'Sunset Views'],
    openingHours: '9:00 AM – 5:30 PM (Daily)',
    openHour: 9.0,
    closeHour: 17.5,
    entryFee: '₹25 (Entry) / ₹100 (Sound & Light Show)',
    nearbyFood: ['Fort View Cafe (200m)', 'Shah Ghouse Tolichowki (2.5 km)'],
    transportEstimates: [
      { mode: 'auto', label: 'Auto Rickshaw', time: '24 min', cost: '₹150 – ₹200', icon: '🛺' },
      { mode: 'cab', label: 'Cab / Taxi', time: '20 min', cost: '₹280 – ₹360', icon: '🚕' },
    ]
  },
  {
    id: 'birla-mandir',
    name: 'Birla Mandir',
    category: 'temples',
    categoryLabel: '🛕 Hilltop Marble Temple',
    rating: 4.8,
    reviewCount: 12500,
    lat: 17.4062,
    lon: 78.4691,
    visitDuration: '1–1.5 hrs',
    imageUrl: 'https://images.unsplash.com/photo-1620766182966-c6eb5ed2b788?auto=format&fit=crop&w=800&q=80',
    shortDescription: 'Majestic white marble temple atop Naubat Pahad overlooking the Hussain Sagar lake.',
    fullDescription: 'Built with 2,000 tonnes of pure white Rajasthani marble over 10 years, offering panoramic lake and city views.',
    whyRecommended: 'Peaceful ambiance with panoramic city views; ideal for a calm evening spiritual visit.',
    tags: ['Spiritual', 'Marble', 'Panoramic View'],
    openingHours: '7:00 AM – 12:00 PM, 3:00 PM – 9:00 PM',
    openHour: 7.0,
    closeHour: 21.0,
    entryFee: 'Free Entry',
    nearbyFood: ['Bikanervala Basheerbagh (1 km)', 'Chutneys Nagarjuna Circle (2.2 km)'],
    transportEstimates: [
      { mode: 'auto', label: 'Auto Rickshaw', time: '12 min', cost: '₹80 – ₹110', icon: '🛺' },
      { mode: 'cab', label: 'Cab / Taxi', time: '10 min', cost: '₹150 – ₹200', icon: '🚕' },
    ]
  },
  {
    id: 'chilkur-balaji',
    name: 'Chilkur Balaji Temple',
    category: 'temples',
    categoryLabel: '🛕 Ancient Shrine',
    rating: 4.7,
    reviewCount: 9400,
    lat: 17.3601,
    lon: 78.3005,
    visitDuration: '2 hrs',
    imageUrl: 'https://images.unsplash.com/photo-1590076215667-873d1db96043?auto=format&fit=crop&w=800&q=80',
    shortDescription: 'Ancient sacred temple by Osman Sagar, affectionately known as the "Visa Balaji" temple.',
    fullDescription: 'One of the oldest temples in Telangana, built over 500 years ago. Accepts zero cash donations.',
    whyRecommended: 'Unique tradition of 108 parikramas with peaceful lake breezes outside the city center.',
    tags: ['Ancient', 'Tradition', 'Lake Side'],
    openingHours: '6:00 AM – 8:00 PM (Daily)',
    openHour: 6.0,
    closeHour: 20.0,
    entryFee: 'Free Entry (No Donations Accepted)',
    nearbyFood: ['Village Dosa Hubs near Osman Sagar (300m)'],
    transportEstimates: [
      { mode: 'cab', label: 'Cab / Taxi', time: '35 min', cost: '₹450 – ₹600', icon: '🚕' },
      { mode: 'auto', label: 'Auto Rickshaw', time: '45 min', cost: '₹300 – ₹400', icon: '🛺' },
    ]
  },
  {
    id: 'paradise-biryani',
    name: 'Old City Dum Biryani Walk',
    category: 'food',
    categoryLabel: '🍴 Culinary Heritage',
    rating: 4.6,
    reviewCount: 22100,
    lat: 17.3645,
    lon: 78.4770,
    visitDuration: '1 hr',
    imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80',
    shortDescription: 'Slow-cooked fragrant Hyderabadi Dum Biryani spiced with saffron, cardamom, and caramelized onions.',
    fullDescription: 'Authentic handi dum biryani where meat and long-grain basmati rice are sealed with dough and cooked over slow charcoal coals.',
    whyRecommended: 'Must-experience culinary tradition; conveniently located 5 minutes walking distance from Charminar.',
    tags: ['Biryani', 'Local Speciality', 'Budget Friendly'],
    openingHours: '11:30 AM – 11:30 PM (Daily)',
    openHour: 11.5,
    closeHour: 23.5,
    entryFee: '₹250 – ₹400 (Meal cost)',
    nearbyFood: ['Hotel Shadab (Next door)', 'Matka Phirni vendors (50m)'],
    transportEstimates: [
      { mode: 'walk', label: 'Walking from Charminar', time: '5 min', cost: '₹0', icon: '🚶' },
      { mode: 'auto', label: 'Auto Rickshaw', time: '15 min', cost: '₹90 – ₹130', icon: '🛺' },
    ]
  },
  {
    id: 'niloufer-cafe',
    name: 'Cafe Niloufer & Irani Chai',
    category: 'cafes',
    categoryLabel: '☕ Heritage Irani Cafe',
    rating: 4.8,
    reviewCount: 15800,
    lat: 17.4015,
    lon: 78.4608,
    visitDuration: '45 min',
    imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=80',
    shortDescription: 'Legendary 1978 tea parlor serving rich, creamy Irani Chai with hot Osmania biscuits and bun maska.',
    fullDescription: 'Founded in 1978, Niloufer is an institution of Irani tea culture. Milk is reduced for hours for supreme creaminess.',
    whyRecommended: 'Beloved local morning ritual; highly affordable (under ₹100) and lively community energy.',
    tags: ['Irani Chai', 'Osmania Biscuits', 'Local Culture'],
    openingHours: '4:00 AM – 11:30 PM (Daily)',
    openHour: 4.0,
    closeHour: 23.5,
    entryFee: '₹50 – ₹150 (Tea & Snacks)',
    nearbyFood: ['Pista House Lakdikapul (500m)'],
    transportEstimates: [
      { mode: 'auto', label: 'Auto Rickshaw', time: '16 min', cost: '₹100 – ₹140', icon: '🛺' },
      { mode: 'cab', label: 'Cab / Taxi', time: '14 min', cost: '₹180 – ₹240', icon: '🚕' },
    ]
  },
  {
    id: 'durgam-cheruvu',
    name: 'Durgam Cheruvu & Cable Bridge',
    category: 'nature',
    categoryLabel: '🌊 Lake & Cable Bridge',
    rating: 4.5,
    reviewCount: 11200,
    lat: 17.4325,
    lon: 78.3868,
    visitDuration: '1.5–2 hrs',
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
    shortDescription: 'Freshwater lake with illuminated hanging cable-stayed bridge, walking promenade, and boating.',
    fullDescription: 'The "Secret Lake" features an extradosed cable-stayed bridge illuminated with colorful LEDs at night.',
    whyRecommended: 'Scenic evening breeze with waterfront cafes and skyline photography opportunities.',
    tags: ['Waterfront', 'Boating', 'Skyline View'],
    openingHours: '6:00 AM – 8:30 PM (Boating opens at 10 AM)',
    openHour: 6.0,
    closeHour: 20.5,
    entryFee: 'Free (Boating ₹100 – ₹300)',
    nearbyFood: ['Olive Bistro (Overlooking lake)', 'Concu Jubilee Hills (2 km)'],
    transportEstimates: [
      { mode: 'auto', label: 'Auto Rickshaw', time: '28 min', cost: '₹180 – ₹240', icon: '🛺' },
      { mode: 'cab', label: 'Cab / Taxi', time: '22 min', cost: '₹300 – ₹420', icon: '🚕' },
    ]
  },
  {
    id: 'laad-bazaar',
    name: 'Laad Bazaar (Choodi Bazaar)',
    category: 'shopping',
    categoryLabel: '🛍️ Traditional Market',
    rating: 4.4,
    reviewCount: 8900,
    lat: 17.3612,
    lon: 78.4735,
    visitDuration: '1–2 hrs',
    imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
    shortDescription: 'Historic pedestrian shopping street famous for handcrafted lacquer bangles, pearls, and perfumes (ittar).',
    fullDescription: 'Operational since Qutb Shahi times, artisans set glistening stones into resin bangles on open storefronts.',
    whyRecommended: 'Vibrant colors and authentic street bargain shopping right in the heart of old town.',
    tags: ['Bangles', 'Pearls', 'Handmade'],
    openingHours: '11:00 AM – 10:30 PM (Daily)',
    openHour: 11.0,
    closeHour: 22.5,
    entryFee: 'Free Access',
    nearbyFood: ['Pista House Charminar (200m)', 'Subhan Bakery (1.5 km)'],
    transportEstimates: [
      { mode: 'walk', label: 'Walking from Charminar', time: '2 min', cost: '₹0', icon: '🚶' },
      { mode: 'auto', label: 'Auto Rickshaw', time: '15 min', cost: '₹90 – ₹130', icon: '🛺' },
    ]
  },
  {
    id: 'chowmahalla',
    name: 'Chowmahalla Palace',
    category: 'architecture',
    categoryLabel: '🏗️ Royal Nizami Palace',
    rating: 4.7,
    reviewCount: 13400,
    lat: 17.3578,
    lon: 78.4717,
    visitDuration: '2 hrs',
    imageUrl: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=800&q=80',
    shortDescription: 'Grand palace of the Nizams with European neo-classical facades, Belgian crystal chandeliers, and vintage car collection.',
    fullDescription: 'Official seat of the Nizams with Khilwat Mubarak hall featuring 19 Belgian chandeliers and marble throne.',
    whyRecommended: 'Exquisite royal architecture and peaceful courtyards just 10 mins from Charminar.',
    tags: ['Palace', 'Chandeliers', 'Vintage Cars'],
    openingHours: '10:00 AM – 5:00 PM (Closed Fridays)',
    openHour: 10.0,
    closeHour: 17.0,
    closedDays: [5], // Friday
    entryFee: '₹100 (Indians) / ₹400 (Foreigners)',
    nearbyFood: ['Rumaan Restaurant (700m)', 'Nayab Hotel Paya & Naan (1.2 km)'],
    transportEstimates: [
      { mode: 'auto', label: 'Auto Rickshaw', time: '16 min', cost: '₹100 – ₹140', icon: '🛺' },
      { mode: 'cab', label: 'Cab / Taxi', time: '14 min', cost: '₹190 – ₹250', icon: '🚕' },
    ]
  },
  {
    id: 'shilparamam',
    name: 'Shilparamam Arts Village',
    category: 'culture',
    categoryLabel: '🎭 Cultural Crafts Village',
    rating: 4.4,
    reviewCount: 16700,
    lat: 17.4526,
    lon: 78.3776,
    visitDuration: '2–3 hrs',
    imageUrl: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=800&q=80',
    shortDescription: 'Rural folk village celebrating traditional arts, crafts exhibitions, live puppetry, and ethnic performances.',
    fullDescription: '65-acre crafts village in HITEC City with rural thatched huts, live weaving looms, and folk theaters.',
    whyRecommended: 'Great family outing for artisan shopping, street food, and folk dances.',
    tags: ['Crafts', 'Folk Dance', 'Family Friendly'],
    openingHours: '10:30 AM – 8:30 PM (Daily)',
    openHour: 10.5,
    closeHour: 20.5,
    entryFee: '₹60 (Adults) / ₹20 (Children)',
    nearbyFood: ['Village Chaat Court (Inside)', 'Rayalaseema Ruchulu (1 km)'],
    transportEstimates: [
      { mode: 'auto', label: 'Auto Rickshaw', time: '32 min', cost: '₹220 – ₹290', icon: '🛺' },
      { mode: 'cab', label: 'Cab / Taxi', time: '26 min', cost: '₹340 – ₹480', icon: '🚕' },
    ]
  }
];

// Haversine formula to compute great-circle distance in kilometers
export function calculateHaversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Determine if a place is open based on current local hour and day
 */
export function checkIsOpenNow(place: BackendPlace): boolean | undefined {
  if (place.openHour === undefined || place.closeHour === undefined) {
    return undefined; // Operating hours not listed
  }

  const now = new Date();
  const currentDay = now.getDay(); // 0 is Sunday, 5 is Friday
  const currentHour = now.getHours() + now.getMinutes() / 60;

  if (place.closedDays && place.closedDays.includes(currentDay)) {
    return false;
  }

  return currentHour >= place.openHour && currentHour <= place.closeHour;
}

/**
 * GET /api/places
 * Query options: category, search, maxDistance, minRating, openNow, sortBy, lat, lon
 */
export const getPlaces = async (req: Request, res: Response) => {
  const { 
    category, 
    search, 
    maxDistance, 
    minRating, 
    openNow, 
    sortBy, 
    lat, 
    lon 
  } = req.query;

  const userLat = lat ? parseFloat(lat as string) : 17.3616;
  const userLon = lon ? parseFloat(lon as string) : 78.4747;

  let results = PLACES_DATA.map((p) => {
    const distanceKm = calculateHaversineDistanceKm(userLat, userLon, p.lat, p.lon);
    const isOpen = checkIsOpenNow(p);

    // Approximate travel time based on distance: ~2.5 min per km + 4 min base traffic
    const travelTimeMin = Math.max(5, Math.round(distanceKm * 2.5 + 4));

    return {
      ...p,
      distanceKm,
      travelTimeMin,
      isOpenNow: isOpen
    };
  });

  // Filter: Category
  if (category && category !== 'all') {
    results = results.filter((p) => p.category === category);
  }

  // Filter: Search Keyword
  if (search) {
    const q = (search as string).trim().toLowerCase();
    results = results.filter((p) => 
      p.name.toLowerCase().includes(q) ||
      p.shortDescription.toLowerCase().includes(q) ||
      p.tags.some(t => t.toLowerCase().includes(q))
    );
  }

  // Filter: Minimum Rating
  if (minRating) {
    const ratingThreshold = parseFloat(minRating as string);
    if (!isNaN(ratingThreshold)) {
      results = results.filter((p) => p.rating !== undefined && p.rating >= ratingThreshold);
    }
  }

  // Filter: Maximum Distance Radius
  if (maxDistance) {
    const maxDist = parseFloat(maxDistance as string);
    if (!isNaN(maxDist) && maxDist > 0) {
      results = results.filter((p) => p.distanceKm <= maxDist);
    }
  }

  // Filter: Open Now
  if (openNow === 'true') {
    results = results.filter((p) => p.isOpenNow === true);
  }

  // Sorting
  if (sortBy === 'distance') {
    results.sort((a, b) => a.distanceKm - b.distanceKm);
  } else if (sortBy === 'rating') {
    results.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  }

  return res.status(200).json({
    success: true,
    total: results.length,
    origin: { lat: userLat, lon: userLon },
    places: results
  });
};

/**
 * GET /api/places/:id
 */
export const getPlaceById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const place = PLACES_DATA.find((p) => p.id === id);

  if (!place) {
    return res.status(404).json({ error: 'Place not found' });
  }

  const { lat, lon } = req.query;
  const userLat = lat ? parseFloat(lat as string) : 17.3616;
  const userLon = lon ? parseFloat(lon as string) : 78.4747;

  const distanceKm = calculateHaversineDistanceKm(userLat, userLon, place.lat, place.lon);
  const isOpen = checkIsOpenNow(place);

  return res.status(200).json({
    success: true,
    place: {
      ...place,
      distanceKm,
      travelTimeMin: Math.max(5, Math.round(distanceKm * 2.5 + 4)),
      isOpenNow: isOpen
    }
  });
};

/**
 * Category High-Resolution Curated Photography
 * Used when OpenStreetMap POIs do not include direct Wikimedia/image tags.
 */
const CATEGORY_IMAGE_MAP: Record<string, string> = {
  temples: 'https://images.unsplash.com/photo-1620766182966-c6eb5ed2b788?auto=format&fit=crop&w=800&q=80',
  history: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=800&q=80',
  nature: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80',
  food: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80',
  architecture: 'https://images.unsplash.com/photo-1567157577867-05ccb1388e66?auto=format&fit=crop&w=800&q=80',
  cafes: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80',
  shopping: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
  photography: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
  culture: 'https://images.unsplash.com/photo-1608889175123-8ee362201f81?auto=format&fit=crop&w=800&q=80',
};

/**
 * Classifies an OpenStreetMap element by its tags into one of our 9 standard categories.
 */
function classifyOsmPoi(tags: Record<string, string>): { category: string; categoryLabel: string } {
  const name = (tags.name || tags['name:en'] || '').toLowerCase();
  const amenity = (tags.amenity || '').toLowerCase();
  const tourism = (tags.tourism || '').toLowerCase();
  const historic = (tags.historic || '').toLowerCase();
  const leisure = (tags.leisure || '').toLowerCase();
  const shop = (tags.shop || '').toLowerCase();
  const religion = (tags.religion || '').toLowerCase();
  const building = (tags.building || '').toLowerCase();
  const natural = (tags.natural || '').toLowerCase();

  // 1. Temples & Shrines
  if (
    religion === 'hindu' ||
    religion === 'buddhist' ||
    religion === 'jain' ||
    religion === 'sikh' ||
    religion === 'muslim' ||
    religion === 'christian' ||
    amenity === 'place_of_worship' ||
    building === 'temple' ||
    building === 'mosque' ||
    building === 'church' ||
    name.includes('temple') ||
    name.includes('mandir') ||
    name.includes('shrine') ||
    name.includes('ashram') ||
    name.includes('dargah') ||
    name.includes('masjid') ||
    name.includes('church') ||
    name.includes('gurudwara')
  ) {
    return { category: 'temples', categoryLabel: '🛕 Temple / Shrine' };
  }

  // 2. Cafes & Tea
  if (
    amenity === 'cafe' ||
    shop === 'tea' ||
    shop === 'coffee' ||
    name.includes('cafe') ||
    name.includes('coffee') ||
    name.includes('chai') ||
    name.includes('tea')
  ) {
    return { category: 'cafes', categoryLabel: '☕ Cafe & Tea Spot' };
  }

  // 3. Local Food
  if (
    amenity === 'restaurant' ||
    amenity === 'fast_food' ||
    amenity === 'food_court' ||
    tags.cuisine ||
    name.includes('hotel') ||
    name.includes('biryani') ||
    name.includes('bhojanalay') ||
    name.includes('tiffin') ||
    name.includes('restaurant') ||
    name.includes('dhaba') ||
    name.includes('kitchen')
  ) {
    return { category: 'food', categoryLabel: '🍴 Local Food' };
  }

  // 4. Photography & Viewpoints
  if (
    tourism === 'viewpoint' ||
    name.includes('viewpoint') ||
    name.includes('view point') ||
    name.includes('sunset point') ||
    name.includes('sunrise point')
  ) {
    return { category: 'photography', categoryLabel: '📸 Scenic Viewpoint' };
  }

  // 5. Nature & Parks
  if (
    leisure === 'park' ||
    leisure === 'garden' ||
    leisure === 'nature_reserve' ||
    natural === 'water' ||
    natural === 'peak' ||
    natural === 'beach' ||
    natural === 'wood' ||
    tourism === 'zoo' ||
    name.includes('park') ||
    name.includes('garden') ||
    name.includes('lake') ||
    name.includes('cheruvu') ||
    name.includes('falls') ||
    name.includes('waterfall')
  ) {
    return { category: 'nature', categoryLabel: '🌿 Nature & Waterfront' };
  }

  // 6. Architecture & Palaces
  if (
    historic === 'palace' ||
    historic === 'castle' ||
    historic === 'manor' ||
    building === 'palace' ||
    name.includes('palace') ||
    name.includes('mahal') ||
    name.includes('haveli')
  ) {
    return { category: 'architecture', categoryLabel: '🏰 Architecture & Palace' };
  }

  // 7. Culture & Arts
  if (
    tourism === 'museum' ||
    tourism === 'gallery' ||
    tourism === 'theme_park' ||
    amenity === 'theatre' ||
    amenity === 'arts_centre' ||
    name.includes('museum') ||
    name.includes('gallery') ||
    name.includes('theatre') ||
    name.includes('bhavan') ||
    name.includes('auditorium')
  ) {
    return { category: 'culture', categoryLabel: '🎭 Culture & Arts' };
  }

  // 8. Shopping & Bazaars
  if (
    shop === 'mall' ||
    shop === 'bazaar' ||
    shop === 'marketplace' ||
    amenity === 'marketplace' ||
    shop === 'department_store' ||
    shop === 'clothes' ||
    name.includes('bazaar') ||
    name.includes('market') ||
    name.includes('mall')
  ) {
    return { category: 'shopping', categoryLabel: '🛍️ Local Bazaar & Shopping' };
  }

  // 9. History / Heritage / Monuments
  if (
    historic !== '' ||
    tourism === 'attraction' ||
    name.includes('fort') ||
    name.includes('tomb') ||
    name.includes('gate') ||
    name.includes('kaman') ||
    name.includes('monument')
  ) {
    return { category: 'history', categoryLabel: '🏛️ Historical Landmark' };
  }

  return { category: 'culture', categoryLabel: '🎭 Local Attraction' };
}

interface CachedPoiResult {
  timestamp: number;
  data: {
    success: boolean;
    isLive: boolean;
    source: string;
    sourceName: string;
    origin: { lat: number; lon: number };
    total: number;
    places: BackendPlace[];
  };
}

const nearbyPoiCache = new Map<string, CachedPoiResult>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * GET /api/places/nearby
 * Real OpenStreetMap Overpass POI Discovery
 */
function classifyNominatimPoi(type: string, category: string, name: string): { category: string; categoryLabel: string } {
  const t = (type || '').toLowerCase();
  const c = (category || '').toLowerCase();
  const n = (name || '').toLowerCase();

  // 1. Temples & Sacred Shrines
  if (
    t === 'place_of_worship' ||
    c === 'place_of_worship' ||
    n.includes('temple') ||
    n.includes('mandir') ||
    n.includes('masjid') ||
    n.includes('mosque') ||
    n.includes('dargah') ||
    n.includes('gurdwara') ||
    n.includes('church') ||
    n.includes('shrine')
  ) {
    return { category: 'temples', categoryLabel: '🛕 Sacred Temple & Shrine' };
  }

  // 2. Cafes & Tea
  if (t === 'cafe' || n.includes('cafe') || n.includes('coffee') || n.includes('tea') || n.includes('chai')) {
    return { category: 'cafes', categoryLabel: '☕ Heritage Cafe & Chai' };
  }

  // 3. Local Food
  if (t === 'restaurant' || t === 'fast_food' || n.includes('restaurant') || n.includes('bhojanalaya') || n.includes('biryani') || n.includes('hotel') || n.includes('dhaba') || n.includes('food')) {
    return { category: 'food', categoryLabel: '🍲 Local Food & Dining' };
  }

  // 4. Photography & Viewpoints
  if (t === 'viewpoint' || n.includes('viewpoint') || n.includes('view point') || n.includes('sunset') || n.includes('sunrise')) {
    return { category: 'photography', categoryLabel: '📸 Scenic Viewpoint' };
  }

  // 5. Nature & Parks
  if (t === 'park' || t === 'garden' || c === 'leisure' || n.includes('park') || n.includes('garden') || n.includes('lake') || n.includes('cheruvu') || n.includes('falls') || n.includes('waterfall') || n.includes('zoo')) {
    return { category: 'nature', categoryLabel: '🌿 Nature & Waterfront' };
  }

  // 6. Architecture & Palaces
  if (t === 'palace' || t === 'castle' || n.includes('palace') || n.includes('mahal') || n.includes('haveli')) {
    return { category: 'architecture', categoryLabel: '🏰 Architecture & Palace' };
  }

  // 7. Culture & Arts
  if (t === 'museum' || t === 'gallery' || t === 'theatre' || t === 'arts_centre' || n.includes('museum') || n.includes('gallery') || n.includes('theatre') || n.includes('bhavan') || n.includes('memorial')) {
    return { category: 'culture', categoryLabel: '🎭 Culture & Heritage' };
  }

  // 8. Shopping & Bazaars
  if (t === 'marketplace' || t === 'bazaar' || t === 'mall' || n.includes('bazaar') || n.includes('market') || n.includes('mall') || n.includes('shopping')) {
    return { category: 'shopping', categoryLabel: '🛍️ Local Bazaar & Shopping' };
  }

  // 9. History
  return { category: 'history', categoryLabel: '🏛️ Historical Landmark' };
}

/**
 * GET /api/places/nearby
 * Real OpenStreetMap POI Discovery (Nominatim + Overpass)
 */
export const getNearbyPlaces = async (req: Request, res: Response) => {
  const { lat, lon, radius, category } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: 'Latitude and longitude are required' });
  }

  const userLat = parseFloat(lat as string);
  const userLon = parseFloat(lon as string);

  if (isNaN(userLat) || isNaN(userLon)) {
    return res.status(400).json({ error: 'Invalid numeric coordinates' });
  }

  const searchRadius = Math.min(25000, Math.max(1000, radius ? parseInt(radius as string, 10) : 6000));
  const cacheKey = `${userLat.toFixed(3)}_${userLon.toFixed(3)}_${searchRadius}_${category || 'all'}`;

  // Check cache
  const cached = nearbyPoiCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return res.status(200).json(cached.data);
  }

  const livePlaces: BackendPlace[] = [];
  const seenNames = new Set<string>();

  // TIER 1: OpenStreetMap Nominatim POI Discovery (sub-second latency, bounded by user radius)
  try {
    const delta = Math.min(0.18, (searchRadius / 1000) * 0.012);
    const viewbox = `${userLon - delta},${userLat + delta},${userLon + delta},${userLat - delta}`;

    let searchTerm = 'attraction';
    if (category === 'temples') searchTerm = 'temple';
    else if (category === 'history') searchTerm = 'monument';
    else if (category === 'nature') searchTerm = 'park';
    else if (category === 'food') searchTerm = 'restaurant';
    else if (category === 'cafes') searchTerm = 'cafe';
    else if (category === 'shopping') searchTerm = 'market';
    else if (category === 'culture') searchTerm = 'museum';
    else if (category === 'architecture') searchTerm = 'palace';
    else if (category === 'photography') searchTerm = 'viewpoint';

    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(searchTerm)}&bounded=1&viewbox=${viewbox}&limit=25`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const nomRes = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'SmartTravelCompanion/1.0 (academic-project)',
        'Accept-Language': 'en'
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (nomRes.ok) {
      const nomItems = (await nomRes.json()) as any[];
      if (Array.isArray(nomItems) && nomItems.length > 0) {
        for (const p of nomItems) {
          const rawName = p.name || p.display_name.split(',')[0];
          if (!rawName || rawName.trim().length < 2) continue;
          let name = rawName.trim();
          const pLat = parseFloat(p.lat);
          const pLon = parseFloat(p.lon);
          if (isNaN(pLat) || isNaN(pLon)) continue;

          const addressParts = p.display_name.split(',');
          const address = addressParts.slice(1, 3).map((s: string) => s.trim()).filter(Boolean).join(', ') || undefined;

          // If the name is generic like "Temple" or "Park", qualify it with neighborhood
          if (name.length <= 8 && addressParts[1]) {
            name = `${name} (${addressParts[1].trim()})`;
          }

          const normKey = `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}_${pLat.toFixed(3)}_${pLon.toFixed(3)}`;
          if (seenNames.has(normKey)) continue;
          seenNames.add(normKey);

          const classification = classifyNominatimPoi(p.type, p.category, name);
          if (category && category !== 'all' && classification.category !== category) {
            continue;
          }

          const distanceKm = calculateHaversineDistanceKm(userLat, userLon, pLat, pLon);
          const travelTimeMin = Math.max(3, Math.round(distanceKm * 2.5 + 3));

          const imageUrl = CATEGORY_IMAGE_MAP[classification.category] || CATEGORY_IMAGE_MAP.culture;

          livePlaces.push({
            id: `osm-${p.place_id || p.osm_id}`,
            name,
            category: classification.category,
            categoryLabel: classification.categoryLabel,
            lat: pLat,
            lon: pLon,
            distanceKm: distanceKm as any,
            travelTimeMin: travelTimeMin as any,
            visitDuration: classification.category === 'history' || classification.category === 'architecture' ? '1–2 hrs' : '45–60 min',
            imageUrl,
            shortDescription: `Authentic ${classification.categoryLabel.replace(/^[^\w\s]+/, '').trim()}${address ? ` in ${address}` : ''}, discovered via OpenStreetMap live coordinates.`,
            fullDescription: p.display_name,
            whyRecommended: `Real-time discovery: ${distanceKm} km from your current GPS position.`,
            tags: [classification.categoryLabel.replace(/^[^\w\s]+/, '').trim(), 'Live POI', ...(address ? [address] : [])],
            source: 'live',
            sourceName: 'OpenStreetMap Live POI',
            address,
            // Strictly real values: undefined for unknown (never invent fake ratings or hours)
            rating: undefined,
            reviewCount: undefined,
            openingHours: undefined,
            isOpenNow: undefined,
            entryFee: undefined
          });
        }
      }
    }
  } catch (nomErr: any) {
    console.warn('[Nearby API] Nominatim POI search skipped or timed out:', nomErr?.message);
  }

  // TIER 2: If Nominatim found >= 3 places, return them sorted by proximity!
  if (livePlaces.length >= 3) {
    livePlaces.sort((a, b) => ((a as any).distanceKm || 0) - ((b as any).distanceKm || 0));
    const resultData = {
      success: true,
      isLive: true,
      source: 'osm-live',
      sourceName: 'OpenStreetMap Live POI',
      origin: { lat: userLat, lon: userLon },
      total: livePlaces.length,
      places: livePlaces
    };
    nearbyPoiCache.set(cacheKey, { timestamp: Date.now(), data: resultData });
    return res.status(200).json(resultData);
  }

  // TIER 3: Overpass API fallback
  try {
    const query = `[out:json][timeout:6];
(
  node["tourism"~"attraction|museum|viewpoint"](around:${searchRadius},${userLat},${userLon});
  node["historic"](around:${searchRadius},${userLat},${userLon});
);
out center body 25;`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch('https://lz4.overpass-api.de/api/interpreter', {
      method: 'POST',
      body: 'data=' + encodeURIComponent(query),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'SmartTravelCompanion/1.0 (academic-project)'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json() as any;
      const elements: any[] = data.elements || [];

      for (const el of elements) {
        const tags = el.tags || {};
        const rawName = tags.name || tags['name:en'] || tags['int_name'];
        if (!rawName || rawName.trim().length < 2) continue;

        const name = rawName.trim();
        const normKey = name.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (seenNames.has(normKey)) continue;

        const pLat = el.lat ?? el.center?.lat;
        const pLon = el.lon ?? el.center?.lon;
        if (!pLat || !pLon) continue;

        seenNames.add(normKey);

        const classification = classifyOsmPoi(tags);
        if (category && category !== 'all' && classification.category !== category) {
          continue;
        }

        const distanceKm = calculateHaversineDistanceKm(userLat, userLon, pLat, pLon);
        const travelTimeMin = Math.max(3, Math.round(distanceKm * 2.5 + 3));
        const rating = tags.stars ? parseFloat(tags.stars) : tags.rating ? parseFloat(tags.rating) : undefined;
        const reviewCount = tags.review_count ? parseInt(tags.review_count, 10) : undefined;
        const area = tags['addr:suburb'] || tags['addr:district'] || tags['addr:street'] || tags['addr:city'] || undefined;
        const imageUrl = tags.image || tags.wikimedia_commons || CATEGORY_IMAGE_MAP[classification.category] || CATEGORY_IMAGE_MAP.culture;
        const openingHours = tags.opening_hours || undefined;

        livePlaces.push({
          id: `osm-${el.id}`,
          name,
          category: classification.category,
          categoryLabel: classification.categoryLabel,
          lat: pLat,
          lon: pLon,
          distanceKm: distanceKm as any,
          travelTimeMin: travelTimeMin as any,
          visitDuration: '1–2 hrs',
          imageUrl,
          shortDescription: tags.description || `Authentic ${classification.categoryLabel.replace(/^[^\w\s]+/, '').trim()}${area ? ` in ${area}` : ''}, discovered via OpenStreetMap real-time geographic data.`,
          fullDescription: tags.description ? `${tags.description} Discovered via live OpenStreetMap geographical data.` : undefined,
          whyRecommended: `Real-time discovery: ${distanceKm} km from your current GPS position.`,
          tags: [classification.categoryLabel.replace(/^[^\w\s]+/, '').trim(), 'Live POI', ...(area ? [area] : [])],
          openingHours,
          rating,
          reviewCount,
          entryFee: tags.fee === 'no' ? 'Free Entry' : tags.fee || undefined,
          source: 'live',
          sourceName: 'OpenStreetMap Live POI',
          address: area,
        });
      }

      livePlaces.sort((a, b) => ((a as any).distanceKm || 0) - ((b as any).distanceKm || 0));

      if (livePlaces.length >= 3) {
        const resultData = {
          success: true,
          isLive: true,
          source: 'osm-live',
          sourceName: 'OpenStreetMap Live POI',
          origin: { lat: userLat, lon: userLon },
          total: livePlaces.length,
          places: livePlaces
        };

        nearbyPoiCache.set(cacheKey, { timestamp: Date.now(), data: resultData });
        return res.status(200).json(resultData);
      }
    }
  } catch (err: unknown) {
    console.warn('Overpass API query failed or timed out. Falling back to curated seed places:', (err as Error)?.message);
  }

  // Graceful fallback: Curated Seed Dataset with re-calculated distances
  let fallbackPlaces = PLACES_DATA.map((p) => {
    const distanceKm = calculateHaversineDistanceKm(userLat, userLon, p.lat, p.lon);
    const isOpen = checkIsOpenNow(p);
    return {
      ...p,
      distanceKm,
      travelTimeMin: Math.max(5, Math.round(distanceKm * 2.5 + 4)),
      isOpenNow: isOpen,
      source: 'demo' as const,
      sourceName: 'Curated Seed Data (Demo Fallback)',
    };
  });

  if (category && category !== 'all') {
    fallbackPlaces = fallbackPlaces.filter((p) => p.category === category);
  }

  fallbackPlaces.sort((a, b) => a.distanceKm - b.distanceKm);

  const fallbackData = {
    success: true,
    isLive: false,
    source: 'demo-fallback',
    sourceName: 'Curated Seed Data (Demo Fallback)',
    origin: { lat: userLat, lon: userLon },
    total: fallbackPlaces.length,
    places: fallbackPlaces
  };

  return res.status(200).json(fallbackData);
};
