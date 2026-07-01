// Small formatting helpers shared across the app.

const peso = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
});

const pesoCompact = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  notation: 'compact',
  maximumFractionDigits: 1,
});

export const money = (v) => peso.format(Number(v || 0));
export const moneyShort = (v) => pesoCompact.format(Number(v || 0));

export const number = (v) => new Intl.NumberFormat('en-PH').format(Number(v || 0));

export function formatDate(value, opts = {}) {
  if (!value) return '—';
  const d = new Date(value.length <= 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...opts,
  });
}

export function formatTime(value) {
  if (!value) return '—';
  // value is "HH:MM:SS" or "HH:MM"
  const [h, m] = String(value).split(':');
  const d = new Date();
  d.setHours(Number(h), Number(m), 0, 0);
  return d.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
}

export function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// "2 hours ago" style relative time for notifications / activity.
export function timeAgo(value) {
  if (!value) return '';
  const d = new Date(value);
  const diff = Date.now() - d.getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(value);
}

export function initials(name = '') {
  const parts = String(name).trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || '').join('') || '?';
}

export function ageFromBirthdate(birthdate) {
  if (!birthdate) return null;
  const b = new Date(birthdate);
  if (Number.isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

// Appointment status -> tailwind badge tone.
export const STATUS_TONES = {
  pending: 'amber',
  approved: 'blue',
  completed: 'green',
  cancelled: 'red',
};

export const titleCase = (s = '') =>
  String(s).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
