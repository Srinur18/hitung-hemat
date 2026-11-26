// @vitest-environment jsdom
// R2 (25 Nov 2026): mediasi salah hitung. Dasar: uji coba instrumen Soal 4 Tahap 4
// (model 30/100 × Rp400.000 benar, tetapi 0,3 × 400.000 ditulis 110.000).
import 'fake-indexeddb/auto';
import { cleanup, configure, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import curriculum from '../../shared/content/curriculum.json';
import tutor from '../../shared/content/tutor.json';
import vectors from '../../shared/test-vectors.json';
import { askTutor } from '../src/data/tutor.js';
import { classify, FEEDBACK, isCalcSlip } from '../src/domain/misconceptions.js';
import { buildProblem } from '../src/domain/problems.js';
import ProblemSolver from '../src/features/ProblemSolver.jsx';

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = () => null;
  window.scrollTo = () => {};
});
afterEach(cleanup);
configure({ asyncUtilTimeout: 5000 });

const click = (el) => fireEvent.click(el);
const bubble = () => document.querySelector('.tutor-bubble');
function typeNumber(container, n) {
  const keys = [...container.querySelector('.numpad').querySelectorAll('button')];
  for (let i = 0; i < 12; i++) click(keys.find((b) => b.textContent === '⌫'));
  for (const d of String(n)) click(keys.find((b) => b.textContent === d));
}

// Langkah "Cari besar diskon" dengan angka Soal 4 instrumen.
const DISC_STEP = { input: 'rupiah', role: 'discount', mc: ['MC3'], compute: { fn: 'discountAmount' }, answer: 120000 };
const V = { price: 400000, pct: 3000, disc: 120000, final: 280000 };

describe('deteksi salah hitung (CALC)', () => {
  it('0,3 × 400.000 ditulis 110.000 → CALC', () => expect(classify(DISC_STEP, V, 110000)).toBe('CALC'));
  it('miskonsepsi tetap didahulukan (salah geser koma → MC3)', () => expect(classify(DISC_STEP, V, 12000)).toBe('MC3'));
  it('bukan CALC: angka lain dari soal, terlalu jauh, atau langkah tanpa persen', () => {
    expect(classify(DISC_STEP, V, 400000)).toBeNull(); // harga awal
    expect(classify(DISC_STEP, V, 280000)).toBeNull(); // harga akhir (bukan besar diskon)
    expect(classify(DISC_STEP, V, 50000)).toBeNull(); // < 0,5 × kunci
    expect(isCalcSlip({ ...DISC_STEP, compute: { fn: 'subtract' } }, V, 110000)).toBe(false);
    expect(isCalcSlip({ ...DISC_STEP, input: 'choice' }, V, 110000)).toBe(false);
  });
  it('umpan balik CALC mengarahkan cek ulang, tidak menghakimi, ≤ 15 kata per kalimat (P4)', () => {
    expect(FEEDBACK.CALC).toMatch(/10%/);
    for (const s of FEEDBACK.CALC.split(/(?<=[.!?])\s+/)) expect(s.split(/\s+/).length).toBeLessThanOrEqual(15);
  });
  it('vektor paritas Python ↔ JS memuat CALC', () => {
    expect(vectors.tutor.some((v) => v.input.mc === 'CALC' && v.out.difficulty === 'salah_hitung')).toBe(true);
  });
});

describe('Teman Mikir untuk salah hitung', () => {
  it('jawaban salah siswa ikut dikirim ke server (tanpa identitas)', async () => {
    const fetchImpl = vi.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ move: 'error', level: 1, text: 'x', source: 'gemini' }) }));
    await askTutor(
      { templateId: 'm1-t1', seed: 1, stepId: 's1', role: 'discount', stepIndex: 0, phase: 'solve', event: 'wrong', mc: 'CALC', answer: 1900 },
      { apiUrl: 'http://srv', fetchImpl },
    );
    const body = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(body).toMatchObject({ event: 'wrong', mc: 'CALC', answer: 1900 });
    expect(Object.keys(body)).not.toContain('student_code');
  });

  it('di layar soal: umpan balik CALC → Teman Mikir patokan 10% → penjelasan makna, tanpa kunci', async () => {
    const p = buildProblem(curriculum, 'm1-t1', 1); // harga awal Rp10.000, diskon 20%, kunci besar diskon Rp2.000
    expect(p.steps[0].answer).toBe(2000);
    const { container } = render(
      <ProblemSolver problem={p} moduleId="M1" sceneKind={null} mode="independent" level={0} onDone={() => {}} />,
    );
    typeNumber(container, 1900);
    click(screen.getByRole('button', { name: 'Periksa' }));
    expect(container.querySelector('.feedback').textContent).toContain(FEEDBACK.CALC);
    click(screen.getByRole('button', { name: /Teman Mikir/ }));
    await waitFor(() => expect(bubble().textContent).toBe(tutor.mc.CALC.fallback));
    click(screen.getByRole('button', { name: 'Kenapa begitu?' }));
    await waitFor(() => expect(bubble().textContent).toBe(tutor.mc.CALC.why));
    expect(document.querySelector('.sheet').textContent).not.toMatch(/2\.000(?!\d)/);
  });
});
