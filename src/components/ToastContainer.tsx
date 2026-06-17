import React, { useEffect, useState } from 'react';
import { useToast } from '../contexts/ToastContext';
import { AlertIcon, CheckIcon, InfoIcon } from './Icons';

export default function ToastContainer() {
  const { toasts } = useToast();

  return (
    <div className="toast-container" aria-live="polite" aria-atomic="true">
      {toasts.map(t => (
        <ToastItem key={t.id} text={t.text} type={t.type} />
      ))}
    </div>
  );
}

function ToastItem({ text, type }: { text: string; type: string }) {
  const [visible, setVisible] = useState(false);
  const icon = type === 'success' ? <CheckIcon /> : type === 'error' ? <AlertIcon /> : <InfoIcon />;

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => setVisible(false), 2700);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`toast toast--${type}${visible ? ' is-visible' : ''}`}>
      <span className="toast__icon">{icon}</span>
      <span className="toast__text">{text}</span>
    </div>
  );
}
