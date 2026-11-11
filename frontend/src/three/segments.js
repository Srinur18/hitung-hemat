// Model data ilustrasi (dipakai scene 3D DAN cadangan 2D, supaya isinya selalu sama).
// frac = bagian dari harga awal (0..1). out = bagian yang "lepas" (diskon).

const f = (bp) => bp / 10000;

export function segmentsFor(kind, p) {
  switch (kind) {
    case 'priceTag': {
      const d = f(p.pct ?? p.p1 ?? 0);
      return [
        { key: 'keep', frac: 1 - d, color: p.step >= 2 ? 'result' : 'price' },
        { key: 'disc', frac: d, color: p.step >= 1 ? 'discount' : 'price', out: p.step >= 2 },
      ];
    }
    case 'stacked': {
      const d1 = f(p.p1);
      const rest1 = 1 - d1;
      const d2 = rest1 * f(p.p2);
      return [
        { key: 'rest', frac: rest1 - d2, color: p.step >= 3 ? 'result' : 'price' },
        { key: 'd2', frac: d2, color: p.step >= 2 ? 'discount' : 'price', out: p.step >= 3 },
        { key: 'd1', frac: d1, color: p.step >= 1 ? 'discount' : 'price', out: p.step >= 1 },
      ];
    }
    case 'barModel': {
      const d = f(p.pct);
      return [
        { key: 'rest', frac: 1 - d, color: 'result' },
        { key: 'disc', frac: d, color: p.step >= 1 ? 'price' : 'muted', ghost: p.step < 1 },
      ];
    }
    default:
      return [];
  }
}

/** Keterangan singkat di bawah ilustrasi (persen dari harga awal). */
export function captionFor(kind, p) {
  const pct = (x) => `${(Math.round(x * 1000) / 10).toString().replace('.', ',')}%`;
  if (kind === 'stacked') {
    const rest = (1 - f(p.p1)) * (1 - f(p.p2));
    return p.step >= 3 ? `Tersisa ${pct(rest)} → diskon total ${pct(1 - rest)}` : 'Diskon kedua dihitung dari sisa';
  }
  if (kind === 'barModel') return `Harga akhir = ${pct(1 - f(p.pct))} dari harga awal`;
  if (kind === 'priceTag') return p.step >= 2 ? 'Bagian hijau yang dibayar' : 'Ketuk label harga';
  if (kind === 'hundredCubes') return `${pct(f(p.pct))} = ${pct(f(p.pct)).replace('%', '')} dari 100 kotak`;
  return '';
}
