import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { database, auth } from '@/config/firebase';
import { ref, update, serverTimestamp } from '@firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { determineUserStatus } from '@/utils/geo';
import { Place } from '@/types/circle';
import { CACHED_PLACES_KEY } from '@/services/placesService';

export const BACKGROUND_LOCATION_TASK = 'background-location-task';

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('[locationService] Background location error:', error);
    return;
  }
  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    const user = auth.currentUser;
    if (user && locations.length > 0) {
      const latestLocation = locations[0];
      try {
        let places: Place[] = [];
        const cached = await AsyncStorage.getItem(CACHED_PLACES_KEY);
        if (cached) {
          places = JSON.parse(cached);
        }

        const newStatus = determineUserStatus(latestLocation.coords.latitude, latestLocation.coords.longitude, places);

        const updates = {
          [`users/${user.uid}/location`]: {
            latitude: latestLocation.coords.latitude,
            longitude: latestLocation.coords.longitude,
            timestamp: latestLocation.timestamp,
          },
          [`users/${user.uid}/status`]: newStatus,
          [`users/${user.uid}/lastStatusUpdate`]: serverTimestamp(),
        };

        await update(ref(database), updates);
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

  const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
  if (backgroundStatus !== 'granted') {
    console.warn('Background location permission denied');
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
  const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
  if (isRegistered) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  }
}
