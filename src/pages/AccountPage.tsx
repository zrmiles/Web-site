import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiGetMyOrders, ApiOrder } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useToast } from '../contexts/ToastContext';
import Drawer from '../components/Drawer';
import { ShieldIcon } from '../components/Icons';
import { formatDate } from '../utils/format';

function statusBadge(status: string) {
  const map: Record<string, string> = { 'Новая': 'badge--new', 'В работе': 'badge--progress', 'Закрыта': 'badge--closed' };
  return <span className={`badge ${map[status] || ''}`}>{status}</span>;
}

// Rendered only for authenticated users (gated by ProtectedRoute -> AccountAuth fallback).
export default function AccountPage() {
  const { user, logout } = useAuth();
  const { addItem, clear: clearCart } = useCart();
  const { showToast } = useToast();

  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ApiOrder | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiGetMyOrders()
      .then(found => { if (!cancelled) setOrders(found); })
      .catch(() => { if (!cancelled) setOrders([]); });
    return () => { cancelled = true; };
  }, []);

  // ProtectedRoute guarantees user is present, but keep TS happy.
  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    showToast('Вы вышли из аккаунта', 'info');
  };

  const handleDetail = (order: ApiOrder) => { setSelectedOrder(order); setDrawerOpen(true); };

  const handleRepeat = (order: ApiOrder) => {
    clearCart();
    order.items.forEach(item => {
      for (let i = 0; i < item.qty; i++) {
        addItem({ id: item.productId, title: item.title, images: [] }, { color: item.selectedOptions?.color || '', size: item.selectedOptions?.size || '' });
      }
    });
    showToast('Товары из заявки добавлены в корзину', 'success');
  };

  return (
    <div className="container">
      <div className="page-hero"><h1 className="page-hero__title">Личный кабинет</h1></div>
      <div className="account-profile">
        <div className="account-profile__header">
          <div>
            <div className="account-profile__phone">{user.name}</div>
            <div className="text-muted account-profile__meta">
              @{user.login} · {user.phone} · Заявок: {orders.length}
              {user.role === 'admin' && <span className="account-profile__admin"><ShieldIcon /> Админ</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {user.role === 'admin' && <Link to="/admin" className="btn btn--secondary">Админ-панель</Link>}
            <button className="btn btn--outline" onClick={handleLogout}>Выйти</button>
          </div>
        </div>
        <h2 className="section__title">История заявок</h2>
        {orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <p className="text-muted">У вас пока нет заявок</p>
            <Link to="/catalog" className="btn btn--primary" style={{ marginTop: 16 }}>Перейти в каталог</Link>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map(order => (
              <div className="order-card" key={order.id}>
                <div className="order-card__header">
                  <div><span className="order-card__id">{order.id}</span> {statusBadge(order.status)}</div>
                  <span className="order-card__date">{formatDate(order.createdAt)}</span>
                </div>
                <div className="order-card__items">{order.items.map(i => `${i.title} × ${i.qty}`).join(', ')}</div>
                <div className="order-card__actions">
                  <button className="btn btn--outline btn--sm" onClick={() => handleDetail(order)}>Подробнее</button>
                  <button className="btn btn--secondary btn--sm" onClick={() => handleRepeat(order)}>Повторить заказ</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Drawer open={drawerOpen} title={selectedOrder ? `Заявка ${selectedOrder.id}` : ''} onClose={() => setDrawerOpen(false)}>
        {selectedOrder && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div><strong>ID:</strong> <span style={{ fontFamily: 'monospace' }}>{selectedOrder.id}</span></div>
            <div><strong>Дата:</strong> {formatDate(selectedOrder.createdAt)}</div>
            <div><strong>Статус:</strong> {statusBadge(selectedOrder.status)}</div>
            <div><strong>Имя:</strong> {selectedOrder.user.name}</div>
            <div><strong>Телефон:</strong> {selectedOrder.user.phone}</div>
            {selectedOrder.user.email && <div><strong>Email:</strong> {selectedOrder.user.email}</div>}
            <div><strong>Способ связи:</strong> {selectedOrder.user.contactMethod}</div>
            {selectedOrder.comment && <div><strong>Комментарий:</strong> {selectedOrder.comment}</div>}
            <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)' }} />
            <div><strong>Товары:</strong></div>
            {selectedOrder.items.map((item, idx) => (
              <div key={idx} style={{ padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
                <div>{item.title} × {item.qty}</div>
                {item.selectedOptions?.color && <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-muted)' }}>Цвет: {item.selectedOptions.color}</div>}
                {item.selectedOptions?.size && <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-muted)' }}>Размер: {item.selectedOptions.size}</div>}
              </div>
            ))}
          </div>
        )}
      </Drawer>
    </div>
  );
}
