/**
 * Map Tile Providers & Configuration
 * 
 * Provides an extensible abstraction for map tile layers so that Leaflet
 * is decoupled from any single tile provider.
 */

export interface MapTileProvider {
  id: string;
  name: string;
  url: string;
  attribution: string;
  maxZoom: number;
  subdomains?: string | string[];
  requiresApiKey: boolean;
}

export const MAP_PROVIDERS: Record<string, MapTileProvider> = {
  // Standard OpenStreetMap Tile Layer (100% Free, Keyless, Open Source)
  openstreetmap: {
    id: 'openstreetmap',
    name: 'OpenStreetMap (Standard)',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    maxZoom: 19,
    requiresApiKey: false,
  },

  // Future optional providers with API key placeholders (not active by default)
  carto_voyager: {
    id: 'carto_voyager',
    name: 'CARTO Voyager (Requires Account Key)',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 19,
    subdomains: 'abcd',
    requiresApiKey: true,
  },

  maptiler_streets: {
    id: 'maptiler_streets',
    name: 'MapTiler Streets (Requires Account Key)',
    url: 'https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key={key}',
    attribution:
      '&copy; <a href="https://www.maptiler.com/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 20,
    requiresApiKey: true,
  },
};

/**
 * Currently active map tile provider.
 * Using OpenStreetMap ensures reliable, keyless map rendering with zero "API KEY REQUIRED" watermarks.
 */
export const ACTIVE_MAP_PROVIDER: MapTileProvider = MAP_PROVIDERS.openstreetmap;
