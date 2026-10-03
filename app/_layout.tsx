import { Stack } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { CircleProvider } from '@/context/CircleContext';
import { useEffect } from 'react';
import {
  startBackgroundLocation,
  stopBackgroundLocation,
  pushForegroundLocation,
} from '@/services/locationService';

function RootStack() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (user) {
      // Immediately push the user's location so their marker appears on the map
      pushForegroundLocation();
      startBackgroundLocation();
    } else {
      stopBackgroundLocation();
    }
  }, [user]);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Auth screens — accessible only when NOT signed in */}
      <Stack.Protected guard={!user}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>

      {/* App screens — accessible only when signed in */}
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <CircleProvider>
        <RootStack />
      </CircleProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
});
