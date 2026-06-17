import React from 'react';
import { ClockIcon, MailIcon, MapPinIcon, PhoneIcon } from '../components/Icons';

export default function ContactsPage() {
  return (
    <div className="container">
      <div className="page-hero">
        <h1 className="page-hero__title">Контакты</h1>
        <p className="page-hero__subtitle">Свяжитесь с нами любым удобным способом</p>
      </div>
      <div className="content-section">
        <div className="contacts-grid">
          <div className="contact-card">
            <div className="contact-card__icon"><PhoneIcon /></div>
            <div className="contact-card__label">Телефон</div>
            <div className="contact-card__value"><a href="tel:+78001234567">+7 (800) 123-45-67</a></div>
          </div>
          <div className="contact-card">
            <div className="contact-card__icon"><MailIcon /></div>
            <div className="contact-card__label">Email</div>
            <div className="contact-card__value"><a href="mailto:info@pakstore.ru">info@pakstore.ru</a></div>
          </div>
          <div className="contact-card">
            <div className="contact-card__icon"><MapPinIcon /></div>
            <div className="contact-card__label">Адрес</div>
            <div className="contact-card__value">г. Москва, ул. Складская, д. 15</div>
          </div>
          <div className="contact-card">
            <div className="contact-card__icon"><ClockIcon /></div>
            <div className="contact-card__label">Режим работы</div>
            <div className="contact-card__value">Пн–Пт: 9:00–18:00</div>
          </div>
        </div>
      </div>
    </div>
  );
}
