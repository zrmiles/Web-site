export function applyPhoneMask(value: string): string {
  let digits = value.replace(/\D/g, '');
  if (digits.length > 0 && digits[0] === '8') digits = '7' + digits.slice(1);
  if (digits.length > 11) digits = digits.slice(0, 11);
  let f = '';
  if (digits.length > 0) f = '+' + digits[0];
  if (digits.length > 1) f += ' (' + digits.slice(1, 4);
  if (digits.length > 4) f += ') ' + digits.slice(4, 7);
  if (digits.length > 7) f += '-' + digits.slice(7, 9);
  if (digits.length > 9) f += '-' + digits.slice(9, 11);
  return f;
}

export function formatDate(d: string): string {
  try {
    return new Date(d).toLocaleString('ru-RU', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return d; }
}

export function statusLabel(status: string): string {
  if (status === 'Новая') return 'badge--new';
  if (status === 'В работе') return 'badge--progress';
  return 'badge--closed';
}
