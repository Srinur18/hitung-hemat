// Fungsi diskon EKSAK: mengembalikan bilangan bulat, atau null bila hasil tidak bulat / tidak sah.
// Identik dengan backend/app/domain/discount.py.
import { BP } from './money.js';

const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const exact = (num, den) => (den > 0 && num >= 0 && num % den === 0 ? num / den : null);

export function discountAmount(price, bp) {
  return exact(price * bp, BP);
}

export function subtract(a, b) {
  return a >= b ? a - b : null;
}

export function finalPrice(price, bp) {
  const d = discountAmount(price, bp);
  return d === null ? null : subtract(price, d);
}

export const add = (a, b) => a + b;
export const mul = (a, k) => a * k;
export const div = (a, k) => (k ? exact(a, k) : null);

export function complementBp(bp) {
  return bp >= 0 && bp <= BP ? BP - bp : null;
}

export function originalFromFinal(final, bp) {
  if (bp >= BP) return null;
  return exact(final * BP, BP - bp);
}

export function percentFromPrices(original, final) {
  if (original <= 0 || final > original) return null;
  return exact((original - final) * BP, original);
}

export function effectiveBp(p1, p2) {
  const remain = exact((BP - p1) * (BP - p2), BP);
  if (remain === null) return null;
  const r = BP - remain;
  return r >= 0 ? r : null;
}

export function stackedFinalPrice(price, pcts) {
  let cur = price;
  for (const p of pcts) {
    if (cur === null) return null;
    cur = finalPrice(cur, p);
  }
  return cur;
}

export function withExtras(final, { taxBp = 0, shipping = 0 } = {}) {
  const tax = discountAmount(final, taxBp);
  return tax === null ? null : final + tax + shipping;
}

// Registri fungsi yang boleh dipakai template konten (tanpa eval).
export const FN = {
  discountAmount,
  finalPrice,
  subtract,
  add,
  mul,
  div,
  complementBp,
  originalFromFinal,
  percentFromPrices,
  effectiveBp,
};

export function compute(spec, vars) {
  const args = spec.args.map((a) => (isNum(a) ? a : vars[a]));
  if (args.some((a) => a === null || a === undefined)) return null;
  const fn = FN[spec.fn];
  if (!fn) throw new Error(`Fungsi tidak dikenal: ${spec.fn}`);
  return fn(...args);
}
