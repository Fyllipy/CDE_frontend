import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { setAuthToken } from '../api/client';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
};

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  setAuth: (data: { token: string; user: AuthUser }) => void;
  setUser: (user: AuthUser | null) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: ({ token, user }) => {
        set({ token, user });
        setAuthToken(token);
      },
      setUser: (user) => set((state) => {
        if (user) {
          return { ...state, user };
        }
        return { ...state, user: null };
      }),
      clearAuth: () => {
        set({ token: null, user: null });
        setAuthToken(null);
      }
    }),
    {
      name: 'cde-auth',
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          setAuthToken(state.token);
        }
      }
    }
  )
);

export function getAuthTokenFromStore(): string | null {
  return useAuthStore.getState().token;
}
