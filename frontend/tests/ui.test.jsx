// @vitest-environment jsdom
// Uji asap (smoke test) antarmuka: mensimulasikan siswa memakai aplikasi.
import 'fake-indexeddb/auto';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import curriculum from '../../shared/content/curriculum.json';
import App from '../src/App.jsx';
import { WorkedExample } from '../src/features/Learning.jsx';
import ProblemSolver from '../src/features/ProblemSolver.jsx';
import { buildProblem } from '../src/domain/problems.js';

beforeAll(() => {
  // jsdom tidak punya WebGL → aplikasi harus otomatis memakai ilustrasi 2D.
  HTMLCanvasElement.prototype.getContext = () => null;
});
afterEach(cleanup);

const click = (el) => fireEvent.click(el);
const btn = (name) => screen.getByRole('button', { name });

function typeNumber(container, n) {
  const pad = container.querySelector('.numpad');
  const keys = [...pad.querySelectorAll('button')];
  for (let i = 0; i < 12; i++) click(keys.find((b) => b.textContent === '⌫'));
  for (const d of String(n)) click(keys.find((b) => b.textContent === d));
}

describe('alur aplikasi', () => {
  it('masuk → tes awal → cek kesiapan → peta belajar', async () => {
    const { container } = render(<App />);
    const code = await screen.findByPlaceholderText('contoh: S01');
    fireEvent.change(code, { target: { value: 's01' } });
    click(btn('Lanjut'));
    click(await screen.findByRole('button', { name: 'Saya mengerti, mulai' }));

    // Tes awal: 8 butir, tanpa umpan balik
    click(await screen.findByRole('button', { name: 'Mulai' }));
    for (let i = 0; i < 8; i++) {
      await screen.findByText(`${i + 1}/8`);
      const opt = container.querySelector('.option');
      if (opt) click(opt);
      else typeNumber(container, 1);
      click(btn('Lanjut'));
    }

    // Cek kesiapan: jawab semua dengan benar (opsi pertama)
    click(await screen.findByRole('button', { name: 'Mulai' }));
    for (let i = 0; i < 6; i++) {
      await screen.findByText(`${i + 1}/6`);
      click(container.querySelector('.option'));
      click(btn('Lanjut'));
    }

    expect(await screen.findByText('Peta Belajar')).toBeTruthy();
    expect(screen.getByText('Kode: S01')).toBeTruthy();
    // siswa baru mulai di tab Materi; modul ada di tab Latihan
    expect(screen.getByRole('tab', { name: 'Materi' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('button', { name: /Apa itu Diskon \(Rabat\)\?/ })).toBeTruthy();
    click(screen.getByRole('tab', { name: 'Latihan' }));
    // M1 terbuka, M2 terkunci
    expect(btn('Apa itu Diskon?').disabled).toBe(false);
    expect(screen.getByRole('button', { name: /Menghitung Besar Diskon: Selesaikan/ }).disabled).toBe(true);
  });
});

describe('mengerjakan soal', () => {
  it('salah 2× → petunjuk ditawarkan → selesai dengan cek kewajaran', async () => {
    const p = buildProblem(curriculum, 'm3-t1', 1);
    const onDone = vi.fn();
    const { container } = render(
      <ProblemSolver problem={p} moduleId="M3" sceneKind="priceTag" mode="independent" level={0} onDone={onDone} />,
    );
    // angka bertanda warna & diagram kotak tampil
    expect(container.querySelector('.signal .n-price')).toBeTruthy();
    expect(container.querySelector('.boxes')).toBeTruthy();
    // ilustrasi jatuh ke 2D karena tidak ada WebGL
    expect(container.querySelector('.scene-svg svg')).toBeTruthy();

    // salah 2 kali di langkah 1
    typeNumber(container, 1);
    click(btn('Periksa'));
    expect(screen.getByRole('status').textContent).toMatch(/Belum tepat|Cek/);
    click(btn('Periksa'));
    expect(await screen.findByText('Mau petunjuk?')).toBeTruthy();
    click(screen.getAllByRole('button', { name: 'Petunjuk' }).at(-1));
    expect(await screen.findByText('Petunjuk 1')).toBeTruthy();
    expect(screen.queryByText(/jawaban/i)).toBeNull(); // tidak ada "lihat jawaban"
    click(btn('Petunjuk berikutnya'));
    expect(await screen.findByText('Petunjuk 2')).toBeTruthy();
    click(btn('Coba lagi'));

    // jawab benar
    typeNumber(container, p.vars.disc);
    click(btn('Periksa'));
    expect(await screen.findByText('Langkah 2 dari 2')).toBeTruthy();

    // MC1: menjawab besar diskon pada langkah harga akhir
    typeNumber(container, p.vars.disc);
    click(btn('Periksa'));
    expect(screen.getByRole('status').textContent).toMatch(/besar diskonnya/);

    typeNumber(container, p.vars.final);
    click(btn('Periksa'));
    expect(await screen.findByText('Cek kewajaran')).toBeTruthy();
    click(btn('Ya'));
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onDone.mock.calls[0][0]).toMatchObject({ correct: false, maxHint: 2 });
  });

  it('mode transfer: siswa menandai angka dulu (Mode Tandai)', async () => {
    const p = buildProblem(curriculum, 'm3-t1', 4, { transfer: true });
    const { container } = render(
      <ProblemSolver problem={p} moduleId="M3" sceneKind="priceTag" mode="transfer" level={0} onDone={() => {}} />,
    );
    expect(screen.getByText('Tandai angka penting')).toBeTruthy();
    const marks = [...container.querySelectorAll('.markable')];
    const priceText = marks.find((m) => m.textContent.startsWith('Rp'));
    const pctText = marks.find((m) => m.textContent.endsWith('%'));
    click(btn('Harga awal'));
    click(priceText);
    click(btn('Persen diskon'));
    click(pctText);
    click(btn('Periksa'));
    expect(await screen.findByText('Langkah 1 dari 2')).toBeTruthy();
    // setelah menandai dengan benar, warna otomatis tetap mati (fading)
    expect(container.querySelector('.signal')).toBeNull();
  });
});

describe('contoh terselesaikan untuk setiap template', () => {
  it.each(Object.keys(curriculum.templates))('%s dapat diputar sampai selesai', (tid) => {
    const p = buildProblem(curriculum, tid, 3);
    const onDone = vi.fn();
    render(<WorkedExample problem={p} sceneKind="priceTag" onDone={onDone} />);
    const next = btn('Lanjut');
    expect(next.disabled).toBe(true);
    for (let i = 0; i < p.steps.length; i++) click(btn('Langkah berikutnya'));
    expect(next.disabled).toBe(false);
    click(next);
    expect(onDone).toHaveBeenCalled();
    // placeholder tidak boleh bocor sebagai teks mentah
    expect(document.body.textContent).not.toMatch(/\{\w+\|?\w*\}/);
  });
});
