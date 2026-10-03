import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import type { MapMember } from '@/hooks/useCircleMapData';

type Props = {
  member: MapMember;
};

export function MemberMarker({ member }: Props) {
  const [tracksViewChanges, setTracksViewChanges] = useState(true);

  // Briefly enable tracking when coordinates or status changes to re-render the custom view
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTracksViewChanges(true);
    const timeout = setTimeout(() => setTracksViewChanges(false), 500);
    return () => clearTimeout(timeout);
  }, [member.latitude, member.longitude, member.status, member.displayName]);

  const initials = member.displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const isAtPlace = member.status?.startsWith('At ');

  return (
    <Marker
      coordinate={{ latitude: member.latitude, longitude: member.longitude }}
      tracksViewChanges={tracksViewChanges}
      anchor={{ x: 0.5, y: 1 }}
    >
      <View style={styles.container}>
        {member.status && (
          <View
            style={[
              styles.statusPill,
              isAtPlace ? styles.statusAtPlace : styles.statusOnMove,
            ]}
          >
            <Text style={styles.statusName} numberOfLines={1}>
              {member.displayName.split(' ')[0]}
            </Text>
            <Text style={styles.statusText} numberOfLines={1}>
              {member.status}
            </Text>
          </View>
        )}
        <View style={styles.pinContainer}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.pinPoint} />
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    maxWidth: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statusAtPlace: {
    backgroundColor: '#10B981', // Green
  },
  statusOnMove: {
    backgroundColor: '#3B82F6', // Blue
  },
  statusName: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    marginRight: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '400',
    flexShrink: 1,
  },
  pinContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3B82F6',
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 2,
  },
  avatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  pinPoint: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#fff',
    transform: [{ rotate: '180deg' }],
    marginTop: -2,
    zIndex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});
