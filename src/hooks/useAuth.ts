import { useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { fetchCurrentUser, login as loginRequest, register as registerRequest } from '../api/auth';
import type { ApiUser } from '../types/api';

export function useAuth() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const setAuth = useAuthStore((state) => state.setAuth);
  const setUser = useAuthStore((state) => state.setUser);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const login = useCallback(async (email: string, password: string) => {
    const auth = await loginRequest({ email, password });
    setAuth(auth);
    return auth.user;
  }, [setAuth]);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const auth = await registerRequest({ name, email, password });
    setAuth(auth);
    return auth.user;
  }, [setAuth]);

  const refreshUser = useCallback(async (): Promise<ApiUser | null> => {
    if (!token) {
      return null;
    }
    try {
      const fresh = await fetchCurrentUser();
      setUser(fresh);
      return fresh;
    } catch (error) {
      clearAuth();
      return null;
    }
  }, [token, setUser, clearAuth]);

  return {
    token,
    user,
    login,
    register,
    logout: clearAuth,
    refreshUser
  };
}
