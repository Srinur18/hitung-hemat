// Tema "PLUM ARCADE WORLD": warna terpusat di :root dan kontras teks memenuhi WCAG AA (≥ 4,5:1)
// di atas latar/kartu gelap. Juga memastikan desain lama (kartu putih, latar krem) benar-benar diganti.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
const rootStart = css.indexOf(':root {');
const rootEnd = css.indexOf('}', rootStart);
const rootBlock = css.slice(rootStart, rootEnd);

const vars = Object.fromEntries([...rootBlock.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
function resolve(name, depth = 0) {
  const v = vars[name];
  const ref = /^var\(--([\w-]+)\)$/.exec(v ?? '');
  return ref && depth < 5 ? resolve(ref[1], depth + 1) : v;
}

function lum(hex) {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const f = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
const contrast = (a, b) => {
  const [x, y] = [lum(resolve(a)), lum(resolve(b))].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

describe('tema Plum Arcade World', () => {
  it('palet pemilik produk tersedia persis sebagai token', () => {
    expect(vars).toMatchObject({
      bg: '#160d25', 'bg-2': '#24123b', card: '#2e1a45', 'neon-purple': '#8b5cf6', 'neon-pink': '#f472b6',
      'neon-cyan': '#22d3ee', 'plum-lavender': '#c084fc', text: '#f8eeff', 'text-2': '#d8c4e8',
    });
  });

  it('desain lama benar-benar diganti: latar & kartu gelap, bukan krem/putih', () => {
    expect(resolve('c-bg')).toBe('#160d25');
    expect(resolve('c-surface')).toBe('#2e1a45');
    expect(resolve('white')).toBe('#2e1a45'); // alias kartu lama kini ungu
    expect(lum(resolve('c-surface'))).toBeLessThan(0.05);
    // tombol sekunder tidak putih: ada lapisan arcade untuk .btn:not(.btn-primary)
    expect(css).toMatch(/\.btn:not\(\.btn-primary\)\s*\{\s*background: linear-gradient\(180deg, var\(--card-2\), var\(--card\)\)/);
  });

  it('variabel yang dibaca scene 3D berupa hex langsung', () => {
    for (const k of ['c-price', 'c-discount', 'c-muted', 'c-surface-3d']) expect(vars[k]).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('warna di luar :root hanya dari palet atau nuansa neon yang terdaftar', () => {
    const palette = new Set(Object.values(vars).filter((v) => /^#[0-9a-f]{6}$/.test(v)));
    // nuansa turunan palet untuk bayangan/cahaya/nada (didokumentasikan di design.md §2)
    const shades = ['#120a1f', '#1d0f31', '#a996bd', '#7e22ce', '#8f55f7', '#a855f7', '#fff6c9', '#c4b5fd',
      '#4c1d95', '#9d174d', '#6b21a8', '#0e7490', '#b45309', '#2a1747', '#251640'];
    const rest = css.slice(rootEnd);
    const used = [...new Set((rest.match(/#[0-9a-fA-F]{6}\b/g) ?? []).map((h) => h.toLowerCase()))];
    expect(used.filter((h) => !palette.has(h) && !shades.includes(h))).toEqual([]);
    // gaya lama (candy) tidak tersisa
    expect(rest).not.toMatch(/#ff7f87|#fff8ed|#ffd66b|#8ddcc0|#bba5e8/i);
  });

  it.each([
    ['c-text', 'c-bg'], ['c-text', 'c-surface'], ['c-text', 'bg-2'], ['c-text', 'card-2'],
    ['c-muted', 'c-bg'], ['c-muted', 'c-surface'], ['c-muted', 'card-2'],
    ['c-price', 'c-surface'], ['c-percent', 'c-surface'], ['c-discount', 'c-surface'], ['c-result', 'c-surface'],
    ['c-text', 'purple-btn'],
    ['c-on-color', 'neon-pink'], ['c-on-color', 'neon-cyan'], ['c-on-color', 'plum-lavender'], ['c-on-color', 'gold'],
    ['coral-text', 'c-surface'], ['mint-text', 'c-surface'], ['lavender-text', 'c-surface'], ['butter-text', 'c-surface'],
  ])('kontras %s di atas %s ≥ 4,5:1', (fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });
});
