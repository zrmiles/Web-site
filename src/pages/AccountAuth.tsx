import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { applyPhoneMask } from '../utils/format';

type AuthTab = 'login' | 'register';

// Guest view for /account — once auth succeeds, AuthProvider updates and
// ProtectedRoute swaps this out for the profile automatically.
export default function AccountAuth() {
  const { login, register } = useAuth();
  const { showToast } = useToast();
  const [tab, setTab] = useState<AuthTab>('login');

  const [loginVal, setLoginVal] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginErrors, setLoginErrors] = useState<Record<string, string>>({});
  const [loginLoading, setLoginLoading] = useState(false);

  const [regName, setRegName] = useState('');
  const [regLogin, setRegLogin] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regPassConfirm, setRegPassConfirm] = useState('');
  const [regErrors, setRegErrors] = useState<Record<string, string>>({});
  const [regLoading, setRegLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!loginVal.trim()) errs.login = 'Введите логин';
    if (!loginPass) errs.password = 'Введите пароль';
    setLoginErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setLoginLoading(true);
    try {
      await login(loginVal.trim(), loginPass);
      showToast('Вы вошли в личный кабинет', 'success');
    } catch (err: unknown) {
      setLoginErrors({ general: err instanceof Error ? err.message : 'Ошибка входа' });
    }
    setLoginLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!regName.trim()) errs.name = 'Введите имя';
    if (!regLogin.trim()) errs.login = 'Введите логин';
    if (regLogin.trim().length < 3) errs.login = 'Логин минимум 3 символа';
    const phoneDigits = regPhone.replace(/\D/g, '');
    if (phoneDigits.length < 11) errs.phone = 'Введите корректный номер телефона';
    if (!regPass) errs.password = 'Введите пароль';
    if (regPass.length < 8) errs.password = 'Пароль минимум 8 символов';
    if (regPass !== regPassConfirm) errs.passwordConfirm = 'Пароли не совпадают';
    setRegErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setRegLoading(true);
    try {
      await register(regLogin.trim(), regPass, regName.trim(), regPhone.trim());
      showToast('Аккаунт создан! Добро пожаловать!', 'success');
    } catch (err: unknown) {
      setRegErrors({ general: err instanceof Error ? err.message : 'Ошибка регистрации' });
    }
    setRegLoading(false);
  };

  return (
    <div className="container">
      <div className="page-hero"><h1 className="page-hero__title">Личный кабинет</h1></div>
      <div className="account-login">
        <div className="auth-tabs">
          <button className={`auth-tabs__btn${tab === 'login' ? ' is-active' : ''}`} onClick={() => { setTab('login'); setLoginErrors({}); }}>Вход</button>
          <button className={`auth-tabs__btn${tab === 'register' ? ' is-active' : ''}`} onClick={() => { setTab('register'); setRegErrors({}); }}>Регистрация</button>
        </div>
        {tab === 'login' && (
          <form className="form" onSubmit={handleLogin} style={{ marginTop: 24 }}>
            {loginErrors.general && <div className="form-alert form-alert--error">{loginErrors.general}</div>}
            <div className="input-group">
              <label htmlFor="authLogin">Логин</label>
              <input className={`input${loginErrors.login ? ' input--error' : ''}`} id="authLogin" value={loginVal} onChange={e => setLoginVal(e.target.value)} placeholder="Ваш логин" autoComplete="username" />
              <div className="input-error-text">{loginErrors.login || ''}</div>
            </div>
            <div className="input-group">
              <label htmlFor="authPass">Пароль</label>
              <input className={`input${loginErrors.password ? ' input--error' : ''}`} id="authPass" type="password" value={loginPass} onChange={e => setLoginPass(e.target.value)} placeholder="Ваш пароль" autoComplete="current-password" />
              <div className="input-error-text">{loginErrors.password || ''}</div>
            </div>
            <button type="submit" className="btn btn--primary btn--block btn--lg" disabled={loginLoading}>{loginLoading ? 'Вход...' : 'Войти'}</button>
            <p className="text-muted text-center" style={{ fontSize: 'var(--font-size-sm)', marginTop: 12 }}>Нет аккаунта? <button type="button" className="link-btn" onClick={() => setTab('register')}>Зарегистрироваться</button></p>
          </form>
        )}
        {tab === 'register' && (
          <form className="form" onSubmit={handleRegister} style={{ marginTop: 24 }}>
            {regErrors.general && <div className="form-alert form-alert--error">{regErrors.general}</div>}
            <div className="input-group">
              <label htmlFor="regName">Имя *</label>
              <input className={`input${regErrors.name ? ' input--error' : ''}`} id="regName" value={regName} onChange={e => setRegName(e.target.value)} placeholder="Иван Иванов" />
              <div className="input-error-text">{regErrors.name || ''}</div>
            </div>
            <div className="input-group">
              <label htmlFor="regLogin">Логин *</label>
              <input className={`input${regErrors.login ? ' input--error' : ''}`} id="regLogin" value={regLogin} onChange={e => setRegLogin(e.target.value)} placeholder="mylogin" autoComplete="username" />
              <div className="input-error-text">{regErrors.login || ''}</div>
            </div>
            <div className="input-group">
              <label htmlFor="regPhone">Телефон *</label>
              <input className={`input${regErrors.phone ? ' input--error' : ''}`} id="regPhone" type="tel" value={regPhone} onChange={e => setRegPhone(applyPhoneMask(e.target.value))} placeholder="+7 (___) ___-__-__" />
              <div className="input-error-text">{regErrors.phone || ''}</div>
            </div>
            <div className="input-group">
              <label htmlFor="regPass">Пароль *</label>
              <input className={`input${regErrors.password ? ' input--error' : ''}`} id="regPass" type="password" value={regPass} onChange={e => setRegPass(e.target.value)} placeholder="Минимум 8 символов" autoComplete="new-password" />
              <div className="input-error-text">{regErrors.password || ''}</div>
            </div>
            <div className="input-group">
              <label htmlFor="regPassConfirm">Повторите пароль *</label>
              <input className={`input${regErrors.passwordConfirm ? ' input--error' : ''}`} id="regPassConfirm" type="password" value={regPassConfirm} onChange={e => setRegPassConfirm(e.target.value)} placeholder="Повторите пароль" autoComplete="new-password" />
              <div className="input-error-text">{regErrors.passwordConfirm || ''}</div>
            </div>
            <button type="submit" className="btn btn--primary btn--block btn--lg" disabled={regLoading}>{regLoading ? 'Создание...' : 'Создать аккаунт'}</button>
            <p className="text-muted text-center" style={{ fontSize: 'var(--font-size-sm)', marginTop: 12 }}>Уже есть аккаунт? <button type="button" className="link-btn" onClick={() => setTab('login')}>Войти</button></p>
          </form>
        )}
      </div>
    </div>
  );
}
