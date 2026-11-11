// Konvensi: Rupiah = bilangan bulat; persen = basis point (12,5% = 1250).
// Format harus identik dengan backend/app/domain/money.py (dicek test-vectors).
export const BP = 10000;

function trim(num, den) {
  const sign = num < 0 ? '-' : '';
  const n = Math.abs(num);
  const whole = Math.floor(n / den);
  const frac = n % den;
  if (frac === 0) return `${sign}${whole}`;
  const width = String(den).length - 1;
  return `${sign}${whole},${String(frac).padStart(width, '0').replace(/0+$/, '')}`;
}

export function formatRp(v) {
  return 'Rp' + String(v).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function formatBp(bp) {
  return trim(bp, 100) + '%';
}

export function formatValue(value, fmt) {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '?';
  switch (fmt) {
    case 'price':
    case 'discount':
    case 'result':
    case 'rupiah':
      return formatRp(value);
    case 'percent':
      return formatBp(value);
    case 'plainpct':
      return trim(value, 100);
    case 'frac':
      return trim(value, 100) + '/100';
    case 'dec':
      return trim(value, BP);
    case 'milli':
      return trim(value, 10);
    default:
      return String(value);
  }
}

/** "120.000" / "120000" → 120000; kosong → null */
export function parseRupiah(input) {
  const digits = String(input).replace(/\D/g, '');
  return digits ? Number(digits) : null;
}

/** "12,5" → 1250; kosong → null */
export function parsePercent(input) {
  const s = String(input).replace('%', '').replace(',', '.').trim();
  if (!s || Number.isNaN(Number(s))) return null;
  return Math.round(Number(s) * 100);
}
