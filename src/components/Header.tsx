import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { BoxIcon, CartIcon, UserIcon } from './Icons';

const NAV_LINKS = [
  { to: '/', label: 'Главная' },
  { to: '/catalog', label: 'Каталог' },
  { to: '/favorites', label: 'Избранное' },
  { to: '/contacts', label: 'Контакты' },
];

export default function Header() {
  const { count } = useCart();
  const { isLoggedIn: logged, user } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => setMenuOpen(v => !v);
  const closeMenu = () => setMenuOpen(false);

  const userName = user?.name || '';

  return (
    <>
      <header className="header">
        <div className="container header__inner">
          <Link to="/" className="header__logo" onClick={closeMenu}>
            <span className="brand-mark"><BoxIcon /></span>
            <span>ПакСтор</span>
          </Link>
          <nav className="header__nav">
            {NAV_LINKS.map(l => (
              <Link key={l.to} to={l.to} className={location.pathname === l.to ? 'active' : ''}>{l.label}</Link>
            ))}
            <Link to="/account" className={location.pathname === '/account' ? 'active' : ''}>
              {logged ? <><UserIcon className="nav-icon" /> {userName}</> : 'Войти'}
            </Link>
          </nav>
          <div className="header__actions">
            <Link to="/cart" className="header__cart-btn" onClick={closeMenu} aria-label="Корзина">
              <CartIcon />
              {count > 0 && <span className="header__cart-badge">{count}</span>}
            </Link>
            <button className={`header__burger${menuOpen ? ' is-open' : ''}`} onClick={toggleMenu} aria-label="Меню" aria-expanded={menuOpen}>
              <span /><span /><span />
            </button>
          </div>
        </div>
      </header>
      <div className={`mobile-menu${menuOpen ? ' is-open' : ''}`}>
        {NAV_LINKS.map(l => (
          <Link key={l.to} to={l.to} onClick={closeMenu}>{l.label}</Link>
        ))}
        <Link to="/account" onClick={closeMenu}>
          {logged ? userName : 'Войти'}
        </Link>
        <Link to="/cart" onClick={closeMenu}>Корзина {count > 0 && `(${count})`}</Link>
      </div>
    </>
  );
}
