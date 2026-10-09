export type WeatherConditionType = 
  | 'clear'
  | 'partly_cloudy'
  | 'cloudy'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'heavy_rain'
  | 'thunderstorm'
  | 'snow';

export interface CurrentWeather {
  temperature: number; // in Celsius
  feelsLike: number;
  condition: string;
  conditionType: WeatherConditionType;
  icon: string;
  precipitationMm: number;
  precipitationProbability: number; // 0 - 100 %
  windSpeedKmh: number;
  humidity: number; // %
  isDay: boolean;
}

export interface HourlyForecastItem {
  time: string; // e.g. "09:00"
  isoTime: string; // full ISO string
  hour: number; // 0 - 23
  temperature: number;
  feelsLike: number;
  condition: string;
  conditionType: WeatherConditionType;
  icon: string;
  precipitationProbability: number;
  precipitationMm: number;
  windSpeedKmh: number;
}

export interface DailyForecastItem {
  date: string; // "YYYY-MM-DD"
  tempMin: number;
  tempMax: number;
  condition: string;
  conditionType: WeatherConditionType;
  icon: string;
  precipitationProbability: number;
}

export interface WeatherData {
  location: {
    lat: number;
    lon: number;
    city?: string;
    area?: string;
  };
  latitude: number;
  longitude: number;
  timezone: string;
  current: CurrentWeather;
  hourlyForecast: HourlyForecastItem[];
  dailyForecast: DailyForecastItem[];
  fetchedAt: string;
  provider: string;
}

export type WeatherImpactSeverity = 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE';
export type PlaceOutdoorClassification = 'outdoor' | 'indoor' | 'mixed';

export interface WeatherImpactItem {
  severity: WeatherImpactSeverity;
  type: 'RAIN' | 'HEAT' | 'WIND' | 'GENERAL';
  affectedStopId?: string;
  affectedStopName?: string;
  affectedTime?: string;
  plannedTransportMode?: string;
  outdoorClassification?: PlaceOutdoorClassification;
  reason: string;
  suggestion: string;
  suggestedAlternativeMode?: string;
  suggestedAlternativeStopOrder?: string[];
}

export interface WeatherTripImpact {
  overallSeverity: WeatherImpactSeverity;
  hasWeatherAlert: boolean;
  summary: string;
  impactItems: WeatherImpactItem[];
  travelWindowForecast: HourlyForecastItem[];
  suggestedStopOrder?: string[]; // array of place IDs
  suggestedStopNames?: string[];
  alternativeTransportSuggestion?: {
    fromMode: string;
    toMode: string;
    reason: string;
  };
  isAlternativeOrderDifferent: boolean;
}
