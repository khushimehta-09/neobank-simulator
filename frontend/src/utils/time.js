const DEFAULT_TIME_ZONE = 'Asia/Kolkata';

export function getAppTimeZone() {
  return localStorage.getItem('neosimTimeZone') || DEFAULT_TIME_ZONE;
}

export const APP_TIME_ZONE = getAppTimeZone();

export function parseProjectDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const raw = String(value).trim();

  // ISO timestamps from backend, e.g. 2026-06-02T22:04:11.000Z
  // These are already exact UTC instants. Browser will convert correctly.
  if (/Z$|[+-]\d{2}:?\d{2}$/.test(raw)) return new Date(raw);

  // SQLite datetime('now') legacy format, e.g. 2026-06-02 22:04:11.
  // SQLite datetime('now') is UTC, so append Z to avoid browser treating it as local.
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(raw)) {
    return new Date(raw.replace(' ', 'T') + 'Z');
  }

  // ISO-like value without timezone, e.g. 2026-06-02T22:04:11.
  // Project backend should not create this now, but old data may exist. Treat as UTC for consistency.
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(raw)) {
    return new Date(raw + 'Z');
  }

  return new Date(raw);
}

export function formatDateTime(value, options = {}) {
  const date = parseProjectDate(value);
  if (!date || Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-IN', {
    timeZone: getAppTimeZone(),
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: options.seconds === false ? undefined : '2-digit',
    hour12: true
  }).replace(/am|pm/i, m => m.toLowerCase());
}

export function formatTime(value) {
  const date = parseProjectDate(value);
  if (!date || Number.isNaN(date.getTime())) return '-';
  return date.toLocaleTimeString('en-IN', {
    timeZone: getAppTimeZone(),
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).replace(/am|pm/i, m => m.toLowerCase());
}

export function formatDate(value) {
  const date = parseProjectDate(value);
  if (!date || Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-IN', { timeZone: getAppTimeZone() });
}
