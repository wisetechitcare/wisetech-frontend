/** Access Control → Assignments — small presentation helpers. */

/** "12 Mar 2026" — stable, locale-light, unambiguous for enterprise users. */
export const formatDate = (value?: string | null): string => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
};

/** "12 Mar 2026, 14:30" — for audit timelines where the time matters. */
export const formatDateTime = (value?: string | null): string => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

/** Two-letter initials for a person avatar chip. */
export const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') || '?';

/**
 * Human-readable message from a rejected api call. The apiClient interceptor
 * rejects with the server envelope ({ hasError, statusCode, message, data }),
 * so the backend's plain-language validation message (e.g. "This person already
 * has that role in this scope.") is surfaced verbatim — never a raw stack trace
 * or status code.
 */
export const errorMessage = (error: unknown, fallback = 'Something went wrong. Please try again.'): string => {
  if (typeof error === 'string') return error;
  const envelope = error as { message?: unknown; response?: { data?: { message?: unknown } } };
  if (typeof envelope?.message === 'string' && envelope.message) return envelope.message;
  const nested = envelope?.response?.data?.message;
  if (typeof nested === 'string' && nested) return nested;
  return fallback;
};

/** Turn a raw unit type ("SubOrganization") into a readable label ("Sub Organization"). */
export const humanizeType = (type: string): string =>
  type.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').trim() || type;
