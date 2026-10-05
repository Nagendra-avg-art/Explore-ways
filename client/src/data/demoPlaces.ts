import { Category, Place } from '../types/travel';

export const TRAVEL_CATEGORIES: Category[] = [
  {
    id: 'all',
    label: 'All Highlights',
    icon: '✨',
    accentColor: 'border-slate-200 text-slate-700 bg-white',
    bgActive: 'bg-sky-600 text-white border-sky-600',
    textActive: 'text-white'
  },
  {
    id: 'temples',
    label: 'Temples',
    icon: '🛕',
    accentColor: 'border-amber-200 text-amber-800 bg-amber-50/60',
    bgActive: 'bg-amber-500 text-white border-amber-500',
    textActive: 'text-white'
  },
  {
    id: 'history',
    label: 'History',
    icon: '🏛️',
    accentColor: 'border-sky-200 text-sky-800 bg-sky-50/60',
    bgActive: 'bg-sky-600 text-white border-sky-600',
    textActive: 'text-white'
  },
  {
    id: 'food',
    label: 'Local Food',
    icon: '🍴',
    accentColor: 'border-orange-200 text-orange-800 bg-orange-50/60',
    bgActive: 'bg-orange-500 text-white border-orange-500',
    textActive: 'text-white'
  },
  {
    id: 'nature',
    label: 'Nature & Parks',
    icon: '🌊',
    accentColor: 'border-teal-200 text-teal-800 bg-teal-50/60',
    bgActive: 'bg-teal-600 text-white border-teal-600',
    textActive: 'text-white'
  },
  {
    id: 'architecture',
    label: 'Architecture',
    icon: '🏗️',
    accentColor: 'border-indigo-200 text-indigo-800 bg-indigo-50/60',
    bgActive: 'bg-indigo-600 text-white border-indigo-600',
    textActive: 'text-white'
  },
  {
    id: 'cafes',
    label: 'Cafes & Tea',
    icon: '☕',
    accentColor: 'border-yellow-200 text-yellow-800 bg-yellow-50/60',
    bgActive: 'bg-amber-600 text-white border-amber-600',
    textActive: 'text-white'
  },
  {
    id: 'shopping',
    label: 'Shopping',
    icon: '🛍️',
    accentColor: 'border-purple-200 text-purple-800 bg-purple-50/60',
    bgActive: 'bg-purple-600 text-white border-purple-600',
    textActive: 'text-white'
  },
  {
    id: 'photography',
    label: 'Photography',
    icon: '📸',
    accentColor: 'border-rose-200 text-rose-800 bg-rose-50/60',
    bgActive: 'bg-rose-500 text-white border-rose-500',
    textActive: 'text-white'
  },
  {
    id: 'culture',
    label: 'Culture',
    icon: '🎭',
    accentColor: 'border-emerald-200 text-emerald-800 bg-emerald-50/60',
    bgActive: 'bg-emerald-600 text-white border-emerald-600',
    textActive: 'text-white'
  },
];

export const DEMO_PLACES: Place[] = [
  {
    id: 'charminar',
    name: 'Charminar',
    category: 'history',
    categoryLabel: '🏛️ Historical Landmark',
    rating: 4.6,
    reviewCount: 14200,
    distanceKm: 4.2,
    travelTimeMin: 14,
    visitDuration: '1–2 hrs',
    imageUrl: 'https://images.unsplash.com/photo-1572445271230-a78b5944a659?auto=format&fit=crop&w=800&q=80',
    shortDescription: '16th-century landmark mosque with 4 grand minarets and bustling traditional bazaars.',
    whyRecommended: 'Iconic city symbol; best visited in morning light to explore the surrounding street markets with ease.',
    tags: ['Monument', 'Heritage', 'Old City']
  },
  {
    id: 'golconda',
    name: 'Golconda Fort',
    category: 'history',
    categoryLabel: '🏰 Medieval Citadel',
    rating: 4.7,
    reviewCount: 18600,
    distanceKm: 8.5,
    travelTimeMin: 24,
    visitDuration: '2–3 hrs',
    imageUrl: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=800&q=80',
    shortDescription: 'Sprawling medieval fortress famed for acoustics, royal palaces, and panoramic sunset views.',
    whyRecommended: 'Top-rated scenic landmark; best visited between 3 PM and 6 PM for gentle breezes and sunset.',
    tags: ['Fortress', 'Acoustics', 'Sunset Views']
  },
  {
    id: 'birla-mandir',
    name: 'Birla Mandir',
    category: 'temples',
    categoryLabel: '🛕 Hilltop Marble Temple',
    rating: 4.8,
    reviewCount: 12500,
    distanceKm: 3.8,
    travelTimeMin: 12,
    visitDuration: '1–1.5 hrs',
    imageUrl: 'https://images.unsplash.com/photo-1620766182966-c6eb5ed2b788?auto=format&fit=crop&w=800&q=80',
    shortDescription: 'Majestic white marble temple atop Naubat Pahad overlooking the Hussain Sagar lake.',
    whyRecommended: 'Peaceful ambiance with panoramic city views; ideal for a calm evening spiritual visit.',
    tags: ['Spiritual', 'Marble', 'Panoramic View']
  },
  {
    id: 'chilkur-balaji',
    name: 'Chilkur Balaji Temple',
    category: 'temples',
    categoryLabel: '🛕 Ancient Shrine',
    rating: 4.7,
    reviewCount: 9400,
    distanceKm: 18.2,
    travelTimeMin: 38,
    visitDuration: '2 hrs',
    imageUrl: 'https://images.unsplash.com/photo-1590076215667-873d1db96043?auto=format&fit=crop&w=800&q=80',
    shortDescription: 'Ancient sacred temple by Osman Sagar, affectionately known as the "Visa Balaji" temple.',
    whyRecommended: 'Unique tradition of 108 parikramas with peaceful lake breezes outside the city center.',
    tags: ['Ancient', 'Tradition', 'Lake Side']
  },
  {
    id: 'paradise-biryani',
    name: 'Old City Dum Biryani Walk',
    category: 'food',
    categoryLabel: '🍴 Culinary Heritage',
    rating: 4.6,
    reviewCount: 22100,
    distanceKm: 4.5,
    travelTimeMin: 15,
    visitDuration: '1 hr',
    imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80',
    shortDescription: 'Slow-cooked fragrant Hyderabadi Dum Biryani spiced with saffron, cardamom, and caramelized onions.',
    whyRecommended: 'Must-experience culinary tradition; conveniently located 5 minutes walking distance from Charminar.',
    tags: ['Biryani', 'Local Speciality', 'Budget Friendly']
  },
  {
    id: 'niloufer-cafe',
    name: 'Cafe Niloufer & Irani Chai',
    category: 'cafes',
    categoryLabel: '☕ Heritage Irani Cafe',
    rating: 4.8,
    reviewCount: 15800,
    distanceKm: 5.1,
    travelTimeMin: 16,
    visitDuration: '45 min',
    imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=80',
    shortDescription: 'Legendary 1978 tea parlor serving rich, creamy Irani Chai with hot Osmania biscuits and bun maska.',
    whyRecommended: 'Beloved local morning ritual; highly affordable (under ₹100) and lively community energy.',
    tags: ['Irani Chai', 'Osmania Biscuits', 'Local Culture']
  },
  {
    id: 'durgam-cheruvu',
    name: 'Durgam Cheruvu & Cable Bridge',
    category: 'nature',
    categoryLabel: '🌊 Lake & Cable Bridge',
    rating: 4.5,
    reviewCount: 11200,
    distanceKm: 11.0,
    travelTimeMin: 28,
    visitDuration: '1.5–2 hrs',
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
    shortDescription: 'Freshwater lake with illuminated hanging cable-stayed bridge, walking promenade, and boating.',
    whyRecommended: 'Scenic evening breeze with waterfront cafes and skyline photography opportunities.',
    tags: ['Waterfront', 'Boating', 'Skyline View']
  },
  {
    id: 'laad-bazaar',
    name: 'Laad Bazaar (Choodi Bazaar)',
    category: 'shopping',
    categoryLabel: '🛍️ Traditional Market',
    rating: 4.4,
    reviewCount: 8900,
    distanceKm: 4.3,
    travelTimeMin: 15,
    visitDuration: '1–2 hrs',
    imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
    shortDescription: 'Historic pedestrian shopping street famous for handcrafted lacquer bangles, pearls, and perfumes (ittar).',
    whyRecommended: 'Vibrant colors and authentic street bargain shopping right in the heart of old town.',
    tags: ['Bangles', 'Pearls', 'Handmade']
  },
  {
    id: 'chowmahalla',
    name: 'Chowmahalla Palace',
    category: 'architecture',
    categoryLabel: '🏗️ Royal Nizami Palace',
    rating: 4.7,
    reviewCount: 13400,
    distanceKm: 4.8,
    travelTimeMin: 16,
    visitDuration: '2 hrs',
    imageUrl: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=800&q=80',
    shortDescription: 'Grand palace of the Nizams with European neo-classical facades, Belgian crystal chandeliers, and vintage car collection.',
    whyRecommended: 'Exquisite royal architecture and peaceful courtyards just 10 mins from Charminar.',
    tags: ['Palace', 'Chandeliers', 'Vintage Cars']
  },
  {
    id: 'shilparamam',
    name: 'Shilparamam Arts Village',
    category: 'culture',
    categoryLabel: '🎭 Cultural Crafts Village',
    rating: 4.4,
    reviewCount: 16700,
    distanceKm: 12.5,
    travelTimeMin: 32,
    visitDuration: '2–3 hrs',
    imageUrl: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=800&q=80',
    shortDescription: 'Rural folk village celebrating traditional arts, crafts exhibitions, live puppetry, and ethnic performances.',
    whyRecommended: 'Great family outing for artisan shopping, street food, and folk dances.',
    tags: ['Crafts', 'Folk Dance', 'Family Friendly']
  }
];
