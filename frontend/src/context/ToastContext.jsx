import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

let idSeq = 0;

const TONES = {
  success: { icon: CheckCircle2, ring: 'border-lime-200', bar: 'bg-lime-500', text: 'text-lime-700' },
  error: { icon: AlertCircle, ring: 'border-red-200', bar: 'bg-red-500', text: 'text-red-700' },
  info: { icon: Info, ring: 'border-navy-200', bar: 'bg-navy-600', text: 'text-navy-700' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message, tone = 'info', ttl = 3800) => {
      const id = ++idSeq;
      setToasts((list) => [...list, { id, message, tone }]);
      if (ttl) setTimeout(() => dismiss(id), ttl);
      return id;
    },
    [dismiss]
  );

  // Memoized so consumers (and anything depending on `toast` in a useCallback
  // dependency array, e.g. polling effects) don't see a new reference on
  // every unrelated render.
  const toast = useMemo(
    () => ({
      success: (m, ttl) => push(m, 'success', ttl),
      error: (m, ttl) => push(m, 'error', ttl),
      info: (m, ttl) => push(m, 'info', ttl),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex w-full max-w-sm flex-col gap-2.5 no-print">
        {toasts.map((t) => {
          const cfg = TONES[t.tone] || TONES.info;
          const Icon = cfg.icon;
          return (
            <div
              key={t.id}
              role="status"
              className={`flex items-start gap-3 overflow-hidden rounded-xl border ${cfg.ring} bg-white p-3.5 shadow-pop animate-fade-in`}
            >
              <span className={`mt-0.5 shrink-0 ${cfg.text}`}>
                <Icon size={18} />
              </span>
              <p className="flex-1 text-sm leading-snug text-ink">{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                className="shrink-0 rounded-md p-0.5 text-muted transition hover:bg-canvas hover:text-ink"
                aria-label="Dismiss"
              >
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};
