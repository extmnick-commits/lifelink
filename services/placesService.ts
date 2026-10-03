import { database } from '@/config/firebase';
import { ref, push, remove, onValue, set } from '@firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Place } from '@/types/circle';

export const CACHED_PLACES_KEY = '@cached_places';

export async function addPlace(circleId: string, name: string, latitude: number, longitude: number, radius = 150) {
  const placesRef = ref(database, `circles/${circleId}/places`);
  const newPlaceRef = push(placesRef);
  const place: Omit<Place, 'id'> = {
    name,
    latitude,
    longitude,
    radius,
    createdAt: Date.now(),
  };
  await set(newPlaceRef, place);
}

export async function deletePlace(circleId: string, placeId: string) {
  const placeRef = ref(database, `circles/${circleId}/places/${placeId}`);
  await remove(placeRef);
}

export function subscribeToPlaces(circleId: string, callback: (places: Place[]) => void) {
  const placesRef = ref(database, `circles/${circleId}/places`);
  return onValue(placesRef, async (snapshot) => {
    const data = snapshot.val();
    const places: Place[] = [];
    if (data) {
      Object.keys(data).forEach((key) => {
        places.push({ id: key, ...data[key] });
      });
    }
    await AsyncStorage.setItem(CACHED_PLACES_KEY, JSON.stringify(places));
    callback(places);
  });
}
