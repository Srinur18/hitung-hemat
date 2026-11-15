// Tema "PLUM ARCADE WORLD": warna terpusat di :root dan kontras teks memenuhi WCAG AA (≥ 4,5:1)
// di atas latar/kartu gelap. Juga memastikan desain lama (kartu putih, latar krem) benar-benar diganti.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
const rootStart = css.indexOf(':root {');
const rootEnd = css.indexOf('}', rootStart);
const rootBlock = css.slice(rootStart, rootEnd);

const parseVars = (block) => Object.fromEntries([...block.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
const vars = parseVars(rootBlock);
function resolve(name, depth = 0, table = vars) {
  const v = table[name];
  const ref = /^var\(--([\w-]+)\)$/.exec(v ?? '');
  return ref && depth < 5 ? resolve(ref[1], depth + 1, table) : v;
}

// Tema terang (v0.7): satu blok token tersendiri; hex tema terang hanya boleh ada di blok ini.
const LIGHT_SEL = ":root[data-theme='light'] {";
const lightStart = css.indexOf(LIGHT_SEL);
const lightEnd = css.indexOf('}', lightStart);
const lightBlock = lightStart >= 0 ? css.slice(lightStart, lightEnd) : '';
const lightVars = { ...vars, ...parseVars(lightBlock) };

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
    // bagian di luar :root gelap, tanpa blok token tema terang (diuji terpisah di bawah)
    const rest = css.slice(rootEnd, lightStart >= 0 ? lightStart : undefined) + (lightStart >= 0 ? css.slice(lightEnd) : '');
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
    ['gs-sign-text', 'gs-sign'], // papan nama toko di latar Beranda (malam)
  ])('kontras %s di atas %s ≥ 4,5:1', (fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });
});

const contrastLight = (a, b) => {
  const [x, y] = [lum(resolve(a, 0, lightVars)), lum(resolve(b, 0, lightVars))].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

describe('tema terang Plum Lavender (v0.7)', () => {
  it('blok token terang ada dan bernuansa lavender, bukan putih polos', () => {
    expect(lightStart).toBeGreaterThan(rootEnd);
    expect(lightBlock).toMatch(/color-scheme: light/);
    expect(resolve('c-bg', 0, lightVars)).not.toBe('#ffffff');
    expect(lum(resolve('c-bg', 0, lightVars))).toBeGreaterThan(0.8);
    expect(lum(resolve('c-surface', 0, lightVars))).toBeGreaterThan(0.9);
    // lavender: biru & merah lebih besar dari hijau
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(resolve('c-bg', 0, lightVars).slice(i, i + 2), 16));
    expect(b).toBeGreaterThan(g);
    expect(r).toBeGreaterThan(g);
  });

  it('semua token warna tema gelap punya pasangan di tema terang (tidak ada warna tertinggal)', () => {
    const own = parseVars(lightBlock);
    const colorTokens = Object.keys(vars).filter((k) => /^(#|rgb)/.test(vars[k]) && !k.startsWith('sw-'));
    expect(colorTokens.filter((k) => !(k in own))).toEqual([]);
  });

  it('blok token terang hanya berisi hex valid', () => {
    const bad = (lightBlock.match(/#[0-9a-zA-Z]+/g) ?? []).filter((h) => !/^#[0-9a-f]{6}$/.test(h));
    expect(bad).toEqual([]);
  });

  it('aturan tema terang tidak menulis hex langsung (selalu lewat token)', () => {
    const rules = css.slice(lightEnd).split('\n').filter((l) => l.includes("[data-theme='light']") || /^\s/.test(l));
    expect(rules.join('\n')).not.toMatch(/#[0-9a-fA-F]{3,6}\b/);
  });

  it('variabel scene 3D tetap hex langsung di tema terang', () => {
    for (const k of ['c-price', 'c-discount', 'c-muted', 'c-surface-3d']) expect(lightVars[k]).toMatch(/^#[0-9a-f]{6}$/);
  });

  it.each([
    ['c-text', 'c-bg'], ['c-text', 'c-surface'], ['c-text', 'bg-2'], ['c-text', 'card-2'],
    ['c-muted', 'c-bg'], ['c-muted', 'c-surface'], ['c-muted', 'card-2'], ['c-muted', 'bg-2'],
    ['c-price', 'c-surface'], ['c-percent', 'c-surface'], ['c-discount', 'c-surface'], ['c-result', 'c-surface'],
    ['c-price', 'card-2'], ['c-percent', 'card-2'], ['c-discount', 'card-2'], ['c-result', 'card-2'],
    ['on-primary', 'purple-btn'], ['on-primary', 'purple-deep'], ['on-primary', 'purple-mid'], ['on-primary', 'coral-deep'],
    ['on-primary', 'c-price'], ['on-primary', 'c-discount'], ['on-primary', 'c-result'], ['on-primary', 'mint-text'],
    ['c-on-color', 'neon-pink'], ['c-on-color', 'mint'], ['c-on-color', 'lavender'], ['c-on-color', 'gold'],
    ['coral-text', 'c-surface'], ['mint-text', 'c-surface'], ['lavender-text', 'c-surface'], ['butter-text', 'c-surface'],
    ['coral-text', 'card-2'], ['butter-text', 'card-2'], ['plum-lavender', 'c-surface'], ['purple-deep', 'c-surface'],
    ['test-good', 'c-surface'], ['test-bad', 'c-surface'], ['test-good', 'card-2'], ['test-bad', 'card-2'],
    // tombol Mulai Belajar pastel & papan nama ruko pastel
    ['c-text', 'pastel-lav'], ['c-text', 'pastel-pink'], ['c-text', 'pastel-peach'], ['text-2', 'pastel-pink'], ['purple-deep', 'pastel-lav'],
    ['rk-pink-deep', 'rk-board'], ['rk-purple-deep', 'rk-board'], ['rk-cyan-deep', 'rk-board'], ['rk-lav-deep', 'rk-board'],
    ['rk-orange-deep', 'rk-board'], ['c-text', 'rk-pink'], ['gs-sign-text', 'gs-sign'],
    ['purple-btn', 'c-bg'], ['placeholder', 'bg-2'], ['c-disabled-text', 'c-disabled-bg'], ['c-text', 'c-disabled-bg'],
  ])('kontras tema terang %s di atas %s ≥ 4,5:1', (fg, bg) => {
    expect(contrastLight(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });
});
