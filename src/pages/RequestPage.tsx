import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useToast } from '../contexts/ToastContext';
import { apiCreateOrder, apiGetProduct, ApiProduct } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { applyPhoneMask } from '../utils/format';
import { CheckIcon } from '../components/Icons';

type RequestItem = {
  productId: number;
  title: string;
  qty: number;
  selectedOptions: { color: string; size: string };
};

export default function RequestPage() {
  const { items: cartItems, clear } = useCart();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const productParam = searchParams.get('product');
  const initialColor = searchParams.get('color') || '';
  const initialSize = searchParams.get('size') || '';

  const [requestedProduct, setRequestedProduct] = useState<ApiProduct | null>(null);
  const [productLoading, setProductLoading] = useState(Boolean(productParam));
  const [qty, setQty] = useState(1);
  const [selectedColor, setSelectedColor] = useState(initialColor);
  const [selectedSize, setSelectedSize] = useState(initialSize);

  const [name, setName] = useState(user?.name || '');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState(user?.phone || '');
  const [email, setEmail] = useState('');
  const [contactMethod, setContactMethod] = useState('phone');
  const [deadline, setDeadline] = useState('');
  const [comment, setComment] = useState('');
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successId, setSuccessId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Prefill contact details once the session resolves (auth loads asynchronously).
  useEffect(() => {
    if (!user) return;
    setName(prev => prev || user.name);
    setPhone(prev => prev || user.phone);
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    if (!productParam) return;
    setProductLoading(true);
    apiGetProduct(productParam)
      .then(product => {
        if (cancelled) return;
        setRequestedProduct(product);
        setSelectedColor(initialColor || product.colors[0] || '');
        setSelectedSize(initialSize || product.sizes[0] || '');
      })
      .catch(() => {
        if (!cancelled) showToast('Товар для заявки не найден', 'error');
      })
      .finally(() => {
        if (!cancelled) setProductLoading(false);
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productParam, initialColor, initialSize]);

  const requestItems: RequestItem[] = useMemo(() => {
    if (requestedProduct) {
      return [{
        productId: requestedProduct.id,
        title: requestedProduct.title,
        qty,
        selectedOptions: { color: selectedColor, size: selectedSize },
      }];
    }
    return cartItems.map(item => ({
      productId: item.id,
      title: item.title,
      qty: item.qty,
      selectedOptions: item.selectedOptions,
    }));
  }, [cartItems, qty, requestedProduct, selectedColor, selectedSize]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Введите имя';
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 11) errs.phone = 'Введите корректный номер телефона';
    if (!email.trim()) errs.email = 'Введите email';
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = 'Введите корректный email';
    if (requestItems.length === 0) errs.items = 'Выберите товар или добавьте товары в корзину';
    if (!consent) errs.consent = 'Подтвердите согласие на обработку персональных данных';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const context = [
        company.trim() ? `Компания: ${company.trim()}` : '',
        deadline.trim() ? `Желаемый срок: ${deadline.trim()}` : '',
        requestedProduct ? 'Тип заявки: запрос цены по товару' : 'Тип заявки: заявка по корзине',
        comment.trim() ? `Комментарий: ${comment.trim()}` : '',
      ].filter(Boolean).join('\n');

      const result = await apiCreateOrder({
        user: { name: name.trim(), phone: phone.trim(), email: email.trim(), contactMethod },
        items: requestItems,
        comment: context,
      });

      if (!requestedProduct) clear();
      setSuccessId(result.id);
      showToast('Заявка отправлена в админ-панель', 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Ошибка при оформлении заявки', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (successId) {
    return (
      <div className="container">
        <div className="form__success request-success">
          <div className="form__success-icon"><CheckIcon /></div>
          <div className="form__success-title">Заявка отправлена</div>
          <p className="text-muted">Она уже доступна администратору в разделе заявок.</p>
          <div className="form__success-id">{successId}</div>
          <div className="request-success__actions">
            <Link to="/catalog" className="btn btn--primary">Вернуться к товарам</Link>
            <Link to="/account" className="btn btn--outline">Личный кабинет</Link>
          </div>
        </div>
      </div>
    );
  }

  const noItems = !productLoading && requestItems.length === 0;

  return (
    <div className="container request-page">
      <div className="request-layout">
        <aside className="request-summary">
          <p className="request-summary__label">Состав заявки</p>
          <h1>Запрос цены</h1>
          <p className="request-summary__lead">Заполните контакты и детали. Заявка уйдёт в админ-панель со статусом «Новая».</p>
          {productLoading ? (
            <p className="text-muted">Загружаем товар...</p>
          ) : noItems ? (
            <div className="request-empty">
              <p>В заявке пока нет товаров.</p>
              <Link to="/catalog" className="btn btn--primary">Выбрать товар</Link>
            </div>
          ) : (
            <div className="request-items">
              {requestItems.map(item => (
                <div className="request-item" key={`${item.productId}-${item.selectedOptions.color}-${item.selectedOptions.size}`}>
                  <strong>{item.title}</strong>
                  <span>{item.qty} шт.</span>
                  {(item.selectedOptions.color || item.selectedOptions.size) && (
                    <small>{[item.selectedOptions.color, item.selectedOptions.size].filter(Boolean).join(' · ')}</small>
                  )}
                </div>
              ))}
            </div>
          )}

          {requestedProduct && (
            <div className="request-product-options">
              <div className="input-group">
                <label htmlFor="requestQty">Количество</label>
                <input id="requestQty" className="input" type="number" min={1} max={999} value={qty} onChange={e => setQty(Math.max(1, Number(e.target.value) || 1))} />
              </div>
              {requestedProduct.colors.length > 0 && (
                <div className="input-group">
                  <label htmlFor="requestColor">Цвет</label>
                  <select id="requestColor" className="select" value={selectedColor} onChange={e => setSelectedColor(e.target.value)}>
                    {requestedProduct.colors.map(color => <option key={color} value={color}>{color}</option>)}
                  </select>
                </div>
              )}
              {requestedProduct.sizes.length > 0 && (
                <div className="input-group">
                  <label htmlFor="requestSize">Размер</label>
                  <select id="requestSize" className="select" value={selectedSize} onChange={e => setSelectedSize(e.target.value)}>
                    {requestedProduct.sizes.map(size => <option key={size} value={size}>{size}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}
          {errors.items && <div className="input-error-text">{errors.items}</div>}
        </aside>

        <form className="form request-form" onSubmit={handleSubmit} noValidate>
          <div className="request-form__head">
            <div>
              <h2>Контакты для расчёта</h2>
              <p>Нужны имя, телефон и email. Остальное помогает быстрее назвать цену и срок.</p>
            </div>
            <span>Ответ в рабочее время</span>
          </div>

          <div className="form__row">
            <div className="input-group">
              <label htmlFor="reqName">Имя *</label>
              <input className={`input${errors.name ? ' input--error' : ''}`} id="reqName" value={name} onChange={e => setName(e.target.value)} placeholder="Иван Иванов" autoComplete="name" />
              <div className="input-error-text">{errors.name || ''}</div>
            </div>
            <div className="input-group">
              <label htmlFor="reqCompany">Компания</label>
              <input className="input" id="reqCompany" value={company} onChange={e => setCompany(e.target.value)} placeholder="Название компании или ИП" autoComplete="organization" />
            </div>
          </div>

          <div className="form__row">
            <div className="input-group">
              <label htmlFor="reqPhone">Телефон *</label>
              <input className={`input${errors.phone ? ' input--error' : ''}`} id="reqPhone" type="tel" value={phone} onChange={e => setPhone(applyPhoneMask(e.target.value))} placeholder="+7 (___) ___-__-__" autoComplete="tel" />
              <div className="input-error-text">{errors.phone || ''}</div>
            </div>
            <div className="input-group">
              <label htmlFor="reqEmail">Email *</label>
              <input className={`input${errors.email ? ' input--error' : ''}`} id="reqEmail" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="mail@example.ru" autoComplete="email" />
              <div className="input-error-text">{errors.email || ''}</div>
            </div>
          </div>

          <div className="form__row">
            <div className="input-group">
              <label htmlFor="reqContact">Как удобнее связаться</label>
              <select className="select" id="reqContact" value={contactMethod} onChange={e => setContactMethod(e.target.value)}>
                <option value="phone">Позвонить</option>
                <option value="telegram">Написать в Telegram</option>
                <option value="email">Ответить на email</option>
              </select>
            </div>
            <div className="input-group">
              <label htmlFor="reqDeadline">Когда нужно</label>
              <input className="input" id="reqDeadline" value={deadline} onChange={e => setDeadline(e.target.value)} placeholder="Например: на этой неделе" />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="reqComment">Комментарий</label>
            <textarea className="textarea" id="reqComment" value={comment} onChange={e => setComment(e.target.value)} placeholder="Тираж, доставка, особенности упаковки, вопросы по цене..." />
          </div>

          <label className="form__consent">
            <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />
            <span>Я согласен на обработку персональных данных</span>
          </label>
          <div className="input-error-text">{errors.consent || ''}</div>

          <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={submitting || productLoading || noItems}>
            {submitting ? 'Отправляем...' : 'Отправить в работу'}
          </button>
        </form>
      </div>
    </div>
  );
}
