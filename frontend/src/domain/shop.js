// Simulasi Belanja: rincian harga per barang, keranjang, dan pertanyaan "Tantangan Kasir".
// Semua angka lewat fungsi domain (eksak, Rupiah bulat).
import { add, discountAmount, finalPrice, mul, subtract } from './discount.js';
import { BP } from './money.js';

/** Rincian satu barang: Harga Awal → Potongan Harga → Harga Akhir. */
export function priceBreakdown(product) {
  return {
    price: product.price,
    pct: product.pct,
    disc: discountAmount(product.price, product.pct),
    final: finalPrice(product.price, product.pct),
  };
}

/**
 * Tantangan Kasir: 3 pilihan harga akhir. Pengecoh mewakili miskonsepsi nyata:
 * MC1 (menjawab besar diskon) dan "persen dibaca rupiah" (harga awal − 25).
 * @returns {{value:number, kind:'correct'|'MC1'|'RP'}[]} urutan teracak oleh rnd()
 */
export function checkoutChoices(product, rnd = Math.random) {
  const correct = finalPrice(product.price, product.pct);
  const disc = discountAmount(product.price, product.pct);
  // Pengecoh berurutan prioritas; yang nilainya kembar dilewati (mis. diskon 50%: besar diskon = harga akhir).
  const candidates = [
    { value: disc, kind: 'MC1' },
    { value: subtract(product.price, (product.pct * 100) / BP), kind: 'RP' },
    { value: add(product.price, disc), kind: 'MC5' },
  ];
  const opts = [{ value: correct, kind: 'correct' }];
  for (const c of candidates) {
    if (opts.length < 3 && c.value !== null && !opts.some((o) => o.value === c.value)) opts.push(c);
  }
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
  MC5: 'Diskon mengurangi harga, bukan menambah. Harga akhir pasti lebih murah.',
};

/** Tambah barang ke keranjang (jumlah +1 bila sudah ada). Tidak mengubah array lama. */
export function addToCart(cart, product) {
  const i = cart.findIndex((l) => l.product.id === product.id);
  if (i < 0) return [...cart, { product, qty: 1 }];
  return cart.map((l, k) => (k === i ? { ...l, qty: l.qty + 1 } : l));
}

export function removeFromCart(cart, productId) {
  return cart.filter((l) => l.product.id !== productId);
}

/**
 * Struk keranjang. Menerima baris {product, qty} atau produk biasa (qty = 1).
 * @returns {{lines:object[], totalPrice:number, totalDisc:number, total:number, count:number}}
 */
export function receipt(items) {
  const lines = items.map((it) => {
    const product = it.product ?? it;
    const qty = it.qty ?? 1;
    const b = priceBreakdown(product);
    return {
      ...product,
      qty,
      disc: mul(b.disc, qty),
      final: mul(b.final, qty),
      lineprice: mul(product.price, qty),
      unitDisc: b.disc,
      unitFinal: b.final,
    };
  });
  const sum = (k) => lines.reduce((s, l) => s + l[k], 0);
  return { lines, totalPrice: sum('lineprice'), totalDisc: sum('disc'), total: sum('final'), count: sum('qty') };
}
