import type { UserRole } from '../types';

export function isManager(role: UserRole | undefined): boolean {
  return role === 'admin';
}

export function formatDate(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Renders a numeric-string Postgres field (or null) as a plain number string. */
export function formatNum(value: string | number | null, digits = 1): string {
  if (value === null || value === undefined) return '—';
  const n = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(n)) return '—';
  return n.toFixed(digits);
}

/** Converts a Date/ISO string to the YYYY-MM-DD shape the backend expects for DATE fields. */
export function toDateInputValue(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/** Converts a Date to the value a <input type="datetime-local"> control needs. */
export function toDateTimeInputValue(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}`;
}
