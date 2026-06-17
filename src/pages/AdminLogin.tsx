import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

// Fallback for /admin when the visitor isn't an authenticated admin.
// On success AuthProvider updates and ProtectedRoute reveals the panel.
export default function AdminLogin() {
  const { login, isLoggedIn, isAdmin, logout } = useAuth();
  const { showToast } = useToast();
  const [loginVal, setLoginVal] = useState('');
  const [password, setPassword] = useState('');
  const [passError, setPassError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    try {
      const user = await login(loginVal.trim() || 'admin', password);
      if (user.role !== 'admin') {
        setPassError('У этого пользователя нет прав администратора');
        await logout();
        setLoginLoading(false);
        return;
      }
      setPassError('');
      showToast('Вы вошли в панель администратора', 'success');
    } catch (err: unknown) {
      setPassError(err instanceof Error ? err.message : 'Неверный логин или пароль');
    }
    setLoginLoading(false);
  };

  return (
    <div className="container admin-login-page">
      <div className="admin-login-intro">
        <h1>Рабочая панель заявок</h1>
        <p>Здесь администратор принимает запросы цены, меняет статусы и ведёт каталог товаров.</p>
        <div className="admin-login-intro__steps" aria-label="Сценарий обработки">
          <span>Форма клиента</span>
          <span>Новая заявка</span>
          <span>В работе</span>
        </div>
      </div>
      <div className="admin-gate">
        <h2>Вход администратора</h2>
        <p className="admin-gate__hint">Используйте учётную запись с ролью администратора.</p>
        {isLoggedIn && !isAdmin && (
          <div className="form-alert form-alert--error">У текущего пользователя нет прав администратора.</div>
        )}
        <form className="form" onSubmit={handleLogin}>
          {passError && <div className="form-alert form-alert--error">{passError}</div>}
          <div className="input-group">
            <label htmlFor="adminLogin">Логин</label>
            <input className="input" id="adminLogin" value={loginVal} onChange={e => setLoginVal(e.target.value)} placeholder="admin" autoComplete="username" />
          </div>
          <div className="input-group">
            <label htmlFor="adminPass">Пароль</label>
            <input className={`input${passError ? ' input--error' : ''}`} id="adminPass" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Введите пароль" autoComplete="current-password" />
          </div>
          <button type="submit" className="btn btn--primary btn--block btn--lg" disabled={loginLoading}>
            {loginLoading ? 'Вход...' : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  );
}
