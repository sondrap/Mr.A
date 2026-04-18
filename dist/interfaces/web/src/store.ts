import { create } from 'zustand';
import { auth } from './api';
import type { CurrentUser } from './api';

// Global session store. Loaded once on app start; updated on auth transitions and focused
// mutations. Using a single store keeps navigation instant (no SWR).

interface SessionState {
  user: CurrentUser | null;
  isLoading: boolean;
  hasLoaded: boolean;

  // Source side panel — global overlay triggered from any citation chip
  openSourceId: string | null;
  openSource: (sourceId: string) => void;
  closeSource: () => void;

  // Persistent toast/error (simple one-slot)
  toast: { kind: 'info' | 'error' | 'success'; message: string } | null;
  showToast: (kind: 'info' | 'error' | 'success', message: string) => void;
  dismissToast: () => void;

  setUser: (user: CurrentUser | null) => void;
  setLoaded: () => void;
}

export const useSession = create<SessionState>((set) => ({
  user: null,
  isLoading: true,
  hasLoaded: false,

  openSourceId: null,
  openSource: (sourceId: string) => set({ openSourceId: sourceId }),
  closeSource: () => set({ openSourceId: null }),

  toast: null,
  showToast: (kind, message) => {
    set({ toast: { kind, message } });
    setTimeout(() => {
      set((prev) => (prev.toast?.message === message ? { toast: null } : prev));
    }, 4000);
  },
  dismissToast: () => set({ toast: null }),

  setUser: (user) => set({ user, isLoading: false, hasLoaded: true }),
  setLoaded: () => set({ isLoading: false, hasLoaded: true }),
}));

// Wire up auth state changes to session store. Run once on app start.
let authSubscribed = false;
export function initAuthListener() {
  if (authSubscribed) return;
  authSubscribed = true;
  auth.onAuthStateChanged((platformUser) => {
    if (!platformUser) {
      useSession.setState({ user: null, isLoading: false, hasLoaded: true });
    }
    // For authenticated users, we rely on getCurrentUser() calls for our richer user shape.
  });
}
