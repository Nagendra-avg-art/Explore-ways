export type CategoryId = 
  | 'all'
  | 'temples'
  | 'history'
  | 'food'
  | 'nature'
  | 'architecture'
  | 'shopping'
  | 'cafes'
  | 'photography'
  | 'culture';

export interface Category {
  id: CategoryId;
  label: string;
  icon: string;
  accentColor: string; // Tailwind color class for tag styling
  bgActive: string;
  textActive: string;
}

export interface Place {
  id: string;
  name: string;
  category: CategoryId;
  categoryLabel: string;
  rating: number;
  reviewCount: number;
  distanceKm: number;
  travelTimeMin: number;
  visitDuration: string;
  imageUrl: string;
  shortDescription: string;
  whyRecommended: string;
  tags: string[];
}

export type TimeOption = '2h' | '4h' | 'halfDay' | 'fullDay';
export type BudgetOption = '500' | '1000' | '2000' | '5000';
