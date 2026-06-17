import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ToastProvider } from './contexts/ToastContext';
import { CartProvider } from './contexts/CartContext';
import { AuthProvider } from './contexts/AuthContext';
import { FavoritesProvider } from './contexts/FavoritesContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import CatalogPage from './pages/CatalogPage';
import ProductPage from './pages/ProductPage';
import CartPage from './pages/CartPage';
import RequestPage from './pages/RequestPage';
import FavoritesPage from './pages/FavoritesPage';
import AccountPage from './pages/AccountPage';
import AccountAuth from './pages/AccountAuth';
import AdminPage from './pages/AdminPage';
import AdminLogin from './pages/AdminLogin';
import ContactsPage from './pages/ContactsPage';
import AboutPage from './pages/AboutPage';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <CartProvider>
          <FavoritesProvider>
            <Layout>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/catalog" element={<CatalogPage />} />
                <Route path="/catalog/:slug" element={<ProductPage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/request" element={<RequestPage />} />
                <Route path="/favorites" element={<FavoritesPage />} />
                <Route path="/account" element={
                  <ProtectedRoute fallback={<AccountAuth />}>
                    <AccountPage />
                  </ProtectedRoute>
                } />
                <Route path="/admin" element={
                  <ProtectedRoute requireAdmin fallback={<AdminLogin />}>
                    <AdminPage />
                  </ProtectedRoute>
                } />
                <Route path="/contacts" element={<ContactsPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="*" element={
                  <div className="container" style={{ textAlign: 'center', padding: '80px 24px' }}>
                    <h1 style={{ fontSize: '3rem', marginBottom: 16 }}>404</h1>
                    <p className="text-muted" style={{ marginBottom: 24 }}>Страница не найдена</p>
                    <a href="/" className="btn btn--primary">На главную</a>
                  </div>
                } />
              </Routes>
            </Layout>
          </FavoritesProvider>
        </CartProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
