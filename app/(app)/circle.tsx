/**
 * app/(app)/circle.tsx
 * Circle management screen — create, join, view members, leave.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useCircle } from '@/context/CircleContext';
import type { UserProfile } from '@/types/circle';

// ── Sub-components ─────────────────────────────────────────────────────────────

function MemberRow({ profile }: { profile: UserProfile }) {
  const initials = profile.displayName
    ? profile.displayName
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  return (
    <View style={styles.memberRow}>
      <View style={styles.memberAvatar}>
        <Text style={styles.memberAvatarText}>{initials}</Text>
      </View>
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{profile.displayName || 'Unknown'}</Text>
        <Text style={styles.memberEmail}>{profile.email}</Text>
      </View>
      <View style={styles.memberBadge}>
        <Text style={styles.memberBadgeText}>Member</Text>
      </View>
    </View>
  );
}

// ── No-Circle State ────────────────────────────────────────────────────────────

function NoCircleView() {
  const { createCircle, joinCircle, isLoading } = useCircle();
  const [code, setCode] = useState('');
  const [actionLoading, setActionLoading] = useState<'create' | 'join' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setError(null);
    setActionLoading('create');
    try {
      await createCircle();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to create circle.';
      setError(msg);
    } finally {
      setActionLoading(null);
    }
  };

  const handleJoin = async () => {
    if (code.trim().length < 6) {
      setError('Please enter the full 6-character invite code.');
      return;
    }
    setError(null);
    setActionLoading('join');
    try {
      await joinCircle(code.trim());
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to join circle.';
      setError(msg);
    } finally {
      setActionLoading(null);
    }
  };

  const busy = isLoading || actionLoading !== null;

  return (
    <ScrollView
      contentContainerStyle={styles.noCircleContainer}
      keyboardShouldPersistTaps="handled"
    >
      {/* Hero */}
      <View style={styles.heroSection}>
        <View style={styles.heroIcon}>
          <Text style={styles.heroEmoji}>🔗</Text>
        </View>
        <Text style={styles.heroTitle}>Your Circle</Text>
        <Text style={styles.heroSubtitle}>
          Create a private group or join one with an invite code to share your location with
          the people you trust.
        </Text>
      </View>

      {/* Error box */}
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Create card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardHeaderIcon}>✨</Text>
          <Text style={styles.cardHeaderTitle}>Start a new Circle</Text>
        </View>
        <Text style={styles.cardDescription}>
          {"You'll get a unique invite code to share with friends and family."}
        </Text>
        <TouchableOpacity
          style={[styles.primaryButton, busy && styles.buttonDisabled]}
          onPress={handleCreate}
          disabled={busy}
          activeOpacity={0.85}
        >
          {actionLoading === 'create' ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Create a Circle</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Divider */}
      <View style={styles.orRow}>
        <View style={styles.orLine} />
        <Text style={styles.orText}>or join one</Text>
        <View style={styles.orLine} />
      </View>

      {/* Join card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardHeaderIcon}>🔑</Text>
          <Text style={styles.cardHeaderTitle}>Join an existing Circle</Text>
        </View>
        <Text style={styles.cardDescription}>
          Ask a circle member for their 6-character invite code.
        </Text>
        <TextInput
          style={styles.codeInput}
          placeholder="E.g. AB3X7K"
          placeholderTextColor="#475569"
          value={code}
          onChangeText={(t) => setCode(t.toUpperCase().slice(0, 6))}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={6}
          keyboardType="default"
        />
        <TouchableOpacity
          style={[
            styles.secondaryButton,
            (busy || code.length < 6) && styles.buttonDisabled,
          ]}
          onPress={handleJoin}
          disabled={busy || code.length < 6}
          activeOpacity={0.85}
        >
          {actionLoading === 'join' ? (
            <ActivityIndicator color="#6366F1" />
          ) : (
            <Text style={styles.secondaryButtonText}>Join Circle</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ── Has-Circle State ───────────────────────────────────────────────────────────

function HasCircleView() {
  const { circleData, inviteCode, members, isLoading, leaveCircle } = useCircle();
  const [copied, setCopied] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const handleCopy = async () => {
    if (!inviteCode) return;
    await Clipboard.setStringAsync(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeave = () => {
    Alert.alert(
      'Leave Circle',
      `Are you sure you want to leave "${circleData?.name ?? 'this circle'}"? You'll need a new invite code to rejoin.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            setLeaving(true);
            try {
              await leaveCircle();
            } catch (e) {
              const msg = e instanceof Error ? e.message : 'Failed to leave circle.';
              Alert.alert('Error', msg);
            } finally {
              setLeaving(false);
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.hasCircleContainer}>
      {/* Share Card */}
      <View style={styles.shareCard}>
        <View style={styles.shareCardTopRow}>
          <View style={styles.circleIconWrap}>
            <Text style={styles.circleIconEmoji}>👥</Text>
          </View>
          <View style={styles.shareCardText}>
            <Text style={styles.shareCardLabel}>CIRCLE</Text>
            <Text style={styles.shareCardName}>{circleData?.name ?? 'My Circle'}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <Text style={styles.codeLabel}>INVITE CODE</Text>
        <View style={styles.codeRow}>
          <Text style={styles.codeDisplay}>{inviteCode ?? '------'}</Text>
          <TouchableOpacity
            style={[styles.copyButton, copied && styles.copyButtonCopied]}
            onPress={handleCopy}
            activeOpacity={0.8}
          >
            <Text style={[styles.copyButtonText, copied && styles.copyButtonTextCopied]}>
              {copied ? '✓ Copied!' : 'Copy'}
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.codeHint}>Share this code to invite others to your circle</Text>
      </View>

      {/* Members list */}
      <View style={styles.membersSection}>
        <View style={styles.membersSectionHeader}>
          <Text style={styles.membersSectionTitle}>Members</Text>
          <View style={styles.memberCount}>
            <Text style={styles.memberCountText}>{members.length}</Text>
          </View>
        </View>

        {isLoading && members.length === 0 ? (
          <ActivityIndicator color="#3B82F6" style={{ marginTop: 24 }} />
        ) : members.length === 0 ? (
          <Text style={styles.noMembersText}>No members yet.</Text>
        ) : (
          <View style={styles.membersList}>
            {members.map((m) => (
              <MemberRow key={m.uid} profile={m} />
            ))}
          </View>
        )}
      </View>

      {/* Leave */}
      <TouchableOpacity
        style={[styles.leaveButton, (leaving || isLoading) && styles.buttonDisabled]}
        onPress={handleLeave}
        disabled={leaving || isLoading}
        activeOpacity={0.8}
      >
        {leaving ? (
          <ActivityIndicator color="#F87171" />
        ) : (
          <Text style={styles.leaveButtonText}>Leave Circle</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────────

export default function CircleScreen() {
  const { circleId, isLoading } = useCircle();

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Circle</Text>
        <View style={styles.headerSpacer} />
      </View>

      {isLoading && !circleId ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading your circle…</Text>
        </View>
      ) : circleId ? (
        <HasCircleView />
      ) : (
        <NoCircleView />
      )}
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0F172A' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#64748B', fontSize: 14 },

  // ── Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 16 : 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: { color: '#94A3B8', fontSize: 18, fontWeight: '600' },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: '#F1F5F9',
    letterSpacing: 0.2,
  },
  headerSpacer: { width: 36 },

  // ── No-Circle
  noCircleContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
  },
  heroSection: { alignItems: 'center', marginBottom: 32 },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  heroEmoji: { fontSize: 36 },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#F1F5F9',
    marginBottom: 10,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
  },

  errorBox: {
    backgroundColor: '#450A0A',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: '#FCA5A5', fontSize: 13, lineHeight: 18 },

  card: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  cardHeaderIcon: { fontSize: 18 },
  cardHeaderTitle: { fontSize: 16, fontWeight: '700', color: '#F1F5F9' },
  cardDescription: { fontSize: 13, color: '#64748B', lineHeight: 20, marginBottom: 16 },

  primaryButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },

  orRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 8, gap: 12 },
  orLine: { flex: 1, height: 1, backgroundColor: '#1E293B' },
  orText: { color: '#475569', fontSize: 13, fontWeight: '600' },

  codeInput: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    color: '#F1F5F9',
    letterSpacing: 4,
    textAlign: 'center',
    fontWeight: '700',
    marginBottom: 14,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#6366F1',
  },
  secondaryButtonText: { color: '#6366F1', fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },

  buttonDisabled: { opacity: 0.45 },

  // ── Has-Circle
  hasCircleContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },

  shareCard: {
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 24,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 10,
  },
  shareCardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
  circleIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleIconEmoji: { fontSize: 26 },
  shareCardText: { flex: 1 },
  shareCardLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  shareCardName: { fontSize: 20, fontWeight: '800', color: '#F1F5F9' },

  divider: { height: 1, backgroundColor: '#334155', marginBottom: 20 },

  codeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  codeDisplay: {
    flex: 1,
    fontSize: 28,
    fontWeight: '800',
    color: '#3B82F6',
    letterSpacing: 6,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  copyButton: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  copyButtonCopied: {
    borderColor: '#22C55E',
    backgroundColor: '#052e16',
  },
  copyButtonText: { color: '#94A3B8', fontSize: 13, fontWeight: '600' },
  copyButtonTextCopied: { color: '#22C55E' },
  codeHint: { fontSize: 12, color: '#475569', lineHeight: 18 },

  // ── Members
  membersSection: { marginBottom: 24 },
  membersSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  membersSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  memberCount: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#334155',
  },
  memberCountText: { color: '#94A3B8', fontSize: 12, fontWeight: '700' },
  noMembersText: { color: '#475569', fontSize: 14, textAlign: 'center', paddingVertical: 24 },

  membersList: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#0F172A',
    gap: 12,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberAvatarText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 15, fontWeight: '600', color: '#F1F5F9', marginBottom: 2 },
  memberEmail: { fontSize: 12, color: '#64748B' },
  memberBadge: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#334155',
  },
  memberBadgeText: { color: '#475569', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },

  // ── Leave button
  leaveButton: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#EF4444',
    backgroundColor: '#1A0A0A',
  },
  leaveButtonText: { color: '#F87171', fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },
});
