import React, { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  children: ReactNode;
  /** When true, also require the admin role. */
  requireAdmin?: boolean;
  /** Rendered when the auth check fails (e.g. an inline login form). */
  fallback: ReactNode;
}

/**
 * Gates a route on auth state. The server enforces real authorization on every
 * request — this only keeps the UI honest and avoids flashing protected content.
 */
export default function ProtectedRoute({ children, requireAdmin = false, fallback }: Props) {
  const { loading, isLoggedIn, isAdmin } = useAuth();

  if (loading) {
    return <div className="container" style={{ padding: '80px 24px', textAlign: 'center' }}><p className="text-muted">Загрузка...</p></div>;
  }

  const allowed = isLoggedIn && (!requireAdmin || isAdmin);
  return <>{allowed ? children : fallback}</>;
}
