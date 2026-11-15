// @vitest-environment jsdom
// v0.7 — Pilihan Tema Gelap / Terang: bawaan gelap, tersimpan di perangkat, berlaku langsung tanpa
// memuat ulang, dan tidak mengubah profil/progres/skor siswa.
import 'fake-indexeddb/auto';
import { cleanup, configure, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { getProfile, saveProfile } from '../src/data/db.js';
import { _reloadForTest, applyTheme, DEFAULT_THEME, getTheme, setTheme, THEMES } from '../src/ui/theme.js';

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = () => null;
  window.scrollTo = () => {};
});
beforeEach(() => {
  localStorage.removeItem('hh-theme-v1');
  _reloadForTest();
});
afterEach(cleanup);
configure({ asyncUtilTimeout: 5000 });

describe('modul tema', () => {
  it('bawaan = Tema Gelap bila belum ada pilihan tersimpan', () => {
    expect(DEFAULT_THEME).toBe('dark');
    expect(THEMES).toEqual(['dark', 'light']);
    expect(getTheme()).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('pilihan tersimpan dan tetap aktif saat aplikasi dibuka kembali', () => {
    setTheme('light');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem('hh-theme-v1')).toBe('light');
    document.documentElement.dataset.theme = '';
    expect(_reloadForTest()).toBe('light'); // "buka ulang"
    expect(document.documentElement.dataset.theme).toBe('light');

    setTheme('dark');
    expect(_reloadForTest()).toBe('dark');
  });

  it('nilai tersimpan yang rusak → kembali ke gelap; nama tema tak dikenal diabaikan', () => {
    localStorage.setItem('hh-theme-v1', 'ungu');
    expect(_reloadForTest()).toBe('dark');
    setTheme('neon');
    expect(getTheme()).toBe('dark');
  });

  it('warna bilah status mengikuti tema', () => {
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
    applyTheme('light');
    expect(meta.getAttribute('content')).toBe('#f6f0ff');
    applyTheme('dark');
    expect(meta.getAttribute('content')).toBe('#160d25');
    meta.remove();
  });
});

describe('latar semua halaman: Toko Pakaian & Bakery Plumie\'s', () => {
  it('ada di Beranda & halaman lain, tersembunyi dari pembaca layar, Kucing Plum menjaga bakery', async () => {
    const { default: App } = await import('../src/App.jsx');
    await saveProfile({ studentCode: 'S22', name: 'Bima', kelas: '7B', consentAt: 'x', pretestDone: true, journeyDone: true });
    render(<App />);
    await screen.findByText('Belajar Diskon, Belanja Jadi Pintar!');
    const bg = document.querySelector('.decor.grocery');
    expect(bg).toBeTruthy();
    expect(bg.getAttribute('aria-hidden')).toBe('true');
    expect(bg.className).toMatch(/is-home/);
    expect(bg.textContent).toMatch(/Bakery Plumie's/);
    expect(bg.textContent).not.toMatch(/HITUNG HEMAT/); // kedai lama sudah diganti bakery
    expect(bg.textContent).toMatch(/TOKO PAKAIAN/);
    expect(bg.querySelector('.gs-left')).toBeTruthy(); // toko pakaian di kiri
    expect(bg.querySelector('.gs-right .plum')).toBeTruthy(); // Plum menjaga bakery di kanan
    expect(bg.querySelector('.plum')).toBeTruthy(); // maskot yang sudah ada, bukan karakter baru
    expect(bg.textContent).toMatch(/Rp5\.000/); // label harga memuat angka (P3)
    // tombol menu tetap bisa diketuk
    fireEvent.click(screen.getByRole('button', { name: /^Materi/ }));
    // halaman lain juga memakai latar yang sama (tata letak non-Beranda)
    await waitFor(() => expect(document.querySelector('.decor.grocery:not(.is-home)')).toBeTruthy());
    expect(document.querySelector('.decor.grocery').textContent).toMatch(/Bakery Plumie's/);
  });
});

describe('pilihan tema di Profil', () => {
  it('ganti tema langsung berlaku di semua halaman, indikator aktif jelas, data siswa tidak berubah', async () => {
    const { default: App } = await import('../src/App.jsx');
    await saveProfile({
      studentCode: 'S21', name: 'Dina', kelas: '7A', consentAt: 'x', pretestDone: true, preScore: 6, journeyDone: true,
      literacy: { attempts: 1, first: { total: 18, max: 24 }, last: { total: 18, max: 24 }, history: [{ total: 18, max: 24, at: '2026-11-14' }] },
    });
    const before = await getProfile();
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: /^Profil/ }));
    expect(await screen.findByText('Tema Tampilan')).toBeTruthy();

    const dark = screen.getByRole('radio', { name: /Tema Gelap/ });
    const light = screen.getByRole('radio', { name: /Tema Terang/ });
    expect(dark.getAttribute('aria-checked')).toBe('true');
    expect(dark.textContent).toMatch(/Sedang dipakai/);
    expect(light.getAttribute('aria-checked')).toBe('false');

    fireEvent.click(light);
    expect(document.documentElement.dataset.theme).toBe('light');
    await waitFor(() => expect(screen.getByRole('radio', { name: /Tema Terang/ }).getAttribute('aria-checked')).toBe('true'));
    expect(screen.getByRole('radio', { name: /Tema Terang/ }).className).toMatch(/\bon\b/);
    expect(screen.getByRole('radio', { name: /Tema Gelap/ }).getAttribute('aria-checked')).toBe('false');

    // tetap terang setelah pindah halaman (tanpa memuat ulang)
    fireEvent.click(screen.getByRole('button', { name: 'Beranda' }));
    expect(await screen.findByText('Belajar Diskon, Belanja Jadi Pintar!')).toBeTruthy();
    expect(document.documentElement.dataset.theme).toBe('light');

    // profil, skor, dan riwayat tidak tersentuh
    const after = await getProfile();
    expect(after).toEqual(before);

    // kembali ke gelap
    fireEvent.click(screen.getByRole('button', { name: /^Profil/ }));
    fireEvent.click(await screen.findByRole('radio', { name: /Tema Gelap/ }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('hh-theme-v1')).toBe('dark');
  });
});
