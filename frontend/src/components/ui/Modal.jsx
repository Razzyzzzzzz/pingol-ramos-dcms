import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle } from 'lucide-react';
import { Button } from './index';

const SIZES = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export function Modal({ open, onClose, title, subtitle, size = 'md', children, footer }) {
  // Close on Escape, lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto p-4 sm:items-center no-print">
      <div
        className="fixed inset-0 bg-ink/40 backdrop-blur-[2px] animate-fade-in"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative z-10 my-8 w-full ${SIZES[size]} animate-scale-in rounded-2xl bg-white shadow-pop`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-ink">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted transition hover:bg-canvas hover:text-ink"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="scroll-slim max-h-[70vh] overflow-y-auto px-5 py-5">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  loading = false,
  danger = true,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-3">
        {danger && (
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-red-100 text-red-600">
            <AlertTriangle size={18} />
          </span>
        )}
        <p className="text-sm leading-relaxed text-muted">{message}</p>
      </div>
    </Modal>
  );
}
