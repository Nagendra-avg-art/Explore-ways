import { Request, Response } from 'express';

export interface BackendPlace {
  id: string;
  name: string;
  category: string;
  categoryLabel: string;
  rating: number;
  reviewCount: number;
  lat: number;
  lon: number;
  visitDuration: string;
  imageUrl: string;
  shortDescription: string;
  fullDescription: string;
  whyRecommended: string;
  tags: string[];
  openingHours: string;
  openHour: number;  // 24h format (e.g., 9 for 9 AM)
  closeHour: number; // 24h format (e.g., 17.5 for 5:30 PM)
  closedDays?: number[]; // 0 = Sunday, 5 = Friday, etc.
  entryFee: string;
  nearbyFood: string[];
  transportEstimates: { mode: string; label: string; time: string; cost: string; icon: string }[];
}

// Master places database (centered in Hyderabad hub)
const PLACES_DATA: BackendPlace[] = [
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
function calculateHaversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
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
function checkIsOpenNow(place: BackendPlace): boolean {
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
      results = results.filter((p) => p.rating >= ratingThreshold);
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
    results.sort((a, b) => b.rating - a.rating);
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
