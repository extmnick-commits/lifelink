import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { ref, get } from '@firebase/database';
import { useAuth } from '@/context/AuthContext';
import { useCircle } from '@/context/CircleContext';
import { database } from '@/config/firebase';

type UserProfile = {
  uid: string;
  displayName: string;
  email: string;
  createdAt: string;
};

export default function HomeScreen() {
  const { user, signOut } = useAuth();
  const { circleId, members } = useCircle();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const profileRef = ref(database, `users/${user.uid}`);
    get(profileRef)
      .then((snapshot) => {
        if (snapshot.exists()) {
          setProfile(snapshot.val() as UserProfile);
        }
      })
      .catch(console.error)
      .finally(() => setProfileLoading(false));
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
  };

  const initials = profile?.displayName
    ? profile.displayName
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Text style={styles.appName}>LifeLink</Text>
          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {profileLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
        ) : (
          <>
            {/* Avatar + greeting */}
            <View style={styles.heroSection}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              <Text style={styles.greeting}>
                Hello, {profile?.displayName ?? user?.email ?? 'there'} 👋
              </Text>
              <Text style={styles.tagline}>Welcome to your LifeLink dashboard</Text>
            </View>

            {/* Profile card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Your Profile</Text>

              <View style={styles.infoRow}>
                <View style={styles.infoIconWrap}>
                  <Text style={styles.infoIcon}>👤</Text>
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Display Name</Text>
                  <Text style={styles.infoValue}>
                    {profile?.displayName ?? '—'}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <View style={styles.infoIconWrap}>
                  <Text style={styles.infoIcon}>✉️</Text>
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue}>
                    {profile?.email ?? user?.email ?? '—'}
                  </Text>
                </View>
              </View>

              {memberSince ? (
                <>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <View style={styles.infoIconWrap}>
                      <Text style={styles.infoIcon}>📅</Text>
                    </View>
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Member since</Text>
                      <Text style={styles.infoValue}>{memberSince}</Text>
                    </View>
                  </View>
                </>
              ) : null}
            </View>

            {/* My Circle card */}
            <TouchableOpacity
              style={styles.circleCard}
              onPress={() => router.push('/(app)/circle')}
              activeOpacity={0.8}
            >
              <View style={styles.circleCardLeft}>
                <View style={styles.circleCardIcon}>
                  <Text style={styles.circleCardEmoji}>👥</Text>
                </View>
                <View style={styles.circleCardText}>
                  <Text style={styles.circleCardTitle}>My Circle</Text>
                  <Text style={styles.circleCardSub}>
                    {circleId
                      ? `${members.length} member${members.length !== 1 ? 's' : ''}`
                      : 'Tap to set up your circle'}
                  </Text>
                </View>
              </View>
              <Text style={styles.circleChevron}>›</Text>
            </TouchableOpacity>

            {/* UID badge */}
            <View style={styles.uidBadge}>
              <Text style={styles.uidLabel}>User ID</Text>
              <Text style={styles.uidValue} numberOfLines={1}>
                {user?.uid}
              </Text>
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0F172A' },
  container: { flex: 1, paddingHorizontal: 24 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 16,
  },
  appName: { fontSize: 20, fontWeight: '800', color: '#3B82F6', letterSpacing: 0.5 },
  signOutBtn: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#475569',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  signOutText: { color: '#F87171', fontSize: 13, fontWeight: '600' },

  heroSection: { alignItems: 'center', paddingVertical: 32 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  avatarText: { fontSize: 30, fontWeight: '800', color: '#fff' },
  greeting: { fontSize: 22, fontWeight: '700', color: '#F1F5F9', marginBottom: 6, textAlign: 'center' },
  tagline: { fontSize: 14, color: '#64748B', textAlign: 'center' },

  card: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  infoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  infoIcon: { fontSize: 16 },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, color: '#64748B', fontWeight: '600', letterSpacing: 0.5, marginBottom: 2 },
  infoValue: { fontSize: 15, color: '#E2E8F0', fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#334155', marginVertical: 14 },

  uidBadge: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  uidLabel: { fontSize: 10, color: '#475569', fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  uidValue: { fontSize: 12, color: '#64748B', fontFamily: 'monospace' },

  circleCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  circleCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  circleCardIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleCardEmoji: { fontSize: 20 },
  circleCardText: { flex: 1 },
  circleCardTitle: { fontSize: 15, fontWeight: '700', color: '#F1F5F9', marginBottom: 2 },
  circleCardSub: { fontSize: 12, color: '#64748B' },
  circleChevron: { fontSize: 22, color: '#475569', fontWeight: '300' },
});
