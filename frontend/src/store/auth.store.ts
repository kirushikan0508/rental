/**
 * @file frontend/src/store/auth.store.ts
 * @description Zustand store for authentication state.
 */

import { create } from 'zustand';
import { AuthState, UserProfile } from '../types';

interface AuthActions {
  setUser: (user: UserProfile, accessToken: string) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  accessToken: null,

  setUser: (user, accessToken) =>
    set({ user, accessToken, isAuthenticated: true, isLoading: false }),

  logout: () => {
    if (typeof window !== 'undefined') localStorage.removeItem('accessToken');
    set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false });
  },

  setLoading: (isLoading) => set({ isLoading }),
}));
