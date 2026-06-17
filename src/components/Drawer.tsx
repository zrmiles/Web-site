import React, { useEffect, useId } from 'react';
import { XIcon } from './Icons';

interface DrawerProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export default function Drawer({ open, title, onClose, children }: DrawerProps) {
  const titleId = useId();

  useEffect(() => {
    if (open) {
      document.body.classList.add('no-scroll');
    } else {
      document.body.classList.remove('no-scroll');
    }
    return () => document.body.classList.remove('no-scroll');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  return (
    <>
      <div className={`drawer-overlay${open ? ' is-open' : ''}`} onClick={onClose} />
      <div className={`drawer${open ? ' is-open' : ''}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="drawer__header">
          <div className="drawer__title" id={titleId}>{title}</div>
          <button className="drawer__close" onClick={onClose} aria-label="Закрыть"><XIcon /></button>
        </div>
        <div className="drawer__body">{children}</div>
      </div>
    </>
  );
}
