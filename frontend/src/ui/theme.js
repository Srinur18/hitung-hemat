// Pilihan tema tampilan: Gelap (Plum Arcade, bawaan) atau Terang (Plum Lavender).
// - Tema diterapkan lewat atribut <html data-theme="dark|light">; semua warna tetap token di styles.css.
// - Pilihan disimpan per perangkat di localStorage (sama seperti pengaturan suara), aman bila diblokir.
// - Tidak menyentuh profil, progres, skor, atau riwayat di IndexedDB.

export const THEMES = ['dark', 'light'];
export const DEFAULT_THEME = 'dark';
const KEY = 'hh-theme-v1';
// warna bilah status Android/peramban mengikuti latar tema
const META_COLOR = { dark: '#160d25', light: '#f6f0ff' };

function load() {
  try {
    const v = localStorage.getItem(KEY);
    return THEMES.includes(v) ? v : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

let theme = load();
const listeners = new Set();

export function getTheme() {
  return theme;
}

/** Pasang tema ke dokumen tanpa memuat ulang halaman. */
export function applyTheme(name = theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = name;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', META_COLOR[name]);
}

export function setTheme(name) {
  if (!THEMES.includes(name)) return;
  theme = name;
  try {
    localStorage.setItem(KEY, name);
  } catch {
    /* penyimpanan diblokir: tema hanya berlaku sesi ini */
  }
  applyTheme(name);
  listeners.forEach((fn) => fn(name));
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Hanya untuk uji: baca ulang dari penyimpanan seolah aplikasi dibuka kembali. */
export function _reloadForTest() {
  theme = load();
  applyTheme(theme);
  return theme;
}
