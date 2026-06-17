import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { apiAddFavorite, apiRemoveFavorite, apiMergeFavorites } from '../api';
import { useAuth } from './AuthContext';

const FAV_KEY = 'pack_store_favorites';

function readLocal(): number[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((n): n is number => Number.isInteger(n)) : [];
  } catch {
    return [];
  }
}

function writeLocal(ids: number[]) {
  localStorage.setItem(FAV_KEY, JSON.stringify(ids));
}

interface FavoritesContextValue {
  ids: number[];
  isFavorite: (id: number) => boolean;
  toggle: (id: number) => boolean; // returns the new state (true = now favorite)
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const [ids, setIds] = useState<number[]>(() => readLocal());
  const lastUserId = useRef<number | null>(null);

  // Keep a localStorage mirror so guests (and first paint) stay instant.
  useEffect(() => { writeLocal(ids); }, [ids]);

  // On login, merge the guest's local favorites into the account and adopt the union.
  useEffect(() => {
    if (loading) return;
    if (user && user.id !== lastUserId.current) {
      lastUserId.current = user.id;
      apiMergeFavorites(readLocal())
        .then(setIds)
        .catch(() => {/* keep local set on failure */});
    } else if (!user) {
      lastUserId.current = null;
    }
  }, [user, loading]);

  const isFavorite = useCallback((id: number) => ids.includes(id), [ids]);

  const toggle = useCallback((id: number) => {
    const willAdd = !ids.includes(id);
    setIds(prev => (willAdd ? [...prev, id] : prev.filter(x => x !== id)));
    if (user) {
      const request = willAdd ? apiAddFavorite(id) : apiRemoveFavorite(id);
      request.catch(() => {/* localStorage mirror already updated; best-effort sync */});
    }
    return willAdd;
  }, [ids, user]);

  return (
    <FavoritesContext.Provider value={{ ids, isFavorite, toggle }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
  return ctx;
}
