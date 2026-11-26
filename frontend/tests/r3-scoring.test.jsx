// @vitest-environment jsdom
// R3 (25 Nov 2026): penilaian Tes Literasi = rubrik manual hasil uji coba instrumen
// (docs/instrumen/hasil-uji-coba-instrumen). ECF & salah hitung bernilai 0,5 poin.
import 'fake-indexeddb/auto';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import literacy from '../../shared/content/literacy.json';
import vectors from '../../shared/test-vectors.json';
import { answerKey, formatScore, scoreItem, scoreTest, stepFeedback, tally } from '../src/domain/literacy.js';
import { formatRp } from '../src/domain/money.js';
import { LiteracyResult } from '../src/features/Literacy.jsx';

afterEach(cleanup);

const byId = Object.fromEntries(literacy.test.map((it) => [it.id, it]));
const FULL = Object.fromEntries(literacy.test.map((it) => [it.id, answerKey(it)]));
// Lembar jawaban dokumen: L4 salah kali 0,3 × 400.000 = 110.000, lalu konsisten.
const UJI_COBA_L4 = { s1: 1, s2: 0, s3: 2, s4: 110000, s5: 290000, s6: 1 };
const UJI_COBA = { ...FULL, L4: UJI_COBA_L4 };

describe('R3 — penilaian sama dengan rubrik manual', () => {
  it('lembar uji coba: L4 4,5/6, total 22,5/24, nilai 93,75', () => {
    const r = scoreTest(literacy.test, UJI_COBA);
    expect(r.items.map((x) => x.earned)).toEqual([6, 6, 6, 4.5]);
    expect(r.items[3].steps.map((s) => s.earned)).toEqual([1, 1, 1, 0.5, 0.5, 0.5]);
    expect(r.items[3].steps.map((s) => s.via)).toEqual(['key', 'key', 'key', 'calc', 'ecf', 'ecf']);
    expect(r.total).toBe(22.5);
    expect((100 * r.total) / r.max).toBe(93.75);
  });

  it('paritas Python ↔ JS memuat skenario uji coba instrumen', () => {
    const v = vectors.literacy.find((x) => x.set === 'test' && x.scenario === 'uji_coba_instrumen');
    expect(v.result.total).toBe(22.5);
    expect(scoreTest(literacy.test, v.answers)).toEqual(v.result);
  });

  it('salah hitung hanya bila model benar, bukan jebakan, dan bukan angka lain dari soal', () => {
    const s4 = (over) => scoreItem(byId.L4, { ...FULL.L4, ...over }).steps[3].earned;
    expect(s4({ s4: 110000 })).toBe(0.5);
    expect(s4({ s3: 0, s4: 110000 })).toBe(0);
    expect(s4({ s4: 30 })).toBe(0); // cara kasir = miskonsepsi
    expect(s4({ s4: 400000 })).toBe(0); // harga awal, bukan hasil hitung
  });

  it('ECF tahap 5 tidak berlaku setelah cara kasir (kesalahan konsep)', () => {
    const r = scoreItem(byId.L4, { ...FULL.L4, s4: 30, s5: 399970 });
    expect(r.steps.map((s) => s.earned)).toEqual([1, 1, 1, 0, 0, 0.5]);
  });

  it('umpan balik salah hitung: tetap salah, 0,5 poin, mengarahkan cek ulang tanpa membocorkan kunci', () => {
    const f = stepFeedback(byId.L4, 's4', 110000, UJI_COBA_L4);
    expect(f).toMatchObject({ correct: false, via: 'calc', code: 'calc', earned: 0.5 });
    expect(f.text).toMatch(/10%/);
    for (const k of [120000, 280000]) expect(f.text).not.toContain(formatRp(k).replace('Rp', ''));
    expect(stepFeedback(byId.L4, 's5', 290000, UJI_COBA_L4)).toMatchObject({ correct: true, via: 'ecf', earned: 0.5 });
    expect(stepFeedback(byId.L4, 's4', 120000, {})).toMatchObject({ correct: true, via: 'key', earned: 1 });
  });

  it('skor ditampilkan dengan koma; salah hitung tidak dihitung "benar"', () => {
    expect(formatScore(22.5)).toBe('22,5');
    expect(formatScore(6)).toBe('6');
    const tl = tally(scoreTest(literacy.test, UJI_COBA));
    expect(tl.correct).toBe(23); // 24 tahap − 1 tahap salah hitung (s4)
    render(<LiteracyResult mode="test" items={literacy.test} answers={UJI_COBA} studentName="Siswa" onBack={() => {}} />);
    expect(document.querySelector('.score b').textContent).toBe('22,5');
    expect(document.querySelector('.finish-grid').textContent).toMatch(/Total skor22,5 \/ 24/);
    const l4 = [...document.querySelectorAll('details.review')][3];
    expect(l4.querySelector('summary b').textContent).toBe('4,5/6');
    const rows = [...l4.querySelectorAll('.review-steps li')];
    expect(rows[3].textContent).toMatch(/✗.*\+0,5/); // salah hitung: ditandai salah, tetap +0,5
    expect(rows[4].textContent).toMatch(/✓.*\+0,5/); // ECF
  });
});
