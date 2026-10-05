import type { Place, PlaceType } from '@/types/circle';

export type PlaceTypeConfig = {
  type: PlaceType;
  emoji: string;
  label: string;
  iconBackground: string;
};

export const PLACE_TYPES: PlaceTypeConfig[] = [
  { type: 'home', emoji: '🏠', label: 'Home', iconBackground: '#EEF2FF' },
  { type: 'work', emoji: '🏢', label: 'Work', iconBackground: '#F0FDF4' },
  { type: 'school', emoji: '🎒', label: 'School', iconBackground: '#FFF7ED' },
  { type: 'gym', emoji: '🏋️', label: 'Gym', iconBackground: '#FDF2F8' },
  { type: 'favorite', emoji: '⭐', label: 'Favorite', iconBackground: '#FFFBEB' },
  { type: 'other', emoji: '📍', label: 'Other', iconBackground: '#F1F5F9' },
];

const configByType = Object.fromEntries(
  PLACE_TYPES.map((c) => [c.type, c]),
) as Record<PlaceType, PlaceTypeConfig>;

export function getPlaceTypeConfig(type: PlaceType): PlaceTypeConfig {
  return configByType[type] ?? configByType.other;
}

export function normalizePlaceType(place: Pick<Place, 'type'>): PlaceType {
  if (place.type && place.type in configByType) {
    return place.type;
  }
  return 'other';
}
