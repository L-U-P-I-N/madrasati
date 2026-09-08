'use client';

import { useEffect, type ReactNode } from 'react';
import { Icon } from './Icon';

export function Badge({ tone = 'muted', children }: { tone?: string; children: ReactNode }) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}

export function Card({ title, action, children }: { title?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="card">
      {(title || action) && (
        <header className="card__head">
          {title && <h3>{title}</h3>}
          {action && <div style={{ marginInlineStart: 'auto' }}>{action}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function PageHead({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="page-head">
      <div className="page-head__text">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      {hint && <p>{hint}</p>}
    </div>
  );
}

export function Alert({ tone = 'info', children }: { tone?: 'info' | 'danger' | 'success'; children: ReactNode }) {
  return <div className={`alert alert--${tone}`}>{children}</div>;
}

export function Loading({ rows = 4 }: { rows?: number }) {
  return (
    <div style={{ padding: 'var(--space-6)', display: 'grid', gap: 'var(--space-3)' }}>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="skeleton" style={{ width: `${100 - index * 8}%` }} />
      ))}
    </div>
  );
}

export function Modal({
  title,
  onClose,
  footer,
  children,
}: {
  title: string;
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal__head">
          <h3>{title}</h3>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onClose} aria-label="إغلاق">
            <Icon name="close" size={16} />
          </button>
        </header>
        <div className="modal__body">{children}</div>
        {footer && <footer className="modal__foot">{footer}</footer>}
      </div>
    </div>
  );
}

interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}

export function Field({ label, error, hint, children }: FieldProps) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
      {hint && !error && <span className="hint">{hint}</span>}
      {error && <span className="error">{error}</span>}
    </div>
  );
}

/** شاشة «غير مصرّح» — ما يراه المستخدم عند محاولة الوصول بالرابط المباشر. */
export function Unauthorized() {
  return (
    <div className="card">
      <div className="empty">
        <div style={{ color: 'var(--text-3)', marginBottom: 'var(--space-3)' }}>
          <Icon name="lock" size={32} />
        </div>
        <strong>غير مصرّح لك بالوصول إلى هذا القسم</strong>
        <p>هذه الصفحة خارج نطاق صلاحياتك الحالية. راجع مدير المدرسة إن كنت تحتاج الوصول إليها.</p>
      </div>
    </div>
  );
}

export function ConfirmDelete({
  label,
  onConfirm,
  onClose,
  busy,
}: {
  label: string;
  onConfirm: () => void;
  onClose: () => void;
  busy?: boolean;
}) {
  return (
    <Modal
      title="تأكيد الحذف"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--danger" onClick={onConfirm} disabled={busy}>
            {busy ? 'جارٍ الحذف…' : 'حذف نهائيا'}
          </button>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            إلغاء
          </button>
        </>
      }
    >
      <p>هل أنت متأكد من حذف {label}؟ لا يمكن التراجع.</p>
    </Modal>
  );
}
