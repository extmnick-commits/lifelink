import { useState, useEffect, useRef } from 'react';
import { ref, onValue, type Unsubscribe } from '@firebase/database';
import { database } from '@/config/firebase';
import type { Place } from '@/types/circle';

export type MapMember = {
  uid: string;
  displayName: string;
  latitude: number;
  longitude: number;
  status?: string;
  updatedAt?: number;
};

export function useCircleMapData(circleId: string | null) {
  const [members, setMembers] = useState<MapMember[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const memberListenersRef = useRef<Record<string, Unsubscribe>>({});

  useEffect(() => {
    if (!circleId) {
      setMembers([]);
      setPlaces([]);
      return;
    }

    // Subscribe to places
    const placesRef = ref(database, `circles/${circleId}/places`);
    const unsubPlaces = onValue(placesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const placesArray = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        })) as Place[];
        setPlaces(placesArray);
      } else {
        setPlaces([]);
      }
    });

    // Subscribe to members list
    const membersRef = ref(database, `circles/${circleId}/members`);
    const unsubMembers = onValue(membersRef, (snapshot) => {
      const data = snapshot.val() as Record<string, boolean> | null;
      if (!data) {
        setMembers([]);
        return;
      }

      const activeUids = Object.keys(data).filter((uid) => data[uid]);

      // Cleanup removed members
      Object.keys(memberListenersRef.current).forEach((uid) => {
        if (!activeUids.includes(uid)) {
          memberListenersRef.current[uid]();
          delete memberListenersRef.current[uid];
        }
      });

      // Attach new listeners
      activeUids.forEach((uid) => {
        if (!memberListenersRef.current[uid]) {
          const userRef = ref(database, `users/${uid}`);
          memberListenersRef.current[uid] = onValue(userRef, (userSnap) => {
            const userData = userSnap.val();
            if (userData?.location?.latitude && userData?.location?.longitude) {
              setMembers((prev) => {
                const newMember = {
                  uid,
                  displayName: userData.displayName || 'Unknown',
                  latitude: userData.location.latitude,
                  longitude: userData.location.longitude,
                  status: userData.status,
                  updatedAt: userData.location.timestamp,
                };
                const existingIndex = prev.findIndex((m) => m.uid === uid);
                if (existingIndex >= 0) {
                  const newArray = [...prev];
                  newArray[existingIndex] = newMember;
                  return newArray;
                }
                return [...prev, newMember];
              });
            } else {
              // Remove member if location is cleared
              setMembers((prev) => prev.filter((m) => m.uid !== uid));
            }
          });
        }
      });
    });

    return () => {
      unsubPlaces();
      unsubMembers();
      Object.values(memberListenersRef.current).forEach((unsub) => unsub());
      memberListenersRef.current = {};
    };
  }, [circleId]);

  return { members, places };
}
