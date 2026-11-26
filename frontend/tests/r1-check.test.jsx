// @vitest-environment jsdom
// R1 (25 Nov 2026): cek kewajaran memeriksa BESAR hasil lewat jalan lain, bukan hanya "lebih kecil?".
// Dasar: uji coba instrumen Soal 4 Tahap 6 (cek arah saja tidak menangkap Rp290.000 vs Rp280.000).
import 'fake-indexeddb/auto';
import { cleanup, configure, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import curriculum from '../../shared/content/curriculum.json';
import tutor from '../../shared/content/tutor.json';
import { complementBp, discountAmount } from '../src/domain/discount.js';
import { buildProblem, checkMagnitude } from '../src/domain/problems.js';
import ProblemSolver from '../src/features/ProblemSolver.jsx';

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = () => null;
  window.scrollTo = () => {};
});
afterEach(cleanup);
configure({ asyncUtilTimeout: 5000 });

const click = (el) => fireEvent.click(el);
const btn = (name) => screen.getByRole('button', { name });
function typeNumber(container, n) {
  const keys = [...container.querySelector('.numpad').querySelectorAll('button')];
  for (let i = 0; i < 12; i++) click(keys.find((b) => b.textContent === '⌫'));
  for (const d of String(n)) click(keys.find((b) => b.textContent === d));
}
async function solveToCheck(container, p) {
  typeNumber(container, p.vars.disc);
  click(btn('Periksa'));
  typeNumber(container, p.vars.final);
  click(btn('Periksa'));
  click(await screen.findByRole('button', { name: 'Ya' }));
  expect(await screen.findByText('Cek besar hasil')).toBeTruthy();
}

describe('domain cek besar hasil', () => {
  it('jalan lain menangkap kesalahan dokumen; cek arah & cek jumlah tidak', () => {
    const [price, pct, disc, fin] = [400000, 3000, 110000, 290000];
    expect(fin < price).toBe(true);
    expect(disc + fin).toBe(price);
    expect(discountAmount(price, complementBp(pct))).toBe(280000);
  });
  it('kunci cek = harga akhir; soal lama tidak berubah', () => {
    const p = buildProblem(curriculum, 'm1-t1', 1);
    expect([p.vars.price, p.vars.pct, p.vars.final, p.checkAnswer]).toEqual([10000, 2000, 8000, 8000]);
    expect(checkMagnitude(p, 8000)).toBe(true);
    expect(checkMagnitude(p, 9000)).toBe(false);
    expect(buildProblem(curriculum, 'm5-t1', 1).checkAnswer).toBeNull();
  });
});

describe('layar Cek besar hasil', () => {
  it('salah → umpan balik tidak menghakimi + tawaran petunjuk; petunjuk bertahap; benar → Lanjut (tanpa auto-advance)', async () => {
    const p = buildProblem(curriculum, 'm1-t1', 1);
    const onDone = vi.fn();
    const { container } = render(
      <ProblemSolver problem={p} moduleId="M1" sceneKind={null} mode="independent" level={0} onDone={onDone} />,
    );
    await solveToCheck(container, p);
    expect(container.querySelector('.step-ask').textContent).toMatch(/80% × Rp10\.000/);
    expect(container.querySelectorAll('.actions .btn').length).toBeLessThanOrEqual(3); // P2
    expect(onDone).not.toHaveBeenCalled();

    typeNumber(container, 9000);
    click(btn('Periksa'));
    const fb = () => container.querySelector('.feedback').textContent;
    expect(fb()).toMatch(/Belum sama dengan hasilmu Rp8\.000/);
    expect(fb()).not.toMatch(/Mau petunjuk/);
    click(btn('Periksa'));
    expect(fb()).toMatch(/Mau petunjuk/); // P9: ditawarkan setelah 2 kali salah

    click(btn(/Petunjuk/));
    expect(screen.getByText('Petunjuk 1')).toBeTruthy();
    expect(container.textContent).toMatch(/80\/100/);
    click(btn(/Petunjuk/));
    expect(screen.getByText('Petunjuk 2')).toBeTruthy();

    typeNumber(container, 8000);
    click(btn('Periksa'));
    expect(fb()).toMatch(/Cocok! Dua cara memberi hasil sama/);
    expect(onDone).not.toHaveBeenCalled(); // P7
    click(btn('Lanjut'));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('Teman Mikir di layar cek memakai tahap sanity (cek besar, bukan arah)', async () => {
    const p = buildProblem(curriculum, 'm3-t1', 1);
    const { container } = render(
      <ProblemSolver problem={p} moduleId="M3" sceneKind={null} mode="independent" level={0} onDone={() => {}} />,
    );
    await solveToCheck(container, p);
    click(btn(/Teman Mikir/));
    await waitFor(() => expect(document.querySelector('.tutor-bubble').textContent).toBe(tutor.moves.sanity.fallback));
    click(btn('Belum yakin'));
    await waitFor(() => expect(document.querySelector('.tutor-bubble').textContent).toBe(tutor.moves.sanity_help.fallback));
  });

  it('soal terbalik (m6-t1) dicek dengan cara maju', async () => {
    const p = buildProblem(curriculum, 'm6-t1', 1);
    expect(p.checkAnswer).toBe(p.vars.final);
    expect(curriculum.templates['m6-t1'].sanity.check.ask).toMatch(/cara maju/);
  });

  it('template tanpa cek (diskon bertingkat) tetap selesai setelah cek arah', async () => {
    const p = buildProblem(curriculum, 'm5-t1', 1);
    const onDone = vi.fn();
    const { container } = render(
      <ProblemSolver problem={p} moduleId="M5" sceneKind={null} mode="independent" level={0} onDone={onDone} />,
    );
    for (const st of p.steps) {
      if (st.input === 'choice') click(container.querySelectorAll('.option')[st.answer]);
      else typeNumber(container, st.answer);
      click(btn('Periksa'));
    }
    click(await screen.findByRole('button', { name: 'Ya' }));
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Cek besar hasil')).toBeNull();
  });
});
