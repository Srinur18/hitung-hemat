// Klasifikasi jawaban salah → kode miskonsepsi (prd.md §7).
import { discountAmount, finalPrice } from './discount.js';

const nn = (...xs) => xs.filter((x) => x !== null && x !== undefined && !Number.isNaN(x));

const DETECTORS = {
  // Menjawab besar diskon padahal yang ditanya harga akhir
  MC1: (v, a) =>
    nn(v.disc, ...['pct', 'p1', 'pA', 'pB'].map((k) => (v[k] ? discountAmount(v.price, v[k]) : null))).includes(a),
  // Menjumlahkan persen diskon bertingkat
  MC2: (v, a) => v.p1 !== undefined && a === finalPrice(v.price, v.p1 + v.p2),
  // Salah geser koma saat mengubah persen
  MC3: (v, a) =>
    v.pct !== undefined &&
    nn(discountAmount(v.price, v.pct * 10), v.pct % 10 === 0 ? discountAmount(v.price, v.pct / 10) : null).includes(a),
  // Soal terbalik: harga akhir dikalikan sisa persen
  MC4: (v, a) => v.final !== undefined && v.pct !== undefined && a === finalPrice(v.final, v.pct),
  // Harga setelah diskon malah lebih mahal
  MC5: (v, a) => v.price !== undefined && a > v.price,
  // Persen diskon dibagi harga akhir, bukan harga awal
  MC6: (v, a) => v.final > 0 && Math.abs(a - ((v.price - v.final) * 10000) / v.final) < 50,
};

export const FEEDBACK = {
  MC1: 'Itu besar diskonnya. Yang ditanya harga yang dibayar. Satu langkah lagi!',
  MC2: 'Diskon kedua dihitung dari sisa harga, bukan dijumlahkan dengan diskon pertama.',
  MC3: 'Cek posisi koma. Persen dibagi 100: geser koma 2 angka ke kiri.',
  MC4: 'Harga akhir itu baru sebagian. Cari dulu 1%, lalu kalikan 100.',
  MC5: 'Setelah diskon, harga harus lebih murah dari harga awal. Coba cek lagi.',
  MC6: 'Persen diskon dibandingkan dengan harga AWAL, bukan harga akhir.',
  // R2: bukan miskonsepsi — cara kemungkinan benar, tetapi hitungan persen meleset
  CALC: 'Caramu mungkin sudah benar, tetapi hitungannya meleset. Hitung ulang lewat cara lain, misalnya cari 10% dulu.',
  DEFAULT: 'Belum tepat. Coba periksa lagi langkahnya.',
};

/** Langkah yang memakai persen (pecahan per seratus ↔ desimal) — tempat salah hitung representasi terjadi. */
export const CALC_FNS = new Set(['discountAmount', 'finalPrice']);
/** Rentang "masih satu besaran" terhadap kunci: 0,5× – 1,5×. */
export const CALC_RANGE = [0.5, 1.5];

/**
 * Salah hitung (CALC): langkah persen, jawaban bukan pola miskonsepsi, bukan angka lain di soal,
 * dan masih sebesaran dengan kunci (mis. 0,3 × 400.000 ditulis 110.000).
 * Hanya memilih teks mediasi; TIDAK dipakai untuk menilai.
 */
export function isCalcSlip(step, vars, answer) {
  const key = step.answer;
  if (!Number.isInteger(answer) || !Number.isInteger(key) || key <= 0 || answer === key || answer <= 0) return false;
  if (step.input === 'choice' || !CALC_FNS.has(step.compute?.fn)) return false;
  if (Object.values(vars).some((x) => x === answer)) return false;
  const r = answer / key;
  return r >= CALC_RANGE[0] && r <= CALC_RANGE[1];
}

/** @returns {string|null} kode MC pertama yang cocok, lalu 'CALC' bila salah hitung, selain itu null */
export function classify(step, vars, answer) {
  if (answer === null || answer === undefined) return null;
  for (const code of step.mc ?? []) {
    if (DETECTORS[code]?.(vars, answer)) return code;
  }
  return isCalcSlip(step, vars, answer) ? 'CALC' : null;
}
