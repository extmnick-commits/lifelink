import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import MapView, { Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { useAuth } from '@/context/AuthContext';
import { useCircle } from '@/context/CircleContext';
import { useCircleMapData } from '@/hooks/useCircleMapData';
import { MemberMarker } from '@/components/MemberMarker';

const isExpoGo = Constants.appOwnership === 'expo';

export default function MapScreen() {
  const { user, signOut } = useAuth();
  const { circleId, circleData, members: contextMembers } = useCircle();
  const { members, places } = useCircleMapData(circleId);
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);

  // Device location for initial map centering (independent of Firebase data)
  const [deviceLocation, setDeviceLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || cancelled) return;
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      if (!cancelled) {
        setDeviceLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const currentUserLocation = members.find((m) => m.uid === user?.uid);

  const handleRecenter = () => {
    const center = currentUserLocation
      ? { latitude: currentUserLocation.latitude, longitude: currentUserLocation.longitude }
      : deviceLocation;

    if (center && mapRef.current) {
      mapRef.current.animateCamera({
        center,
        altitude: 2000,
        pitch: 0,
        heading: 0,
      });
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        googleRenderer={Platform.OS === 'android' ? 'LEGACY' : undefined}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsCompass={true}
        onMapReady={() => {
          console.log('[map] MapView ready');
        }}
        initialRegion={
          currentUserLocation
            ? {
                latitude: currentUserLocation.latitude,
                longitude: currentUserLocation.longitude,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }
            : deviceLocation
              ? {
                  latitude: deviceLocation.latitude,
                  longitude: deviceLocation.longitude,
                  latitudeDelta: 0.05,
                  longitudeDelta: 0.05,
                }
              : {
                  latitude: 37.7749,
                  longitude: -122.4194,
                  latitudeDelta: 0.0922,
                  longitudeDelta: 0.0421,
                }
        }
      >
        {places.map((place) => (
          <Circle
            key={place.id}
            center={{ latitude: place.latitude, longitude: place.longitude }}
            radius={place.radius || 150}
            fillColor="rgba(37, 99, 235, 0.15)"
            strokeColor="rgba(37, 99, 235, 0.5)"
            strokeWidth={2}
          />
        ))}

        {members.map((member) => (
          <MemberMarker key={member.uid} member={member} />
        ))}
      </MapView>

      {/* Top Bar Overlay */}
      <View style={[styles.topBarContainer, { paddingTop: Math.max(insets.top, 20) }]}>
        <View style={styles.topBar}>
          <View style={styles.topLeft}>
            <Text style={styles.circleName}>
              {circleData?.name || 'LifeLink'}
            </Text>
            {circleId && (
              <Text style={styles.memberCount}>
                {contextMembers.length} member{contextMembers.length !== 1 ? 's' : ''}
              </Text>
            )}
          </View>
          <View style={styles.topRight}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => router.push('/places' as any)}
            >
              <Text style={styles.actionBtnText}>Places</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.signOutBtn]}
              onPress={handleSignOut}
            >
              <Text style={styles.signOutBtnText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Empty State Overlay */}
      {!circleId && (
        <View style={styles.emptyStateOverlay} pointerEvents="box-none">
          <View style={styles.emptyStateCard}>
            <Text style={styles.emptyStateTitle}>Welcome to LifeLink</Text>
            <Text style={styles.emptyStateDesc}>
              You need to create or join a circle to see members on the map.
            </Text>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => router.push('/(app)/circle')}
            >
              <Text style={styles.primaryBtnText}>Create or Join a Circle</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {isExpoGo && Platform.OS === 'android' && (
        <View
          style={[
            styles.mapsNotice,
            { bottom: Math.max(insets.bottom, 16) + (circleId ? 80 : 16) },
          ]}
        >
          <Text style={styles.mapsNoticeTitle}>{"Map tiles won't load in Expo Go"}</Text>
          <Text style={styles.mapsNoticeText}>
            Android Expo Go ships an expired Google Maps key, so the map stays black. Your .env key is only used in a development build.
          </Text>
        </View>
      )}

      {/* Recenter FAB */}
      {circleId && (currentUserLocation || deviceLocation) && (
        <TouchableOpacity
          style={[styles.fab, { bottom: Math.max(insets.bottom, 20) + 20 }]}
          onPress={handleRecenter}
        >
          <Text style={styles.fabIcon}>📍</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  topBarContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.85)',
    marginHorizontal: 16,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  topLeft: {
    flex: 1,
  },
  circleName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  memberCount: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  signOutBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#475569',
  },
  signOutBtnText: {
    color: '#F87171',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyStateOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
  },
  emptyStateCard: {
    backgroundColor: '#1E293B',
    padding: 24,
    borderRadius: 16,
    width: '85%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  emptyStateDesc: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 20,
  },
  primaryBtn: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
    zIndex: 10,
  },
  fabIcon: {
    fontSize: 20,
  },
  mapsNotice: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: 'rgba(30, 41, 59, 0.92)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.35)',
    zIndex: 10,
  },
  mapsNoticeTitle: {
    color: '#FBBF24',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  mapsNoticeText: {
    color: '#E2E8F0',
    fontSize: 12,
    lineHeight: 17,
  },
});
