// Simulasi Belanja: kasir bertanya "berapa harga akhirnya?" dengan 3 pilihan.
// Pengecoh mewakili miskonsepsi nyata: MC1 (menjawab besar diskon) dan "persen dibaca rupiah"
// (harga awal − 25, seperti kasir keliru di Soal 4 tes). Semua angka lewat fungsi domain.
import { discountAmount, finalPrice, subtract } from './discount.js';
import { BP } from './money.js';

/** @returns {{value:number, kind:'correct'|'MC1'|'RP'}[]} urutan teracak oleh rnd() */
export function checkoutChoices(product, rnd = Math.random) {
  const opts = [
    { value: finalPrice(product.price, product.pct), kind: 'correct' },
    { value: discountAmount(product.price, product.pct), kind: 'MC1' },
    { value: subtract(product.price, (product.pct * 100) / BP), kind: 'RP' },
  ];
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [opts[i], opts[j]] = [opts[j], opts[i]];
  }
  return opts;
}

export const CHOICE_FEEDBACK = {
  correct: 'Tepat! Harga akhir = harga awal − besar diskon.',
  MC1: 'Itu besar diskonnya. Kurangkan dari harga awal, ya.',
  RP: 'Diskon persen bukan potongan rupiah. Hitung persen × harga awal dulu.',
};

/** Struk keranjang: baris per barang + total, semua dari fungsi domain. */
export function receipt(products) {
  const lines = products.map((p) => ({
    ...p,
    disc: discountAmount(p.price, p.pct),
    final: finalPrice(p.price, p.pct),
  }));
  const sum = (k) => lines.reduce((s, l) => s + l[k], 0);
  return { lines, totalPrice: sum('price'), totalDisc: sum('disc'), total: sum('final') };
}
