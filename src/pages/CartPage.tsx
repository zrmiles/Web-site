import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useToast } from '../contexts/ToastContext';
import { CartIcon, XIcon } from '../components/Icons';

const PLACEHOLDER = '/assets/placeholder.svg';

export default function CartPage() {
  const { items, updateItem, removeItem } = useCart();
  const { showToast } = useToast();

  if (items.length === 0) {
    return (
      <div className="container">
        <div className="page-hero"><h1 className="page-hero__title">Корзина</h1></div>
        <div className="catalog-empty">
          <div className="catalog-empty__icon"><CartIcon /></div>
          <div className="catalog-empty__title">Корзина пуста</div>
          <p className="catalog-empty__text">Добавьте товары из каталога</p>
          <Link to="/catalog" className="btn btn--primary btn--lg">Перейти в каталог</Link>
        </div>
      </div>
    );
  }

  const handleMinus = (idx: number) => {
    if (items[idx].qty <= 1) {
      removeItem(idx);
      showToast('Товар удалён из корзины', 'info');
    } else {
      updateItem(idx, items[idx].qty - 1);
    }
  };

  const handlePlus = (idx: number) => {
    updateItem(idx, items[idx].qty + 1);
  };

  const handleRemove = (idx: number) => {
    removeItem(idx);
    showToast('Товар удалён из корзины', 'info');
  };

  return (
    <div className="container">
      <div className="page-hero"><h1 className="page-hero__title">Корзина</h1></div>
      <div className="cart-list">
        {items.map((item, idx) => {
          const opts: string[] = [];
          if (item.selectedOptions.color) opts.push(item.selectedOptions.color);
          if (item.selectedOptions.size) opts.push(item.selectedOptions.size);
          return (
            <div className="cart-item" key={`${item.id}-${item.selectedOptions.color}-${item.selectedOptions.size}`}>
              <img
                className="cart-item__img"
                src={item.image || PLACEHOLDER}
                alt={item.title}
                onError={e => { (e.target as HTMLImageElement).src = PLACEHOLDER; }}
              />
              <div className="cart-item__info">
                <div className="cart-item__title">{item.title}</div>
                {opts.length > 0 && <div className="cart-item__options">{opts.join(' · ')}</div>}
              </div>
              <div className="cart-item__qty">
                <button className="cart-item__qty-btn" onClick={() => handleMinus(idx)}>−</button>
                <span className="cart-item__qty-value">{item.qty}</span>
                <button className="cart-item__qty-btn" onClick={() => handlePlus(idx)}>+</button>
              </div>
              <button className="cart-item__remove" onClick={() => handleRemove(idx)} title="Удалить" aria-label="Удалить товар"><XIcon /></button>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 'var(--space-8)', textAlign: 'center' }}>
        <Link to="/request" className="btn btn--primary btn--lg">Оформить заявку</Link>
      </div>
    </div>
  );
}
