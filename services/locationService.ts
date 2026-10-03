import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { isRunningInExpoGo } from 'expo';
import { database, auth } from '@/config/firebase';
import { ref, update, serverTimestamp } from '@firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { determineUserStatus } from '@/utils/geo';
import type { Place } from '@/types/circle';
import { CACHED_PLACES_KEY } from '@/services/placesService';

export const BACKGROUND_LOCATION_TASK = 'background-location-task';

let foregroundSubscription: Location.LocationSubscription | null = null;

async function persistLocation(location: Location.LocationObject): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  let places: Place[] = [];
  const cached = await AsyncStorage.getItem(CACHED_PLACES_KEY);
  if (cached) {
    places = JSON.parse(cached);
  }

  const newStatus = determineUserStatus(
    location.coords.latitude,
    location.coords.longitude,
    places,
  );

  const updates = {
    [`users/${user.uid}/location`]: {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      timestamp: location.timestamp,
    },
    [`users/${user.uid}/status`]: newStatus,
    [`users/${user.uid}/lastStatusUpdate`]: serverTimestamp(),
  };

  await update(ref(database), updates);
}

async function startForegroundWatch(): Promise<void> {
  if (foregroundSubscription) return;
  foregroundSubscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Balanced,
      distanceInterval: 10,
    },
    (location) => {
      persistLocation(location).catch((err) => {
        console.error('[locationService] Failed to persist watched location', err);
      });
    },
  );
}

async function stopForegroundWatch(): Promise<void> {
  foregroundSubscription?.remove();
  foregroundSubscription = null;
}

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('[locationService] Background location error:', error);
    return;
  }
  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    const user = auth.currentUser;
    if (user && locations.length > 0) {
      try {
        await persistLocation(locations[0]);
      } catch (err) {
        console.error('[locationService] Failed to update location in Firebase', err);
      }
    }
  }
});

export async function startBackgroundLocation() {
  const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
  if (foregroundStatus !== 'granted') {
    console.warn('Foreground location permission denied');
    return;
  }

  // Expo Go cannot run true background location (Android: unavailable; iOS: simulator-only).
  // Calling startLocationUpdatesAsync always console.warns in Expo Go.
  if (isRunningInExpoGo()) {
    await startForegroundWatch();
    return;
  }

  const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
  if (backgroundStatus !== 'granted') {
    console.warn('Background location permission denied');
    await startForegroundWatch();
    return;
  }

  await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced,
    distanceInterval: 10,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'LifeLink Location Tracking',
      notificationBody: 'Sharing your live location with your circle.',
    },
  });
}

export async function stopBackgroundLocation() {
  await stopForegroundWatch();
  if (isRunningInExpoGo()) {
    return;
  }
  const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
  if (isRegistered) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  }
}

/**
 * Immediately fetches the user's current foreground location and pushes it to Firebase.
 * Call this when the app opens so the user's marker appears on the map right away,
 * without waiting for the background task to fire.
 */
export async function pushForegroundLocation(): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    console.warn('[locationService] Foreground permission not granted');
    return;
  }

  try {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    await persistLocation(location);
    console.log('[locationService] Foreground location pushed to Firebase');
  } catch (err) {
    console.error('[locationService] Failed to push foreground location:', err);
  }
}
