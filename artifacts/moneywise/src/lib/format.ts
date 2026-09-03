export function formatMoney(value: number, compact = false) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: compact && Math.abs(value) >= 1000 ? 'compact' : 'standard',
    maximumFractionDigits: compact && Math.abs(value) >= 1000 ? 1 : 2,
  }).format(value);
}

export function monthKey(date = new Date()) {
  return date.toISOString().slice(0, 7);
}

export function monthLabel(value: string) {
  const date = new Date(`${value}-01T12:00:00`);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function shortDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function initials(name?: string | null) {
  return (name || 'MW')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}