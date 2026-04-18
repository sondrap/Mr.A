import { db } from '@mindstudio-ai/agent';

// Auth-managed table. The platform owns email + roles columns; we own the rest.
interface User {
  // Platform-managed (read-only from code except roles)
  email: string;
  roles: string[];

  // Profile fields we own
  displayName?: string;
  avatarUrl?: string;

  // First-signup onboarding state
  onboardedAt?: number | null;

  // Student preference: opt out of in-chat offering recommendations
  recommendationsOptOut?: boolean;
}

export const Users = db.defineTable<User>('users', {
  defaults: {
    recommendationsOptOut: false,
  },
});
