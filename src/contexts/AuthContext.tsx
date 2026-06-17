import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { apiLogin, apiRegister, apiGetMe, apiLogout, type ApiUser } from '../api';

interface AuthContextValue {
  user: ApiUser | null;
  loading: boolean;
  isLoggedIn: boolean;
  isAdmin: boolean;
  login: (login: string, password: string) => Promise<ApiUser>;
  register: (login: string, password: string, name: string, phone: string) => Promise<ApiUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);

  // The httpOnly cookie is the single source of truth — restore session from it on load.
  const refresh = useCallback(async () => {
    try {
      const me = await apiGetMe();
      setUser(me);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const login = useCallback(async (loginVal: string, password: string) => {
    const u = await apiLogin(loginVal, password);
    setUser(u);
    return u;
  }, []);

  const register = useCallback(async (loginVal: string, password: string, name: string, phone: string) => {
    const u = await apiRegister(loginVal, password, name, phone);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    await apiLogout().catch(() => {});
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isLoggedIn: user !== null,
      isAdmin: user?.role === 'admin',
      login,
      register,
      logout,
      refresh,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
