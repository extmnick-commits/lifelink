/**
 * circleService.ts
 * All Firebase Realtime Database operations for Circle management.
 * Uses the modular Firebase SDK (@firebase/database).
 */

import { database } from '@/config/firebase';
import {
  ref,
  get,
  set,
  update,
  push,
  onValue,
  type Unsubscribe,
} from '@firebase/database';
import type { UserProfile, CircleData } from '@/types/circle';

// ── Constants ────────────────────────────────────────────────────────────────

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const CODE_LENGTH = 6;
const MAX_RETRIES = 10;

// ── 1. generateUniqueInviteCode ──────────────────────────────────────────────

/**
 * Generates a random 6-character uppercase alphanumeric invite code
 * and verifies it doesn't already exist under /inviteCodes.
 * Retries up to MAX_RETRIES times on collision.
 */
export async function generateUniqueInviteCode(): Promise<string> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const code = Array.from({ length: CODE_LENGTH }, () =>
      CHARS[Math.floor(Math.random() * CHARS.length)],
    ).join('');

    const snapshot = await get(ref(database, `inviteCodes/${code}`));
    if (!snapshot.exists()) {
      return code;
    }
  }
  throw new Error('Failed to generate a unique invite code. Please try again.');
}

// ── 2. createCircle ──────────────────────────────────────────────────────────

/**
 * Creates a new circle for the given user.
 * Performs a single atomic multi-path update:
 *   /circles/{circleId}       → full circle data
 *   /inviteCodes/{code}       → { circleId, createdAt }
 *   /users/{userId}/circleId  → circleId
 */
export async function createCircle(
  userId: string,
  circleName = 'My Circle',
): Promise<CircleData> {
  // Generate a new push key for the circle
  const circleRef = push(ref(database, 'circles'));
  const circleId = circleRef.key!;

  const inviteCode = await generateUniqueInviteCode();
  const now = Date.now();

  const circleData: Omit<CircleData, 'circleId'> = {
    name: circleName,
    createdBy: userId,
    createdAt: now,
    members: { [userId]: true },
    inviteCode,
  };

  // Atomic multi-path update
  await update(ref(database), {
    [`circles/${circleId}`]: circleData,
    [`inviteCodes/${inviteCode}`]: { circleId, createdAt: now },
    [`users/${userId}/circleId`]: circleId,
  });

  return { circleId, ...circleData };
}

// ── 3. joinCircleWithCode ────────────────────────────────────────────────────

/**
 * Joins an existing circle using a 6-character invite code.
 * Validates the code, checks the user isn't already in a circle,
 * then atomically adds the user to the circle.
 */
export async function joinCircleWithCode(
  userId: string,
  code: string,
): Promise<CircleData> {
  const trimmedCode = code.trim().toUpperCase();

  // Validate code
  const codeSnapshot = await get(ref(database, `inviteCodes/${trimmedCode}`));
  if (!codeSnapshot.exists()) {
    throw new Error('Invalid invite code. Please check and try again.');
  }

  const { circleId } = codeSnapshot.val() as { circleId: string; createdAt: number };

  // Check if user already has a circle
  const userCircleSnapshot = await get(ref(database, `users/${userId}/circleId`));
  if (userCircleSnapshot.exists()) {
    const existingCircleId = userCircleSnapshot.val() as string;
    if (existingCircleId === circleId) {
      throw new Error("You're already a member of this circle.");
    }
    throw new Error(
      "You're already in a circle. Leave your current circle before joining a new one.",
    );
  }

  // Fetch circle data for return value
  const circleSnapshot = await get(ref(database, `circles/${circleId}`));
  if (!circleSnapshot.exists()) {
    throw new Error('This circle no longer exists.');
  }

  // Atomic update: add user to circle members + set their circleId
  await update(ref(database), {
    [`circles/${circleId}/members/${userId}`]: true,
    [`users/${userId}/circleId`]: circleId,
  });

  const circleVal = circleSnapshot.val() as Omit<CircleData, 'circleId'>;
  return {
    circleId,
    ...circleVal,
    members: { ...circleVal.members, [userId]: true },
  };
}

// ── 4. leaveCircle ───────────────────────────────────────────────────────────

/**
 * Removes the user from a circle.
 * Atomically clears /users/{userId}/circleId and removes them from /circles/{circleId}/members.
 */
export async function leaveCircle(
  userId: string,
  circleId: string,
): Promise<void> {
  await update(ref(database), {
    [`circles/${circleId}/members/${userId}`]: null,
    [`users/${userId}/circleId`]: null,
  });
}

// ── 5. fetchCircleData ───────────────────────────────────────────────────────

/**
 * One-time fetch of a circle's full data.
 */
export async function fetchCircleData(circleId: string): Promise<CircleData | null> {
  const snapshot = await get(ref(database, `circles/${circleId}`));
  if (!snapshot.exists()) return null;
  return { circleId, ...(snapshot.val() as Omit<CircleData, 'circleId'>) };
}

// ── 6. subscribeToCircleMembers ──────────────────────────────────────────────

/**
 * Attaches a real-time listener to /circles/{circleId}/members.
 * For each member UID, fetches /users/{uid} and passes the full
 * UserProfile[] array to the callback.
 *
 * Returns an unsubscribe function.
 */
export function subscribeToCircleMembers(
  circleId: string,
  callback: (members: UserProfile[]) => void,
): Unsubscribe {
  const membersRef = ref(database, `circles/${circleId}/members`);

  const unsubscribe = onValue(membersRef, async (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }

    const memberMap = snapshot.val() as Record<string, boolean>;
    const uids = Object.keys(memberMap).filter((uid) => memberMap[uid]);

    try {
      const profilePromises = uids.map(async (uid) => {
        const profileSnap = await get(ref(database, `users/${uid}`));
        if (!profileSnap.exists()) return null;
        return profileSnap.val() as UserProfile;
      });

      const profiles = (await Promise.all(profilePromises)).filter(
        (p): p is UserProfile => p !== null,
      );

      callback(profiles);
    } catch {
      // Silently fail — stale data is better than a crash
      callback([]);
    }
  });

  return unsubscribe;
}

// ── 7. fetchUserCircleId ─────────────────────────────────────────────────────

/**
 * One-time fetch of the user's current circleId from /users/{uid}/circleId.
 */
export async function fetchUserCircleId(userId: string): Promise<string | null> {
  const snapshot = await get(ref(database, `users/${userId}/circleId`));
  return snapshot.exists() ? (snapshot.val() as string) : null;
}
