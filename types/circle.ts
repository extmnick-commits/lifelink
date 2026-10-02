// Shared TypeScript types for the Circle feature

export type UserProfile = {
  uid: string;
  displayName: string;
  email: string;
  createdAt: string;
  circleId?: string;
};

export type CircleData = {
  circleId: string;
  name: string;
  createdBy: string;
  createdAt: number;
  members: Record<string, true>;
  inviteCode: string;
};
