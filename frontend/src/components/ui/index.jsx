import { forwardRef } from 'react';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------
const BTN_VARIANTS = {
  primary:
    'bg-navy-700 text-white hover:bg-navy-800 focus-visible:ring-navy-500 shadow-sm',
  accent:
    'bg-lime-500 text-white hover:bg-lime-600 focus-visible:ring-lime-500 shadow-sm',
  outline:
    'border border-line bg-white text-ink hover:bg-canvas focus-visible:ring-navy-500',
  ghost: 'text-ink hover:bg-canvas focus-visible:ring-navy-500',
  danger:
    'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500 shadow-sm',
  subtle: 'bg-navy-50 text-navy-700 hover:bg-navy-100 focus-visible:ring-navy-500',
};

const BTN_SIZES = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-sm gap-2',
  icon: 'h-9 w-9',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  children,
  ...props
}) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center rounded-lg font-semibold transition
        focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1
        disabled:cursor-not-allowed disabled:opacity-60
        ${BTN_VARIANTS[variant]} ${BTN_SIZES[size]} ${className}`}
      {...props}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  );
}

export function IconButton({ className = '', children, ...props }) {
  return (
    <button
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted
        transition hover:bg-canvas hover:text-ink focus:outline-none
        focus-visible:ring-2 focus-visible:ring-navy-500 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------
export function Card({ className = '', children, ...props }) {
  return (
    <div className={`card-base ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, className = '' }) {
  return (
    <div className={`flex items-start justify-between gap-3 border-b border-line px-5 py-4 ${className}`}>
      <div>
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Badge
// ---------------------------------------------------------------------------
const BADGE_TONES = {
  gray: 'bg-slate-100 text-slate-600',
  blue: 'bg-navy-50 text-navy-700',
  green: 'bg-lime-100 text-lime-700',
  amber: 'bg-amber-100 text-amber-700',
  red: 'bg-red-100 text-red-700',
  slate: 'bg-slate-100 text-slate-600',
};

export function Badge({ tone = 'gray', className = '', children }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold
        ${BADGE_TONES[tone] || BADGE_TONES.gray} ${className}`}
    >
      {children}
    </span>
  );
}

// A colored dot + label, used for statuses in tables/calendars.
export function StatusDot({ tone = 'gray', label }) {
  const dot = {
    blue: 'bg-navy-600',
    green: 'bg-lime-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
    gray: 'bg-slate-400',
  };
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink">
      <span className={`h-2 w-2 rounded-full ${dot[tone] || dot.gray}`} />
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Spinner / loading
// ---------------------------------------------------------------------------
export function Spinner({ size = 20, className = '' }) {
  return <Loader2 size={size} className={`animate-spin text-navy-600 ${className}`} />;
}

export function Loading({ label = 'Loading…', className = '' }) {
  return (
    <div className={`flex items-center justify-center gap-2 py-12 text-sm text-muted ${className}`}>
      <Spinner size={18} /> {label}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Form fields
// ---------------------------------------------------------------------------
export function Field({ label, htmlFor, error, hint, required, children, className = '' }) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-semibold text-ink">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export const Input = forwardRef(function Input({ className = '', ...props }, ref) {
  return <input ref={ref} className={`input-base ${className}`} {...props} />;
});

export const Textarea = forwardRef(function Textarea({ className = '', rows = 3, ...props }, ref) {
  return <textarea ref={ref} rows={rows} className={`input-base resize-y ${className}`} {...props} />;
});

export const Select = forwardRef(function Select({ className = '', children, ...props }, ref) {
  return (
    <select ref={ref} className={`input-base cursor-pointer pr-8 ${className}`} {...props}>
      {children}
    </select>
  );
});

// ---------------------------------------------------------------------------
// Page header
// ---------------------------------------------------------------------------
export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat card (dashboard)
// ---------------------------------------------------------------------------
export function StatCard({ icon: Icon, label, value, sub, tone = 'navy', onClick }) {
  const tones = {
    navy: 'bg-navy-50 text-navy-700',
    lime: 'bg-lime-100 text-lime-700',
    amber: 'bg-amber-100 text-amber-700',
    red: 'bg-red-100 text-red-700',
    slate: 'bg-slate-100 text-slate-600',
  };
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      onClick={onClick}
      className={`card-base flex items-center gap-4 p-4 text-left transition ${
        onClick ? 'hover:-translate-y-0.5 hover:shadow-pop' : ''
      }`}
    >
      {Icon && (
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${tones[tone]}`}>
          <Icon size={20} />
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-muted">{label}</p>
        <p className="nums mt-0.5 text-xl font-bold text-ink">{value}</p>
        {sub && <p className="truncate text-xs text-muted">{sub}</p>}
      </div>
    </Comp>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
export function EmptyState({ icon: Icon, title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {Icon && (
        <span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-canvas text-muted">
          <Icon size={22} />
        </span>
      )}
      <p className="text-sm font-semibold text-ink">{title}</p>
      {message && <p className="mt-1 max-w-sm text-sm text-muted">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------
export function Pagination({ page, pages, total, onPage }) {
  if (!pages || pages <= 1) {
    return total ? (
      <div className="px-5 py-3 text-xs text-muted">{total} total</div>
    ) : null;
  }
  return (
    <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3">
      <p className="text-xs text-muted">
        Page {page} of {pages} · {total} total
      </p>
      <div className="flex items-center gap-1.5">
        <IconButton disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
          <ChevronLeft size={17} />
        </IconButton>
        <IconButton disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page">
          <ChevronRight size={17} />
        </IconButton>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Simple skeleton bar
// ---------------------------------------------------------------------------
export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-md bg-line/70 ${className}`} />;
}
