/**
 * CircleContext.tsx
 * React context providing Circle state and operations to the entire app tree.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  fetchUserCircleId,
  fetchCircleData,
  createCircle as svcCreateCircle,
  joinCircleWithCode as svcJoinCircle,
  leaveCircle as svcLeaveCircle,
  subscribeToCircleMembers,
} from '@/services/circleService';
import type { CircleData, UserProfile } from '@/types/circle';

// ── Types ─────────────────────────────────────────────────────────────────────

type CircleContextValue = {
  /** The current user's circleId, or null if they're not in a circle. */
  circleId: string | null;
  /** Full circle data (name, inviteCode, etc.) */
  circleData: CircleData | null;
  /** Shorthand for circleData.inviteCode */
  inviteCode: string | null;
  /** Real-time list of circle members with their profiles */
  members: UserProfile[];
  /** True while any async circle operation is in progress */
  isLoading: boolean;
  /** Creates a new circle for the current user */
  createCircle: (name?: string) => Promise<void>;
  /** Joins an existing circle using a 6-character invite code */
  joinCircle: (code: string) => Promise<void>;
  /** Removes the current user from their circle */
  leaveCircle: () => Promise<void>;
};

// ── Context ───────────────────────────────────────────────────────────────────

const CircleContext = createContext<CircleContextValue | undefined>(undefined);

// ── Provider ──────────────────────────────────────────────────────────────────

export function CircleProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const [circleId, setCircleId] = useState<string | null>(null);
  const [circleData, setCircleData] = useState<CircleData | null>(null);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Keep a ref to the active member-list unsubscribe function
  const membersUnsubRef = useRef<(() => void) | null>(null);

  // ── Helper: attach / detach member listener ─────────────────────────────
  const attachMemberListener = useCallback((cid: string) => {
    // Detach any previous listener first
    membersUnsubRef.current?.();
    const unsub = subscribeToCircleMembers(cid, (updatedMembers) => {
      setMembers(updatedMembers);
    });
    membersUnsubRef.current = unsub;
  }, []);

  const detachMemberListener = useCallback(() => {
    membersUnsubRef.current?.();
    membersUnsubRef.current = null;
    setMembers([]);
  }, []);

  // ── Bootstrap: load circle state when user changes ─────────────────────
  useEffect(() => {
    if (!user) {
      // User signed out — clear everything
      detachMemberListener();
      setCircleId(null);
      setCircleData(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function bootstrap() {
      setIsLoading(true);
      try {
        const cid = await fetchUserCircleId(user!.uid);
        if (cancelled) return;

        if (!cid) {
          setCircleId(null);
          setCircleData(null);
          detachMemberListener();
        } else {
          const data = await fetchCircleData(cid);
          if (cancelled) return;
          setCircleId(cid);
          setCircleData(data);
          if (data) attachMemberListener(cid);
        }
      } catch (err) {
        console.error('[CircleContext] bootstrap error:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [user, attachMemberListener, detachMemberListener]);

  // ── Cleanup member listener on unmount ─────────────────────────────────
  useEffect(() => {
    return () => {
      membersUnsubRef.current?.();
    };
  }, []);

  // ── Actions ────────────────────────────────────────────────────────────────

  const createCircle = useCallback(
    async (name?: string) => {
      if (!user) throw new Error('You must be signed in to create a circle.');
      console.log('[CircleContext] createCircle called for user:', user.uid);
      const data = await svcCreateCircle(user.uid, name);
      console.log('[CircleContext] svcCreateCircle completed:', data.circleId);
      setCircleId(data.circleId);
      setCircleData(data);
      attachMemberListener(data.circleId);
    },
    [user, attachMemberListener],
  );

  const joinCircle = useCallback(
    async (code: string) => {
      if (!user) throw new Error('You must be signed in to join a circle.');
      console.log('[CircleContext] joinCircle called with code:', code);
      const data = await svcJoinCircle(user.uid, code);
      console.log('[CircleContext] svcJoinCircle completed:', data.circleId);
      setCircleId(data.circleId);
      setCircleData(data);
      attachMemberListener(data.circleId);
    },
    [user, attachMemberListener],
  );

  const leaveCircle = useCallback(async () => {
    if (!user || !circleId) throw new Error('You are not in a circle.');
    console.log('[CircleContext] leaveCircle called for circleId:', circleId);
    await svcLeaveCircle(user.uid, circleId);
    detachMemberListener();
    setCircleId(null);
    setCircleData(null);
  }, [user, circleId, detachMemberListener]);

  // ── Value ──────────────────────────────────────────────────────────────────

  const value: CircleContextValue = {
    circleId,
    circleData,
    inviteCode: circleData?.inviteCode ?? null,
    members,
    isLoading,
    createCircle,
    joinCircle,
    leaveCircle,
  };

  return <CircleContext.Provider value={value}>{children}</CircleContext.Provider>;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useCircle(): CircleContextValue {
  const ctx = useContext(CircleContext);
  if (!ctx) {
    throw new Error('useCircle must be used within a CircleProvider');
  }
  return ctx;
}
