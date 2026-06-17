import React from 'react';
import { Link } from 'react-router-dom';
import { BoxIcon } from './Icons';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__inner">
          <div>
            <div className="footer__brand-name"><span className="brand-mark"><BoxIcon /></span> ПакСтор</div>
            <p className="footer__brand-desc">Упаковочная продукция для бизнеса и частных клиентов. Коробки, плёнки, пакеты, расходные материалы — всё для надёжной упаковки.</p>
          </div>
          <div>
            <div className="footer__heading">Навигация</div>
            <div className="footer__links">
              <Link to="/">Главная</Link>
              <Link to="/catalog">Каталог</Link>
              <Link to="/about">О компании</Link>
              <Link to="/contacts">Контакты</Link>
              <Link to="/account">Личный кабинет</Link>
            </div>
          </div>
          <div>
            <div className="footer__heading">Контакты</div>
            <div className="footer__links">
              <a href="tel:+78001234567">+7 (800) 123-45-67</a>
              <a href="mailto:info@pakstore.ru">info@pakstore.ru</a>
              <span className="footer__schedule">Пн–Пт: 9:00–18:00</span>
            </div>
          </div>
        </div>
        <div className="footer__bottom">© 2024–{year} ПакСтор. Все права защищены.</div>
      </div>
    </footer>
  );
}
