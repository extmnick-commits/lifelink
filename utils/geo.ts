import { Place } from '@/types/circle';

export function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's mean radius in meters
  const toRad = (value: number) => (value * Math.PI) / 180;
  
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function determineUserStatus(userLat: number, userLon: number, places: Place[]): string {
  let closestPlace: Place | null = null;
  let minDistance = Infinity;

  for (const place of places) {
    const distance = calculateDistanceMeters(userLat, userLon, place.latitude, place.longitude);
    if (distance <= place.radius && distance < minDistance) {
      closestPlace = place;
      minDistance = distance;
    }
  }

  return closestPlace ? `At ${closestPlace.name}` : "On the Move";
}
