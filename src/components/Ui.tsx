import clsx from 'clsx';
import { AlertTriangle, Check, X } from 'lucide-react';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export function Card({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx('card', className)} {...props}>
      {children}
    </div>
  );
}

export function StatusBadge({ status }: { status?: string }) {
  const labels: Record<string, string> = {
    LIVE: 'Bieżące',
    DELAYED: 'Opóźnione',
    CLOSED: 'Rynek zamknięty',
    STALE: 'Ostatnia poprawna cena',
    MANUAL: 'Cena ręczna',
  };
  return (
    <span className={clsx('status-badge', status?.toLowerCase())}>
      {labels[status ?? ''] ?? 'Brak ceny'}
    </span>
  );
}

type Toast = { id: number; text: string; tone: 'success' | 'error' };
const ToastContext = createContext<(text: string, tone?: Toast['tone']) => void>(() => undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const notify = useCallback((text: string, tone: Toast['tone'] = 'success') => {
    const toast = { id: Date.now(), text, tone };
    setToasts((current) => [...current, toast]);
    window.setTimeout(
      () => setToasts((current) => current.filter((item) => item.id !== toast.id)),
      4000,
    );
  }, []);
  const value = useMemo(() => notify, [notify]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((toast) => (
          <div className={clsx('toast', toast.tone)} key={toast.id}>
            {toast.tone === 'success' ? <Check size={17} /> : <AlertTriangle size={17} />}
            <span>{toast.text}</span>
            <button
              type="button"
              aria-label="Zamknij"
              onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}
            >
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

export function EmptyState({
  icon,
  title,
  text,
  action,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  text,
  action,
}: {
  eyebrow: string;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="page-lede">{text}</p>
      </div>
      {action}
    </header>
  );
}

export function ConfirmButton({
  onConfirm,
  children,
  className,
}: {
  onConfirm: () => void;
  children: ReactNode;
  className?: string;
}) {
  const [armed, setArmed] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onBlur={() => setArmed(false)}
      onClick={() => {
        if (armed) {
          onConfirm();
          setArmed(false);
        } else setArmed(true);
      }}
    >
      {armed ? 'Potwierdź usunięcie' : children}
    </button>
  );
}
