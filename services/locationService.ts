import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { database, auth } from '@/config/firebase';
import { ref, update } from '@firebase/database';

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
        await update(ref(database, `users/${user.uid}/location`), {
          latitude: latestLocation.coords.latitude,
          longitude: latestLocation.coords.longitude,
          timestamp: latestLocation.timestamp,
        });
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
